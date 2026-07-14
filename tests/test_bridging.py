import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Bridging-10 mode (br): focused practice on crossing 10
# ─────────────────────────────────────────────────────────
class TestBridgingMode:
    """The 'br' mode (גָּשֵׁר 10) serves SIX fixed pedagogical sets in a prescribed
       order — no random generation, no shuffle. The sets ROTATE on EVERY
       rebuild — choosing the game, re-clicking it, "play again" (restart) or a
       reload (set 1 → 2 → 3 → 4 → 5 → 6 → set 1 …); a fresh start serves set 1.
       The order INSIDE each set is the curriculum and must never change."""

    # SET 1 — the original prescribed order: (type, a, b)
    EXPECTED_SEQ = [
        ("TA", 9, 2), ("TA", 9, 3), ("TA", 9, 4),
        ("TS", 13, 4), ("TS", 13, 3), ("TS", 13, 2),
        ("TA", 8, 2), ("TA", 8, 3), ("TA", 8, 4),
        ("TS", 12, 4), ("TS", 12, 3), ("TS", 12, 2),
        ("TA", 8, 5), ("TS", 13, 5),
        ("TA", 7, 3), ("TA", 7, 4), ("TA", 7, 5),
        ("TS", 12, 5), ("TS", 12, 4), ("TS", 12, 3),
        ("TA", 6, 4), ("TA", 6, 5), ("TA", 6, 6),
        ("TS", 15, 5), ("TS", 15, 6),
    ]

    # SET 2 — the second prescribed order: subtractions from 11/12/13 counting
    # down, with the bridging additions 7+4 and 8+4 closing the 11- and 12-groups
    EXPECTED_SEQ_2 = [
        ("TS", 11, 0), ("TS", 11, 1), ("TS", 11, 2), ("TS", 11, 3), ("TS", 11, 4), ("TA", 7, 4),
        ("TS", 12, 0), ("TS", 12, 1), ("TS", 12, 2), ("TS", 12, 3), ("TS", 12, 4), ("TA", 8, 4),
        ("TS", 13, 0), ("TS", 13, 1), ("TS", 13, 2), ("TS", 13, 3), ("TS", 13, 4), ("TS", 13, 5),
    ]

    # SET 3 — "גְּשָׁרִים גְּדוֹלִים": doubles & near-doubles bridging into the high teens
    # (results up to 18), each addition paired with its inverse subtraction; 15 problems
    EXPECTED_SEQ_3 = [
        ("TA", 6, 6), ("TS", 12, 6), ("TA", 7, 7), ("TS", 14, 7),
        ("TA", 8, 8), ("TS", 16, 8), ("TA", 9, 9), ("TS", 18, 9),
        ("TA", 6, 7), ("TS", 13, 7), ("TA", 7, 8), ("TS", 15, 8),
        ("TA", 8, 9), ("TS", 17, 9),
        ("TA", 9, 6),
    ]

    # SET 4 — "גְּשָׁרִים קְטַנִּים": the GENTLEST crossings — every sum/minuend stays in 11–13
    # (10 crossed by only 1/2/3), grouped cross-by-1 → 2 → 3, additions with inverse subs; 15
    EXPECTED_SEQ_4 = [
        ("TA", 5, 6), ("TS", 11, 5), ("TA", 4, 7), ("TS", 11, 7), ("TA", 3, 8), ("TS", 11, 8), ("TA", 2, 9),
        ("TA", 5, 7), ("TS", 12, 7), ("TA", 4, 8), ("TS", 12, 8),
        ("TA", 5, 8), ("TS", 13, 8), ("TA", 4, 9), ("TS", 13, 9),
    ]

    # SET 5 — the +9 shortcut: 2+9 … 9+9 (→11–18) with −9 count-backs; 15 problems
    EXPECTED_SEQ_5 = [
        ("TA", 2, 9), ("TA", 3, 9), ("TA", 4, 9), ("TA", 5, 9),
        ("TS", 11, 9), ("TS", 12, 9), ("TS", 13, 9), ("TS", 14, 9),
        ("TA", 6, 9), ("TA", 7, 9), ("TA", 8, 9),
        ("TS", 15, 9), ("TS", 16, 9), ("TS", 17, 9),
        ("TA", 9, 9),
    ]

    # SET 6 — mid-teen count-backs (14 & 15 minus → 5-9) + the ways to build 14/15/16; 15
    EXPECTED_SEQ_6 = [
        ("TS", 14, 5), ("TS", 14, 6), ("TS", 14, 7), ("TS", 14, 8), ("TS", 14, 9),
        ("TS", 15, 6), ("TS", 15, 7), ("TS", 15, 8), ("TS", 15, 9),
        ("TA", 6, 8), ("TA", 7, 7), ("TA", 7, 8), ("TA", 8, 7), ("TA", 8, 8), ("TA", 9, 7),
    ]

    def _switch_br(self, page):
        page.evaluate("setMode('br')")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def _reenter_br(self, page):
        """Leave br (to mx) and pick it again — a genuine new menu selection,
        which advances to the next set in the alternation."""
        page.evaluate("setMode('mx')")
        page.wait_for_timeout(120)
        page.evaluate("setMode('br')")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def test_br_mode_button_exists(self, page):
        """The bridging-10 button (#lbbr) is rendered in the level row."""
        assert page.locator("#lbbr").count() == 1, "Expected #lbbr button"
        txt = page.locator("#lbbr").inner_text().strip()
        assert "גָּשֵׁר 10" in txt or "10" in txt, \
            f"Button text should contain 'גָּשֵׁר 10', got '{txt}'"

    def test_br_mode_has_25_problems(self, page):
        """Bridging mode serves exactly 25 problems per session."""
        self._switch_br(page)
        assert page.evaluate("problems.length") == 25, \
            f"Expected 25 br problems, got {page.evaluate('problems.length')}"

    def test_br_mode_pts_is_15(self, page):
        """modePts() returns 15 in bridging mode."""
        self._switch_br(page)
        assert page.evaluate("modePts()") == 15

    def test_br_mode_active_button_marker(self, page):
        """Switching to br activates #lbbr and deactivates others."""
        self._switch_br(page)
        assert page.locator("#lbbr.active").count() == 1
        assert page.locator("#lbmx.active").count() == 0

    def test_br_fixed_sequence_in_exact_order(self, page):
        """The br session equals the prescribed 25-problem list, in order. Every
        4th problem is re-rendered as its shape-unknown form (TVA/TVS); we
        normalise it back to its base add/sub type to verify the curriculum."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        self._switch_br(page)
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ]
        assert probs == expected, (
            f"br problems deviate from the prescribed order.\n"
            f"expected={expected}\ngot={probs}"
        )

    def test_br_restart_alternates_sets(self, page):
        """Every rebuild advances the set, so restart() cycles through the six
        sets: set 1 → 2 → 3 → 4 → 5 → 6 → set 1 (deterministic). The shape-unknown
        type is woven into every set (see test_br_weaves_unknown_every_fourth);
        normalise TVA/TVS back to their base add/sub type for the order check."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        exp = [[[consts[t], a, b] for t, a, b in seq] for seq in
               (self.EXPECTED_SEQ, self.EXPECTED_SEQ_2, self.EXPECTED_SEQ_3,
                self.EXPECTED_SEQ_4, self.EXPECTED_SEQ_5, self.EXPECTED_SEQ_6)]
        NORM = "[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])"
        self._switch_br(page)
        seen = [page.evaluate(NORM)]
        for _ in range(6):
            page.evaluate("restart()"); page.wait_for_timeout(120)
            seen.append(page.evaluate(NORM))
        for i in range(6):
            assert seen[i] == exp[i], f"build {i+1} must serve set {i+1}\ngot={seen[i]}"
        assert seen[6] == exp[0], "the following restart wraps back to set 1"

    def test_br_weaves_unknown_every_fourth(self, page):
        """An "unknown" exercise is woven into EVERY set at every 4th problem
        (slots 4, 8, 12 …), cycling through the three kinds — one-unknown (TVA/TVS),
        two-unknown, and the three-unknown sum (TRA). Drawn from the set's own
        problems, so a/b/answer are unchanged; exactly one per four slots."""
        consts = page.evaluate("({TVA, TVS, TRA})")
        kinds = {consts["TVA"], consts["TVS"], consts["TRA"]}
        self._switch_br(page)
        for _ in range(6):                                  # check all six sets
            probs = page.evaluate("[...problems].map(p => p.t)")
            n = len(probs)
            unk = [i for i, t in enumerate(probs) if t in kinds]
            assert unk, f"every set must contain woven-in unknowns, got none in {probs}"
            # they land on EVERY 4th slot (idx 3,7,11…) → exactly one per four
            assert all((i + 1) % 4 == 0 for i in unk), f"unknowns must sit on 4th slots, got idx {unk}"
            assert len(unk) == n // 4, \
                f"expected exactly one unknown per 4 (n={n} → {n//4}), got {len(unk)} at {unk}"
            self._reenter_br(page)

    def test_br_no_coin_or_tens_problems(self, page):
        """Bridging mode is pure arithmetic — no TC or TT injected."""
        consts = page.evaluate("({TC, TT})")
        TC, TT = consts["TC"], consts["TT"]
        for _ in range(5):
            page.evaluate("setMode('br'); restart()")
            page.wait_for_timeout(100)
            ptypes = page.evaluate("[...problems].map(p => p.t)")
            assert TC not in ptypes, "br should NOT contain coin (TC) problems"
            assert TT not in ptypes, "br should NOT contain tens (TT) problems"

    def test_br_correct_answer_awards_15_points(self, page):
        """In br mode, a first-try correct answer adds exactly 15 points."""
        self._switch_br(page)
        before = page.evaluate("score")
        solve_one(page)
        assert page.evaluate("score") == before + 15, \
            "br mode: first-try correct should add 15 points"

    def test_br_aids_locked_initially_like_other_modes(self, page):
        """The try-first gate works in br mode too: aids are locked
        until the first wrong attempt."""
        self._switch_br(page)
        # Games button must be tf-locked on fresh problem
        gb_locked = page.locator("#games-drop-btn").evaluate(
            "el => el.classList.contains('tf-locked')"
        )
        assert gb_locked, \
            "br mode: games button must be tf-locked on fresh problem"
        # tryFirst starts at 0
        assert page.evaluate("tryFirst") == 0, \
            "br mode: tryFirst should be 0 on fresh problem"

    def test_br_wrong_answer_penalizes_score_67_percent(self, page):
        """br mode: one wrong → next correct awards round(15 * 0.67) = 10."""
        self._switch_br(page)
        # force a deterministic single-answer (TS) problem at idx 0 so the
        # single-input flow always applies regardless of which set is served
        # (the woven shape-unknowns sit on 4th slots, never idx 0). modePts() in br is 15.
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_selector("#ans:not([disabled])", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        state = get_state(page)
        ans = correct_answer(state)
        assert ans[0] == "single", "forced TS problem must be single-answer"

        correct = ans[1]
        wrong = correct + 1 if correct < 20 else correct - 1

        page.fill("#ans", str(wrong))
        page.click("#chk-btn")
        page.wait_for_function("done === false", timeout=TIMEOUT)
        assert page.evaluate("tryFirst") == 1, \
            "br mode: tryFirst must be 1 after wrong answer"

        # Aids should be unlocked now
        gb_locked = page.locator("#games-drop-btn").evaluate(
            "el => el.classList.contains('tf-locked')"
        )
        assert not gb_locked, \
            "br mode: aids must unlock after first wrong answer"

        # Now correct → expect round(15 * 0.67) = 10
        before = page.evaluate("score")
        page.fill("#ans", str(correct))
        page.click("#chk-btn")
        page.wait_for_timeout(300)
        after = page.evaluate("score")
        assert after - before == 10, \
            f"br mode: after one wrong then correct, score should rise by 10 (67% of 15), got {after - before}"

    # ── two-set alternation ──────────────────────────────────────────────
    def test_br_set2_has_18_problems(self, page):
        """The second bridging set serves exactly 18 problems."""
        self._switch_br(page)            # 1st selection → set 1
        self._reenter_br(page)           # 2nd selection → set 2
        assert page.evaluate("problems.length") == 18, \
            f"Expected 18 problems in set 2, got {page.evaluate('problems.length')}"

    def test_br_set2_exact_order(self, page):
        """The second selection serves SET 2 in its exact prescribed order."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        self._switch_br(page)            # set 1
        self._reenter_br(page)           # set 2
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ_2]
        assert probs == expected, (
            f"br set 2 deviates from the prescribed order.\n"
            f"expected={expected}\ngot={probs}"
        )

    def test_br_set3_has_15_problems(self, page):
        """The third bridging set (big bridges) serves exactly 15 problems."""
        self._switch_br(page)            # set 1
        self._reenter_br(page)           # set 2
        self._reenter_br(page)           # set 3
        assert page.evaluate("problems.length") == 15, \
            f"Expected 15 problems in set 3, got {page.evaluate('problems.length')}"

    def test_br_set3_exact_order(self, page):
        """The third selection serves SET 3 (big bridges) in its exact prescribed order."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        self._switch_br(page)            # set 1
        self._reenter_br(page)           # set 2
        self._reenter_br(page)           # set 3
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ_3]
        assert probs == expected, (
            f"br set 3 deviates from the prescribed order.\n"
            f"expected={expected}\ngot={probs}"
        )

    def test_br_set3_all_cross_ten(self, page):
        """Every set-3 problem genuinely bridges 10 (it IS a crossing-ten curriculum)."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        TA, TS = consts["TA"], consts["TS"]
        self._switch_br(page); self._reenter_br(page); self._reenter_br(page)   # set 3
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        assert len(probs) == 15
        for t, a, b in probs:
            if t == TA:
                assert a < 10 and b < 10 and a + b > 10, f"addition {a}+{b} must cross 10"
            else:  # TS
                assert 10 < a <= 18 and (a % 10) < b and (a - b) < 10, \
                    f"subtraction {a}-{b} must cross 10"

    def test_br_set4_has_15_problems(self, page):
        """The fourth bridging set (gentle crossings) serves exactly 15 problems."""
        self._switch_br(page)            # set 1
        for _ in range(3):
            self._reenter_br(page)       # → 2 → 3 → 4
        assert page.evaluate("problems.length") == 15, \
            f"Expected 15 problems in set 4, got {page.evaluate('problems.length')}"

    def test_br_set4_exact_order(self, page):
        """The fourth selection serves SET 4 (gentle crossings) in its exact prescribed order."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        self._switch_br(page)
        for _ in range(3):
            self._reenter_br(page)       # set 4
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ_4]
        assert probs == expected, (
            f"br set 4 deviates from the prescribed order.\n"
            f"expected={expected}\ngot={probs}"
        )

    def test_br_set4_crosses_ten_only_gently(self, page):
        """Every set-4 problem bridges 10 BUT only by a little — each sum / minuend
        stays in 11–13 (10 is crossed by at most 3)."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        TA, TS = consts["TA"], consts["TS"]
        self._switch_br(page)
        for _ in range(3):
            self._reenter_br(page)       # set 4
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        assert len(probs) == 15
        for t, a, b in probs:
            if t == TA:
                assert a < 10 and b < 10 and 11 <= a + b <= 13, \
                    f"addition {a}+{b} must cross 10 by ≤3 (sum 11–13)"
            else:  # TS
                assert 11 <= a <= 13 and (a % 10) < b and (a - b) < 10, \
                    f"subtraction {a}-{b} must cross 10 from a low teen (minuend 11–13)"

    def _reach_set(self, page, n):
        """Rotate to set n (1-based): switch (set 1) then re-enter n-1 times."""
        self._switch_br(page)
        for _ in range(n - 1):
            self._reenter_br(page)

    def test_br_set5_has_15_problems(self, page):
        """The fifth bridging set (the +9 shortcut) serves exactly 15 problems."""
        self._reach_set(page, 5)
        assert page.evaluate("problems.length") == 15, \
            f"Expected 15 problems in set 5, got {page.evaluate('problems.length')}"

    def test_br_set5_exact_order(self, page):
        """The fifth selection serves SET 5 (+9 shortcut) in its exact prescribed order."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        self._reach_set(page, 5)
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ_5]
        assert probs == expected, f"br set 5 deviates.\nexpected={expected}\ngot={probs}"

    def test_br_set5_all_cross_ten(self, page):
        """Every set-5 problem bridges 10 (all are +9 / −9 crossings)."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        TA, TS = consts["TA"], consts["TS"]
        self._reach_set(page, 5)
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        assert len(probs) == 15
        for t, a, b in probs:
            if t == TA:
                assert a < 10 and b < 10 and a + b > 10, f"addition {a}+{b} must cross 10"
            else:
                assert 10 < a <= 18 and (a % 10) < b and (a - b) < 10, f"subtraction {a}-{b} must cross 10"

    def test_br_set6_has_15_problems(self, page):
        """The sixth bridging set (mid-teen count-backs) serves exactly 15 problems."""
        self._reach_set(page, 6)
        assert page.evaluate("problems.length") == 15, \
            f"Expected 15 problems in set 6, got {page.evaluate('problems.length')}"

    def test_br_set6_exact_order(self, page):
        """The sixth selection serves SET 6 (mid-teen count-backs) in its exact order."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        self._reach_set(page, 6)
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ_6]
        assert probs == expected, f"br set 6 deviates.\nexpected={expected}\ngot={probs}"

    def test_br_set6_all_cross_ten(self, page):
        """Every set-6 problem bridges 10 (14/15 count-backs + builds to 14/15/16)."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        TA, TS = consts["TA"], consts["TS"]
        self._reach_set(page, 6)
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        assert len(probs) == 15
        for t, a, b in probs:
            if t == TA:
                assert a < 10 and b < 10 and a + b > 10, f"addition {a}+{b} must cross 10"
            else:
                assert 10 < a <= 18 and (a % 10) < b and (a - b) < 10, f"subtraction {a}-{b} must cross 10"

    def test_br_alternates_sets_in_turns(self, page):
        """Each menu selection advances: set1 → 2 → 3 → 4 → 5 → 6 → set1 (unknowns
        woven into every set; normalised back to base types for the order check)."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        exp = [[[consts[t], a, b] for t, a, b in seq] for seq in
               (self.EXPECTED_SEQ, self.EXPECTED_SEQ_2, self.EXPECTED_SEQ_3,
                self.EXPECTED_SEQ_4, self.EXPECTED_SEQ_5, self.EXPECTED_SEQ_6)]
        NORM = "[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])"
        self._switch_br(page)
        seen = [page.evaluate(NORM)]
        for _ in range(6):
            self._reenter_br(page)
            seen.append(page.evaluate(NORM))
        for i in range(6):
            assert seen[i] == exp[i], f"selection {i+1} → set {i+1}"
        assert seen[6] == exp[0], "the next selection wraps back to set 1"

    def test_br_restart_size_alternates(self, page):
        """The six sets have lengths 25, 18, 15, 15, 15, 15; restarts cycle through
        them (25 → 18 → 15 → 15 → 15 → 15 → 25). Weaving the unknowns in re-renders
        problems but never adds/removes any, so the lengths are unchanged."""
        self._switch_br(page)
        lens = [page.evaluate("problems.length")]
        for _ in range(6):
            page.evaluate("restart()"); page.wait_for_timeout(120)
            lens.append(page.evaluate("problems.length"))
        assert lens == [25, 18, 15, 15, 15, 15, 25], f"sizes must cycle on restart, got {lens}"

    def test_br_reclick_while_active_rotates_set(self, page):
        """Re-selecting גָּשֵׁר 10 while ALREADY in it starts a fresh game with
        the next set (the no-op guard is lifted for br only)."""
        self._switch_br(page)                        # set 1 (25 problems)
        assert page.evaluate("problems.length") == 25
        page.evaluate("setMode('br')")               # re-click while active
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        assert page.evaluate("problems.length") == 18, \
            "re-clicking גָּשֵׁר 10 must rotate to set 2 (18 problems)"

    def test_br_boot_alternates_across_reloads(self, page):
        """Booting straight into br (the persisted mode) rotates the set each reload.
        There are now SIX sets; 4 consecutive reloads therefore serve 4 DISTINCT sets
        in turn (compared by CONTENT, since several sets share a length) — proving the
        rotation persists across reloads."""
        seqs = []
        for _ in range(4):
            page.evaluate("localStorage.setItem('gameMode','br')")
            page.reload()
            page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
            page.wait_for_function("mode==='br' && problems.length>0", timeout=TIMEOUT)
            seqs.append(page.evaluate("JSON.stringify([...problems].map(p => [p.t, p.a, p.b]))"))
        assert len(set(seqs)) == 4, \
            f"4 reloads must rotate through all 4 distinct sets, got {len(set(seqs))} distinct"




