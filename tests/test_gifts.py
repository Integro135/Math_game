import pytest
from helpers import *



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
        """GIFT_GOALS holds numeric thresholds for the reward modes only. By
        default ONLY Superman (sup=800) and אַלּוּפָה (mulc=600) carry a prize;
        every other game (b20/mx/br + the basic 0/5/10/20/big) has no threshold
        → never a gift."""
        goals = page.evaluate("GIFT_GOALS")
        assert goals.get("sup") == 800, f"Superman prize must be 800, got {goals.get('sup')}"
        assert goals.get("mulc") == 600, f"אַלּוּפָה prize must be 600, got {goals.get('mulc')}"
        for m in ("b20", "mx", "br", "0", "5", "10", "20", "big"):
            assert goals.get(m) is None, f"mode {m} must NOT have a gift threshold"

    def test_gift_screen_is_special_not_in_rotation(self, page):
        """The gift screen lives under SUCCESS.special.gift (its own subfolder),
        NOT in the per-answer SUCCESS.styles rotation."""
        self._gift_loaded(page)
        assert page.evaluate("typeof SUCCESS.special.gift.show === 'function'")
        in_rotation = page.evaluate(
            "(SUCCESS.styles||[]).some(s => /gift/i.test(s.name||''))")
        assert not in_rotation, "the gift screen must not be in the answer rotation"

    def test_gift_shown_when_grade_clears_threshold(self, page):
        """sup threshold is cleared (perfect set → grade 1000 ≥ 800): the end
        screen shows 🎁 and the special gift celebration plays."""
        self._gift_loaded(page)
        self._force_end(page, "sup", correct=15, total=15)
        assert page.evaluate("calcGrade() >= GIFT_GOALS['sup']")
        assert page.evaluate("!!document.querySelector('.end-gift')"), \
            "end screen must show the 🎁 badge when the gift is earned"
        # endGame schedules showGiftScreen after ~450ms
        page.wait_for_function(
            "typeof _giftOn !== 'undefined' && _giftOn === true", timeout=TIMEOUT)
        assert page.evaluate("!!_giftRoot"), "the gift celebration overlay must mount"

    def test_no_gift_when_grade_below_threshold(self, page):
        """sup, grade below 800 (too many wrong): no 🎁, no gift screen."""
        self._gift_loaded(page)
        self._force_end(page, "sup", correct=5, total=15)   # grade ≈ 333 < 800
        assert page.evaluate("calcGrade() < GIFT_GOALS['sup']")
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
        """Out of the box only Superman (sup=800) and אַלּוּפָה (mulc=600) carry a
        prize; every other game (b20/mx/br + the basic ones) has none."""
        goals = page.evaluate("GIFT_GOALS")
        assert goals.get("sup") == 800 and goals.get("mulc") == 600
        for m in ("b20", "mx", "br", "0", "5", "10", "20"):
            assert goals.get(m) is None, f"game {m} must start with no prize"

    def test_badge_shows_only_when_prize_set(self, page):
        """The 🎁 badge on a game button tracks whether it has a prize."""
        # sup has a default prize → badge present; mode 20 has none → no badge
        assert page.evaluate("document.getElementById('lbsup').textContent").find("🎁") >= 0
        assert "🎁" not in page.evaluate("document.getElementById('lb20').textContent")
        page.evaluate("setGiftGoal(20, 500)")
        page.evaluate("setGiftGoal('sup', 0)")
        assert "🎁" in page.evaluate("document.getElementById('lb20').textContent"), \
            "setting a prize must add the 🎁 badge"
        assert "🎁" not in page.evaluate("document.getElementById('lbsup').textContent"), \
            "clearing a prize (0) must remove the 🎁 badge"

    def test_zero_clears_prize_from_goals(self, page):
        """A 0/empty level removes the game from GIFT_GOALS (no prize)."""
        page.evaluate("setGiftGoal('sup', 0)")
        assert page.evaluate("GIFT_GOALS['sup'] == null"), "0 must clear the prize"
        page.evaluate("setGiftGoal('sup', 850)")
        assert page.evaluate("GIFT_GOALS['sup']") == 850

    def test_prize_level_persists_across_reload(self, page):
        """A changed prize level survives a page reload (localStorage)."""
        page.evaluate("setGiftGoal('sup', 0); setGiftGoal(20, 600)")
        page.reload()
        page.wait_for_function("typeof GIFT_GOALS !== 'undefined'", timeout=TIMEOUT)
        assert page.evaluate("GIFT_GOALS['sup'] == null"), "cleared prize must persist"
        assert page.evaluate("GIFT_GOALS[20]") == 600, "set prize must persist"

    def test_cleared_prize_gives_no_gift_screen(self, page):
        """With Superman's prize cleared, a perfect sup run awards NO gift."""
        page.wait_for_function(
            "window.SUCCESS && SUCCESS.special && SUCCESS.special.gift", timeout=TIMEOUT)
        page.evaluate("setGiftGoal('sup', 0)")
        page.evaluate("""
            mode = 'sup';
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
