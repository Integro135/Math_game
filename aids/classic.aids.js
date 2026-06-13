/* ── Classic aid variant — kangaroo number line + cookie jar ────────────────
   Loaded dynamically by game/js/bg-loader.js (the default variant).
   The engine in game/js/aids.js is generic; files like this one supply ALL
   the art: the number-line rider, the jar container, the counted items, the
   garden-upgrade items, menu icons and the hint texts. */
window.AIDS=window.AIDS||{};window.AIDS.variants=window.AIDS.variants||{};
window.AIDS.variants.classic=(()=>{

  const CK=[
    {base:'#D2691E',chip:'#3E1C00',edge:'#A0522D',name:'choc'},
    {base:'#F5DEB3',chip:'#8B4513',edge:'#DEB887',name:'sugar'},
    {base:'#1C1008',chip:'#FFF',   edge:'#2C1810',name:'oreo'},
    {base:'#C8860A',chip:'#5C2800',edge:'#A07010',name:'ginger'},
    {base:'#F0C060',chip:'#E83060',edge:'#D4A840',name:'sprinkles'},
  ];
  const GN_PETAL  =['#FF8FAB','#FFD60A','#C77DFF','#FF7F50','#74C0FC'];
  const GN_CENTER =['#FFD700','#FF6B35','#FFD700','#FFD700','#F8D000'];
  const GN_INNER  =['#FFA000','#E65100','#B388FF','#FF5722','#1565C0'];
  const GN_STEM   =['#388E3C','#2E7D32','#6A1B9A','#BF360C','#0D47A1'];

  return{
    numberLine:{
      icon:'🦘',rider:'🦘',
      hintAdd:'🦘 קְפַץ קָדִימָה עַל הַיְּשַׁר כְּעֶזֶר!',
      hintSub:'🦘 קְפַץ אָחוֹר עַל הַיְּשַׁר כְּעֶזֶר!',
      /* jump FX: golden sparkle trail, sandy dust, warm fireworks */
      fx:{
        colors:['#FFD700','#FF8C42','#FF5FA8','#8AE08A'],
        dust:['#C8A050','#A07840','#E8C878'],
        trail:'✨',
        fireworksEvery:3,
      },
    },
    jar:{
      icon:'🍪',gardenIcon:'🌻',itemName:'עוּגִיּוֹת',
      hintAdd:'🍪 הוֹסֵף עוּגִיּוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      hintSub:'🍪 הָסֵר עוּגִיּוֹת כְּעֶזֶר, וְאָז כְּתוֹב אֶת הַתְּשׁוּבָה בָּרִיבּוּעַ!',
      containerSVG:
        `<svg class="ck-jar-bg" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">`+
        `<rect x="30" y="10" width="120" height="22" rx="6" fill="#8B6914"/>`+
        `<rect x="34" y="10" width="112" height="18" rx="5" fill="#A0791C"/>`+
        `<rect x="42" y="6" width="96" height="12" rx="4" fill="#7A5810"/>`+
        `<path d="M30,32 Q20,38 18,55 L14,230 Q14,248 90,248 Q166,248 166,230 L162,55 Q160,38 150,32 Z" fill="rgba(200,180,140,.14)" stroke="rgba(220,180,100,.45)" stroke-width="2.5"/>`+
        `<path d="M36,40 Q28,55 26,90 L24,200" stroke="rgba(255,255,255,.28)" stroke-width="6" fill="none" stroke-linecap="round"/>`+
        `<ellipse cx="90" cy="244" rx="75" ry="10" fill="rgba(160,120,60,.25)" stroke="rgba(200,160,80,.3)" stroke-width="1.5"/></svg>`,
      itemSVG(idx){
        const c=CK[idx%5];
        const ch=c.name==='oreo'
          ?`<ellipse cx="26" cy="10" rx="14" ry="5" fill="#333" opacity=".8"/><circle cx="20" cy="10" r="2" fill="#fff" opacity=".9"/><circle cx="26" cy="10" r="2" fill="#fff" opacity=".9"/><circle cx="32" cy="10" r="2" fill="#fff" opacity=".9"/>`
          :c.name==='sprinkles'
          ?`<rect x="16" y="6" width="6" height="3" rx="1.5" fill="#E91E63" transform="rotate(-20 16 6)"/><rect x="26" y="4" width="6" height="3" rx="1.5" fill="#2196F3" transform="rotate(15 26 4)"/><rect x="34" y="8" width="6" height="3" rx="1.5" fill="#4CAF50" transform="rotate(-10 34 8)"/>`
          :`<circle cx="18" cy="8" r="3" fill="${c.chip}"/><circle cx="28" cy="6" r="2.5" fill="${c.chip}"/><circle cx="34" cy="11" r="3" fill="${c.chip}"/>`;
        return`<svg viewBox="0 0 52 20"><ellipse cx="26" cy="11" rx="24" ry="9" fill="${c.edge}"/><ellipse cx="26" cy="10" rx="23" ry="8" fill="${c.base}"/>${ch}<ellipse cx="20" cy="6" rx="6" ry="3" fill="rgba(255,255,255,.15)" transform="rotate(-15 20 6)"/></svg>`;
      },
      gardenSVG(ci){
        const p=GN_PETAL[ci%5],c=GN_CENTER[ci%5],inn=GN_INNER[ci%5],st=GN_STEM[ci%5];
        let petals='';for(let a=0;a<5;a++)petals+=`<g transform="rotate(${a*72} 20 22)"><ellipse cx="20" cy="12" rx="6" ry="10" fill="${p}" opacity=".92"/></g>`;
        return `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg"><line x1="20" y1="40" x2="20" y2="56" stroke="${st}" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="27" cy="47" rx="8" ry="4" fill="#66BB6A" transform="rotate(-35 27 47)" opacity=".85"/>${petals}<circle cx="20" cy="22" r="8" fill="${c}"/><circle cx="20" cy="22" r="5" fill="${inn}"/><circle cx="17" cy="19" r="2.2" fill="rgba(255,255,255,.36)"/></svg>`;
      },
    },
  };
})();
