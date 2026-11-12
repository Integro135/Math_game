"""The part–whole board (תַּבְנִית שָׁלֵם–חֵלֶק + פַּסִּים וְעִגּוּלִים) — the bridge games'
third aid (aids/part_whole.js, driven by aids.js PW, aidMode 'pw') — and the
equation cards it was built for (a + __ = c, TMA; c − __ = a, TM) woven into
גֶּשֶׁר 10. After the workbook page on equations (6 + __ = 14):
  * the TEMPLATE — the whole on top, two parts below; every box judges itself
    (green / red), the matching exercise is written underneath;
  * the DRAWING — bars of 5 and circles of 1, tapped to colour the given part.
Plus the standalone tester page (part_whole_dev.html) that shows all of it.
"""
import re
from pathlib import Path
import pytest
from helpers import *

ROOT = Path(r"c:\Code\subtraction_game")
DEV_URL = (ROOT / "part_whole_dev.html").as_uri()


def _force(page, mode, prob_js):
    """Enter `mode` and put ONE forced card in the first slot."""
    enter_mode(page, mode)
    page.wait_for_selector("#ans, #ans1", timeout=TIMEOUT)
    page.evaluate(f"problems[0] = {prob_js}; idx = 0; loadProblem()")
    page.wait_for_timeout(200)


def _reveal(page):
    """One wrong answer reveals the aids; wait out the sad modal so clicks land."""
    reveal_aids(page)
    page.wait_for_timeout(1800)


def _open_board(page):
    _reveal(page)
    page.evaluate("toggleAidMode('pw')")
    page.wait_for_function(
        "window.PART_WHOLE && !!document.querySelector('#pw-panel .pw-whole')", timeout=TIMEOUT)
    page.wait_for_timeout(150)


def _disp(page, el_id):
    return page.evaluate(f"document.getElementById('{el_id}').style.display")


def _cls(page, sel):
    return page.evaluate(f"document.querySelector(\"{sel}\").className")


def _state(page):
    return page.evaluate("PW.state()")


class TestEquationCard:
    """a + __ = c (TMA) is a plain engine type: rendered like TM, checked by #ans,
    scored like every bridge card, written into the report as the full fact."""

    def test_renders_and_checks_the_missing_addend(self, page):
        _force(page, 'br', "{t: TMA, a: 6, b: 14}")
        txt = page.evaluate("document.getElementById('eq').textContent.replace(/\\s+/g,'')")
        assert txt == "6+=14", f"the card reads 6 + __ = 14, got {txt!r}"
        assert page.locator("#ans").count() == 1
        before = page.evaluate("score")
        page.fill("#ans", "9"); page.evaluate("checkAns()")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("score") == before and not page.evaluate("done")
        page.wait_for_timeout(1700)
        page.fill("#ans", "8"); page.evaluate("checkAns()")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == before + 10, "second try in br: 67% of 15"
        assert page.evaluate("_reportRows()[0].eq") == "6 + 8 = 14"

    def test_kangaroo_parks_on_the_first_addend(self, page):
        """The line is sized to hold the whole (c + 2 in the bridges) and the rider
        starts ON a — she hops up to c and counts the hops."""
        _force(page, 'br', "{t: TMA, a: 9, b: 17}")
        _reveal(page)
        assert _disp(page, 'nl-panel') != 'none'
        # the line is never shorter than 0..20, plus the bridges' two spare steps → 0..22
        span = page.evaluate("document.querySelectorAll('#nl-bar .nl-num').length - 1")
        assert span == 22, f"0..22 line (max(20, 17) + 2), got 0..{span}"
        left = page.evaluate("parseFloat(document.getElementById('nl-dot').style.left)")
        assert abs(left - 9 / span * 100) < 0.5, f"rider parked on 9, got {left}%"


