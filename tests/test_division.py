"""Division WITHOUT a division sign — four אַלּוּפָה kinds:

TDL deal.ex.js       חֲלֻקָּה בְּתוֹרוֹת — tap the pile, one item to each friend in turn
TPK pack.ex.js       אֲרִיזָה — n items, b per box: how many boxes?
TFR fair.ex.js       זֶה הוֹגֵן? — move items between uneven plates until they're equal
TCN can_share.ex.js  אֶפְשָׁר לְחַלֵּק? — yes/no, can it be shared with nothing left?

All are try-first: the counting aid (count badges / the packing / the dealt
groups) only appears with a mistake or the verdict.
"""
from helpers import TIMEOUT, enter_mode

KINDS = "['deal','pack','fair','can_share'].every(k=>typeof EXERCISES.types[k]==='object')"


def _force(page, js, sel):
    enter_mode(page, 'mulc')
    page.wait_for_function(KINDS + " && typeof problems!=='undefined' && problems.length>0", timeout=TIMEOUT)
    page.evaluate(f"mode='mulc';score=0;problems=[{js}];idx=0;report=[];done=false;tryFirst=0;loadProblem();")
    page.wait_for_selector(sel, timeout=TIMEOUT)
    page.wait_for_timeout(150)


def _enter(page, sel, v):
    page.fill(sel, str(v))
    page.press(sel, "Enter")


DEAL = "{t:TDL,n:12,k:4,a:3,item:'🍓',itemName:'תּוּתִים',names:['דָּנָה','נֹעָה','רוֹנִי','מַיָּה']}"
PLATES = "[...document.querySelectorAll('.dl-plate')].map(p=>p.children.length)"


class TestDeal:
    def test_mounts_a_pile_and_empty_plates_first_friend_on_the_right(self, page):
        _force(page, DEAL, ".dl-pile")
        assert page.evaluate("ptype === TDL")
        assert page.locator(".dl-pile .dl-it").count() == 12
        assert page.evaluate(PLATES) == [0, 0, 0, 0]
        assert page.evaluate("document.querySelector('.dl-fr.dl-turn').dataset.i") == "0"
        x0, x1 = page.evaluate("[0,1].map(i=>document.querySelector('.dl-fr[data-i=\"'+i+'\"]').getBoundingClientRect().left)")
        assert x0 > x1, "the first-named friend sits on the RIGHT (Hebrew reading order)"
        assert not page.evaluate("!!document.querySelector('.dl-counts')"), "no counts before a mistake"

    def test_each_tap_deals_to_the_next_friend_in_turn(self, page):
        _force(page, DEAL, ".dl-pile")
        for _ in range(5):
            page.locator(".dl-pile .dl-it").first.click()
        page.wait_for_timeout(500)
        assert page.evaluate(PLATES) == [2, 1, 1, 1]
        assert page.evaluate("document.querySelector('.dl-fr.dl-turn').dataset.i") == "1"

    def test_wrong_before_dealing_asks_to_deal_then_counts_appear(self, page):
        _force(page, DEAL, ".dl-pile")
        _enter(page, ".dl-inp", 4)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert not page.evaluate("!!document.querySelector('.dl-counts')"), "nothing to count until all is dealt"
        while page.locator(".dl-pile .dl-it").count():
            page.locator(".dl-pile .dl-it").first.click()
        page.wait_for_function("!!document.querySelector('.dl-counts')", timeout=TIMEOUT)
        assert page.evaluate(PLATES) == [3, 3, 3, 3]
        page.wait_for_function("document.querySelector('.dl-inp').value===''", timeout=TIMEOUT)
        _enter(page, ".dl-inp", 3)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_answer_in_her_head_scores_full_and_deals_the_rest(self, page):
        _force(page, DEAL, ".dl-pile")
        _enter(page, ".dl-inp", 3)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        page.wait_for_function(PLATES + ".join()==='3,3,3,3'", timeout=TIMEOUT)

    def test_pool_mixes_friend_counts_and_divides_exactly(self, page):
        _force(page, DEAL, ".dl-pile")
        pool = page.evaluate("EXERCISES.types.deal.make('deal').map(p=>({n:p.n,k:p.k,a:p.a}))")
        assert all(p["n"] == p["k"] * p["a"] and p["n"] <= 16 for p in pool), pool
        assert {p["k"] for p in pool} == {2, 3, 4}, pool


PACK = "{t:TPK,n:12,b:4,a:3,it:0}"


