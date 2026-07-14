import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Tens problems (TT) — מלך & מלכה
# ─────────────────────────────────────────────────────────

class TestTensProblems:
    """
    TT (tens) problems: addition/subtraction of round tens (10-90).
    Injected into mode 20 (מלך) and mode 'mx' (מלכה) — ≥5 per session.
    """

    def _find_tt(self, page):
        """Return index of first TT problem in current session, or None."""
        consts = page.evaluate("({TT})")
        ptypes = page.evaluate("[...problems].map(p => p.t)")
        return next((i for i, t in enumerate(ptypes) if t == consts["TT"]), None)

    def test_tt_appears_5_times_in_melech(self, page):
        """Round-tens (TT) were merged into the Queen game ('mx'): the tens
        exercise type is mx-only (data.js EXERCISE_INDEX: tens → modes:['mx']).
        Mode 'up to 20' (עַד 20) survives as a plain standard mode and therefore
        carries NO TT problems. Assert that current split: mode 20 has zero TT,
        while mode 'mx' supplies them."""
        # Mode 20 is a standard mode with no round-tens at all.
        page.evaluate("setMode(20)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(200)
        consts = page.evaluate("({TT})")
        for session in range(5):
            ptypes = page.evaluate("[...problems].map(p => p.t)")
            tt = sum(1 for t in ptypes if t == consts["TT"])
            assert tt == 0, \
                f"Mode 20 session {session+1} must contain NO TT (tens are mx-only), got {tt}"
            page.evaluate("restart()")
            page.wait_for_timeout(100)

        # TT now lives in 'mx' (מלכה) instead.
        page.evaluate("setMode('mx'); restart()")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        ptypes = page.evaluate("[...problems].map(p => p.t)")
        assert sum(1 for t in ptypes if t == consts["TT"]) >= 1, \
            "Round-tens (TT) must now appear in the Queen (mx) game"

    def test_tt_appears_in_malka(self, page):
        """Mode mx (מלכה): every session must have ≥2 TT (round-tens) problems."""
        page.evaluate("setMode('mx')")
        page.wait_for_selector("#ans, #ans1, #tx-sub1", timeout=TIMEOUT)
        page.wait_for_timeout(300)
        consts = page.evaluate("({TT})")
        ptypes = page.evaluate("[...problems].map(p => p.t)")
        count = sum(1 for t in ptypes if t == consts["TT"])
        assert count >= 2, \
            f"Mode mx (מלכה): expected ≥2 TT problems per session, got {count}"

    def test_tt_nl_panel_at_num1(self, page):
        """TT problem: NL hidden while fresh; after the first mistake it
        appears with the kangaroo at num1 (0-100 scale)."""
        # TT is wired only into 'mx' (data.js EXERCISE_INDEX), where tens.ex.js
        # make('mx') always emits exactly 2 TT problems -> _find_tt always hits.
        page.evaluate("setMode('mx')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        tt_idx = self._find_tt(page)
        assert tt_idx is not None, "Mode mx must contain a TT problem"

        page.evaluate(f"idx = {tt_idx}; loadProblem()")
        page.wait_for_timeout(200)
        assert not page.locator("#nl-panel").is_visible(), \
            "#nl-panel must be hidden before the first mistake (TT)"
        reveal_aids(page)
        assert page.locator("#nl-panel").is_visible(), \
            "#nl-panel must appear after the first mistake (TT)"

        num1 = page.evaluate("num1")
        dot_pct = page.evaluate(
            "parseFloat(document.getElementById('nl-dot').style.left || '0')"
        )
        expected_pct = num1   # num1/100 * 100% == num1%
        assert abs(dot_pct - expected_pct) < 1, \
            f"Kangaroo should be at {expected_pct}% for TT (num1={num1}), got {dot_pct}%"

    def test_tt_correct_answer_accepted(self, page):
        """TT problem: submitting the correct tens answer marks the problem done."""
        # TT lives only in 'mx'; tens.ex.js make('mx') always emits 2 TT problems.
        page.evaluate("setMode('mx')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        tt_idx = self._find_tt(page)
        assert tt_idx is not None, "Mode mx must contain a TT problem"

        page.evaluate(f"idx = {tt_idx}; loadProblem()")
        page.wait_for_timeout(200)

        state = get_state(page)
        ans = correct_answer(state)
        submit_answer(page, ans)
        page.wait_for_timeout(300)

        new_state = get_state(page)
        assert new_state["done"], \
            f"TT problem should be done after correct answer {ans[1]}"
