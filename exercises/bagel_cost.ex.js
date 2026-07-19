/* ── Bagel-cost exercise (כַּמָּה עוֹלִים x בֵּיגַלֶה — רֵאשִׁית הַכֶּפֶל בִּשְׁקָלִים) ──
   "How much do X bagels cost?" The child KNOWS one bagel costs 5 ₪. She taps ＋
   to drop a real silver ₪5 coin into the tray — ONE coin per bagel — then counts
   by fives (5, 10, 15 …) and types the TOTAL cost. This teaches multiplication as
   repeated equal groups (X bagels × 5 ₪ = 5X), the mirror of the coin-counting
   exercise: here the COUNT of coins is given (the bagels) and the SUM is the answer.

   Same design + same real coins as coin_mul / the coin-counting exercise — the coin
   is drawn by the global tcCoinSVG(5) (coins.ex.js is loaded in 'sup'). Mounted by
   core.js _colxMount into #colx-root; self-checks via api.solved()/api.wrong().
   Mixed into the Superman ('sup') pool.
   Problem shape: { t:TBC, a, b }  where a = the number of bagels and b = the price
   per bagel (always 5); the answer is a*b (the total cost). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.bagel_cost=(()=>{

  const PRICE=5;   // one bagel always costs ₪5 (the child knows this)

  // a session shows THREE bagel problems with distinct counts, drawn from
  // {2,3,4,6,7,8} (totals 10/15/20/30/35/40 — max sum raised +10 to 40). We ask
  // UP TO 8 and deliberately SKIP 5 — "how much do 5 bagels cost" is confusing
  // because the count (5) equals the per-bagel price (₪5).
  function makePool(){
    const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
    return sh([2,3,4,6,7,8]).slice(0,3).map(n=>({t:TBC,a:n,b:PRICE}));
  }

  // the real silver ₪5 coin (tcCoinSVG is global, defined by coins.ex.js — loaded
  // in 'sup'); a silver fallback if unavailable
  function coinHTML(){
    if(typeof tcCoinSVG==='function')return tcCoinSVG(PRICE);
    return '<div class="coin-wrap"><div class="colm-coin-fallback">'+PRICE+'</div></div>';
  }

  const CSS=`
  .colm-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
  .colm-q{font-family:'Fredoka One',cursive;font-size:1.25rem;color:var(--skin-text,#fff);
    text-align:center;line-height:1.4;text-shadow:0 0 12px rgba(160,190,255,.3)}
  .colm-q b{color:var(--skin-accent,#ffd27d)}
  /* the bagel ICON stands in for the word "בייגלה" — a touch larger so it reads as the item */
  .bagc-emoji{font-size:1.35em;line-height:1;vertical-align:-3px}
  /* RTL so the word order reads "כמה עולים <x> 🥨" — the number BEFORE the icon (without this, the
     LTR base flips it to "🥨 <x>"). Scoped to bagel; the coin exercise keeps its own .colm-q layout. */
  .bagc-q{direction:rtl}
  /* RTL block (NOT flex): in Hebrew the coin is the END of the sentence, so it must sit to the LEFT of
     the text — "כל בייגלה 🥨 עולה [מטבע]". A flex row laid the coin out LTR (on the right); plain RTL
     inline flow + vertical-align puts it correctly on the left. */
  .colm-sub{font-family:'Fredoka One',cursive;font-size:.95rem;color:var(--skin-text,#fff);opacity:.85;
    text-align:center;direction:rtl}
  .colm-sub .colm-titlecoin{margin-right:5px}
  .colm-sub .colm-titlecoin svg{width:30px;height:30px;vertical-align:middle}
  /* the ₪5 coin shown inline — the real coin, scaled small */
  .colm-titlecoin{display:inline-block;vertical-align:middle;margin:0 3px}
  .colm-titlecoin .coin-wrap{display:inline-block;gap:0;animation:none;vertical-align:middle}
  .colm-titlecoin svg{width:42px;height:42px;display:block}
  .colm-titlecoin .coin-lbl{display:none}
  .colm-tray{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;
    min-height:74px;max-width:300px;padding:10px 8px;border-radius:18px;box-sizing:border-box;
    background:rgba(255,255,255,.08);border:2px dashed rgba(255,255,255,.22)}
  /* before the 1st coin: KEEP the reserved space (so ＋ never shifts down) but
     hide the box itself so no blank square shows */
  .colm-tray.colm-tray-blank{background:transparent;border-color:transparent}
  #colx-root .colm-tray .coin-lbl{display:none}
  #colx-root .colm-tray .coin-wrap{gap:0}
  /* size the coins so UP TO 6 fit in one row (7 bagels → about two rows) */
  #colx-root .colm-tray .coin-wrap svg{width:42px;height:42px}
  .colm-coin-fallback{width:62px;height:62px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-family:'Fredoka One',cursive;font-size:1.8rem;color:#0D1B21;
    background:radial-gradient(circle at 35% 30%,#CFD8DC,#90A4AE 55%,#455A64)}
  .colm-controls{display:flex;gap:24px;align-items:center;justify-content:center}
  .colm-bigbtn{width:70px;height:70px;border-radius:50%;border:0;cursor:pointer;color:#fff;
    font-family:'Fredoka One',cursive;font-size:2.6rem;line-height:1;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 5px 0 rgba(0,0,0,.28),0 6px 14px rgba(0,0,0,.25)}
  .colm-bigbtn:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.28)}
  .colm-bigbtn:disabled{opacity:.32;cursor:default;box-shadow:none}
  .colm-bigbtn.plus{background:linear-gradient(160deg,#86E29B,#2FA257 85%);border:2px solid rgba(255,255,255,.55)}
  .colm-bigbtn.minus{background:linear-gradient(160deg,#FF9DBE,#E0557E 85%);border:2px solid rgba(255,255,255,.55)}
  .colm-btn{font-family:'Fredoka One',cursive;font-size:1.1rem;border:0;border-radius:14px;
    padding:11px 20px;cursor:pointer;background:var(--skin-primary,#c77dff);color:#fff;
    box-shadow:0 3px 0 rgba(0,0,0,.25)}
  .colm-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.25)}
  .colm-btn:disabled{opacity:.35;cursor:default;box-shadow:none}
  /* direction:ltr so the ✓ button (first child) sits to the LEFT of the input */
  .colm-ans-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-top:2px;direction:ltr}
  .colm-ans-row span{font-family:'Fredoka One',cursive;color:var(--skin-text,#fff)}
  #colx-root .ans-inp.colm-inp{width:72px;height:58px;font-size:2rem;border-radius:14px;text-align:center}
  #colx-root .colm-inp.blink{animation:colmBlink 1.1s ease-in-out infinite alternate}
  @keyframes colmBlink{
    from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 22px var(--skin-accent,#ffd27d)}}
  `;

  function injectStyle(){
    if(document.getElementById('bagc-style'))return;
    const st=document.createElement('style');st.id='bagc-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount({root,a,b,api}){
    injectStyle();
    const COIN=b||PRICE, bagels=a, total=bagels*COIN;
    // ＋ must NEVER disable AT the correct count — that would reveal the answer. Allow a generous
    // overshoot past it (like the coin-counting exercise), capping only well beyond.
    const maxCoins=bagels+3;
    let count=0, done=false, nlShown=false;
    const timers=[]; const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};

    // on a MISTAKE: open the multiplication number line with jumps of ₪5, so she
    // can skip-count the cost (5, 10, 15 …). Ends one jump past the total so the
    // last tick never spells the answer. (Revealed once; loadProblem re-hides it
    // on the next card since TBC is in core.js's hide-the-line list.)
    function revealMulNL(){
      if(nlShown)return;nlShown=true;
      const nlp=document.getElementById('nl-panel');if(nlp)nlp.style.display='';
      if(typeof NL!=='undefined'){NL.configure(total+COIN,COIN);NL.init(0);}
    }

    root.innerHTML=`
      <div class="colm-root">
        <div class="colm-q bagc-q">כַּמָּה עוֹלִים <b>${bagels}</b> <span class="bagc-emoji">🥨</span>?</div>
        <div class="colm-sub">כָּל בֵּיגַלֶה <span class="bagc-emoji">🥨</span> עוֹלֶה <span class="colm-titlecoin">${coinHTML()}</span></div>
        <div class="colm-tray" id="colm-tray"></div>
        <div class="colm-controls">
          <button class="colm-bigbtn minus" id="colm-rem" aria-label="הָסִירִי מַטְבֵּעַ">−</button>
          <button class="colm-bigbtn plus" id="colm-add" aria-label="הוֹסִיפִי מַטְבֵּעַ">＋</button>
        </div>
        <div class="colm-ans-row">
          <button class="colm-btn" id="colm-chk" aria-label="בְּדִיקָה">✓</button>
          <input class="ans-inp colm-inp blink" id="colm-ans" type="text" inputmode="numeric" maxlength="3" aria-label="הָעֲלוּת הַכּוֹלֶלֶת">
        </div>
      </div>`;

    const $=id=>root.querySelector('#'+id);
    const tray=$('colm-tray'),addBtn=$('colm-add'),remBtn=$('colm-rem'),inp=$('colm-ans'),chk=$('colm-chk');

    function fb(msg){const h=document.getElementById('hint');if(h)h.textContent=msg;}
    fb('🥨 הוֹסִיפִי מַטְבֵּעַ שֶׁל '+COIN+' לְכָל בֵּיגַלֶה — וְסַכְּמִי כַּמָּה זֶה עוֹלֶה!');

    function render(){
      tray.classList.toggle('colm-tray-blank',count===0);  // box invisible while empty, space reserved
      addBtn.disabled=done||count>=maxCoins;        // cap only WAY past the answer (never reveals it)
      remBtn.disabled=done||count<=0;
    }
    function addCoin(){
      if(done||count>=maxCoins)return;
      count++;
      const tmp=document.createElement('div');tmp.innerHTML=coinHTML();
      const node=tmp.firstElementChild;node.classList.add('colm-coin');   // marker for counting
      tray.appendChild(node);
      render();
    }
    function removeCoin(){
      if(done||count<=0)return;
      count--;
      if(tray.lastElementChild)tray.lastElementChild.remove();
      render();
    }
    function check(){
      if(done)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){fb('כִּתְבִי כַּמָּה זֶה עוֹלֶה 💗');return;}
      if(v===total){
        done=true;
        inp.classList.remove('blink','ans-err');inp.classList.add('ans-ok');inp.disabled=true;
        render();
        api.solved();
      }else{
        inp.classList.remove('blink');inp.classList.add('ans-err');
        if(v<total)fb('עוֹד קְצָת! סִפְרִי בְּחֲמִשּׁוֹת עַל הַיָּשָׁר: 5, 10, 15… 💰');
        else fb('יוֹתֵר מִדַּי! סִפְרִי בְּחֲמִשּׁוֹת עַל הַיָּשָׁר 💗');
        api.wrong(v);
        revealMulNL();          // help: the ×5 skip-counting line
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');inp.classList.add('blink');inp.focus();}},1000);
      }
    }

    addBtn.addEventListener('click',addCoin);
    remBtn.addEventListener('click',removeCoin);
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    // pressing SPACE drops a coin (anywhere — preventDefault also stops a focused ＋ from double-firing,
    // and stops the page from scrolling)
    function onSpace(e){if(e.key===' '||e.code==='Space'){e.preventDefault();addCoin();}}
    document.addEventListener('keydown',onSpace);

    render();
    // focus the ANSWER box (not ＋) so typing / the mobile numpad works at once;
    // SPACE still drops a coin via the document handler regardless of focus
    requestAnimationFrame(()=>{try{inp.focus();}catch(e){}});

    return function cleanup(){document.removeEventListener('keydown',onSpace);timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TBC,
    modes:['sup','mulc'],   // Superman + אַלּוּפָה (basic multiplication in shekels)
    aidsReveal:'always',   // no number-line aid — the coin tray is the manipulative
    make(mode){return (mode==='sup'||mode==='mulc')?makePool():[];},
    mount,
  };
})();
