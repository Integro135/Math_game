"""Stills of the space4 scene at four window sizes + a JS-error report.

    python c:/Code/subtraction_game/backgrounds/_verify_space4.py

STANDALONE loads space4.html; set it to "" to shoot the real game with the
galaxy theme. Edit the CONFIG block to capture something else (the command line
stays the same). Font CORS errors on file:// are expected and harmless.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ── CONFIG ──────────────────────────────────────────────────────────────────
VIEWS      = {"desk": (1280, 800), "phone": (390, 844), "tab": (768, 1024), "tabl": (1024, 768)}
STANDALONE = "space4.html"       # "" → in-game mode
OUT        = "c:/tmp/space4/shots"
# [name, hooks to fire, ms to wait before the still]
SHOTS = [
    ["sp_scene",  [],                                              6000],
    ["sp_parade", ["spawnAll()", "startNova()", "flare()"],        1500],
]
# ────────────────────────────────────────────────────────────────────────────
BG_DIR = Path("c:/Code/subtraction_game/backgrounds")
GAME_URL   = Path("c:/Code/subtraction_game/index.html").as_uri()
CHROME_EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe"
Path(OUT).mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    for view, (w, h) in VIEWS.items():
        page = browser.new_context(viewport={"width": w, "height": h}).new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        if STANDALONE:
            page.goto((BG_DIR / STANDALONE).as_uri())
            page.add_style_tag(content="#toggle{display:none}")
        else:
            page.add_init_script("localStorage.setItem('introSplash','0')")
            page.goto(GAME_URL); page.wait_for_selector("#ans, #ans1")
            page.evaluate("pickTheme('galaxy')")
        page.wait_for_function("window._space4 && _space4.perf().frames > 10", timeout=60000)
        for name, hooks, wait in (SHOTS if view == "desk" else SHOTS[:1]):
            for hk in hooks: page.evaluate(f"window._space4.{hk}")
            page.wait_for_timeout(wait)
            page.screenshot(path=str(Path(OUT) / f"{name}_{view}.png"))
        perf = page.evaluate("window._space4.perf()"); gl = page.evaluate("window._space4.gl")
        if STANDALONE:
            page.evaluate("document.getElementById('toggle').click()"); page.wait_for_timeout(1500)
            n = page.evaluate("document.querySelectorAll('#stage canvas').length")
            print(view, "restart ok:", n == 2, f"(canvases={n})")
        real = [e for e in errors if "font" not in e.lower() and "cors" not in e.lower() and "ERR_CONNECTION" not in e]
        print(view, "non-font errors:", real if real else "NONE")
        print(view, "perf:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in perf.items()}, "| gl:", gl["quality"], "lost" if gl["lost"] else "ok")
        page.context.close()
    browser.close()
