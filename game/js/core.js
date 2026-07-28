/* ── Gift reward thresholds (grade out of 1000) ─────────────────────────────
   Per-game prize levels. The defaults below ship enabled for the reward games;
   a parent can set ANY game's level from settings (renderPrizeConfig →
   setGiftGoal), persisted in localStorage 'giftGoals'. A level of 0 / empty
   means NO prize for that game — no 🎁 badge on its picker button, no gift
   screen on completion. GIFT_GOALS holds ONLY the games that currently have a
   prize (a game with no prize is absent), so `GIFT_GOALS[mode]` is falsy then. */
const DEFAULT_GIFT_GOALS={sup:800,mulc:700};   // ONLY Superman (800) + אַלּוּפָה (700) carry a prize; every other game absent → no prize
const GIFT_GOALS={};
function _savedGiftGoals(){try{return JSON.parse(localStorage.getItem('giftGoals')||'{}')||{};}catch(e){return {};}}
function _rebuildGiftGoals(){
  for(const k in GIFT_GOALS)delete GIFT_GOALS[k];
  Object.assign(GIFT_GOALS,DEFAULT_GIFT_GOALS);
  const ov=_savedGiftGoals();
  for(const k in ov){const v=parseInt(ov[k],10);
    if(v>0)GIFT_GOALS[k]=Math.min(1000,v); else delete GIFT_GOALS[k];}   // override: 0/empty removes the prize
}
_rebuildGiftGoals();
/* set (or clear, with 0/empty) a game's prize level; persists + refreshes UI */
function setGiftGoal(m,val){
  const ov=_savedGiftGoals();
  let v=parseInt(val,10); if(isNaN(v)||v<0)v=0; if(v>1000)v=1000;
  ov[m]=v;                                   // store 0 explicitly = "no prize"
  try{localStorage.setItem('giftGoals',JSON.stringify(ov));}catch(e){}
  _rebuildGiftGoals();
  if(typeof renderModePicker==='function')renderModePicker();   // refresh the 🎁 badges
  if(typeof updateGiftIndicator==='function')updateGiftIndicator();
}
const GIFT_MODE_LABELS={br:'גָּשֵׁר 10',b20:'גָּשֵׁר 20',mx:'מַלְכָּה',sup:'סוּפֶּרְמֶן',mulc:'אַלּוּפָה'};
/* ── Prize COUNT per win ─────────────────────────────────────────────────────
   How many prizes a winning set awards for each game (default 1, but אַלּוּפָה
   gives ×2 out of the box — DEFAULT_GIFT_COUNTS). Parent-configurable from the
   settings prizes tab (the ×N input next to the goal), persisted in localStorage
   'giftCounts'. GIFT_COUNTS holds ONLY counts ≥ 2 (1 = the plain single prize),
   so giftCount(mode) is the single read point. A saved override of 1 removes the
   multiplier even where a default ×N exists. */
const DEFAULT_GIFT_COUNTS={mulc:2};   // אַלּוּפָה awards ×2 prizes per win by default
const GIFT_COUNTS={};
function _savedGiftCounts(){try{return JSON.parse(localStorage.getItem('giftCounts')||'{}')||{};}catch(e){return {};}}
function _rebuildGiftCounts(){
  for(const k in GIFT_COUNTS)delete GIFT_COUNTS[k];
  for(const k in DEFAULT_GIFT_COUNTS){const v=DEFAULT_GIFT_COUNTS[k];if(v>=2)GIFT_COUNTS[k]=v;}
  const ov=_savedGiftCounts();
  for(const k in ov){const v=parseInt(ov[k],10);if(v>=2)GIFT_COUNTS[k]=Math.min(99,v);else delete GIFT_COUNTS[k];}
}
_rebuildGiftCounts();
function giftCount(m){return GIFT_COUNTS[m]||1;}
/* set a game's per-win prize count (1..99; 1/empty = the default single) */
function setGiftCount(m,val){
  const ov=_savedGiftCounts();
  let v=parseInt(val,10);if(isNaN(v)||v<1)v=1;if(v>99)v=99;
  ov[m]=v;
  try{localStorage.setItem('giftCounts',JSON.stringify(ov));}catch(e){}
  _rebuildGiftCounts();
  if(typeof renderModePicker==='function')renderModePicker();   // refresh the 🎁×N badges
  if(typeof updateGiftIndicator==='function')updateGiftIndicator();
}
function updateGiftIndicator(){
  const ind=document.getElementById('gift-indicator');
  if(!ind)return;
  const goal=GIFT_GOALS[mode];
  if(!goal){ind.style.display='none';return;}
  ind.style.display='flex';
  const nxt=document.getElementById('gift-next');
  const c=giftCount(mode);
  if(nxt)nxt.textContent=`🎁${c>1?'×'+c:''} המתנה הבאה: ${goal}`;
}

/* ── State ── */
const GL=12;
/* the chosen game persists across refreshes (localStorage 'gameMode'). The
   stored value is a string, so we resolve it back through DIFFICULTY_GROUPS
   to recover the ORIGINAL id type (number 10 vs string 'mx') — equality
   checks and the active-button marker rely on that type. Falls back to 'mx'
   when nothing valid is saved. */
function _savedMode(){
  let raw=null;
  try{raw=localStorage.getItem('gameMode');}catch(e){}
  if(raw==null)return 'mx';
  for(const g of DIFFICULTY_GROUPS)for(const md of g.modes)
    if(String(md.id)===raw)return md.id;
  return 'mx';
}
function _persistMode(){try{localStorage.setItem('gameMode',String(mode));}catch(e){}}
let mode=_savedMode(),score=0,idx=0,problems=[],done=false;
let aidMode='kang'; // 'kang' = kangaroo NL (default) | 'nl' = cookie jar
let ptype,num1,num2,num3,num4=0,aidUsed=false;
let tcCoins=[];  // current TC problem's coin list
let ttOp='add'; // current TT problem operator: 'add' | 'sub'
let bgOp='sub'; // current TBG (big ± small) operator: 'add' | 'sub'
let wpOp='sub'; // current TWP (word problem) operator: 'add' | 'sub'
let wcOps=['add','sub']; // current TWC (chain word problem) ops: [op1,op2] each 'add'|'sub'
/* the left-to-right result of a TWC chain a op1 b op2 c */
function _wc(a,b,c,ops){const r=(ops&&ops[0])==='sub'?a-b:a+b;return (ops&&ops[1])==='sub'?r-c:r+c;}
let report=[];

/* ── Mode switch ── */
function setMode(m){
  // re-selecting גָּשֵׁר 10 starts a fresh game with the NEXT set (rotation);
  // every other mode is a no-op when already active
  if(mode===m&&m!=='br')return;
  mode=m;aidMode='kang';
  _persistMode();                // remember the chosen game across refreshes
  // (גָּשֵׁר 10 alternates its two sets inside makeBridgePool, on every build)
  pgmCV=0;pgmCk=[];pgmArcs=[];pgmTensMode=false;
  _pickerTier=null;            // follow the selected mode's tier
  renderModePicker();
  closeSettings();             // picking a game closes the settings modal
  score=0;idx=0;report=[];document.getElementById('score-val').textContent='0';
  // the mode's exercise-type files load dynamically (one file per type);
  // synchronous when already cached, so repeat visits never flicker
  loadExercisesFor(m,()=>{
    if(mode!==m)return;        // user switched again while loading
    problems=makePool(m);
    rebuildCard();loadProblem();updateGiftIndicator();
  });
}

/* ── Mode picker — rendered from DIFFICULTY_GROUPS (data.js) ────────────────
   Lives inside the SETTINGS MODAL (#settings-ov, opened via the ⚙️ gear next
   to the theme button). The header shows only a read-only indicator of the
   current game (#mode-ind); changing the game requires opening settings.
   Buttons keep their historical ids (lb0, lb5, lbbr, lbmx…) so external
   automation keeps working; the picker stays in the DOM even when the modal
   is closed (only hidden via CSS). */
let _pickerTier=null;
function renderModePicker(){
  const modeTier=DIFFICULTY_GROUPS.find(g=>g.modes.some(md=>md.id===mode))||DIFFICULTY_GROUPS[0];
  const tier=_pickerTier||modeTier.id;
  const cur=DIFFICULTY_GROUPS.flatMap(g=>g.modes).find(md=>md.id===mode);
  // header indicator — which game am I in right now?
  const ind=document.getElementById('mode-ind');
  if(ind)ind.innerHTML=`<span class="mi-lbl">${modeTier.label} ·</span> <span class="mi-cur">${cur?cur.label:''}</span>`;
  const row=document.getElementById('level-row');
  if(!row)return;
  let h='<div class="tier-tabs">';
  for(const g of DIFFICULTY_GROUPS)
    h+=`<button class="tier-tab${g.id===tier?' active':''}" data-tier="${g.id}" onclick="pickTier('${g.id}')">${g.label}</button>`;
  h+='</div>';
  h+='<div class="tier-sep"></div>';   // divider: category tabs ↑  /  that category's games ↓
  for(const g of DIFFICULTY_GROUPS){
    h+=`<div class="tier-modes${g.id===tier?' tier-active':''}" data-tier="${g.id}">`;
    for(const md of g.modes){
      const idArg=typeof md.id==='string'?`'${md.id}'`:md.id;
      // a 🎁 badge appears only when this game currently has a prize set;
      // a configured multi-prize win shows the multiplier (🎁×3)
      const _gc=giftCount(md.id);
      const lbl=md.label+(GIFT_GOALS[md.id]>0?(' 🎁'+(_gc>1?'×'+_gc:'')):'');
      h+=`<button class="lvl-btn${md.id===mode?' active':''}" id="lb${md.id}" onclick="setMode(${idArg})">${lbl}</button>`;
    }
    h+='</div>';
  }
  row.innerHTML=h;
}
function pickTier(t){_pickerTier=t;renderModePicker();}
/* settings sub-tabs: 'general' | 'prizes' | 'history' */
let _setTab='general';
function _applySetTab(){
  const box=document.querySelector('#settings-ov .settings-box');
  if(!box)return;
  box.querySelectorAll('.set-tab').forEach(b=>b.classList.toggle('active',b.dataset.stab===_setTab));
  box.querySelectorAll('.set-panel').forEach(p=>p.classList.toggle('set-panel-active',p.dataset.stab===_setTab));
}
function pickSetTab(t){
  _setTab=t;
  if(t==='history')renderHistory();          // refresh on view
  else if(t==='prizes')renderPrizeConfig();
  _applySetTab();
}
/* prize-level editor (settings): one row per game — the 0–1000 goal input
   (0 / empty clears that game's prize, see setGiftGoal) + the 🎁× per-win
   prize COUNT input (1 = a single prize, see setGiftCount). */
function renderPrizeConfig(){
  const row=document.getElementById('prize-row');
  if(!row)return;
  let h='';
  for(const g of DIFFICULTY_GROUPS){
    for(const md of g.modes){
      const idArg=typeof md.id==='string'?`'${md.id}'`:md.id;
      const v=GIFT_GOALS[md.id]>0?GIFT_GOALS[md.id]:'';
      h+=`<label class="prize-item"><span class="prize-lbl">${md.label}</span>`+
         `<span class="prize-ctl">`+
         `<input type="text" inputmode="numeric" class="prize-inp" id="pz${md.id}" value="${v}" placeholder="0" title="גֹּבַהּ הַפְּרָס (0 = אֵין)"`+
         ` oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,4);setGiftGoal(${idArg},this.value)">`+
         `<span class="prize-x">🎁×</span>`+
         `<input type="text" inputmode="numeric" class="prize-inp prize-cnt" id="pc${md.id}" value="${giftCount(md.id)}" title="כַּמָּה פְּרָסִים בִּזְכִיָּה"`+
         ` oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,2);setGiftCount(${idArg},this.value)">`+
         `</span></label>`;
    }
  }
  row.innerHTML=h;
}
/* column-subtraction borrow method: 'hybrid' (demo the regrouping once, then the
   child taps the tens to borrow) or 'auto' (the regrouping animates itself on
   every borrow — a passive demonstration). Chosen from the settings toggle and
   read by exercises/column_sub.ex.js at mount. Default: hybrid. */
