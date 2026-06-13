/* ── Exercise type: MISSING SUBTRAHEND (TM) — a − ? = b ─────────────────────
   One file per exercise type; loaded dynamically per game mode.
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) }              */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.missing=(()=>{

  const TABLES={
    20:[[18,11],[15,12],[17,11],[20,13],[16,11],[19,12],[14,11],[20,14],[18,13],[15,13],[17,14],[19,13]],
    10:[[8,3],[9,4],[7,2],[10,4],[9,6],[8,5],[10,7],[7,4],[8,6],[9,7],[10,3],[6,2]],
    5: [[3,1],[4,1],[5,1],[4,2],[5,2],[5,3],[3,2],[4,3],[5,4],[2,1],[4,2],[5,3]],
  };
  const pick=(arr,n)=>{const s=[...arr];for(let i=s.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[s[i],s[j]]=[s[j],s[i]];}return s.slice(0,n);};

  return{
    t:TM,
    modes:[5,10,20,'mx'],
    make(mode){
      if(mode==='mx')return pick(TABLES[20],1).map(([a,b])=>({t:TM,a,b}));
      if(TABLES[mode])return TABLES[mode].map(([a,b])=>({t:TM,a,b}));
      return[];
    },
  };
})();