class TestBoardOffer:
    def test_board_takes_the_jars_place_in_the_bridges(self, page):
        """The games button (where the cookie jar is picked everywhere else) offers
        the BOARD in the bridges: two toggles, line + board (the template icon, 3
        boxes), on every bridge card the board can split; the other games keep
        line + jar (the box icon). A bridge chain card (g + __ + __) keeps the jar."""
        PW_ICONS = "[...document.querySelectorAll('#games-menu .gm-item svg.aid-ico')].filter(s=>s.querySelectorAll('rect').length===3).length"
        for mode, prob, want_pw in (('br', "{t: TA, a: 9, b: 6}", 1), ('b20', "{t: TS, a: 27, b: 9}", 1),
                                    ('br', "{t: TMA, a: 6, b: 14}", 1), ('br', "{t: TRA, r: 16, g: 5, a: 9, b: 7}", 0),
                                    (20, "{t: TA, a: 7, b: 8}", 0), ('mx', "{t: TS, a: 15, b: 6}", 0)):
            _force(page, mode, prob)
            _reveal(page)
            n = page.evaluate("buildGamesMenu(), document.querySelectorAll('#games-menu .gm-item svg.aid-ico').length")
            assert n == 2, f"{mode} {prob}: two aid toggles, got {n}"
            assert page.evaluate(PW_ICONS) == want_pw, f"{mode} {prob}: board toggle present={want_pw}"

    def test_hidden_until_the_first_mistake_then_toggled_in(self, page):
        _force(page, 'br', "{t: TMA, a: 6, b: 14}")
        assert _disp(page, 'pw-panel') == 'none', "the board is closed on a fresh card until chosen"
        _reveal(page)
        assert _disp(page, 'nl-panel') != 'none' and _disp(page, 'pw-panel') == 'none', \
            "the kangaroo line is still the default aid"
        page.evaluate("toggleAidMode('pw')")
        page.wait_for_function("!!document.querySelector('#pw-panel .pw-whole')", timeout=TIMEOUT)
        assert page.evaluate("aidMode") == 'pw'
        assert _disp(page, 'pw-panel') != 'none' and _disp(page, 'nl-panel') == 'none' \
            and _disp(page, 'chain-tools') == 'none', "the board replaces the line / the jar"
        assert page.locator("#pw-panel .pw-inp").count() == 3, "whole + two parts"
        assert page.locator("#pw-panel .pw-add-bar").count() == 1 and page.locator("#pw-panel .pw-add-dot").count() == 1
        hint = re.sub(r"[֑-ׇ]", "", page.inner_text("#hint"))   # drop the nikud
        assert "שלם" in hint and "פסים" in hint, f"the hint explains the board, got {hint!r}"
        # the games button carries the board's icon (the three-box template)
        assert page.evaluate("document.querySelectorAll('#games-drop-btn svg rect').length") == 3

    def test_dedicated_board_button_in_the_bridges(self, page):
        """A BOARD button (#pw-btn, the template icon) sits beside the aids-menu
        button on every bridge card the board can split, usable FROM THE FIRST
        MOMENT (no try-first gate): before any mistake a tap opens only the board
        (the line stays hidden) and it stays open on the next card; after a
        mistake a tap opens the board, a second tap returns to the line. Absent in
        the other games and on chain cards."""
        _force(page, 'br', "{t: TMA, a: 6, b: 14}")
        page.evaluate("problems[1] = {t: TS, a: 15, b: 9}")
        btn = page.locator("#pw-btn")
        assert btn.is_visible() and not page.evaluate("document.getElementById('pw-btn').disabled"), "usable on a fresh card"
        assert page.evaluate("document.querySelectorAll('#pw-btn svg rect').length") == 3
        btn.click()
        page.wait_for_function("!!document.querySelector('#pw-panel .pw-whole')", timeout=TIMEOUT)
        assert page.evaluate("tryFirst") == 0 and page.evaluate("aidMode") == 'pw'
        assert _disp(page, 'pw-panel') != 'none' and _disp(page, 'nl-panel') == 'none', "the board opens, the line stays locked"
        assert _state(page)["whole"] == 14
        page.evaluate("idx = 1; loadProblem()"); page.wait_for_timeout(300)
        assert page.evaluate("tryFirst") == 0 and _disp(page, 'pw-panel') != 'none' and _state(page)["whole"] == 15, \
            "the board stays open on the next fresh card, set to its numbers"
        btn.click()
        assert page.evaluate("aidMode") == 'kang' and _disp(page, 'pw-panel') == 'none' and _disp(page, 'nl-panel') == 'none', \
            "closing it before a mistake hides it without revealing the line"
        _reveal(page)
        assert _disp(page, 'nl-panel') != 'none'
        btn.click()
        page.wait_for_function("!!document.querySelector('#pw-panel .pw-whole')", timeout=TIMEOUT)
        assert page.evaluate("aidMode") == 'pw' and _disp(page, 'pw-panel') != 'none' and "on" in _cls(page, "#pw-btn").split()
        btn.click()
        assert page.evaluate("aidMode") == 'kang' and _disp(page, 'pw-panel') == 'none' and _disp(page, 'nl-panel') != 'none'
        assert "on" not in _cls(page, "#pw-btn").split()
        for mode, prob in ((20, "{t: TA, a: 7, b: 8}"), ('mx', "{t: TS, a: 15, b: 6}"), ('br', "{t: TRA, r: 16, g: 5, a: 9, b: 7}")):
            _force(page, mode, prob)
            assert not page.locator("#pw-btn").is_visible(), f"{mode} {prob}: no board button"

    def test_set_mode_returns_to_the_kangaroo(self, page):
        _force(page, 'br', "{t: TMA, a: 6, b: 14}")
        _open_board(page)
        enter_mode(page, 'b20')
        assert page.evaluate("aidMode") == 'kang'


