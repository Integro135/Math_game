/* ── "אֲרִיזָה" — how many BOXES do we need? (📦) ─────────────────────────────
   The other face of division ("how many groups fit", the quotative one —
   half/deal share among friends, this one packs into containers): n items, b
   fit in each box, how many boxes?  12 eggs, 4 in a tray → 3 trays.

   • Try-first: she SEES all n items loose and ONE sample box with its b empty
     places ("בְּכָל תַּבְנִית: 4 מְקוֹמוֹת") — enough to group them in her head.
   • A WRONG answer opens the PACKING: from then on every tap on the pile brings
     a NEW box and b items glide into it, until the pile is empty — and she
     counts the boxes. No box is drawn ahead of her taps (that would show the
     answer).
   • Right → the rest packs itself as the celebration.

   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root; self-checks via api.solved()/api.wrong(). Mixed into אַלּוּפָה
   (mulc); 'pack' is the manual-tester handle. Problem shape:
   { t:TPK, n:items, b:per box, a:n/b (the ANSWER), it:index into ITEMS }. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.pack=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  // item + its container (singular/plural), and the item's grammatical gender
  // for the verb ("נִכְנָסוֹת" / "נִכְנָסִים") and "all of them" (כֻּלָּן / כֻּלָּם)
  const ITEMS=[
    {e:'🥚',name:'בֵּיצִים',f:true, box:'תַּבְנִית',boxes:'תַּבְנִיּוֹת'},
    {e:'🍪',name:'עוּגִיּוֹת',f:true, box:'קֻפְסָה',boxes:'קֻפְסָאוֹת'},
    {e:'🍩',name:'סֻפְגָּנִיּוֹת',f:true, box:'קֻפְסָה',boxes:'קֻפְסָאוֹת'},
    {e:'✏️',name:'עֶפְרוֹנוֹת',f:false,box:'קַלְמָר',boxes:'קַלְמָרִים'},
    {e:'⚽',name:'כַּדּוּרִים',f:false,box:'סַל',boxes:'סַלִּים'},
    {e:'🧸',name:'דֻּבּוֹנִים',f:false,box:'אַרְגָּז',boxes:'אַרְגָּזִים'},
  ];
  // b per box 2..5, 2..5 boxes, at most 20 items
  const SPECS=[];
  for(let b=2;b<=5;b++)for(let m=2;m<=5;m++)if(b*m<=20)SPECS.push({b,m});
  function makePool(cnt){
    const its=sh(ITEMS.map((_,i)=>i)), sp=sh(SPECS.slice());
    const out=[];
    for(let i=0;i<cnt;i++){const s=sp[i%sp.length];out.push({t:TPK,n:s.b*s.m,b:s.b,a:s.m,it:its[i%its.length]});}
    return out;
  }

  const CSS=`
  .pk-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;--pk-isz:1.8rem}
  .pk-q{font-family:'Fredoka One',cursive;font-size:1.2rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.5;direction:rtl;padding:0 8px;text-shadow:0 0 12px rgba(160,190,255,.35)}
  .pk-q b{color:var(--skin-accent,#ffd27d)}
  .pk-pile{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;max-width:460px;min-height:2.6rem;
    padding:8px 12px;border-radius:18px;background:rgba(255,255,255,.07);direction:ltr;transition:background .3s}
  .pk-root.pk-open .pk-pile{cursor:pointer}
  .pk-root.pk-open .pk-pile:hover{background:rgba(255,255,255,.12)}
  .pk-pile:empty::after{content:'✔';font-size:1.4rem;color:#7be3a0;opacity:.7}
  .pk-it{font-size:var(--pk-isz);line-height:1;user-select:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))}
  /* a box: b places in one row, a cardboard rim */
  .pk-box{display:inline-flex;gap:3px;padding:6px 7px;border-radius:12px;direction:ltr;
    background:linear-gradient(180deg,#d9a86a,#b9814a);border:3px solid #8a5a2e;box-shadow:0 4px 0 rgba(0,0,0,.25)}
  .pk-slot{width:calc(var(--pk-isz) * 1.05);height:calc(var(--pk-isz) * 1.05);border-radius:50%;
    border:2px dashed rgba(70,40,15,.55);background:rgba(255,240,220,.35);display:flex;align-items:center;justify-content:center}
  .pk-slot .pk-it{font-size:calc(var(--pk-isz) * .8)}
  .pk-sample{display:flex;flex-direction:column;align-items:center;gap:6px}
  .pk-cap{font-family:'Fredoka One',cursive;font-size:1rem;color:var(--skin-text,#fff);opacity:.9;direction:rtl}
  .pk-cap b{color:var(--skin-accent,#ffd27d)}
  .pk-boxes{display:none;flex-wrap:wrap;justify-content:center;gap:10px;max-width:520px;min-height:10px}
  .pk-root.pk-open .pk-boxes{display:flex}
  .pk-new{animation:pkIn .32s cubic-bezier(.34,1.56,.64,1)}
  @keyframes pkIn{from{transform:scale(.3) translateY(-20px);opacity:0}to{transform:none;opacity:1}}
  .pk-tip{font-family:'Fredoka One',cursive;font-size:.95rem;color:var(--skin-text,#fff);opacity:.8;display:none;direction:rtl}
  .pk-root.pk-open .pk-tip{display:block}
  .pk-fly{position:absolute;left:0;top:0;z-index:6;pointer-events:none;line-height:1;font-size:var(--pk-isz);
    transition:transform .38s cubic-bezier(.3,.9,.4,1)}
  .pk-ans-row{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;direction:rtl}
  .pk-lbl{font-family:'Fredoka One',cursive;font-size:1.15rem;color:var(--skin-text,#fff)}
  #colx-root .ans-inp.pk-inp{width:76px;height:60px;font-size:2.1rem;border-radius:14px;text-align:center}
  #colx-root .pk-inp.pk-ready{animation:pkReady 1s ease-in-out infinite alternate}
  @keyframes pkReady{from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  .pk-btn{font-family:'Fredoka One',cursive;font-size:1.2rem;border-radius:14px;padding:11px 24px;cursor:pointer;color:#fff;
    background:linear-gradient(160deg,#86E29B,#2FA257 85%);border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .pk-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .pk-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){ .pk-root{--pk-isz:1.4rem} .pk-boxes{gap:7px} }`;
  function injectStyle(){
    if(document.getElementById('pk-style'))return;
    const st=document.createElement('style');st.id='pk-style';st.textContent=CSS;document.head.appendChild(st);
  }

  // wrap the pile in BALANCED rows (12 → 6+6, never 11+1): size its width to ⌈n/rows⌉ items
  function balanceRows(el,n,maxPer){
    const it=el.firstElementChild;if(!it)return;
    const cs=getComputedStyle(el),w=it.getBoundingClientRect().width,gap=parseFloat(cs.columnGap)||6;
    const per=Math.ceil(n/Math.ceil(n/maxPer));
    el.style.boxSizing='border-box';
    el.style.maxWidth=Math.ceil(per*w+(per-1)*gap+parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+2)+'px';
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx, p=ctx.p||{};
    const I=ITEMS[p.it]||ITEMS[0], b=p.b||4, n=p.n||b*3, boxesNeed=n/b;
    const uid=++_uid, timers=[];
    const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};
    let done=false, open=false;
    const fit=I.f?'נִכְנָסוֹת':'נִכְנָסִים', all=I.f?'כֻּלָּן':'כֻּלָּם';
    const slots=c=>new Array(c).fill('<span class="pk-slot"></span>').join('');

    root.innerHTML=
      '<div class="pk-root" id="pk-root-'+uid+'">'+
        '<div class="pk-q">יֵשׁ <b>'+n+'</b> '+I.name+' '+I.e+', וּבְכָל '+I.box+' '+fit+' <b>'+b+'</b>. '+
          'כַּמָּה '+I.boxes+' צְרִיכִים כְּדֵי לֶאֱרֹז אֶת '+all+'?</div>'+
        '<div class="pk-pile" id="pk-pile-'+uid+'">'+new Array(n).fill('<span class="pk-it">'+I.e+'</span>').join('')+'</div>'+
        '<div class="pk-sample" id="pk-sample-'+uid+'"><div class="pk-box">'+slots(b)+'</div>'+
          '<span class="pk-cap">בְּכָל '+I.box+': <b>'+b+'</b> מְקוֹמוֹת</span></div>'+
        '<div class="pk-tip">👆 לַחֲצִי עַל הַ'+I.name+' — כָּל לְחִיצָה מְמַלְּאָה '+I.box+' אַחַת</div>'+
        '<div class="pk-boxes" id="pk-boxes-'+uid+'"></div>'+
        '<div class="pk-ans-row">'+
          '<span class="pk-lbl">כַּמָּה '+I.boxes+'?</span>'+
          '<input class="ans-inp pk-inp" id="pk-ans-'+uid+'" type="text" inputmode="numeric" maxlength="2" aria-label="כַּמָּה">'+
          '<button class="pk-btn" id="pk-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
        '</div>'+
      '</div>';
    const $=id=>root.querySelector('#'+id+'-'+uid);
    const rootEl=$('pk-root'), pile=$('pk-pile'), boxesEl=$('pk-boxes'), sample=$('pk-sample'), inp=$('pk-ans'), chk=$('pk-chk');
    hint('📦 כַּמָּה '+I.boxes+' צְרִיכִים? חִשְׁבִי בָּרֹאשׁ 🏆');

    requestAnimationFrame(()=>balanceRows(pile,n,10));
    // pack ONE box: a new box appears, b items glide from the pile into its places
    function packOne(quick){
      if(!pile.children.length)return false;
      const box=document.createElement('div');box.className='pk-box pk-new';box.innerHTML=slots(b);
      boxesEl.appendChild(box);
      const host=rootEl.getBoundingClientRect(), sl=[...box.children], src=[...pile.children].slice(0,b);
      src.forEach((el,i)=>{
        const r0=el.getBoundingClientRect(), r1=sl[i].getBoundingClientRect();
        el.remove();
        const f=document.createElement('span');f.className='pk-fly';f.textContent=I.e;
        f.style.transform='translate('+(r0.left-host.left)+'px,'+(r0.top-host.top)+'px)';
        rootEl.appendChild(f);
        later(()=>{f.style.transform='translate('+(r1.left-host.left+2)+'px,'+(r1.top-host.top+2)+'px) scale(.8)';},20+i*40);
        later(()=>{f.remove();sl[i].innerHTML='<span class="pk-it">'+I.e+'</span>';},(quick?280:420)+i*40);
      });
      if(!pile.children.length&&!done){hint('סִפְרִי — כַּמָּה '+I.boxes+' יָצְאוּ? 💗');}
      return true;
    }
    pile.addEventListener('click',()=>{if(!done&&open)packOne();});

    function check(){
      if(done)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){hint('כִּתְבִי כַּמָּה '+I.boxes+' צְרִיכִים 💗');return;}
      if(v===boxesNeed){
        done=true;
        inp.classList.remove('pk-ready','ans-err');inp.classList.add('ans-ok');inp.disabled=true;chk.disabled=true;
        rootEl.classList.add('pk-open');sample.style.display='none';
        let i=0;(function step(){if(packOne(true)){i++;later(step,260);}})();
        hint('🎉 נָכוֹן! '+boxesNeed+' '+I.boxes+' — בְּכָל אַחַת '+b+'!');
        api.solved();
      }else{
        inp.classList.remove('pk-ready');inp.classList.add('ans-err');
        api.wrong(v);
        if(!open){open=true;rootEl.classList.add('pk-open');sample.style.display='none';}
        hint(pile.children.length?'בּוֹאִי נֶאֱרֹז יַחַד: לַחֲצִי עַל הַ'+I.name+' וְסִפְרִי אֶת הַ'+I.boxes+' 💗':'סִפְרִי אֶת הַ'+I.boxes+' 💗');
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');}},1000);
      }
    }
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    later(()=>{inp.classList.add('pk-ready');try{inp.focus();}catch(e){}},350);

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TPK,
    modes:['pack','mx','mulc'],
    aidsReveal:'always',            // no host aid — the packing opens on a mistake (try-first)
    make(mode){return mode==='mx'?makePool(1):mode==='mulc'?makePool(2):mode==='pack'?makePool(6):[];},
    mount,
    ITEMS,
  };
})();
