/* ── Success celebration ──────────────────────────────────────────────────
   Every celebration is an EXTERNAL screen (success_screens/*.js). The legacy
   built-in screens from the old single-file game (canvas fireworks + the four
   "nfw" overlays) were removed; this host only orchestrates the registered
   screens. */
let _fwOn=false,_fwKey=null,fwCount=0,_fwTO=null;

/* ── SUCCESS registry — external celebration screens plug in here ──────────
   Contract (see success_screens_spec.md): a screen file registers
     window.SUCCESS.styles.push({name, supportsSuper, show(opts) → cleanup})
   and is then picked at random after each correct answer. The host (this file)
   owns the root element, timing, the Enter/Space skip and cleanup. */
window.SUCCESS=window.SUCCESS||{};
window.SUCCESS.styles=window.SUCCESS.styles||[];
let _extRoot=null,_extCleanup=null,_extBdTO=null;

/* ── Praise headlines ───────────────────────────────────────────────────────
   The headline shown on every success screen is picked at RANDOM from a pool
   (so it isn't always "כל הכבוד"). If a player name is configured (settings
   modal → localStorage 'playerName'), the name is woven in only ONCE EVERY 2–3
   screens ("כָּל הַכָּבוֹד נֹעָה!", "הִצְלַחְתְּ נֹעָה!" …) — most screens stay
   nameless so the name stays special and doesn't get repetitive. All forms are
   feminine, matching the game's audience. */
const _PRAISE_PLAIN=[
  'כָּל הַכָּבוֹד!','מְצֻיָּן!','נֶהְדָּר!','יוֹפִי!','מַדְהִים!','אַלּוּפָה!',
  'וָואו!','פַּנְטַסְטִי!','אֵשֶׁת חַיִל!','הִצְלַחְתְּ!','מוֹשְׁלָם!','כָּל הַכָּבוֹד!',
];
const _PRAISE_NAMED=[
  'כָּל הַכָּבוֹד {n}!','הִצְלַחְתְּ {n}!','אַלּוּפָה {n}!','יוֹפִי {n}!',
  'מַדְהִים {n}!','בְּרָבוֹ {n}!','אֵשֶׁת חַיִל {n}!','מְצֻיָּן {n}!','וָואו {n}!',
];
function playerName(){try{return (localStorage.getItem('playerName')||'').trim();}catch(e){return '';}}
function setPlayerName(v){try{localStorage.setItem('playerName',(v||'').trim());}catch(e){}}
/* name cadence: count screens since the name last appeared and only use the
   named pool once the count reaches a target of 2 or 3 (re-rolled each time),
   so the name shows up roughly once every 2–3 success screens, not every time */
let _praiseSinceName=0,_praiseNameEvery=2+(0|Math.random()*2);
function _praise(){
  const n=playerName();
  if(n&&++_praiseSinceName>=_praiseNameEvery){
    _praiseSinceName=0;_praiseNameEvery=2+(0|Math.random()*2);
    const p=_PRAISE_NAMED;return p[0|Math.random()*p.length].replace('{n}',n);
  }
  const p=_PRAISE_PLAIN;return p[0|Math.random()*p.length];
}

function _skinPalette(){
  // colors supplied by the active background's skin (game/skins/*.skin.css)
  const cs=getComputedStyle(document.documentElement);
  const v=(n,f)=>(cs.getPropertyValue(n)||'').trim()||f;
  // success/gift/intro screens draw over a NEAR-BLACK backdrop, so the praise
  // text needs a light color. Most skins' --skin-text is already light, but a
  // light-scene skin (e.g. unicorns) uses dark ink for the in-game text — it
  // can set --skin-ov-text to a light on-brand color JUST for these overlays
  // without disturbing its in-game text. Falls back to --skin-text.
  return{primary:v('--skin-primary','#C77DFF'),accent:v('--skin-accent','#FFD27D'),
         glow:v('--skin-glow','#7DC4FF'),
         text:v('--skin-ov-text','')||v('--skin-text','#FFFFFF')};
}

/* ── Random scene-matched backdrop ─────────────────────────────────────────
   The success modal's cover is a DARK gradient whose hue is picked at random
   from the active skin's palette (space → cyan/violet, unicorns → pink/lilac,
   reef → aqua …) and sunk deep toward black, so each celebration shows a
   slightly different but on-theme near-black cover over the game. */
function _hex2rgb(c){
  c=c.trim().replace('#','');
  if(c.length===3)c=c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  return[parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)];
}
function _mix(a,b,t){
  const A=_hex2rgb(a),B=_hex2rgb(b);
  return'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')';
}
function _skinBackdrop(){
  const p=_skinPalette();
  const cols=[p.primary,p.glow,p.accent];
  const c=cols[Math.floor(Math.random()*cols.length)];
  const near='#05030c';
  const inner=_mix(c,near,0.82+Math.random()*0.08);   // 82–90% toward black
  const mid  =_mix(c,near,0.93);
  const cx=42+Math.floor(Math.random()*16);            // slight random framing
  const cy=32+Math.floor(Math.random()*14);
  return'radial-gradient(circle at '+cx+'% '+cy+'%,'+inner+' 0%,'+mid+' 55%,#04020a 100%)';
}

