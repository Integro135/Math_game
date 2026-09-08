/* ── Dubai skyline background v2 ────────────────────────────────────────────
   Dubai at dusk, recreated from scratch — the same 1600×900 design space
   (waterline y=780), cover-fitted & bottom-anchored, with every element of the
   original kept and the CITY REDRAWN: a layered dusk sky with lit cirrus and a
   crescent moon; a hazy far skyline; towers with two-face 3-D massing, glass
   sheen, floor banding, mullions, podiums with lit shopfronts and detailed
   crowns; and the hallmarks built with care — the BURJ KHALIFA's rounded
   setback lobes, banded glass and needle spire over the Dubai Mall lake, the
   BURJ AL ARAB's white exoskeleton sail with its glowing atrium wall, helipad
   and Al Muntaha restaurant on its own island, the wave-shaped JUMEIRAH BEACH
   HOTEL beside it, the twisting CAYAN tower, the EMIRATES TOWERS, the torus
   MUSEUM OF THE FUTURE with its calligraphy, the golden DUBAI FRAME, the
   ADDRESS towers and Sky View bridge, and the AIN DUBAI wheel over the water,
   all mirrored in rippled water.
   Kept (same constants, same cadence): Burj LED show, fireworks, fountain
   choreography, oil gusher, drone light show + ≤5 crossing drones, per-tower
   accent schemes, switching windows, light-waves, twinkles + shooting stars,
   beacons, helicopters (searchlight + the Burj Al Arab helipad shuttle),
   aircraft, birds, dolphins, the boat fleet (dhow/yacht/abra/speedboat), crane
   + gondola, dusk→night cycle, thunderstorm, missile-defense show, moon and
   museum click FX, and every click reaction. Docs: backgrounds/README.md.
   Loaded on demand by game/js/bg-loader.js; registers BACKGROUNDS.dubai2. */
