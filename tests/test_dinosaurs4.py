"""The VOLCANO VALLEY, rebuilt from scratch (backgrounds/dinosaurs4.bg.js, the 🦕
theme): the volcano on the right with its two shows (an eruption and a meteor
shower), the lake and its long-necked swimmer, palms, a full day — and families
of T-rex, raptors, brontosaurus, parasaurolophus, stegosaurus and triceratops
crossing the valley, a pteranodon that drops an egg, and the baby that hatches
from it; every one a canvas rig from dinosaur_rigs/. The scene tests run on the
standalone dinosaurs4.html harness (window._dino4 hooks); the last class opens
the real game."""
from pathlib import Path
import pytest
from helpers import GAME_URL, TIMEOUT

DINO = Path(r"c:\Code\subtraction_game\backgrounds\dinosaurs4.html").as_uri()
KINDS = ["trex", "raptor", "bronto", "para", "stego", "trike"]
PLAIN_Y = 722        # the cast's lanes start below this (design units)


def _open(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" and "font" not in m.text.lower() else None)
    page.goto(DINO)
    page.wait_for_function("!!window._dino4 && _dino4.ready() && _dino4.kinds().length === 6 && !!window.PteroRig && !!window.BabyRig", timeout=TIMEOUT)
    # the harness bar sits over the sky — out of the way of the real taps below
    # (the scene filters clicks on buttons, like the game UI); the clock is held
    # and nobody comes or performs on the schedule — each test brings its own
    page.evaluate("document.getElementById('bar').style.display = 'none'; _dino4.setSpeed(0); _dino4.auto(false); _dino4.clearHerds()")
    return errs


def _hour(page, tod, name):
    page.evaluate(f"_dino4.setTod({tod})")
    page.wait_for_function(f"_dino4.phase() === '{name}'", timeout=5_000)


def _tap(page, xy):
    assert page.evaluate(f"_dino4.hitAt({xy['x']}, {xy['y']})") is None, "nobody stands in front of the target"
    page.mouse.click(xy["x"], xy["y"])


class TestValley:
    def test_the_valley_is_laid_out(self, page):
        errs = _open(page)
        lay = page.evaluate("_dino4.layout()")
        V, DW = lay["volcano"], lay["DW"]
        assert not lay["narrow"]
        assert V["x"] > DW * 0.7, "the volcano stands on the right"
        assert 0.5 < (V["x"] - V["bw"]) / DW < 0.62, "its left foot stays clear of the game card (the skin puts the card on the left)"
        assert V["rim"] < V["base"] - 250, "a tall cone"
        assert lay["lake"]["x"] < V["x"] and lay["palms"] >= 4 and lay["fronds"] >= 15
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        page.wait_for_function("_dino4.smoke() > 0", timeout=5_000)                    # the crater smokes
        assert errs == []

    def test_the_day_runs_through_its_hours(self, page):
        errs = _open(page)
        for tod, name in [(0.03, "dawn"), (0.16, "morning"), (0.36, "noon"), (0.55, "golden"),
                          (0.67, "sunset"), (0.77, "dusk"), (0.90, "night")]:
            _hour(page, tod, name)
        night = page.evaluate("({sun: _dino4.sunXY().up, moon: _dino4.moonXY().up, lava: _dino4.look().lava, stars: _dino4.look().stars})")
        assert not night["sun"] and night["moon"], "night: the moon is up, the sun is down"
        assert night["lava"] == 1 and night["stars"] == 1, "the lava lights the cone, the stars are out"
        _hour(page, 0.36, "noon")
        assert page.evaluate("_dino4.sunXY().up && !_dino4.moonXY().up && _dino4.look().lava < 0.4")
        # the clock runs by itself: speeded up, the morning turns to noon
        _hour(page, 0.16, "morning")
        page.evaluate("_dino4.setSpeed(40)")
        page.wait_for_function("_dino4.phase() === 'noon'", timeout=15_000)
        assert errs == []

    def test_tapping_the_sun_or_the_moon_moves_to_the_next_hour(self, page):
        _open(page)
        _hour(page, 0.16, "morning")
        _tap(page, page.evaluate("_dino4.sunXY()"))
        page.wait_for_function("_dino4.phase() === 'noon'", timeout=6_000)
        _hour(page, 0.90, "night")
        _tap(page, page.evaluate("_dino4.moonXY()"))
        page.wait_for_function("_dino4.tod() > 0.94 || _dino4.tod() < 0.05", timeout=6_000)
        assert page.evaluate("_dino4.taps().hour") == 2

    def test_tapping_the_volcano_alternates_an_eruption_and_a_meteor_shower(self, page):
        errs = _open(page)
        assert page.evaluate("_dino4.show()") is None and page.evaluate("_dino4.nextShow()") == "erupt"
        _tap(page, page.evaluate("_dino4.volcanoXY()"))
        page.wait_for_function("_dino4.show() && _dino4.show().type === 'erupt'", timeout=3_000)
        assert not page.evaluate("_dino4.show().boomed"), "first the 3-2-1 countdown"
        page.wait_for_function("_dino4.show() && _dino4.show().boomed && _dino4.fxCount() > 30 && _dino4.shake() > 1", timeout=6_000)   # the fountain, the ground shaking
        page.wait_for_function("_dino4.show() && _dino4.show().bombs >= 3", timeout=8_000)                                           # lava bombs
        v = page.evaluate("_dino4.volcanoXY()")
        page.mouse.click(v["x"], v["y"])                                                        # a tap during the show changes nothing
        assert page.evaluate("_dino4.shows()") == 1
        page.wait_for_function("_dino4.show() === null && _dino4.busy()", timeout=12_000)       # over — but the sky is not quiet yet
        page.wait_for_function("!_dino4.busy()", timeout=6_000)
        _tap(page, page.evaluate("_dino4.volcanoXY()"))
        page.wait_for_function("_dino4.show() && _dino4.show().type === 'storm' && _dino4.show().meteors === 10", timeout=3_000)
        page.wait_for_function("_dino4.show() === null", timeout=12_000)
        assert page.evaluate("_dino4.shows()") == 2 and page.evaluate("_dino4.nextShow()") == "erupt"
        assert errs == []

    def test_a_show_sends_everyone_running(self, page):
        errs = _open(page)
        page.evaluate("_dino4.spawn('trike', {adults: 2, young: 0, dir: 1, run: false, lane: 0.5})")
        page.wait_for_function("_dino4.herd()[0].x > 260", timeout=30_000)
        assert not page.evaluate("_dino4.herds()[0].fled")
        page.evaluate("_dino4.storm()")
        page.wait_for_function("_dino4.panicked() && _dino4.herds().length === 1 && _dino4.herds()[0].fled", timeout=4_000)
        lead = page.evaluate("_dino4.herd()[0]"); DW = page.evaluate("_dino4.layout().DW")
        assert lead["run"] and lead["dir"] == (-1 if lead["x"] < DW / 2 else 1), "she bolts for the nearest edge"
        page.wait_for_function("_dino4.herds().length === 0", timeout=15_000)                  # and is gone
        assert errs == []

    def test_tapping_the_lake_brings_up_the_swimmer_and_again_she_squirts(self, page):
        errs = _open(page)
        assert page.evaluate("_dino4.swimmer().state") == "down"
        _tap(page, page.evaluate("_dino4.lakeXY()"))
        page.wait_for_function("_dino4.swimmer().state === 'look' && _dino4.swimmer().up === 1", timeout=5_000)
        n = page.evaluate("_dino4.fxCount()")
        _tap(page, page.evaluate("_dino4.lakeXY()"))
        page.wait_for_function(f"_dino4.swimmer().squirts === 1 && _dino4.fxCount() > {n} + 5", timeout=4_000)     # an arc of drops
        page.wait_for_function("_dino4.swimmer().state === 'down'", timeout=12_000)            # and under she goes
        assert page.evaluate("_dino4.taps().lake") == 2
        assert errs == []

    def test_tapping_a_palm_drops_a_coconut_and_the_sky_sends_flyers(self, page):
        errs = _open(page)
        _hour(page, 0.36, "noon")
        _tap(page, page.evaluate("_dino4.palmXY(0)"))
        page.wait_for_function("_dino4.coconuts() === 1 && _dino4.taps().palm === 1", timeout=3_000)
        page.wait_for_function("_dino4.coconuts() === 0", timeout=10_000)                      # it bounces, rolls, fades
        before = page.evaluate("_dino4.flocks()")
        _tap(page, page.evaluate("_dino4.skyXY()"))
        page.wait_for_function(f"_dino4.flocks() === {before} + 1", timeout=3_000)
        _hour(page, 0.90, "night")
        _tap(page, page.evaluate("_dino4.skyXY()"))
        page.wait_for_function("_dino4.shooting()", timeout=3_000)                              # at night: a shooting star
        assert page.evaluate("_dino4.taps().sky") == 2
        assert errs == []


class TestCast:
    @pytest.mark.parametrize("kind", KINDS)
    def test_a_family_of_every_kind_crosses_the_valley(self, page, kind):
        errs = _open(page)
        assert page.evaluate(f"_dino4.spawn('{kind}', {{adults: 2, young: 1, dir: 1, run: false, lane: 0.5}})") == 3
        herd = page.evaluate("_dino4.herds()")[0]
        assert herd["kind"] == kind and herd["dir"] == 1 and not herd["run"]
        assert all(m["kind"] == kind and m["y"] > PLAIN_Y for m in herd["members"]), "families walk the meadow below the lake"
        sizes = sorted(m["s"] for m in herd["members"])
        assert [m["young"] for m in herd["members"]].count(True) == 1 and sizes[0] < sizes[1] * 0.7, "the young one is clearly smaller"
        x0 = herd["members"][0]["x"]
        page.wait_for_function(f"_dino4.herd()[0].x > {x0} + 30 && _dino4.herd()[0].go > 0.5", timeout=10_000)       # it walks in from the left
        assert errs == []

    def test_a_running_family_is_faster_than_a_walking_one(self, page):
        _open(page)

        def speed(run):
            page.evaluate("_dino4.clearHerds()")
            page.evaluate(f"_dino4.spawn('raptor', {{adults: 1, young: 0, dir: 1, run: {run}, lane: 0.5}})")
            a = page.evaluate("[_dino4.herd()[0].x, _dino4.time()]")
            page.wait_for_function(f"_dino4.time() > {a[1]} + 1.5", timeout=10_000)
            b = page.evaluate("[_dino4.herd()[0].x, _dino4.time()]")
            return (b[0] - a[0]) / (b[1] - a[1])
        walk, run = speed("false"), speed("true")
        assert walk > 20 and run > walk * 2, f"walk {walk:.0f}/s, run {run:.0f}/s"

    def test_tapping_a_dinosaur_gets_a_trick_and_a_new_coat(self, page):
        errs = _open(page)
        page.evaluate("_dino4.spawn('stego', {adults: 1, young: 0, dir: 1, run: false, lane: 1})")
        page.wait_for_function("(() => { const a = _dino4.herd()[0]; return a.x > 280 && _dino4.hitAt(a.cx, a.cy) === 'stego'; })()", timeout=40_000)
        a = page.evaluate("_dino4.herd()[0]")
        page.mouse.click(a["cx"], a["cy"])
        page.wait_for_function("_dino4.herd()[0].act !== null", timeout=3_000)
        b = page.evaluate("_dino4.herd()[0]")
        assert b["act"] in ("pose", "jump", "fart") and b["coat"] != a["coat"], "a trick, and a new coat"
        assert page.evaluate("_dino4.taps().cast") == 1
        assert errs == []

    def test_the_trex_always_roars_and_the_ground_shakes(self, page):
        errs = _open(page)
        page.evaluate("_dino4.spawn('trex', {adults: 1, young: 0, dir: 1, run: false, lane: 0.8})")
        page.wait_for_function("(() => { const a = _dino4.herd()[0]; return a.x > 280 && _dino4.hitAt(a.cx, a.cy) === 'trex'; })()", timeout=30_000)
        a = page.evaluate("_dino4.herd()[0]")
        page.mouse.click(a["cx"], a["cy"])
        page.wait_for_function("_dino4.herd()[0].act === 'pose' && _dino4.roaring()", timeout=3_000)
        page.wait_for_function("_dino4.herd()[0].pose > 0.3", timeout=4_000)                    # the jaws open
        page.wait_for_function("_dino4.herd()[0].act === null && !_dino4.roaring()", timeout=10_000)
        assert errs == []

    def test_the_tricks_pose_jump_and_fart(self, page):
        errs = _open(page)
        page.evaluate("_dino4.spawn('para', {adults: 1, young: 0, dir: 1, run: false, lane: 0.5})")
        assert page.evaluate("_dino4.act('para', 'jump')") is True
        page.wait_for_function("_dino4.herd()[0].act === 'jump' && _dino4.herd()[0].yOff < -5", timeout=3_000)
        page.wait_for_function("_dino4.herd()[0].act === null && _dino4.herd()[0].yOff === 0", timeout=4_000)
        n = page.evaluate("_dino4.fxCount()")
        assert page.evaluate("_dino4.act('para', 'fart')") is True
        page.wait_for_function(f"_dino4.fxCount() > {n}", timeout=3_000)                         # green puffs
        # a heavy one does not jump: the brontosaurus falls back to her own pose
        page.evaluate("_dino4.clearHerds(); _dino4.spawn('bronto', {adults: 1, young: 0, dir: 1, run: false})")
        assert page.evaluate("_dino4.act('bronto', 'jump')") is True and page.evaluate("_dino4.herd()[0].act") == "pose"
        page.wait_for_function("_dino4.herd()[0].pose > 0.3", timeout=5_000)
        assert page.evaluate("_dino4.act('nobody')") is False
        assert errs == []

    def test_the_pteranodon_drops_an_egg_and_a_baby_hatches(self, page):
        errs = _open(page)
        assert page.evaluate("_dino4.fly({dir: 1, y: 200, carry: true, dropX: 1e9})") is True
        p = page.evaluate("_dino4.ptero()")
        assert p["kind"] == "ptero" and p["carry"] and p["y"] < 320
        assert page.evaluate("_dino4.fly()") is False, "one pteranodon at a time"
        page.wait_for_function(f"_dino4.ptero() && _dino4.ptero().x > {p['x']} + 150", timeout=10_000)
        page.wait_for_function("_dino4.ptero().x > 300", timeout=20_000)
        assert page.evaluate("_dino4.lay()") is True                                            # she lets the egg go
        assert not page.evaluate("_dino4.ptero().carry") and len(page.evaluate("_dino4.eggs()")) == 1
        egg = page.evaluate("_dino4.eggs()[0]")
        assert egg["state"] == "fall"
        page.wait_for_function("_dino4.eggs()[0].state === 'rest'", timeout=8_000)              # it falls, bounces and comes to rest
        assert page.evaluate("_dino4.eggs()[0].y") > PLAIN_Y
        assert page.evaluate("_dino4.hatch(0)") is True
        page.wait_for_function("_dino4.eggs().length && _dino4.eggs()[0].crack === 1 && _dino4.eggs()[0].hatch > 0.5", timeout=6_000)
        page.wait_for_function("_dino4.babies().length === 1", timeout=8_000)                   # out hops the baby
        baby = page.evaluate("_dino4.babies()[0]")
        assert baby["kind"] == "baby" and baby["coat"] == egg["coat"], "the baby wears the egg's colours"
        page.wait_for_function(f"Math.abs(_dino4.babies()[0].x - {baby['x']}) > 20", timeout=10_000)   # and toddles off
        page.wait_for_function("_dino4.eggs().length === 0", timeout=5_000)                     # the shell is gone
        assert errs == []

    def test_tapping_the_pteranodon_and_tapping_an_egg(self, page):
        errs = _open(page)
        page.evaluate("_dino4.fly({dir: 1, y: 220, carry: true, dropX: 1e9})")
        page.wait_for_function("(() => { const p = _dino4.ptero(); return p && p.x > 260 && _dino4.hitAt(p.cx, p.cy) === 'ptero'; })()", timeout=20_000)
        p = page.evaluate("_dino4.ptero()")
        page.mouse.click(p["cx"], p["cy"])
        page.wait_for_function("_dino4.ptero() && _dino4.ptero().act === 'pose' && !_dino4.ptero().carry && _dino4.eggs().length === 1", timeout=3_000)   # a squawk, and the egg drops
        page.wait_for_function("_dino4.eggs()[0].state === 'rest'", timeout=8_000)
        e = page.evaluate("_dino4.eggs()[0]")
        assert page.evaluate(f"_dino4.hitAt({e['cx']}, {e['cy']})") == "egg"
        page.mouse.click(e["cx"], e["cy"])
        page.wait_for_function("_dino4.eggs().length && _dino4.eggs()[0].state !== 'rest'", timeout=3_000)   # a tap hatches it at once
        page.wait_for_function("_dino4.babies().length === 1", timeout=10_000)
        b = page.evaluate("_dino4.babies()[0]")
        assert page.evaluate("_dino4.act('baby')") is True and page.evaluate("_dino4.babies()[0].act") == "pose"
        assert errs == []


class TestFitAndLifecycle:
    def test_a_phone_gets_a_smaller_valley_and_a_smaller_cast(self, page):
        page.set_viewport_size({"width": 390, "height": 844})
        errs = _open(page)
        lay = page.evaluate("_dino4.layout()")
        assert lay["narrow"] and lay["DW"] < 500 and lay["HS"] < 0.7 and lay["volcano"]["s"] < 0.85
        assert lay["trees"] == 4 and 0 < lay["lake"]["x"] < lay["DW"]
        assert page.evaluate("_dino4.spawn('raptor', {dir: 1})") <= 3, "small families on a phone"
        assert all(m["y"] > PLAIN_Y for m in page.evaluate("_dino4.herd()"))
        # back to a wide window: the full valley returns (and the stage is cleared)
        page.set_viewport_size({"width": 1280, "height": 800})
        page.wait_for_function("!_dino4.layout().narrow && _dino4.layout().trees === 10 && _dino4.herds().length === 0", timeout=5_000)
        assert errs == []

    def test_restart_leaves_one_canvas_and_no_errors(self, page):
        errs = _open(page)
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_function("!!window._dino4 && _dino4.ready() && _dino4.kinds().length === 6", timeout=TIMEOUT)
        page.wait_for_timeout(600)
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert page.evaluate("_dino4.perf().costEma") < 12
        assert errs == []

    def test_rumi_can_be_called_for_a_stroll(self, page):
        _open(page)
        page.wait_for_function("!!window.ChibiWalker", timeout=TIMEOUT)
        assert page.evaluate("_dino4.rumi()") is True
        page.wait_for_function("_dino4.rumiLayer().children.length > 0", timeout=5_000)


class TestInGame:
    def test_the_dinosaur_theme_loads_the_rebuilt_valley(self, page):
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.evaluate("pickTheme('dinosaurs')")
        page.wait_for_function("!!window._dino4 && _dino4.ready() && _dino4.kinds().length === 6", timeout=TIMEOUT)
        info = page.evaluate("""() => ({
            body: document.body.classList.contains('theme-dinosaurs'),
            skin: [...document.querySelectorAll('link[rel=stylesheet]')].some(l => (l.getAttribute('href') || '').endsWith('dinosaurs.skin.css')),
            stage: getComputedStyle(document.getElementById('stars-layer')).display,
            canvases: document.querySelectorAll('#stars-layer canvas').length,
            modules: Object.keys(window.BACKGROUNDS),
            scripts: [...document.scripts].map(s => (s.getAttribute('src') || '').split('/').slice(-2).join('/')),
            wrapRight: document.querySelector('.wrap').getBoundingClientRect().right,
        })""")
        assert info["body"] and info["skin"] and info["stage"] == "block" and info["canvases"] == 1
        assert "dinosaurs4" in info["modules"] and "dinosaurs3" not in info["modules"], "the old valley is not loaded"
        for f in ("trex.js", "raptor.js", "bronto.js", "para.js", "stego.js", "trike.js", "ptero.js", "hatch.js"):
            assert "dinosaur_rigs/" + f in info["scripts"]
        assert "savanna_rigs/kit.js" in info["scripts"] and not any(s.startswith("dino_rigs/") for s in info["scripts"])
        # the game card hugs the left; the whole volcano stands clear of it
        lay = page.evaluate("_dino4.layout()"); V = lay["volcano"]
        assert lay["OX"] + (V["x"] - V["bw"]) * lay["S"] > info["wrapRight"], "the volcano's left foot is right of the card"
        # another theme: the valley cleans up after itself; and back again
        page.evaluate("pickTheme('girls')")
        page.wait_for_function("document.body.classList.contains('theme-girls') && !window._dino4", timeout=TIMEOUT)
        page.evaluate("pickTheme('dinosaurs')")
        page.wait_for_function("!!window._dino4 && _dino4.ready()", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('#stars-layer canvas').length") == 1
        assert errs == []
