/* =====================================================================
   bulbasaur.js — BULBASAUR (#001) as a drop-in BACKGROUND CHARACTER.
   ---------------------------------------------------------------------
   Extracted from backgrounds/pokemons/balbasaur.html — the pure-CSS pen
   "walking Bulbasaur forest". ONLY the creature (+ its walk) is taken;
   the pen's forest/trees/shrubs/sparkles chrome and the marquee row of
   clones are dropped. The SCSS was hand compiled to plain CSS: the
   $vars + darken() are resolved —
       body   #56ddff              (the pen's SHINY-CYAN Bulbasaur)
       spot   #00abd6 = darken(body,25%)     eyelid uses the same
       spot2  #0082a3 = darken(spot,10%)     (hind legs)
       bulb   #009682              bulb-dark #006356 = darken(bulb,10%)
       eye-rim #295980   mouth #0c506b = darken(#117299,10%)   pupil #df005d
   The div rig is kept 1:1; the pen's scene-placement (top:293/right:35)
   is dropped and the 60×50 sprite re-anchored inside a NATIVE_W×NATIVE_H
   canvas. ALL selectors are scoped under .pkbulb and every keyframe is
   prefixed pkbulb* so nothing collides with a host page. The figure uses
   content-box (the pen's default) even if the host sets border-box.

   MOTION: the pen's six always-on 1.5s loops ARE the gait — legs +
   hind-legs step (staggered .5/.8/1s), the body bounces, the head + ears
   + back-bulb bob. Placed alone it marches in place; under patrol() the
   same gait sells the trot as the wrapper carries it across.

   THE POKEMON-OBJECT PATTERN (one file per pokemon, shared registry —
   mirrors eevee.js):
       window.Pokemons.bulbasaur = {
         name, dexId, nativeW, nativeH, footFrac,
         place({parent, height, left, right, bottom, top, z,
                flip, shadow, paused}) → instance
       }
       instance = { element,            // the positioning wrapper
                    refit(),            // re-scale after a resize
                    setFlip(bool),      // faces LEFT natively
                    setPaused(bool),    // freeze/resume the gait
                    roots(),            // burst of green roots (see below)
                    patrol(opts),       // WALK side to side of the parent
                    remove() }
   CLICK → ROOTS: clicking Bulbasaur makes green roots/vines GROW out of
   the ground around it (grass-type) — smooth wobbly SVG tendrils revealed
   tip-first via stroke-dashoffset, dark stroke + light core, a leaf pops
   at each tip, then the burst fades (~1.5s, auto-removed). Detected via a
   document capture-phase listener that hit-tests the live bounding box
   (with the game-UI filter). inst.roots() fires it on demand.
   patrol({speed:px/s, edgePad, pauseMs:[min,max]}) walks the parent's
   full width edge-to-edge forever: a linear WAAPI translateX on the
   wrapper carries the figure while the rig's own gait keyframes sell the
   step; at each edge it pauses a beat, turns (setFlip to face travel)
   and heads back. Returns {stop, setPaused}; one patrol per instance
   (restarting replaces the previous one).
   place() injects the CSS once (style#pokemon-bulbasaur-css), builds
   wrapper(.pkw-bulb) > scale-layer(.pkbulb-sc) > figure(.pkbulb), scales
   the canvas to the wrapper height and sets the wrapper width. The paw
   line sits ~footFrac of the canvas height — nudge `bottom` to ground it.
   ES5, file:// safe, no dependencies.
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NATIVE_W = 110, NATIVE_H = 140;

  var CSS = [
    /* ── wrapper / scale plumbing (house sprite pattern) ── */
    '.pkw-bulb{position:absolute;pointer-events:none;will-change:transform}',
    '.pkw-bulb .pkbulb-sc{position:absolute;left:0;bottom:0;transform-origin:0 100%}',
    '.pkw-bulb .pk-shadow{position:absolute;left:50%;bottom:0;width:62%;height:5%;transform:translateX(-50%);',
    '  border-radius:50%;background:radial-gradient(ellipse,rgba(15,25,20,.30),transparent 70%)}',
    '.pkw-bulb.pk-flip .pkbulb{transform:scaleX(-1)}',
    /* deep :nth-child selectors below outrank a plain descendant pause rule, so
       !important is needed to actually freeze the gait when .pk-paused is set */
    '.pkw-bulb.pk-paused .pkbulb,.pkw-bulb.pk-paused .pkbulb *,',
    '.pkw-bulb.pk-paused .pkbulb *::before,.pkw-bulb.pk-paused .pkbulb *::after{animation-play-state:paused!important}',

    /* ── the figure canvas — pen globals reproduced LOCALLY: everything
          inside is absolute + content-box (pseudos set their own pos) ── */
    '.pkbulb{position:relative;height:' + NATIVE_H + 'px;width:' + NATIVE_W + 'px}',
    '.pkbulb *{position:absolute;box-sizing:content-box}',
    '.pkbulb *::before,.pkbulb *::after{box-sizing:content-box}',

    /* ── bulbasaur sprite, re-anchored inside the canvas (was top:293/right:35).
          bottom:-30px drops the rig so its VISIBLE legs land ON the canvas
          floor (footFrac≈1.0, like pikachu/jigglypuff) — the pen leaves a big
          empty gap below the feet inside the 50px sprite box; at -18px it still
          floated ~20px above its own shadow, so the extra 12px grounds it. ── */
    '.pkbulb .bulbasaur{position:absolute;left:38px;bottom:-30px;width:60px;height:50px;',
    '  transform:rotate(-6deg);will-change:transform}',

    /* bulbs (the plant on the back) */
    '.pkbulb .bulbasaur .bulbs{left:-10px;top:-8px;transform:rotate(15deg);z-index:2;animation:pkbulbBulb 1.5s infinite}',
    '.pkbulb .bulbasaur .bulbs::before{content:"";position:absolute;width:38px;height:38px;background:#006356;',
    '  border-bottom-left-radius:100%;border-bottom-right-radius:100%;border-top-left-radius:100%;',
    '  right:20px;bottom:30px;left:15px;transform:rotate(-20deg);z-index:3}',
    '.pkbulb .bulbasaur .bulbs::after{content:"";position:absolute;width:35px;height:35px;background:#006356;',
    '  border-bottom-left-radius:100%;border-bottom-right-radius:100%;border-top-right-radius:100%;',
    '  left:40px;bottom:30px;transform:rotate(45deg);z-index:2}',
    '.pkbulb .bulbasaur .bulb{width:40px;height:40px;background:#009682;bottom:30px;left:25px;',
    '  border-bottom-left-radius:100%;border-bottom-right-radius:100%;border-top-left-radius:100%;',
    '  transform:rotate(-35deg);z-index:3}',

    /* body */
    '.pkbulb .bulbasaur .body{position:relative;width:105%;height:100%;bottom:35px;overflow:hidden;',
    '  border-radius:39% 61% 31% 69% / 54% 41% 59% 46%;background:#56ddff;animation:pkbulbBody 1.5s infinite}',
    '.pkbulb .bulbasaur .body .spot{width:8px;height:8px;background:#00abd6;right:-5px;top:15px;',
    '  border-radius:20% / 60%;transform:skew(5deg)}',

    /* head */
    '.pkbulb .bulbasaur .head{width:55px;height:50px;background:#56ddff;bottom:45px;right:30px;z-index:3;overflow:hidden;',
    '  border-radius:51% 49% 20% 80% / 67% 18% 82% 33%;animation:pkbulbHead 1.5s infinite}',
    '.pkbulb .bulbasaur .head .spot::before,.pkbulb .bulbasaur .head .spot::after{content:"";position:absolute;background:#00abd6}',
    '.pkbulb .bulbasaur .head .spot::before{width:8px;height:8px;left:7px;top:5px;transform:rotate(30deg);border-radius:40% 20% / 50% 60%}',
    '.pkbulb .bulbasaur .head .spot::after{width:5px;height:4px;left:2px;top:15px;transform:rotate(50deg);border-radius:40% 20% / 50% 60%}',
    /* blink (added): the eye squashes shut on a 4.3s loop. The static
       rotate(5deg) is baked into the keyframe so scaleY doesn\'t clobber it. */
    '.pkbulb .bulbasaur .head .eye{width:14px;height:16px;background:#fff;overflow:hidden;left:15px;top:13px;',
    '  border-radius:88% 12% 11% 89% / 83% 47% 53% 17%;transform:rotate(5deg);border:1px solid #295980;',
    '  transform-origin:50% 10%;animation:pkbulbBlink 4.3s ease-in-out infinite}',
    /* the red pupil is a SOLID fill (was a radial-gradient(#df005d 100%,transparent)
       — that edge-case stop rasterised as transparent on some tablet/mobile GPUs, so
       the eye lost its red there; a plain background-color is device-robust). The
       white glint stays as an explicit-sized gradient overlay on top. */
    '.pkbulb .bulbasaur .head .eye .pupil{width:12px;height:15px;border-radius:100%;left:-2px;background-color:#df005d;',
    '  background-image:radial-gradient(1px 5px at center,#fff 100%,transparent)}',
    '.pkbulb .bulbasaur .head .eye-lid{width:1px;height:8px;background:#00abd6;border-radius:100px;left:22px;top:8px;transform:rotate(60deg)}',
    '.pkbulb .bulbasaur .head .smile{width:10px;height:6px;border-radius:100%;border-top:1px solid #0c506b;top:32px;left:-2px;transform:rotate(5deg)}',
    '.pkbulb .bulbasaur .head .smile::after{content:"";position:absolute;width:15px;height:6px;border-radius:100%;',
    '  border-bottom:1px solid #0c506b;top:-5px;left:6px}',

    /* ears */
    '.pkbulb .bulbasaur .ears{width:20px;height:20px;background:#56ddff;bottom:76px;left:15px;z-index:3;',
    '  border-radius:88% 12% 8% 92% / 91% 94% 6% 9%;transform:rotate(260deg);animation:pkbulbEar 1.5s infinite}',

    /* front legs */
    '.pkbulb .bulbasaur .legs{width:100%;height:100%;bottom:15%}',
    '.pkbulb .bulbasaur .legs .leg{width:20px;height:22px;background:#56ddff;border-radius:10% 10% 28% 32% / 0% 0% 53% 60%}',
    '.pkbulb .bulbasaur .legs .leg:nth-child(1){left:-5px;animation:pkbulbLeg 1.5s ease infinite}',
    '.pkbulb .bulbasaur .legs .leg:nth-child(1) .spot{width:7px;height:6px;top:10px;left:4px;z-index:10;',
    '  background:#00abd6;border-radius:20% / 30%;transform:skewY(-35deg)}',
    '.pkbulb .bulbasaur .legs .leg:nth-child(2){bottom:45%;left:30px;animation:pkbulbLeg 1.5s 0.5s infinite}',
    '.pkbulb .bulbasaur .legs .leg:nth-child(2) .spot{width:12px;height:10px;background:#00abd6;top:5px;left:4px;',
    '  border-radius:35% 21% 50% 43% / 54% 60% 70% 60%;transform:skewY(-20deg) skewX(10deg)}',

    /* hind legs (behind the body) */
    '.pkbulb .bulbasaur .hind-legs{width:100%;height:100%;bottom:17%}',
    '.pkbulb .bulbasaur .hind-legs .leg{background:#0082a3;width:20px;height:22px;',
    '  border-radius:10% 10% 28% 32% / 0% 0% 53% 60%;z-index:-2}',
    '.pkbulb .bulbasaur .hind-legs .leg:nth-child(1){animation:pkbulbHindLeg 1.5s 0.8s infinite}',
    '.pkbulb .bulbasaur .hind-legs .leg:nth-child(2){left:32px;bottom:45%;animation:pkbulbHindLeg 1.5s 1s infinite}',

    /* body spots (over the body) */
    '.pkbulb .bulbasaur .spots{width:100%;height:100%;bottom:100%;z-index:3}',
    '.pkbulb .bulbasaur .spots .spot{background:#00abd6}',
    '.pkbulb .bulbasaur .spots .spot:nth-child(1){width:18px;height:12px;left:30px;top:28px;transform:rotate(-5deg);',
    '  border-radius:30% 72% 90% 40% / 40% 78% 51% 60%}',
    '.pkbulb .bulbasaur .spots .spot:nth-child(2){width:5px;height:3px;left:45px;top:40px;',
    '  border-radius:30% 80% 50% 40% / 45% 20% 20% 60%;transform:skew(10deg)}',

    /* ══ the always-on gait loops (namespaced) ══ */
    '@keyframes pkbulbLeg{0%{transform:rotate(20deg)}50%{transform:rotate(-20deg)}',
    ' 80%{transform:rotate(0deg) translateY(-1px)}100%{transform:rotate(20deg)}}',
    '@keyframes pkbulbHindLeg{0%{transform:rotate(25deg)}50%{transform:rotate(-25deg)}',
    ' 80%{transform:rotate(0deg) translateY(-1px)}100%{transform:rotate(25deg)}}',
    '@keyframes pkbulbBody{50%{transform:rotate(2deg) translateX(-1px)}}',
    '@keyframes pkbulbHead{50%{transform:rotate(-2deg) translateX(-1px)}}',
    '@keyframes pkbulbEar{50%{transform:rotate(265deg) translateX(-1px) translateY(-1px)}}',
    '@keyframes pkbulbBulb{50%{transform:rotate(16deg) translateY(0.5px)}}',
    '@keyframes pkbulbBlink{0%,92%,100%{transform:rotate(5deg) scaleY(1)}95%{transform:rotate(5deg) scaleY(.1)}98%{transform:rotate(5deg) scaleY(1)}}'
  ].join('\n');

  /* ── the div rig — 1:1 with the pen (one Bulbasaur instance) ── */
  var HTML =
    '<div class="bulbasaur">' +
      '<div class="bulbs"><div class="bulb"></div></div>' +
      '<div class="body"><div class="spot"></div></div>' +
      '<div class="head">' +
        '<div class="eye"><div class="pupil"></div></div>' +
        '<div class="eye-lid"></div>' +
        '<div class="smile"></div>' +
        '<div class="spot"></div>' +
      '</div>' +
      '<div class="ears"></div>' +
      '<div class="hind-legs"><div class="leg"></div><div class="leg"></div></div>' +
      '<div class="legs">' +
        '<div class="leg"><div class="spot"></div></div>' +
        '<div class="leg"><div class="spot"></div></div>' +
      '</div>' +
      '<div class="spots">' +
        '<div class="spot"></div><div class="spot"></div><div class="spot"></div>' +
        '<div class="spot"></div><div class="spot"></div>' +
      '</div>' +
    '</div>';

  function injectCSS() {
    if (doc.getElementById('pokemon-bulbasaur-css')) return;
    var s = doc.createElement('style');
    s.id = 'pokemon-bulbasaur-css';
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  /* ── roots: click Bulbasaur → green roots/vines GROW out of the ground
     around it (its grass-type move). Pure SVG drawn in front of the figure
     on the wrapper's own px canvas, so it works in ANY host. Each tendril
     is a smooth wobbly path revealed tip-first via stroke-dashoffset, with
     a small leaf popping open at the tip; the whole burst fades out. ── */
  var NSVG = 'http://www.w3.org/2000/svg';
  /* a smooth curvy tendril from (ox,oy): heads along (ax,ay), wobbling
     sideways like a creeping root, drawn as a fine polyline (round joins) */
  function tendrilPath(ox, oy, ax, ay, len, wob) {
    var px = -ay, py = ax, segs = 14, pts = [];
    var ph = Math.random() * Math.PI * 2, curl = (Math.random() - 0.5) * 0.9;
    for (var i = 0; i <= segs; i++) {
      var f = i / segs;
      var w = Math.sin(f * Math.PI * 2.2 + ph) * wob * f;          // wobble grows outward
      var bend = curl * f * f * len * 0.35;                         // gentle overall curl
      pts.push((ox + ax * len * f + px * (w + bend)).toFixed(1) + ',' +
               (oy + ay * len * f + py * (w + bend)).toFixed(1));
    }
    return { d: 'M' + pts.join(' L'), tip: pts[segs] };
  }
  function fireRoots(wrap) {
    if (typeof doc === 'undefined' || !wrap) return;
    var r = wrap.getBoundingClientRect();
    var W = Math.round(r.width) || 150, Hh = Math.round(r.height) || 200;

    var host = doc.createElement('div');
    host.className = 'pk-roots';
    host.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;' +
      'overflow:visible;pointer-events:none;z-index:6;';
    var svg = doc.createElementNS(NSVG, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;';
    host.appendChild(svg);

    var ox = W * 0.5, oy = Hh * 0.93;                     // the ground under its feet
    var maxLen = Math.max(W, Hh) * 0.55;
    var baseW = Math.max(2.2, maxLen * 0.045);
    /* mostly outward along the ground, a few rearing up */
    var dirs = [[-1, -0.06], [1, -0.06], [-0.85, -0.4], [0.85, -0.4], [-0.45, -0.75], [0.45, -0.75], [-1, -0.2], [1, -0.2]];
    var strokes = [];
    for (var k = 0; k < dirs.length; k++) {
      var ax = dirs[k][0], ay = dirs[k][1];
      var n = Math.sqrt(ax * ax + ay * ay); ax /= n; ay /= n;
      var len = maxLen * (0.6 + Math.random() * 0.5);
      var t = tendrilPath(ox, oy, ax, ay, len, maxLen * 0.09);
      var glow = doc.createElementNS(NSVG, 'path');
      glow.setAttribute('d', t.d); glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', '#2b8a3e'); glow.setAttribute('stroke-width', baseW);
      glow.setAttribute('stroke-linecap', 'round'); glow.setAttribute('stroke-linejoin', 'round');
      var core = glow.cloneNode(false);
      core.setAttribute('stroke', '#69db7c'); core.setAttribute('stroke-width', Math.max(1.2, baseW * 0.45));
      svg.appendChild(glow); svg.appendChild(core);
      /* a little leaf that pops open at the tip */
      var xy = t.tip.split(','), leaf = doc.createElementNS(NSVG, 'ellipse');
      leaf.setAttribute('cx', xy[0]); leaf.setAttribute('cy', xy[1]);
      leaf.setAttribute('rx', (baseW * 2.2).toFixed(1)); leaf.setAttribute('ry', (baseW * 1.1).toFixed(1));
      leaf.setAttribute('fill', '#40c057');
      leaf.setAttribute('transform', 'rotate(' + Math.round(Math.atan2(ay, ax) * 180 / Math.PI) + ' ' + xy[0] + ' ' + xy[1] + ')');
      svg.appendChild(leaf);
      strokes.push({ glow: glow, core: core, leaf: leaf, delay: k * 45 });
    }
    wrap.appendChild(host);

    /* grow each tendril tip-first (dashoffset L→0), pop its leaf, then fade */
    strokes.forEach(function (s) {
      var L = s.glow.getTotalLength();
      [s.glow, s.core].forEach(function (p) {
        p.style.strokeDasharray = L;
        p.style.strokeDashoffset = L;
        if (p.animate) p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
          { duration: 480, delay: s.delay, easing: 'ease-out', fill: 'forwards' });
        else p.style.strokeDashoffset = 0;
      });
      if (s.leaf.animate) s.leaf.animate(
        [{ opacity: 0, transform: (s.leaf.getAttribute('transform') || '') + ' scale(0)' },
         { opacity: 1, transform: (s.leaf.getAttribute('transform') || '') + ' scale(1)' }],
        { duration: 240, delay: s.delay + 380, easing: 'ease-out', fill: 'both' });
    });
    var kill = function () { if (host.parentNode) host.parentNode.removeChild(host); };
    if (host.animate) {
      host.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.62 }, { opacity: 0, offset: 1 }],
        { duration: 1500, easing: 'ease-in' }).onfinish = kill;
    } else {
      setTimeout(kill, 1500);
    }
  }

  /* ── hop: a happy little jump with a wobble, while the back-bulb PULSES
     (a photosynthesis burp). Fired on a random ambient timer AND via
     inst.hop(). WAAPI composite:'add' rides on top of the figure's static
     transforms (pk-flip scaleX, the bulb's rotate) without clobbering. ── */
  function fireHop(wrap) {
    if (!wrap || wrap._acting) return;
    var fig = wrap.querySelector ? wrap.querySelector('.pkbulb') : null;
    if (!fig || !fig.animate) return;
    wrap._acting = true;
    var anim;
    try {
      anim = fig.animate(
        [{ transform: 'translateY(0px) rotate(0deg)' },
         { transform: 'translateY(-16px) rotate(-4deg)', offset: 0.4 },
         { transform: 'translateY(0px) rotate(2deg)', offset: 0.8 },
         { transform: 'translateY(0px) rotate(0deg)' }],
        { duration: 620, easing: 'ease-out', composite: 'add' });
      var bulb = wrap.querySelector('.bulb');
      if (bulb && bulb.animate) bulb.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.45 }, { transform: 'scale(1)' }],
        { duration: 620, easing: 'ease-in-out', composite: 'add' });
    } catch (e) { wrap._acting = false; return; }
    anim.onfinish = function () { wrap._acting = false; };
  }

  /* ── spin: an eased 360° somersault (composite:'add', like hop). ── */
  function fireSpin(wrap) {
    if (!wrap || wrap._acting) return;
    var fig = wrap.querySelector ? wrap.querySelector('.pkbulb') : null;
    if (!fig || !fig.animate) return;
    wrap._acting = true;
    try {
      fig.animate(
        [{ transform: 'rotate(0deg) translateY(0px)' },
         { transform: 'rotate(180deg) translateY(-18px)', offset: 0.5 },
         { transform: 'rotate(360deg) translateY(0px)' }],
        { duration: 820, easing: 'cubic-bezier(.45,.05,.55,.95)', composite: 'add' })
        .onfinish = function () { wrap._acting = false; };
    } catch (e) { wrap._acting = false; }
  }

  /* pick a random discrete act — used by the timer AND on click */
  function fireAct(wrap) { (Math.random() < 0.5 ? fireHop : fireSpin)(wrap); }

  /* ambient act scheduler — a random 7-16s heartbeat per instance */
  function scheduleActs(wrap, fire) {
    (function tick() {
      wrap._actT = setTimeout(function () {
        if (!doc.body || !doc.body.contains(wrap)) return;   // removed — stop
        if (!wrap.classList.contains('pk-paused')) fire();
        tick();
      }, 7000 + Math.random() * 9000);
    })();
  }

  /* one document-level capture click handler hit-tests each Bulbasaur's LIVE
     box (robust while it animates) and fires its roots, stopping the click
     from reaching the scene behind it. Skips the game/host UI. */
  var clickBound = false;
  function ensureClickHandler() {
    if (clickBound || typeof doc === 'undefined') return;
    clickBound = true;
    doc.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest(
        '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
      var list = doc.querySelectorAll('.pkw-bulb');
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.width && e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          fireRoots(list[i]);           // signature root burst …
          fireAct(list[i]);             // … + a lively body act on the same click
          e.stopPropagation();
          return;
        }
      }
    }, true);
  }

  /* place() — drop a Bulbasaur into any positioned container */
  function place(opts) {
    opts = opts || {};
    var parent = opts.parent || doc.body;
    injectCSS();
    ensureClickHandler();

    var wrap = doc.createElement('div');
    wrap.className = 'pkw-bulb' + (opts.flip ? ' pk-flip' : '') + (opts.paused ? ' pk-paused' : '');
    var css = 'height:' + (opts.height || '200px') + ';';
    if (opts.left != null) css += 'left:' + opts.left + ';';
    if (opts.right != null) css += 'right:' + opts.right + ';';
    if (opts.bottom != null) css += 'bottom:' + opts.bottom + ';';
    if (opts.top != null) css += 'top:' + opts.top + ';';
    if (opts.z != null) css += 'z-index:' + opts.z + ';';
    wrap.style.cssText = css;

    if (opts.shadow !== false) {
      var sh = doc.createElement('div');
      sh.className = 'pk-shadow';
      wrap.appendChild(sh);
    }
    var sc = doc.createElement('div');
    sc.className = 'pkbulb-sc';
    var fig = doc.createElement('div');
    fig.className = 'pkbulb';
    fig.innerHTML = HTML;
    sc.appendChild(fig);
    wrap.appendChild(sc);
    parent.appendChild(wrap);

    function refit() {
      var h = wrap.clientHeight || 200;
      var s = h / NATIVE_H;
      sc.style.transform = 'scale(' + s.toFixed(4) + ')';
      wrap.style.width = (NATIVE_W * s).toFixed(0) + 'px';
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
        api.setFlip(target > st.tx);                      // face ACTUAL travel dir (robust if placed past the edge)
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
      /* burst of green roots (also fired by clicking Bulbasaur) */
      roots: function () { fireRoots(wrap); },
      /* body acts — also fire on click + on their own every ~7-16s */
      hop: function () { fireHop(wrap); },
      spin: function () { fireSpin(wrap); },
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
  w.Pokemons.bulbasaur = {
    name: 'bulbasaur',
    dexId: 1,
    nativeW: NATIVE_W,
    nativeH: NATIVE_H,
    /* the paw line now sits at ≈100% of the wrapper height — feet re-anchored
       ONTO the canvas floor via .bulbasaur bottom:-30px (was 0.92 @ -18px,
       which floated ~20px above the shadow); matches pikachu/jigglypuff */
    footFrac: 1.0,
    place: place
  };
})(typeof window !== 'undefined' ? window : this);
