"""How much does the space scene's 2-D layer draw per frame?  —  the reason space4 exists.

    python c:/Code/subtraction_game/backgrounds/_perf_space4.py

Loads space2.html (the old scene) and space4.html (the redesign) in headless
Chrome, counts every 2-D canvas call per animation frame and reads the main
thread's script time per frame from CDP. Frame GAPS are useless in headless
Chrome (it paces every page at ~32 fps), and GPU fill does not show up here at
all — so this measures what the redesign set out to cut: the number of canvas
calls and the JavaScript time behind them. 2026-11 figures at 1280x800:
space2 ~3,270 calls a frame (970 fills, 350 strokes, 21 gradients built) and
2.9-4.4 ms of script; space4 ~650 calls a frame at full detail — ~450 of them
rect / lineTo segments inside ~25 batched fills and strokes, plus ~60 drawImage,
no gradients — and 0.7 ms of script.
"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

BG_DIR = pathlib.Path("c:/Code/subtraction_game/backgrounds")
CHROME_EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe"
PAGES = ["space2.html", "space4.html"]
VIEW = {"width": 1280, "height": 800}
SECONDS = 6
INIT = """
(() => {
  const P = CanvasRenderingContext2D.prototype, C = window.__cc = { frames: 0, calls: {}, total: 0 };
  for (const m of ['fill','stroke','drawImage','fillRect','strokeRect','clearRect','fillText','clip','arc','ellipse','lineTo','rect','bezierCurveTo','quadraticCurveTo','createRadialGradient','createLinearGradient','save','restore','setTransform']){
    const f = P[m]; P[m] = function(){ C.calls[m] = (C.calls[m] || 0) + 1; C.total++; return f.apply(this, arguments); };
  }
  const raf = window.requestAnimationFrame; window.requestAnimationFrame = cb => raf(ts => { C.frames++; cb(ts); });
})();
"""
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    for name in PAGES:
        page = browser.new_context(viewport=VIEW).new_page()
        page.add_init_script(INIT)
        page.goto((BG_DIR / name).as_uri())
        page.wait_for_timeout(5000)                                   # shaders compiled, sprites baked
        page.evaluate("(() => { const C = window.__cc; C.frames = 0; C.calls = {}; C.total = 0; })()")
        cdp = page.context.new_cdp_session(page); cdp.send("Performance.enable")
        m0 = {m["name"]: m["value"] for m in cdp.send("Performance.getMetrics")["metrics"]}
        page.wait_for_timeout(SECONDS * 1000)
        m1 = {m["name"]: m["value"] for m in cdp.send("Performance.getMetrics")["metrics"]}
        c = page.evaluate("window.__cc"); f = max(1, c["frames"])
        per = {k: round(v / f, 1) for k, v in sorted(c["calls"].items(), key=lambda kv: -kv[1])}
        print(f"{name}: {round(c['total'] / f)} canvas calls/frame | script {(m1['ScriptDuration'] - m0['ScriptDuration']) * 1000 / f:.2f} ms/frame"
              f" | task {(m1['TaskDuration'] - m0['TaskDuration']) * 1000 / f:.2f} ms/frame | frames {f}")
        print("   ", json.dumps(per))
        page.context.close()
    browser.close()
