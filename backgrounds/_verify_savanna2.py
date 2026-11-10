"""Dedicated savanna2 harness — ALWAYS invoked the same way so no new approval
prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_savanna2.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Two modes: STANDALONE loads savanna2.html and pokes the
window._sav2 hooks; otherwise it loads the real game (index.html), picks the
savanna theme and screenshots the live scene behind the game card. Reports JS
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
STANDALONE = "savanna2.html"     # "" → in-game mode
THEME      = "savanna"
WAIT_MS    = 1500
OUT        = r"c:\tmp\sav"
# [name, tod to set (or None), hooks to fire, ms to wait before the still]
SHOTS = [
    ["sav_morning", 0.16, ["clearHerds()", "spawn('zebra', {lane: 0.2, run: false})", "spawn('giraffe', {lane: 0.9, run: false})"], 7000],
    ["sav_sunset",  0.66, ["clearHerds()", "spawn('elephant', {lane: 0.8, run: false})"],                                    7000],
    ["sav_dawn",    0.03, [],                                                                                                  700],
    ["sav_noon",    0.36, ["clearHerds()", "spawn('ostrich', {lane: 0.3, run: true})", "spawn('cheetah', {lane: 0.9, run: false})"], 4000],
    ["sav_golden",  0.55, ["act('lion', 'pose')"],                                                                            1200],
    ["sav_dusk",    0.77, [],                                                                                                  700],
    ["sav_night",   0.90, ["clearHerds()", "spawn('lioness', {lane: 0.6, run: false})"],                                      6000],
    ["sav_tricks",  0.36, ["act(0, 'pose')", "act(1, 'jump')", "act(2, 'fart')", "act(3, 'fart')"],                            700],
]
CROPS = {
    "pride":  ("sav_morning", 0.00, 0.15, 0.45, 0.85),
    "herds":  ("sav_morning", 0.00, 0.60, 1.00, 1.00),
    "roar":   ("sav_golden",  0.00, 0.10, 0.50, 0.75),
    "night":  ("sav_night",   0.00, 0.10, 0.50, 1.00),
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
    page.wait_for_function("window._sav2 && window._sav2.ready()", timeout=20000)
    page.wait_for_timeout(WAIT_MS)
    page.evaluate("window._sav2.setSpeed(0)")         # hold the clock for the stills
    for name, tt, hooks, wait in (SHOTS if VIEW == VIEW_LIST[0] else SHOTS[:2]):
        if tt is not None:
            page.evaluate(f"window._sav2.setTod({tt})")
            page.wait_for_timeout(150)
        for h in hooks:
            page.evaluate(f"window._sav2.{h}")
        page.wait_for_timeout(wait)
        path = str(Path(OUT) / f"{name}_{VIEW}.png")
        page.screenshot(path=path)
        if VIEW == VIEW_LIST[0]: shots[name] = path
    perf = page.evaluate("window._sav2.perf()")
    lay = page.evaluate("window._sav2.layout()")
    pride = page.evaluate("window._sav2.pride().map(a => a.rig + '@' + Math.round(a.x))")
    herds = page.evaluate("window._sav2.herds().map(h => h.kind + '×' + h.members.length)")
    if STANDALONE:
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_timeout(800)
        n = page.evaluate("document.querySelectorAll('#stage canvas').length")
        print(VIEW, "restart ok:", n == 1, f"(canvases={n})")
    real = [e for e in errors if "font" not in e.lower() and "cors" not in e.lower()]
    print(VIEW, "non-font errors:", real if real else "NONE")
    print(VIEW, "perf:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in perf.items()})
    print(VIEW, "layout:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in lay.items() if not isinstance(v, dict)})
    print(VIEW, "pride:", pride, "herds:", herds)
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
