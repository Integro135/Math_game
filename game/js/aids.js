/* ── Number-line rider (NL) — variant-driven art & FX ───────────────────────
   The rider, jump-trail, landing dust, spark palette and firework cadence
   all come from the active AIDS variant via numberLine.fx (optional —
   sensible classic defaults apply):
     numberLine.fx = {
       colors: [..],        // firework / trail spark palette
       dust:   [..],        // landing-puff crumb colors
       trail:  '✨',        // string flown behind the rider ('' = none)
       fireworksEvery: 3,   // a mini-firework every N jumps
     }
   Jumps FLY along the real arc (rAF parabola) with anticipation, mid-air
   stretch, tangent rotation and a landing squash; the landed-on number
   pops, dust kicks up, and every few jumps a firework bursts overhead. */
const NL=(()=>{
  let MAX=20,STEP=1,initVal=0,BASE=0;   // BASE = the line's left-edge value (origin)
  let cv=0,arcs=[],history=[],isDragging=false,dragStartCv=0;
  let numEls={},jumpCount=0,flyId=null;

  function fxCfg(){
    const v=typeof aidCfg==='function'?aidCfg():{};
    const fx=(v.numberLine&&v.numberLine.fx)||{};
    return{
      colors:fx.colors||['#FFD700','#FF8C42','#FF5FA8','#7DC4FF'],
      dust:fx.dust||['#C8A050','#A07840','#E8C878'],
      trail:fx.trail!==undefined?fx.trail:'✨',
      fireworksEvery:fx.fireworksEvery||3,
    };
  }
  // configure(max, step, base?) — base lets the line start somewhere other
  // than 0 (e.g. a window 65..85 centered on 75); defaults to 0.
  function configure(max,step,base){MAX=max;STEP=step||1;BASE=base||0;}
  const _span=()=>(MAX-BASE)||1;
  const _pct=val=>((val-BASE)/_span())*100;       // value → % across the bar
  function buildNL(){
    const bar=document.getElementById('nl-bar');if(!bar)return;
    bar.querySelectorAll('.tick,.nl-num').forEach(el=>el.remove());
    numEls={};
    for(let i=BASE;i<=MAX;i+=STEP){
      const pct=_pct(i),isMaj=(i%(STEP*5)===0);
      const tick=document.createElement('div');tick.className='tick'+(isMaj?' major':'');tick.style.left=pct+'%';bar.appendChild(tick);
      const num=document.createElement('span');num.className='nl-num'+(isMaj?' major':'');num.textContent=i;num.style.left=pct+'%';bar.appendChild(num);
      numEls[i]=num;
    }
  }
  function updateDot(moveDot=true){
    const dot=document.getElementById('nl-dot');if(!dot)return;
    if(moveDot)dot.style.left=_pct(cv)+'%';
    const bm=document.getElementById('nl-btn-minus'),bp=document.getElementById('nl-btn-plus');
    if(bm)bm.disabled=(cv<=BASE);if(bp)bp.disabled=(cv>=MAX);
  }
  function drawArcs(){
    const svg=document.getElementById('nl-arcs-svg');if(!svg)return;
    svg.innerHTML='';
    const BAR_Y=88,heights={};
    arcs.forEach((arc,idx)=>{
      const lo=Math.min(arc.from,arc.to),hi=Math.max(arc.from,arc.to),key=lo+'-'+hi;
      heights[key]=(heights[key]||0)+1;
      const level=heights[key];
      const x1=_pct(arc.from)*6,x2=_pct(arc.to)*6,cx=(x1+x2)/2,h=20+level*13,cy=BAR_Y-h;
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M${x1},${BAR_Y} Q${cx},${cy} ${x2},${BAR_Y}`);
      const last=idx===arcs.length-1;
      path.setAttribute('class',(arc.type==='add'?'arc-add':'arc-sub')+(last?' arc-anim':''));
      if(last)path.setAttribute('pathLength','1');   // draw-on stroke animation
      svg.appendChild(path);
    });
  }
  /* ── FX particles (DOM + CSS animations, same approach as the jar poof) ── */
  function spawnPiece(x,y,html,cls,vars,life){
    const d=document.createElement('div');
    d.className=cls;if(html)d.textContent=html;
    d.style.left=x+'px';d.style.top=y+'px';
    for(const k in vars)d.style.setProperty(k,vars[k]);
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),life);
  }
  function dustPuff(x,y){
    const{dust}=fxCfg();
    for(let i=0;i<6;i++)
      spawnPiece(x,y,'','nl-dust',{
        '--dx':((Math.random()-.5)*48)+'px',
        '--dy':(-(4+Math.random()*16))+'px',
        background:dust[i%dust.length],
      },470);
  }
  function firework(x,y){
    const{colors}=fxCfg();
    spawnPiece(x,y,'','nl-fw-flash',{},330);
    for(let i=0;i<12;i++){
      const ang=(i/12)*Math.PI*2+Math.random()*.3;
      const dist=34+Math.random()*30;
      spawnPiece(x,y,'','nl-fw-spark',{
        '--dx':(Math.cos(ang)*dist)+'px',
        '--dy':(Math.sin(ang)*dist-10)+'px',
        background:colors[i%colors.length],
        animationDelay:((i%4)*14)+'ms',
      },760);
    }
  }
  function trailBit(x,y){
    const{trail,colors}=fxCfg();
    if(!trail)return;
    spawnPiece(x,y,trail,'nl-trail',{color:colors[(Math.random()*colors.length)|0]},440);
  }
  function cancelFlight(){
    if(flyId){cancelAnimationFrame(flyId);flyId=null;}
    const dot=document.getElementById('nl-dot');
    if(dot){
      dot.classList.remove('flying');
      dot.style.transition='';
      const k=dot.querySelector('.kang');if(k)k.style.transform='';
    }
  }
  /* the rider flies from→to along a parabola, then lands with a squash */
  function animateJump(from,to,dir){
    const dot=document.getElementById('nl-dot');if(!dot)return;
    const kang=dot.querySelector('.kang');
    if(dir>0)dot.classList.remove('face-left');else dot.classList.add('face-left');
    cancelFlight();
    dot.classList.add('flying');
    const bar=document.getElementById('nl-bar');
    const rect=bar?bar.getBoundingClientRect():null;
    const dist=Math.abs(to-from)/STEP;
    const dur=Math.min(760,340+dist*60);
    const hop=Math.min(48,26+dist*7);
    dot.style.transition='none';
    const t0=performance.now();let lastTrail=0;
    function fr(now){
      const p=Math.min(1,(now-t0)/dur);
      const left=from+(to-from)*p;
      dot.style.left=_pct(left)+'%';
      const arcY=Math.sin(p*Math.PI)*hop;
      const rot=-dir*Math.cos(p*Math.PI)*16;          // nose follows the arc
      const st=1+.14*Math.sin(p*Math.PI);             // mid-air stretch
      if(kang)kang.style.transform=`translateY(${-arcY}px) rotate(${rot}deg) scale(${2-st},${st})`;
      if(rect&&now-lastTrail>40&&p>.08&&p<.92){
        lastTrail=now;
        trailBit(rect.left+rect.width*(_pct(left)/100)-6,rect.top-14-arcY);
      }
      if(p<1){flyId=requestAnimationFrame(fr);return;}
      flyId=null;
      dot.classList.remove('flying');
      dot.style.transition='';
      if(kang){
        kang.style.transform='';
        kang.classList.remove('nl-land');void kang.offsetWidth;kang.classList.add('nl-land');
        kang.addEventListener('animationend',()=>kang.classList.remove('nl-land'),{once:true});
      }
      const r2=dot.getBoundingClientRect();
      const lx=r2.left+r2.width/2,ly=r2.top+r2.height;
      dustPuff(lx,ly);
      const numEl=numEls[to];                         // the landed-on number pops
      if(numEl){numEl.classList.remove('nl-num-pop');void numEl.offsetWidth;numEl.classList.add('nl-num-pop');}
      jumpCount++;
      if(jumpCount%fxCfg().fireworksEvery===0)firework(lx,r2.top-26);
    }
    flyId=requestAnimationFrame(fr);
  }
  function step(dir){
    const nv=cv+dir*STEP;if(nv<BASE||nv>MAX)return;
    history.push({cv,arcs:JSON.parse(JSON.stringify(arcs))});
    arcs.push({from:cv,to:nv,type:dir>0?'add':'sub'});
    const from=cv;cv=nv;
    updateDot(false);drawArcs();animateJump(from,nv,dir);
  }
  function reset(){
    cancelFlight();
    history=[];arcs=[];cv=initVal;updateDot();drawArcs();
  }
  function undo(){
    if(!history.length)return;
    cancelFlight();
    const prev=history.pop();cv=prev.cv;arcs=prev.arcs;updateDot();drawArcs();
  }
  function getBarNum(clientX){
    const rect=document.getElementById('nl-bar')?.getBoundingClientRect();if(!rect)return cv;
    const frac=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));
    return BASE+Math.round(frac*_span()/STEP)*STEP;
  }
  function startDrag(clientX){if(!isVisible())return;cancelFlight();isDragging=true;dragStartCv=cv;cv=getBarNum(clientX);updateDot();}
  function duringDrag(clientX){if(!isDragging)return;cv=getBarNum(clientX);updateDot();}
  function endDrag(){
    if(!isDragging)return;isDragging=false;
    if(cv!==dragStartCv){
      const dir=cv>dragStartCv?1:-1;
      history.push({cv:dragStartCv,arcs:JSON.parse(JSON.stringify(arcs))});
      arcs.push({from:dragStartCv,to:cv,type:dir>0?'add':'sub'});
      drawArcs();animateJump(dragStartCv,cv,dir);   // replay the whole leap
    }
  }
  function isVisible(){const p=document.getElementById('nl-panel');return p&&p.style.display!=='none';}
  function init(startVal){
    cancelFlight();
    const raw=typeof startVal==='number'?startVal:BASE;
    cv=BASE+Math.round((Math.max(BASE,Math.min(MAX,raw))-BASE)/STEP)*STEP;
    initVal=cv;
    arcs=[];history=[];isDragging=false;dragStartCv=0;jumpCount=0;
    buildNL();updateDot();drawArcs();
  }
  function attachBarEvents(){
    const bar=document.getElementById('nl-bar');if(!bar)return;
    bar.addEventListener('mousedown',e=>{e.preventDefault();startDrag(e.clientX);});
    bar.addEventListener('touchstart',e=>{e.preventDefault();startDrag(e.touches[0].clientX);},{passive:false});
  }
  function attachDocumentEvents(){
    document.addEventListener('mousemove',e=>duringDrag(e.clientX));
    document.addEventListener('mouseup',endDrag);
    document.addEventListener('touchmove',e=>{if(isDragging){e.preventDefault();duringDrag(e.touches[0].clientX);}},{passive:false});
    document.addEventListener('touchend',endDrag);
    document.addEventListener('keydown',e=>{
      // arrows drive the rider whenever the line is VISIBLE — the ±buttons are
      // not gated on tryFirst either, and an always-on line (e.g. the column
      // exercise) is interactive from the start. When the line is hidden
      // (normal types before the first mistake) isVisible() already blocks.
      if(!isVisible())return;
      // ignore arrows only while typing in a FREE-TEXT field (e.g. the name
      // input); the answer boxes (.ans-inp, incl. the column boxes which are
      // type="text") should pass arrows through to the number line.
      const ae=document.activeElement;
      if(ae&&ae.tagName==='INPUT'&&ae.type!=='number'&&!ae.classList.contains('ans-inp'))return;
      if(e.key==='ArrowRight'){e.preventDefault();step(1);}
      else if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}
    });
  }
  return{configure,init,step,reset,undo,attachBarEvents,attachDocumentEvents};
})();

/* The games dropdown now offers only the two aids: kangaroo NL ↔ cookie jar
   (plus the chain-garden upgrade when the jar is active on a chain problem). */
/* ── aid-toggle icons — IDENTICAL on every background (by design):
   a small number line and a small object box, drawn in currentColor ── */
const AID_ICON_NL=
  `<svg class="aid-ico" viewBox="0 0 34 20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">`+
  `<line x1="2" y1="14" x2="32" y2="14"/>`+
  `<line x1="6" y1="10" x2="6" y2="18"/>`+
  `<line x1="13" y1="11.5" x2="13" y2="16.5"/>`+
  `<line x1="20" y1="11.5" x2="20" y2="16.5"/>`+
  `<line x1="27" y1="10" x2="27" y2="18"/>`+
  `<circle cx="13" cy="5.5" r="2.8" fill="currentColor" stroke="none"/></svg>`;
const AID_ICON_BOX=
  `<svg class="aid-ico" viewBox="0 0 30 27" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">`+
  `<rect x="4.5" y="10" width="21" height="14" rx="3"/>`+
  `<line x1="2" y1="10" x2="28" y2="10"/>`+
  `<circle cx="10" cy="5" r="2.2" fill="currentColor" stroke="none"/>`+
  `<circle cx="15.5" cy="3.4" r="2.2" fill="currentColor" stroke="none"/>`+
  `<circle cx="21" cy="5" r="2.2" fill="currentColor" stroke="none"/></svg>`;
function buildGamesMenu(){
  const menu=document.getElementById('games-menu');
  const btn=document.getElementById('games-drop-btn');
  if(!menu||!btn)return;
  menu.innerHTML='';
  const extras=[];
  const v=aidCfg();
  const nlIcon=AID_ICON_NL;
  const jarIcon=AID_ICON_BOX;
  const gardenIcon=(v.jar&&v.jar.gardenIcon)||'🌻';
  // the NL ↔ jar toggle applies to every "plain numbers" problem type in
  // EVERY mode (the operands fit the 0-20 jar); TC/TT/TCA/TBG bring their
  // own aid and are excluded
  const aidsApply=ptype===TZ||ptype===TX||ptype===TW||ptype===TDA||ptype===TDS||
    ptype===TA||ptype===TS||ptype===TM;
  if(aidsApply){
    [{m:'kang',icon:nlIcon},{m:'nl',icon:jarIcon}].forEach(({m,icon})=>{
      extras.push({icon,cost:null,disabled:m===aidMode,fn:()=>toggleAidMode(m)});
    });
    if((ptype===TZ||ptype===TX||ptype===TW)&&aidMode==='nl'){
      const gnCost=chainGnMode?null:20;
      extras.push({icon:chainGnMode?jarIcon:gardenIcon,cost:gnCost,disabled:!chainGnMode&&score<20,fn:openChainGarden});
    }
  }
  extras.forEach(x=>{
    const el=document.createElement('button');
    el.className='gm-item';el.disabled=x.disabled;
    el.innerHTML=`<span class="gm-icon-wrap">${x.icon}</span>${x.cost!=null?`<span class="gm-cost">${x.cost} ⭐</span>`:''}`;
    el.onclick=()=>{document.getElementById('games-menu').classList.remove('open');x.fn();};
    menu.appendChild(el);
  });
  btn.classList.toggle('gm-active',extras.length>0);
  if(extras.length){
    btn.innerHTML=aidMode==='kang'?nlIcon:(chainGnMode&&(ptype===TZ||ptype===TX)?gardenIcon:jarIcon);
  }
}
function openGamesMenu(e){
  e.stopPropagation();
  const menu=document.getElementById('games-menu');
  const btn=document.getElementById('games-drop-btn');
  if(!menu||!btn)return;
  const r=btn.getBoundingClientRect();
  menu.style.top=(r.bottom+8)+'px';
  menu.style.left=r.left+'px';
  menu.classList.toggle('open');
}

document.addEventListener('click',function(){
  document.getElementById('theme-menu')?.classList.remove('open');
  document.getElementById('games-menu')?.classList.remove('open');
});
document.getElementById('theme-menu')?.addEventListener('click',e=>e.stopPropagation());
document.getElementById('games-menu')?.addEventListener('click',e=>e.stopPropagation());


/* ── Counting-jar + number-line ENGINE ──────────────────────────────────────
   The engine is generic: all the ART (the number-line rider, the jar
   container, the counted items, the garden upgrade items, icons and hint
   texts) comes from the active aid VARIANT — a dynamically-loaded file in
   aids/<name>.aids.js, chosen by the active background (see bg-loader.js). */
const PGM_NL=25;   // chain running-total line spans 0-25 (chain results reach up to 25)
function aidCfg(){return (window.AIDS&&(AIDS.current||AIDS.variants.classic))||{};}
/* hint line for the active variant; falls back to the classic kangaroo/cookies */
function aidHint(kind,dir){
  const v=aidCfg();
  const t=kind==='nl'?(v.numberLine||{}):(v.jar||{});
  const txt=dir==='add'?t.hintAdd:t.hintSub;
  if(txt)return txt;
  return kind==='nl'
    ?(dir==='add'?'🦘 קְפַץ קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!':'🦘 קְפַץ אָחוֹר עַל הַיְּשַׁר כְּעֶזֶר!')
    :(dir==='add'?'🍪 הוֹסֵף עוּגִיּוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!'
                 :'🍪 הָסֵר עוּגִיּוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!');
}
function pgmCkSVG(idx){
  const f=aidCfg().jar&&aidCfg().jar.itemSVG;
  return f?f(idx):'';
}
function gnFlowerSVG(ci){
  const f=aidCfg().jar&&aidCfg().jar.gardenSVG;
  return f?f(ci):'';
}
/* ── the jar DISPLAY lives in its own dynamically-loaded module
   (aids/jar_stage.js) — the logic here only drives this handle ── */
let _jarH=null;
function _jarMount(){
  const root=document.getElementById('pgm-ck-jar');
  if(!root)return;
  const v=aidCfg().jar||{};
  loadJarStage(()=>{
    const cur=document.getElementById('pgm-ck-jar');
    if(!cur)return;
    if(_jarH){_jarH.cleanup();_jarH=null;}
    _jarH=JAR_STAGE.mount({root:cur,variant:v});
    _jarH.set(pgmCk.length);
  });
}
/* (re)apply the active variant's art to the mounted aid panels */
function applyAidsVariant(){
  const v=aidCfg();
  const dot=document.getElementById('nl-dot');
  if(dot)dot.innerHTML=`<span class="kang-dir"><span class="kang">${(v.numberLine&&v.numberLine.rider)||'🦘'}</span></span>`;
  _jarMount();
  if(typeof buildGamesMenu==='function')buildGamesMenu();
}
let pgmCV=0,pgmCk=[],pgmArcs=[],pgmTensMode=false,chainGnMode=false,tdaJarMode=false;
function pgmInitChain(){
  if(pgmTensMode){pgmCV=num1;pgmCk=[];pgmArcs=[];pgmBuildNL();pgmDrawArcs();pgmUpdateAll();return;}
  const _jar0=ptype===TC||ptype===TDA;pgmCV=_jar0?0:num1;pgmCk=Array.from({length:pgmCV},(_,i)=>i%5);pgmArcs=[];pgmBuildNL();pgmRenderJar();pgmDrawArcs();pgmUpdateAll();
}
function pgmRenderJar(){
  if(chainGnMode)return;
  if(_jarH)_jarH.set(pgmCk.length);
  else _jarMount();   // first use — loads the display module, then syncs
}
function pgmRenderGarden(){
  const wrap=document.getElementById('pgm-gn-flowers');
  const cnt=document.getElementById('pgm-gn-count');
  if(!wrap)return;
  wrap.innerHTML='';
  const n=Math.max(0,Math.min(pgmCV,PGM_NL));
  for(let i=0;i<n;i++){
    const d=document.createElement('div');d.className='pgm-gn-flower';
    d.innerHTML=gnFlowerSVG(i%5);wrap.appendChild(d);
  }
  if(cnt)cnt.textContent=pgmCV;
}
function openChainGarden(){
  const jar=document.getElementById('pgm-ck-jar');
  const disp=document.getElementById('pgm-gn-display');
  if(chainGnMode){
    chainGnMode=false;
    if(jar)jar.style.display='';
    if(disp)disp.style.display='none';
    pgmRenderJar();pgmUpdateAll();
  }else{
    const COST=20;
    if(score<COST)return;
    addScore(-COST);markAidUsed();chainGnMode=true;
    if(jar)jar.style.display='none';
    if(disp)disp.style.display='flex';
    pgmRenderGarden();
  }
  buildGamesMenu();
}
function pgmBuildNL(){
  const el=document.getElementById('pgm-nums');if(!el)return;
  el.innerHTML='';
  if(pgmTensMode){
    for(let i=0;i<=100;i+=10){const sp=document.createElement('span');
      sp.className='pgm-nl-num'+(i%50===0?' pgm-nl-num5':'');
      sp.style.left=(i/100*100)+'%';sp.textContent=i;el.appendChild(sp);}
    return;
  }
  for(let i=0;i<=PGM_NL;i++){
    const sp=document.createElement('span');
    sp.className='pgm-nl-num'+(i%5===0?' pgm-nl-num5':'');
    sp.style.left=(i/PGM_NL*100)+'%';sp.textContent=i;el.appendChild(sp);
  }
}
function pgmUpdateNL(){
  const max=pgmTensMode?100:PGM_NL;
  const pct=Math.max(0,Math.min(100,(pgmCV/max)*100));
  const dot=document.getElementById('pgm-dot');if(dot)dot.style.left=pct+'%';
}
function pgmDrawArcs(animLast=false){
  const svg=document.getElementById('pgm-arcs-svg');if(!svg)return;
  svg.innerHTML='';
  const _arcMax=pgmTensMode?100:PGM_NL;
  pgmArcs.forEach(({a,b,type},i)=>{
    const x1=a/_arcMax*100,x2=b/_arcMax*100,mx=(x1+x2)/2;
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',`M ${x1} 16 Q ${mx} 4 ${x2} 16`);
    p.setAttribute('class','pgm-arc pgm-arc-'+type);
    if(!(animLast&&i===pgmArcs.length-1)){p.style.animation='none';p.style.opacity='1';}
    svg.appendChild(p);
  });
}
function pgmUpdateAll(){
  const v=document.getElementById('pgm-val');if(v)v.textContent=pgmCV;
  pgmUpdateNL();
  const _max=pgmTensMode?100:PGM_NL;
  const bm=document.getElementById('pgm-btn-minus'),bp=document.getElementById('pgm-btn-plus');
  if(bm)bm.disabled=done||pgmCV<=0;if(bp)bp.disabled=done||pgmCV>=_max;
  if(chainGnMode)pgmRenderGarden();
}
function pgmPlus(){
  const _max=pgmTensMode?100:PGM_NL,_step=pgmTensMode?10:1;
  if(done||pgmCV>=_max)return;
  const prev=pgmCV;pgmCV+=_step;
  const last=pgmArcs[pgmArcs.length-1];
  if(last&&last.a===prev&&last.b===pgmCV&&last.type==='sub')pgmArcs.pop();
  else pgmArcs.push({a:prev,b:pgmCV,type:'add'});
  pgmUpdateAll();pgmDrawArcs(true);
  if(!pgmTensMode){pgmCk.push(pgmCk.length%5);
    if(_jarH)_jarH.add();else pgmRenderJar();}
}
function pgmMinus(){
  const _step=pgmTensMode?10:1;
  if(done||pgmCV<=0)return;
  const nv=pgmCV;pgmCV-=_step;
  const last=pgmArcs[pgmArcs.length-1];
  if(last&&last.a===pgmCV&&last.b===nv&&last.type==='add')pgmArcs.pop();
  else pgmArcs.push({a:pgmCV,b:nv,type:'sub'});
  pgmUpdateAll();pgmDrawArcs(true);
  if(!pgmTensMode){pgmCk.pop();
    if(_jarH)_jarH.remove();else pgmRenderJar();}
}
function pgmUndo(){
  if(pgmArcs.length===0)return;
  const _step=pgmTensMode?10:1;
  const last=pgmArcs.pop();
  if(last.type==='add'){pgmCV-=_step;if(!pgmTensMode)pgmCk.pop();}
  else{pgmCV+=_step;if(!pgmTensMode)pgmCk.push(pgmCk.length%5);}
  if(!pgmTensMode)pgmRenderJar();
  pgmUpdateAll();pgmDrawArcs(false);
}

/* ── Aid-mode toggle (kang ↔ nl, or jump to targetMode) ── */
function toggleAidMode(targetMode){
  if(ptype===TC||ptype===TT)return;
  if(typeof targetMode==='string'){if(targetMode===aidMode)return;aidMode=targetMode;}
  else aidMode=aidMode==='nl'?'kang':'nl';
  const isTD=ptype===TDA||ptype===TDS;
  const ct=document.getElementById('chain-tools');
  const nlp=document.getElementById('nl-panel');
  if(aidMode==='nl'){
    const _cv=isTD?(ptype===TDA?0:num1):num1;
    if(ct)ct.style.display='block';
    if(nlp)nlp.style.display='none';
    pgmCV=_cv;pgmCk=Array.from({length:_cv},(_,i)=>i%5);pgmArcs=[];
    pgmBuildNL();pgmRenderJar();pgmDrawArcs();pgmUpdateAll();
  }else{
    if(ct)ct.style.display='none';
    if(nlp){nlp.style.display='';NL.init(0);}
  }
  buildGamesMenu();
  {const hEl=document.getElementById('hint');if(!hEl)return;
  if(ptype===TA)hEl.textContent=aidMode==='kang'?aidHint('nl','add'):aidHint('jar','add');
  else if(ptype===TS||ptype===TM)hEl.textContent=aidMode==='kang'?aidHint('nl','sub'):aidHint('jar','sub');}
}

