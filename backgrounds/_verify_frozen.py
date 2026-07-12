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
# Exercise the ROYAL SISTERS port: leak-safe re-init, spawn the pair, confirm
# the per-figure defs are suffixed, and that ALL idle animations are attached
# to the sprite (so they travel during the crossing). Returns a diagnostic obj.
# Diagnostic: leak-safe re-init + GROUNDING (all sprites share Olaf's ~31.5px
# foot line), Olaf starts OFF-STAGE (not a static fixture), igloo relocated
# up-left onto its hill. Poses everyone mid-scene for the comparison shot.
EVAL = r"""(function(){
  var F=window.BACKGROUNDS.frozen;
  start();start();                                   /* 3 inits → leak check */
  var T=F._test, stage=document.getElementById('stage');
  var sr=stage.getBoundingClientRect();
  function fromBot(el){ if(!el) return 'MISS'; var r=el.getBoundingClientRect(); return +(sr.bottom-r.bottom).toFixed(1); }
  var out={leak:{scenes:stage.querySelectorAll('.fzscene').length,
                 olafs:stage.querySelectorAll('.fz-olaf').length}};
  /* (2) Olaf STARTS fully off-stage */
  var ow=stage.querySelector('.fz-olaf').getBoundingClientRect();
  out.olafInitOffscreen=(ow.right<=sr.left||ow.left>=sr.right);
  var feet=stage.querySelectorAll('.fz-olaf .foot'), of=999;
  for(var i=0;i<feet.length;i++){var r=feet[i].getBoundingClientRect(); of=Math.min(of, sr.bottom-r.bottom);}
  out.olafFootFromBot=+of.toFixed(1);
  /* (1) seal belly rests on the ice */
  var se=T.sealIn();
  if(se){se.animation&&(se.animation.currentTime=se.animation.effect.getTiming().duration*0.45);
    out.sealBodyFromBot=fromBot(se.element.querySelector('ellipse'));}
  /* (4) royals' shoe tips on Olaf's line */
  T.royals();
  T.state.royals.forEach(function(r){ if(r.animation){r.animation.currentTime=r.animation.effect.getTiming().duration*0.45;} });
  var rs=stage.querySelectorAll('.prw'); out.royals=[];
  for(var k=0;k<rs.length;k++){out.royals.push({kind:T.state.royals[k]?T.state.royals[k].kind:'?',
    footFromBot:fromBot(rs[k].querySelector('.pr-footL'))});}
  /* (3) igloo up-left on its hill */
  var ig=document.querySelector('#fzIgloo');
  if(ig){var ir=ig.getBoundingClientRect();
    out.iglooCentreXpct=+(((ir.left+ir.right)/2-sr.left)/sr.width*100).toFixed(1);
    out.iglooBaseFromBot=+(sr.bottom-ir.bottom).toFixed(1);}
  /* pose Olaf mid-walk for the comparison shot */
  T.stroll();
  if(T.state.olaf.walkAnim){T.state.olaf.walkAnim.currentTime=T.state.olaf.walkAnim.effect.getTiming().duration*0.5;}
  return JSON.stringify(out,null,1);
})();"""
POST_EVAL = ""
WAIT_MS  = 500
SHOTS    = [
    {"path": r"c:\tmp\frozen_ground_all.png", "clip": None},
    {"path": r"c:\tmp\frozen_igloo_hill.png", "clip": {"x": 250, "y": 550, "width": 700, "height": 350}},
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