function _showExternal(styleDef,isSuper,DUR){
  _extRoot=document.createElement('div');
  _extRoot.style.cssText='position:fixed;inset:0;z-index:996;pointer-events:none';
  // random scene-matched dark backdrop — a full modal cover behind the
  // celebration. It sits as the FIRST child so the screen's own canvas
  // (appended by show()) layers on top; fades in on open, out before advancing.
  const _bd=document.createElement('div');
  _bd.style.cssText='position:absolute;inset:0;opacity:0;transition:opacity .26s ease;background:'+_skinBackdrop();
  _extRoot.appendChild(_bd);
  document.body.appendChild(_extRoot);
  requestAnimationFrame(()=>{_bd.style.opacity='1';});
  _extBdTO=setTimeout(()=>{_bd.style.transition='opacity .34s ease';_bd.style.opacity='0';},Math.max(0,DUR-300));
  // the advance timer is armed BEFORE the external show() runs, and the call
  // is guarded — a broken external screen must never soft-lock the game
  // (an exception here would otherwise leave _fwOn stuck at true forever)
  _fwTO=setTimeout(_fwDone,DUR);
  try{
    _extCleanup=styleDef.show({
      root:_extRoot,isSuper,durationMs:DUR,points:modePts(),
      palette:_skinPalette(),praise:_praise(),
    })||null;
  }catch(e){
    _extCleanup=null;
    if(window.console)console.warn('success screen "'+(styleDef.name||'?')+'" failed:',e);
  }
}

function showFw(){
  if(_fwOn)return;_fwOn=true;
  fwCount++;
  const isSuper=(fwCount%5===0);
  const DUR=isSuper?4500:2700;   // +1s over the original 3500/1700 — linger longer
  _fwKey=e=>{if(e.key==='Enter'||e.key===' ')fwClose();};
  document.addEventListener('keydown',_fwKey);
  // pick a random registered screen (super variants only on every 5th win);
  // with no screens loaded yet, just advance so the game never soft-locks
  const _ext=window.SUCCESS.styles||[];
  const pool=isSuper?_ext.filter(s=>s.supportsSuper):_ext;
  if(!pool.length){_fwDone();return;}
  _showExternal(pool[0|Math.random()*pool.length],isSuper,DUR);
}
const SAD_EMOJIS=['😢','😭','🥺','😞','☹️','😔','😣','🤧','😿','💔','😩','🙈'];
function showSadModal(){
  const ov=document.getElementById('sad-ov');
  const box=ov.querySelector('.sad-box');
  box.querySelector('.sad-emoji').textContent=SAD_EMOJIS[0|Math.random()*SAD_EMOJIS.length];
  ov.style.display='flex';
  const clone=box.cloneNode(true);
  ov.replaceChild(clone,box);
  setTimeout(()=>ov.style.display='none',1500);
}

function _fwDone(){
  if(!_fwOn)return;_fwOn=false;
  if(_fwTO){clearTimeout(_fwTO);_fwTO=null;}
  if(_extBdTO){clearTimeout(_extBdTO);_extBdTO=null;}
  if(_fwKey){document.removeEventListener('keydown',_fwKey);_fwKey=null;}
  if(_extCleanup){try{_extCleanup();}catch(e){}_extCleanup=null;}
  if(_extRoot){_extRoot.remove();_extRoot=null;}
  nextP();
}
function fwClose(){_fwDone();}

/* ── Gift reward screen — a SPECIAL celebration, not part of the rotation ────
   Played by endGame() only when the grade clears the mode's gift threshold
   (GIFT_GOALS, core.js). The screen registers into window.SUCCESS.special.gift
   (success_screens/gift/) instead of the per-answer styles list. Self-contained
   player: own root + skin backdrop, skip on Enter/Space/click, no nextP on done
   (the set is already over). */
