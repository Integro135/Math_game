/* ── Exercise type: CHAINS (TZ a+b+c / TX a−b+c / TW a−b−c) ─────────────────
   One file per exercise family; loaded dynamically per game mode.
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) }              */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.chain=(()=>{

  const ri=(lo,hi)=>lo+(Math.random()*(hi-lo+1)|0);

  return{
    t:[TZ,TX,TW],
    modes:['mx'],
    make(mode){
      if(mode!=='mx')return[];
      const out=[];
      const countOf=t=>out.filter(p=>p.t===t).length;
      // 2 of each chain shape, operands tuned for the Queen game. The THIRD
      // number c reaches up to 9; results may now reach up to 25 (was 20). TW's
      // minuend widened so a bigger c still leaves a valid (≥2) result.
      while(countOf(TZ)<2){const a=ri(4,9),b=ri(2,7),c=ri(1,9);if(a+b+c<=25&&a+b+c>=6)out.push({t:TZ,a,b,c});}
      while(countOf(TX)<2){const a=ri(13,18),b=ri(10,14),c=ri(1,9);if(a>b&&a-b+c<=25&&a-b+c>=3)out.push({t:TX,a,b,c});}
      while(countOf(TW)<2){const a=ri(16,20),b=ri(10,13),c=ri(1,9);if(a>b+c&&a-b-c>=2&&a-b-c<=14)out.push({t:TW,a,b,c});}
      return out;
    },
  };
})();
