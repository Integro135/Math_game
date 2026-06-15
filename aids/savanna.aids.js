/* ── Savanna aid variant — a cheetah bounding the number line + a clay-amber
   fruit jar ─────────────────────────────────────────────────────────────────
   For the Pride-Rock-at-sunset background (backgrounds/savanna.bg.js,
   aids:'savanna'). A cheetah runs the number line (golden dust trail, warm
   sunset fireworks); the counting jar is a warm amber vessel that fills with
   round marula fruits, and the chain garden grows little acacia trees.
   The engine in game/js/aids.js is generic — this file supplies ALL the art. */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.savanna=(()=>{

  // golden savanna fruit palette (marula-ish: gold, amber, sunset-orange)
  const FR=[
    {base:'#F2B33C',dark:'#C8861E',lite:'#FFE9A8'},
    {base:'#EE8F3C',dark:'#C2641E',lite:'#FFD79A'},
    {base:'#E2683C',dark:'#B24A22',lite:'#FFC79A'},
    {base:'#E8C24C',dark:'#C2982A',lite:'#FFF0B8'},
    {base:'#D9803C',dark:'#A85A22',lite:'#FFD0A0'},
  ];
  // acacia canopy greens for the garden upgrade
  const AC=[
    {can:'#4F7A2A',canL:'#6E9A3C',trunk:'#6E4A28'},
    {can:'#3E6A24',canL:'#5E8A30',trunk:'#7A5428'},
    {can:'#5E8A30',canL:'#7EAA44',trunk:'#6E4A28'},
    {can:'#467026',canL:'#669636',trunk:'#80602E'},
    {can:'#3C6020',canL:'#5C8030',trunk:'#6E4A28'},
  ];

  return{
    numberLine:{
      icon:'🐆',rider:'🐆',
      hintAdd:'🐆 רוּץ קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!',
      hintSub:'🐆 רוּץ אָחוֹרָה עַל הַיְּשַׁר כְּעֶזֶר!',
      /* jump FX: golden sunset sparkles, kicked savanna dust, warm fireworks */
      fx:{
        colors:['#FFD27D','#FF9A4D','#FFC568','#E07028'],
        dust:['#C8A050','#A07840','#E8C878'],
        trail:'✨',
        fireworksEvery:3,
      },
    },
    jar:{
      icon:'🥭',gardenIcon:'🌳',itemName:'פֵּרוֹת',
      hintAdd:'🥭 הוֹסֵף פֵּרוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'🥭 הָסֵר פֵּרוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      /* a removed fruit bursts into warm sunset sparkles */
      fx:{poof:['#FFD27D','#FF9A4D','#F2B33C','#E2683C','#FFE9A8','#FFFFFF','#C8861E','#FFC568']},
      // a warm amber vessel with a carved-wood rim (translucent so fruit shows)
      containerSVG:
        `<svg class="ck-jar-bg" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">`+
        `<rect x="30" y="10" width="120" height="22" rx="6" fill="#8A4A22"/>`+
        `<rect x="34" y="10" width="112" height="18" rx="5" fill="#A85F2C"/>`+
        `<rect x="42" y="6" width="96" height="12" rx="4" fill="#743C18"/>`+
        `<path d="M30,32 Q20,38 18,55 L14,230 Q14,248 90,248 Q166,248 166,230 L162,55 Q160,38 150,32 Z" fill="rgba(255,180,100,.12)" stroke="rgba(255,190,110,.5)" stroke-width="2.5"/>`+
        `<path d="M36,40 Q28,55 26,90 L24,200" stroke="rgba(255,235,200,.3)" stroke-width="6" fill="none" stroke-linecap="round"/>`+
        `<path d="M26,150 Q90,140 154,150" stroke="rgba(120,60,30,.30)" stroke-width="2.5" fill="none"/>`+
        `<ellipse cx="90" cy="244" rx="75" ry="10" fill="rgba(150,80,40,.28)" stroke="rgba(220,150,80,.35)" stroke-width="1.5"/></svg>`,
      itemSVG(idx){
        const f=FR[idx%5];
        return`<svg viewBox="0 0 24 26">`+
          `<ellipse cx="12" cy="23" rx="8.5" ry="2.4" fill="${f.dark}" opacity=".22"/>`+
          `<circle cx="12" cy="14" r="9" fill="${f.base}" stroke="${f.dark}" stroke-width="1"/>`+
          `<path d="M12.5,6 Q16,2 19,3 Q16.5,6.5 13,6.5 Z" fill="#5B7A2A"/>`+
          `<path d="M12,6.5 L12,4.5" stroke="#6E4A28" stroke-width="1.3" stroke-linecap="round"/>`+
          `<ellipse cx="9" cy="11" rx="3" ry="2.2" fill="${f.lite}" opacity=".7"/></svg>`;
      },
      gardenSVG(ci){
        const a=AC[ci%5];
        return `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">`+
          `<path d="M20,56 Q18,42 20,30" stroke="${a.trunk}" stroke-width="4" fill="none" stroke-linecap="round"/>`+
          `<path d="M20,34 L11,30 M20,33 L29,28" stroke="${a.trunk}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`+
          `<ellipse cx="20" cy="22" rx="17" ry="6.5" fill="${a.can}"/>`+
          `<ellipse cx="18" cy="18" rx="11" ry="4.6" fill="${a.canL}"/>`+
          `<ellipse cx="26" cy="20" rx="7" ry="3.4" fill="${a.canL}" opacity=".8"/></svg>`;
      },
    },
  };
})();
