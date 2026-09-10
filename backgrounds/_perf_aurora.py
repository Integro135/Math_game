"""Aurora rendering-cost probe — ALWAYS invoked the same way:

    python c:/Code/subtraction_game/backgrounds/_perf_aurora.py

Headless Chrome here is capped at ~32 fps for every page, so frame gaps say
nothing (see the memory note): this measures MAIN-THREAD work via CDP
Performance.getMetrics deltas over a window, plus the scene's own per-section
timers (window._aurora.prof()). Edit CONFIG to compare pages / toggle parts.
"""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG ──────────────────────────────────────────────────────────────────
PAGES = [
    ("aurora",  r"c:\Code\subtraction_game\backgrounds\aurora.html",     "window._aurora"),
    ("dino3",   r"c:\Code\subtraction_game\backgrounds\dinosaurs3.html", "window._dino3"),
]
VIEW     = {"width": 1280, "height": 800}
DSF      = 2
WINDOW_S = 4.0
SETTLE_S = 2.0
# ────────────────────────────────────────────────────────────────────────────
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def metrics(cdp):
    m = cdp.send("Performance.getMetrics")["metrics"]
    return {x["name"]: x["value"] for x in m}

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    for name, path, ready in PAGES:
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=DSF)
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(Path(path).as_uri())
        page.wait_for_function(ready, timeout=20000)
        page.wait_for_timeout(int(SETTLE_S * 1000))
        cdp = ctx.new_cdp_session(page)
        cdp.send("Performance.enable")
        if name == "aurora":
            page.evaluate("window._aurora.profReset && window._aurora.profReset()")
        a = metrics(cdp)
        page.wait_for_timeout(int(WINDOW_S * 1000))
        b = metrics(cdp)
        dt = b["Timestamp"] - a["Timestamp"]
        def per_s(k): return (b.get(k, 0) - a.get(k, 0)) / dt
        frames = b.get("Frames", 0) - a.get("Frames", 0) if "Frames" in b else None
        print(f"\n== {name} ==  window {dt:.1f}s  DPR {DSF}  {VIEW['width']}x{VIEW['height']}")
        print(f"  main-thread busy : {per_s('TaskDuration')*100:6.1f}%   (TaskDuration/s)")
        print(f"  script           : {per_s('ScriptDuration')*100:6.1f}%")
        print(f"  style+layout     : {(per_s('RecalcStyleDuration')+per_s('LayoutDuration'))*100:6.1f}%   layouts/s {per_s('LayoutCount'):.1f}")
        print(f"  JS heap          : {b['JSHeapUsedSize']/1e6:6.1f} MB")
        if name == "aurora":
            prof = page.evaluate("window._aurora.prof ? window._aurora.prof() : null")
            if prof:
                print("  per-frame section cost (ms, avg over window):")
                tot = sum(v for k, v in prof.items() if k != 'frames')
                for k, v in sorted(prof.items(), key=lambda kv: -kv[1]):
                    if k == 'frames': continue
                    print(f"    {k:<12} {v:6.2f} ms  {v/tot*100:5.1f}%")
                print(f"    {'TOTAL':<12} {tot:6.2f} ms / frame   ({prof['frames']} frames)")
        if errs: print("  errors:", errs)
        ctx.close()
    browser.close()