class TestPack:
    def test_before_a_mistake_only_the_sample_box_no_packing(self, page):
        _force(page, PACK, ".pk-pile")
        assert page.locator(".pk-pile .pk-it").count() == 12
        assert page.locator(".pk-sample .pk-slot").count() == 4
        page.click(".pk-pile")
        page.wait_for_timeout(300)
        assert page.locator(".pk-boxes .pk-box").count() == 0, "a tap must not pack before a mistake"
        assert page.locator(".pk-pile .pk-it").count() == 12

    def test_mistake_opens_packing_one_box_per_tap(self, page):
        _force(page, PACK, ".pk-pile")
        _enter(page, ".pk-inp", 4)
        page.wait_for_function("tryFirst === 1 && !!document.querySelector('.pk-open')", timeout=TIMEOUT)
        for i in range(3):
            page.click(".pk-pile")
            page.wait_for_timeout(600)
            assert page.locator(".pk-boxes .pk-box").count() == i + 1
        assert page.locator(".pk-pile .pk-it").count() == 0
        assert page.evaluate("[...document.querySelectorAll('.pk-boxes .pk-box')].every(b=>b.querySelectorAll('.pk-it').length===4)")
        page.wait_for_function("document.querySelector('.pk-inp').value===''", timeout=TIMEOUT)
        _enter(page, ".pk-inp", 3)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_right_first_try_scores_full(self, page):
        _force(page, PACK, ".pk-pile")
        _enter(page, ".pk-inp", 3)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20

    def test_pool_divides_exactly_up_to_20(self, page):
        _force(page, PACK, ".pk-pile")
        pool = page.evaluate("EXERCISES.types.pack.make('pack').map(p=>({n:p.n,b:p.b,a:p.a}))")
        assert all(p["n"] == p["b"] * p["a"] and p["n"] <= 20 and 2 <= p["b"] <= 5 for p in pool), pool


FAIR = "{t:TFR,k:3,start:[6,1,2],a:3,item:'🍪',itemName:'עוּגִיּוֹת',names:['דָּנָה','נֹעָה','רוֹנִי']}"
FCOUNTS = "[...document.querySelectorAll('.fr-plate')].map(p=>p.children.length)"


def _move(page, src, dst):
    page.locator(".fr-col").nth(src).locator(".fr-it").first.click()
    page.locator(".fr-col").nth(dst).locator(".fr-plate").click()
    page.wait_for_timeout(420)


class TestFair:
    def test_moving_keeps_the_total(self, page):
        _force(page, FAIR, ".fr-plates")
        assert page.evaluate(FCOUNTS) == [6, 1, 2]
        _move(page, 0, 1)
        assert page.evaluate(FCOUNTS) == [5, 2, 2]
        assert sum(page.evaluate(FCOUNTS)) == 9

    def test_lifted_item_tapped_again_goes_back_down(self, page):
        _force(page, FAIR, ".fr-plates")
        it = page.locator(".fr-col").nth(0).locator(".fr-it").first
        it.click()
        assert page.evaluate("!!document.querySelector('.fr-it.fr-lift')")
        it.click()
        assert not page.evaluate("!!document.querySelector('.fr-it.fr-lift')")
        assert page.evaluate(FCOUNTS) == [6, 1, 2]

    def test_uneven_check_is_a_mistake_with_counts_then_fair_then_count(self, page):
        _force(page, FAIR, ".fr-plates")
        assert not page.evaluate("!!document.querySelector('.fr-counts')")
        page.click(".fr-fairbtn")
        page.wait_for_function("tryFirst === 1 && !!document.querySelector('.fr-counts')", timeout=TIMEOUT)
        _move(page, 0, 1); _move(page, 0, 1); _move(page, 0, 2)
        assert page.evaluate(FCOUNTS) == [3, 3, 3]
        page.click(".fr-fairbtn")
        page.wait_for_function("!!document.querySelector('.fr-ok')", timeout=TIMEOUT)
        _move_attempt = page.locator(".fr-col").nth(0).locator(".fr-it").first
        _move_attempt.click()
        assert not page.evaluate("!!document.querySelector('.fr-it.fr-lift')"), "moving locks once it's fair"
        _enter(page, ".fr-inp", 3)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_generator_starts_uneven(self, page):
        _force(page, FAIR, ".fr-plates")
        bad = page.evaluate("""(()=>{const bad=[];for(let i=0;i<300;i++){for(const p of EXERCISES.types.fair.make('fair')){
            const c=p.start,s=c.reduce((a,b)=>a+b,0);
            if(s!==p.k*p.a||c.length!==p.k||Math.max(...c)-Math.min(...c)<2||c.some(v=>v<1||v>2*p.a))bad.push(c);}}return bad.slice(0,5);})()""")
        assert bad == []


