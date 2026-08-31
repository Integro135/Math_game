/* ── "הַתְאֵם מִלָּה לְתְמוּנָה" — match vowelled words to pictures ──────────────
   A READING exercise (one of the SIX reading kinds sharing the READING_SLOTS=5
   one-per-4 reading slots in Superman + אַלּוּפָה, and a kind of the שָׂפָה 📖
   game): THREE picture cards (emoji) and THREE vowelled
   word pills — the child DRAGS each word onto its picture (genuine pointer-drag,
   mouse + touch, like compare.ex.js; a floating ghost + rect hit-test). A
   TAP-TAP fallback also works: tap a word (select) then tap a picture. A correct
   drop LOCKS the word under its picture (green); a wrong drop shakes + counts a
   mistake (api.wrong). All three matched → api.solved(). First sight-reading.

   Problem: { t:TWM, pairs:[{e,w}×3], a:3 } (a = pair count → num1, the report's
   "correct"). Pairs come from a 30-pair bank via a NO-REPEAT shuffled-queue
   rotation (3 popped per card — no pair repeats until the bank cycles).
   Interactive: core.js _colxMount into #colx-root; aidsReveal 'always'. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.word_match=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

  /* THE BANK — emoji + its vowelled word */
  const BANK=[
    {e:'🍎',w:'תַּפּוּחַ'},{e:'🌙',w:'יָרֵחַ'},{e:'🐟',w:'דָּג'},{e:'🌸',w:'פֶּרַח'},
    {e:'🏠',w:'בַּיִת'},{e:'☀️',w:'שֶׁמֶשׁ'},{e:'🐘',w:'פִּיל'},{e:'📖',w:'סֵפֶר'},
    {e:'🚗',w:'מְכוֹנִית'},{e:'🎈',w:'בַּלּוֹן'},{e:'🐱',w:'חָתוּל'},{e:'🍌',w:'בָּנָנָה'},
    {e:'⭐',w:'כּוֹכָב'},{e:'🌳',w:'עֵץ'},{e:'👑',w:'כֶּתֶר'},{e:'🧦',w:'גֶּרֶב'},
    {e:'🍦',w:'גְּלִידָה'},{e:'🦋',w:'פַּרְפַּר'},
    {e:'🐶',w:'כֶּלֶב'},{e:'🍉',w:'אֲבַטִּיחַ'},{e:'👟',w:'נַעַל'},{e:'🔑',w:'מַפְתֵּחַ'},
    {e:'🐸',w:'צְפַרְדֵּעַ'},{e:'☂️',w:'מִטְרִיָּה'},{e:'🍓',w:'תּוּת'},{e:'🚂',w:'רַכֶּבֶת'},
    {e:'🧀',w:'גְּבִינָה'},{e:'🐢',w:'צָב'},{e:'✈️',w:'מָטוֹס'},{e:'🥕',w:'גֶּזֶר'},
  ];

  // NO-REPEAT rotation: pop 3 pairs per card; the queue reshuffles when short
  let _q=null;
  function _next3(){
    if(!_q||_q.length<3)_q=sh(BANK.map((_,i)=>i));
    return _q.splice(0,3).map(i=>BANK[i]);
  }
  function makePool(mode){
    if(mode==='wm')return [1,2,3,4].map(()=>({t:TWM,pairs:_next3(),a:3}));
    return [{t:TWM,pairs:_next3(),a:3}];
  }

  const CSS=`
  .wm-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:20px;width:100%;max-width:560px;margin:0 auto}
  .wm-title{direction:rtl;font-family:'Fredoka One','Heebo',sans-serif;font-size:1.7rem;
    color:var(--skin-text,#fff);text-shadow:0 0 10px rgba(160,190,255,.3)}
  .wm-pics{display:flex;gap:16px;justify-content:center;direction:rtl;flex-wrap:wrap}
  .wm-pic{width:118px;min-height:118px;border-radius:18px;cursor:pointer;user-select:none;
    background:rgba(255,255,255,.08);border:2px dashed rgba(255,255,255,.35);
    display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:6px;
    padding:10px 6px;transition:border-color .15s,background .15s,transform .12s}
  .wm-pic .wm-emoji{font-size:3rem;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3))}
  .wm-pic .wm-slot{min-height:34px;display:flex;align-items:center;justify-content:center}
  .wm-pic.wm-hot{border-color:var(--skin-accent,#ffd27d);background:rgba(255,210,125,.14);transform:scale(1.04)}
  .wm-pic.wm-done{border-style:solid;border-color:#4caf50;background:rgba(76,175,80,.14);cursor:default}
  .wm-pic.wm-shake{animation:wmShake .4s ease}
  @keyframes wmShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}60%{transform:translateX(5px)}}
  .wm-words{display:flex;gap:12px;justify-content:center;direction:rtl;flex-wrap:wrap;min-height:48px}
  .wm-word{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.85rem;color:var(--skin-text,#fff);
    cursor:grab;user-select:none;touch-action:none;
    background:rgba(255,255,255,.09);border:2px solid rgba(255,255,255,.3);border-radius:999px;
    padding:8px 20px;transition:border-color .15s,background .15s,box-shadow .15s,opacity .2s}
  .wm-word.wm-sel{border-color:var(--skin-primary,#c77dff);background:rgba(199,125,255,.2);
    box-shadow:0 0 14px rgba(199,125,255,.4)}
  .wm-word.wm-used{display:none}
  .wm-placed{font-family:'Fredoka One','Heebo',sans-serif;font-size:1.6rem;color:#a5ffc2;
    background:rgba(76,175,80,.18);border:1.5px solid rgba(76,175,80,.6);border-radius:999px;padding:3px 13px}
  .wm-ghost{position:fixed;z-index:9999;pointer-events:none;opacity:.92;transform:translate(-50%,-50%);
    font-family:'Fredoka One','Heebo',sans-serif;font-size:1.85rem;color:#fff;
    background:rgba(157,78,221,.9);border:2px solid #fff;border-radius:999px;padding:8px 20px;
    box-shadow:0 10px 26px rgba(0,0,0,.4)}
  @media(max-width:480px){.wm-pic{width:96px;min-height:104px}.wm-pic .wm-emoji{font-size:2.4rem}.wm-word{font-size:1.55rem;padding:7px 15px}}`;
  function injectStyle(){
    if(document.getElementById('wm-style'))return;
    const st=document.createElement('style');st.id='wm-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{};
    const pairs=p.pairs||BANK.slice(0,3).map(x=>({e:x.e,w:x.w}));
    const uid=Math.random().toString(36).slice(2,7);
    let done=false,matched=0,selWord=null;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    // pictures keep the pair order; the WORD pills are shuffled
    const wordOrder=sh(pairs.map((_,i)=>i));
    root.innerHTML=
      '<div class="wm-root" id="wm-'+uid+'">'+
        '<div class="wm-title">גִּרְרִי כָּל מִלָּה אֶל הַתְּמוּנָה שֶׁלָּהּ 🖼️</div>'+
        '<div class="wm-pics">'+pairs.map((pr,i)=>
          '<div class="wm-pic" data-i="'+i+'"><span class="wm-emoji">'+pr.e+'</span><span class="wm-slot"></span></div>').join('')+
        '</div>'+
        '<div class="wm-words">'+wordOrder.map(i=>
          '<div class="wm-word" data-i="'+i+'">'+pairs[i].w+'</div>').join('')+
        '</div>'+
      '</div>';

    const pics=Array.prototype.slice.call(root.querySelectorAll('.wm-pic'));
    const words=Array.prototype.slice.call(root.querySelectorAll('.wm-word'));
    hint('🖼️ גִּרְרִי (אוֹ לַחֲצִי מִלָּה וְאָז תְּמוּנָה) — הַתְאִימִי כָּל מִלָּה!');

    function tryMatch(wordEl,picEl){
      if(done||!wordEl||!picEl||picEl.classList.contains('wm-done'))return;
      // belt-and-braces: scoring may open the success screen / sad modal, and a
      // z-9999 ghost must never be left floating over either
      killGhost();
      const wi=+wordEl.getAttribute('data-i'), pi=+picEl.getAttribute('data-i');
      if(wi===pi){                                        // correct — lock it in
        wordEl.classList.remove('wm-sel');wordEl.classList.add('wm-used');
        picEl.classList.add('wm-done');
        picEl.querySelector('.wm-slot').innerHTML='<span class="wm-placed">'+pairs[pi].w+'</span>';
        selWord=null;matched++;
        if(matched===pairs.length){
          done=true;
          hint('🎉 כָּל הַמִּלִּים בַּמָּקוֹם! קָרָאת נֶהְדָּר!');
          api.solved();
        }else hint('יֹפִי! עוֹד '+(pairs.length-matched)+' 💗');
      }else{                                              // wrong picture
        picEl.classList.add('wm-shake');
        wordEl.classList.remove('wm-sel');selWord=null;
        api.wrong(wi+1);
        hint('זֹאת לֹא הַתְּמוּנָה שֶׁל הַמִּלָּה — קִרְאִי שׁוּב 💗');
        later(()=>picEl.classList.remove('wm-shake'),450);
      }
    }

    // TAP-TAP: tap a word (select) → tap a picture
    words.forEach(w=>w.addEventListener('click',function(){
      if(done||this.classList.contains('wm-used'))return;
      if(selWord===this){this.classList.remove('wm-sel');selWord=null;return;}
      words.forEach(x=>x.classList.remove('wm-sel'));
      this.classList.add('wm-sel');selWord=this;
    }));
    pics.forEach(pc=>pc.addEventListener('click',function(){if(selWord)tryMatch(selWord,this);}));

    /* DRAG: pointer-drag a word pill onto a picture (ghost + rect hit-test, the
       compare.ex.js pattern — window-level move/up, no setPointerCapture).

       The floating ghost is `position:fixed; z-index:9999`, so one that outlives
       its drag freezes mid-flight ABOVE everything — including the z-996 success
       screen — until the next problem mounts and cleanup sweeps it (user: "the
       word icon sometimes sticks half-way after a correct answer, and it also
       shows during the success screen"). Two ways the drag could end without a
       `pointerup`, both fixed here:
         · pointercancel — the browser/OS takes the gesture (an edge or system
           swipe, palm rejection). compare.ex.js handles this; THIS module was
           written from it but dropped the handler, so pointerup never came and
           the ghost stayed. That's the "certain point you drag to" trigger.
         · a SECOND finger — another pointerdown overwrote `drag`, orphaning
           ghost #1 with no live reference left to remove it by.
       So: one owned ghost, every exit funnels through endDrag(), the drag is
       pinned to its pointerId, and a second pointer is ignored while one is
       live. killGhost() sweeps by CLASS so even an orphan dies. */
    let drag=null;      // {id, wordEl, sx, sy, moved}
    let ghost=null;
    function killGhost(){
      ghost=null;
      const gs=document.querySelectorAll('.wm-ghost');
      for(let i=0;i<gs.length;i++)gs[i].remove();
    }
    function endDrag(){
      const d=drag;drag=null;
      killGhost();
      pics.forEach(pc=>pc.classList.remove('wm-hot'));
      if(d&&d.wordEl)d.wordEl.style.opacity='';
      return d||{};
    }
    function overPic(x,y){
      for(const pc of pics){
        if(pc.classList.contains('wm-done'))continue;
        const r=pc.getBoundingClientRect();
        if(x>=r.left-8&&x<=r.right+8&&y>=r.top-8&&y<=r.bottom+8)return pc;
      }
      return null;
    }
    const mine=e=>drag&&e.pointerId===drag.id;
    function onMove(e){
      if(!mine(e))return;
      if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<6)return;
      if(!drag.moved){
        drag.moved=true;
        ghost=document.createElement('div');
        ghost.className='wm-ghost';
        ghost.textContent=drag.wordEl.textContent;
        ghost.dataset.pid=String(drag.id);       // which pointer owns it (debug + tests)
        document.body.appendChild(ghost);
        drag.wordEl.style.opacity='.35';
      }
      // anchor to the grab point (ox/oy) so the pill tracks the finger from where
      // it was actually grabbed — no jump-to-centre
      ghost.style.left=(e.clientX-drag.ox)+'px';ghost.style.top=(e.clientY-drag.oy)+'px';
      const hot=overPic(e.clientX,e.clientY);
      pics.forEach(pc=>pc.classList.toggle('wm-hot',pc===hot));
      e.preventDefault();
    }
    function onUp(e){
      if(!mine(e))return;
      const d=endDrag();                  // the ghost dies BEFORE any scoring runs
      if(d.moved){
        const pc=overPic(e.clientX,e.clientY);
        if(pc)tryMatch(d.wordEl,pc);
      }
      // a no-move release falls through to the click handler (tap-select)
    }
    function onCancel(e){if(mine(e))endDrag();}
    function onBlur(){if(drag)endDrag();}   // released outside the window (desktop)
    words.forEach(w=>w.addEventListener('pointerdown',function(e){
      if(done||this.classList.contains('wm-used'))return;
      if(drag)return;                     // a 2nd finger must not orphan the live ghost
      // GRAB OFFSET — keep the exact point she pressed under her finger. The ghost
      // is transform:translate(-50%,-50%) (centred on its left/top), so we anchor
      // left/top to (finger − offset-from-word-centre). Without this the pill
      // snaps so its CENTRE sits under the finger, so grabbing it near an edge
      // makes the drag start visibly shifted from where she pressed (user, tablet).
      const r=this.getBoundingClientRect();
      drag={id:e.pointerId,wordEl:this,sx:e.clientX,sy:e.clientY,moved:false,
            ox:e.clientX-(r.left+r.width/2), oy:e.clientY-(r.top+r.height/2)};
    }));
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp);
    window.addEventListener('pointercancel',onCancel);
    window.addEventListener('blur',onBlur);
    killGhost();      // insurance: never inherit a stray ghost from a past card

    return function cleanup(){
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp);
      window.removeEventListener('pointercancel',onCancel);
      window.removeEventListener('blur',onBlur);
      killGhost();
      timers.forEach(clearTimeout);root.innerHTML='';
    };
  }

  return{
    t:TWM,
    modes:['wm','sup','mulc'],   // 'wm' = internal tester handle
    aidsReveal:'always',
    make(mode){return mode==='wm'?makePool('wm'):(mode==='sup'||mode==='mulc')?makePool(mode):[];},
    _resetRotation(){_q=null;},   // test hook
    _bank:BANK,                   // test hook (bank-size / validity sweeps)
    mount,
  };
})();
