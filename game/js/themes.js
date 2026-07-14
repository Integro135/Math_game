/* ── Theme data ── */
let theme=localStorage.getItem('gameTheme')||'girls';
let _specialPtc=[];
/* themes served by a canvas background module (backgrounds/<bg>.bg.js);
   these get their scene, skin and aid art from the dynamic loader, and no
   floating emoji particles (the scenes carry their own life) */
const _BG_THEMES={galaxy:'space',girls:'unicorns',reef:'reef',dubai:'dubai',savanna:'savanna',dinosaurs:'dinosaurs2',frozen:'frozen',maldives:'maldives'};
const THEMES={
  girls:{
    titleEmoji:'',uniL:'',uniR:'',toggleIcon:'👦',
    particles:['💜','💗','✨','⭐','💫','🌸','🦋','🌺','💝','🔮','🌟','🩷'],
    specialEm:'🦄',
  },
  galaxy:{
    titleEmoji:'',uniL:'',uniR:'',toggleIcon:'🦕',
    particles:['🌌','🛸','🪨','🌌','🛸','🪨','☄️','🪐','🌌','🛸','🪨','🌑','🌌','🛸'],
    specialEm:'🚀',
  },
  reef:{
    titleEmoji:'',uniL:'',uniR:'',toggleIcon:'🌊',
    particles:['🐠','🐡','🐟','🦀','🐙','🦑','⭐','💎','🐬','🦐','🐚','🌊'],
    specialEm:'🐠',
  },
  dubai:{
    titleEmoji:'',uniL:'',uniR:'',toggleIcon:'🏙️',
    particles:['✨','🌴','🪙','⭐','🚁','💎'],
    specialEm:'🚁',
  },
  savanna:{
    titleEmoji:'',uniL:'',uniR:'',toggleIcon:'🦁',
    particles:['🦁','🌅','🦓','🌿','🐆','✨'],
    specialEm:'🦁',
  },
  dinosaurs:{
    titleEmoji:'',uniL:'',uniR:'',toggleIcon:'🦕',
    particles:['🦕','🦖','🌋','🌿','🥚','✨'],
    specialEm:'🦕',
  },
  frozen:{
    titleEmoji:'',uniL:'',uniR:'',toggleIcon:'❄️',
    particles:['❄️','⛄','🧊','✨','💙','🐧'],
    specialEm:'⛄',
  },
  maldives:{
    titleEmoji:'',uniL:'',uniR:'',toggleIcon:'🏝️',
    particles:['🏝️','🌴','🐬','🐚','☀️','🌊'],
    specialEm:'🐬',
  },
};


/* applyTheme — מחיל ערכה: body.className, רקע דינמי, כותרת, כפתור toggle.
   every theme is served by a canvas background module (backgrounds/<bg>.bg.js)
   loaded on demand — the loader also swaps the skin and the aid art. */
function applyTheme(t){
  if(t)theme=t;
  if(!THEMES[theme])theme='girls';   // stale localStorage from a removed theme
  // body.className wipes every class — keep the number-line lock state intact
  const _tfLocked=document.body.classList.contains('tf-locked-nl');
  document.body.className=theme==='galaxy'?'theme-galaxy':theme==='reef'?'theme-reef':theme==='dubai'?'theme-dubai':theme==='savanna'?'theme-savanna':theme==='dinosaurs'?'theme-dinosaurs':theme==='frozen'?'theme-frozen':theme==='maldives'?'theme-maldives':'theme-girls';
  if(_tfLocked)document.body.classList.add('tf-locked-nl');
  const _bg=_BG_THEMES[theme];
  if(_bg)loadBackground(_bg);
  else{
    unloadBackground();
    const _l=document.getElementById('stars-layer');if(_l)_l.innerHTML='';
  }
  const T=THEMES[theme]||THEMES.girls;
  const ul=document.getElementById('uni-left');
  const ur=document.getElementById('uni-right');
  const tt=document.getElementById('game-title');
  const tb=document.getElementById('theme-toggle');
  if(ul)ul.textContent=T.uniL;
  if(ur)ur.textContent=T.uniR;
  const _ew=e=>`<span style="-webkit-text-fill-color:initial">${e}</span>`;
  if(tt)tt.innerHTML=`${_ew(T.titleEmoji)} מִשְׂחֲקֵי חֶשְׁבּוֹן ${_ew(T.titleEmoji)}`;
  const _themeIcons={girls:'🦄',galaxy:'🌌',reef:'🐠',dubai:'🏙️',savanna:'🦁',dinosaurs:'🦕',frozen:'❄️',maldives:'🏝️'};
  if(tb)tb.textContent=_themeIcons[theme]||'🎨';
  // Mark active theme in menu
  document.querySelectorAll('.tm-item').forEach(el=>{
    el.classList.toggle('active', el.getAttribute('onclick')===`pickTheme('${theme}')`);
  });
}
/* ── Theme picker menu ── */
function openThemeMenu(e){
  e.stopPropagation();
  const menu=document.getElementById('theme-menu');
  const btn=document.getElementById('theme-toggle');
  const r=btn.getBoundingClientRect();
  menu.style.top=(r.bottom+8)+'px';
  menu.style.left=r.left+'px';
  menu.classList.toggle('open');
}
function pickTheme(t){
  document.getElementById('theme-menu').classList.remove('open');
  if(t===theme)return;
  applyTheme(t);
  spawnParticles();
  localStorage.setItem('gameTheme',theme);
}

