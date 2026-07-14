import pytest
from helpers import *



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

    def test_tap_or_click_dismisses_immediately(self, page):
        """A tap/click anywhere skips the celebration AT ONCE (mobile/tablet parity
        with the desktop Enter/Space skip) and advances to the next problem. A real
        touch fires the same document `pointerdown`, so this also covers mobile."""
        page.evaluate("setMode(10)")
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TA, a: 2, b: 3}; idx = 0; loadProblem()")
        page.wait_for_timeout(150)
        page.evaluate("""
            SUCCESS.styles.length = 0;
            SUCCESS.styles.push({name:'__probe', supportsSuper:true, show(){ return () => {}; }});
            fwCount = 0;
        """)
        page.fill("#ans", "5")
        page.click("#chk-btn")
        page.wait_for_function("_fwOn === true", timeout=TIMEOUT)
        before_idx = page.evaluate("idx")
        page.mouse.click(200, 360)                       # a tap on the celebration
        # must close WELL before the ~2700ms auto-timer — proving the tap did it
        page.wait_for_function("_fwOn === false", timeout=1500)
        assert page.evaluate("idx") == before_idx + 1, \
            "the tap must advance to the next problem, like the desktop click"
