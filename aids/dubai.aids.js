/* ── Dubai aid variant — helicopter number line + a crystal vault ───────────
   For the Dubai-skyline background (BACKGROUNDS.dubai_skyline.aids='dubai'
   when the background is ported — see backgrounds/README.md).
   A helicopter flies the number line (golden shimmer trail, warm amber
   fireworks like the Burj shows), and the counting jar is a frosted glass
   jar (styled like the space capsule, amber-tinted) that fills with
   faceted gemstones; the chain garden grows palm trees. */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.dubai=(()=>{

  // faceted-gem palette (topaz, ruby, sapphire, emerald, amethyst)
  const GEM=[
    {base:'#FFB54D',dark:'#C8821E',lite:'#FFE3A8'},
    {base:'#FF6F91',dark:'#C83E64',lite:'#FFC2D2'},
    {base:'#7DC4FF',dark:'#3E7EC8',lite:'#D6EBFF'},
    {base:'#6FE8C8',dark:'#2E9E84',lite:'#CFFFF0'},
    {base:'#C77DFF',dark:'#8E3EC8',lite:'#EBD4FF'},
  ];
  // palm trees for the garden upgrade
  const PLM=[
    {frond:'#3E9E5C',trunk:'#8E6234'},{frond:'#2E8E78',trunk:'#7A5428'},
    {frond:'#5EAE46',trunk:'#9A6E3C'},{frond:'#3E8EA0',trunk:'#86602E'},
    {frond:'#6EA436',trunk:'#8E6234'},
  ];

  return{
    numberLine:{
      icon:'🚁',rider:'🚁',
      hintAdd:'🚁 טוּס קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!',
      hintSub:'🚁 טוּס אָחוֹרָה עַל הַיְּשַׁר כְּעֶזֶר!',
      /* jump FX: golden shimmer trail, desert dust, warm amber fireworks */
      fx:{
        colors:['#FFD27D','#FFB54D','#FF8C42','#FFE9A8'],
        dust:['#E8C878','#C8A050','#FFE0A8'],
        trail:'✨',
        fireworksEvery:3,
      },
    },
    jar:{
      icon:'💎',gardenIcon:'🌴',itemName:'קְרִיסְטַלִּים',
      hintAdd:'💎 הוֹסֵף קְרִיסְטַלִּים כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'💎 הָסֵר קְרִיסְטַלִּים כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      /* a removed gem shatters into jewel-toned sparkles */
      fx:{poof:['#FFB54D','#FF6F91','#7DC4FF','#6FE8C8','#C77DFF','#FFE3A8','#FFFFFF','#C8961E']},
      // a frosted glass jar (space-capsule style) with a golden lid + finial
      containerSVG:
        `<svg class="ck-jar-bg" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">`+
        `<line x1="90" y1="2" x2="90" y2="14" stroke="#C8961E" stroke-width="3" stroke-linecap="round"/>`+
        `<circle cx="90" cy="4" r="4" fill="#FFD27D"/>`+
        `<path d="M46,30 Q90,2 134,30 L134,34 L46,34 Z" fill="rgba(255,210,140,.40)" stroke="rgba(255,220,150,.7)" stroke-width="2"/>`+
        `<rect x="40" y="32" width="100" height="10" rx="5" fill="#C8961E"/>`+
        `<path d="M34,42 Q22,50 20,68 L16,228 Q16,248 90,248 Q164,248 164,228 L160,68 Q158,50 146,42 Z" fill="rgba(255,220,150,.10)" stroke="rgba(255,210,140,.5)" stroke-width="2.5"/>`+
        `<path d="M40,52 Q30,66 28,100 L26,200" stroke="rgba(255,248,225,.35)" stroke-width="6" fill="none" stroke-linecap="round"/>`+
        `<circle cx="146" cy="70" r="2" fill="rgba(255,255,255,.7)"/>`+
        `<circle cx="138" cy="100" r="1.4" fill="rgba(255,244,210,.5)"/>`+
        `<circle cx="150" cy="130" r="1.7" fill="rgba(255,215,120,.6)"/>`+
        `<ellipse cx="90" cy="244" rx="75" ry="10" fill="rgba(200,150,30,.22)" stroke="rgba(255,210,140,.35)" stroke-width="1.5"/></svg>`,
      itemSVG(idx){
        const g=GEM[idx%5];
        return`<svg viewBox="0 0 52 36">`+
          `<ellipse cx="26" cy="32" rx="14" ry="3" fill="${g.dark}" opacity=".22"/>`+
          `<path d="M19,7 L33,7 L40,15 L26,33 L12,15 Z" fill="${g.base}" stroke="${g.dark}" stroke-width="1.2" stroke-linejoin="round"/>`+
          `<path d="M19,7 L22,11 L19,15 L12,15 Z" fill="${g.dark}" opacity=".38"/>`+
          `<path d="M33,7 L30,11 L33,15 L40,15 Z" fill="${g.lite}" opacity=".55"/>`+
          `<path d="M22,11 L30,11 L33,15 L19,15 Z" fill="${g.lite}"/>`+
          `<path d="M12,15 L26,33 L19,15 Z" fill="${g.dark}" opacity=".5"/>`+
          `<path d="M40,15 L26,33 L33,15 Z" fill="${g.dark}" opacity=".32"/>`+
          `<path d="M19,15 L33,15 L26,20 Z" fill="${g.base}"/>`+
          `<circle cx="24" cy="10" r="1.4" fill="rgba(255,255,255,.9)"/></svg>`;
      },
      gardenSVG(ci){
        const p=PLM[ci%5];
        let fronds='';
        for(let a=0;a<5;a++){
          const ang=-90+(a-2)*38;
          fronds+=`<path d="M20,22 Q${20+Math.cos(ang*Math.PI/180)*14},${22+Math.sin(ang*Math.PI/180)*14-4} ${20+Math.cos(ang*Math.PI/180)*22},${22+Math.sin(ang*Math.PI/180)*16+2}" stroke="${p.frond}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
        }
        return `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">`+
          `<path d="M20,56 Q18,40 20,24" stroke="${p.trunk}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`+
          `<path d="M16,50 L24,50 M16.5,42 L23.5,42 M17,34 L23,34" stroke="rgba(0,0,0,.18)" stroke-width="1.6"/>`+
          fronds+
          `<circle cx="17" cy="25" r="2.4" fill="#C8961E"/>`+
          `<circle cx="23" cy="26" r="2.4" fill="#A87808"/></svg>`;
      },
    },
  };
})();
