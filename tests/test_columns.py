import pytest
from helpers import *



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