function subBorrowMode(){try{return localStorage.getItem('subBorrow')==='auto'?'auto':'hybrid';}catch(e){return 'hybrid';}}
function setSubBorrowMode(v){
  try{localStorage.setItem('subBorrow',v==='auto'?'auto':'hybrid');}catch(e){}
  const cb=document.getElementById('borrow-toggle');
  if(cb)cb.checked=(v==='auto');
}
/* ── Settings modal ── */
function openSettings(e){
  if(e)e.stopPropagation();
  _pickerTier=null;            // open on the current mode's tier
  _setTab='general';           // always open on the general tab
  renderModePicker();
  renderPrizeConfig();         // per-game prize-level inputs (prizes tab)
  renderHistory();             // run-history list (history tab)
  _applySetTab();
  // sync the intro-splash toggle with its saved state
  const cb=document.getElementById('intro-toggle');
  if(cb&&typeof introEnabled==='function')cb.checked=introEnabled();
  // sync the column-subtraction borrow-method toggle
  const bt=document.getElementById('borrow-toggle');
  if(bt&&typeof subBorrowMode==='function')bt.checked=(subBorrowMode()==='auto');
  // sync the player-name field with its saved value
  const ni=document.getElementById('name-input');
  if(ni&&typeof playerName==='function')ni.value=playerName();
  const o=document.getElementById('settings-ov');
  if(o)o.style.display='flex';
}
function closeSettings(){
  const o=document.getElementById('settings-ov');
  if(o)o.style.display='none';
}

/* ── Parent gate — a single-digit × single-digit challenge that guards the
   settings modal; settings open only after a correct answer ── */
let _parentAns=0;
function openParentGate(e){
  if(e)e.stopPropagation();
  const a=2+Math.floor(Math.random()*8), b=2+Math.floor(Math.random()*8);  // 2..9
  _parentAns=a*b;
  const q=document.getElementById('parent-q');
  if(q)q.textContent=a+' × '+b+' = ?';
  const inp=document.getElementById('parent-ans'); if(inp)inp.value='';
  const err=document.getElementById('parent-err'); if(err)err.textContent='';
  const o=document.getElementById('parent-ov');
  if(o)o.style.display='flex';
  if(inp)setTimeout(()=>inp.focus(),30);
}
function closeParentGate(){
  const o=document.getElementById('parent-ov');
  if(o)o.style.display='none';
}
function checkParentGate(){
  const inp=document.getElementById('parent-ans');
  const err=document.getElementById('parent-err');
  if(!inp)return;
  if(parseInt(inp.value,10)===_parentAns){
    closeParentGate();
    openSettings();
  }else{
    if(err)err.textContent='לֹא נָכוֹן, נַסּוּ שׁוּב';
    inp.value=''; inp.focus();
  }
}

/* ── Problem ── */
function loadProblem(){
  if(idx>=problems.length){endGame();return}
  ({t:ptype,a:num1,b:num2,c:num3,d:num4}=problems[idx]);num3=num3||0;num4=num4||0;
  if(ptype===TC){tcCoins=[...(problems[idx].coins||[])].sort((a,b)=>b-a);num1=problems[idx].correct||0;num2=0;num3=0;num4=0;}
  if(ptype===TDA||ptype===TDS||ptype===TRA){num1=problems[idx].r||0;num2=0;}
  if(ptype===TT){ttOp=problems[idx].op||'add';}
  if(ptype===TBG){bgOp=problems[idx].op||'sub';}
  if(ptype===TWP){wpOp=problems[idx].op||'sub';}
  if(ptype===TWC){wcOps=problems[idx].ops||['add','sub'];}
  const _cor=ptype===TDA||ptype===TDS||ptype===TRA?num1:ptype===TC?num1:ptype===TPG||ptype===TPP||ptype===TCP||ptype===TTS||ptype===THF||ptype===TPL||ptype===TSQ||ptype===TCZ||ptype===TTF||ptype===TWM||ptype===TSO||ptype===TRH?num1:ptype===TMU?num2:ptype===TMC||ptype===TMK?num1*num2:ptype===TCM?num1/(num2||5):ptype===TIC?num1/(num2||2):ptype===TBC?num1*(num2||5):ptype===TWP?(wpOp==='add'?num1+num2:num1-num2):ptype===TWC?_wc(num1,num2,num3,wcOps):ptype===TT?(ttOp==='add'?num1+num2:num1-num2):ptype===TBG?(bgOp==='add'?num1+num2:num1-num2):ptype===TZ?num1+num2+num3+num4:ptype===TW?num1-num2-num3:ptype===TA||ptype===TCA||ptype===TVA||ptype===TH?num1+num2:ptype===TX?num1-num2+num3:num1-num2;
  report[idx]={ptype,num1,num2,num3,num4,correct:_cor,wrongs:[]};
  done=false;
  document.getElementById('prog-txt').textContent=`📖 תַּרְגִּיל ${idx+1} מִתּוֹךְ ${gameLen()}`;
  document.getElementById('prog-bar').style.width=`${(idx/gameLen())*100}%`;
  setFb('','');
  document.getElementById('hint').textContent=
    ptype===TCA?'🦸 חַבְּרִי בְּעַמּוּדוֹת: קֹדֶם אֲחָדוֹת, אַחַר כָּךְ עֲשָׂרוֹת!'
   :ptype===TCS?'🦸 חַסְּרִי בְּעַמּוּדוֹת: קֹדֶם אֲחָדוֹת, אַחַר כָּךְ עֲשָׂרוֹת!'
   :ptype===TPG?'🔷 סְפְרִי אֶת הַצּוּרָה וְכִתְבִי אֶת הַמִּסְפָּר!'
   :ptype===TPP?'📐 חַשְּׁבִי אֶת הַהֶקֵּף — חַבְּרִי אֶת אָרְכֵי כָּל הַצְּלָעוֹת!'
   :ptype===TCP?'⚖️ גָּרְרִי אֶת הַסִּימָן הַנָּכוֹן (< , > אוֹ =) לַתֵּבָה בֵּין הַמִּסְפָּרִים!'
   :ptype===TTS?('➕ חַבְּרִי שְׁלוֹשָׁה מִסְפָּרִים שֶׁיַּחַד הֵם '+num1+' — בְּלִי 0 וּבְלִי 10!')
   :ptype===THF?'✂️ חַלְּקִי שָׁווֶה בְּשָׁווֶה בֵּין הַחֲבֵרוֹת — כַּמָּה תְּקַבֵּל כָּל אַחַת?'
   :ptype===TPL?'🍽️ קְבוּצוֹת שָׁווֹת! סִפְרִי אֶת כָּל הַצַּלָּחוֹת — כַּמָּה בְּסַךְ הַכֹּל?'
   :ptype===TMU?'❓ אֵיזֶה מִסְפָּר חָסֵר בַּכֶּפֶל? קִפְצִי עַל הַיָּשָׁר וְסִפְרִי אֶת הַקְּפִיצוֹת!'
   :ptype===TMK?'🏆 כַּמָּה זֶה הַכֶּפֶל? כִּתְבִי אֶת הַתְּשׁוּבָה — אַתְּ אַלּוּפָה!'
   :ptype===TWC?'📖 קִרְאִי אֶת הַסִּפּוּר וְחַשְּׁבִי שְׁלָב אַחֲרֵי שְׁלָב!'
   :ptype===TSQ?'📖 קִרְאִי אֶת הַסִּפּוּר, בַּחֲרִי תְּשׁוּבָה וְלַחֲצִי ✓ לְהַגִּישׁ!'
   :ptype===TCZ?'📝 אֵיזוֹ מִלָּה חֲסֵרָה בַּמִּשְׁפָּט? בַּחֲרִי וְלַחֲצִי ✓!'
   :ptype===TTF?'✔️✖️ קִרְאִי אֶת הַסִּפּוּר — הַמִּשְׁפָּט נָכוֹן אוֹ לֹא? בַּחֲרִי וְלַחֲצִי ✓!'
   :ptype===TWM?'🖼️ גִּרְרִי כָּל מִלָּה אֶל הַתְּמוּנָה הַמַּתְאִימָה!'
   :ptype===TSO?'🔀 סַדְּרִי אֶת הַמִּלִּים לְמִשְׁפָּט נָכוֹן — וְאָז ✓!'
   :ptype===TRH?'🎵 אֵיזוֹ מִלָּה נִשְׁמַעַת דּוֹמֶה בַּסּוֹף? בַּחֲרִי וְלַחֲצִי ✓!'
   :ptype===TMC?'✖️ כֶּפֶל זֶה חִבּוּר חוֹזֵר! אֶפְשָׁר לְמַלֵּא אֶת הַבֵּינַיִם — אוֹ לִכְתֹּב אֶת הַתְּשׁוּבָה בַּסּוֹף!'
   :ptype===TCM?('🪙 כַּמָּה מַטְבְּעוֹת שֶׁל '+(num2||5)+' צְרִיכִים? הוֹסִיפִי וְסִפְרִי!')
   :ptype===TBC?'🥨 כַּמָּה זֶה עוֹלֶה? הוֹסִיפִי מַטְבְּעוֹת שֶׁל 5 וְסַכְּמִי!'
   :ptype===TIC?('🍦 יֵשׁ לָהּ ₪'+num1+' — קְנִי גְּלִידוֹת וְסִפְרִי כַּמָּה אֶפְשָׁר לִקְנוֹת!')
   :ptype===TBG?'💯 רַק סִפְרַת הָאֲחָדוֹת מִשְׁתַּנָּה — הָעֲשָׂרוֹת נִשְׁאָרוֹת!'
   :ptype===TC?'💰 כַּמָּה שָׁוִים הַמַּטְבְּעוֹת בְּסַךְ הַכֹּל?'
   :ptype===TDA?'🔢 מְצָא שְׁנֵי מִסְפָּרִים שֶׁסְּכוּמָם שָׁווֶה לַתְּשׁוּבָה!'
   :ptype===TDS?'🔢 מְצָא שְׁנֵי מִסְפָּרִים שֶׁהַהֶפְרֵשׁ בֵּינֵיהֶם שָׁווֶה לַתְּשׁוּבָה!'
   :ptype===TRA?'🔢 מְצָא שְׁלוֹשָׁה מִסְפָּרִים שֶׁסְּכוּמָם שָׁווֶה לַתְּשׁוּבָה!'
   :ptype===TVA||ptype===TVS?((problems[idx]||{}).symA
       ?'🔷 הַצּוּרוֹת שָׁווֹת לַמִּסְפָּרִים שֶׁלְּמַעְלָה — הַצִּיבִי וְחַשְּׁבִי!'
       :'🔷 הַצּוּרָה שָׁווָה לַמִּסְפָּר שֶׁלְּמַעְלָה — הַצִּיבִי אוֹתוֹ וְחַשְּׁבִי!')
   :ptype===TX?'🧮 חַשֵּׁב בְּשָׁלָבִים: תְּחִלָּה חַסֵּר, אַחַר כָּךְ הוֹסֵף!'
   :ptype===TW?'🧮 חַשֵּׁב בְּשָׁלָבִים: חַסֵּר פַּעֲמַיִם בְּזֶה אַחַר זֶה!'
   :ptype===TZ?'🧮 חַשֵּׁב בְּשָׁלָבִים: קוֹדֶם חַבֵּר שְׁנַיִם, אַחַר כָּךְ הוֹסֵף שְׁלִישִׁי!'
   :ptype===TT?(ttOp==='add'?'🔟 קְפַץ קָדִימָה בַּעֲשָׂרוֹת עַל הַיָּשָׁר!':'🔟 קְפַץ אָחוֹר בַּעֲשָׂרוֹת עַל הַיָּשָׁר!')
   :ptype===TH?'💯 חַבְּרִי מֵאוֹת שְׁלֵמוֹת — סְפֹר אֶת הַמֵּאוֹת (וְהָעֲשָׂרוֹת)!'
   :ptype===TA?(aidMode==='kang'?aidHint('nl','add'):aidHint('jar','add'))
      :(aidMode==='kang'?aidHint('nl','sub'):aidHint('jar','sub'));
  renderEq();showBtns('check');resetAidUsed();
  // TC (coins): show kangaroo NL only, starting at 0; range fits the coin sum
  // In Queen mode (sums up to 50), step by 10s only (like the TT number line)
  if(ptype===TC){
    const ct=document.getElementById('chain-tools');if(ct)ct.style.display='none';
    const nlp=document.getElementById('nl-panel');
    const ncMax=mode==='mx'?50:20;
    const ncStep=mode==='mx'?10:1;
    if(nlp){nlp.style.display='';NL.configure(ncMax,ncStep);NL.init(0);}
    chainGnMode=false;}
  // TT (tens): kangaroo NL configured for 0-100 in steps of 10
  if(ptype===TT){
    const ct=document.getElementById('chain-tools');if(ct)ct.style.display='none';
    const nlp=document.getElementById('nl-panel');
    NL.configure(100,10);if(nlp){nlp.style.display='';NL.init(num1);}
    tdaJarMode=false;chainGnMode=false;}
  // TCA (column addition): the exercise module owns the staged inputs and
  // hints; the aid is the game's own SKINNED number line (0-20), hidden by
  // the try-first lock and revealed on the first mistake like everywhere else
  if(ptype===TCA){
    const ct=document.getElementById('chain-tools');if(ct)ct.style.display='none';
    const nlp=document.getElementById('nl-panel');
    // אַלּוּפָה (staged) additions start with the line HIDDEN — the module reveals
    // it only on the 2nd mistake (api.showNL). All others show it now.
    const _staged=(problems[idx]||{}).staged;
    if(nlp){nlp.style.display=_staged?'none':'';NL.configure(20,1);NL.init(0);}
    chainGnMode=false;tdaJarMode=false;}
  // TCS (column subtraction): mirror of TCA — module owns the staged inputs and
  // hints; the aid is the skinned 0-20 number line, COUNT-BACK (main.js steps −1)
  if(ptype===TCS){
    const ct=document.getElementById('chain-tools');if(ct)ct.style.display='none';
    const nlp=document.getElementById('nl-panel');
    // אַלּוּפָה (staged) subtractions start with the line HIDDEN — the module
    // reveals it only on the 2nd mistake (api.showNL). All others show it now.
    const _staged=(problems[idx]||{}).staged;
    if(nlp){nlp.style.display=_staged?'none':'';NL.configure(20,1);NL.init(0);}
    chainGnMode=false;tdaJarMode=false;}
  // TCM (coin multiplication) / TBC (bagel cost) / TPG (polygon sides) / TMC
  // (multiplication chain) / TMK (אַלּוּפָה multiplication): the module owns its
  // own scaffold; no number-line aid
  if(ptype===TCM||ptype===TBC||ptype===TPG||ptype===TMC||ptype===TMK||ptype===TPP||ptype===TCP||ptype===TWP||ptype===TWC||ptype===TSQ||ptype===TCZ||ptype===TTF||ptype===TWM||ptype===TSO||ptype===TRH||ptype===TTS||ptype===THF||ptype===TPL||ptype===TIC){
    const ct=document.getElementById('chain-tools');if(ct)ct.style.display='none';
    const nlp=document.getElementById('nl-panel');if(nlp)nlp.style.display='none';
    chainGnMode=false;tdaJarMode=false;}
  // TMU (multiplication with one unknown, a × □ = product): the aid is the
  // SKIP-COUNTING number line — jumps of `a` over 0..a·5 — and it is shown
  // from the START (user request: the aid must be there BEFORE any mistake).
  if(ptype===TMU){
    const ct=document.getElementById('chain-tools');if(ct)ct.style.display='none';
    const nlp=document.getElementById('nl-panel');
    if(nlp){nlp.style.display='';NL.configure(num1*5,num1);NL.init(0);}
    chainGnMode=false;tdaJarMode=false;}
  // TBG (big ± small): the number line is WINDOWED around the big number —
  // num1 sits in the middle, with 10 below and 10 above (e.g. 75 → 65..85),
  // so the child counts a step or two from there. Revealed on first mistake
  // like every other aid; the jar makes no sense for big values (toggle off).
  if(ptype===TBG){
    const ct=document.getElementById('chain-tools');if(ct)ct.style.display='none';
    const nlp=document.getElementById('nl-panel');
    let base=num1-10;if(base<0)base=0;
    if(nlp){nlp.style.display='';NL.configure(base+20,1,base);NL.init(num1);}
    chainGnMode=false;tdaJarMode=false;}
  // TH (whole hundreds): the line STARTS at the first operand and steps by 10s
  // (hundreds+tens, e.g. 200+50 → 200,210…) or 100s (hundreds+hundreds, e.g.
  // 300+300 → 300,400…). Range ends one step past the sum → only ~5-8 ticks, so
  // the 3-digit labels have room. Revealed on the first mistake (try-first).
  if(ptype===TH){
    const ct=document.getElementById('chain-tools');if(ct)ct.style.display='none';
    const nlp=document.getElementById('nl-panel');
    const _thStep=(num2%100===0)?100:10;
    if(nlp){nlp.style.display='';NL.configure(num1+num2+_thStep,_thStep,num1);NL.init(num1);}
    chainGnMode=false;tdaJarMode=false;}
  // Aid display — kangaroo NL or the cookie jar, per aidMode
  if(ptype!==TC&&ptype!==TT&&ptype!==TCA&&ptype!==TCS&&ptype!==TCM&&ptype!==TBC&&ptype!==TPG&&ptype!==TMC&&ptype!==TMK&&ptype!==TPP&&ptype!==TCP&&ptype!==TWP&&ptype!==TWC&&ptype!==TSQ&&ptype!==TCZ&&ptype!==TTF&&ptype!==TWM&&ptype!==TSO&&ptype!==TRH&&ptype!==TTS&&ptype!==THF&&ptype!==TPL&&ptype!==TIC&&ptype!==TMU&&ptype!==TBG&&ptype!==TH){
  const isTD=ptype===TDA||ptype===TDS||ptype===TRA;
  const useNL=aidMode==='nl';
  const useKang=aidMode==='kang';
  const ct=document.getElementById('chain-tools');if(ct)ct.style.display=useNL?'block':'none';
  const nlp=document.getElementById('nl-panel');
  // kangaroo line spans 0..20 by default; for missing-subtrahend (e.g. 18−x=11)
  // and plain subtraction it must never be shorter than the minuend on screen.
  // גָּשֵׁר 20 crosses the SECOND ten (sums/minuends up to 23) → widen to 0..24 there.
  const _nlMax=Math.max(20,mode==='b20'?24:0,(ptype===TM||ptype===TS||ptype===TVS)?num1:0);
  if(nlp){nlp.style.display=useKang?'':'none';if(useKang){NL.configure(_nlMax,1);NL.init(0);}}
  if(useNL){
    pgmTensMode=false;chainGnMode=false;
    const _cv=isTD?((ptype===TDA||ptype===TRA)?0:num1):num1;
    pgmCV=_cv;pgmCk=Array.from({length:_cv},(_,i)=>i%5);pgmArcs=[];
    const _jar=document.getElementById('pgm-ck-jar');if(_jar)_jar.style.display='';
    const _gnd=document.getElementById('pgm-gn-display');if(_gnd)_gnd.style.display='none';
    const _jbtm=document.querySelector('#chain-tools .pgm-jar-btm');if(_jbtm)_jbtm.style.transform='';
    pgmBuildNL();pgmRenderJar();pgmDrawArcs();pgmUpdateAll();}
  tdaJarMode=false;}
  setTimeout(()=>{
    const first=(ptype===TX||ptype===TZ)?document.getElementById('tx-sub1')
               :(ptype===TDA||ptype===TDS||ptype===TRA)?document.getElementById('ans1'):null;
    (first||document.getElementById('ans'))?.focus();
  },60);
  buildGamesMenu();
  // the aid-toggle menu is meaningless inside a self-contained exercise
  {const _gb=document.getElementById('games-drop-btn');if(_gb)_gb.style.visibility=(ptype===TCA||ptype===TCS||ptype===TCM||ptype===TBC||ptype===TPG||ptype===TMC||ptype===TMK||ptype===TPP||ptype===TCP||ptype===TWP||ptype===TWC||ptype===TSQ||ptype===TCZ||ptype===TTF||ptype===TWM||ptype===TSO||ptype===TRH||ptype===TTS||ptype===THF||ptype===TPL||ptype===TIC||ptype===TMU||ptype===TBG)?'hidden':'';}
  // Digit hint button — shown for TT, TBG, and for TS/TM where both nums > 10
  {const _dhBtn=document.getElementById('digit-hint-btn');
  if(_dhBtn){
    const _showDH=ptype===TT||ptype===TBG||(ptype===TS&&num1>10&&num2>10)||(ptype===TM&&num1>10&&num2>10);
    if(_showDH){
      const _u1=num1%10,_u2=num2%10;
      const _ht=ptype===TT?(ttOp==='add'?`${num1/10}+${num2/10}`:`${num1/10}-${num2/10}`)
        :ptype===TBG?(bgOp==='add'?`${_u1}+${num2}`:`${_u1}-${num2}`)
        :(_u1<_u2?`${_u1+10}-${_u2}`:`${_u1}-${_u2}`);
      _dhBtn.dataset.hint=_ht;_dhBtn.style.display='';_dhBtn.classList.remove('hint-shown');_dhBtn.disabled=score<30;
    }else{_dhBtn.style.display='none';}
  }}
  _lockAids();
}

