/* ── Pool recipes ───────────────────────────────────────────────────────────
   Every exercise TYPE lives in its own dynamically-loaded file under
   exercises/ (see EXERCISE_INDEX in data.js). This file only holds the
   per-mode RECIPES — which registered types contribute, how many, and in
   what curriculum order. A recipe runs after bg-loader.loadExercisesFor has
   injected the mode's type files. */

const EX=n=>window.EXERCISES&&window.EXERCISES.types&&window.EXERCISES.types[n];

function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]]}return b}
function sample(a,k){return shuffle(a).slice(0,k)}
// sampleWithTD — ensures a TD problem every 4th slot (positions 4,8,12…)
function sampleWithTD(pool,k){
  const tdArr=shuffle(pool.filter(p=>p.t===TDA||p.t===TDS));
  const regArr=shuffle(pool.filter(p=>p.t!==TDA&&p.t!==TDS));
  const tdCount=Math.floor(k/4),regCount=k-tdCount;
  const tds=tdArr.slice(0,tdCount),regs=regArr.slice(0,regCount);
  const out=[];let ri=0,ti=0;
  for(let i=0;i<k;i++){
    if((i+1)%4===0&&ti<tds.length)out.push(tds[ti++]);
    else if(ri<regs.length)out.push(regs[ri++]);
    else if(ti<tds.length)out.push(tds[ti++]);
  }
  return out;
}

// Weave "unknown" exercises into a curriculum set: EVERY 4th problem (slots 4, 8,
// 12 … → index 3, 7, 11 …) is re-rendered as one, cycling through THREE kinds so
// each recurs across the bridges:
//   0 → ONE unknown   (⃝ = N, then a ± ⃝)
//   1 → TWO unknowns  (△ + ○, each value small above)
//   2 → THREE unknowns (__ + __ + __ = R, R = this slot's own answer) — the x+x+x
// The a/b are kept so the underlying add/sub curriculum is unchanged; only the
// render differs. (b≥1 skips a ⃝=0 slot; r≥6 keeps a three-sum decomposable.)
const _VSHAPES=['circle','triangle','square'];
const _vshape=()=>_VSHAPES[(Math.random()*3)|0];
// pick a shape distinct from `first` (used so two unknowns with DIFFERENT
// values never share the same shape — a shape can't stand for two values)
const _vshape2=(first,distinct)=>{if(!distinct)return _vshape();let s;do{s=_vshape();}while(s===first);return s;};
function _sprinkleUnknowns(set){
  let c=0;
  for(let i=3;i<set.length;i+=4){
    const p=set[i];
    if(!(p.t===TA||p.t===TS)||p.b<1)continue;
    const kind=c%3;c++;
    if(kind===2){
      const r=(p.t===TA)?p.a+p.b:p.a-p.b;   // the crossing result becomes the sum target
      if(r>=6){p.r=r;p.t=TRA;continue;}      // __+__+__ = r (a,b kept for the order-check)
    }
    p.t=(p.t===TA)?TVA:TVS;
    if(kind===1){p.symA=_vshape();p.sym=_vshape2(p.symA,p.a!==p.b);}  // two-unknown: distinct shapes when values differ
    else p.sym=_vshape();
  }
  return set;
}

// Cap an arithmetic pool to `target` AND fold in polygon side-counting shapes so
// a shape shows up about ONCE EVERY 9 problems (the 9th, 18th … slot), while the
// run still holds EXACTLY `target` exercises. Room is made by capping the
// arithmetic FIRST (so no type gets wiped out), then the shapes are INSERTED at
// slots 9, 18 … (never slot 0 — the first card must keep a normal #ans input).
// Used by Queen (mx) + Superman (sup); target 20 → 2 shapes at slots 9 & 18.
// Falls back to a plain cap when the polygon type isn't loaded.
function _withPolygons(pool,target,minKeep){
  const ex=EX('polygon');
  if(!ex)return _capPool(pool,target,minKeep);
  let nPoly=0;for(let at=8;at<target;at+=9)nPoly++;   // how many shapes fit at the 9-cadence
  const base=_capPool(pool,target-nPoly,minKeep);     // leave room for the shapes
  const polys=shuffle(ex.make('poly'));
  let k=0;
  for(let at=8;at<=base.length&&k<nPoly;at+=9)base.splice(at,0,polys[k++]);
  return base;
}

