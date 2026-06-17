/* =====================================================================
   chibi-walker.js  —  reusable walking chibi character
   ---------------------------------------------------------------------
   The character art (SVG) lives ONCE, here. Backgrounds never copy it;
   they just load this script and call the API.

   Design twin / preview + FULL documentation:  backgrounds/rumi/rumi.html
   holds the SAME figure (on a white page background; hearts removed here too)
   and a deep doc comment explaining its anatomy, coordinate system, palette and
   animation. If you edit the art in one file, mirror it into the other.

       <script src="path/to/chibi-walker.js"></script>

   One crossing (enters off one edge, walks across, exits the other edge):
       ChibiWalker.walk(containerEl, {
         direction: 'ltr',     // 'ltr' (enter left -> exit right) or 'rtl'
         duration : 11000,     // ms to cross the whole screen
         height   : '40%',     // character height (any CSS length, vs container)
         bottom   : '6%',      // vertical position of the feet (CSS length)
         bob      : 8,         // px of vertical bounce while walking
         zIndex   : 6,
         faceWalkDir: true,    // mirror so the character faces the way it walks
         onDone   : fn         // called after it exits (element auto-removed)
       });
       // -> returns { element, animation, stop() }

   Continuous patrol (keeps crossing back and forth with random gaps):
       const p = ChibiWalker.patrol(containerEl, {
         height:'40%', bottom:'6%', duration:10000,
         gapMin: 3000, gapMax: 8000, alternate: true, startDelay: 0
       });
       // -> returns { stop() }   // call p.stop() to remove & cancel

   Notes
   - The limbs animate via CSS injected once into <head>; nothing per-call.
   - Pure DOM/SVG + Web Animations API. No dependencies. Works on file://.
   - The container is made position:relative automatically if it is static.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---- the character art: ONE copy (hearts & opaque background removed,
         viewBox tightened around the figure so positioning is exact) ---- */
  var SVG_MARKUP =