/* a gold filled shape (circle / triangle / square) used as the "unknown" token
   in TVA/TVS — sized ~3rem to sit beside the 3.4rem equation digits. */
function _varShapeSVG(kind,size){
  size=size||'3rem';
  const F='#FFD166',S='#7a571a',W=4;
  let inner;
  if(kind==='square')        inner='<rect x="6" y="6" width="44" height="44" rx="9" fill="'+F+'" stroke="'+S+'" stroke-width="'+W+'" stroke-linejoin="round"/>';
  else if(kind==='triangle') inner='<polygon points="28,5 53,51 3,51" fill="'+F+'" stroke="'+S+'" stroke-width="'+W+'" stroke-linejoin="round"/>';
  else                       inner='<circle cx="28" cy="28" r="22" fill="'+F+'" stroke="'+S+'" stroke-width="'+W+'"/>';
  // pointer-events:none → hovering the shape reports the wrapping eq-n span as
  // the target, so the number-objects tooltip fires (the shape acts like a number).
  return '<svg viewBox="0 0 56 56" style="width:'+size+';height:'+size+';vertical-align:middle;flex:0 0 auto;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">'+inner+'</svg>';
}

/* ── Equation ── */
function renderEq(){
  // leaving a module-owned exercise (TCA) → release its listeners/timers
  if(_colxCleanup&&ptype!==TCA&&ptype!==TCS&&ptype!==TCM&&ptype!==TBC&&ptype!==TPG&&ptype!==TMC&&ptype!==TMK&&ptype!==TPP&&ptype!==TCP&&ptype!==TWP&&ptype!==TWC&&ptype!==TSQ&&ptype!==TCZ&&ptype!==TTF&&ptype!==TWM&&ptype!==TSO&&ptype!==TRH&&ptype!==TTS&&ptype!==THF&&ptype!==TPL&&ptype!==TIC&&ptype!==TMU){_colxCleanup();_colxCleanup=null;}
  // restore hint visibility (TC hides it and embeds it inline)
  if(ptype!==TC){const hEl=document.getElementById('hint');if(hEl)hEl.style.display='';}
  const n=t=>`<span class="eq-n" data-num="${t}">${t}</span>`;
  // Like n(), but for a NON-first operand `t` that is combined onto a running
  // `base` via `o` ('add'/'sub'): if the step bridges a ten, tag the span with
  // data-split="left,right" so the hover tooltip shows the complete-to-ten part
  // (left) and the remainder (right). See _bridgeSplit + _nttShow.
  const nB=(t,base,o)=>{const s=_bridgeSplit(base,o,t);
    return `<span class="eq-n" data-num="${t}"${s?` data-split="${s.left},${s.right}"`:''}>${t}</span>`;};
  const op=(t,c)=>`<span class="eq-op ${c}">${t}</span>`;
  const inp=`<input id="ans" class="ans-inp" type="number" min="0" max="20"
    oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,2)"
    onkeydown="if(event.key==='Enter')checkAns()">`;
  const res=t=>`<span class="eq-res" data-num="${t}">${t}</span>`;
  // like res(), but a teen result is tagged to split into ten + ones (e.g.
  // 13 → 10 | 3) so the hover tooltip shows a ten-and-ones number bond.
  const resB=t=>`<span class="eq-res" data-num="${t}"${t>10?` data-split="10,${t-10}"`:''}>${t}</span>`;
  let h='';
  if(ptype===TM)     h=n(num1)+op('-','op-m')+inp+op('=','op-e')+resB(num2);
  else if(ptype===TS)h=n(num1)+op('-','op-m')+nB(num2,num1,'sub')+op('=','op-e')+inp;
  else if(ptype===TX||ptype===TZ||ptype===TW){
    const op1=(ptype===TX||ptype===TW)?op('-','op-m'):op('+','op-p');
    const mkSub=(id,next,gid)=>`<input id="${id}" class="tx-sub-inp" type="number" min="0" max="30"`+
      ` oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,2);tzSubUpd('${id}','${gid}')"`+
      ` onblur="tzSubJarSync('${id}')"`+
      ` onkeydown="if(event.key==='Enter'){tzSubJarSync('${id}');document.getElementById('${next}')?.focus()}">`;
    const subRow=(id,next,gid)=>`<div class="tz-sub-row">${op('=','op-e')}${mkSub(id,next,gid)}</div>`;
    const vPair=`<svg class="tz-vsv" viewBox="0 0 100 18" preserveAspectRatio="none" width="100%" height="16">`+
      `<line x1="8" y1="0" x2="50" y2="18" stroke="rgba(255,215,0,.55)" stroke-width="1.5" stroke-linecap="round"/>`+
      `<line x1="92" y1="0" x2="50" y2="18" stroke="rgba(255,215,0,.55)" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    const vLine=`<svg class="tz-vsv" viewBox="0 0 10 18" width="10" height="16">`+
      `<line x1="5" y1="0" x2="5" y2="18" stroke="rgba(255,215,0,.45)" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    let parts=`<div class="tz-grp" id="tz-g1">`+
        `<div class="tz-grp-top"><span class="eq-n" data-num="${num1}">${num1}</span>${op1}${nB(num2,num1,(ptype===TX||ptype===TW)?'sub':'add')}</div>`+
        `${vPair}${subRow('tx-sub1',num4>0?'tx-sub2':'ans','tz-g1')}`+
      `</div>`;
    const base12=(ptype===TX||ptype===TW)?num1-num2:num1+num2;   // running result of the first two terms
    if(num4>0){
      parts+=`<div class="tz-grp" id="tz-g2">`+
          `<div class="tz-grp-top">${op('+','op-p')}${nB(num3,base12,'add')}</div>`+
          `${vLine}${subRow('tx-sub2','ans','tz-g2')}`+
        `</div>`;
      parts+=`${op('+','op-p')}${nB(num4,base12+num3,'add')}`;
    }else{
      const op3=ptype===TW?op('-','op-m'):op('+','op-p');
      parts+=`${op3}${nB(num3,base12,ptype===TW?'sub':'add')}`;
    }
    parts+=`${op('=','op-e')}${inp}`;
    h=`<div class="tz-inline">${parts}</div>`;
  }
  else if(ptype===TC){
    const hintEl=document.getElementById('hint');
    const hintTxt=hintEl?hintEl.textContent:'';
    if(hintEl)hintEl.style.display='none';
    const coinsHtml=tcCoins.map(v=>tcCoinSVG(v)).join('');
    h=`<div class="tc-stage-wrap">`+
      `<div class="tc-hint-top">${hintTxt}</div>`+
      `<div class="coins-stage">${coinsHtml}</div>`+
      `<div class="tc-answer-row"><span class="tc-eq-lbl">סְכוּם =</span>${inp}</div></div>`;
  }
  else if(ptype===TT){
    const ttInp=`<input id="ans" class="ans-inp" type="number" min="0" max="100"`+
      ` oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,3)"`+
      ` onkeydown="if(event.key==='Enter')checkAns()">`;
    const hintStr=ttOp==='add'?`${num1/10}+${num2/10}`:`${num1/10}-${num2/10}`;
    h=`<div class="tt-eq-wrap">${n(num1)}${op(ttOp==='add'?'+':'-',ttOp==='add'?'op-p':'op-m')}${n(num2)}${op('=','op-e')}${ttInp}`+
      `</div>`;
  }
  else if(ptype===TH){
    // whole-hundreds addition — a 3-digit answer (≤ 900). Big round numbers are
    // NOT hoverable (no data-num) — a hundreds count of dots is meaningless.
    const nh=t=>`<span class="eq-n">${t}</span>`;
    const hInp=`<input id="ans" class="ans-inp ans-inp-3d" type="number" min="0" max="999"`+
      ` oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,3)"`+
      ` onkeydown="if(event.key==='Enter')checkAns()">`;
    h=`<div class="tt-eq-wrap">${nh(num1)}${op('+','op-p')}${nh(num2)}${op('=','op-e')}${hInp}</div>`;
  }
  else if(ptype===TDA||ptype===TDS){
    // the FIRST addend input previews its value as objects while typing
    // (`_nttInput`); plain count, no make-ten split. Hidden on blur.
    const mkI=(id,nxt)=>`<input id="${id}" class="ans-inp" type="number" min="0" max="30"`+
      ` oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,2)${id==='ans1'?';_nttInput(this);tdaJarSync(this)':''}"`+
      (id==='ans1'?` onblur="_nttHide()"`:'')+
      ` onkeydown="if(event.key==='Enter')${nxt?`document.getElementById('${nxt}')?.focus()`:'checkAns()'}">`;
    h=mkI('ans1','ans2')+(ptype===TDA?op('+','op-p'):op('-','op-m'))+mkI('ans2',null)+op('=','op-e')+n(num1);
  }
  else if(ptype===TRA){
    // THREE unknowns: __ + __ + __ = num1 (the child fills three addends).
    // Each box: hovering it AFTER typing a number shows that number's splits
    // (number-bonds) as emojis (_nttSplitsFromInput); ans1 also previews its
    // plain count while typing (_nttInput).
    const mkI=(id,nxt)=>`<input id="${id}" class="ans-inp" type="number" min="0" max="20"`+
      ` oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,2)${id==='ans1'?';_nttInput(this);tdaJarSync(this)':''}"`+
      (id==='ans1'?` onblur="_nttHide()"`:'')+
      ` onmouseenter="_nttSplitsFromInput(this)" onmouseleave="_nttHide()"`+
      ` onkeydown="if(event.key==='Enter')${nxt?`document.getElementById('${nxt}')?.focus()`:'checkAns()'}">`;
    // the RESULT carries a complete-to-ten split so hovering it shows the
    // ten-and-ones bond (e.g. 20 → 10 | 10, 15 → 10 | 5) — helps the child
    // pick three addends that build to the target.
    const resTok=`<span class="eq-n" data-num="${num1}"${num1>10?` data-split="10,${num1-10}"`:''}>${num1}</span>`;
    h=mkI('ans1','ans2')+op('+','op-p')+mkI('ans2','ans3')+op('+','op-p')+mkI('ans3',null)+op('=','op-e')+resTok;
  }
  else if(ptype===TVA||ptype===TVS){
    // UNKNOWN(S) as shapes. Each shape BEHAVES LIKE the number it stands for on
    // hover — it carries data-num (+ the make-ten data-split on the 2nd operand),
    // so hovering shows that number's objects, exactly like a plain number.
    const P=problems[idx]||{};
    const op2=ptype===TVA?'add':'sub';
    const sp=_bridgeSplit(num1,op2,num2);
    const splitAttr=sp?` data-split="${sp.left},${sp.right}"`:'';
    const shp=_varShapeSVG(P.sym);
    const shapeTok=`<span class="eq-n vone-sym" data-num="${num2}"${splitAttr}>${shp}</span>`;
    const opc=ptype===TVA?op('+','op-p'):op('-','op-m');
    if(P.symA){
      // TWO UNKNOWNS: BOTH operands are shapes. A small definition row above
      // ("△ = num1  ○ = num2") gives each shape's value; the equation below is
      // "△ ± ○ = ___". Both equation shapes stay hoverable (objects on hover).
      const shpA=_varShapeSVG(P.symA);
      const symAtok=`<span class="eq-n vone-sym" data-num="${num1}">${shpA}</span>`;
      const dShpA=_varShapeSVG(P.symA,'1.5rem'),dShpB=_varShapeSVG(P.sym,'1.5rem');
      const defOne=(s,v)=>`<span style="display:inline-flex;align-items:center;gap:4px">${s}<span class="eq-op op-e" style="font-size:.8em">=</span><span style="font-family:'Fredoka One',cursive;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5)">${v}</span></span>`;
      h='<div style="display:flex;flex-direction:column;align-items:center;gap:8px">'+
          '<div class="vone-defs" style="display:flex;align-items:center;gap:20px;font-size:1.15rem;opacity:.95">'+
            defOne(dShpA,num1)+defOne(dShpB,num2)+'</div>'+
          '<div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap">'+symAtok+opc+shapeTok+op('=','op-e')+inp+'</div>'+
        '</div>';
    }else{
      // ONE UNKNOWN: a definition line "⃝ = num2" above "num1 ± ⃝ = ___". The
      // first operand is suppressed (eq-noobj) like every ≥2-number equation.
      const defVal=`<span class="eq-res" data-num="${num2}"${splitAttr}>${num2}</span>`;
      const firstN=`<span class="eq-n eq-noobj" data-num="${num1}">${num1}</span>`;
      h='<div style="display:flex;flex-direction:column;align-items:center;gap:10px">'+
          '<div style="display:flex;align-items:center;gap:10px">'+shapeTok+op('=','op-e')+defVal+'</div>'+
          '<div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap">'+firstN+opc+shapeTok+op('=','op-e')+inp+'</div>'+
        '</div>';
    }
  }
  else if(ptype===TCA||ptype===TCS||ptype===TCM||ptype===TBC||ptype===TPG||ptype===TMC||ptype===TMK||ptype===TPP||ptype===TCP||ptype===TWP||ptype===TWC||ptype===TSQ||ptype===TCZ||ptype===TTF||ptype===TWM||ptype===TSO||ptype===TRH||ptype===TTS||ptype===THF||ptype===TPL||ptype===TIC||ptype===TMU)h='<div id="colx-root" class="colx-root"></div>';
  else if(ptype===TBG)h=n(num1)+(bgOp==='add'?op('+','op-p'):op('-','op-m'))+nB(num2,num1,bgOp==='add'?'add':'sub')+op('=','op-e')+inp;
  else               h=n(num1)+op('+','op-p')+nB(num2,num1,'add')+op('=','op-e')+inp;
  document.getElementById('eq').innerHTML=h;
  // number-objects hover: reveal objects for the SECOND number only. When the
  // equation shows ≥2 numbers, suppress the FIRST number's tooltip + hover cue
  // (class eq-noobj) so the child must visualise the second number (with its
  // make-ten split) rather than reading the first number's objects.
  // (TVA/TVS set their own eq-noobj on the first operand in-branch — the shape
  // tokens must stay hoverable, so skip the generic "suppress the first" here.)
  if(ptype!==TVA&&ptype!==TVS){const _eq=document.getElementById('eq');
   const _nums=_eq.querySelectorAll('.eq-n[data-num],.eq-res[data-num]');
   if(_nums.length>=2)_nums[0].classList.add('eq-noobj');}
  if(ptype===TCA||ptype===TCS||ptype===TCM||ptype===TBC||ptype===TPG||ptype===TMC||ptype===TMK||ptype===TPP||ptype===TCP||ptype===TWP||ptype===TWC||ptype===TSQ||ptype===TCZ||ptype===TTF||ptype===TWM||ptype===TSO||ptype===TRH||ptype===TTS||ptype===THF||ptype===TPL||ptype===TIC||ptype===TMU)_colxMount();
}

