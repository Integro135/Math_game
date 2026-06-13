/* ── Exercise type: COIN COUNTING (TC) — how much are the coins worth? ──────
   One file per exercise type; loaded dynamically per game mode.
   Contract: EXERCISES.types.<name> = { t, modes, make(mode) } plus the
   inject(arr, mode) hook the pool recipe uses to seed 1-2 coin problems
   into the standard pools. tcCoinSVG stays GLOBAL — the equation renderer
   (core.js) draws the coins with it.                                       */
window.EXERCISES=window.EXERCISES||{};window.EXERCISES.types=window.EXERCISES.types||{};

const TC_DEFS=[
  {v:1, r:32,rim:'#B87333',face:'#CD7F32',shine:'#E8A464',shadow:'#7A4010',text:'#3E1C00'},
  {v:2, r:35,rim:'#9E9E9E',face:'#BDBDBD',shine:'#E0E0E0',shadow:'#616161',text:'#1A1A1A',ring:'#C8860A'},
  {v:5, r:38,rim:'#78909C',face:'#90A4AE',shine:'#CFD8DC',shadow:'#455A64',text:'#0D1B21'},
  {v:10,r:42,rim:'#B8860B',face:'#DAA520',shine:'#FFE57F',shadow:'#7A5800',text:'#3E2800'},
];
const TC_MAP=Object.fromEntries(TC_DEFS.map(c=>[c.v,c]));
function tcCoinSVG(v){
  const c=TC_MAP[v];if(!c)return'';
  const {r,rim,face,shine,shadow,text,ring}=c;
  const d=r*2+8,cx=r+4,cy=r+4;const b2=v===2;
  let g=b2
    ?`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rim}" stroke="${shadow}" stroke-width="1.5"/>
       <circle cx="${cx}" cy="${cy}" r="${r*.72}" fill="${ring}"/>
       <circle cx="${cx}" cy="${cy}" r="${r*.66}" fill="#E8B84B"/>
       <circle cx="${cx}" cy="${cy}" r="${r*.6}"  fill="${ring}"/>`
    :`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rim}" stroke="${shadow}" stroke-width="1.5"/>
       <circle cx="${cx}" cy="${cy}" r="${r*.88}" fill="${face}"/>
       <circle cx="${cx}" cy="${cy}" r="${r*.78}" fill="${face}" stroke="${shadow}" stroke-width=".6" stroke-opacity=".4"/>`;
  g+=`<ellipse cx="${cx-r*.18}" cy="${cy-r*.25}" rx="${r*.32}" ry="${r*.18}" fill="${shine}" opacity=".55" transform="rotate(-25 ${cx-r*.18} ${cy-r*.25})"/>`;
  // milled edge dots
  for(let i=0;i<24;i++){const a=(i/24)*Math.PI*2;g+=`<circle cx="${Math.cos(a)*(r+1.5)+cx}" cy="${Math.sin(a)*(r+1.5)+cy}" r=".9" fill="${shadow}" opacity=".25"/>`;}
  const fs=v===10?r*.62:r*.7;
  g+=`<text x="${cx}" y="${cy+fs*.38}" text-anchor="middle" font-family="Fredoka One,cursive" font-size="${fs}" fill="${text}" font-weight="900" filter="url(#csf)">${v}</text>`;
  return`<div class="coin-wrap"><svg width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="csf" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="1" stdDeviation=".8" flood-color="${shadow}" flood-opacity=".6"/></filter></defs>${g}</svg><div class="coin-lbl">₪${v}</div></div>`;
}

window.EXERCISES.types.coins=(()=>{
  function makeCoinProblem(m){
    // mx (מַלְכָּה): sums up to 50, up to 7 coins, weighted toward 10 and 5
    if(m==='mx'){
      const weighted=[10,10,10,10,10,5,5,5,5,5,2,2,1,1];
      const maxN=7;
      for(let t=0;t<80;t++){
        const n=3+Math.floor(Math.random()*(maxN-2));  // 3..7 coins
        const cs=Array.from({length:n},()=>weighted[0|Math.random()*weighted.length]);
        const s=cs.reduce((a,b)=>a+b,0);
        if(s>=5&&s<=50)return{t:TC,coins:cs,correct:s};
      }
      return{t:TC,coins:[10,10,5],correct:25};
    }
    const mx=m===10?10:5;
    const vals=[1,2,5,10].filter(v=>v<=mx);
    const maxN=mx<=5?3:4;
    for(let t=0;t<80;t++){
      const n=3+Math.floor(Math.random()*(maxN-2));
      const cs=Array.from({length:n},()=>vals[0|Math.random()*vals.length]);
      const s=cs.reduce((a,b)=>a+b,0);
      if(s>=2&&s<=mx)return{t:TC,coins:cs,correct:s};
    }
    return{t:TC,coins:[1,1,1],correct:3};
  }
  return{
    t:TC,
    modes:[5,10,20,'mx'],
    make(mode){
      if(mode==='mx')return[makeCoinProblem('mx'),makeCoinProblem('mx')];
      return[];   // standard pools get coins via inject()
    },
    // guaranteed 1-2 coin problems; avoid first/last slot and TD slots
    inject(arr,m){
      if(!arr.length||m===0)return arr;
      const count=arr.length>=8?1+Math.floor(Math.random()*2):1;
      const used=new Set();let tries=0;
      while(used.size<count&&tries<80){
        const i=1+Math.floor(Math.random()*(arr.length-2));
        if(!used.has(i)&&(i+1)%4!==0){used.add(i);arr[i]=makeCoinProblem(m);}
        tries++;
      }
      return arr;
    },
  };
})();