// Queen (mx) & Superman (sup) always present EXACTLY this many exercises per run.
const QUEEN_SUPER_COUNT=20;

// ── the READING program (Superman + אַלּוּפָה): ONE reading card per 4 exercises.
// The kinds — story_quiz (סיפור ושאלה), cloze (השלם את המילה), true_false (נכון
// או לא), word_match (התאם מילה לתמונה), sent_order (סדר את המשפט), rhyme (איזו
// מילה מתחרזת). A 20-card deck has exactly READING_SLOTS=5 reading slots (one
// per 4 exercises), so when there are MORE kinds than slots the kinds ROTATE
// across games via _rkCursor — every kind gets its turn, and no single game is
// crowded past the 1-per-4 cadence. Also the WHOLE set of the "שפה" game ('lang').
const READING_KINDS=['story_quiz','cloze','true_false','word_match','sent_order','rhyme'];
const READING_SLOTS=5;
let _rkCursor=0;
function _readingCards(m){
  const avail=READING_KINDS.filter(k=>EX(k));
  let pick;
  if(avail.length<=READING_SLOTS)pick=avail.slice();
  else{
    pick=[];
    for(let i=0;i<READING_SLOTS;i++)pick.push(avail[(_rkCursor+i)%avail.length]);
    _rkCursor=(_rkCursor+READING_SLOTS)%avail.length;   // next game starts where this one stopped
  }
  const cards=[];
  shuffle(pick).forEach(k=>{
    const c=EX(k).make(m);if(c&&c.length)cards.push(c[0]);
  });
  return shuffle(cards);
}
// internal handle each reading kind answers to (its make() dispatch key)
const READING_HANDLE={story_quiz:'story',cloze:'clz',true_false:'tf',word_match:'wm',sent_order:'so',rhyme:'rhy'};
// Cap an already-shuffled pool to n problems while PRESERVING TYPE COVERAGE:
// surplus is removed from over-represented types first (walking from the end),
// so every type that appears keeps ≥1 instance and slot 0 stays put. `minKeep`
// (type→floor, default 1) protects curriculum minimums — e.g. Queen keeps ≥2 TT
// (round-tens). Falls back to a plain trim only if there are more distinct types
// than n (never the case for mx/sup).
function _capPool(pool,n,minKeep){
  if(pool.length<=n)return pool;
  minKeep=minKeep||{};
  let excess=pool.length-n;
  const count={};pool.forEach(p=>{count[p.t]=(count[p.t]||0)+1;});
  const drop=new Array(pool.length).fill(false);
  for(let i=pool.length-1;i>=0&&excess>0;i--){
    const floor=minKeep[pool[i].t]||1;
    if(count[pool[i].t]>floor){drop[i]=true;count[pool[i].t]--;excess--;}
  }
  let out=pool.filter((_,i)=>!drop[i]);
  return out.length>n?out.slice(0,n):out;
}

