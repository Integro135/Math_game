/* ── Unicorn Valley background module ───────────────────────────────────────
   The 🦄 (girls) theme's backdrop. This is a thin adapter to the game's
   background contract — the SCENE itself lives in the reusable module
   backgrounds/unicorns/meadow.scene.js (window.UnicornMeadow), the very same
   module the standalone workshop backgrounds/unicorns/meadow.html mounts, so
   there's a single source of truth and nothing is copied here.

   The scene: a green meadow under a 120s day cycle (morning → noon → sunset →
   twilight, with a glowing moon + falling stars at night), pink snow-capped
   mountains, an improved rainbow, a waterfall into a pond, the enchanted CSS
   castle, and roaming unicorns (dynamic, from unicorn.item.js — runners +
   walking mother&baby + a soaring flyer, ≤3 at once) plus a fluttering fairy,
   butterflies, and clickable magic (unicorn click-fx, castle fireworks, rainbow
   waterfall, jumping fish, grass blooms, fairy lightning).

   Everything mounts UNDER the given stage (#stars-layer, behind the game card)
   and init() returns UnicornMeadow's cleanup, so a theme switch tears it all
   down (loops, intervals, listeners, roaming actors). skin/aids unchanged.
   Loaded on demand by game/js/bg-loader.js. */
(function () {
  'use strict';
  var doc = document;

  // where this file lives → resolve the sibling unicorns/ modules (the game's
  // index.html does not ship them, so — like maldives/dinosaurs — we load them
  // ourselves; the standalone page loads them relative to itself).
  var BASE = (function () {
    var s = doc.currentScript;
    var dir = s && s.src ? s.src.replace(/[^/]*$/, '') : 'backgrounds/';
    return dir + 'unicorns/';
  })();

  function inject(src, cb) {
    var sel = 'script[data-uc="' + src + '"]', ex = doc.querySelector(sel);
    if (ex) {
      if (ex.getAttribute('data-loaded')) { cb(); return; }
      ex.addEventListener('load', cb); ex.addEventListener('error', cb); return;
    }
    var el = doc.createElement('script');
    el.src = BASE + src; el.setAttribute('data-uc', src);
    el.onload = function () { el.setAttribute('data-loaded', '1'); cb(); };
    el.onerror = cb;                       // never block the scene on a failed dep
    doc.head.appendChild(el);
  }

  // warm the scene module + its item deps during the intro-splash preload
  function loadScene(cb) {
    var left = 3, done = function () { if (--left === 0) cb(); };
    inject('unicorn.item.js', done);
    inject('fairy.item.js', done);
    inject('meadow.scene.js', done);
  }

  window.BACKGROUNDS = window.BACKGROUNDS || {};
  window.BACKGROUNDS.unicorns = {
    skin: 'unicorns',          // game look:  game/skins/unicorns.skin.css
    aids: 'unicorns',          // aid art:    aids/unicorns.aids.js (unicorn line + cupcake jar)
    preload: function () { loadScene(function () {}); },
    init: function (cfg) {
      var stage = cfg && cfg.stage;
      if (!stage) return function () {};
      var realCleanup = null, cancelled = false;
      loadScene(function () {
        if (cancelled) return;
        if (window.UnicornMeadow) realCleanup = window.UnicornMeadow.init({ stage: stage, base: BASE });
      });
      // returned immediately; if the scene is still loading, defer the teardown
      return function cleanup() {
        cancelled = true;
        if (realCleanup) { realCleanup(); realCleanup = null; }
        else { stage.innerHTML = ''; stage.classList.remove('uc-meadow'); }
      };
    },
  };
})();
