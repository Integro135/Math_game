"""Single reusable background harness — ALWAYS invoked the same way so no new
approval prompts pop up:

    python c:/Code/subtraction_game/backgrounds/_verify.py

To capture something different, EDIT the CONFIG block below (the command line
stays identical). It loads index.html, switches theme, optionally evaluates a JS
snippet and/or dispatches real clicks, waits, screenshots, and reports JS errors.
(Font CORS errors on file:// are expected and harmless.)
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

# ── CONFIG (edit these; never change the command line) ──────────────────────
THEME    = "maldives"              # the beach theme that hosts the Pokémon walkers
DSF      = 2                       # device scale factor (higher = sharper zoom)
HIDE_UI  = False
STANDALONE = ""                    # "" → drive the real game (index.html)
VIEW     = {"width": 1280, "height": 800}   # viewport
# END-SCREEN "play again" contrast: on the maldives (Pokémon) theme the end card
# is near-transparent, so the old ghost-bubble .b-rpl vanished over the bright
# lagoon/sand + walkers. Force the end screen (non-zero mode → "שַׂחֲקִי שׁוּב"), then
# confirm the button now paints a SOLID gradient fill + dark text and shoot it.
EVAL = r""""""
POST_EVAL = r"""(function(){
  // Inject the EXACT "play again" end-screen markup (the mode≠0 branch of
  // endGame()) so the maldives .b-rpl rule paints against the real beach bg.
  var card=document.getElementById('card');
  card.innerHTML='<div class="end-scr"><div class="end-uni">🦄</div>'
    +'<div class="end-ttl">🎊 סִיַּמְתְּ! 🎊</div>'
    +'<div class="end-grade-num">870</div>'
    +'<div class="end-grade-max">מִתּוֹךְ 1000</div>'
    +'<div class="end-grade-msg">כָּל הַכָּבוֹד! ⭐</div>'
    +'<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:4px">'
    +'<button class="btn b-rpl">שַׂחֲקִי שׁוּב 🔄</button>'
    +'<button class="btn b-rep">📊 סִיכּוּם</button></div></div>';
  var b=card.querySelector('.b-rpl');
  var cs=getComputedStyle(b), r=b.getBoundingClientRect();
  return JSON.stringify({
    hasGradientFill: cs.backgroundImage.indexOf('gradient')>=0,   // solid, not a bare translucent color
    color: cs.color,
    borderTopWidth: cs.borderTopWidth,
    boxShadowLen: cs.boxShadow.length,
    w: Math.round(r.width), h: Math.round(r.height),
    onScreen: r.width>0 && r.height>0
  });
})();"""
CLICKS   = []
WAIT_MS   = 1200   # let the maldives bg settle before forcing the end screen
SHOTS    = [
    {"path": r"c:\tmp\maldives_playagain.png", "clip": {"x": 280, "y": 110, "width": 720, "height": 620}},
]
# ────────────────────────────────────────────────────────────────────────────

GAME_URL   = Path(r"c:\Code\subtraction_game\index.html").as_uri()
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    page = browser.new_context(viewport=VIEW, device_scale_factor=DSF).new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    if STANDALONE:
        page.goto(STANDALONE if STANDALONE.startswith("http") else Path(STANDALONE).as_uri())
        eval_result = page.evaluate(EVAL) if EVAL else None
        page.wait_for_timeout(WAIT_MS)
        post_result = page.evaluate(POST_EVAL) if POST_EVAL else None
        for s in SHOTS:
            page.screenshot(path=s["path"], clip=s["clip"])
        _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
        non_font = [e for e in errors if not any(s in e for s in _ignore)]
        print("non-font errors:", non_font if non_font else "NONE")
        if EVAL: print("eval result:", eval_result)
        if POST_EVAL: print("post-eval result:", post_result)
        print("shots:", [s["path"] for s in SHOTS])
        browser.close()
        raise SystemExit
    page.add_init_script("localStorage.setItem('introSplash','0')")
    page.goto(GAME_URL)
    page.wait_for_selector("#ans, #ans1", timeout=30_000)

    page.evaluate(f"pickTheme('{THEME}')")
    page.wait_for_function(
        "window.BACKGROUNDS && Object.keys(window.BACKGROUNDS).length > 0", timeout=20_000)
    page.wait_for_timeout(1500)
    if HIDE_UI:
        page.evaluate("var w=document.querySelector('.wrap'); if(w) w.style.display='none'")
    eval_result = None
    if EVAL:
        eval_result = page.evaluate(EVAL)
    for fx, fy in CLICKS:
        page.evaluate(
            "([fx,fy])=>{const x=innerWidth*fx,y=innerHeight*fy;"
            "const el=document.elementFromPoint(x,y)||document.body;"
            "el.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y}));}",
            [fx, fy])
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
