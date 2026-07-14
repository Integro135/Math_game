"""Bulbasaur-object harness — kept separate from _verify.py (which the
pikachu/eevee work drives) so neither clobbers the other. Always invoked:

    python c:/Code/subtraction_game/backgrounds/_verify_bulba.py

Now points at the pokedex workshop (where Bulbasaur was integrated). Measures
each walker's FOOT line + shadow line as % up from the stage bottom — if they
match, all three walk on one ground — then screenshots mid-walk.
(Font CORS errors on file:// are expected and harmless.)
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

STANDALONE = r"c:\Code\subtraction_game\backgrounds\pokemons\pokedex.html"
VIEW = {"width": 1200, "height": 800}
DSF = 2
WAIT_MS = 1200
SHOT = r"c:\tmp\pokedex_gooey.png"

# measure each creature's TIGHT on-screen bbox (skip full-canvas container elements
# ≥97% of the wrapper, and the shadow) → visible height/width in px, to normalize size
EVAL = r"""(function(){
  var list=window.__pk.list;
  /* stop the patrols (commits each x), then SPREAD everyone across the stage
     so their foot lines can be compared side by side; keep the gait running */
  try{document.getElementById('walk').click();}catch(e){}
  var H=innerHeight;
  list.forEach(function(p,i){ p.element.style.transform='translateX('+(70+i*180)+'px)'; });
  /* the TRUE visible foot per pokemon = lowest bottom among its actual FEET
     elements (not transparent containers, which the old metric caught) */
  var FEET={'pkw-bulb':'.bulbasaur .legs .leg,.bulbasaur .hind-legs .leg',
            'pkw-sq':'.leg','pkw-ev':'.leg .inner-leg','pkw-jg':'*'};
  return JSON.stringify(list.map(function(p){
    var el=p.element, wr=el.getBoundingClientRect();
    var cls=(el.className.split(/\s+/).filter(function(c){return c.indexOf('pkw-')===0;})[0])||'?';
    var sel=FEET[cls]||'*', maxB=-1e9, feet=el.querySelectorAll(sel);
    for(var i=0;i<feet.length;i++){var r=feet[i].getBoundingClientRect();
      if(r.height&&r.bottom>maxB)maxB=r.bottom;}
    return {cls:cls,
      wrapBottomPct:+(((H-wr.bottom)/H*100).toFixed(2)),
      footPct:+(((H-maxB)/H*100).toFixed(2)),               /* lowest FOOT element */
      footFrac:+(((maxB-wr.top)/wr.height).toFixed(3))};
  }));
})();"""

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME_EXE)
    page = browser.new_context(viewport=VIEW, device_scale_factor=DSF).new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(Path(STANDALONE).as_uri())
    # let rigs with start-up delays finish igniting (gooey's flame balls carry
    # 0.2-2.4s animation-delays and hide behind the core until then) BEFORE
    # EVAL pauses the scene for a stable screenshot
    page.wait_for_timeout(3600)
    zap = page.evaluate(EVAL)
    page.wait_for_timeout(WAIT_MS)
    page.screenshot(path=SHOT, clip=None)
    _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
    non_font = [e for e in errors if not any(s in e for s in _ignore)]
    print("non-font errors:", non_font if non_font else "NONE")
    print("zap:", zap)
    print("shot:", SHOT)
    browser.close()
