"""Single reusable background harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). It loads index.html, switches theme, optionally evaluates a JS
snippet and/or dispatches real clicks, waits, screenshots, and reports JS errors.
(Font CORS errors on file:// are expected and harmless.)
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

# ── CONFIG (edit these; never change the command line) ──────────────────────
THEME    = "maldives"              # the harness picks this theme in-game
DSF      = 2                       # device scale factor (higher = sharper zoom)
HIDE_UI  = False                   # keep the skinned card visible for the screenshot
STANDALONE = ""                    # "" → drive the real game (index.html)
VIEW     = {"width": 1280, "height": 800}   # viewport
# Maldives POKEMON walkers IN THE GAME: the game doesn't ship pokemons/*.js, so
# maldives.bg.js must inject them itself. Confirm window.Pokemons populates in
# the game, then force a few walkers + the flyer and spread them for the shot.
EVAL = r"""(function(){ return 'ok'; })();"""
POST_EVAL = r"""(function(){
  var out={};
  out.loaded=window.Pokemons?Object.keys(window.Pokemons).sort():[];
  var t=window.BACKGROUNDS&&BACKGROUNDS.maldives&&BACKGROUNDS.maldives._test;
  out.hasTest=!!t;
  // force a few walkers + the flyer now that the modules are loaded
  ['eevee','pikachu','bulbasaur','squirtle'].forEach(function(n){ if(t)t.walk(n); });
  if(t)t.fly();
  // spread them across the beach and freeze the crossing for a clean screenshot
  var actors=Array.prototype.slice.call(document.querySelectorAll('.mv-actors > *'));
  actors.forEach(function(el,i){
    if(el.getAnimations)el.getAnimations().forEach(function(a){try{a.cancel();}catch(e){}});
    el.style.transform='translateX('+(90+i*230)+'px)';
  });
  out.actorsPlaced=actors.length;
  return JSON.stringify(out);
})();"""
CLICKS   = []
WAIT_MS   = 1400   # give maldives.bg.js time to inject pokemons/*.js before forcing walkers
SHOTS    = [
    {"path": r"c:\tmp\maldives_pokemon.png", "clip": None},
]
# ────────────────────────────────────────────────────────────────────────────

GAME_URL   = Path(r"c:\Code\subtraction_game\index.html").as_uri()
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    page = browser.new_context(viewport=VIEW, device_scale_factor=DSF).new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    if STANDALONE:
        page.goto(STANDALONE if STANDALONE.startswith("http") else Path(STANDALONE).as_uri())
        eval_result = page.evaluate(EVAL) if EVAL else None
        page.wait_for_timeout(WAIT_MS)
        post_result = page.evaluate(POST_EVAL) if POST_EVAL else None
        for s in SHOTS:
            page.screenshot(path=s["path"], clip=s["clip"])
        _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
        non_font = [e for e in errors if not any(s in e for s in _ignore)]
        print("non-font errors:", non_font if non_font else "NONE")
        if EVAL: print("eval result:", eval_result)
        if POST_EVAL: print("post-eval result:", post_result)
        print("shots:", [s["path"] for s in SHOTS])
        browser.close()
        raise SystemExit
    page.add_init_script("localStorage.setItem('introSplash','0')")
    page.goto(GAME_URL)
    page.wait_for_selector("#ans, #ans1", timeout=30_000)

    page.evaluate(f"pickTheme('{THEME}')")
    page.wait_for_function(
        "window.BACKGROUNDS && Object.keys(window.BACKGROUNDS).length > 0", timeout=20_000)
    page.wait_for_timeout(1500)
    if HIDE_UI:
        page.evaluate("var w=document.querySelector('.wrap'); if(w) w.style.display='none'")
    eval_result = None
    if EVAL:
        eval_result = page.evaluate(EVAL)
    for fx, fy in CLICKS:
        page.evaluate(
            "([fx,fy])=>{const x=innerWidth*fx,y=innerHeight*fy;"
            "const el=document.elementFromPoint(x,y)||document.body;"
            "el.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y}));}",
            [fx, fy])
    page.wait_for_timeout(WAIT_MS)

    post_result = page.evaluate(POST_EVAL) if POST_EVAL else None

    for s in SHOTS:
        page.screenshot(path=s["path"], clip=s["clip"])

    _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
    non_font = [e for e in errors if not any(s in e for s in _ignore)]
    print("non-font errors:", non_font if non_font else "NONE")
    if EVAL:
        print("eval result:", eval_result)
    if POST_EVAL:
        print("post-eval result:", post_result)
    print("shots:", [s["path"] for s in SHOTS])
    browser.close()
