# -*- coding: utf-8 -*-
r"""
Regenerate unicorn.item.js's BASE_CSS from unicorn.html — the SINGLE SOURCE.

The background scenes (meadow.scene.js / unicorns.bg.js) mount the reusable rig
via window.Unicorn.place() from unicorn.item.js. That file's rig CSS is a scoped
extraction of the workshop unicorn.html; keeping it hand-synced drifted (walk/fly
gaits went stale as STUBS, the kawaii eye / colors / cutie marks lagged). This
script makes the extraction real: it reads unicorn.html's <style>, applies the
scoping transform, and rewrites ONLY the BASE_CSS template literal in
unicorn.item.js. MARKUP, EXTRA_CSS and the whole hand-written JS API are left
byte-for-byte untouched.

Run it whenever unicorn.html changes:
    python c:/code/subtraction_game/backgrounds/unicorns/_build_unicorn_item.py

Transform rules (see the workflow spec):
  - :root                         -> .uc-uni
  - every other selector          -> ".uc-uni " + selector   (scoped descendant)
  - #gait-walk:checked ~ label X  -> .uc-uni.uc-walk X        (state -> class)
    #gait-fly :checked ~ label X  -> .uc-uni.uc-fly X
    #wings    :checked ~ label X  -> .uc-uni.uc-wings X
    #color-C  :checked ~ label X  -> .uc-uni.uc-c-C X
  - @keyframes NAME               -> @keyframes uc-NAME  (+ remap animation refs)
  - rem                           -> em   (rig scales by one font-size)
  - DROPPED: html/body, .floor, .dust + particle-animation-* keyframes, input
    rules, .panel/.swatch chrome, #toggle slow-mo, .fly-fx sky layer, @media.
"""
import re, io, sys

HERE = r"c:\code\subtraction_game\backgrounds\unicorns"
SRC  = HERE + r"\unicorn.html"
ITEM = HERE + r"\unicorn.item.js"

html = io.open(SRC, encoding="utf-8").read()

m = re.search(r"<style[^>]*>(.*?)</style>", html, re.S)
if not m:
    sys.exit("no <style> found in unicorn.html")
css = m.group(1)
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)     # strip comments
css = re.sub(r"@charset[^;]*;", "", css)            # strip @charset


def blocks(s):
    """Split CSS into top-level (prelude, body) pairs, brace-depth aware."""
    out, i, n = [], 0, len(s)
    while i < n:
        while i < n and s[i].isspace():
            i += 1
        if i >= n:
            break
        start = i
        while i < n and s[i] not in "{;":
            i += 1
        if i >= n:
            break
        if s[i] == ";":                              # stray statement
            i += 1
            continue
        prelude = s[start:i].strip()
        depth, i = 1, i + 1
        bstart = i
        while i < n and depth:
            if s[i] == "{":
                depth += 1
            elif s[i] == "}":
                depth -= 1
            i += 1
        out.append((prelude, s[bstart:i - 1]))
    return out


# collect every @keyframes name so animation refs can be remapped safely
KF = set()
for prelude, _ in blocks(css):
    mm = re.match(r"@(?:-webkit-)?keyframes\s+([\w-]+)", prelude)
    if mm:
        KF.add(mm.group(1))


def rem2em(t):
    return re.sub(r"(\d*\.?\d+)rem\b", r"\1em", t)


def remap_anim(decls):
    """Prefix uc- on animation-name values and animation-shorthand kf tokens."""
    def name_list(v):
        return ", ".join((("uc-" + p.strip()) if p.strip() in KF else p.strip())
                         for p in v.split(","))
    decls = re.sub(r"(animation-name\s*:\s*)([^;}]+)",
                   lambda m: m.group(1) + name_list(m.group(2)), decls)

    def short(m):
        toks = re.split(r"(\s+|,)", m.group(2))
        toks = [("uc-" + t) if t in KF else t for t in toks]
        return m.group(1) + "".join(toks)
    decls = re.sub(r"(animation\s*:\s*)([^;}]+)", short, decls)
    return decls


STATE = {
    "gait-walk": ".uc-walk", "gait-fly": ".uc-fly", "gait-run": "",
    "wings": ".uc-wings",
    "color-pearl": ".uc-c-pearl", "color-pink": ".uc-c-pink",
    "color-sky": ".uc-c-sky", "color-mint": ".uc-c-mint",
    "color-night": ".uc-c-night",
}
# class/token drops are safe substrings (no kept selector contains them); the
# page ELEMENT selectors html/body are matched with a word boundary so the rig's
# `.body` CLASS is NOT caught (that bug collapsed the whole torso to a dot).
DROP_TOK = (".floor", ".dust", ".panel", ".swatch", ".fly-fx", "input", "#toggle")


def xform_sel(sel):
    sel = sel.strip()
    if not sel:
        return None
    m = re.match(r"#([\w-]+):checked\s*~\s*label\b(.*)$", sel, re.S)
    if m:
        idn, rest = m.group(1), m.group(2).strip()
        if idn == "toggle" or idn not in STATE:
            return None
        if any(t in rest for t in (".panel", ".fly-fx")):
            return None
        return ".uc-uni" + STATE[idn] + ((" " + rest) if rest else "")
    if sel == ":root":
        return ".uc-uni"
    if re.match(r"(?:html|body)\b", sel):        # bare page element (not .body class)
        return None
    if any(tok in sel for tok in DROP_TOK):
        return None
    return ".uc-uni " + sel


rules, kept_kf, dropped = [], 0, 0
for prelude, body in blocks(css):
    at = re.match(r"@(-webkit-)?keyframes\s+([\w-]+)", prelude)
    if at:
        name = at.group(2)
        if name.startswith("particle-animation"):
            dropped += 1
            continue
        rules.append("@%skeyframes uc-%s {%s}" % (at.group(1) or "", name, rem2em(body).strip()))
        kept_kf += 1
        continue
    if prelude.startswith("@"):                      # @media etc. -> drop
        dropped += 1
        continue
    sels = [xform_sel(s) for s in prelude.split(",")]
    sels = [s for s in sels if s]
    if not sels:
        dropped += 1
        continue
    rules.append(", ".join(sels) + " {" + remap_anim(rem2em(body)).strip() + "}")

new_css = "\n" + "\n".join(rules) + "\n"

item = io.open(ITEM, encoding="utf-8").read()
KEY = "var BASE_CSS = `"
a = item.index(KEY) + len(KEY)
b = item.index("`", a)                               # CSS has no backticks -> first ` closes it
item = item[:a] + new_css + item[b:]
io.open(ITEM, "w", encoding="utf-8", newline="\n").write(item)

print("regenerated BASE_CSS:", len(rules), "rules,", kept_kf, "keyframe blocks,",
      dropped, "dropped;", len(KF), "keyframe names remapped")
