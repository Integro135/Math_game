"""The SPACE background, repainted to be beautiful (backgrounds/space4.bg.js, the 🌌
galaxy theme). The black hole is carried over unchanged from space2 (WebGL2 sky,
the dust, the feeding frenzy). Between it and the moving layer lies THE DEEP SKY —
a still painting on a canvas of its own (the Milky Way, nebulae, far galaxies,
thousands of stars) that costs nothing per frame and keeps clear of the hole. The
moving layer — worlds painted per pixel from noise with a real night side, the Sun,
galaxies, comets, the rocket and the astronaut — is drawn from baked sprites, and a
test holds the frame's canvas-call count down. The scene tests run on the
standalone space4.html harness (window._space4 hooks); the last class opens the
real game."""
from pathlib import Path
import re
import pytest
from helpers import GAME_URL, TIMEOUT

SPACE = Path(r"c:\Code\subtraction_game\backgrounds\space4.html").as_uri()
NIQQUD = re.compile(r"[\u0591-\u05C7]")

# counts every 2-D canvas call per animation frame (installed before the scene loads)
COUNTER = """(() => {
  const P = CanvasRenderingContext2D.prototype, C = window.__cc = { frames: 0, calls: {}, total: 0 };
  for (const m of ['fill','stroke','drawImage','fillRect','strokeRect','clearRect','clip','arc','ellipse','lineTo','rect','bezierCurveTo','quadraticCurveTo','createRadialGradient','createLinearGradient','save','restore','setTransform']){
    const f = P[m]; P[m] = function(){ C.calls[m] = (C.calls[m] || 0) + 1; C.total++; return f.apply(this, arguments); };
  }
  const raf = window.requestAnimationFrame; window.requestAnimationFrame = cb => raf(ts => { C.frames++; cb(ts); });
})();"""


def _open(page, counter=False):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" and "font" not in m.text.lower() else None)
    if counter:
        page.add_init_script(COUNTER)
    page.goto(SPACE)
    page.wait_for_function("!!window._space4 && _space4.perf().frames > 10", timeout=60_000)
    page.evaluate("document.getElementById('toggle').style.display = 'none'")
    return errs


def _plain(s):
    return NIQQUD.sub("", s)


def _tap_kind(page, kind, index=0):
    """Tap the index-th target of a kind (it must be the first thing under its own centre)."""
    page.wait_for_function(
        f"(() => {{ const T = _space4.targets().filter(q => q.kind === '{kind}'); const q = T[{index}];"
        f" return !!q && q.x > 4 && q.y > 4 && q.x < innerWidth - 4 && q.y < innerHeight - 4 && _space4.hitAt(q.x, q.y) === '{kind}'; }})()", timeout=30_000)
    q = page.evaluate(f"_space4.targets().filter(q => q.kind === '{kind}')[{index}]")
    page.mouse.click(q["x"], q["y"])
    page.wait_for_function(f"_space4.taps.last === '{kind}'", timeout=3_000)
    return q


class TestBlackHole:
    def test_the_black_hole_is_where_and_as_big_as_it_always_was(self, page):
        errs = _open(page)
        info = page.evaluate("({bh: _space4.bh, gl: _space4.gl, w: innerWidth, h: innerHeight, canvases: document.querySelectorAll('#stage canvas').length, dust: _space4.dust.length})")
        bh, w, h = info["bh"], info["w"], info["h"]
        assert bh["x"] == pytest.approx(w * 0.90) and bh["y"] == pytest.approx(h * 0.36)
        assert bh["r"] == pytest.approx(min(w, h) * 0.075) and bh["rE"] == pytest.approx(bh["r"] * 1.35)
        assert info["canvases"] == 3, "the WebGL sky, the still deep sky over it, the moving 2-D world on top"
        assert info["dust"] == 260 * 8, "the 260 simulated dust grains"
        gl = info["gl"]
        assert not gl["lost"] and gl["quality"] in ("potato", "low", "medium", "high") and gl["rw"] > 100
        p0 = gl["phi"]
        page.wait_for_function(f"_space4.gl.phi > {p0} + 0.05", timeout=10_000)          # the hole keeps precessing
        assert errs == []

    def test_tapping_the_black_hole_starts_a_feeding_frenzy(self, page):
        errs = _open(page)
        assert page.evaluate("_space4.surge") == 0 and not page.evaluate("_space4.rock()")
        _tap_kind(page, "bh")
        page.wait_for_function("_space4.surge > 0.6 && _space4.rock()", timeout=3_000)   # the disk and jets flare, a rock spirals in
        assert "חור שחור" in _plain(page.evaluate("_space4.fact"))
        page.wait_for_function("!_space4.rock() && _space4.tidal() >= 1", timeout=8_000)  # …and is drawn out into a streak
        page.wait_for_function("_space4.surge === 0", timeout=8_000)
        assert errs == []


