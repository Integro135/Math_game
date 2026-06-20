# `game/skins/` — Game Skins

## 1. Overview

A **skin** is the game's *look* over one background. It is the visual layer
that re-dresses the game's own UI (header, card, equation, buttons, number
line, settings modal, success/end screens) so it matches the scene painted
behind it. The background scene itself lives elsewhere
(`backgrounds/<name>.bg.js`); the skin only restyles the game chrome that
floats *in front of* that scene.

- **One `<name>.skin.css` per background.** Each background module declares
  which skin it wants via a `skin:` field (see §6).
- **Injected at runtime, not in `index.html`.** `bg-loader.applySkin(skin)`
  (`game/js/bg-loader.js`) creates a single `<link rel="stylesheet">`, appends
  it to `<head>`, and points its `href` at `game/skins/<skin>.skin.css`. This
  link-injection is the only dynamic mechanism that works on `file://`, where
  `fetch`/ES-modules are CORS-blocked.
- **Layered on top of `game/css/`.** Skins load *after* the base stylesheets
  (`base.css`, `aids.css`, `effects.css`, …), so they override defaults purely
  by cascade order — no `!important` needed (and mostly forbidden; see §3).
- **Removed on unload.** `unloadBackground()` calls `applySkin(null)`, which
  clears the link's `href` (the `<link>` node stays, reusable). With no skin
  active, the game falls back to the bare `game/css/` defaults
  (e.g. `.wrap{max-width:860px}`, a blurred white `.glass`).

`space.skin.css` is the **reference skin** — read its header comment; the other
skins are explicitly written "to the space-skin standard."

## 2. What a skin owns — the four families

Every skin header documents the same four families it is allowed to own:

1. **Palette** — four CSS custom properties on `:root`:
   `--skin-primary`, `--skin-accent`, `--skin-glow`, `--skin-text`. These are
   not just used inside the skin's own rules; they are read elsewhere too:
   - **Success screens** receive them as `opts.palette`.
   - **The jar-stage** (`aids/jar_stage.js`) reads `--skin-glow` and
     `--skin-accent` (via `getComputedStyle`) to tint the counting jar.
   - The four palette vars also **seed the success-screen backdrop**:
     `success.js` (`_skinBackdrop()`) picks one at random and sinks it toward
     black, so each celebration's dark cover matches this scene.
2. **Fonts / type** — the title font, tracking, size and gradient
   (`.title`, `.settings-title`, `.end-ttl`, etc.). Most skins set
   `font-family:'Fredoka One'`, wide `letter-spacing`, `animation:none`
   (no shimmer) and drop the title emojis.
3. **Glass transparency** — `.glass`. The base default is a blurred white
   veil (`backdrop-filter:blur(24px)`). **Most skins set
   `backdrop-filter:none`** with a low-opacity tinted fill so the scene stays
   sharp through the panels. (Reef is the documented exception — see §4.)
4. **Position on screen** — `.wrap` `max-width` / `margin` / `padding`, used to
   shrink and place the game column so the scene's hero objects (Saturn, the
   Burj, Pride Rock + lions, the herd, etc.) stay visible around it.

Beyond the four families, skins also restyle a wide range of game UI:
the **number line** (`#nl-panel` track, `.tick`/`.tick.major`, `.nl-num`,
`.nl-dot`, `.kang` rider, `.arc-add`/`.arc-sub`, the `±`/reset/undo controls),
the **chain mini-line** (`.pgm-bar`, `.pgm-dot`, `.pgm-nl-num*`,
`.pgm-arc-*`, `.pgm-plus`/`.pgm-minus`, `.pgm-jar-btm`), the **settings modal**
(`#settings-ov`, `.settings-box`, `.tier-tab`, `.lvl-btn`), the
**success-tooltip** `#num-tt`, the header/stats/progress, the equation
(`.eq-n`/`.eq-op`/`.eq-res`), action buttons (`.btn`, `.b-chk`/`.b-try`/
`.b-nxt`/`.b-rpl`), the coin stage, and the end screen. Deeper in the settings
modal sit the sub-tabs, prize editor and score history (`.set-tab`,
`.prize-lbl`/`.prize-inp`, `.hist-grade`/`.hist-game`/`.hist-name`/`.hist-date`/
`.hist-empty`); their base colors are **light** (authored for the dark skins),
so a skin over a light scene must recolor them or they vanish (see unicorns,
§4).

## 3. The hard rule skins must respect

