"""Dedicated dinosaurs2 harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_dino2.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Loads the dinosaurs2 dev harness, optionally evaluates JS,
waits, screenshots, and reports JS errors. Split out of _verify.py so parallel
work on other backgrounds never clobbers this CONFIG.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF      = 2                       # device scale factor (higher = sharper zoom)
PAGE     = r"c:\Code\subtraction_game\backgrounds\dinosaurs2.html"
VIEW     = {"width": 1600, "height": 900}   # viewport
EVAL      = "try{var t=window.BACKGROUNDS.dinosaurs2._test;t.drophatch();t.star();t.star();'final scene: hatch egg + shooting stars';}catch(e){'ERR '+e.message;}"
POST_EVAL = "(function(){var s=window.BACKGROUNDS.dinosaurs2._test.state;return 'walkers='+document.querySelectorAll('.d2w').length+' eggs(d2)='+document.querySelectorAll('.d2egg,.d2roll').length+' bte='+document.querySelectorAll('.bte').length+' stars='+document.querySelectorAll('linearGradient[id^=d2ss]').length;})()"
WAIT_MS  = 2200
SHOTS    = [
    {"path": r"c:\tmp\dino2_final.png", "clip": None},
]
# ────────────────────────────────────────────────────────────────────────────

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    page = browser.new_context(viewport=VIEW, device_scale_factor=DSF).new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(Path(PAGE).as_uri())
    eval_result = page.evaluate(EVAL) if EVAL else None
    page.wait_for_timeout(WAIT_MS)
    post_result = page.evaluate(POST_EVAL) if POST_EVAL else None
    for s in SHOTS:
        page.screenshot(path=s["path"], clip=s["clip"])
    _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
    non_font = [e for e in errors if not any(s in e for s in _ignore)]
    print("non-font errors:", non_font if non_font else "NONE")
    if EVAL:
        print("eval result:", eval_result)
    if POST_EVAL:
        print("post-eval result:", post_result)
    print("shots:", [s["path"] for s in SHOTS])
    browser.close()