function makePool(m){
  if(m===0)return EX('add').make(0);                 // the full 1+1 ladder
  if(m==='mx'){
    // Queen is a SATURATED 20-card pool (17 curated types fill the coverage floor
    // of 18, +2 woven extras). Cap the curated base to 18 (its floor, ≥2 round-tens),
    // then weave ONE polygon + ONE triple_sum (`__+__+__`) POST-cap — at mid-deck
    // slots, never slot 0 — so neither extra crowds a core type out of the cap.
    const base=_capPool(makeMxPool(),QUEEN_SUPER_COUNT-2,{[TT]:2});   // 18
    const extras=[];
    if(EX('polygon')){const pg=shuffle(EX('polygon').make('poly'))[0];if(pg)extras.push(pg);}
    if(EX('triple_sum')){const ts=EX('triple_sum').make('mx')[0];if(ts)extras.push(ts);}
    let at=8;for(const ex of extras){base.splice(Math.min(at,base.length),0,ex);at+=8;}
    return base;
  }
  if(m==='br')return makeBridgePool();               // bridge-10 curriculum
  if(m==='b20')return makeBridge20Pool();            // bridge-20 curriculum (two alternating sets)
  // Superman — an EQUAL 3-per-type mix: column addition + big-number subtraction
  // + coin-multiplication + bagel-cost (×5 in shekels) + column subtraction
  // + whole-hundreds + multiplication chains, shuffled then capped to 20 shown.
  // READING cards are woven in at ONE PER 4 EXERCISES (see _readingCards): the
  // base deck is capped 5 short (coverage-preserving — no arithmetic type is
  // dropped) and a reading card is SPLICED (inserted, never overwriting) at
  // every 4th slot (positions 4/8/12/16/20 → index 3/7/11/15/19). Splice only
  // shifts the other cards right, so nothing "falls through the cracks".
  if(m==='sup'){
    const rd=_readingCards(m);
    const deck=_withPolygons(shuffle([...EX('column_add').make('sup'),...EX('big_step').make('sup'),...EX('coin_mul').make('sup'),...EX('bagel_cost').make('sup'),...EX('column_sub').make('sup'),...(EX('hundreds')?EX('hundreds').make('sup'):[]),...(EX('mult_chain')?EX('mult_chain').make('sup'):[]),...(EX('triple_sum')?EX('triple_sum').make('sup'):[])]),QUEEN_SUPER_COUNT-rd.length);
    rd.forEach((s,k)=>deck.splice(Math.min(3+k*4,deck.length),0,s));
    return deck;
  }
  if(m==='big')return EX('big_step').make('big');    // big number ± step game
  if(m==='poly')return EX('polygon')?EX('polygon').make('poly'):[];   // count-the-sides shapes game
  if(m==='mul')return EX('mult_chain')?EX('mult_chain').make('mul'):[];// multiplication as repeated addition (2×3 → 2+2+2)
  // אַלּוּפָה — the multiplication-champion game MIXED with polygon-PERIMETER
  // (sum of sides) and GRADED column-subtraction (horizontal-first, staged
  // penalties), shuffled then capped to 20 (coverage-preserving).
  if(m==='mulc'){
    // READING cards get ONE PER 4 EXERCISES (like Superman, see _readingCards):
    // cap the arithmetic base 5 short (coverage-preserving — every arithmetic
    // type keeps ≥1, so none is missed), pin TMK at slot 0, then SPLICE (insert,
    // never overwrite) a reading card at every 4th slot (positions 4/8/12/16/20).
    const rd=_readingCards(m);
    const pool=_capPool(shuffle([
      ...(EX('mult_champ')?EX('mult_champ').make('mulc'):[]),
      ...(EX('perimeter')?EX('perimeter').make('mulc'):[]),
      ...(EX('column_sub')?EX('column_sub').make('mulc'):[]),
      ...(EX('column_add')?EX('column_add').make('mulc'):[]),  // חיבור בטור — horizontal-first graded flow
      ...(EX('compare')?EX('compare').make('mulc'):[]),
      ...(EX('word_prob')?EX('word_prob').make('mulc'):[]),   // בעיות מילוליות עד 10
      ...(EX('word_chain')?EX('word_chain').make('mulc'):[]), // בעיות שרשרת (קיבל 2, קיבל עוד 2, נתן 4) — תוצאה עד 12
      ...(EX('triple_sum')?EX('triple_sum').make('mulc'):[]), // __+__+__ = 20 (בלי 0/10)
      ...(EX('half')?EX('half').make('mulc'):[]),             // כמה זה חצי — חלוקה שווה ל-2 (ראשית החילוק)
      ...(EX('plates')?EX('plates').make('mulc'):[]),         // צלחות — קבוצות שוות → סך הכל (סיפור הכפל)
      ...(EX('coin_mul')?EX('coin_mul').make('mulc'):[]),     // כמה מטבעות (₪2/₪5/₪10) נכנסים ב-X — ראשית הכפל (מסופרמן)
      ...(EX('bagel_cost')?EX('bagel_cost').make('mulc'):[]), // כמה עולים X בייגלה (×₪5) — ראשית הכפל בשקלים (מסופרמן)
      ...(EX('ice_cream')?EX('ice_cream').make('mulc'):[]),   // חנות הגלידה — יש לה ₪X, כל גלידה ₪2/5/10; כמה אפשר לקנות (חילוק כ"כמה קבוצות")
      ...(EX('mult_unknown')?EX('mult_unknown').make('mulc'):[]), // כפל בנעלם — 3×□=9; ישר קפיצות-של-a גלוי מההתחלה
    ]),QUEEN_SUPER_COUNT-rd.length);
    // the אַלּוּפָה game OPENS on its flagship multiplication card (TMK): keep a
    // mult_champ problem at slot 0 (the rest — perimeter / column-sub / compare /
    // word-problems — stay mixed through the deck).
    const ti=pool.findIndex(p=>p.t===TMK);
    if(ti>0){const tp=pool.splice(ti,1)[0];pool.unshift(tp);}
    rd.forEach((s,k)=>pool.splice(Math.min(3+k*4,pool.length),0,s));
    return pool;
  }
  // "שפה" — the LANGUAGE game (medium tier): a mixed reading session holding ALL
  // the reading kinds (no rotation cursor here — the whole point of this game is
  // full coverage). Three rounds of every kind (one fresh card each, via the
  // modules' own no-repeat rotation) → 3 × READING_KINDS.length cards (6 kinds →
  // 18), shuffled. So every language exercise the app has appears here, and none
  // is arithmetic.
  if(m==='lang'){
    const deck=[];
    for(let round=0;round<3;round++)
      READING_KINDS.forEach(k=>{if(EX(k)){const cs=EX(k).make(READING_HANDLE[k]);if(cs&&cs.length)deck.push(cs[0]);}});
    return shuffle(deck);
  }
  if(m==='wp')return EX('word_prob')?EX('word_prob').make('wp'):[];   // word-problems only (internal handle)
  if(m==='wc')return EX('word_chain')?EX('word_chain').make('wc'):[]; // chain word-problems only (internal handle)
  if(m==='story')return EX('story_quiz')?EX('story_quiz').make('story'):[]; // reading stories only (internal handle)
  if(m==='clz')return EX('cloze')?EX('cloze').make('clz'):[];           // cloze only (internal handle)
  if(m==='tf')return EX('true_false')?EX('true_false').make('tf'):[];   // true/false only (internal handle)
  if(m==='wm')return EX('word_match')?EX('word_match').make('wm'):[];   // word-match only (internal handle)
  if(m==='so')return EX('sent_order')?EX('sent_order').make('so'):[];   // sentence-order only (internal handle)
  if(m==='rhy')return EX('rhyme')?EX('rhyme').make('rhy'):[];           // rhyme-matching only (internal handle)
  if(m==='ice')return EX('ice_cream')?EX('ice_cream').make('ice'):[]; // ice-cream shop only (internal handle)
  if(m==='mulu')return EX('mult_unknown')?EX('mult_unknown').make('mulu'):[]; // mult-with-unknown only (internal handle)
  // standard עד5/עד10/עד20: union of the basic types, TD every 4th slot,
  // then the coins type seeds 1-2 coin problems
  const pool=[
    ...EX('missing').make(m),
    ...EX('sub').make(m),
    ...EX('add').make(m),
    ...EX('double').make(m),
  ];
  return EX('coins').inject(sampleWithTD(pool,GL),m);
}

