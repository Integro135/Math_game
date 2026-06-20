/* ── Column-subtraction exercise module (חִסּוּר בְּטוּר ➖) ─────────────────────
   The mirror of column_add.ex.js. Two-stage column subtraction: units first,
   then tens. The star of the show is the BORROW (פְּרִיטָה) — the exact reverse
   of the carry: when the top units are too few, a TEN flies DOWN from the tens
   column into the units (the top tens digit drops by one — struck out with the
   new value above it — and the top units gain a small ¹, reading as +10).

   Borrow interaction (chosen in settings → subBorrowMode, read at mount):
   • HYBRID (default): the FIRST borrow problem of the load auto-plays the borrow
     as a teacher demo; after that the child performs it by TAPPING the top tens
     digit ("send a ten down").
   • AUTO: the regrouping animates itself on EVERY borrow (a passive demo).
   Either way, typing the correct units before borrowing is also accepted (and
   reinforced by replaying the animation).

   Aid: the game's own SKINNED number line, COUNT-BACK — parked on the top
   number's current-column digit (after a borrow the units anchor is aU+10), so
   the child hops back the bottom digit. (main.js steps the rider −1 for TCS.)

   Contract (loaded by bg-loader.loadExercise, mounted by core.js _colxMount):
     window.EXERCISES.types.column_sub = { t, modes, aidsReveal, make(mode), mount }
   mount({root,a,b,api}) → cleanup    a = minuend (top), b = subtrahend (bottom)
   api.wrong(val) / api.nl(anchor) / api.solved()  — identical host contract to
   column_add. Inputs carry the global `ans-inp` class (green/red border rule).
   Problem shape: { t:TCS, a, b }  (always a > b). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.column_sub=(()=>{

  // pool: 12 column-subtraction problems (a=11..29, b=2..19, a>b), ≥7 needing a
  // borrow (top units < bottom units). Generated so the standard algorithm never
  // goes negative in any column (a>b guarantees it).
  function makePool(){
    const ri=(lo,hi)=>lo+(Math.random()*(hi-lo+1)|0);
    const out=[],seen=new Set();
    const want=(borrow)=>{
      for(let tries=0;tries<300;tries++){
        const a=ri(11,29),b=ri(2,19);
        if(a<=b)continue;                          // positive result only
        const needsBorrow=(a%10)<(b%10);
        const key=a+'_'+b;
        if(needsBorrow===borrow&&!seen.has(key)){seen.add(key);out.push({t:TCS,a,b});return;}
      }
    };
    for(let i=0;i<7;i++)want(true);
    for(let i=0;i<5;i++)want(false);
    for(let i=out.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }

  // NO-BORROW column subtractions for the Queen (mx): the top units digit is
  // ALWAYS strictly greater than the bottom's, so no regrouping is ever needed.
  // Kept to teen minuends (a≤19) so every operand stays ≤20 like the rest of mx.
  function makeNoBorrow(n){
    const ri=(lo,hi)=>lo+(Math.random()*(hi-lo+1)|0);
    const out=[],seen=new Set();
    for(let i=0;i<n;i++){
      for(let t=0;t<300;t++){
        const a=ri(11,19),b=ri(2,18);
        if(a<=b)continue;
        if((a%10)<=(b%10))continue;          // top units must be > bottom units
        const key=a+'_'+b;
        if(seen.has(key))continue;
        seen.add(key);out.push({t:TCS,a,b});break;
      }
    }
    return out;
  }

  const CSS=`
  .colxs-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}
  .colxs-wrap{position:relative;display:inline-block;padding-left:64px}
  .colxs-plus{position:absolute;left:6px;top:0;font-family:'Fredoka One',cursive;font-size:2.9rem;
    color:var(--skin-text,#fff);opacity:.55;line-height:1;pointer-events:none}
  .colxs-grid{display:inline-grid;grid-template-columns:84px 84px;direction:ltr}
  .colxs-carry-cell{height:44px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px}
  .colxs-bnew{font-family:'Fredoka One',cursive;font-size:2.8rem;color:#FF6B9D;
    text-shadow:0 0 14px rgba(255,107,157,.8);line-height:1;opacity:0}
  .colxs-bnew.show{opacity:1}
  .colxs-bnew.pop{animation:colxsPop .4s cubic-bezier(.34,1.56,.64,1) both}
  @keyframes colxsPop{0%{transform:scale(1.6)}100%{transform:scale(1)}}
  .colxs-fly{position:absolute;font-family:'Fredoka One',cursive;font-size:1.7rem;color:#FF6B9D;
    text-shadow:0 0 14px rgba(255,107,157,.8);line-height:1;
    transform:translate(-50%,-50%) scale(1.35);
    transition:left .6s cubic-bezier(.3,1.3,.5,1),top .6s cubic-bezier(.3,1.3,.5,1),
      transform .6s cubic-bezier(.3,1.3,.5,1);
    pointer-events:none;z-index:6}
  .colxs-digit{position:relative;height:74px;display:flex;align-items:center;justify-content:center;
    font-family:'Fredoka One',cursive;font-size:3.9rem;color:var(--skin-text,#fff);
    text-shadow:0 0 18px rgba(160,190,255,.35);line-height:1}
  .colxs-digit.struck{text-decoration:line-through;text-decoration-color:#FF6B9D;
    text-decoration-thickness:4px;opacity:.5}
  .colxs-digit.borrowable{cursor:pointer}
  .colxs-digit.borrowable::after{content:'';position:absolute;inset:6px;border-radius:14px;
    border:2.5px dashed rgba(255,107,157,.85);animation:colxsPulse 1.3s ease-in-out infinite}
  .colxs-borrow{position:absolute;top:6px;left:8px;font-size:1.96rem;color:#FF6B9D;
    text-shadow:0 0 10px rgba(255,107,157,.85);opacity:0;line-height:1}
  .colxs-borrow.show{opacity:1}
  .colxs-div{grid-column:1/span 2;padding:6px 4px 4px}
  .colxs-div-line{height:4px;border-radius:3px;
    background:linear-gradient(90deg,var(--skin-glow,#7dc4ff),var(--skin-primary,#c77dff),var(--skin-accent,#ffd27d))}
  .colxs-input-cell{height:92px;display:flex;align-items:center;justify-content:center}
  #colx-root .ans-inp.colxs-inp{width:76px;height:74px;font-size:2.6rem;border-radius:16px}
  #colx-root .colxs-inp:disabled{opacity:.25}
  #colx-root .colxs-inp.ans-ok:disabled,#colx-root .colxs-inp.blink:disabled{opacity:1}
  #colx-root .colxs-inp.blink{animation:colxsBlink 1.1s ease-in-out infinite alternate}
  @keyframes colxsBlink{
    from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 22px var(--skin-accent,#ffd27d),0 0 44px rgba(255,210,125,.35)}}
  .colxs-connectors{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
  @keyframes colxsPulse{0%,100%{opacity:.3}50%{opacity:.85}}
  .colxs-connectors line.pulse{animation:colxsPulse 1.5s ease-in-out infinite}
  .colxs-connectors .hint-fade{animation:colxsHintFade .45s ease both}
  @keyframes colxsHintFade{from{opacity:0}to{opacity:1}}
  /* ── mistake-teaching animations (one per borrow learning-method) ── */
  .colxs-teach{position:absolute;pointer-events:none;z-index:7}
  .colxs-finger{position:absolute;font-size:2.3rem;transform:translate(-50%,-50%);
    filter:drop-shadow(0 3px 4px rgba(0,0,0,.45));animation:colxsTap .95s ease-in-out infinite}
  @keyframes colxsTap{0%,100%{transform:translate(-50%,-95%) rotate(-10deg)}45%,60%{transform:translate(-50%,-42%) rotate(3deg)}}
  .colxs-ripple{position:absolute;border-radius:50%;border:3px solid rgba(255,107,157,.9);
    transform:translate(-50%,-50%);animation:colxsRipple 1.4s ease-out infinite}
  @keyframes colxsRipple{0%{opacity:.85;width:18px;height:18px}100%{opacity:0;width:110px;height:110px}}
  .colxs-tapring{position:absolute;border-radius:16px;border:3px solid rgba(255,107,157,.9);
    transform:translate(-50%,-50%);animation:colxsTapRing 1.1s ease-in-out infinite}
  @keyframes colxsTapRing{0%,100%{box-shadow:0 0 8px rgba(255,107,157,.45);opacity:.7}50%{box-shadow:0 0 24px rgba(255,107,157,.95);opacity:1}}
  .colxs-ten{position:absolute;font-family:'Fredoka One',cursive;font-size:2.1rem;color:#FF6B9D;
    text-shadow:0 0 16px rgba(255,107,157,.9);transform:translate(-50%,-50%);
    transition:left .55s cubic-bezier(.3,1.25,.5,1),top .55s cubic-bezier(.3,1.25,.5,1),opacity .35s,transform .35s}
  .colxs-onedot{position:absolute;width:15px;height:15px;border-radius:50%;
    background:radial-gradient(circle at 35% 30%,#fff,#ffd27d 60%,#f0a020);
    box-shadow:0 0 8px rgba(255,210,125,.95);transform:translate(-50%,-50%) scale(0);
    transition:left .5s cubic-bezier(.3,1.25,.5,1),top .5s cubic-bezier(.3,1.25,.5,1),transform .4s,opacity .45s}
  .colxs-teach-lbl{position:absolute;font-family:'Fredoka One',cursive;font-size:.95rem;
    color:#fff;background:rgba(255,107,157,.9);padding:3px 11px;border-radius:13px;
    transform:translate(-50%,-50%) scale(.6);white-space:nowrap;opacity:0;
    transition:opacity .3s,transform .3s;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  .colxs-teach-lbl.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
  /* ── start-of-exercise borrow demo: hand cursor + "−10" + the 1 sliding over ── */
  .colxs-hand{position:absolute;font-size:2.5rem;transform:translate(-50%,-50%);
    filter:drop-shadow(0 3px 5px rgba(0,0,0,.5));z-index:8;
    transition:left .4s cubic-bezier(.4,1.25,.5,1),top .4s cubic-bezier(.4,1.25,.5,1)}
  .colxs-minus10{position:absolute;font-family:'Fredoka One',cursive;font-size:1.5rem;color:#FF4D6D;
    text-shadow:0 0 12px rgba(255,77,109,.9);transform:translate(-50%,-50%) scale(.4);opacity:0;line-height:1;
    transition:opacity .3s,transform .35s cubic-bezier(.34,1.56,.64,1)}
  .colxs-minus10.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
  .colxs-moveone{position:absolute;font-family:'Fredoka One',cursive;font-size:2.2rem;color:#FF6B9D;
    text-shadow:0 0 14px rgba(255,107,157,.9);line-height:1;z-index:8;
    transition:left .62s cubic-bezier(.3,1.2,.5,1),top .62s cubic-bezier(.3,1.2,.5,1),transform .62s cubic-bezier(.3,1.2,.5,1)}
  @media(max-width:480px){
    .colxs-grid{grid-template-columns:64px 64px}
    .colxs-digit{height:56px;font-size:2.9rem}
    #colx-root .ans-inp.colxs-inp{width:58px;height:56px;font-size:2rem}
    .colxs-wrap{padding-left:48px}
    .colxs-plus{font-size:2.2rem}
  }`;

  function injectStyle(){
    if(document.getElementById('colxs-style'))return;
    const st=document.createElement('style');
    st.id='colxs-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _borrowDemoShown=false;   // auto-demo the borrow only on the first borrow problem

  function mount({root,a,b,api}){
    injectStyle();
    const P={
      a,b,
      aT:Math.floor(a/10),aU:a%10,
      bT:Math.floor(b/10),bU:b%10,
    };
    P.borrow=P.aU<P.bU?1:0;
    P.uDiff=(P.borrow?P.aU+10:P.aU)-P.bU;   // units result (always 0-9)
    P.aTeff=P.aT-P.borrow;                  // the top tens after a borrow
    P.tDiff=P.aTeff-P.bT;                   // tens result (0-2)
    let phase='units';            // 'units' | 'tens' | 'done'
    let borrowed=false;           // has the ten been taken down yet?
    let unitsHint=false,tensHint=false,borrowHint=false;
    const timers=[];
    const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    // borrow method (settings): 'auto' regroups by itself on every borrow,
    // 'hybrid' demonstrates once then lets the child tap to regroup
    let AUTO=false;try{AUTO=localStorage.getItem('subBorrow')==='auto';}catch(e){}

    root.innerHTML=`
      <div class="colxs-wrap" id="colx-pw">
        <svg class="colxs-connectors" id="colx-svg"></svg>
        <span class="colxs-plus" id="colx-plus">−</span>
        <div class="colxs-grid">
          <div class="colxs-carry-cell" id="colx-ccell"><span class="colxs-bnew" id="colx-bnew"></span></div>
          <div class="colxs-carry-cell"></div>
          <div class="colxs-digit${P.borrow?' borrowable':''}" id="colx-aT">${P.aT}</div>
          <div class="colxs-digit" id="colx-aU"><span class="colxs-borrow" id="colx-borrow"></span>${P.aU}</div>
          <div class="colxs-digit" id="colx-bT">${P.bT}</div>
          <div class="colxs-digit" id="colx-bU">${P.bU}</div>
          <div class="colxs-div"><div class="colxs-div-line" id="colx-dvl"></div></div>
          <div class="colxs-input-cell"><input class="ans-inp colxs-inp" id="colx-iT" type="text" inputmode="numeric" maxlength="1" disabled aria-label="תּוֹצְאַת הָעֲשָׂרוֹת"></div>
          <div class="colxs-input-cell"><input class="ans-inp colxs-inp blink" id="colx-iU" type="text" inputmode="numeric" maxlength="1" aria-label="תּוֹצְאַת הָאֲחָדוֹת"></div>
        </div>
      </div>`;

    const $=id=>root.querySelector('#'+id);
    const iU=$('colx-iU'),iT=$('colx-iT');

    function fb(msg){const h=document.getElementById('hint');if(h)h.textContent=msg;}
    fb(P.borrow
      ?(AUTO
        ?'🦸 חַסְּרִי בְּעַמּוּדוֹת! אֵין מַסְפִּיק אֲחָדוֹת — לוֹקְחִים 10 מֵהָעֲשָׂרוֹת 🔟'
        :'🦸 חַסְּרִי בְּעַמּוּדוֹת! אֵין מַסְפִּיק אֲחָדוֹת — לַחֲצִי עַל הָעֲשָׂרוֹת לָקַחַת 10! 🔟')
      :'🦸 חַסְּרִי אֶת הָאֲחָדוֹת!');

    /* the − sign centered between the two number rows */
    function positionPlus(){
      const pw=$('colx-pw');if(!pw)return;
      const wr=pw.getBoundingClientRect();
      if(!wr.width)return;
      const ra=$('colx-aT').getBoundingClientRect(),rb=$('colx-bT').getBoundingClientRect();
      const midY=(ra.top+ra.height/2+rb.top+rb.height/2)/2-wr.top;
      const plus=$('colx-plus');
      plus.style.top=(midY-plus.offsetHeight/2)+'px';
    }

    /* V connectors under the inputs + post-mistake hint circles */
    function drawLines(){
      const svg=$('colx-svg');if(!svg)return;
      const pw=$('colx-pw');if(!pw)return;
      const wr=pw.getBoundingClientRect();
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
      const minusAt=(px,py)=>{py=Math.round(py);
        return`<line x1="${px-8}" y1="${py}" x2="${px+8}" y2="${py}" stroke="${hc}" stroke-width="2.5" stroke-linecap="round"/>`;};
      // borrow nudge: ring the top tens digit ("tap me")
      if(borrowHint&&phase==='units'&&!borrowed){
        const aT=c('colx-aT');
        html+=`<g class="hint-fade">${ell(aT.x,(aT.top+aT.bot)/2,33,37)}</g>`;
      }
      if(unitsHint&&phase==='units'){
        const aU=c('colx-aU'),bU=c('colx-bU');
        const aCy=(aU.top+aU.bot)/2,bCy=(bU.top+bU.bot)/2;
        html+=`<g class="hint-fade">${ell(aU.x,aCy,29,33)}${ell(bU.x,bCy,29,33)}${minusAt(aU.x+42,(aCy+bCy)/2)}</g>`;
      }
      if(tensHint&&phase==='tens'){
        const aT2=c('colx-aT'),bT2=c('colx-bT');
        const aTy=(aT2.top+aT2.bot)/2,bTy=(bT2.top+bT2.bot)/2;
        html+=`<g class="hint-fade">${ell(aT2.x,aTy,29,33)}${ell(bT2.x,bTy,29,33)}${minusAt(aT2.x-42,(aTy+bTy)/2)}</g>`;
      }
      svg.innerHTML=html;
    }

    /* The borrow (פְּרִיטָה): the top tens digit loses ten — a "−10" pops beside
       it and it is struck (its decremented value shown above) — and that ten
       slides over as a "1" that SHRINKS to sit beside the units digit (the ¹,
       reading the top units as +10). */
    function flyBorrow(then){
      if(borrowed){if(then)then();return;}
      borrowed=true;
      clearTeach();                         // a tap (or auto) resolves the tap-guide
      $('colx-aT').classList.remove('borrowable');
      const wrap=$('colx-pw'),aT=wrapXY('colx-aT'),aU=wrapXY('colx-aU');
      // 1) "−10" pops next to the tens digit — it loses a ten
      const m10=document.createElement('div');m10.className='colxs-teach colxs-minus10';m10.textContent='−10';
      m10.style.left=(aT.x-aT.w*0.46)+'px';m10.style.top=(aT.y+6)+'px';wrap.appendChild(m10);
      void m10.offsetWidth;m10.classList.add('show');
      // 2) strike the tens + show its decremented value above (kept for the tens step)
      $('colx-aT').classList.add('struck');
      const bn=$('colx-bnew');bn.textContent=P.aTeff;bn.classList.add('show','pop');
      // 3) the borrowed ten slides over as a "1" that shrinks to sit by the units
      const one=document.createElement('div');one.className='colxs-teach colxs-moveone';one.textContent='1';
      one.style.left=aT.x+'px';one.style.top=(aT.bot-4)+'px';
      one.style.transform='translate(-50%,-50%) scale(1.4)';
      wrap.appendChild(one);
      void one.offsetWidth;
      later(()=>{
        one.style.left=(aU.x-aU.w*0.32)+'px';
        one.style.top=(aU.top+12)+'px';
        one.style.transform='translate(-50%,-50%) scale(0.5)';
      },90);
      later(()=>{
        one.remove();
        const bw=$('colx-borrow');bw.textContent='1';bw.classList.add('show');   // the ¹ by the units
        fb(`יוֹפִי! עָבַר 10 לָאֲחָדוֹת — עַכְשָׁו יֵשׁ ${P.aU+10}. חַסְּרִי! 💪`);
        unitsHint=false;borrowHint=false;
        anchorNL();drawLines();iU.focus();
        if(then)then();
      },720);
      later(()=>{if(m10.parentNode)m10.classList.remove('show');},2000);  // the −10 cue fades
    }

    /* start-of-exercise borrow demo: a hand cursor moves to the top tens digit
       and taps it, THEN the borrow plays (flyBorrow). Used by the auto-demo. */
    function playBorrowDemo(){
      if(borrowed||phase!=='units')return;
      const wrap=$('colx-pw'),aT=wrapXY('colx-aT');
      const hand=document.createElement('div');hand.className='colxs-teach colxs-hand';hand.textContent='👆';
      hand.style.left=(aT.x+aT.w*0.62)+'px';hand.style.top=(aT.bot+54)+'px';
      wrap.appendChild(hand);
      void hand.offsetWidth;
      later(()=>{hand.style.left=(aT.x+aT.w*0.22)+'px';hand.style.top=(aT.bot+4)+'px';},80);   // reach up to tap
      later(()=>{                                                                              // the "click" ripple
        const rp=document.createElement('div');rp.className='colxs-teach colxs-ripple';
        rp.style.left=aT.x+'px';rp.style.top=aT.y+'px';rp.style.animationIterationCount='1';wrap.appendChild(rp);
      },520);
      later(()=>{hand.style.top=(aT.bot+30)+'px';},620);                                       // lift off
      later(()=>{if(hand.parentNode)hand.remove();if(!borrowed&&phase==='units')flyBorrow();},860);
    }

    /* ── mistake-teaching animations — one per borrow learning-method ──────────
       Played AFTER the sad modal clears (so they are the visible focus). */
    function clearTeach(){
      const wrap=$('colx-pw');if(!wrap)return;
      wrap.querySelectorAll('.colxs-teach').forEach(el=>el.remove());
    }
    function wrapXY(id){
      const w=$('colx-pw').getBoundingClientRect(),r=$(id).getBoundingClientRect();
      return{x:r.left-w.left+r.width/2,y:r.top-w.top+r.height/2,w:r.width,h:r.height,
             top:r.top-w.top,bot:r.bottom-w.top};
    }
    /* TAP method (hybrid): an elaborate "tap the tens to borrow" guide — a
       pulsing ring + ripples on the tens digit and a finger that taps it. */
    function teachTap(){
      if(phase!=='units'||borrowed)return;
      clearTeach();
      const wrap=$('colx-pw'),aT=wrapXY('colx-aT');
      const ring=document.createElement('div');ring.className='colxs-teach colxs-tapring';
      ring.style.left=aT.x+'px';ring.style.top=aT.y+'px';
      ring.style.width=(aT.w-8)+'px';ring.style.height=(aT.h-8)+'px';wrap.appendChild(ring);
      for(let i=0;i<2;i++){const rp=document.createElement('div');rp.className='colxs-teach colxs-ripple';
        rp.style.left=aT.x+'px';rp.style.top=aT.y+'px';rp.style.animationDelay=(i*0.7)+'s';wrap.appendChild(rp);}
      const fg=document.createElement('div');fg.className='colxs-teach colxs-finger';fg.textContent='👆';
      fg.style.left=(aT.x+aT.w*0.30)+'px';fg.style.top=(aT.bot+2)+'px';wrap.appendChild(fg);
      const lbl=document.createElement('div');lbl.className='colxs-teach colxs-teach-lbl';
      lbl.textContent='לַחֲצִי לִשְׁאֹל 10!';lbl.style.left=aT.x+'px';lbl.style.top=(aT.bot+48)+'px';wrap.appendChild(lbl);
      later(()=>lbl.classList.add('show'),60);
      borrowHint=true;drawLines();
      fb('אֵין מַסְפִּיק אֲחָדוֹת — לַחֲצִי עַל הָעֲשָׂרוֹת לָקַחַת 10! 👆');
    }
    /* AUTO method: an elaborate regrouping demo — a "10" lifts off the tens and
       bursts into 10 little ones (showing the top now holds aU+10). */
    function teachRegroup(){
      if(phase!=='units')return;
      clearTeach();
      if(!borrowed){                       // make the board show the borrow (idempotent)
        borrowed=true;
        $('colx-aT').classList.remove('borrowable');
        $('colx-aT').classList.add('struck');
        const bn=$('colx-bnew');bn.textContent=P.aTeff;bn.classList.add('show','pop');
        const bw=$('colx-borrow');bw.textContent='1';bw.classList.add('show');
        borrowHint=false;drawLines();
      }
      const wrap=$('colx-pw'),aT=wrapXY('colx-aT'),aU=wrapXY('colx-aU');
      const burstX=aU.x,burstY=aU.bot+26,cols=5,gap=20;
      const ten=document.createElement('div');ten.className='colxs-teach colxs-ten';ten.textContent='10';
      ten.style.left=aT.x+'px';ten.style.top=aT.y+'px';wrap.appendChild(ten);
      void ten.offsetWidth;
      later(()=>{ten.style.left=burstX+'px';ten.style.top=burstY+'px';},60);
      later(()=>{
        ten.style.opacity='0';ten.style.transform='translate(-50%,-50%) scale(.3)';
        for(let i=0;i<10;i++){
          const d=document.createElement('div');d.className='colxs-teach colxs-onedot';
          d.style.left=burstX+'px';d.style.top=burstY+'px';wrap.appendChild(d);
          const tx=burstX+((i%cols)-(cols-1)/2)*gap,ty=burstY+((i/cols)|0)*gap;
          (function(dd,x,y,k){later(()=>{dd.style.transform='translate(-50%,-50%) scale(1)';dd.style.left=x+'px';dd.style.top=y+'px';},k*45);})(d,tx,ty,i);
        }
      },560);
      const lbl=document.createElement('div');lbl.className='colxs-teach colxs-teach-lbl';
      lbl.textContent='10 = עֶשֶׂר אֲחָדוֹת!';lbl.style.left=burstX+'px';lbl.style.top=(burstY+2*gap+8)+'px';wrap.appendChild(lbl);
      later(()=>lbl.classList.add('show'),720);
      fb(`רוֹאָה? עֶשֶׂר אֲחָדוֹת! עַכְשָׁו יֵשׁ ${P.aU+10} אֲחָדוֹת — חַסְּרִי ${P.bU} 💪`);
      anchorNL();
      later(()=>{clearTeach();if(phase==='units')iU.focus();},2400);
    }

    /* the aid is the game's own skinned number line, COUNT-BACK: it is parked on
       the TOP number's current-column digit (after a borrow the units anchor is
       aU+10) so the child hops the bottom digit BACK from there. */
    function anchorNL(){
      if(!api.nl)return;
      api.nl(phase==='units'?(borrowed?Math.min(20,P.aU+10):P.aU):P.aTeff);
    }

    /* units stage — judged only on Enter (commit=true) */
    function checkUnits(commit){
      if(phase!=='units'||iU.value==='')return;
      if(iU.classList.contains('ans-err'))return;
      const val=parseInt(iU.value,10);
      if(val===P.uDiff){
        iU.classList.remove('blink','ans-err');iU.classList.add('ans-ok');
        iU.disabled=true;
        if(P.borrow&&!borrowed){
          fb('יָפֶה! קֹדֶם לוֹקְחִים 10 מֵהָעֲשָׂרוֹת 🔟');
          later(()=>flyBorrow(()=>later(unlockTens,250)),250);
        }else later(unlockTens,300);
      }else{
        if(!commit)return;
        iU.classList.remove('blink');iU.classList.add('ans-err');
        // immediate textual nudge (the sad modal covers the board for ~1.5s)
        if(P.borrow&&!borrowed)
          fb(AUTO?'קֹדֶם לוֹקְחִים 10 מֵהָעֲשָׂרוֹת! 🔟':'אֵין מַסְפִּיק אֲחָדוֹת — לַחֲצִי עַל הָעֲשָׂרוֹת! 👆');
        else if(P.borrow)fb('בּוֹאִי נִסְפֹּר שׁוּב יַחַד 💗');
        else{unitsHint=true;fb('חַסְּרִי אֶת הָאֲחָדוֹת שֶׁבָּעִגּוּלִים 💗');}
        drawLines();
        anchorNL();
        api.wrong(val);
        later(()=>{
          if(phase==='units'){iU.value='';iU.classList.remove('ans-err');iU.classList.add('blink');iU.focus();}
        },1000);
        // after the sad modal clears, play the elaborate teaching animation for
        // the active learning-method: the tap-guide (hybrid) or the regroup demo
        // (auto, or whenever the ten has already come down)
        if(P.borrow)later(()=>{
          if(phase!=='units')return;
          if(AUTO||borrowed)teachRegroup();else teachTap();
        },1550);
      }
    }
    function unlockTens(){
      if(phase!=='units')return;
      phase='tens';unitsHint=false;borrowHint=false;clearTeach();
      iT.disabled=false;iT.classList.add('blink');
      fb('עַכְשָׁו חַסְּרִי אֶת הָעֲשָׂרוֹת ✨');
      drawLines();
      anchorNL();
      later(()=>iT.focus(),60);
    }
    function checkTens(commit){
      if(phase!=='tens'||iT.value==='')return;
      if(iT.classList.contains('ans-err'))return;
      const val=parseInt(iT.value,10);
      if(val===P.tDiff){
        iT.classList.remove('blink','ans-err');iT.classList.add('ans-ok');
        iT.disabled=true;
        phase='done';drawLines();
        api.solved();
      }else{
        if(!commit)return;
        tensHint=true;drawLines();
        iT.classList.remove('blink');iT.classList.add('ans-err');
        fb(P.borrow
          ?'זִכְרִי — לָקַחְנוּ 10, אָז נִשְׁאֲרוּ פָּחוֹת עֲשָׂרוֹת לְמַעְלָה! 💗'
          :'חַסְּרִי אֶת הָעֲשָׂרוֹת שֶׁבָּעִגּוּלִים 💗');
        anchorNL();
        api.wrong(val);
        later(()=>{
          if(phase==='tens'){iT.value='';iT.classList.remove('ans-err');iT.classList.add('blink');iT.focus();}
        },1000);
      }
    }

    /* tap the top tens digit to "send a ten down" (the borrow) */
    function doBorrow(){
      if(!P.borrow||borrowed||phase!=='units')return;
      flyBorrow();
    }
    $('colx-aT').addEventListener('click',doBorrow);

    // answers are checked ONLY on Enter — never live while typing.
    iU.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    iT.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    iU.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();checkUnits(true);}});
    iT.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();checkTens(true);}});

    /* ── digit object-preview ───────────────────────────────────────────────
       Hovering a column digit shows its objects in the shared #num-tt modal, to
       the RIGHT of the digit, scoped to the CURRENT column. */
    function digitInfo(kind){
      if(phase==='units'){
        if(kind==='aU')return{n:borrowed?P.aU+10:P.aU};
        if(kind==='bU')return{n:P.bU};
        return null;
      }
      if(phase==='tens'){
        if(kind==='aT')return{n:P.aTeff};
        if(kind==='bT')return{n:P.bT};
        return null;
      }
      return null;
    }
    function bindHover(el,kind){
      if(!el)return;
      el.style.cursor=el.classList.contains('borrowable')?'pointer':'help';
      el.addEventListener('mouseenter',()=>{
        const info=digitInfo(kind);
        if(info&&info.n>0&&typeof _nttRender==='function')_nttRender(info.n,null,el,'right');
        else if(typeof _nttHide==='function')_nttHide();
      });
      el.addEventListener('mouseleave',()=>{if(typeof _nttHide==='function')_nttHide();});
    }
    bindHover($('colx-aU'),'aU');bindHover($('colx-bU'),'bU');
    bindHover($('colx-aT'),'aT');bindHover($('colx-bT'),'bT');

    const onResize=()=>{positionPlus();drawLines();};
    window.addEventListener('resize',onResize);

    let _mountRaf=requestAnimationFrame(()=>{
      _mountRaf=0;
      if(!$('colx-pw'))return;   // mount torn down before first paint (rapid re-mount)
      positionPlus();drawLines();anchorNL();iU.focus();
      if(P.borrow){
        if(AUTO){
          // AUTOMATIC: the hand-tap borrow demo plays itself on every borrow
          $('colx-aT').classList.remove('borrowable');
          later(()=>{if(!borrowed&&phase==='units')playBorrowDemo();},900);
        }else if(!_borrowDemoShown){
          // HYBRID (default): on the first borrow problem show a LOOPING cursor
          // guide on the tens digit — the borrow plays ONLY when the child
          // actually taps the tens (doBorrow → flyBorrow); it is never auto-fired.
          _borrowDemoShown=true;
          later(()=>{if(!borrowed&&phase==='units')teachTap();},1100);
        }
      }
    });

    return function cleanup(){
      window.removeEventListener('resize',onResize);
      if(_mountRaf)cancelAnimationFrame(_mountRaf);
      timers.forEach(clearTimeout);
      root.innerHTML='';
    };
  }

  return{
    t:TCS,
    modes:['sub_col','mx','sup'],
    aidsReveal:'always',   // the skinned number line shows from the start
    // 'sub_col' = the dedicated game (borrow + no-borrow); 'mx' (Queen) & 'sup'
    // (Superman) each get a couple of NO-BORROW column subtractions woven in.
    make(mode){return mode==='sub_col'?makePool():(mode==='mx'||mode==='sup')?makeNoBorrow(2):[];},
    mount,
  };
})();
