import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Shape-variable ONE-UNKNOWN add/sub (TVA / TVS): ⃝ = N, then a ± ⃝ = ?
# ─────────────────────────────────────────────────────────
class TestVarOneUnknown:
    def _force(self, page, prob):
        page.evaluate(f"mode='br'; problems=[{prob}]; idx=0; loadProblem()")
        page.wait_for_selector("#ans:not([disabled])", timeout=TIMEOUT)
        page.wait_for_timeout(80)

    def test_sub_with_shape_unknown(self, page):
        """⃝ = 20, then 30 − ⃝ = ?  →  10 (substitute the shape's value)."""
        self._force(page, "{t:TVS,a:30,b:20,sym:'circle'}")
        assert page.locator("#eq svg").count() >= 2, "shape drawn in the def line AND the equation"
        assert page.evaluate("report[0].correct") == 10, "30 − 20 must be 10"
        page.fill("#ans", "10"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" in page.locator("#fb").get_attribute("class"), "10 is correct"

    def test_add_with_shape_unknown(self, page):
        """⃝ = 20, then 30 + ⃝ = ?  →  50."""
        self._force(page, "{t:TVA,a:30,b:20,sym:'square'}")
        assert page.evaluate("report[0].correct") == 50, "30 + 20 must be 50"
        page.fill("#ans", "50"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" in page.locator("#fb").get_attribute("class"), "50 is correct"

    def test_wrong_answer_rejected(self, page):
        self._force(page, "{t:TVS,a:30,b:20,sym:'triangle'}")
        page.fill("#ans", "50"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" not in page.locator("#fb").get_attribute("class"), "50 is wrong for 30−20"

    def test_queen_mixes_in_unknown(self, page):
        """Queen (mx) mixes the unknown type into its curated pool."""
        page.evaluate("setMode('mx')")
        page.wait_for_function("mode==='mx' && problems.length>0", timeout=TIMEOUT)
        page.wait_for_timeout(120)
        n = page.evaluate("[...problems].filter(p=>p.t===TVA||p.t===TVS).length")
        assert n >= 1, f"Queen pool must include the ⃝-unknown type, got {n}"

    # ── TWO-unknown variant: BOTH operands are shapes (symA + sym) ──
    def test_two_unknown_renders_both_operands_as_shapes(self, page):
        """△=7 ○=5, then △+○=___: BOTH equation operands are shapes carrying their
        values (7,5), with a small definition row (△=7 ○=5) above; 7+5=12."""
        self._force(page, "{t:TVA,a:7,b:5,sym:'circle',symA:'triangle'}")
        nums = page.evaluate(
            "[...document.querySelectorAll('#eq .vone-sym')].map(s=>+s.getAttribute('data-num'))")
        assert nums == [7, 5], f"both equation operands must be shapes carrying 7 and 5, got {nums}"
        assert page.evaluate("!!document.querySelector('#eq .vone-defs')"), \
            "a definition row (△=7 ○=5) must show above the equation"
        assert page.evaluate("document.querySelectorAll('#eq .vone-defs svg').length") == 2, \
            "the def row shows BOTH shapes (small)"
        assert page.evaluate("report[0].correct") == 12, "7 + 5 must be 12"

    def test_two_unknown_both_shapes_hoverable(self, page):
        """On hover EACH shape shows its objects — the first plain (=7, no split),
        the second with the make-ten split (=5 → 3|2, since 7+5 crosses 10)."""
        self._force(page, "{t:TVA,a:7,b:5,sym:'circle',symA:'triangle'}")
        page.evaluate(
            "document.querySelectorAll('#eq .vone-sym')[0].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))")
        page.wait_for_function(
            "document.getElementById('num-tt').style.display==='block'", timeout=TIMEOUT)
        assert page.evaluate("document.querySelectorAll('#num-tt .ntt-part').length") == 0, \
            "first shape (=7) shows a plain count, no make-ten split"
        page.evaluate(
            "document.querySelectorAll('#eq .vone-sym')[1].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))")
        page.wait_for_function(
            "[...document.querySelectorAll('#num-tt .ntt-part')].map(p=>p.textContent).join(',')==='3,2'",
            timeout=TIMEOUT)

    def test_two_unknown_scores_and_appears_in_pools(self, page):
        """A two-unknown subtraction answers correctly (□−○: 14−6=8), and the
        variant (a problem carrying symA) appears in BOTH Queen and the bridges."""
        self._force(page, "{t:TVS,a:14,b:6,sym:'circle',symA:'square'}")
        page.fill("#ans", "8"); page.click("#chk-btn"); page.wait_for_timeout(200)
        assert "fb-ok" in page.locator("#fb").get_attribute("class"), "14 − 6 = 8 is correct"
        page.evaluate("setMode('mx')")
        page.wait_for_function("mode==='mx' && problems.length>0", timeout=TIMEOUT)
        mx = page.evaluate("(()=>{for(var k=0;k<20;k++){if(makeMxPool().some(p=>p.symA))return true;}return false;})()")
        assert mx, "Queen must include the TWO-unknown variant (a problem with symA)"
        page.evaluate("setMode('br')")
        page.wait_for_function("problems.length>0", timeout=TIMEOUT)
        br = page.evaluate("(()=>{for(var k=0;k<8;k++){if(makeBridgePool().some(p=>p.symA))return true;}return false;})()")
        assert br, "the bridges must weave in the TWO-unknown variant (symA)"

    def test_bridges_weave_in_three_unknown(self, page):
        """The three-unknown sum (TRA, __+__+__ = R) is woven into bridge-10 AND
        bridge-20 as well (≈ once per set)."""
        page.evaluate("setMode('br')")
        page.wait_for_function("problems.length>0", timeout=TIMEOUT)
        br = page.evaluate("(()=>{for(var k=0;k<8;k++){if(makeBridgePool().some(p=>p.t===TRA))return true;}return false;})()")
        assert br, "bridge-10 must weave in the three-unknown (TRA)"
        page.evaluate("setMode('b20')")
        page.wait_for_function("problems.length>0", timeout=TIMEOUT)
        b20 = page.evaluate("(()=>{for(var k=0;k<8;k++){if(makeBridge20Pool().some(p=>p.t===TRA))return true;}return false;})()")
        assert b20, "bridge-20 must weave in the three-unknown (TRA)"

    def test_two_unknown_shapes_differ_when_values_differ(self, page):
        """Two unknowns with DIFFERENT values must be DIFFERENT shapes (a shape
        can't stand for two values); equal values may share one. Sampled across
        var_one Queen pools AND the sprinkled bridges."""
        page.evaluate("setMode('mx')")
        page.wait_for_function("window.EXERCISES && EXERCISES.types.var_one", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{let bad=[],checked=0;
          const scan=p=>{if((p.t===TVA||p.t===TVS)&&p.symA){checked++;
            if(p.sym===p.symA&&p.a!==p.b)bad.push([p.a,p.b,p.sym]);}};
          for(let k=0;k<200;k++)EXERCISES.types.var_one.make('mx').forEach(scan);
          for(let k=0;k<80;k++)makeBridgePool().concat(makeBridge20Pool()).forEach(scan);
          return {checked,badCount:bad.length,sample:bad.slice(0,3)};})()""")
        assert res["checked"] > 50, f"expected many two-unknowns sampled, got {res['checked']}"
        assert res["badCount"] == 0, f"same shape with different values found: {res['sample']}"

    def test_tri_unknown_result_shows_complete_to_ten(self, page):
        """__+__+__ = 15: the RESULT carries data-split '10,5' so hovering it
        shows the ten-and-ones bond (complete-to-ten)."""
        page.evaluate("mode='mx'; problems=[{t:TRA,r:15}]; idx=0; loadProblem();")
        page.wait_for_selector("#ans1", timeout=TIMEOUT)
        split = page.evaluate(
            """(()=>{const r=document.querySelector('#eq .eq-n[data-num="15"]');
               return r?r.getAttribute('data-split'):null;})()""")
        assert split == "10,5", f"TRA result 15 must split 10,5 on hover, got {split}"
