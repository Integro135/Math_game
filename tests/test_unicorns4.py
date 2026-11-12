"""The UNICORN VALLEY, rebuilt from scratch (backgrounds/unicorns4.bg.js, the 🦄
theme — the game's default look): the castle, the rainbow, the crystal falls
and the pond through a full day, a mare and her foal in the meadow, visiting
unicorns, a winged flyer, hopping bunnies and a swan family — every one a
canvas rig from unicorn_rigs/. The scene tests run on the standalone
unicorns4.html harness (window._uni4 hooks); the last class opens the real game."""
from pathlib import Path
import pytest
from helpers import GAME_URL, TIMEOUT

UNI = Path(r"c:\Code\subtraction_game\backgrounds\unicorns4.html").as_uri()
HZ = 560             # the meadow's horizon in design units


def _open(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" and "font" not in m.text.lower() else None)
    page.goto(UNI)
    page.wait_for_function("!!window._uni4 && _uni4.ready() && _uni4.family().length === 2", timeout=TIMEOUT)
    # the harness bar sits over the sky — out of the way of the real taps below
    # (the scene filters clicks on buttons, like the game UI); the clock is held
    # and nobody comes or performs on the schedule — each test brings its own
    page.evaluate("document.getElementById('bar').style.display = 'none'; _uni4.setSpeed(0); _uni4.auto(false); _uni4.clearVisitors()")
    return errs


def _hour(page, tod, name):
    page.evaluate(f"_uni4.setTod({tod})")
    page.wait_for_function(f"_uni4.phase() === '{name}'", timeout=5_000)


def _tap(page, xy):
    assert page.evaluate(f"_uni4.hitAt({xy['x']}, {xy['y']})") is None, "nobody stands in front of the target"
    page.mouse.click(xy["x"], xy["y"])


class TestValley:
    def test_the_valley_is_laid_out(self, page):
        errs = _open(page)
        lay = page.evaluate("_uni4.layout()")
        assert not lay["narrow"] and lay["CLY"] == 1
        assert lay["pond"]["x"] < lay["DW"] * 0.35, "the falls and the pond are on the left"
        assert lay["castle"]["x"] > lay["DW"] * 0.7, "the castle stands on the right"
        assert lay["pond"]["x"] < lay["rainbow"]["x"] < lay["castle"]["x"], "the rainbow spans from the cliff to the castle"
        assert lay["trees"] == 6 and lay["flowers"] >= 20
        assert lay["zone"]["x0"] > lay["pond"]["x"] + lay["pond"]["rx"], "the meadow the cast walks starts beyond the pond"
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert errs == []

    def test_the_day_runs_through_its_hours(self, page):
        errs = _open(page)
        for tod, name in [(0.03, "dawn"), (0.16, "morning"), (0.36, "noon"), (0.55, "golden"),
                          (0.67, "sunset"), (0.77, "dusk"), (0.90, "night")]:
            _hour(page, tod, name)
        night = page.evaluate("({sun: _uni4.sunXY().up, moon: _uni4.moonXY().up, aurora: _uni4.look().aurora, win: _uni4.look().win, stars: _uni4.look().stars})")
        assert not night["sun"] and night["moon"], "night: the moon is up, the sun is down"
        assert night["aurora"] == 1 and night["win"] == 1 and night["stars"] == 1, "the aurora, the castle windows and the stars are out"
        _hour(page, 0.36, "noon")
        assert page.evaluate("_uni4.sunXY().up && !_uni4.moonXY().up && _uni4.look().aurora === 0")
        # the clock runs by itself: speeded up, the morning turns to noon
        _hour(page, 0.16, "morning")
        page.evaluate("_uni4.setSpeed(40)")
        page.wait_for_function("_uni4.phase() === 'noon'", timeout=15_000)
        assert errs == []

    def test_tapping_the_sun_or_the_moon_moves_to_the_next_hour(self, page):
        _open(page)
        _hour(page, 0.36, "noon")
        _tap(page, page.evaluate("_uni4.sunXY()"))
        page.wait_for_function("_uni4.phase() === 'golden'", timeout=6_000)
        _hour(page, 0.90, "night")
        _tap(page, page.evaluate("_uni4.moonXY()"))
        page.wait_for_function("_uni4.tod() > 0.94 || _uni4.tod() < 0.05", timeout=6_000)
        assert page.evaluate("_uni4.taps().hour") == 2

    def test_tapping_the_falls_turns_the_water_to_rainbow(self, page):
        _open(page)
        assert not page.evaluate("_uni4.rainbowWater()")
        _tap(page, page.evaluate("_uni4.fallsXY()"))
        page.wait_for_function("_uni4.rainbowWater() && _uni4.taps().falls === 1", timeout=3_000)
        assert page.evaluate("_uni4.tod()") == pytest.approx(0.13, abs=0.002), "the falls do not move the clock"

    def test_tapping_the_pond_makes_a_fish_jump(self, page):
        _open(page)
        _tap(page, page.evaluate("_uni4.pondXY()"))
        page.wait_for_function("_uni4.fishUp() && _uni4.ripples() > 0", timeout=3_000)
        page.wait_for_function("!_uni4.fishUp()", timeout=4_000)                       # and back into the water

    def test_tapping_the_castle_sets_off_fireworks(self, page):
        _open(page)
        _hour(page, 0.90, "night")
        _tap(page, page.evaluate("_uni4.castleXY()"))
        page.wait_for_function("_uni4.rockets() === 3", timeout=3_000)
        page.wait_for_function("_uni4.rockets() === 0 && _uni4.fxCount() >= 20", timeout=6_000)   # they burst into stars

    def test_tapping_the_rainbow_a_tree_a_flower_and_the_sky(self, page):
        errs = _open(page)
        _hour(page, 0.36, "noon")
        _tap(page, page.evaluate("_uni4.rainbowXY()"))
        page.wait_for_function("_uni4.shimmering()", timeout=3_000)
        before = page.evaluate("_uni4.fxCount()")
        _tap(page, page.evaluate("_uni4.treeXY(1)"))
        page.wait_for_function(f"_uni4.fxCount() >= {before} + 15 && _uni4.taps().tree === 1", timeout=3_000)      # a flurry of petals
        i = page.evaluate("(() => { for (let i = 0; i < _uni4.layout().flowers; i++){ const p = _uni4.flowerXY(i); if (p.x > 20 && _uni4.hitAt(p.x, p.y) === null) return i; } return -1; })()")
        assert i >= 0
        _tap(page, page.evaluate(f"_uni4.flowerXY({i})"))
        page.wait_for_function(f"_uni4.kicks()[{i}] > 0.2 && _uni4.taps().flower === 1", timeout=3_000)
        assert sum(1 for k in page.evaluate("_uni4.kicks()") if k > 0) == 1, "only the tapped flower nods"
        _tap(page, page.evaluate("_uni4.skyXY()"))
        page.wait_for_function("_uni4.shooting() && _uni4.taps().sky === 1", timeout=3_000)
        assert page.evaluate("_uni4.taps()") == {"cast": 0, "hour": 0, "falls": 0, "pond": 0, "castle": 0, "tree": 1, "flower": 1, "rainbow": 1, "sky": 1}
        assert errs == []


class TestCast:
    def test_the_mare_and_her_foal_live_in_the_meadow(self, page):
        errs = _open(page)
        fam = page.evaluate("_uni4.family()")
        zone = page.evaluate("_uni4.layout().zone")
        assert [a["role"] for a in fam] == ["mare", "foal"]
        assert fam[0]["coat"] == "pearl" and not fam[0]["foal"] and fam[1]["foal"]
        assert fam[1]["s"] < fam[0]["s"] * 0.8, "the foal is clearly smaller"
        assert all(zone["x0"] - 5 <= a["x"] <= zone["x1"] + 5 and zone["y0"] - 1 <= a["y"] <= zone["y1"] + 1 for a in fam)
        # she strolls: within a while the mare has moved on
        x0 = fam[0]["x"]
        page.wait_for_function(f"Math.abs(_uni4.family()[0].x - {x0}) > 30", timeout=20_000)
        assert errs == []

    def test_visitors_cross_in_every_coat_and_a_gallop_is_faster(self, page):
        errs = _open(page)
        assert page.evaluate("_uni4.spawn({n: 3, dir: 1, run: false, lane: 0.5})") == 3
        party = page.evaluate("_uni4.visitors()")[0]
        coats = [m["coat"] for m in party["members"]]
        assert len(set(coats)) == 3 and "pearl" not in coats, "three different coats, none the mare's"
        assert all(m["role"] == "visitor" and m["y"] > HZ + 150 for m in party["members"])

        def speed(run):
            page.evaluate("_uni4.clearVisitors()")
            page.evaluate(f"_uni4.spawn({{n: 1, dir: 1, run: {run}, lane: 0.5, foal: false}})")
            a = page.evaluate("[_uni4.visitors()[0].members[0].x, _uni4.time()]")
            page.wait_for_function(f"_uni4.time() > {a[1]} + 1.5", timeout=10_000)
            b = page.evaluate("[_uni4.visitors()[0].members[0].x, _uni4.time()]")
            return (b[0] - a[0]) / (b[1] - a[1])
        walk, run = speed("false"), speed("true")
        assert walk > 20 and run > walk * 2.5, f"walk {walk:.0f}/s, gallop {run:.0f}/s"
        assert errs == []

    def test_the_flyer_crosses_the_sky_on_her_wings(self, page):
        errs = _open(page)
        assert page.evaluate("_uni4.fly({dir: 1, y: 200})") is True
        f = page.evaluate("_uni4.flyer()")
        assert f["role"] == "flyer" and f["wings"] and f["fly"] == 1 and f["y"] < HZ - 150
        assert page.evaluate("_uni4.fly()") is False, "one flyer at a time"
        page.wait_for_function(f"_uni4.flyer() && _uni4.flyer().x > {f['x']} + 120", timeout=10_000)
        page.wait_for_function("_uni4.fxCount() > 3", timeout=5_000)                   # she trails sparkles
        assert page.evaluate("_uni4.act('flyer')") is True
        assert page.evaluate("_uni4.flyer().act") == "loop"                           # a somersault
        assert errs == []

    def test_tapping_a_unicorn_gets_her_magic(self, page):
        errs = _open(page)
        page.evaluate("_uni4.spawn({n: 1, dir: 1, run: false, lane: 1, foal: false})")
        page.wait_for_function("(() => { const a = _uni4.visitors()[0].members[0]; return a.x > 260 && _uni4.hitAt(a.cx, a.cy) === 'visitor'; })()", timeout=30_000)
        a = page.evaluate("_uni4.visitors()[0].members[0]")
        page.mouse.click(a["cx"], a["cy"])
        page.wait_for_function("_uni4.visitors()[0].members[0].act !== null", timeout=3_000)
        assert page.evaluate("_uni4.visitors()[0].members[0].act") in ("pose", "jump", "hearts", "toot")
        assert page.evaluate("_uni4.taps().cast") == 1
        assert errs == []

    def test_the_unicorn_tricks(self, page):
        errs = _open(page)
        # the horn-flare rear: stars burst from the tip of the horn
        before = page.evaluate("_uni4.fxCount()")
        assert page.evaluate("_uni4.act('mare', 'pose')") is True
        page.wait_for_function(f"_uni4.family()[0].pose > 0.45 && _uni4.fxCount() >= {before} + 12", timeout=6_000)
        horn = page.evaluate("_uni4.hornXY(0)"); mare = page.evaluate("_uni4.family()[0]")
        assert horn["y"] < mare["cy"], "the horn is above her middle"
        # the leap leaves a little rainbow
        assert page.evaluate("_uni4.act('foal', 'jump')") is True
        page.wait_for_function("_uni4.family()[1].yOff < -15 && _uni4.arcs() === 1", timeout=3_000)
        page.wait_for_function("_uni4.family()[1].act === null && _uni4.family()[1].yOff === 0", timeout=4_000)
        # hearts, the sparkly toot, and an unknown trick falls back to the pose
        page.wait_for_function("_uni4.family()[0].act === null", timeout=8_000)
        for trick in ("hearts", "toot"):
            assert page.evaluate(f"_uni4.act('mare', '{trick}')") is True
            assert page.evaluate("_uni4.family()[0].act") == trick
            n = page.evaluate("_uni4.fxCount()")
            page.wait_for_function(f"_uni4.fxCount() > {n}", timeout=3_000)
        assert page.evaluate("_uni4.act('mare', 'cartwheel')") is True and page.evaluate("_uni4.family()[0].act") == "pose"
        assert page.evaluate("_uni4.act('nobody')") is False
        assert errs == []

    def test_horns_glow_at_night(self, page):
        _open(page)
        _hour(page, 0.36, "noon")
        page.wait_for_function("_uni4.family()[0].glow < 0.15", timeout=5_000)
        _hour(page, 0.90, "night")
        page.wait_for_function("_uni4.family()[0].glow > 0.5", timeout=5_000)

    def test_bunnies_hop_and_stand_up_when_tapped(self, page):
        errs = _open(page)
        bun = page.evaluate("_uni4.bunnies()")
        assert len(bun) == 3 and all(b["y"] > 860 for b in bun), "three bunnies in the front grass"
        page.wait_for_function("_uni4.bunnies().some(b => b.hop > 0.2)", timeout=20_000)
        i = page.evaluate("_uni4.bunnies().findIndex(b => b.hop > 0)")
        x0 = page.evaluate(f"_uni4.bunnies()[{i}].x")
        page.wait_for_function(f"Math.abs(_uni4.bunnies()[{i}].x - {x0}) > 12", timeout=5_000)
        # a tap: she stands up (her pose), then hops away
        page.wait_for_function("(() => { const b = _uni4.bunnies()[0]; return b.hop === 0 && !b.act && _uni4.hitAt(b.cx, b.cy) === 'bunny'; })()", timeout=20_000)
        b = page.evaluate("_uni4.bunnies()[0]")
        page.mouse.click(b["cx"], b["cy"])
        page.wait_for_function("_uni4.bunnies()[0].act === 'pose'", timeout=3_000)
        page.wait_for_function("_uni4.bunnies()[0].act === null && _uni4.bunnies()[0].hop > 0", timeout=10_000)
        assert errs == []

    def test_the_swan_family_glides_on_the_pond(self, page):
        errs = _open(page)
        sw = page.evaluate("_uni4.swans()"); P = page.evaluate("_uni4.layout().pond")
        assert [s["role"] for s in sw] == ["swan", "cygnet", "cygnet"]
        assert all(((s["x"] - P["x"]) / P["rx"]) ** 2 + ((s["y"] - P["y"]) / P["ry"]) ** 2 < 1 for s in sw), "all on the water"
        assert sw[1]["s"] < sw[0]["s"], "the cygnets are drawn smaller (and the rig gives them baby proportions)"
        x0 = sw[0]["x"]
        page.wait_for_function(f"Math.abs(_uni4.swans()[0].x - {x0}) > 8", timeout=10_000)
        n = page.evaluate("_uni4.ripples()")
        assert page.evaluate("_uni4.act('swan')") is True
        page.wait_for_function("_uni4.swans()[0].pose > 0.3", timeout=4_000)           # she beats her wings
        assert errs == []


class TestFitAndLifecycle:
    def test_a_phone_gets_a_low_cliff_and_a_smaller_cast(self, page):
        page.set_viewport_size({"width": 390, "height": 844})
        errs = _open(page)
        lay = page.evaluate("_uni4.layout()")
        assert lay["narrow"] and lay["DW"] < 500 and lay["CLY"] < 0.7 and lay["CS"] < 0.7
        assert lay["trees"] == 3 and lay["cliffTop"] > 500, "the cliff top stays below the game panel"
        assert len(page.evaluate("_uni4.bunnies()")) == 2 and len(page.evaluate("_uni4.swans()")) == 2
        fam = page.evaluate("_uni4.family()")
        assert all(0 < a["cx"] < 390 and a["cy"] > 844 * 0.6 for a in fam)
        assert page.evaluate("_uni4.spawn({dir: 1})") == 1, "one visitor at a time on a phone"
        # back to a wide window: the full valley returns
        page.set_viewport_size({"width": 1280, "height": 800})
        page.wait_for_function("!_uni4.layout().narrow && _uni4.layout().trees === 6 && _uni4.bunnies().length === 3 && _uni4.family().length === 2", timeout=5_000)
        assert errs == []

    def test_restart_leaves_one_canvas_and_no_errors(self, page):
        errs = _open(page)
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_function("!!window._uni4 && _uni4.ready() && _uni4.family().length === 2", timeout=TIMEOUT)
        page.wait_for_timeout(600)
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert page.evaluate("_uni4.perf().costEma") < 12
        assert errs == []


class TestInGame:
    def test_the_unicorn_theme_loads_the_rebuilt_valley(self, page):
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.evaluate("pickTheme('girls')")
        page.wait_for_function("!!window._uni4 && _uni4.ready() && _uni4.family().length === 2", timeout=TIMEOUT)
        info = page.evaluate("""() => ({
            body: document.body.classList.contains('theme-girls'),
            skin: [...document.querySelectorAll('link[rel=stylesheet]')].some(l => (l.getAttribute('href') || '').endsWith('unicorns.skin.css')),
            stage: getComputedStyle(document.getElementById('stars-layer')).display,
            canvases: document.querySelectorAll('#stars-layer canvas').length,
            modules: Object.keys(window.BACKGROUNDS),
            scripts: [...document.scripts].map(s => (s.getAttribute('src') || '').split('/').slice(-2).join('/')),
            domActors: document.querySelectorAll('#stars-layer .uni, #stars-layer .u3-castle').length,
        })""")
        assert info["body"] and info["skin"] and info["stage"] == "block" and info["canvases"] == 1
        assert "unicorns4" in info["modules"] and "unicorns3" not in info["modules"], "the old valley is not loaded"
        assert "unicorn_rigs/unicorn.js" in info["scripts"] and "unicorn_rigs/critters.js" in info["scripts"] and "savanna_rigs/kit.js" in info["scripts"]
        assert not any(s.startswith("unicorns/") for s in info["scripts"]) and info["domActors"] == 0, "everything is drawn on the one canvas"
        assert len(page.evaluate("_uni4.bunnies()")) == 3 and len(page.evaluate("_uni4.swans()")) == 3
        # another theme: the valley cleans up after itself; and back again
        page.evaluate("pickTheme('savanna')")
        page.wait_for_function("document.body.classList.contains('theme-savanna') && !window._uni4", timeout=TIMEOUT)
        page.evaluate("pickTheme('girls')")
        page.wait_for_function("!!window._uni4 && _uni4.ready() && _uni4.family().length === 2", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('#stars-layer canvas').length") == 1
        assert errs == []
