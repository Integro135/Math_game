/* ─────────────────────────────────────────────────────────────────────────
   BUNNY — a standalone, pure-CSS rabbit extracted from
   backgrounds/unicorns/bunny.html (a CodePen Pug+SASS dump, compiled here to
   plain CSS: drop-form border-radius mixin expanded, lighten/darken resolved,
   everything namespaced bn-* so it can't collide with a host scene).
   The rabbit faces LEFT natively (head left, tail right), sized in em — one
   font-size scales the whole rabbit. The ears wiggle on the source keyframes.

   The WALK-HOP movement is implemented here (the dump had none): the bunny
   travels in little parabolic hops — crouch, spring, arc through the air with
   legs stretched, land with a squash, pause, hop again — under a soft ground
   shadow that shrinks while airborne.

   API — window.Bunny.place(parent, opts) -> inst
     opts : { left, bottom              — CSS lengths / % strings
              size  = 16                — px per em (rabbit is ~4em × 5.6em,
                                          ears reach ~5.7em above the body)
              flip  = false             — mirror (true = face RIGHT)
              z }                       — z-index
     inst : { el, remove(), setFlip(f), setPaused(p), setPos(left, bottom),
              hop(opts)                 — one hop in place (or {dxPct})
              roam({bandMinPct,bandMaxPct,hopPct,hopSec,restMinSec,restMaxSec,
                    waitMinSec,waitMaxSec,startOnScreen,gate}) }
   roam() is the shared come-and-go: enter from an off-screen edge, hop across
   the band, exit fully, wait off-stage, re-enter from a random edge at a fresh
   height — facing the travel direction; `gate` lets a host cap its population.
   Zero dependencies; injects its <style> once (id 'bunny-item-style').
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var STYLE_ID = 'bunny-item-style';
  var FACES_LEFT = true;                 // the rig faces LEFT (flip to face right)

  /* the compiled rig — source geometry verbatim; drop-form(bl,br) =
     border-radius:50%/bl br (100-br) (100-bl); colors resolved:
     base #D2DAEE · light #E1E6F4 · dark #C7D1EA · white #F4F4F4 ·
     nose #F97996 · eyes #3D261C · ears #F3E3DE */
  var BASE_CSS = [
    '.bn-bunny{position:absolute;width:4em;height:5.6em;pointer-events:none;',
    '  --bn-base:#D2DAEE;--bn-light:#E1E6F4;--bn-dark:#C7D1EA}',
    /* click-coat variants — the startle spring swaps to the next one mid-air */
    '.bn-bunny.bn-c-pink{--bn-base:#F6C3DD;--bn-light:#FADCEB;--bn-dark:#EFA9CD}',
    '.bn-bunny.bn-c-mint{--bn-base:#BFE8D2;--bn-light:#DBF4E6;--bn-dark:#A6DCC0}',
    '.bn-bunny.bn-c-sky{--bn-base:#BFDCF6;--bn-light:#DCEDFB;--bn-dark:#A5CBEF}',
    '.bn-bunny.bn-c-honey{--bn-base:#F3DDB4;--bn-light:#F9ECD3;--bn-dark:#EACB93}',
    '.bn-move{position:absolute;inset:0}',
    '.bn-rabbit{position:relative;width:100%;height:100%}',
    /* body (in flow — defines the root box) */
    '.bn-body{width:4em;height:5.6em;background:#F4F4F4;',
    '  border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;transform:rotate(-40deg);',
    '  box-shadow:inset -2.3em -2.7em 0 0 var(--bn-base)}',
    /* head + nose + eye */
    '.bn-head{position:absolute;width:4em;height:4.6em;top:-2.5em;left:-2em;',
    '  background:var(--bn-light);border-radius:50% 50% 50% 50% / 65% 60% 40% 35%;',
    '  transform:rotate(-120deg);overflow:hidden}',
    '.bn-head:before{content:"";position:absolute;width:.65em;height:.5em;top:-.1em;left:1.8em;',
    '  background:#F97996;border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;transform:rotate(130deg)}',
    '.bn-head:after{content:"";position:absolute;width:1em;height:1em;top:1.5em;left:1.6em;',
    '  background:#F4F4F4;border-radius:50%;box-shadow:inset .1em .15em 0 .37em #3D261C}',
    /* ears (source wiggle keyframes) */
    '.bn-ear{position:absolute;border-radius:50% 50% 50% 50% / 40% 40% 60% 60%;transform-origin:50% 100%}',
    '.bn-ear--left{width:2.2em;height:4.7em;top:-5.7em;left:-.2em;background:#F3E3DE;',
    '  transform:rotate(40deg);box-shadow:inset .3em -.4em 0 -.1em var(--bn-dark);',
    '  animation:bn-ear-left 5s infinite ease-out}',
    '.bn-ear--right{width:2em;height:4.7em;top:-5.5em;left:-.7em;background:var(--bn-base);',
    '  transform:rotate(10deg);animation:bn-ear-right 5s infinite ease-out}',
    /* legs — one/three = slim front pair, two/four = big haunches; a .12s',
       transition lets the air/ground poses blend */
    '.bn-leg{position:absolute;transition:transform .12s ease}',
    '.bn-leg--one{width:.8em;height:3em;top:2.3em;left:.2em;background:var(--bn-dark);',
    '  border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;transform-origin:50% 0%;transform:rotate(15deg)}',
    '.bn-leg--one:before{content:"";position:absolute;width:.8em;height:.5em;top:2.6em;left:-.2em;',
    '  background:var(--bn-dark);border-radius:50% 50% 50% 50% / 70% 70% 30% 30%;transform:rotate(-10deg)}',
    '.bn-leg--three{width:.9em;height:3em;top:2.4em;left:.7em;background:var(--bn-light);',
    '  border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;transform-origin:50% 0%;transform:rotate(10deg)}',
    '.bn-leg--three:before{content:"";position:absolute;width:.8em;height:.5em;top:2.6em;left:-.2em;',
    '  background:var(--bn-light);border-radius:50% 50% 50% 50% / 70% 70% 30% 30%;transform:rotate(-10deg)}',
    '.bn-leg--two{width:2.6em;height:3.6em;top:1.7em;left:1.6em;background:var(--bn-dark);',
    '  border-radius:50%;transform-origin:50% 0%;transform:rotate(10deg)}',
    '.bn-leg--two:before{content:"";position:absolute;width:1.6em;height:.8em;top:3.05em;left:0;',
    '  background:var(--bn-dark);border-radius:50% 50% 50% 50% / 70% 70% 30% 30%;transform:rotate(-10deg)}',
    '.bn-leg--four{width:2.6em;height:3.6em;top:1.8em;left:2.1em;background:var(--bn-light);',
    '  border-radius:50%;transform-origin:50% 0%;transform:rotate(10deg)}',
    '.bn-leg--four:before{content:"";position:absolute;width:1.6em;height:.8em;top:3.05em;left:0;',
    '  background:var(--bn-light);border-radius:50% 50% 50% 50% / 70% 70% 30% 30%;transform:rotate(-10deg)}',
    /* tail — three overlapping puffs */
    '.bn-tail{position:absolute;width:.9em;height:.9em;top:3.7em;left:4em;background:var(--bn-base);',
    '  transform:rotate(25deg);border-radius:50%}',
    '.bn-tail:before,.bn-tail:after{content:"";position:absolute;width:100%;height:100%;',
    '  background:var(--bn-base);border-radius:50%}',
    '.bn-tail:before{top:0;left:-50%}',
    '.bn-tail:after{top:50%;left:0}',
    /* ── the HOP poses (movement layer, not in the dump) ──
       airborne: front paws reach forward (toward the head, i.e. negative
       rotation), haunches kick back-and-out; grounded: the tucked source pose */
    '.bn-bunny.bn-air .bn-leg--one{transform:rotate(-32deg)}',
    '.bn-bunny.bn-air .bn-leg--three{transform:rotate(-24deg)}',
    '.bn-bunny.bn-air .bn-leg--two{transform:rotate(38deg)}',
    '.bn-bunny.bn-air .bn-leg--four{transform:rotate(30deg)}',
    /* landing squash — one quick pulse re-triggered per landing */
    '.bn-bunny .bn-rabbit{transform-origin:50% 100%}',
    '.bn-bunny.bn-land .bn-rabbit{animation:bn-squash .16s ease-out}',
    /* the ground shadow — the driver squeezes it while airborne */
    '.bn-shadow{position:absolute;left:-24%;bottom:-.28em;width:150%;height:.62em;',
    '  border-radius:50%;background:radial-gradient(ellipse at center,rgba(90,60,90,.30),transparent 70%);',
    '  transform-origin:50% 50%}',
    '.bn-bunny.bn-paused *{animation-play-state:paused!important}',
    '@keyframes bn-ear-left{0%,20%,100%{transform:rotate(40deg)}10%,30%,80%{transform:rotate(45deg)}90%{transform:rotate(50deg)}}',
    '@keyframes bn-ear-right{0%,20%,100%{transform:rotate(10deg)}10%,30%,80%{transform:rotate(5deg)}90%{transform:rotate(0deg)}}',
    '@keyframes bn-squash{0%{transform:scaleY(.88) scaleX(1.08)}100%{transform:scaleY(1) scaleX(1)}}',
  ].join('\n');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = BASE_CSS;
    document.head.appendChild(st);
  }

  /* DOM order = the dump's paint order (back legs → tail → body → front legs
     → right ear → head → left ear), inside the hop-transform wrapper */
  var MARKUP =
    '<div class="bn-move"><div class="bn-rabbit">' +
      '<div class="bn-leg bn-leg--one"></div>' +
      '<div class="bn-leg bn-leg--two"></div>' +
      '<div class="bn-tail"></div>' +
      '<div class="bn-body"></div>' +
      '<div class="bn-leg bn-leg--three"></div>' +
      '<div class="bn-leg bn-leg--four"></div>' +
      '<div class="bn-ear bn-ear--right"></div>' +
      '<div class="bn-head"></div>' +
      '<div class="bn-ear bn-ear--left"></div>' +
    '</div></div><div class="bn-shadow"></div>';

  function place(parent, opts) {
    opts = opts || {};
    injectStyle();
    var el = document.createElement('div');
    el.className = 'bn-bunny';
    el.innerHTML = MARKUP;
    el.style.fontSize = (opts.size || 16) + 'px';
    if (opts.left   != null) el.style.left   = opts.left;
    if (opts.bottom != null) el.style.bottom = opts.bottom;
    if (opts.z      != null) el.style.zIndex = opts.z;
    (parent || document.body).appendChild(el);

    var move = el.querySelector('.bn-move');
    var shadow = el.querySelector('.bn-shadow');
    var rnd = function (a, b) { return a + Math.random() * (b - a); };

    var inst = {
      el: el,
      _dead: false, _raf: 0, _flip: false, _hopping: false,
      remove: function () {
        inst._dead = true;
        if (inst._raf) cancelAnimationFrame(inst._raf);
        if (el.parentNode) el.parentNode.removeChild(el);
      },
      setFlip: function (f) {
        inst._flip = !!f;
        el.style.transform = f ? 'scaleX(-1)' : '';
      },
      setCoat: function (c) {
        ['pink', 'mint', 'sky', 'honey'].forEach(function (k) {
          el.classList.toggle('bn-c-' + k, k === c);
        });
        inst._coat = c;
      },
      setPaused: function (p) { el.classList.toggle('bn-paused', !!p); },
      setPos: function (left, bottom) {
        if (left   != null) el.style.left   = left;
        if (bottom != null) el.style.bottom = bottom;
      },

      /* ── one hop: crouch-spring parabola with pitch, air pose, landing
         squash and a breathing shadow. o.dxPct moves the anchor that far
         (viewport %) over the hop; onDone fires back on the ground. ── */
      hop: function (o, onDone) {
        o = o || {};
        if (inst._dead) { if (onDone) onDone(); return inst; }
        if (inst._hopping) {
          if (!o.force) { if (onDone) onDone(); return inst; }
          cancelAnimationFrame(inst._raf);          // preempt the current hop…
          var pd = inst._hopDone; inst._hopDone = null;
          if (pd) pd();                             // …and let its driver resume
        }
        inst._hopping = true;
        inst._hopDone = onDone || null;
        var dxPct = o.dxPct || 0;
        var dur = (o.sec || 0.55) * 1000;
        var hopH = el.getBoundingClientRect().height * (o.heightFrac || 0.55) || 40;
        var x0 = parseFloat(el.style.left) || 0;
        var t0 = performance.now();
        el.classList.add('bn-air');
        (function frame(now) {
          if (inst._dead) return;
          var t = Math.min(1, (now - t0) / dur);
          var arc = 4 * t * (1 - t);                        // 0→1→0 parabola
          var pitch = (1 - 2 * t) * 14;                     // nose up, then down
          move.style.transform = 'translateY(' + (-hopH * arc) + 'px) rotate(' + (-pitch) + 'deg)';
          shadow.style.transform = 'scale(' + (1 - arc * 0.45) + ')';
          shadow.style.opacity = String(1 - arc * 0.5);
          if (dxPct) el.style.left = (x0 + dxPct * t) + '%';
          if (t < 1) { inst._raf = requestAnimationFrame(frame); return; }
          move.style.transform = '';
          shadow.style.transform = ''; shadow.style.opacity = '';
          el.classList.remove('bn-air');
          el.classList.remove('bn-land'); void el.offsetWidth; el.classList.add('bn-land');
          inst._hopping = false;
          var fin = inst._hopDone; inst._hopDone = null;
          if (fin) fin();
        })(t0);
        return inst;
      },

      /* ── click reaction: a BIG startled spring (about twice the bunny's
         height), an 8-star sparkle burst, and a FUR-COLOR swap at the apex —
         lavender → pink → mint → sky → honey → lavender. force:true preempts
         any roam hop so the click always visibly reacts. ── */
      startle: function () {
        var r = el.getBoundingClientRect();
        var host = el.parentNode || document.body;
        for (var i = 0; i < 8; i++) {
          var c = ['#FFD76E', '#FF9ECB', '#9AD4FF', '#FFFFFF'][i % 4];
          var s = document.createElement('div');
          var sz = 7 + Math.random() * 4;
          s.style.cssText = 'position:fixed;width:' + sz + 'px;height:' + sz + 'px;pointer-events:none;'
            + 'z-index:' + ((parseInt(el.style.zIndex, 10) || 4) + 1) + ';'
            + 'left:' + (r.left + r.width * (0.05 + Math.random() * 0.9)) + 'px;'
            + 'top:' + (r.top + r.height * (0 + Math.random() * 0.6)) + 'px;'
            + 'background:' + c + ';'
            + 'clip-path:polygon(50% 0%,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0% 50%,39% 39%);'
            + 'filter:drop-shadow(0 0 3px ' + c + ')';
          host.appendChild(s);
          (function (sp) {
            sp.animate([
              { transform: 'translate(0,0) scale(.4)', opacity: 1 },
              { transform: 'translate(' + ((Math.random() - .5) * 64) + 'px,'
                          + (-(20 + Math.random() * 36)) + 'px) scale(1.1) rotate(150deg)', opacity: 0 }
            ], { duration: 600 + Math.random() * 250, easing: 'ease-out' }
            ).onfinish = function () { sp.remove(); };
          })(s);
        }
        var COATS = [undefined, 'pink', 'mint', 'sky', 'honey'];
        var next = COATS[(COATS.indexOf(inst._coat) + 1) % COATS.length];
        setTimeout(function () { if (!inst._dead) inst.setCoat(next); }, 300);  // swap at the apex
        return inst.hop({ sec: 0.75, heightFrac: 2.3, force: true });
      },

      /* ── come-and-go hop travel (the shared roam of the other actors):
         hop in from an off-screen edge, bounce across, hop out, rest, return ── */
      roam: function (o) {
        o = o || {};
        var bandMin = o.bandMinPct != null ? o.bandMinPct : 3;
        var bandMax = o.bandMaxPct != null ? o.bandMaxPct : 14;
        var hopPct  = o.hopPct  != null ? o.hopPct  : 3.2;   // ground covered per hop
        var hopSec  = o.hopSec  != null ? o.hopSec  : 0.55;
        var restMin = o.restMinSec != null ? o.restMinSec : 0.15;
        var restMax = o.restMaxSec != null ? o.restMaxSec : 0.7;
        var waitMin = o.waitMinSec != null ? o.waitMinSec : 3;
        var waitMax = o.waitMaxSec != null ? o.waitMaxSec : 10;
        var dir, pct, exitPad;

        function widthPct() {
          return (el.getBoundingClientRect().width / window.innerWidth) * 100 + 3;
        }
        function newTrip(seedVisible) {
          dir = Math.random() < 0.5 ? 1 : -1;
          exitPad = widthPct();
          el.style.bottom = rnd(bandMin, bandMax) + '%';
          pct = seedVisible ? rnd(15, 85) : (dir > 0 ? -exitPad : 100 + exitPad);
          el.style.left = pct + '%';
          inst.setFlip(FACES_LEFT ? dir > 0 : dir < 0);      // face the travel direction
          inst.active = true;
          hopLoop();
        }
        function rest(ms, then) {
          var id = setTimeout(then, ms);
          inst._restT = id;
        }
        function hopLoop() {
          if (inst._dead) return;
          inst.hop({ dxPct: dir * hopPct * rnd(0.85, 1.15), sec: hopSec * rnd(0.9, 1.1) }, function () {
            if (inst._dead) return;
            pct = parseFloat(el.style.left) || 0;
            if ((dir > 0 && pct > 100 + exitPad) || (dir < 0 && pct < -exitPad)) {
              inst.active = false;                           // fully off-stage → long rest
              (function reenter() {
                rest(rnd(waitMin, waitMax) * 1000, function () {
                  if (inst._dead) return;
                  if (o.gate && !o.gate()) { reenter(); return; }   // host is full — retry
                  newTrip(false);
                });
              })();
              return;
            }
            rest(rnd(restMin, restMax) * 1000, hopLoop);     // breathe between hops
          });
        }
        var _origRemove = inst.remove;
        inst.remove = function () { clearTimeout(inst._restT); _origRemove(); };
        if (o.startOnScreen !== false && (!o.gate || o.gate())) newTrip(true);
        else {
          inst.active = false;
          el.style.left = '-200%';
          rest(rnd(waitMin, waitMax) * 1000, function () { if (!inst._dead) newTrip(false); });
        }
        return inst;
      },
    };
    if (opts.flip) inst.setFlip(true);
    el._inst = inst;                       // backref for host click routing
    return inst;
  }

  window.Bunny = { place: place };
})();
