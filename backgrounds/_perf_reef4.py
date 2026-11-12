"""Reef4 rendering-cost probe — ALWAYS invoked the same way:

    python c:/Code/subtraction_game/backgrounds/_perf_reef4.py

Headless Chrome here is capped at ~32 fps for every page, so frame gaps say
nothing: this measures MAIN-THREAD work via CDP Performance.getMetrics deltas
over a window, and prints what each scene reports about itself. Two parts:

  1. STANDALONE, the new reef against the old one, same window, same DPR:
     backgrounds/reef4.html (quality 2, 1 and 0, everything busy) against
     backgrounds/reef2.html (quality 2, everything busy).
  2. IN THE REAL GAME (index.html + the theme): the reef theme against the
     other canvas scenes the game ships.

reef4's own numbers to watch: `blits` (image draws per frame), `live` (creatures
drawn as vectors this frame — only those mid-trick), `screens` (how many screens
of pixels a frame paints: its real cost on a tablet is fill), `costEma` (ms of
script per frame). Edit CONFIG to change the field.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG ───────────────────────────────────────────────────────────────────
VIEW     = {"width": 1280, "height": 800}
DSF      = 2
WINDOW_S = 5.0
SETTLE_S = 3.0
# (label, harness page, hook, quality to pin, hooks to fire for the busiest moment)
STANDALONE = [
    ("reef4 Q2 (full)",    "reef4.html", "_reef4", 2, ["visit('turtle')", "visit('dolphin')", "visit('shark')", "giant('whale', {x: 500})", "act('octopus')", "act('puffer')", "act('dory')", "poop()"]),
    ("reef4 Q1 (reduced)", "reef4.html", "_reef4", 1, ["visit('turtle')", "visit('dolphin')", "visit('shark')", "giant('whale', {x: 500})"]),
    ("reef4 Q0 (minimal)", "reef4.html", "_reef4", 0, ["visit('turtle')", "visit('dolphin')", "visit('shark')", "giant('whale', {x: 500})"]),
    ("reef2 Q2 (the old reef)", "reef2.html", "_reef2", 2, ["whale(700)", "orca(1100)", "shark()", "puffer()", "breath()", "crab()", "dart()", "poop()"]),
]
# (label, theme key, the scene's hook)
IN_GAME = [
    ("reef (the reef theme)", "reef",      None),
    ("savanna2",              "savanna",   "_sav2"),
    ("unicorns4",             "girls",     "_uni4"),
    ("dinosaurs4",            "dinosaurs", "_dino4"),
    ("dubai3",                "dubai",     "_dubai3"),
]
# ─────────────────────────────────────────────────────────────────────────────
BG_DIR     = Path(r"c:\Code\subtraction_game\backgrounds")
GAME_URL   = Path(r"c:\Code\subtraction_game\index.html").as_uri()
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def metrics(cdp):
    return {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}

def measure(page, ctx, label, hook, where):
    cdp = ctx.new_cdp_session(page); cdp.send("Performance.enable")
    a = metrics(cdp); page.wait_for_timeout(int(WINDOW_S * 1000)); b = metrics(cdp)
    dt = b["Timestamp"] - a["Timestamp"]
    per_s = lambda k: (b.get(k, 0) - a.get(k, 0)) / dt
    print(f"\n== {label} ==  window {dt:.1f}s  DPR {DSF}  {VIEW['width']}x{VIEW['height']}  ({where})")
    print(f"  main-thread busy : {per_s('TaskDuration')*100:6.1f}%   (TaskDuration/s)")
    print(f"  script           : {per_s('ScriptDuration')*100:6.1f}%")
    print(f"  JS heap          : {b['JSHeapUsedSize']/1e6:6.1f} MB")
    p = page.evaluate(f"window.{hook} && window.{hook}.perf ? window.{hook}.perf() : null") if hook else None
    if p: print("  scene perf:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in p.items()})

def standalone(browser, label, html, hook, q, busy):
    ctx = browser.new_context(viewport=VIEW, device_scale_factor=DSF); page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto((BG_DIR / html).as_uri())
    page.wait_for_function(f"!!window.{hook}", timeout=25000)
    if hook == "_reef4": page.wait_for_function("_reef4.ready() && _reef4.baked()", timeout=25000)
    page.wait_for_timeout(int(SETTLE_S * 1000))
    page.evaluate(f"window.{hook}.quality({q})")
    for h in busy:
        try: page.evaluate(f"window.{hook}.{h}")
        except Exception: pass
    page.wait_for_timeout(700)
    measure(page, ctx, label, hook, "standalone harness")
    print("  errors:", errs if errs else "NONE")
    ctx.close()

def in_game(browser, label, theme, hook):
    ctx = browser.new_context(viewport=VIEW, device_scale_factor=DSF); page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.add_init_script("localStorage.setItem('introSplash','0')")
    page.goto(GAME_URL); page.wait_for_timeout(1200)
    page.evaluate(f"applyTheme('{theme}')")
    if theme == "reef":                        # whichever reef the theme maps to
        page.wait_for_function("!!(window._reef4 || window._reef2)", timeout=25000)
        hook = page.evaluate("window._reef4 ? '_reef4' : '_reef2'")
        label = f"{hook[1:]} (the reef theme)"
        page.evaluate(f"window.{hook}.quality(2)")
    else:
        page.wait_for_function(f"!!window.{hook}", timeout=25000)
    page.wait_for_timeout(int(SETTLE_S * 1000))
    measure(page, ctx, label, hook, "in the real game")
    print("  errors:", errs if errs else "NONE")
    ctx.close()

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    for case in STANDALONE:
        try: standalone(browser, *case)
        except Exception as e: print(f"\n== {case[0]} ==  FAILED: {e}")
    for case in IN_GAME:
        try: in_game(browser, *case)
        except Exception as e: print(f"\n== {case[0]} ==  FAILED: {e}")
    browser.close()
