/* ── Unicorn aid variant — unicorn number line + a crystal cupcake jar ──────
   For the unicorn-valley background (BACKGROUNDS.unicorns.aids='unicorns'
   when the background is ported — see backgrounds/README.md).
   A unicorn gallops the number line (rainbow trail, rainbow fireworks),
   and the counting jar becomes a crystal candy jar that fills with
   cupcakes; the chain garden grows sparkling crystal flowers. */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.unicorns=(()=>{

  // cupcake palette (strawberry, vanilla, mint, blueberry, lilac)
  const CC=[
    {wrap:'#E85FA8',frost:'#FFD2E8',top:'#FF4F8F'},
    {wrap:'#D8A030',frost:'#FFF2CE',top:'#FF6F91'},
    {wrap:'#2FA876',frost:'#D2F8E8',top:'#FF8FAB'},
    {wrap:'#4F7FD9',frost:'#D6E6FF',top:'#FFD166'},
    {wrap:'#9A5FD9',frost:'#EBD4FF',top:'#FF6F91'},
  ];
  // sparkling crystal flowers for the garden upgrade
  const CF=[
    {petal:'#FF8FAB',core:'#FFD700'},{petal:'#C77DFF',core:'#FFE066'},
    {petal:'#7DC4FF',core:'#FF8FAB'},{petal:'#8AE08A',core:'#FFD166'},
    {petal:'#FFD166',core:'#C77DFF'},
  ];

  return{
    numberLine:{
      icon:'🦄',rider:'🦄',
      hintAdd:'🦄 דְּהַר קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!',
      hintSub:'🦄 דְּהַר אָחוֹרָה עַל הַיְּשַׁר כְּעֶזֶר!',
      /* jump FX: rainbow trail, pink fairy dust, rainbow fireworks */
      fx:{
        colors:['#FF6F91','#FFD166','#8AE08A','#7DC4FF','#C77DFF'],
        dust:['#FFD2E8','#FFB7DB','#FFFFFF'],
        trail:'🌈',
        fireworksEvery:3,
      },
    },
    jar:{
      icon:'🧁',gardenIcon:'🌸',itemName:'קַאפְּקֵייקְס',
      hintAdd:'🧁 הוֹסֵף קַאפְּקֵייקְס כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'🧁 הָסֵר קַאפְּקֵייקְס כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      /* a removed cupcake bursts into pastel confetti */
      fx:{poof:['#FF9FCB','#FFD2E8','#C77DFF','#FFD166','#FFFFFF','#FFB7DB','#8AE08A','#7DC4FF']},
      // a faceted crystal candy jar with a pink dome lid and a heart knob
      containerSVG:
        `<svg class="ck-jar-bg" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">`+
        `<path d="M90,4 C84,12 84,16 90,20 C96,16 96,12 90,4 Z" fill="#FF5FA8"/>`+
        `<path d="M48,34 Q90,8 132,34 L132,40 L48,40 Z" fill="rgba(255,160,210,.55)" stroke="rgba(255,120,190,.7)" stroke-width="2"/>`+
        `<rect x="42" y="38" width="96" height="10" rx="5" fill="#E85FA8"/>`+
        `<path d="M36,48 Q24,58 22,76 L18,228 Q18,248 90,248 Q162,248 162,228 L158,76 Q156,58 144,48 Z" fill="rgba(255,210,235,.10)" stroke="rgba(255,170,215,.55)" stroke-width="2.5"/>`+
        `<path d="M52,48 L40,240 M90,48 L90,246 M128,48 L140,240" stroke="rgba(255,220,240,.18)" stroke-width="1.5"/>`+
        `<path d="M42,56 Q32,70 30,104 L28,200" stroke="rgba(255,255,255,.35)" stroke-width="6" fill="none" stroke-linecap="round"/>`+
        `<path d="M148,84 l2.4,5 5,2.4 -5,2.4 -2.4,5 -2.4,-5 -5,-2.4 5,-2.4 Z" fill="rgba(255,255,255,.7)"/>`+
        `<path d="M140,140 l1.6,3.4 3.4,1.6 -3.4,1.6 -1.6,3.4 -1.6,-3.4 -3.4,-1.6 3.4,-1.6 Z" fill="rgba(255,210,240,.6)"/>`+
        `<ellipse cx="90" cy="244" rx="75" ry="10" fill="rgba(232,95,168,.18)" stroke="rgba(255,170,215,.4)" stroke-width="1.5"/></svg>`,
      itemSVG(idx){
        const c=CC[idx%5];
        return`<svg viewBox="0 0 52 34">`+
          `<path d="M14,18 L38,18 L34,32 L18,32 Z" fill="${c.wrap}"/>`+
          `<path d="M19,18 L21,32 M26,18 L26,32 M33,18 L31,32" stroke="rgba(0,0,0,.18)" stroke-width="1.4"/>`+
          `<path d="M13,18 Q12,10 19,11 Q19,4 26,6 Q33,4 33,11 Q40,10 39,18 Z" fill="${c.frost}" stroke="rgba(0,0,0,.10)" stroke-width="1"/>`+
          `<circle cx="26" cy="5" r="3" fill="${c.top}"/>`+
          `<circle cx="25" cy="4" r="1" fill="rgba(255,255,255,.8)"/>`+
          `<circle cx="20" cy="14" r="1.1" fill="#FFD166"/>`+
          `<circle cx="29" cy="13" r="1.1" fill="#7DC4FF"/>`+
          `<circle cx="33" cy="15" r="1.1" fill="#8AE08A"/></svg>`;
      },
      gardenSVG(ci){
        const f=CF[ci%5];
        let petals='';
        for(let a=0;a<6;a++)
          petals+=`<g transform="rotate(${a*60} 20 22)"><path d="M20,22 L17,12 L20,6 L23,12 Z" fill="${f.petal}" opacity=".92"/></g>`;
        return `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">`+
          `<line x1="20" y1="38" x2="20" y2="56" stroke="#5E9E4E" stroke-width="3.5" stroke-linecap="round"/>`+
          petals+
          `<circle cx="20" cy="22" r="6" fill="${f.core}"/>`+
          `<circle cx="18" cy="20" r="1.8" fill="rgba(255,255,255,.7)"/>`+
          `<path d="M32,40 l1.6,3.4 3.4,1.6 -3.4,1.6 -1.6,3.4 -1.6,-3.4 -3.4,-1.6 3.4,-1.6 Z" fill="rgba(255,255,255,.75)"/></svg>`;
      },
    },
  };
})();