// makeMxPool — Queen: each loaded type contributes its mx quota
// (chains 6, king-level add/sub/missing 1 each, two-unknowns 1+1,
// round-tens 2, coins 2, big ±1/2 2, no-borrow column-subtraction 2
// → 19 problems), then one shuffle
function makeMxPool(){
  const pool=shuffle([
    ...EX('chain').make('mx'),
    ...EX('missing').make('mx'),
    ...EX('sub').make('mx'),
    ...EX('add').make('mx'),
    ...EX('double').make('mx'),
    ...EX('tens').make('mx'),
    ...EX('coins').make('mx'),
    ...EX('big_step').make('mx'),
    ...EX('column_sub').make('mx'),
    ...(EX('var_one')?EX('var_one').make('mx'):[]),   // one ⃝-unknown add + one sub
    ...(EX('tri_unknown')?EX('tri_unknown').make('mx'):[]),  // one __+__+__ = R (three unknowns)
    ...(EX('hundreds')?EX('hundreds').make('mx'):[]),       // whole-hundreds addition (200+60, 300+300)
    ...(EX('mult_chain')?EX('mult_chain').make('mx'):[]),   // 2 multiplication-as-repeated-addition chains (2×/3×, ≤20)
  ]);
  // Self-mounting modules render their OWN UI (not the #ans box), so never let one
  // sit at slot 0 — the first card must show a normal input. Covers column
  // subtraction (TCS), the multiplication chain (TMC), polygon (TPG) and the
  // three-addends box (TTS, woven post-cap in the makePool('mx') branch).
  const _noAns=p=>p.t===TCS||p.t===TMC||p.t===TPG||p.t===TTS;
  if(pool.length&&_noAns(pool[0])){
    for(let j=1;j<pool.length;j++){if(!_noAns(pool[j])){const t=pool[0];pool[0]=pool[j];pool[j]=t;break;}}
  }
  // polygons are folded in AFTER capping (makePool → _withPolygons), so they land
  // at the exact 9-cadence without being trimmed away by the cap
  return pool;
}

