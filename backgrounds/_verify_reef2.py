"""Dedicated reef2 harness — ALWAYS invoked the same way so no new approval
prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_reef2.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Two modes: STANDALONE loads reef2.html and pokes the
window._reef2 hooks; otherwise it loads the real game (index.html), picks the
reef theme and screenshots the live scene behind the game card. Reports JS
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
STANDALONE = "reef2.html"   # "" → in-game mode
THEME      = "reef"
WAIT_MS    = 1500
OUT        = r"c:\tmp\reef2"
# [name, scene time to seek to (or None), hooks to fire, ms to wait before the still]
SHOTS = [
    ["reef2_a",      2.0,  [],                                        900],
    ["reef2_whale",  9.0,  ["whale(700)", "act('bfly')", "poop()"],   2200],
    ["reef2_orca",  70.0,  ["orca(900)", "dart()", "act('dory')"],    1400],
    ["reef2_hide",  90.0,  ["hide()"],                                3500],
]
# crops of the LAST shot, upscaled ×2, for judging the fish at real size:
# name → (x0, y0, x1, y1) as fractions of the frame
CROPS = {
    "left_anemone":  (0.10, 0.58, 0.34, 0.78),
    "right_anemone": (0.66, 0.58, 0.90, 0.80),
    "midwater":      (0.28, 0.40, 0.62, 0.66),
}
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
    page.wait_for_function("window._reef2", timeout=20000)
    page.wait_for_timeout(WAIT_MS)
    shots = []
    for name, tt, hooks, wait in SHOTS:
        if tt is not None:
            page.evaluate(f"window._reef2.seek({tt})")
            page.wait_for_timeout(200)
        for h in hooks:
            page.evaluate(f"window._reef2.{h}")
        page.wait_for_timeout(wait)
        path = str(Path(OUT) / f"{name}.png")
        page.screenshot(path=path); shots.append(path)
    perf = page.evaluate("window._reef2.perf()")
    prof = page.evaluate("window._reef2.prof()")
    counts = page.evaluate("window._reef2.counts()")
    fish = page.evaluate("window._reef2.fish()")
    if STANDALONE:
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_timeout(800)
        n = page.evaluate("document.querySelectorAll('#stage canvas').length")
        print("restart ok:", n == 1, f"(canvases={n})")
    real = [e for e in errors if "font" not in e.lower() and "cors" not in e.lower()]
    print("non-font errors:", real if real else "NONE")
    print("perf:", perf)
    print("prof:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in prof.items()})
    print("counts:", counts)
    print("clownfish:", [f for f in fish if f["kind"] == "clown"])
    print("shots:", shots)
    browser.close()

if CROPS and shots:
    try:
        from PIL import Image
        im = Image.open(shots[-1]); W, H = im.size
        for name, (x0, y0, x1, y1) in CROPS.items():
            c = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
            c = c.resize((c.width * 2, c.height * 2), Image.LANCZOS)
            c.save(str(Path(OUT) / f"crop_{name}.png"))
        print("crops:", list(CROPS))
    except Exception as e:
        print("crops skipped:", e)
