/* ── "חִלּוּק שָׁווֶה בְּשָׁווֶה" — share EQUALLY among 2 OR 3 friends (✂️➗) ───────
   The gentlest first taste of DIVISION: a tiny word problem — a few friends have
   some items and must share them EQUALLY (שָׁווֶה בְּשָׁווֶה). The child types how
   many EACH one gets (= n ÷ k, where k is 2 or 3).

   • The items are drawn on screen as ONE row, grouped into k equal groups; a row
     of k kid emojis sits above them.
   • TAPPING the items toggles the SPLIT: golden lines drop between the groups and
     each group parts + highlights — so the child literally SEES the equal k-way
     share and can count one group.
   • The split is a pure aid (tap to toggle). On a WRONG answer it opens by
     itself (the same "aid appears on a mistake" convention as perimeter's
     number line).

   Totals reach up to 16 (user request): ÷2 uses EVEN totals 8..16, ÷3 uses the
   multiples of three 6..15 — every total divides EXACTLY by its k so the share
   is a whole number.

   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root; self-checks via api.solved()/api.wrong(). Mixed into the
   אַלּוּפָה (mulc) set; the 'hlf' handle is for the manual tester / direct
   setMode. Problem shape: { t:THF, n:total, k:parts(2|3), a:n/k, item, itemName,
   names:[…k names] } — `a` carries the ANSWER so the host report is right. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.half=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  // item kinds (emoji + Hebrew plural, niqqud), girl names + kid emojis — rotated
  // so every problem reads like a fresh little story
  const ITEMS=[
    {e:'🍎',name:'תַּפּוּחִים'},
    {e:'🍪',name:'עוּגִיּוֹת'},
    {e:'🎈',name:'בַּלּוֹנִים'},
    {e:'🍓',name:'תּוּתִים'},
    {e:'🌸',name:'פְּרָחִים'},
    {e:'🍬',name:'סֻכָּרִיּוֹת'},
  ];
  const NAMES=['דָּנָה','נֹעָה','רוֹנִי','מַיָּה','תָּמָר','יָעֵל'];
  const KIDS=['👧🏻','👧🏽','👧🏼','👧🏾'];

  // "לְA", "לְA וּלְB", "לְA, לְB וּלְC" … — Hebrew list of the friends (bolded)
  function namesStr(names){
    return names.map((nm,i)=>{
      const b='<b>'+nm+'</b>';
      if(i===0)return 'לְ'+b;
      if(i===names.length-1)return ' וּלְ'+b;
      return ', לְ'+b;
    }).join('');
  }

  // one problem per {n,k} spec — every total divides exactly by k (whole share)
  function makePool(specs){
    const its=sh(ITEMS.slice());
    return sh(specs.slice()).map((sp,i)=>{
      const it=its[i%its.length];
      return{t:THF,n:sp.n,k:sp.k,a:sp.n/sp.k,item:it.e,itemName:it.name,names:sh(NAMES.slice()).slice(0,sp.k)};
    });
  }

  const CSS=`
  .hf-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;
    --hf-isz:2rem;--hf-ksz:2.4rem;--hf-gap:7px;--hf-kgap:26px}
  .hf-q{font-family:'Fredoka One',cursive;font-size:1.25rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.5;min-height:1.4em;text-shadow:0 0 12px rgba(160,190,255,.35);padding:0 8px}
  .hf-q b{color:var(--skin-accent,#ffd27d)}
  /* the stage: a KIDS row above, an ITEMS row (k groups split by k-1 lines) below.
     LTR so the groups read left→right. */
  .hf-stage{direction:ltr;display:flex;flex-direction:column;align-items:center;gap:14px;cursor:pointer;
    padding:12px 6px;border-radius:20px;transition:background .3s;user-select:none}
  .hf-stage:hover{background:rgba(255,255,255,.05)}
  .hf-kids{display:flex;align-items:flex-end;justify-content:center;gap:var(--hf-kgap,26px)}
  /* item/kid/gap sizes ride CSS vars so the JS auto-fit (mount) can shrink them
     when many items (up to 16) would overflow the card — desktop keeps full size */
  .hf-kid{font-size:var(--hf-ksz,2.4rem);line-height:1;transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
  .hf-items{display:flex;align-items:center;justify-content:center}
  /* pre-split the k groups must read as ONE continuous row: no horizontal padding,
     and the (transparent) 2px borders + the collapsed lines' margins add up to
     exactly the 7px in-row gap */
  /* PERF: the split animates ONLY transform + paint (border/background) — NEVER a
     layout property (no width/margin/padding transition) — so it never reflows the
     row per frame and stays smooth even over the busy unicorn scene. */
  .hf-grp{display:flex;align-items:center;gap:var(--hf-gap,7px);padding:8px 0;border-radius:14px;
    border:2px dashed transparent;will-change:transform;
    transition:transform .45s cubic-bezier(.34,1.56,.64,1),border-color .35s,background .35s}
  .hf-item{font-size:var(--hf-isz,2rem);line-height:1;filter:drop-shadow(0 3px 5px rgba(0,0,0,.3))}
  /* the divider keeps a ZERO-width LAYOUT box (so the pre-split row stays exactly
     continuous). The visible golden bar is an absolutely-positioned ::before that
     only scaleY's in; the line translateX-centres itself in the widened gap. */
  .hf-line{position:relative;width:0;height:70px;margin:0 1.5px;align-self:center;
    will-change:transform;transform:translateX(0);
    transition:transform .45s cubic-bezier(.3,1.3,.5,1)}
  .hf-line::before{content:'';position:absolute;left:50%;top:50%;width:5px;height:70px;border-radius:4px;
    background:linear-gradient(180deg,var(--skin-accent,#ffd27d),#ffb02e);
    box-shadow:0 0 14px var(--skin-accent,#ffd27d);transform-origin:center;
    transform:translate(-50%,-50%) scaleY(0);
    transition:transform .45s cubic-bezier(.3,1.3,.5,1);pointer-events:none}
  .hf-root.hf-split .hf-line{transform:translateX(var(--ltx,0))}
  .hf-root.hf-split .hf-line::before{transform:translate(-50%,-50%) scaleY(1)}
  .hf-root.hf-split .hf-grp{transform:translateX(var(--gtx,0));border-color:rgba(255,210,125,.55);background:rgba(255,255,255,.07)}
  .hf-root.hf-split .hf-kid{transform:scale(1.12)}
  .hf-tip{font-family:'Fredoka One',cursive;font-size:.95rem;color:var(--skin-text,#fff);opacity:.75;
    display:flex;align-items:center;gap:6px;transition:opacity .3s}
  .hf-root.hf-split .hf-tip{opacity:0}
  /* rtl: the host .equation forces ltr — rtl puts the Hebrew label RIGHT of the input */
  .hf-ans-row{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;direction:rtl}
  .hf-lbl{font-family:'Fredoka One',cursive;font-size:1.2rem;color:var(--skin-text,#fff)}
  #colx-root .ans-inp.hf-inp{width:76px;height:60px;font-size:2.1rem;border-radius:14px;text-align:center}
  #colx-root .hf-inp.hf-ready{animation:hfReady 1s ease-in-out infinite alternate}
  @keyframes hfReady{from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  .hf-btn{font-family:'Fredoka One',cursive;font-size:1.2rem;border:0;border-radius:14px;padding:11px 24px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .hf-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .hf-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){
    .hf-root{--hf-isz:1.45rem;--hf-ksz:1.9rem;--hf-gap:4px;--hf-kgap:16px}
    .hf-line{height:54px;margin:0}   /* 2px+2px borders alone = the 4px gap */
    .hf-line::before{height:54px}
  }`;
  function injectStyle(){
    if(document.getElementById('hf-style'))return;
    const st=document.createElement('style');st.id='hf-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{};
    const n=p.n||8;
    const k=p.k||2;
    const per=n/k;                                     // how many EACH friend gets
    const item=p.item||'🍎', itemName=p.itemName||'פְּרִיטִים';
    let names=(p.names&&p.names.slice())||NAMES.slice();
    while(names.length<k)names.push(NAMES[names.length%NAMES.length]);
    names=names.slice(0,k);
    const fracWord=k===2?'חֵצִי':k===3?'שְׁלִישׁ':'חֵלֶק';   // half / a third
    const uid=++_uid;
    let done=false;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    const kidsHtml=KIDS.slice(0,k).map(e=>'<span class="hf-kid">'+e+'</span>').join('');
    // k groups of `per` items, separated by k-1 golden divider lines. The split
    // spreads the groups apart PURELY via transform:translateX (no layout) — each
    // group/line carries its symmetric offset as a CSS var (--gtx / --ltx).
    const SEP=28;                                   // px of extra gap opened per boundary
    const gOff=i=>Math.round((i-(k-1)/2)*SEP);      // group i slides symmetrically from centre
    const lOff=j=>Math.round((j+0.5-(k-1)/2)*SEP);  // divider j sits in the middle of its gap
    let groupsHtml='';
    for(let g=0;g<k;g++){
      groupsHtml+='<div class="hf-grp" style="--gtx:'+gOff(g)+'px">'+new Array(per).fill('<span class="hf-item">'+item+'</span>').join('')+'</div>';
      if(g<k-1)groupsHtml+='<div class="hf-line" style="--ltx:'+lOff(g)+'px"></div>';
    }
    root.innerHTML=
      '<div class="hf-root" id="hf-root-'+uid+'">'+
        '<div class="hf-q" id="hf-q-'+uid+'">'+namesStr(names)+' יֵשׁ <b>'+n+'</b> '+itemName+' '+item+
          ' — אֵיךְ הֵן יִתְחַלְּקוּ <b>שָׁווֶה בְּשָׁווֶה</b>?</div>'+
        '<div class="hf-stage" id="hf-stage-'+uid+'" role="button" aria-label="חַלְּקִי שָׁווֶה בְּשָׁווֶה">'+
          '<div class="hf-kids">'+kidsHtml+'</div>'+
          '<div class="hf-items">'+groupsHtml+'</div>'+
        '</div>'+
        '<div class="hf-tip">👆 לַחֲצִי עַל הַ'+itemName+' כְּדֵי לְחַלֵּק אוֹתָם</div>'+
        '<div class="hf-ans-row">'+
          '<span class="hf-lbl">כַּמָּה תְּקַבֵּל כָּל אַחַת?</span>'+
          '<input class="ans-inp hf-inp" id="hf-ans-'+uid+'" type="text" inputmode="numeric" maxlength="2" aria-label="כַּמָּה כָּל אַחַת">'+
          '<button class="hf-btn" id="hf-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
        '</div>'+
      '</div>';

    const $=id=>root.querySelector('#'+id+'-'+uid);
    const rootEl=$('hf-root'),stage=$('hf-stage'),inp=$('hf-ans'),chk=$('hf-chk'),qEl=$('hf-q');
    const itemsEl=stage.querySelector('.hf-items');
    hint('✂️ חַלְּקוּ שָׁווֶה בְּשָׁווֶה בֵּין כֻּלָּן — אֶפְשָׁר לִלְחֹץ עַל הַ'+itemName+'!');

    // AUTO-FIT: the items live in ONE non-wrapping row (the k groups must stay
    // side by side around the divider lines). With many items (up to 16) that row
    // can be wider than the CARD on small screens — and since #colx-root/.equation
    // have no width cap they'd just expand and overflow. So measure the CARD's
    // stable inner width and shrink the emoji/kid/gap CSS vars until the row fits.
    // We RESET the vars first (recomputes from the CSS base, incl. the ≤480px block
    // after a resize) and only ever go SMALLER. The loop measures the REAL rendered
    // width each step, so it's correct regardless of glyph width or font timing.
    const cardEl=document.getElementById('card');
    function fitRow(){
      rootEl.style.removeProperty('--hf-isz');
      rootEl.style.removeProperty('--hf-gap');
      rootEl.style.removeProperty('--hf-ksz');
      const box=cardEl||rootEl, cs=getComputedStyle(box);
      // RESERVE the extra width the SPLIT state adds (each of the k groups gains
      // ~12px padding, and each of the k-1 dividers grows to width+margins ~26px)
      // so the row still fits the card AFTER a tap / on solve.
      const SPLIT_RESERVE=26*(k-1)+12*k+8;
      const avail=box.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-6-SPLIT_RESERVE;
      let isz=parseFloat(getComputedStyle(itemsEl.querySelector('.hf-item')).fontSize);
      let guard=0;
      while(itemsEl.scrollWidth>avail && isz>9 && guard++<90){
        isz-=1;
        rootEl.style.setProperty('--hf-isz',isz+'px');
        rootEl.style.setProperty('--hf-gap',Math.max(1,Math.round(isz*0.14))+'px');
        rootEl.style.setProperty('--hf-ksz',Math.round(isz*1.4)+'px');  // kids stay a touch bigger than items
      }
    }
    requestAnimationFrame(fitRow);
    later(fitRow,180);          // re-fit once fonts/layout settle (only shrinks)
    let rzT=0;const onResize=()=>{clearTimeout(rzT);rzT=setTimeout(fitRow,120);};
    window.addEventListener('resize',onResize);

    // tap the items → toggle the split (the groups part, dividers drop between them)
    stage.addEventListener('click',()=>{if(!done)rootEl.classList.toggle('hf-split');});
    function forceSplit(){rootEl.classList.add('hf-split');}

    function check(){
      if(done)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){hint('כִּתְבִי כַּמָּה תְּקַבֵּל כָּל אַחַת 💗');return;}
      if(v===per){
        done=true;
        inp.classList.remove('hf-ready','ans-err');inp.classList.add('ans-ok');inp.disabled=true;chk.disabled=true;
        forceSplit();
        qEl.innerHTML='🎉 בְּדִיּוּק! כָּל אַחַת מְקַבֶּלֶת <b>'+per+'</b> '+itemName+' — כִּי '+fracWord+' מִ־<b>'+n+'</b> זֶה <b>'+per+'</b>!';
        hint(fracWord+' מִ־'+n+' = '+per+' ✂️ כָּל הַכָּבוֹד!');
        api.solved();
      }else{
        inp.classList.remove('hf-ready');inp.classList.add('ans-err');
        api.wrong(v);
        forceSplit();               // a mistake opens the split so she can COUNT one group
        hint(v>per?'יוֹתֵר מִדַּי — סִפְרִי רַק קְבוּצָה אַחַת 💗'
                   :'קְצָת יוֹתֵר — סִפְרִי רַק קְבוּצָה אַחַת 💗');
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');inp.focus();}},1000);
      }
    }
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    later(()=>{inp.classList.add('hf-ready');try{inp.focus();}catch(e){}},350);

    return function cleanup(){window.removeEventListener('resize',onResize);clearTimeout(rzT);timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:THF,
    modes:['hlf','mulc'],
    aidsReveal:'always',            // no number line — the split-into-groups picture IS the aid
    make(mode){
      // ÷2 uses even totals 8..16; ÷3 uses the multiples of three 6..15. mulc gets
      // a guaranteed MIX (3 of each), the 'hlf' tester gets a larger mix.
      const two=[8,10,12,14,16].map(n=>({n,k:2}));
      const three=[6,9,12,15].map(n=>({n,k:3}));
      return mode==='mulc'?makePool(sh(two).slice(0,3).concat(sh(three).slice(0,3)))
            :mode==='hlf'?makePool(sh(two).slice(0,4).concat(sh(three).slice(0,4)))
            :[];
    },
    mount,
  };
})();
