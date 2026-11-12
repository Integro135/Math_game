"""The REEF, painted again from scratch (backgrounds/reef4.bg.js, the 🐠 theme):
a lush, deep reef — two coral masses framing a channel of sand, every colony
painted with light and shade, sea fans and soft corals swaying, real reef fish.
All of that richness is BAKED: the whole still picture is one opaque layer, the
moving light is one small masked layer, every creature is a FLIPBOOK (its
swimming loop rendered once, then one image blit per frame); only a creature in
the middle of its trick is drawn live. The scene tests run on the standalone
reef4.html harness (window._reef4 hooks); the last class opens the real game.
The cleaning station has its own file (test_reef_station.py)."""
from pathlib import Path
import pytest
from helpers import GAME_URL, TIMEOUT

REEF = Path(r"c:\Code\subtraction_game\backgrounds\reef4.html").as_uri()
SAND = 800           # the sand line in design units


def _open(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" and "font" not in m.text.lower() else None)
    page.goto(REEF)
    page.wait_for_function("!!window._reef4 && _reef4.ready() && _reef4.baked()", timeout=TIMEOUT)
    # the harness bar sits over the water — out of the way of the real taps below;
    # quality is pinned (headless frame gaps would step it down by themselves), the
    # clock is held and nothing happens on the schedule — each test brings its own
    page.evaluate("document.getElementById('bar').style.display = 'none'; _reef4.quality(2); _reef4.setSpeed(0); _reef4.auto(false)")
    page.wait_for_function("_reef4.perf().queue === 0 && _reef4.perf().books >= 10", timeout=TIMEOUT)
    return errs


def _hour(page, tod, name):
    page.evaluate(f"_reef4.setTod({tod})")
    page.wait_for_function(f"_reef4.phase() === '{name}'", timeout=5_000)


def _tap_when_free(page, hook):
    """A real tap on a target once no creature is swimming in front of it — or about
    to (they keep moving between the look and the tap, so the look takes a margin)."""
    page.wait_for_function(f"(() => {{ const p = _reef4.{hook}; return [[0, 0], [-24, 0], [24, 0], [0, -24], [0, 24]].every(d => _reef4.hitAt(p.x + d[0], p.y + d[1]) === null); }})()", timeout=30_000)
    xy = page.evaluate(f"_reef4.{hook}")
    page.mouse.click(xy["x"], xy["y"])


class TestPicture:
    def test_the_reef_is_laid_out(self, page):
        errs = _open(page)
        lay = page.evaluate("_reef4.layout()")
        DW = lay["DW"]
        assert not lay["narrow"]
        assert lay["left"]["x1"] < DW * 0.35 and lay["right"]["x0"] > DW * 0.65, "a coral mass on the left, another on the right — the middle is open sand under the game card"
        assert lay["station"]["x"] < lay["left"]["x1"] and lay["left"]["x1"] < lay["chest"]["x"] < lay["right"]["x0"]
        assert (lay["anemones"], lay["clams"], lay["stars"]) == (2, 2, 4)
        assert lay["corals"] >= 100 and lay["plants"] >= 14, "a dense reef: over a hundred painted colonies, the sea fans and soft corals swaying"
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert errs == []

    def test_the_day_is_a_gradient_not_a_repaint(self, page):
        errs = _open(page)
        bakes = page.evaluate("_reef4.perf().bakes")
        for tod, name in [(0.03, "dawn"), (0.16, "morning"), (0.36, "noon"), (0.55, "golden"),
                          (0.67, "sunset"), (0.77, "dusk"), (0.90, "night")]:
            _hour(page, tod, name)
        night = page.evaluate("_reef4.look()")
        assert night["glow"] == 1 and night["ovA"] > 0.5 and night["ray"] == 0, "night: a deep gradient over the frame, the reef's own light showing, no sun rays"
        _hour(page, 0.36, "noon")
        assert page.evaluate("_reef4.look().ovA") == 0, "by day there is no overlay at all"
        assert page.evaluate("_reef4.perf().bakes") == bakes, "a whole day went by and nothing was baked or repainted"
        # the clock runs by itself: speeded up, the morning turns to noon
        _hour(page, 0.16, "morning")
        page.evaluate("_reef4.setSpeed(40)")
        page.wait_for_function("_reef4.phase() === 'noon'", timeout=15_000)
        assert errs == []

    def test_tapping_the_bright_patch_of_surface_moves_to_the_next_hour(self, page):
        _open(page)
        _hour(page, 0.36, "noon")
        _tap_when_free(page, "sunXY()")
        page.wait_for_function("_reef4.phase() === 'golden' && _reef4.taps().hour === 1", timeout=6_000)


class TestCheapToRender:
    def test_every_creature_is_one_image_and_a_frame_paints_few_pixels(self, page):
        errs = _open(page)
        page.wait_for_timeout(1200)
        p = page.evaluate("_reef4.perf()")
        assert p["live"] == 0, "nobody is doing a trick: not one creature is drawn as vectors"
        assert p["cast"] >= 24, f"a full reef: {p['cast']} creatures"
        assert p["blits"] < 100, f"{p['blits']} image draws for the whole frame"
        assert p["screens"] < 4.8, f"by day a frame paints {p['screens']:.2f} screens of pixels"
        assert p["bookMP"] < 12, f"the flipbooks hold {p['bookMP']:.1f} megapixels"
        assert p["costEma"] < 6, f"{p['costEma']:.2f} ms of script per frame"
        _hour(page, 0.90, "night")
        page.wait_for_timeout(900)
        assert page.evaluate("_reef4.perf().screens") < 5.8, "at night: one more screen for the gradient, a quarter for the reef's own light"
        assert errs == []

    def test_only_a_creature_doing_its_trick_is_drawn_live(self, page):
        _open(page)
        assert page.evaluate("_reef4.act('octopus')") is True
        page.wait_for_function("_reef4.perf().live === 1", timeout=3_000)
        page.wait_for_function("_reef4.perf().live === 0 && _reef4.actors().find(a => a.kind === 'octopus').act === null", timeout=8_000)

    def test_a_lower_quality_tier_draws_less(self, page):
        _open(page)
        page.wait_for_timeout(800)
        full = page.evaluate("_reef4.perf()")
        assert page.evaluate("_reef4.quality(0)") == 0
        page.wait_for_timeout(900)
        low = page.evaluate("_reef4.perf()")
        assert low["Q"] == 0 and low["blits"] < full["blits"] and low["screens"] < full["screens"] - 0.3, "no rays, no caustics"
        assert page.evaluate("_reef4.quality(2)") == 2

    def test_nobody_orbits_a_target(self, page):
        _open(page)
        page.wait_for_timeout(8000)
        o = page.evaluate("_reef4.orbit()")
        assert o["arrived"] + o["passed"] > 10 and o["stale"] == 0, f"targets are retired by arriving or passing, never by timing out: {o}"


class TestCast:
    def test_the_residents(self, page):
        errs = _open(page)
        c = page.evaluate("_reef4.counts()")
        assert (c["clown"], c["dory"], c["bfly"], c["ytang"], c["angel"], c["parrot"], c["gramma"], c["idol"], c["wrasse"]) == (3, 1, 2, 2, 1, 1, 2, 2, 1)
        assert (c["chromis"], c["fusil"], c["anthias"]) == (8, 9, 7), "the school behind the sea fans, the far school, the cloud over the right-hand crest"
        assert (c["octopus"], c["seahorse"], c["puffer"], c["crab"], c["jelly"]) == (1, 1, 1, 2, 3)
        fish = page.evaluate("_reef4.actors()")
        assert all(a["y"] < SAND + 100 for a in fish) and all(0 < a["x"] < page.evaluate("_reef4.layout().DW") for a in fish if a["kind"] != "jelly")
        clowns = [a for a in fish if a["kind"] == "clown"]
        assert all(a["role"] == "clown" for a in clowns)
        far = [a for a in fish if a["kind"] == "fusil"]
        assert all(a["layer"] == -1 for a in far), "the far school is drawn behind the sun's rays"
        assert errs == []

    def test_tapping_a_fish_gets_a_trick(self, page):
        errs = _open(page)
        # wait until the parrotfish is in the clear (with a margin: it keeps swimming between the look and the tap)
        page.wait_for_function("(() => { const a = _reef4.fish().find(f => f.kind === 'parrot'); return [[0, 0], [-16, 0], [16, 0], [0, -16], [0, 16]].every(d => _reef4.hitAt(a.cx + d[0], a.cy + d[1]) === 'parrot'); })()", timeout=30_000)
        a = page.evaluate("_reef4.fish().find(f => f.kind === 'parrot')")
        page.mouse.click(a["cx"], a["cy"])
        page.wait_for_function("_reef4.fish().find(f => f.kind === 'parrot').act !== null", timeout=3_000)
        assert page.evaluate("_reef4.fish().find(f => f.kind === 'parrot').act") in ("dash", "roll")
        assert page.evaluate("_reef4.taps().cast") == 1 and page.evaluate("_reef4.bubbles()") > 0
        assert errs == []

    def test_the_tricks(self, page):
        errs = _open(page)
        # a barrel roll, hearts for the butterflyfish pair
        assert page.evaluate("_reef4.act('dory', 'roll')") is True and page.evaluate("_reef4.fish().find(f => f.kind === 'dory').act") == "roll"
        n = page.evaluate("_reef4.particles()")
        assert page.evaluate("_reef4.act('bfly')") is True and page.evaluate("_reef4.fish().find(f => f.kind === 'bfly' && f.act).act") == "hearts"
        page.wait_for_function(f"_reef4.particles() > {n}", timeout=3_000)
        # the octopus changes its coat and puffs ink
        coat = page.evaluate("_reef4.actors().find(a => a.kind === 'octopus').coat")
        assert page.evaluate("_reef4.act('octopus')") is True
        assert page.evaluate("_reef4.actors().find(a => a.kind === 'octopus').coat") != coat
        # the pufferfish balloons (drawn live while it does), a jellyfish flashes, a crab snaps
        for kind, act in (("puffer", "puff"), ("jelly", "pose"), ("crab", "pose"), ("seahorse", "pose")):
            assert page.evaluate(f"_reef4.act('{kind}')") is True
            a = page.evaluate(f"_reef4.actors().find(a => a.kind === '{kind}' && a.act)")
            assert a["act"] == act and a["live"]
        assert page.evaluate("_reef4.act('nobody')") is False
        assert errs == []

    def test_the_visitors_and_the_giants(self, page):
        errs = _open(page)
        assert page.evaluate("_reef4.visit('turtle', {dir: 1, y: 300})") == 1
        assert page.evaluate("_reef4.visit('turtle')") == 0, "one turtle at a time"
        assert page.evaluate("_reef4.visit('dolphin', {dir: -1})") == 2, "the dolphins come as a pair"
        assert page.evaluate("_reef4.visit('shark', {dir: 1, y: 400})") == 1
        t = page.evaluate("_reef4.actors().find(a => a.kind === 'turtle')")
        page.wait_for_function(f"_reef4.actors().find(a => a.kind === 'turtle').x > {t['x']} + 30", timeout=10_000)
        assert page.evaluate("_reef4.act('turtle')") is True and page.evaluate("_reef4.actors().find(a => a.kind === 'turtle').live")
        page.wait_for_function("!_reef4.actors().some(a => a.kind === 'dolphin')", timeout=30_000)          # they cross and are gone
        assert page.evaluate("_reef4.giant('whale', {dir: 1})") is True and page.evaluate("_reef4.giant('orca')") is False, "never two giants"
        g = page.evaluate("_reef4.giantNow()")
        assert g["kind"] == "whale" and g["y"] < 320, "high in the far water"
        assert errs == []

    def test_the_poop_gag(self, page):
        _open(page)
        n = page.evaluate("_reef4.particles()")
        assert page.evaluate("_reef4.poop()") is True and page.evaluate("_reef4.poops()") == 1
        assert page.evaluate("_reef4.particles()") == n + 1


class TestTaps:
    def test_an_anemone_sends_its_clownfish_darting(self, page):
        errs = _open(page)
        _tap_when_free(page, "anemXY(0)")
        page.wait_for_function("_reef4.taps().anemone === 1 && _reef4.bubbles() > 0", timeout=3_000)
        an = page.evaluate("_reef4.anemXY(0)")
        page.wait_for_function(f"_reef4.actors().filter(a => a.kind === 'clown').some(a => Math.hypot(a.cx - {an['x']}, a.cy - {an['y']}) > 150)", timeout=6_000)
        assert errs == []

    def test_a_clam_opens_on_its_pearl_and_the_chest_opens(self, page):
        errs = _open(page)
        _tap_when_free(page, "clamXY(0)")
        page.wait_for_function("_reef4.taps().clam === 1 && _reef4.clams()[0].open > 0.7", timeout=4_000)
        page.wait_for_function("_reef4.clams()[0].open < 0.4", timeout=10_000)                 # and closes again by itself
        _tap_when_free(page, "chestXY()")
        page.wait_for_function("_reef4.taps().chest === 1 && _reef4.chest().open > 0.7", timeout=4_000)
        assert errs == []

    def test_a_coral_a_sea_star_and_the_open_water(self, page):
        errs = _open(page)
        n = page.evaluate("_reef4.particles()")
        # a colony low on the left-hand reef's face (away from the station and from the cloud of anthias)
        i = page.evaluate("(() => { const n = _reef4.layout().corals, W = innerWidth, H = innerHeight; for (let i = 0; i < n; i++){ const p = _reef4.coralXY(i); if (p.x > W * 0.04 && p.x < W * 0.2 && p.y > H * 0.62 && p.y < H * 0.8) return i; } return -1; })()")
        assert i >= 0
        _tap_when_free(page, f"coralXY({i})")
        page.wait_for_function(f"_reef4.taps().coral === 1 && _reef4.particles() >= {n} + 10", timeout=3_000)      # a puff of spawn
        _tap_when_free(page, "starXY(0)")
        page.wait_for_function("_reef4.taps().star === 1", timeout=3_000)
        page.wait_for_function("!!window.ChibiWalker && _reef4.rumiLayer().children.length > 0", timeout=TIMEOUT)   # Rumi glides by
        b = page.evaluate("_reef4.bubbles()")
        _tap_when_free(page, "waterXY()")
        page.wait_for_function(f"_reef4.taps().water === 1 && _reef4.bubbles() > {b}", timeout=3_000)
        assert errs == []


class TestFitAndLifecycle:
    def test_a_phone_gets_a_smaller_reef(self, page):
        page.set_viewport_size({"width": 390, "height": 844})
        errs = _open(page)
        lay = page.evaluate("_reef4.layout()")
        assert lay["narrow"] and lay["DW"] < 500 and lay["CS"] < 0.7
        assert (lay["anemones"], lay["clams"]) == (1, 1) and lay["plants"] >= 6
        c = page.evaluate("_reef4.counts()")
        assert c["chromis"] == 5 and c["clown"] == 1 and c["crab"] == 1 and "angel" not in c
        assert page.evaluate("_reef4.perf().cast") <= 27
        # back to a wide window: the full reef returns, baked again at the new size
        page.set_viewport_size({"width": 1280, "height": 800})
        page.wait_for_function("!_reef4.layout().narrow && _reef4.counts().chromis === 8 && _reef4.baked()", timeout=10_000)
        assert errs == []

    def test_restart_leaves_one_canvas_and_no_errors(self, page):
        errs = _open(page)
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_function("!!window._reef4 && _reef4.ready() && _reef4.baked()", timeout=TIMEOUT)
        page.wait_for_timeout(600)
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert page.evaluate("_reef4.perf().costEma") < 12
        assert errs == []


class TestInGame:
    def test_the_reef_theme_loads_the_rebuilt_reef(self, page):
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.evaluate("pickTheme('reef')")
        page.wait_for_function("!!window._reef4 && _reef4.ready() && _reef4.baked()", timeout=TIMEOUT)
        info = page.evaluate("""() => ({
            body: document.body.classList.contains('theme-reef'),
            skin: [...document.querySelectorAll('link[rel=stylesheet]')].some(l => (l.getAttribute('href') || '').endsWith('reef.skin.css')),
            stage: getComputedStyle(document.getElementById('stars-layer')).display,
            canvases: document.querySelectorAll('#stars-layer canvas').length,
            modules: Object.keys(window.BACKGROUNDS),
            scripts: [...document.scripts].map(s => (s.getAttribute('src') || '').split('/').slice(-2).join('/')),
        })""")
        assert info["body"] and info["skin"] and info["stage"] == "block" and info["canvases"] == 1
        assert "reef4" in info["modules"] and "reef3" not in info["modules"] and "reef2" not in info["modules"], "the older reefs are not loaded"
        for f in ("painted.js", "jelly.js"):
            assert "reef_rigs/" + f in info["scripts"]
        assert "savanna_rigs/kit.js" in info["scripts"]
        assert page.evaluate("_reef4.station().cleaner") is not None
        # another theme: the reef cleans up after itself; and back again
        page.evaluate("pickTheme('girls')")
        page.wait_for_function("document.body.classList.contains('theme-girls') && !window._reef4", timeout=TIMEOUT)
        page.evaluate("pickTheme('reef')")
        page.wait_for_function("!!window._reef4 && _reef4.ready()", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('#stars-layer canvas').length") == 1
        assert errs == []
