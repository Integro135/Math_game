/* ── DINOSAURS v2 — from-scratch rebuild of the dinosaur background ─────────
   One self-contained module (no sub-files): sunset-valley backdrop with an
   erupting volcano, five ALL-NEW SVG dinosaurs (brontosaurus + pterodactyl
   are new species; triceratops / stegosaurus / T-Rex are new drawings),
   hatching nest eggs, and a 10-click meteor storm.

   Registry contract (same as every background):
     window.BACKGROUNDS.dinosaurs2 = { skin, aids, preload, init({stage}) → cleanup }
   Plus gallery({stage}) → cleanup — a static art line-up for development.

   House rules honoured: pure DOM/SVG/WAAPI, zero deps, file:// safe, ES5,
   every class/keyframe namespaced d2*, all CSS scoped, click routing via ONE
   document-level capture listener with the game-UI whitelist filter. */
(function (w) {
  'use strict';
  if (!w || !w.document) return;
  var doc = w.document;
  var NS = 'http://www.w3.org/2000/svg';

  /* where this file lives → resolve the sibling dinasours/ modules (the old
     rolling egg is loaded from there, "exactly as it was") */
  var BASE = (function () {
    var s = doc.currentScript;
    return s && s.src ? s.src.replace(/[^/]*$/, '') : 'backgrounds/';
  })();
  var DINO = BASE + 'dinasours/';
  /* inject a dinasours/ module once; call cb when its global is ready (degrades
     gracefully — cb still runs on error so the scene isn't blocked) */
  function needScript(globalName, file, cb) {
    if (w[globalName]) { cb(); return; }
    var sel = 'script[data-d2dep="' + globalName + '"]', ex = doc.querySelector(sel);
    if (ex) { ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    var s = doc.createElement('script');
    s.src = DINO + file; s.setAttribute('data-d2dep', globalName);
    s.onload = cb; s.onerror = cb;
    doc.head.appendChild(s);
  }

  /* ── helpers ─────────────────────────────────────────────────────────── */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
  function el(tag, cls, css) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = doc.createElementNS(NS, tag), k;
    for (k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  /* SVG strings must be parsed with the SVG namespace (innerHTML on a div
     would create HTML-namespace nodes that don't render). The xmlns is
     injected here so the art strings stay readable. */
  function parseSVG(markup) {
    markup = markup.replace('<svg ', '<svg xmlns="' + NS + '" ');
    var d = new DOMParser().parseFromString(markup, 'image/svg+xml');
    return doc.importNode(d.documentElement, true);
  }
  function animate(node, frames, opts) {
    if (node.animate) return node.animate(frames, opts);
    return null; // graceful no-WAAPI degradation: statics still render
  }

  /* ── palettes — plain hex swap over the whole markup string.
        Rule: a small CLOSED set of exact hexes per species; FX colors
        (hearts, dust) never reuse a body hex, so split/join stays safe. ── */
  var GREEN = { body: '#8cc777', dark: '#6ea653', line: '#3f6e2c', belly: '#c4e6a3', rim: '#eef4e0', scale: '#5f9447' };
  var PAL = {
    green: null,
    pink: {
      '#8cc777': '#f2a3c6', '#6ea653': '#e07ba8', '#3f6e2c': '#b14a7c',
      '#c4e6a3': '#fcd9ea', '#eef4e0': '#fde4ef', '#5f9447': '#d678a6',
      '#76b65d': '#ee9dc1', '#ecb24f': '#f2b34a', '#eab94d': '#f2b34a',
      '#f6d28a': '#f9d68f', '#f1a0ab': '#d96f97'
    },
    teal: {
      '#8cc777': '#5bc4a3', '#6ea653': '#3da384', '#3f6e2c': '#2b6e58',
      '#c4e6a3': '#a8e6cf', '#eef4e0': '#e2f7ee', '#5f9447': '#37907a',
      '#76b65d': '#4ebd9b'
    }
  };
  function applyPal(markup, name) {
    var map = PAL[name], k;
    if (!map) return markup;
    for (k in map) if (map.hasOwnProperty(k)) markup = markup.split(k).join(map[k]);
    return markup;
  }

  /* ── pterodactyl palettes — the flyer owns its own coral hex family, so it
        needs a separate swap table (the same closed-set rule as PAL). Each
        variant recolours body/wings/crest/belly/outline; the eye pupil shifts
        to a matching dark tone. `coral` = null = the original art. ── */
  var PTERO_PAL = {
    coral: null,
    violet: {
      '#f4b183': '#b6a4e6', '#e78a5f': '#9b83d9', '#d97c50': '#8670c9',
      '#ffd9b8': '#e9dffb', '#e6647a': '#c86bd4', '#8a4b2c': '#5b3f8a',
      '#3a2417': '#241a3a'
    },
    sky: {
      '#f4b183': '#8fc4ee', '#e78a5f': '#6aa9e0', '#d97c50': '#4f92d1',
      '#ffd9b8': '#dcecfb', '#e6647a': '#54cad9', '#8a4b2c': '#2f5a8a',
      '#3a2417': '#17293a'
    },
    sun: {
      '#f4b183': '#ffd76b', '#e78a5f': '#f6b23f', '#d97c50': '#e39421',
      '#ffd9b8': '#fff2c4', '#e6647a': '#ff8f5e', '#8a4b2c': '#9a5a1e',
      '#3a2417': '#3a2610'
    }
  };
  function applyPteroPal(markup, name) {
    var map = PTERO_PAL[name], k;
    if (!map) return markup;
    for (k in map) if (map.hasOwnProperty(k)) markup = markup.split(k).join(map[k]);
    return markup;
  }
  var PTERO_PAL_NAMES = ['coral', 'violet', 'sky', 'sun'];

  /* ══ SPECIES ART — every figure drawn from scratch, faces RIGHT,
        feet on the viewBox bottom edge so the ground shadow lines up.
        Shared anatomy: one closed silhouette path with the thick round
        #3f6e2c outline, far legs behind / near legs in front, diagonal
        gait pairs (.lgA / .lgB), big white eye in a .eye group. ══ */

  /* ── BRONTOSAURUS — the new long-neck. Round body, tall S-neck, small
        happy head, tail that curls up at the tip. ── */
  var BRONTO_SVG = [
    '<svg class="d2svg" viewBox="-80 40 778 378">',
    '<defs>',
    '<linearGradient id="d2brForm" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#eef4e0" stop-opacity=".42"/>',
    '<stop offset=".3" stop-color="#eef4e0" stop-opacity="0"/>',
    '<stop offset=".78" stop-color="#3f6e2c" stop-opacity="0"/>',
    '<stop offset="1" stop-color="#3f6e2c" stop-opacity=".26"/>',
    '</linearGradient>',
    '<clipPath id="d2brClip"><path d="M-72,300 C-20,264 60,240 150,238 C190,212 250,200 330,198 C400,196 450,206 478,222 C515,190 548,144 570,100 C576,70 600,52 630,52 C662,52 684,72 686,94 C688,113 674,127 653,128 C639,130 628,124 621,115 C606,150 592,200 552,238 C572,258 578,292 570,318 C548,344 470,360 380,360 C300,360 235,346 208,318 C150,312 30,316 -72,300 Z"/></clipPath>',
    '</defs>',
    /* far legs (drawn first = behind body) — long columns */
    '<g class="leg lgA"><path d="M252,290 L247,382 Q246,402 266,404 L278,404 Q294,404 292,386 L288,290 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4"/></g>',
    '<g class="leg lgB"><path d="M460,292 L455,384 Q454,404 474,406 L486,406 Q502,406 500,388 L496,292 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4"/></g>',
    /* body + long whip tail + graceful neck + head — one silhouette */
    '<path d="M-72,300 C-20,264 60,240 150,238 C190,212 250,200 330,198 C400,196 450,206 478,222 C515,190 548,144 570,100 C576,70 600,52 630,52 C662,52 684,72 686,94 C688,113 674,127 653,128 C639,130 628,124 621,115 C606,150 592,200 552,238 C572,258 578,292 570,318 C548,344 470,360 380,360 C300,360 235,346 208,318 C150,312 30,316 -72,300 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>',
    /* depth pass, clipped to the silhouette */
    '<g clip-path="url(#d2brClip)">',
    '<path d="M190,318 C250,362 420,368 545,314 L545,420 L180,420 Z" fill="#c4e6a3" opacity=".45"/>',
    '<ellipse cx="272" cy="296" rx="30" ry="13" fill="#3f6e2c" opacity=".13"/>',
    '<ellipse cx="478" cy="298" rx="30" ry="13" fill="#3f6e2c" opacity=".13"/>',
    '<path d="M300,222 C320,248 370,252 400,234 C392,272 330,276 300,222 Z" fill="#6ea653" opacity=".85"/>',
    '<path d="M428,258 C448,252 472,260 476,280 C460,294 434,288 428,258 Z" fill="#6ea653" opacity=".85"/>',
    '<path d="M160,262 C176,254 196,260 198,276 C186,288 164,282 160,262 Z" fill="#6ea653" opacity=".85"/>',
    '<rect x="-80" y="40" width="778" height="378" fill="url(#d2brForm)"/>',
    '<path d="M150,234 C240,210 340,196 470,220 C360,202 240,216 150,234 Z" fill="#eef4e0" opacity=".55"/>',
    '</g>',
    /* soft back-ridge bumps */
    '<ellipse cx="330" cy="199" rx="11" ry="6" fill="#6ea653" stroke="#3f6e2c" stroke-width="2" opacity=".9"/>',
    '<ellipse cx="382" cy="198" rx="11" ry="6" fill="#6ea653" stroke="#3f6e2c" stroke-width="2" opacity=".9"/>',
    '<ellipse cx="432" cy="203" rx="10" ry="5.5" fill="#6ea653" stroke="#3f6e2c" stroke-width="2" opacity=".9"/>',
    /* near legs — long, with toes */
    '<g class="leg lgB"><path d="M298,294 L294,388 Q294,408 314,410 L330,410 Q348,410 346,392 L342,294 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5"/><path d="M302,402 Q308,396 314,402 M320,402 Q326,396 332,402" fill="none" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round"/></g>',
    '<g class="leg lgA"><path d="M506,296 L502,390 Q502,410 522,412 L538,412 Q556,412 554,394 L550,296 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5"/><path d="M510,404 Q516,398 522,404 M528,404 Q534,398 540,404" fill="none" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round"/></g>',
    /* face — big sparkly eye */
    '<g class="eye"><circle cx="642" cy="94" r="14" fill="#ffffff" stroke="#3f6e2c" stroke-width="3"/><circle cx="645.5" cy="93" r="7.4" fill="#22331a"/><circle cx="649" cy="89" r="3" fill="#ffffff"/><circle cx="642" cy="98.5" r="1.35" fill="#ffffff"/></g>',
    '<path d="M650,114 Q660,121 670,115" fill="none" stroke="#3f6e2c" stroke-width="3" stroke-linecap="round"/>',
    '<circle cx="669" cy="104" r="2" fill="#3f6e2c"/>',
    '<ellipse cx="629" cy="116" rx="8.5" ry="5" fill="#f1a0ab" opacity=".55"/>',
    '</svg>'
  ].join('');

  /* ── TRICERATOPS (new flat-style drawing) — REMOVED 2026-07 at the user's
        request: the flat-style redesign didn't read well next to the others, so
        only the ORIGINAL walker art (TRIKEC_SVG, below) ships as the trike. ── */

  /* ── TRICERATOPS — the ORIGINAL walker art (backgrounds/dinasours/tricera-walker.js),
        ported to the d2 engine: gait/blink classes renamed, defs ids d2-prefixed
        for per-instance isolation, palettes merged below. ── */
  var TRIKEC_SVG = '<svg class="d2svg" viewBox="20 20 770 345" ><defs><pattern id="d2tcScales" patternUnits="userSpaceOnUse" width="22" height="11"><path d="M0 11 A11 8 0 0 1 22 11" fill="none" stroke="#5f9447" stroke-width="1.4" opacity="0.45"></path><path d="M-11 5.5 A11 8 0 0 1 11 5.5" fill="none" stroke="#5f9447" stroke-width="1.4" opacity="0.45"></path><path d="M11 5.5 A11 8 0 0 1 33 5.5" fill="none" stroke="#5f9447" stroke-width="1.4" opacity="0.45"></path><path d="M0 9.6 A11 8 0 0 1 22 9.6" fill="none" stroke="#c4e6a3" stroke-width="1" opacity="0.55"></path><path d="M-11 4.1 A11 8 0 0 1 11 4.1" fill="none" stroke="#c4e6a3" stroke-width="1" opacity="0.55"></path><path d="M11 4.1 A11 8 0 0 1 33 4.1" fill="none" stroke="#c4e6a3" stroke-width="1" opacity="0.55"></path></pattern><linearGradient id="d2tcForm" x1="0" y1="0" x2="0" y2="1"><stop offset="0.05" stop-color="#eef4e0" stop-opacity="0.42"></stop><stop offset="0.30" stop-color="#eef4e0" stop-opacity="0"></stop><stop offset="0.56" stop-color="#3f6e2c" stop-opacity="0"></stop><stop offset="0.78" stop-color="#3f6e2c" stop-opacity="0.30"></stop></linearGradient><clipPath id="d2tcClip"><path d="M41 160 C41 160,70 172,100 169 C100 169,150 158,200 127 L290 71 L295 71 C295 71,345 35,420 55 C420 55,460 30,565 95 L576 95 L573 81 L583 78 L579 66 L594 67 L594 54 L607 54 L611 48 C611 48,613 40,620 50 L625 42 L630 46 L638 39 L645 45 L655 45 L658 55 L666 60 L663 70 L668 73 L666 75 L674 84 L670 89 L671 115 C671 115,675 130,686 132 L751 125 L784 118 C784 118,750 140,705 150 C705 150,703 155,708 160 C708 160,700 180,723 188 C723 188,733 193,768 183 C768 183,755 199,745 212 C745 212,753 214,751 230 C751 230,745 257,735 262 L728 253 C728 253,723 255,718 254 C718 254,698 250,685 239 C685 239,669 240,653 227 C653 227,620 215,575 233 C562 244,534 250,506 252 C480 250,360 256,309 250 C309 250,310 235,325 215 C325 215,315 211,300 195 C300 195,260 190,240 185 L160 199 C160 199,100 210,65 180 Z"></path></clipPath></defs><g class="leg lgA"><path d="M333 250 C331 288,332 322,334 335 C334 343,341.5 346,350 346 C358.5 346,366 343,366 335 C368 322,369 288,367 250 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path><path d="M344 338 L344 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M356 338 L356 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g><g class="leg lgB"><path d="M451 250 C449 288,450 322,452 335 C452 343,459.5 346,468 346 C476.5 346,484 343,484 335 C486 322,487 288,485 250 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path><path d="M462 338 L462 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M474 338 L474 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g><path d="M41 160 C41 160,70 172,100 169 C100 169,150 158,200 127 L290 71 L295 71 C295 71,345 35,420 55 C420 55,460 30,565 95 L576 95 L573 81 L583 78 L579 66 L594 67 L594 54 L607 54 L611 48 C611 48,613 40,620 50 L625 42 L630 46 L638 39 L645 45 L655 45 L658 55 L666 60 L663 70 L668 73 L666 75 L674 84 L670 89 L671 115 C671 115,675 130,686 132 L751 125 L784 118 C784 118,750 140,705 150 C705 150,703 155,708 160 C708 160,700 180,723 188 C723 188,733 193,768 183 C768 183,755 199,745 212 C745 212,753 214,751 230 C751 230,745 257,735 262 L728 253 C728 253,723 255,718 254 C718 254,698 250,685 239 C685 239,669 240,653 227 C653 227,620 215,575 233 C562 244,534 250,506 252 C480 250,360 256,309 250 C309 250,310 235,325 215 C325 215,315 211,300 195 C300 195,260 190,240 185 L160 199 C160 199,100 210,65 180 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><path d="M318 252 C390 256,470 252,536 256 C528 286,440 290,360 290 C332 290,322 272,318 252 Z" fill="#c4e6a3" stroke="none" opacity="0.4" clip-path="url(#d2tcClip)"></path><rect x="20" y="20" width="770" height="345" fill="url(#d2tcScales)" clip-path="url(#d2tcClip)"></rect><g clip-path="url(#d2tcClip)" fill="#6ea653" stroke="#3f6e2c" stroke-width="1.5" stroke-opacity="0.25" opacity="0.92"><path d="M248,168 C300,150 358,156 388,190 C412,216 396,250 348,254 C300,258 254,248 232,218 C216,196 222,180 248,168 Z"></path><path d="M148,178 C188,160 228,170 238,204 C246,230 220,252 182,252 C146,252 120,228 125,200 C128,184 132,186 148,178 Z"></path><path d="M434,168 C476,153 522,162 532,190 C542,214 516,230 478,226 C444,223 414,208 413,187 C411,173 422,172 434,168 Z"></path><path d="M300,138 C338,124 378,132 390,156 C399,174 380,188 350,186 C320,184 298,168 298,150 C298,143 296,144 300,138 Z"></path></g><rect x="20" y="20" width="770" height="345" fill="url(#d2tcForm)" clip-path="url(#d2tcClip)"></rect><g clip-path="url(#d2tcClip)" fill="#3f6e2c"><path d="M600,202 C638,197 674,208 678,233 C666,251 624,251 600,241 C586,231 590,208 600,202 Z" opacity="0.15"></path><ellipse cx="409" cy="251" rx="30" ry="15" opacity="0.13"></ellipse><ellipse cx="527" cy="251" rx="30" ry="15" opacity="0.13"></ellipse></g><g clip-path="url(#d2tcClip)"><path d="M108,164 C205,126 330,80 440,68 C470,65 460,84 410,90 C300,100 195,138 120,172 C112,170 109,167 108,164 Z" fill="#eef4e0" opacity="0.5"></path><path d="M300,256 C400,262 480,258 538,252 C534,266 440,276 330,272 C312,270 304,264 300,256 Z" fill="#c4e6a3" opacity="0.4"></path></g><path d="M676 116 C712 100,752 104,780 112 C752 126,712 130,686 126 C681 122,678 119,676 116 Z" fill="#76b65d" stroke="#3f6e2c" stroke-width="2.5" stroke-linejoin="round" opacity="0.85"></path><circle cx="702" cy="110" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle><circle cx="728" cy="107" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle><circle cx="752" cy="109" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle><circle cx="715" cy="120" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle><circle cx="740" cy="118" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle><path d="M735 194 C748 188,762 184,768 183 C766 190,757 200,745 210 C741 205,737 199,735 194 Z" fill="#eef4e0" stroke="none" opacity="0.7"></path><g class="leg lgB"><path d="M391 250 C389 288,390 324,392 337 C392 345,400.5 348,410 348 C419.5 348,428 345,428 337 C430 324,431 288,429 250 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><path d="M403 340 L403 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M417 340 L417 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g><g class="leg lgA"><path d="M509 250 C507 288,508 324,510 337 C510 345,518.5 348,528 348 C537.5 348,546 345,546 337 C548 324,549 288,547 250 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><path d="M521 340 L521 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M535 340 L535 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g><path d="M724 190 C733 188,755 184,768 183 C762 194,750 207,741 212 C735 208,726 202,724 190 Z" fill="#ffffff" stroke="#3f6e2c" stroke-width="3" stroke-linejoin="round"></path><ellipse cx="662" cy="216" rx="12" ry="7" fill="#f1a0ab" opacity="0.6"></ellipse><path d="M712,236 Q724,244 737,237" fill="none" stroke="#3f6e2c" stroke-width="3" stroke-linecap="round"></path><g><ellipse cx="660" cy="179" rx="26" ry="29" fill="#3f6e2c" opacity="0.16"></ellipse><g class="eye"><ellipse cx="662" cy="174" rx="21" ry="24" fill="#ffffff" stroke="#3f6e2c" stroke-width="3.5"></ellipse><circle cx="668" cy="178" r="11.5" fill="#22331a" stroke="none"></circle><circle cx="663" cy="166" r="4.8" fill="#ffffff" stroke="none"></circle><circle cx="673" cy="183" r="2.1" fill="#ffffff" stroke="none" opacity="0.85"></circle></g></g></svg>';

  /* ── STEGOSAURUS — new drawing: gentle arch, warm gradient plates,
        thagomizer tail spikes, sleepy low head with a big blush. ── */
  /* ── STEGOSAURUS — new drawing: raised spiked tail, gradient plates,
        round head. ── */
  var STEGO_SVG = [
    '<svg class="d2svg" viewBox="28 26 726 356">',
    '<defs>',
    '<linearGradient id="d2sgPlate" x1="0" y1="1" x2="0" y2="0">',
    '<stop offset="0" stop-color="#c8892e"/><stop offset=".45" stop-color="#ecb24f"/><stop offset="1" stop-color="#f9e07a"/>',
    '</linearGradient>',
    '<linearGradient id="d2sgForm" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#eef4e0" stop-opacity=".4"/>',
    '<stop offset=".32" stop-color="#eef4e0" stop-opacity="0"/>',
    '<stop offset=".78" stop-color="#3f6e2c" stop-opacity="0"/>',
    '<stop offset="1" stop-color="#3f6e2c" stop-opacity=".26"/>',
    '</linearGradient>',
    '<clipPath id="d2sgClip"><path d="M56,124 C96,140 138,176 172,216 C205,194 262,172 340,168 C428,164 508,188 558,230 C592,256 622,270 650,276 C684,272 712,286 718,310 C722,336 704,354 678,354 C652,354 638,342 632,326 C596,336 552,342 500,344 C420,350 330,344 268,336 C225,330 196,316 180,300 C150,272 112,240 92,196 C78,166 64,144 56,124 Z"/></clipPath>',
    '</defs>',
    '<path d="M62,156 C48,96 50,62 64,38 C80,56 86,104 80,154 Z" fill="#f6d28a" stroke="#3f6e2c" stroke-width="3.5" stroke-linejoin="round"/>',
    '<path d="M92,178 C84,116 92,80 108,62 C120,82 122,132 110,178 Z" fill="#f6d28a" stroke="#3f6e2c" stroke-width="3.5" stroke-linejoin="round"/>',
    '<g class="leg lgA"><path d="M262,282 L257,352 Q256,372 276,374 L288,374 Q304,374 302,356 L298,282 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4"/></g>',
    '<g class="leg lgB"><path d="M478,288 L473,354 Q472,374 492,376 L504,376 Q520,376 518,358 L514,288 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4"/></g>',
    '<path d="M148,246 Q146,190 172,180 Q194,196 186,254 Z" fill="url(#d2sgPlate)" stroke="#3f6e2c" stroke-width="3.5" stroke-linejoin="round"/>',
    '<path d="M212,220 Q208,146 246,128 Q280,148 272,222 Z" fill="url(#d2sgPlate)" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round"/>',
    '<path d="M294,198 Q292,116 336,98 Q374,120 364,200 Z" fill="url(#d2sgPlate)" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round"/>',
    '<path d="M386,192 Q386,106 430,90 Q466,114 454,198 Z" fill="url(#d2sgPlate)" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round"/>',
    '<path d="M470,212 Q472,130 510,116 Q542,138 530,230 Z" fill="url(#d2sgPlate)" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round"/>',
    '<path d="M548,244 Q552,174 582,164 Q606,184 596,266 Z" fill="url(#d2sgPlate)" stroke="#3f6e2c" stroke-width="3.5" stroke-linejoin="round"/>',
    '<path d="M622,280 Q628,222 652,216 Q668,234 658,290 Z" fill="url(#d2sgPlate)" stroke="#3f6e2c" stroke-width="3.5" stroke-linejoin="round"/>',
    '<path d="M56,124 C96,140 138,176 172,216 C205,194 262,172 340,168 C428,164 508,188 558,230 C592,256 622,270 650,276 C684,272 712,286 718,310 C722,336 704,354 678,354 C652,354 638,342 632,326 C596,336 552,342 500,344 C420,350 330,344 268,336 C225,330 196,316 180,300 C150,272 112,240 92,196 C78,166 64,144 56,124 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>',
    '<g clip-path="url(#d2sgClip)">',
    '<path d="M200,312 C300,352 480,354 610,320 L610,390 L190,390 Z" fill="#c4e6a3" opacity=".45"/>',
    '<ellipse cx="284" cy="292" rx="28" ry="12" fill="#3f6e2c" opacity=".13"/>',
    '<ellipse cx="500" cy="298" rx="28" ry="12" fill="#3f6e2c" opacity=".13"/>',
    '<path d="M280,216 C300,240 350,244 380,228 C372,264 310,268 280,216 Z" fill="#6ea653" opacity=".85"/>',
    '<path d="M440,248 C460,242 484,250 488,270 C472,284 446,278 440,248 Z" fill="#6ea653" opacity=".85"/>',
    '<path d="M152,238 C168,230 188,236 190,252 C178,264 156,258 152,238 Z" fill="#6ea653" opacity=".85"/>',
    '<rect x="28" y="26" width="726" height="356" fill="url(#d2sgForm)"/>',
    '<path d="M180,206 C270,172 400,166 540,216 C420,170 270,184 180,206 Z" fill="#eef4e0" opacity=".55"/>',
    '</g>',
    '<g class="leg lgB"><path d="M310,286 L306,354 Q306,376 326,378 L342,378 Q360,378 358,360 L354,286 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5"/><path d="M314,370 Q320,364 326,370 M332,370 Q338,364 344,370" fill="none" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round"/></g>',
    '<g class="leg lgA"><path d="M528,290 L524,356 Q524,378 544,380 L560,380 Q578,380 576,362 L572,290 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5"/><path d="M532,372 Q538,366 544,372 M550,372 Q556,366 562,372" fill="none" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round"/></g>',
    '<g class="eye"><circle cx="676" cy="310" r="12" fill="#ffffff" stroke="#3f6e2c" stroke-width="3"/><circle cx="679" cy="309" r="6.6" fill="#22331a"/><circle cx="682" cy="305.5" r="2.7" fill="#ffffff"/><circle cx="676" cy="313.5" r="1.2" fill="#ffffff"/></g>',
    '<path d="M694,332 Q702,338 710,332" fill="none" stroke="#3f6e2c" stroke-width="3" stroke-linecap="round"/>',
    '<ellipse cx="660" cy="332" rx="9" ry="5.5" fill="#f1a0ab" opacity=".7"/>',
    '</svg>'
  ].join('');

  /* ── STEGOSAURUS — the ORIGINAL walker art (stego-walker.js), ported the
        same way; improved: second eye sparkle added. ── */
  var STEGOC_SVG = '<svg class="d2svg" viewBox="20 20 780 350" ><defs><pattern id="d2scScales" patternUnits="userSpaceOnUse" width="22" height="11"><path d="M0 11 A11 8 0 0 1 22 11" fill="none" stroke="#5f9447" stroke-width="1.4" opacity="0.45"></path><path d="M-11 5.5 A11 8 0 0 1 11 5.5" fill="none" stroke="#5f9447" stroke-width="1.4" opacity="0.45"></path><path d="M11 5.5 A11 8 0 0 1 33 5.5" fill="none" stroke="#5f9447" stroke-width="1.4" opacity="0.45"></path><path d="M0 9.6 A11 8 0 0 1 22 9.6" fill="none" stroke="#c4e6a3" stroke-width="1" opacity="0.55"></path><path d="M-11 4.1 A11 8 0 0 1 11 4.1" fill="none" stroke="#c4e6a3" stroke-width="1" opacity="0.55"></path><path d="M11 4.1 A11 8 0 0 1 33 4.1" fill="none" stroke="#c4e6a3" stroke-width="1" opacity="0.55"></path></pattern><linearGradient id="d2scForm" x1="0" y1="0" x2="0" y2="1"><stop offset="0.05" stop-color="#eef4e0" stop-opacity="0.42"></stop><stop offset="0.30" stop-color="#eef4e0" stop-opacity="0"></stop><stop offset="0.56" stop-color="#3f6e2c" stop-opacity="0"></stop><stop offset="0.78" stop-color="#3f6e2c" stop-opacity="0.30"></stop></linearGradient><linearGradient id="d2scPlate" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#c8892e"></stop><stop offset="0.45" stop-color="#ecb24f"></stop><stop offset="1" stop-color="#f9e07a"></stop></linearGradient><clipPath id="d2scClip"><path d="M70 200 C120 192,185 175,250 150 C300 122,345 100,400 95 C465 89,520 100,560 120 C598 138,612 150,640 152 C652 132,664 112,690 106 C720 102,746 112,763 132 C773 144,773 160,762 170 C747 181,728 183,713 180 C700 194,684 202,660 207 C620 214,590 236,560 246 C460 263,360 266,265 258 C205 252,150 250,110 244 C86 240,66 232,60 216 C57 208,64 202,70 200 Z"></path></clipPath></defs><g class="leg lgA"><path d="M255 250 C253 288,254 322,256 335 C256 343,263.5 346,272 346 C280.5 346,289 343,289 335 C291 322,292 288,290 250 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path><circle cx="261" cy="346" r="4.5" fill="#6ea653" stroke="#3f6e2c" stroke-width="2"></circle><circle cx="272" cy="349" r="4.5" fill="#6ea653" stroke="#3f6e2c" stroke-width="2"></circle><circle cx="283" cy="346" r="4.5" fill="#6ea653" stroke="#3f6e2c" stroke-width="2"></circle></g><g class="leg lgB"><path d="M430 250 C428 288,429 322,431 335 C431 343,438.5 346,447 346 C455.5 346,464 343,464 335 C466 322,467 288,465 250 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path><circle cx="436" cy="346" r="4.5" fill="#6ea653" stroke="#3f6e2c" stroke-width="2"></circle><circle cx="447" cy="349" r="4.5" fill="#6ea653" stroke="#3f6e2c" stroke-width="2"></circle><circle cx="458" cy="346" r="4.5" fill="#6ea653" stroke="#3f6e2c" stroke-width="2"></circle></g><path d="M78,208 C72,184 72,160 82,144 C92,158 94,184 92,206 Z" fill="#f6d28a" stroke="#3f6e2c" stroke-width="3" stroke-linejoin="round"></path><path d="M102,206 C98,180 100,154 110,140 C120,154 122,182 118,204 Z" fill="#f6d28a" stroke="#3f6e2c" stroke-width="3" stroke-linejoin="round"></path><path d="M70 200 C120 192,185 175,250 150 C300 122,345 100,400 95 C465 89,520 100,560 120 C598 138,612 150,640 152 C652 132,664 112,690 106 C720 102,746 112,763 132 C773 144,773 160,762 170 C747 181,728 183,713 180 C700 194,684 202,660 207 C620 214,590 236,560 246 C460 263,360 266,265 258 C205 252,150 250,110 244 C86 240,66 232,60 216 C57 208,64 202,70 200 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><path d="M120 234 C300 262,470 262,575 246 C560 270,420 276,300 274 C210 272,150 252,120 234 Z" fill="#c4e6a3" stroke="none" opacity="0.4" clip-path="url(#d2scClip)"></path><rect x="20" y="20" width="780" height="350" fill="url(#d2scScales)" clip-path="url(#d2scClip)"></rect><g clip-path="url(#d2scClip)" fill="#6ea653" stroke="#3f6e2c" stroke-width="1.5" stroke-opacity="0.25" opacity="0.88"><path d="M148,185 C176,168 218,172 232,198 C244,218 228,244 200,248 C172,252 146,232 145,208 C144,196 145,190 148,185 Z"></path><path d="M282,158 C318,143 360,150 372,178 C383,202 364,228 334,230 C306,232 280,212 279,188 C278,174 280,164 282,158 Z"></path><path d="M418,164 C455,148 500,158 510,185 C520,208 498,228 464,226 C432,224 408,204 407,181 C406,168 410,168 418,164 Z"></path></g><rect x="20" y="20" width="780" height="350" fill="url(#d2scForm)" clip-path="url(#d2scClip)"></rect><g clip-path="url(#d2scClip)" fill="#3f6e2c"><ellipse cx="337" cy="255" rx="30" ry="13" opacity="0.13"></ellipse><ellipse cx="500" cy="255" rx="30" ry="13" opacity="0.13"></ellipse></g><g clip-path="url(#d2scClip)"><path d="M115,196 C200,158 310,112 420,100 C455,97 445,112 400,120 C295,134 190,168 130,200 C122,198 117,197 115,196 Z" fill="#eef4e0" opacity="0.48"></path><path d="M130,248 C310,268 470,268 570,248 C562,268 420,276 290,274 C218,272 162,258 130,248 Z" fill="#c4e6a3" opacity="0.4"></path></g><g fill="url(#d2scPlate)" stroke="#3f6e2c" stroke-width="3" stroke-linejoin="round"><path d="M129 193 C138.5 161.2,143 140,150 140 C157 140,161.6 156.6,171 181.5 Z"></path><path d="M204 171 C213.5 135,218 111,225 111 C232 111,236.6 129.2,246 156.5 Z"></path><path d="M278 140 C287.9 99.2,293 72,300 72 C307 72,312.1 91,322 119.6 Z"></path><path d="M348 110.3 C357.9 72.3,363 47,370 47 C377 47,382.1 68.7,392 101.25 Z"></path><path d="M416 99.2 C425.5 65.5,430 43,437 43 C444 43,448.6 65.4,458 99.1 Z"></path><path d="M480 101.3 C489 74.1,493 56,500 56 C507 56,511 77.6,520 110.1 Z"></path></g><g fill="#f6d28a" stroke="none"><ellipse cx="300" cy="80" rx="5" ry="8"></ellipse><ellipse cx="370" cy="55" rx="5" ry="8"></ellipse><ellipse cx="437" cy="51" rx="5" ry="8"></ellipse></g><g class="leg lgB"><path d="M320 250 C318 288,319 324,321 337 C321 345,328.5 348,337 348 C345.5 348,353 345,353 337 C355 324,356 288,354 250 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><circle cx="326" cy="348" r="4.5" fill="#8cc777" stroke="#3f6e2c" stroke-width="2"></circle><circle cx="337" cy="351" r="4.5" fill="#8cc777" stroke="#3f6e2c" stroke-width="2"></circle><circle cx="348" cy="348" r="4.5" fill="#8cc777" stroke="#3f6e2c" stroke-width="2"></circle></g><g class="leg lgA"><path d="M500 250 C498 288,499 324,501 337 C501 345,508.5 348,517 348 C525.5 348,533 345,533 337 C535 324,536 288,534 250 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><circle cx="506" cy="348" r="4.5" fill="#8cc777" stroke="#3f6e2c" stroke-width="2"></circle><circle cx="517" cy="351" r="4.5" fill="#8cc777" stroke="#3f6e2c" stroke-width="2"></circle><circle cx="528" cy="348" r="4.5" fill="#8cc777" stroke="#3f6e2c" stroke-width="2"></circle></g><g><ellipse cx="702" cy="172" rx="13" ry="8" fill="#f1a0ab" opacity="0.8" stroke="none"></ellipse><g class="eye"><ellipse cx="716" cy="150" rx="21" ry="23" fill="#ffffff" stroke="#3f6e2c" stroke-width="3.5"></ellipse><circle cx="722" cy="155" r="11" fill="#22331a" stroke="none"></circle><circle cx="711" cy="145" r="4.5" fill="#ffffff" stroke="none"></circle><circle cx="728" cy="161" r="2" fill="#ffffff" stroke="none" opacity="0.85"></circle></g><g stroke="#3f6e2c" stroke-width="3" stroke-linecap="round" fill="none"><line x1="703" y1="128" x2="699" y2="119"></line><line x1="716" y1="125" x2="714" y2="115"></line><line x1="729" y1="128" x2="731" y2="119"></line></g><path d="M698 126 C710 119,728 119,740 127" fill="none" stroke="#3f6e2c" stroke-width="4" stroke-linecap="round"></path><circle cx="757" cy="158" r="3.2" fill="#3f6e2c" stroke="none"></circle><path d="M736 168 C744 176,758 175,765 165" fill="none" stroke="#3f6e2c" stroke-width="3.5" stroke-linecap="round"></path></g></svg>';

  /* ── T-REX — new SVG drawing (the old one was CSS shapes): giant happy
        head with an open smiling mouth, teeth drawn INTO the head group so
        they can never drift off the jaw, tiny two-finger arms. ── */
  var TREX_SVG = [
    '<svg class="d2svg" viewBox="30 40 545 392">',
    '<defs>',
    '<linearGradient id="d2txForm" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#eef4e0" stop-opacity=".4"/>',
    '<stop offset=".3" stop-color="#eef4e0" stop-opacity="0"/>',
    '<stop offset=".8" stop-color="#3f6e2c" stop-opacity="0"/>',
    '<stop offset="1" stop-color="#3f6e2c" stop-opacity=".24"/>',
    '</linearGradient>',
    '</defs>',
    /* far leg (behind) */
    '<g class="leg lgA"><path d="M254,304 C230,310 218,334 224,362 C228,386 240,400 248,408 L246,420 L294,420 L290,406 C300,378 302,344 292,324 C282,306 266,300 254,304 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4"/></g>',
    /* head + body + tail — one silhouette with the open-mouth notch */
    '<path d="M368,92 C390,58 448,48 494,66 C530,80 552,108 558,138 C562,152 558,164 546,166 L458,176 C450,177 446,182 447,189 C448,196 454,201 462,204 C468,206 496,210 508,220 C514,232 506,244 490,244 C462,244 436,234 420,222 C413,244 409,264 407,284 C403,318 385,348 351,362 C321,374 283,374 259,364 C243,357 227,344 219,326 C186,328 124,318 72,290 C52,280 50,262 66,252 C122,260 182,256 230,248 C252,244 268,238 280,226 C292,192 310,148 340,114 C348,102 358,95 368,92 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>',
    /* mouth interior + tongue + teeth — all drawn with the head so they can never drift */
    '<path d="M458,176 L546,166 C552,180 544,194 524,200 C504,206 474,204 462,198 C452,192 450,182 458,176 Z" fill="#a5486b"/>',
    '<ellipse cx="505" cy="190" rx="19" ry="7.5" fill="#f1a0ab" transform="rotate(8 505 190)"/>',
    '<path d="M534,168 L531,184 Q536,189 541,183 L542,168 Z" fill="#ffffff" stroke="#3f6e2c" stroke-width="2.2" stroke-linejoin="round"/>',
    '<path d="M508,171 L505,187 Q510,192 515,186 L516,171 Z" fill="#ffffff" stroke="#3f6e2c" stroke-width="2.2" stroke-linejoin="round"/>',
    '<path d="M482,174 L479,189 Q484,194 489,188 L490,174 Z" fill="#ffffff" stroke="#3f6e2c" stroke-width="2.2" stroke-linejoin="round"/>',
    '<path d="M472,203 L475,192 Q480,188 484,194 L482,205 Z" fill="#ffffff" stroke="#3f6e2c" stroke-width="2.2" stroke-linejoin="round"/>',
    '<path d="M496,209 L499,198 Q504,194 508,200 L506,212 Z" fill="#ffffff" stroke="#3f6e2c" stroke-width="2.2" stroke-linejoin="round"/>',
    /* belly + rim light */
    '<path d="M280,258 C296,310 340,336 390,314 C374,352 308,366 268,338 C254,314 264,282 280,258 Z" fill="#c4e6a3" opacity=".5"/>',
    '<path d="M382,92 C412,68 460,62 498,78 C456,60 410,70 382,92 Z" fill="#eef4e0" opacity=".55"/>',
    /* near arm — shoulder starts inside the torso; body-color interior melts
       into the chest so only a clean outlined limb shows */
    '<path d="M394,234 C392,248 397,260 408,266 C415,270 423,270 429,266" fill="none" stroke="#3f6e2c" stroke-width="16" stroke-linecap="round"/>',
    '<path d="M392,230 C391,247 397,260 408,266 C415,270 423,270 430,266" fill="none" stroke="#8cc777" stroke-width="9.5" stroke-linecap="round"/>',
    '<path d="M430,267 L440,272 M431,260 L442,258" fill="none" stroke="#3f6e2c" stroke-width="3.5" stroke-linecap="round"/>',
    /* near leg — big drumstick + toed foot */
    '<g class="leg lgB"><path d="M318,308 C290,314 276,340 282,370 C287,394 300,408 310,416 L308,424 L360,424 L356,412 C368,382 370,344 358,324 C348,306 332,302 318,308 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5"/><path d="M318,418 Q325,411 332,418 M338,418 Q345,411 352,418" fill="none" stroke="#3f6e2c" stroke-width="2.6" stroke-linecap="round"/></g>',
    /* face */
    '<g class="eye"><circle cx="466" cy="118" r="15.5" fill="#ffffff" stroke="#3f6e2c" stroke-width="3"/><circle cx="470" cy="117" r="8" fill="#22331a"/><circle cx="474" cy="112.5" r="3.2" fill="#ffffff"/><circle cx="465" cy="122" r="1.4" fill="#ffffff"/></g>',
    '<path d="M444,90 Q464,82 484,88" fill="none" stroke="#3f6e2c" stroke-width="3.5" stroke-linecap="round"/>',
    '<circle cx="538" cy="132" r="2.4" fill="#3f6e2c"/>',
    '<ellipse cx="498" cy="146" rx="9" ry="5.5" fill="#f1a0ab" opacity=".6"/>',
    '</svg>'
  ].join('');

  /* ── PTERODACTYL — the flyer. Warm coral colours (its own hex family),
        two wing groups hinged at the shoulder for the flap. ── */
  var PTERO_SVG = [
    '<svg class="d2svg d2ptero" viewBox="30 20 480 260">',
    /* far wing — membrane widest at the body, tapering to the tip; darker */
    '<g class="wing wingF"><path d="M288,146 C252,100 190,58 106,40 C150,92 186,124 216,148 C238,164 262,172 284,170 C292,166 294,156 288,146 Z" fill="#d97c50" stroke="#8a4b2c" stroke-width="4" stroke-linejoin="round"/></g>',
    /* body — one integrated teardrop torso flowing down from the head */
    '<path d="M330,132 C300,134 258,158 240,188 C230,208 238,226 260,229 C292,233 320,219 334,196 C346,177 348,148 330,132 Z" fill="#f4b183" stroke="#8a4b2c" stroke-width="4.5" stroke-linejoin="round"/>',
    '<path d="M250,204 C268,218 300,219 318,204 C306,226 262,228 250,204 Z" fill="#ffd9b8" opacity=".85"/>',
    /* tucked little legs — short nubs against the belly */
    '<path d="M266,226 C263,232 262,237 262,241 M284,222 C282,228 281,233 281,237" fill="none" stroke="#8a4b2c" stroke-width="3.5" stroke-linecap="round"/>',
    /* head */
    '<circle cx="336" cy="122" r="27" fill="#f4b183" stroke="#8a4b2c" stroke-width="4.5"/>',
    /* long swept-back crest */
    '<path d="M322,100 C302,70 270,54 236,50 C262,72 292,96 314,118 Z" fill="#e6647a" stroke="#8a4b2c" stroke-width="3.5" stroke-linejoin="round"/>',
    /* wedge beak */
    '<path d="M356,104 L440,124 C448,128 448,138 438,142 L356,146 Z" fill="#ffd9b8" stroke="#8a4b2c" stroke-width="3.5" stroke-linejoin="round"/>',
    '<path d="M360,126 L424,131" fill="none" stroke="#8a4b2c" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>',
    /* face — big sparkly eye */
    '<g class="eye"><circle cx="340" cy="116" r="9.5" fill="#ffffff" stroke="#8a4b2c" stroke-width="2.6"/><circle cx="342.5" cy="115" r="5" fill="#3a2417"/><circle cx="344.5" cy="112.5" r="2" fill="#ffffff"/><circle cx="340" cy="118.5" r="0.9" fill="#ffffff"/></g>',
    '<ellipse cx="329" cy="134" rx="6" ry="4" fill="#e6647a" opacity=".5"/>',
    /* near wing — membrane anchored along the body side, widest at the root,
       tapering to a pointed wingtip; one arm-bone line on the leading edge */
    '<g class="wing wingN"><path d="M298,148 C258,102 190,60 100,46 C146,100 186,134 220,160 C244,178 272,186 294,182 C306,176 308,160 298,148 Z" fill="#e78a5f" stroke="#8a4b2c" stroke-width="4.5" stroke-linejoin="round"/><path d="M296,150 C258,106 204,72 150,56" fill="none" stroke="#8a4b2c" stroke-width="3" stroke-linecap="round" opacity=".55"/></g>',
    '</svg>'
  ].join('');

  /* ── NEST EGG — spotted egg in a twig nest; the lid pops open and a baby
        long-neck peeks out (the baby rises from BEHIND the shell, so no
        clipping tricks are needed). ── */
  var EGG_SVG = [
    '<svg class="d2svg" viewBox="0 0 150 158">',
    /* baby (behind everything, rises above the shell when hatching) */
    '<g class="d2baby">',
    '<path d="M75,96 C73,76 74,58 80,44 C84,32 94,26 104,28 C114,30 120,40 118,50 C116,58 108,62 100,60 C96,72 94,84 94,96 Z" fill="#5bc4a3" stroke="#2b6e58" stroke-width="3.5" stroke-linejoin="round"/>',
    '<g class="eye"><circle cx="106" cy="42" r="5.5" fill="#ffffff" stroke="#2b6e58" stroke-width="2"/><circle cx="107.5" cy="41.5" r="2.9" fill="#173d30"/><circle cx="108.8" cy="40" r="1.1" fill="#ffffff"/></g>',
    '<path d="M112,52 Q116,55 120,52" fill="none" stroke="#2b6e58" stroke-width="2" stroke-linecap="round"/>',
    '<ellipse cx="100" cy="52" rx="3.5" ry="2.2" fill="#f1a0ab" opacity=".6"/>',
    '</g>',
    /* egg bottom */
    '<path class="d2eggBtm" d="M39,86 L111,86 C111,112 96,128 75,128 C54,128 39,112 39,86 Z" fill="#fdf3e3" stroke="#b98f68" stroke-width="3.5" stroke-linejoin="round"/>',
    '<ellipse cx="60" cy="104" rx="7" ry="5" fill="#e3cfae"/>',
    '<ellipse cx="90" cy="110" rx="5.5" ry="4" fill="#e3cfae"/>',
    /* egg lid (top) — hinged at the left crack point */
    '<g class="d2eggLid">',
    '<path d="M39,88 C39,56 52,30 75,30 C98,30 111,56 111,88 L97,80 L86,90 L74,78 L61,90 L50,80 Z" fill="#fdf3e3" stroke="#b98f68" stroke-width="3.5" stroke-linejoin="round"/>',
    '<ellipse cx="70" cy="52" rx="8" ry="6" fill="#e3cfae"/>',
    '<ellipse cx="92" cy="64" rx="5.5" ry="4" fill="#e3cfae"/>',
    '</g>',
    /* nest */
    '<ellipse cx="75" cy="128" rx="58" ry="21" fill="#8a5f3a" stroke="#6f4a2a" stroke-width="3"/>',
    '<path d="M22,124 Q42,110 75,110 Q108,110 128,124" fill="none" stroke="#a97c50" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M30,132 Q55,120 80,124 M70,134 Q95,122 120,128" fill="none" stroke="#6f4a2a" stroke-width="3" stroke-linecap="round" opacity=".7"/>',
    '</svg>'
  ].join('');

  /* ── ROLLING egg — a spotted egg that tumbles across the grass (ported in
        spirit from the old bg's BabyTrexEgg.roll). Centered viewBox so the
        spin layer rotates it about its middle = looks like it rolls. ── */
  var ROLLEGG_SVG = [
    '<svg class="d2rollsvg" viewBox="-60 -74 120 148">',
    '<ellipse cx="0" cy="4" rx="42" ry="52" fill="#fdf3e3" stroke="#b98f68" stroke-width="4"/>',
    '<ellipse cx="-15" cy="-10" rx="9" ry="7" fill="#e3cfae"/>',
    '<ellipse cx="13" cy="12" rx="7" ry="5.5" fill="#e3cfae"/>',
    '<ellipse cx="4" cy="-30" rx="6" ry="4.6" fill="#e3cfae"/>',
    '<ellipse cx="-10" cy="26" rx="6.5" ry="5" fill="#e3cfae"/>',
    '<ellipse cx="-17" cy="-30" rx="11" ry="6.5" fill="#ffffff" opacity=".5"/>',
    '</svg>'
  ].join('');

  /* ── CSS — injected once, everything namespaced d2 ───────────────────── */
  var CSS = [
    '.d2w{position:absolute;left:0;bottom:0;pointer-events:none;will-change:transform}',
    '.d2w .d2act{display:inline-block;height:100%;vertical-align:top}',
    '.d2w svg.d2svg{height:100%;width:auto;display:block;overflow:visible}',
    '.d2w.d2flip svg.d2svg{transform:scaleX(-1)}',
    '.d2w .d2shadow{position:absolute;left:50%;bottom:-1%;width:76%;height:9%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.28),transparent 72%)}',
    /* diagonal gait — far-back+near-front vs far-front+near-back */
    '.d2w svg .leg{transform-box:fill-box;transform-origin:50% 6%}',
    '.d2w svg .lgA{animation:d2GaitA calc(1s*var(--gait,1)) ease-in-out infinite}',
    '.d2w svg .lgB{animation:d2GaitB calc(1s*var(--gait,1)) ease-in-out infinite}',
    '@keyframes d2GaitA{0%,100%{transform:rotate(7deg)}50%{transform:rotate(-7deg)}}',
    '@keyframes d2GaitB{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}',
    /* blink */
    '.d2w svg .eye{transform-box:fill-box;transform-origin:50% 50%;animation:d2Blink 3.4s ease-in-out infinite}',
    '@keyframes d2Blink{0%,86%,93%,100%{transform:scaleY(1)}89.5%{transform:scaleY(.08)}}',
    /* pterodactyl wing flap — hinged at the shoulder (viewBox coords) */
    '.d2w svg .wing{transform-box:view-box}',
    '.d2w svg .wingN{transform-origin:284px 168px;animation:d2FlapN calc(.9s*var(--gait,1)) ease-in-out infinite}',
    '.d2w svg .wingF{transform-origin:276px 162px;animation:d2FlapF calc(.9s*var(--gait,1)) ease-in-out infinite}',
    '@keyframes d2FlapN{0%,100%{transform:rotate(14deg)}50%{transform:rotate(-22deg)}}',
    '@keyframes d2FlapF{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(10deg)}}',
    /* egg */
    '.d2egg{position:absolute;pointer-events:none}',
    '.d2egg svg.d2svg{height:100%;width:auto;display:block;overflow:visible}',
    '.d2egg .d2eggLid{transform-box:view-box;transform-origin:42px 86px}',
    '.d2egg .d2baby{transform-box:view-box;opacity:0}',
    '.d2egg.d2wob{animation:d2Wobble .9s ease-in-out}',
    '@keyframes d2Wobble{0%,100%{transform:rotate(0)}25%{transform:rotate(-5deg)}55%{transform:rotate(4deg)}80%{transform:rotate(-2deg)}}',
    /* rolling egg — wrapper translates across, inner spin layer tumbles */
    '.d2roll{position:absolute;bottom:0;pointer-events:none;will-change:transform}',
    '.d2roll .d2rollspin{height:100%;transform-box:border-box;transform-origin:50% 50%}',
    '.d2roll svg{display:block;height:100%;width:auto;overflow:visible}',
    '.d2rheart{position:absolute;pointer-events:none;z-index:9;opacity:0;transform:translate(-50%,-50%)}',
    /* scene svg fills the stage — nothing in the decorative backdrop should be
       text-selectable (the volcano countdown must not turn blue on drag) */
    '.d2scene{position:absolute;inset:0;overflow:hidden;user-select:none;-webkit-user-select:none;-moz-user-select:none}',
    '.d2scene svg{display:block;width:100%;height:100%}',
    '.d2scene .d2tw{transform-box:fill-box;transform-origin:50% 50%}',
    '.d2scene .d2blade{transform-box:fill-box;transform-origin:50% 100%}',
    '.d2scene .d2fern{transform-box:fill-box;transform-origin:50% 100%}',
    /* ambient butterflies — a small drifting sprite; wings flutter fast */
    '.d2fly{position:absolute;pointer-events:none;will-change:transform}',
    '.d2fly svg{display:block;width:100%;height:auto;overflow:visible}',
    '.d2fly .bfw{transform-box:fill-box}',
    '.d2fly .bfwL{transform-origin:100% 50%;animation:d2Flut .2s ease-in-out infinite}',
    '.d2fly .bfwR{transform-origin:0% 50%;animation:d2Flut .2s ease-in-out infinite}',
    '@keyframes d2Flut{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.35)}}',
    /* meteor overlay */
    '.d2night{position:absolute;inset:0;z-index:40;pointer-events:none;opacity:0;transition:opacity .8s ease;background:linear-gradient(to bottom,#0b0524,#2c0f56)}',
    '.d2night svg{display:block;width:100%;height:100%}'
  ].join('\n');

  function injectCSS() {
    if (doc.getElementById('dino2-css')) return;
    var s = el('style');
    s.id = 'dino2-css';
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  /* ── species table ───────────────────────────────────────────────────── */
  var SPECIES = {
    bronto: { svg: BRONTO_SVG, h: 30, b: 2.5, bob: 5 },
    stego:  { svg: STEGO_SVG,  h: 23, b: 2.6, bob: 5 },
    trikec: { svg: TRIKEC_SVG, h: 23, b: 2.8, bob: 6 },   // the ORIGINAL walker (the only triceratops)
    stegoc: { svg: STEGOC_SVG, h: 22, b: 2.6, bob: 5 },
    trex:   { svg: TREX_SVG,   h: 27, b: 2.2, bob: 7 }
  };

  /* ── walker engine — WAAPI crossing with a sine bob, exactly the proven
        recipe: measure after append, park off-screen, flip for rtl. ── */
  var liveWalkers = [];   // every on-stage walker (for clicks + meteor flee)

  /* keep the scene calm: at most MAX_GROUND_DINOS ground dinos + 1 pterodactyl
     on stage at once (the flyer is the egg-layer, so it's counted separately) */
  var MAX_GROUND_DINOS = 2;
  function groundCount() {
    var n = 0, i;
    for (i = 0; i < liveWalkers.length; i++) if (liveWalkers[i].species !== 'ptero') n++;
    return n;
  }
  function pteroCount() {
    var n = 0, i;
    for (i = 0; i < liveWalkers.length; i++) if (liveWalkers[i].species === 'ptero') n++;
    return n;
  }

  var UID = 0;   // per-instance defs-id suffix — two same-species walkers with
                 // different palettes must NOT share gradient ids (url(#…) is
                 // document-wide first-match, so shading would cross-contaminate)
  function buildWalker(species, opts) {
    var sp = SPECIES[species];
    var wrap = el('div', 'd2w');
    wrap.style.height = opts.height || (sp.h + '%');
    wrap.style.bottom = opts.bottom || (sp.b + '%');
    wrap.style.zIndex = opts.zIndex != null ? opts.zIndex : 6;
    wrap.style.setProperty('--gait', String(opts.gait || rnd(0.82, 1.22)));
    wrap.style.transform = 'translateX(-99999px)';   // measurable, not visible
    var act = el('div', 'd2act');
    var uid = ++UID;
    var markup = applyPal(sp.svg, opts.palette || 'green')
      .replace(/d2(?:br|tk|sg|tx|tc|sc)(?:Form|Clip|Plate|Scales)/g, function (m) { return m + '_' + uid; });
    act.appendChild(parseSVG(markup));
    act.style.transformOrigin = '50% 100%';   // click reactions pivot at the feet
    var shadow = el('div', 'd2shadow');
    wrap.appendChild(shadow);
    wrap.appendChild(act);
    wrap._act = act;
    wrap._species = species;
    wrap._uid = uid;                              // needed to rebuild markup on recolor
    wrap._palette = opts.palette || 'green';
    return wrap;
  }

  /* walker palette cycle for click-recolour (ptero uses PTERO_PAL_NAMES) */
  var WALKER_PALS = ['green', 'pink', 'teal'];
  /* ── recolour on click — rebuild the SVG markup in a DIFFERENT palette and
        swap it in. Cheap: the crossing (wrap) and reaction (act) animations are
        untouched — only the inner <svg> is replaced, so motion keeps playing. ── */
  function recolor(inst) {
    var wrap = inst && inst.element;
    if (!wrap || !wrap._act) return;
    var isPtero = wrap._species === 'ptero';
    var names = isPtero ? PTERO_PAL_NAMES : WALKER_PALS;
    var cur = wrap._palette || names[0];
    var others = [], i;
    for (i = 0; i < names.length; i++) if (names[i] !== cur) others.push(names[i]);
    var next = others.length ? others[irnd(0, others.length - 1)] : cur;
    var markup;
    if (isPtero) {
      markup = applyPteroPal(PTERO_SVG, next);
    } else {
      markup = applyPal(SPECIES[wrap._species].svg, next)
        .replace(/d2(?:br|tk|sg|tx|tc|sc)(?:Form|Clip|Plate|Scales)/g, function (m) { return m + '_' + wrap._uid; });
    }
    var oldSvg = wrap._act.querySelector('svg.d2svg');
    var newSvg = parseSVG(markup);
    if (oldSvg && oldSvg.parentNode) oldSvg.parentNode.replaceChild(newSvg, oldSvg);
    else wrap._act.appendChild(newSvg);
    wrap._palette = next;
  }

  function walk(container, species, opts) {
    if (!container) return null;
    opts = opts || {};
    injectCSS();
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    var wrap = buildWalker(species, opts);
    container.appendChild(wrap);
    var ew = wrap.offsetWidth || container.clientHeight * 0.6 || 300;
    var cw = container.clientWidth || 800;
    var margin = Math.max(40, ew * 0.3);
    var ltr = (opts.direction || 'ltr') === 'ltr';
    if (!ltr) wrap.classList.add('d2flip');
    var x0 = ltr ? -ew - margin : cw + margin;
    var x1 = ltr ? cw + margin : -ew - margin;
    var dur = opts.duration || 15000;
    var bob = opts.bob != null ? opts.bob : SPECIES[species].bob;
    var cycles = Math.max(4, Math.round(dur / 760));
    var steps = 48, frames = [], i, f;
    for (i = 0; i <= steps; i++) {
      f = i / steps;
      frames.push({ transform: 'translateX(' + (x0 + (x1 - x0) * f) + 'px) translateY(' +
        (-Math.abs(Math.sin(f * Math.PI * cycles)) * bob) + 'px)' });
    }
    var inst = { element: wrap, species: species, stopped: false };
    function end() {
      if (inst.stopped) return;
      inst.stopped = true;
      var ix = liveWalkers.indexOf(inst);
      if (ix >= 0) liveWalkers.splice(ix, 1);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (opts.onDone) opts.onDone();
    }
    var anim = animate(wrap, frames, { duration: dur, easing: 'linear', fill: 'forwards' });
    if (anim) {
      inst.animation = anim;
      anim.onfinish = end;
    } else {
      wrap.style.transform = 'translateX(' + x1 + 'px)';
      setTimeout(end, dur);
    }
    inst.stop = function () {
      try { if (anim) anim.cancel(); } catch (e) {}
      end();
    };
    liveWalkers.push(inst);
    return inst;
  }

  /* pterodactyl flight — same engine but airborne: `top` positioning and a
     sine WAVE (not a bob) so it glides. */
  function fly(container, opts) {
    if (!container) return null;
    opts = opts || {};
    injectCSS();
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    var wrap = el('div', 'd2w');
    wrap.style.height = opts.height || '15%';
    wrap.style.bottom = 'auto';
    wrap.style.top = opts.top || (rnd(6, 20) + '%');
    wrap.style.zIndex = opts.zIndex != null ? opts.zIndex : 4;
    wrap.style.setProperty('--gait', String(rnd(0.85, 1.2)));
    wrap.style.transform = 'translateX(-99999px)';
    var act = el('div', 'd2act');
    act.appendChild(parseSVG(applyPteroPal(PTERO_SVG, opts.palette || 'coral')));
    act.style.transformOrigin = '50% 50%';   // flyer pops from its centre
    wrap.appendChild(act);
    wrap._act = act;
    wrap._species = 'ptero';
    wrap._palette = opts.palette || 'coral';
    container.appendChild(wrap);
    var ew = wrap.offsetWidth || 260;
    var cw = container.clientWidth || 800;
    var margin = Math.max(40, ew * 0.3);
    var ltr = (opts.direction || 'ltr') === 'ltr';
    if (!ltr) wrap.classList.add('d2flip');
    var x0 = ltr ? -ew - margin : cw + margin;
    var x1 = ltr ? cw + margin : -ew - margin;
    var dur = opts.duration || 24000;
    var amp = 34, waves = 3.5;
    var steps = 60, frames = [], i, f;
    for (i = 0; i <= steps; i++) {
      f = i / steps;
      frames.push({ transform: 'translateX(' + (x0 + (x1 - x0) * f) + 'px) translateY(' +
        (Math.sin(f * Math.PI * 2 * waves) * amp) + 'px)' });
    }
    var inst = { element: wrap, species: 'ptero', stopped: false };
    function end() {
      if (inst.stopped) return;
      inst.stopped = true;
      var ix = liveWalkers.indexOf(inst);
      if (ix >= 0) liveWalkers.splice(ix, 1);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (opts.onDone) opts.onDone();
    }
    var anim = animate(wrap, frames, { duration: dur, easing: 'linear', fill: 'forwards' });
    if (anim) { inst.animation = anim; anim.onfinish = end; }
    else { wrap.style.transform = 'translateX(' + x1 + 'px)'; setTimeout(end, dur); }
    inst.stop = function () { try { if (anim) anim.cancel(); } catch (e) {} end(); };
    liveWalkers.push(inst);
    return inst;
  }

  /* ── click reactions — a SPECIES-SPECIFIC move on the action layer, plus
        floating hearts. Each entry is [keyframes, durationMs]; the _act layer
        pivots at its feet (transform-origin 50% 100%, set in buildWalker/fly)
        so rotations read as the whole body leaning. ── */
  var REACTIONS = {
    /* long-neck bob — dips forward and springs back */
    bronto: [[{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-9px) rotate(-3deg)', offset: 0.4 }, { transform: 'translateY(0) rotate(0)' }], 640],
    /* triceratops head-butt — a quick downward horn lunge */
    trikec: [[{ transform: 'rotate(0) translateY(0)' }, { transform: 'rotate(-6deg) translateY(3px)', offset: 0.32 }, { transform: 'rotate(1deg)', offset: 0.6 }, { transform: 'rotate(0)' }], 520],
    /* stegosaurus shimmy — plates/tail wag side to side */
    stego: [[{ transform: 'rotate(0)' }, { transform: 'rotate(-2.6deg)', offset: 0.25 }, { transform: 'rotate(2.6deg)', offset: 0.6 }, { transform: 'rotate(-1.4deg)', offset: 0.82 }, { transform: 'rotate(0)' }], 660],
    /* T-Rex chomp + mini-roar — squash then a proud pop */
    trex: [[{ transform: 'scaleY(1) scaleX(1)' }, { transform: 'scaleY(.88) scaleX(1.05) translateY(6px)', offset: 0.3 }, { transform: 'scaleY(1.06) scaleX(.97)', offset: 0.62 }, { transform: 'scaleY(1) scaleX(1)' }], 540],
    /* pterodactyl flap-dash — pops upward with a wing surge */
    ptero: [[{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-16px) scale(1.07)', offset: 0.4 }, { transform: 'translateY(0) scale(1)' }], 560]
  };
  REACTIONS.stegoc = REACTIONS.stego;

  function reactHop(inst) {
    var act = inst.element && inst.element._act;
    if (!act || inst.element._busy || !act.animate) return;
    inst.element._busy = true;
    var r = REACTIONS[inst.element._species] || REACTIONS.bronto;
    var a = act.animate(r[0], { duration: r[1], easing: 'ease-out' });
    a.onfinish = function () { inst.element._busy = false; };
    setTimeout(function () { inst.element._busy = false; }, r[1] + 160);
    recolor(inst);            // every click also shifts it to a new colour
    if (inst.element._species === 'ptero') flapBurst(inst.element);  // wings surge (on the new SVG)
    fireHearts(inst.element);
  }
  /* briefly speed the pterodactyl's wing-flap CSS animation for a click dash */
  function flapBurst(wrap) {
    var wings = wrap.querySelectorAll('svg .wing');
    for (var i = 0; i < wings.length; i++) wings[i].style.setProperty('--gait', '0.4');
    setTimeout(function () {
      for (var j = 0; j < wings.length; j++) wings[j].style.removeProperty('--gait');
    }, 700);
  }
  function heartD(cx, cy, s) {
    return 'M' + cx + ',' + (cy + s * 0.9) +
      ' C' + (cx - s * 1.3) + ',' + (cy - s * 0.2) + ' ' + (cx - s * 0.6) + ',' + (cy - s) + ' ' + cx + ',' + (cy - s * 0.35) +
      ' C' + (cx + s * 0.6) + ',' + (cy - s) + ' ' + (cx + s * 1.3) + ',' + (cy - s * 0.2) + ' ' + cx + ',' + (cy + s * 0.9) + ' Z';
  }
  function fireHearts(wrap) {
    var svg = wrap.querySelector('svg.d2svg');
    if (!svg) return;
    var vb = svg.viewBox.baseVal;
    var n = irnd(2, 3), i, p, a;
    for (i = 0; i < n; i++) {
      p = svgEl('path', { d: heartD(vb.x + vb.width * rnd(0.55, 0.85), vb.y + vb.height * 0.22, rnd(11, 17)), fill: '#e6647a', opacity: '0' });
      p.style.transformBox = 'fill-box';
      p.style.transformOrigin = '50% 50%';
      svg.appendChild(p);
      a = animate(p, [
        { transform: 'translateY(0) scale(.5)', opacity: 0 },
        { transform: 'translateY(-26px) scale(1)', opacity: 0.9, offset: 0.35 },
        { transform: 'translateY(-64px) scale(1.15)', opacity: 0 }
      ], { duration: rnd(1100, 1500), delay: i * 140, easing: 'ease-out' });
      (function (node) {
        if (a) a.onfinish = function () { if (node.parentNode) node.parentNode.removeChild(node); };
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1900);
      })(p);
    }
  }

  /* ── nest egg module ─────────────────────────────────────────────────── */
  function placeEgg(container, opts) {
    opts = opts || {};
    injectCSS();
    var wrap = el('div', 'd2egg');
    wrap.style.height = opts.height || '13%';
    wrap.style.left = opts.left || '20%';
    wrap.style.bottom = opts.bottom || '3%';
    wrap.style.zIndex = opts.zIndex != null ? opts.zIndex : 5;
    wrap.appendChild(parseSVG(EGG_SVG));
    container.appendChild(wrap);
    var lid = wrap.querySelector('.d2eggLid');
    var baby = wrap.querySelector('.d2baby');
    var st = { wrap: wrap, hatching: false, timers: [] };
    function wobble() {
      wrap.classList.remove('d2wob');
      void wrap.offsetWidth;   // restart the CSS animation
      wrap.classList.add('d2wob');
    }
    function hatch() {
      if (st.hatching || !lid.animate) return;
      st.hatching = true;
      wobble();
      st.timers.push(setTimeout(function () {
        lid.animate(
          [{ transform: 'rotate(0)' }, { transform: 'rotate(-36deg) translateY(-6px)' }],
          { duration: 420, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'forwards' });
        baby.animate(
          [{ transform: 'translateY(34px)', opacity: 0 },
           { transform: 'translateY(30px)', opacity: 1, offset: 0.18 },
           { transform: 'translateY(0)', opacity: 1 }],
          { duration: 700, easing: 'cubic-bezier(.34,1.3,.64,1)', fill: 'forwards' });
        fireHearts(wrap);
      }, 900));
      st.timers.push(setTimeout(function () {   // duck back in + close the lid
        baby.animate(
          [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(34px)', opacity: 0 }],
          { duration: 480, easing: 'ease-in', fill: 'forwards' });
        lid.animate(
          [{ transform: 'rotate(-36deg) translateY(-6px)' }, { transform: 'rotate(0)' }],
          { duration: 380, delay: 300, easing: 'ease-out', fill: 'forwards' });
      }, 4200));
      st.timers.push(setTimeout(function () { st.hatching = false; }, 5200));
    }
    function schedule() {
      st.timers.push(setTimeout(function () {
        if (Math.random() < 0.55) wobble(); else hatch();
        schedule();
      }, rnd(opts.gapMin || 14000, opts.gapMax || 30000)));
    }
    schedule();
    st.hatch = hatch;
    st.wobble = wobble;
    st.remove = function () {
      st.timers.forEach(clearTimeout);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    };
    return st;
  }

  /* ── rolling egg — tumbles across the grass one crossing at a time, then
        removes itself; a tap sends up a little heart burst. Tracked in
        st.rolls so the click router and cleanup can reach it. ── */
  /* A rolling egg. Two modes:
       • DROP  (opts.dropX px given): the egg is dropped by a pterodactyl — it
         appears in the sky at dropX/opts.fromTop, FALLS to the ground, then
         rolls off toward the farther edge, tumbling the whole way.
       • (legacy edge-to-edge crossing — kept for _test/reuse).
     Both register in st.rolls (tap → hearts) and self-remove off-screen. */
  function rollEgg(container, st, opts) {
    if (!container) return null;
    opts = opts || {};
    injectCSS();
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    var wrap = el('div', 'd2roll');
    wrap.style.height = opts.height || '11%';
    wrap.style.bottom = opts.bottom || '3.5%';
    wrap.style.zIndex = opts.zIndex != null ? opts.zIndex : 6;
    wrap.style.transform = 'translateX(-99999px)';
    var spin = el('div', 'd2rollspin');
    spin.appendChild(parseSVG(ROLLEGG_SVG));
    wrap.appendChild(spin);
    container.appendChild(wrap);
    var ew = wrap.offsetWidth || 90, cw = container.clientWidth || 800, ch = container.clientHeight || 600;
    var margin = Math.max(40, ew * 0.5);
    var inst = { element: wrap, spin: spin, stopped: false };
    function end() {
      if (inst.stopped) return;
      inst.stopped = true;
      var i = st.rolls.indexOf(inst); if (i >= 0) st.rolls.splice(i, 1);
      try { if (inst._rot) inst._rot.cancel(); } catch (e) {}
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (opts.onDone) opts.onDone();
    }

    if (opts.dropX != null) {
      /* ── dropped from the sky, then rolls off ── */
      var dropX = opts.dropX;
      var ltrD = dropX < cw / 2;                                   // roll toward the farther edge
      var rollTo = ltrD ? (cw + margin - dropX) : -(dropX + ew + margin);
      wrap.style.left = dropX + 'px';
      var wrapH = wrap.offsetHeight || ch * 0.11;
      var restTop = ch - (ch * 0.035) - wrapH;                     // top of the egg at rest on the grass
      var fromTop = Math.min(opts.fromTop != null ? opts.fromTop : restTop - ch * 0.5, restTop - 40);
      var fallDist = Math.max(60, restTop - fromTop);
      wrap.style.transform = 'translate(0px,' + (-fallDist).toFixed(0) + 'px)';
      inst._rot = animate(spin, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + (ltrD ? 360 : -360) + 'deg)' }],
        { duration: rnd(1400, 1900), iterations: Infinity, easing: 'linear' });
      var rollDur = Math.max(6000, Math.abs(rollTo) / (cw + ew) * rnd(20000, 26000));
      function startRoll() {
        if (inst.stopped) return;
        var roll = animate(wrap, [{ transform: 'translate(0px,0px)' }, { transform: 'translate(' + rollTo.toFixed(0) + 'px,0px)' }],
          { duration: rollDur, easing: 'linear', fill: 'forwards' });
        inst._roll = roll;
        if (roll) roll.onfinish = end; else setTimeout(end, rollDur);
      }
      var fall = animate(wrap, [
        { transform: 'translate(0px,' + (-fallDist).toFixed(0) + 'px)' },
        { transform: 'translate(0px,0px)' }
      ], { duration: 640, easing: 'cubic-bezier(.45,0,.9,1)', fill: 'forwards' });
      inst._fall = fall;
      if (fall) fall.onfinish = startRoll; else { wrap.style.transform = 'translate(0px,0px)'; startRoll(); }
      inst.stop = function () {
        try { if (inst._fall) inst._fall.cancel(); } catch (e) {}
        try { if (inst._roll) inst._roll.cancel(); } catch (e) {}
        end();
      };
      st.rolls.push(inst);
      return inst;
    }

    /* ── legacy edge-to-edge crossing ── */
    var ltr = (opts.direction || 'ltr') === 'ltr';
    var x0 = ltr ? -ew - margin : cw + margin, x1 = ltr ? cw + margin : -ew - margin;
    var dur = opts.duration || rnd(24000, 31000);
    var a = animate(wrap, [{ transform: 'translateX(' + x0 + 'px)' }, { transform: 'translateX(' + x1 + 'px)' }],
      { duration: dur, easing: 'linear', fill: 'forwards' });
    inst._rot = animate(spin, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + (ltr ? 360 : -360) + 'deg)' }],
      { duration: rnd(1400, 1900), iterations: Infinity, easing: 'linear' });
    if (a) a.onfinish = end; else { wrap.style.transform = 'translateX(' + x1 + 'px)'; setTimeout(end, dur); }
    inst.stop = function () { try { if (a) a.cancel(); } catch (e) {} end(); };
    st.rolls.push(inst);
    return inst;
  }
  /* drop a rolling egg from the pterodactyl's current spot */
  function dropRollEgg(stage, st, dropX, fromTop) {
    return rollEgg(stage, st, { dropX: dropX, fromTop: fromTop, zIndex: 6 });
  }

  /* ── HATCHING egg the pterodactyl LAYS in flight — it falls from the sky,
        lands with a squash-bounce, wobbles, the lid cracks open and the baby
        peeks out (the same baby the old static nest egg showed). Then the whole
        thing fades away — nothing stays fixed on the grass. Registered in
        st.eggs so a tap can re-trigger it and cleanup reaches it; it splices
        itself out when it fades. ── */
  function dropHatchEgg(stage, st, dropX, fromTop) {
    if (!stage) return null;
    injectCSS();
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    var ch = stage.clientHeight || 600, cw = stage.clientWidth || 800;
    var wrap = el('div', 'd2egg');
    wrap.style.height = '12%';
    wrap.style.bottom = '3%';
    wrap.style.zIndex = 6;
    wrap.style.left = Math.max(cw * 0.04, Math.min(dropX, cw * 0.9)) + 'px';
    wrap.appendChild(parseSVG(EGG_SVG));
    stage.appendChild(wrap);
    var lid = wrap.querySelector('.d2eggLid');
    var baby = wrap.querySelector('.d2baby');
    var wrapH = wrap.offsetHeight || ch * 0.12;
    var restTop = ch - ch * 0.03 - wrapH;
    var fromTopPx = Math.min(fromTop != null ? fromTop : ch * 0.16, restTop - 60);
    var fallDist = Math.max(80, restTop - fromTopPx);
    var rec = { wrap: wrap, hatching: false, timers: [] };
    function done() {
      rec.timers.forEach(clearTimeout);
      var i = st.eggs.indexOf(rec); if (i >= 0) st.eggs.splice(i, 1);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
    rec.remove = done;
    function crack() {
      if (rec.hatching || !lid || !lid.animate) { rec.timers.push(setTimeout(done, 3800)); return; }
      rec.hatching = true;
      /* little pre-hatch wobble (WAAPI on the wrap — the fall left it holding a
         transform, so a CSS-class wobble would be overridden) */
      wrap.animate(
        [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)', offset: 0.25 },
         { transform: 'rotate(5deg)', offset: 0.6 }, { transform: 'rotate(-2deg)', offset: 0.82 },
         { transform: 'rotate(0)' }], { duration: 820, easing: 'ease-in-out', fill: 'forwards' });
      rec.timers.push(setTimeout(function () {
        lid.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-40deg) translateY(-7px)' }],
          { duration: 440, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'forwards' });
        baby.animate([
          { transform: 'translateY(34px)', opacity: 0 },
          { transform: 'translateY(30px)', opacity: 1, offset: 0.2 },
          { transform: 'translateY(0)', opacity: 1 }
        ], { duration: 720, easing: 'cubic-bezier(.34,1.3,.64,1)', fill: 'forwards' });
        fireHearts(wrap);
      }, 520));
      /* fade the whole thing away once the baby has said hi */
      rec.timers.push(setTimeout(function () {
        var f = animate(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-in', fill: 'forwards' });
        if (f) f.onfinish = done; else done();
      }, 3600));
      rec.timers.push(setTimeout(done, 4800));   // safety net
    }
    /* fall from the sky with a squash-bounce on landing */
    wrap.style.transform = 'translateY(' + (-fallDist).toFixed(0) + 'px)';
    var fall = animate(wrap, [
      { transform: 'translateY(' + (-fallDist).toFixed(0) + 'px)', offset: 0 },
      { transform: 'translateY(0px)', offset: 0.72 },
      { transform: 'translateY(-14px)', offset: 0.85 },
      { transform: 'translateY(0px)', offset: 1 }
    ], { duration: 900, easing: 'cubic-bezier(.4,0,.7,1)', fill: 'forwards' });
    if (fall) fall.onfinish = crack; else { wrap.style.transform = 'translateY(0)'; crack(); }
    st.eggs.push(rec);
    return rec;
  }
  /* tap on a rolling egg → a little pink heart burst (on the stage, so the
     hearts don't inherit the egg's spin) */
  function rollBounce(inst, st) {
    var wrap = inst.element, stage = wrap.parentNode; if (!stage) return;
    var r = wrap.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    var cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top + r.height * 0.3, i;
    for (i = 0; i < 3; i++) {
      var h = el('div', 'd2rheart');
      h.textContent = '💗';
      h.style.left = (cx + rnd(-16, 16)) + 'px';
      h.style.top = cy + 'px';
      h.style.fontSize = rnd(16, 24).toFixed(0) + 'px';
      stage.appendChild(h);
      (function (node, d) {
        var ha = animate(node, [
          { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
          { transform: 'translate(-50%,-90px) scale(1.1)', opacity: 1, offset: 0.4 },
          { transform: 'translate(-50%,-140px) scale(1)', opacity: 0 }
        ], { duration: rnd(1000, 1400), delay: d, easing: 'ease-out' });
        if (ha) ha.onfinish = function () { if (node.parentNode) node.remove(); };
        setTimeout(function () { if (node.parentNode) node.remove(); }, 1900);
      })(h, i * 120);
    }
  }

  /* ══ SCENE BACKDROP — one full-frame SVG: sunset sky, sun, stars, clouds,
        mountain ridges, the volcano (right side — the game card is pinned
        left by the skin), grass bands, ferns, trees. ══ */
  var SCENE_W = 1280, SCENE_H = 800;

  function buildScene(stage, st) {
    var wrapper = el('div', 'd2scene');
    wrapper.style.zIndex = 0;
    var svg = svgEl('svg', { viewBox: '0 0 ' + SCENE_W + ' ' + SCENE_H, preserveAspectRatio: 'xMidYMid slice' });
    svg.innerHTML = [
      '<defs>',
      /* THREE dusk-family skies cross-faded over time (the warm dusk is the
         home state; golden hour + deep twilight cycle in and out) */
      '<linearGradient id="d2skyA" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#7d6fd0"/><stop offset=".3" stop-color="#c98bd6"/>',
      '<stop offset=".58" stop-color="#f2a17b"/><stop offset=".82" stop-color="#ffd9a0"/>',
      '<stop offset="1" stop-color="#ffe9c0"/>',
      '</linearGradient>',
      '<linearGradient id="d2skyB" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#b98fd8"/><stop offset=".3" stop-color="#e79fc0"/>',
      '<stop offset=".58" stop-color="#ffb488"/><stop offset=".82" stop-color="#ffd9a0"/>',
      '<stop offset="1" stop-color="#fff0d8"/>',
      '</linearGradient>',
      '<linearGradient id="d2skyC" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#3f3f7a"/><stop offset=".32" stop-color="#6a5ca8"/>',
      '<stop offset=".6" stop-color="#b57fa8"/><stop offset=".82" stop-color="#e0a488"/>',
      '<stop offset="1" stop-color="#f2c89a"/>',
      '</linearGradient>',
      '<linearGradient id="d2coneL" x1="0" y1="0" x2="1" y2="0">',
      '<stop offset="0" stop-color="#6f5cae"/><stop offset="1" stop-color="#5a4a94"/>',
      '</linearGradient>',
      '</defs>',
      '<rect width="1280" height="800" fill="url(#d2skyA)"/>',
      '<rect id="d2skyRectB" width="1280" height="800" fill="url(#d2skyB)" opacity="0"/>',
      '<rect id="d2skyRectC" width="1280" height="800" fill="url(#d2skyC)" opacity="0"/>',
      '<g id="d2stars" opacity="0"></g>',
      /* sun low over the ridge */
      '<circle cx="430" cy="560" r="120" fill="#fff3d6" opacity=".14"/>',
      '<circle cx="430" cy="560" r="92" fill="#fff3d6" opacity=".22"/>',
      '<circle cx="430" cy="560" r="66" fill="#fff3d6" opacity=".95"/>',
      '<g id="d2clouds"></g>',
      /* distant mountain ranges (built in JS: domed, snow-capped) */
      '<g id="d2mtnFar"></g>',
      '<g id="d2mtnMid"></g>',
      /* volcano — right of frame. The ORIGINAL straight-sided cone silhouette,
         uniformly enlarged about its base (×1.34) so the crater still sits
         ~7cm below the top — a pure scale keeps the exact shape (no bulge). */
      '<g id="d2volc">',
      '<path id="d2cone" d="M715,700 C769,512 829,351 883,268 L1057,268 C1111,351 1171,512 1225,700 Z" fill="url(#d2coneL)"/>',
      '<path d="M1010,268 L1057,268 C1111,351 1171,512 1225,700 L1067,700 C1053,512 1032,351 1010,268 Z" fill="#46387a" opacity=".5"/>',
      '<path d="M922,359 C940,440 930,534 946,628 M1013,346 C1032,440 1021,547 1040,654" fill="none" stroke="#46387a" stroke-width="7" stroke-linecap="round" opacity=".4"/>',
      '<ellipse cx="970" cy="268" rx="87" ry="20" fill="#382f63"/>',
      '<ellipse id="d2glow" cx="970" cy="268" rx="59" ry="13" fill="#ff9a4d"/>',
      '<path d="M916,278 C912,306 918,330 912,354" fill="none" stroke="#ff7a3d" stroke-width="8" stroke-linecap="round" opacity=".85"/>',
      '<path d="M919,280 C916,304 920,324 916,346" fill="none" stroke="#ffd27d" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>',
      '<path d="M1016,280 C1022,310 1018,334 1026,366" fill="none" stroke="#ff7a3d" stroke-width="7" stroke-linecap="round" opacity=".75"/>',
      '<path d="M968,282 C966,296 969,306 966,318" fill="none" stroke="#ffd27d" stroke-width="5" stroke-linecap="round" opacity=".8"/>',
      '</g>',
      /* FRONT range — drawn AFTER the volcano so its rise hides the lower cone
         (only the summit + plume show above the ridgeline, like the old bg) */
      '<g id="d2mtnFront"></g>',
      '<g id="d2smoke"></g>',
      '<g id="d2lava"></g>',
      /* countdown — above the smoke/lava layers; dark fill + light stroke so it
         reads over both the pale sky and the eruption puffs */
      '<text id="d2count" x="970" y="238" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="800" fill="#3b2c72" stroke="#fff3d6" stroke-width="5" paint-order="stroke" opacity="0" style="user-select:none;-webkit-user-select:none;pointer-events:none;transition:opacity .3s ease">10</text>',
      /* grass bands */
      /* grass hexes deliberately differ from every dino body/leg hex so
         walkers never melt into the bands */
      '<path id="d2grassB" d="M0,660 Q80,644 160,656 T320,652 T480,658 T640,650 T800,658 T960,652 T1120,658 T1280,650 L1280,800 L0,800 Z" fill="#38652b"/>',
      '<path id="d2grassF" d="M0,706 Q90,690 180,702 T360,698 T540,704 T720,696 T900,704 T1080,698 T1280,702 L1280,800 L0,800 Z" fill="#61a14a"/>',
      '<g id="d2flora"></g>',
      '</g>'
    ].join('');
    wrapper.appendChild(svg);
    stage.appendChild(wrapper);
    st.sceneSvg = svg;
    st.cone = svg.querySelector('#d2cone');
    st.volcG = svg.querySelector('#d2volc');
    st.glow = svg.querySelector('#d2glow');
    st.counter = svg.querySelector('#d2count');
    st.smokeG = svg.querySelector('#d2smoke');
    st.lavaG = svg.querySelector('#d2lava');

    buildStars(svg.querySelector('#d2stars'), st);
    buildMountains(svg.querySelector('#d2mtnFar'), MTN_FAR, '#b3aef5', true);
    buildMountains(svg.querySelector('#d2mtnMid'), MTN_MID, '#9f99ff', true);
    buildMountains(svg.querySelector('#d2mtnFront'), MTN_FRONT, '#7063ca', false);
    buildClouds(svg.querySelector('#d2clouds'), st);
    buildFlora(svg.querySelector('#d2flora'), st);
    startClouds(svg.querySelector('#d2clouds'), st);
    startGlowPulse(st);
    startSkyCycle(svg, st);
    return wrapper;
  }

  /* ── mountain ranges — DOMED ridges (rounded peaks via quadratic segments),
        filled to the ground, with white snow caps on the high points. Data is
        [x,y] tops; the front range's tall rise sits in front of the volcano. ── */
  var MTN_FAR   = [[-40, 606], [140, 352], [320, 508], [520, 344], [720, 504], [940, 352], [1140, 506], [1320, 414]];
  var MTN_MID   = [[-40, 664], [180, 432], [400, 566], [620, 426], [860, 560], [1080, 432], [1320, 524]];
  var MTN_FRONT = [[-40, 704], [150, 548], [360, 656], [560, 524], [760, 612], [905, 505], [1015, 524], [1190, 606], [1320, 680]];

  function buildMountains(g, pts, fill, caps) {
    var GY = 800, i;
    /* rounded ridge: line to first top, then quadratic through midpoints */
    var d = 'M' + pts[0][0] + ',' + GY + ' L' + pts[0][0] + ',' + pts[0][1];
    for (i = 1; i < pts.length; i++) {
      var mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2;
      d += ' Q' + pts[i - 1][0] + ',' + pts[i - 1][1] + ' ' + mx + ',' + my;
      if (i === pts.length - 1) d += ' L' + pts[i][0] + ',' + pts[i][1];
    }
    d += ' L' + pts[pts.length - 1][0] + ',' + GY + ' Z';
    g.appendChild(svgEl('path', { d: d, fill: fill }));
    if (!caps) return;
    for (i = 1; i < pts.length - 1; i++) {
      if (pts[i][1] < pts[i - 1][1] && pts[i][1] < pts[i + 1][1]) g.appendChild(snowCap(pts[i - 1], pts[i], pts[i + 1]));
    }
  }
  /* the ridge around peak vertex P is the quadratic (M0 → control P → M1) where
     M0/M1 are the midpoints to the neighbours — so the VISIBLE apex is BELOW P.
     Sample the real curve so the snow sits ON the ridge (its top edge IS the
     ridge line) and drapes to a scalloped snow-line below — never floating. */
  function _qAt(M0, P, M1, t) {
    var u = 1 - t;
    return [u * u * M0[0] + 2 * u * t * P[0] + t * t * M1[0],
            u * u * M0[1] + 2 * u * t * P[1] + t * t * M1[1]];
  }
  function snowCap(L, P, R) {
    var M0 = [(L[0] + P[0]) / 2, (L[1] + P[1]) / 2], M1 = [(P[0] + R[0]) / 2, (P[1] + R[1]) / 2];
    var tL = 0.24, tR = 0.76, N = 8, i, top = [];
    for (i = 0; i <= N; i++) top.push(_qAt(M0, P, M1, tL + (tR - tL) * i / N));
    var apexY = _qAt(M0, P, M1, 0.5)[1];
    var lp = top[0], rp = top[top.length - 1];
    var drop = Math.max(16, (Math.min(lp[1], rp[1]) - apexY) + 20);   // snow depth below the apex
    var lowY = apexY + drop, midX = (lp[0] + rp[0]) / 2;
    // top edge: polyline riding ON the ridge (left→right)
    var d = 'M' + lp[0].toFixed(1) + ',' + lp[1].toFixed(1);
    for (i = 1; i < top.length; i++) d += ' L' + top[i][0].toFixed(1) + ',' + top[i][1].toFixed(1);
    // bottom edge: a soft scalloped snow-line back (right→left), dipping below
    d += ' L' + rp[0].toFixed(1) + ',' + (rp[1] + 5).toFixed(1) +
         ' Q' + ((rp[0] + midX) / 2).toFixed(1) + ',' + (lowY + 5).toFixed(1) + ' ' + midX.toFixed(1) + ',' + lowY.toFixed(1) +
         ' Q' + ((lp[0] + midX) / 2).toFixed(1) + ',' + (lowY + 5).toFixed(1) + ' ' + lp[0].toFixed(1) + ',' + (lp[1] + 5).toFixed(1) +
         ' Z';
    return svgEl('path', { fill: '#ffffff', opacity: 0.95, d: d });
  }

  /* ── puffy multi-lobe clouds (old-bg style): overlapping rounded lobes on a
        flat base — a cream underlayer + a white toplayer for a soft 2-tone read ── */
  var CLOUD_LOBES = [[-72, 6, 24], [-42, -10, 34], [-8, -18, 42], [28, -12, 38], [64, 0, 28], [-20, 8, 28], [30, 8, 26]];
  function cloudLayer(cx, cy, s, fill, op) {
    var sub = svgEl('g', { fill: fill, opacity: op });
    for (var i = 0; i < CLOUD_LOBES.length; i++) {
      var l = CLOUD_LOBES[i];
      sub.appendChild(svgEl('circle', { cx: cx + l[0] * s, cy: cy + l[1] * s, r: l[2] * s }));
    }
    sub.appendChild(svgEl('rect', { x: cx - 80 * s, y: cy - 2 * s, width: 160 * s, height: 20 * s, rx: 10 * s }));
    return sub;
  }
  function buildClouds(g, st) {
    var defs = [[190, 120, 1.0], [770, 96, 0.82], [1090, 168, 1.1], [520, 205, 0.62]];
    for (var i = 0; i < defs.length; i++) {
      var cx = defs[i][0], cy = defs[i][1], s = defs[i][2];
      var grp = svgEl('g', {});
      grp.appendChild(cloudLayer(cx + 6 * s, cy + 12 * s, s, '#ffe09d', 0.85));  // cream underlayer
      grp.appendChild(cloudLayer(cx, cy, s, '#ffffff', 0.96));                   // white top
      g.appendChild(grp);
    }
  }

  /* ── sky day-cycle — cross-fade golden hour + deep twilight over the warm
        dusk base; stars glow up during twilight. One long WAAPI loop. ── */
  function startSkyCycle(svg, st) {
    var T = 88000;
    var b = svg.querySelector('#d2skyRectB'), c = svg.querySelector('#d2skyRectC'), stars = svg.querySelector('#d2stars');
    var ab = animate(b, [
      { opacity: 0, offset: 0 }, { opacity: 0, offset: 0.06 }, { opacity: 0.9, offset: 0.2 },
      { opacity: 0, offset: 0.4 }, { opacity: 0, offset: 1 }
    ], { duration: T, iterations: Infinity, easing: 'ease-in-out' });
    var ac = animate(c, [
      { opacity: 0, offset: 0 }, { opacity: 0, offset: 0.46 }, { opacity: 0.92, offset: 0.66 },
      { opacity: 0, offset: 0.9 }, { opacity: 0, offset: 1 }
    ], { duration: T, iterations: Infinity, easing: 'ease-in-out' });
    var as = animate(stars, [
      { opacity: 0, offset: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 0.95, offset: 0.66 },
      { opacity: 0.95, offset: 0.84 }, { opacity: 0, offset: 0.95 }, { opacity: 0, offset: 1 }
    ], { duration: T, iterations: Infinity, easing: 'ease-in-out' });
    [ab, ac, as].forEach(function (a) { if (a) st.anims.push(a); });
  }

  function buildStars(g, st) {
    var i, s, r, cx, cy, a;
    for (i = 0; i < 26; i++) {
      cx = rnd(20, 1260); cy = rnd(14, 250); r = rnd(1.6, 3.4);
      s = svgEl('g', { 'class': 'd2tw' });
      s.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r * 2.2, fill: '#ffffff', opacity: 0.25 }));
      s.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: '#ffffff' }));
      g.appendChild(s);
      a = animate(s, [{ opacity: rnd(0.35, 0.55) }, { opacity: rnd(0.9, 1) }],
        { duration: rnd(1300, 3400), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
      if (a) st.anims.push(a);
    }
  }

  /* ── one filled, tapered leaf blade (base at bx±w on baseY, curling to a tip
        that leans by `lean` and rises by `h`). The building block for lush grass
        tufts and arching ferns — filled shapes read far better than lone
        strokes. ── */
  function leafBlade(bx, baseY, lean, h, w, color) {
    var tipx = bx + lean, tipy = baseY - h;
    var c1x = bx + lean * 0.35, c1y = baseY - h * 0.62;
    var c2x = bx + lean * 0.7 + w * 0.6, c2y = baseY - h * 0.45;
    return '<path d="M' + (bx - w).toFixed(1) + ',' + baseY.toFixed(1) +
      ' Q' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + tipx.toFixed(1) + ',' + tipy.toFixed(1) +
      ' Q' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + (bx + w).toFixed(1) + ',' + baseY.toFixed(1) +
      ' Z" fill="' + color + '"/>';
  }
  var GRASS_GREENS = ['#4f8f3f', '#69ab4a', '#86c766'];
  var FERN_GREENS = ['#3f7a30', '#57993f', '#74b855'];
  var FLOWER_PALS = [['#f2a3c6', '#ffe08a'], ['#c9b4e8', '#ffe08a'], ['#ff9ab0', '#fff0a0'], ['#9ad0f5', '#ffe08a'], ['#ffc36b', '#fff0a0']];

  function grassTuft(x, baseY, s) {
    var g = svgEl('g', { 'class': 'd2blade' });
    var n = 3 + (Math.random() < 0.55 ? 1 : 0), html = '', k;
    for (k = 0; k < n; k++) {
      var lean = (k - (n - 1) / 2) * 10 * s + rnd(-2, 2);
      var h = (28 + rnd(4, 20)) * s, w = 4.4 * s;
      var bx = x + (k - (n - 1) / 2) * 3.4 * s;
      html += leafBlade(bx, baseY, lean, h, w, GRASS_GREENS[k % GRASS_GREENS.length]);
    }
    g.innerHTML = html;
    return g;
  }

  /* an arching fern — a dark back fan + a lighter front fan of filled fronds */
  function fernTuft(x, baseY, s) {
    var g = svgEl('g', { 'class': 'd2fern' }), html = '', k;
    var n = 7;
    for (k = 0; k < n; k++) {
      var t = n === 1 ? 0.5 : k / (n - 1);
      var lean = (t - 0.5) * 78 * s;                 // wide outward arch
      var h = (52 + Math.sin(t * Math.PI) * 22) * s; // tallest in the middle
      html += leafBlade(x, baseY, lean, h, 5 * s, FERN_GREENS[k % FERN_GREENS.length]);
    }
    g.innerHTML = html;
    return g;
  }

  function flower(x, groundY, s, pal) {
    var g = svgEl('g', { 'class': 'd2blade' });
    var stemTop = groundY - 30 * s, html = '';
    /* stem + a little leaf */
    html += '<path d="M' + x + ',' + groundY + ' Q' + (x - 5 * s) + ',' + (groundY - 16 * s) + ' ' + x + ',' + stemTop + '" stroke="#57993f" stroke-width="' + (2.6 * s).toFixed(1) + '" fill="none" stroke-linecap="round"/>';
    html += '<path d="M' + x + ',' + (groundY - 13 * s) + ' q' + (-10 * s) + ',' + (-3 * s) + ' ' + (-12 * s) + ',' + (5 * s) + ' q' + (9 * s) + ',' + (2 * s) + ' ' + (12 * s) + ',' + (-5 * s) + ' Z" fill="#69ab4a"/>';
    /* petals fanned around the head */
    var cx = x, cy = stemTop, petals = 6, p;
    for (p = 0; p < petals; p++) {
      var ang = p / petals * Math.PI * 2;
      var px = cx + Math.cos(ang) * 7 * s, py = cy + Math.sin(ang) * 7 * s;
      html += '<ellipse cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" rx="' + (4.8 * s).toFixed(1) + '" ry="' + (3 * s).toFixed(1) +
        '" fill="' + pal[0] + '" transform="rotate(' + (ang * 180 / Math.PI).toFixed(1) + ' ' + px.toFixed(1) + ' ' + py.toFixed(1) + ')"/>';
    }
    html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (4.2 * s).toFixed(1) + '" fill="' + pal[1] + '"/>';
    html += '<circle cx="' + (cx - 1.4 * s).toFixed(1) + '" cy="' + (cy - 1.4 * s).toFixed(1) + '" r="' + (1.5 * s).toFixed(1) + '" fill="#ffffff" opacity=".65"/>';
    g.innerHTML = html;
    return g;
  }

  /* a fuller prehistoric palm — segmented curved trunk + 7 drooping filled
     fronds (2-tone) + a couple of coconuts at the crown */
  function palmTree(tx, baseY, s) {
    var g = svgEl('g', {});
    var crownX = tx + 4 * s, crownY = baseY - 128 * s, html = '', seg, fr;
    /* trunk silhouette */
    html += '<path d="M' + (tx - 7 * s) + ',' + baseY + ' C' + (tx - 9 * s) + ',' + (baseY - 60 * s) + ' ' + (crownX + 6 * s) + ',' + (baseY - 95 * s) + ' ' + (crownX - 4 * s) + ',' + crownY +
      ' L' + (crownX + 9 * s) + ',' + crownY + ' C' + (crownX + 14 * s) + ',' + (baseY - 95 * s) + ' ' + (tx + 11 * s) + ',' + (baseY - 60 * s) + ' ' + (tx + 9 * s) + ',' + baseY + ' Z" fill="#8a5f3a"/>';
    /* segment ticks */
    for (seg = 1; seg < 6; seg++) {
      var sy = baseY - seg * 20 * s;
      html += '<path d="M' + (tx - 5 * s) + ',' + sy + ' q' + (9 * s) + ',' + (4 * s) + ' ' + (18 * s) + ',0" stroke="#6f4a2a" stroke-width="' + (1.6 * s).toFixed(1) + '" fill="none" opacity=".5"/>';
    }
    /* drooping fronds */
    var fronds = 7;
    for (fr = 0; fr < fronds; fr++) {
      var t = fr / (fronds - 1);
      var ang = (-158 + t * 136) * Math.PI / 180;
      var len = (58 + Math.sin(t * Math.PI) * 24) * s;
      var ex = crownX + Math.cos(ang) * len;
      var ey = crownY + Math.sin(ang) * len * 0.6 + 10 * s;   // pull tips down = droop
      var mx = crownX + Math.cos(ang) * len * 0.5;
      var my = crownY + Math.sin(ang) * len * 0.24;
      var nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2), wp = 9 * s;
      html += '<path d="M' + crownX.toFixed(1) + ',' + crownY.toFixed(1) +
        ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1) +
        ' Q' + (mx + nx * wp).toFixed(1) + ',' + (my + ny * wp).toFixed(1) + ' ' + crownX.toFixed(1) + ',' + crownY.toFixed(1) +
        ' Z" fill="' + (fr % 2 ? '#4f8f3f' : '#5fa347') + '"/>';
      html += '<path d="M' + crownX.toFixed(1) + ',' + crownY.toFixed(1) + ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1) +
        '" stroke="#3f7a30" stroke-width="' + (1.4 * s).toFixed(1) + '" fill="none" opacity=".55"/>';
    }
    /* coconuts */
    html += '<circle cx="' + (crownX - 3 * s).toFixed(1) + '" cy="' + (crownY + 5 * s).toFixed(1) + '" r="' + (5 * s).toFixed(1) + '" fill="#7a5230"/>';
    html += '<circle cx="' + (crownX + 6 * s).toFixed(1) + '" cy="' + (crownY + 7 * s).toFixed(1) + '" r="' + (4.4 * s).toFixed(1) + '" fill="#9c6f42"/>';
    g.innerHTML = html;
    return g;
  }

  function buildFlora(g, st) {
    var i, x, node, a;
    function sway(el, deg, dmin, dmax) {
      var an = animate(el, [{ transform: 'rotate(-' + deg + 'deg)' }, { transform: 'rotate(' + deg + 'deg)' }],
        { duration: rnd(dmin, dmax), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
      if (an) { an.currentTime = Math.random() * dmax; st.anims.push(an); }
    }
    /* lush grass tufts along the front band */
    for (x = 24; x < 1280; x += rnd(52, 92)) {
      node = grassTuft(x, 708, rnd(1.0, 1.6));
      g.appendChild(node);
      sway(node, 3, 2200, 4200);
    }
    /* arching ferns */
    var spots = [[110, 702, 1.5], [250, 712, 1.15], [470, 708, 1.0], [660, 706, 1.35], [1160, 708, 1.2], [1245, 700, 1.4]];
    for (i = 0; i < spots.length; i++) {
      node = fernTuft(spots[i][0], spots[i][1], spots[i][2]);
      g.appendChild(node);
      sway(node, 2.2, 2600, 4600);
    }
    /* palm-ish prehistoric trees near the edges */
    var trees = [[70, 668, 1.15], [1215, 672, 1.0]];
    for (i = 0; i < trees.length; i++) {
      g.appendChild(palmTree(trees[i][0], trees[i][1], trees[i][2]));
    }
    /* rocks (with a little highlight) */
    g.appendChild(svgEl('ellipse', { cx: 540, cy: 718, rx: 19, ry: 10, fill: '#a8a1bd' }));
    g.appendChild(svgEl('ellipse', { cx: 560, cy: 721, rx: 11, ry: 7, fill: '#948da9' }));
    g.appendChild(svgEl('ellipse', { cx: 534, cy: 714, rx: 7, ry: 3, fill: '#c3bcd6', opacity: 0.7 }));
    /* prettier daisies scattered on the grass */
    var fl = [[330, 712, 1.2], [430, 716, 0.95], [820, 714, 1.15], [960, 710, 1.0], [1050, 716, 1.1]];
    for (i = 0; i < fl.length; i++) {
      node = flower(fl[i][0], fl[i][1], fl[i][2], FLOWER_PALS[i % FLOWER_PALS.length]);
      g.appendChild(node);
      sway(node, 2.4, 2600, 4400);
    }
  }

  function startClouds(g, st) {
    var kids = g.children, i, a;
    for (i = 0; i < kids.length; i++) {
      a = animate(kids[i], [{ transform: 'translateX(0)' }, { transform: 'translateX(' + rnd(-160, 160) + 'px)' }],
        { duration: rnd(12000, 22000), direction: 'alternate', iterations: Infinity, easing: 'linear' });
      if (a) { a.currentTime = Math.random() * 8000; st.anims.push(a); }
    }
  }

  function startGlowPulse(st) {
    var a = animate(st.glow, [{ opacity: 0.55 }, { opacity: 1 }],
      { duration: 1600, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
    if (a) st.anims.push(a);
  }

  /* smoke — soft lilac puffs rising from the crater, endless loop */
  function puffSmoke(st) {
    if (st.cancelled) return;
    var g = st.smokeG;
    var c = svgEl('circle', {
      cx: 970 + rnd(-20, 20), cy: 262, r: rnd(10, 20),
      fill: Math.random() < 0.5 ? '#d9c7f0' : '#c9b4e8', opacity: 0
    });
    c.style.transformBox = 'fill-box';
    c.style.transformOrigin = '50% 50%';
    g.appendChild(c);
    var drift = rnd(-40, 60), rise = rnd(120, 210), dur = rnd(2600, 4200);
    var a = animate(c, [
      { transform: 'translate(0,0) scale(.6)', opacity: 0 },
      { transform: 'translate(' + drift * 0.4 + 'px,' + (-rise * 0.4) + 'px) scale(1.15)', opacity: 0.5, offset: 0.35 },
      { transform: 'translate(' + drift + 'px,' + (-rise) + 'px) scale(1.9)', opacity: 0 }
    ], { duration: dur, easing: 'ease-out' });
    if (a) a.onfinish = function () { if (c.parentNode) c.parentNode.removeChild(c); };
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, dur + 300);
    st.timers.push(setTimeout(function () { puffSmoke(st); }, rnd(650, 1100)));
  }

  /* eruption — lava blobs arc out of the crater; the cone shivers */
  function erupt(st, big) {
    if (st.cancelled) return;
    var n = big ? irnd(12, 16) : irnd(6, 9), i, blob, a;
    for (i = 0; i < n; i++) {
      var r = rnd(7, big ? 18 : 13);
      blob = svgEl('circle', {
        cx: 970 + rnd(-26, 26), cy: 264, r: r,
        fill: Math.random() < 0.4 ? '#ffd27d' : '#ff7a3d'
      });
      blob.style.transformBox = 'fill-box';
      blob.style.transformOrigin = '50% 50%';
      st.lavaG.appendChild(blob);
      var dx = rnd(-1, 1) * (big ? rnd(90, 240) : rnd(60, 150));
      var up = rnd(120, big ? 300 : 210), dur = rnd(900, 1600);
      a = animate(blob, [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx * 0.6 + 'px,' + (-up) + 'px) scale(.95)', opacity: 1, offset: 0.42, easing: 'ease-in' },
        { transform: 'translate(' + dx + 'px,' + rnd(120, 320) + 'px) scale(.7)', opacity: 0.6 }
      ], { duration: dur, easing: 'ease-out' });
      (function (node, d) {
        if (a) a.onfinish = function () { if (node.parentNode) node.parentNode.removeChild(node); };
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, d + 250);
      })(blob, dur);
    }
    /* flying ROCKS — dark faceted stones hurled from inside the crater,
       spinning as they arc out and fall past the cone */
    var nr = big ? irnd(5, 7) : irnd(3, 4), k2, rock, ra;
    for (k2 = 0; k2 < nr; k2++) {
      var rs = rnd(0.8, 1.7);
      rock = svgEl('g', { transform: 'translate(' + (970 + rnd(-24, 24)).toFixed(0) + ',262)' });
      rock.innerHTML =
        '<g class="d2rockAnim"><g transform="scale(' + rs.toFixed(2) + ')">' +
        '<path d="M0,-10 L9,-5 L8,5 L0,10 L-8,6 L-9,-4 Z" fill="#4a3d80" stroke="#2e2660" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M0,-10 L9,-5 L2,0 L-4,-3 Z" fill="#6f5cae" opacity=".75"/>' +
        '</g></g>';
      st.lavaG.appendChild(rock);
      var spin = rock.firstChild;
      spin.style.transformBox = 'fill-box';
      spin.style.transformOrigin = '50% 50%';
      var rdx = rnd(-1, 1) * (big ? rnd(70, 220) : rnd(50, 140));
      var rup = rnd(130, big ? 290 : 200), rdur = rnd(1100, 1800);
      var rot = (Math.random() < 0.5 ? -1 : 1) * rnd(180, 420);
      ra = animate(spin, [
        { transform: 'translate(0,0) rotate(0deg)' },
        { transform: 'translate(' + (rdx * 0.6).toFixed(0) + 'px,' + (-rup).toFixed(0) + 'px) rotate(' + (rot * 0.45).toFixed(0) + 'deg)', offset: 0.4, easing: 'ease-out' },
        { transform: 'translate(' + rdx.toFixed(0) + 'px,' + rnd(140, 340).toFixed(0) + 'px) rotate(' + rot.toFixed(0) + 'deg)' }
      ], { duration: rdur, easing: 'ease-in' });
      (function (node, d, a2) {
        if (a2) a2.onfinish = function () { if (node.parentNode) node.parentNode.removeChild(node); };
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, d + 250);
      })(rock, rdur, ra);
    }
    /* cone shiver */
    var s = animate(st.volcG, [
      { transform: 'translate(0,0)' }, { transform: 'translate(-3px,1px)' }, { transform: 'translate(3px,-1px)' },
      { transform: 'translate(-2px,0)' }, { transform: 'translate(0,0)' }
    ], { duration: 460, easing: 'ease-in-out' });
    /* burst of smoke */
    var k;
    for (k = 0; k < (big ? 6 : 3); k++) puffOnce(st, k * 90);
  }
  function puffOnce(st, delay) {
    st.timers.push(setTimeout(function () { if (!st.cancelled) puffSmoke0(st); }, delay));
  }
  function puffSmoke0(st) {   // single burst puff (no self-reschedule)
    var c = svgEl('circle', { cx: 970 + rnd(-22, 22), cy: 262, r: rnd(14, 24), fill: '#d9c7f0', opacity: 0 });
    c.style.transformBox = 'fill-box'; c.style.transformOrigin = '50% 50%';
    st.smokeG.appendChild(c);
    var a = animate(c, [
      { transform: 'translate(0,0) scale(.6)', opacity: 0 },
      { transform: 'translate(' + rnd(-30, 50) + 'px,-90px) scale(1.3)', opacity: 0.6, offset: 0.4 },
      { transform: 'translate(' + rnd(-60, 80) + 'px,-190px) scale(2)', opacity: 0 }
    ], { duration: rnd(1800, 2600), easing: 'ease-out' });
    if (a) a.onfinish = function () { if (c.parentNode) c.parentNode.removeChild(c); };
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 2900);
  }

  /* ── meteor storm — SVG comets over a night overlay; dinos flee ─────── */
  var METEOR_EVERY_CLICKS = 10;
  var METEOR_LOCKOUT_MS = 18000;

  /* impact explosion — the space background's supernova language in SVG:
     white-hot flash core, TWO chasing shockwave rings, radiating ejecta
     (dots + streaks in the nova palette), and a lingering glow blob */
  var NOVA_COLORS = ['#FFD27D', '#FF7A3D', '#FFFFFF', '#C77DFF'];
  function impactExplosion(svg, cx, cy) {
    var gx = svgEl('g', { transform: 'translate(' + cx.toFixed(0) + ',' + cy.toFixed(0) + ')' });
    svg.appendChild(gx);
    function gone(node, ms) {
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, ms);
    }
    /* lingering glow blob (under everything) */
    var glow = svgEl('circle', { r: 34, fill: '#FF7A3D', opacity: 0 });
    glow.style.transformBox = 'fill-box'; glow.style.transformOrigin = '50% 50%';
    gx.appendChild(glow);
    animate(glow, [
      { transform: 'scale(.4)', opacity: 0.55 },
      { transform: 'scale(1.6)', opacity: 0.25, offset: 0.4 },
      { transform: 'scale(2.6)', opacity: 0 }
    ], { duration: 1100, easing: 'ease-out', fill: 'forwards' });
    /* white-hot flash core */
    var flash = svgEl('circle', { r: 22, fill: '#FFFFFF' });
    flash.style.transformBox = 'fill-box'; flash.style.transformOrigin = '50% 50%';
    gx.appendChild(flash);
    animate(flash, [
      { transform: 'scale(.3)', opacity: 1 },
      { transform: 'scale(1.4)', opacity: 0.9, offset: 0.35 },
      { transform: 'scale(2)', opacity: 0 }
    ], { duration: 320, easing: 'ease-out', fill: 'forwards' });
    /* two shockwaves, the second chasing the first (nova signature) */
    var w, wi;
    for (wi = 0; wi < 2; wi++) {
      w = svgEl('circle', { r: 6, fill: 'none', stroke: wi ? '#FFD27D' : '#FFFFFF', 'stroke-width': wi ? 5 : 3.5, opacity: 0 });
      gx.appendChild(w);
      animate(w, [
        { r: 6, opacity: 0.95 }, { r: wi ? 64 : 88, opacity: 0 }
      ], { duration: wi ? 620 : 780, delay: wi * 140, easing: 'ease-out', fill: 'both' });
    }
    /* ejecta — dots + a few streaks radiating out, arcing with gravity */
    var i, n = irnd(12, 16);
    for (i = 0; i < n; i++) {
      var ang = rnd(-Math.PI, 0) * 0.9 - 0.15;          // mostly upward fan
      var dist = rnd(45, 130), col = NOVA_COLORS[i % 4];
      var ex = Math.cos(ang) * dist, ey = Math.sin(ang) * dist;
      var node;
      if (Math.random() < 0.3) {                         // streak
        node = svgEl('path', {
          d: 'M0,0 L' + (Math.cos(ang) * 16).toFixed(1) + ',' + (Math.sin(ang) * 16).toFixed(1),
          stroke: col, 'stroke-width': rnd(2.5, 4), 'stroke-linecap': 'round', fill: 'none'
        });
      } else {                                           // dot
        node = svgEl('circle', { r: rnd(2.5, 5.5), fill: col });
      }
      node.style.transformBox = 'fill-box';
      node.style.transformOrigin = '50% 50%';
      gx.appendChild(node);
      animate(node, [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + (ex * 0.7).toFixed(0) + 'px,' + (ey * 0.9).toFixed(0) + 'px) scale(.9)', opacity: 0.95, offset: 0.45, easing: 'ease-out' },
        { transform: 'translate(' + ex.toFixed(0) + 'px,' + (-ey * 0.2 + 26).toFixed(0) + 'px) scale(.5)', opacity: 0 }
      ], { duration: rnd(650, 1050), easing: 'ease-in', fill: 'forwards' });
    }
    gone(gx, 1400);
  }

  /* ── ambient butterflies — a tiny sprite that drifts across on a gentle
        sine, wings fluttering; one crossing then it removes itself. ── */
  var BFLY_COLORS = [['#f2a3c6', '#b14a7c'], ['#ffd27d', '#d99a2c'], ['#c9b4e8', '#7d5cae']];
  function butterflySVG(pal) {
    return '<svg viewBox="0 0 64 52">' +
      '<g class="bfw bfwL"><path d="M32,26 C14,4 2,8 6,24 C2,40 16,46 32,30 Z" fill="' + pal[0] + '" stroke="' + pal[1] + '" stroke-width="2"/><circle cx="15" cy="18" r="3" fill="#fff3d6"/></g>' +
      '<g class="bfw bfwR"><path d="M32,26 C50,4 62,8 58,24 C62,40 48,46 32,30 Z" fill="' + pal[0] + '" stroke="' + pal[1] + '" stroke-width="2"/><circle cx="49" cy="18" r="3" fill="#fff3d6"/></g>' +
      '<ellipse cx="32" cy="28" rx="3.2" ry="9" fill="#4a3d80"/>' +
      '<path d="M32,20 C30,13 27,11 26,9 M32,20 C34,13 37,11 38,9" fill="none" stroke="#4a3d80" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>';
  }
  function spawnButterfly(stage, st) {
    if (st.cancelled) return;
    var wrap = el('div', 'd2fly');
    var sz = rnd(26, 40);
    wrap.style.width = sz.toFixed(0) + 'px';
    wrap.style.top = rnd(20, 62) + '%';
    wrap.style.zIndex = 5;
    wrap.style.transform = 'translateX(-9999px)';
    wrap.appendChild(parseSVG(butterflySVG(BFLY_COLORS[irnd(0, BFLY_COLORS.length - 1)])));
    stage.appendChild(wrap);
    var cw = stage.clientWidth || 800;
    var ltr = Math.random() < 0.5;
    var x0 = ltr ? -60 : cw + 60, x1 = ltr ? cw + 60 : -60;
    var dur = rnd(11000, 17000), amp = rnd(26, 52), waves = rnd(3, 5);
    var steps = 40, frames = [], i, f;
    for (i = 0; i <= steps; i++) {
      f = i / steps;
      frames.push({ transform: 'translateX(' + (x0 + (x1 - x0) * f).toFixed(0) + 'px) translateY(' + (Math.sin(f * Math.PI * 2 * waves) * amp).toFixed(0) + 'px)' + (ltr ? '' : ' scaleX(-1)') });
    }
    var a = animate(wrap, frames, { duration: dur, easing: 'linear' });
    function done() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    if (a) a.onfinish = done; else { done(); }
    st.timers.push(setTimeout(done, dur + 400));
  }

  /* ── ambient shooting star — ported from the DUBAI background's look: a crisp
        white head trailing a white→icy-blue gradient tail that fades to nothing,
        streaking down across the upper sky. (Dubai draws it additively on canvas;
        here the same white-core + soft halo reads as a glow on the dusk sky.) ── */
  var SS_UID = 0;
  function shootingStar(st) {
    if (st.cancelled || !st.sceneSvg || st.meteorActive) return;
    var svg = st.sceneSvg;
    var dir = Math.random() < 0.5 ? 1 : -1;
    var ang = 0.15 + Math.random() * 0.5;                  // downward, as in Dubai
    var vx = dir * Math.cos(ang), vy = Math.sin(ang);      // unit travel direction
    var x = dir > 0 ? rnd(60, 560) : rnd(SCENE_W - 560, SCENE_W - 60);
    var y = rnd(40, 250);
    var len = rnd(90, 155);                                // tail length
    var travel = rnd(360, 560);                            // distance across the sky
    var tx = (-vx * len).toFixed(1), ty = (-vy * len).toFixed(1);
    var gid = 'd2ss' + (++SS_UID);
    var g = svgEl('g', {});
    g.innerHTML =
      '<defs><linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + tx + '" y2="' + ty + '">' +
        '<stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>' +
        '<stop offset=".4" stop-color="#c8e1ff" stop-opacity=".4"/>' +
        '<stop offset="1" stop-color="#c8e1ff" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<line x1="0" y1="0" x2="' + tx + '" y2="' + ty + '" stroke="url(#' + gid + ')" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="0" cy="0" r="5.5" fill="#ffffff" opacity=".35"/>' +
      '<circle cx="0" cy="0" r="2" fill="#ffffff"/>';
    svg.appendChild(g);
    var a = animate(g, [
      { transform: 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)', opacity: 0 },
      { opacity: 1, offset: 0.18 },
      { opacity: 1, offset: 0.7 },
      { transform: 'translate(' + (x + vx * travel).toFixed(0) + 'px,' + (y + vy * travel).toFixed(0) + 'px)', opacity: 0 }
    ], { duration: rnd(750, 1100), easing: 'linear' });
    function done() { if (g.parentNode) g.parentNode.removeChild(g); }
    if (a) a.onfinish = done; else done();
    setTimeout(done, 1500);
  }

  function startMeteors(stage, st, duration) {
    var night = el('div', 'd2night');
    var svg = svgEl('svg', { viewBox: '0 0 ' + SCENE_W + ' ' + SCENE_H, preserveAspectRatio: 'xMidYMid slice' });
    /* moonlit horizon silhouette — each layer a clear step brighter than the
       sky so the world stays readable through the storm */
    var nstars = '', si;
    for (si = 0; si < 16; si++) {
      nstars += '<circle cx="' + rnd(30, 1250).toFixed(0) + '" cy="' + rnd(20, 300).toFixed(0) +
        '" r="' + rnd(1.4, 2.8).toFixed(1) + '" fill="#fff3d6" opacity="' + rnd(0.5, 0.95).toFixed(2) + '"/>';
    }
    svg.innerHTML =
      nstars +
      '<circle cx="210" cy="120" r="36" fill="#fff3d6" opacity=".92"/>' +
      '<circle cx="228" cy="108" r="30" fill="#0b0524"/>' +
      '<path d="M0,640 L120,520 L330,505 L520,545 L760,530 L1010,540 L1280,555 L1280,800 L0,800 Z" fill="#2f2064"/>' +
      '<path d="M715,700 C769,512 829,351 883,268 L1057,268 C1111,351 1171,512 1225,700 Z" fill="#3b2c72"/>' +
      '<ellipse cx="970" cy="268" rx="70" ry="15" fill="#ff9a4d" opacity=".8"/>' +
      '<ellipse cx="970" cy="268" rx="118" ry="30" fill="#ff9a4d" opacity=".18"/>' +
      '<path d="M0,706 Q90,690 180,702 T360,698 T540,704 T720,696 T900,704 T1080,698 T1280,702 L1280,800 L0,800 Z" fill="#201345"/>';
    night.appendChild(svg);
    stage.appendChild(night);
    requestAnimationFrame(function () { night.style.opacity = '1'; });
    var n = irnd(18, 24), i;
    for (i = 0; i < n; i++) {
      (function (idx) {
        var t = setTimeout(function () {
          if (st.cancelled) return;
          var x = rnd(250, 1350), groundY = rnd(620, 730);
          var g = svgEl('g', {});
          g.innerHTML =
            '<path d="M0,0 L126,-210 L14,8 Z" fill="#ffb066" opacity=".4"/>' +
            '<path d="M4,2 L102,-162 L12,6 Z" fill="#ffd27d" opacity=".7"/>' +
            '<circle cx="8" cy="4" r="9" fill="#fff3d6"/>' +
            '<circle cx="8" cy="4" r="15" fill="#ffd27d" opacity=".4"/>';
          svg.appendChild(g);
          var fall = rnd(950, 1400);
          var a = animate(g, [
            { transform: 'translate(' + x + 'px,' + (-80) + 'px)', opacity: 1 },
            { transform: 'translate(' + (x - 420) + 'px,' + groundY + 'px)', opacity: 1 }
          ], { duration: fall, easing: 'cubic-bezier(.4,0,1,1)' });
          function boom() {
            if (g.parentNode) g.parentNode.removeChild(g);
            impactExplosion(svg, x - 420, groundY);
          }
          if (a) a.onfinish = boom; else setTimeout(boom, fall);
        }, rnd(400, duration - 4500) + idx * 110);
        st.timers.push(t);
      })(i);
    }
    var stopT = setTimeout(function () {
      night.style.opacity = '0';
      setTimeout(function () { if (night.parentNode) night.parentNode.removeChild(night); }, 900);
    }, duration);
    st.timers.push(stopT);
    return {
      stop: function () {
        clearTimeout(stopT);
        if (night.parentNode) night.parentNode.removeChild(night);
      }
    };
  }

  /* ── SVG point hit-test for the volcano cone ─────────────────────────── */
  function svgPointIn(svg, node, clientX, clientY) {
    try {
      var pt = svg.createSVGPoint();
      pt.x = clientX; pt.y = clientY;
      var ctm = svg.getScreenCTM();
      if (!ctm) return false;
      var p = pt.matrixTransform(ctm.inverse());
      return node.isPointInFill ? node.isPointInFill(p) : false;
    } catch (e) { return false; }
  }

  /* ══ registry ═══════════════════════════════════════════════════════ */
  w.BACKGROUNDS = w.BACKGROUNDS || {};
  w.BACKGROUNDS.dinosaurs2 = {
    skin: 'dinosaurs',
    aids: 'dinosaurs',
    preload: function () { /* single file — nothing to warm */ },

    init: function (ctx) {
      var stage = ctx && ctx.stage;
      if (!stage) return function () {};
      stage.innerHTML = '';
      injectCSS();
      if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';

      var st = {
        cancelled: false, timers: [], anims: [], eggs: [], rolls: [], oldEggs: [],
        clicks: 0, meteorActive: false, meteorBusy: false, meteor: null
      };
      buildScene(stage, st);
      puffSmoke(st);

      /* the ORIGINAL rolling egg from the previous dinosaurs background, loaded
         and used exactly as-is — just ONE now (calmer scene: ~1 egg at a time),
         with a long gap so it only arrives occasionally */
      needScript('BabyTrexEgg', 'baby-trex-egg.js', function () {
        if (st.cancelled || !w.BabyTrexEgg) return;
        st.oldEggs.push(w.BabyTrexEgg.roll(stage, { direction: 'ltr', duration: 27000, height: '13%', bottom: '4%', zIndex: 6, gapMin: 16000, gapMax: 30000 }));
      });

      /* ── ambient self-eruptions ── */
      function scheduleErupt() {
        st.timers.push(setTimeout(function () {
          if (st.cancelled) return;
          if (!st.meteorActive) erupt(st, false);
          scheduleErupt();
        }, rnd(16000, 28000)));
      }
      scheduleErupt();

      /* ── eggs ── the old static nest eggs are gone; eggs now ARRIVE:
            a pterodactyl LAYS a hatching egg mid-flight (dropHatchEgg) or drops
            a rolling egg (dropRollEgg), and the legacy rolling eggs cross too. ── */

      /* ── herd scheduler — small groups of 1-2, species round-robin queue.
            Every spawn is gated on groundCount() so the ground never holds more
            than MAX_GROUND_DINOS dinosaurs at once (calmer scene). ── */
      var packQueue = [], dir = Math.random() < 0.5 ? 'ltr' : 'rtl';
      function nextSpecies() {
        if (!packQueue.length) {
          packQueue = ['bronto', 'stego', 'trex', 'trikec', 'stegoc'];
          for (var i = packQueue.length - 1; i > 0; i--) {
            var j = 0 | (Math.random() * (i + 1)), t = packQueue[i];
            packQueue[i] = packQueue[j]; packQueue[j] = t;
          }
        }
        return packQueue.shift();
      }
      var sizes = [1.0, 0.72];   // two size tiers (leader + one smaller follower)
      function spawnPack() {
        if (st.cancelled) return;
        var species = nextSpecies();
        var sp = SPECIES[species];
        var n = irnd(1, 2);
        var baseDur = rnd(15000, 19000);
        var d = dir;
        dir = dir === 'ltr' ? 'rtl' : 'ltr';
        for (var i = 0; i < n; i++) {
          (function (idx) {
            st.timers.push(setTimeout(function () {
              if (st.cancelled || st.meteorBusy) return;
              if (groundCount() >= MAX_GROUND_DINOS) return;   // hard cap on ground dinos
              walk(stage, species, {
                direction: d,
                duration: baseDur * rnd(0.95, 1.08),
                height: (sp.h * sizes[idx]) + '%',
                bottom: (sp.b + rnd(-0.4, 1.4)) + '%',
                zIndex: 6 + idx,   // smaller trailing members in FRONT — their heads stay visible
                palette: Math.random() < 0.5 ? 'green' : (Math.random() < 0.5 ? 'pink' : 'teal')
              });
            }, idx * rnd(3000, 4200)));   // wide stagger so followers don't hide behind the leader
          })(i);
        }
        /* longer gap between groups → fewer dinos over time */
        st.timers.push(setTimeout(spawnPack, baseDur * 0.55 + n * 2200 + rnd(6000, 12000)));
      }
      st.timers.push(setTimeout(spawnPack, 600));

      /* ── pterodactyl flights — most flights LAY an egg mid-air: usually a
            HATCHING egg that falls, cracks open and a baby peeks out, sometimes
            a rolling egg that tumbles off. Eggs only ARRIVE this way now. ── */
      function spawnPtero() {
        if (st.cancelled) return;
        if (!st.meteorBusy && pteroCount() === 0) {   // only one flyer at a time
          var dur = rnd(20000, 28000);
          var big = Math.random() < 0.5;   // 2 discrete size tiers
          var inst = fly(stage, {
            direction: Math.random() < 0.5 ? 'ltr' : 'rtl',
            duration: dur,
            height: (big ? rnd(16, 18.5) : rnd(10.5, 12.5)) + '%',
            top: (big ? rnd(5, 12) : rnd(11, 20)) + '%',   // the smaller one drifts higher/farther
            zIndex: big ? 5 : 4,
            palette: PTERO_PAL_NAMES[irnd(0, PTERO_PAL_NAMES.length - 1)]
          });
          if (inst && Math.random() < 0.8) {
            var layHatch = Math.random() < 0.6;   // 60% hatching, 40% rolling
            st.timers.push(setTimeout(function () {
              if (st.cancelled || inst.stopped || st.meteorBusy) return;
              /* keep to ~one egg: don't lay if a d2 egg is already on the grass */
              if (stage.querySelectorAll('.d2egg,.d2roll').length) return;
              var r = inst.element.getBoundingClientRect(), sr = stage.getBoundingClientRect();
              if (!r.width) return;
              var dx = r.left - sr.left + r.width * 0.42, dy = r.top - sr.top + r.height * 0.55;
              if (layHatch) dropHatchEgg(stage, st, dx, dy);
              else dropRollEgg(stage, st, dx, dy);
            }, rnd(3500, Math.min(dur * 0.6, 13000))));
          }
        }
        st.timers.push(setTimeout(spawnPtero, rnd(16000, 34000)));
      }
      st.timers.push(setTimeout(spawnPtero, rnd(2500, 7000)));

      /* ── ambient butterflies — keep ~2 drifting across ── */
      function spawnButterflies() {
        if (st.cancelled) return;
        if (!st.meteorBusy) spawnButterfly(stage, st);
        st.timers.push(setTimeout(spawnButterflies, rnd(6000, 12000)));
      }
      st.timers.push(setTimeout(spawnButterflies, 900));
      st.timers.push(setTimeout(function () { if (!st.cancelled && !st.meteorBusy) spawnButterfly(stage, st); }, 3500));

      /* ── ambient shooting star — a lone dusk comet now and then ── */
      function scheduleStar() {
        if (st.cancelled) return;
        shootingStar(st);
        st.timers.push(setTimeout(scheduleStar, rnd(18000, 40000)));
      }
      st.timers.push(setTimeout(scheduleStar, rnd(9000, 16000)));
      /* (the plain rolling egg is no longer spawned on a timer — a pterodactyl
         drops it, see spawnPtero above) */

      /* ── meteor event: sky darkens, dinos flee, comets fall ── */
      function meteorEvent() {
        if (st.meteorActive || st.cancelled) return;
        st.meteorActive = true;
        st.meteorBusy = true;
        /* dinos sprint off */
        liveWalkers.forEach(function (inst) {
          try { if (inst.animation) inst.animation.playbackRate = 10.5; } catch (e) {}
        });
        st.timers.push(setTimeout(function () {
          if (st.cancelled) return;
          if (st.meteor) { try { st.meteor.stop(); } catch (e) {} }
          st.meteor = startMeteors(stage, st, 12000);
        }, 1600));
        st.timers.push(setTimeout(function () {
          st.meteorBusy = false;
        }, 15000));
        st.timers.push(setTimeout(function () {
          st.meteorActive = false;
        }, METEOR_LOCKOUT_MS));
      }

      /* ── volcano clicks: erupt + countdown; every 10th → meteors ── */
      function volcanoClick() {
        if (st.meteorActive) return;
        st.clicks++;
        var left = st.clicks % METEOR_EVERY_CLICKS;
        st.counter.textContent = String(left === 0 ? 0 : METEOR_EVERY_CLICKS - left);
        st.counter.style.opacity = '.95';
        if (st._counterT) clearTimeout(st._counterT);
        st._counterT = setTimeout(function () { st.counter.style.opacity = '0'; }, 900);
        st.timers.push(st._counterT);
        erupt(st, true);
        if (left === 0) meteorEvent();
      }

      /* ── ONE document-level click router (capture phase).
            Order: game-UI whitelist → walkers/eggs (bbox) → volcano cone. ── */
      function onDown(e) {
        if (st.cancelled) return;
        if (e.target && e.target.closest &&
            e.target.closest('.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
        var x = e.clientX, y = e.clientY, i, r;
        /* walkers — topmost (highest z) first */
        var sorted = liveWalkers.slice().sort(function (a, b) {
          return (+b.element.style.zIndex || 0) - (+a.element.style.zIndex || 0);
        });
        for (i = 0; i < sorted.length; i++) {
          r = sorted[i].element.getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            reactHop(sorted[i]);
            e.stopPropagation();
            return;
          }
        }
        /* rolling eggs → heart burst */
        for (i = 0; i < st.rolls.length; i++) {
          r = st.rolls[i].element.getBoundingClientRect();
          if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            rollBounce(st.rolls[i], st);
            e.stopPropagation();
            return;
          }
        }
        /* eggs */
        for (i = 0; i < st.eggs.length; i++) {
          r = st.eggs[i].wrap.getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            st.eggs[i].hatch();
            e.stopPropagation();
            return;
          }
        }
        /* volcano cone — exact fill hit-test in SVG space */
        if (svgPointIn(st.sceneSvg, st.cone, x, y)) {
          volcanoClick();
          e.stopPropagation();
        }
      }
      doc.addEventListener('pointerdown', onDown, true);

      /* verification hooks (harness/tests only) */
      w.BACKGROUNDS.dinosaurs2._test = {
        erupt: function () { erupt(st, true); },
        meteor: meteorEvent,
        hatch: function (i) { if (st.eggs[i || 0] && st.eggs[i || 0].hatch) st.eggs[i || 0].hatch(); },
        drophatch: function () { return dropHatchEgg(stage, st, (stage.clientWidth || 800) * 0.5, (stage.clientHeight || 600) * 0.16); },
        react: function () { liveWalkers.slice().forEach(reactHop); return liveWalkers.length; },
        butterfly: function () { spawnButterfly(stage, st); },
        star: function () { shootingStar(st); },
        rollegg: function () { return dropRollEgg(stage, st, (stage.clientWidth || 800) * 0.4, (stage.clientHeight || 600) * 0.18); },
        state: st
      };

      return function cleanup() {
        st.cancelled = true;
        doc.removeEventListener('pointerdown', onDown, true);
        st.timers.forEach(clearTimeout);
        st.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        st.eggs.forEach(function (eg) { try { eg.remove(); } catch (e) {} });
        st.rolls.slice().forEach(function (inst) { try { inst.stop(); } catch (e) {} });
        st.oldEggs.forEach(function (eg) { try { (eg.remove || eg.stop)(); } catch (e) {} });
        liveWalkers.slice().forEach(function (inst) { try { inst.stop(); } catch (e) {} });
        if (st.meteor) { try { st.meteor.stop(); } catch (e) {} }
        delete w.BACKGROUNDS.dinosaurs2._test;
        stage.innerHTML = '';
      };
    },

    /* static art line-up for development screenshots */
    gallery: function (ctx) {
      var stage = ctx && ctx.stage;
      if (!stage) return function () {};
      stage.innerHTML = '';
      injectCSS();
      if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
      stage.style.background = 'linear-gradient(#c98bd6,#ffd9a0 70%,#6ea653 70.5%)';
      var defs = [
        ['bronto', '0.5%', '20%', 'green', '4%'], ['trikec', '25%', '18%', 'green', '4%'],
        ['stego', '47%', '17%', 'pink', '4%'], ['trex', '72%', '23%', 'teal', '4%'],
        ['stegoc', '46%', '18%', 'pink', '44%']
      ];
      defs.forEach(function (d) {
        var wrapEl = buildWalker(d[0], { height: d[2], bottom: d[4], palette: d[3] });
        wrapEl.style.transform = 'none';
        wrapEl.style.left = d[1];
        stage.appendChild(wrapEl);
      });
      /* pterodactyl line-up — every palette at a big + small size */
      PTERO_PAL_NAMES.forEach(function (palName, pi) {
        [16, 10.5].forEach(function (hPct, si) {
          var pt = el('div', 'd2w');
          pt.style.cssText = 'height:' + hPct + '%;top:' + (2 + si * 17) + '%;left:' +
            (5 + pi * 23) + '%;bottom:auto;z-index:6';
          var actP = el('div', 'd2act');
          actP.appendChild(parseSVG(applyPteroPal(PTERO_SVG, palName)));
          pt.appendChild(actP);
          stage.appendChild(pt);
        });
      });
      var egg = placeEgg(stage, { left: '91%', bottom: '4%', height: '13%' });
      var t = setTimeout(function () { egg.hatch(); }, 1200);
      return function cleanup() {
        clearTimeout(t);
        egg.remove();
        stage.style.background = '';
        stage.innerHTML = '';
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
