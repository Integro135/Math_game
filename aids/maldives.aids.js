/* ── Maldives aid variant — dolphin number line + a seashell beach pail ─────
   For the Maldives-beach background (BACKGROUNDS.maldives.aids='maldives').
   A DOLPHIN leaps along the number line (water-droplet trail, aqua fireworks —
   echoing the scene's real leaping dolphins), and the counting jar becomes a
   beach PAIL that fills with seashells; the chain garden grows little palm
   sprigs. Every field the variant omits falls back to classic (aids/README). */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.maldives=(()=>{

  // seashell palettes (shell pink, cream, coral, lilac, aqua) — [fill, stroke]
  const SHELL=[
    ['#FFE0CC','#F2A57A'],['#FFF0DC','#F0BE8E'],['#FBD2E0','#E79ABD'],
    ['#EADCF6','#C6A8E8'],['#D6F2EC','#8ED8CC'],
  ];
  // palm-sprig greens for the chain garden
  const PALM=[['#2E8B57','#43B873'],['#3AA76D','#5FD08C'],['#2F9159','#4FC07A']];

  return{
    numberLine:{
      icon:'🐬',rider:'🐬',
      hintAdd:'🐬 שְׂחֵה קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!',
      hintSub:'🐬 שְׂחֵה אָחוֹרָה עַל הַיְּשַׁר כְּעֶזֶר!',
      /* jump FX: droplet trail, sea-spray dust, aqua/gold fireworks */
      fx:{
        colors:['#7DE8FF','#4FC3F7','#6FE6D8','#FFC24D'],
        dust:['#AEE6FF','#D2F4FF','#FFFFFF'],
        trail:'💧',
        fireworksEvery:3,
      },
    },
    jar:{
      icon:'🐚',gardenIcon:'🌴',itemName:'צְדָפוֹת',
      hintAdd:'🐚 הוֹסֵף צְדָפוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'🐚 הָסֵר צְדָפוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      /* a removed shell bursts into sea-foam shimmer */
      fx:{poof:['#FFFFFF','#D2F4FF','#FBD2E0','#AEE6FF','#EADCF6','#FFF3D6','#B2F4E6','#F2A57A']},
      // a sandcastle beach pail: coral bucket, rim, arched handle, sandy base
      containerSVG:
        `<svg class="ck-jar-bg" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">`+
        `<path d="M42,70 Q90,18 138,70" fill="none" stroke="#E8703A" stroke-width="7" stroke-linecap="round" opacity=".92"/>`+
        `<path d="M30,74 L150,74 L134,244 Q134,252 90,252 Q46,252 46,244 Z" fill="#FF9B57" stroke="#D9702E" stroke-width="3"/>`+
        `<rect x="24" y="62" width="132" height="17" rx="8.5" fill="#FFB27A" stroke="#D9702E" stroke-width="3"/>`+
        `<path d="M42,86 L46,238" stroke="rgba(255,242,222,.4)" stroke-width="6" stroke-linecap="round"/>`+
        `<ellipse cx="90" cy="247" rx="60" ry="8" fill="rgba(240,224,180,.5)"/>`+
        `<circle cx="120" cy="120" r="2" fill="rgba(255,244,228,.6)"/>`+
        `<circle cx="116" cy="158" r="1.5" fill="rgba(255,244,228,.45)"/></svg>`,
      itemSVG(idx){
        const c=SHELL[idx%5];
        // a scallop shell: fan body from a top hinge, radiating ribs
        return`<svg viewBox="0 0 52 44">`+
          `<path d="M26,7 C41,7 50,22 50,36 L2,36 C2,22 11,7 26,7 Z" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.4"/>`+
          `<path d="M26,10 L26,36 M18,11 L13,35 M34,11 L39,35 M11,15 L5,34 M41,15 L47,34" `+
          `stroke="${c[1]}" stroke-width="1.2" fill="none" opacity=".7"/>`+
          `<circle cx="26" cy="9" r="3.2" fill="${c[1]}"/></svg>`;
      },
      gardenSVG(ci){
        const g=PALM[ci%3];
        return `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">`+
          `<path d="M20,56 L20,26" stroke="#9A6A3A" stroke-width="4" stroke-linecap="round"/>`+
          `<path d="M20,26 Q7,21 2,11 Q13,18 20,25 Z" fill="${g[0]}"/>`+
          `<path d="M20,26 Q33,21 38,11 Q27,18 20,25 Z" fill="${g[1]}"/>`+
          `<path d="M20,25 Q14,11 16,2 Q23,12 22,24 Z" fill="${g[0]}"/>`+
          `<path d="M20,25 Q27,12 32,6 Q23,15 22,24 Z" fill="${g[1]}"/>`+
          `<circle cx="17" cy="27" r="2.3" fill="#6B4A2B"/><circle cx="23" cy="27" r="2.3" fill="#6B4A2B"/></svg>`;
      },
    },
  };
})();
