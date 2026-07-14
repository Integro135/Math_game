/* =====================================================================
   squirtle.js — SQUIRTLE (#7, baby version) as a drop-in BACKGROUND
   CHARACTER.
   ---------------------------------------------------------------------
   Extracted from backgrounds/pokemons/squirtle.html — the pure-CSS
   Squirtle pen by Vedurumudi Priyanka. The rig is kept 1:1 (blue head
   with water bubbles, cream shell with strap lines, curled tail, two
   arms + two legs); dropped: the POKEMON!!/credit headings, p.inset,
   page chrome, the stray invalid declarations, and the `//`-disabled
   transforms. All selectors are scoped under .pksq and keyframes are
   prefixed pksq* so nothing collides with a host page.

   EVERYTHING IS SIZED IN EM (the pen's design): the whole figure is a
   20em × 20em canvas, so the module scales by setting font-size =
   height/20 on the figure root — native em scaling, no transform-scale
   layer, no blur. box-sizing:border-box is pinned locally (the pen
   relies on it — host-agnostic like the eevee port).

   MOTION (all built into the pen, always on): the limbs SWING in
   opposite phases (walk-in-place, 500ms alternate), the body bounces
   (250ms) and the head/tail rock gently; the pen even ships its own
   ground-shadow with a COUNTER-bounce (alternate-reverse) so the
   shadow stays planted while the body bobs — therefore place() does
   NOT add the house .pk-shadow. Placed alone it marches in place;
   patrol carries it across the stage.

   THE POKEMON-OBJECT PATTERN (same registry as eevee.js/pikachu.js):
       window.Pokemons.squirtle = {
         name, dexId, nativeW: 320, nativeH: 320, footFrac,
         place({parent, height, left, right, bottom, top, z,
                flip, paused}) → instance
       }
       instance = { element, refit(), setFlip(bool), setPaused(bool),
                    water(), patrol(opts), remove() }
   patrol({speed:px/s, edgePad, pauseMs:[min,max]}) walks the parent's
   full width side to side forever, flipping at each edge to face the
   travel direction. Faces LEFT natively → flip mirrors to face right.
   CLICK → WATER GUN: clicking Squirtle shoots a water jet from its mouth
   (layered SVG arcs revealed nozzle-first, droplet spray, splash rings at
   the landing point, ~1s, auto-removed; the overlay mirrors with .pk-flip
   so the jet always fires forward). Detected via a document capture-phase
   listener hit-testing the live box (game-UI filtered). inst.water() fires
   it on demand.
   ES5, file:// safe, no dependencies.
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NATIVE_W = 320, NATIVE_H = 320;   // the 20em×20em canvas at 16px

  var CSS = [
    '.pkw-sq{position:absolute;pointer-events:none;will-change:transform}',
    /* flip lives on its own layer: the figure root (.pksq) animates transform
       (pksqBounce), and a running animation OVERRIDES any static transform —
       a scaleX(-1) on .pksq itself would simply never show */
    '.pkw-sq .pksq-fl{position:absolute;left:0;bottom:0;width:100%;height:100%}',
    '.pkw-sq.pk-flip .pksq-fl{transform:scaleX(-1)}',

    /* ── the figure canvas — the pen assumes border-box everywhere ── */
    '.pksq,.pksq *,.pksq *::before,.pksq *::after{box-sizing:border-box}',
    '.pksq{position:absolute;left:0;bottom:0;width:20em;height:20em;',
    '  animation:pksqBounce 250ms infinite linear alternate}',
    /* the pen\'s own ground shadow — counter-bounces so it stays planted */
    '.pksq::after{content:"";position:absolute;z-index:-10;bottom:0;left:50%;',
    '  width:60%;height:20%;margin-left:-30%;background-color:rgba(0,0,0,0.05);',
    '  border-radius:50%;animation:pksqBounce 250ms infinite linear alternate-reverse}',

    /* ── body: cream shell front with strap lines + side stripes ── */
    '.pksq .body{position:absolute;top:50%;left:50%;width:6em;height:6em;',
    '  margin:4em 0 0 -1em;transform:translate(-50%,-50%);overflow:hidden;',
    '  background-color:#fe9;border:0.375em solid #555;border-radius:10% 10% 50% 50% / 50%}',
    '.pksq .body::before,.pksq .body::after{content:"";position:absolute;z-index:1;',
    '  top:2.25em;left:-1em;width:1.25em;height:1.5em;transform:rotate(55deg);',
    '  background-color:#fe9;border:0.25em solid #555;border-radius:10%}',
    '.pksq .body::after{z-index:0;top:4.825em;left:1.375em;height:1.25em;',
    '  transform:skewX(10deg) rotate(40deg);',
    '  box-shadow:0.375em -3.375em #fe9,0.125em -3.0625em #555}',
    '.pksq .stomach{position:absolute;bottom:3.25em;left:-1.125em;width:115%;height:100%;',
    '  border:0.25em solid transparent;border-bottom-color:#555;border-radius:50%;',
    '  box-shadow:0 1.25em #fe9,0 1.5em #555}',
    '.pksq .stomach::before{content:"";position:absolute;bottom:-4.125em;left:2.25em;',
    '  width:40%;height:100%;transform:rotate(-10deg);border:0.25em solid transparent;',
    '  border-left-color:#555;border-radius:50%}',
    '.pksq .shell{position:absolute;top:0;left:0.25em;z-index:1;width:100%;height:115%;',
    '  border-radius:10% 10% 50% 50% / 50%;',
    '  box-shadow:inset -0.5em 0 #953,inset -1em 0 #a63,inset -1.25em 0 #555,',
    '   inset -1.75em 0 #fff,inset -2em 0 #555}',

    /* ── curled tail (rocks with the head on the 250ms beat) ── */
    '.pksq .tail{position:absolute;top:50%;left:50%;width:4em;height:5.5em;',
    '  margin:0.25em 0 0 -0.5em;transform-origin:2.5em 100%;background-color:#6bc;',
    '  border:0.325em solid #555;border-radius:50%;',
    '  animation:pksqBounce2 250ms infinite linear alternate}',
    '.pksq .tail::before,.pksq .tail::after{content:"";position:absolute;top:-2em;left:2.25em;',
    '  width:5em;height:5.5em;background-color:inherit;border:0.325em solid #555;',
    '  border-left-color:transparent;border-radius:50%}',
    '.pksq .tail::after{top:0.375em;left:2.625em;width:2.5em;height:2.75em;',
    '  transform:translateX(1%);background-color:transparent;border:0.325em solid #555;',
    '  border-right-color:transparent;border-bottom-color:transparent}',

    /* ── head + face + water bubbles ── */
    '.pksq .head{position:absolute;z-index:1;top:50%;left:50%;width:10em;height:10em;',
    '  margin:-8.25em 0 0 -5.5em;background-color:#7cd;border:0.325em solid #555;',
    '  border-radius:50%;animation:pksqBounce2 250ms infinite linear alternate}',
    '.pksq .head::before{content:"";position:absolute;bottom:-0.0625em;right:1.625em;',
    '  width:8.25em;height:5em;transform:rotate(10deg);background-color:inherit;',
    '  border-radius:50%;box-shadow:0 0 0 0.325em #555}',
    '.pksq .head::after{content:"";position:absolute;width:100%;height:100%;',
    '  background-color:inherit;border-radius:50%;box-shadow:inset -0.5em 0.25em #6bc}',
    '.pksq .eye{position:absolute;z-index:1;top:5em;left:4em;width:2em;height:2.85em;',
    '  overflow:hidden;background-color:#555;border:0.1875em solid #555;',
    '  border-radius:50% / 60% 60% 40% 40%;box-shadow:inset 0 -0.375em #a63}',
    '.pksq .eye::before{content:"";position:absolute;top:0.375em;right:0.25em;',
    '  width:30%;height:20%;background-color:#fff;border-radius:50%}',
    '.pksq .eye:first-child{top:4em;left:0.5em;width:1.5em;height:2.25em;',
    '  border:0.125em solid #555;box-shadow:inset 0 -0.25em #a63}',
    '.pksq .mouth{position:absolute;z-index:1;bottom:0.75em;left:2em;width:1.125em;',
    '  height:1.75em;background-color:#fcc;border:0.125em solid #555;border-radius:50%;',
    '  box-shadow:inset 0 1.125em 0 -0.0625em #f55,inset 0 1.1875em #555}',
    '.pksq .mouth::before{content:"";position:absolute;top:-0.25em;right:-0.825em;',
    '  width:3em;height:2em;transform:rotate(20deg);background-color:#7cd;',
    '  border:0.125em solid transparent;border-bottom-color:#555;border-radius:45%}',
    /* the floating water bubbles (a baby water-type must dribble) */
    '.pksq .mouth::after{content:"";position:absolute;top:-6.5em;right:-0.825em;',
    '  width:2em;height:2em;transform:rotate(-20deg) scaleY(0.75);',
    '  background-color:rgba(255,255,255,0.25);border-radius:50%;',
    '  box-shadow:-1.5em 0.5em 0 -0.625em rgba(255,255,255,0.25),',
    '   -4.125em 4.5em 0 -0.625em rgba(255,200,200,0.8),',
    '   0.75em 10em 0 -0.5em rgba(255,200,200,0.8)}',

    /* ── limbs — the built-in walk-in-place swing (opposite phases) ── */
    '.pksq .leg{position:absolute;z-index:0;top:50%;left:50%;width:2.5em;height:2.5em;',
    '  margin:5.25em 0 0 -1em;transform-origin:50% 1em;background-color:#7cd;',
    '  border:0.325em solid #555;border-radius:50% / 50% 50% 50% 30%;',
    '  animation:pksqSwing 500ms infinite linear alternate}',
    '.pksq .leg::before{content:"";position:absolute;bottom:-0.325em;right:0.325em;',
    '  width:2.25em;height:1.5em;transform:rotate(15deg);background-color:inherit;',
    '  border:0.325em solid #555;border-radius:50% 50% 50% 50% / 80% 50% 50% 30%}',
    '.pksq .leg::after{content:"";position:absolute;width:100%;height:100%;',
    '  background-color:inherit;border-radius:50% / 50% 50% 50% 30%;',
    '  box-shadow:inset -0.375em 0.25em #6bc}',
    '.pksq .leg.back{z-index:-1;width:2.25em;height:2.75em;margin:5em 0 0 -3.75em;',
    '  background-color:#6bc;animation-delay:-500ms}',
    '.pksq .arm{position:absolute;z-index:0;top:50%;left:50%;width:2em;height:3em;',
    '  margin:2.125em 0 0 -0.25em;transform-origin:50% 1em;background-color:#7cd;',
    '  border:0.325em solid #555;border-radius:80% 80% 80% 60% / 60% 60% 60% 80%;',
    '  box-shadow:inset -0.375em 0.25em #6bc;',
    '  animation:pksqSwing 500ms -500ms infinite linear alternate}',
    '.pksq .arm.back{z-index:-1;margin:1.75em 0 0 -4em;background-color:#6bc;',
    '  animation-name:pksqSwing2;animation-delay:-1000ms}',

    /* ── blink (added — the pen never blinked): both eyes squash shut on a
          shared 4.8s loop. The .eye divs carry NO static transform, so the
          scaleY animation is safe to put straight on them. ── */
    '.pksq .eye{transform-origin:50% 20%;animation:pksqBlink 4.8s ease-in-out infinite}',

    '@keyframes pksqSwing{0%{transform:rotate(-60deg)}100%{transform:rotate(10deg)}}',
    '@keyframes pksqSwing2{0%{transform:rotate(-10deg)}100%{transform:rotate(60deg)}}',
    '@keyframes pksqBounce{0%{transform:translateY(0)}100%{transform:translateY(-0.25em)}}',
    '@keyframes pksqBounce2{0%{transform:rotate(0)}100%{transform:rotate(2deg)}}',
    '@keyframes pksqBlink{0%,93%,100%{transform:scaleY(1)}95.5%{transform:scaleY(.1)}98%{transform:scaleY(1)}}',

    /* pause — LAST (+!important) so it outranks every animation shorthand */
    '.pkw-sq.pk-paused .pksq,.pkw-sq.pk-paused .pksq *,',
    '.pkw-sq.pk-paused .pksq::after,.pkw-sq.pk-paused .pksq *::before,',
    '.pkw-sq.pk-paused .pksq *::after{animation-play-state:paused!important}'
  ].join('\n');

  var HTML =
    '<div class="tail"></div>' +
    '<div class="body">' +
      '<div class="stomach"></div>' +
      '<div class="shell"></div>' +
    '</div>' +
    '<div class="head">' +
      '<div class="eye"></div>' +
      '<div class="eye"></div>' +
      '<div class="mouth"></div>' +
    '</div>' +
    '<div class="leg back"></div>' +
    '<div class="leg"></div>' +
    '<div class="arm back"></div>' +
    '<div class="arm"></div>';

  function injectCSS() {
    if (doc.getElementById('pokemon-squirtle-css')) return;
    var s = doc.createElement('style');
    s.id = 'pokemon-squirtle-css';
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  /* ── water gun: click Squirtle → a stream of water shoots from its mouth
     (its water-type move). Pure SVG drawn in front of the figure on the
     wrapper's own px canvas, so it works in ANY host. The jet is layered
     arcs revealed nozzle-first via stroke-dashoffset, with droplets flying
     along it and a splash where it lands. The figure faces LEFT natively;
     when the wrapper is flipped (.pk-flip) the overlay mirrors too, so the
     stream always leaves the mouth forward. ── */
  var NSVG = 'http://www.w3.org/2000/svg';
  function waterArc(ox, oy, len, droop) {
    return 'M' + ox + ',' + oy +
      ' C' + (ox - len * 0.38) + ',' + (oy - len * 0.10 + droop * 0.2) +
      ' ' + (ox - len * 0.72) + ',' + (oy + droop * 0.6) +
      ' ' + (ox - len) + ',' + (oy + droop);
  }
  function fireWater(wrap) {
    if (typeof doc === 'undefined' || !wrap) return;
    var r = wrap.getBoundingClientRect();
    var W = Math.round(r.width) || 200, Hh = Math.round(r.height) || 200;

    var host = doc.createElement('div');
    host.className = 'pk-water';
    host.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;' +
      'overflow:visible;pointer-events:none;z-index:6;' +
      (wrap.classList.contains('pk-flip') ? 'transform:scaleX(-1);' : '');
    var svg = doc.createElementNS(NSVG, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;';
    host.appendChild(svg);

    var ox = W * 0.30, oy = Hh * 0.45;                    // ≈ the mouth (left-facing)
    var len = W * 0.72, droop = Hh * 0.14;                // jet reach + gravity droop
    var jw = Math.max(4, len * 0.075);
    /* the jet: three layered arcs with slightly different droops */
    var layers = [
      { d: waterArc(ox, oy, len, droop * 1.25), c: '#74c0fc', w: jw, o: 0.5 },
      { d: waterArc(ox, oy, len * 0.99, droop), c: '#339af0', w: jw * 0.6, o: 0.9 },
      { d: waterArc(ox, oy, len * 0.97, droop * 0.85), c: '#e7f5ff', w: jw * 0.28, o: 1 }
    ];
    var paths = [];
    layers.forEach(function (l) {
      var p = doc.createElementNS(NSVG, 'path');
      p.setAttribute('d', l.d); p.setAttribute('fill', 'none');
      p.setAttribute('stroke', l.c); p.setAttribute('stroke-width', l.w);
      p.setAttribute('stroke-linecap', 'round'); p.setAttribute('opacity', l.o);
      svg.appendChild(p); paths.push(p);
    });
    /* droplets spraying off the jet */
    for (var i = 0; i < 9; i++) {
      var f = 0.25 + Math.random() * 0.75;
      var dx = ox - len * f, dy = oy + droop * f * f + (Math.random() - 0.5) * jw * 2.4;
      var c = doc.createElementNS(NSVG, 'circle');
      c.setAttribute('cx', dx.toFixed(1)); c.setAttribute('cy', dy.toFixed(1));
      c.setAttribute('r', (1.5 + Math.random() * 2.2).toFixed(1));
      c.setAttribute('fill', Math.random() < 0.5 ? '#74c0fc' : '#a5d8ff');
      svg.appendChild(c);
      if (c.animate) c.animate(
        [{ opacity: 0, transform: 'translate(0,0)' },
         { opacity: 1, offset: 0.25 },
         { opacity: 0, transform: 'translate(' + (-jw * 1.5).toFixed(1) + 'px,' + (jw * (1 + Math.random())).toFixed(1) + 'px)' }],
        { duration: 500, delay: 140 + i * 40, easing: 'ease-out', fill: 'both' });
    }
    /* splash rings where the jet lands */
    var ex = ox - len, ey = oy + droop;
    for (var s2 = 0; s2 < 3; s2++) {
      var ring = doc.createElementNS(NSVG, 'circle');
      ring.setAttribute('cx', ex.toFixed(1)); ring.setAttribute('cy', ey.toFixed(1));
      ring.setAttribute('r', (jw * (1.1 + s2 * 0.5)).toFixed(1));
      ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#a5d8ff');
      ring.setAttribute('stroke-width', Math.max(1.2, jw * 0.18));
      svg.appendChild(ring);
      if (ring.animate) ring.animate(
        [{ opacity: 0, transform: 'scale(.3)', transformOrigin: ex + 'px ' + ey + 'px' },
         { opacity: 0.9, offset: 0.35, transformOrigin: ex + 'px ' + ey + 'px' },
         { opacity: 0, transform: 'scale(1.6)', transformOrigin: ex + 'px ' + ey + 'px' }],
        { duration: 480, delay: 240 + s2 * 90, easing: 'ease-out', fill: 'both' });
    }
    wrap.appendChild(host);

    /* shoot the jet nozzle-first (dashoffset L→0), hold, then fade it all */
    paths.forEach(function (p, idx) {
      var L = p.getTotalLength();
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
      if (p.animate) p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
        { duration: 240, delay: idx * 30, easing: 'ease-out', fill: 'forwards' });
      else p.style.strokeDashoffset = 0;
    });
    var kill = function () { if (host.parentNode) host.parentNode.removeChild(host); };
    if (host.animate) {
      host.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.66 }, { opacity: 0, offset: 1 }],
        { duration: 1050, easing: 'ease-in' }).onfinish = kill;
    } else {
      setTimeout(kill, 1050);
    }
  }

  /* ── hop: a springy double-bounce. Applied to the FLIP layer (.pksq-fl),
     which carries no animation of its own — composite:'add' (translateY)
     rides on top of the pk-flip scaleX(-1) without clobbering it, and
     stays clear of the root .pksq bounce + its counter-bouncing shadow. ── */
  function fireHop(wrap) {
    if (!wrap || wrap._acting) return;
    var fl = wrap.querySelector ? wrap.querySelector('.pksq-fl') : null;
    if (!fl || !fl.animate) return;
    wrap._acting = true;
    try {
      fl.animate(
        [{ transform: 'translateY(0px)', easing: 'ease-out' },
         { transform: 'translateY(-30px)', offset: 0.3, easing: 'ease-in' },
         { transform: 'translateY(0px)', offset: 0.55, easing: 'ease-out' },
         { transform: 'translateY(-12px)', offset: 0.76, easing: 'ease-in' },
         { transform: 'translateY(0px)' }],
        { duration: 720, composite: 'add' }).onfinish = function () { wrap._acting = false; };
    } catch (e) { wrap._acting = false; }
  }
  function fireAct(wrap) { fireHop(wrap); }

  /* ambient act scheduler — a random 7-15s heartbeat per instance */
  function scheduleActs(wrap, fire) {
    (function tick() {
      wrap._actT = setTimeout(function () {
        if (!doc.body || !doc.body.contains(wrap)) return;
        if (!wrap.classList.contains('pk-paused')) fire();
        tick();
      }, 7000 + Math.random() * 8000);
    })();
  }

  /* one document-level capture click handler hit-tests each Squirtle's LIVE
     box (robust while it animates) and fires its water gun, stopping the
     click from reaching the scene behind it. Skips the game/host UI. */
  var clickBound = false;
  function ensureClickHandler() {
    if (clickBound || typeof doc === 'undefined') return;
    clickBound = true;
    doc.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest(
        '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
      var list = doc.querySelectorAll('.pkw-sq');
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.width && e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          fireWater(list[i]);           // signature water-gun …
          fireAct(list[i]);             // … + a springy hop on the same click
          e.stopPropagation();
          return;
        }
      }
    }, true);
  }

  /* place() — drop a Squirtle into any positioned container */
  function place(opts) {
    opts = opts || {};
    var parent = opts.parent || doc.body;
    injectCSS();
    ensureClickHandler();

    var wrap = doc.createElement('div');
    wrap.className = 'pkw-sq' + (opts.flip ? ' pk-flip' : '') + (opts.paused ? ' pk-paused' : '');
    var css = 'height:' + (opts.height || '200px') + ';';
    if (opts.left != null) css += 'left:' + opts.left + ';';
    if (opts.right != null) css += 'right:' + opts.right + ';';
    if (opts.bottom != null) css += 'bottom:' + opts.bottom + ';';
    if (opts.top != null) css += 'top:' + opts.top + ';';
    if (opts.z != null) css += 'z-index:' + opts.z + ';';
    wrap.style.cssText = css;
    /* no house .pk-shadow — the pen ships its own counter-bouncing one */

    var flipL = doc.createElement('div');   // flip layer (see CSS note)
    flipL.className = 'pksq-fl';
    var fig = doc.createElement('div');
    fig.className = 'pksq';
    fig.innerHTML = HTML;
    flipL.appendChild(fig);
    wrap.appendChild(flipL);
    parent.appendChild(wrap);

    function refit() {
      var h = wrap.clientHeight || 200;
      fig.style.fontSize = (h / 20).toFixed(2) + 'px';   // 20em canvas → em scaling
      wrap.style.width = (h * NATIVE_W / NATIVE_H).toFixed(0) + 'px';
    }
    refit();

    /* ── patrol — walk the parent's width side to side forever ── */
    var patrolCtl = null;
    function patrol(popts) {
      popts = popts || {};
      if (patrolCtl) patrolCtl.stop();
      var stage = wrap.parentNode || doc.body;
      var speed = popts.speed || 130;                     // px/s
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
        /* face the ACTUAL travel direction (a figure placed beyond the edge
           target walks backwards to it on the first leg — dir alone lies) */
        api.setFlip(target > st.tx);                      // faces LEFT natively
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

    var api = {
      element: wrap,
      refit: refit,
      setFlip: function (b) { wrap.classList.toggle('pk-flip', b !== false); },
      setPaused: function (b) {
        wrap.classList.toggle('pk-paused', b !== false);
        if (patrolCtl) patrolCtl.setPaused(b);             // freeze the crossing too
      },
      /* water-gun jet from the mouth (also fired by clicking Squirtle) */
      water: function () { fireWater(wrap); },
      /* springy hop (also fires on click + on its own every ~7-15s) */
      hop: function () { fireHop(wrap); },
      act: function () { fireAct(wrap); },
      patrol: patrol,
      remove: function () {
        if (patrolCtl) patrolCtl.stop();
        clearTimeout(wrap._actT);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    };
    scheduleActs(wrap, function () { fireAct(wrap); });
    return api;
  }

  w.Pokemons = w.Pokemons || {};
  w.Pokemons.squirtle = {
    name: 'squirtle',
    dexId: 7,
    nativeW: NATIVE_W,
    nativeH: NATIVE_H,
    /* the foot line sits at ≈90% of the canvas height (measured 0.904) */
    footFrac: 0.90,
    place: place
  };
})(typeof window !== 'undefined' ? window : this);