class TestWorlds:
    def test_saturn_and_earth_spin_up_when_tapped(self, page):
        errs = _open(page)
        b = page.evaluate("_space4.bodies()")
        w, h = page.evaluate("[innerWidth, innerHeight]")
        assert b["saturn"]["on"] and b["earth"]["on"]
        assert b["saturn"]["x"] == pytest.approx(w * 0.17, abs=2) and b["earth"]["y"] == pytest.approx(h * 0.74, abs=2), "they open at their classic spots"
        assert b["saturn"]["r"] > b["earth"]["r"] * 1.5
        _tap_kind(page, "planet")
        page.wait_for_function("_space4.bodies().saturn.boost > 0", timeout=3_000)       # the envelope rises from 0 on the next frames
        assert "שבתאי" in _plain(page.evaluate("_space4.fact"))
        r0 = page.evaluate("_space4.bodies().earth.rot")
        _tap_kind(page, "earth", 1)                                                       # the globe itself (index 0 is its aurora)
        page.wait_for_function("_space4.bodies().earth.boost > 0", timeout=3_000)
        assert "כדור הארץ" in _plain(page.evaluate("_space4.fact"))
        assert all(o["lap"] for o in page.evaluate("_space4.orbiters()")), "the Moon and the satellites take an extra lap"
        page.wait_for_function(f"_space4.bodies().earth.rot > {r0} + 0.3", timeout=5_000)   # it visibly spins up
        assert errs == []

    def test_the_moon_and_the_satellites_circle_the_earth(self, page):
        _open(page)
        orb = page.evaluate("_space4.orbiters()")
        assert [o["kind"] for o in orb] == ["moon", "sat", "sat"]
        e = page.evaluate("_space4.bodies().earth")
        assert all(abs(o["x"] - e["x"]) < e["r"] * 3 and abs(o["y"] - e["y"]) < e["r"] * 3 for o in orb)
        x0 = orb[1]["x"]
        page.wait_for_function(f"Math.abs(_space4.orbiters()[1].x - {x0}) > 4", timeout=8_000)
        _tap_kind(page, "orbiter")
        assert any(o["lap"] for o in page.evaluate("_space4.orbiters()"))
        assert _plain(page.evaluate("_space4.fact")).startswith(("הירח", "לוין"))

    def test_every_world_passes_with_its_name_and_fact(self, page):
        errs = _open(page)
        page.evaluate("_space4.spawnAll()")
        page.wait_for_timeout(500)
        T = [q for q in page.evaluate("_space4.targets()") if q["kind"] == "passer"]
        names = [_plain(q["name"]) for q in T]
        assert len(T) == 8 and len(set(names)) == 8
        for n in ("חמה", "נגה", "מאדים", "צדק", "אורנוס", "נפטון", "פלוטו", "אסטרואיד"):
            assert n in names
        q = next(q for q in T if _plain(q["name"]) == "צדק")
        if page.evaluate(f"_space4.hitAt({q['x']}, {q['y']})") == "passer":
            page.mouse.click(q["x"], q["y"])
            page.wait_for_function("_space4.taps.last === 'passer'", timeout=3_000)
            assert "צדק" in _plain(page.evaluate("_space4.fact"))
        stats = page.evaluate("_space4.simulate(240)")                                   # four minutes of drifting
        assert stats["spawned"] >= 8 and stats["exited"] + stats["swallowed"] + stats["active"] == stats["spawned"]
        assert errs == []

    def test_the_wanderers_keep_clear_of_the_hole(self, page):
        _open(page)
        r = page.evaluate("_space4.simulateMovers(900)")                                 # fifteen minutes of roaming
        assert r["trips"] >= 3
        assert r["saturnClosest"] > 4.8 and r["earthClosest"] > 4.8, f"too close to the hole: {r}"