/* ── self-contained exercise host (TCA → column_add, TCS → column_sub) ──
   The module owns rendering + checking inside #colx-root; the host supplies
   scoring, the sad modal, the report and the success flow via this api. */
let _colxCleanup=null;
function _colxMount(){
  if(_colxCleanup){_colxCleanup();_colxCleanup=null;}
  const exName=typeof EXERCISE_OF_TYPE!=='undefined'&&EXERCISE_OF_TYPE[ptype];
  if(!exName)return;
  const myIdx=idx;
  loadExercise(exName,()=>{
    // problem changed while loading (idx moved, left colx, or now a DIFFERENT
    // colx type) → a stale async module-load must NOT clobber the live mount
    if((ptype!==TCA&&ptype!==TCS&&ptype!==TCM&&ptype!==TBC&&ptype!==TPG&&ptype!==TMC&&ptype!==TMK&&ptype!==TPP&&ptype!==TCP&&ptype!==TWP&&ptype!==TWC&&ptype!==TSQ&&ptype!==TCZ&&ptype!==TTF&&ptype!==TWM&&ptype!==TSO&&ptype!==TRH&&ptype!==TTS&&ptype!==THF&&ptype!==TPL&&ptype!==TIC&&ptype!==TMU)||idx!==myIdx||EXERCISE_OF_TYPE[ptype]!==exName)return;
    const root=document.getElementById('colx-root');
    const ex=window.EXERCISES&&EXERCISES.types[exName];
    if(!root||!ex)return;
    // `p` hands the module the FULL problem object (side-lengths for perimeter,
    // the `staged` flag for the אַלּוּפָה column-subtraction) — a/b alone can't.
    _colxCleanup=ex.mount({root,a:num1,b:num2,p:problems[myIdx],api:{
      wrong:v=>{
        if(done)return;
        if(report[idx])report[idx].wrongs.push(v);
        if(tryFirst===0)_unlockAids();tryFirst++;
        _maybeShowSkip();   // reveal the language skip button once she's missed twice
        showSadModal();
      },
      // park the skinned number line's rider at a helpful anchor (the line
      // itself is revealed by the try-first unlock on the first mistake)
      nl:v=>{if(typeof NL!=='undefined')NL.init(Math.min(20,Math.max(0,v)));},
      solved:()=>{
        if(done)return;done=true;
        addScore(_tfPts());
        if(report[idx])report[idx].gotCorrect=true;
        const _ic=['🦸','⭐','🌟','💫','✨','🎊'];
        const _ico=_ic[0|Math.random()*_ic.length];
        setFb(`${_ico} כָּל הַכָּבוֹד! תְּשׁוּבָה נְכוֹנָה! ${_ico}`,'fb-ok');
        setTimeout(showFw,400);
      },
      // ── staged-flow hooks (אַלּוּפָה graded column-subtraction) ──
      // penalize: log a mistake + sad modal, WITHOUT the try-first unlock/score
      // (the module drives the graded score itself via solvedFrac).
      penalize:v=>{
        if(done)return;
        if(report[idx])report[idx].wrongs.push(v);
        showSadModal();
      },
      // reveal the skinned number line on demand (2nd mistake)
      showNL:()=>{const nlp=document.getElementById('nl-panel');if(nlp)nlp.style.display='';},
      // award a FRACTION of the problem's points (100/75/50/0 per mistake ladder)
      solvedFrac:frac=>{
        if(done)return;done=true;
        const base=(typeof modePts==='function')?modePts():15;
        addScore(Math.max(0,Math.round(base*frac)));
        if(report[idx])report[idx].gotCorrect=true;
        const _ic=['🏆','⭐','🌟','💫','✨','🎊'];
        const _ico=_ic[0|Math.random()*_ic.length];
        setFb(`${_ico} כָּל הַכָּבוֹד! תְּשׁוּבָה נְכוֹנָה! ${_ico}`,'fb-ok');
        setTimeout(showFw,400);
      },
    }})||null;
  });
}

