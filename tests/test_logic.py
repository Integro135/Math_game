"""הִגָּיוֹן 🧠 — the logic-questions game (mode 'logic', exercises/logic.ex.js).

Seven kinds of multiple-choice logic card (מִי אֲנִי / מִי לֹא שַׁיָּךְ / ordering /
patterns / אִם-אָז / analogies / cause→effect). A wrong pick is crossed out, and
on a מִי אֲנִי card the clue that rules it out lights up.

Plus two interactive PUZZLE kinds (2026-11-22): חִידַת חֲלֻקָּה (dist — share items
so every request holds) and מִי יוֹשֵׁב אֵיפֹה? (seat — seat friends on numbered
chairs by their requests). 4 of the 15 הִגָּיוֹן cards, the 14th אַלּוּפָה question,
and one card on top of every Queen game."""
import pytest
from helpers import *

_NIQQUD = set(chr(c) for c in range(0x05B0, 0x05C8))
def _has_niqqud(s):
    return any(ch in s for ch in _NIQQUD)

KINDS = ["who", "odd", "ord", "pat", "rule", "ana", "then"]      # the quick-choice kinds
PUZZLES = ["dist", "seat"]                                        # the interactive puzzle kinds


def _enter_logic(page):
    enter_mode(page, 'logic')
    page.wait_for_function("typeof EXERCISES.types.logic==='object' && problems.length>0", timeout=TIMEOUT)


def _force(page, kind, i=0):
    """Serve ONE specific bank item as the current card and wait for its mount."""
    page.evaluate(f"""(()=>{{const L=EXERCISES.types.logic;
        mode='logic';score=0;problems=[L._makeOne('{kind}',L._banks['{kind}'][{i}])];idx=0;loadProblem();}})()""")
    page.wait_for_selector(".lg-opt", timeout=TIMEOUT)
    page.wait_for_timeout(120)


class TestLogicGame:
    def test_registered_under_medium_with_picker_button(self, page):
        assert page.evaluate(
            "DIFFICULTY_GROUPS.find(g=>g.id==='medium').modes.some(m=>m.id==='logic')")
        assert page.evaluate("!!document.getElementById('lblogic')"), "the picker button must render"

    def test_pool_is_fifteen_logic_cards_covering_every_kind(self, page):
        _enter_logic(page)
        res = page.evaluate("""(()=>{const d=makePool('logic');
            return {len:d.length, types:[...new Set(d.map(p=>p.t))], kinds:[...new Set(d.map(p=>p.k))]};})()""")
        assert res["len"] == 15
        assert res["types"] == ["logic"], f"only logic cards, got {res['types']}"
        assert sorted(res["kinds"]) == sorted(KINDS + PUZZLES), f"every kind must appear, got {res['kinds']}"

    def test_pool_holds_two_of_each_puzzle(self, page):
        _enter_logic(page)
        res = page.evaluate("""(()=>{const out=[];for(let i=0;i<5;i++){const d=makePool('logic');
            out.push({dist:d.filter(p=>p.k==='dist').length,seat:d.filter(p=>p.k==='seat').length});}return out;})()""")
        assert all(r == {"dist": 2, "seat": 2} for r in res), res

    def test_scores_fifteen_per_card(self, page):
        assert page.evaluate("(()=>{mode='logic';return modePts();})()") == 15


