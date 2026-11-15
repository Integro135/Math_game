"""The CITY, recreated (backgrounds/dubai4.bg.js, the 🏙️ dubai theme): the skyline
across a WIDE BAY at the end of the day — a third of the frame is water now, with
boats near and far and long reflections; a sky with clouds lit from below; towers
that are not alike, wearing bands of coloured light after dark; palms close to
the eye in the two bottom corners. The engine and the shows (the hour, the Burj's
LED show, the fountain, fireworks, the drone show, the UFO, the plane and the
helicopter, every tap) are dubai3.bg.js's, carried over. The scene tests run on
the standalone dubai4.html harness (window._dubai4 hooks); the last class opens
the real game."""
from pathlib import Path
import pytest
from helpers import TIMEOUT

CITY = Path(r"c:\Code\subtraction_game\backgrounds\dubai4.html").as_uri()
HZ = 690             # the waterline, in design units (the design is 900 high)


def _open(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" and "font" not in m.text.lower() else None)
    page.goto(CITY)
    page.wait_for_function("!!window._dubai4 && _dubai4.perf().drawn > 5", timeout=TIMEOUT)
    page.evaluate("document.getElementById('bar').style.display = 'none'")
    return errs


# the average colour of a row of the scene canvas at height v (0..1), between u0 and u1 across
ROW = """(v, u0, u1) => { const cv = document.querySelector('#stage canvas'), g = cv.getContext('2d'), n = 40; let s = [0, 0, 0];
  for (let i = 0; i < n; i++){ const d = g.getImageData(Math.round(cv.width * (u0 + (u1 - u0) * i / n)), Math.round(cv.height * v), 1, 1).data; for (let j = 0; j < 3; j++) s[j] += d[j] / n; } return s; }"""


def _seek(page, ph):
    page.evaluate(f"_dubai4.seek({ph})")
    page.wait_for_function(f"Math.abs(_dubai4.look().ph - {ph}) < 0.03", timeout=5_000)
    page.wait_for_timeout(400)                                                    # the still city repaints for the new hour


class TestPicture:
    def test_the_city_stands_across_a_wide_bay(self, page):
        errs = _open(page)
        lay, burj = page.evaluate("_dubai4.layout()"), page.evaluate("_dubai4.burj()")
        assert lay["DW"] == 1600 and lay["towers"] == 18, "the full skyline on a wide screen"
        assert burj["base"] == HZ - 2, "the waterline is 100 higher than it used to be: nearly a third of the frame is water"
        tall = max(lb["h"] for lb in burj["lobes"])
        assert 440 < tall < 500, f"the Burj is drawn a little smaller to give the bay its room ({tall:.0f})"
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert errs == []

    def test_the_hour_turns_from_golden_to_night_and_back(self, page):
        errs = _open(page)
        _seek(page, 0.05)
        gold = page.evaluate("_dubai4.look()")
        sky_gold = page.evaluate(f"({ROW})(0.08, 0.05, 0.95)")
        _seek(page, 0.58)
        night = page.evaluate("_dubai4.look()")
        sky_night = page.evaluate(f"({ROW})(0.08, 0.05, 0.95)")
        assert gold["night"] == 0 and gold["sun"] == 1 and night["night"] == 1 and night["stars"] == 1
        assert sum(sky_night) < sum(sky_gold) - 60, f"the sky goes dark: {sky_gold} → {sky_night}"
        assert page.evaluate("_dubai4.prof().repaints") >= 2, "the still city was repainted for each hour"
        assert errs == []

    def test_the_water_holds_the_light_of_the_sky(self, page):
        errs = _open(page)
        _seek(page, 0.05)
        water = page.evaluate(f"({ROW})(0.9, 0.3, 0.7)")
        _seek(page, 0.58)
        water_night = page.evaluate(f"({ROW})(0.9, 0.3, 0.7)")
        assert water[0] > water[2] * 0.8 and sum(water) > sum(water_night) + 60, f"warm and bright at golden hour, deep at night: {water} → {water_night}"
        assert errs == []

    def test_the_towers_light_up_after_dark(self, page):
        errs = _open(page)
        row = lambda: page.evaluate(f"(() => {{ const f = {ROW}; const o = []; for (let i = 0; i < 60; i++) o.push(f(0.66, 0.2 + i * 0.01, 0.2 + i * 0.01 + 0.002).reduce((a, b) => a + b, 0)); return o; }})()")
        _seek(page, 0.58)
        r = row()
        assert max(r) - min(r) > 150, "lit windows against dark glass: bright and dark side by side along the skyline"
        assert errs == []


class TestLife:
    def test_every_show_runs(self, page):
        errs = _open(page)
        for call in ("show()", "fountain()", "fireworks()", "drones()", "ufo('boat')", "heli()", "plane()", "dolphin()", "spin()", "wash()", "museum()", "shoot()", "missile()", "ny()"):
            page.evaluate(f"_dubai4.{call}")
        page.wait_for_function("(() => { const b = _dubai4.busy(); return b.show && b.fountain && b.fw > 0 && b.drones > 0 && b.ufo !== 'off'; })()", timeout=8_000)
        page.wait_for_timeout(1500)
        assert page.evaluate("_dubai4.perf().costEma") < 16
        assert errs == []

    def test_the_fleet_sails_near_and_far(self, page):
        errs = _open(page)
        boats = page.evaluate("_dubai4.boats()")
        assert len(boats) == 7 and {b["kind"] for b in boats} == {"dhow", "yacht", "abra", "speed"}
        ys = [b["y"] for b in boats]
        assert all(HZ + 20 <= y <= 900 - 50 for y in ys) and max(ys) - min(ys) > 50, f"lanes from the far shore to close by: {ys}"
        x0 = boats[0]["x"]
        page.wait_for_function(f"Math.abs(_dubai4.boats()[0].x - {x0}) > 3", timeout=8_000)
        assert errs == []

    def test_a_tap_on_the_burj_starts_a_show(self, page):
        errs = _open(page)
        info = page.evaluate("({ b: _dubai4.burj(), S: _dubai4.perf().S, DW: _dubai4.perf().DW, W: innerWidth })")
        ox = (info["W"] - info["DW"] * info["S"]) / 2
        page.mouse.click(ox + info["b"]["x"] * info["S"], (info["b"]["base"] - 200) * info["S"])
        page.wait_for_function("(() => { const b = _dubai4.busy(); return b.show || b.fw > 0; })()", timeout=4_000)
        assert errs == []


class TestFitAndLifecycle:
    def test_a_phone_gets_a_denser_skyline(self, page):
        page.set_viewport_size({"width": 390, "height": 844})
        errs = _open(page)
        lay = page.evaluate("_dubai4.layout()")
        assert lay["DW"] < 500 and lay["towers"] < 18, "the Marina cluster is left out on a narrow screen"
        page.set_viewport_size({"width": 1280, "height": 720})
        page.wait_for_function("_dubai4.layout().DW === 1600 && _dubai4.layout().towers === 18", timeout=5_000)
        page.wait_for_timeout(400)
        assert errs == []

    def test_restart_leaves_one_canvas_and_no_errors(self, page):
        errs = _open(page)
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_function("!!window._dubai4 && _dubai4.perf().drawn > 3 && _dubai4.perf().drawn < 400", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert errs == []


class TestInGame:
    def test_the_dubai_theme_loads_the_recreated_city(self, page):
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.evaluate("pickTheme('dubai')")
        page.wait_for_function("!!window._dubai4 && _dubai4.perf().drawn > 5", timeout=TIMEOUT)
        info = page.evaluate("""() => ({
            body: document.body.classList.contains('theme-dubai'),
            skin: [...document.querySelectorAll('link[rel=stylesheet]')].some(l => (l.getAttribute('href') || '').endsWith('dubai.skin.css')),
            canvases: document.querySelectorAll('#stars-layer canvas').length,
            modules: Object.keys(window.BACKGROUNDS),
        })""")
        assert info["body"] and info["skin"] and info["canvases"] == 1
        assert "dubai4" in info["modules"] and "dubai3" not in info["modules"], "the old city is not loaded"
        page.evaluate("pickTheme('girls')")
        page.wait_for_function("document.body.classList.contains('theme-girls') && !window._dubai4", timeout=TIMEOUT)
        page.evaluate("pickTheme('dubai')")
        page.wait_for_function("!!window._dubai4 && _dubai4.perf().drawn > 3", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('#stars-layer canvas').length") == 1
        assert errs == []
