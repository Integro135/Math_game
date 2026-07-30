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


def _force_mulc_tmk(page, a, b):
    """Enter אַלּוּפָה, then force ONE mult_champ problem a×b and wait for its card
    (so factor choice is deterministic — needed for the 🔁-switch tests)."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.mult_champ==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(f"mode='mulc';score=0;problems=[{{t:TMK,a:{a},b:{b}}}];idx=0;loadProblem();")
    page.wait_for_selector("#mk-ans", timeout=TIMEOUT)
    page.wait_for_timeout(120)


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
        and the chain's final box expects the product. (Mistake aids ALTERNATE
        line↔chain across cards — pin the chain turn for determinism.)"""
        _enter_mulc(page)
        res = page.evaluate("""() => {
            window.__mkAidTurn=1;              // odd turn → the CHAIN aid
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
        the answer (final box) stays the product either way. Uses DISTINCT factors
        (3×4) — equal factors hide the switch (see test_equal_factors_hide_switch)."""
        _force_mulc_tmk(page, 3, 4)
        res = page.evaluate("""() => {
            window.__mkAidTurn=1;              // pin the CHAIN aid turn
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

    def test_equal_factors_hide_switch(self, page):
        """Equal factors (a×a) — flipping 3+3+3 gives the same 3+3+3, so the 🔁
        switch is NOT rendered; the repeated-addition chain still opens on a
        mistake (user: 'אין צורך להציג את כפתור השחלוף בין מספרים זהים')."""
        _force_mulc_tmk(page, 3, 3)
        res = page.evaluate("""() => {
            window.__mkAidTurn=1;              // pin the CHAIN aid turn
            const inp=document.getElementById('mk-ans');
            inp.value=String(3*3+1);
            inp.dispatchEvent(new Event('input',{bubbles:true}));
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
            return {
                shown:getComputedStyle(document.getElementById('mk-chain')).display!=='none',
                hasSwitch:!!document.getElementById('mk-switch'),
                terms:[...document.querySelectorAll('#mk-row .mk-term')].map(e=>+e.textContent),
            };
        }""")
        assert res["shown"], "a wrong product must still open the chain for equal factors"
        assert res["hasSwitch"] is False, "equal factors must NOT render the 🔁 switch"
        assert res["terms"] == [3, 3, 3], "the chain is still 3 repeated 3 times"

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
            window.__mkAidTurn=1;              // pin the CHAIN aid turn
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

    def test_products_never_exceed_sixteen(self, page):
        """Every generated problem has factors ≥0 and a PRODUCT ≤16 — beyond the ≤4
        grid it includes the wider facts (2×7, 2×8, 3×5) AND the ×1 (identity) and
        ×0 (zero) facts (user: add ×1 and ×0)."""
        _enter_mulc(page)   # ensures the mult_champ type file is loaded
        bad = page.evaluate(
            "EXERCISES.types.mult_champ.make('mulc')"
            ".filter(p => p.a<0 || p.b<0 || p.a*p.b>16)")
        assert bad == [], f"all products must be ≤16 (factors ≥0), offenders: {bad}"
        # over many pools: factors exceed 4 sometimes, AND ×1 and ×0 both occur
        agg = page.evaluate(
            "(()=>{const s=new Set();let one=false,zero=false;for(let i=0;i<80;i++)"
            "EXERCISES.types.mult_champ.make('mulc').forEach(p=>{s.add(p.a);s.add(p.b);"
            "if(p.a===1||p.b===1)one=true;if(p.a===0||p.b===0)zero=true;});"
            "return {factors:[...s],one:one,zero:zero};})()")
        assert any(f > 4 for f in agg["factors"]), f"factors should exceed 4 sometimes, saw {agg['factors']}"
        assert agg["one"], "the pool must include ×1 (identity) facts"
        assert agg["zero"], "the pool must include ×0 (zero) facts"

    def test_times_zero_and_one_solve_via_count_chain(self, page):
        """×0 and ×1 are answerable, and a wrong product reveals the COUNT-chain
        (never the degenerate skip-counting line): ×0 → a single '0 =' term
        expecting 0; ×1 → a single term (the number itself)."""
        # ×0 — force the line turn to prove ×0 still forces the chain
        _force_mulc_tmk(page, 4, 0)
        assert page.evaluate("num1===4 && num2===0"), "the mount must keep the 0 factor (not clamp to 2)"
        page.evaluate("window.__mkAidTurn=0")     # a normal fact would pick the line here
        self._wrong_product(page)
        page.wait_for_function("!!document.querySelector('#mk-row .mk-final')", timeout=TIMEOUT)
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'"), \
            "×0 must NOT use the number line (it's degenerate); the count-chain is shown"
        assert page.evaluate("+document.querySelector('#mk-row .mk-final').getAttribute('data-exp')") == 0
        terms0 = page.evaluate("[...document.querySelectorAll('#mk-row .mk-term')].map(e=>e.textContent)")
        assert terms0 == ["0"], f"×0 chain must be a single '0' term, got {terms0}"
        page.evaluate("""() => {const f=document.querySelector('#mk-row .mk-final');
            f.value='0';f.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));}""")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        # ×1 — the chain is a single term = the number itself
        _force_mulc_tmk(page, 6, 1)
        self._wrong_product(page)
        page.wait_for_function("!!document.querySelector('#mk-row .mk-final')", timeout=TIMEOUT)
        assert page.evaluate("+document.querySelector('#mk-row .mk-final').getAttribute('data-exp')") == 6
        terms1 = page.evaluate("[...document.querySelectorAll('#mk-row .mk-term')].map(e=>e.textContent)")
        assert terms1 == ["6"], f"×1 chain must be a single term (the number itself), got {terms1}"

    def test_superman_coin_multiplication_exercises_in_mulc_pool(self, page):
        """The two basic-multiplication exercises borrowed from Superman —
        coin_mul (how many ₪2/₪5/₪10 coins fit in X) and bagel_cost (X bagels ×
        ₪5) — are now woven into the אַלּוּפָה (mulc) pool too. Each type's
        make('mulc') matches make('sup'), and both land in the built deck (the
        20-cap preserves ≥1 of every type)."""
        _enter_mulc(page)   # ensures the mulc type files are loaded
        for t in ("coin_mul", "bagel_cost"):
            n = page.evaluate(f"EXERCISES.types.{t}.make('mulc').length")
            assert n == 3, f"{t}.make('mulc') must yield 3 problems (like sup), got {n}"
        # both self-mounting coin types appear in the built mulc deck
        page.evaluate("setMode('mulc')")
        page.wait_for_function(
            "typeof problems!=='undefined' && problems.length>0"
            " && typeof EXERCISES.types.coin_mul==='object'"
            " && typeof EXERCISES.types.bagel_cost==='object'", timeout=TIMEOUT)
        assert page.evaluate("problems.some(p=>p.t===TCM)"), \
            "coin_mul (TCM) must appear in the אַלּוּפָה pool"
        assert page.evaluate("problems.some(p=>p.t===TBC)"), \
            "bagel_cost (TBC) must appear in the אַלּוּפָה pool"
        # coins.ex.js must load in mulc too, so the REAL coin (an <svg>) renders in
        # the tray — not the plain silver fallback (.colm-coin-fallback)
        assert page.evaluate("typeof tcCoinSVG === 'function'"), \
            "tcCoinSVG (coins.ex.js) must be loaded in אַלּוּפָה for the coin art"
        page.evaluate("problems[0]={t:TCM,a:10,b:5};idx=0;loadProblem();")
        page.wait_for_selector(".colm-inp", timeout=TIMEOUT)
        page.click("#colm-add")   # drop one coin into the tray
        assert page.evaluate("!!document.querySelector('.colm-tray .colm-coin svg')"), \
            "the real coin SVG must render in the אַלּוּפָה coin tray"
        assert not page.evaluate("!!document.querySelector('.colm-coin-fallback')"), \
            "the silver fallback must NOT be used (coins.ex.js is loaded in mulc)"

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

    def test_no_countable_objects_shown(self, page):
        """The multiplication card must NOT draw the product as countable objects
        (that would give away the answer before she recalls it) — only the bare
        `a × b = □` and, after a mistake, the repeated-addition chain."""
        _enter_mulc(page)
        page.evaluate("problems[0]={t:TMK,a:3,b:4};idx=0;loadProblem();")
        page.wait_for_function(
            "!!document.getElementById('mk-ans') && num1===3 && num2===4", timeout=TIMEOUT)
        page.wait_for_timeout(80)
        assert page.evaluate("document.querySelectorAll('.mk-it, .mkg, #mk-items, #mk-stage').length") == 0, \
            "no items/groups picture may be shown in the multiplication exercise"

    def _wrong_product(self, page):
        """Submit a wrong product into the phase-1 box."""
        page.evaluate("""() => {
            const inp=document.getElementById('mk-ans');
            inp.value=String(num1*num2+1);
            inp.dispatchEvent(new Event('input',{bubbles:true}));
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")

    def test_mistake_aids_alternate_line_then_chain(self, page):
        """Mistake aids take TURNS across cards: the 1st mistake-card reveals the
        SKIP-COUNTING number line (jumps of the repeated factor, chain row hidden),
        the next reveals the repeated-addition CHAIN (line hidden)."""
        _force_mulc_tmk(page, 3, 4)
        page.evaluate("window.__mkAidTurn=0")          # start of the rotation
        self._wrong_product(page)
        page.wait_for_function("tryFirst===1", timeout=TIMEOUT)
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display !== 'none'"), \
            "card 1 must reveal the NUMBER LINE aid"
        ticks = page.evaluate("[...document.querySelectorAll('#nl-bar .nl-num')].map(e=>+e.textContent)")
        assert ticks == [0, 3, 6, 9, 12, 15], f"jumps of 3 expected, got {ticks}"
        assert page.evaluate(
            "getComputedStyle(document.querySelector('.mk-scroll')).display === 'none'"), \
            "the chain row stays hidden on a line card"
        # next card → the CHAIN turn
        page.evaluate("score=0;problems=[{t:TMK,a:3,b:4}];idx=0;loadProblem();")
        page.wait_for_selector("#mk-ans", timeout=TIMEOUT); page.wait_for_timeout(120)
        self._wrong_product(page)
        page.wait_for_function("!!document.querySelector('#mk-row .mk-final')", timeout=TIMEOUT)
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'"), \
            "card 2 must reveal the CHAIN, not the line"
        assert page.evaluate(
            "getComputedStyle(document.querySelector('.mk-scroll')).display !== 'none'")

    def test_line_aid_follows_the_switch_and_solves_in_place(self, page):
        """On a line card, 🔁 RE-CONFIGURES the line to the other factor's jumps
        (3×4: jumps of 3 ↔ jumps of 4), and the ORIGINAL product box still
        accepts the answer (13 after the one mistake)."""
        _force_mulc_tmk(page, 3, 4)
        page.evaluate("window.__mkAidTurn=0")          # line turn
        self._wrong_product(page)
        page.wait_for_function("tryFirst===1", timeout=TIMEOUT)
        ticks = page.evaluate("[...document.querySelectorAll('#nl-bar .nl-num')].map(e=>+e.textContent)")
        assert ticks == [0, 3, 6, 9, 12, 15]
        page.evaluate("document.getElementById('mk-switch').click()")
        page.wait_for_timeout(120)
        ticks = page.evaluate("[...document.querySelectorAll('#nl-bar .nl-num')].map(e=>+e.textContent)")
        assert ticks == [0, 4, 8, 12, 16], f"after 🔁 the line must jump by 4 (ending one jump past 12), got {ticks}"
        page.wait_for_function("document.getElementById('mk-ans').value===''", timeout=TIMEOUT)
        page.evaluate("""() => {
            const inp=document.getElementById('mk-ans');
            inp.value='12';
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")
        page.wait_for_function("done===true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_line_aid_moves_with_arrow_and_space(self, page):
        """On the skip-counting line-aid card the rider hops on ←/→ AND on SPACE
        (each NL.step adds an arc). Space is only checked after the sad modal
        clears — it's intentionally inert while #sad-ov is up, like every mode."""
        _force_mulc_tmk(page, 3, 4)
        page.evaluate("window.__mkAidTurn=0")          # line-aid turn
        self._wrong_product(page)
        page.wait_for_function(
            "tryFirst===1 && getComputedStyle(document.getElementById('nl-panel')).display!=='none'",
            timeout=TIMEOUT)
        page.eval_on_selector("#mk-ans", "el=>el.focus()")
        a0 = page.evaluate("document.querySelectorAll('#nl-arcs-svg path').length")
        page.keyboard.press("ArrowRight"); page.wait_for_timeout(120)
        assert page.evaluate("document.querySelectorAll('#nl-arcs-svg path').length") == a0 + 1, \
            "→ arrow must hop the rider (add an arc)"
        page.wait_for_function(
            "getComputedStyle(document.getElementById('sad-ov')).display==='none'", timeout=TIMEOUT)
        page.eval_on_selector("#mk-ans", "el=>el.focus()")
        a1 = page.evaluate("document.querySelectorAll('#nl-arcs-svg path').length")
        page.keyboard.press("Space"); page.wait_for_timeout(120)
        assert page.evaluate("document.querySelectorAll('#nl-arcs-svg path').length") == a1 + 1, \
            "space must hop the rider once the sad modal has cleared"
        assert page.evaluate("document.getElementById('mk-ans').value.indexOf(' ')<0"), \
            "space must NOT type into the answer box (preventDefault)"

    def test_like_chain_matches_number_line_jumps(self, page):
        """On a LINE card the "זֶה כְּמוֹ" chain shows the CURRENT orientation —
        the one the number line actually jumps by — and the two move TOGETHER on a
        🔁 switch (user: the chain must not contradict the line). 3×4 turn 0: line
        jumps of 3 → chain 3+3+3+3; after 🔁, jumps of 4 → chain 4+4+4."""
        _force_mulc_tmk(page, 3, 4)
        page.evaluate("window.__mkAidTurn=0")          # line-aid turn
        self._wrong_product(page)
        page.wait_for_function(
            "tryFirst===1 && getComputedStyle(document.getElementById('nl-panel')).display!=='none'",
            timeout=TIMEOUT)
        like = lambda: page.evaluate(
            "[...document.querySelectorAll('#mk-like-chain .mk-lc-num')].map(e=>+e.textContent)")
        ticks = lambda: page.evaluate(
            "[...document.querySelectorAll('#nl-bar .nl-num')].map(e=>+e.textContent)")
        assert ticks() == [0, 3, 6, 9, 12, 15]
        assert like() == [3, 3, 3, 3], f"jumps of 3 → 'זה כמו' chain must be 3+3+3+3, got {like()}"
        page.evaluate("document.getElementById('mk-switch').click()")
        page.wait_for_timeout(150)
        assert ticks() == [0, 4, 8, 12, 16]
        assert like() == [4, 4, 4], f"after 🔁 (jumps of 4) the chain must become 4+4+4, got {like()}"

    def test_floating_switch_is_separate_and_tooltip_previews_target(self, page):
        """The 🔁 switch is a SEPARATE floating button (NOT inside the 'זה כמו'
        text row); the swap target lives ONLY in its hover tooltip, so the visible
        chain never shows what it would flip TO (user request)."""
        _force_mulc_tmk(page, 3, 4)
        page.evaluate("window.__mkAidTurn=0")          # line-aid turn
        self._wrong_product(page)
        page.wait_for_function(
            "tryFirst===1 && getComputedStyle(document.getElementById('nl-panel')).display!=='none'",
            timeout=TIMEOUT)
        assert page.evaluate("!!document.getElementById('mk-switch')"), "the 🔁 switch must render"
        assert page.evaluate("!document.querySelector('.mk-like-row #mk-switch')"), \
            "the switch must be SEPARATE from the 'זה כמו' text row, not inside it"
        tip = page.evaluate("document.querySelector('.mk-switch-tip').textContent")
        assert tip.replace(" ", "") == "4+4+4", \
            f"the hover tooltip must PREVIEW the other orientation (4+4+4), got: {tip!r}"


# ─────────────────────────────────────────────────────────
# Multiplication with ONE UNKNOWN (mult_unknown / TMU) — `a × □ = product`, the
# child types the missing factor. The SKIP-COUNTING number line (jumps of a,
# 0..a·5) is shown from the START — before any mistake (explicit user request).
# ─────────────────────────────────────────────────────────

def _enter_mult_unknown(page, a=3, b=3):
    """Enter אַלּוּפָה, wait for the mult_unknown type + built pool, then force ONE
    a × □ = a·b problem and wait for its card."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.mult_unknown==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(f"mode='mulc';score=0;problems=[{{t:TMU,a:{a},b:{b}}}];idx=0;loadProblem();")
    page.wait_for_selector("#mu-ans", timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestMultUnknown:
    def test_mult_unknown_loads_with_number_line_from_start(self, page):
        """Forcing TMU mounts `a × □ = product` AND the skip-counting number line
        is already VISIBLE (before any mistake), configured to jumps of `a`
        (ticks 0, a, 2a, … a·5); no host check button."""
        _enter_mult_unknown(page, 3, 3)
        assert page.evaluate("ptype === TMU")
        assert page.evaluate("!!document.getElementById('mu-ans')")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display !== 'none'"), \
            "the number line must be visible from the START (before any mistake)"
        ticks = page.evaluate("[...document.querySelectorAll('#nl-bar .nl-num')].map(e=>+e.textContent)")
        assert ticks == [0, 3, 6, 9, 12, 15], f"skip-counting ticks of 3 expected, got {ticks}"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_mult_unknown_correct_scores_full(self, page):
        """Typing the missing factor on the first try scores full 20 and the
        report row records it (correct = the hidden factor)."""
        _enter_mult_unknown(page, 4, 2)                # 4 × □ = 8
        _dispatch_enter(page, "#mu-ans", 2)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("report[0].gotCorrect") is True
        assert page.evaluate("report[0].correct") == 2

    def test_mult_unknown_wrong_then_correct_is_partial(self, page):
        """A wrong factor logs a mistake (line stays up); the follow-up correct
        answer scores 67% of 20 = 13."""
        _enter_mult_unknown(page, 3, 4)                # 3 × □ = 12
        _dispatch_enter(page, "#mu-ans", 5)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display !== 'none'"), \
            "the number line stays visible through the retry"
        page.wait_for_function("document.getElementById('mu-ans').value===''", timeout=TIMEOUT)
        _dispatch_enter(page, "#mu-ans", 4)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_mult_unknown_pool_and_mulc_deck(self, page):
        """make('mulc') yields 3 problems on the champion grid (a,b ∈ 2..4) and
        the type lands in the built אַלּוּפָה deck."""
        _enter_mult_unknown(page)   # ensures the type file is loaded
        pool = page.evaluate("EXERCISES.types.mult_unknown.make('mulc')")
        assert len(pool) == 3
        assert all(2 <= p["a"] <= 4 and 2 <= p["b"] <= 4 for p in pool), f"bad pool: {pool}"
        page.evaluate("setMode('mulc')")
        page.wait_for_function("problems.length>0", timeout=TIMEOUT)
        assert page.evaluate("problems.some(p=>p.t===TMU)"), \
            "mult_unknown (TMU) must appear in the אַלּוּפָה pool"

    def test_line_moves_with_arrow_and_space(self, page):
        """The skip-counting line (shown from the start) responds to ←/→ AND to
        SPACE — each NL.step adds an arc; space must not type into the box."""
        _enter_mult_unknown(page, 3, 3)
        page.eval_on_selector("#mu-ans", "el=>el.focus()")
        a0 = page.evaluate("document.querySelectorAll('#nl-arcs-svg path').length")
        page.keyboard.press("ArrowRight"); page.wait_for_timeout(120)
        assert page.evaluate("document.querySelectorAll('#nl-arcs-svg path').length") == a0 + 1, \
            "→ arrow must hop the rider"
        page.keyboard.press("Space"); page.wait_for_timeout(120)
        assert page.evaluate("document.querySelectorAll('#nl-arcs-svg path').length") == a0 + 2, \
            "space must hop the rider"
        assert page.evaluate("document.getElementById('mu-ans').value.indexOf(' ')<0"), \
            "space must NOT type into the answer box"


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

    def test_perimeter_input_autofocused_on_mount(self, page):
        """The answer box is focused as soon as the exercise mounts, so the child
        can type the perimeter without clicking it first (user request)."""
        _enter_perim(page, "{t:TPP,shape:'square',sides:[3,3,3,3],a:12}")
        page.wait_for_function(
            "document.activeElement === document.querySelector('.pm-inp')", timeout=TIMEOUT)
        # a keystroke lands in the box with no prior click
        page.keyboard.type("12")
        assert page.evaluate("document.querySelector('.pm-inp').value") == "12", \
            "typing right after mount must fill the focused answer box"

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


def _enter_compare_sub(page, a, b, side, op, k, base):
    """Enter אַלּוּפָה, then force ONE compare problem whose `side` carries a
    sub-exercise (`base op k`, resolving to that side's value a/b)."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.compare==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(
        f"mode='mulc';score=0;problems=[{{t:TCP,a:{a},b:{b},"
        f"sub:{{side:'{side}',op:'{op}',k:{k},base:{base}}}}}];idx=0;loadProblem();")
    page.wait_for_selector(".cp-tile", timeout=TIMEOUT)
    page.wait_for_timeout(120)


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

    def test_compare_pool_weaves_a_sub_exercise_into_one_side(self, page):
        """Every generated compare problem now carries a '-1' sub-exercise on ONE
        operand; its base resolves back to that side's value (so the compared
        values — and thus the derived sign / report — are unchanged)."""
        _enter_compare(page, 3, 7)                    # just to load the type in mulc
        pool = page.evaluate("EXERCISES.types.compare.make('mulc')")
        assert len(pool) == 5
        for pr in pool:
            sub = pr["sub"]
            assert sub["side"] in ("a", "b")
            assert sub["op"] == "-" and sub["k"] == 1, "the initial step is subtract 1"
            val = pr["a"] if sub["side"] == "a" else pr["b"]
            assert sub["base"] - sub["k"] == val, "base − k must equal the side's value"

    def test_compare_sub_expression_renders_and_solves(self, page):
        """A '6 − 1' sub on side a (value 5) vs a bare 3: that side renders as an
        expression, so the child must compute 5 and compare 5 > 3; dragging '>'
        (derived from the COMPUTED values) scores full 20."""
        _enter_compare_sub(page, 5, 3, "a", "-", 1, 6)
        assert page.evaluate("!!document.querySelector('.cp-num.cp-expr')"), \
            "the sub side must render as an expression, not a bare number"
        expr = page.evaluate("document.querySelector('.cp-num.cp-expr').textContent")
        assert "6" in expr and "1" in expr, f"the expression must show base and k, got {expr!r}"
        nums = page.evaluate(
            "[...document.querySelectorAll('.cp-num')].map(e=>e.textContent.replace(/\\s/g,''))")
        assert "3" in nums, f"the other side stays a bare 3, got {nums!r}"
        _drag_sign(page, "gt")                        # 5 > 3
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20

    def test_compare_sub_expression_equal_after_computing(self, page):
        """Equal AFTER computing: '6 − 1' (=5) vs a bare 5 accepts only '=' — the
        child must resolve the sub-exercise to see the equality."""
        _enter_compare_sub(page, 5, 5, "a", "-", 1, 6)
        _drag_sign(page, "eq")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20

    def test_hover_a_sign_shows_its_meaning_as_circles(self, page):
        """Pointing at a sign tile shows a hover hint drawing its meaning as two
        circles — a BIG one on the greater side, a SMALL one on the lesser side
        (O > o), so the child grasps what each sign means. `<` mirrors it (o < O);
        `=` shows two equal circles."""
        _enter_compare(page, 7, 3)
        def circles(op):
            page.eval_on_selector(f'.cp-tile[data-op="{op}"]',
                                  "el=>el.dispatchEvent(new MouseEvent('mouseenter'))")
            page.wait_for_function(
                "document.querySelector('.cp-sign-tip').classList.contains('cp-tip-show')",
                timeout=TIMEOUT)
            sizes = page.evaluate(
                "[...document.querySelectorAll('.cp-sign-tip .cp-c')].map(c=>"
                "c.classList.contains('cp-big')?'big':c.classList.contains('cp-small')?'small':'mid')")
            page.eval_on_selector(f'.cp-tile[data-op="{op}"]',
                                  "el=>el.dispatchEvent(new MouseEvent('mouseleave'))")
            return sizes
        assert circles("gt") == ["big", "small"], "'>' → big on the left, small on the right"
        assert circles("lt") == ["small", "big"], "'<' → small on the left, big on the right"
        assert circles("eq") == ["mid", "mid"], "'=' → two equal circles"
        # the hint sits BELOW the button so it never covers it
        page.eval_on_selector('.cp-tile[data-op="gt"]', "el=>el.dispatchEvent(new MouseEvent('mouseenter'))")
        page.wait_for_function(
            "document.querySelector('.cp-sign-tip').classList.contains('cp-tip-show')", timeout=TIMEOUT)
        below = page.evaluate(
            "(()=>{const t=document.querySelector('.cp-tile[data-op=\"gt\"]').getBoundingClientRect();"
            "const p=document.querySelector('.cp-sign-tip').getBoundingClientRect();"
            "return p.top >= t.bottom;})()")
        assert below, "the hover hint must sit BELOW the button (not cover it)"
        page.eval_on_selector('.cp-tile[data-op="gt"]', "el=>el.dispatchEvent(new MouseEvent('mouseleave'))")
        # leaving hides the hint
        page.eval_on_selector('.cp-tile[data-op="eq"]', "el=>el.dispatchEvent(new MouseEvent('mouseleave'))")
        assert page.evaluate(
            "document.querySelector('.cp-sign-tip').classList.contains('cp-tip-show')") is False


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

    def test_staged_horizontal_operands_hover_shows_objects(self, page):
        """In the אַלּוּפָה horizontal-first stage (before any mistake) BOTH operands
        are hoverable (.eq-n[data-num]); hovering shows that many objects in the
        #num-tt tooltip."""
        _enter_staged_sub(page, "mulc", a=8, b=5)     # small so the tooltip is tidy
        assert page.evaluate(
            "document.querySelectorAll('.colxs-intro-eq .eq-n[data-num]').length") == 2, \
            "both operands must be hoverable"
        page.hover(".colxs-intro-eq .eq-n[data-num='8']")   # the minuend → 8 objects
        page.wait_for_function(
            "getComputedStyle(document.getElementById('num-tt')).display!=='none'"
            " && document.querySelectorAll('#num-tt .ntt-group > span').length===8", timeout=TIMEOUT)
        page.hover(".colxs-intro-eq .eq-n[data-num='5']")   # the subtrahend → 5 objects
        page.wait_for_function(
            "document.querySelectorAll('#num-tt .ntt-group > span').length===5", timeout=TIMEOUT)


# ─────────────────────────────────────────────────────────
# Three-addends-to-a-target (triple_sum / TTS) — `__ + __ + __ = 20`, the child
# picks three addends. Any triple that sums to the target is accepted EXCEPT that
# 0 and 10 are disallowed: a sum-correct 0/10 answer is praised, costs NO points
# and does NOT complete — she must retry with other numbers.
# ─────────────────────────────────────────────────────────

def _enter_triple(page, target=12):
    """Enter אַלּוּפָה, wait for the triple_sum type + built pool, then force ONE
    `__+__+__=target` problem and wait for its board (the real game target varies
    6..12; tests pin it for determinism)."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.triple_sum==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(f"mode='mulc';score=0;problems=[{{t:TTS,a:{target}}}];idx=0;loadProblem();")
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
        """Forcing TTS mounts three addend boxes + the target; no host check
        button, no number line."""
        _enter_triple(page, 12)
        assert page.evaluate("ptype === TTS")
        assert page.evaluate("document.querySelectorAll('.tsm-inp').length") == 3
        assert page.evaluate("(document.querySelector('.tsm-target')||{}).textContent") == "12"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_triple_sum_target_varies_and_is_6_to_14(self, page):
        """The target is NOT always the same — make() spreads it over 6..14 (user:
        reach up to 14), and the three cards in one pool carry DISTINCT targets."""
        _enter_triple(page)
        seen = set(page.evaluate(
            "(()=>{const s={};for(let i=0;i<60;i++)"
            "EXERCISES.types.triple_sum.make('mulc').forEach(p=>s[p.a]=1);"
            "return Object.keys(s).map(Number);})()"))
        assert len(seen) > 1, f"the target must vary, saw only {seen}"
        assert seen and all(6 <= t <= 14 for t in seen), f"targets must be 6..14, saw {seen}"
        assert any(t > 12 for t in seen), f"targets must now reach past 12 (up to 14), saw {seen}"
        one = page.evaluate("EXERCISES.types.triple_sum.make('mulc').map(p=>p.a)")
        assert len(set(one)) == len(one), f"one pool's targets must be distinct, got {one}"

    def test_triple_sum_valid_triple_scores_full(self, page):
        """A triple that sums to the target with no 0 and no 10 completes and
        scores full 20."""
        _enter_triple(page, 12)
        _triple_submit(page, 5, 4, 3)            # = 12, no 0/10
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("report[0].gotCorrect") is True

    def test_triple_sum_wrong_sum_is_a_mistake(self, page):
        """A triple that does NOT sum to the target is a normal mistake (penalty,
        not done)."""
        _enter_triple(page, 12)
        _triple_submit(page, 5, 5, 5)            # = 15 ≠ 12
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        assert page.evaluate("score") == 0

    def test_triple_sum_wrong_keeps_numbers_and_lets_her_fix(self, page):
        """A wrong sum must NOT erase what she typed (user request): the boxes keep
        their values + turn red (sad emoji shown), and she can FIX one number and
        submit again to solve — scoring the try-first-1 rate (13)."""
        _enter_triple(page, 12)
        _triple_submit(page, 5, 5, 5)            # = 15 ≠ 12
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        # the numbers she entered are STILL in the boxes (nothing wiped)
        page.wait_for_timeout(1300)              # well past the old 1.1s wipe timer
        vals = page.evaluate("[...document.querySelectorAll('.tsm-inp')].map(i=>i.value)")
        assert vals == ["5", "5", "5"], f"the entered numbers must be kept, got {vals}"
        assert page.evaluate("document.querySelectorAll('.tsm-inp.ans-err').length") == 3, \
            "the boxes must show the red error state"
        assert page.evaluate("done") is False
        # fix the last box 5 → 2 (5+5+2 = 12) and re-check
        page.evaluate("""() => {
            const ins=[...document.querySelectorAll('.tsm-inp')];
            ins[2].value='2'; ins[2].dispatchEvent(new Event('input',{bubbles:true}));
            ins[2].dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13, "fixing after one mistake scores 67% (13)"

    def test_triple_sum_zero_correct_but_not_accepted_no_penalty(self, page):
        """A sum-correct answer using 0 is praised but NOT completed and costs NO
        points — a later valid triple still scores the FULL 20."""
        _enter_triple(page, 12)
        _triple_submit(page, 8, 4, 0)            # sums to 12 but uses 0
        page.wait_for_timeout(300)
        assert page.evaluate("done") is False, "a 0 answer must not complete the problem"
        assert page.evaluate("tryFirst") == 0, "a 0 answer must NOT be penalised"
        assert page.evaluate("score") == 0
        page.wait_for_function(                  # boxes clear (~1.5s) for a retry
            "document.querySelector('.tsm-inp').value===''", timeout=TIMEOUT)
        _triple_submit(page, 5, 4, 3)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20, "no points may be lost on the 0 attempt"

    def test_triple_sum_ten_correct_but_not_accepted_no_penalty(self, page):
        """Same soft rule for a 10 (the shortcut at target 12): praised, no penalty,
        must retry with others."""
        _enter_triple(page, 12)
        _triple_submit(page, 10, 1, 1)           # sums to 12 but uses 10
        page.wait_for_timeout(300)
        assert page.evaluate("done") is False
        assert page.evaluate("tryFirst") == 0
        page.wait_for_function(
            "document.querySelector('.tsm-inp').value===''", timeout=TIMEOUT)
        _triple_submit(page, 5, 4, 3)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20

    def test_triple_sum_in_queen_and_superman_pools(self, page):
        """triple_sum is now woven into Queen (mx) and Superman (sup) too, not just
        אַלּוּפָה — and mx never leaves it (a self-mounting type) at slot 0."""
        for mode in ("mx", "sup", "mulc"):
            page.evaluate(f"setMode('{mode}')")
            page.wait_for_function(
                "typeof problems!=='undefined' && problems.length>0"
                " && typeof EXERCISES.types.triple_sum==='object'", timeout=TIMEOUT)
            assert page.evaluate("problems.some(p=>p.t===TTS)"), \
                f"triple_sum (TTS) must appear in the '{mode}' pool"
        # mx guard: a self-mounting type must never sit at slot 0
        assert page.evaluate(
            "(()=>{for(let i=0;i<25;i++){const p=makePool('mx');"
            "if([TCS,TMC,TPG,TTS].includes(p[0].t))return false;}return true;})()"), \
            "mx must never leave a self-mounting type (incl. TTS) at slot 0"


# ─────────────────────────────────────────────────────────
# "חִלּוּק שָׁווֶה בְּשָׁווֶה" (half / THF) — the first taste of DIVISION: friends
# share items EQUALLY, k=2 OR k=3 (totals up to 16). Tapping the items toggles
# golden divider lines that split them into k equal groups; the child types how
# many EACH gets (n ÷ k). A wrong answer auto-opens the split.
# ─────────────────────────────────────────────────────────

def _enter_half(page, n=8, k=2):
    """Enter אַלּוּפָה, wait for the half type + built pool, then force ONE
    share-equally problem (n items among k friends) and wait for its board."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.half==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(
        f"mode='mulc';score=0;problems=[{{t:THF,n:{n},k:{k},a:{n//k},item:'🍎',"
        f"itemName:'תַּפּוּחִים',names:['דָּנָה','נֹעָה','רוֹנִי']}}];idx=0;loadProblem();")
    page.wait_for_selector(".hf-inp", timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestHalfSplit:
    def test_half_loads_and_mounts(self, page):
        """Forcing THF mounts the story + n items pre-grouped in two equal groups,
        split line hidden; no host check button, no number line."""
        _enter_half(page, 8)
        assert page.evaluate("ptype === THF")
        assert page.evaluate("document.querySelectorAll('.hf-item').length") == 8
        halves = page.evaluate("[...document.querySelectorAll('.hf-grp')].map(h=>h.children.length)")
        assert halves == [4, 4], f"items must sit in two equal groups, got {halves}"
        assert not page.evaluate("!!document.querySelector('.hf-root.hf-split')"), \
            "the split line must start hidden"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_half_items_start_as_one_continuous_row(self, page):
        """Before any tap/mistake the n items must read as ONE unbroken row —
        the middle gap equals the regular in-row gap (a visible grouping would
        give the halves away); the tap opens a clearly wider middle gap."""
        _enter_half(page, 8)
        gaps_js = ("(() => {const r=[...document.querySelectorAll('.hf-item')]"
                   ".map(el=>el.getBoundingClientRect());"
                   "return r.slice(1).map((b,i)=>b.left-r[i].right);})()")
        gaps = page.evaluate(gaps_js)
        assert len(gaps) == 7
        assert max(gaps) - min(gaps) <= 3, \
            f"pre-split the row must look continuous (uniform gaps), got {gaps}"
        page.click(".hf-stage")
        page.wait_for_function("!!document.querySelector('.hf-root.hf-split')", timeout=TIMEOUT)
        page.wait_for_timeout(700)                    # let the .45s split settle
        gaps = page.evaluate(gaps_js)
        mid, rest = gaps[3], gaps[:3] + gaps[4:]
        assert mid > max(rest) + 8, \
            f"after the tap the MIDDLE gap must be clearly wider, got mid={mid}, rest={rest}"

    def test_half_split_animates_no_layout_properties(self, page):
        """PERF: the split must animate ONLY transform + paint (border/background),
        NEVER a layout property (width/margin/padding/left/top) — so it can't reflow
        the row every frame (that's what janked it over the heavy unicorn scene)."""
        _enter_half(page, 9, 3)
        page.click(".hf-stage")
        page.wait_for_function("!!document.querySelector('.hf-root.hf-split')", timeout=TIMEOUT)
        props = page.evaluate("""() => {
            const line=document.querySelector('.hf-line'), grp=document.querySelector('.hf-grp');
            return getComputedStyle(line).transitionProperty + ',' + getComputedStyle(grp).transitionProperty;
        }""")
        for bad in ("width", "margin", "padding", "left", "top"):
            assert bad not in props, \
                f"the split must NOT transition the layout property '{bad}' (got {props!r})"

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

    def test_half_pool_mixes_div2_and_div3_up_to_16(self, page):
        """make('mulc') builds a MIX of ÷2 (even totals 8..16) and ÷3 (multiples of
        three 6..15); every total divides EXACTLY by its k, the answer is n/k, and
        no total exceeds 16 (user: divide up to 16, also by 3)."""
        _enter_half(page)   # ensures the half type file is loaded
        pool = page.evaluate("EXERCISES.types.half.make('mulc').map(p=>({n:p.n,k:p.k,a:p.a}))")
        assert all(p["a"] * p["k"] == p["n"] for p in pool), f"answers must be exact n/k: {pool}"
        assert all(p["n"] <= 16 for p in pool), f"no total may exceed 16: {pool}"
        ks = {p["k"] for p in pool}
        assert ks == {2, 3}, f"the pool must MIX ÷2 and ÷3, got ks={sorted(ks)}"

    def test_half_14_splits_into_two_sevens_and_solves(self, page):
        """A total of 14 mounts 7 items each side; typing 7 solves it (full 20)."""
        _enter_half(page, 14)
        assert page.evaluate("document.querySelectorAll('.hf-item').length") == 14
        halves = page.evaluate("[...document.querySelectorAll('.hf-grp')].map(h=>h.children.length)")
        assert halves == [7, 7], f"14 must split into two equal groups of 7, got {halves}"
        _dispatch_enter(page, ".hf-inp", 7)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20

    def test_half_div3_splits_into_three_groups_and_solves(self, page):
        """A ÷3 problem (9 among 3) mounts 3 equal groups of 3 with 2 divider lines
        and 3 kid emojis; typing n/3 = 3 solves it (full 20)."""
        _enter_half(page, 9, 3)
        assert page.evaluate("document.querySelectorAll('.hf-item').length") == 9
        groups = page.evaluate("[...document.querySelectorAll('.hf-grp')].map(g=>g.children.length)")
        assert groups == [3, 3, 3], f"9 among 3 must be three groups of 3, got {groups}"
        assert page.evaluate("document.querySelectorAll('.hf-line').length") == 2, \
            "three groups need two divider lines"
        assert page.evaluate("document.querySelectorAll('.hf-kid').length") == 3, \
            "÷3 must show three kid emojis"
        _dispatch_enter(page, ".hf-inp", 3)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20

    def test_half_14_fits_the_card_on_a_narrow_phone(self, page):
        """The 14-item row (no wrap — the halves must flank the middle line) must
        auto-shrink to fit the card on a narrow phone, with no horizontal
        overflow. The auto-fit runs on mount; desktop keeps full-size emoji."""
        page.set_viewport_size({"width": 360, "height": 780})
        _enter_half(page, 14)
        page.wait_for_timeout(150)   # let the rAF auto-fit settle
        fit = page.evaluate("""() => {
            const stage=document.querySelector('.hf-stage');
            const root=document.querySelector('.hf-root');
            return {stage: stage.getBoundingClientRect().width,
                    root: root.clientWidth,
                    pageScroll: document.documentElement.scrollWidth,
                    win: window.innerWidth};
        }""")
        assert fit["stage"] <= fit["root"] + 1, \
            f"the 14-item stage must fit within the card, got {fit}"
        assert fit["pageScroll"] <= fit["win"] + 2, \
            f"the 14-item board must not cause horizontal page scroll, got {fit}"


# ─────────────────────────────────────────────────────────
# "צַלָּחוֹת" (plates / TPL) — equal groups → TOTAL, the multiplication word
# problem (the inverse of half): g plates (2..4) each holding s items (2..4),
# only products ≤ 10 (the first multiplication facts). The child solves from the
# WORDS alone (try-first); the picture is HIDDEN until a mistake. The 1st mistake
# REVEALS the plates, the 2nd POURS them into one countable row. Once revealed,
# tapping toggles plates ↔ row.
# ─────────────────────────────────────────────────────────

def _enter_plates(page, g=2, s=3):
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
        """Forcing TPL mounts the story + answer input; no host check button, no
        number line."""
        _enter_plates(page, 2, 3)
        assert page.evaluate("ptype === TPL")
        assert page.evaluate("!!document.querySelector('.pl-inp')")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_plates_picture_hidden_until_mistake(self, page):
        """The equal-groups picture is HIDDEN at first — the child must solve from
        the words alone (try-first). No plates, no poured row on load."""
        _enter_plates(page, 2, 3)
        assert page.evaluate(
            "getComputedStyle(document.querySelector('.pl-stage')).display === 'none'"), \
            "the plate stage must be hidden until a mistake"
        assert page.evaluate("document.querySelectorAll('.pl-plate').length === 0")
        assert page.evaluate("!document.querySelector('.pl-rowv')")

    def test_plates_first_mistake_reveals_plates(self, page):
        """The 1st wrong answer REVEALS the g plates (each holding s items) — the
        equal groups — but does NOT yet pour them into a row."""
        _enter_plates(page, 2, 3)
        _dispatch_enter(page, ".pl-inp", 5)           # wrong (correct is 6)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        page.wait_for_function("document.querySelectorAll('.pl-plate').length===2", timeout=TIMEOUT)
        per = page.evaluate("[...document.querySelectorAll('.pl-plate')].map(p=>p.children.length)")
        assert per == [3, 3], f"2 plates of 3 items expected, got {per}"
        assert page.evaluate("!document.querySelector('.pl-rowv')"), \
            "the 1st mistake reveals plates, it must not pour the row yet"

    def test_plates_second_mistake_pours_row(self, page):
        """After the plates are shown, a 2nd wrong answer POURS all items into one
        countable row (count them one by one)."""
        _enter_plates(page, 2, 3)
        _dispatch_enter(page, ".pl-inp", 5)           # 1st wrong → reveal plates
        page.wait_for_function("document.querySelectorAll('.pl-plate').length===2", timeout=TIMEOUT)
        page.wait_for_function("document.querySelector('.pl-inp').value===''", timeout=TIMEOUT)
        _dispatch_enter(page, ".pl-inp", 4)           # 2nd wrong → pour the row
        page.wait_for_function(
            "document.querySelector('.pl-rowv') && document.querySelector('.pl-rowv').children.length===6",
            timeout=TIMEOUT)

    def test_plates_tap_toggles_after_reveal(self, page):
        """Once revealed (after a mistake), tapping the stage pours the items into a
        row; tapping again puts them back on the plates."""
        _enter_plates(page, 2, 3)
        _dispatch_enter(page, ".pl-inp", 5)           # reveal the plates
        page.wait_for_function("document.querySelectorAll('.pl-plate').length===2", timeout=TIMEOUT)
        page.click(".pl-stage")
        page.wait_for_function(
            "document.querySelector('.pl-rowv') && document.querySelector('.pl-rowv').children.length===6",
            timeout=TIMEOUT)
        page.click(".pl-stage")
        page.wait_for_function("document.querySelectorAll('.pl-plate').length===2", timeout=TIMEOUT)

    def test_plates_correct_first_try_scores_full(self, page):
        """Typing g×s on the first try (no picture needed) scores full 20."""
        _enter_plates(page, 4, 2)
        assert page.evaluate(
            "getComputedStyle(document.querySelector('.pl-stage')).display === 'none'")
        _dispatch_enter(page, ".pl-inp", 8)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("report[0].gotCorrect") is True

    def test_plates_wrong_then_correct_is_partial(self, page):
        """One wrong answer (reveals the plates) then the correct total scores 67%
        of 20 = 13."""
        _enter_plates(page, 2, 3)
        _dispatch_enter(page, ".pl-inp", 5)           # wrong (correct is 6)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        page.wait_for_function("document.querySelector('.pl-inp').value===''", timeout=TIMEOUT)
        _dispatch_enter(page, ".pl-inp", 6)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_plates_pool_is_products_up_to_10(self, page):
        """make('mulc') builds 3 problems, plates/per-plate both 2..4, product ≤ 10
        (the first multiplication facts), answer g×s."""
        _enter_plates(page)   # ensures the plates type file is loaded
        pool = page.evaluate("EXERCISES.types.plates.make('mulc').map(p=>({g:p.g,s:p.s,a:p.a}))")
        assert len(pool) == 3
        assert all(2 <= p["g"] <= 4 and 2 <= p["s"] <= 4 and p["a"] == p["g"] * p["s"]
                   and p["a"] <= 10
                   for p in pool), f"bad pool: {pool}"


# ─────────────────────────────────────────────────────────
# "חֲנוּת הַגְּלִידָה" (ice_cream / TIC) — she HAS ₪budget and buys accordingly:
# every ice cream costs ₪2/₪5/₪10; ＋ buys one (it lands in the tray WITH its
# price coin, so the spending is skip-countable) and she types how many fit
# in the budget (budget ÷ price — division as "how many groups").
# ─────────────────────────────────────────────────────────

def _enter_ice(page, budget=12, price=2):
    """Enter אַלּוּפָה, wait for the ice_cream type + built pool, then force ONE
    shop problem and wait for its board."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.ice_cream==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(
        f"mode='mulc';score=0;problems=[{{t:TIC,a:{budget},b:{price},name:'דָּנָה'}}];"
        f"idx=0;loadProblem();")
    page.wait_for_selector(".ic-inp", timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestIceCreamShop:
    def test_ice_cream_in_mulc_pool(self, page):
        """make('mulc') yields 3 TIC problems — one of EACH price (₪2/₪5/₪10),
        budget divisible by the price (2..10 ice creams) — and TIC lands in the
        built אַלּוּפָה deck."""
        _enter_ice(page)   # ensures the ice_cream type file is loaded
        pool = page.evaluate("EXERCISES.types.ice_cream.make('mulc').map(p=>({a:p.a,b:p.b}))")
        assert len(pool) == 3
        assert sorted(p["b"] for p in pool) == [2, 5, 10], f"one problem per price: {pool}"
        assert all(p["a"] % p["b"] == 0 and 2 <= p["a"] // p["b"] <= 10
                   for p in pool), f"budget must divide exactly into 2..10: {pool}"
        page.evaluate("setMode('mulc')")
        page.wait_for_function(
            "typeof problems!=='undefined' && problems.length>0", timeout=TIMEOUT)
        assert page.evaluate("problems.some(p=>p.t===TIC)"), \
            "ice_cream (TIC) must appear in the אַלּוּפָה pool"

    def test_ice_cream_loads_and_mounts(self, page):
        """Forcing TIC mounts the shop: budget in the title, price coin, empty
        tray, buy/refund controls; no host check button, no number line."""
        _enter_ice(page, 12, 2)
        assert page.evaluate("ptype === TIC")
        assert page.evaluate("document.querySelector('.ic-q').textContent").find("₪12") >= 0
        assert page.evaluate("document.querySelectorAll('.ic-buy').length") == 0
        assert page.evaluate("!!document.getElementById('ic-add')")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_ice_cream_buy_adds_scoop_with_its_price_coin(self, page):
        """＋ buys one ice cream — it lands in the tray WITH the price coin under
        it (the real SVG coin, so the spending is skip-countable); − refunds it."""
        _enter_ice(page, 12, 2)
        page.click("#ic-add")
        assert page.evaluate("document.querySelectorAll('.ic-buy').length") == 1
        assert page.evaluate("!!document.querySelector('.ic-buy svg')"), \
            "each bought ice cream must carry the real price-coin SVG"
        assert not page.evaluate("!!document.querySelector('.ic-coin-fallback')"), \
            "the real coin art (coins.ex.js) must be loaded in mulc"
        page.click("#ic-rem")
        assert page.evaluate("document.querySelectorAll('.ic-buy').length") == 0

    def test_ice_cream_plus_allows_overshoot_past_answer(self, page):
        """＋ must NOT disable at the correct count (that would reveal the answer);
        it allows ordering up to need+3."""
        _enter_ice(page, 12, 2)          # need = 6
        for _ in range(9):
            page.click("#ic-add")
        assert page.evaluate("document.querySelectorAll('.ic-buy').length") == 9, \
            "the shop must allow over-ordering past the answer (6) up to 9"
        assert page.evaluate("document.getElementById('ic-add').disabled") is True

    def test_ice_cream_space_buys(self, page):
        """Pressing SPACE buys an ice cream (touch/keyboard parity with the other
        coin exercises)."""
        _enter_ice(page, 10, 5)
        page.keyboard.press("Space")
        page.wait_for_function(
            "document.querySelectorAll('.ic-buy').length === 1", timeout=TIMEOUT)

    def test_ice_cream_correct_count_solves_full(self, page):
        """The answer is the COUNT of ice creams (budget ÷ price) — 12÷2=6 solves
        with full mulc points (20). Typing the budget itself is NOT the answer."""
        _enter_ice(page, 12, 2)
        _dispatch_enter(page, ".ic-inp", 6)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("report[0].gotCorrect") is True

    def test_ice_cream_wrong_directional_then_partial(self, page):
        """Too many → 'not enough money' feedback + a logged mistake; the follow-up
        correct answer scores 67% of 20 = 13."""
        _enter_ice(page, 20, 5)          # need = 4
        _dispatch_enter(page, ".ic-inp", 6)   # she can't afford 6
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        hint = page.evaluate("document.getElementById('hint').textContent")
        assert "כֶּסֶף" in hint, f"feedback must talk about the money, got: {hint}"
        page.wait_for_function("document.querySelector('.ic-inp').value===''", timeout=TIMEOUT)
        _dispatch_enter(page, ".ic-inp", 4)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_ice_cream_mistake_opens_xprice_number_line(self, page):
        """A wrong answer opens the multiplication number line with jumps of the
        PRICE (₪10 → 0,10,20,…, one jump past the budget) so she can skip-count
        the spending. Hidden until the mistake."""
        _enter_ice(page, 40, 10)          # ₪40, ₪10 each → 4 ice creams
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'"), \
            "the number line must be hidden until a mistake"
        _dispatch_enter(page, ".ic-inp", 7)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display !== 'none'"), \
            "a wrong answer must reveal the number line"
        ticks = page.evaluate("[...document.querySelectorAll('#nl-bar .nl-num')].map(e=>+e.textContent)")
        assert ticks == [0, 10, 20, 30, 40, 50], f"jumps of the ₪10 price expected, got {ticks}"

    def test_ice_cream_mistake_clears_the_tray(self, page):
        """When the number line appears (on a mistake), the bought ice creams are
        wiped so she re-counts from zero on the line; SPACE then adds the first
        ice cream again."""
        _enter_ice(page, 40, 10)          # ₪40, ₪10 each → 4 ice creams
        for _ in range(5):                # buy a few (an overshoot)
            page.click("#ic-add")
        page.wait_for_function("document.querySelectorAll('.ic-buy').length === 5", timeout=TIMEOUT)
        _dispatch_enter(page, ".ic-inp", 7)   # wrong
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        # tray emptied to zero, and the empty tray goes back to its blank state
        assert page.evaluate("document.querySelectorAll('.ic-buy').length") == 0, \
            "a mistake must clear the bought ice creams"
        assert page.evaluate("document.querySelector('.ic-tray').classList.contains('ic-tray-blank')"), \
            "the emptied tray returns to its blank (invisible) state"
        # SPACE now adds the FIRST ice cream again
        page.keyboard.press("Space")
        page.wait_for_function(
            "document.querySelectorAll('.ic-buy').length === 1", timeout=TIMEOUT)

    def test_ice_cream_input_focused_on_load(self, page):
        """The answer box is focused when the shop loads (so typing / the mobile
        numpad work at once) — not the ＋ button. SPACE still buys."""
        _enter_ice(page, 30, 10)
        assert page.evaluate("document.activeElement && document.activeElement.id === 'ic-ans'"), \
            "the answer input must be focused on load"


# ─────────────────────────────────────────────────────────
# "בְּעָיוֹת מִלּוּלִיּוֹת" (word_prob / TWP) — short nikud story problems. Numbers are
# spelled out with gender agreement. Hebrew number grammar for 2 is POLAR:
#   • before a counted noun → the CONSTRUCT form (שְׁתֵּי / שְׁנֵי)
#   • standing ALONE (e.g. "אָכַל … מֵהֶן") → the ABSOLUTE form (שְׁתַּיִם / שְׁנַיִם)
# Only the candies story ("… אָכַל B מֵהֶן") puts B in a standalone slot; every
# other operand sits directly before its noun. NOTE: the niqqud below is
# load-bearing — without it the construct שְׁתֵּי is a substring of the absolute
# שְׁתַּיִם and the two can't be told apart.
# ─────────────────────────────────────────────────────────

def _load_wordprob(page):
    """Enter אַלּוּפָה (mulc) so the word_prob type file loads, then wait for it."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.word_prob==='object'",
        timeout=TIMEOUT)


class TestWordProblems:
    def test_two_before_mehen_uses_absolute_form(self, page):
        """After 'אָכַל … מֵהֶן' the number 2 stands ALONE → it must render the
        ABSOLUTE שְׁתַּיִם, never the construct שְׁתֵּי (which only fits before a noun)."""
        _load_wordprob(page)
        res = page.evaluate("""() => {
            const P=EXERCISES.types.word_prob, tmp=document.createElement('div');
            let mehenB2=0, absolute=0, badConstruct=0;
            for(let k=0;k<400;k++){
                for(const pr of P.make('wp')){
                    tmp.innerHTML=pr.story; const t=tmp.textContent;
                    if(t.indexOf('מֵהֶן')<0) continue;              // only the candies story
                    if(pr.op==='sub' && pr.b===2){
                        mehenB2++;
                        if(t.indexOf('שְׁתַּיִם')>=0) absolute++;
                        if(t.indexOf('שְׁתֵּי')>=0) badConstruct++;
                    }
                }
            }
            return {mehenB2, absolute, badConstruct};
        }""")
        assert res["mehenB2"] > 0, "the candies (b=2) story must actually occur in the pool"
        assert res["badConstruct"] == 0, \
            f"שְׁתֵּי (construct) must never precede מֵהֶן, found {res['badConstruct']}"
        assert res["absolute"] == res["mehenB2"], \
            f"every candies b=2 story must render שְׁתַּיִם, got {res['absolute']}/{res['mehenB2']}"

    def test_two_before_noun_stays_construct(self, page):
        """The fix must not leak the absolute form into the ordinary 'number + noun'
        slot: whenever 2 sits directly before its counted noun the construct
        שְׁתֵּי / שְׁנֵי must stay (the absolute שְׁתַּיִם / שְׁנַיִם must not appear)."""
        _load_wordprob(page)
        res = page.evaluate("""() => {
            const P=EXERCISES.types.word_prob, tmp=document.createElement('div');
            let nounTwo=0, absoluteLeak=0;
            for(let k=0;k<400;k++){
                for(const pr of P.make('wp')){
                    tmp.innerHTML=pr.story; const t=tmp.textContent;
                    if(t.indexOf('מֵהֶן')>=0) continue;            // skip the one standalone slot
                    if(pr.a===2 || pr.b===2){                      // an operand of 2 before its noun
                        nounTwo++;
                        if(t.indexOf('שְׁתַּיִם')>=0 || t.indexOf('שְׁנַיִם')>=0) absoluteLeak++;
                    }
                }
            }
            return {nounTwo, absoluteLeak};
        }""")
        assert res["nounTwo"] > 0, "a 2-before-noun story must occur (operands can be 2)"
        assert res["absoluteLeak"] == 0, \
            f"the absolute form must not appear before a noun, leaked {res['absoluteLeak']}"


# ─────────────────────────────────────────────────────────
# "בְּעָיוֹת שַׁרְשֶׁרֶת" (word_chain / TWC) — a CHAIN word problem: a start, then two
# more steps (+/−) told in a nikud story (קיבל 2, קיבל עוד 2, נתן 4 → 2+2−4). Every
# step and the final result stay in 0..12. On a mistake the bare DIGIT chain is
# revealed to retry (graded 100/75/50/0). Mixed into אַלּוּפָה (mulc).
# ─────────────────────────────────────────────────────────

def _enter_word_chain(page):
    """Enter אַלּוּפָה, wait for the word_chain type + built pool, then force a batch
    of REAL chain stories (from make('wc')) and wait for the first card."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.word_chain==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate("mode='mulc';score=0;problems=EXERCISES.types.word_chain.make('wc');idx=0;loadProblem();")
    page.wait_for_selector(".wc-inp", timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestWordChain:
    def test_word_chain_loads_and_mounts(self, page):
        """Forcing TWC mounts the nikud story (three spelled numbers) + an answer
        box; the derived digit chain is hidden; no host check button, no number line."""
        _enter_word_chain(page)
        assert page.evaluate("ptype === TWC")
        assert page.evaluate("!!document.querySelector('.wc-story')")
        assert page.evaluate("document.querySelectorAll('.wc-story .wc-num').length") == 3, \
            "the story must spell out all three chain numbers (tappable)"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('wc-derived')).display === 'none'"), \
            "the bare digit chain must stay hidden until a mistake"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")

    def test_word_chain_results_are_0_to_12(self, page):
        """Every generated chain has operands ≥2 and keeps every step AND the final
        result within 0..12 (user: 'מספרים עד 12 בתוצאה')."""
        _enter_word_chain(page)
        bad = page.evaluate("""() => {
            const out=[];
            for(let k=0;k<60;k++){
                for(const p of EXERCISES.types.word_chain.make('wc')){
                    const r1 = p.ops[0]==='sub'? p.a-p.b : p.a+p.b;
                    const r2 = p.ops[1]==='sub'? r1-p.c : r1+p.c;
                    if(p.a<2||p.b<2||p.c<2||r1<0||r1>12||r2<0||r2>12) out.push(p);
                }
            }
            return out;
        }""")
        assert bad == [], f"every step + result must be 0..12 with operands ≥2, offenders: {bad}"

    def test_word_chain_host_result_matches_chain(self, page):
        """The host's computed answer (report.correct, via core.js _wc) equals the
        left-to-right chain result."""
        _enter_word_chain(page)
        ok = page.evaluate("""() => {
            const p=problems[0];
            const r1 = p.ops[0]==='sub'? p.a-p.b : p.a+p.b;
            const r2 = p.ops[1]==='sub'? r1-p.c : r1+p.c;
            return report[0].correct === r2;
        }""")
        assert ok, "core.js _wc must match the chain result"

    def test_word_chain_correct_scores_full(self, page):
        """Solving the story on the first try scores the full 20."""
        _enter_word_chain(page)
        page.evaluate("""() => {
            const inp=document.getElementById('wc-inp');
            inp.value=String(report[0].correct);
            inp.dispatchEvent(new Event('input',{bubbles:true}));
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("report[0].gotCorrect") is True

    def test_word_chain_wrong_reveals_digit_chain_then_partial(self, page):
        """A wrong answer reveals the bare DIGIT chain (a op1 b op2 c =, two
        operators) WITH an intermediate running-sum box (like the regular chains);
        solving the final box scores 75% of 20 = 15."""
        _enter_word_chain(page)
        page.evaluate("""() => {
            const inp=document.getElementById('wc-inp');
            inp.value=String(report[0].correct + 1);       // guaranteed wrong
            inp.dispatchEvent(new Event('input',{bubbles:true}));
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")
        page.wait_for_function(
            "getComputedStyle(document.getElementById('wc-derived')).display !== 'none'",
            timeout=TIMEOUT)
        # the revealed chain is a real 3-term chain: two operators + an INTERMEDIATE
        # running-sum box (data-exp = the running total after the first two terms)
        assert page.evaluate("document.querySelectorAll('.wc-chain .wc-op').length") == 2, \
            "the derived chain must show two operators"
        box = page.evaluate("""() => {
            const b=document.querySelector('.wc-box'); const p=problems[0];
            const r1 = p.ops[0]==='sub'? p.a-p.b : p.a+p.b;
            return {present:!!b, exp:b?+b.getAttribute('data-exp'):null, r1};
        }""")
        assert box["present"], "the derived chain must show an intermediate running-sum box"
        assert box["exp"] == box["r1"], \
            f"the intermediate box must expect the running total {box['r1']}, got {box['exp']}"
        page.evaluate("""() => {
            const inp=document.getElementById('wc-inp2');
            inp.value=String(report[0].correct);
            inp.dispatchEvent(new Event('input',{bubbles:true}));
            inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }""")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 15, "one mistake then solving the chain scores 75% (15)"

    def test_word_chain_in_mulc_pool(self, page):
        """word_chain (TWC) is woven into the אַלּוּפָה pool."""
        page.evaluate("setMode('mulc')")
        page.wait_for_function(
            "typeof problems!=='undefined' && problems.length>0"
            " && typeof EXERCISES.types.word_chain==='object'", timeout=TIMEOUT)
        assert page.evaluate("problems.some(p=>p.t===TWC)"), \
            "word_chain (TWC) must appear in the אַלּוּפָה pool"


# ─────────────────────────────────────────────────────────
# "סִפּוּר וְשְׁאֵלָה" (story_quiz / TSQ) — READING comprehension: a short nikud
# story (≤4 lines, age-7 level; topics חלל/חדי קרן/דינוזאורים/נסיכות) + ONE
# multiple-choice question with vowelled answers. Tap an answer to SELECT, press
# the ✓ to SUBMIT — only then is it judged. Woven into Superman + אַלּוּפָה at ONE
# PER 5 EXERCISES (deck slots 5/10/15/20).
# ─────────────────────────────────────────────────────────

# Hebrew niqqud combining marks (U+05B0–U+05BC, U+05C1/2/7) — a vowelled text test
_NIQQUD = tuple(chr(c) for c in list(range(0x05B0, 0x05BD)) + [0x05C1, 0x05C2, 0x05C7])


def _has_niqqud(s):
    return any(ch in s for ch in _NIQQUD)


def _enter_story(page, mode="mulc"):
    """Enter sup/mulc, wait for the story_quiz type + built pool, then force ONE
    real story card (from make) and wait for its board."""
    page.evaluate(f"setMode('{mode}')")
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.story_quiz==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(
        f"mode='{mode}';score=0;problems=EXERCISES.types.story_quiz.make('{mode}');idx=0;loadProblem();")
    page.wait_for_selector(".sq-opt", timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestStoryQuiz:
    def test_story_quiz_mounts_with_nikud_story_and_options(self, page):
        """Forcing TSQ mounts the vowelled story (≤4 lines), the question, ≥3
        vowelled answer options and the module's own ✓ submit; no #ans box, no
        number line, host check button hidden."""
        _enter_story(page)
        assert page.evaluate("ptype === TSQ")
        res = page.evaluate("""() => ({
            story: document.querySelector('.sq-story').textContent,
            q: document.querySelector('.sq-q').textContent,
            opts: [...document.querySelectorAll('.sq-opt')].map(o=>o.textContent),
            hasChk: !!document.querySelector('.sq-chk'),
            hasAns: !!document.getElementById('ans'),
            nl: getComputedStyle(document.getElementById('nl-panel')).display,
            hostChk: getComputedStyle(document.getElementById('chk-btn')).display,
        })""")
        assert _has_niqqud(res["story"]), "the story must be vowelled (nikud)"
        assert _has_niqqud(res["q"]), "the question must be vowelled"
        assert len(res["opts"]) >= 3 and all(_has_niqqud(o) for o in res["opts"]), \
            f"all answers must be vowelled, got {res['opts']}"
        assert res["hasChk"] and not res["hasAns"]
        assert res["nl"] == "none" and res["hostChk"] == "none"

    def test_story_quiz_card_shows_no_emoji_picture_clue(self, page):
        """The card must be TEXT ONLY. A topic emoji over the story (🚀 for a
        space story) let the child match the picture to the "חֲלָלִית" option and
        answer WITHOUT READING — the whole point of the exercise. Guards the
        story, the question AND the options against any pictographic character,
        over many cards so every topic is covered."""
        _enter_story(page)
        res = page.evaluate("""() => {
            const EX = EXERCISES.types.story_quiz;
            // every card in the library, rendered text-side: story + q + options
            const pool = EX.make('story');
            const PICT = /[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{FE0F}\\u{2B00}-\\u{2BFF}]/u;
            const bad = [];
            pool.forEach(p => {
                const txt = (p.lines || []).join(' ') + ' ' + (p.q || '') + ' ' + (p.opts || []).join(' ');
                const m = txt.match(PICT);
                if (m) bad.push(p.topic + ': ' + m[0]);
            });
            return {
                bad,
                emojiEl: !!document.querySelector('.sq-emoji'),
                mountedStory: document.querySelector('.sq-story').textContent,
                storyTags: [...document.querySelector('.sq-story').children].map(c => c.tagName),
            };
        }""")
        assert not res["emojiEl"], "the .sq-emoji picture clue must not be rendered"
        assert set(res["storyTags"]) <= {"BR"}, \
            f"the story block must hold plain text lines only (line breaks), got {res['storyTags']}"
        assert res["bad"] == [], f"story/question/options must carry no emoji clue: {res['bad']}"
        assert _has_niqqud(res["mountedStory"])

    def test_reading_cards_one_per_four_and_no_type_dropped(self, page):
        """The built Superman AND אַלּוּפָה decks carry a READING card at EVERY 4th
        slot (indexes 3/7/11/15/19 → positions 4/8/12/16/20) — exactly
        READING_SLOTS=5 DISTINCT kinds per 20-card deck (with 6 kinds registered
        the kinds ROTATE across games, so the cadence never exceeds 1-per-4).
        Crucially, weaving the reading cards must NOT drop any arithmetic type —
        every base type still appears (splice inserts, the cap preserves
        coverage). Checked across several shuffled builds. mulc slot 0 stays a
        mult_champ card."""
        BASE = {
            "sup": ['column_add', 'big_step', 'coin_mul', 'bagel_cost', 'column_sub',
                    'hundreds', 'mult_chain', 'triple_sum', 'polygon'],
            "mulc": ['mult_champ', 'perimeter', 'column_sub', 'column_add', 'compare',
                     'word_prob', 'word_chain', 'triple_sum', 'half', 'plates',
                     'coin_mul', 'bagel_cost', 'ice_cream', 'mult_unknown'],
        }
        for mode in ("sup", "mulc"):
            page.evaluate(f"setMode('{mode}')")
            page.wait_for_function(
                "typeof problems!=='undefined' && problems.length>0"
                " && typeof EXERCISES.types.story_quiz==='object'"
                " && typeof EXERCISES.types.sent_order==='object'"
                " && typeof EXERCISES.types.rhyme==='object'", timeout=TIMEOUT)
            res = page.evaluate("""(base)=>{
                const R=[TSQ,TCZ,TTF,TWM,TSO,TRH];
                const expected=base.map(k=>EXERCISES.types[k]&&EXERCISES.types[k].t).filter(Boolean);
                let bad=null;const everKind=new Set();
                for(let iter=0;iter<8 && !bad;iter++){
                    const d=makePool(mode);
                    const at=d.map((p,i)=>R.includes(p.t)?i:-1).filter(i=>i>=0);
                    const kinds=new Set(d.filter(p=>R.includes(p.t)).map(p=>p.t));
                    kinds.forEach(k=>everKind.add(k));
                    const nonReading=new Set(d.filter(p=>!R.includes(p.t)).map(p=>p.t));
                    const missing=expected.filter(t=>!nonReading.has(t));
                    if(d.length!==20) bad={reason:'len',len:d.length};
                    else if(JSON.stringify(at)!=='[3,7,11,15,19]') bad={reason:'slots',at};
                    else if(kinds.size!==READING_SLOTS) bad={reason:'kinds',kinds:[...kinds]};
                    else if(missing.length) bad={reason:'dropped',missing};
                }
                return {bad,expectedCount:expected.length,everKind:[...everKind],
                        first:makePool(mode)[0].t};
            }""", BASE[mode])
            assert res["bad"] is None, f"{mode}: {res['bad']}"
            # the rotation must eventually serve EVERY kind — none is permanently starved
            assert len(res["everKind"]) == 6, \
                f"{mode}: over 8 builds all six reading kinds must appear, got {res['everKind']}"
            if mode == "mulc":
                assert res["first"] == page.evaluate("TMK"), "mulc slot 0 must stay mult_champ"

    def test_story_quiz_submit_needs_selection_then_correct_scores_full(self, page):
        """✓ with nothing selected only nudges (no penalty); selecting the CORRECT
        answer and pressing ✓ solves for full points."""
        _enter_story(page)
        page.click(".sq-chk")
        page.wait_for_timeout(200)
        assert page.evaluate("tryFirst") == 0, "submitting with no selection must not penalise"
        assert page.evaluate("done") is False
        page.evaluate("""() => {
            document.querySelector(`.sq-opt[data-i="${num1}"]`).click();   // the correct option
        }""")
        page.click(".sq-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20, "first-try correct must award full mulc points"
        assert page.evaluate("report[0].gotCorrect") is True

    def test_story_quiz_wrong_then_correct_gives_partial(self, page):
        """A WRONG submitted answer logs a mistake (penalty + red shake) but lets
        her re-pick; the follow-up correct answer scores 67% (13)."""
        _enter_story(page)
        page.evaluate("""() => {
            const wrong = num1 === 1 ? 2 : 1;               // any option ≠ the correct one
            document.querySelector(`.sq-opt[data-i="${wrong}"]`).click();
        }""")
        page.click(".sq-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        page.wait_for_timeout(1200)                         # the red mark clears for a re-pick
        page.evaluate("""() => {
            document.querySelector(`.sq-opt[data-i="${num1}"]`).click();
        }""")
        page.click(".sq-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13, "correct after one mistake scores 67% (13)"

    def test_story_quiz_library_is_valid(self, page):
        """Every library story is ≤4 short lines, has a vowelled question + 3
        DISTINCT vowelled options and a valid 1-based answer index; the pool is
        BIG (12 per topic = 48 — grown from 32 when the child started recalling
        answers) so answers can't be memorised."""
        _enter_story(page)
        pool = page.evaluate("EXERCISES.types.story_quiz.make('story')")
        assert len(pool) >= 48, f"the library must offer ≥48 stories (12 × 4 topics), got {len(pool)}"
        topics = {p["topic"] for p in pool}
        assert topics == {"space", "unicorns", "dinos", "princess"}, f"got topics {topics}"
        for p in pool:
            assert 1 <= len(p["lines"]) <= 4, f"story must be ≤4 lines: {p['lines']}"
            assert all(_has_niqqud(l) for l in p["lines"]), f"unvowelled line in {p['topic']}"
            assert _has_niqqud(p["q"])
            assert len(p["opts"]) == 3 and len(set(p["opts"])) == 3, f"3 distinct options required: {p['opts']}"
            assert all(_has_niqqud(o) for o in p["opts"])
            assert 1 <= p["a"] <= len(p["opts"]), f"answer index out of range: {p['a']}"

    def test_story_quiz_rotation_never_repeats_within_a_cycle(self, page):
        """Anti-memorisation: topics AND stories rotate via shuffled queues — over
        one full library cycle every topic is served exactly its story count with
        ALL-DISTINCT stories (no repeat until the whole topic pool is exhausted).
        Sizes are derived from the library, so growing a topic keeps this green."""
        _enter_story(page)
        res = page.evaluate("""() => {
            const EX = EXERCISES.types.story_quiz;
            // per-topic library sizes, from the full pool
            const libCount = {};
            for (const p of EX.make('story')) libCount[p.topic] = (libCount[p.topic] || 0) + 1;
            const total = Object.values(libCount).reduce((s, n) => s + n, 0);
            EX._resetRotation();                           // start a fresh cycle
            const seen = {};
            for (let g = 0; g < total; g++){
                for (const p of EX.make('mulc')) (seen[p.topic] = seen[p.topic] || []).push(p.q);
            }
            return {libCount, served: Object.fromEntries(Object.entries(seen).map(
                ([t, qs]) => [t, {served: qs.length, distinct: new Set(qs).size}]))};
        }""")
        lib = res["libCount"]
        assert len(res["served"]) == 4, f"all four topics must be served, got {list(res['served'])}"
        for topic, s in res["served"].items():
            n = lib[topic]
            assert s["served"] == n and s["distinct"] == n, \
                f"{topic}: a full cycle must serve its {n} stories all-distinct, got {s}"

    def test_story_quiz_answer_position_is_shuffled(self, page):
        """Anti-memorisation: the correct option must NOT sit in a fixed slot (the
        child once learned "the answer is number 3"). Over many built cards the
        correct index lands in ALL THREE positions, none dominant."""
        _enter_story(page)
        res = page.evaluate("""() => {
            const EX = EXERCISES.types.story_quiz; EX._resetRotation();
            const pos = {1:0, 2:0, 3:0};
            for (let i = 0; i < 240; i++){ pos[EX.make('mulc')[0].a]++; }
            return pos;
        }""")
        assert all(res[k] >= 30 for k in res), \
            f"the correct answer must be shuffled across all 3 slots, got {res}"


# ─────────────────────────────────────────────────────────
# The FIVE additional reading kinds sharing the one-per-4 reading slots:
# cloze (הַשְׁלֵם אֶת הַמִּלָּה) · true_false (נָכוֹן אוֹ לֹא) ·
# word_match (הַתְאֵם מִלָּה לִתְמוּנָה) · sent_order (סַדֵּר אֶת הַמִּשְׁפָּט) ·
# rhyme (אֵיזוֹ מִלָּה מִתְחָרֶזֶת)
# ─────────────────────────────────────────────────────────

def _enter_reading(page, ex, sel):
    """Enter אַלּוּפָה, wait for the given reading module, force ONE of its cards
    and wait for its board (sel = a selector proving the mount)."""
    page.evaluate("setMode('mulc')")
    page.wait_for_function(
        f"typeof EXERCISES!=='undefined' && typeof EXERCISES.types.{ex}==='object'"
        " && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(f"mode='mulc';score=0;problems=EXERCISES.types.{ex}.make('mulc');idx=0;loadProblem();")
    page.wait_for_selector(sel, timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestCloze:
    def test_cloze_mounts_vowelled_sentence_with_gap(self, page):
        """A cloze card shows the sentence with a visible gap + 3 vowelled options
        + the module's ✓; bank sentences and options are all vowelled."""
        _enter_reading(page, "cloze", ".cz-opt")
        assert page.evaluate("ptype === TCZ")
        assert page.evaluate("!!document.querySelector('.cz-gap')")
        opts = page.evaluate("[...document.querySelectorAll('.cz-opt')].map(o=>o.textContent)")
        assert len(opts) == 3 and all(_has_niqqud(o) for o in opts)
        assert _has_niqqud(page.evaluate("document.querySelector('.cz-sent').textContent"))
        pool = page.evaluate("EXERCISES.types.cloze.make('clz')")
        assert len(pool) >= 24 and all(1 <= p["a"] <= 3 for p in pool)

    def test_cloze_correct_fills_gap_and_scores_full(self, page):
        """Selecting the correct word + ✓ drops it into the gap and solves (20)."""
        _enter_reading(page, "cloze", ".cz-opt")
        page.evaluate("document.querySelector(`.cz-opt[data-i=\"${num1}\"]`).click()")
        page.click(".cz-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        gap = page.evaluate("document.querySelector('.cz-gap').textContent")
        assert gap != "___" and _has_niqqud(gap), "the correct word must drop into the gap"

    def test_cloze_wrong_then_correct_is_partial(self, page):
        """A wrong word logs a mistake and allows a re-pick; then correct → 13."""
        _enter_reading(page, "cloze", ".cz-opt")
        page.evaluate("document.querySelector(`.cz-opt[data-i=\"${num1===1?2:1}\"]`).click()")
        page.click(".cz-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        page.wait_for_timeout(1200)
        page.evaluate("document.querySelector(`.cz-opt[data-i=\"${num1}\"]`).click()")
        page.click(".cz-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_cloze_answer_position_is_shuffled(self, page):
        """The correct word must not sit in a fixed slot — over the whole bank,
        rebuilt many times, it lands in all 3 option positions."""
        _enter_reading(page, "cloze", ".cz-opt")
        res = page.evaluate("""() => {
            const EX = EXERCISES.types.cloze; EX._resetRotation();
            const pos = {1:0, 2:0, 3:0};
            for (let r = 0; r < 12; r++) for (const p of EX.make('clz')) pos[p.a]++;
            return pos;
        }""")
        assert all(res[k] >= 30 for k in res), \
            f"the correct answer must be shuffled across all 3 slots, got {res}"


class TestTrueFalse:
    def test_true_false_mounts_story_statement_and_two_options(self, page):
        """A true/false card shows the vowelled mini-story, the statement and the
        two options נָכוֹן / לֹא נָכוֹן."""
        _enter_reading(page, "true_false", ".tf-opt")
        assert page.evaluate("ptype === TTF")
        assert _has_niqqud(page.evaluate("document.querySelector('.tf-story').textContent"))
        assert _has_niqqud(page.evaluate("document.querySelector('.tf-stmt').textContent"))
        opts = page.evaluate("[...document.querySelectorAll('.tf-opt')].map(o=>o.textContent)")
        assert len(opts) == 2
        pool = page.evaluate("EXERCISES.types.true_false.make('tf')")
        assert len(pool) >= 24
        assert {p["a"] for p in pool} == {1, 2}, "the bank must mix true AND false items"

    def test_true_false_correct_scores_full(self, page):
        _enter_reading(page, "true_false", ".tf-opt")
        page.evaluate("document.querySelector(`.tf-opt[data-i=\"${num1}\"]`).click()")
        page.click(".tf-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20

    def test_true_false_wrong_then_correct_is_partial(self, page):
        _enter_reading(page, "true_false", ".tf-opt")
        page.evaluate("document.querySelector(`.tf-opt[data-i=\"${num1===1?2:1}\"]`).click()")
        page.click(".tf-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        page.wait_for_timeout(1200)
        page.evaluate("document.querySelector(`.tf-opt[data-i=\"${num1}\"]`).click()")
        page.click(".tf-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13


_GHOSTS = "document.querySelectorAll('.wm-ghost').length"


def _wm_box(page, sel):
    """Centre of a word pill / picture cell, in viewport coordinates."""
    el = page.query_selector(sel)
    el.scroll_into_view_if_needed()
    b = el.bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def _wm_grab(page, word_i):
    """Press a word pill and move far enough to spawn the floating ghost."""
    wx, wy = _wm_box(page, f'.wm-word[data-i="{word_i}"]')
    page.mouse.move(wx, wy)
    page.mouse.down()
    page.mouse.move(wx + 40, wy - 30, steps=6)     # > the 6px drag threshold
    assert page.evaluate(_GHOSTS) == 1, "the drag must spawn exactly one ghost"


class TestWordMatch:
    def test_word_match_mounts_three_pictures_and_words(self, page):
        """A match card shows 3 picture cells + 3 vowelled word pills."""
        _enter_reading(page, "word_match", ".wm-word")
        assert page.evaluate("ptype === TWM")
        assert page.evaluate("document.querySelectorAll('.wm-pic').length") == 3
        words = page.evaluate("[...document.querySelectorAll('.wm-word')].map(w=>w.textContent)")
        assert len(words) == 3 and all(_has_niqqud(w) for w in words)

    def test_word_match_all_correct_solves_full(self, page):
        """Tap-tap matching every word to its picture solves for full points (the
        drag path shares the same tryMatch)."""
        _enter_reading(page, "word_match", ".wm-word")
        page.evaluate("""() => {
            for (let i = 0; i < 3; i++) {
                document.querySelector(`.wm-word[data-i="${i}"]`).click();
                document.querySelector(`.wm-pic[data-i="${i}"]`).click();
            }
        }""")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("document.querySelectorAll('.wm-pic.wm-done').length") == 3

    def test_word_match_wrong_drop_penalises_then_partial(self, page):
        """A word placed on the WRONG picture shakes + logs a mistake; finishing
        correctly afterwards scores 67% (13)."""
        _enter_reading(page, "word_match", ".wm-word")
        page.evaluate("""() => {
            document.querySelector('.wm-word[data-i="0"]').click();
            document.querySelector('.wm-pic[data-i="1"]').click();   // wrong picture
        }""")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        page.evaluate("""() => {
            for (let i = 0; i < 3; i++) {
                document.querySelector(`.wm-word[data-i="${i}"]`).click();
                document.querySelector(`.wm-pic[data-i="${i}"]`).click();
            }
        }""")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_word_match_bank_is_big_and_valid(self, page):
        """The pair bank must stay BIG (≥30 — grown from 18 when the child started
        recalling answers) with every word vowelled and no duplicate words or
        emoji (a duplicate would make a card ambiguous)."""
        _enter_reading(page, "word_match", ".wm-word")
        res = page.evaluate("""() => {
            const bank = EXERCISES.types.word_match._bank;
            return {
                n: bank.length,
                dupW: bank.length - new Set(bank.map(p => p.w)).size,
                dupE: bank.length - new Set(bank.map(p => p.e)).size,
                unvowelled: bank.filter(p => !/[\\u0591-\\u05C7]/.test(p.w)).map(p => p.w),
            };
        }""")
        assert res["n"] >= 30, f"the bank must offer ≥30 pairs, got {res['n']}"
        assert res["dupW"] == 0 and res["dupE"] == 0, f"duplicate words/emoji in the bank: {res}"
        assert res["unvowelled"] == [], f"every bank word must be vowelled: {res['unvowelled']}"

    # ── the floating drag GHOST must never outlive its drag ──────────────
    # It is position:fixed at z-9999, so a leaked one freezes mid-flight above
    # everything (the z-996 success screen included) until the next problem
    # mounts. User: "the word icon sometimes sticks half-way after a correct
    # answer, and it also shows during the success screen."

    def test_word_match_real_drag_matches_and_leaves_no_ghost_on_success(self, page):
        """A REAL pointer-drag (not the tap-tap shortcut) onto the right picture
        matches — and once it solves, NO ghost is left floating over the success
        screen."""
        _enter_reading(page, "word_match", ".wm-word")
        for i in (0, 1):                                   # clear two by tap-tap
            page.evaluate(f"""() => {{
                document.querySelector('.wm-word[data-i="{i}"]').click();
                document.querySelector('.wm-pic[data-i="{i}"]').click();
            }}""")
        _wm_grab(page, 2)                                  # the last one by DRAG
        px, py = _wm_box(page, '.wm-pic[data-i="2"]')
        page.mouse.move(px, py, steps=8)
        page.mouse.up()
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('.wm-pic.wm-done').length") == 3
        assert page.evaluate("score") == 20
        page.wait_for_function("_fwOn === true", timeout=TIMEOUT)
        assert page.evaluate(_GHOSTS) == 0, \
            "a drag ghost must not float over the success screen"

    def test_word_match_drag_ghost_anchors_to_grab_point(self, page):
        """On tablet the pill must be picked up from EXACTLY where she presses:
        the ghost keeps the grab point under the pointer, it does NOT snap to
        centre on the finger. Grab the WIDEST word near its right edge, drag by a
        known delta — the ghost centre must equal (word-centre + delta), not the
        finger position (user: the drag starts shifted from where she pressed)."""
        _enter_reading(page, "word_match", ".wm-word")
        rect = page.evaluate("""() => {
            const ws = [...document.querySelectorAll('.wm-word')];
            ws.forEach(w => w.scrollIntoView({block:'center'}));
            const w = ws.sort((a,b) =>
                b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
            const r = w.getBoundingClientRect();
            return {right:r.right, cx:r.left+r.width/2, cy:r.top+r.height/2, width:r.width};
        }""")
        assert rect["width"] > 40, "need a reasonably wide pill for an off-centre grab"
        grab_x, grab_y = rect["right"] - 8, rect["cy"]     # near the right edge, well off-centre
        offset = grab_x - rect["cx"]                        # how far the grab is from centre
        assert offset > 12, "precondition: the grab must be clearly off-centre"
        dx, dy = 60, -45
        page.mouse.move(grab_x, grab_y)
        page.mouse.down()
        page.mouse.move(grab_x + dx, grab_y + dy, steps=8)
        center = page.evaluate("""() => {
            const g = document.querySelector('.wm-ghost'); const r = g.getBoundingClientRect();
            return {x:r.left+r.width/2, y:r.top+r.height/2};
        }""")
        page.mouse.up()
        assert abs(center["x"] - (rect["cx"] + dx)) <= 4, \
            f"ghost x must track word-centre+delta ({rect['cx']+dx:.0f}), got {center['x']:.0f}"
        assert abs(center["y"] - (rect["cy"] + dy)) <= 4, \
            f"ghost y must track word-centre+delta ({rect['cy']+dy:.0f}), got {center['y']:.0f}"
        # …and specifically NOT snapped to centre under the finger (the old bug)
        assert abs(center["x"] - (grab_x + dx)) > 12, \
            "the ghost must not jump so its centre sits under the finger"

    def test_word_match_pointercancel_removes_the_ghost(self, page):
        """`pointercancel` (the browser/OS stealing the gesture — an edge or
        system swipe) means `pointerup` NEVER arrives. Without a handler the
        ghost stayed frozen mid-flight; it must be removed, and the cancelled
        gesture must NOT count as a drop."""
        _enter_reading(page, "word_match", ".wm-word")
        _wm_grab(page, 0)
        pid = page.evaluate("document.querySelector('.wm-ghost').dataset.pid")
        page.evaluate(
            "pid => window.dispatchEvent(new PointerEvent('pointercancel',"
            "{pointerId:+pid, bubbles:true}))", pid)
        assert page.evaluate(_GHOSTS) == 0, "pointercancel must remove the ghost"
        page.mouse.up()                                    # the late release is ignored
        assert page.evaluate(_GHOSTS) == 0
        assert page.evaluate("document.querySelectorAll('.wm-pic.wm-done').length") == 0, \
            "a cancelled gesture must not land a match"
        assert page.evaluate("tryFirst") == 0, "…and must not count as a mistake"

    def test_word_match_second_finger_does_not_orphan_the_ghost(self, page):
        """A second finger pressing another pill mid-drag used to overwrite the
        live drag, orphaning ghost #1 with no reference left to remove it by (and
        the real pointerup, now a foreign pointerId, was ignored). The extra
        pointer must be ignored and the original drag must still complete."""
        _enter_reading(page, "word_match", ".wm-word")
        _wm_grab(page, 0)
        page.evaluate("""() => {
            const w = document.querySelector('.wm-word[data-i="1"]');
            const r = w.getBoundingClientRect();
            w.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 77, bubbles: true,
                clientX: r.left + r.width / 2, clientY: r.top + r.height / 2}));
        }""")
        assert page.evaluate(_GHOSTS) == 1, "the 2nd pointer must not spawn a 2nd ghost"
        px, py = _wm_box(page, '.wm-pic[data-i="0"]')
        page.mouse.move(px, py, steps=8)
        page.mouse.up()
        assert page.evaluate(_GHOSTS) == 0, "the original drag must still clean up"
        assert page.evaluate("document.querySelectorAll('.wm-pic.wm-done').length") == 1, \
            "the original drag must still land its match"


class TestSentOrder:
    def test_sent_order_mounts_scrambled_bank(self, page):
        """An order card shows the scrambled word pills (NOT in the correct order)
        + an empty strip + ✓."""
        _enter_reading(page, "sent_order", ".so-word")
        assert page.evaluate("ptype === TSO")
        res = page.evaluate("""() => ({
            bank: [...document.querySelectorAll('.so-bank .so-word')].map(w=>w.textContent),
            words: problems[0].words,
        })""")
        assert len(res["bank"]) == len(res["words"]) >= 4
        assert res["bank"] != res["words"], "the bank must open SCRAMBLED"
        assert all(_has_niqqud(w) for w in res["words"])

    def test_sent_order_correct_order_scores_full(self, page):
        """Tapping the words in the correct order then ✓ solves for full points."""
        _enter_reading(page, "sent_order", ".so-word")
        page.evaluate("""() => {
            for (const w of problems[0].words) {
                [...document.querySelectorAll('.so-bank .so-word')]
                    .find(el => el.textContent === w).click();
            }
        }""")
        page.click(".so-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20

    def test_sent_order_wrong_keeps_words_then_partial(self, page):
        """A wrong order logs a mistake but KEEPS the built words (she fixes, not
        restarts); a submit with missing words only nudges (no penalty)."""
        _enter_reading(page, "sent_order", ".so-word")
        page.click(".so-chk")                                   # nothing placed yet
        page.wait_for_timeout(200)
        assert page.evaluate("tryFirst") == 0, "an incomplete submit must not penalise"
        page.evaluate("""() => {                                 // place ALL words in a WRONG order
            const ws = problems[0].words, rev = ws.slice().reverse();
            for (const w of rev) {
                [...document.querySelectorAll('.so-bank .so-word')]
                    .find(el => el.textContent === w).click();
            }
        }""")
        page.click(".so-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('.so-strip .so-word').length") > 0, \
            "the built words must stay for fixing"
        # fix: send everything back, then place correctly
        page.evaluate("""() => {
            [...document.querySelectorAll('.so-strip .so-word')].forEach(el => el.click());
            for (const w of problems[0].words) {
                [...document.querySelectorAll('.so-bank .so-word')]
                    .find(el => el.textContent === w).click();
            }
        }""")
        page.click(".so-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_sent_order_bank_has_no_duplicate_words(self, page):
        """Every bank sentence must have DISTINCT words (a duplicate would make the
        string compare ambiguous) — the mechanical guard behind 'exactly one order'.
        Also every sentence is 4 words."""
        _enter_reading(page, "sent_order", ".so-word")
        bad = page.evaluate("""() => {
            const pool = EXERCISES.types.sent_order.make('so');
            const bad = [];
            for (const p of pool){
                if (new Set(p.words).size !== p.words.length) bad.push({dup:p.words.join(' ')});
                if (p.words.length < 4) bad.push({short:p.words.join(' ')});
            }
            return {count:pool.length, bad};
        }""")
        assert bad["count"] >= 24, f"expected the full bank, got {bad['count']}"
        assert bad["bad"] == [], f"sentences must have distinct words + ≥4 words: {bad['bad']}"

    def test_sent_order_drag_reorders_chosen_words(self, page):
        """A CHOSEN word can be DRAGGED within the strip to change the order: build
        with the first two words swapped (wrong), drag word0 back before word1
        (RTL → onto the right half), then ✓ solves. A drag must NOT bounce the word
        to the bank (that's a tap)."""
        _enter_reading(page, "sent_order", ".so-word")
        words = page.evaluate("problems[0].words")
        # place in a WRONG order: swap the first two, keep the rest
        order = list(range(len(words)))
        order[0], order[1] = order[1], order[0]
        for i in order:
            page.evaluate("""(w)=>{[...document.querySelectorAll('.so-bank .so-word')]
                .find(e=>e.textContent===w).click();}""", words[i])
        built_before = page.evaluate(
            "[...document.querySelectorAll('.so-strip .so-word')].map(e=>e.textContent).join(' ')")
        assert built_before != " ".join(words), "precondition: strip starts in the wrong order"
        # drag word0 (2nd pill) onto the RIGHT half of word1 (1st pill) → word0 first
        def rect(w):
            return page.evaluate("""(w)=>{const el=[...document.querySelectorAll('.so-strip .so-word')]
                .find(e=>e.textContent===w);const r=el.getBoundingClientRect();
                return {cx:r.left+r.width/2,cy:r.top+r.height/2,right:r.right};}""", w)
        a, b = rect(words[0]), rect(words[1])
        page.mouse.move(a["cx"], a["cy"]); page.mouse.down()
        page.mouse.move((a["cx"] + b["right"]) / 2, b["cy"], steps=6)
        page.mouse.move(b["right"] - 6, b["cy"], steps=6)
        page.mouse.up()
        page.wait_for_timeout(120)
        built_after = page.evaluate(
            "[...document.querySelectorAll('.so-strip .so-word')].map(e=>e.textContent).join(' ')")
        assert built_after == " ".join(words), \
            f"drag must reorder to the correct sentence, got {built_after!r}"
        assert page.evaluate("document.querySelectorAll('.so-strip .so-word').length") == len(words), \
            "the dragged word must stay in the strip (a drag is not a tap-to-bank)"
        page.click(".so-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20


# ─────────────────────────────────────────────────────────
# "אֵיזוֹ מִלָּה מִתְחָרֶזֶת?" (rhyme / TRH) — PHONOLOGICAL awareness, the 6th reading
# kind: a picture+word CUE and 3 picture+word options, exactly ONE rhyming. Select
# → ✓ submits; a mistake reveals the SOUND AID (the cue's rhyme ending spelled out).
# ─────────────────────────────────────────────────────────

class TestRhyme:
    def test_rhyme_mounts_cue_and_three_picture_options(self, page):
        """A rhyme card shows the vowelled cue (emoji + word) and 3 option cards
        (emoji + vowelled word) + the module's ✓; the sound aid starts HIDDEN."""
        _enter_reading(page, "rhyme", ".rh-opt")
        assert page.evaluate("ptype === TRH")
        res = page.evaluate("""() => ({
            cue: document.querySelector('.rh-cue-w').textContent,
            cueE: document.querySelector('.rh-cue-e').textContent,
            words: [...document.querySelectorAll('.rh-opt .rh-w')].map(e=>e.textContent),
            emoji: [...document.querySelectorAll('.rh-opt .rh-e')].map(e=>e.textContent),
            aidOn: document.querySelector('.rh-sound').classList.contains('rh-on'),
            hasChk: !!document.querySelector('.rh-chk'),
            hostChk: getComputedStyle(document.getElementById('chk-btn')).display,
            nl: document.getElementById('nl-panel').style.display,
        })""")
        assert _has_niqqud(res["cue"]), f"the cue word must be vowelled: {res['cue']}"
        assert res["cueE"].strip(), "the cue must carry a picture"
        assert len(res["words"]) == 3 and len(set(res["words"])) == 3
        assert all(_has_niqqud(w) for w in res["words"]), f"vowelled options required: {res['words']}"
        assert all(e.strip() for e in res["emoji"]), "every option needs a picture"
        assert res["aidOn"] is False, "the rhyme-ending aid must stay hidden until a mistake"
        assert res["hasChk"] and res["hostChk"] == "none" and res["nl"] == "none"

    def test_rhyme_correct_scores_full(self, page):
        """Selecting the rhyming word + ✓ solves for full אַלּוּפָה points."""
        _enter_reading(page, "rhyme", ".rh-opt")
        page.evaluate("document.querySelector(`.rh-opt[data-i=\"${num1}\"]`).click()")
        page.click(".rh-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.evaluate("report[0].gotCorrect") is True

    def test_rhyme_wrong_reveals_sound_aid_then_partial(self, page):
        """A wrong option logs a mistake AND reveals the rhyme-ending aid (the cue's
        sound), then allows a re-pick; the follow-up correct answer scores 67% (13)."""
        _enter_reading(page, "rhyme", ".rh-opt")
        page.evaluate("document.querySelector(`.rh-opt[data-i=\"${num1===1?2:1}\"]`).click()")
        page.click(".rh-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        aid = page.evaluate("""() => ({
            on: document.querySelector('.rh-sound').classList.contains('rh-on'),
            txt: document.querySelector('.rh-sound').textContent,
            sound: problems[0].sound})""")
        assert aid["on"], "a mistake must reveal the rhyme-ending aid"
        assert aid["sound"] and aid["sound"] in aid["txt"], \
            f"the aid must spell the rhyme ending {aid['sound']!r}: {aid['txt']!r}"
        page.wait_for_timeout(1200)
        page.evaluate("document.querySelector(`.rh-opt[data-i=\"${num1}\"]`).click()")
        page.click(".rh-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_rhyme_bank_is_unambiguous(self, page):
        """The pedagogical guard (the cloze/sent_order lesson): in EVERY built card
        exactly ONE option may rhyme with the cue. Mechanically — the answer shares
        the pair's final letter, and BOTH distractors end with a DIFFERENT letter
        (from the pair and from each other). Also: every bank word is vowelled, each
        pair really shares its declared ending, and the pair words / emoji never
        overlap the distractor pool."""
        _enter_reading(page, "rhyme", ".rh-opt")
        res = page.evaluate("""() => {
            const ex = EXERCISES.types.rhyme;
            const strip = s => s.replace(/[\\u0591-\\u05C7]/g,'');       // drop niqqud
            const fin = w => {const c=strip(w).slice(-1);
                return ({'\\u05DA':'\\u05DB','\\u05DD':'\\u05DE','\\u05DF':'\\u05E0',
                         '\\u05E3':'\\u05E4','\\u05E5':'\\u05E6'}[c])||c;};
            const bad = [];
            // 1. the bank itself — both members really end with the declared letter
            for (const e of ex._bank){
                for (const m of [e.a, e.b]){
                    if (fin(m.w) !== e.end) bad.push({badEnd:m.w, declared:e.end, real:fin(m.w)});
                    if (!/[\\u0591-\\u05C7]/.test(m.w)) bad.push({unvowelled:m.w});
                }
                if (!e.sound) bad.push({noSound:e.a.w});
            }
            // 2. pair words and the distractor pool must be disjoint (words + emoji)
            const pw = new Set(ex._bank.flatMap(e=>[e.a.w,e.b.w]));
            const pe = new Set(ex._bank.flatMap(e=>[e.a.e,e.b.e]));
            for (const d of ex._distractors){
                if (pw.has(d.w)) bad.push({sharedWord:d.w});
                if (pe.has(d.e)) bad.push({sharedEmoji:d.e});
                if (fin(d.w) !== d.end) bad.push({badDistractorEnd:d.w, declared:d.end, real:fin(d.w)});
            }
            // 3. built cards — exactly one option can rhyme with the cue
            for (let i = 0; i < 400; i++){
                const p = ex.make('rhy')[0];
                const cueEnd = fin(p.cue.w);
                const same = p.opts.filter(o => fin(o.w) === cueEnd);
                if (same.length !== 1) bad.push({card:p.cue.w, opts:p.opts.map(o=>o.w)});
                else if (fin(p.opts[p.a-1].w) !== cueEnd) bad.push({wrongIndex:p.cue.w, a:p.a});
                if (new Set(p.opts.map(o=>o.w)).size !== 3) bad.push({dupOpts:p.opts.map(o=>o.w)});
            }
            return {bank:ex._bank.length, bad:bad.slice(0,8)};
        }""")
        assert res["bank"] >= 24, f"the rhyme bank must offer ≥24 pairs, got {res['bank']}"
        assert res["bad"] == [], f"ambiguous / malformed rhyme data: {res['bad']}"

    def test_rhyme_rotation_serves_every_pair_before_repeating(self, page):
        """Anti-memorisation: the pair queue is a no-repeat shuffled rotation — 12
        consecutive cards use 12 DISTINCT pairs, and either member may be the cue."""
        _enter_reading(page, "rhyme", ".rh-opt")
        res = page.evaluate("""() => {
            const ex = EXERCISES.types.rhyme;
            ex._resetRotation();
            const n = ex._bank.length, cues = [], pairs = [];
            for (let i = 0; i < n; i++){
                const p = ex.make('mulc')[0];
                cues.push(p.cue.w);
                pairs.push(ex._bank.findIndex(e => e.a.w === p.cue.w || e.b.w === p.cue.w));
            }
            // over many cards BOTH members of a pair get to be the cue
            ex._resetRotation();
            const seenSides = new Set();
            for (let i = 0; i < 200; i++){
                const p = ex.make('mulc')[0];
                const e = ex._bank.find(e => e.a.w === p.cue.w || e.b.w === p.cue.w);
                seenSides.add(p.cue.w === e.a.w ? 'a' : 'b');
            }
            return {n, distinctPairs:new Set(pairs).size, unknown:pairs.filter(i=>i<0).length,
                    sides:[...seenSides]};
        }""")
        assert res["unknown"] == 0, "every served cue must come from the bank"
        assert res["distinctPairs"] == res["n"], \
            f"{res['n']} consecutive cards must use {res['n']} distinct pairs, got {res['distinctPairs']}"
        assert sorted(res["sides"]) == ["a", "b"], \
            f"both pair members must get to be the cue, got {res['sides']}"

    def test_rhyme_answer_position_is_shuffled(self, page):
        """The rhyming option must not sit in a fixed slot — over many cards the
        correct index lands in all 3 positions."""
        _enter_reading(page, "rhyme", ".rh-opt")
        res = page.evaluate("""() => {
            const ex = EXERCISES.types.rhyme; ex._resetRotation();
            const pos = {1:0, 2:0, 3:0};
            for (let i = 0; i < 240; i++){ pos[ex.make('mulc')[0].a]++; }
            return pos;
        }""")
        assert all(res[k] >= 30 for k in res), \
            f"the rhyming answer must be shuffled across all 3 slots, got {res}"


# ─────────────────────────────────────────────────────────
# "שָׂפָה 📖" (mode 'lang') — the LANGUAGE game under the medium (בֵּינוֹנִי) tier:
# a mixed reading session holding EVERY reading kind (story_quiz / cloze /
# true_false / word_match / sent_order / rhyme), no arithmetic.
# ─────────────────────────────────────────────────────────

class TestLanguageGame:
    def test_lang_registered_under_medium_with_picker_button(self, page):
        """The 'lang' game sits in the medium (בֵּינוֹנִי) tier and renders a picker
        button (lblang)."""
        assert page.evaluate(
            "DIFFICULTY_GROUPS.find(g=>g.id==='medium').modes.some(m=>m.id==='lang')"), \
            "the 'lang' game must be registered under the medium tier"
        page.evaluate("openSettings ? renderModePicker() : renderModePicker()")
        assert page.evaluate("!!document.getElementById('lblang')"), \
            "the lang picker button must render"

    def test_lang_pool_holds_every_reading_kind_and_no_arithmetic(self, page):
        """The שפה session mixes EVERY registered reading kind (no rotation cursor
        here — full coverage is the point of this game) and contains NO arithmetic
        card."""
        page.evaluate("setMode('lang')")
        page.wait_for_function(
            "typeof problems!=='undefined' && problems.length>0"
            " && ['story_quiz','cloze','true_false','word_match','sent_order','rhyme']"
            ".every(k=>EXERCISES.types[k])", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{
            const R=[TSQ,TCZ,TTF,TWM,TSO,TRH];
            const d=makePool('lang');
            const kinds=new Set(d.map(p=>p.t));
            return {len:d.length, missing:R.filter(t=>!kinds.has(t)),
                    nonReading:d.filter(p=>!R.includes(p.t)).length};})()""")
        assert res["len"] >= 10, f"the lang session should be a full run, got {res['len']}"
        assert res["missing"] == [], f"every reading kind must appear in the שפה game, missing {res['missing']}"
        assert res["nonReading"] == 0, \
            f"the שפה game must contain NO arithmetic cards, got {res['nonReading']}"

    def test_lang_mode_scores_reading_points(self, page):
        """The lang game scores the reading base (15 per card, like the other
        reading modes)."""
        assert page.evaluate("(()=>{mode='lang';return modePts();})()") == 15


# ─────────────────────────────────────────────────────────
# "דַּלְּגִי עַל הַשְּׁאֵלָה" — the skip button on language cards (user request): a
# card she can't decode must not soft-lock the set, but it appears ONLY AFTER
# TWO MISTAKES, and a skip scores 0 (marked skipped, not correct, in the report
# + the grade). Tested under אַלּוּפָה (mulc), where all six kinds appear.
# ─────────────────────────────────────────────────────────

_LANG_SEL = {"story_quiz": ".sq-opt", "cloze": ".cz-opt", "true_false": ".tf-opt",
             "word_match": ".wm-word", "sent_order": ".so-word", "rhyme": ".rh-opt"}


class TestLanguageSkip:
    def test_skip_button_exists_hidden_in_every_language_exercise(self, page):
        """All SIX reading kinds — including the drag ones (word_match / sent_order)
        that have no ✓ — wire the skip button under אַלּוּפָה, but it starts HIDDEN
        (no mistakes yet)."""
        for ex, sel in _LANG_SEL.items():
            _enter_reading(page, ex, sel)
            assert page.evaluate("!!document.querySelector('#btns #skip-btn')"), \
                f"{ex} must wire the skip button"
            assert page.evaluate(
                "getComputedStyle(document.querySelector('#skip-btn')).display") == "none", \
                f"{ex}: skip must be HIDDEN before any mistake"

    def test_skip_button_absent_for_arithmetic_exercises(self, page):
        """A non-language self-mounting exercise (column subtraction) must NOT get
        the skip button at all — skipping is a reading-only affordance."""
        _enter_reading(page, "cloze", ".cz-opt")           # boots mulc + modules
        page.wait_for_function("typeof EXERCISES.types.column_sub==='object'", timeout=TIMEOUT)
        page.evaluate("problems=EXERCISES.types.column_sub.make('mulc');idx=0;loadProblem();")
        page.wait_for_timeout(150)
        assert page.evaluate("ptype === TCS")
        assert page.evaluate("!document.querySelector('#btns .b-skip')"), \
            "arithmetic exercises must NOT show the skip button"

    def test_skip_appears_only_after_two_mistakes(self, page):
        """The gate: HIDDEN at start and after ONE mistake, VISIBLE after the 2nd;
        then a click scores 0, advances, and marks the report skipped."""
        _enter_reading(page, "cloze", ".cz-opt")
        page.evaluate("""() => {
            const c = EXERCISES.types.cloze;                // two cards → skip lands on a real next
            problems = [c.make('mulc')[0], c.make('mulc')[0]];
            score = 0; idx = 0; loadProblem();
        }""")
        page.wait_for_selector(".cz-opt", timeout=TIMEOUT)
        disp = "getComputedStyle(document.querySelector('#skip-btn')).display"
        wrongs = page.evaluate("[1,2,3].filter(i=>i!==num1)")
        assert page.evaluate(disp) == "none", "hidden before any mistake"
        # mistake #1 → still hidden
        page.evaluate(f"document.querySelector('.cz-opt[data-i=\"{wrongs[0]}\"]').click()")
        page.click(".cz-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate(disp) == "none", "still hidden after ONE mistake"
        page.wait_for_timeout(1200)                         # the red mark clears for a re-pick
        # mistake #2 → appears
        page.evaluate(f"document.querySelector('.cz-opt[data-i=\"{wrongs[1]}\"]').click()")
        page.click(".cz-chk")
        page.wait_for_function("tryFirst === 2", timeout=TIMEOUT)
        assert page.evaluate(disp) != "none", "the skip button must APPEAR after the 2nd mistake"
        # now it works: 0 points, advance, marked skipped (not correct)
        page.click("#skip-btn")
        page.wait_for_function("idx === 1", timeout=TIMEOUT)
        assert page.evaluate("score") == 0, "a skip must score 0 points"
        r0 = page.evaluate("report[0]")
        assert r0.get("skipped") is True and not r0.get("gotCorrect"), \
            "the skipped question must be marked skipped and NOT correct"

    def test_skip_handler_ignores_calls_before_two_mistakes(self, page):
        """Defence in depth: even if invoked directly, skip is a no-op before the
        2nd mistake — it never advances or zeroes a still-answerable card."""
        _enter_reading(page, "cloze", ".cz-opt")
        page.evaluate("idx=0;score=0;")
        page.evaluate("skipLangQuestion()")                 # tryFirst is 0
        assert page.evaluate("idx") == 0 and page.evaluate("done") is False, \
            "skip must do nothing before two mistakes"

    def test_report_row_skipped_never_reads_as_correct(self, page):
        """Guard on the `ok` flag: an entry marked skipped is ok:false even with NO
        wrong attempts, so it can never render as a ✓."""
        _enter_reading(page, "cloze", ".cz-opt")
        row = page.evaluate("""() => {
            report = [{ptype:TCZ, num1:1, num2:0, num3:0, num4:0, correct:1, wrongs:[], skipped:true}];
            problems = [{t:TCZ, opts:['אָב','בָּב','גָּב'], a:1}];
            return _reportRows()[0];
        }""")
        assert row["skipped"] is True and row["ok"] is False, \
            "a skipped row must not read as correct"
