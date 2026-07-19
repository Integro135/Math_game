/* ── Multiplication with ONE UNKNOWN (כֶּפֶל בְּנֶעְלָם ❓) ──────────────────────
   The inverse question of the אַלּוּפָה product card: the PRODUCT is given and
   one factor is hidden —

        3 × □ = 9

   The child types the missing factor. The aid is the game's own SKINNED
   number line configured for SKIP-COUNTING — jumps of `a` (the given factor),
   line 0..a·5 — and, at the user's explicit request, it is VISIBLE FROM THE
   START (before any mistake; core.js's TMU branch shows + configures it in
   loadProblem). She hops 3, 6, 9 … and counts the jumps to reach the product.

   Factors follow the champion grid: a,b ∈ {2,3,4} (product ≤ 16, so the
   0..a·5 line always contains it). Problem shape: { t:TMU, a, b } — `a` is
   the SHOWN factor, `b` the hidden one; correct answer = b (host _cor).

   Interactive: mounted by core.js _colxMount into #colx-root; self-checks via
   api.solved()/api.wrong() like the other אַלּוּפָה modules. Mixed into the
   mulc set; 'mulu' is an INTERNAL handle (tester / direct setMode). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.mult_unknown=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  // the champion grid — a∈{2,3,4} × b∈{2,3,4}, the unknown is b
  function makePool(n){
    const pairs=[];
    for(let a=2;a<=4;a++)for(let b=2;b<=4;b++)pairs.push({t:TMU,a,b});
    return sh(pairs).slice(0,n||9);
  }

  const CSS=`
  .mu-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}
  .mu-title{font-family:'Fredoka One',cursive;font-size:2.4rem;color:var(--skin-text,#fff);
    direction:ltr;letter-spacing:.03em;display:flex;align-items:center;justify-content:center;gap:6px;
    text-shadow:0 0 12px rgba(160,190,255,.3)}
  .mu-title b{color:var(--skin-accent,#ffd27d)}
  .mu-title .mu-x{color:var(--skin-primary,#c77dff);margin:0 2px}
  .mu-title .mu-eq{color:var(--skin-accent,#ffd27d);margin:0 4px}
  /* the operands are hoverable (.eq-n[data-num] → #num-tt objects); blend them in */
  .mu-title .eq-n{font-size:inherit;min-width:0;color:var(--skin-accent,#ffd27d);text-shadow:inherit;padding:0 2px}
  #colx-root .ans-inp.mu-inp{width:70px;height:58px;font-size:2rem;border-radius:12px;text-align:center;padding:0}
  #colx-root .mu-inp.blink{animation:muBlink 1.1s ease-in-out infinite alternate}
  @keyframes muBlink{
    from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  @media(max-width:480px){
    .mu-title{font-size:1.9rem}
    #colx-root .ans-inp.mu-inp{width:58px;height:50px;font-size:1.7rem}
  }`;
  function injectStyle(){
    if(document.getElementById('mu-style'))return;
    const st=document.createElement('style');st.id='mu-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount({root,a,b,api}){
    injectStyle();
    const A=Math.max(2,a||2), B=Math.max(2,b||2), product=A*B;
    let done=false;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const fb=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    // the shown factor and the product are hoverable (objects tooltip); the box is the unknown
    root.innerHTML=
      '<div class="mu-root">'+
        '<div class="mu-title">'+
          '<span class="eq-n" data-num="'+A+'">'+A+'</span>'+
          '<span class="mu-x">×</span>'+
          '<input class="ans-inp mu-inp blink" id="mu-ans" type="text" inputmode="numeric" maxlength="1" aria-label="הַגּוֹרֵם הֶחָסֵר">'+
          '<span class="mu-eq">=</span>'+
          '<span class="eq-n" data-num="'+product+'">'+product+'</span>'+
        '</div>'+
      '</div>';

    const inp=root.querySelector('#mu-ans');
    fb('❓ '+A+' כָּפוּל כַּמָּה זֶה '+product+'? קִפְצִי עַל הַיָּשָׁר בִּקְפִיצוֹת שֶׁל '+A+' וְסִפְרִי 💗');

    function solve(){
      if(done)return;done=true;
      inp.classList.remove('blink','ans-err');inp.classList.add('ans-ok');inp.disabled=true;
      api.solved();
    }
    function wrong(v){
      inp.classList.remove('blink');inp.classList.add('ans-err');
      fb('כִּמְעַט! קִפְצִי בִּקְפִיצוֹת שֶׁל '+A+' עַד '+product+' — וְסִפְרִי אֶת הַקְּפִיצוֹת 💗');
      api.wrong(v);
      later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');inp.classList.add('blink');try{inp.focus();}catch(e){}}},1000);
    }
    inp.addEventListener('input',function(){
      this.value=this.value.replace(/\D/g,'').slice(0,1);
      this.classList.remove('ans-err');
    });
    inp.addEventListener('keydown',function(e){
      if(e.key!=='Enter'||done)return;e.preventDefault();
      const v=parseInt(this.value,10);
      if(this.value===''||isNaN(v)){fb('כִּתְבִי אֶת הַמִּסְפָּר הֶחָסֵר 💗');return;}
      if(v===B)solve(); else wrong(v);
    });
    requestAnimationFrame(()=>{try{inp.focus();}catch(e){}});

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TMU,
    modes:['mulu','mulc'],
    // NO try-first lock: the skip-counting number line IS the aid and it is
    // shown from the very start (core.js TMU branch), per the user's request.
    aidsReveal:'always',
    make(mode){ return mode==='mulc'?makePool(3):mode==='mulu'?makePool(9):[]; },
    mount,
  };
})();
