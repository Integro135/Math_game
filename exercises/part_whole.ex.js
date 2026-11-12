/* ── Exercise type: WHOLE AND PARTS (TPW, 'part_whole') — 🧩 ─────────────────
   The bridges' part–whole card (2026-11-02, user: "writing the whole and the
   parts should be PART OF THE EXERCISE, including the bars and dots — a new
   kind of exercise, every 2 exercises in גשר 10 and גשר 20"). After the
   workbook page on equations (6 + __ = 14).

   The card shows the fact as an equation with its blank (9 + 6 = ___,
   6 + ___ = 14, 15 − 9 = ___, 16 − ___ = 7) and, under it, the part–whole
   board (aids/part_whole.js): the whole on top, two parts below, and the
   drawing of bars (5) and circles (1). To solve it she writes the whole and
   both parts in their places (every box judges itself; the missing number is
   one of them) and presses ✓. A wrong number in a box is a mistake
   (api.wrong); an empty box only gets a note (no penalty). The drawing is
   there to help her count — it is NOT required: right numbers solve the card
   whatever the drawing shows (2026-11-10, user: the drawing should not be a
   must when she solved it correctly).

   Built from the bridge sets' own facts by problems.js _weavePartWhole (the
   fact stays in `src` for the curriculum order check). Problem shape:
   { t:TPW, a:<the missing number>, b:0, whole, parts:[x,y], missing:'whole'|'part',
     given, eq:'<the equation text>', src:{t,a,b} }.
   Self-contained interactive type, mounted by core.js _colxMount into
   #colx-root; self-checks via api.solved()/api.wrong().                    */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.part_whole=(()=>{

  const BLANK='___';
  // a fact {t,a,b} → the part–whole card. TA a+b; TS a−b; TMA a + __ = b; TM a − __ = b
  function fromFact(src){
    const {t,a,b}=src;let f;
    if(t===TA)       f={whole:a+b,parts:[a,b],missing:'whole',given:a,ans:a+b,eq:`${a} + ${b} = ${BLANK}`};
    else if(t===TS)  f={whole:a,parts:[b,a-b],missing:'part',given:b,ans:a-b,eq:`${a} − ${b} = ${BLANK}`};
    else if(t===TMA) f={whole:b,parts:[a,b-a],missing:'part',given:a,ans:b-a,eq:`${a} + ${BLANK} = ${b}`};
    else if(t===TM)  f={whole:a,parts:[b,a-b],missing:'part',given:b,ans:a-b,eq:`${a} − ${BLANK} = ${b}`};
    else return null;
    return{t:TPW,a:f.ans,b:0,whole:f.whole,parts:f.parts,missing:f.missing,given:f.given,eq:f.eq,src:{t,a,b}};
  }

  const CSS=`
  .pwx{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
  .pwx-eq{font-family:'Fredoka One',cursive;font-size:2.4rem;line-height:1.1;color:#fff;letter-spacing:.04em;
    text-shadow:0 3px 0 rgba(0,0,0,.18),0 8px 18px rgba(0,0,0,.32);white-space:nowrap}
  /* a FIXED width, drawing always under the template: #colx-root is shrink-to-fit,
     so a content-sized board let the 4th bar pull the drawing up beside the template */
  .pwx-board{width:min(420px,calc(100vw - 48px))}
  .pwx .pw-root{flex-direction:column;align-items:center;flex-wrap:nowrap}
  .pwx .pw-draw{flex:none;width:100%;max-width:none}
  .pwx-foot{display:flex;align-items:center;gap:14px;justify-content:center;flex-wrap:wrap}
  .pwx-note{min-height:1.3em;font-family:'Nunito',sans-serif;font-weight:900;font-size:1rem;color:#ffe08a;
    text-shadow:0 1px 4px rgba(0,0,0,.5);text-align:center}
  .pwx.pwx-done .pwx-board{pointer-events:none}
  .pwx.pwx-done .pwx-eq{color:#b9ffd0}
  body.theme-girls .pwx-eq{color:#5a2a78;text-shadow:0 2px 0 rgba(255,255,255,.6)}
  body.theme-girls .pwx-note{color:#7A3E9E;text-shadow:none}
  @media(max-width:480px){.pwx-eq{font-size:1.7rem}}`;
  function injectCSS(){
    if(document.getElementById('pwx-style'))return;
    const s=document.createElement('style');s.id='pwx-style';s.textContent=CSS;document.head.appendChild(s);
  }

  function mount({root,p,api}){
    injectCSS();
    root.innerHTML=
      `<div class="pwx"><div class="pwx-eq" dir="ltr">${p.eq||''}</div>`+
      `<div class="pwx-board"></div>`+
      `<div class="pwx-foot"><button type="button" class="chk-btn pwx-chk" title="בְּדִיקָה">✔?</button></div>`+
      `<div class="pwx-note"></div></div>`;
    const box=root.querySelector('.pwx'),board=root.querySelector('.pwx-board'),
          note=root.querySelector('.pwx-note'),chk=root.querySelector('.pwx-chk');
    let h=null,dead=false,solved=false;
    loadPartWhole(()=>{
      if(dead)return;
      h=PART_WHOLE.mount({root:board});
      h.set({whole:p.whole,parts:p.parts,missing:p.missing,given:p.given,max:30});
      setTimeout(()=>{if(!dead)board.querySelector('.pw-whole')?.focus();},80);
    });
    const say=t=>{note.textContent=t;};
    function check(){
      if(solved||!h)return;
      h.reveal();                                          // ✓ shows the boxes' verdict, as Enter does
      const st=h.state(),[w,p0,p1]=st.boxes;
      if(w===''||p0===''||p1===''){say('כִּתְבִי אֶת הַשָּׁלֵם וְאֶת שְׁנֵי הַחֲלָקִים 💗');return;}
      const j=st.judged;
      if(j.w!=='ok'||j.p[0]!=='ok'||j.p[1]!=='ok'){
        say('');api.wrong(`${w} | ${p0} ${p1}`);return;      // a wrong number = a mistake
      }
      solved=true;                                         // right numbers solve it — the drawing is optional
      box.classList.add('pwx-done');
      box.querySelector('.pwx-eq').textContent=st.match;   // the equation, filled in
      say('');api.solved();
    }
    chk.onclick=check;
    // Enter in the last part box checks the card
    board.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.pw-part[data-i="1"]'))check();},true);
    return()=>{dead=true;if(h)h.cleanup();root.innerHTML='';};
  }

  return{
    t:TPW,
    modes:['br','b20'],
    aidsReveal:'always',           // the board IS the exercise — never locked
    fromFact,
    make(){return[];},             // woven into the bridge sets by problems.js _weavePartWhole
    mount,
  };
})();
