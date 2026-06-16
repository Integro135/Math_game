"""
Automated tests for subtraction_game.html  (self-contained, no conftest.py)

Run (headless, default):
    py -m pytest test_game.py

Open a visible Chrome window:
    set HEADED=1 && py -m pytest test_game.py

Headed + slowed down so you can follow each action:
    set HEADED=1 && set SLOW_MO=600 && py -m pytest test_game.py
"""
import os
import time
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

GAME_URL   = Path(r"c:\Code\subtraction_game\index.html").as_uri()
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
TIMEOUT    = 25_000  # ms


# =============================================================================
# Reporting — live per-test log + end-of-run summary
# Registered as a pytest plugin from the _register_hooks session fixture below.
# =============================================================================

_DESC = {
    "test_perfect_run_produces_all_check_marks":
        "12/12 correct on first try -> grade 1000, every row marked correct",
    "test_wrong_then_correct_flagged_in_report":
        "Submit wrong then correct -> report flags wrong attempt and correction",
    "test_skipped_problem_shows_daleg_badge":
        "Wrong then skip -> report shows 'skip' badge on that row",
    "test_td_report_shows_actual_pair_entered":
        "Solve X+X problem -> report stores the exact pair entered (e.g. 3+4)",
    "test_grade_removes_full_points_for_any_mistake":
        "Any mistake removes 100 full points from grade (no partial credit)",
    "test_td_problems_sit_at_positions_4_8_12":
        "X+X / X-X problems always land at slots 4, 8, 12 (not random)",
    "test_first_three_slots_are_never_td":
        "Slots 1-3 are never X+X or X-X type",
    "test_td_renders_two_inputs_not_one":
        "X+X problem renders exactly two answer boxes, not one",
    "test_tda_accepts_any_valid_pair":
        "X+X=R: any pair where v1+v2=R is accepted as correct",
    "test_tds_accepts_any_valid_pair":
        "X-X=R: any pair where v1-v2=R is accepted as correct",
    "test_td_wrong_pair_shows_sad_modal":
        "Pair that does not satisfy equation -> sad emoji modal appears",
    "test_td_empty_inputs_show_error_not_sad_modal":
        "Submitting empty boxes -> validation error (no sad modal)",
    "test_enter_in_ans1_moves_focus_to_ans2":
        "Pressing Enter in box 1 moves keyboard focus to box 2",
    "test_wrong_td_answer_stays_on_same_problem":
        "Wrong X+X answer leaves idx unchanged (stays on same problem)",
    "test_both_tda_and_tds_types_appear_within_few_sessions":
        "Both X+X and X-X exercise types appear within 4 game sessions",
    "test_score_starts_at_zero":
        "Score is 0 at game start",
    "test_default_mode_is_20":
        "Default difficulty is 'up to 20'",
    "test_correct_answer_in_mode20_adds_20_points":
        "Mode 'up to 20': correct answer awards +20 stars",
    "test_correct_answer_in_mode10_adds_10_points":
        "Mode 'up to 10': correct answer awards +10 stars",
    "test_correct_answer_in_mode5_adds_5_points":
        "Mode 'up to 5': correct answer awards +5 stars",
    "test_mode_switch_resets_score_and_idx":
        "Switching difficulty resets score to 0 and problem index to 0",
    "test_mode_button_becomes_active_after_switch":
        "Clicking a level button marks it active and deactivates the previous one",
    "test_game_has_12_problems":
        "Every game session contains exactly 12 problems",
    "test_grade_below_1000_when_any_wrong_answer":
        "Any wrong attempt lowers the final grade below 1000",
    "test_progress_bar_advances_each_problem":
        "Progress bar width grows after every solved problem",
    "test_score_display_updates_after_correct_answer":
        "Score display in the header updates immediately after a correct answer",
    "test_game_ends_after_all_12_problems":
        "End screen appears correctly after all 12 problems are solved",
    "test_restart_resets_game_state":
        "'Play again' button resets score, idx, and generates new 12 problems",
    "test_coins_appear_in_mode5_every_session":
        "Mode 5: at least 1 coin-counting problem in every session (x5 checked)",
    "test_coins_appear_in_mode10_every_session":
        "Mode 10: at least 1 coin-counting problem in every session (x5 checked)",
    "test_coins_appear_in_mode20_every_session":
        "Mode 20: at least 1 coin-counting problem in every session (x5 checked)",
    "test_coins_appear_across_all_three_levels_in_one_pass":
        "Levels 5, 10, 20 each have a coin problem in a single sweep",
    "test_tc_problem_shows_number_line":
        "TC (coin) problem shows #chain-tools number line, not hidden",
    "test_chain_first_4_answers_at_most_10":
        "mx mode: first 5 problems (index 0-4) have correct answer ≤ 20",
    "test_chain_problem_5_answer_at_most_20":
        "mx mode: problem 5 (index 4) has correct answer ≤ 20",
    "test_chain_last_4_first_number_above_10":
        "mx mode: last 4 problems (12-15) all have first operand > 10",
    "test_nl_hidden_then_revealed_for_ta":
        "TA: NL hidden while fresh; appears at 0 after the first mistake",
    "test_nl_hidden_then_revealed_for_ts":
        "TS: NL hidden while fresh; appears at 0 after the first mistake",
    "test_nl_hidden_then_revealed_for_tc":
        "TC (coin): NL hidden while fresh; appears at 0 after the first mistake",
    "test_nl_hidden_then_revealed_for_tda":
        "TDA: NL hidden while fresh; appears at 0 after the first mistake",
    "test_nl_hidden_then_revealed_for_tds":
        "TDS: NL hidden while fresh; appears at 0 after the first mistake",
    "test_nl_hidden_then_revealed_for_chain":
        "Chain: all aids hidden while fresh; kangaroo NL appears after the first mistake",
    "test_tt_appears_5_times_in_melech":
        "Mode 20 (מלך): every session has ≥5 TT (round-tens) problems",
    "test_tt_appears_5_times_in_malka":
        "Mode mx (מלכה): every session has ≥5 TT (round-tens) problems",
    "test_tt_nl_panel_at_num1":
        "TT problem: #nl-panel visible, kangaroo starts at num1 on 0-100 scale",
    "test_tt_correct_answer_accepted":
        "TT problem: submitting correct tens answer marks the problem done",
}

_CLASS_LABELS = {
    "TestReport":                "End-of-game Report",
    "TestDoubleUnknown":         "Double-unknown Problems (X+X / X-X)",
    "TestScoreAndMode":          "Scoring & Difficulty Modes",
    "TestGameFlow":              "General Game Flow",
    "TestCoinProblems":          "Coin-counting Problems",
    "TestChainAndCoinAids":      "Chain Mode & Coin Aid Features",
    "TestNumberLineVisibility":  "Number Line (#nl-panel) Visibility per Problem Type",
    "TestTensProblems":          "Tens Problems (TT) — מלך & מלכה",
    "TestDynamicExercises":      "Dynamic Exercise-type Loading (exercises/*.ex.js)",
    "TestBigStepMode":           "Big Number ± 1/2 (עַד 100)",
    "TestSupermanColumnAdd":     "Superman — Column Addition Module",
    "TestJarStageDisplay":       "Jar Stage Display Module (aids/jar_stage.js)",
    "TestAnswerBorders":         "Answer green/red Border Contract",
    "TestSettingsModalFlow":     "Settings Modal (game picker)",
    "TestAidToggleIcons":        "Fixed Aid-toggle Icons",
    "TestModePersistence":       "Chosen Game Persists Across Refresh",
    "TestGiftReward":            "Gift Reward — eligibility + end-of-set gift screen",
    "TestPraiseText":            "Success-screen praise — variety + player name",
    "TestSuccessDuration":       "Success-screen display duration (+1s linger)",
    "TestBridgeSplitTooltip":    "Crossing-ten number bond — split hover tooltip",
    "test_subtraction_second_operand_splits":
        "18-11: hovering 11 splits the tooltip into 8 | 3 (parts above their clusters)",
    "test_addition_second_operand_splits":
        "8+7: hovering 7 splits into 2 (complete to ten) | 5",
    "test_first_operand_never_splits":
        "Hovering the first number (18) stays a plain, non-split tooltip",
    "test_non_crossing_does_not_split":
        "18-3 doesn't cross ten -> the 3 carries no data-split",
    "test_chain_third_term_splits_on_running_result":
        "Chain 18-10+5: the +5 splits on the running result 8 -> 2 | 3",
    "test_missing_result_splits_ten_and_ones":
        "Missing 15-?=13: the shown result 13 splits ten+ones -> 10 | 3",
    "test_bond_shows_whole_number_and_two_branches":
        "Split tooltip shows the whole number + two branch lines",
    "test_split_parts_are_positive_and_sum_to_whole":
        "14-7: split parts are positive and sum to the whole (7)",
    "test_two_addends_first_input_previews_objects_no_split":
        "?+?=15: typing in the first box previews that many objects (no split)",
    "test_tooltip_closes_when_success_screen_shows":
        "Objects tooltip closes when the celebration/prize screen opens",
    "TestPrizeConfig":           "Per-game prize-level config — editable, persisted, dynamic 🎁",
    "test_prize_inputs_render_one_per_game":
        "Settings shows one prize-level input per game",
    "test_default_thresholds_only_reward_games":
        "Out of the box only br/mx/sup have a prize; basic games have none",
    "test_badge_shows_only_when_prize_set":
        "The 🎁 badge on a game button tracks whether it has a prize",
    "test_zero_clears_prize_from_goals":
        "Setting level 0 removes the game's prize",
    "test_prize_level_persists_across_reload":
        "Changed prize levels survive a page reload (localStorage)",
    "test_cleared_prize_gives_no_gift_screen":
        "A cleared prize → perfect run awards no gift screen",
    "test_newly_set_prize_awards_gift":
        "Giving a basic game a prize → a clearing run awards the gift",
    "TestScoreHistory":          "Score history — name + game + grade per set, persisted",
    "test_completed_game_is_recorded":
        "Finishing a set logs grade + name + game",
    "test_history_is_newest_first":
        "History lists the newest completed set first",
    "test_history_persists_across_reload":
        "Score history survives a page reload (localStorage)",
    "test_history_tab_shows_recorded_rows":
        "Settings 📜 history tab lists recorded runs",
    "TestSettingsTabs":          "Settings sub-tabs — general / prizes / history",
    "test_opens_on_general_tab":
        "Settings opens on the general tab (game picker visible)",
    "test_prizes_tab_shows_prize_inputs":
        "The prizes tab reveals the per-game prize inputs",
    "test_history_tab_shows_history_body":
        "The history tab reveals the run-history list",
    "test_clear_history_empties_it":
        "Clear-history wipes the saved log",
    "TestSupermanDigitPreview":  "Superman column digit object-preview (right, per column)",
    "test_units_first_number_is_plain":
        "Superman 18+15: first number's units (8) previews plain, no split",
    "test_units_carry_second_number_splits":
        "Superman 18+15: a units carry splits the second units (5) into 2 | 3",
    "test_units_no_carry_second_number_plain":
        "Superman 16+11: no carry -> second units (1) plain, no split",
    "test_modal_sits_to_the_right_of_the_digit":
        "Superman preview opens beside the digit (right), not below",
    "test_tens_digit_preview_after_units_solved":
        "Superman: after units solved, a tens digit previews the tens",
    "test_units_digit_inert_during_tens_phase":
        "Superman: units digits are inert while solving the tens column",
}


def _build_desc(nodeid: str) -> str:
    name  = nodeid.split("::")[-1]
    base  = name.split("[")[0] if "[" in name else name
    param = name[len(base) + 1:-1] if "[" in name else None
    desc  = _DESC.get(base, base.replace("_", " "))
    if param:
        desc = f"[{param}]  {desc}"
    return desc


class _ReportPlugin:
    """Registered at session start; provides live logging + end-of-run summary."""

    def __init__(self):
        self._tr        = None   # terminal reporter, set in setup fixture
        self._collected = []     # [(nodeid, outcome)]

    # -- live per-test logging ------------------------------------------------

    @pytest.hookimpl(hookwrapper=True)
    def pytest_runtest_call(self, item):
        desc = _build_desc(item.nodeid)
        self._write(f"\n  >> {desc}")
        t0      = time.monotonic()
        outcome = yield
        elapsed = time.monotonic() - t0
        try:
            from _pytest.outcomes import Skipped
            is_skip = (outcome.excinfo is not None
                       and issubclass(outcome.excinfo[0], Skipped))
        except Exception:
            is_skip = False
        if outcome.excinfo is None:
            self._write(f"     PASS  ({elapsed:.1f}s)")
        elif is_skip:
            self._write("     SKIP")
        else:
            self._write(f"     FAIL  ({elapsed:.1f}s)")

    def pytest_runtest_logreport(self, report):
        if report.when == "call":
            self._collected.append((report.nodeid, report.outcome))
        elif report.when == "setup" and report.skipped:
            self._collected.append((report.nodeid, "skipped"))
            self._write(f"\n  >> {_build_desc(report.nodeid)}")
            self._write("     SKIP")

    # -- end-of-run summary ---------------------------------------------------

    def pytest_terminal_summary(self, terminalreporter, exitstatus, config):
        W = 76
        lines = ["", "=" * W,
                 f"{'SUBTRACTION GAME  --  TEST RESULTS':^{W}}", "=" * W]
        current_cls = None
        for nodeid, outcome in self._collected:
            parts = nodeid.split("::")
            cls   = parts[1] if len(parts) >= 3 else "--"
            if cls != current_cls:
                if current_cls is not None:
                    lines.append("")
                lines.append(f"  {_CLASS_LABELS.get(cls, cls)}")
                lines.append("  " + "-" * (W - 4))
                current_cls = cls
            tag  = {"passed": "PASS", "failed": "FAIL",
                    "skipped": "SKIP"}.get(outcome, "????")
            desc = _build_desc(nodeid)
            if len(desc) > W - 10:
                desc = desc[:W - 11] + "..."
            lines.append(f"  {tag}  {desc}")
        passed  = sum(1 for _, o in self._collected if o == "passed")
        failed  = sum(1 for _, o in self._collected if o == "failed")
        skipped = sum(1 for _, o in self._collected if o == "skipped")
        lines += ["", "=" * W,
                  f"  TOTAL:  {passed} passed"
                  + (f"  |  {failed} FAILED" if failed  else "")
                  + (f"  |  {skipped} skipped" if skipped else ""),
                  "=" * W, ""]
        for line in lines:
            terminalreporter.write_line(line)

    # -- helper ---------------------------------------------------------------

    def _write(self, text: str) -> None:
        if self._tr:
            self._tr.write_line(text)


