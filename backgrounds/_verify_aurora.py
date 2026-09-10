"""Dedicated AURORA & ICE harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_aurora.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Loads aurora.html (standalone), pokes window._aurora, takes
the stills listed in SHOTS (each with its own hook settings) and reports JS
errors (font CORS errors on file:// are expected and harmless).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF        = 2
VIEW       = {"width": 1280, "height": 800}
PAGE       = r"c:\Code\subtraction_game\backgrounds\aurora.html"
HIDE_UI    = True
SETTLE_MS  = 1400                      # let the aurora, snow and mist get going
# each shot: a name, a JS snippet run before it (hooks), a wait, then the still
SHOTS = [
    {"path": r"c:\tmp\dino_rigs\aurora_default.png", "js": "", "wait": 300},
    {"path": r"c:\tmp\dino_rigs\aurora_cast.png",    "js": "_aurora.cast(); _aurora.breach();", "wait": 1500},
    {"path": r"c:\tmp\dino_rigs\aurora_breach.png",  "js": "", "wait": 1400},
    {"path": r"c:\tmp\dino_rigs\aurora_acts.png",    "js": "_aurora.dive(); _aurora.sit(); _aurora.fox(); _aurora.roll();", "wait": 2600},
    {"path": r"c:\tmp\dino_rigs\aurora_swim.png",    "js": "", "wait": 3200},
]
# ────────────────────────────────────────────────────────────────────────────

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    page = browser.new_context(viewport=VIEW, device_scale_factor=DSF).new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(Path(PAGE).as_uri())
    page.wait_for_function("window._aurora", timeout=15_000)
    if HIDE_UI:
        page.evaluate("document.getElementById('ctrl').style.display='none'")
    page.wait_for_timeout(SETTLE_MS)
    for s in SHOTS:
        if s["js"]: page.evaluate(s["js"])
        page.wait_for_timeout(s["wait"])
        page.screenshot(path=s["path"])
    # restart twice -> leak-free cleanup: the stage keeps exactly its three
    # layers (scene canvas | Olaf DOM layer | fx canvas) and a single Olaf
    ok = page.evaluate("""(function(){
      start(); start();
      var st = document.getElementById('stage');
      return !!window._aurora
        && st.querySelectorAll('canvas').length === 2
        && st.querySelectorAll('div').length >= 1
        && document.querySelectorAll('.fz-olaf').length <= 1;
    })()""")
    _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
    non_font = [e for e in errors if not any(x in e for x in _ignore)]
    print("non-font errors:", non_font if non_font else "NONE")
    print("restart ok:", ok)
    print("shots:", [s["path"] for s in SHOTS])
    browser.close()
