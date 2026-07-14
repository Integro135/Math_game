import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Coin-multiplication — רֵאשִׁית הַכֶּפֶל (TCM / coin_mul.ex.js, mixed into Superman)
# ─────────────────────────────────────────────────────────

class TestCoinMul:
    def _enter_cm(self, page, target=20):
        # coin_mul rides the Superman pool, so build it then force a TCM problem
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate(f"problems[0] = {{t: TCM, a: {target}}}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def test_coin_mul_in_sup_pool(self, page):
        """coin_mul.make('sup') yields 3 TCM problems — ONE of EACH coin value
        (₪2/₪5/₪10), each carrying b = the coin value and a valid target for that
        coin: ₪2→{4..20}, ₪5→{10,15,20,25,30,35}, ₪10→{20..90}, with a/b ∈
        {2..10}. Every Superman session weaves coin-multiplication in."""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.coin_mul === 'object'", timeout=TIMEOUT)
        res = page.evaluate("""(() => {
            const T={2:[4,6,8,10,12,14,16,18,20], 5:[10,15,20,25,30,35], 10:[20,30,40,50,60,70,80,90]};
            let saw={2:false,5:false,10:false}, bad=null;
            for (let k = 0; k < 40; k++) {
                const ps = EXERCISES.types.coin_mul.make('sup');
                if (ps.length !== 3) bad = {reason:'len', len: ps.length};
                if (ps.map(p => p.b).sort((a,b)=>a-b).join(',') !== '2,5,10')
                    bad = {reason:'coins', got: ps.map(p=>p.b)};
                for (const p of ps) {
                    if (p.t !== TCM) bad = {reason:'t', p};
                    if (!T[p.b] || !T[p.b].includes(p.a)) bad = {reason:'target', p};
                    const need = p.a / p.b;
                    if (need < 2 || need > 10 || need !== Math.round(need)) bad = {reason:'need', p};
                    if (saw[p.b] !== undefined) saw[p.b] = true;
                }
            }
            return {saw, bad};
        })()""")
        assert res["bad"] is None, f"invalid coin_mul problem: {res['bad']}"
        assert res["saw"]["2"] and res["saw"]["5"] and res["saw"]["10"], \
            f"each coin value (₪2/₪5/₪10) must appear every session: {res['saw']}"
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        assert page.evaluate("[...problems].some(p => p.t === TCM)"), \
            "the Superman session must contain coin-multiplication problems"

    def test_coin_mul_two_coin_variant(self, page):
        """A ₪2 problem (6 → 3 coins of ₪2): the answer is a/b = 3 (not a/5), the
        title shows the ₪2 coin, and entering 3 solves it."""
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCM, a: 6, b: 2}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        assert page.evaluate("report[0].correct") == 3, "6 ÷ ₪2 must be 3 coins (not 6/5)"
        assert page.evaluate(
            "((document.querySelector('.colm-titlecoin .coin-lbl')||{}).textContent||'')"
            ".includes('2')"), "the title must show the ₪2 coin"
        page.fill("#colm-ans", "3")
        page.click("#colm-chk")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)

    def test_coin_mul_ten_coin_variant(self, page):
        """A ₪10 problem (90 → 9 coins): the answer is a/b = 9, the title shows the
        ₪10 coin, ＋ stays enabled at 9 (cap need+3, so the answer is never given
        away), and entering 9 solves it."""
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCM, a: 90, b: 10}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        assert page.evaluate("report[0].correct") == 9, "90 ÷ ₪10 must be 9 coins"
        assert page.evaluate(
            "((document.querySelector('.colm-titlecoin .coin-lbl')||{}).textContent||'')"
            ".includes('10')"), "the title must show the ₪10 coin"
        for _ in range(9):
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 9
        assert page.evaluate("document.getElementById('colm-add').disabled") is False, \
            "＋ must stay enabled at the answer count (cap is need+3)"
        page.fill("#colm-ans", "9")
        page.click("#colm-chk")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)

    def test_coin_mul_loads_and_mounts(self, page):
        """Forcing a TCM problem mounts the coin tray + ＋ control; starts empty."""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.coin_mul === 'object'", timeout=TIMEOUT)
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCM, a: 20}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        assert page.evaluate("ptype === TCM")
        assert page.locator("#colm-ans").count() == 1
        assert page.locator(".colm-coin").count() == 0
        # the silver real ₪5 coin is used (from the coin-counting exercise)
        assert page.evaluate("typeof tcCoinSVG === 'function'"), \
            "coins.ex.js must load in sup so the real coin art is available"

    def test_coin_mul_empty_box_hidden_but_space_reserved(self, page):
        """The empty coin box is invisible (no blank square) — class colm-tray-blank
        — but its space is RESERVED, so adding the first coin does not push the ＋
        button down. The box appears (blank class removed) once a coin is in, and
        hides again when emptied."""
        self._enter_cm(page, 15)
        blank = "document.getElementById('colm-tray').classList.contains('colm-tray-blank')"
        add_top = "Math.round(document.getElementById('colm-add').getBoundingClientRect().top)"
        assert page.evaluate(blank) is True, "empty tray must be visually blank (box hidden)"
        top_empty = page.evaluate(add_top)
        page.click("#colm-add")
        assert page.evaluate(blank) is False, "the box appears once a coin is added"
        assert page.evaluate(add_top) == top_empty, \
            "the ＋ button must NOT shift down when the first coin is added"
        page.click("#colm-rem")
        assert page.evaluate(blank) is True, "emptying the tray hides the box again"

    def test_coin_mul_check_button_left_and_no_caption(self, page):
        """The ✓ confirm button sits to the LEFT of the answer input, and the old
        'press + to add a coin' caption is gone."""
        self._enter_cm(page, 15)
        assert page.locator(".colm-ctl-cap").count() == 0, "the +-caption must be removed"
        sides = page.evaluate(
            "(() => {const c=document.getElementById('colm-chk').getBoundingClientRect();"
            "const a=document.getElementById('colm-ans').getBoundingClientRect();"
            "return {chk:Math.round(c.left), ans:Math.round(a.left)};})()")
        assert sides["chk"] < sides["ans"], \
            f"✓ must be LEFT of the input, got chk={sides['chk']}, ans={sides['ans']}"

    def test_coin_mul_add_past_answer_no_reveal(self, page):
        """＋ must NOT disable at the answer — that would reveal it. For target 20
        (answer 4) the child can keep adding past 4; ＋ caps only at a generous
        bound (need+3 = 7). No total row."""
        self._enter_cm(page, 20)
        for _ in range(4):                       # reach the answer count
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 4
        assert page.evaluate("document.getElementById('colm-add').disabled") is False, \
            "＋ must stay enabled at the answer (disabling would reveal it)"
        for _ in range(3):                       # keep adding PAST the answer
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 7
        assert page.evaluate("document.getElementById('colm-add').disabled") is True, \
            "＋ caps only at the generous bound (need+3)"
        assert page.locator("#colm-sum").count() == 0   # no running-total row

    def test_coin_mul_space_adds_a_coin(self, page):
        """Pressing SPACE drops a coin in the coin-counting exercise too (no double-fire)."""
        self._enter_cm(page, 20)
        for _ in range(3):
            page.keyboard.press("Space")
        page.wait_for_timeout(50)
        assert page.locator(".colm-coin").count() == 3, \
            "each SPACE press must add exactly one coin"

    def test_coin_mul_minus_removes_coin(self, page):
        """The large minus button removes the last coin and re-enables ＋ at the cap."""
        self._enter_cm(page, 20)
        for _ in range(7):                       # fill to the cap (need+3)
            page.click("#colm-add")
        assert page.evaluate("document.getElementById('colm-add').disabled") is True
        page.click("#colm-rem")
        assert page.locator(".colm-coin").count() == 6
        assert page.evaluate("document.getElementById('colm-add').disabled") is False

    def test_coin_mul_correct_count_solves(self, page):
        """20 with 5-coins → 4 coins. Filling the tray and entering the COUNT (4)
        solves for full Superman points (15)."""
        self._enter_cm(page, 20)
        before = page.evaluate("score")
        for _ in range(4):
            page.click("#colm-add")
        page.fill("#colm-ans", "4")
        page.click("#colm-chk")
        page.wait_for_function(f"score === {before + 15}", timeout=TIMEOUT)
        assert page.evaluate("report[0].gotCorrect") is True

    def test_coin_mul_answer_is_count_not_value(self, page):
        """The answer is the COUNT of coins, not the total value: for target 15
        the correct answer is 3 (3×5); entering 15 (the value) is rejected."""
        self._enter_cm(page, 15)
        for _ in range(3):
            page.click("#colm-add")
        page.fill("#colm-ans", "15")          # the VALUE — wrong
        page.click("#colm-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("report[0].wrongs.length") == 1
        page.fill("#colm-ans", "3")           # the COUNT — correct
        page.click("#colm-chk")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)




