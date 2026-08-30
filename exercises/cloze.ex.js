/* ── "הַשְׁלֵם אֶת הַמִּלָּה" — cloze: a vowelled sentence with a missing word ────
   A READING exercise (one of the reading kinds sharing the one-per-5 reading
   slots in Superman + אַלּוּפָה): a SHORT vowelled sentence with a visible gap,
   e.g. "הֶחָתוּל שָׁתָה ___ מִן הַקְּעָרָה" — and 3 vowelled options (the correct
   word + a plausible distractor + a silly one). TAP an option to select, press
   the ✓ to SUBMIT (the story_quiz flow): correct → the word DROPS INTO the gap
   + api.solved(); wrong → api.wrong(pick) + re-pick. Trains reading-in-context.

   Problem: { t:TCZ, pre, post, opts:[3], a:1-based correct } (a → num1).
   Bank of 24 sentences served by a NO-REPEAT shuffled-queue rotation (like
   story_quiz — the child must not memorise answers); options shuffled per card.
   Interactive: mounted by core.js _colxMount into #colx-root; aidsReveal 'always'. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.cloze=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  /* THE BANK — pre ___ post; opts[0] is ALWAYS the correct word here (shuffled
     per card, `a` recomputed). CRITICAL: exactly ONE option may fit the sentence
     logically — BOTH distractors must be clearly WRONG in context (never a second
     plausible answer). E.g. "אחרי הגשם ראינו ___ בשמיים" → קֶשֶׁת only; NOT עֲנָנִים
     (also true) — the distractors are things you'd never see in the sky. */
  const BANK=[
    {pre:'הֶחָתוּל שָׁתָה',post:'מִן הַקְּעָרָה.',opts:['חָלָב','סֵפֶר','כַּדּוּר']},
    {pre:'שַׂמְנוּ אֶת הַסְּפָרִים בְּתוֹךְ',post:'.',opts:['הַיַּלְקוּט','הַמְּקָרֵר','הַסִּיר']},
    {pre:'בַּחֹרֶף יוֹרֵד',post:'מִן הַשָּׁמַיִם.',opts:['גֶּשֶׁם','כַּדּוּר','דָּג']},
    {pre:'הַצִּפּוֹר בָּנְתָה',post:'עַל הָעֵץ.',opts:['קֵן','מְכוֹנִית','סַפָּה']},
    {pre:'דָּנִי רָכַב עַל',post:'בַּפַּארְק.',opts:['אוֹפַנַּיִם','מְקָרֵר','שֻׁלְחָן']},
    {pre:'בַּלַּיְלָה מְאִירָה',post:'בַּשָּׁמַיִם.',opts:['הַלְּבָנָה','הַשֶּׁמֶשׁ','הַמְּנוֹרָה']},
    {pre:'שָׁתַלְנוּ',post:'בַּגִּנָּה.',opts:['פְּרָחִים','נַעֲלַיִם','כִּסֵּא']},
    {pre:'הַדְּבוֹרָה אוֹסֶפֶת צוּף מִן',post:'.',opts:['הַפֶּרַח','הָאֶבֶן','הַגָּדֵר']},
    {pre:'אַחֲרֵי הַגֶּשֶׁם רָאִינוּ',post:'בַּשָּׁמַיִם.',opts:['קֶשֶׁת','סֻלָּם','כִּסֵּא']},
    {pre:'סַבְתָּא אָפְתָה',post:'טְעִימָה.',opts:['עוּגָה','מִטְרִיָּה','נַעַל']},
    {pre:'הַדָּג שׂוֹחֶה בְּתוֹךְ',post:'.',opts:['הַמַּיִם','הַחוֹל','הָאֲוִיר']},
    {pre:'בַּקַּיִץ חַם וְאוֹכְלִים',post:'.',opts:['גְּלִידָה','מָרָק חַם','גֶּרֶב']},
    {pre:'הַתִּינוֹק יָשֵׁן בְּתוֹךְ',post:'.',opts:['הָעֲרִיסָה','הַמַּחֲבַת','הָאַקְוַרְיוּם']},
    {pre:'חָתַכְנוּ אֶת הַלֶּחֶם עִם',post:'.',opts:['סַכִּין','מַסְרֵק','בַּלּוֹן']},
    {pre:'הָרוֹפֵא בָּדַק אֶת',post:'הַחוֹלֶה.',opts:['הַיֶּלֶד','הַשֻּׁלְחָן','הֶעָנָן']},
    {pre:'נָעַלְנוּ',post:'לִפְנֵי הַטִּיּוּל.',opts:['נַעֲלַיִם','כּוֹבַע','מִשְׁקָפַיִם']},
    {pre:'הַסַּפָּר גָּזַר לִי אֶת',post:'.',opts:['הַשֵּׂעָר','הַמִּטְרִיָּה','הַחַלּוֹן']},
    {pre:'בַּלַּיְלָה חָלַמְתִּי',post:'מָתוֹק.',opts:['חֲלוֹם','שִׁעוּר','מַסְמֵר']},
    {pre:'הַצַּיֶּרֶת צִיְּרָה צִיּוּר עִם',post:'.',opts:['מִכְחוֹל','פַּטִּישׁ','מַגֶּבֶת']},
    {pre:'שָׁמַעְנוּ',post:'יָפֶה בָּרַדְיוֹ.',opts:['שִׁיר','מֶלַח','אָרוֹן']},
    {pre:'אִמָּא סִפְּרָה לִי',post:'לִפְנֵי הַשֵּׁנָה.',opts:['סִפּוּר','מַגְהֵץ','אֶבֶן']},
    {pre:'הַכַּבָּאִים כִּבּוּ אֶת',post:'בְּמַיִם.',opts:['הָאֵשׁ','הָעוּגָה','הַסְּפָרִים']},
    {pre:'הַיַּלְדָּה פָּתְחָה אֶת',post:'וְנִכְנְסָה הַבַּיְתָה.',opts:['הַדֶּלֶת','הַמַּזְלֵג','הַשָּׁמַיִם']},
    {pre:'בַּגַּן רָאִינוּ',post:'קוֹפֵץ מֵעָנָף לְעָנָף.',opts:['סְנָאִי','כִּסֵּא','דְּלִי']},
  ];

  // NO-REPEAT rotation over the bank (shuffled queue; a fresh cycle never opens
  // with the sentence that closed the previous one)
  let _q=null,_last=-1;
  function _next(){
    if(!_q||!_q.length){
      _q=sh(BANK.map((_,i)=>i));
      if(_q[0]===_last&&_q.length>1)_q.push(_q.shift());
    }
    _last=_q.shift();
    return BANK[_last];
  }
  function makeOne(entry){
    const order=sh(entry.opts.map((_,i)=>i));
    return {t:TCZ,pre:entry.pre,post:entry.post,
            opts:order.map(i=>entry.opts[i]),a:order.indexOf(0)+1};
  }
  function makePool(mode){
    if(mode==='clz')return sh(BANK.map(makeOne));
    return [makeOne(_next())];
  }

  const CSS=`
  .cz-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:560px;margin:0 auto}
  .cz-sent{direction:rtl;text-align:center;line-height:1.9;width:100%;
    font-family:'Fredoka One','Heebo',sans-serif;font-weight:400;
    font-size:1.7rem;color:var(--skin-text,#fff);
    text-shadow:0 0 12px rgba(160,190,255,.25);
    background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);
    border-radius:16px;padding:16px 18px;animation:czFade .35s ease}
  @keyframes czFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .cz-gap{display:inline-block;min-width:86px;margin:0 6px;padding:0 10px;
    border-bottom:3px dashed var(--skin-accent,#ffd27d);color:var(--skin-accent,#ffd27d);
    font-weight:700;transition:background .2s}
  .cz-gap.cz-filled{border-bottom-style:solid;background:rgba(76,175,80,.15);border-radius:8px 8px 0 0}
  .cz-opts{display:flex;flex-direction:column;align-items:stretch;gap:9px;width:100%;max-width:430px;direction:rtl}
  .cz-opt{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.5rem;color:var(--skin-text,#fff);
    direction:rtl;text-align:right;line-height:1.5;cursor:pointer;user-select:none;
    background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.25);border-radius:14px;
    padding:9px 14px;display:flex;align-items:center;gap:10px;
    transition:transform .12s,border-color .15s,background .15s,box-shadow .15s}
  .cz-opt:hover{background:rgba(255,255,255,.13)}
  .cz-opt .cz-dot{flex-shrink:0;width:22px;height:22px;border-radius:50%;
    border:2px solid rgba(255,255,255,.5);transition:background .15s,border-color .15s}
  .cz-opt.cz-sel{border-color:var(--skin-primary,#c77dff);background:rgba(199,125,255,.18);
    box-shadow:0 0 14px rgba(199,125,255,.35);transform:translateY(-1px)}
  .cz-opt.cz-sel .cz-dot{background:var(--skin-primary,#c77dff);border-color:var(--skin-primary,#c77dff)}
  .cz-opt.cz-ok{border-color:#4caf50;background:rgba(76,175,80,.2)}
  .cz-opt.cz-ok .cz-dot{background:#4caf50;border-color:#4caf50}
  .cz-opt.cz-err{border-color:#e91e63;background:rgba(233,30,99,.16);animation:czShake .4s ease}
  @keyframes czShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}60%{transform:translateX(5px)}}
  .cz-opt.cz-off{opacity:.6;cursor:default}
  .cz-chk{font-family:'Fredoka One',cursive;font-size:1.35rem;border:0;border-radius:14px;padding:11px 34px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .cz-chk:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .cz-chk:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){.cz-sent{font-size:1.45rem}.cz-opt{font-size:1.3rem;padding:8px 11px}}`;
  function injectStyle(){
    if(document.getElementById('cz-style'))return;
    const st=document.createElement('style');st.id='cz-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{};
    const opts=p.opts||[];
    const correct=(typeof p.a==='number'&&p.a)||1;
    const uid=++_uid;
    let done=false,picked=0;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    root.innerHTML=
      '<div class="cz-root">'+
        '<div class="cz-sent">'+(p.pre||'')+' <span class="cz-gap" id="cz-gap-'+uid+'">___</span> '+(p.post||'')+'</div>'+
        '<div class="cz-opts" role="listbox" aria-label="מִלִּים">'+
          opts.map((o,i)=>'<div class="cz-opt" role="option" data-i="'+(i+1)+'" tabindex="0">'+
            '<span class="cz-dot"></span><span>'+o+'</span></div>').join('')+
        '</div>'+
        '<button class="cz-chk" id="cz-chk-'+uid+'" aria-label="הַגָּשָׁה">✓</button>'+
      '</div>';

    const optEls=Array.prototype.slice.call(root.querySelectorAll('.cz-opt'));
    const gap=root.querySelector('#cz-gap-'+uid);
    const chk=root.querySelector('#cz-chk-'+uid);
    hint('📝 אֵיזוֹ מִלָּה חֲסֵרָה בַּמִּשְׁפָּט? בַּחֲרִי וְלַחֲצִי ✓!');

    function select(i){
      if(done)return;
      picked=i;
      optEls.forEach(el=>el.classList.remove('cz-sel','cz-err'));
      optEls[i-1].classList.add('cz-sel');
    }
    optEls.forEach(el=>{
      el.addEventListener('click',function(){select(+this.getAttribute('data-i'));});
      el.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){e.preventDefault();select(+this.getAttribute('data-i'));}
      });
    });

    function submit(){
      if(done)return;
      if(!picked){hint('בַּחֲרִי מִלָּה קֹדֶם — וְאָז לַחֲצִי ✓ 💗');return;}
      const el=optEls[picked-1];
      if(picked===correct){
        done=true;
        el.classList.remove('cz-sel');el.classList.add('cz-ok');
        optEls.forEach(o=>{if(o!==el)o.classList.add('cz-off');});
        gap.textContent=opts[correct-1];gap.classList.add('cz-filled');   // the word drops into the gap
        chk.disabled=true;
        hint('🎉 בְּדִיּוּק! הַמִּשְׁפָּט הֻשְׁלַם!');
        api.solved();
      }else{
        el.classList.remove('cz-sel');el.classList.add('cz-err');
        api.wrong(picked);
        hint('הַמִּלָּה הַזֹּאת לֹא מַתְאִימָה — קִרְאִי שׁוּב אֶת הַמִּשְׁפָּט 💗');
        const wrongEl=el;
        later(()=>{if(!done){wrongEl.classList.remove('cz-err');picked=0;}},1100);
      }
    }
    chk.addEventListener('click',submit);
    root.addEventListener('keydown',e=>{if(e.key==='Enter'&&!done&&picked){e.preventDefault();submit();}});

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TCZ,
    modes:['clz','sup','mulc'],   // 'clz' = internal tester handle
    aidsReveal:'always',
    make(mode){return mode==='clz'?makePool('clz'):(mode==='sup'||mode==='mulc')?makePool(mode):[];},
    _resetRotation(){_q=null;_last=-1;},   // test hook
    mount,
  };
})();
