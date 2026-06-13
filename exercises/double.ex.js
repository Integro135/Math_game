/* ── Exercise type: TWO UNKNOWNS (TDA/TDS) — __+__=r / __−__=r ──────────────
   One file per exercise family; loaded dynamically per game mode.
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) }              */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.double=(()=>{

  // [r] = the known result shown on the right side
  const TABLES={
    20:{A:[8,10,12,14,15,6,9,11,13,7,16,5], S:[3,5,6,7,8,4,2,9,1,10,3,6]},
    10:{A:[4,6,7,8,9,5,3,10,6,7,4,8],       S:[1,2,3,4,5,2,3,4,1,5,2,3]},
    5: {A:[2,3,4,5,3,4,5,2,3,4,5,4],        S:[1,2,3,4,1,2,3,4,1,2,3,4]},
  };
  const pick=(arr,n)=>{const s=[...arr];for(let i=s.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[s[i],s[j]]=[s[j],s[i]];}return s.slice(0,n);};

  return{
    t:[TDA,TDS],
    modes:[5,10,20,'mx'],
    make(mode){
      if(mode==='mx')return[
        ...pick(TABLES[20].A,1).map(r=>({t:TDA,r})),
        ...pick(TABLES[20].S,1).map(r=>({t:TDS,r})),
      ];
      const tb=TABLES[mode];if(!tb)return[];
      return[...tb.A.map(r=>({t:TDA,r})),...tb.S.map(r=>({t:TDS,r}))];
    },
  };
})();
