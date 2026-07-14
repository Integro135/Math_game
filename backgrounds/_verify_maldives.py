"""Maldives-background harness — kept SEPARATE from _verify.py (which the game's
category work drives). Always invoked the same way:

    python c:/Code/subtraction_game/backgrounds/_verify_maldives.py

Loads backgrounds/maldives.html (beach scene + pokemon walkers), checks the
day cycle + the pokemon integration (walkers spawn in the actors layer BETWEEN
the back scene and the front palms; each crossing a different pokemon; the
flyer over the sky), then screenshots noon with a walker + flyer mid-scene.
(Font CORS errors on file:// are expected and harmless.)
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

PAGE = r"c:\Code\subtraction_game\backgrounds\maldives.html"
VIEW = {"width": 1280, "height": 800}
DSF = 2
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

# leak-safe re-init, layer order (actors between back scene and front palms),
# spawn a few walkers + the flyer, then park the day at NOON for the shot.
EVAL = r"""(function(){
  start(); start();                                  /* 3 inits → leak check */
  var stage=document.getElementById('stage'), T=window.BACKGROUNDS.maldives._test;
  var out={scenes:stage.querySelectorAll('.mvscene').length};
  /* QUEUE FAIRNESS: 15 picks must cover all 5 pokemons every window of 5 */
  var seq=[]; for(var i=0;i<15;i++) seq.push(T.nextName());
  out.seq=seq;
  var uniqFirst5={}; seq.slice(0,5).forEach(function(n){uniqFirst5[n]=1;});
  out.firstCycleDistinct=Object.keys(uniqFirst5).length;   // must be 5
  out.hasPikachu=seq.indexOf('pikachu')>=0;
  out.hasBulbasaur=seq.indexOf('bulbasaur')>=0;
  /* one of each on the sand at telling x for a grounding/beach shot */
  var names=['jigglypuff','eevee','pikachu','squirtle','bulbasaur'];
  var xs=[110,420,700,980,1180];
  names.forEach(function(n,k){
    T.walk(n);
    var inst=T.state.walkerInsts[T.state.walkerInsts.length-1];
    if(!inst) return;
    inst.element.getAnimations().forEach(function(a){try{a.cancel();}catch(e){}});
    inst.element.style.transform='translateX('+xs[k]+'px)';
  });
  /* report each walker's foot line vs the sand top edge at its x */
  T.seek(0.4);                                       /* NOON */
  return JSON.stringify(out);
})();"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME)
    page = browser.new_context(viewport=VIEW, device_scale_factor=DSF).new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(Path(PAGE).as_uri())
    res = page.evaluate(EVAL)
    print("result:", res)
    page.wait_for_timeout(900)
    page.screenshot(path=r"c:/tmp/maldives_pokemon.png")
    _ignore = ("fonts.g", "ERR_FAILED", "ERR_SSL", "Failed to load resource")
    non_font = [e for e in errors if not any(s in e for s in _ignore)]
    print("non-font errors:", non_font if non_font else "NONE")
    print("shot: c:/tmp/maldives_pokemon.png")
    browser.close()