/* toggleTheme — cycles themes, persists the choice */
function toggleTheme(){
  const cycle={girls:'galaxy',galaxy:'reef',reef:'dubai',dubai:'savanna',savanna:'dinosaurs',dinosaurs:'frozen',frozen:'maldives',maldives:'girls'};
  applyTheme(cycle[theme]||'girls');
  spawnParticles();
  localStorage.setItem('gameTheme',theme);
}

/* ── Particle FX system ── */
function _fly(x,y,ems,n,dist,dur){
  for(let i=0;i<n;i++){
    const sp=document.createElement('span');
    const a=Math.PI*2/n*i+(Math.random()-.5)*.5;
    const d=dist*.5+Math.random()*dist*.9;
    sp.style.cssText=`position:fixed;z-index:998;font-size:${.9+Math.random()*.8}rem;left:${x}px;top:${y}px;pointer-events:none;--sx:${Math.cos(a)*d}px;--sy:${Math.sin(a)*d}px;animation:sparkFly ${dur+Math.random()*.2}s ease-out ${Math.random()*.1}s forwards`;
    sp.textContent=ems[i%ems.length];
    document.body.appendChild(sp);
    sp.addEventListener('animationend',()=>sp.remove());
  }
}
function fxLight(x,y){
  const b=document.createElement('div');b.className='light-burst';
  b.style.cssText=`left:${x}px;top:${y}px`;document.body.appendChild(b);
  b.addEventListener('animationend',()=>b.remove());
  _fly(x,y,['✨','⭐','💫','🌟','💛','🌸'],8,80,.8);
}
function fxElectric(x,y){
  _fly(x,y,['⚡','⚡','⚡','⚡','⚡','⚡','⚡','⚡'],8,75,.5);
  const r=document.createElement('div');
  r.style.cssText=`position:fixed;z-index:997;left:${x}px;top:${y}px;width:4px;height:4px;margin:-2px;border:3px solid #80FFFF;border-radius:50%;box-shadow:0 0 14px #80FFFF;pointer-events:none;animation:electricRing .45s ease-out forwards`;
  document.body.appendChild(r);r.addEventListener('animationend',()=>r.remove());
}
function fxHearts(x,y){ _fly(x,y,['💗','💜','💖','🩷','❤️','💗','💜','💖'],8,90,.75); }
function fxStars(x,y) { _fly(x,y,['⭐','🌟','💫','✨','⭐','🌟','💫','✨'],8,90,.70); }
function fxMagic(x,y) { _fly(x,y,['🔮','✨','🌸','🦋','💫','🔮','✨','🌸'],8,85,.80); }
function fxBoom(x,y){
  const el=document.createElement('span');
  el.style.cssText=`position:fixed;z-index:998;font-size:2.6rem;left:${x}px;top:${y}px;pointer-events:none;animation:growPop .5s ease-out forwards`;
  el.textContent=['💥','🌟','✨','💫'][0|Math.random()*4];
  document.body.appendChild(el);el.addEventListener('animationend',()=>el.remove());
  _fly(x,y,['💥','✨','⭐'],6,60,.55);
}
function fxConfetti(x,y){
  const cols=['#FF80AB','#FFD740','#69F0AE','#80D8FF','#EA80FC','#FFB74D'];
  for(let i=0;i<14;i++){
    const el=document.createElement('div');
    const a=Math.PI*2/14*i,d=45+Math.random()*55;
    el.style.cssText=`position:fixed;z-index:998;width:${5+Math.random()*5}px;height:${4+Math.random()*4}px;border-radius:1px;background:${cols[i%cols.length]};left:${x}px;top:${y}px;--sx:${Math.cos(a)*d}px;--sy:${Math.sin(a)*d}px;pointer-events:none;animation:sparkFly .65s ease-out ${Math.random()*.12}s forwards`;
    document.body.appendChild(el);el.addEventListener('animationend',()=>el.remove());
  }
}
function fxRainbow(x,y){
  _fly(x,y,['🌈','💗','🌸','✨','🌈','💜'],6,80,.8);
  const cv2=document.createElement('canvas');
  cv2.width=280;cv2.height=150;
  cv2.style.cssText=`position:fixed;z-index:996;left:${x-140}px;top:${y-150}px;pointer-events:none;animation:growPop .95s ease-out forwards`;
  document.body.appendChild(cv2);
  const ct=cv2.getContext('2d');
  ['#FF8A80','#FFCC02','#B9F6CA','#80DEEA','#CE93D8'].forEach((c,ri)=>{
    ct.strokeStyle=c;ct.lineWidth=7;ct.globalAlpha=.72;
    ct.beginPath();ct.arc(140,150,28+ri*22,Math.PI,0);ct.stroke();
  });
  cv2.addEventListener('animationend',()=>cv2.remove());
}
const FX=[fxLight,fxElectric,fxHearts,fxStars,fxMagic,fxBoom,fxConfetti,fxRainbow];
function runFx(x,y){FX[0|Math.random()*FX.length](x,y);}
function _popEl(el){el.classList.add('particle-gone');setTimeout(()=>el.remove(),380);}
function spawnLightBurst(x,y){fxLight(x,y);}  /* compat alias */

/* ── Background particles ──
   Every current theme runs a canvas background module whose scene carries its
   own life, so no floating emoji particles are spawned. The function stays as
   the cleanup + future hook for any non-canvas theme. */
function spawnParticles(){
  const c=document.getElementById('particles');
  if(c)c.innerHTML='';
  _specialPtc.forEach(el=>{if(el.parentNode)el.parentNode.removeChild(el);});
  _specialPtc=[];
}

