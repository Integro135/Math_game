"""The reef's CLEANING STATION (backgrounds/reef2.bg.js): a cleaner wrasse keeps a
station on the left shelf; a spotty fish swims over, poses, and the wrasse
nibbles every spot off before it leaves. Runs on the standalone reef2.html."""
from pathlib import Path
from helpers import TIMEOUT

REEF = Path(r"c:\Code\subtraction_game\backgrounds\reef2.html").as_uri()


def _open(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(REEF)
    page.wait_for_function("!!window._reef2 && !!_reef2.station()", timeout=TIMEOUT)
    return errs


def test_station_and_wrasse_exist_on_the_left(page):
    _open(page)
    page.wait_for_function("!!_reef2.station().sign", timeout=TIMEOUT)
    st = page.evaluate("_reef2.station()")
    lay = page.evaluate("_reef2.layout()")
    assert st["cleaner"] is not None
    assert st["x"] < lay["DW"] * 0.3, "the station sits on the left shelf, clear of the game card"
    assert any(f["kind"] == "cleaner" for f in page.evaluate("_reef2.fish()"))
    sg = st["sign"]
    assert sg["lit"] == 0, "the neon sign is dark while nobody is being cleaned"
    assert sg["x"] >= 0 and sg["x"] + sg["w"] <= lay["DW"] and sg["x"] < st["x"], "the sign stands on screen, left of the station"


def test_a_spotty_fish_is_cleaned_and_leaves(page):
    errs = _open(page)
    assert page.evaluate("_reef2.soil('dory')")
    page.wait_for_function(
        "(()=>{const s=_reef2.station();return s.client&&s.client.kind==='dory'&&s.client.cs==='posing';})()",
        timeout=45_000)
    page.wait_for_function("_reef2.station().cleaner.nibbling", timeout=20_000)
    # the neon sign lights while the wrasse works (after its ~0.75 s ignition flicker)
    page.wait_for_function("_reef2.station().sign.lit >= 0.99", timeout=5_000)
    page.wait_for_function("_reef2.station().served >= 1", timeout=45_000)
    st = page.evaluate("_reef2.station()")
    assert "dory" not in st["dirty"], "the cleaned fish has no spots left"
    assert page.evaluate("_reef2.orbit().stale") == 0
    # ...and goes dark again once the client has left (the next spotty fish may
    # already be swimming over — the sign only lights while one is POSING)
    page.wait_for_function("_reef2.station().sign.lit === 0", timeout=3_000)
    assert errs == []
