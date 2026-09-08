/* ── Dynamic loaders: backgrounds, game skins, aid variants, success screens ─

   Everything swappable lives OUTSIDE the game code and is injected at
   runtime (script/link tag injection — the only dynamic mechanism that
   works on file://, where fetch/ES-modules are CORS-blocked):

   • backgrounds/<name>.bg.js   — scene module:
        window.BACKGROUNDS[name] = { skin, aids, init({stage}) → cleanup }
   • game/skins/<skin>.skin.css — the game's look over that backdrop
        (palette, fonts, glass transparency, position on screen)
   • aids/<name>.aids.js        — the aids' look over that backdrop:
        window.AIDS.variants[name] = {
          numberLine: { icon, rider, hintAdd, hintSub },
          jar:        { icon, gardenIcon, itemName, hintAdd, hintSub,
                        containerSVG, itemSVG(i), gardenSVG(i) },
        }
        (the engine in game/js/aids.js stays generic and reads the variant)
   • success screens            — register into window.SUCCESS.styles
        (see success_screens_spec.md); files listed in SUCCESS_FILES
        (game/js/data.js) are injected at boot.
   • exercises/<name>.ex.js     — self-contained exercise TYPES:
        window.EXERCISES.types[name] = { mount({root,a,b,api}) → cleanup }
        injected on demand the first time a problem of that type loads
        (EXERCISE_OF_TYPE in data.js maps ptype → file name). */

window.BACKGROUNDS = window.BACKGROUNDS || {};
window.AIDS = window.AIDS || {};
window.AIDS.variants = window.AIDS.variants || {};
window.AIDS.current = window.AIDS.current || null;
window.EXERCISES = window.EXERCISES || {};
window.EXERCISES.types = window.EXERCISES.types || {};

let _bgCleanup = null;
let _injected = {};
let _skinLink = null;

let _injectQ = {};
function _injectScript(src, onload){
  if(_injected[src] === true){ if(onload) onload(); return; }
  // already loading — queue the callback instead of firing it early
  if(_injected[src] === 'loading'){
    if(onload)(_injectQ[src] = _injectQ[src] || []).push(onload);
    return;
  }
  const s = document.createElement('script');
  s.src = src;
  s.onload = () => {
    _injected[src] = true;
    if(onload) onload();
    (_injectQ[src] || []).forEach(f => f());
    delete _injectQ[src];
  };
  s.onerror = () => { delete _injected[src]; delete _injectQ[src]; };
  _injected[src] = 'loading';
  document.head.appendChild(s);
}

/* ── game skin ── */
function applySkin(skin){
  if(!_skinLink){
    _skinLink = document.createElement('link');
    _skinLink.rel = 'stylesheet';
    document.head.appendChild(_skinLink);
  }
  if(skin) _skinLink.href = 'game/skins/' + skin + '.skin.css';
  else _skinLink.removeAttribute('href');
}

/* ── aid variants (number-line rider, jar container + items) ── */
function loadAids(name){
  const apply = () => {
    window.AIDS.current = window.AIDS.variants[name] || window.AIDS.variants.classic || null;
    if(typeof applyAidsVariant === 'function') applyAidsVariant();
  };
  if(window.AIDS.variants[name]){ apply(); return; }
  _injectScript('aids/' + name + '.aids.js', apply);
}

/* ── jar-stage display engine (the counting jar's visuals) ── */
function loadJarStage(onReady){
  if(window.JAR_STAGE){ if(onReady) onReady(); return; }
  _injectScript('aids/jar_stage.js', () => { if(onReady) onReady(); });
}

/* ── exercise-type modules — ONE FILE PER TYPE ── */
function loadExercise(name, onReady){
  if(window.EXERCISES.types[name]){ if(onReady) onReady(); return; }
  _injectScript('exercises/' + name + '.ex.js', () => { if(onReady) onReady(); });
}
/* load every exercise type a game mode supports (EXERCISE_INDEX, data.js);
   synchronous when all files are already cached */