# ─────────────────────────────────────────────────────────
# Bridging-20 mode (b20): a NEW category — crossing the SECOND ten, only by a little
# ─────────────────────────────────────────────────────────
class TestBridge20:
    """'b20' (גָּשֵׁר 20) is its own game/category — FOUR fixed 15-problem sets served in
    ROTATION (set 1 → 2 → 3 → 4 → 1 …). All cross 20 into the low-mid 20s (results 21–25).
    Set 1 = medium jumps (anchors 18/17/16); set 2 = bigger jumps (16/15/14/13);
    set 3 = the 19-ladder + gentlest bridges to 21; set 4 = doubles crossing 20."""

    # SET 1 — medium jumps (anchors 18/17/16, results 22–24)
    B20_SEQ = [
        ("TA", 18, 4), ("TA", 18, 5), ("TA", 18, 6), ("TS", 22, 4), ("TS", 23, 5), ("TS", 24, 6),
        ("TA", 17, 5), ("TA", 17, 6), ("TA", 17, 7), ("TS", 22, 5), ("TS", 23, 6), ("TS", 24, 7),
        ("TA", 16, 6), ("TA", 16, 7), ("TA", 16, 8),
    ]
    # SET 2 — bigger jumps (anchors 16/15/14/13, results 22–25)
    B20_SEQ_2 = [
        ("TA", 16, 7), ("TA", 16, 8), ("TA", 16, 9), ("TS", 23, 7), ("TS", 24, 8), ("TS", 25, 9),
        ("TA", 15, 7), ("TA", 15, 8), ("TA", 15, 9), ("TS", 22, 7), ("TS", 23, 8), ("TS", 24, 9),
        ("TA", 14, 8), ("TA", 14, 9), ("TA", 13, 9),
    ]
    # SET 3 — the 19-ladder (→21–25) + the three smallest bridges to 21
    B20_SEQ_3 = [
        ("TA", 19, 2), ("TA", 19, 3), ("TA", 19, 4), ("TA", 19, 5), ("TA", 19, 6),
        ("TS", 21, 2), ("TS", 22, 3), ("TS", 23, 4), ("TS", 24, 5), ("TS", 25, 6),
        ("TA", 18, 3), ("TA", 17, 4), ("TA", 16, 5), ("TS", 21, 3), ("TS", 21, 4),
    ]
    # SET 4 — doubles & near-doubles crossing 20 (both operands in the low teens)
    B20_SEQ_4 = [
        ("TA", 11, 11), ("TS", 22, 11), ("TA", 12, 12), ("TS", 24, 12),
        ("TA", 11, 12), ("TA", 12, 11), ("TS", 23, 11), ("TS", 23, 12),
        ("TA", 11, 13), ("TA", 13, 11), ("TS", 24, 11), ("TS", 24, 13),
        ("TA", 12, 13), ("TA", 13, 12), ("TS", 25, 12),
    ]

    def _switch(self, page):
        page.evaluate("setMode('b20')")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(120)

    def test_b20_button_exists(self, page):
        """The גָּשֵׁר 20 button (#lbb20) is rendered as its own level."""
        assert page.locator("#lbb20").count() == 1, "Expected #lbb20 button"
        assert "20" in page.locator("#lbb20").inner_text()

    def test_b20_has_15_problems(self, page):
        self._switch(page)
        assert page.evaluate("problems.length") == 15

    def test_b20_exact_order(self, page):
        # every 4th problem is re-rendered as a shape-unknown (TVA/TVS); normalise
        # back to its base add/sub type to verify the curriculum order.
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        self._switch(page)
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.B20_SEQ]
        assert probs == expected, f"b20 order deviated.\nexpected={expected}\ngot={probs}"

    def test_b20_crosses_twenty_only_gently(self, page):
        """Every b20 problem bridges 20 into the low-mid 20s — additions have a sum
        21–25 (anchor < 20), subtractions have a minuend 21–25 and a result below 20."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        TA, TS = consts["TA"], consts["TS"]
        self._switch(page)
        for t, a, b in page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])"):
            if t == TA:
                assert a < 20 and 20 < a + b <= 25, \
                    f"addition {a}+{b} must cross 20 (sum 21–25)"
            else:
                assert 20 < a <= 25 and 0 < (a - b) < 20, \
                    f"subtraction {a}-{b} must cross 20 from a low-20s minuend (result <20)"

    def test_b20_pts_and_prize(self, page):
        """b20 scores 15 per answer and has its own prize goal (like גָּשֵׁר 10)."""
        self._switch(page)
        assert page.evaluate("modePts()") == 15
        assert page.evaluate("GIFT_GOALS['b20']") == 900

    def test_b20_active_button_marker(self, page):
        self._switch(page)
        assert page.locator("#lbb20.active").count() == 1
        assert page.locator("#lbbr.active").count() == 0

    def test_b20_rotates_four_sets(self, page):
        """Every rebuild advances the set: 1 → 2 → 3 → 4 → 1 (the shape-unknown type
        is woven into EACH set, every 4th problem; normalised back to base types for
        the order check)."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        exps = [[[consts[t], a, b] for t, a, b in seq]
                for seq in (self.B20_SEQ, self.B20_SEQ_2, self.B20_SEQ_3, self.B20_SEQ_4)]
        NORM = "[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])"
        self._switch(page)
        got = [page.evaluate(NORM)]
        for _ in range(4):
            page.evaluate("restart()"); page.wait_for_timeout(120)
            got.append(page.evaluate(NORM))
        assert got[0] == exps[0], f"build 1 must serve set 1\ngot={got[0]}"
        assert got[1] == exps[1], "restart → set 2"
        assert got[2] == exps[2], "restart → set 3"
        assert got[3] == exps[3], "restart → set 4"
        assert got[4] == exps[0], "wraps back to set 1"
        # the unknown type is present, on 4th slots (checked on the last-built set)
        unk = page.evaluate("[...problems].map((p,i)=>({i,u:p.t===TVA||p.t===TVS})).filter(o=>o.u).map(o=>o.i)")
        assert unk and all((i + 1) % 4 == 0 for i in unk), \
            f"b20 must weave shape-unknowns onto 4th slots, got idx {unk}"

    def test_b20_all_four_sets_cross_twenty(self, page):
        """Every problem in ALL FOUR sets bridges 20 (sums/minuends 21–25), including
        the new set 3 (19-ladder) and set 4 (doubles)."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        TA, TS = consts["TA"], consts["TS"]
        NORM = "[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])"
        self._switch(page)
        for s in range(4):
            for t, a, b in page.evaluate(NORM):
                if t == TA:
                    assert a < 20 and 20 < a + b <= 25, f"set{s+1}: {a}+{b} must cross 20 (sum 21–25)"
                else:
                    assert 20 < a <= 25 and 0 < (a - b) < 20, f"set{s+1}: {a}-{b} must cross 20 (result <20)"
            page.evaluate("restart()"); page.wait_for_timeout(120)

    def test_b20_set2_exact_order_and_crosses_gently(self, page):
        """Set 2 (bigger jumps) serves its exact order; all 15 still cross 20 into the
        low-mid 20s (sums/minuends 21–25) — only the decomposition is larger."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        TA, TS = consts["TA"], consts["TS"]
        self._switch(page)                          # set 1
        page.evaluate("restart()"); page.wait_for_timeout(120)   # → set 2
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.B20_SEQ_2]
        assert probs == expected, f"b20 set 2 order deviated.\nexpected={expected}\ngot={probs}"
        for t, a, b in probs:
            if t == TA:
                assert a < 20 and 20 < a + b <= 25, \
                    f"addition {a}+{b} must cross 20 (sum 21–25)"
            else:
                assert 20 < a <= 25 and (a - b) < 20, \
                    f"subtraction {a}-{b} must cross 20 from a low-20s minuend"
