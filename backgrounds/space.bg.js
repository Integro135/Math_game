/* ── Space background module ────────────────────────────────────────────────
   Deep space: starfield, spiral galaxies, Earth (moon + satellites, aurora,
   city lights), giant ringed planet with orbiting gravel, the Sun's limb,
   black hole (accretion disk, gravity, jets), supernova, constellations and
   the click-to-learn discovery bubble.
   The Sun's limb is alive: boiling granulation, prominence loops that swell
   and sink, and a scheduled solar flare every ~½–1 minute.
   Click reactions (run alongside the fact bubble): black hole → feeding
   frenzy + a doomed astronaut spiraling in (tumbles, stretches, vanishes),
   galaxy → spin-up, moon/satellite → one extra orbit lap, Earth /
   aurora → spin-up + aurora surge + city flare + all orbiters lap, Saturn →
   ring rush + wobble + visible spin (storm ovals sweep the disc), bright
   star → full supernova (ported from success-supernova.js: collapse,
   shockwaves, nebula, ejecta, pulsar), bare sky → meteor burst. The bubble
   auto-places itself outside the clicked object's animation.
   Docs: backgrounds/README.md.
   Loaded on demand by game/js/bg-loader.js. Registers itself into the
   BACKGROUNDS registry; init() mounts the scene into the given stage layer
   and returns a cleanup that stops every loop and listener it created. */
