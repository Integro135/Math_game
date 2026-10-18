/* ── "אֶפְשָׁר לְחַלֵּק?" — can it be shared EQUALLY, with nothing left? (🤔) ────────
   A yes / no question that prepares the ground for remainders and for even /
   odd: "can 2 friends share 9 sweets equally, with nothing left over?"

   • The n items show as ONE unbroken row (no grouping — that would answer it)
     with the k friends above. She SELECTS כֵּן or לֹא, then ✓ submits (the same
     select → ✓ rhythm as the reading kinds).
   • Whichever way it goes, the answer is SHOWN: the row deals itself into the k
     equal groups, and a leftover, if any, sits apart in a red ring —
     "נִשְׁאַר 1". Wrong → a mistake is logged, the picture stays, and she picks
     again (a binary question, so the second pick is partial points).
   • The deck is balanced: about half the cards divide exactly.

   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root; self-checks via api.solved()/api.wrong(). Mixed into אַלּוּפָה
   (mulc); 'cansh' is the manual-tester handle. Problem shape:
   { t:TCN, n, k, a:1 (yes, n%k===0) | 2 (no), item, itemName }. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.can_share=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  const ITEMS=[
    {e:'🍬',name:'סֻכָּרִיּוֹת'},
    {e:'🍎',name:'תַּפּוּחִים'},
    {e:'🎈',name:'בַּלּוֹנִים'},
    {e:'🍪',name:'עוּגִיּוֹת'},
    {e:'🌸',name:'פְּרָחִים'},
    {e:'⭐',name:'כּוֹכָבִים'},
  ];
  const KIDS=['👧🏻','👧🏽','👧🏼'];

  // 2 friends: totals 5..14; 3 friends: 6..14 — split into the ones that divide and the ones that don't
  const YES=[],NO=[];
  for(let n=5;n<=14;n++)(n%2?NO:YES).push({n,k:2});
  for(let n=6;n<=14;n++)(n%3?NO:YES).push({n,k:3});
  function makePool(cnt){
    const ys=sh(YES.slice()),ns=sh(NO.slice()),its=sh(ITEMS.slice()),out=[];
    const yesFirst=Math.random()<0.5;
    for(let i=0;i<cnt;i++){const s=((i%2===0)===yesFirst?ys:ns).pop();const it=its[i%its.length];
      out.push({t:TCN,n:s.n,k:s.k,a:s.n%s.k?2:1,item:it.e,itemName:it.name});}
    return sh(out);
  }

  const CSS=`
  .cn-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;--cn-isz:1.8rem}
  .cn-q{font-family:'Fredoka One',cursive;font-size:1.2rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.5;direction:rtl;padding:0 8px;text-shadow:0 0 12px rgba(160,190,255,.35)}
  .cn-q b{color:var(--skin-accent,#ffd27d)}
  .cn-kids{display:flex;gap:22px;justify-content:center;font-size:2.1rem;line-height:1}
  .cn-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;max-width:480px;direction:ltr;min-height:2.6rem}
  .cn-it{font-size:var(--cn-isz);line-height:1;user-select:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))}
  .cn-grp{display:inline-flex;gap:4px;padding:6px 8px;border-radius:14px;border:2px dashed rgba(255,210,125,.6);
    background:rgba(255,255,255,.07);animation:cnIn .35s cubic-bezier(.34,1.56,.64,1)}
  .cn-left{display:inline-flex;gap:4px;padding:6px 8px;border-radius:50%;border:3px solid #ff6b81;
    box-shadow:0 0 12px rgba(255,107,129,.7);animation:cnIn .35s cubic-bezier(.34,1.56,.64,1)}
  .cn-note{font-family:'Fredoka One',cursive;font-size:1.05rem;color:var(--skin-accent,#ffd27d);min-height:1.4rem;direction:rtl;text-align:center}
  @keyframes cnIn{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
  .cn-opts{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;direction:rtl}
  .cn-opt{font-family:'Fredoka One',cursive;font-size:1.15rem;padding:11px 20px;border-radius:16px;cursor:pointer;
    color:var(--skin-text,#fff);background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.4);transition:transform .15s,border-color .2s,background .2s}
  .cn-opt:hover{transform:translateY(-2px)}
  .cn-opt.cn-on{border-color:var(--skin-accent,#ffd27d);background:rgba(255,210,125,.22);box-shadow:0 0 12px rgba(255,210,125,.45)}
  .cn-opt.cn-bad{border-color:#ff6b81;opacity:.55;cursor:default}
  .cn-opt.cn-good{border-color:#5fd48a;background:rgba(95,212,138,.25)}
  .cn-btn{font-family:'Fredoka One',cursive;font-size:1.2rem;border-radius:14px;padding:11px 26px;cursor:pointer;color:#fff;
    background:linear-gradient(160deg,#86E29B,#2FA257 85%);border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .cn-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .cn-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){ .cn-root{--cn-isz:1.4rem} .cn-kids{font-size:1.8rem;gap:14px} }`;
  function injectStyle(){
    if(document.getElementById('cn-style'))return;
    const st=document.createElement('style');st.id='cn-style';st.textContent=CSS;document.head.appendChild(st);
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
    const n=p.n||9, k=p.k||2, item=p.item||'🍬', itemName=p.itemName||'סֻכָּרִיּוֹת';
    const per=Math.floor(n/k), left=n%k, yes=left===0;
    const uid=++_uid;
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};
    let pick=0, done=false, shown=false;
    const its=c=>new Array(c).fill('<span class="cn-it">'+item+'</span>').join('');
    const kWord=k===2?'שְׁתֵּי':'שָׁלוֹשׁ';

    root.innerHTML=
      '<div class="cn-root" id="cn-root-'+uid+'">'+
        '<div class="cn-q">אֶפְשָׁר לְחַלֵּק <b>'+n+'</b> '+itemName+' '+item+' בֵּין <b>'+kWord+'</b> חֲבֵרוֹת '+
          '<b>שָׁוֶה בְּשָׁוֶה</b> — בְּלִי שֶׁיִּשָּׁאֵר כְּלוּם?</div>'+
        '<div class="cn-kids">'+KIDS.slice(0,k).map(e=>'<span>'+e+'</span>').join('')+'</div>'+
        '<div class="cn-row" id="cn-row-'+uid+'">'+its(n)+'</div>'+
        '<div class="cn-note" id="cn-note-'+uid+'"></div>'+
        '<div class="cn-opts">'+
          '<button class="cn-opt" data-v="1">✔ כֵּן, אֶפְשָׁר</button>'+
          '<button class="cn-opt" data-v="2">✘ לֹא — יִשָּׁאֵר מַשֶּׁהוּ</button>'+
        '</div>'+
        '<button class="cn-btn" id="cn-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
      '</div>';
    const $=id=>root.querySelector('#'+id+'-'+uid);
    const row=$('cn-row'), note=$('cn-note'), chk=$('cn-chk'), opts=[...root.querySelectorAll('.cn-opt')];
    hint('🤔 בַּחֲרִי כֵּן אוֹ לֹא וְלַחֲצִי ✓');

    requestAnimationFrame(()=>balanceRows(row,n,10));
    // the explanation: k equal groups, the leftover apart in a red ring
    function reveal(){
      if(shown)return;shown=true;
      let h='';for(let g=0;g<k;g++)h+='<span class="cn-grp">'+its(per)+'</span>';
      if(left)h+='<span class="cn-left">'+its(left)+'</span>';
      row.innerHTML=h;row.style.maxWidth='';
      note.textContent=yes?'כָּל אַחַת מְקַבֶּלֶת '+per+' — וְלֹא נִשְׁאַר כְּלוּם!'
                          :(left===1?'נִשְׁאַר 1':'נִשְׁאֲרוּ '+left)+' — אִי אֶפְשָׁר לְחַלֵּק שָׁוֶה בְּשָׁוֶה';
    }
    opts.forEach(o=>o.addEventListener('click',()=>{
      if(done||o.classList.contains('cn-bad'))return;
      pick=+o.dataset.v;opts.forEach(x=>x.classList.toggle('cn-on',x===o));
    }));
    chk.addEventListener('click',()=>{
      if(done)return;
      if(!pick){hint('בַּחֲרִי קֹדֶם כֵּן אוֹ לֹא 💗');return;}
      const want=yes?1:2, o=opts.find(x=>+x.dataset.v===pick);
      reveal();
      if(pick===want){
        done=true;chk.disabled=true;o.classList.remove('cn-on');o.classList.add('cn-good');
        hint('🎉 נָכוֹן! '+note.textContent);
        api.solved();
      }else{
        o.classList.remove('cn-on');o.classList.add('cn-bad');pick=0;
        api.wrong(o.textContent.replace(/^[✔✘]\s*/,''));
        hint('תִּרְאִי אֶת הַחֲלֻקָּה — וּבַחֲרִי שׁוּב 💗');
      }
    });

    return function cleanup(){root.innerHTML='';};
  }

  return{
    t:TCN,
    modes:['cansh','mx','mulc'],
    aidsReveal:'always',            // no host aid — the dealt picture is shown with the verdict
    make(mode){return mode==='mx'?makePool(1):mode==='mulc'?makePool(2):mode==='cansh'?makePool(8):[];},
    mount,
  };
})();
