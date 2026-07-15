/* ── "צַלָּחוֹת" — equal groups → TOTAL (the multiplication story 🍽️✖️) ─────────
   The INVERSE of half.ex.js: instead of splitting a total into equal groups,
   the child SEES equal groups and finds the TOTAL — the first multiplication
   word problem:

      "לְדָנָה יֵשׁ 2 צַלָּחוֹת, בְּכָל צַלַּחַת 3 תַּפּוּחִים — כַּמָּה בְּסַךְ הַכֹּל?"

   • g plates (2..4), each holding s items (2..4), only products ≤ 10 — the
     very first multiplication facts.
   • The picture starts HIDDEN: she solves from the WORDS alone (try-first,
     the staged-column convention). The 1st mistake REVEALS the plates — the
     equal groups ARE the story; the 2nd mistake "POURS" all the items into
     ONE straight row so she can count them one by one.
   • Once revealed, TAPPING toggles plates ↔ poured row (pure aid).
     Correct → the explanation "2 צַלָּחוֹת שֶׁל 3 = 6".

   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root; self-checks via api.solved()/api.wrong(). Mixed into the
   אַלּוּפָה (mulc) set; the 'plt' handle is for the manual tester / direct
   setMode. Problem shape: { t:TPL, g:plates, s:perPlate, a:g*s, item,
   itemName, name } — `a` carries the ANSWER so the host report is right. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.plates=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  // plate-friendly item kinds (emoji + Hebrew plural, niqqud) + girl names
  const ITEMS=[
    {e:'🍎',name:'תַּפּוּחִים'},
    {e:'🍪',name:'עוּגִיּוֹת'},
    {e:'🍓',name:'תּוּתִים'},
    {e:'🍬',name:'סֻכָּרִיּוֹת'},
    {e:'🥨',name:'בֵּיגָלֶה'},
  ];
  const NAMES=['דָּנָה','נֹעָה','רוֹנִי','מַיָּה','תָּמָר','יָעֵל'];

  // one problem per (g,s) pair — plates 2..4 × per-plate 2..4, but only
  // products ≤ 10 (the first multiplication facts): 6 pairs
  function makePool(n){
    const pairs=[];
    for(let g=2;g<=4;g++)for(let s=2;s<=4;s++)if(g*s<=10)pairs.push([g,s]);
    const its=sh(ITEMS.slice());
    return sh(pairs).slice(0,n).map(([g,s],i)=>{
      const it=its[i%its.length];
      return{t:TPL,g,s,a:g*s,item:it.e,itemName:it.name,name:NAMES[(Math.random()*NAMES.length)|0]};
    });
  }

  const CSS=`
  .pl-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}
  .pl-q{font-family:'Fredoka One',cursive;font-size:1.25rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.5;min-height:1.4em;text-shadow:0 0 12px rgba(160,190,255,.35);padding:0 8px}
  .pl-q b{color:var(--skin-accent,#ffd27d)}
  .pl-stage{width:100%;overflow:hidden;display:flex;justify-content:center;cursor:pointer;user-select:none;
    min-height:86px;align-items:center;padding:6px 0;border-radius:20px;transition:background .3s}
  .pl-stage:hover{background:rgba(255,255,255,.05)}
  .pl-plates{display:flex;align-items:center;justify-content:center;gap:18px;direction:ltr;
    animation:plFade .35s ease;white-space:nowrap;transform-origin:center center}
  /* a CSS "plate": a soft ellipse dish holding its items */
  .pl-plate{display:flex;align-items:center;justify-content:center;gap:3px;flex-wrap:wrap;
    min-width:88px;min-height:64px;padding:10px 12px;border-radius:50% / 42%;
    background:radial-gradient(ellipse at 50% 38%,rgba(255,255,255,.30),rgba(255,255,255,.08) 72%);
    border:3px solid rgba(255,255,255,.5);
    box-shadow:0 6px 14px rgba(0,0,0,.25),inset 0 2px 8px rgba(255,255,255,.25)}
  .pl-it{font-size:1.5rem;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}
  /* the poured single row — everything countable in one line */
  .pl-rowv{display:flex;align-items:center;justify-content:center;gap:5px;direction:ltr;
    animation:plFade .35s ease;white-space:nowrap;transform-origin:center center}
  @keyframes plFade{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
  .pl-tip{font-family:'Fredoka One',cursive;font-size:.95rem;color:var(--skin-text,#fff);opacity:.75;
    transition:opacity .3s;text-align:center}
  /* rtl: the host .equation forces ltr — rtl puts the Hebrew label RIGHT of the input */
  .pl-ans-row{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;direction:rtl}
  .pl-lbl{font-family:'Fredoka One',cursive;font-size:1.2rem;color:var(--skin-text,#fff)}
  #colx-root .ans-inp.pl-inp{width:76px;height:60px;font-size:2.1rem;border-radius:14px;text-align:center}
  #colx-root .pl-inp.pl-ready{animation:plReady 1s ease-in-out infinite alternate}
  @keyframes plReady{from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  .pl-btn{font-family:'Fredoka One',cursive;font-size:1.2rem;border:0;border-radius:14px;padding:11px 24px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .pl-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .pl-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){
    .pl-it{font-size:1.15rem}
    .pl-plate{min-width:64px;min-height:48px;padding:7px 8px}
    .pl-plates{gap:10px}
    .pl-rowv{gap:3px}
  }`;
  function injectStyle(){
    if(document.getElementById('pl-style'))return;
    const st=document.createElement('style');st.id='pl-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{g:2,s:3,a:6,item:'🍎',itemName:'תַּפּוּחִים',name:'דָּנָה'};
    const g=p.g||2, s=p.s||3, total=g*s;
    const item=p.item||'🍎', itemName=p.itemName||'פְּרִיטִים', name=p.name||'דָּנָה';
    const uid=++_uid;
    let done=false, poured=false, shown=false;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    root.innerHTML=
      '<div class="pl-root" id="pl-root-'+uid+'">'+
        '<div class="pl-q" id="pl-q-'+uid+'">לְ<b>'+name+'</b> יֵשׁ <b>'+g+'</b> צַלָּחוֹת, בְּכָל צַלַּחַת <b>'+s+'</b> '+itemName+' '+item+
          ' — כַּמָּה '+itemName+' יֵשׁ <b>בְּסַךְ הַכֹּל</b>?</div>'+
        '<div class="pl-stage" id="pl-stage-'+uid+'" role="button" aria-label="שִׁפְכִי לְשׁוּרָה" style="display:none"></div>'+
        '<div class="pl-tip" id="pl-tip-'+uid+'" style="display:none"></div>'+
        '<div class="pl-ans-row">'+
          '<span class="pl-lbl">כַּמָּה בְּסַךְ הַכֹּל?</span>'+
          '<input class="ans-inp pl-inp" id="pl-ans-'+uid+'" type="text" inputmode="numeric" maxlength="2" aria-label="בְּסַךְ הַכֹּל">'+
          '<button class="pl-btn" id="pl-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
        '</div>'+
      '</div>';

    const $=id=>root.querySelector('#'+id+'-'+uid);
    const stage=$('pl-stage'),tip=$('pl-tip'),inp=$('pl-ans'),chk=$('pl-chk'),qEl=$('pl-q');
    hint('🍽️ כַּמָּה '+itemName+' בְּסַךְ הַכֹּל? נַסִּי בָּרֹאשׁ 🏆');

    const itemSpans=c=>new Array(c).fill('<span class="pl-it">'+item+'</span>').join('');
    // render the CURRENT view: plates (the story's equal groups) or the poured row
    function renderStage(){
      if(poured){
        stage.innerHTML='<div class="pl-rowv" id="pl-rowv-'+uid+'">'+itemSpans(total)+'</div>';
      }else{
        let h='';for(let i=0;i<g;i++)h+='<div class="pl-plate">'+itemSpans(s)+'</div>';
        stage.innerHTML='<div class="pl-plates" id="pl-plates-'+uid+'">'+h+'</div>';
      }
      tip.textContent=poured
        ? '👆 לַחֲצִי לְהַחְזִיר אֶת הַ'+itemName+' לַצַּלָּחוֹת'
        : '👆 לַחֲצִי כְּדֵי לִשְׁפֹּךְ אֶת הַ'+itemName+' לְשׁוּרָה אַחַת וְלִסְפֹּר';
      requestAnimationFrame(fitStage);
    }
    // keep the picture on one line — scale down on overflow (up to 16 items)
    function fitStage(){
      const inner=stage.firstElementChild;if(!inner)return;
      inner.style.transform='';
      const cw=stage.clientWidth, iw=inner.scrollWidth;
      if(iw>cw+1){const sc=Math.max(0.45,cw/iw);inner.style.transform='scale('+sc+')';}
    }
    // reveal the picture (equal groups) — only after a mistake; the child first
    // solves from the WORDS alone (try-first, like the staged column exercise)
    function reveal(){
      if(!shown){shown=true;stage.style.display='';tip.style.display='';}
      renderStage();
    }
    // once revealed, tap → pour into one row / back onto the plates (pure aid)
    stage.addEventListener('click',()=>{if(done||!shown)return;poured=!poured;renderStage();});
    window.addEventListener('resize',fitStage);

    function check(){
      if(done)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){hint('כִּתְבִי כַּמָּה '+itemName+' בְּסַךְ הַכֹּל 💗');return;}
      if(v===total){
        done=true;
        inp.classList.remove('pl-ready','ans-err');inp.classList.add('ans-ok');inp.disabled=true;chk.disabled=true;
        qEl.innerHTML='🎉 בְּדִיּוּק! <b>'+g+'</b> צַלָּחוֹת שֶׁל <b>'+s+'</b> — בְּסַךְ הַכֹּל <b>'+total+'</b> '+itemName+'!';
        hint(g+' × '+s+' = '+total+' 🍽️ כָּל הַכָּבוֹד!');
        api.solved();
      }else{
        inp.classList.remove('pl-ready');inp.classList.add('ans-err');
        api.wrong(v);
        if(!shown){                       // 1st mistake — reveal the equal groups
          poured=false;reveal();
          hint('הִנֵּה הַצַּלָּחוֹת — סִפְרִי כַּמָּה '+itemName+' יֵשׁ 💗');
        }else if(!poured){                // 2nd mistake — pour into one countable row
          poured=true;renderStage();
          hint('סִפְרִי אֶת כֻּלָּם בַּשּׁוּרָה — אֶחָד אֶחָד 💗');
        }else{
          hint('סִפְרִי אֶת כֻּלָּם בַּשּׁוּרָה — אֶחָד אֶחָד 💗');
        }
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');inp.focus();}},1000);
      }
    }
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    later(()=>{inp.classList.add('pl-ready');try{inp.focus();}catch(e){}},350);

    return function cleanup(){
      window.removeEventListener('resize',fitStage);
      timers.forEach(clearTimeout);root.innerHTML='';
    };
  }

  return{
    t:TPL,
    modes:['plt','mulc'],
    aidsReveal:'always',            // no HOST aid (no number line); the module drives
                                    // its own picture reveal on a mistake (try-first)
    make(mode){return mode==='mulc'?makePool(3):mode==='plt'?makePool(6):[];},
    mount,
  };
})();
