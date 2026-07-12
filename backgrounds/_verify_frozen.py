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
# Diagnostic: leak-safe re-init + the POLAR-BEAR FAMILY (mother+cubs) crossing,
# grounded on Olaf's ~31.5px foot line, .pb-walk gait attached; plus the royals
# & Olaf for a grounding comparison. Poses everyone mid-scene for the shot.
EVAL = r"""(function(){
  var F=window.BACKGROUNDS.frozen;
  start();start();                                   /* 3 inits → leak check */
  var T=F._test, stage=document.getElementById('stage');
  var sr=stage.getBoundingClientRect();
  function fromBot(el){ if(!el) return 'MISS'; var r=el.getBoundingClientRect(); return +(sr.bottom-r.bottom).toFixed(1); }
  var out={leak:{scenes:stage.querySelectorAll('.fzscene').length,
                 olafs:stage.querySelectorAll('.fz-olaf').length,
                 pbwIdle:stage.querySelectorAll('.pbw').length}};
  var feet=stage.querySelectorAll('.fz-olaf .foot'), of=999;
  for(var i=0;i<feet.length;i++){var r=feet[i].getBoundingClientRect(); of=Math.min(of, sr.bottom-r.bottom);}
  out.olafFootFromBot=+of.toFixed(1);
  /* POLAR BEARS — spawn the family, pause mid-scene, measure paw line */
  T.bears();
  T.state.bears.forEach(function(b){ if(b.animation){b.animation.currentTime=b.animation.effect.getTiming().duration*0.42;} });
  var bw=stage.querySelectorAll('.pbw'); out.bears=[];
  for(var k=0;k<bw.length;k++){
    out.bears.push({cub:T.state.bears[k]?T.state.bears[k].cub:'?',
      walkGait:bw[k].classList.contains('pb-walk'),
      pawFromBot:fromBot(bw[k].querySelector('.pb-legNF')),
      legAnims:(function(){var e=bw[k].querySelector('.pb-legNF');return e&&e.getAnimations?e.getAnimations().length:0;})()});
  }
  /* suffix check — first bear's defs id must carry _b<n> */
  var g0=bw[0]&&bw[0].querySelector('linearGradient');
  out.bearSuffixed=!!g0 && /_b\d+$/.test(g0.id);
  /* click-shake fires without throwing + drops snow-dust */
  T.bearShake();
  out.dustPuffs=stage.querySelectorAll('.pb-dust').length;
  /* royals for a grounding comparison */
  T.royals();
  T.state.royals.forEach(function(r){ if(r.animation){r.animation.currentTime=r.animation.effect.getTiming().duration*0.55;} });
  /* pose Olaf mid-walk too */
  T.stroll();
  if(T.state.olaf.walkAnim){T.state.olaf.walkAnim.currentTime=T.state.olaf.walkAnim.effect.getTiming().duration*0.5;}
  return JSON.stringify(out,null,1);
})();"""
POST_EVAL = ""
WAIT_MS  = 500
SHOTS    = [
    {"path": r"c:\tmp\frozen_bears.png", "clip": None},
    {"path": r"c:\tmp\frozen_bears_crop.png", "clip": {"x": 150, "y": 480, "width": 1000, "height": 420}},
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
