/* ── Dubai skyline background module ────────────────────────────────────────
   Dubai at dusk: fixed 1600×900 design space (waterline y=780), cover-fitted
   & bottom-anchored; static scene (sky, skyline, Burj Khalifa, water +
   reflection, vignette) prerendered per resize; per-frame layer draws lights
   and effects only. Scheduled shows: Burj LED show, fireworks, fountain
   choreography, oil gusher (see *_PERIOD/_LEN/_OFFSET). Always on:
   per-building accent schemes, switching windows, twinkles, beacons,
   helicopters (one with searchlight + a shuttle that lands on the Burj Al
   Arab helipad), patrol drones, leaping bottlenose dolphins (reef-style
   rendering), water glints, a crossing aircraft, tower light-waves (a random
   tower's windows ripple bottom→top every ~15-30 s), and big warm-yellow
   lights switching all over the Burj whenever the LED show is off.
   Click reactions: Burj Khalifa → random LED show / fireworks burst (merged
   with the scheduled envelopes via Math.max); the fountain → a 20 s show;
   any other building → 6 s light-up boost. Hit-tests map screen→design
   coords through scale/ox/oy.
   Docs: backgrounds/README.md (see "dubai_skyline.html — Dubai at dusk").
   Loaded on demand by game/js/bg-loader.js. Registers itself into the
   BACKGROUNDS registry; init() mounts the scene into the given stage layer
   and returns a cleanup that stops every loop and listener it created. */
