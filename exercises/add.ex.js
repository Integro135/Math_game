/* ── Exercise type: ADDITION (TA) — a + b = ? ───────────────────────────────
   One file per exercise type (exercises/<name>.ex.js); loaded dynamically by
   bg-loader.loadExercisesFor when a game mode that lists it starts.
   Contract (architecture.md §3.6): EXERCISES.types.<name> =
     { t, modes, make(mode) → [problem objects] }                            */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.add=(()=>{

  // 1+1 (mode 0): the full fixed ladder of single-digit sums ≤ 10
  const BASIC_SEQ=(()=>{const a=[];for(let i=1;i<=9;i++)for(let j=1;j<=10-i;j++)a.push([i,j]);return a})();
  // curated pairs per cap (עד5 / עד10 / עד20)
  const TABLES={
    20:[[11,9],[12,8],[13,7],[11,8],[14,6],[11,7],[12,7],[13,6],[11,6],[14,5],[12,6],[15,5]],
    10:[[3,4],[5,4],[2,7],[4,5],[3,6],[1,9],[4,4],[5,3],[2,8],[3,5],[6,3],[4,6]],
    5: [[1,1],[1,2],[2,1],[1,3],[3,1],[2,2],[1,4],[4,1],[2,3],[3,2],[1,2],[2,2]],
  };
  const pick=(arr,n)=>{const s=[...arr];for(let i=s.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[s[i],s[j]]=[s[j],s[i]];}return s.slice(0,n);};

  return{
    t:TA,
    modes:[0,5,10,20,'br','mx'],
    make(mode){
      if(mode===0)return BASIC_SEQ.map(([a,b])=>({t:TA,a,b}));
      if(mode==='mx')return pick(TABLES[20],1).map(([a,b])=>({t:TA,a,b}));
      if(TABLES[mode])return TABLES[mode].map(([a,b])=>({t:TA,a,b}));
      return[];   // 'br' uses its fixed curriculum (problems.js recipe)
    },
  };
})();