/* ── Language exercises: skip-this-question ────────────────────────────────
   The reading kinds (story_quiz/cloze/true_false/word_match/sent_order/rhyme,
   in EVERY mode they appear — Superman, אַלּוּפָה and the שָׂפָה game) get a
   "דַּלְּגִי עַל הַשְּׁאֵלָה" button below the card. It stays HIDDEN until the child
   has made TWO mistakes (tryFirst>=2) — only a card she genuinely can't crack
   offers a way out, so it never becomes a lazy shortcut. A skip scores 0 (it is
   NOT gotCorrect; it counts as skipped in the report and the grade). */
function _isLangType(pt){return pt===TSQ||pt===TCZ||pt===TTF||pt===TWM||pt===TSO||pt===TRH;}
// show the skip button only on a live language card AFTER the 2nd mistake
function _maybeShowSkip(){
  const b=document.getElementById('skip-btn');
  if(!b)return;
  b.style.display=(_isLangType(ptype)&&!done&&tryFirst>=2)?'':'none';
}
function skipLangQuestion(){
  if(done||!_isLangType(ptype)||tryFirst<2)return;   // only after the 2nd mistake
  done=true;
  if(report[idx])report[idx].skipped=true;   // 0 points, shown as "דולג" in the report
  setFb('⏭️ דִּלַּגְנוּ עַל הַשְּׁאֵלָה — 0 נְקֻדּוֹת','fb-err');
  setTimeout(()=>{if(!_fwOn)nextP();},700);   // brief note, then advance (no celebration)
}

/* ── Buttons ── */
function showBtns(s){
  const cb=document.getElementById('chk-btn');
  const btns=document.getElementById('btns');
  if(s==='check'){
    btns.innerHTML='';
    btns.className='btn-row';
    // language reading cards get a skip button (0 points) so a hard-to-read card
    // never soft-locks the set — hidden until the 2nd mistake (_maybeShowSkip)
    if(_isLangType(ptype))
      btns.innerHTML='<button class="btn b-skip" id="skip-btn" style="display:none" onclick="skipLangQuestion()">⏭️ דַּלְּגִי עַל הַשְּׁאֵלָה</button>';
    _maybeShowSkip();
    // exercise modules (TCA/TCS/TCM/TBC/TPG/TMC/TMK) check themselves — no host check button
    if(cb)cb.style.display=(ptype===TCA||ptype===TCS||ptype===TCM||ptype===TBC||ptype===TPG||ptype===TMC||ptype===TMK||ptype===TPP||ptype===TCP||ptype===TWP||ptype===TWC||ptype===TSQ||ptype===TCZ||ptype===TTF||ptype===TWM||ptype===TSO||ptype===TRH||ptype===TTS||ptype===THF||ptype===TPL||ptype===TIC||ptype===TMU)?'none':'flex';
  }else{
    if(cb)cb.style.display='none';
    btns.innerHTML=
      `<button class="btn b-try" onclick="resetCur()">🔄 נַסִּי שׁוּב</button>
       <button class="btn b-nxt" onclick="nextP()">תַּרְגִּיל הַבָּא ←</button>`;
    btns.className='btn-row btns-side';
  }
}

/* ── Check ── */
/* green/red answer-border state — see the global contract in base.css */
function _markAns(el,ok){
  if(!el)return;
  el.classList.remove('ans-ok','ans-err');
  el.classList.add(ok?'ans-ok':'ans-err');
}
// typing again clears the red state (the green box is disabled anyway)
document.addEventListener('input',e=>{
  const t=e.target;
  if(t&&t.classList&&t.classList.contains('ans-inp'))t.classList.remove('ans-err');
});
function checkAns(){
  if(done)return;
  if(ptype===TCA||ptype===TCS||ptype===TCM||ptype===TBC||ptype===TPG||ptype===TMC||ptype===TMK||ptype===TPP||ptype===TCP||ptype===TWP||ptype===TWC||ptype===TSQ||ptype===TCZ||ptype===TTF||ptype===TWM||ptype===TSO||ptype===TRH||ptype===TTS||ptype===THF||ptype===TPL||ptype===TIC||ptype===TMU)return;   // the exercise module checks itself
  // ── Multi-unknown problems: two (TDA/TDS) or three (TRA) empty boxes ──
  if(ptype===TDA||ptype===TDS||ptype===TRA){
    const i1=document.getElementById('ans1'),i2=document.getElementById('ans2'),
          i3=ptype===TRA?document.getElementById('ans3'):null;
    const v1=i1?parseInt(i1.value,10):NaN,v2=i2?parseInt(i2.value,10):NaN,
          v3=i3?parseInt(i3.value,10):0;
    const missing=isNaN(v1)||i1.value===''||isNaN(v2)||i2.value===''||(ptype===TRA&&(isNaN(v3)||i3.value===''));
    if(missing){
      setFb(ptype===TRA?'נָא לְהַזִּין מִסְפָּרִים בִּשְׁלוֹשֶׁת הָרִיבּוּעִים 💗'
                       :'נָא לְהַזִּין מִסְפָּרִים בִּשְׁנֵי הָרִיבּוּעִים 💗','fb-err');return;
    }
    const valid=ptype===TDA?v1+v2===num1
               :ptype===TRA?(v1+v2+v3===num1&&v1>=0&&v2>=0&&v3>=0)
               :v1-v2===num1&&v1>=0&&v2>=0;
    // x−x: block the lazy shortcuts — starting from a MINUEND of 10 ("10 − …", the
    // rote pattern the child overuses) OR subtracting 0. The computation is right,
    // but it isn't real practice, so ask for other numbers WITHOUT a penalty.
    if(ptype===TDS&&valid&&(v1===10||v2===0)){
      const why=v1===10?'בְּלִי לְהַתְחִיל מ-10':'בְּלִי לְחַסֵּר 0';
      setFb(`נָכוֹן! אֲבָל ${why} — תְּנִי מִסְפָּרִים אֲחֵרִים כְּדֵי לְתַרְגֵּל 💪`,'fb-err');
      if(i1)i1.value='';if(i2)i2.value='';
      setTimeout(()=>document.getElementById('ans1')?.focus(),150);
      return;
    }
    // __+__+__: a 0 in any box is a trivial filler (e.g. 0+0+20). The sum is
    // right, but it isn't real practice — ask for three real numbers, NO penalty
    // (mirrors the TDS "no lazy shortcut" rule above).
    if(ptype===TRA&&valid&&(v1===0||v2===0||v3===0)){
      setFb('נָכוֹן! אֲבָל בְּלִי אֶפֶס — תְּנִי מִסְפָּרִים אֲחֵרִים כְּדֵי לְתַרְגֵּל 💪','fb-err');
      if(i1)i1.value='';if(i2)i2.value='';if(i3)i3.value='';
      setTimeout(()=>document.getElementById('ans1')?.focus(),150);
      return;
    }
    done=true;
    _markAns(i1,valid);_markAns(i2,valid);if(i3)_markAns(i3,valid);
    if(i1)i1.disabled=true;if(i2)i2.disabled=true;if(i3)i3.disabled=true;
    document.getElementById('btns').innerHTML='';
    const _cb=document.getElementById('chk-btn');if(_cb)_cb.style.display='none';
    if(valid){
      addScore(_tfPts());
      if(report[idx]){report[idx].gotCorrect=true;report[idx].userPair=ptype===TRA?[v1,v2,v3]:[v1,v2];}
      const _ic=['🎉','⭐','🌟','💫','🦄','🌈','💗','✨','🎊','🍭','🎀','💜'];
      const _ico=_ic[0|Math.random()*_ic.length];
      setFb(`${_ico} כָּל הַכָּבוֹד! תְּשׁוּבָה נְכוֹנָה! ${_ico}`,'fb-ok');
      setTimeout(showFw,300);
    }else{
      if(report[idx])report[idx].wrongs.push(ptype===TRA?`${v1}+${v2}+${v3}`:`${v1}${ptype===TDA?'+':'-'}${v2}`);
      if(tryFirst===0)_unlockAids();tryFirst++;
      showSadModal();
      done=false;
      if(i1){i1.disabled=false;i1.value='';}
      if(i2){i2.disabled=false;i2.value='';}
      if(i3){i3.disabled=false;i3.value='';}
      const _cb2=document.getElementById('chk-btn');if(_cb2)_cb2.style.display='flex';
      setTimeout(()=>document.getElementById('ans1')?.focus(),150);
    }
    return;
  }
  const inp=document.getElementById('ans');
  const v=inp?parseInt(inp.value,10):NaN;
  if(!inp||inp.value===''||isNaN(v)){setFb('נָא לְהַזִּין מִסְפָּר בָּרִיבּוּעַ 💗','fb-err');return}
  const correct=ptype===TT?(ttOp==='add'?num1+num2:num1-num2):ptype===TBG?(bgOp==='add'?num1+num2:num1-num2):ptype===TZ?num1+num2+num3+num4:ptype===TW?num1-num2-num3:ptype===TA||ptype===TVA||ptype===TH?num1+num2:ptype===TX?num1-num2+num3:num1-num2;
  _markAns(inp,v===correct);
  done=true;if(inp)inp.disabled=true;
  document.getElementById('btns').innerHTML='';
  const _cb=document.getElementById('chk-btn');if(_cb)_cb.style.display='none';
  if(v===correct){
    addScore(_tfPts());
    if(report[idx])report[idx].gotCorrect=true;
    const _ic=['🎉','⭐','🌟','💫','🦄','🌈','💗','✨','🎊','🍭','🎀','💜'];
    const _ico=_ic[0|Math.random()*_ic.length];
    setFb(`${_ico} כָּל הַכָּבוֹד! תְּשׁוּבָה נְכוֹנָה! ${_ico}`,'fb-ok');
    if(mode===0){setTimeout(nextP,700);}else{setTimeout(showFw,300);}
  }else{
    if(report[idx])report[idx].wrongs.push(v);
    if(tryFirst===0)_unlockAids();tryFirst++;
    // TX: check sub-answer and mark it
    if(ptype===TX||ptype===TZ||ptype===TW){
      const sc1=(ptype===TX||ptype===TW)?num1-num2:num1+num2;
      const sc2=ptype===TW?sc1-num3:sc1+num3; // running total after step 2
      [[document.getElementById('tx-sub1'),sc1],
       [document.getElementById('tx-sub2'),sc2]].forEach(([el,sc])=>{
        if(!el||el.value==='')return;
        const sv=parseInt(el.value,10);
        el.classList.remove('sub-ok','sub-err');
        if(!isNaN(sv))el.classList.add(sv===sc?'sub-ok':'sub-err');
      });
    }
    showSadModal();
    done=false;
    if(inp){inp.disabled=false;inp.value='';setTimeout(()=>inp.focus(),150);}
    const _cb3=document.getElementById('chk-btn');if(_cb3)_cb3.style.display='flex';
  }
}
function showDigitHint(el){
  if(el.classList.contains('hint-shown')||el.disabled)return;
  addScore(-30);aidUsed=true;
  el.classList.add('hint-shown');el.disabled=false;
}
function setFb(t,c){const e=document.getElementById('fb');e.textContent=t;e.className='fb '+(c||'')}
function addScore(n){
  score+=n;document.getElementById('score-val').textContent=score;
  const s=document.getElementById('score-star');
  if(s){s.classList.remove('star-pulse');void s.offsetWidth;s.classList.add('star-pulse');}
}

