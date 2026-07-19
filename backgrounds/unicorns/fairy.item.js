/* ─────────────────────────────────────────────────────────────────────────
   FAIRY — a standalone, pure-CSS fairy: a glowing heart-orb with two pairs of
   flapping, rotating wings and a burst of twinkling sparks. Extracted from
   backgrounds/unicorns/fairy.html (CodePen "Fairy — pure css" by Sylvain
   Garnot) with the night-sky FRAME, stars, shooting stars and labels stripped
   out — just the fairy, ready to drop into any scene/background later.

   The SCSS was compiled to plain CSS and every class / keyframe namespaced
   `fy-*` so it can't collide with a host background.

   API — window.Fairy.place(parent, opts) -> inst
     opts : { left, top, scale=1, wander=true, z }
              left/top: number(px) or any CSS length string; default centred in
              parent (50%/50%). scale multiplies the ~56px base. wander=false
              pins it (the wings/heart/sparks still animate). z = z-index.
     inst : { el, remove(), setScale(s), setWander(on), setPos(left,top) }

   Zero dependencies; injects its <style> once (id 'fairy-item-style').
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var STYLE_ID = 'fairy-item-style';
  var SPARKS = 20;

  /* the fairy's own look — NO background, positioned by a 0-size .fy-fairy
     anchor (its centre = where you place it), sized via transform:scale. */
  var BASE_CSS = `
  .fy-fairy{position:absolute;left:50%;top:50%;pointer-events:none}
  /* inner mover carries the slow diagonal "flying" wander (±84px) */
  .fy-move{position:relative;animation:fy-float 12s ease-in-out infinite}
  .fy-fairy.fy-still .fy-move{animation:none}

  /* HEART — the glowing orb */
  .fy-heart{
    position:absolute;border-radius:50%;
    width:56px;height:56px;left:calc(50% - 28px);top:calc(50% - 28px);
    border:solid 1px #f6edd1;
    background:radial-gradient(circle,#fff 35%,#f6edd1 100%);
    box-shadow:0 0 11.2px 5.6px #e8c8a1,0 0 33.6px 16.8px hotpink;
    animation:fy-bounce 1.5s ease-in-out infinite}

  /* WINGS — two containers (L/R), each with a top + bottom wing */
  .fy-wings{animation:fy-bounce 1.5s ease-in-out infinite}
  .fy-wings .fy-wing{position:absolute;opacity:.65}
  .fy-wt .fy-wing{border-radius:40%;bottom:50%;width:70px;height:94.5px;
    background:radial-gradient(ellipse at bottom,#fff 25%,#3d966e 100%)}
  .fy-wb .fy-wing{border-radius:45%;top:50%;width:63px;height:70px;
    background:radial-gradient(ellipse at top,#fff 25%,#3d966e 100%)}
  .fy-wing-left  .fy-wt .fy-wing{transform:skew(20deg,30deg)}
  .fy-wing-left  .fy-wb .fy-wing{transform:skew(-25deg,-10deg)}
  .fy-wing-right .fy-wt .fy-wing{transform:skew(-20deg,-30deg)}
  .fy-wing-right .fy-wb .fy-wing{transform:skew(25deg,10deg)}
  .fy-wing-left  .fy-wing{right:calc(50% + 11.2px);transform-origin:right}
  .fy-wing-right .fy-wing{left:calc(50% + 11.2px);transform-origin:left}
  .fy-wing-left {animation:fy-wings-left  12s ease-in-out infinite}
  .fy-wing-right{animation:fy-wings-right 12s ease-in-out infinite}
  .fy-wing-left .fy-wt,.fy-wing-left .fy-wb,
  .fy-wing-right .fy-wt,.fy-wing-right .fy-wb{animation:fy-flap .55s ease-in-out infinite}

  /* SPARKS — 20 dots bursting out (per-spark keyframes generated below) */
  .fy-sparks .fy-spark{position:absolute;border-radius:50%;
    left:calc(50% - 6.16px);top:calc(50% - 12.32px)}

  @keyframes fy-float{0%,100%{transform:translate(84px,84px)}50%{transform:translate(-84px,-84px)}}
  @keyframes fy-bounce{0%,100%{transform:translateY(14px)}50%{transform:translateY(-14px)}}
  @keyframes fy-wings-left{
    0%,100%{transform:perspective(280px) translateX(-14px) rotateX(0) rotateY(10deg)}
    50%{transform:perspective(280px) translateX(0) rotateX(0) rotateY(-80deg)}}
  @keyframes fy-wings-right{
    0%,100%{transform:perspective(280px) translateX(0) rotateX(0) rotateY(80deg)}
    50%{transform:perspective(280px) translateX(14px) rotateX(0) rotateY(-10deg)}}
  @keyframes fy-flap{0%,100%{transform:rotateX(-5deg) rotateY(-35deg)}50%{transform:rotateX(5deg) rotateY(35deg)}}
  `;

  /* 20 spark keyframes: each flies out radially to a stable pseudo-random
     angle/distance (60..132px) and fades pink. Seeded LCG so the burst looks
     the same every load. */
  function sparkCss() {
    var out = '', seed = 1337, i;
    function rand() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (i = 1; i <= SPARKS; i++) {
      var ang = rand() * Math.PI * 2, dist = 60 + rand() * 72;
      var dx = Math.round(Math.cos(ang) * dist), dy = Math.round(Math.sin(ang) * dist);
      var w = (10 + rand() * 4).toFixed(1);
      out += '@keyframes fy-spark-' + i + '{'
        + '0%{opacity:0;width:' + w + 'px;height:' + w + 'px;background:#f6edd1}'
        + '50%{opacity:.92}'
        + '100%{opacity:0;width:0;height:0;background:hotpink;transform:translate(' + dx + 'px,' + dy + 'px)}}';
      out += '.fy-sparks .fy-spark:nth-child(' + i + '){animation:fy-spark-' + i
        + ' 2s linear infinite;animation-delay:-' + (i * 2 / SPARKS).toFixed(2) + 's}';
    }
    return out;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = BASE_CSS + sparkCss();
    document.head.appendChild(st);
  }

  function div(cls) { var d = document.createElement('div'); d.className = cls; return d; }

  function build() {
    var f = div('fy-fairy'), mv = div('fy-move');
    var wings = div('fy-wings');
    ['left', 'right'].forEach(function (side) {
      var wc = div('fy-wing-' + side);
      ['fy-wt', 'fy-wb'].forEach(function (part) {
        var p = div(part); p.appendChild(div('fy-wing')); wc.appendChild(p);
      });
      wings.appendChild(wc);
    });
    var sparks = div('fy-sparks');
    for (var i = 0; i < SPARKS; i++) { var s = document.createElement('span'); s.className = 'fy-spark'; sparks.appendChild(s); }
    // DOM order = paint order: wings (back) → sparks → heart (front)
    mv.appendChild(wings); mv.appendChild(sparks); mv.appendChild(div('fy-heart'));
    f.appendChild(mv);
    return f;
  }

  function len(v) { return typeof v === 'number' ? v + 'px' : v; }
  function setScale(el, s) { el.style.transform = 'scale(' + (s == null ? 1 : s) + ')'; el.style.transformOrigin = 'center'; }

  function place(parent, opts) {
    injectStyle();
    opts = opts || {};
    var el = build();
    if (opts.left != null) el.style.left = len(opts.left);
    if (opts.top != null) el.style.top = len(opts.top);
    if (opts.z != null) el.style.zIndex = opts.z;
    setScale(el, opts.scale);
    if (opts.wander === false) el.classList.add('fy-still');
    (parent || document.body).appendChild(el);
    return {
      el: el,
      remove: function () { el.remove(); },
      setScale: function (s) { setScale(el, s); },
      setWander: function (on) { el.classList.toggle('fy-still', !on); },
      setPos: function (l, t) { if (l != null) el.style.left = len(l); if (t != null) el.style.top = len(t); }
    };
  }

  window.Fairy = { place: place };
})();