window.BACKGROUNDS=window.BACKGROUNDS||{};
window.BACKGROUNDS.dubai={
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

  /* Design space: 1600x900, waterline at y=780.
     Burj Khalifa near the right end, sunset glow on the left. */
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

  /* ───────────────────────── scene data (generated once) ───────────────────────── */

  var STARS = [], CLOUDS = [], FAR = [], BIRDS = [];
  var TWK = [], BEACONS = [], RIPPLES = [], SPARKS = [], BURJ_LIGHTS = [];

  for (var i = 0; i < 320; i++)
    STARS.push({ x: rnd(0,DW), y: rnd(0,580), r: rnd(.3,1.0), a: rnd(.25,.95) });
  for (i = 0; i < 84; i++){
    var st = STARS[(Math.random()*STARS.length)|0];
    var warm = Math.random() < .15;
    TWK.push({ x: st.x, y: st.y, r: .5 + Math.random()*1.1,
               c: warm ? '255,236,205' : (Math.random() < .5 ? '255,255,255' : '205,222,255'),
               sp: rnd(.7,2.2), ph: rnd(0,6.28), big: Math.random() < .22 });
  }

  for (i = 0; i < 7; i++){
    var cy = i < 4 ? rnd(300,520) : rnd(560,650);
    CLOUDS.push({ x: rnd(60,DW-60), y: cy, w: rnd(120,330), h: rnd(9,22),
                  a: rnd(.18,.38), warm: cy > 540 });
  }

  for (i = 0; i < 26; i++)
    FAR.push({ x: i*62 + rnd(-22,22), w: rnd(26,82), h: rnd(26,115) });

  for (i = 0; i < 5; i++)
    BIRDS.push({ x: rnd(180,650), y: rnd(250,430), s: rnd(.8,1.5) });

  for (i = 0; i < 340; i++){
    var ry = rnd(HZ+3, DH-2);
    RIPPLES.push({ x: rnd(0,DW), y: ry, w: rnd(8,95), a: rnd(.1,.5),
                   light: Math.random() < .42, deep: (ry-HZ)/(DH-HZ) });
  }
  for (i = 0; i < 30; i++)
    SPARKS.push({ x: SUNX + rnd(-1,1)*rnd(0,60), y: HZ + 4 + Math.pow(Math.random(),1.6)*90,
                  len: rnd(2,8), sp: rnd(1.5,4.5), ph: rnd(0,6.28) });

  /* ── buildings (left → right; later in list = drawn in front).
        Each building gets its own animated light scheme (anim). ── */
  var PAL = [[22,34,58],[26,41,66],[20,31,54],[29,44,71],[24,37,62]];
  var BUILDINGS = [
    { kind:'burjalarab', x:110, h:205, anim:{ type:'sail',  hue0:200, hueSp:8, sp:.35 } },
    { kind:'box', x:205,  w:34, h:150, crown:'flat',
      anim:{ type:'crown', hue0:30,  hueSp:5,  sp:.5 } },
    { kind:'cayan', x:250, w:46, h:235, anim:{ type:'twist', hue0:180, hueSp:10, sp:.45 } },
    { kind:'box', x:308,  w:36, h:185, crown:'spire', spire:26,
      anim:{ type:'edges', hue0:280, hueSp:8,  sp:.3 } },
    { kind:'box', x:352,  w:52, h:282, crown:'dome',           /* Princess Tower */
      anim:{ type:'crown', hue0:140, hueSp:4,  sp:.25 } },
    { kind:'box', x:412,  w:46, h:300, crown:'spire', spire:40,/* Marina supertall */
      anim:{ type:'scan',  hue0:330, hueSp:12, scanV:10 } },
    { kind:'box', x:466,  w:38, h:165, crown:'flat',
      anim:{ type:'pulse', hue0:45,  hueSp:3,  sp:.3 } },
    { kind:'box', x:520,  w:42, h:130, crown:'flat',
      anim:{ type:'edges', hue0:120, hueSp:7,  sp:.5 } },
    { kind:'box', x:650,  w:62, h:245, crown:'emir1',          /* Emirates Tower 1 */
      anim:{ type:'crown', hue0:210, hueSp:5,  sp:.4 } },
    { kind:'box', x:727,  w:54, h:200, crown:'emir2',          /* Emirates Tower 2 */
      anim:{ type:'crown', hue0:60,  hueSp:9,  sp:.6 } },
    { kind:'museum', x:600, h:92, anim:{ type:'museum', hue0:160, hueSp:6, sp:.35 } },
    { kind:'box', x:798,  w:40, h:262, crown:'flat',           /* Index */
      anim:{ type:'scan',  hue0:0,   hueSp:15, scanV:14 } },
    { kind:'frame', x:860, w:78, h:172, anim:{ type:'frame', hue0:42, hueSp:0, sp:.4 } },
    { kind:'box', x:955,  w:44, h:190, crown:'slantL',
      anim:{ type:'pulse', hue0:300, hueSp:4,  sp:.4 } },
    { kind:'box', x:1012, w:40, h:158, crown:'flat',
      anim:{ type:'edges', hue0:20,  hueSp:10, sp:.55 } },
    { kind:'box', x:1070, w:44, h:228, crown:'spire', spire:30,
      anim:{ type:'scan',  hue0:240, hueSp:7,  scanV:8 } },
    { kind:'box', x:1150, w:56, h:292, crown:'sail',           /* Address Downtown */
      anim:{ type:'crown', hue0:28,  hueSp:3,  sp:.3 } },
    { kind:'twin', x:1440, w:38, gap:22, h:235,                /* Address Sky View */
      anim:{ type:'bridge', hue0:190, hueSp:8, sp:.45 } },
    { kind:'box', x:1555, w:40, h:150, crown:'flat',
      anim:{ type:'pulse', hue0:90,  hueSp:6,  sp:.35 } }
  ];

  /* windows: part static (prerendered), part slowly switching on/off per building */
  function genBoxWindows(b, x0, w, h){
    var win = [], dyn = [];
    var left = x0+3, top = HZ-h+8;
    var cols = Math.max(2, ((w-6)/5.5)|0), rows = ((h-16)/8.5)|0;
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
        else if (q < .42)   /* these windows switch on and off, slowly */
          dyn.push({ x:wx, y:wy, c:col, a:rnd(.35,.95), sp:rnd(.03,.15), ph:rnd(0,6.28) });
        else
          win.push({ x:wx, y:wy, c:col, a:rnd(.3,.95) });
      }
    }
    b.win = win; b.dyn = dyn;
  }

  BUILDINGS.forEach(function(b, idx){
    b.c = PAL[idx % PAL.length];
    if (b.kind === 'box'){
      genBoxWindows(b, b.x, b.w, b.h);
      if (b.crown === 'flat'){ b.mech = Math.random() < .65; b.ant = Math.random() < .45; }
    } else if (b.kind === 'twin'){
      genBoxWindows(b, b.x, b.w, b.h);
      var b2 = { };
      genBoxWindows(b2, b.x + b.w + b.gap, b.w, b.h - 14);
      b.win2 = b2.win; b.dyn = b.dyn.concat(b2.dyn);
    } else if (b.kind === 'cayan'){
      b.win = [];
      for (var k = 0; k < 60; k++)
        b.win.push({ x: b.x + rnd(5, b.w-7), y: HZ - rnd(10, b.h-14),
                     c:'255,200,130', a: rnd(.25,.8) });
    }
  });

  /* red aviation beacons on the tallest towers (incl. Burj Al Arab mast) */
  [[378,492,1.6],[435,474,1.83],[818,512,2.06],[1092,546,2.29],[1178,462,2.52],[114.5,551,1.95]]
  .forEach(function(p,i){
    BEACONS.push({ x:p[0], y:p[1], r:1.5, sp:p[2], ph:i*1.4 });
  });

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

  for (i = 0; i < 175; i++){
    var rr = BRANGES[(Math.random()*BRANGES.length)|0];
    var bx = BX + rnd(rr[2], rr[3])*BS, by = HZ - rnd(rr[0], rr[1])*BS;
    var pp = Math.random();
    var bc = pp < .68 ? '255,200,125' : (pp < .9 ? '205,222,255' : '255,240,205');
    if (Math.random() < .12)   /* gentle twinkles on the Burj between shows */
      TWK.push({ x:bx, y:by, r: rnd(.7,1.4), c:bc, sp:rnd(.25,1), ph:rnd(0,6.28) });
    else
      BURJ_LIGHTS.push({ x:bx, y:by, r: rnd(.55,1.3), c:bc, a: rnd(.3,.95) });
  }
  BEACONS.push({ x:BX, y:HZ-456*BS, r:2.3, sp:2.6, ph:0 });
  BEACONS.push({ x:BX, y:HZ-415*BS, r:1.4, sp:2.6, ph:2.1 });

  /* big warm-yellow lights all over the Burj, switching on and off the whole
     time the LED show is NOT running */
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
  /* Ambient drone traffic: a few drones just fly across the sky and out — at
     most CROSS_MAX on screen at once. New drones arrive ONLY for the light show. */
  var CROSS_MAX = 5;
  var CROSS = [];
  for (i = 0; i < CROSS_MAX; i++)
    CROSS.push({ active: false, wait: rnd(0, 14), x: 0, y: 0, dir: 1, sp: 40,
                 s: 1.7, hue: 0, by: 8, bsp: 1, bph: 0, p1: 0, p2: 0 });

  /* ── Drone light show: a dedicated squadron flies IN from off-screen, forms
     TWO different simple shapes (a fresh pair every show), then flies OUT.
     The drones keep their pretty rendering and add only a SUBTLE shape-tracing
     glow. ~14 s every 2.5 min, or on a sky click. Placed LEFT, just below the
     moon, so the centered math-game card never covers it. */
  var DRONE_PERIOD = 150, DRONE_LEN = 14, DRONE_OFFSET = 132;  /* first show ~18 s after load */
  var MDRONE_LEN = 14;                                          /* a click-triggered show */
  var SHOW_N = 18;
  var SHOW = [];
  for (i = 0; i < SHOW_N; i++)
    SHOW.push({ px: 0, py: 0, s: rnd(1.5,2.0), hue: (i*53) % 360,
                jx: rnd(0,6.28), jy: rnd(0,6.28), p1: rnd(0,6.28), p2: rnd(0,6.28),
                t0x: 0, t0y: 0, t1x: 0, t1y: 0 });
  var DCX = 295, DCY = 350;                  /* formation center: left, below the moon (~300,140) */
  var dShowStart = -99, dShowLen = DRONE_LEN, dPrevEnv = 0, dCurSlot = -1, dShapeHue = 190, dMorphStart = -99;
  var dShapeStart = 0, dShowShapes = [0, 1];
  var mDroneStart = -99, mDroneEnd = -99;
  /* the simple shapes to pick from (generators are hoisted function decls) */
  var DSHAPES = [ { gen: ringPts, hue: 190 }, { gen: heartPts, hue: 332 }, { gen: starPts, hue: 45 } ];
  var POPS = [];                              /* drone explosion flashes/rings (sparks reuse FW) */

  /* shooting stars streaking across the upper sky every few seconds */
  var SHOOT = [], nextShootAt = 0;

  /* ── Ain Dubai: a giant observation wheel over the water, left of the Burj.
     Rotates slowly forever; a click spins it up and sets the rim LEDs chasing
     colour for ~4 s. Angle is integrated each frame so the spin-up never jumps. */
  var AW_X = 410, AW_Y = 618, AW_R = 120, AW_BASE_W = 0.18;   /* center, radius, rad/s */
  var awAngle = 0, awBoostStart = -99;

  /* ── a traditional dhow crossing the bay: lateen sail, warm cabin glow,
     red/green nav + white masthead lights, and a foamy wake. It sails across,
     waits offscreen, then re-enters from a random side. Click → light flash. */
  var BOAT = { x: -200, y: 808, dir: 1, sp: 28, on: true, wait: 0, flashT: -99 };
  var BOATW = [];                                             /* wake foam particles (capped) */

  /* ── "Dubai under construction": a tower crane slewing on a mid building,
     plus a window-cleaning gondola riding a taller tower's facade. ── */
  var CRANE = { bx: 485, roofY: HZ - 165, mastH: 116, jib: 98, cjib: 34, sp: 0.12 };
  var GOND  = { x: 1190, roofY: HZ - 292, low: HZ - 40 };     /* on the Address tower */

  /* ── slow dusk→night→dusk cycle: a translucent overlay darkens the
     prerendered dusk scene (drawn UNDER the live lights), while LIGHT_GAIN
     brightens the city's live windows/twinkles so they "switch on" as it gets
     dark. Cheap (one gradient rect) — no re-prerender. ── */
  var DAY_PERIOD = 200, DAY_OFFSET = 0;     /* ~3:20 for a full dusk→night→dusk swing */
  var nightFactor = 0, LIGHT_GAIN = 1;

  /* ── rare desert thunderstorm: a dark cloud band rolls in, a few branching
     bolts strike with a full-frame flash and a wobbled reflection on the water.
     ~12 s once every 4–6 min (randomised start-to-start). ── */
  var STORM_LEN = 12;                          /* each storm lasts ~12 s */
  var STORM = { env: 0, start: null, nextAt: null, nextBolt: 0, bolts: [], flashT: -99, flashMag: 0 };

  /* ───────────────────────── static rendering ───────────────────────── */

  var scale = 1, ox = 0, oy = 0;

  function facade(x, w, base){
    var g = og.createLinearGradient(x, 0, x+w, 0);
    var dark = lerpC(base, [0,0,0], .35);
    var warm = lerpC(base, [255,150,80], .38);
    if (x + w/2 < SUNX){ g.addColorStop(0, rgb(dark)); g.addColorStop(.62, rgb(base)); g.addColorStop(1, rgb(warm)); }
    else               { g.addColorStop(0, rgb(warm)); g.addColorStop(.38, rgb(base)); g.addColorStop(1, rgb(dark)); }
    return g;
  }

  function drawWindows(g, list){
    for (var k = 0; k < list.length; k++){
      var w = list[k];
      g.fillStyle = 'rgba('+w.c+','+w.a+')';
      g.fillRect(w.x, w.y, 3.2, 4.2);
    }
  }

  function drawSky(){
    var g = og.createLinearGradient(0, 0, 0, HZ);
    g.addColorStop(0,   '#04081a'); g.addColorStop(.22, '#0a1736');
    g.addColorStop(.42, '#182c58'); g.addColorStop(.55, '#2c4a7a');
    g.addColorStop(.65, '#4a6896'); g.addColorStop(.73, '#7d83a4');
    g.addColorStop(.80, '#b08a8e'); g.addColorStop(.86, '#d89368');
    g.addColorStop(.92, '#f0a050'); g.addColorStop(.97, '#f7b964');
    g.addColorStop(1,   '#fbd089');
    og.fillStyle = g; og.fillRect(0, 0, DW, HZ);

    var s1 = og.createRadialGradient(SUNX, SUNY, 0, SUNX, SUNY, 520);
    s1.addColorStop(0, 'rgba(255,160,70,.32)'); s1.addColorStop(1, 'rgba(255,160,70,0)');
    og.fillStyle = s1; og.fillRect(0, 0, DW, HZ);
    var s2 = og.createRadialGradient(SUNX, SUNY, 0, SUNX, SUNY, 150);
    s2.addColorStop(0, 'rgba(255,214,135,.65)'); s2.addColorStop(1, 'rgba(255,214,135,0)');
    og.fillStyle = s2; og.fillRect(0, 0, DW, HZ);

    for (var k = 0; k < STARS.length; k++){
      var st = STARS[k];
      var a = st.a * Math.max(0, Math.min(1, (560 - st.y)/420));
      if (a <= 0) continue;
      og.fillStyle = 'rgba(215,228,255,'+a+')';
      og.fillRect(st.x, st.y, st.r, st.r);
    }

    /* crescent moon */
    var mg = og.createRadialGradient(300, 140, 0, 300, 140, 60);
    mg.addColorStop(0, 'rgba(235,228,205,.30)'); mg.addColorStop(1, 'rgba(235,228,205,0)');
    og.fillStyle = mg; og.fillRect(230, 70, 140, 140);
    og.fillStyle = '#efe6cd';
    og.beginPath(); og.arc(300, 140, 23, 0, 6.2832); og.fill();
    og.fillStyle = '#0a1736';
    og.beginPath(); og.arc(309, 133, 21, 0, 6.2832); og.fill();

    for (k = 0; k < CLOUDS.length; k++){
      var c = CLOUDS[k];
      og.fillStyle = c.warm ? 'rgba(120,62,52,'+c.a+')' : 'rgba(38,33,60,'+c.a+')';
      og.beginPath();
      og.ellipse(c.x, c.y, c.w/2, c.h/2, 0, 0, 6.2832);
      og.ellipse(c.x - c.w*.28, c.y + c.h*.18, c.w*.32, c.h*.38, 0, 0, 6.2832);
      og.ellipse(c.x + c.w*.30, c.y + c.h*.12, c.w*.28, c.h*.34, 0, 0, 6.2832);
      og.fill();
      og.fillStyle = c.warm ? 'rgba(255,150,80,'+(c.a*.85)+')' : 'rgba(245,140,80,'+(c.a*.5)+')';
      og.beginPath();
      og.ellipse(c.x, c.y + c.h*.42, c.w*.44, 1.4, 0, 0, 6.2832); og.fill();
    }

    og.strokeStyle = 'rgba(18,22,38,.8)'; og.lineWidth = 1.2; og.lineCap = 'round';
    for (k = 0; k < BIRDS.length; k++){
      var bd = BIRDS[k];
      og.save(); og.translate(bd.x, bd.y); og.scale(bd.s, bd.s);
      og.beginPath();
      og.moveTo(-4.5, 0); og.quadraticCurveTo(-2.2, -3, 0, -.4);
      og.quadraticCurveTo(2.2, -3, 4.5, 0);
      og.stroke(); og.restore();
    }
  }

  function drawFar(){
    for (var k = 0; k < FAR.length; k++){
      var f = FAR[k];
      var c = lerpC([198,138,108], [72,64,94], Math.min(1, f.h/120));
      og.fillStyle = rgb(c, .8);
      og.fillRect(f.x, HZ - f.h, f.w, f.h);
    }
    var hg = og.createLinearGradient(0, 600, 0, HZ);
    hg.addColorStop(0, 'rgba(244,170,110,0)'); hg.addColorStop(1, 'rgba(244,170,110,.30)');
    og.fillStyle = hg; og.fillRect(0, 600, DW, 180);
  }

  function drawCrown(b, x, w, y0, fill){
    og.fillStyle = fill;
    switch (b.crown){
      case 'slantR':
        og.beginPath(); og.moveTo(x, y0+18); og.lineTo(x+w, y0); og.lineTo(x+w, y0+18);
        og.closePath(); og.fill(); break;
      case 'slantL':
        og.beginPath(); og.moveTo(x, y0); og.lineTo(x+w, y0+18); og.lineTo(x, y0+18);
        og.closePath(); og.fill(); break;
      case 'emir1':
        og.beginPath(); og.moveTo(x, y0+46); og.lineTo(x+w*.62, y0); og.lineTo(x+w, y0+28);
        og.lineTo(x+w, y0+46); og.closePath(); og.fill();
        og.fillRect(x+w*.62-1, y0-18, 1.6, 18); break;
      case 'emir2':
        og.beginPath(); og.moveTo(x, y0+24); og.lineTo(x+w*.4, y0); og.lineTo(x+w, y0+40);
        og.lineTo(x, y0+40); og.closePath(); og.fill();
        og.fillRect(x+w*.4-1, y0-14, 1.6, 14); break;
      case 'dome':
        og.beginPath(); og.arc(x+w/2, y0+2, w/2, Math.PI, 0); og.fill();
        og.fillRect(x+w/2-1, y0-w/2-14, 1.6, 16);
        break;
      case 'sail':
        og.beginPath(); og.moveTo(x, y0+58);
        og.quadraticCurveTo(x+w*.3, y0+8, x+w*.52, y0);
        og.quadraticCurveTo(x+w*.74, y0+8, x+w, y0+58);
        og.closePath(); og.fill();
        og.fillRect(x+w*.52-1, y0-24, 1.6, 26); break;
      case 'spire':
        og.fillRect(x+w/2-1, y0-(b.spire||24), 1.8, b.spire||24); break;
      default:
        if (b.mech) og.fillRect(x+w*.2, y0-7, w*.42, 7);
        if (b.ant)  og.fillRect(x+w*.68, y0-15, 1.4, 15);
    }
  }

  function drawBoxBody(b, x, w, h){
    var y0 = HZ - h;
    var inset = ['emir1','emir2','dome','sail'].indexOf(b.crown) >= 0 ?
                (b.crown === 'sail' ? 58 : (b.crown === 'dome' ? 0 : 46)) : 0;
    var fill = facade(x, w, b.c);
    og.fillStyle = fill;
    og.fillRect(x, y0 + inset, w, h - inset);
    drawCrown(b, x, w, y0, fill);
    og.fillStyle = 'rgba(255,170,100,.18)';
    og.fillRect(x, y0 + inset, w, 1.5);
  }

  function sailPath(g, x, top, h){
    g.beginPath();
    g.moveTo(x, HZ);
    g.quadraticCurveTo(x-2, HZ-h*.55, x+5, top+8);   /* leading edge, gentle bow */
    g.quadraticCurveTo(x+62, top+46, x+72, HZ);      /* billowing trailing edge */
    g.closePath();
  }

  function drawBurjAlArab(b){
    var x = b.x, h = b.h, top = HZ - h;
    var glow = og.createRadialGradient(x+32, HZ-h*.45, 0, x+32, HZ-h*.45, h*.85);
    glow.addColorStop(0, 'rgba(220,235,255,.10)'); glow.addColorStop(1, 'rgba(220,235,255,0)');
    og.fillStyle = glow; og.fillRect(x-110, top-60, 290, h+70);

    /* its own island + causeway bridge to the shore */
    og.fillStyle = '#16213a';
    og.beginPath();
    og.moveTo(x-28, HZ+4); og.lineTo(x-22, HZ-5); og.lineTo(x+86, HZ-5);
    og.lineTo(x+92, HZ+4); og.closePath(); og.fill();
    og.strokeStyle = 'rgba(60,75,105,.9)'; og.lineWidth = 2.4;
    og.beginPath(); og.moveTo(x+90, HZ-1); og.quadraticCurveTo(x+138, HZ+1, x+185, HZ+3);
    og.stroke();
    for (var bl = 0; bl < 7; bl++){
      og.fillStyle = 'rgba(255,205,130,'+rnd(.5,.9)+')';
      og.fillRect(x-20 + bl*17, HZ-7, 1.6, 1.6);                 /* island lights */
      if (bl < 6) og.fillRect(x+96 + bl*15, HZ-3.5 + bl*.55, 1.4, 1.4); /* bridge lamps */
    }

    /* mast */
    og.fillStyle = '#c7d4e2';
    og.beginPath();
    og.moveTo(x+2, top+16); og.lineTo(x+5.5, top+16);
    og.lineTo(x+5, top-24); og.lineTo(x+4, top-24);
    og.closePath(); og.fill();

    /* sail: bright white fabric, barely shaded */
    var g = og.createLinearGradient(x, 0, x+72, 0);
    g.addColorStop(0, '#f4f8fc'); g.addColorStop(.5, '#e2ecf5');
    g.addColorStop(.85, '#cbd9e8'); g.addColorStop(1, '#d2bfa6');
    og.fillStyle = g;
    sailPath(og, x, top, h); og.fill();

    /* blue glass curtain wall down the middle of the sail */
    var bg = og.createLinearGradient(0, top+30, 0, HZ);
    bg.addColorStop(0, '#7fb2dd'); bg.addColorStop(.45, '#4a7cb4');
    bg.addColorStop(1, '#2c5685');
    og.fillStyle = bg;
    og.beginPath();
    og.moveTo(x+9, top+30);
    og.quadraticCurveTo(x+44, top+62, x+50, HZ-8);
    og.lineTo(x+14, HZ-8);
    og.quadraticCurveTo(x+8, HZ-h*.55, x+9, top+30);
    og.closePath(); og.fill();
    /* sky sheen on the glass */
    og.fillStyle = 'rgba(235,248,255,.22)';
    og.beginPath();
    og.moveTo(x+10, top+34);
    og.quadraticCurveTo(x+30, top+58, x+34, HZ-30);
    og.lineTo(x+24, HZ-30);
    og.quadraticCurveTo(x+12, HZ-h*.55, x+10, top+34);
    og.closePath(); og.fill();

    /* trailing-edge rim light */
    og.strokeStyle = 'rgba(255,235,205,.45)'; og.lineWidth = 1.2;
    og.beginPath();
    og.moveTo(x+5, top+8); og.quadraticCurveTo(x+62, top+46, x+72, HZ);
    og.stroke();
    /* leading-edge shadow seam */
    og.strokeStyle = 'rgba(120,145,175,.5)'; og.lineWidth = 1;
    og.beginPath();
    og.moveTo(x, HZ); og.quadraticCurveTo(x-2, HZ-h*.55, x+5, top+8);
    og.stroke();

    /* curved deck lines — white floor strips over the glass */
    for (var yy = top+26; yy < HZ-8; yy += 6.5){
      var tt = (yy-top)/h;
      var wAt = (4 + tt*60)*.92;
      og.strokeStyle = 'rgba(240,248,255,'+(0.10+tt*.16)+')';
      og.lineWidth = 1;
      og.beginPath();
      og.moveTo(x+4, yy);
      og.quadraticCurveTo(x+4+wAt*.5, yy+1.6, x+4+wAt, yy-1);
      og.stroke();
    }

    /* helipad on its cantilevered arm */
    og.strokeStyle = '#8da1b8'; og.lineWidth = 1.4;
    og.beginPath(); og.moveTo(x+3, top+44); og.lineTo(x-11, top+36); og.stroke();
    og.fillStyle = '#33405a';
    og.beginPath(); og.ellipse(x-11, top+35, 14, 3.4, 0, 0, 6.2832); og.fill();
    og.fillStyle = '#c2cfde';
    og.beginPath(); og.ellipse(x-11, top+34, 14, 3.2, 0, 0, 6.2832); og.fill();
    og.fillStyle = 'rgba(90,220,140,.9)';
    og.fillRect(x-11.8, top+33.2, 1.6, 1.6);                     /* pad light */

    /* skyview restaurant ledge on the trailing side */
    og.fillStyle = '#aebccf';
    og.fillRect(x+38, top+50, 10, 2.2);
    og.fillStyle = 'rgba(255,212,150,.7)';
    og.fillRect(x+40, top+52.5, 6, 1);
  }

  function cayanCurves(g, b){
    var x = b.x, w = b.w, h = b.h;
    for (var k = 0; k <= 5; k++){
      var ya = HZ - h*k/5.5, yb = HZ - h*(k+1.4)/5.5;
      g.beginPath();
      g.moveTo(x+3, ya);
      g.bezierCurveTo(x+w*.35, ya-8, x+w*.65, yb+8, x+w-3, yb);
      g.stroke();
    }
  }

  function drawCayan(b){
    var x = b.x, w = b.w, h = b.h, y0 = HZ - h;
    og.fillStyle = facade(x, w, b.c);
    og.beginPath();
    og.moveTo(x, HZ); og.lineTo(x+4, y0); og.lineTo(x+w-4, y0); og.lineTo(x+w, HZ);
    og.closePath(); og.fill();
    og.strokeStyle = 'rgba(205,222,255,.10)'; og.lineWidth = 1.4;
    cayanCurves(og, b);
    drawWindows(og, b.win);
    og.fillStyle = 'rgba(255,170,100,.2)'; og.fillRect(x+4, y0, w-8, 1.5);
  }

  function drawTwin(b){
    drawBoxBody({ c:b.c, crown:'flat', mech:true }, b.x, b.w, b.h);
    drawBoxBody({ c:b.c, crown:'flat', ant:true  }, b.x + b.w + b.gap, b.w, b.h - 14);
    var bx = b.x + b.w - 2, bw = b.gap + 4, by = HZ - b.h + 10;
    og.fillStyle = rgb(lerpC(b.c, [255,150,80], .2));
    og.fillRect(bx, by, bw, 9);
    drawWindows(og, b.win); drawWindows(og, b.win2);
  }

  function drawMuseum(b){
    var cx = b.x, cy = HZ - b.h/2 - 2;
    og.fillStyle = '#2c3a55';
    og.beginPath(); og.ellipse(cx, cy, 38, b.h/2, -.06, 0, 6.2832); og.fill();
    og.fillStyle = '#e8995c';
    og.beginPath(); og.ellipse(cx-2, cy, 16, 21, -.06, 0, 6.2832); og.fill();
    og.strokeStyle = 'rgba(255,212,150,.4)'; og.lineWidth = 1.3;
    for (var k = 0; k < 5; k++){
      var t = -.7 + k*.36;
      og.beginPath();
      og.moveTo(cx-36, cy + t*34);
      og.bezierCurveTo(cx-14, cy + t*34 - 7, cx+14, cy + t*34 + 7, cx+36, cy + t*30);
      og.stroke();
    }
    og.fillStyle = '#1b2740';
    og.fillRect(cx-20, HZ-9, 40, 9);
  }

  function drawFrame(b){
    var x = b.x, w = b.w, h = b.h, y0 = HZ - h;
    og.fillStyle = '#574a2e';
    og.fillRect(x, y0, 11, h); og.fillRect(x+w-11, y0, 11, h); og.fillRect(x, y0, w, 13);
    og.fillStyle = 'rgba(255,205,110,.55)';
    og.fillRect(x+9.5, y0+13, 1.5, h-13); og.fillRect(x+w-11, y0+13, 1.5, h-13);
    og.fillRect(x, y0+12, w, 1.5);
    for (var k = 0; k < 9; k++){
      og.fillStyle = 'rgba(255,215,130,'+rnd(.3,.7)+')';
      og.fillRect(x+3, y0+20+k*(h-30)/9, 2, 2);
      og.fillRect(x+w-6, y0+20+k*(h-30)/9, 2, 2);
    }
  }

  function drawBuilding(b){
    switch (b.kind){
      case 'burjalarab': drawBurjAlArab(b); break;
      case 'cayan':      drawCayan(b); break;
      case 'twin':       drawTwin(b); break;
      case 'museum':     drawMuseum(b); break;
      case 'frame':      drawFrame(b); break;
      default:
        drawBoxBody(b, b.x, b.w, b.h);
        drawWindows(og, b.win);
    }
  }

  function burjPath(g){
    g.beginPath();
    BL.concat(BR).forEach(function(p){
      g.rect(BX + p[0]*BS, HZ - p[2]*BS, p[1]*BS, p[2]*BS);
    });
    /* spire, so the light show colors it too */
    g.rect(BX-1.5, HZ-438*BS, 3, 48*BS);
    g.rect(BX-.5,  HZ-456*BS, 1, 18*BS);
  }

  function drawBurj(){
    var s = BS, cx = BX;
    function pillars(arr){
      var n = arr.length;
      for (var k = n-1; k >= 0; k--){
        var c = lerpC([44,56,80], [156,174,198], k/(n-1));
        og.fillStyle = rgb(c);
        og.fillRect(cx + arr[k][0]*s, HZ - arr[k][2]*s, arr[k][1]*s, arr[k][2]*s);
      }
    }
    pillars(BL); pillars(BR);

    og.save();
    og.beginPath();
    BL.concat(BR).forEach(function(p){
      og.rect(cx + p[0]*s, HZ - p[2]*s, p[1]*s, p[2]*s);
    });
    og.clip();
    for (var f = 3; f < 390; f += 3){
      var strip = f % 15 === 0;
      og.fillStyle = strip ? 'rgba(6,10,20,.5)' : 'rgba(8,14,26,.32)';
      og.fillRect(cx - 40*s, HZ - f*s, 80*s, strip ? 1.6 : .7);
    }
    var sh = og.createLinearGradient(0, HZ - 390*s, 0, HZ);
    sh.addColorStop(0, 'rgba(150,180,225,.10)'); sh.addColorStop(.5, 'rgba(80,105,150,.06)');
    sh.addColorStop(.85, 'rgba(255,170,95,.13)'); sh.addColorStop(1, 'rgba(255,150,70,.22)');
    og.fillStyle = sh; og.fillRect(cx - 40*s, HZ - 390*s, 80*s, 390*s);
    og.fillStyle = 'rgba(255,205,140,.35)';
    og.fillRect(cx - 6.5*s, HZ - 302*s, 13*s, 2.6);
    og.fillRect(cx - 14*s, HZ - 155*s, 29*s, 2.6);
    og.restore();

    var topY = HZ - 390*s;
    og.fillStyle = 'rgba(168,182,202,.95)';
    og.beginPath();
    og.moveTo(cx-1.5, topY); og.lineTo(cx+1.5, topY);
    og.lineTo(cx+.55, topY - 48*s); og.lineTo(cx-.55, topY - 48*s);
    og.closePath(); og.fill();
    og.fillRect(cx-.45, topY - 66*s, .9, 18*s);
    og.fillRect(cx-2.4, topY - 24*s, 4.8, 1.1);
    og.fillRect(cx-1.7, topY - 42*s, 3.4, 1);

    for (var k = 0; k < BURJ_LIGHTS.length; k++){
      var L = BURJ_LIGHTS[k];
      og.fillStyle = 'rgba('+L.c+','+L.a+')';
      og.fillRect(L.x - L.r/2, L.y - L.r/2, L.r, L.r*1.4);
    }

    /* podium / mall at the base */
    og.fillStyle = '#131c30';
    og.fillRect(cx-95, HZ-16, 190, 16);
    og.fillStyle = 'rgba(255,200,120,.5)';
    for (k = 0; k < 22; k++) og.fillRect(cx-90 + k*8.4, HZ-10, 3.6, 5);
  }

  function drawWater(){
    var g = og.createLinearGradient(0, HZ, 0, DH);
    g.addColorStop(0, '#0b1730'); g.addColorStop(1, '#050c1c');
    og.fillStyle = g; og.fillRect(0, HZ, DW, DH-HZ);

    og.save();
    og.globalAlpha = .38;
    og.translate(0, HZ * 2.45);
    og.scale(1, -1.45);
    try {
      og.drawImage(off, 0, 480*scale, DW*scale, 300*scale, 0, 480, DW, 300);
    } catch(e) {}
    og.restore();

    var dg = og.createLinearGradient(0, HZ, 0, DH);
    dg.addColorStop(0, 'rgba(6,13,28,.18)'); dg.addColorStop(1, 'rgba(4,9,20,.85)');
    og.fillStyle = dg; og.fillRect(0, HZ, DW, DH-HZ);

    var sg = og.createLinearGradient(SUNX-65, 0, SUNX+65, 0);
    sg.addColorStop(0, 'rgba(255,160,60,0)'); sg.addColorStop(.5, 'rgba(255,170,75,.20)');
    sg.addColorStop(1, 'rgba(255,160,60,0)');
    og.fillStyle = sg; og.fillRect(SUNX-65, HZ, 130, 110);

    for (var k = 0; k < RIPPLES.length; k++){
      var r = RIPPLES[k];
      var nearSun = Math.abs(r.x + r.w/2 - SUNX) < 110;
      if (r.light)
        og.fillStyle = nearSun ? 'rgba(255,190,110,'+(r.a*.30)+')'
                               : 'rgba(130,160,210,'+(r.a*.14)+')';
      else
        og.fillStyle = 'rgba(4,8,18,'+(r.a*.55)+')';
      og.fillRect(r.x, r.y, r.w * (1 - r.deep*.4), 1);
    }
  }

  function renderStatic(){
    og.setTransform(scale, 0, 0, scale, 0, 0);
    og.clearRect(0, 0, DW, DH);
    drawSky();
    drawFar();
    for (var k = 0; k < BUILDINGS.length; k++) drawBuilding(BUILDINGS[k]);
    drawBurj();
    var hg = og.createLinearGradient(0, 660, 0, HZ);
    hg.addColorStop(0, 'rgba(240,160,100,0)'); hg.addColorStop(1, 'rgba(240,160,100,.12)');
    og.fillStyle = hg; og.fillRect(0, 660, DW, 120);
    drawWater();
    var v = og.createRadialGradient(860, 480, 240, 860, 480, 1050);
    v.addColorStop(0, 'rgba(0,0,12,0)'); v.addColorStop(1, 'rgba(0,0,12,.38)');
    og.fillStyle = v; og.fillRect(0, 0, DW, DH);
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
  /* clicking the Burj fires a random show; clicking any tower lights it up.
     Listener lives on document (the game's UI sits above the stage) and
     ignores clicks on the game UI; hit-tests map screen→design coords. */

  var mShowStart = -99, mShowEnd = -99, mFwStart = -99, mFwEnd = -99;
  var mFnStart = -99, mFnEnd = -99;     /* clicking the fountain starts a show */
  var MOON_X = 300, MOON_Y = 140, MOON_R = 23, moonBoostT = -99;  /* click → moon glows + wobbles */
  var lastT = 0;

  var onSceneClick = function(e){
    if (stopped) return;
    if(e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov'))return;
    var mx = (e.clientX * (cv.width / window.innerWidth)  - ox) / scale;
    var my = (e.clientY * (cv.height / window.innerHeight) - oy) / scale;
    var t = lastT;

    /* tap a drone → it explodes; a replacement arrives a few seconds later */
    for (var di = 0; di < CROSS.length; di++){
      var cd = CROSS[di];
      if (cd._on && Math.abs(mx - cd._x) < 13 && Math.abs(my - cd._y) < 13){
        popDrone(cd._x, cd._y, cd.hue); cd.active = false; cd._on = false; cd.wait = rnd(3, 6);
        return;
      }
    }
    for (di = 0; di < SHOW.length; di++){
      var sd = SHOW[di];
      if (sd._on && Math.abs(mx - sd._x) < 13 && Math.abs(my - sd._y) < 13){
        popDrone(sd._x, sd._y, dShapeHue); sd.deadUntil = t + 4; sd._on = false;
        return;
      }
    }
    /* tap a helicopter → it explodes too; re-enters from the edge a few s later */
    for (di = 0; di < HELIS.length; di++){
      var hh = HELIS[di];
      if (hh._on && Math.abs(mx - hh._x) < 20*hh.s && Math.abs(my - hh._y) < 12*hh.s){
        popDrone(hh._x, hh._y, 35);
        var delay = rnd(4, 7);
        hh.deadUntil = t + delay;
        hh.off = (hh._period - ((t + delay) % hh._period)) % hh._period;   /* prog≈0 at return → fresh entry */
        hh._on = false;
        return;
      }
    }

    /* the crescent moon: a gentle glow + wobble when tapped */
    if ((mx - MOON_X)*(mx - MOON_X) + (my - MOON_Y)*(my - MOON_Y) < 34*34){
      moonBoostT = t;
      return;
    }

    /* Burj Khalifa: random pick — LED show or fireworks */
    if (mx > BX-60 && mx < BX+60 && my > HZ - 456*BS - 20 && my < HZ){
      if (Math.random() < .5){ mShowStart = t; mShowEnd = t + 12; }
      else                   { mFwStart = t;   mFwEnd = t + 5; }
      return;
    }

    /* the fountain on the lake: clicking it starts a 20 s show */
    if (mx > 1165 && mx < 1475 && my > HZ - 140 && my < HZ + 45){
      mFnStart = t; mFnEnd = t + 20;
      return;
    }

    /* the Burj Al Arab: scramble the missile-defense show (and light it up) */
    if (mx > 75 && mx < 195 && my > HZ - 245 && my < HZ){
      startMissiles();
      BUILDINGS[0].boostStart = t; BUILDINGS[0].boostUntil = t + 6;
      return;
    }

    /* Ain Dubai wheel: a click spins it up + sets the rim LEDs chasing colour */
    if ((mx - AW_X)*(mx - AW_X) + (my - AW_Y)*(my - AW_Y) < (AW_R + 16)*(AW_R + 16)){
      awBoostStart = t;
      return;
    }

    /* the dhow: tapping it flashes all its lights */
    if (BOAT.on && mx > BOAT.x - 58 && mx < BOAT.x + 58 && my > BOAT.y - 60 && my < BOAT.y + 16){
      BOAT.flashT = t;
      return;
    }

    /* any other building: light it up (frontmost wins) */
    var hit = false;
    for (var k = BUILDINGS.length-1; k >= 0; k--){
      var b = BUILDINGS[k], x0, x1, y0;
      switch (b.kind){
        case 'burjalarab': x0 = b.x-26; x1 = b.x+80; y0 = HZ-b.h-26; break;
        case 'museum':     x0 = b.x-40; x1 = b.x+40; y0 = HZ-b.h; break;
        case 'twin':       x0 = b.x; x1 = b.x + 2*b.w + b.gap; y0 = HZ-b.h; break;
        default:           x0 = b.x; x1 = b.x + b.w;
                           y0 = HZ - b.h - (b.crown === 'spire' ? (b.spire||24) : 20);
      }
      if (mx >= x0 && mx <= x1 && my >= y0 && my <= HZ){
        b.boostStart = t; b.boostUntil = t + 6;
        hit = true; break;
      }
    }

    /* tapping open upper sky launches a drone light show */
    if (!hit && my < HZ - 140 && !(t > mDroneStart && t < mDroneEnd)){
      mDroneStart = t; mDroneEnd = t + MDRONE_LEN;
    }
  };
  document.addEventListener('click', onSceneClick);

  function clickBoost(b, t){
    if (!b.boostUntil || t >= b.boostUntil) return 0;
    return Math.min(1, (t - b.boostStart)/.25, (b.boostUntil - t)/1.5);
  }

  /* a simple moon animation: tapped, the crescent glows, gently wobbles its
     phase, and a ring of little twinkles orbits it — then it eases back. */
  function drawMoonFx(t){
    if (!(t > moonBoostT && t < moonBoostT + 2.6)) return;
    var e = Math.min(1, (t - moonBoostT)/.4, (moonBoostT + 2.6 - t)/1.4);
    ctx.save();
    /* soft glow pulse */
    var pr = 44 + 16*Math.sin(t*4);
    var g = ctx.createRadialGradient(MOON_X, MOON_Y, 0, MOON_X, MOON_Y, pr);
    g.addColorStop(0, 'rgba(255,250,225,'+(0.5*e).toFixed(3)+')');
    g.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(MOON_X, MOON_Y, pr, 0, 6.2832); ctx.fill();
    /* redraw the crescent with a gentle wobble so the moon "breathes" */
    var wob = Math.sin(t*2.6) * 5 * e;
    ctx.fillStyle = '#fbf3da';
    ctx.beginPath(); ctx.arc(MOON_X, MOON_Y, MOON_R, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#0a1736';
    ctx.beginPath(); ctx.arc(MOON_X + 9 + wob, MOON_Y - 7 - wob*0.4, MOON_R - 2, 0, 6.2832); ctx.fill();
    /* orbiting twinkles */
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

  var FW = [];          /* firework particles */

  function accentCol(b, t, a){
    var h = (b.anim.hue0 + t*b.anim.hueSp) % 360;
    return 'hsla(' + h + ',85%,62%,' + Math.min(.92, a * (b._bo || 1)) + ')';
  }

  /* per-building animated lighting — every tower has its own scheme */
  function drawAccent(b, t){
    var an = b.anim; if (!an) return;
    b._bo = 1 + 2.4*clickBoost(b, t);   /* clicked buildings flare up */
    var x = b.x, w = b.w, h = b.h, y0 = HZ - (h||0);
    switch (an.type){
      case 'edges': {
        var a = .15 + .11*Math.sin(t*an.sp);
        ctx.fillStyle = accentCol(b, t, a);
        ctx.fillRect(x, y0, 2, h); ctx.fillRect(x+w-2, y0, 2, h);
        break;
      }
      case 'crown': {
        var ca = .17 + .13*Math.sin(t*an.sp);
        ctx.fillStyle = accentCol(b, t, ca);
        ctx.fillRect(x, y0, w, 13);
        ctx.fillStyle = accentCol(b, t, ca*.4);
        ctx.fillRect(x-3, y0-5, w+6, 5);
        break;
      }
      case 'scan': {
        var sy = HZ - ((t*an.scanV) % (h+30));
        ctx.fillStyle = accentCol(b, t, .24);
        ctx.fillRect(x, Math.max(sy-9, y0), w, Math.min(9, sy-y0 > 0 ? 9 : 0));
        ctx.fillStyle = accentCol(b, t, .09);
        ctx.fillRect(x, Math.max(sy, y0), w, Math.min(20, HZ-sy));
        break;
      }
      case 'pulse': {
        var pa = .035 + .04*Math.sin(t*an.sp);
        if (pa > .01){ ctx.fillStyle = accentCol(b, t, pa); ctx.fillRect(x, y0, w, h); }
        break;
      }
      case 'sail': {     /* Burj Al Arab color wash */
        var top = HZ - b.h;
        ctx.fillStyle = accentCol(b, t, .08 + .05*Math.sin(t*an.sp));
        sailPath(ctx, b.x, top, b.h); ctx.fill();
        break;
      }
      case 'twist': {    /* Cayan twisting LED lines */
        ctx.strokeStyle = accentCol(b, t, .16 + .10*Math.sin(t*an.sp));
        ctx.lineWidth = 1.4;
        cayanCurves(ctx, b);
        break;
      }
      case 'museum': {
        ctx.strokeStyle = accentCol(b, t, .22 + .14*Math.sin(t*an.sp));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(b.x, HZ - b.h/2 - 2, 30, b.h/2 - 7, -.06, 0, 6.2832);
        ctx.stroke();
        break;
      }
      case 'frame': {    /* Dubai Frame stays golden, breathing */
        var fa = (.22 + .15*Math.sin(t*an.sp)) * b._bo;
        ctx.fillStyle = 'rgba(255,205,110,'+fa+')';
        ctx.fillRect(x+9.5, y0+13, 1.5, h-13); ctx.fillRect(x+w-11, y0+13, 1.5, h-13);
        ctx.fillRect(x, y0+12, w, 1.5);
        break;
      }
      case 'bridge': {   /* Sky View bridge color cycle */
        var bx = b.x + b.w - 2, bw = b.gap + 4, by = HZ - b.h + 10;
        ctx.fillStyle = accentCol(b, t, .4 + .18*Math.sin(t*an.sp));
        ctx.fillRect(bx, by+2, bw, 5);
        break;
      }
    }
  }

  /* windows that switch on/off slowly — different rhythm per window */
  function drawDynWindows(b, t){
    if (!b.dyn) return;
    var bo = clickBoost(b, t);   /* a click switches every window on */
    var wv = b._waveY;           /* a passing light-wave ignites them in order */
    for (var k = 0; k < b.dyn.length; k++){
      var w = b.dyn[k];
      var on = Math.sin(t*w.sp + w.ph);
      var a = w.a * Math.max(bo, Math.max(0, Math.min(1, (on + .2) * 2.5)));
      if (wv != null){
        var prox = 1 - Math.abs(w.y - wv) / 34;
        if (prox > 0) a = Math.max(a, w.a * prox);
      }
      a *= LIGHT_GAIN;                 /* brighter as night falls */
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
      if (a > .02){
        ctx.fillStyle = 'hsla(' + hue + ',95%,60%,' + a + ')';
        ctx.fillRect(BX - 40*BS, HZ - (yb+12)*BS, 80*BS, 12*BS + .5);
      }
    }
    /* rising white pulse */
    var py = (t*150) % 500;
    ctx.fillStyle = 'rgba(255,255,255,' + (.32*env) + ')';
    ctx.fillRect(BX - 40*BS, HZ - py*BS, 80*BS, 5);
    /* glitter */
    for (var k = 0; k < 26; k++){
      ctx.fillStyle = 'rgba(255,255,255,' + (env*rnd(.15,.8)) + ')';
      ctx.fillRect(BX + rnd(-36,36)*BS, HZ - rnd(2,448)*BS, 1.6, 1.6);
    }
    ctx.restore();
    /* spire halo */
    var hg = ctx.createRadialGradient(BX, HZ-456*BS, 0, BX, HZ-456*BS, 30);
    hg.addColorStop(0, 'hsla(' + showHue + ',90%,70%,' + (.5*env) + ')');
    hg.addColorStop(1, 'hsla(' + showHue + ',90%,70%,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(BX-30, HZ-456*BS-30, 60, 60);
  }

  /* ── fireworks pouring off the sides of the Burj (NYE style) ── */
  function spawnFireworks(dt, env, showHue){
    /* cascades from the tower edges, at many heights at once */
    if (Math.random() < dt*26*env){
      var hgt = rnd(20, 380);
      var edges = burjEdgesAt(Math.min(hgt, 389));
      var side = Math.random() < .5 ? -1 : 1;
      var x0 = BX + (side < 0 ? edges[0] : edges[1])*BS;
      var hue = Math.random() < .6 ? rnd(35,55) : showHue;   /* mostly gold */
      for (var k = 0; k < 13; k++)
        FW.push({ x:x0, y:HZ - hgt*BS,
                  vx: side*rnd(18,95) + rnd(-8,8), vy: rnd(-45,15),
                  life: rnd(.7,1.6), age:0, hue:hue, r: rnd(.7,1.7) });
    }
    /* big aerial bursts around the spire */
    if (Math.random() < dt*1.1*env){
      var cx = BX + rnd(-95,95), cy0 = HZ - rnd(330,500)*BS;
      var bh = rnd(0,360);
      for (var j = 0; j < 52; j++){
        var ang = rnd(0,6.2832), v = rnd(18,128);
        FW.push({ x:cx, y:cy0, vx: Math.cos(ang)*v, vy: Math.sin(ang)*v - 22,
                  life: rnd(.8,1.9), age:0, hue:bh + rnd(-14,14), r: rnd(.8,1.9) });
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
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx*.045, p.y - p.vy*.045);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ── Dubai Fountain show on the lake ── */
  var FNP = [];   /* spray droplets shed from the jet crests */

  /* choreography: 12 s movements incl. a quiet interlude, like the real show */
  function fountainTarget(j, t){
    var i = j.i, mode = (t/12 | 0) % 5, osc;
    switch (mode){
      case 0: osc = .5 + .5*Math.sin(t*1.6 + i*.55); break;            /* rolling wave */
      case 1: osc = .5 + .5*Math.sin(t*2.4 + (i%2)*Math.PI); break;    /* alternating */
      case 2: osc = .5 + .5*Math.sin(t*2   - Math.abs(i-9)*.7); break; /* center burst */
      case 3: osc = .5 + .5*Math.sin(t*3   + i*1.7); break;            /* chase */
      default: return j.Hmax * (.10 + .08*Math.sin(t*1.2 + i*.3));     /* quiet ripple */
    }
    return j.Hmax * (.18 + .82*osc);
  }

  function drawFountain(t, dt, env, showHue, fnEnv){
    if (fnEnv <= 0 && FNP.length === 0 && FN[9].h < 4) return;  /* show is over, water settled */
    ctx.globalCompositeOperation = 'lighter';
    for (var k = 0; k < FN.length; k++){
      var j = FN[k];
      var target = fountainTarget(j, t) * fnEnv;
      if (j.i === 9 && Math.sin(t*.31) > .86) target *= 1.7;  /* occasional super shot */
      j.h += (target - j.h) * Math.min(1, dt*2.5);            /* water-column inertia */
      var h = j.h;
      if (h < 4) continue;
      var sway = Math.sin(t*1.1 + j.swPh + j.i*.42) * .12 * h; /* nozzle sway */
      var tipX = j.x + sway, tipY = j.y - h;
      var col = env > 0 ? 'hsla(' + showHue + ',70%,80%,' : 'rgba(225,240,255,';

      /* glowing mist at the base */
      var mg = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, 14 + h*.12);
      mg.addColorStop(0, col + '.18)'); mg.addColorStop(1, col + '0)');
      ctx.fillStyle = mg; ctx.fillRect(j.x-26, j.y-18, 52, 20);

      /* curved tapered column, bending with the sway */
      var jg = ctx.createLinearGradient(0, j.y, 0, tipY);
      jg.addColorStop(0, col + '.55)'); jg.addColorStop(.7, col + '.32)');
      jg.addColorStop(1, col + '.06)');
      ctx.fillStyle = jg;
      ctx.beginPath();
      ctx.moveTo(j.x - 3.4, j.y);
      ctx.quadraticCurveTo(j.x + sway*.3 - 1.5, j.y - h*.62, tipX - 1.3, tipY);
      ctx.lineTo(tipX + 1.3, tipY);
      ctx.quadraticCurveTo(j.x + sway*.3 + 1.5, j.y - h*.62, j.x + 3.4, j.y);
      ctx.closePath(); ctx.fill();

      /* bright core */
      ctx.strokeStyle = col + '.30)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(j.x, j.y);
      ctx.quadraticCurveTo(j.x + sway*.3, j.y - h*.62, tipX, tipY);
      ctx.stroke();

      /* shed droplets from the crest */
      if (h > 18 && Math.random() < dt*34)
        FNP.push({ x: tipX + rnd(-1.6,1.6), y: tipY + rnd(0,2),
                   vx: sway*.35 + rnd(-9,9), vy: rnd(-14,4),
                   life: rnd(.45,.95), age: 0, c: col });

      /* splash where the column lands */
      ctx.fillStyle = col + (.10 + (h/j.Hmax)*.12) + ')';
      ctx.beginPath();
      ctx.ellipse(j.x + sway*.5, j.y + 1, 6 + h*.08, 1.8, 0, 0, 6.2832);
      ctx.fill();
    }

    /* falling spray */
    for (k = FNP.length - 1; k >= 0; k--){
      var p = FNP[k];
      p.age += dt;
      if (p.age >= p.life || p.y > HZ + 24){ FNP.splice(k, 1); continue; }
      p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 150*dt;
      var f = 1 - p.age/p.life;
      ctx.fillStyle = p.c + (f*.5) + ')';
      ctx.fillRect(p.x, p.y, 1.3, 2.2);
    }
    if (FNP.length > 420) FNP.splice(0, FNP.length - 420);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ── helicopters ── */
  function drawHeli(hl, t){
    var period = (DW + 300) / hl.sp;
    hl._period = period;
    if (hl.deadUntil && t < hl.deadUntil){ hl._on = false; return; }   /* shot down → re-enters later */
    var prog = ((t + hl.off) % period) / period;
    var x = hl.dir > 0 ? -150 + prog*(DW + 300) : DW + 150 - prog*(DW + 300);
    var y = hl.y + Math.sin(t*1.3 + hl.off)*4;
    hl._x = x; hl._y = y; hl._on = true;

    /* search-light beam sweeping below */
    if (hl.beam){
      var swing = Math.sin(t*.45 + hl.off)*38;
      var bg = ctx.createLinearGradient(0, y, 0, y+170);
      bg.addColorStop(0, 'rgba(255,250,220,.16)'); bg.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(x + 2*hl.dir, y + 3);
      ctx.lineTo(x + swing - 24, y + 170);
      ctx.lineTo(x + swing + 24, y + 170);
      ctx.closePath(); ctx.fill();
    }
    drawHeliBody(x, y, hl.s, hl.dir, t, hl.off);
  }
  /* heli airframe + nav lights at any position — shared with the helipad bird */
  function drawHeliBody(x, y, s, d, t, off){
    ctx.save();
    ctx.translate(x, y); ctx.scale(s*d, s);
    ctx.fillStyle = 'rgba(10,14,26,.95)';
    ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 3, 0, 0, 6.2832); ctx.fill();   /* fuselage */
    ctx.fillRect(-16, -1.1, 12, 1.7);                                       /* tail boom */
    ctx.beginPath(); ctx.moveTo(-16, 1); ctx.lineTo(-16, -5); ctx.lineTo(-13.4, -1);
    ctx.closePath(); ctx.fill();                                            /* tail fin */
    ctx.strokeStyle = 'rgba(10,14,26,.9)'; ctx.lineWidth = .8;              /* skids */
    ctx.beginPath(); ctx.moveTo(-4, 3.4); ctx.lineTo(-3, 5); ctx.lineTo(4.5, 5);
    ctx.moveTo(3, 3.4); ctx.lineTo(3.6, 5); ctx.stroke();
    ctx.fillRect(-.7, -5, 1.4, 2.4);                                        /* mast */
    /* spinning main rotor: apparent length pulses + blur disc */
    var rl = 13 * Math.abs(Math.cos(t*26));
    ctx.strokeStyle = 'rgba(20,26,42,.85)'; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(-rl, -5.4); ctx.lineTo(rl, -5.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,140,170,.12)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-13, -5.4); ctx.lineTo(13, -5.4); ctx.stroke();
    /* tail rotor flicker */
    ctx.strokeStyle = 'rgba(40,50,70,' + (.3 + .4*Math.abs(Math.sin(t*40))) + ')';
    ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-16.5, -4.4); ctx.lineTo(-16.5, 1.6); ctx.stroke();
    ctx.restore();

    /* nav lights: red tail blink, white belly strobe, green starboard */
    var blink = Math.pow(Math.max(0, Math.sin(t*4 + off)), 8);
    if (blink > .05){
      ctx.fillStyle = 'rgba(255,70,60,' + blink + ')';
      ctx.beginPath(); ctx.arc(x - 16*s*d, y - 3*s, 1.3*s, 0, 6.2832); ctx.fill();
    }
    var strobe = Math.pow(Math.max(0, Math.sin(t*7 + off + 2)), 24);
    if (strobe > .1){
      ctx.fillStyle = 'rgba(255,255,255,' + strobe*.2 + ')';
      ctx.beginPath(); ctx.arc(x, y - 6*s, 4*s, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + strobe + ')';
      ctx.beginPath(); ctx.arc(x, y - 6*s, 1.6*s, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = 'rgba(80,255,120,.8)';
    ctx.fillRect(x + 6*s*d, y, 1.2*s, 1.2*s);
  }

  /* ── a little chopper that visits the Burj Al Arab helipad ── */
  var BA = { t0: null, nextAt: null };
  function drawBAHeli(t){
    if (BA.nextAt == null) BA.nextAt = t + 20 + rnd(0, 30);
    if (BA.t0 == null){ if (t < BA.nextAt) return; BA.t0 = t; }
    var e = t - BA.t0;
    var padX = 99, padY = 602, hovY = 556;
    var x, y, d = 1;
    if (e < 5){                                   /* approach from the sea */
      var p = e/5, q = p*(2-p);
      x = -50 + (padX+50)*q; y = 530 + (hovY-530)*p;
    } else if (e < 8){                            /* descend onto the pad */
      var p2 = (e-5)/3, q2 = p2*p2*(3-2*p2);
      x = padX; y = hovY + (padY-hovY)*q2;
    } else if (e < 12){                           /* sit, rotors turning */
      x = padX; y = padY;
    } else if (e < 14){                           /* lift off */
      var p3 = (e-12)/2;
      x = padX; y = padY - (padY-hovY)*p3*p3;
    } else if (e < 19){                           /* away over the water */
      var p4 = (e-14)/5; d = -1;
      x = padX - p4*p4*(padX+70); y = hovY - p4*26;
    } else { BA.t0 = null; BA.nextAt = t + 60 + rnd(0, 60); return; }
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
      var w = WAVES[k];
      var p = (t - w.t0) / 2.4;
      if (p >= 1){ WAVES.splice(k, 1); continue; }
      w.b._waveY = HZ - p * (w.b.h + 50);
    }
  }
  function drawWaves(t){
    for (var k = 0; k < WAVES.length; k++){
      var w = WAVES[k], b = w.b;
      if (b._waveY == null) continue;
      var p = (t - w.t0) / 2.4;
      var wWide = b.kind === 'twin' ? 2*b.w + b.gap : b.w;
      var g = ctx.createLinearGradient(0, b._waveY - 14, 0, b._waveY + 14);
      g.addColorStop(0, 'rgba(255,236,180,0)');
      g.addColorStop(.5, 'rgba(255,236,180,' + (.30*(1-p*.4)) + ')');
      g.addColorStop(1, 'rgba(255,236,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(b.x - 2, b._waveY - 14, wWide + 4, 28);
    }
  }

  /* ── missile-defense show: once every 6 minutes an emoji missile streaks
        in from the side, and the Burj Al Arab fires an interceptor that
        blows it up mid-air. Clicking the Burj Al Arab scrambles it too. ── */
  var MIS = { nextAt: null, inc: null, def: null, boom: null };
  var MTRAIL = [];
  function startMissiles(){
    if (MIS.inc || MIS.boom) return;
    MIS.inc = { x: DW + 60, y: 240 + rnd(0, 120), vx: -120 - rnd(0, 30), vy: 8 };
    MIS.def = null;
    MIS.nextAt = null;
  }
  function drawMissiles(t, dt){
    if (!MIS.inc && !MIS.boom){
      if (MIS.nextAt == null) MIS.nextAt = t + 15 + rnd(0, 20);   /* first run soon */
      if (t >= MIS.nextAt) startMissiles();
    }
    /* smoke trails */
    for (var i = MTRAIL.length - 1; i >= 0; i--){
      var p = MTRAIL[i];
      var age = t - p.t0;
      if (age > 1.1){ MTRAIL.splice(i, 1); continue; }
      var a = 1 - age / 1.1;
      ctx.fillStyle = p.c + (a * .4) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y - age * 6, 2 + age * 7, 0, 6.2832); ctx.fill();
    }
    var inc = MIS.inc;
    if (inc){
      inc.x += inc.vx * dt; inc.y += inc.vy * dt;
      if (Math.random() < dt * 40)
        MTRAIL.push({ x: inc.x + 14, y: inc.y, t0: t, c: 'rgba(120,120,130,' });
      ctx.save();                                   /* 🚀 noses along its velocity */
      ctx.translate(inc.x, inc.y);
      ctx.rotate(Math.atan2(inc.vy, inc.vx) + Math.PI / 4);
      ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff';   /* trail loop leaves a near-zero fill alpha — emoji needs an opaque fill or it vanishes */
      ctx.fillText('🚀', 0, 0);
      ctx.restore();
      /* the Burj Al Arab holds fire until the threat is almost overhead, so the
         interceptor launch + hit play out in the clear left sky just in front of
         it (the centered game card hides the screen middle) */
      if (!MIS.def && inc.x < 500) MIS.def = { x: 114, y: 548, vx: 0, vy: -40 };
      if (inc.x < -80){ MIS.inc = null; MIS.def = null; MIS.nextAt = t + 360; }
    }
    var def = MIS.def;
    if (def && MIS.inc){
      var dx = MIS.inc.x - def.x, dy = MIS.inc.y - def.y, d = Math.hypot(dx, dy) || 1;
      def.vx = dx / d * 300; def.vy = dy / d * 300; /* homing, much faster */
      def.x += def.vx * dt; def.y += def.vy * dt;
      if (Math.random() < dt * 60)
        MTRAIL.push({ x: def.x, y: def.y + 6, t0: t, c: 'rgba(255,235,200,' });
      ctx.save();
      ctx.translate(def.x, def.y);
      ctx.rotate(Math.atan2(def.vy, def.vx) + Math.PI / 4);
      ctx.font = '17px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff';   /* same: opaque fill so the interceptor emoji stays visible */
      ctx.fillText('🚀', 0, 0);
      ctx.restore();
      if (d < 20){                                  /* BOOM — threat neutralized */
        MIS.boom = { x: MIS.inc.x, y: MIS.inc.y, t0: t };
        MIS.inc = null; MIS.def = null;
        MIS.nextAt = t + 360;                       /* once every 6 minutes */
        var hue = rnd(15, 45);
        for (var j = 0; j < 60; j++){
          var ang = rnd(0, 6.2832), v = rnd(20, 150);
          FW.push({ x: MIS.boom.x, y: MIS.boom.y,
                    vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 15,
                    life: rnd(.6, 1.6), age: 0, hue: hue + rnd(-12, 12), r: rnd(.8, 2) });
        }
      }
    }
    var bm = MIS.boom;
    if (bm){
      var be = t - bm.t0;
      if (be > .8) MIS.boom = null;
      else {
        var q = be / .8;
        ctx.fillStyle = 'rgba(255,240,210,' + (.7 * (1 - q)) + ')';
        ctx.beginPath(); ctx.arc(bm.x, bm.y, 8 + q * 26, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(255,200,130,' + (.6 * (1 - q)) + ')';
        ctx.lineWidth = 3 * (1 - q) + 1;
        ctx.beginPath(); ctx.arc(bm.x, bm.y, 10 + q * 90, 0, 6.2832); ctx.stroke();
      }
    }
  }

  /* draw a drone at an explicit position; `glow` (0..~0.6) adds the subtle
     shape-tracing light used during a show (color = current shape hue) */
  function drawDroneAt(dr, t, x, y, tilt, glow){
    if (glow > 0.02){
      var g = ctx.createRadialGradient(x, y, 0, x, y, 17);
      g.addColorStop(0,   'hsla(' + dShapeHue + ',90%,74%,' + (glow*0.62).toFixed(3) + ')');
      g.addColorStop(0.5, 'hsla(' + dShapeHue + ',90%,70%,' + (glow*0.22).toFixed(3) + ')');
      g.addColorStop(1,   'hsla(' + dShapeHue + ',90%,70%,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 17, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'hsla(' + dShapeHue + ',95%,84%,' + (glow*0.5).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.2832); ctx.fill();
    }
    var s = dr.s || 1.9;
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(14,18,30,.9)'; ctx.lineWidth = 1;
    ctx.beginPath();                                        /* X arms */
    ctx.moveTo(-3.2,-1.4); ctx.lineTo(3.2,1.4);
    ctx.moveTo(-3.2,1.4);  ctx.lineTo(3.2,-1.4); ctx.stroke();
    ctx.fillStyle = 'rgba(14,18,30,.95)';
    ctx.fillRect(-1.5,-1.2, 3, 2.2);                        /* body */
    ctx.strokeStyle = 'rgba(150,170,200,' + (.10 + .10*Math.sin(t*50 + dr.p1)) + ')';
    ctx.lineWidth = .8;                                     /* prop shimmer */
    ctx.beginPath();
    ctx.moveTo(-4.6,-1.6); ctx.lineTo(-1.8,-1.6);
    ctx.moveTo(1.8,-1.6);  ctx.lineTo(4.6,-1.6); ctx.stroke();
    /* LEDs: colored + red, white strobe on top */
    ctx.fillStyle = 'hsla(' + dr.hue + ',95%,60%,' + (.55 + .4*Math.sin(t*3 + dr.p2)) + ')';
    ctx.fillRect(-3.4, .4, 1.3, 1.3);
    ctx.fillStyle = 'rgba(255,70,60,' + (.5 + .5*Math.sin(t*5 + dr.p1)) + ')';
    ctx.fillRect(2.2, .4, 1.2, 1.2);
    var stb = Math.pow(Math.max(0, Math.sin(t*6 + dr.p2)), 20);
    if (stb > .1){
      ctx.fillStyle = 'rgba(255,255,255,' + stb + ')';
      ctx.fillRect(-.6, -2.4, 1.2, 1.2);
    }
    ctx.restore();
  }
  /* ambient traffic: send a drone across from one side */
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

  /* ── show shapes: each returns N local points centered on ~(0,0), ±~95 ── */
  function heartPts(n){
    var a = [];
    for (var k = 0; k < n; k++){
      var u = k/n * 6.2832;
      var x = 16*Math.pow(Math.sin(u), 3);
      var y = 13*Math.cos(u) - 5*Math.cos(2*u) - 2*Math.cos(3*u) - Math.cos(4*u);
      a.push({ x: x*5.4, y: -y*5.4 - 8 });        /* flip y (canvas down+) and lift */
    }
    return a;
  }
  function ringPts(n){
    var a = [];
    for (var k = 0; k < n; k++){ var u = k/n*6.2832; a.push({ x: Math.cos(u)*92, y: Math.sin(u)*92 }); }
    return a;
  }
  function distribute(verts, n){            /* sample n points evenly along a closed polygon */
    var segs = [], total = 0, m = verts.length, i;
    for (i = 0; i < m; i++){
      var aa = verts[i], bb = verts[(i+1)%m], len = Math.hypot(bb.x-aa.x, bb.y-aa.y);
      segs.push({ a: aa, b: bb, len: len }); total += len;
    }
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
    for (var k = 0; k < spikes*2; k++){
      var ang = -Math.PI/2 + k*Math.PI/spikes, rad = (k%2) ? r : R;
      verts.push({ x: Math.cos(ang)*rad, y: Math.sin(ang)*rad });
    }
    return distribute(verts, n);
  }
  /* point each show drone at a shape; morph from its current target so a shape
     change eases instead of snapping. firstTime = the fly-in (no morph). */
  function assignShape(idx, t, firstTime){
    var sh = DSHAPES[idx % DSHAPES.length], pts = sh.gen(SHOW.length);
    dShapeHue = sh.hue;
    for (var i = 0; i < SHOW.length; i++){
      var d = SHOW[i];
      if (firstTime){ d.t0x = DCX + pts[i].x; d.t0y = DCY + pts[i].y; }
      else          { d.t0x = d.t1x; d.t0y = d.t1y; }
      d.t1x = DCX + pts[i].x; d.t1y = DCY + pts[i].y;
    }
    dMorphStart = firstTime ? -99 : t;
  }
  /* park the squadron just off the top edge so it flies in / out of frame */
  function parkShow(){
    for (var i = 0; i < SHOW.length; i++){
      var d = SHOW[i];
      d.px = DCX + rnd(-170, 170); d.py = -(30 + rnd(0, 200));
      d.deadUntil = 0; d._on = false;
    }
  }
  /* the light show: squadron flies IN, forms TWO shapes, flies OUT. Drawn only
     while the show envelope is active (off-screen + undrawn otherwise). */
  function drawShowDrones(t){
    var dsp = (t + DRONE_OFFSET) % DRONE_PERIOD;
    var sched = dsp < DRONE_LEN ? Math.min(1, dsp/2, (DRONE_LEN - dsp)/2) : 0;
    var env = sched, manualActive = (t > mDroneStart && t < mDroneEnd);
    if (manualActive) env = Math.max(env, Math.min(1, (t - mDroneStart)/1.2, (mDroneEnd - t)/2));

    if (dPrevEnv <= 0 && env > 0){                 /* a show just began → pick a fresh pair of shapes */
      if (sched <= 0 && manualActive){ dShowStart = mDroneStart; dShowLen = MDRONE_LEN; }
      else                           { dShowStart = t - dsp; dShowLen = DRONE_LEN; }
      dShapeStart = (dShapeStart + 1) % DSHAPES.length;
      dShowShapes = [ dShapeStart, (dShapeStart + 1) % DSHAPES.length ];
      parkShow();
      dCurSlot = 0; assignShape(dShowShapes[0], t, true);
    }
    dPrevEnv = env;
    if (env <= 0){ for (var z = 0; z < SHOW.length; z++) SHOW[z]._on = false; return; }

    var IN = 3, OUT = 3, local = t - dShowStart;
    var holdDur = Math.max(0.1, dShowLen - IN - OUT) / 2;   /* exactly two shapes */
    if (local > IN && local < dShowLen - OUT){
      var slot = Math.floor((local - IN) / holdDur); if (slot > 1) slot = 1;
      if (slot !== dCurSlot){ dCurSlot = slot; assignShape(dShowShapes[slot], t, false); }
    }
    var fp = local < IN ? local/IN : (local > dShowLen - OUT ? Math.max(0, (dShowLen - local)/OUT) : 1);
    fp = fp < 0 ? 0 : fp > 1 ? 1 : fp; fp = fp*fp*(3 - 2*fp);
    var mp = dMorphStart < 0 ? 1 : Math.min(1, (t - dMorphStart)/1.2); mp = mp*mp*(3 - 2*mp);

    for (var i = 0; i < SHOW.length; i++){
      var d = SHOW[i];
      if (d.deadUntil && t < d.deadUntil){ d._on = false; continue; }   /* popped — leaves a gap, returns shortly */
      var fxp = d.t0x + (d.t1x - d.t0x)*mp, fyp = d.t0y + (d.t1y - d.t0y)*mp;  /* morph between shapes */
      var sx = d.px + (fxp - d.px)*fp, sy = d.py + (fyp - d.py)*fp;            /* fly in from / out to off-screen */
      if (fp > 0.6){ var sh = (fp - 0.6)/0.4;       /* gentle hover jitter while holding */
        sx += Math.sin(t*2 + d.jx)*1.2*sh; sy += Math.cos(t*1.8 + d.jy)*1.2*sh; }
      var glow = fp * (0.45 + 0.18*Math.sin(t*2.2 + i));   /* subtle, gently pulsing */
      drawDroneAt(d, t, sx, sy, Math.sin(t*1.5 + d.jx)*0.05*(1 - fp), glow);
      d._x = sx; d._y = sy; d._on = (fp > 0.25);   /* clickable once it's mostly on-screen */
    }
  }

  /* ── drone explosion (reuses FW sparks like the space supernova burst) + a
     flash/shockwave ring ── */
  function popDrone(x, y, hue){
    POPS.push({ x: x, y: y, t0: lastT });
    for (var k = 0; k < 22; k++){
      var ang = rnd(0, 6.2832), v = rnd(30, 155);
      FW.push({ x: x, y: y, vx: Math.cos(ang)*v, vy: Math.sin(ang)*v, life: rnd(.5, 1.1),
                age: 0, hue: hue + rnd(-22, 22), r: rnd(.7, 1.8) });
    }
  }
  function drawPops(t){
    for (var i = POPS.length-1; i >= 0; i--){
      var p = POPS[i], age = t - p.t0, life = 0.5;
      if (age > life){ POPS.splice(i, 1); continue; }
      var q = age/life, f = 1 - q;
      ctx.fillStyle = 'rgba(255,250,235,' + (f*0.7).toFixed(3) + ')';          /* flash */
      ctx.beginPath(); ctx.arc(p.x, p.y, 3 + q*6, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(255,235,200,' + (f*0.6).toFixed(3) + ')';        /* shockwave ring */
      ctx.lineWidth = 2*f + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 + q*34, 0, 6.2832); ctx.stroke();
    }
  }

  /* ── shooting stars streaking across the upper sky ── */
  function drawShooting(t, dt){
    if (t >= nextShootAt){
      nextShootAt = t + rnd(6, 16);
      var dir = Math.random() < .5 ? 1 : -1, ang = 0.15 + Math.random()*0.5, sp = rnd(380, 620);
      SHOOT.push({ x: dir > 0 ? rnd(60, 600) : rnd(DW-600, DW-60), y: rnd(40, 250),
                   vx: dir*Math.cos(ang)*sp, vy: Math.sin(ang)*sp, age: 0, life: rnd(.5, .9), len: rnd(60, 120) });
    }
    ctx.globalCompositeOperation = 'lighter';
    for (var i = SHOOT.length-1; i >= 0; i--){
      var s = SHOOT[i]; s.age += dt;
      if (s.age > s.life){ SHOOT.splice(i, 1); continue; }
      s.x += s.vx*dt; s.y += s.vy*dt;
      var f = 1 - s.age/s.life, sp2 = Math.hypot(s.vx, s.vy) || 1;
      var tx = s.x - s.vx/sp2*s.len, ty = s.y - s.vy/sp2*s.len;
      var grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0,   'rgba(255,255,255,' + (f*0.95).toFixed(3) + ')');
      grad.addColorStop(0.4, 'rgba(200,225,255,' + (f*0.4).toFixed(3) + ')');
      grad.addColorStop(1,   'rgba(200,225,255,0)');
      ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + f.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
  }

  /* ── Ain Dubai observation wheel ── */
  function drawFerris(t, dt){
    var cx = AW_X, cy = AW_Y, R = AW_R;
    var spin = (t > awBoostStart && t < awBoostStart + 4)
             ? Math.min(1, (t - awBoostStart)/.5, (awBoostStart + 4 - t)/2) : 0;
    awAngle += AW_BASE_W*(1 + 3.4*spin)*dt;          /* integrate → smooth spin-up */
    var a = awAngle, i;

    /* soft landmark glow behind the hub */
    var gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R*1.15);
    gg.addColorStop(0, 'rgba(120,180,230,' + (0.09 + 0.10*spin).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(120,180,230,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, R*1.15, 0, 6.2832); ctx.fill();

    /* metallic palette: dark body, light edge, bright highlight */
    var sD = 'rgba(72,86,106,', sL = 'rgba(150,170,196,', sH = 'rgba(208,222,242,';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    /* A-frame support legs — thick tubular steel (dark core + light edge + spec)
       drawn as 4 splayed struts with a cross-brace and base footings */
    function leg(x0){
      ctx.strokeStyle = sD + '.96)'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(x0, HZ); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.strokeStyle = sL + '.85)'; ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(x0, HZ); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.strokeStyle = sH + '.45)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(x0-1, HZ-1); ctx.lineTo(cx-1, cy); ctx.stroke();
    }
    leg(cx-72); leg(cx+72); leg(cx-46); leg(cx+46);
    ctx.strokeStyle = sD + '.85)'; ctx.lineWidth = 3.5;       /* cross-brace */
    ctx.beginPath(); ctx.moveTo(cx-60, HZ-74); ctx.lineTo(cx+60, HZ-74); ctx.stroke();
    ctx.fillStyle = sD + '.95)';                              /* base footings */
    ctx.fillRect(cx-82, HZ-3, 22, 7); ctx.fillRect(cx+60, HZ-3, 22, 7);

    var Rin = R - 9;
    /* spokes — taut steel cables to the inner rim */
    var N = 24;
    ctx.strokeStyle = sL + '.5)'; ctx.lineWidth = 1.7;
    ctx.beginPath();
    for (i = 0; i < N; i++){ var an = a + i*6.2832/N; ctx.moveTo(cx, cy); ctx.lineTo(cx+Math.cos(an)*Rin, cy+Math.sin(an)*Rin); }
    ctx.stroke();

    /* double rim + truss ticks between them = a thick metallic wheel */
    ctx.strokeStyle = sD + '.96)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, Rin, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = sH + '.5)'; ctx.lineWidth = 1.6;        /* highlight arc (light from the left) */
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI*0.86, Math.PI*1.62); ctx.stroke();
    ctx.strokeStyle = sL + '.55)'; ctx.lineWidth = 1;         /* lattice ticks */
    ctx.beginPath();
    for (i = 0; i < 48; i++){ var at = i*6.2832/48; ctx.moveTo(cx+Math.cos(at)*Rin, cy+Math.sin(at)*Rin); ctx.lineTo(cx+Math.cos(at)*R, cy+Math.sin(at)*R); }
    ctx.stroke();

    /* rim LED dots — warm twinkle normally, rainbow chase during a spin-up */
    var M = 72;
    for (i = 0; i < M; i++){
      var ar = i*6.2832/M, rx = cx+Math.cos(ar)*R, ry = cy+Math.sin(ar)*R;
      if (spin > 0){ var hue = (t*200 + i*12) % 360; ctx.fillStyle = 'hsla(' + hue + ',95%,62%,' + (0.45 + 0.5*spin).toFixed(3) + ')'; }
      else { var tw = 0.5 + 0.5*Math.sin(t*3 + i*0.6); ctx.fillStyle = 'rgba(255,210,130,' + (0.3 + 0.5*tw).toFixed(3) + ')'; }
      ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, 6.2832); ctx.fill();
    }

    /* metallic hub — shaded sphere + warm centre bolt */
    var hg = ctx.createRadialGradient(cx-3, cy-3, 1, cx, cy, 13);
    hg.addColorStop(0, sH + '1)'); hg.addColorStop(0.55, sL + '1)'); hg.addColorStop(1, sD + '1)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = sD + '1)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(255,225,160,.9)'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, 6.2832); ctx.fill();

    /* capsule gondolas mounted just outside the rim */
    var C = 24;
    for (i = 0; i < C; i++){
      var ac = a + i*6.2832/C, gx = cx+Math.cos(ac)*(R+2), gy = cy+Math.sin(ac)*(R+2);
      ctx.fillStyle = sD + '.95)'; ctx.beginPath(); ctx.ellipse(gx, gy, 3.4, 4.1, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,140,.95)'; ctx.beginPath(); ctx.ellipse(gx, gy, 1.9, 2.6, 0, 0, 6.2832); ctx.fill();
    }

    /* faint reflection pooled on the water below */
    var refA = 0.12 + 0.10*spin;
    var rw = ctx.createRadialGradient(cx, HZ+28, 0, cx, HZ+28, 70);
    rw.addColorStop(0, 'rgba(255,205,135,' + refA.toFixed(3) + ')');
    rw.addColorStop(1, 'rgba(255,205,135,0)');
    ctx.fillStyle = rw; ctx.beginPath(); ctx.ellipse(cx, HZ+28, 60, 22, 0, 0, 6.2832); ctx.fill();
    ctx.lineCap = 'butt';
  }

  /* ── tower crane: lattice mast + a jib that slowly slews (its apparent reach
     swings via sin, as in a side-on view), trolley/hook, counterweight, and
     blinking red warning lights ── */
  function drawCrane(t){
    var bx = CRANE.bx, topY = CRANE.roofY - CRANE.mastH, baseY = CRANE.roofY, mw = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40,52,74,.95)'; ctx.lineWidth = 1.6;     /* mast chords */
    ctx.beginPath();
    ctx.moveTo(bx-mw, baseY); ctx.lineTo(bx-mw, topY);
    ctx.moveTo(bx+mw, baseY); ctx.lineTo(bx+mw, topY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,52,74,.55)'; ctx.lineWidth = 1;       /* lattice rungs */
    ctx.beginPath();
    for (var yy = baseY; yy > topY; yy -= 12){ ctx.moveTo(bx-mw, yy); ctx.lineTo(bx+mw, yy-6); ctx.moveTo(bx+mw, yy); ctx.lineTo(bx-mw, yy-6); }
    ctx.stroke();

    var jd = Math.sin(t*CRANE.sp);                                   /* slew → apparent reach */
    var jibTipX = bx + CRANE.jib*jd, ctrTipX = bx - CRANE.cjib*jd, jY = topY - 2;
    ctx.strokeStyle = 'rgba(48,62,90,.95)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ctrTipX, jY); ctx.lineTo(jibTipX, jY); ctx.stroke();   /* top chord */
    ctx.strokeStyle = 'rgba(48,62,90,.7)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, jY+8); ctx.lineTo(jibTipX, jY);                   /* bottom chords */
    ctx.moveTo(bx, jY+8); ctx.lineTo(ctrTipX, jY);
    ctx.moveTo(bx, jY); ctx.lineTo(bx, jY-12);                       /* cat-head A-frame */
    ctx.lineTo(jibTipX, jY); ctx.moveTo(bx, jY-12); ctx.lineTo(ctrTipX, jY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(34,44,64,.95)'; ctx.fillRect(ctrTipX-5, jY-3, 10, 9);   /* counterweight */

    var trolley = bx + (jibTipX - bx)*(0.35 + 0.45*(0.5 + 0.5*Math.sin(t*0.5)));   /* trolley runs the jib */
    var hookLen = 28 + 16*Math.sin(t*0.7);
    ctx.strokeStyle = 'rgba(70,82,104,.8)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(trolley, jY+1); ctx.lineTo(trolley, jY+1+hookLen); ctx.stroke();
    ctx.fillStyle = 'rgba(40,50,70,.9)'; ctx.fillRect(trolley-3, jY+1+hookLen, 6, 4);

    var bl = Math.pow(Math.max(0, Math.sin(t*2.2)), 6);             /* apex warning light */
    if (bl > .05){
      ctx.fillStyle = 'rgba(255,60,50,' + (bl*.4).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(bx, jY-13, 5, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,80,70,' + bl.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(bx, jY-13, 1.7, 0, 6.2832); ctx.fill();
    }
    var bl2 = Math.pow(Math.max(0, Math.sin(t*2.2 + 1)), 6);        /* jib-tip light */
    if (bl2 > .05){ ctx.fillStyle = 'rgba(255,80,70,' + bl2.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(jibTipX, jY, 1.5, 0, 6.2832); ctx.fill(); }
    ctx.lineCap = 'butt';
  }

  /* ── window-cleaning gondola (BMU) riding a tower facade up & down slowly ── */
  function drawGondola(t){
    var gx = GOND.x, span = GOND.low - GOND.roofY;
    var gy = GOND.roofY + span*(0.5 + 0.5*Math.sin(t*0.18));
    ctx.fillStyle = 'rgba(40,52,74,.9)'; ctx.fillRect(gx-10, GOND.roofY-3, 20, 3);   /* roof davit */
    ctx.strokeStyle = 'rgba(30,38,56,.7)'; ctx.lineWidth = .8;                       /* cables */
    ctx.beginPath();
    ctx.moveTo(gx-7, GOND.roofY); ctx.lineTo(gx-7, gy);
    ctx.moveTo(gx+7, GOND.roofY); ctx.lineTo(gx+7, gy);
    ctx.stroke();
    ctx.fillStyle = 'rgba(62,74,96,.95)'; ctx.fillRect(gx-9, gy, 18, 4);             /* platform */
    ctx.fillStyle = 'rgba(255,210,120,' + (0.4 + 0.4*Math.sin(t*3)).toFixed(3) + ')';
    ctx.fillRect(gx-2, gy-2, 4, 2);                                                  /* worker light */
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
    if (STORM.nextAt == null) STORM.nextAt = t + 38;             /* first storm ~38 s after load */
    if (t >= STORM.nextAt){ STORM.start = t; STORM.nextAt = t + rnd(240, 360); }   /* every 4–6 min */
    var local = STORM.start == null ? 999 : t - STORM.start;
    STORM.env = (local >= 0 && local < STORM_LEN) ? Math.min(1, local/2, (STORM_LEN - local)/3) : 0;
    if (STORM.env > 0){ if (t >= STORM.nextBolt){ makeBolt(t); STORM.nextBolt = t + 1.0 + Math.random()*2.2; } }
    else STORM.nextBolt = t + .3;
  }
  function drawStormClouds(t){                       /* dark band rolling across the top */
    if (STORM.env <= 0) return;
    var a = STORM.env*0.45;
    var g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, 'rgba(10,10,20,' + a.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(10,10,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, DW, 300);
    for (var i = 0; i < 6; i++){
      var cx = ((i*280 + t*8) % (DW + 200)) - 100, cy = 60 + (i % 3)*30, r = 90 + (i % 2)*40;
      var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      cg.addColorStop(0, 'rgba(20,22,34,' + (a*0.9).toFixed(3) + ')');
      cg.addColorStop(1, 'rgba(20,22,34,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();
    }
  }
  function strokeBolt(pts, reflect){
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++){
      var x = pts[i].x, y = pts[i].y;
      if (reflect){ y = 2*HZ - y; x += Math.sin(y*0.05 + pts[i].y)*4; }   /* mirror + ripple */
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
      var flick = Math.sin(age*80) > 0 ? 1 : 0.4;
      var a = (1 - age/bolt.life)*flick*bolt.mag;
      drawBoltPath(bolt.pts, a, false);
      for (var b = 0; b < bolt.branches.length; b++) drawBoltPath(bolt.branches[b], a*0.7, false);
      drawBoltPath(bolt.pts, a*0.28, true);          /* reflection on the water */
    }
  }
  function drawStormFlash(t){                        /* full-frame flash + water sheen */
    var age = t - STORM.flashT;
    if (age < 0 || age > 0.5) return;
    var env = age < 0.06 ? age/0.06 : Math.max(0, (0.5 - age)/0.44);
    var a = STORM.flashMag * env*(0.7 + 0.3*Math.sin(age*60)) * 0.5;
    if (a <= 0.01) return;
    ctx.fillStyle = 'rgba(200,220,255,' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, DW, DH);
    var wg = ctx.createLinearGradient(0, HZ, 0, HZ+120);
    wg.addColorStop(0, 'rgba(210,225,255,' + (a*0.8).toFixed(3) + ')');
    wg.addColorStop(1, 'rgba(210,225,255,0)');
    ctx.fillStyle = wg; ctx.fillRect(0, HZ, DW, 120);
  }

  /* ── traditional dhow sailing across the bay ── */
  function resetBoat(){
    BOAT.dir = Math.random() < .5 ? 1 : -1;
    BOAT.x   = BOAT.dir > 0 ? -180 : DW + 180;
    BOAT.y   = 798 + Math.random()*18;
    BOAT.sp  = 22 + Math.random()*16;
    BOAT.on  = true;
  }
  function drawDhow(t, dt){
    /* update position / re-entry */
    if (BOAT.on){
      BOAT.x += BOAT.dir*BOAT.sp*dt;
      if ((Math.sin(t*22) > .3)){                 /* spawn wake foam at the stern */
        var sx = BOAT.x - 46*BOAT.dir, sy = BOAT.y - 1;
        BOATW.push({ x: sx, y: sy, vx: -BOAT.dir*(4+Math.random()*6), vy: (Math.random()-.5)*4,
                     side: Math.random()<.5?-1:1, age: 0 });
      }
      if ((BOAT.dir > 0 && BOAT.x > DW + 180) || (BOAT.dir < 0 && BOAT.x < -180)){
        BOAT.on = false; BOAT.wait = 8 + Math.random()*12;
      }
    } else {
      BOAT.wait -= dt;
      if (BOAT.wait <= 0) resetBoat();
    }

    /* wake foam (drawn behind the hull) */
    for (var i = BOATW.length-1; i >= 0; i--){
      var p = BOATW[i]; p.age += dt;
      if (p.age > 2.6){ BOATW.splice(i, 1); continue; }
      p.x += p.vx*dt; p.y += (p.vy + p.side*6)*dt;
      var f = 1 - p.age/2.6;
      ctx.fillStyle = 'rgba(225,240,255,' + (f*0.4).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 3.5*(1.4-f), 1.4*(1.4-f), 0, 0, 6.2832); ctx.fill();
    }
    if (BOATW.length > 140) BOATW.splice(0, BOATW.length - 140);

    if (!BOAT.on) return;

    var flash = (t > BOAT.flashT && t < BOAT.flashT + 1.3)
              ? Math.min(1, (t - BOAT.flashT)/.12, (BOAT.flashT + 1.3 - t)/.9) : 0;

    ctx.save();
    ctx.translate(BOAT.x, BOAT.y);
    ctx.scale(BOAT.dir, 1);                        /* bow points the way it sails */

    /* hull — warm dark wood with upturned stern & bow */
    var hg = ctx.createLinearGradient(0, -10, 0, 8);
    hg.addColorStop(0, '#6b4424'); hg.addColorStop(1, '#2c1b0f');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(-48, -4);
    ctx.quadraticCurveTo(0, 14, 52, -4);          /* keel sweep */
    ctx.quadraticCurveTo(60, -8, 50, -9);         /* bow tip */
    ctx.quadraticCurveTo(0, 3, -42, -9);          /* deck line */
    ctx.quadraticCurveTo(-55, -10, -48, -4);      /* stern tip */
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(220,180,120,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-42, -7); ctx.quadraticCurveTo(0, 1, 50, -7); ctx.stroke();

    /* mast + lateen sail (gently bellied) */
    ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(4, -54); ctx.stroke();
    var sg = ctx.createLinearGradient(0, -54, 0, -8);
    sg.addColorStop(0, 'rgba(255,244,224,.96)'); sg.addColorStop(1, 'rgba(236,214,182,.92)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(4, -52);
    ctx.quadraticCurveTo(34, -40, 44, -8);        /* leech (bellied) */
    ctx.quadraticCurveTo(20, -12, 4, -10);        /* foot back to mast */
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,60,.5)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(4, -52); ctx.lineTo(44, -8); ctx.stroke();   /* yard/spar */

    /* little cabin with warm lit windows near the stern */
    ctx.fillStyle = '#3a2614'; ctx.fillRect(-34, -12, 16, 7);
    var lit = 0.6 + 0.4*Math.sin(t*4) + flash;
    ctx.fillStyle = 'rgba(255,206,110,' + Math.min(1, lit).toFixed(3) + ')';
    ctx.fillRect(-32, -10, 3, 3); ctx.fillRect(-27, -10, 3, 3); ctx.fillRect(-22, -10, 3, 3);

    ctx.restore();

    /* nav + masthead lights in world space (so glows aren't mirror-flipped) */
    var bow = { x: BOAT.x + 50*BOAT.dir, y: BOAT.y - 6 };
    var stern = { x: BOAT.x - 44*BOAT.dir, y: BOAT.y - 8 };
    var mast = { x: BOAT.x + 4*BOAT.dir, y: BOAT.y - 55 };
    /* soft point lights: a gradient halo that fades out (no hard disc) + a tiny
       crisp core — kept subtle, swelling only a little on the click flash */
    function navLight(px, py, col, intensity, baseR){
      var gr = baseR + 4*flash, ia = Math.min(1, intensity);
      var g = ctx.createRadialGradient(px, py, 0, px, py, gr);
      g.addColorStop(0,   'rgba(' + col + ',' + (0.40*ia).toFixed(3) + ')');
      g.addColorStop(0.45,'rgba(' + col + ',' + (0.12*ia).toFixed(3) + ')');
      g.addColorStop(1,   'rgba(' + col + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, gr, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(' + col + ',' + (0.5 + 0.45*ia).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, 1.2, 0, 6.2832); ctx.fill();
    }
    navLight(bow.x, bow.y, '120,235,150', 0.55 + 0.5*flash, 4);    /* green starboard at bow */
    navLight(stern.x, stern.y, '255,90,80', 0.55 + 0.5*flash, 4);  /* red at stern */
    var strobe = Math.pow(Math.max(0, Math.sin(t*5)), 14);
    navLight(mast.x, mast.y, '255,250,235', 0.25 + 0.7*strobe + 0.5*flash, 3.5);  /* white masthead */

    /* soft warm reflection smeared down onto the water (subtle) */
    var rw = ctx.createRadialGradient(BOAT.x, BOAT.y+16, 0, BOAT.x, BOAT.y+16, 40);
    rw.addColorStop(0, 'rgba(255,205,135,' + (0.07 + 0.16*flash).toFixed(3) + ')');
    rw.addColorStop(1, 'rgba(255,205,135,0)');
    ctx.fillStyle = rw; ctx.beginPath(); ctx.ellipse(BOAT.x, BOAT.y+16, 30, 13, 0, 0, 6.2832); ctx.fill();
  }

  /* ── dolphins leaping from the water now and then ── */
  var DOLPHINS = [];

  function spawnDolphins(){
    var pod = 1 + (Math.random()*3|0);
    var x0 = rnd(120, 1050), yW = rnd(795, 860);
    var dir = Math.random() < .5 ? -1 : 1;
    for (var k = 0; k < pod; k++)
      DOLPHINS.push({ x0: x0 - dir*k*60 + rnd(-8,8), yW: yW + rnd(-4,4), dir: dir,
                      delay: k*.38 + rnd(0,.15), age: 0, T: rnd(1.4,1.8),
                      trav: rnd(75,115), hgt: rnd(36,54) });
  }

  /* bottlenose body in the reef-background style: countershaded gradient,
     melon + rostrum, falcate dorsal, flukes, eye with a sparkle, the smile */
  function drawDolphinBody(g){
    /* flukes */
    g.fillStyle = '#4e6172';
    g.beginPath();
    g.moveTo(-7.4, 0);
    g.quadraticCurveTo(-8.9,-1.8, -10.2,-2.3);
    g.quadraticCurveTo(-8.8,-.3, -8.7, 0);
    g.quadraticCurveTo(-8.8,.3, -10.2, 2.3);
    g.quadraticCurveTo(-8.9,1.8, -7.4, 0);
    g.closePath(); g.fill();
    /* sleek countershaded body */
    var bg = g.createLinearGradient(0,-2.7, 0, 2.4);
    bg.addColorStop(0,'#56697a'); bg.addColorStop(.45,'#6b8092');
    bg.addColorStop(.7,'#9fb2c0'); bg.addColorStop(.85,'#e6eef4');
    bg.addColorStop(1,'#f2f7fa');
    g.fillStyle = bg;
    g.beginPath();
    g.moveTo(8.6, .1);                            /* rostrum tip */
    g.quadraticCurveTo(7,-1, 5,-1.7);             /* melon */
    g.quadraticCurveTo(1,-2.6, -3.3,-1.6);
    g.quadraticCurveTo(-6.5,-.7, -7.9,-.2);
    g.quadraticCurveTo(-6.9,.4, -3.3,1.5);
    g.quadraticCurveTo(1.7,2.5, 6.1,.9);
    g.quadraticCurveTo(7.8,.5, 8.6,.1);
    g.closePath(); g.fill();
    /* falcate dorsal fin */
    g.fillStyle = '#56697a';
    g.beginPath();
    g.moveTo(1.7,-2.1);
    g.quadraticCurveTo(.6,-4.4, -1,-4.1);
    g.quadraticCurveTo(-.9,-2.9, -1.9,-1.9);
    g.closePath(); g.fill();
    /* pectoral flipper */
    g.fillStyle = '#5c7186';
    g.beginPath(); g.ellipse(1.9, 1.2, .5, 1.4, .6, 0, 6.2832); g.fill();
    /* the famous smile */
    g.strokeStyle = 'rgba(35,48,60,.6)'; g.lineWidth = .22; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(8.4,.35); g.quadraticCurveTo(6.6,.95, 5.4,.75);
    g.stroke();
    /* eye with a sparkle + blowhole */
    g.fillStyle = '#101820';
    g.beginPath(); g.arc(5.1,-.6, .3, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.arc(5.2,-.7, .11, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(30,42,52,.7)';
    g.beginPath(); g.ellipse(3.4,-2.05, .3, .15, -.2, 0, 6.2832); g.fill();
  }

  function splash(x, y, q, s){
    var grow = 1 - q;
    ctx.strokeStyle = 'rgba(220,240,255,' + (.38*q) + ')';
    ctx.lineWidth = 1.2*s;
    ctx.beginPath();
    ctx.ellipse(x, y, (4 + grow*24)*s, (1.2 + grow*5)*s, 0, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(235,248,255,' + (.5*q) + ')';
    for (var i = 0; i < 5; i++){
      var a = -Math.PI/2 + (i-2)*.4, L = (6 + grow*10)*s;
      ctx.fillRect(x + Math.cos(a)*L, y + Math.sin(a)*L - 2*s, 1.1*s, 2.4*s);
    }
  }

  function drawDolphins(t, dt){
    if (DOLPHINS.length === 0 && Math.random() < dt*.05) spawnDolphins();
    for (var k = DOLPHINS.length-1; k >= 0; k--){
      var d = DOLPHINS[k];
      d.age += dt;
      var p = (d.age - d.delay) / d.T;
      if (p >= 1.1){ DOLPHINS.splice(k, 1); continue; }
      if (p <= 0) continue;
      var pc = Math.min(1, p);
      var s = (.7 + (d.yW - 790)/110*.8) * 4;      /* nearer = bigger */
      var xx = d.x0 + d.dir * pc * d.trav;
      var yy = d.yW - Math.sin(pc*Math.PI) * d.hgt;
      var vx = d.dir * d.trav / d.T;
      var vy = -Math.cos(pc*Math.PI) * Math.PI * d.hgt / d.T;

      if (p < 1){
        ctx.save();
        ctx.beginPath();                                               /* above surface only */
        ctx.rect(xx - 14*s, d.yW - d.hgt - 12*s, 28*s, d.hgt + 12*s);
        ctx.clip();
        ctx.translate(xx, yy);
        ctx.scale(s, s);
        ctx.rotate(Math.atan2(vy, vx));
        if (d.dir < 0) ctx.scale(1, -1);           /* keep the back upward */
        drawDolphinBody(ctx);
        ctx.restore();
      }
      if (p < .22) splash(d.x0, d.yW, 1 - p/.22, s);                       /* exit spray */
      if (p > .78) splash(d.x0 + d.dir*d.trav, d.yW,
                          Math.max(0, 1 - (p-.78)/.32), s*1.2);            /* re-entry */
    }
  }

  /* ── black oil gusher erupting from the sea every few minutes ── */
  var OIL_PERIOD = 150, OIL_LEN = 8, OIL_OFFSET = 130;   /* 8 s burst every 2.5 min */
  var OIL = { x: 0, y: 0, cyc: -1 };
  var OILP = [];

  function drawOil(t, dt){
    var ot = t + OIL_OFFSET;
    var cyc = ot / OIL_PERIOD | 0;
    var osp = ot % OIL_PERIOD;
    if (cyc !== OIL.cyc){ OIL.cyc = cyc; OIL.x = rnd(200, 950); OIL.y = rnd(800, 858); }
    var env = osp < OIL_LEN ? Math.min(1, osp/.8, (OIL_LEN - osp)/1.5) : 0;
    var after = osp - OIL_LEN;                  /* the slick lingers, then fades */
    if (env <= 0 && (after > 14 || after < 0) && OILP.length === 0) return;
    var s = .7 + (OIL.y - 790)/110*.8;
    var x = OIL.x, y = OIL.y;

    /* spreading slick with a faint iridescent rim */
    var spread = Math.min(osp, OIL_LEN + 4);
    var sa = env > 0 ? .55 : Math.max(0, .55*(1 - after/14));
    if (sa > 0){
      ctx.fillStyle = 'rgba(6,6,10,' + sa + ')';
      ctx.beginPath();
      ctx.ellipse(x, y+1, (6 + spread*4.5)*s, (1.6 + spread*.55)*s, 0, 0, 6.2832);
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,110,180,' + (sa*.35) + ')';
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.ellipse(x, y+1, (6 + spread*4.5)*s, (1.6 + spread*.55)*s, 0, 0, 6.2832);
      ctx.stroke();
    }

    if (env > 0){
      /* dense stream of black-gray droplets fired straight up */
      var want = dt*200*env;
      var n = (want|0) + (Math.random() < want%1 ? 1 : 0);
      for (var q = 0; q < n; q++){
        var g = (55 + rnd(0,95))|0;
        OILP.push({ x: x + rnd(-2.5,2.5)*s, y: y,
                    vx: rnd(-7,7)*s, vy: -rnd(165,235)*s,
                    age: 0, s: s, g: g, r: rnd(.9,2.2)*s });
      }
    }

    for (var k = OILP.length-1; k >= 0; k--){
      var p = OILP[k];
      p.age += dt;
      if (p.age > 3.2 || p.y > OIL.y + 3){ OILP.splice(k, 1); continue; }
      p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 170*p.s*dt;   /* rise, then fall back in */
      var f = Math.max(0, 1 - p.age/3.2);
      ctx.fillStyle = 'rgba(' + p.g + ',' + p.g + ',' + (p.g+8) + ',' + (f*.95) + ')';
      ctx.fillRect(p.x, p.y, p.r, p.r*1.35);
      if (p.r > 1.6*p.s){                                    /* sunset glint on big drops */
        ctx.fillStyle = 'rgba(255,160,90,' + (f*.15) + ')';
        ctx.fillRect(p.x, p.y, .8*p.s, .8*p.s);
      }
    }
    if (OILP.length > 650) OILP.splice(0, OILP.length - 650);
  }

  var animId = null;
  function loop(ts){
    if (stopped) return;
    var t = ts * .001;
    var dt = Math.min(.05, t - lastT) || .016; lastT = t;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(off, ox, oy);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);   /* design coords from here on */

    /* dusk→night overlay (under the live lights) + a matching light-gain */
    nightFactor = (1 - Math.cos((t + DAY_OFFSET)/DAY_PERIOD * 6.2832)) / 2;   /* 0=dusk … 1=deep night */
    LIGHT_GAIN = 1 + 1.3*nightFactor;
    if (nightFactor > 0.002){
      var na = nightFactor * 0.55;
      var ng = ctx.createLinearGradient(0, 0, 0, DH);
      ng.addColorStop(0,            'rgba(2,4,16,'   + na.toFixed(3) + ')');
      ng.addColorStop(HZ/DH*0.96,   'rgba(8,7,22,'   + na.toFixed(3) + ')');
      ng.addColorStop(HZ/DH,        'rgba(14,9,24,'  + (na*0.92).toFixed(3) + ')');
      ng.addColorStop(1,            'rgba(2,6,18,'   + (na*0.9).toFixed(3) + ')');
      ctx.fillStyle = ng; ctx.fillRect(0, 0, DW, DH);
    }

    /* rare thunderstorm: roll the dark cloud band in (bolts/flash drawn last) */
    updateStorm(t, dt);
    drawStormClouds(t);

    /* LED-show envelope: scheduled every 3 minutes, or triggered by a click */
    var sp = (t + SHOW_OFFSET) % SHOW_PERIOD;
    var env = sp < SHOW_LEN ? Math.min(1, sp/1.5, (SHOW_LEN - sp)/1.5) : 0;
    if (t > mShowStart && t < mShowEnd)
      env = Math.max(env, Math.min(1, (t - mShowStart)/.8, (mShowEnd - t)/1.5));
    var showHue = (t*40) % 360;
    /* fireworks envelope: scheduled every 2 minutes, or triggered by a click */
    var fsp = (t + FW_OFFSET) % FW_PERIOD;
    var fwEnv = fsp < FW_LEN ? Math.min(1, fsp/.6, (FW_LEN - fsp)/.6) : 0;
    if (t > mFwStart && t < mFwEnd)
      fwEnv = Math.max(fwEnv, Math.min(1, (t - mFwStart)/.4, (mFwEnd - t)/.6));
    /* fountain envelope: 30 s once every 3:30, or started by a click */
    var nsp = (t + FN_OFFSET) % FN_PERIOD;
    var fnEnv = nsp < FN_LEN ? Math.min(1, nsp/2.5, (FN_LEN - nsp)/2.5) : 0;
    if (t > mFnStart && t < mFnEnd)
      fnEnv = Math.max(fnEnv, Math.min(1, (t - mFnStart)/2, (mFnEnd - t)/2.5));

    drawMoonFx(t);

    /* changing city lights — per-building windows + accent schemes + waves */
    updateWaves(t);
    for (var k = 0; k < BUILDINGS.length; k++){
      drawDynWindows(BUILDINGS[k], t);
      drawAccent(BUILDINGS[k], t);
    }
    drawWaves(t);

    /* Ain Dubai observation wheel turning over the water */
    drawFerris(t, dt);

    /* "Dubai under construction": a slewing tower crane + a cleaning gondola */
    drawCrane(t);
    drawGondola(t);

    /* big yellow lights wandering over the Burj — whenever no LED show runs */
    if (env < 1){
      for (k = 0; k < BURJ_YEL.length; k++){
        var yl = BURJ_YEL[k];
        var yon = Math.sin(t*yl.sp + yl.ph);
        var ya = Math.max(0, Math.min(1, (yon + .15) * 3)) * (1 - env) * LIGHT_GAIN;
        if (ya < .05) continue;
        ctx.fillStyle = 'rgba(255,206,70,' + (ya*.22) + ')';
        ctx.beginPath(); ctx.arc(yl.x, yl.y, yl.r*2.6, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(255,214,90,' + ya + ')';
        ctx.fillRect(yl.x - yl.r/2, yl.y - yl.r/2, yl.r, yl.r*1.3);
      }
    }

    /* twinkling stars — crisp focused points (space-style): a tight core + a
       small halo, with a 4-point sparkle on the brightest; gently brighter at
       night (NOT the big soft blink of the Burj lights) */
    var starGain = 1 + 0.5*nightFactor;
    for (k = 0; k < TWK.length; k++){
      var w = TWK[k];
      var raw = (Math.sin(t*w.sp + w.ph) + 1) * .5;
      var a = (0.25 + 0.75*raw*raw) * starGain;
      if (a < .05) continue;
      ctx.fillStyle = 'rgba(' + w.c + ',' + (a*0.14).toFixed(3) + ')';        /* tight halo */
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r*1.7, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(' + w.c + ',' + Math.min(1, a).toFixed(3) + ')';   /* crisp core */
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r*0.7, 0, 6.2832); ctx.fill();
      if (w.big && a > .5){                                                    /* sparkle spikes */
        var ln = w.r*(3 + 2*raw);
        ctx.strokeStyle = 'rgba(' + w.c + ',' + (a*0.5).toFixed(3) + ')'; ctx.lineWidth = .7;
        ctx.beginPath();
        ctx.moveTo(w.x-ln, w.y); ctx.lineTo(w.x+ln, w.y);
        ctx.moveTo(w.x, w.y-ln); ctx.lineTo(w.x, w.y+ln);
        ctx.stroke();
      }
    }

    /* shooting stars across the upper sky */
    drawShooting(t, dt);

    /* Burj Khalifa LED show; fireworks on their own 2-minute clock */
    if (env > 0) drawBurjShow(t, env, showHue);
    if (fwEnv > 0) spawnFireworks(dt, fwEnv, showHue);
    if (FW.length) drawFireworks(dt);
    drawPops(t);                       /* drone explosion flashes/rings */

    /* red aviation beacons */
    for (k = 0; k < BEACONS.length; k++){
      var b = BEACONS[k];
      var bl = Math.max(0, Math.sin(t*b.sp + b.ph));
      bl = Math.pow(bl, 6);
      if (bl < .05) continue;
      ctx.fillStyle = 'rgba(255,60,50,' + (bl*.35) + ')';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r*3.5, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,80,70,' + bl + ')';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
    }

    /* distant aircraft */
    var ft = (t % 85) / 85;
    var fx = -60 + ft*1720, fy = 138 - ft*16;
    ctx.fillStyle = 'rgba(235,240,255,.8)';
    ctx.fillRect(fx, fy, 1.6, 1.6);
    if (Math.sin(t*6) > .82){
      ctx.fillStyle = 'rgba(255,90,80,.9)';
      ctx.fillRect(fx - 3, fy, 1.4, 1.4);
    }

    /* helicopters & drones (+ the Burj Al Arab helipad shuttle) */
    for (k = 0; k < HELIS.length; k++) drawHeli(HELIS[k], t);
    drawBAHeli(t);

    /* ambient drone traffic (≤5 crossing), plus the fly-in/out light show */
    drawCrossers(t, dt);
    drawShowDrones(t);

    /* missile-defense show over the bay */
    drawMissiles(t, dt);

    /* a dhow sailing across the bay */
    drawDhow(t, dt);

    /* dolphins leaping from the water */
    drawDolphins(t, dt);

    /* oil gusher out at sea */
    drawOil(t, dt);

    /* fountain show at the Burj's feet */
    drawFountain(t, dt, env, showHue, fnEnv);

    /* sun glints on the water */
    for (k = 0; k < SPARKS.length; k++){
      var spk = SPARKS[k];
      var ga = Math.max(0, Math.sin(t*spk.sp + spk.ph));
      ga = ga*ga*ga * .55;
      if (ga < .05) continue;
      ctx.fillStyle = 'rgba(255,215,150,' + ga + ')';
      ctx.fillRect(spk.x, spk.y, spk.len, 1.1);
    }

    /* thunderstorm bolts (+ water reflection) and the full-frame flash, on top */
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
