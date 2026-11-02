/* ── Part–whole board (תַּבְנִית שָׁלֵם–חֵלֶק + פַּסִּים וְעִגּוּלִים) ─────────────────
   The bridge games' third learning aid, after the workbook page on EQUATIONS
   (מִשְׁוָאוֹת: 6 + __ = 14). Two tools, side by side:

   1. THE TEMPLATE — the whole (שָׁלֵם) on top, the two parts (חֵלֶק) below. The
      child types the exercise's numbers into the right places. Every box judges
      itself against the real whole/parts: green = right place, red = not this
      one (a prefix of a right number stays neutral while she types). Under the
      template the MATCHING EXERCISE is written (the workbook's rule: whole and
      a part given → subtraction, two parts given → addition) and its slots fill
      as the boxes are placed right.
   2. THE DRAWING — bars (each = 5) and circles (each = 1). She draws the whole,
      taps to colour the given part, and counts what stays white: the missing
      number. A bar is FIVE units: every tap colours ONE MORE unit (a sixth tap
      clears it), so the exact number shows even when she drew the "wrong"
      bars for it — 6 can be one bar + one circle, or six units of two bars.
      Undo / clear; the total and the coloured count are shown (the uncoloured
      count is hers to find).

   Self-contained display+logic module in the jar_stage.js mould: injects its
   own .pw-* styles (skins may restyle; colours pull from --skin-*), loaded on
   demand by bg-loader.loadPartWhole; the driver in game/js/aids.js (PW) hands
   it the current problem.

   Contract:
     window.PART_WHOLE.mount({root}) → handle
       handle.set({whole, parts:[a,b], missing:'whole'|'part', given, max})
                        — a new problem: remembers the truth, clears everything
       handle.reset()   — empty the boxes and the drawing
       handle.state()   — {whole, parts, missing, given, boxes, judged, bars,
                           dots, total, painted, match, done}  (tests / dev)
       handle.cleanup()
       handle.root      — the mounted element (re-mount after a card rebuild) */