# ─────────────────────────────────────────────────────────
# Bagel cost — כַּמָּה עוֹלִים x בֵּיגַלֶה (TBC / bagel_cost.ex.js, mixed into Superman)
# ─────────────────────────────────────────────────────────

class TestBagelCost:
    def _enter_bagel(self, page, bagels=4):
        # bagel_cost rides the Superman pool, so build it then force a TBC problem
        page.evaluate("setMode('sup')")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate(f"problems[0] = {{t: TBC, a: {bagels}, b: 5}}; idx = 0; loadProblem()")
        page.wait_for_selector("#colm-add", timeout=TIMEOUT)
        page.wait_for_timeout(150)

    def test_bagel_cost_in_sup_pool(self, page):
        """bagel_cost.make('sup') yields 3 TBC problems with DISTINCT bagel counts
        from {2,3,4,6,7,8} — up to 8, SKIPPING 5 (5 bagels × ₪5 confuses count=price)
        — each carrying b=5 (price per bagel); Superman includes them. Max total 40."""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.bagel_cost === 'object'", timeout=TIMEOUT)
        res = page.evaluate("""(() => {
            let bad = null;
            for (let k = 0; k < 40 && !bad; k++) {
                const ps = EXERCISES.types.bagel_cost.make('sup');
                if (ps.length !== 3) { bad = {reason:'len', len: ps.length}; break; }
                if (new Set(ps.map(p => p.a)).size !== 3) { bad = {reason:'dup', a: ps.map(p=>p.a)}; break; }
                for (const p of ps) {
                    if (p.t !== TBC) { bad = {reason:'t', p}; break; }
                    if (p.b !== 5) { bad = {reason:'price', p}; break; }
                    if (![2,3,4,6,7,8].includes(p.a)) { bad = {reason:'range', p}; break; }  // 2..8, never 5
                }
            }
            return { bad };
        })()""")
        assert res["bad"] is None, f"invalid bagel_cost problem: {res['bad']}"
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        assert page.evaluate("[...problems].some(p => p.t === TBC)"), \
            "the Superman session must contain bagel-cost problems"

    def test_bagel_cost_loads_and_mounts(self, page):
        """Forcing a TBC problem mounts the coin tray + ＋ control; starts empty,
        states the bagel count, and shows the ₪5 price coin."""
        self._enter_bagel(page, 4)
        assert page.evaluate("ptype === TBC")
        assert page.locator("#colm-ans").count() == 1
        assert page.locator(".colm-coin").count() == 0
        assert "4" in page.eval_on_selector(".colm-q", "el => el.textContent")
        assert page.locator(".colm-sub .colm-titlecoin").count() == 1   # the ₪5 price coin

    def test_bagel_cost_answer_is_the_total_not_the_count(self, page):
        """4 bagels × ₪5 = 20: the answer is the TOTAL (20), not the count (4)."""
        self._enter_bagel(page, 4)
        assert page.evaluate("report[0].correct") == 20, "4 bagels × 5 must total 20"
        page.fill("#colm-ans", "4")           # the COUNT — wrong
        page.click("#colm-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("report[0].wrongs.length") == 1
        page.fill("#colm-ans", "20")          # the TOTAL — correct
        page.click("#colm-chk")
        page.wait_for_function("report[0].gotCorrect === true", timeout=TIMEOUT)

    def test_bagel_cost_plus_allows_overshoot_past_answer(self, page):
        """＋ must NOT disable at the correct count (4) — that would reveal the
        answer; it stays enabled and caps only at the generous bound (bagels+3 = 7),
        exactly like the coin-counting exercise."""
        self._enter_bagel(page, 4)
        for _ in range(4):
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 4
        assert page.evaluate("document.getElementById('colm-add').disabled") is False, \
            "＋ must stay enabled at the answer count (no reveal)"
        for _ in range(3):                       # keep adding PAST the answer
            page.click("#colm-add")
        assert page.locator(".colm-coin").count() == 7
        assert page.evaluate("document.getElementById('colm-add').disabled") is True, \
            "＋ caps only at the generous bound (bagels+3 = 7)"

    def test_bagel_question_shows_icon_after_number(self, page):
        """The question reads 'כמה עולים <x> 🥨' — the number sits to the RIGHT of
        the bagel icon (correct RTL order, number before icon)."""
        self._enter_bagel(page, 4)
        res = page.evaluate("""(() => {
            const q = document.querySelector('.colm-q');
            const num = q.querySelector('b'), emo = q.querySelector('.bagc-emoji');
            return { numLeft: num.getBoundingClientRect().left,
                     emoLeft: emo.getBoundingClientRect().left }; })()""")
        assert res["numLeft"] > res["emoLeft"], \
            f"number must sit RIGHT of the icon (RTL 'x 🥨'): {res}"

    def test_bagel_space_adds_a_coin(self, page):
        """Pressing SPACE drops a ₪5 coin — the same as tapping ＋ (no double-fire)."""
        self._enter_bagel(page, 4)
        for _ in range(3):
            page.keyboard.press("Space")
        page.wait_for_timeout(50)
        assert page.locator(".colm-coin").count() == 3, \
            "each SPACE press must add exactly one coin"

    def test_bagel_cost_minus_removes_coin(self, page):
        """The large minus button removes the last coin and re-enables ＋ at the cap."""
        self._enter_bagel(page, 4)
        for _ in range(7):                # fill to the cap (bagels+3 = 7)
            page.click("#colm-add")
        assert page.evaluate("document.getElementById('colm-add').disabled") is True
        page.click("#colm-rem")
        assert page.locator(".colm-coin").count() == 6
        assert page.evaluate("document.getElementById('colm-add').disabled") is False

    def test_bagel_cost_correct_total_solves(self, page):
        """Filling the tray (a coin per bagel) and entering the TOTAL solves it
        and awards the Superman 15 points. 6 bagels × 5 = 30."""
        self._enter_bagel(page, 6)
        before = page.evaluate("score")
        for _ in range(6):
            page.click("#colm-add")
        page.fill("#colm-ans", "30")
        page.click("#colm-chk")
        page.wait_for_function(f"score === {before + 15}", timeout=TIMEOUT)
        assert page.evaluate("report[0].gotCorrect === true")
