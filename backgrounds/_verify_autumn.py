"""Dedicated autumn harness — ALWAYS invoked the same way so no new approval
prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_autumn.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Two modes: STANDALONE loads autumn.html and pokes the
window._aut hooks; otherwise it loads the real game (index.html), picks the
autumn theme and screenshots the live scene behind the game card. Reports JS
errors either way (font CORS errors on file:// are expected and harmless).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF        = 2
VIEWS      = {"desk": {"width": 1280, "height": 800}, "phone": {"width": 390, "height": 844}, "tab": {"width": 768, "height": 1024}, "tabl": {"width": 1024, "height": 768}}
VIEW_LIST  = ["desk", "phone", "tab", "tabl"]   # views to capture; the extra views take only the first 2 shots
STANDALONE = "autumn.html"       # "" → in-game mode
THEME      = "autumn"
WAIT_MS    = 1500
OUT        = r"c:\tmp\autumn"
# [name, tod to set (or None), hooks to fire, ms to wait before the still]
SHOTS = [
    ["aut_golden",  0.55, ["gust(0)", "gust(5)"],                 1400],
    ["aut_dawn",    0.04, [],                                      700],
    ["aut_morning", 0.18, ["hogStart(0.45)", "skein(0.5)"],      1200],
    ["aut_noon",    0.36, [],                                      700],
    ["aut_sunset",  0.67, [],                                      700],
    ["aut_dusk",    0.77, [],                                      700],
    ["aut_night",   0.90, [],                                      900],
    ["aut_rain",    0.36, ["rainAt(1)"],                          1500],
    ["aut_rainbow", 0.50, ["rainAt(0)", "rainbow(1)"],             400],
]
CROPS = {
    "tree_left":   ("aut_golden", 0.00, 0.05, 0.32, 0.98),
    "tree_right":  ("aut_golden", 0.68, 0.05, 1.00, 0.98),
    "ground_mid":  ("aut_golden", 0.25, 0.70, 0.75, 1.00),
    "squill":      ("aut_morning", 0.10, 0.70, 0.40, 1.00),
    "hog":         ("aut_morning", 0.30, 0.82, 0.62, 1.00),
    "storks":      ("aut_morning", 0.30, 0.02, 0.75, 0.30),
    "night_trees": ("aut_night", 0.00, 0.05, 0.40, 0.98),
}
# ────────────────────────────────────────────────────────────────────────────

BG_DIR     = Path(r"c:\Code\subtraction_game\backgrounds")
GAME_URL   = Path(r"c:\Code\subtraction_game\index.html").as_uri()
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
Path(OUT).mkdir(parents=True, exist_ok=True)

shots = {}
with sync_playwright() as pw:
  browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
  for VIEW in VIEW_LIST:
    page = browser.new_context(viewport=VIEWS[VIEW], device_scale_factor=DSF).new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    if STANDALONE:
        page.goto((BG_DIR / STANDALONE).as_uri())
    else:
        page.add_init_script("localStorage.setItem('introSplash','0')")
        page.goto(GAME_URL); page.wait_for_timeout(1200)
        page.evaluate(f"applyTheme('{THEME}')")
    page.wait_for_function("window._aut", timeout=20000)
    page.wait_for_timeout(WAIT_MS)
    page.evaluate("window._aut.setSpeed(0)")          # hold the clock for the stills
    for name, tt, hooks, wait in (SHOTS if VIEW == VIEW_LIST[0] else SHOTS[:2]):
        if tt is not None:
            page.evaluate("window._aut.rainAt(0)")
            page.evaluate(f"window._aut.setTod({tt})")
            page.wait_for_timeout(150)
        for h in hooks:
            page.evaluate(f"window._aut.{h}")
        page.wait_for_timeout(wait)
        path = str(Path(OUT) / f"{name}_{VIEW}.png")
        page.screenshot(path=path)
        if VIEW == VIEW_LIST[0]: shots[name] = path
    perf = page.evaluate("window._aut.perf()")
    prof = page.evaluate("window._aut.prof()")
    pmax = page.evaluate("window._aut.pmax()")
    lay = page.evaluate("window._aut.layout()")
    leaves = page.evaluate("window._aut.leaves()")
    bunnies = page.evaluate("window._aut.bunnies()")
    if STANDALONE:
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_timeout(800)
        n = page.evaluate("document.querySelectorAll('#stage canvas').length")
        print(VIEW, "restart ok:", n == 1, f"(canvases={n})")
    real = [e for e in errors if "font" not in e.lower() and "cors" not in e.lower()]
    print(VIEW, "non-font errors:", real if real else "NONE")
    print(VIEW, "perf:", perf)
    print(VIEW, "prof:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in prof.items()})
    print(VIEW, "pmax:", {k: round(v, 1) for k, v in pmax.items()})
    print(VIEW, "layout:", lay)
    print(VIEW, "leaves:", leaves)
    print(VIEW, "bunnies:", bunnies)
    page.context.close()
  browser.close()
print("shots:", list(shots.values()))

if CROPS and shots:
    try:
        from PIL import Image
        for name, (shot, x0, y0, x1, y1) in CROPS.items():
            if shot not in shots: continue
            im = Image.open(shots[shot]); W, H = im.size
            c = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
            c = c.resize((c.width * 2, c.height * 2), Image.LANCZOS)
            c.save(str(Path(OUT) / f"crop_{name}.png"))
        print("crops:", list(CROPS))
    except Exception as e:
        print("crops skipped:", e)
