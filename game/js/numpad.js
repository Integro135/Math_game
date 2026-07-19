/* =====================================================================
   numpad.js — the game's own NUMBER PAD (tablet-keyboard fix).
   ---------------------------------------------------------------------
   TOUCH DEVICES ONLY (tablet/phone browsers — primary pointer is
   coarse, or a touch screen with no hover). On desktop this module is
   completely INERT: no listeners, no pad, the physical keyboard is the
   only input. On a touch device:

   Tapping ANY answer box — core #ans / ans1-3, chain sub-answers
   (.tx-sub-inp), column-exercise digit cells and every minigame input
   (they all carry .ans-inp / .tx-sub-inp) — pops a minimal in-game
   keypad, COMPACT: three rows only — 1-5 / 6-0 / [space ⌫ ✔] (the
   space bar spans 3 of the 5 columns). Every answer box also gets
   inputmode="none", so the OS keyboard NEVER opens (tap or programmatic
   focus — it used to cover half the game); the pad fully replaces it,
   appearing on the auto-focus each problem gives its first box.

   Zero changes to game logic: a key writes the digit into the focused
   box and re-dispatches a bubbling 'input' event, so every existing
   sanitizer/sync (oninput slices, jar sync, colx auto-advance, ntt
   preview) runs exactly as if typed; ✔ dispatches an Enter keydown so
   the box's own Enter behaviour (checkAns / focus-next-box / module
   check) runs unchanged, and the pad follows the focus to the next box.
   The SPACE bar re-dispatches a real Space keydown from the focused
   box, so every document-level desktop-spacebar behaviour runs as-is:
   hopping the number-line rider (columns/tens/big/kang), feeding the
   cookie jar, dropping a coin (coin_mul / bagel_cost / ice_cream).

   The pad element lives INSIDE .wrap: the background click-routers all
   whitelist '.wrap,button,input,…', so pad taps never reach the scene
   (no per-background edits needed).
   ===================================================================== */