'<svg class="chibi-svg" viewBox="150 170 300 900" xmlns="http://www.w3.org/2000/svg">' +
'<g transform="translate(300,540) scale(1.10) translate(-300,-540) translate(0,18)" stroke="#000000" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round" fill="none">' +

  /* HAIR behind face — side frame locks */
  '<path fill="#a83fce" d="M222 300 C198,316 186,352 192,398 C195,424 206,446 222,456 C216,422 212,366 230,322 Z"/>' +
  '<path fill="#a83fce" d="M378 300 C402,316 414,352 408,398 C405,424 394,446 378,456 C384,422 388,366 370,322 Z"/>' +

  /* BRAID on viewer-left (drawn first so head + arm occlude the middle) */
  '<g>' +
    '<path fill="#a83fce" d="M232 300 C198,312 172,350 172,402 C172,456 190,502 210,538 C234,582 250,620 252,668 C254,712 252,752 248,786 C245,812 240,830 236,846 L266,852 C270,828 274,800 276,762 C279,712 277,660 270,612 C262,560 248,520 234,486 C218,452 210,418 214,386 C217,358 230,334 246,318 C242,310 237,304 232,300 Z"/>' +
    '<path d="M180 425 C192,432 206,430 212,420" stroke-width="2.6"/>' +
    '<path d="M210 510 C222,518 234,516 240,506" stroke-width="2.6"/>' +
    '<path d="M242 585 C254,593 264,591 268,581" stroke-width="2.8"/>' +
    '<path d="M250 655 C262,663 270,661 274,651" stroke-width="2.8"/>' +
    '<path d="M250 722 C260,730 268,728 273,718" stroke-width="2.8"/>' +
    '<path d="M247 786 C257,793 265,791 271,781" stroke-width="2.8"/>' +
    '<path fill="#efc14b" d="M236 846 L266 852 L261 870 L241 864 Z"/>' +
    '<path fill="#efc14b" d="M241 864 C235,883 241,901 250,904 C260,901 265,883 261,870 Z"/>' +
    '<path d="M247 875 C246,887 248,898 250,903" stroke="#c79a2e" stroke-width="1.8" fill="none"/>' +
    '<path d="M254 875 C255,887 253,898 250,903" stroke="#c79a2e" stroke-width="1.8" fill="none"/>' +
  '</g>' +

  /* FACE */
  '<path fill="#f7c9c1" stroke-width="3.6" d="M300 250 C246,250 214,286 214,346 C214,402 234,444 268,460 C282,467 318,467 332,460 C366,444 386,402 386,346 C386,286 354,250 300,250 Z"/>' +

  /* HAIRLINE — side locks + central band */
  '<path fill="#a83fce" d="M224 316 C210,322 202,360 208,402 C212,430 220,452 232,462 C226,428 222,372 234,332 C230,326 226,322 224,316 Z"/>' +
  '<path fill="#a83fce" d="M376 316 C390,322 398,360 392,400 C388,426 380,446 370,454 C376,422 380,372 368,332 C370,326 374,322 376,316 Z"/>' +
  '<path fill="#a83fce" d="M226 312 C248,288 268,279 288,279 C293,290 307,290 312,279 C332,279 352,288 374,312 C348,300 324,296 300,300 C276,296 252,300 226,312 Z"/>' +

  /* TOP BUN — lowered pompadour + seams */
  '<path fill="#a83fce" d="M236 311 C210,300 196,272 204,244 C211,219 232,204 256,202 C274,202 286,211 292,222 C295,218 297,215 300,215 C303,215 305,218 308,222 C314,211 326,202 344,202 C368,204 392,220 398,246 C405,274 392,302 366,313 C340,304 320,300 300,300 C278,300 260,304 236,311 Z"/>' +
  '<path fill="#a83fce" d="M300 296 C293,282 280,269 273,255 C264,239 262,218 277,206 C286,199 297,201 300,211 C303,201 314,199 323,206 C338,218 336,239 327,255 C320,269 307,282 300,296 Z"/>' +
  '<path d="M300 211 C296,233 297,264 300,288" stroke="#7d2ea8" stroke-width="3" fill="none"/>' +
  '<path d="M283 218 C277,237 280,265 293,288" stroke="#7d2ea8" stroke-width="2.2" fill="none"/>' +
  '<path d="M317 218 C323,237 320,265 307,288" stroke="#7d2ea8" stroke-width="2.2" fill="none"/>' +
  '<path d="M242 227 C226,250 224,278 240,304" stroke="#7d2ea8" stroke-width="2.4" fill="none"/>' +
  '<path d="M264 218 C250,240 250,269 264,299" stroke="#7d2ea8" stroke-width="2" fill="none"/>' +
  '<path d="M358 226 C374,250 376,278 360,306" stroke="#7d2ea8" stroke-width="2.4" fill="none"/>' +
  '<path d="M336 218 C350,240 350,269 336,299" stroke="#7d2ea8" stroke-width="2" fill="none"/>' +

  /* EARS + earrings */
  '<ellipse cx="215" cy="402" rx="9" ry="13" fill="#f7c9c1"/>' +
  '<path d="M212 396 C208,400 208,408 211,412" stroke-width="2" fill="none"/>' +
  '<ellipse cx="385" cy="402" rx="9" ry="13" fill="#f7c9c1"/>' +
  '<path d="M388 396 C392,400 392,408 389,412" stroke-width="2" fill="none"/>' +
  '<ellipse cx="214" cy="423" rx="8" ry="12" fill="none" stroke="#efc14b" stroke-width="5"/>' +
  '<ellipse cx="386" cy="423" rx="8" ry="12" fill="none" stroke="#efc14b" stroke-width="5"/>' +

  /* EYEBROWS */
  '<path d="M224 335 C236,325 256,325 270,331" stroke-width="3.4"/>' +
  '<path d="M330 331 C344,325 364,325 376,335" stroke-width="3.4"/>' +

  /* EYES + highlights + lashes */
  '<g>' +
    '<ellipse cx="252" cy="378" rx="29" ry="30" fill="#1a1a1a" stroke-width="2.5"/>' +
    '<ellipse cx="348" cy="378" rx="29" ry="30" fill="#1a1a1a" stroke-width="2.5"/>' +
    '<circle cx="245" cy="367" r="11" fill="#ffffff" stroke="none"/>' +
    '<circle cx="260" cy="392" r="5.5" fill="#ffffff" stroke="none"/>' +
    '<circle cx="341" cy="367" r="11" fill="#ffffff" stroke="none"/>' +
    '<circle cx="356" cy="392" r="5.5" fill="#ffffff" stroke="none"/>' +
    '<path d="M226 356 C222,349 218,346 214,346" stroke-width="2.6" fill="none"/>' +
    '<path d="M236 351 C233,344 229,341 225,341" stroke-width="2.4" fill="none"/>' +
    '<path d="M246 349 C244,343 241,340 238,340" stroke-width="2.2" fill="none"/>' +
    '<path d="M374 356 C378,349 382,346 386,346" stroke-width="2.6" fill="none"/>' +
    '<path d="M364 351 C367,344 371,341 375,341" stroke-width="2.4" fill="none"/>' +
    '<path d="M354 349 C356,343 359,340 362,340" stroke-width="2.2" fill="none"/>' +
  '</g>' +

  /* BLUSH */
  '<ellipse cx="250" cy="424" rx="15" ry="9" fill="#f3a3ad" opacity="0.85" stroke="none"/>' +
  '<ellipse cx="350" cy="424" rx="15" ry="9" fill="#f3a3ad" opacity="0.85" stroke="none"/>' +

  /* MOUTH */
  '<path d="M283 420 C291,434 309,434 317,420" stroke-width="3" fill="none"/>' +

  /* NECK */
  '<path fill="#f7c9c1" d="M280 458 C280,474 279,486 276,496 L324,496 C321,486 320,474 320,458 Z"/>' +

  /* ARMS (animated at the shoulder) */
  '<g class="arm-l"><path fill="#f7c9c1" d="M262 505 C246,506 234,518 229,540 C224,562 222,588 222,614 C222,632 223,646 225,656 C219,662 215,672 216,682 C217,694 226,700 236,698 C245,696 251,690 251,680 C254,684 259,682 260,675 C261,667 257,659 251,658 C252,640 253,612 254,588 C255,560 256,532 258,514 C259,508 268,504 262,505 Z"/></g>' +
  '<g class="arm-r"><path fill="#f7c9c1" d="M338 505 C354,506 366,518 371,540 C376,562 378,588 378,614 C378,632 377,646 375,656 C381,662 385,672 384,682 C383,694 374,700 364,698 C355,696 349,690 349,680 C346,684 341,682 340,675 C339,667 343,659 349,658 C348,640 347,612 346,588 C345,560 344,532 342,514 C341,508 332,504 338,505 Z"/></g>' +

  /* TOP — white halter crop + gem */
  '<path fill="#ffffff" d="M300 496 C284,496 271,501 263,511 C256,521 252,539 251,561 C250,585 252,614 257,636 L343,636 C348,614 350,585 349,561 C348,539 344,521 337,511 C329,501 316,496 300,496 Z"/>' +
  '<path d="M285 495 C292,487 308,487 315,495" stroke-width="3" fill="none"/>' +
  '<path fill="#efc14b" d="M300 500 L308 511 L300 522 L292 511 Z"/>' +
  '<path d="M300 522 L300 530" stroke-width="2.2" fill="none"/>' +

  /* MIDRIFF */
  '<path fill="#f7c9c1" stroke="none" d="M256 654 L344 654 L344 636 L256 636 Z"/>' +
  '<path d="M256 636 L256 656" stroke-width="3.6" fill="none"/>' +
  '<path d="M344 636 L344 656" stroke-width="3.6" fill="none"/>' +

  /* SHORTS — white + gold belt + sash */
  '<path fill="#ffffff" d="M254 654 C252,684 252,712 258,730 C262,740 274,742 290,740 L300 712 L310 740 C326,742 338,740 342,730 C348,712 348,684 346,654 Z"/>' +
  '<path fill="#efc14b" d="M254 652 L346 652 L346 670 L254 670 Z"/>' +
  '<rect x="292" y="654" width="16" height="14" fill="#efc14b" stroke="#000000" stroke-width="2.5"/>' +
  '<path fill="#efc14b" d="M258 678 L346 710 L346 724 L258 692 Z"/>' +
  '<path fill="#efc14b" d="M336 704 L348 709 L344 730 L332 724 Z"/>' +

  /* LEGS (animated at the hip): thigh + boot + sole + cuff + laces + eyelets */
  '<g class="leg-l">' +
    '<path fill="#f7c9c1" d="M268 738 C266,762 266,788 270,806 L300 806 L300 738 Z"/>' +
    '<path fill="#ffffff" d="M268 802 C265,846 263,930 265,962 C266,977 273,985 287,985 C301,985 307,977 307,962 C307,918 306,846 304,802 Z"/>' +
    '<path fill="#efc14b" d="M263 966 C265,981 273,989 287,989 C301,989 307,980 307,966 C300,975 272,975 263,966 Z"/>' +
    '<path d="M266 812 C280,817 292,817 306,812" stroke-width="3" fill="none"/>' +
    '<g stroke="#efc14b" stroke-width="3.2" fill="none">' +
      '<line x1="272" y1="820" x2="300" y2="820"/><line x1="271" y1="838" x2="301" y2="838"/>' +
      '<line x1="270" y1="858" x2="302" y2="858"/><line x1="269" y1="878" x2="302" y2="878"/>' +
      '<line x1="268" y1="898" x2="303" y2="898"/><line x1="268" y1="916" x2="303" y2="916"/>' +
    '</g>' +
    '<g fill="#efc14b" stroke="none">' +
      '<circle cx="271" cy="820" r="2.3"/><circle cx="301" cy="820" r="2.3"/>' +
      '<circle cx="270" cy="838" r="2.3"/><circle cx="302" cy="838" r="2.3"/>' +
      '<circle cx="269" cy="858" r="2.3"/><circle cx="303" cy="858" r="2.3"/>' +
      '<circle cx="269" cy="878" r="2.3"/><circle cx="303" cy="878" r="2.3"/>' +
      '<circle cx="268" cy="898" r="2.3"/><circle cx="304" cy="898" r="2.3"/>' +
      '<circle cx="268" cy="916" r="2.3"/><circle cx="304" cy="916" r="2.3"/>' +
    '</g>' +
  '</g>' +
  '<g class="leg-r">' +
    '<path fill="#f7c9c1" d="M332 738 C334,762 334,788 330,806 L300 806 L300 738 Z"/>' +
    '<path fill="#ffffff" d="M296 802 C294,846 293,918 293,962 C293,977 299,985 313,985 C327,985 334,977 335,962 C337,930 335,846 332,802 Z"/>' +
    '<path fill="#efc14b" d="M293 966 C293,980 299,989 313,989 C327,989 335,981 337,966 C328,975 300,975 293,966 Z"/>' +
    '<path d="M294 812 C308,817 320,817 334,812" stroke-width="3" fill="none"/>' +
    '<g stroke="#efc14b" stroke-width="3.2" fill="none">' +
      '<line x1="300" y1="820" x2="328" y2="820"/><line x1="299" y1="838" x2="329" y2="838"/>' +
      '<line x1="298" y1="858" x2="330" y2="858"/><line x1="298" y1="878" x2="331" y2="878"/>' +
      '<line x1="297" y1="898" x2="332" y2="898"/><line x1="297" y1="916" x2="332" y2="916"/>' +
    '</g>' +
    '<g fill="#efc14b" stroke="none">' +
      '<circle cx="299" cy="820" r="2.3"/><circle cx="329" cy="820" r="2.3"/>' +
      '<circle cx="298" cy="838" r="2.3"/><circle cx="330" cy="838" r="2.3"/>' +
      '<circle cx="297" cy="858" r="2.3"/><circle cx="331" cy="858" r="2.3"/>' +
      '<circle cx="297" cy="878" r="2.3"/><circle cx="331" cy="878" r="2.3"/>' +
      '<circle cx="296" cy="898" r="2.3"/><circle cx="332" cy="898" r="2.3"/>' +
      '<circle cx="296" cy="916" r="2.3"/><circle cx="332" cy="916" r="2.3"/>' +
    '</g>' +
  '</g>' +

