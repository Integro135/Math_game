/* =====================================================================
   meteor.js  —  reusable canvas METEOR SHOWER overlay
   ---------------------------------------------------------------------
   A self-contained port of the CodePen "meteor" canvas effect
   (backgrounds/dinasours/meteor.html): glowing meteors streak down from the
   sky, shatter into a burst of rocks + light flares when they hit the ground.
   Faithful to the original — same Meteor / Rock / Ground / LightFlare math and
   the two-canvas glow (a blurred "buffer" under SCREEN blend + the bodies under
   MULTIPLY) — but packaged as a START/STOP overlay so a scene can trigger it.

   Because the effect is designed for a dark sky, START drops a translucent
   "meteor-night" panel over the host (it dims the scene; the game UI, which
   sits above the scene layer, is untouched), runs for `duration`, then fades out.

       <script src="path/to/meteor.js"></script>
       const m = MeteorShower.start(containerEl, { duration: 14000 });
       // -> returns { stop() }

   Pure canvas + DOM. No dependencies. Works on file://.
   ===================================================================== */
(function (global) {
  'use strict';
  var RAF = global.requestAnimationFrame ? global.requestAnimationFrame.bind(global)
          : function (f) { return setTimeout(f, 16); };
  var CAF = global.cancelAnimationFrame ? global.cancelAnimationFrame.bind(global)
          : clearTimeout;

  function LightFlare(ctx, x, y, range) {
    range = range || 100;
    var strength = Math.random() * range + range;
    var light = ctx.createRadialGradient(x, y, 0, x, y, strength);
    light.addColorStop(0, 'rgba(250,200,50,0.4)');
    light.addColorStop(0.1, 'rgba(250,200,50,0.3)');
    light.addColorStop(0.4, 'rgba(250,200,50,0.2)');
    light.addColorStop(0.65, 'rgba(250,200,50,0.1)');
    light.addColorStop(0.8, 'rgba(250,200,50,0.05)');
    light.addColorStop(1, 'rgba(250,200,50,0)');
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.fillStyle = light;
    ctx.arc(x, y, strength, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  function Meteor(M) {
    this.main = M; this.ctx = M.ctx; this.vfx = M.vfx;
    this.position = { x: Math.random() * M.width + M.width * 0.25, y: Math.random() * -M.height * 0.25 };
    this.rotation = Math.random() * 2 * Math.PI;
    this.velocity = { phi: Math.random() * 0.4 - 0.2 + Math.PI * 0.75, length: Math.random() * 5 + 1, rotate: Math.random() * 0.1 - 0.05 };
    this.gravity = { phi: Math.PI * 0.5, length: 0.98 };
    this.edge = ~~(Math.random() * this.velocity.length + this.velocity.length * 2 + 2);
    this.color = ['#300', '#610', '#fd2', '#f62'];
    this.timescale = 0.5;
    this.ground = M.height - M.ground.height * 0.8;
    this.accelerate = { phi: { change: Math.random() * 0.015 - 0.0075, min: Math.PI * 0.6, max: Math.PI * 0.9 }, friction: 1.005 };
    this.points = [];
    for (var i = 0; i < this.edge; i++) {
      this.points.push({ phi: i / this.edge * 2 * Math.PI + Math.random() * 0.4 - 0.2,
        length: Math.random() * this.velocity.length * 2 + this.velocity.length * 4 });
    }
    this.update = function (i) {
      this.rotation += this.velocity.rotate * this.timescale;
      this.position.x += Math.cos(this.velocity.phi) * this.velocity.length * this.timescale;
      this.position.y += Math.sin(this.velocity.phi) * this.velocity.length * this.timescale;
      this.position.x += Math.cos(this.gravity.phi) * this.gravity.length * this.timescale;
      this.position.y += Math.sin(this.gravity.phi) * this.gravity.length * this.timescale;
      this.velocity.phi += this.accelerate.phi.change * this.timescale;
      if (this.velocity.phi > this.accelerate.phi.max || this.velocity.phi < this.accelerate.phi.min)
        this.accelerate.phi.change = -this.accelerate.phi.change;
      this.velocity.length *= this.accelerate.friction;
      if (this.position.y > this.ground) {
        var range = this.edge, position = this.position, vfx = this.vfx, main = this.main;
        for (var k = 0; k < this.edge; k++) {
          main.makeRock({ position: { x: position.x, y: position.y }, base: range });
          LightFlare(vfx, position.x + Math.random() * 10 * range - 5 * range,
            position.y + Math.random() * 6 * range - 3 * range, range * Math.random() * 30 + 30);
        }
        main.meteors.splice(i, 1);
        if (!main.draining) main.makeMeteor();
      }
    };
    this.render = function () {
      var ctx = this.ctx, self = this;
      ctx.strokeStyle = this.color[0]; ctx.fillStyle = this.color[1];
      ctx.moveTo(this.position.x, this.position.y); ctx.beginPath();
      this.points.forEach(function (p) {
        ctx.lineTo(Math.cos(p.phi + self.rotation) * p.length + self.position.x,
          Math.sin(p.phi + self.rotation) * p.length + self.position.y);
      });
      ctx.closePath(); ctx.stroke(); ctx.fill();
      var vfx = this.vfx;
      vfx.globalAlpha = Math.random();
      vfx.fillStyle = this.color[2 + ~~(Math.random() + 0.6)];
      vfx.moveTo(this.position.x, this.position.y); vfx.beginPath();
      this.points.forEach(function (p) {
        vfx.lineTo(Math.cos(p.phi + self.rotation * Math.random() * 0.2 - 0.1) * p.length + Math.random() + self.position.x,
          Math.sin(p.phi + self.rotation * Math.random() * 0.2 - 0.1) * p.length + Math.random() + self.position.y);
      });
      vfx.closePath(); vfx.fill();
    };
  }

  function Rock(M, opts) {
    this.main = M; this.ctx = M.ctx; this.vfx = M.vfx;
    this.base = opts.base || 2;
    this.position = { x: opts.position.x, y: opts.position.y };
    this.rotation = Math.random() * 2 * Math.PI;
    this.velocity = { phi: Math.random() * Math.PI * 0.5 + Math.PI * 1.25, length: Math.random() * 1.5 * this.base + 15, rotate: Math.random() * 0.2 - 0.1 };
    this.gravity = { phi: Math.PI * 0.5, length: 5 };
    this.edge = ~~(Math.random() * this.velocity.length + this.velocity.length * 2 + 5);
    this.color = ['#300', '#510', '#fd2', '#f62'];
    this.timescale = 1.5;
    this.lifespan = ~~(Math.random() * 30 + 10);
    this.friction = 0.94;
    this.points = [];
    for (var i = 0; i < this.edge; i++) {
      this.points.push({ phi: i / this.edge * 2 * Math.PI + Math.random() * 0.4 - 0.2,
        length: Math.random() * this.velocity.length * 0.1 + this.velocity.length * 0.2 });
    }
    this.update = function (i) {
      if (this.lifespan-- <= 0) { this.main.meteors.splice(i, 1); return; }
      this.rotation += this.velocity.rotate * this.timescale;
      this.position.x += Math.cos(this.velocity.phi) * this.velocity.length * this.timescale;
      this.position.y += Math.sin(this.velocity.phi) * this.velocity.length * this.timescale;
      this.position.x += Math.cos(this.gravity.phi) * this.gravity.length * this.timescale;
      this.position.y += Math.sin(this.gravity.phi) * this.gravity.length * this.timescale;
      this.velocity.length *= this.friction;
    };
    this.render = function () {
      var ctx = this.ctx, self = this;
      ctx.globalAlpha = Math.random();
      ctx.strokeStyle = this.color[0]; ctx.fillStyle = this.color[1];
      ctx.moveTo(this.position.x, this.position.y); ctx.beginPath();
      this.points.forEach(function (p) {
        ctx.lineTo(Math.cos(p.phi + self.rotation) * p.length + self.position.x,
          Math.sin(p.phi + self.rotation) * p.length + self.position.y);
      });
      ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.globalAlpha = 1;
      var vfx = this.vfx;
      vfx.globalAlpha = Math.random();
      vfx.fillStyle = this.color[2 + ~~(Math.random() + 0.6)];
      vfx.moveTo(this.position.x, this.position.y); vfx.beginPath();
      this.points.forEach(function (p) {
        vfx.lineTo(Math.cos(p.phi + self.rotation * Math.random() * 0.2 - 0.1) * p.length + Math.random() + self.position.x,
          Math.sin(p.phi + self.rotation * Math.random() * 0.2 - 0.1) * p.length + Math.random() + self.position.y);
      });
      vfx.closePath(); vfx.fill();
    };
  }

  function Ground(M) {
    this.main = M; this.ctx = M.ctx;
    this.edge = ~~(Math.random() * 10 + 40);
    this.color = ['#222', '#1e004e'];
    this.height = M.height * 0.16;
    this.points = [];
    for (var i = 0; i < this.edge; i++) {
      var rand = 1 / this.edge * M.width;
      this.points.push({ x: i / this.edge * M.width + Math.random() * rand - rand * 0.5,
        y: M.height - this.height + Math.random() * this.height * 0.1 });
    }
    this.update = function () {};
    this.render = function () {
      var ctx = this.ctx, M2 = this.main, self = this;
      ctx.strokeStyle = this.color[0]; ctx.fillStyle = this.color[1];
      ctx.beginPath();
      ctx.moveTo(-this.height, M2.height);
      this.points.forEach(function (p) { ctx.lineTo(p.x, p.y); });
      ctx.lineTo(M2.width + this.height, M2.height);
      ctx.closePath(); ctx.stroke(); ctx.fill();
    };
  }

  function start(container, opts) {
    opts = opts || {};
    if (!container || typeof document === 'undefined') return { stop: function () {} };
    var cs = global.getComputedStyle ? getComputedStyle(container) : null;
    if (cs && cs.position === 'static') container.style.position = 'relative';

    var wrap = document.createElement('div');
    wrap.className = 'meteor-shower';
    // DARK "meteor-night" overlay — the meteors need a BLACK sky to read (the
    // multiply/screen glow is tuned for it). The dinosaurs have already fled, so
    // it fades the scene to night, runs the shower, then fades back.
    wrap.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;' +
      'pointer-events:none;z-index:40;opacity:0;transition:opacity .8s ease;' +
      'background:linear-gradient(to bottom,#000000,#1e004e);';
    var buffer = document.createElement('canvas');
    var canvas = document.createElement('canvas');
    buffer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;' +
      'filter:blur(6px) brightness(10) contrast(1.25);mix-blend-mode:screen;';
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;mix-blend-mode:multiply;';
    wrap.appendChild(buffer); wrap.appendChild(canvas);
    container.appendChild(wrap);
    RAF(function () { wrap.style.opacity = '1'; });   // fade the night in

    var M = {
      ctx: canvas.getContext('2d'), vfx: buffer.getContext('2d'),
      meteors: [], count: 8, width: 0, height: 0, ground: null, draining: false, stopped: false,
      makeMeteor: function () { this.meteors.push(new Meteor(this)); },
      makeRock: function (o) { this.meteors.push(new Rock(this, o)); }
    };
    M.vfx.globalCompositeOperation = 'screen';

    function resize() {
      var w = container.clientWidth || global.innerWidth || 800;
      var h = container.clientHeight || global.innerHeight || 600;
      M.width = w * 1.5; M.height = h * 1.5;
      canvas.width = M.width; canvas.height = M.height;
      buffer.width = M.width; buffer.height = M.height;
    }
    resize();
    M.ground = new Ground(M);
    for (var i = 0; i < M.count; i++) M.makeMeteor();
    var onResize = function () { resize(); M.ground = new Ground(M); };
    global.addEventListener('resize', onResize);

    var rafId = null;
    (function loop() {
      if (M.stopped) return;
      for (var i = M.meteors.length - 1; i >= 0; i--) M.meteors[i].update(i);
      M.ground.update();
      M.ctx.clearRect(0, 0, M.width, M.height);
      M.meteors.forEach(function (m) { m.render(); });
      M.ground.render();
      M.vfx.fillStyle = '#000000';
      M.vfx.globalAlpha = Math.random() * 0.12;          // glow-trail fade (screen blend, on the black sky)
      M.vfx.fillRect(0, 0, M.width, M.height);
      rafId = RAF(loop);
    })();

    var ended = false, removeTimer = null;
    function stop() {
      if (ended) return; ended = true;
      M.draining = true;                 // stop spawning; let in-flight meteors finish
      wrap.style.opacity = '0';
      removeTimer = setTimeout(function () {
        M.stopped = true;
        if (rafId) CAF(rafId);
        global.removeEventListener('resize', onResize);
        if (wrap.parentNode) wrap.remove();
      }, 850);
    }
    var stopTimer = setTimeout(stop, opts.duration || 14000);
    return { stop: function () { clearTimeout(stopTimer); stop(); } };
  }

  global.MeteorShower = { start: start };
})(typeof window !== 'undefined' ? window : this);