class TestCanShare:
    def test_no_card_wrong_then_right_shows_the_leftover(self, page):
        _force(page, "{t:TCN,n:9,k:2,a:2,item:'🍬',itemName:'סֻכָּרִיּוֹת'}", ".cn-row")
        assert page.locator(".cn-row > .cn-it").count() == 9, "one unbroken row before the verdict"
        page.click(".cn-btn")
        assert page.evaluate("tryFirst") == 0, "✓ with nothing picked only nudges"
        page.locator(".cn-opt").nth(0).click()       # "yes" — wrong
        page.click(".cn-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.locator(".cn-grp").count() == 2 and page.locator(".cn-left .cn-it").count() == 1
        page.locator(".cn-opt").nth(1).click()
        page.click(".cn-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_yes_card_right_first_try_full_and_no_leftover(self, page):
        _force(page, "{t:TCN,n:12,k:3,a:1,item:'🎈',itemName:'בַּלּוֹנִים'}", ".cn-row")
        page.locator(".cn-opt").nth(0).click()
        page.click(".cn-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20
        assert page.locator(".cn-grp").count() == 3 and page.locator(".cn-left").count() == 0

    def test_deck_is_balanced_yes_and_no(self, page):
        _force(page, "{t:TCN,n:9,k:2,a:2,item:'🍬',itemName:'סֻכָּרִיּוֹת'}", ".cn-row")
        res = page.evaluate("""(()=>{let y=0,n=0,bad=0;for(let i=0;i<100;i++)for(const p of EXERCISES.types.can_share.make('cansh')){
            if((p.n%p.k===0)!==(p.a===1))bad++;p.a===1?y++:n++;}return {y,n,bad};})()""")
        assert res["bad"] == 0 and res["y"] == res["n"], res


class TestDivisionRecipes:
    def test_all_four_rotate_into_champion(self, page):
        enter_mode(page, 'mulc')
        page.wait_for_function(KINDS, timeout=TIMEOUT)
        seen = page.evaluate("""(()=>{const c={};for(let i=0;i<9;i++){const d=makePool('mulc');
            for(const t of [TDL,TPK,TFR,TCN])if(d.some(p=>p.t===t))c[t]=1;}return Object.keys(c).length;})()""")
        assert seen == 4

    def test_report_rows(self, page):
        enter_mode(page, 'mulc')
        rows = page.evaluate("""(()=>{
            problems=[{t:TDL,n:12,k:4,a:3},{t:TPK,n:12,b:4,a:3},{t:TFR,k:3,start:[6,1,2],a:3},{t:TCN,n:9,k:2,a:2}];
            report=[{ptype:TDL,num1:3,wrongs:[],correct:3},{ptype:TPK,num1:3,wrongs:[],correct:3},
                    {ptype:TFR,num1:3,wrongs:['6-1-2'],correct:3},{ptype:TCN,num1:2,wrongs:['כֵּן, אֶפְשָׁר'],correct:2}];
            return _reportRows();})()""")
        assert rows[0]["eq"] == "🃏 12 ÷ 4 = 3"
        assert rows[1]["eq"] == "📦 12 ÷ 4 = 3"
        assert rows[2]["eq"] == "⚖️ 6 · 1 · 2 → 3 × 3"
        assert rows[3]["correct"] == "לֹא" and "נִשְׁאָר 1" in rows[3]["eq"]


class TestQueenDivision:
    def test_queen_gets_one_division_card_and_all_six_kinds_take_turns(self, page):
        """Queen (mx) is 17 cards: the 15 base + one balance card + ONE division card,
        which walks through all six division kinds (the old שָׁוֶה בְּשָׁוֶה + ice-cream
        shop, and deal / pack / fair / can_share) over six consecutive games."""
        enter_mode(page, 'mx')
        page.wait_for_function(
            "['half','ice_cream','deal','pack','fair','can_share'].every(k=>typeof EXERCISES.types[k]==='object')",
            timeout=TIMEOUT)
        res = page.evaluate("""(()=>{const D=[THF,TIC,TDL,TPK,TFR,TCN],out=[];
            for(let i=0;i<6;i++){const d=makePool('mx');out.push({n:d.length,div:d.filter(p=>D.includes(p.t)).map(p=>p.t),first:d[0].t});}
            return out;})()""")
        assert all(r["n"] == 17 for r in res), res
        assert all(len(r["div"]) == 1 for r in res), res
        assert len({r["div"][0] for r in res}) == 6, f"six games must cover all six division kinds: {res}"
        assert page.evaluate("problems.length") == 17