'</g></svg>';

  /* ---- animation + base CSS, injected once (keyframes namespaced) ---- */
  var CSS =
    '.chibi-walker{position:absolute;left:0;bottom:0;pointer-events:none;will-change:transform;}' +
    '.chibi-walker .chibi-svg{height:100%;width:auto;display:block;overflow:visible;}' +
    '.chibi-walker.chibi-flip .chibi-svg{transform:scaleX(-1);}' +
    '.chibi-svg .arm-l,.chibi-svg .arm-r,.chibi-svg .leg-l,.chibi-svg .leg-r{transform-box:fill-box;}' +
    '.chibi-svg .arm-l{transform-origin:50% 6%;animation:chibiArmA 1.5s ease-in-out infinite;}' +
    '.chibi-svg .arm-r{transform-origin:50% 6%;animation:chibiArmB 1.5s ease-in-out infinite;}' +
    '.chibi-svg .leg-l{transform-origin:50% 2%;animation:chibiLegA 1.5s ease-in-out infinite;}' +
    '.chibi-svg .leg-r{transform-origin:50% 2%;animation:chibiLegB 1.5s ease-in-out infinite;}' +
    '@keyframes chibiArmA{0%,100%{transform:rotate(12deg)}50%{transform:rotate(-12deg)}}' +
    '@keyframes chibiArmB{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}' +
    '@keyframes chibiLegA{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}' +
    '@keyframes chibiLegB{0%,100%{transform:rotate(7deg)}50%{transform:rotate(-7deg)}}';

  var cssInjected = false;
  function ensureCSS() {
    if (cssInjected || typeof document === 'undefined') return;
    cssInjected = true;
    var s = document.createElement('style');
    s.id = 'chibi-walker-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function buildElement(opts) {
    ensureCSS();
    var wrap = document.createElement('div');
    wrap.className = 'chibi-walker' + (opts.flip ? ' chibi-flip' : '');
    wrap.style.height = opts.height;
    wrap.style.bottom = opts.bottom;
    if (opts.zIndex != null) wrap.style.zIndex = opts.zIndex;
    wrap.style.transform = 'translateX(-99999px)';   // hidden off-screen until measured
    wrap.innerHTML = SVG_MARKUP;
    return wrap;
  }

  /* one crossing */
  function walk(container, options) {
    var o = options || {};
    var opts = {
      direction: o.direction || 'ltr',
      duration: o.duration != null ? o.duration : 11000,
      height: o.height || '40%',
      bottom: o.bottom != null ? o.bottom : '6%',
      bob: o.bob != null ? o.bob : 8,
      zIndex: o.zIndex != null ? o.zIndex : 6,
      faceWalkDir: o.faceWalkDir !== false,
      flip: o.flip,
      loop: !!o.loop,
      onDone: o.onDone || null
    };
    if (!container) return null;
    var cs = global.getComputedStyle ? getComputedStyle(container) : null;
    if (cs && cs.position === 'static') container.style.position = 'relative';

    var faceLeft = opts.direction === 'rtl';
    var flip = opts.faceWalkDir ? faceLeft : !!opts.flip;

    var wrap = buildElement({ height: opts.height, bottom: opts.bottom, zIndex: opts.zIndex, flip: flip });
    container.appendChild(wrap);

    var cw = container.clientWidth || (global.innerWidth || 800);
    var ew = wrap.offsetWidth || (container.clientHeight * 0.33) || 200;
    var margin = Math.max(40, ew * 0.25);
    var startX = -ew - margin, endX = cw + margin;
    if (opts.direction === 'rtl') { var tmp = startX; startX = endX; endX = tmp; }

    // linear horizontal travel + gentle vertical bounce
    var steps = 48, frames = [];
    var cycles = Math.max(4, Math.round(opts.duration / 620));
    for (var i = 0; i <= steps; i++) {
      var f = i / steps;
      var x = startX + (endX - startX) * f;
      var y = -Math.abs(Math.sin(f * Math.PI * cycles)) * opts.bob;
      frames.push({ transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)', offset: f });
    }

    var handle = { element: wrap, animation: null, stop: function () {} };

    if (wrap.animate) {
      var anim = wrap.animate(frames, { duration: opts.duration, easing: 'linear', iterations: opts.loop ? Infinity : 1 });
      anim.onfinish = function () { if (!opts.loop) { wrap.remove(); if (opts.onDone) opts.onDone(); } };
      handle.animation = anim;
      handle.stop = function () { try { anim.cancel(); } catch (e) {} if (wrap.parentNode) wrap.remove(); };
    } else {
      // very old fallback: CSS transition
      wrap.style.transform = 'translate(' + startX + 'px,0)';
      wrap.style.transition = 'transform ' + opts.duration + 'ms linear';
      requestAnimationFrame(function () { wrap.style.transform = 'translate(' + endX + 'px,0)'; });
      var done = function () { wrap.removeEventListener('transitionend', done); if (!opts.loop) { wrap.remove(); if (opts.onDone) opts.onDone(); } };
      wrap.addEventListener('transitionend', done);
      handle.stop = function () { if (wrap.parentNode) wrap.remove(); };
    }
    return handle;
  }

  /* keeps crossing back and forth, with random gaps between crossings */
  function patrol(container, options) {
    var o = options || {};
    var dir = o.direction || 'ltr';
    var alternate = o.alternate !== false;
    var gapMin = o.gapMin != null ? o.gapMin : 3000;
    var gapMax = o.gapMax != null ? o.gapMax : 8000;
    var stopped = false, timer = null, current = null;

    function rand(a, b) { return a + Math.random() * (b - a); }
    function next() {
      if (stopped) return;
      current = walk(container, Object.assign({}, o, {
        direction: dir, loop: false,
        onDone: function () {
          if (typeof o.onDone === 'function') o.onDone();
          if (alternate) dir = (dir === 'ltr' ? 'rtl' : 'ltr');
          timer = setTimeout(next, rand(gapMin, gapMax));
        }
      }));
    }
    timer = setTimeout(next, o.startDelay != null ? o.startDelay : 0);
    return { stop: function () { stopped = true; clearTimeout(timer); if (current) current.stop(); } };
  }

  global.ChibiWalker = { walk: walk, patrol: patrol, svgMarkup: SVG_MARKUP };
})(typeof window !== 'undefined' ? window : this);