function loadExercisesFor(mode, onReady){
  const need = (typeof EXERCISE_INDEX !== 'undefined' ? EXERCISE_INDEX : [])
    .filter(e => e.modes.includes(mode)).map(e => e.file);
  let left = need.length;
  if(!left){ if(onReady) onReady(); return; }
  need.forEach(f => loadExercise(f, () => { if(--left === 0 && onReady) onReady(); }));
}

/* ── loading veil for SLOW backgrounds ──────────────────────────────────────
   Most scenes appear instantly, but a heavy one (space2 compiles its WebGL2
   ray-tracer and bakes the sky — up to ~20 s on a weak machine) would otherwise
   leave the stage black with no sign that anything is happening. Such a scene
   is marked `slowLoad: true` on its module (and listed in SLOW_BGS, which also
   covers the very first load, before the module object exists). For those:
     • the veil is shown and PAINTED before init() runs (init is synchronous and
       would otherwise block the paint), then
     • it stays until the scene calls window.BG_LOADING.done() from its first
       rendered frame — with a safety timeout so it can never get stuck.
   The veil lives inside the stage (#stars-layer) and is pointer-events:none, so
   the game card stays visible and fully usable while the backdrop loads. */
const SLOW_BGS = ['space2'];
const BG_LOAD_MAX = 45000;                 // safety: never leave the veil up forever
let _veil = null, _veilMaxTO = null, _veilHintTO = null;

function _veilCSS(){
  if(document.getElementById('bg-veil-css')) return;
  const st = document.createElement('style');
  st.id = 'bg-veil-css';
  st.textContent =
    '.bg-veil{position:fixed;inset:0;z-index:3;pointer-events:none;display:flex;' +
      'flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
      'background:radial-gradient(ellipse at 50% 45%,#141033 0%,#0a0820 55%,#05040f 100%);' +
      'transition:opacity .45s ease}' +
    '.bg-veil.bg-veil-out{opacity:0}' +
    '.bg-veil-ring{width:74px;height:74px;border-radius:50%;border:5px solid rgba(150,170,255,.22);' +
      'border-top-color:#9ec2ff;border-right-color:#c9a6ff;animation:bgVeilSpin 1.1s linear infinite}' +
    '.bg-veil-txt{direction:rtl;text-align:center;color:#dfe6ff;font-size:19px;font-weight:700;' +
      'letter-spacing:.02em;text-shadow:0 2px 10px rgba(0,0,0,.6)}' +
    '.bg-veil-hint{direction:rtl;text-align:center;color:rgba(200,210,255,.72);font-size:15px;' +
      'opacity:0;transition:opacity .4s}' +
    '.bg-veil-hint.on{opacity:1}' +
    '@keyframes bgVeilSpin{to{transform:rotate(360deg)}}';
  (document.head || document.documentElement).appendChild(st);
}

function showBgVeil(stage){
  hideBgVeil(true);
  if(!stage) return;
  _veilCSS();
  const v = document.createElement('div');
  v.className = 'bg-veil';
  v.innerHTML = '<div class="bg-veil-ring"></div>' +
                '<div class="bg-veil-txt">טוֹעֲנִים אֶת הֶחָלָל…</div>' +
                '<div class="bg-veil-hint">רֶגַע, מְצַיְּרִים חוֹר שָׁחוֹר 🌌</div>';
  stage.appendChild(v);
  _veil = v;
  _veilHintTO = setTimeout(() => {
    const h = v.querySelector('.bg-veil-hint'); if(h) h.classList.add('on');
  }, 4000);
  _veilMaxTO = setTimeout(() => hideBgVeil(), BG_LOAD_MAX);
}

function hideBgVeil(now){
  clearTimeout(_veilHintTO); clearTimeout(_veilMaxTO);
  const v = _veil; _veil = null;
  if(!v) return;
  if(now){ if(v.parentNode) v.remove(); return; }
  v.classList.add('bg-veil-out');
  setTimeout(() => { if(v.parentNode) v.remove(); }, 500);
}

/* the scene tells us when its first frame is actually on screen */
window.BG_LOADING = { done: () => hideBgVeil(), showing: () => !!_veil };

