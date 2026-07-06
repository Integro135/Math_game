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
    # column exercises now open on a one-line "show in column" intro; auto-reveal
    # it so the existing column tests reach the board directly (a dedicated test
    # covers the intro→reveal flow with the flag off).
    p.add_init_script("window.__colxAutoReveal=true")
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
        TM, TS, TA, TX, TZ, TW, TDA, TDS, TC, TT, TCA, TCS, TBG, TCM, TBC
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
        # a real subtraction the game accepts: subtrahend ≥ 1 and minuend ≠ 10
        # (the game rejects a minuend of 10 or a subtrahend of 0)
        sub = 2
        while n1 + sub == 10:
            sub += 1
        return ("td", n1 + sub, sub)  # (n1+sub) − sub = n1
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
        """For TDA (___+___=R), entering v1,v2 where v1+v2=R must succeed.
        The TDA problem is forced deterministically (the force-a-problem idiom
        used throughout this file); mode-10 TD *generation* is covered by the
        slot-placement tests, so no random session-hunting is needed here."""
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        r = 8
        page.evaluate(f"problems[0] = {{t: TDA, r: {r}}}; idx = 0; loadProblem()")
        page.wait_for_selector("#ans1:not([disabled])", timeout=TIMEOUT)
        v1 = max(1, r // 2)           # non-trivial split
        v2 = r - v1
        page.fill("#ans1", str(v1))
        page.fill("#ans2", str(v2))
        before = page.evaluate("idx")
        page.click("#chk-btn")
        wait_fw_and_advance(page, before)

    def test_tds_accepts_any_valid_pair(self, page):
        """For TDS (___-___=R), entering v1,v2 where v1-v2=R must succeed.
        The TDS problem is forced deterministically; mode-10 TD *generation* is
        covered by the slot-placement tests, so no random session-hunting here."""
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        r = 8
        page.evaluate(f"problems[0] = {{t: TDS, r: {r}}}; idx = 0; loadProblem()")
        page.wait_for_selector("#ans1:not([disabled])", timeout=TIMEOUT)
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

    def test_xx_sub_rejects_target_minus_zero_without_penalty(self, page):
        """x−x=10: the lazy 'target − 0' (10 − 0) is CORRECT but not accepted — the
        child must give a real subtraction. It costs no penalty (tryFirst/score
        unchanged) and clears the boxes; a real pair (15 − 5) is then accepted for
        full points."""
        page.evaluate("mode='mx'; score=0; problems=[{t:TDS,r:10}]; idx=0; loadProblem()")
        page.wait_for_selector("#ans1", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        lazy = page.evaluate("""(() => {
            document.getElementById('ans1').value='10';
            document.getElementById('ans2').value='0'; checkAns();
            return {done:done, tryFirst:tryFirst, score:score,
                    fbErr:document.getElementById('fb').className.includes('fb-err'),
                    cleared:document.getElementById('ans1').value===''};})()""")
        assert lazy["done"] is False, f"'10 − 0' must not be accepted: {lazy}"
        assert lazy["tryFirst"] == 0 and lazy["score"] == 0, f"no penalty for the lazy try: {lazy}"
        assert lazy["fbErr"] and lazy["cleared"], f"feedback shown + boxes cleared: {lazy}"
        # a real subtraction is accepted for FULL points (the lazy try wasn't a mistake)
        real = page.evaluate("""(() => {
            document.getElementById('ans1').value='15';
            document.getElementById('ans2').value='5'; checkAns();
            return {done:done, score:score, got:(report[0]||{}).gotCorrect||false};})()""")
        assert real["done"] is True and real["got"] is True and real["score"] > 0, \
            f"a real pair (15 − 5) must be accepted for points: {real}"

    def test_tri_unknown_three_boxes_sum_to_target(self, page):
        """x+x+x=R (TRA): three boxes __+__+__ = R. A wrong triple (5+5+3) is a
        mistake; a right one (5+5+5=15) is accepted and the report stores the three
        addends; the type appears in the Queen pool."""
        page.evaluate("mode='mx'; score=0; problems=[{t:TRA,r:15}]; idx=0; loadProblem()")
        page.wait_for_selector("#ans1", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        for bid in ("ans1", "ans2", "ans3"):
            assert page.locator("#" + bid).count() == 1, f"expected #{bid} box"
        wrong = page.evaluate("""(() => {
            document.getElementById('ans1').value='5';
            document.getElementById('ans2').value='5';
            document.getElementById('ans3').value='3'; checkAns();
            return {done:done, tryFirst:tryFirst};})()""")
        assert wrong["done"] is False and wrong["tryFirst"] == 1, f"5+5+3≠15 is a mistake: {wrong}"
        page.wait_for_timeout(250)
        right = page.evaluate("""(() => {
            document.getElementById('ans1').value='5';
            document.getElementById('ans2').value='5';
            document.getElementById('ans3').value='5'; checkAns();
            return {done:done, score:score, pair:(report[0]||{}).userPair||null};})()""")
        assert right["done"] is True and right["score"] > 0, f"5+5+5=15 must be accepted: {right}"
        assert right["pair"] == [5, 5, 5], f"report must store the three addends: {right}"
        page.evaluate("setMode('mx')")
        page.wait_for_function("mode==='mx' && problems.length>0", timeout=TIMEOUT)
        inq = page.evaluate("(()=>{for(var k=0;k<10;k++){if(makeMxPool().some(p=>p.t===TRA))return true;}return false;})()")
        assert inq, "the three-unknown (TRA) must appear in the Queen pool"

    def test_xx_sub_rejects_minuend_of_ten(self, page):
        """x−x=9: the rote '10 − 1' (a minuend of 10) is correct but NOT accepted —
        the child must use a different minuend. No penalty; a real pair (13 − 4)
        then passes for points."""
        page.evaluate("mode='mx'; score=0; problems=[{t:TDS,r:9}]; idx=0; loadProblem()")
        page.wait_for_selector("#ans1", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        lazy = page.evaluate("""(() => {
            document.getElementById('ans1').value='10';
            document.getElementById('ans2').value='1'; checkAns();
            return {done:done, tryFirst:tryFirst, score:score,
                    fbErr:document.getElementById('fb').className.includes('fb-err'),
                    cleared:document.getElementById('ans1').value===''};})()""")
        assert lazy["done"] is False, f"'10 − 1' (minuend 10) must not be accepted: {lazy}"
        assert lazy["tryFirst"] == 0 and lazy["score"] == 0, f"no penalty for the rote try: {lazy}"
        assert lazy["fbErr"] and lazy["cleared"], f"feedback shown + boxes cleared: {lazy}"
        real = page.evaluate("""(() => {
            document.getElementById('ans1').value='13';
            document.getElementById('ans2').value='4'; checkAns();
            return {done:done, score:score, got:(report[0]||{}).gotCorrect||false};})()""")
        assert real["done"] is True and real["got"] is True and real["score"] > 0, \
            f"a real pair (13 − 4 = 9) must be accepted for points: {real}"


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
        """Mode 5 (עַד 5) still exists and injectCoins() guarantees ≥1 coin
        problem in every session (coins.ex.js lists mode 5 + inject())."""
        page.evaluate("setMode(5)")
        page.wait_for_timeout(120)
        for session in range(5):
            count = self._tc_count_in_session(page)
            assert count >= 1, \
                f"Mode 5 session {session + 1}: expected ≥1 coin problem, got {count}"
            page.evaluate("restart()")
            page.wait_for_timeout(100)

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
        """The old ordered phase structure was removed. makeMxPool() now builds
        the Queen pool as ONE flat shuffle of every contributing type's mx quota
        (problems.js: shuffle([...chain, ...missing, ...sub, ...add, ...double,
        ...tens, ...coins, ...big_step])). New contract: exactly 17 problems and
        NO position-based answer cap (the first 5 slots are not constrained to a
        ≤10 answer). Verify the size contract and the absence of the old cap
        across several fresh shuffles."""
        page.evaluate("setMode('mx')")
        any_early_above_10 = False
        for _ in range(8):
            page.evaluate("restart()")
            page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
            problems = page.evaluate(
                "[...problems].map(p => ({t:p.t, a:p.a, b:p.b, c:p.c, r:p.r}))")
            assert len(problems) == 20, \
                f"Queen (mx) must present 20 problems (shuffle + coverage-preserving cap), got {len(problems)}"
            consts = page.evaluate("({TA,TS,TM,TX,TZ,TW})")
            for p in problems[:5]:               # the former "phase 1" slots
                ans = None
                if p["t"] == consts["TA"]:   ans = p["a"] + p["b"]
                elif p["t"] == consts["TS"]: ans = p["a"] - p["b"]
                elif p["t"] == consts["TZ"]: ans = p["a"] + p["b"] + p["c"]
                elif p["t"] == consts["TX"]: ans = p["a"] - p["b"] + p["c"]
                elif p["t"] == consts["TW"]: ans = p["a"] - p["b"] - p["c"]
                elif p["t"] == consts["TM"]: ans = p["b"]
                if ans is not None and ans > 10:
                    any_early_above_10 = True
        assert any_early_above_10, \
            "Phase structure is gone: early slots must NOT be capped at ≤10 — " \
            "across 8 shuffles at least one of the first 5 answers should exceed 10"

    def test_chain_problem_5_answer_at_most_20(self, page):
        """Phase structure removed — makeMxPool() is a single flat shuffle, so
        problem 5 (index 4) is no longer pinned to any phase boundary. New
        contract: every contributing exercise TYPE is present in the shuffled
        Queen pool (chain TX/TZ/TW, TM, TS, TA, TDA/TDS, TT, TC, TBG)."""
        consts = page.evaluate("({TM,TS,TA,TX,TZ,TW,TDA,TDS,TC,TT,TBG})")
        page.evaluate("setMode('mx'); restart()")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        types = page.evaluate("[...problems].map(p => p.t)")
        assert len(types) == 20
        # chain family (TX/TZ/TW) must appear; each other type must appear ≥1
        chain = {consts["TX"], consts["TZ"], consts["TW"]}
        assert any(t in chain for t in types), "Chain problems must be present in mx"
        for name in ("TM", "TS", "TA", "TT", "TC", "TBG"):
            assert consts[name] in types, \
                f"makeMxPool must include type {name}; got {types}"
        # the double-unknown family contributes one add + one sub
        assert consts["TDA"] in types and consts["TDS"] in types, \
            "makeMxPool must include both TDA and TDS"

    def test_chain_third_number_can_exceed_six(self, page):
        """The chain THIRD number c reaches up to 9 (was capped at 6) while
        results stay valid (TZ/TX sums ≤ 25, TW result ≥ 2)."""
        consts = page.evaluate("({TZ,TX,TW})")
        page.wait_for_function("window.EXERCISES && EXERCISES.types.chain", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{let maxC=0,maxR=0,invalid=0;
          for(let k=0;k<400;k++){EXERCISES.types.chain.make('mx').forEach(p=>{
            if(p.c>maxC)maxC=p.c;
            if(p.t===TZ){if(p.a+p.b+p.c>maxR)maxR=p.a+p.b+p.c; if(p.a+p.b+p.c>25)invalid++;}
            if(p.t===TX&&p.a-p.b+p.c>25)invalid++;
            if(p.t===TW&&p.a-p.b-p.c<2)invalid++;});}
          return {maxC,maxR,invalid};})()""")
        assert res["maxC"] >= 8, f"chain third number should now reach at least 8, got {res['maxC']}"
        assert res["maxR"] > 20, f"chain results should now be able to exceed 20 (up to 25), max seen {res['maxR']}"
        assert res["invalid"] == 0, f"all chain results must stay valid (≤25), {res['invalid']} invalid"

    # ── Chain last 4 have first operand > 10 ─────────────

    def test_chain_last_4_first_number_above_10(self, page):
        """Phase structure removed — makeMxPool() shuffles every type together,
        so the LAST 4 slots carry no 'first operand > 10' guarantee anymore.
        Verify the constraint is gone: across several fresh shuffles, at least
        one of the last 4 problems has a first operand ≤ 10 (impossible under
        the old position-based rule)."""
        page.evaluate("setMode('mx')")
        seen_small_first = False
        for _ in range(8):
            page.evaluate("restart()")
            page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
            problems = page.evaluate(
                "[...problems].map(p => ({t:p.t, a:p.a, r:p.r}))")
            for p in problems[-4:]:
                first = p["a"] if p["a"] is not None else p["r"]
                if first is not None and first <= 10:
                    seen_small_first = True
        assert seen_small_first, \
            "Position-based 'last 4 have first operand > 10' rule must be gone — " \
            "a flat shuffle should put a ≤10 first operand in the last 4 slots sometimes"


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
        """Hovering a revealable number shows #num-tt with EXACTLY that many
        emoji spans across all groups. (A single TDA result is never suppressed.)"""
        page.evaluate("problems[0] = {t: TDA, r: 7}; idx = 0; loadProblem();")
        page.wait_for_timeout(150)
        page.evaluate("""
            const el = document.querySelector('#eq .eq-n[data-num="7"]');
            el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
        """)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        emoji_count = page.evaluate(
            "document.querySelectorAll('#num-tt .ntt-group span').length"
        )
        assert emoji_count == 7, \
            f"Expected 7 emojis in tooltip for number 7, got {emoji_count}"

    def test_tooltip_label_shows_the_number(self, page):
        """The .ntt-lbl text content equals the hovered number."""
        page.evaluate("problems[0] = {t: TDA, r: 7}; idx = 0; loadProblem();")
        page.wait_for_timeout(150)
        page.evaluate("""
            const el = document.querySelector('#eq .eq-n[data-num="7"]');
            el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
        """)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        lbl = page.evaluate("document.querySelector('#num-tt .ntt-lbl').textContent")
        assert lbl.strip() == "7", \
            f"Tooltip label should be '7', got '{lbl}'"

    def test_tooltip_hides_on_mouseout(self, page):
        """Moving the mouse away hides the tooltip."""
        page.evaluate("problems[0] = {t: TDA, r: 7}; idx = 0; loadProblem();")
        page.wait_for_timeout(150)
        page.evaluate("""
            const el = document.querySelector('#eq .eq-n[data-num="7"]');
            el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
        """)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'",
            timeout=TIMEOUT,
        )
        # Move away — fire mouseout on the element
        page.evaluate("""
            const el = document.querySelector('#eq .eq-n[data-num="7"]');
            el.dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
        """)
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display !== 'block'",
            timeout=TIMEOUT,
        )

    def test_tooltip_grouped_in_fives(self, page):
        """Emojis are organized in groups of 5 (last group may have fewer)."""
        # a single, non-suppressed number (TDA result) = 9 → groups [5,4]
        # (the FIRST operand of a 2-number equation no longer reveals its objects)
        page.evaluate(
            "problems[0] = {t: TDA, r: 9}; idx = 0; loadProblem();"
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
            "problems[0] = {t: TDA, r: 19}; idx = 0; loadProblem();"
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
        # a single, non-suppressed number (TDA result) = 13 → groups [5, 5, 3]
        page.evaluate(
            "problems[0] = {t: TDA, r: 13}; idx = 0; loadProblem();"
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
        # a single, non-suppressed number (TDA result) = 3
        page.evaluate(
            "problems[0] = {t: TDA, r: 3}; idx = 0; loadProblem();"
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
            "problems[0] = {t: TDA, r: 15}; idx = 0; loadProblem();"
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
        # hover the SECOND operand (11) — the first (18) no longer reveals objects
        page.evaluate(
            "[...document.querySelectorAll('#eq .eq-n')]"
            ".find(e=>e.getAttribute('data-num')==='11')"
            ".dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))")
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'", timeout=TIMEOUT)
        page.evaluate("showFw()")
        assert page.evaluate("document.getElementById('num-tt').style.display") == "none", \
            "tooltip must be hidden once the celebration/prize screen shows"
        # and a STILL-ACTIVE hover (re-fired mouseover) must NOT re-open it while
        # the success screen is up
        page.evaluate(
            "[...document.querySelectorAll('#eq .eq-n')]"
            ".find(e=>e.getAttribute('data-num')==='11')"
            ".dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))")
        page.wait_for_timeout(120)
        assert page.evaluate("document.getElementById('num-tt').style.display") == "none", \
            "a lingering hover must not re-open the tooltip during the celebration"

    def test_only_second_number_reveals_objects(self, page):
        """In a 2-number equation (8 + 5), hovering the FIRST number (8) reveals
        nothing, while hovering the SECOND (5) reveals its objects — so the child
        must rely on the second number's make-ten visualisation."""
        page.evaluate("problems[0] = {t: TA, a: 8, b: 5}; idx = 0; loadProblem();")
        page.wait_for_timeout(120)
        # FIRST number → suppressed
        page.evaluate(
            "document.querySelector('#eq .eq-n[data-num=\"8\"]')"
            ".dispatchEvent(new MouseEvent('mouseover', {bubbles: true}))")
        page.wait_for_timeout(150)
        assert page.evaluate("document.getElementById('num-tt').style.display") != "block", \
            "first number (8) must reveal no objects"
        # SECOND number → reveals objects
        page.evaluate(
            "document.querySelector('#eq .eq-n[data-num=\"5\"]')"
            ".dispatchEvent(new MouseEvent('mouseover', {bubbles: true}))")
        page.wait_for_function(
            "document.getElementById('num-tt')?.style.display === 'block'", timeout=TIMEOUT)
        count = page.evaluate(
            "document.querySelectorAll('#num-tt .ntt-objs span, #num-tt .ntt-group span').length")
        assert count == 5, f"second number (5) must reveal 5 objects, got {count}"


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

    def test_first_operand_shows_no_tooltip(self, page):
        """Hovering the FIRST number (18 in 18−11) reveals NOTHING — the child
        must use the SECOND number's visualisation instead. The first span
        carries class eq-noobj and its mouseover opens no tooltip."""
        page.evaluate("problems[0] = {t: TS, a: 18, b: 11}; idx = 0; loadProblem();")
        page.wait_for_timeout(120)
        first = page.evaluate(
            "document.querySelector('#eq .eq-n[data-num=\"18\"]').classList.contains('eq-noobj')")
        assert first is True, "first operand must carry the eq-noobj (suppressed) class"
        # firing mouseover on it must NOT open the tooltip
        page.evaluate(
            "document.querySelector('#eq .eq-n[data-num=\"18\"]')"
            ".dispatchEvent(new MouseEvent('mouseover', {bubbles: true}))")
        page.wait_for_timeout(150)
        assert page.evaluate("document.getElementById('num-tt').style.display") != "block", \
            "first operand must NOT reveal an objects tooltip"

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
    """The 'br' mode (גָּשֵׁר 10) serves FOUR fixed pedagogical sets in a prescribed
       order — no random generation, no shuffle. The sets ALTERNATE on EVERY
       rebuild — choosing the game, re-clicking it, "play again" (restart) or a
       reload (set 1 → set 2 → set 3 → set 4 → set 1 …); a fresh start serves set 1.
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
        """Every rebuild advances the set, so restart() cycles through the four
        sets: set 1 → 2 → 3 → 4 → set 1 (deterministic). The shape-unknown type is
        woven into every set (see test_br_weaves_unknown_every_fourth); normalise
        TVA/TVS back to their base add/sub type for the order check."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        exp = [[[consts[t], a, b] for t, a, b in seq] for seq in
               (self.EXPECTED_SEQ, self.EXPECTED_SEQ_2, self.EXPECTED_SEQ_3, self.EXPECTED_SEQ_4)]
        NORM = "[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])"
        self._switch_br(page)
        seen = [page.evaluate(NORM)]
        for _ in range(4):
            page.evaluate("restart()"); page.wait_for_timeout(120)
            seen.append(page.evaluate(NORM))
        assert seen[0] == exp[0], "first build serves set 1"
        assert seen[1] == exp[1], "restart → set 2"
        assert seen[2] == exp[2], "restart → set 3"
        assert seen[3] == exp[3], "restart → set 4"
        assert seen[4] == exp[0], "the following restart wraps back to set 1"

    def test_br_weaves_unknown_every_fourth(self, page):
        """An "unknown" exercise is woven into EVERY set at every 4th problem
        (slots 4, 8, 12 …), cycling through the three kinds — one-unknown (TVA/TVS),
        two-unknown, and the three-unknown sum (TRA). Drawn from the set's own
        problems, so a/b/answer are unchanged; exactly one per four slots."""
        consts = page.evaluate("({TVA, TVS, TRA})")
        kinds = {consts["TVA"], consts["TVS"], consts["TRA"]}
        self._switch_br(page)
        for _ in range(4):                                  # check all four sets
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

    def test_br_alternates_sets_in_turns(self, page):
        """Each menu selection advances: set1 → 2 → 3 → 4 → set1 (unknowns woven
        into every set; normalised back to base types for the order check)."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        exp = [[[consts[t], a, b] for t, a, b in seq] for seq in
               (self.EXPECTED_SEQ, self.EXPECTED_SEQ_2, self.EXPECTED_SEQ_3, self.EXPECTED_SEQ_4)]
        NORM = "[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])"
        self._switch_br(page)
        seen = [page.evaluate(NORM)]
        for _ in range(4):
            self._reenter_br(page)
            seen.append(page.evaluate(NORM))
        assert seen[0] == exp[0], "1st selection → set 1"
        assert seen[1] == exp[1], "2nd selection → set 2"
        assert seen[2] == exp[2], "3rd selection → set 3"
        assert seen[3] == exp[3], "4th selection → set 4"
        assert seen[4] == exp[0], "5th selection wraps back to set 1"

    def test_br_restart_size_alternates(self, page):
        """The four sets have lengths 25, 18, 15, 15; restarts cycle through them
        (25 → 18 → 15 → 15 → 25). Weaving the unknowns in re-renders problems but
        never adds/removes any, so the lengths are unchanged."""
        self._switch_br(page)
        lens = [page.evaluate("problems.length")]
        for _ in range(4):
            page.evaluate("restart()"); page.wait_for_timeout(120)
            lens.append(page.evaluate("problems.length"))
        assert lens == [25, 18, 15, 15, 25], f"sizes must cycle on restart, got {lens}"

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
        """Booting straight into br (the persisted mode) rotates the set each reload,
        so 4 reloads from a fresh start serve all FOUR distinct sets in turn (sets 3
        and 4 share a length, so compare by CONTENT, not size)."""
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
    """'b20' (גָּשֵׁר 20) is its own game/category — TWO fixed 15-problem sets served
    ALTERNATELY (set 1 → set 2 → set 1 …), whose sums/minuends all sit in 21–23, so 20
    is crossed by only 1/2/3. Set 1 = small jumps (anchors 19/18/17); set 2 = bigger
    jumps (anchors 16/15/14). Built in the complement-family style of גָּשֵׁר 10's set 1."""

    # SET 1 — small jumps
    B20_SEQ = [
        ("TA", 19, 2), ("TA", 19, 3), ("TA", 19, 4), ("TS", 21, 2), ("TS", 22, 3), ("TS", 23, 4),
        ("TA", 18, 3), ("TA", 18, 4), ("TA", 18, 5), ("TS", 21, 3), ("TS", 22, 4), ("TS", 23, 5),
        ("TA", 17, 4), ("TA", 17, 5), ("TA", 17, 6),
    ]
    # SET 2 — bigger jumps (anchors 16/15/14)
    B20_SEQ_2 = [
        ("TA", 16, 5), ("TA", 16, 6), ("TA", 16, 7), ("TS", 21, 5), ("TS", 22, 6), ("TS", 23, 7),
        ("TA", 15, 6), ("TA", 15, 7), ("TA", 15, 8), ("TS", 21, 6), ("TS", 22, 7), ("TS", 23, 8),
        ("TA", 14, 7), ("TA", 14, 8), ("TA", 14, 9),
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
        """Every b20 problem bridges 20 by ≤3 — sums 21–23 / minuends 21–23, results 17–19."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        TA, TS = consts["TA"], consts["TS"]
        self._switch(page)
        for t, a, b in page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])"):
            if t == TA:
                assert a < 20 and b < 10 and 21 <= a + b <= 23, \
                    f"addition {a}+{b} must cross 20 by ≤3 (sum 21–23)"
            else:
                assert 21 <= a <= 23 and (a - b) < 20 and 17 <= (a - b) <= 19, \
                    f"subtraction {a}-{b} must cross 20 from a low-20s minuend (result 17–19)"

    def test_b20_pts_and_prize(self, page):
        """b20 scores 15 per answer and has its own prize goal (like גָּשֵׁר 10)."""
        self._switch(page)
        assert page.evaluate("modePts()") == 15
        assert page.evaluate("GIFT_GOALS['b20']") == 900

    def test_b20_active_button_marker(self, page):
        self._switch(page)
        assert page.locator("#lbb20.active").count() == 1
        assert page.locator("#lbbr.active").count() == 0

    def test_b20_alternates_two_sets(self, page):
        """Every rebuild advances the set: set 1 → set 2 → set 1 (the shape-unknown
        type is woven into BOTH sets, every 4th problem; normalised back to base
        types for the order check)."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        exp1 = [[consts[t], a, b] for t, a, b in self.B20_SEQ]
        exp2 = [[consts[t], a, b] for t, a, b in self.B20_SEQ_2]
        NORM = "[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])"
        self._switch(page)
        s1 = page.evaluate(NORM)
        page.evaluate("restart()"); page.wait_for_timeout(120)
        s2 = page.evaluate(NORM)
        page.evaluate("restart()"); page.wait_for_timeout(120)
        s3 = page.evaluate(NORM)
        assert s1 == exp1, "first build serves set 1"
        assert s2 == exp2, "restart advances to set 2"
        assert s3 == exp1, "next restart wraps back to set 1"
        # the unknown type is present in each set, on 4th slots
        unk = page.evaluate("[...problems].map((p,i)=>({i,u:p.t===TVA||p.t===TVS})).filter(o=>o.u).map(o=>o.i)")
        assert unk and all((i + 1) % 4 == 0 for i in unk), \
            f"b20 must weave shape-unknowns onto 4th slots, got idx {unk}"

    def test_b20_set2_exact_order_and_crosses_gently(self, page):
        """Set 2 (bigger jumps) serves its exact order; all 15 still cross 20 by ≤3
        (sums/minuends 21–23) — only the decomposition is larger."""
        consts = page.evaluate("({TA, TS, TVA, TVS})")
        TA, TS = consts["TA"], consts["TS"]
        self._switch(page)                          # set 1
        page.evaluate("restart()"); page.wait_for_timeout(120)   # → set 2
        probs = page.evaluate("[...problems].map(p => [(p.t===TVA?TA:p.t===TVS?TS:p.t===TRA?(p.a+p.b===p.r?TA:TS):p.t), p.a, p.b])")
        expected = [[consts[t], a, b] for t, a, b in self.B20_SEQ_2]
        assert probs == expected, f"b20 set 2 order deviated.\nexpected={expected}\ngot={probs}"
        for t, a, b in probs:
            if t == TA:
                assert a < 20 and b < 10 and 21 <= a + b <= 23, \
                    f"addition {a}+{b} must cross 20 by ≤3 (sum 21–23)"
            else:
                assert 21 <= a <= 23 and (a - b) < 20, \
                    f"subtraction {a}-{b} must cross 20 from a low-20s minuend"


# ─────────────────────────────────────────────────────────
# Shape-variable ONE-UNKNOWN add/sub (TVA / TVS): ⃝ = N, then a ± ⃝ = ?
# ─────────────────────────────────────────────────────────
class TestVarOneUnknown:
    def _force(self, page, prob):
        page.evaluate(f"mode='br'; problems=[{prob}]; idx=0; loadProblem()")
        page.wait_for_selector("#ans:not([disabled])", timeout=TIMEOUT)
        page.wait_for_timeout(80)

    def test_sub_with_shape_unknown(self, page):
        """⃝ = 20, then 30 − ⃝ = ?  →  10 (substitute the shape's value)."""
        self._force(page, "{t:TVS,a:30,b:20,sym:'circle'}")
        assert page.locator("#eq svg").count() >= 2, "shape drawn in the def line AND the equation"
        assert page.evaluate("report[0].correct") == 10, "30 − 20 must be 10"
        page.fill("#ans", "10"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" in page.locator("#fb").get_attribute("class"), "10 is correct"

    def test_add_with_shape_unknown(self, page):
        """⃝ = 20, then 30 + ⃝ = ?  →  50."""
        self._force(page, "{t:TVA,a:30,b:20,sym:'square'}")
        assert page.evaluate("report[0].correct") == 50, "30 + 20 must be 50"
        page.fill("#ans", "50"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" in page.locator("#fb").get_attribute("class"), "50 is correct"

    def test_wrong_answer_rejected(self, page):
        self._force(page, "{t:TVS,a:30,b:20,sym:'triangle'}")
        page.fill("#ans", "50"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" not in page.locator("#fb").get_attribute("class"), "50 is wrong for 30−20"

    def test_queen_mixes_in_unknown(self, page):
        """Queen (mx) mixes the unknown type into its curated pool."""
        page.evaluate("setMode('mx')")
        page.wait_for_function("mode==='mx' && problems.length>0", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        n = page.evaluate("[...problems].filter(p=>p.t===TVA||p.t===TVS).length")
        assert n >= 1, f"Queen pool must include the ⃝-unknown type, got {n}"

    # ── TWO-unknown variant: BOTH operands are shapes (symA + sym) ──
    def test_two_unknown_renders_both_operands_as_shapes(self, page):
        """△=7 ○=5, then △+○=___: BOTH equation operands are shapes carrying their
        values (7,5), with a small definition row (△=7 ○=5) above; 7+5=12."""
        self._force(page, "{t:TVA,a:7,b:5,sym:'circle',symA:'triangle'}")
        nums = page.evaluate(
            "[...document.querySelectorAll('#eq .vone-sym')].map(s=>+s.getAttribute('data-num'))")
        assert nums == [7, 5], f"both equation operands must be shapes carrying 7 and 5, got {nums}"
        assert page.evaluate("!!document.querySelector('#eq .vone-defs')"), \
            "a definition row (△=7 ○=5) must show above the equation"
        assert page.evaluate("document.querySelectorAll('#eq .vone-defs svg').length") == 2, \
            "the def row shows BOTH shapes (small)"
        assert page.evaluate("report[0].correct") == 12, "7 + 5 must be 12"

    def test_two_unknown_both_shapes_hoverable(self, page):
        """On hover EACH shape shows its objects — the first plain (=7, no split),
        the second with the make-ten split (=5 → 3|2, since 7+5 crosses 10)."""
        self._force(page, "{t:TVA,a:7,b:5,sym:'circle',symA:'triangle'}")
        page.evaluate(
            "document.querySelectorAll('#eq .vone-sym')[0].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))")
        page.wait_for_function(
            "document.getElementById('num-tt').style.display==='block'", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('#num-tt .ntt-part').length") == 0, \
            "first shape (=7) shows a plain count, no make-ten split"
        page.evaluate(
            "document.querySelectorAll('#eq .vone-sym')[1].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))")
        page.wait_for_function(
            "[...document.querySelectorAll('#num-tt .ntt-part')].map(p=>p.textContent).join(',')==='3,2'",
            timeout=TIMEOUT)

    def test_two_unknown_scores_and_appears_in_pools(self, page):
        """A two-unknown subtraction answers correctly (□−○: 14−6=8), and the
        variant (a problem carrying symA) appears in BOTH Queen and the bridges."""
        self._force(page, "{t:TVS,a:14,b:6,sym:'circle',symA:'square'}")
        page.fill("#ans", "8"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" in page.locator("#fb").get_attribute("class"), "14 − 6 = 8 is correct"
        page.evaluate("setMode('mx')")
        page.wait_for_function("mode==='mx' && problems.length>0", timeout=TIMEOUT)
        mx = page.evaluate("(()=>{for(var k=0;k<20;k++){if(makeMxPool().some(p=>p.symA))return true;}return false;})()")
        assert mx, "Queen must include the TWO-unknown variant (a problem with symA)"
        page.evaluate("setMode('br')")
        page.wait_for_function("problems.length>0", timeout=TIMEOUT)
        br = page.evaluate("(()=>{for(var k=0;k<8;k++){if(makeBridgePool().some(p=>p.symA))return true;}return false;})()")
        assert br, "the bridges must weave in the TWO-unknown variant (symA)"

    def test_bridges_weave_in_three_unknown(self, page):
        """The three-unknown sum (TRA, __+__+__ = R) is woven into bridge-10 AND
        bridge-20 as well (≈ once per set)."""
        page.evaluate("setMode('br')")
        page.wait_for_function("problems.length>0", timeout=TIMEOUT)
        br = page.evaluate("(()=>{for(var k=0;k<8;k++){if(makeBridgePool().some(p=>p.t===TRA))return true;}return false;})()")
        assert br, "bridge-10 must weave in the three-unknown (TRA)"
        page.evaluate("setMode('b20')")
        page.wait_for_function("problems.length>0", timeout=TIMEOUT)
        b20 = page.evaluate("(()=>{for(var k=0;k<8;k++){if(makeBridge20Pool().some(p=>p.t===TRA))return true;}return false;})()")
        assert b20, "bridge-20 must weave in the three-unknown (TRA)"

    def test_two_unknown_shapes_differ_when_values_differ(self, page):
        """Two unknowns with DIFFERENT values must be DIFFERENT shapes (a shape
        can't stand for two values); equal values may share one. Sampled across
        var_one Queen pools AND the sprinkled bridges."""
        page.evaluate("setMode('mx')")
        page.wait_for_function("window.EXERCISES && EXERCISES.types.var_one", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{let bad=[],checked=0;
          const scan=p=>{if((p.t===TVA||p.t===TVS)&&p.symA){checked++;
            if(p.sym===p.symA&&p.a!==p.b)bad.push([p.a,p.b,p.sym]);}};
          for(let k=0;k<200;k++)EXERCISES.types.var_one.make('mx').forEach(scan);
          for(let k=0;k<80;k++)makeBridgePool().concat(makeBridge20Pool()).forEach(scan);
          return {checked,badCount:bad.length,sample:bad.slice(0,3)};})()""")
        assert res["checked"] > 50, f"expected many two-unknowns sampled, got {res['checked']}"
        assert res["badCount"] == 0, f"same shape with different values found: {res['sample']}"

    def test_tri_unknown_result_shows_complete_to_ten(self, page):
        """__+__+__ = 15: the RESULT carries data-split '10,5' so hovering it
        shows the ten-and-ones bond (complete-to-ten)."""
        page.evaluate("mode='mx'; problems=[{t:TRA,r:15}]; idx=0; loadProblem();")
        page.wait_for_selector("#ans1", timeout=TIMEOUT)
        split = page.evaluate(
            """(()=>{const r=document.querySelector('#eq .eq-n[data-num="15"]');
               return r?r.getAttribute('data-split'):null;})()""")
        assert split == "10,5", f"TRA result 15 must split 10,5 on hover, got {split}"


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
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCA, a: 17, b: 15}; idx = 0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)

    def test_hundreds_exercise_in_queen_and_superman(self, page):
        """Whole-hundreds addition (TH): appears in BOTH Queen (mx) and Superman
        (sup) pools; operands are whole hundreds + (hundreds|tens), sum ≤ 900;
        200 + 60 = 260 is accepted and a 3-digit answer fits."""
        page.evaluate("setMode('mx')")
        page.wait_for_function(
            "window.EXERCISES && typeof EXERCISES.types.hundreds === 'object'", timeout=TIMEOUT)
        stats = page.evaluate("""(()=>{
          let mx=false,bad=null;
          for(let k=0;k<40;k++){if(makeMxPool().some(p=>p.t===TH))mx=true;}
          for(let k=0;k<200;k++){EXERCISES.types.hundreds.make('mx').forEach(p=>{
            if(p.t!==TH||p.a%100!==0||p.b%10!==0||p.a+p.b>900)bad={a:p.a,b:p.b};});}
          return {mx,bad};})()""")
        assert stats["mx"], "Queen (mx) must include the hundreds type"
        assert stats["bad"] is None, f"invalid hundreds problem: {stats['bad']}"
        # sup pool includes it too
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "window.EXERCISES && typeof EXERCISES.types.hundreds === 'object'", timeout=TIMEOUT)
        sup = page.evaluate("(()=>{let s=false;for(let k=0;k<40;k++){if(makePool('sup').some(p=>p.t===TH))s=true;}return s;})()")
        assert sup, "Superman (sup) must include the hundreds type"
        # render + solve 200 + 60 = 260
        page.evaluate("mode='mx'; problems=[{t:TH,a:200,b:60}]; idx=0; report=[]; done=false; loadProblem();")
        page.wait_for_selector("#ans", timeout=TIMEOUT)
        assert page.evaluate("report[0].correct") == 260, "200 + 60 must be 260"
        page.fill("#ans", "260"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" in page.locator("#fb").get_attribute("class"), "260 is correct for 200+60"

    def test_hundreds_number_line_after_mistake(self, page):
        """The hundreds number line (revealed after a mistake) starts at the
        FIRST operand and steps by 10 (hundreds+tens) or 100 (hundreds+hundreds),
        with ≤10 ticks so the 3-digit labels fit; the sum sits on the line."""
        page.evaluate("setMode('mx')")
        page.wait_for_function("window.EXERCISES && EXERCISES.types.hundreds", timeout=TIMEOUT)
        def line_for(a, b, wrong):
            page.evaluate(f"mode='mx';problems=[{{t:TH,a:{a},b:{b}}}];idx=0;report=[];done=false;loadProblem();")
            page.wait_for_selector("#ans", timeout=TIMEOUT); page.wait_for_timeout(120)
            assert page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
                "hundreds number line must be hidden before the first mistake"
            page.fill("#ans", str(wrong)); page.click("#chk-btn"); page.wait_for_timeout(400)
            return page.evaluate("[...document.querySelectorAll('#nl-bar .nl-num')].map(n=>+n.textContent)")
        tens = line_for(200, 50, 210)     # hundreds + tens → step 10 from 200
        assert tens[0] == 200 and len(tens) >= 2 and tens[1] - tens[0] == 10 and len(tens) <= 10, \
            f"200+50 line must start at 200, step 10, ≤10 ticks: {tens}"
        assert 250 in tens, f"the sum 250 must sit on the 200+50 line: {tens}"
        hund = line_for(300, 300, 500)    # hundreds + hundreds → step 100 from 300
        assert hund[0] == 300 and len(hund) >= 2 and hund[1] - hund[0] == 100 and len(hund) <= 10, \
            f"300+300 line must start at 300, step 100, ≤10 ticks: {hund}"
        assert 600 in hund, f"the sum 600 must sit on the 300+300 line: {hund}"

    def test_hundreds_space_steps_forward(self, page):
        """In the hundreds (addition) exercise, SPACE hops the number line
        FORWARD (right) — it previously defaulted backward."""
        page.evaluate("setMode('mx')")
        page.wait_for_function("window.EXERCISES && EXERCISES.types.hundreds", timeout=TIMEOUT)
        page.evaluate("mode='mx';problems=[{t:TH,a:200,b:50}];idx=0;report=[];done=false;loadProblem();")
        page.wait_for_selector("#ans", timeout=TIMEOUT); page.wait_for_timeout(120)
        # a wrong answer reveals the line (and pops the sad modal — wait it out,
        # since space is intentionally owned by the modal while it shows)
        page.fill("#ans", "999"); page.click("#chk-btn")
        page.wait_for_function(
            "(()=>{const s=document.getElementById('sad-ov');return !s||getComputedStyle(s).display==='none';})()",
            timeout=TIMEOUT)
        page.wait_for_timeout(150)
        page.evaluate("document.getElementById('ans') && document.getElementById('ans').blur()")
        before = page.evaluate("parseFloat(document.getElementById('nl-dot').style.left)||0")
        page.keyboard.press(" ")
        page.wait_for_function(
            f"(parseFloat(document.getElementById('nl-dot').style.left)||0) > {before} + 2",
            timeout=TIMEOUT)   # rider moved RIGHT (forward)

    def test_column_shows_one_line_intro_then_reveals(self, page):
        """Column add/sub first show the ORIGINAL one-line equation + a
        "show in column" button; the board (and its inputs) appears only after
        the child taps it. Runs with the auto-reveal test hook OFF."""
        page.evaluate("window.__colxAutoReveal = false")
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.column_add === 'object' && "
            "typeof EXERCISES.types.column_sub === 'object'", timeout=TIMEOUT)
        # ── addition: 47 + 38 ──
        page.evaluate("problems[0] = {t: TCA, a: 47, b: 38}; idx = 0; loadProblem()")
        page.wait_for_selector(".colx-intro", timeout=TIMEOUT)
        assert "47" in page.inner_text(".colx-intro-eq") and "+" in page.inner_text(".colx-intro-eq")
        assert page.query_selector("#colx-iU") is None, "board must be hidden before reveal"
        page.click("#colx-showcol")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        assert page.query_selector(".colx-intro") is None, "intro must be gone after reveal"
        # ── subtraction: 52 − 37 ──
        page.evaluate("problems[0] = {t: TCS, a: 52, b: 37}; idx = 0; loadProblem()")
        page.wait_for_selector(".colxs-intro", timeout=TIMEOUT)
        assert "52" in page.inner_text(".colxs-intro-eq")
        assert page.query_selector("#colx-iU") is None
        page.click("#colxs-showcol")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)

    def test_every_mode_builds_correct_pool_size(self, page):
        """Each mode's recipe produces its expected session length."""
        expected = {"5": 12, "10": 12, "20": 12, "'br'": 25, "'b20'": 15,
                    "'mx'": 20, "'sup'": 20, "'big'": 12}
        for arg, size in expected.items():
            page.evaluate(f"setMode({arg})")
            page.wait_for_function(f"problems.length === {size}", timeout=TIMEOUT)

    def test_big_step_mixed_into_mx_and_sup(self, page):
        """The big-number ± step type (TBG) is woven into the Queen and Superman
        pools."""
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


# ─────────────────────────────────────────────────────────
# Superman — the column-addition exercise module
# ─────────────────────────────────────────────────────────

class TestSupermanColumnAdd:
    def _enter_sup(self, page, a=17, b=15):
        # the sup pool mixes column-add with big ±1/2 and coin-multiplication
        # problems, so wait for the pool to build, then force a TCA problem
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate(
            f"problems[0] = {{t: TCA, a: {a}, b: {b}}}; idx = 0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        page.wait_for_timeout(250)

    def test_sup_pool_reaches_99(self, page):
        """Column addition now reaches up to 99: BOTH operands are two-digit and
        the sum stays ≤99 (the result's tens digit is still one digit, never a
        double carry). a∈[13,86], b∈[10, 99−a (≤86)], result ≤ 99."""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.column_add === 'object'", timeout=TIMEOUT)
        stats = page.evaluate("""(() => {
            let maxA = 0, minA = 99, maxSum = 0, sawAbove70 = false, bad = null;
            for (let k = 0; k < 80; k++) {
                const ps = EXERCISES.types.column_add.make('sup');
                if (ps.length !== 3) bad = {reason: 'len', len: ps.length};
                for (const p of ps) {
                    if (p.t !== TCA) bad = {reason: 't', p};
                    if (p.a < 13 || p.a > 86 || p.b < 10 || p.b > 86) bad = {reason: 'range', p};
                    if (p.a + p.b > 99) bad = {reason: 'sum', p};
                    if (Math.floor((p.a + p.b) / 10) > 9) bad = {reason: 'tens', p};
                    maxA = Math.max(maxA, p.a); minA = Math.min(minA, p.a);
                    maxSum = Math.max(maxSum, p.a + p.b);
                    if (p.a + p.b > 70) sawAbove70 = true;
                }
            }
            return {maxA, minA, maxSum, sawAbove70, bad};
        })()""")
        assert stats["bad"] is None, f"invalid column-add problem generated: {stats['bad']}"
        assert stats["minA"] >= 13, f"a fell below 13: {stats}"
        assert stats["maxSum"] <= 99, f"result must not exceed 99: {stats}"
        assert stats["sawAbove70"], \
            "the raised ceiling must produce results above 70 (two-digit + two-digit)"

    def test_sup_nl_hidden_until_mistake(self, page):
        """Try-first like Queen: the skinned NL is HIDDEN on load (with the
        'נסי לבד' message) and appears only after the FIRST mistake — then its
        numbers render and the ± buttons enable."""
        self._enter_sup(page)
        assert page.evaluate(
            "document.getElementById('nl-panel').style.display") == "none", \
            "NL must be hidden before any mistake (try-first gate)"
        assert page.evaluate("!!document.getElementById('tf-msg')"), \
            "the try-first 'נסי לבד' message shows while the aid is gated"
        assert page.evaluate("tryFirst") == 0
        # a committed wrong units answer reveals the line (7+5=12, so 13 is wrong)
        page.fill("#colx-iU", "13"); page.keyboard.press("Enter")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        assert page.evaluate(
            "document.getElementById('nl-panel').style.display") != "none", \
            "NL must be revealed after the first mistake"
        assert page.evaluate("!document.getElementById('tf-msg')"), \
            "the try-first message clears once the aid is revealed"
        assert page.evaluate("!document.getElementById('nl-btn-plus').disabled")
        nums = page.evaluate(
            "[...document.querySelectorAll('#nl-panel .nl-num')].map(n=>+n.textContent)")
        assert len(nums) >= 1, "the revealed number line renders its numbers"

    def test_sup_nl_numbers_visible_after_mistake_from_locked_mode(self, page):
        """Entering Superman from a normal mode (whose fresh problem leaves
        `tf-locked-nl` on <body>), the column is GATED on load (try-first). The
        first mistake must reveal the line with its NUMBERS visible (not CSS-hidden
        by a stale lock) and the ± buttons enabled — no page refresh needed."""
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TS, a: 8, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(120)
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCA, a: 13, b: 18}; idx = 0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        page.wait_for_timeout(250)
        assert page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
            "Superman column gates the aid on load (try-first)"
        # first mistake reveals the line (3+8=11 → 9 is wrong)
        page.fill("#colx-iU", "9"); page.keyboard.press("Enter")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        page.wait_for_timeout(150)
        assert not page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
            "the lock clears once the aid is revealed"
        visible = page.evaluate("""
            [...document.querySelectorAll('#nl-panel .nl-num')]
              .filter(n => getComputedStyle(n).visibility !== 'hidden').length
        """)
        assert visible >= 1, \
            "number-line numbers must be VISIBLE after the reveal (not CSS-hidden)"
        assert page.evaluate("!document.getElementById('nl-btn-plus').disabled"), \
            "± buttons must be enabled after the reveal"

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

    def test_sup_arrow_keys_gated_then_move_rider(self, page):
        """The left/right arrows are INERT while the aid is gated (hidden), and
        move the rider once the FIRST mistake reveals it — even while a column
        digit box (type='text') holds focus."""
        self._enter_sup(page, 13, 18)
        assert page.evaluate("tryFirst") == 0
        page.focus("#colx-iU")
        base = page.evaluate("parseFloat(document.getElementById('nl-dot').style.left)||0")
        page.keyboard.press("ArrowRight"); page.wait_for_timeout(150)
        assert (page.evaluate("parseFloat(document.getElementById('nl-dot').style.left)||0")) == base, \
            "arrows must be inert while the aid is gated (hidden)"
        # reveal the line via a mistake (3+8=11 → 9 is wrong)
        page.fill("#colx-iU", "9"); page.keyboard.press("Enter")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        page.wait_for_timeout(200)
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

    def test_sup_space_advances_number_line_after_mistake(self, page):
        """Once the FIRST mistake reveals the line, pressing SPACE hops the rider
        forward (add direction) — even while a digit box is focused — and is NOT
        typed in. (While gated, the hidden line ignores it.)"""
        self._enter_sup(page, 17, 15)
        # reveal the line via a mistake (7+5=12 → 13 is wrong), then wait past the
        # 1s input-reset so the units box is clear and refocused
        page.fill("#colx-iU", "13"); page.keyboard.press("Enter")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        page.wait_for_timeout(1200)
        page.evaluate("NL.init(0)")          # known baseline at 0%
        page.wait_for_timeout(300)
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

    def test_sup_carry_shows_plus10_cue(self, page):
        """47+38: units 15 ≥ 10 → a GREEN +10 cue pops above the tens AND a RED
        −10 cue by the units (mirrors the column-subtraction −10/+10 borrow)."""
        self._enter_sup(page, 47, 38)
        page.fill("#colx-iU", "15")
        page.keyboard.press("Enter")
        page.wait_for_selector(".colx-plus10.show", timeout=TIMEOUT)
        assert page.locator(".colx-plus10").inner_text().strip() == "+10"
        page.wait_for_selector(".colx-minus10.show", timeout=TIMEOUT)
        assert page.locator(".colx-minus10").inner_text().strip() in ("−10", "-10")

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
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
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
# Column subtraction — חִסּוּר בְּטוּר (TCS / column_sub.ex.js)
# ─────────────────────────────────────────────────────────

class TestColumnSubtraction:
    def _enter_sub(self, page, a=25, b=17):
        # column subtraction now lives inside Superman — build that pool, then
        # force a TCS problem so the column UI mounts.
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate(
            f"problems[0] = {{t: TCS, a: {a}, b: {b}}}; idx = 0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        page.wait_for_timeout(250)

    def test_column_sub_loads_on_demand(self, page):
        """Entering Superman injects exercises/column_sub.ex.js and mounts it into
        #colx-root (the pool mixes several types, so force a TCS problem to
        guarantee the column UI mounts)."""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.column_sub === 'object'", timeout=TIMEOUT)
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCS, a: 25, b: 17}; idx = 0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        assert page.evaluate("ptype === TCS")

    def test_sup_column_sub_range_valid(self, page):
        """Superman's column subtraction (make('sup')) yields 6 valid problems:
        BOTH operands two-digit, minuend up to 98 (a∈[23,98], b∈[11,a), a>b);
        BOTH with-borrow and no-borrow occur, and the minuends reach the high
        two-digits — the ceiling was raised to "up to 99" as the child progressed."""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.column_sub === 'object'", timeout=TIMEOUT)
        stats = page.evaluate("""(() => {
            let maxA=0, minA=99, sawBorrow=false, sawNoBorrow=false,
                sawHigh=false, bad=null;
            for (let k=0; k<80; k++) {
                const ps = EXERCISES.types.column_sub.make('sup');
                if (ps.length !== 6) bad = {reason:'len', len:ps.length};
                for (const p of ps) {
                    if (p.t !== TCS) bad = {reason:'t', p};
                    if (p.a < 23 || p.a > 98 || p.b < 11 || p.b >= p.a) bad = {reason:'range', p};
                    if (p.a <= p.b) bad = {reason:'order', p};
                    const noBorrow = (p.a % 10) > (p.b % 10);
                    if ((p.a % 10) < (p.b % 10)) sawBorrow = true;
                    if (noBorrow) sawNoBorrow = true;
                    if (p.a >= 70) sawHigh = true;
                    maxA = Math.max(maxA, p.a); minA = Math.min(minA, p.a);
                }
            }
            return {maxA, minA, sawBorrow, sawNoBorrow, sawHigh, bad};
        })()""")
        assert stats["bad"] is None, f"invalid column-sub problem: {stats['bad']}"
        assert stats["minA"] >= 23, f"a fell below 23: {stats}"
        assert stats["maxA"] <= 98, f"a must stay ≤98: {stats}"
        assert stats["sawBorrow"], "with-borrow problems must occur"
        assert stats["sawNoBorrow"], "no-borrow problems must occur"
        assert stats["sawHigh"], \
            "minuends must reach the high two-digits (e.g. 87-23), up to 98"

    def test_sub_no_borrow_flow_solves_and_scores(self, page):
        """27-13 (no borrow): units 7-3=4 → tens 2-1=1 → solved, full 15 points."""
        self._enter_sub(page, 27, 13)
        page.fill("#colx-iU", "4")
        page.keyboard.press("Enter")
        page.wait_for_function(
            "!document.getElementById('colx-iT').disabled", timeout=TIMEOUT)
        page.fill("#colx-iT", "1")
        page.keyboard.press("Enter")
        page.wait_for_function("score === 15", timeout=TIMEOUT)
        assert page.evaluate("report[0].gotCorrect") is True

    def test_sub_borrow_flow_solves_and_scores(self, page):
        """25-17 (borrow): units need a ten → 15-7=8, the ¹ borrow mark appears
        and the top tens is struck → tens (2-1)-1=0 → solved, full 15 points."""
        self._enter_sub(page, 25, 17)
        page.fill("#colx-iU", "8")
        page.keyboard.press("Enter")
        # the borrow plays: the ¹ on the units appears and the tens is struck
        page.wait_for_function(
            "document.getElementById('colx-borrow').textContent === '1'",
            timeout=TIMEOUT)
        assert page.evaluate(
            "document.getElementById('colx-aT').classList.contains('struck')")
        page.wait_for_function(
            "!document.getElementById('colx-iT').disabled", timeout=TIMEOUT)
        page.fill("#colx-iT", "0")
        page.keyboard.press("Enter")
        page.wait_for_function("score === 15", timeout=TIMEOUT)
        assert page.evaluate("report[0].gotCorrect") is True

    def test_sub_borrow_tens_mistake_rings_decremented_value(self, page):
        """A tens mistake AFTER a borrow also rings (red) the DECREMENTED tens
        value shown above the struck digit — so she subtracts THAT number, not
        the crossed-out one. The tens hint then draws 3 circles (struck top
        digit, its decremented value above it, bottom tens) instead of 2."""
        self._enter_sub(page, 25, 17)
        page.fill("#colx-iU", "8")              # correct units → the borrow plays
        page.keyboard.press("Enter")
        page.wait_for_function(
            "document.getElementById('colx-borrow').textContent === '1'",
            timeout=TIMEOUT)
        page.wait_for_function(
            "!document.getElementById('colx-iT').disabled", timeout=TIMEOUT)
        page.fill("#colx-iT", "5")              # wrong: (2-1)-1 = 0
        page.keyboard.press("Enter")
        page.wait_for_function(
            "document.getElementById('colx-iT').classList.contains('ans-err')",
            timeout=TIMEOUT)
        assert page.evaluate(
            "document.getElementById('colx-bnew').classList.contains('show')"), \
            "the decremented tens value must be visible to be ringed"
        ells = page.evaluate(
            "document.getElementById('colx-svg').querySelectorAll('ellipse').length")
        assert ells == 3, \
            f"borrow tens-mistake must ring 3 circles (incl. the decremented value), got {ells}"

    def test_sub_units_hover_shows_make_ten_split(self, page):
        """In column subtraction WITH a borrow, hovering the BOTTOM number's units
        digit shows the subtract-through-ten split: bU = aU (brings the borrowed
        teen down to 10) on the LEFT + (bU−aU) (the rest, from 10) on the RIGHT.
        e.g. 15−7 → the 7 shows 5|2; 25−16 → the 6 shows 5|1. The bonded whole is
        the bottom units itself."""
        for a, b in [(15, 7), (25, 16)]:
            aU, bU = a % 10, b % 10
            left, right = aU, bU - aU
            self._enter_sub(page, a, b)
            page.evaluate(
                "document.getElementById('colx-bU')"
                ".dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}))")
            # wait for the bond to render the EXACT parts (robust vs a stale tooltip)
            page.wait_for_function(
                "(() => {const g=document.querySelector('#num-tt .ntt-grid');"
                "if(!g||!g.classList.contains('ntt-split'))return false;"
                "const ps=[...document.querySelectorAll('#num-tt .ntt-part')]"
                ".map(x=>x.textContent);"
                f"return ps.length===2 && ps[0]==='{left}' && ps[1]==='{right}';}})()",
                timeout=TIMEOUT)
            whole = page.evaluate(
                "(document.querySelector('#num-tt .ntt-whole')||{}).textContent")
            assert whole == str(bU), \
                f"{a}-{b}: the bonded whole must be the bottom units {bU}, got {whole}"
            page.evaluate("_nttHide()")          # clear the tooltip before the next problem

    def test_sub_tap_to_borrow(self, page):
        """Tapping the top tens digit performs the borrow (sends a ten down):
        the digit is struck and the units gain the ¹ borrow mark."""
        self._enter_sub(page, 23, 8)
        page.click("#colx-aT")
        page.wait_for_function(
            "document.getElementById('colx-borrow').textContent === '1'",
            timeout=TIMEOUT)
        assert page.evaluate(
            "document.getElementById('colx-aT').classList.contains('struck')")

    def test_sub_borrow_shows_minus10_and_plus10_cues(self, page):
        """The borrow briefly shows a RED −10 badge by the tens (it loses ten) and
        a GREEN +10 badge by the units (it gains ten) — the conservation made
        visible."""
        self._enter_sub(page, 82, 37)
        page.click("#colx-aT")                   # trigger the borrow
        page.wait_for_function(
            "document.querySelector('.colxs-plus10') && "
            "document.querySelector('.colxs-plus10').classList.contains('show')", timeout=TIMEOUT)
        info = page.evaluate("""(() => {
            const m=document.querySelector('.colxs-minus10'), p=document.querySelector('.colxs-plus10');
            const aT=document.getElementById('colx-aT').getBoundingClientRect();
            const aU=document.getElementById('colx-aU').getBoundingClientRect();
            const cx=e=>{const r=e.getBoundingClientRect();return r.left+r.width/2;};
            return {mTxt:m.textContent, pTxt:p.textContent,
                    mColor:getComputedStyle(m).backgroundColor, pColor:getComputedStyle(p).backgroundColor,
                    mShown:m.classList.contains('show'),
                    mLeftOfTens: cx(m) < aT.left+aT.width/2,
                    pRightOfUnits: cx(p) > aU.left+aU.width/2};})()""")
        assert info["mShown"] and info["mTxt"] in ("−10", "-10") and info["pTxt"] == "+10", info
        assert info["mColor"] == "rgb(229, 57, 53)", f"−10 must be red, got {info['mColor']}"
        assert info["pColor"] == "rgb(34, 165, 74)", f"+10 must be green, got {info['pColor']}"
        assert info["mLeftOfTens"], "the −10 sits by the tens (its left)"
        assert info["pRightOfUnits"], "the +10 sits by the units (its right)"

    def test_sub_wrong_units_penalized(self, page):
        """A committed wrong units answer is a real mistake (penalty+report)."""
        self._enter_sub(page, 25, 17)
        page.fill("#colx-iU", "5")          # wrong: 25-17 units is 8 (after borrow)
        page.keyboard.press("Enter")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("report[0].wrongs.length") == 1
        assert page.evaluate(
            "document.getElementById('colx-iU').classList.contains('ans-err')")

    def test_sub_units_mistake_reduces_final_score(self, page):
        """END-TO-END: a wrong units digit penalises the exercise even when the
        columns are ultimately completed correctly — the solved exercise then
        awards only 67% (round(15*.67)=10), not 15. Uses a no-borrow problem
        (28-13) for deterministic timing."""
        self._enter_sub(page, 28, 13)        # modePts()=15 → 67% == 10
        assert page.evaluate("score") == 0 and page.evaluate("tryFirst") == 0
        page.fill("#colx-iU", "4")           # wrong (8-3=5)
        page.keyboard.press("Enter")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        page.fill("#colx-iU", "5")           # correct units
        page.keyboard.press("Enter")
        page.wait_for_function(
            "!document.getElementById('colx-iT').disabled", timeout=TIMEOUT)
        page.fill("#colx-iT", "1")           # tens 2-1=1
        page.keyboard.press("Enter")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 10, \
            f"a units mistake must drop the solved award to 67% (10), got {page.evaluate('score')}"

    def test_sub_units_mistake_rings_digits(self, page):
        """After the borrow, a wrong units answer RINGS the two units digits in
        red (like column addition) instead of playing a teaching animation. The
        old elaborate animations (regroup demo / mistake finger) are removed."""
        self._enter_sub(page, 25, 17)
        page.click("#colx-aT")                   # borrow → top units becomes 15
        page.wait_for_function(
            "document.getElementById('colx-borrow').textContent === '1'", timeout=TIMEOUT)
        page.fill("#colx-iU", "3")               # wrong (15-7=8)
        page.keyboard.press("Enter")
        page.wait_for_function(
            "document.getElementById('colx-svg').querySelectorAll('ellipse').length === 2",
            timeout=TIMEOUT)
        # both rings sit on the UNITS side, and the top-units ring fully ENCLOSES
        # the borrowed ¹ (it must not slice through it)
        geo = page.evaluate(
            "(() => {const pw=document.getElementById('colx-pw').getBoundingClientRect();"
            "const C=id=>{const r=document.getElementById(id).getBoundingClientRect();"
            "return {x:r.left-pw.left+r.width/2,left:r.left-pw.left,top:r.top-pw.top,"
            "right:r.right-pw.left,bot:r.bottom-pw.top};};"
            "const aU=C('colx-aU'),aT=C('colx-aT'),o=C('colx-borrow');"
            "const es=[...document.getElementById('colx-svg').querySelectorAll('ellipse')]"
            ".map(e=>({cx:+e.getAttribute('cx'),cy:+e.getAttribute('cy'),"
            "rx:+e.getAttribute('rx'),ry:+e.getAttribute('ry')}));"
            "let ring=null,best=1e9;es.forEach(e=>{const d=Math.hypot(e.cx-aU.x,e.cy-(aU.top+aU.bot)/2);"
            "if(d<best){best=d;ring=e;}});"
            "const inside=(px,py)=>((px-ring.cx)*(px-ring.cx))/(ring.rx*ring.rx)+"
            "((py-ring.cy)*(py-ring.cy))/(ring.ry*ring.ry)<=1;"
            "const cn=[[o.left,o.top],[o.right,o.top],[o.left,o.bot],[o.right,o.bot]];"
            "return {esCx:es.map(e=>Math.round(e.cx)),ux:Math.round(aU.x),"
            "tx:Math.round(aT.x),oneInside:cn.every(c=>inside(c[0],c[1]))};})()")
        mid = (geo["ux"] + geo["tx"]) / 2
        assert all(x > mid for x in geo["esCx"]), \
            f"both rings must sit on the units side (units≈{geo['ux']}, tens≈{geo['tx']}), got {geo['esCx']}"
        assert geo["oneInside"], "the top-units ring must fully enclose the borrowed ¹"
        page.wait_for_timeout(1800)              # past the OLD ~1.55s animation trigger
        assert page.locator(".colxs-onedot").count() == 0, "regroup demo must be gone"
        assert page.locator(".colxs-finger").count() == 0, "mistake finger guide must be gone"

    def test_sub_auto_units_mistake_no_animation(self, page):
        """AUTO borrow mode: after the borrow auto-plays, a wrong units answer
        rings the digits — the removed '10 bursts into ten ones' demo never plays."""
        page.evaluate("localStorage.setItem('subBorrow','auto')")
        self._enter_sub(page, 25, 17)
        page.wait_for_function(                  # the auto-borrow completes
            "document.getElementById('colx-borrow').textContent === '1'", timeout=TIMEOUT)
        page.fill("#colx-iU", "3")               # wrong
        page.keyboard.press("Enter")
        page.wait_for_function(
            "document.getElementById('colx-svg').querySelectorAll('ellipse').length === 2",
            timeout=TIMEOUT)
        page.wait_for_timeout(1800)
        assert page.locator(".colxs-onedot").count() == 0, \
            "the removed regroup demo must not play"

    def test_mx_includes_noborrow_column_sub(self, page):
        """The Queen (mx) weaves in column-subtraction problems that NEVER need a
        borrow: every TCS in mx has top units strictly greater than bottom units,
        a > b, and operands ≤ 20. At least one appears every session."""
        seen_any = False
        for _ in range(6):
            page.evaluate("setMode('mx'); restart()")
            page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
            tcs = page.evaluate(
                "[...problems].filter(p => p.t === TCS).map(p => ({a:p.a, b:p.b}))")
            assert len(tcs) >= 1, "mx must contain ≥1 column-subtraction problem"
            for p in tcs:
                assert p["a"] > p["b"], f"mx column-sub must be positive: {p}"
                assert (p["a"] % 10) > (p["b"] % 10), \
                    f"mx column-sub must be NO-borrow (top units > bottom units): {p}"
                assert p["a"] <= 20 and p["b"] <= 20, f"mx operands must stay ≤20: {p}"
                seen_any = True
        assert seen_any

    def test_sup_includes_noborrow_column_sub(self, page):
        """Superman weaves in column subtraction (alongside column-add / big-step
        / coin-multiply). Every session has ≥1 NO-borrow one (top units > bottom
        units); both operands are two-digit and the minuend reaches up to 98
        (raised to "up to 99" as the child progressed). All stay positive (a > b)."""
        seen_noborrow = False
        for _ in range(6):
            page.evaluate("setMode('sup'); restart()")
            page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
            tcs = page.evaluate(
                "[...problems].filter(p => p.t === TCS).map(p => ({a:p.a, b:p.b}))")
            assert len(tcs) >= 1, "Superman must contain ≥1 column-subtraction problem"
            for p in tcs:
                assert p["a"] > p["b"], f"sup column-sub must be positive: {p}"
                if (p["a"] % 10) > (p["b"] % 10):           # a NO-borrow one
                    seen_noborrow = True
                    assert 23 <= p["a"] <= 98 and 11 <= p["b"] < p["a"], \
                        f"no-borrow sup operands must be two-digit, up to 98 (a∈[23,98], b∈[11,a)): {p}"
        assert seen_noborrow, "Superman must weave in ≥1 NO-borrow column subtraction"

    def test_sup_includes_borrow_column_sub(self, page):
        """Superman ALSO weaves in a WITH-borrow column subtraction (top units <
        bottom units → regrouping needed) every session — taught alongside the
        no-borrow one. Two-digit operands, minuend up to 98 (proper two-digit borrow)."""
        seen_borrow = False
        for _ in range(6):
            page.evaluate("setMode('sup'); restart()")
            page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
            tcs = page.evaluate(
                "[...problems].filter(p => p.t === TCS).map(p => ({a:p.a, b:p.b}))")
            for p in tcs:
                assert p["a"] > p["b"], f"sup column-sub must be positive: {p}"
                if (p["a"] % 10) < (p["b"] % 10):           # needs a borrow
                    seen_borrow = True
        assert seen_borrow, "Superman must weave in ≥1 WITH-borrow column subtraction"

    def test_sub_module_cleanup_on_mode_exit(self, page):
        """Leaving Column-subtraction removes the column DOM and restores the
        check button."""
        self._enter_sub(page)
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.wait_for_timeout(200)
        assert page.locator("#colx-root").count() == 0
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display") != "none"

    def test_sub_borrow_setting_persists(self, page):
        """The borrow-method preference (settings toggle) persists and reads
        back; the default is the hybrid (tap) method, and the toggle exists."""
        assert page.evaluate("subBorrowMode()") == "hybrid"
        assert page.locator("#borrow-toggle").count() == 1
        page.evaluate("setSubBorrowMode('auto')")
        assert page.evaluate("subBorrowMode()") == "auto"
        assert page.evaluate("localStorage.getItem('subBorrow')") == "auto"
        page.evaluate("setSubBorrowMode('hybrid')")
        assert page.evaluate("subBorrowMode()") == "hybrid"

    def test_sub_auto_borrow_mode(self, page):
        """In 'automatic' borrow mode the regrouping plays itself — WITHOUT any
        tap: a forced borrow problem (25-17) auto-shows the ¹ borrow mark and
        strikes the top tens, then completes to a full 15-point solve."""
        page.evaluate("localStorage.setItem('subBorrow','auto')")
        self._enter_sub(page, 25, 17)
        # no click — the borrow animates on its own
        page.wait_for_function(
            "document.getElementById('colx-borrow').textContent === '1'",
            timeout=TIMEOUT)
        assert page.evaluate(
            "document.getElementById('colx-aT').classList.contains('struck')")
        page.fill("#colx-iU", "8")
        page.keyboard.press("Enter")
        page.wait_for_function(
            "!document.getElementById('colx-iT').disabled", timeout=TIMEOUT)
        page.fill("#colx-iT", "0")
        page.keyboard.press("Enter")
        page.wait_for_function("score === 15", timeout=TIMEOUT)


# ─────────────────────────────────────────────────────────
# Coin-multiplication — רֵאשִׁית הַכֶּפֶל (TCM / coin_mul.ex.js, mixed into Superman)
# ─────────────────────────────────────────────────────────

class TestCoinMul:
    def _enter_cm(self, page, target=20):
        # coin_mul rides the Superman pool, so build it then force a TCM problem
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate(f"problems[0] = {{t: TCM, a: {target}}}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def test_coin_mul_in_sup_pool(self, page):
        """coin_mul.make('sup') yields 3 TCM problems — ONE of EACH coin value
        (₪2/₪5/₪10), each carrying b = the coin value and a valid target for that
        coin: ₪2→{4..20}, ₪5→{10,15,20,25,30,35}, ₪10→{20..90}, with a/b ∈
        {2..10}. Every Superman session weaves coin-multiplication in."""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.coin_mul === 'object'", timeout=TIMEOUT)
        res = page.evaluate("""(() => {
            const T={2:[4,6,8,10,12,14,16,18,20], 5:[10,15,20,25,30,35], 10:[20,30,40,50,60,70,80,90]};
            let saw={2:false,5:false,10:false}, bad=null;
            for (let k = 0; k < 40; k++) {
                const ps = EXERCISES.types.coin_mul.make('sup');
                if (ps.length !== 3) bad = {reason:'len', len: ps.length};
                if (ps.map(p => p.b).sort((a,b)=>a-b).join(',') !== '2,5,10')
                    bad = {reason:'coins', got: ps.map(p=>p.b)};
                for (const p of ps) {
                    if (p.t !== TCM) bad = {reason:'t', p};
                    if (!T[p.b] || !T[p.b].includes(p.a)) bad = {reason:'target', p};
                    const need = p.a / p.b;
                    if (need < 2 || need > 10 || need !== Math.round(need)) bad = {reason:'need', p};
                    if (saw[p.b] !== undefined) saw[p.b] = true;
                }
            }
            return {saw, bad};
        })()""")
        assert res["bad"] is None, f"invalid coin_mul problem: {res['bad']}"
        assert res["saw"]["2"] and res["saw"]["5"] and res["saw"]["10"], \
            f"each coin value (₪2/₪5/₪10) must appear every session: {res['saw']}"
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        assert page.evaluate("[...problems].some(p => p.t === TCM)"), \
            "the Superman session must contain coin-multiplication problems"

    def test_coin_mul_two_coin_variant(self, page):
        """A ₪2 problem (6 → 3 coins of ₪2): the answer is a/b = 3 (not a/5), the
        title shows the ₪2 coin, and entering 3 solves it."""
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCM, a: 6, b: 2}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        assert page.evaluate("report[0].correct") == 3, "6 ÷ ₪2 must be 3 coins (not 6/5)"
        assert page.evaluate(
            "((document.querySelector('.colm-titlecoin .coin-lbl')||{}).textContent||'')"
            ".includes('2')"), "the title must show the ₪2 coin"
        page.fill("#colm-ans", "3")
        page.click("#colm-chk")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)

    def test_coin_mul_ten_coin_variant(self, page):
        """A ₪10 problem (90 → 9 coins): the answer is a/b = 9, the title shows the
        ₪10 coin, ＋ stays enabled at 9 (cap need+3, so the answer is never given
        away), and entering 9 solves it."""
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCM, a: 90, b: 10}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        assert page.evaluate("report[0].correct") == 9, "90 ÷ ₪10 must be 9 coins"
        assert page.evaluate(
            "((document.querySelector('.colm-titlecoin .coin-lbl')||{}).textContent||'')"
            ".includes('10')"), "the title must show the ₪10 coin"
        for _ in range(9):
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 9
        assert page.evaluate("document.getElementById('colm-add').disabled") is False, \
            "＋ must stay enabled at the answer count (cap is need+3)"
        page.fill("#colm-ans", "9")
        page.click("#colm-chk")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)

    def test_coin_mul_loads_and_mounts(self, page):
        """Forcing a TCM problem mounts the coin tray + ＋ control; starts empty."""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.coin_mul === 'object'", timeout=TIMEOUT)
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCM, a: 20}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        assert page.evaluate("ptype === TCM")
        assert page.locator("#colm-ans").count() == 1
        assert page.locator(".colm-coin").count() == 0
        # the silver real ₪5 coin is used (from the coin-counting exercise)
        assert page.evaluate("typeof tcCoinSVG === 'function'"), \
            "coins.ex.js must load in sup so the real coin art is available"

    def test_coin_mul_empty_box_hidden_but_space_reserved(self, page):
        """The empty coin box is invisible (no blank square) — class colm-tray-blank
        — but its space is RESERVED, so adding the first coin does not push the ＋
        button down. The box appears (blank class removed) once a coin is in, and
        hides again when emptied."""
        self._enter_cm(page, 15)
        blank = "document.getElementById('colm-tray').classList.contains('colm-tray-blank')"
        add_top = "Math.round(document.getElementById('colm-add').getBoundingClientRect().top)"
        assert page.evaluate(blank) is True, "empty tray must be visually blank (box hidden)"
        top_empty = page.evaluate(add_top)
        page.click("#colm-add")
        assert page.evaluate(blank) is False, "the box appears once a coin is added"
        assert page.evaluate(add_top) == top_empty, \
            "the ＋ button must NOT shift down when the first coin is added"
        page.click("#colm-rem")
        assert page.evaluate(blank) is True, "emptying the tray hides the box again"

    def test_coin_mul_check_button_left_and_no_caption(self, page):
        """The ✓ confirm button sits to the LEFT of the answer input, and the old
        'press + to add a coin' caption is gone."""
        self._enter_cm(page, 15)
        assert page.locator(".colm-ctl-cap").count() == 0, "the +-caption must be removed"
        sides = page.evaluate(
            "(() => {const c=document.getElementById('colm-chk').getBoundingClientRect();"
            "const a=document.getElementById('colm-ans').getBoundingClientRect();"
            "return {chk:Math.round(c.left), ans:Math.round(a.left)};})()")
        assert sides["chk"] < sides["ans"], \
            f"✓ must be LEFT of the input, got chk={sides['chk']}, ans={sides['ans']}"

    def test_coin_mul_add_past_answer_no_reveal(self, page):
        """＋ must NOT disable at the answer — that would reveal it. For target 20
        (answer 4) the child can keep adding past 4; ＋ caps only at a generous
        bound (need+3 = 7). No total row."""
        self._enter_cm(page, 20)
        for _ in range(4):                       # reach the answer count
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 4
        assert page.evaluate("document.getElementById('colm-add').disabled") is False, \
            "＋ must stay enabled at the answer (disabling would reveal it)"
        for _ in range(3):                       # keep adding PAST the answer
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 7
        assert page.evaluate("document.getElementById('colm-add').disabled") is True, \
            "＋ caps only at the generous bound (need+3)"
        assert page.locator("#colm-sum").count() == 0   # no running-total row

    def test_coin_mul_space_adds_a_coin(self, page):
        """Pressing SPACE drops a coin in the coin-counting exercise too (no double-fire)."""
        self._enter_cm(page, 20)
        for _ in range(3):
            page.keyboard.press("Space")
        page.wait_for_timeout(50)
        assert page.locator(".colm-coin").count() == 3, \
            "each SPACE press must add exactly one coin"

    def test_coin_mul_minus_removes_coin(self, page):
        """The large minus button removes the last coin and re-enables ＋ at the cap."""
        self._enter_cm(page, 20)
        for _ in range(7):                       # fill to the cap (need+3)
            page.click("#colm-add")
        assert page.evaluate("document.getElementById('colm-add').disabled") is True
        page.click("#colm-rem")
        assert page.locator(".colm-coin").count() == 6
        assert page.evaluate("document.getElementById('colm-add').disabled") is False

    def test_coin_mul_correct_count_solves(self, page):
        """20 with 5-coins → 4 coins. Filling the tray and entering the COUNT (4)
        solves for full Superman points (15)."""
        self._enter_cm(page, 20)
        before = page.evaluate("score")
        for _ in range(4):
            page.click("#colm-add")
        page.fill("#colm-ans", "4")
        page.click("#colm-chk")
        page.wait_for_function(f"score === {before + 15}", timeout=TIMEOUT)
        assert page.evaluate("report[0].gotCorrect") is True

    def test_coin_mul_answer_is_count_not_value(self, page):
        """The answer is the COUNT of coins, not the total value: for target 15
        the correct answer is 3 (3×5); entering 15 (the value) is rejected."""
        self._enter_cm(page, 15)
        for _ in range(3):
            page.click("#colm-add")
        page.fill("#colm-ans", "15")          # the VALUE — wrong
        page.click("#colm-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("report[0].wrongs.length") == 1
        page.fill("#colm-ans", "3")           # the COUNT — correct
        page.click("#colm-chk")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)


# ─────────────────────────────────────────────────────────
# Bagel cost — כַּמָּה עוֹלִים x בֵּיגַלֶה (TBC / bagel_cost.ex.js, mixed into Superman)
# ─────────────────────────────────────────────────────────

class TestBagelCost:
    def _enter_bagel(self, page, bagels=4):
        # bagel_cost rides the Superman pool, so build it then force a TBC problem
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate(f"problems[0] = {{t: TBC, a: {bagels}, b: 5}}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def test_bagel_cost_in_sup_pool(self, page):
        """bagel_cost.make('sup') yields 3 TBC problems with DISTINCT bagel counts
        from {2,3,4,6,7,8} — up to 8, SKIPPING 5 (5 bagels × ₪5 confuses count=price)
        — each carrying b=5 (price per bagel); Superman includes them. Max total 40."""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.bagel_cost === 'object'", timeout=TIMEOUT)
        res = page.evaluate("""(() => {
            let bad = null;
            for (let k = 0; k < 40 && !bad; k++) {
                const ps = EXERCISES.types.bagel_cost.make('sup');
                if (ps.length !== 3) { bad = {reason:'len', len: ps.length}; break; }
                if (new Set(ps.map(p => p.a)).size !== 3) { bad = {reason:'dup', a: ps.map(p=>p.a)}; break; }
                for (const p of ps) {
                    if (p.t !== TBC) { bad = {reason:'t', p}; break; }
                    if (p.b !== 5) { bad = {reason:'price', p}; break; }
                    if (![2,3,4,6,7,8].includes(p.a)) { bad = {reason:'range', p}; break; }  // 2..8, never 5
                }
            }
            return { bad };
        })()""")
        assert res["bad"] is None, f"invalid bagel_cost problem: {res['bad']}"
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        assert page.evaluate("[...problems].some(p => p.t === TBC)"), \
            "the Superman session must contain bagel-cost problems"

    def test_bagel_cost_loads_and_mounts(self, page):
        """Forcing a TBC problem mounts the coin tray + ＋ control; starts empty,
        states the bagel count, and shows the ₪5 price coin."""
        self._enter_bagel(page, 4)
        assert page.evaluate("ptype === TBC")
        assert page.locator("#colm-ans").count() == 1
        assert page.locator(".colm-coin").count() == 0
        assert "4" in page.eval_on_selector(".colm-q", "el => el.textContent")
        assert page.locator(".colm-sub .colm-titlecoin").count() == 1   # the ₪5 price coin

    def test_bagel_cost_answer_is_the_total_not_the_count(self, page):
        """4 bagels × ₪5 = 20: the answer is the TOTAL (20), not the count (4)."""
        self._enter_bagel(page, 4)
        assert page.evaluate("report[0].correct") == 20, "4 bagels × 5 must total 20"
        page.fill("#colm-ans", "4")           # the COUNT — wrong
        page.click("#colm-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("report[0].wrongs.length") == 1
        page.fill("#colm-ans", "20")          # the TOTAL — correct
        page.click("#colm-chk")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)

    def test_bagel_cost_plus_allows_overshoot_past_answer(self, page):
        """＋ must NOT disable at the correct count (4) — that would reveal the
        answer; it stays enabled and caps only at the generous bound (bagels+3 = 7),
        exactly like the coin-counting exercise."""
        self._enter_bagel(page, 4)
        for _ in range(4):
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 4
        assert page.evaluate("document.getElementById('colm-add').disabled") is False, \
            "＋ must stay enabled at the answer count (no reveal)"
        for _ in range(3):                       # keep adding PAST the answer
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 7
        assert page.evaluate("document.getElementById('colm-add').disabled") is True, \
            "＋ caps only at the generous bound (bagels+3 = 7)"

    def test_bagel_question_shows_icon_after_number(self, page):
        """The question reads 'כמה עולים <x> 🥨' — the number sits to the RIGHT of
        the bagel icon (correct RTL order, number before icon)."""
        self._enter_bagel(page, 4)
        res = page.evaluate("""(() => {
            const q = document.querySelector('.colm-q');
            const num = q.querySelector('b'), emo = q.querySelector('.bagc-emoji');
            return { numLeft: num.getBoundingClientRect().left,
                     emoLeft: emo.getBoundingClientRect().left }; })()""")
        assert res["numLeft"] > res["emoLeft"], \
            f"number must sit RIGHT of the icon (RTL 'x 🥨'): {res}"

    def test_bagel_space_adds_a_coin(self, page):
        """Pressing SPACE drops a ₪5 coin — the same as tapping ＋ (no double-fire)."""
        self._enter_bagel(page, 4)
        for _ in range(3):
            page.keyboard.press("Space")
        page.wait_for_timeout(50)
        assert page.locator(".colm-coin").count() == 3, \
            "each SPACE press must add exactly one coin"

    def test_bagel_cost_minus_removes_coin(self, page):
        """The large minus button removes the last coin and re-enables ＋ at the cap."""
        self._enter_bagel(page, 4)
        for _ in range(7):                # fill to the cap (bagels+3 = 7)
            page.click("#colm-add")
        assert page.evaluate("document.getElementById('colm-add').disabled") is True
        page.click("#colm-rem")
        assert page.locator(".colm-coin").count() == 6
        assert page.evaluate("document.getElementById('colm-add').disabled") is False

    def test_bagel_cost_correct_total_solves(self, page):
        """Filling the tray (a coin per bagel) and entering the TOTAL solves it
        and awards the Superman 15 points. 6 bagels × 5 = 30."""
        self._enter_bagel(page, 6)
        before = page.evaluate("score")
        for _ in range(6):
            page.click("#colm-add")
        page.fill("#colm-ans", "30")
        page.click("#colm-chk")
        page.wait_for_function(f"score === {before + 15}", timeout=TIMEOUT)
        assert page.evaluate("report[0].gotCorrect === true")


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
        assert page.evaluate("problems.length === 20")

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
        for m in ("br", "b20", "mx", "sup"):
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

    def test_history_records_prize_won_and_detail_rows(self, page):
        """A completed set logs whether the PRIZE was won + the per-exercise rows."""
        self._record(page, "sup", 18, 18, "מַיָּה")     # perfect Superman → wins the 🎁 (goal 825)
        e = page.evaluate("_loadHistory()[0]")
        assert e["won"] is True, "a perfect prize-game set must record won=true"
        assert isinstance(e["rows"], list) and len(e["rows"]) == 18, \
            "the per-exercise detail rows must be stored in the history entry"
        self._record(page, "sup", 3, 18)               # low score → no prize
        assert page.evaluate("_loadHistory()[0].won") is False, \
            "a low score on a prize game must record won=false"

    def test_history_renders_gift_icon_and_expandable_detail(self, page):
        """The history tab shows 🎁 for a won set and, on tapping a row, its
        exercises + answers (the same rows as the end-of-set summary)."""
        page.evaluate("""() => {
            localStorage.setItem('scoreHistory', JSON.stringify([{
                name:'מַיָּה', mode:'sup', game:'סוּפֶּרְמֶן 🦸', grade:1000, won:true,
                rows:[{eq:'15 − 7 = 8',  ok:true,  wrongs:[],   correct:8,  skipped:false},
                      {eq:'24 + 13 = 37', ok:false, wrongs:[36], correct:37, skipped:false}],
                ts: 1700000000000
            }]));
            renderHistory();
        }""")
        # 🎁 shows next to the grade for a won set
        assert "🎁" in page.eval_on_selector("#history-body .hist-grade", "el => el.textContent")
        # the detail rows (exercises + answers) are in the DOM, hidden until the row is tapped
        assert page.locator("#history-body .hist-detail .rep-row").count() == 2
        assert page.eval_on_selector("#hist-detail-0", "el => el.style.display") == "none"
        page.evaluate("toggleHistDetail(0)")
        assert page.eval_on_selector("#hist-detail-0", "el => el.style.display") == "block"
        # a correct row shows ✓; the mistaken row shows its wrong value + the correction
        assert page.locator("#history-body .hist-detail .rep-check").count() == 1
        assert page.locator("#history-body .hist-detail .rep-wrong-val").count() >= 1
        assert page.locator("#history-body .hist-detail .rep-correct").count() == 1


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