function tzSubUpd(id,gid){
  const v=document.getElementById(id)?.value||'';
  const g=document.getElementById(gid);if(!g)return;
  g.classList.toggle('tz-solved',v!=='');
  const row=g.querySelector('.tz-sub-row');
  if(row)row.classList.toggle('tz-live',v!=='');
}
function tzSubJarSync(id){
  if(ptype!==TZ&&ptype!==TX&&ptype!==TW)return;
  const el=document.getElementById(id);if(!el||el.value==='')return;
  const v=parseInt(el.value,10);if(isNaN(v))return;
  // calculate correct sub-values
  const sc1=(ptype===TX||ptype===TW)?num1-num2:num1+num2;
  const sc2=ptype===TW?sc1-num3:sc1+num3;
  const correct=id==='tx-sub1'?sc1:id==='tx-sub2'?sc2:null;
  if(correct!==null){
    el.classList.remove('sub-ok','sub-err');
    el.classList.add(v===correct?'sub-ok':'sub-err');
    // a wrong value in the FIRST step square is a real mistake — sad emoji +
    // the regular first-mistake penalty (guard: don't re-punish the same value)
    if(id==='tx-sub1'&&!done){
      if(v!==correct&&el._judgedWrong!==el.value){
        el._judgedWrong=el.value;
        if(report[idx])report[idx].wrongs.push(v);
        if(tryFirst===0)_unlockAids();tryFirst++;
        showSadModal();
      }else if(v===correct){
        el._judgedWrong=undefined;
      }
    }
  }
  // update cookie jar / garden when tx-sub1 or tx-sub2 blurs
  if((id==='tx-sub1'||id==='tx-sub2')&&document.getElementById('chain-tools')?.style.display!=='none'){
    const newCV=Math.min(Math.max(0,v),PGM_NL);
    pgmCV=newCV;pgmCk=Array.from({length:newCV},(_,i)=>i%5);pgmArcs=[];
    pgmBuildNL();pgmRenderJar();pgmDrawArcs();pgmUpdateAll();
  }
}
/* TWO-UNKNOWNS addition (TDA, __+__=r): while the child types the FIRST addend,
   fill the cookie jar to that amount (only when the jar is the active aid —
   aidMode==='nl' → #chain-tools visible). Empty/invalid clears it back to 0. */
function tdaJarSync(inp){
  if(ptype!==TDA&&ptype!==TRA)return;
  if(document.getElementById('chain-tools')?.style.display==='none')return; // jar not the active aid
  const raw=(inp&&inp.value!=='')?parseInt(inp.value,10):NaN;
  const newCV=isNaN(raw)?0:Math.min(Math.max(0,raw),PGM_NL);
  pgmCV=newCV;pgmCk=Array.from({length:newCV},(_,i)=>i%5);pgmArcs=[];
  pgmBuildNL();pgmRenderJar();pgmDrawArcs();pgmUpdateAll();
}
/* For chain problems: is the current active step an addition step?
   TZ is always add; TX step1(sub1 empty)=subtract, step2(sub1 filled)=add */
function tzAddMode(){
  if(ptype===TZ)return true;
  if(ptype===TX){const s=document.getElementById('tx-sub1');return!!(s&&s.value!=='');}
  return false;
}
function markAidUsed(){if(aidUsed)return;aidUsed=true;}
function resetAidUsed(){aidUsed=false;}
let tryFirst=0;
function _tfPts(){return tryFirst===0?modePts():tryFirst===1?Math.round(modePts()*.67):0;}
let _aidHidden={nl:'none',ct:'none'};   // aid-panel displays to restore on unlock
/* ── aid reveal policy — GENERIC, declared per exercise type ────────────────
   Every exercise type file (exercises/<name>.ex.js) may declare
     aidsReveal: 'always' | 'afterMistake'   (default 'afterMistake')
   'always' shows the aids (number line / counting jar) from the very first
   attempt; 'afterMistake' keeps the try-first lock: fully hidden until the
   first wrong answer. One field, shared by every aid.
   It may also be PER-MODE: a function (mode)→policy, or an object keyed by mode
   (e.g. {mx:'always', sup:'afterMistake'}) — so the same type can show the line
   from the start in one game and gate it (try-first) in another. */
function _aidRevealPolicy(){
  const ts=window.EXERCISES&&EXERCISES.types;
  if(ts)for(const k in ts){
    const t=ts[k].t;
    if(t===ptype||(Array.isArray(t)&&t.includes(ptype))){
      let r=ts[k].aidsReveal;
      if(typeof r==='function')r=r(mode);
      else if(r&&typeof r==='object')r=r[mode];
      return r||'afterMistake';
    }
  }
  return 'afterMistake';
}
function _lockAids(){
  tryFirst=0;
  if(_aidRevealPolicy()==='always'){
    // this type shows its aids from the start — leave them fully UNLOCKED.
    // Crucially we must actively clear any lock state left over from the
    // PREVIOUS problem/mode: a lingering `tf-locked-nl` on <body> hides the
    // number-line numbers (CSS) and `tf-locked` greys the ±buttons, so the
    // line looked blank until a refresh (which boots with a clean body).
    const gb=document.getElementById('games-drop-btn');
    if(gb){gb.disabled=false;gb.classList.remove('tf-locked');
      gb.innerHTML=typeof AID_ICON_NL!=='undefined'
        ?(aidMode==='nl'?AID_ICON_BOX:AID_ICON_NL):'🦘';}
    ['pgm-btn-plus','pgm-btn-minus','nl-btn-plus','nl-btn-minus'].forEach(id=>{
      const el=document.getElementById(id);if(el){el.disabled=false;el.classList.remove('tf-locked');}});
    document.querySelectorAll('.pgm-rst').forEach(el=>{el.disabled=false;el.classList.remove('tf-locked');});
    document.body.classList.remove('tf-locked-nl');
    // record the CURRENT (visible) displays so a later wrong answer's
    // _unlockAids restores the always-on line instead of a stale 'none'.
    const nlp=document.getElementById('nl-panel');
    const ct=document.getElementById('chain-tools');
    _aidHidden={nl:nlp?nlp.style.display:'none',ct:ct?ct.style.display:'none'};
    document.getElementById('tf-msg')?.remove();
    const note=document.getElementById('tf-nl-note');if(note)note.style.display='none';
    const hint=document.getElementById('hint');if(hint)hint.style.visibility='';
    return;
  }
  const gb=document.getElementById('games-drop-btn');
  if(gb){gb.disabled=true;gb.classList.add('tf-locked');gb.innerHTML='💪';}
  ['pgm-btn-plus','pgm-btn-minus','nl-btn-plus','nl-btn-minus'].forEach(id=>{
    const el=document.getElementById(id);if(el){el.disabled=true;el.classList.add('tf-locked');}});
  document.querySelectorAll('.pgm-rst').forEach(el=>{el.disabled=true;el.classList.add('tf-locked');});
  document.body.classList.add('tf-locked-nl');
  // the aids are not just locked — they are fully HIDDEN until the first
  // mistake; remember what loadProblem chose so the unlock can restore it
  const nlp=document.getElementById('nl-panel');
  const ct=document.getElementById('chain-tools');
  _aidHidden={nl:nlp?nlp.style.display:'none',ct:ct?ct.style.display:'none'};
  if(nlp)nlp.style.display='none';
  if(ct)ct.style.display='none';
  const note=document.getElementById('tf-nl-note');if(note)note.style.display='block';
  const hint=document.getElementById('hint');if(hint)hint.style.visibility='hidden';
  // Insert prominent message where the aid will appear
  const old=document.getElementById('tf-msg');if(old)old.remove();
  const msg=document.createElement('div');msg.id='tf-msg';
  msg.textContent='💪 נַסִּי לְבַד. אַתְּ אַלּוּפָה!';
  if(ct)ct.parentNode.insertBefore(msg,ct);
}
function _unlockAids(){
  const gb=document.getElementById('games-drop-btn');
  if(gb){gb.disabled=false;gb.classList.remove('tf-locked');
    // the toggle icons are background-independent (see aids.js)
    gb.innerHTML=typeof AID_ICON_NL!=='undefined'
      ?(aidMode==='nl'?AID_ICON_BOX:AID_ICON_NL):'🦘';}
  ['pgm-btn-plus','pgm-btn-minus','nl-btn-plus','nl-btn-minus'].forEach(id=>{
    const el=document.getElementById(id);if(el){el.disabled=false;el.classList.remove('tf-locked');}});
  document.querySelectorAll('.pgm-rst').forEach(el=>{el.disabled=false;el.classList.remove('tf-locked');});
  document.body.classList.remove('tf-locked-nl');
  // reveal the aid panels exactly as loadProblem configured them
  const nlp=document.getElementById('nl-panel');
  const ct=document.getElementById('chain-tools');
  if(nlp)nlp.style.display=_aidHidden.nl;
  if(ct)ct.style.display=_aidHidden.ct;
  const note=document.getElementById('tf-nl-note');if(note)note.style.display='none';
  const hint=document.getElementById('hint');if(hint)hint.style.visibility='';
  document.getElementById('tf-msg')?.remove();
}
/* ── Reset current ── */
function resetCur(){
  done=false;
  renderEq();setFb('','');showBtns('check');resetAidUsed();
  if(ptype===TT){NL.configure(100,10);NL.init(num1);}
  if(ptype===TH){const _s=(num2%100===0)?100:10;NL.configure(num1+num2+_s,_s,num1);NL.init(num1);}
  setTimeout(()=>{
    const first=(ptype===TX||ptype===TZ)?document.getElementById('tx-sub1')
               :(ptype===TDA||ptype===TDS||ptype===TRA)?document.getElementById('ans1'):null;
    (first||document.getElementById('ans'))?.focus();
  },60);
}
function nextP(){
  if(report[idx]&&report[idx].wrongs.length>0&&!report[idx].gotCorrect)
    report[idx].skipped=true;
  idx++;loadProblem();
}

/* ── End game ── */
function calcGrade(){
  if(!report||!report.length)return 1000;
  const sum=report.reduce((s,r)=>{
    if(!r.gotCorrect||r.wrongs.length>0)return s;
    return s+100;
  },0);
  return Math.max(101,Math.round(sum*10/report.length));
}
function gradeMsg(g){
  if(g>=950)return'מְעֻלֶּה! 🌟';
  if(g>=850)return'כָּל הַכָּבוֹד! ⭐';
  if(g>=700)return'יָפֶה מְאֹד 💫';
  if(g>=550)return'טוֹב 👍';
  if(g>=400)return'אֶפְשָׁר יוֹתֵר 🙂';
  return'צְרִיכָה לְהִתְאַמֵּן 💪';
}
function endGame(){
  document.getElementById('prog-bar').style.width='100%';
  document.getElementById('prog-txt').textContent='🎊 סִיַּמְתְּ!';
  const g=calcGrade();const giftGoal=GIFT_GOALS[mode];const wonGift=giftGoal>0&&g>=giftGoal;
  const giftN=wonGift?giftCount(mode):0;   // how many prizes this win awards (configured per game)
  const giftHtml=wonGift
    ?`<span class="end-gift">🎁${giftN>1?`<span class="end-gift-x">×${giftN}</span>`:''}</span>`+
     `<div class="end-gift-count">${giftN>1?`זָכִית בְּ־${giftN} פְּרָסִים!`:'זָכִית בַּפְּרָס!'}</div>`
    :'';
  recordHistory(g,wonGift);      // log this completed set (name + game + grade + prizes won + per-exercise detail)
  if(mode===0){
    document.getElementById('card').innerHTML=`
      <div class="end-scr">
        <div class="end-uni">🌟</div>
        <div class="end-ttl">🌟 מְעֻלֶּה! 🌟</div>
        <div class="end-grade-num">${g}</div>
        <div class="end-grade-max">מִתּוֹךְ 1000</div>
        <div class="end-grade-msg">${gradeMsg(g)}</div>
        ${giftHtml}
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">
          <button class="btn b-rpl" onclick="setMode('br')">הַמְשִׁיכִי לְגָּשֵׁר 10 🚀</button>
          <button class="btn b-rep" onclick="reportOpen()">📊 סִיכּוּם</button>
        </div>
      </div>`;
    if(wonGift&&typeof showGiftScreen==='function')setTimeout(showGiftScreen,450);
    return;
  }
  {document.getElementById('card').innerHTML=`
    <div class="end-scr">
      <div class="end-uni">🦄</div>
      <div class="end-ttl">🎊 סִיַּמְתְּ! 🎊</div>
      <div class="end-grade-num">${g}</div>
      <div class="end-grade-max">מִתּוֹךְ 1000</div>
      <div class="end-grade-msg">${gradeMsg(g)}</div>
      ${giftHtml}
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:4px">
        <button class="btn b-rpl" onclick="restart()">שַׂחֲקִי שׁוּב 🔄</button>
        <button class="btn b-rep" onclick="reportOpen()">📊 סִיכּוּם</button>
      </div>
    </div>`;
  // earned a gift this set → play the special gift celebration over the end
  // screen (a reward reveal); it's never shown after a single correct answer
  if(wonGift&&typeof showGiftScreen==='function')setTimeout(showGiftScreen,450);}
}

