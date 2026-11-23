"""Success-screen contact-sheet harness — renders ONE success screen frame by
frame on a FAKE clock (deterministic: Playwright clock drives rAF/performance.now)
and packs the frames into contact sheets you can look at.

    python c:/Code/subtraction_game/success_screens/_shot.py <name> [--phone|--portrait] [--at MS] [--super]

  <name>       the screen's name, e.g. seahorse-ride  (file success_screens/success-<name>.js)
  --phone      390x844 portrait (default: 1024x768 tablet landscape — the real device)
  --portrait   768x1024 tablet portrait
  --at MS      ALSO save one full-size frame at MS (normal run; with --super the super run)

Writes  c:/tmp/ss_<name>[_phone|_portrait]_normal.png  (6 frames, 2700 ms run)
        c:/tmp/ss_<name>[_phone|_portrait]_super.png   (8 frames, 4500 ms run)
        c:/tmp/ss_<name>[...]_at<MS>.png               (with --at)
and prints: JS errors, the cleanup check (root must be EMPTY after a mid-run
skip, no rAF/timeout scheduled after it), and a rough real-time fps of the super run.
The host's near-black, skin-tinted backdrop is reproduced behind the screen.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

args = sys.argv[1:]
if not args:
    raise SystemExit(__doc__)
NAME = args[0]
PHONE, PORTRAIT, SUPER_AT = "--phone" in args, "--portrait" in args, "--super" in args
AT = int(args[args.index("--at") + 1]) if "--at" in args else None
VIEW = {"width": 390, "height": 844} if PHONE else {"width": 768, "height": 1024} if PORTRAIT else {"width": 1024, "height": 768}
TAG = "_phone" if PHONE else "_portrait" if PORTRAIT else ""

HERE = Path(__file__).resolve().parent
SRC = HERE / f"success-{NAME}.js"
if not SRC.exists():
    raise SystemExit(f"no such screen file: {SRC}")
OUT = Path(r"c:\tmp"); OUT.mkdir(exist_ok=True)
HOST = OUT / f"ss_host_{NAME}.html"
HOST.write_text(f"""<!DOCTYPE html><html lang="he"><head><meta charset="UTF-8">
<style>
html,body{{margin:0;height:100%;overflow:hidden;font-family:'Fredoka One','Nunito','Segoe UI',sans-serif;
  background:radial-gradient(circle at 80% 30%,#2a1147,#0a0420 60%,#05020f)}}
.card{{position:fixed;inset:16% 20%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:24px}}
</style></head><body><div class="card"></div>
<script src="{SRC.as_uri()}"></script>
<script>
window.__run=function(isSuper){{
  if(window.__c){{try{{window.__c();}}catch(e){{}}window.__root.remove();}}
  var root=document.createElement('div');
  root.style.cssText='position:fixed;inset:0;z-index:996;pointer-events:none';
  var bd=document.createElement('div');   // the host's skin-tinted near-black cover
  bd.style.cssText='position:absolute;inset:0;background:radial-gradient(circle at 50% 38%,rgb(38,22,58) 0%,rgb(16,10,30) 55%,#04020a 100%)';
  root.appendChild(bd);document.body.appendChild(root);
  var st=window.SUCCESS.styles.find(function(s){{return s.name==='{NAME}';}});
  window.__root=root;
  window.__c=st.show({{root:root,isSuper:isSuper,durationMs:isSuper?4500:2700,points:15,
    palette:{{primary:'#C77DFF',accent:'#FFD27D',glow:'#7DC4FF',text:'#FFFFFF'}},praise:'כָּל הַכָּבוֹד!'}});
  return !!st;
}};
</script></body></html>""", encoding="utf-8")

NORMAL_T = [250, 650, 1100, 1550, 2050, 2550]
SUPER_T = [300, 800, 1350, 1900, 2500, 3100, 3700, 4350]


def sheet(frames, cols, path):
    w, h = VIEW["width"], VIEW["height"]
    sc = 0.5 if not PHONE else 0.6
    tw, th = int(w * sc), int(h * sc)
    rows = (len(frames) + cols - 1) // cols
    img = Image.new("RGB", (cols * tw + (cols - 1) * 6, rows * th + (rows - 1) * 6), (60, 60, 60))
    for i, (t, png) in enumerate(frames):
        fr = Image.open(png).convert("RGB").resize((tw, th), Image.LANCZOS)
        d = ImageDraw.Draw(fr)
        d.rectangle([0, 0, 74, 22], fill=(0, 0, 0))
        d.text((5, 4), f"{t} ms", fill=(255, 255, 0))
        img.paste(fr, ((i % cols) * (tw + 6), (i // cols) * (th + 6)))
    img.save(path)


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    errors = []

    def new_page(fake_clock):
        page = browser.new_context(viewport=VIEW, device_scale_factor=1).new_page()
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        if fake_clock:
            page.clock.install()
        page.goto(HOST.as_uri())
        page.wait_for_function(f"window.SUCCESS && SUCCESS.styles.some(s=>s.name==='{NAME}')", timeout=10000)
        if fake_clock:   # stop the clock: from here on time moves ONLY by run_for (screenshots take real time)
            page.clock.pause_at(page.evaluate("Date.now()") + 50)
        return page

    # ── deterministic frames on the fake clock ──
    for is_super, times, cols in ((False, NORMAL_T, 3), (True, SUPER_T, 4)):
        page = new_page(True)
        page.evaluate(f"__run({'true' if is_super else 'false'})")
        frames, now = [], 0
        at_done = False
        for t in times:
            if AT is not None and (SUPER_AT == is_super) and not at_done and AT <= t:
                page.clock.run_for(AT - now); now = AT
                p = OUT / f"ss_{NAME}{TAG}_at{AT}.png"; page.screenshot(path=str(p)); at_done = True
            page.clock.run_for(t - now); now = t
            p = OUT / f"_ssf_{NAME}{TAG}_{int(is_super)}_{t}.png"
            page.screenshot(path=str(p)); frames.append((t, p))
        sheet(frames, cols, OUT / f"ss_{NAME}{TAG}_{'super' if is_super else 'normal'}.png")
        for _, p in frames:
            p.unlink(missing_ok=True)
        page.context.close()

    # ── skip mid-run: root must be empty, nothing scheduled afterwards ──
    page = new_page(False)
    res = page.evaluate("""async () => {
        const out = {};
        for (const isSuper of [false, true]) {
            __run(isSuper);
            await new Promise(r => setTimeout(r, 700));
            const root = __root, built = root.children.length - 1;   // minus the backdrop
            const bd = root.firstChild;
            let calls = 0;
            const oR = window.requestAnimationFrame, oT = window.setTimeout, oI = window.setInterval;
            window.requestAnimationFrame = f => { calls++; return oR(f); };
            window.setTimeout = (f, d) => { calls++; return oT(f, d); };
            window.setInterval = (f, d) => { calls++; return oI(f, d); };
            __c(); window.__c = null;
            await new Promise(r => oT(r, 250));
            window.requestAnimationFrame = oR; window.setTimeout = oT; window.setInterval = oI;
            const left = [...root.children].filter(n => n !== bd).length;
            const styles = document.querySelectorAll('style').length;
            out[isSuper ? 'super' : 'normal'] = {built, left, scheduledAfter: calls, styleTags: styles};
            root.remove();
        }
        return out;
    }""")
    # ── rough real-time fps of the super run ──
    fps = page.evaluate("""async () => {
        __run(true); let n = 0, t0 = performance.now(), stop = false;
        (function f(){ if (stop) return; n++; requestAnimationFrame(f); })();
        await new Promise(r => setTimeout(r, 2000));
        stop = true; const fps = n * 1000 / (performance.now() - t0);
        __c(); window.__c = null; __root.remove(); return Math.round(fps);
    }""")
    browser.close()

_ignore = ("fonts.g", "ERR_FAILED", "Failed to load resource")
errs = [e for e in errors if not any(s in e for s in _ignore)]
print("JS errors:", errs if errs else "NONE")
print("cleanup:", res, "-> OK" if all(v["left"] == 0 and v["scheduledAfter"] == 0 for v in res.values()) else "-> PROBLEM")
print("super-run fps (headless, rough):", fps)
print("sheets:", OUT / f"ss_{NAME}{TAG}_normal.png", OUT / f"ss_{NAME}{TAG}_super.png",
      (OUT / f"ss_{NAME}{TAG}_at{AT}.png") if AT is not None else "")