window.BACKGROUNDS=window.BACKGROUNDS||{};
window.BACKGROUNDS.space={
  skin:'space',                 // game look:  game/skins/space.skin.css
  aids:'space',                 // aid art:    aids/space.aids.js (rocket + stars)
  init({stage}){
  const layer=stage;
  let stopped=false;
  layer.innerHTML='';layer.style.overflow='hidden';
  const DPR=Math.min(devicePixelRatio||1,2),TAU=Math.PI*2;
  let W=innerWidth,H=innerHeight;
  const cv=document.createElement('canvas');
  cv.style.cssText='position:fixed;inset:0;width:100%;height:100%';
  layer.appendChild(cv);
  const ctx=cv.getContext('2d');
  // Discovery bubble — click a sky object to learn about it (Hebrew + niqqud)
  let factEl=document.getElementById('gxy-fact');
  if(!factEl){factEl=document.createElement('div');factEl.id='gxy-fact';document.body.appendChild(factEl);}
  factEl.style.cssText='position:fixed;z-index:60;max-width:280px;direction:rtl;text-align:right;'+
    'background:rgba(14,12,40,.92);border:1px solid rgba(150,170,255,.45);border-radius:14px;'+
    'padding:10px 14px;color:#EAF0FF;font-size:15px;line-height:1.55;pointer-events:none;'+
    'opacity:0;transition:opacity .3s;box-shadow:0 6px 24px rgba(4,2,16,.6)';
  let factTimer=null;
  function lg(c,x1,y1,x2,y2,st){const g=c.createLinearGradient(x1,y1,x2,y2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function rg(c,x,y,r1,r2,st){const g=c.createRadialGradient(x,y,r1,x,y,r2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function makeLayer(){const c=document.createElement('canvas');c.width=W*DPR;c.height=H*DPR;const x=c.getContext('2d');x.setTransform(DPR,0,0,DPR,0,0);return{cv:c,cx:x};}
  let STARS_FAR,STARS_NEAR,GALAXIES,DISK_PARTICLES,INFALL,JETS,COMETS,PLANET,EARTH,TRAVELERS,BH,SUN;
  let spaceLayer,vigLayer,nova=null,nextNovaAt=25+Math.random()*35,lastT=0;
  let bhFrenzyT=null;   // click on the black hole → short feeding frenzy
  let ASTRO=null;       // click on the black hole → an astronaut spirals in
  let sunFlareT=null,sunFlareAng=0,nextSunFlareAt=null;   // limb-flare schedule

  // Constellations — real figures a child can find in the night sky
  const CONSTELLATIONS=[
    {name:'הַדֻּבָּה הַגְּדוֹלָה',cx:.40,cy:.13,s:.15,
     fact:'שִׁבְעָה כּוֹכָבִים בְּצוּרַת מַצֶּקֶת. הִיא עוֹזֶרֶת לִמְצֹא אֶת כּוֹכַב הַצָּפוֹן!',
     pts:[[0,.10],[.15,.04],[.30,.08],[.44,.14],[.46,.34],[.66,.36],[.64,.12]],
     lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]]},
    {name:'אוֹרִיוֹן',cx:.66,cy:.07,s:.13,
     fact:'אוֹרִיוֹן הַצַּיָּד — שְׁלוֹשֶׁת כּוֹכְבֵי הַחֲגוֹרָה שֶׁלּוֹ מְפֻרְסָמִים בְּכָל הָעוֹלָם.',
     pts:[[.15,0],[.55,.02],[.28,.30],[.36,.33],[.44,.36],[.12,.62],[.58,.60]],
     lines:[[0,1],[0,2],[1,4],[2,3],[3,4],[2,5],[4,6]]},
    {name:'קַסְיוֹפֵּאָה',cx:.05,cy:.10,s:.11,
     fact:'חֲמִשָּׁה כּוֹכָבִים בְּצוּרַת הָאוֹת W — קַל מְאוֹד לְזַהוֹת אוֹתָהּ בַּשָּׁמַיִם.',
     pts:[[0,.30],[.20,.05],[.42,.25],[.62,0],[.85,.18]],
     lines:[[0,1],[1,2],[2,3],[3,4]]},
  ];
  // Earth orbiters: the Moon + two satellites on inclined elliptical orbits
  const EARTH_ORBITERS=[
    {kind:'moon',spd:.22,phase:0.0,rx:2.35,ry:.60,size:.27},
    {kind:'sat', spd:.60,phase:2.1,rx:1.75,ry:.50,size:.30},
    {kind:'sat', spd:.85,phase:4.6,rx:1.45,ry:.40,size:.24},
  ];

  function buildScene(){
    // The black hole — tucked near the right border so the game form won't cover it
    BH={x:W*.90,y:H*.36,r:Math.min(W,H)*.075,tilt:.42};
    // The Sun — enormous next to Earth, parked just below the screen edge so
    // only a blazing limb rises from the bottom
    {const sunR=Math.min(W,H)*.95;SUN={x:W*.55,y:H+sunR-H*.11,r:sunR};}
    STARS_FAR=Array.from({length:340},()=>({x:Math.random()*W,y:Math.random()*H,r:.3+Math.random()*.8,tw:Math.random()*TAU,spd:.4+Math.random()*1.4,hue:Math.random()}));
    STARS_NEAR=Array.from({length:60},()=>({x:Math.random()*W,y:Math.random()*H,r:1.0+Math.random()*1.8,tw:Math.random()*TAU,spd:.5+Math.random()*1.6,hue:Math.random(),spikes:Math.random()<.35}));
    GALAXIES=[
      {x:W*.12,y:H*.54,scale:Math.min(W,H)*.10, tilt:.50,ang:.6, spin:.018, arms:2,hueA:'180, 200, 255',hueB:'255, 210, 235'},
      {x:W*.84,y:H*.78,scale:Math.min(W,H)*.075,tilt:.36,ang:2.1,spin:-.024,arms:2,hueA:'200, 185, 255',hueB:'170, 225, 255'},
      {x:W*.30,y:H*.80,scale:Math.min(W,H)*.055,tilt:.60,ang:4.0,spin:.030, arms:3,hueA:'255, 220, 190',hueB:'200, 200, 255'},
    ];
    for(const g of GALAXIES){
      g.x2=0;g.boostT=null;          // click spin-up state
      g.stars=Array.from({length:130},()=>{
        const arm=Math.floor(Math.random()*g.arms);
        const d=.18+Math.pow(Math.random(),.7)*.85;
        const theta=arm*TAU/g.arms+d*3.4+(Math.random()-.5)*(.35+d*.4);
        return{d,theta,r:.5+Math.random()*1.1,a:.25+Math.random()*.6};
      });
    }
    DISK_PARTICLES=Array.from({length:380},()=>{
      const d=BH.r*(1.45+Math.pow(Math.random(),1.6)*2.6);
      return{d,ang:Math.random()*TAU,spd:1.9*Math.pow(BH.r*2.2/d,1.5),size:.7+Math.random()*1.6,jitter:Math.random()*TAU};
    });
    INFALL=Array.from({length:26},()=>({d:BH.r*(1.5+Math.random()*2.8),ang:Math.random()*TAU,spd:2.4+Math.random()*1.8,decay:.10+Math.random()*.16}));
    JETS=Array.from({length:24},()=>({dir:Math.random()<.5?1:-1,t:Math.random(),spd:.35+Math.random()*.55,off:Math.random()*2-1,size:.8+Math.random()*1.5}));
    COMETS=Array.from({length:3},()=>spawnComet(true));
    // The ringed planet — big at the top-left; its rings carry orbiting gravel
    PLANET={
      x:W*.17,y:H*.22,r:Math.min(W,H)*.136,
      rocks:Array.from({length:48},()=>{
        const k=1.62+Math.random()*.44;
        return{ang:Math.random()*TAU,k,spd:.55*Math.pow(1.62/k,1.5),size:.8+Math.random()*1.4,hue:Math.random()};
      }),
    };
    PLANET.boostT=null;PLANET.x2=0;   // click → ring rush + visible spin-up
    EARTH={
      x:W*.16,y:H*.74,r:Math.min(W,H)*.052,
      x2:0,boostT:null,               // click → spin-up + aurora surge
      land:[[.05,-.35,.55,.42],[.18,.30,.30,.50],[.42,-.20,.45,.60],[.55,.45,.25,.30],[.72,-.45,.40,.35],[.78,.25,.35,.45],[.95,.60,.30,.25]],
      clouds:Array.from({length:9},()=>({lon:Math.random(),lat:(Math.random()-.5)*1.6,w:.18+Math.random()*.30,h:.10+Math.random()*.14,a:.25+Math.random()*.30})),
      // city-light spots in unit-disc coords — visible only on the night side
      cities:Array.from({length:26},()=>{
        const a=Math.random()*TAU,d=Math.sqrt(Math.random())*.88;
        return[Math.cos(a)*d,Math.sin(a)*d,Math.random()*TAU];
      }),
    };
    TRAVELERS=Array.from({length:18},()=>spawnTraveler(true));
    nova=null;
    spaceLayer=makeLayer();vigLayer=makeLayer();
    paintSpace(spaceLayer.cx);paintVignette(vigLayer.cx);
  }
  function spawnTraveler(anywhere){
    const speed=.3+Math.random()*1.6;
    let x,y,ang;
    if(anywhere){x=Math.random()*W;y=Math.random()*H;ang=Math.random()*TAU;}
    else{
      const edge=Math.floor(Math.random()*4);
      if(edge===0){x=-10;y=Math.random()*H;ang=-Math.PI/3+Math.random()*(Math.PI*2/3);}
      else if(edge===1){x=W+10;y=Math.random()*H;ang=Math.PI*2/3+Math.random()*(Math.PI*2/3);}
      else if(edge===2){x=Math.random()*W;y=-10;ang=Math.PI/6+Math.random()*(Math.PI*2/3);}
      else{x=Math.random()*W;y=H+10;ang=-Math.PI*5/6+Math.random()*(Math.PI*2/3);}
    }
    return{x,y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,r:.8+Math.random()*1.6,hue:Math.random(),tw:Math.random()*TAU,spd:.6+Math.random()*1.8};
  }
  function spawnComet(anywhere){
    const fromLeft=Math.random()<.5;
    return{
      x:anywhere?Math.random()*W:(fromLeft?-60:W+60),
      y:Math.random()*H*.85,
      vx:(fromLeft?1:-1)*(2.2+Math.random()*2.6),
      vy:.4+Math.random()*.9,
      len:50+Math.random()*80,
      delay:anywhere?Math.random()*6:2+Math.random()*9,
    };
  }
  // Black-hole gravity: inside 7r the object is pulled toward BH (velocity kick
  // for movers, direct drift for stationary stars). Returns -1 once it crosses
  // the horizon (swallowed — caller respawns it), else a 0..1 fade that
  // approaches 0 near the horizon (1 = unaffected).
  function bhPull(o,K){
    const dx=BH.x-o.x,dy=BH.y-o.y,d=Math.hypot(dx,dy);
    if(d<BH.r*1.05)return-1;
    if(d>=BH.r*7)return 1;
    const f=K*(BH.r/d)*(BH.r/d);
    if(o.vx!==undefined){
      o.vx+=dx/d*f;o.vy+=dy/d*f;
      const sp=Math.hypot(o.vx,o.vy);
      if(sp>6){o.vx*=6/sp;o.vy*=6/sp;}
    }else{o.x+=dx/d*f*2;o.y+=dy/d*f*2;}
    return Math.min(1,(d-BH.r)/(BH.r*1.2));
  }
  // Gentle gravity of Earth & the ringed planet — bends a passing trajectory a
  // little, never captures: no pull inside the body, no fade, no swallowing.
  function bodyPull(o,cx,cy,cr,K){
    const dx=cx-o.x,dy=cy-o.y,d=Math.hypot(dx,dy);
    if(d<cr||d>=cr*5)return;
    const f=K*(cr/d)*(cr/d);
    o.vx+=dx/d*f;o.vy+=dy/d*f;
  }
  // Click-effect envelope: fast attack, slow release, 0 outside [t0, t0+dur]
  function clickEnv(t0,t,dur){
    if(t0==null)return 0;
    const e=t-t0;
    if(e<0||e>dur)return 0;
    return e<.35?e/.35:1-(e-.35)/(dur-.35);
  }
  // One smooth extra orbit lap (a full TAU, so the schedule stays continuous)
  function lapExtra(o,t){
    if(o.lapT0==null)return 0;
    const p=(t-o.lapT0)/2.2;
    if(p>=1){o.lapT0=null;return 0;}
    return TAU*p*p*(3-2*p);
  }
  function paintSpace(c){
    c.fillStyle=lg(c,0,0,W,H,[[0,'#05040f'],[.35,'#0a0820'],[.6,'#0c0a26'],[1,'#070414']]);
    c.fillRect(0,0,W,H);
    const nebulae=[
      [W*.20,H*.30,Math.min(W,H)*.42,'90, 50, 160',.10],
      [W*.45,H*.75,Math.min(W,H)*.38,'40, 80, 170',.09],
      [W*.85,H*.18,Math.min(W,H)*.34,'160, 50, 130',.08],
      [W*.70,H*.60,Math.min(W,H)*.50,'50, 40, 120',.07],
    ];
    for(const[nx,ny,nr,hue,a]of nebulae){
      c.fillStyle=rg(c,nx,ny,0,nr,[[0,`rgba(${hue}, ${a})`],[.6,`rgba(${hue}, ${a*.45})`],[1,`rgba(${hue}, 0)`]]);
      c.fillRect(0,0,W,H);
    }
    // The Milky Way — a bright galactic band, painted once so it costs nothing per frame
    c.save();
    c.translate(W*.5,H*.5);c.rotate(-.5);
    const bandH=Math.min(W,H)*.46;
    c.fillStyle=lg(c,0,-bandH/2,0,bandH/2,[[0,'rgba(150, 160, 220, 0)'],[.5,'rgba(185, 192, 240, 0.10)'],[1,'rgba(150, 160, 220, 0)']]);
    c.fillRect(-W,-bandH/2,W*2,bandH);
    c.fillStyle=rg(c,0,0,0,bandH*.85,[[0,'rgba(255, 235, 205, 0.18)'],[.4,'rgba(230, 205, 235, 0.10)'],[1,'rgba(200, 180, 235, 0)']]);
    c.beginPath();c.ellipse(0,0,bandH*1.5,bandH*.52,0,0,TAU);c.fill();
    for(let i=0;i<14;i++){
      const dx=-W+Math.random()*W*2,dy=(Math.random()-.5)*bandH*.30;
      c.fillStyle=`rgba(8, 6, 18, ${.18+Math.random()*.16})`;
      c.beginPath();c.ellipse(dx,dy,60+Math.random()*150,7+Math.random()*14,(Math.random()-.5)*.3,0,TAU);c.fill();
    }
    for(let i=0;i<900;i++){
      const bx=(Math.random()-.5)*W*2;
      const by=(Math.random()-.5)*bandH*Math.pow(Math.random(),.8);
      const warm=Math.random()<.25;
      c.fillStyle=warm?`rgba(255, 230, 200, ${.05+Math.random()*.15})`:`rgba(210, 218, 255, ${.04+Math.random()*.14})`;
      c.fillRect(bx,by,1,Math.random()<.15?2:1);
    }
    c.restore();
    for(let i=0;i<260;i++){
      c.fillStyle=`rgba(190, 200, 240, ${.03+Math.random()*.08})`;
      c.fillRect(Math.random()*W,Math.random()*H,1,1);
    }
    // Constellations — painted once; hit-areas stored for discovery clicks
    for(const cn of CONSTELLATIONS){
      const sc=Math.min(W,H)*cn.s;
      const P=cn.pts.map(([px,py])=>[W*cn.cx+px*sc,H*cn.cy+py*sc]);
      cn.hit={x:P.reduce((s,q)=>s+q[0],0)/P.length,y:P.reduce((s,q)=>s+q[1],0)/P.length,r:sc*.62};
      c.strokeStyle='rgba(150, 180, 255, 0.20)';
      c.lineWidth=1;
      for(const[a,b]of cn.lines){c.beginPath();c.moveTo(P[a][0],P[a][1]);c.lineTo(P[b][0],P[b][1]);c.stroke();}
      for(const[qx,qy]of P){
        c.fillStyle='rgba(225, 235, 255, 0.30)';
        c.beginPath();c.arc(qx,qy,3.4,0,TAU);c.fill();
        c.fillStyle='rgba(240, 246, 255, 0.95)';
        c.beginPath();c.arc(qx,qy,1.7,0,TAU);c.fill();
      }
    }
  }
  function paintVignette(c){
    c.fillStyle=rg(c,W/2,H*.5,Math.min(W,H)*.45,Math.max(W,H)*.8,[[0,'rgba(2, 1, 8, 0)'],[.7,'rgba(2, 1, 8, 0.16)'],[1,'rgba(2, 1, 8, 0.52)']]);
    c.fillRect(0,0,W,H);
  }
  function starColor(hue,a){
    if(hue<.6)return`rgba(200, 215, 255, ${a})`;
    if(hue<.85)return`rgba(255, 244, 224, ${a})`;
    return`rgba(255, 200, 160, ${a})`;
  }
  function drawStars(t){
    for(const s of STARS_FAR){
      const g=bhPull(s,.5);
      if(g<0){s.x=Math.random()*W;s.y=Math.random()*H;continue;}
      const tw=.5+.5*Math.sin(t*s.spd+s.tw);
      ctx.fillStyle=starColor(s.hue,(.25+tw*.6)*g);
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.fill();
    }
    for(const s of STARS_NEAR){
      const g=bhPull(s,.5);
      if(g<0){s.x=Math.random()*W;s.y=Math.random()*H;continue;}
      const tw=.55+.45*Math.sin(t*s.spd+s.tw);
      const a=(.4+tw*.6)*g;
      ctx.fillStyle=starColor(s.hue,a*.18);
      ctx.beginPath();ctx.arc(s.x,s.y,s.r*3.2,0,TAU);ctx.fill();
      ctx.fillStyle=starColor(s.hue,a);
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.fill();
      if(s.spikes){
        const len=s.r*(4+tw*3);
        ctx.strokeStyle=starColor(s.hue,a*.5);
        ctx.lineWidth=.8;
        ctx.beginPath();
        ctx.moveTo(s.x-len,s.y);ctx.lineTo(s.x+len,s.y);
        ctx.moveTo(s.x,s.y-len);ctx.lineTo(s.x,s.y+len);
        ctx.stroke();
      }
    }
  }
  function drawGalaxy(g,t,dt){
    // clicked → spins faster and glows for a few seconds, then eases back
    const f=clickEnv(g.boostT,t,3);
    if(f>0)g.x2+=dt*g.spin*12*f;       // extra angle accumulates: no position jump
    const B=1+f*.9;
    const rot=g.ang+t*g.spin+g.x2;
    ctx.save();
    ctx.translate(g.x,g.y);
    ctx.rotate(g.ang*.35);
    ctx.scale(1,g.tilt);
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=rg(ctx,0,0,0,g.scale*1.25,[[0,`rgba(${g.hueB}, ${.20*B})`],[.45,`rgba(${g.hueA}, ${.10*B})`],[1,`rgba(${g.hueA}, 0)`]]);
    ctx.beginPath();ctx.arc(0,0,g.scale*1.25,0,TAU);ctx.fill();
    for(let arm=0;arm<g.arms;arm++){
      for(let i=0;i<26;i++){
        const d=.16+(i/26)*.95;
        const theta=rot+arm*TAU/g.arms+d*3.4;
        ctx.fillStyle=`rgba(${g.hueA}, ${.10*B*(1-d*.75)})`;
        ctx.beginPath();
        ctx.arc(Math.cos(theta)*d*g.scale,Math.sin(theta)*d*g.scale,g.scale*.10*(1-d*.45),0,TAU);
        ctx.fill();
      }
    }
    for(const s of g.stars){
      const theta=s.theta+t*g.spin*(1.4-s.d*.5)+g.x2*(1.4-s.d*.5);
      ctx.fillStyle=`rgba(${g.hueB}, ${s.a*(1-s.d*.5)})`;
      ctx.beginPath();
      ctx.arc(Math.cos(theta)*s.d*g.scale,Math.sin(theta)*s.d*g.scale,s.r,0,TAU);
      ctx.fill();
    }
    ctx.fillStyle=rg(ctx,0,0,0,g.scale*.30,[[0,`rgba(255, 250, 235, ${Math.min(1,.85*B)})`],[.4,`rgba(${g.hueB}, ${Math.min(1,.40*B)})`],[1,`rgba(${g.hueB}, 0)`]]);
    ctx.beginPath();ctx.arc(0,0,g.scale*.30,0,TAU);ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation='source-over';
  }
  function drawPlanet(t,dt){
    const p=PLANET;
    // clicked → the ring gravel races, the rings brighten and wobble,
    // the planet visibly spins up (its storms sweep across the disc)
    const f=clickEnv(p.boostT,t,3);
    p.x2+=dt*.55*f;                          // extra spin accumulates: no jump
    const ROT=-0.3+Math.sin(t*3)*.06*f,ASP=0.55/1.9;
    if(f>0){                                 // excitement glow
      ctx.fillStyle=rg(ctx,p.x,p.y,p.r,p.r*2.6,[[0,`rgba(255, 214, 150, ${.18*f})`],[1,'rgba(255, 214, 150, 0)']]);
      ctx.beginPath();ctx.arc(p.x,p.y,p.r*2.6,0,TAU);ctx.fill();
    }
    // gravel orbiting inside the rings — far half behind, near half in front
    const drawRocks=front=>{
      for(const ro of p.rocks){
        if((Math.sin(ro.ang)>=0)!==front)continue;
        const ex=Math.cos(ro.ang)*p.r*ro.k;
        const ey=Math.sin(ro.ang)*p.r*ro.k*ASP;
        const qx=p.x+ex*Math.cos(ROT)-ey*Math.sin(ROT);
        const qy=p.y+ex*Math.sin(ROT)+ey*Math.cos(ROT);
        ctx.fillStyle=ro.hue<.5
          ?`rgba(216, 200, 172, ${front?.95:.55})`
          :`rgba(186, 170, 148, ${front?.85:.45})`;
        ctx.beginPath();ctx.arc(qx,qy,ro.size,0,TAU);ctx.fill();
      }
    };
    for(const ro of p.rocks)ro.ang+=ro.spd*.016*(1+3*f);   // inner rocks race ahead (Kepler)
    ctx.strokeStyle=`rgba(190, 175, 220, ${Math.min(1,.5*(1+f*.6))})`;
    ctx.lineWidth=p.r*.18;
    ctx.beginPath();
    ctx.ellipse(p.x,p.y,p.r*1.9,p.r*.55,-.3,Math.PI,TAU);
    ctx.stroke();
    drawRocks(false);
    ctx.fillStyle=rg(ctx,p.x+p.r*.45,p.y-p.r*.45,p.r*.1,p.r*1.5,[[0,'#cfa87e'],[.5,'#8a6650'],[1,'#2a1c28']]);
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill();
    ctx.save();
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.clip();
    ctx.fillStyle='rgba(60, 40, 60, 0.30)';
    ctx.fillRect(p.x-p.r,p.y-p.r*.15,p.r*2,p.r*.22);
    ctx.fillRect(p.x-p.r,p.y+p.r*.35,p.r*2,p.r*.16);
    // storm ovals riding the bands — their drift IS the planet's rotation
    const lon=t*.05+p.x2;
    [[0,-.04,.20,.10,'rgba(90, 55, 75, 0.55)'],[.55,.42,.13,.07,'rgba(225, 195, 160, 0.45)']]
    .forEach(([off,band,rx,ry,col])=>{
      const u=((lon+off)%1+1)%1;
      const edge=Math.max(0,1-Math.abs(u*2-1));
      if(edge<=.05)return;
      ctx.fillStyle=col;
      ctx.beginPath();
      ctx.ellipse(p.x+(u*2-1)*p.r*1.25,p.y+band*p.r,p.r*rx*(.4+edge*.6),p.r*ry,0,0,TAU);
      ctx.fill();
    });
    ctx.restore();
    ctx.strokeStyle=`rgba(210, 195, 235, ${Math.min(1,.65*(1+f*.6))})`;
    ctx.lineWidth=p.r*.18;
    ctx.beginPath();
    ctx.ellipse(p.x,p.y,p.r*1.9,p.r*.55,-.3,0,Math.PI);
    ctx.stroke();
    drawRocks(true);
  }
  function drawEarth(t,dt){
    const e=EARTH;
    // clicked → the globe spins up (clouds ride along) and the aurora surges
    const f=clickEnv(e.boostT,t,3);
    if(f>0)e.x2+=dt*.10*f;             // extra longitude accumulates: no jump
    const spin=t*.022+e.x2;
    // unit vector toward the Sun — every light/shadow on the globe follows it
    const sdx=SUN.x-e.x,sdy=SUN.y-e.y,sdm=Math.hypot(sdx,sdy);
    const ux=sdx/sdm,uy=sdy/sdm;
    ctx.fillStyle=rg(ctx,e.x,e.y,e.r*.92,e.r*1.5,[[0,'rgba(110, 180, 255, 0.30)'],[.6,'rgba(90, 150, 255, 0.10)'],[1,'rgba(80, 140, 255, 0)']]);
    ctx.beginPath();ctx.arc(e.x,e.y,e.r*1.5,0,TAU);ctx.fill();
    ctx.save();
    ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,TAU);ctx.clip();
    // Ocean — brightest where the Sun hits
    ctx.fillStyle=rg(ctx,e.x+ux*e.r*.35,e.y+uy*e.r*.35,e.r*.1,e.r*1.8,[[0,'#3f8edb'],[.5,'#1d5fa8'],[1,'#0c2c60']]);
    ctx.fillRect(e.x-e.r,e.y-e.r,e.r*2,e.r*2);
    ctx.fillStyle='#3e8a4a';
    for(const[lon,lat,w,h]of e.land){
      const u=((lon+spin)%1+1)%1;
      const px=e.x+(u*2-1)*e.r*1.35;
      const py=e.y+lat*e.r*.62;
      const edgeFade=Math.max(0,1-Math.abs(u*2-1));
      if(edgeFade<=.05)continue;
      ctx.beginPath();
      ctx.ellipse(px,py,w*e.r*(.4+edgeFade*.6),h*e.r,lat*.4,0,TAU);
      ctx.fill();
    }
    ctx.fillStyle='rgba(235, 245, 255, 0.85)';
    ctx.beginPath();ctx.ellipse(e.x,e.y-e.r*.92,e.r*.55,e.r*.22,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(e.x,e.y+e.r*.95,e.r*.45,e.r*.18,0,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(255, 255, 255, 1)';
    for(const cl of e.clouds){
      const u=((cl.lon+spin*1.5)%1+1)%1;
      const px=e.x+(u*2-1)*e.r*1.35;
      const py=e.y+cl.lat*e.r*.6;
      const edgeFade=Math.max(0,1-Math.abs(u*2-1));
      if(edgeFade<=.05)continue;
      ctx.globalAlpha=cl.a*edgeFade;
      ctx.beginPath();ctx.ellipse(px,py,cl.w*e.r,cl.h*e.r,.2,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Night-side terminator — shadow on the hemisphere facing away from the Sun
    ctx.fillStyle=rg(ctx,e.x+ux*e.r*.4,e.y+uy*e.r*.4,e.r*.6,e.r*2.1,[[0,'rgba(4, 8, 24, 0)'],[.62,'rgba(4, 8, 24, 0)'],[1,'rgba(4, 8, 24, 0.85)']]);
    ctx.fillRect(e.x-e.r,e.y-e.r,e.r*2,e.r*2);
    // City lights twinkling through the night-side darkness (flaring on click)
    for(const ct of e.cities){
      const sunward=ct[0]*ux+ct[1]*uy;
      if(sunward>-.15)continue;
      const tw=.55+.45*Math.sin(t*2.2+ct[2]);
      ctx.fillStyle=`rgba(255, 214, 120, ${Math.min(1,(.45+.4*tw)*Math.min(1,-sunward*4)*(1+f*1.2))})`;
      const cs=1.4+f*1.2;
      ctx.fillRect(e.x+ct[0]*e.r,e.y+ct[1]*e.r,cs,cs);
    }
    ctx.restore();
    // Crisp sunlit rim on the side facing the Sun
    const sunAng=Math.atan2(uy,ux);
    ctx.strokeStyle='rgba(190, 225, 255, 0.55)';
    ctx.lineWidth=1.4;
    ctx.beginPath();ctx.arc(e.x,e.y,e.r,sunAng-.7,sunAng+.7);ctx.stroke();
    // Aurora — a compact, vivid glow hugging the north pole
    const auA=(.30+.16*Math.sin(t*1.1))*(1+f*1.6);
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=rg(ctx,e.x,e.y-e.r*1.0,0,e.r*.45,[[0,`rgba(110, 255, 170, ${auA*.4})`],[1,'rgba(110, 255, 170, 0)']]);
    ctx.beginPath();ctx.arc(e.x,e.y-e.r*1.0,e.r*.45,0,TAU);ctx.fill();
    ctx.lineCap='round';
    for(let i=0;i<3;i++){
      const rr=e.r*(1.04+i*.05);
      const wob=Math.sin(t*(1.3+i*.4)+i*2)*.04;
      ctx.strokeStyle=i===2
        ?`rgba(245, 150, 230, ${auA*.5})`
        :`rgba(110, 255, 170, ${auA*(1-i*.2)})`;
      ctx.lineWidth=1.6-i*.35;
      ctx.beginPath();
      ctx.arc(e.x,e.y,rr,Math.PI*(1.34+wob),Math.PI*(1.66+wob));
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawEarthOrbiters(t,behind){
    const e=EARTH;
    for(const o of EARTH_ORBITERS){
      const a=t*o.spd+o.phase+lapExtra(o,t);   // clicked → one quick extra lap
      const s=Math.sin(a);
      if((s<0)!==behind)continue;          // s<0 → far side of the orbit
      const px=e.x+Math.cos(a)*e.r*o.rx;
      const py=e.y+s*e.r*o.ry-e.r*.55;
      const depth=.85+.15*s;
      if(o.kind==='moon')drawMoon(px,py,e.r*o.size*depth,behind);
      else drawMiniSat(px,py,e.r*o.size*depth,a,behind);
    }
  }
  function drawMoon(px,py,mr,behind){
    ctx.save();
    if(behind)ctx.globalAlpha=.85;
    // the lit side always faces the Sun — that's where moonlight comes from
    const dx=SUN.x-px,dy=SUN.y-py,dm=Math.hypot(dx,dy);
    const ux=dx/dm,uy=dy/dm;
    ctx.fillStyle=rg(ctx,px+ux*mr*.45,py+uy*mr*.45,mr*.1,mr*1.6,[[0,'#E8E4DC'],[.55,'#A8A49C'],[1,'#54504C']]);
    ctx.beginPath();ctx.arc(px,py,mr,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(60, 58, 55, 0.35)';
    ctx.beginPath();ctx.arc(px-mr*.30,py-mr*.15,mr*.22,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(px+mr*.25,py+mr*.30,mr*.16,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(px+mr*.15,py-mr*.40,mr*.12,0,TAU);ctx.fill();
    // phase shadow creeping in from the side away from the Sun
    ctx.beginPath();ctx.arc(px,py,mr,0,TAU);ctx.clip();
    ctx.fillStyle='rgba(8, 10, 20, 0.55)';
    ctx.beginPath();ctx.arc(px-ux*mr*.9,py-uy*mr*.9,mr*1.05,0,TAU);ctx.fill();
    ctx.restore();
  }
  function drawMiniSat(px,py,s,a,behind){
    ctx.save();
    if(behind)ctx.globalAlpha=.8;
    ctx.translate(px,py);
    ctx.rotate(Math.cos(a)*.5);
    ctx.fillStyle='#1A4888';
    ctx.strokeStyle='#2E6AB4';
    ctx.lineWidth=.8;
    ctx.fillRect(-s,-s*.22,s*.7,s*.44);
    ctx.strokeRect(-s,-s*.22,s*.7,s*.44);
    ctx.fillRect(s*.3,-s*.22,s*.7,s*.44);
    ctx.strokeRect(s*.3,-s*.22,s*.7,s*.44);
    ctx.fillStyle='#A8B4C0';
    ctx.fillRect(-s*.3,-s*.3,s*.6,s*.6);
    ctx.fillStyle='#58687A';
    ctx.fillRect(-s*.3,s*.05,s*.6,s*.14);
    ctx.fillStyle=`rgba(255, 90, 90, ${.35+.6*Math.abs(Math.sin(a*3))})`;
    ctx.beginPath();ctx.arc(0,-s*.45,s*.10+.6,0,TAU);ctx.fill();
    ctx.restore();
  }
  function drawTravelers(t){
    for(let i=0;i<TRAVELERS.length;i++){
      const s=TRAVELERS[i];
      const g=bhPull(s,.5);
      if(g<0){TRAVELERS[i]=spawnTraveler(false);continue;}
      bodyPull(s,EARTH.x,EARTH.y,EARTH.r,.05);
      bodyPull(s,PLANET.x,PLANET.y,PLANET.r,.05);
      s.x+=s.vx;s.y+=s.vy;
      if(s.x<-20||s.x>W+20||s.y<-20||s.y>H+20){TRAVELERS[i]=spawnTraveler(false);continue;}
      const tw=.55+.45*Math.sin(t*s.spd+s.tw);
      const trail=6+s.r*5;
      ctx.globalAlpha=g;
      ctx.strokeStyle=starColor(s.hue,.25*tw);
      ctx.lineWidth=s.r*.8;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-s.vx*trail,s.y-s.vy*trail);ctx.stroke();
      ctx.fillStyle=starColor(s.hue,.16*tw);
      ctx.beginPath();ctx.arc(s.x,s.y,s.r*2.6,0,TAU);ctx.fill();
      ctx.fillStyle=starColor(s.hue,.5+.5*tw);
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function drawComets(t,dt){
    for(let i=0;i<COMETS.length;i++){
      const cm=COMETS[i];
      if(cm.delay>0){cm.delay-=dt;continue;}
      const g=bhPull(cm,.9);
      if(g<0){COMETS[i]=spawnComet(false);continue;}
      bodyPull(cm,EARTH.x,EARTH.y,EARTH.r,.09);
      bodyPull(cm,PLANET.x,PLANET.y,PLANET.r,.09);
      cm.x+=cm.vx;cm.y+=cm.vy;
      if(cm.x<-150||cm.x>W+150||cm.y<-150||cm.y>H+150){COMETS[i]=spawnComet(false);continue;}
      // a comet's tail always points AWAY from the Sun — not behind its motion
      const sx=cm.x-SUN.x,sy=cm.y-SUN.y,sm=Math.hypot(sx,sy);
      const tx=cm.x+(sx/sm)*cm.len;
      const ty=cm.y+(sy/sm)*cm.len;
      ctx.globalAlpha=g;
      ctx.strokeStyle=lg(ctx,cm.x,cm.y,tx,ty,[[0,'rgba(235, 245, 255, 0.9)'],[1,'rgba(140, 170, 255, 0)']]);
      ctx.lineWidth=1.6;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(cm.x,cm.y);ctx.lineTo(tx,ty);ctx.stroke();
      ctx.fillStyle='rgba(255, 255, 255, 0.95)';
      ctx.beginPath();ctx.arc(cm.x,cm.y,1.8,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function diskColor(d,a){
    const f=(d-BH.r*1.4)/(BH.r*2.7);
    if(f<.18)return`rgba(255, 248, 235, ${a})`;
    if(f<.45)return`rgba(255, 200, 120, ${a})`;
    if(f<.75)return`rgba(255, 140, 70, ${a})`;
    return`rgba(200, 80, 60, ${a})`;
  }
  function drawBlackHole(t){
    const{x,y,r,tilt}=BH;
    // clicked → a few seconds of feeding frenzy: everything spins, glows, races
    const fz=clickEnv(bhFrenzyT,t,3.5);
    const spin=1+2*fz;
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const breathe=(1+Math.sin(t*.5)*.04)*(1+fz*.25);
    ctx.fillStyle=rg(ctx,x,y,r,r*5.2*breathe,[[0,`rgba(255, 170, 90, ${.14*(1+fz)})`],[.4,`rgba(255, 120, 60, ${.06*(1+fz)})`],[1,'rgba(255, 100, 50, 0)']]);
    ctx.beginPath();ctx.arc(x,y,r*5.2*breathe,0,TAU);ctx.fill();
    // Accretion disk: BACK half (lensed up over the shadow)
    ctx.save();
    ctx.translate(x,y);
    for(const p of DISK_PARTICLES){
      p.ang+=p.spd*.016*spin;
      const ca=Math.cos(p.ang),sa=Math.sin(p.ang);
      if(sa>=0)continue;
      const px=ca*p.d;
      const py=sa*p.d*tilt-Math.max(0,(1-Math.abs(ca))*r*.55);
      const flick=.6+.4*Math.sin(t*3+p.jitter);
      const beam=.55+.45*Math.max(0,-ca);
      ctx.fillStyle=diskColor(p.d,Math.min(1,.5*flick*beam*(1+fz*.6)));
      ctx.beginPath();ctx.arc(px,py,p.size,0,TAU);ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle='rgba(255, 215, 150, 0.35)';
    ctx.lineWidth=r*.16;
    ctx.beginPath();ctx.ellipse(x,y,r*1.28,r*1.22,0,Math.PI*1.06,Math.PI*1.94);ctx.stroke();
    ctx.globalCompositeOperation='source-over';
    // The shadow itself
    ctx.fillStyle='#000000';
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
    ctx.globalCompositeOperation='lighter';
    // Photon ring
    const ringPulse=(.8+.2*Math.sin(t*1.3))*(1+fz*.5);
    ctx.strokeStyle=`rgba(255, 240, 215, ${Math.min(1,.85*ringPulse)})`;
    ctx.lineWidth=r*.045;
    ctx.beginPath();ctx.arc(x,y,r*1.03,0,TAU);ctx.stroke();
    ctx.strokeStyle=`rgba(255, 180, 110, ${Math.min(1,.30*ringPulse)})`;
    ctx.lineWidth=r*.13;
    ctx.beginPath();ctx.arc(x,y,r*1.07,0,TAU);ctx.stroke();
    // Accretion disk: FRONT half
    ctx.save();
    ctx.translate(x,y);
    for(const p of DISK_PARTICLES){
      const ca=Math.cos(p.ang),sa=Math.sin(p.ang);
      if(sa<0)continue;
      const flick=.6+.4*Math.sin(t*3+p.jitter);
      const beam=.55+.45*Math.max(0,-ca);
      ctx.fillStyle=diskColor(p.d,Math.min(1,.75*flick*beam*(1+fz*.6)));
      ctx.beginPath();ctx.arc(ca*p.d,sa*p.d*tilt,p.size*1.15,0,TAU);ctx.fill();
    }
    ctx.restore();
    // Matter spiraling in
    ctx.save();
    ctx.translate(x,y);
    for(const m of INFALL){
      m.ang+=m.spd*.016*spin;
      m.d-=m.decay*(1+2.5*fz);
      if(m.d<r*1.05){m.d=r*(2.4+Math.random()*2.2);m.ang=Math.random()*TAU;}
      const px=Math.cos(m.ang)*m.d;
      const py=Math.sin(m.ang)*m.d*(tilt+.25);
      const closeness=1-(m.d-r)/(r*3.5);
      ctx.fillStyle=`rgba(255, ${190+closeness*60|0}, ${130+closeness*100|0}, ${.3+closeness*.55})`;
      ctx.beginPath();ctx.arc(px,py,1+closeness*1.4,0,TAU);ctx.fill();
      ctx.strokeStyle=`rgba(255, 200, 140, ${.12+closeness*.2})`;
      ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(px,py);
      ctx.lineTo(Math.cos(m.ang-.22)*m.d,Math.sin(m.ang-.22)*m.d*(tilt+.25));
      ctx.stroke();
    }
    ctx.restore();
    // Relativistic jets — twin beams + plasma blobs racing out of the poles
    const jetA=(.07+.04*Math.sin(t*.8))*(1+fz*1.2);
    for(const dir of[-1,1]){
      ctx.fillStyle=lg(ctx,x,y,x,y+dir*r*6,[[0,`rgba(170, 200, 255, ${jetA*2})`],[.5,`rgba(140, 170, 255, ${jetA})`],[1,'rgba(120, 150, 255, 0)']]);
      ctx.beginPath();
      ctx.moveTo(x-r*.16,y);
      ctx.lineTo(x-r*.55,y+dir*r*6);
      ctx.lineTo(x+r*.55,y+dir*r*6);
      ctx.lineTo(x+r*.16,y);
      ctx.closePath();ctx.fill();
    }
    for(const j of JETS){
      j.t+=j.spd*.016*(1+1.5*fz);
      if(j.t>=1){j.t=0;j.off=Math.random()*2-1;j.spd=.35+Math.random()*.55;}
      const half=r*(.16+.39*j.t);
      const px=x+j.off*half*.85;
      const py=y+j.dir*(r*.25+j.t*r*5.75);
      const a=Math.max(0,(1-j.t)*(.55+.3*Math.sin(t*4+j.off*9)));
      const sz=j.size*(1.1-j.t*.55);
      ctx.strokeStyle=`rgba(160, 195, 255, ${a*.45})`;
      ctx.lineWidth=sz*.7;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py-j.dir*(5+sz*4));ctx.stroke();
      ctx.fillStyle=`rgba(200, 222, 255, ${a})`;
      ctx.beginPath();ctx.arc(px,py,sz,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  // ── The doomed astronaut — caught by the black hole's gravity, spirals
  //    faster and faster, stretches (spaghettification!) and falls in ──
  function drawAstronaut(g,s){
    g.fillStyle='#9aa6b4';                                  // backpack
    g.fillRect(-s*.62,-s*.34,s*.3,s*.72);
    g.fillStyle='#e8edf2';                                  // suit body
    g.beginPath();g.ellipse(0,s*.12,s*.34,s*.46,0,0,TAU);g.fill();
    g.strokeStyle='#e8edf2';g.lineWidth=s*.18;g.lineCap='round';
    g.beginPath();                                          // arms, flailing
    g.moveTo(-s*.1,-s*.05);g.quadraticCurveTo(-s*.5,-s*.3,-s*.62,-s*.55);
    g.moveTo(s*.1,0);g.quadraticCurveTo(s*.5,s*.15,s*.6,s*.42);
    g.stroke();
    g.beginPath();                                          // legs
    g.moveTo(-s*.12,s*.5);g.lineTo(-s*.2,s*.95);
    g.moveTo(s*.12,s*.5);g.lineTo(s*.26,s*.92);
    g.stroke();
    g.fillStyle='#f2f6fa';                                  // helmet
    g.beginPath();g.arc(0,-s*.5,s*.30,0,TAU);g.fill();
    g.fillStyle='#1a2a40';                                  // visor
    g.beginPath();g.arc(s*.05,-s*.5,s*.20,0,TAU);g.fill();
    g.fillStyle='rgba(255,255,255,.7)';
    g.beginPath();g.arc(0,-s*.56,s*.06,0,TAU);g.fill();
  }
  function drawAstro(t){
    if(!ASTRO)return;
    const p=(t-ASTRO.t0)/6.5;
    if(p>=1){ASTRO=null;return;}
    const ease=p*p;                                         // accelerating infall
    const d=BH.r*(5.2-4.25*ease);                           // ends just at the horizon
    const ang=ASTRO.ang0+ASTRO.dir*(p*3+ease*10);           // ever-faster spiral
    const x=BH.x+Math.cos(ang)*d;
    const y=BH.y+Math.sin(ang)*d*.8;
    const sc=Math.min(W,H)*.018*(1-.4*ease);
    const fade=p>.92?(1-p)/.08:1;
    ctx.save();
    ctx.translate(x,y);
    if(p<.78)ctx.rotate(ASTRO.dir*(t-ASTRO.t0)*4);          // tumbling helplessly
    else{                                                   // spaghettification!
      ctx.rotate(Math.atan2(BH.y-y,BH.x-x));
      const st=1+(p-.78)*9;
      ctx.scale(st,Math.max(.45,1-(p-.78)*2));
    }
    ctx.globalAlpha=fade;
    drawAstronaut(ctx,sc);
    ctx.restore();
    ctx.globalAlpha=1;
  }

  // Supernova — ported from success_screens/success-supernova.js:
  // the star collapses (infall streaks, brightening core), then explodes —
  // soft flash, expanding shockwaves, a colored nebula, ejecta + ignited
  // stardust, and a twinkling pulsar remnant.
  function hexA(hex,a){
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return`rgba(${r},${g},${b},${a})`;
  }
  function easeOutCubic(x){return 1-Math.pow(1-x,3);}
  function buildNova(s,t){
    const unit=Math.min(W,H)/800,maxR=Math.min(W,H)*.24;
    const glow='#7DC4FF',primary='#C77DFF',accent='#FFD27D';
    const DUR=5,TE=1.4;
    const inf=Array.from({length:22},()=>{
      const born=Math.random()*TE*.5;
      return{ang:Math.random()*TAU,r0:(60+Math.random()*110)*unit,born,life:TE-born,w:.8+Math.random()*1.2};
    });
    const ecolors=[glow,primary,accent,'#FFFFFF','#FFFFFF'];
    const ej=Array.from({length:54},(_,j)=>({
      ang:Math.random()*TAU,speed:.25+Math.pow(Math.random(),1.5)*.75,
      life:(DUR-TE)*.9*(.7+Math.random()*.3),size:(1+Math.random()*2)*unit,
      streak:Math.random()<.3,color:ecolors[j%5]}));
    const ncolors=[primary,accent,glow,primary];
    const neb=Array.from({length:4},(_,k)=>({
      dx:(Math.random()-.5)*60*unit,dy:(Math.random()-.5)*60*unit,
      baseR:(30+Math.random()*36)*unit,color:ncolors[k]}));
    const dcolors=['#FFFFFF','#FFFFFF',glow,accent];
    const dust=Array.from({length:18},(_,di)=>{
      const dd=maxR*(.12+Math.random()*.45);
      const dq=1-Math.pow(1-dd/(maxR*1.05),1/3);
      return{x:s.x+Math.cos(Math.random()*TAU)*dd,y:s.y+Math.sin(Math.random()*TAU)*dd,
             arr:TE+dq*(DUR-TE)*.7,r:(0.8+Math.random()*1.4)*unit,tw:Math.random()*6.28,color:dcolors[di%4]};
    });
    return{x:s.x,y:s.y,start:t,star:s,unit,maxR,DUR,TE,inf,ej,neb,dust,glow,primary,accent};
  }
  function drawNova(t){
    if(!nova){
      if(t>nextNovaAt&&STARS_NEAR.length)
        nova=buildNova(STARS_NEAR[(Math.random()*STARS_NEAR.length)|0],t);
      return;
    }
    const n=nova,e=t-n.start;
    if(e>=n.DUR){
      n.star.x=Math.random()*W;n.star.y=Math.random()*H;
      nova=null;nextNovaAt=t+75+Math.random()*75;
      return;
    }
    const{x,y,unit,maxR,TE,DUR,glow,primary,accent}=n;
    const gFade=Math.min(1,(DUR-e)/.3);
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    if(e<TE){
      // ── collapse: matter streaks race inward, the core charges up ──
      const charge=e/TE;
      ctx.lineCap='round';
      for(let i=0;i<n.inf.length;i++){
        const f=n.inf[i];
        const fq=Math.max(0,Math.min(1,(e-f.born)/f.life));
        if(fq<=0||fq>=1)continue;
        const fr=f.r0*(1-fq*fq);
        const fx=x+Math.cos(f.ang)*fr,fy=y+Math.sin(f.ang)*fr;
        const len=(10+16*fq)*unit;
        ctx.strokeStyle=hexA(i%2?glow:'#FFFFFF',fq*.8);
        ctx.lineWidth=f.w;
        ctx.beginPath();
        ctx.moveTo(fx,fy);
        ctx.lineTo(x+Math.cos(f.ang)*(fr+len),y+Math.sin(f.ang)*(fr+len));
        ctx.stroke();
      }
      const swell=charge>.85?1+(charge-.85)*4:1;
      const cr=(4+8*charge)*unit*swell*(1+.12*charge*Math.sin(t*20*(1+2*charge)));
      ctx.fillStyle=rg(ctx,x,y,0,cr*6,[[0,`rgba(255,255,255,${.5+.5*charge})`],[.3,hexA(accent,.5*charge+.2)],[1,hexA(accent,0)]]);
      ctx.beginPath();ctx.arc(x,y,cr*6,0,TAU);ctx.fill();
      ctx.fillStyle='#FFFFFF';
      ctx.beginPath();ctx.arc(x,y,cr,0,TAU);ctx.fill();
    }else{
      // ── after the blast ──
      const te=e-TE;
      // expanding nebula blobs
      const nq=Math.min(1,te/(DUR-TE));
      const na=Math.sin(Math.PI*nq)*.20;
      for(const nb of n.neb){
        const nx=x+nb.dx*(1+nq*2),ny=y+nb.dy*(1+nq*2),nr=nb.baseR+nq*maxR*.30;
        ctx.fillStyle=rg(ctx,nx,ny,0,nr,[[0,hexA(nb.color,na*gFade)],[1,hexA(nb.color,0)]]);
        ctx.beginPath();ctx.arc(nx,ny,nr,0,TAU);ctx.fill();
      }
      // two shockwaves, the second chasing the first
      for(const off of[0,.3]){
        const ste=te-off;
        if(ste<0)continue;
        const sq=Math.min(1,ste/((DUR-TE)*.75));
        if(sq>=1)continue;
        const sr=maxR*1.05*easeOutCubic(sq),sa=(1-sq)*gFade;
        ctx.strokeStyle=hexA(glow,.22*sa);
        ctx.lineWidth=(12*(1-sq)+4)*unit;
        ctx.beginPath();ctx.arc(x,y,sr,0,TAU);ctx.stroke();
        ctx.strokeStyle=`rgba(255,255,255,${.7*sa})`;
        ctx.lineWidth=1.6;
        ctx.beginPath();ctx.arc(x,y,sr,0,TAU);ctx.stroke();
      }
      // stardust igniting as the shock sweeps past
      for(const d of n.dust){
        const da=Math.max(0,Math.min(1,(e-d.arr)/.22));
        if(da<=0)continue;
        ctx.fillStyle=hexA(d.color,da*(.45+.4*Math.sin(t*10+d.tw))*gFade);
        ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,TAU);ctx.fill();
      }
      // ejecta — dots and energy streaks
      ctx.lineCap='round';
      for(const ee of n.ej){
        const eq=Math.min(1,te/ee.life);
        if(eq>=1)continue;
        const ed=ee.speed*maxR*easeOutCubic(eq);
        const ex=x+Math.cos(ee.ang)*ed,ey=y+Math.sin(ee.ang)*ed;
        const ea=(1-eq)*gFade;
        if(ee.streak){
          const sl=(16*(1-eq)+4)*unit;
          ctx.strokeStyle=hexA(ee.color,.85*ea);
          ctx.lineWidth=ee.size;
          ctx.beginPath();
          ctx.moveTo(ex,ey);
          ctx.lineTo(ex-Math.cos(ee.ang)*sl,ey-Math.sin(ee.ang)*sl);
          ctx.stroke();
        }else{
          ctx.fillStyle=hexA(ee.color,.9*ea);
          ctx.beginPath();ctx.arc(ex,ey,ee.size*(1-eq*.5),0,TAU);ctx.fill();
        }
      }
      // the soft flash, decaying fast
      const fa=.4*Math.exp(-te/.18)*gFade;
      if(fa>.01){
        ctx.fillStyle=rg(ctx,x,y,0,maxR*2.4,[[0,`rgba(255,255,255,${fa})`],[.35,hexA(accent,fa*.5)],[1,hexA(accent,0)]]);
        ctx.beginPath();ctx.arc(x,y,maxR*2.4,0,TAU);ctx.fill();
      }
      // the pulsar remnant, twinkling with a cross-flare
      const pa=Math.max(0,Math.min(1,(te-.25)/.3))*gFade;
      if(pa>0){
        const prr=(3+Math.sin(t*15)*1.2)*unit;
        ctx.fillStyle=rg(ctx,x,y,0,prr*6,[[0,`rgba(255,255,255,${.9*pa})`],[.4,hexA(glow,.5*pa)],[1,hexA(glow,0)]]);
        ctx.beginPath();ctx.arc(x,y,prr*6,0,TAU);ctx.fill();
        ctx.fillStyle=`rgba(255,255,255,${pa})`;
        ctx.beginPath();ctx.arc(x,y,prr,0,TAU);ctx.fill();
        const fl=prr*(5+2*Math.sin(t*15));
        ctx.strokeStyle=`rgba(255,255,255,${.6*pa})`;
        ctx.lineWidth=1.2;
        ctx.beginPath();
        ctx.moveTo(x-fl,y);ctx.lineTo(x+fl,y);
        ctx.moveTo(x,y-fl);ctx.lineTo(x,y+fl);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // The Sun — an enormous disc parked below the screen; only its limb shows.
  // Alive: boiling granulation, swelling prominence loops, scheduled flares.
  function drawSun(t){
    const s=SUN;
    const breathe=1+Math.sin(t*.6)*.012;
    ctx.fillStyle=rg(ctx,s.x,s.y,s.r*.97,s.r*1.4*breathe,[[0,'rgba(255, 214, 120, 0.50)'],[.25,'rgba(255, 170, 80, 0.20)'],[.6,'rgba(255, 130, 60, 0.07)'],[1,'rgba(255, 110, 50, 0)']]);
    ctx.fillRect(0,H*.4,W,H*.6);
    ctx.fillStyle=rg(ctx,s.x,s.y,s.r*.93,s.r,[[0,'#FFF6D8'],[.82,'#FFE092'],[1,'#FFBE55']]);
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.fill();
    // boiling granulation drifting along the limb
    ctx.save();
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.clip();
    for(let i=0;i<10;i++){
      const ga=-Math.PI/2+(i/9-.5)*.85+Math.sin(t*.12+i*1.7)*.025;
      const grr=s.r*(.965-(i%3)*.018);
      const gx=s.x+Math.cos(ga)*grr,gy=s.y+Math.sin(ga)*grr;
      ctx.fillStyle=`rgba(255, ${150+(i%3)*25}, ${60+(i%2)*30}, ${.10+.07*Math.sin(t*1.3+i*2.1)})`;
      ctx.beginPath();
      ctx.ellipse(gx,gy,s.r*.05,s.r*.022,ga+Math.PI/2,0,TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.lineCap='round';
    // small dancing prominences
    for(let i=0;i<4;i++){
      const ang=-Math.PI/2+[-.16,-.065,.05,.14][i];
      const flick=.55+.45*Math.sin(t*2.1+i*2.7);
      const bx=s.x+Math.cos(ang)*s.r;
      const by=s.y+Math.sin(ang)*s.r;
      const h=(9+i*5)*flick+7;
      ctx.strokeStyle=`rgba(255, 185, 90, ${.30*flick+.12})`;
      ctx.lineWidth=2.6;
      ctx.beginPath();
      ctx.moveTo(bx-9,by+2);
      ctx.quadraticCurveTo(bx,by-h*2,bx+9,by+2);
      ctx.stroke();
    }
    // two grand prominence LOOPS that slowly swell and sink back
    for(const[la,lph]of[[-.11,0],[.09,2.4]]){
      const ang=-Math.PI/2+la;
      const grow=.35+.65*Math.max(0,Math.sin(t*.25+lph));
      if(grow<.4)continue;
      const bx=s.x+Math.cos(ang)*s.r,by=s.y+Math.sin(ang)*s.r;
      ctx.save();
      ctx.translate(bx,by);
      ctx.rotate(ang+Math.PI/2);
      ctx.strokeStyle=`rgba(255, 170, 80, ${.28*grow})`;
      ctx.lineWidth=3.2;
      ctx.beginPath();
      ctx.ellipse(0,0,20*grow+8,34*grow+8,0,Math.PI,TAU);
      ctx.stroke();
      ctx.strokeStyle=`rgba(255, 220, 150, ${.18*grow})`;
      ctx.lineWidth=1.4;
      ctx.beginPath();
      ctx.ellipse(0,0,(20*grow+8)*.8,(34*grow+8)*.85,0,Math.PI,TAU);
      ctx.stroke();
      ctx.restore();
    }
    // scheduled solar flare — a bright burst with rays, every ~½–1 min
    if(nextSunFlareAt==null)nextSunFlareAt=t+12+Math.random()*25;
    if(sunFlareT==null&&t>=nextSunFlareAt){
      sunFlareT=t;
      sunFlareAng=-Math.PI/2+(Math.random()-.5)*.7;
      nextSunFlareAt=t+30+Math.random()*40;
    }
    if(sunFlareT!=null){
      const fe=(t-sunFlareT)/2.2;
      if(fe>=1)sunFlareT=null;
      else{
        const fa=Math.sin(Math.PI*fe);
        const fx=s.x+Math.cos(sunFlareAng)*s.r,fy=s.y+Math.sin(sunFlareAng)*s.r;
        ctx.fillStyle=rg(ctx,fx,fy,0,60+fe*80,[[0,`rgba(255,240,200,${.55*fa})`],[.4,`rgba(255,180,90,${.25*fa})`],[1,'rgba(255,160,70,0)']]);
        ctx.beginPath();ctx.arc(fx,fy,60+fe*80,0,TAU);ctx.fill();
        ctx.strokeStyle=`rgba(255,230,170,${.6*fa})`;
        ctx.lineWidth=1.4;
        for(let q=0;q<5;q++){
          const sa=sunFlareAng+(q-2)*.22;
          const L=(26+fe*46)*(1-Math.abs(q-2)*.18);
          ctx.beginPath();
          ctx.moveTo(fx+Math.cos(sa)*6,fy+Math.sin(sa)*6);
          ctx.lineTo(fx+Math.cos(sa)*L,fy+Math.sin(sa)*L);
          ctx.stroke();
        }
      }
    }
  }
  // Discovery mode — smallest / most specific targets first; first hit wins
  function orbiterPos(o){
    const a=lastT*o.spd+o.phase+(o.lapT0!=null?TAU*Math.min(1,(lastT-o.lapT0)/2.2):0);
    return{
      x:EARTH.x+Math.cos(a)*EARTH.r*o.rx,
      y:EARTH.y+Math.sin(a)*EARTH.r*o.ry-EARTH.r*.55,
    };
  }
  function hitTargets(){
    const t=[];
    const moon=orbiterPos(EARTH_ORBITERS[0]);
    t.push({x:moon.x,y:moon.y,r:EARTH.r*.8,name:'הַיָּרֵחַ',kind:'orbiter',o:EARTH_ORBITERS[0],
            fact:'הַיָּרֵחַ לֹא מֵאִיר בְּעַצְמוֹ — הוּא מַחְזִיר אֵלֵינוּ אֶת אוֹר הַשֶּׁמֶשׁ. שִׂימוּ לֵב שֶׁהַצַּד הַמּוּאָר שֶׁלּוֹ תָּמִיד פּוֹנֶה לַשֶּׁמֶשׁ!'});
    for(const o of EARTH_ORBITERS.slice(1)){
      const sp=orbiterPos(o);
      t.push({x:sp.x,y:sp.y,r:EARTH.r*.7,name:'לַוְיָן',kind:'orbiter',o,
              fact:'לַוְיָנִים מַקִּיפִים אֶת כַּדּוּר הָאָרֶץ וּמְבִיאִים לָנוּ אִינְטֶרְנֶט, טֵלֵוִיזְיָה וְנִוּוּט.'});
    }
    if(nova)t.push({x:nova.x,y:nova.y,r:70,name:'סוּפֶּרְנוֹבָה',
            fact:'פִּיצוּץ עֲנָקִי שֶׁל כּוֹכָב גָּדוֹל בְּסוֹף חַיָּיו — לְרֶגַע הוּא מַבְהִיק יוֹתֵר מִגָּלַקְסְיָה שְׁלֵמָה!'});
    for(const cm of COMETS)if(cm.delay<=0)
      t.push({x:cm.x,y:cm.y,r:40,name:'שָׁבִיט',
              fact:'כַּדּוּר שֶׁל קֶרַח וְאָבָק. שִׂימוּ לֵב — הַזָּנָב שֶׁלּוֹ תָּמִיד בּוֹרֵחַ מֵהַשֶּׁמֶשׁ!'});
    t.push({x:EARTH.x,y:EARTH.y-EARTH.r*1.1,r:EARTH.r*.45,name:'זֹהַר קוֹטְבִי',kind:'earth',
            fact:'אוֹרוֹת יְרֻקִּים רוֹקְדִים לְיַד הַקֹּטֶב — מַתָּנָה שֶׁל רוּחַ הַשֶּׁמֶשׁ שֶׁפּוֹגֶשֶׁת אֶת כַּדּוּר הָאָרֶץ.'});
    t.push({x:EARTH.x,y:EARTH.y,r:EARTH.r*1.15,name:'כַּדּוּר הָאָרֶץ',kind:'earth',
            fact:'הַבַּיִת שֶׁלָּנוּ! הוּא מִסְתּוֹבֵב כָּל הַזְּמַן — וְכָךְ נוֹצָרִים יוֹם וְלַיְלָה. רוֹאִים אֶת אוֹרוֹת הֶעָרִים בַּצַּד הֶחָשׁוּךְ?'});
    t.push({x:PLANET.x,y:PLANET.y,r:PLANET.r*2.2,name:'שַׁבְּתַאי',kind:'planet',
            fact:'כּוֹכַב לֶכֶת עִם טַבָּעוֹת יָפוֹת. רוֹאִים אֶת הָאֲבָנִים מִסְתּוֹבְבוֹת בָּהֶן? הַפְּנִימִיּוֹת מַקִּיפוֹת הֲכִי מַהֵר!'});
    t.push({x:BH.x,y:BH.y,r:BH.r*3.2,name:'חוֹר שָׁחוֹר',kind:'bh',
            fact:'הַכְּבִידָה שֶׁלּוֹ כָּל כָּךְ חֲזָקָה — שֶׁאֲפִלּוּ אוֹר לֹא מַצְלִיחַ לִבְרֹחַ מִמֶּנּוּ! מַה שֶּׁנּוֹפֵל פְּנִימָה, נֶעְלָם.'});
    for(const g of GALAXIES)
      t.push({x:g.x,y:g.y,r:g.scale*1.3,name:'גָּלַקְסְיָה',kind:'galaxy',g,
              fact:'עִיר עֲנָקִית שֶׁל מִילְיַארְדֵי כּוֹכָבִים. גַּם אֲנַחְנוּ גָּרִים בְּגָלַקְסְיָה — שְׁבִיל הֶחָלָב.'});
    for(const cn of CONSTELLATIONS)if(cn.hit)
      t.push({x:cn.hit.x,y:cn.hit.y,r:cn.hit.r,name:cn.name,fact:cn.fact});
    t.push({x:SUN.x,y:SUN.y,r:SUN.r*1.02,name:'הַשֶּׁמֶשׁ',
            fact:'כַּדּוּר אֵשׁ עֲנָקִי! מִילְיוֹן כַּדּוּרֵי אֶרֶץ יְכוֹלִים לְהִכָּנֵס בְּתוֹכָהּ — וְהִיא מְאִירָה אֶת כָּל מַה שֶּׁרוֹאִים כָּאן.'});
    return t;
  }
  // Clicks land on the game's layers, not the canvas — listen on the document
  // and react only to clicks on the bare sky (not the game UI / poppables)
  const skyClick=e=>{
    if(stopped)return;
    // a click on the game UI counts as "clicking elsewhere" — dismiss the fact
    if(e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov')){
      factEl.style.opacity='0';clearTimeout(factTimer);return;}
    const x=e.clientX,y=e.clientY;
    for(const tg of hitTargets()){
      if(Math.hypot(x-tg.x,y-tg.y)>tg.r)continue;
      // the object reacts in motion, alongside its discovery bubble
      if(tg.kind==='bh'){
        bhFrenzyT=lastT;
        // an unlucky astronaut drifts in, spirals around and falls past the horizon
        if(!ASTRO)ASTRO={t0:lastT,ang0:Math.random()*TAU,dir:Math.random()<.5?-1:1};
      }
      else if(tg.kind==='galaxy')tg.g.boostT=lastT;
      else if(tg.kind==='orbiter'&&tg.o.lapT0==null)tg.o.lapT0=lastT;
      else if(tg.kind==='earth'){
        EARTH.boostT=lastT;
        EARTH_ORBITERS.forEach(o=>{if(o.lapT0==null)o.lapT0=lastT;}); // everyone laps
      }
      else if(tg.kind==='planet')PLANET.boostT=lastT;
      factEl.innerHTML=`<b style="color:#FFD27D">${tg.name}</b><br>${tg.fact}`;
      factEl.style.opacity='1';
      // place the bubble OUTSIDE the animated object, so it never hides the show:
      // above it when there's room, otherwise below; orbiters clear the whole orbit
      const fw=290,fh=96;
      let ax=tg.x,ay=tg.y,effR;
      if(tg.kind==='orbiter'){ax=EARTH.x;ay=EARTH.y;effR=EARTH.r*3.1;}
      else if(tg.kind==='bh')effR=BH.r*2.4;
      else if(tg.kind==='galaxy')effR=tg.g.scale*1.5;
      else effR=Math.min(tg.r,170);
      let top=ay-effR-fh-12;
      if(top<8)top=ay+effR+12;
      top=Math.max(8,Math.min(H-fh-8,top));
      factEl.style.left=`${Math.max(8,Math.min(W-fw,ax-fw/2))}px`;
      factEl.style.top=`${top}px`;
      clearTimeout(factTimer);
      factTimer=setTimeout(()=>{factEl.style.opacity='0';},60000);   // stays a full minute
      return;
    }
    // a bright star under the click goes supernova
    if(!nova){
      for(const s of STARS_NEAR){
        if(Math.hypot(x-s.x,y-s.y)<=22){
          nova=buildNova(s,lastT);
          factEl.style.opacity='0';
          return;
        }
      }
    }
    // bare sky: a little meteor burst radiating from the click
    for(let i=0;i<6;i++){
      const s=TRAVELERS[(Math.random()*TRAVELERS.length)|0];
      const a=Math.random()*TAU,sp=1.6+Math.random()*2.2;
      s.x=x;s.y=y;s.vx=Math.cos(a)*sp;s.vy=Math.sin(a)*sp;
    }
    factEl.style.opacity='0';
  };
  document.addEventListener('click',skyClick);
  function onResize(){W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);buildScene();}
  window.addEventListener('resize',onResize);
  cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  buildScene();
  let animId=null,lastFrameT=0;
  function frame(ts){
    if(stopped)return;
    const t=ts/1000;
    const dt=Math.min(.05,t-lastFrameT);
    lastFrameT=t;lastT=t;
    ctx.drawImage(spaceLayer.cv,0,0,W,H);
    drawStars(t);
    drawNova(t);
    drawTravelers(t);
    for(const g of GALAXIES)drawGalaxy(g,t,dt);
    drawPlanet(t,dt);
    drawEarthOrbiters(t,true);   // far side of the orbits — behind the globe
    drawEarth(t,dt);
    drawEarthOrbiters(t,false);  // near side — in front
    drawComets(t,dt);
    drawBlackHole(t);
    drawAstro(t);
    ctx.drawImage(vigLayer.cv,0,0,W,H);
    drawSun(t);                  // brighter than any vignette haze
    animId=requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // the loader calls this when the background is switched away
  return function cleanup(){
    stopped=true;
    if(animId)cancelAnimationFrame(animId);
    window.removeEventListener('resize',onResize);
    document.removeEventListener('click',skyClick);
    factEl.style.opacity='0';
    stage.innerHTML='';
  };
  },
};
