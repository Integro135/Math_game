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
   CLICK → WATER GUN: clicking Squirtle shoots a PRESSURIZED STREAM from its
   mouth that arcs under gravity and lands on the ground ahead of it (~1.75s,
   auto-removed; the overlay mirrors with .pk-flip so the jet always fires
   forward). Rewritten 2026-09: a mist puff at the lips and a recoil as it
   fires, the head of the stream racing out along a sampled parabola, then
   the stream HOLDING with a moving dashed sheen (the water visibly flows)
   and a pulsing core while spray peels off it, a splash at the impact point
   (foam blob, rings every ~150ms, droplets bouncing up, a wet patch on the
   sand), and finally the tail leaving the mouth with the last slug falling
   to the ground. Detected via a document capture-phase listener hit-testing
   the live box (game-UI filtered). inst.water() fires it on demand.
   ES5, file:// safe, no dependencies.
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NATIVE_W = 320, NATIVE_H = 320;   // the 20em×20em canvas at 16px

  var CSS = [
    '.pkw-sq{position:absolute;pointer-events:none;will-change:transform;direction:ltr}',   /* the pens assume LTR; the game is RTL */
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

  /* ── water gun: click Squirtle → a PRESSURIZED STREAM shoots from its
     mouth, arcs under gravity and lands on the SAND ahead of it, where it
     splashes (its water-type move). Pure SVG drawn in front of the figure on
     the wrapper (mirrored with pk-flip so it always leaves the mouth).
     Timeline (~1.75 s):
       0 ms    a puff of mist at the lips; Squirtle recoils a touch
       0–320   the HEAD of the stream races out along the arc (dashoffset)
       320–1000 the stream HOLDS: three layered strokes (translucent body,
               blue core, white highlight) with a moving dashed sheen so the
               water visibly flows, the core pulsing; SPRAY peels off along
               the stream and falls; at the impact point a foam blob, rings
               every ~130 ms and droplets bouncing up; a wet patch spreads
       1000–1380 the TAIL leaves the mouth — the last slug travels down the
               arc to the ground (dashoffset 0 → −L)
       1350–1750 everything fades and is removed.
     The arc is a sampled parabola (jetPath): lips → up a little → down to
     the ground line (footFrac 0.90), so the water truly falls. ── */
  var NSVG = 'http://www.w3.org/2000/svg';
  function jetPoint(ox, oy, R, drop, rise, u) {
    return [ox - R * u, oy + drop * u * u - rise * 4 * u * (1 - u)];
  }
  function jetPath(ox, oy, R, drop, rise) {
    var d = '', q;
    for (var i = 0; i <= 24; i++) { q = jetPoint(ox, oy, R, drop, rise, i / 24); d += (i ? ' L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); }
    return d;
  }
  function fireWater(wrap) {
    if (typeof doc === 'undefined' || !wrap || wrap._watering) return;
    wrap._watering = true;
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
    function mk(tag, attrs) {
      var e = doc.createElementNS(NSVG, tag);
      for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
      svg.appendChild(e); return e;
    }
    function centred(e) { e.style.transformBox = 'fill-box'; e.style.transformOrigin = '50% 50%'; return e; }
    function anim(e, kf, opts) { if (e.animate) { try { return e.animate(kf, opts); } catch (err) {} } return null; }

    var ox = W * 0.33, oy = Hh * 0.49;                    // the lips (left-facing figure)
    var gy = Hh * 0.90;                                   // the ground line under the feet
    var R = W * 1.05, drop = gy - oy, rise = Hh * 0.10;   // reach, fall, initial lift
    var jw = Math.max(4, W * 0.075);
    var d = jetPath(ox, oy, R, drop, rise);
    var end = jetPoint(ox, oy, R, drop, rise, 1);
    var T_HEAD = 320, T_TAIL = 1000, T_END = 1750;

    /* the wet patch spreading on the sand under the splash */
    var wet = centred(mk('ellipse', { cx: end[0].toFixed(1), cy: (end[1] + 1).toFixed(1), rx: (jw * 2.6).toFixed(1), ry: (jw * 0.7).toFixed(1), fill: 'rgba(50,100,130,0.30)' }));
    anim(wet, [{ transform: 'scale(.15)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.45 }, { transform: 'scale(1.2)', opacity: 0 }],
      { duration: T_END - T_HEAD, delay: T_HEAD, easing: 'ease-out', fill: 'both' });

    /* the stream: body, core, highlight + a moving dashed sheen */
    var layers = [
      { c: '#74c0fc', w: jw, o: 0.5 },
      { c: '#339af0', w: jw * 0.62, o: 0.92 },
      { c: '#e7f5ff', w: jw * 0.26, o: 1 }
    ];
    var paths = layers.map(function (l) {
      return mk('path', { d: d, fill: 'none', stroke: l.c, 'stroke-width': l.w.toFixed(2), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: l.o });
    });
    var sheen = mk('path', { d: d, fill: 'none', stroke: '#d0ebff', 'stroke-width': (jw * 0.34).toFixed(2), 'stroke-linecap': 'round', opacity: 0 });
    sheen.style.strokeDasharray = (jw * 1.2).toFixed(1) + ' ' + (jw * 2.4).toFixed(1);
    var L = paths[0].getTotalLength();
    paths.forEach(function (p, idx) {
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      /* the head races out … */
      anim(p, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: T_HEAD, delay: idx * 25, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
      /* … and the tail leaves the mouth, the slug falling to the ground */
      anim(p, [{ strokeDashoffset: 0 }, { strokeDashoffset: -L }], { duration: 380, delay: T_TAIL + idx * 20, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' });
    });
    /* the core pulses while the stream holds */
    anim(paths[1], [{ strokeWidth: (jw * 0.62).toFixed(2) + 'px' }, { strokeWidth: (jw * 0.72).toFixed(2) + 'px', offset: 0.5 }, { strokeWidth: (jw * 0.62).toFixed(2) + 'px' }],
      { duration: 170, delay: T_HEAD, iterations: 4, easing: 'ease-in-out' });
    /* the sheen: dashes sliding along the stream = the water flowing */
    anim(sheen, [{ opacity: 0 }, { opacity: 0.85, offset: 0.15 }, { opacity: 0.85, offset: 0.85 }, { opacity: 0 }], { duration: T_TAIL - 120, delay: 120, fill: 'both' });
    anim(sheen, [{ strokeDashoffset: 0 }, { strokeDashoffset: (-jw * 3.6 * 9).toFixed(1) }], { duration: T_TAIL, delay: 120, easing: 'linear', fill: 'forwards' });

    /* mist at the lips as it starts */
    for (var m = 0; m < 4; m++) {
      var puff = centred(mk('circle', { cx: (ox - jw * 0.4).toFixed(1), cy: (oy + (m - 1.5) * jw * 0.5).toFixed(1), r: (jw * 0.45).toFixed(1), fill: 'rgba(231,245,255,0.85)' }));
      anim(puff, [{ transform: 'translate(0,0) scale(.4)', opacity: 0.9 }, { transform: 'translate(' + (-jw * (1.2 + m * 0.5)).toFixed(1) + 'px,' + ((m - 1.5) * jw * 0.9).toFixed(1) + 'px) scale(1.6)', opacity: 0 }],
        { duration: 300 + m * 40, delay: m * 20, easing: 'ease-out', fill: 'both' });
    }

    /* spray peeling off the stream while it holds, falling under gravity */
    for (var i = 0; i < 16; i++) {
      var u = 0.2 + Math.random() * 0.72, q = jetPoint(ox, oy, R, drop, rise, u);
      var side = Math.random() < 0.5 ? -1 : 1;
      var drop_ = centred(mk('circle', { cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: (1.2 + Math.random() * 1.6).toFixed(1), fill: Math.random() < 0.5 ? '#74c0fc' : '#a5d8ff' }));
      var dx = -jw * (1.5 + Math.random() * 1.5), dy0 = side * jw * (0.5 + Math.random() * 0.8), dyf = jw * (2.2 + Math.random() * 1.8);
      anim(drop_, [
        { transform: 'translate(0,0)', opacity: 0 },
        { transform: 'translate(' + (dx * 0.45).toFixed(1) + 'px,' + dy0.toFixed(1) + 'px)', opacity: 1, offset: 0.3 },
        { transform: 'translate(' + dx.toFixed(1) + 'px,' + (dy0 + dyf).toFixed(1) + 'px)', opacity: 0 }],
        { duration: 420 + Math.random() * 160, delay: 220 + i * 46, easing: 'cubic-bezier(.3,.3,.7,1)', fill: 'both' });
    }

    /* the splash where it lands: a foam blob, rings, and droplets bouncing up */
    var foam = centred(mk('ellipse', { cx: end[0].toFixed(1), cy: (end[1] - jw * 0.25).toFixed(1), rx: (jw * 0.95).toFixed(1), ry: (jw * 0.6).toFixed(1), fill: 'rgba(240,250,255,0.9)' }));
    anim(foam, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.95, offset: 0.12 }, { transform: 'scale(1.15)', opacity: 0.95, offset: 0.5 }, { transform: 'scale(.95)', opacity: 0.95, offset: 0.8 }, { transform: 'scale(1.3)', opacity: 0 }],
      { duration: 1300, delay: T_HEAD - 40, easing: 'ease-out', fill: 'both' });
    for (var s2 = 0; s2 < 6; s2++) {
      var ring = centred(mk('ellipse', { cx: end[0].toFixed(1), cy: end[1].toFixed(1), rx: (jw * 1.5).toFixed(1), ry: (jw * 0.55).toFixed(1), fill: 'none', stroke: '#c5e8ff', 'stroke-width': Math.max(1.2, jw * 0.16).toFixed(2) }));
      anim(ring, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 0.9, offset: 0.3 }, { opacity: 0, transform: 'scale(1.9)' }],
        { duration: 460, delay: T_HEAD + s2 * 150, easing: 'ease-out', fill: 'both' });
    }
    for (var k = 0; k < 12; k++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = jw * (1.6 + Math.random() * 1.6);
      var bx = Math.cos(ang) * sp, by = Math.sin(ang) * sp;
      var bd = centred(mk('circle', { cx: end[0].toFixed(1), cy: end[1].toFixed(1), r: (1.3 + Math.random() * 1.7).toFixed(1), fill: k % 3 ? '#a5d8ff' : '#ffffff' }));
      anim(bd, [
        { transform: 'translate(0,0)', opacity: 0 },
        { transform: 'translate(' + (bx * 0.6).toFixed(1) + 'px,' + (by * 0.9).toFixed(1) + 'px)', opacity: 1, offset: 0.35 },
        { transform: 'translate(' + bx.toFixed(1) + 'px,' + (Math.abs(by) * 0.4 + jw * 0.3).toFixed(1) + 'px)', opacity: 0 }],
        { duration: 380 + Math.random() * 120, delay: T_HEAD + 60 + k * 75, easing: 'cubic-bezier(.3,.4,.6,1)', fill: 'both' });
    }

    wrap.appendChild(host);

    /* the recoil: Squirtle rocks back as the jet leaves (additive, on the flip
       layer — the same layer the hop uses, so the two simply combine) */
    var fl = wrap.querySelector ? wrap.querySelector('.pksq-fl') : null;
    if (fl && fl.animate) {
      try {
        fl.animate([{ transform: 'translateX(0px)' }, { transform: 'translateX(' + (W * 0.045).toFixed(1) + 'px) rotate(-3deg)', offset: 0.18 }, { transform: 'translateX(' + (W * 0.02).toFixed(1) + 'px) rotate(-1.5deg)', offset: 0.6 }, { transform: 'translateX(0px) rotate(0deg)' }],
          { duration: T_TAIL + 380, easing: 'ease-out', composite: 'add' });
      } catch (e) {}
    }

    var kill = function () { if (host.parentNode) host.parentNode.removeChild(host); wrap._watering = false; };
    if (host.animate) {
      host.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.77 }, { opacity: 0, offset: 1 }],
        { duration: T_END, easing: 'ease-in' }).onfinish = kill;
    } else {
      setTimeout(kill, T_END);
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
