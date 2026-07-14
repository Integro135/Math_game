"""Session-wide pytest fixtures + the live/summary reporting plugin.

Auto-loaded by pytest; provides the `page` / `browser_instance` fixtures and
the SUBTRACTION GAME test-results report.  Constants come from helpers.py.
"""
import os
import time
import pytest
from playwright.sync_api import sync_playwright
from helpers import GAME_URL, CHROME_EXE, TIMEOUT


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
    # Headless by DEFAULT (no window). A visible Chrome opens ONLY when HEADED
    # is explicitly one of 1/true/yes/on — so a leftover `HEADED=0` / empty /
    # garbage in the shell can never surprise you with a white window.
    headed  = os.environ.get("HEADED", "").strip().lower() in ("1", "true", "yes", "on")
    slow_mo = int(os.environ.get("SLOW_MO", "0") or "0")
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
