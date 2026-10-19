"""מֹאזְנַיִם ⚖️ (balance.ex.js) — equality as BALANCE, two kinds on one scale.

TBE  __ + 15 = 12 + __   two rows, ANY balancing pair, the second must DIFFER
TSB  5 6 7 8 → __+__ = __+__   tap the four numbers onto the two pans

Both are try-first: the pans show "?" until the first ✓; a wrong ✓ tilts the
beam toward the heavier pan with both sums; correct levels it and solves.
Queen (mx) gets ONE card per game (the kinds alternate, deck 16); אַלּוּפָה
(mulc) gets one of each into its rotating pool.
"""
from helpers import TIMEOUT, enter_mode


def _force(page, js):
    """Enter אַלּוּפָה, wait for the balance type, then force ONE problem."""
    enter_mode(page, 'mulc')
    page.wait_for_function(
        "typeof EXERCISES!=='undefined' && typeof EXERCISES.types.balance==='object'"
        " && typeof problems!=='undefined' && problems.length>0", timeout=TIMEOUT)
    page.evaluate(f"mode='mulc';score=0;problems=[{js}];idx=0;loadProblem();")
    page.wait_for_selector(".bl-root", timeout=TIMEOUT)
    page.wait_for_timeout(120)


SUMS = "[...document.querySelectorAll('.bl-sum')].map(t=>t.textContent)"
ROW = "#colx-root .bl-row:nth-child({r}) input >> nth={i}"


def _tap(page, *nums):
    for n in nums:
        page.locator(".bl-tok", has_text=str(n)).click()


