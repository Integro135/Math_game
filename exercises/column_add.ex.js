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

  // pool: column-addition problems, BOTH operands two-digit, sum ≤ 99 (so the
  // tens of the result stay a single digit), ≥ nCarry with a units-carry.
  // Results now reach up to 99 (e.g. 47 + 38 = 85, 64 + 29 = 93) — was capped at
  // 39 + 19 = 58; widened to "up to 99" as the child progressed.
  function makePool(nCarry,nNoCarry){
    nCarry=nCarry==null?7:nCarry; nNoCarry=nNoCarry==null?5:nNoCarry;
    const ri=(lo,hi)=>lo+(Math.random()*(hi-lo+1)|0);
    const out=[],seen=new Set();
    const want=(carry)=>{
      for(let tries=0;tries<400;tries++){
        const a=ri(13,86);
        const bMax=Math.min(99-a,86);
        if(bMax<10)continue;                 // keep b a genuine two-digit addend
        const b=ri(10,bMax);
        const hasCarry=(a%10)+(b%10)>=10;
        const key=a+'_'+b;
        if(hasCarry===carry&&!seen.has(key)){seen.add(key);out.push({t:TCA,a,b});return;}
      }
    };
    for(let i=0;i<nCarry;i++)want(true);
    for(let i=0;i<nNoCarry;i++)want(false);
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
  /* GREEN "+10" cue above the tens — a ten was carried up from the units
     (mirrors the column-subtraction borrow's green +10) */
  .colx-plus10{position:absolute;font-family:'Fredoka One',cursive;font-size:1.15rem;color:#fff;
    background:#22a54a;padding:4px 11px;border-radius:13px;box-shadow:0 2px 10px rgba(34,165,74,.6);
    white-space:nowrap;transform:translate(-50%,-50%) scale(.4);opacity:0;line-height:1;pointer-events:none;
    z-index:7;transition:opacity .3s,transform .35s cubic-bezier(.34,1.56,.64,1)}
  .colx-plus10.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
  /* RED "−10" cue by the units — ten LEAVES the units (only the ones digit
     stays) as it is carried up; mirrors the green +10 on the tens */
  .colx-minus10{position:absolute;font-family:'Fredoka One',cursive;font-size:1.15rem;color:#fff;
    background:#e53935;padding:4px 11px;border-radius:13px;box-shadow:0 2px 10px rgba(229,57,53,.6);
    white-space:nowrap;transform:translate(-50%,-50%) scale(.4);opacity:0;line-height:1;pointer-events:none;
    z-index:7;transition:opacity .3s,transform .35s cubic-bezier(.34,1.56,.64,1)}
  .colx-minus10.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
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
  /* intro: the original one-line equation + a "show in column" button */
  .colx-intro{display:flex;flex-direction:column;align-items:center;gap:22px;padding:14px 0}
  .colx-intro-eq{direction:ltr;font-family:'Fredoka One',cursive;font-size:3.2rem;
    color:var(--skin-text,#fff);text-shadow:0 0 18px rgba(160,190,255,.35);letter-spacing:3px}
  /* staged (אַלּוּפָה) "solve horizontally first" row — input + ✓ */
  .colx-solve-row{display:flex;gap:12px;align-items:center;justify-content:center;direction:ltr}
  #colx-root .ans-inp.colx-solve-inp{width:96px;height:66px;font-size:2.5rem;border-radius:16px;text-align:center}
  #colx-root .colx-solve-inp.blink{animation:colxBlink 1.1s ease-in-out infinite alternate}
  .colx-solve-btn{font-family:'Fredoka One',cursive;font-size:1.35rem;border:0;border-radius:14px;
    padding:13px 26px;cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .colx-solve-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .colx-show-btn{display:inline-flex;align-items:center;gap:12px;font-family:'Fredoka One',cursive;
    font-size:1.4rem;color:#fff;cursor:pointer;
    background:linear-gradient(135deg,var(--skin-glow,#7dc4ff),var(--skin-primary,#c77dff) 58%,var(--skin-accent,#ffd27d));
    border:none;border-radius:999px;padding:12px 26px 12px 18px;
    box-shadow:0 6px 20px rgba(120,90,200,.5),inset 0 1px 0 rgba(255,255,255,.45);
    animation:colxBtnPulse 1.9s ease-in-out infinite;
    transition:transform .15s,box-shadow .2s,filter .2s}
  .colx-show-btn:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 10px 28px rgba(120,90,200,.6);filter:brightness(1.06)}
  .colx-show-btn:active{transform:translateY(0) scale(.99)}
  .colx-show-ico{width:36px;height:38px;flex:0 0 auto;background:rgba(255,255,255,.22);border-radius:12px;padding:4px}
  @keyframes colxBtnPulse{0%,100%{box-shadow:0 6px 20px rgba(120,90,200,.5),inset 0 1px 0 rgba(255,255,255,.45)}
    50%{box-shadow:0 6px 27px rgba(255,210,125,.65),inset 0 1px 0 rgba(255,255,255,.55)}}
  @media(max-width:480px){
    .colx-grid{grid-template-columns:64px 64px}
    .colx-digit{height:56px;font-size:2.9rem}
    #colx-root .ans-inp.colx-inp{width:58px;height:56px;font-size:2rem}
    .colx-wrap{padding-left:48px}
    .colx-plus{font-size:2.2rem}
    .colx-intro-eq{font-size:2.4rem}
  }`;

  function injectStyle(){
    if(document.getElementById('colx-style'))return;
    const st=document.createElement('style');
    st.id='colx-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  /* mount shows the ORIGINAL one-line equation + a "show in column" button;
     the column board (build) appears only when the child taps it, so they
     first read what problem they're solving. */
  /* ── STAGED (אַלּוּפָה / mulc) flow — MIRRORS column_sub.mountStaged ──────────
     Show the equation HORIZONTALLY with a solvable input FIRST. Solve it in your
     head → full marks (you never see the column). A wrong answer applies a graded
     penalty and DROPS to the column; further column mistakes keep grading down
     and — on the 2nd mistake — open the number line:
        0 mistakes → 100% · 1 → 75% · 2 → 50% (+ number line) · 3+ → 0%
     Uses the host's api.penalize / api.showNL / api.solvedFrac (graded). */
  function mountStaged(ctx){
    injectStyle();
    const {root,a,b,api}=ctx;
    const correct=a+b;
    const FRAC=[1,0.75,0.5,0];
    let mistakes=0,live=null,solved=false;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const flow={
      onWrong:function(v){
        mistakes++;
        if(api.penalize)api.penalize(v);else api.wrong(v);
        if(mistakes===2&&api.showNL)api.showNL();     // 2nd mistake → reveal the number line
      },
      onSolved:function(){
        if(solved)return;solved=true;
        if(api.solvedFrac)api.solvedFrac(FRAC[Math.min(mistakes,3)]);else api.solved();
      },
    };
    function revealColumn(){ if(live||solved)return; root.innerHTML=''; live=build({root,a,b,api,flow}); }
    root.innerHTML=`
      <div class="colx-intro">
        <div class="colx-intro-eq">${a} + ${b} =</div>
        <div class="colx-solve-row">
          <button type="button" class="colx-solve-btn" id="colx-solvebtn" aria-label="בְּדִיקָה">✓</button>
          <input class="ans-inp colx-solve-inp blink" id="colx-solveinp" type="text" inputmode="numeric" maxlength="3" aria-label="הַתְּשׁוּבָה">
        </div>
      </div>`;
    const h=document.getElementById('hint');if(h)h.textContent='🏆 פִּתְרִי בָּרֹאשׁ! אִם תִּטְעִי — נַצִּיג בְּטוּר';
    const inp=root.querySelector('#colx-solveinp'),btn=root.querySelector('#colx-solvebtn');
    function tryHoriz(){
      if(live||solved)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){if(h)h.textContent='כִּתְבִי אֶת הַתְּשׁוּבָה 💗';return;}
      if(v===correct){
        inp.classList.remove('ans-err','blink');inp.classList.add('ans-ok');inp.disabled=true;btn.disabled=true;
        flow.onSolved();
      }else{
        inp.classList.remove('blink');inp.classList.add('ans-err');
        flow.onWrong(v);                              // 1st mistake → 75%
        if(h)h.textContent='כִּמְעַט! בּוֹאִי נִפְתֹּר בְּטוּר, צַעַד־צַעַד 🏆';
        later(revealColumn,900);                      // drop to the column to solve it
      }
    }
    btn.addEventListener('click',tryHoriz);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();tryHoriz();}});
    if(window.__colxAutoReveal)later(revealColumn,10);   // test hook: skip straight to the column board
    later(()=>{if(inp&&!live)inp.focus();},60);
    return function cleanup(){ timers.forEach(clearTimeout); if(live){live();live=null;} else root.innerHTML=''; };
  }

  function mount(ctx){
    injectStyle();
    if(ctx.p&&ctx.p.staged)return mountStaged(ctx);   // אַלּוּפָה: horizontal-first graded flow
    const {root,a,b}=ctx;
    let live=null;
    root.innerHTML=`
      <div class="colx-intro">
        <div class="colx-intro-eq">${a} + ${b} =</div>
        <button type="button" class="colx-show-btn" id="colx-showcol">
          <svg class="colx-show-ico" viewBox="0 0 26 28" aria-hidden="true">
            <rect x="9" y="3" width="14" height="3.4" rx="1.7" fill="#fff"/>
            <g stroke="#fff" stroke-width="2.6" stroke-linecap="round">
              <line x1="3" y1="11" x2="7.4" y2="11"/><line x1="5.2" y1="8.8" x2="5.2" y2="13.2"/></g>
            <rect x="9" y="9.3" width="14" height="3.4" rx="1.7" fill="#fff"/>
            <rect x="2" y="16.4" width="21" height="2.6" rx="1.3" fill="#ffe28a"/>
            <rect x="11" y="22" width="12" height="3.4" rx="1.7" fill="#fff"/>
          </svg>
          <span>הַצֵּג בְּטוּר</span>
        </button>
      </div>`;
    const h=document.getElementById('hint');if(h)h.textContent='🦸 לַחֲצִי "הַצֵּג בְּטוּר" כְּדֵי לִפְתֹּר';
    const btn=root.querySelector('#colx-showcol');
    function reveal(){ if(live)return; root.innerHTML=''; live=build(ctx); }
    btn.addEventListener('click',reveal);
    if(window.__colxAutoReveal)reveal();   // test hook: skip the intro
    return function cleanup(){ if(live){live();live=null;} else root.innerHTML=''; };
  }

  function build(ctx){
    const {root,a,b,api}=ctx;
    // wrong/solved go through a FLOW object so the staged (mulc) mode can swap in
    // graded penalties + a delayed number-line reveal. Default = the plain host
    // contract (api.wrong / api.solved), used by Superman.
    const flow=ctx.flow||{onWrong:function(v){api.wrong(v);},onSolved:function(){api.solved();}};
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
      const pw=$('colx-pw');if(!pw)return;
      const wr=pw.getBoundingClientRect();
      if(!wr.width)return;
      const ra=$('colx-aT').getBoundingClientRect(),rb=$('colx-bT').getBoundingClientRect();
      const midY=(ra.top+ra.height/2+rb.top+rb.height/2)/2-wr.top;
      const plus=$('colx-plus');
      plus.style.top=(midY-plus.offsetHeight/2)+'px';
    }

    /* V connectors + post-mistake hint circles */
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
        // GREEN "+10" badge pops above the tens for a couple of seconds — the
        // units overflowed ten, so a whole ten is carried up to the tens column
        const wr2=wrap.getBoundingClientRect();
        const ct=$('colx-ccell').getBoundingClientRect();
        const p10=document.createElement('div');p10.className='colx-plus10';p10.textContent='+10';
        p10.style.left=(ct.left-wr2.left+ct.width/2)+'px';
        p10.style.top=(ct.top-wr2.top-10)+'px';
        wrap.appendChild(p10);
        void p10.offsetWidth;p10.classList.add('show');
        later(()=>{if(p10.parentNode)p10.classList.remove('show');},2000);
        later(()=>{if(p10.parentNode)p10.remove();},2400);
        // RED "−10" badge by the units — ten left the units to become the carried 1
        const fu=iU.getBoundingClientRect();
        const m10=document.createElement('div');m10.className='colx-minus10';m10.textContent='−10';
        m10.style.left=(fu.left-wr2.left+fu.width+2)+'px';
        m10.style.top=(fu.top-wr2.top+fu.height*0.32)+'px';
        wrap.appendChild(m10);
        void m10.offsetWidth;m10.classList.add('show');
        later(()=>{if(m10.parentNode)m10.classList.remove('show');},2000);
        later(()=>{if(m10.parentNode)m10.remove();},2400);
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
        flow.onWrong(val);
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
        flow.onSolved();
      }else{
        if(!commit)return;
        tensHint=true;drawLines();
        iT.classList.remove('blink');iT.classList.add('ans-err');
        fb(P.carry
          ?'חַבְּרִי אֶת הַסְּפָרוֹת שֶׁבָּעִגּוּלִים — גַּם אֶת הָאֶחָד שֶׁלְּמַעְלָה! 💗'
          :'חַבְּרִי אֶת שְׁתֵּי הַסְּפָרוֹת שֶׁבָּעִגּוּלִים 💗');
        anchorNL();
        flow.onWrong(val);
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

    /* ── digit object-preview ────────────────────────────────────────────────
       Hovering a column digit shows its objects in the shared #num-tt modal, to
       the RIGHT of the digit (below would cover the next row). It is scoped to
       the CURRENT column: only the UNITS digits respond while adding units, only
       the TENS digits (+ the carried 1) while adding tens. On a units carry the
       SECOND number's units digit splits into complete-to-ten | remainder — the
       same number-bond as the equation hover (via the global _bridgeSplit). */
    function digitInfo(kind){
      if(phase==='units'){
        if(kind==='aU')return{n:P.aU,split:null};
        if(kind==='bU'){
          const s=(typeof _bridgeSplit==='function')?_bridgeSplit(P.aU,'add',P.bU):null;
          return{n:P.bU,split:s?[s.left,s.right]:null};
        }
        return null;                       // tens digits inert while adding units
      }
      if(phase==='tens'){
        if(kind==='aT')return{n:P.aT,split:null};
        if(kind==='bT')return{n:P.bT,split:null};
        if(kind==='carry'&&P.carry&&$('colx-carry').classList.contains('show'))return{n:1,split:null};
        return null;                       // units digits inert while adding tens
      }
      return null;                         // done → no preview
    }
    function bindHover(el,kind){
      if(!el)return;
      el.style.cursor='help';
      el.addEventListener('mouseenter',()=>{
        const info=digitInfo(kind);
        if(info&&info.n>0&&typeof _nttRender==='function')_nttRender(info.n,info.split,el,'right');
        else if(typeof _nttHide==='function')_nttHide();
      });
      el.addEventListener('mouseleave',()=>{if(typeof _nttHide==='function')_nttHide();});
    }
    bindHover($('colx-aU'),'aU');bindHover($('colx-bU'),'bU');
    bindHover($('colx-aT'),'aT');bindHover($('colx-bT'),'bT');
    bindHover($('colx-carry'),'carry');

    const onResize=()=>{positionPlus();drawLines();};
    window.addEventListener('resize',onResize);

    let _mountRaf=requestAnimationFrame(()=>{
      _mountRaf=0;
      if(!$('colx-pw'))return;   // mount torn down before first paint (rapid re-mount)
      positionPlus();drawLines();anchorNL();iU.focus();
    });

    return function cleanup(){
      window.removeEventListener('resize',onResize);
      if(_mountRaf)cancelAnimationFrame(_mountRaf);
      timers.forEach(clearTimeout);
      root.innerHTML='';
    };
  }

  // אַלּוּפָה (mulc): two-digit additions TAGGED `staged`, so the host passes the
  // flag through (ctx.p.staged) and mount() runs the graded horizontal-first flow.
  function makeMulc(){
    const out=makePool(3,2);              // 3 with a carry + 2 without = 5
    out.forEach(p=>{p.staged=true;});
    return out;
  }

  return{
    t:TCA,
    modes:['sup','mulc'],
    // Superman: try-first — the number line stays HIDDEN until the first mistake
    // (then it's revealed and scoring drops to partial via _tfPts). אַלּוּפָה
    // (mulc): 'always' means NO try-first lock — the staged flow controls the line
    // itself (api.showNL on the 2nd mistake), and loadProblem starts it hidden.
    aidsReveal:{sup:'afterMistake',mulc:'always'},
    // Superman weaves in an EQUAL share of each exercise type, so column
    // addition contributes just 3 (2 with a carry, 1 without). אַלּוּפָה: 5 staged.
    make(mode){return mode==='sup'?makePool(2,1):mode==='mulc'?makeMulc():[];},
    mount,
  };
})();
