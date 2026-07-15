import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# אַלּוּפָה 🏆 category — two-phase multiplication (mult_champ / TMK):
# the bare product is shown FIRST; the repeated-addition chain (+ 🔁 switch)
# is revealed only AFTER a wrong answer.
# ─────────────────────────────────────────────────────────

def _enter_mulc(page):
    """Switch to the אַלּוּפָה multiplication game and wait for a mounted card."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof problems!=='undefined' && problems.length>0 && idx<problems.length"
        " && ptype===TMK && !!document.getElementById('mk-ans') && done===false",
        timeout=TIMEOUT)


class TestChampMultiplication:
    def test_product_is_shown_first_chain_hidden(self, page):
        """Phase 1: only the bare product a×b=□ is on screen; the chain is hidden."""
        _enter_mulc(page)
        assert page.evaluate("!!document.getElementById('mk-ans')")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('mk-chain')).display === 'none'"), \
            "the repeated-addition chain must be hidden until a mistake"

    def test_wrong_product_reveals_repeated_addition_chain(self, page):
        """A wrong product opens the chain = the small number `a` repeated `b` times,
        and the chain's final box expects the product."""
        _enter_mulc(page)
        res = page.evaluate("""() => {
            const a=num1,b=num2,product=a*b;
            const inp=document.getElementById('mk-ans');
            inp.value=String(product+1);
            inp.dispatchEvent(new Event('input',{bubbles:true}));
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
            return {a,b,product,
                shown:getComputedStyle(document.getElementById('mk-chain')).display!=='none',
                terms:[...document.querySelectorAll('#mk-row .mk-term')].map(e=>+e.textContent),
                finalExp:+document.querySelector('#mk-row .mk-final').getAttribute('data-exp')};
        }""")
        assert res["shown"], "a wrong product must reveal the chain"
        assert res["terms"] == [res["a"]] * res["b"], \
            f"default chain must be {res['a']} repeated {res['b']} times, got {res['terms']}"
        assert res["finalExp"] == res["product"], "the final box must expect the product"

    def test_switch_flips_which_number_repeats(self, page):
        """🔁 switch flips a-repeated-b-times ↔ b-repeated-a-times; flips back;
        the answer (final box) stays the product either way."""
        _enter_mulc(page)
        res = page.evaluate("""() => {
            const a=num1,b=num2,product=a*b;
            const inp=document.getElementById('mk-ans');
            inp.value=String(product+1);
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
            const terms=()=>[...document.querySelectorAll('#mk-row .mk-term')].map(e=>+e.textContent);
            const before=terms();
            document.getElementById('mk-switch').click();
            const flipped=terms();
            const flippedExp=+document.querySelector('#mk-row .mk-final').getAttribute('data-exp');
            document.getElementById('mk-switch').click();
            return {a,b,product,before,flipped,flippedExp,back:terms()};
        }""")
        assert res["before"] == [res["a"]] * res["b"]
        assert res["flipped"] == [res["b"]] * res["a"], \
            f"after switch must be {res['b']} repeated {res['a']} times, got {res['flipped']}"
        assert res["flippedExp"] == res["product"], "the answer must stay the product after a switch"
        assert res["back"] == [res["a"]] * res["b"], "switching back must restore the default"

    def test_correct_product_scores_full_without_chain(self, page):
        """A correct product in phase 1 scores full points (modePts=20) and never
        opens the chain."""
        _enter_mulc(page)
        page.evaluate("""() => {
            const inp=document.getElementById('mk-ans');
            inp.value=String(num1*num2);
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")
        assert page.evaluate("score") == 20, "correct product must award full 20 points"
        assert page.evaluate("tryFirst") == 0, "a correct product must not count a mistake"

    def test_solve_via_chain_after_mistake_gives_partial_credit(self, page):
        """Wrong product → chain revealed → correct answer in the chain's final box
        scores the try-first-1 rate (67% of 20 = 13) and completes the problem."""
        _enter_mulc(page)
        page.evaluate("""() => {
            const inp=document.getElementById('mk-ans');
            inp.value=String(num1*num2+1);
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")
        page.wait_for_function("tryFirst===1", timeout=TIMEOUT)
        page.evaluate("""() => {
            const fin=document.querySelector('#mk-row .mk-final');
            fin.value=String(num1*num2);
            fin.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")
        page.wait_for_function("done===true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13, "chain solve after one mistake must score 67% (13)"

    def test_hard_tier_registered_with_picker_button(self, page):
        """The 'hard' (קָשֶׁה) tier exists in DIFFICULTY_GROUPS with the 'mulc'
        (אַלּוּפָה) game, and its picker button (lbmulc) is in the DOM."""
        has = page.evaluate(
            "DIFFICULTY_GROUPS.some(g=>g.id==='hard' && g.modes.some(m=>m.id==='mulc'))")
        assert has, "the 'hard' tier with the 'mulc' game must be registered"
        assert page.evaluate("!!document.getElementById('lbmulc')"), \
            "the mulc picker button must render"

    def test_factors_never_exceed_four(self, page):
        """Every generated problem multiplies numbers up to 4 (a,b ∈ {2,3,4})."""
        _enter_mulc(page)   # ensures the mult_champ type file is loaded
        bad = page.evaluate(
            "EXERCISES.types.mult_champ.make('mulc')"
            ".filter(p => p.a<2 || p.a>4 || p.b<2 || p.b>4)")
        assert bad == [], f"all factors must be 2..4, offenders: {bad}"

    def test_hint_reads_the_product_in_hebrew_words(self, page):
        """The text below the exercise reads the product in WORDS with niqqud —
        4×3 → 'כמה זה ארבע פעמים שלוש?' (a '2' factor reads 'פעמיים')."""
        import re
        strip = lambda s: re.sub(r"[֑-ׇ]", "", s)   # drop niqqud for a robust check
        _enter_mulc(page)
        page.evaluate("problems[0]={t:TMK,a:4,b:3};idx=0;loadProblem();")
        page.wait_for_function(
            "!!document.getElementById('mk-ans') && num1===4 && num2===3", timeout=TIMEOUT)
        page.wait_for_timeout(80)
        bare = strip(page.evaluate("document.getElementById('hint').textContent"))
        assert "ארבע פעמים שלוש" in bare, f"expected 'ארבע פעמים שלוש', got: {bare}"
        # a 2× problem reads 'פעמיים' (twice), not 'שתיים פעמים'
        page.evaluate("problems[0]={t:TMK,a:2,b:4};idx=0;loadProblem();")
        page.wait_for_function(
            "!!document.getElementById('mk-ans') && num1===2 && num2===4", timeout=TIMEOUT)
        page.wait_for_timeout(80)
        bare2 = strip(page.evaluate("document.getElementById('hint').textContent"))
        # פַּעֲמַיִם (twice) strips to 'פעמים'; assert that form + no 'שתיים פעמים'
        assert "פעמים ארבע" in bare2 and "שתיים" not in bare2, \
            f"a 2× problem must read 'פעמיים ארבע' (twice four), got: {bare2}"

    def test_items_picture_groups_on_tap(self, page):
        """The product is drawn as real objects; a TAP groups them with golden
        divider lines — 3×4 → 4 groups of 3 (one group per chain term) — and a
        second tap ungroups."""
        _enter_mulc(page)
        page.evaluate("problems[0]={t:TMK,a:3,b:4};idx=0;loadProblem();")
        page.wait_for_function(
            "!!document.getElementById('mk-items') && num1===3 && num2===4", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        assert page.evaluate("document.querySelectorAll('.mk-it').length") == 12
        groups = page.evaluate("[...document.querySelectorAll('.mkg')].map(g=>g.children.length)")
        assert groups == [3, 3, 3, 3], f"3×4 must draw 4 groups of 3, got {groups}"
        assert not page.evaluate("!!document.querySelector('.mk-root.mk-grouped')"), \
            "the divider lines must start hidden"
        page.click("#mk-stage")
        page.wait_for_function("!!document.querySelector('.mk-root.mk-grouped')", timeout=TIMEOUT)
        page.click("#mk-stage")
        page.wait_for_function("!document.querySelector('.mk-root.mk-grouped')", timeout=TIMEOUT)

    def test_items_picture_follows_mistake_and_switch(self, page):
        """A wrong product auto-groups the picture, and the 🔁 switch regroups it
        to the OTHER orientation (4 groups of 3 ↔ 3 groups of 4)."""
        _enter_mulc(page)
        page.evaluate("problems[0]={t:TMK,a:3,b:4};idx=0;loadProblem();")
        page.wait_for_function(
            "!!document.getElementById('mk-ans') && num1===3 && num2===4", timeout=TIMEOUT)
        page.evaluate("""() => {
            const inp=document.getElementById('mk-ans');
            inp.value='11';
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")
        page.wait_for_function("!!document.querySelector('.mk-root.mk-grouped')", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('.mkg').length") == 4
        page.click("#mk-switch")
        page.wait_for_function("document.querySelectorAll('.mkg').length === 3", timeout=TIMEOUT)
        per = page.evaluate("[...document.querySelectorAll('.mkg')].map(g=>g.children.length)")
        assert per == [4, 4, 4], f"after 🔁 the picture must regroup to 3 groups of 4, got {per}"


# =============================================================================
# אַלּוּפָה 🏆 — the three additions of 2026-07 (perimeter, compare, staged sub).
# All three are self-mounting types (into #colx-root), have no host check button
# and no number line by default, and are mixed into the 'mulc' pool. `mode='mulc'`
# → modePts=20; the staged subtraction also runs in Superman ('sup', base 15).
# =============================================================================

def _dispatch_enter(page, sel, value):
    """Set a value on the element matching `sel` and fire input + Enter. Dispatched
    in-page (not page.fill) so the transient sad-modal overlay can't fail an
    actionability check mid-flow."""
    page.evaluate(f"""() => {{
        const inp=document.querySelector('{sel}');
        inp.value='{value}';
        inp.dispatchEvent(new Event('input',{{bubbles:true}}));
        inp.dispatchEvent(new KeyboardEvent('keydown',{{key:'Enter',bubbles:true,cancelable:true}}));
    }}""")


# ─────────────────────────────────────────────────────────
# Polygon PERIMETER (perimeter / TPP) — a square / rectangle / triangle drawn TO
# SCALE with a length (1..4) beside each side; the child sums the sides. Standard
# try-first scoring on the mulc base 20 → 20 / 13 / 0.
# ─────────────────────────────────────────────────────────

def _enter_perim(page, problem):
    """Enter אַלּוּפָה, wait for the perimeter type + built pool, then force ONE
    perimeter problem (a JS object literal string) and wait for its board."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.perimeter==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(f"mode='mulc';score=0;problems=[{problem}];idx=0;loadProblem();")
    page.wait_for_selector(".pm-inp", timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestPerimeter:
    def test_perimeter_loads_and_mounts(self, page):
        """Forcing TPP mounts the shape board: one label per side, no host check
        button, no number line."""
        _enter_perim(page, "{t:TPP,shape:'square',sides:[3,3,3,3],a:12}")
        assert page.evaluate("ptype === TPP")
        assert page.locator(".pm-inp").count() == 1
        assert page.evaluate("document.querySelectorAll('.pm-lbl').length") == 4
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'"), \
            "the number line must stay hidden — the labelled shape is the manipulative"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'"), \
            "the host check button must be hidden (the module self-checks)"

    def test_perimeter_labels_match_sides(self, page):
        """Every side label equals the problem's side length, so the picture never
        contradicts the numbers."""
        _enter_perim(page, "{t:TPP,shape:'rect',w:2,h:4,sides:[2,4,2,4],a:12}")
        labels = page.evaluate(
            "[...document.querySelectorAll('.pm-lbl')].map(e=>+e.textContent)")
        assert sorted(labels) == [2, 2, 4, 4], f"labels must match the sides, got {labels}"

    def test_perimeter_correct_scores_full(self, page):
        """Typing the perimeter (sum of sides) on the first try scores full 20."""
        _enter_perim(page, "{t:TPP,shape:'square',sides:[3,3,3,3],a:12}")
        _dispatch_enter(page, ".pm-inp", 12)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20, "a correct perimeter must award full 20"
        assert page.evaluate("report[0].gotCorrect") is True

    def test_perimeter_wrong_then_correct_is_partial(self, page):
        """A wrong sum logs a mistake (no points); the follow-up correct sum scores
        the try-first-1 rate (67% of 20 = 13)."""
        _enter_perim(page, "{t:TPP,shape:'tri',sides:[3,4,2],a:9}")
        _dispatch_enter(page, ".pm-inp", 10)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("score") == 0
        _dispatch_enter(page, ".pm-inp", 9)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13, "solve after one miss must score 67% (13)"

    def test_perimeter_mistake_reveals_number_line(self, page):
        """A wrong perimeter brings up the number line (hidden until then) so she can
        hop each side and add them up."""
        _enter_perim(page, "{t:TPP,shape:'square',sides:[3,3,3,3],a:12}")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'"), \
            "the number line starts hidden for perimeter"
        _dispatch_enter(page, ".pm-inp", 10)          # wrong (correct is 12)
        page.wait_for_function(
            "getComputedStyle(document.getElementById('nl-panel')).display !== 'none'",
            timeout=TIMEOUT)
        assert page.evaluate("tryFirst") == 1, "the wrong answer must be logged as a mistake"

    def test_perimeter_triangle_drawn_to_scale(self, page):
        """An equilateral (3,3,3) draws three near-equal edges; a scalene (2,4,3)
        draws edges whose lengths track the labels — the picture stays honest."""
        def edges(problem):
            _enter_perim(page, problem)
            return page.evaluate("""() => {
                const pts=document.querySelector('.pm-body').getAttribute('points')
                    .trim().split(' ').map(s=>s.split(',').map(Number));
                const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
                return pts.map((p,i)=>d(p,pts[(i+1)%pts.length]));
            }""")
        eq = edges("{t:TPP,shape:'tri',sides:[3,3,3],a:9}")
        assert max(eq) - min(eq) < 2, f"equilateral edges must be ~equal, got {eq}"
        sc = edges("{t:TPP,shape:'tri',sides:[2,4,3],a:9}")
        assert max(sc) - min(sc) > 10, f"scalene edges must differ by scale, got {sc}"


# ─────────────────────────────────────────────────────────
# DRAG-the-comparison-sign (compare / TCP) — two numbers with an empty slot; the
# child DRAGS the correct < / > / = tile into the slot. Genuine pointer-drag.
# ─────────────────────────────────────────────────────────

def _enter_compare(page, a, b):
    """Enter אַלּוּפָה, wait for the compare type + built pool, then force ONE
    compare problem."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.compare==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(f"mode='mulc';score=0;problems=[{{t:TCP,a:{a},b:{b}}}];idx=0;loadProblem();")
    page.wait_for_selector(".cp-tile", timeout=TIMEOUT)
    page.wait_for_timeout(120)


def _drag_sign(page, op, to_sel=".cp-slot"):
    """Pointer-drag the sign tile with data-op=`op` onto `to_sel` using real mouse
    events, exercising the module's pointerdown→move→up drag path."""
    src = page.query_selector(f'.cp-tile[data-op="{op}"]')
    dst = page.query_selector(to_sel)
    sb, db = src.bounding_box(), dst.bounding_box()
    sx, sy = sb["x"] + sb["width"] / 2, sb["y"] + sb["height"] / 2
    dx, dy = db["x"] + db["width"] / 2, db["y"] + db["height"] / 2
    page.mouse.move(sx, sy); page.mouse.down()
    page.mouse.move((sx + dx) / 2, (sy + dy) / 2, steps=6)
    page.mouse.move(dx, dy, steps=6)
    page.mouse.up()


class TestCompare:
    def test_compare_loads_and_mounts(self, page):
        """Forcing TCP mounts two numbers, an empty slot and three sign tiles; no
        host check button."""
        _enter_compare(page, 3, 7)
        assert page.evaluate("ptype === TCP")
        assert page.evaluate("document.querySelectorAll('.cp-tile').length") == 3
        nums = page.evaluate("[...document.querySelectorAll('.cp-num')].map(e=>e.textContent)")
        assert nums == ["3", "7"]
        assert page.evaluate("!!document.querySelector('.cp-slot .cp-slot-q')"), \
            "the slot must start empty (a '?')"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_compare_correct_drag_solves(self, page):
        """Dragging the correct sign (3 < 7 → '<') into the slot turns it green and
        scores full 20."""
        _enter_compare(page, 3, 7)
        _drag_sign(page, "lt")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("!!document.querySelector('.cp-slot.cp-ok')"), \
            "the slot must go green on a correct sign"
        assert page.evaluate("score") == 20

    def test_compare_equal_relation(self, page):
        """Equal numbers accept only '='; dragging it in solves."""
        _enter_compare(page, 14, 14)
        _drag_sign(page, "eq")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20

    def test_compare_wrong_drag_logs_mistake_and_retries(self, page):
        """A wrong sign logs a mistake (no points, not done); the slot clears and a
        correct sign afterwards scores the try-first-1 rate (13)."""
        _enter_compare(page, 3, 7)
        _drag_sign(page, "gt")                        # 3 > 7 is wrong
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        page.wait_for_function(
            "getComputedStyle(document.getElementById('sad-ov')).display==='none'"
            " && !!document.querySelector('.cp-slot .cp-slot-q')", timeout=TIMEOUT)
        _drag_sign(page, "lt")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13, "solve after one miss must score 67% (13)"

    def test_compare_drop_outside_slot_places_nothing(self, page):
        """Releasing a tile away from the slot (over the tray) places no sign and
        logs no mistake — only a drop ON the slot counts."""
        _enter_compare(page, 8, 2)
        _drag_sign(page, "gt", to_sel=".cp-tray")
        page.wait_for_timeout(300)
        assert page.evaluate("done") is False
        assert page.evaluate("score") == 0
        assert page.evaluate("tryFirst") == 0
        assert page.evaluate("!!document.querySelector('.cp-slot .cp-slot-q')"), \
            "the slot must still be empty after a drop outside it"


# ─────────────────────────────────────────────────────────
# STAGED column-subtraction (column_sub / TCS) — Superman (sup) AND אַלּוּפָה
# (mulc): shown HORIZONTALLY first with a solvable input; a wrong answer drops to
# the vertical column. Graded ladder on the mode base:
#   0 → 100% · 1st (horizontal) → 75% · 2nd (column) → 50% + number line opens · 3rd → 0%
#   (mulc 20 → 20/15/10/0 · sup 15 → 15/11/8/0)
# ─────────────────────────────────────────────────────────

def _enter_staged_sub(page, mode, a=87, b=23):
    """Enter a staged-column mode, DISABLE the auto-reveal test hook (so the
    horizontal-first stage shows), then force ONE staged subtraction (no-borrow)."""
    page.evaluate(f"setMode('{mode}')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.column_sub==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate("window.__colxAutoReveal=false")   # keep the horizontal-first stage
    page.evaluate(
        f"mode='{mode}';score=0;problems=[{{t:TCS,a:{a},b:{b},staged:true}}];idx=0;loadProblem();")
    page.wait_for_selector("#colxs-solveinp", timeout=TIMEOUT)
    page.wait_for_timeout(120)


def _solve_column_87_23(page):
    """Enter the correct units (4) then tens (6) for 87−23 in the revealed column."""
    _dispatch_enter(page, "#colx-iU", "4")
    page.wait_for_function("!document.getElementById('colx-iT').disabled", timeout=TIMEOUT)
    _dispatch_enter(page, "#colx-iT", "6")


class TestStagedColumnSub:
    def test_staged_shows_horizontal_first(self, page):
        """A staged subtraction opens on the HORIZONTAL equation with a solvable
        input — no column board yet, number line hidden."""
        _enter_staged_sub(page, "mulc")
        assert page.locator("#colxs-solveinp").count() == 1
        assert page.evaluate("!document.getElementById('colx-iU')"), \
            "the column board must not mount until a mistake"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'"), \
            "a staged subtraction starts with the number line hidden"

    def test_staged_solved_in_head_full_no_column(self, page):
        """Solving the horizontal equation in the head scores full 20 (mulc) and
        never reveals the column."""
        _enter_staged_sub(page, "mulc")
        _dispatch_enter(page, "#colxs-solveinp", "64")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("!document.getElementById('colx-iU')"), \
            "the column must never appear when solved in the head"

    def test_staged_one_mistake_reveals_column_scores_75(self, page):
        """A wrong horizontal answer drops to the column (number line still hidden);
        solving there scores 75% of 20 = 15."""
        _enter_staged_sub(page, "mulc")
        _dispatch_enter(page, "#colxs-solveinp", "60")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'"), \
            "the number line must NOT open on the 1st (horizontal) mistake"
        _solve_column_87_23(page)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 15

    def test_staged_second_mistake_opens_number_line_scores_50(self, page):
        """A second mistake (first column try) opens the number line; the eventual
        solve scores 50% of 20 = 10."""
        _enter_staged_sub(page, "mulc")
        _dispatch_enter(page, "#colxs-solveinp", "60")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        _dispatch_enter(page, "#colx-iU", "9")        # wrong units → 2nd mistake
        page.wait_for_function(
            "getComputedStyle(document.getElementById('nl-panel')).display !== 'none'",
            timeout=TIMEOUT)
        page.wait_for_timeout(1100)                    # units box resets for a retry
        _solve_column_87_23(page)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 10

    def test_staged_third_mistake_zeroes_score(self, page):
        """A third mistake zeroes the problem: the final correct solve scores 0."""
        _enter_staged_sub(page, "mulc")
        _dispatch_enter(page, "#colxs-solveinp", "60")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        _dispatch_enter(page, "#colx-iU", "9"); page.wait_for_timeout(1100)   # 2nd
        _dispatch_enter(page, "#colx-iU", "8"); page.wait_for_timeout(1100)   # 3rd
        _solve_column_87_23(page)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 0

    def test_staged_runs_in_superman_on_15_base(self, page):
        """The SAME staged flow runs in Superman (sup): one mistake then solve
        scores 75% of the sup base 15 = 11."""
        _enter_staged_sub(page, "sup")
        assert page.evaluate("modePts()") == 15
        _dispatch_enter(page, "#colxs-solveinp", "60")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        _solve_column_87_23(page)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 11

    def test_staged_make_tags_sup_and_mulc_not_mx(self, page):
        """make('sup') and make('mulc') tag every problem `staged`; Queen (mx)
        column-subtraction stays non-staged."""
        _enter_staged_sub(page, "mulc")   # ensures column_sub is loaded
        assert page.evaluate(
            "EXERCISES.types.column_sub.make('sup').every(p=>p.staged===true)")
        assert page.evaluate(
            "EXERCISES.types.column_sub.make('mulc').every(p=>p.staged===true)")
        assert page.evaluate(
            "EXERCISES.types.column_sub.make('mx').every(p=>!p.staged)"), \
            "Queen (mx) column-subtraction must stay non-staged"


# ─────────────────────────────────────────────────────────
# Three-addends-to-a-target (triple_sum / TTS) — `__ + __ + __ = 20`, the child
# picks three addends. Any triple that sums to the target is accepted EXCEPT that
# 0 and 10 are disallowed: a sum-correct 0/10 answer is praised, costs NO points
# and does NOT complete — she must retry with other numbers.
# ─────────────────────────────────────────────────────────

def _enter_triple(page):
    """Enter אַלּוּפָה, wait for the triple_sum type + built pool, then force ONE
    `__+__+__=20` problem and wait for its board."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.triple_sum==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate("mode='mulc';score=0;problems=[{t:TTS,a:20}];idx=0;loadProblem();")
    page.wait_for_selector(".tsm-inp", timeout=TIMEOUT)
    page.wait_for_timeout(120)


def _triple_submit(page, a, b, c):
    """Fill the three addend boxes and submit (Enter on the 3rd box → check)."""
    page.evaluate(
        "(v) => {"
        "  const ins=[...document.querySelectorAll('.tsm-inp')];"
        "  ins.forEach((inp,k)=>{inp.value=String(v[k]);"
        "    inp.dispatchEvent(new Event('input',{bubbles:true}));});"
        "  ins[2].dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));"
        "}", [a, b, c])


class TestTripleSum:
    def test_triple_sum_loads_and_mounts(self, page):
        """Forcing TTS mounts three addend boxes + the target 20; no host check
        button, no number line."""
        _enter_triple(page)
        assert page.evaluate("ptype === TTS")
        assert page.evaluate("document.querySelectorAll('.tsm-inp').length") == 3
        assert page.evaluate("(document.querySelector('.tsm-target')||{}).textContent") == "20"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_triple_sum_valid_triple_scores_full(self, page):
        """A triple that sums to 20 with no 0 and no 10 completes and scores full 20."""
        _enter_triple(page)
        _triple_submit(page, 7, 8, 5)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("report[0].gotCorrect") is True

    def test_triple_sum_wrong_sum_is_a_mistake(self, page):
        """A triple that does NOT sum to the target is a normal mistake (penalty,
        not done)."""
        _enter_triple(page)
        _triple_submit(page, 5, 5, 5)            # = 15 ≠ 20
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        assert page.evaluate("score") == 0

    def test_triple_sum_zero_correct_but_not_accepted_no_penalty(self, page):
        """A sum-correct answer using 0 is praised but NOT completed and costs NO
        points — a later valid triple still scores the FULL 20."""
        _enter_triple(page)
        _triple_submit(page, 20, 0, 0)           # sums to 20 but uses 0
        page.wait_for_timeout(300)
        assert page.evaluate("done") is False, "a 0 answer must not complete the problem"
        assert page.evaluate("tryFirst") == 0, "a 0 answer must NOT be penalised"
        assert page.evaluate("score") == 0
        page.wait_for_function(                  # boxes clear (~1.5s) for a retry
            "document.querySelector('.tsm-inp').value===''", timeout=TIMEOUT)
        _triple_submit(page, 6, 9, 5)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20, "no points may be lost on the 0 attempt"

    def test_triple_sum_ten_correct_but_not_accepted_no_penalty(self, page):
        """Same soft rule for a 10: praised, no penalty, must retry with others."""
        _enter_triple(page)
        _triple_submit(page, 10, 9, 1)           # sums to 20 but uses 10
        page.wait_for_timeout(300)
        assert page.evaluate("done") is False
        assert page.evaluate("tryFirst") == 0
        page.wait_for_function(
            "document.querySelector('.tsm-inp').value===''", timeout=TIMEOUT)
        _triple_submit(page, 7, 8, 5)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20


# ─────────────────────────────────────────────────────────
# "כַּמָּה זֶה חֵצִי" (half / THF) — the first taste of DIVISION: two friends
# share 4/6/8/10 items EQUALLY. Tapping the items toggles a golden MIDDLE line
# that splits them into two equal halves (each sliding toward its girl); the
# child types how many EACH gets (n ÷ 2). A wrong answer auto-opens the split.
# ─────────────────────────────────────────────────────────

def _enter_half(page, n=8):
    """Enter אַלּוּפָה, wait for the half type + built pool, then force ONE
    share-equally problem and wait for its board."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.half==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(
        f"mode='mulc';score=0;problems=[{{t:THF,n:{n},a:{n//2},item:'🍎',"
        f"itemName:'תַּפּוּחִים',names:['דָּנָה','נֹעָה']}}];idx=0;loadProblem();")
    page.wait_for_selector(".hf-inp", timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestHalfSplit:
    def test_half_loads_and_mounts(self, page):
        """Forcing THF mounts the story + n items pre-grouped in two equal halves,
        split line hidden; no host check button, no number line."""
        _enter_half(page, 8)
        assert page.evaluate("ptype === THF")
        assert page.evaluate("document.querySelectorAll('.hf-item').length") == 8
        halves = page.evaluate("[...document.querySelectorAll('.hf-half')].map(h=>h.children.length)")
        assert halves == [4, 4], f"items must sit in two equal halves, got {halves}"
        assert not page.evaluate("!!document.querySelector('.hf-root.hf-split')"), \
            "the split line must start hidden"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_half_tap_toggles_the_middle_split(self, page):
        """Tapping the items shows the golden middle line (splits into 2 groups);
        tapping again hides it."""
        _enter_half(page, 6)
        page.click(".hf-stage")
        page.wait_for_function("!!document.querySelector('.hf-root.hf-split')", timeout=TIMEOUT)
        page.click(".hf-stage")
        page.wait_for_function("!document.querySelector('.hf-root.hf-split')", timeout=TIMEOUT)

    def test_half_correct_scores_full(self, page):
        """Typing n/2 on the first try scores full 20 and reveals the split."""
        _enter_half(page, 10)
        _dispatch_enter(page, ".hf-inp", 5)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("report[0].gotCorrect") is True
        assert page.evaluate("!!document.querySelector('.hf-root.hf-split')"), \
            "the correct answer celebrates by showing the equal split"

    def test_half_wrong_auto_splits_then_correct_is_partial(self, page):
        """A wrong share logs a mistake AND auto-opens the split (so she can count
        one side); the follow-up correct answer scores 67% of 20 = 13."""
        _enter_half(page, 8)
        _dispatch_enter(page, ".hf-inp", 6)           # wrong (correct is 4)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        assert page.evaluate("!!document.querySelector('.hf-root.hf-split')"), \
            "a mistake must auto-open the middle split"
        page.wait_for_function("document.querySelector('.hf-inp').value===''", timeout=TIMEOUT)
        _dispatch_enter(page, ".hf-inp", 4)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_half_pool_is_even_totals_only(self, page):
        """make('mulc') builds one problem per total 4/6/8/10 — every total EVEN,
        answer exactly half."""
        _enter_half(page)   # ensures the half type file is loaded
        pool = page.evaluate("EXERCISES.types.half.make('mulc').map(p=>({n:p.n,a:p.a}))")
        assert sorted(p["n"] for p in pool) == [4, 6, 8, 10]
        assert all(p["a"] * 2 == p["n"] for p in pool), f"answers must be exact halves: {pool}"


# ─────────────────────────────────────────────────────────
# "צַלָּחוֹת" (plates / TPL) — equal groups → TOTAL, the multiplication story
# (the inverse of half): g plates (2..4) each holding s items (2..4); the child
# types the total (g×s). Tapping the plates POURS the items into one countable
# row; tapping again puts them back. A wrong answer auto-pours.
# ─────────────────────────────────────────────────────────

def _enter_plates(page, g=3, s=4):
    """Enter אַלּוּפָה, wait for the plates type + built pool, then force ONE
    groups→total problem and wait for its board."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.plates==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(
        f"mode='mulc';score=0;problems=[{{t:TPL,g:{g},s:{s},a:{g*s},item:'🍎',"
        f"itemName:'תַּפּוּחִים',name:'דָּנָה'}}];idx=0;loadProblem();")
    page.wait_for_selector(".pl-inp", timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestPlates:
    def test_plates_loads_and_mounts(self, page):
        """Forcing TPL mounts the story + g plates each holding s items; no host
        check button, no number line."""
        _enter_plates(page, 3, 4)
        assert page.evaluate("ptype === TPL")
        per = page.evaluate("[...document.querySelectorAll('.pl-plate')].map(p=>p.children.length)")
        assert per == [4, 4, 4], f"3 plates of 4 items expected, got {per}"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_plates_tap_pours_into_one_row(self, page):
        """Tapping the plates pours ALL the items into one countable row; tapping
        again puts them back on the plates."""
        _enter_plates(page, 2, 3)
        page.click(".pl-stage")
        page.wait_for_function(
            "document.querySelector('.pl-rowv') && document.querySelector('.pl-rowv').children.length===6",
            timeout=TIMEOUT)
        page.click(".pl-stage")
        page.wait_for_function("document.querySelectorAll('.pl-plate').length===2", timeout=TIMEOUT)

    def test_plates_correct_scores_full(self, page):
        """Typing g×s on the first try scores full 20."""
        _enter_plates(page, 4, 3)
        _dispatch_enter(page, ".pl-inp", 12)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("report[0].gotCorrect") is True

    def test_plates_wrong_auto_pours_then_correct_is_partial(self, page):
        """A wrong total logs a mistake AND auto-pours the row (count them all);
        the follow-up correct answer scores 67% of 20 = 13."""
        _enter_plates(page, 3, 4)
        _dispatch_enter(page, ".pl-inp", 7)           # wrong (correct is 12)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        assert page.evaluate("!!document.querySelector('.pl-rowv')"), \
            "a mistake must auto-pour the items into the countable row"
        page.wait_for_function("document.querySelector('.pl-inp').value===''", timeout=TIMEOUT)
        _dispatch_enter(page, ".pl-inp", 12)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_plates_pool_is_products_up_to_16(self, page):
        """make('mulc') builds 3 problems, plates/per-plate both 2..4, answer g×s."""
        _enter_plates(page)   # ensures the plates type file is loaded
        pool = page.evaluate("EXERCISES.types.plates.make('mulc').map(p=>({g:p.g,s:p.s,a:p.a}))")
        assert len(pool) == 3
        assert all(2 <= p["g"] <= 4 and 2 <= p["s"] <= 4 and p["a"] == p["g"] * p["s"]
                   for p in pool), f"bad pool: {pool}"
