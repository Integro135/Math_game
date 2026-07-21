"""Shared config + helper functions for the subtraction_game test suite.

Every test module does `from helpers import *` to pull in these helpers and
the GAME_URL / CHROME_EXE / TIMEOUT constants.  Fixtures live in conftest.py.
"""
import os
import time
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

GAME_URL   = Path(r"c:\Code\subtraction_game\index.html").as_uri()
CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
TIMEOUT    = 25_000  # ms


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────

def get_state(page) -> dict:
    """Snapshot every relevant JS global in one round-trip."""
    return page.evaluate("""() => ({
        ptype, num1, num2, num3, num4,
        idx, score, done, mode, ttOp, bgOp,
        TM, TS, TA, TX, TZ, TW, TDA, TDS, TC, TT, TCA, TCS, TBG, TCM, TBC,
        TH, TVA, TVS, TRA
    })""")


def open_settings_via_gate(page):
    """Click the gear and clear the parent gate (an a×b challenge) so the settings
    modal opens. The gate stores the expected product in the global `_parentAns`,
    so the test answers it deterministically (no need to read the rendered sum)."""
    page.click("#settings-btn")
    page.wait_for_function(
        "getComputedStyle(document.getElementById('parent-ov')).display === 'flex'",
        timeout=TIMEOUT)
    page.evaluate(
        "document.getElementById('parent-ans').value = String(_parentAns); checkParentGate()")
    page.wait_for_function(
        "getComputedStyle(document.getElementById('settings-ov')).display === 'flex'",
        timeout=TIMEOUT)


def correct_answer(state: dict) -> tuple:
    """
    Return (kind, *values) describing the correct answer.
    kind='single' → fill #ans with values[0]
    kind='td'     → fill #ans1 with values[0], #ans2 with values[1]
    """
    p  = state["ptype"]
    n1 = state["num1"]
    n2 = state["num2"]
    n3 = state["num3"]
    n4 = state["num4"]
    if p == state.get("TDA"):
        return ("td", 0, n1)          # 0 + n1 = n1
    if p == state.get("TDS"):
        # a real subtraction the game accepts: subtrahend ≥ 1 and minuend ≠ 10
        # (the game rejects a minuend of 10 or a subtrahend of 0)
        sub = 2
        while n1 + sub == 10:
            sub += 1
        return ("td", n1 + sub, sub)  # (n1+sub) − sub = n1
    if p == state.get("TC"):
        return ("single", n1)         # coin-counting: num1 holds the correct sum
    if p == state.get("TZ"):
        return ("single", n1 + n2 + n3 + n4)
    if p == state.get("TW"):
        return ("single", n1 - n2 - n3)
    if p == state.get("TX"):
        return ("single", n1 - n2 + n3)
    if p == state.get("TA"):
        return ("single", n1 + n2)
    if p == state.get("TT"):
        return ("single", n1 + n2 if state.get("ttOp") == "add" else n1 - n2)
    if p == state.get("TBG"):
        return ("single", n1 + n2 if state.get("bgOp") == "add" else n1 - n2)
    if p == state.get("TH"):
        return ("single", n1 + n2)    # whole-hundreds ADDITION (200+60, 500+40)
    if p == state.get("TVA"):
        return ("single", n1 + n2)    # single ⃝-unknown ADD (num1 + ⃝, ⃝=num2)
    if p == state.get("TVS"):
        return ("single", n1 - n2)    # single ⃝-unknown SUB
    if p == state.get("TRA"):
        # __+__+__ = R (R stored in num1); any triple summing to R is accepted —
        # return a balanced one (three boxes #ans1/#ans2/#ans3)
        q = n1 // 3
        return ("tri", q, q, n1 - 2 * q)
    return ("single", n1 - n2)        # TM or TS


def submit_answer(page, ans: tuple) -> None:
    if ans[0] == "td":
        page.fill("#ans1", str(ans[1]))
        page.fill("#ans2", str(ans[2]))
    elif ans[0] == "tri":
        page.fill("#ans1", str(ans[1]))
        page.fill("#ans2", str(ans[2]))
        page.fill("#ans3", str(ans[3]))
    else:
        page.fill("#ans", str(ans[1]))
    page.click("#chk-btn")


