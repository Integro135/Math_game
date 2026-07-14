import pytest
from helpers import *



# ─────────────────────────────────────────────────────────
# Coin-problem (TC) presence tests
# ─────────────────────────────────────────────────────────

class TestCoinProblems:
    """
    injectCoins() guarantees ≥1 TC (coin-counting) problem per session for
    every non-zero mode.  These tests verify that contract holds across all
    three main difficulty levels and that it remains true across multiple
    consecutive sessions (to confirm it is not a lucky one-off).
    """

    def _tc_count_in_session(self, page) -> int:
        consts = page.evaluate("({TC})")
        ptypes = page.evaluate("[...problems].map(p => p.t)")
        return sum(1 for t in ptypes if t == consts["TC"])

    def test_coins_appear_in_mode5_every_session(self, page):
        """Mode 5 (עַד 5) still exists and injectCoins() guarantees ≥1 coin
        problem in every session (coins.ex.js lists mode 5 + inject())."""
        page.evaluate("setMode(5)")
        page.wait_for_timeout(120)
        for session in range(5):
            count = self._tc_count_in_session(page)
            assert count >= 1, \
                f"Mode 5 session {session + 1}: expected ≥1 coin problem, got {count}"
            page.evaluate("restart()")
            page.wait_for_timeout(100)

    def test_coins_appear_in_mode10_every_session(self, page):
        """Mode 10 must include ≥1 coin problem in every game session."""
        page.evaluate("setMode(10)")
        page.wait_for_timeout(100)
        for session in range(5):
            count = self._tc_count_in_session(page)
            assert count >= 1, \
                f"Mode 10 session {session + 1}: expected ≥1 coin problem, got {count}"
            page.evaluate("restart()")
            page.wait_for_timeout(100)

    def test_coins_appear_in_modemx_every_session(self, page):
        """Mode mx (מַלְכָּה) must include ≥1 coin problem in every game session."""
        for session in range(5):        # game starts in mode 'mx'
            count = self._tc_count_in_session(page)
            assert count >= 1, \
                f"Mode mx session {session + 1}: expected ≥1 coin problem, got {count}"
            page.evaluate("restart()")
            page.wait_for_timeout(100)

    def test_coins_appear_across_all_three_levels_in_one_pass(self, page):
        """
        Single sweep: switch through levels 5 → 10 → mx and confirm ≥1 coin
        problem in each.  Faster than the per-level tests when used as a
        smoke check.
        """
        consts = page.evaluate("({TC})")
        for mode in (10, "mx"):
            mode_arg = repr(mode)
            page.evaluate(f"setMode({mode_arg})")
            page.wait_for_timeout(100)
            ptypes = page.evaluate("[...problems].map(p => p.t)")
            count = sum(1 for t in ptypes if t == consts["TC"])
            assert count >= 1, \
                f"Mode {mode}: expected ≥1 coin problem in session, got {count}"

    def test_modemx_coin_problems_sum_up_to_50_and_max_7_coins(self, page):
        """
        Mode 'mx' coin problems must satisfy:
          - correct sum ≤ 50
          - total coin count ≤ 7 (8+ coins wrap to a second row on screen)
        Sample 30 problems via the coins exercise-type module (the generator
        lives in exercises/coins.ex.js and registers into EXERCISES.types).
        """
        for _ in range(30):
            p = page.evaluate("EXERCISES.types.coins.make('mx')[0]")
            coins = p["coins"]
            correct = p["correct"]
            assert correct <= 50, \
                f"mx coin sum must be ≤50, got {correct} from {coins}"
            assert len(coins) <= 7, \
                f"mx coin count must be ≤7, got {len(coins)} ({coins})"
            assert correct == sum(coins), \
                f"declared correct={correct} != sum({coins})={sum(coins)}"

    def test_coins_sorted_descending_in_tcCoins(self, page):
        """
        tcCoins must be sorted descending (largest first) so that in the
        coin row the largest coin appears visually on the LEFT.
        Sample several TC problems and verify ordering.
        """
        consts = page.evaluate("({TC})")
        TC = consts["TC"]
        checked = 0
        for _ in range(15):
            # Find a TC problem in the current session
            n_problems = page.evaluate("problems.length")
            for i in range(n_problems):
                ptype = page.evaluate(f"problems[{i}].t")
                if ptype != TC:
                    continue
                page.evaluate(f"idx = {i}; loadProblem()")
                page.wait_for_timeout(120)
                coins = page.evaluate("tcCoins")
                assert coins == sorted(coins, reverse=True), \
                    f"tcCoins must be sorted descending (largest first); got {coins}"
                checked += 1
                if checked >= 3:
                    return
            page.evaluate("restart()")
            page.wait_for_timeout(80)

        assert checked > 0, "Could not find any TC problem to test"

    def test_modemx_coin_problems_can_exceed_20(self, page):
        """
        Coin problems in Queen (mx) are explicitly allowed to exceed 20 —
        that is the purpose of these problems (sums up to 50). Verify that
        at least some sampled problems do have sums > 20.
        """
        sums = []
        for _ in range(30):
            for p in page.evaluate("EXERCISES.types.coins.make('mx')"):
                sums.append(p["correct"])
        above_20 = [s for s in sums if s > 20]
        assert len(above_20) > 0, \
            f"Expected some mx coin sums > 20 (target range 20-50), got max={max(sums)} from {sums}"

    def test_modemx_coin_problems_favor_10s_and_5s(self, page):
        """
        Distribution check: across many mx coin problems, the 10 and 5
        coin values together should make up the majority of coins drawn
        (since the weighted pool favors them).
        """
        all_coins = []
        for _ in range(20):
            for p in page.evaluate("EXERCISES.types.coins.make('mx')"):
                all_coins.extend(p["coins"])

        big_count = sum(1 for c in all_coins if c >= 5)        # 5s and 10s
        small_count = sum(1 for c in all_coins if c < 5)        # 1s and 2s

        assert big_count > small_count, \
            f"Expected 5s+10s to dominate; got {big_count} big vs {small_count} small (of {len(all_coins)} coins)"




