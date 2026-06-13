/* ── Space aid variant — rocket number line + an asteroid capsule ───────────
   Loaded dynamically with the space background (BACKGROUNDS.space.aids).
   A rocket flies the number line instead of the kangaroo (cool blue exhaust
   trail + neon fireworks), and the counting jar becomes a glass capsule
   that fills with rocky asteroids; the chain garden grows little ringed
   planets instead of flowers. */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.space=(()=>{

  // rocky asteroid palette (gray, sandy, slate, dusky, mossy)
  const AST=[
    {base:'#8A8A92',dark:'#5C5C66',lite:'#B8B8C2'},
    {base:'#9C8872',dark:'#6E5C48',lite:'#C8B49A'},
    {base:'#7E8C9C',dark:'#54616E',lite:'#AEC0D2'},
    {base:'#94789A',dark:'#64506A',lite:'#C2A6C8'},
    {base:'#8C9C84',dark:'#5E6E58',lite:'#BCCAB2'},
  ];
  // little ringed planets for the garden upgrade
  const PL=[
    {body:'#FFB46B',ring:'#FFE0A8'},{body:'#7DC4FF',ring:'#CFE9FF'},
    {body:'#C77DFF',ring:'#EBD4FF'},{body:'#6FE8C8',ring:'#D2FFF4'},
    {body:'#FF8FB8',ring:'#FFD6E6'},
  ];

  return{
    numberLine:{
      icon:'🚀',rider:'🚀',
      hintAdd:'🚀 טוּס קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!',
      hintSub:'🚀 טוּס אָחוֹרָה עַל הַיְּשַׁר כְּעֶזֶר!',
      /* jump FX: cool exhaust trail, starry dust, neon fireworks */
      fx:{
        colors:['#7DC4FF','#C77DFF','#FFE9A8','#6FE8C8'],
        dust:['#9FB4E8','#CFEAFF','#FFFFFF'],
        trail:'✦',
        fireworksEvery:3,
      },
    },
    jar:{
      icon:'☄️',gardenIcon:'🪐',itemName:'אַסְטֶרוֹאִידִים',
      hintAdd:'☄️ הוֹסֵף אַסְטֶרוֹאִידִים כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'☄️ הָסֵר אַסְטֶרוֹאִידִים כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      /* removed-asteroid poof shatters into rock shards */
      fx:{poof:['#8A8A92','#B8B8C2','#9C8872','#5C5C66','#AEC0D2','#94789A','#7E8C9C','#6E5C48']},
      // a glass space-capsule: domed lid with antenna, frosty body, soft base
      containerSVG:
        `<svg class="ck-jar-bg" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">`+
        `<line x1="90" y1="2" x2="90" y2="14" stroke="#9FB4E8" stroke-width="3" stroke-linecap="round"/>`+
        `<circle cx="90" cy="4" r="4" fill="#FFD27D"/>`+
        `<path d="M46,30 Q90,2 134,30 L134,34 L46,34 Z" fill="rgba(140,170,255,.35)" stroke="rgba(170,200,255,.6)" stroke-width="2"/>`+
        `<rect x="40" y="32" width="100" height="10" rx="5" fill="#4A5FA8"/>`+
        `<path d="M34,42 Q22,50 20,68 L16,228 Q16,248 90,248 Q164,248 164,228 L160,68 Q158,50 146,42 Z" fill="rgba(120,160,255,.10)" stroke="rgba(140,180,255,.5)" stroke-width="2.5"/>`+
        `<path d="M40,52 Q30,66 28,100 L26,200" stroke="rgba(210,230,255,.35)" stroke-width="6" fill="none" stroke-linecap="round"/>`+
        `<circle cx="146" cy="70" r="2" fill="rgba(255,255,255,.7)"/>`+
        `<circle cx="138" cy="100" r="1.4" fill="rgba(255,255,255,.5)"/>`+
        `<circle cx="150" cy="130" r="1.7" fill="rgba(199,125,255,.6)"/>`+
        `<ellipse cx="90" cy="244" rx="75" ry="10" fill="rgba(90,120,220,.25)" stroke="rgba(140,170,255,.35)" stroke-width="1.5"/></svg>`,
      itemSVG(idx){
        const a=AST[idx%5];
        return`<svg viewBox="0 0 52 36">`+
          `<ellipse cx="26" cy="19" rx="23" ry="14" fill="${a.dark}" opacity=".3"/>`+
          `<path d="M9,20 L13,10 L24,5 L38,7 L46,15 L44,25 L33,31 L17,30 Z" fill="${a.base}" stroke="${a.dark}" stroke-width="1.5" stroke-linejoin="round"/>`+
          `<circle cx="20" cy="14" r="3.4" fill="${a.dark}" opacity=".8"/>`+
          `<circle cx="33" cy="22" r="2.6" fill="${a.dark}" opacity=".7"/>`+
          `<circle cx="27" cy="11" r="1.6" fill="${a.dark}" opacity=".6"/>`+
          `<path d="M13,10 L24,5 L38,7" stroke="${a.lite}" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
      },
      gardenSVG(ci){
        const p=PL[ci%5];
        return `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">`+
          `<line x1="20" y1="38" x2="20" y2="56" stroke="#7C88C8" stroke-width="3" stroke-linecap="round" opacity=".7"/>`+
          `<circle cx="20" cy="22" r="12" fill="${p.body}"/>`+
          `<circle cx="16" cy="18" r="3.2" fill="rgba(255,255,255,.35)"/>`+
          `<circle cx="25" cy="27" r="2.2" fill="rgba(0,0,0,.15)"/>`+
          `<ellipse cx="20" cy="24" rx="18" ry="5" fill="none" stroke="${p.ring}" stroke-width="2.5" transform="rotate(-18 20 24)"/></svg>`;
      },
    },
  };
})();
