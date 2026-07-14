import pytest
from helpers import *



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

    def test_tri_unknown_rejects_zero_without_penalty(self, page):
        """x+x+x=20 (TRA): a triple with a 0 in any box (e.g. 0+0+20) SUMS right but
        isn't real practice — it's accepted-as-correct-but-refused: the child is
        told it's right and asked for a DIFFERENT triple. No penalty (tryFirst/score
        unchanged), boxes cleared; a real triple (5+7+8=20) is then accepted for
        full points. Mirrors the TDS 'no lazy shortcut' rule."""
        page.evaluate("mode='mx'; score=0; problems=[{t:TRA,r:20}]; idx=0; loadProblem()")
        page.wait_for_selector("#ans1", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        zero = page.evaluate("""(() => {
            document.getElementById('ans1').value='0';
            document.getElementById('ans2').value='0';
            document.getElementById('ans3').value='20'; checkAns();
            return {done:done, tryFirst:tryFirst, score:score,
                    fbErr:document.getElementById('fb').className.includes('fb-err'),
                    cleared:document.getElementById('ans1').value===''};})()""")
        assert zero["done"] is False, f"a triple with a 0 must not be accepted: {zero}"
        assert zero["tryFirst"] == 0 and zero["score"] == 0, f"no penalty for the zero try: {zero}"
        assert zero["fbErr"] and zero["cleared"], f"'correct but give another' feedback + boxes cleared: {zero}"
        # a real triple with NO zero is then accepted for FULL points
        real = page.evaluate("""(() => {
            document.getElementById('ans1').value='5';
            document.getElementById('ans2').value='7';
            document.getElementById('ans3').value='8'; checkAns();
            return {done:done, score:score, got:(report[0]||{}).gotCorrect||false};})()""")
        assert real["done"] is True and real["got"] is True and real["score"] > 0, \
            f"a real triple (5+7+8=20) must be accepted for points: {real}"

    def test_tri_unknown_hover_shows_splits(self, page):
        """x+x+x=20 (TRA): after typing a number in an addend box, HOVERING it shows
        that number's possible splits (number-bonds) as emoji clusters — e.g. 9 →
        1+8, 2+7, 3+6, 4+5. Nothing shows for an empty box."""
        page.evaluate("mode='mx'; problems=[{t:TRA,r:20}]; idx=0; done=false; report=[]; loadProblem()")
        page.wait_for_selector("#ans2", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        # empty box → no tooltip on hover
        page.mouse.move(5, 5)
        page.hover("#ans2"); page.wait_for_timeout(120)
        assert page.evaluate("getComputedStyle(document.getElementById('num-tt')).display") == "none", \
            "an empty addend box must not pop the splits tooltip"
        # type 9, LEAVE the box, then hover again so mouseenter re-fires → splits fan
        page.fill("#ans2", "9")
        page.mouse.move(5, 5); page.wait_for_timeout(80)
        page.hover("#ans2"); page.wait_for_timeout(150)
        assert page.evaluate("getComputedStyle(document.getElementById('num-tt')).display") == "block", \
            "hovering a filled addend box must show the tooltip"
        assert page.evaluate("!!document.querySelector('#num-tt .ntt-grid.ntt-splitlist')"), \
            "the tooltip must use the splits-fan layout"
        parts = page.evaluate("[...document.querySelectorAll('#num-tt .ntt-splitrow')]"
                              ".map(r=>[...r.querySelectorAll('.ntt-part')].map(p=>p.textContent).join('+'))")
        assert parts == ["1+8", "2+7", "3+6", "4+5"], f"9 must split into its four bonds, got {parts}"
        # each split part is drawn with emoji/object clusters
        assert page.evaluate("document.querySelectorAll('#num-tt .ntt-splitrow .ntt-objs').length") == 8, \
            "each of the 4 rows shows two object clusters (the two parts)"
        # moving away hides it
        page.mouse.move(5, 5); page.wait_for_timeout(120)
        assert page.evaluate("getComputedStyle(document.getElementById('num-tt')).display") == "none", \
            "the splits tooltip hides when the pointer leaves the box"

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
