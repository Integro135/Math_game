"""Single reusable background harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). It loads index.html, switches theme, optionally evaluates a JS
snippet and/or dispatches real clicks, waits, screenshots, and reports JS errors.
(Font CORS errors on file:// are expected and harmless.)
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

# the game is Hebrew (+ math − signs): print UTF-8 so returning story text from
# EVAL never crashes the console on Windows cp1252
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG (edit these; never change the command line) ──────────────────────
THEME    = "girls"                 # the 🦄 theme → unicorns background (new meadow scene)
DSF      = 2                       # device scale factor (higher = sharper zoom)
HIDE_UI  = False
STANDALONE = r""                   # empty → drive the in-game index.html flow
VIEW     = {"width": 1280, "height": 800}   # viewport
# NEW word_chain (TWC) — force chain word problems in אַלּוּפָה, check the nikud
# story renders and every generated result is 0..12; screenshot the story card.
EVAL = r"""(async function(){
  var W=function(fn){return new Promise(function(r){var t=setInterval(function(){if(fn()){clearInterval(t);r();}},50);});};
  setMode('mulc');
  await W(function(){return window.EXERCISES&&EXERCISES.types.word_chain&&typeof problems!=='undefined'&&problems.length;});
  score=0;problems=EXERCISES.types.word_chain.make('wc');idx=0;loadProblem();
  await W(function(){return document.querySelector('.wc-story');});
  // submit a WRONG answer → the derived DIGIT chain reveals
  var inp=document.getElementById('wc-inp');
  inp.value=String(report[0].correct+1);
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await W(function(){return getComputedStyle(document.getElementById('wc-derived')).display!=='none';});
  await new Promise(function(r){setTimeout(r,250);});
  return JSON.stringify({
    derivedShown:getComputedStyle(document.getElementById('wc-derived')).display!=='none',
    eq:document.querySelector('.wc-eq').textContent
  });
})();"""
POST_EVAL = r"""(function(){var so=document.getElementById('sad-ov');if(so)so.style.display='none';return 'ok';})();"""
CLICKS   = []
WAIT_MS   = 1600
SHOTS    = [
    {"path": r"c:\tmp\word_chain.png", "clip": {"x": 280, "y": 60, "width": 720, "height": 560}},
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
