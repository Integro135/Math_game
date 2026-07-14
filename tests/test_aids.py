import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Jar stage display module
# ─────────────────────────────────────────────────────────

class TestJarStageDisplay:
    def _open_jar(self, page, a=4):
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.evaluate(
            f"problems[0] = {{t: TA, a: {a}, b: 3}}; idx = 0; loadProblem()")
        page.wait_for_timeout(200)
        reveal_aids(page)
        page.wait_for_timeout(1800)
        page.evaluate("toggleAidMode('nl')")
        page.wait_for_function(
            "!!document.querySelector('#pgm-ck-jar.jst-root')", timeout=TIMEOUT)
        page.wait_for_timeout(300)

    def test_jar_mounts_with_problem_count(self, page):
        """The dynamically-loaded stage renders one item per counted unit."""
        self._open_jar(page, a=4)
        assert page.evaluate("typeof JAR_STAGE") == "object"
        assert page.locator("#pgm-ck-jar .jst-item").count() == 4
        assert page.locator("#pgm-ck-jar .ck-jar-bg").count() == 1, \
            "container art must come from the active aid variant"

    def test_jar_plus_minus_update_items(self, page):
        self._open_jar(page, a=4)
        page.click("#pgm-btn-plus")
        page.wait_for_timeout(600)
        assert page.locator("#pgm-ck-jar .jst-item").count() == 5
        assert page.inner_text("#pgm-val") == "5"
        page.click("#pgm-btn-minus")
        page.wait_for_timeout(600)
        assert page.locator("#pgm-ck-jar .jst-item").count() == 4

    def test_jar_variant_swaps_with_theme(self, page):
        """Switching themes re-mounts the jar with the new variant's art."""
        self._open_jar(page, a=3)
        before = page.evaluate(
            "document.querySelector('#pgm-ck-jar .jst-item').innerHTML")
        page.evaluate("applyTheme('galaxy')")
        page.wait_for_timeout(2200)
        page.evaluate("problems[0] = {t: TA, a: 3, b: 2}; idx = 0; loadProblem()")
        page.wait_for_timeout(200)
        reveal_aids(page)
        page.wait_for_timeout(1800)
        page.evaluate("toggleAidMode('nl')")
        page.wait_for_function(
            "!!document.querySelector('#pgm-ck-jar.jst-root')", timeout=TIMEOUT)
        page.wait_for_timeout(300)
        after = page.evaluate(
            "document.querySelector('#pgm-ck-jar .jst-item').innerHTML")
        assert before != after, "item art must change with the aid variant"




# ─────────────────────────────────────────────────────────
# Fixed aid-toggle icons (identical across backgrounds)
# ─────────────────────────────────────────────────────────

class TestAidToggleIcons:
    def _open_menu(self, page):
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(200)
        reveal_aids(page)
        page.wait_for_timeout(1800)
        page.click("#games-drop-btn")
        page.wait_for_timeout(250)

    def test_menu_uses_two_fixed_svg_icons(self, page):
        self._open_menu(page)
        assert page.evaluate(
            "document.querySelectorAll('#games-menu .gm-item svg.aid-ico').length") == 2
        assert page.evaluate(
            "!!document.querySelector('#games-drop-btn svg.aid-ico')")

    def test_icons_identical_across_backgrounds(self, page):
        self._open_menu(page)
        girls = page.evaluate(
            "document.querySelector('#games-menu .gm-item svg.aid-ico').outerHTML")
        page.keyboard.press("Escape")
        page.evaluate("applyTheme('galaxy')")
        page.wait_for_timeout(2000)
        self._open_menu(page)
        galaxy = page.evaluate(
            "document.querySelector('#games-menu .gm-item svg.aid-ico').outerHTML")
        assert girls == galaxy, "toggle icons must be identical on every background"
