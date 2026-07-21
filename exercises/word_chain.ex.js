/* ── "בְּעָיוֹת שַׁרְשֶׁרֶת" — a CHAIN word problem (📖➕➖) ────────────────────────
   A new exercise for the אַלּוּפָה category (mode 'mulc'). A SHORT vowelled
   (מְנֻקָּד) story that boils down to a THREE-term chain, e.g.:

       לְיוֹסִי הָיוּ שְׁנֵי תַּפּוּחִים. הוּא קִבֵּל עוֹד שְׁנֵי תַּפּוּחִים,
       וְאָז נָתַן אַרְבָּעָה תַּפּוּחִים לְחַיִּים. כַּמָּה תַּפּוּחִים נִשְׁאֲרוּ?

   → the chain 2 + 2 − 4 (computed LEFT-TO-RIGHT). Every intermediate step and the
   FINAL result stay in 0..12 (user: "מספרים עד 12 בתוצאה"). Operands are ≥ 2 so
   0/1 (with their agreement quirks) never appear in the story.

   Like `word_prob`, the numbers are SPELLED OUT as gender-agreeing Hebrew words
   (each UNDERLINED + tappable → a tooltip of that many object emojis); the bare
   DIGIT chain (2 + 2 − 4 =) is revealed only AFTER a mistake, with a fresh box to
   retry. Each further mistake costs 25% (100 → 75 → 50 → 0) via the host's graded
   api.penalize / api.solvedFrac hooks. Every number is placed DIRECTLY before its
   counted noun, so it's always the counting form (2 → the construct שְׁנֵי/שְׁתֵּי).

   Problem shape: { t:TWC, a, b, c, ops:['add'|'sub','add'|'sub'], story }.
   Interactive: mounted by core.js _colxMount into #colx-root; self-checks via
   api.solvedFrac()/api.penalize(). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.word_chain=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
  const irnd=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));

  /* Hebrew number WORDS (2..10) with nikud, in the two counting forms.
     m = the ־ָה form (MASCULINE nouns) · f = the short form (FEMININE nouns);
     2 is the construct שְׁנֵי/שְׁתֵּי (every operand sits before its noun). */
  const WORDS={
    m:{2:'שְׁנֵי',3:'שְׁלֹשָׁה',4:'אַרְבָּעָה',5:'חֲמִשָּׁה',6:'שִׁשָּׁה',7:'שִׁבְעָה',8:'שְׁמוֹנָה',9:'תִּשְׁעָה',10:'עֲשָׂרָה'},
    f:{2:'שְׁתֵּי',3:'שָׁלֹשׁ',4:'אַרְבַּע',5:'חָמֵשׁ',6:'שֵׁשׁ',7:'שֶׁבַע',8:'שְׁמוֹנֶה',9:'תֵּשַׁע',10:'עֶשֶׂר'},
  };
  // the spelled numeral: highlighted + UNDERLINED, agreeing with the noun's gender g.
  // data-n / data-emoji drive the tap/hover tooltip (that many object emojis).
  const N=(v,g,e)=>'<b class="wc-num" data-n="'+v+'" data-emoji="'+e+'">'
                   +(((WORDS[g]||WORDS.m)[v])||v)+'</b>';

  /* CHAIN story templates. Each carries its OPS pattern (['add'|'sub','add'|'sub']),
     the counted noun's gender `g` and object emoji `e`; the numbers are rendered as
     A · B · C in order. The verbs MATCH the signs (+ = קִבֵּל/אָפְתָה, − = נָתַן/אָכַל). */
  const TPL=[
    {ops:['add','sub'],g:'m',e:'🍎',
     t:(A,B,C)=>'לְיוֹסִי הָיוּ '+A+' תַּפּוּחִים. הוּא קִבֵּל עוֹד '+B+' תַּפּוּחִים, וְאָז נָתַן '+C+' תַּפּוּחִים לְחַיִּים. כַּמָּה תַּפּוּחִים נִשְׁאֲרוּ לְיוֹסִי?'},
    {ops:['add','add'],g:'f',e:'🍬',
     t:(A,B,C)=>'לְדָנָה הָיוּ '+A+' סֻכָּרִיּוֹת. הִיא קִבְּלָה עוֹד '+B+' סֻכָּרִיּוֹת, וְאַחַר כָּךְ עוֹד '+C+' סֻכָּרִיּוֹת. כַּמָּה סֻכָּרִיּוֹת יֵשׁ לָהּ עַכְשָׁיו?'},
    {ops:['sub','add'],g:'m',e:'🎈',
     t:(A,B,C)=>'לְרוֹנִי הָיוּ '+A+' בָּלוֹנִים. הוּא נָתַן '+B+' בָּלוֹנִים לַחֲבֵרוֹ, וְאָז קִבֵּל עוֹד '+C+' בָּלוֹנִים. כַּמָּה בָּלוֹנִים יֵשׁ לְרוֹנִי?'},
    {ops:['add','sub'],g:'f',e:'🍪',
     t:(A,B,C)=>'מַיָּה אָפְתָה '+A+' עֻגִיּוֹת, וְאַחַר כָּךְ עוֹד '+B+' עֻגִיּוֹת. אָז הִיא אָכְלָה '+C+' עֻגִיּוֹת. כַּמָּה עֻגִיּוֹת נִשְׁאֲרוּ?'},
    {ops:['sub','sub'],g:'m',e:'⚽',
     t:(A,B,C)=>'לְעֹמֶר הָיוּ '+A+' כַּדּוּרִים. הוּא נָתַן '+B+' כַּדּוּרִים לְאָחִיו וְעוֹד '+C+' כַּדּוּרִים לַחֲבֵרוֹ. כַּמָּה כַּדּוּרִים נִשְׁאֲרוּ לְעֹמֶר?'},
    {ops:['add','add'],g:'m',e:'🐟',
     t:(A,B,C)=>'בַּבְּרֵכָה הָיוּ '+A+' דָּגִים. הוֹסִיפוּ עוֹד '+B+' דָּגִים, וְאַחַר כָּךְ עוֹד '+C+' דָּגִים. כַּמָּה דָּגִים יֵשׁ עַכְשָׁיו בַּבְּרֵכָה?'},
  ];

  // the chain result, computed LEFT-TO-RIGHT
  function chain(a,b,c,ops){const r=ops[0]==='add'?a+b:a-b;return ops[1]==='add'?r+c:r-c;}
  // every step + the final result must stay in 0..12; operands ≥ 2
  function valid(a,b,c,ops){
    if(a<2||b<2||c<2)return false;
    const r1=ops[0]==='add'?a+b:a-b;
    if(r1<0||r1>12)return false;
    const r2=ops[1]==='add'?r1+c:r1-c;
    return r2>=0&&r2<=12;
  }
  function makeOne(tpl){
    let a=2,b=2,c=2,guard=0;
    do{a=irnd(2,10);b=irnd(2,8);c=irnd(2,8);}while(!valid(a,b,c,tpl.ops)&&guard++<300);
    if(!valid(a,b,c,tpl.ops)){a=2;b=2;c=tpl.ops[1]==='sub'?(tpl.ops[0]==='sub'?2:4):2;}  // safe fallback
    return {t:TWC,a,b,c,ops:tpl.ops.slice(),story:tpl.t(N(a,tpl.g,tpl.e),N(b,tpl.g,tpl.e),N(c,tpl.g,tpl.e))};
  }
  /* a de-duplicated batch, rotating through the templates (so ops patterns vary) */
  function makePool(n){
    n=n||4;
    const out=[],seen={};let guard=0;
    const order=sh(TPL.map((_,i)=>i));
    while(out.length<n&&guard++<300){
      const tpl=TPL[order[out.length%order.length]];
      const p=makeOne(tpl);
      const key=p.ops.join()+'|'+p.a+'_'+p.b+'_'+p.c;
      if(seen[key])continue;
      seen[key]=1;out.push(p);
    }
    return sh(out);
  }

  const CSS=`
  .wc-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:540px;margin:0 auto}
  .wc-story{direction:rtl;text-align:center;line-height:1.75;
    font-family:'Fredoka One','Heebo',sans-serif;font-weight:400;
    font-size:1.45rem;color:var(--skin-text,#fff);
    text-shadow:0 0 12px rgba(160,190,255,.25);
    background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);
    border-radius:16px;padding:16px 20px;animation:wcFade .35s ease}
  .wc-story .wc-num{color:var(--skin-accent,#ffd27d);font-weight:700;font-size:1.15em;margin:0 1px;
    cursor:pointer;text-decoration:underline;text-decoration-thickness:2px;
    text-underline-offset:4px;text-decoration-color:var(--skin-accent,#ffd27d);
    border-radius:6px;transition:filter .12s,text-shadow .12s}
  .wc-story .wc-num:hover{filter:brightness(1.18);text-shadow:0 0 12px var(--skin-accent,#ffd27d)}
  @keyframes wcFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  /* emoji quantity tooltip — pops N object-emojis when a number word is hovered/tapped */
  .wc-tip{position:fixed;z-index:99999;display:none;flex-wrap:wrap;gap:6px 8px;
    max-width:212px;justify-content:center;align-items:center;padding:12px 14px;
    border-radius:16px;pointer-events:none;direction:ltr;
    background:rgba(28,22,52,.94);border:2px solid var(--skin-accent,#ffd27d);
    box-shadow:0 10px 28px rgba(0,0,0,.45);
    opacity:0;transform:translateY(6px) scale(.96);transition:opacity .16s ease,transform .16s ease}
  .wc-tip.show{opacity:1;transform:none}
  .wc-tip::after{content:'';position:absolute;bottom:-8px;left:calc(50% - 8px);
    width:0;height:0;border:8px solid transparent;border-bottom:0;
    border-top-color:var(--skin-accent,#ffd27d)}
  .wc-tip.below::after{top:-8px;bottom:auto;border-top:0;border-bottom:8px solid var(--skin-accent,#ffd27d);border-top-color:transparent}
  .wc-tip .wc-tip-e{font-size:1.75rem;line-height:1;animation:wcPop .3s ease both}
  @keyframes wcPop{from{opacity:0;transform:scale(.35)}to{opacity:1;transform:none}}
  .wc-ansrow,.wc-eqrow{display:flex;align-items:center;justify-content:center;gap:12px;direction:ltr;flex-wrap:wrap}
  .wc-eq{font-family:'Fredoka One',cursive;font-size:1.9rem;color:var(--skin-text,#fff);letter-spacing:.03em}
  #colx-root .ans-inp.wc-inp,#colx-root .ans-inp.wc-inp2{width:74px;height:58px;font-size:2rem;border-radius:12px;text-align:center;padding:0}
  .wc-chk{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
    font-size:1.5rem;line-height:1;color:#fff;background:var(--skin-primary,#c77dff);
    box-shadow:0 3px 10px rgba(0,0,0,.25);transition:transform .12s,filter .12s}
  .wc-chk:hover{filter:brightness(1.08);transform:translateY(-1px)}
  .wc-chk:active{transform:scale(.94)}
  .wc-chk:disabled{opacity:.5;cursor:default}
  /* the derived DIGIT chain, revealed after a mistake */
  .wc-derived{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;animation:wcFade .35s ease}
  .wc-sep{width:70%;max-width:340px;height:0;border-top:2px solid var(--skin-accent,#ffd27d);opacity:.5;border-radius:2px}
  .wc-eqlabel{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.05rem;color:var(--skin-text,#fff);opacity:.85;direction:rtl}
  #colx-root .wc-inp.blink,#colx-root .wc-inp2.blink{animation:wcBlink 1.1s ease-in-out infinite alternate}
  @keyframes wcBlink{
    from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  `;

  function injectStyle(){
    if(document.getElementById('wc-style'))return;
    const st=document.createElement('style');st.id='wc-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount({root,a,b,p,api}){
    injectStyle();
    const ops=(p&&p.ops)||['add','sub'];
    const A=Math.max(0,a||0), B=Math.max(0,b||0), C=Math.max(0,(p&&p.c)||0);
    const correct=chain(A,B,C,ops);
    const s1=ops[0]==='add'?'+':'−', s2=ops[1]==='add'?'+':'−';
    const eqStr=A+' '+s1+' '+B+' '+s2+' '+C+' =';
    const story=(p&&p.story)||eqStr;
    const FRAC=[1,0.75,0.5,0];                 // 0 mistakes→100% · 1→75% · 2→50% · 3+→0%
    let mistakes=0, solved=false, revealed=false;
    const timers=[]; const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const H=()=>document.getElementById('hint');
    const fb=m=>{const h=H();if(h)h.textContent=m;};

    root.innerHTML=
      '<div class="wc-root">'+
        '<div class="wc-story">'+story+'</div>'+
        '<div class="wc-ansrow">'+
          '<input class="ans-inp wc-inp blink" id="wc-inp" type="text" inputmode="numeric" maxlength="2" aria-label="הַתְּשׁוּבָה">'+
          '<button type="button" class="wc-chk" id="wc-chk" aria-label="בְּדִיקָה">✓</button>'+
        '</div>'+
        '<div class="wc-derived" id="wc-derived" style="display:none">'+
          '<div class="wc-sep"></div>'+
          '<div class="wc-eqlabel">הַתַּרְגִּיל מֵהַסִּפּוּר:</div>'+
          '<div class="wc-eqrow">'+
            '<span class="wc-eq">'+eqStr+'</span>'+
            '<input class="ans-inp wc-inp2 blink" id="wc-inp2" type="text" inputmode="numeric" maxlength="2" aria-label="הַתְּשׁוּבָה">'+
            '<button type="button" class="wc-chk" id="wc-chk2" aria-label="בְּדִיקָה">✓</button>'+
          '</div>'+
        '</div>'+
      '</div>';

    const inp1=root.querySelector('#wc-inp'), chk1=root.querySelector('#wc-chk');
    const derived=root.querySelector('#wc-derived');
    const inp2=root.querySelector('#wc-inp2'), chk2=root.querySelector('#wc-chk2');

    fb('📖 קִרְאִי אֶת הַסִּפּוּר וְחַשְּׁבִי שְׁלָב אַחֲרֵי שְׁלָב 💗');

    // ── underlined number words → emoji-quantity tooltip (hover desktop / tap touch) ──
    document.querySelectorAll('.wc-tip').forEach(t=>t.remove());   // drop any stray tip
    const tip=document.createElement('div');tip.className='wc-tip';document.body.appendChild(tip);
    function showTip(el){
      const n=parseInt(el.getAttribute('data-n'),10)||0;
      const emo=el.getAttribute('data-emoji')||'⭐';
      if(!n)return;
      tip.innerHTML='';
      for(let i=0;i<n;i++){
        const s=document.createElement('span');s.className='wc-tip-e';s.textContent=emo;
        s.style.animationDelay=(i*45)+'ms';tip.appendChild(s);
      }
      tip.classList.remove('below','show');tip.style.display='flex';tip.style.visibility='hidden';
      tip.style.left='0px';tip.style.top='0px';
      const r=el.getBoundingClientRect();
      const tw=tip.offsetWidth, th=tip.offsetHeight;
      const below=(window.innerHeight-r.bottom) >= th+16;
      let left=Math.max(8,Math.min(r.left+r.width/2-tw/2, window.innerWidth-tw-8));
      let top=below?r.bottom+12:r.top-th-12;
      top=Math.max(8,Math.min(top, window.innerHeight-th-8));
      tip.classList.toggle('below',below);
      tip.style.left=left+'px';tip.style.top=top+'px';tip.style.visibility='';tip._for=el;
      requestAnimationFrame(()=>tip.classList.add('show'));
    }
    function hideTip(){tip.classList.remove('show');tip.style.display='none';tip._for=null;}
    root.querySelectorAll('.wc-story .wc-num').forEach(el=>{
      el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')showTip(el);});
      el.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')hideTip();});
    });
    function onDocDown(e){
      if(e.pointerType==='mouse')return;
      const el=e.target.closest&&e.target.closest('.wc-story .wc-num');
      if(el&&root.contains(el)){(tip._for===el&&tip.classList.contains('show'))?hideTip():showTip(el);}
      else hideTip();
    }
    document.addEventListener('pointerdown',onDocDown);

    function grade(box){
      if(solved)return;solved=true;
      if(box){box.classList.remove('blink','ans-err');box.classList.add('ans-ok');}
      root.querySelectorAll('input').forEach(el=>{el.classList.remove('blink');el.disabled=true;});
      root.querySelectorAll('.wc-chk').forEach(el=>{el.disabled=true;});
      if(api.solvedFrac)api.solvedFrac(FRAC[Math.min(mistakes,3)]);else api.solved();
    }
    function penalize(v){
      mistakes++;
      if(api.penalize)api.penalize(v);else if(api.wrong)api.wrong(v);
    }
    function reveal(){
      if(revealed)return;revealed=true;
      derived.style.display='';
      fb('כִּמְעַט! הִנֵּה הַתַּרְגִּיל מֵהַסִּפּוּר — פִּתְרִי שְׁלָב אַחֲרֵי שְׁלָב 💗');
      later(()=>{try{inp2.focus();}catch(e){}},320);
    }

    // ── Phase 1: read the story, answer it ──
    function try1(){
      if(solved||revealed)return;
      const v=parseInt(inp1.value,10);
      if(inp1.value===''||isNaN(v)){fb('כִּתְבִי אֶת הַתְּשׁוּבָה 💗');return;}
      if(v===correct){inp1.classList.remove('blink');grade(inp1);}
      else{
        inp1.classList.remove('blink');inp1.classList.add('ans-err');inp1.disabled=true;chk1.disabled=true;
        penalize(v);
        reveal();
      }
    }
    // ── Phase 2: the bare DIGIT chain derived from the story ──
    function try2(){
      if(solved)return;
      const v=parseInt(inp2.value,10);
      if(inp2.value===''||isNaN(v)){fb('כִּתְבִי אֶת הַתְּשׁוּבָה 💗');return;}
      if(v===correct){inp2.classList.remove('blink');grade(inp2);}
      else{
        inp2.classList.remove('blink');inp2.classList.add('ans-err');
        penalize(v);
        fb('נַסִּי שׁוּב — חַשְּׁבִי '+eqStr.replace(/ =$/,'')+' שְׁלָב אַחֲרֵי שְׁלָב 💗');
        later(()=>{if(!solved){inp2.value='';inp2.classList.remove('ans-err');inp2.classList.add('blink');try{inp2.focus();}catch(e){}}},1000);
      }
    }

    function wire(inp,chk,fn){
      inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'').slice(0,2);this.classList.remove('ans-err');});
      inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();fn();}});
      chk.addEventListener('click',fn);
    }
    wire(inp1,chk1,try1);
    wire(inp2,chk2,try2);

    requestAnimationFrame(()=>{try{inp1.focus();}catch(e){}});
    return function cleanup(){
      timers.forEach(clearTimeout);
      document.removeEventListener('pointerdown',onDocDown);
      if(tip&&tip.parentNode)tip.parentNode.removeChild(tip);
      root.innerHTML='';
    };
  }

  return{
    t:TWC,
    modes:['wc','mulc'],       // 'wc' = internal handle (tester / direct setMode); mixed into אַלּוּפָה
    aidsReveal:'always',       // no number-line aid — the story reveals its own DIGIT chain on a mistake
    make(mode){ return mode==='wc'?makePool(8):mode==='mulc'?makePool(3):[]; },
    mount,
  };
})();
