"""🎯 The RANGE card (exercises/num_range.ex.js, ptype TRG) — "אֵילוּ מִסְפָּרִים
נִמְצָאִים בֵּין 65 לְ-75?": tap every number strictly between the two bounds,
✓ submits. Added 2026-11-15 (user: "between 65 and 75 — of 50, 51, 66, 71, 79
she must choose only 66 and 71") to Queen (mx: one card on top, an 18-card
deck) and אַלּוּפָה (mulc: one card in every game, inside the 15); 2026-11-16 to
גָּשֵׁר 10 and גָּשֵׁר 20 (br/b20: question 15, a range ACROSS the ten the game
bridges — 7–13, 16–23).

Try-first: a wrong ✓ logs ONE mistake, marks the out-of-range picks red and
says why, hints that a number is missing WITHOUT pointing at it, and opens a
number line with the range as a gold band. ✓ with nothing marked only nudges.
"""
from helpers import TIMEOUT, enter_mode

USER_CARD = "{t:TRG,lo:65,hi:75,nums:[79,50,66,51,71],a:2}"     # the user's own example
HARD_CARD = "{t:TRG,lo:35,hi:45,nums:[53,38,34,47,12,41],a:2}"


def _force(page, mode, card):
    enter_mode(page, mode)
    page.wait_for_function(
        "typeof EXERCISES.types.num_range==='object' && typeof problems!=='undefined' && problems.length>0",
        timeout=TIMEOUT)
    page.evaluate(f"mode={mode!r};score=0;problems=[{card}];idx=0;report=[];done=false;tryFirst=0;loadProblem();")
    page.wait_for_selector(".rg-tile", timeout=TIMEOUT)
    page.wait_for_timeout(150)


def _tap(page, *vals):
    for v in vals:
        page.locator(f".rg-tile[data-v='{v}']").click()


def _marked(page):
    return page.evaluate("[...document.querySelectorAll('.rg-tile.rg-on')].map(t=>+t.dataset.v).sort((a,b)=>a-b)")


