"""The 2026-09 batches of success screens (10 + 10) (success_screens/success-<name>.js):
each is registered in the rotation, renders normal + super without errors, and
its cleanup() removes every node it added (the spec's skip contract)."""
import pytest
from helpers import *

BATCH = ['paper-cranes', 'snow-globe', 'crystal-gem', 'love-letter', 'daisy-ring',
         'ringed-planet', 'baby-dragon', 'pearl-shell', 'domino-cascade', 'owl-wink',
         'magic-lamp', 'ladybug-flight', 'heart-lock', 'sunflower-grow', 'kitten-yarn',
         'star-jar', 'honeycomb-bee', 'ufo-beam', 'penguin-slide', 'rain-cloud']


@pytest.mark.parametrize("name", BATCH)
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
