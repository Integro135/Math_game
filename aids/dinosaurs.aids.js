/* ── Dinosaurs aid variant — kangaroo number line + a JAR OF BONES ──────────
   Loaded dynamically by game/js/bg-loader.js when the 🦕 dinosaurs background
   is active (backgrounds/dinosaurs.bg.js → aids:'dinosaurs').

   It REUSES the classic aid art (the kangaroo number-line rider, the glass jar
   container, the flower garden-upgrade) and changes ONLY the counted item to a
   BONE 🦴: the little SVG cookies were hard to read over the busy volcano
   backdrop, so on the dino theme we count bones instead. That single item is
   read by BOTH the jar aid (aids/jar_stage.js) and the number-hover tooltip
   (game/js/core.js → _nttItemHTML), so swapping it fixes the tooltip too.

   classic.aids.js is always loaded first (bg-loader.js boots with
   loadAids('classic')), so we can build on it — but we read it LAZILY through
   getters so the script load order can never matter. */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.dinosaurs=(()=>{
  const classicNL =()=>((window.AIDS.variants.classic||{}).numberLine||{icon:'🦘',rider:'🦘'});
  const classicJar=()=>((window.AIDS.variants.classic||{}).jar||{});

  /* the counted item: a BONE 🦴 emoji glyph — big and clearly visible where the
     tiny cookie SVGs washed out. A wide-short viewBox (bone-shaped) lets the jar
     auto-sizer (aids/jar_stage.js reads the viewBox) lay them flat; the hover
     tooltip forces svg{width:24px} (game/css/base.css). */
  function boneSVG(/*idx*/){
    return '<svg viewBox="0 0 40 26" xmlns="http://www.w3.org/2000/svg">'+
      '<text x="20" y="21" font-size="23" text-anchor="middle" '+
        'font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,system-ui,sans-serif">🦴</text>'+
      '</svg>';
  }

  /* the number-line rider: a 🦖 T-Rex (bipedal, so it reads as a "jumper" like
     the kangaroo it replaces). The engine assumes the rider RESTS facing RIGHT
     (forward = higher numbers) and adds scaleX(-1) for backward hops (aids.css
     .nl-dot.face-left .kang-dir). The T-Rex emoji faces LEFT by default, so we
     bake a scaleX(-1) into the glyph → it rests facing right, and the engine's
     backward flip then composes back to left. */
  const RIDER='<span style="display:inline-block;transform:scaleX(-1)">🦖</span>';

  return{
    get numberLine(){                                        // T-Rex rider; FX inherited from classic
      const base=classicNL();
      return{
        icon:'🦖', rider:RIDER,
        hintAdd:'🦖 קְפַץ קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!',
        hintSub:'🦖 קְפַץ אָחוֹר עַל הַיְּשַׁר כְּעֶזֶר!',
        fx:base.fx,
      };
    },
    jar:{
      icon:'🦴', itemName:'עֲצָמוֹת',
      get gardenIcon(){ return classicJar().gardenIcon; },
      hintAdd:'🦴 הוֹסֵף עֲצָמוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'🦴 הָסֵר עֲצָמוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      get containerSVG(){ return classicJar().containerSVG; },  // same glass jar
      itemSVG:boneSVG,                                          // ← bones, not cookies
      get gardenSVG(){ return classicJar().gardenSVG; },        // same flower upgrade
    },
  };
})();
