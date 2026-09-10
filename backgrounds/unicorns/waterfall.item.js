/* ─────────────────────────────────────────────────────────────────────────
   WATERFALL FX — the original unicorn valley's particle waterfall (extracted
   verbatim from meadow.scene.js so any host scene can mount it without the
   whole meadow). A stream of translucent aqua streaks falls down its own
   canvas under a fading trail (destination-out + lighter compositing) and
   bursts into bubbles at the pool line.

   API — window.WaterfallFX
     init({ stage, opts }) -> cleanup   mounts a canvas into `stage` (sized to
                                        it, re-sized on window resize) and runs
                                        its own rAF loop until cleanup()
     create(ctx, getW, getH, opts) -> { step(), reset() }   drive it yourself
     opts : { gravity=.15, hueMin=200, hueMax=220, saturation=[30,60],
              lightness=[30,60], margin=10, poolY=20, ratePerPx=.06,
              band={cx, halfWidth} }
   The valley uses aqua { hueMin:185, hueMax:210, saturation:[40,70],
   lightness:[55,80], margin:4, poolY:14 } and, on a click, a RAINBOW water
   { hueMin:0, hueMax:360, saturation:[75,95], lightness:[55,75] } for 7 s.
   Zero dependencies. (meadow.scene.js, which it came from, has since been
   deleted — this file is the only copy.)
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
