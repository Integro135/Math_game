import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Report tests
# ─────────────────────────────────────────────────────────

class TestReport:
    def test_perfect_run_produces_all_check_marks(self, page):
        """12/12 correct on first try → every report row shows ✓ and grade=1000.
        Uses mode 10 for predictable 12-problem session length."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

        play_n_correctly(page, 12)
        page.wait_for_selector(".end-scr", timeout=TIMEOUT)
        open_report(page)

        rows = page.locator(".rep-row").all()
        assert len(rows) == 12, f"Expected 12 report rows, got {len(rows)}"

        for i, row in enumerate(rows):
            assert row.locator(".rep-check").count() == 1, \
                f"Row {i + 1}: expected ✓ checkmark"

        assert page.locator(".rep-sum-ok").count()  == 1, "Expected green summary banner"
        assert page.locator(".rep-sum-err").count() == 0, "Red summary banner should be absent"

        grade = page.locator(".end-grade-num").inner_text().strip()
        assert grade == "1000", f"Expected perfect grade 1000, got {grade}"

    def test_wrong_then_correct_flagged_in_report(self, page):
        """
        Submitting 99 then the real answer → row 1 shows the wrong value
        AND the correct value; summary counts 1 error.
        Uses mode 10 for predictable 12-problem session length.
        """
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

        # Wrong answer on problem 1
        if get_state(page)["ptype"] in (get_state(page)["TDA"], get_state(page)["TDS"]):
            page.fill("#ans1", "99"); page.fill("#ans2", "99")
        else:
            page.fill("#ans", "99")
        page.click("#chk-btn")
        page.wait_for_timeout(1700)   # sad modal auto-hides after 1500 ms

        # Seamless retry — input is auto-cleared and re-enabled after wrong answer.
        # Wait for `done === false` then submit the correct answer.
        page.wait_for_function("done === false", timeout=TIMEOUT)
        solve_one(page)

        # Solve remaining 11 problems (12 total = 1 retried + 11)
        play_n_correctly(page, 11)
        page.wait_for_selector(".end-scr", timeout=TIMEOUT)
        open_report(page)

        first_row = page.locator(".rep-row").first
        assert first_row.locator(".rep-wrong-val").count() >= 1, \
            "Row 1: expected at least one wrong-value badge"
        assert first_row.locator(".rep-correct").count() == 1, \
            "Row 1: expected a ✓ correct-value badge"
        assert page.locator(".rep-sum-err").count() == 1, \
            "Expected red summary banner (1 error)"

    def test_skipped_problem_shows_daleg_badge(self, page):
        """The manual skip button was removed when seamless retry was introduced,
        so a 'דולג' (skipped) badge can no longer be produced by the player.
        Current reality: there is NO skip control in the UI, and a wrong-then-
        correct answer is reported as a corrected row (✓correct), never as 'דולג'.
        Uses mode 10 for a predictable 12-problem session."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

        # No skip / try-again control is reachable anywhere in the live DOM.
        assert page.evaluate(
            "document.querySelectorAll("
            "'.b-skip, #skip-btn, button[onclick*=\"skip\"], button[onclick*=\"nextP\"]'"
            ").length"
        ) == 0, "Skip button must not exist — seamless retry replaced it"

        # Wrong then correct on problem 1 → the row is reported as a CORRECTED
        # answer (✓correct), proving the 'דולג' path is unreachable by the player.
        state = get_state(page)
        if state["ptype"] in (state["TDA"], state["TDS"]):
            page.fill("#ans1", "99"); page.fill("#ans2", "99")
        else:
            page.fill("#ans", "99")
        page.click("#chk-btn")
        page.wait_for_timeout(1700)              # sad modal auto-hides
        page.wait_for_function("done === false", timeout=TIMEOUT)
        solve_one(page)                          # seamless retry, no skip button

        play_n_correctly(page, 11)               # finish the set (12 total)
        page.wait_for_selector(".end-scr", timeout=TIMEOUT)
        open_report(page)

        first_row = page.locator(".rep-row").first
        assert first_row.locator(".rep-correct").count() == 1, \
            "Wrong-then-correct row must show ✓correct (the corrected answer)"
        assert page.locator(".rep-skipped").count() == 0, \
            "No row may carry a 'דולג' (skipped) badge — manual skip was removed"

    def test_td_report_shows_actual_pair_entered(self, page):
        """
        After correctly answering a TDA/TDS problem the report row shows
        the exact pair the user typed (not just underscores).
        Uses mode 10 (sampleWithTD places TD at slots 4, 8, 12).
        """
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

        # Advance to the 4th problem (first guaranteed TD slot)
        play_n_correctly(page, 3)
        page.wait_for_selector("#ans1:not([disabled])", timeout=TIMEOUT)

        state = get_state(page)
        assert state["ptype"] in (state["TDA"], state["TDS"]), \
            f"Problem 4 must be TDA/TDS, got '{state['ptype']}'"

        r = state["num1"]
        if state["ptype"] == state["TDA"]:
            v1, v2 = (r - 1 if r >= 1 else 0), (1 if r >= 1 else 0)
        else:
            sub = 2                     # (r+sub) − sub = r; avoid a minuend of 10
            while r + sub == 10:
                sub += 1
            v1, v2 = r + sub, sub

        page.fill("#ans1", str(v1))
        page.fill("#ans2", str(v2))
        before = page.evaluate("idx")
        page.click("#chk-btn")
        wait_fw_and_advance(page, before)

        play_n_correctly(page, 8)      # problems 5–12
        page.wait_for_selector(".end-scr", timeout=TIMEOUT)
        open_report(page)

        row_txt = page.locator(".rep-row").nth(3).locator(".rep-eq-txt").inner_text()
        assert str(v1) in row_txt and str(v2) in row_txt, \
            f"Report row 4 should show pair {v1},{v2}; got: '{row_txt}'"

    def test_grade_removes_full_points_for_any_mistake(self, page):
        """
        calcGrade awards 0 (not partial) for any problem that had ≥1 wrong attempt,
        even when eventually answered correctly.

        Scenario A  — 1 mistake then corrected, rest perfect:
            sum = 11 × 100 = 1100
            grade = round(1100 × 10 / 12) = round(916.67) = 917  (not 1000)

        Scenario B  — 2 mistakes on separate problems, both corrected, rest perfect:
            sum = 10 × 100 = 1000
            grade = round(1000 × 10 / 12) = round(833.33) = 833  (not 917 or higher)

        Both grades must be exactly what the formula predicts,
        proving the entire 100-point share is removed (not halved/discounted).
        """
        # Use mode 10 for predictable 12-problem session length
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

        def make_wrong(p):
            if p["ptype"] in (p["TDA"], p["TDS"]):
                page.fill("#ans1", "99"); page.fill("#ans2", "99")
            else:
                page.fill("#ans", "99")
            page.click("#chk-btn")
            page.wait_for_timeout(1700)        # wait for sad modal to clear
            # Seamless retry — input is auto-cleared, no try-again button needed
            page.wait_for_function("done === false", timeout=TIMEOUT)

        # ── Scenario A: 1 mistake on problem 1 ─────────────────────────────
        make_wrong(get_state(page))
        solve_one(page)
        play_n_correctly(page, 11)
        page.wait_for_selector(".end-scr", timeout=TIMEOUT)

        grade_a = int(page.locator(".end-grade-num").inner_text().strip())
        expected_a = max(101, round(11 * 100 * 10 / 12))   # = 917
        assert grade_a == expected_a, (
            f"Scenario A: expected grade {expected_a} (11/12 perfect), got {grade_a}. "
            "Mistaken problem must contribute 0 points, not partial credit."
        )
        assert grade_a < 1000, \
            "Grade must be < 1000 when even one problem had a wrong attempt"

        # ── Scenario B: 2 mistakes on problems 1 and 2 ─────────────────────
        page.evaluate("restart()")
        page.wait_for_selector(
            "#ans:not([disabled]), #ans1:not([disabled])", timeout=TIMEOUT
        )

        for _ in range(2):          # make one mistake on each of first 2 problems
            make_wrong(get_state(page))
            solve_one(page)

        play_n_correctly(page, 10)
        page.wait_for_selector(".end-scr", timeout=TIMEOUT)

        grade_b = int(page.locator(".end-grade-num").inner_text().strip())
        expected_b = max(101, round(10 * 100 * 10 / 12))   # = 833
        assert grade_b == expected_b, (
            f"Scenario B: expected grade {expected_b} (10/12 perfect), got {grade_b}. "
            "Each mistaken problem must remove its full 100-point contribution."
        )
        assert grade_b < grade_a, \
            "Grade with 2 mistakes must be lower than grade with 1 mistake"
