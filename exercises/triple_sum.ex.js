/* ── Three-addends-to-a-target exercise (חִבּוּר שְׁלוֹשָׁה מִסְפָּרִים ➕➕) ──────────
   `__ + __ + __ = N` — the child fills THREE addends of her own choosing that
   sum to the target N. The target VARIES per card — a number 6..14 (not always
   the same). Any triple that sums to N is accepted — EXCEPT that **0 and 10 may
   not be used** as an addend. A sum-correct answer that leans on a 0 or a 10 is
   praised ("נָכוֹן!") and costs NO points, but does NOT complete the problem —
   she is asked to find OTHER numbers (this pushes real number-bond practice past
   the trivial N+0+0 / 10+1+1 shortcuts). A wrong SUM is a normal mistake (host
   penalty).

   Self-contained interactive type, mounted by core.js _colxMount into #colx-root
   (same host path as perimeter/compare/column modules); self-checks via
   api.solved()/api.wrong(). Woven into Queen (mx), Superman (sup) AND אַלּוּפָה
   (mulc); the 'trip' handle is for the manual tester / direct setMode.
   Problem shape: { t:TTS, a:target }  (a = the sum the three addends must reach). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.triple_sum=(()=>{

  const BANNED=[0,10];                       // may NOT be used as an addend
  const isBanned=v=>BANNED.indexOf(v)!==-1;

  // The TARGET varies per card — a number 6..14 (every one has a no-0/no-10
  // triple; the "no 10" rule bites at 11..14, where the 10+… shortcut is barred —
  // e.g. 13 = 4+4+5, 14 = 4+5+5). Targets are DISTINCT across a pool so the same
  // total doesn't repeat.
  const TARGETS=[6,7,8,9,10,11,12,13,14];
  function makePool(n){
    n=n||3;
    const bag=TARGETS.slice();
    for(let i=bag.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[bag[i],bag[j]]=[bag[j],bag[i]];}
    const out=[];for(let i=0;i<n;i++)out.push({t:TTS,a:bag[i%bag.length]});
    return out;
  }

  const CSS=`
  .tsm-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:22px;width:100%}
  .tsm-q{font-family:'Fredoka One',cursive;font-size:1.25rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.4;min-height:1.4em;text-shadow:0 0 12px rgba(160,190,255,.35)}
  .tsm-q b{color:var(--skin-accent,#ffd27d)}
  .tsm-eq{direction:ltr;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
  .tsm-op{font-family:'Fredoka One',cursive;font-size:2.8rem;line-height:1;color:var(--skin-text,#fff);opacity:.85}
  .tsm-target{font-family:'Fredoka One',cursive;font-size:3.4rem;line-height:1;color:var(--skin-accent,#ffd27d);
    text-shadow:0 0 18px rgba(255,210,125,.4)}
  #colx-root .ans-inp.tsm-inp{width:74px;height:74px;font-size:2.5rem;border-radius:16px;text-align:center}
  #colx-root .tsm-inp.tsm-ready{animation:tsmReady 1s ease-in-out infinite alternate}
  @keyframes tsmReady{from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  #colx-root .tsm-inp.tsm-nudge{border-color:#ffb02e !important;
    box-shadow:0 0 20px rgba(255,176,46,.8) !important;animation:tsmNudge .5s ease-in-out 2}
  @keyframes tsmNudge{0%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}60%{transform:translateY(3px)}}
  .tsm-ans-row{display:flex;gap:10px;align-items:center;justify-content:center}
  .tsm-btn{font-family:'Fredoka One',cursive;font-size:1.25rem;border:0;border-radius:14px;padding:12px 26px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .tsm-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .tsm-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){
    #colx-root .ans-inp.tsm-inp{width:58px;height:58px;font-size:2rem}
    .tsm-op{font-size:2.1rem}.tsm-target{font-size:2.6rem}
  }`;
  function injectStyle(){
    if(document.getElementById('tsm-style'))return;
    const st=document.createElement('style');st.id='tsm-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const target=(typeof ctx.a==='number'&&ctx.a)||(ctx.p&&ctx.p.a)||9;
    const uid=++_uid;
    let done=false;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    root.innerHTML=`
      <div class="tsm-root">
        <div class="tsm-q" id="tsm-q-${uid}">חַבְּרִי <b>שְׁלוֹשָׁה</b> מִסְפָּרִים שֶׁיַּחַד הֵם <b>${target}</b> — בְּלִי 0 וּבְלִי 10!</div>
        <div class="tsm-eq">
          <input class="ans-inp tsm-inp" id="tsm-i0-${uid}" type="text" inputmode="numeric" maxlength="2" aria-label="מִסְפָּר 1">
          <span class="tsm-op">+</span>
          <input class="ans-inp tsm-inp" id="tsm-i1-${uid}" type="text" inputmode="numeric" maxlength="2" aria-label="מִסְפָּר 2">
          <span class="tsm-op">+</span>
          <input class="ans-inp tsm-inp" id="tsm-i2-${uid}" type="text" inputmode="numeric" maxlength="2" aria-label="מִסְפָּר 3">
          <span class="tsm-op">=</span>
          <span class="tsm-target">${target}</span>
        </div>
        <div class="tsm-ans-row">
          <button class="tsm-btn" id="tsm-chk-${uid}" aria-label="בְּדִיקָה">✓</button>
        </div>
      </div>`;

    const $=id=>root.querySelector('#'+id+'-'+uid);
    const inps=[0,1,2].map(k=>$('tsm-i'+k));
    const chk=$('tsm-chk'),qEl=$('tsm-q');
    hint('➕ חַבְּרִי שְׁלוֹשָׁה מִסְפָּרִים שֶׁיַּחַד = '+target+' (בְּלִי 0 וּבְלִי 10)!');

    function clearMarks(){inps.forEach(i=>i.classList.remove('ans-err','tsm-nudge'));}

    function check(){
      if(done)return;
      const vals=inps.map(i=>i.value===''?NaN:parseInt(i.value,10));
      if(vals.some(v=>isNaN(v))){hint('כִּתְבִי שְׁלוֹשָׁה מִסְפָּרִים 💗');return;}
      const sum=vals[0]+vals[1]+vals[2];
      if(sum!==target){
        // a real mistake — the sum is wrong. Per the user's request, DON'T erase
        // what she typed: mark the boxes red + show the sad emoji (api.wrong), but
        // LEAVE the numbers in place so she can FIX them (typing clears the red via
        // the global .ans-inp handler; then check again). No box-wiping timer.
        clearMarks();inps.forEach(i=>i.classList.add('ans-err'));
        hint(sum<target?`הַסְּכוּם ${sum} — קְצָת קָטָן, תַּקְּנִי כְּדֵי לְהַגִּיעַ לְ-${target} 💗`
                       :`הַסְּכוּם ${sum} — קְצָת גָּדוֹל, תַּקְּנִי כְּדֵי לְהַגִּיעַ לְ-${target} 💗`);
        api.wrong(sum);
        return;   // numbers stay; she edits a box and checks again
      }
      // sum is CORRECT — but 0 and 10 are not allowed. Praise, DO NOT penalize,
      // DO NOT complete: ask for other numbers (per spec).
      if(vals.some(isBanned)){
        clearMarks();
        inps.forEach((i,k)=>{if(isBanned(vals[k]))i.classList.add('tsm-nudge');});
        qEl.innerHTML=`נָכוֹן! 👍 אֲבָל בְּלִי <b>0</b> וּבְלִי <b>10</b> — נַסִּי מִסְפָּרִים אֲחֵרִים!`;
        hint('הַסְּכוּם נָכוֹן! 🧠 עַכְשָׁו בְּלִי 0 וּבְלִי 10 — נַסִּי שׁוּב');
        later(()=>{if(!done){inps.forEach(i=>{i.value='';i.classList.remove('tsm-nudge');});inps[0].focus();}},1500);
        return;   // NOTE: no api.wrong (no penalty) and no api.solved (no advance)
      }
      // fully valid: sum === target AND no 0 / no 10
      done=true;clearMarks();
      inps.forEach(i=>{i.classList.remove('tsm-ready');i.classList.add('ans-ok');i.disabled=true;});
      chk.disabled=true;
      qEl.innerHTML=`🎉 יֹפִי! ${vals[0]} + ${vals[1]} + ${vals[2]} = ${target}`;
      api.solved();
    }

    inps.forEach((inp,k)=>{
      inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
      inp.addEventListener('keydown',e=>{
        if(e.key!=='Enter')return;e.preventDefault();
        if(k<2&&inps[k+1]){inps[k+1].focus();}else check();
      });
    });
    chk.addEventListener('click',check);
    later(()=>{inps[0].classList.add('tsm-ready');inps[0].focus();},350);

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TTS,
    modes:['trip','mx','sup','mulc'],
    aidsReveal:'always',            // abstract number-bonds task — no number-line aid
    make(mode){
      return mode==='trip'?makePool(6)
            :mode==='mulc'?makePool(3)
            :mode==='sup'?makePool(2)
            :mode==='mx'?makePool(1):[];   // Queen weaves just one (saturated pool)
    },
    mount,
  };
})();
