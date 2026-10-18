"""The 2026-09 batches of success screens (10 + 10) and the 2026-10 batch (10)
(success_screens/success-<name>.js): each is registered in the rotation, renders
normal + super without errors, and its cleanup() removes every node it added
(the spec's skip contract). The 2026-10 batch replaced the 10 OLDEST screens,
which must be gone from the manifest and the folder."""
import pytest
from pathlib import Path
from helpers import *

GAME_URL_DIR = Path(__file__).resolve().parent.parent

BATCH = ['paper-cranes', 'snow-globe', 'crystal-gem', 'love-letter', 'daisy-ring',
         'ringed-planet', 'baby-dragon', 'pearl-shell', 'domino-cascade', 'owl-wink',
         'magic-lamp', 'ladybug-flight', 'heart-lock', 'sunflower-grow', 'kitten-yarn',
         'star-jar', 'honeycomb-bee', 'ufo-beam', 'penguin-slide', 'rain-cloud']

# 2026-10: ten new screens, appended to the END of SUCCESS_FILES (newest last)
BATCH_OCT = ['whale-spout', 'lighthouse-beam', 'cherry-blossom', 'hedgehog-roll', 'fox-wish',
             'snail-trail', 'gingerbread-house', 'koala-hug', 'bubble-tea', 'sticker-book']

# ...which replaced the ten OLDEST screens (the first 10 manifest entries)
RETIRED = ['supernova', 'comet-shower', 'constellation-heart', 'electric-orb', 'lightning-storm',
           'blooming-garden', 'unicorn-rainbow', 'black-hole-stars', 'star-race', 'aurora-glow']


@pytest.mark.parametrize("name", BATCH + BATCH_OCT)
def test_screen_renders_and_cleans_up(page, name):
    page.wait_for_function(f"window.SUCCESS && SUCCESS.styles.some(s=>s.name==='{name}')", timeout=TIMEOUT)
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    res = page.evaluate("""async (name) => {
        const st = SUCCESS.styles.find(s => s.name === name), out = {};
        for (const isSuper of [false, true]) {
            const root = document.createElement('div');
            root.style.cssText = 'position:fixed;inset:0';
            document.body.appendChild(root);
            const c = st.show({root, isSuper, durationMs: isSuper ? 4500 : 2700, points: 15,
                               palette: {primary:'#C77DFF', accent:'#FFD27D', glow:'#7DC4FF', text:'#FFFFFF'},
                               praise: 'כָּל הַכָּבוֹד!'});
            await new Promise(r => setTimeout(r, 400));
            const built = root.children.length;
            c();                                  // skip mid-animation
            out[isSuper ? 'super' : 'normal'] = {built, left: root.children.length, supports: st.supportsSuper};
            root.remove();
        }
        return out;
    }""", name)
    for k, v in res.items():
        assert v["built"] >= 2, f"{name} {k}: expected a canvas + praise, got {v['built']} nodes"
        assert v["left"] == 0, f"{name} {k}: cleanup left {v['left']} node(s)"
    page.wait_for_timeout(200)
    assert not errs, f"{name}: {errs}"


def test_batch_is_listed_in_success_files(page):
    files = page.evaluate("SUCCESS_FILES")
    for n in BATCH:
        assert f"success-{n}" in files


@pytest.mark.parametrize("name", BATCH_OCT)
def test_new_screen_stops_all_frames_and_listeners_on_cleanup(page, name):
    """After a mid-animation skip, the screen schedules NO further animation
    frames or timeouts and has removed its resize listener."""
    page.wait_for_function(f"window.SUCCESS && SUCCESS.styles.some(s=>s.name==='{name}')", timeout=TIMEOUT)
    res = page.evaluate("""async (name) => {
        const st = SUCCESS.styles.find(s => s.name === name);
        const oR = window.requestAnimationFrame, oT = window.setTimeout;
        const oA = window.addEventListener, oX = window.removeEventListener;
        // the game's own background keeps animating, so only count calls made
        // FROM this screen's file (attributed via the call stack)
        const mine = () => (new Error().stack || '').includes('success-' + name + '.js');
        let armed = false, rafs = 0, tos = 0, net = 0;
        window.requestAnimationFrame = cb => { if (armed && mine()) rafs++; return oR.call(window, cb); };
        window.setTimeout = (cb, ms) => { if (armed && mine()) tos++; return oT.call(window, cb, ms); };
        window.addEventListener = function (t, f, o) { if (mine()) net++; return oA.call(this, t, f, o); };
        window.removeEventListener = function (t, f, o) { if (mine()) net--; return oX.call(this, t, f, o); };
        const out = {};
        try {
            for (const isSuper of [false, true]) {
                net = 0;
                const root = document.createElement('div');
                root.style.cssText = 'position:fixed;inset:0';
                document.body.appendChild(root);
                const c = st.show({root, isSuper, durationMs: isSuper ? 4500 : 2700, points: 15,
                                   palette: {primary:'#22C8C2', accent:'#FFD166', glow:'#66E0FF', text:'#EAFBFF'},
                                   praise: 'מְצֻיָּן!'});
                await new Promise(r => oT.call(window, r, 700));
                c(); armed = true; rafs = 0; tos = 0;
                await new Promise(r => oT.call(window, r, 400));
                armed = false;
                out[isSuper ? 'super' : 'normal'] = {rafs, tos, net, left: root.children.length};
                root.remove();
            }
        } finally {
            window.requestAnimationFrame = oR; window.setTimeout = oT;
            window.addEventListener = oA; window.removeEventListener = oX;
        }
        return out;
    }""", name)
    for k, v in res.items():
        assert v["rafs"] == 0, f"{name} {k}: {v['rafs']} rAF(s) scheduled after cleanup"
        assert v["tos"] == 0, f"{name} {k}: {v['tos']} timeout(s) scheduled after cleanup"
        assert v["net"] == 0, f"{name} {k}: {v['net']} window listener(s) not removed"
        assert v["left"] == 0, f"{name} {k}: cleanup left {v['left']} node(s)"


def test_october_batch_is_appended_newest_last(page):
    files = page.evaluate("SUCCESS_FILES")
    assert files[-len(BATCH_OCT):] == [f"success-{n}" for n in BATCH_OCT]


def test_retired_screens_are_gone(page):
    """The ten oldest screens were removed: not in the manifest, not registered,
    and their files are deleted."""
    files = page.evaluate("SUCCESS_FILES")
    names = page.evaluate("SUCCESS.styles.map(s => s.name)")
    for n in RETIRED:
        assert f"success-{n}" not in files, f"{n} still in SUCCESS_FILES"
        assert n not in names, f"{n} still registered"
        assert not (Path(GAME_URL_DIR) / "success_screens" / f"success-{n}.js").exists(), f"{n}.js still on disk"
    assert len(files) == 65, f"expected 65 rotation screens, got {len(files)}"
    assert len(set(files)) == len(files), "duplicate SUCCESS_FILES entries"