let _giftOn=false,_giftRoot=null,_giftCleanup=null,_giftTO=null,_giftBdTO=null,_giftKey=null;
function _giftDone(){
  if(!_giftOn)return;_giftOn=false;
  if(_giftTO){clearTimeout(_giftTO);_giftTO=null;}
  if(_giftBdTO){clearTimeout(_giftBdTO);_giftBdTO=null;}
  if(_giftKey){document.removeEventListener('keydown',_giftKey);_giftKey=null;}
  if(_giftCleanup){try{_giftCleanup();}catch(e){}_giftCleanup=null;}
  if(_giftRoot){_giftRoot.remove();_giftRoot=null;}
}
function showGiftScreen(){
  const gift=window.SUCCESS&&SUCCESS.special&&SUCCESS.special.gift;
  if(!gift||_giftOn)return;
  _giftOn=true;
  const DUR=3500;
  _giftRoot=document.createElement('div');
  // above the end screen / report; the backdrop captures clicks so a tap skips
  // the reward without falling through to the replay/report buttons beneath
  _giftRoot.style.cssText='position:fixed;inset:0;z-index:1002;pointer-events:none';
  const _bd=document.createElement('div');
  _bd.style.cssText='position:absolute;inset:0;opacity:0;transition:opacity .26s ease;'+
    'pointer-events:auto;cursor:pointer;background:'+_skinBackdrop();
  _bd.addEventListener('click',_giftDone);
  _giftRoot.appendChild(_bd);
  document.body.appendChild(_giftRoot);
  requestAnimationFrame(()=>{_bd.style.opacity='1';});
  _giftBdTO=setTimeout(()=>{_bd.style.transition='opacity .34s ease';_bd.style.opacity='0';},Math.max(0,DUR-300));
  try{
    {const _n=playerName();
    _giftCleanup=gift.show({
      root:_giftRoot,isSuper:true,durationMs:DUR,points:modePts(),
      palette:_skinPalette(),praise:'מַתָּנָה בִּשְׁבִילֵךְ'+(_n?' '+_n:'')+'! 🎁',
    })||null;}
  }catch(e){
    _giftCleanup=null;
    if(window.console)console.warn('gift screen failed:',e);
  }
  _giftKey=e=>{if(e.key==='Enter'||e.key===' '||e.key==='Escape')_giftDone();};
  document.addEventListener('keydown',_giftKey);
  _giftTO=setTimeout(_giftDone,DUR+150);
}

/* ── Intro splash — a random celebration screen greets every refresh ───────
   The praise slot shows the game's name instead. It's a full modal like the
   success/gift screens: a skin-matched near-black backdrop covers the game
   form, and the celebration animates on top of it. Any click / Enter / Space /
   Escape skips it (the backdrop captures the click). Disabled in the test
   suite via localStorage (introSplash=0); toggled from the settings modal and
   persisted there. */
function introEnabled(){return localStorage.getItem('introSplash')!=='0';}
function setIntroEnabled(on){
  localStorage.setItem('introSplash',on?'1':'0');
  const cb=document.getElementById('intro-toggle');
  if(cb)cb.checked=!!on;
}
let _introOn=false,_introRoot=null,_introCleanup=null,_introTO=null,_introBdTO=null,_introKey=null;
function _introDone(){
  if(!_introOn)return;_introOn=false;
  if(_introTO){clearTimeout(_introTO);_introTO=null;}
  if(_introBdTO){clearTimeout(_introBdTO);_introBdTO=null;}
  if(_introKey){document.removeEventListener('keydown',_introKey);_introKey=null;}
  if(_introCleanup){try{_introCleanup();}catch(e){}_introCleanup=null;}
  if(_introRoot){_introRoot.remove();_introRoot=null;}
}
function showIntroSplash(){
  const styles=(window.SUCCESS&&SUCCESS.styles)||[];
  if(!styles.length||_introOn)return;
  _introOn=true;
  const style=styles[0|Math.random()*styles.length];
  const DUR=3500;
  _introRoot=document.createElement('div');
  _introRoot.style.cssText='position:fixed;inset:0;z-index:1200;pointer-events:none';
  // full modal cover behind the splash — the same skin-matched near-black
  // backdrop the success/gift screens use, as the FIRST child so the screen's
  // canvas layers on top. It captures clicks (so the hidden game form beneath
  // isn't reachable, and a tap dismisses); fades in on open, out before done.
  const _bd=document.createElement('div');
  _bd.style.cssText='position:absolute;inset:0;opacity:0;transition:opacity .26s ease;'+
    'pointer-events:auto;cursor:pointer;background:'+_skinBackdrop();
  _bd.addEventListener('click',_introDone);
  _introRoot.appendChild(_bd);
  document.body.appendChild(_introRoot);
  requestAnimationFrame(()=>{_bd.style.opacity='1';});
  _introBdTO=setTimeout(()=>{_bd.style.transition='opacity .34s ease';_bd.style.opacity='0';},Math.max(0,DUR-300));
  _introCleanup=style.show({
    root:_introRoot,isSuper:true,durationMs:DUR,
    palette:_skinPalette(),praise:'מִשְׂחֲקֵי חֶשְׁבּוֹן 2',
  })||null;
  _introKey=e=>{if(e.key==='Enter'||e.key===' '||e.key==='Escape')_introDone();};
  document.addEventListener('keydown',_introKey);
  _introTO=setTimeout(_introDone,DUR+150);
}
/* boot: the screens are injected dynamically — wait for them, then play */
function bootIntroSplash(){
  if(!introEnabled())return;
  let tries=0;
  (function tick(){
    if(((window.SUCCESS&&SUCCESS.styles)||[]).length)showIntroSplash();
    else if(++tries<40)setTimeout(tick,100);
  })();
}
