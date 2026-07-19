/* ── Ice-cream shop (חֲנוּת הַגְּלִידָה 🍦 — קוֹנִים לְפִי הַכֶּסֶף שֶׁיֵּשׁ) ──────────
   The child HAS money and buys accordingly: a named girl holds a BUDGET
   (₪4..₪90) and every ice cream costs the SAME price — ₪2, ₪5 or ₪10 (real
   coins exist for all three). The question: how many ice creams CAN she buy?
   This is division as "how many groups fit" (quotative) — the story mirror of
   coin_mul, wrapped in a shop tale: the answer is budget ÷ price.

   • Tapping ＋ BUYS one ice cream: it lands in the tray with its price COIN
     attached underneath — so the child can skip-count the spending (2, 4, 6…)
     and stop when the budget is reached. − returns one (refund).
   • ＋ never disables AT the correct count (that would reveal the answer): it
     allows an overshoot of +3 like coin_mul/bagel_cost — the shop "lets her
     order too much" and the wrong-answer feedback says there isn't enough money.
   • Wrong-answer feedback is directional off the TYPED value: too many → "not
     enough money", too few → "she still has money left".
   • On a MISTAKE the ×price number line appears AND the tray is CLEARED to zero
     — the number line becomes the counting tool, so she re-counts fresh (SPACE
     or ＋ then adds the first ice cream again).

   Same coin art as the whole coin family — the global tcCoinSVG(v) from
   coins.ex.js (loaded in 'mulc'); a silver fallback if unavailable. Mounted by
   core.js _colxMount into #colx-root; self-checks via api.solved()/api.wrong().
   Mixed into אַלּוּפָה ('mulc'); 'ice' is an INTERNAL handle (tester/setMode).
   Problem shape: { t:TIC, a, b, name }  where a = the budget (₪), b = the price
   per ice cream (2/5/10) and name = the shopper; the answer is a/b. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.ice_cream=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
  const pick=a=>a[(Math.random()*a.length)|0];

  const NAMES=['דָּנָה','נֹעָה','רוֹנִי','מַיָּה','תָּמָר','יָעֵל'];

  // a session shows ONE problem of EACH price (₪2, ₪5, ₪10) with a random
  // budget from its range — the same coin ranges as coin_mul, so she meets
  // ÷2, ÷5 AND ÷10 every time. The price rides in `b` (core.js num2).
  function makePool(){
    return sh([
      {t:TIC,a:pick([4,6,8,10,12,14,16,18,20]), b:2, name:pick(NAMES)},  // 2..10 ice creams of ₪2
      {t:TIC,a:pick([10,15,20,25,30,35]),       b:5, name:pick(NAMES)},  // 2..7  ice creams of ₪5
      {t:TIC,a:pick([20,30,40,50,60,70,80,90]), b:10,name:pick(NAMES)},  // 2..9  ice creams of ₪10
    ]);
  }

  // the real coin (tcCoinSVG is global, defined by coins.ex.js — loaded in
  // 'mulc'); a silver fallback if unavailable
  function coinHTML(coin){
    if(typeof tcCoinSVG==='function')return tcCoinSVG(coin);
    return '<div class="coin-wrap"><div class="ic-coin-fallback">'+coin+'</div></div>';
  }

  const CSS=`
  .ic-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
  .ic-q{font-family:'Fredoka One',cursive;font-size:1.25rem;color:var(--skin-text,#fff);
    text-align:center;line-height:1.4;text-shadow:0 0 12px rgba(160,190,255,.3);direction:rtl;padding:0 8px}
  .ic-q b{color:var(--skin-accent,#ffd27d)}
  .ic-emoji{font-size:1.35em;line-height:1;vertical-align:-3px}
  /* the price line — RTL block so the coin sits at the sentence END (left) */
  .ic-sub{font-family:'Fredoka One',cursive;font-size:.95rem;color:var(--skin-text,#fff);opacity:.85;
    text-align:center;direction:rtl}
  .ic-sub .ic-titlecoin{margin-right:5px}
  .ic-sub .ic-titlecoin svg{width:30px;height:30px;vertical-align:middle}
  .ic-titlecoin{display:inline-block;vertical-align:middle;margin:0 3px}
  .ic-titlecoin .coin-wrap{display:inline-block;gap:0;animation:none;vertical-align:middle}
  .ic-titlecoin svg{width:42px;height:42px;display:block}
  .ic-titlecoin .coin-lbl{display:none}
  /* the tray of BOUGHT ice creams — each with its price coin attached under it,
     so the spending is skip-countable (2, 4, 6…) */
  .ic-tray{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:flex-start;
    min-height:96px;max-width:340px;padding:10px 8px;border-radius:18px;box-sizing:border-box;
    background:rgba(255,255,255,.08);border:2px dashed rgba(255,255,255,.22)}
  /* before the 1st purchase: KEEP the reserved space (so ＋ never shifts down)
     but hide the box itself so no blank square shows */
  .ic-tray.ic-tray-blank{background:transparent;border-color:transparent}
  .ic-buy{display:flex;flex-direction:column;align-items:center;gap:1px;animation:icDrop .3s ease-out}
  @keyframes icDrop{from{transform:translateY(-10px) scale(.7);opacity:0}to{transform:none;opacity:1}}
  .ic-buy .ic-scoop{font-size:2rem;line-height:1;filter:drop-shadow(0 3px 5px rgba(0,0,0,.3))}
  #colx-root .ic-buy .coin-wrap{gap:0}
  #colx-root .ic-buy .coin-lbl{display:none}
  #colx-root .ic-buy .coin-wrap svg{width:28px;height:28px}
  .ic-coin-fallback{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-family:'Fredoka One',cursive;font-size:.9rem;color:#0D1B21;
    background:radial-gradient(circle at 35% 30%,#CFD8DC,#90A4AE 55%,#455A64)}
  .ic-controls{display:flex;gap:24px;align-items:center;justify-content:center}
  .ic-bigbtn{width:70px;height:70px;border-radius:50%;border:0;cursor:pointer;color:#fff;
    font-family:'Fredoka One',cursive;font-size:2.6rem;line-height:1;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 5px 0 rgba(0,0,0,.28),0 6px 14px rgba(0,0,0,.25)}
  .ic-bigbtn:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.28)}
  .ic-bigbtn:disabled{opacity:.32;cursor:default;box-shadow:none}
  .ic-bigbtn.plus{background:linear-gradient(160deg,#86E29B,#2FA257 85%);border:2px solid rgba(255,255,255,.55)}
  .ic-bigbtn.minus{background:linear-gradient(160deg,#FF9DBE,#E0557E 85%);border:2px solid rgba(255,255,255,.55)}
  .ic-btn{font-family:'Fredoka One',cursive;font-size:1.1rem;border:0;border-radius:14px;
    padding:11px 20px;cursor:pointer;background:var(--skin-primary,#c77dff);color:#fff;
    box-shadow:0 3px 0 rgba(0,0,0,.25)}
  .ic-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.25)}
  /* direction:ltr so the ✓ button (first child) sits to the LEFT of the input */
  .ic-ans-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-top:2px;direction:ltr}
  #colx-root .ans-inp.ic-inp{width:72px;height:58px;font-size:2rem;border-radius:14px;text-align:center}
  #colx-root .ic-inp.blink{animation:icBlink 1.1s ease-in-out infinite alternate}
  @keyframes icBlink{
    from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 22px var(--skin-accent,#ffd27d)}}
  `;

  function injectStyle(){
    if(document.getElementById('ic-style'))return;
    const st=document.createElement('style');st.id='ic-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount({root,a,b,p,api}){
    injectStyle();
    const PRICE=b||2, budget=a, need=Math.round(budget/PRICE);
    const name=(p&&p.name)||pick(NAMES);
    const scoop=pick(['🍦','🍨']);
    // ＋ must NEVER disable AT the correct count — that would reveal the answer.
    // The shop happily lets her ORDER too much; the check tells her there isn't
    // enough money. Cap only at a generous overshoot (like coin_mul/bagel_cost).
    const maxBuys=need+3;
    let count=0, done=false, nlShown=false;
    const timers=[]; const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};

    // on a MISTAKE: open the multiplication number line with jumps of the PRICE,
    // so she can skip-count the spending (₪2 → 2,4,6…; ₪10 → 10,20,30…) and count
    // how many jumps fit in the budget. Ends one jump past the budget so the last
    // tick never spells the answer. (Revealed once; loadProblem re-hides it on the
    // next card since TIC is in core.js's hide-the-line list.)
    function revealMulNL(){
      if(nlShown)return;nlShown=true;
      const nlp=document.getElementById('nl-panel');if(nlp)nlp.style.display='';
      if(typeof NL!=='undefined'){NL.configure(budget+PRICE,PRICE);NL.init(0);}
    }

    root.innerHTML=`
      <div class="ic-root">
        <div class="ic-q">לְ<b>${name}</b> יֵשׁ <b>₪${budget}</b> 👛 — כַּמָּה גְּלִידוֹת <span class="ic-emoji">${scoop}</span> הִיא תּוּכַל לִקְנוֹת?</div>
        <div class="ic-sub">כָּל גְּלִידָה <span class="ic-emoji">${scoop}</span> עוֹלָה <span class="ic-titlecoin">${coinHTML(PRICE)}</span></div>
        <div class="ic-tray" id="ic-tray"></div>
        <div class="ic-controls">
          <button class="ic-bigbtn minus" id="ic-rem" aria-label="הַחְזִירִי גְּלִידָה">−</button>
          <button class="ic-bigbtn plus" id="ic-add" aria-label="קְנִי גְּלִידָה">＋</button>
        </div>
        <div class="ic-ans-row">
          <button class="ic-btn" id="ic-chk" aria-label="בְּדִיקָה">✓</button>
          <input class="ans-inp ic-inp blink" id="ic-ans" type="text" inputmode="numeric" maxlength="2" aria-label="כַּמָּה גְּלִידוֹת">
        </div>
      </div>`;

    const $=id=>root.querySelector('#'+id);
    const tray=$('ic-tray'),addBtn=$('ic-add'),remBtn=$('ic-rem'),inp=$('ic-ans'),chk=$('ic-chk');

    function fb(msg){const h=document.getElementById('hint');if(h)h.textContent=msg;}
    fb('🍦 קְנִי גְּלִידָה בְּכָל לְחִיצָה עַל ＋ — לְכָל גְּלִידָה מַטְבֵּעַ שֶׁל ₪'+PRICE+'. עִצְרִי כְּשֶׁהַכֶּסֶף נִגְמָר!');

    function render(){
      tray.classList.toggle('ic-tray-blank',count===0);  // box invisible while empty, space reserved
      addBtn.disabled=done||count>=maxBuys;       // cap only WAY past the answer (never reveals it)
      remBtn.disabled=done||count<=0;
    }
    function buy(){
      if(done||count>=maxBuys)return;
      count++;
      const el=document.createElement('div');
      el.className='ic-buy';
      el.innerHTML='<span class="ic-scoop">'+scoop+'</span>'+coinHTML(PRICE);
      tray.appendChild(el);
      render();
    }
    function refund(){
      if(done||count<=0)return;
      count--;
      if(tray.lastElementChild)tray.lastElementChild.remove();
      render();
    }
    // on a MISTAKE the number line takes over as the counting tool — wipe the
    // bought ice creams so she re-counts from zero (SPACE / ＋ then adds the
    // first ice cream again).
    function clearTray(){
      count=0;
      tray.innerHTML='';
      render();
    }
    function check(){
      if(done)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){fb('כִּתְבִי כַּמָּה גְּלִידוֹת אֶפְשָׁר לִקְנוֹת 💗');return;}
      if(v===need){
        done=true;
        inp.classList.remove('blink','ans-err');inp.classList.add('ans-ok');inp.disabled=true;
        render();
        fb('בְּדִיּוּק! '+need+' גְּלִידוֹת שֶׁל ₪'+PRICE+' = ₪'+budget+' 🍦 כָּל הַכָּבוֹד!');
        api.solved();
      }else{
        inp.classList.remove('blink');inp.classList.add('ans-err');
        // guide by the TYPED value vs the answer — never by the tray count
        // (she may have "ordered" more than the money allows)
        if(v>need)fb('אֵין לָהּ מַסְפִּיק כֶּסֶף — סִפְרִי בִּקְפִיצוֹת שֶׁל ₪'+PRICE+' עַל הַיָּשָׁר 💗');
        else fb('נִשְׁאַר לָהּ עוֹד כֶּסֶף! סִפְרִי בִּקְפִיצוֹת שֶׁל ₪'+PRICE+' עַל הַיָּשָׁר 🍦');
        api.wrong(v);
        revealMulNL();          // help: the ×price skip-counting line
        clearTray();            // wipe the bought ice creams — recount on the number line
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');inp.classList.add('blink');inp.focus();}},1000);
      }
    }

    addBtn.addEventListener('click',buy);
    remBtn.addEventListener('click',refund);
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    // pressing SPACE buys an ice cream (anywhere — preventDefault also stops a
    // focused ＋ from double-firing, and stops the page from scrolling)
    function onSpace(e){if(e.key===' '||e.code==='Space'){e.preventDefault();buy();}}
    document.addEventListener('keydown',onSpace);

    render();
    // focus the ANSWER box (not ＋) so typing / the mobile numpad works at once;
    // SPACE still buys an ice cream via the document handler regardless of focus
    requestAnimationFrame(()=>{try{inp.focus();}catch(e){}});

    return function cleanup(){document.removeEventListener('keydown',onSpace);timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TIC,
    modes:['ice','mulc'],   // אַלּוּפָה + the internal tester handle
    aidsReveal:'always',    // no number-line aid — the shop tray is the manipulative
    make(mode){return (mode==='ice'||mode==='mulc')?makePool():[];},
    mount,
  };
})();
