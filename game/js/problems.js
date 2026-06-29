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

function makePool(m){
  if(m===0)return EX('add').make(0);                 // the full 1+1 ladder
  if(m==='mx')return makeMxPool();                   // Queen — curated mix
  if(m==='br')return makeBridgePool();               // bridge-10 curriculum
  if(m==='b20')return makeBridge20Pool();            // bridge-20 curriculum (two alternating sets)
  // Superman — an EQUAL 3-per-type mix: column addition + big-number subtraction
  // + coin-multiplication + bagel-cost (×5 in shekels) + column subtraction
  // (3 no-borrow + 3 with-borrow)  → 18 problems
  if(m==='sup')return shuffle([...EX('column_add').make('sup'),...EX('big_step').make('sup'),...EX('coin_mul').make('sup'),...EX('bagel_cost').make('sup'),...EX('column_sub').make('sup')]);
  if(m==='big')return EX('big_step').make('big');    // big number ± step game
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
  ]);
  // The column-subtraction module renders its OWN staged UI (not the #ans box),
  // so never let it sit at slot 0 — the first card always shows a normal input.
  if(pool.length&&pool[0].t===TCS){
    for(let j=1;j<pool.length;j++){if(pool[j].t!==TCS){const t=pool[0];pool[0]=pool[j];pool[j]=t;break;}}
  }
  return pool;
}

// ── bridging-10 ("גָּשֵׁר 10") — FOUR fixed pedagogical sets, served ALTERNATELY.
//    EVERY time a bridge pool is built — choosing the game, "play again"
//    (restart), or a reload — it advances to the next set (set 1, set 2, set 3,
//    set 4, set 1 …). The turn is PERSISTED in localStorage so the alternation
//    survives refreshes instead of always replaying set 1 (9+2…). The order INSIDE
//    each set is the curriculum and must NEVER change; each builder returns fresh
//    objects.
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
// SET 5 — "נֶעְלָם" (one unknown): the shape-variable crossings (⃝ = N, then a ± ⃝),
// all crossing 10 — generated by var_one.ex.js so the same type appears in the rotation.
function _bridgeSet5(){return EX('var_one')?EX('var_one').make('br'):_bridgeSet1();}
const _BRIDGE_SETS=[_bridgeSet1,_bridgeSet2,_bridgeSet3,_bridgeSet4,_bridgeSet5];
// serve the current set, then advance the turn (persisted) for the NEXT build
function makeBridgePool(){
  const set=_BRIDGE_SETS[_brTurn%_BRIDGE_SETS.length]();
  _brTurn=(_brTurn+1)%_BRIDGE_SETS.length;
  try{localStorage.setItem('brTurn',String(_brTurn));}catch(e){}
  return set;
}

// ── bridging-20 ("גָּשֵׁר 20") — TWO fixed pedagogical sets of 15, served ALTERNATELY
//    (set 1 → set 2 → set 1 …), like גָּשֵׁר 10. The turn is PERSISTED so the alternation
//    survives refreshes. Both cross 20 by only 1–3 (sums/minuends 21–23); the order
//    INSIDE each set is the curriculum and must NEVER change; fresh objects each build.
//    SET 1 — SMALL jumps: anchors 19/18/17 (the addend just below 20).
//    SET 2 — BIGGER jumps: anchors 16/15/14, so the make-20 split is larger (16+5 → 4|1,
//            14+9 → 6|3) — the same gentle crossing practised with a wider decomposition.
let _b20Turn=0;
try{const _s=localStorage.getItem('b20Turn');if(_s!=null)_b20Turn=(+_s)||0;}catch(e){}
function _bridge20Set1(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(19,2),A(19,3),A(19,4),S(21,2),S(22,3),S(23,4),   // 19-family (cross by 1/2/3) + inverses
    A(18,3),A(18,4),A(18,5),S(21,3),S(22,4),S(23,5),   // 18-family + inverses
    A(17,4),A(17,5),A(17,6),                            // 17-family (additions to finish)
  ];
}
function _bridge20Set2(){
  const A=(a,b)=>({t:TA,a,b}),S=(a,b)=>({t:TS,a,b});
  return[
    A(16,5),A(16,6),A(16,7),S(21,5),S(22,6),S(23,7),   // 16-family (bigger jumps) + inverses
    A(15,6),A(15,7),A(15,8),S(21,6),S(22,7),S(23,8),   // 15-family + inverses
    A(14,7),A(14,8),A(14,9),                            // 14-family (additions to finish)
  ];
}
// SET 3 — "נֶעְלָם" (one unknown): shape-variable crossings of 20 (⃝ = N, then a ± ⃝),
// from var_one.ex.js, so the unknown-type joins the bridge-20 rotation too.
function _bridge20Set3(){return EX('var_one')?EX('var_one').make('b20'):_bridge20Set1();}
const _BRIDGE20_SETS=[_bridge20Set1,_bridge20Set2,_bridge20Set3];
function makeBridge20Pool(){
  const set=_BRIDGE20_SETS[_b20Turn%_BRIDGE20_SETS.length]();
  _b20Turn=(_b20Turn+1)%_BRIDGE20_SETS.length;
  try{localStorage.setItem('b20Turn',String(_b20Turn));}catch(e){}
  return set;
}

function modePts(){return mode==='mx'?20:mode==='br'?15:mode==='b20'?15:mode==='sup'?15:mode==='big'?10:mode||5;}
