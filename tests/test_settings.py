import pytest
from helpers import *



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