class TestTemplate:
    def test_whole_and_parts_judge_themselves(self, page):
        """6 + __ = 14: the whole is 14, the parts 6 and 8. NOTHING is coloured
        while she types (live green gave the answer away) — the verdict shows on
        ENTER: a wrong number red, a prefix of a right one neutral, a right one
        green; a duplicate of a distinct part is the fault of the box typed LAST;
        the matching exercise (whole & part → subtraction) fills in. Typing again
        hides the verdict until the next Enter."""
        _force(page, 'br', "{t: TMA, a: 6, b: 14}")
        _open_board(page)
        st = _state(page)
        assert (st["whole"], st["parts"], st["missing"], st["given"]) == (14, [6, 8], 'part', 6)
        W, P0, P1 = "#pw-panel .pw-whole", "#pw-panel .pw-part[data-i='0']", "#pw-panel .pw-part[data-i='1']"
        def put(sel, v, enter=True):
            page.fill(sel, v)
            if enter: page.press(sel, "Enter")
        neutral = lambda sel: "pw-ok" not in _cls(page, sel) and "pw-err" not in _cls(page, sel)
        put(W, "14", enter=False)
        assert neutral(W) and _state(page)["match"] == "" and _state(page)["judged"]["w"] == "ok", \
            "the right whole, typed: judged, but NOT shown green"
        put(W, "6");  assert "pw-err" in _cls(page, W), "6 is a part, not the whole"
        put(W, "1", enter=False); assert neutral(W), "typing hides the verdict"
        page.press(W, "Enter"); assert neutral(W), "a prefix of 14 stays neutral"
        put(W, "14"); assert "pw-ok" in _cls(page, W)
        assert _state(page)["match"] == "14 − ___ = ___"
        put(P0, "6");  assert "pw-ok" in _cls(page, P0)
        assert _state(page)["match"] == "14 − 6 = ___"
        put(P1, "6");  assert "pw-err" in _cls(page, P1) and "pw-ok" in _cls(page, P0), "the duplicate is the later box"
        put(P1, "9");  assert "pw-err" in _cls(page, P1)
        put(P1, "8");  assert "pw-ok" in _cls(page, P1)
        st = _state(page)
        assert st["done"] and st["match"] == "14 − 6 = 8"
        assert "pw-done" in _cls(page, "#pw-panel .pw-tpl")

    def test_every_bridge_card_kind_splits_into_whole_and_parts(self, page):
        """Additions (plain and shape) miss the WHOLE; subtractions, the missing
        subtrahend and the missing addend miss a PART. Parts may be placed in
        either box; the matching exercise of an addition is written with +."""
        cases = [
            ('br',  "{t: TA, a: 9, b: 6}",                   15, [9, 6],  'whole'),
            ('br',  "{t: TVA, a: 9, b: 6, sym: 'circle'}",   15, [9, 6],  'whole'),
            ('br',  "{t: TS, a: 15, b: 9}",                  15, [9, 6],  'part'),
            ('br',  "{t: TVS, a: 15, b: 9, sym: 'triangle'}", 15, [9, 6], 'part'),
            ('br',  "{t: TM, a: 16, b: 7}",                  16, [7, 9],  'part'),
            ('b20', "{t: TS, a: 27, b: 9}",                  27, [9, 18], 'part'),
            ('b20', "{t: TMA, a: 18, b: 27}",                27, [18, 9], 'part'),
        ]
        for mode, prob, whole, parts, missing in cases:
            _force(page, mode, prob)
            _open_board(page)
            st = _state(page)
            assert (st["whole"], st["parts"], st["missing"]) == (whole, parts, missing), (prob, st)
            if missing == 'part':
                assert st["given"] == parts[0]
        # the last case is still up: an addition's matching exercise — parts in EITHER order
        _force(page, 'br', "{t: TA, a: 9, b: 6}")
        _open_board(page)
        page.fill("#pw-panel .pw-part[data-i='0']", "6")
        page.fill("#pw-panel .pw-part[data-i='1']", "9")
        page.press("#pw-panel .pw-part[data-i='1']", "Enter")   # the verdict shows on Enter
        assert all("pw-ok" in c for c in page.evaluate("[...document.querySelectorAll('#pw-panel .pw-part')].map(e=>e.className)"))
        assert _state(page)["match"] == "9 + 6 = ___"
        page.fill("#pw-panel .pw-whole", "15")
        page.press("#pw-panel .pw-whole", "Enter")
        assert _state(page)["match"] == "9 + 6 = 15" and _state(page)["done"]


