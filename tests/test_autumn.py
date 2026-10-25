"""The AUTUMN background (backgrounds/autumn.bg.js, the 🍂 theme): a golden grove
with falling leaves, sea squills, snails on the ground and up the trunks, a
hedgehog, storks and the first rain. The scene tests run on the standalone
autumn.html harness (window._aut hooks); the last class opens the real game."""
from pathlib import Path
import pytest
from helpers import GAME_URL, TIMEOUT

AUT = Path(r"c:\Code\subtraction_game\backgrounds\autumn.html").as_uri()


def _open(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(AUT)
    page.wait_for_function("!!window._aut && _aut.trees().length > 0", timeout=TIMEOUT)
    # the harness button bar sits over the foreground path — out of the way of
    # the real taps below (the scene filters clicks on buttons, like the game UI)
    page.evaluate("document.getElementById('bar').style.display = 'none'")
    return errs


class TestGrove:
    def test_trees_stand_on_both_sides_and_the_middle_stays_clear(self, page):
        _open(page)
        lay = page.evaluate("_aut.layout()")
        trees = page.evaluate("_aut.trees()")
        DW = lay["DW"]
        assert not lay["narrow"] and len(trees) == 6
        assert sum(1 for T in trees if T["x"] < DW * 0.45) == 3
        assert sum(1 for T in trees if T["x"] > DW * 0.55) == 3
        # every crown is baked from several leaf lobes and has a top above its trunk
        assert all(T["lobes"] >= 6 and T["top"] < T["base"] - T["h"] * 0.5 for T in trees)
        # the fence is on the right, the sea squills stand by the trees
        assert lay["fence"] > DW * 0.6
        assert len(lay["squills"]) == 7

    def test_leaves_fall_and_land_on_the_carpet(self, page):
        errs = _open(page)
        page.wait_for_function("_aut.leaves().released > 0", timeout=10_000)
        page.wait_for_function("_aut.leaves().landed > 0", timeout=30_000)
        lv = page.evaluate("_aut.leaves()")
        assert 0 <= lv["falling"] <= lv["max"]
        assert errs == []

    def test_tapping_a_tree_shakes_a_burst_of_leaves_loose(self, page):
        _open(page)
        before = page.evaluate("_aut.leaves().released")
        xy = page.evaluate("_aut.treeXY(0)")
        page.mouse.click(xy["x"], xy["y"])
        page.wait_for_function(f"_aut.leaves().released >= {before} + 15", timeout=3_000)
        assert page.evaluate("_aut.taps().tree") == 1
        k = page.evaluate("_aut.kicks()")
        assert sum(1 for v in k["trees"] if v > 0.3) == 1, f"only the tapped tree shakes: {k}"
        assert all(v == 0 for v in k["squills"]), "the squills stay still"

    def test_the_day_cycle_and_the_rain(self, page):
        _open(page)
        page.evaluate("_aut.setSpeed(0)")
        looks = {}
        # the look is re-derived on the next rendered frame (a repaint of every still layer)
        for name, tod, ready in [("dawn", 0.04, "mist > 0.5"), ("noon", 0.36, "daylight > 0.95"),
                                 ("golden", 0.55, "warm > 0.7"), ("night", 0.9, "daylight < 0.2")]:
            page.evaluate(f"_aut.setTod({tod})")
            page.wait_for_function(f"_aut.phase() === '{name}' && _aut.look().{ready}", timeout=5_000)
            looks[name] = page.evaluate("_aut.look()")
        assert looks["night"]["stars"] > 0.9 and looks["night"]["moon"] > 0.9
        assert looks["noon"]["stars"] == 0 and looks["golden"]["sunA"] > 0.9
        # a shower: the sky greys, drops fall, the puddles fill; then a rainbow
        page.evaluate("_aut.setTod(0.36); _aut.rain(6)")
        page.wait_for_function("_aut.rainState().k > 0.6 && _aut.rainState().drops > 50", timeout=15_000)
        assert page.evaluate("_aut.look().daylight") < looks["noon"]["daylight"]
        page.wait_for_function("_aut.rainState().phase === 'fade'", timeout=20_000)
        page.wait_for_function("_aut.rainState().rainbow > 0.5", timeout=12_000)
        assert page.evaluate("_aut.rainState().wet") > 0.3


class TestCreatures:
    def test_snails_crawl_on_the_ground_and_up_the_trunks(self, page):
        _open(page)
        sn = page.evaluate("_aut.snails()")
        kinds = [s["kind"] for s in sn]
        assert kinds.count("ground") == 4 and kinds.count("tree") == 2
        page.wait_for_timeout(1500)
        sn2 = page.evaluate("_aut.snails()")
        moved = sum(1 for a, b in zip(sn, sn2) if (a["x"], a["y"]) != (b["x"], b["y"]))
        assert moved >= 3, "snails crawl (some may be pausing)"
        assert all(s["trail"] > 0 for s in sn2), "every snail leaves a slime trail"

    def test_tapping_a_snail_tucks_it_into_its_shell(self, page):
        _open(page)
        xy = page.evaluate("_aut.snailXY(0)")
        page.mouse.click(xy["x"], xy["y"])
        page.wait_for_function("_aut.taps().snail === 1", timeout=2_000)
        page.wait_for_function("_aut.snails()[0].hide > 0.9", timeout=2_000)
        page.wait_for_function("_aut.snails()[0].hide < 0.2", timeout=8_000)   # ...and peeks out again

    def test_the_hedgehog_crosses_and_curls_up_when_tapped(self, page):
        _open(page)
        page.evaluate("_aut.hogStart(0.5)")
        page.wait_for_timeout(300)
        h0 = page.evaluate("_aut.hog()")
        assert h0["on"] and h0["curl"] == 0
        page.wait_for_timeout(800)
        assert page.evaluate("_aut.hog().x") != h0["x"], "it trundles along"
        xy = page.evaluate("_aut.hogXY()")
        page.mouse.click(xy["x"], xy["y"])
        page.wait_for_function("_aut.taps().hog === 1 && _aut.hog().curl > 0.9", timeout=2_000)
        page.wait_for_function("_aut.hog().curl < 0.2", timeout=8_000)

    def test_bees_visit_the_squills_by_day_and_a_tap_sends_petals(self, page):
        _open(page)
        page.evaluate("_aut.setTod(0.36); _aut.setSpeed(0)")
        page.wait_for_function("_aut.bees().every(b => b.away < 0.5 && b.x > 0)", timeout=5_000)
        sq = page.evaluate("_aut.squills()")
        assert all(s["flowers"] > 10 for s in sq)
        xy = page.evaluate("_aut.squillXY(3)")
        page.mouse.click(xy["x"], xy["y"])
        page.wait_for_function("_aut.taps().squill === 1", timeout=2_000)
        k = page.evaluate("_aut.kicks()")
        assert k["squills"][3] > 0.3 and all(v == 0 for i, v in enumerate(k["squills"]) if i != 3), f"only that squill sways: {k}"
        assert all(v == 0 for v in k["trees"]), "the trees stay still"
        page.evaluate("_aut.setTod(0.9)")
        page.wait_for_function("_aut.bees().every(b => b.away > 0.9)", timeout=5_000)

    def test_the_unicorn_valley_bunnies_hop_and_spring_when_tapped(self, page):
        _open(page)
        page.wait_for_function("_aut.bunnies().length === 3", timeout=TIMEOUT)
        b0 = page.evaluate("_aut.bunnies()")
        assert [b["coat"] for b in b0] == ["honey", "lavender", "pink"]
        H = page.evaluate("innerHeight")
        assert all(H * 0.93 < b["y"] < H * 1.0 for b in b0), "they hop the foreground band"
        page.wait_for_timeout(1500)
        assert [b["x"] for b in page.evaluate("_aut.bunnies()")] != [b["x"] for b in b0], "they hop along"
        for _ in range(4):                       # a moving target: aim, tap, check
            i = page.evaluate("_aut.bunnies().findIndex(b => b.active && b.x > 40 && b.x < innerWidth - 40)")
            if i < 0:
                page.wait_for_timeout(500); continue
            xy = page.evaluate(f"_aut.bunnyXY({i})")
            page.mouse.click(xy["x"], xy["y"])
            if page.evaluate("_aut.taps().bunny") > 0: break
        page.wait_for_function("_aut.taps().bunny >= 1", timeout=2_000)
        page.wait_for_timeout(500)
        assert [b["coat"] for b in page.evaluate("_aut.bunnies()")] != ["honey", "lavender", "pink"], "a new coat mid-spring"
        page.evaluate("_aut.setTod(0.9)")
        page.wait_for_function("_aut.bunnies().every(b => b.filter.includes('brightness(0.5'))", timeout=3_000)

    def test_storks_cross_the_sky_and_a_mushroom_pops_on_the_ground(self, page):
        _open(page)
        xy = page.evaluate("_aut.skyXY()")
        page.mouse.click(xy["x"], xy["y"])
        page.wait_for_function("_aut.taps().sky === 1 && _aut.storks().length === 1", timeout=2_000)
        assert page.evaluate("_aut.storks()[0].birds") >= 7
        n = page.evaluate("_aut.shrooms()")
        g = page.evaluate("_aut.groundXY()")
        page.mouse.click(g["x"], g["y"])
        page.wait_for_function(f"_aut.taps().ground === 1 && _aut.shrooms() === {n} + 1", timeout=2_000)


class TestFitAndLifecycle:
    def test_a_phone_gets_the_narrow_grove(self, page):
        page.set_viewport_size({"width": 390, "height": 844})
        errs = _open(page)
        lay = page.evaluate("_aut.layout()")
        assert lay["narrow"] and lay["DW"] < 500
        trees = page.evaluate("_aut.trees()")
        assert len(trees) == 4 and len(lay["squills"]) == 3
        assert all(0 <= T["x"] <= lay["DW"] for T in trees)
        sn = page.evaluate("_aut.snails()")
        assert [s["kind"] for s in sn].count("tree") == 1
        page.wait_for_function("_aut.bunnies().length === 2", timeout=TIMEOUT)
        # back to a wide window: the grove is re-planted
        page.set_viewport_size({"width": 1280, "height": 800})
        page.wait_for_function("!_aut.layout().narrow && _aut.trees().length === 6", timeout=5_000)
        page.wait_for_function("_aut.bunnies().length === 3", timeout=5_000)
        assert errs == []

    def test_restart_leaves_one_canvas_and_no_errors(self, page):
        errs = _open(page)
        page.evaluate("document.getElementById('restart').click()")
        page.wait_for_timeout(600)
        assert page.evaluate("document.querySelectorAll('#stage canvas').length") == 1
        assert page.evaluate("_aut.perf().costEma") < 12
        assert errs == []


class TestInGame:
    def test_the_autumn_theme_dresses_the_game(self, page):
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(GAME_URL)
        page.wait_for_function("typeof pickTheme === 'function'", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('#theme-menu .tm-item').length") == 9
        page.evaluate("pickTheme('autumn')")
        page.wait_for_function("!!window._aut", timeout=TIMEOUT)
        page.wait_for_function("!!(window.AIDS && AIDS.variants.autumn)", timeout=TIMEOUT)
        info = page.evaluate("""() => ({
            body: document.body.classList.contains('theme-autumn'),
            skin: [...document.querySelectorAll('link[rel=stylesheet]')].some(l => (l.getAttribute('href') || '').endsWith('autumn.skin.css')),
            stage: getComputedStyle(document.getElementById('stars-layer')).display,
            canvases: document.querySelectorAll('#stars-layer canvas').length,
            toggle: document.getElementById('theme-toggle').textContent,
            active: [...document.querySelectorAll('.tm-item.active')].map(b => b.getAttribute('onclick')),
            rider: AIDS.variants.autumn.numberLine.rider,
            stored: localStorage.getItem('gameTheme'),
        })""")
        assert info["body"] and info["skin"] and info["stage"] == "block" and info["canvases"] == 1
        assert info["toggle"] == "🍂" and info["active"] == ["pickTheme('autumn')"] and info["rider"] == "🦔"
        assert info["stored"] == "autumn"
        page.wait_for_function("_aut.bunnies().length === 3", timeout=TIMEOUT)   # the unicorn valley's guests
        # the theme toggle cycles through autumn and on to the first theme
        page.evaluate("toggleTheme()")
        page.wait_for_function("document.body.classList.contains('theme-girls')", timeout=TIMEOUT)
        assert page.evaluate("window._aut") is None, "the autumn scene cleaned up after itself"
        assert errs == []
