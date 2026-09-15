"""Maldives2 rendering-cost probe — ALWAYS invoked the same way:

    python c:/Code/subtraction_game/backgrounds/_perf_maldives2.py

Headless Chrome here is capped at ~32 fps for every page, so frame gaps say
nothing: this measures MAIN-THREAD work via CDP Performance.getMetrics deltas
over a window, plus each scene's own per-section timers (`prof()`). It runs
the beach INSIDE THE REAL GAME (index.html + the maldives theme) — once in
fair weather and once in the middle of a storm (rain + lightning, the busiest
moment) — and compares it with the other canvas backgrounds the game ships,
so "is it too heavy?" is answered against what already runs here.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG ──────────────────────────────────────────────────────────────────
# (label, theme key, the scene's test-hook global, hooks to fire before measuring)
CASES = [
    ("maldives2 fair",  "maldives",  "window._mv2",    []),
    ("maldives2 storm", "maldives",  "window._mv2",    ["stormAt(1)", "bolt()"]),
    ("reef2",           "reef",      "window._reef2",  []),
    ("dubai3",          "dubai",     "window._dubai3", []),
    ("aurora",          "frozen",    "window._aurora", []),
]
VIEW     = {"width": 1280, "height": 800}
DSF      = 2
WINDOW_S = 5.0
SETTLE_S = 3.0
# ────────────────────────────────────────────────────────────────────────────
GAME_URL   = Path(r"c:\Code\subtraction_game\index.html").as_uri()
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def metrics(cdp):
    return {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}

def run(browser, label, theme, ready, busy):
    ctx = browser.new_context(viewport=VIEW, device_scale_factor=DSF)
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.add_init_script("localStorage.setItem('introSplash','0')")
    page.goto(GAME_URL); page.wait_for_timeout(1200)
    page.evaluate(f"applyTheme('{theme}')")
    page.wait_for_function(ready, timeout=25000)
    page.wait_for_timeout(int(SETTLE_S * 1000))
    hook = ready.replace("window.", "")
    for h in (busy or []):
        try: page.evaluate(f"window.{hook}.{h}")
        except Exception: pass
    page.wait_for_timeout(600)
    cdp = ctx.new_cdp_session(page); cdp.send("Performance.enable")
    page.evaluate(f"window.{hook}.profReset && window.{hook}.profReset()")
    a = metrics(cdp)
    if busy and "bolt()" in busy:                      # keep the lightning going through the window
        for _ in range(4):
            page.wait_for_timeout(int(WINDOW_S * 250))
            try: page.evaluate(f"window.{hook}.bolt()")
            except Exception: pass
    else:
        page.wait_for_timeout(int(WINDOW_S * 1000))
    b = metrics(cdp)
    dt = b["Timestamp"] - a["Timestamp"]
    per_s = lambda k: (b.get(k, 0) - a.get(k, 0)) / dt
    print(f"\n== {label} ==  window {dt:.1f}s  DPR {DSF}  {VIEW['width']}x{VIEW['height']}  (in the real game)")
    print(f"  main-thread busy : {per_s('TaskDuration')*100:6.1f}%   (TaskDuration/s)")
    print(f"  script           : {per_s('ScriptDuration')*100:6.1f}%")
    print(f"  style+layout     : {(per_s('RecalcStyleDuration')+per_s('LayoutDuration'))*100:6.1f}%   layouts/s {per_s('LayoutCount'):.1f}")
    print(f"  JS heap          : {b['JSHeapUsedSize']/1e6:6.1f} MB")
    prof = page.evaluate(f"window.{hook}.prof ? window.{hook}.prof() : null")
    if prof and prof.get("frames"):
        skip = ("frames", "repaints", "crowns")
        tot = sum(v for k, v in prof.items() if k not in skip)
        print(f"  per-frame section cost (ms, avg over {prof['frames']} frames):")
        for k, v in sorted(prof.items(), key=lambda kv: -kv[1] if kv[0] not in skip else 0):
            if k in skip: continue
            print(f"    {k:<12} {v:6.2f} ms  {v/tot*100:5.1f}%")
        print(f"    {'TOTAL':<12} {tot:6.2f} ms / frame   repaints {prof.get('repaints')}  crown bakes {prof.get('crowns', 0):.0f} ms total")
    p = page.evaluate(f"window.{hook}.perf ? window.{hook}.perf() : null")
    if p: print("  scene perf:", p)
    real = [e for e in errs if "font" not in e.lower() and "cors" not in e.lower()]
    print("  errors:", real if real else "NONE")
    ctx.close()

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    for label, theme, ready, busy in CASES:
        try: run(browser, label, theme, ready, busy)
        except Exception as e: print(f"\n== {label} ==  FAILED: {e}")
    browser.close()
