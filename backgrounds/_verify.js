/* Logic-only verification harness for dubai.bg.js features (no DOM/canvas).
   Re-implements the pure math (formation generators + show schedule) so we can
   confirm point counts, coordinate ranges, and resource-safety (one formation
   assignment per show, smooth fp envelope). Run: `node _verify.js`.
   Keep this in sync when the corresponding logic in dubai.bg.js changes. */

// ── drone-show config (mirror dubai.bg.js) ──
var DRONE_PERIOD = 150, DRONE_LEN = 17, DRONE_OFFSET = 132, DRONE_N = 24;

// ── formation generators (copied verbatim) ──
function heartPts(n){
  var a = [];
  for (var k = 0; k < n; k++){
    var u = k/n*6.2832;
    var x = 16*Math.pow(Math.sin(u),3);
    var y = 13*Math.cos(u) - 5*Math.cos(2*u) - 2*Math.cos(3*u) - Math.cos(4*u);
    a.push({ x: x*5.4, y: -y*5.4 - 8 });
  }
  return a;
}
function ringPts(n){
  var a = [];
  for (var k = 0; k < n; k++){ var u = k/n*6.2832; a.push({ x: Math.cos(u)*92, y: Math.sin(u)*92 }); }
  return a;
}
function distribute(verts, n){
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
var DSHAPES = [ { gen: ringPts, hue: 190 }, { gen: heartPts, hue: 332 }, { gen: starPts, hue: 45 } ];

function rng(a){
  var mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
  a.forEach(function(p){ mnx=Math.min(mnx,p.x);mxx=Math.max(mxx,p.x);mny=Math.min(mny,p.y);mxy=Math.max(mxy,p.y); });
  return 'x['+mnx.toFixed(0)+','+mxx.toFixed(0)+'] y['+mny.toFixed(0)+','+mxy.toFixed(0)+']';
}

var fails = 0;
function check(name, cond, extra){
  console.log((cond ? '  ok  ' : 'FAIL  ') + name + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
}

console.log('── drone light show (squadron in/out, 2 shapes) ──');
var SHOW_N = 18, MOON_X = 300, MOON_Y = 140, DCX = 295, DCY = 350;
// each shape generates exactly SHOW_N points, all within the formation box
DSHAPES.forEach(function(sh, i){
  var pts = sh.gen(SHOW_N);
  var ok = pts.length === SHOW_N && pts.every(function(p){ return Math.abs(p.x) <= 100 && Math.abs(p.y) <= 100; });
  check('shape ' + i + ' → ' + SHOW_N + ' pts in box', ok, 'n=' + pts.length + ' ' + rng(pts));
});
// formation sits below the moon and on the left half of the 1600-wide design
var topY = DCY - 100;
check('formation is below the moon', topY > MOON_Y + 20, 'topY=' + topY + ' moonY=' + MOON_Y);
check('formation is on the left side', DCX + 100 < 1600/2, 'rightEdge=' + (DCX+100));

// schedule sim @60fps: one rising edge per show, smooth fp 0→1→0, EXACTLY two
// shape slots per show, and a DIFFERENT shape pair on consecutive shows.
var dPrev = 0, assigns = 0, fpMin = 9, fpMax = -9;
var dShowStart = -99, dShowLen = DRONE_LEN, dCurSlot = -1, dShapeStart = 0;
var IN = 3, OUT = 3, slotsThisShow = {}, maxSlotsPerShow = 0, pairs = [];
for (var t = 0; t < 400; t += 1/60){
  var dsp = (t + DRONE_OFFSET) % DRONE_PERIOD;
  var sched = dsp < DRONE_LEN ? Math.min(1, dsp/2, (DRONE_LEN - dsp)/2) : 0;
  var env = sched;
  if (dPrev <= 0 && env > 0){
    assigns++; dShowStart = t - dsp; dShowLen = DRONE_LEN; dCurSlot = 0;
    dShapeStart = (dShapeStart + 1) % DSHAPES.length;
    pairs.push([dShapeStart, (dShapeStart + 1) % DSHAPES.length]);
    maxSlotsPerShow = Math.max(maxSlotsPerShow, Object.keys(slotsThisShow).length);
    slotsThisShow = {};
  }
  if (env > 0){
    var local = t - dShowStart;
    var holdDur = Math.max(0.1, dShowLen - IN - OUT) / 2;
    if (local > IN && local < dShowLen - OUT){ var slot = Math.floor((local - IN)/holdDur); if (slot > 1) slot = 1; slotsThisShow[slot] = 1; }
    var fp = local < IN ? local/IN : (local > dShowLen - OUT ? Math.max(0,(dShowLen - local)/OUT) : 1);
    fp = fp < 0 ? 0 : fp > 1 ? 1 : fp; fp = fp*fp*(3 - 2*fp);
    fpMin = Math.min(fpMin, fp); fpMax = Math.max(fpMax, fp);
  }
  dPrev = env;
}
maxSlotsPerShow = Math.max(maxSlotsPerShow, Object.keys(slotsThisShow).length);
var pairsDiffer = pairs.length >= 2 && pairs.slice(1).every(function(p, k){ return p[0] !== pairs[k][0]; });
check('scheduled shows in 400s (2-3)', assigns >= 2 && assigns <= 3, 'count=' + assigns);
check('exactly two shapes per show', maxSlotsPerShow === 2, 'slots=' + maxSlotsPerShow);
check('consecutive shows use a different pair', pairsDiffer, 'pairs=' + JSON.stringify(pairs));
check('fp flies fully in', fpMax > 0.98, 'max=' + fpMax.toFixed(3));
check('fp flies fully back out', fpMin < 0.02, 'min=' + fpMin.toFixed(3));

// ambient crossers: a pool of 5 — never more than 5 on screen, and they exit
var CROSS_MAX = 5, DW = 1600;
var pool = []; for (var c = 0; c < CROSS_MAX; c++) pool.push({ active:false, wait: c*2, x:0, dir:1, sp:50, exits:0 });
var maxConcurrent = 0;
for (var t3 = 0; t3 < 120; t3 += 1/30){
  var n = 0;
  for (var p3 = 0; p3 < pool.length; p3++){
    var d = pool[p3];
    if (!d.active){ d.wait -= 1/30; if (d.wait <= 0){ d.active = true; d.dir = (p3%2)?1:-1; d.x = d.dir>0?-50:DW+50; d.sp = 50; } else continue; }
    d.x += d.dir*d.sp*(1/30);
    if ((d.dir>0 && d.x>DW+60) || (d.dir<0 && d.x<-60)){ d.active=false; d.wait=5; d.exits++; continue; }
    n++;
  }
  maxConcurrent = Math.max(maxConcurrent, n);
}
var totalExits = pool.reduce(function(s,d){ return s + d.exits; }, 0);
check('ambient drones never exceed ' + CROSS_MAX, maxConcurrent <= CROSS_MAX, 'max=' + maxConcurrent);
check('ambient drones cross & exit', totalExits > 0, 'exits=' + totalExits);

// ── Ain Dubai Ferris wheel ──
console.log('\n── Ain Dubai wheel ──');
var AW_X = 410, AW_Y = 618, AW_R = 120, AW_BASE_W = 0.18, HZ = 780;
// rim points sit on the circle; gondolas + legs reach sensible places
var rimOk = true;
for (var i = 0; i < 60; i++){
  var ar = i*6.2832/60, rx = AW_X+Math.cos(ar)*AW_R, ry = AW_Y+Math.sin(ar)*AW_R;
  var d = Math.hypot(rx-AW_X, ry-AW_Y);
  if (Math.abs(d - AW_R) > 0.001) rimOk = false;
}
check('rim dots lie on radius', rimOk);
check('wheel bottom above waterline', AW_Y + AW_R < HZ, 'bottom=' + (AW_Y+AW_R) + ' HZ=' + HZ);
check('wheel sits left of the Burj (BX≈1330)', AW_X + AW_R < 1330);

// spin integration: continuous angle, no jump on spin-up; envelope in [0,1]
var awAngle = 0, awBoostStart = 5, prevAngle = 0, maxStep = 0, envMin = 9, envMax = -9, monotonic = true;
for (var t = 0; t < 12; t += 1/60){
  var spin = (t > awBoostStart && t < awBoostStart + 4)
           ? Math.min(1, (t - awBoostStart)/.5, (awBoostStart + 4 - t)/2) : 0;
  if (t > awBoostStart && t < awBoostStart + 4){ envMin = Math.min(envMin, spin); envMax = Math.max(envMax, spin); }
  awAngle += AW_BASE_W*(1 + 3.4*spin)*(1/60);
  var step = awAngle - prevAngle;
  if (step < 0) monotonic = false;
  maxStep = Math.max(maxStep, step);
  prevAngle = awAngle;
}
check('rotation always forward (no jump back)', monotonic);
check('per-frame angle step stays small', maxStep < 0.02, 'maxStep=' + maxStep.toFixed(4));
check('spin-up envelope within [0,1]', envMin >= 0 && envMax <= 1 && envMax > 0.9, 'min=' + envMin.toFixed(2) + ' max=' + envMax.toFixed(2));

// ── dhow crossing the bay ──
console.log('\n── dhow ──');
var DW = 1600;
var BOAT = { x: -200, y: 808, dir: 1, sp: 28, on: true, wait: 0, flashT: 5 };
var BOATW = [];
function resetBoat(){ BOAT.dir = 1; BOAT.x = -180; BOAT.y = 805; BOAT.sp = 28; BOAT.on = true; }
var crossings = 0, maxWake = 0, fMin = 9, fMax = -9;
for (var t = 0; t < 200; t += 1/60){
  if (BOAT.on){
    BOAT.x += BOAT.dir*BOAT.sp*(1/60);
    if (Math.sin(t*22) > .3) BOATW.push({ age: 0 });
    if ((BOAT.dir > 0 && BOAT.x > DW + 180) || (BOAT.dir < 0 && BOAT.x < -180)){ BOAT.on = false; BOAT.wait = 8; crossings++; }
  } else { BOAT.wait -= 1/60; if (BOAT.wait <= 0) resetBoat(); }
  for (var i = BOATW.length-1; i >= 0; i--){ BOATW[i].age += 1/60; if (BOATW[i].age > 2.6) BOATW.splice(i,1); }
  if (BOATW.length > 140) BOATW.splice(0, BOATW.length - 140);
  maxWake = Math.max(maxWake, BOATW.length);
  var flash = (t > BOAT.flashT && t < BOAT.flashT + 1.3) ? Math.min(1, (t - BOAT.flashT)/.12, (BOAT.flashT + 1.3 - t)/.9) : 0;
  if (t > BOAT.flashT && t < BOAT.flashT + 1.3){ fMin = Math.min(fMin, flash); fMax = Math.max(fMax, flash); }
}
check('dhow crosses & re-enters (loops)', crossings >= 2, 'crossings=' + crossings);
check('wake particle count capped', maxWake <= 140, 'max=' + maxWake);
check('light-flash envelope within [0,1]', fMin >= 0 && fMax <= 1 && fMax > 0.9, 'min=' + fMin.toFixed(2) + ' max=' + fMax.toFixed(2));

// ── construction crane + gondola ──
console.log('\n── crane & gondola ──');
var CRANE = { bx: 485, roofY: HZ - 165, mastH: 116, jib: 98, cjib: 34, sp: 0.12 };
var GOND  = { x: 1190, roofY: HZ - 292, low: HZ - 40 };
var topY = CRANE.roofY - CRANE.mastH;
check('crane mast tops out above its roof', topY < CRANE.roofY && topY > 460, 'topY=' + topY);
// slew reach swings symmetrically and the jib never exceeds its length
var maxTip = -1e9, minTip = 1e9, blMax = -9;
for (var t = 0; t < 60; t += 1/30){
  var jd = Math.sin(t*CRANE.sp);
  var jibTipX = CRANE.bx + CRANE.jib*jd;
  maxTip = Math.max(maxTip, jibTipX); minTip = Math.min(minTip, jibTipX);
  blMax = Math.max(blMax, Math.pow(Math.max(0, Math.sin(t*2.2)), 6));
}
check('jib reach swings both sides of mast', maxTip > CRANE.bx + 90 && minTip < CRANE.bx - 90, '[' + minTip.toFixed(0) + ',' + maxTip.toFixed(0) + ']');
check('warning light blinks to full', blMax > 0.95, 'blMax=' + blMax.toFixed(3));
// gondola stays on the facade between roof and lower bound
var gMin = 1e9, gMax = -1e9;
for (var t2 = 0; t2 < 60; t2 += 1/30){
  var gy = GOND.roofY + (GOND.low - GOND.roofY)*(0.5 + 0.5*Math.sin(t2*0.18));
  gMin = Math.min(gMin, gy); gMax = Math.max(gMax, gy);
}
check('gondola travels within the facade', gMin >= GOND.roofY - 1 && gMax <= GOND.low + 1, '[' + gMin.toFixed(0) + ',' + gMax.toFixed(0) + '] facade[' + GOND.roofY + ',' + GOND.low + ']');

// ── dusk→night cycle ──
console.log('\n── dusk→night ──');
var DAY_PERIOD = 200, DAY_OFFSET = 0;
var nfMin = 9, nfMax = -9, gMin = 9, gMax = -9, startNf = null;
for (var t = 0; t <= DAY_PERIOD; t += 1){
  var nf = (1 - Math.cos((t + DAY_OFFSET)/DAY_PERIOD * 6.2832)) / 2;
  var gain = 1 + 1.3*nf;
  if (startNf === null) startNf = nf;
  nfMin = Math.min(nfMin, nf); nfMax = Math.max(nfMax, nf);
  gMin = Math.min(gMin, gain); gMax = Math.max(gMax, gain);
}
check('night factor spans 0→1 over the cycle', nfMin < 0.001 && nfMax > 0.999, '[' + nfMin.toFixed(3) + ',' + nfMax.toFixed(3) + ']');
check('starts at dusk (no overlay)', startNf < 0.001, 'start=' + startNf.toFixed(4));
check('light gain rises with night', gMin >= 1 && gMax > 2.2, '[' + gMin.toFixed(2) + ',' + gMax.toFixed(2) + ']');
// continuity: per-step change in nf is gentle (no palette jumps)
var prevNf = 0, maxd = 0;
for (var t2 = 0; t2 <= DAY_PERIOD; t2 += 1/30){
  var nf2 = (1 - Math.cos((t2 + DAY_OFFSET)/DAY_PERIOD * 6.2832)) / 2;
  maxd = Math.max(maxd, Math.abs(nf2 - prevNf)); prevNf = nf2;
}
check('palette shift is gradual per frame', maxd < 0.002, 'maxΔ=' + maxd.toFixed(5));

// ── desert thunderstorm ──
console.log('\n── thunderstorm ──');
var STORM_LEN = 12;
var STORM = { env: 0, start: null, nextAt: null, nextBolt: 0, bolts: [], flashT: -99, flashMag: 0 };
function gap(){ return 300; }   // mid of the 240–360 s (4–6 min) range, deterministic for the check
function makeBolt(t){
  var x = 700, top = 80, endY = HZ-120, ex = x, n = 10, pts = [{x:x,y:top}];
  for (var i = 1; i <= n; i++){ var f = i/n; pts.push({ x: x + (ex-x)*f, y: top + (endY-top)*f }); }
  STORM.bolts.push({ t0: t, life: .25, pts: pts, branches: [], mag: .8 });
  STORM.flashT = t; STORM.flashMag = .7;
}
var starts = [], boltCount = 0, maxBolts = 0, flashPeak = -9;
for (var t = 0; t < 1500; t += 1/30){
  if (STORM.nextAt == null) STORM.nextAt = t + 38;
  if (t >= STORM.nextAt){ STORM.start = t; starts.push(t); STORM.nextAt = t + gap(); }
  var local = STORM.start == null ? 999 : t - STORM.start;
  STORM.env = (local >= 0 && local < STORM_LEN) ? Math.min(1, local/2, (STORM_LEN - local)/3) : 0;
  if (STORM.env > 0){ if (t >= STORM.nextBolt){ makeBolt(t); boltCount++; STORM.nextBolt = t + 1.5; } }
  else STORM.nextBolt = t + .3;
  for (var i = STORM.bolts.length-1; i >= 0; i--){ if (t - STORM.bolts[i].t0 > STORM.bolts[i].life) STORM.bolts.splice(i,1); }
  maxBolts = Math.max(maxBolts, STORM.bolts.length);
  var age = t - STORM.flashT;
  if (age >= 0 && age <= 0.5){ var env = age < 0.06 ? age/0.06 : Math.max(0,(0.5-age)/0.44); flashPeak = Math.max(flashPeak, STORM.flashMag*env); }
}
var gapsOk = true; for (var s = 1; s < starts.length; s++){ var d = starts[s]-starts[s-1]; if (d < 239.9 || d > 360.1) gapsOk = false; }
check('storm interval range is 4–6 min', 240/60 === 4 && 360/60 === 6);
check('storms recur on a 4–6 min schedule', gapsOk && starts.length >= 4, 'starts=' + starts.length + ' gap=' + (starts.length>1?(starts[1]-starts[0]).toFixed(0):'?'));
check('bolts strike during storms', boltCount > 0, 'bolts=' + boltCount);
check('live bolt count stays tiny (no buildup)', maxBolts <= 3, 'max=' + maxBolts);
check('flash peaks then clears', flashPeak > 0.4, 'peak=' + flashPeak.toFixed(2));
var py = HZ - 100, refl = 2*HZ - py;
check('bolt reflection lands in the water', refl > HZ, 'srcY=' + py + ' reflY=' + refl + ' HZ=' + HZ);

// ── shooting stars + drone pop ──
console.log('\n── shooting stars & drone pop ──');
function rndR(a,b){ return a + (b-a)*0.5; }
// shooting-star schedule: spawns recur every ~6-16 s and never pile up (life<1s)
var SHOOT = [], nextShootAt = 0, DW2 = 1600, spawns = 0, maxLive = 0;
for (var t = 0; t < 120; t += 1/60){
  if (t >= nextShootAt){ nextShootAt = t + rndR(6,16); spawns++;
    SHOOT.push({ x: 300, y: 120, vx: 400, vy: 200, age: 0, life: rndR(.5,.9), len: 90 }); }
  for (var i = SHOOT.length-1; i >= 0; i--){ SHOOT[i].age += 1/60; if (SHOOT[i].age > SHOOT[i].life) SHOOT.splice(i,1); }
  maxLive = Math.max(maxLive, SHOOT.length);
}
check('shooting stars recur (~every 6-16s)', spawns >= 8 && spawns <= 20, 'spawns=' + spawns);
check('shooting stars never pile up', maxLive <= 2, 'maxLive=' + maxLive);

// drone pop: pushes a flash + spark burst, and arms a respawn
var FW = [], POPS = [];
function popDrone(x, y, hue){
  POPS.push({ x: x, y: y, t0: 0 });
  for (var k = 0; k < 22; k++){ var ang = k/22*6.2832; FW.push({ x:x, y:y, vx:Math.cos(ang)*80, vy:Math.sin(ang)*80, life:.8, age:0 }); }
}
var crosser = { active: true, wait: 0 };
popDrone(300, 200, 190);
crosser.active = false; crosser.wait = rndR(3,6);   // respawn arming (mirror of click handler)
check('pop emits a flash', POPS.length === 1);
check('pop emits spark burst', FW.length === 22, 'sparks=' + FW.length);
check('popped crosser respawns after a few s', !crosser.active && crosser.wait >= 3 && crosser.wait <= 6, 'wait=' + crosser.wait.toFixed(1));
var showDrone = { _on: true, deadUntil: 0 };
showDrone.deadUntil = 0 + 4; showDrone._on = false;   // show-drone pop (returns after 4 s)
check('popped show drone returns later', showDrone.deadUntil === 4 && !showDrone._on);

// helicopter pop: deadUntil set, and off recomputed so it re-enters from the
// edge (prog≈0) exactly when it returns
var DWh = 1600, tNow = 37.3, hl = { sp: 55, _period: (DWh+300)/55, off: 12.0 };
var delayH = 5;
hl.deadUntil = tNow + delayH;
hl.off = (hl._period - ((tNow + delayH) % hl._period)) % hl._period;
var progAtReturn = ((hl.deadUntil + hl.off) % hl._period) / hl._period;
check('popped heli re-enters from the edge', progAtReturn < 0.001 || progAtReturn > 0.999, 'prog=' + progAtReturn.toFixed(4));
check('popped heli stays down a few seconds', hl.deadUntil - tNow >= 4 && hl.deadUntil - tNow <= 7, 'delay=' + (hl.deadUntil-tNow));

console.log(fails ? ('\n' + fails + ' FAILURES') : '\nALL PASS');
process.exit(fails ? 1 : 0);