(function () {
  'use strict';
  /* run ONLY in tablet/phone browsers: coarse primary pointer (tablets,
     phones) or a hover-less touch screen — desktops/laptops (fine pointer
     + hover, even touch-screen laptops) keep the OS keyboard and no pad */
  var TOUCH = !!(window.matchMedia &&
    (matchMedia('(pointer:coarse)').matches ||
     (matchMedia('(hover:none)').matches && navigator.maxTouchPoints > 0)));
  if (!TOUCH) return;

  var SEL = 'input.ans-inp,input.tx-sub-inp';
  var pad = null, active = null;
  /* a tap OUTSIDE the pad closes it — but only from a comfortable distance:
     taps within ~2.5cm of the pad's edge (mid-solve stray fingers, nearby
     controls) keep it open; only a clearly-away tap (3cm+) closes it.
     1cm ≈ 37.8 CSS px. */
  var CLOSE_DIST = 2.5 * 37.8;   // ≈ 94px

  function build() {
    if (pad) return pad;
    pad = document.createElement('div');
    pad.id = 'game-numpad';
    pad.dir = 'ltr';                               // digit rows read left-to-right
    /* grid auto-flow over 5 columns → row1 1-5, row2 6-0, row3 space(×3) ⌫ ✔ */
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ' ', '⌫', '✔'], i;
    for (i = 0; i < keys.length; i++) (function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'np-key' + (k === '✔' ? ' np-ok' : k === '⌫' ? ' np-del' :
                                k === ' ' ? ' np-space' : '');
      if (k === ' ') {          // the space BAR: blank like a real keyboard's —
        b.textContent = '';     // CSS draws a centred dash on it
        b.setAttribute('aria-label', 'רֶוַח — מַזִּיז אֶת יַשַׁר הַמִּסְפָּרִים');
      } else b.textContent = k;
      /* act on pointerdown and swallow it — focus stays in the answer box */
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault(); ev.stopPropagation(); press(k);
      });
      b.addEventListener('click', function (ev) { ev.preventDefault(); });
      pad.appendChild(b);
    })(keys[i]);
    (document.querySelector('.wrap') || document.body).appendChild(pad);
    return pad;
  }

  function show(inp) {
    active = inp;
    build().classList.add('np-show');
    watchNl();
  }
  function hide() {
    active = null;
    if (pad) pad.classList.remove('np-show');
  }
  function isOpen() { return !!(pad && pad.classList.contains('np-show')); }

  /* On TABLETS, when the number line (#nl-panel) is on screen the bottom-CENTRE
     pad would cover it — tag the pad so CSS can slide it to the RIGHT edge. Uses
     computed display so it's right whether the line is hidden inline (style) or
     by a body class (tf-locked-nl). */
  function syncNlShift() {
    if (!pad) return;
    var nlp = document.getElementById('nl-panel');
    var vis = !!(nlp && getComputedStyle(nlp).display !== 'none');
    pad.classList.toggle('np-nl', vis);
  }
  /* switching mode/problem REBUILDS the card, so #nl-panel is a fresh node each
     time — re-point the observer at the CURRENT one (and re-sync now). Within a
     problem the node is stable, so a mid-problem reveal (a mistake showing the
     line) still fires it. Called on every show() = every problem's auto-focus. */
  var nlObs = new MutationObserver(syncNlShift);
  function watchNl() {
    nlObs.disconnect();
    var nlp = document.getElementById('nl-panel');
    if (nlp) nlObs.observe(nlp, { attributes: true, attributeFilter: ['style', 'class'] });
    syncNlShift();
  }

  function press(k) {
    if (!active || !document.contains(active) || active.disabled || active.readOnly) return;
    active.focus();
    if (k === ' ') {
      /* the desktop SPACEBAR twin: re-dispatch a REAL Space keydown from the
         focused answer box (bubbles to document, activeElement = the box —
         exactly the physical-keyboard situation), so every existing handler
         runs unchanged: main.js hops the number-line rider / feeds the jar,
         and the coin exercises (coin_mul/bagel_cost/ice_cream) drop a coin. */
      active.dispatchEvent(new KeyboardEvent('keydown',
        { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
      return;
    }
    if (k === '✔') {
      active.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
      /* Enter may have SOLVED the problem (→ celebration) or chained focus to the
         next answer box (ans1→ans2, sub→final). SOLVED → close the pad so it never
         covers the celebration screen. Otherwise follow focus to the next box; if
         focus genuinely left the boxes, close. (A wrong answer keeps `done` false
         and the box focused, so the pad stays for the retry.) */
      setTimeout(function () {
        if (typeof done !== 'undefined' && done) { hide(); return; }
        var f = document.activeElement;
        if (f && f.matches && f.matches(SEL) && !f.disabled) active = f;
        else hide();
      }, 80);
      return;
    }
    if (k === '⌫') {
      active.value = active.value.slice(0, -1);
    } else {
      var ml = active.maxLength;                   // -1 when unset
      if (ml > 0 && active.value.length >= ml) return;   // full cell — same as typing
      active.value += k;
    }
    active.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ── wiring (delegated — answer boxes are re-created per problem) ── */
  document.addEventListener('pointerdown', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#game-numpad')) return;
    /* only a LIVE box adopts the pad — tapping a disabled/readonly cell (e.g. a
       column's not-yet-active tens digit) must not steal `active` (a disabled
       `active` used to make the focusout pass close the pad) */
    if (t && t.matches && t.matches(SEL) && !t.disabled && !t.readOnly) {
      t.inputMode = 'none';
      show(t);
      return;
    }
    /* tapping OUTSIDE the pad closes it — but with a FORGIVING margin: a tap
       landing within ~2.5cm of the pad's edge (a stray finger, a control right
       beside it) keeps it open; only a clearly-away tap (3cm+) hides it. A
       near tap that opened a blocking screen (settings/report/parent-gate)
       still closes it (re-checked after the tap's own click handler runs —
       also covers the input-already-blurred case where no focusout fires). */
    if (isOpen()) {
      var r = pad.getBoundingClientRect();
      var dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      var dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      if (Math.sqrt(dx * dx + dy * dy) > CLOSE_DIST) { hide(); return; }
      setTimeout(function () { if (blockingScreenUp()) hide(); }, 60);
    }
  }, true);

  /* each problem's auto-focus opens the pad (and follows Enter-chains) */
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!(t && t.matches && t.matches(SEL))) return;
    t.inputMode = 'none';
    show(t);
  });

  /* A full-screen screen where the pad must NOT linger (it sits above them): the
     settings / report / parent-gate modals, or a celebration / gift / intro
     screen. */
  function blockingScreenUp() {
    var ids = ['settings-ov', 'report-ov', 'parent-ov'], i, el;
    for (i = 0; i < ids.length; i++) {
      el = document.getElementById(ids[i]);
      if (el && el.style && el.style.display && el.style.display !== 'none') return true;
    }
    return (typeof _fwOn !== 'undefined' && _fwOn) ||
           (typeof _giftOn !== 'undefined' && _giftOn) ||
           (typeof _introOn !== 'undefined' && _introOn);
  }
  /* Focus leaving the answer boxes no longer closes the pad by itself. On touch,
     tapping an exercise manipulative (a shape / tile / item) BLURS the input, but
     the problem still needs its answer — so keep the pad open. Close ONLY when
     there is genuinely nothing to type into: the problem is solved (`done`), the
     active box is gone/disabled, or a blocking screen is up. */
  document.addEventListener('focusout', function () {
    setTimeout(function () {
      if (!isOpen()) return;
      var f = document.activeElement;
      if (f && f.matches && f.matches(SEL)) return;          // focus still on a box
      if (!blockingScreenUp() && !(typeof done !== 'undefined' && done) &&
          active && document.contains(active) && !active.disabled && !active.readOnly) return;
      hide();
    }, 200);
  });

  /* every answer box (present + future) refuses the OS keyboard */
  var arm = function (root) {
    if (!root.querySelectorAll) return;
    var list = root.querySelectorAll(SEL), i;
    for (i = 0; i < list.length; i++) list[i].inputMode = 'none';
  };
  arm(document);
  new MutationObserver(function (muts) {
    for (var m = 0; m < muts.length; m++)
      for (var n = 0; n < muts[m].addedNodes.length; n++) {
        var node = muts[m].addedNodes[n];
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches(SEL)) node.inputMode = 'none';
        arm(node);
      }
  }).observe(document.body, { childList: true, subtree: true });

  /* the number line's live node is watched per-problem by watchNl() (the card is
     rebuilt each mode/problem). The body class (tf-locked-nl) can hide the line
     too, and body is stable — watch it here to re-sync. */
  new MutationObserver(syncNlShift).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
