"""The ICE WORLD, painted again from scratch (backgrounds/aurora2.bg.js, the ❄️
frozen theme): a polar night over a frozen lake — a deep sky with the Milky Way,
an aurora of silk curtains, snow ranges whose every peak has a moonlit flank and
a shaded one, the ice palace, blue icebergs, firs under snow. The cast and the
engine are aurora.bg.js's, carried over unchanged (seals, orcas, the princess
sisters, the snowman, the bears, the fox, the palace's lightning). The scene
tests run on the standalone aurora2.html harness (window._aurora2 hooks); the
last class opens the real game."""
from pathlib import Path
import pytest
from helpers import TIMEOUT

ICE = Path(r"c:\Code\subtraction_game\backgrounds\aurora2.html").as_uri()


def _open(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" and "font" not in m.text.lower() else None)
    page.goto(ICE)
    page.wait_for_function("!!window._aurora2 && _aurora2.perf().drawn > 8", timeout=TIMEOUT)
    page.evaluate("document.getElementById('ctrl').style.display = 'none'")       # the harness buttons sit over the shore
    return errs


# average colour of a small square of the scene canvas (the first canvas in the stage), in CSS px
PX = """(x, y) => { const cv = document.querySelector('#stage canvas'), k = cv.width / innerWidth, g = cv.getContext('2d');
  const d = g.getImageData(Math.round(x * k) - 2, Math.round(y * k) - 2, 5, 5).data; let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4){ r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return [r / n, gg / n, b / n]; }"""


class TestPicture:
    def test_the_scene_stands_on_three_layers(self, page):
        errs = _open(page)
        kids = page.evaluate("[...document.getElementById('stage').children].map(e => e.tagName)")
        assert kids == ["CANVAS", "DIV", "CANVAS"], "the scene canvas, the snowman's own layer, the snow and lightning above him"
        b = page.evaluate("_aurora2.perf().bands")
        assert 0 < b["mid"] < b["sky"] < b["H"] and b["aurora"] < b["H"] * 0.5, f"each static layer is blitted over its own band only: {b}"
        assert errs == []

    def test_the_sky_is_never_flat_and_pales_toward_the_horizon(self, page):
        errs = _open(page)
        page.evaluate("_aurora2.intensity(0); _aurora2.snow(false)")                # the aurora off, no snowflakes: the painted sky alone
        page.wait_for_timeout(500)
        w, h = page.evaluate("[innerWidth, innerHeight]")
        row = lambda v: page.evaluate(f"(() => {{ const f = {PX}; let s = [0, 0, 0]; for (let i = 0; i < 40; i++){{ const p = f({w} * (0.02 + 0.96 * i / 40), {h} * {v}); s = s.map((q, j) => q + p[j] / 40); }} return s; }})()")
        top, low = row(0.03), row(0.4)                                               # averaged across the width
        assert sum(low) > sum(top) + 40 and low[2] > low[0] * 2, f"deep at the zenith, paler and blue-teal lower down: {top} → {low}"
        spots = page.evaluate(f"(() => {{ const f = {PX}; const o = []; for (let i = 0; i < 40; i++) o.push(f({w} * (0.05 + 0.9 * i / 40), {h} * 0.12).reduce((a, b) => a + b, 0)); return o; }})()")
        assert max(spots) - min(spots) > 25, "along one height the sky varies: the Milky Way, veils of gas, stars"
        assert errs == []

    def test_every_peak_has_a_moonlit_flank_and_a_shaded_one(self, page):
        errs = _open(page)
        page.evaluate("_aurora2.intensity(0); _aurora2.snow(false)")
        page.wait_for_timeout(500)
        w, h = page.evaluate("[innerWidth, innerHeight]")
        # one row across the ranges, well below the summits and above the shore's trees
        row = page.evaluate(f"(() => {{ const f = {PX}; const o = []; for (let i = 0; i < 120; i++) o.push(f({w} * (0.02 + 0.6 * i / 120), {h} * 0.56).reduce((a, b) => a + b, 0)); return o; }})()")
        assert max(row) > 600 and min(row) < 420, f"bright snow in the moonlight and blue shade side by side: {min(row):.0f}..{max(row):.0f}"
        assert errs == []

    def test_the_aurora_lights_the_sky_and_surges_on_demand(self, page):
        errs = _open(page)
        page.evaluate("_aurora2.snow(false); _aurora2.intensity(0)")
        page.wait_for_timeout(500)
        w, h = page.evaluate("[innerWidth, innerHeight]")
        band = f"(() => {{ const f = {PX}; let s = 0; for (let i = 0; i < 30; i++) for (const v of [0.2, 0.28, 0.34]) s += f({w} * (0.05 + 0.9 * i / 30), {h} * v)[1]; return s / 90; }})()"
        dark = page.evaluate(band)
        page.evaluate("_aurora2.intensity(1.6)")
        page.wait_for_timeout(700)
        lit = page.evaluate(band)
        assert lit > dark + 12, f"the curtains add their green to the sky: {dark:.1f} → {lit:.1f}"
        page.evaluate("_aurora2.surge()")
        assert page.evaluate("_aurora2.busy().surge") is True
        page.wait_for_function("!_aurora2.busy().surge", timeout=9_000)              # about five seconds, then calm again
        assert errs == []


class TestCast:
    def test_everyone_is_here_and_acts(self, page):
        errs = _open(page)
        assert len(page.evaluate("_aurora2.princess().map(p => p.name)")) == 2
        assert len(page.evaluate("_aurora2.orcas().map(o => o.lane)")) == 2 and len(page.evaluate("_aurora2.bears().map(b => !!b.cub)")) == 2
        page.wait_for_function("(() => { const o = _aurora2.olaf(); return !!o && !!o.el && o.w > 0; })()", timeout=TIMEOUT)   # the snowman's rig has loaded and been fitted
        for call in ("cast()", "breach()", "wave()", "sniff()", "dive()", "roll()", "sit()", "slide()", "fox()", "hop()", "shoot()", "wind(1)", "snow(true)"):
            page.evaluate(f"_aurora2.{call}")
        page.wait_for_timeout(1500)
        assert page.evaluate("_aurora2.olaf().hopBusy") in (True, False)
        assert page.evaluate("_aurora2.perf().costEma") < 14
        assert errs == []

    def test_a_tap_on_a_princess_makes_her_conjure_snowflakes(self, page):
        errs = _open(page)
        p = page.evaluate("(() => { const P = _aurora2.princess()[0]; return { x: P.x, y: P.y - 100 * P.s, cast: P.castT0 }; })()")
        page.mouse.click(p["x"], p["y"])
        page.wait_for_function(f"_aurora2.princess()[0].castT0 > {p['cast']}", timeout=3_000)
        assert errs == []

    def test_a_tap_on_the_palace_brings_a_lightning_storm_not_a_surge(self, page):
        errs = _open(page)
        box = page.evaluate("_aurora2.busy().castleBox")
        assert box["x1"] > box["x0"] and box["y1"] > box["y0"]
        page.mouse.click((box["x0"] + box["x1"]) / 2, box["y0"] + (box["y1"] - box["y0"]) * 0.25)      # its tallest spire, above everyone's heads
        page.wait_for_function("_aurora2.busy().strikes > 0", timeout=3_000)
        assert page.evaluate("_aurora2.busy().surge") is False, "the storm and the aurora's surge are separate"
        page.wait_for_function("_aurora2.busy().strikes === 0", timeout=10_000)
        assert errs == []

    def test_a_tap_on_the_sky_makes_the_aurora_surge(self, page):
        errs = _open(page)
        w, h = page.evaluate("[innerWidth, innerHeight]")
        page.mouse.click(w * 0.3, h * 0.1)
        page.wait_for_function("_aurora2.busy().surge", timeout=3_000)
        assert page.evaluate("_aurora2.busy().strikes") == 0
        assert errs == []


class TestFitAndLifecycle:
    def test_a_phone_repaints_the_scene_to_fit(self, page):
        page.set_viewport_size({"width": 390, "height": 844})
        errs = _open(page)
        b = page.evaluate("_aurora2.perf().bands")
        assert b["H"] == 844 and 0 < b["mid"] < b["sky"] < 844
        box = page.evaluate("_aurora2.busy().castleBox")
        assert box["x0"] < 390, "the palace still shows on a narrow screen"
        page.set_viewport_size({"width": 1280, "height": 800})
        page.wait_for_function("_aurora2.perf().bands.H === 800", timeout=5_000)
        page.wait_for_timeout(400)
        assert errs == []

    def test_restart_leaves_one_scene_and_no_errors(self, page):
        errs = _open(page)
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_function("!!window._aurora2 && _aurora2.perf().drawn > 5 && _aurora2.perf().drawn < 400", timeout=TIMEOUT)
        assert page.evaluate("[...document.getElementById('stage').children].map(e => e.tagName)") == ["CANVAS", "DIV", "CANVAS"]
        assert errs == []


class TestInGame:
    def test_the_frozen_theme_loads_the_repainted_ice_world(self, page):
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.evaluate("pickTheme('frozen')")
        page.wait_for_function("!!window._aurora2 && _aurora2.perf().drawn > 8", timeout=TIMEOUT)
        info = page.evaluate("""() => ({
            body: document.body.classList.contains('theme-frozen'),
            skin: [...document.querySelectorAll('link[rel=stylesheet]')].some(l => (l.getAttribute('href') || '').endsWith('frozen.skin.css')),
            layers: [...document.getElementById('stars-layer').children].map(e => e.tagName),
            modules: Object.keys(window.BACKGROUNDS),
            scripts: [...document.scripts].map(s => (s.getAttribute('src') || '').split('/').slice(-2).join('/')),
        })""")
        assert info["body"] and info["skin"] and info["layers"] == ["CANVAS", "DIV", "CANVAS"]
        assert "aurora2" in info["modules"] and "aurora" not in info["modules"], "the old ice scene is not loaded"
        assert "princess/princess.js" in info["scripts"] and "olaf/olaf.js" in info["scripts"]
        # another theme: the ice world cleans up after itself; and back again
        page.evaluate("pickTheme('girls')")
        page.wait_for_function("document.body.classList.contains('theme-girls') && !window._aurora2", timeout=TIMEOUT)
        page.evaluate("pickTheme('frozen')")
        page.wait_for_function("!!window._aurora2 && _aurora2.perf().drawn > 3", timeout=TIMEOUT)
        assert page.evaluate("[...document.getElementById('stars-layer').children].map(e => e.tagName)") == ["CANVAS", "DIV", "CANVAS"]
        assert errs == []
