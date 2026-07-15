/* ── "בְּעָיוֹת מִלּוּלִיּוֹת עַד 10" — short nikud word problems ────────────────
   A new exercise for the אַלּוּפָה category (mode 'mulc'). A SHORT vowelled
   (מְנֻקָּד) story up to 10, e.g.:

       לְיוֹסִי חֲמִשָּׁה תַּפּוּחִים. רוֹעִי לָקַח לוֹ שְׁלֹשָׁה תַּפּוּחִים.
       כַּמָּה תַּפּוּחִים נִשְׁאֲרוּ לְיוֹסִי?

   The child types the answer. Correct on the first try → full points.
   A WRONG answer costs 25% of the problem's points AND reveals the bare
   equation the story boils down to (5 − 3 =) with a fresh input to try again.
   Each further mistake costs another 25% (100 → 75 → 50 → 0), driven by the
   host's graded api.penalize / api.solvedFrac hooks (the same staged scoring
   the אַלּוּפָה column-subtraction uses).

   Numbers in the STORY are spelled out as gender-agreeing Hebrew words (e.g.
   "חֲמִשָּׁה תַּפּוּחִים", "שָׁלֹשׁ עֻגִיּוֹת") — the bare digits appear only in the
   derived equation (5 − 3 =) revealed after a mistake. Hebrew number–noun
   agreement is polar: the ־ָה form (שְׁלֹשָׁה) goes with MASCULINE nouns, the
   short form (שָׁלֹשׁ) with FEMININE ones; 2 uses the construct שְׁנֵי/שְׁתֵּי.
   Each template therefore carries its counted noun's gender `g`, and its
   name/noun/verb stay FIXED so the grammar + nikud are always correct.
   Operands stay ≥ 2, so 0/1 (with their extra agreement quirks) never appear.

   Each number word is UNDERLINED and interactive: hovering (desktop) or tapping
   (touch) it pops a tooltip with that many object emojis (🍎/🎈/🍬…, matched to
   the story's noun via the template's `e`), so the child can count the quantity
   the word stands for. Data lives on the <b class="wp-num" data-n data-emoji>.

   Problem shape: { t:TWP, a, b, op:'sub'|'add', story } (story = pre-rendered
   nikud HTML). Interactive: mounted by core.js _colxMount into #colx-root;
   self-checks via api.solvedFrac()/api.penalize(). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.word_prob=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
  const irnd=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));
  /* Hebrew number WORDS (2..10) with nikud, in the two counting forms.
     m = the ־ָה form used with MASCULINE nouns · f = the short form used with
     FEMININE nouns · 2 is the construct שְׁנֵי/שְׁתֵּי. */
  const WORDS={
    m:{2:'שְׁנֵי',3:'שְׁלֹשָׁה',4:'אַרְבָּעָה',5:'חֲמִשָּׁה',6:'שִׁשָּׁה',7:'שִׁבְעָה',8:'שְׁמוֹנָה',9:'תִּשְׁעָה',10:'עֲשָׂרָה'},
    f:{2:'שְׁתֵּי',3:'שָׁלֹשׁ',4:'אַרְבַּע',5:'חָמֵשׁ',6:'שֵׁשׁ',7:'שֶׁבַע',8:'שְׁמוֹנֶה',9:'תֵּשַׁע',10:'עֶשֶׂר'},
  };
  // the spelled numeral: highlighted + UNDERLINED, agreeing with the noun's gender g.
  // carries data-n (the value) and data-emoji (the story's object) so hovering /
  // tapping it pops a tooltip with that many emojis (wired in mount()).
  const N=(v,g,e)=>'<b class="wp-num" data-n="'+v+'" data-emoji="'+e+'">'
                   +(((WORDS[g]||WORDS.m)[v])||v)+'</b>';
  /* ABSOLUTE (independent) numeral forms — used when the number stands ALONE
     (e.g. "אָכַל שְׁתַּיִם מֵהֶן"), NOT directly before its counted noun. Only 2
     differs from the counting forms above (שְׁנַיִם/שְׁתַּיִם vs the construct
     שְׁנֵי/שְׁתֵּי); 3..10 are identical, so we override just 2. */
  const ABS={m:{2:'שְׁנַיִם'},f:{2:'שְׁתַּיִם'}};
  const NA=(v,g,e)=>'<b class="wp-num" data-n="'+v+'" data-emoji="'+e+'">'
                   +((ABS[g]&&ABS[g][v])||((WORDS[g]||WORDS.m)[v])||v)+'</b>';

  /* SUBTRACTION stories — answer = a − b (a = start, b = taken away). Each is a
     complete, grammatically-fixed nikud sentence; `g` = the counted noun's gender
     so the spelled numeral agrees, `e` = the object emoji shown on hover. A/B are
     the pre-rendered numeral words. */
  const SUB=[
    {g:'m',e:'🍎',t:(A,B)=>'לְיוֹסִי '+A+' תַּפּוּחִים. רוֹעִי לָקַח לוֹ '+B+' תַּפּוּחִים. כַּמָּה תַּפּוּחִים נִשְׁאֲרוּ לְיוֹסִי?'},
    {g:'m',e:'🎈',t:(A,B)=>'לְדָנָה הָיוּ '+A+' בָּלוֹנִים. '+B+' בָּלוֹנִים הִתְפּוֹצְצוּ. כַּמָּה בָּלוֹנִים נִשְׁאֲרוּ לְדָנָה?'},
    {g:'f',e:'🍬',bAbs:true,t:(A,B)=>'לְנֹעַם הָיוּ '+A+' סֻכָּרִיּוֹת. הוּא אָכַל '+B+' מֵהֶן. כַּמָּה סֻכָּרִיּוֹת נִשְׁאֲרוּ לוֹ?'},
    {g:'f',e:'🐦',t:(A,B)=>'עַל הָעֵץ יָשְׁבוּ '+A+' צִפּוֹרִים. '+B+' צִפּוֹרִים עָפוּ. כַּמָּה צִפּוֹרִים נִשְׁאֲרוּ עַל הָעֵץ?'},
    {g:'f',e:'🍪',t:(A,B)=>'לְמַיָּה הָיוּ '+A+' עֻגִיּוֹת. הִיא נָתְנָה '+B+' עֻגִיּוֹת לַחֲבֵרָה. כַּמָּה עֻגִיּוֹת נִשְׁאֲרוּ לָהּ?'},
  ];
  /* ADDITION stories — answer = a + b. */
  const ADD=[
    {g:'f',e:'🔵',t:(A,B)=>'לְאִיתַי הָיוּ '+A+' גֻּלּוֹת. הוּא קִבֵּל עוֹד '+B+' גֻּלּוֹת. כַּמָּה גֻּלּוֹת יֵשׁ לוֹ עַכְשָׁיו?'},
    {g:'m',e:'🌸',t:(A,B)=>'רוֹנִי קָטְפָה '+A+' פְּרָחִים, וְאַחַר כָּךְ עוֹד '+B+' פְּרָחִים. כַּמָּה פְּרָחִים קָטְפָה רוֹנִי?'},
    {g:'m',e:'🐟',t:(A,B)=>'בַּבְּרֵכָה הָיוּ '+A+' דָּגִים. הוֹסִיפוּ עוֹד '+B+' דָּגִים. כַּמָּה דָּגִים יֵשׁ עַכְשָׁיו בַּבְּרֵכָה?'},
    {g:'f',e:'⭐',t:(A,B)=>'לְעֹמֶר הָיוּ '+A+' מַדְבֵּקוֹת. הוּא קָנָה עוֹד '+B+' מַדְבֵּקוֹת. כַּמָּה מַדְבֵּקוֹת יֵשׁ לוֹ?'},
  ];

  /* one problem: pick an op, pick operands (≤10, both ≥2), render the story with
     the operands spelled out as gender-agreeing Hebrew words (underlined + tappable) */
  function makeOne(op){
    let a,b;
    if(op==='add'){ a=irnd(2,8); b=irnd(2,10-a); }          // sum 4..10
    else          { b=irnd(2,6); a=irnd(b+2,10); }          // a 4..10, answer a−b ≥ 2
    const list=(op==='add'?ADD:SUB);
    const tpl=list[irnd(0,list.length-1)];
    // `bAbs` templates use B in a STANDALONE position ("… מֵהֶן") → absolute form
    // for 2 (שְׁתַּיִם/שְׁנַיִם); A always precedes its noun, so it stays construct.
    const Bstr=tpl.bAbs?NA(b,tpl.g,tpl.e):N(b,tpl.g,tpl.e);
    return {t:TWP,a,b,op,story:tpl.t(N(a,tpl.g,tpl.e),Bstr)};
  }

  /* a de-duplicated batch, roughly half subtraction / half addition, shuffled */
  function makePool(n){
    n=n||4;
    const out=[],seen={};
    let guard=0;
    while(out.length<n&&guard++<200){
      const op=out.length%2===0?'sub':'add';
      const p=makeOne(op);
      const key=p.op+p.a+'_'+p.b;
      if(seen[key])continue;
      seen[key]=1;out.push(p);
    }
    return sh(out);
  }

  const CSS=`
  .wp-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:520px;margin:0 auto}
  .wp-story{direction:rtl;text-align:center;line-height:1.7;
    font-family:'Fredoka One','Heebo',sans-serif;font-weight:400;
    font-size:1.5rem;color:var(--skin-text,#fff);
    text-shadow:0 0 12px rgba(160,190,255,.25);
    background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);
    border-radius:16px;padding:16px 20px;animation:wpFade .35s ease}
  .wp-story .wp-num{color:var(--skin-accent,#ffd27d);font-weight:700;font-size:1.15em;margin:0 1px;
    cursor:pointer;text-decoration:underline;text-decoration-thickness:2px;
    text-underline-offset:4px;text-decoration-color:var(--skin-accent,#ffd27d);
    border-radius:6px;transition:filter .12s,text-shadow .12s}
  .wp-story .wp-num:hover{filter:brightness(1.18);text-shadow:0 0 12px var(--skin-accent,#ffd27d)}
  @keyframes wpFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  /* emoji quantity tooltip — pops N object-emojis when a number word is hovered/tapped */
  .wp-tip{position:fixed;z-index:99999;display:none;flex-wrap:wrap;gap:6px 8px;
    max-width:212px;justify-content:center;align-items:center;padding:12px 14px;
    border-radius:16px;pointer-events:none;direction:ltr;
    background:rgba(28,22,52,.94);border:2px solid var(--skin-accent,#ffd27d);
    box-shadow:0 10px 28px rgba(0,0,0,.45);
    opacity:0;transform:translateY(6px) scale(.96);transition:opacity .16s ease,transform .16s ease}
  .wp-tip.show{opacity:1;transform:none}
  .wp-tip::after{content:'';position:absolute;bottom:-8px;left:calc(50% - 8px);
    width:0;height:0;border:8px solid transparent;border-bottom:0;
    border-top-color:var(--skin-accent,#ffd27d)}
  .wp-tip.below::after{top:-8px;bottom:auto;border-top:0;border-bottom:8px solid var(--skin-accent,#ffd27d);border-top-color:transparent}
  .wp-tip .wp-tip-e{font-size:1.75rem;line-height:1;animation:wpPop .3s ease both}
  @keyframes wpPop{from{opacity:0;transform:scale(.35)}to{opacity:1;transform:none}}
  .wp-ansrow,.wp-eqrow{display:flex;align-items:center;justify-content:center;gap:12px;direction:ltr}
  .wp-eq{font-family:'Fredoka One',cursive;font-size:1.9rem;color:var(--skin-text,#fff);letter-spacing:.03em}
  #colx-root .ans-inp.wp-inp,#colx-root .ans-inp.wp-inp2{width:74px;height:58px;font-size:2rem;border-radius:12px;text-align:center;padding:0}
  .wp-chk{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
    font-size:1.5rem;line-height:1;color:#fff;background:var(--skin-primary,#c77dff);
    box-shadow:0 3px 10px rgba(0,0,0,.25);transition:transform .12s,filter .12s}
  .wp-chk:hover{filter:brightness(1.08);transform:translateY(-1px)}
  .wp-chk:active{transform:scale(.94)}
  .wp-chk:disabled{opacity:.5;cursor:default}
  /* the derived equation, revealed after a mistake */
  .wp-derived{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;animation:wpFade .35s ease}
  .wp-sep{width:70%;max-width:340px;height:0;border-top:2px solid var(--skin-accent,#ffd27d);opacity:.5;border-radius:2px}
  .wp-eqlabel{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.05rem;color:var(--skin-text,#fff);opacity:.85;direction:rtl}
  #colx-root .wp-inp.blink,#colx-root .wp-inp2.blink{animation:wpBlink 1.1s ease-in-out infinite alternate}
  @keyframes wpBlink{
    from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  `;

  function injectStyle(){
    if(document.getElementById('wp-style'))return;
    const st=document.createElement('style');st.id='wp-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount({root,a,b,p,api}){
    injectStyle();
    const op=(p&&p.op)||'sub';
    const A=Math.max(0,a||0), B=Math.max(0,b||0);
    const correct=op==='add'?A+B:A-B;
    const opSign=op==='add'?'+':'−';
    const story=(p&&p.story)||(A+' '+opSign+' '+B+' =');
    const FRAC=[1,0.75,0.5,0];                 // 0 mistakes→100% · 1→75% · 2→50% · 3+→0%
    let mistakes=0, solved=false, revealed=false;
    const timers=[]; const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const H=()=>document.getElementById('hint');
    const fb=m=>{const h=H();if(h)h.textContent=m;};

    root.innerHTML=
      '<div class="wp-root">'+
        '<div class="wp-story">'+story+'</div>'+
        '<div class="wp-ansrow">'+
          '<input class="ans-inp wp-inp blink" id="wp-inp" type="text" inputmode="numeric" maxlength="2" aria-label="הַתְּשׁוּבָה">'+
          '<button type="button" class="wp-chk" id="wp-chk" aria-label="בְּדִיקָה">✓</button>'+
        '</div>'+
        '<div class="wp-derived" id="wp-derived" style="display:none">'+
          '<div class="wp-sep"></div>'+
          '<div class="wp-eqlabel">הַתַּרְגִּיל מֵהַסִּפּוּר:</div>'+
          '<div class="wp-eqrow">'+
            '<span class="wp-eq">'+A+' '+opSign+' '+B+' =</span>'+
            '<input class="ans-inp wp-inp2 blink" id="wp-inp2" type="text" inputmode="numeric" maxlength="2" aria-label="הַתְּשׁוּבָה">'+
            '<button type="button" class="wp-chk" id="wp-chk2" aria-label="בְּדִיקָה">✓</button>'+
          '</div>'+
        '</div>'+
      '</div>';

    const inp1=root.querySelector('#wp-inp'), chk1=root.querySelector('#wp-chk');
    const derived=root.querySelector('#wp-derived');
    const inp2=root.querySelector('#wp-inp2'), chk2=root.querySelector('#wp-chk2');

    fb('📖 קִרְאִי אֶת הַסִּפּוּר וְכִתְבִי כַּמָּה יָצָא 💗');

    // ── underlined number words → emoji-quantity tooltip ──
    // Hover (desktop) or tap (touch) a spelled number to see that many object
    // emojis, so the child can literally count the quantity the word stands for.
    document.querySelectorAll('.wp-tip').forEach(t=>t.remove());   // drop any stray tip
    const tip=document.createElement('div');tip.className='wp-tip';document.body.appendChild(tip);
    function showTip(el){
      const n=parseInt(el.getAttribute('data-n'),10)||0;
      const emo=el.getAttribute('data-emoji')||'⭐';
      if(!n)return;
      tip.innerHTML='';
      for(let i=0;i<n;i++){
        const s=document.createElement('span');s.className='wp-tip-e';s.textContent=emo;
        s.style.animationDelay=(i*45)+'ms';tip.appendChild(s);
      }
      tip.classList.remove('below','show');tip.style.display='flex';tip.style.visibility='hidden';
      tip.style.left='0px';tip.style.top='0px';                 // reset before measuring
      const r=el.getBoundingClientRect();
      const tw=tip.offsetWidth, th=tip.offsetHeight;
      const below=(window.innerHeight-r.bottom) >= th+16;       // prefer BELOW the word (clears the header); flip up only if no room
      let left=Math.max(8,Math.min(r.left+r.width/2-tw/2, window.innerWidth-tw-8));
      let top=below?r.bottom+12:r.top-th-12;
      top=Math.max(8,Math.min(top, window.innerHeight-th-8));    // always keep on-screen
      tip.classList.toggle('below',below);
      tip.style.left=left+'px';tip.style.top=top+'px';tip.style.visibility='';tip._for=el;
      requestAnimationFrame(()=>tip.classList.add('show'));
    }
    function hideTip(){tip.classList.remove('show');tip.style.display='none';tip._for=null;}
    root.querySelectorAll('.wp-story .wp-num').forEach(el=>{
      el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')showTip(el);});
      el.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')hideTip();});
    });
    // touch: tap a word to toggle its tooltip; tap elsewhere to dismiss (mouse uses hover)
    function onDocDown(e){
      if(e.pointerType==='mouse')return;
      const el=e.target.closest&&e.target.closest('.wp-story .wp-num');
      if(el&&root.contains(el)){(tip._for===el&&tip.classList.contains('show'))?hideTip():showTip(el);}
      else hideTip();
    }
    document.addEventListener('pointerdown',onDocDown);

    function grade(box){
      if(solved)return;solved=true;
      if(box){box.classList.remove('blink','ans-err');box.classList.add('ans-ok');}
      root.querySelectorAll('input').forEach(el=>{el.classList.remove('blink');el.disabled=true;});
      root.querySelectorAll('.wp-chk').forEach(el=>{el.disabled=true;});
      if(api.solvedFrac)api.solvedFrac(FRAC[Math.min(mistakes,3)]);else api.solved();
    }
    // a mistake: −25% (host logs it + shows the sad modal) without ending the problem
    function penalize(v){
      mistakes++;
      if(api.penalize)api.penalize(v);else if(api.wrong)api.wrong(v);
    }
    function reveal(){
      if(revealed)return;revealed=true;
      derived.style.display='';
      fb('כִּמְעַט! הִנֵּה הַתַּרְגִּיל מֵהַסִּפּוּר — פִּתְרִי אוֹתוֹ 💗');
      later(()=>{try{inp2.focus();}catch(e){}},320);
    }

    // ── Phase 1: read the story, answer it (submitted on Enter or ✓) ──
    function try1(){
      if(solved||revealed)return;
      const v=parseInt(inp1.value,10);
      if(inp1.value===''||isNaN(v)){fb('כִּתְבִי אֶת הַתְּשׁוּבָה 💗');return;}
      if(v===correct){inp1.classList.remove('blink');grade(inp1);}
      else{
        inp1.classList.remove('blink');inp1.classList.add('ans-err');inp1.disabled=true;chk1.disabled=true;
        penalize(v);              // −25% + sad modal
        reveal();                 // show the derived equation (5 − 3 =) + a fresh input
      }
    }
    // ── Phase 2: the bare equation derived from the story ──
    function try2(){
      if(solved)return;
      const v=parseInt(inp2.value,10);
      if(inp2.value===''||isNaN(v)){fb('כִּתְבִי אֶת הַתְּשׁוּבָה 💗');return;}
      if(v===correct){inp2.classList.remove('blink');grade(inp2);}
      else{
        inp2.classList.remove('blink');inp2.classList.add('ans-err');
        penalize(v);              // another −25%
        fb('נַסִּי שׁוּב — כַּמָּה זֶה '+A+' '+opSign+' '+B+'? 💗');
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
    t:TWP,
    modes:['wp','mulc'],       // 'wp' = internal handle (tester / direct setMode); mixed into אַלּוּפָה
    aidsReveal:'always',       // no number-line aid — the story reveals its own equation on a mistake
    make(mode){ return mode==='wp'?makePool(12):mode==='mulc'?makePool(4):[]; },
    mount,
  };
})();
