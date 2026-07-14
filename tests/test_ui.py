import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Answer border contract (green/red, skin-proof)
# ─────────────────────────────────────────────────────────

class TestAnswerBorders:
    GREEN = "rgb(61, 220, 132)"
    RED = "rgb(255, 82, 82)"

    def _wait_border(self, page, color):
        """The input has transition:all .3s — wait for the color to settle."""
        page.wait_for_function(
            f"getComputedStyle(document.getElementById('ans')).borderColor"
            f" === '{color}'", timeout=TIMEOUT)

    def test_wrong_red_then_typing_clears(self, page):
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(200)
        page.fill("#ans", "9")
        page.click("#chk-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        self._wait_border(page, self.RED)
        page.wait_for_timeout(1700)
        page.fill("#ans", "5")
        page.wait_for_function(
            "!document.getElementById('ans').classList.contains('ans-err')",
            timeout=TIMEOUT)

    def test_correct_green_even_over_skin(self, page):
        """The state colors must win over any skin styling (galaxy active)."""
        page.evaluate("applyTheme('galaxy')")
        page.wait_for_timeout(1800)
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(200)
        page.fill("#ans", "5")
        page.click("#chk-btn")
        page.wait_for_function("score > 0", timeout=TIMEOUT)
        self._wait_border(page, self.GREEN)