class TestCard:
    def test_the_users_example_mounts_as_the_question_and_five_tiles(self, page):
        _force(page, 'mx', USER_CARD)
        assert page.evaluate("ptype === TRG")
        q = page.inner_text(".rg-q")
        assert "65" in q and "75" in q and "בֵּין" in q, q
        assert page.evaluate("[...document.querySelectorAll('.rg-tile')].map(t=>+t.dataset.v)") == [79, 50, 66, 51, 71], \
            "the tiles keep the card's (shuffled) order"
        assert page.evaluate("[...document.querySelectorAll('.rg-post')].map(e=>e.textContent)") == ["65", "75"]
        assert not page.locator(".rg-nl").is_visible(), "no number line before a mistake (try-first)"
        assert "65" in page.inner_text("#hint") and "75" in page.inner_text("#hint")
        assert page.evaluate("getComputedStyle(document.getElementById('chk-btn')).display") == "none", \
            "the card checks itself — no host check button"

    def test_a_tap_marks_a_tile_and_a_second_tap_unmarks_it(self, page):
        _force(page, 'mx', USER_CARD)
        _tap(page, 66)
        assert _marked(page) == [66]
        assert page.get_attribute(".rg-tile[data-v='66']", "aria-pressed") == "true"
        _tap(page, 66)
        assert _marked(page) == []
        assert page.get_attribute(".rg-tile[data-v='66']", "aria-pressed") == "false"

    def test_check_with_nothing_marked_only_nudges(self, page):
        _force(page, 'mx', USER_CARD)
        page.click(".rg-btn")
        page.wait_for_timeout(200)
        assert page.evaluate("tryFirst") == 0 and page.evaluate("done") is False
        assert page.evaluate("report[0].wrongs.length") == 0

    def test_only_66_and_71_first_try_scores_full(self, page):
        _force(page, 'mx', USER_CARD)
        _tap(page, 66, 71)
        page.click(".rg-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 20, "first-try correct = the full Queen points"
        assert page.evaluate("report[0].gotCorrect") is True and page.evaluate("report[0].wrongs.length") == 0
        assert page.evaluate("[...document.querySelectorAll('.rg-tile.rg-good')].map(t=>+t.dataset.v).sort((a,b)=>a-b)") == [66, 71]

    def test_an_extra_number_is_a_mistake_marked_red_with_the_reason(self, page):
        """She marks 66, 71 AND 79: one mistake; 79 turns red and leaves play, the
        hint says 79 is bigger than 75, the number line opens with the gold band and
        a pin for every number; 66 and 71 stay marked, so ✓ again solves at 67%."""
        _force(page, 'mx', USER_CARD)
        _tap(page, 66, 71, 79)
        page.click(".rg-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("done") is False
        assert page.evaluate("report[0].wrongs") == ["66, 71, 79"]
        bad = page.locator(".rg-tile[data-v='79']")
        assert "rg-bad" in bad.get_attribute("class") and bad.is_disabled()
        assert _marked(page) == [66, 71]
        hint = page.inner_text("#hint")
        assert "79" in hint and "גָּדוֹל" in hint and "75" in hint, hint
        assert page.locator(".rg-nl").is_visible()
        assert page.locator(".rg-nl .rg-band").count() == 1
        assert page.evaluate("[...document.querySelectorAll('.rg-nl .rg-pin')].map(c=>+c.dataset.v)") == [50, 51, 66, 71, 79]
        page.click(".rg-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13, "solved on the second try: 67% of 20"

    def test_a_missed_number_is_hinted_but_not_pointed_at(self, page):
        """She marks only 66: one mistake, nothing turns red, the hint says ONE more
        number is missing — and 71 is not marked or highlighted for her."""
        _force(page, 'mx', USER_CARD)
        _tap(page, 66)
        page.click(".rg-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.locator(".rg-tile.rg-bad").count() == 0
        hint = page.inner_text("#hint")
        assert "חָסֵר עוֹד מִסְפָּר אֶחָד" in hint, hint
        cls = page.get_attribute(".rg-tile[data-v='71']", "class")
        assert "rg-on" not in cls and "rg-good" not in cls, "the missed number is NOT revealed"
        _tap(page, 71)
        page.click(".rg-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13

    def test_a_number_below_the_range_says_smaller(self, page):
        _force(page, 'mulc', HARD_CARD)
        _tap(page, 34, 38)
        page.click(".rg-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        hint = page.inner_text("#hint")
        assert "34" in hint and "קָטָן" in hint and "35" in hint and "חָסֵר עוֹד מִסְפָּר אֶחָד" in hint, hint
        _tap(page, 41)
        page.click(".rg-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 13, "אַלּוּפָה: 67% of 20"

    def test_report_row(self, page):
        _force(page, 'mx', USER_CARD)
        _tap(page, 50, 66)
        page.click(".rg-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        _tap(page, 71)
        page.click(".rg-btn")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        row = page.evaluate("_reportRows()[0]")
        assert row["eq"] == "🎯 65–75: 50 51 66 71 79"
        assert row["correct"] == "66, 71" and row["wrongs"] == ["50, 66"] and row["ok"] is False


class TestGenerator:
    def test_cards_are_well_formed_at_both_levels(self, page):
        """10-wide ranges on multiples of 5; 2-3 numbers inside, never a bound; no
        repeats; always a number below AND above the range and a near miss.
        Queen: 5 numbers over the whole spread; אַלּוּפָה: 6 numbers, only ranges
        that cross a decade, a near miss on EACH side, and (nearly always) the
        reversed digits of an inside number."""
        enter_mode(page, 'mulc')
        page.wait_for_function("typeof EXERCISES.types.num_range==='object'", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{const bad=[],st={};
            for(const lv of ['mx','mulc']){const s=st[lv]={n:new Set(),k:new Set(),lo:new Set(),bothNear:0,rev:0};
              for(let i=0;i<400;i++){const c=EXERCISES.types.num_range.make(lv)[0];
                const ins=c.nums.filter(v=>v>c.lo&&v<c.hi), out=c.nums.filter(v=>!(v>c.lo&&v<c.hi));
                s.n.add(c.nums.length);s.k.add(ins.length);s.lo.add(c.lo);
                if(c.t!==TRG||c.hi-c.lo!==10||c.lo%5)bad.push(['range',c]);
                if(new Set(c.nums).size!==c.nums.length)bad.push(['dup',c]);
                if(c.nums.some(v=>v===c.lo||v===c.hi||v<1||v>99))bad.push(['value',c]);
                if(ins.length!==c.a)bad.push(['a',c]);
                if(!out.some(v=>v<c.lo)||!out.some(v=>v>c.hi))bad.push(['sides',c]);
                const nl=out.some(v=>v>=c.lo-3&&v<c.lo),nh=out.some(v=>v<=c.hi+3&&v>c.hi);
                if(!(nl||nh))bad.push(['near',c]);
                if(nl&&nh)s.bothNear++;
                if(out.some(v=>ins.some(u=>u%10&&(u%10)*10+((u/10)|0)===v)))s.rev++;}
              for(const k of ['n','k','lo'])s[k]=[...s[k]].sort((a,b)=>a-b);}
            return {bad:bad.slice(0,4),st};})()""")
        assert res["bad"] == [], res["bad"]
        mx, mulc = res["st"]["mx"], res["st"]["mulc"]
        assert mx["n"] == [5] and mulc["n"] == [6]
        assert mx["k"] == [2, 3] and mulc["k"] == [2, 3]
        assert mx["lo"] == list(range(10, 85, 5)), "Queen rotates through every range 10–20 … 80–90"
        assert mulc["lo"] == [15, 25, 35, 45, 55, 65, 75], "אַלּוּפָה only gets ranges that cross a decade"
        assert mulc["bothNear"] == 400, "אַלּוּפָה always has a near miss on each side"
        assert mulc["rev"] >= 360, f"אַלּוּפָה nearly always has the reversed-digits trap, got {mulc['rev']}/400"

    def test_ranges_take_turns_through_a_no_repeat_queue(self, page):
        """Every range comes round once before any comes round again: over 10
        cycles' worth of draws each range is drawn 10 times, give or take one —
        the cycle already under way at the start and the one cut off at the end
        can each add or miss a draw (a plain random pick spreads like 4..17)."""
        enter_mode(page, 'mulc')
        page.wait_for_function("typeof EXERCISES.types.num_range==='object'", timeout=TIMEOUT)
        for lv, n in (("mulc", 7), ("mx", 15)):
            cnt = page.evaluate(f"""(()=>{{const c={{}};for(let i=0;i<{n * 10};i++){{const lo=EXERCISES.types.num_range.make('{lv}')[0].lo;c[lo]=(c[lo]||0)+1;}}return Object.values(c);}})()""")
            assert len(cnt) == n and min(cnt) >= 9 and max(cnt) <= 11, (lv, cnt)

    def test_bridge_cards_cross_the_ten_they_bridge(self, page):
        """2026-11-16, גָּשֵׁר 10 / גָּשֵׁר 20: ranges 4–8 wide ACROSS the ten the game bridges,
        the bounds 2–6 either side of it (4–12 … 8–16 / 14–22 … 18–26, 15 ranges each); 5
        numbers up to 20 / 30 with one inside on EACH side of that ten, a near miss, a
        number below and above the range; in גָּשֵׁר 20 the reversed digits of an inside
        21 (12) whenever the row has room for it."""
        enter_mode(page, 'br')
        page.wait_for_function("typeof EXERCISES.types.num_range==='object'", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{const bad=[],st={};
            for(const [lv,t,max] of [['br',10,20],['b20',20,30]]){const s=st[lv]={ranges:new Set(),k:new Set(),has21:0,rev:0};
              for(let i=0;i<600;i++){const c=EXERCISES.types.num_range.make(lv)[0];
                const ins=c.nums.filter(v=>v>c.lo&&v<c.hi), out=c.nums.filter(v=>!(v>c.lo&&v<c.hi));
                s.ranges.add(c.lo+'-'+c.hi);s.k.add(ins.length);
                if(c.t!==TRG||c.nums.length!==5)bad.push(['card',c]);
                if(!(c.lo>=t-6&&c.lo<=t-2&&c.hi>=t+2&&c.hi<=t+6&&c.hi-c.lo<=8))bad.push(['range',c]);
                if(new Set(c.nums).size!==5)bad.push(['dup',c]);
                if(c.nums.some(v=>v===c.lo||v===c.hi||v<1||v>max))bad.push(['value',c]);
                if(ins.length!==c.a)bad.push(['a',c]);
                if(!ins.some(v=>v<t)||!ins.some(v=>v>t))bad.push(['across',c]);
                if(!out.some(v=>v<c.lo)||!out.some(v=>v>c.hi))bad.push(['sides',c]);
                if(!out.some(v=>(v>=c.lo-3&&v<c.lo)||(v>c.hi&&v<=c.hi+3)))bad.push(['near',c]);
                if(ins.includes(21)){s.has21++;if(out.includes(12))s.rev++;}}
              s.ranges=s.ranges.size;s.k=[...s.k].sort();}
            return {bad:bad.slice(0,4),st};})()""")
        assert res["bad"] == [], res["bad"]
        br, b20 = res["st"]["br"], res["st"]["b20"]
        assert br["ranges"] == 15 and b20["ranges"] == 15, res["st"]
        assert br["k"] == [2, 3] and b20["k"] == [2, 3], res["st"]
        assert b20["has21"] > 100 and b20["rev"] >= b20["has21"] // 2, b20     # not when 3 inside + a near miss below fill the row

    def test_bridge_ranges_take_turns_through_a_no_repeat_queue(self, page):
        """Each bridge's 15 ranges come round once before any comes round again (10
        cycles' worth of draws: every range 10 times, give or take one)."""
        enter_mode(page, 'br')
        page.wait_for_function("typeof EXERCISES.types.num_range==='object'", timeout=TIMEOUT)
        for lv in ("br", "b20"):
            cnt = page.evaluate(f"""(()=>{{const c={{}};for(let i=0;i<150;i++){{const r=EXERCISES.types.num_range.make('{lv}')[0],k=r.lo+'-'+r.hi;c[k]=(c[k]||0)+1;}}return Object.values(c);}})()""")
            assert len(cnt) == 15 and min(cnt) >= 9 and max(cnt) <= 11, (lv, cnt)


class TestDecks:
    def test_queen_has_19_cards_with_one_range_card_at_question_15(self, page):
        enter_mode(page, 'mx')
        page.wait_for_function("typeof EXERCISES.types.num_range==='object'", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{const out=[];for(let i=0;i<6;i++){const d=makePool('mx');
            out.push({n:d.length,rg:d.map((p,j)=>p.t===TRG?j:-1).filter(j=>j>=0),bal:d.findIndex(p=>p.t===TBE||p.t===TSB)});}
            return out;})()""")
        assert all(r["n"] == 19 for r in res), res
        assert all(r["rg"] == [14] for r in res), res
        assert all(r["bal"] == 12 for r in res), "the balance card keeps question 13"
        assert page.evaluate("problems.length") == 19

    def test_champion_has_one_range_card_in_every_game(self, page):
        enter_mode(page, 'mulc')
        page.wait_for_function("typeof EXERCISES.types.num_range==='object'", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{const out=[];for(let i=0;i<8;i++){const d=makePool('mulc');
            out.push({n:d.length,rg:d.filter(p=>p.t===TRG).length,first:d[0].t,
                      reading:d.map((p,j)=>[TSQ,TCZ,TTF,TWM,TSO,TRH].includes(p.t)?j:-1).filter(j=>j>=0)});}
            return out;})()""")
        assert all(r["n"] == 15 for r in res), res
        assert all(r["rg"] == 1 for r in res), res
        assert all(r["first"] == page.evaluate("TMK") for r in res), "question 1 stays the multiplication card"
        assert all(r["reading"] == [3, 7, 11] for r in res), "the reading cards keep their slots"

    def test_the_card_plays_in_a_real_queen_game(self, page):
        """A REAL Queen game: question 15 is the range card, drawn on screen."""
        enter_mode(page, 'mx')
        page.wait_for_function("typeof EXERCISES.types.num_range==='object'", timeout=TIMEOUT)
        page.evaluate("mode='mx';restart()")
        page.wait_for_function("window.POOL_PENDING!==true && problems.length===19", timeout=TIMEOUT)
        assert page.evaluate("problems[14].t") == page.evaluate("TRG")
        page.evaluate("idx=14;done=false;tryFirst=0;loadProblem();")
        page.wait_for_selector(".rg-tile", state="visible", timeout=TIMEOUT)
        n = page.evaluate("problems[14].nums.length")
        assert page.locator(".rg-tile").count() == n == 5
        prog = page.inner_text("#prog-txt")
        assert "15" in prog and "19" in prog, prog
        box = page.locator(".rg-root").bounding_box()
        vw = page.viewport_size
        assert box and box["x"] >= 0 and box["x"] + box["width"] <= vw["width"] + 1, box

    def test_both_bridges_carry_one_range_card_at_question_15(self, page):
        """גָּשֵׁר 10: all six sets carry the range card at question 15 (12 facts + 2
        balance + 1 — sets 1–5 each gave their easiest fact up for it — + the 🧠 logic
        puzzle after it since 2026-11-22: 16); גָּשֵׁר 20: 19 cards (15 + 2 + 1 + 1), the range
        card at question 15. Each card is its bridge's level: a range across 10
        (numbers up to 20) / across 20 (up to 30)."""
        enter_mode(page, 'br')
        page.wait_for_function("typeof EXERCISES.types.num_range==='object'", timeout=TIMEOUT)
        for fn, builds, n, t in (("makeBridgePool", 6, 16, 10), ("makeBridge20Pool", 5, 19, 20)):
            res = page.evaluate(f"""(()=>{{const out=[];for(let i=0;i<{builds};i++){{const d={fn}(),rg=d.map((p,j)=>p.t===TRG?j:-1).filter(j=>j>=0),c=d[rg[0]]||{{}};
                out.push({{n:d.length,rg,lo:c.lo,hi:c.hi,max:Math.max(...(c.nums||[0]))}});}}return out;}})()""")
            assert all(r["n"] == n and r["rg"] == [14] for r in res), (fn, res)
            assert all(r["lo"] < t < r["hi"] and r["hi"] - r["lo"] <= 8 and r["max"] <= t + 10 for r in res), (fn, res)

    def test_the_card_plays_in_a_real_bridge_game(self, page):
        """REAL bridge games: question 15 is the range card, drawn on screen and scored
        like any bridge answer (15) — the 15th of 16 in גָּשֵׁר 10, the 15th of 19 in גָּשֵׁר 20."""
        for m, n in (("br", 16), ("b20", 19)):
            enter_mode(page, m)
            page.wait_for_function(f"window.POOL_PENDING!==true && typeof EXERCISES.types.num_range==='object' && problems.length==={n}", timeout=TIMEOUT)
            assert page.evaluate("problems[14].t") == page.evaluate("TRG")
            page.evaluate("idx=14;score=0;done=false;tryFirst=0;loadProblem();")
            page.wait_for_selector(".rg-tile", state="visible", timeout=TIMEOUT)
            assert page.locator(".rg-tile").count() == 5
            prog = page.inner_text("#prog-txt")
            assert "15" in prog and str(n) in prog, prog
            _tap(page, *page.evaluate("problems[14].nums.filter(v=>v>problems[14].lo&&v<problems[14].hi)"))
            page.click(".rg-btn")
            page.wait_for_function("done === true", timeout=TIMEOUT)
            assert page.evaluate("score") == 15, f"{m}: first-try correct = the bridge's 15 points"

    def test_tester_mode_serves_every_level(self, page):
        """The tester handle: two cards of each level — Queen, אַלּוּפָה (6 numbers) and the two
        bridges (ranges narrower than 10)."""
        enter_mode(page, 'rng')
        page.wait_for_function("window.POOL_PENDING!==true && problems.length>0", timeout=TIMEOUT)
        res = page.evaluate("({n:problems.length,all:problems.every(p=>p.t===TRG),sizes:[...new Set(problems.map(p=>p.nums.length))].sort(),pts:modePts(),"
                            "wide:problems.filter(p=>p.hi-p.lo===10).length,narrow:problems.filter(p=>p.hi-p.lo<=8).length})")
        assert res == {"n": 8, "all": True, "sizes": [5, 6], "pts": 15, "wide": 4, "narrow": 4}, res


class TestPhone:
    def test_six_tiles_and_the_line_fit_a_phone(self, page):
        page.set_viewport_size({"width": 390, "height": 844})
        _force(page, 'mulc', HARD_CARD)
        _tap(page, 34)
        page.click(".rg-btn")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        page.wait_for_selector(".rg-nl svg", state="visible", timeout=TIMEOUT)
        boxes = page.evaluate("""[...document.querySelectorAll('.rg-tile, .rg-nl, .rg-btn')].map(e=>{const r=e.getBoundingClientRect();
            return {l:r.left,r:r.right,w:r.width};})""")
        assert all(b["l"] >= 0 and b["r"] <= 391 and b["w"] > 0 for b in boxes), boxes
