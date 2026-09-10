/* ── olaf/olaf.js — OLAF, the pure-CSS snowman rig, packaged for scenes ──────
   The rig from the Olaf pen (backgrounds/olaf.html): its SCSS was hand-compiled
   to plain CSS and scoped under .fzo / .fz-olaf, the div tree kept 1:1. It was
   EXTRACTED VERBATIM out of the old frozen.bg.js (which this replaced) so any
   scene can use him — the aurora scene injects this file with a <script> tag
   (file:// safe) and mounts him as a DOM layer over its canvas.

   Native size 120x310 px (the full figure incl. head + twig hair; the body box
   itself is 120x160). Mount him like this:

       var wrap = document.createElement('div');       // position + height
       wrap.className = 'fz-olaf';
       wrap.innerHTML = '<div class="fz-shadow"></div>' +
                        '<div class="fzo-a"><div class="fzo-sc">' + OlafArt.html +
                        '</div></div>';
       // then scale .fzo-sc by (wrapper height / OlafArt.nativeH)

   Add the class `fzo-walk` to the wrapper to run the walk cycle (feet step,
   twig arms swing, head rocks); the crossing itself is the scene's business.
   Animate the inner `.fzo-a` for hops so the walk keeps playing underneath.

       window.OlafArt = { css, html, nativeW, nativeH }

   Used by aurora.bg.js. Design source: backgrounds/olaf.html. */
window.OlafArt = (function () {
  var css = [
    '.fz-olaf{position:absolute;pointer-events:none;will-change:transform}',
    '.fz-olaf .fzo-a{position:relative;display:block;height:100%;transform-origin:50% 100%}',
    '.fzo-sc{position:absolute;bottom:0;left:0;width:120px;height:310px;transform-origin:0 100%}',
    '.fzo{position:absolute;bottom:0;left:0;height:160px;width:120px}',
    '.fzo *{position:absolute}',
    /* the pen was authored for CONTENT-BOX pseudo-elements (the head "cheeks"
       are a border-top on a rotated box). A host global reset that resets
       *::before/*::after to border-box (game base.css) would shove those
       cheeks out beside the eyes as two stray white flaps — so pin the rig's
       pseudos to content-box, making the module self-contained. */
    '.fzo :before,.fzo :after{position:absolute;content:"";width:0;height:0;box-sizing:content-box}',
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
    '@keyframes fzoHeadRock{0%,100%{transform:rotate(-1.7deg)}50%{transform:rotate(1.7deg)}}',
    /* the grounding shadow (was .fzw .fz-shadow in frozen.bg.js, rescoped) */
    '.fz-olaf .fz-shadow{position:absolute;left:50%;bottom:-2%;width:80%;height:9%;transform:translateX(-50%);',
    '  border-radius:50%;background:radial-gradient(ellipse,rgba(20,45,80,.30),transparent 70%)}'
  ].join('\n');

  var html =
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

  return { css: css, html: html, nativeW: 120, nativeH: 310 };
})();
