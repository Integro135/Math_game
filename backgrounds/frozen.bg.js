/* =====================================================================
   frozen.bg.js — "FROZEN" ice world: a crystalline ICE CASTLE on a frozen
   lake under the northern lights.
   ---------------------------------------------------------------------
   STANDALONE background module (not wired into the game yet — same
   workflow as dinosaurs2: developed against backgrounds/frozen.html,
   ported into the theme menu only on request).

   One self-contained IIFE: pure DOM/SVG/WAAPI, ES5, file:// safe, every
   class / keyframe / id namespaced fz*. Registers
       window.BACKGROUNDS.frozen = { skin, aids, preload,
                                     init({stage}) → cleanup,
                                     gallery({stage}) → cleanup }
   per the bg-loader contract (game/js/bg-loader.js).

   Scene: night-ice sky with THREE DANCING aurora curtains + twinkling
   stars + a haloed moon + distant lightning every few minutes (the bolt
   engine ported from success-lightning-storm.js), gradient crystalline
   mountain ranges (haze range, moonlit/shaded faces, wavy snow caps),
   snow-dusted firs, an IGLOO with a warm pulsing light, a frozen lake
   (sheen, cracks, a faint reflection) — and the centerpiece: a
   Frozen-style ICE PALACE crowning ITS OWN MOUNTAIN on the right
   (faceted spires, glowing arched windows, a winding summit path),
   gently sparkling with magic.
   Ambient: falling snow (two depths), OLAF (the pure-CSS pen rig from
   backgrounds/olaf.html, SCSS hand-compiled + scoped fzo*) who WANDERS the
   ice and breathes frost puffs, penguins that belly-slide across (a loner
   or a family march) leaving fading skate trails, a baby seal lounging by
   the shards, fish silhouettes cruising UNDER the frozen lake, and the odd
   shooting star (the Dubai-style comet).
   Clicks (ONE doc-level router, game-UI whitelisted):
       castle  → ice magic: windows flare + snowflake burst + aurora surge
       olaf    → happy hop + ❄💙☀️ burst
       penguin → a full spin + snow spray
       seal    → happy rock + flipper clap + ❄💙🐟 burst
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NS = 'http://www.w3.org/2000/svg';
  var SCENE_W = 1280, SCENE_H = 800;
  var LAKE_Y = 690;                     // the frozen-lake surface line

  /* ── helpers ─────────────────────────────────────────────────────── */
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
     would create HTML-namespace nodes that don't render). */
  function parseSVG(markup) {
    markup = markup.replace('<svg ', '<svg xmlns="' + NS + '" ');
    var d = new DOMParser().parseFromString(markup, 'image/svg+xml');
    return d.documentElement;
  }
  function animate(node, frames, opts) {
    if (node.animate) return node.animate(frames, opts);
    return null;                         // graceful no-WAAPI degradation
  }
  function gone(node, ms) {
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, ms);
  }

  /* ── CSS — injected once, everything namespaced fz ───────────────── */
  var CSS = [
    /* nothing in the decorative backdrop is text-selectable or clickable —
       the doc-level router works from coordinates */
    '.fzscene{position:absolute;inset:0;overflow:hidden;pointer-events:none;user-select:none;-webkit-user-select:none}',
    '.fzscene svg{display:block;width:100%;height:100%}',
    /* the aurora ribbons get a soft gaussian look via CSS blur */
    '.fzscene .fzAur{filter:blur(7px)}',
    /* glowing castle windows breathe gently */
    '.fzWin{animation:fzWinPulse 3.4s ease-in-out infinite}',
    '@keyframes fzWinPulse{0%,100%{opacity:.72}50%{opacity:1}}',
    /* falling snow — DOM flakes riding infinite WAAPI paths */
    '.fz-flake{position:absolute;top:0;pointer-events:none;color:#eaf7ff;user-select:none;',
    '  text-shadow:0 0 6px rgba(190,235,255,.85);will-change:transform;line-height:1}',
    /* sprite wrappers (snowman / penguin) */
    '.fzw{position:absolute;pointer-events:none;will-change:transform}',
    '.fzw .fzact{display:inline-block;height:100%;vertical-align:top}',
    '.fzw svg{height:100%;width:auto;display:block;overflow:visible}',
    '.fzw.fzflip svg{transform:scaleX(-1)}',
    '.fzw .fz-shadow{position:absolute;left:50%;bottom:-2%;width:80%;height:9%;transform:translateX(-50%);',
    '  border-radius:50%;background:radial-gradient(ellipse,rgba(20,45,80,.30),transparent 70%)}',
    /* blink (same recipe as the dino walkers) */
    '.fzw svg .eye{transform-box:fill-box;transform-origin:50% 50%;animation:fzBlink 3.6s ease-in-out infinite}',
    '@keyframes fzBlink{0%,86%,93%,100%{transform:scaleY(1)}89.5%{transform:scaleY(.08)}}',
    /* click bursts (emoji particles on the stage) */
    '.fzheart{position:absolute;pointer-events:none;z-index:9;opacity:0;transform:translate(-50%,-50%)}',
    /* penguin skate-trail scratch — a soft white line that fades off the ice */
    '.fz-trail{position:absolute;height:2.5px;border-radius:2px;pointer-events:none;z-index:5;',
    '  background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.85),rgba(255,255,255,0))}',
    /* olaf frost-breath puff */
    '.fz-puff{position:absolute;border-radius:50%;pointer-events:none;',
    '  background:radial-gradient(circle,rgba(255,255,255,.8),rgba(255,255,255,0) 70%)}',
    /* castle-magic firework dot */
    '.fz-fw{position:absolute;width:7px;height:7px;border-radius:50%;pointer-events:none;z-index:9}',
    /* baby seal idle breathing (the click clap rides the same act layer) */
    '.fz-seal .fzact{transform-origin:50% 100%;animation:fzSealBreath 3.4s ease-in-out infinite}',
    '@keyframes fzSealBreath{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.03)}}',
    '.fz-seal svg .fzs-flip{transform-box:fill-box;transform-origin:15% 50%}'
  ].join('\n');

  /* ── OLAF — ported from the pure-CSS Olaf pen (backgrounds/olaf.html).
        The SCSS (Compass mixins, vars, nesting) was hand-compiled to plain
        CSS and scoped under .fzo; the div rig is kept 1:1. Native size:
        120×160 body, full figure ≈120×310 incl. head+hair — rendered inside
        a .fzo-sc layer that is SCALED to the wrapper height at build time. ── */
  var OLAF_CSS = [
    '.fz-olaf{position:absolute;pointer-events:none;will-change:transform}',
    '.fz-olaf .fzo-a{position:relative;display:block;height:100%;transform-origin:50% 100%}',
    '.fzo-sc{position:absolute;bottom:0;left:0;width:120px;height:310px;transform-origin:0 100%}',
    '.fzo{position:absolute;bottom:0;left:0;height:160px;width:120px}',
    '.fzo *{position:absolute}',
    '.fzo :before,.fzo :after{position:absolute;content:"";width:0;height:0}',
    /* head */
    '.fzo .head{top:-152px;left:calc(50% - 48px);width:96px;height:116px;background:#fff;margin-top:44px;',
    '  border-radius:20% 20% 50% 50% / 15% 15% 85% 85%;',
    '  box-shadow:inset 10px -2px 35px -5px rgba(0,0,0,.3),inset 0 -8px 5px -5px rgba(0,0,0,.2);z-index:3}',
    '.fzo .head .top{height:44px;width:53px;top:-41px;left:calc(50% - 26.5px);background:#fff;',
    '  border-radius:45% 45% 1% 1% / 40% 40% 1% 1%;box-shadow:inset 15px 0 10px -5px rgba(0,0,0,.1)}',
    '.fzo .head .top:before,.fzo .head .top:after{top:16px;height:20px;width:34px;border-top:10px solid #fff;z-index:2}',
    '.fzo .head .top:before{border-top-color:#e0e0e0;border-radius:0 50% 0 0;left:-28px;transform:rotate(110deg)}',
    '.fzo .head .top:after{border-radius:50% 0 0 0;right:-28px;transform:rotate(-110deg)}',
    '.fzo .head .top .shadow{left:-6%;top:38px;height:30%;width:116%;box-shadow:inset 0 -2px 8px -4px rgba(0,0,0,.2);',
    '  border-radius:1% 1% 45% 45% / 1% 1% 40% 40%;z-index:3}',
    /* twig hair */
    '.fzo .hair{top:-35px;left:38px;z-index:-1}',
    '.fzo .hair span{bottom:0;height:32px;width:10px;border-right:2px solid #533F38}',
    '.fzo .hair>span:nth-of-type(1){height:27px;left:-5px;transform:rotate(-10deg);border-radius:10%}',
    '.fzo .hair>span:nth-of-type(1)>span:nth-of-type(1){left:0;height:22px;bottom:23px;transform:rotate(-5deg);border-radius:30%}',
    '.fzo .hair>span:nth-of-type(1)>span:nth-of-type(2){left:-4px;bottom:18px;height:22px;transform:rotate(-40deg);border-radius:30%}',
    '.fzo .hair>span:nth-of-type(1)>span:nth-of-type(2) span{left:-3px;bottom:17px;height:16px;transform:rotate(-35deg);border-radius:30%}',
    '.fzo .hair>span:nth-of-type(2){transform:rotate(-2deg);border-radius:10%}',
    '.fzo .hair>span:nth-of-type(2) span{left:-2px;height:27px;bottom:30px;transform:rotate(-10deg);border-radius:30%}',
    '.fzo .hair>span:nth-of-type(2) span span{left:-4px;bottom:22px;transform:rotate(-20deg)}',
    '.fzo .hair>span:nth-of-type(3){border-right:none;border-left:2px solid #533F38;height:30px;left:14px;transform:rotate(5deg);border-radius:10%}',
    '.fzo .hair>span:nth-of-type(3) span{left:1px;height:24px;bottom:25px;border-right:none;border-left:2px solid #533F38;transform:rotate(15deg);border-radius:30%}',
    '.fzo .hair>span:nth-of-type(3) span span:nth-of-type(1){left:-3px;height:14px;bottom:17px;transform:rotate(-10deg)}',
    '.fzo .hair>span:nth-of-type(3) span span:nth-of-type(2){left:3px;bottom:17px;transform:rotate(25deg)}',
    /* brows */
    '.fzo .brow{top:-36px;height:5px;width:20px;background:#413121}',
    '.fzo .brow.left{left:27px;transform:rotate(-13deg);border-radius:40% 1% 10% 5% / 70% 1% 20% 20%}',
    '.fzo .brow.right{right:25px;transform:rotate(13deg);border-radius:1% 40% 5% 10% / 1% 70% 20% 20%}',
    '.fzo .brow:before{top:4px;height:12px;width:15px}',
    '.fzo .brow.left:before{left:-5px;border-radius:90% 0 0 0 / 99% 0 0 0;box-shadow:-1px -4px 0 0 #413121;transform:skewX(-10deg)}',
    '.fzo .brow.right:before{right:-5px;border-radius:0 90% 0 0 / 0 99% 0 0;box-shadow:1px -4px 0 0 #413121;transform:skewX(10deg)}',
    /* googly eyes (blink rides the shared fzBlink keyframes) */
    '.fzo .eye{top:-18px;height:24px;width:20px;z-index:5;background:#fff;border-radius:50%;',
    '  box-shadow:0 -1px 0 1px #010100,0 1px 1px 1px rgba(75,120,134,.8),0 -3px 0 2px rgba(36,82,94,.8),inset 0 -15px 10px -5px rgba(0,0,0,.2);',
    '  transform-origin:50% 60%;animation:fzBlink 4.2s ease-in-out infinite}',
    '.fzo .eye.left{left:28px}',
    '.fzo .eye.right{right:24px}',
    '.fzo .pupil{top:34%;height:44%;width:52%;background:#000;border-radius:50%}',
    '.fzo .eye.left .pupil{left:30%}',
    '.fzo .eye.right .pupil{right:30%}',
    /* carrot nose */
    '.fzo .nose{top:0;left:42px;height:23px;width:28px;background:#EC622A;overflow:hidden;',
    '  border-radius:40% 60% 40% 30% / 70% 60% 40% 30%;box-shadow:inset 8px -5px 5px 0 rgba(0,0,0,.3);z-index:6}',
    '.fzo .nose:before{top:-5px;right:0;height:110%;width:60%;transform:rotate(-30deg);',
    '  background:radial-gradient(ellipse at 50% 70%,rgba(255,255,255,.5) 0%,rgba(255,255,255,0) 90%)}',
    /* the big happy mouth */
    '.fzo .mouth{top:14px;left:calc(50% - 32px);height:76px;width:68px;background:#234148;z-index:2;',
    '  border-radius:25% 25% 50% 50% / 5% 5% 95% 95%}',
    '.fzo .top-lip{top:10px;left:calc(50% - 39px);width:82px;height:35px;background:#fff;z-index:4;',
    '  box-shadow:-2px 5px 10px -1px rgba(0,0,0,.2),inset 10px 0 15px -5px rgba(0,0,0,.2);',
    '  border-radius:20% 20% 40% 60% / 10% 20% 70% 90%}',
    '.fzo .tooth{left:40%;top:40px;width:35px;height:16px;background:#fff;z-index:3;',
    '  border-radius:1% 1% 40% 50% / 1% 1% 20% 20%}',
    '.fzo .bottom-lip{top:12px;left:calc(50% - 39px);height:84px;width:82px;z-index:1;',
    '  border-radius:25% 25% 50% 50% / 5% 5% 95% 95%;',
    '  box-shadow:0 5px 10px -4px rgba(0,0,0,.3),inset 2px 0 10px -5px rgba(0,0,0,.2)}',
    /* snowball body + coal buttons */
    '.fzo .body{top:0;left:calc(50% - 60px);background:#fff;',
    '  border-radius:35% 35% 30% 40% / 60% 60% 40% 40%;',
    '  box-shadow:inset 2px 5px 10px -6px rgba(0,0,0,.2),inset 20px 5px 30px -6px rgba(0,0,0,.2),inset 0 -5px 15px -2px rgba(0,0,0,.2)}',
    '.fzo .body.top{left:calc(50% - 40px);height:60px;width:80px;z-index:2;overflow:hidden}',
    '.fzo .body.top:before{height:10px;width:50%;left:20%;background:radial-gradient(ellipse at center,rgba(0,0,0,.3) 0%,rgba(0,0,0,0) 80%)}',
    '.fzo .body.bottom{top:50px;height:90px;width:120px;z-index:1}',
    '.fzo .button{height:22px;width:26px;top:20px;left:calc(50% - 13px);background:#222;',
    '  border-radius:45% 55% 40% 50% / 60% 55% 45% 40%}',
    '.fzo .button ~ .button{top:55px}',
    '.fzo .button:before{right:8px;bottom:7px;height:0;width:10%;box-shadow:0 0 8px 2px rgba(255,255,255,.4)}',
    /* twig arms */
    '.fzo .arm{top:20px;width:40px;height:10px}',
    '.fzo .arm.left{left:-17px;transform-origin:top right;transform:rotate(40deg)}',
    '.fzo .arm.right{right:-17px;transform-origin:top left;transform:rotate(-40deg)}',
    '.fzo .upper-arm{top:-3px;width:40px;height:3px;background:#533F38}',
    '.fzo .lower-arm{top:0;width:40px;height:3px;background:#533F38}',
    '.fzo .arm.left .lower-arm{left:-40px}',
    '.fzo .arm.right .lower-arm{right:-40px}',
    '.fzo .arm.left .upper-arm span,.fzo .arm.left .lower-arm span{right:-2px}',
    '.fzo .arm.right .upper-arm span,.fzo .arm.right .lower-arm span{left:-2px}',
    '.fzo .upper-arm>span{top:-2px;height:7px;width:10px;background:#533F38;border-radius:50%}',
    '.fzo .lower-arm>span{top:-1px;height:5px;width:7px;background:#533F38;border-radius:50%}',
    '.fzo .hand>span{top:-2px;height:7px;width:10px;background:#533F38;border-radius:50%}',
    '.fzo .arm.left .hand{left:0}',
    '.fzo .arm.right .hand{right:0}',
    '.fzo .arm.left .fingers{left:-4px}',
    '.fzo .arm.right .fingers{right:-4px}',
    '.fzo .fingers span{width:15px;height:3px;background:#533F38}',
    '.fzo .fingers span:nth-of-type(1){width:10px}',
    '.fzo .arm.left .fingers span{transform-origin:right top}',
    '.fzo .arm.right .fingers span{transform-origin:left top}',
    '.fzo .arm.left .fingers span:nth-of-type(1){right:-7px;transform:rotate(45deg)}',
    '.fzo .arm.right .fingers span:nth-of-type(1){left:-7px;transform:rotate(-45deg)}',
    '.fzo .fingers span:nth-of-type(2){transform:rotate(-30deg)}',
    '.fzo .fingers span:nth-of-type(4){transform:rotate(30deg)}',
    /* snowball feet */
    '.fzo .foot{bottom:0;height:32px;width:43px;overflow:hidden;background:#fff;',
    '  border-radius:35% 35% 30% 40% / 60% 60% 40% 40%;',
    '  box-shadow:inset 2px 5px 10px -6px rgba(0,0,0,.2),inset 20px 5px 30px -6px rgba(0,0,0,.2),inset 0 -5px 15px -2px rgba(0,0,0,.2)}',
    '.fzo .foot.left{left:12px}',
    '.fzo .foot.right{right:12px}',
    '.fzo .foot.left:before{top:-3px}',
    '.fzo .foot:before{height:15px;width:100%;left:-10%;background:radial-gradient(ellipse at center,rgba(0,0,0,.3) 0%,rgba(0,0,0,0) 80%)}',
    /* walk cycle — ON only while the fzo-walk class rides the wrapper:
       feet step alternately, twig arms swing (keyframes INCLUDE their base
       ±40deg pose, which a bare animation would otherwise override), and the
       head rocks gently. The crossing itself is a WAAPI translate in JS. */
    '.fz-olaf.fzo-walk .foot.left{animation:fzoStepL .52s ease-in-out infinite}',
    '.fz-olaf.fzo-walk .foot.right{animation:fzoStepR .52s ease-in-out infinite}',
    '@keyframes fzoStepL{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}',
    '@keyframes fzoStepR{0%,100%{transform:translateY(-7px)}50%{transform:translateY(0)}}',
    '.fz-olaf.fzo-walk .arm.left{animation:fzoArmL 1.04s ease-in-out infinite}',
    '.fz-olaf.fzo-walk .arm.right{animation:fzoArmR 1.04s ease-in-out infinite}',
    '@keyframes fzoArmL{0%,100%{transform:rotate(40deg)}50%{transform:rotate(29deg)}}',
    '@keyframes fzoArmR{0%,100%{transform:rotate(-29deg)}50%{transform:rotate(-40deg)}}',
    '.fz-olaf.fzo-walk .head{transform-origin:50% 92%;animation:fzoHeadRock 1.04s ease-in-out infinite}',
    '@keyframes fzoHeadRock{0%,100%{transform:rotate(-1.7deg)}50%{transform:rotate(1.7deg)}}'
  ].join('\n');

  function injectCSS() {
    if (doc.getElementById('frozen-css')) return;
    var s = el('style');
    s.id = 'frozen-css';
    s.textContent = CSS + '\n' + OLAF_CSS;
    doc.head.appendChild(s);
  }

  /* ══ SCENE PARTS ═══════════════════════════════════════════════════ */

  /* sharp crystalline ridge through explicit peaks. Each summit gets a
     moonlit-left / shaded-right face (the moon hangs top-left) and a WAVY
     3-lobe snow cap that hugs the two STRAIGHT edges exactly (no floating
     caps — the dinosaurs2 lesson). */
  function ridge(peaks, fill, capFill, capDrop) {
    var d = 'M' + peaks[0][0] + ',' + peaks[0][1], i;
    for (i = 1; i < peaks.length; i++) d += ' L' + peaks[i][0] + ',' + peaks[i][1];
    d += ' L' + peaks[peaks.length - 1][0] + ',' + SCENE_H + ' L' + peaks[0][0] + ',' + SCENE_H + ' Z';
    var out = '<path d="' + d + '" fill="' + fill + '"/>';
    for (i = 1; i < peaks.length - 1; i++) {
      var p = peaks[i], a = peaks[i - 1], b = peaks[i + 1];
      if (p[1] < a[1] && p[1] < b[1]) {              // a local summit
        /* right-face shading (light from the moon on the left) */
        var sT = Math.min(capDrop * 3.4 / Math.max(1, (b[1] - p[1])), 0.85);
        var shx = p[0] + (b[0] - p[0]) * sT, shy = p[1] + (b[1] - p[1]) * sT;
        out += '<path d="M' + p[0] + ',' + p[1] + ' L' + shx.toFixed(1) + ',' + shy.toFixed(1) +
          ' L' + p[0] + ',' + shy.toFixed(1) + ' Z" fill="#16324f" opacity=".14"/>';
        /* wavy snow cap */
        var t = Math.min(capDrop / Math.max(1, (a[1] - p[1])), 0.9);
        var u = Math.min(capDrop / Math.max(1, (b[1] - p[1])), 0.9);
        var lx = p[0] + (a[0] - p[0]) * t, ly = p[1] + (a[1] - p[1]) * t;
        var rx = p[0] + (b[0] - p[0]) * u, ry = p[1] + (b[1] - p[1]) * u;
        out += '<path d="M' + lx.toFixed(1) + ',' + ly.toFixed(1) + ' L' + p[0] + ',' + p[1] +
          ' L' + rx.toFixed(1) + ',' + ry.toFixed(1) +
          ' Q' + (p[0] + (rx - p[0]) * 0.55).toFixed(1) + ',' + (p[1] + capDrop * 0.98).toFixed(1) + ' ' +
                 (p[0] + (rx - p[0]) * 0.2).toFixed(1) + ',' + (p[1] + capDrop * 0.62).toFixed(1) +
          ' Q' + p[0] + ',' + (p[1] + capDrop * 1.02).toFixed(1) + ' ' +
                 (p[0] + (lx - p[0]) * 0.3).toFixed(1) + ',' + (p[1] + capDrop * 0.6).toFixed(1) +
          ' Q' + (p[0] + (lx - p[0]) * 0.68).toFixed(1) + ',' + (p[1] + capDrop * 0.95).toFixed(1) + ' ' +
                 lx.toFixed(1) + ',' + ly.toFixed(1) + ' Z" fill="' + capFill + '"/>';
      }
    }
    return out;
  }

  /* a snow-dusted fir: three stacked tiers, drawn BOTTOM tier first so each
     upper tier overlaps the one below; every tier carries an apex-sharing
     white snow triangle (55% of the tier) so the snow clearly sits ON it. */
  function fir(x, baseY, h) {
    var out = '<rect x="' + (x - h * 0.05) + '" y="' + (baseY - h * 0.09) + '" width="' + (h * 0.10) +
      '" height="' + (h * 0.11) + '" rx="' + (h * 0.02) + '" fill="#3a3050"/>', k;
    for (k = 2; k >= 0; k--) {
      var topY = baseY - h + k * 0.26 * h;
      var tw = h * (0.20 + 0.115 * k);
      var botY = topY + 0.42 * h;
      out += '<path d="M' + (x - tw).toFixed(1) + ',' + botY.toFixed(1) + ' L' + x + ',' + topY.toFixed(1) +
        ' L' + (x + tw).toFixed(1) + ',' + botY.toFixed(1) + ' Z" fill="#24507a" stroke="#1a3a5c" stroke-width="1.5" stroke-linejoin="round"/>';
      out += '<path d="M' + (x - tw * 0.55).toFixed(1) + ',' + (topY + 0.23 * h).toFixed(1) + ' L' + x + ',' + topY.toFixed(1) +
        ' L' + (x + tw * 0.55).toFixed(1) + ',' + (topY + 0.23 * h).toFixed(1) + ' Z" fill="#eaf6ff" opacity=".95"/>';
    }
    return out;
  }

  /* pointed-arch window path (used by every tower + the gate) */
  function winP(cx, topY, wHalf, h) {
    return 'M' + (cx - wHalf) + ',' + (topY + h) + ' L' + (cx - wHalf) + ',' + (topY + h * 0.42) +
      ' Q' + cx + ',' + topY + ' ' + (cx + wHalf) + ',' + (topY + h * 0.42) +
      ' L' + (cx + wHalf) + ',' + (topY + h) + ' Z';
  }

  /* ── THE ICE CASTLE — a grand crystal palace, x≈820-1290 on the lake at
        y=690. Five faceted towers + pinnacles crown a two-tier central spire
        that pierces the auroras; a grand staircase descends to the ice; ice
        shards burst at the flanks; flying buttresses brace the outer towers;
        a rose snowflake window glows over the gate. Every face is split
        light|shade with a white LIT EDGE so it reads as cut ice; windows
        carry a glowing gradient + a white flare twin (fzWinGlow, lit by the
        click magic). ── */
  var T_LIGHT = '#e2f4fe', T_MID = '#bce0f6', T_SHADE = '#8fc4e8', T_OUT = '#3e78ad',
      T_SPL = '#f7fcff', T_SPR = '#b6dcf3';
  /* a faceted crystal tower: 3-strip shaft, crown flare with icicle drips,
     light|shade spire halves and a white lit edge */
  function fzTower(cx, base, w, topY, peakY) {
    var h = w / 2, ht = h * 0.84, fw = h * 1.3, sb = fw * 0.8, fy = topY - 14;
    var n = function (v) { return (+v).toFixed(1); };
    return [
      '<path d="M' + n(cx - h) + ',' + base + ' L' + n(cx + h) + ',' + base + ' L' + n(cx + ht) + ',' + topY + ' L' + n(cx - ht) + ',' + topY + ' Z" fill="' + T_MID + '" stroke="' + T_OUT + '" stroke-width="2.4" stroke-linejoin="round"/>',
      '<path d="M' + n(cx - h) + ',' + base + ' L' + n(cx - h * 0.42) + ',' + base + ' L' + n(cx - ht * 0.42) + ',' + topY + ' L' + n(cx - ht) + ',' + topY + ' Z" fill="' + T_LIGHT + '"/>',
      '<path d="M' + n(cx + h * 0.16) + ',' + base + ' L' + n(cx + h) + ',' + base + ' L' + n(cx + ht) + ',' + topY + ' L' + n(cx + ht * 0.16) + ',' + topY + ' Z" fill="' + T_SHADE + '" opacity=".9"/>',
      '<path d="M' + n(cx - fw) + ',' + topY + ' L' + n(cx + fw) + ',' + topY + ' L' + n(cx + fw * 0.72) + ',' + fy + ' L' + n(cx - fw * 0.72) + ',' + fy + ' Z" fill="' + T_LIGHT + '" stroke="' + T_OUT + '" stroke-width="2.2" stroke-linejoin="round"/>',
      '<path d="M' + n(cx - fw + 2) + ',' + topY + ' l5,12 l5,-12 M' + n(cx + fw - 12) + ',' + topY + ' l5,12 l5,-12" fill="#dff3ff" stroke="#8cbede" stroke-width="1.3"/>',
      '<path d="M' + n(cx - sb) + ',' + fy + ' L' + n(cx + sb) + ',' + fy + ' L' + cx + ',' + peakY + ' Z" fill="' + T_SPL + '" stroke="' + T_OUT + '" stroke-width="2.3" stroke-linejoin="round"/>',
      '<path d="M' + cx + ',' + fy + ' L' + n(cx + sb) + ',' + fy + ' L' + cx + ',' + peakY + ' Z" fill="' + T_SPR + '"/>',
      '<path d="M' + n(cx - sb) + ',' + fy + ' L' + cx + ',' + peakY + '" fill="none" stroke="#ffffff" stroke-width="1.8" opacity=".85"/>'
    ].join('');
  }
  /* a 6-spoke snowflake motif (rose-window heart, wall etchings) */
  function fzFlakeMotif(cx, cy, r, op) {
    var out = '<g stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="' + op + '">', a, i;
    for (i = 0; i < 3; i++) {
      a = Math.PI / 6 + i * Math.PI / 3;
      out += '<path d="M' + (cx - Math.cos(a) * r).toFixed(1) + ',' + (cy - Math.sin(a) * r).toFixed(1) +
        ' L' + (cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1) + '"/>';
    }
    return out + '</g>';
  }
  var WINDOWS = [
    { d: winP(1055, 545, 19, 81), gate: true },                       // the grand gate
    { d: winP(985, 532, 11, 58) }, { d: winP(1125, 532, 11, 58) },    // tall body windows
    { d: winP(985, 392, 8, 30) }, { d: winP(1125, 400, 8, 30) },      // inner towers
    { d: winP(912, 545, 7, 26) }, { d: winP(1198, 552, 7, 26) },      // outer towers
    { d: winP(1055, 264, 6, 24) }                                     // upper central tier
  ];
  function castleMarkup() {
    var m = [
      /* scaled ×0.72 about its base centre (1055,690) and lifted 185px, so the
         palace CROWNS THE MOUNT: base centre lands at (1055,505) — the summit
         plateau. translate(295.4,8.2)+scale(.72) is exactly that mapping. */
      '<g id="fzCastle" transform="translate(295.4,8.2) scale(0.72)">',
      /* glowing ice-chamber gradient for every window (defs ride inside the
         group so the gallery svg gets them too) */
      '<defs><linearGradient id="fzWinG" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#eafcff"/><stop offset=".55" stop-color="#8fe0ff"/><stop offset="1" stop-color="#5fc8f5"/>',
      '</linearGradient></defs>',
      /* ground-contact shadow — anchors the palace to the frozen lake */
      '<ellipse cx="1055" cy="692" rx="205" ry="9.5" fill="#1e3d63" opacity=".22"/>',
      /* ── ice shards bursting from the lake at the flanks ── */
      '<path d="M868,690 L845,582 L898,690 Z" fill="#d8f0ff" stroke="#eef9ff" stroke-width="2.2" stroke-linejoin="round" opacity=".92"/>',
      '<path d="M842,690 L818,628 L866,690 Z" fill="#bfe2f8" stroke="#eef9ff" stroke-width="2" stroke-linejoin="round" opacity=".9"/>',
      '<path d="M892,690 L878,634 L914,690 Z" fill="#cfe9fb" stroke="#eef9ff" stroke-width="1.8" stroke-linejoin="round" opacity=".85"/>',
      '<path d="M1242,690 L1265,582 L1212,690 Z" fill="#d8f0ff" stroke="#eef9ff" stroke-width="2.2" stroke-linejoin="round" opacity=".92"/>',
      '<path d="M1268,690 L1290,628 L1244,690 Z" fill="#bfe2f8" stroke="#eef9ff" stroke-width="2" stroke-linejoin="round" opacity=".9"/>',
      '<path d="M1218,690 L1232,634 L1196,690 Z" fill="#cfe9fb" stroke="#eef9ff" stroke-width="1.8" stroke-linejoin="round" opacity=".85"/>',
      /* ── grand stepped base ── */
      '<path d="M885,690 L1225,690 L1204,656 L906,656 Z" fill="#bfe0f5" stroke="' + T_OUT + '" stroke-width="2.5" stroke-linejoin="round"/>',
      '<path d="M906,656 L1204,656 L1200,662 L910,662 Z" fill="#e8f6ff" opacity=".8"/>',
      '<path d="M934,656 L1176,656 L1162,626 L948,626 Z" fill="#cfe9f9" stroke="' + T_OUT + '" stroke-width="2.5" stroke-linejoin="round"/>',
      /* icicles off the base lip (clear of the staircase) */
      '<path d="M912,692 L920,714 L928,692 M946,692 L953,710 L960,692 M974,692 L982,716 L990,692 M1122,692 L1130,716 L1138,692 M1152,692 L1159,710 L1166,692 M1184,692 L1191,712 L1198,692" fill="#dff3ff" stroke="#8cbede" stroke-width="1.6" stroke-linejoin="round"/>',
      /* ── inner towers (tucked behind the body) ── */
      fzTower(985, 560, 48, 360, 205),
      fzTower(1125, 560, 48, 372, 232),
      /* ── central tower, lower shaft (behind the body) ── */
      '<path d="M1023,560 L1087,560 L1081,330 L1029,330 Z" fill="' + T_MID + '" stroke="' + T_OUT + '" stroke-width="2.5" stroke-linejoin="round"/>',
      '<path d="M1023,560 L1036,560 L1040,330 L1029,330 Z" fill="' + T_LIGHT + '"/>',
      '<path d="M1066,560 L1087,560 L1081,330 L1062,330 Z" fill="' + T_SHADE + '" opacity=".9"/>',
      /* ── palace body ── */
      '<path d="M945,626 L1165,626 L1157,486 L953,486 Z" fill="' + T_MID + '" stroke="' + T_OUT + '" stroke-width="2.5" stroke-linejoin="round"/>',
      '<path d="M945,626 L987,626 L990,486 L953,486 Z" fill="' + T_LIGHT + '"/>',
      '<path d="M1077,626 L1165,626 L1157,486 L1073,486 Z" fill="' + T_SHADE + '" opacity=".85"/>',
      /* cornice + its icicle drips */
      '<path d="M948,486 L1162,486 L1154,470 L956,470 Z" fill="#e8f6ff" stroke="' + T_OUT + '" stroke-width="2" stroke-linejoin="round"/>',
      '<path d="M958,488 L964,502 L970,488 M1004,488 L1010,500 L1016,488 M1094,488 L1100,500 L1106,488 M1140,488 L1146,502 L1152,488" fill="#dff3ff" stroke="#8cbede" stroke-width="1.3"/>',
      /* pinnacles on the cornice corners */
      '<path d="M950,470 L978,470 L964,404 Z" fill="#d6edfb" stroke="' + T_OUT + '" stroke-width="2.2" stroke-linejoin="round"/>',
      '<path d="M964,470 L978,470 L964,404 Z" fill="#a9d4ef"/>',
      '<path d="M1132,470 L1160,470 L1146,404 Z" fill="#d6edfb" stroke="' + T_OUT + '" stroke-width="2.2" stroke-linejoin="round"/>',
      '<path d="M1146,470 L1160,470 L1146,404 Z" fill="#a9d4ef"/>',
      /* flying ice buttresses bracing the outer towers */
      '<path d="M930,470 Q947,458 956,486" fill="none" stroke="#cfe9fa" stroke-width="7" stroke-linecap="round"/>',
      '<path d="M930,468 Q947,456 955,482" fill="none" stroke="#ffffff" stroke-width="2" opacity=".7" stroke-linecap="round"/>',
      '<path d="M1180,478 Q1164,466 1154,492" fill="none" stroke="#cfe9fa" stroke-width="7" stroke-linecap="round"/>',
      '<path d="M1180,476 Q1164,464 1155,488" fill="none" stroke="#ffffff" stroke-width="2" opacity=".7" stroke-linecap="round"/>',
      /* ── outer towers standing on the base step ── */
      fzTower(912, 656, 36, 470, 338),
      fzTower(1198, 656, 36, 478, 352),
      /* ── central tower, upper tiers + the great spire ── */
      '<path d="M1009,330 L1101,330 L1096,316 L1014,316 Z" fill="' + T_LIGHT + '" stroke="' + T_OUT + '" stroke-width="2.2" stroke-linejoin="round"/>',
      '<path d="M1012,332 l5,11 l5,-11 M1084,332 l5,11 l5,-11" fill="#dff3ff" stroke="#8cbede" stroke-width="1.3"/>',
      '<path d="M1035,316 L1075,316 L1072,240 L1038,240 Z" fill="' + T_MID + '" stroke="' + T_OUT + '" stroke-width="2.3" stroke-linejoin="round"/>',
      '<path d="M1035,316 L1049,316 L1051,240 L1038,240 Z" fill="' + T_LIGHT + '"/>',
      '<path d="M1062,316 L1075,316 L1072,240 L1060,240 Z" fill="' + T_SHADE + '" opacity=".9"/>',
      '<path d="M1025,240 L1085,240 L1080,228 L1030,228 Z" fill="' + T_LIGHT + '" stroke="' + T_OUT + '" stroke-width="2.2" stroke-linejoin="round"/>',
      '<path d="M1031,228 L1079,228 L1055,92 Z" fill="' + T_SPL + '" stroke="' + T_OUT + '" stroke-width="2.6" stroke-linejoin="round"/>',
      '<path d="M1055,228 L1079,228 L1055,92 Z" fill="#bfe0f5"/>',
      '<path d="M1031,228 L1055,92" fill="none" stroke="#ffffff" stroke-width="1.8" opacity=".9"/>',
      '<path d="M1033,230 L1027,254 L1040,232 M1077,230 L1083,254 L1070,232" fill="#dff3ff" stroke="#8cbede" stroke-width="1.4"/>',
      /* snowflake finial at the very top */
      '<g stroke="#eaf9ff" stroke-width="2.6" stroke-linecap="round">',
      '<circle id="fzSpireTip" cx="1055" cy="88" r="1.2" fill="#eaf9ff" stroke="none"/>',
      '<path d="M1055,68 L1055,108 M1040,73 L1070,103 M1040,103 L1070,73 M1037,88 L1073,88" opacity=".95"/>',
      '<path d="M1055,68 L1050,74 M1055,68 L1060,74 M1055,108 L1050,102 M1055,108 L1060,102" opacity=".8"/>',
      '</g>',
      /* ── gate frame + rose snowflake window + wall etchings ── */
      '<path d="' + winP(1055, 536, 25, 90) + '" fill="#9fcfec" stroke="#3a719f" stroke-width="2.5" stroke-linejoin="round"/>',
      '<circle class="fzWin" cx="1055" cy="428" r="24" fill="url(#fzWinG)" stroke="#3a719f" stroke-width="2.5"/>',
      fzFlakeMotif(1055, 428, 17, '.9'),
      '<circle cx="1055" cy="428" r="6.5" fill="#eafcff" opacity=".95"/>',
      '<circle class="fzWinGlow" cx="1055" cy="428" r="24" fill="#ffffff" opacity="0" pointer-events="none"/>',
      fzFlakeMotif(1002, 578, 9, '.45'),
      fzFlakeMotif(1108, 578, 9, '.45')
    ];
    /* windows: glowing gradient + a white flare twin lit by the click magic */
    var i;
    for (i = 0; i < WINDOWS.length; i++) {
      var wdef = WINDOWS[i];
      m.push('<path class="fzWin" d="' + wdef.d + '" fill="url(#fzWinG)" stroke="' +
        (wdef.gate ? '#3a719f' : '#4a7fb0') + '" stroke-width="' + (wdef.gate ? 2.5 : 2) + '"/>');
      m.push('<path class="fzWinGlow" d="' + wdef.d + '" fill="#ffffff" opacity="0" pointer-events="none"/>');
    }
    /* ── grand staircase down to the ice, with crystal-orb balustrades ── */
    m.push(
      '<path d="M1031,626 L1079,626 L1079,647 L1031,647 Z" fill="#cfe9f9" stroke="' + T_OUT + '" stroke-width="2"/>',
      '<path d="M1031,626 L1079,626 L1079,631 L1031,631 Z" fill="#eef9ff"/>',
      '<path d="M1019,647 L1091,647 L1091,668 L1019,668 Z" fill="#cfe9f9" stroke="' + T_OUT + '" stroke-width="2"/>',
      '<path d="M1019,647 L1091,647 L1091,652 L1019,652 Z" fill="#eef9ff"/>',
      '<path d="M1007,668 L1103,668 L1103,690 L1007,690 Z" fill="#cfe9f9" stroke="' + T_OUT + '" stroke-width="2"/>',
      '<path d="M1007,668 L1103,668 L1103,673 L1007,673 Z" fill="#eef9ff"/>',
      '<g fill="#e8f7ff" stroke="' + T_OUT + '" stroke-width="1.6">',
      '<circle cx="1027" cy="624" r="4"/><circle cx="1083" cy="624" r="4"/>',
      '<circle cx="1015" cy="645" r="4"/><circle cx="1095" cy="645" r="4"/>',
      '<circle cx="1003" cy="666" r="4"/><circle cx="1107" cy="666" r="4"/>',
      '</g>',
      '</g>');
    return m.join('');
  }

  /* ── the full backdrop SVG ── */
  function buildScene(stage, st) {
    var scene = el('div', 'fzscene');
    var svg = svgEl('svg', { viewBox: '0 0 ' + SCENE_W + ' ' + SCENE_H, preserveAspectRatio: 'xMidYMid slice' });

    var stars = '', i;
    for (i = 0; i < 42; i++) {
      stars += '<circle class="fzstar" cx="' + rnd(15, 1265).toFixed(0) + '" cy="' + rnd(14, 330).toFixed(0) +
        '" r="' + rnd(1.2, 2.8).toFixed(1) + '" fill="#eef7ff" opacity="' + rnd(0.35, 0.9).toFixed(2) + '"/>';
    }

    var firs =
      fir(72, 688, 100) + fir(152, 692, 132) + fir(252, 687, 84) +
      fir(342, 691, 112) + fir(1254, 690, 78);

    svg.innerHTML = [
      '<defs>',
      '<linearGradient id="fzSkyG" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#14235a"/><stop offset=".45" stop-color="#24478a"/>',
      '<stop offset=".8" stop-color="#4a7cb8"/><stop offset="1" stop-color="#8fc4e2"/>',
      '</linearGradient>',
      '<linearGradient id="fzAurG1" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#8fffdc" stop-opacity="0"/><stop offset=".35" stop-color="#8fffdc" stop-opacity=".68"/>',
      '<stop offset=".7" stop-color="#7fc4ff" stop-opacity=".5"/><stop offset="1" stop-color="#7fc4ff" stop-opacity="0"/>',
      '</linearGradient>',
      '<linearGradient id="fzAurG2" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#b48fff" stop-opacity="0"/><stop offset=".4" stop-color="#b48fff" stop-opacity=".52"/>',
      '<stop offset=".75" stop-color="#8fffe4" stop-opacity=".42"/><stop offset="1" stop-color="#8fffe4" stop-opacity="0"/>',
      '</linearGradient>',
      '<linearGradient id="fzAurG3" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#ff9fd0" stop-opacity="0"/><stop offset=".45" stop-color="#ff9fd0" stop-opacity=".4"/>',
      '<stop offset="1" stop-color="#9fb8ff" stop-opacity="0"/>',
      '</linearGradient>',
      '<linearGradient id="fzLakeG" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#d9f2ff"/><stop offset=".5" stop-color="#b3ddf5"/><stop offset="1" stop-color="#8fc6e9"/>',
      '</linearGradient>',
      '<radialGradient id="fzMoonHalo" cx=".5" cy=".5" r=".5">',
      '<stop offset=".3" stop-color="#eaf7ff" stop-opacity=".55"/><stop offset="1" stop-color="#eaf7ff" stop-opacity="0"/>',
      '</radialGradient>',
      '<radialGradient id="fzCastleHalo" cx=".5" cy=".45" r=".55">',
      '<stop offset="0" stop-color="#bfe9ff" stop-opacity=".32"/><stop offset=".7" stop-color="#bfe9ff" stop-opacity=".1"/><stop offset="1" stop-color="#bfe9ff" stop-opacity="0"/>',
      '</radialGradient>',
      '<linearGradient id="fzMtFar" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#6f98c2"/><stop offset=".55" stop-color="#527ba6"/><stop offset="1" stop-color="#44688f"/>',
      '</linearGradient>',
      '<linearGradient id="fzMtNear" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#4d76a1"/><stop offset=".6" stop-color="#3a608c"/><stop offset="1" stop-color="#2e4f75"/>',
      '</linearGradient>',
      '<linearGradient id="fzMtC" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#8fb4d4"/><stop offset=".5" stop-color="#5c85ad"/><stop offset="1" stop-color="#3f668c"/>',
      '</linearGradient>',
      '<radialGradient id="fzIglooLight" cx=".5" cy=".65" r=".8">',
      '<stop offset="0" stop-color="#fff0c0"/><stop offset=".55" stop-color="#ffd98f"/><stop offset="1" stop-color="#e8a04e"/>',
      '</radialGradient>',
      '<radialGradient id="fzIglooSpill" cx=".5" cy=".5" r=".5">',
      '<stop offset="0" stop-color="#ffd98f" stop-opacity=".5"/><stop offset="1" stop-color="#ffd98f" stop-opacity="0"/>',
      '</radialGradient>',
      '<clipPath id="fzLakeClip"><rect x="0" y="' + LAKE_Y + '" width="1280" height="' + (SCENE_H - LAKE_Y) + '"/></clipPath>',
      '</defs>',

      /* sky + stars + moon */
      '<rect width="1280" height="800" fill="url(#fzSkyG)"/>',
      '<g id="fzStars">' + stars + '</g>',
      '<circle cx="186" cy="132" r="118" fill="url(#fzMoonHalo)"/>',
      '<circle cx="186" cy="132" r="44" fill="#f2fbff"/>',
      '<circle cx="171" cy="120" r="8" fill="#d8ecf7" opacity=".7"/><circle cx="200" cy="146" r="6" fill="#d8ecf7" opacity=".6"/><circle cx="192" cy="118" r="4" fill="#d8ecf7" opacity=".5"/>',

      /* aurora ribbons (blurred via CSS) */
      '<g class="fzAur">',
      '<path class="fzAurP" fill="url(#fzAurG1)" d="M-80,160 C160,95 330,215 560,150 C800,90 1010,210 1360,130 L1360,238 C1010,305 800,190 560,255 C330,320 160,200 -80,262 Z"/>',
      '<path class="fzAurP" fill="url(#fzAurG2)" d="M-80,258 C220,205 430,300 680,240 C920,185 1120,285 1360,225 L1360,318 C1120,372 920,275 680,330 C430,388 220,295 -80,345 Z"/>',
      '<path class="fzAurP" fill="url(#fzAurG3)" d="M420,84 C640,40 860,110 1080,66 C1180,48 1270,70 1360,52 L1360,132 C1270,152 1180,128 1080,148 C860,190 640,122 420,164 Z"/>',
      '</g>',

      /* distant haze hills, then crystalline ranges (far → near) */
      '<path d="M0,520 Q150,438 300,502 Q460,428 620,498 Q790,432 950,502 Q1110,440 1280,505 L1280,690 L0,690 Z" fill="#7fa5c9" opacity=".5"/>',
      ridge([[-40, 470], [140, 372], [300, 456], [460, 344], [600, 442], [760, 362], [900, 456], [1050, 352], [1180, 446], [1320, 398]],
        'url(#fzMtFar)', '#eef8ff', 34),
      ridge([[-40, 562], [180, 458], [360, 542], [560, 448], [740, 546], [920, 468], [1100, 552], [1320, 478]],
        'url(#fzMtNear)', '#dceffb', 30),

      /* snow-dusted firs */
      '<g>' + firs + '</g>',

      /* frozen lake + fish silhouettes UNDER the ice + castle reflection + sheen + cracks */
      '<rect x="0" y="' + LAKE_Y + '" width="1280" height="' + (SCENE_H - LAKE_Y) + '" fill="url(#fzLakeG)"/>',
      '<g id="fzFishG" clip-path="url(#fzLakeClip)"></g>',
      '<g clip-path="url(#fzLakeClip)" opacity=".16"><use href="#fzCastleAll" transform="translate(0,' + (LAKE_Y * 2) + ') scale(1,-1)"/></g>',
      '<ellipse cx="300" cy="728" rx="170" ry="13" fill="#ffffff" opacity=".22"/>',
      '<ellipse cx="770" cy="762" rx="230" ry="17" fill="#ffffff" opacity=".14"/>',
      '<ellipse cx="1040" cy="722" rx="120" ry="10" fill="#ffffff" opacity=".2"/>',
      '<path d="M175,745 L262,738 L315,754 L398,747 M540,772 L640,762 L705,776 M980,752 L1052,744 L1105,758" fill="none" stroke="#ffffff" stroke-width="2" opacity=".35" stroke-linecap="round" stroke-linejoin="round"/>',
      /* soft snow-drift ripples so the foreground ice isn't a flat plane */
      '<path d="M60,742 Q170,732 280,742 M340,766 Q450,756 560,766 M700,748 Q800,740 900,748 M760,782 Q880,772 1000,782 M1080,762 Q1160,755 1240,762" fill="none" stroke="#cfe6f6" stroke-width="3" opacity=".5" stroke-linecap="round"/>',
      '<path d="M62,746 Q170,737 278,746 M342,770 Q450,761 558,770 M702,752 Q800,745 898,752" fill="none" stroke="#5c86ad" stroke-width="1.6" opacity=".25" stroke-linecap="round"/>',

      /* ── IGLOO — snow-block dome with a warm light inside (pulsing);
            scaled up about its base so the entrance reads person-sized ── */
      '<g id="fzIgloo" transform="translate(540,700) scale(1.28) translate(-540,-700)">',
      '<ellipse cx="540" cy="700" rx="86" ry="12" fill="#1e3d63" opacity=".14"/>',
      '<path d="M462,700 A78,58 0 0 1 618,700 Z" fill="#eef7fd" stroke="#9cc4de" stroke-width="2.5"/>',
      '<path d="M468,676 Q540,660 612,676 M478,652 Q540,638 602,652 M494,630 Q540,621 586,630" fill="none" stroke="#b9d9ec" stroke-width="2"/>',
      '<path d="M505,697 L507,678 M540,696 L540,676 M575,697 L573,678 M520,673 L523,655 M560,673 L557,655 M540,650 L540,634 M522,648 L525,633 M558,648 L555,633" stroke="#b9d9ec" stroke-width="1.8" fill="none"/>',
      '<path d="M566,700 A30,30 0 0 1 626,700 Z" fill="#dceefb" stroke="#9cc4de" stroke-width="2.5"/>',
      '<path class="fzIglooGlow" d="M574,700 A22,22 0 0 1 618,700 Z" fill="url(#fzIglooLight)"/>',
      '<ellipse class="fzIglooGlow" cx="600" cy="702" rx="42" ry="8" fill="url(#fzIglooSpill)"/>',
      '<circle class="fzIglooGlow" cx="504" cy="664" r="8.5" fill="url(#fzIglooLight)" stroke="#9cc4de" stroke-width="2"/>',
      '</g>',

      /* a soft magical halo, then the castle CROWNING ITS OWN MOUNTAIN
         (the whole mount+palace group is what the lake reflects) */
      '<ellipse cx="1055" cy="300" rx="300" ry="330" fill="url(#fzCastleHalo)"/>',
      '<g id="fzCastleAll">',
      '<g id="fzCastleMt">',
      '<path d="M760,690 L872,552 L928,508 L1182,508 L1238,548 L1280,618 L1280,690 Z" fill="url(#fzMtC)"/>',
      '<path d="M872,552 L928,508 L978,508 L905,690 L800,690 Z" fill="#ffffff" opacity=".16"/>',
      '<path d="M1182,508 L1238,548 L1280,618 L1280,690 L1150,690 Z" fill="#132c47" opacity=".22"/>',
      '<path d="M878,552 L935,530 L1180,530 L1230,548 L1205,514 L905,514 Z" fill="#e8f4fc" opacity=".9"/>',
      '<path d="M1058,512 L1012,556 L1088,600 L1005,646 L1062,690" fill="none" stroke="#e8f4fc" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>',
      '<path d="M960,600 l14,8 M1110,570 l12,7 M1030,660 l13,7" stroke="#2a4c70" stroke-width="3" opacity=".35" stroke-linecap="round"/>',
      '</g>',
      castleMarkup(),
      '</g>',

      /* snow banks + ice shards */
      '<path d="M-20,800 L-20,722 Q90,688 195,716 Q315,748 430,800 Z" fill="#fbfeff"/>',
      '<path d="M-20,800 L-20,748 Q80,722 180,744 Q290,770 360,800 Z" fill="#e2f1fb"/>',
      '<path d="M1300,800 L1300,726 Q1205,694 1112,720 Q1005,750 905,800 Z" fill="#fbfeff"/>',
      '<path d="M1300,800 L1300,752 Q1210,730 1120,750 Q1040,770 985,800 Z" fill="#e2f1fb"/>',
      '<path d="M118,742 L146,652 L170,744 Z" fill="#cfeaff" stroke="#eef9ff" stroke-width="2.4" stroke-linejoin="round" opacity=".95"/>',
      '<path d="M158,748 L189,676 L214,752 Z" fill="#b8ddf6" stroke="#eef9ff" stroke-width="2.2" stroke-linejoin="round" opacity=".95"/>',
      '<path d="M196,752 L216,700 L234,754 Z" fill="#cfeaff" stroke="#eef9ff" stroke-width="2" stroke-linejoin="round" opacity=".9"/>',

      /* magic-sparkle overlay (populated at runtime) */
      '<g id="fzSpark"></g>'
    ].join('');

    scene.appendChild(svg);
    stage.appendChild(scene);
    st.sceneSvg = svg;
    st.castleG = svg.querySelector('#fzCastle');
    st.spireTip = svg.querySelector('#fzSpireTip');
    st.sparkG = svg.querySelector('#fzSpark');

    /* sky life: the aurora DANCES — each ribbon is an undulating curtain
       (translate + skew + vertical breathing on an eternal loop) with its own
       amplitude/phase, plus an independent brightness pulse */
    var ribbons = svg.querySelectorAll('.fzAurP');
    for (var r = 0; r < ribbons.length; r++) {
      var amp = rnd(32, 58), sk = rnd(3.5, 6.5), sy = rnd(0.08, 0.16);
      ribbons[r].style.transformBox = 'fill-box';
      ribbons[r].style.transformOrigin = '50% 50%';
      var a1 = animate(ribbons[r], [
        { transform: 'translate(' + (-amp).toFixed(0) + 'px,0px) skewX(0deg) scaleY(1)' },
        { transform: 'translate(' + (-amp * 0.3).toFixed(0) + 'px,-9px) skewX(' + (-sk).toFixed(1) + 'deg) scaleY(' + (1 + sy).toFixed(3) + ')' },
        { transform: 'translate(' + (amp * 0.5).toFixed(0) + 'px,6px) skewX(' + (sk * 0.6).toFixed(1) + 'deg) scaleY(' + (1 - sy * 0.7).toFixed(3) + ')' },
        { transform: 'translate(' + amp.toFixed(0) + 'px,-7px) skewX(' + sk.toFixed(1) + 'deg) scaleY(' + (1 + sy * 0.8).toFixed(3) + ')' },
        { transform: 'translate(' + (amp * 0.2).toFixed(0) + 'px,8px) skewX(' + (-sk * 0.5).toFixed(1) + 'deg) scaleY(' + (1 - sy * 0.5).toFixed(3) + ')' },
        { transform: 'translate(' + (-amp).toFixed(0) + 'px,0px) skewX(0deg) scaleY(1)' }
      ], { duration: rnd(12000, 18000), iterations: Infinity, easing: 'ease-in-out' });
      var a2 = animate(ribbons[r], [{ opacity: 0.55 }, { opacity: 1 }],
        { duration: rnd(4200, 7200), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
      if (a1) { a1.currentTime = rnd(0, 9000); st.anims.push(a1); }
      if (a2) { a2.currentTime = rnd(0, 4000); st.anims.push(a2); }
    }
    var twinkles = svg.querySelectorAll('.fzstar');
    for (var q = 0; q < twinkles.length; q++) {
      if (Math.random() < 0.5) continue;               // only half twinkle — calmer sky
      var ta = animate(twinkles[q], [{ opacity: rnd(0.2, 0.4) }, { opacity: rnd(0.85, 1) }],
        { duration: rnd(1400, 3600), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
      if (ta) { ta.currentTime = rnd(0, 1500); st.anims.push(ta); }
    }

    /* ── fish cruising UNDER the ice — dark silhouettes clipped to the lake
          band, endless crossings (the loop restart happens off-screen). The
          swim direction is baked into an INNER scale so the outer translate
          animation never fights it. ── */
    var fishG = svg.querySelector('#fzFishG');
    var FISH_D = 'M-30,0 C-18,-15 12,-16 26,-5 C31,-1 31,1 26,5 C12,16 -18,15 -30,0 Z ' +
                 'M-28,-3 L-46,-13 L-40,0 L-46,13 L-28,3 Z';
    var fishDefs = [
      { y: 716, s: 0.9, ltr: true, dur: 34000 },
      { y: 748, s: 1.25, ltr: false, dur: 46000 },
      { y: 774, s: 0.7, ltr: true, dur: 27000 }
    ];
    for (var fi = 0; fi < fishDefs.length; fi++) {
      var fd = fishDefs[fi];
      var fg = svgEl('g', {});
      fg.innerHTML = '<g transform="scale(' + (fd.ltr ? fd.s : -fd.s) + ',' + fd.s + ')">' +
        '<path d="' + FISH_D + '" fill="#16324f" opacity=".3"/></g>';
      fishG.appendChild(fg);
      var fx0 = fd.ltr ? -70 : SCENE_W + 70, fx1 = fd.ltr ? SCENE_W + 70 : -70;
      var fa = animate(fg, [
        { transform: 'translate(' + fx0 + 'px,' + fd.y + 'px)' },
        { transform: 'translate(' + ((fx0 + fx1) / 2) + 'px,' + (fd.y - 8) + 'px)' },
        { transform: 'translate(' + fx1 + 'px,' + fd.y + 'px)' }
      ], { duration: fd.dur, iterations: Infinity, easing: 'linear' });
      if (fa) { fa.currentTime = rnd(0, fd.dur); st.anims.push(fa); }
    }

    /* the igloo's warm light breathes gently */
    var glows = svg.querySelectorAll('.fzIglooGlow');
    for (var gi = 0; gi < glows.length; gi++) {
      var ga = animate(glows[gi], [{ opacity: 0.7 }, { opacity: 1 }],
        { duration: rnd(1800, 2600), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
      if (ga) { ga.currentTime = rnd(0, 1200); st.anims.push(ga); }
    }
  }

  /* ── falling snow — two depths of DOM flakes on endless WAAPI loops ── */
  var FLAKE_CHARS = ['❄', '❅', '•', '✻', '•'];
  function buildSnow(stage, st) {
    var H = stage.clientHeight || 600, i;
    for (i = 0; i < 32; i++) {
      var far = i < 16;                                  // far layer: small + slow
      var f = el('span', 'fz-flake');
      f.textContent = FLAKE_CHARS[irnd(0, FLAKE_CHARS.length - 1)];
      f.style.left = rnd(0, 100).toFixed(1) + '%';
      f.style.fontSize = (far ? rnd(6, 10) : rnd(13, 23)).toFixed(0) + 'px';
      f.style.opacity = far ? '0.5' : '0.92';
      f.style.zIndex = far ? 3 : 8;
      stage.appendChild(f);
      var sway = rnd(-90, 90), dur = far ? rnd(16000, 26000) : rnd(9000, 15000);
      var a = animate(f, [
        { transform: 'translate(0px,-30px) rotate(0deg)' },
        { transform: 'translate(' + (sway * 0.6).toFixed(0) + 'px,' + (H * 0.5).toFixed(0) + 'px) rotate(160deg)' },
        { transform: 'translate(' + sway.toFixed(0) + 'px,' + (H + 40).toFixed(0) + 'px) rotate(320deg)' }
      ], { duration: dur, iterations: Infinity, easing: 'linear' });
      if (a) { a.currentTime = rnd(0, dur); st.anims.push(a); }
      st.flakes.push(f);
    }
  }

  /* ── OLAF — the div rig from the pen (backgrounds/olaf.html), 1:1; styled
        by OLAF_CSS above. He replaced the earlier generic snowman. ── */
  var OLAF_HTML =
    '<div class="fzo">' +
      '<div class="head">' +
        '<div class="top"><div class="shadow"></div></div>' +
        '<div class="hair">' +
          '<span><span></span><span><span></span></span></span>' +
          '<span><span><span></span></span></span>' +
          '<span><span><span></span><span></span></span></span>' +
        '</div>' +
        '<div class="brow left"></div><div class="brow right"></div>' +
        '<div class="eye left"><div class="pupil"></div></div>' +
        '<div class="eye right"><div class="pupil"></div></div>' +
        '<div class="nose"></div><div class="mouth"></div><div class="top-lip"></div>' +
        '<div class="tooth"></div><div class="bottom-lip"></div>' +
      '</div>' +
      '<div class="body top"><div class="button"></div></div>' +
      '<div class="body bottom"><div class="button"></div><div class="button"></div></div>' +
      '<div class="arm left"><div class="upper-arm"><span></span><div class="lower-arm"><span></span>' +
        '<div class="hand"><span></span><div class="fingers"><span></span><span></span><span></span><span></span></div></div>' +
      '</div></div></div>' +
      '<div class="arm right"><div class="upper-arm"><span></span><div class="lower-arm"><span></span>' +
        '<div class="hand"><span></span><div class="fingers"><span></span><span></span><span></span><span></span></div></div>' +
      '</div></div></div>' +
      '<div class="foot left"></div><div class="foot right"></div>' +
    '</div>';
  var OLAF_NATIVE_W = 120, OLAF_NATIVE_H = 310;   // full figure incl. head + twig hair

  /* build an Olaf at the given wrapper position; the native-size rig is
     scaled to the wrapper's rendered height AFTER it is in the DOM (fitOlaf) */
  function makeOlaf(posCss) {
    var wrap = el('div', 'fz-olaf');
    wrap.style.cssText = posCss;
    var act = el('div', 'fzo-a');
    var sc = el('div', 'fzo-sc');
    sc.innerHTML = OLAF_HTML;
    act.appendChild(sc);
    var sh = el('div', 'fz-shadow');
    sh.style.width = '130%';
    wrap.appendChild(sh);
    wrap.appendChild(act);
    return { wrap: wrap, act: act, sc: sc };
  }
  function fitOlaf(o) {
    var h = o.wrap.clientHeight || 200;
    var s = h / OLAF_NATIVE_H;
    o.sc.style.transform = 'scale(' + s.toFixed(4) + ')';
    o.wrap.style.width = (OLAF_NATIVE_W * s).toFixed(0) + 'px';
  }
  function buildOlaf(stage, st) {
    /* bottom 3.5% plants his feet INSIDE the ice expanse (at 9% he stood on
       the far shore line and read as floating in the air) */
    var o = makeOlaf('height:26%;left:6%;bottom:3.5%;z-index:6');
    stage.appendChild(o.wrap);
    fitOlaf(o);
    st.olaf = { element: o.wrap, act: o.act, busy: false, tx: 0, walking: false, walkAnim: null };
  }

  /* ── Olaf WANDERS the ice: ambles to a random spot (always left of the
        castle), rests a moment, then strolls on — forever. The walk cycle is
        CSS-driven (fzo-walk class); the crossing is a WAAPI translate with a
        sine step-bob synced to the .52s foot cadence. He faces forward, so no
        direction flip is needed. ── */
  function olafStroll(stage, st) {
    if (st.cancelled || !st.olaf || st.olaf.walking) return;
    var o = st.olaf, wrap = o.element;
    var cw = stage.clientWidth || 800, ow = wrap.offsetWidth || 90;
    var baseL = cw * 0.06;                              // the wrapper's CSS left (6%)
    var maxTx = Math.max(60, cw * 0.55 - ow - baseL);   // roam floor→seal/castle edge
    var to = rnd(0, maxTx);
    if (Math.abs(to - o.tx) < cw * 0.07)                // too short a trip → cross the range
      to = (o.tx < maxTx / 2) ? maxTx * rnd(0.72, 1) : maxTx * rnd(0, 0.22);
    var dist = Math.abs(to - o.tx);
    var dur = Math.max(1400, dist / (cw * 0.05) * 1000);   // a gentle ~5%-width/s amble
    var cycles = Math.max(2, Math.round(dur / 520));       // one bob per foot-step
    var steps = Math.max(12, cycles * 4), frames = [], i, f;
    for (i = 0; i <= steps; i++) {
      f = i / steps;
      frames.push({ transform: 'translate(' + (o.tx + (to - o.tx) * f).toFixed(1) + 'px,' +
        (-Math.abs(Math.sin(f * Math.PI * cycles)) * 5).toFixed(1) + 'px)' });
    }
    o.walking = true;
    wrap.classList.add('fzo-walk');
    if (o.walkAnim) { try { o.walkAnim.cancel(); } catch (e) {} }   // don't stack filled walks
    var a = animate(wrap, frames, { duration: dur, easing: 'linear', fill: 'forwards' });
    o.walkAnim = a;
    if (a) st.anims.push(a);
    function done() {
      if (st.cancelled) return;
      o.tx = to; o.walking = false;
      wrap.classList.remove('fzo-walk');
      st.timers.push(setTimeout(function () { olafStroll(stage, st); }, rnd(2200, 6500)));
    }
    if (a) a.onfinish = done;
    else { wrap.style.transform = 'translate(' + to.toFixed(0) + 'px,0)'; setTimeout(done, dur); }
  }
  function olafHop(st) {
    var s = st.olaf;
    if (!s || s.busy || !s.act.animate) return;
    s.busy = true;
    var a = s.act.animate([
      { transform: 'translateY(0) rotate(0)' },
      { transform: 'translateY(-16px) rotate(-4deg)', offset: 0.35 },
      { transform: 'translateY(0) rotate(2deg)', offset: 0.7 },
      { transform: 'translateY(0) rotate(0)' }
    ], { duration: 620, easing: 'ease-out' });
    a.onfinish = function () { s.busy = false; };
    setTimeout(function () { s.busy = false; }, 800);
    fzBurst(s.element.parentNode, s.element, ['❄', '💙', '☀️']);
  }

  /* ── PENGUIN — belly-slides across the lake now and then ── */
  var PENGUIN_SVG = [
    '<svg viewBox="0 0 240 130">',
    '<ellipse cx="112" cy="74" rx="86" ry="40" fill="#22355e" stroke="#101c36" stroke-width="4"/>',
    '<ellipse cx="124" cy="84" rx="60" ry="25" fill="#f2f8ff"/>',
    /* feet trailing behind */
    '<ellipse cx="34" cy="96" rx="13" ry="7" fill="#f6a13c" stroke="#c9660f" stroke-width="2"/>',
    '<ellipse cx="52" cy="103" rx="13" ry="7" fill="#f6a13c" stroke="#c9660f" stroke-width="2"/>',
    /* flipper (rocks while sliding) */
    '<path class="fzflip-wing" d="M96,44 Q136,18 172,44 Q136,58 96,44 Z" fill="#16264a" stroke="#101c36" stroke-width="3"/>',
    /* head + face — big head + big sparkly eye for the cute read */
    '<circle cx="190" cy="50" r="31" fill="#22355e" stroke="#101c36" stroke-width="4"/>',
    '<circle cx="195" cy="55" r="19" fill="#f2f8ff"/>',
    '<polygon points="216,46 246,57 216,68" fill="#f6a13c" stroke="#c9660f" stroke-width="2"/>',
    '<g class="eye"><circle cx="196" cy="44" r="7.5" fill="#ffffff" stroke="#101c36" stroke-width="2"/><circle cx="198.8" cy="44" r="3.8" fill="#101c36"/><circle cx="200.4" cy="42.2" r="1.5" fill="#ffffff"/></g>',
    '<ellipse cx="181" cy="61" rx="5.5" ry="3.8" fill="#f1a0ab" opacity=".6"/>',
    '</svg>'
  ].join('');

  /* one sliding penguin; opts {ltr, height, bottom, duration} let a FAMILY
     share direction/speed. Registers in st.sliders; leaves a fading SKATE
     TRAIL of white scratches on the ice while it glides. */
  function slidePenguin(stage, st, opts) {
    if (st.cancelled) return null;
    opts = opts || {};
    injectCSS();
    var wrap = el('div', 'fzw');
    var ltr = opts.ltr != null ? opts.ltr : Math.random() < 0.5;
    wrap.style.cssText = 'height:' + (opts.height || 11) + '%;bottom:' +
      (opts.bottom != null ? opts.bottom : rnd(2.5, 6.5)).toFixed(1) + '%;z-index:7';
    if (!ltr) wrap.classList.add('fzflip');
    var act = el('div', 'fzact');
    act.appendChild(parseSVG(PENGUIN_SVG));
    var sh = el('div', 'fz-shadow');
    sh.style.width = '96%'; sh.style.height = '14%';   // a slider hugs its shadow — reads grounded
    wrap.appendChild(sh);
    wrap.appendChild(act);
    wrap.style.transform = 'translateX(-99999px)';
    stage.appendChild(wrap);
    var ew = wrap.offsetWidth || 200, cw = stage.clientWidth || 800;
    var x0 = ltr ? -ew - 60 : cw + 60, x1 = ltr ? cw + 60 : -ew - 60;
    var dur = opts.duration || rnd(13000, 19000);
    /* gentle rocking while it glides */
    var rock = animate(act, [{ transform: 'rotate(-2.5deg)' }, { transform: 'rotate(2.5deg)' }],
      { duration: 850, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
    var steps = 40, frames = [], i, f;
    for (i = 0; i <= steps; i++) {
      f = i / steps;
      frames.push({ transform: 'translateX(' + (x0 + (x1 - x0) * f).toFixed(0) + 'px) translateY(' +
        (-Math.abs(Math.sin(f * Math.PI * 5)) * 4).toFixed(1) + 'px)' });
    }
    var inst = { element: wrap, act: act, stopped: false, busy: false };
    /* skate trail — drop a fading scratch under the belly every ~⅓ second */
    var trailT = setInterval(function () {
      if (st.cancelled || inst.stopped) { clearInterval(trailT); return; }
      var r = wrap.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      if (!r.width || r.right < sr.left || r.left > sr.right) return;
      var t = el('div', 'fz-trail');
      t.style.left = (r.left - sr.left + r.width * 0.3) + 'px';
      t.style.top = (r.bottom - sr.top - 4) + 'px';
      t.style.width = (r.width * 0.45).toFixed(0) + 'px';
      stage.appendChild(t);
      (function (node) {
        var ta = animate(node, [{ opacity: 0.55 }, { opacity: 0 }], { duration: 2600, easing: 'linear' });
        if (ta) ta.onfinish = function () { if (node.parentNode) node.remove(); };
        gone(node, 2900);
      })(t);
    }, 340);
    function end() {
      if (inst.stopped) return;
      inst.stopped = true;
      clearInterval(trailT);
      try { if (rock) rock.cancel(); } catch (e) {}
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      var ix = st.sliders.indexOf(inst);
      if (ix >= 0) st.sliders.splice(ix, 1);
    }
    var a = animate(wrap, frames, { duration: dur, easing: 'linear', fill: 'forwards' });
    if (a) { inst.animation = a; a.onfinish = end; }
    else { wrap.style.transform = 'translateX(' + x1 + 'px)'; setTimeout(end, dur); }
    inst.stop = function () { try { if (a) a.cancel(); } catch (e) {} end(); };
    st.sliders.push(inst);
    return inst;
  }
  /* a crossing is EITHER a lone penguin or a little FAMILY MARCH — a parent
     with 1-2 chicks trailing at smaller sizes, sharing direction + pace */
  function spawnPenguins(stage, st, forceFamily) {
    if (st.cancelled || st.sliders.length) return;
    var ltr = Math.random() < 0.5;
    var dur = rnd(13000, 19000);
    var bottom = rnd(2.5, 6.5);
    if (!forceFamily && Math.random() < 0.45) {
      slidePenguin(stage, st, { ltr: ltr, duration: dur, height: 11, bottom: bottom });
      return;
    }
    slidePenguin(stage, st, { ltr: ltr, duration: dur, height: 11.5, bottom: bottom });
    var chicks = irnd(1, 2), k;
    for (k = 1; k <= chicks; k++) {
      (function (idx) {
        st.timers.push(setTimeout(function () {
          if (st.cancelled) return;
          slidePenguin(stage, st, {
            ltr: ltr, duration: dur * rnd(1.0, 1.06),
            height: rnd(6.5, 8), bottom: bottom + rnd(-0.6, 0.8)
          });
        }, idx * rnd(950, 1500)));
      })(k);
    }
  }
  function penguinSpin(st, inst) {
    var p = inst || st.sliders[0];
    if (!p || p.stopped || p.busy || !p.act.animate) return;
    p.busy = true;
    var a = p.act.animate([
      { transform: 'rotate(0deg) scale(1)' },
      { transform: 'rotate(360deg) scale(1.08)', offset: 0.7 },
      { transform: 'rotate(360deg) scale(1)' }
    ], { duration: 900, easing: 'ease-out' });
    a.onfinish = function () { p.busy = false; };
    setTimeout(function () { p.busy = false; }, 1100);
    fzBurst(p.element.parentNode, p.element, ['❄', '❄', '✨']);
  }

  /* ── BABY SEAL — a cream pup lounging on the ice by the castle shards;
        idle breathing is CSS (fzSealBreath); click → happy rock + flipper
        clap + a ❄💙🐟 burst ── */
  var SEAL_SVG = [
    '<svg viewBox="0 0 250 130">',
    /* tail flippers */
    '<path d="M24,82 L2,58 L16,82 L2,104 Z" fill="#efe9db" stroke="#b8ac96" stroke-width="3.5" stroke-linejoin="round"/>',
    /* body */
    '<ellipse cx="112" cy="84" rx="92" ry="36" fill="#f6f1e4" stroke="#b8ac96" stroke-width="4"/>',
    '<ellipse cx="122" cy="100" rx="64" ry="16" fill="#e6dfcc" opacity=".8"/>',
    '<ellipse cx="76" cy="66" rx="8" ry="5" fill="#ddd4bc" opacity=".8"/><ellipse cx="112" cy="60" rx="6" ry="4" fill="#ddd4bc" opacity=".8"/><ellipse cx="94" cy="76" rx="5" ry="3.5" fill="#ddd4bc" opacity=".7"/>',
    /* front flipper (the clap target) */
    '<path class="fzs-flip" d="M120,104 Q142,94 160,106 Q142,120 118,114 Z" fill="#e6dfcc" stroke="#b8ac96" stroke-width="3" stroke-linejoin="round"/>',
    /* head + face — big dark puppy eyes */
    '<circle cx="200" cy="56" r="33" fill="#f6f1e4" stroke="#b8ac96" stroke-width="4"/>',
    '<g class="eye"><circle cx="188" cy="48" r="6.5" fill="#2a2723"/><circle cx="190.4" cy="45.8" r="2.2" fill="#ffffff"/></g>',
    '<g class="eye"><circle cx="216" cy="48" r="6.5" fill="#2a2723"/><circle cx="218.4" cy="45.8" r="2.2" fill="#ffffff"/></g>',
    '<ellipse cx="202" cy="66" rx="14" ry="9.5" fill="#fffdf6"/>',
    '<path d="M197,60 L207,60 L202,67 Z" fill="#3a332c"/>',
    '<path d="M202,67 L202,72 M202,72 Q197,75 193,72 M202,72 Q207,75 211,72" fill="none" stroke="#3a332c" stroke-width="1.8" stroke-linecap="round"/>',
    '<path d="M190,64 L174,59 M190,67 L175,69 M214,64 L230,59 M214,67 L229,69" fill="none" stroke="#b8ac96" stroke-width="1.5" stroke-linecap="round"/>',
    '<ellipse cx="178" cy="70" rx="5.5" ry="3.6" fill="#f1a0ab" opacity=".55"/><ellipse cx="226" cy="70" rx="5.5" ry="3.6" fill="#f1a0ab" opacity=".55"/>',
    '</svg>'
  ].join('');

  function buildSeal(stage, st) {
    var wrap = el('div', 'fzw fz-seal');
    wrap.style.cssText = 'height:9.5%;left:61%;bottom:5.5%;z-index:6';
    var act = el('div', 'fzact');
    act.appendChild(parseSVG(SEAL_SVG));
    var sh = el('div', 'fz-shadow');
    sh.style.width = '92%'; sh.style.height = '12%';
    wrap.appendChild(sh);
    wrap.appendChild(act);
    stage.appendChild(wrap);
    st.seal = { element: wrap, act: act, busy: false };
  }
  function sealClap(st) {
    var s = st.seal;
    if (!s || s.busy || !s.act.animate) return;
    s.busy = true;
    var a = s.act.animate([
      { transform: 'rotate(0)' },
      { transform: 'rotate(-7deg) translateY(-4px)', offset: 0.3 },
      { transform: 'rotate(3deg)', offset: 0.65 },
      { transform: 'rotate(0)' }
    ], { duration: 720, easing: 'ease-out' });
    a.onfinish = function () { s.busy = false; };
    setTimeout(function () { s.busy = false; }, 900);
    var flip = s.element.querySelector('.fzs-flip');
    if (flip && flip.animate) flip.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-32deg)' }, { transform: 'rotate(0)' }],
      { duration: 300, iterations: 2, easing: 'ease-in-out' });
    fzBurst(s.element.parentNode, s.element, ['❄', '💙', '🐟']);
  }

  /* ── emoji burst above a sprite (snow-hearts) ── */
  function fzBurst(stage, wrap, chars) {
    if (!stage || !wrap) return;
    var r = wrap.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    var cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top + r.height * 0.25, i;
    for (i = 0; i < chars.length + 1; i++) {
      var h = el('div', 'fzheart');
      h.textContent = chars[i % chars.length];
      h.style.left = (cx + rnd(-20, 20)) + 'px';
      h.style.top = cy + 'px';
      h.style.fontSize = rnd(15, 24).toFixed(0) + 'px';
      stage.appendChild(h);
      (function (node, d) {
        var ha = animate(node, [
          { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
          { transform: 'translate(-50%,-90px) scale(1.1)', opacity: 1, offset: 0.4 },
          { transform: 'translate(-50%,-140px) scale(1)', opacity: 0 }
        ], { duration: rnd(1000, 1400), delay: d, easing: 'ease-out' });
        if (ha) ha.onfinish = function () { if (node.parentNode) node.remove(); };
        gone(node, 1900);
      })(h, i * 120);
    }
  }

  /* ── ambient castle sparkles — tiny 4-point stars glinting on the ice ── */
  function sparkleOnce(st) {
    if (st.cancelled || !st.sparkG) return;
    var x = rnd(920, 1190), y = rnd(80, 490), s = rnd(4, 9);   // the palace's new summit footprint
    var d = 'M' + x + ',' + (y - s) + ' L' + (x + s * 0.28) + ',' + (y - s * 0.28) +
      ' L' + (x + s) + ',' + y + ' L' + (x + s * 0.28) + ',' + (y + s * 0.28) +
      ' L' + x + ',' + (y + s) + ' L' + (x - s * 0.28) + ',' + (y + s * 0.28) +
      ' L' + (x - s) + ',' + y + ' L' + (x - s * 0.28) + ',' + (y - s * 0.28) + ' Z';
    var p = svgEl('path', { d: d, fill: '#eaf9ff', opacity: '0' });
    p.style.transformBox = 'fill-box';
    p.style.transformOrigin = '50% 50%';
    st.sparkG.appendChild(p);
    var a = animate(p, [
      { transform: 'scale(.2) rotate(0deg)', opacity: 0 },
      { transform: 'scale(1) rotate(45deg)', opacity: 0.95, offset: 0.5 },
      { transform: 'scale(.3) rotate(90deg)', opacity: 0 }
    ], { duration: rnd(800, 1300), easing: 'ease-in-out' });
    if (a) a.onfinish = function () { if (p.parentNode) p.parentNode.removeChild(p); };
    gone(p, 1600);
  }

  /* ── Olaf's FROST BREATH — little white puffs drift from his face every
        few seconds (self-scheduling; ONE chain, started in init) ── */
  function olafBreath(stage, st) {
    if (st.cancelled) return;
    var wrap = st.olaf && st.olaf.element;
    if (wrap) {
      var r = wrap.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      if (r.width) {
        var n = irnd(1, 2), i;
        for (i = 0; i < n; i++) {
          var p = el('div', 'fz-puff');
          var sz = rnd(7, 13);
          p.style.width = p.style.height = sz.toFixed(0) + 'px';
          p.style.left = (r.left - sr.left + r.width * 0.58 + rnd(-3, 3)).toFixed(0) + 'px';
          p.style.top = (r.top - sr.top + r.height * 0.18 + rnd(-2, 2)).toFixed(0) + 'px';
          p.style.zIndex = 7;
          stage.appendChild(p);
          (function (node, d) {
            var a = animate(node, [
              { transform: 'translate(0,0) scale(.5)', opacity: 0 },
              { transform: 'translate(' + rnd(6, 14).toFixed(0) + 'px,-9px) scale(1)', opacity: 0.7, offset: 0.4 },
              { transform: 'translate(' + rnd(18, 32).toFixed(0) + 'px,-22px) scale(1.6)', opacity: 0 }
            ], { duration: rnd(1100, 1500), delay: d, easing: 'ease-out' });
            if (a) a.onfinish = function () { if (node.parentNode) node.remove(); };
            gone(node, 1900 + d);
          })(p, i * 240);
        }
      }
    }
    st.timers.push(setTimeout(function () { olafBreath(stage, st); }, rnd(2600, 4800)));
  }

  /* ── ambient shooting star — the Dubai-style comet (white head + icy-blue
        gradient tail) streaking down the aurora sky now and then ── */
  var FZSS_UID = 0;
  function shootingStar(st) {
    if (st.cancelled || !st.sceneSvg) return;
    var svg = st.sceneSvg;
    var dir = Math.random() < 0.5 ? 1 : -1;
    var ang = 0.15 + Math.random() * 0.5;
    var vx = dir * Math.cos(ang), vy = Math.sin(ang);
    var x = dir > 0 ? rnd(60, 560) : rnd(SCENE_W - 560, SCENE_W - 60);
    var y = rnd(30, 200);
    var len = rnd(90, 150), travel = rnd(340, 540);
    var gid = 'fzss' + (++FZSS_UID);
    var g = svgEl('g', {});
    g.innerHTML =
      '<defs><linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' +
        (-vx * len).toFixed(1) + '" y2="' + (-vy * len).toFixed(1) + '">' +
        '<stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>' +
        '<stop offset=".4" stop-color="#c8e1ff" stop-opacity=".4"/>' +
        '<stop offset="1" stop-color="#c8e1ff" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<line x1="0" y1="0" x2="' + (-vx * len).toFixed(1) + '" y2="' + (-vy * len).toFixed(1) +
        '" stroke="url(#' + gid + ')" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle r="5.5" fill="#ffffff" opacity=".35"/><circle r="2" fill="#ffffff"/>';
    svg.appendChild(g);
    var a = animate(g, [
      { transform: 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)', opacity: 0 },
      { opacity: 1, offset: 0.18 },
      { opacity: 1, offset: 0.7 },
      { transform: 'translate(' + (x + vx * travel).toFixed(0) + 'px,' + (y + vy * travel).toFixed(0) + 'px)', opacity: 0 }
    ], { duration: rnd(750, 1100), easing: 'linear' });
    function done() { if (g.parentNode) g.parentNode.removeChild(g); }
    if (a) a.onfinish = done; else done();
    gone(g, 1500);
  }

  /* ── ambient LIGHTNING — the midpoint-displacement bolt ported from
        success_screens/success-lightning-storm.js (genBolt + the wide-glow /
        bright-core double stroke), redrawn in SVG with a soft sky flash.
        Strikes once every few minutes; sometimes a quick double-strike. ── */
  function genBolt(x1, y1, x2, y2, disp, out) {
    if (disp < 8) { out.push(x1, y1, x2, y2); return; }
    var mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
    var my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp * 0.5;
    genBolt(x1, y1, mx, my, disp * 0.55, out);
    genBolt(mx, my, x2, y2, disp * 0.55, out);
  }
  function _boltPath(sg) {
    var d = '', k;
    for (k = 0; k < sg.length; k += 4) {
      d += 'M' + sg[k].toFixed(1) + ',' + sg[k + 1].toFixed(1) +
        ' L' + sg[k + 2].toFixed(1) + ',' + sg[k + 3].toFixed(1) + ' ';
    }
    return d;
  }
  function lightningStrike(st, noRepeat) {
    if (st.cancelled || !st.sceneSvg) return;
    var svg = st.sceneSvg;
    var tx = rnd(120, 800), ty = rnd(380, 560);          // hits the ridge, away from the palace
    var sx = tx + rnd(-160, 160);
    var segs = [];
    genBolt(sx, -30, tx, ty, 140, segs);
    var mi = (Math.floor(segs.length / 8) * 4) || 0;     // secondary branch off the middle
    var bsegs = [];
    genBolt(segs[mi], segs[mi + 1],
      segs[mi] + (Math.random() < 0.5 ? -1 : 1) * rnd(50, 110),
      segs[mi + 1] + rnd(70, 130), 60, bsegs);
    var g = svgEl('g', {});
    g.innerHTML =
      '<rect width="1280" height="800" fill="#cfe6ff" opacity=".22"/>' +
      '<path d="' + _boltPath(segs) + '" stroke="#7DC4FF" stroke-width="7" stroke-linecap="round" fill="none" opacity=".5"/>' +
      '<path d="' + _boltPath(segs) + '" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
      '<path d="' + _boltPath(bsegs) + '" stroke="#7DC4FF" stroke-width="4.5" stroke-linecap="round" fill="none" opacity=".4"/>' +
      '<path d="' + _boltPath(bsegs) + '" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".9"/>';
    svg.appendChild(g);
    var a = animate(g, [
      { opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0.5, offset: 0.4 },
      { opacity: 0.9, offset: 0.55 }, { opacity: 0 }
    ], { duration: 460, easing: 'ease-out' });
    function done() { if (g.parentNode) g.parentNode.removeChild(g); }
    if (a) a.onfinish = done; else done();
    gone(g, 700);
    if (!noRepeat && Math.random() < 0.4)
      st.timers.push(setTimeout(function () { lightningStrike(st, true); }, rnd(350, 700)));
  }

  /* ── FIREWORKS + a snow flurry over the palace (part of the click magic) ── */
  var FW_COLORS = ['#ffd27d', '#ff9ad5', '#7dc4ff', '#b48fff', '#8fffdc'];
  function fireworkBurst(stage, st) {
    if (st.cancelled || !st.castleG) return;
    var r = st.castleG.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    if (!r.width) return;
    var cx = r.left - sr.left + r.width * rnd(0.2, 0.8);
    var cy = r.top - sr.top + r.height * rnd(-0.05, 0.3);
    var col = FW_COLORS[irnd(0, FW_COLORS.length - 1)];
    var fl = el('div', 'fz-puff');                         // the launch flash
    fl.style.width = fl.style.height = '26px';
    fl.style.left = cx.toFixed(0) + 'px'; fl.style.top = cy.toFixed(0) + 'px';
    fl.style.zIndex = 9;
    stage.appendChild(fl);
    var fa = animate(fl, [
      { transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 },
      { transform: 'translate(-50%,-50%) scale(2.2)', opacity: 0 }
    ], { duration: 420, easing: 'ease-out' });
    if (fa) fa.onfinish = function () { if (fl.parentNode) fl.remove(); };
    gone(fl, 600);
    var n = 16, i;
    for (i = 0; i < n; i++) {
      var d = el('div', 'fz-fw');
      d.style.background = (i % 4 === 3) ? '#ffffff' : col;
      d.style.boxShadow = '0 0 8px ' + col;
      d.style.left = cx.toFixed(0) + 'px'; d.style.top = cy.toFixed(0) + 'px';
      stage.appendChild(d);
      var ang = i / n * Math.PI * 2 + rnd(-0.12, 0.12), dist = rnd(55, 125);
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      (function (node, dx, dy) {
        var a = animate(node, [
          { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
          { transform: 'translate(-50%,-50%) translate(' + (dx * 0.8).toFixed(0) + 'px,' + (dy * 0.8).toFixed(0) + 'px) scale(.9)', opacity: 1, offset: 0.6 },
          { transform: 'translate(-50%,-50%) translate(' + dx.toFixed(0) + 'px,' + (dy + 36).toFixed(0) + 'px) scale(.3)', opacity: 0 }
        ], { duration: rnd(850, 1250), easing: 'cubic-bezier(.15,.65,.35,1)' });
        if (a) a.onfinish = function () { if (node.parentNode) node.remove(); };
        gone(node, 1500);
      })(d, dx, dy);
    }
  }
  function snowFlurry(stage, st) {
    if (st.cancelled || !st.castleG) return;
    var r = st.castleG.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    if (!r.width) return;
    var i;
    for (i = 0; i < 14; i++) {
      var f = el('span', 'fz-flake');
      f.textContent = i % 3 ? '❄' : '✻';
      f.style.left = (r.left - sr.left + r.width * rnd(0, 1)).toFixed(0) + 'px';
      f.style.top = (r.top - sr.top - rnd(10, 90)).toFixed(0) + 'px';
      f.style.fontSize = rnd(10, 18).toFixed(0) + 'px';
      f.style.zIndex = 9;
      stage.appendChild(f);
      (function (node, dly) {
        var sway = rnd(-40, 40);
        var a = animate(node, [
          { transform: 'translate(0,0)', opacity: 0 },
          { opacity: 0.95, offset: 0.15 },
          { transform: 'translate(' + sway.toFixed(0) + 'px,' + rnd(170, 300).toFixed(0) + 'px)', opacity: 0 }
        ], { duration: rnd(1600, 2500), delay: dly, easing: 'linear' });
        if (a) a.onfinish = function () { if (node.parentNode) node.remove(); };
        gone(node, 3000 + dly);
      })(f, i * 90);
    }
  }

  /* ── CASTLE MAGIC (on click): windows flare, the palace brightens, the
        aurora surges, a snowflake burst erupts from the spire — then
        FIREWORKS crown the palace under a fresh snow flurry ── */
  function castleMagic(stage, st) {
    if (st.cancelled || st.magicBusy) return;
    st.magicBusy = true;
    st.timers.push(setTimeout(function () { st.magicBusy = false; }, 2400));
    /* window flare (staggered) */
    var glows = st.sceneSvg.querySelectorAll('.fzWinGlow'), i;
    for (i = 0; i < glows.length; i++) {
      animate(glows[i], [{ opacity: 0 }, { opacity: 0.85, offset: 0.35 }, { opacity: 0 }],
        { duration: 1100, delay: i * 70, easing: 'ease-in-out' });
    }
    /* whole-palace shimmer — with an aurora colour-bounce (a cool magenta-cyan
       tint sweeps the ice while the ribbons surge) */
    if (st.castleG) animate(st.castleG, [
      { filter: 'brightness(1) saturate(1) hue-rotate(0deg)' },
      { filter: 'brightness(1.35) saturate(1.5) hue-rotate(-24deg)', offset: 0.3 },
      { filter: 'brightness(1.25) saturate(1.4) hue-rotate(18deg)', offset: 0.62 },
      { filter: 'brightness(1) saturate(1) hue-rotate(0deg)' }
    ], { duration: 2000, easing: 'ease-in-out' });
    /* aurora surge */
    var ribbons = st.sceneSvg.querySelectorAll('.fzAurP');
    for (i = 0; i < ribbons.length; i++) {
      animate(ribbons[i], [{ opacity: 0.7 }, { opacity: 1, offset: 0.4 }, { opacity: 0.7 }],
        { duration: 2100, easing: 'ease-in-out' });
    }
    /* snowflake burst from the spire tip */
    if (st.spireTip) {
      var r = st.spireTip.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      var cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top + r.height / 2;
      for (i = 0; i < 12; i++) {
        var f = el('span', 'fz-flake');
        f.textContent = i % 3 ? '❄' : '✦';
        f.style.left = cx + 'px'; f.style.top = cy + 'px';
        f.style.fontSize = rnd(11, 20).toFixed(0) + 'px';
        f.style.zIndex = 9;
        stage.appendChild(f);
        var ang = rnd(-Math.PI, 0) * 0.9 - 0.05, dist = rnd(50, 150);
        var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
        (function (node, dx, dy) {
          var a = animate(node, [
            { transform: 'translate(-50%,-50%) translate(0,0) scale(.3)', opacity: 1 },
            { transform: 'translate(-50%,-50%) translate(' + (dx * 0.8).toFixed(0) + 'px,' + dy.toFixed(0) + 'px) scale(1)', opacity: 1, offset: 0.55 },
            { transform: 'translate(-50%,-50%) translate(' + dx.toFixed(0) + 'px,' + (dy * 0.4 + 60).toFixed(0) + 'px) scale(.6)', opacity: 0 }
          ], { duration: rnd(1100, 1700), easing: 'ease-out' });
          if (a) a.onfinish = function () { if (node.parentNode) node.remove(); };
          gone(node, 2000);
        })(f, dx, dy);
      }
    }
    /* a few extra sparkles right away */
    for (i = 0; i < 5; i++) st.timers.push(setTimeout(function () { sparkleOnce(st); }, i * 140));
    /* fireworks + a snow flurry crown the show */
    for (i = 0; i < 3; i++) st.timers.push(setTimeout(function () { fireworkBurst(stage, st); }, 260 + i * 430));
    snowFlurry(stage, st);
  }

  /* ══ MODULE REGISTRY ═══════════════════════════════════════════════ */
  w.BACKGROUNDS = w.BACKGROUNDS || {};
  w.BACKGROUNDS.frozen = {
    /* game/skins/frozen.skin.css (night-ice glass, card hugs LEFT) +
       aids/frozen.aids.js (⛄ number-line rider, ❄️ jar snowflakes) */
    skin: 'frozen',
    aids: 'frozen',
    preload: function () { /* single file — nothing to warm */ },

    init: function (ctx) {
      var stage = ctx && ctx.stage;
      if (!stage) return function () {};
      injectCSS();
      if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
      stage.innerHTML = '';

      var st = {
        cancelled: false, timers: [], anims: [], flakes: [],
        olaf: null, seal: null, sliders: [], magicBusy: false
      };
      buildScene(stage, st);
      buildSnow(stage, st);
      buildOlaf(stage, st);
      buildSeal(stage, st);
      /* Olaf starts wandering shortly after the scene opens */
      st.timers.push(setTimeout(function () { olafStroll(stage, st); }, rnd(1600, 3600)));
      /* …and breathes little frost puffs */
      st.timers.push(setTimeout(function () { olafBreath(stage, st); }, 2200));

      /* penguins cross every so often — a loner or a family march */
      function schedulePenguin() {
        if (st.cancelled) return;
        spawnPenguins(stage, st);
        st.timers.push(setTimeout(schedulePenguin, rnd(18000, 36000)));
      }
      st.timers.push(setTimeout(schedulePenguin, rnd(3500, 8000)));

      /* a lone shooting star now and then */
      function scheduleStar() {
        if (st.cancelled) return;
        shootingStar(st);
        st.timers.push(setTimeout(scheduleStar, rnd(16000, 36000)));
      }
      st.timers.push(setTimeout(scheduleStar, rnd(7000, 14000)));

      /* distant LIGHTNING once every few minutes */
      function scheduleBolt() {
        if (st.cancelled) return;
        lightningStrike(st);
        st.timers.push(setTimeout(scheduleBolt, rnd(110000, 220000)));
      }
      st.timers.push(setTimeout(scheduleBolt, rnd(50000, 110000)));

      /* ambient castle sparkles */
      function scheduleSparkle() {
        if (st.cancelled) return;
        sparkleOnce(st);
        st.timers.push(setTimeout(scheduleSparkle, rnd(1600, 3400)));
      }
      st.timers.push(setTimeout(scheduleSparkle, 1200));

      /* ── ONE doc-level click router (capture): game-UI whitelist →
            olaf → penguins → seal → castle bbox ── */
      function inRect(x, y, r) { return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
      function onDown(e) {
        if (st.cancelled) return;
        if (e.target && e.target.closest &&
            e.target.closest('.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
        var x = e.clientX, y = e.clientY, si;
        if (st.olaf && inRect(x, y, st.olaf.element.getBoundingClientRect())) {
          olafHop(st); e.stopPropagation(); return;
        }
        for (si = 0; si < st.sliders.length; si++) {
          var sl = st.sliders[si];
          if (!sl.stopped && inRect(x, y, sl.element.getBoundingClientRect())) {
            penguinSpin(st, sl); e.stopPropagation(); return;
          }
        }
        if (st.seal && inRect(x, y, st.seal.element.getBoundingClientRect())) {
          sealClap(st); e.stopPropagation(); return;
        }
        if (st.castleG && inRect(x, y, st.castleG.getBoundingClientRect())) {
          castleMagic(stage, st); e.stopPropagation();
        }
      }
      doc.addEventListener('pointerdown', onDown, true);

      /* verification hooks (harness/tests only) */
      w.BACKGROUNDS.frozen._test = {
        magic: function () { castleMagic(stage, st); },
        hop: function () { olafHop(st); },
        stroll: function () { olafStroll(stage, st); },
        slide: function () { return slidePenguin(stage, st); },
        family: function () { spawnPenguins(stage, st, true); },
        spin: function () { penguinSpin(st); },
        seal: function () { sealClap(st); },
        star: function () { shootingStar(st); },
        bolt: function () { lightningStrike(st); },
        sparkle: function () { sparkleOnce(st); },
        state: st
      };

      return function cleanup() {
        st.cancelled = true;
        doc.removeEventListener('pointerdown', onDown, true);
        st.timers.forEach(clearTimeout);
        st.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        st.sliders.slice().forEach(function (s) { try { s.stop(); } catch (e) {} });
        delete w.BACKGROUNDS.frozen._test;
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
      stage.style.background = 'linear-gradient(#16295c,#3f6ea6 62%,#b3ddf5 62.5%)';
      /* the castle, centered large, over its own soft halo */
      var scene = el('div', 'fzscene');
      /* the castle carries its baked summit transform (×0.72, lifted 185px),
         so the gallery frames the TRANSFORMED footprint: x≈880-1230, y≈50-510 */
      var svg = svgEl('svg', { viewBox: '860 30 390 510', preserveAspectRatio: 'xMidYMid meet' });
      svg.innerHTML =
        '<defs><radialGradient id="fzGalHalo" cx=".5" cy=".45" r=".55">' +
        '<stop offset="0" stop-color="#bfe9ff" stop-opacity=".5"/><stop offset="1" stop-color="#bfe9ff" stop-opacity="0"/>' +
        '</radialGradient></defs>' +
        '<ellipse cx="1055" cy="280" rx="260" ry="280" fill="url(#fzGalHalo)"/>' +
        castleMarkup();
      scene.appendChild(svg);
      stage.appendChild(scene);
      /* olaf + penguin at the left */
      var ol = makeOlaf('height:36%;left:6%;bottom:6%;z-index:6');
      stage.appendChild(ol.wrap);
      fitOlaf(ol);
      var pg = el('div', 'fzw');
      pg.style.cssText = 'height:13%;left:22%;bottom:5%;z-index:6';
      var pgAct = el('div', 'fzact'); pgAct.appendChild(parseSVG(PENGUIN_SVG));
      pg.appendChild(pgAct); stage.appendChild(pg);
      return function cleanup() {
        stage.style.background = '';
        stage.innerHTML = '';
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