_plugin = _ReportPlugin()


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(scope="session", autouse=True)
def _register_hooks(request):
    """Register the reporting plugin and wire up the terminal writer."""
    _plugin._tr = request.config.pluginmanager.get_plugin("terminalreporter")
    request.config.pluginmanager.register(_plugin, "subtraction_report")


@pytest.fixture(scope="session")
def browser_instance(_register_hooks):
    """One browser process for the entire test session, pre-warmed."""
    headed  = bool(os.environ.get("HEADED"))
    slow_mo = int(os.environ.get("SLOW_MO", "0"))
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=not headed,
            slow_mo=slow_mo,
            executable_path=CHROME_EXE,
        )
        # Warm up: load the game once so Chrome caches fonts/scripts
        ctx = browser.new_context()
        p = ctx.new_page()
        p.goto(GAME_URL)
        p.wait_for_selector("#ans, #ans1", timeout=30_000)
        ctx.close()
        yield browser
        browser.close()


@pytest.fixture
def page(browser_instance):
    """Fresh browser context + page per test, game fully loaded.
    The intro splash is visual-only — disabled here for deterministic boots."""
    ctx = browser_instance.new_context()
    p = ctx.new_page()
    p.add_init_script("localStorage.setItem('introSplash','0')")
    p.goto(GAME_URL)
    p.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
    yield p
    ctx.close()


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────

def get_state(page) -> dict:
    """Snapshot every relevant JS global in one round-trip."""
    return page.evaluate("""() => ({
        ptype, num1, num2, num3, num4,
        idx, score, done, mode, ttOp, bgOp,
        TM, TS, TA, TX, TZ, TW, TDA, TDS, TC, TT, TCA, TBG
    })""")


def open_settings_via_gate(page):
    """Click the gear and clear the parent gate (an a×b challenge) so the settings
    modal opens. The gate stores the expected product in the global `_parentAns`,
    so the test answers it deterministically (no need to read the rendered sum)."""
    page.click("#settings-btn")
    page.wait_for_function(
        "getComputedStyle(document.getElementById('parent-ov')).display === 'flex'",
        timeout=TIMEOUT)
    page.evaluate(
        "document.getElementById('parent-ans').value = String(_parentAns); checkParentGate()")
    page.wait_for_function(
        "getComputedStyle(document.getElementById('settings-ov')).display === 'flex'",
        timeout=TIMEOUT)


def correct_answer(state: dict) -> tuple:
    """
    Return (kind, *values) describing the correct answer.
    kind='single' → fill #ans with values[0]
    kind='td'     → fill #ans1 with values[0], #ans2 with values[1]
    """
    p  = state["ptype"]
    n1 = state["num1"]
    n2 = state["num2"]
    n3 = state["num3"]
    n4 = state["num4"]
    if p == state.get("TDA"):
        return ("td", 0, n1)          # 0 + n1 = n1
    if p == state.get("TDS"):
        return ("td", n1, 0)          # n1 - 0 = n1
    if p == state.get("TC"):
        return ("single", n1)         # coin-counting: num1 holds the correct sum
    if p == state.get("TZ"):
        return ("single", n1 + n2 + n3 + n4)
    if p == state.get("TW"):
        return ("single", n1 - n2 - n3)
    if p == state.get("TX"):
        return ("single", n1 - n2 + n3)
    if p == state.get("TA"):
        return ("single", n1 + n2)
    if p == state.get("TT"):
        return ("single", n1 + n2 if state.get("ttOp") == "add" else n1 - n2)
    if p == state.get("TBG"):
        return ("single", n1 + n2 if state.get("bgOp") == "add" else n1 - n2)
    return ("single", n1 - n2)        # TM or TS


def submit_answer(page, ans: tuple) -> None:
    if ans[0] == "td":
        page.fill("#ans1", str(ans[1]))
        page.fill("#ans2", str(ans[2]))
    else:
        page.fill("#ans", str(ans[1]))
    page.click("#chk-btn")


def wait_fw_and_advance(page, before_idx: int) -> None:
    """
    Wait for the fireworks after a correct answer, then advance.
    The fireworks close themselves after ~1.7 s and auto-advance via nextP(),
    so the _fwOn===true window is transient: under CPU load (full-suite runs)
    rAF-based polling can miss it entirely.  Therefore wait for EITHER the
    fireworks or the auto-advance, and press Enter only while they're showing.
    """
    try:
        page.wait_for_function(
            f"(typeof _fwOn !== 'undefined' && _fwOn === true)"
            f" || idx > {before_idx} || !!document.querySelector('.end-scr')",
            timeout=TIMEOUT,
        )
    except Exception:
        diag = page.evaluate(
            "({idx, done, ptype, num1, num2, num3, num4, tryFirst, mode,"
            " fwOn: typeof _fwOn !== 'undefined' && _fwOn,"
            " ansVal: document.getElementById('ans')?.value,"
            " a1: document.getElementById('ans1')?.value,"
            " a2: document.getElementById('ans2')?.value,"
            " sad: document.getElementById('sad-ov')?.style.display,"
            " fb: document.getElementById('fb')?.textContent,"
            " eq: document.querySelector('.equation')?.textContent?.trim()})"
        )
        print(f"\n[wait_fw_and_advance] timeout, before_idx={before_idx}, diag={diag}")
        raise
    # Close the celebration deterministically: call fwClose() in-page (immune
    # to keyboard focus/timing) and re-try every 500 ms until idx advances —
    # robust against any of the rotating success screens under CPU load.
    deadline = time.monotonic() + TIMEOUT / 1000
    while True:
        advanced = page.evaluate(
            f"idx > {before_idx} || !!document.querySelector('.end-scr')")
        if advanced:
            return
        page.evaluate(
            "typeof _fwOn !== 'undefined' && _fwOn === true"
            " && typeof fwClose === 'function' && (fwClose(), true)")
        if time.monotonic() > deadline:
            page.wait_for_function(   # raise with playwright's rich error
                f"idx > {before_idx} || !!document.querySelector('.end-scr')",
                timeout=1000,
            )
            return
        page.wait_for_timeout(250)


def reveal_aids(page) -> None:
    """Make one wrong answer so the (fully hidden) aid panels become visible.
    Re-submits if the first click didn't register (robust under CPU load —
    a covered/late check button used to leave tryFirst at 0 and time out)."""
    state = get_state(page)
    kind = correct_answer(state)

    def submit_wrong():
        if kind[0] == "td":
            page.fill("#ans1", "99")
            page.fill("#ans2", "99")
        else:
            wrong = kind[1] + 1 if kind[1] < 99 else kind[1] - 1
            page.fill("#ans", str(wrong))
        page.evaluate("checkAns()")   # call directly — immune to pointer interception

    deadline = time.monotonic() + TIMEOUT / 1000
    while page.evaluate("tryFirst") == 0:
        submit_wrong()
        try:
            page.wait_for_function("tryFirst > 0", timeout=2000)
        except Exception:
            if time.monotonic() > deadline:
                page.wait_for_function("tryFirst > 0", timeout=1000)  # raise richly
    page.wait_for_timeout(100)


def solve_one(page) -> None:
    """
    Solve the current problem correctly.
    Presses Enter as soon as _fwOn becomes true (fireworks just started)
    so fwClose() is called within ~1 frame instead of waiting 1700 ms.
    Uses wait_for_function for all checks so polling runs inside the browser
    process — robust under CPU load.
    """
    # Boot/setMode load the pool asynchronously — make sure a real, current
    # problem is on the board before reading its state (avoids a load race on
    # the very first solve under heavy CPU load).
    page.wait_for_function(
        "typeof problems !== 'undefined' && problems.length > 0"
        " && idx < problems.length && done === false",
        timeout=TIMEOUT,
    )
    before_idx = page.evaluate("idx")
    submit_answer(page, correct_answer(get_state(page)))
    # _fwOn is set synchronously by showFw() which fires after checkAns()'s 300 ms setTimeout
    wait_fw_and_advance(page, before_idx)


def play_n_correctly(page, n: int) -> None:
    """Solve the next n problems correctly.  solve_one's wait_for_function
    guarantees idx has advanced (and loadProblem has run) before returning,
    so Playwright's built-in fill actionability check handles input readiness."""
    for _ in range(n):
        solve_one(page)


def open_report(page) -> None:
    page.locator("button.b-rep").click()
    page.wait_for_selector("#report-ov", state="visible", timeout=TIMEOUT)


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
        """Skip button was removed when seamless retry was introduced.
        The 'דולג' badge can no longer be produced via user interaction."""
        pytest.skip("Skip button removed — seamless retry replaced manual skip/try-again buttons")

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
            v1, v2 = r + 1, 1          # (r+1) − 1 = r

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


# ─────────────────────────────────────────────────────────
# Double-unknown (TDA / TDS) tests
# ─────────────────────────────────────────────────────────