class TestBarsAndCircles:
    @staticmethod
    def _unit_x(page, sel, k):
        """x (px, inside the bar button) at the middle of unit k (1..5)."""
        box = page.locator(sel).bounding_box()
        return box["width"] * (k - 0.5) / 5

    def test_draw_colour_undo_clear(self, page):
        """Bars count 5, circles 1; a tap on a circle colours it. A bar is FIVE
        units: hovering previews how many a click would colour (the units up to the
        pointer, the count in a bubble) and the click colours exactly those; a
        click on the last coloured unit uncolours it — so the exact number shows
        whatever bars she drew. Undo removes the LAST drawn item, clear empties the
        drawing; a total equal to the whole is ticked."""
        _force(page, 'br', "{t: TMA, a: 6, b: 14}")
        _open_board(page)
        for _ in range(2): page.click("#pw-panel .pw-add-bar")
        for _ in range(4): page.click("#pw-panel .pw-add-dot")
        st = _state(page)
        assert (st["bars"], st["dots"], st["total"], st["painted"]) == (2, 4, 14, 0)
        assert page.locator("#pw-panel .pw-bar").count() == 2 and page.locator("#pw-panel .pw-dot").count() == 4
        assert page.locator("#pw-panel .pw-bar >> nth=0 >> s").count() == 5, "a bar shows its five units"
        assert "pw-ok" not in _cls(page, "#pw-panel .pw-total-w") and page.inner_text("#pw-panel .pw-total-w").find("✓") < 0, \
            "14 drawn = the whole 14, yet NO tick / green — it would give the answer away"
        BAR = "#pw-panel .pw-bar >> nth=0"
        bar = page.locator(BAR)
        h = bar.bounding_box()["height"] / 2
        at = lambda k: {"x": self._unit_x(page, BAR, k), "y": h}
        # hover unit 3 → a preview of three units and the count bubble
        bar.hover(position=at(3))
        assert page.locator(BAR + " >> s.pre").count() == 3 and bar.get_attribute("data-pre") == "3"
        bar.click(position=at(3))
        assert _state(page)["painted"] == 3 and page.locator(BAR + " >> s.on").count() == 3, "the click colours up to the hovered unit"
        bar.click(position=at(5))
        assert _state(page)["painted"] == 5 and "full" in _cls(page, "#pw-panel .pw-bar")
        page.click("#pw-panel .pw-dot >> nth=0")
        assert _state(page)["painted"] == 6, "a full bar + one circle coloured = the given part"
        assert page.locator("#pw-panel .pw-item.on").count() == 2
        bar.hover(position=at(5))
        assert bar.get_attribute("data-pre") == "4" and page.locator(BAR + " >> s.dim").count() == 1, "the last coloured unit previews as going off"
        bar.click(position=at(5))
        assert _state(page)["painted"] == 5 and page.locator(BAR + " >> s.on").count() == 4, "clicking the last coloured unit uncolours it"
        bar.click(position=at(1)); bar.click(position=at(1))
        assert page.locator(BAR + " >> s.on").count() == 0, "unit 1 twice → the bar is clear"
        page.mouse.move(5, 5)
        assert page.locator("#pw-panel .pw-bar s.pre, #pw-panel .pw-bar s.dim").count() == 0 and bar.get_attribute("data-pre") is None, "no preview without a pointer"
        page.click("#pw-panel .pw-dot >> nth=0")
        assert _state(page)["painted"] == 0, "tap a circle again → uncoloured"
        # keyboard: Enter on a bar colours one more unit per press
        bar.focus(); page.keyboard.press("Enter")
        assert [i["on"] for i in _state(page)["items"]][0] == 1
        # six units of two bars read as 6 too — the exact number, whatever she drew
        page.locator(BAR).click(position=at(5))
        page.locator("#pw-panel .pw-bar >> nth=1").click(position=at(1))
        assert _state(page)["painted"] == 6 and [i["on"] for i in _state(page)["items"]][:2] == [5, 1]
        page.click("#pw-panel .pw-undo")
        st = _state(page)
        assert (st["dots"], st["total"]) == (3, 13)
        page.click("#pw-panel .pw-clear")
        st = _state(page)
        assert (st["bars"], st["dots"], st["total"], st["painted"]) == (0, 0, 0, 0)
        assert page.evaluate("document.querySelector('#pw-panel .pw-undo').disabled")

    def test_drawing_is_capped_at_thirty(self, page):
        _force(page, 'b20', "{t: TS, a: 27, b: 9}")
        _open_board(page)
        for _ in range(7): page.click("#pw-panel .pw-add-bar", force=True)
        assert _state(page)["total"] == 30
        assert page.evaluate("document.querySelector('#pw-panel .pw-add-bar').disabled")
        assert page.evaluate("document.querySelector('#pw-panel .pw-add-dot').disabled")