class TestBalanceScale:
    def test_mounts_with_four_tokens_and_unweighed_pans(self, page):
        _force(page, "{t:TSB,nums:[5,6,7,8],a:13}")
        assert page.evaluate("ptype === TSB")
        assert page.locator(".bl-tok").count() == 4
        assert page.locator(".bl-slot").count() == 4
        assert page.evaluate(SUMS) == ["?", "?"], "pans stay unweighed until the first ✓"
        assert page.evaluate(
            "getComputedStyle(document.getElementById('chk-btn')).display === 'none'")
        assert page.evaluate(
            "getComputedStyle(document.getElementById('nl-panel')).display === 'none'")

    def test_tap_places_and_tap_slot_returns(self, page):
        _force(page, "{t:TSB,nums:[5,6,7,8],a:13}")
        _tap(page, 7)
        assert page.locator(".bl-slot").nth(0).inner_text() == "7"
        assert page.locator(".bl-tok", has_text="7").is_disabled()
        page.locator(".bl-slot").nth(0).click()
        assert page.locator(".bl-slot").nth(0).inner_text() == ""
        assert not page.locator(".bl-tok", has_text="7").is_disabled()

    def test_incomplete_submit_costs_nothing(self, page):
        _force(page, "{t:TSB,nums:[5,6,7,8],a:13}")
        _tap(page, 5, 6)
        page.click(".bl-btn")
        assert page.evaluate("tryFirst") == 0 and page.evaluate("done") is False

    def test_wrong_split_tilts_with_sums_then_fix_solves(self, page):
        _force(page, "{t:TSB,nums:[5,6,7,8],a:13}")
        _tap(page, 5, 6, 7, 8)
        page.click(".bl-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate(SUMS) == ["11", "15"]
        page.wait_for_timeout(800)
        # the beam leans RIGHT (the heavier pan): rotate(+deg)
        deg = page.evaluate(
            "parseFloat(document.querySelector('.bl-beam').getAttribute('transform').slice(7))")
        assert deg > 3, f"beam should tilt toward the 15 pan, got {deg}"
        # fix it: 6 and 8 back, then 8 into the left pan, 6 into the right
        page.locator(".bl-slot").nth(1).click()
        page.locator(".bl-slot").nth(3).click()
        _tap(page, 8, 6)
        assert page.evaluate(SUMS) == ["13", "13"], "after a mistake the scale weighs live"
        page.click(".bl-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("problems[0].sol") == [5, 8, 7, 6]
        assert page.evaluate("score") == round(20 * .67)

    def test_any_pan_order_is_accepted_first_try(self, page):
        _force(page, "{t:TSB,nums:[3,5,7,9],a:12}")
        _tap(page, 7, 5, 9, 3)          # {5,7} | {3,9}: right split, swapped pans
        page.click(".bl-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20 and page.evaluate("tryFirst") == 0

    def test_numbers_are_shown_in_a_random_order(self, page):
        """The row is never shown sorted (5 6 7 8) or mirrored, and across many cards
        the balancing pair lands in EVERY position pattern — not always 1st+4th."""
        _force(page, "{t:TSB,nums:[5,6,7,8],a:13}")
        shown = page.evaluate("[...document.querySelectorAll('.bl-tok')].map(b=>+b.textContent)")
        assert sorted(shown) == [5, 6, 7, 8] and shown not in ([5, 6, 7, 8], [8, 7, 6, 5]), shown
        res = page.evaluate("""(()=>{const B=EXERCISES.types.balance,pat={},bad=[];
            for(let i=0;i<600;i++){const p=B.make('mulc').find(q=>q.t===TSB),o=p.order;
              if(['0123','3210'].includes(o.join('')))bad.push(o);
              // where do the two members of the answer pair {a,d} (indexes 0 and 3) sit?
              const k=[o.indexOf(0),o.indexOf(3)].sort().join('');
              const key=({'03':'1+4','12':'1+4','01':'1+2','23':'1+2','02':'1+3','13':'1+3'})[k];
              pat[key]=(pat[key]||0)+1;}
            return {pat,bad:bad.length};})()""")
        assert res["bad"] == 0
        assert set(res["pat"]) == {"1+4", "1+2", "1+3"}, res
        assert min(res["pat"].values()) > 100, f"each position pattern should be common: {res}"

    def test_generator_has_exactly_one_balancing_split(self, page):
        _force(page, "{t:TSB,nums:[5,6,7,8],a:13}")
        bad = page.evaluate("""(()=>{const B=EXERCISES.types.balance;let bad=[];
            for(let i=0;i<2000;i++){
              for(const m of ['mx','mulc']){
                const p=B.make(m).find(q=>q.t===TSB);if(!p)continue;
                const [a,b,c,d]=p.nums,max=m==='mx'?15:18,cap=m==='mx'?18:20;
                if(!(a>=0&&a<b&&b<c&&c<d&&d<=max&&a+d===b+c&&a+d<=cap&&p.a===a+d))bad.push(p.nums);
              }}
            return bad.slice(0,5);})()""")
        assert bad == []

    def test_numbers_are_uneven_and_sometimes_zero(self, page):
        """Never an evenly spaced set (5 6 7 8, 4 8 12 16 — the pairing would be
        obvious): the gaps are uneven with at least one of 3+, so she has to try
        combinations; about a third of the cards include a 0 (like 8 7 15 0)."""
        _force(page, "{t:TSB,nums:[0,7,8,15],a:15}")
        assert sorted(page.evaluate("[...document.querySelectorAll('.bl-tok')].map(b=>+b.textContent)")) == [0, 7, 8, 15]
        res = page.evaluate("""(()=>{const B=EXERCISES.types.balance;let even=0,small=0,zero=0,n=0;
            for(let i=0;i<1500;i++)for(const m of ['mx','mulc']){const p=B.make(m).find(q=>q.t===TSB);if(!p)continue;n++;
              const [a,b,c,d]=p.nums,g=b-a,h=c-b;if(g===h)even++;if(Math.max(g,h)<3)small++;if(a===0)zero++;}
            return {even,small,zero:zero/n};})()""")
        assert res["even"] == 0 and res["small"] == 0, res
        assert 0.2 < res["zero"] < 0.5, res

    def test_a_zero_card_solves(self, page):
        _force(page, "{t:TSB,nums:[0,7,8,15],a:15}")
        _tap(page, 8, 7, 15, 0)
        page.click(".bl-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("problems[0].sol") == [8, 7, 15, 0]


class TestBalanceFill:
    def test_mounts_two_rows_second_locked(self, page):
        _force(page, "{t:TBE,a:15,b:12,pos:'front'}")
        assert page.evaluate("ptype === TBE")
        assert page.locator(".bl-row").count() == 2
        assert page.evaluate(
            "[...document.querySelectorAll('.bl-row:nth-child(2) input')].every(i=>i.disabled)")
        txt = page.locator(".bl-row").nth(0).inner_text().replace("\n", "").replace(" ", "")
        assert txt == "+15=12+", txt

    def test_back_layout_puts_the_known_first(self, page):
        _force(page, "{t:TBE,a:14,b:16,pos:'back'}")
        first = page.evaluate(
            "document.querySelector('.bl-row').firstElementChild.textContent")
        assert first == "14"

    def test_any_balancing_pair_then_a_different_one(self, page):
        _force(page, "{t:TBE,a:15,b:12,pos:'front'}")
        page.fill(ROW.format(r=1, i=0), "1")
        page.fill(ROW.format(r=1, i=1), "4")
        page.click(".bl-btn")
        page.wait_for_function(
            "!document.querySelector('.bl-row:nth-child(2) input').disabled", timeout=TIMEOUT)
        # the SAME pair again is refused for free
        page.fill(ROW.format(r=2, i=0), "1")
        page.fill(ROW.format(r=2, i=1), "4")
        page.click(".bl-btn")
        assert page.evaluate("tryFirst") == 0 and page.evaluate("done") is False
        page.fill(ROW.format(r=2, i=0), "10")
        page.fill(ROW.format(r=2, i=1), "13")
        page.press(ROW.format(r=2, i=1), "Enter")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("problems[0].sol") == [[1, 4], [10, 13]]
        assert page.evaluate("score") == 20

    def test_wrong_pair_weighs_and_penalises(self, page):
        _force(page, "{t:TBE,a:14,b:16,pos:'back'}")
        page.fill(ROW.format(r=1, i=0), "3")
        page.fill(ROW.format(r=1, i=1), "3")
        page.click(".bl-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate(SUMS) == ["17", "19"]
        assert page.evaluate("report[0].wrongs") == ["3,3"]

    def test_empty_blank_only_nudges(self, page):
        _force(page, "{t:TBE,a:15,b:12,pos:'front'}")
        page.fill(ROW.format(r=1, i=0), "2")
        page.click(".bl-btn")
        assert page.evaluate("tryFirst") == 0


class TestBalanceRecipes:
    def test_queen_has_17_cards_with_one_balance_card(self, page):
        enter_mode(page, 'mx')
        page.wait_for_function("typeof EXERCISES.types.balance==='object'", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{const out=[];for(let i=0;i<6;i++){const d=makePool('mx');
            out.push({n:d.length,bal:d.filter(p=>p.t===TBE||p.t===TSB).map(p=>p.t),first:d[0].t});}
            return out;})()""")
        assert all(r["n"] == 17 for r in res), res
        assert all(len(r["bal"]) == 1 for r in res), res
        kinds = [r["bal"][0] for r in res]
        assert all(kinds[i] != kinds[i + 1] for i in range(len(kinds) - 1)), \
            f"the two kinds must take turns across Queen games, got {kinds}"
        assert page.evaluate("problems.length") == 17

    def test_champion_rotates_both_kinds_in(self, page):
        enter_mode(page, 'mulc')
        page.wait_for_function("typeof EXERCISES.types.balance==='object'", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{let e=0,s=0,len=new Set();for(let i=0;i<12;i++){const d=makePool('mulc');
            len.add(d.length);if(d.some(p=>p.t===TBE))e++;if(d.some(p=>p.t===TSB))s++;}
            return {e,s,len:[...len]};})()""")
        assert res["len"] == [15]
        assert res["e"] > 0 and res["s"] > 0, res

    def test_report_rows_show_the_balanced_arrangement(self, page):
        enter_mode(page, 'mulc')
        rows = page.evaluate("""(()=>{
            problems=[{t:TSB,nums:[3,5,7,9],a:12,sol:[9,3,5,7]},{t:TBE,a:14,b:16,pos:'back',sol:[[4,2],[5,3]]}];
            report=[{ptype:TSB,num1:12,wrongs:[],correct:12},{ptype:TBE,num1:14,num2:16,wrongs:[],correct:14}];
            return _reportRows();})()""")
        assert rows[0]["eq"] == "⚖️ 9 + 3 = 5 + 7" and rows[0]["correct"] == "3+9 = 5+7"
        assert rows[1]["eq"] == "⚖️ 14 + 4 = 16 + 2" and rows[1]["correct"] == "4,2 · 5,3"
