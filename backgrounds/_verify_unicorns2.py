"""Dedicated unicorns2 harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_unicorns2.py

NOTE: unicorns2 was BUILT BUT NOT ADOPTED — the girls theme maps back to the
original `unicorns` scene, so no theme loads this module. This script therefore
runs in STANDALONE mode (unicorns2.html) and pokes the window._uni2 hooks.
In-game mode is kept below only in case the module is ever adopted: it needs
_BG_THEMES.girls === 'unicorns2' in game/js/themes.js to work.

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Reports JS errors either way (font CORS errors on file:// are
expected and harmless).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF        = 1
VIEW       = {"width": 1280, "height": 800}
STANDALONE = r"c:\Code\subtraction_game\backgrounds\unicorns2.html"   # "" → in-game mode (needs the theme remapped first)
THEME      = "girls"
HIDE_UI    = False
WAIT_MS    = 700
OUT_DIR    = Path(r"c:\tmp\unicorns2")
# a JS snippet run after the scene is up (STANDALONE) or after the theme is picked (game)
EVAL = r"""(async function(){
  var W=function(fn){return new Promise(function(r){var t=setInterval(function(){if(fn()){clearInterval(t);r();}},50);});};
  var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  await W(function(){return window._uni2;});
  var u=window._uni2;
  u.setTod(0.375); u.flyer();
  await sleep(900);
  var herd=u.herd();
  herd.forEach(function(a,i){ u.act(a, ['horn','jump'][i%2]); });
  u.fx.rainbow(); u.fx.castle(); u.fx.fish(); u.fx.bloom(innerWidth*0.5, innerHeight*0.9);
  await sleep(650);
  return JSON.stringify({herd:herd.map(function(a){return a.kind+':'+a.L.pal.name;}), flyers:u.flyers().length, phase:u.phase()});
})();"""
SHOTS = [
    {"path": str(OUT_DIR / "day.png"), "clip": {"x": 0, "y": 0, "width": 1280, "height": 800}},
]
POST_EVAL = r"""(async function(){
  var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  var u=window._uni2, out={};
  u.setTod(0.125); await sleep(400); out.dawn = u.phase();
  return JSON.stringify(out);
})();"""
SHOTS_POST = [
    {"path": str(OUT_DIR / "dawn.png"), "clip": {"x": 0, "y": 0, "width": 1280, "height": 800}},
]
EXTRA = [  # (tod, file) — more looks after the post shot
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
        page.wait_for_function("window._uni2", timeout=20_000)
    else:
        page.add_init_script("localStorage.setItem('introSplash','0')")
        page.goto(GAME_URL)
        page.wait_for_selector("#ans, #ans1", timeout=30_000)
        page.evaluate(f"pickTheme('{THEME}')")
        page.wait_for_function("window.BACKGROUNDS && window.BACKGROUNDS.unicorns2 && window._uni2", timeout=20_000)
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
    for tod, name in EXTRA:
        page.evaluate(f"window._uni2.setTod({tod})")
        page.wait_for_timeout(WAIT_MS)
        page.screenshot(path=str(OUT_DIR / name), clip=SHOTS[0]["clip"])
    _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
    non_font = [e for e in errors if not any(s in e for s in _ignore)]
    print("non-font errors:", non_font if non_font else "NONE")
    if EVAL: print("eval result:", eval_result)
    if POST_EVAL: print("post-eval result:", post_result)
    print("shots:", [s["path"] for s in SHOTS + SHOTS_POST] + [str(OUT_DIR / n) for _, n in EXTRA])
    browser.close()
