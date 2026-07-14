import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# General game-flow tests
# ─────────────────────────────────────────────────────────

class TestGameFlow:
    def test_mode10_session_has_12_problems(self, page):
        """Mode 10 must have exactly 12 problems per session (sampleWithTD)."""
        page.evaluate("setMode(10)")
        page.wait_for_timeout(120)
        assert page.evaluate("problems.length") == 12

    def test_mx_session_has_17_problems_with_each_type(self, page):
        """
        Queen (mx) session must:
          - have exactly 19 problems (17 base + 2 no-borrow column-sub mixed in)
          - contain ≥1 of EACH problem type:
            TZ, TX, TW, TM, TS, TA, TDA, TDS, TT, TC, TBG, TCS.
        """
        consts = page.evaluate("({TM,TS,TA,TX,TZ,TW,TDA,TDS,TC,TT,TBG,TCS})")
        # 5 fresh Queen sessions — each must satisfy the rule
        for session in range(5):
            page.evaluate("setMode('mx'); restart()")
            page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
            n = page.evaluate("problems.length")
            assert n == 20, \
                f"Session {session+1}: expected 20 mx problems, got {n}"
            types = page.evaluate("[...problems].map(p => p.t)")
            for name, code in consts.items():
                count = sum(1 for t in types if t == code)
                assert count >= 1, \
                    f"Session {session+1}: type {name} appears {count} times; expected ≥1"

    def test_grade_below_1000_when_any_wrong_answer(self, page):
        """One wrong attempt lowers the grade below 1000.
        Uses mode 10 for predictable 12-problem session length."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

        # Submit 99 on problem 1, then correct it
        state = get_state(page)
        if state["ptype"] in (state["TDA"], state["TDS"]):
            page.fill("#ans1", "99"); page.fill("#ans2", "99")
        else:
            page.fill("#ans", "99")
        page.click("#chk-btn")
        page.wait_for_timeout(1700)

        # Seamless retry — wait for `done === false` then solve correctly
        page.wait_for_function("done === false", timeout=TIMEOUT)
        solve_one(page)

        # 12 total problems: 1 retried + 11 more
        play_n_correctly(page, 11)
        page.wait_for_selector(".end-scr", timeout=TIMEOUT)

        grade = int(page.locator(".end-grade-num").inner_text().strip())
        assert grade < 1000, f"Grade should be < 1000 after a wrong attempt, got {grade}"

    def test_progress_bar_advances_each_problem(self, page):
        """The progress bar width must grow after each solved problem. Pinned to a
        basic numeric mode so the first problems are plain #ans inputs — the
        default Queen/mx pool can place a column-sub or two-unknown problem (no
        single #ans) at an early slot, which would make solve_one() non-deterministic."""
        page.evaluate("setMode(10); restart()")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        def width():
            style = page.locator("#prog-bar").get_attribute("style") or ""
            return float(style.split("width:")[1].split("%")[0].strip()) if "width:" in style else 0.0
        widths = [width()]
        for _ in range(2):
            prev = widths[-1]
            solve_one(page)
            # wait until the bar's (inline) width reflects the advance — robust
            # under full-suite load, where reading it immediately can race the
            # post-solve loadProblem() that sets the new width.
            page.wait_for_function(
                "p => { const s = document.getElementById('prog-bar').style.width;"
                " return (s ? parseFloat(s) : 0) > p + 0.5; }",
                arg=prev, timeout=TIMEOUT)
            widths.append(width())

        assert widths[0] < widths[1] < widths[2], \
            f"Progress bar should grow: {widths}"

    def test_score_display_updates_after_correct_answer(self, page):
        """The score DOM element must reflect the new score after a correct answer."""
        solve_one(page)
        displayed = page.locator("#score-val").inner_text().strip()
        assert displayed == "20", f"Score display should be '20', got '{displayed}'"

    def test_game_ends_after_all_12_problems(self, page):
        """After 12 correct answers the end screen appears (no more problems).
        Uses mode 10 for predictable 12-problem session length."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

        play_n_correctly(page, 12)
        page.wait_for_selector(".end-scr", timeout=TIMEOUT)
        assert page.locator(".end-scr").count() == 1

    def test_restart_resets_game_state(self, page):
        """The 'play again' button resets score, idx, and problems array.
        Uses mode 10 for predictable 12-problem session length."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

        solve_one(page)
        assert page.evaluate("score") == 10   # mode 10 → 10 pts per correct

        play_n_correctly(page, 11)
        page.wait_for_selector(".end-scr", timeout=TIMEOUT)
        page.locator("button.b-rpl").click()   # "שַׂחֲקִי שׁוּב"
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(300)

        assert page.evaluate("score") == 0,  "Score must be 0 after restart"
        assert page.evaluate("idx")   == 0,  "idx must be 0 after restart"
        assert page.evaluate("problems.length") == 12, "Fresh 12-problem set expected"
