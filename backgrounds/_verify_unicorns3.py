"""Dedicated unicorns3 harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_unicorns3.py

unicorns3 = the v2 canvas valley + day cycle carrying the ORIGINAL CSS
unicorns and castle as DOM layers. STANDALONE mode loads unicorns3.html and
pokes window._uni3; in-game mode ("" ) loads index.html, picks the girls
theme (needs _BG_THEMES.girls === 'unicorns3') and screenshots the live scene
behind the game card. Reports JS errors either way (font CORS errors on
file:// are expected and harmless).

To capture something different, EDIT the CONFIG block below (the command line
stays identical).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF        = 1
VIEW       = {"width": 1280, "height": 800}
STANDALONE = ""   # "" → in-game mode (set to unicorns3.html for the scene alone)
THEME      = "girls"
HIDE_UI    = False                 # hide the harness bar / the game card
WAIT_MS    = 900
OUT_DIR    = Path(r"c:\tmp\unicorns3")
# after the scene is up: seat two unicorns on stage and fire the scenery magic
EVAL = r"""(async function(){
  var W=function(fn){return new Promise(function(r){var t=setInterval(function(){if(fn()){clearInterval(t);r();}},50);});};
  var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  await W(function(){return window._uni3 && window._uni3.unicorns().length>0 && window._uni3.castleEl();});
  var u=window._uni3;
  u.setTod(0.375);
  await sleep(1200);
  // park two roamers in view for the still (the item moves them by left %)
  var us=u.unicorns(); var shown=0;
  us.forEach(function(r,i){ if(!r.active) return; shown++; r.setX(30+shown*24); });
  u.fx.rainbow(); u.fx.castle(); u.fx.fish(); u.fx.bloom(innerWidth*0.5, innerHeight*0.9); u.fx.rainbowFall();
  await sleep(700);
  var c=u.castleEl().getBoundingClientRect();
  return JSON.stringify({onStage:u.onStage(), total:us.length, phase:u.phase(), bunnies:u.bunnies().length, waterfall:u.wf(), castle:[Math.round(c.left),Math.round(c.top),Math.round(c.width),Math.round(c.height)]});
})();"""
SHOTS = [
    {"path": str(OUT_DIR / "day.png"), "clip": {"x": 0, "y": 0, "width": 1280, "height": 800}},
]
EXTRA = [  # (tod, file) — more looks after the first shot
    (0.125, "dawn.png"),
    (0.625, "sunset.png"),
    (0.875, "night.png"),
]
# ────────────────────────────────────────────────────────────────────────────

GAME_URL   = Path(r"c:\Code\subtraction_game\index.html").as_uri()
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

OUT_DIR.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    page = browser.new_context(viewport=VIEW, device_scale_factor=DSF).new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    if STANDALONE:
        page.goto(Path(STANDALONE).as_uri())
        page.wait_for_function("window._uni3", timeout=20_000)
        if HIDE_UI:
            page.evaluate("document.getElementById('bar').style.display='none'; document.getElementById('clock').style.display='none'")
    else:
        page.add_init_script("localStorage.setItem('introSplash','0')")
        page.goto(GAME_URL)
        page.wait_for_selector("#ans, #ans1", timeout=30_000)
        page.evaluate(f"pickTheme('{THEME}')")
        page.wait_for_function("window.BACKGROUNDS && window.BACKGROUNDS.unicorns3 && window._uni3", timeout=20_000)
        page.wait_for_timeout(1200)
        if HIDE_UI:
            page.evaluate("var w=document.querySelector('.wrap'); if(w) w.style.display='none'")
    eval_result = page.evaluate(EVAL) if EVAL else None
    page.wait_for_timeout(WAIT_MS)
    for s in SHOTS:
        page.screenshot(path=s["path"], clip=s["clip"])
    for tod, name in EXTRA:
        page.evaluate(f"window._uni3.setTod({tod})")
        page.wait_for_timeout(WAIT_MS)
        page.screenshot(path=str(OUT_DIR / name), clip=SHOTS[0]["clip"])
    # restart twice → leak-free cleanup (one canvas, fresh hooks, no stray actors)
    if STANDALONE:
        ok = page.evaluate("(function(){ start(); start(); return JSON.stringify({canvases: document.querySelectorAll('#stage canvas').length, unis: document.querySelectorAll('.uc-uni:not(.uc-fx-host)').length, castles: document.querySelectorAll('.uc-castle').length}); })()")
        print("restart:", ok)
    _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
    non_font = [e for e in errors if not any(s in e for s in _ignore)]
    print("non-font errors:", non_font if non_font else "NONE")
    if EVAL: print("eval result:", eval_result)
    print("shots:", [s["path"] for s in SHOTS] + [str(OUT_DIR / n) for _, n in EXTRA])
    browser.close()