// ── bridging-10 ("גָּשֵׁר 10") — SIX fixed pedagogical sets, served in ROTATION.
//    EVERY time a bridge pool is built — choosing the game, "play again"
//    (restart), or a reload — it advances to the next set (set 1 … set 6, set 1 …).
//    The turn is PERSISTED in localStorage so the rotation survives refreshes
//    instead of always replaying set 1 (9+2…). The order INSIDE each set is the
//    curriculum and must NEVER change; each builder returns fresh objects.
//    SETS 1–4: family/ladder, 11-13 count-downs, doubles-into-high-teens, gentlest.
//    SET 5 — the +9 SHORTCUT (add/subtract 9 by crossing 10): 2+9…9+9 with inverses.
//    SET 6 — MID-TEEN count-backs (14 & 15 minus, results 5-9) + the ways to build 14/15/16.
let _brTurn=0;
try{const _s=localStorage.getItem('brTurn');if(_s!=null)_brTurn=(+_s)||0;}catch(e){}
function _bridgeSet1(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(9,2),A(9,3),A(9,4),S(13,4),S(13,3),S(13,2),
    A(8,2),A(8,3),A(8,4),S(12,4),S(12,3),S(12,2),
    A(8,5),S(13,5),
    A(7,3),A(7,4),A(7,5),S(12,5),S(12,4),S(12,3),
    A(6,4),A(6,5),A(6,6),S(15,5),S(15,6),
  ];
}
function _bridgeSet2(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    S(11,0),S(11,1),S(11,2),S(11,3),S(11,4),A(7,4),
    S(12,0),S(12,1),S(12,2),S(12,3),S(12,4),A(8,4),
    S(13,0),S(13,1),S(13,2),S(13,3),S(13,4),S(13,5),
  ];
}
// SET 3 — "גְּשָׁרִים גְּדוֹלִים": doubles & near-doubles that bridge into the HIGH teens
// (results up to 18) — the harder bridges sets 1–2 don't reach. Each crossing addition is
// paired with its inverse subtraction; all 15 cross 10, taught via the same complete-to-10 split.
function _bridgeSet3(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(6,6),S(12,6),A(7,7),S(14,7),A(8,8),S(16,8),A(9,9),S(18,9),   // doubles + inverses
    A(6,7),S(13,7),A(7,8),S(15,8),A(8,9),S(17,9),                  // near-doubles + inverses
    A(9,6),                                                        // a bigger non-double bridge to finish
  ];
}
// SET 4 — "גְּשָׁרִים קְטַנִּים": the GENTLEST crossings — every sum / minuend stays in 11–13
// (10 is crossed by only 1, 2 or 3), the opposite end from set 3's high-teen bridges. Grouped
// cross-by-1 → 2 → 3, additions with their inverse subtractions; all 15 cross 10. Fresh pairs
// (5+6, 4+7, 5+7, 4+8, 5+8, 4+9 …) the family/ladder sets don't use.
function _bridgeSet4(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(5,6),S(11,5),A(4,7),S(11,7),A(3,8),S(11,8),A(2,9),   // cross by 1 (sum / from 11)
    A(5,7),S(12,7),A(4,8),S(12,8),                          // cross by 2 (sum / from 12)
    A(5,8),S(13,8),A(4,9),S(13,9),                          // cross by 3 (sum / from 13)
  ];
}
// SET 5 — the +9 SHORTCUT: adding 9 (or its inverse −9) always crosses 10 by making
// ten and stepping one more. The full 2+9 … 9+9 climb (→11–18) with −9 count-backs.
function _bridgeSet5(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(2,9),A(3,9),A(4,9),A(5,9),S(11,9),S(12,9),S(13,9),S(14,9),   // +9 → 11-14 + −9 inverses
    A(6,9),A(7,9),A(8,9),S(15,9),S(16,9),S(17,9),                   // +9 → 15-17 + inverses
    A(9,9),                                                         // 9+9=18 — the biggest +9
  ];
}
// SET 6 — MID-TEEN count-backs: the full 14- and 15-minus families (results 5-9,
// the harder count-backs over 10), then the ways to BUILD 14/15/16 by adding.
function _bridgeSet6(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    S(14,5),S(14,6),S(14,7),S(14,8),S(14,9),   // 14 − 5..9 (→9,8,7,6,5)
    S(15,6),S(15,7),S(15,8),S(15,9),           // 15 − 6..9 (→9,8,7,6)
    A(6,8),A(7,7),A(7,8),A(8,7),A(8,8),A(9,7),  // make 14 / 15 / 16 (both operands over 5)
  ];
}
// The one-unknown (נֶעְלָם) type is no longer a separate set — _sprinkleUnknowns
// weaves it into EVERY set below (~1 in 4), so it recurs throughout the rotation.
const _BRIDGE_SETS=[_bridgeSet1,_bridgeSet2,_bridgeSet3,_bridgeSet4,_bridgeSet5,_bridgeSet6];
// serve the current set, then advance the turn (persisted) for the NEXT build
function makeBridgePool(){
  const set=_sprinkleUnknowns(_BRIDGE_SETS[_brTurn%_BRIDGE_SETS.length]());
  _brTurn=(_brTurn+1)%_BRIDGE_SETS.length;
  try{localStorage.setItem('brTurn',String(_brTurn));}catch(e){}
  return set;
}

