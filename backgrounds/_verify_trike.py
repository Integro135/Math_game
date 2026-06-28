"""Dedicated triceratops render harness (separate from _verify.py, which a
parallel session is using for the volcano). Same invocation each time:

    python c:/Code/subtraction_game/backgrounds/_verify_trike.py

Renders tritsratop.html a few ways (full, head zoom, head zoom flipped) so the
face/leg edits can be checked against the user's marked-up reference.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

URL    = Path(r"c:\Code\subtraction_game\backgrounds\dinasours\tritsratop.html").as_uri()
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

ZOOM = ("(()=>{var s=document.querySelector('.trike-svg');"
        "s.setAttribute('viewBox','555 110 260 210');s.style.animation='none';})()")
ZOOM_FLIP = ("(()=>{var s=document.querySelector('.trike-svg');"
             "s.setAttribute('viewBox','555 110 260 210');s.style.animation='none';"
             "s.style.transform='scaleX(-1)';s.style.transformOrigin='center';})()")

DEMO = Path(r"c:\Code\subtraction_game\backgrounds\dinasours\tricera-demo.html").as_uri()

STEPS = [
    (DEMO, {"width": 960, "height": 540}, "", 3000, r"c:\tmp\trike_demo.png"),
]

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, executable_path=CHROME)
    for url, vp, ev, wait, shot in STEPS:
        pg = b.new_context(viewport=vp, device_scale_factor=2).new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(url)
        if ev:
            pg.evaluate(ev)
        pg.wait_for_timeout(wait)
        pg.screenshot(path=shot)
        non = [e for e in errs if "fonts.g" not in e and "Failed to load resource" not in e]
        if non:
            print(shot, "ERRORS:", non)
        pg.close()
    b.close()
print("done:", [s[-1] for s in STEPS])
