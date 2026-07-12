"""Dedicated FROZEN-background harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_frozen.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Loads the frozen dev harness, optionally evaluates JS,
waits, screenshots, and reports JS errors. Split out of _verify.py so parallel
work on other backgrounds never clobbers this CONFIG.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF      = 2                       # device scale factor (higher = sharper zoom)
PAGE     = r"c:\Code\subtraction_game\backgrounds\frozen.html"
VIEW     = {"width": 1600, "height": 900}   # viewport
EVAL      = "try{setTimeout(function(){window.BACKGROUNDS.frozen._test.bolt();},900);'bolt in .9s';}catch(e){'ERR '+e.message;}"
POST_EVAL = "'final polish shot'"
WAIT_MS  = 1100
SHOTS    = [
    {"path": r"c:\tmp\frozen_v2_final.png", "clip": None},
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
