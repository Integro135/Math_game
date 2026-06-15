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

/* ── backgrounds ── */
function unloadBackground(){
  if(_bgCleanup){ _bgCleanup(); _bgCleanup = null; }
  applySkin(null);
  loadAids('classic');
}

function loadBackground(name){
  if(_bgCleanup){ _bgCleanup(); _bgCleanup = null; }
  const start = () => {
    const mod = window.BACKGROUNDS[name];
    if(!mod) return;
    applySkin(mod.skin || name);
    loadAids(mod.aids || 'classic');
    const stage = document.getElementById('stars-layer');
    if(!stage) return;
    _bgCleanup = mod.init({ stage }) || null;
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