class TestDoubleUnknown:
    @staticmethod
    def _switch_to_mode10(page):
        """sampleWithTD-based mode 10 has predictable TD slots (4, 8, 12)."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def test_td_problems_sit_at_positions_4_8_12(self, page):
        """sampleWithTD must place TDA/TDS exactly at slots 4, 8, 12 (1-indexed).
        Uses mode 10 (sampleWithTD); mx mode uses a different layout."""
        self._switch_to_mode10(page)
        consts   = page.evaluate("({TDA, TDS})")
        td_types = {consts["TDA"], consts["TDS"]}
        ptypes   = page.evaluate("[...problems].map(p => p.t)")

        assert len(ptypes) == 12
        for pos in (3, 7, 11):        # 0-indexed → 4th, 8th, 12th
            assert ptypes[pos] in td_types, \
                f"Slot {pos + 1} should be TD, got '{ptypes[pos]}'"

    def test_first_three_slots_are_never_td(self, page):
        """Slots 1–3 must never be TDA or TDS in sampleWithTD-based modes."""
        self._switch_to_mode10(page)
        consts   = page.evaluate("({TDA, TDS})")
        td_types = {consts["TDA"], consts["TDS"]}
        ptypes   = page.evaluate("[...problems].map(p => p.t)")

        for pos in (0, 1, 2):
            assert ptypes[pos] not in td_types, \
                f"Slot {pos + 1} should NOT be TD, got '{ptypes[pos]}'"

    def test_td_renders_two_inputs_not_one(self, page):
        """Navigating to a TD problem shows #ans1 + #ans2, not #ans."""
        self._switch_to_mode10(page)
        page.evaluate("idx=3; loadProblem()")
        page.wait_for_timeout(150)

        assert page.locator("#ans1").count() == 1, "Expected #ans1"
        assert page.locator("#ans2").count() == 1, "Expected #ans2"
        assert page.locator("#ans").count()  == 0, "#ans must be absent for TD"

    def test_tda_accepts_any_valid_pair(self, page):
        """For TDA (___+___=R), entering v1,v2 where v1+v2=R must succeed."""
        problems = page.evaluate("[...problems].map((p,i) => ({i, t: p.t, r: p.r}))")
        consts   = page.evaluate("({TDA})")
        tda_slots = [x for x in problems if x["t"] == consts["TDA"]]
        if not tda_slots:
            pytest.skip("No TDA problem in this session")

        slot = tda_slots[0]
        page.evaluate(f"idx={slot['i']}; loadProblem()")
        page.wait_for_selector("#ans1:not([disabled])", timeout=TIMEOUT)

        r  = slot["r"]
        v1 = max(1, r // 2)           # non-trivial split
        v2 = r - v1
        page.fill("#ans1", str(v1))
        page.fill("#ans2", str(v2))
        before = page.evaluate("idx")
        page.click("#chk-btn")
        wait_fw_and_advance(page, before)

    def test_tds_accepts_any_valid_pair(self, page):
        """For TDS (___-___=R), entering v1,v2 where v1-v2=R must succeed."""
        problems = page.evaluate("[...problems].map((p,i) => ({i, t: p.t, r: p.r}))")
        consts   = page.evaluate("({TDS})")
        tds_slots = [x for x in problems if x["t"] == consts["TDS"]]
        if not tds_slots:
            pytest.skip("No TDS problem in this session")

        slot = tds_slots[0]
        page.evaluate(f"idx={slot['i']}; loadProblem()")
        page.wait_for_selector("#ans1:not([disabled])", timeout=TIMEOUT)

        r  = slot["r"]
        v1 = r + 3                     # r+3 − 3 = r
        v2 = 3
        page.fill("#ans1", str(v1))
        page.fill("#ans2", str(v2))
        before = page.evaluate("idx")
        page.click("#chk-btn")
        wait_fw_and_advance(page, before)

    def test_td_wrong_pair_shows_sad_modal(self, page):
        """Entering a pair that does NOT satisfy the equation triggers the sad modal."""
        self._switch_to_mode10(page)
        page.evaluate("idx=3; loadProblem()")
        page.wait_for_selector("#ans1:not([disabled])", timeout=TIMEOUT)

        state = get_state(page)
        r = state["num1"]
        # Pair deliberately wrong: sum/diff will never equal r
        wrong = r + 7
        page.fill("#ans1", str(wrong))
        page.fill("#ans2", str(wrong))
        page.click("#chk-btn")

        sad = page.locator("#sad-ov")
        sad.wait_for(state="visible", timeout=TIMEOUT)
        assert sad.is_visible()

    def test_td_empty_inputs_show_error_not_sad_modal(self, page):
        """Clicking check with blank TD inputs shows a validation error, not sad modal."""
        self._switch_to_mode10(page)
        page.evaluate("idx=3; loadProblem()")
        page.wait_for_selector("#ans1", timeout=TIMEOUT)

        page.click("#chk-btn")

        fb = page.locator("#fb")
        assert "fb-err" in (fb.get_attribute("class") or ""), \
            "Expected fb-err class on feedback element"
        assert page.locator("#sad-ov").is_hidden(), \
            "Sad modal must NOT appear for empty inputs"

    def test_enter_in_ans1_moves_focus_to_ans2(self, page):
        """Pressing Enter in #ans1 should move keyboard focus to #ans2."""
        self._switch_to_mode10(page)
        page.evaluate("idx=3; loadProblem()")
        page.wait_for_selector("#ans1", timeout=TIMEOUT)
        # loadProblem auto-focuses #ans1 after 60 ms — let that fire first,
        # otherwise it steals focus back from #ans2 right after our Enter
        page.wait_for_function(
            "document.activeElement?.id === 'ans1'", timeout=TIMEOUT
        )

        page.locator("#ans1").fill("3")
        page.keyboard.press("Enter")

        focused = page.evaluate("document.activeElement?.id")
        assert focused == "ans2", \
            f"Focus should land on ans2 after Enter in ans1, got '{focused}'"

    def test_wrong_td_answer_stays_on_same_problem(self, page):
        """A wrong TD submission does not advance idx."""
        self._switch_to_mode10(page)
        page.evaluate("idx=3; loadProblem()")
        page.wait_for_timeout(150)

        state = get_state(page)
        r = state["num1"]
        page.fill("#ans1", str(r + 20))
        page.fill("#ans2", str(r + 20))
        page.click("#chk-btn")
        page.wait_for_timeout(1700)   # sad modal fade

        assert page.evaluate("idx") == 3, \
            "idx must not change after a wrong TD answer"

    def test_both_tda_and_tds_types_appear_within_few_sessions(self, page):
        """
        Within at most 4 game sessions both x+x (TDA) and x-x (TDS) exercise
        types must be observed.

        Maths: each session draws 3 TD slots from 12 TDA + 12 TDS = 24 total.
        P(all-TDA in one session) ≈ 10.9 %, so
        P(never TDA across 4 sessions) ≈ 0.014 % — essentially impossible.
        """
        consts = page.evaluate("({TDA, TDS})")
        seen: set = set()

        for _ in range(4):
            ptypes = page.evaluate("[...problems].map(p => p.t)")
            for t in ptypes:
                if t in (consts["TDA"], consts["TDS"]):
                    seen.add(t)
            if seen == {consts["TDA"], consts["TDS"]}:
                break
            # Restart to get a freshly shuffled problem set
            page.evaluate("restart()")
            page.wait_for_selector(
                "#ans:not([disabled]), #ans1:not([disabled])", timeout=TIMEOUT
            )

        assert consts["TDA"] in seen, \
            "TDA (x+x=R) exercise type never appeared across 4 game sessions"
        assert consts["TDS"] in seen, \
            "TDS (x-x=R) exercise type never appeared across 4 game sessions"


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

    def test_correct_answer_in_mode10_adds_10_points(self, page):
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(200)
        solve_one(page)
        assert page.evaluate("score") == 10

    def test_correct_answer_in_mode5_adds_5_points(self, page):
        """Mode 5 (עד 5) was removed in v5.89."""
        pytest.skip("Mode 5 was removed — bridging mode replaces it")

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
          - have exactly 17 problems (15 base + 2 big ±1/2 mixed in)
          - contain ≥1 of EACH problem type:
            TZ, TX, TW, TM, TS, TA, TDA, TDS, TT, TC, TBG.
        """
        consts = page.evaluate("({TM,TS,TA,TX,TZ,TW,TDA,TDS,TC,TT,TBG})")
        # 5 fresh Queen sessions — each must satisfy the rule
        for session in range(5):
            page.evaluate("setMode('mx'); restart()")
            page.wait_for_function("problems.length === 17", timeout=TIMEOUT)
            n = page.evaluate("problems.length")
            assert n == 17, \
                f"Session {session+1}: expected 17 mx problems, got {n}"
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
        """The progress bar width must grow after each solved problem."""
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


# ─────────────────────────────────────────────────────────
# Coin-problem (TC) presence tests
# ─────────────────────────────────────────────────────────

class TestCoinProblems:
    """
    injectCoins() guarantees ≥1 TC (coin-counting) problem per session for
    every non-zero mode.  These tests verify that contract holds across all
    three main difficulty levels and that it remains true across multiple
    consecutive sessions (to confirm it is not a lucky one-off).
    """

    def _tc_count_in_session(self, page) -> int:
        consts = page.evaluate("({TC})")
        ptypes = page.evaluate("[...problems].map(p => p.t)")
        return sum(1 for t in ptypes if t == consts["TC"])

    def test_coins_appear_in_mode5_every_session(self, page):
        """Mode 5 (עד 5) was removed in v5.89."""
        pytest.skip("Mode 5 was removed")

    def test_coins_appear_in_mode10_every_session(self, page):
        """Mode 10 must include ≥1 coin problem in every game session."""
        page.evaluate("setMode(10)")
        page.wait_for_timeout(100)
        for session in range(5):
            count = self._tc_count_in_session(page)
            assert count >= 1, \
                f"Mode 10 session {session + 1}: expected ≥1 coin problem, got {count}"
            page.evaluate("restart()")
            page.wait_for_timeout(100)

    def test_coins_appear_in_modemx_every_session(self, page):
        """Mode mx (מַלְכָּה) must include ≥1 coin problem in every game session."""
        for session in range(5):        # game starts in mode 'mx'
            count = self._tc_count_in_session(page)
            assert count >= 1, \
                f"Mode mx session {session + 1}: expected ≥1 coin problem, got {count}"
            page.evaluate("restart()")
            page.wait_for_timeout(100)

    def test_coins_appear_across_all_three_levels_in_one_pass(self, page):
        """
        Single sweep: switch through levels 5 → 10 → mx and confirm ≥1 coin
        problem in each.  Faster than the per-level tests when used as a
        smoke check.
        """
        consts = page.evaluate("({TC})")
        for mode in (10, "mx"):
            mode_arg = repr(mode)
            page.evaluate(f"setMode({mode_arg})")
            page.wait_for_timeout(100)
            ptypes = page.evaluate("[...problems].map(p => p.t)")
            count = sum(1 for t in ptypes if t == consts["TC"])
            assert count >= 1, \
                f"Mode {mode}: expected ≥1 coin problem in session, got {count}"

    def test_modemx_coin_problems_sum_up_to_50_and_max_7_coins(self, page):
        """
        Mode 'mx' coin problems must satisfy:
          - correct sum ≤ 50
          - total coin count ≤ 7 (8+ coins wrap to a second row on screen)
        Sample 30 problems via the coins exercise-type module (the generator
        lives in exercises/coins.ex.js and registers into EXERCISES.types).
        """
        for _ in range(30):
            p = page.evaluate("EXERCISES.types.coins.make('mx')[0]")
            coins = p["coins"]
            correct = p["correct"]
            assert correct <= 50, \
                f"mx coin sum must be ≤50, got {correct} from {coins}"
            assert len(coins) <= 7, \
                f"mx coin count must be ≤7, got {len(coins)} ({coins})"
            assert correct == sum(coins), \
                f"declared correct={correct} != sum({coins})={sum(coins)}"

    def test_coins_sorted_descending_in_tcCoins(self, page):
        """
        tcCoins must be sorted descending (largest first) so that in the
        coin row the largest coin appears visually on the LEFT.
        Sample several TC problems and verify ordering.
        """
        consts = page.evaluate("({TC})")
        TC = consts["TC"]
        checked = 0
        for _ in range(15):
            # Find a TC problem in the current session
            n_problems = page.evaluate("problems.length")
            for i in range(n_problems):
                ptype = page.evaluate(f"problems[{i}].t")
                if ptype != TC:
                    continue
                page.evaluate(f"idx = {i}; loadProblem()")
                page.wait_for_timeout(120)
                coins = page.evaluate("tcCoins")
                assert coins == sorted(coins, reverse=True), \
                    f"tcCoins must be sorted descending (largest first); got {coins}"
                checked += 1
                if checked >= 3:
                    return
            page.evaluate("restart()")
            page.wait_for_timeout(80)

        assert checked > 0, "Could not find any TC problem to test"

    def test_modemx_coin_problems_can_exceed_20(self, page):
        """
        Coin problems in Queen (mx) are explicitly allowed to exceed 20 —
        that is the purpose of these problems (sums up to 50). Verify that
        at least some sampled problems do have sums > 20.
        """
        sums = []
        for _ in range(30):
            for p in page.evaluate("EXERCISES.types.coins.make('mx')"):
                sums.append(p["correct"])
        above_20 = [s for s in sums if s > 20]
        assert len(above_20) > 0, \
            f"Expected some mx coin sums > 20 (target range 20-50), got max={max(sums)} from {sums}"

    def test_modemx_coin_problems_favor_10s_and_5s(self, page):
        """
        Distribution check: across many mx coin problems, the 10 and 5
        coin values together should make up the majority of coins drawn
        (since the weighted pool favors them).
        """
        all_coins = []
        for _ in range(20):
            for p in page.evaluate("EXERCISES.types.coins.make('mx')"):
                all_coins.extend(p["coins"])

        big_count = sum(1 for c in all_coins if c >= 5)        # 5s and 10s
        small_count = sum(1 for c in all_coins if c < 5)        # 1s and 2s

        assert big_count > small_count, \
            f"Expected 5s+10s to dominate; got {big_count} big vs {small_count} small (of {len(all_coins)} coins)"


# ─────────────────────────────────────────────────────────
# Chain mode & coin aid feature tests
# ─────────────────────────────────────────────────────────

class TestChainAndCoinAids:
    """
    Tests for two new behaviours (v5.37):

    1. TC (coin-counting) problems now show the number line (#chain-tools)
       starting at 0 so the child can count coin values step by step.

    2. makeMxPool() phase structure:
       - Phase 1 (problems 1-5): correct answer ≤ 10 (was ≤ 6).
       - Phase 3, last 4 (problems 12-15): first operand (a = num1) > 10.
    """

    # ── TC shows number line ──────────────────────────────

    def test_tc_problem_shows_number_line(self, page):
        """TC (coin): NL hidden while fresh; after the first wrong answer the
        kangaroo NL appears starting at 0."""
        consts  = page.evaluate("({TC})")
        ptypes  = page.evaluate("[...problems].map(p => p.t)")
        tc_idx  = next((i for i, t in enumerate(ptypes) if t == consts["TC"]), None)
        assert tc_idx is not None, "No TC problem found in session — regenerate"

        page.evaluate(f"idx = {tc_idx}; loadProblem()")
        page.wait_for_timeout(200)
        assert not page.locator("#nl-panel").is_visible(), \
            "#nl-panel must be hidden before the first mistake (TC)"
        reveal_aids(page)
        assert page.locator("#nl-panel").is_visible(), \
            "#nl-panel must appear after the first mistake (TC)"
        dot_left = page.evaluate("document.getElementById('nl-dot').style.left")
        assert dot_left == "0%", \
            f"Kangaroo must start at 0 for TC problem, got {dot_left}"

    # ── Chain phase 1 answers ≤ 10 ────────────────────────

    def test_chain_first_4_answers_at_most_10(self, page):
        """Phase structure removed — makeMxPool now shuffles all 15 problems
        randomly without ordered phases."""
        pytest.skip("makeMxPool phase structure removed in mx mode redesign")

    def test_chain_problem_5_answer_at_most_20(self, page):
        """Phase structure removed — makeMxPool now shuffles all 15 problems
        randomly without ordered phases."""
        pytest.skip("makeMxPool phase structure removed in mx mode redesign")

    # ── Chain last 4 have first operand > 10 ─────────────

    def test_chain_last_4_first_number_above_10(self, page):
        """Phase structure removed — makeMxPool now shuffles all 15 problems
        randomly without ordered phases or position-based constraints."""
        pytest.skip("makeMxPool phase structure removed in mx mode redesign")


# ─────────────────────────────────────────────────────────
# Number line (#nl-panel) visibility tests
# ─────────────────────────────────────────────────────────

class TestNumberLineVisibility:
    """
    The aids are FULLY HIDDEN while a problem is fresh (try-first gate).
    After the first wrong answer, #nl-panel appears (kangaroo at the right
    starting position) for TA/TS/TC/TDA/TDS and for chain problems.
    """

    def _nl_visible(self, page) -> bool:
        return page.evaluate(
            "document.getElementById('nl-panel').style.display !== 'none'"
        )

    def _assert_hidden_then_revealed(self, page, label, expect_dot="0%"):
        assert not self._nl_visible(page), \
            f"#nl-panel must be HIDDEN before the first mistake ({label})"
        reveal_aids(page)
        assert self._nl_visible(page), \
            f"#nl-panel must appear after the first mistake ({label})"
        dot_left = page.evaluate("document.getElementById('nl-dot').style.left")
        assert dot_left == expect_dot, \
            f"Kangaroo should start at {expect_dot} for {label}, got {dot_left}"

    def test_nl_hidden_then_revealed_for_ta(self, page):
        page.evaluate("problems[0] = {t: TA, a: 3, b: 4}; idx = 0; loadProblem()")
        page.wait_for_timeout(150)
        self._assert_hidden_then_revealed(page, "TA")

    def test_nl_hidden_then_revealed_for_ts(self, page):
        page.evaluate("problems[0] = {t: TS, a: 7, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(150)
        self._assert_hidden_then_revealed(page, "TS")

    def test_nl_hidden_then_revealed_for_tc(self, page):
        consts = page.evaluate("({TC})")
        ptypes = page.evaluate("[...problems].map(p => p.t)")
        tc_idx = next((i for i, t in enumerate(ptypes) if t == consts["TC"]), None)
        assert tc_idx is not None, "No TC problem in session"
        page.evaluate(f"idx = {tc_idx}; loadProblem()")
        page.wait_for_timeout(200)
        self._assert_hidden_then_revealed(page, "TC")

    def test_nl_hidden_then_revealed_for_tda(self, page):
        page.evaluate("problems[0] = {t: TDA, r: 10}; idx = 0; loadProblem()")
        page.wait_for_timeout(150)
        self._assert_hidden_then_revealed(page, "TDA")

    def test_nl_hidden_then_revealed_for_tds(self, page):
        page.evaluate("problems[0] = {t: TDS, r: 5}; idx = 0; loadProblem()")
        page.wait_for_timeout(150)
        self._assert_hidden_then_revealed(page, "TDS")

    def test_nl_hidden_then_revealed_for_chain(self, page):
        """Chain problems: everything hidden while fresh; after the first
        mistake the kangaroo NL appears (default aid) and the jar stays hidden."""
        page.evaluate("setMode('mx')")
        page.wait_for_timeout(200)
        consts = page.evaluate("({TX, TZ, TW})")
        chain_types = {consts["TX"], consts["TZ"], consts["TW"]}
        ptypes = page.evaluate("[...problems].map(p => p.t)")
        chain_idx = next((i for i, t in enumerate(ptypes) if t in chain_types), None)
        assert chain_idx is not None, "No chain (TX/TZ/TW) problem found in mx session"
        page.evaluate(f"idx = {chain_idx}; loadProblem()")
        page.wait_for_timeout(200)
        assert not self._nl_visible(page), \
            "#nl-panel must be hidden before the first mistake (chain)"
        # chain problems answer in #ans — a wrong final answer reveals the aids
        page.fill("#ans", "99")
        page.click("#chk-btn")
        page.wait_for_function("tryFirst > 0", timeout=TIMEOUT)
        page.wait_for_timeout(100)
        assert self._nl_visible(page), \
            "#nl-panel must appear after the first mistake (chain, kangaroo default)"
        ct_visible = page.evaluate(
            "document.getElementById('chain-tools')?.style.display !== 'none'"
        )
        assert not ct_visible, \
            "#chain-tools must stay hidden for chain problems in kang mode"

    def test_tm_number_line_spans_up_to_20(self, page):
        """Missing-subtrahend (e.g. 18 − x = 11): the kangaroo number line
        must span the full 0..20 (the minuend, 18, has to be on the line)."""
        page.evaluate("aidMode='kang'; problems[0]={t:TM, a:18, b:11}; idx=0; loadProblem()")
        page.wait_for_timeout(150)
        reveal_aids(page)
        nums = page.evaluate(
            "[...document.querySelectorAll('#nl-bar .nl-num')].map(e=>+e.textContent)"
        )
        assert nums, "Number line must render ticks once revealed"
        assert nums[0] == 0 and nums[-1] == 20, \
            f"18−x=11 number line must run 0..20, got {nums[0]}..{nums[-1]}"
        assert 18 in nums, "The minuend (18) must be a labelled tick on the line"

    def test_cookie_jar_shows_only_the_box_no_number_line(self, page):
        """The cookie-jar aid must show ONLY the box — the old number line
        above it (.pgm-nl) is hidden on every background/skin."""
        page.evaluate("setMode(20)")
        page.wait_for_timeout(150)
        page.evaluate("problems[0]={t:TS, a:7, b:3}; idx=0; loadProblem()")
        page.wait_for_timeout(150)
        page.evaluate("toggleAidMode('nl')")
        page.wait_for_selector("#pgm-ck-jar", state="attached", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        # chain-tools (the jar host) is shown for the cookie-jar aid
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chain-tools')).display") != "none", \
            "cookie-jar host (#chain-tools) must be visible in nl aid mode"
        # but the old number line inside it is hidden
        assert page.evaluate(
            "getComputedStyle(document.querySelector('.pgm-nl')).display") == "none", \
            "the old number line (.pgm-nl) above the box must be hidden"
        # the box itself (the jar scene) is still shown
        assert page.evaluate(
            "getComputedStyle(document.querySelector('.pgm-scene')).display") != "none", \
            "the counting box (.pgm-scene) must remain visible"


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
        """Mode 20 (מלך) was merged into 'mx' (מלכה) and removed."""
        pytest.skip("Mode 20 (מלך) removed — merged into 'mx' (מלכה)")

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
        tt_idx = self._find_tt(page)
        if tt_idx is None:
            pytest.skip("No TT problem in current session")

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
        tt_idx = self._find_tt(page)
        if tt_idx is None:
            pytest.skip("No TT problem in current session")

        page.evaluate(f"idx = {tt_idx}; loadProblem()")
        page.wait_for_timeout(200)

        state = get_state(page)
        ans = correct_answer(state)
        submit_answer(page, ans)
        page.wait_for_timeout(300)

        new_state = get_state(page)
        assert new_state["done"], \
            f"TT problem should be done after correct answer {ans[1]}"


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
        assert page.evaluate("score") == before + 20, \
            "Mode-20 first-try correct must add 20 points"

    def test_first_wrong_then_correct_awards_67_percent(self, page):
        """One wrong → tryFirst=1 → correct awards round(20 * 0.67) = 13 pts (33% penalty)."""
        state = get_state(page)
        ans = correct_answer(state)
        # Only the single-answer flow has a clean "wrong = correct+1" path
        if ans[0] != "single":
            page.evaluate("idx = 0; loadProblem()")
            page.wait_for_timeout(150)
            state = get_state(page)
            ans = correct_answer(state)
            if ans[0] != "single":
                pytest.skip("Test requires a single-answer problem at idx 0")

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
        state = get_state(page)
        ans = correct_answer(state)
        if ans[0] != "single":
            page.evaluate("idx = 0; loadProblem()")
            page.wait_for_timeout(150)
            state = get_state(page)
            ans = correct_answer(state)
            if ans[0] != "single":
                pytest.skip("Test requires a single-answer problem at idx 0")

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
        # Make tryFirst non-zero on current problem
        state = get_state(page)
        ans = correct_answer(state)
        if ans[0] != "single":
            pytest.skip("Test requires a single-answer problem at idx 0")
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
        consts = page.evaluate("({TM, TS, TA, TX, TZ, TW, TDA, TDS, TC, TT, TBG})")
        TT = consts["TT"]
        TC = consts["TC"]
        TDA = consts["TDA"]
        TDS = consts["TDS"]
        TBG = consts["TBG"]

        for _ in range(10):                # 10 fresh Queen sessions
            page.evaluate("setMode('mx'); restart()")
            page.wait_for_function("problems.length === 17", timeout=TIMEOUT)
            problems = page.evaluate("problems")
            for i, p in enumerate(problems):
                t = p["t"]
                if t == TT:
                    # Round-tens: a and b must both be multiples of 10
                    assert p["a"] % 10 == 0 and p["b"] % 10 == 0, \
                        f"TT problem at idx {i} not in round tens: {p}"
                    continue
                if t == TBG:
                    # Big ±1/2: a is a big two-digit number, b is the small step
                    assert p["b"] in (1, 2), f"TBG step must be 1/2 at idx {i}: {p}"
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
        state = get_state(page)
        ans = correct_answer(state)
        if ans[0] != "single":
            pytest.skip("Test requires a single-answer problem at idx 0")
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


# ─────────────────────────────────────────────────────────
# Number-hover tooltip (data-num + #num-tt)
# ─────────────────────────────────────────────────────────
class TestNumberHoverTooltip:
    """The hover tooltip shows the number as that many emojis, ≤10 per row,
    with an extra gap after every 5th emoji within each row of 10."""

    def test_eq_numbers_have_data_num_attribute(self, page):
        """Every visible number in the equation row carries data-num."""
        # mode 10 ensures predictable TM/TS/TA at slot 0
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        nums = page.evaluate(
            "document.querySelectorAll('#eq .eq-n[data-num], #eq .eq-res[data-num]').length"
        )
        assert nums >= 1, \
            f"Expected at least 1 .eq-n / .eq-res element with data-num, got {nums}"

    def test_hover_shows_tooltip_with_correct_emoji_count(self, page):
        """Hovering a .eq-n shows #num-tt with EXACTLY that many emoji spans
        across all groups."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        el = page.locator("#eq .eq-n[data-num]").first
        num = int(el.get_attribute("data-num"))

        el.hover()
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        emoji_count = page.evaluate(
            "document.querySelectorAll('#num-tt .ntt-group span').length"
        )
        assert emoji_count == num, \
            f"Expected {num} emojis in tooltip for number {num}, got {emoji_count}"

    def test_tooltip_label_shows_the_number(self, page):
        """The .ntt-lbl text content equals the hovered number."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        el = page.locator("#eq .eq-n[data-num]").first
        num = int(el.get_attribute("data-num"))

        el.hover()
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        lbl = page.evaluate("document.querySelector('#num-tt .ntt-lbl').textContent")
        assert lbl.strip() == str(num), \
            f"Tooltip label should be '{num}', got '{lbl}'"

    def test_tooltip_hides_on_mouseout(self, page):
        """Moving the mouse away hides the tooltip."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        el = page.locator("#eq .eq-n[data-num]").first
        el.hover()
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        # Move away to a corner
        page.mouse.move(5, 5)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display !== 'block'",
            timeout=TIMEOUT,
        )

    def test_tooltip_grouped_in_fives(self, page):
        """Emojis are organized in groups of 5 (last group may have fewer)."""
        # Force a known number — 18 → 4 groups: [5, 5, 5, 3]
        page.evaluate(
            "problems[0] = {t: TA, a: 9, b: 9}; idx = 0; loadProblem();"
        )
        page.wait_for_timeout(150)
        page.evaluate("""
            const el = document.querySelector('#eq .eq-n[data-num="9"]');
            el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
        """)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        # Number 9 → 2 groups: [5, 4]
        groups = page.evaluate(
            "[...document.querySelectorAll('#num-tt .ntt-group')]"
            ".map(g => g.querySelectorAll('span').length)"
        )
        assert groups == [5, 4], \
            f"Expected groups [5, 4] for num=9, got {groups}"

    def test_tooltip_group_alignment_for_18(self, page):
        """For num=18 with 4 groups [5,5,5,3], columns align vertically:
        item 11 (row 2 group 1, col 1) aligns horizontally with item 1 (row 1 group 1, col 1)."""
        page.evaluate(
            "problems[0] = {t: TS, a: 19, b: 1}; idx = 0; loadProblem();"
        )
        page.wait_for_timeout(150)
        page.evaluate("""
            const el = document.querySelector('#eq .eq-n[data-num="19"]');
            el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
        """)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        # 19 → groups [5, 5, 5, 4]
        groups = page.evaluate(
            "[...document.querySelectorAll('#num-tt .ntt-group')]"
            ".map(g => g.querySelectorAll('span').length)"
        )
        assert groups == [5, 5, 5, 4], \
            f"Expected groups [5,5,5,4] for num=19, got {groups}"
        # Column alignment check: 1st emoji of group 1 (row 1) and 1st of group 3 (row 2) share X
        x1 = page.evaluate("""
            document.querySelectorAll('#num-tt .ntt-group')[0]
              .querySelectorAll('span')[0].getBoundingClientRect().left
        """)
        x3 = page.evaluate("""
            document.querySelectorAll('#num-tt .ntt-group')[2]
              .querySelectorAll('span')[0].getBoundingClientRect().left
        """)
        assert abs(x1 - x3) < 1.5, \
            f"Row-1 col-1 (x={x1}) and row-2 col-1 (x={x3}) must align vertically"

    def test_tooltip_partial_group_takes_only_needed_width(self, page):
        """A group with 3 emojis should be ~3 columns wide, not 5.
        Tooltip width must scale to actual content, not assume max group size."""
        # Force a TS(13,10) problem → num1=13 → 13 emojis = groups [5, 5, 3]
        page.evaluate(
            "problems[0] = {t: TS, a: 13, b: 10}; idx = 0; loadProblem();"
        )
        page.wait_for_timeout(150)
        page.evaluate("""
            const el = document.querySelector('#eq .eq-n[data-num="13"]');
            el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
        """)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        # Widths of the three groups
        widths = page.evaluate(
            "[...document.querySelectorAll('#num-tt .ntt-group')]"
            ".map(g => Math.round(g.getBoundingClientRect().width))"
        )
        # Each group's expected width: count*26 + (count-1)*3
        # (26px columns hold the aid-variant's SVG objects)
        # 5 items = 5*26 + 4*3 = 142
        # 3 items = 3*26 + 2*3 = 84
        assert widths[0] == 142, f"group 1 (5 items) should be 142px, got {widths[0]}"
        assert widths[1] == 142, f"group 2 (5 items) should be 142px, got {widths[1]}"
        assert widths[2] == 84,  f"group 3 (3 items) should be 84px (not 142), got {widths[2]}"

    def test_tooltip_small_number_compact_modal(self, page):
        """For num=3 (a single small group), tooltip width is compact (≤120px)."""
        # Create a problem with num1=3 directly
        page.evaluate(
            "problems[0] = {t: TS, a: 3, b: 1}; idx = 0; loadProblem();"
        )
        page.wait_for_timeout(150)
        page.evaluate("""
            const el = document.querySelector('#eq .eq-n[data-num="3"]');
            el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
        """)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        tt_width = page.evaluate(
            "Math.round(document.getElementById('num-tt').getBoundingClientRect().width)"
        )
        # Group is 72px, tooltip has ~20px padding+border ≈ 92-100px total
        # Must be much smaller than the 2-full-groups width (~280px)
        assert tt_width < 130, \
            f"For num=3, tooltip should be compact (<130px), got {tt_width}px"

    def test_tooltip_visible_gap_between_groups(self, page):
        """Visible horizontal gap between group 1 and group 2 in the same row."""
        page.evaluate(
            "problems[0] = {t: TS, a: 15, b: 7}; idx = 0; loadProblem();"
        )
        page.wait_for_timeout(150)
        page.evaluate("""
            const el = document.querySelector('#eq .eq-n[data-num="15"]');
            el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
        """)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        # Distance between adjacent groups should be ≥ 10px (works in LTR or RTL)
        gap = page.evaluate("""
            (() => {
              const groups = document.querySelectorAll('#num-tt .ntt-group');
              const g1 = groups[0].getBoundingClientRect();
              const g2 = groups[1].getBoundingClientRect();
              return Math.max(g2.left - g1.right, g1.left - g2.right);
            })()
        """)
        assert gap >= 10, \
            f"Expected ≥10px gap between groups of 5, got {gap}px"

    def test_tooltip_closes_when_success_screen_shows(self, page):
        """A lingering objects tooltip must CLOSE when the celebration / prize
        screen opens (otherwise it floats over the success screen)."""
        page.evaluate("setMode(10)")
        page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        page.evaluate("problems[0]={t:TS,a:18,b:11}; idx=0; loadProblem()")
        page.wait_for_timeout(120)
        page.evaluate(
            "[...document.querySelectorAll('#eq .eq-n')]"
            ".find(e=>e.getAttribute('data-num')==='18')"
            ".dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))")
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'", timeout=TIMEOUT)
        page.evaluate("showFw()")
        assert page.evaluate("document.getElementById('num-tt').style.display") == "none", \
            "tooltip must be hidden once the celebration/prize screen shows"