class TestBoardAcrossCards:
    def test_stays_the_chosen_aid_and_resets_per_card(self, page):
        """Once chosen, the board is the aid of every following card — open from the
        first moment (no try-first gate), emptied and set to the NEW card's whole
        and parts."""
        _force(page, 'br', "{t: TMA, a: 6, b: 14}")
        page.evaluate("problems[1] = {t: TS, a: 17, b: 9}")
        _open_board(page)
        page.fill("#pw-panel .pw-whole", "14"); page.click("#pw-panel .pw-add-bar")
        solve_one(page)
        assert page.evaluate("idx") == 1 and page.evaluate("aidMode") == 'pw'
        assert _disp(page, 'pw-panel') != 'none' and _disp(page, 'nl-panel') == 'none', \
            "fresh card → the chosen board stays open (no gate), the line stays locked"
        _reveal(page)
        assert _disp(page, 'pw-panel') != 'none' and _disp(page, 'nl-panel') == 'none'
        st = _state(page)
        assert (st["whole"], st["parts"], st["boxes"], st["total"]) == (17, [9, 8], ["", "", ""], 0)

    def test_three_unknown_card_falls_back_to_the_line(self, page):
        """The chain card g + __ + __ has no whole-and-two-parts reading: with the
        board chosen, that card shows the kangaroo line and offers line + jar; a jar
        picked there turns back into the board on the next card the board can split."""
        _force(page, 'br', "{t: TMA, a: 6, b: 14}")
        page.evaluate("problems[2] = {t: TS, a: 15, b: 9}")
        _open_board(page)
        page.evaluate("problems[1] = {t: TRA, r: 16, g: 5, a: 9, b: 7}; idx = 1; loadProblem()")
        page.wait_for_timeout(200)
        page.evaluate("_unlockAids(); tryFirst = 1")
        assert _disp(page, 'nl-panel') != 'none' and _disp(page, 'pw-panel') == 'none'
        assert page.evaluate("PW.applies()") is False
        icons = page.evaluate("buildGamesMenu(), [...document.querySelectorAll('#games-menu .gm-item svg.aid-ico')].map(s=>s.querySelectorAll('rect').length)")
        assert icons == [0, 1], f"line + jar on the chain card (no board), got rect counts {icons}"
        assert page.evaluate("aidMode") == 'pw', "the choice survives for the next splittable card"
        page.evaluate("toggleAidMode('nl')")
        assert page.evaluate("aidMode") == 'nl' and _disp(page, 'chain-tools') != 'none', "the jar opens on the chain card"
        page.evaluate("idx = 2; loadProblem()"); page.wait_for_timeout(200)
        page.evaluate("_unlockAids(); tryFirst = 1")
        assert page.evaluate("aidMode") == 'pw' and _disp(page, 'pw-panel') != 'none' and _disp(page, 'chain-tools') == 'none', \
            "back on a splittable bridge card the jar choice becomes the board"


