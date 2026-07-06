/* ── Polygon side/vertex-counting exercise (סְפִירַת צְלָעוֹת / קֹדְקוֹדִים) ────────
   A shape is drawn — a TRIANGLE (3) up to an OCTAGON (8), or a 5-/6-point STAR
   (10 / 12 sides) — and the child counts either its SIDES (צְלָעוֹת) or its
   CORNERS/vertices (קֹדְקוֹדִים) and types how many. The problem's `b` flag chooses
   the question (0 = sides, 1 = vertices); the answer is the same number either
   way, but the counting task and the marked element differ.
   Each shape is generated in a VARIED form so the same side-count never looks the
   same twice — regular, rectangle, an irregular-but-simple polygon, a more COMPLEX
   concave shape (dart, L, chevron, arrow, T…), or a star — at a random orientation.

   It is meant to be PLAYFUL, not a dry quiz:
     • Tapping a SIDE fires a small star-burst (ported in spirit from the space
       screen's click burst) at the touch point, floats a niqqud "צֵלַע" label
       that fades after ~½ second, and lights that side up (no number — the child
       counts the marked sides herself).
     • Tapping a CORNER fires the same burst, floats a "קֹדְקוֹד" label and pops a
       vivid magenta dot on that vertex — teaching the child to spot a vertex too.
     • Tapping the BODY of the shape cycles it through a palette of happy colours
       (pure fun, no effect on the answer).
     • A correct answer reveals the shape's Hebrew name as a little reward
       (זֶה מְשֻׁלָּשׁ! 3 צְלָעוֹת).

   Self-contained interactive type, mounted by core.js _colxMount into #colx-root
   (the same host path as the coin/column modules); self-checks via
   api.solved()/api.wrong(). Woven into Queen (mx) + Superman (sup); the 'poly'
   handle is used by the manual tester / direct setMode.
   Problem shape: { t:TPG, a, b }  where a = number of sides (3..8) and
   b = 0 → count SIDES, b = 1 → count CORNERS. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.polygon=(()=>{

  // side-counts offered: 3..8 plain polygons, plus 10 & 12 as STARS (5- / 6-point)
  const SHAPES=[3,4,5,6,7,8,10,12];
  const NAMES={3:'מְשֻׁלָּשׁ',4:'מְרֻבָּע',5:'מְחֻמָּשׁ',6:'מְשֻׁשֶּׁה',7:'מְשֻׁבָּע',8:'מְתֻמָּן',10:'כּוֹכָב',12:'כּוֹכָב'};
  // star side-count → number of points (10-sided = 5-point, 12-sided = 6-point)
  const STARPTS={10:5,12:6};
  // happy body-fill palette (the body cycles through these on click)
  const FILLS=['#FF6FB5','#7DC4FF','#FFC64B','#8CE99A','#C77DFF','#FF9F68','#4DD0E1'];
  // star-burst palette — the space screen's supernova colours
  const SPARK=['#7DC4FF','#C77DFF','#FFD27D','#FFFFFF','#8CE99A'];

  // ── shape geometry ────────────────────────────────────────────────────────
  // Shapes are built in unit coords (~[-1,1]) then FITTED into a centred box in
  // the 320×320 viewBox. Three flavours give visual variety for the same n:
  //   • regular   — equal sides, RANDOM rotation
  //   • rectangle — n=4 only, a clear axis-aligned rectangle
  //   • irregular — each vertex kept inside its own angular slice (so the polygon
  //                 stays SIMPLE / non-self-intersecting) with a jittered radius
  const C=160,BOX=232;                       // fit into a 232px box (leaves a margin)
  function _fit(pts){
    let a=1e9,b=1e9,c=-1e9,d=-1e9;
    pts.forEach(([x,y])=>{a=Math.min(a,x);b=Math.min(b,y);c=Math.max(c,x);d=Math.max(d,y);});
    const w=(c-a)||1,h=(d-b)||1,S=BOX/Math.max(w,h),cx=(a+c)/2,cy=(b+d)/2;
    return pts.map(([x,y])=>[C+(x-cx)*S,C+(y-cy)*S]);
  }
  function _minEdge(pts){
    let m=1e9;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];m=Math.min(m,Math.hypot(p[0]-q[0],p[1]-q[1]));}return m;
  }
  function _regular(n){const rot=Math.random()*Math.PI*2,o=[];for(let i=0;i<n;i++){const a=rot+i*2*Math.PI/n;o.push([Math.cos(a),Math.sin(a)]);}return o;}
  function _rectangle(){const L=1,s=0.5+Math.random()*0.3,[w,h]=Math.random()<.5?[L,s]:[s,L];return[[-w,-h],[w,-h],[w,h],[-w,h]];}
  function _irregular(n){const sl=2*Math.PI/n,o=[];for(let i=0;i<n;i++){const a=(i+0.25+Math.random()*0.5)*sl,r=0.70+Math.random()*0.30;o.push([Math.cos(a)*r,Math.sin(a)*r]);}return o;}
  // ── CONCAVE ("more complex") templates, keyed by side-count. Each is a SIMPLE
  // (non-self-intersecting) polygon with an inward dent, so counting sides /
  // corners still works. Long-ish edges keep every side clickable after fitting. ──
  const CONCAVE={
    4:[[[2,0],[-1,1.5],[0.3,0],[-1,-1.5]]],                                  // dart / arrowhead
    5:[[[0,0],[4,0],[4,3],[2,1.6],[0,3]]],                                   // caved-in "roof" pentagon
    6:[[[0,0],[2,0],[2,1],[1,1],[1,3],[0,3]],                                // L-shape
       [[1,0],[3,2],[1,4],[0,4],[2,2],[0,0]]],                               // chevron ">"
    7:[[[0,3],[0,1],[2,1],[2,0],[4,2],[2,4],[2,3]]],                         // arrow →
    8:[[[0,0],[3,0],[3,1],[2,1],[2,3],[1,3],[1,1],[0,1]]],                   // T-shape
  };
  function _concave(n){
    const opts=CONCAVE[n];if(!opts)return null;
    let pts=opts[(Math.random()*opts.length)|0].map(p=>[p[0],p[1]]);
    const q=(Math.random()*4)|0;                    // random 90° turns (bbox-safe)
    for(let i=0;i<q;i++)pts=pts.map(([x,y])=>[y,-x]);
    if(Math.random()<.5)pts=pts.map(([x,y])=>[-x,y]); // random mirror
    return pts;
  }
  // a p-pointed STAR as a SIMPLE polygon (2p vertices, alternating outer/inner
  // radius) → 2p sides. Roughly point-up with a little jitter; the notch depth
  // varies a touch for variety.
  function _star(p){
    const inner=0.38+Math.random()*0.12, rot=-Math.PI/2+(Math.random()*0.5-0.25), o=[];
    for(let i=0;i<p;i++){
      let a=rot+i*2*Math.PI/p;
      o.push([Math.cos(a),Math.sin(a)]);                 // outer point
      a+=Math.PI/p;
      o.push([Math.cos(a)*inner,Math.sin(a)*inner]);     // inner point
    }
    return o;
  }
  // Pick a fitted, varied shape AND the vertex-hit radius that keeps its shortest
  // side clickable. High counts (10/12) are always STARS; otherwise ~40% of shapes
  // that CAN be concave are, the rest regular / rectangle / irregular. Falls back
  // to a regular polygon if a candidate's edges come out too short.
  function buildShape(n){
    for(let t=0;t<18;t++){
      let raw,complex=false,star=false;
      if(STARPTS[n]){raw=_star(STARPTS[n]);complex=true;star=true;}
      else{
        const r=Math.random();
        if(CONCAVE[n]&&r<0.40){raw=_concave(n);complex=true;}
        else if(n===4&&r<0.60)raw=_rectangle();
        else if(r<0.78)       raw=_irregular(n);
        else                  raw=_regular(n);
      }
      const vhitR=star?15:complex?18:(n>=7?20:24);
      const pts=_fit(raw);
      if(_minEdge(pts)>=2*vhitR+10)return{pts,vhitR};
    }
    return{pts:_fit(_regular(n)),vhitR:n>=7?20:24};
  }

  // a bank of shapes — for each side-count 3..8, one COUNT-SIDES problem (b:0) and
  // one COUNT-CORNERS problem (b:1), shuffled (12 total). Geometry is re-randomised
  // on every mount, so even a repeated side-count looks different.
  function makePool(){
    const arr=[];SHAPES.forEach(s=>{arr.push({t:TPG,a:s,b:0});arr.push({t:TPG,a:s,b:1});});
    for(let i=arr.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[arr[i],arr[j]]=[arr[j],arr[i]];}
    return arr;
  }

  const CSS=`
  .pg-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}
  .pg-q{font-family:'Fredoka One',cursive;font-size:1.3rem;color:var(--skin-text,#fff);
    text-align:center;line-height:1.4;text-shadow:0 0 12px rgba(160,190,255,.35);min-height:1.5em}
  .pg-q b{color:var(--skin-accent,#ffd27d)}
  /* the shape stage: a gentle idle bob + a soft glow behind the polygon */
  .pg-stage{position:relative;width:min(300px,72vw);height:min(300px,72vw);
    display:flex;align-items:center;justify-content:center;animation:pgBob 3.4s ease-in-out infinite}
  .pg-stage::before{content:"";position:absolute;inset:6%;border-radius:50%;
    background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.16),rgba(160,190,255,.06) 55%,transparent 72%);
    filter:blur(3px);pointer-events:none}
  @keyframes pgBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  .pg-svg{width:100%;height:100%;overflow:visible;position:relative;z-index:1;
    animation:pgPop .5s cubic-bezier(.2,1.4,.4,1) both}
  @keyframes pgPop{from{transform:scale(.4) rotate(-12deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
  .pg-body{cursor:pointer;pointer-events:fill;transition:fill .3s;
    transform-box:fill-box;transform-origin:center;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35))}
  .pg-body.wob{animation:pgWob .42s ease}
  @keyframes pgWob{0%{transform:scale(1)}40%{transform:scale(1.06)}70%{transform:scale(.96)}100%{transform:scale(1)}}
  .pg-sheen{pointer-events:none}
  .pg-edge{stroke:rgba(255,255,255,.94);stroke-width:7;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
  .pg-hi{stroke:var(--skin-accent,#ffd27d);stroke-width:12;stroke-linecap:round;opacity:0;
    filter:drop-shadow(0 0 7px var(--skin-accent,#ffd27d));transition:opacity .2s;pointer-events:none}
  .pg-hi.on{opacity:1}
  /* wide, invisible hit-bands sitting on each side (pointer-events:stroke → the
     whole band is clickable even though the paint is transparent) */
  .pg-hit{stroke:#000;stroke-opacity:0;stroke-width:30;stroke-linecap:round;pointer-events:stroke;cursor:pointer}
  /* a CORNER dot — hidden until its vertex is tapped, then it pops in coloured
     (a vivid magenta, distinct from the gold side-highlight) so the child learns
     to tell a קֹדְקוֹד apart from a צֵלַע */
  .pg-vtx{fill:#FF3DA6;stroke:#fff;stroke-width:3;opacity:0;transform:scale(.2);
    transform-box:fill-box;transform-origin:center;filter:drop-shadow(0 0 7px #FF3DA6);
    transition:opacity .2s ease,transform .35s cubic-bezier(.2,1.5,.4,1);pointer-events:none}
  .pg-vtx.on{opacity:1;transform:scale(1)}
  /* invisible round hit target over each corner — sits ABOVE the side hit-bands
     (later in source) so a tap on a corner counts as a vertex, not a side */
  .pg-vhit{fill:#000;fill-opacity:0;pointer-events:all;cursor:pointer}
  /* effects overlay — bursts + floating "צֵלַע" / "קֹדְקוֹד" labels ride here, above the svg */
  .pg-fx{position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:4}
  .pgfx-ring{position:absolute;width:44px;height:44px;margin:0;border-radius:50%;
    border:3px solid rgba(255,255,255,.92);box-shadow:0 0 16px rgba(160,200,255,.85),inset 0 0 8px rgba(255,255,255,.6)}
  .pgfx-core{position:absolute;width:26px;height:26px;border-radius:50%;
    background:radial-gradient(circle,#fff 0%,#cfe6ff 45%,rgba(160,190,255,0) 72%)}
  .pgfx-star{position:absolute;
    clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
    background:var(--c,#fff);filter:drop-shadow(0 0 5px var(--c,#fff))}
  .pgfx-lbl{position:absolute;font-family:'Fredoka One',cursive;font-size:1.55rem;color:#fff;direction:rtl;
    white-space:nowrap;text-shadow:0 0 10px var(--skin-accent,#ffd27d),0 2px 4px rgba(0,0,0,.55)}
  /* answer row — direction:ltr so the ✓ button sits to the LEFT of the input */
  .pg-ans-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-top:2px;direction:ltr}
  .pg-btn{font-family:'Fredoka One',cursive;font-size:1.15rem;border:0;border-radius:14px;padding:11px 22px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .pg-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .pg-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  #colx-root .ans-inp.pg-inp{width:78px;height:60px;font-size:2.1rem;border-radius:14px;text-align:center}
  #colx-root .pg-inp.pg-ready{animation:pgReady 1s ease-in-out infinite alternate}
  @keyframes pgReady{from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 22px var(--skin-accent,#ffd27d)}}
  `;

  function injectStyle(){
    if(document.getElementById('pg-style'))return;
    const st=document.createElement('style');st.id='pg-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;

  // a small star-burst at (x,y) inside the fx overlay — a ring flash, a bright
  // core and star sparkles flying outward, all self-removing (~½ second)
  function starBurst(fx,x,y){
    const ring=document.createElement('div');ring.className='pgfx-ring';
    ring.style.left=x+'px';ring.style.top=y+'px';
    ring.style.transform='translate(-50%,-50%)';fx.appendChild(ring);
    ring.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:.95},
                  {transform:'translate(-50%,-50%) scale(2.7)',opacity:0}],
                 {duration:520,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>ring.remove();
    const core=document.createElement('div');core.className='pgfx-core';
    core.style.left=x+'px';core.style.top=y+'px';fx.appendChild(core);
    core.animate([{transform:'translate(-50%,-50%) scale(.3)',opacity:1},
                  {transform:'translate(-50%,-50%) scale(1.7)',opacity:0}],
                 {duration:380,easing:'ease-out'}).onfinish=()=>core.remove();
    const N=11;
    for(let i=0;i<N;i++){
      const p=document.createElement('div');p.className='pgfx-star';
      p.style.setProperty('--c',SPARK[i%SPARK.length]);
      const sz=8+Math.random()*10;p.style.width=sz+'px';p.style.height=sz+'px';
      p.style.left=x+'px';p.style.top=y+'px';fx.appendChild(p);
      const ang=(i/N)*Math.PI*2+Math.random()*.5,dist=32+Math.random()*42;
      const dx=Math.cos(ang)*dist,dy=Math.sin(ang)*dist,rot=(Math.random()*360)|0;
      p.animate([
        {transform:'translate(-50%,-50%) translate(0,0) scale(.3) rotate(0deg)',opacity:1},
        {transform:`translate(-50%,-50%) translate(${dx}px,${dy}px) scale(1) rotate(${rot}deg)`,opacity:1,offset:.7},
        {transform:`translate(-50%,-50%) translate(${dx*1.25}px,${dy*1.25+12}px) scale(.2) rotate(${rot}deg)`,opacity:0}
      ],{duration:560+Math.random()*220,easing:'cubic-bezier(.15,.7,.3,1)'}).onfinish=()=>p.remove();
    }
  }

  // a niqqud label ("צֵלַע" / "קֹדְקוֹד") that floats up and fades in ~½ second, beside the touch
  function popLabel(fx,x,y,text){
    const el=document.createElement('div');el.className='pgfx-lbl';el.textContent=text;
    el.style.left=x+'px';el.style.top=y+'px';fx.appendChild(el);
    el.animate([
      {transform:'translate(-50%,-50%) translateY(0) scale(.5)',opacity:0},
      {transform:'translate(-50%,-50%) translateY(-12px) scale(1.15)',opacity:1,offset:.35},
      {transform:'translate(-50%,-50%) translateY(-34px) scale(1)',opacity:0}
    ],{duration:560,easing:'ease-out'}).onfinish=()=>el.remove();
  }

  function mount({root,a,b,api}){
    injectStyle();
    const sides=a||3;
    const askVtx=(b===1);                    // b=1 → count CORNERS, else count SIDES
    const NOUN=askVtx?'קֹדְקוֹדִים':'צְלָעוֹת';
    const uid=++_uid;
    let done=false,fillIdx=(Math.random()*FILLS.length)|0,goalN=0;
    const markedE=new Array(sides).fill(false),markedV=new Array(sides).fill(false);
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};

    // ── geometry: a varied simple polygon (may be CONCAVE). buildShape returns the
    // fitted points AND the corner-target radius that keeps every side clickable. ──
    const shp=buildShape(sides);
    const V=shp.pts, vhitR=shp.vhitR;
    const ptsAttr=V.map(v=>v[0].toFixed(1)+','+v[1].toFixed(1)).join(' ');
    let edges='',his='',hits='',verts='',vhits='';
    for(let i=0;i<sides;i++){
      const [x1,y1]=V[i],[x2,y2]=V[(i+1)%sides];
      const seg=`x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"`;
      edges+=`<line class="pg-edge" ${seg}/>`;
      his+=`<line class="pg-hi" id="pg-hi-${uid}-${i}" ${seg}/>`;
      hits+=`<line class="pg-hit" data-i="${i}" ${seg}/>`;
      const vx=x1.toFixed(1),vy=y1.toFixed(1);
      verts+=`<circle class="pg-vtx" id="pg-vtx-${uid}-${i}" cx="${vx}" cy="${vy}" r="10"/>`;
      vhits+=`<circle class="pg-vhit" data-i="${i}" cx="${vx}" cy="${vy}" r="${vhitR}"/>`;
    }

    root.innerHTML=`
      <div class="pg-root">
        <div class="pg-q" id="pg-q-${uid}">כַּמָּה <b>${NOUN}</b> יֵשׁ לַצּוּרָה?</div>
        <div class="pg-stage">
          <svg class="pg-svg" viewBox="0 0 320 320" aria-label="צוּרָה">
            <defs>
              <radialGradient id="pgSheen-${uid}" cx="35%" cy="28%" r="78%">
                <stop offset="0" stop-color="#ffffff" stop-opacity=".55"/>
                <stop offset="45%" stop-color="#ffffff" stop-opacity=".08"/>
                <stop offset="100%" stop-color="#000000" stop-opacity=".2"/>
              </radialGradient>
            </defs>
            <polygon class="pg-body" id="pg-body-${uid}" points="${ptsAttr}" fill="${FILLS[fillIdx]}"/>
            <polygon class="pg-sheen" points="${ptsAttr}" fill="url(#pgSheen-${uid})"/>
            <g>${edges}</g>
            <g>${his}</g>
            <g>${verts}</g>
            <g>${hits}</g>
            <g>${vhits}</g>
          </svg>
          <div class="pg-fx" id="pg-fx-${uid}"></div>
        </div>
        <div class="pg-ans-row">
          <button class="pg-btn" id="pg-chk-${uid}" aria-label="בְּדִיקָה">✓</button>
          <input class="ans-inp pg-inp" id="pg-ans-${uid}" type="text" inputmode="numeric" maxlength="2" aria-label="כַּמָּה ${NOUN}">
        </div>
      </div>`;

    const $=id=>root.querySelector('#'+id+'-'+uid);
    const body=$('pg-body'),fx=$('pg-fx'),inp=$('pg-ans'),chk=$('pg-chk'),qEl=$('pg-q');

    // instruction hint for this variant (overrides the host's generic TPG hint)
    {const h=document.getElementById('hint');
     if(h)h.textContent=askVtx
       ?'🔷 לַחֲצִי עַל כָּל קֹדְקוֹד (פִּנָּה), סְפְרִי כַּמָּה — וְכִתְבִי אֶת הַמִּסְפָּר!'
       :'🔷 לַחֲצִי עַל כָּל צֵלַע, סְפְרִי כַּמָּה — וְכִתְבִי אֶת הַמִּסְפָּר!';}

    // clicking the shape's body → cycle its colour (pure fun)
    body.addEventListener('click',()=>{
      if(done)return;
      fillIdx=(fillIdx+1)%FILLS.length;
      body.setAttribute('fill',FILLS[fillIdx]);
      body.classList.remove('wob');void body.offsetWidth;body.classList.add('wob');
    });

    function nudge(){
      if(goalN===sides&&!done){inp.classList.add('pg-ready');
        const h=document.getElementById('hint');
        if(h)h.textContent=askVtx?'🎉 סִמַּנְתְּ אֶת כָּל הַקֹּדְקוֹדִים! סְפְרִי כַּמָּה וְכִתְבִי אֶת הַמִּסְפָּר!'
                                 :'🎉 סִמַּנְתְּ אֶת כָּל הַצְּלָעוֹת! סְפְרִי כַּמָּה וְכִתְבִי אֶת הַמִּסְפָּר!';}
    }
    // light a SIDE (gold) — counts toward the goal only when we're counting sides
    function markEdge(i){
      if(markedE[i])return;markedE[i]=true;
      const hi=root.querySelector('#pg-hi-'+uid+'-'+i);if(hi)hi.classList.add('on');
      if(!askVtx){goalN++;nudge();}
    }
    // colour a CORNER (magenta) — counts toward the goal only when counting corners
    function markVtx(i){
      if(markedV[i])return;markedV[i]=true;
      const dot=root.querySelector('#pg-vtx-'+uid+'-'+i);if(dot)dot.classList.add('on');
      if(askVtx){goalN++;nudge();}
    }

    // clicking a SIDE → star-burst + floating "צֵלַע" + light the side
    root.querySelectorAll('.pg-hit').forEach(line=>{
      line.addEventListener('click',ev=>{
        ev.stopPropagation();
        if(done)return;
        const r=fx.getBoundingClientRect();
        const x=ev.clientX-r.left,y=ev.clientY-r.top;
        starBurst(fx,x,y);popLabel(fx,x,y,'צֵלַע');
        markEdge(parseInt(line.dataset.i,10));
      });
    });

    // clicking a CORNER → star-burst + floating "קֹדְקוֹד" + pop a coloured dot
    root.querySelectorAll('.pg-vhit').forEach(c=>{
      c.addEventListener('click',ev=>{
        ev.stopPropagation();
        if(done)return;
        const r=fx.getBoundingClientRect();
        const x=ev.clientX-r.left,y=ev.clientY-r.top;
        starBurst(fx,x,y);popLabel(fx,x,y,'קֹדְקוֹד');
        markVtx(parseInt(c.dataset.i,10));
      });
    });

    function check(){
      if(done)return;
      const v=parseInt(inp.value,10);
      if(inp.value===''||isNaN(v)){const h=document.getElementById('hint');if(h)h.textContent='כִּתְבִי כַּמָּה '+NOUN+' סָפַרְתְּ 💗';return;}
      if(v===sides){
        done=true;
        inp.classList.remove('pg-ready','ans-err');inp.classList.add('ans-ok');inp.disabled=true;chk.disabled=true;
        // finale: mark the whole COUNTED set, then reveal the shape's name
        for(let i=0;i<sides;i++){if(askVtx)markVtx(i);else markEdge(i);}
        qEl.innerHTML=`🎉 זֶה <b>${NAMES[sides]||''}</b> — ${sides} ${NOUN}!`;
        api.solved();
      }else{
        inp.classList.remove('pg-ready');inp.classList.add('ans-err');
        const h=document.getElementById('hint');
        if(h)h.textContent=v<sides?('יֵשׁ עוֹד '+NOUN+'! נַסִּי מִסְפָּר גָּדוֹל יוֹתֵר 🔷')
                                   :('פָּחוֹת '+NOUN+'! נַסִּי מִסְפָּר קָטָן יוֹתֵר 💗');
        api.wrong(v);
        later(()=>{if(!done){inp.value='';inp.classList.remove('ans-err');inp.focus();}},1000);
      }
    }

    chk.addEventListener('click',check);
    inp.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});

    return function cleanup(){timers.forEach(clearTimeout);root.innerHTML='';};
  }

  return{
    t:TPG,
    modes:['poly'],
    aidsReveal:'always',   // no number-line aid — the shape itself is the manipulative
    make(mode){return mode==='poly'?makePool():[];},
    mount,
  };
})();
