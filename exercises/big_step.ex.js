/* ── Exercise type: BIG NUMBER ± SMALL STEP (TBG) — 75−1, 85−2, 76−3, 85−4, 77+2 ──
   Add 1–2 to / subtract 1–4 from a big two-digit number. The point is
   place-value intuition — only the ONES digit changes — so every problem is
   generated WITHOUT carry/borrow (units≥b for minus, units+b≤9 for plus).
   Because units≥b, a subtraction never dips into the ten below: 85−4=81 is
   allowed, but 82−3 (which would cross 80) is never generated.
   Serves the 'big' game mode (עַד 100 💯, medium tier).

   One file per exercise type; loaded dynamically per game mode.
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) }
   Problem shape: { t:TBG, a, b, op:'add'|'sub' }                           */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.big_step=(()=>{

  const ri=(lo,hi)=>lo+(Math.random()*(hi-lo+1)|0);
  function makeOne(op,b,seen){
    for(let t=0;t<200;t++){
      // cap the big number at 89: the aid is a number line WINDOWED to num1±10
      // (core.js), so a≥90 would run the line past 100 and look broken
      const a=ri(21,89);
      const u=a%10;
      if(op==='sub'&&u<b)continue;       // no borrow — only the ones change (never crosses the ten below)
      if(op==='add'&&u+b>9)continue;     // no carry
      const key=op+a+'_'+b;
      if(seen.has(key))continue;
      seen.add(key);
      return{t:TBG,a,b,op};
    }
    return{t:TBG,a:op==='sub'?75:71,b,op};
  }

  // step sizes: subtract up to 4, add up to 2 — only the ones digit ever changes
  const STEP={sub:[1,4],add:[1,2]};
  // slot pattern keeps the original per-session composition: the dedicated game
  // (n=12) stays a balanced 6-sub / 6-add mix; Queen & Superman (n=2) get two
  // subtractions, as before — now any of them may step down by 3 (e.g. 76−3).
  const PAT=['sub','sub','add','add'];
  function build(n){
    const seen=new Set(),out=[];
    for(let i=0;i<n;i++){const op=PAT[i%PAT.length],[lo,hi]=STEP[op];out.push(makeOne(op,ri(lo,hi),seen));}
    for(let i=out.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }
  // Superman wants big-number SUBTRACTION only (−1/2/3/4); build n of them.
  function buildSubs(n){
    const seen=new Set(),out=[],[lo,hi]=STEP.sub;
    for(let i=0;i<n;i++)out.push(makeOne('sub',ri(lo,hi),seen));
    for(let i=out.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }

  return{
    t:TBG,
    // serves its own game ('big') and is also MIXED into Queen + Superman
    modes:['big','mx','sup'],
    make(mode){
      if(mode==='big')return build(12);   // the dedicated game
      if(mode==='mx') return build(2);     // a couple inside Queen
      if(mode==='sup')return buildSubs(3); // 3 big-number SUBTRACTIONS in Superman
      return[];
    },
  };
})();
