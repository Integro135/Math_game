"""Dedicated maldives2 harness — ALWAYS invoked the same way so no new approval
prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_maldives2.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Two modes: STANDALONE loads maldives2.html and pokes the
window._mv2 hooks; otherwise it loads the real game (index.html), picks the
maldives theme and screenshots the live scene behind the game card. Reports
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
STANDALONE = "maldives2.html"   # "" → in-game mode
THEME      = "maldives"
WAIT_MS    = 1200
OUT        = r"c:\tmp\maldives2"
# [name, tod to set (or None), hooks to fire, ms to wait before the still]
SHOTS = [
    ["mv2_dawn",    0.04, [],                              700],
    ["mv2_morning", 0.16, [],                              700],
    ["mv2_noon",    0.34, [],                              700],
    ["mv2_golden",  0.56, [],                              700],
    ["mv2_sunset",  0.70, [],                              700],
    ["mv2_dusk",    0.80, [],                              700],
    ["mv2_night",   0.91, [],                              700],
    ["mv2_storm",   0.30, ["stormAt(1)", "bolt()"],        180],
    ["mv2_rainbow", 0.50, ["stormAt(0.35,'fade')"],       2500],
    # the walkers: every ground pokemon parked across the sand + the ghost, then a live crossing
    ["mv2_walkers", 0.20, ["clear()", "walk('jigglypuff',0.10)", "walk('eevee',0.28)", "walk('pikachu',0.50)",
                           "walk('squirtle',0.70)", "walk('bulbasaur',0.90)", "fly(0.50)"],             1200],
    ["mv2_walk_live", None, ["auto(false)", "hold(false)", "clear()", "walk('pikachu')", "fly()"],     3200],
]
# crops of a chosen shot, upscaled ×2, for judging detail at real size:
# name → (shot name, x0, y0, x1, y1) as fractions of the frame
CROPS = {
    "palm_left":   ("mv2_morning", 0.00, 0.05, 0.30, 0.75),
    "palm_right":  ("mv2_morning", 0.70, 0.05, 1.00, 0.75),
    "shore":       ("mv2_morning", 0.25, 0.62, 0.75, 0.95),
    "islands":     ("mv2_morning", 0.00, 0.44, 0.50, 0.60),
    "storm_sky":   ("mv2_storm",   0.20, 0.00, 0.80, 0.60),
    "walkers":     ("mv2_walkers", 0.00, 0.55, 1.00, 1.00),
    "walk_live":   ("mv2_walk_live", 0.00, 0.30, 1.00, 1.00),
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
    page.wait_for_function("window._mv2", timeout=20000)
    page.wait_for_function("window._mv2.pokeReady()", timeout=20000)   # the rigs are injected async
    page.wait_for_timeout(WAIT_MS)
    page.evaluate("window._mv2.setSpeed(0)")          # hold the clock for the stills
    page.evaluate("window._mv2.hold(true); window._mv2.clear()")   # no wanderers in the hour stills
    shots = {}
    for name, tt, hooks, wait in SHOTS:
        if tt is not None:
            page.evaluate("window._mv2.stormAt(0)")   # each still starts from clear weather
            page.evaluate(f"window._mv2.setTod({tt})")
            page.wait_for_timeout(150)
        for h in hooks:
            page.evaluate(f"window._mv2.{h}")
        page.wait_for_timeout(wait)
        path = str(Path(OUT) / f"{name}.png")
        page.screenshot(path=path); shots[name] = path
    perf = page.evaluate("window._mv2.perf()")
    prof = page.evaluate("window._mv2.prof()")
    storm = page.evaluate("window._mv2.stormState()")
    palms = page.evaluate("window._mv2.palms()")
    walkers = page.evaluate("window._mv2.walkers()")
    seq = page.evaluate("Array.from({length: 10}, () => window._mv2.nextName())")
    if STANDALONE:
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_timeout(800)
        n = page.evaluate("document.querySelectorAll('#stage canvas').length")
        a = page.evaluate("document.querySelectorAll('#stage .mv2-actors').length")
        w = page.evaluate("document.querySelectorAll('#stage .mv2-actors > *').length")
        print("restart ok:", n == 2 and a == 1 and w == 0, f"(canvases={n} world+front, actor layers={a}, leftover walkers={w})")
    real = [e for e in errors if "font" not in e.lower() and "cors" not in e.lower()]
    print("non-font errors:", real if real else "NONE")
    print("perf:", perf)
    print("prof:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in prof.items()})
    print("storm:", storm)
    print("palms:", palms)
    print("walkers (live crossing):", walkers)
    print("round-robin (10 picks, each block of 5 distinct):", seq, "distinct in first 5:", len(set(seq[:5])))
    print("shots:", list(shots.values()))
    browser.close()

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
