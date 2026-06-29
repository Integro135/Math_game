/* ── Exercise type: ONE UNKNOWN as a SHAPE (TVA / TVS) ──────────────────────
   A shape (circle / triangle / square) stands for a number, DEFINED above the
   sum, e.g.  ⃝ = 20  then  30 − ⃝ = ?  (the child substitutes ⃝ = 20 → 10).
   Both addition (TVA: a + ⃝) and subtraction (TVS: a − ⃝) are generated.

   Structurally each problem is {t, a, b, sym}: `b` is the shape's value (the
   "= N" definition) and `sym` is which shape — so it reuses the plain add/sub
   engine (num1=a, num2=b, answer a±b); only the RENDER draws the shape +
   definition line (core.js → renderEq, the TVA/TVS branch).

   Modes: bridge-10 ('br', crossings of 10), bridge-20 ('b20', crossings of 20),
   and Queen ('mx', one add + one sub mixed into the curated pool).
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) }.            */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.var_one=(()=>{
  const SHAPES=['circle','triangle','square'];
  const sh=()=>SHAPES[(Math.random()*SHAPES.length)|0];
  const A=(a,b)=>({t:TVA,a,b,sym:sh()});   // a + ⃝(=b)  → a+b
  const S=(a,b)=>({t:TVS,a,b,sym:sh()});   // a − ⃝(=b)  → a−b
  const rnd=(lo,hi)=>lo+((Math.random()*(hi-lo+1))|0);

  return{
    t:[TVA,TVS],
    modes:['br','b20','mx'],
    make(mode){
      // bridge-10: every sum / minuend crosses 10 (units carry / borrow)
      if(mode==='br')return[
        A(7,5),S(13,5),A(8,6),S(14,6),A(9,4),S(15,7),A(6,7),S(12,4),
        A(8,5),S(16,8),A(9,6),S(13,7),A(7,8),S(14,9),A(9,9),
      ];
      // bridge-20: every sum / minuend crosses 20 (sums/minuends 21-23)
      if(mode==='b20')return[
        A(19,3),S(21,3),A(18,4),S(22,4),A(17,5),S(23,5),A(16,6),S(21,6),
        A(19,4),S(22,7),A(18,5),S(23,8),A(15,7),S(22,9),A(14,8),
      ];
      // Queen (mx): one addition + one subtraction, ≤20 (so the aid line fits)
      if(mode==='mx'){
        const av=rnd(3,9),bv=rnd(3,9);                  // add: sum ≤ 18
        const m=rnd(11,18),sb=rnd(2,Math.min(9,m-1));   // sub: minuend 11-18
        return[A(av,bv),S(m,sb)];
      }
      return[];
    },
  };
})();
