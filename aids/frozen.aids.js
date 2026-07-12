/* ── Frozen aid variant — SNOWMAN number line + a JAR OF SNOWFLAKES ─────────
   Loaded dynamically by game/js/bg-loader.js when the ❄️ frozen background
   is active (backgrounds/frozen.bg.js → aids:'frozen').

   It REUSES the classic aid art (the glass jar container, the flower
   garden-upgrade, the number-line FX) and swaps ONLY the character pieces:
   the RIDER becomes a snowman ⛄ (Olaf's kin — front-facing, so no flip is
   needed; the engine's backward scaleX(-1) still composes fine), and the
   counted item becomes a SNOWFLAKE ❄️ — bright and readable over the icy
   night backdrop. The item is read by BOTH the jar aid (aids/jar_stage.js)
   and the number-hover tooltip (game/js/core.js → _nttItemHTML).

   classic.aids.js is always loaded first (bg-loader.js boots with
   loadAids('classic')), so we can build on it — but we read it LAZILY through
   getters so the script load order can never matter. */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.frozen=(()=>{
  const classicNL =()=>((window.AIDS.variants.classic||{}).numberLine||{icon:'🦘',rider:'🦘'});
  const classicJar=()=>((window.AIDS.variants.classic||{}).jar||{});

  /* the counted item: a SNOWFLAKE ❄️ emoji glyph — a square viewBox so the
     jar auto-sizer (aids/jar_stage.js reads the viewBox) stacks them round;
     the hover tooltip forces svg{width:24px} (game/css/base.css). */
  function flakeSVG(/*idx*/){
    return '<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">'+
      '<text x="15" y="24" font-size="24" text-anchor="middle" '+
        'font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,system-ui,sans-serif">❄️</text>'+
      '</svg>';
  }

  return{
    get numberLine(){                          // snowman rider; FX inherited from classic
      const base=classicNL();
      return{
        icon:'⛄', rider:'⛄',
        hintAdd:'⛄ קִפְצִי קָדִימָה עַל הַיָּשָׁר כְּעֶזֶר!',
        hintSub:'⛄ קִפְצִי אָחוֹרָה עַל הַיָּשָׁר כְּעֶזֶר!',
        fx:base.fx,
      };
    },
    jar:{
      icon:'❄️', itemName:'פְּתִיתֵי שֶׁלֶג',
      get gardenIcon(){ return classicJar().gardenIcon; },
      hintAdd:'❄️ הוֹסִיפִי פְּתִיתִים כְּעֶזֶר, וְאָז כִּתְבִי אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'❄️ הָסִירִי פְּתִיתִים כְּעֶזֶר, וְאָז כִּתְבִי אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      get containerSVG(){ return classicJar().containerSVG; },  // same glass jar
      itemSVG:flakeSVG,                                         // ← snowflakes, not cookies
      get gardenSVG(){ return classicJar().gardenSVG; },        // same flower upgrade
    },
  };
})();
