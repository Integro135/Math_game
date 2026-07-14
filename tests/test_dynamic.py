import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Dynamic exercise-type loading (one file per type)
# ─────────────────────────────────────────────────────────

class TestDynamicExercises:
    def test_boot_loads_only_default_mode_types(self, page):
        """Boot (mx) loads the 8 mx types (big_step is mixed into Queen now);
        the Superman-only column_add file stays unloaded."""
        page.wait_for_timeout(400)
        loaded = page.evaluate("Object.keys(EXERCISES.types)")
        for t in ["add", "sub", "missing", "double", "chain", "tens", "coins",
                  "big_step"]:
            assert t in loaded, f"boot must load mx type '{t}', got {loaded}"
        assert "column_add" not in loaded, "column_add (sup-only) must NOT load at boot"

    def test_big_game_uses_big_step(self, page):
        """The dedicated 'big' game builds a 12-problem all-TBG session."""
        page.evaluate("setMode('big')")
        page.wait_for_function(
            "typeof EXERCISES.types.big_step === 'object'", timeout=TIMEOUT)
        page.wait_for_function("problems.length === 12", timeout=TIMEOUT)
        assert page.evaluate("[...problems].every(p => p.t === TBG)")

    def test_column_add_loads_on_demand(self, page):
        """Entering Superman injects exercises/column_add.ex.js and mounts it.
        (The pool also mixes in a couple of big ±1/2 problems, so force a TCA
        problem to guarantee the column UI mounts.)"""
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.column_add === 'object'", timeout=TIMEOUT)
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        page.evaluate("problems[0] = {t: TCA, a: 17, b: 15}; idx = 0; loadProblem()")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)

    def test_hundreds_exercise_in_queen_and_superman(self, page):
        """Whole-hundreds addition (TH): appears in BOTH Queen (mx) and Superman
        (sup) pools; operands are whole hundreds + (hundreds|tens), sum ≤ 900;
        200 + 60 = 260 is accepted and a 3-digit answer fits."""
        page.evaluate("setMode('mx')")
        page.wait_for_function(
            "window.EXERCISES && typeof EXERCISES.types.hundreds === 'object'", timeout=TIMEOUT)
        stats = page.evaluate("""(()=>{
          let mx=false,bad=null;
          for(let k=0;k<40;k++){if(makeMxPool().some(p=>p.t===TH))mx=true;}
          for(let k=0;k<200;k++){EXERCISES.types.hundreds.make('mx').forEach(p=>{
            if(p.t!==TH||p.a%100!==0||p.b%10!==0||p.a+p.b>900)bad={a:p.a,b:p.b};});}
          return {mx,bad};})()""")
        assert stats["mx"], "Queen (mx) must include the hundreds type"
        assert stats["bad"] is None, f"invalid hundreds problem: {stats['bad']}"
        # sup pool includes it too
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "window.EXERCISES && typeof EXERCISES.types.hundreds === 'object'", timeout=TIMEOUT)
        sup = page.evaluate("(()=>{let s=false;for(let k=0;k<40;k++){if(makePool('sup').some(p=>p.t===TH))s=true;}return s;})()")
        assert sup, "Superman (sup) must include the hundreds type"
        # render + solve 200 + 60 = 260
        page.evaluate("mode='mx'; problems=[{t:TH,a:200,b:60}]; idx=0; report=[]; done=false; loadProblem();")
        page.wait_for_selector("#ans", timeout=TIMEOUT)
        assert page.evaluate("report[0].correct") == 260, "200 + 60 must be 260"
        page.fill("#ans", "260"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" in page.locator("#fb").get_attribute("class"), "260 is correct for 200+60"

    def test_hundreds_number_line_after_mistake(self, page):
        """The hundreds number line (revealed after a mistake) starts at the
        FIRST operand and steps by 10 (hundreds+tens) or 100 (hundreds+hundreds),
        with ≤10 ticks so the 3-digit labels fit; the sum sits on the line."""
        page.evaluate("setMode('mx')")
        page.wait_for_function("window.EXERCISES && EXERCISES.types.hundreds", timeout=TIMEOUT)
        def line_for(a, b, wrong):
            page.evaluate(f"mode='mx';problems=[{{t:TH,a:{a},b:{b}}}];idx=0;report=[];done=false;loadProblem();")
            page.wait_for_selector("#ans", timeout=TIMEOUT); page.wait_for_timeout(120)
            assert page.evaluate("document.body.classList.contains('tf-locked-nl')"), \
                "hundreds number line must be hidden before the first mistake"
            page.fill("#ans", str(wrong)); page.click("#chk-btn"); page.wait_for_timeout(400)
            return page.evaluate("[...document.querySelectorAll('#nl-bar .nl-num')].map(n=>+n.textContent)")
        tens = line_for(200, 50, 210)     # hundreds + tens → step 10 from 200
        assert tens[0] == 200 and len(tens) >= 2 and tens[1] - tens[0] == 10 and len(tens) <= 10, \
            f"200+50 line must start at 200, step 10, ≤10 ticks: {tens}"
        assert 250 in tens, f"the sum 250 must sit on the 200+50 line: {tens}"
        hund = line_for(300, 300, 500)    # hundreds + hundreds → step 100 from 300
        assert hund[0] == 300 and len(hund) >= 2 and hund[1] - hund[0] == 100 and len(hund) <= 10, \
            f"300+300 line must start at 300, step 100, ≤10 ticks: {hund}"
        assert 600 in hund, f"the sum 600 must sit on the 300+300 line: {hund}"

    def test_hundreds_space_steps_forward(self, page):
        """In the hundreds (addition) exercise, SPACE hops the number line
        FORWARD (right) — it previously defaulted backward."""
        page.evaluate("setMode('mx')")
        page.wait_for_function("window.EXERCISES && EXERCISES.types.hundreds", timeout=TIMEOUT)
        page.evaluate("mode='mx';problems=[{t:TH,a:200,b:50}];idx=0;report=[];done=false;loadProblem();")
        page.wait_for_selector("#ans", timeout=TIMEOUT); page.wait_for_timeout(120)
        # a wrong answer reveals the line (and pops the sad modal — wait it out,
        # since space is intentionally owned by the modal while it shows)
        page.fill("#ans", "999"); page.click("#chk-btn")
        page.wait_for_function(
            "(()=>{const s=document.getElementById('sad-ov');return !s||getComputedStyle(s).display==='none';})()",
            timeout=TIMEOUT)
        page.wait_for_timeout(150)
        page.evaluate("document.getElementById('ans') && document.getElementById('ans').blur()")
        before = page.evaluate("parseFloat(document.getElementById('nl-dot').style.left)||0")
        page.keyboard.press(" ")
        page.wait_for_function(
            f"(parseFloat(document.getElementById('nl-dot').style.left)||0) > {before} + 2",
            timeout=TIMEOUT)   # rider moved RIGHT (forward)

    def test_column_shows_one_line_intro_then_reveals(self, page):
        """Column add/sub first show the ORIGINAL one-line equation + a
        "show in column" button; the board (and its inputs) appears only after
        the child taps it. Runs with the auto-reveal test hook OFF."""
        page.evaluate("window.__colxAutoReveal = false")
        page.evaluate("setMode('sup')")
        page.wait_for_function(
            "typeof EXERCISES.types.column_add === 'object' && "
            "typeof EXERCISES.types.column_sub === 'object'", timeout=TIMEOUT)
        # ── addition: 47 + 38 ──
        page.evaluate("problems[0] = {t: TCA, a: 47, b: 38}; idx = 0; loadProblem()")
        page.wait_for_selector(".colx-intro", timeout=TIMEOUT)
        assert "47" in page.inner_text(".colx-intro-eq") and "+" in page.inner_text(".colx-intro-eq")
        assert page.query_selector("#colx-iU") is None, "board must be hidden before reveal"
        page.click("#colx-showcol")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)
        assert page.query_selector(".colx-intro") is None, "intro must be gone after reveal"
        # ── subtraction: 52 − 37 ──
        page.evaluate("problems[0] = {t: TCS, a: 52, b: 37}; idx = 0; loadProblem()")
        page.wait_for_selector(".colxs-intro", timeout=TIMEOUT)
        assert "52" in page.inner_text(".colxs-intro-eq")
        assert page.query_selector("#colx-iU") is None
        page.click("#colxs-showcol")
        page.wait_for_selector("#colx-iU", timeout=TIMEOUT)

    def test_every_mode_builds_correct_pool_size(self, page):
        """Each mode's recipe produces its expected session length."""
        expected = {"5": 12, "10": 12, "20": 12, "'br'": 25, "'b20'": 15,
                    "'mx'": 20, "'sup'": 20, "'big'": 12}
        for arg, size in expected.items():
            page.evaluate(f"setMode({arg})")
            page.wait_for_function(f"problems.length === {size}", timeout=TIMEOUT)

    def test_big_step_mixed_into_mx_and_sup(self, page):
        """The big-number ± step type (TBG) is woven into the Queen and Superman
        pools."""
        for arg in ["'mx'", "'sup'"]:
            page.evaluate(f"setMode({arg})")
            page.wait_for_function(
                "typeof EXERCISES.types.big_step === 'object'", timeout=TIMEOUT)
            page.wait_for_function(
                "[...problems].some(p => p.t === TBG)", timeout=TIMEOUT)
            n = page.evaluate("[...problems].filter(p => p.t === TBG).length")
            assert n >= 1, f"mode {arg}: expected ≥1 big-step problem, got {n}"
