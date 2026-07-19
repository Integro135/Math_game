/* ── Polygon-PERIMETER exercise (הֶקֵּף מְצוּלָע 📐) ──────────────────────────────
   A SIMPLE shape is drawn — a SQUARE, a RECTANGLE or a TRIANGLE — with an
   integer side-length (1..4) printed NEXT TO EACH SIDE, and the child computes
   the PERIMETER (the sum of all the side lengths) and types it.

   • EVERY shape is drawn TO SCALE so the picture matches its labels: the square
     is equal-sided (all four labels the same → teaches 4×s), the rectangle's
     pixel ratio matches w:h, and the triangle's three edges are built FROM its
     side lengths (sides chosen to satisfy the triangle inequality) — so an
     equilateral (3,3,3) looks equilateral and a scalene (2,4,3) looks scalene;
     the drawn side lengths never contradict the numbers printed on them.
   • Tapping a side LIGHTS it gold + a little star-burst (helps the child keep
     track of which lengths she has already added) — pure aid, no effect on the
     answer. Labels are always visible.
   • A correct answer names the shape + the sum (זֶה מְרֻבָּע! הֶקֵּף 12).

   Self-contained interactive type, mounted by core.js _colxMount into #colx-root
   (same host path as polygon/column modules); self-checks via
   api.solved()/api.wrong(). Mixed into the אַלּוּפָה (mulc) set; the 'perim'
   handle is for the manual tester / direct setMode.
   Problem shape: { t:TPP, shape:'square'|'rect'|'tri', sides:[…], a:perimeter }.
   The module reads the full problem object via ctx.p (a/b alone can't carry the
   side list). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.perimeter=(()=>{

  const NAMES={square:'מְרֻבָּע',rect:'מַלְבֵּן',tri:'מְשֻׁלָּשׁ'};
  const SPARK=['#7DC4FF','#C77DFF','#FFD27D','#FFFFFF','#8CE99A'];
  const ri=(lo,hi)=>lo+(Math.random()*(hi-lo+1)|0);

  // one problem of a given kind; side lengths are 1..4 ("קטן מ5")
  function makeOne(kind){
    if(kind==='square'){const s=ri(1,4);return{t:TPP,shape:'square',sides:[s,s,s,s],a:4*s};}
    if(kind==='rect'){let w,h;do{w=ri(1,4);h=ri(1,4);}while(w===h);
      return{t:TPP,shape:'rect',w,h,sides:[w,h,w,h],a:2*(w+h)};}
    // triangle — three sides obeying the triangle inequality (plausible shape)
    let a,b,c;do{a=ri(1,4);b=ri(1,4);c=ri(1,4);}while(!(a+b>c&&a+c>b&&b+c>a));
    return{t:TPP,shape:'tri',sides:[a,b,c],a:a+b+c};
  }
  // a varied pool — cycle square → rect → triangle so all three recur
  function makePool(n){
    n=n||6;const kinds=['square','rect','tri'],out=[];
    for(let i=0;i<n;i++)out.push(makeOne(kinds[i%3]));
    for(let i=out.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }

  const CSS=`
  .pm-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
  .pm-q{font-family:'Fredoka One',cursive;font-size:1.3rem;color:var(--skin-text,#fff);
    text-align:center;line-height:1.4;text-shadow:0 0 12px rgba(160,190,255,.35);min-height:1.5em}
  .pm-q b{color:var(--skin-accent,#ffd27d)}
  /* the answer input sits to the LEFT of the shape (not below it) — side-by-side
     saves the wasted vertical band under the tall shape that used to force a page
     scrollbar. direction:ltr → the answer (first child) lands on the physical left. */
  .pm-main{display:flex;flex-direction:row;align-items:center;justify-content:center;
    gap:14px;width:100%;direction:ltr}
  .pm-stage{position:relative;width:min(250px,54vw);height:min(250px,54vw);flex:0 0 auto;
    display:flex;align-items:center;justify-content:center;animation:pmBob 3.4s ease-in-out infinite}
  @keyframes pmBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  .pm-svg{width:100%;height:100%;overflow:visible;animation:pmPop .5s cubic-bezier(.2,1.4,.4,1) both}
  @keyframes pmPop{from{transform:scale(.45) rotate(-8deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
  .pm-body{fill:var(--skin-primary,#7DC4FF);fill-opacity:.30;
    stroke:rgba(255,255,255,.55);stroke-width:3;filter:drop-shadow(0 6px 14px rgba(0,0,0,.30))}
  .pm-edge{stroke:rgba(255,255,255,.95);stroke-width:7;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
  .pm-hi{stroke:var(--skin-accent,#ffd27d);stroke-width:12;stroke-linecap:round;opacity:0;
    filter:drop-shadow(0 0 7px var(--skin-accent,#ffd27d));transition:opacity .2s;pointer-events:none}
  .pm-hi.on{opacity:1}
  .pm-hit{stroke:#000;stroke-opacity:0;stroke-width:34;stroke-linecap:round;pointer-events:stroke;cursor:pointer}
  .pm-lbl{font-family:'Fredoka One',cursive;font-size:34px;fill:var(--skin-accent,#ffd27d);
    paint-order:stroke;stroke:rgba(20,20,40,.85);stroke-width:5px;stroke-linejoin:round;
    text-anchor:middle;dominant-baseline:middle;pointer-events:none}
  .pm-fx{position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:4}
  .pmfx-ring{position:absolute;width:40px;height:40px;border-radius:50%;
    border:3px solid rgba(255,255,255,.9);box-shadow:0 0 16px rgba(160,200,255,.85)}
  .pmfx-star{position:absolute;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
    background:var(--c,#fff);filter:drop-shadow(0 0 5px var(--c,#fff))}
  /* stacked (input over ✓) so the answer column stays NARROW beside the shape */
  .pm-ans-row{display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;flex:0 0 auto;direction:ltr}
  .pm-btn{font-family:'Fredoka One',cursive;font-size:1.15rem;border:0;border-radius:14px;padding:11px 22px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .pm-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .pm-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  #colx-root .ans-inp.pm-inp{width:82px;height:60px;font-size:2.1rem;border-radius:14px;text-align:center}
  #colx-root .pm-inp.pm-ready{animation:pmReady 1s ease-in-out infinite alternate}
  @keyframes pmReady{from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 22px var(--skin-accent,#ffd27d)}}
  `;
  function injectStyle(){
    if(document.getElementById('pm-style'))return;
    const st=document.createElement('style');st.id='pm-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function starBurst(fx,x,y){
    const ring=document.createElement('div');ring.className='pmfx-ring';
    ring.style.left=x+'px';ring.style.top=y+'px';ring.style.transform='translate(-50%,-50%)';fx.appendChild(ring);
    ring.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:.95},{transform:'translate(-50%,-50%) scale(2.6)',opacity:0}],
      {duration:500,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>ring.remove();
    for(let i=0;i<9;i++){
      const p=document.createElement('div');p.className='pmfx-star';p.style.setProperty('--c',SPARK[i%SPARK.length]);
      const sz=8+Math.random()*9;p.style.width=sz+'px';p.style.height=sz+'px';p.style.left=x+'px';p.style.top=y+'px';fx.appendChild(p);
      const ang=(i/9)*Math.PI*2+Math.random()*.5,dist=28+Math.random()*36,dx=Math.cos(ang)*dist,dy=Math.sin(ang)*dist,rot=(Math.random()*360)|0;
      p.animate([{transform:'translate(-50%,-50%) scale(.3) rotate(0)',opacity:1},
        {transform:`translate(-50%,-50%) translate(${dx}px,${dy}px) scale(1) rotate(${rot}deg)`,opacity:1,offset:.7},
        {transform:`translate(-50%,-50%) translate(${dx*1.25}px,${dy*1.25+10}px) scale(.2) rotate(${rot}deg)`,opacity:0}],
        {duration:540+Math.random()*200,easing:'cubic-bezier(.15,.7,.3,1)'}).onfinish=()=>p.remove();
    }
  }

  // Triangle vertices [apex, V1, V2] drawn so the DRAWN edge lengths are
  // proportional to the side LABELS — |apex-V1|:|V1-V2|:|V2-apex| = sides[0]:[1]:[2]
  // (the same order the label loop below assigns) — then fitted + centred in the
  // 320 viewBox. This is what keeps the picture honest: an equilateral (3,3,3)
  // draws equilateral, a scalene (2,4,3) draws scalene, never a fixed shape with
  // mismatched numbers on it.
  function triVerts(sides,C){
    const a=sides[0],b=sides[1],c=sides[2];         // a=|apex-V1|, b=|V1-V2| (base), c=|V2-apex|
    const x=(a*a-c*c+b*b)/(2*b);                     // apex, with base V1V2 on the x-axis
    const y=Math.sqrt(Math.max(0.01,a*a-x*x));
    const raw=[[x,y],[0,0],[b,0]];                   // math coords, y UP: apex, V1, V2
    const xs=raw.map(v=>v[0]),ys=raw.map(v=>v[1]);
    const minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs);
    const minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
    const s=190/Math.max(maxX-minX,maxY-minY,0.01); // fit the largest span to ~190px
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    return raw.map(v=>[C+(v[0]-cx)*s, C-(v[1]-cy)*s]);   // centre on C + flip Y (SVG y is down)
  }

  // geometry per shape → {verts:[[x,y]…], labels:[{x,y,txt}…]} in the 320 viewBox.
  // labels sit just OUTSIDE each side's midpoint (outward normal from the CENTROID).
  function geom(p){
    const C=160;
    let V;
    if(p.shape==='square'){const h=90;V=[[C-h,C-h],[C+h,C-h],[C+h,C+h],[C-h,C+h]];}
    else if(p.shape==='rect'){const mx=Math.max(p.w,p.h),W=(p.w/mx)*200,H=(p.h/mx)*200;
      V=[[C-W/2,C-H/2],[C+W/2,C-H/2],[C+W/2,C+H/2],[C-W/2,C+H/2]];}
    else V=triVerts(p.sides,C);                       // triangle drawn TO SCALE from its labels
    const n=V.length,labels=[];
    // outward direction is measured from the true CENTROID (= C for square/rect,
    // but the honest centre for a scalene triangle)
    const cen=V.reduce((s,v)=>[s[0]+v[0],s[1]+v[1]],[0,0]);cen[0]/=n;cen[1]/=n;
    for(let i=0;i<n;i++){
      const A=V[i],B=V[(i+1)%n];
      const mx=(A[0]+B[0])/2,my=(A[1]+B[1])/2;
      let nx=mx-cen[0],ny=my-cen[1];const L=Math.hypot(nx,ny)||1;nx/=L;ny/=L;   // outward normal
      labels.push({x:mx+nx*30,y:my+ny*30,txt:p.sides[i]});
    }
    return{V,labels};
  }

  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{shape:'square',sides:[2,2,2,2],a:8};
    const peri=(typeof ctx.a==='number'&&ctx.a)||p.a||p.sides.reduce((s,x)=>s+x,0);
    const uid=++_uid;
    let done=false;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const g=geom(p),V=g.V,n=V.length;
    const ptsAttr=V.map(v=>v[0].toFixed(1)+','+v[1].toFixed(1)).join(' ');
    let edges='',his='',hits='',lbls='';
    for(let i=0;i<n;i++){
      const [x1,y1]=V[i],[x2,y2]=V[(i+1)%n];
      const seg=`x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"`;
      edges+=`<line class="pm-edge" ${seg}/>`;
      his+=`<line class="pm-hi" id="pm-hi-${uid}-${i}" ${seg}/>`;
      hits+=`<line class="pm-hit" data-i="${i}" ${seg}/>`;
    }
    g.labels.forEach(l=>{lbls+=`<text class="pm-lbl" x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}">${l.txt}</text>`;});

    root.innerHTML=`
      <div class="pm-root">
        <div class="pm-q" id="pm-q-${uid}">חַשְּׁבִי אֶת <b>הַהֶקֵּף</b> (סְכוּם כָּל הַצְּלָעוֹת)</div>
        <div class="pm-main">
          <div class="pm-ans-row">
            <input class="ans-inp pm-inp" id="pm-ans-${uid}" type="text" inputmode="numeric" maxlength="2" aria-label="הֶקֵּף">
            <button class="pm-btn" id="pm-chk-${uid}" aria-label="בְּדִיקָה">✓</button>
          </div>
          <div class="pm-stage">
            <svg class="pm-svg" viewBox="0 0 320 320" aria-label="צוּרָה">
              <polygon class="pm-body" points="${ptsAttr}"/>
              <g>${edges}</g><g>${his}</g><g>${hits}</g><g>${lbls}</g>
            </svg>
            <div class="pm-fx" id="pm-fx-${uid}"></div>
          </div>
        </div>
      </div>`;

    const $=id=>root.querySelector('#'+id+'-'+uid);
    const fx=$('pm-fx'),inp=$('pm-ans'),chk=$('pm-chk'),qEl=$('pm-q');
    {const h=document.getElementById('hint');
     if(h)h.textContent='📐 חַבְּרִי אֶת אָרְכֵי כָּל הַצְּלָעוֹת — זֶה הַהֶקֵּף!';}

    // tap a side → light it gold + a burst (helps track which lengths were added)
    root.querySelectorAll('.pm-hit').forEach(line=>{
      line.addEventListener('click',ev=>{
        ev.stopPropagation();if(done)return;
        const hi=root.querySelector('#pm-hi-'+uid+'-'+line.dataset.i);if(hi)hi.classList.toggle('on');
        const r=fx.getBoundingClientRect();starBurst(fx,ev.clientX-r.left,ev.clientY-r.top);
      });
    });

    // On a WRONG perimeter the game's number line appears (count-up 0..20) so she
    // can HOP the length of each side and add them up. Revealed once, then it stays
    // for the rest of this problem; loadProblem hides it again on the next card.
    let nlShown=false;
    function revealNL(){
      if(nlShown)return;nlShown=true;
      if(api.showNL)api.showNL();                                   // un-hide #nl-panel
      try{if(typeof NL!=='undefined'){NL.configure(20,1);NL.init(0);}}catch(e){}  // 0..20, rider at 0
    }
    function check(){
      if(done)return;
      const v=parseInt(inp.value,10);
      const h=document.getElementById('hint');
      if(inp.value===''||isNaN(v)){if(h)h.textContent='כִּתְבִי אֶת הַהֶקֵּף 💗';return;}
      if(v===peri){
        done=true;
        inp.classList.remove('pm-ready','ans-err');inp.classList.add('ans-ok');inp.disabled=true;chk.disabled=true;
        for(let i=0;i<n;i++){const hi=root.querySelector('#pm-hi-'+uid+'-'+i);if(hi)hi.classList.add('on');}
        qEl.innerHTML=`🎉 זֶה <b>${NAMES[p.shape]||''}</b> — הֶקֵּף ${peri}!`;
        api.solved();
      }else{
        inp.classList.remove('pm-ready');inp.classList.add('ans-err');
        api.wrong(v);
        revealNL();                        // a mistake brings up the number line
        if(h)h.textContent=v<peri
          ? 'קְצָת גָּדוֹל — סַפְּרִי עַל יְשַׁר הַמִּסְפָּרִים: קִפְצִי אֶת אֹרֶךְ כָּל צֵלַע 🔢'
          : 'קְצָת קָטָן — סַפְּרִי עַל יְשַׁר הַמִּסְפָּרִים: קִפְצִי אֶת אֹרֶךְ כָּל צֵלַע 🔢';
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');inp.focus();}},1000);
      }
    }
    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    // focus the answer box on mount so she can type right away (no click needed);
    // on touch this also auto-opens the number pad
    later(()=>{inp.classList.add('pm-ready');try{inp.focus();}catch(e){}},400);

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TPP,
    modes:['perim','mulc'],
    aidsReveal:'always',           // no number-line aid — the labelled shape IS the manipulative
    make(mode){return (mode==='perim'||mode==='mulc')?makePool(mode==='perim'?9:5):[];},
    mount,
  };
})();