// ── bridging-20 ("גָּשֵׁר 20") — FOUR fixed pedagogical sets of 15, served in
//    ROTATION (set 1 → 2 → 3 → 4 → 1 …), like גָּשֵׁר 10. The turn is PERSISTED so the
//    rotation survives refreshes. All cross 20 into the LOW-MID 20s (results 21–25);
//    the order INSIDE each set is the curriculum and must NEVER change; fresh
//    objects each build.
//    SET 1 — MEDIUM jumps: anchors 18/17/16, results 22–24 (make-20 split 2/3/4).
//    SET 2 — BIG jumps: lower anchors 16/15/14/13 and bigger addends, results 22–25
//            (16+9 → 4|5, 13+9 → 7|2) — a wider decomposition, a notch harder.
//    SET 3 — the 19-LADDER + gentlest bridges: the full 19+2..6 climb (→21–25) with
//            inverses, then the three smallest crossings to 21 (18+3, 17+4, 16+5).
//    SET 4 — DOUBLES & near-doubles that cross 20: 11+11, 12+12, 11+12, 11+13, 12+13
//            … (→22–25) with inverses — a fresh angle (both operands in the low teens).
let _b20Turn=0;
try{const _s=localStorage.getItem('b20Turn');if(_s!=null)_b20Turn=(+_s)||0;}catch(e){}
function _bridge20Set1(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(18,4),A(18,5),A(18,6),S(22,4),S(23,5),S(24,6),   // 18-family (cross to 22–24) + inverses
    A(17,5),A(17,6),A(17,7),S(22,5),S(23,6),S(24,7),   // 17-family + inverses
    A(16,6),A(16,7),A(16,8),                            // 16-family (additions to finish → 22–24)
  ];
}
function _bridge20Set2(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(16,7),A(16,8),A(16,9),S(23,7),S(24,8),S(25,9),   // 16-family (big jumps → 23–25) + inverses
    A(15,7),A(15,8),A(15,9),S(22,7),S(23,8),S(24,9),   // 15-family + inverses
    A(14,8),A(14,9),A(13,9),                            // 14/13-family (additions to finish → 22–23)
  ];
}
// SET 3 — the 19-LADDER (add just below 20) + the gentlest bridges to 21.
function _bridge20Set3(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(19,2),A(19,3),A(19,4),A(19,5),A(19,6),           // 19 + 2..6 = 21..25 (the full 19-ladder)
    S(21,2),S(22,3),S(23,4),S(24,5),S(25,6),           // inverses (back down to 19)
    A(18,3),A(17,4),A(16,5),                            // the three smallest crossings to 21 (cross by 1)
    S(21,3),S(21,4),                                    // inverses (21−3=18, 21−4=17)
  ];
}
// SET 4 — DOUBLES & near-doubles that cross 20 (both operands in the low teens).
function _bridge20Set4(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(11,11),S(22,11),                                 // 11+11=22 (double) + inverse
    A(12,12),S(24,12),                                 // 12+12=24 (double) + inverse
    A(11,12),A(12,11),S(23,11),S(23,12),               // near-doubles → 23 + inverses
    A(11,13),A(13,11),S(24,11),S(24,13),               // 11 & 13 → 24 + inverses
    A(12,13),A(13,12),S(25,12),                        // 12 & 13 → 25 (+ one inverse to finish)
  ];
}
// the one-unknown type is woven into EVERY set by _sprinkleUnknowns (~1 in 4),
// instead of being a separate set — so it recurs throughout bridge-20 too.
const _BRIDGE20_SETS=[_bridge20Set1,_bridge20Set2,_bridge20Set3,_bridge20Set4];
function makeBridge20Pool(){
  const set=_sprinkleUnknowns(_BRIDGE20_SETS[_b20Turn%_BRIDGE20_SETS.length]());
  _b20Turn=(_b20Turn+1)%_BRIDGE20_SETS.length;
  try{localStorage.setItem('b20Turn',String(_b20Turn));}catch(e){}
  // NOTE: no polygon weaving here — the bridge-20 curriculum order MUST stay
  // fixed (see the set comments). Polygons live in Queen (mx) + the poly game.
  return set;
}

function modePts(){return mode==='mx'?20:mode==='br'?15:mode==='b20'?15:mode==='sup'?15:mode==='big'?10:mode==='poly'?15:mode==='mul'?15:mode==='perim'?15:mode==='cmp'?15:mode==='wp'?20:mode==='wc'?20:mode==='story'?15:mode==='clz'?15:mode==='tf'?15:mode==='wm'?15:mode==='so'?15:mode==='rhy'?15:mode==='lang'?15:mode==='trip'?15:mode==='hlf'?15:mode==='plt'?15:mode==='ice'?15:mode==='mulu'?15:mode==='mulc'?20:mode||5;}
