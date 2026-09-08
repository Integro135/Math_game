/* ── Space background v2 — the deep-space scene around a REAL black hole ─────
   Recreation of space.bg.js with the black hole replaced by the general-
   relativistic render of blackhole.html.

   Two canvases are stacked inside the stage:

   • BOTTOM — WebGL2, ADAPTIVE quality (starts LOW ≈ 0.42× internal resolution
     and climbs to medium/high while the frame time allows; CSS-upscaled): the
     sky. Every pixel fires a ray backwards through Schwarzschild spacetime
     (Binet-form null geodesics, r_s = 1) toward an off-axis camera, so the hole
     sits where the old one did (x = 0.90 W, y = 0.36 H) with the same shadow
     radius (0.075·min(W,H)) — all the 2-D gameplay geometry (click targets,
     bhPull swallow radius, lensImage) keeps working unchanged. The shadow,
     photon ring, Einstein ring and the disk's arch over/under the hole emerge
     from the maths. The HOLE SPINS: its orientation precesses slowly about the
     vertical like a top (the camera and the sky stay put — only the hole's
     angle changes). Thin accretion disk (Novikov–Thorne temperature → black-
     body colour, Doppler beaming, gravitational redshift, two glowing trailing
     spiral arms on sheared turbulent filaments), twin relativistic jets
     integrated volumetrically along the same geodesics, ~600 dust grains
     simulated in 3-D (Paczyński–Wiita pseudo-potential) spiralling into the
     hole from all over the frame and drawn through the point-mass lens, the
     MILKY WAY (a structured band with a warm core bulge and dark dust rift
     across the frame) plus a sparse star field, all sampled along the
     DEFLECTED ray (they streak round the hole), HDR bloom, ACES tonemap, and
     the old scene's dark gradient + faint nebulae as a screen-space backdrop.

   • TOP — 2-D canvas (transparent), ported from space.bg.js and partly
     REBUILT: EARTH is an orthographic globe with real (simplified) continents,
     deserts and ice, streaky clouds, Rayleigh rim, terminator + city lights,
     aurora; SATURN is an oblate banded gas giant with structured rings
     (C · B · Cassini · A · F), the planet's shadow on the rings and the rings'
     shadow on the planet, orbiting gravel; the SUN's limb has limb darkening,
     boiling granulation, sunspots, a red chromosphere, spicules, prominence
     loops, corona streamers and scheduled flares. Plus the sparse twinkling
     stars (lensed/pulled by the 2-D bhPull + lensImage), spiral galaxies,
     comets, travellers, constellations, the supernova, the doomed astronaut,
     tidal streaks, the Hebrew discovery bubble and every click reaction.
     Clicking the black hole → feeding frenzy: the disk and jets flare, dust
     from the whole screen is yanked in (GRAVITY SURGE), an astronaut spirals in.

   No WebGL2 → the GL sky is replaced by a STILL PAINTED sky on the same
   canvas (the composite shader's deep-space gradient + its four nebulae, a
   soft Milky Way band and a simple 2-D black hole: shadow, photon ring and a
   tilted disk glow) while the whole 2-D world above keeps running, so the
   theme never goes dark and needs no second module.
   Skin: game/skins/space.skin.css · Aids: space.
   Loaded by game/js/bg-loader.js (theme galaxy → space2 in themes.js).
   Harness: backgrounds/space2.html. Docs: backgrounds/README.md.         */
