/* ── Exercise type: the SUM CHAIN (TRA) — g + __ + __ = r ───────────────────
   The three-addend sibling of double.ex.js (TDA). 2026-11-02: the game GIVES
   the first addend g (data.js _triGiven — 2..9, leaving the child's pair a
   crossing when r allows) and the child fills TWO boxes with numbers that
   complete it to the shown result r (all r ≤ 20). Handled by core.js like the
   two-unknown add (num1 = r, num2 = g).
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) }              */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.tri_unknown=(()=>{
  // targets for __+__+__ = r — all ≤ 20, and ≥ 6 so three non-tiny addends fit
  const TARGETS=[9,10,11,12,13,14,15,16,17,18,19,20];
  const pick=n=>{const s=[...TARGETS];for(let i=s.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[s[i],s[j]]=[s[j],s[i]];}return s.slice(0,n);};
  return{
    t:TRA,
    modes:['mx'],
    // Queen (mx) mixes in ONE three-unknown problem per game.
    make(mode){return mode==='mx'?pick(1).map(r=>({t:TRA,r,g:_triGiven(r)})):[];},
  };
})();