class TestSky:
    def test_galaxies_constellations_and_the_sun_answer_a_tap(self, page):
        errs = _open(page)
        assert len(page.evaluate("_space4.galaxies()")) == 3
        _tap_kind(page, "galaxy")
        page.wait_for_function("_space4.galaxies().some(g => g.boost > 0)", timeout=3_000)
        assert "גלקסיה" in _plain(page.evaluate("_space4.fact"))
        cons = page.evaluate("_space4.constellations()")
        assert [_plain(c["name"]) for c in cons] == ["הדבה הגדולה", "אוריון", "קסיופאה"]
        _tap_kind(page, "cons")
        page.wait_for_function("_space4.constellations().some(c => c.lit > 0)", timeout=3_000)
        # the Sun's centre is far below the screen — tap its limb
        limb = page.evaluate("({x: _space4.bodies().sun.x, y: innerHeight - 16})")
        assert page.evaluate(f"_space4.hitAt({limb['x']}, {limb['y']})") == "sun"
        page.mouse.click(limb["x"], limb["y"])
        page.wait_for_function("_space4.taps.last === 'sun' && _space4.bodies().sun.flare", timeout=3_000)
        assert "השמש" in _plain(page.evaluate("_space4.fact"))
        assert errs == []

    def test_a_tapped_star_goes_supernova_and_a_comet_tells_its_fact(self, page):
        errs = _open(page)
        i = page.evaluate("_space4.stars().findIndex(s => _space4.hitAt(s.x, s.y) === null && s.x > 30 && s.y > 30)")
        assert i >= 0
        s = page.evaluate(f"_space4.stars()[{i}]")
        page.mouse.click(s["x"], s["y"])
        page.wait_for_function("_space4.taps.last === 'star' && _space4.nova() !== null", timeout=3_000)
        n = page.evaluate("_space4.nova()")
        assert abs(n["x"] - s["x"]) < 1 and abs(n["y"] - s["y"]) < 1
        _tap_kind(page, "nova")
        assert "סופרנובה" in _plain(page.evaluate("_space4.fact"))
        page.wait_for_function("_space4.nova() === null", timeout=9_000)                  # it fades
        w, h = page.evaluate("[innerWidth, innerHeight]")
        page.evaluate(f"_space4.startComet({w * 0.5}, {h * 0.45})")
        _tap_kind(page, "comet")
        assert "שביט" in _plain(page.evaluate("_space4.fact"))
        assert errs == []

    def test_the_rocket_loops_and_the_astronaut_somersaults(self, page):
        errs = _open(page)
        r0 = page.evaluate("_space4.rocket()")
        page.wait_for_function(f"Math.hypot(_space4.rocket().x - {r0['x']}, _space4.rocket().y - {r0['y']}) > 20", timeout=10_000)   # she is on patrol
        _tap_kind(page, "rocket")
        assert page.evaluate("_space4.rocket().looping") and "חללית" in _plain(page.evaluate("_space4.fact"))
        _tap_kind(page, "astro")
        assert page.evaluate("_space4.astronaut().spinning") and "אסטרונאוטית" in _plain(page.evaluate("_space4.fact"))
        page.wait_for_function("!_space4.rocket().looping && !_space4.astronaut().spinning", timeout=5_000)
        # the rocket never flies into the hole's neighbourhood
        bh = page.evaluate("_space4.bh")
        for _ in range(6):
            page.wait_for_timeout(700)
            r = page.evaluate("_space4.rocket()")
            assert ((r["x"] - bh["x"]) ** 2 + (r["y"] - bh["y"]) ** 2) ** 0.5 > bh["r"] * 3.2
        assert errs == []

    def test_empty_sky_scatters_travellers_and_hides_the_bubble(self, page):
        _open(page)
        _tap_kind(page, "planet")
        assert page.evaluate("_space4.fact") != ""
        pt = page.evaluate("""(() => { for (let i = 0; i < 400; i++){ const x = 40 + Math.random() * (innerWidth - 80), y = 40 + Math.random() * innerHeight * 0.6;
            if (_space4.hitAt(x, y) === null && _space4.stars().every(s => Math.hypot(s.x - x, s.y - y) > 30)) return {x, y}; } return null; })()""")
        assert pt is not None
        page.mouse.click(pt["x"], pt["y"])
        page.wait_for_function("_space4.taps.last === 'sky'", timeout=3_000)
        assert page.evaluate("_space4.fact") == "", "a tap on empty sky closes the fact bubble"


