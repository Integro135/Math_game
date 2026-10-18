/* ── "חֲלֻקָּה בְּתוֹרוֹת" — share by DEALING, one at a time, in turns (🃏) ─────────
   Division the way children really share: "one for you, one for you, one for
   you…" until nothing is left. k friends (2..4) and a pile of n = k·m items.

   • Every tap on an item in the pile DEALS it — it glides to the plate of the
     friend whose TURN it is, and the turn moves on (a bouncing ⬇ marks who is
     next), round and round. The child does the sharing herself; nothing is
     pre-grouped.
   • When the pile is empty she counts ONE plate and types how many EACH got.
     She may also answer earlier, in her head — a right answer deals the rest by
     itself as the celebration.
   • Try-first: the plates carry no numbers. A WRONG answer adds a count badge
     under every plate (once everything is dealt), or asks her to deal it all
     first.

   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root; self-checks via api.solved()/api.wrong(). Mixed into אַלּוּפָה
   (mulc); 'deal' is the manual-tester handle. Problem shape:
   { t:TDL, n:total, k:friends, a:n/k, item, itemName, names:[…k] } — `a` is the
   ANSWER so the host report is right. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.deal=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  const ITEMS=[
    {e:'🍓',name:'תּוּתִים'},
    {e:'🍪',name:'עוּגִיּוֹת'},
    {e:'🍬',name:'סֻכָּרִיּוֹת'},
    {e:'🎈',name:'בַּלּוֹנִים'},
    {e:'🍒',name:'דֻּבְדְּבָנִים'},
    {e:'🌸',name:'פְּרָחִים'},
  ];
  const NAMES=['דָּנָה','נֹעָה','רוֹנִי','מַיָּה','תָּמָר','יָעֵל'];
  const KIDS=['👧🏻','👧🏽','👧🏼','👧🏾'];

  // "לְA וּלְB", "לְA, לְB וּלְC" — the friends, bolded
  function namesStr(names){
    return names.map((nm,i)=>{const b='<b>'+nm+'</b>';return i===0?'לְ'+b:i===names.length-1?' וּלְ'+b:', לְ'+b;}).join('');
  }

  // every (k, m) with a whole share: 2 friends × 3..6, 3 × 2..5, 4 × 2..4 (≤ 16 items)
  const SPECS=[];
  for(let m=3;m<=6;m++)SPECS.push({k:2,m});
  for(let m=2;m<=5;m++)SPECS.push({k:3,m});
  for(let m=2;m<=4;m++)SPECS.push({k:4,m});
  function makePool(cnt){
    // one card per friend-count first, so a pool always MIXES 2, 3 and 4 friends
    const byK=[2,3,4].map(k=>sh(SPECS.filter(s=>s.k===k)));
    const picks=[];for(let i=0;picks.length<cnt;i++){const L=byK[i%3];if(L.length)picks.push(L.shift());if(i>40)break;}
    const its=sh(ITEMS.slice());
    return sh(picks).map((sp,i)=>{const it=its[i%its.length];
      return{t:TDL,n:sp.k*sp.m,k:sp.k,a:sp.m,item:it.e,itemName:it.name,names:sh(NAMES.slice()).slice(0,sp.k)};});
  }

  const CSS=`
  .dl-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;--dl-isz:1.9rem}
  .dl-q{font-family:'Fredoka One',cursive;font-size:1.2rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.5;direction:rtl;padding:0 8px;text-shadow:0 0 12px rgba(160,190,255,.35)}
  .dl-q b{color:var(--skin-accent,#ffd27d)}
  .dl-pile{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;max-width:440px;min-height:2.6rem;
    padding:8px 12px;border-radius:18px;background:rgba(255,255,255,.07);direction:ltr}
  .dl-pile:empty::after{content:'✔';font-size:1.4rem;color:#7be3a0;opacity:.7}
  .dl-it{font-size:var(--dl-isz);line-height:1;cursor:pointer;user-select:none;transition:transform .15s;
    filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))}
  .dl-it:hover{transform:translateY(-3px) scale(1.08)}
  .dl-friends{display:flex;justify-content:center;gap:12px;direction:rtl;flex-wrap:nowrap;width:100%}
  .dl-fr{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1 1 0;max-width:120px;min-width:0}
  .dl-arrow{height:1.2rem;font-size:1.1rem;line-height:1;opacity:0}
  .dl-fr.dl-turn .dl-arrow{opacity:1;animation:dlBob .7s ease-in-out infinite alternate}
  @keyframes dlBob{from{transform:translateY(-3px)}to{transform:translateY(3px)}}
  .dl-kid{font-size:2.1rem;line-height:1;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
  .dl-fr.dl-turn .dl-kid{transform:scale(1.15)}
  .dl-name{font-family:'Fredoka One',cursive;font-size:.95rem;color:var(--skin-text,#fff);opacity:.85}
  .dl-plate{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:3px;width:100%;min-height:58px;
    padding:8px 6px;border-radius:50% / 40%;background:radial-gradient(ellipse at 50% 38%,rgba(255,255,255,.28),rgba(255,255,255,.07) 72%);
    border:3px solid rgba(255,255,255,.45);box-shadow:0 5px 12px rgba(0,0,0,.22);transition:border-color .3s}
  .dl-fr.dl-turn .dl-plate{border-color:var(--skin-accent,#ffd27d)}
  .dl-plate .dl-it{cursor:default;font-size:calc(var(--dl-isz) * .78)}
  .dl-plate .dl-it:hover{transform:none}
  .dl-pop{animation:dlPop .3s cubic-bezier(.34,1.56,.64,1)}
  @keyframes dlPop{from{transform:scale(.4)}to{transform:scale(1)}}
  .dl-cnt{font-family:'Fredoka One',cursive;font-size:1.1rem;color:var(--skin-accent,#ffd27d);min-height:1.3rem;opacity:0;transition:opacity .3s}
  .dl-root.dl-counts .dl-cnt{opacity:1}
  .dl-fly{position:absolute;left:0;top:0;z-index:6;pointer-events:none;line-height:1;font-size:var(--dl-isz);
    transition:transform .38s cubic-bezier(.3,.9,.4,1)}
  .dl-ans-row{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;direction:rtl}
  .dl-lbl{font-family:'Fredoka One',cursive;font-size:1.15rem;color:var(--skin-text,#fff)}
  #colx-root .ans-inp.dl-inp{width:76px;height:60px;font-size:2.1rem;border-radius:14px;text-align:center}
  #colx-root .dl-inp.dl-ready{animation:dlReady 1s ease-in-out infinite alternate}
  @keyframes dlReady{from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  .dl-btn{font-family:'Fredoka One',cursive;font-size:1.2rem;border-radius:14px;padding:11px 24px;cursor:pointer;color:#fff;
    background:linear-gradient(160deg,#86E29B,#2FA257 85%);border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .dl-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .dl-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){
    .dl-root{--dl-isz:1.5rem}
    .dl-kid{font-size:1.7rem}
    .dl-friends{gap:6px}
    .dl-plate{min-height:48px;padding:6px 4px}
  }`;
  function injectStyle(){
    if(document.getElementById('dl-style'))return;
    const st=document.createElement('style');st.id='dl-style';st.textContent=CSS;document.head.appendChild(st);
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
    const k=Math.max(2,Math.min(4,p.k||3)), n=p.n||k*3, per=n/k;
    const item=p.item||'🍓', itemName=p.itemName||'תּוּתִים';
    let names=(p.names&&p.names.slice())||NAMES.slice();
    while(names.length<k)names.push(NAMES[names.length%NAMES.length]);
    names=names.slice(0,k);
    const uid=++_uid, timers=[];
    const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};
    let done=false, turn=0, missed=false;

    const itemHtml='<span class="dl-it">'+item+'</span>';
    root.innerHTML=
      '<div class="dl-root" id="dl-root-'+uid+'">'+
        '<div class="dl-q">'+namesStr(names)+' יֵשׁ <b>'+n+'</b> '+itemName+' '+item+
          ' — חַלְּקִי לָהֶן <b>בְּתוֹרוֹת</b>: אַחַת לְכָל אַחַת, וְשׁוּב מֵהַהַתְחָלָה!</div>'+
        '<div class="dl-pile" id="dl-pile-'+uid+'">'+new Array(n).fill(itemHtml).join('')+'</div>'+
        '<div class="dl-friends">'+names.map((nm,i)=>
          '<div class="dl-fr" data-i="'+i+'"><span class="dl-arrow">⬇️</span><span class="dl-kid">'+KIDS[i]+'</span>'+
          '<span class="dl-name">'+nm+'</span><div class="dl-plate"></div><span class="dl-cnt"></span></div>').join('')+'</div>'+
        '<div class="dl-ans-row">'+
          '<span class="dl-lbl">כַּמָּה קִבְּלָה כָּל אַחַת?</span>'+
          '<input class="ans-inp dl-inp" id="dl-ans-'+uid+'" type="text" inputmode="numeric" maxlength="2" aria-label="כַּמָּה כָּל אַחַת">'+
          '<button class="dl-btn" id="dl-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
        '</div>'+
      '</div>';
    const $=id=>root.querySelector('#'+id+'-'+uid);
    const rootEl=$('dl-root'), pile=$('dl-pile'), inp=$('dl-ans'), chk=$('dl-chk');
    const frs=[...root.querySelectorAll('.dl-fr')], plates=frs.map(f=>f.querySelector('.dl-plate')), cnts=frs.map(f=>f.querySelector('.dl-cnt'));
    hint('🃏 לַחֲצִי עַל הַ'+itemName+' — כָּל לְחִיצָה נוֹתֶנֶת אַחַת לְמִי שֶׁבַּתּוֹר');

    requestAnimationFrame(()=>balanceRows(pile,n,8));
    function showTurn(){frs.forEach((f,i)=>f.classList.toggle('dl-turn',!done&&pile.children.length>0&&i===turn));}
    function updateCounts(){plates.forEach((pl,i)=>{cnts[i].textContent=pl.children.length;});}
    // one item glides from the pile to the plate of whoever's turn it is (transform only)
    function dealOne(el,quick){
      if(!el||el.parentNode!==pile)return;
      const fr=turn; turn=(turn+1)%k;
      const host=rootEl.getBoundingClientRect(), r0=el.getBoundingClientRect();
      const real=document.createElement('span');real.className='dl-it';real.textContent=item;real.style.visibility='hidden';
      plates[fr].appendChild(real);
      const r1=real.getBoundingClientRect();
      el.remove();
      const f=document.createElement('span');f.className='dl-fly';f.textContent=item;
      f.style.transform='translate('+(r0.left-host.left)+'px,'+(r0.top-host.top)+'px)';
      rootEl.appendChild(f);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transform='translate('+(r1.left-host.left)+'px,'+(r1.top-host.top)+'px) scale(.8)';}));
      later(()=>{f.remove();real.style.visibility='';real.classList.add('dl-pop');updateCounts();},quick?260:390);
      showTurn();
      if(!pile.children.length&&!done){
        hint(missed?'סִפְרִי כַּמָּה יֵשׁ בְּצַלַּחַת אַחַת 💗':'🎉 חִלַּקְתְּ הַכֹּל! עַכְשָׁו סִפְרִי — כַּמָּה קִבְּלָה כָּל אַחַת?');
        if(missed)later(()=>rootEl.classList.add('dl-counts'),400);
        try{inp.focus();}catch(e){}
      }
    }
    pile.addEventListener('click',e=>{if(done)return;const el=e.target.closest('.dl-it');if(el)dealOne(el);});

    function check(){
      if(done)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){hint('כִּתְבִי כַּמָּה קִבְּלָה כָּל אַחַת 💗');return;}
      if(v===per){
        done=true;showTurn();
        inp.classList.remove('dl-ready','ans-err');inp.classList.add('ans-ok');inp.disabled=true;chk.disabled=true;
        // answered in her head before the pile was empty → the rest deals itself
        const rest=[...pile.children];rest.forEach((el,i)=>later(()=>dealOne(el,true),i*120));
        later(()=>{updateCounts();rootEl.classList.add('dl-counts');},rest.length*120+350);
        hint('🎉 נָכוֹן! כָּל אַחַת קִבְּלָה '+per+' '+itemName+' — כָּל הַכָּבוֹד!');
        api.solved();
      }else{
        missed=true;
        inp.classList.remove('dl-ready');inp.classList.add('ans-err');
        api.wrong(v);
        if(pile.children.length)hint('חַלְּקִי אֶת כֻּלָּם בְּתוֹרוֹת, וְאָז סִפְרִי צַלַּחַת אַחַת 💗');
        else{updateCounts();rootEl.classList.add('dl-counts');hint('סִפְרִי כַּמָּה יֵשׁ בְּצַלַּחַת אַחַת 💗');}
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');}},1000);
      }
    }
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    showTurn();
    later(()=>inp.classList.add('dl-ready'),350);

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TDL,
    modes:['deal','mx','mulc'],
    aidsReveal:'always',            // no host aid — the dealing IS the manipulative
    make(mode){return mode==='mx'?makePool(1):mode==='mulc'?makePool(2):mode==='deal'?makePool(6):[];},
    mount,
  };
})();