window.PART_WHOLE=window.PART_WHOLE||(()=>{

  const CSS=`
  .pw-root{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:14px 28px;direction:rtl}
  /* ── the template ── */
  .pw-tpl{display:flex;flex-direction:column;align-items:center;min-width:188px;position:relative}
  .pw-lbl{font-family:'Nunito',sans-serif;font-weight:900;font-size:.8rem;letter-spacing:.02em;line-height:1;
    color:rgba(255,255,255,.88);text-shadow:0 1px 4px rgba(0,0,0,.45)}
  .pw-whole-row,.pw-part-wrap{display:flex;flex-direction:column;align-items:center;gap:5px}
  .pw-inp{width:62px;height:52px;border-radius:14px;border:3px solid rgba(255,255,255,.55);background:rgba(255,255,255,.14);
    color:#fff;font-family:'Fredoka One',cursive;font-size:1.7rem;text-align:center;outline:none;-moz-appearance:textfield;
    box-shadow:0 3px 0 rgba(0,0,0,.25),inset 0 2px 6px rgba(0,0,0,.18);transition:border-color .18s,box-shadow .18s,background .18s}
  .pw-inp::-webkit-outer-spin-button,.pw-inp::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .pw-inp::placeholder{color:rgba(255,255,255,.45)}
  .pw-inp:focus{border-color:var(--skin-accent,#FFD166);box-shadow:0 0 0 4px rgba(255,209,102,.28),0 3px 0 rgba(0,0,0,.25)}
  .pw-inp.pw-ok{border-color:#4ade80;background:rgba(74,222,128,.24)}
  .pw-inp.pw-err{border-color:#ff5252;background:rgba(255,82,82,.22);animation:pwShake .32s}
  @keyframes pwShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
  .pw-whole{width:72px;height:58px;font-size:1.95rem}
  .pw-arms{width:170px;height:26px;display:block;margin:3px 0 1px}
  .pw-arms path{fill:none;stroke:rgba(255,255,255,.5);stroke-width:2.5;stroke-linecap:round;transition:stroke .25s}
  .pw-tpl.pw-whole-ok .pw-arms path{stroke:var(--skin-accent,#FFD166)}
  .pw-parts-row{display:flex;gap:30px}
  .pw-match{min-height:1.6em;margin-top:9px;font-family:'Fredoka One',cursive;font-size:1.35rem;color:#fff;letter-spacing:.04em;
    text-shadow:0 2px 8px rgba(0,0,0,.45);opacity:0;transition:opacity .25s;white-space:nowrap}
  .pw-match.on{opacity:1}
  .pw-tpl.pw-done .pw-inp.pw-ok{box-shadow:0 0 0 4px rgba(74,222,128,.3),0 0 18px rgba(74,222,128,.55)}
  .pw-tpl.pw-done .pw-match{color:#b9ffd0;animation:pwPop .4s cubic-bezier(.2,1.6,.4,1)}
  /* ── the drawing ── */
  .pw-draw{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1 1 240px;max-width:420px}
  .pw-tools{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
  .pw-btn{display:inline-flex;align-items:center;gap:7px;border:none;cursor:pointer;border-radius:12px;padding:7px 13px;
    font-family:'Nunito',sans-serif;font-size:1.05rem;font-weight:900;color:#4a0080;
    background:linear-gradient(145deg,#FFE57F,#FFD740,#FF8F00);box-shadow:0 3px 0 #E65100,0 4px 12px rgba(255,160,0,.4);
    transition:transform .08s;user-select:none;-webkit-tap-highlight-color:transparent}
  .pw-btn:active{transform:translateY(2px)}
  .pw-btn:disabled{opacity:.4;cursor:default;transform:none}
  .pw-btn.pw-undo,.pw-btn.pw-clear{background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.2);color:rgba(255,210,255,.9);
    box-shadow:none;font-size:1.15rem;padding:5px 11px}
  .pw-ico-bar{display:inline-block;width:30px;height:9px;border-radius:3px;background:#4a0080}
  .pw-ico-dot{display:inline-block;width:11px;height:11px;border-radius:50%;background:#4a0080}
  .pw-canvas{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 9px;min-height:46px;width:100%;
    padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.07);border:1px dashed rgba(255,255,255,.28)}
  .pw-item{border:none;padding:0;cursor:pointer;background:transparent;-webkit-tap-highlight-color:transparent;line-height:0}
  .pw-item i{display:block;box-sizing:border-box;border:2.5px solid rgba(255,255,255,.92);background:transparent;
    box-shadow:0 0 0 1.5px rgba(0,0,0,.45),inset 0 0 0 1px rgba(0,0,0,.22);transition:background .15s,transform .15s}
  .pw-bar i{width:58px;height:16px;border-radius:4px;display:flex;overflow:hidden}
  /* a bar is five UNITS — thin dividers show them; each tap colours one more */
  .pw-bar s{flex:1 1 0;display:block;text-decoration:none;border-inline-end:1.5px solid rgba(0,0,0,.28);transition:background .15s}
  .pw-bar s:last-child{border-inline-end:none}
  .pw-bar s.on{background:var(--skin-accent,#FFD166)}
  .pw-dot i{width:18px;height:18px;border-radius:50%}
  .pw-item.on i{border-color:#fff}
  .pw-dot.on i{background:var(--skin-accent,#FFD166)}
  .pw-item:hover i{transform:scale(1.08)}
  .pw-item.pw-new i{animation:pwPop .32s cubic-bezier(.2,1.6,.4,1)}
  @keyframes pwPop{0%{transform:scale(.3)}100%{transform:scale(1)}}
  .pw-counts{display:flex;gap:18px;font-family:'Nunito',sans-serif;font-weight:900;font-size:.9rem;color:rgba(255,255,255,.85);
    text-shadow:0 1px 4px rgba(0,0,0,.45)}
  .pw-count b{font-family:'Fredoka One',cursive;font-size:1.2rem;color:#fff;margin-inline-start:4px}
  .pw-count.pw-ok b{color:#4ade80}
  .pw-count.pw-ok::after{content:' ✓';color:#4ade80}
  @media(max-width:480px){
    .pw-root{gap:10px 16px}.pw-bar i{width:46px;height:14px}.pw-dot i{width:15px;height:15px}
    .pw-inp{width:54px;height:46px;font-size:1.45rem}.pw-whole{width:62px;height:52px;font-size:1.7rem}
    .pw-parts-row{gap:22px}.pw-arms{width:150px}.pw-btn{padding:6px 10px;font-size:.95rem}
  }`;
  function injectCSS(){
    if(document.getElementById('pw-style'))return;
    const s=document.createElement('style');s.id='pw-style';s.textContent=CSS;document.head.appendChild(s);
  }

  const EMPTY='___';
  const clean=v=>String(v||'').replace(/[^0-9]/g,'').slice(0,2);

  function mount({root}){
    injectCSS();
    root.classList.add('pw-root');
    root.innerHTML=
      `<div class="pw-tpl">`+
        `<div class="pw-whole-row"><span class="pw-lbl pw-lbl-whole">שָׁלֵם</span>`+
          `<input class="pw-inp pw-whole" type="number" inputmode="numeric" autocomplete="off" placeholder="?" min="0" max="99" aria-label="שָׁלֵם"></div>`+
        `<svg class="pw-arms" viewBox="0 0 170 26" preserveAspectRatio="none"><path d="M85 2 L40 24"/><path d="M85 2 L130 24"/></svg>`+
        `<div class="pw-parts-row">`+
          `<div class="pw-part-wrap"><input class="pw-inp pw-part" data-i="0" type="number" inputmode="numeric" autocomplete="off" placeholder="?" min="0" max="99" aria-label="חֵלֶק"><span class="pw-lbl">חֵלֶק</span></div>`+
          `<div class="pw-part-wrap"><input class="pw-inp pw-part" data-i="1" type="number" inputmode="numeric" autocomplete="off" placeholder="?" min="0" max="99" aria-label="חֵלֶק"><span class="pw-lbl">חֵלֶק</span></div>`+
        `</div>`+
        `<div class="pw-match" dir="ltr"></div>`+
      `</div>`+
      `<div class="pw-draw">`+
        `<div class="pw-tools">`+
          `<button type="button" class="pw-btn pw-add-bar" title="פַּס = 5"><i class="pw-ico-bar"></i><b>5</b></button>`+
          `<button type="button" class="pw-btn pw-add-dot" title="עִגּוּל = 1"><i class="pw-ico-dot"></i><b>1</b></button>`+
          `<button type="button" class="pw-btn pw-undo" title="בַּטְּלִי">↩</button>`+
          `<button type="button" class="pw-btn pw-clear" title="נַקִּי">↺</button>`+
        `</div>`+
        `<div class="pw-canvas" dir="ltr"></div>`+
        `<div class="pw-counts"><span class="pw-count pw-total-w">סַךְ הַכֹּל<b class="pw-total">0</b></span>`+
          `<span class="pw-count pw-painted-w">צָבוּעַ<b class="pw-painted">0</b></span></div>`+
      `</div>`;
    const q=s=>root.querySelector(s);
    const tpl=q('.pw-tpl'),whole=q('.pw-whole'),parts=[...root.querySelectorAll('.pw-part')],match=q('.pw-match');
    const canvas=q('.pw-canvas'),totalEl=q('.pw-total'),paintedEl=q('.pw-painted'),totalW=q('.pw-total-w');
    const bBar=q('.pw-add-bar'),bDot=q('.pw-add-dot'),bUndo=q('.pw-undo'),bClear=q('.pw-clear');
    const boxes=[whole,...parts];
    let truth={whole:null,parts:[],missing:'part',given:null},MAX=30;
    let items=[];          // the drawing, in the order drawn: {k:'bar'|'dot', on} — on = coloured UNITS (bar 0..5, circle 0..1)
    let last=-1;           // the PART box edited last (settles a duplicate)
    let st={w:null,p:[null,null],done:false};

    /* ── the template: every box judges itself against the truth ── */
    function markBox(el,s){el.classList.remove('pw-ok','pw-err');if(s)el.classList.add('pw-'+s);}
    // 'ok' | 'err' | null (empty, or a prefix of a right number while she types)
    function judgeWhole(){
      const v=whole.value,W=truth.whole;
      if(v===''||W==null)return null;
      if(+v===W)return 'ok';
      return String(W).startsWith(v)?null:'err';
    }
    function judgePart(i){
      const v=parts[i].value,P=truth.parts;
      if(v===''||!P.length)return null;
      const me=+v,ov=parts[1-i].value,rem=[...P];
      // the other box already holds a part → this one must be the REMAINING part.
      // Equal parts (7 | 7) share freely; a duplicate of a distinct part is the
      // fault of the box edited LAST, the earlier one keeps its green.
      if(ov!==''&&P.includes(+ov)&&P[0]!==P[1]&&!(+ov===me&&last===1-i)){
        const k=rem.indexOf(+ov);if(k>=0)rem.splice(k,1);
      }
      if(rem.includes(me))return 'ok';
      return rem.some(x=>String(x).startsWith(v))?null:'err';
    }
    function judge(){
      const sw=judgeWhole();markBox(whole,sw);
      const sp=[judgePart(0),judgePart(1)];parts.forEach((el,i)=>markBox(el,sp[i]));
      tpl.classList.toggle('pw-whole-ok',sw==='ok');
      const done=sw==='ok'&&sp[0]==='ok'&&sp[1]==='ok';
      tpl.classList.toggle('pw-done',done);
      renderMatch(sw==='ok',sp);
      st={w:sw,p:sp,done};
    }
    // the matching exercise (the workbook's rule): whole & a part → subtraction,
    // two parts → addition. Its slots fill as the boxes are placed right.
    function renderMatch(wOk,sp){
      const W=truth.whole,P=truth.parts;
      const have=parts.map((el,i)=>sp[i]==='ok'?+el.value:null).filter(v=>v!=null);
      const any=wOk||have.length>0;
      match.classList.toggle('on',any);
      if(!any){match.textContent='';return;}
      const has=v=>{const k=have.indexOf(v);if(k>=0){have.splice(k,1);return true;}return false;};
      if(truth.missing==='whole'){
        const a=has(P[0])?P[0]:EMPTY,b=has(P[1])?P[1]:EMPTY;
        match.textContent=`${a} + ${b} = ${wOk?W:EMPTY}`;
      }else{
        const g=truth.given,o=W-g;
        const gs=has(g)?g:EMPTY,os=has(o)?o:EMPTY;
        match.textContent=`${wOk?W:EMPTY} − ${gs} = ${os}`;
      }
    }
    boxes.forEach((el,i)=>{
      el.addEventListener('input',()=>{el.value=clean(el.value);if(i>0)last=i-1;judge();});
      // Enter walks whole → part → part → the exercise's own answer box
      el.addEventListener('keydown',e=>{
        if(e.key!=='Enter')return;
        e.preventDefault();e.stopPropagation();
        const nxt=boxes[i+1]||document.getElementById('ans');
        if(nxt&&!nxt.disabled)nxt.focus();else el.blur();
      });
    });

    /* ── the drawing: bars of five and circles of one ── */
    const val=it=>it.k==='bar'?5:1;
    const total=()=>items.reduce((s,it)=>s+val(it),0);
    const painted=()=>items.reduce((s,it)=>s+it.on,0);   // coloured UNITS
    function render(newIdx){
      canvas.innerHTML='';
      const tagged=items.map((it,i)=>({it,i}));
      // bars first, then circles — the workbook's "short drawing" of a number
      [...tagged.filter(o=>o.it.k==='bar'),...tagged.filter(o=>o.it.k==='dot')].forEach(({it,i})=>{
        const b=document.createElement('button');b.type='button';
        b.className='pw-item pw-'+it.k+(it.on>0?' on':'')+(it.on===val(it)?' full':'')+(i===newIdx?' pw-new':'');
        b.dataset.on=it.on;
        b.setAttribute('aria-pressed',it.on>0?'true':'false');
        b.title=it.k==='bar'?`פַּס = 5 (צָבוּעַ ${it.on})`:'עִגּוּל = 1';
        // a bar carries its five units; the first `on` of them are coloured
        b.innerHTML=it.k==='bar'
          ?'<i>'+[0,1,2,3,4].map(u=>`<s${u<it.on?' class="on"':''}></s>`).join('')+'</i>'
          :'<i></i>';
        // tap → one more unit coloured (a full item clears back to none)
        b.onclick=()=>{it.on=(it.on+1)%(val(it)+1);render();};
        canvas.appendChild(b);
      });
      const t=total();
      totalEl.textContent=t;paintedEl.textContent=painted();
      totalW.classList.toggle('pw-ok',truth.whole!=null&&t===truth.whole);
      bBar.disabled=t+5>MAX;bDot.disabled=t+1>MAX;
      bUndo.disabled=bClear.disabled=!items.length;
    }
    function add(k){if(total()+(k==='bar'?5:1)>MAX)return;items.push({k,on:0});render(items.length-1);}
    bBar.onclick=()=>add('bar');
    bDot.onclick=()=>add('dot');
    bUndo.onclick=()=>{items.pop();render();};
    bClear.onclick=()=>{items=[];render();};

    /* ── handle ── */
    function reset(){
      boxes.forEach(el=>{el.value='';markBox(el,null);});
      tpl.classList.remove('pw-done','pw-whole-ok');
      match.textContent='';match.classList.remove('on');
      items=[];last=-1;st={w:null,p:[null,null],done:false};
      render();
    }
    function set(p){
      truth={whole:p.whole,parts:[...p.parts],missing:p.missing||'part',given:p.given!=null?p.given:p.parts[0]};
      MAX=p.max||30;
      reset();
    }
    function state(){
      return{whole:truth.whole,parts:[...truth.parts],missing:truth.missing,given:truth.given,
        boxes:boxes.map(el=>el.value),judged:st,
        bars:items.filter(it=>it.k==='bar').length,dots:items.filter(it=>it.k==='dot').length,
        items:items.map(it=>({k:it.k,on:it.on})),
        total:total(),painted:painted(),match:match.textContent,done:!!st.done};
    }
    function cleanup(){root.innerHTML='';root.classList.remove('pw-root');}
    render();
    return{root,set,reset,state,cleanup};
  }

  return{mount};
})();
