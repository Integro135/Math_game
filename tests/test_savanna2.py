"""The SAVANNA background, rebuilt from scratch (backgrounds/savanna2.bg.js, the
🦁 theme): Pride Rock over the plain through a full day, the pride pacing the
ledge, herds of zebra / ostrich / elephant / cheetah / giraffe / lioness
crossing with their young — every animal a canvas rig from savanna_rigs/. The
scene tests run on the standalone savanna2.html harness (window._sav2 hooks);
the last class opens the real game."""
from pathlib import Path
import pytest
from helpers import GAME_URL, TIMEOUT

SAV = Path(r"c:\Code\subtraction_game\backgrounds\savanna2.html").as_uri()
PLAIN_Y = 722        # the foot of Pride Rock in design units: the pride stands above it, the herds below
KINDS = {"zebra": "ZebraRig", "ostrich": "OstrichRig", "elephant": "ElephantRig",
         "cheetah": "CheetahRig", "giraffe": "GiraffeRig", "lioness": "LionessRig"}


def _open(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" and "font" not in m.text.lower() else None)
    page.goto(SAV)
    page.wait_for_function("!!window._sav2 && _sav2.ready() && _sav2.pride().length > 0", timeout=TIMEOUT)
    # the harness bar sits over the sky — out of the way of the real taps below
    # (the scene filters clicks on buttons, like the game UI); the clock is held
    # and no herd wanders in on the schedule — each test brings its own
    page.evaluate("document.getElementById('bar').style.display = 'none'; _sav2.setSpeed(0); _sav2.auto(false); _sav2.clearHerds()")
    return errs


def _hour(page, tod, name):
    page.evaluate(f"_sav2.setTod({tod})")
    page.wait_for_function(f"_sav2.phase() === '{name}'", timeout=5_000)


def _tap(page, xy):
    """A real tap on the scene with the plain empty (a passing herd may not
    stand in front of the target)."""
    page.evaluate("_sav2.clearHerds()")
    page.mouse.click(xy["x"], xy["y"])


class TestScene:
    def test_the_pride_lives_on_pride_rock(self, page):
        errs = _open(page)
        pride = page.evaluate("_sav2.pride()")
        lay = page.evaluate("_sav2.layout()")
        assert [a["rig"] for a in pride] == ["LionRig", "LionessRig", "LionessRig", "CubRig"]
        assert not lay["narrow"] and lay["RKY"] == 1
        assert all(a["y"] < PLAIN_Y - 150 for a in pride), "everyone stands up on the ledge"
        assert all(0 < a["x"] < lay["DW"] * 0.45 for a in pride), "the rock is on the left"
        # the lion is the biggest, the cub the smallest; the young ones wear a ribbon
        assert pride[0]["s"] > pride[1]["s"] > pride[2]["s"]
        assert pride[2]["ribbon"] and pride[3]["ribbon"] and not pride[0]["ribbon"]
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert errs == []

    def test_the_day_runs_through_its_hours(self, page):
        errs = _open(page)
        for tod, name in [(0.03, "dawn"), (0.16, "morning"), (0.36, "noon"), (0.55, "golden"),
                          (0.67, "sunset"), (0.77, "dusk"), (0.90, "night")]:
            _hour(page, tod, name)
        assert page.evaluate("!_sav2.sunXY().up && _sav2.moonXY().up"), "night: the moon is up, the sun is down"
        _hour(page, 0.36, "noon")
        assert page.evaluate("_sav2.sunXY().up && !_sav2.moonXY().up")
        # the clock runs by itself: at ×20 the morning turns to noon
        _hour(page, 0.16, "morning")
        page.evaluate("_sav2.setSpeed(40)")
        page.wait_for_function("_sav2.phase() === 'noon'", timeout=15_000)
        assert errs == []

    def test_tapping_the_sun_or_the_moon_moves_to_the_next_hour(self, page):
        _open(page)
        _hour(page, 0.36, "noon")
        _tap(page, page.evaluate("_sav2.sunXY()"))
        page.wait_for_function("_sav2.phase() === 'golden'", timeout=6_000)
        _hour(page, 0.90, "night")
        _tap(page, page.evaluate("_sav2.moonXY()"))
        page.wait_for_function("_sav2.tod() > 0.94 || _sav2.tod() < 0.05", timeout=6_000)

    def test_tapping_the_waterhole_ripples_it_and_turns_the_hour(self, page):
        _open(page)
        _hour(page, 0.16, "morning")
        _tap(page, page.evaluate("_sav2.pondXY()"))
        page.wait_for_function("_sav2.ripples() > 0", timeout=3_000)
        page.wait_for_function("_sav2.phase() === 'noon'", timeout=6_000)

    def test_tapping_the_baobab_or_the_sky_sends_birds(self, page):
        _open(page)
        _hour(page, 0.36, "noon")
        before = page.evaluate("_sav2.flocks()")
        _tap(page, page.evaluate("_sav2.baobabXY()"))
        page.wait_for_function(f"_sav2.flocks() === {before} + 1", timeout=3_000)
        _tap(page, page.evaluate("_sav2.skyXY()"))
        page.wait_for_function(f"_sav2.flocks() === {before} + 2", timeout=3_000)
        assert page.evaluate("_sav2.tod()") == pytest.approx(0.36, abs=0.001), "birds do not move the clock"


class TestAnimals:
    @pytest.mark.parametrize("kind", list(KINDS))
    def test_a_herd_of_every_kind_crosses_the_plain(self, page, kind):
        errs = _open(page)
        page.evaluate("_sav2.clearHerds()")
        n = page.evaluate(f"_sav2.spawn('{kind}', {{adults: 2, young: 1, dir: 1, run: false, lane: 0.5}})")
        assert n == 3
        herd = page.evaluate("_sav2.herds()")[0]
        assert herd["kind"] == kind and herd["dir"] == 1
        rigs = [m["rig"] for m in herd["members"]]
        if kind == "lioness":
            assert sorted(rigs) == ["CubRig", "LionessRig", "LionessRig"], "a lioness's young is a real cub"
        else:
            assert rigs == [KINDS[kind]] * 3
            sizes = sorted(m["s"] for m in herd["members"])
            assert sizes[0] < sizes[1] * 0.8, "the young one is clearly smaller"
        assert all(m["y"] > PLAIN_Y for m in herd["members"]), "herds walk the plain, below the rock"
        x0 = herd["members"][0]["x"]
        page.wait_for_function(f"_sav2.herd()[0].x > {x0} + 40", timeout=10_000)       # it walks in from the left
        assert errs == []

    def test_a_running_herd_is_faster_than_a_walking_one(self, page):
        _open(page)
        def crossed(run):
            page.evaluate("_sav2.clearHerds()")
            page.evaluate(f"_sav2.spawn('cheetah', {{adults: 1, young: 0, dir: 1, run: {run}, lane: 0.5}})")
            a = page.evaluate("[_sav2.herd()[0].x, _sav2.time()]")
            page.wait_for_function(f"_sav2.time() > {a[1]} + 1.5", timeout=10_000)
            b = page.evaluate("[_sav2.herd()[0].x, _sav2.time()]")
            return (b[0] - a[0]) / (b[1] - a[1])
        walk, run = crossed("false"), crossed("true")
        assert walk > 20 and run > walk * 2, f"walk {walk:.0f}/s, run {run:.0f}/s"

    def test_tapping_the_lion_makes_him_roar(self, page):
        errs = _open(page)
        # wait for a moment the lion stands clear of the rest of the pride (nobody in front of him)
        page.wait_for_function("""() => { const p = _sav2.pride(), l = p[0];
            return !l.act && p.slice(1).every(o => Math.abs(o.x - l.x) > 150); }""", timeout=60_000)
        lion = page.evaluate("_sav2.pride()[0]")
        _tap(page, {"x": lion["cx"], "y": lion["cy"]})
        page.wait_for_function("_sav2.pride()[0].act === 'pose' && _sav2.roaring()", timeout=3_000)
        page.wait_for_function("_sav2.pride()[0].pose > 0.3", timeout=4_000)          # the mouth opens
        page.wait_for_function("_sav2.pride()[0].act === null && !_sav2.roaring()", timeout=8_000)
        assert errs == []

    def test_tapping_a_passing_animal_gets_a_trick(self, page):
        errs = _open(page)
        page.evaluate("_sav2.clearHerds(); _sav2.spawn('ostrich', {adults: 1, young: 0, dir: 1, run: false, lane: 0.5})")
        page.wait_for_function("_sav2.herd()[0].x > 200", timeout=20_000)
        a = page.evaluate("_sav2.herd()[0]")
        page.mouse.click(a["cx"], a["cy"])
        page.wait_for_function("_sav2.herd()[0].act !== null", timeout=3_000)
        assert page.evaluate("_sav2.herd()[0].act") in ("pose", "jump", "fart", "spin")
        page.wait_for_function("_sav2.herd().length === 0 || _sav2.herd()[0].act === null", timeout=8_000)
        assert errs == []

    def test_the_tricks_pose_jump_spin_and_fart(self, page):
        errs = _open(page)
        assert page.evaluate("_sav2.act(1, 'jump')") is True
        assert page.evaluate("_sav2.pride()[1].act") == "jump"
        assert page.evaluate("_sav2.act('cub', 'fart')") is True
        page.wait_for_function("_sav2.puffs() > 0", timeout=4_000)
        page.evaluate("_sav2.clearHerds(); _sav2.spawn('cheetah', {adults: 1, young: 0, dir: 1, run: false})")
        assert page.evaluate("_sav2.act('cheetah', 'spin')") is True
        assert page.evaluate("_sav2.herd()[0].act") == "spin"
        # an animal that does not know a trick falls back to its own pose
        page.evaluate("_sav2.clearHerds(); _sav2.spawn('elephant', {adults: 1, young: 0, dir: 1, run: false})")
        assert page.evaluate("_sav2.act('elephant', 'spin')") is True
        assert page.evaluate("_sav2.herd()[0].act") == "pose"
        page.wait_for_function("_sav2.herd()[0].pose > 0.3", timeout=4_000)           # the trumpet
        assert page.evaluate("_sav2.act('nobody', 'pose')") is False
        assert errs == []


class TestFitAndLifecycle:
    def test_a_phone_gets_the_low_rock_and_a_smaller_cast(self, page):
        page.set_viewport_size({"width": 390, "height": 844})
        errs = _open(page)
        lay = page.evaluate("_sav2.layout()")
        assert lay["narrow"] and lay["DW"] < 500 and lay["RKY"] < 0.5 and lay["PRS"] < 0.7
        pride = page.evaluate("_sav2.pride()")
        assert [a["rig"] for a in pride] == ["LionRig", "LionessRig", "CubRig"], "the teen stays home on a phone"
        assert all(0 < a["cx"] < 390 for a in pride)
        assert all(a["cy"] > 844 * 0.45 for a in pride), "the pride stands below the game panel"
        # back to a wide window: the whole pride returns to the high rock
        page.set_viewport_size({"width": 1280, "height": 800})
        page.wait_for_function("!_sav2.layout().narrow && _sav2.layout().RKY === 1 && _sav2.pride().length === 4", timeout=5_000)
        assert errs == []

    def test_restart_leaves_one_canvas_and_no_errors(self, page):
        errs = _open(page)
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_function("!!window._sav2 && _sav2.ready() && _sav2.pride().length === 4", timeout=TIMEOUT)
        page.wait_for_timeout(600)
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert page.evaluate("_sav2.perf().costEma") < 12
        assert errs == []


class TestInGame:
    def test_the_savanna_theme_loads_the_rebuilt_scene(self, page):
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.evaluate("pickTheme('savanna')")
        page.wait_for_function("!!window._sav2 && _sav2.ready() && _sav2.pride().length === 4", timeout=TIMEOUT)
        page.wait_for_function("!!(window.AIDS && AIDS.variants.savanna)", timeout=TIMEOUT)
        info = page.evaluate("""() => ({
            body: document.body.classList.contains('theme-savanna'),
            skin: [...document.querySelectorAll('link[rel=stylesheet]')].some(l => (l.getAttribute('href') || '').endsWith('savanna.skin.css')),
            stage: getComputedStyle(document.getElementById('stars-layer')).display,
            canvases: document.querySelectorAll('#stars-layer canvas').length,
            modules: Object.keys(window.BACKGROUNDS),
            scripts: [...document.scripts].map(s => (s.getAttribute('src') || '').split('/').slice(-2).join('/')),
            stored: localStorage.getItem('gameTheme'),
        })""")
        assert info["body"] and info["skin"] and info["stage"] == "block" and info["canvases"] == 1
        assert "savanna2" in info["modules"] and "savanna" not in info["modules"], "the legacy scene is not loaded"
        assert "savanna_rigs/kit.js" in info["scripts"] and "savanna_rigs/cats.js" in info["scripts"]
        assert not any("savanna_animals/" in s for s in info["scripts"])
        assert info["stored"] == "savanna"
        # the pride keeps to the clear strip left of the exercise panel
        left = page.evaluate("document.querySelector('.wrap').getBoundingClientRect().left")
        page.wait_for_function("isFinite(_sav2.layout().clearX)", timeout=5_000)      # measured on the scene's first frames
        assert page.evaluate("_sav2.layout().clearX * _sav2.layout().S + _sav2.layout().OX") == pytest.approx(left, abs=2)
        page.wait_for_function(f"_sav2.pride().every(a => a.cx < {left})", timeout=20_000)
        # another theme: the scene cleans up after itself
        page.evaluate("pickTheme('girls')")
        page.wait_for_function("document.body.classList.contains('theme-girls') && !window._sav2", timeout=TIMEOUT)
        assert errs == []
