# Success Screens — Build Spec

A brief for creating **new success screens** (celebrations shown after a correct
answer) for a Hebrew math game for a young girl. This document is self-contained:
everything needed to build and test a screen WITHOUT access to the game itself.

---

## 1. Context

- The game: a Hebrew-language arithmetic game (addition/subtraction up to 20,
  coin counting, chains) for a young girl. UI is RTL Hebrew **with full niqqud**.
- After every correct answer a short celebration screen appears, then the game
  auto-advances to the next exercise.
- Every 5th correct answer triggers a bigger **"super" celebration**.
- The game is being refactored into components; success screens live in their own
  module behind the contract below. New screens you build will be dropped in as
  additional registered styles.
- The game is drawn **on top of animated full-screen backgrounds** — currently a
  deep-space scene (dark, stars, black hole, pink/purple nebulae), and soon a pink
  unicorn valley. Screens must look great over BOTH dark and pink scenery
  (use the `palette` parameter — see §3).

## 2. Hard constraints

1. **Runs from `file://`** — no `fetch()`, no ES modules, no imports, no CDN, no
   external assets. One self-contained classic `<script>` file. Vanilla JS + DOM +
   Canvas only. No libraries.
2. **Global scope discipline:** the file may create NOTHING global except its
   registration into `window.SUCCESS.styles` (see §3).
3. **Interruptible at any moment:** the host may call your `cleanup()` at ANY time
   (the child presses Enter to skip). cleanup must synchronously remove every DOM
   node, cancel every rAF/timeout/interval, and remove every listener you added.
   Nothing may remain.
4. **Performance:** smooth on a modest laptop; prefer canvas for many particles;
   no layout thrash; no per-frame DOM creation.
5. **Hebrew text:** all text feminine-addressed, short, WITH NIQQUD
   (e.g. `כָּל הַכָּבוֹד!`, `אַתְּ אַלּוּפָה!`, `מַדְהִים!`). Font is inherited from the host
   (a rounded kid-friendly font); don't import fonts.
6. **No audio.**

## 3. The contract

Your file registers one (or more) styles:

```js
(function () {
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  window.SUCCESS.styles.push({
    name: 'comet-shower',          // unique kebab-case name
    supportsSuper: true,           // can render the bigger 5th-answer variant

    /**
     * Render the celebration. Called once per correct answer.
     * @param opts.root        an empty positioned full-viewport <div> the host
     *                         created for you (position:fixed; inset:0;
     *                         z-index above the game; pointer-events:none).
     *                         Build everything inside it.
     * @param opts.isSuper     true on every 5th correct answer — bigger, longer.
     * @param opts.durationMs  how long the host will display you before
     *                         auto-advancing (1700 normal / 3500 super).
     *                         Plan the animation to feel COMPLETE by then.
     * @param opts.points      stars just earned (number) — optional to display.
     * @param opts.palette     colors that match the active background skin:
     *                         { primary, accent, glow, text } hex strings.
     *                         Use these so the screen fits the backdrop.
     * @param opts.praise      a ready Hebrew praise string with niqqud (host
     *                         picks it) — display it, or ignore and use your own
     *                         (feminine + niqqud!).
     * @returns cleanup        function — see constraint #3.
     */
    show(opts) {
      // ... build DOM/canvas inside opts.root, start animation ...
      return function cleanup() { /* cancel + remove EVERYTHING */ };
    },
  });
})();
```

Host responsibilities (NOT yours): creating/removing `opts.root`, the skip key
(Enter/Space/click), timing, advancing the game. You only animate inside root and
honor cleanup.

### Special reward screens (not in the rotation)

Most screens join the per-answer **rotation** (registered into
`window.SUCCESS.styles`, one shown after each correct answer). A **reward** screen
is different: it must appear ONLY on a milestone, never randomly. It therefore:

- lives in its **own subfolder** (e.g. `success_screens/gift/`),
- registers into `window.SUCCESS.special.<key>` instead of `…styles` —
  `window.SUCCESS.special = window.SUCCESS.special || {}; window.SUCCESS.special.gift = { name, supportsSuper, show };`
- is listed in `SUCCESS_SPECIAL` (game/js/data.js), not `SUCCESS_FILES`,
- is played by a dedicated host call, not `showFw`.

The `show(opts)` contract is identical. Current reward: **gift** — the host
(`core.js → endGame → showGiftScreen`) runs it once at end-of-set when the grade
clears the mode's gift threshold (`GIFT_GOALS`); it is never shown after a single
answer.

### Backdrop (host-provided)

