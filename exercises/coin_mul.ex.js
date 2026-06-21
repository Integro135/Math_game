/* ── Coin-multiplication exercise (רֵאשִׁית הַכֶּפֶל — מַטְבְּעוֹת שֶׁל 2 / 5 / 10) ──
   "How many <v>-coins fit in X?" The child taps ＋ to drop real coins into a tray
   one at a time (＋ keeps going a little past the answer so it never reveals it),
   then COUNTS the coins and types that count — teaching that N coins of v make
   N×v (first multiplication as repeated equal groups). Each session shows ONE
   problem of EACH coin value, with a random target from its range:
     ₪2  → targets 4..10  (2..5 coins)
     ₪5  → targets 10..35 (2..7 coins)
     ₪10 → targets 20..90 (2..9 coins)
   The coins are the SAME real coins as the coin-counting exercise, drawn by the
   global tcCoinSVG(v) (coins.ex.js is loaded in 'sup'); the title shows that coin
   as an inline icon.

   Mounted by core.js _colxMount (the same self-contained-exercise host path as
   the column modules) into #colx-root; self-checks via api.solved()/api.wrong().
   Mixed into the Superman ('sup') pool.
   Problem shape: { t:TCM, a, b }  where a = the target and b = the coin value
   (2, 5 or 10); the answer is a/b (the number of coins). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.coin_mul=(()=>{

  // A session shows ONE problem of EACH coin value (₪2, ₪5, ₪10), each with a
  // random target from its range — so she meets ×2, ×5 AND ×10 every time. The
  // coin value rides in `b` (read by core.js as num2 and by mount as the coin).
  function makePool(){
    const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
    const pick=a=>a[(Math.random()*a.length)|0];
    const out=[
      {t:TCM,a:pick([4,6,8,10]),                b:2},   // 2..5 coins of ₪2
      {t:TCM,a:pick([10,15,20,25,30,35]),       b:5},   // 2..7 coins of ₪5
      {t:TCM,a:pick([20,30,40,50,60,70,80,90]), b:10},  // 2..9 coins of ₪10
    ];
    return sh(out);
  }

  // the real coin from the coin-counting exercise (tcCoinSVG is global, defined
  // by coins.ex.js — loaded in 'sup'); a silver fallback if unavailable
  function coinHTML(coin){
    if(typeof tcCoinSVG==='function')return tcCoinSVG(coin);
    return '<div class="coin-wrap"><div class="colm-coin-fallback">'+coin+'</div></div>';
  }

  const CSS=`
  .colm-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
  .colm-q{font-family:'Fredoka One',cursive;font-size:1.25rem;color:var(--skin-text,#fff);
    text-align:center;line-height:1.4;text-shadow:0 0 12px rgba(160,190,255,.3)}
  .colm-q b{color:var(--skin-accent,#ffd27d)}
  /* the coin (₪2/₪5/₪10) shown inline in the title — the real coin, scaled small */
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
  /* the coin face already shows "5" — hide the ₪5 caption in the tray to stay tidy */
  #colx-root .colm-tray .coin-lbl{display:none}
  #colx-root .colm-tray .coin-wrap{gap:0}
  /* size the coins so UP TO 6 fit in one row — keeps the large counts (up to 9
     ₪10 coins in 90, +overshoot) to about two rows */
  #colx-root .colm-tray .coin-wrap svg{width:42px;height:42px}
  .colm-coin-fallback{width:62px;height:62px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-family:'Fredoka One',cursive;font-size:1.8rem;color:#0D1B21;
    background:radial-gradient(circle at 35% 30%,#CFD8DC,#90A4AE 55%,#455A64)}
  .colm-controls{display:flex;gap:24px;align-items:center;justify-content:center}
  /* big round add / remove buttons */
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
    if(document.getElementById('colm-style'))return;
    const st=document.createElement('style');st.id='colm-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount({root,a,b,api}){
    injectStyle();
    const COIN=b||5, target=a, need=Math.round(a/COIN);
    // the child may add MORE coins than fit — the ＋ must never disable AT the
    // answer (that would reveal it). Cap only at a generous bound well past it.
    const maxCoins=need+3;
    let count=0, done=false;
    const timers=[]; const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};

    root.innerHTML=`
      <div class="colm-root">
        <div class="colm-q">כַּמָּה <span class="colm-titlecoin">${coinHTML(COIN)}</span> נִכְנָסִים בְּ-<b>${target}</b>?</div>
        <div class="colm-tray" id="colm-tray"></div>
        <div class="colm-controls">
          <button class="colm-bigbtn minus" id="colm-rem" aria-label="הָסִירִי מַטְבֵּעַ">−</button>
          <button class="colm-bigbtn plus" id="colm-add" aria-label="הוֹסִיפִי מַטְבֵּעַ">＋</button>
        </div>
        <div class="colm-ans-row">
          <button class="colm-btn" id="colm-chk" aria-label="בְּדִיקָה">✓</button>
          <input class="ans-inp colm-inp blink" id="colm-ans" type="text" inputmode="numeric" maxlength="2" aria-label="כַּמּוּת הַמַּטְבְּעוֹת">
        </div>
      </div>`;

    const $=id=>root.querySelector('#'+id);
    const tray=$('colm-tray'),addBtn=$('colm-add'),remBtn=$('colm-rem'),inp=$('colm-ans'),chk=$('colm-chk');

    function fb(msg){const h=document.getElementById('hint');if(h)h.textContent=msg;}
    fb('🪙 הוֹסִיפִי מַטְבְּעוֹת שֶׁל '+COIN+' וְסִפְרִי כַּמָּה צְרִיכִים!');

    function render(){
      tray.classList.toggle('colm-tray-blank',count===0);  // box invisible while empty, space reserved
      addBtn.disabled=done||count>=maxCoins;        // cap only WAY past the answer (never reveals it)
      remBtn.disabled=done||count<=0;
    }
    function addCoin(){
      if(done||count>=maxCoins)return;
      count++;
      const tmp=document.createElement('div');tmp.innerHTML=coinHTML(COIN);
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
      if(inp.value===''||isNaN(v)){fb('כִּתְבִי כַּמָּה מַטְבְּעוֹת 💗');return;}
      if(v===need){
        done=true;
        inp.classList.remove('blink','ans-err');inp.classList.add('ans-ok');inp.disabled=true;
        render();
        api.solved();
      }else{
        inp.classList.remove('blink');inp.classList.add('ans-err');
        // guide by the TYPED value vs the answer — never by the coin count
        // (the child may have added more coins than actually fit)
        if(v<need)fb('נִכְנָסִים עוֹד! נַסִּי מִסְפָּר גָּדוֹל יוֹתֵר 🪙');
        else fb('יוֹתֵר מִדַּי! נַסִּי מִסְפָּר קָטָן יוֹתֵר 💗');
        api.wrong(v);
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');inp.classList.add('blink');inp.focus();}},1000);
      }
    }

    addBtn.addEventListener('click',addCoin);
    remBtn.addEventListener('click',removeCoin);
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});

    render();
    requestAnimationFrame(()=>{addBtn.focus();});

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TCM,
    modes:['sup'],
    aidsReveal:'always',   // no number-line aid — the tray is the manipulative
    make(mode){return mode==='sup'?makePool():[];},
    mount,
  };
})();
