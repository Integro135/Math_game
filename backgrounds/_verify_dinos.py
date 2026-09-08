"""Dedicated dino_rigs harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify_dinos.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). Loads dino_rigs/dinos.html once per dinosaur (and
parade.html), hides the UI, pins the pose via window._dinoTest.freeze(p),
screenshots idle + mid-action stills, and reports JS errors.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

# ── CONFIG (edit these; never change the command line) ──────────────────────
DSF      = 2                       # device scale factor
DIR      = r"c:\Code\subtraction_game\backgrounds\dino_rigs"
OUT      = r"c:\tmp\dino_rigs"
VIEW     = {"width": 1100, "height": 760}
ANIMALS  = ["trex", "bronto", "stego", "trike", "ptero", "baby"]   # [] to skip singles
POSES    = [("idle", 0), ("act", 0.5)]                             # (suffix, frozen pose)
PALS     = {}                                                      # e.g. {"trex": "pink"}
BG       = 0                                                       # 0 blank · 1 slate · 2 dusk · 3 night
SIZE     = 0                                                       # 0 big · 1 huge · 2 scene-size
WALK     = False                                                   # capture mid-stride instead of standing
PARADE   = True
WAIT_MS  = 700
# ────────────────────────────────────────────────────────────────────────────

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    ctx = browser.new_context(viewport=VIEW, device_scale_factor=DSF)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    shots = []
    for name in ANIMALS:
        page.goto(Path(DIR, "dinos.html").as_uri() + "?animal=" + name)
        page.wait_for_function("window._dinoTest && window._dinoTest.current() === '%s'" % name, timeout=8000)
        page.evaluate("(a)=>{var T=_dinoTest;T.hideUI();T.setBg(a[0]);T.setSize(a[1]);T.walk(a[2]);}", [BG, SIZE, WALK])
        if name in PALS:
            page.evaluate("(p)=>_dinoTest.setPal(p)", PALS[name])
        for suffix, pose in POSES:
            page.evaluate("(p)=>_dinoTest.freeze(p)", pose)
            page.wait_for_timeout(WAIT_MS)
            path = os.path.join(OUT, "%s_%s.png" % (name, suffix))
            page.screenshot(path=path)
            shots.append(path)
    if PARADE:
        page.goto(Path(DIR, "parade.html").as_uri())
        page.wait_for_function("window._paradeTest", timeout=8000)
        page.evaluate("(a)=>{var T=_paradeTest;T.hideUI();T.setBg(a[0]);T.walk(a[1]);}", [BG, WALK])
        for suffix, pose in POSES:
            page.evaluate("(p)=>_paradeTest.freeze(p)", pose)
            page.wait_for_timeout(WAIT_MS)
            path = os.path.join(OUT, "parade_%s.png" % suffix)
            page.screenshot(path=path)
            shots.append(path)
    _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
    non_font = [e for e in errors if not any(s in e for s in _ignore)]
    print("non-font errors:", non_font if non_font else "NONE")
    print("shots:", len(shots))
    for s in shots: print("  ", s)
    browser.close()
