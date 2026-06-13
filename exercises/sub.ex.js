/* ── Exercise type: SUBTRACTION (TS) — a − b = ? ────────────────────────────
   One file per exercise type; loaded dynamically per game mode.
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) }              */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.sub=(()=>{

  const TABLES={
    20:[[18,11],[20,12],[16,11],[19,13],[15,11],[17,12],[20,11],[18,13],[19,11],[16,12],[20,13],[17,11]],
    10:[[10,3],[8,5],[9,2],[7,4],[10,7],[6,3],[9,6],[8,3],[7,3],[10,4],[9,5],[6,4]],
    5: [[2,1],[3,1],[4,1],[5,1],[3,2],[4,2],[5,2],[4,3],[5,3],[5,4],[3,1],[4,2]],
  };
  const pick=(arr,n)=>{const s=[...arr];for(let i=s.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[s[i],s[j]]=[s[j],s[i]];}return s.slice(0,n);};

  return{
    t:TS,
    modes:[5,10,20,'br','mx'],
    make(mode){
      if(mode==='mx')return pick(TABLES[20],1).map(([a,b])=>({t:TS,a,b}));
      if(TABLES[mode])return TABLES[mode].map(([a,b])=>({t:TS,a,b}));
      return[];   // 'br' uses its fixed curriculum (problems.js recipe)
    },
  };
})();