function rebuildCard(){
  document.getElementById('card').innerHTML=`
    <div class="eq-row"><div class="equation" id="eq"></div><div class="eq-btns-row"><button id="chk-btn" class="chk-btn" onclick="checkAns()">✔?</button><div class="eq-mini-btns"><button id="digit-hint-btn" class="tt-hint-icon" style="display:none" data-hint="" onclick="showDigitHint(this)">?</button><button class="games-drop-btn gm-active" id="games-drop-btn" onclick="openGamesMenu(event)" title="מִשְׂחֲקוֹנִים">🦘</button></div></div></div>
    <div class="hint"     id="hint"></div>
    <div id="chain-tools" style="display:none">
      <div id="tf-nl-note">💪 נַסִּי לְבַד. אַתְּ אַלּוּפָה!</div>
      <div class="pgm-nl"><div class="pgm-bar" id="pgm-bar"><svg class="pgm-arcs-svg" id="pgm-arcs-svg" viewBox="0 0 100 16" preserveAspectRatio="none"></svg><div class="pgm-dot" id="pgm-dot"></div></div><div class="pgm-nl-nums" id="pgm-nums"></div></div>
      <div class="pgm-scene">
        <button class="pgm-side pgm-minus" id="pgm-btn-minus" onclick="pgmMinus()">−</button>
        <div class="pgm-jar-col">
          <div id="pgm-ck-jar"></div><div id="pgm-gn-display" style="display:none"><div class="pgm-gn-flowers" id="pgm-gn-flowers"></div><div class="pgm-gn-lbl">🌸 <span id="pgm-gn-count">0</span></div></div><div class="pgm-jar-btm"><div class="pgm-val" id="pgm-val">0</div><button class="pgm-rst" onclick="pgmInitChain()" title="התחל מחדש">↺</button></div>
        </div>
        <button class="pgm-side pgm-plus" id="pgm-btn-plus" onclick="pgmPlus()">+</button>
      </div>
    </div>
    <div id="nl-panel" style="display:none"><div class="nl-row"><button class="side-btn btn-minus" id="nl-btn-minus" onclick="NL.step(-1)">−</button><div class="nl-wrap" id="nl-wrap"><svg class="nl-arcs-svg" id="nl-arcs-svg" viewBox="0 0 600 88" preserveAspectRatio="none"></svg><div class="nl-bar-track" id="nl-bar"><div class="nl-dot" id="nl-dot"></div></div></div><button class="side-btn btn-plus" id="nl-btn-plus" onclick="NL.step(1)">+</button></div><div class="nl-controls"><button class="ctrl-btn btn-reset" onclick="NL.reset()"><span class="btn-icon">↺</span></button><button class="ctrl-btn btn-undo" onclick="NL.undo()"><span class="btn-icon">↩</span></button></div></div>
    <div class="div"></div>
    <div class="fb" id="fb"></div>
    <div class="btn-row" id="btns"></div>`;
  NL.attachBarEvents();
  // fill the rider / jar art from the active aid variant (dynamically loaded)
  if(typeof applyAidsVariant==='function')applyAidsVariant();
}

function restart(){
  score=0;idx=0;report=[];pgmCV=0;pgmCk=[];pgmArcs=[];document.getElementById('score-val').textContent='0';
  const m=mode;
  loadExercisesFor(m,()=>{
    if(mode!==m)return;   // a different mode was picked while loading
    problems=makePool(m);rebuildCard();loadProblem();
  });
}


/* ── Report ── */
/* one summary row per completed exercise → {eq, ok, wrongs, correct, skipped}. Built at end-of-set while
   problems[] is still intact, so the equation TEXT can be captured (and persisted into the score history).
   Every ptype renders its real operation (subtraction shows −, coin/bagel show their multiplication, …). */
function _reportRows(){
  return (report||[]).map((r,i)=>{
    const p=problems[i]||{};
    let eq;
    if(r.ptype===TM)      eq=`${r.num1} − ${r.correct} = ${r.num2}`;
    else if(r.ptype===TS) eq=`${r.num1} − ${r.num2} = ${r.correct}`;
    else if(r.ptype===TX) eq=`${r.num1} − ${r.num2} + ${r.num3} = ${r.correct}`;
    else if(r.ptype===TW) eq=`${r.num1} − ${r.num2} − ${r.num3} = ${r.correct}`;
    else if(r.ptype===TZ) eq=r.num4>0?`${r.num1} + ${r.num2} + ${r.num3} + ${r.num4} = ${r.correct}`:`${r.num1} + ${r.num2} + ${r.num3} = ${r.correct}`;
    else if(r.ptype===TDA){const pr=r.userPair;eq=pr?`${pr[0]} + ${pr[1]} = ${r.correct}`:`___ + ___ = ${r.correct}`;}
    else if(r.ptype===TRA){const pr=r.userPair;eq=pr?`${pr[0]} + ${pr[1]} + ${pr[2]} = ${r.correct}`:`___ + ___ + ___ = ${r.correct}`;}
    else if(r.ptype===TDS){const pr=r.userPair;eq=pr?`${pr[0]} − ${pr[1]} = ${r.correct}`:`___ − ___ = ${r.correct}`;}
    else if(r.ptype===TC) eq=`🪙 ${(p.coins||[]).join(' + ')} = ${r.correct}`;
    else if(r.ptype===TT) eq=`${r.num1} ${(r.num1+r.num2===r.correct)?'+':'−'} ${r.num2} = ${r.correct}`;
    else if(r.ptype===TBG)eq=`${r.num1} ${(p.op||'sub')==='add'?'+':'−'} ${r.num2} = ${r.correct}`;
    else if(r.ptype===TCS)eq=`${r.num1} − ${r.num2} = ${r.correct}`;
    else if(r.ptype===TCM)eq=`🪙 ${r.correct} × ${r.num2||5} = ${r.num1}`;
    else if(r.ptype===TBC)eq=`🥨 ${r.num1} × ${r.num2||5} = ${r.correct}`;
    else if(r.ptype===TIC)eq=`🍦 ${r.correct} × ₪${r.num2||2} = ₪${r.num1}`;
    else if(r.ptype===TPG)eq=`🔷 ${({3:'מְשֻׁלָּשׁ',4:'מְרֻבָּע',5:'מְחֻמָּשׁ',6:'מְשֻׁשֶּׁה',7:'מְשֻׁבָּע',8:'מְתֻמָּן',10:'כּוֹכָב',12:'כּוֹכָב'}[r.correct]||'צוּרָה')} — ${r.correct} ${p.b===1?'קֹדְקוֹדִים':'צְלָעוֹת'}`;
    else if(r.ptype===TPP)eq=`📐 ${(p.sides||[]).join('+')} = ${r.correct}`;
    else if(r.ptype===TCP)eq=`⚖️ ${r.num1} ${r.num1<r.num2?'<':r.num1>r.num2?'>':'='} ${r.num2}`;
    else if(r.ptype===TMC)eq=`✖️ ${r.num1} × ${r.num2} = ${r.correct}`;
    else if(r.ptype===TMK)eq=`🏆 ${r.num1} × ${r.num2} = ${r.correct}`;
    else if(r.ptype===TMU)eq=`❓ ${r.num1} × ${r.correct} = ${r.num1*r.correct}`;
    else if(r.ptype===TWP)eq=`📖 ${r.num1} ${(p.op||'sub')==='add'?'+':'−'} ${r.num2} = ${r.correct}`;
    else if(r.ptype===TWC){const o=p.ops||['add','sub'];eq=`📖 ${r.num1} ${o[0]==='add'?'+':'−'} ${r.num2} ${o[1]==='add'?'+':'−'} ${r.num3} = ${r.correct}`;}
    else if(r.ptype===TSQ)eq=`${p.emoji||'📖'} סִפּוּר — תְּשׁוּבָה ${r.correct}`;
    else if(r.ptype===TCZ)eq=`📝 הַמִּלָּה: ${(p.opts&&p.opts[r.correct-1])||'?'}`;
    else if(r.ptype===TTF)eq=`✔️✖️ ${r.correct===1?'נָכוֹן':'לֹא נָכוֹן'}`;
    else if(r.ptype===TWM)eq=`🖼️ הַתְאָמָה ${(p.pairs||[]).map(x=>x.e).join(' ')}`;
    else if(r.ptype===TSO)eq=`🔀 ${(p.words||[]).join(' ')}`;
    else if(r.ptype===TRH){const _o=(p.opts||[])[r.correct-1];eq=`🎵 ${(p.cue||{}).w||'?'} — ${(_o||{}).w||'?'}`;}
    else if(r.ptype===TTS)eq=`➕ ___ + ___ + ___ = ${r.correct}`;
    else if(r.ptype===THF){const _k=p.k||2;eq=`${p.item||'✂️'} ${p.n||r.correct*_k} ÷ ${_k} = ${r.correct}`;}
    else if(r.ptype===TPL)eq=`🍽️ ${p.g||'?'} × ${p.s||'?'} = ${r.correct}`;
    else if(r.ptype===TVA||r.ptype===TVS){const E=s=>({circle:'🔵',triangle:'🔺',square:'🟦'}[s]||'🔷');const e=E(p.sym),opc=r.ptype===TVA?'+':'−';
      eq=p.symA?`${E(p.symA)}=${r.num1} ${e}=${r.num2} · ${E(p.symA)} ${opc} ${e} = ${r.correct}`:`${e}=${r.num2} · ${r.num1} ${opc} ${e} = ${r.correct}`;}
    else                  eq=`${r.num1} + ${r.num2} = ${r.correct}`;   // TA, TCA (column add)
    return {eq,ok:(r.wrongs||[]).length===0&&!r.skipped,wrongs:(r.wrongs||[]).slice(),correct:r.correct,skipped:!!r.skipped};
  });
}
/* one .rep-row's HTML — shared by the end-of-set summary AND the per-entry history detail */
function _reportRowHtml(row,i){
  let right;
  if(row.ok) right=`<span class="rep-check">✓</span>`;
  else if(row.skipped) right=row.wrongs.map(w=>`<span class="rep-wrong-val">✗${w}</span>`).join('')+`<span class="rep-arrow">→</span><span class="rep-skipped">דולג</span>`;
  else right=row.wrongs.map(w=>`<span class="rep-wrong-val">✗${w}</span>`).join('')+`<span class="rep-arrow">→</span><span class="rep-correct">✓${row.correct}</span>`;
  return `<div class="rep-row ${row.ok?'rep-ok':'rep-bad'}"><span class="rep-badge">${i+1}</span>`
       + `<div class="rep-body"><span class="rep-eq-txt">${row.eq}</span><div class="rep-right">${right}</div></div></div>`;
}
function reportOpen(){
  if(!report||!report.length)return;
  const rows=_reportRows();
  const errCount=rows.filter(r=>!r.ok).length, perfect=errCount===0;
  let html=`<div class="rep-sum ${perfect?'rep-sum-ok':'rep-sum-err'}">`;
  html+=perfect
    ?'🌟 מְצֻיֶּנֶת! כָּל הַתַּרְגִּילִים בְּלִי טְעֻיּוֹת!'
    :`טָעִיתְ בְּ-${errCount} תַּרְגִּילִים מִתּוֹךְ ${rows.length}`;
  html+='</div>';
  rows.forEach((r,i)=>{html+=_reportRowHtml(r,i);});
  document.getElementById('report-body').innerHTML=html;
  document.getElementById('report-ov').style.display='flex';
}
function reportClose(){document.getElementById('report-ov').style.display='none';}

/* ── Score history — every completed set is logged (name + game + grade + whether the PRIZE 🎁 was won +
   the per-exercise detail rows) and kept across runs in localStorage 'scoreHistory' (newest first, capped
   60). Shown in the settings modal's 📜 history tab (renderHistory → #history-body); tapping a row reveals
   its exercises + answers, exactly like the end-of-set summary (📊). ── */
