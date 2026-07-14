import pytest
from helpers import *



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