# ─────────────────────────────────────────────────────────
# Crossing-ten number-bond split in the hover tooltip
# ─────────────────────────────────────────────────────────
class TestBridgeSplitTooltip:
    """When a step crosses ten, the hover tooltip becomes a number bond: the
    whole number branches into two parts, and each PART number sits directly
    above its own cluster of objects (complete-to-ten LEFT | remainder RIGHT)."""

    def _hover(self, page, problem, data_num, cls="eq-n"):
        page.evaluate(f"problems[0] = {problem}; idx = 0; loadProblem();")
        page.wait_for_timeout(120)
        page.evaluate(
            f"document.querySelector('#eq .{cls}[data-num=\"{data_num}\"]')"
            ".dispatchEvent(new MouseEvent('mouseover', {bubbles: true}))"
        )
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'", timeout=TIMEOUT)

    def _split_attr(self, page, data_num, cls="eq-n"):
        return page.evaluate(
            f"document.querySelector('#eq .{cls}[data-num=\"{data_num}\"]')"
            ".getAttribute('data-split')")

    def test_subtraction_second_operand_splits(self, page):
        """18 − 11: hovering 11 → 8 (down-to-ten) | 3 (remainder)."""
        self._hover(page, "{t: TS, a: 18, b: 11}", 11)
        assert self._split_attr(page, 11) == "8,3"
        parts = page.evaluate(
            "[...document.querySelectorAll('#num-tt .ntt-part')].map(p => p.textContent)")
        assert parts == ["8", "3"], f"expected part labels ['8','3'], got {parts}"
        # each part sits above its OWN cluster of that many objects
        counts = page.evaluate(
            "[...document.querySelectorAll('#num-tt .ntt-side')]"
            ".map(s => s.querySelectorAll('.ntt-objs span').length)")
        assert counts == [8, 3], f"expected clusters [8,3], got {counts}"

    def test_addition_second_operand_splits(self, page):
        """8 + 7: hovering 7 → 2 (complete to ten) | 5."""
        self._hover(page, "{t: TA, a: 8, b: 7}", 7)
        assert self._split_attr(page, 7) == "2,5"

    def test_first_operand_never_splits(self, page):
        """Hovering the FIRST number (18 in 18−11) stays a plain tooltip."""
        self._hover(page, "{t: TS, a: 18, b: 11}", 18)
        is_split = page.evaluate(
            "document.querySelector('#num-tt .ntt-grid').classList.contains('ntt-split')")
        assert is_split is False, "first operand must render a plain (non-split) tooltip"

    def test_non_crossing_does_not_split(self, page):
        """18 − 3 does not cross ten → the 3 carries no split."""
        self._hover(page, "{t: TS, a: 18, b: 3}", 3)
        assert self._split_attr(page, 3) is None

    def test_chain_third_term_splits_on_running_result(self, page):
        """Chain 18 − 10 + 5: the +5 splits on the running result 8 → 2 | 3."""
        self._hover(page, "{t: TX, a: 18, b: 10, c: 5}", 5)
        assert self._split_attr(page, 5) == "2,3"

    def test_missing_result_splits_ten_and_ones(self, page):
        """Missing subtrahend 15 − ? = 13: the shown result 13 → 10 | 3."""
        self._hover(page, "{t: TM, a: 15, b: 13}", 13, cls="eq-res")
        assert self._split_attr(page, 13, cls="eq-res") == "10,3"
        parts = page.evaluate(
            "[...document.querySelectorAll('#num-tt .ntt-part')].map(p => p.textContent)")
        assert parts == ["10", "3"], f"expected ['10','3'], got {parts}"

    def test_bond_shows_whole_number_and_two_branches(self, page):
        """The split tooltip shows the whole number on top + two branch lines."""
        self._hover(page, "{t: TS, a: 18, b: 11}", 11)
        whole = page.evaluate("document.querySelector('#num-tt .ntt-whole')?.textContent")
        assert whole == "11", f"whole number should be 11, got {whole}"
        lines = page.evaluate(
            "document.querySelectorAll('#num-tt .ntt-bond-ov line').length")
        assert lines == 2, f"expected 2 branch lines, got {lines}"

    def test_split_parts_are_positive_and_sum_to_whole(self, page):
        """14 − 7: the split parts are positive and add up to 7."""
        self._hover(page, "{t: TS, a: 14, b: 7}", 7)
        ok = page.evaluate(
            "(() => { const [l,r] = document.querySelector('#eq .eq-n[data-num=\"7\"]')"
            ".getAttribute('data-split').split(',').map(Number);"
            "return l > 0 && r > 0 && l + r === 7; })()")
        assert ok, "14−7 split parts must be positive and sum to 7"

    def test_two_addends_first_input_previews_objects_no_split(self, page):
        """? + ? = 15: typing in the FIRST box shows a plain (non-split) emoji
        tooltip for that value."""
        page.evaluate("problems[0] = {t: TDA, r: 15}; idx = 0; loadProblem();")
        page.wait_for_timeout(120)
        page.evaluate(
            "const i = document.getElementById('ans1'); i.value = '6';"
            "i.dispatchEvent(new Event('input', {bubbles: true}))")
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'", timeout=TIMEOUT)
        info = page.evaluate("({"
            "lbl: document.querySelector('#num-tt .ntt-lbl').textContent.trim(),"
            "split: document.querySelector('#num-tt .ntt-grid').classList.contains('ntt-split'),"
            "count: document.querySelectorAll('#num-tt .ntt-group span').length})")
        assert info["lbl"] == "6", f"label should be 6, got {info['lbl']}"
        assert info["split"] is False, "first-addend preview must NOT split"
        assert info["count"] == 6, f"expected 6 objects, got {info['count']}"