function _escHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function _gameLabel(m){const md=DIFFICULTY_GROUPS.flatMap(g=>g.modes).find(x=>x.id===m);return md?md.label:String(m);}
function _loadHistory(){try{return JSON.parse(localStorage.getItem('scoreHistory')||'[]')||[];}catch(e){return [];}}
function recordHistory(grade,won){
  try{
    const h=_loadHistory();
    h.unshift({name:(typeof playerName==='function'?playerName():''),mode:String(mode),
               game:_gameLabel(mode),grade:grade,won:!!won,
               prizes:won?giftCount(mode):0,   // how many prizes this win awarded (per-game config)
               rows:_reportRows(),ts:Date.now()});
    localStorage.setItem('scoreHistory',JSON.stringify(h.slice(0,60)));
  }catch(e){}
}
function clearHistory(){try{localStorage.removeItem('scoreHistory');}catch(e){}renderHistory();}
function toggleHistDetail(i){const d=document.getElementById('hist-detail-'+i);if(d)d.style.display=(d.style.display==='none'?'block':'none');}
function renderHistory(){
  const body=document.getElementById('history-body');if(!body)return;
  const h=_loadHistory();
  if(!h.length){body.innerHTML='<div class="hist-empty">עֲדַיִן אֵין צִיּוּנִים שְׁמוּרִים 🙂</div>';return;}
  const rows=h.map((e,i)=>{
    const d=new Date(e.ts||0);
    const dt=(e.ts&&!isNaN(d))?`${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`:'';
    const nm=e.name?`<span class="hist-name">${_escHtml(e.name)}</span>`:'';
    const gift=e.won?('🎁'+((e.prizes||1)>1?'×'+e.prizes:'')+' '):'';   // prizes earned this set (×N when multi)
    const hasDetail=!!(e.rows&&e.rows.length);
    const caret=hasDetail?'<span class="hist-caret">▾</span>':'';
    const rowAttr=hasDetail?` onclick="toggleHistDetail(${i})" style="cursor:pointer" title="הַצִּיגִי אֶת הַתַּרְגִּילִים"`:'';
    let detail='';
    if(hasDetail){
      const errCount=e.rows.filter(r=>!r.ok).length, perfect=errCount===0;
      const sum=perfect?'🌟 כָּל הַתַּרְגִּילִים בְּלִי טְעֻיּוֹת!':`טָעֻיּוֹת בְּ-${errCount} מִתּוֹךְ ${e.rows.length}`;
      detail=`<div class="hist-detail" id="hist-detail-${i}" style="display:none">`+
             `<div class="rep-sum ${perfect?'rep-sum-ok':'rep-sum-err'}">${sum}</div>`+
             e.rows.map((r,j)=>_reportRowHtml(r,j)).join('')+`</div>`;
    }
    return `<div class="hist-row"${rowAttr}><span class="hist-grade">${gift}${e.grade}</span>`+
           `<span class="hist-game">${_escHtml(e.game||e.mode||'')}</span>${nm}`+
           `<span class="hist-date">${dt}${caret}</span></div>${detail}`;
  }).join('');
  body.innerHTML=`<div class="hist-list">${rows}</div>`+
    `<button class="hist-clear" onclick="clearHistory()">🗑️ נַקֵּה הִיסְטוֹרְיָה</button>`;
}

/* ── Number-hover visualization tooltip ──
   Hovering on any .eq-n or .eq-res shows that number rendered as OBJECTS.
   GENERIC by design: the object art comes from the active AIDS variant's
   jar items (aids/<name>.aids.js — cookies / asteroids / pearls / coins /
   cupcakes), so it always matches the background; the tooltip box itself is
   restyled per skin (#num-tt rules in game/skins/<name>.skin.css). */
function _nttItemHTML(i){
  const v=(window.AIDS&&(AIDS.current||(AIDS.variants&&AIDS.variants.classic)))||{};
  const f=v.jar&&v.jar.itemSVG;
  return f?f(i%5):'⭐';
}
/* Bridge-through-ten split for a NON-first operand: combining `x` onto a running
   `base` via op ('add'/'sub'). Returns {left,right} when the step crosses a ten
   — left = the part that completes `base` to the ten (the complement on add, the
   units on sub), right = the leftover — or null when it doesn't bridge. */
function _bridgeSplit(base,op,x){
  if(!(base>0)||!(x>0))return null;
  let left;
  if(op==='add')left=(10-base%10)%10;       // up to the next ten
  else if(op==='sub')left=base%10;          // down to this ten
  else return null;
  if(left<=0||x<=left)return null;          // stays on one side of the ten → no split
  return {left,right:x-left};
}
// objects in groups of up to 5; art indexed continuously from `start`
function _nttGroups(start,count){
  let out='';
  for(let i=0;i<count;i+=5){
    const c=Math.min(5,count-i);
    let g='';for(let j=0;j<c;j++)g+=`<span>${_nttItemHTML(start+i+j)}</span>`;
    out+=`<div class="ntt-group" style="grid-template-columns:repeat(${c},26px)">${g}</div>`;
  }
  return out;
}
// Render the tooltip for `num` objects, optionally split into [left,right]
// (a number-bond), anchored to `anchorEl`. `side` is 'below' (default) or
// 'right' (used by Superman's column digits where below would cover a row).
// Shared by hover (.eq-n/.eq-res via _nttShow), the two-addends input preview
// (_nttInput) and the column-addition digit preview.
// a full-screen celebration is up (success / gift / intro splash) → the number
// tooltip must never sit over it, even while a hover is still active.
function _celebrationUp(){
  return (typeof _fwOn!=='undefined'&&_fwOn)
      || (typeof _giftOn!=='undefined'&&_giftOn)
      || (typeof _introOn!=='undefined'&&_introOn);
}
function _nttRender(num,split,anchorEl,side){
  const tt=document.getElementById('num-tt');if(!tt)return;
  if(_celebrationUp()){tt.style.display='none';return;}   // hide + bail while a celebration screen shows
  const grid=tt.querySelector('.ntt-grid');
  const lbl=tt.querySelector('.ntt-lbl');
  grid.classList.remove('ntt-splitlist');               // clear the TRA splits-fan layout
  if(split){
    grid.classList.add('ntt-split');
    // two columns: each PART number stacked directly ABOVE its own cluster of
    // objects (left = complete-to-ten, right = remainder), divider between.
    grid.innerHTML=
      `<div class="ntt-side ntt-left"><span class="ntt-part">${split[0]}</span><div class="ntt-objs">${_nttGroups(0,split[0])}</div></div>`+
      `<div class="ntt-div"></div>`+
      `<div class="ntt-side ntt-right"><span class="ntt-part">${split[1]}</span><div class="ntt-objs">${_nttGroups(split[0],split[1])}</div></div>`;
    // the whole number sits above; branch lines (drawn by _nttBond after layout)
    // connect it down to each part.
    lbl.classList.add('ntt-lbl-split');
    lbl.innerHTML=`<div class="ntt-whole">${num}</div>`;
  }else{
    grid.classList.remove('ntt-split');
    grid.innerHTML=_nttGroups(0,num);
    lbl.classList.remove('ntt-lbl-split');
    lbl.textContent=num;
  }
  tt.classList.toggle('ntt-rt',side==='right');         // compacter split when shown beside a digit
  tt.style.display='block';
  const r=anchorEl.getBoundingClientRect();
  const tw=tt.offsetWidth,th=tt.offsetHeight;
  let left,top;
  if(side==='right'){
    // beside the anchor, vertically centred; flip to the left if it would overflow
    left=r.right+12;
    if(left+tw>innerWidth-8)left=Math.max(8,r.left-tw-12);
    top=Math.max(8,Math.min(r.top+r.height/2-th/2,innerHeight-th-8));
  }else{
    // below the anchor; flip above if off-screen
    left=Math.max(8,Math.min(r.left+r.width/2-tw/2,innerWidth-tw-8));
    top=r.bottom+10;
    if(top+th>innerHeight-8)top=r.top-th-10;
  }
  tt.style.left=left+'px';
  tt.style.top=top+'px';
  _nttBond(tt,grid,split);                              // draw the bond branches once laid out
}
function _nttShow(el){
  const num=parseInt(el.getAttribute('data-num'),10);
  if(isNaN(num)||num<=0||num>100)return;
  // crossing-ten operands carry data-split="left,right": show the complete-to-ten
  // part flushed left and the remainder flushed right, separated by a divider.
  let split=null;const sa=el.getAttribute('data-split');
  if(sa){const m=sa.split(',').map(s=>parseInt(s,10));
    if(m.length===2&&m[0]>0&&m[1]>0&&m[0]+m[1]===num)split=m;}
  _nttRender(num,split,el);
}
// Two-addends preview: while typing in the first input of a ? + ? = n exercise,
// show that number's objects (plain — no make-ten split).
function _nttInput(inp){
  // in cookie-jar aid mode the jar itself previews the count (tdaJarSync), so
  // don't also pop the hover tooltip — the kangaroo mode keeps the tooltip.
  if(typeof aidMode!=='undefined'&&aidMode==='nl'){_nttHide();return;}
  const v=parseInt(inp.value,10);
  if(isNaN(v)||v<=0||v>100){_nttHide();return;}
  _nttRender(v,null,inp);
}
/* THREE-UNKNOWN (TRA, __+__+__=r) split preview: hovering a filled addend box
   shows ALL the ways to split that number into two parts (its number-bonds) as
   emoji clusters — 1+(v-1), 2+(v-2) … up to the middle. Helps the child see how
   an addend she typed is built (and how she could redistribute toward the goal). */
function _nttSplits(v,anchorEl){
  const tt=document.getElementById('num-tt');if(!tt)return;
  if(_celebrationUp()){tt.style.display='none';return;}
  const grid=tt.querySelector('.ntt-grid');
  const lbl=tt.querySelector('.ntt-lbl');
  grid.classList.remove('ntt-split');
  lbl.classList.remove('ntt-lbl-split');
  lbl.textContent=v;                                     // the whole number sits on top
  if(v<2){                                               // 1 has no two-part split → plain count
    grid.classList.remove('ntt-splitlist');
    grid.innerHTML=_nttGroups(0,v);
  }else{
    grid.classList.add('ntt-splitlist');
    let rows='';
    for(let k=1;k<=Math.floor(v/2);k++){                 // unique unordered splits, no 0 part
      rows+=`<div class="ntt-splitrow">`+
        `<span class="ntt-part">${k}</span><div class="ntt-objs">${_nttGroups(0,k)}</div>`+
        `<span class="ntt-plus">+</span>`+
        `<span class="ntt-part">${v-k}</span><div class="ntt-objs">${_nttGroups(k,v-k)}</div>`+
      `</div>`;
    }
    grid.innerHTML=rows;
  }
  _nttBond(tt,grid,null);                                // no single-bond lines for the list
  tt.classList.remove('ntt-rt');
  tt.style.display='block';
  const r=anchorEl.getBoundingClientRect();
  const tw=tt.offsetWidth,th=tt.offsetHeight;
  let left=Math.max(8,Math.min(r.left+r.width/2-tw/2,innerWidth-tw-8));
  let top=r.bottom+10;
  if(top+th>innerHeight-8)top=Math.max(8,r.top-th-10);
  tt.style.left=left+'px';tt.style.top=top+'px';
}
// hover a TRA addend box → show that typed number's splits (nothing if empty)
function _nttSplitsFromInput(inp){
  const v=parseInt(inp.value,10);
  if(isNaN(v)||v<1||v>100){_nttHide();return;}
  _nttSplits(v,inp);
}
// Draw (or hide) the number-bond branch lines: an SVG overlay on #num-tt whose
// endpoints are MEASURED so each line points exactly from the whole number down
// to its part. Re-measured every show because object counts vary the geometry.
function _nttBond(tt,grid,split){
  let bond=tt.querySelector('.ntt-bond-ov');
  if(!split){if(bond)bond.style.display='none';return;}
  if(!bond){
    bond=document.createElementNS('http://www.w3.org/2000/svg','svg');
    bond.setAttribute('class','ntt-bond-ov');
    tt.insertBefore(bond,tt.firstChild);              // behind the text
  }
  const whole=tt.querySelector('.ntt-whole'),ps=grid.querySelectorAll('.ntt-part');
  if(!whole||ps.length<2){bond.style.display='none';return;}
  bond.style.display='block';
  const tr=tt.getBoundingClientRect();
  bond.setAttribute('width',tr.width);bond.setAttribute('height',tr.height);
  bond.setAttribute('viewBox',`0 0 ${tr.width} ${tr.height}`);
  const cx=r=>r.left-tr.left+r.width/2;
  const w=whole.getBoundingClientRect(),a=ps[0].getBoundingClientRect(),b=ps[1].getBoundingClientRect();
  const GAP=9;                                          // ~0.25cm clear space so a line never touches its part number
  const sx=cx(w),sy=w.bottom-tr.top-1;
  const ay=a.top-tr.top-GAP,by=b.top-tr.top-GAP;
  bond.innerHTML=
    `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${cx(a).toFixed(1)}" y2="${ay.toFixed(1)}"/>`+
    `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${cx(b).toFixed(1)}" y2="${by.toFixed(1)}"/>`;
}
function _nttHide(){const tt=document.getElementById('num-tt');if(tt)tt.style.display='none';}
document.addEventListener('mouseover',e=>{
  const t=e.target;
  if(t&&t.nodeType===1&&t.hasAttribute('data-num')&&(t.classList.contains('eq-n')||t.classList.contains('eq-res'))&&!t.classList.contains('eq-noobj'))_nttShow(t);
});
document.addEventListener('mouseout',e=>{
  const t=e.target;
  if(t&&t.nodeType===1&&t.hasAttribute('data-num')&&(t.classList.contains('eq-n')||t.classList.contains('eq-res')))_nttHide();
});