def wait_fw_and_advance(page, before_idx: int) -> None:
    """
    Wait for the fireworks after a correct answer, then advance.
    The fireworks close themselves after ~1.7 s and auto-advance via nextP(),
    so the _fwOn===true window is transient: under CPU load (full-suite runs)
    rAF-based polling can miss it entirely.  Therefore wait for EITHER the
    fireworks or the auto-advance, and press Enter only while they're showing.
    """
    try:
        page.wait_for_function(
            f"(typeof _fwOn !== 'undefined' && _fwOn === true)"
            f" || idx > {before_idx} || !!document.querySelector('.end-scr')",
            timeout=TIMEOUT,
        )
    except Exception:
        diag = page.evaluate(
            "({idx, done, ptype, num1, num2, num3, num4, tryFirst, mode,"
            " fwOn: typeof _fwOn !== 'undefined' && _fwOn,"
            " ansVal: document.getElementById('ans')?.value,"
            " a1: document.getElementById('ans1')?.value,"
            " a2: document.getElementById('ans2')?.value,"
            " sad: document.getElementById('sad-ov')?.style.display,"
            " fb: document.getElementById('fb')?.textContent,"
            " eq: document.querySelector('.equation')?.textContent?.trim()})"
        )
        print(f"\n[wait_fw_and_advance] timeout, before_idx={before_idx}, diag={diag}")
        raise
    # Close the celebration deterministically: call fwClose() in-page (immune
    # to keyboard focus/timing) and re-try every 500 ms until idx advances —
    # robust against any of the rotating success screens under CPU load.
    deadline = time.monotonic() + TIMEOUT / 1000
    while True:
        advanced = page.evaluate(
            f"idx > {before_idx} || !!document.querySelector('.end-scr')")
        if advanced:
            return
        page.evaluate(
            "typeof _fwOn !== 'undefined' && _fwOn === true"
            " && typeof fwClose === 'function' && (fwClose(), true)")
        if time.monotonic() > deadline:
            page.wait_for_function(   # raise with playwright's rich error
                f"idx > {before_idx} || !!document.querySelector('.end-scr')",
                timeout=1000,
            )
            return
        page.wait_for_timeout(250)


def reveal_aids(page) -> None:
    """Make one wrong answer so the (fully hidden) aid panels become visible.
    Re-submits if the first click didn't register (robust under CPU load —
    a covered/late check button used to leave tryFirst at 0 and time out)."""
    state = get_state(page)
    kind = correct_answer(state)

    def submit_wrong():
        if kind[0] == "td":
            page.fill("#ans1", "99")
            page.fill("#ans2", "99")
        else:
            wrong = kind[1] + 1 if kind[1] < 99 else kind[1] - 1
            page.fill("#ans", str(wrong))
        page.evaluate("checkAns()")   # call directly — immune to pointer interception

    deadline = time.monotonic() + TIMEOUT / 1000
    while page.evaluate("tryFirst") == 0:
        submit_wrong()
        try:
            page.wait_for_function("tryFirst > 0", timeout=2000)
        except Exception:
            if time.monotonic() > deadline:
                page.wait_for_function("tryFirst > 0", timeout=1000)  # raise richly
    page.wait_for_timeout(100)


def solve_one(page) -> None:
    """
    Solve the current problem correctly.
    Presses Enter as soon as _fwOn becomes true (fireworks just started)
    so fwClose() is called within ~1 frame instead of waiting 1700 ms.
    Uses wait_for_function for all checks so polling runs inside the browser
    process — robust under CPU load.
    """
    # Boot/setMode load the pool asynchronously — make sure a real, current
    # problem is on the board before reading its state (avoids a load race on
    # the very first solve under heavy CPU load).
    page.wait_for_function(
        "typeof problems !== 'undefined' && problems.length > 0"
        " && idx < problems.length && done === false",
        timeout=TIMEOUT,
    )
    before_idx = page.evaluate("idx")
    submit_answer(page, correct_answer(get_state(page)))
    # _fwOn is set synchronously by showFw() which fires after checkAns()'s 300 ms setTimeout
    wait_fw_and_advance(page, before_idx)


def play_n_correctly(page, n: int) -> None:
    """Solve the next n problems correctly.  solve_one's wait_for_function
    guarantees idx has advanced (and loadProblem has run) before returning,
    so Playwright's built-in fill actionability check handles input readiness."""
    for _ in range(n):
        solve_one(page)


def open_report(page) -> None:
    page.locator("button.b-rep").click()
    page.wait_for_selector("#report-ov", state="visible", timeout=TIMEOUT)
