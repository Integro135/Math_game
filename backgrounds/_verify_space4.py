"""Stills of the space4 scene (full frames, close-ups round the starship or the black hole,
contact sheets) + a JS-error report.

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
VIEWS      = {"desk": (1024, 768), "phone": (390, 844)}
STANDALONE = "space4.html"       # "" → in-game mode
OUT        = "c:/tmp/space4/shots"
# [name, hooks to fire, ms to wait before the still, (optional) a JS condition to wait for first]
#   a hook starting "js:" is raw JS, any other is called on window._space4
#   a name starting "zoom" is a close-up crop round the starship · "hole" is one round the black hole
SHOTS = [
    ["s00", [], 0, "_space4.ship().ready"],
    ["sp_scene", [], 3000],
    ["zoom_landed", ["shipVisit(false)"], 0, "_space4.ship().state==='landed'"],
    ["sp_landed", [], 100],
]
SHEET      = False               # True: pack every full still of a view into sheet_<view>.png
DSF        = 1                   # device scale factor (2 for sharp close-ups)
# ────────────────────────────────────────────────────────────────────────────
BG_DIR = Path("c:/Code/subtraction_game/backgrounds")
GAME_URL   = Path("c:/Code/subtraction_game/index.html").as_uri()
CHROME_EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe"
Path(OUT).mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    for view, (w, h) in VIEWS.items():
        page = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=DSF).new_page()
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
        for name, hooks, wait, *cond in SHOTS:
            for hk in hooks: page.evaluate(hk[3:] if hk.startswith("js:") else f"window._space4.{hk}")
            if cond: page.wait_for_function(cond[0], timeout=60000)
            page.wait_for_timeout(wait)
            if name.startswith("hole"):
                bh = page.evaluate("window._space4.bh")
                cw, chh = 400, 330
                page.screenshot(path=str(Path(OUT) / f"{name}_{view}.png"), clip={"x": max(0, min(w - cw, bh["x"] - cw * .68)), "y": max(0, min(h - chh, bh["y"] - chh / 2)), "width": cw, "height": chh})
                print(name, page.evaluate("JSON.stringify({eaten:_space4.eaten(),near:_space4.particles().list.filter(q=>q.d<1.6).map(q=>+q.d.toFixed(2))})"))
            elif name.startswith("zoom"):
                sh = page.evaluate("window._space4.ship()")
                cx = max(0, min(w - 360, sh["x"] - 180)); cy = max(0, min(h - 240, sh["y"] - 120))
                page.screenshot(path=str(Path(OUT) / f"{name}_{view}.png"), clip={"x": cx, "y": cy, "width": 360, "height": 240})
                print(name, sh["state"], "landedOn", sh["landedOn"])
            else:
                page.screenshot(path=str(Path(OUT) / f"{name}_{view}.png"))
                sh = page.evaluate("window._space4.ship()")
                print(name, sh["state"], round(sh["x"]), round(sh["y"]), "stop", sh["stop"], "/", sh["stops"], "landedOn", sh["landedOn"], "minHole", round(sh["minHole"], 2), "| saturn", {k: round(v, 1) if isinstance(v, float) else v for k, v in page.evaluate("window._space4.bodies().saturn").items()}, page.evaluate("window._space4.movers.saturn.state"))
        if SHEET:
            from PIL import Image, ImageDraw
            ims = [(n, Image.open(Path(OUT) / f"{n}_{view}.png").convert("RGB")) for n, *_ in SHOTS if not n.startswith("zoom")]
            tw, th = w // 2, h // 2; cols = 3; rows = (len(ims) + cols - 1) // cols
            sheet = Image.new("RGB", (cols * tw + (cols - 1) * 4, rows * th + (rows - 1) * 4), (60, 60, 60))
            for i, (n, im) in enumerate(ims):
                im = im.resize((tw, th)); ImageDraw.Draw(im).text((6, 4), n, fill=(255, 255, 0))
                sheet.paste(im, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
            sheet.save(Path(OUT) / f"sheet_{view}.png")
        perf = page.evaluate("window._space4.perf()"); gl = page.evaluate("window._space4.gl")
        if STANDALONE:
            page.evaluate("document.getElementById('toggle').click()"); page.wait_for_timeout(1500)
            n = page.evaluate("document.querySelectorAll('#stage canvas').length")
            print(view, "restart ok:", n == 3, f"(canvases={n})")
        real = [e for e in errors if "font" not in e.lower() and "cors" not in e.lower() and "ERR_CONNECTION" not in e]
        print(view, "non-font errors:", real if real else "NONE")
        print(view, "perf:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in perf.items()}, "| gl:", gl["quality"], "lost" if gl["lost"] else "ok")
        page.context.close()
    browser.close()
