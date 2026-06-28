/* =====================================================================
   dinosaurs.bg.js — OFFICIAL "dinosaurs" background pack scene module
   ---------------------------------------------------------------------
   Combines the volcano world (sunset sky + twinkling stars + drifting clouds +
   snow-capped mountain ranges + an erupting volcano BEHIND them + foreground
   grass) with DINOSAURS that roam the grass in PACKS of 2-3 (savanna-style:
   one species at a time crosses together as a small herd of mixed sizes, then a
   gap, then a fresh pack arrives — alternating direction), plus a couple of
   stationary baby-T-Rex eggs hatching on the grass.

   It re-draws NONE of that art — it loads the existing reusable modules and
   composes them inside the game's stage, exactly like the dev harnesses do.

   Registers window.BACKGROUNDS.dinosaurs = { skin, aids, init({stage}) → cleanup }
   per the bg-loader contract (game/js/bg-loader.js, NEW_BACKGROUND_GUIDE.md).

   Reusable parts (backgrounds/dinasours/), all loaded on demand:
     • volcano.js        → Volcano.place(stage,…)        the whole volcano scene
     • tricera-walker.js → TriceraWalker.walk/patrol     a triceratops
     • stego-walker.js   → StegoWalker.walk/patrol        a stegosaurus
     • trex-walker.js    → TrexWalker.walk/patrol          a running T-Rex
     • baby-trex-egg.js  → BabyTrexEgg.place(stage,…)      a hatching egg (static)
   ===================================================================== */
(function (global) {
  'use strict';

  // resolve this file's folder so the dino modules load in BOTH the game
  // (page = index.html at root) and the standalone harness (page in backgrounds/).
  var SELF = document.currentScript;
  var BASE = (SELF && SELF.src) ? SELF.src.replace(/[^/]*$/, '') : 'backgrounds/';
  var DINO = BASE + 'dinasours/';

  var DEPS = [
    ['Volcano',        'volcano.js'],
    ['TriceraWalker',  'tricera-walker.js'],
    ['StegoWalker',    'stego-walker.js'],
    ['TrexWalker',     'trex-walker.js'],
    ['BabyTrexEgg',    'baby-trex-egg.js'],
  ];

  function need(globalName, file, cb) {
    if (global[globalName]) return cb();
    var s = document.createElement('script');
    s.src = DINO + file;
    s.onload = cb;
    s.onerror = cb;            // proceed even if one dependency fails to load
    document.head.appendChild(s);
  }
  function ensureDeps(done) {       // load them one after another
    var i = 0;
    (function next() {
      if (i >= DEPS.length) return done();
      var d = DEPS[i++];
      need(d[0], d[1], next);
    })();
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  var PAL = ['green', 'pink', 'green2'];   // colour packs every dino species supports
  function pickPal() { return PAL[(Math.random() * PAL.length) | 0]; }

  global.BACKGROUNDS = global.BACKGROUNDS || {};
  global.BACKGROUNDS.dinosaurs = {
    skin: 'dinosaurs',
    aids: 'classic',
    init: function (ctx) {
      var stage = ctx && ctx.stage;
      if (!stage) return function () {};
      stage.innerHTML = '';                 // drop any previous background's DOM
      var cancelled = false, volcano = null, eggs = [], live = [], packTimer = null;
      var dir = Math.random() < 0.5 ? 'ltr' : 'rtl';

      // per-species pack tuning: base height % (of stage) + feet position %
      function species() {
        var s = [];
        if (global.TriceraWalker) s.push({ W: TriceraWalker, h: 24, b: 3 });
        if (global.StegoWalker)   s.push({ W: StegoWalker,   h: 22, b: 2.6 });
        if (global.TrexWalker)    s.push({ W: TrexWalker,    h: 30, b: 2 });
        return s;
      }

      // round-robin over the available species (shuffled each cycle) so EVERY
      // species — the T-Rex included — comes up regularly, not just by chance.
      var packQueue = [];
      function nextSpecies() {
        var avail = species();
        if (!avail.length) return null;
        if (!packQueue.length) {
          packQueue = avail.slice();
          for (var k = packQueue.length - 1; k > 0; k--) {   // Fisher-Yates shuffle
            var j = (Math.random() * (k + 1)) | 0, t = packQueue[k];
            packQueue[k] = packQueue[j]; packQueue[j] = t;
          }
        }
        return packQueue.shift();
      }

      // ONE pack: 2-3 members of decreasing size (a grown one leading + smaller
      // young), trailing each other across the same direction.
      function spawnPack() {
        if (cancelled) return;
        var sp = nextSpecies();
        if (!sp) return;
        dir = dir === 'ltr' ? 'rtl' : 'ltr';        // alternate direction each pack
        var n = 2 + ((Math.random() * 3) | 0);      // 2-4 members
        var baseDur = rnd(14000, 18000);
        var sizes = [1.0, 0.78, 0.58, 0.42];         // grown leader → … → a small baby
        for (var i = 0; i < n; i++) (function (i) {
          var delay = i * rnd(1100, 1800);          // members trail the leader
          setTimeout(function () {
            if (cancelled || !sp.W) return;
            var inst = sp.W.walk(stage, {
              direction: dir,
              duration: baseDur * rnd(0.95, 1.08),
              height:  (sp.h * sizes[i]).toFixed(1) + '%',
              bottom:  (sp.b + rnd(-0.4, 1.4)).toFixed(1) + '%',
              zIndex:  6 + (n - i),                  // the bigger leader sits in front
              faceWalkDir: true,
              palette: pickPal(),                    // mixed colours within the pack (savanna-style)
              onDone: function () { var k = live.indexOf(inst); if (k >= 0) live.splice(k, 1); },
            });
            if (inst) live.push(inst);
          }, delay);
        })(i);
        // a T-Rex pack ROARS mid-crossing (~60%): the lion-style lightning + shock
        if (sp.W === global.TrexWalker && global.TrexWalker.trigger && Math.random() < 0.6) {
          setTimeout(function () {
            if (!cancelled && global.TrexWalker) TrexWalker.trigger('roar');
          }, rnd(4000, 8000));
        }
        // DOUBLED frequency: next pack at ~half the old interval, so up to ~2
        // packs share the stage at once (savanna allows concurrent herds).
        packTimer = setTimeout(spawnPack, (baseDur + n * 1900 + rnd(5000, 11000)) / 2);
      }

      ensureDeps(function () {
        if (cancelled) return;
        if (global.Volcano) volcano = Volcano.place(stage, { zIndex: 0, fit: 'cover' });
        // stationary baby-T-Rex eggs hatching on the grass (centre, clear of the
        // game card on the left and the volcano on the right)
        if (global.BabyTrexEgg) {
          eggs.push(BabyTrexEgg.place(stage, { left: '47%', bottom: '4%',   height: '15%', zIndex: 6 }));
          eggs.push(BabyTrexEgg.place(stage, { left: '63%', bottom: '3.5%', height: '11%', zIndex: 5 }));
        }
        packTimer = setTimeout(spawnPack, 600);     // first pack arrives shortly
      });

      return function cleanup() {
        cancelled = true;
        if (packTimer) clearTimeout(packTimer);
        live.forEach(function (x) { if (x && x.stop) x.stop(); });
        eggs.forEach(function (e) { if (e && e.remove) e.remove(); });
        if (volcano && volcano.remove) volcano.remove();
        stage.innerHTML = '';
      };
    },
  };
})(typeof window !== 'undefined' ? window : this);