class TestLogicBanks:
    def _banks(self, page):
        _enter_logic(page)
        return page.evaluate("EXERCISES.types.logic._banks")

    def test_banks_meet_their_floors(self, page):
        b = self._banks(page)
        floors = {"who": 28, "odd": 17, "ord": 10, "pat": 14, "rule": 12, "ana": 12, "then": 12}
        for k, n in floors.items():
            assert len(b[k]) >= n, f"{k}: {len(b[k])} < {n}"

    def test_who_riddles_are_unambiguous(self, page):
        """Same gender for all options (clue grammar can't give the answer away);
        the answer has no ruling-out clue; every distractor names a real clue."""
        for i, r in enumerate(self._banks(page)["who"]):
            g = {o["g"] for o in r["opts"]}
            assert len(g) == 1, f"who[{i}] mixes genders {g}"
            assert r["opts"][0].get("no") is None, f"who[{i}]: the answer can't be ruled out"
            for o in r["opts"][1:]:
                assert isinstance(o.get("no"), int) and 0 <= o["no"] < len(r["lines"]), \
                    f"who[{i}] distractor {o['w']} needs a valid ruling-out clue"
            assert len({o["w"] for o in r["opts"]}) == len(r["opts"])

    def test_patterns_follow_from_their_period(self, page):
        """A non-numeric row must repeat with some period p (≥2 full periods
        shown), and the answer must be what that period predicts."""
        for i, r in enumerate(self._banks(page)["pat"]):
            if r.get("num"):
                continue
            row = r["row"]
            ps = [p for p in range(1, len(row) // 2 + 1)
                  if all(row[j] == row[j - p] for j in range(p, len(row)))]
            assert ps, f"pat[{i}] {row} is not periodic"
            nxt = row[len(row) - ps[0]]
            assert r["opts"][0]["e"] == nxt, f"pat[{i}] answer {r['opts'][0]['e']} != predicted {nxt}"
            assert len({o['e'] for o in r['opts']}) == 3

    def test_order_answers_are_not_always_first_or_last_named(self, page):
        pos = set()
        for r in self._banks(page)["ord"]:
            names = [o["w"] for o in r["opts"]]
            text = " ".join(r["lines"])
            order = sorted(names, key=lambda n: text.find(n.replace("הָ", "").replace("הַ", "").replace("הֶ", "")))
            pos.add(order.index(names[0]))
        assert pos == {0, 1, 2}, f"the answer should sit first, middle AND last across the bank, got {pos}"

    def test_all_text_is_vowelled_and_emoji_free(self, page):
        b = self._banks(page)
        for k, bank in b.items():
            for i, r in enumerate(bank):
                for t in r.get("lines", []) + ([r["q"]] if r.get("q") else []) + ([r["why"]] if r.get("why") else []):
                    assert _has_niqqud(t), f"{k}[{i}] not vowelled: {t!r}"
                    assert not any(ord(c) > 0x2600 for c in t), f"{k}[{i}] has an emoji in its text: {t!r}"
                for o in r["opts"]:
                    if o.get("w") and not r.get("num"):
                        assert _has_niqqud(o["w"]), f"{k}[{i}] option not vowelled: {o['w']!r}"


class TestLogicPlay:
    def test_correct_answer_scores_full_and_explains(self, page):
        _enter_logic(page)
        _force(page, "rule", 4)
        page.evaluate("document.querySelector(`.lg-opt[data-i=\"${num1}\"]`).click()")
        page.click(".lg-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 15
        assert page.evaluate("document.querySelector('.lg-why').classList.contains('lg-on')")

    def test_wrong_who_pick_is_crossed_out_and_its_clue_lights_up(self, page):
        _enter_logic(page)
        _force(page, "who", 0)          # cat: 4 legs / meow — dog ruled out by clue 2
        wrong = page.evaluate("problems[0].opts.findIndex(o=>o.w==='כֶּלֶב')+1")
        page.evaluate(f"document.querySelector('.lg-opt[data-i=\"{wrong}\"]').click()")
        page.click(".lg-chk")
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert page.evaluate("document.querySelector('.lg-clue[data-c=\"1\"]').classList.contains('lg-hit')"), \
            "the meow clue must light up for the dog"
        assert not page.evaluate("document.querySelector('.lg-clue[data-c=\"0\"]').classList.contains('lg-hit')")
        page.wait_for_timeout(800)
        assert page.evaluate(f"document.querySelector('.lg-opt[data-i=\"{wrong}\"]').classList.contains('lg-x')")
        # a crossed-out option can't be selected again
        page.evaluate(f"document.querySelector('.lg-opt[data-i=\"{wrong}\"]').click()")
        assert not page.evaluate(f"document.querySelector('.lg-opt[data-i=\"{wrong}\"]').classList.contains('lg-sel')")
        page.evaluate("document.querySelector(`.lg-opt[data-i=\"${num1}\"]`).click()")
        page.click(".lg-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 10, "one mistake → 67% of 15"

    def test_pattern_fills_the_slot_when_solved(self, page):
        _enter_logic(page)
        _force(page, "pat", 0)
        assert page.evaluate("document.querySelector('.lg-slot').textContent") == "❓"
        page.evaluate("document.querySelector(`.lg-opt[data-i=\"${num1}\"]`).click()")
        page.click(".lg-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("document.querySelector('.lg-slot').textContent") == "🍌"

    @pytest.mark.parametrize("kind", KINDS)
    def test_every_kind_mounts(self, page, kind):
        _enter_logic(page)
        _force(page, kind, 0)
        n = page.evaluate("document.querySelectorAll('.lg-opt').length")
        assert n == (4 if kind == "odd" else 3)
        assert page.evaluate("ptype === TLG")


class TestLogicWeave:
    """Superman + אַלּוּפָה carry 2 logic cards per game at the 6th and 14th
    question, inside the 15-card deck (reading stays at every 4th slot)."""
    @pytest.mark.parametrize("mode", ["sup", "mulc"])
    def test_two_logic_cards_at_6th_and_14th(self, page, mode):
        enter_mode(page, mode)
        page.wait_for_function("typeof EXERCISES.types.logic==='object' && problems.length>0", timeout=TIMEOUT)
        res = page.evaluate("""()=>{const out=[];
            for(let i=0;i<8;i++){const d=makePool(mode);
              out.push({len:d.length, at:d.map((p,i)=>p.t===TLG?i:-1).filter(i=>i>=0), k:d.filter(p=>p.t===TLG).map(p=>p.k)});}
            return out;}""".replace("mode", repr(mode)))
        kinds = set()
        for r in res:
            assert r["len"] == 15, r
            assert r["at"] == [5, 13], f"logic must sit at the 6th + 14th question, got {r['at']}"
            kinds.update(r["k"])
        assert len(kinds) >= 6, f"the weave must rotate through the kinds, got {kinds}"

    def test_live_superman_game_mounts_a_logic_card(self, page):
        enter_mode(page, "sup")
        page.wait_for_function("problems.length===15", timeout=TIMEOUT)
        page.evaluate("idx=5;loadProblem();")
        page.wait_for_selector(".lg-opt", timeout=TIMEOUT)
        assert page.evaluate("ptype === TLG")
        page.evaluate("document.querySelector(`.lg-opt[data-i=\"${num1}\"]`).click()")
        page.click(".lg-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)


# ═════════════════════════════════════════════════════════════════════════════
# PUZZLES — חִידַת חֲלֻקָּה (dist) + מִי יוֹשֵׁב אֵיפֹה? (seat), 2026-11-22
# ═════════════════════════════════════════════════════════════════════════════
def _strip(s):
    return "".join(ch for ch in s if ch not in _NIQQUD)


def _force_pz(page, kind, i=0, mode="logic"):
    """Serve ONE specific puzzle as the current card and wait for its mount."""
    page.evaluate(f"""(()=>{{const L=EXERCISES.types.logic;
        mode='{mode}';score=0;problems=[L._makeOne('{kind}',L._puzzles['{kind}'][{i}])];idx=0;
        done=false;tryFirst=0;loadProblem();}})()""")
    page.wait_for_selector(".pz-root", timeout=TIMEOUT)
    page.wait_for_timeout(120)


def _deal(page, counts):
    """dist: press + on each friend until they hold counts[i] (from an empty start)."""
    page.evaluate("""(c)=>{const pl=document.querySelectorAll('.pz-plus');
        c.forEach((n,i)=>{for(let j=0;j<n;j++)pl[i].click();});}""", counts)


def _empty(page):
    """dist: press − until every friend is back to 0."""
    page.evaluate("""()=>document.querySelectorAll('.pz-minus').forEach(m=>{while(!m.disabled)m.click();})""")


def _seat(page, names):
    """seat: put names[s] on chair s, tapping a pill then a chair (as a child does)."""
    page.evaluate("""(N)=>{const P=problems[idx].people.map(w=>w.n);
        N.forEach((n,s)=>{document.querySelector('.pz-pill[data-p="'+P.indexOf(n)+'"]').click();
            document.querySelector('.pz-chair[data-s="'+s+'"]').click();});}""", names)


def _marks(page):
    return page.evaluate("[...document.querySelectorAll('.pz-clue .lg-n')].map(n=>n.textContent)")


def _check(page):
    page.evaluate("document.querySelector('.lg-chk').click()")


_CHAIRS = ("[...document.querySelectorAll('.pz-chair')].map(c=>"
           "c.querySelector('.pz-name')?c.querySelector('.pz-name').textContent:'')")


class TestPuzzleBanks:
    def _pz(self, page):
        _enter_logic(page)
        return page.evaluate("EXERCISES.types.logic._puzzles")

    def test_ten_puzzles_of_each_style(self, page):
        b = self._pz(page)
        assert len(b["dist"]) >= 10 and len(b["seat"]) >= 10, {k: len(v) for k, v in b.items()}

    def test_every_puzzle_has_exactly_one_solution(self, page):
        """Brute force with the module's OWN checker: a dist puzzle has ONE way to
        share the items (sol); a seat puzzle has ONE seating up to its mirror
        (sol). So the child's constraint-checked answer is always THE answer."""
        _enter_logic(page)
        res = page.evaluate("""(()=>{const L=EXERCISES.types.logic,bad=[];
          const perms=a=>a.length<=1?[a]:a.flatMap((x,i)=>perms(a.slice(0,i).concat(a.slice(i+1))).map(p=>[x].concat(p)));
          L._puzzles.dist.forEach((e,i)=>{const p=L._makeOne('dist',e),N=p.people.length,out=[];
            const rec=(j,left,v)=>{if(j===N-1){v[j]=left;if(p.clues.every(c=>L._holds('dist',c.c,v)))out.push(v.join(','));return;}
              for(let x=0;x<=left;x++){v[j]=x;rec(j+1,left-x,v);}};
            rec(0,p.total,new Array(N));
            if(out.length!==1||out[0]!==e.sol.join(','))bad.push(['dist',i,out]);
            if(e.sol.reduce((a,b)=>a+b,0)!==e.total)bad.push(['dist-sum',i]);});
          L._puzzles.seat.forEach((e,i)=>{const p=L._makeOne('seat',e),N=p.people.length,names=p.people.map(w=>w.n),out=[];
            perms([...Array(N).keys()]).forEach(o=>{const pos=[];o.forEach((w,s)=>pos[w]=s);
              if(p.clues.every(c=>L._holds('seat',c.c,pos)))out.push(o.map(w=>names[w]).join(','));});
            const a=e.sol.join(','),m=e.sol.slice().reverse().join(',');
            if(!out.includes(a)||out.some(x=>x!==a&&x!==m))bad.push(['seat',i,out]);});
          return bad;})()""")
        assert res == [], res

    def test_requests_name_real_people_and_lead_with_their_subject(self, page):
        """Every name in a constraint exists in `who` AND in the request's text, and
        the FIRST name in the text is the constraint's subject — so a swapped
        "X wants more than Y" can't ship."""
        b = self._pz(page)
        for k in PUZZLES:
            for i, e in enumerate(b[k]):
                names = [w["n"] for w in e["who"]]
                assert len(set(names)) == len(names), f"{k}[{i}] repeats a name"
                for j, c in enumerate(e["clues"]):
                    refs = [x for x in c["c"][1:] if isinstance(x, str)]
                    assert refs and all(r in names for r in refs), f"{k}[{i}] clue {j}: unknown name in {c['c']}"
                    txt = _strip(c["t"])
                    for r in refs:
                        assert _strip(r) in txt, f"{k}[{i}] clue {j}: {r} missing from the text"
                    first = min((txt.find(_strip(n)), n) for n in names if _strip(n) in txt)[1]
                    assert first == refs[0], f"{k}[{i}] clue {j}: subject {refs[0]} must be named first, got {first}"
                if k == "seat":
                    assert sorted(e["sol"]) == sorted(names), f"seat[{i}] sol must seat everyone once"

    def test_seat_intro_never_reads_out_the_answer(self, page):
        for i, e in enumerate(self._pz(page)["seat"]):
            names = [w["n"] for w in e["who"]]
            assert names not in (e["sol"], e["sol"][::-1]), f"seat[{i}]: the intro lists the seating"

    def test_puzzle_text_is_vowelled_and_emoji_free(self, page):
        b = self._pz(page)
        for k in PUZZLES:
            for i, e in enumerate(b[k]):
                for t in [e["intro"], e["tip"], e["why"]] + [c["t"] for c in e["clues"]]:
                    assert _has_niqqud(t), f"{k}[{i}] not vowelled: {t!r}"
                    assert not any(ord(ch) > 0x2600 for ch in t), f"{k}[{i}] has an emoji in its text: {t!r}"
                for w in e["who"]:
                    assert _has_niqqud(w["n"]) and w["g"] in ("m", "f"), f"{k}[{i}] person {w}"


class TestPuzzlePlay:
    def test_dist_solved_scores_full_and_explains(self, page):
        _enter_logic(page)
        _force_pz(page, "dist", 0)                         # 23 cookies: יוֹסִי 1, אָבִיב 6, רוֹעִי 16
        assert page.evaluate("document.querySelector('.pz-left').textContent") == "23"
        _deal(page, [1, 6, 16])
        assert page.evaluate("document.querySelector('.pz-left').textContent") == "0"
        assert page.evaluate("[...document.querySelectorAll('.pz-plus')].every(b=>b.disabled)"), \
            "an empty pile disables every +"
        _check(page)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 15
        assert _marks(page) == ["✓", "✓", "✓"]
        assert page.evaluate("document.querySelector('.lg-why').classList.contains('lg-on')")
        assert page.evaluate("document.querySelector('.pz-root').classList.contains('pz-lock')")

    def test_dist_check_with_items_left_is_not_a_mistake(self, page):
        _enter_logic(page)
        _force_pz(page, "dist", 0)
        _deal(page, [1, 6, 10])                            # 6 cookies still in the pile
        _check(page)
        page.wait_for_timeout(300)
        assert page.evaluate("tryFirst") == 0 and page.evaluate("done") is False
        assert "6" in page.evaluate("document.getElementById('hint').textContent")
        assert _marks(page) == ["1", "2", "3"], "no request is judged before everything is shared"

    def test_dist_wrong_marks_the_broken_request_then_tip_and_skip(self, page):
        _enter_logic(page)
        _force_pz(page, "dist", 0)
        _deal(page, [2, 7, 14])                            # Aviv = Yossi+5 ✓, Roi ≠ Aviv+10 ✗
        _check(page)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert _marks(page) == ["✓", "✗", "✓"]
        assert page.evaluate("document.querySelector('.pz-clue[data-c=\"1\"]').classList.contains('lg-hit')")
        assert not page.evaluate("document.querySelector('.pz-tip').classList.contains('lg-on')"), \
            "the tip waits for the 2nd mistake"
        # the SAME answer again is only a nudge — no second penalty
        _check(page)
        page.wait_for_timeout(300)
        assert page.evaluate("tryFirst") == 1
        # change something → the old marks fade; a new wrong answer is the 2nd mistake
        page.evaluate("document.querySelectorAll('.pz-minus')[2].click();document.querySelectorAll('.pz-plus')[0].click()")
        assert page.evaluate("document.querySelector('.pz-clue .lg-n').classList.contains('pz-stale')")
        _check(page)                                       # 3·7·13 → both requests broken
        page.wait_for_function("tryFirst === 2", timeout=TIMEOUT)
        page.wait_for_function("document.querySelector('.pz-tip').classList.contains('lg-on')", timeout=TIMEOUT)
        assert page.evaluate("getComputedStyle(document.getElementById('skip-btn')).display") != "none", \
            "a puzzle offers the skip button after the 2nd mistake"
        # …and the right answer still solves it
        _empty(page)
        _deal(page, [1, 6, 16])
        _check(page)
        page.wait_for_function("done === true", timeout=TIMEOUT)

    def test_puzzle_skip_scores_zero_and_marks_the_report(self, page):
        _enter_logic(page)
        _force_pz(page, "dist", 2)                         # 10 balloons: 3·4·3
        for counts in ([4, 3, 3], [3, 3, 4]):
            _empty(page)
            _deal(page, counts)
            _check(page)
            page.wait_for_timeout(250)
        assert page.evaluate("tryFirst") == 2
        page.evaluate("skipLangQuestion()")
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("report[0].skipped") is True and page.evaluate("score") == 0

    def test_seat_solves_in_either_direction(self, page):
        """No chair numbers in seat[2]: the answer AND its mirror both pass."""
        _enter_logic(page)
        for order in (["אָבִיב", "שִׁירָה", "בֶּן", "מָאיָה"], ["מָאיָה", "בֶּן", "שִׁירָה", "אָבִיב"]):
            _force_pz(page, "seat", 2)
            _seat(page, order)
            _check(page)
            page.wait_for_function("done === true", timeout=TIMEOUT)
            assert _marks(page) == ["✓", "✓"]

    def test_seat_chair_number_pins_the_direction(self, page):
        _enter_logic(page)
        _force_pz(page, "seat", 5)                         # עוֹמֶר in chair 1
        _seat(page, ["אֵלָה", "אָדָם", "נֹגָה", "עוֹמֶר"])  # the mirror — עוֹמֶר ends in chair 4
        _check(page)
        page.wait_for_function("tryFirst === 1", timeout=TIMEOUT)
        assert _marks(page)[0] == "✗", "the chair-1 request is broken by the mirror"

    def test_seat_pick_up_swap_and_send_back(self, page):
        _enter_logic(page)
        _force_pz(page, "seat", 1)                         # 3 chairs: יוֹסִי, תָּמָר, נוֹעָה
        _seat(page, ["נוֹעָה", "תָּמָר", "יוֹסִי"])
        assert page.evaluate(_CHAIRS) == ["נוֹעָה", "תָּמָר", "יוֹסִי"]
        # tap a seated friend, then another chair → they swap
        page.evaluate("document.querySelector('.pz-chair[data-s=\"0\"]').click();document.querySelector('.pz-chair[data-s=\"2\"]').click()")
        assert page.evaluate(_CHAIRS) == ["יוֹסִי", "תָּמָר", "נוֹעָה"]
        # tap a seated friend, then the pool → back to the pool, the chair empties
        page.evaluate("document.querySelector('.pz-chair[data-s=\"1\"]').click();document.querySelector('.pz-pool').click()")
        assert page.evaluate(_CHAIRS) == ["יוֹסִי", "", "נוֹעָה"]
        _check(page)                                       # an empty chair: a nudge, not a mistake
        page.wait_for_timeout(250)
        assert page.evaluate("tryFirst") == 0
        page.evaluate("""[...document.querySelectorAll('.pz-pill')].find(e=>e.style.display!=='none').click();
            document.querySelector('.pz-chair[data-s="1"]').click()""")
        _check(page)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        assert page.evaluate("score") == 15

    def test_report_row_shows_the_whole_answer(self, page):
        _enter_logic(page)
        _force_pz(page, "dist", 0)
        _deal(page, [1, 6, 16])
        _check(page)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        row = page.evaluate("_reportRows()[0]")
        assert row["ok"] and row["correct"] == "יוֹסִי 1 · אָבִיב 6 · רוֹעִי 16", row
        assert "חִידַת חֲלֻקָּה" in row["eq"], row


class TestPuzzlePlacement:
    def test_superman_keeps_quick_choice_cards_only(self, page):
        enter_mode(page, "sup")
        page.wait_for_function("typeof EXERCISES.types.logic==='object' && problems.length>0", timeout=TIMEOUT)
        ks = page.evaluate("""(()=>{const out=[];for(let i=0;i<8;i++)makePool('sup').filter(p=>p.t===TLG).forEach(p=>out.push(p.k));return out;})()""")
        assert len(ks) == 16 and not set(ks) & set(PUZZLES), ks

    def test_champion_14th_question_is_a_puzzle_and_the_kinds_alternate(self, page):
        enter_mode(page, "mulc")
        page.wait_for_function("typeof EXERCISES.types.logic==='object' && problems.length>0", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{const out=[];for(let i=0;i<6;i++){const d=makePool('mulc');
            out.push({len:d.length,at:d.map((p,j)=>p.t===TLG?j:-1).filter(j=>j>=0),k5:d[5].k,k13:d[13].k});}return out;})()""")
        for r in res:
            assert r["len"] == 15 and r["at"] == [5, 13], r
            assert r["k5"] in KINDS, f"the 6th question stays a quick-choice card, got {r['k5']}"
            assert r["k13"] in PUZZLES, f"the 14th question is a puzzle, got {r['k13']}"
        k13 = [r["k13"] for r in res]
        assert all(k13[i] != k13[i + 1] for i in range(len(k13) - 1)), f"dist/seat must take turns, got {k13}"

    def test_queen_gets_one_puzzle_at_question_17(self, page):
        enter_mode(page, "mx")
        page.wait_for_function("typeof EXERCISES.types.logic==='object' && problems.length>0", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{const out=[];for(let i=0;i<6;i++){const d=makePool('mx');
            out.push({n:d.length,at:d.map((p,j)=>p.t===TLG?j:-1).filter(j=>j>=0),k:(d.find(p=>p.t===TLG)||{}).k,
                      rg:d.findIndex(p=>p.t===TRG),bal:d.findIndex(p=>p.t===TBE||p.t===TSB)});}return out;})()""")
        for r in res:
            assert r["n"] == 19 and r["at"] == [16] and r["k"] in PUZZLES, r
            assert r["rg"] == 14 and r["bal"] == 12, f"the other woven cards keep their questions: {r}"
        assert {r["k"] for r in res} == set(PUZZLES), res

    def test_live_queen_game_mounts_and_solves_its_puzzle(self, page):
        enter_mode(page, "mx")
        page.evaluate("mode='mx';restart()")
        page.wait_for_function("window.POOL_PENDING!==true && problems.length===19", timeout=TIMEOUT)
        page.evaluate("idx=16;done=false;tryFirst=0;loadProblem();")
        page.wait_for_selector(".pz-root", timeout=TIMEOUT)
        assert page.evaluate("ptype === TLG")
        k, sol = page.evaluate("""(()=>{const p=problems[16],L=EXERCISES.types.logic;
            return [p.k,L._puzzles[p.k].find(x=>x.intro===p.lines[0]).sol];})()""")
        if k == "dist":
            _deal(page, sol)
        else:
            _seat(page, sol)
        _check(page)
        page.wait_for_function("done === true", timeout=TIMEOUT)
        prog = page.inner_text("#prog-txt")
        assert "17" in prog and "19" in prog, prog

    def test_bridges_get_one_puzzle_at_question_16(self, page):
        """2026-11-22 (later): גָּשֵׁר 10 and גָּשֵׁר 20 carry ONE logic puzzle per game, on top,
        right after the 🎯 range card (question 15) — so the balance cards, the range card
        and the fact order all stay put. 16 / 19 cards; dist and seat take turns."""
        enter_mode(page, "br")
        page.wait_for_function("typeof EXERCISES.types.logic==='object' && problems.length>0", timeout=TIMEOUT)
        for fn, builds, n in (("makeBridgePool", 6, 16), ("makeBridge20Pool", 5, 19)):
            res = page.evaluate(f"""(()=>{{const out=[];for(let i=0;i<{builds};i++){{const d={fn}();
                out.push({{n:d.length,at:d.map((p,j)=>p.t===TLG?j:-1).filter(j=>j>=0),k:(d.find(p=>p.t===TLG)||{{}}).k,
                          rg:d.findIndex(p=>p.t===TRG),bal:d.map((p,j)=>p.t===TSB?j:-1).filter(j=>j>=0)}});}}return out;}})()""")
            for r in res:
                assert r["n"] == n and r["at"] == [15] and r["k"] in PUZZLES, (fn, r)
                assert r["rg"] == 14 and r["bal"] == [5, 11], f"{fn}: the other woven cards keep their questions: {r}"
            ks = [r["k"] for r in res]
            assert all(ks[i] != ks[i + 1] for i in range(len(ks) - 1)), f"{fn}: dist/seat must take turns, got {ks}"

    def test_live_bridge_games_mount_and_solve_their_puzzle(self, page):
        """REAL bridge games: question 16 mounts the puzzle with the bridge aids out of the
        way — the part–whole board left open on an earlier card closes, the board button and
        the aids menu hide — and a first-try solve scores the bridge's 15."""
        for m, n in (("br", 16), ("b20", 19)):
            enter_mode(page, m)
            page.wait_for_function(f"window.POOL_PENDING!==true && typeof EXERCISES.types.logic==='object' && problems.length==={n}", timeout=TIMEOUT)
            page.evaluate("idx=10;tryFirst=0;loadProblem();")          # a fact card: the board applies
            page.evaluate("togglePartWhole()")
            page.wait_for_function("aidMode==='pw' && getComputedStyle(document.getElementById('pw-panel')).display!=='none'", timeout=TIMEOUT)
            page.evaluate("idx=15;score=0;done=false;tryFirst=0;loadProblem();")
            page.wait_for_selector(".pz-root", timeout=TIMEOUT)
            hidden = page.evaluate("""(()=>{const h=id=>{const e=document.getElementById(id);if(!e)return true;
                const cs=getComputedStyle(e);return cs.display==='none'||cs.visibility==='hidden'||e.offsetParent===null;};
                return {pw:h('pw-panel'),btn:h('pw-btn'),games:h('games-drop-btn')};})()""")
            assert all(hidden.values()), f"{m}: the bridge aids must step aside on the puzzle: {hidden}"
            prog = page.inner_text("#prog-txt")
            assert "16" in prog and str(n) in prog, prog
            k, sol = page.evaluate("""(()=>{const p=problems[15],L=EXERCISES.types.logic;
                return [p.k,L._puzzles[p.k].find(x=>x.intro===p.lines[0]).sol];})()""")
            if k == "dist":
                _deal(page, sol)
            else:
                _seat(page, sol)
            _check(page)
            page.wait_for_function("done === true", timeout=TIMEOUT)
            assert page.evaluate("score") == 15, f"{m}: first-try solve = the bridge's 15 points"
