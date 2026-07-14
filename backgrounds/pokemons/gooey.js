/* =====================================================================
   gooey.js — the GOOEY GHOST (Gastly-like, #92) as a drop-in BACKGROUND
   CHARACTER. A FLYER — it hovers and drifts, it never walks the ground.
   ---------------------------------------------------------------------
   Extracted from backgrounds/pokemons/goeey_pokemon.html — the "gooey
   pokemon" pen by Diogo Peres (a LESS dump: @ball-size resolved to 70px,
   the `each(range(12))` mixin expanded to 12 nth-child rules). The rig:
   a purple core ball (#554d73, inset-shaded), 12 gooey satellite balls
   orbiting it under an SVG "goo" filter (feGaussianBlur+feColorMatrix —
   they melt into the core like slime), an inner halo disc (#a496a4),
   two white droopy half-round eyes with slit pupils, and a grin with
   two fangs. Page chrome/credit dropped; `#circle` id → `.core` class.

   PER-INSTANCE GOO FILTER: the pen's <filter id="goo"> would collide
   across instances, so each place() builds its own tiny <svg><defs> with
   a unique id (pkgo-goo-N) and points its gooey-container at it.

   ADDED vs the pen (per user request):
   • FLAME AURA BOOST — the pen's fire (the 12 pulsing goo tongues) was
     pale #a5a7bb and reached only ~12-40px past the core: on a light host
     it disappeared. The tongues now run two mauve-purple tones
     (#978eb5/#7f7599) and pulse ~35% further (pkgoMove 104-161px), so
     the fire around the ghost reads on any background.
   • FLIGHT — the figure rides a slow hover-bob (pkgoFloat, 4s) and
     patrol() drifts it across the AIR: same house crossing, but no
     ground shadow and no foot line; place it high (bottom ≈ 40%+).
   • BLINK — the pen's eyes never blinked. Each eye now sits in a
     position/rotation wrapper (.eye-w) while the eye itself squashes
     shut (scaleY .06, origin top) on a 4.4s loop (pkgoBlink) — the
     wrapper split keeps the blink transform from clobbering the eye's
     static rotate (the squirtle-flip lesson).

   LAYERS (each transform lives alone — never stacked on one element):
     wrap(.pkw-go px box) > .pkgo-sc(scale) > .pkgo-fl(flip) >
       .pkgo(float bob) > .center(art)

   THE POKEMON-OBJECT PATTERN (same registry as eevee.js/pikachu.js):
       window.Pokemons.gooey = {
         name, dexId, nativeW: 400, nativeH: 400, footFrac,
         place({parent, height, left, right, bottom, top, z,
                flip, paused}) → instance
       }
       instance = { element, refit(), setFlip(bool), setPaused(bool),
                    teleport(), patrol(opts), remove() }
   patrol({speed:px/s, edgePad, pauseMs:[min,max]}) drifts the parent's
   full width side to side forever (a flyer's glide — keep speed low).
   CLICK → TELEPORT: clicking the ghost FADES it OUT, jumps it to a fresh
   airborne spot (random x + bottom 36-58%, ≥28% away), FADES it back IN,
   and resumes the drift from there — a ghostly phase (the fade rides the
   wrapper opacity while the float/goo keep animating). Detected via a
   document capture-phase listener hit-testing the live box (game-UI
   filtered). inst.teleport() fires it on demand.
   ES5, file:// safe, no dependencies.
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NATIVE_W = 400, NATIVE_H = 400;   // design canvas around the blob
  var instSeq = 0;

  var CSS = [
    '.pkw-go{position:absolute;pointer-events:none;will-change:transform}',
    '.pkw-go .pkgo-sc{position:absolute;left:0;bottom:0;width:' + NATIVE_W + 'px;height:' + NATIVE_H + 'px;transform-origin:0 100%}',
    '.pkw-go .pkgo-fl{position:absolute;left:0;top:0;width:100%;height:100%}',
    '.pkw-go.pk-flip .pkgo-fl{transform:scaleX(-1)}',
    /* the hover-bob rides its own layer (a flyer never stands still) */
    '.pkw-go .pkgo{position:absolute;left:0;top:0;width:100%;height:100%;animation:pkgoFloat 4s ease-in-out infinite}',

    /* ── the art, centred in the canvas ── */
    '.pkgo .center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}',
    '.pkgo .core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#554d73;',
    '  width:200px;height:200px;border-radius:50%;z-index:2;box-shadow:inset 5px -4px 20px 0px #0000004f}',
    '.pkgo .gooey-container{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1;padding:70px}',
    '.pkgo .balls-container{animation:pkgoRotate linear 15s infinite}',
    '.pkgo .balls-container .ball{position:absolute;left:calc(50% - 35px);top:calc(50% - 35px)}',
    /* the FLAME AURA: the pen\'s pale #a5a7bb tongues vanish on light hosts,
       so the flames run deeper mauve-purple (two tones for depth) and reach
       ~35% further out (pkgoMove below) — the fire reads on any background */
    '.pkgo .balls-container .ball::before{content:"";display:inline-block;width:70px;height:70px;',
    '  border-radius:50%;background:#978eb5;animation:pkgoMove linear 3s infinite}',
    '.pkgo .balls-container .ball:nth-child(even)::before{background:#7f7599}',
    /* each(range(12)) expanded: rotate value*30deg, delay value*0.2s */
    '.pkgo .ball:nth-child(1){transform:rotate(30deg)}.pkgo .ball:nth-child(1)::before{animation-delay:.2s}',
    '.pkgo .ball:nth-child(2){transform:rotate(60deg)}.pkgo .ball:nth-child(2)::before{animation-delay:.4s}',
    '.pkgo .ball:nth-child(3){transform:rotate(90deg)}.pkgo .ball:nth-child(3)::before{animation-delay:.6s}',
    '.pkgo .ball:nth-child(4){transform:rotate(120deg)}.pkgo .ball:nth-child(4)::before{animation-delay:.8s}',
    '.pkgo .ball:nth-child(5){transform:rotate(150deg)}.pkgo .ball:nth-child(5)::before{animation-delay:1s}',
    '.pkgo .ball:nth-child(6){transform:rotate(180deg)}.pkgo .ball:nth-child(6)::before{animation-delay:1.2s}',
    '.pkgo .ball:nth-child(7){transform:rotate(210deg)}.pkgo .ball:nth-child(7)::before{animation-delay:1.4s}',
    '.pkgo .ball:nth-child(8){transform:rotate(240deg)}.pkgo .ball:nth-child(8)::before{animation-delay:1.6s}',
    '.pkgo .ball:nth-child(9){transform:rotate(270deg)}.pkgo .ball:nth-child(9)::before{animation-delay:1.8s}',
    '.pkgo .ball:nth-child(10){transform:rotate(300deg)}.pkgo .ball:nth-child(10)::before{animation-delay:2s}',
    '.pkgo .ball:nth-child(11){transform:rotate(330deg)}.pkgo .ball:nth-child(11)::before{animation-delay:2.2s}',
    '.pkgo .ball:nth-child(12){transform:rotate(360deg)}.pkgo .ball:nth-child(12)::before{animation-delay:2.4s}',
    '.pkgo .balls-container .circle{background:#a496a4;width:210px;height:210px;border-radius:50%}',

    /* ── eyes: .eye-w carries position+rotation, .eye carries the shape
          AND the blink (scaleY squash from the top lid) ── */
    '.pkgo .eye-w{position:absolute;top:-33px;width:80px;height:46px;z-index:3}',
    '.pkgo .eye-w.left{transform:rotate(26deg);left:-72px}',
    '.pkgo .eye-w.right{transform:rotate(-27deg);left:36px}',
    '.pkgo .eye{position:absolute;left:0;top:0;width:100%;height:100%;background-color:#fff;',
    '  border-bottom-left-radius:100px;border-bottom-right-radius:100px;',
    '  transform-origin:50% 0;animation:pkgoBlink 4.4s ease-in-out infinite}',
    /* the wander layer (added): the pupils LOOK around — left, back, right —
       on a slow 9s loop. It rides its own wrapper so it never clobbers each
       pupil's static rotate (the squirtle-flip lesson). */
    '.pkgo .pupil-w{position:absolute;left:0;top:0;width:100%;height:100%;animation:pkgoLook 9s ease-in-out infinite}',
    '.pkgo .eye .pupil{position:absolute;top:10px;width:4px;height:10px;border-radius:10px;background:#000}',
    '.pkgo .eye-w.left .pupil{left:60px;transform:rotate(-26deg)}',
    '.pkgo .eye-w.right .pupil{right:60px;transform:rotate(27deg)}',

    /* ── the fanged grin ── */
    '.pkgo .mouth{position:absolute;top:32px;left:-44px;width:105px;height:50px;background-color:#a496a4;',
    '  border-bottom-left-radius:110px;border-bottom-right-radius:110px;z-index:3;transform:rotate(9deg)}',
    '.pkgo .mouth .tooth{position:absolute;top:0;width:0;height:0;border-style:solid;',
    '  border-width:20px 8px 0px 8px;border-color:#fff transparent transparent transparent}',
    '.pkgo .mouth .tooth.left{left:2px}',
    '.pkgo .mouth .tooth.right{right:2px}',

    /* ── keyframes ── */
    /* the pen\'s 77/105/91/119 ×~1.35 — longer flame tongues (max reach
       161+35=196 < the 200px canvas half, so nothing clips) */
    '@keyframes pkgoMove{0%{transform:translateY(104px)}25%{transform:translateY(142px)}',
    ' 50%{transform:translateY(123px)}75%{transform:translateY(161px)}100%{transform:translateY(104px)}}',
    '@keyframes pkgoRotate{0%{transform:rotate(0)}100%{transform:rotate(-360deg)}}',
    '@keyframes pkgoFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}',
    '@keyframes pkgoBlink{0%,93%,100%{transform:scaleY(1)}95.5%{transform:scaleY(.06)}98%{transform:scaleY(1)}}',
    '@keyframes pkgoLook{0%,20%,54%,88%,100%{transform:translateX(0)}',
    ' 28%,44%{transform:translateX(-7px)}62%,80%{transform:translateX(7px)}}',

    /* pause — LAST (+!important) so it outranks every animation shorthand */
    '.pkw-go.pk-paused .pkgo,.pkw-go.pk-paused .pkgo *,',
    '.pkw-go.pk-paused .pkgo *::before,.pkw-go.pk-paused .pkgo *::after{animation-play-state:paused!important}'
  ].join('\n');

  var HTML =
    '<div class="center">' +
      '<div class="core"></div>' +
      '<div class="gooey-container">' +
        '<div class="balls-container">' +
          '<div class="ball"></div><div class="ball"></div><div class="ball"></div>' +
          '<div class="ball"></div><div class="ball"></div><div class="ball"></div>' +
          '<div class="ball"></div><div class="ball"></div><div class="ball"></div>' +
          '<div class="ball"></div><div class="ball"></div><div class="ball"></div>' +
          '<div class="circle"></div>' +
        '</div>' +
      '</div>' +
      '<div class="eye-w left"><div class="eye"><div class="pupil-w"><div class="pupil"></div></div></div></div>' +
      '<div class="eye-w right"><div class="eye"><div class="pupil-w"><div class="pupil"></div></div></div></div>' +
      '<div class="mouth"><div class="tooth left"></div><div class="tooth right"></div></div>' +
    '</div>';

  function injectCSS() {
    if (doc.getElementById('pokemon-gooey-css')) return;
    var s = doc.createElement('style');
    s.id = 'pokemon-gooey-css';
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  /* ── wobble: a jelly squish-and-stretch (it IS a gooey blob). composite:'add'
     scale on the float layer (.pkgo) rides on top of its pkgoFloat translateY
     without clobbering. Fires on a random timer AND (before the vanish) on
     click. ── */
  function fireWobble(wrap) {
    if (!wrap || wrap._acting) return;
    var fig = wrap.querySelector ? wrap.querySelector('.pkgo') : null;
    if (!fig || !fig.animate) return;
    wrap._acting = true;
    try {
      fig.animate(
        [{ transform: 'scale(1,1)' },
         { transform: 'scale(1.14,0.86)', offset: 0.3, easing: 'ease-out' },
         { transform: 'scale(0.9,1.12)', offset: 0.58, easing: 'ease-in-out' },
         { transform: 'scale(1.05,0.96)', offset: 0.8 },
         { transform: 'scale(1,1)' }],
        { duration: 720, composite: 'add' }).onfinish = function () { wrap._acting = false; };
    } catch (e) { wrap._acting = false; }
  }

  /* ambient act scheduler — a random 6-13s heartbeat per instance */
  function scheduleActs(wrap, fire) {
    (function tick() {
      wrap._actT = setTimeout(function () {
        if (!doc.body || !doc.body.contains(wrap)) return;
        if (!wrap.classList.contains('pk-paused')) fire();
        tick();
      }, 6000 + Math.random() * 7000);
    })();
  }

  /* one document-level capture click handler hit-tests each ghost's LIVE box
     (robust while it drifts) and TELEPORTS it, stopping the click from
     reaching the scene behind it. Skips the game/host UI. */
  var clickBound = false;
  function ensureClickHandler() {
    if (clickBound || typeof doc === 'undefined') return;
    clickBound = true;
    doc.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest(
        '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
      var list = doc.querySelectorAll('.pkw-go');
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.width && e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          fireWobble(list[i]);          // a jelly shudder …
          if (list[i]._teleport) list[i]._teleport();   // … then vanish + reappear
          e.stopPropagation();
          return;
        }
      }
    }, true);
  }

  /* place() — drop a hovering gooey ghost into any positioned container */
  function place(opts) {
    opts = opts || {};
    var parent = opts.parent || doc.body;
    injectCSS();
    ensureClickHandler();

    var wrap = doc.createElement('div');
    wrap.className = 'pkw-go' + (opts.flip ? ' pk-flip' : '') + (opts.paused ? ' pk-paused' : '');
    var css = 'height:' + (opts.height || '200px') + ';';
    if (opts.left != null) css += 'left:' + opts.left + ';';
    if (opts.right != null) css += 'right:' + opts.right + ';';
    if (opts.bottom != null) css += 'bottom:' + opts.bottom + ';';
    if (opts.top != null) css += 'top:' + opts.top + ';';
    if (opts.z != null) css += 'z-index:' + opts.z + ';';
    wrap.style.cssText = css;
    /* no ground shadow — it flies */

    /* per-instance goo filter (a shared id would collide across instances) */
    var gooId = 'pkgo-goo-' + (++instSeq);
    var NSVG = 'http://www.w3.org/2000/svg';
    var fsvg = doc.createElementNS(NSVG, 'svg');
    fsvg.setAttribute('width', '0'); fsvg.setAttribute('height', '0');
    fsvg.style.cssText = 'position:absolute;width:0;height:0;';
    fsvg.innerHTML =
      '<defs><filter id="' + gooId + '">' +
        '<feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>' +
        '<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>' +
        '<feBlend in="SourceGraphic" in2="goo"/>' +
      '</filter></defs>';

    var sc = doc.createElement('div');
    sc.className = 'pkgo-sc';
    var fl = doc.createElement('div');
    fl.className = 'pkgo-fl';
    var fig = doc.createElement('div');
    fig.className = 'pkgo';
    fig.innerHTML = HTML;
    fl.appendChild(fig);
    sc.appendChild(fl);
    wrap.appendChild(fsvg);
    wrap.appendChild(sc);
    parent.appendChild(wrap);
    fig.querySelector('.gooey-container').style.filter = 'url(#' + gooId + ')';

    function refit() {
      var h = wrap.clientHeight || 200;
      var s = h / NATIVE_H;
      sc.style.transform = 'scale(' + s.toFixed(4) + ')';
      wrap.style.width = (NATIVE_W * s).toFixed(0) + 'px';
    }
    refit();

    /* ── patrol — drift the parent's width side to side forever ── */
    var patrolCtl = null;
    function patrol(popts) {
      popts = popts || {};
      wrap._patrolOpts = popts;                            // remembered so teleport can resume
      if (patrolCtl) patrolCtl.stop();
      var stage = wrap.parentNode || doc.body;
      var speed = popts.speed || 70;                      // px/s — a lazy glide
      var pad = popts.edgePad != null ? popts.edgePad : 12;
      var pMin = (popts.pauseMs && popts.pauseMs[0]) || 350;
      var pMax = (popts.pauseMs && popts.pauseMs[1]) || 900;
      /* rect-based start point, so restarting a patrol never teleports */
      var st = { tx: wrap.getBoundingClientRect().left - stage.getBoundingClientRect().left,
                 dir: 1, anim: null, timer: null, paused: false, stopped: false };
      wrap.style.left = '0px';
      wrap.style.right = 'auto';
      wrap.style.transform = 'translateX(' + st.tx + 'px)';

      function leg() {
        if (st.stopped) return;
        var cw = stage.clientWidth || 800, ew = wrap.offsetWidth || 100;
        var target = st.dir > 0 ? Math.max(pad, cw - ew - pad) : pad;
        api.setFlip(target > st.tx);                      // face ACTUAL travel dir
        var dur = Math.max(600, Math.abs(target - st.tx) / speed * 1000);
        if (!wrap.animate) {                               // no-WAAPI fallback: just arrive
          wrap.style.transform = 'translateX(' + target + 'px)';
          st.timer = setTimeout(done, dur);
          return;
        }
        st.anim = wrap.animate(
          [{ transform: 'translateX(' + st.tx + 'px)' },
           { transform: 'translateX(' + target + 'px)' }],
          { duration: dur, easing: 'linear', fill: 'forwards' });
        st.anim.onfinish = done;
        function done() {
          if (st.stopped) return;
          st.tx = target; st.anim = null;
          st.dir = -st.dir;                                // turn at the edge
          if (!st.paused) st.timer = setTimeout(leg, pMin + Math.random() * (pMax - pMin));
        }
      }
      leg();

      patrolCtl = {
        stop: function () {
          st.stopped = true;
          if (st.anim) {
            /* commit the current visual x BEFORE cancelling, so the figure
               stays where it is (a bare cancel falls back to the leg start) */
            var x = wrap.getBoundingClientRect().left - stage.getBoundingClientRect().left;
            wrap.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
            try { st.anim.cancel(); } catch (e) {}
          }
          if (st.timer) clearTimeout(st.timer);
          patrolCtl = null;
        },
        setPaused: function (b) {
          st.paused = b !== false;
          if (st.anim) { if (st.paused) st.anim.pause(); else st.anim.play(); }
          else if (st.paused) { if (st.timer) { clearTimeout(st.timer); st.timer = null; } }
          else if (!st.stopped && !st.timer) leg();        // resume from a turn-pause
        }
      };
      return patrolCtl;
    }

    /* ── teleport — click makes the ghost FADE OUT, jump to a fresh spot in
          the air, and FADE back IN (then resume drifting from there). The
          fade rides the wrapper's opacity (independent of its patrol
          translateX and the child float/goo animations, which keep running,
          so it dissolves mid-bob like a real phase). ── */
    function doTeleport() {
      if (wrap._teleporting) return;
      wrap._teleporting = true;
      var resumeOpts = patrolCtl ? (wrap._patrolOpts || {}) : null;
      if (patrolCtl) patrolCtl.stop();                     // freeze position (commits x)

      function relocate() {
        var stage = wrap.parentNode || doc.body;
        var sw = stage.clientWidth || 800, ew = wrap.offsetWidth || 100;
        var sr = stage.getBoundingClientRect(), r = wrap.getBoundingClientRect();
        var curCx = (r.left - sr.left + r.width / 2) / sw * 100;
        var newCx, tries = 0;
        do { newCx = 16 + Math.random() * 68; tries++; } while (Math.abs(newCx - curCx) < 28 && tries < 12);
        var nx = sw * newCx / 100 - ew / 2;
        nx = Math.max(8, Math.min(sw - ew - 8, nx));       // keep it on-stage
        wrap.style.left = nx.toFixed(1) + 'px';
        wrap.style.right = 'auto';
        wrap.style.transform = 'translateX(0px)';
        wrap.style.bottom = (36 + Math.random() * 22).toFixed(1) + '%';   // stay airborne (36-58%)
      }

      if (wrap.animate) {
        wrap.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: 280, easing: 'ease-in', fill: 'forwards' }).onfinish = function () {
          relocate();
          wrap.animate([{ opacity: 0 }, { opacity: 1 }],
            { duration: 320, easing: 'ease-out', fill: 'forwards' }).onfinish = function () {
            wrap._teleporting = false;
            if (resumeOpts) patrol(resumeOpts);            // drift on from the new spot
          };
        };
      } else {
        relocate();
        wrap._teleporting = false;
        if (resumeOpts) patrol(resumeOpts);
      }
    }
    wrap._teleport = doTeleport;

    var api = {
      element: wrap,
      refit: refit,
      setFlip: function (b) { wrap.classList.toggle('pk-flip', b !== false); },
      /* fade out → reappear elsewhere (also fired by clicking the ghost) */
      teleport: doTeleport,
      /* jelly squish-and-stretch (also fires on its own every ~6-13s) */
      wobble: function () { fireWobble(wrap); },
      act: function () { fireWobble(wrap); },
      setPaused: function (b) {
        wrap.classList.toggle('pk-paused', b !== false);
        if (patrolCtl) patrolCtl.setPaused(b);             // freeze the crossing too
      },
      patrol: patrol,
      remove: function () {
        if (patrolCtl) patrolCtl.stop();
        clearTimeout(wrap._actT);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    };
    scheduleActs(wrap, function () { fireWobble(wrap); });
    return api;
  }

  w.Pokemons = w.Pokemons || {};
  w.Pokemons.gooey = {
    name: 'gooey',
    dexId: 92,                          // Gastly-like gooey ghost
    nativeW: NATIVE_W,
    nativeH: NATIVE_H,
    /* a flyer — no foot line; the blob's lower edge is ≈0.97 of the canvas */
    footFrac: 0.97,
    place: place
  };
})(typeof window !== 'undefined' ? window : this);
