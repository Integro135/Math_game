/* ── Boot ── */
NL.attachDocumentEvents();
NL.attachBarEvents();
renderModePicker();
applyTheme();
spawnParticles();
updateGiftIndicator();
bootIntroSplash();   // the opening celebration (toggle lives in settings)
// the mode's exercise-type files load dynamically (one file per type).
// GUARD: if a mode is picked before the boot load finishes, setMode's own
// callback owns the pool — this late one must not overwrite it.
{const _bootMode=mode;
// (booting into גָּשֵׁר 10 builds its pool below; makeBridgePool advances the
//  set every build, so reloads alternate instead of always replaying set 1)
loadExercisesFor(_bootMode,()=>{
  if(mode!==_bootMode)return;
  problems=makePool(_bootMode);
  loadProblem();
  buildGamesMenu();
});}

document.addEventListener('keydown',e=>{
  if(e.key!=='Delete'&&e.key!=='Escape')return;
  // ESC closes the settings modal first (and does nothing else)
  if(e.key==='Escape'){
    const so=document.getElementById('settings-ov');
    if(so&&so.style.display==='flex'){e.preventDefault();closeSettings();return;}
  }
  const ae=document.activeElement;
  if(ae&&ae.tagName==='INPUT'&&ae.type!=='number')return;
  // Clear focused number input (in addition to pgmUndo)
  if(e.key==='Delete'&&ae&&ae.tagName==='INPUT'&&ae.type==='number'&&!ae.disabled&&ae.value!==''){
    ae.value='';
    ae.dispatchEvent(new Event('input',{bubbles:true}));
  }
  // Undo last step on the cookie-jar number line
  if(document.getElementById('chain-tools')?.style.display!=='none'){
    e.preventDefault();pgmUndo();
  }
});

document.addEventListener('keydown',e=>{
  if(e.key!==' ')return;
  // a celebration is showing → spacebar is owned by its skip handler
  if(typeof _fwOn!=='undefined'&&_fwOn)return;
  const panels=['sad-ov','report-ov'];
  if(panels.some(id=>{const el=document.getElementById(id);return el&&el.style.display&&el.style.display!=='none';}))return;
  // TCA (column addition): spacebar hops the kangaroo NL forward (add direction).
  // The focused digit box is a TEXT input and the NL is interactive from the
  // start in Superman, so handle it BEFORE the text-field / try-first guards.
  if(ptype===TCA){
    const nlp=document.getElementById('nl-panel');
    if(!done&&nlp&&nlp.style.display!=='none'){e.preventDefault();NL.step(1);}
    return;
  }
  const ae=document.activeElement;
  if(ae&&(ae.tagName==='TEXTAREA'||(ae.tagName==='INPUT'&&ae.type!=='number')))return;
  if(tryFirst===0)return;
  // TC (coins): spacebar moves kangaroo forward
  if(ptype===TC){e.preventDefault();if(!done)NL.step(1);return;}
  // Chain mode (TX/TZ): spacebar controls cookie jar
  if((ptype===TX||ptype===TZ)&&document.getElementById('chain-tools')?.style.display!=='none'){
    e.preventDefault();
    if(!done){const sub1=document.getElementById('tx-sub1');const isAdd=ptype===TZ||(ptype===TX&&sub1&&sub1.value!=='');if(isAdd)pgmPlus();else pgmMinus();}
    return;
  }
  // TT (tens): spacebar steps the kangaroo NL in the correct direction
  if(ptype===TT){e.preventDefault();if(!done){NL.step(ttOp==='add'?1:-1);}return;}
  // TBG (big ± small): spacebar steps the windowed NL in the problem direction
  if(ptype===TBG){e.preventDefault();if(!done){NL.step(bgOp==='add'?1:-1);}return;}
  // Kangaroo NL (kang mode): spacebar moves kangaroo forward (add) or backward (sub)
  if(aidMode==='kang'&&document.getElementById('nl-panel')?.style.display!=='none'){
    e.preventDefault();
    if(!done){const _add=ptype===TA||ptype===TCA||ptype===TZ||(ptype===TX&&tzAddMode());NL.step(_add?1:-1);}
    return;
  }
  if(done)return;
  // Cookie jar (nl mode): spacebar adds/removes a cookie per problem direction
  if(aidMode==='nl'&&document.getElementById('chain-tools')?.style.display!=='none'){
    e.preventDefault();
    const isAdd=ptype===TDA||ptype===TA||ptype===TZ||(ptype===TX&&tzAddMode());
    if(isAdd)pgmPlus();else pgmMinus();
  }
});

