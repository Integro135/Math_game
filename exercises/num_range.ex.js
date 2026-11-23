/* ── "אֵילוּ מִסְפָּרִים בֵּין 65 לְ-75?" — mark every number BETWEEN two bounds (🎯) ──
   The range card of Queen (mx) and אַלּוּפָה (mulc), after the user's example
   (2026-11-15): "between 65 and 75 — which of 50, 51, 66, 71, 79?" → only 66
   and 71. Since 2026-11-16 also in גָּשֵׁר 10 (br) and גָּשֵׁר 20 (b20).

   • The two bounds sit at the ends of a gold bar (the low one on the LEFT, the
     way the game's number lines run); the candidate numbers are tiles in a
     shuffled row. She TAPS tiles to mark them (tap again to unmark) and ✓
     submits — the select → ✓ rhythm of the reading kinds.
   • Right = EXACTLY the numbers strictly between the bounds. A bound itself is
     never offered, so the card never has to settle whether 65 is "between".
   • Try-first: nothing else is shown before a mistake. A wrong ✓ logs ONE
     mistake (api.wrong with the numbers she marked), and then
       – every marked number OUTSIDE the range turns red with a ✗ and leaves
         play, and the hint says why ("50 קָטָן מִ-65", "79 גָּדוֹל מִ-75");
       – a number she MISSED is not pointed at — the hint only says that one
         (or how many) is still missing;
       – a NUMBER LINE opens under the tiles: the range is a gold band, every
         candidate a pin at its place, so she can SEE which ones fall inside.
     She fixes the marks and submits again (the second try is worth 67%).
   • ✓ with nothing marked only nudges (no penalty).

   Generator: Queen and אַלּוּפָה ranges are 10 wide and start on a multiple of
   5. Queen (medium) draws from the whole spread, whole decades included
   (30–40, where the tens digit decides); אַלּוּפָה (hard) only from ranges that
   CROSS a decade (65–75, where it doesn't). The BRIDGES get ranges 4–8 wide
   ACROSS the ten they bridge, the bounds 2–6 either side of it — גָּשֵׁר 10:
   4–12 … 8–16 with numbers up to 20; גָּשֵׁר 20: 14–22 … 18–26 with numbers up to
   30 — and one number inside on EACH side of that ten (9 and 12 in 7–13), so
   the card is about the bridge too. 2 or 3 numbers inside, never touching a
   bound. Queen and the bridges: 5 numbers — one near miss just outside a
   bound, the rest further away (גָּשֵׁר 20 adds 12 when 21 is inside: the
   reversed digits). אַלּוּפָה: 6 numbers with the classic traps — a near miss on
   EACH side (64, 76) and, when there is one, the digits of an inside number
   reversed (71 → 17). There is always at least one number below the range
   and one above it. The ranges rotate through a no-repeat queue per level.

   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root; self-checks via api.solved()/api.wrong(). Problem shape:
   { t:TRG, lo, hi, nums:[…shuffled], a: how many lie inside }. 'rng' is the
   manual-tester handle (and the direct setMode handle). */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.num_range=(()=>{

  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
  const span=(a,b)=>{const o=[];for(let v=a;v<=b;v++)o.push(v);return o;};
  const asc=a=>a.slice().sort((x,y)=>x-y);

  // the ranges of each level as [low, high] bounds, and how a card is filled: n numbers from 1 … max,
  // "far" = at least `far` outside a bound, `both` = a near miss on each side, `rev` = the
  // reversed-digits trap, `ten` = the ten a bridge crosses (one number inside on each side of it)
  const tens=los=>los.map(lo=>[lo,lo+10]);
  const across=t=>{const o=[];for(let lo=t-6;lo<=t-2;lo++)for(let hi=t+2;hi<=t+6;hi++)if(hi-lo<=8)o.push([lo,hi]);return o;};
  const LV={
    mx:  {ranges:tens([10,15,20,25,30,35,40,45,50,55,60,65,70,75,80]),n:5,max:99,far:6},
    mulc:{ranges:tens([15,25,35,45,55,65,75]),n:6,max:99,far:6,both:true,rev:true},
    br:  {ranges:across(10),n:5,max:20,far:4,ten:10},              // 4–12 … 8–16: 15 ranges
    b20: {ranges:across(20),n:5,max:30,far:4,ten:20,rev:true},     // 14–22 … 18–26: 15 ranges
  };
  const _queue={mx:[],mulc:[],br:[],b20:[]};
  function nextRange(level){const q=_queue[level];if(!q.length)q.push(...sh(LV[level].ranges.slice()));return q.pop();}

  function makeCard(level){
    const c=LV[level], [lo,hi]=nextRange(level), N=c.n;
    const inside=v=>v>lo&&v<hi;
    const k=Math.random()<0.55?2:3;
    let ins;
    if(c.ten){                                    // a bridge: one inside below its ten, one above (+ one anywhere inside)
      ins=[sh(span(lo+1,c.ten-1))[0],sh(span(c.ten+1,hi-1))[0]];
      if(k===3)ins.push(sh(span(lo+1,hi-1).filter(v=>!ins.includes(v)))[0]);
    }else ins=sh(span(lo+1,hi-1)).slice(0,k);
    const used=new Set(ins);
    const free=v=>v>=1&&v<=c.max&&v!==lo&&v!==hi&&!inside(v)&&!used.has(v);
    // add one random free number from `list`; false when the list has none left
    const take=list=>{const x=sh(list.filter(free));if(!x.length)return false;used.add(x[0]);return true;};
    const nearLo=span(lo-3,lo-1), nearHi=span(hi+1,hi+3), farLo=span(1,lo-c.far), farHi=span(hi+c.far,c.max);
    const below=()=>[...used].some(v=>v<lo), above=()=>[...used].some(v=>v>hi);
    if(c.both){take(nearLo);take(nearHi);}
    else take(Math.random()<0.5?nearLo:nearHi);
    if(c.rev){                                    // the reversed-digits trap (71 → 17, 21 → 12), only if it lands outside —
      const room=v=>used.size+1+(below()||v<lo?0:1)+(above()||v>hi?0:1)<=N;   // and leaves room for a number on each side
      take(ins.filter(v=>v%10).map(v=>(v%10)*10+((v/10)|0)).filter(room));
    }
    // both sides of the range must be present; then far numbers fill the row
    while(used.size<N){
      const want=!below()?farLo.concat(nearLo):!above()?farHi.concat(nearHi):(Math.random()<0.5?farLo:farHi);
      if(!take(want)&&!take(farLo.concat(farHi,nearLo,nearHi)))break;
    }
    return{t:TRG,lo,hi,nums:sh([...used]),a:k};
  }

  const CSS=`
  .rg-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}
  .rg-q{font-family:'Fredoka One',cursive;font-size:1.3rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.5;direction:rtl;padding:0 8px;text-shadow:0 0 12px rgba(160,190,255,.35)}
  .rg-q b{color:var(--skin-accent,#ffd27d)}
  .rg-fence{display:flex;align-items:center;direction:ltr}
  .rg-post{font-family:'Fredoka One',cursive;font-size:1.2rem;color:#4a2c00;padding:4px 12px;border-radius:12px;
    background:linear-gradient(160deg,#ffe9a8,#f2b33d);border:2px solid rgba(255,255,255,.6);box-shadow:0 3px 8px rgba(0,0,0,.25)}
  .rg-bar{width:120px;height:10px;margin:0 -3px;border-radius:5px;
    background:repeating-linear-gradient(90deg,#ffd27d 0 10px,#f2b33d 10px 14px);box-shadow:0 0 10px rgba(255,210,125,.55)}
  .rg-tiles{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;direction:ltr;max-width:470px}
  .rg-tile{position:relative;font-family:'Fredoka One',cursive;font-size:1.75rem;line-height:1;min-width:76px;padding:12px 14px;
    border-radius:18px;cursor:pointer;color:var(--skin-text,#fff);background:rgba(255,255,255,.12);
    border:2px solid rgba(255,255,255,.4);transition:transform .15s,border-color .2s,background .2s,box-shadow .2s}
  .rg-tile:hover{transform:translateY(-2px)}
  .rg-tile::after{position:absolute;top:-9px;right:-9px;width:24px;height:24px;border-radius:50%;
    font-size:.85rem;line-height:24px;text-align:center;font-family:Arial,sans-serif;font-weight:900}
  .rg-tile.rg-on{border-color:var(--skin-accent,#ffd27d);background:rgba(255,210,125,.24);
    box-shadow:0 0 14px rgba(255,210,125,.55);transform:translateY(-3px)}
  .rg-tile.rg-on::after{content:'✓';background:var(--skin-accent,#ffd27d);color:#4a2c00}
  .rg-tile.rg-bad{border-color:#ff6b81;color:#ff9db0;opacity:.6;cursor:default;text-decoration:line-through;transform:none;
    animation:rgShake .36s 2}
  .rg-tile.rg-bad::after{content:'✗';background:#ff6b81;color:#fff}
  .rg-tile.rg-good{border-color:#5fd48a;background:rgba(95,212,138,.26);box-shadow:0 0 14px rgba(95,212,138,.5);cursor:default}
  .rg-tile.rg-good::after{content:'✓';background:#5fd48a;color:#fff}
  .rg-tile.rg-dim{opacity:.38;cursor:default}
  .rg-tile:disabled:hover{transform:none}
  @keyframes rgShake{0%,100%{translate:0}25%{translate:-6px 0}75%{translate:6px 0}}
  .rg-nl{width:100%;max-width:470px;animation:rgIn .4s cubic-bezier(.34,1.56,.64,1)}
  @keyframes rgIn{from{transform:scale(.85);opacity:0}to{transform:none;opacity:1}}
  .rg-svg{display:block;width:100%;height:auto;overflow:visible}
  .rg-band{fill:rgba(255,210,125,.26);stroke:var(--skin-accent,#ffd27d);stroke-width:2}
  .rg-axis{stroke:var(--skin-text,#fff);stroke-width:2.5;stroke-linecap:round;opacity:.8}
  .rg-tick{stroke:var(--skin-text,#fff);stroke-width:1.2;opacity:.55}
  .rg-lab{fill:var(--skin-text,#fff);opacity:.75;font:700 12px 'Fredoka One',cursive;text-anchor:middle}
  .rg-labb{fill:var(--skin-accent,#ffd27d);opacity:1;font-size:14px}
  .rg-stem{stroke:var(--skin-text,#fff);stroke-width:1;stroke-dasharray:2 2;opacity:.5}
  .rg-pin{fill:#fff;stroke:#2a2050;stroke-width:2}
  .rg-pinlab{fill:var(--skin-text,#fff);font:700 13px 'Fredoka One',cursive;text-anchor:middle}
  .rg-btn{font-family:'Fredoka One',cursive;font-size:1.2rem;border-radius:14px;padding:11px 26px;cursor:pointer;color:#fff;
    background:linear-gradient(160deg,#86E29B,#2FA257 85%);border:2px solid rgba(255,255,255,.5);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .rg-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
  .rg-btn:disabled{opacity:.4;cursor:default;box-shadow:none}
  @media(max-width:480px){ .rg-q{font-size:1.15rem} .rg-tile{font-size:1.45rem;min-width:62px;padding:10px 10px} .rg-tiles{gap:10px} .rg-bar{width:90px} }`;
  function injectStyle(){
    if(document.getElementById('rg-style'))return;
    const st=document.createElement('style');st.id='rg-style';st.textContent=CSS;document.head.appendChild(st);
  }

  // the number line that opens after a mistake: the range as a gold band, every
  // candidate a pin at its place, its number above (staggered where pins crowd)
  function lineSVG(lo,hi,nums){
    const vals=nums.concat([lo,hi]);
    const d0=Math.max(0,Math.floor((Math.min(...vals)-2)/5)*5), d1=Math.min(100,Math.ceil((Math.max(...vals)+2)/5)*5);
    const W=360,H=100,L=18,R=W-18,Y=64,n=d1-d0,x=v=>+(L+(v-d0)/n*(R-L)).toFixed(1);
    let s='<svg class="rg-svg" viewBox="0 0 '+W+' '+H+'" direction="ltr" aria-hidden="true">';
    s+='<rect class="rg-band" x="'+x(lo)+'" y="'+(Y-12)+'" width="'+(x(hi)-x(lo)).toFixed(1)+'" height="24" rx="6"/>';
    s+='<line class="rg-axis" x1="'+L+'" y1="'+Y+'" x2="'+R+'" y2="'+Y+'"/>';
    const step=n<=40?1:5, gap=n>50?4:2;
    for(let v=d0;v<=d1;v+=step){
      const h=v%10===0?7:v%5===0?5:3;
      s+='<line class="rg-tick" x1="'+x(v)+'" y1="'+(Y-h)+'" x2="'+x(v)+'" y2="'+(Y+h)+'"/>';
      if(v%10===0&&Math.abs(v-lo)>=gap&&Math.abs(v-hi)>=gap)s+='<text class="rg-lab" x="'+x(v)+'" y="'+(Y+27)+'">'+v+'</text>';
    }
    s+='<text class="rg-lab rg-labb" x="'+x(lo)+'" y="'+(Y+28)+'">'+lo+'</text><text class="rg-lab rg-labb" x="'+x(hi)+'" y="'+(Y+28)+'">'+hi+'</text>';
    let lastX=-99,row=0;
    asc(nums).forEach(v=>{
      const px=x(v);row=px-lastX<26?(row+1)%3:0;lastX=px;const ty=14+row*14;
      s+='<line class="rg-stem" x1="'+px+'" y1="'+(ty+3)+'" x2="'+px+'" y2="'+(Y-6)+'"/>'+
         '<circle class="rg-pin" data-v="'+v+'" cx="'+px+'" cy="'+Y+'" r="5"/>'+
         '<text class="rg-pinlab" x="'+px+'" y="'+ty+'">'+v+'</text>';
    });
    return s+'</svg>';
  }

  // "66 וְ-71" / "66, 68 וְ-71"
  const listHe=a=>a.length<2?String(a[0]):a.slice(0,-1).join(', ')+' וְ-'+a[a.length-1];

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx, p=ctx.p||{};
    const lo=p.lo!=null?p.lo:65, hi=p.hi!=null?p.hi:75, nums=(p.nums&&p.nums.length)?p.nums.slice():[50,51,66,71,79];
    const inside=v=>v>lo&&v<hi, want=asc(nums.filter(inside));
    const uid=++_uid;
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};
    let done=false, lineShown=false;

    root.innerHTML=
      '<div class="rg-root" id="rg-root-'+uid+'">'+
        '<div class="rg-q">אֵילוּ מִסְפָּרִים נִמְצָאִים בֵּין <b>'+lo+'</b> לְ-<b>'+hi+'</b>?</div>'+
        '<div class="rg-fence" aria-hidden="true"><span class="rg-post">'+lo+'</span><span class="rg-bar"></span><span class="rg-post">'+hi+'</span></div>'+
        '<div class="rg-tiles">'+nums.map(v=>'<button class="rg-tile" data-v="'+v+'" aria-pressed="false">'+v+'</button>').join('')+'</div>'+
        '<div class="rg-nl" id="rg-nl-'+uid+'" style="display:none"></div>'+
        '<button class="rg-btn" id="rg-chk-'+uid+'" aria-label="בְּדִיקָה">✓</button>'+
      '</div>';
    const $=id=>root.querySelector('#'+id+'-'+uid);
    const nl=$('rg-nl'), chk=$('rg-chk'), tiles=[...root.querySelectorAll('.rg-tile')];
    const tileOf=v=>tiles.find(t=>+t.dataset.v===v);
    const mark=(t,on)=>{t.classList.toggle('rg-on',on);t.setAttribute('aria-pressed',on?'true':'false');};
    hint('🎯 סַמְּנִי אֶת כָּל הַמִּסְפָּרִים שֶׁבֵּין '+lo+' לְ-'+hi+' — וְלַחֲצִי ✓');

    function showLine(){
      if(lineShown)return;lineShown=true;
      nl.innerHTML=lineSVG(lo,hi,nums);nl.style.display='';
    }
    tiles.forEach(t=>t.addEventListener('click',()=>{
      if(done||t.classList.contains('rg-bad'))return;
      mark(t,!t.classList.contains('rg-on'));
    }));
    chk.addEventListener('click',()=>{
      if(done)return;
      const marked=asc(tiles.filter(t=>t.classList.contains('rg-on')).map(t=>+t.dataset.v));
      if(!marked.length){hint('סַמְּנִי קֹדֶם מִסְפָּרִים — וְאָז ✓ 💗');return;}
      const extra=marked.filter(v=>!inside(v)), missed=want.filter(v=>!marked.includes(v));
      if(!extra.length&&!missed.length){
        done=true;chk.disabled=true;
        tiles.forEach(t=>{const v=+t.dataset.v;t.disabled=true;t.classList.remove('rg-on');t.classList.add(inside(v)?'rg-good':'rg-dim');});
        hint('🎉 נָכוֹן! '+listHe(want)+' נִמְצָאִים בֵּין '+lo+' לְ-'+hi);
        api.solved();
        return;
      }
      api.wrong(marked.join(', '));
      showLine();
      extra.forEach(v=>{const t=tileOf(v);mark(t,false);t.classList.add('rg-bad');t.disabled=true;});
      const why=extra.map(v=>v<lo?v+' קָטָן מִ-'+lo:v+' גָּדוֹל מִ-'+hi);
      if(missed.length)why.push(missed.length===1?'חָסֵר עוֹד מִסְפָּר אֶחָד':'חֲסֵרִים עוֹד '+missed.length+' מִסְפָּרִים');
      hint(why.join(' · ')+' — הִסְתַּכְּלִי עַל הַיָּשָׁר וְנַסִּי שׁוּב 💗');
    });

    return function cleanup(){root.innerHTML='';};
  }

  return{
    t:TRG,
    modes:['rng','mx','mulc','br','b20'],
    aidsReveal:'always',            // no host aid — the card opens its own number line after a mistake
    make(mode){
      if(mode==='mx'||mode==='mulc'||mode==='br'||mode==='b20')return[makeCard(mode)];
      if(mode==='rng')return sh(['mx','mulc','br','b20'].flatMap(lv=>[makeCard(lv),makeCard(lv)]));   // tester: two of every level
      return[];
    },
    mount,
  };
})();
