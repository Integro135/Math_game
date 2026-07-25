/* ── "סַדֵּר אֶת הַמִּשְׁפָּט" — rebuild a scrambled vowelled sentence ───────────
   A READING exercise (one of the reading kinds sharing the one-per-5 reading
   slots in Superman + אַלּוּפָה): a short vowelled sentence (4-5 words) is shown
   as SCRAMBLED word pills in a bank; the child TAPS words in order — each hops
   down into the answer strip (Duolingo-style; tapping a placed word sends it
   back) — then presses ✓ to SUBMIT (the reading-exercise flow): the built
   sentence is compared to the original. Correct → api.solved(); wrong →
   api.wrong + the words STAY so she can fix (like triple_sum). Trains syntax +
   reading. The scramble is guaranteed ≠ the correct order.

   Problem: { t:TSO, words:[…correct order], scr:[…scrambled], a:word count }
   (a → num1). Bank of 12 sentences via a NO-REPEAT shuffled-queue rotation.
   Interactive: core.js _colxMount into #colx-root; aidsReveal 'always'. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.sent_order=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  /* THE BANK — simple 4-5 word sentences with ONE natural order (no duplicate
     words, so the string comparison is unambiguous) */
  const BANK=[
    'דָּנָה אוֹכֶלֶת תַּפּוּחַ אָדֹם',
    'הַכֶּלֶב רָץ אֶל הַגִּנָּה',
    'אִמָּא קוֹרֵאת סִפּוּר לַיְּלָדִים',
    'הַשֶּׁמֶשׁ זוֹרַחַת בַּשָּׁמַיִם הַכְּחֻלִּים',
    'יוֹסִי שׁוֹתֶה מִיץ תַּפּוּזִים קַר',
    'הַחָתוּל יָשֵׁן עַל הַסַּפָּה',
    'רוֹנִי מְצַיֶּרֶת פַּרְפַּר יָפֶה',
    'אַבָּא מְבַשֵּׁל מָרָק טָעִים',
    'הַיְּלָדִים מְשַׂחֲקִים בַּכַּדּוּר בֶּחָצֵר',
    'סַבָּא נוֹתֵן לִי מַתָּנָה גְּדוֹלָה',
    'הַצִּפּוֹר שָׁרָה שִׁיר יָפֶה',
    'תָּמָר קוֹטֶפֶת פְּרָחִים בַּשָּׂדֶה',
  ];

  let _q=null,_last=-1;
  function _next(){
    if(!_q||!_q.length){
      _q=sh(BANK.map((_,i)=>i));
      if(_q[0]===_last&&_q.length>1)_q.push(_q.shift());
    }
    _last=_q.shift();
    return BANK[_last];
  }
  function makeOne(sentence){
    const words=sentence.split(' ');
    let scr=sh(words.slice()),guard=0;
    while(scr.join(' ')===sentence&&guard++<20)scr=sh(words.slice());   // never pre-solved
    return {t:TSO,words,scr,a:words.length};
  }
  function makePool(mode){
    if(mode==='so')return sh(BANK.map(makeOne));
    return [makeOne(_next())];
  }

  const CSS=`
  .so-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:560px;margin:0 auto}
  .so-title{direction:rtl;font-family:'Fredoka One','Heebo',sans-serif;font-size:1.25rem;
    color:var(--skin-text,#fff);text-shadow:0 0 10px rgba(160,190,255,.3)}
  /* the answer STRIP — the sentence being built (RTL: first word lands rightmost) */
  .so-strip{direction:rtl;display:flex;flex-wrap:wrap;gap:9px;justify-content:center;align-items:center;
    width:100%;min-height:62px;padding:10px 12px;border-radius:16px;
    background:rgba(255,255,255,.07);border:2px dashed rgba(255,210,125,.5)}
  .so-strip.so-ok{border-style:solid;border-color:#4caf50;background:rgba(76,175,80,.12)}
  .so-strip.so-err{border-color:#e91e63;animation:soShake .4s ease}
  @keyframes soShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}60%{transform:translateX(5px)}}
  .so-strip .so-hintword{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.05rem;color:rgba(255,255,255,.45)}
  /* the word BANK */
  .so-bank{direction:rtl;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;min-height:52px}
  .so-word{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.3rem;color:var(--skin-text,#fff);
    cursor:pointer;user-select:none;
    background:rgba(255,255,255,.09);border:2px solid rgba(255,255,255,.3);border-radius:999px;
    padding:8px 18px;transition:transform .12s,border-color .15s,background .15s}
  .so-word:hover{background:rgba(255,255,255,.15);transform:translateY(-1px)}
  .so-strip .so-word{border-color:var(--skin-primary,#c77dff);background:rgba(199,125,255,.16)}
  .so-chk{font-family:'Fredoka One',cursive;font-size:1.35rem;border:0;border-radius:14px;padding:11px 34px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .so-chk:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .so-chk:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){.so-word{font-size:1.1rem;padding:7px 14px}}`;
  function injectStyle(){
    if(document.getElementById('so-style'))return;
    const st=document.createElement('style');st.id='so-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{};
    const words=p.words||[];
    const scr=p.scr||words.slice();
    const target=words.join(' ');
    const uid=++_uid;
    let done=false;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    root.innerHTML=
      '<div class="so-root">'+
        '<div class="so-title">סַדְּרִי אֶת הַמִּלִּים לְמִשְׁפָּט נָכוֹן 🔀</div>'+
        '<div class="so-strip" id="so-strip-'+uid+'" aria-label="הַמִּשְׁפָּט שֶׁלָּךְ">'+
          '<span class="so-hintword">לַחֲצִי עַל הַמִּלִּים לְפִי הַסֵּדֶר…</span></div>'+
        '<div class="so-bank" id="so-bank-'+uid+'">'+
          scr.map((w,i)=>'<div class="so-word" data-k="'+i+'">'+w+'</div>').join('')+
        '</div>'+
        '<button class="so-chk" id="so-chk-'+uid+'" aria-label="הַגָּשָׁה">✓</button>'+
      '</div>';

    const strip=root.querySelector('#so-strip-'+uid);
    const bank=root.querySelector('#so-bank-'+uid);
    const chk=root.querySelector('#so-chk-'+uid);
    const placeholder=strip.querySelector('.so-hintword');
    hint('🔀 לַחֲצִי עַל הַמִּלִּים לְפִי הַסֵּדֶר — וְאָז ✓ לְהַגִּישׁ!');

    function refreshPlaceholder(){
      placeholder.style.display=strip.querySelector('.so-word')?'none':'';
    }
    // tap a bank word → append to the strip; tap a strip word → back to the bank
    root.addEventListener('click',function(e){
      if(done)return;
      const w=e.target.closest('.so-word');
      if(!w)return;
      strip.classList.remove('so-err');
      if(w.parentNode===bank)strip.appendChild(w);
      else bank.appendChild(w);
      refreshPlaceholder();
    });

    function built(){
      return Array.prototype.map.call(strip.querySelectorAll('.so-word'),el=>el.textContent).join(' ');
    }
    function submit(){
      if(done)return;
      const placed=strip.querySelectorAll('.so-word').length;
      if(placed<words.length){hint('שִׂימִי אֶת כָּל הַמִּלִּים בַּמִּשְׁפָּט — וְאָז ✓ 💗');return;}
      if(built()===target){
        done=true;
        strip.classList.add('so-ok');chk.disabled=true;
        hint('🎉 מִשְׁפָּט מֻשְׁלָם! קָרָאת וְסִדַּרְתְּ נֶהְדָּר!');
        api.solved();
      }else{
        strip.classList.add('so-err');
        api.wrong(placed);
        hint('כִּמְעַט! קִרְאִי אֶת הַמִּשְׁפָּט שֶׁבָּנִית — מָה לֹא בַּמָּקוֹם? 💗');
        later(()=>{if(!done)strip.classList.remove('so-err');},900);
      }
    }
    chk.addEventListener('click',submit);
    root.addEventListener('keydown',e=>{if(e.key==='Enter'&&!done){e.preventDefault();submit();}});

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TSO,
    modes:['so','sup','mulc'],   // 'so' = internal tester handle
    aidsReveal:'always',
    make(mode){return mode==='so'?makePool('so'):(mode==='sup'||mode==='mulc')?makePool(mode):[];},
    _resetRotation(){_q=null;_last=-1;},   // test hook
    mount,
  };
})();
