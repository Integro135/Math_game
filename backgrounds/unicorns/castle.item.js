/* ─────────────────────────────────────────────────────────────────────────
   CASTLE — the enchanted pure-CSS castle (castle.html art, the one the
   original unicorn valley stands on its knoll), packaged as a reusable item
   so any host scene can plant it. Extracted from meadow.scene.js (since
   deleted) by
   _build_castle_item.py-style extraction (scratch script); the CSS is the
   meadow's castle block verbatim, re-namespaced from `.uc-meadow .cartoon`
   to `.uc-castle` and its keyframes prefixed uc-castle-*, so it cannot
   collide with a host (or with the meadow, if both are loaded).

   API — window.Castle.place(parent, opts) -> inst
     opts : { leftPct, topPct   — where the castle's GROUND LINE centre sits
                                  (percent of the parent; the box is 90vmin
                                  square, anchored at 50% / 84.5%)
              scale = .62       — the whole castle
              z }
     inst : { el, remove(), setPos(leftPct, topPct), setScale(s),
              setNight(k)       — 0 day … 1 night: dims the walls, the windows
                                  keep their warm flicker so they read as lit }
   Zero dependencies; injects its <style> once.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var STYLE_ID = 'uc-castle-style';
  var CSS = `
.uc-castle {
  --white: #fff; --light: #f0d4ea;
  --blue: #b678ea; --bluedark: #8b48c8;
  position: absolute;
  width: 90vmin; height: 90vmin;
  margin-left: -45vmin; margin-top: -76.05vmin;  /* anchor = 50% / 84.5% (the castle's ground line) */
  transform: scale(.62);
  transform-origin: 50% 84.5%;
  filter: drop-shadow(0 1vmin 2.2vmin rgba(90,30,80,.30));
}
.uc-castle div { position: absolute; box-sizing: border-box; }
.uc-castle .hb::before, .uc-castle .ha::after { content: ""; display: block; position: absolute; }
.uc-castle .wall {
  height: 12.25%; width: 44%; top: 73.75%; left: 28.125%;
  background: linear-gradient(to bottom, transparent 12.5%, #c9bad5 0), linear-gradient(to right, transparent 50%, #c9bad5 0), linear-gradient(to right, #82739a 50%, transparent 0);
  background-size: 6% 100%, 6% 100%, 100% 100%;
  background-position: -3.75vmin 0;
}
.uc-castle .wall::after {
  height: 14%; width: 40%; background: var(--bluedark); top: -13%; left: 0;
  clip-path: polygon(0% 100%, 8% 0%, 100% 0%, 100% 100%);
}
.uc-castle .tower {
  height: 19.75%; width: 6.25%; top: 66.25%;
  clip-path: polygon(12% 0%, 88% 0%, 88% 9%, 84% 9%, 84% 15%, 100% 20%, 100% 32%, 87% 39%, 87% 100%, 12% 100%, 12% 39%, 0% 32%, 0% 20%, 16% 15%, 16% 9%, 12% 9%, 12% 0);
  background: linear-gradient(to bottom, #ffffff 9%, #d7d1cb 0 15%, #f7f4f0 0 20%, #ffffff 0 32%, #ebe7e1 0 39%, #ffffff 0 45.75%, transparent 0), linear-gradient(to right, #f7f4f0 27%, #ebe7e1 0 65%, #d7d1cb 0);
}
.uc-castle .tower-1 { left: 33.75%; }
.uc-castle .tower-2 { left: 51.5%; }
.uc-castle .tower-3 { width: 7.25%; left: 24.5%; }
.uc-castle .tower-3a { clip-path: polygon(16% 0%, 84% 0%, 84% 9%, 84% 15%, 100% 20%, 100% 32%, 87% 39%, 87% 100%, 12% 100%, 12% 39%, 0% 32%, 0% 20%, 16% 15%, 16% 9%, 16% 0); }
.uc-castle .tower-3b { clip-path: polygon(16% 45.75%, 84% 45.75%, 84% 100%, 16% 100%); }
.uc-castle .tower-4 {
  width: 6.66%; left: 60.125%;
  clip-path: polygon(16% 29.5%, 84% 30.5%, 84% 100%, 16% 100%);
  background: linear-gradient(to bottom, #ebe7e1 0 45.75%, transparent 0), linear-gradient(to right, #f7f4f0 27%, #ebe7e1 0 65%, #d7d1cb 0);
}
.uc-castle .tower-5 {
  left: 67%; width: 8.66%;
  clip-path: polygon(0% 20.5%, 100% 20.5%, 100% 39%, 85% 45%, 85% 100%, 15% 100%, 15% 45%, 0% 39%);
  background: linear-gradient(transparent 30%, #ffffff 0 39%, #c9bad5 0 45%, #ebe7e1 0), linear-gradient(to right, white 50%, #c9bad5 0);
  background-size: 100% 100%, 40% 100%;
}
.uc-castle .tower-6 {
  clip-path: polygon(0% 3%, 100% 3%, 100% 40%, 0% 40%);
  background-image: linear-gradient(transparent 13%, #ffffff 0 21%, #c9bad5 0), linear-gradient(to right, white 50%, #c9bad5 0);
  transform: scale(0.85); left: 66.4%; top: 64.8%;
}
.uc-castle .tower-7 { top: 62.66%; left: 58.5% }
.uc-castle .brick {
  color: #bfaed0; background: #bfaed0;
  top: 78%; left: 27.25%; width: 1.35%; height: 0.9%;
  box-shadow: -0.8vmin -0.85vmin, -0.8vmin 5.25vmin, 0.6vmin 3.5vmin, 1.75vmin 2.6vmin, 7.5vmin -1.8vmin, 7.5vmin 4vmin, 8vmin 4.8vmin, 9.5vmin 0.7vmin, 23.4vmin 1.9vmin, 24.33vmin -0.5vmin, 25.6vmin -1.3vmin, 24.33vmin 4.75vmin, 25.6vmin 5.5vmin, 31.25vmin -1.75vmin, 31.25vmin 5vmin, 32.25vmin 2vmin, 33.5vmin 1.2vmin, 36.75vmin 1vmin, 37.66vmin 1.8vmin, 40vmin -1.5vmin, 40.125vmin 4.25vmin, 41.25vmin 3.4vmin, 36.75vmin 5.25vmin;
}
.uc-castle .window {
  color: #ffd77e; background: #ffd77e;
  width: 1.25%; height: 1.25%; top: 70.25%; left: 26.2%;
  box-shadow: 2.25vmin 0, 8vmin 0, 10.25vmin 0, 24vmin 0, 26.125vmin 0, 4.6vmin -4vmin 0 -0.125vmin, 4.6vmin -4.5vmin 0 -0.125vmin, 12.75vmin -15vmin 0 -0.125vmin, 12.75vmin -15.75vmin 0 -0.125vmin, 12.75vmin -16.5vmin 0 -0.125vmin, 12.75vmin -17.25vmin 0 -0.125vmin, 17vmin -22.125vmin 0 0.125vmin, 17vmin -19.33vmin 0 0.125vmin, 17vmin -18.66vmin 0 0.125vmin,
    32.125vmin 1.5vmin 0 -0.125vmin, 33.66vmin 1.5vmin 0 -0.125vmin,
    0.25vmin -3.66vmin 0 -0.125vmin, 2vmin -3.66vmin 0 -0.125vmin,
    8.125vmin -3.66vmin 0 -0.125vmin, 9.875vmin -3.66vmin 0 -0.125vmin,
    24.125vmin -3.66vmin 0 -0.125vmin, 25.75vmin -3.66vmin 0 -0.125vmin;
  animation: uc-castle-flicker 4.5s ease-in-out infinite;
}
@keyframes uc-castle-flicker {
  0%, 100% { filter: drop-shadow(0 0 .55vmin rgba(255,200,90,.7)); }
  50%      { filter: drop-shadow(0 0 1.1vmin rgba(255,210,110,1)); }
}
.uc-castle .roof {
  color: #8b48c8; width: 4.75%; height: 5%;
  border: 2vmin solid transparent; border-top: 8vmin solid transparent;
  border-bottom: 7.5vmin solid #8b48c8;
}
.uc-castle .roof-1 {
  top: 49.125%; left: 34.5%;
  filter: drop-shadow(-7.8vmin 0) drop-shadow(23.8vmin 0);
  clip-path: polygon(-400% 0%, 500% 0%, 500% 100%, -400% 100%);
}
.uc-castle .roof-2 {
  top: 49.75%; left: 69.75%;
  filter: drop-shadow(-7.8vmin 4.75vmin) drop-shadow(-8.75vmin -2vmin);
  clip-path: polygon(-220% 0%, 100% 0%, 100% 200%, -220% 200%);
}
.uc-castle .flag-pole {
  width: 0.8%; height: 5.5%; background: #fff5cf; color: #fff5cf;
  top: 53.25%; left: 27.8%;
  box-shadow: 7.8vmin 0, 23.75vmin 0, 39.55vmin 0.9vmin, 31.7vmin 5.5vmin, 30.7vmin -1.25vmin, 3.33vmin 4.5vmin 0 -0.125vmin;
}
.uc-castle .flag-pole-top {
  width: 0.5%; height: 3%; background: #fff5cf; color: #fff5cf;
  top: 41%; left: 40.8%;
  box-shadow: 6.5vmin -14vmin, 6.5vmin -14.5vmin, 14.9vmin -8.5vmin, 8.75vmin -14vmin, 10vmin -14vmin;
}
.uc-castle .house-roof {
  left: 30.5%; top: 61.25%; width: 2.8%; height: 3.5%;
  background: #8b48c8;
  clip-path: polygon(0% 100%, 40% 0%, 60% 0%, 100% 100%);
}
.uc-castle .house {
  background: #cec6be; width: 40%; height: 15%; left: 30.5%; top: 64.75%;
  clip-path: polygon(0% 0%, 7% 0%, 7% 40%, 15% 40%, 50% 100%, 50% 19%, 91.5% 19%, 91.5% 64%, 90% 68%, 80% 100%, 0% 100%);
}
.uc-castle .house::after { width: 11.5%; height: 10%; background: #a89f95; top: 20%; left: 76%; }
.uc-castle .minar-top {
  width: 3%; height: 8%; background: #8b48c8; top: 33.5%; left: 56.125%;
  clip-path: polygon(0% 100%, 45% 0%, 55% 0%, 100% 100%);
}
.uc-castle .minar-top-2 { top: 27.5%; left: 46.75%; }
.uc-castle .minar {
  background: #ffffff; width: 3%; height: 25%; left: 46.75%; top: 35.25%;
  box-shadow: 1vmin 8vmin 0 1.75vmin #ffffff, 8.5vmin 5.5vmin #f7f4f0, 6.5vmin 17vmin #f7f4f0;
}
.uc-castle .minar::after { width: 145%; height: 1.125vmin; left: 290%; top: 44%; background: #fff; }
.uc-castle .main-roof-behind {
  top: 28%; left: 39.5%; background: #ffeb97; width: 4%; height: 21%;
  clip-path: polygon(0% 100%, 45% 20%, 45% 0%, 55% 0%, 55% 20%, 100% 100%);
}
.uc-castle .main-tower-roof {
  width: 3.75%; height: 14%; top: 15%; left: 50.4%;
  clip-path: polygon(0% 100%, 42% 35%, 42% 0%, 58% 0%, 58% 35%, 100% 100%);
  background: linear-gradient(#fff5cf 35%, #ffeb97 0);
}
.uc-castle .main-roof {
  width: 11.5%; height: 13%; left: 39.5%; top: 36.5%;
  clip-path: polygon(0% 100%, 13.5% 48%, 24% 90%, 37% 24%, 37% 0%, 45% 0%, 45% 16%, 64% 16%, 64% 0%, 72% 0%, 72% 24%, 88% 100%);
  background: linear-gradient(#ffea97 24%, transparent 0), linear-gradient(to right, #b678ea 54%, #8b48c8 0)
}
.uc-castle .main-top {
  width: 10.5%; height: 26%; left: 40.5%; top: 41%; background: transparent;
  clip-path: polygon(50% 0%, 58% 13%, 58% 6%, 63% 6%, 63% 32.5%, 100% 32.5%, 100% 100%, 0% 100%, 0% 32.5%, 37% 32.5%, 37% 6%, 42% 6%, 42% 13%);
  background-image: linear-gradient(#f7f4f0 45%, #d7d1cb 0 52%, #ebe7e1 0 58%, transparent 0 61%, #f7f4f0 0), linear-gradient(to right, #ebe7e1 50%, #f7f4f0 0);
  background-size: 100% 100%, 20% 100%;
  box-shadow: inset 0.75vmin 0 #fff;
}
.uc-castle .main {
  width: 18.75%; height: 20%;
  background: linear-gradient(to right, #f7f4f0 5%, #fdfdfc 0 95%, #f7f4f0 0);
  top: 64.5%; left: 40.5%;
}
.uc-castle .main::after { width: 104%; height: 0.5vmin; left: -2%; top: -0.5vmin; background: #dedbd5; }
.uc-castle .main-tower {
  width: 6%; height: 50%; top: 28.5%; left: 49.25%;
  clip-path: polygon(80% 0%, 20% 0%, 20% 7%, 5% 7%, 5% 11%, 17% 13.5%, 17% 27.5%, 10% 27.5%, 10% 40.5%, 0% 40.5%, 0% 45%, 10% 47%, 10% 100%,
    90% 100%, 90% 47%, 100% 45%, 100% 40.5%, 90% 40.5%, 90% 27.5%, 83% 27.5%, 83% 13.5%, 95% 11%, 95% 7%, 80% 7%);
  background: linear-gradient(#f7f4f0 7%, #ffffff 0 11%, #d7d1cb 0 13.5%, transparent 0 40.5%, #ffffff 0 45%, #cccccc 0 47%, #ffffff 0), linear-gradient(to right, transparent 7%, #fff 0 40%, #f7f4f0 0 75%, #d7d1cb 0);
}
.uc-castle .front-gate {
  width: 8.5%; height: 18.5%; top: 67.5%; left: 41.5%;
  background-image: linear-gradient(#fff 33%, transparent 0 75%, #fff 0), linear-gradient(to right, #f7f4f0 11%, #fff 0 89%, #f7f4f0 0);
}
.uc-castle .front-gate::after {
  width: 2.5vmin; height: 2.5vmin; background: #ffd77e; border-radius: 50%;
  transform: translate(-50%, -60%); top: 0; left: 50%;
  box-shadow: 0 0 1vmin rgba(255,210,120,.85);
}
.uc-castle .gate {
  width: 80%; height: 50%; bottom: 0; left: 10%;
  background: linear-gradient(180deg, #ffe1a1 0%, #f7b76a 45%, #c97f4e 100%);
  border-radius: 140% 140% 0 0;
  border: 0.75vmin solid #f7f4f0; border-bottom: 0;
  box-shadow: 0 0 1.5vmin rgba(255,190,110,.55);
}
.uc-castle .balcony {
  width: 36%; height: 20%; background: #ffd77e; color: #ffd77e;
  border-radius: 100% 100% 0 0; top: 12.5%; left: 15%;
  box-shadow: 2.66vmin 0, 1.33vmin 2vmin 0 -0.25vmin #f7f4f0, 7.25vmin -21.75vmin 0 -0.5vmin;
}
.uc-castle .balcony::after {
  width: 60%; height: 30%; bottom: -85%; background: #f7f4f0;
  box-shadow: 3.75vmin 0 #f7f4f0;
}
.uc-castle .triangle {
  width: 100%; height: 61%; top: -61%;
  clip-path: polygon(10% 100%, 33% 25%, 33% 0%, 40% 0%, 40% 15%, 60% 15%, 60% 0%, 67% 0%, 67% 25%, 90% 100%);
  background: linear-gradient(#ffeb98 25%, transparent 0), linear-gradient(to right, #b678ea 50%, #8b48c8 0);
}
.uc-castle .triangle::after {
  width: 100%; height: 100%; background: #fff;
  clip-path: polygon(25% 100%, 50% 40%, 75% 100%);
}
.uc-castle .front-poles {
  width: 10%; height: 25%; background: #ffeb98; top: -25%;
  box-shadow: 6.85vmin 0 #ffeb98;
}
.uc-castle .flag {
  width: 4%; height: 3%; background: #ff77b9;
  clip-path: polygon(0% 0%, 100% 50%, 0% 100%);
  transform-origin: 0 50%;
  animation: uc-castle-wave 1.6s ease-in-out infinite;
}
@keyframes uc-castle-wave { 0%, 100% { transform: skewY(4deg); } 50% { transform: skewY(-4deg); } }
.uc-castle .flag-1 { top: 53.6%; left: 28%; }
.uc-castle .flag-2 { left: 62%; top: 53.6%; animation-delay: -.5s; }
.uc-castle .flag-3 { left: 71.75%; top: 54.33%; animation-delay: -1s; }
.uc-castle .flag-4 { top: 15.25%; left: 52.25%; background: #ffd36e; animation-delay: -.3s; }
.uc-castle .room-1 {
  width: 3%; height: 9%; top: 49%; left: 39.5%;
  clip-path: polygon(0% 4%, 100% 4%, 100% 100%, 30% 100%, 0% 80%);
  background: linear-gradient(white 80%, #f6f4ef 0);
}
.uc-castle .room-2 {
  width: 3%; height: 15%; top: 45%; left: 57.25%;
  clip-path: polygon(0% 56%, 39% 29%, 39% 0%, 62% 0%, 60% 29%, 100% 56%, 100% 86%, 50% 100%, 0% 86%);
  background: linear-gradient(#fff5cf 29%, #8b48c8 0 56%, transparent 0 86%, #f6f4ef 0), linear-gradient(to right, #fff 72%, #d7d1ca 0);
}
.uc-castle .window-curved {
  width: 0.75%; height: 1.75%; background: #ffd77e; color: #ffd77e;
  border-radius: 100% 100% 0 0; top: 60%; left: 50.75%;
  box-shadow: 2.125vmin -2.75vmin, 1vmin -6vmin;
  animation: uc-castle-flicker 4.5s ease-in-out infinite; animation-delay: -2s;
}
.uc-castle .room-3 {
  width: 2%; height: 13%; top: 24%; left: 52.7%;
  clip-path: polygon(0% 35%, 50% 0%, 100% 35%, 100% 85%, 50% 100%, 0% 85%);
  background: linear-gradient(#fff5cf 35%, #fff 0 85%, #d7d1cb 0)
}
.uc-castle .room-3::after {
  width: 50%; height: 17%; top: 45%; left: 25%;
  background: #ffd77e; box-shadow: 0 0 .8vmin rgba(255,210,120,.85);
}
.uc-castle { pointer-events: none; }
`;
  var MARKUP = `
<div class="uc-castle hb">
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
`;
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID; st.textContent = CSS;
    document.head.appendChild(st);
  }
  function place(parent, opts) {
    opts = opts || {};
    injectStyle();
    var host = document.createElement('div');
    host.innerHTML = MARKUP;
    var el = host.firstElementChild;
    if (opts.z != null) el.style.zIndex = opts.z;
    (parent || document.body).appendChild(el);
    var scale = opts.scale != null ? opts.scale : 0.62, night = 0;
    function apply() {
      el.style.transform = 'scale(' + scale + ')';
      var b = (1 - 0.34 * night).toFixed(3), s = (1 - 0.2 * night).toFixed(3);
      el.style.filter = 'brightness(' + b + ') saturate(' + s + ') drop-shadow(0 1vmin 2.2vmin rgba(90,30,80,.30))';
    }
    var inst = {
      el: el,
      remove: function () { if (el.parentNode) el.parentNode.removeChild(el); },
      setPos: function (leftPct, topPct) { el.style.left = leftPct + '%'; el.style.top = topPct + '%'; },
      setScale: function (s) { scale = s; apply(); },
      setNight: function (k) { k = Math.max(0, Math.min(1, +k || 0)); if (Math.abs(k - night) > 0.01) { night = k; apply(); } },
    };
    inst.setPos(opts.leftPct != null ? opts.leftPct : 86, opts.topPct != null ? opts.topPct : 63);
    apply();
    return inst;
  }
  window.Castle = { place: place };
})();
