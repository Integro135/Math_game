/* ── Multiplication as repeated addition (רֵאשִׁית הַכֶּפֶל — חִבּוּר חוֹזֵר) ──────
   Teaches the MEANING of multiplication: "base × count" is `base` added `count`
   times. The card shows:

        base × count            ← title
        ───────────────         ← separator line
           זֶה כְּמוֹ            ← "this is like"
        base +base +base … = □  ← the repeated-addition CHAIN

   The chain works exactly like the game's chain exercise: each middle "+base"
   carries an OPTIONAL running-sum helper box below it (with a diagonal guide line
   pointing to the NEXT "+"), and the product is typed in the FINAL box at the end.
   A child who wants the scaffold fills the running sums left-to-right; a child who
   just knows the answer can type it straight into the final box — the helper boxes
   are never required.

     base ∈ {2, 3}   (the number copied `count` times)
     product = base × count ≤ 20
       base 2 → count 2..10  (2+2 … up to 2×10 = 20)
       base 3 → count 2..6   (3+3 … up to 3×6  = 18)

   Interactive: mounted by core.js _colxMount into #colx-root, self-checks via
   api.solved()/api.wrong() (only the FINAL box scores; the helpers just give gentle
   green/red feedback, no penalty). The whole chain auto-scales to stay on ONE line
   even at the widest case (2 ×10). Problem shape: { t:TMC, a:base, b:count }. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.mult_chain=(()=>{

  /* A shuffled mix of ×2 and ×3 across the whole range; `n` problems (default 12). */
  function makePool(n){
    const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
    const pairs=[];
    for(let c=2;c<=10;c++)pairs.push({t:TMC,a:2,b:c});   // 2×2 … 2×10  (4..20)
    for(let c=2;c<=6;c++) pairs.push({t:TMC,a:3,b:c});   // 3×2 … 3×6   (6..18)
    return sh(pairs).slice(0,n||12);
  }

  const CSS=`
  .mc-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
  .mc-title{font-family:'Fredoka One',cursive;font-size:2rem;color:var(--skin-text,#fff);
    direction:ltr;letter-spacing:.03em;text-shadow:0 0 12px rgba(160,190,255,.3)}
  .mc-title b{color:var(--skin-accent,#ffd27d)}
  .mc-title .mc-x{color:var(--skin-primary,#c77dff);margin:0 6px}
  /* separator line under the title */
  .mc-sep{width:60%;max-width:340px;height:0;border-top:2px solid var(--skin-accent,#ffd27d);opacity:.55;border-radius:2px}
  .mc-like{font-family:'Fredoka One',cursive;font-size:1.15rem;color:var(--skin-text,#fff);opacity:.92}
  /* the chain fits on ONE line — the inner row auto-scales down when it would overflow */
  .mc-scroll{width:100%;overflow:hidden;display:flex;justify-content:center}
  .mc-row{display:flex;flex-wrap:nowrap;align-items:flex-start;gap:5px;direction:ltr;
    transform-origin:center top;white-space:nowrap;padding-top:2px}
  .mc-grp{display:flex;align-items:center;height:46px;font-family:'Fredoka One',cursive;
    font-size:1.8rem;line-height:1;color:var(--skin-text,#fff);gap:3px}
  .mc-op{color:var(--skin-accent,#ffd27d)}
  .mc-eq{color:var(--skin-accent,#ffd27d);margin:0 2px}
  .mc-cell{display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;overflow:visible}
  .mc-sub-row{display:flex;align-items:center;gap:3px;position:relative}
  .mc-sub-row .mc-seq{font-family:'Fredoka One',cursive;font-size:1rem;color:rgba(255,215,0,.6)}
  /* diagonal GUIDE — from this running-sum box up-and-right toward the NEXT "+"
     (the same helper the chain exercise draws: .tz-sub-row.tz-live::after).
     A STEEP angle so it aims at the "+" (higher, on the top line) rather than the
     next text box, and ~0.5cm longer to reach it. */
  .mc-sub-row::after{content:'';position:absolute;left:100%;top:30%;
    width:61px;height:2px;border-radius:2px;transform-origin:0% 50%;transform:rotate(-58deg);
    background:linear-gradient(90deg,rgba(255,215,0,.9),rgba(255,215,0,.08));
    animation:tzPulse 1.5s ease-in-out infinite;pointer-events:none}
  #colx-root .tx-sub-inp.mc-box{width:40px;height:42px;font-size:1.3rem;border-radius:10px;padding:0}
  #colx-root .ans-inp.mc-final{width:48px;height:46px;font-size:1.5rem;border-radius:11px;text-align:center;padding:0}
  #colx-root .mc-final.blink{animation:mcBlink 1.1s ease-in-out infinite alternate}
  @keyframes mcBlink{
    from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  `;

  function injectStyle(){
    if(document.getElementById('mc-style'))return;
    const st=document.createElement('style');st.id='mc-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount({root,a,b,api}){
    injectStyle();
    const base=a||2, count=Math.max(2,b||2), product=base*count;
    let done=false;
    const timers=[]; const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};

    // Build the chain on ONE row (align-items:flex-start): the first term, then the
    // MIDDLE terms 2..count-1 as columns ("+base" over an optional running-sum box
    // with the diagonal guide), then the FINAL "+base = □" inline on the top line.
    let row='<span class="mc-grp"><span class="mc-term">'+base+'</span></span>';
    for(let i=2;i<=count-1;i++){
      row+='<div class="mc-cell">'+
        '<span class="mc-grp"><span class="mc-op">+</span><span class="mc-term">'+base+'</span></span>'+
        '<div class="mc-sub-row"><span class="mc-seq">=</span>'+
          '<input class="tx-sub-inp mc-box" data-exp="'+(i*base)+'" type="text" inputmode="numeric" maxlength="2" aria-label="תּוֹצָאַת בֵּינַיִם"></div>'+
      '</div>';
    }
    // final term + the answer box (the product); for count===2 this is the only "+base"
    row+='<span class="mc-grp"><span class="mc-op">+</span><span class="mc-term">'+base+'</span>'+
      '<span class="mc-eq">=</span>'+
      '<input class="ans-inp mc-final" data-exp="'+product+'" type="text" inputmode="numeric" maxlength="2" aria-label="הַתְּשׁוּבָה"></span>';

    root.innerHTML=
      '<div class="mc-root">'+
        '<div class="mc-title"><b>'+base+'</b><span class="mc-x">×</span><b>'+count+'</b></div>'+
        '<div class="mc-sep"></div>'+
        '<div class="mc-like">זֶה כְּמוֹ</div>'+
        '<div class="mc-scroll"><div class="mc-row" id="mc-row">'+row+'</div></div>'+
      '</div>';

    const rowEl=root.querySelector('#mc-row');
    const scroll=root.querySelector('.mc-scroll');
    const subs=Array.prototype.slice.call(root.querySelectorAll('.mc-box'));
    const finalInp=root.querySelector('.mc-final');

    function fb(msg){const h=document.getElementById('hint');if(h)h.textContent=msg;}
    fb('✖️ כֶּפֶל זֶה חִבּוּר חוֹזֵר! אֶפְשָׁר לְמַלֵּא אֶת הַבֵּינַיִם — אוֹ לִכְתֹּב אֶת הַתְּשׁוּבָה בַּסּוֹף 💗');

    // keep the whole chain on ONE line — scale the row down if it overflows
    function fit(){
      rowEl.style.transform='';
      const cw=scroll.clientWidth, rw=rowEl.scrollWidth;
      if(rw>cw+1){const s=Math.max(0.4,cw/rw);rowEl.style.transform='scale('+s+')';}
    }

    // OPTIONAL helper boxes: green when the running sum is right, a gentle red when
    // wrong — but NEVER a penalty and never required (only the final box scores).
    subs.forEach((box,k)=>{
      const exp=+box.getAttribute('data-exp');
      box.addEventListener('input',function(){
        this.value=this.value.replace(/\D/g,'').slice(0,2);
        this.classList.remove('sub-ok','sub-err');
        if(this.value!==''&&parseInt(this.value,10)===exp)this.classList.add('sub-ok');
      });
      box.addEventListener('blur',function(){
        if(this.value!==''&&parseInt(this.value,10)!==exp)this.classList.add('sub-err');
      });
      box.addEventListener('keydown',function(e){
        if(e.key!=='Enter')return;e.preventDefault();
        (subs[k+1]||finalInp).focus();   // step to the next helper, or the answer box
      });
    });

    // FINAL box — the real answer (product). Accept a correct value live; judge a
    // wrong one on Enter (penalty + sad + retry), exactly like the other modules.
    function solve(){
      if(done)return;done=true;
      finalInp.classList.remove('blink','ans-err');finalInp.classList.add('ans-ok');finalInp.disabled=true;
      api.solved();
    }
    function wrong(v){
      finalInp.classList.remove('blink');finalInp.classList.add('ans-err');
      fb('כִּמְעַט! סְפְרִי אֶת הַכֹּל שׁוּב 💗');
      api.wrong(v);
      later(()=>{if(!done){finalInp.value='';finalInp.classList.remove('ans-err');finalInp.classList.add('blink');try{finalInp.focus();}catch(e){}}},1000);
    }
    // the answer is SUBMITTED only on Enter (no auto-accept while typing) — typing
    // just sanitises + clears any red so she can review before sending.
    finalInp.addEventListener('input',function(){
      this.value=this.value.replace(/\D/g,'').slice(0,2);
      this.classList.remove('ans-err');
    });
    finalInp.addEventListener('keydown',function(e){
      if(e.key!=='Enter'||done)return;e.preventDefault();
      const v=parseInt(this.value,10);
      if(this.value===''||isNaN(v)){fb('כִּתְבִי אֶת הַתְּשׁוּבָה 💗');return;}
      if(v===product)solve(); else wrong(v);
    });

    finalInp.classList.add('blink');
    requestAnimationFrame(()=>{fit();(subs[0]||finalInp).focus();});
    window.addEventListener('resize',fit);

    return function cleanup(){window.removeEventListener('resize',fit);timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TMC,
    // 'mul' = internal handle (full 12-problem session for the tester / forced load,
    //  no dedicated picker tile). Mixed into Queen ('mx') + Superman ('sup') as a
    //  small 2-problem quota each.
    modes:['mul','mx','sup'],
    aidsReveal:'always',    // no number-line aid — the running-sum boxes ARE the scaffold
    make(mode){
      if(mode==='mul')return makePool(12);
      if(mode==='mx'||mode==='sup')return makePool(2);
      return [];
    },
    mount,
  };
})();
