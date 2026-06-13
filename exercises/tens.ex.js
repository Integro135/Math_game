/* ── Exercise type: ROUND TENS (TT) — 30+40 / 70−20 on the tens line ────────
   One file per exercise type; loaded dynamically per game mode.
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) }              */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.tens=(()=>{

  const ri=(lo,hi)=>lo+(Math.random()*(hi-lo+1)|0);
  function makeTensProblem(){
    if(Math.random()<0.5){
      const a=ri(1,8)*10;const maxB=9-a/10;if(maxB<1)return makeTensProblem();
      const b=ri(1,maxB)*10;return{t:TT,op:'add',a,b};
    }
    const a=ri(2,9)*10;const maxB=a/10-1;if(maxB<1)return makeTensProblem();
    const b=ri(1,maxB)*10;return{t:TT,op:'sub',a,b};
  }

  return{
    t:TT,
    modes:['mx'],
    make(mode){
      if(mode!=='mx')return[];
      return[makeTensProblem(),makeTensProblem()];
    },
  };
})();