# ─────────────────────────────────────────────────────────
# Bridging-10 mode (br): focused practice on crossing 10
# ─────────────────────────────────────────────────────────
class TestBridgingMode:
    """The 'br' mode (גָּשֵׁר 10) serves TWO fixed pedagogical sets in a prescribed
       order — no random generation, no shuffle. The sets ALTERNATE on EVERY
       rebuild — choosing the game, re-clicking it, "play again" (restart) or a
       reload (set 1, then set 2, then 1 …); a fresh start serves set 1. The
       order INSIDE each set is the curriculum and must never change."""

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
        """The br session equals the prescribed 25-problem list, in order."""
        consts = page.evaluate("({TA, TS})")
        self._switch_br(page)
        probs = page.evaluate("[...problems].map(p => [p.t, p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ]
        assert probs == expected, (
            f"br problems deviate from the prescribed order.\n"
            f"expected={expected}\ngot={probs}"
        )

    def test_br_restart_alternates_sets(self, page):
        """Every rebuild advances the set, so restart() serves the OTHER set:
        set 1 → set 2 → set 1 (deterministic, no shuffle)."""
        consts = page.evaluate("({TA, TS})")
        exp1 = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ]
        exp2 = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ_2]
        self._switch_br(page)
        s1 = page.evaluate("[...problems].map(p => [p.t, p.a, p.b])")
        page.evaluate("restart()"); page.wait_for_timeout(120)
        s2 = page.evaluate("[...problems].map(p => [p.t, p.a, p.b])")
        page.evaluate("restart()"); page.wait_for_timeout(120)
        s3 = page.evaluate("[...problems].map(p => [p.t, p.a, p.b])")
        assert s1 == exp1, "first build serves set 1"
        assert s2 == exp2, "restart advances to set 2"
        assert s3 == exp1, "next restart returns to set 1"

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
        # Find a single-answer problem to test
        state = get_state(page)
        ans = correct_answer(state)
        if ans[0] != "single":
            page.evaluate("idx = 0; loadProblem()")
            page.wait_for_timeout(120)
            state = get_state(page)
            ans = correct_answer(state)
            if ans[0] != "single":
                pytest.skip("Test requires single-answer problem at idx 0")

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
        consts = page.evaluate("({TA, TS})")
        self._switch_br(page)            # set 1
        self._reenter_br(page)           # set 2
        probs = page.evaluate("[...problems].map(p => [p.t, p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ_2]
        assert probs == expected, (
            f"br set 2 deviates from the prescribed order.\n"
            f"expected={expected}\ngot={probs}"
        )

    def test_br_alternates_sets_in_turns(self, page):
        """Each menu selection alternates: set1 → set2 → set1, order preserved."""
        consts = page.evaluate("({TA, TS})")
        exp1 = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ]
        exp2 = [[consts[t], a, b] for t, a, b in self.EXPECTED_SEQ_2]
        self._switch_br(page)
        seq1 = page.evaluate("[...problems].map(p => [p.t, p.a, p.b])")
        self._reenter_br(page)
        seq2 = page.evaluate("[...problems].map(p => [p.t, p.a, p.b])")
        self._reenter_br(page)
        seq3 = page.evaluate("[...problems].map(p => [p.t, p.a, p.b])")
        assert seq1 == exp1, "first selection must serve set 1"
        assert seq2 == exp2, "second selection must serve set 2"
        assert seq3 == exp1, "third selection must return to set 1"

    def test_br_restart_size_alternates(self, page):
        """The two sets differ in length (25 vs 18); restarts alternate between
        them (25 → 18 → 25 → 18)."""
        self._switch_br(page)
        lens = [page.evaluate("problems.length")]
        for _ in range(3):
            page.evaluate("restart()"); page.wait_for_timeout(120)
            lens.append(page.evaluate("problems.length"))
        assert lens == [25, 18, 25, 18], f"sizes must alternate on restart, got {lens}"

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
        """Booting straight into br (the persisted mode) rotates the set, so
        reloads alternate set1↔set2 instead of always replaying set 1."""
        sets = []
        for _ in range(4):
            page.evaluate("localStorage.setItem('gameMode','br')")
            page.reload()
            page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
            page.wait_for_function("mode==='br' && problems.length>0", timeout=TIMEOUT)
            sets.append(page.evaluate("problems.length"))
        assert 25 in sets and 18 in sets, \
            f"both bridge sets must appear across reloads, got {sets}"
        assert all(sets[i] != sets[i + 1] for i in range(len(sets) - 1)), \
            f"reloads must alternate sets, got {sets}"


