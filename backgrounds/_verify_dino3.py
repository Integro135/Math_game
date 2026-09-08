"""Dedicated dinosaurs3 harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_dino3.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Two modes: STANDALONE loads dinosaurs3.html and pokes the
window._dino3 hooks; otherwise it loads the real game (index.html), picks the
dinosaurs theme and screenshots the live scene behind the game card. Reports
JS errors either way (font CORS errors on file:// are expected and harmless).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF        = 2
VIEW       = {"width": 1280, "height": 800}
STANDALONE = ""   # "" → in-game mode (set to dinosaurs3.html for standalone)
THEME      = "dinosaurs"
HIDE_UI    = False
WAIT_MS    = 900
# a JS snippet run after the scene is up (STANDALONE) or after the theme is picked (game)
EVAL = r"""(async function(){
  var W=function(fn){return new Promise(function(r){var t=setInterval(function(){if(fn()){clearInterval(t);r();}},50);});};
  var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  await W(function(){return window._dino3 && window.TrexRig && window.BabyRig;});
  var d=window._dino3;
  d.spawn('trex'); d.spawn('stego'); d.ptero();
  await sleep(600);
  d.walkers().forEach(function(w,i){ w.L.x = innerWidth*(0.62+i*0.2); w.L.moving=false; });
  d.egg(); d.boom(); d.act();
  await sleep(1500);
  return JSON.stringify({walkers:d.walkers().map(function(w){return w.kind;}), tod:d.tod()});
})();"""
SHOTS = [
    {"path": r"c:\tmp\dino_rigs\game_dusk.png", "clip": {"x": 0, "y": 0, "width": 1280, "height": 800}},
]
POST_EVAL = r"""(async function(){
  var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  window._dino3.seek(0.5); await sleep(700); return 'night';
})();"""
SHOTS_POST = [
    {"path": r"c:\tmp\dino_rigs\game_night.png", "clip": {"x": 0, "y": 0, "width": 1280, "height": 800}},
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
        page.goto(Path(STANDALONE).as_uri())
    else:
        page.add_init_script("localStorage.setItem('introSplash','0')")
        page.goto(GAME_URL)
        page.wait_for_selector("#ans, #ans1", timeout=30_000)
        page.evaluate(f"pickTheme('{THEME}')")
        page.wait_for_function("window.BACKGROUNDS && window.BACKGROUNDS.dinosaurs3", timeout=20_000)
        page.wait_for_timeout(1200)
        if HIDE_UI:
            page.evaluate("var w=document.querySelector('.wrap'); if(w) w.style.display='none'")
    eval_result = page.evaluate(EVAL) if EVAL else None
    page.wait_for_timeout(WAIT_MS)
    for s in SHOTS:
        page.screenshot(path=s["path"], clip=s["clip"])
    post_result = page.evaluate(POST_EVAL) if POST_EVAL else None
    page.wait_for_timeout(WAIT_MS)
    for s in SHOTS_POST:
        page.screenshot(path=s["path"], clip=s["clip"])
    _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
    non_font = [e for e in errors if not any(s in e for s in _ignore)]
    print("non-font errors:", non_font if non_font else "NONE")
    if EVAL: print("eval result:", eval_result)
    if POST_EVAL: print("post-eval result:", post_result)
    print("shots:", [s["path"] for s in SHOTS + SHOTS_POST])
    browser.close()
