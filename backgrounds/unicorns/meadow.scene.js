/* ─────────────────────────────────────────────────────────────────────────
   UnicornMeadow — the "Unicorn Valley" scene as a reusable, cleanup-able
   module, shared by the standalone workshop (meadow.html) and the in-game
   background (unicorns.bg.js). Nothing is copied between them.

     var cleanup = UnicornMeadow.init({ stage, base });
       stage : host layer to mount into (document.body standalone; the game's
               #stars-layer in-game). Scene + roaming actors + fx all live
               under `stage` (a `.uc-meadow` root) so the whole thing sits in
               the host's stacking context (behind the game card) and one
               cleanup() removes it all.
       base  : URL prefix for the sibling item modules (unicorn.item.js /
               fairy.item.js). '' standalone; the .bg.js passes its own dir.

   Every loop/interval/timeout/listener the scene starts is captured (the
   schedulers are shadowed inside init) and killed by cleanup; roaming
   unicorns stop via their instance .remove(). WaterfallFX is defined once at
   module scope. All CSS is namespaced under `.uc-meadow` so the castle's
   generic class names (.wall/.tower/.window/…) can't leak into the host.
   ───────────────────────────────────────────────────────────────────────── */
window.WaterfallFX = (function(){
  "use strict";
  var rand = function(mi, ma){ return ~~((Math.random()*(ma-mi+1))+mi); };
  function create(ctx, getW, getH, opts){
    opts = opts || {};
    var gravity   = opts.gravity   != null ? opts.gravity   : 0.15;
    var hueMin    = opts.hueMin    != null ? opts.hueMin    : 200;
    var hueMax    = opts.hueMax    != null ? opts.hueMax    : 220;
    var satLo     = opts.saturation ? opts.saturation[0] : 30;
    var satHi     = opts.saturation ? opts.saturation[1] : 60;
    var litLo     = opts.lightness  ? opts.lightness[0]  : 30;
    var litHi     = opts.lightness  ? opts.lightness[1]  : 60;
    var margin    = opts.margin    != null ? opts.margin    : 10;
    var poolY     = opts.poolY     != null ? opts.poolY     : 20;
    var ratePerPx = opts.ratePerPx != null ? opts.ratePerPx : 6/100;
    var band      = opts.band || null;
    var particles = [];
    function spawnBounds(cw){
      if(band){
        var c = band.cx != null ? band.cx*cw : cw/2;
        var hw = band.halfWidth != null ? band.halfWidth : cw/2;
        return { lo: Math.max(margin, c-hw), hi: Math.min(cw-margin, c+hw) };
      }
      return { lo: margin, hi: cw-margin };
    }
    function Particle(cw){
      var w = rand(1,20), h = rand(1,45);
      var b = spawnBounds(cw);
      this.x = rand(b.lo + w/2, Math.max(b.lo + w/2, b.hi - w/2));
      this.y = -h; this.vy = 0; this.width = w; this.height = h;
      this.hue = rand(hueMin, hueMax);
      this.sat = rand(satLo, satHi);
      this.light = rand(litLo, litHi);
    }
    Particle.prototype.update = function(){ this.vy += gravity; this.y += this.vy; };
    Particle.prototype.render = function(){
      ctx.strokeStyle = 'hsla('+this.hue+','+this.sat+'%,'+this.light+'%,.05)';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y + this.height);
      ctx.lineWidth = this.width/2;
      ctx.lineCap = 'round';
      ctx.stroke();
    };
    Particle.prototype.renderBubble = function(ch){
      ctx.fillStyle = 'hsla('+this.hue+','+this.sat+'%,'+this.light+'%,.3)';
      ctx.beginPath();
      ctx.arc(this.x + this.width/2, ch - poolY - rand(0,10), rand(1,8), 0, Math.PI*2, false);
      ctx.fill();
    };
    function fadeAndPrime(cw, ch){
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(0,0,cw,ch);
      ctx.globalCompositeOperation = 'lighter';
    }
    function step(){
      var cw = getW(), ch = getH();
      if(!cw || !ch) return;
      fadeAndPrime(cw, ch);
      var b = spawnBounds(cw);
      var n = Math.max(1, Math.round((b.hi - b.lo) * ratePerPx));
      while(n--) particles.push(new Particle(cw));
      for(var i=particles.length; i--;) particles[i].update();
      for(var j=particles.length; j--;) particles[j].render();
      for(var k=particles.length; k--;){
        var p = particles[k];
        if(p.y > ch - poolY - p.height){ p.renderBubble(ch); particles.splice(k,1); }
      }
    }
    function reset(){ particles.length = 0; if(getW() && getH()) ctx.clearRect(0,0,getW(),getH()); }
    return { step: step, reset: reset };
  }
  function init(cfg){
    cfg = cfg || {};
    var stage = cfg.stage;
    if(!stage) throw new Error('WaterfallFX.init needs { stage }');
    var canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    stage.innerHTML = '';
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    function sizeCanvas(){
      canvas.width  = stage.clientWidth  || window.innerWidth;
      canvas.height = stage.clientHeight || window.innerHeight;
    }
    sizeCanvas();
    var fx = create(ctx, function(){ return canvas.width; }, function(){ return canvas.height; }, cfg.opts);
    var stopped = false, raf = 0;
    function loop(){ if(stopped) return; fx.step(); raf = requestAnimationFrame(loop); }
    loop();
    var onResize = function(){ sizeCanvas(); fx.reset(); };
    window.addEventListener('resize', onResize);
    return function cleanup(){
      stopped = true;
      if(raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if(canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }
  return { init: init, create: create };
})();

/* ─────────────────────────────────────────────────────────────────────────
   The valley scene — original unicorns.bg.js painting code (ridges, mound,
   hills, flowers, candy clouds) with a green meadow + day-cycle driver.
   ───────────────────────────────────────────────────────────────────────── */

window.UnicornMeadow = (function () {
  'use strict';

  var CSS = `
.uc-meadow .sky-day, .uc-meadow .sky-morning, .uc-meadow .sky-sunset, .uc-meadow .sky-twilight { position: absolute; inset: 0; }
.uc-meadow .sky-day { background: linear-gradient(180deg, #F7A8D8 0%, #FFC3E2 35%, #FFDDEE 62%, #FFE9D9 78%, #FFD9EC 100%); }
.uc-meadow .sky-morning { background: linear-gradient(180deg, #F2B3E0 0%, #FFD7C9 50%, #FFF1D6 75%, #FFE0EE 100%); }
.uc-meadow .sky-sunset { background: linear-gradient(180deg, #C86BC9 0%, #F87BAE 35%, #FF9D6E 60%, #FFD08A 80%, #FFC9A3 100%); opacity: 0; }
.uc-meadow .sky-twilight { background: linear-gradient(180deg, #2C1B62 0%, #4A3585 35%, #8E5AA8 60%, #D98AB0 85%, #E9A0B8 100%); opacity: 0; }
.uc-meadow #night { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
.uc-meadow .st-dots {
  position: absolute; width: .45vmin; height: .45vmin; border-radius: 50%;
  background: #fff; color: #fff;
}
.uc-meadow .st-a {
  top: 4%; left: 3%;
  box-shadow: 7vmin 3vmin, 15vmin 9vmin 0 .15vmin, 24vmin 2vmin, 33vmin 7vmin,
    42vmin 4vmin 0 .15vmin, 51vmin 10vmin, 60vmin 3vmin, 69vmin 8vmin 0 .1vmin,
    78vmin 2vmin, 86vmin 6vmin, 12vmin 16vmin, 30vmin 14vmin 0 .1vmin,
    48vmin 18vmin, 66vmin 15vmin, 82vmin 19vmin;
  animation: stTwinkle 3.2s ease-in-out infinite;
}
.uc-meadow .st-b {
  top: 7%; left: 6%; background: #cfe4ff; color: #cfe4ff;
  box-shadow: 4vmin 6vmin, 11vmin 1vmin 0 .1vmin, 19vmin 12vmin, 27vmin 5vmin,
    36vmin 10vmin 0 .15vmin, 45vmin 1vmin, 54vmin 7vmin, 63vmin 12vmin 0 .1vmin,
    72vmin 4vmin, 81vmin 9vmin, 8vmin 20vmin, 38vmin 19vmin 0 .1vmin,
    58vmin 17vmin, 76vmin 21vmin;
  animation: stTwinkle 4.4s ease-in-out infinite; animation-delay: -2.1s;
}
@keyframes stTwinkle { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
.uc-meadow .st-spark {
  position: absolute; background: #fff;
  clip-path: polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%);
  filter: drop-shadow(0 0 .6vmin rgba(255,255,255,.8));
  animation: stPulse 3.6s ease-in-out infinite;
}
@keyframes stPulse {
  0%, 100% { transform: scale(.7) rotate(0deg); opacity: .55; }
  50%      { transform: scale(1.15) rotate(22deg); opacity: 1; }
}
.uc-meadow #moon {
  position: absolute; width: 15vmin; height: 15vmin; top: 6%; left: 8%;
  animation: moonBreathe 7s ease-in-out infinite alternate;
}
@keyframes moonBreathe {
  from { filter: drop-shadow(0 0 2.5vmin rgba(235,240,255,.55)); }
  to   { filter: drop-shadow(0 0 5vmin rgba(235,240,255,.9)); }
}
.uc-meadow .fallstar {
  position: fixed; width: 16vmin; height: 2px; border-radius: 2px;
  pointer-events: none; z-index: 2;
  background: linear-gradient(90deg, #fff, rgba(180,210,255,0));
}
.uc-meadow .fallstar i {
  position: absolute; left: -2px; top: -2.5px; width: 7px; height: 7px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff, rgba(255,255,255,0) 70%);
}
.uc-meadow .bf { position: fixed; width: 16px; height: 13px; pointer-events: none; z-index: 6; }
.uc-meadow .bf i {
  position: absolute; top: 0; width: 8px; height: 12px;
  border-radius: 60% 60% 46% 46%; background: var(--bc, #ff8fc8); opacity: .95;
}
.uc-meadow .bf i.l { left: 0;  transform-origin: 100% 55%; animation: bfL .24s ease-in-out infinite alternate; }
.uc-meadow .bf i.r { right: 0; transform-origin: 0 55%;    animation: bfR .24s ease-in-out infinite alternate; }
.uc-meadow .bf b {
  position: absolute; left: 7px; top: 2px; width: 2px; height: 10px;
  border-radius: 2px; background: #6b4468;
}
@keyframes bfL { from { transform: rotateY(14deg); }  to { transform: rotateY(72deg); } }
@keyframes bfR { from { transform: rotateY(-14deg); } to { transform: rotateY(-72deg); } }
.uc-meadow .bl { position: fixed; width: 0; z-index: 5; pointer-events: none; }
.uc-meadow .bl-stem {
  position: absolute; bottom: 0; left: -.14em; width: .28em; height: 2.2em;
  border-radius: .2em; background: linear-gradient(180deg, #57b24a, #337d36);
  transform-origin: 50% 100%; transform: scaleY(0);
  animation: blGrow .3s ease-out forwards;
}
.uc-meadow .bl-head {
  position: absolute; bottom: 2.05em; left: 0; width: 0; height: 0;
  transform: scale(0); transform-origin: 50% 100%;
  animation: blPop .45s cubic-bezier(.2,1.6,.45,1) .22s forwards,
             blSway 2.6s ease-in-out .8s infinite alternate;
}
.uc-meadow .bl-p {
  position: absolute; left: -.31em; bottom: 0; width: .62em; height: 1.15em;
  border-radius: 50%; transform-origin: 50% 100%;
}
.uc-meadow .bl-core {
  position: absolute; left: -.42em; top: -.42em; width: .84em; height: .84em;
  border-radius: 50%; background: radial-gradient(circle at 40% 35%, #ffe9a8, #ffb63d);
}
.uc-meadow .bl.bl-out { transition: opacity .7s ease, transform .7s ease; opacity: 0; transform: scale(.5); }
@keyframes blGrow { to { transform: scaleY(1); } }
@keyframes blPop { to { transform: scale(1); } }
@keyframes blSway { from { rotate: -5deg; } to { rotate: 5deg; } }
.uc-meadow #sun {
  --sc1: #FFFDF2; --sc2: #FFF3CE; --sc3: #FFE9B8;
  position: absolute; width: 16vmin; height: 16vmin;
  transform: translate(-50%, -50%); pointer-events: none;
}
.uc-meadow #sun .halo {
  position: absolute; inset: -130%; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,252,235,.9) 0%, rgba(255,235,210,.35) 30%, rgba(255,220,200,0) 68%);
}
.uc-meadow #sun .core {
  position: absolute; inset: 21%; border-radius: 50%;
  background: radial-gradient(circle at 44% 40%, var(--sc1), var(--sc2) 74%, var(--sc3) 100%);
  box-shadow: 0 0 3vmin rgba(255,240,190,.85);
}
.uc-meadow #rainbow-wrap { position: absolute; left: 50%; bottom: 28%; width: 100vmin; height: 50vmin;
  transform: translateX(-50%); pointer-events: none; }
.uc-meadow #rainbow {
  position: absolute; inset: 0;
  /* the explicit 50vmin radius is load-bearing: the default farthest-corner
     ring overflows the div and its clipped bands tint the whole box into a
     visible rectangle (and closest-side collapses to 0 — the center sits ON
     the bottom edge) */
  background: radial-gradient(circle 50vmin at 50% 100%,
    transparent 0 53%,
    rgba(199,125,255,.55) 56% 59%,
    rgba(125,196,255,.58) 62% 65%,
    rgba(138,224,138,.60) 68% 71%,
    rgba(255,224,102,.66) 74% 77%,
    rgba(255,164, 92,.66) 80% 83%,
    rgba(255,111,145,.68) 86% 89%,
    transparent 92%);
  filter: blur(.45vmin);
  animation: rainbowBreathe 6s ease-in-out infinite alternate;
}
@keyframes rainbowBreathe { from { opacity: .78; } to { opacity: 1; } }
/* click shine: the arc flares bright + crisp for a beat (replaces the breathe
   animation for its duration), while .rb-spark twinkles pop along the bands */
.uc-meadow #rainbow-wrap.rb-shine #rainbow { animation: rbShine 1.8s ease; }
@keyframes rbShine {
  0%, 100% { filter: blur(.45vmin) brightness(1); }
  30%      { filter: blur(.28vmin) brightness(1.6) saturate(1.5); }
}
.uc-meadow .rb-spark {
  position: fixed; width: 13px; height: 13px; z-index: 6; pointer-events: none;
  clip-path: polygon(50% 0%,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0% 50%,38% 38%);
}
.uc-meadow canvas.scene { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.uc-meadow #wf-stage {
  position: fixed; left: 20%; width: 10vmin;
  transform: translateX(-50%); pointer-events: none;
}
.uc-meadow #wf-stage canvas { display: block; width: 100%; height: 100%; }
.uc-meadow .cartoon {
  --white: #fff; --light: #f0d4ea;
  --blue: #b678ea; --bluedark: #8b48c8;
  position: absolute;
  width: 90vmin; height: 90vmin;
  left: 85.5%; top: 69%;      /* fallback — paintMain() sets the exact knoll-top % */
  margin-left: -45vmin; margin-top: -76.05vmin;  /* anchor = 50% / 84.5% (the castle's ground line) */
  transform: scale(.68);
  transform-origin: 50% 84.5%;
  filter: drop-shadow(0 1vmin 2.2vmin rgba(90,30,80,.30));
}
.uc-meadow .cartoon div { position: absolute; box-sizing: border-box; }
.uc-meadow .hb::before, .uc-meadow .ha::after { content: ""; display: block; position: absolute; }
.uc-meadow .wall {
  height: 12.25%; width: 44%; top: 73.75%; left: 28.125%;
  background: linear-gradient(to bottom, transparent 12.5%, #c9bad5 0), linear-gradient(to right, transparent 50%, #c9bad5 0), linear-gradient(to right, #82739a 50%, transparent 0);
  background-size: 6% 100%, 6% 100%, 100% 100%;
  background-position: -3.75vmin 0;
}
.uc-meadow .wall::after {
  height: 14%; width: 40%; background: var(--bluedark); top: -13%; left: 0;
  clip-path: polygon(0% 100%, 8% 0%, 100% 0%, 100% 100%);
}
.uc-meadow .tower {
  height: 19.75%; width: 6.25%; top: 66.25%;
  clip-path: polygon(12% 0%, 88% 0%, 88% 9%, 84% 9%, 84% 15%, 100% 20%, 100% 32%, 87% 39%, 87% 100%, 12% 100%, 12% 39%, 0% 32%, 0% 20%, 16% 15%, 16% 9%, 12% 9%, 12% 0);
  background: linear-gradient(to bottom, #ffffff 9%, #d7d1cb 0 15%, #f7f4f0 0 20%, #ffffff 0 32%, #ebe7e1 0 39%, #ffffff 0 45.75%, transparent 0), linear-gradient(to right, #f7f4f0 27%, #ebe7e1 0 65%, #d7d1cb 0);
}
.uc-meadow .tower-1 { left: 33.75%; }
.uc-meadow .tower-2 { left: 51.5%; }
.uc-meadow .tower-3 { width: 7.25%; left: 24.5%; }
.uc-meadow .tower-3a { clip-path: polygon(16% 0%, 84% 0%, 84% 9%, 84% 15%, 100% 20%, 100% 32%, 87% 39%, 87% 100%, 12% 100%, 12% 39%, 0% 32%, 0% 20%, 16% 15%, 16% 9%, 16% 0); }
.uc-meadow .tower-3b { clip-path: polygon(16% 45.75%, 84% 45.75%, 84% 100%, 16% 100%); }
.uc-meadow .tower-4 {
  width: 6.66%; left: 60.125%;
  clip-path: polygon(16% 29.5%, 84% 30.5%, 84% 100%, 16% 100%);
  background: linear-gradient(to bottom, #ebe7e1 0 45.75%, transparent 0), linear-gradient(to right, #f7f4f0 27%, #ebe7e1 0 65%, #d7d1cb 0);
}
.uc-meadow .tower-5 {
  left: 67%; width: 8.66%;
  clip-path: polygon(0% 20.5%, 100% 20.5%, 100% 39%, 85% 45%, 85% 100%, 15% 100%, 15% 45%, 0% 39%);
  background: linear-gradient(transparent 30%, #ffffff 0 39%, #c9bad5 0 45%, #ebe7e1 0), linear-gradient(to right, white 50%, #c9bad5 0);
  background-size: 100% 100%, 40% 100%;
}
.uc-meadow .tower-6 {
  clip-path: polygon(0% 3%, 100% 3%, 100% 40%, 0% 40%);
  background-image: linear-gradient(transparent 13%, #ffffff 0 21%, #c9bad5 0), linear-gradient(to right, white 50%, #c9bad5 0);
  transform: scale(0.85); left: 66.4%; top: 64.8%;
}
.uc-meadow .tower-7 { top: 62.66%; left: 58.5% }
.uc-meadow .brick {
  color: #bfaed0; background: #bfaed0;
  top: 78%; left: 27.25%; width: 1.35%; height: 0.9%;
  box-shadow: -0.8vmin -0.85vmin, -0.8vmin 5.25vmin, 0.6vmin 3.5vmin, 1.75vmin 2.6vmin, 7.5vmin -1.8vmin, 7.5vmin 4vmin, 8vmin 4.8vmin, 9.5vmin 0.7vmin, 23.4vmin 1.9vmin, 24.33vmin -0.5vmin, 25.6vmin -1.3vmin, 24.33vmin 4.75vmin, 25.6vmin 5.5vmin, 31.25vmin -1.75vmin, 31.25vmin 5vmin, 32.25vmin 2vmin, 33.5vmin 1.2vmin, 36.75vmin 1vmin, 37.66vmin 1.8vmin, 40vmin -1.5vmin, 40.125vmin 4.25vmin, 41.25vmin 3.4vmin, 36.75vmin 5.25vmin;
}
.uc-meadow .window {
  color: #ffd77e; background: #ffd77e;
  width: 1.25%; height: 1.25%; top: 70.25%; left: 26.2%;
  box-shadow: 2.25vmin 0, 8vmin 0, 10.25vmin 0, 24vmin 0, 26.125vmin 0, 4.6vmin -4vmin 0 -0.125vmin, 4.6vmin -4.5vmin 0 -0.125vmin, 12.75vmin -15vmin 0 -0.125vmin, 12.75vmin -15.75vmin 0 -0.125vmin, 12.75vmin -16.5vmin 0 -0.125vmin, 12.75vmin -17.25vmin 0 -0.125vmin, 17vmin -22.125vmin 0 0.125vmin, 17vmin -19.33vmin 0 0.125vmin, 17vmin -18.66vmin 0 0.125vmin,
    32.125vmin 1.5vmin 0 -0.125vmin, 33.66vmin 1.5vmin 0 -0.125vmin,
    0.25vmin -3.66vmin 0 -0.125vmin, 2vmin -3.66vmin 0 -0.125vmin,
    8.125vmin -3.66vmin 0 -0.125vmin, 9.875vmin -3.66vmin 0 -0.125vmin,
    24.125vmin -3.66vmin 0 -0.125vmin, 25.75vmin -3.66vmin 0 -0.125vmin;
  animation: windowFlicker 4.5s ease-in-out infinite;
}
@keyframes windowFlicker {
  0%, 100% { filter: drop-shadow(0 0 .55vmin rgba(255,200,90,.7)); }
  50%      { filter: drop-shadow(0 0 1.1vmin rgba(255,210,110,1)); }
}
.uc-meadow .roof {
  color: #8b48c8; width: 4.75%; height: 5%;
  border: 2vmin solid transparent; border-top: 8vmin solid transparent;
  border-bottom: 7.5vmin solid #8b48c8;
}
.uc-meadow .roof-1 {
  top: 49.125%; left: 34.5%;
  filter: drop-shadow(-7.8vmin 0) drop-shadow(23.8vmin 0);
  clip-path: polygon(-400% 0%, 500% 0%, 500% 100%, -400% 100%);
}
.uc-meadow .roof-2 {
  top: 49.75%; left: 69.75%;
  filter: drop-shadow(-7.8vmin 4.75vmin) drop-shadow(-8.75vmin -2vmin);
  clip-path: polygon(-220% 0%, 100% 0%, 100% 200%, -220% 200%);
}
.uc-meadow .flag-pole {
  width: 0.8%; height: 5.5%; background: #fff5cf; color: #fff5cf;
  top: 53.25%; left: 27.8%;
  box-shadow: 7.8vmin 0, 23.75vmin 0, 39.55vmin 0.9vmin, 31.7vmin 5.5vmin, 30.7vmin -1.25vmin, 3.33vmin 4.5vmin 0 -0.125vmin;
}
.uc-meadow .flag-pole-top {
  width: 0.5%; height: 3%; background: #fff5cf; color: #fff5cf;
  top: 41%; left: 40.8%;
  box-shadow: 6.5vmin -14vmin, 6.5vmin -14.5vmin, 14.9vmin -8.5vmin, 8.75vmin -14vmin, 10vmin -14vmin;
}
.uc-meadow .house-roof {
  left: 30.5%; top: 61.25%; width: 2.8%; height: 3.5%;
  background: #8b48c8;
  clip-path: polygon(0% 100%, 40% 0%, 60% 0%, 100% 100%);
}
.uc-meadow .house {
  background: #cec6be; width: 40%; height: 15%; left: 30.5%; top: 64.75%;
  clip-path: polygon(0% 0%, 7% 0%, 7% 40%, 15% 40%, 50% 100%, 50% 19%, 91.5% 19%, 91.5% 64%, 90% 68%, 80% 100%, 0% 100%);
}
.uc-meadow .house::after { width: 11.5%; height: 10%; background: #a89f95; top: 20%; left: 76%; }
.uc-meadow .minar-top {
  width: 3%; height: 8%; background: #8b48c8; top: 33.5%; left: 56.125%;
  clip-path: polygon(0% 100%, 45% 0%, 55% 0%, 100% 100%);
}
.uc-meadow .minar-top-2 { top: 27.5%; left: 46.75%; }
.uc-meadow .minar {
  background: #ffffff; width: 3%; height: 25%; left: 46.75%; top: 35.25%;
  box-shadow: 1vmin 8vmin 0 1.75vmin #ffffff, 8.5vmin 5.5vmin #f7f4f0, 6.5vmin 17vmin #f7f4f0;
}
.uc-meadow .minar::after { width: 145%; height: 1.125vmin; left: 290%; top: 44%; background: #fff; }
.uc-meadow .main-roof-behind {
  top: 28%; left: 39.5%; background: #ffeb97; width: 4%; height: 21%;
  clip-path: polygon(0% 100%, 45% 20%, 45% 0%, 55% 0%, 55% 20%, 100% 100%);
}
.uc-meadow .main-tower-roof {
  width: 3.75%; height: 14%; top: 15%; left: 50.4%;
  clip-path: polygon(0% 100%, 42% 35%, 42% 0%, 58% 0%, 58% 35%, 100% 100%);
  background: linear-gradient(#fff5cf 35%, #ffeb97 0);
}
.uc-meadow .main-roof {
  width: 11.5%; height: 13%; left: 39.5%; top: 36.5%;
  clip-path: polygon(0% 100%, 13.5% 48%, 24% 90%, 37% 24%, 37% 0%, 45% 0%, 45% 16%, 64% 16%, 64% 0%, 72% 0%, 72% 24%, 88% 100%);
  background: linear-gradient(#ffea97 24%, transparent 0), linear-gradient(to right, #b678ea 54%, #8b48c8 0)
}
.uc-meadow .main-top {
  width: 10.5%; height: 26%; left: 40.5%; top: 41%; background: transparent;
  clip-path: polygon(50% 0%, 58% 13%, 58% 6%, 63% 6%, 63% 32.5%, 100% 32.5%, 100% 100%, 0% 100%, 0% 32.5%, 37% 32.5%, 37% 6%, 42% 6%, 42% 13%);
  background-image: linear-gradient(#f7f4f0 45%, #d7d1cb 0 52%, #ebe7e1 0 58%, transparent 0 61%, #f7f4f0 0), linear-gradient(to right, #ebe7e1 50%, #f7f4f0 0);
  background-size: 100% 100%, 20% 100%;
  box-shadow: inset 0.75vmin 0 #fff;
}
.uc-meadow .main {
  width: 18.75%; height: 20%;
  background: linear-gradient(to right, #f7f4f0 5%, #fdfdfc 0 95%, #f7f4f0 0);
  top: 64.5%; left: 40.5%;
}
.uc-meadow .main::after { width: 104%; height: 0.5vmin; left: -2%; top: -0.5vmin; background: #dedbd5; }
.uc-meadow .main-tower {
  width: 6%; height: 50%; top: 28.5%; left: 49.25%;
  clip-path: polygon(80% 0%, 20% 0%, 20% 7%, 5% 7%, 5% 11%, 17% 13.5%, 17% 27.5%, 10% 27.5%, 10% 40.5%, 0% 40.5%, 0% 45%, 10% 47%, 10% 100%,
    90% 100%, 90% 47%, 100% 45%, 100% 40.5%, 90% 40.5%, 90% 27.5%, 83% 27.5%, 83% 13.5%, 95% 11%, 95% 7%, 80% 7%);
  background: linear-gradient(#f7f4f0 7%, #ffffff 0 11%, #d7d1cb 0 13.5%, transparent 0 40.5%, #ffffff 0 45%, #cccccc 0 47%, #ffffff 0), linear-gradient(to right, transparent 7%, #fff 0 40%, #f7f4f0 0 75%, #d7d1cb 0);
}
.uc-meadow .front-gate {
  width: 8.5%; height: 18.5%; top: 67.5%; left: 41.5%;
  background-image: linear-gradient(#fff 33%, transparent 0 75%, #fff 0), linear-gradient(to right, #f7f4f0 11%, #fff 0 89%, #f7f4f0 0);
}
.uc-meadow .front-gate::after {
  width: 2.5vmin; height: 2.5vmin; background: #ffd77e; border-radius: 50%;
  transform: translate(-50%, -60%); top: 0; left: 50%;
  box-shadow: 0 0 1vmin rgba(255,210,120,.85);
}
.uc-meadow .gate {
  width: 80%; height: 50%; bottom: 0; left: 10%;
  background: linear-gradient(180deg, #ffe1a1 0%, #f7b76a 45%, #c97f4e 100%);
  border-radius: 140% 140% 0 0;
  border: 0.75vmin solid #f7f4f0; border-bottom: 0;
  box-shadow: 0 0 1.5vmin rgba(255,190,110,.55);
}
.uc-meadow .balcony {
  width: 36%; height: 20%; background: #ffd77e; color: #ffd77e;
  border-radius: 100% 100% 0 0; top: 12.5%; left: 15%;
  box-shadow: 2.66vmin 0, 1.33vmin 2vmin 0 -0.25vmin #f7f4f0, 7.25vmin -21.75vmin 0 -0.5vmin;
}
.uc-meadow .balcony::after {
  width: 60%; height: 30%; bottom: -85%; background: #f7f4f0;
  box-shadow: 3.75vmin 0 #f7f4f0;
}
.uc-meadow .triangle {
  width: 100%; height: 61%; top: -61%;
  clip-path: polygon(10% 100%, 33% 25%, 33% 0%, 40% 0%, 40% 15%, 60% 15%, 60% 0%, 67% 0%, 67% 25%, 90% 100%);
  background: linear-gradient(#ffeb98 25%, transparent 0), linear-gradient(to right, #b678ea 50%, #8b48c8 0);
}
.uc-meadow .triangle::after {
  width: 100%; height: 100%; background: #fff;
  clip-path: polygon(25% 100%, 50% 40%, 75% 100%);
}
.uc-meadow .front-poles {
  width: 10%; height: 25%; background: #ffeb98; top: -25%;
  box-shadow: 6.85vmin 0 #ffeb98;
}
.uc-meadow .flag {
  width: 4%; height: 3%; background: #ff77b9;
  clip-path: polygon(0% 0%, 100% 50%, 0% 100%);
  transform-origin: 0 50%;
  animation: wave 1.6s ease-in-out infinite;
}
@keyframes wave { 0%, 100% { transform: skewY(4deg); } 50% { transform: skewY(-4deg); } }
.uc-meadow .flag-1 { top: 53.6%; left: 28%; }
.uc-meadow .flag-2 { left: 62%; top: 53.6%; animation-delay: -.5s; }
.uc-meadow .flag-3 { left: 71.75%; top: 54.33%; animation-delay: -1s; }
.uc-meadow .flag-4 { top: 15.25%; left: 52.25%; background: #ffd36e; animation-delay: -.3s; }
.uc-meadow .room-1 {
  width: 3%; height: 9%; top: 49%; left: 39.5%;
  clip-path: polygon(0% 4%, 100% 4%, 100% 100%, 30% 100%, 0% 80%);
  background: linear-gradient(white 80%, #f6f4ef 0);
}
.uc-meadow .room-2 {
  width: 3%; height: 15%; top: 45%; left: 57.25%;
  clip-path: polygon(0% 56%, 39% 29%, 39% 0%, 62% 0%, 60% 29%, 100% 56%, 100% 86%, 50% 100%, 0% 86%);
  background: linear-gradient(#fff5cf 29%, #8b48c8 0 56%, transparent 0 86%, #f6f4ef 0), linear-gradient(to right, #fff 72%, #d7d1ca 0);
}
.uc-meadow .window-curved {
  width: 0.75%; height: 1.75%; background: #ffd77e; color: #ffd77e;
  border-radius: 100% 100% 0 0; top: 60%; left: 50.75%;
  box-shadow: 2.125vmin -2.75vmin, 1vmin -6vmin;
  animation: windowFlicker 4.5s ease-in-out infinite; animation-delay: -2s;
}
.uc-meadow .room-3 {
  width: 2%; height: 13%; top: 24%; left: 52.7%;
  clip-path: polygon(0% 35%, 50% 0%, 100% 35%, 100% 85%, 50% 100%, 0% 85%);
  background: linear-gradient(#fff5cf 35%, #fff 0 85%, #d7d1cb 0)
}
.uc-meadow .room-3::after {
  width: 50%; height: 17%; top: 45%; left: 25%;
  background: #ffd77e; box-shadow: 0 0 .8vmin rgba(255,210,120,.85);
}
.uc-meadow #cv-clouds { z-index: 6; }
.uc-meadow .tint-warm, .uc-meadow .tint-violet { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 7; }
.uc-meadow .tint-warm { background: linear-gradient(180deg, #d64f89 0%, #fdb054 100%); }
.uc-meadow .tint-violet { background: linear-gradient(180deg, #2a1c5e 0%, #6b4293 60%, #a4589a 100%); }
/* narrow screens (phones): the castle shrinks so it fits its inward-shifted
   knoll (paintMain moves the knoll centre to 72% at <640px) */
@media (max-width: 640px){
  .uc-meadow .cartoon{ transform: scale(.5); }
}
`;
  function injectCSS() {
    var st = document.getElementById('uc-meadow-style');
    if (!st) { st = document.createElement('style'); st.id = 'uc-meadow-style'; document.head.appendChild(st); }
    st.textContent = CSS;
  }

  var MARKUP = `
<div class="sky-day"></div>
<div class="sky-morning" id="sky-morning"></div>
<div class="sky-sunset" id="sky-sunset"></div>
<div class="sky-twilight" id="sky-twilight"></div>
<div id="night">
  <div class="st-dots st-a"></div>
  <div class="st-dots st-b"></div>
  <div class="st-spark" style="top:5%;left:24%;width:1.7vmin;height:1.7vmin"></div>
  <div class="st-spark" style="top:12%;left:47%;width:1.2vmin;height:1.2vmin;background:#ffe9a8;animation-delay:-1.2s"></div>
  <div class="st-spark" style="top:8%;left:66%;width:1.5vmin;height:1.5vmin;animation-delay:-2.3s"></div>
  <div class="st-spark" style="top:17%;left:82%;width:1.1vmin;height:1.1vmin;background:#cfe4ff;animation-delay:-.7s"></div>
  <div class="st-spark" style="top:20%;left:34%;width:1vmin;height:1vmin;background:#ffe9a8;animation-delay:-2.9s"></div>
  <div class="st-spark" style="top:3%;left:55%;width:1.3vmin;height:1.3vmin;animation-delay:-1.8s"></div>
  <!-- the glowing cratered moon (after the frozen theme's shaded sphere) -->
  <svg id="moon" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="mnG" cx="35%" cy="32%" r="80%">
        <stop offset="0" stop-color="#FFFEF5"/><stop offset=".55" stop-color="#F3EEDC"/><stop offset="1" stop-color="#CFC7AE"/>
      </radialGradient>
      <radialGradient id="mnH" cx="50%" cy="50%" r="50%">
        <stop offset=".5" stop-color="rgba(255,250,220,.55)"/><stop offset="1" stop-color="rgba(255,250,220,0)"/>
      </radialGradient>
      <clipPath id="mnC"><circle cx="50" cy="50" r="34"/></clipPath>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#mnH)"/>
    <circle cx="50" cy="50" r="34" fill="url(#mnG)"/>
    <g clip-path="url(#mnC)">
      <g fill="rgba(160,150,120,.35)">
        <circle cx="38" cy="42" r="9"/><circle cx="58" cy="34" r="5"/><circle cx="62" cy="56" r="7"/>
        <circle cx="44" cy="64" r="4"/><circle cx="30" cy="58" r="3"/>
      </g>
      <g fill="rgba(150,140,110,.45)">
        <circle cx="52" cy="47" r="2.2"/><circle cx="35" cy="30" r="1.8"/><circle cx="66" cy="44" r="1.6"/>
      </g>
      <circle cx="64" cy="64" r="34" fill="rgba(90,80,120,.16)"/>
    </g>
  </svg>
</div>

<div id="sun"><div class="halo"></div><div class="core"></div></div>

<canvas class="scene" id="cv-far"></canvas>
<div id="rainbow-wrap"><div id="rainbow"></div></div>
<canvas class="scene" id="cv-main"></canvas>

<div id="wf-stage"></div>

<!-- the enchanted castle (castle.html art) on the right mound -->
<div class="cartoon hb">
  <div class="minar-top minar-top-2"></div>
  <div class="minar-top"></div>
  <div class="minar ha"></div>
  <div class="tower tower-5 tower-6 tower-7"></div>
  <div class="house ha"></div>
  <div class="main-roof-behind"></div>
  <div class="main-roof ha"></div>
  <div class="main-top"></div>
  <div class="flag flag-4"></div>
  <div class="main-tower-roof"></div>
  <div class="main-tower"></div>
  <div class="main ha"></div>
  <div class="tower tower-3 tower-3a"></div>
  <div class="wall ha"></div>
  <div class="tower tower-1"></div>
  <div class="tower tower-2"></div>
  <div class="tower tower-3 tower-3b"></div>
  <div class="tower tower-4"></div>
  <div class="tower tower-5 tower-6"></div>
  <div class="tower tower-5"></div>
  <div class="brick"></div>
  <div class="room-1"></div>
  <div class="room-2"></div>
  <div class="room-3 ha"></div>
  <div class="window"></div>
  <div class="window-curved"></div>
  <div class="roof roof-1"></div>
  <div class="roof roof-2"></div>
  <div class="flag flag-1"></div>
  <div class="flag flag-2"></div>
  <div class="flag flag-3"></div>
  <div class="flag-pole-top"></div>
  <div class="flag-pole"></div>
  <div class="house-roof"></div>
  <div class="front-gate ha">
    <div class="gate"></div>
    <div class="balcony ha"></div>
    <div class="triangle ha"></div>
    <div class="front-poles"></div>
  </div>
</div>

<canvas class="scene" id="cv-clouds"></canvas>

<div class="tint-warm" id="tint-warm"></div>
<div class="tint-violet" id="tint-violet"></div>
`;

  function init(cfg) {
    cfg = cfg || {};
    var ROOT = cfg.stage || document.body;
    var BASE = cfg.base || '';

    var STOP = false, _rafs = [], _ivals = [], _touts = [], _listeners = [];
    function requestAnimationFrame(fn) { if (STOP) return 0; var id = window.requestAnimationFrame(fn); _rafs.push(id); return id; }
    function setInterval(fn, ms) { var id = window.setInterval(fn, ms); _ivals.push(id); return id; }
    function setTimeout(fn, ms) { var id = window.setTimeout(fn, ms); _touts.push(id); return id; }
    function clearTimeout(id) { window.clearTimeout(id); }
    function sceneOn(t, ty, fn) { t.addEventListener(ty, fn); _listeners.push([t, ty, fn]); }

    injectCSS();
    ROOT.classList.add('uc-meadow');
    ROOT.insertAdjacentHTML('beforeend', MARKUP);
    window.__ucFxRoot = ROOT;          // unicorn.item.js paints its click-fx here (behind the card)


  var TAU = Math.PI * 2;
  var DPR = Math.min(devicePixelRatio || 1, 2);
  var CYCLE = 120000;
  /* W/H = viewport; HM = the vertical budget the LANDSCAPE (ridges/hills/
     waterfall/flower band) may use, measured UP from the bottom edge. On
     landscape HM === H (pixel-identical to the original design); on a TALL
     portrait phone HM ≈ W so the mountains stop dominating the screen and
     the sky/rainbow get room. */
  var W, H, HM;

  /* seeded prng (mulberry32) → the ridge/flower layout is identical every load */
  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var cvFar = document.getElementById('cv-far');
  var cvMain = document.getElementById('cv-main');
  var cvClouds = document.getElementById('cv-clouds');
  var xFar = cvFar.getContext('2d'), xMain = cvMain.getContext('2d'), xCl = cvClouds.getContext('2d');

  function lg(c, x1,y1,x2,y2,st){var g=c.createLinearGradient(x1,y1,x2,y2);st.forEach(function(s){g.addColorStop(s[0],s[1]);});return g;}
  function rg(c, x,y,r1,r2,st){var g=c.createRadialGradient(x,y,r1,x,y,r2);st.forEach(function(s){g.addColorStop(s[0],s[1]);});return g;}

  /* ── the ORIGINAL jagged ridge (unicorns.bg.js), fed by the seeded prng ── */
  function ridge(c, rnd, yTop, amp, n, color, snow){
    var pts = [];
    for (var i = 0; i <= n; i++){
      var x = (i / n) * W;
      var peak = (i % 2 === 1);
      var y = yTop + (peak ? -amp * (0.55 + rnd() * 0.45)
                           :  amp * (0.15 + rnd() * 0.3));
      pts.push([x, y]);
    }
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-10, H);
    c.lineTo(-10, pts[0][1]);
    pts.forEach(function(p){ c.lineTo(p[0], p[1]); });
    c.lineTo(W + 10, H);
    c.closePath();
    c.fill();
    if (snow){
      c.fillStyle = 'rgba(255, 244, 250, 0.95)';
      for (var j = 1; j < pts.length - 1; j += 2){
        var px = pts[j][0], py = pts[j][1];
        var lx = (pts[j-1][0] + px) / 2, ly = (pts[j-1][1] + py) / 2;
        var rx = (pts[j+1][0] + px) / 2, ry = (pts[j+1][1] + py) / 2;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + (lx - px) * 0.45, py + (ly - py) * 0.45);
        c.quadraticCurveTo(px, py + (ly - py) * 0.62, px + (rx - px) * 0.45, py + (ry - py) * 0.45);
        c.closePath();
        c.fill();
      }
    }
    return pts;
  }

  var WF = { x: 0.20, top: 0.62, bottom: 0.885 };   // waterfall column (top is re-anchored to the ridge crest)

  function paintFar(){
    xFar.clearRect(0, 0, W, H);
    ridge(xFar, mulberry32(1101), H - HM * 0.48, HM * 0.16, 8, '#E8BBE4', true);
  }

  function paintMain(){
    var c = xMain, rnd;
    c.clearRect(0, 0, W, H);
    // middle + near pink ridges (original colours, bottom-anchored via HM)
    ridge(c, mulberry32(2202), H - HM * 0.38, HM * 0.17, 6, '#DD93CF', true);
    var nearPts = ridge(c, mulberry32(3303), H - HM * 0.28, HM * 0.13, 5, '#C66BB4', false);
    WF.bottom = (H - HM * 0.115) / H;   // the plunge pool tracks the hills band

    // anchor the waterfall to the near ridge's FIRST peak (x = 0.2W, seeded →
    // deterministic): the water pours out of an ELLIPTICAL mountain spring
    // sunk into the crest (ridge-family colours, so it blends into the rock)
    var crest = nearPts[1];
    WF.x = crest[0] / W;
    WF.top = crest[1] / H + 0.012;
    var stg = document.getElementById('wf-stage');
    stg.style.left = (WF.x * 100) + '%';
    stg.style.top = (WF.top * 100) + '%';
    stg.style.height = ((WF.bottom - WF.top) * 100 + 1.5) + '%';

    var wx = crest[0], wy = H * WF.top;
    var srx = W * 0.038, sry = HM * 0.016;
    c.fillStyle = '#A8508F';                        // dark rocky rim, same family as the ridge
    c.beginPath(); c.ellipse(wx, wy, srx, sry, 0, 0, TAU); c.fill();
    c.fillStyle = rg(c, wx, wy, 1, srx * 0.8, [     // the spring water inside
      [0, '#C9F2F8'], [0.6, '#8ADCEC'], [1, '#63C9E0'],
    ]);
    c.beginPath(); c.ellipse(wx, wy - sry * 0.15, srx * 0.78, sry * 0.62, 0, 0, TAU); c.fill();

    // the castle mound — a GREEN grassy knoll (original curve, widened plateau
    // so the 2× castle sits fully on it); the castle is anchored to its top.
    // NARROW screens pull the knoll (and castle) inward so it isn't clipped
    // at the right edge (the castle itself also shrinks via a CSS media rule).
    var cx = W * (W < 640 ? 0.72 : 0.855), cs = Math.min(W, H) * 0.0016;
    var top = H - HM * 0.345 + 30 * cs;
    c.fillStyle = lg(c, 0, top, 0, H, [[0, '#69B857'], [1, '#3E8F41']]);
    c.beginPath();
    c.moveTo(cx - W * 0.32, H);
    c.quadraticCurveTo(cx - W * 0.22, top + HM * 0.05, cx - W * 0.10, top);
    c.quadraticCurveTo(cx, top - HM * 0.012, cx + W * 0.10, top);
    c.quadraticCurveTo(cx + W * 0.22, top + HM * 0.05, cx + W * 0.33, H);
    c.closePath();
    c.fill();
    // plant the castle exactly on the knoll top + centre (CSS values are fallbacks)
    var cart = document.querySelector('.cartoon');
    cart.style.top = ((top - H * 0.006) / H * 100) + '%';
    cart.style.left = (cx / W * 100) + '%';

    // rolling foreground hills — the original curves, GREEN (bottom-anchored)
    c.fillStyle = lg(c, 0, H - HM * 0.26, 0, H, [
      [0, '#93DB74'], [0.55, '#5DBD52'], [1, '#3F9E44'],
    ]);
    c.beginPath();
    c.moveTo(-10, H);
    c.lineTo(-10, H - HM * 0.16);
    c.quadraticCurveTo(W * 0.22, H - HM * 0.245, W * 0.46, H - HM * 0.165);
    c.quadraticCurveTo(W * 0.62, H - HM * 0.115, W * 0.82, H - HM * 0.155);
    c.quadraticCurveTo(W * 0.94, H - HM * 0.177, W + 10, H - HM * 0.145);
    c.lineTo(W + 10, H);
    c.closePath();
    c.fill();

    // the plunge pool the waterfall lands in
    var pyx = W * WF.x, pyy = H * WF.bottom;
    c.fillStyle = rg(c, pyx, pyy, 2, W * 0.085, [
      [0, '#C9F2F8'], [0.45, '#8ADCEC'], [1, '#57C4DE'],
    ]);
    c.beginPath();
    c.ellipse(pyx, pyy, W * 0.075, HM * 0.026, 0, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = Math.max(1.5, H * 0.003);
    c.stroke();

    // one dainty 5-petal flower with a golden centre
    var FLOWER_COLS = ['#FFE9F4', '#FFD2E8', '#FFF6CE', '#E8D8FF', '#D8ECFF'];
    function drawFlower(fx, fy, fs, col){
      c.fillStyle = col;
      for (var p = 0; p < 5; p++){
        var a = p / 5 * TAU;
        c.beginPath();
        c.arc(fx + Math.cos(a) * fs, fy + Math.sin(a) * fs, fs * 0.75, 0, TAU);
        c.fill();
      }
      c.fillStyle = '#FFB948';
      c.beginPath(); c.arc(fx, fy, fs * 0.6, 0, TAU); c.fill();
    }

    // tiny meadow flowers sprinkled over the foreground hills (original algorithm)
    rnd = mulberry32(4404);
    for (var i = 0; i < 90; i++){
      var fx = rnd() * W;
      var fy = H - HM * 0.14 + rnd() * HM * 0.13;
      var fs = 1.2 + rnd() * 2.0;
      drawFlower(fx, fy, fs, FLOWER_COLS[0 | rnd() * 4]);
    }

    // a little flower GARDEN on the castle knoll (user request) — sample the same
    // 3-quadratic top curve the mound is filled with, so every bloom sits ON the
    // grass; keep them BELOW the castle's ground line (`top`) so none peek through
    // the tower gaps (the castle DOM sits above this canvas), spread across the
    // plateau + its shoulders in front of the castle.
    (function(){
      var qc = function(p0, p1, p2, u){ var m = 1 - u; return m*m*p0 + 2*m*u*p1 + u*u*p2; };
      var SEG = [
        [[cx - W*0.32, H],   [cx - W*0.22, top + HM*0.05], [cx - W*0.10, top]],
        [[cx - W*0.10, top], [cx,          top - HM*0.012],[cx + W*0.10, top]],
        [[cx + W*0.10, top], [cx + W*0.22, top + HM*0.05], [cx + W*0.33, H]],
      ];
      var curve = [];
      SEG.forEach(function(s){
        for (var u = 0; u <= 1.0001; u += 0.04)
          curve.push([qc(s[0][0], s[1][0], s[2][0], u), qc(s[0][1], s[1][1], s[2][1], u)]);
      });
      function surfaceY(x){                     // knoll-top y at x (curve is x-monotonic)
        for (var k = 1; k < curve.length; k++){
          if (x <= curve[k][0]){
            var a = curve[k-1], b = curve[k], f = (x - a[0]) / ((b[0] - a[0]) || 1);
            return a[1] + (b[1] - a[1]) * f;
          }
        }
        return curve[curve.length - 1][1];
      }
      var kr = mulberry32(7707);
      for (var j = 0; j < 48; j++){
        var kx = cx - W*0.20 + kr() * (W*0.38);
        var surf = Math.max(top, surfaceY(kx));   // never above the grass line
        var ky = surf + HM*0.02 + kr() * HM*0.14;  // apron band in front of the castle
        drawFlower(kx, ky, 1.0 + kr() * 1.7, FLOWER_COLS[0 | kr() * 5]);
      }
    })();
  }

  /* ── drifting candy clouds with the rosy under-light (original code) ── */
  var CLOUDS;
  function initClouds(){
    var rnd = mulberry32(5505);
    CLOUDS = [];
    for (var i = 0; i < 6; i++) CLOUDS.push({
      x: rnd() * W,
      y: H * (0.06 + rnd() * 0.30),
      s: 0.55 + rnd() * 0.9,
      spd: 6 + rnd() * 10,
      tint: rnd(),
    });
  }
  function drawClouds(dt){
    xCl.clearRect(0, 0, W, H);
    CLOUDS.forEach(function(cl){
      cl.x += cl.spd * dt;
      if (cl.x - 160 * cl.s > W) cl.x = -170 * cl.s;
      var puffs = [[0, 0, 46], [-38, 10, 32], [38, 8, 34], [-14, -14, 34], [18, -12, 30]];
      xCl.fillStyle = 'rgba(255, ' + (244 - cl.tint * 26 | 0) + ', ' + (250 - cl.tint * 14 | 0) + ', 0.85)';
      xCl.beginPath();
      puffs.forEach(function(pf){
        xCl.moveTo(cl.x + pf[0] * cl.s + pf[2] * cl.s, cl.y + pf[1] * cl.s);
        xCl.arc(cl.x + pf[0] * cl.s, cl.y + pf[1] * cl.s, pf[2] * cl.s, 0, TAU);
      });
      xCl.fill();
      xCl.fillStyle = 'rgba(255, 170, 215, 0.30)';
      xCl.beginPath();
      xCl.ellipse(cl.x, cl.y + 22 * cl.s, 60 * cl.s, 12 * cl.s, 0, 0, TAU);
      xCl.fill();
    });
  }

  /* ── the day-cycle: sun arc + sky phases + tints, all from paint(t) ── */
  var el = function(id){ return document.getElementById(id); };
  var sun = el('sun'), skyM = el('sky-morning'), skyS = el('sky-sunset'),
      skyT = el('sky-twilight'), night = el('night'),
      tintW = el('tint-warm'), tintV = el('tint-violet'),
      rainbowWrap = el('rainbow-wrap');

  function clamp(v,a,b){ return v < a ? a : v > b ? b : v; }
  function ramp(t,a,b){ return clamp((t - a) / (b - a), 0, 1); }
  function mix(a,b,f){
    var A = parseInt(a.slice(1),16), B = parseInt(b.slice(1),16);
    var r = Math.round((A>>16)      + ((B>>16)      - (A>>16))      * f);
    var g = Math.round((A>>8&255)   + ((B>>8&255)   - (A>>8&255))   * f);
    var bl= Math.round((A&255)      + ((B&255)      - (A&255))      * f);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  function paint(t){
    var p = ramp(t, 0.02, 0.85);
    var arc = Math.sin(Math.PI * p);
    var warm = ramp(t, 0.55, 0.80);
    sun.style.left = (6 + 88 * p) + '%';
    sun.style.top  = (71 - 59 * arc) + '%';
    sun.style.opacity = (1 - ramp(t, 0.85, 0.90)).toFixed(3);
    sun.style.setProperty('--sc1', mix('#FFFDF2', '#FFEEDC', warm));
    sun.style.setProperty('--sc2', mix('#FFF3CE', '#FFC98F', warm));
    sun.style.setProperty('--sc3', mix('#FFE9B8', '#FF9E5E', warm));

    var morning = t < 0.5 ? 1 - ramp(t, 0.05, 0.20) : ramp(t, 0.92, 0.995);
    var sunset  = ramp(t, 0.55, 0.75) * (1 - ramp(t, 0.80, 0.92)) * 0.9;
    var twil    = ramp(t, 0.74, 0.88) * (1 - ramp(t, 0.93, 0.995));
    skyM.style.opacity = morning.toFixed(3);
    skyS.style.opacity = sunset.toFixed(3);
    skyT.style.opacity = twil.toFixed(3);
    night.style.opacity = (ramp(t, 0.78, 0.88) * (1 - ramp(t, 0.93, 0.99)) * 0.95).toFixed(3);
    rainbowWrap.style.opacity = (1 - twil * 0.85).toFixed(3);
    tintW.style.opacity = (sunset * 0.35).toFixed(3);
    tintV.style.opacity = (twil * 0.40).toFixed(3);
  }

  /* ── boot + loops ── */
  function resize(){
    W = innerWidth; H = innerHeight;
    HM = Math.min(H, W * 1.15);
    [cvFar, cvMain, cvClouds].forEach(function(cv){
      cv.width = W * DPR; cv.height = H * DPR;
      cv.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
    });
    paintFar();
    paintMain();
    initClouds();
  }
  resize();
  sceneOn(window, 'resize', resize);

  var wfStage = document.getElementById('wf-stage');
  var WF_AQUA = { hueMin: 185, hueMax: 210, saturation: [40, 70], lightness: [55, 80], margin: 4, poolY: 14 };
  var wfCleanup = window.WaterfallFX.init({ stage: wfStage, opts: WF_AQUA });

  var st = { t0: performance.now(), manual: null, t: 0 };
  var lastNow = performance.now();
  function tick(now){
    var dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
    st.t = st.manual != null ? st.manual : ((now - st.t0) % CYCLE) / CYCLE;
    paint(st.t);
    drawClouds(dt);
    drawDolphins(dt);          /* pond pod rides the same cleared canvas */
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.__meadow = {
    seek: function(f){ st.manual = clamp(f, 0, 1); paint(st.manual); },
    play: function(){ st.manual = null; st.t0 = performance.now(); },
    phase: function(){ return st.t; },
    castle: function(){ return !!document.querySelector('.cartoon .main-tower'); },
    waterfall: function(){ return !!document.querySelector('#wf-stage canvas'); },
    unicorns: function(){ return document.querySelectorAll('.uc-uni:not(.uc-fx-host)').length; },
  };

  /* ── UNICORNS — loaded DYNAMICALLY from unicorn.item.js (the rig is never
     copied here): they gallop ONTO the screen and off again (come-and-go, like
     the other backgrounds) — two ground runners + two winged sky flyers ── */
  function _ucSetup(){
    if (!window.Unicorn) return;
    var U = window.Unicorn;
    /* the CAST — a HERD of gallopers with the ODD walker (ratio 4 running : 1
       walking, per the request) + one winged sky flyer above. AT MOST 3 on
       stage at once; every entry passes the shared gate. IMPORTANT: `roam()`
       moves the actor across the screen via el.style.left, while the LEG cycle
       is the CSS `--speed` animation — the two are INDEPENDENT, so bumping
       speedPctPerSec speeds the TRAVEL without touching the leg cadence. */
    var MAX_ON_STAGE = 3;
    var roamers = [];
    function activeCount(){ return roamers.reduce(function(n, i){ return n + (i.active ? 1 : 0); }, 0); }
    var gate = function(){ return activeCount() < MAX_ON_STAGE; };

    /* actor sizes follow the screen's SHORT side (design reference 800px):
       desktop keeps full size; a 390px-wide phone gets ~half-size unicorns
       instead of horses as wide as the whole screen */
    var UC = Math.max(0.45, Math.min(1, Math.min(innerWidth, innerHeight) / 800));
    var SZ = function(px){ return Math.round(px * UC); };

    /* travel speeds — all +20% over the previous values, LEG CADENCE UNCHANGED:
       gallop 16→19.2, flight 14.4→17.28, walk ~4.1→4.9 %/sec */
    var RUN_MOVE = 19.2, FLY_MOVE = 17.28, WALK_MOVE = 4.9;

    // FOUR GALLOP RUNNERS — varied coats + sizes, brisk .9s leg cycle (unchanged)
    var runCoats = ['pink', 'sky', 'mint', 'night'];
    runCoats.forEach(function(coat, i){
      var r = U.place(ROOT, { size: SZ(84 - i * 6), color: coat, z: 4 });
      r.el.style.setProperty('--speed', '.9s');   // leg cadence — NOT sped up
      r.roam({ bandMinPct: 3, bandMaxPct: 13, speedPctPerSec: RUN_MOVE,
               waitMinSec: 2, waitMaxSec: 8, gate: gate });
      roamers.push(r);
    });

    // ONE winged SKY FLYER — soaring above (wing beat unchanged)
    var flyer = U.place(ROOT, { size: SZ(80), wings: true, gait: 'fly', color: 'sky', z: 3 });  // 🦋
    flyer.roam({ fly: true, bandMinPct: 8, bandMaxPct: 28, speedPctPerSec: FLY_MOVE,
                 waitMinSec: 3, waitMaxSec: 9, bobAmpPx: 12, gate: gate });
    roamers.push(flyer);

    // ONE WALKER (1 per 4 gallopers) — calm pearl coat, .9s stride (unchanged),
    // travel +20%. Rarer + longer off-stage waits so runners dominate the herd.
    var walker = U.place(ROOT, { size: SZ(84), gait: 'walk', color: 'pearl', z: 5 });
    walker.el.style.setProperty('--speed', '.9s');   // stride cadence — NOT sped up
    walker.roam({ bandMinPct: 4, bandMaxPct: 11, speedPctPerSec: WALK_MOVE,
                  waitMinSec: 6, waitMaxSec: 15, gate: gate });
    roamers.push(walker);
  }
  if (window.Unicorn) _ucSetup();
  else { var us = document.createElement('script'); us.src = BASE + 'unicorn.item.js'; us.onload = _ucSetup; document.head.appendChild(us); }

  /* ═══════════════ INTERACTIVE MAGIC — fireworks, butterflies, fish,
     blooms, rainbow waterfall, the fairy, falling stars, click routing ═══ */
  var rndf = function(a, b){ return a + Math.random() * (b - a); };

  /* ── fireworks (the castle.html rocket/burst, scene-level) ── */
  var FW_PAL = ['#ff77b9', '#ffd36e', '#b678ea', '#6fe6d8', '#ffffff', '#ff9d6e'];
  function fwBurst(x, y){
    var flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;width:110px;height:110px;border-radius:50%;'
      + 'margin:-55px 0 0 -55px;pointer-events:none;z-index:30;left:' + x + 'px;top:' + y + 'px;'
      + 'background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,210,240,.5) 40%,transparent 70%)';
    ROOT.appendChild(flash);
    flash.animate([{ opacity: .95, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(1.4)' }],
      { duration: 420, easing: 'ease-out' }).onfinish = function(){ flash.remove(); };
    var n = 26 + (Math.random() * 10 | 0);
    for (var i = 0; i < n; i++){
      var col = FW_PAL[Math.random() * FW_PAL.length | 0];
      var star = Math.random() < .2;
      var sp = document.createElement('div');
      sp.style.cssText = 'position:fixed;pointer-events:none;z-index:31;left:' + x + 'px;top:' + y + 'px;'
        + (star ? 'width:12px;height:12px;margin:-6px 0 0 -6px;background:' + col + ';'
                  + 'clip-path:polygon(50% 0%,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0% 50%,39% 39%);'
                  + 'filter:drop-shadow(0 0 4px ' + col + ')'
                : 'width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:' + col + ';box-shadow:0 0 6px ' + col);
      ROOT.appendChild(sp);
      var ang = (i / n) * Math.PI * 2 + Math.random() * .25, rr = 60 + Math.random() * 90;
      var dx = Math.cos(ang) * rr, dy = Math.sin(ang) * rr, fall = 40 + Math.random() * 55;
      sp.animate([
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: 'translate(' + dx * .85 + 'px,' + dy * .85 + 'px)', opacity: 1, offset: .55 },
        { transform: 'translate(' + dx + 'px,' + (dy + fall) + 'px)', opacity: 0 }
      ], { duration: 950 + Math.random() * 450, easing: 'cubic-bezier(.1,.65,.3,1)' }
      ).onfinish = (function(e2){ return function(){ e2.remove(); }; })(sp);
    }
  }
  function fwLaunch(x, y){
    var r = document.createElement('div');
    r.style.cssText = 'position:fixed;width:3px;height:18px;border-radius:2px;margin-left:-1.5px;'
      + 'pointer-events:none;z-index:31;left:' + x + 'px;top:' + innerHeight + 'px;'
      + 'background:linear-gradient(180deg,#fff,#ffd36e 60%,transparent);box-shadow:0 0 6px rgba(255,230,170,.9)';
    ROOT.appendChild(r);
    r.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (y - innerHeight) + 'px)' }],
      { duration: Math.min(700, 300 + (innerHeight - y) * .45), easing: 'cubic-bezier(.25,.6,.35,1)' }
    ).onfinish = function(){ r.remove(); fwBurst(x, y); };
  }

  /* ── butterflies: ambient meadow wanderers + castle-click bursts ── */
  var BF_COLS = ['#FF8FC8', '#C77DFF', '#FFD76E', '#7DC4FF', '#FF9D6E'];
  function spawnButterfly(o){
    o = o || {};
    var d = document.createElement('div');
    d.className = 'bf';
    d.style.setProperty('--bc', BF_COLS[Math.random() * BF_COLS.length | 0]);
    d.innerHTML = '<i class="l"></i><i class="r"></i><b></b>';
    ROOT.appendChild(d);
    var x = o.x != null ? o.x : Math.random() * innerWidth;
    var baseY = o.y != null ? o.y
              : innerHeight * (o.high ? rndf(.08, .30) : rndf(.76, .92));
    var vx = rndf(24, 46) * (Math.random() < .5 ? -1 : 1);
    if (o.burst) vx = rndf(34, 74) * (Math.random() < .5 ? -1 : 1);
    var rise = o.burst ? rndf(10, 24) : 0;                  // burst ones drift upward
    var vy = o.burst ? 0 : rndf(-9, 9);   // residents also WANDER vertically —
    var ph = rndf(0, 6.28), born = performance.now(), last = born;
    var life = o.burst ? rndf(6000, 9000) : Infinity;
    var nextTurn = born + rndf(7000, 15000);
    (function step(now){
      if (!d.isConnected) return;
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!o.burst && now > nextTurn){
        vx *= -1; vy = rndf(-9, 9);       // — fresh drift each turn, sky to grass
        nextTurn = now + rndf(7000, 15000);
      }
      x += vx * dt; baseY -= rise * dt;
      baseY = Math.min(innerHeight * .92, Math.max(innerHeight * .06, baseY + vy * dt));
      var y = baseY + Math.sin(now / 1400 + ph) * 34 + Math.sin(now / 520 + ph * 2) * 10;
      if (x < -30) x = innerWidth + 26;
      if (x > innerWidth + 30) x = -26;
      d.style.left = x + 'px'; d.style.top = y + 'px';
      if (now - born > life){
        d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 }).onfinish = function(){ d.remove(); };
        return;
      }
      requestAnimationFrame(step);
    })(born);
  }
  // resident five: three over the meadow grass, two up in the sky (user asked
  // for butterflies in the TOP of the screen too); all wander between bands
  for (var bi = 0; bi < 5; bi++) spawnButterfly({ high: bi >= 3 });

  /* ── the castle show: a real fireworks volley + a butterfly burst ── */
  var showUntil = 0;
  function castleShow(){
    var now = performance.now();
    if (now < showUntil) return;                            // one show at a time
    showUntil = now + 2600;
    for (var i = 0; i < 7; i++)(function(i){
      setTimeout(function(){
        fwLaunch(innerWidth * (0.72 + Math.random() * 0.26), innerHeight * (0.08 + Math.random() * 0.34));
      }, i * 260);
    })(i);
    for (var b = 0; b < 8; b++)(function(b){
      setTimeout(function(){
        spawnButterfly({ x: innerWidth * 0.855 + rndf(-70, 70), y: innerHeight * rndf(.48, .62), burst: true });
      }, 300 + b * 140);
    })(b);
  }

  /* ── the pond POD — the Dubai background's leaping bottlenose dolphins,
     fish-sized: a pod of 1-3 arcs out of the plunge pool with exit spray +
     re-entry splash, clipped at the water line; every so often and on pond
     click. Painted on the clouds canvas (z 6, cleared each tick) so they
     ride above the painted pool. Body/physics/splash are the Dubai code;
     only the geometry is pool-anchored + shrunk. ── */
  var DOLPHINS = [];
  function pondCenter(){ return { x: innerWidth * WF.x, y: innerHeight * WF.bottom }; }
  function fishJump(){                       /* name kept — pond click + fx hooks */
    if (DOLPHINS.length) return;
    var p = pondCenter(), rx = innerWidth * 0.075;      // the painted pool ellipse
    var mini = Math.max(.55, Math.min(1, rx / 90));     // small pool → smaller pod
    var pod = 1 + (Math.random() * 3 | 0);
    var dir = Math.random() < .5 ? -1 : 1;
    var x0 = p.x - dir * rx * rndf(.15, .45);           // start back, land in water
    for (var k = 0; k < pod; k++)
      DOLPHINS.push({ x0: x0 - dir * rndf(6, 14), yW: p.y + rndf(-2, 2), dir: dir,
                      delay: k * .42 + rndf(0, .12), age: 0, T: rndf(1.3, 1.7),
                      trav: rx * rndf(.55, .9), hgt: rndf(26, 40) * mini,
                      s: rndf(1.35, 1.75) * mini });    // body ≈ 26-33px — little-fish sized
  }
  /* bottlenose body in the Dubai/reef style: countershaded gradient, melon +
     rostrum, falcate dorsal, flukes, eye with a sparkle, the smile */
  function drawDolphinBody(g){
    g.fillStyle = '#4e6172';                                       /* flukes */
    g.beginPath();
    g.moveTo(-7.4, 0);
    g.quadraticCurveTo(-8.9, -1.8, -10.2, -2.3);
    g.quadraticCurveTo(-8.8, -.3, -8.7, 0);
    g.quadraticCurveTo(-8.8, .3, -10.2, 2.3);
    g.quadraticCurveTo(-8.9, 1.8, -7.4, 0);
    g.closePath(); g.fill();
    var bg = g.createLinearGradient(0, -2.7, 0, 2.4);   /* countershaded body */
    bg.addColorStop(0, '#56697a'); bg.addColorStop(.45, '#6b8092');
    bg.addColorStop(.7, '#9fb2c0'); bg.addColorStop(.85, '#e6eef4');
    bg.addColorStop(1, '#f2f7fa');
    g.fillStyle = bg;
    g.beginPath();
    g.moveTo(8.6, .1);                                  /* rostrum tip */
    g.quadraticCurveTo(7, -1, 5, -1.7);                 /* melon */
    g.quadraticCurveTo(1, -2.6, -3.3, -1.6);
    g.quadraticCurveTo(-6.5, -.7, -7.9, -.2);
    g.quadraticCurveTo(-6.9, .4, -3.3, 1.5);
    g.quadraticCurveTo(1.7, 2.5, 6.1, .9);
    g.quadraticCurveTo(7.8, .5, 8.6, .1);
    g.closePath(); g.fill();
    g.fillStyle = '#56697a';                            /* falcate dorsal fin */
    g.beginPath();
    g.moveTo(1.7, -2.1);
    g.quadraticCurveTo(.6, -4.4, -1, -4.1);
    g.quadraticCurveTo(-.9, -2.9, -1.9, -1.9);
    g.closePath(); g.fill();
    g.fillStyle = '#5c7186';                            /* pectoral flipper */
    g.beginPath(); g.ellipse(1.9, 1.2, .5, 1.4, .6, 0, 6.2832); g.fill();
    g.strokeStyle = 'rgba(35,48,60,.6)'; g.lineWidth = .22; g.lineCap = 'round';
    g.beginPath();                                      /* the famous smile */
    g.moveTo(8.4, .35); g.quadraticCurveTo(6.6, .95, 5.4, .75);
    g.stroke();
    g.fillStyle = '#101820';                            /* eye + sparkle + blowhole */
    g.beginPath(); g.arc(5.1, -.6, .3, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.arc(5.2, -.7, .11, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(30,42,52,.7)';
    g.beginPath(); g.ellipse(3.4, -2.05, .3, .15, -.2, 0, 6.2832); g.fill();
  }
  function dSplash(g, x, y, q, s){
    var grow = 1 - q;
    g.strokeStyle = 'rgba(220,240,255,' + (.38 * q) + ')';
    g.lineWidth = 1.2 * s;
    g.beginPath();
    g.ellipse(x, y, (4 + grow * 24) * s, (1.2 + grow * 5) * s, 0, 0, 6.2832); g.stroke();
    g.fillStyle = 'rgba(235,248,255,' + (.5 * q) + ')';
    for (var i = 0; i < 5; i++){
      var a = -Math.PI / 2 + (i - 2) * .4, L = (6 + grow * 10) * s;
      g.fillRect(x + Math.cos(a) * L, y + Math.sin(a) * L - 2 * s, 1.1 * s, 2.4 * s);
    }
  }
  function drawDolphins(dt){
    for (var k = DOLPHINS.length - 1; k >= 0; k--){
      var d = DOLPHINS[k];
      d.age += dt;
      var p = (d.age - d.delay) / d.T;
      if (p >= 1.1){ DOLPHINS.splice(k, 1); continue; }
      if (p <= 0) continue;
      var pc = Math.min(1, p), s = d.s;
      var xx = d.x0 + d.dir * pc * d.trav;
      var yy = d.yW - Math.sin(pc * Math.PI) * d.hgt;
      var vx = d.dir * d.trav / d.T;
      var vy = -Math.cos(pc * Math.PI) * Math.PI * d.hgt / d.T;
      if (p < 1){
        xCl.save();
        xCl.beginPath();                       /* above the water surface only */
        xCl.rect(xx - 14 * s, d.yW - d.hgt - 12 * s, 28 * s, d.hgt + 12 * s);
        xCl.clip();
        xCl.translate(xx, yy);
        xCl.scale(s, s);
        xCl.rotate(Math.atan2(vy, vx));
        if (d.dir < 0) xCl.scale(1, -1);       /* keep the back upward */
        drawDolphinBody(xCl);
        xCl.restore();
      }
      if (p < .22) dSplash(xCl, d.x0, d.yW, 1 - p / .22, s);                 /* exit spray */
      if (p > .78) dSplash(xCl, d.x0 + d.dir * d.trav, d.yW,
                           Math.max(0, 1 - (p - .78) / .32), s * 1.2);       /* re-entry */
    }
  }
  setInterval(function(){ if (Math.random() < 0.6) fishJump(); }, 11000);

  /* ── grass-click bloom: flowers grow at the click, then fade away ── */
  var BL_COLS = ['#ff7fb5', '#e85fd0', '#ffffff', '#b689ea', '#ffd166', '#ff9d6e'];
  function bloomAt(x, y){
    var n = 3 + (Math.random() * 3 | 0);
    for (var i = 0; i < n; i++)(function(i){
      setTimeout(function(){
        var f = document.createElement('div');
        f.className = 'bl';
        f.style.left = (x + rndf(-70, 70)) + 'px';
        f.style.top = Math.max(y + rndf(-16, 16), innerHeight * 0.76) + 'px';
        f.style.fontSize = rndf(13, 22) + 'px';
        var col = BL_COLS[Math.random() * BL_COLS.length | 0], head = '';
        for (var p2 = 0; p2 < 5; p2++)
          head += '<div class="bl-p" style="background:' + col + ';transform:rotate(' + (p2 * 72) + 'deg)"></div>';
        f.innerHTML = '<div class="bl-stem"></div><div class="bl-head">' + head + '<div class="bl-core"></div></div>';
        ROOT.appendChild(f);
        setTimeout(function(){
          f.classList.add('bl-out');
          setTimeout(function(){ f.remove(); }, 750);
        }, 4200 + Math.random() * 1200);
      }, i * 90);
    })(i);
  }

  /* ── rainbow click: the arc flares bright and star twinkles pop along the
     bands, riding the arc's real on-screen radius (center = 50% 100%) ── */
  var rbBusyUntil = 0;
  function rainbowShine(){
    var now = performance.now();
    if (now < rbBusyUntil) return;                          // one shine at a time
    rbBusyUntil = now + 2000;
    var wrap = document.getElementById('rainbow-wrap');
    wrap.classList.add('rb-shine');
    setTimeout(function(){ wrap.classList.remove('rb-shine'); }, 1900);
    var r = wrap.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.bottom, R = r.height;
    var COLS = ['#ffffff', '#ffd76e', '#ff9ecb', '#9ad4ff', '#b6f0c8'];
    for (var i = 0; i < 14; i++)(function(i){
      setTimeout(function(){
        var a = Math.PI * rndf(.14, .86);                   // a point along the arc
        var rr = R * rndf(.56, .90);                        // within the bands
        var s = document.createElement('div');
        s.className = 'rb-spark';
        s.style.left = (cx - Math.cos(a) * rr - 6) + 'px';
        s.style.top  = (cy - Math.sin(a) * rr - 6) + 'px';
        s.style.background = COLS[i % COLS.length];
        ROOT.appendChild(s);
        s.animate([
          { transform: 'scale(.25) rotate(0deg)',   opacity: 0 },
          { transform: 'scale(1.2) rotate(90deg)',  opacity: 1, offset: .35 },
          { transform: 'scale(.2) rotate(180deg) translateY(-12px)', opacity: 0 }
        ], { duration: rndf(700, 1100), easing: 'ease-out' }
        ).onfinish = function(){ s.remove(); };
      }, i * 75);
    })(i);
  }

  /* ── waterfall → rainbow water on click, back to aqua after a while ── */
  var wfRainbowUntil = 0;
  function rainbowFall(){
    var now = performance.now();
    if (now < wfRainbowUntil) return;
    wfRainbowUntil = now + 7000;
    wfCleanup();
    wfCleanup = window.WaterfallFX.init({ stage: wfStage,
      opts: { hueMin: 0, hueMax: 360, saturation: [75, 95], lightness: [55, 75], margin: 4, poolY: 14 } });
    setTimeout(function(){
      wfCleanup();
      wfCleanup = window.WaterfallFX.init({ stage: wfStage, opts: WF_AQUA });
    }, 7000);
  }

  /* ── the fairy (fairy.item.js, loaded dynamically): flutters across the
     screen on a wavy path every so often and drifts off the far edge.
     Clicking her fires LIGHTNING. ── */
  var fairyInst = null;
  function fairyLightning(){
    if (!fairyInst) return;
    var fr = fairyInst.el.getBoundingClientRect();     // a 0-size anchor point
    var cx = fr.left, cy = fr.top;
    var flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;width:130px;height:130px;border-radius:50%;'
      + 'margin:-65px 0 0 -65px;left:' + cx + 'px;top:' + cy + 'px;pointer-events:none;z-index:32;'
      + 'background:radial-gradient(circle,rgba(255,255,255,.95),rgba(190,220,255,.5) 40%,transparent 70%)';
    ROOT.appendChild(flash);
    flash.animate([{ opacity: 1, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(1.5)' }],
      { duration: 380, easing: 'ease-out' }).onfinish = function(){ flash.remove(); };
    var NS = 'http://www.w3.org/2000/svg';
    for (var b = 0; b < 5; b++){
      var ang = rndf(0, 360), len = rndf(70, 130);
      var wrap = document.createElement('div');
      wrap.className = 'ltg';
      wrap.style.cssText = 'position:fixed;left:' + cx + 'px;top:' + cy + 'px;width:0;height:0;'
        + 'pointer-events:none;z-index:33;transform:rotate(' + ang + 'deg)';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', len + 8); svg.setAttribute('height', 60);
      svg.style.cssText = 'position:absolute;left:0;top:-30px;overflow:visible';
      var d = 'M2,30', seg = 5;
      for (var i2 = 1; i2 <= seg; i2++)
        d += ' L' + (2 + (len / seg) * i2) + ',' + (30 + (Math.random() - 0.5) * 22);
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', b % 2 ? '#ffe9a8' : '#ffffff');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-linecap', 'round');
      path.style.filter = 'drop-shadow(0 0 5px #9ad4ff)';
      svg.appendChild(path); wrap.appendChild(svg);
      ROOT.appendChild(wrap);
      wrap.animate([
        { opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: .35, offset: .4 },
        { opacity: 1, offset: .6 }, { opacity: 0 }
      ], { duration: 480 + Math.random() * 200 }).onfinish = (function(w){ return function(){ w.remove(); }; })(wrap);
    }
  }
  function _fairySetup(){
    if (!window.Fairy) return;
    var fairy = window.Fairy.place(ROOT, { scale: .45, wander: false, z: 5, left: '-12%', top: '30%' });
    fairyInst = fairy;
    var fx = -12, fdir = 1, fy0 = 30, fspd = 4, active = false;
    var waitUntil = performance.now() + rndf(3000, 8000);
    var last = performance.now();
    (function fstep(now){
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (active){
        fx += fdir * fspd * dt;
        fairy.setPos(fx + '%', (fy0 + Math.sin(now / 700) * 6 + Math.sin(now / 2300) * 5) + '%');
        if ((fdir > 0 && fx > 112) || (fdir < 0 && fx < -12)){
          active = false; waitUntil = now + rndf(12000, 26000);
        }
      } else if (now >= waitUntil){
        fdir = Math.random() < .5 ? 1 : -1;
        fspd = rndf(3, 4.5); fy0 = rndf(12, 45);
        fx = fdir > 0 ? -12 : 112;
        active = true;
      }
      requestAnimationFrame(fstep);
    })(performance.now());
  }
  if (window.Fairy) _fairySetup();
  else { var fairyScript = document.createElement('script'); fairyScript.src = BASE + 'fairy.item.js'; fairyScript.onload = _fairySetup; document.head.appendChild(fairyScript); }

  /* ── the bunnies (bunny.item.js, loaded dynamically — never copied here):
     a PAIR is around at any moment — both seed on-screen and their off-stage
     rests are short, so as one hops out it soon hops back in. Clicking one
     startles it (a big spring + sparkles, inst.startle via the router). ── */
  function _bunnySetup(){
    if (!window.Bunny) return;
    /* the bands are capped at bottom 8%: the front grass dips to y≈.885H at
       x≈.62W (a higher band puts the bunny ON the pink mountains there), and
       the plunge pool spans bottom ~9-14% around x .12-.27W (a higher band
       reads as hopping ON the water) — at ≤8% the feet stay on grass, always
       in FRONT of the pond and the falls. */
    window.Bunny.place(ROOT, { size: 8, z: 4 })
      .roam({ bandMinPct: 3, bandMaxPct: 8, hopPct: 2.4, hopSec: 0.5,
              restMinSec: 0.15, restMaxSec: 0.6,
              waitMinSec: 1, waitMaxSec: 3, startOnScreen: true });
    window.Bunny.place(ROOT, { size: 6, z: 4 })
      .roam({ bandMinPct: 4.5, bandMaxPct: 8, hopPct: 2.0, hopSec: 0.5,
              restMinSec: 0.2, restMaxSec: 0.7,
              waitMinSec: 1, waitMaxSec: 3, startOnScreen: true });
  }
  if (window.Bunny) _bunnySetup();
  else { var bunnyScript = document.createElement('script'); bunnyScript.src = BASE + 'bunny.item.js'; bunnyScript.onload = _bunnySetup; document.head.appendChild(bunnyScript); }

  /* ── falling stars — only while the twilight sky is up ── */
  setInterval(function(){
    var twil = ramp(st.t, 0.76, 0.88) * (1 - ramp(st.t, 0.93, 0.995));
    if (twil < 0.35 || Math.random() < 0.25) return;
    var d = document.createElement('div');
    d.className = 'fallstar';
    d.innerHTML = '<i></i>';
    var ang = -(14 + Math.random() * 14);
    d.style.left = innerWidth * (0.15 + Math.random() * 0.7) + 'px';
    d.style.top = innerHeight * (0.04 + Math.random() * 0.28) + 'px';
    ROOT.appendChild(d);
    var dist = -(innerWidth * 0.22 + Math.random() * innerWidth * 0.15);
    d.animate([
      { transform: 'rotate(' + ang + 'deg) translateX(0)', opacity: 0 },
      { opacity: twil, offset: .15 },
      { transform: 'rotate(' + ang + 'deg) translateX(' + dist + 'px)', opacity: 0 }
    ], { duration: 1100 + Math.random() * 500, easing: 'ease-in' }).onfinish = function(){ d.remove(); };
  }, 3800);

  /* ── one click router for the whole scene (layers are pointer-events:none),
     in PRIORITY order: a unicorn beats everything under it (jump/rear on the
     ground, somersault in the air) · the fairy fires lightning · castle →
     fireworks show · waterfall → rainbow water · pond → fish · and flowers
     bloom ONLY on the FRONT grass band ── */
  function unicornAt(x, y){
    return [...document.querySelectorAll('.uc-uni')].find(function(u){
      var r = u.getBoundingClientRect();
      return r.width > 0 && r.right > 0 && r.left < innerWidth &&
             x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  }
  function uniReact(u){
    if (!u || !u._inst) return;
    // a FLYING unicorn does a 360° somersault (as the old background did),
    // with a horn-sparkle for sparkle; a ground unicorn gets the full
    // unicorn.html click magic (lightning + coat swap + hearts/rainbow/shower;
    // toot every 3-5).
    if (u.classList.contains('uc-fly') || u.classList.contains('uc-wings')) {
      u._inst.somersault(); u._inst.lightning();
    } else {
      u._inst.magic();
    }
  }
  sceneOn(document, 'pointerdown', function(e){
    if (e.target.closest && e.target.closest('.wrap')) return;   // the game card owns its own clicks
    var x = e.clientX, y = e.clientY;
    var u = unicornAt(x, y);
    if (u){ uniReact(u); return; }                       // the unicorn always wins
    // a bunny? → a startled spring + sparkles (generous pad — it's tiny)
    var bn = [].find.call(document.querySelectorAll('.bn-bunny'), function(b){
      var r = b.getBoundingClientRect();
      return r.width > 0 && x >= r.left - 8 && x <= r.right + 8 &&
             y >= r.top - 8 && y <= r.bottom + 8;
    });
    if (bn && bn._inst){ bn._inst.startle(); return; }
    if (fairyInst){
      var fr = fairyInst.el.getBoundingClientRect();
      if (Math.hypot(x - fr.left, y - fr.top) < 62){ fairyLightning(); return; }
    }
    var cart = document.querySelector('.cartoon');
    if (cart){
      var r = cart.getBoundingClientRect();
      if (x >= r.left + r.width * .28 && x <= r.right - r.width * .28 &&
          y >= r.top + r.height * .12 && y <= r.top + r.height * .88){ castleShow(); return; }
    }
    var wr = wfStage.getBoundingClientRect();
    if (x >= wr.left - 14 && x <= wr.right + 14 && y >= wr.top - 20 && y <= wr.bottom + 8){ rainbowFall(); return; }
    var rw = document.getElementById('rainbow-wrap').getBoundingClientRect();
    var rcx = rw.left + rw.width / 2, rcy = rw.bottom, rd = Math.hypot(x - rcx, y - rcy);
    if (y < rcy && rd >= rw.height * .5 && rd <= rw.height * .97){ rainbowShine(); return; }
    var p = pondCenter(), nx = (x - p.x) / (innerWidth * 0.075 * 1.4), ny = (y - p.y) / (innerHeight * 0.026 * 2.2);
    if (nx * nx + ny * ny <= 1){ fishJump(); return; }
    if (y > innerHeight * 0.85) bloomAt(x, y);           // the FRONT grass only
  });

  /* fx test hooks */
  window.__meadow.fx = {
    castleShow: castleShow, rainbowFall: rainbowFall, rainbowShine: rainbowShine,
    fishJump: fishJump, bloomAt: bloomAt,
    fairyLightning: fairyLightning, unicornAt: unicornAt, uniReact: uniReact,
    butterflies: function(){ return document.querySelectorAll('.bf').length; },
    fairyPresent: function(){ return !!document.querySelector('.fy-fairy'); },
    moon: function(){ return !!document.getElementById('moon'); }
  };


    return function cleanup() {
      STOP = true;
      _rafs.forEach(function (id) { window.cancelAnimationFrame(id); });
      _ivals.forEach(function (id) { window.clearInterval(id); });
      _touts.forEach(function (id) { window.clearTimeout(id); });
      _listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); });
      try { if (typeof wfCleanup === 'function') wfCleanup(); } catch (e) {}
      Array.prototype.forEach.call(document.querySelectorAll('.uc-uni, .bn-bunny'), function (u) {
        if (u._inst && u._inst.remove) u._inst.remove();   // stops their own rAF/timers too
      });
      ROOT.innerHTML = '';
      ROOT.classList.remove('uc-meadow');
      if (window.__ucFxRoot === ROOT) { try { delete window.__ucFxRoot; } catch (e) { window.__ucFxRoot = null; } }
      try { delete window.__meadow; } catch (e) { window.__meadow = null; }
    };
  }

  return { init: init };
})();