The host opens the celebration as a full-screen
modal: it lays a dark cover as the FIRST child of `opts.root` (a `<div>` filling
the viewport), fades it in on open and out just before advancing. The cover's
hue is picked **at random from the active skin's palette** (`--skin-primary`,
`--skin-glow`, `--skin-accent`) and sunk deep toward black — so it always matches
the current scene (cyan/violet over space, pink/lilac over the unicorn valley,
aqua over the reef …) yet varies a little every time. Your canvas/DOM is appended
AFTER it, so you always animate on TOP of a near-black cover — **design every
screen to read over near-black** (white/gold sparkles + the `palette` colors work
everywhere). Do NOT paint your own opaque full-screen background; it would fight
the backdrop. The standalone dev harness (`success_dev.html`) reproduces this
exactly and lets you switch skins.

## 4. Existing styles (build something DIFFERENT)

There are NO built-in screens any more — every celebration is an external file in
`success_screens/`. Before adding one, skim that folder so you don't duplicate an
existing idea (comet shower, constellation heart, unicorn rainbow, supernova,
lightning storm, electric orb, blooming garden, black-hole stars, star race,
aurora glow, bubble pop, magic wand, rocket launch, princess crown, butterfly
swarm, snow sparkle, dolphin splash, fireworks, confetti, shooting stars,
balloons, trophy, paint splash, music notes, pinwheel, fireflies, ribbons,
phoenix rising, peacock fan, kaleidoscope bloom, birthday cake, carousel spin,
treasure chest, sky lanterns, prism rainbow, enchanted tree …).
There are currently **36** rotation screens registered in `SUCCESS_FILES`
(game/js/data.js), plus the **gift** reward screen in `SUCCESS_SPECIAL`.

Wanted: fresh ideas that fit the dark backdrops and read instantly. Aim for
delight + variety; 2–4 new styles is a great batch.

## 5. Visual & UX guidelines

- The screen overlays the game card; it should read instantly (the child is 6-7).
  One strong focal moment > many small details.
- Must look complete within `durationMs`; never feel cut off when skipped.
- Respect `palette` for primary colors; white/gold sparkles work over everything.
- Praise text big, centered-ish, niqqud, feminine. Optional `+N ⭐` using opts.points.
- Subtlety budget: full-screen flashes are OK if soft; avoid harsh strobing.

## 6. Standalone dev harness (copy-paste, work independently)

Save as `success_dev.html` next to your screen file, open via double-click:

```html
<!DOCTYPE html><html lang="he"><head><meta charset="UTF-8">
<style>
  body{margin:0;height:100vh;background:
    radial-gradient(circle at 80% 30%, #2a1147, #0a0420 60%, #05020f);
    font-family:'Comic Sans MS',sans-serif;overflow:hidden}
  /* fake game card to celebrate over */
  .card{position:fixed;inset:15% 25%;background:rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.2);border-radius:24px}
  .bar{position:fixed;bottom:12px;left:12px;z-index:99}
  button{font-size:16px;padding:8px 16px;border-radius:10px;border:none;cursor:pointer}
</style></head><body>
<div class="card"></div>
<div class="bar">
  <button onclick="run(false)">רגיל</button>
  <button onclick="run(true)">סופר</button>
</div>
<script src="my-screen.js"></script>
<script>
let cleanup=null, to=null;
function run(isSuper){
  if(cleanup){cleanup();cleanup=null;clearTimeout(to);}
  const root=document.createElement('div');
  root.style.cssText='position:fixed;inset:0;z-index:50;pointer-events:none';
  document.body.appendChild(root);
  const dur=isSuper?3500:1700;
  const style=window.SUCCESS.styles[0];
  const c=style.show({root,isSuper,durationMs:dur,points:20,
    palette:{primary:'#C77DFF',accent:'#FFD27D',glow:'#7DC4FF',text:'#FFFFFF'},
    praise:'כָּל הַכָּבוֹד!'});
  cleanup=()=>{c();root.remove();};
  to=setTimeout(()=>{cleanup();cleanup=null;},dur+100);
}
addEventListener('keydown',e=>{if(e.key==='Enter'&&cleanup){cleanup();cleanup=null;clearTimeout(to);}});
</script></body></html>
```

Test both buttons, test Enter mid-animation (must vanish cleanly), and swap the
body background to pink (`#FFC3E2`) to check the unicorn-valley case.

## 7. Deliverable & acceptance checklist

Deliver: one `.js` file per screen (or one file with several styles), named like
`success-<name>.js`, plus nothing else (no CSS files — inject styles from JS if
needed, and remove them in cleanup).

- [ ] Registers via `window.SUCCESS.styles.push({...})`, no other globals
- [ ] Works from `file://`, zero external resources
- [ ] `show()` returns a cleanup that removes ALL traces (DOM, rAF, timers, listeners)
- [ ] Pressing skip mid-animation leaves no artifacts (test repeatedly, fast)
- [ ] Normal variant reads complete in ≤1.7s; super in ≤3.5s
- [ ] Uses `opts.palette`; looks great over the dark-space AND pink harness backgrounds
- [ ] Hebrew praise: feminine, with niqqud
- [ ] Smooth (no jank) with the harness; no console errors