window.BACKGROUNDS=window.BACKGROUNDS||{};
window.BACKGROUNDS.dubai2={
  skin:'dubai',                 // game look:  game/skins/dubai.skin.css
  aids:'dubai',                 // aid art:    aids/dubai.aids.js (heli line + vault + palms)
  init({stage}){
  var stopped=false;
  stage.innerHTML='';stage.style.overflow='hidden';
  var cv = document.createElement('canvas');
  cv.style.cssText='position:fixed;inset:0;width:100%;height:100%';
  stage.appendChild(cv);
  var ctx = cv.getContext('2d');
  var off = document.createElement('canvas'), og = off.getContext('2d');

  /* Design space: 1600x900, waterline at y=780. Burj Khalifa near the right end,
     the sunset glow low on the left-center, the Burj Al Arab far left. */
  var DW = 1600, DH = 900, HZ = 780, SUNX = 560, SUNY = 772;
  var BX = 1330, BS = 1.44;           /* Burj Khalifa center x, scale */

  /* Burj LED light show: ~22 s once every 3 minutes; gentle twinkles in between */
  var SHOW_PERIOD = 180, SHOW_LEN = 22, SHOW_OFFSET = 172; /* first show ~8 s after load */
  /* Fireworks: a 5 s burst once every 2 minutes */
  var FW_PERIOD = 120, FW_LEN = 5, FW_OFFSET = 112;      /* first burst ~8 s after load */
  /* Fountain show: 30 s once every 3:30 minutes */
  var FN_PERIOD = 210, FN_LEN = 30, FN_OFFSET = 204;     /* first show ~6 s after load */

  function rnd(a,b){ return a + Math.random()*(b-a); }
  function lerpC(a,b,t){ return [a[0]+(b[0]-a[0])*t|0, a[1]+(b[1]-a[1])*t|0, a[2]+(b[2]-a[2])*t|0]; }
  function rgb(c,a){ return 'rgba('+c[0]+','+c[1]+','+c[2]+','+(a===undefined?1:a)+')'; }
  function lgrad(g, x0,y0,x1,y1, stops){ var gr = g.createLinearGradient(x0,y0,x1,y1); for (var i=0;i<stops.length;i++) gr.addColorStop(stops[i][0], stops[i][1]); return gr; }
  function rgrad(g, x,y,r0,r1, stops){ var gr = g.createRadialGradient(x,y,r0,x,y,r1); for (var i=0;i<stops.length;i++) gr.addColorStop(stops[i][0], stops[i][1]); return gr; }

  /* ───────────────────────── scene data (generated once) ───────────────────────── */

  var STARS = [], CLOUDS = [], FAR = [], FAR2 = [], BIRDS = [];
  var TWK = [], BEACONS = [], RIPPLES = [], SPARKS = [], BURJ_LIGHTS = [];

  for (var i = 0; i < 360; i++)
    STARS.push({ x: rnd(0,DW), y: rnd(0,600), r: rnd(.3,1.0), a: rnd(.25,.95) });
  for (i = 0; i < 84; i++){
    var st = STARS[(Math.random()*STARS.length)|0];
    var warm = Math.random() < .15;
    TWK.push({ x: st.x, y: st.y, r: .5 + Math.random()*1.1,
               c: warm ? '255,236,205' : (Math.random() < .5 ? '255,255,255' : '205,222,255'),
               sp: rnd(.7,2.2), ph: rnd(0,6.28), big: Math.random() < .22 });
  }
  /* cirrus: long soft streaks; the low ones catch the sunset from below */
  for (i = 0; i < 11; i++){
    var cy = i < 6 ? rnd(280,520) : rnd(560,660);
    CLOUDS.push({ x: rnd(40,DW-40), y: cy, w: rnd(160,420), h: rnd(8,20), a: rnd(.16,.36),
                  warm: cy > 540, skew: rnd(-.08,.08) });
  }
  /* two hazy far-skyline layers behind the city */
  for (i = 0; i < 30; i++) FAR.push({ x: i*54 + rnd(-20,20), w: rnd(22,70), h: rnd(24,105), spire: Math.random() < .3 });
  for (i = 0; i < 40; i++) FAR2.push({ x: i*41 + rnd(-16,16), w: rnd(18,54), h: rnd(14,60) });

  for (i = 0; i < 7; i++)
    BIRDS.push({ x: rnd(0,DW), y: rnd(230,440), s: rnd(.8,1.5),
                 vx: (Math.random()<.5?-1:1)*(10+Math.random()*16),
                 bob: rnd(0,6.28), flap: rnd(0,6.28), flapSp: 6+Math.random()*4 });

  for (i = 0; i < 380; i++){
    var ry = rnd(HZ+3, DH-2);
    RIPPLES.push({ x: rnd(0,DW), y: ry, w: rnd(8,110), a: rnd(.1,.5),
                   light: Math.random() < .42, deep: (ry-HZ)/(DH-HZ) });
  }
  for (i = 0; i < 34; i++)
    SPARKS.push({ x: SUNX + rnd(-1,1)*rnd(0,70), y: HZ + 4 + Math.pow(Math.random(),1.6)*95,
                  len: rnd(2,8), sp: rnd(1.5,4.5), ph: rnd(0,6.28) });

  /* ── buildings (left → right; later in list = drawn in front). Each has a glass
     STYLE (palette) and its own animated light scheme (anim). Positions/heights are
     the original composition, so the crane, gondola and click zones line up. ── */
  var STYLE = {
    blue:   { base:[24,38,66],  tint:[80,120,180],  warm:[255,160,90]  },
    navy:   { base:[18,28,52],  tint:[60,95,150],   warm:[255,150,80]  },
    teal:   { base:[16,44,58],  tint:[70,150,160],  warm:[255,170,100] },
    bronze: { base:[50,36,28],  tint:[170,120,75],  warm:[255,180,100] },
    silver: { base:[46,54,72],  tint:[160,175,200], warm:[255,190,130] },
    sand:   { base:[82,68,54],  tint:[210,180,140], warm:[255,200,140] }
  };
  var BUILDINGS = [
    { kind:'jbh',   x:14,   h:78 },                                                    /* Jumeirah Beach Hotel (wave) */
    { kind:'burjalarab', x:110, h:205, anim:{ type:'sail',  hue0:200, hueSp:8, sp:.35 } },
    { kind:'box', x:205,  w:34, h:150, crown:'flat',  style:'navy',
      anim:{ type:'crown', hue0:30,  hueSp:5,  sp:.5 } },
    { kind:'cayan', x:250, w:46, h:235, style:'silver', anim:{ type:'twist', hue0:180, hueSp:10, sp:.45 } },
    { kind:'box', x:308,  w:36, h:185, crown:'spire', spire:26, style:'blue',
      anim:{ type:'edges', hue0:280, hueSp:8,  sp:.3 } },
    { kind:'box', x:352,  w:52, h:282, crown:'dome',  style:'sand',                     /* Princess Tower */
      anim:{ type:'crown', hue0:140, hueSp:4,  sp:.25 } },
    { kind:'box', x:412,  w:46, h:300, crown:'spire', spire:40, style:'silver',         /* Marina 101 */
      anim:{ type:'scan',  hue0:330, hueSp:12, scanV:10 } },
    { kind:'box', x:466,  w:38, h:165, crown:'flat',  style:'teal',
      anim:{ type:'pulse', hue0:45,  hueSp:3,  sp:.3 } },
    { kind:'box', x:520,  w:42, h:130, crown:'flat',  style:'bronze',
      anim:{ type:'edges', hue0:120, hueSp:7,  sp:.5 } },
    { kind:'box', x:650,  w:62, h:245, crown:'emir1', style:'silver',                   /* Emirates Tower 1 */
      anim:{ type:'crown', hue0:210, hueSp:5,  sp:.4 } },
    { kind:'box', x:727,  w:54, h:200, crown:'emir2', style:'silver',                   /* Emirates Tower 2 */
      anim:{ type:'crown', hue0:60,  hueSp:9,  sp:.6 } },
    { kind:'museum', x:600, h:92, anim:{ type:'museum', hue0:160, hueSp:6, sp:.35 } },
    { kind:'box', x:798,  w:40, h:262, crown:'flat',  style:'navy',                     /* Index */
      anim:{ type:'scan',  hue0:0,   hueSp:15, scanV:14 } },
    { kind:'frame', x:860, w:78, h:172, anim:{ type:'frame', hue0:42, hueSp:0, sp:.4 } },
    { kind:'box', x:955,  w:44, h:190, crown:'slantL', style:'teal',
      anim:{ type:'pulse', hue0:300, hueSp:4,  sp:.4 } },
    { kind:'box', x:1012, w:40, h:158, crown:'flat',  style:'bronze',
      anim:{ type:'edges', hue0:20,  hueSp:10, sp:.55 } },
    { kind:'box', x:1070, w:44, h:228, crown:'spire', spire:30, style:'blue',
      anim:{ type:'scan',  hue0:240, hueSp:7,  scanV:8 } },
    { kind:'box', x:1150, w:56, h:292, crown:'sail',  style:'sand',                     /* Address Downtown */
      anim:{ type:'crown', hue0:28,  hueSp:3,  sp:.3 } },
    { kind:'twin', x:1440, w:38, gap:22, h:235, style:'blue',                           /* Address Sky View */
      anim:{ type:'bridge', hue0:190, hueSp:8, sp:.45 } },
    { kind:'box', x:1555, w:40, h:150, crown:'flat',  style:'navy',
      anim:{ type:'pulse', hue0:90,  hueSp:6,  sp:.35 } }
  ];

  /* windows: part static (prerendered), part slowly switching on/off per building.
     They start a clear gap below the roof so none pokes into / above the crown */
  var CROWN_PAD = { emir1:46, emir2:46, sail:58, dome:8, slantL:18, slantR:18, spire:8, flat:8 };
  function genBoxWindows(b, x0, w, h){
    var win = [], dyn = [];
    var pad = (CROWN_PAD[b.crown] || 8) + Math.max(18, h*0.09);
    var left = x0+3, top = HZ - h + pad;
    var cols = Math.max(2, ((w-6)/5.5)|0);
    var rows = Math.max(0, (((HZ - 8) - top)/8.5)|0);
    for (var r = 0; r < rows; r++){
      var floorLit = Math.random() < .06;
      for (var c = 0; c < cols; c++){
        if (!floorLit && Math.random() > .38) continue;
        var wx = left + c*5.5 + 1, wy = top + r*8.5;
        var p = Math.random();
        var col = p < .70 ? '255,196,120' : (p < .88 ? '198,218,255' : '255,238,196');
        var q = Math.random();
        if (q < .06)
          TWK.push({ x:wx+1.4, y:wy+1.8, r:1.5, c:col, sp:rnd(.3,1.1), ph:rnd(0,6.28) });
        else if (q < .42)
          dyn.push({ x:wx, y:wy, c:col, a:rnd(.35,.95), sp:rnd(.03,.15), ph:rnd(0,6.28) });
        else
          win.push({ x:wx, y:wy, c:col, a:rnd(.3,.95) });
      }
    }
    b.win = win; b.dyn = dyn;
  }

  BUILDINGS.forEach(function(b){
    b.st = STYLE[b.style] || STYLE.blue;
    b.c = b.st.base;
    if (b.kind === 'box'){
      genBoxWindows(b, b.x, b.w, b.h);
      if (b.crown === 'flat'){ b.mech = Math.random() < .7; b.ant = Math.random() < .5; }
      b.face = 0.22 + Math.random()*0.1;                     /* how much of the width the side face takes */
    } else if (b.kind === 'twin'){
      genBoxWindows(b, b.x, b.w, b.h);
      var b2 = { };
      genBoxWindows(b2, b.x + b.w + b.gap, b.w, b.h - 14);
      b.win2 = b2.win; b.dyn = b.dyn.concat(b2.dyn);
    } else if (b.kind === 'cayan'){
      b.win = [];
      for (var k = 0; k < 70; k++)
        b.win.push({ x: b.x + rnd(5, b.w-7), y: HZ - rnd(10, b.h-14), c:'255,200,130', a: rnd(.25,.8) });
    }
  });

  /* red aviation beacons on the tallest towers (+ the Burj Al Arab mast), derived from the massing */
  BUILDINGS.forEach(function(b, i){
    if (b.kind === 'box' && b.h >= 225){
      var top = HZ - b.h - (b.crown === 'spire' ? (b.spire||24) : (b.crown === 'dome' ? b.w/2 + 12 : (b.crown === 'sail' ? 24 : 6)));
      BEACONS.push({ x: b.x + b.w/2 + (b.crown === 'spire' || b.crown === 'dome' || b.crown === 'sail' ? 0 : b.w*.18), y: top - 2, r:1.5, sp: 1.6 + (i%4)*.23, ph: i*1.4 });
    }
  });
  BEACONS.push({ x:114.5, y:HZ-205-24, r:1.5, sp:1.95, ph:2 });

  /* ── Burj Khalifa stepped massing (elevation tiers, units rel. to center) ── */
  var BR = [[0,36.4,15.6],[20.8,10.4,58.5],[15.6,10.4,97.5],[10.4,10.4,148.2],
            [5.2,10.4,210.6],[0,10.4,253.5],[0,7.8,276.9],[0,6.24,300.3],
            [0,4.68,331.5],[0,3.12,362.7],[0,1.56,390]];
  var BL = [[-33.8,33.8,15.6],[-28.6,10.4,70.2],[-23.4,10.4,113.1],[-18.2,10.4,175.5],
            [-13,10.4,234],[-7.8,7.8,261.3],[-4.68,4.68,284.7],[-3.12,3.12,312],
            [-1.56,1.56,347.1]];
  var BRANGES = [[3,15,-33.8,36.4],[18,57,-28.6,31.2],[60,69,-28.6,26],[72,96,-23.4,26],
    [99,111,-23.4,20.8],[114,147,-18.2,20.8],[150,174,-18.2,15.6],[177,210,-13,15.6],
    [213,234,-13,10.4],[237,252,-7.8,10.4],[255,261,-7.8,7.8],[264,276,-4.68,7.8],
    [279,282,-4.68,6.24],[285,300,-3.12,6.24],[303,312,-3.12,4.68],[315,330,-1.56,4.68],
    [333,345,-1.56,3.12],[348,360,0,3.12],[363,390,0,1.56]];

  function burjEdgesAt(h){
    for (var k = 0; k < BRANGES.length; k++)
      if (h >= BRANGES[k][0] && h <= BRANGES[k][1])
        return [BRANGES[k][2], BRANGES[k][3]];
    return [0, 0];
  }

  for (i = 0; i < 190; i++){
    var rr = BRANGES[(Math.random()*BRANGES.length)|0];
    var bx = BX + rnd(rr[2], rr[3])*BS, by = HZ - rnd(rr[0], rr[1])*BS;
    var pp = Math.random();
    var bc = pp < .68 ? '255,200,125' : (pp < .9 ? '205,222,255' : '255,240,205');
    if (Math.random() < .12)
      TWK.push({ x:bx, y:by, r: rnd(.7,1.4), c:bc, sp:rnd(.25,1), ph:rnd(0,6.28) });
    else
      BURJ_LIGHTS.push({ x:bx, y:by, r: rnd(.55,1.3), c:bc, a: rnd(.3,.95) });
  }
  BEACONS.push({ x:BX, y:HZ-456*BS, r:2.3, sp:2.6, ph:0 });
  BEACONS.push({ x:BX, y:HZ-415*BS, r:1.4, sp:2.6, ph:2.1 });

  /* big warm-yellow lights all over the Burj, switching on and off whenever the LED show is off */
  var BURJ_YEL = [];
  for (i = 0; i < 42; i++){
    var yr = BRANGES[(Math.random()*BRANGES.length)|0];
    BURJ_YEL.push({ x: BX + rnd(yr[2], yr[3])*BS, y: HZ - rnd(yr[0], yr[1])*BS,
                    r: rnd(1.6, 2.7), sp: rnd(.15, .6), ph: rnd(0, 6.28) });
  }

  /* ── Dubai Fountain jets on the lake in front of the Burj ── */
  var FN = [];
  for (i = 0; i < 19; i++)
    FN.push({ x: 1185 + i*15, i: i, y: HZ + 10 + (i%3)*2.5, h: 0, swPh: rnd(0,6.28),
              Hmax: 52 + 46*Math.sin(Math.PI*i/18) + (i===9 ? 22 : 0) });

  /* ── helicopters crossing the sky + patrolling drones ── */
  var HELIS = [
    { y:215, sp:55, dir: 1, off:   0, s: 1.8 },
    { y:330, sp:38, dir:-1, off: 480, s: 1.4, beam: true },
    { y:120, sp:70, dir: 1, off: 900, s: 1.1 }
  ];
  var CROSS_MAX = 5;
  var CROSS = [];
  for (i = 0; i < CROSS_MAX; i++)
    CROSS.push({ active: false, wait: rnd(0, 14), x: 0, y: 0, dir: 1, sp: 40,
                 s: 1.7, hue: 0, by: 8, bsp: 1, bph: 0, p1: 0, p2: 0 });

  /* ── Drone light show: a squadron flies IN, forms TWO shapes, flies OUT ── */
  var DRONE_PERIOD = 150, DRONE_LEN = 14, DRONE_OFFSET = 132;  /* first show ~18 s after load */
  var MDRONE_LEN = 14;
  var SHOW_N = 18;
  var SHOW = [];
  for (i = 0; i < SHOW_N; i++)
    SHOW.push({ px: 0, py: 0, s: rnd(1.5,2.0), hue: (i*53) % 360,
                jx: rnd(0,6.28), jy: rnd(0,6.28), p1: rnd(0,6.28), p2: rnd(0,6.28),
                t0x: 0, t0y: 0, t1x: 0, t1y: 0 });
  var DCX = 295, DCY = 350;
  var dShowStart = -99, dShowLen = DRONE_LEN, dPrevEnv = 0, dCurSlot = -1, dShapeHue = 190, dMorphStart = -99;
  var dShowShapes = [0, 1];
  var mDroneStart = -99, mDroneEnd = -99;
  var DSHAPES = [ { gen: ringPts,    hue: 190 }, { gen: heartPts,  hue: 332 },
                  { gen: starPts,    hue: 45  }, { gen: squarePts, hue: 265 },
                  { gen: spirePts,   hue: 30  }, { gen: diamondPts, hue: 150 } ];
  var POPS = [];

  var SHOOT = [], nextShootAt = 0;

  /* the torus Museum of the Future (x≈600) — each click emits an expanding light ring */
  var MUSEUM = { cx: 600, cy: HZ - 50, rx: 42, ry: 48 };
  var MFX = [], mfxHue = 200;

  /* ── Ain Dubai: the giant observation wheel over the water, left of center ── */
  var AW_X = 410, AW_Y = 618, AW_R = 120, AW_BASE_W = 0.18;
  var awAngle = 0, awBoostStart = -99;

  /* ── the fleet: up to 3 boats at once (dhow / yacht / abra / speedboat) ── */
  var BOATW = [];
  var BOAT_TYPES = ['dhow', 'yacht', 'abra', 'speedboat'];
  var BOAT_CFG = {
    dhow:      { spMin: 22, spVar: 14, half: 58, sternX: -46, lights: [[50,-6,'120,235,150'],[-44,-8,'255,90,80'],[4,-55,'255,250,235']] },
    yacht:     { spMin: 38, spVar: 16, half: 64, sternX: -52, lights: [[58,-9,'120,235,150'],[-54,-9,'255,90,80'],[6,-34,'255,250,235']] },
    abra:      { spMin: 20, spVar: 10, half: 44, sternX: -36, lights: [[36,-7,'120,235,150'],[-34,-7,'255,90,80']] },
    speedboat: { spMin: 62, spVar: 26, half: 40, sternX: -30, lights: [[36,-8,'120,235,150'],[-28,-7,'255,90,80']] }
  };
  var BOATS = [];
  for (i = 0; i < 3; i++)
    BOATS.push({ on: false, wait: i*5 + rnd(0, 7), x: 0, y: 0, dir: 1, sp: 0,
                 ph: 0, type: 'dhow', blinkUntil: -99, _on: false, _x: 0, _y: 0, _half: 50 });

  /* ── "Dubai under construction": a tower crane on a mid building + a window-cleaning gondola ── */
  var CRANE = { bx: 485, roofY: HZ - 165, mastH: 116, jib: 98, cjib: 34, sp: 0.12 };
  var GOND  = { x: 1190, roofY: HZ - 292, low: HZ - 40 };

  /* ── slow dusk→night→dusk cycle ── */
  var DAY_PERIOD = 200, DAY_OFFSET = 0;
  var nightFactor = 0, LIGHT_GAIN = 1;

  /* ── rare desert thunderstorm ── */
  var STORM_LEN = 12;
  var STORM = { env: 0, start: null, nextAt: null, nextBolt: 0, bolts: [], flashT: -99, flashMag: 0 };

  /* ───────────────────────── static rendering ───────────────────────── */

  var scale = 1, ox = 0, oy = 0;

  function drawWindows(g, list){
    for (var k = 0; k < list.length; k++){
      var w = list[k];
      g.fillStyle = 'rgba('+w.c+','+w.a+')';
      g.fillRect(w.x, w.y, 3.2, 4.2);
    }
  }

  /* ── the sky: banded dusk, sun glow, stars, moon with earthshine, lit cirrus ── */
  function drawSky(){
    og.fillStyle = lgrad(og, 0,0,0,HZ, [
      [0,'#03071a'],[.18,'#08132f'],[.36,'#142850'],[.50,'#264472'],[.60,'#436490'],
      [.68,'#7b7f9f'],[.75,'#ad8a8c'],[.82,'#d4906a'],[.89,'#f0a052'],[.95,'#f9bf68'],[1,'#fcd68f']]);
    og.fillRect(0, 0, DW, HZ);
    og.fillStyle = rgrad(og, SUNX, SUNY, 0, 560, [[0,'rgba(255,165,75,.34)'],[.5,'rgba(255,150,70,.12)'],[1,'rgba(255,160,70,0)']]);
    og.fillRect(0, 0, DW, HZ);
    og.fillStyle = rgrad(og, SUNX, SUNY, 0, 160, [[0,'rgba(255,220,150,.7)'],[1,'rgba(255,214,135,0)']]);
    og.fillRect(0, 0, DW, HZ);
    /* dust haze band above the horizon */
    og.fillStyle = lgrad(og, 0,560,0,HZ, [[0,'rgba(240,170,120,0)'],[1,'rgba(240,170,120,.22)']]);
    og.fillRect(0, 560, DW, HZ-560);

    for (var k = 0; k < STARS.length; k++){
      var st = STARS[k];
      var a = st.a * Math.max(0, Math.min(1, (560 - st.y)/420));
      if (a <= 0) continue;
      og.fillStyle = 'rgba(215,228,255,'+a+')';
      og.fillRect(st.x, st.y, st.r, st.r);
    }

    /* crescent moon with faint earthshine on the dark side */
    og.fillStyle = rgrad(og, 300,140,0,70, [[0,'rgba(240,232,210,.28)'],[1,'rgba(240,232,210,0)']]);
    og.fillRect(220, 60, 160, 160);
    og.fillStyle = 'rgba(200,205,225,.16)';
    og.beginPath(); og.arc(300, 140, 23, 0, 6.2832); og.fill();
    og.fillStyle = lgrad(og, 277,117,323,163, [[0,'#fff8e6'],[1,'#e2d8bc']]);
    og.beginPath(); og.arc(300, 140, 23, 0, 6.2832); og.fill();
    og.fillStyle = '#0a1736';
    og.beginPath(); og.arc(309, 133, 21, 0, 6.2832); og.fill();
    og.fillStyle = 'rgba(200,205,225,.14)';
    og.beginPath(); og.arc(309, 133, 21, 0, 6.2832); og.fill();

    /* cirrus streaks — layered soft ellipses, the low ones lit orange from below */
    for (k = 0; k < CLOUDS.length; k++){
      var c = CLOUDS[k];
      og.save(); og.translate(c.x, c.y); og.rotate(c.skew);
      og.fillStyle = c.warm ? 'rgba(110,58,54,'+c.a+')' : 'rgba(40,40,72,'+(c.a*.5)+')';
      og.beginPath();
      og.ellipse(0, 0, c.w/2, c.h/2, 0, 0, 6.2832);
      og.ellipse(-c.w*.3, c.h*.2, c.w*.3, c.h*.36, 0, 0, 6.2832);
      og.ellipse(c.w*.28, c.h*.1, c.w*.26, c.h*.32, 0, 0, 6.2832);
      og.fill();
      og.fillStyle = c.warm ? 'rgba(255,160,90,'+(c.a*.9)+')' : 'rgba(245,150,95,'+(c.a*.45)+')';
      og.beginPath(); og.ellipse(0, c.h*.44, c.w*.46, 1.6, 0, 0, 6.2832); og.fill();
      og.fillStyle = c.warm ? 'rgba(255,220,170,'+(c.a*.35)+')' : 'rgba(255,200,160,'+(c.a*.2)+')';
      og.beginPath(); og.ellipse(c.w*.1, c.h*.5, c.w*.28, 1, 0, 0, 6.2832); og.fill();
      og.restore();
    }
  }

  /* two layers of far towers dissolving into the haze */
  function drawFar(){
    for (var k = 0; k < FAR2.length; k++){
      var f2 = FAR2[k];
      og.fillStyle = rgb(lerpC([215,150,118], [120,95,120], Math.min(1, f2.h/60)), .55);
      og.fillRect(f2.x, HZ - f2.h - 4, f2.w, f2.h + 4);
    }
    for (k = 0; k < FAR.length; k++){
      var f = FAR[k];
      var c = lerpC([200,138,110], [70,62,94], Math.min(1, f.h/120));
      og.fillStyle = rgb(c, .82);
      og.fillRect(f.x, HZ - f.h, f.w, f.h);
      if (f.spire){ og.fillRect(f.x + f.w/2 - .8, HZ - f.h - 14, 1.6, 14); }
      og.fillStyle = 'rgba(255,190,120,.25)';                  /* a few far windows */
      for (var w = 0; w < f.h/14; w++) if (Math.random() < .5) og.fillRect(f.x + rnd(2, f.w-4), HZ - f.h + 6 + w*12, 1.6, 2);
    }
    og.fillStyle = lgrad(og, 0,620,0,HZ, [[0,'rgba(244,170,110,0)'],[1,'rgba(244,170,110,.32)']]);
    og.fillRect(0, 620, DW, 160);
  }

  /* ── the generic tower: two-face massing, glass sheen, floor banding, mullions,
     a lit podium, and a detailed crown ── */
  function faceGrad(x, w, st, litLeft){
    var dark = lerpC(st.base, [0,0,0], .42), bright = lerpC(st.base, st.tint, .55), warm = lerpC(st.base, st.warm, .45);
    return litLeft ? lgrad(og, x,0,x+w,0, [[0,rgb(warm)],[.25,rgb(bright)],[.7,rgb(st.base)],[1,rgb(dark)]])
                   : lgrad(og, x,0,x+w,0, [[0,rgb(dark)],[.3,rgb(st.base)],[.75,rgb(bright)],[1,rgb(warm)]]);
  }
  function towerBody(b, x, w, h, inset){
    var st = b.st, y0 = HZ - h + inset, bh = h - inset;
    var litLeft = x + w/2 > SUNX;                   /* the face toward the low sun is lit */
    var fw = w*(1 - (b.face||.25)), sx = litLeft ? x + fw : x, sw = w - fw, mx = litLeft ? x : x + sw;
    /* main (front) face */
    og.fillStyle = faceGrad(mx, fw, st, litLeft); og.fillRect(mx, y0, fw, bh);
    /* side face — darker, receding */
    og.fillStyle = lgrad(og, sx,0,sx+sw,0, litLeft
      ? [[0,rgb(lerpC(st.base,[0,0,0],.35))],[1,rgb(lerpC(st.base,[0,0,0],.62))]]
      : [[0,rgb(lerpC(st.base,[0,0,0],.62))],[1,rgb(lerpC(st.base,[0,0,0],.35))]]);
    og.fillRect(sx, y0, sw, bh);
    /* glass sheen: cool sky reflection up top, warm horizon reflection low */
    og.fillStyle = lgrad(og, 0,y0,0,HZ, [[0,'rgba(150,185,230,.14)'],[.45,'rgba(120,150,200,.04)'],[.82,'rgba(255,170,95,.10)'],[1,'rgba(255,150,70,.20)']]);
    og.fillRect(x, y0, w, bh);
    /* floor banding + mullions */
    og.fillStyle = 'rgba(0,0,0,.20)';
    for (var yy = y0 + 7; yy < HZ - 4; yy += 7) og.fillRect(x, yy, w, .8);
    og.fillStyle = 'rgba(255,255,255,.045)';
    for (var xx = mx + 5.5; xx < mx + fw - 1; xx += 5.5) og.fillRect(xx, y0, .7, bh);
    /* corner highlight where the faces meet */
    og.fillStyle = 'rgba(255,225,190,.35)'; og.fillRect(litLeft ? x + fw - .6 : x + sw - .6, y0, 1.2, bh);
    /* parapet light line */
    og.fillStyle = 'rgba(255,190,120,.28)'; og.fillRect(x, y0, w, 1.4);
    /* podium with lit shopfronts */
    og.fillStyle = rgb(lerpC(st.base,[0,0,0],.5));
    og.fillRect(x - 3, HZ - 11, w + 6, 11);
    og.fillStyle = 'rgba(255,205,130,.55)';
    for (var px = x - 1; px < x + w + 1; px += 6) og.fillRect(px, HZ - 8, 3.2, 4.5);
  }
  function drawCrown(b, x, w, y0){
    var st = b.st, light = rgb(lerpC(st.base, st.tint, .6)), dark = rgb(lerpC(st.base,[0,0,0],.4));
    switch (b.crown){
      case 'slantR':
        og.fillStyle = light; og.beginPath(); og.moveTo(x, y0+18); og.lineTo(x+w, y0); og.lineTo(x+w, y0+18); og.closePath(); og.fill();
        og.strokeStyle = 'rgba(255,220,180,.5)'; og.lineWidth = 1; og.beginPath(); og.moveTo(x, y0+18); og.lineTo(x+w, y0); og.stroke(); break;
      case 'slantL':
        og.fillStyle = light; og.beginPath(); og.moveTo(x, y0); og.lineTo(x+w, y0+18); og.lineTo(x, y0+18); og.closePath(); og.fill();
        og.strokeStyle = 'rgba(255,220,180,.5)'; og.lineWidth = 1; og.beginPath(); og.moveTo(x, y0); og.lineTo(x+w, y0+18); og.stroke(); break;
      case 'emir1':                                    /* Emirates Office Tower: the tall sloped triangular cap */
        og.fillStyle = lgrad(og, x,0,x+w,0, [[0,dark],[.62,light],[1,dark]]);
        og.beginPath(); og.moveTo(x, y0+46); og.lineTo(x+w*.62, y0); og.lineTo(x+w, y0+28); og.lineTo(x+w, y0+46); og.closePath(); og.fill();
        og.strokeStyle = 'rgba(255,225,190,.6)'; og.lineWidth = 1.1; og.beginPath(); og.moveTo(x, y0+46); og.lineTo(x+w*.62, y0); og.lineTo(x+w, y0+28); og.stroke();
        og.fillStyle = '#c8d2e0'; og.fillRect(x+w*.62-.8, y0-20, 1.6, 20); break;
      case 'emir2':
        og.fillStyle = lgrad(og, x,0,x+w,0, [[0,dark],[.4,light],[1,dark]]);
        og.beginPath(); og.moveTo(x, y0+24); og.lineTo(x+w*.4, y0); og.lineTo(x+w, y0+40); og.lineTo(x, y0+40); og.closePath(); og.fill();
        og.strokeStyle = 'rgba(255,225,190,.6)'; og.lineWidth = 1.1; og.beginPath(); og.moveTo(x, y0+24); og.lineTo(x+w*.4, y0); og.lineTo(x+w, y0+40); og.stroke();
        og.fillStyle = '#c8d2e0'; og.fillRect(x+w*.4-.8, y0-14, 1.6, 14); break;
      case 'dome':                                     /* Princess Tower: shaded dome + lantern */
        og.fillStyle = rgrad(og, x+w*.38, y0-w*.15, 1, w*.7, [[0,rgb(lerpC(st.base,st.tint,.8))],[1,dark]]);
        og.beginPath(); og.arc(x+w/2, y0+2, w/2, Math.PI, 0); og.fill();
        og.strokeStyle = 'rgba(255,220,180,.35)'; og.lineWidth = 1; og.beginPath(); og.arc(x+w/2, y0+2, w/2 - 1, Math.PI*1.05, Math.PI*1.75); og.stroke();
        og.fillStyle = '#c8d2e0'; og.fillRect(x+w/2-1, y0-w/2-14, 1.8, 16);
        og.fillStyle = 'rgba(255,205,130,.6)'; og.fillRect(x+w/2-3, y0-w/2+2, 6, 2); break;
      case 'sail':                                     /* Address Downtown: the curved sail crown */
        og.fillStyle = lgrad(og, x,0,x+w,0, [[0,dark],[.5,light],[1,dark]]);
        og.beginPath(); og.moveTo(x, y0+58); og.quadraticCurveTo(x+w*.3, y0+8, x+w*.52, y0);
        og.quadraticCurveTo(x+w*.74, y0+8, x+w, y0+58); og.closePath(); og.fill();
        og.strokeStyle = 'rgba(255,225,190,.55)'; og.lineWidth = 1.2;
        og.beginPath(); og.moveTo(x, y0+58); og.quadraticCurveTo(x+w*.3, y0+8, x+w*.52, y0); og.quadraticCurveTo(x+w*.74, y0+8, x+w, y0+58); og.stroke();
        og.fillStyle = '#c8d2e0'; og.fillRect(x+w*.52-.8, y0-24, 1.6, 26); break;
      case 'spire':                                    /* tapered spire with a lit tip */
        og.fillStyle = lgrad(og, 0,y0-(b.spire||24),0,y0, [[0,'#e6ecf4'],[1,'#8f9db0']]);
        og.beginPath(); og.moveTo(x+w/2-2.4, y0); og.lineTo(x+w/2+2.4, y0); og.lineTo(x+w/2+.5, y0-(b.spire||24)); og.lineTo(x+w/2-.5, y0-(b.spire||24)); og.closePath(); og.fill();
        og.fillStyle = light; og.fillRect(x+w*.3, y0-6, w*.4, 6); break;
      default:                                         /* flat roof: mechanical penthouse + antennas */
        og.fillStyle = dark;
        if (b.mech){ og.fillRect(x+w*.2, y0-7, w*.42, 7); og.fillStyle = 'rgba(255,200,120,.5)'; og.fillRect(x+w*.24, y0-4.5, w*.34, 1.6); og.fillStyle = dark; }
        if (b.ant){ og.fillRect(x+w*.68, y0-15, 1.4, 15); og.fillRect(x+w*.68-2, y0-9, 5.4, .9); }
    }
  }
  function drawBoxBody(b, x, w, h){
    var y0 = HZ - h;
    var inset = ['emir1','emir2','dome','sail'].indexOf(b.crown) >= 0 ?
                (b.crown === 'sail' ? 58 : (b.crown === 'dome' ? 0 : 46)) : 0;
    towerBody(b, x, w, h, inset);
    drawCrown(b, x, w, y0);
  }

  /* ── Burj Al Arab: the sail on its island — white exoskeleton frame, the glowing
     atrium wall, blue glass flank, helipad disc and the Al Muntaha restaurant ── */
  function sailPath(g, x, top, h){
    g.beginPath();
    g.moveTo(x, HZ);
    g.quadraticCurveTo(x-3, HZ-h*.55, x+5, top+8);
    g.quadraticCurveTo(x+64, top+44, x+74, HZ);
    g.closePath();
  }
  function drawBurjAlArab(b){
    var x = b.x, h = b.h, top = HZ - h;
    og.fillStyle = rgrad(og, x+34, HZ-h*.45, 0, h*.9, [[0,'rgba(220,235,255,.12)'],[1,'rgba(220,235,255,0)']]);
    og.fillRect(x-120, top-70, 300, h+80);

    /* its island, sea wall and the causeway bridge to the shore */
    og.fillStyle = '#141d33';
    og.beginPath(); og.moveTo(x-34, HZ+5); og.lineTo(x-26, HZ-6); og.lineTo(x+92, HZ-6); og.lineTo(x+100, HZ+5); og.closePath(); og.fill();
    og.fillStyle = 'rgba(70,86,116,.8)'; og.fillRect(x-26, HZ-7, 118, 1.4);
    og.strokeStyle = 'rgba(66,82,112,.95)'; og.lineWidth = 2.6;
    og.beginPath(); og.moveTo(x+96, HZ-1); og.quadraticCurveTo(x+146, HZ+.5, x+196, HZ+3); og.stroke();
    for (var pl = 0; pl < 5; pl++){ og.strokeStyle = 'rgba(50,62,90,.9)'; og.lineWidth = 1.2; og.beginPath(); og.moveTo(x+108+pl*20, HZ-.5+pl*.5); og.lineTo(x+108+pl*20, HZ+6); og.stroke(); }
    for (var bl = 0; bl < 8; bl++){
      og.fillStyle = 'rgba(255,205,130,'+rnd(.5,.9)+')';
      og.fillRect(x-22 + bl*16, HZ-9, 1.6, 1.8);
      if (bl < 6) og.fillRect(x+102 + bl*16, HZ-4 + bl*.6, 1.4, 1.4);
    }
    /* mast */
    og.fillStyle = '#d3dde9';
    og.beginPath(); og.moveTo(x+2, top+16); og.lineTo(x+6, top+16); og.lineTo(x+5.2, top-24); og.lineTo(x+3.8, top-24); og.closePath(); og.fill();
    /* the sail: white fabric with a faint sky sheen */
    og.fillStyle = lgrad(og, x,0,x+74,0, [[0,'#f6f9fc'],[.45,'#e6eef6'],[.8,'#cfdbe8'],[1,'#c9b9a4']]);
    sailPath(og, x, top, h); og.fill();
    /* the blue glass curtain wall down the middle, reflecting the dusk */
    og.fillStyle = lgrad(og, 0,top+30,0,HZ, [[0,'#8dbde6'],[.4,'#4f83bd'],[.75,'#2f5c90'],[1,'#3d5b7c']]);
    og.beginPath(); og.moveTo(x+9, top+30); og.quadraticCurveTo(x+46, top+60, x+52, HZ-8); og.lineTo(x+14, HZ-8);
    og.quadraticCurveTo(x+7, HZ-h*.55, x+9, top+30); og.closePath(); og.fill();
    og.fillStyle = 'rgba(240,250,255,.22)';                    /* sky sheen */
    og.beginPath(); og.moveTo(x+10, top+34); og.quadraticCurveTo(x+30, top+58, x+34, HZ-30); og.lineTo(x+24, HZ-30);
    og.quadraticCurveTo(x+12, HZ-h*.55, x+10, top+34); og.closePath(); og.fill();
    /* the atrium's fabric wall — warm glow leaking through, banded by floors */
    og.fillStyle = 'rgba(255,214,150,.12)';
    og.beginPath(); og.moveTo(x+30, top+40); og.quadraticCurveTo(x+58, top+70, x+62, HZ-10); og.lineTo(x+46, HZ-10);
    og.quadraticCurveTo(x+44, top+70, x+30, top+40); og.closePath(); og.fill();
    for (var yy = top+26; yy < HZ-8; yy += 6.5){
      var tt = (yy-top)/h, wAt = (4 + tt*62)*.92;
      og.strokeStyle = 'rgba(240,248,255,'+(0.12+tt*.16)+')'; og.lineWidth = 1;
      og.beginPath(); og.moveTo(x+4, yy); og.quadraticCurveTo(x+4+wAt*.5, yy+1.6, x+4+wAt, yy-1); og.stroke();
    }
    /* the white exoskeleton: X-braces along the billowing trailing edge */
    og.strokeStyle = 'rgba(255,255,255,.75)'; og.lineWidth = 1.3;
    for (var sgm = 0; sgm < 9; sgm++){
      var u0 = sgm/9, u1 = (sgm+1)/9;
      var ex0 = x+5 + (x+74-(x+5))*u0*u0*.9 + 6*u0, ey0 = top+8 + (HZ-top-8)*u0;
      var ex1 = x+5 + (x+74-(x+5))*u1*u1*.9 + 6*u1, ey1 = top+8 + (HZ-top-8)*u1;
      og.beginPath(); og.moveTo(ex0, ey0); og.lineTo(ex1-9, ey1); og.moveTo(ex0-9, ey0); og.lineTo(ex1, ey1); og.stroke();
    }
    og.strokeStyle = 'rgba(255,240,215,.6)'; og.lineWidth = 1.3;   /* trailing-edge rim light */
    og.beginPath(); og.moveTo(x+5, top+8); og.quadraticCurveTo(x+64, top+44, x+74, HZ); og.stroke();
    og.strokeStyle = 'rgba(120,145,175,.55)'; og.lineWidth = 1;    /* leading-edge seam */
    og.beginPath(); og.moveTo(x, HZ); og.quadraticCurveTo(x-3, HZ-h*.55, x+5, top+8); og.stroke();
    /* helipad on its cantilevered arm (left) */
    og.strokeStyle = '#96aac0'; og.lineWidth = 1.6;
    og.beginPath(); og.moveTo(x+3, top+46); og.lineTo(x-12, top+37); og.stroke();
    og.fillStyle = '#2f3c55'; og.beginPath(); og.ellipse(x-12, top+36, 15, 3.6, 0, 0, 6.2832); og.fill();
    og.fillStyle = '#c9d6e4'; og.beginPath(); og.ellipse(x-12, top+35, 15, 3.4, 0, 0, 6.2832); og.fill();
    og.strokeStyle = 'rgba(90,220,140,.8)'; og.lineWidth = .8; og.beginPath(); og.ellipse(x-12, top+35, 9, 2, 0, 0, 6.2832); og.stroke();
    og.fillStyle = 'rgba(90,220,140,.95)'; og.fillRect(x-12.8, top+33.4, 1.6, 1.6);
    /* Al Muntaha — the restaurant cantilevered off the trailing side */
    og.fillStyle = '#b9c8d8'; og.beginPath(); og.ellipse(x+46, top+52, 11, 3.2, 0, 0, 6.2832); og.fill();
    og.fillStyle = 'rgba(255,212,150,.75)'; og.fillRect(x+38, top+53, 16, 1.2);
    og.fillStyle = '#7f92a8'; og.fillRect(x+40, top+55, 12, 1.4);
  }

  /* ── Jumeirah Beach Hotel: the breaking-wave low-rise next door ── */
  function drawJBH(b){
    var x = b.x, h = b.h, top = HZ - h;
    og.fillStyle = lgrad(og, x,0,x+84,0, [[0,'#5d7595'],[.5,'#8ea6c4'],[1,'#42587a']]);
    og.beginPath();
    og.moveTo(x, HZ); og.lineTo(x, top+30);
    og.quadraticCurveTo(x+18, top-6, x+44, top+4);
    og.quadraticCurveTo(x+70, top+14, x+84, top+40);
    og.lineTo(x+84, HZ); og.closePath(); og.fill();
    og.strokeStyle = 'rgba(255,255,255,.55)'; og.lineWidth = 1.2;
    og.beginPath(); og.moveTo(x, top+30); og.quadraticCurveTo(x+18, top-6, x+44, top+4); og.quadraticCurveTo(x+70, top+14, x+84, top+40); og.stroke();
    og.fillStyle = 'rgba(255,205,140,.45)';
    for (var yy = top+22; yy < HZ-8; yy += 7) og.fillRect(x+6, yy, 70, 1.2);
    og.fillStyle = 'rgba(255,215,150,.65)';
    for (var k = 0; k < 24; k++) og.fillRect(x + 8 + (k%8)*9, top + 26 + (k/8|0)*14, 3, 3);
  }

  /* ── Cayan Tower: the 90° twist, read as helical facets ── */
  function cayanCurves(g, b){
    var x = b.x, w = b.w, h = b.h;
    for (var k = 0; k <= 5; k++){
      var ya = HZ - h*k/5.5, yb = HZ - h*(k+1.4)/5.5;
      g.beginPath(); g.moveTo(x+3, ya); g.bezierCurveTo(x+w*.35, ya-8, x+w*.65, yb+8, x+w-3, yb); g.stroke();
    }
  }
  function drawCayan(b){
    var x = b.x, w = b.w, h = b.h, y0 = HZ - h, st = b.st;
    og.save();
    og.beginPath(); og.moveTo(x, HZ); og.lineTo(x+4, y0); og.lineTo(x+w-4, y0); og.lineTo(x+w, HZ); og.closePath(); og.clip();
    og.fillStyle = rgb(st.base); og.fillRect(x, y0, w, h);
    /* twisted floor plates: the facet boundary sweeps across the width as it climbs */
    var N = 40;
    for (var k = 0; k < N; k++){
      var u0 = k/N, u1 = (k+1)/N, ya = HZ - h*u0, yb = HZ - h*u1;
      var s0 = Math.sin(u0*Math.PI*.5*2), s1 = Math.sin(u1*Math.PI*.5*2);   /* 90° twist over the height */
      var bx0 = x + w*(.5 + .42*Math.cos(u0*Math.PI)), bx1 = x + w*(.5 + .42*Math.cos(u1*Math.PI));
      var litL = .45 + .45*Math.cos(u0*Math.PI);
      og.fillStyle = rgb(lerpC(st.base, st.tint, .25 + .45*litL));
      og.beginPath(); og.moveTo(x, ya); og.lineTo(bx0, ya); og.lineTo(bx1, yb); og.lineTo(x, yb); og.closePath(); og.fill();
      og.fillStyle = rgb(lerpC(st.base, [0,0,0], .15 + .4*litL));
      og.beginPath(); og.moveTo(bx0, ya); og.lineTo(x+w, ya); og.lineTo(x+w, yb); og.lineTo(bx1, yb); og.closePath(); og.fill();
      og.fillStyle = 'rgba(0,0,0,.18)'; og.fillRect(x, ya-.4, w, .8);
      og.fillStyle = 'rgba(255,235,205,.28)'; og.fillRect(bx0-.5, yb, 1, ya-yb+.5);
    }
    og.fillStyle = lgrad(og, 0,y0,0,HZ, [[0,'rgba(150,185,230,.16)'],[.8,'rgba(255,170,95,.10)'],[1,'rgba(255,150,70,.18)']]);
    og.fillRect(x, y0, w, h);
    og.strokeStyle = 'rgba(205,222,255,.14)'; og.lineWidth = 1.4;
    cayanCurves(og, b);
    og.restore();
    og.save();                                        /* windows clipped to the tapered tower outline */
    og.beginPath(); og.moveTo(x, HZ); og.lineTo(x+4, y0); og.lineTo(x+w-4, y0); og.lineTo(x+w, HZ); og.closePath(); og.clip();
    drawWindows(og, b.win); og.restore();
    og.fillStyle = 'rgba(255,180,110,.3)'; og.fillRect(x+4, y0, w-8, 1.5);
    og.fillStyle = rgb(lerpC(st.base,[0,0,0],.5)); og.fillRect(x-3, HZ-11, w+6, 11);
    og.fillStyle = 'rgba(255,205,130,.55)'; for (var px = x; px < x+w; px += 6) og.fillRect(px, HZ-8, 3.2, 4.5);
  }

  function drawTwin(b){
    drawBoxBody({ st:b.st, c:b.c, crown:'flat', mech:true, face:.26 }, b.x, b.w, b.h);
    drawBoxBody({ st:b.st, c:b.c, crown:'flat', ant:true, face:.26 }, b.x + b.w + b.gap, b.w, b.h - 14);
    /* the Sky View bridge + its glass observation deck */
    var bx = b.x + b.w - 2, bw = b.gap + 4, by = HZ - b.h + 10;
    og.fillStyle = rgb(lerpC(b.c, b.st.tint, .45)); og.fillRect(bx, by, bw, 10);
    og.fillStyle = 'rgba(160,200,255,.45)'; og.fillRect(bx+2, by+2, bw-4, 5);
    og.fillStyle = 'rgba(255,215,150,.6)'; og.fillRect(bx, by+9, bw, 1.2);
    og.save(); og.beginPath(); og.rect(b.x, HZ - b.h, b.w, b.h); og.clip();
    drawWindows(og, b.win); og.restore();
    og.save(); og.beginPath(); og.rect(b.x + b.w + b.gap, HZ - (b.h - 14), b.w, b.h - 14); og.clip();
    drawWindows(og, b.win2); og.restore();
  }

  /* ── Museum of the Future: the upright torus with its calligraphy, on its green mound ── */
  function drawMuseum(b){
    var cx = b.x, cy = HZ - b.h/2 - 4, rx = 42, ry = 48;
    og.fillStyle = '#1e3a2e';                                   /* the landscaped mound */
    og.beginPath(); og.ellipse(cx, HZ-2, 64, 9, 0, 0, 6.2832); og.fill();
    og.fillStyle = lgrad(og, cx-rx,0,cx+rx,0, [[0,'#4a5a76'],[.4,'#8a97ad'],[.7,'#6c7a94'],[1,'#33405a']]);
    og.beginPath(); og.ellipse(cx, cy, rx, ry, -.06, 0, 6.2832); og.fill();
    /* the oval void through the torus — sky shows through */
    og.fillStyle = lgrad(og, 0,cy-22,0,cy+24, [[0,'#7f83a4'],[1,'#d89368']]);
    og.beginPath(); og.ellipse(cx-3, cy+2, 15, 22, -.06, 0, 6.2832); og.fill();
    og.strokeStyle = 'rgba(30,38,58,.8)'; og.lineWidth = 2; og.beginPath(); og.ellipse(cx-3, cy+2, 15, 22, -.06, 0, 6.2832); og.stroke();
    /* flowing calligraphy windows glowing warm */
    og.save(); og.beginPath(); og.ellipse(cx, cy, rx-1, ry-1, -.06, 0, 6.2832); og.clip();
    og.strokeStyle = 'rgba(255,214,150,.55)'; og.lineWidth = 1.5; og.lineCap = 'round';
    for (var k = 0; k < 9; k++){
      var t = -.85 + k*.21, yk = cy + t*40;
      og.beginPath(); og.moveTo(cx-40, yk);
      og.bezierCurveTo(cx-20, yk - 6 + Math.sin(k)*4, cx+4, yk + 5 + Math.cos(k*1.3)*4, cx+24, yk - 3);
      og.quadraticCurveTo(cx+34, yk - 6, cx+40, yk + 2); og.stroke();
      og.fillStyle = 'rgba(255,225,170,.7)'; og.fillRect(cx - 34 + (k*13)%60, yk - 3, 1.6, 1.6);
    }
    og.restore();
    og.fillStyle = 'rgba(255,255,255,.10)';                    /* rim sheen */
    og.beginPath(); og.ellipse(cx-8, cy-10, rx*.6, ry*.55, -.3, Math.PI*1.1, Math.PI*1.8); og.lineTo(cx-8, cy-10); og.fill();
    og.fillStyle = '#1b2740'; og.fillRect(cx-22, HZ-9, 44, 9);
    og.fillStyle = 'rgba(255,205,130,.6)'; for (var px = cx-18; px < cx+18; px += 7) og.fillRect(px, HZ-7, 3, 3.5);
  }

  /* ── Dubai Frame: two gold-clad towers and the glass sky bridge ── */
  function drawFrame(b){
    var x = b.x, w = b.w, h = b.h, y0 = HZ - h;
    var gold = lgrad(og, x,0,x+w,0, [[0,'#7a5a22'],[.3,'#d8b05a'],[.5,'#f3d27a'],[.7,'#c89b44'],[1,'#6f5020']]);
    og.fillStyle = gold;
    og.fillRect(x, y0, 12, h); og.fillRect(x+w-12, y0, 12, h); og.fillRect(x, y0, w, 14);
    /* the gold panel pattern */
    og.fillStyle = 'rgba(60,40,10,.35)';
    for (var yy = y0+16; yy < HZ; yy += 8){ og.fillRect(x, yy, 12, .8); og.fillRect(x+w-12, yy, 12, .8); }
    for (var xx = x+8; xx < x+w-8; xx += 8) og.fillRect(xx, y0, .8, 14);
    /* the glass bridge floor + walkway glow */
    og.fillStyle = 'rgba(180,220,255,.35)'; og.fillRect(x+12, y0+9, w-24, 3);
    og.fillStyle = 'rgba(255,205,110,.65)';
    og.fillRect(x+10.5, y0+14, 1.5, h-14); og.fillRect(x+w-12, y0+14, 1.5, h-14); og.fillRect(x, y0+13, w, 1.5);
    for (var k = 0; k < 10; k++){
      og.fillStyle = 'rgba(255,215,130,'+rnd(.3,.7)+')';
      og.fillRect(x+3, y0+20+k*(h-30)/10, 2.4, 2.4); og.fillRect(x+w-6, y0+20+k*(h-30)/10, 2.4, 2.4);
    }
    og.fillStyle = '#2a2a3a'; og.fillRect(x-4, HZ-8, w+8, 8);
  }

  function drawBuilding(b){
    switch (b.kind){
      case 'jbh':        drawJBH(b); break;
      case 'burjalarab': drawBurjAlArab(b); break;
      case 'cayan':      drawCayan(b); break;
      case 'twin':       drawTwin(b); break;
      case 'museum':     drawMuseum(b); break;
      case 'frame':      drawFrame(b); break;
      default:
        drawBoxBody(b, b.x, b.w, b.h);
        og.save();                                   /* clip windows to the body so none spill past the roofline */
        var inset = ['emir1','emir2','dome','sail'].indexOf(b.crown) >= 0 ?
                    (b.crown === 'sail' ? 58 : (b.crown === 'dome' ? 0 : 46)) : 0;
        og.beginPath(); og.rect(b.x, HZ - b.h + inset, b.w, b.h - inset); og.clip();
        drawWindows(og, b.win);
        og.restore();
    }
  }

  function burjPath(g){
    g.beginPath();
    BL.concat(BR).forEach(function(p){ g.rect(BX + p[0]*BS, HZ - p[2]*BS, p[1]*BS, p[2]*BS); });
    g.rect(BX-1.5, HZ-438*BS, 3, 48*BS);
    g.rect(BX-.5,  HZ-456*BS, 1, 18*BS);
  }

  /* ── Burj Khalifa: rounded setback lobes climbing to the needle, banded glass,
     the sunset on its west face, lit tier caps, the mall podium and the lake ── */
  function drawBurj(){
    var s = BS, cx = BX;
    function lobe(p, k, n){
      var x0 = cx + p[0]*s, w = p[1]*s, top = HZ - p[2]*s;
      var lit = lerpC([120,140,170], [205,218,236], k/(n-1)), dark = lerpC([28,36,56], [70,84,108], k/(n-1));
      og.fillStyle = lgrad(og, x0,0,x0+w,0, [[0,rgb(lit)],[.3,rgb(lerpC(lit,dark,.35))],[.75,rgb(dark)],[1,rgb(lerpC(dark,[0,0,0],.3))]]);
      og.fillRect(x0, top, w, p[2]*s);
      og.fillStyle = 'rgba(255,225,190,.45)'; og.fillRect(x0 + w*.18, top, 1, p[2]*s);     /* rounded-lobe highlight */
      og.fillStyle = 'rgba(200,215,235,.9)'; og.fillRect(x0, top, w, 1.6);                  /* lit tier cap */
      og.fillStyle = 'rgba(255,205,140,.55)'; og.fillRect(x0 + 1, top + 1.6, w - 2, 1.2);
    }
    for (var k = BL.length-1; k >= 0; k--) lobe(BL[k], k, BL.length);
    for (k = BR.length-1; k >= 0; k--) lobe(BR[k], k, BR.length);

    og.save();
    burjPath(og); og.clip();
    for (var f = 3; f < 390; f += 3){
      var strip = f % 15 === 0;
      og.fillStyle = strip ? 'rgba(6,10,20,.55)' : 'rgba(8,14,26,.30)';
      og.fillRect(cx - 40*s, HZ - f*s, 80*s, strip ? 1.6 : .7);
    }
    og.fillStyle = lgrad(og, 0,HZ-390*s,0,HZ, [[0,'rgba(150,180,225,.12)'],[.5,'rgba(80,105,150,.06)'],[.85,'rgba(255,170,95,.14)'],[1,'rgba(255,150,70,.24)']]);
    og.fillRect(cx - 40*s, HZ - 390*s, 80*s, 390*s);
    og.fillStyle = 'rgba(255,205,140,.4)';
    og.fillRect(cx - 6.5*s, HZ - 302*s, 13*s, 2.6);
    og.fillRect(cx - 14*s, HZ - 155*s, 29*s, 2.6);
    og.restore();

    /* the spire */
    var topY = HZ - 390*s;
    og.fillStyle = lgrad(og, 0,topY-66*s,0,topY, [[0,'#f2f6fb'],[1,'#a4b2c6']]);
    og.beginPath(); og.moveTo(cx-1.6, topY); og.lineTo(cx+1.6, topY); og.lineTo(cx+.55, topY - 48*s); og.lineTo(cx-.55, topY - 48*s); og.closePath(); og.fill();
    og.fillRect(cx-.45, topY - 66*s, .9, 18*s);
    og.fillRect(cx-2.6, topY - 24*s, 5.2, 1.1);
    og.fillRect(cx-1.8, topY - 42*s, 3.6, 1);

    for (k = 0; k < BURJ_LIGHTS.length; k++){
      var L = BURJ_LIGHTS[k];
      og.fillStyle = 'rgba('+L.c+','+L.a+')';
      og.fillRect(L.x - L.r/2, L.y - L.r/2, L.r, L.r*1.4);
    }

    /* Dubai Mall / souk podium at the base + the fountain lake's promenade */
    og.fillStyle = lgrad(og, 0,HZ-22,0,HZ, [[0,'#1a2540'],[1,'#0f1728']]);
    og.fillRect(cx-108, HZ-20, 216, 20);
    og.fillStyle = 'rgba(255,200,120,.55)';
    for (k = 0; k < 26; k++) og.fillRect(cx-100 + k*8.2, HZ-13, 3.6, 5);
    og.fillStyle = 'rgba(255,225,170,.7)';
    for (k = 0; k < 13; k++) og.fillRect(cx-100 + k*16.4, HZ-19, 1.4, 1.4);   /* promenade lamps */
    og.fillStyle = 'rgba(120,180,255,.25)'; og.fillRect(cx-108, HZ-3, 216, 3);  /* the lake's edge glow */
  }

  /* ── the water: deep gradient, a rippled mirror of the city, the sun's path, glints ── */
  function drawWater(){
    og.fillStyle = lgrad(og, 0,HZ,0,DH, [[0,'#0c1a36'],[1,'#050b1a']]);
    og.fillRect(0, HZ, DW, DH-HZ);
    /* the mirror: the skyline above the waterline copied down in thin slices, each
       stretched ×1.45, nudged sideways by a wave (rippled) and fading with depth */
    for (var yy = HZ; yy < DH; yy += 2){
      var d = (yy - HZ)/(DH - HZ);
      var srcY = HZ - (yy - HZ)/1.45;
      var dx = Math.sin(yy*.23) * (1 + d*6) + Math.sin(yy*.061 + 1.3)*(d*4);
      og.globalAlpha = .58*(1 - d*.55);
      try { og.drawImage(off, 0, Math.max(0, (srcY-1.4)*scale), DW*scale, 1.4*scale, dx, yy, DW, 2.2); } catch(e) {}
    }
    og.globalAlpha = 1;
    og.fillStyle = lgrad(og, 0,HZ,0,DH, [[0,'rgba(6,13,28,.10)'],[1,'rgba(4,9,20,.80)']]);
    og.fillRect(0, HZ, DW, DH-HZ);
    og.fillStyle = lgrad(og, SUNX-70,0,SUNX+70,0, [[0,'rgba(255,160,60,0)'],[.5,'rgba(255,175,80,.22)'],[1,'rgba(255,160,60,0)']]);
    og.fillRect(SUNX-70, HZ, 140, 118);
    for (var k = 0; k < RIPPLES.length; k++){
      var r = RIPPLES[k];
      var nearSun = Math.abs(r.x + r.w/2 - SUNX) < 120;
      if (r.light) og.fillStyle = nearSun ? 'rgba(255,190,110,'+(r.a*.32)+')' : 'rgba(130,160,210,'+(r.a*.15)+')';
      else og.fillStyle = 'rgba(4,8,18,'+(r.a*.55)+')';
      og.fillRect(r.x, r.y, r.w * (1 - r.deep*.4), 1);
    }
    og.fillStyle = 'rgba(160,200,240,.18)'; og.fillRect(0, HZ, DW, 1);   /* the waterline */
  }

  function renderStatic(){
    og.setTransform(scale, 0, 0, scale, 0, 0);
    og.clearRect(0, 0, DW, DH);
    drawSky();
    drawFar();
    for (var k = 0; k < BUILDINGS.length; k++) drawBuilding(BUILDINGS[k]);
    drawBurj();
    og.fillStyle = lgrad(og, 0,660,0,HZ, [[0,'rgba(240,160,100,0)'],[1,'rgba(240,160,100,.12)']]);
    og.fillRect(0, 660, DW, 120);
    drawWater();
    og.fillStyle = rgrad(og, 860,480,240,1050, [[0,'rgba(0,0,12,0)'],[1,'rgba(0,0,12,.38)']]);
    og.fillRect(0, 0, DW, DH);
  }

  /* ───────────────────────── sizing ───────────────────────── */
  function resize(){
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = window.innerWidth * dpr, ch = window.innerHeight * dpr;
    cv.width = cw; cv.height = ch;
    scale = Math.max(cw/DW, ch/DH);
    ox = (cw - DW*scale)/2;
    oy = ch - DH*scale;
    off.width = Math.ceil(DW*scale); off.height = Math.ceil(DH*scale);
    renderStatic();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ───────────────────────── click interaction ───────────────────────── */
  var mShowStart = -99, mShowEnd = -99, mFwStart = -99, mFwEnd = -99;
  var mFnStart = -99, mFnEnd = -99;
  var MOON_X = 300, MOON_Y = 140, MOON_R = 23, moonBoostT = -99;
  var lastT = 0;

  var onSceneClick = function(e){
    if (stopped) return;
    if(e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov'))return;
    var mx = (e.clientX * (cv.width / window.innerWidth)  - ox) / scale;
    var my = (e.clientY * (cv.height / window.innerHeight) - oy) / scale;
    var t = lastT;
    for (var di = 0; di < CROSS.length; di++){                     /* tap a drone → it explodes */
      var cd = CROSS[di];
      if (cd._on && Math.abs(mx - cd._x) < 13 && Math.abs(my - cd._y) < 13){
        popDrone(cd._x, cd._y, cd.hue); cd.active = false; cd._on = false; cd.wait = rnd(3, 6); return;
      }
    }
    for (di = 0; di < SHOW.length; di++){
      var sd = SHOW[di];
      if (sd._on && Math.abs(mx - sd._x) < 13 && Math.abs(my - sd._y) < 13){
        popDrone(sd._x, sd._y, dShapeHue); sd.deadUntil = t + 4; sd._on = false; return;
      }
    }
    for (di = 0; di < HELIS.length; di++){                          /* tap a helicopter → same */
      var hh = HELIS[di];
      if (hh._on && Math.abs(mx - hh._x) < 20*hh.s && Math.abs(my - hh._y) < 12*hh.s){
        popDrone(hh._x, hh._y, 35);
        var delay = rnd(4, 7);
        hh.deadUntil = t + delay;
        hh.off = (hh._period - ((t + delay) % hh._period)) % hh._period;
        hh._on = false; return;
      }
    }
    if (MIS.inc && Math.abs(mx - MIS.inc.x) < 24 && Math.abs(my - MIS.inc.y) < 24){   /* the incoming missile */
      popDrone(MIS.inc.x, MIS.inc.y, 18);
      MIS.inc = null; MIS.def = null; MIS.boom = null; MIS.nextAt = t + 360; return;
    }
    if ((mx - MOON_X)*(mx - MOON_X) + (my - MOON_Y)*(my - MOON_Y) < 34*34){ moonBoostT = t; return; }
    if (mx > BX-60 && mx < BX+60 && my > HZ - 456*BS - 20 && my < HZ){          /* Burj Khalifa */
      if (Math.random() < .5){ mShowStart = t; mShowEnd = t + 12; }
      else                   { mFwStart = t;   mFwEnd = t + 5; }
      return;
    }
    if (mx > 1165 && mx < 1475 && my > HZ - 140 && my < HZ + 45){ mFnStart = t; mFnEnd = t + 20; return; }   /* the fountain */
    if (mx > 75 && mx < 195 && my > HZ - 245 && my < HZ){                          /* Burj Al Arab */
      startMissiles();
      BUILDINGS[1].boostStart = t; BUILDINGS[1].boostUntil = t + 6; return;
    }
    if ((mx - AW_X)*(mx - AW_X) + (my - AW_Y)*(my - AW_Y) < (AW_R + 16)*(AW_R + 16)){ awBoostStart = t; return; }
    for (di = 0; di < BOATS.length; di++){
      var bt = BOATS[di];
      if (bt._on && mx > bt._x - bt._half && mx < bt._x + bt._half && my > bt._y - 64 && my < bt._y + 16){ bt.blinkUntil = t + 2.0; return; }
    }
    var dxm = (mx - MUSEUM.cx)/MUSEUM.rx, dym = (my - MUSEUM.cy)/MUSEUM.ry;
    if (dxm*dxm + dym*dym <= 1.2){
      mfxHue = (mfxHue + 67) % 360;
      MFX.push({ t0: t, hue: mfxHue });
      if (MFX.length > 8) MFX.shift();
      return;
    }
    var hit = false;
    for (var k = BUILDINGS.length-1; k >= 0; k--){
      var b = BUILDINGS[k], x0, x1, y0;
      switch (b.kind){
        case 'jbh':        x0 = b.x; x1 = b.x+84; y0 = HZ-b.h-10; break;
        case 'burjalarab': x0 = b.x-26; x1 = b.x+80; y0 = HZ-b.h-26; break;
        case 'museum':     x0 = b.x-42; x1 = b.x+42; y0 = HZ-b.h; break;
        case 'twin':       x0 = b.x; x1 = b.x + 2*b.w + b.gap; y0 = HZ-b.h; break;
        default:           x0 = b.x; x1 = b.x + b.w; y0 = HZ - b.h - (b.crown === 'spire' ? (b.spire||24) : 20);
      }
      if (mx >= x0 && mx <= x1 && my >= y0 && my <= HZ){ b.boostStart = t; b.boostUntil = t + 6; hit = true; break; }
    }
    if (!hit && my < HZ - 140 && !(t > mDroneStart && t < mDroneEnd)){ mDroneStart = t; mDroneEnd = t + MDRONE_LEN; }
  };
  document.addEventListener('click', onSceneClick);

  function clickBoost(b, t){
    if (!b.boostUntil || t >= b.boostUntil) return 0;
    return Math.min(1, (t - b.boostStart)/.25, (b.boostUntil - t)/1.5);
  }

  /* the moon, tapped: glow pulse, phase wobble, a ring of orbiting twinkles */
  function drawMoonFx(t){
    if (!(t > moonBoostT && t < moonBoostT + 2.6)) return;
    var e = Math.min(1, (t - moonBoostT)/.4, (moonBoostT + 2.6 - t)/1.4);
    ctx.save();
    var pr = 44 + 16*Math.sin(t*4);
    ctx.fillStyle = rgrad(ctx, MOON_X, MOON_Y, 0, pr, [[0,'rgba(255,250,225,'+(0.5*e).toFixed(3)+')'],[1,'rgba(255,250,225,0)']]);
    ctx.beginPath(); ctx.arc(MOON_X, MOON_Y, pr, 0, 6.2832); ctx.fill();
    var wob = Math.sin(t*2.6) * 5 * e;
    ctx.fillStyle = '#fbf3da'; ctx.beginPath(); ctx.arc(MOON_X, MOON_Y, MOON_R, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#0a1736'; ctx.beginPath(); ctx.arc(MOON_X + 9 + wob, MOON_Y - 7 - wob*0.4, MOON_R - 2, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,225,'+(0.9*e).toFixed(3)+')';
    for (var i = 0; i < 6; i++){
      var a = i/6*6.2832 + t*0.7, rr = 36 + 5*Math.sin(t*3+i);
      var sx = MOON_X + Math.cos(a)*rr, sy = MOON_Y + Math.sin(a)*rr;
      var s = 2.6 * Math.max(0, 0.4 + 0.6*Math.sin(t*5 + i*1.7));
      ctx.beginPath(); ctx.moveTo(sx, sy-s); ctx.lineTo(sx+s*.32, sy); ctx.lineTo(sx, sy+s); ctx.lineTo(sx-s*.32, sy); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx-s, sy); ctx.lineTo(sx, sy-s*.32); ctx.lineTo(sx+s, sy); ctx.lineTo(sx, sy+s*.32); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /* ───────────────────────── animation ───────────────────────── */
  var FW = [];

  function accentCol(b, t, a){
    var h = (b.anim.hue0 + t*b.anim.hueSp) % 360;
    return 'hsla(' + h + ',85%,62%,' + Math.min(.92, a * (b._bo || 1)) + ')';
  }
  /* per-building animated lighting — every tower has its own scheme */
  function drawAccent(b, t){
    var an = b.anim; if (!an) return;
    b._bo = 1 + 2.4*clickBoost(b, t);
    var x = b.x, w = b.w, h = b.h, y0 = HZ - (h||0);
    switch (an.type){
      case 'edges': {
        var a = .15 + .11*Math.sin(t*an.sp);
        ctx.fillStyle = accentCol(b, t, a);
        ctx.fillRect(x, y0, 2, h); ctx.fillRect(x+w-2, y0, 2, h); break;
      }
      case 'crown': {
        var ca = .17 + .13*Math.sin(t*an.sp);
        ctx.fillStyle = accentCol(b, t, ca); ctx.fillRect(x, y0, w, 13);
        ctx.fillStyle = accentCol(b, t, ca*.4); ctx.fillRect(x-3, y0-5, w+6, 5); break;
      }
      case 'scan': {
        var sy = HZ - ((t*an.scanV) % (h+30));
        ctx.fillStyle = accentCol(b, t, .24);
        ctx.fillRect(x, Math.max(sy-9, y0), w, Math.min(9, sy-y0 > 0 ? 9 : 0));
        ctx.fillStyle = accentCol(b, t, .09);
        ctx.fillRect(x, Math.max(sy, y0), w, Math.min(20, HZ-sy)); break;
      }
      case 'pulse': {
        var pa = .035 + .04*Math.sin(t*an.sp);
        if (pa > .01){ ctx.fillStyle = accentCol(b, t, pa); ctx.fillRect(x, y0, w, h); } break;
      }
      case 'sail': {
        var top = HZ - b.h;
        ctx.fillStyle = accentCol(b, t, .08 + .05*Math.sin(t*an.sp));
        sailPath(ctx, b.x, top, b.h); ctx.fill(); break;
      }
      case 'twist': {
        ctx.strokeStyle = accentCol(b, t, .16 + .10*Math.sin(t*an.sp)); ctx.lineWidth = 1.4;
        cayanCurves(ctx, b); break;
      }
      case 'museum': {
        ctx.strokeStyle = accentCol(b, t, .22 + .14*Math.sin(t*an.sp)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(MUSEUM.cx, MUSEUM.cy, MUSEUM.rx - 8, MUSEUM.ry - 8, -.06, 0, 6.2832); ctx.stroke(); break;
      }
      case 'frame': {
        var fa = (.22 + .15*Math.sin(t*an.sp)) * b._bo;
        ctx.fillStyle = 'rgba(255,205,110,'+fa+')';
        ctx.fillRect(x+10.5, y0+14, 1.5, h-14); ctx.fillRect(x+w-12, y0+14, 1.5, h-14); ctx.fillRect(x, y0+13, w, 1.5); break;
      }
      case 'bridge': {
        var bx = b.x + b.w - 2, bw = b.gap + 4, by = HZ - b.h + 10;
        ctx.fillStyle = accentCol(b, t, .4 + .18*Math.sin(t*an.sp)); ctx.fillRect(bx, by+2, bw, 5); break;
      }
    }
  }
  /* windows that switch on/off slowly — different rhythm per window */
  function drawDynWindows(b, t){
    if (!b.dyn) return;
    var bo = clickBoost(b, t), wv = b._waveY;
    for (var k = 0; k < b.dyn.length; k++){
      var w = b.dyn[k];
      var on = Math.sin(t*w.sp + w.ph);
      var a = w.a * Math.max(bo, Math.max(0, Math.min(1, (on + .2) * 2.5)));
      if (wv != null){ var prox = 1 - Math.abs(w.y - wv) / 34; if (prox > 0) a = Math.max(a, w.a * prox); }
      a *= LIGHT_GAIN;
      if (a < .03) continue;
      ctx.fillStyle = 'rgba(' + w.c + ',' + a + ')';
      ctx.fillRect(w.x, w.y, 3.2, 4.2);
    }
  }
  /* ── Burj Khalifa LED facade show ── */
  function drawBurjShow(t, env, showHue){
    ctx.save();
    burjPath(ctx); ctx.clip();
    for (var yb = 0; yb < 450; yb += 12){
      var hue = (showHue + yb*1.6 + Math.sin(t*1.2)*120) % 360;
      var a = env * (.20 + .14*Math.sin(t*3.1 + yb*.21));
      if (a > .02){ ctx.fillStyle = 'hsla(' + hue + ',95%,60%,' + a + ')'; ctx.fillRect(BX - 40*BS, HZ - (yb+12)*BS, 80*BS, 12*BS + .5); }
    }
    var py = (t*150) % 500;
    ctx.fillStyle = 'rgba(255,255,255,' + (.32*env) + ')'; ctx.fillRect(BX - 40*BS, HZ - py*BS, 80*BS, 5);
    for (var k = 0; k < 26; k++){ ctx.fillStyle = 'rgba(255,255,255,' + (env*rnd(.15,.8)) + ')'; ctx.fillRect(BX + rnd(-36,36)*BS, HZ - rnd(2,448)*BS, 1.6, 1.6); }
    ctx.restore();
    ctx.fillStyle = rgrad(ctx, BX, HZ-456*BS, 0, 30, [[0,'hsla(' + showHue + ',90%,70%,' + (.5*env) + ')'],[1,'hsla(' + showHue + ',90%,70%,0)']]);
    ctx.fillRect(BX-30, HZ-456*BS-30, 60, 60);
  }
  /* ── fireworks pouring off the sides of the Burj ── */
  function spawnFireworks(dt, env, showHue){
    if (Math.random() < dt*26*env){
      var hgt = rnd(20, 380), edges = burjEdgesAt(Math.min(hgt, 389)), side = Math.random() < .5 ? -1 : 1;
      var x0 = BX + (side < 0 ? edges[0] : edges[1])*BS, hue = Math.random() < .6 ? rnd(35,55) : showHue;
      for (var k = 0; k < 13; k++)
        FW.push({ x:x0, y:HZ - hgt*BS, vx: side*rnd(18,95) + rnd(-8,8), vy: rnd(-45,15), life: rnd(.7,1.6), age:0, hue:hue, r: rnd(.7,1.7) });
    }
    if (Math.random() < dt*1.1*env){
      var cx = BX + rnd(-95,95), cy0 = HZ - rnd(330,500)*BS, bh = rnd(0,360);
      for (var j = 0; j < 52; j++){
        var ang = rnd(0,6.2832), v = rnd(18,128);
        FW.push({ x:cx, y:cy0, vx: Math.cos(ang)*v, vy: Math.sin(ang)*v - 22, life: rnd(.8,1.9), age:0, hue:bh + rnd(-14,14), r: rnd(.8,1.9) });
      }
    }
    if (FW.length > 950) FW.splice(0, FW.length - 950);
  }
  function drawFireworks(dt){
    ctx.globalCompositeOperation = 'lighter';
    for (var k = FW.length - 1; k >= 0; k--){
      var p = FW[k];
      p.age += dt;
      if (p.age >= p.life){ FW.splice(k, 1); continue; }
      p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 88*dt;
      var f = 1 - p.age/p.life;
      ctx.strokeStyle = 'hsla(' + p.hue + ',100%,' + (55 + 30*f) + '%,' + (f*.9) + ')';
      ctx.lineWidth = p.r;
      ctx.beginPath(); ctx.moveTo(p.x - p.vx*.045, p.y - p.vy*.045); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  /* ── Dubai Fountain show on the lake ── */
  var FNP = [];
  function fountainTarget(j, t){
    var i = j.i, mode = (t/12 | 0) % 5, osc;
    switch (mode){
      case 0: osc = .5 + .5*Math.sin(t*1.6 + i*.55); break;
      case 1: osc = .5 + .5*Math.sin(t*2.4 + (i%2)*Math.PI); break;
      case 2: osc = .5 + .5*Math.sin(t*2   - Math.abs(i-9)*.7); break;
      case 3: osc = .5 + .5*Math.sin(t*3   + i*1.7); break;
      default: return j.Hmax * (.10 + .08*Math.sin(t*1.2 + i*.3));
    }
    return j.Hmax * (.18 + .82*osc);
  }
  function drawFountain(t, dt, env, showHue, fnEnv){
    if (fnEnv <= 0 && FNP.length === 0 && FN[9].h < 4) return;
    ctx.globalCompositeOperation = 'lighter';
    for (var k = 0; k < FN.length; k++){
      var j = FN[k];
      var target = fountainTarget(j, t) * fnEnv;
      if (j.i === 9 && Math.sin(t*.31) > .86) target *= 1.7;
      j.h += (target - j.h) * Math.min(1, dt*2.5);
      var h = j.h;
      if (h < 4) continue;
      var sway = Math.sin(t*1.1 + j.swPh + j.i*.42) * .12 * h;
      var tipX = j.x + sway, tipY = j.y - h;
      var col = env > 0 ? 'hsla(' + showHue + ',70%,80%,' : 'rgba(225,240,255,';
      ctx.fillStyle = rgrad(ctx, j.x, j.y, 0, 14 + h*.12, [[0, col + '.18)'],[1, col + '0)']]); ctx.fillRect(j.x-26, j.y-18, 52, 20);
      ctx.fillStyle = lgrad(ctx, 0, j.y, 0, tipY, [[0, col + '.55)'],[.7, col + '.32)'],[1, col + '.06)']]);
      ctx.beginPath();
      ctx.moveTo(j.x - 3.4, j.y);
      ctx.quadraticCurveTo(j.x + sway*.3 - 1.5, j.y - h*.62, tipX - 1.3, tipY);
      ctx.lineTo(tipX + 1.3, tipY);
      ctx.quadraticCurveTo(j.x + sway*.3 + 1.5, j.y - h*.62, j.x + 3.4, j.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col + '.30)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(j.x, j.y); ctx.quadraticCurveTo(j.x + sway*.3, j.y - h*.62, tipX, tipY); ctx.stroke();
      if (h > 18 && Math.random() < dt*34)
        FNP.push({ x: tipX + rnd(-1.6,1.6), y: tipY + rnd(0,2), vx: sway*.35 + rnd(-9,9), vy: rnd(-14,4), life: rnd(.45,.95), age: 0, c: col });
      ctx.fillStyle = col + (.10 + (h/j.Hmax)*.12) + ')';
      ctx.beginPath(); ctx.ellipse(j.x + sway*.5, j.y + 1, 6 + h*.08, 1.8, 0, 0, 6.2832); ctx.fill();
    }
    for (k = FNP.length - 1; k >= 0; k--){
      var p = FNP[k];
      p.age += dt;
      if (p.age >= p.life || p.y > HZ + 24){ FNP.splice(k, 1); continue; }
      p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 150*dt;
      var f = 1 - p.age/p.life;
      ctx.fillStyle = p.c + (f*.5) + ')'; ctx.fillRect(p.x, p.y, 1.3, 2.2);
    }
    if (FNP.length > 420) FNP.splice(0, FNP.length - 420);
    ctx.globalCompositeOperation = 'source-over';
  }
  /* ── helicopters ── */
  function drawHeli(hl, t){
    var period = (DW + 300) / hl.sp;
    hl._period = period;
    if (hl.deadUntil && t < hl.deadUntil){ hl._on = false; return; }
    var prog = ((t + hl.off) % period) / period;
    var x = hl.dir > 0 ? -150 + prog*(DW + 300) : DW + 150 - prog*(DW + 300);
    var y = hl.y + Math.sin(t*1.3 + hl.off)*4;
    hl._x = x; hl._y = y; hl._on = true;
    if (hl.beam){
      var swing = Math.sin(t*.45 + hl.off)*38;
      ctx.fillStyle = lgrad(ctx, 0, y, 0, y+170, [[0,'rgba(255,250,220,.16)'],[1,'rgba(255,250,220,0)']]);
      ctx.beginPath(); ctx.moveTo(x + 2*hl.dir, y + 3); ctx.lineTo(x + swing - 24, y + 170); ctx.lineTo(x + swing + 24, y + 170); ctx.closePath(); ctx.fill();
    }
    drawHeliBody(x, y, hl.s, hl.dir, t, hl.off);
  }
  function drawHeliBody(x, y, s, d, t, off){
    ctx.save();
    ctx.translate(x, y); ctx.scale(s*d, s);
    ctx.fillStyle = 'rgba(10,14,26,.95)';
    ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 3, 0, 0, 6.2832); ctx.fill();
    ctx.fillRect(-16, -1.1, 12, 1.7);
    ctx.beginPath(); ctx.moveTo(-16, 1); ctx.lineTo(-16, -5); ctx.lineTo(-13.4, -1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(10,14,26,.9)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-4, 3.4); ctx.lineTo(-3, 5); ctx.lineTo(4.5, 5); ctx.moveTo(3, 3.4); ctx.lineTo(3.6, 5); ctx.stroke();
    ctx.fillRect(-.7, -5, 1.4, 2.4);
    var rl = 13 * Math.abs(Math.cos(t*26));
    ctx.strokeStyle = 'rgba(20,26,42,.85)'; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(-rl, -5.4); ctx.lineTo(rl, -5.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,140,170,.12)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-13, -5.4); ctx.lineTo(13, -5.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,50,70,' + (.3 + .4*Math.abs(Math.sin(t*40))) + ')'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-16.5, -4.4); ctx.lineTo(-16.5, 1.6); ctx.stroke();
    ctx.restore();
    var blink = Math.pow(Math.max(0, Math.sin(t*4 + off)), 8);
    if (blink > .05){ ctx.fillStyle = 'rgba(255,70,60,' + blink + ')'; ctx.beginPath(); ctx.arc(x - 16*s*d, y - 3*s, 1.3*s, 0, 6.2832); ctx.fill(); }
    var strobe = Math.pow(Math.max(0, Math.sin(t*7 + off + 2)), 24);
    if (strobe > .1){
      ctx.fillStyle = 'rgba(255,255,255,' + strobe*.2 + ')'; ctx.beginPath(); ctx.arc(x, y - 6*s, 4*s, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + strobe + ')'; ctx.beginPath(); ctx.arc(x, y - 6*s, 1.6*s, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = 'rgba(80,255,120,.8)'; ctx.fillRect(x + 6*s*d, y, 1.2*s, 1.2*s);
  }
  /* ── the chopper that visits the Burj Al Arab helipad ── */
  var BA = { t0: null, nextAt: null };
  function drawBAHeli(t){
    if (BA.nextAt == null) BA.nextAt = t + 20 + rnd(0, 30);
    if (BA.t0 == null){ if (t < BA.nextAt) return; BA.t0 = t; }
    var e = t - BA.t0, padX = 98, padY = 606, hovY = 556, x, y, d = 1;
    if (e < 5){ var p = e/5, q = p*(2-p); x = -50 + (padX+50)*q; y = 530 + (hovY-530)*p; }
    else if (e < 8){ var p2 = (e-5)/3, q2 = p2*p2*(3-2*p2); x = padX; y = hovY + (padY-hovY)*q2; }
    else if (e < 12){ x = padX; y = padY; }
    else if (e < 14){ var p3 = (e-12)/2; x = padX; y = padY - (padY-hovY)*p3*p3; }
    else if (e < 19){ var p4 = (e-14)/5; d = -1; x = padX - p4*p4*(padX+70); y = hovY - p4*26; }
    else { BA.t0 = null; BA.nextAt = t + 60 + rnd(0, 60); return; }
    drawHeliBody(x, y, .55, d, t, 3.1);
  }
  /* ── light-waves: every so often a tower's windows ripple bottom→top ── */
  var WAVES = [], nextWaveAt = null;
  function updateWaves(t){
    if (nextWaveAt == null) nextWaveAt = t + 6 + rnd(0, 8);
    if (t >= nextWaveAt){
      nextWaveAt = t + 12 + rnd(0, 16);
      var boxes = BUILDINGS.filter(function(b){ return b.kind === 'box' || b.kind === 'twin'; });
      WAVES.push({ b: boxes[(Math.random()*boxes.length)|0], t0: t });
    }
    for (var k = 0; k < BUILDINGS.length; k++) BUILDINGS[k]._waveY = null;
    for (k = WAVES.length-1; k >= 0; k--){
      var w = WAVES[k], p = (t - w.t0) / 2.4;
      if (p >= 1){ WAVES.splice(k, 1); continue; }
      w.b._waveY = HZ - p * (w.b.h + 50);
    }
  }
  function drawWaves(t){
    for (var k = 0; k < WAVES.length; k++){
      var w = WAVES[k], b = w.b;
      if (b._waveY == null) continue;
      var p = (t - w.t0) / 2.4, wWide = b.kind === 'twin' ? 2*b.w + b.gap : b.w;
      ctx.fillStyle = lgrad(ctx, 0, b._waveY - 14, 0, b._waveY + 14, [[0,'rgba(255,236,180,0)'],[.5,'rgba(255,236,180,' + (.30*(1-p*.4)) + ')'],[1,'rgba(255,236,180,0)']]);
      ctx.fillRect(b.x - 2, b._waveY - 14, wWide + 4, 28);
    }
  }
  /* ── missile-defense show over the bay ── */
  var MIS = { nextAt: null, inc: null, def: null, boom: null };
  var MTRAIL = [];
  function startMissiles(){
    if (MIS.inc || MIS.boom) return;
    MIS.inc = { x: DW + 60, y: 240 + rnd(0, 120), vx: -120 - rnd(0, 30), vy: 8 };
    MIS.def = null; MIS.nextAt = null;
  }
  function drawMissiles(t, dt){
    if (!MIS.inc && !MIS.boom){
      if (MIS.nextAt == null) MIS.nextAt = t + 15 + rnd(0, 20);
      if (t >= MIS.nextAt) startMissiles();
    }
    for (var i = MTRAIL.length - 1; i >= 0; i--){
      var p = MTRAIL[i], age = t - p.t0;
      if (age > 1.1){ MTRAIL.splice(i, 1); continue; }
      var a = 1 - age / 1.1;
      ctx.fillStyle = p.c + (a * .4) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y - age * 6, 2 + age * 7, 0, 6.2832); ctx.fill();
    }
    var inc = MIS.inc;
    if (inc){
      inc.x += inc.vx * dt; inc.y += inc.vy * dt;
      if (Math.random() < dt * 40) MTRAIL.push({ x: inc.x + 14, y: inc.y, t0: t, c: 'rgba(120,120,130,' });
      ctx.save(); ctx.translate(inc.x, inc.y); ctx.rotate(Math.atan2(inc.vy, inc.vx) + Math.PI / 4);
      ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
      ctx.fillText('🚀', 0, 0); ctx.restore();
      if (!MIS.def && inc.x < 500) MIS.def = { x: 114, y: 548, vx: 0, vy: -40 };
      if (inc.x < -80){ MIS.inc = null; MIS.def = null; MIS.nextAt = t + 360; }
    }
    var def = MIS.def;
    if (def && MIS.inc){
      var dx = MIS.inc.x - def.x, dy = MIS.inc.y - def.y, d = Math.hypot(dx, dy) || 1;
      def.vx = dx / d * 300; def.vy = dy / d * 300;
      def.x += def.vx * dt; def.y += def.vy * dt;
      if (Math.random() < dt * 60) MTRAIL.push({ x: def.x, y: def.y + 6, t0: t, c: 'rgba(255,235,200,' });
      ctx.save(); ctx.translate(def.x, def.y); ctx.rotate(Math.atan2(def.vy, def.vx) + Math.PI / 4);
      ctx.font = '17px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
      ctx.fillText('🚀', 0, 0); ctx.restore();
      if (d < 20){
        MIS.boom = { x: MIS.inc.x, y: MIS.inc.y, t0: t };
        MIS.inc = null; MIS.def = null; MIS.nextAt = t + 360;
        var hue = rnd(15, 45);
        for (var j = 0; j < 60; j++){
          var ang = rnd(0, 6.2832), v = rnd(20, 150);
          FW.push({ x: MIS.boom.x, y: MIS.boom.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 15, life: rnd(.6, 1.6), age: 0, hue: hue + rnd(-12, 12), r: rnd(.8, 2) });
        }
      }
    }
    var bm = MIS.boom;
    if (bm){
      var be = t - bm.t0;
      if (be > .8) MIS.boom = null;
      else {
        var q = be / .8;
        ctx.fillStyle = 'rgba(255,240,210,' + (.7 * (1 - q)) + ')'; ctx.beginPath(); ctx.arc(bm.x, bm.y, 8 + q * 26, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(255,200,130,' + (.6 * (1 - q)) + ')'; ctx.lineWidth = 3 * (1 - q) + 1;
        ctx.beginPath(); ctx.arc(bm.x, bm.y, 10 + q * 90, 0, 6.2832); ctx.stroke();
      }
    }
  }
  /* ── drones ── */
  function drawDroneAt(dr, t, x, y, tilt, glow){
    if (glow > 0.02){
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgrad(ctx, x, y, 0, 19, [[0,'hsla(' + dShapeHue + ',92%,78%,' + (glow*0.85).toFixed(3) + ')'],[0.45,'hsla(' + dShapeHue + ',92%,70%,' + (glow*0.34).toFixed(3) + ')'],[1,'hsla(' + dShapeHue + ',92%,70%,0)']]);
      ctx.beginPath(); ctx.arc(x, y, 19, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'hsla(' + dShapeHue + ',100%,92%,' + Math.min(1, glow*0.95).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    var s = dr.s || 1.9;
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(14,18,30,.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-3.2,-1.4); ctx.lineTo(3.2,1.4); ctx.moveTo(-3.2,1.4); ctx.lineTo(3.2,-1.4); ctx.stroke();
    ctx.fillStyle = 'rgba(14,18,30,.95)'; ctx.fillRect(-1.5,-1.2, 3, 2.2);
    ctx.strokeStyle = 'rgba(150,170,200,' + (.10 + .10*Math.sin(t*50 + dr.p1)) + ')'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-4.6,-1.6); ctx.lineTo(-1.8,-1.6); ctx.moveTo(1.8,-1.6); ctx.lineTo(4.6,-1.6); ctx.stroke();
    ctx.fillStyle = 'hsla(' + dr.hue + ',95%,60%,' + (.55 + .4*Math.sin(t*3 + dr.p2)) + ')'; ctx.fillRect(-3.4, .4, 1.3, 1.3);
    ctx.fillStyle = 'rgba(255,70,60,' + (.5 + .5*Math.sin(t*5 + dr.p1)) + ')'; ctx.fillRect(2.2, .4, 1.2, 1.2);
    var stb = Math.pow(Math.max(0, Math.sin(t*6 + dr.p2)), 20);
    if (stb > .1){ ctx.fillStyle = 'rgba(255,255,255,' + stb + ')'; ctx.fillRect(-.6, -2.4, 1.2, 1.2); }
    ctx.restore();
  }
  function spawnCross(c){
    c.active = true; c.dir = Math.random() < .5 ? 1 : -1;
    c.x = c.dir > 0 ? -50 : DW + 50; c.y = rnd(120, 440);
    c.sp = 34 + Math.random()*42; c.s = rnd(1.5, 2.0); c.hue = (Math.random()*360)|0;
    c.by = 6 + Math.random()*10; c.bsp = 0.6 + Math.random()*1.2; c.bph = rnd(0, 6.28);
    c.p1 = rnd(0, 6.28); c.p2 = rnd(0, 6.28);
  }
  function drawCrossers(t, dt){
    for (var i = 0; i < CROSS.length; i++){
      var c = CROSS[i];
      if (!c.active){ c._on = false; c.wait -= dt; if (c.wait > 0) continue; spawnCross(c); }
      c.x += c.dir*c.sp*dt;
      if ((c.dir > 0 && c.x > DW + 60) || (c.dir < 0 && c.x < -60)){ c.active = false; c._on = false; c.wait = rnd(4, 12); continue; }
      var y = c.y + Math.sin(t*c.bsp + c.bph)*c.by;
      drawDroneAt(c, t, c.x, y, c.dir*0.045*Math.cos(t*c.bsp + c.bph), 0);
      c._x = c.x; c._y = y; c._on = true;
    }
  }
  /* show shapes: each returns N local points centered on ~(0,0), ±~95 */
  function heartPts(n){
    var a = [];
    for (var k = 0; k < n; k++){
      var u = k/n * 6.2832, x = 16*Math.pow(Math.sin(u), 3);
      var y = 13*Math.cos(u) - 5*Math.cos(2*u) - 2*Math.cos(3*u) - Math.cos(4*u);
      a.push({ x: x*5.4, y: -y*5.4 - 8 });
    }
    return a;
  }
  function ringPts(n){ var a = []; for (var k = 0; k < n; k++){ var u = k/n*6.2832; a.push({ x: Math.cos(u)*92, y: Math.sin(u)*92 }); } return a; }
  function distribute(verts, n){
    var segs = [], total = 0, m = verts.length, i;
    for (i = 0; i < m; i++){ var aa = verts[i], bb = verts[(i+1)%m], len = Math.hypot(bb.x-aa.x, bb.y-aa.y); segs.push({ a: aa, b: bb, len: len }); total += len; }
    var pts = [], step = total/n, si = 0, acc = 0;
    for (var k = 0; k < n; k++){
      var target = k*step;
      while (si < segs.length-1 && acc + segs[si].len < target){ acc += segs[si].len; si++; }
      var seg = segs[si], f = seg.len > 0 ? (target-acc)/seg.len : 0;
      pts.push({ x: seg.a.x + (seg.b.x-seg.a.x)*f, y: seg.a.y + (seg.b.y-seg.a.y)*f });
    }
    return pts;
  }
  function starPts(n){
    var verts = [], spikes = 5, R = 96, r = 42;
    for (var k = 0; k < spikes*2; k++){ var ang = -Math.PI/2 + k*Math.PI/spikes, rad = (k%2) ? r : R; verts.push({ x: Math.cos(ang)*rad, y: Math.sin(ang)*rad }); }
    return distribute(verts, n);
  }
  function squarePts(n){ return distribute([ {x:-78,y:-78},{x:78,y:-78},{x:78,y:78},{x:-78,y:78} ], n); }
  function diamondPts(n){ return distribute([ {x:0,y:-94},{x:66,y:0},{x:0,y:94},{x:-66,y:0} ], n); }
  function spirePts(n){ return distribute([ {x:0,y:-92},{x:18,y:92},{x:-18,y:92} ], n); }
  function assignShape(idx, t, firstTime){
    var sh = DSHAPES[idx % DSHAPES.length], pts = sh.gen(SHOW.length);
    dShapeHue = sh.hue;
    for (var i = 0; i < SHOW.length; i++){
      var d = SHOW[i];
      if (firstTime){ d.t0x = DCX + pts[i].x; d.t0y = DCY + pts[i].y; } else { d.t0x = d.t1x; d.t0y = d.t1y; }
      d.t1x = DCX + pts[i].x; d.t1y = DCY + pts[i].y;
    }
    dMorphStart = firstTime ? -99 : t;
  }
  function parkShow(){
    for (var i = 0; i < SHOW.length; i++){ var d = SHOW[i]; d.px = DCX + rnd(-170, 170); d.py = -(30 + rnd(0, 200)); d.deadUntil = 0; d._on = false; }
  }
  function drawShowDrones(t){
    var dsp = (t + DRONE_OFFSET) % DRONE_PERIOD;
    var sched = dsp < DRONE_LEN ? Math.min(1, dsp/2, (DRONE_LEN - dsp)/2) : 0;
    var env = sched, manualActive = (t > mDroneStart && t < mDroneEnd);
    if (manualActive) env = Math.max(env, Math.min(1, (t - mDroneStart)/1.2, (mDroneEnd - t)/2));
    if (dPrevEnv <= 0 && env > 0){
      if (sched <= 0 && manualActive){ dShowStart = mDroneStart; dShowLen = MDRONE_LEN; }
      else                           { dShowStart = t - dsp; dShowLen = DRONE_LEN; }
      var a = (Math.random()*DSHAPES.length)|0;
      var b = (a + 1 + (Math.random()*(DSHAPES.length-1)|0)) % DSHAPES.length;
      dShowShapes = [a, b];
      parkShow();
      dCurSlot = 0; assignShape(dShowShapes[0], t, true);
    }
    dPrevEnv = env;
    if (env <= 0){ for (var z = 0; z < SHOW.length; z++) SHOW[z]._on = false; return; }
    var IN = 3, OUT = 3, local = t - dShowStart;
    var holdDur = Math.max(0.1, dShowLen - IN - OUT) / 2;
    if (local > IN && local < dShowLen - OUT){
      var slot = Math.floor((local - IN) / holdDur); if (slot > 1) slot = 1;
      if (slot !== dCurSlot){ dCurSlot = slot; assignShape(dShowShapes[slot], t, false); }
    }
    var fp = local < IN ? local/IN : (local > dShowLen - OUT ? Math.max(0, (dShowLen - local)/OUT) : 1);
    fp = fp < 0 ? 0 : fp > 1 ? 1 : fp; fp = fp*fp*(3 - 2*fp);
    var mp = dMorphStart < 0 ? 1 : Math.min(1, (t - dMorphStart)/1.2); mp = mp*mp*(3 - 2*mp);
    for (var i = 0; i < SHOW.length; i++){
      var d = SHOW[i];
      if (d.deadUntil && t < d.deadUntil){ d._on = false; continue; }
      var fxp = d.t0x + (d.t1x - d.t0x)*mp, fyp = d.t0y + (d.t1y - d.t0y)*mp;
      var sx = d.px + (fxp - d.px)*fp, sy = d.py + (fyp - d.py)*fp;
      if (fp > 0.6){ var sh = (fp - 0.6)/0.4; sx += Math.sin(t*2 + d.jx)*1.2*sh; sy += Math.cos(t*1.8 + d.jy)*1.2*sh; }
      var glow = fp * (0.45 + 0.18*Math.sin(t*2.2 + i));
      drawDroneAt(d, t, sx, sy, Math.sin(t*1.5 + d.jx)*0.05*(1 - fp), glow);
      d._x = sx; d._y = sy; d._on = (fp > 0.25);
    }
  }
  function popDrone(x, y, hue){
    POPS.push({ x: x, y: y, t0: lastT });
    for (var k = 0; k < 22; k++){
      var ang = rnd(0, 6.2832), v = rnd(30, 155);
      FW.push({ x: x, y: y, vx: Math.cos(ang)*v, vy: Math.sin(ang)*v, life: rnd(.5, 1.1), age: 0, hue: hue + rnd(-22, 22), r: rnd(.7, 1.8) });
    }
  }
  function drawPops(t){
    for (var i = POPS.length-1; i >= 0; i--){
      var p = POPS[i], age = t - p.t0, life = 0.5;
      if (age > life){ POPS.splice(i, 1); continue; }
      var q = age/life, f = 1 - q;
      ctx.fillStyle = 'rgba(255,250,235,' + (f*0.7).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 3 + q*6, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(255,235,200,' + (f*0.6).toFixed(3) + ')'; ctx.lineWidth = 2*f + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 + q*34, 0, 6.2832); ctx.stroke();
    }
  }
  /* ── shooting stars ── */
  function drawShooting(t, dt){
    if (t >= nextShootAt){
      nextShootAt = t + rnd(6, 16);
      var dir = Math.random() < .5 ? 1 : -1, ang = 0.15 + Math.random()*0.5, sp = rnd(380, 620);
      SHOOT.push({ x: dir > 0 ? rnd(60, 600) : rnd(DW-600, DW-60), y: rnd(40, 250), vx: dir*Math.cos(ang)*sp, vy: Math.sin(ang)*sp, age: 0, life: rnd(.5, .9), len: rnd(60, 120) });
    }
    ctx.globalCompositeOperation = 'lighter';
    for (var i = SHOOT.length-1; i >= 0; i--){
      var s = SHOOT[i]; s.age += dt;
      if (s.age > s.life){ SHOOT.splice(i, 1); continue; }
      s.x += s.vx*dt; s.y += s.vy*dt;
      var f = 1 - s.age/s.life, sp2 = Math.hypot(s.vx, s.vy) || 1;
      var tx = s.x - s.vx/sp2*s.len, ty = s.y - s.vy/sp2*s.len;
      ctx.strokeStyle = lgrad(ctx, s.x, s.y, tx, ty, [[0,'rgba(255,255,255,' + (f*0.95).toFixed(3) + ')'],[0.4,'rgba(200,225,255,' + (f*0.4).toFixed(3) + ')'],[1,'rgba(200,225,255,0)']]);
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + f.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
  }
  /* ── Museum of the Future: expanding coloured light rings on click ── */
  function drawMuseumFx(t){
    for (var i = MFX.length-1; i >= 0; i--){
      var fx = MFX[i], age = t - fx.t0, life = 1.5;
      if (age > life){ MFX.splice(i, 1); continue; }
      var q = age/life, f = 1 - q, r = 8 + q*118;
      if (q < 0.5){
        ctx.fillStyle = rgrad(ctx, MUSEUM.cx, MUSEUM.cy, 0, r, [[0,'hsla(' + fx.hue + ',95%,66%,' + (f*0.18).toFixed(3) + ')'],[1,'hsla(' + fx.hue + ',95%,66%,0)']]);
        ctx.beginPath(); ctx.ellipse(MUSEUM.cx, MUSEUM.cy, r, r*0.92, 0, 0, 6.2832); ctx.fill();
      }
      ctx.strokeStyle = 'hsla(' + fx.hue + ',95%,62%,' + (f*0.85).toFixed(3) + ')'; ctx.lineWidth = 3*f + 0.6;
      ctx.beginPath(); ctx.ellipse(MUSEUM.cx, MUSEUM.cy, r, r*0.92, 0, 0, 6.2832); ctx.stroke();
    }
  }
  /* ── birds drifting across the sky ── */
  function drawBirds(t, dt){
    ctx.strokeStyle = 'rgba(18,22,38,.8)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    for (var k = 0; k < BIRDS.length; k++){
      var bd = BIRDS[k];
      bd.x += bd.vx*dt;
      if (bd.x < -20){ bd.x = DW + 20; bd.y = rnd(230, 440); } else if (bd.x > DW + 20){ bd.x = -20; bd.y = rnd(230, 440); }
      var y = bd.y + Math.sin(t*0.8 + bd.bob)*6, wy = -3 - Math.sin(t*bd.flapSp + bd.flap)*1.8, dir = bd.vx >= 0 ? 1 : -1;
      ctx.save(); ctx.translate(bd.x, y); ctx.scale(bd.s*dir, bd.s);
      ctx.beginPath(); ctx.moveTo(-4.5, 0); ctx.quadraticCurveTo(-2.2, wy, 0, -.4); ctx.quadraticCurveTo(2.2, wy, 4.5, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.lineCap = 'butt';
  }
  /* ── Ain Dubai observation wheel ── */
  function drawFerris(t, dt){
    var cx = AW_X, cy = AW_Y, R = AW_R;
    var spin = (t > awBoostStart && t < awBoostStart + 4) ? Math.min(1, (t - awBoostStart)/.5, (awBoostStart + 4 - t)/2) : 0;
    awAngle += AW_BASE_W*(1 + 3.4*spin)*dt;
    var a = awAngle, i;
    ctx.fillStyle = rgrad(ctx, cx, cy, 0, R*1.15, [[0,'rgba(120,180,230,' + (0.09 + 0.10*spin).toFixed(3) + ')'],[1,'rgba(120,180,230,0)']]);
    ctx.beginPath(); ctx.arc(cx, cy, R*1.15, 0, 6.2832); ctx.fill();
    var sD = 'rgba(72,86,106,', sL = 'rgba(150,170,196,', sH = 'rgba(208,222,242,';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    function leg(x0){
      ctx.strokeStyle = sD + '.96)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0, HZ); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.strokeStyle = sL + '.85)'; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(x0, HZ); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.strokeStyle = sH + '.45)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x0-1, HZ-1); ctx.lineTo(cx-1, cy); ctx.stroke();
    }
    leg(cx-72); leg(cx+72); leg(cx-46); leg(cx+46);
    ctx.strokeStyle = sD + '.85)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx-60, HZ-74); ctx.lineTo(cx+60, HZ-74); ctx.stroke();
    ctx.fillStyle = sD + '.95)'; ctx.fillRect(cx-82, HZ-3, 22, 7); ctx.fillRect(cx+60, HZ-3, 22, 7);
    var Rin = R - 9, N = 24;
    ctx.strokeStyle = sL + '.5)'; ctx.lineWidth = 1.7;
    ctx.beginPath(); for (i = 0; i < N; i++){ var an = a + i*6.2832/N; ctx.moveTo(cx, cy); ctx.lineTo(cx+Math.cos(an)*Rin, cy+Math.sin(an)*Rin); } ctx.stroke();
    ctx.strokeStyle = sD + '.96)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, Rin, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = sH + '.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI*0.86, Math.PI*1.62); ctx.stroke();
    ctx.strokeStyle = sL + '.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (i = 0; i < 48; i++){ var at = i*6.2832/48; ctx.moveTo(cx+Math.cos(at)*Rin, cy+Math.sin(at)*Rin); ctx.lineTo(cx+Math.cos(at)*R, cy+Math.sin(at)*R); } ctx.stroke();
    var M = 72;
    for (i = 0; i < M; i++){
      var ar = i*6.2832/M, rx = cx+Math.cos(ar)*R, ry = cy+Math.sin(ar)*R;
      if (spin > 0){ var hue = (t*200 + i*12) % 360; ctx.fillStyle = 'hsla(' + hue + ',95%,62%,' + (0.45 + 0.5*spin).toFixed(3) + ')'; }
      else { var tw = 0.5 + 0.5*Math.sin(t*3 + i*0.6); ctx.fillStyle = 'rgba(255,210,130,' + (0.3 + 0.5*tw).toFixed(3) + ')'; }
      ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = rgrad(ctx, cx-3, cy-3, 1, 13, [[0, sH + '1)'],[0.55, sL + '1)'],[1, sD + '1)']]);
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = sD + '1)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(255,225,160,.9)'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, 6.2832); ctx.fill();
    var C = 24;
    for (i = 0; i < C; i++){
      var ac = a + i*6.2832/C, gx = cx+Math.cos(ac)*(R+2), gy = cy+Math.sin(ac)*(R+2);
      ctx.fillStyle = sD + '.95)'; ctx.beginPath(); ctx.ellipse(gx, gy, 3.4, 4.1, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,140,.95)'; ctx.beginPath(); ctx.ellipse(gx, gy, 1.9, 2.6, 0, 0, 6.2832); ctx.fill();
    }
    var refA = 0.12 + 0.10*spin;
    ctx.fillStyle = rgrad(ctx, cx, HZ+28, 0, 70, [[0,'rgba(255,205,135,' + refA.toFixed(3) + ')'],[1,'rgba(255,205,135,0)']]);
    ctx.beginPath(); ctx.ellipse(cx, HZ+28, 60, 22, 0, 0, 6.2832); ctx.fill();
    ctx.lineCap = 'butt';
  }
  /* ── tower crane + window-cleaning gondola ── */
  function drawCrane(t){
    var bx = CRANE.bx, topY = CRANE.roofY - CRANE.mastH, baseY = CRANE.roofY, mw = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40,52,74,.95)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(bx-mw, baseY); ctx.lineTo(bx-mw, topY); ctx.moveTo(bx+mw, baseY); ctx.lineTo(bx+mw, topY); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,52,74,.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (var yy = baseY; yy > topY; yy -= 12){ ctx.moveTo(bx-mw, yy); ctx.lineTo(bx+mw, yy-6); ctx.moveTo(bx+mw, yy); ctx.lineTo(bx-mw, yy-6); } ctx.stroke();
    var jd = Math.sin(t*CRANE.sp), jibTipX = bx + CRANE.jib*jd, ctrTipX = bx - CRANE.cjib*jd, jY = topY - 2;
    ctx.strokeStyle = 'rgba(48,62,90,.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ctrTipX, jY); ctx.lineTo(jibTipX, jY); ctx.stroke();
    ctx.strokeStyle = 'rgba(48,62,90,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, jY+8); ctx.lineTo(jibTipX, jY); ctx.moveTo(bx, jY+8); ctx.lineTo(ctrTipX, jY);
    ctx.moveTo(bx, jY); ctx.lineTo(bx, jY-12); ctx.lineTo(jibTipX, jY); ctx.moveTo(bx, jY-12); ctx.lineTo(ctrTipX, jY); ctx.stroke();
    ctx.fillStyle = 'rgba(34,44,64,.95)'; ctx.fillRect(ctrTipX-5, jY-3, 10, 9);
    var trolley = bx + (jibTipX - bx)*(0.35 + 0.45*(0.5 + 0.5*Math.sin(t*0.5))), hookLen = 28 + 16*Math.sin(t*0.7);
    ctx.strokeStyle = 'rgba(70,82,104,.8)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(trolley, jY+1); ctx.lineTo(trolley, jY+1+hookLen); ctx.stroke();
    ctx.fillStyle = 'rgba(40,50,70,.9)'; ctx.fillRect(trolley-3, jY+1+hookLen, 6, 4);
    var bl = Math.pow(Math.max(0, Math.sin(t*2.2)), 6);
    if (bl > .05){
      ctx.fillStyle = 'rgba(255,60,50,' + (bl*.4).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(bx, jY-13, 5, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,80,70,' + bl.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(bx, jY-13, 1.7, 0, 6.2832); ctx.fill();
    }
    var bl2 = Math.pow(Math.max(0, Math.sin(t*2.2 + 1)), 6);
    if (bl2 > .05){ ctx.fillStyle = 'rgba(255,80,70,' + bl2.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(jibTipX, jY, 1.5, 0, 6.2832); ctx.fill(); }
    ctx.lineCap = 'butt';
  }
  function drawGondola(t){
    var gx = GOND.x, span = GOND.low - GOND.roofY, gy = GOND.roofY + span*(0.5 + 0.5*Math.sin(t*0.18));
    ctx.fillStyle = 'rgba(40,52,74,.9)'; ctx.fillRect(gx-10, GOND.roofY-3, 20, 3);
    ctx.strokeStyle = 'rgba(30,38,56,.7)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(gx-7, GOND.roofY); ctx.lineTo(gx-7, gy); ctx.moveTo(gx+7, GOND.roofY); ctx.lineTo(gx+7, gy); ctx.stroke();
    ctx.fillStyle = 'rgba(62,74,96,.95)'; ctx.fillRect(gx-9, gy, 18, 4);
    ctx.fillStyle = 'rgba(255,210,120,' + (0.4 + 0.4*Math.sin(t*3)).toFixed(3) + ')'; ctx.fillRect(gx-2, gy-2, 4, 2);
  }

  /* ── rare desert thunderstorm ── */
  function makeBolt(t){
    var x = rnd(180, 1320), top = rnd(28, 140);
    var endY = rnd(HZ-240, HZ-30), ex = x + rnd(-60, 60), n = 10, pts = [{ x: x, y: top }];
    for (var i = 1; i <= n; i++){ var f = i/n; pts.push({ x: x + (ex-x)*f + rnd(-20, 20), y: top + (endY-top)*f }); }
    var branches = [], bc = 1 + (Math.random() < .6 ? 1 : 0);
    for (var b = 0; b < bc; b++){
      var si = 2 + (Math.random()*(n-3)|0), bp = pts[si], br = [{ x: bp.x, y: bp.y }], bn = 3 + (Math.random()*3|0);
      for (var j = 1; j <= bn; j++) br.push({ x: bp.x + rnd(-50, 50)*j/bn + rnd(-12, 12), y: bp.y + (40 + rnd(0, 60))*j/bn });
      branches.push(br);
    }
    STORM.bolts.push({ t0: t, life: .16 + Math.random()*.18, pts: pts, branches: branches, mag: .7 + Math.random()*.3 });
    STORM.flashT = t; STORM.flashMag = .55 + Math.random()*.35;
  }
  function updateStorm(t, dt){
    if (STORM.nextAt == null) STORM.nextAt = t + 38;
    if (t >= STORM.nextAt){ STORM.start = t; STORM.nextAt = t + rnd(240, 360); }
    var local = STORM.start == null ? 999 : t - STORM.start;
    STORM.env = (local >= 0 && local < STORM_LEN) ? Math.min(1, local/2, (STORM_LEN - local)/3) : 0;
    if (STORM.env > 0){ if (t >= STORM.nextBolt){ makeBolt(t); STORM.nextBolt = t + 1.0 + Math.random()*2.2; } }
    else STORM.nextBolt = t + .3;
  }
  function drawStormClouds(t){
    if (STORM.env <= 0) return;
    var a = STORM.env*0.45;
    ctx.fillStyle = lgrad(ctx, 0,0,0,300, [[0,'rgba(10,10,20,' + a.toFixed(3) + ')'],[1,'rgba(10,10,20,0)']]); ctx.fillRect(0, 0, DW, 300);
    for (var i = 0; i < 6; i++){
      var cx = ((i*280 + t*8) % (DW + 200)) - 100, cy = 60 + (i % 3)*30, r = 90 + (i % 2)*40;
      ctx.fillStyle = rgrad(ctx, cx, cy, 0, r, [[0,'rgba(20,22,34,' + (a*0.9).toFixed(3) + ')'],[1,'rgba(20,22,34,0)']]);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();
    }
  }
  function strokeBolt(pts, reflect){
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++){
      var x = pts[i].x, y = pts[i].y;
      if (reflect){ y = 2*HZ - y; x += Math.sin(y*0.05 + pts[i].y)*4; }
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  function drawBoltPath(pts, a, reflect){
    if (a <= 0.02) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(150,190,255,' + (a*0.5).toFixed(3) + ')'; ctx.lineWidth = 5; strokeBolt(pts, reflect);
    ctx.strokeStyle = 'rgba(235,245,255,' + Math.min(1, a).toFixed(3) + ')'; ctx.lineWidth = 1.8; strokeBolt(pts, reflect);
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }
  function drawStormBolts(t){
    for (var i = STORM.bolts.length-1; i >= 0; i--){
      var bolt = STORM.bolts[i], age = t - bolt.t0;
      if (age > bolt.life){ STORM.bolts.splice(i, 1); continue; }
      var flick = Math.sin(age*80) > 0 ? 1 : 0.4, a = (1 - age/bolt.life)*flick*bolt.mag;
      drawBoltPath(bolt.pts, a, false);
      for (var b = 0; b < bolt.branches.length; b++) drawBoltPath(bolt.branches[b], a*0.7, false);
      drawBoltPath(bolt.pts, a*0.28, true);
    }
  }
  function drawStormFlash(t){
    var age = t - STORM.flashT;
    if (age < 0 || age > 0.5) return;
    var env = age < 0.06 ? age/0.06 : Math.max(0, (0.5 - age)/0.44);
    var a = STORM.flashMag * env*(0.7 + 0.3*Math.sin(age*60)) * 0.5;
    if (a <= 0.01) return;
    ctx.fillStyle = 'rgba(200,220,255,' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, DW, DH);
    ctx.fillStyle = lgrad(ctx, 0,HZ,0,HZ+120, [[0,'rgba(210,225,255,' + (a*0.8).toFixed(3) + ')'],[1,'rgba(210,225,255,0)']]); ctx.fillRect(0, HZ, DW, 120);
  }

  /* ── the fleet: several boat types crossing the bay ── */
  function spawnBoat(b){
    b.type = BOAT_TYPES[(Math.random()*BOAT_TYPES.length)|0];
    var cfg = BOAT_CFG[b.type];
    b.dir  = Math.random() < .5 ? 1 : -1;
    b.x    = b.dir > 0 ? -(cfg.half + 160) : DW + cfg.half + 160;
    b.y    = 798 + Math.random()*18;
    b.sp   = cfg.spMin + Math.random()*cfg.spVar;
    b.ph   = Math.random()*6.28;
    b.on   = true;
  }
  function navLight(px, py, col, intensity){
    var ia = Math.min(1, intensity), R = 4;
    ctx.fillStyle = rgrad(ctx, px, py, 0, R, [[0,'rgba(' + col + ',' + (0.42*ia).toFixed(3) + ')'],[0.5,'rgba(' + col + ',' + (0.12*ia).toFixed(3) + ')'],[1,'rgba(' + col + ',0)']]);
    ctx.beginPath(); ctx.arc(px, py, R, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(' + col + ',' + (0.45 + 0.5*ia).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(px, py, 1.2, 0, 6.2832); ctx.fill();
  }
  function litCol(blinking, blinkOn, steady){ return blinking ? (blinkOn ? 1 : 0.08) : steady; }
  function drawDhowHull(t, b, blinking, blinkOn){
    ctx.fillStyle = lgrad(ctx, 0,-10,0,8, [[0,'#6b4424'],[1,'#2c1b0f']]);
    ctx.beginPath(); ctx.moveTo(-48, -4); ctx.quadraticCurveTo(0, 14, 52, -4); ctx.quadraticCurveTo(60, -8, 50, -9);
    ctx.quadraticCurveTo(0, 3, -42, -9); ctx.quadraticCurveTo(-55, -10, -48, -4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(220,180,120,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-42, -7); ctx.quadraticCurveTo(0, 1, 50, -7); ctx.stroke();
    ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(4, -54); ctx.stroke();
    var belly = 34 + Math.sin(t*1.6 + b.ph)*4;
    ctx.fillStyle = lgrad(ctx, 0,-54,0,-8, [[0,'rgba(255,244,224,.96)'],[1,'rgba(236,214,182,.92)']]);
    ctx.beginPath(); ctx.moveTo(4, -52); ctx.quadraticCurveTo(belly, -40, 44, -8); ctx.quadraticCurveTo(20, -12, 4, -10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,60,.5)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(4, -52); ctx.lineTo(44, -8); ctx.stroke();
    var fl = Math.sin(t*6 + b.ph)*2.2;
    ctx.fillStyle = 'rgba(216,64,64,.92)'; ctx.beginPath(); ctx.moveTo(4, -54); ctx.lineTo(17, -52 + fl); ctx.lineTo(4, -49.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a2614'; ctx.fillRect(-34, -12, 16, 7);
    ctx.fillStyle = 'rgba(255,206,110,' + Math.min(1, litCol(blinking, blinkOn, 0.55 + 0.35*Math.sin(t*4))).toFixed(3) + ')';
    ctx.fillRect(-32, -10, 3, 3); ctx.fillRect(-27, -10, 3, 3); ctx.fillRect(-22, -10, 3, 3);
  }
  function drawYachtHull(t, b, blinking, blinkOn){
    ctx.fillStyle = lgrad(ctx, 0,-8,0,6, [[0,'#eef3f8'],[.6,'#d3dde7'],[1,'#9fb0c0']]);
    ctx.beginPath(); ctx.moveTo(-54, -2); ctx.lineTo(44, -2); ctx.quadraticCurveTo(62, -2, 60, 6); ctx.lineTo(-50, 6); ctx.quadraticCurveTo(-56, 4, -54, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(40,70,110,.55)'; ctx.fillRect(-52, 2.4, 110, 1.6);
    ctx.fillStyle = '#f4f8fc'; ctx.beginPath(); ctx.moveTo(-30, -2); ctx.lineTo(22, -2); ctx.lineTo(16, -14); ctx.lineTo(-26, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e3ecf4'; ctx.beginPath(); ctx.moveTo(-22, -14); ctx.lineTo(8, -14); ctx.lineTo(4, -22); ctx.lineTo(-18, -22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#cdd9e4'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-7, -22); ctx.lineTo(-7, -34); ctx.stroke();
    var wlit = litCol(blinking, blinkOn, 0.5 + 0.3*Math.sin(t*3));
    ctx.fillStyle = 'rgba(120,200,255,' + Math.min(1, 0.35 + 0.55*wlit).toFixed(3) + ')';
    for (var wx = -26; wx <= 16; wx += 7) ctx.fillRect(wx, -11, 4, 3);
    ctx.fillRect(-16, -20, 18, 3);
  }
  function drawAbraHull(t, b, blinking, blinkOn){
    ctx.fillStyle = '#5a3c20';
    ctx.beginPath(); ctx.moveTo(-34, -2); ctx.quadraticCurveTo(0, 9, 36, -2); ctx.quadraticCurveTo(40, -5, 34, -6); ctx.quadraticCurveTo(0, 2, -32, -6); ctx.quadraticCurveTo(-38, -5, -34, -2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(210,170,110,.5)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-30, -5); ctx.quadraticCurveTo(0, 0, 32, -5); ctx.stroke();
    ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(-22, -15); ctx.moveTo(20, -6); ctx.lineTo(20, -15); ctx.stroke();
    ctx.fillStyle = '#7a8a3a'; ctx.fillRect(-25, -17, 48, 3);
    ctx.fillStyle = 'rgba(20,24,34,.85)';
    for (var px = -16; px <= 12; px += 9){ ctx.beginPath(); ctx.arc(px, -8, 2, 0, 6.2832); ctx.fill(); ctx.fillRect(px-1.6, -8, 3.2, 5); }
    ctx.fillStyle = 'rgba(255,206,110,' + Math.min(1, litCol(blinking, blinkOn, 0.5 + 0.3*Math.sin(t*4))).toFixed(3) + ')'; ctx.fillRect(-1.5, -16, 3, 2);
  }
  function drawSpeedboatHull(t, b, blinking, blinkOn){
    ctx.fillStyle = '#d8dde2';
    ctx.beginPath(); ctx.moveTo(-30, -2); ctx.lineTo(24, -3); ctx.quadraticCurveTo(40, -4, 36, 2); ctx.lineTo(-26, 4); ctx.quadraticCurveTo(-32, 2, -30, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b02c2c'; ctx.fillRect(-28, -0.5, 64, 2);
    ctx.fillStyle = 'rgba(60,80,100,.85)'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(10, -3); ctx.lineTo(6, -9); ctx.lineTo(-2, -9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(20,24,34,.8)'; ctx.beginPath(); ctx.arc(-6, -5, 2, 0, 6.2832); ctx.fill(); ctx.fillRect(-7.6, -5, 3.2, 5);
    if (blinking){ ctx.fillStyle = 'rgba(255,230,180,' + (blinkOn?0.9:0.05).toFixed(3) + ')'; ctx.fillRect(-1, -10, 2, 2); }
  }
  var BOAT_HULL = { dhow: drawDhowHull, yacht: drawYachtHull, abra: drawAbraHull, speedboat: drawSpeedboatHull };
  function drawBoats(t, dt){
    for (var i = BOATW.length-1; i >= 0; i--){
      var p = BOATW[i]; p.age += dt;
      if (p.age > 2.6){ BOATW.splice(i, 1); continue; }
      p.x += p.vx*dt; p.y += (p.vy + p.side*6)*dt;
      var f = 1 - p.age/2.6;
      ctx.fillStyle = 'rgba(225,240,255,' + (f*0.4).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 3.5*(1.4-f), 1.4*(1.4-f), 0, 0, 6.2832); ctx.fill();
    }
    if (BOATW.length > 160) BOATW.splice(0, BOATW.length - 160);
    for (var bi = 0; bi < BOATS.length; bi++){
      var b = BOATS[bi], cfg = BOAT_CFG[b.type];
      if (!b.on){ b._on = false; b.wait -= dt; if (b.wait <= 0) spawnBoat(b); continue; }
      b.x += b.dir*b.sp*dt;
      cfg = BOAT_CFG[b.type];
      if (Math.sin(t*22 + bi*1.7) > .3){
        BOATW.push({ x: b.x + cfg.sternX*b.dir, y: b.y - 1, vx: -b.dir*(4 + Math.random()*6 + (b.type==='speedboat'?16:0)), vy: (Math.random()-.5)*4, side: Math.random()<.5?-1:1, age: 0 });
      }
      if ((b.dir > 0 && b.x > DW + cfg.half + 160) || (b.dir < 0 && b.x < -cfg.half - 160)){ b.on = false; b._on = false; b.wait = 6 + Math.random()*12; continue; }
      var blinking = t < b.blinkUntil, blinkOn = blinking && (Math.sin(t*24) > 0);
      var fast = b.type === 'speedboat';
      var bob  = Math.sin(t*1.3 + b.ph)*(fast ? 1.5 : 2.6), rock = Math.sin(t*0.95 + b.ph*1.3)*(fast ? 0.02 : 0.045);
      /* soft shadow cast on the water — stays at the waterline as the hull bobs */
      ctx.fillStyle = rgrad(ctx, b.x, b.y + 6, 0, cfg.half, [[0,'rgba(6,12,22,.34)'],[1,'rgba(6,12,22,0)']]);
      ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, cfg.half*0.95, 5.5, 0, 0, 6.2832); ctx.fill();
      ctx.save();
      ctx.translate(b.x, b.y + bob); ctx.rotate(rock); ctx.scale(b.dir, 1);
      BOAT_HULL[b.type](t, b, blinking, blinkOn);
      var navI = blinking ? (blinkOn ? 1 : 0.1) : 0.55, strobe = Math.pow(Math.max(0, Math.sin(t*5)), 14);
      for (var li = 0; li < cfg.lights.length; li++){
        var L = cfg.lights[li];
        var inten = (li === 2) ? (blinking ? (blinkOn ? 1 : 0.1) : (0.25 + 0.7*strobe)) : navI;
        navLight(L[0], L[1], L[2], inten);
      }
      ctx.restore();
      b._x = b.x; b._y = b.y + bob; b._half = cfg.half; b._on = true;
    }
  }

  /* ── dolphins leaping from the water now and then ── */
  var DOLPHINS = [];
  function spawnDolphins(){
    var pod = 1 + (Math.random()*3|0), x0 = rnd(120, 1050), yW = rnd(795, 860), dir = Math.random() < .5 ? -1 : 1;
    for (var k = 0; k < pod; k++)
      DOLPHINS.push({ x0: x0 - dir*k*60 + rnd(-8,8), yW: yW + rnd(-4,4), dir: dir, delay: k*.38 + rnd(0,.15), age: 0, T: rnd(1.4,1.8), trav: rnd(75,115), hgt: rnd(36,54) });
  }
  function drawDolphinBody(g){
    g.fillStyle = '#4e6172';
    g.beginPath(); g.moveTo(-7.4, 0); g.quadraticCurveTo(-8.9,-1.8, -10.2,-2.3); g.quadraticCurveTo(-8.8,-.3, -8.7, 0);
    g.quadraticCurveTo(-8.8,.3, -10.2, 2.3); g.quadraticCurveTo(-8.9,1.8, -7.4, 0); g.closePath(); g.fill();
    g.fillStyle = lgrad(g, 0,-2.7,0,2.4, [[0,'#56697a'],[.45,'#6b8092'],[.7,'#9fb2c0'],[.85,'#e6eef4'],[1,'#f2f7fa']]);
    g.beginPath(); g.moveTo(8.6, .1); g.quadraticCurveTo(7,-1, 5,-1.7); g.quadraticCurveTo(1,-2.6, -3.3,-1.6); g.quadraticCurveTo(-6.5,-.7, -7.9,-.2);
    g.quadraticCurveTo(-6.9,.4, -3.3,1.5); g.quadraticCurveTo(1.7,2.5, 6.1,.9); g.quadraticCurveTo(7.8,.5, 8.6,.1); g.closePath(); g.fill();
    g.fillStyle = '#56697a'; g.beginPath(); g.moveTo(1.7,-2.1); g.quadraticCurveTo(.6,-4.4, -1,-4.1); g.quadraticCurveTo(-.9,-2.9, -1.9,-1.9); g.closePath(); g.fill();
    g.fillStyle = '#5c7186'; g.beginPath(); g.ellipse(1.9, 1.2, .5, 1.4, .6, 0, 6.2832); g.fill();
    g.strokeStyle = 'rgba(35,48,60,.6)'; g.lineWidth = .22; g.lineCap = 'round';
    g.beginPath(); g.moveTo(8.4,.35); g.quadraticCurveTo(6.6,.95, 5.4,.75); g.stroke();
    g.fillStyle = '#101820'; g.beginPath(); g.arc(5.1,-.6, .3, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(5.2,-.7, .11, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(30,42,52,.7)'; g.beginPath(); g.ellipse(3.4,-2.05, .3, .15, -.2, 0, 6.2832); g.fill();
  }
  function splash(x, y, q, s){
    var grow = 1 - q;
    ctx.strokeStyle = 'rgba(220,240,255,' + (.38*q) + ')'; ctx.lineWidth = 1.2*s;
    ctx.beginPath(); ctx.ellipse(x, y, (4 + grow*24)*s, (1.2 + grow*5)*s, 0, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(235,248,255,' + (.5*q) + ')';
    for (var i = 0; i < 5; i++){ var a = -Math.PI/2 + (i-2)*.4, L = (6 + grow*10)*s; ctx.fillRect(x + Math.cos(a)*L, y + Math.sin(a)*L - 2*s, 1.1*s, 2.4*s); }
  }
  function drawDolphins(t, dt){
    if (DOLPHINS.length === 0 && Math.random() < dt*.05) spawnDolphins();
    for (var k = DOLPHINS.length-1; k >= 0; k--){
      var d = DOLPHINS[k];
      d.age += dt;
      var p = (d.age - d.delay) / d.T;
      if (p >= 1.1){ DOLPHINS.splice(k, 1); continue; }
      if (p <= 0) continue;
      var pc = Math.min(1, p), s = (.7 + (d.yW - 790)/110*.8) * 4;
      var xx = d.x0 + d.dir * pc * d.trav, yy = d.yW - Math.sin(pc*Math.PI) * d.hgt;
      var vx = d.dir * d.trav / d.T, vy = -Math.cos(pc*Math.PI) * Math.PI * d.hgt / d.T;
      if (p < 1){
        ctx.save();
        ctx.beginPath(); ctx.rect(xx - 14*s, d.yW - d.hgt - 12*s, 28*s, d.hgt + 12*s); ctx.clip();
        ctx.translate(xx, yy); ctx.scale(s, s); ctx.rotate(Math.atan2(vy, vx));
        if (d.dir < 0) ctx.scale(1, -1);
        drawDolphinBody(ctx);
        ctx.restore();
      }
      if (p < .22) splash(d.x0, d.yW, 1 - p/.22, s);
      if (p > .78) splash(d.x0 + d.dir*d.trav, d.yW, Math.max(0, 1 - (p-.78)/.32), s*1.2);
    }
  }

  /* ── black oil gusher erupting from the sea every few minutes ── */
  var OIL_PERIOD = 150, OIL_LEN = 8, OIL_OFFSET = 130;
  var OIL = { x: 0, y: 0, cyc: -1 }, OILP = [];
  function drawOil(t, dt){
    var ot = t + OIL_OFFSET, cyc = ot / OIL_PERIOD | 0, osp = ot % OIL_PERIOD;
    if (cyc !== OIL.cyc){ OIL.cyc = cyc; OIL.x = rnd(200, 950); OIL.y = rnd(800, 858); }
    var env = osp < OIL_LEN ? Math.min(1, osp/.8, (OIL_LEN - osp)/1.5) : 0, after = osp - OIL_LEN;
    if (env <= 0 && (after > 14 || after < 0) && OILP.length === 0) return;
    var s = .7 + (OIL.y - 790)/110*.8, x = OIL.x, y = OIL.y;
    var spread = Math.min(osp, OIL_LEN + 4), sa = env > 0 ? .55 : Math.max(0, .55*(1 - after/14));
    if (sa > 0){
      ctx.fillStyle = 'rgba(6,6,10,' + sa + ')';
      ctx.beginPath(); ctx.ellipse(x, y+1, (6 + spread*4.5)*s, (1.6 + spread*.55)*s, 0, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(140,110,180,' + (sa*.35) + ')'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.ellipse(x, y+1, (6 + spread*4.5)*s, (1.6 + spread*.55)*s, 0, 0, 6.2832); ctx.stroke();
    }
    if (env > 0){
      var want = dt*200*env, n = (want|0) + (Math.random() < want%1 ? 1 : 0);
      for (var q = 0; q < n; q++){
        var g = (55 + rnd(0,95))|0;
        OILP.push({ x: x + rnd(-2.5,2.5)*s, y: y, vx: rnd(-7,7)*s, vy: -rnd(165,235)*s, age: 0, s: s, g: g, r: rnd(.9,2.2)*s });
      }
    }
    for (var k = OILP.length-1; k >= 0; k--){
      var p = OILP[k];
      p.age += dt;
      if (p.age > 3.2 || p.y > OIL.y + 3){ OILP.splice(k, 1); continue; }
      p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 170*p.s*dt;
      var f = Math.max(0, 1 - p.age/3.2);
      ctx.fillStyle = 'rgba(' + p.g + ',' + p.g + ',' + (p.g+8) + ',' + (f*.95) + ')'; ctx.fillRect(p.x, p.y, p.r, p.r*1.35);
      if (p.r > 1.6*p.s){ ctx.fillStyle = 'rgba(255,160,90,' + (f*.15) + ')'; ctx.fillRect(p.x, p.y, .8*p.s, .8*p.s); }
    }
    if (OILP.length > 650) OILP.splice(0, OILP.length - 650);
  }

  /* ───────────────────────── the frame ───────────────────────── */
  var animId = null;
  function loop(ts){
    if (stopped) return;
    var t = ts * .001;
    var dt = Math.min(.05, t - lastT) || .016; lastT = t;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(off, ox, oy);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);

    /* dusk→night overlay (under the live lights) + a matching light-gain */
    nightFactor = (1 - Math.cos((t + DAY_OFFSET)/DAY_PERIOD * 6.2832)) / 2;
    LIGHT_GAIN = 1 + 1.3*nightFactor;
    if (nightFactor > 0.002){
      var na = nightFactor * 0.55;
      ctx.fillStyle = lgrad(ctx, 0,0,0,DH, [[0,'rgba(2,4,16,' + na.toFixed(3) + ')'],[HZ/DH*0.96,'rgba(8,7,22,' + na.toFixed(3) + ')'],[HZ/DH,'rgba(14,9,24,' + (na*0.92).toFixed(3) + ')'],[1,'rgba(2,6,18,' + (na*0.9).toFixed(3) + ')']]);
      ctx.fillRect(0, 0, DW, DH);
    }
    updateStorm(t, dt);
    drawStormClouds(t);
    drawBirds(t, dt);

    var sp = (t + SHOW_OFFSET) % SHOW_PERIOD;
    var env = sp < SHOW_LEN ? Math.min(1, sp/1.5, (SHOW_LEN - sp)/1.5) : 0;
    if (t > mShowStart && t < mShowEnd) env = Math.max(env, Math.min(1, (t - mShowStart)/.8, (mShowEnd - t)/1.5));
    var showHue = (t*40) % 360;
    var fsp = (t + FW_OFFSET) % FW_PERIOD;
    var fwEnv = fsp < FW_LEN ? Math.min(1, fsp/.6, (FW_LEN - fsp)/.6) : 0;
    if (t > mFwStart && t < mFwEnd) fwEnv = Math.max(fwEnv, Math.min(1, (t - mFwStart)/.4, (mFwEnd - t)/.6));
    var nsp = (t + FN_OFFSET) % FN_PERIOD;
    var fnEnv = nsp < FN_LEN ? Math.min(1, nsp/2.5, (FN_LEN - nsp)/2.5) : 0;
    if (t > mFnStart && t < mFnEnd) fnEnv = Math.max(fnEnv, Math.min(1, (t - mFnStart)/2, (mFnEnd - t)/2.5));

    drawMoonFx(t);
    updateWaves(t);
    for (var k = 0; k < BUILDINGS.length; k++){ drawDynWindows(BUILDINGS[k], t); drawAccent(BUILDINGS[k], t); }
    drawWaves(t);
    drawFerris(t, dt);
    drawCrane(t);
    drawGondola(t);

    if (env < 1){                                            /* the Burj's wandering yellow lights */
      for (k = 0; k < BURJ_YEL.length; k++){
        var yl = BURJ_YEL[k], yon = Math.sin(t*yl.sp + yl.ph);
        var ya = Math.max(0, Math.min(1, (yon + .15) * 3)) * (1 - env) * LIGHT_GAIN;
        if (ya < .05) continue;
        ctx.fillStyle = 'rgba(255,206,70,' + (ya*.22) + ')'; ctx.beginPath(); ctx.arc(yl.x, yl.y, yl.r*2.6, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(255,214,90,' + ya + ')'; ctx.fillRect(yl.x - yl.r/2, yl.y - yl.r/2, yl.r, yl.r*1.3);
      }
    }
    var starGain = 1 + 0.5*nightFactor;                       /* twinkling stars */
    for (k = 0; k < TWK.length; k++){
      var w = TWK[k], raw = (Math.sin(t*w.sp + w.ph) + 1) * .5, a = (0.25 + 0.75*raw*raw) * starGain;
      if (a < .05) continue;
      ctx.fillStyle = 'rgba(' + w.c + ',' + (a*0.14).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(w.x, w.y, w.r*1.7, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(' + w.c + ',' + Math.min(1, a).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(w.x, w.y, w.r*0.7, 0, 6.2832); ctx.fill();
      if (w.big && a > .5){
        var ln = w.r*(3 + 2*raw);
        ctx.strokeStyle = 'rgba(' + w.c + ',' + (a*0.5).toFixed(3) + ')'; ctx.lineWidth = .7;
        ctx.beginPath(); ctx.moveTo(w.x-ln, w.y); ctx.lineTo(w.x+ln, w.y); ctx.moveTo(w.x, w.y-ln); ctx.lineTo(w.x, w.y+ln); ctx.stroke();
      }
    }
    drawShooting(t, dt);
    if (env > 0) drawBurjShow(t, env, showHue);
    if (fwEnv > 0) spawnFireworks(dt, fwEnv, showHue);
    if (FW.length) drawFireworks(dt);
    drawPops(t);
    drawMuseumFx(t);
    for (k = 0; k < BEACONS.length; k++){                    /* red aviation beacons */
      var b = BEACONS[k], bl = Math.pow(Math.max(0, Math.sin(t*b.sp + b.ph)), 6);
      if (bl < .05) continue;
      ctx.fillStyle = 'rgba(255,60,50,' + (bl*.35) + ')'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r*3.5, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,80,70,' + bl + ')'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
    }
    var ft = (t % 85) / 85, fx = -60 + ft*1720, fy = 138 - ft*16;   /* distant aircraft */
    ctx.fillStyle = 'rgba(235,240,255,.8)'; ctx.fillRect(fx, fy, 1.6, 1.6);
    if (Math.sin(t*6) > .82){ ctx.fillStyle = 'rgba(255,90,80,.9)'; ctx.fillRect(fx - 3, fy, 1.4, 1.4); }
    for (k = 0; k < HELIS.length; k++) drawHeli(HELIS[k], t);
    drawBAHeli(t);
    drawCrossers(t, dt);
    drawShowDrones(t);
    drawMissiles(t, dt);
    drawBoats(t, dt);
    drawDolphins(t, dt);
    drawOil(t, dt);
    drawFountain(t, dt, env, showHue, fnEnv);
    for (k = 0; k < SPARKS.length; k++){                     /* sun glints on the water */
      var spk = SPARKS[k], ga = Math.max(0, Math.sin(t*spk.sp + spk.ph)); ga = ga*ga*ga * .55;
      if (ga < .05) continue;
      ctx.fillStyle = 'rgba(255,215,150,' + ga + ')'; ctx.fillRect(spk.x, spk.y, spk.len, 1.1);
    }
    drawStormBolts(t);
    drawStormFlash(t);
    animId = requestAnimationFrame(loop);
  }
  animId = requestAnimationFrame(loop);

  /* the loader calls this when the background is switched away */
  return function cleanup(){
    stopped = true;
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
    document.removeEventListener('click', onSceneClick);
    stage.innerHTML = '';
  };
  },
};