class TestDeepSky:
    def test_the_deep_sky_is_a_still_painting_that_keeps_clear_of_the_hole(self, page):
        errs = _open(page)
        info = page.evaluate("""() => {
            const cs = [...document.querySelectorAll('#stage canvas')], art = cs[1], g = art.getContext('2d'), bh = _space4.bh, k = art.width / innerWidth;
            const a = (x, y) => g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data[3];
            let lit = 0; for (let i = 0; i < 400; i++) if (a(Math.random() * innerWidth * .6, Math.random() * innerHeight * .8) > 8) lit++;
            const before = art.toDataURL().length;
            return { n: cs.length, hole: a(bh.x, bh.y), disk: a(bh.x - bh.r * 3, bh.y), lit: lit / 400, perf: _space4.perf(), before };
        }""")
        assert info["n"] == 3, "the WebGL sky, the deep sky, the moving layer"
        assert info["hole"] == 0 and info["disk"] == 0, "nothing is painted over the hole or its disk"
        assert info["lit"] > 0.6, "away from the hole the sky is full of gas and stars"
        assert info["perf"]["deepSky"] and info["perf"]["skyMs"] < 500, "painted once, quickly"
        page.wait_for_timeout(700)
        assert page.evaluate("document.querySelectorAll('#stage canvas')[1].toDataURL().length") == info["before"], "frames go by and the painting is never touched"
        assert errs == []

    def test_every_world_has_a_night_side_away_from_the_sun(self, page):
        errs = _open(page)
        page.evaluate("_space4.spawnAll()")
        page.wait_for_timeout(900)
        r = page.evaluate("""() => {
            const cv = document.querySelectorAll('#stage canvas')[2], g = cv.getContext('2d'), k = cv.width / innerWidth, B = _space4.bodies(), s = B.saturn, sun = B.sun;
            const d = Math.hypot(sun.x - s.x, sun.y - s.y), ux = (sun.x - s.x) / d, uy = (sun.y - s.y) / d;
            const lum = (x, y) => { const p = g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; return p[0] + p[1] + p[2]; };
            return { day: lum(s.x + ux * s.r * .55, s.y + uy * s.r * .55), night: lum(s.x - ux * s.r * .8, s.y - uy * s.r * .8), on: s.on };
        }""")
        assert r["on"] and r["day"] > r["night"] * 2.5, f"Saturn's face toward the Sun is far brighter than the face away from it: {r}"
        assert errs == []


class TestRenderingCost:
    """The reason for the redesign: the 2-D layer must stay cheap. The old layer
    issued ~3,300 canvas calls a frame; this one bakes everything into sprites."""

    def test_a_frame_is_a_few_hundred_canvas_calls_and_bakes_no_gradients(self, page):
        errs = _open(page, counter=True)
        page.wait_for_timeout(1500)                                                      # let the first bakes finish
        page.evaluate("(() => { const C = window.__cc; C.frames = 0; C.calls = {}; C.total = 0; })()")
        page.wait_for_function("window.__cc.frames >= 120", timeout=30_000)
        c = page.evaluate("window.__cc")
        f = c["frames"]
        per = {k: v / f for k, v in c["calls"].items()}
        # ~650 at full detail, most of them rect / lineTo segments inside a couple of dozen batched paths (the old layer: ~3,300)
        assert c["total"] / f < 900, f"{c['total'] / f:.0f} canvas calls a frame: {per}"
        assert per.get("fill", 0) + per.get("stroke", 0) < 60, "paths are batched: a few dozen fills and strokes a frame"
        assert per.get("createRadialGradient", 0) + per.get("createLinearGradient", 0) < 1, "no gradients are built per frame — everything soft is a baked sprite"
        assert per.get("clip", 0) < 1 and per.get("drawImage", 0) < 140
        assert errs == []

    def test_the_parade_of_every_world_stays_cheap_too(self, page):
        _open(page, counter=True)
        page.evaluate("_space4.spawnAll(); _space4.startNova(); _space4.flare()")
        page.wait_for_timeout(1200)
        page.evaluate("(() => { const C = window.__cc; C.frames = 0; C.calls = {}; C.total = 0; })()")
        page.wait_for_function("window.__cc.frames >= 90", timeout=30_000)
        c = page.evaluate("window.__cc")
        assert c["total"] / c["frames"] < 1300, f"{c['total'] / c['frames']:.0f} canvas calls a frame with eight worlds, a nova and a flare"
        p = page.evaluate("_space4.perf()")
        assert p["passers"] == 8 and p["ms2d"] < 8, p

    def test_the_last_resort_tier_thins_the_detail_out(self, page):
        _open(page)
        p = page.evaluate("_space4.perf()")
        if p["lite"]:
            assert p["deepSky"] and p["dust"] == 130 and p["travellers"] == 6, "the still painting stays: it is free"
        else:
            assert p["deepSky"] and p["dust"] == 260 and p["travellers"] == 10 and p["stars"] > 100


