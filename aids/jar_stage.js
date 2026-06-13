/* ── Jar Stage — the counting-jar DISPLAY engine, rebuilt from scratch ──────
   A self-contained, dynamically-loaded module (bg-loader.loadJarStage) that
   owns everything visual about the counting jar. The OLD flex-wrap cookie
   rendering in aids.js is gone — the logic engine only calls this handle.

   Built for OBJECT SWAPPING: all art comes from the active AIDS variant
   (containerSVG + itemSVG(i) + fx.poof), and the item box is AUTO-SIZED from
   the itemSVG viewBox — a new variant needs zero CSS. Skin-aware: colors pull
   from the --skin-* palette vars and every element carries a stable .jst-*
   class that any game/skins/<name>.skin.css may restyle.

   Contract:
     window.JAR_STAGE.mount({root, variant}) → handle
       handle.set(n)     — instant reconcile to n items (bulk init / undo)
       handle.add()      — one item drops in (squash-bounce + sparkles + glow)
       handle.remove()   — top item bursts away (variant poof colors)
       handle.variant(v) — swap the art live (theme change)
       handle.cleanup()
   The stage renders items on a depth grid: front row big and bright, back
   rows raised, smaller and dimmer; everything idles with a gentle bob and a
   shine sweeps the glass every few seconds. */
