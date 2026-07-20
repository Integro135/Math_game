/* ── "אַלּוּפָה" multiplication — product FIRST, chain only AFTER a mistake ────
   The אַלּוּפָה game (mode 'mulc'), the sole game in the "קָשֶׁה" (hard) tier.
   Unlike the plain multiplication-chain exercise (mult_chain.ex.js — which shows
   the repeated-addition scaffold from the start), here the child first meets the
   BARE product:

        3 × 4 = □

   She types the answer. Correct → solved (full points). WRONG → the host
   penalty fires AND the game's existing "זֶה כְּמוֹ" repeated-addition scaffold
   opens beneath the (now greyed) product. "זֶה כְּמוֹ" is ALWAYS followed by the
   CURRENT orientation — the one that matches what the aid is counting:

        ─────────────              ┌──────┐
        זֶה כְּמוֹ  4 + 4 + 4        │  🔁  │  ← FLOATS separately; hover
        (line jumps of 4)          └──────┘     previews "3 + 3 + 3 + 3"

   The 🔁 SWITCH button flips WHICH number is repeated: 3×4 shown as
   3+3+3+3 (four 3s) ↔ 4+4+4 (three 4s). Both equal the same product, so the
   final answer box never changes; only the visualisation does. The button is a
   FLOATING, SEPARATE 🔁 at the top-right (user request) — it PREVIEWS the OTHER
   orientation only in its HOVER tooltip, so the always-visible "זֶה כְּמוֹ" chain
   never contradicts the number line. Middle terms of the interactive chain carry
   the optional running-sum helper boxes + diagonal guide (like chain/mult_chain);
   only the FINAL box scores.

   MISTAKE AIDS ALTERNATE (user request): each mistake-card reveals ONE aid, in
   strict turns across cards (window.__mkAidTurn) — the SKIP-COUNTING NUMBER
   LINE (jumps of the repeated number, 0..rep·5; the product box itself retries)
   or the repeated-addition CHAIN above. The 🔁 switch follows the shown aid:
   on a line card it RE-CONFIGURES the line to the other factor's jumps AND
   updates the "זֶה כְּמוֹ" chain to match, so both always agree.

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
     CURRENT-orientation read-only chain (second child), which lands to its left */
  .mk-like-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;direction:rtl}
  .mk-like{font-family:'Fredoka One',cursive;font-size:1.15rem;color:var(--skin-text,#fff);opacity:.92}
  /* the CURRENT-orientation chain shown beside "זֶה כְּמוֹ" — matches the number
     line's jumps (jumps of 4 → "4 + 4 + 4"); hidden (empty) on a chain card,
     where the interactive chain below already IS the current display */
  .mk-like-chain{font-family:'Fredoka One',cursive;font-size:1.4rem;display:inline-flex;align-items:center;gap:7px;direction:ltr;line-height:1}
  .mk-like-chain .mk-lc-num{color:var(--skin-accent,#ffd27d)}
  .mk-like-chain .mk-lc-op{color:var(--skin-primary,#c77dff)}
  .mk-like-chain:empty{display:none}
  /* the SWITCH button — a FLOATING, SEPARATE round pill on its own line (an
     elevated 🔁 detached from the "זֶה כְּמוֹ" chain); position:relative anchors
     its hover tooltip, which previews the OTHER orientation just below it */
  .mk-switch{position:relative;margin-top:2px;cursor:pointer;line-height:1;
    color:var(--skin-text,#fff);background:rgba(199,125,255,.24);
    border:2px solid var(--skin-primary,#c77dff);border-radius:999px;
    width:48px;height:48px;font-size:1.5rem;display:flex;align-items:center;justify-content:center;
    box-shadow:0 5px 14px rgba(0,0,0,.3);transition:transform .12s,background .12s;z-index:3}
  .mk-switch:hover{background:rgba(199,125,255,.42);transform:translateY(-2px)}
  .mk-switch:active{transform:scale(.94)}
  .mk-switch-ico{pointer-events:none}
  /* the hover PREVIEW — the exercise it will swap TO — drops BELOW the button.
     FIXED light ink (#fff) + accent numbers: the pill is a fixed dark colour on
     every skin, so a skin's dark --skin-text (e.g. unicorns' deep plum) must NOT
     leak in or it goes invisible on the dark background. */
  .mk-switch-tip{position:absolute;top:calc(100% + 8px);left:50%;
    font-family:'Fredoka One',cursive;font-size:1.2rem;direction:ltr;white-space:nowrap;letter-spacing:.02em;
    color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.5);background:rgba(28,18,46,.96);
    border:1.5px solid var(--skin-primary,#c77dff);border-radius:12px;padding:6px 14px;
    box-shadow:0 4px 16px rgba(0,0,0,.4);opacity:0;visibility:hidden;
    transform:translate(-50%,-4px);transition:opacity .14s,transform .14s;pointer-events:none;z-index:4}
  .mk-switch:hover .mk-switch-tip,.mk-switch:focus .mk-switch-tip,.mk-switch:focus-visible .mk-switch-tip{opacity:1;visibility:visible;transform:translate(-50%,0)}
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
    let done=false, revealed=false, flip=false, aidKind=null;
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
          /* "זֶה כְּמוֹ" + the CURRENT-orientation chain (matches the number line;
             empty on a chain card, where the interactive chain below is shown) */
          '<div class="mk-like-row"><span class="mk-like">זֶה כְּמוֹ</span>'+
            '<span class="mk-like-chain" id="mk-like-chain"></span></div>'+
          /* the 🔁 switch flips WHICH factor repeats — pointless when both are
             equal (3+3+3 flips to the same 3+3+3), so omit it for a×a. It's a
             FLOATING, SEPARATE pill on its own line; the swap target shows only
             in its hover tooltip, so the visible "זֶה כְּמוֹ" chain never lies. */
          (A===B?'':'<button class="mk-switch" id="mk-switch" type="button" title="הַחְלִיפִי אֶת הַמִּסְפָּר שֶׁחוֹזֵר">'+
            '<span class="mk-switch-ico">🔁</span><span class="mk-switch-tip" id="mk-switch-tip"></span></button>')+
          '<div class="mk-scroll"><div class="mk-row" id="mk-row"></div></div>'+
        '</div>'+
      '</div>';

    const titleEl=root.querySelector('#mk-title');
    const ansInp=root.querySelector('#mk-ans');
    const chainWrap=root.querySelector('#mk-chain');
    const scroll=root.querySelector('.mk-scroll');
    const switchBtn=root.querySelector('#mk-switch');
    const rowEl=root.querySelector('#mk-row');
    const likeChainEl=root.querySelector('#mk-like-chain');

    // a read-only "rep + rep + …" chain string (styled numbers + operators),
    // used both beside "זֶה כְּמוֹ" (current orientation) and, as plain text, in
    // the 🔁 switch's hover tooltip (the orientation it will swap TO).
    function likeChainHtml(rep,times){
      let s='';
      for(let i=0;i<times;i++)s+=(i?'<span class="mk-lc-op">+</span>':'')+'<span class="mk-lc-num">'+rep+'</span>';
      return s;
    }
    // refresh the floating switch's hover preview to the OTHER orientation
    function updateSwitchTip(){
      if(!switchBtn)return;
      const oRep=flip?A:B, oTimes=flip?B:A;
      const tip=switchBtn.querySelector('.mk-switch-tip');
      if(tip)tip.textContent=new Array(oTimes).fill(oRep).join(' + ');
    }

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
      // the interactive chain below IS the current display — leave the read-only
      // "זֶה כְּמוֹ" chain empty (it's only for the number-line card)
      if(likeChainEl)likeChainEl.innerHTML='';
      updateSwitchTip();   // the floating 🔁 previews the OTHER orientation on hover
      const finalInp=wireChain();
      requestAnimationFrame(()=>{fit();try{finalInp.focus();}catch(e){}});
    }

    // the skip-counting NUMBER-LINE aid: jumps of `rep` (the repeated number)
    // over 0..rep·5 — one step beyond the largest product for that rep, so the
    // line's right edge never spells out the answer. Re-configured on every 🔁
    // switch (user request: the line must follow the factor swap).
    function renderNlAid(){
      const rep=flip?B:A, times=flip?A:B;
      // show the CURRENT orientation beside "זֶה כְּמוֹ" so it MATCHES the line's
      // jumps (jumps of `rep` → "rep + rep + …"); the floating 🔁 previews the other
      if(likeChainEl)likeChainEl.innerHTML=likeChainHtml(rep,times);
      updateSwitchTip();
      const nlp=document.getElementById('nl-panel');if(nlp)nlp.style.display='';
      if(typeof NL!=='undefined'){NL.configure(rep*5,rep);NL.init(0);}
      fb('✖️ כֶּפֶל זֶה קְפִיצוֹת שָׁווֹת! קִפְצִי '+times+' קְפִיצוֹת שֶׁל '+rep+' עַל הַיָּשָׁר 💗');
    }

    // open ONE aid (once) after the first wrong product — the skip-counting
    // number line OR the repeated-addition chain, strictly ALTERNATING across
    // mistake-exercises (user request: one aid per exercise, taking turns).
    // window.__mkAidTurn carries the turn across cards (and lets tests pin it).
    function reveal(){
      if(revealed)return;revealed=true;
      if(typeof window.__mkAidTurn!=='number')window.__mkAidTurn=0;
      aidKind=(window.__mkAidTurn++%2===0)?'nl':'chain';
      chainWrap.style.display='';
      titleEl.classList.add('mk-answered');
      if(aidKind==='nl'){
        scroll.style.display='none';   // the chain row stays hidden — the LINE is this card's aid
        renderNlAid();
      }else{
        fb('✖️ כֶּפֶל זֶה חִבּוּר חוֹזֵר! סְפְרִי אֶת הַחִבּוּר — אוֹ לַחֲצִי 🔁 לְהַחְלִיף 💗');
        renderChain();
      }
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
      if(e.key!=='Enter'||done)return;e.preventDefault();
      if(revealed&&aidKind==='chain')return;   // the chain's FINAL box owns the answer now
      const v=parseInt(this.value,10);
      if(this.value===''||isNaN(v)){fb('כִּתְבִי אֶת הַתְּשׁוּבָה 💗');return;}
      if(v===product){this.classList.remove('blink');solve(this);}
      else{
        this.classList.remove('blink');this.classList.add('ans-err');
        api.wrong(v);          // host: penalty + sad modal
        const first=!revealed;
        reveal();              // 1st mistake opens this card's aid (line OR chain, in turn)
        if(aidKind==='chain'){this.disabled=true;return;}   // chain: its final box takes over
        // line aid: the SAME product box retries (there is no other box)
        if(!first)fb('כִּמְעַט! קִפְצִי עַל הַיָּשָׁר בִּקְפִיצוֹת שֶׁל '+(flip?B:A)+' וְסִפְרִי 💗');
        later(()=>{if(!done){this.value='';this.classList.remove('ans-err');this.classList.add('blink');try{this.focus();}catch(e){}}},1000);
      }
    });

    // 🔁 re-renders whichever aid this card revealed (chain re-built / LINE re-configured)
    if(switchBtn)switchBtn.addEventListener('click',function(){
      flip=!flip;
      if(aidKind==='nl')renderNlAid(); else renderChain();
    });

    requestAnimationFrame(()=>{try{ansInp.focus();}catch(e){}});
    window.addEventListener('resize',fit);

    return function cleanup(){window.removeEventListener('resize',fit);timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TMK,
    modes:['mulc'],           // the אַלּוּפָה category's multiplication game
    aidsReveal:'always',      // the exercise reveals its OWN aid on a mistake (line/chain, alternating) — no try-first lock
    make(mode){ return mode==='mulc'?makePool(12):[]; },
    mount,
  };
})();
