/* ── "אֵיזוֹ מִלָּה מִתְחָרֶזֶת?" — rhyme matching (phonological awareness) ────────
   A READING exercise (one of the reading kinds sharing the one-per-4 reading
   slots in Superman + אַלּוּפָה, and part of the "שָׂפָה 📖" game): a CUE card shows
   a picture + its vowelled word (🏺 כַּד) and THREE option cards (picture + word)
   offer candidates — exactly ONE rhymes with the cue (✋ יָד). TAP to select,
   press ✓ to SUBMIT (the story_quiz/cloze flow). On a mistake the SOUND AID is
   revealed: the cue's rhyme ending spelled out ("נִגְמֶרֶת בַּצְּלִיל אַד"), then she
   re-picks. This trains hearing the END of a word — the single strongest
   pre-reading skill at age 7, and the one kind of language card that is NOT
   reading-for-meaning (so it complements story_quiz/cloze/true_false).

   Problem: { t:TRH, cue:{e,w}, sound, opts:[{e,w}×3], a:1-based correct } (a →
   num1, the report's "correct"). 24 rhyme PAIRS; either member may be the cue
   and the other is then the answer, so a pair never looks the same twice.
   Served by a NO-REPEAT shuffled-queue rotation over the pairs.

   UNAMBIGUITY (the cloze/sent_order lesson — never two valid answers): the two
   distractors are drawn from a separate DISTRACTORS pool and filtered by FINAL
   LETTER — a distractor may not end with the pair's final letter (nor with the
   other distractor's), so it cannot rhyme with the cue even loosely. The pair
   words and the distractor pool are disjoint sets (words AND emoji).
   Interactive: mounted by core.js _colxMount into #colx-root; aidsReveal 'always'. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.rhyme=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  /* THE RHYME BANK — two words that end in the SAME sound, both concrete and
     picturable. `sound` = that ending spelled as a syllable (shown as the aid on
     a mistake); `end` = the normalized final letter (ן→נ, ף→פ), the mechanical
     key used to keep distractors from rhyming. */
  const BANK=[
    {a:{e:'🏺',w:'כַּד'},      b:{e:'✋',w:'יָד'},        sound:'אַד', end:'ד'},
    {a:{e:'🐟',w:'דָּג'},      b:{e:'🎉',w:'חַג'},        sound:'אַג', end:'ג'},
    {a:{e:'⭐',w:'כּוֹכָב'},    b:{e:'🥛',w:'חָלָב'},      sound:'אָב', end:'ב'},
    {a:{e:'🐴',w:'סוּס'},      b:{e:'🚌',w:'אוֹטוֹבּוּס'},  sound:'וּס', end:'ס'},
    {a:{e:'🐘',w:'פִּיל'},      b:{e:'🚀',w:'טִיל'},       sound:'אִיל',end:'ל'},
    {a:{e:'🎈',w:'בַּלּוֹן'},    b:{e:'⏰',w:'שָׁעוֹן'},     sound:'וֹן', end:'נ'},
    {a:{e:'🎵',w:'שִׁיר'},      b:{e:'🏙️',w:'עִיר'},       sound:'אִיר',end:'ר'},
    {a:{e:'🐦',w:'צִפּוֹר'},    b:{e:'💡',w:'אוֹר'},       sound:'וֹר', end:'ר'},
    {a:{e:'🐒',w:'קוֹף'},      b:{e:'🏖️',w:'חוֹף'},       sound:'וֹף', end:'פ'},
    {a:{e:'⛰️',w:'הַר'},       b:{e:'🐭',w:'עַכְבָּר'},     sound:'אַר', end:'ר'},
    {a:{e:'☁️',w:'עָנָן'},      b:{e:'🌳',w:'גַּן'},        sound:'אַן', end:'נ'},
    {a:{e:'🐄',w:'פָּרָה'},     b:{e:'🎸',w:'גִּיטָרָה'},    sound:'רָה', end:'ה'},
    {a:{e:'❤️',w:'לֵב'},       b:{e:'🐺',w:'זְאֵב'},       sound:'אֵב', end:'ב'},
    {a:{e:'🚩',w:'דֶּגֶל'},     b:{e:'🦵',w:'רֶגֶל'},       sound:'גֶל', end:'ל'},
    {a:{e:'📞',w:'טֶלֶפוֹן'},   b:{e:'🥒',w:'מְלָפְפוֹן'},   sound:'פוֹן',end:'נ'},
    {a:{e:'🐫',w:'גָּמָל'},     b:{e:'🧺',w:'סַל'},         sound:'אַל', end:'ל'},
    {a:{e:'🐝',w:'דְּבוֹרָה'},   b:{e:'🕎',w:'מְנוֹרָה'},     sound:'וֹרָה',end:'ה'},
    {a:{e:'👃',w:'אַף'},       b:{e:'🥄',w:'כַּף'},        sound:'אַף', end:'פ'},
    {a:{e:'🐊',w:'תַּנִּין'},    b:{e:'🔪',w:'סַכִּין'},      sound:'אִין',end:'נ'},
    {a:{e:'✈️',w:'מָטוֹס'},    b:{e:'🥤',w:'כּוֹס'},       sound:'וֹס', end:'ס'},
    {a:{e:'🎩',w:'כּוֹבַע'},    b:{e:'🎨',w:'צֶבַע'},       sound:'בַע', end:'ע'},
    {a:{e:'🎁',w:'מַתָּנָה'},    b:{e:'🖼️',w:'תְּמוּנָה'},    sound:'נָה', end:'ה'},
    {a:{e:'🧀',w:'גְּבִינָה'},   b:{e:'⛵',w:'סְפִינָה'},     sound:'אִינָה',end:'ה'},
    {a:{e:'🤴',w:'מֶלֶךְ'},     b:{e:'🛣️',w:'דֶּרֶךְ'},      sound:'אֶךְ', end:'כ'},
  ];

  /* THE DISTRACTOR POOL — familiar picturable words, NONE of them a bank word
     (and no shared emoji). `end` = normalized final letter; a distractor is only
     offered when its `end` differs from the pair's `end`, so it never rhymes. */
  const DISTRACTORS=[
    {e:'🌸',w:'פֶּרַח',   end:'ח'},
    {e:'🏠',w:'בַּיִת',    end:'ת'},
    {e:'📖',w:'סֵפֶר',    end:'ר'},
    {e:'🍎',w:'תַּפּוּחַ',   end:'ח'},
    {e:'☀️',w:'שֶׁמֶשׁ',    end:'ש'},
    {e:'🍌',w:'בָּנָנָה',   end:'ה'},
    {e:'🐱',w:'חָתוּל',   end:'ל'},
    {e:'🌙',w:'יָרֵחַ',    end:'ח'},
    {e:'👑',w:'כֶּתֶר',    end:'ר'},
    {e:'🧦',w:'גֶּרֶב',    end:'ב'},
    {e:'🍦',w:'גְּלִידָה',  end:'ה'},
    {e:'🦋',w:'פַּרְפַּר',   end:'ר'},
    {e:'🚪',w:'דֶּלֶת',    end:'ת'},
    {e:'⚽',w:'כַּדּוּר',   end:'ר'},
    {e:'🍇',w:'עֲנָבִים',  end:'מ'},
    {e:'🚁',w:'מַסּוֹק',   end:'ק'},
    {e:'🐢',w:'צָב',      end:'ב'},
    {e:'🍕',w:'פִּיצָה',   end:'ה'},
    {e:'🥁',w:'תֹּף',      end:'פ'},
    {e:'🌽',w:'תִּירָס',   end:'ס'},
  ];

  // NO-REPEAT rotation over the PAIRS (shuffled queue; a fresh cycle never opens
  // with the pair that closed the previous one) — she must not memorise answers
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
    // either member may be the cue; the other is then the rhyming answer
    const flip=Math.random()<.5;
    const cue=flip?entry.b:entry.a, ans=flip?entry.a:entry.b;
    // two distractors that can't rhyme: different final letter from the pair AND
    // from each other
    const bad=[];
    for(const d of sh(DISTRACTORS.slice())){
      if(d.end===entry.end)continue;
      if(bad.some(x=>x.end===d.end))continue;
      bad.push(d);
      if(bad.length===2)break;
    }
    const order=sh([{e:ans.e,w:ans.w},{e:bad[0].e,w:bad[0].w},{e:bad[1].e,w:bad[1].w}].map((o,i)=>({o,i})));
    return {t:TRH,cue:{e:cue.e,w:cue.w},sound:entry.sound,
            opts:order.map(x=>x.o),a:order.findIndex(x=>x.i===0)+1};
  }
  function makePool(mode){
    if(mode==='rhy')return sh(BANK.map(makeOne));
    return [makeOne(_next())];
  }

  const CSS=`
  .rh-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:560px;margin:0 auto}
  .rh-title{direction:rtl;text-align:center;font-family:'Fredoka One','Heebo',sans-serif;font-size:1.25rem;
    color:var(--skin-text,#fff);text-shadow:0 0 10px rgba(160,190,255,.3)}
  .rh-cue{direction:rtl;display:flex;align-items:center;justify-content:center;gap:14px;
    background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.2);border-radius:18px;
    padding:10px 26px;animation:rhFade .35s ease}
  @keyframes rhFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .rh-cue-e{font-size:3rem;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3))}
  .rh-cue-w{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.9rem;
    color:var(--skin-accent,#ffd27d);text-shadow:0 0 12px rgba(255,210,125,.35)}
  .rh-sound{display:none;direction:rtl;text-align:center;font-family:'Fredoka One','Heebo',sans-serif;
    font-size:1.1rem;line-height:1.5;color:var(--skin-accent,#ffd27d);
    background:rgba(255,210,125,.12);border:1.5px dashed rgba(255,210,125,.6);
    border-radius:14px;padding:7px 15px}
  .rh-sound.rh-on{display:block;animation:rhFade .3s ease}
  .rh-sound b{font-size:1.35rem}
  .rh-opts{display:flex;gap:14px;justify-content:center;direction:rtl;flex-wrap:wrap}
  .rh-opt{width:122px;border-radius:18px;cursor:pointer;user-select:none;
    background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.25);
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
    padding:11px 6px;transition:transform .12s,border-color .15s,background .15s,box-shadow .15s}
  .rh-opt:hover{background:rgba(255,255,255,.13)}
  .rh-opt .rh-e{font-size:2.6rem;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3))}
  .rh-opt .rh-w{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.25rem;color:var(--skin-text,#fff)}
  .rh-opt.rh-sel{border-color:var(--skin-primary,#c77dff);background:rgba(199,125,255,.18);
    box-shadow:0 0 14px rgba(199,125,255,.35);transform:translateY(-2px)}
  .rh-opt.rh-ok{border-color:#4caf50;background:rgba(76,175,80,.2)}
  .rh-opt.rh-err{border-color:#e91e63;background:rgba(233,30,99,.16);animation:rhShake .4s ease}
  @keyframes rhShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}60%{transform:translateX(5px)}}
  .rh-opt.rh-off{opacity:.6;cursor:default}
  .rh-chk{font-family:'Fredoka One',cursive;font-size:1.35rem;border:0;border-radius:14px;padding:11px 34px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .rh-chk:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .rh-chk:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){.rh-cue-e{font-size:2.4rem}.rh-cue-w{font-size:1.5rem}
    .rh-opt{width:98px;padding:9px 5px}.rh-opt .rh-e{font-size:2.1rem}.rh-opt .rh-w{font-size:1.05rem}}`;
  function injectStyle(){
    if(document.getElementById('rh-style'))return;
    const st=document.createElement('style');st.id='rh-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{};
    const cue=p.cue||{e:'🎵',w:''};
    const opts=p.opts||[];
    const correct=(typeof p.a==='number'&&p.a)||1;
    const uid=++_uid;
    let done=false,picked=0;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    root.innerHTML=
      '<div class="rh-root">'+
        '<div class="rh-title">🎵 אֵיזוֹ מִלָּה מִתְחָרֶזֶת עִם הַמִּלָּה הַזֹּאת?</div>'+
        '<div class="rh-cue"><span class="rh-cue-e">'+cue.e+'</span><span class="rh-cue-w">'+cue.w+'</span></div>'+
        '<div class="rh-sound" id="rh-snd-'+uid+'">🔊 הַמִּלָּה '+cue.w+' נִגְמֶרֶת בַּצְּלִיל <b>'+(p.sound||'')+'</b>'+
          '<br>אֵיזוֹ מִלָּה נִגְמֶרֶת גַּם כָּךְ?</div>'+
        '<div class="rh-opts" role="listbox" aria-label="מִלִּים">'+
          opts.map((o,i)=>'<div class="rh-opt" role="option" data-i="'+(i+1)+'" tabindex="0">'+
            '<span class="rh-e">'+o.e+'</span><span class="rh-w">'+o.w+'</span></div>').join('')+
        '</div>'+
        '<button class="rh-chk" id="rh-chk-'+uid+'" aria-label="הַגָּשָׁה">✓</button>'+
      '</div>';

    const optEls=Array.prototype.slice.call(root.querySelectorAll('.rh-opt'));
    const snd=root.querySelector('#rh-snd-'+uid);
    const chk=root.querySelector('#rh-chk-'+uid);
    hint('🎵 אֵיזוֹ מִלָּה נִשְׁמַעַת דּוֹמֶה בַּסּוֹף? בַּחֲרִי וְלַחֲצִי ✓!');

    function select(i){
      if(done)return;
      picked=i;
      optEls.forEach(el=>el.classList.remove('rh-sel','rh-err'));
      optEls[i-1].classList.add('rh-sel');
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
        el.classList.remove('rh-sel');el.classList.add('rh-ok');
        optEls.forEach(o=>{if(o!==el)o.classList.add('rh-off');});
        chk.disabled=true;
        hint('🎉 מִתְחָרֵז מְעֻלֶּה! שָׁמַעְתְּ אֶת סוֹף הַמִּלָּה!');
        api.solved();
      }else{
        el.classList.remove('rh-sel');el.classList.add('rh-err');
        if(snd)snd.classList.add('rh-on');          // the SOUND AID (the rhyme ending)
        api.wrong(picked);
        hint('הַקְשִׁיבִי לַסּוֹף שֶׁל הַמִּלָּה — נַסִּי שׁוּב 💗');
        const wrongEl=el;
        later(()=>{if(!done){wrongEl.classList.remove('rh-err');picked=0;}},1100);
      }
    }
    chk.addEventListener('click',submit);
    root.addEventListener('keydown',e=>{if(e.key==='Enter'&&!done&&picked){e.preventDefault();submit();}});

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TRH,
    modes:['rhy','lang','sup','mulc'],   // 'rhy' = internal tester handle
    aidsReveal:'always',
    make(mode){return mode==='rhy'?makePool('rhy')
      :(mode==='sup'||mode==='mulc'||mode==='lang')?makePool(mode):[];},
    _resetRotation(){_q=null;_last=-1;},   // test hook
    _bank:BANK,_distractors:DISTRACTORS,   // test hooks (unambiguity checks)
    mount,
  };
})();
