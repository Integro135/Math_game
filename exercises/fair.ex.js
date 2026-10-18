/* ── "זֶה הוֹגֵן?" — make the plates EQUAL (⚖️🍪) ─────────────────────────────
   Fair sharing from the other end: k friends (2 or 3) already HAVE plates, but
   the amounts are uneven — "זֶה לֹא הוֹגֵן!". She MOVES items between plates
   until everyone has the same, presses ✓, then says how many each one has.
   The total never changes, so what she builds is n ÷ k without ever seeing it.

   • Moving: tap an item (it lifts and glows), then tap another plate — it
     glides there. Tap the lifted item again to put it back down.
   • ✓ with plates still uneven = a mistake: from then on a COUNT badge sits
     under every plate (the try-first aid) and the hint asks who has more.
   • Plates equal → the moving locks and the question "כַּמָּה יֵשׁ בְּכָל צַלַּחַת?"
     appears; a wrong number is a mistake too.

   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root; self-checks via api.solved()/api.wrong(). Mixed into אַלּוּפָה
   (mulc); 'fair' is the manual-tester handle. Problem shape:
   { t:TFR, k, start:[uneven counts], a:the fair share (the ANSWER), item, itemName, names }. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.fair=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
  const rnd=(lo,hi)=>lo+((Math.random()*(hi-lo+1))|0);

  const ITEMS=[
    {e:'🍪',name:'עוּגִיּוֹת'},
    {e:'🍓',name:'תּוּתִים'},
    {e:'🍬',name:'סֻכָּרִיּוֹת'},
    {e:'🍒',name:'דֻּבְדְּבָנִים'},
    {e:'🧁',name:'עוּגוֹת'},
  ];
  const NAMES=['דָּנָה','נֹעָה','רוֹנִי','מַיָּה','תָּמָר','יָעֵל'];
  const KIDS=['👧🏻','👧🏽','👧🏼'];
  function namesStr(names){
    return names.map((nm,i)=>{const b='<b>'+nm+'</b>';return i===0?'לְ'+b:i===names.length-1?' וּלְ'+b:', לְ'+b;}).join('');   // "לְA, לְB וּלְC"
  }

  // uneven start: k plates, fair share m, the counts sum to k·m, at least 2 apart,
  // none empty and none holding more than the whole fair share twice over
  function makeOne(k,m,it){
    let c;
    do{ c=[];let left=k*m;for(let i=0;i<k-1;i++){const v=rnd(1,Math.min(2*m,left-(k-1-i)));c.push(v);left-=v;}c.push(left); }
    while(c.some(v=>v<1||v>2*m)||Math.max(...c)-Math.min(...c)<2);
    return{t:TFR,k,start:c,a:m,item:it.e,itemName:it.name,names:sh(NAMES.slice()).slice(0,k)};
  }
  function makePool(cnt){
    const its=sh(ITEMS.slice()),out=[];
    for(let i=0;i<cnt;i++){const k=i%2?3:2;out.push(makeOne(k,k===2?rnd(3,6):rnd(2,4),its[i%its.length]));}
    return sh(out);
  }

  const CSS=`
  .fr-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;--fr-isz:1.7rem}
  .fr-q{font-family:'Fredoka One',cursive;font-size:1.2rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.5;direction:rtl;padding:0 8px;text-shadow:0 0 12px rgba(160,190,255,.35)}
  .fr-q b{color:var(--skin-accent,#ffd27d)}
  .fr-plates{display:flex;justify-content:center;gap:14px;direction:rtl;width:100%}   /* the first-named friend on the RIGHT */
  .fr-col{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1 1 0;max-width:170px;min-width:0;cursor:pointer}
  .fr-root.fr-locked .fr-col{cursor:default}
  .fr-plate{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:4px;width:100%;min-height:96px;
    padding:10px 8px;border-radius:50% / 38%;background:radial-gradient(ellipse at 50% 38%,rgba(255,255,255,.28),rgba(255,255,255,.07) 72%);
    border:3px solid rgba(255,255,255,.45);box-shadow:0 5px 12px rgba(0,0,0,.22);transition:border-color .25s,background .25s}
  .fr-root.fr-sel .fr-col:not(.fr-from) .fr-plate{border-color:var(--skin-accent,#ffd27d);border-style:dashed}
  .fr-root.fr-ok .fr-plate{border-color:#5fd48a;background:radial-gradient(ellipse at 50% 38%,rgba(120,240,170,.3),rgba(95,212,138,.1) 72%)}
  .fr-it{font-size:var(--fr-isz);line-height:1;user-select:none;cursor:pointer;transition:transform .18s,filter .18s;
    filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))}
  .fr-root.fr-locked .fr-it{cursor:default}
  .fr-it.fr-lift{transform:translateY(-9px) scale(1.18);filter:drop-shadow(0 0 8px var(--skin-accent,#ffd27d)) drop-shadow(0 6px 6px rgba(0,0,0,.35))}
  .fr-kid{font-size:2rem;line-height:1}
  .fr-name{font-family:'Fredoka One',cursive;font-size:.95rem;color:var(--skin-text,#fff);opacity:.85}
  .fr-cnt{font-family:'Fredoka One',cursive;font-size:1.15rem;color:var(--skin-accent,#ffd27d);min-height:1.3rem;opacity:0;transition:opacity .3s}
  .fr-root.fr-counts .fr-cnt{opacity:1}
  .fr-fly{position:absolute;left:0;top:0;z-index:6;pointer-events:none;line-height:1;font-size:var(--fr-isz);
    transition:transform .34s cubic-bezier(.3,.9,.4,1)}
  .fr-pop{animation:frPop .28s cubic-bezier(.34,1.56,.64,1)}
  @keyframes frPop{from{transform:scale(.4)}to{transform:scale(1)}}
  .fr-ans-row{display:none;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;direction:rtl}
  .fr-root.fr-ok .fr-ans-row{display:flex}
  .fr-root.fr-ok .fr-fairbtn{display:none}
  .fr-lbl{font-family:'Fredoka One',cursive;font-size:1.15rem;color:var(--skin-text,#fff)}
  #colx-root .ans-inp.fr-inp{width:76px;height:60px;font-size:2.1rem;border-radius:14px;text-align:center}
  .fr-btn{font-family:'Fredoka One',cursive;font-size:1.2rem;border-radius:14px;padding:11px 24px;cursor:pointer;color:#fff;
    background:linear-gradient(160deg,#86E29B,#2FA257 85%);border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .fr-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .fr-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){ .fr-root{--fr-isz:1.35rem} .fr-plates{gap:7px} .fr-plate{min-height:80px;padding:8px 5px} .fr-kid{font-size:1.7rem} }`;
  function injectStyle(){
    if(document.getElementById('fr-style'))return;
    const st=document.createElement('style');st.id='fr-style';st.textContent=CSS;document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx, p=ctx.p||{};
    const start=(p.start&&p.start.length>=2)?p.start.slice():[5,1];
    const k=start.length, total=start.reduce((s,v)=>s+v,0), share=total/k;
    const item=p.item||'🍪', itemName=p.itemName||'עוּגִיּוֹת';
    let names=(p.names&&p.names.slice())||NAMES.slice();
    while(names.length<k)names.push(NAMES[names.length%NAMES.length]);
    names=names.slice(0,k);
    const uid=++_uid, timers=[];
    const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};
    let phase='move', sel=null, done=false;

    const itemHtml='<span class="fr-it">'+item+'</span>';
    root.innerHTML=
      '<div class="fr-root" id="fr-root-'+uid+'">'+
        '<div class="fr-q">'+namesStr(names)+' יֵשׁ '+itemName+' '+item+
          ' — אֲבָל זֶה <b>לֹא הוֹגֵן</b>! 😮 הַעֲבִירִי מִצַּלַּחַת לְצַלַּחַת עַד שֶׁלְּכֻלָּן יִהְיֶה <b>אוֹתוֹ מִסְפָּר</b>.</div>'+
        '<div class="fr-plates">'+start.map((c,i)=>
          '<div class="fr-col" data-i="'+i+'"><div class="fr-plate">'+new Array(c).fill(itemHtml).join('')+'</div>'+
          '<span class="fr-kid">'+KIDS[i]+'</span><span class="fr-name">'+names[i]+'</span><span class="fr-cnt"></span></div>').join('')+'</div>'+
        '<button class="fr-btn fr-fairbtn" id="fr-fair-'+uid+'">✓ עַכְשָׁו זֶה הוֹגֵן!</button>'+
        '<div class="fr-ans-row">'+
          '<span class="fr-lbl">כַּמָּה יֵשׁ עַכְשָׁו בְּכָל צַלַּחַת?</span>'+
          '<input class="ans-inp fr-inp" id="fr-ans-'+uid+'" type="text" inputmode="numeric" maxlength="2" aria-label="כַּמָּה בְּכָל צַלַּחַת">'+
          '<button class="fr-btn" id="fr-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
        '</div>'+
      '</div>';
    const $=id=>root.querySelector('#'+id+'-'+uid);
    const rootEl=$('fr-root'), fairBtn=$('fr-fair'), inp=$('fr-ans'), chk=$('fr-chk');
    const cols=[...root.querySelectorAll('.fr-col')], plates=cols.map(c=>c.querySelector('.fr-plate')), cnts=cols.map(c=>c.querySelector('.fr-cnt'));
    hint('⚖️ לַחֲצִי עַל '+item+' וְאָז עַל צַלַּחַת אַחֶרֶת כְּדֵי לְהַעֲבִיר');

    const counts=()=>plates.map(pl=>pl.children.length);
    function updateCounts(){counts().forEach((c,i)=>{cnts[i].textContent=c;});}
    function select(el){
      if(sel)sel.classList.remove('fr-lift');
      cols.forEach(c=>c.classList.remove('fr-from'));
      sel=el;
      if(el){el.classList.add('fr-lift');el.closest('.fr-col').classList.add('fr-from');}
      rootEl.classList.toggle('fr-sel',!!el);
    }
    // the lifted item glides to plate `to` (transform only)
    function moveTo(to){
      const el=sel;select(null);
      const host=rootEl.getBoundingClientRect(), r0=el.getBoundingClientRect();
      const real=document.createElement('span');real.className='fr-it';real.textContent=item;real.style.visibility='hidden';
      plates[to].appendChild(real);
      const r1=real.getBoundingClientRect();
      el.remove();
      const f=document.createElement('span');f.className='fr-fly';f.textContent=item;
      f.style.transform='translate('+(r0.left-host.left)+'px,'+(r0.top-host.top)+'px)';
      rootEl.appendChild(f);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transform='translate('+(r1.left-host.left)+'px,'+(r1.top-host.top)+'px)';}));
      later(()=>{f.remove();real.style.visibility='';real.classList.add('fr-pop');},360);
      updateCounts();
    }
    rootEl.addEventListener('click',e=>{
      if(phase!=='move')return;
      const it=e.target.closest('.fr-it'), col=e.target.closest('.fr-col');
      if(!col)return;
      const ci=+col.dataset.i;
      if(sel&&it===sel){select(null);return;}                                       // put it back down
      if(sel&&sel.closest('.fr-col')!==col){moveTo(ci);return;}                    // drop on another plate
      if(it)select(it);                                                            // lift (or switch)
    });

    function checkFair(){
      if(phase!=='move')return;
      select(null);
      const c=counts();
      if(c.every(v=>v===c[0])){
        phase='count';rootEl.classList.add('fr-ok','fr-locked');
        hint('🎉 עַכְשָׁו זֶה הוֹגֵן! כַּמָּה יֵשׁ בְּכָל צַלַּחַת?');
        later(()=>{try{inp.focus();}catch(e){}},200);
      }else{
        updateCounts();rootEl.classList.add('fr-counts');
        api.wrong(c.join('-'));
        const most=c.indexOf(Math.max(...c));
        hint('עֲדַיִן לֹא שָׁוֶה — לְ'+names[most]+' יֵשׁ הֲכִי הַרְבֵּה. הַעֲבִירִי מִמֶּנָּה 💗');
      }
    }
    function check(){
      if(phase!=='count'||done)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){hint('כִּתְבִי כַּמָּה יֵשׁ בְּכָל צַלַּחַת 💗');return;}
      if(v===share){
        done=true;phase='done';
        inp.classList.remove('ans-err');inp.classList.add('ans-ok');inp.disabled=true;chk.disabled=true;
        updateCounts();rootEl.classList.add('fr-counts');
        hint('🎉 נָכוֹן! לְכָל אַחַת '+share+' '+itemName+' — עַכְשָׁו זֶה הוֹגֵן!');
        api.solved();
      }else{
        inp.classList.add('ans-err');api.wrong(v);
        updateCounts();rootEl.classList.add('fr-counts');
        hint('סִפְרִי צַלַּחַת אַחַת 💗');
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');}},1000);
      }
    }
    fairBtn.addEventListener('click',checkFair);
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TFR,
    modes:['fair','mx','mulc'],
    aidsReveal:'always',            // no host aid — count badges appear after a mistake
    make(mode){return mode==='mx'?makePool(1):mode==='mulc'?makePool(2):mode==='fair'?makePool(6):[];},
    mount,
  };
})();
