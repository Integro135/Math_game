"""Reef2 rendering-cost probe — ALWAYS invoked the same way:

    python c:/Code/subtraction_game/backgrounds/_perf_reef2.py

Headless Chrome here is capped at ~32 fps for every page, so frame gaps say
nothing: this measures MAIN-THREAD work via CDP Performance.getMetrics deltas
over a window, plus each scene's own per-section timers (`prof()`). It runs
the reef INSIDE THE REAL GAME (index.html + the reef theme) and compares it
with the other canvas backgrounds the game ships, so "is it too heavy?" is
answered against what already runs here. Edit CONFIG to change the field.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG ──────────────────────────────────────────────────────────────────
# (label, theme key, the scene's test-hook global)
CASES = [
    ("reef2 FULL quality (Q2)",    "reef",      "window._reef2"),
    ("reef2 MINIMAL quality (Q0)", "reef",      "window._reef2"),
    ("dubai3",       "dubai",     "window._dubai3"),
    ("dinosaurs3",   "dinosaurs", "window._dino3"),
    ("aurora",       "frozen",    "window._aurora"),
]
VIEW     = {"width": 1280, "height": 800}
DSF      = 2
WINDOW_S = 5.0
SETTLE_S = 3.0
# reef only: force the busiest possible moment before measuring
BUSY = ["whale(700)", "orca(1100)", "shark()", "puffer()", "breath()", "crab()", "dart()", "poop()"]
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
    if hook == "_reef2":                       # pin the tier (headless gaps would step it down on their own)
        page.evaluate(f"window._reef2.quality({0 if 'MINIMAL' in label else 2})")
    for h in (busy or []):
        try: page.evaluate(f"window.{hook}.{h}")
        except Exception: pass
    page.wait_for_timeout(600)
    cdp = ctx.new_cdp_session(page); cdp.send("Performance.enable")
    if hook == "_reef2": page.evaluate(f"window._reef2.quality({0 if 'MINIMAL' in label else 2})")
    page.evaluate(f"window.{hook}.profReset && window.{hook}.profReset()")
    a = metrics(cdp)
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
        tot = sum(v for k, v in prof.items() if k not in ("frames", "repaints"))
        print(f"  per-frame section cost (ms, avg over {prof['frames']} frames):")
        for k, v in sorted(prof.items(), key=lambda kv: -kv[1]):
            if k in ("frames", "repaints"): continue
            print(f"    {k:<12} {v:6.2f} ms  {v/tot*100:5.1f}%")
        print(f"    {'TOTAL':<12} {tot:6.2f} ms / frame")
    p = page.evaluate(f"window.{hook}.perf ? window.{hook}.perf() : null")
    if p: print("  scene perf:", p)
    real = [e for e in errs if "font" not in e.lower() and "cors" not in e.lower()]
    print("  errors:", real if real else "NONE")
    ctx.close()

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    for label, theme, ready in CASES:
        try: run(browser, label, theme, ready, BUSY if theme == "reef" else None)
        except Exception as e: print(f"\n== {label} ==  FAILED: {e}")
    browser.close()