# ─────────────────────────────────────────────────────────
# Dynamic exercise-type loading (one file per type)
# ─────────────────────────────────────────────────────────

class TestDynamicExercises:
    def test_boot_loads_only_default_mode_types(self, page):
        """Boot (mx) loads the 8 mx types (big_step is mixed into Queen now);
        the Superman-only column_add file stays unloaded."""
        page.wait_for_timeout(400)
        loaded = page.evaluate("Object.keys(EXERCISES.types)")
        for t in ["add", "sub", "missing", "double", "chain", "tens", "coins",
                  "big_step"]:
            assert t in loaded, f"boot must load mx type '{t}', got {loaded}"
        assert "column_add" not in loaded, "column_add (sup-only) must NOT load at boot"

    def test_big_game_uses_big_step(self, page):
        """The dedicated 'big' game builds a 12-problem all-TBG session."""
        page.evaluate("setMode('big')")
        page.wait_for_function(
            "typeof EXERCISES.types.big_step === 'object'", timeout=TIMEOUT)
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        assert page.evaluate("[...problems].every(p => p.t === TBG)")

    def test_column_add_loads_on_demand(self, page):
        """Entering Superman injects exercises/column_add.ex.js and mounts it.
        (The pool also mixes in a couple of big ±1/2 problems, so force a TCA
        problem to guarantee the column UI mounts.)"""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.column_add === 'object'", timeout=TIMEOUT)
        page.wait_for_function("problems.length === 14", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCA, a: 17, b: 15}; idx = 0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)

    def test_every_mode_builds_correct_pool_size(self, page):
        """Each mode's recipe produces its expected session length."""
        expected = {"5": 12, "10": 12, "20": 12, "'br'": 25,
                    "'mx'": 17, "'sup'": 14, "'big'": 12}
        for arg, size in expected.items():
            page.evaluate(f"setMode({arg})")
            page.wait_for_function(f"problems.length === {size}", timeout=TIMEOUT)

    def test_big_step_mixed_into_mx_and_sup(self, page):
        """The big ±1/2 type (TBG) is woven into both Queen and Superman pools."""
        for arg in ["'mx'", "'sup'"]:
            page.evaluate(f"setMode({arg})")
            page.wait_for_function(
                "typeof EXERCISES.types.big_step === 'object'", timeout=TIMEOUT)
            page.wait_for_function(
                "[...problems].some(p => p.t === TBG)", timeout=TIMEOUT)
            n = page.evaluate("[...problems].filter(p => p.t === TBG).length")
            assert n >= 1, f"mode {arg}: expected ≥1 big-step problem, got {n}"


# ─────────────────────────────────────────────────────────
# Big number ± 1/2 (עד 100)
# ─────────────────────────────────────────────────────────

class TestBigStepMode:
    def _enter_big(self, page):
        page.evaluate("setMode('big')")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def test_big_pool_is_valid_and_mixed(self, page):
        """12 problems, b∈{1,2}, no carry/borrow, all four op/b combos present."""
        self._enter_big(page)
        probs = page.evaluate("problems")
        combos = set()
        for p in probs:
            assert p["t"] == "big_step"
            assert p["b"] in (1, 2), f"b must be 1/2, got {p}"
            assert 21 <= p["a"] <= 98, f"a out of range: {p}"
            if p["op"] == "sub":
                assert p["a"] % 10 >= p["b"], f"borrow not allowed: {p}"
            else:
                assert p["a"] % 10 + p["b"] <= 9, f"carry not allowed: {p}"
            combos.add((p["op"], p["b"]))
        assert len(combos) == 4, f"expected -1/-2/+1/+2 mix, got {combos}"

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


# ─────────────────────────────────────────────────────────
# Superman — the column-addition exercise module
# ─────────────────────────────────────────────────────────