/* ── backgrounds ── */
function unloadBackground(){
  hideBgVeil(true);
  if(_bgCleanup){ _bgCleanup(); _bgCleanup = null; }
  applySkin(null);
  loadAids('classic');
}

function loadBackground(name){
  if(_bgCleanup){ _bgCleanup(); _bgCleanup = null; }
  hideBgVeil(true);
  const stage0 = document.getElementById('stars-layer');
  // a slow scene gets the veil BEFORE anything heavy runs
  const slow = SLOW_BGS.indexOf(name) >= 0 ||
               !!(window.BACKGROUNDS[name] && window.BACKGROUNDS[name].slowLoad);
  if(slow && stage0){ stage0.innerHTML = ''; showBgVeil(stage0); }
  const start = () => {
    const mod = window.BACKGROUNDS[name];
    if(!mod){ hideBgVeil(); return; }
    applySkin(mod.skin || name);
    loadAids(mod.aids || 'classic');
    const stage = document.getElementById('stars-layer');
    if(!stage){ hideBgVeil(); return; }
    const veiled = !!_veil;
    const run = () => {
      if(veiled){                       // the scene wipes the stage — re-hang the veil on top
        const v = _veil;
        _bgCleanup = mod.init({ stage }) || null;
        if(v && !v.parentNode && _veil === v) stage.appendChild(v);
      } else {
        _bgCleanup = mod.init({ stage }) || null;
      }
      // a scene that reports readiness keeps the veil until its first frame
      if(!(mod.slowLoad || SLOW_BGS.indexOf(name) >= 0)) hideBgVeil(true);
    };
    // let the veil paint first — init() is synchronous and can block for seconds
    if(veiled) requestAnimationFrame(() => requestAnimationFrame(run));
    else run();
  };
  if(window.BACKGROUNDS[name]){ start(); return; }
  _injectScript('backgrounds/' + name + '.bg.js', start);
}

/* ── boot preload: warm EVERY background (+ its aid art & skin) and EVERY
   exercise type up front, so later theme/level switches are seamless instead
   of loading their objects on the first visit. Called during the intro splash
   (main.js). Idempotent — _injectScript de-dupes, so the active theme/mode
   already loading is never fetched twice. */
function preloadAll(){
  const bgNames = (typeof _BG_THEMES !== 'undefined')
    ? [...new Set(Object.values(_BG_THEMES))] : [];
  bgNames.forEach(n => {
    const warm = () => {
      const mod = window.BACKGROUNDS[n];
      if(!mod) return;
      // a background that composes external modules (e.g. dinosaurs → volcano +
      // walkers + rumi) warms them here, so they load during the intro splash
      // instead of on first theme-select.
      if(typeof mod.preload === 'function') mod.preload();
      if(mod.aids && !window.AIDS.variants[mod.aids])
        _injectScript('aids/' + mod.aids + '.aids.js');
      const skin = mod.skin || n;
      if(!document.querySelector('link[data-pre-skin="' + skin + '"]')){
        const l = document.createElement('link');
        l.rel = 'prefetch'; l.setAttribute('as', 'style');
        l.href = 'game/skins/' + skin + '.skin.css';
        l.setAttribute('data-pre-skin', skin);
        document.head.appendChild(l);
      }
    };
    if(window.BACKGROUNDS[n]) warm(); else _injectScript('backgrounds/' + n + '.bg.js', warm);
  });
  // every exercise type across all modes ("all levels")
  (typeof EXERCISE_INDEX !== 'undefined' ? EXERCISE_INDEX : []).forEach(e => {
    if(!window.EXERCISES.types[e.file]) _injectScript('exercises/' + e.file + '.ex.js');
  });
  // the counting-jar display engine
  loadJarStage();
}

/* ── boot: default aid variant + externally-authored success screens ── */
loadAids('classic');
if(typeof SUCCESS_FILES !== 'undefined'){
  SUCCESS_FILES.forEach(f => _injectScript('success_screens/' + f + '.js'));
}
if(typeof SUCCESS_SPECIAL !== 'undefined'){
  SUCCESS_SPECIAL.forEach(f => _injectScript('success_screens/' + f + '.js'));
}
