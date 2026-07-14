/* ── Compare-two-numbers exercise (גְּרֹר אֶת הַסִּימָן ⚖️) ──────────────────────
   Two numbers are shown with an empty SLOT between them; the child DRAGS the
   correct comparison sign — greater-than ‹›‹ , less-than ‹‹ or equals ‹=› — from
   a tray into the slot:

        3   [ ? ]   4        →  drag  ‹  →   3 < 4

   • Genuine pointer-drag (mouse + touch): a floating "ghost" follows the finger,
     the slot lights up when the sign hovers over it, and dropping it there places
     the sign and checks it. Releasing anywhere else returns the tile.
   • A correct drop turns the slot green and states the fact (3 <b>&lt;</b> 4).
     A wrong drop shakes red, logs the mistake, and clears for another try.

   Self-contained interactive type, mounted by core.js _colxMount into #colx-root
   (same host path as perimeter/polygon/column modules); self-checks via
   api.solved()/api.wrong(). Mixed into the אַלּוּפָה (mulc) set; the 'cmp' handle
   is for the manual tester / direct setMode.
   Problem shape: { t:TCP, a, b }  (the sign is derived: a<b→‹, a>b→›, a===b→=).
   The module reads a/b from ctx (num1/num2), falling back to the full ctx.p. */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.compare=(()=>{

  const ri=(lo,hi)=>lo+(Math.random()*(hi-lo+1)|0);
  const G={lt:'<',gt:'>',eq:'='};            // op-token → glyph (safe as textContent)
  const ESC={lt:'&lt;',gt:'&gt;',eq:'='};    // op-token → HTML-escaped glyph (for innerHTML)
  const opOf=(a,b)=>a<b?'lt':a>b?'gt':'eq';

  // one problem; optionally FORCE a relation so the pool covers ‹ , › and = .
  function makeOne(force){
    if(force==='eq'){const v=ri(1,99);return{t:TCP,a:v,b:v};}
    let a=ri(1,99),b=ri(1,99);while(a===b)b=ri(1,99);
    if(force==='lt'&&a>b){const t=a;a=b;b=t;}
    if(force==='gt'&&a<b){const t=a;a=b;b=t;}
    return{t:TCP,a,b};
  }
  // a varied pool that ALWAYS contains at least one of each relation
  function makePool(n){
    n=n||5;
    const out=[makeOne('lt'),makeOne('gt'),makeOne('eq')];
    while(out.length<n)out.push(makeOne(null));
    for(let i=out.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }

  const CSS=`
  .cp-root{position:relative;display:flex;flex-direction:column;align-items:center;gap:26px;width:100%}
  .cp-q{font-family:'Fredoka One',cursive;font-size:1.25rem;color:var(--skin-text,#fff);text-align:center;
    line-height:1.4;min-height:1.4em;text-shadow:0 0 12px rgba(160,190,255,.35)}
  .cp-q b{color:var(--skin-accent,#ffd27d)}
  .cp-eq{direction:ltr;display:flex;align-items:center;justify-content:center;gap:22px}
  .cp-num{font-family:'Fredoka One',cursive;font-size:4.6rem;line-height:1;color:var(--skin-text,#fff);
    text-shadow:0 0 20px rgba(160,190,255,.4);animation:cpBob 3.4s ease-in-out infinite}
  @keyframes cpBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .cp-slot{position:relative;width:104px;height:104px;border-radius:22px;display:flex;align-items:center;
    justify-content:center;font-family:'Fredoka One',cursive;font-size:4.4rem;line-height:1;
    color:var(--skin-accent,#ffd27d);background:rgba(255,255,255,.06);border:4px dashed rgba(255,255,255,.5);
    box-shadow:inset 0 0 22px rgba(120,150,255,.15);
    transition:border-color .2s,box-shadow .2s,background .2s,transform .15s,color .2s}
  .cp-slot-q{font-size:3rem;opacity:.4;color:var(--skin-text,#fff);animation:cpPulse 1.4s ease-in-out infinite}
  @keyframes cpPulse{0%,100%{opacity:.3}50%{opacity:.7}}
  .cp-slot.cp-hot{border-color:var(--skin-accent,#ffe28a);background:rgba(255,220,130,.16);transform:scale(1.07);
    box-shadow:0 0 28px var(--skin-accent,#ffd27d),inset 0 0 22px rgba(255,220,130,.3)}
  .cp-slot.cp-filled{border-style:solid}
  .cp-slot.cp-ok{border-color:#38d66b;color:#8CE99A;background:rgba(56,214,107,.16);
    box-shadow:0 0 28px rgba(56,214,107,.6),inset 0 0 20px rgba(56,214,107,.25)}
  .cp-slot.cp-bad{border-color:#ff5f7a;color:#ff8fa3;background:rgba(255,95,122,.14);animation:cpShake .4s}
  @keyframes cpShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}60%{transform:translateX(8px)}}
  .cp-tray{display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap}
  .cp-tile{font-family:'Fredoka One',cursive;font-size:2.9rem;line-height:1;width:90px;height:90px;
    display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;user-select:none;
    color:#fff;border:3px solid rgba(255,255,255,.55);border-radius:20px;padding:0;
    background:linear-gradient(160deg,var(--skin-glow,#7dc4ff),var(--skin-primary,#c77dff) 90%);
    box-shadow:0 5px 0 rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.4);
    transition:transform .12s,box-shadow .12s,opacity .2s;animation:cpFloat 3s ease-in-out infinite}
  .cp-tile:nth-child(2){animation-delay:.4s}
  .cp-tile:nth-child(3){animation-delay:.8s}
  .cp-tile:active{cursor:grabbing}
  .cp-tile.cp-dragging{opacity:.22}
  .cp-tile:disabled{opacity:.3;cursor:default;box-shadow:none;animation:none}
  @keyframes cpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  /* direction:ltr is REQUIRED — the ghost is appended to <body> (which is RTL),
     and < / > are BiDi-MIRRORED glyphs, so without it a '<' renders as '>' mid-drag
     (the sign appeared to "flip sides" while dragging, then flip back in the LTR slot) */
  .cp-ghost{position:fixed;z-index:9999;pointer-events:none;font-family:'Fredoka One',cursive;font-size:3rem;
    direction:ltr;unicode-bidi:isolate;
    width:92px;height:92px;display:flex;align-items:center;justify-content:center;color:#fff;
    border:3px solid rgba(255,255,255,.7);border-radius:20px;
    transform:translate(-50%,-50%) scale(1.12) rotate(-4deg);
    background:linear-gradient(160deg,var(--skin-glow,#7dc4ff),var(--skin-primary,#c77dff) 90%);
    box-shadow:0 12px 28px rgba(0,0,0,.42)}
  @media(max-width:480px){
    .cp-num{font-size:3.4rem}
    .cp-eq{gap:14px}
    .cp-slot{width:80px;height:80px;font-size:3.2rem}
    .cp-tile{width:72px;height:72px;font-size:2.3rem}
  }`;
  function injectStyle(){
    if(document.getElementById('cp-style'))return;
    const st=document.createElement('style');st.id='cp-style';st.textContent=CSS;
    document.head.appendChild(st);
  }

  let _uid=0;
  function mount(ctx){
    injectStyle();
    const {root,api}=ctx;
    const p=ctx.p||{a:3,b:4};
    const a=(typeof ctx.a==='number')?ctx.a:p.a;
    const b=(typeof ctx.b==='number')?ctx.b:p.b;
    const want=opOf(a,b);
    const uid=++_uid;
    let done=false,placed=false;
    const timers=[];const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    const hint=msg=>{const h=document.getElementById('hint');if(h)h.textContent=msg;};

    // shuffle the tray so the correct sign isn't always in the same spot
    const signs=['lt','gt','eq'];
    for(let i=signs.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[signs[i],signs[j]]=[signs[j],signs[i]];}

    root.innerHTML=`
      <div class="cp-root">
        <div class="cp-q" id="cp-q-${uid}">גָּרְרִי אֶת הַסִּימָן הַנָּכוֹן לַתֵּבָה בֵּין הַמִּסְפָּרִים ⚖️</div>
        <div class="cp-eq">
          <span class="cp-num">${a}</span>
          <span class="cp-slot" id="cp-slot-${uid}"><span class="cp-slot-q">?</span></span>
          <span class="cp-num">${b}</span>
        </div>
        <div class="cp-tray" id="cp-tray-${uid}">
          ${signs.map(k=>`<button class="cp-tile" type="button" data-op="${k}" aria-label="${G[k]}">${ESC[k]}</button>`).join('')}
        </div>
      </div>`;

    const slot=root.querySelector('#cp-slot-'+uid);
    const tray=root.querySelector('#cp-tray-'+uid);
    const qEl=root.querySelector('#cp-q-'+uid);
    hint('גָּרְרִי אֶת הַסִּימָן שֶׁמַּתְאִים בֵּין הַמִּסְפָּרִים 👉');

    const overSlot=(x,y)=>{const r=slot.getBoundingClientRect();
      return x>=r.left-16&&x<=r.right+16&&y>=r.top-16&&y<=r.bottom+16;};

    let active=null;   // {tile, op, ghost, sx, sy, moved}
    function onMove(e){
      if(!active)return;
      const dx=e.clientX-active.sx,dy=e.clientY-active.sy;
      if(!active.moved&&Math.hypot(dx,dy)<6)return;
      if(!active.moved){
        active.moved=true;
        const g=document.createElement('div');g.className='cp-ghost';g.textContent=G[active.op];
        document.body.appendChild(g);active.ghost=g;active.tile.classList.add('cp-dragging');
      }
      active.ghost.style.left=e.clientX+'px';active.ghost.style.top=e.clientY+'px';
      slot.classList.toggle('cp-hot',overSlot(e.clientX,e.clientY));
    }
    function endDrag(){
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp);
      window.removeEventListener('pointercancel',onCancel);
      if(active){
        if(active.ghost)active.ghost.remove();
        active.tile.classList.remove('cp-dragging');
      }
      slot.classList.remove('cp-hot');
    }
    function onUp(e){
      if(!active)return;
      const op=active.op,moved=active.moved,hit=overSlot(e.clientX,e.clientY);
      endDrag();active=null;
      if(moved&&hit)place(op);
      else if(!moved)hint('אֲנִי צָרִיךְ שֶׁתִּגְרְרִי אוֹתִי אֶל הַתֵּבָה שֶׁבָּאֶמְצַע 👉');
    }
    function onCancel(){endDrag();active=null;}
    function onDown(tile,e){
      if(done||placed||tile.disabled)return;
      e.preventDefault();
      active={tile,op:tile.dataset.op,ghost:null,sx:e.clientX,sy:e.clientY,moved:false};
      window.addEventListener('pointermove',onMove);
      window.addEventListener('pointerup',onUp);
      window.addEventListener('pointercancel',onCancel);
    }
    root.querySelectorAll('.cp-tile').forEach(tile=>{
      tile.addEventListener('pointerdown',e=>onDown(tile,e));
    });

    function place(op){
      if(done||placed)return;
      slot.innerHTML='';slot.textContent=G[op];slot.classList.add('cp-filled');
      if(op===want){
        done=true;placed=true;
        slot.classList.remove('cp-bad');slot.classList.add('cp-ok');
        tray.querySelectorAll('.cp-tile').forEach(t=>{t.disabled=true;});
        qEl.innerHTML=`🎉 נָכוֹן! <span dir="ltr">${a} <b>${ESC[op]}</b> ${b}</span>`;
        hint('כָּל הַכָּבוֹד! ⚖️');
        api.solved();
      }else{
        placed=true;                          // lock briefly while showing the error
        slot.classList.add('cp-bad');
        hint(op==='eq'?'הַמִּסְפָּרִים לֹא שָׁוִים — הִסְתַּכְּלִי מִי גָּדוֹל יוֹתֵר 💗'
                      :'לֹא מַתְאִים — הַפֶּה הַפָּתוּחַ פּוֹנֶה תָּמִיד לַמִּסְפָּר הַגָּדוֹל 💗');
        api.wrong(G[op]);
        later(()=>{
          if(done)return;
          slot.classList.remove('cp-filled','cp-bad');
          slot.innerHTML='<span class="cp-slot-q">?</span>';
          placed=false;
        },1000);
      }
    }

    return function cleanup(){
      timers.forEach(clearTimeout);
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp);
      window.removeEventListener('pointercancel',onCancel);
      const g=document.querySelector('.cp-ghost');if(g)g.remove();
      root.innerHTML='';
    };
  }

  return{
    t:TCP,
    modes:['cmp','mulc'],
    aidsReveal:'always',            // no number-line aid — the two numbers ARE the comparison
    make(mode){return (mode==='cmp'||mode==='mulc')?makePool(mode==='cmp'?9:5):[];},
    mount,
  };
})();
