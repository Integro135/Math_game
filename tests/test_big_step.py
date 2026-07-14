import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Big number ± 1/2 (עד 100)
# ─────────────────────────────────────────────────────────

class TestBigStepMode:
    def _enter_big(self, page):
        page.evaluate("setMode('big')")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def test_big_pool_is_valid_and_mixed(self, page):
        """12 problems; subtraction steps 1-6 (never crossing the ten below),
        addition steps 1-2, no carry/borrow, every session mixes sub & add.
        Across several sessions a step beyond the old 4-cap (e.g. 87-6) must occur."""
        self._enter_big(page)
        sub_steps = set()
        saw_sub = saw_add = False
        for _ in range(8):
            probs = page.evaluate("problems")
            assert len(probs) == 12
            ops = set()
            for p in probs:
                assert p["t"] == "big_step"
                assert 21 <= p["a"] <= 98, f"a out of range: {p}"
                if p["op"] == "sub":
                    saw_sub = True
                    assert p["b"] in (1, 2, 3, 4, 5, 6), f"sub step must be 1-6: {p}"
                    assert p["a"] % 10 >= p["b"], \
                        f"sub must not cross the ten below (units >= step): {p}"
                    sub_steps.add(p["b"])
                else:
                    saw_add = True
                    assert p["b"] in (1, 2), f"add step must be 1-2: {p}"
                    assert p["a"] % 10 + p["b"] <= 9, f"carry not allowed: {p}"
                ops.add(p["op"])
            assert ops == {"sub", "add"}, f"each session mixes sub & add, got {ops}"
            page.evaluate("restart()")
            page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        assert saw_sub and saw_add
        assert max(sub_steps) >= 5, \
            f"subtraction must now step beyond the old 4-cap (up to 6), got {sorted(sub_steps)}"

    def test_big_correct_answer_scores_10(self, page):
        self._enter_big(page)
        page.evaluate("problems[0] = {t: TBG, a: 75, b: 1, op: 'sub'}; idx = 0; loadProblem()")
        page.wait_for_timeout(200)
        page.fill("#ans", "74")
        page.click("#chk-btn")
        page.wait_for_function("score === 10", timeout=TIMEOUT)
        assert page.evaluate(
            "document.getElementById('ans').classList.contains('ans-ok')")

    def test_big_add_correct_answer_accepted(self, page):
        """REGRESSION: a TBG *addition* (e.g. 32+1=33) must be accepted when
        answered correctly. checkAns once lacked a TBG branch and fell back to
        num1-num2, silently marking every big +1/+2 correct answer as wrong."""
        self._enter_big(page)
        page.evaluate("problems[0] = {t: TBG, a: 32, b: 1, op: 'add'}; idx = 0; loadProblem()")
        page.wait_for_timeout(200)
        page.fill("#ans", "33")
        page.click("#chk-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("!!(report[idx] && report[idx].gotCorrect)"), \
            "32+1=33 must be marked correct"
        assert page.evaluate(
            "document.getElementById('ans').classList.contains('ans-ok')")

    def test_big_all_four_shapes_accept_correct_answer(self, page):
        """Every −1/−2/+1/+2 shape accepts its right answer (op respected)."""
        self._enter_big(page)
        cases = [("sub", 75, 1, 74), ("sub", 88, 2, 86),
                 ("add", 32, 1, 33), ("add", 77, 2, 79)]
        for op, a, bb, ans in cases:
            page.evaluate("setMode('big'); idx=0")
            page.wait_for_timeout(120)
            page.evaluate(
                f"problems[0]={{t:TBG,a:{a},b:{bb},op:'{op}'}}; idx=0; loadProblem()")
            page.wait_for_timeout(150)
            ok = page.evaluate(
                f"(()=>{{document.getElementById('ans').value='{ans}';"
                f"checkAns();return !!(report[idx]&&report[idx].gotCorrect);}})()")
            assert ok, f"{a}{'+' if op=='add' else '-'}{bb}={ans} must be accepted"

    def test_big_wrong_then_windowed_nl_revealed(self, page):
        """Wrong commit → red border + penalty; the number line is hidden while
        fresh and then revealed WINDOWED around num1 (10 below / 10 above)."""
        self._enter_big(page)
        page.evaluate("problems[0] = {t: TBG, a: 75, b: 1, op: 'sub'}; idx = 0; loadProblem()")
        page.wait_for_timeout(200)
        # hidden before the first mistake (try-first lock)
        assert page.evaluate(
            "document.getElementById('nl-panel').style.display") == "none"
        page.fill("#ans", "73")
        page.click("#chk-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate(
            "document.getElementById('ans').classList.contains('ans-err')")
        # revealed and windowed: ticks span 65..85, num1 centered (rider at 75)
        page.wait_for_function(
            "document.getElementById('nl-panel').style.display !== 'none'",
            timeout=TIMEOUT)
        nums = page.evaluate(
            "[...document.querySelectorAll('#nl-panel .nl-num')].map(n=>+n.textContent)")
        assert min(nums) == 65 and max(nums) == 85, \
            f"NL window must be 65..85 for num1=75, got {min(nums)}..{max(nums)}"
        # rider starts dead center (75 → 50% across the bar)
        left = page.evaluate(
            "parseFloat(document.getElementById('nl-dot').style.left)")
        assert abs(left - 50) < 0.5, f"rider should start centered at 50%, got {left}"

    def test_big_digit_hint_shows_units_math(self, page):
        """The ? hint button carries the units-only expression (e.g. 2-2)."""
        self._enter_big(page)
        page.evaluate("problems[0] = {t: TBG, a: 32, b: 2, op: 'sub'}; idx = 0; loadProblem()")
        page.wait_for_timeout(200)
        btn = page.locator("#digit-hint-btn")
        assert btn.evaluate("el => el.style.display !== 'none'")
        assert btn.get_attribute("data-hint") == "2-2"
