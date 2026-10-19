/* ── "מֹאזְנַיִם" — equality as BALANCE ⚖️ (two kinds, one shared scale) ───────
   From the 2nd-grade workbook (pages 12-13): the "=" sign means BOTH SIDES ARE
   EQUAL, not "the answer comes next". Two kinds share one animated scale:

   TBE — הַשְׁלִימִי לְשִׁוְיוֹן:   __ + 15 = 12 + __    /    14 + __ = 16 + __
         Two blanks, ANY whole pair that balances is right (1+15=12+4,
         3+15=12+6 …). The card holds TWO rows with the same known numbers and
         the second pair must DIFFER from the first — "יֵשׁ הַרְבֵּה תְּשׁוּבוֹת",
         the workbook's point (the child's 1→4, 3→6, 2→5 shows the +3 pattern).
         Problem: { t:TBE, a:left known, b:right known, pos:'front'|'back' }
           front →  x + a = b + y        back →  a + x = b + y

   TSB — כַּפּוֹת הַמֹּאזְנַיִם:   four numbers (5 6 7 8) → __+__ = __+__
         Tap a number → it lands in the next free slot (tap a placed one to send
         it back); ✓ weighs the pans. The row is SHOWN in a random order
         (`order`, never sorted or mirrored), so the answer isn't always the
         1st+4th / 2nd+3rd positions. Generated as a<b<c<d with a+d = b+c —
         UNEVENLY spaced, often with a 0 (8 7 15 0, never 5 6 7 8) — so
         {a,d} | {b,c} is the ONLY balancing split (a+b<c+d and a+c<b+d always) —
         either pan order and either order inside a pan is accepted.
         Problem: { t:TSB, nums:[a,b,c,d] (sorted), order:[shown permutation], a:pan sum }

   Try-first, like every module: before the first ✓ the pans show "?" and the
   beam stays level. A wrong ✓ tilts the beam toward the heavier pan with both
   sums printed (16 ≠ 17); from then on the scale is a LIVE aid — it re-weighs
   on every change. Correct → the beam levels, the pans glow, api.solved().
   The solved arrangement is written to `p.sol` for the end-of-set report.

   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root. Queen (mx) gets ONE card per game, alternating the two kinds
   (woven in post-cap by problems.js — the deck is 16); אַלּוּפָה (mulc) gets one
   of each into its rotating pool; 'bal' is the manual-tester handle. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.balance=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
  const rnd=(lo,hi)=>lo+((Math.random()*(hi-lo+1))|0);

  // TBE: two DIFFERENT known numbers 10..19, 1..5 apart (the workbook's 15/12, 14/16)
  function makeFill(pos){
    let a,b;do{a=rnd(10,19);b=rnd(10,19);}while(a===b||Math.abs(a-b)>5);
    return{t:TBE,a,b,pos:pos||(Math.random()<.5?'front':'back')};
  }
  // TSB: a<b<c<d with a+d = b+c, so the gaps run g · h · g (b=a+g, c=b+h, d=c+g).
  // NEVER evenly spaced (h ≠ g): a run like 5 6 7 8 or 4 8 12 16 gives the pairing
  // away at a glance — the numbers must be UNEVEN so she has to try combinations
  // (the user's example: 8, 7, 15, 0 → 8+7 = 15+0). At least one gap of 3+, and a
  // 0 in about a third of the cards. d ≤ maxV, pan sum a+d ≤ maxS.
  function makeScale(maxV,maxS){
    const zero=Math.random()<0.33;               // decided ONCE — a 0-start fits more often, so a per-try coin would favour it
    for(;;){
      const a=zero?0:rnd(1,maxV-4),g=rnd(1,8),h=rnd(1,8);
      const b=a+g,c=b+h,d=c+g;
      if(h!==g&&Math.max(g,h)>=3&&d<=maxV&&a+d<=maxS)return{t:TSB,nums:[a,b,c,d],order:showOrder(),a:a+d};
    }
  }
  // the order the four numbers are SHOWN in — `nums` stays sorted (the generator's
  // a<b<c<d contract, the report), `order` is a random permutation of 0..3 that is
  // never the sorted row or its mirror: shown as 5 6 7 8 the answer would ALWAYS be
  // the 1st with the 4th and the 2nd with the 3rd, a position trick instead of sums
  const ORDERLY=['0123','3210'];
  function showOrder(){let o;do{o=sh([0,1,2,3]);}while(ORDERLY.includes(o.join('')));return o;}
  const validOrder=o=>Array.isArray(o)&&o.length===4&&[0,1,2,3].every(i=>o.includes(i));
  // Queen: ONE card per game, the kinds TAKE TURNS (cursor survives a reload)
  function nextKind(){
    let k=0;try{k=(+localStorage.getItem('balanceKind'))||0;}catch(e){}
    try{localStorage.setItem('balanceKind',String((k+1)%2));}catch(e){}
    return k;
  }

  const CSS=`
  .bl-root{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
  .bl-q{font-family:'Fredoka One',cursive;font-size:1.2rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.5;direction:rtl;padding:0 8px;text-shadow:0 0 12px rgba(160,190,255,.35)}
  .bl-q b{color:var(--skin-accent,#ffd27d)}
  /* equations read left-to-right, like the workbook */
  .bl-rows{display:flex;flex-direction:column;gap:10px;align-items:center}
  .bl-row{display:flex;align-items:center;gap:8px;direction:ltr;padding:8px 14px;border-radius:18px;
    background:rgba(255,255,255,.08);border:2px solid transparent;transition:border-color .3s,background .3s,opacity .3s}
  .bl-row.bl-act{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.14)}
  .bl-row.bl-ok{border-color:#5fd48a;background:rgba(95,212,138,.16)}
  .bl-row.bl-wait{opacity:.45}
  .bl-n,.bl-op{font-family:'Fredoka One',cursive;font-size:2rem;color:var(--skin-text,#fff);min-width:.6em;text-align:center}
  .bl-op{opacity:.85}
  #colx-root .ans-inp.bl-inp{width:66px;height:56px;font-size:1.9rem;border-radius:14px;text-align:center}
  #colx-root .bl-inp.bl-ready{animation:blReady 1s ease-in-out infinite alternate}
  @keyframes blReady{from{border-color:var(--skin-primary,#c77dff);box-shadow:0 0 6px rgba(157,78,221,.6)}
    to{border-color:var(--skin-accent,#ffe28a);box-shadow:0 0 20px var(--skin-accent,#ffd27d)}}
  /* TSB: the number tokens + the two pan boxes */
  .bl-toks{display:flex;gap:14px;direction:ltr;justify-content:center;flex-wrap:wrap}
  .bl-tok{width:62px;height:62px;border-radius:50%;border:0;cursor:pointer;
    font-family:'Fredoka One',cursive;font-size:1.7rem;color:#5a3a3a;
    background:radial-gradient(circle at 40% 35%,#ffe9e0,#f3c5b6 75%);
    box-shadow:0 4px 0 rgba(0,0,0,.25);transition:transform .15s,opacity .25s}
  .bl-tok:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.25)}
  .bl-tok.bl-used{opacity:.18;cursor:default;box-shadow:none}
  .bl-pans{display:flex;align-items:center;gap:10px;direction:ltr}
  .bl-box{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:16px;
    background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35)}
  .bl-slot{width:56px;height:52px;border-radius:12px;border:2px dashed rgba(255,255,255,.55);
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    font-family:'Fredoka One',cursive;font-size:1.7rem;color:var(--skin-text,#fff)}
  .bl-slot.bl-full{border-style:solid;background:rgba(243,197,182,.28)}
  .bl-slot.bl-next{border-color:var(--skin-accent,#ffd27d);box-shadow:0 0 10px var(--skin-accent,#ffd27d)}
  .bl-pans.bl-ok .bl-box{border-color:#5fd48a;background:rgba(95,212,138,.18)}
  /* the scale (shared) */
  .bl-scale{width:300px;max-width:92%;height:auto;overflow:visible}
  .bl-scale .bl-sum{font-family:'Fredoka One',cursive;font-size:22px;fill:#fff;text-anchor:middle;
    paint-order:stroke;stroke:rgba(0,0,0,.45);stroke-width:4px}
  .bl-scale.bl-ok .bl-dish{fill:#5fd48a}
  .bl-btn{font-family:'Fredoka One',cursive;font-size:1.2rem;border-radius:14px;padding:11px 26px;
    cursor:pointer;color:#fff;background:linear-gradient(160deg,#86E29B,#2FA257 85%);
    border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .bl-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .bl-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){
    .bl-n,.bl-op{font-size:1.5rem}
    #colx-root .ans-inp.bl-inp{width:54px;height:48px;font-size:1.6rem}
    .bl-tok{width:52px;height:52px;font-size:1.45rem}
    .bl-slot{width:44px;height:44px;font-size:1.4rem}
    .bl-box{padding:6px 8px;gap:4px}
  }`;
  function injectStyle(){
    if(document.getElementById('bl-style'))return;
    const st=document.createElement('style');st.id='bl-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  /* ── the scale: an SVG beam on a pivot, two pans hanging from its ends ──
     tilt(L,R) eases the beam toward the heavier pan (level when equal);
     sums(L,R) prints the pan weights ("?" before the first weighing). */
  const PX=160,PY=46,ARM=118,MAXDEG=13;
  function buildScale(svgHost,timers){
    svgHost.innerHTML=
      '<svg class="bl-scale" viewBox="0 0 320 200" aria-hidden="true">'+
        '<path d="M110 192 L210 192 L196 176 L124 176 Z" fill="#8f8aa8"/>'+
        '<rect x="152" y="'+PY+'" width="16" height="132" rx="5" fill="#aaa4c4"/>'+
        '<g class="bl-beam"><rect x="'+(PX-ARM-6)+'" y="'+(PY-5)+'" width="'+(2*ARM+12)+'" height="10" rx="5" fill="#7d779c"/></g>'+
        '<circle cx="'+PX+'" cy="'+PY+'" r="9" fill="#ffd27d" stroke="#7d779c" stroke-width="3"/>'+
        [0,1].map(i=>'<g class="bl-pan" data-i="'+i+'">'+
          '<path d="M0 0 L-38 44 M0 0 L38 44" stroke="#c9c4dd" stroke-width="2.5" fill="none"/>'+
          '<path class="bl-dish" d="M-50 44 Q0 76 50 44 Z" fill="#9b95b8" stroke="#6c668c" stroke-width="2"/>'+
          '<text class="bl-sum" x="0" y="40">?</text></g>').join('')+
      '</svg>';
    const svg=svgHost.firstElementChild;
    const beam=svg.querySelector('.bl-beam'),pans=[...svg.querySelectorAll('.bl-pan')];
    const txt=pans.map(g=>g.querySelector('.bl-sum'));
    let deg=0,raf=0;
    function draw(d){
      beam.setAttribute('transform','rotate('+d+' '+PX+' '+PY+')');
      const r=d*Math.PI/180,cx=ARM*Math.cos(r),cy=ARM*Math.sin(r);
      pans[0].setAttribute('transform','translate('+(PX-cx)+' '+(PY-cy)+')');
      pans[1].setAttribute('transform','translate('+(PX+cx)+' '+(PY+cy)+')');
    }
    function tilt(L,R){
      const diff=R-L,to=diff===0?0:Math.sign(diff)*Math.min(MAXDEG,4+Math.abs(diff)*1.5);
      const from=deg,t0=performance.now(),dur=650;
      cancelAnimationFrame(raf);
      const step=now=>{
        const k=Math.min(1,(now-t0)/dur);
        // ease-out-back: a small overshoot, like a real beam settling
        const e=1+2.2*Math.pow(k-1,3)+1.2*Math.pow(k-1,2);
        deg=from+(to-from)*e;draw(deg);
        if(k<1)raf=requestAnimationFrame(step);else{deg=to;draw(deg);}
      };
      raf=requestAnimationFrame(step);
    }
    function sums(L,R){txt[0].textContent=L==null?'?':L;txt[1].textContent=R==null?'?':R;}
    function ok(on){svg.classList.toggle('bl-ok',!!on);}
    draw(0);
    timers.push(()=>cancelAnimationFrame(raf));
    return{tilt,sums,ok};
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{t:TSB,nums:[5,6,7,8],a:13};
    const uid=++_uid;
    const timers=[];                       // timeout ids + cancel fns
    const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};
    const kill=()=>timers.forEach(t=>typeof t==='function'?t():clearTimeout(t));
    return p.t===TBE?mountFill(p,root,api,uid,later,hint,timers,kill)
                    :mountScale(p,root,api,uid,later,hint,timers,kill);
  }

  /* ── TBE: __ + a = b + __, two rows, two DIFFERENT balancing pairs ── */
  function mountFill(p,root,api,uid,later,hint,timers,kill){
    const a=p.a||15,b=p.b||12,front=p.pos!=='back';
    const inp=(r,s)=>'<input class="ans-inp bl-inp" id="bl-'+r+s+'-'+uid+'" type="text" inputmode="numeric" maxlength="2" aria-label="מִסְפָּר חָסֵר">';
    const row=r=>'<div class="bl-row'+(r?' bl-wait':' bl-act')+'" id="bl-row'+r+'-'+uid+'">'+
      (front?inp(r,'x')+'<span class="bl-op">+</span><span class="bl-n">'+a+'</span>'
            :'<span class="bl-n">'+a+'</span><span class="bl-op">+</span>'+inp(r,'x'))+
      '<span class="bl-op">=</span><span class="bl-n">'+b+'</span><span class="bl-op">+</span>'+inp(r,'y')+'</div>';
    root.innerHTML=
      '<div class="bl-root">'+
        '<div class="bl-q">הַשְׁלִימִי מִסְפָּרִים כָּךְ שֶׁ<b>שְׁנֵי הַצְּדָדִים</b> יִהְיוּ <b>שָׁוִים</b> — יֵשׁ הַרְבֵּה תְּשׁוּבוֹת!</div>'+
        '<div class="bl-rows">'+row(0)+row(1)+'</div>'+
        '<div id="bl-sc-'+uid+'"></div>'+
        '<button class="bl-btn" id="bl-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
      '</div>';
    const $=id=>root.querySelector('#'+id+'-'+uid);
    const chk=$('bl-chk'),sc=buildScale($('bl-sc'),timers);
    const rows=[0,1].map(r=>({el:$('bl-row'+r),x:$('bl-'+r+'x'),y:$('bl-'+r+'y')}));
    // the second row waits until the first is solved
    rows[1].x.disabled=rows[1].y.disabled=true;
    let cur=0,done=false,live=false;const sol=[];
    hint('⚖️ מָה צָרִיךְ לִכְתֹּב כְּדֵי שֶׁיִּהְיֶה שָׁוֶה? נַסִּי בָּרֹאשׁ 🏆');

    const val=el=>el.value===''?null:parseInt(el.value,10);
    const sides=r=>{const x=val(rows[r].x),y=val(rows[r].y);return x==null||y==null?null:[x+a,b+y,x,y];};
    // after the first mistake the scale re-weighs the active row as she types
    function weighLive(){
      if(!live||done)return;
      const s=sides(cur);
      if(s){sc.sums(s[0],s[1]);sc.tilt(s[0],s[1]);}else sc.sums(null,null);
    }
    function arm(r){
      const R=rows[r];R.el.classList.remove('bl-wait');R.el.classList.add('bl-act');
      R.x.disabled=R.y.disabled=false;
      // x is the first blank on screen in both layouts (x+a=b+y, a+x=b+y)
      later(()=>{R.x.classList.add('bl-ready');R.y.classList.add('bl-ready');try{R.x.focus();}catch(e){}},300);
    }
    function check(){
      if(done)return;
      const R=rows[cur],s=sides(cur);
      if(!s){hint('כִּתְבִי מִסְפָּר בִּשְׁתֵּי הַתֵּבוֹת 💗');return;}
      const [L,Rt,x,y]=s;
      if(cur===1&&x===sol[0][0]&&y===sol[0][1]){
        hint('אֶת הַזּוּג הַזֶּה כְּבָר מָצָאת — מִצְאִי זוּג אַחֵר! 💡');   // costs nothing
        return;
      }
      sc.sums(L,Rt);sc.tilt(L,Rt);
      if(L===Rt){
        sol.push([x,y]);
        [R.x,R.y].forEach(i=>{i.classList.remove('bl-ready','ans-err');i.classList.add('ans-ok');i.disabled=true;});
        R.el.classList.remove('bl-act');R.el.classList.add('bl-ok');
        if(cur===0){
          cur=1;arm(1);
          hint('🎉 נָכוֹן! '+L+' = '+Rt+' — עַכְשָׁו מִצְאִי עוֹד זוּג שֶׁמַּתְאִים!');
          later(()=>{if(!done&&!sides(1))sc.sums(null,null);},900);   // the new row starts unweighed
        }else{
          done=true;chk.disabled=true;sc.ok(true);
          p.sol=sol;
          hint('⚖️ שְׁנֵי הַצְּדָדִים שָׁוִים — כָּל הַכָּבוֹד!');
          api.solved();
        }
      }else{
        [R.x,R.y].forEach(i=>{i.classList.remove('bl-ready');i.classList.add('ans-err');});
        live=true;
        api.wrong(x+','+y);
        hint('הַמֹּאזְנַיִם לֹא מְאֻזָּנִים: '+L+' מוּל '+Rt+'. נַסִּי שׁוּב 💗');
        later(()=>{if(!done)[R.x,R.y].forEach(i=>i.classList.remove('ans-err'));},1000);
      }
    }
    rows.forEach((R,r)=>[R.x,R.y].forEach(i=>{
      i.addEventListener('input',()=>{i.value=i.value.replace(/\D/g,'');if(r===cur)weighLive();});
      i.addEventListener('keydown',e=>{
        if(e.key!=='Enter')return;e.preventDefault();
        if(i===R.x&&R.y.value==='')R.y.focus();else if(i===R.y&&R.x.value==='')R.x.focus();else check();
      });
    }));
    chk.addEventListener('click',check);
    arm(0);
    return function cleanup(){kill();root.innerHTML='';};
  }

  /* ── TSB: four numbers onto two pans so the sums are equal ── */
  function mountScale(p,root,api,uid,later,hint,timers,kill){
    const nums=(p.nums&&p.nums.length===4)?p.nums.slice():[5,6,7,8];
    if(!validOrder(p.order))p.order=showOrder();     // a forced/older problem gets a shuffled row too
    const tok=p.order.map(i=>'<button class="bl-tok" data-i="'+i+'">'+nums[i]+'</button>').join('');
    const slot=k=>'<div class="bl-slot" data-k="'+k+'" role="button" aria-label="מָקוֹם בְּכַף"></div>';
    root.innerHTML=
      '<div class="bl-root">'+
        '<div class="bl-q">שִׂימִי אֶת הַמִּסְפָּרִים עַל כַּפּוֹת הַמֹּאזְנַיִם כָּךְ שֶׁיִּתְקַבְּלוּ <b>סְכוּמִים שָׁוִים</b></div>'+
        '<div class="bl-toks" id="bl-toks-'+uid+'">'+tok+'</div>'+
        '<div class="bl-pans" id="bl-pans-'+uid+'">'+
          '<div class="bl-box">'+slot(0)+'<span class="bl-op">+</span>'+slot(1)+'</div>'+
          '<span class="bl-op">=</span>'+
          '<div class="bl-box">'+slot(2)+'<span class="bl-op">+</span>'+slot(3)+'</div>'+
        '</div>'+
        '<div id="bl-sc-'+uid+'"></div>'+
        '<button class="bl-btn" id="bl-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
      '</div>';
    const $=id=>root.querySelector('#'+id+'-'+uid);
    const chk=$('bl-chk'),pansEl=$('bl-pans'),sc=buildScale($('bl-sc'),timers);
    const toks=[0,1,2,3].map(i=>root.querySelector('.bl-tok[data-i="'+i+'"]')),slots=[...root.querySelectorAll('.bl-slot')];   // toks[i] ↔ nums[i], whatever the shown order
    const place=[null,null,null,null];    // slot k → token index
    let done=false,live=false;
    hint('⚖️ לַחֲצִי עַל מִסְפָּר כְּדֵי לָשִׂים אוֹתוֹ עַל הַמֹּאזְנַיִם');

    const pan=(i,j)=>nums[place[i]]+nums[place[j]];
    const full=()=>place.every(v=>v!=null);
    function render(){
      slots.forEach((s,k)=>{
        const v=place[k];s.textContent=v==null?'':nums[v];
        s.classList.toggle('bl-full',v!=null);
      });
      const nx=place.indexOf(null);
      slots.forEach((s,k)=>s.classList.toggle('bl-next',!done&&k===nx));
      toks.forEach((t,i)=>{const u=place.includes(i);t.classList.toggle('bl-used',u);t.disabled=u||done;});
      if(live&&!done){
        // live aid (after the first mistake): weigh each pan as soon as it is full
        const L=place[0]!=null&&place[1]!=null?pan(0,1):null,R=place[2]!=null&&place[3]!=null?pan(2,3):null;
        sc.sums(L,R);if(L!=null&&R!=null)sc.tilt(L,R);
      }
    }
    toks.forEach((t,i)=>t.addEventListener('click',()=>{
      if(done||place.includes(i))return;
      const k=place.indexOf(null);if(k<0)return;
      place[k]=i;render();
    }));
    slots.forEach((s,k)=>s.addEventListener('click',()=>{
      if(done||place[k]==null)return;
      place[k]=null;render();
    }));
    function check(){
      if(done)return;
      if(!full()){hint('שִׂימִי אֶת כָּל אַרְבָּעַת הַמִּסְפָּרִים עַל הַמֹּאזְנַיִם 💗');return;}
      const L=pan(0,1),R=pan(2,3);
      sc.sums(L,R);sc.tilt(L,R);
      const shown=nums[place[0]]+' + '+nums[place[1]]+' = '+nums[place[2]]+' + '+nums[place[3]];
      if(L===R){
        done=true;chk.disabled=true;sc.ok(true);pansEl.classList.add('bl-ok');
        p.sol=place.map(i=>nums[i]);render();
        hint('⚖️ '+shown+' — מְאֻזָּן! כָּל הַכָּבוֹד!');
        api.solved();
      }else{
        live=true;
        api.wrong(nums[place[0]]+'+'+nums[place[1]]+' / '+nums[place[2]]+'+'+nums[place[3]]);
        hint('הַמֹּאזְנַיִם נָטוּ: '+L+' מוּל '+R+'. הַחְלִיפִי מִסְפָּרִים וְנַסִּי שׁוּב 💗');
      }
    }
    chk.addEventListener('click',check);
    render();
    return function cleanup(){kill();root.innerHTML='';};
  }

  return{
    t:[TBE,TSB],
    modes:['bal','mx','mulc'],
    aidsReveal:'always',            // no HOST aid — the scale is the module's own aid
    make(mode){
      if(mode==='mx')return[nextKind()?makeScale(15,18):makeFill()];
      if(mode==='mulc')return sh([makeFill(),makeScale(18,20)]);
      if(mode==='bal')return[makeFill('front'),makeScale(18,20),makeFill('back'),makeScale(18,20),makeFill(),makeScale(15,18)];
      return[];
    },
    mount,
  };
})();