class TestWholeAndPartsExercise:
    """🧩 TPW — the whole-and-parts card IS the exercise: write the whole and both
    parts, then ✓. The bars (5) and circles (1) are there to help — optional."""

    def _card(self, page, src_js):
        enter_mode(page, 'br')
        page.wait_for_selector("#ans, #ans1, .pwx", timeout=TIMEOUT)
        page.evaluate(f"problems[0] = EXERCISES.types.part_whole.fromFact({src_js}); idx = 0; score = 0; loadProblem()")
        page.wait_for_selector("#colx-root .pwx .pw-whole", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def test_solve_needs_the_template_but_not_the_drawing(self, page):
        self._card(page, "{t: TMA, a: 6, b: 14}")
        assert page.inner_text("#colx-root .pwx-eq").replace(" ", "") == "6+___=14"
        assert not page.locator("#chk-btn").is_visible() and not page.locator("#nl-panel").is_visible()
        CHK = "#colx-root .pwx-chk"
        page.click(CHK)
        note = re.sub(r"[\u0591-\u05C7]", "", page.inner_text("#colx-root .pwx-note"))
        assert "שלם" in note and page.evaluate("tryFirst") == 0, "empty boxes: a note, no penalty"
        page.fill("#colx-root .pw-whole", "14"); page.fill("#colx-root .pw-part[data-i='0']", "6"); page.fill("#colx-root .pw-part[data-i='1']", "9")
        page.click(CHK)
        assert page.evaluate("tryFirst") == 1 and not page.evaluate("done"), "a wrong part is a mistake"
        page.wait_for_timeout(1800)
        page.fill("#colx-root .pw-part[data-i='1']", "8")
        assert page.locator("#colx-root .pw-bar, #colx-root .pw-dot").count() == 0, "nothing drawn"
        page.click(CHK)
        page.wait_for_function("done === true", timeout=TIMEOUT)   # the right numbers solve it — no drawing needed
        assert page.inner_text("#colx-root .pwx-note") == ""
        assert page.evaluate("score") == 10, "second try in br: 67% of 15"
        assert page.inner_text("#colx-root .pwx-eq").replace(" ", "") == "14−6=8"
        assert page.evaluate("_reportRows()[0].eq").startswith("🧩 14 = 6 + 8")

    def test_a_half_drawing_does_not_hold_back_a_right_answer(self, page):
        """A drawing she started and left (one bar of 15, nothing coloured) does
        not stop a correct card: first try, full marks."""
        self._card(page, "{t: TA, a: 9, b: 6}")
        page.click("#colx-root .pw-add-bar")
        page.fill("#colx-root .pw-whole", "15"); page.fill("#colx-root .pw-part[data-i='0']", "9"); page.fill("#colx-root .pw-part[data-i='1']", "6")
        assert page.locator("#colx-root .pw-bar").count() == 1 and page.locator("#colx-root .pw-bar s.on").count() == 0
        page.press("#colx-root .pw-part[data-i='1']", "Enter")      # Enter in the last box checks, as ✓ does
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("tryFirst") == 0 and page.evaluate("score") == 15
        assert page.inner_text("#colx-root .pwx-eq").replace(" ", "") == "9+6=15"

    def test_board_holds_still_as_the_drawing_grows(self, page):
        """The 4th bar (past 15) used to pull the drawing up beside the template,
        top-left: #colx-root is shrink-to-fit, so the board's width followed the
        drawing. Now the board has a fixed width and the drawing stays underneath."""
        self._card(page, "{t: TA, a: 9, b: 8}")
        rect = ("(s => {const r = document.querySelector(s).getBoundingClientRect();"
                " return [Math.round(r.x), Math.round(r.y), Math.round(r.width)];})")
        first = None
        for n in range(6):
            page.click("#colx-root .pw-add-bar" if n < 4 else "#colx-root .pw-add-dot")
            now = [page.evaluate(f"{rect}('{s}')") for s in ("#colx-root .pw-tpl", "#colx-root .pw-draw")]
            first = first or now
            assert now == first, f"{n + 1} items: the board moved {first} -> {now}"
        tpl, draw = first
        assert draw[1] > tpl[1], "the drawing sits under the template"

    def test_every_fact_kind_becomes_a_card(self, page):
        enter_mode(page, 'br'); page.wait_for_selector("#ans, #ans1, .pwx", timeout=TIMEOUT)
        got = page.evaluate("""[{t:TA,a:9,b:6},{t:TS,a:15,b:9},{t:TMA,a:6,b:14},{t:TM,a:16,b:7}]
            .map(f => {const c = EXERCISES.types.part_whole.fromFact(f); return [c.whole, c.parts, c.missing, c.a, c.eq];})""")
        assert got == [[15, [9, 6], "whole", 15, "9 + 6 = ___"], [15, [9, 6], "part", 6, "15 − 9 = ___"],
                       [14, [6, 8], "part", 8, "6 + ___ = 14"], [16, [7, 9], "part", 9, "16 − ___ = 7"]], got


class TestTesterPage:
    def test_tester_boots_and_opens_the_board(self, page):
        """part_whole_dev.html is the real game plus a sidebar: it boots on the
        first equation card with the board already open."""
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(DEV_URL)
        page.wait_for_function("typeof PWDEV === 'object' && typeof setMode === 'function'", timeout=TIMEOUT)
        page.wait_for_function(
            "typeof ptype !== 'undefined' && ptype === TMA && num1 === 6 && num2 === 14"
            " && document.getElementById('pw-panel').style.display !== 'none'"
            " && !!document.querySelector('#pw-panel .pw-whole')", timeout=TIMEOUT)
        assert page.locator("#pwdev").is_visible()
        assert page.locator("#pwdev #pwd-br .pwd-p").count() >= 6 and page.locator("#pwdev #pwd-b20 .pwd-p").count() >= 3
        # a bridge-20 card from the sidebar
        page.evaluate("PWDEV.force('b20', \"({t:TS,a:27,b:9})\")")
        page.wait_for_function("mode === 'b20' && ptype === TS && num1 === 27 && PW.state() && PW.state().whole === 27", timeout=TIMEOUT)
        assert errors == [], errors

    def test_tester_mirrors_the_game_skeleton(self):
        """The tester is generated from index.html: every id, script and
        stylesheet of the game page must be present (keeps the copy honest)."""
        game = (ROOT / "index.html").read_text(encoding="utf-8")
        dev = (ROOT / "part_whole_dev.html").read_text(encoding="utf-8")
        for i in set(re.findall(r'\bid="([^"]+)"', game)):
            assert f'id="{i}"' in dev, f"tester lacks #{i}"
        for s in re.findall(r'<script src="([^"]+)"', game):
            assert f'<script src="{s}"' in dev, f"tester lacks {s}"
        for h in re.findall(r'<link rel="stylesheet" href="([^"]+)"', game):
            assert f'href="{h}"' in dev, f"tester lacks {h}"
        assert 'id="pwdev"' in dev and "PART_WHOLE" in (ROOT / "aids/part_whole.js").read_text(encoding="utf-8")
