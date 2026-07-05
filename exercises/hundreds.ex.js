/* ── Exercise type: WHOLE HUNDREDS addition (TH) ────────────────────────────
   Adding round hundreds, result ≤ 900. Two flavours, mixed:
     • hundreds + hundreds   e.g. 300 + 300 = 600
     • hundreds + tens       e.g. 200 + 60  = 260
   Structurally {t:TH, a, b} → num1=a, num2=b, answer a+b (plain #ans input,
   rendered by core.js renderEq's TH branch). No 0-20 number-line aid (values
   are far past it). Modes: Queen ('mx') and Superman ('sup').
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) }.            */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.hundreds=(()=>{
  const ri=(lo,hi)=>lo+((Math.random()*(hi-lo+1))|0);
  const H=[100,200,300,400,500,600,700,800];   // whole hundreds
  const T=[10,20,30,40,50,60,70,80,90];        // whole tens

  // one problem of the given flavour ('hh' hundreds+hundreds | 'ht' hundreds+tens),
  // sum kept ≤ 900; `seen` de-dupes within a pool build
  function make1(flavour,seen){
    for(let tries=0;tries<200;tries++){
      let a,b;
      if(flavour==='hh'){a=H[ri(0,H.length-1)];b=H[ri(0,H.length-1)];}
      else{a=H[ri(0,H.length-1)];b=T[ri(0,T.length-1)];}
      if(a+b>900)continue;
      const key=a+'_'+b;
      if(seen.has(key))continue;
      seen.add(key);
      return{t:TH,a,b};
    }
    return{t:TH,a:200,b:60};   // safe fallback
  }

  return{
    t:TH,
    modes:['mx','sup'],
    // one hundreds+hundreds and one hundreds+tens per pool build
    make(mode){
      if(mode!=='mx'&&mode!=='sup')return[];
      const seen=new Set();
      return[make1('hh',seen),make1('ht',seen)];
    },
  };
})();