window.JAR_STAGE=window.JAR_STAGE||(()=>{

  const CSS=`
  .jst-root{position:relative;width:180px;min-height:120px}
  .jst-root .ck-jar-bg{width:180px;display:block;pointer-events:none}
  .jst-glow{position:absolute;inset:8px 4px 4px;border-radius:24px;pointer-events:none;
    background:radial-gradient(75% 60% at 50% 78%,var(--skin-glow,#7DC4FF) 0%,transparent 70%);
    opacity:0;transition:opacity .5s;mix-blend-mode:screen}
  .jst-glow.on{opacity:.38;transition:opacity .12s}
  .jst-shine{position:absolute;inset:0;border-radius:18px;overflow:hidden;pointer-events:none}
  .jst-shine::after{content:'';position:absolute;top:-20%;bottom:-20%;left:-45%;width:34%;
    background:linear-gradient(105deg,transparent,rgba(255,255,255,.16) 45%,
      rgba(255,255,255,.05) 55%,transparent);
    transform:skewX(-18deg);animation:jstSweep 7s ease-in-out infinite}
  @keyframes jstSweep{0%,72%{left:-45%}88%,100%{left:115%}}
  .jst-items{position:absolute;left:18px;right:18px;bottom:20px;top:0;pointer-events:none}
  .jst-item{position:absolute;will-change:transform;
    transition:left .3s cubic-bezier(.34,1.3,.64,1),bottom .3s cubic-bezier(.34,1.3,.64,1)}
  .jst-item svg{width:100%;height:100%;display:block}
  .jst-item .jst-bob{animation:jstBob calc(2.2s + var(--jd,0s)) ease-in-out infinite alternate;
    transform-origin:50% 100%}
  @keyframes jstBob{from{transform:translateY(0) rotate(calc(var(--ja,2deg) * -1))}
    to{transform:translateY(-2px) rotate(var(--ja,2deg))}}
  .jst-item.jst-drop .jst-bob{animation:none}
  .jst-item.jst-drop{animation:jstDrop .62s cubic-bezier(.3,1.25,.45,1) both}
  @keyframes jstDrop{
    0%  {transform:translateY(-170px) scale(.55) rotate(-24deg);opacity:0}
    45% {opacity:1}
    68% {transform:translateY(3px) scaleX(1.18) scaleY(.78) rotate(4deg)}
    84% {transform:translateY(-3px) scaleX(.94) scaleY(1.07) rotate(-2deg)}
    100%{transform:none;opacity:1}}
  .jst-item.jst-out{animation:jstOut .34s ease-in both}
  @keyframes jstOut{
    0%  {transform:none;opacity:1}
    100%{transform:translateY(-26px) scale(.35) rotate(18deg);opacity:0}}
  .jst-spark{position:fixed;z-index:999;pointer-events:none;border-radius:50%;
    animation:jstSpark .55s ease-out both}
  @keyframes jstSpark{
    0%  {transform:translate(0,0) scale(1);opacity:1}
    100%{transform:translate(var(--sx),var(--sy)) scale(.2);opacity:0}}
  .jst-crumb{position:fixed;z-index:999;pointer-events:none;border-radius:2px;
    animation:jstCrumb .5s cubic-bezier(.2,.7,.6,1) both}
  @keyframes jstCrumb{
    0%  {transform:translate(0,0) rotate(0) scale(1);opacity:1}
    100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(.4);opacity:0}}
  .jst-ring{position:fixed;z-index:999;pointer-events:none;border-radius:50%;
    border:3px solid var(--skin-accent,#FFD27D);
    animation:jstRing .4s ease-out both}
  @keyframes jstRing{
    0%  {transform:translate(-50%,-50%) scale(.2);opacity:.95}
    100%{transform:translate(-50%,-50%) scale(1.6);opacity:0}}`;

  function injectStyle(){
    if(document.getElementById('jst-style'))return;
    const st=document.createElement('style');
    st.id='jst-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  /* auto-size the item box from the variant's itemSVG viewBox —
     a new variant with any art proportions just works */
  function itemBox(variant){
    let w=52,h=20;
    try{
      const m=String(variant&&variant.itemSVG?variant.itemSVG(0):'')
        .match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
      if(m){w=parseFloat(m[1]);h=parseFloat(m[2]);}
    }catch(e){}
    let iw=44,ih=iw*h/w;
    if(ih>30){ih=30;iw=ih*w/h;}
    if(iw<26)iw=26;
    return{w:Math.round(iw),h:Math.round(Math.max(12,ih))};
  }

  function mount({root,variant}){
    injectStyle();
    let v=variant||{};
    let box=itemBox(v);
    let items=[];          // live .jst-item elements, index = stack order
    const timers=[];
    const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};

    root.classList.add('jst-root');
    root.style.overflow='visible';
    function renderShell(){
      root.innerHTML=`${(v&&v.containerSVG)||''}
        <div class="jst-glow" id="jst-glow"></div>
        <div class="jst-shine"></div>
        <div class="jst-items" id="jst-items"></div>`;
    }
    renderShell();
    let wrap=root.querySelector('.jst-items');
    let glow=root.querySelector('.jst-glow');

    /* depth grid: front row at the bottom, back rows raised + smaller + dimmer */
    function slot(i){
      const cavW=144;                       // root 180 − 18px glass walls
      const perRow=Math.max(3,Math.floor(cavW/(box.w+4)));
      const row=Math.floor(i/perRow),col=i%perRow;
      const inRow=Math.min(perRow,Math.max(1,items.length-row*perRow));
      const rowW=inRow*(box.w+4)-4;
      const x0=(cavW-rowW)/2+(row%2?3:-3);  // odd rows nudge for a packed look
      return{
        left:x0+col*(box.w+4),
        bottom:row*box.h*.82,            // taller row pitch so rows don't crowd
        scale:Math.max(.78,1-row*.055),
        dim:Math.max(.72,1-row*.07),
        z:60-row,
      };
    }
    function place(el,i,instant){
      const s=slot(i);
      if(instant){const t=el.style.transition;el.style.transition='none';
        requestAnimationFrame(()=>{el.style.transition=t;});}
      el.style.left=s.left+'px';
      el.style.bottom=s.bottom+'px';
      el.style.width=box.w+'px';
      el.style.height=box.h+'px';
      el.style.zIndex=s.z;
      el.style.filter=`brightness(${s.dim})`;
      const bob=el.firstElementChild;
      if(bob)bob.style.transform='';
      el.style.transform=`scale(${s.scale})`;
    }
    function makeItem(i,drop){
      const el=document.createElement('div');
      el.className='jst-item'+(drop?' jst-drop':'');
      el.innerHTML=`<div class="jst-bob">${v.itemSVG?v.itemSVG(i%5):''}</div>`;
      el.style.setProperty('--jd',(Math.random()*1.4).toFixed(2)+'s');
      el.style.setProperty('--ja',(1+Math.random()*2.5).toFixed(1)+'deg');
      if(drop)el.addEventListener('animationend',()=>el.classList.remove('jst-drop'),{once:true});
      return el;
    }
    function relayout(){items.forEach((el,i)=>place(el,i,false));}

    /* landing FX: glow pulse + ring + sparkles in the skin's accent color */
    function flash(){
      if(!glow)return;
      glow.classList.add('on');
      later(()=>glow&&glow.classList.remove('on'),160);
    }
    function sparkle(el){
      const r=el.getBoundingClientRect();
      const cx=r.left+r.width/2,cy=r.top+r.height/2;
      const ring=document.createElement('div');
      ring.className='jst-ring';
      ring.style.cssText+=`left:${cx}px;top:${cy}px;width:${box.w*1.4}px;height:${box.w*1.4}px`;
      document.body.appendChild(ring);later(()=>ring.remove(),420);
      const acc=getComputedStyle(document.documentElement).getPropertyValue('--skin-accent').trim()||'#FFD27D';
      for(let i=0;i<6;i++){
        const a=Math.PI*2*i/6+Math.random()*.5,d=18+Math.random()*16;
        const sp=document.createElement('div');
        sp.className='jst-spark';
        sp.style.cssText=`left:${cx}px;top:${cy}px;width:5px;height:5px;background:${acc};
          box-shadow:0 0 8px ${acc};--sx:${Math.cos(a)*d}px;--sy:${Math.sin(a)*d-8}px`;
        sp.style.animationDelay=(i*16)+'ms';
        document.body.appendChild(sp);later(()=>sp.remove(),620);
      }
    }
    function burst(el){
      const r=el.getBoundingClientRect();
      const cx=r.left+r.width/2,cy=r.top+r.height/2;
      const colors=(v.fx&&v.fx.poof)||['#D2691E','#F5DEB3','#C8860A','#8B4513','#FFD700','#A0522D','#DEB887','#4A2000'];
      for(let i=0;i<8;i++){
        const a=Math.PI*2*i/8+Math.random()*.4,d=26+Math.random()*22;
        const c=document.createElement('div');
        c.className='jst-crumb';
        c.style.cssText=`left:${cx-4}px;top:${cy-3}px;width:8px;height:6px;background:${colors[i%colors.length]};
          --dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d}px;--rot:${(Math.random()*360)|0}deg`;
        c.style.animationDelay=(i*10)+'ms';
        document.body.appendChild(c);later(()=>c.remove(),560);
      }
    }

    const handle={
      set(n){
        n=Math.max(0,n|0);
        while(items.length>n){const el=items.pop();el.remove();}
        while(items.length<n){
          const el=makeItem(items.length,false);
          wrap.appendChild(el);items.push(el);
        }
        items.forEach((el,i)=>place(el,i,true));
      },
      add(){
        const el=makeItem(items.length,true);
        wrap.appendChild(el);items.push(el);
        place(el,items.length-1,true);
        relayout();
        later(()=>{flash();sparkle(el);},380);
      },
      remove(){
        const el=items.pop();
        if(!el)return;
        burst(el);
        el.classList.add('jst-out');
        later(()=>el.remove(),360);
        relayout();
      },
      variant(nv){
        v=nv||{};box=itemBox(v);
        const n=items.length;items=[];
        renderShell();
        wrap=root.querySelector('.jst-items');
        glow=root.querySelector('.jst-glow');
        handle.set(n);
      },
      cleanup(){
        timers.forEach(clearTimeout);
        items=[];root.innerHTML='';
        root.classList.remove('jst-root');
      },
    };
    return handle;
  }

  return{mount};
})();