- **Never override the answer-border state.** `.ans-inp.ans-ok` (green) and
  `.ans-inp.ans-err` (red) are declared with `!important` in `base.css`
  precisely so no skin's border/box-shadow can override the correct/incorrect
  signal. Skins style the *resting* and `:focus` input (`.ans-inp`) freely, but
  the green/red feedback state is global and fixed.
- **The aid-toggle icons are fixed across skins.** The number-line / object-box
  toggle icons (`.aid-ico`, `effects.css`: "the fixed aid-toggle icons … same
  everywhere") are shared art and must not be re-skinned.
- **Art vs. layout stays separated.** A skin styles the number line's *track,
  ticks and controls*, but the **rider** (🚀/🚁/etc.) and the jar items come
  from `aids/<name>.aids.js`, not the skin. The engine markup (`aids.js`) is
  shared; skins only paint it.

## 4. Per-skin inventory

| Skin | Dresses background (body class) | primary / accent / glow / text | Design concept (from header) | `.wrap` width / position |
|------|----------------------------------|--------------------------------|------------------------------|--------------------------|
| `space` | space (`theme-galaxy`) | `#C77DFF` / `#FFD27D` / `#7DC4FF` / `#EAF0FF` | "Mission HUD" — a thin holographic instrument layer; occlude as little of the cosmos as possible; no blur anywhere | `max-width:700px`, slim center column |
| `unicorns` | candy valley (`theme-girls`) | `#FF6FB5` / `#7DC4FF` / `#C77DFF` / `#5A2A52` | "Valley Light" — translucent layer over a *light* valley; contrast from deep-plum ink + white halos; `±` are lilac/strawberry, no green. Because its settings/history box is near-white, the light base text (sub-tabs, prize fields, score history, `#parent-q`) is recolored plum (`#7A4070`/`#9A4ED9`/…) to stay readable | `max-width:700px`, center band |
| `dubai` | Dubai dusk (`theme-dubai`) | `#FFB54D` / `#FFD27D` / `#6FB7FF` / `#F2EEDF` | "Golden Hour" — deep-navy glass etched with hairline gold; luxury-hotel elegance; keep the Burj + skyline sharp | `max-width:700px`, `margin:0 auto` (centered) |
| `reef` | coral reef (`theme-reef`) | `#22C8C2` / `#FFD166` / `#66E0FF` / `#EAFBFF` | "Open Water" — instrument layer in open water; **the only blurred element is the equation island** (`.eq-row`), everything else stays crystal clear | `max-width:720px`, top-center calm zone |
| `savanna` | Pride Rock sunset (`theme-savanna`) | `#E07028` / `#FFC568` / `#FF9A4D` / `#FFF3E0` | Warm amber dusk glass with a gentle blur so the sky/rock/herds glow through; add = golden sun, subtract = grass-green; a full skin (header, card, equation, buttons, number line, chain jar, end screen) | `max-width:640px`, pushed to the lower-**right** (`margin:0 calc(16px + 5cm) 0 auto`) so Pride Rock + the lions on the left stay visible (`margin:8px auto 0` below 900px) |

## 5. Scoping discipline

Loading one skin must never bleed into another. Every rule (except the shared
`:root` palette block) is scoped to the active background's **body theme
class**, e.g. `body.theme-galaxy .glass{…}`. Because the skin link is swapped
rather than stacked, only one skin file is ever present — but scoping is the
belt-and-suspenders guarantee that even a stale rule can't match.

Theme → body-class mapping (set by `applyTheme`, themes.js):

| Background | body class |
|------------|------------|
| space | `theme-galaxy` |
| unicorns / girls | `theme-girls` |
| dubai | `theme-dubai` |
| reef | `theme-reef` |
| savanna | `theme-savanna` |

## 6. Adding a skin

1. **Create `game/skins/<name>.skin.css`.** Start from `space.skin.css`, set
   the four palette vars in `:root`, and scope every other rule
   to `body.theme-<name>`. Own the four families (palette / type / glass /
   position); restyle the number line and other UI as far as you wish, but
   respect the hard rules in §3.
2. **Point a background at it.** In the background module
   (`backgrounds/<name>.bg.js`) set
   `window.BACKGROUNDS[name] = { skin:'<name>', aids:'<name>', init(){…} }`.
   `loadBackground` calls `applySkin(mod.skin || name)`, so if the skin file is
   named exactly like the background you may omit `skin:` entirely.

That's it — no `index.html` edit. The skin link is injected on load and cleared
on unload automatically.
