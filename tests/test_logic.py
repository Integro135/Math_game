"""הִגָּיוֹן 🧠 — the logic-questions game (mode 'logic', exercises/logic.ex.js).

Seven kinds of multiple-choice logic card (מִי אֲנִי / מִי לֹא שַׁיָּךְ / ordering /
patterns / אִם-אָז / analogies / cause→effect). A wrong pick is crossed out, and
on a מִי אֲנִי card the clue that rules it out lights up."""
import pytest
from helpers import *

_NIQQUD = set(chr(c) for c in range(0x05B0, 0x05C8))
def _has_niqqud(s):
    return any(ch in s for ch in _NIQQUD)

KINDS = ["who", "odd", "ord", "pat", "rule", "ana", "then"]


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
        assert sorted(res["kinds"]) == sorted(KINDS), f"every kind must appear, got {res['kinds']}"

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
    question, ON TOP of the 20-card deck (reading stays at every 4th slot)."""
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
            assert r["len"] == 22, r
            assert r["at"] == [5, 13], f"logic must sit at the 6th + 14th question, got {r['at']}"
            kinds.update(r["k"])
        assert len(kinds) >= 6, f"the weave must rotate through the kinds, got {kinds}"

    def test_live_superman_game_mounts_a_logic_card(self, page):
        enter_mode(page, "sup")
        page.wait_for_function("problems.length===22", timeout=TIMEOUT)
        page.evaluate("idx=5;loadProblem();")
        page.wait_for_selector(".lg-opt", timeout=TIMEOUT)
        assert page.evaluate("ptype === TLG")
        page.evaluate("document.querySelector(`.lg-opt[data-i=\"${num1}\"]`).click()")
        page.click(".lg-chk")
        page.wait_for_function("done === true", timeout=TIMEOUT)
