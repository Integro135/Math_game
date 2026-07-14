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
THEME    = "galaxy"                # dark space backdrop — the spec's primary case
DSF      = 2                       # device scale factor (higher = sharper zoom)
HIDE_UI  = False
STANDALONE = ""                    # "" → drive the real game (index.html)
VIEW     = {"width": 1280, "height": 800}   # viewport
# THREE NEW SUCCESS SCREENS (ferris-wheel / moon-swing / star-train — standard
# dark-backdrop batch): confirm they registered, exercise each show()+cleanup()
# (cleanup must leave the root EMPTY), then leave all three running side by
# side (super variant) for one mid-animation screenshot.
EVAL = r"""(function(){
  var NEW=['ferris-wheel','moon-swing','star-train'];
  var names=(window.SUCCESS&&SUCCESS.styles||[]).map(function(s){return s.name;});
  var out={total:names.length,
    registered:NEW.map(function(n){return n+':'+(names.indexOf(n)>=0);})};
  var pal={primary:'#C77DFF',accent:'#FFD27D',glow:'#7DC4FF',text:'#FFFFFF'};
  // cleanup test: show → immediately cleanup → root must be empty
  out.cleanupOk=NEW.map(function(n){
    var st=SUCCESS.styles.filter(function(s){return s.name===n;})[0];
    if(!st)return n+':missing';
    var r=document.createElement('div');
    r.style.cssText='position:fixed;inset:0;z-index:60;pointer-events:none';
    document.body.appendChild(r);
    var c=st.show({root:r,isSuper:true,durationMs:4500,points:20,palette:pal,praise:'כָּל הַכָּבוֹד!'});
    c();
    var empty=r.childElementCount===0;
    r.remove();
    return n+':'+(empty?'clean':'LEFTOVER('+r.childElementCount+')');
  });
  // now run all three side by side for the screenshot (thirds of the screen)
  window.__cleanups=[];
  NEW.forEach(function(n,i){
    var st=SUCCESS.styles.filter(function(s){return s.name===n;})[0];
    var r=document.createElement('div');
    r.className='__suc_probe';
    r.style.cssText='position:fixed;top:0;bottom:0;left:'+(i*33.3)+'%;width:33.3%;z-index:60;pointer-events:none;overflow:hidden';
    document.body.appendChild(r);
    window.__cleanups.push({c:st.show({root:r,isSuper:true,durationMs:4500,points:20,palette:pal,praise:'כָּל הַכָּבוֹד!'}),r:r});
  });
  return JSON.stringify(out);
})();"""
POST_EVAL = r"""(function(){
  // NON-destructive (the screenshot is taken AFTER this): each probe should be
  // mid-animation with a canvas + the praise text mounted
  var probes=Array.prototype.slice.call(document.querySelectorAll('.__suc_probe'));
  return JSON.stringify({probes:probes.length,
    canvases:probes.map(function(p){return p.querySelectorAll('canvas').length;}),
    texts:probes.map(function(p){return p.querySelectorAll('div').length;})});
})();"""
CLICKS   = []
WAIT_MS   = 2600   # mid-animation for the super variants (4500ms) → screenshot
SHOTS    = [
    {"path": r"c:\tmp\success_new3.png", "clip": None},
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
