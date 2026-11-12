"""The reef's CLEANING STATION (backgrounds/reef4.bg.js): a cleaner wrasse keeps a
station on the left shelf; a spotty fish swims over, poses head-up, and the
wrasse nibbles every spot off before it leaves; the neon sign on its post
lights while a client is being cleaned. Runs on the standalone reef4.html."""
from pathlib import Path
from helpers import TIMEOUT

REEF = Path(r"c:\Code\subtraction_game\backgrounds\reef4.html").as_uri()


def _open(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(REEF)
    page.wait_for_function("!!window._reef4 && _reef4.ready() && _reef4.baked() && !!_reef4.station().cleaner", timeout=TIMEOUT)
    # headless frame gaps would step the quality tier down by themselves; the
    # station's own schedule is held so each test brings its client
    page.evaluate("document.getElementById('bar').style.display = 'none'; _reef4.quality(2); _reef4.auto(false)")
    return errs


def test_station_and_wrasse_exist_on_the_left(page):
    _open(page)
    st = page.evaluate("_reef4.station()")
    lay = page.evaluate("_reef4.layout()")
    assert st["cleaner"] is not None
    assert st["x"] < lay["DW"] * 0.3, "the station sits on the left-hand reef, clear of the game card"
    assert sum(1 for f in page.evaluate("_reef4.fish()") if f["kind"] == "wrasse") == 1
    sg = st["sign"]
    assert sg["lit"] == 0, "the neon sign is dark while nobody is being cleaned"
    assert sg["x"] >= 0 and sg["x"] + sg["w"] <= lay["DW"] and sg["x"] < st["x"], "the sign stands on screen, left of the station"
    assert st["client"] is None and st["dirty"] == [] and st["served"] == 0


def test_a_spotty_fish_is_cleaned_and_leaves(page):
    errs = _open(page)
    assert page.evaluate("_reef4.soil('dory')")
    assert page.evaluate("_reef4.station().dirty") == ["dory"], "the blue tang turned spotty"
    page.wait_for_function(
        "(()=>{const s=_reef4.station();return s.client&&s.client.kind==='dory'&&s.client.cs==='posing';})()",
        timeout=45_000)
    assert page.evaluate("_reef4.fish().find(f => f.kind === 'dory').live"), "the posing fish is the one creature drawn live"
    page.wait_for_function("_reef4.station().cleaner.nibbling", timeout=20_000)
    # the neon sign lights while the wrasse works (after its ~0.75 s ignition flicker)
    page.wait_for_function("_reef4.station().sign.lit >= 0.99", timeout=5_000)
    page.wait_for_function("_reef4.station().served >= 1", timeout=45_000)
    st = page.evaluate("_reef4.station()")
    assert "dory" not in st["dirty"], "the cleaned fish has no spots left"
    assert page.evaluate("_reef4.orbit().stale") == 0
    # ...and goes dark again once the client has left
    page.wait_for_function("_reef4.station().sign.lit === 0 && _reef4.station().client === null", timeout=5_000)
    assert errs == []


def test_tapping_the_sign_brings_a_fish_right_away(page):
    """A real tap on the station's sign (the wrasse and the coral head count
    too): bubbles, a fish turns spotty on the spot and HURRIES over (no wait
    for the scheduler), then poses to be cleaned."""
    errs = _open(page)
    page.wait_for_timeout(500)
    st = page.evaluate("_reef4.station()")
    assert st["dirty"] == [] and st["client"] is None
    xy = page.evaluate("_reef4.signXY()")
    page.mouse.click(xy["x"], xy["y"])
    page.wait_for_function("_reef4.station().taps === 1 && _reef4.bubbles() > 0", timeout=2_000)
    page.wait_for_function("_reef4.station().dirty.length === 1", timeout=2_000)
    page.wait_for_function("(()=>{const c=_reef4.station().client;return c&&c.cs==='going';})()", timeout=2_000)
    page.wait_for_function("_reef4.station().client.cs === 'posing'", timeout=20_000)
    assert errs == []
