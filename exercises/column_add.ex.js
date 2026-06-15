/* ── Column-addition exercise module (Superman 🦸) ──────────────────────────
   Ported from the standalone playground column_addition.html — single source
   of truth for the in-game exercise. Two-stage column addition: units first
   (a carried 1 flies up to the tens column), then tens. Wrong commits draw
   hint circles around the digits to add and open a private 0-20 number line.

   Contract (see architecture.md §3.6, loaded by bg-loader.loadExercise):
     window.EXERCISES.types.column_add = {
       mount({root, a, b, api}) → cleanup
     }
   api.wrong(val)  — a committed wrong answer (host: penalty + sad modal +
                     reveal of the game's SKINNED number line via the
                     try-first unlock — the per-background rider and track)
   api.nl(anchor)  — park the game number line's rider at a helpful anchor
   api.solved()    — both columns correct  (host: score + success screen)
   The host owns scoring, report, celebration, the aid number line and
   problem advancement; the module owns everything inside root. Inputs carry
   the global `ans-inp` class so the green/red border contract applies. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.column_add=(()=>{

  // pool: 12 column-addition problems (a=11..19, b=2..19), ≥7 with a carry
  function makePool(){
    const ri=(lo,hi)=>lo+(Math.random()*(hi-lo+1)|0);
    const out=[],seen=new Set();
    const want=(carry)=>{
      for(let tries=0;tries<200;tries++){
        const a=ri(11,19),b=ri(2,19);
        const hasCarry=(a%10)+(b%10)>=10;
        const key=a+'_'+b;
        if(hasCarry===carry&&!seen.has(key)){seen.add(key);out.push({t:TCA,a,b});return;}
      }
    };
    for(let i=0;i<7;i++)want(true);
    for(let i=0;i<5;i++)want(false);
    for(let i=out.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }

  const CSS=`
  .colx-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}
  .colx-wrap{position:relative;display:inline-block;padding-left:64px}
  .colx-plus{position:absolute;left:6px;top:0;font-family:'Fredoka One',cursive;font-size:2.9rem;
    color:var(--skin-text,#fff);opacity:.55;line-height:1;pointer-events:none}
  .colx-grid{display:inline-grid;grid-template-columns:84px 84px;direction:ltr}
  .colx-carry-cell{height:44px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px}
  .colx-carry{font-family:'Fredoka One',cursive;font-size:2rem;color:#FF6B9D;
    text-shadow:0 0 14px rgba(255,107,157,.8);line-height:1;opacity:0}
  .colx-carry.show{opacity:1}
  .colx-carry.pop{animation:colxPop .4s cubic-bezier(.34,1.56,.64,1) both}
  @keyframes colxPop{0%{transform:scale(1.6)}100%{transform:scale(1)}}
  .colx-fly{position:absolute;font-family:'Fredoka One',cursive;font-size:2rem;color:#FF6B9D;
    text-shadow:0 0 14px rgba(255,107,157,.8);line-height:1;
    transform:translate(-50%,-50%) scale(1.45);
    transition:left .6s cubic-bezier(.3,1.3,.5,1),top .6s cubic-bezier(.3,1.3,.5,1),
      transform .6s cubic-bezier(.3,1.3,.5,1);
    pointer-events:none;z-index:6}
  .colx-digit{height:74px;display:flex;align-items:center;justify-content:center;
    font-family:'Fredoka One',cursive;font-size:3.9rem;color:var(--skin-text,#fff);
    text-shadow:0 0 18px rgba(160,190,255,.35);line-height:1}
  .colx-div{grid-column:1/span 2;padding:6px 4px 4px}
  .colx-div-line{height:4px;border-radius:3px;
    background:linear-gradient(90deg,var(--skin-glow,#7dc4ff),var(--skin-primary,#c77dff),var(--skin-accent,#ffd27d))}
  .colx-input-cell{height:92px;display:flex;align-items:center;justify-content:center}
  #colx-root .ans-inp.colx-inp{width:76px;height:74px;font-size:2.6rem;border-radius:16px}
  #colx-root .colx-inp:disabled{opacity:.25}
  #colx-root .colx-inp.ans-ok:disabled,#colx-root .colx-inp.blink:disabled{opacity:1}
  #colx-root .colx-inp.blink{animation:colxBlink 1.1s ease-in-out infinite alternate}
  @keyframes colxBlink{
    from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 22px var(--skin-accent,#ffd27d),0 0 44px rgba(255,210,125,.35)}}
  .colx-connectors{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
  @keyframes colxPulse{0%,100%{opacity:.3}50%{opacity:.85}}
  .colx-connectors line.pulse{animation:colxPulse 1.5s ease-in-out infinite}
  .colx-connectors .hint-fade{animation:colxHintFade .45s ease both}
  @keyframes colxHintFade{from{opacity:0}to{opacity:1}}
  @media(max-width:480px){
    .colx-grid{grid-template-columns:64px 64px}
    .colx-digit{height:56px;font-size:2.9rem}
    #colx-root .ans-inp.colx-inp{width:58px;height:56px;font-size:2rem}
    .colx-wrap{padding-left:48px}
    .colx-plus{font-size:2.2rem}
  }`;

  function injectStyle(){
    if(document.getElementById('colx-style'))return;
    const st=document.createElement('style');
    st.id='colx-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  function mount({root,a,b,api}){
    injectStyle();
    const P={
      a,b,
      aT:Math.floor(a/10),aU:a%10,
      bT:Math.floor(b/10),bU:b%10,
      uSum:(a%10)+(b%10),
    };
    P.carry=P.uSum>=10?1:0;
    P.tSum=P.aT+P.bT+P.carry;
    let phase='units';          // 'units' | 'tens' | 'done'
    let unitsHint=false,tensHint=false;
    const timers=[];
    const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};

    root.innerHTML=`
      <div class="colx-wrap" id="colx-pw">
        <svg class="colx-connectors" id="colx-svg"></svg>
        <span class="colx-plus" id="colx-plus">+</span>
        <div class="colx-grid">
          <div class="colx-carry-cell" id="colx-ccell"><span class="colx-carry" id="colx-carry"></span></div>
          <div class="colx-carry-cell"></div>
          <div class="colx-digit" id="colx-aT">${P.aT}</div>
          <div class="colx-digit" id="colx-aU">${P.aU}</div>
          <div class="colx-digit" id="colx-bT">${P.bT}</div>
          <div class="colx-digit" id="colx-bU">${P.bU}</div>
          <div class="colx-div"><div class="colx-div-line" id="colx-dvl"></div></div>
          <div class="colx-input-cell"><input class="ans-inp colx-inp" id="colx-iT" type="text" inputmode="numeric" maxlength="1" disabled aria-label="תּוֹצְאַת הָעֲשָׂרוֹת"></div>
          <div class="colx-input-cell"><input class="ans-inp colx-inp blink" id="colx-iU" type="text" inputmode="numeric" maxlength="${P.carry?2:1}" aria-label="תּוֹצְאַת הָאֲחָדוֹת"></div>
        </div>
      </div>`;

    const $=id=>root.querySelector('#'+id);
    const iU=$('colx-iU'),iT=$('colx-iT');

    /* hint line — reuse the game's hint element under the equation */
    function fb(msg){const h=document.getElementById('hint');if(h)h.textContent=msg;}
    fb('🦸 חַבְּרִי אֶת הָאֲחָדוֹת!');

    /* the + sign centered between the two number rows */
    function positionPlus(){
      const wr=$('colx-pw').getBoundingClientRect();
      if(!wr.width)return;
      const ra=$('colx-aT').getBoundingClientRect(),rb=$('colx-bT').getBoundingClientRect();
      const midY=(ra.top+ra.height/2+rb.top+rb.height/2)/2-wr.top;
      const plus=$('colx-plus');
      plus.style.top=(midY-plus.offsetHeight/2)+'px';
    }

    /* V connectors + post-mistake hint circles */
    function drawLines(){
      const svg=$('colx-svg');if(!svg)return;
      const wr=$('colx-pw').getBoundingClientRect();
      if(!wr.width)return;
      const c=id=>{const r=$(id).getBoundingClientRect();
        return{x:r.left-wr.left+r.width/2,top:r.top-wr.top,bot:r.bottom-wr.top};};
      const cU=c('colx-iU'),cT=c('colx-iT'),dv=c('colx-dvl');
      const y0=dv.bot+3;
      const vee=(box,state)=>{
        const col=state==='on'?'rgba(255,215,0,.55)':state==='done'?'rgba(255,215,0,.12)':'rgba(255,255,255,.10)';
        const cls=state==='on'?' class="pulse"':'';
        const tipY=box.top-3;
        const ln=x1=>`<line${cls} x1="${Math.round(x1)}" y1="${Math.round(y0)}" x2="${Math.round(box.x)}" y2="${Math.round(tipY)}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>`;
        return ln(box.x-24)+ln(box.x+24);
      };
      let html=vee(cU,phase==='units'?'on':'done')+
               vee(cT,phase==='tens'?'on':phase==='done'?'done':'off');
      const hc='rgba(255,107,157,.85)';
      const ell=(x,y,rx,ry)=>`<ellipse cx="${Math.round(x)}" cy="${Math.round(y)}" rx="${rx}" ry="${ry}" fill="none" stroke="${hc}" stroke-width="2.5"/>`;
      const plusAt=(px,py)=>{py=Math.round(py);
        return`<line x1="${px-8}" y1="${py}" x2="${px+8}" y2="${py}" stroke="${hc}" stroke-width="2.5" stroke-linecap="round"/>`+
              `<line x1="${px}" y1="${py-8}" x2="${px}" y2="${py+8}" stroke="${hc}" stroke-width="2.5" stroke-linecap="round"/>`;};
      if(unitsHint&&phase==='units'){
        const aU=c('colx-aU'),bU=c('colx-bU');
        const aCy=(aU.top+aU.bot)/2,bCy=(bU.top+bU.bot)/2;
        html+=`<g class="hint-fade">${ell(aU.x,aCy,29,33)}${ell(bU.x,bCy,29,33)}${plusAt(aU.x+42,(aCy+bCy)/2)}</g>`;
      }
      if(tensHint&&phase==='tens'){
        const aT2=c('colx-aT'),bT2=c('colx-bT');
        const aTy=(aT2.top+aT2.bot)/2,bTy=(bT2.top+bT2.bot)/2;
        const px2=aT2.x-42;
        let parts=ell(aT2.x,aTy,29,33)+ell(bT2.x,bTy,29,33)+plusAt(px2,(aTy+bTy)/2);
        if(P.carry&&$('colx-carry').classList.contains('show')){
          const ct=c('colx-carry');
          const cCy=(ct.top+ct.bot)/2;
          parts+=ell(ct.x,cCy,20,23)+plusAt(px2,(cCy+aTy)/2);
        }
        html+=`<g class="hint-fade">${parts}</g>`;
      }
      svg.innerHTML=html;
    }

    /* the carried 1 flies from the units box up to the tens column */
    function flyCarry(then){
      const wrap=$('colx-pw');
      const wr=wrap.getBoundingClientRect();
      const from=iU.getBoundingClientRect(),to=$('colx-ccell').getBoundingClientRect();
      const fl=document.createElement('span');
      fl.className='colx-fly';fl.textContent='1';
      fl.style.left=(from.left-wr.left+from.width/2)+'px';
      fl.style.top=(from.top-wr.top+from.height/2)+'px';
      wrap.appendChild(fl);
      void fl.offsetWidth;
      fl.style.left=(to.left-wr.left+to.width/2)+'px';
      fl.style.top=(to.top-wr.top+to.height*0.62)+'px';
      fl.style.transform='translate(-50%,-50%) scale(1)';
      later(()=>{
        fl.remove();
        const ce=$('colx-carry');
        ce.textContent='1';ce.classList.add('show','pop');
        drawLines();
        if(then)then();
      },620);
    }

    /* the aid is the game's own skinned number line. It is ORIENTED to the
       TOP number's digit of the current column: in the units phase the rider
       parks on the top number's units digit (P.aU) so the child counts the
       bottom units up from there; in the tens phase it parks on the top tens
       digit (P.aT) and counts the bottom tens (+carry) up. */
    function anchorNL(){
      if(api.nl)api.nl(phase==='units'?P.aU:P.aT);
    }

    /* units stage — only ever called on Enter (commit=true): judges the answer
       (correct OR wrong) and colors the box green/red. Never runs while typing. */
    function checkUnits(commit){
      if(phase!=='units'||iU.value==='')return;
      if(iU.classList.contains('ans-err'))return;
      const val=parseInt(iU.value,10);
      if(val===P.uSum){
        iU.classList.remove('blink','ans-err');iU.classList.add('ans-ok');
        iU.disabled=true;
        if(P.carry){
          fb('יוֹפִי! הָאֶחָד קוֹפֵץ לָעֲשָׂרוֹת! 🦸');
          later(()=>{iU.value=P.uSum%10;flyCarry(unlockTens);},550);
        }else later(unlockTens,300);
      }else{
        if(!commit)return;
        unitsHint=true;drawLines();
        iU.classList.remove('blink');iU.classList.add('ans-err');
        fb(P.carry&&val===P.uSum%10
          ?'כִּמְעַט! כִּתְבִי אֶת כָּל הַתּוֹצָאָה — גַּם הָעֶשֶׂר! 🤏'
          :'חַבְּרִי אֶת שְׁתֵּי הַסְּפָרוֹת שֶׁבָּעִגּוּלִים 💗');
        anchorNL();
        api.wrong(val);
        later(()=>{
          if(phase==='units'){iU.value='';iU.classList.remove('ans-err');iU.classList.add('blink');iU.focus();}
        },1000);
      }
    }
    function unlockTens(){
      if(phase!=='units')return;
      phase='tens';unitsHint=false;
      iT.disabled=false;iT.classList.add('blink');
      fb('עַכְשָׁו חַבְּרִי אֶת הָעֲשָׂרוֹת ✨');
      drawLines();
      anchorNL();   // move the rider to the tens anchor (visible only post-mistake)
      later(()=>iT.focus(),60);
    }
    function checkTens(commit){
      if(phase!=='tens'||iT.value==='')return;
      if(iT.classList.contains('ans-err'))return;
      const val=parseInt(iT.value,10);
      if(val===P.tSum){
        iT.classList.remove('blink','ans-err');iT.classList.add('ans-ok');
        iT.disabled=true;
        phase='done';drawLines();
        api.solved();
      }else{
        if(!commit)return;
        tensHint=true;drawLines();
        iT.classList.remove('blink');iT.classList.add('ans-err');
        fb(P.carry
          ?'חַבְּרִי אֶת הַסְּפָרוֹת שֶׁבָּעִגּוּלִים — גַּם אֶת הָאֶחָד שֶׁלְּמַעְלָה! 💗'
          :'חַבְּרִי אֶת שְׁתֵּי הַסְּפָרוֹת שֶׁבָּעִגּוּלִים 💗');
        anchorNL();
        api.wrong(val);
        later(()=>{
          if(phase==='tens'){iT.value='';iT.classList.remove('ans-err');iT.classList.add('blink');iT.focus();}
        },1000);
      }
    }

    // answers are checked ONLY on Enter — never live while typing. Otherwise a
    // child could brute-force digits and the box would auto-accept (and advance
    // to the tens column) the moment the right number happened to appear.
    // Live input just sanitizes to digits; the green/red mark waits for Enter.
    iU.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    iT.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    iU.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();checkUnits(true);}});
    iT.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();checkTens(true);}});
    const onResize=()=>{positionPlus();drawLines();};
    window.addEventListener('resize',onResize);

    requestAnimationFrame(()=>{positionPlus();drawLines();anchorNL();iU.focus();});

    return function cleanup(){
      window.removeEventListener('resize',onResize);
      timers.forEach(clearTimeout);
      root.innerHTML='';
    };
  }

  return{
    t:TCA,
    modes:['sup'],
    aidsReveal:'always',   // the skinned number line shows from the start
    make(mode){return mode==='sup'?makePool():[];},
    mount,
  };
})();
