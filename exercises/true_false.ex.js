/* ── "נָכוֹן אוֹ לֹא נָכוֹן" — true/false on a two-line vowelled story ──────────
   A READING exercise (one of the reading kinds sharing the one-per-5 reading
   slots in Superman + אַלּוּפָה): a TINY vowelled story (1-2 short lines) and a
   STATEMENT about it — the child decides נָכוֹן ✔ / לֹא נָכוֹן ✖. Same submit
   flow as story_quiz (user spec): TAP to select, press ✓ to SUBMIT, only then
   judged. Forces precise reading (the false statements flip one detail).

   Problem: { t:TTF, lines:[…], stmt, a:1|2 } — a=1 → נָכוֹן is correct, a=2 →
   לֹא נָכוֹן (a → num1). Bank of 24 served by a NO-REPEAT shuffled-queue
   rotation. Interactive: core.js _colxMount into #colx-root; aidsReveal 'always'. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.true_false=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  /* THE BANK — lines (the mini-story), stmt (the claim), truth. False claims flip
     exactly ONE detail of the story (colour/who/what), so she must read closely. */
  const BANK=[
    {lines:['לְיוֹסִי יֵשׁ כֶּלֶב קָטָן וְלָבָן.','הַכֶּלֶב אוֹהֵב לְשַׂחֵק בְּכַדּוּר.'],stmt:'הַכֶּלֶב שֶׁל יוֹסִי שָׁחֹר.',truth:false},
    {lines:['דָּנָה קָטְפָה שְׁלוֹשָׁה פְּרָחִים בַּגִּנָּה.','הִיא נָתְנָה אוֹתָם לְאִמָּא.'],stmt:'דָּנָה נָתְנָה אֶת הַפְּרָחִים לְאִמָּא.',truth:true},
    {lines:['בַּחֹרֶף קַר בַּחוּץ.','לוֹבְשִׁים מְעִיל וְכוֹבַע.'],stmt:'בַּחֹרֶף לוֹבְשִׁים בֶּגֶד יָם.',truth:false},
    {lines:['הַפִּיל הוּא חַיָּה גְּדוֹלָה מְאוֹד.','יֵשׁ לוֹ חֵדֶק אָרֹךְ.'],stmt:'לַפִּיל יֵשׁ חֵדֶק אָרֹךְ.',truth:true},
    {lines:['רוֹנִי אָכַל בַּבֹּקֶר דַּיְסָה עִם דְּבַשׁ.','אַחַר כָּךְ שָׁתָה מִיץ תַּפּוּזִים.'],stmt:'רוֹנִי שָׁתָה מִיץ תַּפּוּחִים.',truth:false},
    {lines:['הַצָּב הוֹלֵךְ לְאַט לְאַט.','הַבַּיִת שֶׁלּוֹ עַל הַגַּב.'],stmt:'הַצָּב סוֹחֵב אֶת הַבַּיִת עַל הַגַּב.',truth:true},
    {lines:['מַיָּה צִיְּרָה שֶׁמֶשׁ צְהֻבָּה וְעָנָן כָּחֹל.','הִיא תָּלְתָה אֶת הַצִּיּוּר עַל הַקִּיר.'],stmt:'מַיָּה צִיְּרָה שֶׁמֶשׁ יְרֻקָּה.',truth:false},
    {lines:['בַּלַּיְלָה רוֹאִים כּוֹכָבִים בַּשָּׁמַיִם.','בַּיּוֹם רוֹאִים אֶת הַשֶּׁמֶשׁ.'],stmt:'בַּלַּיְלָה רוֹאִים כּוֹכָבִים.',truth:true},
    {lines:['לְתָמָר יֵשׁ אוֹפַנַּיִם אֲדֻמִּים.','הִיא רוֹכֶבֶת בַּפַּארְק עִם אַבָּא.'],stmt:'תָּמָר רוֹכֶבֶת בַּפַּארְק לְבַדָּהּ.',truth:false},
    {lines:['הַדְּבוֹרִים מְכִינוֹת דְּבַשׁ מָתוֹק.','הֵן גָּרוֹת בְּכַוֶּרֶת.'],stmt:'הַדְּבוֹרִים גָּרוֹת בְּכַוֶּרֶת.',truth:true},
    {lines:['עוֹמֶר בָּנָה מִגְדָּל גָּבוֹהַּ מִקֻּבִּיּוֹת.','פִּתְאוֹם הַמִּגְדָּל נָפַל!'],stmt:'הַמִּגְדָּל שֶׁל עוֹמֶר נִשְׁאַר עוֹמֵד.',truth:false},
    {lines:['בַּסְּתָו הֶעָלִים נוֹפְלִים מִן הָעֵצִים.','הָרוּחַ מְעִיפָה אוֹתָם בָּאֲוִיר.'],stmt:'בַּסְּתָו הֶעָלִים נוֹפְלִים.',truth:true},
    {lines:['הַקִּפּוֹד מְכֻסֶּה קוֹצִים חַדִּים.','כְּשֶׁהוּא נִבְהָל — הוּא מִתְכַּדֵּר.'],stmt:'לַקִּפּוֹד יֵשׁ קוֹצִים חַדִּים.',truth:true},
    {lines:['נֹעָה בִּקְּרָה אֵצֶל סַבְתָּא בַּקִּבּוּץ.','הֵן קָטְפוּ יַחַד תַּפּוּזִים בַּפַּרְדֵּס.'],stmt:'נֹעָה קָטְפָה בַּנָּנוֹת עִם סַבְתָּא.',truth:false},
    {lines:['הַיַּנְשׁוּף עֵר בַּלַּיְלָה וְיָשֵׁן בַּיּוֹם.','יֵשׁ לוֹ עֵינַיִם גְּדוֹלוֹת וַעֲגֻלּוֹת.'],stmt:'הַיַּנְשׁוּף עֵר בַּלַּיְלָה.',truth:true},
    {lines:['אִיתַי קִבֵּל כֶּלֶב קָטָן בְּמַתָּנָה.','הוּא קָרָא לוֹ שׁוֹקוֹ כִּי הוּא חוּם.'],stmt:'אִיתַי קָרָא לַכֶּלֶב שֶׁלֶג.',truth:false},
    {lines:['הַגֶּזֶר גָּדֵל בְּתוֹךְ הָאֲדָמָה.','רַק הֶעָלִים שֶׁלּוֹ מְצִיצִים הַחוּצָה.'],stmt:'הַגֶּזֶר גָּדֵל עַל עֵץ גָּבוֹהַּ.',truth:false},
    {lines:['רוּת וְיָעֵל בָּנוּ אַרְמוֹן מֵחוֹל בַּחוֹף.','גַּל גָּדוֹל בָּא וְהֶחֱלִיק אֶת הַמִּגְדָּלִים.'],stmt:'הָאַרְמוֹן שֶׁל רוּת וְיָעֵל הָיָה מֵחוֹל.',truth:true},
    {lines:['הַפִּינְגְּוִין הוּא עוֹף שֶׁלֹּא עָף.','אֲבָל הוּא שַׂחְיָן מְצֻיָּן!'],stmt:'הַפִּינְגְּוִין יוֹדֵעַ לָעוּף גָּבוֹהַּ.',truth:false},
    {lines:['אוֹרִי שָׁתַל עַגְבָנִיּוֹת בַּגִּנָּה.','אַחֲרֵי חֹדֶשׁ הֵן הָיוּ אֲדֻמּוֹת וּבְשֵׁלוֹת.'],stmt:'אוֹרִי שָׁתַל עַגְבָנִיּוֹת בַּגִּנָּה.',truth:true},
    {lines:['הַזֶּבְּרָה דּוֹמָה לְסוּס עִם פַּסִּים.','לְכָל זֶבְּרָה יֵשׁ פַּסִּים מִשֶּׁלָּהּ.'],stmt:'לַזֶּבְּרָה יֵשׁ נְקֻדּוֹת סְגֻלּוֹת.',truth:false},
    {lines:['בְּפוּרִים מִתְחַפְּשִׂים וְאוֹכְלִים אָזְנֵי הָמָן.','שִׁירָה הִתְחַפְּשָׂה לְפַרְפַּר וָרֹד.'],stmt:'שִׁירָה הִתְחַפְּשָׂה לְלֵיצָן.',truth:false},
    {lines:['הַלִּוְיָתָן הוּא בַּעַל הַחַיִּים הַגָּדוֹל בָּעוֹלָם.','הוּא נוֹשֵׁם אֲוִיר מֵעַל הַמַּיִם.'],stmt:'הַלִּוְיָתָן נוֹשֵׁם אֲוִיר.',truth:true},
    {lines:['יוֹנָתָן אָפָה לַחְמָנִיּוֹת עִם אַבָּא.','רֵיחַ נִפְלָא הִתְפַּשֵּׁט בְּכָל הַבַּיִת.'],stmt:'יוֹנָתָן אָפָה עוּגִיּוֹת עִם אַבָּא.',truth:false},
  ];
  const OPTS=['נָכוֹן','לֹא נָכוֹן'];   // fixed order — option 1 / option 2

  let _q=null,_last=-1;
  function _next(){
    if(!_q||!_q.length){
      _q=sh(BANK.map((_,i)=>i));
      if(_q[0]===_last&&_q.length>1)_q.push(_q.shift());
    }
    _last=_q.shift();
    return BANK[_last];
  }
  const makeOne=e=>({t:TTF,lines:e.lines.slice(),stmt:e.stmt,a:e.truth?1:2});
  function makePool(mode){
    if(mode==='tf')return sh(BANK.map(makeOne));
    return [makeOne(_next())];
  }

  const CSS=`
  .tf-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:15px;width:100%;max-width:560px;margin:0 auto}
  .tf-story{direction:rtl;text-align:center;line-height:1.8;width:100%;
    font-family:'Fredoka One','Heebo',sans-serif;font-weight:400;
    font-size:1.95rem;color:var(--skin-text,#fff);
    text-shadow:0 0 12px rgba(160,190,255,.25);
    background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);
    border-radius:16px;padding:14px 18px;animation:tfFade .35s ease}
  @keyframes tfFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .tf-stmt{direction:rtl;text-align:center;font-family:'Fredoka One','Heebo',sans-serif;
    font-size:1.9rem;color:var(--skin-accent,#ffd27d);line-height:1.6;padding:0 6px;
    text-shadow:0 0 10px rgba(255,210,125,.35)}
  .tf-opts{display:flex;gap:14px;direction:rtl;flex-wrap:wrap;justify-content:center}
  .tf-opt{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.85rem;color:var(--skin-text,#fff);
    cursor:pointer;user-select:none;min-width:150px;text-align:center;
    background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.25);border-radius:16px;
    padding:13px 22px;display:flex;align-items:center;justify-content:center;gap:9px;
    transition:transform .12s,border-color .15s,background .15s,box-shadow .15s}
  .tf-opt:hover{background:rgba(255,255,255,.13)}
  .tf-opt .tf-ico{font-size:1.45rem}
  .tf-opt.tf-sel{border-color:var(--skin-primary,#c77dff);background:rgba(199,125,255,.18);
    box-shadow:0 0 14px rgba(199,125,255,.35);transform:translateY(-1px)}
  .tf-opt.tf-ok{border-color:#4caf50;background:rgba(76,175,80,.2)}
  .tf-opt.tf-err{border-color:#e91e63;background:rgba(233,30,99,.16);animation:tfShake .4s ease}
  @keyframes tfShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}60%{transform:translateX(5px)}}
  .tf-opt.tf-off{opacity:.6;cursor:default}
  .tf-chk{font-family:'Fredoka One',cursive;font-size:1.35rem;border:0;border-radius:14px;padding:11px 34px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .tf-chk:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .tf-chk:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){.tf-story{font-size:1.6rem}.tf-stmt{font-size:1.6rem}.tf-opt{font-size:1.55rem;min-width:120px}}`;
  function injectStyle(){
    if(document.getElementById('tf-style'))return;
    const st=document.createElement('style');st.id='tf-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{};
    const correct=(typeof p.a==='number'&&p.a)||1;
    const uid=++_uid;
    let done=false,picked=0;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    root.innerHTML=
      '<div class="tf-root">'+
        '<div class="tf-story">'+(p.lines||[]).join('<br>')+'</div>'+
        '<div class="tf-stmt">❓ '+(p.stmt||'')+'</div>'+
        '<div class="tf-opts" role="listbox" aria-label="נָכוֹן אוֹ לֹא">'+
          '<div class="tf-opt" role="option" data-i="1" tabindex="0"><span class="tf-ico">✔️</span><span>'+OPTS[0]+'</span></div>'+
          '<div class="tf-opt" role="option" data-i="2" tabindex="0"><span class="tf-ico">✖️</span><span>'+OPTS[1]+'</span></div>'+
        '</div>'+
        '<button class="tf-chk" id="tf-chk-'+uid+'" aria-label="הַגָּשָׁה">✓</button>'+
      '</div>';

    const optEls=Array.prototype.slice.call(root.querySelectorAll('.tf-opt'));
    const chk=root.querySelector('#tf-chk-'+uid);
    hint('✔️✖️ קִרְאִי אֶת הַסִּפּוּר — הַמִּשְׁפָּט נָכוֹן אוֹ לֹא? בַּחֲרִי וְלַחֲצִי ✓!');

    function select(i){
      if(done)return;
      picked=i;
      optEls.forEach(el=>el.classList.remove('tf-sel','tf-err'));
      optEls[i-1].classList.add('tf-sel');
    }
    optEls.forEach(el=>{
      el.addEventListener('click',function(){select(+this.getAttribute('data-i'));});
      el.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){e.preventDefault();select(+this.getAttribute('data-i'));}
      });
    });

    function submit(){
      if(done)return;
      if(!picked){hint('בַּחֲרִי נָכוֹן אוֹ לֹא נָכוֹן — וְאָז לַחֲצִי ✓ 💗');return;}
      const el=optEls[picked-1];
      if(picked===correct){
        done=true;
        el.classList.remove('tf-sel');el.classList.add('tf-ok');
        optEls.forEach(o=>{if(o!==el)o.classList.add('tf-off');});
        chk.disabled=true;
        hint('🎉 צוֹדֶקֶת! קָרָאת בְּדִיּוּק!');
        api.solved();
      }else{
        el.classList.remove('tf-sel');el.classList.add('tf-err');
        api.wrong(picked);
        hint('קִרְאִי שׁוּב אֶת הַסִּפּוּר — מָה בֶּאֱמֶת כָּתוּב שָׁם? 💗');
        const wrongEl=el;
        later(()=>{if(!done){wrongEl.classList.remove('tf-err');picked=0;}},1100);
      }
    }
    chk.addEventListener('click',submit);
    root.addEventListener('keydown',e=>{if(e.key==='Enter'&&!done&&picked){e.preventDefault();submit();}});

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TTF,
    modes:['tf','sup','mulc'],   // 'tf' = internal tester handle
    aidsReveal:'always',
    make(mode){return mode==='tf'?makePool('tf'):(mode==='sup'||mode==='mulc')?makePool(mode):[];},
    _resetRotation(){_q=null;_last=-1;},   // test hook
    mount,
  };
})();