(function(){
'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   SHADERS (shared with blackhole.html, adapted: off-axis camera, hole rotation,
   the Milky Way with a placed core, the old scene's backdrop)
   ═══════════════════════════════════════════════════════════════════════════ */
const VS=`#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const SCENE_FS=`#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;
uniform vec2  uRes, uHolePx;   // internal resolution · where the hole sits on it (off-axis projection)
uniform float uTime, uDiskTime;
uniform vec3  uCamPos, uCamFwd, uCamRight, uCamUp, uGalN, uGalCore;
uniform mat3  uHoleRot, uHoleRotT;   // world→hole · hole→world (the hole's orientation; the sky stays in world)
uniform float uTanHalf, uPixAng;
uniform int   uSteps;
uniform float uDiskIn, uDiskOut, uSpin, uTpeak, uJets, uBoost, uHalo, uEnc;

const float PI = 3.14159265, TAU = 6.28318531;
const float R_BOUND = 15.0, ROT = 2.0, JET_LEN = 42.0, JET_RMAX = 7.8;
vec3 enc(vec3 c){ return uEnc < 1.0 ? sqrt(max(c, 0.0)*uEnc) : c; }

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash13(vec3 p3){ p3 = fract(p3*0.1031); p3 += dot(p3, p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
vec3  hash33(vec3 p3){ p3 = fract(p3*vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz+33.33); return fract((p3.xxy+p3.yxx)*p3.zyx); }
float pnoise(vec2 p, float N){
  vec2 i = floor(p), f = fract(p);
  f = f*f*f*(f*(f*6.0-15.0)+10.0);
  float x0 = mod(i.x, N), x1 = mod(i.x+1.0, N);
  float a = hash12(vec2(x0, i.y)),     b = hash12(vec2(x1, i.y));
  float c = hash12(vec2(x0, i.y+1.0)), d = hash12(vec2(x1, i.y+1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbmDisk(float u, float y, float N, float seed){
  float s = 0.0, amp = 0.55, tot = 0.0;
  vec2 p = vec2(u, y);
  for(int k=0; k<5; k++){
    s += amp*pnoise(p + vec2(0.37*float(k), seed + 53.0*float(k)), N);
    tot += amp; amp *= 0.56; p *= 2.0; N *= 2.0;
  }
  return s/tot;
}
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i),             hash13(i+vec3(1,0,0)), f.x),
                 mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x),
                 mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for(int k=0; k<4; k++){ s += a*vnoise3(p); p = p*2.03 + vec3(7.1, 3.3, 5.7); a *= 0.5; } return s; }
vec3 blackbody(float T){
  float t = clamp(T, 1000.0, 40000.0)/100.0;
  float r, g, b;
  if(t <= 66.0){ r = 1.0; g = clamp(0.39008158*log(t) - 0.63184144, 0.0, 1.0); }
  else { r = clamp(1.29293619*pow(t-60.0, -0.1332047592), 0.0, 1.0); g = clamp(1.12989086*pow(t-60.0, -0.0755148492), 0.0, 1.0); }
  if(t >= 66.0) b = 1.0; else if(t <= 19.0) b = 0.0; else b = clamp(0.54320679*log(t-10.0) - 1.19625409, 0.0, 1.0);
  vec3 c = vec3(r, g, b);
  return c*c;
}
vec3 starLayer(vec3 d, float N, float prob, float bright, float seed){
  vec3 a = abs(d); vec2 uv; float face;
  if(a.x >= a.y && a.x >= a.z){ uv = d.yz/a.x; face = d.x > 0.0 ? 0.0 : 1.0; }
  else if(a.y >= a.z)         { uv = d.xz/a.y; face = d.y > 0.0 ? 2.0 : 3.0; }
  else                        { uv = d.xy/a.z; face = d.z > 0.0 ? 4.0 : 5.0; }
  vec2 c = (uv*0.5+0.5)*N; vec2 cell = floor(c); vec2 f = c - cell;
  vec3 h = hash33(vec3(cell, face*7.0 + seed*131.0));
  if(h.x > prob) return vec3(0.0);
  vec2 pos = 0.22 + 0.56*hash33(vec3(cell.yx + 19.0, face*13.0 + seed*71.0)).xy;
  float cellAng = 2.0/N*(1.0/(1.0+0.45*dot(uv, uv)));
  float sig = max(0.0011, 0.7*uPixAng)/cellAng;
  float d2 = dot(f-pos, f-pos);
  float I = bright*(0.05 + pow(h.y, 7.0))*exp(-d2/(2.0*sig*sig));
  float T = 2700.0 + 9500.0*pow(h.z, 2.2);
  return blackbody(T)*I;
}
// the sky: a dark deep field — the MILKY WAY as a structured band (star clouds,
// dark dust rift, warm core bulge placed by uGalCore) and a few sparse stars
vec3 sky(vec3 d){
  float lat = dot(d, uGalN);
  // the field of view is narrow (~28° tall), so the structure needs high angular frequencies
  float n1 = fbm3(d*11.0 + vec3(3.1));                      // star-cloud patchiness
  float n2 = vnoise3(d*38.0 + vec3(9.7));                   // fine dust structure
  float n3 = vnoise3(d*19.0 + vec3(27.0));
  float width = 0.055 + 0.045*n1;
  float band = exp(-lat*lat/(width*width));
  float rift = smoothstep(0.40, 0.68, n2*0.6 + n3*0.4)*exp(-lat*lat/0.0012)*0.85;   // the Great Rift along the plane
  float ca = 1.0 - dot(d, uGalCore);                        // ≈ angle²/2 to the core
  float core = exp(-ca/0.007)*exp(-lat*lat/0.01);           // the golden bulge, elongated along the band
  float kern = exp(-ca/0.0015);                             // its bright heart
  vec3 mw = vec3(0.62, 0.60, 0.80)*band*(0.05 + 1.5*n1*n1)*(1.0 - rift)
          + vec3(1.0, 0.86, 0.62)*core*(0.45 + 0.55*n1)*(1.0 - rift*0.6)
          + vec3(1.0, 0.94, 0.80)*kern*0.6;
  vec3 col = mw*0.058;
  float dens = 0.45 + 2.6*band*(1.0 - rift*0.7) + 2.5*core; // stars thicken toward the plane and the core
  col += starLayer(d, 24.0,  0.05,      2.0,  1.0);
  col += starLayer(d, 70.0,  0.035*dens, 0.85, 2.0);
  col += starLayer(d, 190.0, 0.05*dens,  0.28, 3.0);
  return col;
}
// deflection still to be accrued from along-track position s (0 at closest approach) to
// infinity; the full bend is 2/b + 15π/(16b²) (second order matters at the sphere's edge)
float residualBend(float b, float s){
  float r = sqrt(b*b + s*s);
  float F = s*(2.0*s*s + 3.0*b*b)/(2.0*r*r*r);
  return (1.0 - F)*(1.0/b + 15.0*PI/(32.0*b*b));
}
vec3 bendToward(vec3 d, vec3 perp, float ang){
  float L = length(perp); if(L < 1e-4) return d;
  return normalize(d*cos(ang) - perp/L*sin(ang));
}
float jetR(float ay){ return 0.45 + 0.30*pow(ay, 0.72); }
vec3 jetEmission(vec3 p, vec3 rayDir){
  float ay = abs(p.y);
  if(ay < 0.8 || ay > JET_LEN) return vec3(0.0);
  float R = jetR(ay);
  float rho2 = dot(p.xz, p.xz);
  if(rho2 > R*R*2.6) return vec3(0.0);
  float q = sqrt(rho2)/R, sgn = sign(p.y);
  float spine  = exp(-q*q*6.0)*0.85;
  float sheath = exp(-q*q*1.5)*0.55;
  float n  = vnoise3(vec3(p.x*1.6, p.y*0.45 - uTime*1.1*sgn, p.z*1.6) + 3.7);
  float n2 = 0.5 + 0.5*sin(p.y*2.3 - uTime*3.1*sgn + n*6.0);          // cheap second scale of knots
  float helix = 0.72 + 0.28*cos(atan(p.z, p.x) - ay*0.9 + uTime*1.3*sgn);
  float mottle = (0.30 + 1.15*n + 0.65*n2)*helix;
  float fade = smoothstep(0.8, 2.2, ay)*pow(1.0 + ay/7.0, -1.6);
  float dens = (spine + sheath)*mottle*fade;
  float cosT = -sgn*rayDir.y;
  const float bj = 0.62; float gj = inversesqrt(1.0 - bj*bj);
  float D = 1.0/(gj*(1.0 - bj*cosT));
  vec3 c = mix(vec3(0.40, 0.58, 1.0), vec3(0.85, 0.92, 1.0), spine);
  return c*dens*pow(D, 2.5)*uJets;
}
vec3 jetStraight(vec3 p0, vec3 d, float s0, float s1){
  if(uJets <= 0.0) return vec3(0.0);
  vec2 o = p0.xz, dd = d.xz;
  float A = dot(dd, dd), B = 2.0*dot(o, dd), C = dot(o, o) - JET_RMAX*JET_RMAX;
  float sa, sb;
  if(A < 1e-6){ if(C > 0.0) return vec3(0.0); sa = -1e9; sb = 1e9; }
  else { float disc = B*B - 4.0*A*C; if(disc <= 0.0) return vec3(0.0); float sq = sqrt(disc); sa = (-B - sq)/(2.0*A); sb = (-B + sq)/(2.0*A); }
  if(abs(d.y) > 1e-6){ float ya = (-JET_LEN - p0.y)/d.y, yb = (JET_LEN - p0.y)/d.y; sa = max(sa, min(ya, yb)); sb = min(sb, max(ya, yb)); }
  else if(abs(p0.y) > JET_LEN) return vec3(0.0);
  sa = max(sa, s0); sb = min(sb, s1);
  if(sb <= sa) return vec3(0.0);
  const int N = 12;
  float ds = (sb - sa)/float(N);
  vec3 acc = vec3(0.0);
  for(int i=0; i<N; i++) acc += jetEmission(p0 + d*(sa + (float(i)+0.5)*ds), d);
  return acc*ds;
}
// THE HALO — hot, tenuous plasma of the inner flow between the disk's inner edge and the
// shadow: a puffy shell around r ≈ 2.8 r_s, fading out toward the horizon. Its light is
// gathered along the same curved geodesics, so rays that swing round the hole near the
// photon sphere run a long way through it and pile up into a bright, continuous PHOTON
// RING hugging the shadow — brighter on the approaching side (Doppler), swirling and
// flickering with rotating turbulence. Bloom turns it into the glowing halo.
vec3 haloEmission(vec3 p, vec3 rayDir){
  float r = length(p);
  float dens = exp(-pow((r-2.95)/0.55, 2.0))*smoothstep(2.0, 2.7, r)*exp(-pow(p.y/(0.85*r), 2.0));
  if(dens < 1e-4) return vec3(0.0);
  float ang = uSpin*uDiskTime*0.55, cs = cos(ang), sn = sin(ang);              // the turbulence swirls with the flow
  vec3 q = vec3(p.x*cs - p.z*sn, p.y, p.x*sn + p.z*cs);
  float n = vnoise3(q*1.7 + vec3(0.0, uDiskTime*0.35, 0.0));                   // big uneven lobes, never a clean ring
  float n2 = vnoise3(q*4.5 + vec3(uDiskTime*0.2, 0.0, uDiskTime*0.5));
  dens *= 0.35 + 1.0*n + 0.5*n2;
  vec3 tangent = uSpin*normalize(vec3(-p.z, 0.0, p.x));                        // fast inner flow → Doppler
  const float beta = 0.45; float gamma = inversesqrt(1.0 - beta*beta);
  float D = 1.0/(gamma*(1.0 + beta*dot(tangent, rayDir)));
  float g = D*sqrt(max(1.0 - 1.0/r, 0.0));
  return blackbody(7600.0*g)*pow(g, 2.0)*dens*uHalo;
}
void diskSample(vec3 pos, vec3 rayDir, out vec3 emis, out float alpha){
  float r = length(pos.xz);
  float inner = smoothstep(uDiskIn-0.45, uDiskIn+0.30, r);
  float outer = 1.0 - smoothstep(uDiskOut-4.5, uDiskOut, r);
  float env = inner*outer;
  if(env <= 0.002){ emis = vec3(0.0); alpha = 0.0; return; }
  float phi = atan(pos.z, pos.x);
  float om    = uSpin*sqrt(0.5/(r*r*r))*ROT;
  float omRef = uSpin*sqrt(0.5/216.0)*ROT;
  const float P = 16.0;
  float ta = mod(uDiskTime, P) - 0.5*P,        wa = 0.5 - 0.5*cos(TAU*uDiskTime/P);
  float tb = mod(uDiskTime + 0.5*P, P) - 0.5*P, wb = 1.0 - wa;
  float base = phi - omRef*uDiskTime;
  const float N0 = 4.0;
  float y = log(r)*6.5;
  float na = fbmDisk(fract((base - (om-omRef)*ta)/TAU)*N0, y, N0, 0.0);
  float nb = fbmDisk(fract((base - (om-omRef)*tb)/TAU)*N0, y, N0, 101.0);
  float n = 0.5 + (na*wa + nb*wb - 0.5)/sqrt(wa*wa + wb*wb);
  float arms = pow(0.5 + 0.5*cos(2.0*(base + uSpin*3.2*log(r/uDiskIn))), 3.0);
  float fil = smoothstep(0.40 + 0.14*(1.0-arms), 0.74, n);
  float dens = env*(0.10 + 0.90*fil)*(0.30 + 1.0*arms);
  float tau = dens*mix(3.6, 0.8, smoothstep(uDiskIn, uDiskOut, r));
  alpha = 1.0 - exp(-tau);
  float x = min(uDiskIn/r, 0.985);
  float T = uTpeak*pow(x, 0.75)*(0.55 + 0.45*clamp((1.0 - sqrt(x))*4.0, 0.0, 1.0));
  vec3 tangent = uSpin*normalize(vec3(-pos.z, 0.0, pos.x));
  float beta = min(sqrt(0.5/max(r-1.0, 0.6)), 0.75);
  float gamma = inversesqrt(1.0 - beta*beta);
  vec3 nhat = -normalize(rayDir);
  float D = 1.0/(gamma*(1.0 - beta*dot(tangent, nhat)));
  float ggrav = sqrt(max(1.0 - 1.0/r, 0.0));
  float g = D*ggrav;
  emis = blackbody(T*g)*pow(T/8000.0, 3.0)*pow(g, 2.5)*(0.70 + 0.80*arms)*uBoost;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - uHolePx)/uRes.y*2.0;             // off-axis: the hole is at uHolePx
  // the ray is built in the fixed camera/sky frame, then rotated INTO the hole's frame
  vec3 d = uHoleRot*normalize(uCamFwd + uTanHalf*(uv.x*uCamRight + uv.y*uCamUp));
  vec3 p = uHoleRot*uCamPos;
  vec3 col = vec3(0.0); float acc = 0.0;
  float pd = dot(p, d);
  vec3 perp = p - pd*d; float b2 = dot(perp, perp);
  if(dot(p, p) >= R_BOUND*R_BOUND){
    if(b2 >= R_BOUND*R_BOUND || pd > 0.0){
      col += jetStraight(p, d, 0.0, 1e9);
      vec3 dd = bendToward(d, perp, residualBend(sqrt(b2), pd));
      fragColor = vec4(enc(col + sky(uHoleRotT*dd)), 1.0); return;
    }
    float sEntry = -pd - sqrt(R_BOUND*R_BOUND - b2);
    col += jetStraight(p, d, 0.0, sEntry);
    p += d*sEntry;
  }
  vec3 v = d;
  vec3 hv = cross(p, v); float h2 = dot(hv, hv);
  bool captured = false, escaped = false;
  vec3 halo = vec3(0.0);
  for(int i=0; i<uSteps; i++){
    float r2 = dot(p, p), r = sqrt(r2);
    if(r < 1.0){ captured = true; break; }
    if(r > R_BOUND && dot(p, v) > 0.0){ escaped = true; break; }
    float vl = length(v);
    float step = clamp(r*0.07, 0.025, 0.4);
    float dt = step/vl;
    if(uJets > 0.0 && abs(p.y) > 0.8 && dot(p.xz, p.xz) < JET_RMAX*JET_RMAX)
      col += (1.0-acc)*jetEmission(p, v/vl)*step;
    if(uHalo > 0.0 && r < 4.6) halo += (1.0-acc)*haloEmission(p, v/vl)*step;
    v += -1.5*h2*p/(r2*r2*r)*dt;
    vec3 pn = p + v*dt;
    if((p.y > 0.0) != (pn.y > 0.0)){
      float t = p.y/(p.y - pn.y);
      vec3 hit = mix(p, pn, t);
      float rh = length(hit.xz);
      if(rh > uDiskIn-0.5 && rh < uDiskOut){
        vec3 e; float al;
        diskSample(hit, v, e, al);
        col += (1.0-acc)*al*e;
        acc += (1.0-acc)*al;
        if(acc > 0.985) break;
      }
    }
    p = pn;
  }
  col += halo;   // rays just inside the shadow's edge still wrap partway round through the plasma → the edge blurs, the centre stays dark
  if(!captured && acc <= 0.985){
    float r = length(p);
    if(escaped || r > 2.5){
      vec3 vn = normalize(v);
      float s = dot(p, vn);
      vec3 perp2 = p - s*vn;
      if(escaped) col += (1.0-acc)*jetStraight(p, vn, 0.0, 1e9);
      if(escaped) vn = bendToward(vn, perp2, residualBend(max(length(perp2), 0.5), s));
      col += (1.0-acc)*sky(uHoleRotT*vn);
    }
  }
  fragColor = vec4(enc(col), 1.0);
}`;

const PART_VS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec3 aHead;
layout(location=2) in vec3 aTail;
layout(location=3) in vec4 aInfo;
uniform vec3 uCamPos, uCamFwd, uCamRight, uCamUp;
uniform mat3 uHoleRotT;                 // hole→world: the grains live in the hole's frame
uniform float uTanHalf; uniform vec2 uRes, uHolePx;
out vec2 vP; out float vLen, vW, vBright, vHeat;
vec2 lensProject(vec3 P, out float vis){
  vis = 1.0;
  P = uHoleRotT*P;
  vec3 w = P - uCamPos; float z = dot(w, uCamFwd);
  if(z < 0.25){ vis = 0.0; return vec2(0.0); }
  vec2 s = vec2(dot(w, uCamRight), dot(w, uCamUp))/z;
  vec3 w0 = -uCamPos; float z0 = dot(w0, uCamFwd);
  vec2 h = vec2(dot(w0, uCamRight), dot(w0, uCamUp))/z0;
  float Dl = length(uCamPos), Ds = length(w), Dls = Ds - Dl;
  vec2 bv = s - h; float beta = max(length(bv), 1e-5);
  float b = beta*Dl;
  if(Dls > 0.05){
    float tE2 = 2.0*Dls/(Dl*Ds);
    float th = 0.5*(beta + sqrt(beta*beta + 4.0*tE2));
    vis *= clamp(th/beta, 1.0, 2.5);
    b = th*Dl;
  }
  float behind = smoothstep(-0.5, 1.0, Dls);
  b = max(b, 2.7*behind);
  vis *= mix(1.0, smoothstep(2.35, 2.65, b), smoothstep(0.0, 0.8, Dls));
  vec2 sN = h + bv/beta*(b/Dl);
  vec2 px = uHolePx + sN/uTanHalf*uRes.y*0.5;                   // off-axis: same mapping as the scene pass
  return px/uRes*2.0 - 1.0;
}
void main(){
  float visH, visT;
  vec2 H = lensProject(aHead, visH), Tl = lensProject(aTail, visT);
  if(visH <= 0.0){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vP = vec2(0.0); vLen = 0.0; vW = 1.0; vBright = 0.0; vHeat = 0.0; return; }
  if(visT <= 0.0) Tl = H;
  vec2 hp = H*uRes*0.5, tp = Tl*uRes*0.5;
  vec2 dpx = hp - tp; float len0 = length(dpx);
  float len = min(len0, 60.0);
  vec2 ax = len0 > 1e-3 ? dpx/len0 : vec2(1.0, 0.0);
  vec2 ay = vec2(-ax.y, ax.x);
  float w = aInfo.x;
  vec2 c = hp - ax*len*0.5;
  vec2 pos = c + ax*aCorner.x*(len*0.5 + 2.0*w) + ay*aCorner.y*2.0*w;
  gl_Position = vec4(pos/(uRes*0.5), 0.0, 1.0);
  vP = vec2(aCorner.x*(len*0.5 + 2.0*w), aCorner.y*2.0*w);
  vLen = len*0.5; vW = w; vBright = aInfo.y*visH; vHeat = aInfo.z;
}`;
const PART_FS=`#version 300 es
precision highp float;
in vec2 vP; in float vLen, vW, vBright, vHeat;
out vec4 o;
void main(){
  float x = clamp(vP.x, -vLen, vLen);
  float d = length(vP - vec2(x, 0.0));
  float sig = vW*0.5;
  float I = exp(-d*d/(2.0*sig*sig));
  float t = (vP.x + vLen)/max(2.0*vLen, 1e-3);
  I *= mix(0.10, 1.0, smoothstep(0.0, 1.0, t));
  vec3 c = mix(vec3(0.70, 0.80, 1.0), vec3(1.0, 0.72, 0.42), vHeat);
  c = mix(c, vec3(1.0, 0.97, 0.90), smoothstep(0.75, 1.0, vHeat));
  o = vec4(c*I*vBright, 1.0);
}`;
const BRIGHT_FS=`#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThr, uEnc;
vec3 dec(vec3 c){ return uEnc < 1.0 ? c*c/uEnc : c; }
vec3 enc(vec3 c){ return uEnc < 1.0 ? sqrt(max(c, 0.0)*uEnc) : c; }
void main(){
  vec3 c = dec(texture(uTex, vUv + uTexel*vec2(-1.0,-1.0)).rgb) + dec(texture(uTex, vUv + uTexel*vec2(1.0,-1.0)).rgb)
         + dec(texture(uTex, vUv + uTexel*vec2(-1.0, 1.0)).rgb) + dec(texture(uTex, vUv + uTexel*vec2(1.0, 1.0)).rgb);
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = max(l - uThr, 0.0)/max(l, 1e-4);
  o = vec4(enc(c*k), 1.0);
}`;
const DOWN_FS=`#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uTexel;
void main(){
  o = 0.25*(texture(uTex, vUv + uTexel*vec2(-1.0,-1.0)) + texture(uTex, vUv + uTexel*vec2(1.0,-1.0))
          + texture(uTex, vUv + uTexel*vec2(-1.0, 1.0)) + texture(uTex, vUv + uTexel*vec2(1.0, 1.0)));
}`;
const BLUR_FS=`#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uDir;
void main(){
  float w[5] = float[5](0.2270270270, 0.1945945946, 0.1216216216, 0.0540540541, 0.0162162162);
  vec3 c = texture(uTex, vUv).rgb*w[0];
  for(int i=1; i<5; i++){ c += texture(uTex, vUv + uDir*float(i)).rgb*w[i]; c += texture(uTex, vUv - uDir*float(i)).rgb*w[i]; }
  o = vec4(c, 1.0);
}`;
// composite: HDR scene + bloom → ACES → sRGB, then the old scene's deep-space
// gradient + faint nebulae are screened underneath as a backdrop (sRGB space)
const COMP_FS=`#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uScene, uB1, uB2, uB3;
uniform float uEnc, uExposure, uBloom, uTime;
uniform vec2 uRes;
vec3 aces(vec3 x){ return clamp((x*(2.51*x + 0.03))/(x*(2.43*x + 0.59) + 0.14), 0.0, 1.0); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
vec3 dec(vec3 c){ return uEnc < 1.0 ? c*c/uEnc : c; }
vec3 nebula(vec2 px, vec2 c, float rad, vec3 col, float a){
  float d = distance(px, c)/rad;
  float w = d < 0.6 ? mix(a, a*0.45, d/0.6) : mix(a*0.45, 0.0, clamp((d-0.6)/0.4, 0.0, 1.0));
  return col*w;
}
void main(){
  vec3 c = dec(texture(uScene, vUv).rgb);
  vec3 b = dec(texture(uB1, vUv).rgb)*0.35 + dec(texture(uB2, vUv).rgb)*0.5 + dec(texture(uB3, vUv).rgb)*0.7;
  c = (c + b*uBloom)*uExposure;
  c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 1.12);
  c = aces(c);
  c = pow(c, vec3(1.0/2.2));
  float g = (vUv.x + (1.0 - vUv.y))*0.5;
  vec3 bg = g < 0.35 ? mix(vec3(4.,3.,12.), vec3(8.,6.,26.), g/0.35)
          : g < 0.6  ? mix(vec3(8.,6.,26.), vec3(10.,8.,31.), (g-0.35)/0.25)
                     : mix(vec3(10.,8.,31.), vec3(6.,3.,16.), (g-0.6)/0.4);
  bg /= 255.0;
  vec2 px = vec2(vUv.x, 1.0 - vUv.y)*uRes; float m = min(uRes.x, uRes.y);
  bg += nebula(px, uRes*vec2(.20,.30), m*.42, vec3(90.,50.,160.)/255., .06);
  bg += nebula(px, uRes*vec2(.45,.75), m*.38, vec3(40.,80.,170.)/255., .05);
  bg += nebula(px, uRes*vec2(.85,.18), m*.34, vec3(160.,50.,130.)/255., .045);
  bg += nebula(px, uRes*vec2(.70,.60), m*.50, vec3(50.,40.,120.)/255., .04);
  c = c + bg*(1.0 - c);
  c += (hash(vUv*uRes + fract(uTime)) - 0.5)/255.0;
  o = vec4(c, 1.0);
}`;

/* ═══════════════════════════════════════════════════════════════════════════
   THE MODULE
   ═══════════════════════════════════════════════════════════════════════════ */
const M3={
  ident:()=>[1,0,0,0,1,0,0,0,1],                                             // column-major (GLSL order)
  mul:(A,B)=>{const C=new Array(9);for(let c=0;c<3;c++)for(let r=0;r<3;r++)C[c*3+r]=A[r]*B[c*3]+A[3+r]*B[c*3+1]+A[6+r]*B[c*3+2];return C;},
  transpose:A=>[A[0],A[3],A[6],A[1],A[4],A[7],A[2],A[5],A[8]],
  apply:(A,v)=>[A[0]*v[0]+A[3]*v[1]+A[6]*v[2],A[1]*v[0]+A[4]*v[1]+A[7]*v[2],A[2]*v[0]+A[5]*v[1]+A[8]*v[2]],
  axis:(u,ang)=>{const c=Math.cos(ang),s=Math.sin(ang),t=1-c,[x,y,z]=u;
    return[t*x*x+c,t*x*y+s*z,t*x*z-s*y,t*x*y-s*z,t*y*y+c,t*y*z+s*x,t*x*z+s*y,t*y*z-s*x,t*z*z+c];},
};
window.BACKGROUNDS=window.BACKGROUNDS||{};
window.BACKGROUNDS.space2={
  skin:'space',                 // game look:  game/skins/space.skin.css
  aids:'space',                 // aid art:    aids/space.aids.js (rocket + stars)
  init({stage}){
  const layer=stage;
  let stopped=false;
  layer.innerHTML='';layer.style.overflow='hidden';
  const DPR=Math.min(devicePixelRatio||1,2),TAU=Math.PI*2,DEG=Math.PI/180;
  let W=innerWidth,H=innerHeight;

  // ── the sky (bottom): WebGL2 when available, else a still painted sky ──
  const glcv=document.createElement('canvas');
  glcv.style.cssText='position:fixed;inset:0;width:100%;height:100%';
  const gl=glcv.getContext('webgl2',{antialias:false,alpha:false,depth:false,stencil:false,powerPreference:'high-performance'});
  const NOGL=!gl;                     // no WebGL2 → paintStillSky() owns this canvas
  const skyCtx=NOGL?glcv.getContext('2d'):null;
  layer.appendChild(glcv);
  const cv=document.createElement('canvas');
  cv.style.cssText='position:fixed;inset:0;width:100%;height:100%';
  layer.appendChild(cv);
  const ctx=cv.getContext('2d');

  // Discovery bubble — click a sky object to learn about it (Hebrew + niqqud)
  let factEl=document.getElementById('gxy-fact');
  if(!factEl){factEl=document.createElement('div');factEl.id='gxy-fact';document.body.appendChild(factEl);}
  factEl.style.cssText='position:fixed;z-index:60;max-width:280px;direction:rtl;text-align:right;'+
    'background:rgba(14,12,40,.92);border:1px solid rgba(150,170,255,.45);border-radius:14px;'+
    'padding:10px 14px;color:#EAF0FF;font-size:15px;line-height:1.55;pointer-events:none;'+
    'opacity:0;transition:opacity .3s;box-shadow:0 6px 24px rgba(4,2,16,.6)';
  let factTimer=null;
  function lg(c,x1,y1,x2,y2,st){const g=c.createLinearGradient(x1,y1,x2,y2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function rg(c,x,y,r1,r2,st){const g=c.createRadialGradient(x,y,r1,x,y,r2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function makeLayer(){const c=document.createElement('canvas');c.width=W*DPR;c.height=H*DPR;const x=c.getContext('2d');x.setTransform(DPR,0,0,DPR,0,0);return{cv:c,cx:x};}
  let STARS_FAR,STARS_NEAR,GALAXIES,COMETS,PLANET,EARTH,TRAVELERS,BH,SUN,TIDAL;
  let spaceLayer,vigLayer,granTile=null,nova=null,nextNovaAt=25+Math.random()*35,lastT=0;
  let bhFrenzyT=null;   // click on the black hole → short feeding frenzy
  let ASTRO=null;       // click on the black hole → an astronaut spirals in
  let SURGE=0;          // the frenzy's 0..1 envelope — boosts bhPull + the GL disk/jets/dust each frame
  let sunFlareT=null,sunFlareAng=0,nextSunFlareAt=null;   // limb-flare schedule

  /* ═════════════════════════ GL: the black hole & the lensed sky ═══════════ */
  // adaptive quality: start LOW, climb while the frame time allows, drop when it doesn't
  const GLQS=[{name:'low',scale:.42,steps:130},{name:'medium',scale:.62,steps:200},{name:'high',scale:.82,steps:280}];
  const AUTO_QUALITY=true;                     // false → stays at GLQS[0] (low)
  let qIdx=0,emaMs=16,lastQChange=0,downshiftAt=-1e9;
  const TAN_HALF=0.25;                         // narrow fov: the hole is far & small, the off-axis view stays sane
  const DISK_IN=3.0,DISK_OUT=12.0,SPIN=-1.0,T_PEAK=9800,JET_GAIN=0.5,HALO_GAIN=0.11;
  const CAM_EL=0.28;                           // camera ~16° above the hole's rest plane
  const HOLE_TILT=0.25;                        // the hole's axis leans this much → it precesses on a cone ("spinning")
  const SPIN_RATE=0.16;                        // rad/s of precession — one wobble in ~40 s
  let HDR=!NOGL&&!!(gl.getExtension('EXT_color_buffer_float')||gl.getExtension('EXT_color_buffer_half_float'));
  let ENC=HDR?1.0:0.125;
  let glLost=NOGL,P=null,T=null,vao=null,pVao=null,instBuf=null,RW=1,RH=1;
  let camPos=[0,0,1],camFwd=[0,0,-1],camRight=[1,0,0],camUp=[0,1,0],camD=60,galN=[0,1,0],galCore=[0,0,-1],holePx=[0,0];
  let diskTime=0,phi=0;
  const Ruser=M3.axis([1,0,0],HOLE_TILT);
  let Rh2w=M3.ident(),Rw2h=M3.ident();
  function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('space2 shader: '+gl.getShaderInfoLog(s));return s;}
  function program(fs,vs){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs||VS));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('space2 link: '+gl.getProgramInfoLog(p));
    const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name]=gl.getUniformLocation(p,inf.name);}return{p,u};}
  function makeTarget(w,h){
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if(HDR)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return{tex,fb,w,h,ok};
  }
  function freeTarget(t){if(!t)return;gl.deleteTexture(t.tex);gl.deleteFramebuffer(t.fb);}
  const NP=600;
  const INST=new Float32Array(NP*10);
  function setupGL(){
    P={scene:program(SCENE_FS),part:program(PART_FS,PART_VS),bright:program(BRIGHT_FS),down:program(DOWN_FS),blur:program(BLUR_FS),comp:program(COMP_FS)};
    vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    pVao=gl.createVertexArray();gl.bindVertexArray(pVao);
    const cb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cb);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    instBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,instBuf);
    gl.bufferData(gl.ARRAY_BUFFER,INST.byteLength,gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,40,0);gl.vertexAttribDivisor(1,1);
    gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,40,12);gl.vertexAttribDivisor(2,1);
    gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.FLOAT,false,40,24);gl.vertexAttribDivisor(3,1);
    gl.bindVertexArray(vao);
    T=null;buildTargets();
  }
  function buildTargets(){
    if(T)Object.values(T).forEach(freeTarget);
    const s=GLQS[qIdx].scale*Math.min(DPR,1.5);
    RW=Math.max(160,Math.round(W*s));RH=Math.max(90,Math.round(H*s));
    glcv.width=RW;glcv.height=RH;                          // the GL canvas IS the internal resolution (CSS upscales)
    const mk=div=>makeTarget(Math.max(8,Math.round(RW/div)),Math.max(8,Math.round(RH/div)));
    T={scene:mk(1),b1a:mk(2),b1b:mk(2),b2a:mk(4),b2b:mk(4),b3a:mk(8),b3b:mk(8)};
    if(!Object.values(T).every(t=>t.ok)){if(HDR){HDR=false;ENC=0.125;buildTargets();return;}}
    if(BH)holePx=[BH.x/W*RW,(1-BH.y/H)*RH];
  }
  // direction of a 2-D screen point (CSS px, y down) on this camera's off-axis rays
  function screenDir(fx,fy){
    const sx=TAN_HALF*(fx-BH.x)/(H/2),sy=TAN_HALF*(BH.y-fy)/(H/2);
    const v=[camFwd[0]+camRight[0]*sx+camUp[0]*sy,camFwd[1]+camRight[1]*sx+camUp[1]*sy,camFwd[2]+camRight[2]*sx+camUp[2]*sy];
    const l=Math.hypot(...v);return[v[0]/l,v[1]/l,v[2]/l];
  }
  // camera: fixed, ~16° above the hole's rest plane, far enough that the shadow's
  // apparent radius equals BH.r CSS px; projection shifted so the hole sits at BH.x/BH.y
  function updateCamera(){
    camD=2.598*H/(2*TAN_HALF*BH.r);                        // shadow radius b=3√3/2 r_s → BH.r px
    camPos=[0,camD*Math.sin(CAM_EL),camD*Math.cos(CAM_EL)];
    const l=Math.hypot(...camPos);camFwd=[-camPos[0]/l,-camPos[1]/l,-camPos[2]/l];
    const r=[-camFwd[2],0,camFwd[0]];                                        // fwd × (0,1,0)
    const rl=Math.hypot(...r);camRight=[r[0]/rl,r[1]/rl,r[2]/rl];
    camUp=[camRight[1]*camFwd[2]-camRight[2]*camFwd[1],camRight[2]*camFwd[0]-camRight[0]*camFwd[2],camRight[0]*camFwd[1]-camRight[1]*camFwd[0]];
    holePx=[BH.x/W*RW,(1-BH.y/H)*RH];
    // the Milky Way: a great circle through the frame's centre rising to the right
    // (paintSpace's −0.5 rad band), its core bulge on the band toward the lower left
    const th=0.5,C=[W/2,H/2],L=Math.min(W,H)*.6;
    const dC=screenDir(C[0],C[1]),d2=screenDir(C[0]+Math.cos(th)*L,C[1]-Math.sin(th)*L);
    const g=[dC[1]*d2[2]-dC[2]*d2[1],dC[2]*d2[0]-dC[0]*d2[2],dC[0]*d2[1]-dC[1]*d2[0]];
    const gL=Math.hypot(...g);galN=[g[0]/gL,g[1]/gL,g[2]/gL];
    galCore=screenDir(C[0]-Math.cos(th)*W*.30,C[1]+Math.sin(th)*W*.30);
  }
  // 2-D screen (CSS px, y down) → WORLD point at depth z along the view axis
  function screenToWorld(fx,fy,z){
    const sx=TAN_HALF*(fx-BH.x)/(H/2),sy=TAN_HALF*(BH.y-fy)/(H/2);
    return[camPos[0]+(camFwd[0]+camRight[0]*sx+camUp[0]*sy)*z,camPos[1]+(camFwd[1]+camRight[1]*sx+camUp[1]*sy)*z,camPos[2]+(camFwd[2]+camRight[2]*sx+camUp[2]*sy)*z];
  }
  function worldToScreen(x,y,z){
    const wx=x-camPos[0],wy=y-camPos[1],wz=z-camPos[2];
    const dz=wx*camFwd[0]+wy*camFwd[1]+wz*camFwd[2];
    if(dz<1)return null;
    const sx=(wx*camRight[0]+wy*camRight[1]+wz*camRight[2])/dz/TAN_HALF,sy=(wx*camUp[0]+wy*camUp[1]+wz*camUp[2])/dz/TAN_HALF;
    return{x:BH.x+sx*(H/2),y:BH.y-sy*(H/2),dz};
  }

  /* ── the dust: grains all over the frame, drawn into the hole by its gravity ──
     3-D sim in the HOLE's frame (r_s units, c=1, M=½) under the Paczyński–Wiita
     pseudo-potential −M/(r−r_s): anything wandering inside ~3 r_s plunges.
     Sub-circular orbits biased to the disk's spin + a weak drag → ever-faster
     spirals in, heating from cool grain to white-hot ember, fading at the
     horizon. A click surge kicks every grain inward and multiplies the drag.   */
  const TS=5.0,DRAG=0.028,TAIL=0.35;
  const PS=new Float32Array(NP*8);   // x y z · vx vy vz · seed · age
  let dustInit=false,dustSurgeT=null;
  const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  function spawnGrain(i,edge){
    const o=i*8;
    for(let tries=0;tries<8;tries++){
      let fx,fy;
      if(edge){const side=(Math.random()*4)|0,u=Math.random()*1.2-.1;
        if(side===0){fx=-.08;fy=u;}else if(side===1){fx=1.08;fy=u;}else if(side===2){fx=u;fy=-.08;}else{fx=u;fy=1.08;}}
      else{fx=Math.random()*1.2-.1;fy=Math.random()*1.2-.1;}
      const z=camD+(Math.random()*2-1)*22;                 // around the hole's depth
      const p=M3.apply(Rw2h,screenToWorld(fx*W,fy*H,z));   // → the hole's frame
      const r=Math.hypot(p[0],p[1],p[2]);
      if(r<4||r>60)continue;
      let nx=Math.random()*2-1,ny=Math.random()*2-1,nz=Math.random()*2-1;
      let nl=Math.hypot(nx,ny,nz)||1;nx=nx/nl*.35;ny=ny/nl*.35-SPIN*.65;nz=nz/nl*.35;
      nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
      const rx=p[0]/r,ry=p[1]/r,rz=p[2]/r;
      let tx=ny*rz-nz*ry,ty=nz*rx-nx*rz,tz=nx*ry-ny*rx;
      const tl=Math.hypot(tx,ty,tz)||1;tx/=tl;ty/=tl;tz/=tl;
      const vc=Math.sqrt(.5/r),f=vc*(.5+.42*Math.random());
      PS[o]=p[0];PS[o+1]=p[1];PS[o+2]=p[2];
      PS[o+3]=tx*f-rx*vc*.05+(Math.random()-.5)*vc*.08;
      PS[o+4]=ty*f-ry*vc*.05+(Math.random()-.5)*vc*.08;
      PS[o+5]=tz*f-rz*vc*.05+(Math.random()-.5)*vc*.08;
      PS[o+6]=Math.random();PS[o+7]=0;
      return;
    }
    PS[o]=90;PS[o+1]=90;PS[o+2]=90;PS[o+3]=PS[o+4]=PS[o+5]=0;PS[o+6]=Math.random();PS[o+7]=0;
  }
  function dustSurge(){                                     // the click: everything gets yanked in
    dustSurgeT=lastT;
    for(let i=0;i<NP;i++){
      const o=i*8,r=Math.hypot(PS[o],PS[o+1],PS[o+2]);
      if(r<5)continue;
      const k=(.12+.10*Math.random())/r;
      PS[o+3]-=PS[o]*k;PS[o+4]-=PS[o+1]*k;PS[o+5]-=PS[o+2]*k;
    }
  }
  function updateDust(dt){
    if(!dustInit){for(let i=0;i<NP;i++)spawnGrain(i,false);dustInit=true;}
    const surge=dustSurgeT==null?0:Math.max(0,1-(lastT-dustSurgeT)/3.5);
    const drag=DRAG*(1+9*surge),hSim=dt*TS;
    for(let i=0;i<NP;i++){
      const o=i*8;
      let x=PS[o],y=PS[o+1],z=PS[o+2],vx=PS[o+3],vy=PS[o+4],vz=PS[o+5];
      let r=Math.hypot(x,y,z),dead=false;
      const sub=r<3?6:r<7?3:1,h=hSim/sub;
      for(let s=0;s<sub;s++){
        r=Math.hypot(x,y,z);
        if(r<1.06){dead=true;break;}
        const rm=Math.max(r-1,.15),a=-.5/(rm*rm)/r;
        vx+=a*x*h;vy+=a*y*h;vz+=a*z*h;
        const dr=1-drag*h;vx*=dr;vy*=dr;vz*=dr;
        const sp=Math.hypot(vx,vy,vz);if(sp>.95){const k=.95/sp;vx*=k;vy*=k;vz*=k;}
        x+=vx*h;y+=vy*h;z+=vz*h;
      }
      PS[o+7]+=dt;
      if(!dead){
        const pw=M3.apply(Rh2w,[x,y,z]),sc=worldToScreen(pw[0],pw[1],pw[2]);
        if(!sc)dead=r>4;
        else if((sc.x<-.3*W||sc.x>1.3*W||sc.y<-.3*H||sc.y>1.3*H)&&r>5)dead=true;
        if(r>70)dead=true;
      }
      if(dead){spawnGrain(i,true);continue;}
      PS[o]=x;PS[o+1]=y;PS[o+2]=z;PS[o+3]=vx;PS[o+4]=vy;PS[o+5]=vz;
    }
    for(let i=0;i<NP;i++){
      const o=i*8,q=i*10;
      const x=PS[o],y=PS[o+1],z=PS[o+2],r=Math.hypot(x,y,z);
      const pw=M3.apply(Rh2w,[x,y,z]);
      const wx=pw[0]-camPos[0],wy=pw[1]-camPos[1],wz=pw[2]-camPos[2];
      const dz=Math.max(1,wx*camFwd[0]+wy*camFwd[1]+wz*camFwd[2]);
      const heat=Math.min(1,Math.max(0,(7-r)/5.5));
      const fade=sstep(1.06,1.5,r);
      const distF=Math.min(1.6,Math.max(.3,Math.pow(camD/dz,.9)));
      const seed=PS[o+6],tail=TAIL+.9*heat;
      INST[q]=x;INST[q+1]=y;INST[q+2]=z;
      INST[q+3]=x-PS[o+3]*tail;INST[q+4]=y-PS[o+4]*tail;INST[q+5]=z-PS[o+5]*tail;
      INST[q+6]=(.8+1.6*heat)*(.6+.8*seed)*Math.min(1.6,Math.max(.6,Math.sqrt(camD/dz)));
      INST[q+7]=(.12+1.5*heat*heat)*(.6+.8*seed)*fade*distF*(1+surge*.8);
      INST[q+8]=heat;INST[q+9]=0;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,instBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,INST);
  }
  function drawPass(prog,target){
    gl.bindFramebuffer(gl.FRAMEBUFFER,target?target.fb:null);
    gl.viewport(0,0,target?target.w:RW,target?target.h:RH);
    gl.useProgram(prog.p);gl.drawArrays(gl.TRIANGLES,0,3);
  }
  function bindTex(unit,tex,loc){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(loc,unit);}
  function adaptQuality(dt,now){
    if(glLost)return;                                      // no GL (or a lost context): never rebuild targets
    emaMs=emaMs*.92+dt*1000*.08;
    if(!AUTO_QUALITY||now-lastQChange<3000)return;
    if(emaMs>27&&qIdx>0){qIdx--;lastQChange=now;downshiftAt=now;buildTargets();}
    else if(emaMs<11&&qIdx<GLQS.length-1&&now-downshiftAt>30000&&now-lastQChange>6000){qIdx++;lastQChange=now;buildTargets();}
  }
  function renderGL(t,dt){
    if(glLost||!P)return;
    const fz=SURGE;                                          // the click frenzy: disk spins up + flares, jets brighten
    diskTime+=dt*(1+1.5*fz);
    phi+=SPIN_RATE*dt;                                       // the hole precesses — its angle keeps changing
    Rh2w=M3.mul(M3.axis([0,1,0],phi),M3.mul(Ruser,M3.axis([0,1,0],-phi)));
    Rw2h=M3.transpose(Rh2w);
    const S=P.scene.u;
    gl.useProgram(P.scene.p);
    gl.uniform2f(S.uRes,T.scene.w,T.scene.h);gl.uniform2f(S.uHolePx,holePx[0],holePx[1]);
    gl.uniform1f(S.uTime,t);gl.uniform1f(S.uDiskTime,diskTime);
    gl.uniform3fv(S.uCamPos,camPos);gl.uniform3fv(S.uCamFwd,camFwd);gl.uniform3fv(S.uCamRight,camRight);gl.uniform3fv(S.uCamUp,camUp);
    gl.uniform3fv(S.uGalN,galN);gl.uniform3fv(S.uGalCore,galCore);
    gl.uniformMatrix3fv(S.uHoleRot,false,Rw2h);gl.uniformMatrix3fv(S.uHoleRotT,false,Rh2w);
    gl.uniform1f(S.uTanHalf,TAN_HALF);gl.uniform1f(S.uPixAng,2*TAN_HALF/T.scene.h);
    gl.uniform1i(S.uSteps,GLQS[qIdx].steps);
    gl.uniform1f(S.uDiskIn,DISK_IN);gl.uniform1f(S.uDiskOut,DISK_OUT);gl.uniform1f(S.uSpin,SPIN);gl.uniform1f(S.uTpeak,T_PEAK);
    gl.uniform1f(S.uJets,JET_GAIN*(1+fz));gl.uniform1f(S.uBoost,1+.8*fz);gl.uniform1f(S.uHalo,HALO_GAIN*(1+1.2*fz));gl.uniform1f(S.uEnc,ENC);
    drawPass(P.scene,T.scene);
    // the dust, added into the same HDR target (so it blooms too)
    updateDust(dt);
    const U=P.part.u;
    gl.useProgram(P.part.p);
    gl.uniform3fv(U.uCamPos,camPos);gl.uniform3fv(U.uCamFwd,camFwd);gl.uniform3fv(U.uCamRight,camRight);gl.uniform3fv(U.uCamUp,camUp);
    gl.uniformMatrix3fv(U.uHoleRotT,false,Rh2w);
    gl.uniform1f(U.uTanHalf,TAN_HALF);gl.uniform2f(U.uRes,T.scene.w,T.scene.h);gl.uniform2f(U.uHolePx,holePx[0],holePx[1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,T.scene.fb);gl.viewport(0,0,T.scene.w,T.scene.h);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
    gl.bindVertexArray(pVao);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,NP);gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    // bloom chain
    const B=P.bright.u;
    gl.useProgram(P.bright.p);bindTex(0,T.scene.tex,B.uTex);
    gl.uniform2f(B.uTexel,.5/T.scene.w,.5/T.scene.h);gl.uniform1f(B.uThr,1.0);gl.uniform1f(B.uEnc,ENC);
    drawPass(P.bright,T.b1a);
    const blur=(src,dst,dx,dy)=>{gl.useProgram(P.blur.p);bindTex(0,src.tex,P.blur.u.uTex);gl.uniform2f(P.blur.u.uDir,dx/src.w,dy/src.h);drawPass(P.blur,dst);};
    const down=(src,dst)=>{gl.useProgram(P.down.p);bindTex(0,src.tex,P.down.u.uTex);gl.uniform2f(P.down.u.uTexel,.5/src.w,.5/src.h);drawPass(P.down,dst);};
    blur(T.b1a,T.b1b,1.2,0);blur(T.b1b,T.b1a,0,1.2);
    down(T.b1a,T.b2a);blur(T.b2a,T.b2b,1.3,0);blur(T.b2b,T.b2a,0,1.3);
    down(T.b2a,T.b3a);blur(T.b3a,T.b3b,1.5,0);blur(T.b3b,T.b3a,0,1.5);
    // composite to the canvas
    const C=P.comp.u;
    gl.useProgram(P.comp.p);
    bindTex(0,T.scene.tex,C.uScene);bindTex(1,T.b1a.tex,C.uB1);bindTex(2,T.b2a.tex,C.uB2);bindTex(3,T.b3a.tex,C.uB3);
    gl.uniform1f(C.uEnc,ENC);gl.uniform1f(C.uExposure,1.2);gl.uniform1f(C.uBloom,.55);gl.uniform1f(C.uTime,t);gl.uniform2f(C.uRes,RW,RH);
    drawPass(P.comp,null);
  }
  /* ── the WebGL2-less sky: one still paint per layout, same canvas as the GL
     sky. The gradient and the four nebulae are the composite shader's backdrop
     in 2-D; the Milky Way is a soft band on the shader's −0.5 rad diagonal;
     the hole is a plain shadow + photon ring + tilted disk glow (no lensing).
     The 2-D world above (planets, galaxies, comets, clicks) is untouched. */
  function paintStillSky(){
    if(!skyCtx||!BH)return;
    const c=skyCtx,m=Math.min(W,H);
    glcv.width=Math.round(W*DPR);glcv.height=Math.round(H*DPR);
    c.setTransform(DPR,0,0,DPR,0,0);
    c.clearRect(0,0,W,H);
    // the diagonal deep-space gradient: g=(x+(1-y))/2 over three stops
    const gd=c.createLinearGradient(0,H,W,0);
    gd.addColorStop(0,'rgb(4,3,12)');gd.addColorStop(.35,'rgb(8,6,26)');
    gd.addColorStop(.6,'rgb(10,8,31)');gd.addColorStop(1,'rgb(6,3,16)');
    c.fillStyle=gd;c.fillRect(0,0,W,H);
    // the Milky Way band, rising to the right, core bulge toward the lower left
    c.save();c.translate(W/2,H/2);c.rotate(-.5);
    const mw=c.createLinearGradient(0,-m*.30,0,m*.30);
    mw.addColorStop(0,'rgba(120,130,190,0)');mw.addColorStop(.5,'rgba(150,160,215,.10)');
    mw.addColorStop(1,'rgba(120,130,190,0)');
    c.fillStyle=mw;c.fillRect(-W,-m*.30,W*2,m*.60);
    c.fillStyle=rg(c,-W*.30,m*.05,0,m*.34,[[0,'rgba(255,225,170,.13)'],[1,'rgba(255,225,170,0)']]);
    c.beginPath();c.arc(-W*.30,m*.05,m*.34,0,TAU);c.fill();
    c.restore();
    // the four nebulae (shader positions, radii and tints)
    for(const[fx,fy,rad,col,a]of[[.20,.30,.42,'90,50,160',.30],[.45,.75,.38,'40,80,170',.26],
                                 [.85,.18,.34,'160,50,130',.24],[.70,.60,.50,'50,40,120',.22]]){
      const x=W*fx,y=H*fy,r=m*rad;
      c.fillStyle=rg(c,x,y,0,r,[[0,'rgba('+col+','+a+')'],[.6,'rgba('+col+','+(a*.45).toFixed(3)+')'],[1,'rgba('+col+',0)']]);
      c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
    }
    // a sprinkle of faint far stars (the bright ones live on the 2-D layer)
    for(let i=0;i<220;i++){
      const h=Math.abs(Math.sin(i*127.1)*43758.545)%1,h2=Math.abs(Math.sin(i*311.7)*24634.6)%1,h3=Math.abs(Math.sin(i*74.7)*9871.3)%1;
      const x=h*W,y=h2*H;
      if(Math.hypot(x-BH.x,y-BH.y)<BH.rE)continue;          // nothing appears inside the Einstein radius
      c.fillStyle='rgba(255,252,244,'+(.18+h3*.5).toFixed(3)+')';
      c.beginPath();c.arc(x,y,.5+h3*1.1,0,TAU);c.fill();
    }
    // the hole: tilted disk glow behind, shadow, photon ring
    const R=BH.r;
    c.save();c.translate(BH.x,BH.y);c.rotate(-BH.tilt);
    c.fillStyle=rg(c,0,0,R*1.1,R*3.4,[[0,'rgba(255,190,110,.30)'],[.45,'rgba(255,140,60,.14)'],[1,'rgba(255,120,40,0)']]);
    c.beginPath();c.ellipse(0,0,R*3.4,R*1.15,0,0,TAU);c.fill();
    c.restore();
    c.fillStyle='#000000';c.beginPath();c.arc(BH.x,BH.y,R,0,TAU);c.fill();
    c.strokeStyle='rgba(255,214,150,.85)';c.lineWidth=Math.max(1.4,R*.055);
    c.beginPath();c.arc(BH.x,BH.y,R*1.035,0,TAU);c.stroke();
    c.fillStyle=rg(c,BH.x,BH.y,R,R*1.9,[[0,'rgba(255,210,150,.35)'],[1,'rgba(255,190,120,0)']]);
    c.beginPath();c.arc(BH.x,BH.y,R*1.9,0,TAU);c.fill();
  }
  const onLost=e=>{e.preventDefault();glLost=true;};
  const onRestored=()=>{try{setupGL();updateCamera();glLost=false;}catch(err){console.error(err);}};
  glcv.addEventListener('webglcontextlost',onLost);
  glcv.addEventListener('webglcontextrestored',onRestored);
  if(!NOGL){try{setupGL();}catch(err){console.error(err);glLost=true;}}

  /* ═════════════════════════ 2-D: everything else ══════════════════════════ */
  // Constellations — real figures a child can find in the night sky
  const CONSTELLATIONS=[
    {name:'הַדֻּבָּה הַגְּדוֹלָה',cx:.40,cy:.13,s:.15,
     fact:'שִׁבְעָה כּוֹכָבִים בְּצוּרַת מַצֶּקֶת. הִיא עוֹזֶרֶת לִמְצֹא אֶת כּוֹכַב הַצָּפוֹן!',
     pts:[[0,.10],[.15,.04],[.30,.08],[.44,.14],[.46,.34],[.66,.36],[.64,.12]],
     lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]]},
    {name:'אוֹרִיוֹן',cx:.66,cy:.07,s:.13,
     fact:'אוֹרִיוֹן הַצַּיָּד — שְׁלוֹשֶׁת כּוֹכְבֵי הַחֲגוֹרָה שֶׁלּוֹ מְפֻרְסָמִים בְּכָל הָעוֹלָם.',
     pts:[[.15,0],[.55,.02],[.28,.30],[.36,.33],[.44,.36],[.12,.62],[.58,.60]],
     lines:[[0,1],[0,2],[1,4],[2,3],[3,4],[2,5],[4,6]]},
    {name:'קַסְיוֹפֵּאָה',cx:.05,cy:.10,s:.11,
     fact:'חֲמִשָּׁה כּוֹכָבִים בְּצוּרַת הָאוֹת W — קַל מְאוֹד לְזַהוֹת אוֹתָהּ בַּשָּׁמַיִם.',
     pts:[[0,.30],[.20,.05],[.42,.25],[.62,0],[.85,.18]],
     lines:[[0,1],[1,2],[2,3],[3,4]]},
  ];
  // Earth orbiters: the Moon + two satellites on inclined elliptical orbits
  const EARTH_ORBITERS=[
    {kind:'moon',spd:.22,phase:0.0,rx:2.35,ry:.60,size:.27},
    {kind:'sat', spd:.60,phase:2.1,rx:1.75,ry:.50,size:.30},
    {kind:'sat', spd:.85,phase:4.6,rx:1.45,ry:.40,size:.24},
  ];
  // EARTH — simplified real coastlines in [lon, lat] degrees, drawn on an orthographic globe
  const CONTINENTS=[
    {kind:'land',pts:[[-17,15],[-10,5],[8,4],[10,-1],[13,-8],[17,-29],[20,-35],[30,-31],[35,-25],[41,-11],[51,11],[43,12],[39,17],[33,30],[25,32],[10,37],[-6,36],[-17,21]]},
    {kind:'land',pts:[[-9,37],[-9,43],[-2,48],[2,51],[8,54],[12,56],[5,58],[5,62],[15,68],[28,71],[40,68],[44,66],[60,69],[70,73],[90,75],[110,73],[130,71],[150,70],[170,69],[180,65],[170,60],[163,56],[156,58],[142,53],[135,44],[127,38],[122,30],[117,23],[108,21],[109,12],[104,10],[100,13],[103,1],[98,8],[94,16],[90,22],[80,15],[80,8],[73,18],[68,23],[66,25],[57,25],[58,22],[55,17],[45,13],[43,15],[39,21],[35,28],[36,36],[27,41],[23,38],[16,40],[13,45],[3,43],[-2,37]]},
    {kind:'land',pts:[[-165,64],[-155,71],[-130,70],[-110,73],[-85,70],[-78,62],[-65,60],[-55,52],[-65,45],[-70,42],[-75,36],[-81,31],[-80,25],[-83,29],[-90,29],[-97,27],[-97,20],[-90,21],[-87,16],[-83,9],[-79,8],[-85,12],[-92,15],[-105,20],[-110,24],[-114,30],[-117,33],[-124,40],[-124,48],[-132,55],[-140,60],[-152,58],[-165,58]]},
    {kind:'land',pts:[[-79,8],[-72,12],[-63,10],[-52,5],[-45,-2],[-35,-8],[-39,-15],[-41,-22],[-48,-26],[-54,-34],[-62,-39],[-65,-45],[-68,-52],[-70,-55],[-74,-50],[-72,-40],[-71,-30],[-70,-18],[-76,-14],[-81,-6],[-80,0],[-77,4]]},
    {kind:'land',pts:[[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-19],[153,-27],[151,-34],[146,-39],[140,-37],[131,-31],[124,-33],[116,-35],[114,-30]]},
    {kind:'land',pts:[[44,-12],[50,-15],[47,-25],[44,-22]]},
    {kind:'land',pts:[[130,31],[135,35],[141,40],[142,45],[140,43],[137,36],[131,33]]},
    {kind:'land',pts:[[-5,50],[1,51],[-1,55],[-3,58],[-6,56],[-5,53]]},
    {kind:'land',pts:[[109,1],[117,7],[119,1],[116,-4],[110,-3]]},
    {kind:'land',pts:[[95,5],[104,-3],[106,-6],[101,0]]},
    {kind:'land',pts:[[131,-1],[141,-3],[150,-10],[140,-9],[134,-4]]},
    {kind:'land',pts:[[166,-46],[174,-41],[178,-38],[173,-35],[172,-40],[168,-44]]},
    {kind:'desert',pts:[[-12,18],[0,20],[15,20],[30,20],[33,30],[25,32],[10,35],[-5,33],[-14,26]]},
    {kind:'desert',pts:[[40,20],[48,17],[55,20],[57,25],[48,29],[40,28],[37,23]]},
    {kind:'desert',pts:[[118,-22],[128,-19],[136,-22],[140,-30],[128,-32],[118,-29]]},
    {kind:'ice',pts:[[-45,60],[-53,67],[-56,72],[-60,77],[-40,83],[-20,82],[-22,75],[-25,70],[-40,65]]},
    {kind:'ice',pts:Array.from({length:24},(_,i)=>[i*15-180,-70+3*Math.sin(i*1.7)])},
  ];
  const CLOUDS=Array.from({length:14},(_,i)=>({lon:i*26+Math.random()*20,lat:(Math.random()-.5)*110,len:22+Math.random()*40,curl:(Math.random()-.5)*.5,w:.05+Math.random()*.06,a:.35+Math.random()*.35}));
  const SAT_BANDS=[[-1,-.84,'#b9a98a'],[-.84,-.72,'#d6c49b'],[-.72,-.61,'#c4a673'],[-.61,-.5,'#e3d1a1'],[-.5,-.41,'#ceb281'],[-.41,-.3,'#e8d6a6'],
    [-.3,-.2,'#d2b487'],[-.2,-.08,'#ebdaad'],[-.08,.06,'#c9a878'],[.06,.2,'#e5d09f'],[.2,.32,'#d0b283'],[.32,.45,'#e9d7a8'],
    [.45,.58,'#c8a97a'],[.58,.72,'#dcc493'],[.72,.86,'#c3ab7e'],[.86,1,'#b7a07a']];
  // PASSING WORLDS — the rest of the solar system drifts across the sky, one or two at a
  // time (size = radius / min(W,H); spd = relative drift speed — near, small worlds move faster)
  const WORLDS=[
    {id:'mercury',name:'חַמָּה',size:.024,spd:1.3,
     fact:'הַכּוֹכָב הַקָּרוֹב בְּיוֹתֵר לַשֶּׁמֶשׁ — בַּיּוֹם חַם בּוֹ כְּמוֹ תַּנּוּר, וּבַלַּיְלָה קַר נוֹרָא. שָׁנָה שְׁלֵמָה בּוֹ נִמְשֶׁכֶת רַק 88 יָמִים!'},
    {id:'venus',name:'נֹגַהּ',size:.031,spd:1.0,
     fact:'הַכּוֹכָב הַבֹּהֵק בַּשָּׁמַיִם אַחֲרֵי הַיָּרֵחַ. הוּא עָטוּף בַּעֲנָנִים סְמִיכִים, וְחַם בּוֹ יוֹתֵר מֵאֲשֶׁר בְּתַנּוּר!'},
    {id:'mars',name:'מַאְדִּים',size:.026,spd:1.15,
     fact:'הַכּוֹכָב הָאָדֹם — הָאָבָק שֶׁלּוֹ מָלֵא חֲלוּדָה. יֵשׁ בּוֹ אֶת הָהָר הַגָּבוֹהַ בְּיוֹתֵר בְּמַעֲרֶכֶת הַשֶּׁמֶשׁ!'},
    {id:'jupiter',name:'צֶדֶק',size:.088,spd:.55,
     fact:'הַגָּדוֹל מִכָּל כּוֹכְבֵי הַלֶּכֶת — כָּל הָאֲחֵרִים יְכוֹלִים לְהִכָּנֵס בְּתוֹכוֹ. הַכֶּתֶם הָאָדֹם שֶׁלּוֹ הוּא סְעָרָה גְּדוֹלָה מִכַּדּוּר הָאָרֶץ!'},
    {id:'uranus',name:'אוּרָנוּס',size:.042,spd:.7,
     fact:'כּוֹכָב לֶכֶת כָּחֹל-יָרֹק וְקַר מְאוֹד, שֶׁמִּסְתּוֹבֵב עַל הַצַּד — כְּמוֹ כַּדּוּר שֶׁמִּתְגַּלְגֵּל!'},
    {id:'neptune',name:'נֶפְּטוּן',size:.040,spd:.7,
     fact:'הַכּוֹכָב הָרָחוֹק בְּיוֹתֵר מֵהַשֶּׁמֶשׁ — כָּחֹל עָמֹק, וְהָרוּחוֹת בּוֹ הֵן הַמְּהִירוֹת בְּיוֹתֵר בְּמַעֲרֶכֶת הַשֶּׁמֶשׁ.'},
    {id:'pluto',name:'פְּלוּטוֹ',size:.018,spd:.9,
     fact:'כּוֹכָב לֶכֶת נַנָּסִי, קָטָן וְקָפוּא, רָחוֹק-רָחוֹק. יֵשׁ עָלָיו כֶּתֶם בָּהִיר בְּצוּרַת לֵב!'},
    {id:'asteroid',name:'אַסְטֵרוֹאִיד',size:.015,spd:1.6,
     fact:'סֶלַע גָּדוֹל שֶׁמַּקִּיף אֶת הַשֶּׁמֶשׁ. רֹב הָאַסְטֵרוֹאִידִים חַיִּים בַּחֲגוֹרָה שֶׁבֵּין מַאְדִּים לְצֶדֶק.'},
  ];
  const JUP_BANDS=[[-1,-.85,'#c8b294'],[-.85,-.68,'#e9dcc0'],[-.68,-.55,'#b07a55'],[-.55,-.42,'#f1e6cf'],[-.42,-.3,'#c48a60'],[-.3,-.16,'#efe2c8'],[-.16,-.02,'#b57c58'],
    [-.02,.12,'#f3e9d4'],[.12,.26,'#c99468'],[.26,.4,'#e9dcc0'],[.4,.55,'#a86e4c'],[.55,.7,'#e5d6b8'],[.7,.85,'#bf9a78'],[.85,1,'#c7b394']];
  const JUP_MOONS=[{k:1.45,spd:1.9,sz:.045,col:'#e8d27a'},{k:1.85,spd:1.2,sz:.04,col:'#f2efe6'},{k:2.35,spd:.75,sz:.06,col:'#c9b89a'},{k:3.0,spd:.45,sz:.05,col:'#8a7a6a'}];   // Io · Europa · Ganymede · Callisto
  let PASSERS=[],passQueue=[],nextPassAt=6;
  const passStats={spawned:0,swallowed:0,exited:0};   // for the harness/tests
  // ── surface maps: one 256×128 texture per world, painted once (x = longitude, y linear in
  //    sin(latitude) so the orthographic strips below map straight onto it; row 0 = north)
  const WORLD_TEX={};
  function makeWorldTexture(id){
    const TW=256,TH=128,c=document.createElement('canvas');c.width=TW;c.height=TH;const g=c.getContext('2d');
    const rnd=(a,b)=>a+Math.random()*(b-a);
    const dot=(x,y,r,fill)=>{g.fillStyle=fill;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
      if(x<r){g.beginPath();g.arc(x+TW,y,r,0,TAU);g.fill();}if(x>TW-r){g.beginPath();g.arc(x-TW,y,r,0,TAU);g.fill();}};
    const mottle=(n,col,a0,a1,r0,r1)=>{for(let i=0;i<n;i++)dot(Math.random()*TW,Math.random()*TH,rnd(r0,r1),`rgba(${col},${rnd(a0,a1)})`);};
    const bands=(list,wob)=>{for(const[y0,y1,col]of list){g.fillStyle=col;g.beginPath();
      for(let x=0;x<=TW;x+=4){const yy=(y0+1)/2*TH+wob*(Math.sin(x*.11+y0*7)+.5*Math.sin(x*.29+y0*3))*TH*.012;x?g.lineTo(x,yy):g.moveTo(x,yy);}
      for(let x=TW;x>=0;x-=4){const yy=(y1+1)/2*TH+wob*(Math.sin(x*.13+y1*5+1.7)+.5*Math.sin(x*.23+y1*2))*TH*.012;g.lineTo(x,yy);}
      g.closePath();g.fill();}};
    const crater=(x,y,r,d)=>{dot(x,y,r,`rgba(0,0,0,${.30*d})`);                       // floor
      g.fillStyle=`rgba(255,255,255,${.20*d})`;g.beginPath();g.arc(x,y,r*.92,Math.PI*1.08,Math.PI*1.92);g.lineTo(x,y);g.fill();   // lit inner wall (Sun below)
      g.strokeStyle=`rgba(255,255,255,${.30*d})`;g.lineWidth=Math.max(.6,r*.16);g.beginPath();g.arc(x,y,r,Math.PI*.12,Math.PI*.88);g.stroke();   // lit rim
      g.strokeStyle=`rgba(0,0,0,${.25*d})`;g.beginPath();g.arc(x,y,r,Math.PI*1.12,Math.PI*1.88);g.stroke();
      if(r>5)dot(x,y,r*.16,`rgba(255,255,255,${.22*d})`);};                            // central peak
    const cap=(north,h,col)=>{const gr=g.createLinearGradient(0,north?0:TH,0,north?h:TH-h);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,north?0:TH-h,TW,h);};
    const stroke=(pts,col,w)=>{g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.beginPath();pts.forEach((p,i)=>i?g.quadraticCurveTo(pts[i-1][0]+(p[0]-pts[i-1][0])*.5+rnd(-6,6),pts[i-1][1]+(p[1]-pts[i-1][1])*.5+rnd(-5,5),p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();};
    switch(id){
      case 'mercury':
        g.fillStyle='#8f8b85';g.fillRect(0,0,TW,TH);
        mottle(500,'0,0,0',.05,.16,2,10);mottle(350,'255,255,255',.04,.11,2,8);
        for(let i=0;i<3;i++)dot(rnd(0,TW),rnd(30,100),rnd(16,24),'rgba(120,115,108,.55)');     // basins
        for(let i=0;i<60;i++)crater(rnd(0,TW),rnd(4,TH-4),rnd(1.5,5),rnd(.5,1));
        for(let i=0;i<9;i++)crater(rnd(0,TW),rnd(10,TH-10),rnd(6,12),1);
        break;
      case 'venus':
        g.fillStyle='#e7cf96';g.fillRect(0,0,TW,TH);
        bands([[-1,-.55,'rgba(255,243,210,.55)'],[-.55,-.15,'rgba(214,180,120,.35)'],[-.15,.2,'rgba(255,238,200,.4)'],[.2,.6,'rgba(210,172,110,.35)'],[.6,1,'rgba(255,243,210,.5)']],1.5);
        for(let i=0;i<14;i++){const x0=rnd(0,TW),y0=rnd(30,98),dir=Math.random()<.5?-1:1;               // the Y-shaped cloud swirls
          stroke([[x0,y0],[x0+dir*30,y0+rnd(-14,14)],[x0+dir*62,y0+rnd(-30,30)],[x0+dir*90,y0+rnd(-42,42)]],`rgba(255,250,232,${rnd(.28,.5)})`,rnd(4,9));}
        for(let i=0;i<8;i++)stroke([[rnd(0,TW),rnd(20,108)],[rnd(0,TW),rnd(20,108)]],`rgba(190,150,90,${rnd(.15,.3)})`,rnd(3,6));
        break;
      case 'mars':
        g.fillStyle='#c9673a';g.fillRect(0,0,TW,TH);
        mottle(600,'80,30,12',.05,.2,2,11);mottle(350,'255,200,150',.04,.12,2,9);
        for(const[x,y,rx,ry]of[[60,70,34,14],[150,58,26,12],[212,80,22,10],[110,92,18,8],[20,50,16,9]])   // dark plains (Syrtis Major, Acidalia…)
        {g.fillStyle='rgba(58,26,16,.55)';g.beginPath();g.ellipse(x,y,rx,ry,rnd(-.4,.4),0,TAU);g.fill();}
        stroke([[70,66],[100,64],[130,67]],'rgba(45,18,10,.7)',3.5);                                   // Valles Marineris
        dot(178,52,7,'rgba(230,150,110,.6)');dot(178,52,3,'rgba(120,50,30,.6)');                        // Olympus Mons
        cap(true,16,'rgba(255,255,255,.95)');cap(false,11,'rgba(255,255,255,.9)');
        break;
      case 'jupiter':
        g.fillStyle='#e9dcc0';g.fillRect(0,0,TW,TH);
        bands(JUP_BANDS,1);
        for(let i=0;i<7;i++)stroke([[rnd(0,TW),58],[rnd(0,TW),66],[rnd(0,TW),72]],'rgba(80,95,130,.3)',rnd(2,4));   // blue-grey festoons across the equatorial zone
        g.fillStyle='rgba(255,252,244,.55)';for(let i=0;i<5;i++){g.beginPath();g.ellipse(rnd(0,TW),rnd(20,108),rnd(3,6),rnd(1.5,3),0,0,TAU);g.fill();}   // white ovals
        {const gx=150,gy=(1+.34)/2*TH;                                                                    // the Great Red Spot + its wake
         g.fillStyle='rgba(196,84,58,.92)';g.beginPath();g.ellipse(gx,gy,22,9,0,0,TAU);g.fill();
         g.fillStyle='rgba(232,140,105,.6)';g.beginPath();g.ellipse(gx,gy,15,6,0,0,TAU);g.fill();
         g.fillStyle='rgba(150,60,40,.5)';g.beginPath();g.ellipse(gx,gy,8,3.5,0,0,TAU);g.fill();
         stroke([[gx+24,gy-6],[gx+42,gy-3],[gx+62,gy-7]],'rgba(255,248,235,.45)',3);stroke([[gx+24,gy+6],[gx+40,gy+8],[gx+58,gy+5]],'rgba(255,248,235,.35)',2.5);}
        break;
      case 'uranus':
        g.fillStyle='#a6dbe3';g.fillRect(0,0,TW,TH);
        bands([[-1,-.7,'rgba(230,250,252,.45)'],[-.7,-.35,'rgba(150,205,215,.3)'],[-.35,.1,'rgba(200,240,244,.25)'],[.1,.55,'rgba(140,198,210,.3)'],[.55,1,'rgba(225,248,250,.35)']],.6);
        mottle(120,'255,255,255',.03,.08,6,16);
        break;
      case 'neptune':
        g.fillStyle='#3a60d4';g.fillRect(0,0,TW,TH);
        bands([[-1,-.6,'rgba(90,130,240,.35)'],[-.6,-.25,'rgba(25,45,140,.35)'],[-.25,.15,'rgba(70,110,230,.3)'],[.15,.5,'rgba(20,38,130,.45)'],[.5,1,'rgba(60,95,215,.3)']],1);
        g.fillStyle='rgba(10,18,85,.75)';g.beginPath();g.ellipse(92,82,20,9,0,0,TAU);g.fill();g.fillStyle='rgba(30,45,130,.6)';g.beginPath();g.ellipse(92,82,12,5,0,0,TAU);g.fill();   // Great Dark Spot
        for(let i=0;i<6;i++)stroke([[rnd(0,TW),rnd(24,104)],[rnd(0,TW),rnd(24,104)]].map((p,k)=>[p[0]+k*rnd(20,45),p[1]]),`rgba(255,255,255,${rnd(.45,.8)})`,rnd(1.5,3));   // bright cirrus streaks
        break;
      case 'pluto':
        g.fillStyle='#cbb094';g.fillRect(0,0,TW,TH);
        mottle(400,'80,50,35',.05,.18,2,9);mottle(250,'255,240,220',.04,.12,2,8);
        g.fillStyle='rgba(72,42,30,.65)';g.beginPath();g.ellipse(70,66,46,15,0,0,TAU);g.fill();       // Cthulhu Macula
        {const hx=175,hy=62,s=20;g.fillStyle='rgba(248,242,230,.95)';                                  // Tombaugh Regio, the heart
         g.beginPath();g.arc(hx-s*.5,hy-s*.35,s*.52,0,TAU);g.arc(hx+s*.5,hy-s*.35,s*.52,0,TAU);g.fill();
         g.beginPath();g.moveTo(hx-s*.98,hy-s*.15);g.lineTo(hx+s*.98,hy-s*.15);g.lineTo(hx,hy+s*.95);g.closePath();g.fill();
         g.fillStyle='rgba(200,180,160,.5)';g.beginPath();g.ellipse(hx+s*.45,hy,s*.35,s*.5,0,0,TAU);g.fill();}   // its darker eastern lobe
        for(let i=0;i<14;i++)crater(rnd(0,TW),rnd(6,TH-6),rnd(1.5,4),.7);
        cap(true,8,'rgba(255,250,240,.6)');
        break;
    }
    return c;
  }
  // an orthographic sphere from its equirectangular(-ish) map: N longitude strips over the
  // visible hemisphere, each a thin drawImage; the caller has clipped to the disc
  function drawTexturedSphere(tex,x,y,r,ry,rot){
    const N=36,TW=tex.width,TH=tex.height,sw=TW/(2*N);
    for(let i=0;i<N;i++){
      const l0=-Math.PI/2+i*Math.PI/N,l1=l0+Math.PI/N;
      const dx0=Math.sin(l0)*r,dw=Math.sin(l1)*r-dx0+.7;
      let u=((l0+rot)/TAU)%1;if(u<0)u+=1;
      const sx=u*TW;
      if(sx+sw<=TW)ctx.drawImage(tex,sx,0,sw,TH,x+dx0,y-ry,dw,ry*2);
      else{const w1=TW-sx,f=w1/sw;ctx.drawImage(tex,sx,0,w1,TH,x+dx0,y-ry,dw*f,ry*2);ctx.drawImage(tex,0,0,sw-w1,TH,x+dx0+dw*f,y-ry,dw*(1-f),ry*2);}
    }
  }

  function buildScene(){
    // The black hole — tucked near the right border so the game form won't cover it.
    // BH.r is the SHADOW radius (b = 3√3/2 r_s in the GL render) — the same size as before,
    // so click targets, bhPull's swallow radius and the 2-D lens keep their geometry.
    BH={x:W*.90,y:H*.36,r:Math.min(W,H)*.075,tilt:.42};
    BH.rE=BH.r*1.35;   // Einstein radius for the 2-D stars — nothing APPEARS inside it
    {const sunR=Math.min(W,H)*.95;SUN={x:W*.55,y:H+sunR-H*.11,r:sunR,spots:[[-.22,.985],[-.05,.975],[.17,.99]]};}
    STARS_FAR=Array.from({length:150},()=>({x:Math.random()*W,y:Math.random()*H,r:.3+Math.random()*.8,tw:Math.random()*TAU,spd:.4+Math.random()*1.4,hue:Math.random()}));
    STARS_NEAR=Array.from({length:38},()=>({x:Math.random()*W,y:Math.random()*H,r:1.0+Math.random()*1.6,tw:Math.random()*TAU,spd:.5+Math.random()*1.6,hue:Math.random(),spikes:Math.random()<.35}));
    GALAXIES=[
      {x:W*.12,y:H*.54,scale:Math.min(W,H)*.10, tilt:.50,ang:.6, spin:.018, arms:2,hueA:'180, 200, 255',hueB:'255, 210, 235'},
      {x:W*.84,y:H*.78,scale:Math.min(W,H)*.075,tilt:.36,ang:2.1,spin:-.024,arms:2,hueA:'200, 185, 255',hueB:'170, 225, 255'},
      {x:W*.30,y:H*.80,scale:Math.min(W,H)*.055,tilt:.60,ang:4.0,spin:.030, arms:3,hueA:'255, 220, 190',hueB:'200, 200, 255'},
    ];
    for(const g of GALAXIES){
      g.x2=0;g.boostT=null;
      g.stars=Array.from({length:130},()=>{
        const arm=Math.floor(Math.random()*g.arms);
        const d=.18+Math.pow(Math.random(),.7)*.85;
        const theta=arm*TAU/g.arms+d*3.4+(Math.random()-.5)*(.35+d*.4);
        return{d,theta,r:.5+Math.random()*1.1,a:.25+Math.random()*.6};
      });
    }
    TIDAL=[];
    COMETS=Array.from({length:3},()=>spawnComet(true));
    PLANET={
      x:W*.17,y:H*.22,r:Math.min(W,H)*.136,
      rocks:Array.from({length:48},()=>{
        const k=1.3+Math.random()*.95;
        return{ang:Math.random()*TAU,k,spd:.55*Math.pow(1.62/k,1.5),size:.7+Math.random()*1.3,hue:Math.random()};
      }),
    };
    PLANET.boostT=null;PLANET.x2=0;
    EARTH={
      x:W*.16,y:H*.74,r:Math.min(W,H)*.052,
      x2:0,boostT:null,
      cities:Array.from({length:26},()=>{
        const a=Math.random()*TAU,d=Math.sqrt(Math.random())*.88;
        return[Math.cos(a)*d,Math.sin(a)*d,Math.random()*TAU];
      }),
    };
    TRAVELERS=Array.from({length:18},()=>spawnTraveler(true));
    PASSERS=[];passQueue=[];nextPassAt=lastT+6;
    // Saturn and Earth roam (only the Sun and the hole stay put): start at their classic
    // spots, hold a moment, then drift off along a slow curved path and keep coming back
    PLANET.mv={margin:PLANET.r*2.45+12,speed:W/210,pause:[20,25],startAt:lastT+8+Math.random()*10};
    planPath(PLANET.mv,{x:PLANET.x,y:PLANET.y},-1);
    EARTH.mv={margin:EARTH.r*2.7+12,speed:W/140,pause:[15,25],startAt:lastT+14+Math.random()*12};
    planPath(EARTH.mv,{x:EARTH.x,y:EARTH.y},-1);
    nova=null;
    spaceLayer=makeLayer();vigLayer=makeLayer();
    paintConstellations(spaceLayer.cx);paintVignette(vigLayer.cx);
    granTile=makeGranulation();
    if(!glLost){buildTargets();dustInit=false;}
    updateCamera();                                        // pure math — also wanted without GL
    if(NOGL)paintStillSky();                               // repainted on every layout
  }
  function spawnTraveler(anywhere){
    const speed=.3+Math.random()*1.6;
    let x,y,ang;
    if(anywhere){x=Math.random()*W;y=Math.random()*H;ang=Math.random()*TAU;}
    else{
      const edge=Math.floor(Math.random()*4);
      if(edge===0){x=-10;y=Math.random()*H;ang=-Math.PI/3+Math.random()*(Math.PI*2/3);}
      else if(edge===1){x=W+10;y=Math.random()*H;ang=Math.PI*2/3+Math.random()*(Math.PI*2/3);}
      else if(edge===2){x=Math.random()*W;y=-10;ang=Math.PI/6+Math.random()*(Math.PI*2/3);}
      else{x=Math.random()*W;y=H+10;ang=-Math.PI*5/6+Math.random()*(Math.PI*2/3);}
    }
    return{x,y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,r:.8+Math.random()*1.6,hue:Math.random(),tw:Math.random()*TAU,spd:.6+Math.random()*1.8};
  }
  function spawnComet(anywhere){
    const fromLeft=Math.random()<.5;
    return{
      x:anywhere?Math.random()*W:(fromLeft?-60:W+60),
      y:Math.random()*H*.85,
      vx:(fromLeft?1:-1)*(2.2+Math.random()*2.6),
      vy:.4+Math.random()*.9,
      len:50+Math.random()*80,
      delay:anywhere?Math.random()*6:2+Math.random()*9,
    };
  }
  // Black-hole gravity on the 2-D movers: inside 7r the object is pulled toward BH.
  function bhPull(o,K){
    const dx=BH.x-o.x,dy=BH.y-o.y,d=Math.hypot(dx,dy);
    if(d<BH.r*1.02)return-1;
    if(d>=BH.r*7*(1+SURGE*1.2))return 1;
    const f=K*(1+SURGE*3)*(BH.r/d)*(BH.r/d);
    if(o.vx!==undefined){
      o.vx+=dx/d*f;o.vy+=dy/d*f;
      const cap=6*(1+SURGE);
      const sp=Math.hypot(o.vx,o.vy);
      if(sp>cap){o.vx*=cap/sp;o.vy*=cap/sp;}
    }else{o.x+=dx/d*f*2;o.y+=dy/d*f*2;}
    return Math.min(1,(d-BH.r)/(BH.r*.45));
  }
  function bodyPull(o,cx,cy,cr,K){
    const dx=cx-o.x,dy=cy-o.y,d=Math.hypot(dx,dy);
    if(d<cr||d>=cr*5)return;
    const f=K*(cr/d)*(cr/d);
    o.vx+=dx/d*f;o.vy+=dy/d*f;
  }
  function clickEnv(t0,t,dur){
    if(t0==null)return 0;
    const e=t-t0;
    if(e<0||e>dur)return 0;
    return e<.35?e/.35:1-(e-.35)/(dur-.35);
  }
  // 2-D point-mass lens for the canvas stars/travellers (weak field)
  function lensImage(ox,oy){
    const dx=ox-BH.x,dy=oy-BH.y,d=Math.hypot(dx,dy);
    if(d>=BH.r*7||d<.001)return{x:ox,y:oy,mag:1,gx:0,gy:0,ga:0};
    const nf=Math.min(1,Math.max(0,(d-BH.r*1.02)/(BH.r*1.3)));
    const rE=BH.rE*Math.sqrt(nf),root=Math.sqrt(d*d+4*rE*rE);
    const w=Math.min(1,(BH.r*7-d)/(BH.r*2));
    const s=1+((d+root)/(2*d)-1)*w;
    const mag=1+Math.min(1.6,(rE*rE)/(d*d))*w;
    const dS=(root-d)/2;
    const ga=dS>BH.r*1.05?Math.min(.55,(dS/((d+root)/2))*1.4)*w:0;
    return{x:BH.x+dx*s,y:BH.y+dy*s,mag,gx:BH.x-dx*(dS/d),gy:BH.y-dy*(dS/d),ga};
  }
  function lapExtra(o,t){
    if(o.lapT0==null)return 0;
    const p=(t-o.lapT0)/2.2;
    if(p>=1){o.lapT0=null;return 0;}
    return TAU*p*p*(3-2*p);
  }
  // the static 2-D layer: only the constellations (the sky itself is the GL layer)
  function paintConstellations(c){
    for(const cn of CONSTELLATIONS){
      const sc=Math.min(W,H)*cn.s;
      const Pn=cn.pts.map(([px,py])=>[W*cn.cx+px*sc,H*cn.cy+py*sc]);
      cn.hit={x:Pn.reduce((s,q)=>s+q[0],0)/Pn.length,y:Pn.reduce((s,q)=>s+q[1],0)/Pn.length,r:sc*.62};
      c.strokeStyle='rgba(150, 180, 255, 0.20)';
      c.lineWidth=1;
      for(const[a,b]of cn.lines){c.beginPath();c.moveTo(Pn[a][0],Pn[a][1]);c.lineTo(Pn[b][0],Pn[b][1]);c.stroke();}
      for(const[qx,qy]of Pn){
        c.fillStyle='rgba(225, 235, 255, 0.30)';
        c.beginPath();c.arc(qx,qy,3.4,0,TAU);c.fill();
        c.fillStyle='rgba(240, 246, 255, 0.95)';
        c.beginPath();c.arc(qx,qy,1.7,0,TAU);c.fill();
      }
    }
  }
  function paintVignette(c){
    c.fillStyle=rg(c,W/2,H*.5,Math.min(W,H)*.45,Math.max(W,H)*.8,[[0,'rgba(2, 1, 8, 0)'],[.7,'rgba(2, 1, 8, 0.18)'],[1,'rgba(2, 1, 8, 0.55)']]);
    c.fillRect(0,0,W,H);
  }
  // the Sun's granulation: a tile of bright cells with darker lanes, multiplied over the disc
  function makeGranulation(){
    const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
    g.fillStyle='#e6e6e6';g.fillRect(0,0,256,256);
    for(let i=0;i<420;i++){
      const x=Math.random()*256,y=Math.random()*256,r=4+Math.random()*6;
      g.fillStyle=`rgba(255,255,255,${.55+Math.random()*.45})`;
      g.beginPath();g.ellipse(x,y,r,r*(.7+Math.random()*.3),Math.random()*Math.PI,0,TAU);g.fill();
      // wrap the tile's edges
      if(x<12){g.beginPath();g.arc(x+256,y,r,0,TAU);g.fill();}if(x>244){g.beginPath();g.arc(x-256,y,r,0,TAU);g.fill();}
      if(y<12){g.beginPath();g.arc(x,y+256,r,0,TAU);g.fill();}if(y>244){g.beginPath();g.arc(x,y-256,r,0,TAU);g.fill();}
    }
    return c;
  }
  function starColor(hue,a){
    if(hue<.6)return`rgba(200, 215, 255, ${a})`;
    if(hue<.85)return`rgba(255, 244, 224, ${a})`;
    return`rgba(255, 200, 160, ${a})`;
  }
  function drawStars(t){
    for(const s of STARS_FAR){
      const g=bhPull(s,.5);
      if(g<0){s.x=Math.random()*W;s.y=Math.random()*H;continue;}
      const L=lensImage(s.x,s.y);
      const tw=.5+.5*Math.sin(t*s.spd+s.tw);
      ctx.fillStyle=starColor(s.hue,Math.min(1,(.2+tw*.5)*g*L.mag));
      ctx.beginPath();ctx.arc(L.x,L.y,s.r,0,TAU);ctx.fill();
      if(L.ga>0){ctx.fillStyle=starColor(s.hue,(.25+tw*.6)*L.ga);ctx.beginPath();ctx.arc(L.gx,L.gy,s.r*.8,0,TAU);ctx.fill();}
    }
    for(const s of STARS_NEAR){
      const g=bhPull(s,.5);
      if(g<0){s.x=Math.random()*W;s.y=Math.random()*H;continue;}
      const L=lensImage(s.x,s.y);
      const tw=.55+.45*Math.sin(t*s.spd+s.tw);
      const a=Math.min(1,(.35+tw*.55)*g*L.mag);
      ctx.fillStyle=starColor(s.hue,a*.16);
      ctx.beginPath();ctx.arc(L.x,L.y,s.r*3.0,0,TAU);ctx.fill();
      ctx.fillStyle=starColor(s.hue,a);
      ctx.beginPath();ctx.arc(L.x,L.y,s.r,0,TAU);ctx.fill();
      if(L.ga>0){ctx.fillStyle=starColor(s.hue,a*L.ga);ctx.beginPath();ctx.arc(L.gx,L.gy,s.r*.8,0,TAU);ctx.fill();}
      if(s.spikes){
        const len=s.r*(4+tw*3);
        ctx.strokeStyle=starColor(s.hue,a*.45);
        ctx.lineWidth=.8;
        ctx.beginPath();
        ctx.moveTo(L.x-len,L.y);ctx.lineTo(L.x+len,L.y);
        ctx.moveTo(L.x,L.y-len);ctx.lineTo(L.x,L.y+len);
        ctx.stroke();
      }
    }
  }
  function drawGalaxy(g,t,dt){
    const f=clickEnv(g.boostT,t,3);
    if(f>0)g.x2+=dt*g.spin*12*f;
    const B=1+f*.9;
    const rot=g.ang+t*g.spin+g.x2;
    ctx.save();
    ctx.translate(g.x,g.y);
    ctx.rotate(g.ang*.35);
    ctx.scale(1,g.tilt);
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=rg(ctx,0,0,0,g.scale*1.25,[[0,`rgba(${g.hueB}, ${.20*B})`],[.45,`rgba(${g.hueA}, ${.10*B})`],[1,`rgba(${g.hueA}, 0)`]]);
    ctx.beginPath();ctx.arc(0,0,g.scale*1.25,0,TAU);ctx.fill();
    for(let arm=0;arm<g.arms;arm++){
      for(let i=0;i<26;i++){
        const d=.16+(i/26)*.95;
        const theta=rot+arm*TAU/g.arms+d*3.4;
        ctx.fillStyle=`rgba(${g.hueA}, ${.10*B*(1-d*.75)})`;
        ctx.beginPath();
        ctx.arc(Math.cos(theta)*d*g.scale,Math.sin(theta)*d*g.scale,g.scale*.10*(1-d*.45),0,TAU);
        ctx.fill();
      }
    }
    for(const s of g.stars){
      const theta=s.theta+t*g.spin*(1.4-s.d*.5)+g.x2*(1.4-s.d*.5);
      ctx.fillStyle=`rgba(${g.hueB}, ${s.a*(1-s.d*.5)})`;
      ctx.beginPath();
      ctx.arc(Math.cos(theta)*s.d*g.scale,Math.sin(theta)*s.d*g.scale,s.r,0,TAU);
      ctx.fill();
    }
    ctx.fillStyle=rg(ctx,0,0,0,g.scale*.30,[[0,`rgba(255, 250, 235, ${Math.min(1,.85*B)})`],[.4,`rgba(${g.hueB}, ${Math.min(1,.40*B)})`],[1,`rgba(${g.hueB}, 0)`]]);
    ctx.beginPath();ctx.arc(0,0,g.scale*.30,0,TAU);ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation='source-over';
  }

  /* ── WANDERERS — Saturn and Earth roam the frame: each drifts along a slow, gently
     curved path, leaves by the left, top or bottom edge, waits a while off-screen and
     comes back from another random edge. Paths that would pass near the black hole are
     rejected — the hole owns the right side. Everything attached to them (moon,
     satellites, aurora, ring gravel, click targets, gravity on travellers) follows,
     because it is all drawn relative to the body's position.                         */
  function edgePoint(side,m){
    if(side===0)return{x:-m,y:H*(.10+Math.random()*.70)};               // left
    if(side===1)return{x:W*(.06+Math.random()*.54),y:-m};              // top
    return{x:W*(.06+Math.random()*.54),y:H+m};                          // bottom (behind the Sun's limb)
  }
  function segDist(ax,ay,bx,by,px,py){const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1;const u=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l2));return Math.hypot(ax+dx*u-px,ay+dy*u-py);}
  function planPath(mv,start,startSide){
    const m=mv.margin,avoid=BH.r*4.8+m,minLen=Math.min(W,H)*.6;
    for(let k=0;k<40;k++){
      const side=(Math.random()*3)|0;
      if(side===startSide&&k<30)continue;
      const e=edgePoint(side,m),len=Math.hypot(e.x-start.x,e.y-start.y);
      if(len<minLen||segDist(start.x,start.y,e.x,e.y,BH.x,BH.y)<avoid)continue;
      mv.sx=start.x;mv.sy=start.y;mv.ex=e.x;mv.ey=e.y;mv.u=0;mv.dur=len/mv.speed;mv.state='move';
      mv.amp=(Math.random()<.5?-1:1)*Math.min(W,H)*(.04+Math.random()*.06);          // the gentle arc
      const nx=-(e.y-start.y)/len,ny=(e.x-start.x)/len;
      if(Math.hypot((start.x+e.x)/2+nx*mv.amp-BH.x,(start.y+e.y)/2+ny*mv.amp-BH.y)<avoid)mv.amp=-mv.amp;   // never arc toward the hole
      return;
    }
    mv.sx=start.x;mv.sy=start.y;mv.ex=-m;mv.ey=start.y;mv.u=0;mv.dur=Math.max(1,Math.hypot(mv.ex-mv.sx,mv.ey-mv.sy))/mv.speed;mv.amp=0;mv.state='move';
  }
  function updateMover(mv,body,t,dt){
    if(mv.state==='wait'){
      if(t>=mv.until){const side=(Math.random()*3)|0;planPath(mv,edgePoint(side,mv.margin),side);mv.startAt=0;}
      return;
    }
    if(t<mv.startAt)return;                                  // the opening hold at the classic spot
    mv.u+=dt/mv.dur;
    if(mv.u>=1){mv.state='wait';mv.until=t+mv.pause[0]+Math.random()*mv.pause[1];body.x=mv.ex;body.y=mv.ey;return;}
    const u=mv.u,dx=mv.ex-mv.sx,dy=mv.ey-mv.sy,len=Math.hypot(dx,dy)||1,b=Math.sin(Math.PI*u)*mv.amp;
    body.x=mv.sx+dx*u-dy/len*b;body.y=mv.sy+dy*u+dx/len*b;
  }

  /* ── PASSING WORLDS — Mercury, Venus, Mars, Jupiter, Uranus, Neptune, Pluto and an
     asteroid drift across the sky in a shuffled cycle (one or two at a time, a new one
     every ~20–50 s). They enter from the LEFT — the far side, away from the hole — on
     lanes under the disk or over its arch, each slowly rotating so its features drift,
     lit by the Sun below; the black hole's gravity visibly BENDS its path as it passes on
     the right (a bump toward the hole that relaxes back — the lane itself stays straight,
     so nothing gets reeled in). Click → spin-up + fact. */
  function spawnPasser(t,forceId,atX){
    if(!passQueue.length)passQueue=WORLDS.map((_,i)=>i).sort(()=>Math.random()-.5);
    let w=forceId?WORLDS.find(q=>q.id===forceId):WORLDS[passQueue.pop()];
    if(!forceId&&PASSERS.some(p=>p.w===w)&&passQueue.length){passQueue.unshift(WORLDS.indexOf(w));w=WORLDS[passQueue.pop()];}   // never the same world twice at once
    const fromLeft=forceId?Math.random()<.5:true,r=Math.min(W,H)*w.size;   // worlds come in from the FAR side, away from the hole
    // lanes that steer clear of the hole on the right: mostly under the disk, sometimes over its arch
    let y=Math.random()<.7?H*(.64+Math.random()*.14):H*(.03+Math.random()*.06);
    if(w.size>.06)y=Math.min(y,H*.74);                     // the giant stays off the Sun's limb
    const speed=W/((55+Math.random()*30)*60)*w.spd;       // px per frame: a crossing takes ~1–2 min, small worlds faster
    const shape=Array.from({length:13},(_,i)=>.62+.38*Math.abs(Math.sin(i*2.7+w.size*100+Math.random()*.6)));
    if(w.id!=='asteroid'&&!WORLD_TEX[w.id])WORLD_TEX[w.id]=makeWorldTexture(w.id);
    passStats.spawned++;
    PASSERS.push({w,x:atX!=null?atX:(fromLeft?-r*2.2:W+r*2.2),y,vx:(fromLeft?1:-1)*speed,vy:(Math.random()-.5)*speed*.04,
                  r,rot:Math.random()*TAU,rotSpd:(Math.random()<.5?-1:1)*(.05+.06*Math.random()),boostT:null,g:1,shape,ph:Math.random()*TAU});
  }
  function updatePassers(t,dt){
    if(t>nextPassAt&&PASSERS.length<2){spawnPasser(t);nextPassAt=t+20+Math.random()*30;}
    for(let i=PASSERS.length-1;i>=0;i--){
      const p=PASSERS[i];
      // the hole's gravity only BENDS a passing world's path; a swallow needs a near-direct hit (rare)
      const dx=BH.x-p.x,dy=BH.y-p.y,d=Math.hypot(dx,dy);
      if(d<BH.r*1.3){                                        // swallowed — spaghettified into a long streak
        TIDAL.push({ang:Math.atan2(p.y-BH.y,p.x-BH.x),t0:t,big:p.r});
        PASSERS.splice(i,1);passStats.swallowed++;continue;
      }
      // the hole's gravity BENDS the world's apparent path toward it as it passes — a bump
      // that grows near closest approach and relaxes back to the lane (the lane itself is
      // straight, so nothing can be reeled in; a click surge deepens the bump)
      {const dd=Math.max(d,2*BH.r),pull=BH.r*.9*(1+SURGE*1.5)*Math.pow(2*BH.r/dd,2);p.ox=dx/d*pull;p.oy=dy/d*pull;}
      p.g=Math.min(1,(d-BH.r)/(BH.r*.45));
      p.x+=p.vx;p.y+=p.vy;                                   // straight lane (no planet nudges: over a 2-min crossing even a tiny kick adds up)
      p.rot+=p.rotSpd*dt*(1+4*clickEnv(p.boostT,t,3));
      if(p.x<-p.r*3||p.x>W+p.r*3||p.y<-p.r*3||p.y>H+p.r*3){PASSERS.splice(i,1);passStats.exited++;}
    }
  }
  function drawPasser(p,t){
    const w=p.w,r=p.r,x=p.x+(p.ox||0),y=p.y+(p.oy||0),id=w.id;
    const f=clickEnv(p.boostT,t,3);
    const sdx=SUN.x-x,sdy=SUN.y-y,sm=Math.hypot(sdx,sdy),ux=sdx/sm,uy=sdy/sm,sunAng=Math.atan2(uy,ux);
    const ry=id==='jupiter'?r*.935:r;
    ctx.save();
    ctx.globalAlpha=p.g;
    if(f>0){ctx.fillStyle=rg(ctx,x,y,r,r*2.4,[[0,`rgba(255, 230, 190, ${.22*f})`],[1,'rgba(255, 230, 190, 0)']]);ctx.beginPath();ctx.arc(x,y,r*2.4,0,TAU);ctx.fill();}
    if(id==='asteroid'){                                      // a tumbling, elongated, cratered potato
      ctx.translate(x,y);ctx.rotate(p.rot*3);ctx.scale(1.35,1);
      const path=()=>{ctx.beginPath();p.shape.forEach((k,i)=>{const a=i/p.shape.length*TAU;i?ctx.lineTo(Math.cos(a)*r*k,Math.sin(a)*r*k):ctx.moveTo(Math.cos(a)*r*k,Math.sin(a)*r*k);});ctx.closePath();};
      const la=sunAng-p.rot*3,lx=Math.cos(la)*r*.45,ly=Math.sin(la)*r*.45;
      path();ctx.fillStyle=rg(ctx,lx,ly,r*.05,r*1.6,[[0,'#c4b8a6'],[.45,'#7d6f5e'],[1,'#1d1713']]);ctx.fill();
      ctx.save();path();ctx.clip();
      for(const[cx,cy,cr,a]of[[.25,-.2,.22,.5],[-.35,.25,.18,.45],[.1,.4,.13,.4],[-.05,-.45,.1,.35],[.5,.15,.09,.4]]){
        ctx.fillStyle=`rgba(20, 16, 12, ${a})`;ctx.beginPath();ctx.arc(cx*r,cy*r,cr*r,0,TAU);ctx.fill();
        ctx.strokeStyle='rgba(230, 220, 205, 0.3)';ctx.lineWidth=Math.max(.6,cr*r*.2);ctx.beginPath();ctx.arc(cx*r,cy*r,cr*r,la+Math.PI-1.1,la+Math.PI+1.1);ctx.stroke();
      }
      for(let i=0;i<10;i++){ctx.fillStyle=`rgba(${i%2?'255,245,230':'20,15,10'}, 0.12)`;ctx.beginPath();ctx.arc(Math.sin(i*4.7)*r*.7,Math.cos(i*3.1)*r*.7,r*(.08+.08*Math.abs(Math.sin(i*1.3))),0,TAU);ctx.fill();}
      ctx.restore();
      ctx.restore();return;
    }
    // Jupiter's four big moons circle it edge-on: those on the far side first
    const moons=id==='jupiter'?JUP_MOONS.map((m,i)=>{const a=t*m.spd*.35+p.ph+i*1.7;return{m,a,mx:x+Math.cos(a)*r*m.k,my:y+Math.sin(a)*r*m.k*.07-ry*.04,front:Math.sin(a)>0};}):null;
    const drawMoons=front=>{if(!moons)return;for(const q of moons){if(q.front!==front)continue;
      ctx.fillStyle=q.m.col;ctx.beginPath();ctx.arc(q.mx,q.my,Math.max(1.1,r*q.m.sz),0,TAU);ctx.fill();}};
    drawMoons(false);
    if(id==='uranus'){                                        // the far half of its faint, nearly upright rings
      ctx.strokeStyle='rgba(200, 235, 240, 0.30)';ctx.lineWidth=Math.max(1,r*.05);
      ctx.beginPath();ctx.ellipse(x,y,r*.34,r*1.9,.22,Math.PI*.5,Math.PI*1.5);ctx.stroke();
    }
    // the textured sphere: the world's painted map, wrapped on by longitude strips
    ctx.save();
    ctx.beginPath();ctx.ellipse(x,y,r,ry,0,0,TAU);ctx.clip();
    const tex=WORLD_TEX[id];
    if(tex)drawTexturedSphere(tex,x,y,r,ry,p.rot);
    // lighting: limb darkening, the night side away from the Sun, a sunward sheen
    ctx.fillStyle=rg(ctx,x,y,r*.5,r,[[0,'rgba(0, 0, 0, 0)'],[.72,'rgba(0, 0, 0, 0.14)'],[1,'rgba(0, 0, 0, 0.6)']]);
    ctx.fillRect(x-r,y-ry,r*2,ry*2);
    ctx.fillStyle=rg(ctx,x+ux*r*.5,y+uy*r*.5,r*.5,r*2.0,[[0,'rgba(3, 3, 12, 0)'],[.5,'rgba(3, 3, 12, 0)'],[.78,'rgba(3, 3, 12, 0.5)'],[1,'rgba(3, 3, 12, 0.93)']]);
    ctx.fillRect(x-r,y-ry,r*2,ry*2);
    ctx.fillStyle=rg(ctx,x+ux*r*.5,y+uy*r*.5,0,r*.9,[[0,'rgba(255, 250, 235, 0.22)'],[1,'rgba(255, 250, 235, 0)']]);
    ctx.fillRect(x-r,y-ry,r*2,ry*2);
    ctx.restore();
    // atmospheres
    if(id==='venus'){ctx.fillStyle=rg(ctx,x,y,r*.9,r*1.4,[[0,'rgba(255, 236, 190, 0.4)'],[1,'rgba(255, 236, 190, 0)']]);ctx.beginPath();ctx.arc(x,y,r*1.4,0,TAU);ctx.fill();}
    else if(id==='mars'){ctx.fillStyle=rg(ctx,x,y,r*.95,r*1.18,[[0,'rgba(255, 150, 100, 0.22)'],[1,'rgba(255, 150, 100, 0)']]);ctx.beginPath();ctx.arc(x,y,r*1.18,0,TAU);ctx.fill();}
    else if(id==='neptune'||id==='uranus'){const c=id==='neptune'?'110, 150, 255':'160, 225, 235';ctx.fillStyle=rg(ctx,x,y,r*.95,r*1.25,[[0,`rgba(${c}, 0.28)`],[1,`rgba(${c}, 0)`]]);ctx.beginPath();ctx.arc(x,y,r*1.25,0,TAU);ctx.fill();}
    if(id==='uranus'){                                        // the near half of the rings, in front
      ctx.strokeStyle='rgba(215, 242, 246, 0.42)';ctx.lineWidth=Math.max(1,r*.05);
      ctx.beginPath();ctx.ellipse(x,y,r*.34,r*1.9,.22,-Math.PI*.5,Math.PI*.5);ctx.stroke();
    }
    ctx.strokeStyle='rgba(255, 244, 226, 0.4)';ctx.lineWidth=1.2;   // sunlit rim
    ctx.beginPath();ctx.ellipse(x,y,r,ry,0,sunAng-1.05,sunAng+1.05);ctx.stroke();
    drawMoons(true);
    ctx.restore();
  }

  /* ── SATURN v2 — oblate banded gas giant with a structured ring system ─────
     Rings as concentric thin ellipses with a radial brightness profile
     (C · B · Cassini division · A · Encke gap · F), far half behind the body,
     near half in front; the body's shadow darkens the far rings (anti-sun side),
     the rings' shadow curves across the body; limb darkening + terminator;
     orbiting gravel; click → ring rush + wobble + visible spin (storms sweep). */
  const RING_IN=1.24,RING_OUT=2.32;
  function ringProfile(k){                          // [alpha, colour rgb] at ring radius k (planet radii)
    if(k<1.53)return[.14+.08*Math.sin(k*40)*Math.sin(k*17),'178,172,185'];              // C ring — faint, bluish grey
    if(k<1.95)return[.62+.22*Math.sin(k*57)*Math.sin(k*23)+.08*Math.sin(k*130),'232,220,192'];  // B ring — bright, grooved
    if(k<2.03)return[.05,'190,180,170'];                                                   // Cassini division
    if(k<2.18)return[.42+.14*Math.sin(k*61),'214,202,176'];                               // A ring
    if(k<2.21)return[.06,'190,180,170'];                                                   // Encke gap
    if(k<2.27)return[.36,'214,202,176'];                                                   // outer A
    if(k<2.30)return[.02,'0,0,0'];
    return[.22,'236,232,228'];                                                             // F ring — thin, white
  }
  function drawPlanet(t,dt){
    const p=PLANET;
    const f=clickEnv(p.boostT,t,3);
    p.x2+=dt*.55*f;
    const ROT=-0.3+Math.sin(t*3)*.06*f,ASP=0.29,r=p.r,ry=r*.9;
    const sdx=SUN.x-p.x,sdy=SUN.y-p.y,sm=Math.hypot(sdx,sdy),ux=sdx/sm,uy=sdy/sm;   // toward the Sun
    if(f>0){
      ctx.fillStyle=rg(ctx,p.x,p.y,r,r*2.6,[[0,`rgba(255, 214, 150, ${.18*f})`],[1,'rgba(255, 214, 150, 0)']]);
      ctx.beginPath();ctx.arc(p.x,p.y,r*2.6,0,TAU);ctx.fill();
    }
    const bright=1+f*.5;
    // ring strokes: k from RING_IN to RING_OUT in thin steps; a0..a1 = the ellipse-parameter span
    const rings=(a0,a1,alphaMul)=>{
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ROT);ctx.lineCap='butt';
      const step=.028;
      for(let k=RING_IN;k<RING_OUT;k+=step){
        const[al,col]=ringProfile(k+step/2);
        if(al<.015)continue;
        ctx.strokeStyle=`rgba(${col}, ${Math.min(1,al*alphaMul*bright)})`;
        ctx.lineWidth=step*r*1.08;
        ctx.beginPath();ctx.ellipse(0,0,(k+step/2)*r,(k+step/2)*r*ASP,0,a0,a1);ctx.stroke();
      }
      ctx.restore();
    };
    const drawRocks=front=>{
      for(const ro of p.rocks){
        if((Math.sin(ro.ang)>=0)!==front)continue;
        const ex=Math.cos(ro.ang)*r*ro.k,ey=Math.sin(ro.ang)*r*ro.k*ASP;
        const qx=p.x+ex*Math.cos(ROT)-ey*Math.sin(ROT),qy=p.y+ex*Math.sin(ROT)+ey*Math.cos(ROT);
        ctx.fillStyle=ro.hue<.5?`rgba(226, 214, 190, ${front?.9:.5})`:`rgba(190, 176, 156, ${front?.8:.42})`;
        ctx.beginPath();ctx.arc(qx,qy,ro.size,0,TAU);ctx.fill();
      }
    };
    for(const ro of p.rocks)ro.ang+=ro.spd*.016*(1+3*f);
    // far half of the rings (above the body), then the body's shadow falling on them
    rings(Math.PI,TAU,.72);
    ctx.save();
    ctx.translate(p.x,p.y);ctx.rotate(ROT);
    ctx.beginPath();                                        // clip to the far half-annulus of the ring system…
    ctx.ellipse(0,0,RING_OUT*r,RING_OUT*r*ASP,0,Math.PI,TAU);
    ctx.ellipse(0,0,RING_IN*r,RING_IN*r*ASP,0,TAU,Math.PI,true);
    ctx.closePath();ctx.clip();
    ctx.rotate(Math.atan2(-uy,-ux)-ROT);                    // …then +x points away from the Sun: the body's shadow lane
    ctx.fillStyle=lg(ctx,r*.5,0,r*3.0,0,[[0,'rgba(6, 4, 12, 0.8)'],[.5,'rgba(6, 4, 12, 0.5)'],[1,'rgba(6, 4, 12, 0)']]);
    ctx.beginPath();ctx.ellipse(r*1.7,0,r*1.7,r*1.02,0,0,TAU);ctx.fill();   // soft-ended, no hard box
    ctx.restore();
    drawRocks(false);
    // the body: limb-darkened base, bands, polar hood, storms, terminator, ring shadow
    ctx.save();
    ctx.beginPath();ctx.ellipse(p.x,p.y,r,ry,0,0,TAU);ctx.clip();
    ctx.fillStyle=rg(ctx,p.x+ux*r*.25,p.y+uy*r*.25,r*.1,r*1.55,[[0,'#f3e6bf'],[.55,'#d9c08c'],[1,'#7a5a3a']]);
    ctx.fillRect(p.x-r,p.y-ry,r*2,ry*2);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ROT);
    for(const[y0,y1,col]of SAT_BANDS){
      ctx.globalAlpha=.55;ctx.fillStyle=col;
      ctx.fillRect(-r*1.1,y0*ry,r*2.2,(y1-y0)*ry+.6);
    }
    ctx.globalAlpha=1;
    for(const yb of[-.72,-.5,-.3,-.08,.2,.45,.72]){        // thin dark belt edges
      ctx.fillStyle='rgba(120, 85, 50, 0.22)';ctx.fillRect(-r*1.1,yb*ry-.5,r*2.2,1.2);
    }
    ctx.fillStyle='rgba(60, 90, 110, 0.35)';                 // the bluish polar hood
    ctx.beginPath();ctx.ellipse(0,-ry*.93,r*.55,ry*.16,0,0,TAU);ctx.fill();
    // storm ovals riding the bands — their drift IS the planet's rotation
    const lon=t*.05+p.x2;
    [[0,-.04,.16,.06,'rgba(120, 80, 60, 0.45)'],[.55,.42,.12,.045,'rgba(250, 236, 205, 0.5)'],[.3,-.55,.09,.035,'rgba(250, 236, 205, 0.4)']]
    .forEach(([off,band,rx,ryy,col])=>{
      const u=((lon+off)%1+1)%1,edge=Math.max(0,1-Math.abs(u*2-1));
      if(edge<=.05)return;
      ctx.fillStyle=col;ctx.beginPath();ctx.ellipse((u*2-1)*r*1.15,band*ry,r*rx*(.4+edge*.6),ry*ryy,0,0,TAU);ctx.fill();
    });
    ctx.restore();
    // terminator: the side away from the Sun goes dark
    ctx.fillStyle=rg(ctx,p.x+ux*r*.45,p.y+uy*r*.45,r*.55,r*2.05,[[0,'rgba(10, 6, 18, 0)'],[.55,'rgba(10, 6, 18, 0)'],[1,'rgba(10, 6, 18, 0.9)']]);
    ctx.fillRect(p.x-r,p.y-ry,r*2,ry*2);
    // the rings' shadow: the ring ellipses displaced away from the Sun, clipped to the body
    ctx.save();ctx.translate(p.x-ux*r*.42,p.y-uy*r*.42);ctx.rotate(ROT);
    for(let k=RING_IN;k<2.27;k+=.06){
      const[al]=ringProfile(k+.03);if(al<.05)continue;
      ctx.strokeStyle=`rgba(20, 12, 8, ${Math.min(.6,al*.55)})`;ctx.lineWidth=.06*r*1.1;
      ctx.beginPath();ctx.ellipse(0,0,(k+.03)*r,(k+.03)*r*ASP,0,0,TAU);ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    // limb
    ctx.strokeStyle='rgba(255, 240, 210, 0.18)';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(p.x,p.y,r,ry,0,0,TAU);ctx.stroke();
    // near half of the rings, in front of the body
    rings(0,Math.PI,1.0);
    drawRocks(true);
  }

  /* ── EARTH v2 — an orthographic globe ─────────────────────────────────────
     Real (simplified) continents projected onto the sphere and clipped at the
     limb, deserts and ice caps, streaky clouds on their own faster layer, a
     Rayleigh rim brightest toward the Sun, ocean glint, terminator with city
     lights on the night side, the aurora oval. Click → spin-up + aurora surge. */
  function globeProject(lon,lat,spin,e){
    const L=lon*DEG+spin,B=lat*DEG;
    const x=Math.cos(B)*Math.sin(L),y=Math.sin(B),z=Math.cos(B)*Math.cos(L);
    const ct=Math.cos(.41),st=Math.sin(.41);              // axial tilt: the poles lean 23.4°
    const xr=x*ct-y*st,yr=x*st+y*ct;
    return{x:e.x+xr*e.r,y:e.y-yr*e.r,z,xr,yr};
  }
  function globePath(pts,spin,e){                          // polygon on the sphere; back-side vertices pinned to the limb
    let vis=0;const P=[];
    for(const[lon,lat]of pts){
      const q=globeProject(lon,lat,spin,e);
      if(q.z>0)vis++;
      else{const l=Math.hypot(q.xr,q.yr)||1;q.x=e.x+q.xr/l*e.r*1.002;q.y=e.y-q.yr/l*e.r*1.002;}
      P.push(q);
    }
    if(!vis)return false;
    ctx.beginPath();ctx.moveTo(P[0].x,P[0].y);for(let i=1;i<P.length;i++)ctx.lineTo(P[i].x,P[i].y);ctx.closePath();
    return true;
  }
  function drawEarth(t,dt){
    const e=EARTH;
    const f=clickEnv(e.boostT,t,3);
    if(f>0)e.x2+=dt*.10*f;
    const spin=t*.05+e.x2*6;                                // one rotation ≈ 2 min
    const sdx=SUN.x-e.x,sdy=SUN.y-e.y,sdm=Math.hypot(sdx,sdy);
    const ux=sdx/sdm,uy=sdy/sdm;
    // atmosphere: soft blue halo, brighter toward the Sun
    ctx.fillStyle=rg(ctx,e.x+ux*e.r*.15,e.y+uy*e.r*.15,e.r*.9,e.r*1.45,[[0,'rgba(120, 190, 255, 0.42)'],[.5,'rgba(90, 150, 255, 0.14)'],[1,'rgba(80, 140, 255, 0)']]);
    ctx.beginPath();ctx.arc(e.x,e.y,e.r*1.45,0,TAU);ctx.fill();
    ctx.save();
    ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,TAU);ctx.clip();
    // ocean
    ctx.fillStyle=rg(ctx,e.x+ux*e.r*.4,e.y+uy*e.r*.4,e.r*.05,e.r*1.9,[[0,'#5fb4f0'],[.3,'#2b7fd0'],[.65,'#144f9c'],[1,'#0a2a5e']]);
    ctx.fillRect(e.x-e.r,e.y-e.r,e.r*2,e.r*2);
    // land / deserts / ice
    for(const c of CONTINENTS){
      if(!globePath(c.pts,spin,e))continue;
      ctx.fillStyle=c.kind==='land'?'#3f8c4b':c.kind==='desert'?'rgba(214, 178, 110, 0.9)':'rgba(240, 246, 250, 0.95)';
      ctx.fill();
      if(c.kind==='land'){ctx.strokeStyle='rgba(20, 60, 30, 0.35)';ctx.lineWidth=.6;ctx.stroke();}
    }
    // land shading toward the terminator side (relief-ish darkening)
    ctx.fillStyle=rg(ctx,e.x+ux*e.r*.5,e.y+uy*e.r*.5,e.r*.2,e.r*1.8,[[0,'rgba(255, 250, 230, 0.10)'],[.6,'rgba(0, 0, 0, 0)'],[1,'rgba(0, 10, 30, 0.25)']]);
    ctx.fillRect(e.x-e.r,e.y-e.r,e.r*2,e.r*2);
    // clouds: streaky curls on a faster layer
    ctx.lineCap='round';
    for(const cl of CLOUDS){
      const pts=[];let vis=false;
      for(let k=0;k<6;k++){
        const u=k/5;
        const q=globeProject(cl.lon+u*cl.len,cl.lat+Math.sin(u*Math.PI)*cl.curl*30,spin*1.35,e);
        if(q.z>.05)vis=true;
        pts.push(q);
      }
      if(!vis)continue;
      ctx.strokeStyle=`rgba(255, 255, 255, ${cl.a})`;ctx.lineWidth=cl.w*e.r;
      ctx.beginPath();
      let started=false;
      for(const q of pts){if(q.z<=.02){started=false;continue;}if(!started){ctx.moveTo(q.x,q.y);started=true;}else ctx.lineTo(q.x,q.y);}
      ctx.stroke();
    }
    // night side
    ctx.fillStyle=rg(ctx,e.x+ux*e.r*.4,e.y+uy*e.r*.4,e.r*.6,e.r*2.1,[[0,'rgba(3, 6, 20, 0)'],[.6,'rgba(3, 6, 20, 0)'],[1,'rgba(3, 6, 20, 0.9)']]);
    ctx.fillRect(e.x-e.r,e.y-e.r,e.r*2,e.r*2);
    // city lights twinkling through the night-side darkness (flaring on click)
    for(const ct of e.cities){
      const sunward=ct[0]*ux+ct[1]*uy;
      if(sunward>-.15)continue;
      const tw=.55+.45*Math.sin(t*2.2+ct[2]);
      ctx.fillStyle=`rgba(255, 214, 120, ${Math.min(1,(.45+.4*tw)*Math.min(1,-sunward*4)*(1+f*1.2))})`;
      const cs=1.3+f*1.2;
      ctx.fillRect(e.x+ct[0]*e.r,e.y+ct[1]*e.r,cs,cs);
    }
    // ocean glint near the sub-solar point
    ctx.fillStyle=rg(ctx,e.x+ux*e.r*.55,e.y+uy*e.r*.55,0,e.r*.28,[[0,'rgba(255, 255, 240, 0.45)'],[1,'rgba(255, 255, 240, 0)']]);
    ctx.beginPath();ctx.arc(e.x+ux*e.r*.55,e.y+uy*e.r*.55,e.r*.28,0,TAU);ctx.fill();
    ctx.restore();
    // Rayleigh rim: crisp bright limb on the sunlit side
    const sunAng=Math.atan2(uy,ux);
    ctx.strokeStyle='rgba(170, 215, 255, 0.7)';
    ctx.lineWidth=1.6;
    ctx.beginPath();ctx.arc(e.x,e.y,e.r,sunAng-1.1,sunAng+1.1);ctx.stroke();
    ctx.strokeStyle='rgba(120, 170, 255, 0.25)';
    ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(e.x,e.y,e.r+1.2,0,TAU);ctx.stroke();
    // Aurora — a compact, vivid glow hugging the north pole
    const auA=(.30+.16*Math.sin(t*1.1))*(1+f*1.6);
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=rg(ctx,e.x,e.y-e.r*1.0,0,e.r*.45,[[0,`rgba(110, 255, 170, ${auA*.4})`],[1,'rgba(110, 255, 170, 0)']]);
    ctx.beginPath();ctx.arc(e.x,e.y-e.r*1.0,e.r*.45,0,TAU);ctx.fill();
    ctx.lineCap='round';
    for(let i=0;i<3;i++){
      const rr=e.r*(1.04+i*.05);
      const wob=Math.sin(t*(1.3+i*.4)+i*2)*.04;
      ctx.strokeStyle=i===2?`rgba(245, 150, 230, ${auA*.5})`:`rgba(110, 255, 170, ${auA*(1-i*.2)})`;
      ctx.lineWidth=1.6-i*.35;
      ctx.beginPath();
      ctx.arc(e.x,e.y,rr,Math.PI*(1.34+wob),Math.PI*(1.66+wob));
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawEarthOrbiters(t,behind){
    const e=EARTH;
    for(const o of EARTH_ORBITERS){
      const a=t*o.spd+o.phase+lapExtra(o,t);
      const s=Math.sin(a);
      if((s<0)!==behind)continue;
      const px=e.x+Math.cos(a)*e.r*o.rx;
      const py=e.y+s*e.r*o.ry-e.r*.55;
      const depth=.85+.15*s;
      if(o.kind==='moon')drawMoon(px,py,e.r*o.size*depth,behind);
      else drawMiniSat(px,py,e.r*o.size*depth,a,behind);
    }
  }
  function drawMoon(px,py,mr,behind){
    ctx.save();
    if(behind)ctx.globalAlpha=.85;
    const dx=SUN.x-px,dy=SUN.y-py,dm=Math.hypot(dx,dy);
    const ux=dx/dm,uy=dy/dm;
    ctx.fillStyle=rg(ctx,px+ux*mr*.45,py+uy*mr*.45,mr*.1,mr*1.6,[[0,'#E8E4DC'],[.55,'#A8A49C'],[1,'#54504C']]);
    ctx.beginPath();ctx.arc(px,py,mr,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(60, 58, 55, 0.35)';
    ctx.beginPath();ctx.arc(px-mr*.30,py-mr*.15,mr*.22,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(px+mr*.25,py+mr*.30,mr*.16,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(px+mr*.15,py-mr*.40,mr*.12,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(px,py,mr,0,TAU);ctx.clip();
    ctx.fillStyle='rgba(8, 10, 20, 0.55)';
    ctx.beginPath();ctx.arc(px-ux*mr*.9,py-uy*mr*.9,mr*1.05,0,TAU);ctx.fill();
    ctx.restore();
  }
  function drawMiniSat(px,py,s,a,behind){
    ctx.save();
    if(behind)ctx.globalAlpha=.8;
    ctx.translate(px,py);
    ctx.rotate(Math.cos(a)*.5);
    ctx.fillStyle='#1A4888';
    ctx.strokeStyle='#2E6AB4';
    ctx.lineWidth=.8;
    ctx.fillRect(-s,-s*.22,s*.7,s*.44);
    ctx.strokeRect(-s,-s*.22,s*.7,s*.44);
    ctx.fillRect(s*.3,-s*.22,s*.7,s*.44);
    ctx.strokeRect(s*.3,-s*.22,s*.7,s*.44);
    ctx.fillStyle='#A8B4C0';
    ctx.fillRect(-s*.3,-s*.3,s*.6,s*.6);
    ctx.fillStyle='#58687A';
    ctx.fillRect(-s*.3,s*.05,s*.6,s*.14);
    ctx.fillStyle=`rgba(255, 90, 90, ${.35+.6*Math.abs(Math.sin(a*3))})`;
    ctx.beginPath();ctx.arc(0,-s*.45,s*.10+.6,0,TAU);ctx.fill();
    ctx.restore();
  }
  function drawTravelers(t){
    for(let i=0;i<TRAVELERS.length;i++){
      const s=TRAVELERS[i];
      const g=bhPull(s,.5);
      if(g<0){
        if(TIDAL.length<8)TIDAL.push({ang:Math.atan2(s.y-BH.y,s.x-BH.x),t0:t});
        TRAVELERS[i]=spawnTraveler(false);continue;
      }
      bodyPull(s,EARTH.x,EARTH.y,EARTH.r,.05);
      bodyPull(s,PLANET.x,PLANET.y,PLANET.r,.05);
      s.x+=s.vx;s.y+=s.vy;
      if(s.x<-20||s.x>W+20||s.y<-20||s.y>H+20){TRAVELERS[i]=spawnTraveler(false);continue;}
      const tw=.55+.45*Math.sin(t*s.spd+s.tw);
      const trail=6+s.r*5;
      const L=lensImage(s.x,s.y),Lt=lensImage(s.x-s.vx*trail,s.y-s.vy*trail);
      ctx.globalAlpha=Math.min(1,g*L.mag);
      ctx.strokeStyle=starColor(s.hue,.25*tw);
      ctx.lineWidth=s.r*.8;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(L.x,L.y);ctx.lineTo(Lt.x,Lt.y);ctx.stroke();
      ctx.fillStyle=starColor(s.hue,.16*tw);
      ctx.beginPath();ctx.arc(L.x,L.y,s.r*2.6,0,TAU);ctx.fill();
      ctx.fillStyle=starColor(s.hue,.5+.5*tw);
      ctx.beginPath();ctx.arc(L.x,L.y,s.r,0,TAU);ctx.fill();
      if(L.ga>0){ctx.fillStyle=starColor(s.hue,(.5+.5*tw)*L.ga);ctx.beginPath();ctx.arc(L.gx,L.gy,s.r*.8,0,TAU);ctx.fill();}
    }
    ctx.globalAlpha=1;
  }
  // TIDAL STREAKS — a swallowed traveller's last light whips round the hole and dives in
  function drawTidal(t){
    const{x,y,r,tilt}=BH;
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=TIDAL.length-1;i>=0;i--){
      const s=TIDAL[i],dur=s.big?2.2:1.15,p=(t-s.t0)/dur;
      if(p>=1){TIDAL.splice(i,1);continue;}
      const d=r*(2.6-1.52*p*p),ang=s.ang+p*4.2;
      ctx.strokeStyle=`rgba(255, ${230-p*120|0}, ${190-p*130|0}, ${(1-p)*.8})`;
      ctx.lineWidth=s.big?Math.max(1,s.big*.5*(1-p*.7)):Math.max(.6,1.6-p);   // a swallowed world leaves a fat streak
      ctx.beginPath();ctx.ellipse(x,y,d,d*(tilt+.3),0,ang,ang+.12+p*(s.big?1.6:.95));ctx.stroke();
    }
    ctx.restore();
  }
  function drawComets(t,dt){
    for(let i=0;i<COMETS.length;i++){
      const cm=COMETS[i];
      if(cm.delay>0){cm.delay-=dt;continue;}
      const g=bhPull(cm,.9);
      if(g<0){COMETS[i]=spawnComet(false);continue;}
      bodyPull(cm,EARTH.x,EARTH.y,EARTH.r,.09);
      bodyPull(cm,PLANET.x,PLANET.y,PLANET.r,.09);
      cm.x+=cm.vx;cm.y+=cm.vy;
      if(cm.x<-150||cm.x>W+150||cm.y<-150||cm.y>H+150){COMETS[i]=spawnComet(false);continue;}
      const sx=cm.x-SUN.x,sy=cm.y-SUN.y,sm=Math.hypot(sx,sy);
      const tx=cm.x+(sx/sm)*cm.len;
      const ty=cm.y+(sy/sm)*cm.len;
      ctx.globalAlpha=g;
      ctx.strokeStyle=lg(ctx,cm.x,cm.y,tx,ty,[[0,'rgba(235, 245, 255, 0.9)'],[1,'rgba(140, 170, 255, 0)']]);
      ctx.lineWidth=1.6;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(cm.x,cm.y);ctx.lineTo(tx,ty);ctx.stroke();
      ctx.fillStyle='rgba(255, 255, 255, 0.95)';
      ctx.beginPath();ctx.arc(cm.x,cm.y,1.8,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  // ── The doomed astronaut — caught by the black hole's gravity, spirals
  //    faster and faster, stretches (spaghettification!) and falls in ──
  function drawAstronaut(g,s){
    g.fillStyle='#9aa6b4';
    g.fillRect(-s*.62,-s*.34,s*.3,s*.72);
    g.fillStyle='#e8edf2';
    g.beginPath();g.ellipse(0,s*.12,s*.34,s*.46,0,0,TAU);g.fill();
    g.strokeStyle='#e8edf2';g.lineWidth=s*.18;g.lineCap='round';
    g.beginPath();
    g.moveTo(-s*.1,-s*.05);g.quadraticCurveTo(-s*.5,-s*.3,-s*.62,-s*.55);
    g.moveTo(s*.1,0);g.quadraticCurveTo(s*.5,s*.15,s*.6,s*.42);
    g.stroke();
    g.beginPath();
    g.moveTo(-s*.12,s*.5);g.lineTo(-s*.2,s*.95);
    g.moveTo(s*.12,s*.5);g.lineTo(s*.26,s*.92);
    g.stroke();
    g.fillStyle='#f2f6fa';
    g.beginPath();g.arc(0,-s*.5,s*.30,0,TAU);g.fill();
    g.fillStyle='#1a2a40';
    g.beginPath();g.arc(s*.05,-s*.5,s*.20,0,TAU);g.fill();
    g.fillStyle='rgba(255,255,255,.7)';
    g.beginPath();g.arc(0,-s*.56,s*.06,0,TAU);g.fill();
  }
  function drawAstro(t){
    if(!ASTRO)return;
    const p=(t-ASTRO.t0)/6.5;
    if(p>=1){ASTRO=null;return;}
    const ease=p*p;
    const d=BH.r*(5.2-4.25*ease);
    const ang=ASTRO.ang0+ASTRO.dir*(p*3+ease*10);
    const x=BH.x+Math.cos(ang)*d;
    const y=BH.y+Math.sin(ang)*d*.8;
    const sc=Math.min(W,H)*.018*(1-.4*ease);
    const fade=p>.92?(1-p)/.08:1;
    ctx.save();
    ctx.translate(x,y);
    if(p<.78)ctx.rotate(ASTRO.dir*(t-ASTRO.t0)*4);
    else{
      ctx.rotate(Math.atan2(BH.y-y,BH.x-x));
      const st=1+(p-.78)*9;
      ctx.scale(st,Math.max(.45,1-(p-.78)*2));
    }
    ctx.globalAlpha=fade;
    drawAstronaut(ctx,sc);
    ctx.restore();
    ctx.globalAlpha=1;
  }

  // Supernova — ported from success_screens/success-supernova.js
  function hexA(hex,a){
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return`rgba(${r},${g},${b},${a})`;
  }
  function easeOutCubic(x){return 1-Math.pow(1-x,3);}
  function buildNova(s,t){
    const unit=Math.min(W,H)/800,maxR=Math.min(W,H)*.24;
    const glow='#7DC4FF',primary='#C77DFF',accent='#FFD27D';
    const DUR=5,TE=1.4;
    const inf=Array.from({length:22},()=>{
      const born=Math.random()*TE*.5;
      return{ang:Math.random()*TAU,r0:(60+Math.random()*110)*unit,born,life:TE-born,w:.8+Math.random()*1.2};
    });
    const ecolors=[glow,primary,accent,'#FFFFFF','#FFFFFF'];
    const ej=Array.from({length:54},(_,j)=>({
      ang:Math.random()*TAU,speed:.25+Math.pow(Math.random(),1.5)*.75,
      life:(DUR-TE)*.9*(.7+Math.random()*.3),size:(1+Math.random()*2)*unit,
      streak:Math.random()<.3,color:ecolors[j%5]}));
    const ncolors=[primary,accent,glow,primary];
    const neb=Array.from({length:4},(_,k)=>({
      dx:(Math.random()-.5)*60*unit,dy:(Math.random()-.5)*60*unit,
      baseR:(30+Math.random()*36)*unit,color:ncolors[k]}));
    const dcolors=['#FFFFFF','#FFFFFF',glow,accent];
    const dust=Array.from({length:18},(_,di)=>{
      const dd=maxR*(.12+Math.random()*.45);
      const dq=1-Math.pow(1-dd/(maxR*1.05),1/3);
      return{x:s.x+Math.cos(Math.random()*TAU)*dd,y:s.y+Math.sin(Math.random()*TAU)*dd,
             arr:TE+dq*(DUR-TE)*.7,r:(0.8+Math.random()*1.4)*unit,tw:Math.random()*6.28,color:dcolors[di%4]};
    });
    return{x:s.x,y:s.y,start:t,star:s,unit,maxR,DUR,TE,inf,ej,neb,dust,glow,primary,accent};
  }
  function drawNova(t){
    if(!nova){
      if(t>nextNovaAt&&STARS_NEAR.length)
        nova=buildNova(STARS_NEAR[(Math.random()*STARS_NEAR.length)|0],t);
      return;
    }
    const n=nova,e=t-n.start;
    if(e>=n.DUR){
      n.star.x=Math.random()*W;n.star.y=Math.random()*H;
      nova=null;nextNovaAt=t+75+Math.random()*75;
      return;
    }
    const{x,y,unit,maxR,TE,DUR,glow,primary,accent}=n;
    const gFade=Math.min(1,(DUR-e)/.3);
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    if(e<TE){
      const charge=e/TE;
      ctx.lineCap='round';
      for(let i=0;i<n.inf.length;i++){
        const f=n.inf[i];
        const fq=Math.max(0,Math.min(1,(e-f.born)/f.life));
        if(fq<=0||fq>=1)continue;
        const fr=f.r0*(1-fq*fq);
        const fx=x+Math.cos(f.ang)*fr,fy=y+Math.sin(f.ang)*fr;
        const len=(10+16*fq)*unit;
        ctx.strokeStyle=hexA(i%2?glow:'#FFFFFF',fq*.8);
        ctx.lineWidth=f.w;
        ctx.beginPath();
        ctx.moveTo(fx,fy);
        ctx.lineTo(x+Math.cos(f.ang)*(fr+len),y+Math.sin(f.ang)*(fr+len));
        ctx.stroke();
      }
      const swell=charge>.85?1+(charge-.85)*4:1;
      const cr=(4+8*charge)*unit*swell*(1+.12*charge*Math.sin(t*20*(1+2*charge)));
      ctx.fillStyle=rg(ctx,x,y,0,cr*6,[[0,`rgba(255,255,255,${.5+.5*charge})`],[.3,hexA(accent,.5*charge+.2)],[1,hexA(accent,0)]]);
      ctx.beginPath();ctx.arc(x,y,cr*6,0,TAU);ctx.fill();
      ctx.fillStyle='#FFFFFF';
      ctx.beginPath();ctx.arc(x,y,cr,0,TAU);ctx.fill();
    }else{
      const te=e-TE;
      const nq=Math.min(1,te/(DUR-TE));
      const na=Math.sin(Math.PI*nq)*.20;
      for(const nb of n.neb){
        const nx=x+nb.dx*(1+nq*2),ny=y+nb.dy*(1+nq*2),nr=nb.baseR+nq*maxR*.30;
        ctx.fillStyle=rg(ctx,nx,ny,0,nr,[[0,hexA(nb.color,na*gFade)],[1,hexA(nb.color,0)]]);
        ctx.beginPath();ctx.arc(nx,ny,nr,0,TAU);ctx.fill();
      }
      for(const off of[0,.3]){
        const ste=te-off;
        if(ste<0)continue;
        const sq=Math.min(1,ste/((DUR-TE)*.75));
        if(sq>=1)continue;
        const sr=maxR*1.05*easeOutCubic(sq),sa=(1-sq)*gFade;
        ctx.strokeStyle=hexA(glow,.22*sa);
        ctx.lineWidth=(12*(1-sq)+4)*unit;
        ctx.beginPath();ctx.arc(x,y,sr,0,TAU);ctx.stroke();
        ctx.strokeStyle=`rgba(255,255,255,${.7*sa})`;
        ctx.lineWidth=1.6;
        ctx.beginPath();ctx.arc(x,y,sr,0,TAU);ctx.stroke();
      }
      for(const d of n.dust){
        const da=Math.max(0,Math.min(1,(e-d.arr)/.22));
        if(da<=0)continue;
        ctx.fillStyle=hexA(d.color,da*(.45+.4*Math.sin(t*10+d.tw))*gFade);
        ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,TAU);ctx.fill();
      }
      ctx.lineCap='round';
      for(const ee of n.ej){
        const eq=Math.min(1,te/ee.life);
        if(eq>=1)continue;
        const ed=ee.speed*maxR*easeOutCubic(eq);
        const ex=x+Math.cos(ee.ang)*ed,ey=y+Math.sin(ee.ang)*ed;
        const ea=(1-eq)*gFade;
        if(ee.streak){
          const sl=(16*(1-eq)+4)*unit;
          ctx.strokeStyle=hexA(ee.color,.85*ea);
          ctx.lineWidth=ee.size;
          ctx.beginPath();
          ctx.moveTo(ex,ey);
          ctx.lineTo(ex-Math.cos(ee.ang)*sl,ey-Math.sin(ee.ang)*sl);
          ctx.stroke();
        }else{
          ctx.fillStyle=hexA(ee.color,.9*ea);
          ctx.beginPath();ctx.arc(ex,ey,ee.size*(1-eq*.5),0,TAU);ctx.fill();
        }
      }
      const fa=.4*Math.exp(-te/.18)*gFade;
      if(fa>.01){
        ctx.fillStyle=rg(ctx,x,y,0,maxR*2.4,[[0,`rgba(255,255,255,${fa})`],[.35,hexA(accent,fa*.5)],[1,hexA(accent,0)]]);
        ctx.beginPath();ctx.arc(x,y,maxR*2.4,0,TAU);ctx.fill();
      }
      const pa=Math.max(0,Math.min(1,(te-.25)/.3))*gFade;
      if(pa>0){
        const prr=(3+Math.sin(t*15)*1.2)*unit;
        ctx.fillStyle=rg(ctx,x,y,0,prr*6,[[0,`rgba(255,255,255,${.9*pa})`],[.4,hexA(glow,.5*pa)],[1,hexA(glow,0)]]);
        ctx.beginPath();ctx.arc(x,y,prr*6,0,TAU);ctx.fill();
        ctx.fillStyle=`rgba(255,255,255,${pa})`;
        ctx.beginPath();ctx.arc(x,y,prr,0,TAU);ctx.fill();
        const fl=prr*(5+2*Math.sin(t*15));
        ctx.strokeStyle=`rgba(255,255,255,${.6*pa})`;
        ctx.lineWidth=1.2;
        ctx.beginPath();
        ctx.moveTo(x-fl,y);ctx.lineTo(x+fl,y);
        ctx.moveTo(x,y-fl);ctx.lineTo(x,y+fl);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ── THE SUN v2 — an enormous disc parked below the screen; only its limb shows.
     Corona + streamers, limb-darkened photosphere, boiling granulation (a
     drifting multiplied tile), sunspots with penumbrae, a thin red chromosphere,
     flickering spicules, small dancing prominences, two grand loops that swell
     and sink, and a scheduled flare every ~½–1 min.                          */
  function drawSun(t){
    const s=SUN;
    const breathe=1+Math.sin(t*.6)*.012;
    // corona
    ctx.fillStyle=rg(ctx,s.x,s.y,s.r*.97,s.r*1.42*breathe,[[0,'rgba(255, 214, 120, 0.50)'],[.22,'rgba(255, 170, 80, 0.20)'],[.6,'rgba(255, 130, 60, 0.07)'],[1,'rgba(255, 110, 50, 0)']]);
    ctx.fillRect(0,H*.4,W,H*.6);
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<7;i++){                                    // faint coronal streamers
      const ang=-Math.PI/2+(i/6-.5)*1.1+Math.sin(t*.07+i)*.03;
      const len=s.r*(.16+.10*Math.sin(t*.13+i*2.1))*(.7+.3*Math.sin(i*1.3));
      const bx=s.x+Math.cos(ang)*s.r,by=s.y+Math.sin(ang)*s.r;
      const tx=s.x+Math.cos(ang)*(s.r+len),ty=s.y+Math.sin(ang)*(s.r+len);
      const wdt=s.r*.022;
      ctx.fillStyle=lg(ctx,bx,by,tx,ty,[[0,'rgba(255, 200, 130, 0.035)'],[1,'rgba(255, 200, 130, 0)']]);
      ctx.beginPath();ctx.moveTo(bx-Math.sin(ang)*wdt,by+Math.cos(ang)*wdt);ctx.lineTo(bx+Math.sin(ang)*wdt,by-Math.cos(ang)*wdt);ctx.lineTo(tx,ty);ctx.closePath();ctx.fill();
    }
    ctx.restore();
    // photosphere with limb darkening
    ctx.fillStyle=rg(ctx,s.x,s.y,s.r*.5,s.r,[[0,'#fff8de'],[.86,'#ffe092'],[.955,'#ffc45c'],[.985,'#f78c32'],[1,'#c94f1c']]);
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.fill();
    // granulation: the tile drifts slowly along the limb; multiplied over the disc
    if(granTile){
      ctx.save();
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.clip();
      ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.55;
      const pat=ctx.createPattern(granTile,'repeat');
      ctx.translate((t*3)%256,(t*1.1)%256);ctx.fillStyle=pat;
      ctx.fillRect(-300,-300,W+600,H+600);
      ctx.restore();
    }
    // sunspots (umbra + penumbra), drifting with the rotation, foreshortened at the limb
    for(let i=0;i<s.spots.length;i++){
      const[a0,rr]=s.spots[i];
      const ang=-Math.PI/2+a0+Math.sin(t*.011+i)*.06;
      const sx=s.x+Math.cos(ang)*s.r*rr,sy=s.y+Math.sin(ang)*s.r*rr;
      const fore=Math.max(.35,1-Math.pow(rr,12));
      ctx.save();ctx.translate(sx,sy);ctx.rotate(ang+Math.PI/2);
      ctx.fillStyle='rgba(150, 70, 20, 0.5)';ctx.beginPath();ctx.ellipse(0,0,s.r*.013,s.r*.013*fore,0,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(60, 20, 8, 0.8)';ctx.beginPath();ctx.ellipse(0,0,s.r*.0065,s.r*.0065*fore,0,0,TAU);ctx.fill();
      ctx.restore();
    }
    // chromosphere: a thin red rim, and spicules bristling above the limb
    ctx.strokeStyle='rgba(255, 90, 40, 0.45)';ctx.lineWidth=Math.max(1.2,s.r*.006);
    ctx.beginPath();ctx.arc(s.x,s.y,s.r*1.003,-Math.PI/2-.6,-Math.PI/2+.6);ctx.stroke();
    ctx.lineCap='round';ctx.lineWidth=1.1;
    for(let i=0;i<56;i++){
      const ang=-Math.PI/2+(i/55-.5)*1.05;
      const fl=.5+.5*Math.sin(t*2.6+i*1.9),len=(2.5+6*fl)*(1+.2*Math.sin(i*2.3));
      ctx.strokeStyle=`rgba(255, ${120+40*fl|0}, 60, ${.16+.22*fl})`;
      ctx.beginPath();ctx.moveTo(s.x+Math.cos(ang)*s.r,s.y+Math.sin(ang)*s.r);ctx.lineTo(s.x+Math.cos(ang)*(s.r+len),s.y+Math.sin(ang)*(s.r+len));ctx.stroke();
    }
    // small dancing prominences
    for(let i=0;i<4;i++){
      const ang=-Math.PI/2+[-.16,-.065,.05,.14][i];
      const flick=.55+.45*Math.sin(t*2.1+i*2.7);
      const bx=s.x+Math.cos(ang)*s.r;
      const by=s.y+Math.sin(ang)*s.r;
      const h=(9+i*5)*flick+7;
      ctx.strokeStyle=`rgba(255, 150, 70, ${.18*flick+.08})`;ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(bx-9,by+2);ctx.quadraticCurveTo(bx,by-h*2,bx+9,by+2);ctx.stroke();
      ctx.strokeStyle=`rgba(255, 200, 110, ${.32*flick+.12})`;ctx.lineWidth=2.2;
      ctx.beginPath();ctx.moveTo(bx-9,by+2);ctx.quadraticCurveTo(bx,by-h*2,bx+9,by+2);ctx.stroke();
    }
    // two grand prominence LOOPS that slowly swell and sink back
    for(const[la,lph]of[[-.11,0],[.09,2.4]]){
      const ang=-Math.PI/2+la;
      const grow=.35+.65*Math.max(0,Math.sin(t*.25+lph));
      if(grow<.4)continue;
      const bx=s.x+Math.cos(ang)*s.r,by=s.y+Math.sin(ang)*s.r;
      ctx.save();
      ctx.translate(bx,by);
      ctx.rotate(ang+Math.PI/2);
      ctx.strokeStyle=`rgba(255, 150, 70, ${.16*grow})`;ctx.lineWidth=7;
      ctx.beginPath();ctx.ellipse(0,0,20*grow+8,34*grow+8,0,Math.PI,TAU);ctx.stroke();
      ctx.strokeStyle=`rgba(255, 170, 80, ${.30*grow})`;ctx.lineWidth=3.2;
      ctx.beginPath();ctx.ellipse(0,0,20*grow+8,34*grow+8,0,Math.PI,TAU);ctx.stroke();
      ctx.strokeStyle=`rgba(255, 220, 150, ${.20*grow})`;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.ellipse(0,0,(20*grow+8)*.8,(34*grow+8)*.85,0,Math.PI,TAU);ctx.stroke();
      ctx.restore();
    }
    // scheduled solar flare — a bright burst with rays, every ~½–1 min
    if(nextSunFlareAt==null)nextSunFlareAt=t+12+Math.random()*25;
    if(sunFlareT==null&&t>=nextSunFlareAt){
      sunFlareT=t;
      sunFlareAng=-Math.PI/2+(Math.random()-.5)*.7;
      nextSunFlareAt=t+30+Math.random()*40;
    }
    if(sunFlareT!=null){
      const fe=(t-sunFlareT)/2.2;
      if(fe>=1)sunFlareT=null;
      else{
        const fa=Math.sin(Math.PI*fe);
        const fx=s.x+Math.cos(sunFlareAng)*s.r,fy=s.y+Math.sin(sunFlareAng)*s.r;
        ctx.fillStyle=rg(ctx,fx,fy,0,60+fe*80,[[0,`rgba(255,240,200,${.55*fa})`],[.4,`rgba(255,180,90,${.25*fa})`],[1,'rgba(255,160,70,0)']]);
        ctx.beginPath();ctx.arc(fx,fy,60+fe*80,0,TAU);ctx.fill();
        ctx.strokeStyle=`rgba(255,230,170,${.6*fa})`;
        ctx.lineWidth=1.4;
        for(let q=0;q<5;q++){
          const sa=sunFlareAng+(q-2)*.22;
          const L=(26+fe*46)*(1-Math.abs(q-2)*.18);
          ctx.beginPath();
          ctx.moveTo(fx+Math.cos(sa)*6,fy+Math.sin(sa)*6);
          ctx.lineTo(fx+Math.cos(sa)*L,fy+Math.sin(sa)*L);
          ctx.stroke();
        }
      }
    }
  }
  // Discovery mode — smallest / most specific targets first; first hit wins
  function orbiterPos(o){
    const a=lastT*o.spd+o.phase+(o.lapT0!=null?TAU*Math.min(1,(lastT-o.lapT0)/2.2):0);
    return{
      x:EARTH.x+Math.cos(a)*EARTH.r*o.rx,
      y:EARTH.y+Math.sin(a)*EARTH.r*o.ry-EARTH.r*.55,
    };
  }
  function hitTargets(){
    const t=[];
    const moon=orbiterPos(EARTH_ORBITERS[0]);
    t.push({x:moon.x,y:moon.y,r:EARTH.r*.8,name:'הַיָּרֵחַ',kind:'orbiter',o:EARTH_ORBITERS[0],
            fact:'הַיָּרֵחַ לֹא מֵאִיר בְּעַצְמוֹ — הוּא מַחְזִיר אֵלֵינוּ אֶת אוֹר הַשֶּׁמֶשׁ. שִׂימוּ לֵב שֶׁהַצַּד הַמּוּאָר שֶׁלּוֹ תָּמִיד פּוֹנֶה לַשֶּׁמֶשׁ!'});
    for(const o of EARTH_ORBITERS.slice(1)){
      const sp=orbiterPos(o);
      t.push({x:sp.x,y:sp.y,r:EARTH.r*.7,name:'לַוְיָן',kind:'orbiter',o,
              fact:'לַוְיָנִים מַקִּיפִים אֶת כַּדּוּר הָאָרֶץ וּמְבִיאִים לָנוּ אִינְטֶרְנֶט, טֵלֵוִיזְיָה וְנִוּוּט.'});
    }
    if(nova)t.push({x:nova.x,y:nova.y,r:70,name:'סוּפֶּרְנוֹבָה',
            fact:'פִּיצוּץ עֲנָקִי שֶׁל כּוֹכָב גָּדוֹל בְּסוֹף חַיָּיו — לְרֶגַע הוּא מַבְהִיק יוֹתֵר מִגָּלַקְסְיָה שְׁלֵמָה!'});
    for(const p of PASSERS)
      t.push({x:p.x+(p.ox||0),y:p.y+(p.oy||0),r:Math.max(p.r*1.4,18),name:p.w.name,kind:'passer',p,fact:p.w.fact});
    for(const cm of COMETS)if(cm.delay<=0)
      t.push({x:cm.x,y:cm.y,r:40,name:'שָׁבִיט',
              fact:'כַּדּוּר שֶׁל קֶרַח וְאָבָק. שִׂימוּ לֵב — הַזָּנָב שֶׁלּוֹ תָּמִיד בּוֹרֵחַ מֵהַשֶּׁמֶשׁ!'});
    t.push({x:EARTH.x,y:EARTH.y-EARTH.r*1.1,r:EARTH.r*.45,name:'זֹהַר קוֹטְבִי',kind:'earth',
            fact:'אוֹרוֹת יְרֻקִּים רוֹקְדִים לְיַד הַקֹּטֶב — מַתָּנָה שֶׁל רוּחַ הַשֶּׁמֶשׁ שֶׁפּוֹגֶשֶׁת אֶת כַּדּוּר הָאָרֶץ.'});
    t.push({x:EARTH.x,y:EARTH.y,r:EARTH.r*1.15,name:'כַּדּוּר הָאָרֶץ',kind:'earth',
            fact:'הַבַּיִת שֶׁלָּנוּ! הוּא מִסְתּוֹבֵב כָּל הַזְּמַן — וְכָךְ נוֹצָרִים יוֹם וְלַיְלָה. רוֹאִים אֶת אוֹרוֹת הֶעָרִים בַּצַּד הֶחָשׁוּךְ?'});
    t.push({x:PLANET.x,y:PLANET.y,r:PLANET.r*2.2,name:'שַׁבְּתַאי',kind:'planet',
            fact:'כּוֹכַב לֶכֶת עִם טַבָּעוֹת יָפוֹת. רוֹאִים אֶת הָאֲבָנִים מִסְתּוֹבְבוֹת בָּהֶן? הַפְּנִימִיּוֹת מַקִּיפוֹת הֲכִי מַהֵר!'});
    t.push({x:BH.x,y:BH.y,r:BH.r*3.2,name:'חוֹר שָׁחוֹר',kind:'bh',
            fact:'הַכְּבִידָה שֶׁלּוֹ כָּל כָּךְ חֲזָקָה — שֶׁאֲפִלּוּ אוֹר לֹא מַצְלִיחַ לִבְרֹחַ מִמֶּנּוּ! מַה שֶּׁנּוֹפֵל פְּנִימָה, נֶעְלָם.'});
    for(const g of GALAXIES)
      t.push({x:g.x,y:g.y,r:g.scale*1.3,name:'גָּלַקְסְיָה',kind:'galaxy',g,
              fact:'עִיר עֲנָקִית שֶׁל מִילְיַארְדֵי כּוֹכָבִים. גַּם אֲנַחְנוּ גָּרִים בְּגָלַקְסְיָה — שְׁבִיל הֶחָלָב.'});
    for(const cn of CONSTELLATIONS)if(cn.hit)
      t.push({x:cn.hit.x,y:cn.hit.y,r:cn.hit.r,name:cn.name,fact:cn.fact});
    t.push({x:SUN.x,y:SUN.y,r:SUN.r*1.02,name:'הַשֶּׁמֶשׁ',
            fact:'כַּדּוּר אֵשׁ עֲנָקִי! מִילְיוֹן כַּדּוּרֵי אֶרֶץ יְכוֹלִים לְהִכָּנֵס בְּתוֹכָהּ — וְהִיא מְאִירָה אֶת כָּל מַה שֶּׁרוֹאִים כָּאן.'});
    return t;
  }
  // Clicks land on the game's layers, not the canvas — listen on the document
  // and react only to clicks on the bare sky (not the game UI / poppables)
  const skyClick=e=>{
    if(stopped)return;
    if(e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov')){
      factEl.style.opacity='0';clearTimeout(factTimer);return;}
    const x=e.clientX,y=e.clientY;
    for(const tg of hitTargets()){
      if(Math.hypot(x-tg.x,y-tg.y)>tg.r)continue;
      if(tg.kind==='bh'){
        bhFrenzyT=lastT;
        dustSurge();                 // GRAVITY SURGE: every grain on screen is yanked toward the hole
        if(!ASTRO)ASTRO={t0:lastT,ang0:Math.random()*TAU,dir:Math.random()<.5?-1:1};
      }
      else if(tg.kind==='galaxy')tg.g.boostT=lastT;
      else if(tg.kind==='orbiter'&&tg.o.lapT0==null)tg.o.lapT0=lastT;
      else if(tg.kind==='earth'){
        EARTH.boostT=lastT;
        EARTH_ORBITERS.forEach(o=>{if(o.lapT0==null)o.lapT0=lastT;});
      }
      else if(tg.kind==='planet')PLANET.boostT=lastT;
      else if(tg.kind==='passer')tg.p.boostT=lastT;
      factEl.innerHTML=`<b style="color:#FFD27D">${tg.name}</b><br>${tg.fact}`;
      factEl.style.opacity='1';
      const fw=290,fh=96;
      let ax=tg.x,ay=tg.y,effR;
      if(tg.kind==='orbiter'){ax=EARTH.x;ay=EARTH.y;effR=EARTH.r*3.1;}
      else if(tg.kind==='bh')effR=BH.r*2.4;
      else if(tg.kind==='galaxy')effR=tg.r*0.7;
      else if(tg.kind==='planet')effR=tg.r*0.45;
      else effR=Math.min(tg.r,140);
      let top=ay-effR-fh-12;
      if(top<8)top=ay+effR+12;
      top=Math.max(8,Math.min(H-fh-8,top));
      factEl.style.left=`${Math.max(8,Math.min(W-fw,ax-fw/2))}px`;
      factEl.style.top=`${top}px`;
      clearTimeout(factTimer);
      factTimer=setTimeout(()=>{factEl.style.opacity='0';},60000);
      return;
    }
    if(!nova){
      for(const s of STARS_NEAR){
        if(Math.hypot(x-s.x,y-s.y)<=22){
          nova=buildNova(s,lastT);
          factEl.style.opacity='0';
          return;
        }
      }
    }
    for(let i=0;i<6;i++){
      const s=TRAVELERS[(Math.random()*TRAVELERS.length)|0];
      const a=Math.random()*TAU,sp=1.6+Math.random()*2.2;
      s.x=x;s.y=y;s.vx=Math.cos(a)*sp;s.vy=Math.sin(a)*sp;
    }
    factEl.style.opacity='0';
  };
  document.addEventListener('click',skyClick);
  function onResize(){W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);buildScene();}
  window.addEventListener('resize',onResize);
  cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  buildScene();
  let animId=null,lastFrameT=0;
  function frame(ts){
    if(stopped)return;
    const t=ts/1000;
    const dt=Math.min(.05,t-lastFrameT);
    lastFrameT=t;lastT=t;
    SURGE=clickEnv(bhFrenzyT,t,3.5);
    adaptQuality(dt,ts);
    renderGL(t,dt);                       // the sky + the black hole (GL layer, underneath)
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(spaceLayer.cv,0,0,W,H);   // constellations
    drawStars(t);
    drawNova(t);
    drawTravelers(t);
    for(const g of GALAXIES)drawGalaxy(g,t,dt);
    updatePassers(t,dt);
    for(const p of PASSERS)drawPasser(p,t);   // passing worlds — behind Saturn & Earth
    updateMover(PLANET.mv,PLANET,t,dt);
    updateMover(EARTH.mv,EARTH,t,dt);
    if(PLANET.mv.state!=='wait')drawPlanet(t,dt);
    if(EARTH.mv.state!=='wait'){
      drawEarthOrbiters(t,true);
      drawEarth(t,dt);
      drawEarthOrbiters(t,false);
    }
    drawComets(t,dt);
    drawTidal(t);
    drawAstro(t);
    ctx.drawImage(vigLayer.cv,0,0,W,H);
    drawSun(t);
    animId=requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // expose a little for the harness/tests
  window._space2={get bh(){return BH;},get gl(){return{hdr:HDR,lost:glLost,nogl:NOGL,rw:RW,rh:RH,camD,quality:GLQS[qIdx].name,emaMs,phi};},get dust(){return PS;},
    get passers(){return PASSERS;},get passStats(){return passStats;},get movers(){return{saturn:PLANET.mv,earth:EARTH.mv};},
    // test hook: fast-forward the wanderers (Saturn + Earth) and report how close they came to the hole
    simulateMovers(sec){let t=lastT,minS=1e9,minE=1e9,trips=0;for(let k=0;k<sec*60;k++){t+=1/60;const s0=PLANET.mv.state,e0=EARTH.mv.state;
        updateMover(PLANET.mv,PLANET,t,1/60);updateMover(EARTH.mv,EARTH,t,1/60);
        if(s0==='move'&&PLANET.mv.state==='wait')trips++;if(e0==='move'&&EARTH.mv.state==='wait')trips++;
        if(PLANET.mv.state==='move'&&t>=PLANET.mv.startAt)minS=Math.min(minS,Math.hypot(PLANET.x-BH.x,PLANET.y-BH.y)/BH.r);
        if(EARTH.mv.state==='move'&&t>=EARTH.mv.startAt)minE=Math.min(minE,Math.hypot(EARTH.x-BH.x,EARTH.y-BH.y)/BH.r);}
      return{trips,saturnClosest:+minS.toFixed(2),earthClosest:+minE.toFixed(2),saturn:PLANET.mv.state,earth:EARTH.mv.state};},
    // test hooks: parade every world across the frame at once · fast-forward the passers' motion
    spawnAll(){PASSERS=[];WORLDS.forEach((w,i)=>{spawnPasser(lastT,w.id,W*(.08+i*.115));PASSERS[PASSERS.length-1].y=H*(.14+(i%2)*.28+(i%3)*.06);});},
    simulate(sec){let t=lastT,minD=1e9;for(let k=0;k<sec*60;k++){t+=1/60;updatePassers(t,1/60);for(const p of PASSERS)minD=Math.min(minD,Math.hypot(p.x+(p.ox||0)-BH.x,p.y+(p.oy||0)-BH.y)/BH.r);}
      TIDAL.length=0;nextPassAt=lastT+3;              // drop streaks stamped with simulated (future) time
      return{...passStats,closest:+minD.toFixed(2),active:PASSERS.length};}};
  // the loader calls this when the background is switched away
  return function cleanup(){
    stopped=true;
    if(animId)cancelAnimationFrame(animId);
    window.removeEventListener('resize',onResize);
    document.removeEventListener('click',skyClick);
    glcv.removeEventListener('webglcontextlost',onLost);
    glcv.removeEventListener('webglcontextrestored',onRestored);
    try{const lc=gl.getExtension('WEBGL_lose_context');if(lc)lc.loseContext();}catch(e){}
    factEl.style.opacity='0';
    stage.innerHTML='';
  };
  },
};
})();