# ─────────────────────────────────────────────────────────
# Chain mode & coin aid feature tests
# ─────────────────────────────────────────────────────────

class TestChainAndCoinAids:
    """
    Tests for two new behaviours (v5.37):

    1. TC (coin-counting) problems now show the number line (#chain-tools)
       starting at 0 so the child can count coin values step by step.

    2. makeMxPool() phase structure:
       - Phase 1 (problems 1-5): correct answer ≤ 10 (was ≤ 6).
       - Phase 3, last 4 (problems 12-15): first operand (a = num1) > 10.
    """

    # ── TC shows number line ──────────────────────────────

    def test_tc_problem_shows_number_line(self, page):
        """TC (coin): NL hidden while fresh; after the first wrong answer the
        kangaroo NL appears starting at 0."""
        consts  = page.evaluate("({TC})")
        ptypes  = page.evaluate("[...problems].map(p => p.t)")
        tc_idx  = next((i for i, t in enumerate(ptypes) if t == consts["TC"]), None)
        assert tc_idx is not None, "No TC problem found in session — regenerate"

        page.evaluate(f"idx = {tc_idx}; loadProblem()")
        page.wait_for_timeout(200)
        assert not page.locator("#nl-panel").is_visible(), \
            "#nl-panel must be hidden before the first mistake (TC)"
        reveal_aids(page)
        assert page.locator("#nl-panel").is_visible(), \
            "#nl-panel must appear after the first mistake (TC)"
        dot_left = page.evaluate("document.getElementById('nl-dot').style.left")
        assert dot_left == "0%", \
            f"Kangaroo must start at 0 for TC problem, got {dot_left}"

    # ── Chain phase 1 answers ≤ 10 ────────────────────────

    def test_chain_first_4_answers_at_most_10(self, page):
        """The old ordered phase structure was removed. makeMxPool() now builds
        the Queen pool as ONE flat shuffle of every contributing type's mx quota
        (problems.js: shuffle([...chain, ...missing, ...sub, ...add, ...double,
        ...tens, ...coins, ...big_step])). New contract: exactly 17 problems and
        NO position-based answer cap (the first 5 slots are not constrained to a
        ≤10 answer). Verify the size contract and the absence of the old cap
        across several fresh shuffles."""
        page.evaluate("setMode('mx')")
        any_early_above_10 = False
        for _ in range(8):
            page.evaluate("restart()")
            page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
            problems = page.evaluate(
                "[...problems].map(p => ({t:p.t, a:p.a, b:p.b, c:p.c, r:p.r}))")
            assert len(problems) == 20, \
                f"Queen (mx) must present 20 problems (shuffle + coverage-preserving cap), got {len(problems)}"
            consts = page.evaluate("({TA,TS,TM,TX,TZ,TW})")
            for p in problems[:5]:               # the former "phase 1" slots
                ans = None
                if p["t"] == consts["TA"]:   ans = p["a"] + p["b"]
                elif p["t"] == consts["TS"]: ans = p["a"] - p["b"]
                elif p["t"] == consts["TZ"]: ans = p["a"] + p["b"] + p["c"]
                elif p["t"] == consts["TX"]: ans = p["a"] - p["b"] + p["c"]
                elif p["t"] == consts["TW"]: ans = p["a"] - p["b"] - p["c"]
                elif p["t"] == consts["TM"]: ans = p["b"]
                if ans is not None and ans > 10:
                    any_early_above_10 = True
        assert any_early_above_10, \
            "Phase structure is gone: early slots must NOT be capped at ≤10 — " \
            "across 8 shuffles at least one of the first 5 answers should exceed 10"

    def test_chain_problem_5_answer_at_most_20(self, page):
        """Phase structure removed — makeMxPool() is a single flat shuffle, so
        problem 5 (index 4) is no longer pinned to any phase boundary. New
        contract: every contributing exercise TYPE is present in the shuffled
        Queen pool (chain TX/TZ/TW, TM, TS, TA, TDA/TDS, TT, TC, TBG)."""
        consts = page.evaluate("({TM,TS,TA,TX,TZ,TW,TDA,TDS,TC,TT,TBG})")
        page.evaluate("setMode('mx'); restart()")
        page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
        types = page.evaluate("[...problems].map(p => p.t)")
        assert len(types) == 20
        # chain family (TX/TZ/TW) must appear; each other type must appear ≥1
        chain = {consts["TX"], consts["TZ"], consts["TW"]}
        assert any(t in chain for t in types), "Chain problems must be present in mx"
        for name in ("TM", "TS", "TA", "TT", "TC", "TBG"):
            assert consts[name] in types, \
                f"makeMxPool must include type {name}; got {types}"
        # the double-unknown family contributes one add + one sub
        assert consts["TDA"] in types and consts["TDS"] in types, \
            "makeMxPool must include both TDA and TDS"

    def test_chain_third_number_can_exceed_six(self, page):
        """The chain THIRD number c reaches up to 9 (was capped at 6) while
        results stay valid (TZ/TX sums ≤ 25, TW result ≥ 2)."""
        consts = page.evaluate("({TZ,TX,TW})")
        page.wait_for_function("window.EXERCISES && EXERCISES.types.chain", timeout=TIMEOUT)
        res = page.evaluate("""(()=>{let maxC=0,maxR=0,invalid=0;
          for(let k=0;k<400;k++){EXERCISES.types.chain.make('mx').forEach(p=>{
            if(p.c>maxC)maxC=p.c;
            if(p.t===TZ){if(p.a+p.b+p.c>maxR)maxR=p.a+p.b+p.c; if(p.a+p.b+p.c>25)invalid++;}
            if(p.t===TX&&p.a-p.b+p.c>25)invalid++;
            if(p.t===TW&&p.a-p.b-p.c<2)invalid++;});}
          return {maxC,maxR,invalid};})()""")
        assert res["maxC"] >= 8, f"chain third number should now reach at least 8, got {res['maxC']}"
        assert res["maxR"] > 20, f"chain results should now be able to exceed 20 (up to 25), max seen {res['maxR']}"
        assert res["invalid"] == 0, f"all chain results must stay valid (≤25), {res['invalid']} invalid"

    # ── Chain last 4 have first operand > 10 ─────────────

    def test_chain_last_4_first_number_above_10(self, page):
        """Phase structure removed — makeMxPool() shuffles every type together,
        so the LAST 4 slots carry no 'first operand > 10' guarantee anymore.
        Verify the constraint is gone: across several fresh shuffles, at least
        one of the last 4 problems has a first operand ≤ 10 (impossible under
        the old position-based rule)."""
        page.evaluate("setMode('mx')")
        seen_small_first = False
        for _ in range(8):
            page.evaluate("restart()")
            page.wait_for_function("problems.length === 20", timeout=TIMEOUT)
            problems = page.evaluate(
                "[...problems].map(p => ({t:p.t, a:p.a, r:p.r}))")
            for p in problems[-4:]:
                first = p["a"] if p["a"] is not None else p["r"]
                if first is not None and first <= 10:
                    seen_small_first = True
        assert seen_small_first, \
            "Position-based 'last 4 have first operand > 10' rule must be gone — " \
            "a flat shuffle should put a ≤10 first operand in the last 4 slots sometimes"
