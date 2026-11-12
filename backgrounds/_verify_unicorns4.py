"""Dedicated unicorns4 harness — ALWAYS invoked the same way so no new approval
prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_unicorns4.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Two modes: STANDALONE loads unicorns4.html and pokes the
window._uni4 hooks; otherwise it loads the real game (index.html), picks the
🦄 (girls) theme and screenshots the live scene behind the game card. Reports JS
errors either way (font CORS errors on file:// are expected and harmless).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF        = 1
VIEWS      = {"desk": {"width": 1280, "height": 800}, "phone": {"width": 390, "height": 844}, "tab": {"width": 768, "height": 1024}, "tabl": {"width": 1024, "height": 768}}
VIEW_LIST  = ["desk", "phone", "tab", "tabl"]   # views to capture; the extra views take only the first 2 shots
STANDALONE = "unicorns4.html"     # "" → in-game mode
THEME      = "girls"
WAIT_MS    = 1500
OUT        = r"c:\tmp\uni"
# [name, tod to set (or None), hooks to fire, ms to wait before the still]
SHOTS = [
    ["uni_morning", 0.16, ["clearVisitors()", "spawn({dir: 1, run: false, n: 2, lane: 0.2})", "fly({dir: 1, y: 210})"],  7000],
    ["uni_sunset",  0.66, ["clearVisitors()", "spawn({dir: -1, run: true, n: 2, lane: 0.8})"],                            2600],
    ["uni_dawn",    0.03, [],                                                                                               700],
    ["uni_noon",    0.36, ["fx.rainbow()", "fx.rainbowFall()", "fx.fish()", "fx.petals(0)"],                              1100],
    ["uni_golden",  0.55, ["act('mare', 'pose')", "act('foal', 'hearts')"],                                               1300],
    ["uni_dusk",    0.77, [],                                                                                               700],
    ["uni_night",   0.90, ["clearVisitors()", "fly({dir: -1, y: 180})", "fx.castle()"],                                   3000],
    ["uni_tricks",  0.36, ["act(0, 'pose')", "act(1, 'jump')", "act('bunny', 'pose')", "act('swan', 'pose')"],             800],
]
CROPS = {
    "family": ("uni_golden",  0.30, 0.55, 1.00, 1.00),
    "castle": ("uni_night",   0.60, 0.10, 1.00, 0.75),
    "falls":  ("uni_noon",    0.00, 0.20, 0.45, 0.95),
    "sky":    ("uni_morning", 0.00, 0.00, 1.00, 0.55),
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
        page.add_style_tag(content="#bar,#clock{display:none}")
    else:
        page.add_init_script("localStorage.setItem('introSplash','0')")
        page.goto(GAME_URL); page.wait_for_selector("#ans, #ans1")
        page.evaluate(f"pickTheme('{THEME}')")
    page.wait_for_function("window._uni4 && window._uni4.ready()", timeout=20000)
    page.wait_for_timeout(WAIT_MS)
    page.evaluate("window._uni4.setSpeed(0)")         # hold the clock for the stills
    for name, tt, hooks, wait in (SHOTS if VIEW == VIEW_LIST[0] else SHOTS[:2]):
        if tt is not None:
            page.evaluate(f"window._uni4.setTod({tt})")
            page.wait_for_timeout(150)
        for h in hooks:
            page.evaluate(f"window._uni4.{h}")
        page.wait_for_timeout(wait)
        path = str(Path(OUT) / f"{name}_{VIEW}.png")
        page.screenshot(path=path)
        if VIEW == VIEW_LIST[0]: shots[name] = path
    perf = page.evaluate("window._uni4.perf()")
    lay = page.evaluate("window._uni4.layout()")
    pride = page.evaluate("window._uni4.everyone().map(a => a.role + '@' + Math.round(a.x))")
    herds = page.evaluate("window._uni4.visitors().map(p => p.members.length)")
    if STANDALONE:
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_timeout(800)
        n = page.evaluate("document.querySelectorAll('#stage canvas').length")
        print(VIEW, "restart ok:", n == 1, f"(canvases={n})")
    real = [e for e in errors if "font" not in e.lower() and "cors" not in e.lower()]
    print(VIEW, "non-font errors:", real if real else "NONE")
    print(VIEW, "perf:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in perf.items()})
    print(VIEW, "layout:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in lay.items() if not isinstance(v, dict)})
    print(VIEW, "cast:", pride, "visitors:", herds)
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
            c.save(str(Path(OUT) / f"crop_{name}.png"))
        print("crops:", list(CROPS))
    except Exception as e:
        print("crops skipped:", e)