class TestSupermanColumnAdd:
    def _enter_sup(self, page, a=17, b=15):
        # the sup pool mixes column-add with a couple of big ±1/2 problems, so
        # wait for the pool to build, then force a TCA problem to mount the UI
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 14", timeout=TIMEOUT)
        page.evaluate(
            f"problems[0] = {{t: TCA, a: {a}, b: {b}}}; idx = 0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        page.wait_for_timeout(250)

    def test_sup_nl_visible_from_start(self, page):
        """aidsReveal:'always' — the skinned NL shows before any mistake,
        with its numbers already rendered (not blank until a mistake)."""
        self._enter_sup(page)
        assert page.evaluate(
            "document.getElementById('nl-panel').style.display") != "none"
        assert page.evaluate("!document.getElementById('nl-btn-plus').disabled")
        assert page.evaluate("!document.getElementById('tf-msg')"), \
            "no try-first lock message for an aidsReveal:'always' type"
        assert page.evaluate("tryFirst") == 0, "shown WITHOUT any mistake"
        nums = page.evaluate(
            "[...document.querySelectorAll('#nl-panel .nl-num')].map(n=>+n.textContent)")
        assert len(nums) >= 1, "the number line must render its numbers from the start"

    def test_sup_nl_numbers_visible_after_switch_from_locked_mode(self, page):
        """Regression: entering Superman from a normal mode (whose fresh problem
        left `tf-locked-nl` on <body>) used to leave that lock sticky, so the
        number-line NUMBERS were CSS-hidden until a page refresh. The always-on
        reveal must actively clear the stale lock — numbers visible, no refresh."""
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(120)
        assert page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
            "precondition: normal mode locks the aids on a fresh problem"
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 14", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCA, a: 13, b: 18}; idx = 0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        page.wait_for_timeout(250)
        assert not page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
            "the stale try-first lock must be cleared for an always-on type"
        visible = page.evaluate("""
            [...document.querySelectorAll('#nl-panel .nl-num')]
              .filter(n => getComputedStyle(n).visibility !== 'hidden').length
        """)
        assert visible >= 1, \
            "number-line numbers must be VISIBLE without a refresh (not CSS-hidden)"
        assert page.evaluate("!document.getElementById('nl-btn-plus').disabled"), \
            "± buttons must be enabled (not left tf-locked)"

    def test_sup_nl_anchored_to_top_units_digit(self, page):
        """The rider parks on the TOP number's units digit from the start —
        13+18 → rider at 3 (top units), NOT 8 (the larger of the two units)."""
        self._enter_sup(page, 13, 18)
        assert page.evaluate("tryFirst") == 0, "anchored before any mistake"
        # 0..20 line → value 3 sits at 15%
        left = page.evaluate(
            "parseFloat(document.getElementById('nl-dot').style.left)")
        assert abs(left - 15) < 0.5, \
            f"rider must sit on top units digit 3 (15%), got {left}%"

    def test_sup_arrow_keys_move_rider_from_start(self, page):
        """Regression: in the column exercise the left/right arrows must move
        the rider FROM THE START (always-on line, tryFirst 0) — even while a
        column digit box (type='text') holds focus. They used to be inert
        because the handler was gated on tryFirst>0 AND ignored non-number
        inputs."""
        self._enter_sup(page, 13, 18)
        assert page.evaluate("tryFirst") == 0
        page.focus("#colx-iU")
        before = page.evaluate("parseFloat(document.getElementById('nl-dot').style.left)")
        page.keyboard.press("ArrowRight")
        page.wait_for_function(
            f"parseFloat(document.getElementById('nl-dot').style.left) > {before}",
            timeout=TIMEOUT)
        mid = page.evaluate("parseFloat(document.getElementById('nl-dot').style.left)")
        page.keyboard.press("ArrowLeft")
        page.wait_for_function(
            f"parseFloat(document.getElementById('nl-dot').style.left) < {mid}",
            timeout=TIMEOUT)

    def test_sup_space_advances_number_line_in_add_direction(self, page):
        """In column addition, pressing SPACE hops the kangaroo forward (add
        direction) — even while a digit box is focused — and is NOT typed in."""
        self._enter_sup(page, 17, 15)
        page.evaluate("NL.init(0)")          # known baseline at 0%
        page.wait_for_timeout(350)
        page.click("#colx-iU")               # focus the units digit box
        page.wait_for_timeout(100)
        before = page.evaluate("parseFloat(document.getElementById('nl-dot').style.left)||0")
        page.keyboard.press(" ")
        # poll until the rider has advanced — robust to a slow CSS transition under
        # full-suite load (a fixed wait here was flaky). one forward step == +5%.
        page.wait_for_function(
            f"((parseFloat(document.getElementById('nl-dot').style.left)||0) - ({before})) > 3",
            timeout=TIMEOUT)
        after = page.evaluate("parseFloat(document.getElementById('nl-dot').style.left)||0")
        assert after - before > 3, \
            f"space must move the rider forward (add), got {before}% → {after}%"
        assert page.evaluate("document.getElementById('colx-iU').value") == "", \
            "space must NOT be typed into the digit box"

    def test_sup_carry_flow_solves_and_scores(self, page):
        """17+15: units 12 → carry flies → tens 3 → solved, full 15 points."""
        self._enter_sup(page, 17, 15)
        page.fill("#colx-iU", "12")
        page.keyboard.press("Enter")
        page.wait_for_function(
            "document.getElementById('colx-carry').textContent === '1'",
            timeout=TIMEOUT)
        page.wait_for_function(
            "!document.getElementById('colx-iT').disabled", timeout=TIMEOUT)
        page.fill("#colx-iT", "3")
        page.keyboard.press("Enter")
        page.wait_for_function("score === 15", timeout=TIMEOUT)
        assert page.evaluate("report[0].gotCorrect") is True

    def test_sup_wrong_units_penalized(self, page):
        """A committed wrong units answer is a real mistake (penalty+report)."""
        self._enter_sup(page, 17, 15)
        page.fill("#colx-iU", "13")
        page.keyboard.press("Enter")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("report[0].wrongs.length") == 1
        assert page.evaluate(
            "document.getElementById('colx-iU').classList.contains('ans-err')")

    def test_sup_units_mistake_reduces_final_score(self, page):
        """END-TO-END: a wrong digit in the column units box penalises the
        exercise even when the columns are ultimately completed correctly —
        the solved exercise then awards only 67% (round(15*.67)=10), not 15."""
        self._enter_sup(page, 17, 15)        # modePts()=15 → 67% == 10
        assert page.evaluate("score") == 0 and page.evaluate("tryFirst") == 0
        # wrong units first (7+5=12, so 13 is wrong)
        page.fill("#colx-iU", "13")
        page.keyboard.press("Enter")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        # now finish the columns CORRECTLY: units 12 (carry), tens 3
        page.fill("#colx-iU", "12")
        page.keyboard.press("Enter")
        page.wait_for_function(
            "!document.getElementById('colx-iT').disabled", timeout=TIMEOUT)
        page.fill("#colx-iT", "3")
        page.keyboard.press("Enter")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 10, \
            f"a units mistake must drop the solved award to 67% (10), got {page.evaluate('score')}"

    def test_sup_module_cleanup_on_mode_exit(self, page):
        """Leaving Superman removes the column DOM and restores the check button."""
        self._enter_sup(page)
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.wait_for_timeout(200)
        assert page.locator("#colx-root").count() == 0
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display") != "none"


# ─────────────────────────────────────────────────────────
# Superman column digit object-preview (#num-tt, to the RIGHT, per column)
# ─────────────────────────────────────────────────────────

class TestSupermanDigitPreview:
    """Hovering a column digit previews its objects in #num-tt, to the RIGHT of
    the digit, scoped to the current column. On a units carry the SECOND number's
    units digit splits complete-to-ten | remainder."""

    def _enter(self, page, a, b):
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 14", timeout=TIMEOUT)
        page.evaluate(f"problems[0]={{t:TCA,a:{a},b:{b}}}; idx=0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        page.wait_for_timeout(200)

    def _hover(self, page, digit_id):
        page.evaluate(
            f"document.getElementById('{digit_id}').dispatchEvent(new MouseEvent('mouseenter'))")
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'", timeout=TIMEOUT)

    def _solve_units(self, page, units_sum):
        page.evaluate(
            f"(()=>{{const u=document.getElementById('colx-iU');u.value='{units_sum}';"
            "u.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})()")
        page.wait_for_function(
            "document.getElementById('colx-iT') && !document.getElementById('colx-iT').disabled",
            timeout=TIMEOUT)

    def test_units_first_number_is_plain(self, page):
        """18+15 units phase: hovering the first number's units (8) → plain 8."""
        self._enter(page, 18, 15)
        self._hover(page, "colx-aU")
        info = page.evaluate("({"
            "lbl: document.querySelector('#num-tt .ntt-lbl').textContent.trim(),"
            "split: document.querySelector('#num-tt .ntt-grid').classList.contains('ntt-split'),"
            "count: document.querySelectorAll('#num-tt .ntt-group span').length})")
        assert info["lbl"] == "8" and info["split"] is False and info["count"] == 8, info

    def test_units_carry_second_number_splits(self, page):
        """18+15: 8+5 crosses ten → hovering the second units (5) splits 2 | 3
        (complete-to-ten | remainder)."""
        self._enter(page, 18, 15)
        self._hover(page, "colx-bU")
        parts = page.evaluate(
            "[...document.querySelectorAll('#num-tt .ntt-part')].map(p => p.textContent)")
        assert parts == ["2", "3"], f"5 should split 2 | 3, got {parts}"

    def test_units_no_carry_second_number_plain(self, page):
        """16+11: 6+1 doesn't cross → second units (1) shows plain, no split."""
        self._enter(page, 16, 11)
        self._hover(page, "colx-bU")
        info = page.evaluate("({"
            "split: document.querySelector('#num-tt .ntt-grid').classList.contains('ntt-split'),"
            "count: document.querySelectorAll('#num-tt .ntt-group span').length})")
        assert info["split"] is False and info["count"] == 1, info

    def test_modal_sits_to_the_right_of_the_digit(self, page):
        """The preview opens beside the digit (right), not below it."""
        self._enter(page, 18, 15)
        self._hover(page, "colx-bU")
        ok = page.evaluate("(() => {"
            "const d = document.getElementById('colx-bU').getBoundingClientRect();"
            "const t = document.getElementById('num-tt').getBoundingClientRect();"
            "return t.top < d.bottom && t.bottom > d.top && t.left >= d.left;})()")
        assert ok, "preview should sit beside (right of) the digit, vertically overlapping it"

    def test_tens_digit_preview_after_units_solved(self, page):
        """After the units are solved, hovering a tens digit previews the tens."""
        self._enter(page, 16, 11)          # no carry → fast transition to tens
        self._solve_units(page, 7)
        self._hover(page, "colx-aT")
        info = page.evaluate("({"
            "lbl: document.querySelector('#num-tt .ntt-lbl').textContent.trim(),"
            "count: document.querySelectorAll('#num-tt .ntt-group span').length})")
        assert info["lbl"] == "1" and info["count"] == 1, info

    def test_units_digit_inert_during_tens_phase(self, page):
        """While solving the tens, hovering a UNITS digit shows nothing."""
        self._enter(page, 16, 11)
        self._solve_units(page, 7)
        page.evaluate(
            "document.getElementById('colx-bU').dispatchEvent(new MouseEvent('mouseenter'))")
        page.wait_for_timeout(150)
        assert page.evaluate("document.getElementById('num-tt').style.display") != "block", \
            "units digit must be inert during the tens phase"


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


# ─────────────────────────────────────────────────────────
# Settings modal (game picker)
# ─────────────────────────────────────────────────────────

class TestSettingsModalFlow:
    def _display(self, page):
        return page.evaluate(
            "getComputedStyle(document.getElementById('settings-ov')).display")

    def test_gear_opens_and_pick_switches_and_closes(self, page):
        open_settings_via_gate(page)   # gear → parent gate → settings
        assert self._display(page) == "flex"
        page.click(".tier-tab[data-tier='easy']")
        page.wait_for_timeout(150)
        page.click("#lb10")
        page.wait_for_function("mode === 10", timeout=TIMEOUT)
        assert self._display(page) == "none", "picking a game closes the modal"

    def test_escape_closes_without_change(self, page):
        before = page.evaluate("mode")
        page.click("#settings-btn")
        page.wait_for_timeout(250)
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)
        assert self._display(page) == "none"
        assert page.evaluate("mode") == before

    def test_header_indicator_shows_current_game(self, page):
        page.evaluate("setMode(20)")
        page.wait_for_function("mode === 20 && problems.length > 0", timeout=TIMEOUT)
        ind = page.inner_text("#mode-ind")
        assert "20" in ind, f"indicator must show the current game, got {ind!r}"


# ─────────────────────────────────────────────────────────
# Settings sub-tabs — general / prizes / history (pickSetTab)
# ─────────────────────────────────────────────────────────

class TestSettingsTabs:
    """The settings modal is split into three sub-tabs; one panel shows at a
    time and it always opens on the general tab."""

    def test_opens_on_general_tab(self, page):
        open_settings_via_gate(page)
        assert page.locator("#level-row").is_visible(), \
            "settings opens on the general tab (game picker visible)"
        assert not page.locator("#prize-row").is_visible(), "prizes panel hidden initially"
        assert not page.locator("#history-body").is_visible(), "history panel hidden initially"

    def test_prizes_tab_shows_prize_inputs(self, page):
        open_settings_via_gate(page)
        page.click(".set-tab[data-stab='prizes']")
        page.wait_for_selector("#prize-row .prize-inp", state="visible", timeout=TIMEOUT)
        assert page.locator("#prize-row").is_visible()
        assert not page.locator("#level-row").is_visible(), "general panel hidden on prizes tab"

    def test_history_tab_shows_history_body(self, page):
        open_settings_via_gate(page)
        page.click(".set-tab[data-stab='history']")
        page.wait_for_selector("#history-body", state="visible", timeout=TIMEOUT)
        assert page.locator("#history-body").is_visible()
        assert not page.locator("#level-row").is_visible(), "general panel hidden on history tab"


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


# ─────────────────────────────────────────────────────────
# Chosen game persists across a page refresh (localStorage 'gameMode')
# ─────────────────────────────────────────────────────────

class TestModePersistence:
    def _ready(self, page):
        page.wait_for_function(
            "typeof problems !== 'undefined' && problems.length > 0",
            timeout=TIMEOUT)

    def test_numeric_mode_survives_refresh_with_type(self, page):
        """Picking 'up to 10' and refreshing restores mode === 10 (number, not
        the string '10' — equality checks and the active button depend on it)."""
        page.evaluate("setMode(10)")
        page.wait_for_function("mode === 10", timeout=TIMEOUT)
        assert page.evaluate("localStorage.getItem('gameMode')") == "10"
        page.reload()
        self._ready(page)
        assert page.evaluate("mode === 10"), "numeric mode must restore as a number"
        assert page.evaluate(
            "document.getElementById('lb10').classList.contains('active')"), \
            "the restored game's button must be marked active"

    def test_string_mode_survives_refresh(self, page):
        """A string mode (Superman 🦸 — a picker game) restores verbatim."""
        page.evaluate("setMode('sup')")
        page.wait_for_function("mode === 'sup' && problems.length > 0", timeout=TIMEOUT)
        page.reload()
        self._ready(page)
        assert page.evaluate("mode === 'sup'")
        assert page.evaluate("problems.length === 14")

    def test_default_is_mx_when_nothing_saved(self, page):
        """A fresh context (no saved game) boots into Queen (mx)."""
        assert page.evaluate("localStorage.getItem('gameMode')") in (None, "mx")
        assert page.evaluate("mode === 'mx'")

    def test_garbage_saved_value_falls_back_to_mx(self, page):
        """A stale/invalid saved value must not break boot — falls back to mx."""
        page.evaluate("localStorage.setItem('gameMode','garbage')")
        page.reload()
        self._ready(page)
        assert page.evaluate("mode === 'mx'")


# ─────────────────────────────────────────────────────────
# Gift reward — the special end-of-set gift screen, shown ONLY when the
# grade clears the mode's configured threshold (GIFT_GOALS). The gift screen
# is a SEPARATE success-screen type (success_screens/gift/, registered into
# SUCCESS.special.gift — not part of the per-answer rotation).
# ─────────────────────────────────────────────────────────

class TestGiftReward:
    def _force_end(self, page, mode, correct, total):
        """Drive endGame() with a fully controlled report so the grade is
        deterministic. grade = max(101, round(correct*1000/total))."""
        page.evaluate(f"""
            mode = {mode!r};
            report = Array.from({{length: {total}}}, (_, i) => (i < {correct}
                ? {{ptype:'x', correct:0, wrongs:[],  gotCorrect:true}}
                : {{ptype:'x', correct:0, wrongs:[9], gotCorrect:false}}));
            idx = {total};
            done = false;
            endGame();
        """)

    def _gift_loaded(self, page):
        page.wait_for_function(
            "window.SUCCESS && SUCCESS.special && SUCCESS.special.gift",
            timeout=TIMEOUT)

    def test_gift_thresholds_configured(self, page):
        """GIFT_GOALS holds numeric thresholds for the reward modes only;
        the basic modes (0/5/10/20/big) have no threshold → never a gift."""
        goals = page.evaluate("GIFT_GOALS")
        for m in ("br", "mx", "sup"):
            assert isinstance(goals.get(m), (int, float)), \
                f"mode {m} must have a numeric gift threshold, got {goals.get(m)}"
        for m in ("0", "5", "10", "20", "big"):
            assert m not in goals, f"basic mode {m} must NOT have a gift threshold"

    def test_gift_screen_is_special_not_in_rotation(self, page):
        """The gift screen lives under SUCCESS.special.gift (its own subfolder),
        NOT in the per-answer SUCCESS.styles rotation."""
        self._gift_loaded(page)
        assert page.evaluate("typeof SUCCESS.special.gift.show === 'function'")
        in_rotation = page.evaluate(
            "(SUCCESS.styles||[]).some(s => /gift/i.test(s.name||''))")
        assert not in_rotation, "the gift screen must not be in the answer rotation"

    def test_gift_shown_when_grade_clears_threshold(self, page):
        """mx threshold is cleared (perfect set → grade 1000 ≥ 900): the end
        screen shows 🎁 and the special gift celebration plays."""
        self._gift_loaded(page)
        self._force_end(page, "mx", correct=17, total=17)
        assert page.evaluate("calcGrade() >= GIFT_GOALS['mx']")
        assert page.evaluate("!!document.querySelector('.end-gift')"), \
            "end screen must show the 🎁 badge when the gift is earned"
        # endGame schedules showGiftScreen after ~450ms
        page.wait_for_function(
            "typeof _giftOn !== 'undefined' && _giftOn === true", timeout=TIMEOUT)
        assert page.evaluate("!!_giftRoot"), "the gift celebration overlay must mount"

    def test_no_gift_when_grade_below_threshold(self, page):
        """mx, grade below 900 (too many wrong): no 🎁, no gift screen."""
        self._gift_loaded(page)
        self._force_end(page, "mx", correct=5, total=17)   # grade ≈ 294 < 900
        assert page.evaluate("calcGrade() < GIFT_GOALS['mx']")
        assert not page.evaluate("!!document.querySelector('.end-gift')")
        page.wait_for_timeout(800)   # well past the 450ms gift trigger
        assert page.evaluate("typeof _giftOn === 'undefined' || _giftOn === false"), \
            "no gift screen when the threshold is not cleared"

    def test_no_gift_for_mode_without_threshold(self, page):
        """A perfect run in a mode with no configured threshold (mode 10)
        still awards NO gift — eligibility is threshold-gated, not score-only."""
        self._gift_loaded(page)
        self._force_end(page, 10, correct=12, total=12)   # perfect → grade 1000
        assert page.evaluate("calcGrade() === 1000")
        assert page.evaluate("GIFT_GOALS[mode] == null"), "mode 10 has no threshold"
        assert not page.evaluate("!!document.querySelector('.end-gift')")
        page.wait_for_timeout(800)
        assert page.evaluate("typeof _giftOn === 'undefined' || _giftOn === false")


# ─────────────────────────────────────────────────────────
# Per-game prize-level config (settings) — editable, persisted, dynamic 🎁
# ─────────────────────────────────────────────────────────

class TestPrizeConfig:
    def test_prize_inputs_render_one_per_game(self, page):
        """Settings shows a prize-level input for every game."""
        open_settings_via_gate(page)
        games = page.evaluate("DIFFICULTY_GROUPS.flatMap(g => g.modes).length")
        inputs = page.evaluate("document.querySelectorAll('#prize-row .prize-inp').length")
        assert inputs == games and inputs >= 5, f"expected {games} prize inputs, got {inputs}"

    def test_default_thresholds_only_reward_games(self, page):
        """Out of the box only br/mx/sup carry a prize; basic games have none."""
        goals = page.evaluate("GIFT_GOALS")
        assert goals.get("br") and goals.get("mx") and goals.get("sup")
        for m in ("0", "5", "10", "20"):
            assert m not in goals, f"basic game {m} must start with no prize"

    def test_badge_shows_only_when_prize_set(self, page):
        """The 🎁 badge on a game button tracks whether it has a prize."""
        # mx has a default prize → badge present; mode 20 has none → no badge
        assert page.evaluate("document.getElementById('lbmx').textContent").find("🎁") >= 0
        assert "🎁" not in page.evaluate("document.getElementById('lb20').textContent")
        page.evaluate("setGiftGoal(20, 500)")
        page.evaluate("setGiftGoal('mx', 0)")
        assert "🎁" in page.evaluate("document.getElementById('lb20').textContent"), \
            "setting a prize must add the 🎁 badge"
        assert "🎁" not in page.evaluate("document.getElementById('lbmx').textContent"), \
            "clearing a prize (0) must remove the 🎁 badge"

    def test_zero_clears_prize_from_goals(self, page):
        """A 0/empty level removes the game from GIFT_GOALS (no prize)."""
        page.evaluate("setGiftGoal('mx', 0)")
        assert page.evaluate("GIFT_GOALS['mx'] == null"), "0 must clear the prize"
        page.evaluate("setGiftGoal('mx', 850)")
        assert page.evaluate("GIFT_GOALS['mx']") == 850

    def test_prize_level_persists_across_reload(self, page):
        """A changed prize level survives a page reload (localStorage)."""
        page.evaluate("setGiftGoal('mx', 0); setGiftGoal(20, 600)")
        page.reload()
        page.wait_for_function("typeof GIFT_GOALS !== 'undefined'", timeout=TIMEOUT)
        assert page.evaluate("GIFT_GOALS['mx'] == null"), "cleared prize must persist"
        assert page.evaluate("GIFT_GOALS[20]") == 600, "set prize must persist"

    def test_cleared_prize_gives_no_gift_screen(self, page):
        """With mx's prize cleared, a perfect mx run awards NO gift."""
        page.wait_for_function(
            "window.SUCCESS && SUCCESS.special && SUCCESS.special.gift", timeout=TIMEOUT)
        page.evaluate("setGiftGoal('mx', 0)")
        page.evaluate("""
            mode = 'mx';
            report = Array.from({length: 12}, () => ({ptype:'x', correct:0, wrongs:[], gotCorrect:true}));
            idx = 12; done = false; endGame();
        """)
        assert page.evaluate("calcGrade() === 1000")
        assert not page.evaluate("!!document.querySelector('.end-gift')"), \
            "no 🎁 on the end screen when the prize is cleared"
        page.wait_for_timeout(800)
        assert page.evaluate("typeof _giftOn === 'undefined' || _giftOn === false")

    def test_newly_set_prize_awards_gift(self, page):
        """Giving mode 20 a prize makes a clearing run award the gift."""
        page.wait_for_function(
            "window.SUCCESS && SUCCESS.special && SUCCESS.special.gift", timeout=TIMEOUT)
        page.evaluate("setGiftGoal(20, 500)")
        page.evaluate("""
            mode = 20;
            report = Array.from({length: 12}, () => ({ptype:'x', correct:0, wrongs:[], gotCorrect:true}));
            idx = 12; done = false; endGame();
        """)
        assert page.evaluate("!!document.querySelector('.end-gift')"), \
            "a game with a configured prize shows 🎁 when cleared"


# ─────────────────────────────────────────────────────────
# Score history (📜) — name + game + grade per completed set, persisted
# ─────────────────────────────────────────────────────────

class TestScoreHistory:
    def _record(self, page, mode, correct, total, name=""):
        page.evaluate(f"""
            setPlayerName({name!r});
            mode = {mode!r};
            report = Array.from({{length:{total}}}, (_, i) => (i < {correct}
                ? {{ptype:'x', correct:0, wrongs:[],  gotCorrect:true}}
                : {{ptype:'x', correct:0, wrongs:[9], gotCorrect:false}}));
            idx = {total}; done = false; endGame();
        """)

    def test_completed_game_is_recorded(self, page):
        """Finishing a set logs grade + name + game."""
        self._record(page, 20, 12, 12, "נֹעָה")
        h = page.evaluate("_loadHistory()")
        assert len(h) >= 1, "a completed set must be logged"
        e = h[0]
        assert e["grade"] == 1000 and e["name"] == "נֹעָה" and str(e["mode"]) == "20"
        assert "20" in e["game"], f"game label must identify the game, got {e['game']!r}"

    def test_history_is_newest_first(self, page):
        self._record(page, 20, 12, 12)
        self._record(page, "mx", 6, 12)
        h = page.evaluate("_loadHistory()")
        assert str(h[0]["mode"]) == "mx" and str(h[1]["mode"]) == "20", \
            "newest entry must be first"

    def test_history_persists_across_reload(self, page):
        """The log survives a page reload (localStorage)."""
        self._record(page, 10, 12, 12, "דָּנָה")
        page.reload()
        page.wait_for_function("typeof _loadHistory === 'function'", timeout=TIMEOUT)
        h = page.evaluate("_loadHistory()")
        assert any(e["name"] == "דָּנָה" and e["grade"] == 1000 for e in h), \
            "history must survive a reload"

    def test_history_tab_shows_recorded_rows(self, page):
        """The settings 📜 history tab lists recorded runs."""
        self._record(page, 20, 12, 12, "נֹעָה")
        open_settings_via_gate(page)
        page.click(".set-tab[data-stab='history']")
        page.wait_for_function(
            "document.querySelector('.set-panel[data-stab=\"history\"]')"
            ".classList.contains('set-panel-active')", timeout=TIMEOUT)
        assert page.locator("#history-body .hist-row").count() >= 1, \
            "the history tab must list recorded rows"

    def test_clear_history_empties_it(self, page):
        self._record(page, 20, 12, 12)
        page.evaluate("clearHistory()")
        assert page.evaluate("_loadHistory().length") == 0, "clear must wipe the log"


# ─────────────────────────────────────────────────────────
# Success-screen praise — varied headlines + optional player name
# ─────────────────────────────────────────────────────────

class TestPraiseText:
    def test_plain_praise_is_varied_and_nonempty(self, page):
        """With no name configured, the praise headline is drawn from a pool
        (not always 'כל הכבוד') and is never blank."""
        lines = set(page.evaluate("Array.from({length:60}, () => _praise())"))
        assert len(lines) >= 4, f"praise should vary, got {lines}"
        assert all(s.strip() for s in lines), "praise must never be blank"

    def test_name_field_persists(self, page):
        """The settings modal has a name field; typing a name saves it."""
        open_settings_via_gate(page)   # gear → parent gate → settings
        assert page.locator("#name-input").count() == 1
        page.fill("#name-input", "נֹעָה")
        page.wait_for_timeout(100)
        assert page.evaluate("localStorage.getItem('playerName')") == "נֹעָה"
        page.keyboard.press("Escape")
        page.reload()
        page.wait_for_function("typeof problems !== 'undefined'", timeout=TIMEOUT)
        assert page.evaluate("playerName()") == "נֹעָה", "name must survive refresh"

    def test_named_praise_appears_with_cadence(self, page):
        """When a name is set, the name is woven into the praise periodically
        (roughly once every 2–3 screens) — it DOES appear, the named lines are
        varied, but it is not on every single screen (so it stays special)."""
        page.evaluate("setPlayerName('נֹעָה')")
        lines = page.evaluate("Array.from({length:120}, () => _praise())")
        named = [s for s in lines if "נֹעָה" in s]
        assert len(named) >= 1, "the name must appear in the praise rotation"
        assert len(named) < len(lines), "the name must NOT be on every screen (cadence)"
        assert len(set(named)) >= 2, "named praise lines must still be varied"
        assert all(s.strip() for s in lines), "praise must never be blank"

    def test_named_praise_reaches_the_success_screen(self, page):
        """The chosen praise is passed to the success screen's show() headline.
        Force the name-cadence to fire on the next pick so the assertion is
        deterministic (the screen calls _praise() exactly once)."""
        page.evaluate("setPlayerName('נֹעָה')")
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TA, a: 2, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(150)
        # install a probe screen as the only style so it is guaranteed picked,
        # and prime the cadence counter so the next _praise() is name-aware
        page.evaluate("""
            window.__lastPraise = null;
            _praiseSinceName = 99;
            SUCCESS.styles.length = 0;
            SUCCESS.styles.push({name:'__probe', supportsSuper:true,
                show(o){ window.__lastPraise = o.praise; return () => {}; }});
        """)
        page.fill("#ans", "5")
        page.click("#chk-btn")
        page.wait_for_function("window.__lastPraise !== null", timeout=TIMEOUT)
        assert "נֹעָה" in page.evaluate("window.__lastPraise")

    def test_clearing_name_reverts_to_plain_praise(self, page):
        """With a name set, a name-cadence pick contains it; once cleared, no
        praise ever contains the old name."""
        page.evaluate("setPlayerName('נֹעָה'); _praiseSinceName = 99;")
        assert page.evaluate("_praise().includes('נֹעָה')"), \
            "a primed pick must contain the name while one is set"
        page.evaluate("setPlayerName('')")
        lines = page.evaluate("Array.from({length:30}, () => _praise())")
        assert not any("נֹעָה" in s for s in lines), "cleared name must never appear"


# ─────────────────────────────────────────────────────────
# Success-screen display duration — each celebration lingers +1s over the
# original timing (normal 1700→2700ms, super 3500→4500ms). The host owns the
# timer (_fwTO = setTimeout(_fwDone, DUR)), so a no-op probe screen lets us
# measure the pure host duration regardless of any real screen's internals.
# ─────────────────────────────────────────────────────────

class TestSuccessDuration:
    def _measure(self, page, super_run):
        """Trigger one celebration and return how long _fwOn stays true (ms)."""
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TA, a: 2, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(150)
        # install a no-op probe as the ONLY style → always picked, host-timed;
        # for the super case prime fwCount so the next win is the 5th (super)
        page.evaluate(f"""
            SUCCESS.styles.length = 0;
            SUCCESS.styles.push({{name:'__probe', supportsSuper:true,
                show(){{ return () => {{}}; }}}});
            fwCount = {4 if super_run else 0};
        """)
        page.fill("#ans", "5")
        page.click("#chk-btn")
        page.wait_for_function("_fwOn === true", timeout=TIMEOUT)
        t0 = time.monotonic()
        page.wait_for_function("_fwOn === false", timeout=TIMEOUT)
        return (time.monotonic() - t0) * 1000

    def test_normal_screen_shows_about_2700ms(self, page):
        ms = self._measure(page, super_run=False)
        assert 2450 <= ms <= 3300, \
            f"normal success screen should linger ~2700ms (1700+1000), got {ms:.0f}ms"
        assert page.evaluate("idx") >= 1, "game advances after the screen closes"

    def test_super_screen_shows_about_4500ms(self, page):
        ms = self._measure(page, super_run=True)
        assert 4250 <= ms <= 5100, \
            f"super success screen should linger ~4500ms (3500+1000), got {ms:.0f}ms"
        assert page.evaluate("idx") >= 1, "game advances after the screen closes"


# ─────────────────────────────────────────────────────────
# Number line (#nl-panel) interactivity across exercise types
# ─────────────────────────────────────────────────────────
class TestNumberLineInteraction:
    """Wherever the kangaroo number line (#nl-panel) is displayed, it must react
    to BOTH the ± arrow buttons (#nl-btn-plus / #nl-btn-minus) AND the spacebar —
    in every exercise type that uses it. The arrow onclick and the spacebar
    handler both call NL.step(), so we spy on NL.step and assert each input
    triggers it (after the line is revealed, exactly like the first mistake)."""

    # (label, setMode arg, problem-construction JS) — one problem per NL type
    CASES = [
        ("add (TA)",       "20",    "problems[0]={t:TA,a:6,b:7}"),
        ("subtract (TS)",  "20",    "problems[0]={t:TS,a:15,b:6}"),
        ("missing (TM)",   "20",    "problems[0]={t:TM,a:14,b:5}"),
        ("coins (TC)",     "20",    "problems[0]={t:TC,coins:[10,5,2],correct:17}"),
        ("tens (TT)",      "'mx'",  "problems[0]={t:TT,a:30,b:20,op:'add'}"),
        ("big-step (TBG)", "'mx'",  "problems[0]={t:TBG,a:34,b:2,op:'add'}"),
        ("column (TCA)",   "'sup'", "problems[0]={t:'col_add',a:14,b:8}"),
    ]

    def _activate(self, page, mode_arg, problem_js):
        """Load the given problem and reveal the number line (enable the ±
        buttons + lift the spacebar's try-first guard, as a first mistake does)."""
        page.evaluate(f"setMode({mode_arg})")
        page.wait_for_function("problems.length > 0", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        page.evaluate(f"{problem_js}; idx = 0; loadProblem();")
        page.wait_for_timeout(230)   # TCA mounts its column module asynchronously
        page.evaluate("tryFirst = 1; if (typeof _unlockAids === 'function') _unlockAids();")
        page.wait_for_timeout(120)

    def test_arrows_and_space_drive_the_line(self, page):
        failures = []
        for label, mode_arg, problem_js in self.CASES:
            self._activate(page, mode_arg, problem_js)
            disp = page.evaluate(
                "(()=>{const n=document.getElementById('nl-panel');"
                "return n?getComputedStyle(n).display:'(missing)';})()")
            if disp in ('none', '(missing)'):
                failures.append(f"{label}: number line not displayed (display={disp})")
                continue
            # spy on NL.step — both the ± onclick and the spacebar handler call it
            page.evaluate(
                "if(!NL.__spied){const _s=NL.step;"
                "NL.step=function(d){window.__steps=(window.__steps||0)+1;return _s.call(NL,d);};"
                "NL.__spied=true;} window.__steps=0;")
            # + arrow button
            page.click("#nl-btn-plus")
            page.wait_for_timeout(70)
            n_plus = page.evaluate("window.__steps")
            # − arrow button (now enabled — the rider moved off the origin)
            page.click("#nl-btn-minus")
            page.wait_for_timeout(70)
            n_minus = page.evaluate("window.__steps")
            # spacebar — blur first so focus is on neither a button nor an input
            page.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
            page.keyboard.press("Space")
            page.wait_for_timeout(70)
            n_space = page.evaluate("window.__steps")
            if not (n_plus >= 1 and n_minus >= 2 and n_space >= 3):
                failures.append(
                    f"{label}: NL.step calls after +/-/space = "
                    f"{n_plus}/{n_minus}/{n_space} (expected >=1/>=2/>=3)")
        assert not failures, "Number line did not respond:\n  " + "\n  ".join(failures)
