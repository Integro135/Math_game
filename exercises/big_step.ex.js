/* ── Exercise type: BIG NUMBER ± SMALL STEP (TBG) — 75−1, 32−2, 77+2 ────────
   NEW type: add/subtract 1 or 2 from a big two-digit number. The point is
   place-value intuition — only the ONES digit changes — so every problem is
   generated WITHOUT carry/borrow (units≥b for minus, units+b≤9 for plus).
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
      if(op==='sub'&&u<b)continue;       // no borrow — only the ones change
      if(op==='add'&&u+b>9)continue;     // no carry
      const key=op+a+'_'+b;
      if(seen.has(key))continue;
      seen.add(key);
      return{t:TBG,a,b,op};
    }
    return{t:TBG,a:op==='sub'?75:71,b,op};
  }

  // build n problems, balanced across the four −1/−2/+1/+2 shapes, shuffled
  function build(n){
    const seen=new Set(),out=[];
    const combos=[['sub',1],['sub',2],['add',1],['add',2]];
    for(let i=0;i<n;i++){const[op,b]=combos[i%4];out.push(makeOne(op,b,seen));}
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
      if(mode==='sup')return build(2);     // a couple inside Superman
      return[];
    },
  };
})();