class TestFitAndLifecycle:
    def test_a_phone_keeps_the_hole_in_place_and_every_target_on_screen(self, page):
        page.set_viewport_size({"width": 390, "height": 844})
        errs = _open(page)
        bh = page.evaluate("_space4.bh")
        assert bh["x"] == pytest.approx(390 * 0.90) and bh["y"] == pytest.approx(844 * 0.36) and bh["r"] == pytest.approx(390 * 0.075)
        T = page.evaluate("_space4.targets()")
        kinds = {q["kind"] for q in T}
        assert {"bh", "planet", "earth", "galaxy", "cons", "sun", "rocket", "astro", "orbiter"} <= kinds
        # a resize re-lays the scene for the new window
        page.set_viewport_size({"width": 1280, "height": 800})
        page.wait_for_function("Math.abs(_space4.bh.x - 1280 * 0.9) < 1 && Math.abs(_space4.bh.r - 800 * 0.075) < 1", timeout=8_000)
        assert errs == []

    def test_restart_leaves_three_canvases_and_no_errors(self, page):
        errs = _open(page)
        page.evaluate("document.getElementById('toggle').click()")
        page.wait_for_function("!!window._space4 && _space4.perf().frames > 5 && _space4.perf().frames < 400", timeout=60_000)
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 3
        assert errs == []


class TestInGame:
    def test_the_galaxy_theme_loads_the_redesigned_scene(self, page):
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.evaluate("pickTheme('galaxy')")
        page.wait_for_function("!!window._space4 && _space4.perf().frames > 10", timeout=60_000)
        # the scene's first frame takes the loading screen down. The loader must know this scene is a slow one BY NAME
        # (its first load happens before the module object exists) — otherwise the screen waits for its 40 s safety timeout
        assert page.evaluate("SLOW_BGS.indexOf('space4') >= 0 && !!LOAD_LABELS.space4 && !!LOAD_STEPS.space4")
        page.wait_for_function("!BG_LOADING.showing()", timeout=5_000)
        info = page.evaluate("""() => ({
            body: document.body.classList.contains('theme-galaxy'),
            skin: [...document.querySelectorAll('link[rel=stylesheet]')].some(l => (l.getAttribute('href') || '').endsWith('space.skin.css')),
            stage: getComputedStyle(document.getElementById('stars-layer')).display,
            canvases: document.querySelectorAll('#stars-layer canvas').length,
            modules: Object.keys(window.BACKGROUNDS),
            bh: _space4.bh, w: innerWidth, h: innerHeight,
        })""")
        assert info["body"] and info["skin"] and info["stage"] == "block" and info["canvases"] == 3
        assert "space4" in info["modules"] and "space3" not in info["modules"] and "space2" not in info["modules"], "the older scenes are not loaded"
        assert info["bh"]["x"] == pytest.approx(info["w"] * 0.90) and info["bh"]["y"] == pytest.approx(info["h"] * 0.36)
        # a tap on the game's own controls is not a tap on the sky
        before = page.evaluate("_space4.taps.total")
        page.evaluate("document.querySelector('#ans, #ans1').click()")      # (a dispatched click: some exercises keep the box pulsing, never "stable" for a real one)
        assert page.evaluate("_space4.taps.total") == before
        # another theme: the scene cleans up after itself; and back again
        page.evaluate("pickTheme('girls')")
        page.wait_for_function("document.body.classList.contains('theme-girls') && !window._space4", timeout=TIMEOUT)
        page.evaluate("pickTheme('galaxy')")
        page.wait_for_function("!!window._space4 && _space4.perf().frames > 5", timeout=60_000)
        assert page.evaluate("document.querySelectorAll('#stars-layer canvas').length") == 3
        assert errs == []
