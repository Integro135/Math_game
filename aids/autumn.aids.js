/* ── Autumn aid variant — hedgehog number line + a basket of acorns ─────────
   For the autumn-grove background (BACKGROUNDS.autumn.aids='autumn').
   A HEDGEHOG trundles along the number line (a trail of fallen leaves, amber
   fireworks — echoing the scene's own hedgehog), and the counting jar becomes a
   wicker BASKET that fills with acorns and chestnuts; the chain garden grows
   little autumn saplings. Every field the variant omits falls back to classic
   (aids/README). */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.autumn=(()=>{

  // the gathered nuts: acorn (two browns), chestnut, a red acorn, a pale one — [cap, nut, stroke]
  const NUTS=[
    ['#8A5A2B','#C8955A','#6B4420'],['#6B4420','#B07A3C','#4E2F14'],['#5A3A1E','#8E4F27','#3E2611'],
    ['#9A3F22','#D4653A','#6E2A14'],['#A8782E','#E0B06A','#7A5420'],
  ];
  // sapling leaf colours for the chain garden (yellow, orange, red)
  const LEAF=[['#F7BE33','#FFD23F'],['#F07E22','#F5922B'],['#C73B27','#D6472A']];

  return{
    numberLine:{
      icon:'🦔',rider:'🦔',
      hintAdd:'🦔 רוּץ קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!',
      hintSub:'🦔 רוּץ אָחוֹרָה עַל הַיְּשַׁר כְּעֶזֶר!',
      /* jump FX: a leaf trail, warm dust, amber/orange/red fireworks */
      fx:{
        colors:['#FFD98A','#FFC14D','#F07E22','#C73B27'],
        dust:['#FFE9B8','#FFD98A','#FFFFFF'],
        trail:'🍂',
        fireworksEvery:3,
      },
    },
    jar:{
      icon:'🌰',gardenIcon:'🍁',itemName:'בַּלּוּטִים',
      hintAdd:'🌰 הוֹסֵף בַּלּוּטִים כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'🌰 הָסֵר בַּלּוּטִים כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      /* a removed acorn bursts into a flurry of leaves */
      fx:{poof:['#FFD23F','#F7BE33','#F5922B','#F07E22','#D6472A','#C73B27','#FFE9B8','#A8622C']},
      // a wicker basket: woven body, a rim, an arched handle, a few leaves at the foot
      containerSVG:
        `<svg class="ck-jar-bg" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">`+
        `<path d="M40,72 Q90,10 140,72" fill="none" stroke="#9A6A3A" stroke-width="8" stroke-linecap="round"/>`+
        `<path d="M40,72 Q90,16 140,72" fill="none" stroke="#C9955A" stroke-width="3" stroke-linecap="round" opacity=".7"/>`+
        `<path d="M28,78 L152,78 L136,244 Q136,252 90,252 Q44,252 44,244 Z" fill="#B8803F" stroke="#7A5020" stroke-width="3"/>`+
        `<g stroke="#7A5020" stroke-width="2" opacity=".45" fill="none">`+
        `<path d="M32,104 L148,104 M34,130 L146,130 M36,156 L144,156 M38,182 L142,182 M40,208 L140,208 M42,232 L138,232"/>`+
        `<path d="M50,80 L46,244 M70,80 L68,250 M90,80 L90,252 M110,80 L112,250 M130,80 L134,244"/></g>`+
        `<rect x="22" y="66" width="136" height="17" rx="8.5" fill="#D6A264" stroke="#7A5020" stroke-width="3"/>`+
        `<path d="M30,86 L34,238" stroke="rgba(255,236,200,.35)" stroke-width="6" stroke-linecap="round"/>`+
        `<ellipse cx="90" cy="248" rx="62" ry="8" fill="rgba(120,80,30,.25)"/>`+
        `<path d="M24,252 q6,-10 16,-4 q-8,2 -16,4 Z" fill="#F07E22"/><path d="M146,254 q4,-11 15,-6 q-7,3 -15,6 Z" fill="#F7BE33"/></svg>`,
      itemSVG(idx){
        const c=NUTS[idx%5];
        // an acorn: a scaly cap with a stalk over a smooth nut with a glint
        return`<svg viewBox="0 0 44 52">`+
          `<ellipse cx="22" cy="31" rx="13" ry="17" fill="${c[1]}" stroke="${c[2]}" stroke-width="1.6"/>`+
          `<path d="M7,20 Q22,8 37,20 L36,24 Q22,18 8,24 Z" fill="${c[0]}" stroke="${c[2]}" stroke-width="1.4"/>`+
          `<path d="M11,20 Q14,15 18,19 M18,17 Q22,12 26,17 M26,19 Q30,15 33,20" stroke="${c[2]}" stroke-width="1" fill="none" opacity=".7"/>`+
          `<rect x="20.5" y="5" width="3" height="8" rx="1.5" fill="${c[2]}"/>`+
          `<ellipse cx="16" cy="29" rx="2.4" ry="4" fill="rgba(255,244,220,.5)"/></svg>`;
      },
      gardenSVG(ci){
        const g=LEAF[ci%3];
        return `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">`+
          `<path d="M20,56 L20,24" stroke="#7A5020" stroke-width="4" stroke-linecap="round"/>`+
          `<path d="M20,36 L10,28 M20,30 L30,22" stroke="#7A5020" stroke-width="3" stroke-linecap="round"/>`+
          `<ellipse cx="20" cy="16" rx="11" ry="12" fill="${g[0]}"/>`+
          `<ellipse cx="9" cy="26" rx="6" ry="5" fill="${g[1]}"/><ellipse cx="31" cy="20" rx="6" ry="5" fill="${g[1]}"/>`+
          `<ellipse cx="15" cy="12" rx="4" ry="3" fill="rgba(255,240,200,.45)"/>`+
          `<path d="M4,54 q5,-8 12,-3 q-6,1 -12,3 Z" fill="${g[1]}"/></svg>`;
      },
    },
  };
})();
