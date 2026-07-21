import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Score and mode tests
# ─────────────────────────────────────────────────────────

class TestScoreAndMode:
    def test_score_starts_at_zero(self, page):
        assert page.evaluate("score") == 0

    def test_default_mode_is_mx(self, page):
        assert page.evaluate("mode") == "mx"

    def test_correct_answer_in_modemx_adds_20_points(self, page):
        solve_one(page)
        assert page.evaluate("score") == 20

    def test_solve_one_handles_every_mx_slot0_type(self, page):
        """`solve_one` must correctly answer EVERY type the mx shuffle can seat at
        slot 0 — whole-hundreds (TH, ADDITION), the single ⃝-unknown add/sub
        (TVA/TVS) and the three-box triple (TRA). Regression for a test-helper gap
        (`correct_answer`/`submit_answer` didn't cover these) that flaked the mx
        scoring tests (~20%) whenever the shuffle landed one of them at slot 0."""
        page.evaluate("setMode('mx')")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        for prob in ("{t:TH,a:500,b:40}",                       # 500+40 = 540 (addition!)
                     "{t:TVA,a:30,b:20,sym:'circle'}",          # 30 + ⃝ = 50
                     "{t:TVS,a:30,b:20,sym:'triangle'}",        # 30 − ⃝ = 10
                     "{t:TRA,r:15}"):                           # __+__+__ = 15 (three boxes)
            # a filler 2nd card so solving slot 0 advances (idx→1) instead of ending
            page.evaluate(f"mode='mx';score=0;problems=[{prob},{{t:TS,a:5,b:2}}];idx=0;loadProblem()")
            page.wait_for_function(
                "done===false && idx===0 && (document.getElementById('ans')||document.getElementById('ans1'))",
                timeout=TIMEOUT)
            page.wait_for_timeout(120)
            solve_one(page)
            assert page.evaluate("score") == 20, f"solve_one must solve {prob} for +20 in mx"
            assert page.evaluate("idx") == 1, f"solving {prob} must advance to the next card"

    def test_correct_answer_in_mode10_adds_10_points(self, page):
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(200)
        solve_one(page)
        assert page.evaluate("score") == 10

    def test_correct_answer_in_mode5_adds_5_points(self, page):
        """Mode 'up to 5' (עַד 5) still exists and awards +5 per correct answer
        (modePts() returns the numeric mode for 5/10/20 — see problems.js)."""
        page.evaluate("setMode(5)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(200)
        assert page.evaluate("mode") == 5
        assert page.evaluate("modePts()") == 5, "Mode 5 must award 5 points per correct"
        solve_one(page)
        assert page.evaluate("score") == 5

    def test_mode_switch_resets_score_and_idx(self, page):
        """After solving one problem, switching mode resets score→0 and idx→0."""
        solve_one(page)
        assert page.evaluate("score") == 20
        assert page.evaluate("idx") == 1

        page.evaluate("setMode(10)")
        page.wait_for_timeout(200)

        assert page.evaluate("score") == 0, "Score must reset on mode switch"
        assert page.evaluate("idx")   == 0, "idx must reset on mode switch"

    def test_mode_button_becomes_active_after_switch(self, page):
        """The clicked level button gets .active; the previous one loses it."""
        page.evaluate("setMode('br')")
        page.wait_for_timeout(100)

        assert page.locator("#lbbr.active").count() == 1
        assert page.locator("#lbmx.active").count() == 0




# ─────────────────────────────────────────────────────────
# Try-First gate — score penalty for using aids
#   tryFirst==0  → no wrongs yet → full mode points on correct
#   tryFirst==1  → one wrong     → 80% of mode points on correct
#   tryFirst>=2  → two+ wrongs   → 0 points on correct
# ─────────────────────────────────────────────────────────
class TestTryFirstScoring:
    """Verify that wrong answers reduce the score for the question:
       first wrong = -20%, second wrong = full question lost (0 pts)."""

    def _wrong_value(self, state: dict, correct: int) -> int:
        """Return a value guaranteed to be wrong but still numeric (>=0)."""
        return correct + 1 if correct < 20 else correct - 1

    def test_correct_on_first_try_awards_full_points(self, page):
        """Sanity baseline: first-try correct → full modePts() awarded."""
        before = page.evaluate("score")
        solve_one(page)
        # the score award is async (addScore runs in checkAns' flow); wait for it
        # to settle before reading, so a heavily-loaded full-suite run can't race.
        page.wait_for_function(f"score === {before + 20}", timeout=TIMEOUT)
        assert page.evaluate("score") == before + 20, \
            "Mode-20 first-try correct must add 20 points"

    def test_first_wrong_then_correct_awards_67_percent(self, page):
        """One wrong → tryFirst=1 → correct awards round(20 * 0.67) = 13 pts (33% penalty)."""
        # Force a deterministic single-answer (TS) problem at idx 0 so the
        # clean "wrong = correct+1" single-input flow always applies. 8-3=5
        # keeps _wrong_value in the correct<20 branch (wrong=6).
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_selector("#ans:not([disabled])", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        state = get_state(page)
        ans = correct_answer(state)
        assert ans[0] == "single", "forced TS problem must be single-answer"

        correct = ans[1]
        wrong = self._wrong_value(state, correct)

        # First attempt: wrong
        page.fill("#ans", str(wrong))
        page.click("#chk-btn")
        page.wait_for_function("done === false", timeout=TIMEOUT)
        assert page.evaluate("tryFirst") == 1, \
            "After one wrong answer, tryFirst must be 1"

        # Second attempt: correct → expect 67% (13 pts in mode mx)
        before = page.evaluate("score")
        page.fill("#ans", str(correct))
        page.click("#chk-btn")
        page.wait_for_timeout(300)
        after = page.evaluate("score")

        assert after - before == 13, \
            f"After one wrong then correct, score should rise by 13 (67% of 20), got {after - before}"

    def test_two_wrongs_then_correct_awards_zero(self, page):
        """Two wrongs → tryFirst>=2 → correct awards 0 points."""
        # Force a deterministic single-answer (TS) problem at idx 0 so the
        # single-input two-wrongs flow always applies. 8-3=5 keeps the wrong
        # values (6, then 7) distinct from the correct answer.
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_selector("#ans:not([disabled])", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        state = get_state(page)
        ans = correct_answer(state)
        assert ans[0] == "single", "forced TS problem must be single-answer"

        correct = ans[1]
        wrong = self._wrong_value(state, correct)
        wrong2 = wrong + 1 if wrong + 1 != correct else wrong + 2

        # First wrong
        page.fill("#ans", str(wrong))
        page.click("#chk-btn")
        page.wait_for_function("done === false", timeout=TIMEOUT)
        assert page.evaluate("tryFirst") == 1

        # Second wrong
        page.fill("#ans", str(wrong2))
        page.click("#chk-btn")
        page.wait_for_function("done === false", timeout=TIMEOUT)
        assert page.evaluate("tryFirst") >= 2, \
            "After two wrong answers, tryFirst must be >= 2"

        # Now correct → expect 0 points awarded
        before = page.evaluate("score")
        page.fill("#ans", str(correct))
        page.click("#chk-btn")
        page.wait_for_timeout(300)
        after = page.evaluate("score")

        assert after == before, \
            f"After two wrongs then correct, score must not change. before={before}, after={after}"

    def test_tf_pts_helper_returns_correct_values(self, page):
        """Directly verify the _tfPts() helper across all three buckets."""
        # tryFirst=0 → full modePts() (mode 20 → 20)
        page.evaluate("tryFirst = 0")
        assert page.evaluate("_tfPts()") == 20

        # tryFirst=1 → round(20 * 0.67) = 13 (33% penalty)
        page.evaluate("tryFirst = 1")
        assert page.evaluate("_tfPts()") == 13

        # tryFirst=2 → 0
        page.evaluate("tryFirst = 2")
        assert page.evaluate("_tfPts()") == 0

        # tryFirst=5 → 0 (still 0 for any value >= 2)
        page.evaluate("tryFirst = 5")
        assert page.evaluate("_tfPts()") == 0

    def test_tryfirst_resets_on_new_problem(self, page):
        """A new loaded problem must reset tryFirst back to 0."""
        # Make tryFirst non-zero on current problem. Force a deterministic
        # single-answer (TS) problem at idx 0 so the single-input flow applies.
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_selector("#ans:not([disabled])", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        state = get_state(page)
        ans = correct_answer(state)
        assert ans[0] == "single", "forced TS problem must be single-answer"
        correct = ans[1]
        page.fill("#ans", str(self._wrong_value(state, correct)))
        page.click("#chk-btn")
        page.wait_for_function("done === false", timeout=TIMEOUT)
        assert page.evaluate("tryFirst") == 1

        # Solve correctly to advance
        page.fill("#ans", str(correct))
        page.click("#chk-btn")
        wait_fw_and_advance(page, 0)
        page.wait_for_function("done === false && idx > 0", timeout=TIMEOUT)

        # New problem → tryFirst must be 0
        assert page.evaluate("tryFirst") == 0, \
            "tryFirst must reset to 0 when a new problem loads"

    def test_aids_locked_initially_on_new_problem(self, page):
        """When a new problem loads, the games button and ± buttons are tf-locked."""
        gb = page.locator("#games-drop-btn")
        assert gb.evaluate("el => el.classList.contains('tf-locked')"), \
            "Games button should be tf-locked on a fresh problem"
        # NL ± may be in the panel for some modes — check they're either disabled or absent
        for btn_id in ["pgm-btn-plus", "pgm-btn-minus", "nl-btn-plus", "nl-btn-minus"]:
            locked = page.evaluate(
                f"() => {{ const el = document.getElementById('{btn_id}'); "
                f"return !el || el.classList.contains('tf-locked'); }}"
            )
            assert locked, f"#{btn_id} should be tf-locked or absent on fresh problem"

    def test_mx_no_operand_above_20_unless_round_tens(self, page):
        """In Queen (mx) mode, no operand may exceed 20 — except round-tens (TT,
        multiples of 10) and the big ±1/2 steps (TBG, big number minus 1/2)."""
        consts = page.evaluate("({TM, TS, TA, TX, TZ, TW, TDA, TDS, TC, TT, TBG, TH})")
        TT = consts["TT"]
        TC = consts["TC"]
        TDA = consts["TDA"]
        TDS = consts["TDS"]
        TBG = consts["TBG"]
        TH = consts["TH"]

        for _ in range(10):                # 10 fresh Queen sessions
            page.evaluate("setMode('mx'); restart()")
            page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
            problems = page.evaluate("problems")
            for i, p in enumerate(problems):
                t = p["t"]
                if t == TT:
                    # Round-tens: a and b must both be multiples of 10
                    assert p["a"] % 10 == 0 and p["b"] % 10 == 0, \
                        f"TT problem at idx {i} not in round tens: {p}"
                    continue
                if t == TBG:
                    # Big ±step: a is a big two-digit number; subtraction steps
                    # down by 1-6 (never crossing the ten below → units ≥ step),
                    # addition steps up by 1-2 (no carry).
                    if p["op"] == "sub":
                        assert p["b"] in (1, 2, 3, 4, 5, 6) and p["a"] % 10 >= p["b"], \
                            f"TBG sub step must be 1-6 with no tens-cross at idx {i}: {p}"
                    else:
                        assert p["b"] in (1, 2) and p["a"] % 10 + p["b"] <= 9, \
                            f"TBG add step must be 1-2 with no carry at idx {i}: {p}"
                    continue
                if t == TH:
                    # whole-hundreds addition: a is a whole hundred, b whole
                    # tens/hundreds, sum ≤ 900 (values intentionally past 20)
                    assert p["a"] % 100 == 0 and p["b"] % 10 == 0 and p["a"] + p["b"] <= 900, \
                        f"TH problem at idx {i} not whole hundreds ≤900: {p}"
                    continue
                if t in (TC, TDA, TDS):
                    # TC: coins; TDA/TDS: only `r` matters and is ≤20
                    if t in (TDA, TDS):
                        assert p["r"] <= 20, f"TD problem at idx {i} has r>20: {p}"
                    continue
                # Regular TA/TS/TM/TX/TZ/TW: all listed operands must be ≤20
                for k in ("a", "b", "c", "d"):
                    if k in p and p[k] is not None:
                        assert p[k] <= 20, \
                            f"Mode mx idx {i} type {t}: operand {k}={p[k]} exceeds 20 in {p}"

    def test_aids_unlock_after_first_wrong(self, page):
        """First wrong answer unlocks the aids (tf-locked class removed)."""
        # Force a deterministic single-answer (TS) problem at idx 0 so the
        # single-input wrong-then-unlock flow always applies.
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_selector("#ans:not([disabled])", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        state = get_state(page)
        ans = correct_answer(state)
        assert ans[0] == "single", "forced TS problem must be single-answer"
        correct = ans[1]
        page.fill("#ans", str(self._wrong_value(state, correct)))
        page.click("#chk-btn")
        page.wait_for_function("done === false", timeout=TIMEOUT)

        gb_locked = page.locator("#games-drop-btn").evaluate(
            "el => el.classList.contains('tf-locked')"
        )
        assert not gb_locked, \
            "Games button should be unlocked after first wrong answer"

    @staticmethod
    def _visibility(page, sel: str) -> str:
        return page.evaluate(
            f"() => {{ const el = document.querySelector('{sel}'); "
            f"return el ? getComputedStyle(el).visibility : 'MISSING'; }}"
        )

    def test_nl_numbers_hidden_while_locked_shown_after_wrong(self, page):
        """While the number line is locked (first try), its numbers and ticks
        must be hidden so the child can't count on it; the first wrong answer
        unlocks the line and reveals the numbers."""
        # Deterministic setup: mode 20 with a known TS problem (aid toggles are
        # no-ops on TC/TT, and mx-mode leftovers from earlier tests break that)
        page.evaluate("setMode(20)")
        page.wait_for_timeout(150)
        page.evaluate("problems[0] = {t: TS, a: 7, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(150)

        # Kangaroo number line — numbers/ticks hidden on a fresh problem
        page.evaluate("toggleAidMode('kang')")
        page.wait_for_selector("#nl-panel .nl-num", state="attached", timeout=TIMEOUT)
        assert page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
            "body must carry tf-locked-nl on a fresh problem"
        assert self._visibility(page, "#nl-panel .nl-num") == "hidden", \
            "Kangaroo NL numbers must be hidden while the line is locked"
        assert self._visibility(page, "#nl-panel .tick") == "hidden", \
            "Kangaroo NL ticks must be hidden while the line is locked"

        # Cookie-jar (pgm) aid — the old number line above the box is now
        # hidden entirely; only the box itself is shown (see test_jar_*).
        page.evaluate("toggleAidMode('nl')")
        page.wait_for_selector("#pgm-nums .pgm-nl-num", state="attached", timeout=TIMEOUT)
        assert page.evaluate(
            "getComputedStyle(document.querySelector('.pgm-nl')).display") == "none", \
            "The cookie-jar's old number line (.pgm-nl) must be hidden entirely"

        # First wrong answer → unlock the kangaroo line
        page.evaluate("toggleAidMode('kang')")
        page.fill("#ans", "9")  # 7-3=4, so 9 is wrong
        page.click("#chk-btn")
        page.wait_for_function("tryFirst > 0", timeout=TIMEOUT)
        assert not page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
            "tf-locked-nl must be removed after the first wrong answer"
        page.evaluate("toggleAidMode('kang')")
        page.wait_for_selector("#nl-panel .nl-num", state="attached", timeout=TIMEOUT)
        assert self._visibility(page, "#nl-panel .nl-num") == "visible", \
            "Kangaroo NL numbers must be visible after the first wrong answer"

    def test_chain_sub1_mistake_pops_sad_and_penalizes(self, page):
        """A wrong value in a chain problem's FIRST step square triggers the
        sad modal and counts as a regular first mistake (tryFirst penalty +
        report entry) — without waiting for the final answer."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        page.evaluate("problems[0] = {t: TX, a: 8, b: 2, c: 3}; idx = 0; loadProblem()")
        page.wait_for_selector("#tx-sub1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

        page.fill("#tx-sub1", "9")              # 8-2=6, so 9 is wrong
        page.evaluate("document.getElementById('tx-sub1').blur()")
        page.wait_for_function(
            "document.getElementById('sad-ov')?.style.display === 'flex'",
            timeout=TIMEOUT,
        )
        assert page.evaluate("tryFirst") == 1, \
            "Wrong step-1 value must count as a first mistake"
        assert page.evaluate("report[0].wrongs.length") == 1, \
            "The mistake must be recorded in the report"

        # blurring again with the SAME wrong value must not double-penalize
        page.evaluate(
            "document.getElementById('tx-sub1').focus();"
            "document.getElementById('tx-sub1').blur()")
        page.wait_for_timeout(300)
        assert page.evaluate("tryFirst") == 1, \
            "Re-blurring the same wrong value must not punish twice"

        # fixing the value clears the guard; a NEW wrong value punishes again
        page.fill("#tx-sub1", "6")
        page.evaluate("document.getElementById('tx-sub1').blur()")
        page.wait_for_timeout(200)
        page.fill("#tx-sub1", "5")
        page.evaluate("document.getElementById('tx-sub1').blur()")
        page.wait_for_timeout(300)
        assert page.evaluate("tryFirst") == 2, \
            "A different wrong value must count as a second mistake"

    def test_chain_step_box_mistake_reduces_final_score(self, page):
        """END-TO-END: a wrong value typed in a chain STEP box penalises the
        exercise even when the final answer is ultimately correct — the correct
        final answer then awards only 67%, not full points."""
        page.evaluate("setMode(10)")          # modePts()=10 → 67% == 7
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        page.evaluate("problems[0] = {t: TX, a: 8, b: 2, c: 3}; idx = 0; loadProblem()")
        page.wait_for_selector("#tx-sub1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        assert page.evaluate("score") == 0 and page.evaluate("tryFirst") == 0
        # wrong intermediate step value (8-2=6, so 9 is wrong)
        page.fill("#tx-sub1", "9")
        page.evaluate("document.getElementById('tx-sub1').blur()")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        # now solve the whole exercise CORRECTLY (8-2+3 = 9)
        page.fill("#ans", "9")
        page.click("#chk-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("report[0].gotCorrect") is True, \
            "the final answer was correct"
        assert page.evaluate("score") == 7, \
            f"a step-box mistake must drop the award to 67% (7), got {page.evaluate('score')}"

    def test_theme_switch_keeps_nl_lock(self, page):
        """Switching the background theme must not reveal the number-line
        numbers before the first mistake (applyTheme rewrites body.className,
        which used to wipe the tf-locked-nl class)."""
        page.evaluate("toggleAidMode('kang')")
        page.wait_for_selector("#nl-panel .nl-num", state="attached", timeout=TIMEOUT)
        assert page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
            "fresh problem must start locked"
        page.evaluate("applyTheme('galaxy')")
        page.wait_for_timeout(150)
        assert page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
            "tf-locked-nl must survive a theme switch"
        assert self._visibility(page, "#nl-panel .nl-num") == "hidden", \
            "NL numbers must stay hidden after a theme switch (no mistake yet)"
