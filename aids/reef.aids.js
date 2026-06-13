/* ── Reef aid variant — dolphin number line + a pearl treasure chest ────────
   For the coral-reef background (BACKGROUNDS.underwater_happy_reef.aids='reef'
   when the background is ported — see backgrounds/README.md).
   A dolphin swims the number line (water-droplet trail, bubble-colored
   fireworks), and the counting jar becomes an open treasure chest that
   fills with iridescent pearls; the chain garden grows coral sprigs. */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.reef=(()=>{

  // iridescent pearl palette (white, blush, cream, lavender, aqua)
  const PRL=[
    {base:'#F4F6F8',tint:'#D8E2EC',shine:'#FFFFFF'},
    {base:'#F8E4EC',tint:'#E8C2D2',shine:'#FFF4F8'},
    {base:'#F8F0DC',tint:'#E8D8B4',shine:'#FFFCF0'},
    {base:'#ECE2F6',tint:'#D2BEE8',shine:'#F8F2FF'},
    {base:'#DCF2F0',tint:'#B4DED8',shine:'#F0FFFC'},
  ];
  // coral sprigs for the garden upgrade
  const CRL=[
    {main:'#FF7F6E',lite:'#FFB4A8'},{main:'#C77DFF',lite:'#EBD4FF'},
    {main:'#FFB347',lite:'#FFE0A8'},{main:'#FF6FA8',lite:'#FFC2DC'},
    {main:'#4FC3F7',lite:'#B8E8FF'},
  ];

  return{
    numberLine:{
      icon:'🐬',rider:'🐬',
      hintAdd:'🐬 שְׂחֵה קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!',
      hintSub:'🐬 שְׂחֵה אָחוֹרָה עַל הַיְּשַׁר כְּעֶזֶר!',
      /* jump FX: droplet trail, sea-spray dust, bubble-colored fireworks */
      fx:{
        colors:['#7DE8FF','#4FC3F7','#B2F4E6','#FFD27D'],
        dust:['#AEE6FF','#D2F4FF','#FFFFFF'],
        trail:'💧',
        fireworksEvery:3,
      },
    },
    jar:{
      icon:'🦪',gardenIcon:'🪸',itemName:'פְּנִינִים',
      hintAdd:'🦪 הוֹסֵף פְּנִינִים כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'🦪 הָסֵר פְּנִינִים כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      /* a removed pearl bursts into sea-foam shimmer */
      fx:{poof:['#FFFFFF','#D2F4FF','#F8E4EC','#AEE6FF','#ECE2F6','#FFF6DC','#B2F4E6','#E8C2D2']},
      // an open sunken treasure chest: domed lid, brass straps, sandy base
      containerSVG:
        `<svg class="ck-jar-bg" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">`+
        `<path d="M28,64 Q24,18 90,16 Q156,18 152,64 L142,68 Q138,34 90,32 Q42,34 38,68 Z" fill="#6E441F" stroke="#4A2C12" stroke-width="2.5"/>`+
        `<rect x="82" y="16" width="16" height="50" rx="3" fill="#CAA84E"/>`+
        `<path d="M22,70 L158,70 L152,238 Q152,250 90,250 Q28,250 28,238 Z" fill="#7A4E24" stroke="#4A2C12" stroke-width="2.5"/>`+
        `<rect x="46" y="70" width="14" height="172" fill="#CAA84E" opacity=".85"/>`+
        `<rect x="120" y="70" width="14" height="172" fill="#CAA84E" opacity=".85"/>`+
        `<circle cx="90" cy="92" r="9" fill="#E0BC5A"/>`+
        `<circle cx="90" cy="92" r="3.5" fill="#5A3C10"/>`+
        `<path d="M30,80 L34,228" stroke="rgba(255,236,180,.25)" stroke-width="5" stroke-linecap="round"/>`+
        `<ellipse cx="90" cy="248" rx="76" ry="9" fill="rgba(232,214,172,.30)" stroke="rgba(196,168,120,.4)" stroke-width="1.5"/>`+
        `<circle cx="150" cy="120" r="2.2" fill="rgba(220,245,255,.55)"/>`+
        `<circle cx="146" cy="160" r="1.6" fill="rgba(220,245,255,.4)"/></svg>`,
      itemSVG(idx){
        const p=PRL[idx%5];
        return`<svg viewBox="0 0 52 26">`+
          `<ellipse cx="26" cy="14" rx="14" ry="11" fill="${p.tint}" opacity=".5"/>`+
          `<circle cx="26" cy="13" r="11" fill="${p.base}" stroke="${p.tint}" stroke-width="1.2"/>`+
          `<ellipse cx="22" cy="9" rx="4.5" ry="3" fill="${p.shine}" opacity=".9"/>`+
          `<ellipse cx="30" cy="18" rx="3" ry="1.6" fill="${p.tint}" opacity=".6"/></svg>`;
      },
      gardenSVG(ci){
        const c=CRL[ci%5];
        return `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">`+
          `<path d="M20,56 L20,30 M20,42 Q12,38 10,26 M20,38 Q28,34 31,22 M20,30 Q16,24 17,14" `+
          `stroke="${c.main}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`+
          `<circle cx="10" cy="24" r="3" fill="${c.lite}"/>`+
          `<circle cx="31" cy="20" r="3" fill="${c.lite}"/>`+
          `<circle cx="17" cy="12" r="3.4" fill="${c.lite}"/>`+
          `<circle cx="20" cy="33" r="2.2" fill="${c.lite}" opacity=".8"/></svg>`;
      },
    },
  };
})();
