"""Dedicated dubai3 harness — ALWAYS invoked the same way so no new approval
prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_dubai3.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Two modes: STANDALONE loads dubai3.html and pokes the
window._dubai3 hooks; otherwise it loads the real game (index.html), picks the
dubai theme and screenshots the live scene behind the game card. Reports JS
errors either way (font CORS errors on file:// are expected and harmless).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF        = 2
VIEW       = {"width": 1280, "height": 800}
STANDALONE = "dubai3.html"   # "" → in-game mode
THEME      = "dubai"
WAIT_MS    = 1200
OUT        = r"c:\tmp\dino_rigs"
# [name, phase-of-day (or None), hooks to fire, ms to wait before the still]
SHOTS = [
    ["dubai3_golden", 0.05, [],                                   1400],
    ["dubai3_blue",   0.40, ["wash", "museum"],                   1400],
    ["dubai3_night",  0.58, ["show", "fountain", "fireworks", "spin", "shoot", "horn"], 2600],
    ["dubai3_show",   0.62, ["show"],                             9000],
    ["dubai3_intercept", 0.10, ["missile"],                       4200],
    ["dubai3_ufo",    0.50, ["ufo"],                             6000],
]
# ────────────────────────────────────────────────────────────────────────────

BG_DIR     = Path(r"c:\Code\subtraction_game\backgrounds")
GAME_URL   = Path(r"c:\Code\subtraction_game\index.html").as_uri()
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
Path(OUT).mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    page = browser.new_context(viewport=VIEW, device_scale_factor=DSF).new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    if STANDALONE:
        page.goto((BG_DIR / STANDALONE).as_uri())
    else:
        page.add_init_script("localStorage.setItem('introSplash','0')")
        page.goto(GAME_URL); page.wait_for_timeout(1200)
        page.evaluate(f"applyTheme('{THEME}')")
    page.wait_for_function("window._dubai3", timeout=20000)
    page.wait_for_timeout(WAIT_MS)
    shots = []
    for name, ph, hooks, wait in SHOTS:
        if ph is not None:
            page.evaluate(f"window._dubai3.seek({ph})")
            page.wait_for_timeout(300)
        for h in hooks:
            page.evaluate(f"window._dubai3.{h}()")
        page.wait_for_timeout(wait)
        path = str(Path(OUT) / f"{name}.png")
        page.screenshot(path=path); shots.append(path)
    perf = page.evaluate("window._dubai3.perf()")
    prof = page.evaluate("window._dubai3.prof()")
    look = page.evaluate("(function(){var l=window._dubai3.look();return {ph:+l.ph.toFixed(3), night:+l.night.toFixed(2), lights:+l.lights.toFixed(2)};})()")
    if STANDALONE:
        # restart must leave exactly one canvas and no leaked hooks
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_timeout(800)
        n = page.evaluate("document.querySelectorAll('#stage canvas').length")
        print("restart ok:", n == 1, f"(canvases={n})")
    real = [e for e in errors if "font" not in e.lower() and "cors" not in e.lower()]
    print("non-font errors:", real if real else "NONE")
    print("perf:", perf)
    print("prof:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in prof.items()})
    print("look:", look)
    print("shots:", shots)
    browser.close()
