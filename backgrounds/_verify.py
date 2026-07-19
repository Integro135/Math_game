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
THEME    = "girls"                 # the 🦄 theme → unicorns background (new meadow scene)
DSF      = 2                       # device scale factor (higher = sharper zoom)
HIDE_UI  = False
STANDALONE = ""                    # "" → drive the REAL game (index.html)
VIEW     = {"width": 1280, "height": 800}   # viewport
# IN-GAME INTEGRATION of the new unicorn meadow (unicorns.bg.js → UnicornMeadow):
# the scene must mount INTO #stars-layer (behind the game card), roam actors
# there, and be torn down when switching themes (then re-mount on return).
EVAL = r"""(function(){ setMode('mulc'); return 'mulc'; })();"""
POST_EVAL = r"""(function(){
  // force a perimeter problem, get it wrong → the number line (with reset/undo)
  // appears; report the reset/undo icon colors + fills, then screenshot them
  mode='mulc';score=0;problems=[{t:TPP,shape:'square',sides:[3,3,3,3],a:12}];idx=0;loadProblem();
  return new Promise(function(res){ setTimeout(function(){
    var inp=document.querySelector('.pm-inp');
    if(!inp) return res(JSON.stringify({error:'no perimeter board'}));
    inp.value='10';
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    setTimeout(function(){
      document.getElementById('nl-panel').scrollIntoView({block:'center'});
      var rs=document.querySelector('#nl-panel .btn-reset'), ud=document.querySelector('#nl-panel .btn-undo');
      var cs=function(e){var c=getComputedStyle(e);return {color:c.color,bg:c.backgroundColor};};
      res(JSON.stringify({ resetBtn:cs(rs), undoBtn:cs(ud) }));
    }, 500);
  }, 500); });
})();"""
CLICKS   = []
WAIT_MS   = 1600
SHOTS    = [
    {"path": r"c:\tmp\nl_ctrls.png", "clip": {"x": 340, "y": 470, "width": 600, "height": 250}},
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
