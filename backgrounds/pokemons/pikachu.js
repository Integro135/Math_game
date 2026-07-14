/* =====================================================================
   pikachu.js — PIKACHU (#25) as a drop-in BACKGROUND CHARACTER.
   ---------------------------------------------------------------------
   Extracted from backgrounds/pokemons/picachu.html — an Inkscape SVG
   (viewBox 1920×1080) animated with SMIL <animateTransform>: the body
   group bobs (translate 0→10→0), the zigzag tail wags (rotate −10°
   about its base) and both ears flick (−13°/−10°), all on one shared
   1.5s loop. The two pairs of legs are OUTSIDE the bobbing group on
   purpose (far pair drawn behind the body, near pair in front), so the
   feet stay planted while the body bounces. Kept 1:1, minus the XML
   prolog / Inkscape+RDF metadata / empty groups; the viewBox is CROPPED
   from the huge page canvas to the figure (660 130 820 690 — with
   headroom for the tail-wag sweep). No ids/defs remain, so any number
   of instances can coexist.

   NOTE (vs the CSS-art pokemons): the rig animation is SMIL, so
   pause/seek go through the SVG API — setPaused uses
   svg.pauseAnimations()/unpauseAnimations(), and a pose can be frozen
   via svg.setCurrentTime(seconds) (the loop is 1.5s long).

   THE POKEMON-OBJECT PATTERN (same registry as eevee.js):
       window.Pokemons.pikachu = {
         name, dexId, nativeW: 820, nativeH: 690, footFrac,
         place({parent, height, left, right, bottom, top, z,
                flip, shadow, paused}) → instance
       }
       instance = { element, refit(), setFlip(bool), setPaused(bool),
                    seek(seconds), setWalking(bool), zap(), patrol(opts),
                    remove() }
   CLICK → LIGHTNING: clicking Pikachu bursts electric-yellow bolts out of
   it (a document capture-phase listener hit-tests the live box; fireLightning
   draws jagged SVG bolts + forks + an origin flash in front of the figure,
   ~0.6s, then removes them). inst.zap() fires the same burst on demand.
   patrol({speed:px/s, edgePad, pauseMs:[min,max]}) walks the parent's
   full width side to side forever, flipping at each edge to face the
   travel direction. Faces LEFT natively → flip mirrors to face right.

   WALK GAIT: while patrolling, the four legs STEP — each swings about
   its own hip (CSS keyframes gated by the pk-walk wrapper class, which
   patrol adds while moving and drops at edge pauses/stops). Diagonal
   pairs (front-far+rear-near / front-near+rear-far) swing forward
   together like a real trot, lifting slightly on the forward pass; the
   cadence (--pk-step) is derived from the walking speed (~one cycle
   per 60px). setWalking(bool) drives it manually when not patrolling.
   ES5, file:// safe, no dependencies.
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NATIVE_W = 820, NATIVE_H = 690;   // the cropped viewBox

  var CSS = [
    '.pkw-pi{position:absolute;pointer-events:none;will-change:transform}',
    '.pkw-pi svg{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;display:block}',
    '.pkw-pi .pk-shadow{position:absolute;left:50%;bottom:0;width:70%;height:6%;transform:translateX(-50%);',
    '  border-radius:50%;background:radial-gradient(ellipse,rgba(15,25,20,.32),transparent 70%)}',
    '.pkw-pi.pk-flip svg{transform:scaleX(-1)}',

    /* ── walk gait (ON only while the pk-walk class rides the wrapper —
          patrol adds it while moving, drops it at edge pauses/stop).
          Each leg swings about its own HIP (top of the limb, fill-box
          origin); diagonal pairs step in opposite phase (a trot):
          front-far + rear-near ↔ front-near + rear-far. The cadence
          (--pk-step) is set by patrol from the walking speed. ── */
    '.pkw-pi svg .pk-legFf,.pkw-pi svg .pk-legFn{transform-box:fill-box;transform-origin:55% 8%}',
    '.pkw-pi svg .pk-legRf,.pkw-pi svg .pk-legRn{transform-box:fill-box;transform-origin:40% 10%}',
    '.pkw-pi.pk-walk svg .pk-legFf{animation:pkpiStepA var(--pk-step,.5s) ease-in-out infinite}',
    '.pkw-pi.pk-walk svg .pk-legRn{animation:pkpiStepRA var(--pk-step,.5s) ease-in-out infinite}',
    '.pkw-pi.pk-walk svg .pk-legFn{animation:pkpiStepB var(--pk-step,.5s) ease-in-out infinite}',
    '.pkw-pi.pk-walk svg .pk-legRf{animation:pkpiStepRB var(--pk-step,.5s) ease-in-out infinite}',
    /* front legs: fore-aft hip swing, lifted during the forward pass
       (negative rotate = paw swings forward on the left-facing profile) */
    '@keyframes pkpiStepA{0%,100%{transform:rotate(11deg)}50%{transform:rotate(-11deg) translateY(-6px)}}',
    '@keyframes pkpiStepB{0%,100%{transform:rotate(-11deg) translateY(-6px)}50%{transform:rotate(11deg)}}',
    /* rear legs: stockier, shorter swing — phased so the DIAGONAL pairs
       (Ff+Rn / Fn+Rf) swing forward together like a real trot */
    '@keyframes pkpiStepRA{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-8deg) translateY(-4px)}}',
    '@keyframes pkpiStepRB{0%,100%{transform:rotate(-8deg) translateY(-4px)}50%{transform:rotate(8deg)}}'
  ].join('\n');

  /* the cleaned SVG — groups relabelled with classes, ids dropped */
  var SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="660 130 820 690" preserveAspectRatio="xMidYMid meet">',

    /* far legs — drawn BEHIND the bobbing body; planted when idle, they
       swing about the hip (pk-walk gait) while patrolling */
    '<path class="pk-legFf" fill="#F0CF48" d="M797,771c3.8-4.8,11.1-11.4,11.5-13c0,0,69.7-54.4,54.5-109.8c-7.5-27.2-22.8-33-36.2-31.9  c-14.3,1.1-26.8,10.2-33,23.1c-7.3,15.2-19.3,45-34.6,100c0,0-2.2,13-4.5,15.9l-6.8,11.4c-0.4,5.7,4.1,10.5,9.7,10.6l15.5,1.2  C778.5,778.6,793.5,775.3,797,771z"/>',
    '<path class="pk-legRf" fill="#F0CF48" d="M1007.6,582.9c0,0,33.4-31.4,61.9,2.9c44.5,53.4,16.1,95.6,15.5,107.7c-0.6,12.1,6.7,0.7,12.4,10.4  c11.8,20.1-44.4,51.3-66.7,67.1c-11.9,8.4-19.1,4.8-37.5,5.5c-2.4,0.1-8.4-7.3-7.5-9.5c5.1-12.8,16,5.3,49.8-35.4  C992,749.1,936.8,655,1007.6,582.9z"/>',

    /* the BODY group — everything inside bobs on the shared 1.5s beat */
    '<g class="pk-body">',

    /* tail — the zigzag lightning bolt, wagging about its base */
    '<g class="pk-tail">',
    '<path fill="#f0cf48" d="m 1353.9,483.6 -90,10.9 3.3,22.9 5.5,37.7 -60,-2.7 8.9,29.3 -51.1,-6.1 -8.9,-22.5 36.8,9.5 -10.9,-36.8 48.4,5.5 -6.8,-17.3 -19.1,-48.2 77.7,-8.2 -70.2,-105 c 0,0 206.5,-175.8 232.4,-178.6 0,0 27.9,134.3 28.6,158.1 l -149.3,70.2 z"/>',
    '<polygon fill="#ba692d" points="1236,531.3 1229.2,514 1232.6,518.3 1232.6,499.9 1244.2,519.7 1243.5,499.9 1255.1,520.4 1255.1,504.7 1265.3,522.4 1267.3,517.4 1272.8,555.1 1212.9,552.4 1221.7,581.7 1170.6,575.6 1161.7,553.1 1198.5,562.6 1187.6,525.8"/>',
    '<animateTransform attributeName="transform" type="rotate" values="0 1159.3 565.9;-10 1159.3 565.9;0 1159.3 565.9" begin="0s" dur="1.5s" repeatCount="indefinite"/>',
    '</g>',

    /* torso + face details */
    '<path fill="#f0cf48" d="m 1178.8,683 c -37,69 -103.6,42.5 -103.6,42.5 C 1009.8,694.1 928,685.3 928,685.3 814.9,679.8 752.8,658.7 752.8,658.7 c -66.6,-24.1 -71.1,-79.8 -70.7,-99 0.1,-4.2 0.5,-6.6 0.5,-6.6 0,0 4.7,0 8.9,-1.9 1.8,-0.8 3.5,-1.9 4.7,-3.6 4.1,-5.5 8.9,-15.7 8.9,-22.5 L 717.4,491 c 25.2,-45.7 84.3,-41.8 84.3,-41.8 15.1,-4.9 91.3,20.6 125.4,32.5 10.9,3.8 22.4,5.4 34,4.9 4.9,-0.2 9.6,-0.4 14.2,-0.5 13.6,-0.4 26.1,-0.3 37.5,0.2 23.5,0.9 42.5,3.2 57.4,6 16.5,3.1 28.1,6.7 35.7,9.5 7.5,2.8 10.9,4.9 10.9,4.9 69.2,39 70.7,122.3 68.7,153.1 -0.6,8.2 -2.9,16.1 -6.7,23.2 z"/>',
    '<path fill="#040000" d="m 691.5,551.2 c -1,2.9 -3.6,6.1 -9.4,8.5 0.1,-4.2 0.5,-6.6 0.5,-6.6 0,0 4.7,0 8.9,-1.9 z"/>',
    '<path fill="#ba692d" d="m 1020.2,558.1 c -1,5.1 -0.2,8.4 -4.8,17.8 -1.8,3.8 -6.9,4.1 -8.4,0.1 l -4.3,-15.9 c -7.7,-27.7 -18.9,-59 -27.5,-74 13.6,-0.4 26.1,-0.3 37.5,0.2 7.1,24.1 9,64 7.5,71.8 z"/>',
    '<path fill="#ba692d" d="m 1102.7,568.3 c -2.9,7.7 -3,8.7 -5.4,12.5 -2.2,3.6 -7.7,2.4 -8.3,-1.8 l -1.5,-10.3 c -3,-35.2 -10.9,-60.7 -17.3,-76.4 16.5,3.1 28.1,6.7 35.7,9.5 2.4,26.7 -0.2,58.6 -3.2,66.5 z"/>',
    '<circle fill="#d14d2b" cx="772.2" cy="593.6" r="26.9"/>',
    '<g><ellipse fill="#221714" cx="730.3" cy="545" rx="7" ry="22.1"/>',
    '<ellipse fill="#ffffff" cx="727.9" cy="537" rx="3.1" ry="8.5"/></g>',

    /* ears — black-tipped, flicking on the beat */
    '<g class="pk-earR">',
    '<path fill="#f0cf48" d="m 948.8,340.6 c -4.7,11.5 -19.2,38.1 -61.1,72.7 -16.3,13.5 -36.9,28.1 -62.6,43.6 L 796,471.1 778.3,450.7 c 0,0 40,-60.9 108.8,-95.4 17.4,-8.7 36.6,-15.8 57.5,-19.8 2.9,-0.7 5.4,2.3 4.2,5.1 z"/>',
    '<path fill="#040000" d="m 948.8,340.6 c -4.7,11.5 -19.2,38.1 -61.1,72.7 4.3,-27 1.7,-47.3 -0.6,-58.2 17.4,-8.7 36.6,-15.8 57.5,-19.8 2.9,-0.5 5.4,2.5 4.2,5.3 z"/>',
    '<animateTransform attributeName="transform" type="rotate" values="0 798 449;-13 798 449;0 798 449" begin="0s" dur="1.5s" repeatCount="indefinite"/>',
    '</g>',
    '<g class="pk-earL">',
    '<path fill="#f0cf48" d="m 1001,393.8 c -7.2,9.7 -27.7,32.1 -74.8,54.4 -25.5,12.1 -58.7,24.1 -101.9,34 l -25.9,-26.6 c 0,0 50.5,-47 136.3,-62.3 19.5,-3.5 40.8,-5.4 63.8,-4.7 2.6,0.1 4.1,3.1 2.5,5.2 z"/>',
    '<path fill="#040000" d="m 1001,393.8 c -7.2,9.7 -27.7,32.1 -74.8,54.4 12.1,-29.6 11.6,-46 8.5,-54.9 19.5,-3.5 40.8,-5.4 63.8,-4.7 2.6,0.1 4.1,3.1 2.5,5.2 z"/>',
    '<animateTransform attributeName="transform" type="rotate" values="0 837 454;-10 837 454;0 837 454" begin="0s" dur="1.5s" repeatCount="indefinite"/>',
    '</g>',

    /* the body-bob itself */
    '<animateTransform attributeName="transform" type="translate" values="0 0;0 10;0 0" begin="0s" dur="1.5s" repeatCount="indefinite"/>',
    '</g>',

    /* near legs — drawn IN FRONT of the body (pk-legF kept for the
       foot-line measurements; pk-legFn is its gait hook) */
    '<path class="pk-legF pk-legFn" fill="#F0CF48" d="M855.8,793.7c3.8-4.8,11.1-11.4,11.5-13c0,0,69.7-54.4,54.5-109.8c-7.5-27.2-22.8-33-36.2-31.9  c-14.3,1.1-26.8,10.2-33,23.1c-7.3,15.2-19.3,45-34.6,100c0,0-2.2,13-4.5,15.9l-6.8,11.4c-0.4,5.7,4.1,10.5,9.7,10.6l15.5,1.2  C837.4,801.2,852.4,798,855.8,793.7z"/>',
    '<path class="pk-legRn" fill="#F0CF48" d="M1086.3,603.5c0,0,33.4-31.4,61.9,2.9c44.5,53.4,16.1,95.6,15.5,107.7c-0.6,12.1,6.7,0.7,12.4,10.4  c11.8,20.1-44.4,51.3-66.7,67.1c-11.9,8.4-19.1,4.8-37.5,5.5c-2.4,0.1-8.4-7.3-7.5-9.5c5.1-12.8,16,5.3,49.8-35.4  C1070.7,769.6,1015.4,675.6,1086.3,603.5z"/>',
    '</svg>'
  ].join('');

  function injectCSS() {
    if (doc.getElementById('pokemon-pikachu-css')) return;
    var s = doc.createElement('style');
    s.id = 'pokemon-pikachu-css';
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  /* ── lightning: click Pikachu → electric bolts burst out of it ──────────
     Pure SVG drawn IN FRONT of the figure (so it works in ANY host that uses
     the character, no per-scene code), on the wrapper's own px canvas. ── */
  var NSVG = 'http://www.w3.org/2000/svg';
  function boltPath(d, color, w, op) {
    var p = doc.createElementNS(NSVG, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color); p.setAttribute('stroke-width', w);
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('opacity', op);
    return p;
  }
  /* a jagged polyline from (cx,cy) along axis (ax,ay), length len, with a
     perpendicular zig-zag wobble of amplitude jit */
  function jagged(cx, cy, ax, ay, len, segs, jit) {
    var px = -ay, py = ax, pts = [];
    for (var i = 0; i <= segs; i++) {
      var f = i / segs, j = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * jit;
      pts.push((cx + ax * len * f + px * j).toFixed(1) + ',' + (cy + ay * len * f + py * j).toFixed(1));
    }
    return 'M' + pts.join(' L');
  }
  function fireLightning(wrap) {
    if (typeof doc === 'undefined' || !wrap) return;
    var r = wrap.getBoundingClientRect();
    var W = Math.round(r.width) || 200, Hh = Math.round(r.height) || 220;

    var host = doc.createElement('div');
    host.className = 'pk-zap';
    host.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;' +
      'overflow:visible;pointer-events:none;z-index:6;';

    var svg = doc.createElementNS(NSVG, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;';
    var cx = W * 0.5, cy = Hh * 0.46;                     // ~ Pikachu's body/cheeks
    var maxLen = Math.max(W, Hh) * 0.62;
    var glowW = Math.max(3, maxLen * 0.05), coreW = Math.max(1.4, glowW * 0.42);
    var dirs = [[0, -1], [-0.6, -0.82], [0.6, -0.82], [-1, -0.18], [1, -0.18], [-0.72, 0.55], [0.72, 0.55]];
    for (var k = 0; k < dirs.length; k++) {
      var ax = dirs[k][0], ay = dirs[k][1], len = maxLen * (0.7 + Math.random() * 0.45);
      var d = jagged(cx, cy, ax, ay, len, 5, maxLen * 0.14);
      svg.appendChild(boltPath(d, '#ffcf1a', glowW, 0.5));     // electric-yellow glow
      svg.appendChild(boltPath(d, '#fff7c8', coreW, 1));       // hot pale-yellow core
      if (Math.random() < 0.7) {                                // a short fork near the tip
        var bx = cx + ax * len * 0.6, by = cy + ay * len * 0.6;
        var bax = ax * 0.5 + (Math.random() - 0.5) * 0.9, bay = ay * 0.5 + (Math.random() - 0.5) * 0.9;
        var bd = jagged(bx, by, bax, bay, len * 0.42, 3, maxLen * 0.1);
        svg.appendChild(boltPath(bd, '#ffcf1a', glowW * 0.7, 0.45));
        svg.appendChild(boltPath(bd, '#fff7c8', coreW * 0.8, 0.95));
      }
    }
    host.appendChild(svg);

    var fl = doc.createElement('div');                          // expanding origin flash
    var fs = maxLen * 0.5;
    fl.style.cssText = 'position:absolute;left:' + cx.toFixed(1) + 'px;top:' + cy.toFixed(1) + 'px;' +
      'width:' + fs.toFixed(1) + 'px;height:' + fs.toFixed(1) + 'px;margin-left:' + (-fs / 2).toFixed(1) + 'px;' +
      'margin-top:' + (-fs / 2).toFixed(1) + 'px;border-radius:50%;pointer-events:none;' +
      'background:radial-gradient(circle,rgba(255,247,200,.95),rgba(255,207,26,.5) 42%,rgba(255,207,26,0) 70%);';
    host.appendChild(fl);

    wrap.appendChild(host);
    var kill = function () { if (host.parentNode) host.parentNode.removeChild(host); };
    if (svg.animate) {
      svg.animate([{ opacity: 0.2, offset: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.5, offset: 0.28 },
        { opacity: 1, offset: 0.44 }, { opacity: 0.85, offset: 0.62 }, { opacity: 0, offset: 1 }],
        { duration: 620, easing: 'ease-out' }).onfinish = kill;
      if (fl.animate) fl.animate([{ transform: 'scale(.25)', opacity: 0.95 }, { transform: 'scale(1.5)', opacity: 0 }],
        { duration: 440, easing: 'ease-out', fill: 'forwards' });
    } else {
      setTimeout(kill, 640);
    }
  }

  /* ── cheek sparks: a tiny ambient electric crackle at the red cheek —
     2-3 mini jagged bolts + a soft flash, ~380ms. Fires on a random 6-14s
     timer AND via inst.spark(). The overlay mirrors with .pk-flip so the
     sparks stay on the visible (leading) cheek. ── */
  function fireSpark(wrap) {
    if (typeof doc === 'undefined' || !wrap) return;
    var r = wrap.getBoundingClientRect();
    var W = Math.round(r.width) || 200, Hh = Math.round(r.height) || 220;

    var host = doc.createElement('div');
    host.className = 'pk-spark';
    host.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;' +
      'overflow:visible;pointer-events:none;z-index:6;' +
      (wrap.classList.contains('pk-flip') ? 'transform:scaleX(-1);' : '');
    var NS = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;';
    /* the red cheek sits at ≈(13.7%, 67%) of the cropped canvas (svg 772,593) */
    var cx = W * 0.137, cy = Hh * 0.67;
    var len = Math.max(10, W * 0.09);
    var n = 2 + (Math.random() * 2 | 0);
    for (var k = 0; k < n; k++) {
      var ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;   // up-left fan
      var ax = Math.cos(ang), ay = Math.sin(ang), segs = 4, pts = [];
      var px = -ay, py = ax, L = len * (0.7 + Math.random() * 0.6);
      for (var i = 0; i <= segs; i++) {
        var f = i / segs, j = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * len * 0.5;
        pts.push((cx + ax * L * f + px * j).toFixed(1) + ',' + (cy + ay * L * f + py * j).toFixed(1));
      }
      var d = 'M' + pts.join(' L');
      var glow = doc.createElementNS(NS, 'path');
      glow.setAttribute('d', d); glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', '#ffcf1a'); glow.setAttribute('stroke-width', Math.max(2, len * 0.16));
      glow.setAttribute('stroke-linecap', 'round'); glow.setAttribute('opacity', '0.55');
      var core = glow.cloneNode(false);
      core.setAttribute('stroke', '#fff7c8'); core.setAttribute('stroke-width', Math.max(1, len * 0.07));
      core.setAttribute('opacity', '1');
      svg.appendChild(glow); svg.appendChild(core);
    }
    var flash = doc.createElementNS(NS, 'circle');
    flash.setAttribute('cx', cx); flash.setAttribute('cy', cy); flash.setAttribute('r', Math.max(3, len * 0.22));
    flash.setAttribute('fill', '#fff3bf');
    svg.appendChild(flash);
    host.appendChild(svg);
    wrap.appendChild(host);
    var kill = function () { if (host.parentNode) host.parentNode.removeChild(host); };
    if (svg.animate) {
      svg.animate([{ opacity: 0.3 }, { opacity: 1, offset: 0.15 }, { opacity: 0.4, offset: 0.45 },
        { opacity: 1, offset: 0.65 }, { opacity: 0 }],
        { duration: 380, easing: 'ease-out' }).onfinish = kill;
    } else {
      setTimeout(kill, 400);
    }
  }

  /* ── jump: a happy double-hop. The svg carries a CSS scaleX(-1) when
     flipped, so composite:'add' (translateY only) rides on top without
     clobbering the flip (Y is unaffected by scaleX). ── */
  function fireJump(wrap) {
    if (!wrap || wrap._acting) return;
    var svg = wrap.querySelector ? wrap.querySelector('svg') : null;
    if (!svg || !svg.animate) return;
    wrap._acting = true;
    try {
      svg.animate(
        [{ transform: 'translateY(0px)', easing: 'ease-out' },
         { transform: 'translateY(-30px)', offset: 0.3, easing: 'ease-in' },
         { transform: 'translateY(0px)', offset: 0.55, easing: 'ease-out' },
         { transform: 'translateY(-13px)', offset: 0.76, easing: 'ease-in' },
         { transform: 'translateY(0px)' }],
        { duration: 720, composite: 'add' }).onfinish = function () { wrap._acting = false; };
    } catch (e) { wrap._acting = false; }
  }

  /* pick a random discrete act — used by the timer AND on click */
  function fireAct(wrap) { (Math.random() < 0.5 ? fireSpark : fireJump)(wrap); }

  /* ambient act scheduler — random 6-14s heartbeat; pikachu's pause is the
     SMIL clock (no .pk-paused class), so it gates on wrap._pkPaused */
  function scheduleActs(wrap, fire) {
    (function tick() {
      wrap._actT = setTimeout(function () {
        if (!doc.body || !doc.body.contains(wrap)) return;   // removed — stop
        if (!wrap._pkPaused) fire();
        tick();
      }, 6000 + Math.random() * 8000);
    })();
  }

  /* one document-level capture click handler hit-tests each Pikachu's LIVE
     box (robust while it animates) and fires its lightning, stopping the
     click from reaching the scene behind it. Skips the game/host UI. */
  var clickBound = false;
  function ensureClickHandler() {
    if (clickBound || typeof doc === 'undefined') return;
    clickBound = true;
    doc.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest(
        '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
      var list = doc.querySelectorAll('.pkw-pi');
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.width && e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          fireLightning(list[i]);       // signature bolt burst …
          fireAct(list[i]);             // … + a lively body act on the same click
          e.stopPropagation();
          return;
        }
      }
    }, true);
  }

  /* place() — drop a Pikachu into any positioned container */
  function place(opts) {
    opts = opts || {};
    var parent = opts.parent || doc.body;
    injectCSS();
    ensureClickHandler();

    var wrap = doc.createElement('div');
    wrap.className = 'pkw-pi' + (opts.flip ? ' pk-flip' : '');
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
    /* SVG strings must be parsed in the SVG namespace */
    var svg = new DOMParser().parseFromString(SVG, 'image/svg+xml').documentElement;
    wrap.appendChild(svg);
    parent.appendChild(wrap);
    if (opts.paused) { try { svg.pauseAnimations(); } catch (e) {} }

    function refit() {
      var h = wrap.clientHeight || 200;
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
      /* gait cadence follows the walking speed: one full step-cycle
         per ~60px of travel (clamped to stay readable) */
      wrap.style.setProperty('--pk-step',
        Math.min(0.9, Math.max(0.18, 60 / speed)).toFixed(2) + 's');

      function leg() {
        if (st.stopped) return;
        var cw = stage.clientWidth || 800, ew = wrap.offsetWidth || 100;
        var target = st.dir > 0 ? Math.max(pad, cw - ew - pad) : pad;
        /* face the ACTUAL travel direction (a figure placed beyond the edge
           target walks backwards to it on the first leg — dir alone lies) */
        api.setFlip(target > st.tx);                      // faces LEFT natively
        api.setWalking(true);                              // legs step while moving
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
          api.setWalking(false);                           // rest the legs at the edge
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
          api.setWalking(false);
          patrolCtl = null;
        },
        setPaused: function (b) {
          st.paused = b !== false;
          if (st.anim) {
            if (st.paused) st.anim.pause(); else st.anim.play();
            api.setWalking(!st.paused);                    // frozen mid-stride ≠ stepping
          }
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
        /* the rig is SMIL — pause via the SVG clock, not CSS */
        wrap._pkPaused = b !== false;                      // gates the ambient sparks
        try { if (b !== false) svg.pauseAnimations(); else svg.unpauseAnimations(); } catch (e) {}
        if (patrolCtl) patrolCtl.setPaused(b);             // freeze the crossing too
      },
      /* jump the 1.5s SMIL loop to a given second (for posing/screenshots) */
      seek: function (sec) { try { svg.setCurrentTime(sec); } catch (e) {} },
      /* the walk gait (legs stepping) — patrol drives this automatically */
      setWalking: function (b) { wrap.classList.toggle('pk-walk', b !== false); },
      /* burst of electric bolts (also fired by clicking Pikachu) */
      zap: function () { fireLightning(wrap); },
      /* body acts — also fire on click + on their own every ~6-14s */
      spark: function () { fireSpark(wrap); },
      jump: function () { fireJump(wrap); },
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
  w.Pokemons.pikachu = {
    name: 'pikachu',
    dexId: 25,
    nativeW: NATIVE_W,
    nativeH: NATIVE_H,
    /* the front paw line sits at ≈97% of the cropped canvas height */
    footFrac: 0.97,
    place: place
  };
})(typeof window !== 'undefined' ? window : this);
