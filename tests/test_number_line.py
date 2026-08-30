import pytest
from helpers import *



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

    def test_bridge20_line_extends_past_the_answer(self, page):
        """גָּשֵׁר 20: a bridging addition reaching 25 (19+6) must NOT sit on the
        number line's right EDGE — that gives the answer away. The line has to run
        PAST it, like the framed windows in the other exercises. Regression: the
        line was a fixed 0..24, and additions' sums weren't counted at all, so a
        24/25 answer landed on (or past) the edge."""
        page.evaluate("aidMode='kang'; mode='b20'; problems=[{t:TA,a:19,b:6}]; idx=0; loadProblem()")
        page.wait_for_timeout(150)
        page.evaluate("tryFirst=1; if(typeof _unlockAids==='function')_unlockAids();")
        page.wait_for_timeout(100)
        nums = page.evaluate("[...document.querySelectorAll('#nl-bar .nl-num')].map(e=>+e.textContent)")
        assert nums, "the number line must render ticks"
        assert 25 in nums, f"the answer 25 must be ON the line, got {nums[0]}..{nums[-1]}"
        assert nums[-1] > 25, f"the line must extend PAST the answer, not end at it (ends {nums[-1]})"
        # a subtraction whose minuend reaches 25 (25−9) likewise must not end at 25
        page.evaluate("aidMode='kang'; mode='b20'; problems=[{t:TS,a:25,b:9}]; idx=0; loadProblem()")
        page.wait_for_timeout(120)
        page.evaluate("tryFirst=1; if(typeof _unlockAids==='function')_unlockAids();")
        page.wait_for_timeout(100)
        nums2 = page.evaluate("[...document.querySelectorAll('#nl-bar .nl-num')].map(e=>+e.textContent)")
        assert nums2 and 25 in nums2 and nums2[-1] > 25, \
            f"25−9: minuend 25 must be on the line and not the edge (ends {nums2[-1] if nums2 else None})"

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
