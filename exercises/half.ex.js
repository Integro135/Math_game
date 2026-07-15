/* ── "כַּמָּה זֶה חֵצִי" — share EQUALLY between two friends (✂️➗) ──────────────
   The gentlest first taste of DIVISION: a tiny word problem — two girls have
   4 / 6 / 8 / 10 items, and they must share them EQUALLY (שָׁווֶה בְּשָׁווֶה).
   The child types how many EACH one gets (= n ÷ 2).

   • The items are drawn on screen as a row of emoji between the two friends.
   • TAPPING the items toggles the SPLIT: a golden line drops down the MIDDLE
     and the two halves part — each half slides toward its girl — so the child
     literally SEES the equal 2-way share and can count one side.
   • The split is a pure aid (tap to toggle). On a WRONG answer it opens by
     itself (the same "aid appears on a mistake" convention as perimeter's
     number line).

   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root; self-checks via api.solved()/api.wrong(). Mixed into the
   אַלּוּפָה (mulc) set; the 'hlf' handle is for the manual tester / direct
   setMode. Problem shape: { t:THF, n:total(4|6|8|10), a:n/2, item, itemName,
   names:[g1,g2] } — `a` carries the ANSWER so the host report is right. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.half=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  // item kinds (emoji + Hebrew plural, niqqud) and girl-pair names — rotated so
  // every problem reads like a fresh little story
  const ITEMS=[
    {e:'🍎',name:'תַּפּוּחִים'},
    {e:'🍪',name:'עוּגִיּוֹת'},
    {e:'🎈',name:'בַּלּוֹנִים'},
    {e:'🍓',name:'תּוּתִים'},
    {e:'🌸',name:'פְּרָחִים'},
    {e:'🍬',name:'סֻכָּרִיּוֹת'},
  ];
  const PAIRS=[['דָּנָה','נֹעָה'],['רוֹנִי','מַיָּה'],['תָּמָר','יָעֵל']];

  // one problem per n — every total is EVEN (4/6/8/10) so the share is exact
  function makePool(ns){
    const its=sh(ITEMS.slice());
    return sh(ns.slice()).map((n,i)=>{
      const it=its[i%its.length];
      return{t:THF,n,a:n/2,item:it.e,itemName:it.name,names:PAIRS[(Math.random()*PAIRS.length)|0]};
    });
  }

  const CSS=`
  .hf-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:20px;width:100%}
  .hf-q{font-family:'Fredoka One',cursive;font-size:1.25rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.5;min-height:1.4em;text-shadow:0 0 12px rgba(160,190,255,.35);padding:0 8px}
  .hf-q b{color:var(--skin-accent,#ffd27d)}
  /* the stage: girl · items · girl. LTR so the two halves map cleanly to sides */
  .hf-stage{direction:ltr;display:flex;align-items:center;justify-content:center;gap:16px;cursor:pointer;
    padding:12px 6px;border-radius:20px;transition:background .3s;user-select:none}
  .hf-stage:hover{background:rgba(255,255,255,.05)}
  .hf-kid{font-size:2.6rem;line-height:1;transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
  .hf-items{display:flex;align-items:center}
  /* pre-split the two halves must read as ONE continuous row: no horizontal
     padding, and the (transparent) 2px borders + the collapsed line's margins
     add up to exactly the 7px in-row gap */
  .hf-half{display:flex;align-items:center;gap:7px;padding:8px 0;border-radius:14px;
    border:2px dashed transparent;transition:transform .45s cubic-bezier(.34,1.56,.64,1),
      border-color .35s,background .35s,padding .45s}
  .hf-item{font-size:2rem;line-height:1;filter:drop-shadow(0 3px 5px rgba(0,0,0,.3))}
  /* the golden divider — zero-width until the split drops it down the middle */
  .hf-line{width:0;height:74px;border-radius:4px;margin:0 1.5px;align-self:center;
    background:linear-gradient(180deg,var(--skin-accent,#ffd27d),#ffb02e);
    box-shadow:0 0 14px var(--skin-accent,#ffd27d);
    transform:scaleY(0);transform-origin:center top;
    transition:transform .45s cubic-bezier(.3,1.3,.5,1),margin .45s,width .45s}
  .hf-root.hf-split .hf-line{transform:scaleY(1);width:5px;margin:0 12px}
  .hf-root.hf-split .hf-half{padding:8px 6px}
  .hf-root.hf-split .hf-half-a{transform:translateX(-8px);border-color:rgba(255,210,125,.55);background:rgba(255,255,255,.07)}
  .hf-root.hf-split .hf-half-b{transform:translateX(8px);border-color:rgba(255,210,125,.55);background:rgba(255,255,255,.07)}
  .hf-root.hf-split .hf-kid{transform:scale(1.15)}
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
    .hf-item{font-size:1.45rem}
    .hf-half{gap:4px}
    .hf-kid{font-size:2rem}
    .hf-line{height:56px;margin:0}   /* 2px+2px borders alone = the 4px gap */
    .hf-root.hf-split .hf-line{margin:0 8px}
    .hf-stage{gap:8px}
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
    const p=ctx.p||{n:8,a:4,item:'🍎',itemName:'תַּפּוּחִים',names:['דָּנָה','נֹעָה']};
    const n=p.n||((typeof ctx.a==='number'?ctx.a:4)*2);
    const half=n/2;
    const item=p.item||'🍎', itemName=p.itemName||'פְּרִיטִים';
    const names=p.names||['דָּנָה','נֹעָה'];
    const uid=++_uid;
    let done=false;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    const itemsHtml=c=>new Array(c).fill('<span class="hf-item">'+item+'</span>').join('');
    root.innerHTML=
      '<div class="hf-root" id="hf-root-'+uid+'">'+
        '<div class="hf-q" id="hf-q-'+uid+'">לְ<b>'+names[0]+'</b> וּלְ<b>'+names[1]+'</b> יֵשׁ <b>'+n+'</b> '+itemName+' '+item+
          ' — אֵיךְ הֵן יִתְחַלְּקוּ <b>שָׁווֶה בְּשָׁווֶה</b>?</div>'+
        '<div class="hf-stage" id="hf-stage-'+uid+'" role="button" aria-label="חַלְּקִי לִשְׁנַיִם">'+
          '<span class="hf-kid">👧🏻</span>'+
          '<div class="hf-items">'+
            '<div class="hf-half hf-half-a">'+itemsHtml(half)+'</div>'+
            '<div class="hf-line"></div>'+
            '<div class="hf-half hf-half-b">'+itemsHtml(half)+'</div>'+
          '</div>'+
          '<span class="hf-kid">👧🏽</span>'+
        '</div>'+
        '<div class="hf-tip">👆 לַחֲצִי עַל הַ'+itemName+' כְּדֵי לְחַלֵּק אוֹתָם לִשְׁנַיִם</div>'+
        '<div class="hf-ans-row">'+
          '<span class="hf-lbl">כַּמָּה תְּקַבֵּל כָּל אַחַת?</span>'+
          '<input class="ans-inp hf-inp" id="hf-ans-'+uid+'" type="text" inputmode="numeric" maxlength="2" aria-label="כַּמָּה כָּל אַחַת">'+
          '<button class="hf-btn" id="hf-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
        '</div>'+
      '</div>';

    const $=id=>root.querySelector('#'+id+'-'+uid);
    const rootEl=$('hf-root'),stage=$('hf-stage'),inp=$('hf-ans'),chk=$('hf-chk'),qEl=$('hf-q');
    hint('✂️ חַלְּקִי שָׁווֶה בְּשָׁווֶה בֵּין שְׁתֵּיהֶן — אֶפְשָׁר לִלְחֹץ עַל הַ'+itemName+'!');

    // tap the items → toggle the middle split line (the halves part visually)
    stage.addEventListener('click',()=>{if(!done)rootEl.classList.toggle('hf-split');});
    function forceSplit(){rootEl.classList.add('hf-split');}

    function check(){
      if(done)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){hint('כִּתְבִי כַּמָּה תְּקַבֵּל כָּל אַחַת 💗');return;}
      if(v===half){
        done=true;
        inp.classList.remove('hf-ready','ans-err');inp.classList.add('ans-ok');inp.disabled=true;chk.disabled=true;
        forceSplit();
        qEl.innerHTML='🎉 בְּדִיּוּק! כָּל אַחַת מְקַבֶּלֶת <b>'+half+'</b> '+itemName+' — כִּי חֵצִי מִ־<b>'+n+'</b> זֶה <b>'+half+'</b>!';
        hint('חֵצִי מִ־'+n+' = '+half+' ✂️ כָּל הַכָּבוֹד!');
        api.solved();
      }else{
        inp.classList.remove('hf-ready');inp.classList.add('ans-err');
        api.wrong(v);
        forceSplit();               // a mistake opens the split so she can COUNT one side
        hint(v>half?'יוֹתֵר מִדַּי — סִפְרִי רַק צַד אֶחָד שֶׁל הַקַּו 💗'
                   :'קְצָת יוֹתֵר — סִפְרִי רַק צַד אֶחָד שֶׁל הַקַּו 💗');
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');inp.focus();}},1000);
      }
    }
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    later(()=>{inp.classList.add('hf-ready');try{inp.focus();}catch(e){}},350);

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:THF,
    modes:['hlf','mulc'],
    aidsReveal:'always',            // no number line — the split-in-two picture IS the aid
    make(mode){return mode==='mulc'?makePool([4,6,8,10]):mode==='hlf'?makePool([4,6,8,10,6,8]):[];},
    mount,
  };
})();
