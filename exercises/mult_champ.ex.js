/* ── "אַלּוּפָה" multiplication — product FIRST, chain only AFTER a mistake ────
   The אַלּוּפָה game (mode 'mulc'), the sole game in the "קָשֶׁה" (hard) tier.
   Unlike the plain multiplication-chain exercise (mult_chain.ex.js — which shows
   the repeated-addition scaffold from the start), here the child first meets the
   BARE product:

        3 × 4 = □

   She types the answer. Correct → solved (full points). WRONG → the host
   penalty fires AND the game's existing "זֶה כְּמוֹ" repeated-addition scaffold
   opens beneath the (now greyed) product (the Hebrew label sits to the RIGHT of
   the 🔁 switch):

        ─────────────
        [🔁 4 + 4 + 4]   זֶה כְּמוֹ
        3 +3 +3 +3 = □

   The 🔁 SWITCH button flips WHICH number is repeated: 3×4 shown as
   3+3+3+3 (four 3s) ↔ 4+4+4 (three 4s). Both equal the same product, so the
   final answer box never changes; only the visualisation does. The button
   always PREVIEWS the other orientation ("🔁 4 + 4 + 4"). Middle terms carry the
   optional running-sum helper boxes + diagonal guide (like chain/mult_chain);
   only the FINAL box scores.

   Problem shape: { t:TMK, a:base, b:count } → `a` repeated `b` times by default
   (a = the small multiplicand). Factors reach up to 4 (a,b ∈ {2,3,4}).
   Interactive: mounted by core.js _colxMount into #colx-root; self-checks via
   api.solved()/api.wrong() exactly like the other interactive modules. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.mult_champ=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  // Hebrew number WORDS (feminine, NIQQUD) — factors are 2..4; a few extra for safety.
  const NUM={1:'אַחַת',2:'שְׁתַּיִם',3:'שָׁלוֹשׁ',4:'אַרְבַּע',5:'חָמֵשׁ',6:'שֵׁשׁ',7:'שֶׁבַע',8:'שְׁמוֹנֶה',9:'תֵּשַׁע',10:'עֶשֶׂר'};
  const timesW=n=>n===1?'פַּעַם':n===2?'פַּעֲמַיִם':(NUM[n]||n)+' פְּעָמִים';   // "<n> times"
  // spoken form of the displayed product a×b → "<a-times> <b>" (4×3 → "אַרְבַּע פְּעָמִים שָׁלוֹשׁ")
  const spoken=(a,b)=>timesW(a)+' '+(NUM[b]||b);

  /* champion grid: factors up to 4 — a∈{2,3,4} × b∈{2,3,4} (product ≤ 16).
     `a` (the number repeated by default) and `b` (the count) both stay ≤ 4, so
     the whole 2×/3×/4× fact set is covered and EITHER orientation is a short
     one-line chain after the 🔁 switch. The complete 3×3 grid = 9 problems. */
  function makePool(n){
    const pairs=[];
    for(let a=2;a<=4;a++)for(let b=2;b<=4;b++)pairs.push({t:TMK,a,b});
    return sh(pairs).slice(0,n||12);
  }

  const CSS=`
  .mk-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
  .mk-title{font-family:'Fredoka One',cursive;font-size:2.4rem;color:var(--skin-text,#fff);
    direction:ltr;letter-spacing:.03em;display:flex;align-items:center;justify-content:center;gap:6px;
    text-shadow:0 0 12px rgba(160,190,255,.3);transition:opacity .3s}
  .mk-title b{color:var(--skin-accent,#ffd27d)}
  .mk-title .mk-x{color:var(--skin-primary,#c77dff);margin:0 2px}
  .mk-title .mk-eq{color:var(--skin-accent,#ffd27d);margin:0 4px}
  .mk-title.mk-answered{opacity:.7}
  #colx-root .ans-inp.mk-ans{width:78px;height:60px;font-size:2rem;border-radius:12px;text-align:center;padding:0}
  /* the revealed repeated-addition scaffold */
  .mk-chain{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;animation:mkFade .35s ease}
  @keyframes mkFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .mk-sep{width:60%;max-width:340px;height:0;border-top:2px solid var(--skin-accent,#ffd27d);opacity:.55;border-radius:2px}
  /* direction:rtl → the Hebrew "זֶה כְּמוֹ" (first child) sits to the RIGHT of the
     🔁 switch button (second child), which lands to its left */
  .mk-like-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;direction:rtl}
  .mk-like{font-family:'Fredoka One',cursive;font-size:1.15rem;color:var(--skin-text,#fff);opacity:.92}
  /* the SWITCH button — previews the OTHER orientation (e.g. "🔁 6 + 6") */
  .mk-switch{font-family:'Fredoka One',cursive;font-size:1.05rem;cursor:pointer;direction:ltr;
    color:var(--skin-text,#fff);background:rgba(199,125,255,.22);
    border:2px solid var(--skin-primary,#c77dff);border-radius:999px;padding:5px 14px;line-height:1;
    box-shadow:0 2px 8px rgba(0,0,0,.2);transition:transform .12s,background .12s}
  .mk-switch:hover{background:rgba(199,125,255,.4);transform:translateY(-1px)}
  .mk-switch:active{transform:scale(.95)}
  /* the chain fits on ONE line — the inner row auto-scales down when it would overflow */
  .mk-scroll{width:100%;overflow:hidden;display:flex;justify-content:center}
  .mk-row{display:flex;flex-wrap:nowrap;align-items:flex-start;gap:5px;direction:ltr;
    transform-origin:center top;white-space:nowrap;padding-top:2px}
  .mk-grp{display:flex;align-items:center;height:46px;font-family:'Fredoka One',cursive;
    font-size:1.8rem;line-height:1;color:var(--skin-text,#fff);gap:3px}
  .mk-op{color:var(--skin-accent,#ffd27d)}
  .mk-eq{color:var(--skin-accent,#ffd27d);margin:0 2px}
  .mk-cell{display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;overflow:visible}
  .mk-sub-row{display:flex;align-items:center;gap:3px;position:relative}
  .mk-sub-row .mk-seq{font-family:'Fredoka One',cursive;font-size:1rem;color:rgba(255,215,0,.6)}
  /* diagonal GUIDE — from this running-sum box up-and-right toward the NEXT "+"
     (the same helper the chain exercise draws) */
  .mk-sub-row::after{content:'';position:absolute;left:100%;top:30%;
    width:61px;height:2px;border-radius:2px;transform-origin:0% 50%;transform:rotate(-58deg);
    background:linear-gradient(90deg,rgba(255,215,0,.9),rgba(255,215,0,.08));
    animation:tzPulse 1.5s ease-in-out infinite;pointer-events:none}
  #colx-root .tx-sub-inp.mk-box{width:40px;height:42px;font-size:1.3rem;border-radius:10px;padding:0}
  #colx-root .ans-inp.mk-final{width:48px;height:46px;font-size:1.5rem;border-radius:11px;text-align:center;padding:0}
  #colx-root .mk-final.blink,#colx-root .mk-ans.blink{animation:mkBlink 1.1s ease-in-out infinite alternate}
  @keyframes mkBlink{
    from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  `;

  function injectStyle(){
    if(document.getElementById('mk-style'))return;
    const st=document.createElement('style');st.id='mk-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount({root,a,b,api}){
    injectStyle();
    const A=Math.max(2,a||2), B=Math.max(2,b||2), product=A*B;
    let done=false, revealed=false, flip=false;
    const timers=[]; const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const H=()=>document.getElementById('hint');
    const fb=msg=>{const h=H();if(h)h.textContent=msg;};

    root.innerHTML=
      '<div class="mk-root">'+
        '<div class="mk-title" id="mk-title"><b>'+A+'</b><span class="mk-x">×</span><b>'+B+'</b>'+
          '<span class="mk-eq">=</span>'+
          '<input class="ans-inp mk-ans blink" id="mk-ans" type="text" inputmode="numeric" maxlength="2" aria-label="הַתְּשׁוּבָה"></div>'+
        '<div class="mk-chain" id="mk-chain" style="display:none">'+
          '<div class="mk-sep"></div>'+
          '<div class="mk-like-row"><span class="mk-like">זֶה כְּמוֹ</span>'+
            '<button class="mk-switch" id="mk-switch" type="button" title="הַחְלִיפִי אֶת הַמִּסְפָּר שֶׁחוֹזֵר"></button></div>'+
          '<div class="mk-scroll"><div class="mk-row" id="mk-row"></div></div>'+
        '</div>'+
      '</div>';

    const titleEl=root.querySelector('#mk-title');
    const ansInp=root.querySelector('#mk-ans');
    const chainWrap=root.querySelector('#mk-chain');
    const scroll=root.querySelector('.mk-scroll');
    const switchBtn=root.querySelector('#mk-switch');
    const rowEl=root.querySelector('#mk-row');

    fb('✖️ כַּמָּה זֶה '+spoken(A,B)+'? כִּתְבִי אֶת הַתְּשׁוּבָה 💗');   // e.g. 4×3 → "אַרְבַּע פְּעָמִים שָׁלוֹשׁ"

    // keep the chain on ONE line — scale the row down if it overflows
    function fit(){
      if(!rowEl)return;
      rowEl.style.transform='';
      const cw=scroll.clientWidth, rw=rowEl.scrollWidth;
      if(rw>cw+1){const s=Math.max(0.4,cw/rw);rowEl.style.transform='scale('+s+')';}
    }

    // build the repeated-addition chain: `rep` added `times` times.
    // The first term, then middle terms 2..times-1 (each "+rep" over an optional
    // running-sum helper box + diagonal guide), then the FINAL "+rep = □".
    function chainHtml(rep,times){
      let row='<span class="mk-grp"><span class="mk-term">'+rep+'</span></span>';
      for(let i=2;i<=times-1;i++){
        row+='<div class="mk-cell">'+
          '<span class="mk-grp"><span class="mk-op">+</span><span class="mk-term">'+rep+'</span></span>'+
          '<div class="mk-sub-row"><span class="mk-seq">=</span>'+
            '<input class="tx-sub-inp mk-box" data-exp="'+(i*rep)+'" type="text" inputmode="numeric" maxlength="2" aria-label="תּוֹצָאַת בֵּינַיִם"></div>'+
        '</div>';
      }
      row+='<span class="mk-grp"><span class="mk-op">+</span><span class="mk-term">'+rep+'</span>'+
        '<span class="mk-eq">=</span>'+
        '<input class="ans-inp mk-final" data-exp="'+product+'" type="text" inputmode="numeric" maxlength="2" aria-label="הַתְּשׁוּבָה"></span>';
      return row;
    }

    // wire the freshly-rendered chain: optional helpers (green/red, NEVER a
    // penalty, never required) + the FINAL box (the real answer → api).
    function wireChain(){
      const subs=Array.prototype.slice.call(rowEl.querySelectorAll('.mk-box'));
      const finalInp=rowEl.querySelector('.mk-final');
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
          (subs[k+1]||finalInp).focus();
        });
      });
      finalInp.addEventListener('input',function(){
        this.value=this.value.replace(/\D/g,'').slice(0,2);
        this.classList.remove('ans-err');
      });
      finalInp.addEventListener('keydown',function(e){
        if(e.key!=='Enter'||done)return;e.preventDefault();
        const v=parseInt(this.value,10);
        if(this.value===''||isNaN(v)){fb('כִּתְבִי אֶת הַתְּשׁוּבָה 💗');return;}
        if(v===product)solve(finalInp); else wrongFinal(finalInp,v);
      });
      finalInp.classList.add('blink');
      return finalInp;
    }

    // render (or re-render, on switch) the chain in the CURRENT orientation
    function renderChain(){
      const rep=flip?B:A, times=flip?A:B;
      rowEl.innerHTML=chainHtml(rep,times);
      // the SWITCH button previews the OTHER orientation, e.g. "🔁 6 + 6"
      const oRep=flip?A:B, oTimes=flip?B:A;
      switchBtn.innerHTML='🔁 '+new Array(oTimes).fill(oRep).join(' + ');
      const finalInp=wireChain();
      requestAnimationFrame(()=>{fit();try{finalInp.focus();}catch(e){}});
    }

    // open the scaffold (once) after the first wrong product
    function reveal(){
      if(revealed)return;revealed=true;
      chainWrap.style.display='';
      titleEl.classList.add('mk-answered');
      fb('✖️ כֶּפֶל זֶה חִבּוּר חוֹזֵר! סְפְרִי אֶת הַחִבּוּר — אוֹ לַחֲצִי 🔁 לְהַחְלִיף 💗');
      renderChain();
    }

    function solve(box){
      if(done)return;done=true;
      if(box){box.classList.remove('blink','ans-err');box.classList.add('ans-ok');}
      root.querySelectorAll('input').forEach(el=>{el.classList.remove('blink');el.disabled=true;});
      api.solved();
    }
    function wrongFinal(box,v){
      box.classList.remove('blink');box.classList.add('ans-err');
      fb('כִּמְעַט! סְפְרִי אֶת הַכֹּל שׁוּב 💗');
      api.wrong(v);
      later(()=>{if(!done){box.value='';box.classList.remove('ans-err');box.classList.add('blink');try{box.focus();}catch(e){}}},1000);
    }

    // ── Phase 1: the bare product — SUBMITTED only on Enter ──
    ansInp.addEventListener('input',function(){
      this.value=this.value.replace(/\D/g,'').slice(0,2);
      this.classList.remove('ans-err');
    });
    ansInp.addEventListener('keydown',function(e){
      if(e.key!=='Enter'||done||revealed)return;e.preventDefault();
      const v=parseInt(this.value,10);
      if(this.value===''||isNaN(v)){fb('כִּתְבִי אֶת הַתְּשׁוּבָה 💗');return;}
      if(v===product){this.classList.remove('blink');solve(this);}
      else{
        this.classList.remove('blink');this.classList.add('ans-err');this.disabled=true;
        api.wrong(v);   // host: penalty + sad modal (there is no number-line aid to reveal here)
        reveal();       // open the repeated-addition scaffold beneath the product
      }
    });

    switchBtn.addEventListener('click',function(){flip=!flip;renderChain();});

    requestAnimationFrame(()=>{try{ansInp.focus();}catch(e){}});
    window.addEventListener('resize',fit);

    return function cleanup(){window.removeEventListener('resize',fit);timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TMK,
    modes:['mulc'],           // the אַלּוּפָה category's multiplication game
    aidsReveal:'always',      // no number-line aid — the scaffold IS revealed by the exercise itself on a mistake
    make(mode){ return mode==='mulc'?makePool(12):[]; },
    mount,
  };
})();
