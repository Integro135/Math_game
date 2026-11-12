/* ── Space background v4 — the deep-space scene, repainted to be beautiful round the SAME black hole ──
   The 🌌 (galaxy) theme's backdrop. Three canvases are stacked inside the stage:

   • BOTTOM — WebGL2: the sky and THE BLACK HOLE, carried over from space2.bg.js
     UNCHANGED (the shaders, the camera, the adaptive quality governor, the baked
     sky, the precessing hole with its disk, jets, photon ring and lensed Milky
     Way, the 3-D dust simulation, the still-painted sky when there is no WebGL2,
     the 2-D lens helpers bhPull / lensImage). The hole sits where it always did
     (x = 0.90 W, y = 0.36 H, shadow radius 0.075·min(W,H)). See the long comment
     at the top of space2.bg.js for how it works.

   • MIDDLE — THE DEEP SKY (new in v4, 2026-11): a still painting on a canvas of
     its own — the Milky Way with its dust lanes, an emission nebula in rose and
     teal, a blue reflection nebula round a young cluster, far galaxies, a
     globular cluster, thousands of stars. Gas is flat colour cut by tiling fbm
     noise tiles into clouds and filaments. It is painted once per layout
     (bakeDeepSky) and never again: the browser composites it, so it costs
     nothing per frame. It melts away round the hole, where the hole's own
     lensed sky shows untouched.

   • TOP — a transparent 2-D canvas: EVERYTHING THAT MOVES. v4 repainted its art:
     the worlds' surface maps are painted PER PIXEL from noise (gasMap / rockMap /
     paintEarthMaps: bands that wander and streak, seas with deep basins, swirling
     weather), every world has a real night side away from the Sun (a soft curved
     terminator, city lights on the Earth's), Saturn's rings are hundreds of fine
     ringlets, the galaxies have dust lanes and star nurseries, the Sun has a wide
     corona with streamers, a granulated face and prominences of thin strands.
     The engine below is v3's, redesigned from scratch
     (2026-11) around one rule — PAINT ONCE, BLIT MANY. The old layer issued
     ~3,300 canvas calls a frame (every star, ring, crater and granule re-stroked
     as vectors); this one issues a few hundred, because every object is a sprite
     baked when the scene is laid out:
       – stars: the faint ones are six batched paths (one per twinkle phase), the
         bright ones are three baked star sprites; those near the hole are lensed
         once at layout, not every frame;
       – the nebula, the three constellations and the three galaxies are baked
         sprites (a galaxy's slow turn is re-rendered into its own small canvas
         twice a second, not every frame);
       – WORLDS (Saturn, Earth, the Moon and the passing planets) are painted
         surface maps wrapped on a sphere as a row of longitude strips into a small
         canvas of their own only ~12 times a second, masked to the disc and
         shaded by ONE baked overlay; the scene blits that small canvas each
         frame. Saturn's rings are two baked halves (behind / in front);
       – the Sun's limb, its corona and its prominences are baked sprites;
       – comets, the supernova, shooting stars, travellers and the tidal streaks
         are a sprite or a single batched path each;
       – the dust grains keep their simulation and their look but are drawn in
         buckets (colour × brightness × size): ~40 paths instead of ~700 calls.
     The layer also follows the GL quality tier: on the two cheap tiers it drops
     the nebula and half of the stars and travellers.

   The cast: SATURN and EARTH (with the Moon and two satellites) roam the frame on
   slow curved paths that keep clear of the hole; the other planets, Pluto and an
   asteroid drift past one or two at a time; three galaxies turn; comets cross
   with their tails away from the Sun; a little ROCKET patrols and an ASTRONAUT
   floats beside the Earth; a star now and then goes supernova.

   Taps (on the bare sky — the game's own layers are ignored): any object → its
   Hebrew fact in the discovery bubble, plus: the black hole → a feeding frenzy
   (the disk and jets flare, every grain is yanked in, a space rock spirals in
   and is pulled into a streak) · Saturn / Earth / a passing world → it spins up ·
   the Moon or a satellite → an extra lap · a galaxy → it whirls · a constellation
   → it lights up · a bright star → a supernova · the rocket → a loop · the
   astronaut → a somersault · the Sun → a flare · empty sky → a burst of
   travellers.

   Skin: game/skins/space.skin.css · Aids: space.
   Loaded by game/js/bg-loader.js (theme galaxy → space4 in themes.js).
   Harness: backgrounds/space4.html. Docs: backgrounds/README.md.
   Hooks: window._space4. The previous scene (space2.bg.js) stays, unloaded. */
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

// ── the sky library: noise, black body, star layers, the Milky Way. Shared by the
//    scene shader (as a fallback) and the SKY BAKE shader, which renders the whole
//    sky ONCE into a texture — the camera and the sky never move, so the per-pixel
//    procedural sky (~60 hashes + 3 black-body curves) was the single biggest cost
const SKY_LIB=`
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
    if(uLite > 0.5 && k >= 3) break;                          // cheap tiers: three octaves
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
  // A SPARSE lensed star field, deliberately TIER-INDEPENDENT. Gating this on uLite meant a
  // quality change made hundreds of stars appear or vanish: on load the scene came up at a
  // tier the device couldn't hold, showed a swarm of blurry upscaled dots for several
  // seconds, then popped them all away when it downshifted. The crisp 2-D layer carries the
  // bright stars; these exist only so the field STREAKS around the hole, so they are few and
  // faint — and the dense speckle layer (N=190, the main source of the blur) is gone: at any
  // GL resolution below 1× it upscaled into mush.
  float dens = 0.45 + 2.6*band*(1.0 - rift*0.7) + 2.5*core; // stars thicken toward the plane and the core
  col += starLayer(d, 24.0, 0.05,       1.7,  1.0);
  col += starLayer(d, 70.0, 0.028*dens, 0.65, 2.0);
  return col;
}`;

// ── the sky bake: one full-frame pass per layout/quality change into a texture that
//    covers the frustum plus a margin for lensing deflection (uv = tan-plane coords)
const SKYBAKE_FS=`#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;
uniform vec2  uRes, uSkyUv0, uSkyUvRange;
uniform vec3  uCamFwd, uCamRight, uCamUp, uGalN, uGalCore;
uniform float uTanHalf, uPixAng, uEnc, uLite;
vec3 enc(vec3 c){ return uEnc < 1.0 ? sqrt(max(c, 0.0)*uEnc) : c; }
${SKY_LIB}
void main(){
  vec2 uv = uSkyUv0 + (gl_FragCoord.xy/uRes)*uSkyUvRange;
  vec3 d = normalize(uCamFwd + uTanHalf*(uv.x*uCamRight + uv.y*uCamUp));
  fragColor = vec4(enc(sky(d)), 1.0);
}`;

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
uniform float uLite;                  // 1 on the cheap tiers: fewer noise octaves, fewer jet samples
uniform sampler2D uSky;               // the baked sky
uniform vec2  uSkyUv0, uSkyUvRange;   // its tan-plane coverage

const float PI = 3.14159265, TAU = 6.28318531;
const float R_BOUND = 15.0, ROT = 2.0, JET_LEN = 42.0, JET_RMAX = 7.8;
vec3 enc(vec3 c){ return uEnc < 1.0 ? sqrt(max(c, 0.0)*uEnc) : c; }
vec3 dec(vec3 c){ return uEnc < 1.0 ? c*c/uEnc : c; }
${SKY_LIB}
// the sky along a world direction: one texture fetch from the bake; the procedural
// sky only for the few rays bent past the bake's margin (or behind the camera)
vec3 skyLookup(vec3 d){
  float z = dot(d, uCamFwd);
  if(z > 0.05){
    vec2 uv = vec2(dot(d, uCamRight), dot(d, uCamUp))/(z*uTanHalf);
    vec2 tc = (uv - uSkyUv0)/uSkyUvRange;
    if(tc.x >= 0.0 && tc.x <= 1.0 && tc.y >= 0.0 && tc.y <= 1.0) return dec(texture(uSky, tc).rgb);
  }
  return sky(d);
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
  int N = uLite > 0.5 ? 6 : 12;
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
  float n2 = uLite > 0.5 ? 0.5 : vnoise3(q*4.5 + vec3(uDiskTime*0.2, 0.0, uDiskTime*0.5));
  dens *= 0.35 + 1.0*n + 0.5*n2;
  vec3 tangent = uSpin*normalize(vec3(-p.z, 0.0, p.x));                        // fast inner flow → Doppler
  const float beta = 0.45; float gamma = inversesqrt(1.0 - beta*beta);
  float D = 1.0/(gamma*(1.0 + beta*dot(tangent, rayDir)));
  float g = D*sqrt(max(1.0 - 1.0/r, 0.0));
  // a two-stop ramp stands in for the black-body curve here (this runs every march step):
  // redshifted → ember orange, blueshifted → white
  vec3 c = mix(vec3(1.0, 0.55, 0.28), vec3(1.0, 0.95, 0.85), clamp((g - 0.55)*1.6, 0.0, 1.0));
  return c*g*g*dens*uHalo;
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
vec3 traceUV(vec2 uv){
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
      return col + skyLookup(uHoleRotT*dd);
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
      col += (1.0-acc)*skyLookup(uHoleRotT*vn);
    }
  }
  return col;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - uHolePx)/uRes.y*2.0;             // off-axis: the hole is at uHolePx
  // Near the CRITICAL CURVE (b = 3√3/2 r_s) the lensing magnification diverges: the photon
  // ring is a band far narrower than a pixel carrying enormous brightness, so ONE sample per
  // pixel renders it as a dotted chain of beads — only the pixels whose centre happens to
  // land on the band light up. That is the "pixelated at some angles" look (which stretch of
  // the ring is bright depends on the hole's orientation), and no resolution fixes it —
  // PRE-FILTERING does. So for pixels whose impact parameter is near critical, box-filter
  // the pixel RADIALLY, the direction the ring's brightness varies fastest: 2-3 marches in
  // ~2% of the frame. (b comes from the pixel's own ray, so it holds at any zoom.)
  vec3 d0 = uHoleRot*normalize(uCamFwd + uTanHalf*(uv.x*uCamRight + uv.y*uCamUp));
  vec3 p0 = uHoleRot*uCamPos;
  float b = length(p0 - dot(p0, d0)*d0);
  if(b > 2.42 && b < 3.5){                                      // 0.93 … 1.35 × b_crit
    int NS = uLite > 0.5 ? 2 : 3;
    vec2 rdir = normalize(uv + vec2(1e-6))*(2.0/uRes.y);        // one internal pixel, radially, in uv units
    vec3 sum = vec3(0.0);
    for(int i=0; i<3; i++){
      if(i >= NS) break;
      sum += traceUV(uv + rdir*((float(i) - float(NS-1)*0.5)/float(NS)));
    }
    fragColor = vec4(enc(sum/float(NS)), 1.0);
    return;
  }
  fragColor = vec4(enc(traceUV(uv)), 1.0);
}`;

// (the dust grains are simulated here but DRAWN on the crisp 2-D layer — see drawDust2D —
//  because anything drawn into the low-resolution GL layer upscales into soft blobs)
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
  // the vignette (was a full-screen 2-D blit every frame; here it is free)
  float mn = min(uRes.x, uRes.y), mx = max(uRes.x, uRes.y);
  float vt = clamp((length((vUv - 0.5)*uRes) - 0.45*mn)/(0.8*mx - 0.45*mn), 0.0, 1.0);
  float va = vt < 0.7 ? 0.18*vt/0.7 : 0.18 + 0.37*(vt - 0.7)/0.3;
  c = mix(c, vec3(2.0, 1.0, 8.0)/255.0, va);
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
window.BACKGROUNDS.space4={
  skin:'space',                 // game look:  game/skins/space.skin.css
  aids:'space',                 // aid art:    aids/space.aids.js (rocket + stars)
  // the WebGL2 ray-tracer compiles its shaders and bakes the sky before the
  // first frame — seconds on a weak machine — so the loader shows a veil until
  // this scene calls BG_LOADING.done() from its first rendered frame
  slowLoad:true,
  init({stage}){
  const layer=stage;
  let stopped=false;
  layer.innerHTML='';layer.style.overflow='hidden';
  const DPR=Math.min(devicePixelRatio||1,2),TAU=Math.PI*2,DEG=Math.PI/180;
  let DPR2=DPR;                       // the 2-D layer's pixel ratio — capped by the quality tier
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
  let BH,SUN,lastT=0;
  let bhFrenzyT=null;   // a tap on the black hole → a short feeding frenzy
  let SURGE=0;          // the frenzy's 0..1 envelope — boosts bhPull + the GL disk / jets / dust each frame

  /* ═════════════════════════ GL: the black hole & the lensed sky ═══════════ */
  // adaptive quality: start at MEDIUM, climb while the frame time allows, drop when it
  // doesn't — down to POTATO for weak devices. scale = GL internal resolution in CSS px
  // (the DPR is deliberately ignored: a retina screen must not quadruple the ray-marching
  // work); lite = fewer noise octaves / jet samples; dpr = the 2-D layer's pixel-ratio cap.
  // The GL canvas is CSS-upscaled, so `scale` IS how pixelated the hole looks: potato is
  // the last-resort floor, everything above it was raised a notch (0.42 read as blocky).
  const GLQS=[{name:'potato',scale:.28,steps:90,lite:1,dpr:1},{name:'low',scale:.48,steps:130,lite:1,dpr:1.25},
              {name:'medium',scale:.72,steps:220,lite:0,dpr:1.5},{name:'high',scale:1.0,steps:300,lite:0,dpr:2}];
  const AUTO_QUALITY=true;                     // false → stays at the starting tier
  // The work scales with the WINDOW's pixel count, not with the tier alone, so the STARTING
  // tier comes from a pixel budget: a 1080p or 4K window opens lower than a 720p one instead
  // of spending its first seconds too slow and then downshifting — which is visible as a
  // swarm of blurry dots that pops away. PX_MAX is a hard ceiling on ray-marched pixels so a
  // huge window can't ask for absurd work even after climbing.
  const PX_START=6.5e5, PX_MAX=1.6e6;
  const startTier=()=>{let i=2;while(i>0&&W*H*GLQS[i].scale*GLQS[i].scale>PX_START)i--;return i;};
  let qIdx=startTier(),emaMs=16,lastQChange=0,downshiftAt=-1e9,qCeil=GLQS.length-1;
  const qFails=GLQS.map(()=>0);                // a tier that stalled twice is taken off the table
  const TAN_HALF=0.25;                         // narrow fov: the hole is far & small, the off-axis view stays sane
  const DISK_IN=3.0,DISK_OUT=12.0,SPIN=-1.0,T_PEAK=9800,JET_GAIN=0.5,HALO_GAIN=0.11;
  const CAM_EL=0.28;                           // camera ~16° above the hole's rest plane
  const HOLE_TILT=0.25;                        // the hole's axis leans this much → it precesses on a cone ("spinning")
  const SPIN_RATE=0.16;                        // rad/s of precession — one wobble in ~40 s
  let HDR=!NOGL&&!!(gl.getExtension('EXT_color_buffer_float')||gl.getExtension('EXT_color_buffer_half_float'));
  let ENC=HDR?1.0:0.125;
  let glLost=NOGL,P=null,T=null,vao=null,RW=1,RH=1;
  let camPos=[0,0,1],camFwd=[0,0,-1],camRight=[1,0,0],camUp=[0,1,0],camD=60,galN=[0,1,0],galCore=[0,0,-1],holePx=[0,0];
  let diskTime=0,phi=0;
  const Ruser=M3.axis([1,0,0],HOLE_TILT);
  let Rh2w=M3.ident(),Rw2h=M3.ident();
  function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('space4 shader: '+gl.getShaderInfoLog(s));return s;}
  function program(fs,vs){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs||VS));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('space4 link: '+gl.getProgramInfoLog(p));
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
  const NP=260;                       // dust grains (fewer, crisp — drawn on the 2-D layer)
  function setupGL(){
    P={scene:program(SCENE_FS),skybake:program(SKYBAKE_FS),bright:program(BRIGHT_FS),down:program(DOWN_FS),blur:program(BLUR_FS),comp:program(COMP_FS)};
    vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    T=null;buildTargets();
  }
  function buildTargets(){
    if(T)Object.values(T).forEach(freeTarget);
    const s=Math.min(GLQS[qIdx].scale,Math.sqrt(PX_MAX/Math.max(W*H,1)));   // never more than PX_MAX marched pixels
    RW=Math.max(160,Math.round(W*s));RH=Math.max(90,Math.round(H*s));
    glcv.width=RW;glcv.height=RH;                          // the GL canvas IS the internal resolution (CSS upscales)
    const mk=div=>makeTarget(Math.max(8,Math.round(RW/div)),Math.max(8,Math.round(RH/div)));
    T={scene:mk(1),b1a:mk(2),b1b:mk(2),b2a:mk(4),b2b:mk(4),b3a:mk(8),b3b:mk(8)};
    if(!Object.values(T).every(t=>t.ok)){if(HDR){HDR=false;ENC=0.125;buildTargets();return;}}
    if(BH)holePx=[BH.x/W*RW,(1-BH.y/H)*RH];
  }
  // the 2-D layer's backing resolution follows the tier (full-screen canvas work is fill-rate bound)
  function apply2DScale(){
    DPR2=Math.min(DPR,GLQS[qIdx].dpr);
    cv.width=Math.round(W*DPR2);cv.height=Math.round(H*DPR2);ctx.setTransform(DPR2,0,0,DPR2,0,0);
  }
  // bake the sky (direction → colour) into a texture covering the frustum + a lensing margin.
  // The margin makes the baked area ~2.4× the frame, so this ONE pass is the heaviest thing
  // at load (and on every tier change) — hence a density below one texel per internal pixel:
  // the result is upscaled anyway, and the frame's own high-frequency detail lives in the
  // crisp 2-D layer. (uPixAng below must track SKY_DENS: it is the star-AA footprint.)
  const SKY_DENS=0.85;
  let skyUv0=[0,0],skyUvRange=[1,1];
  function bakeSky(){
    if(glLost||!P||!BH)return;
    const M=0.7;                                           // margin in tan-plane units (≈10° of deflection)
    const x0=-holePx[0]/RH*2-M,x1=(RW-holePx[0])/RH*2+M,y0=-holePx[1]/RH*2-M,y1=(RH-holePx[1])/RH*2+M;
    skyUv0=[x0,y0];skyUvRange=[x1-x0,y1-y0];
    const dens=RH/2*SKY_DENS;                              // texels per internal pixel
    const tw=Math.min(2048,Math.round(skyUvRange[0]*dens)),th=Math.min(2048,Math.round(skyUvRange[1]*dens));
    if(T.sky)freeTarget(T.sky);
    T.sky=makeTarget(tw,th);
    const K=P.skybake.u;
    gl.useProgram(P.skybake.p);
    gl.uniform2f(K.uRes,tw,th);gl.uniform2f(K.uSkyUv0,skyUv0[0],skyUv0[1]);gl.uniform2f(K.uSkyUvRange,skyUvRange[0],skyUvRange[1]);
    gl.uniform3fv(K.uCamFwd,camFwd);gl.uniform3fv(K.uCamRight,camRight);gl.uniform3fv(K.uCamUp,camUp);
    gl.uniform3fv(K.uGalN,galN);gl.uniform3fv(K.uGalCore,galCore);
    gl.uniform1f(K.uTanHalf,TAN_HALF);gl.uniform1f(K.uPixAng,2*TAN_HALF/RH/SKY_DENS);gl.uniform1f(K.uEnc,ENC);gl.uniform1f(K.uLite,GLQS[qIdx].lite);
    drawPass(P.skybake,T.sky);
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
    bakeSky();
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
  }
  // a grain (hole frame) → its lensed screen image (CSS px): behind the hole the image is
  // pushed out to the Einstein radius and hidden inside the shadow; in front it shows
  // against the shadow (the same point-mass lens the old GL vertex shader used)
  function lensProjectJS(x,y,z){
    const pw=M3.apply(Rh2w,[x,y,z]);
    const wx=pw[0]-camPos[0],wy=pw[1]-camPos[1],wz=pw[2]-camPos[2];
    const zc=wx*camFwd[0]+wy*camFwd[1]+wz*camFwd[2];
    if(zc<.25)return null;
    const sx=(wx*camRight[0]+wy*camRight[1]+wz*camRight[2])/zc,sy=(wx*camUp[0]+wy*camUp[1]+wz*camUp[2])/zc;
    const Dl=camD,Ds=Math.hypot(wx,wy,wz),Dls=Ds-Dl,beta=Math.max(Math.hypot(sx,sy),1e-5);
    let b=beta*Dl,vis=1;
    if(Dls>.05){const tE2=2*Dls/(Dl*Ds),th=.5*(beta+Math.sqrt(beta*beta+4*tE2));vis*=Math.min(2.5,Math.max(1,th/beta));b=th*Dl;}
    b=Math.max(b,2.7*sstep(-.5,1,Dls));
    vis*=1-(1-sstep(2.35,2.65,b))*sstep(0,.8,Dls);
    const k=(b/Dl)/beta/TAN_HALF*(H/2);
    return{x:BH.x+sx*k,y:BH.y-sy*k,vis,dz:zc};
  }
  // the grains, drawn CRISP on the full-resolution 2-D layer: a sharp point plus a short
  // motion streak (cool blue-white grain → ember → white-hot), exactly as in space2 — but
  // BATCHED. Each grain is sorted into a bucket of (heat colour × brightness × size) and a
  // bucket is ONE path: ~40 fills and strokes a frame instead of a fillStyle string, a
  // fill and a stroke for every one of the 260 grains.
  const DQH=10,DQA=8,DQS=3,DNB=DQH*DQA*DQS;
  const dHead=new Int16Array(DNB),dNext=new Int16Array(NP),dXY=new Float32Array(NP*6);
  const dFill=[],dStroke=[],dGlow=[];
  for(let h=0;h<DQH;h++){
    const heat=(h+.5)/DQH;let c;
    if(heat<.75){const u=heat/.75;c=[180+75*u,205-20*u,255-145*u];}else{const u=(heat-.75)/.25;c=[255,185+61*u,110+120*u];}
    const col=(c[0]|0)+','+(c[1]|0)+','+(c[2]|0);
    for(let a=0;a<DQA;a++){const al=(a+.5)/DQA;
      dFill.push('rgba('+col+','+al.toFixed(3)+')');dStroke.push('rgba('+col+','+(al*.45).toFixed(3)+')');dGlow.push('rgba('+col+','+(al*.16).toFixed(3)+')');}
  }
  let dustN=NP;                         // grains drawn — halved on the two cheap tiers
  function drawDust2D(){
    const surge=dustSurgeT==null?0:Math.max(0,1-(lastT-dustSurgeT)/3.5);
    dHead.fill(-1);
    for(let i=0;i<dustN;i++){
      const o=i*8,x=PS[o],y=PS[o+1],z=PS[o+2],r=Math.hypot(x,y,z);
      const hp=lensProjectJS(x,y,z);if(!hp||hp.vis<=.02)continue;
      const heat=Math.min(1,Math.max(0,(7-r)/5.5)),fade=sstep(1.06,1.5,r),seed=PS[o+6];
      const distF=Math.min(1.4,Math.max(.35,Math.pow(camD/hp.dz,.7)));
      const a=Math.min(1,(.28+.9*heat*heat)*(.6+.8*seed)*fade*distF*(1+surge*.6)*Math.min(1.6,hp.vis));
      if(a<.04)continue;
      const s=(1+1.6*heat)*(.7+.6*seed)*Math.min(1.5,Math.max(.7,Math.sqrt(camD/hp.dz)));
      const o6=i*6;dXY[o6]=hp.x;dXY[o6+1]=hp.y;dXY[o6+2]=s;dXY[o6+5]=0;
      // a short motion streak behind the head — long enough on the far, slow grains to
      // tell them apart from a star, a real trail on the fast ones near the hole
      const tail=TAIL*(1+2.2*(1-heat))+.9*heat;
      const tp=lensProjectJS(x-PS[o+3]*tail,y-PS[o+4]*tail,z-PS[o+5]*tail);
      if(tp&&tp.vis>.02){
        const dx=hp.x-tp.x,dy=hp.y-tp.y,L=Math.hypot(dx,dy);
        if(L>.9){const cap=Math.min(L,26);dXY[o6+3]=hp.x-dx/L*cap;dXY[o6+4]=hp.y-dy/L*cap;dXY[o6+5]=1;}
      }
      const key=(Math.min(DQH-1,(heat*DQH)|0)*DQA+Math.min(DQA-1,(a*DQA)|0))*DQS+(s<1.5?0:s<2.4?1:2);
      dNext[i]=dHead[key];dHead[key]=i;
    }
    ctx.lineCap='round';
    for(let key=0;key<DNB;key++){
      const first=dHead[key];if(first<0)continue;
      const sq=key%DQS,ca=(key/DQS)|0,hq=(ca/DQA)|0;
      ctx.strokeStyle=dStroke[ca];ctx.lineWidth=sq===0?.8:sq===1?1.25:1.9;
      ctx.beginPath();let any=false;
      for(let j=first;j>=0;j=dNext[j]){const o=j*6;if(dXY[o+5]){ctx.moveTo(dXY[o+3],dXY[o+4]);ctx.lineTo(dXY[o],dXY[o+1]);any=true;}}
      if(any)ctx.stroke();
      ctx.fillStyle=dFill[ca];ctx.beginPath();
      for(let j=first;j>=0;j=dNext[j]){const o=j*6,s=dXY[o+2];
        if(s<2)ctx.rect(dXY[o]-s/2,dXY[o+1]-s/2,s,s);                 // a single hard pixel — no blur
        else{ctx.moveTo(dXY[o]+s*.5,dXY[o+1]);ctx.arc(dXY[o],dXY[o+1],s*.5,0,6.2832);}}
      ctx.fill();
      if(hq>=8){                                                       // the embers about to go over: a tight glow
        ctx.fillStyle=dGlow[ca];ctx.beginPath();
        for(let j=first;j>=0;j=dNext[j]){const o=j*6,s=dXY[o+2];ctx.moveTo(dXY[o]+s*1.9,dXY[o+1]);ctx.arc(dXY[o],dXY[o+1],s*1.9,0,6.2832);}
        ctx.fill();
      }
    }
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
    // rAF is VSYNC-LOCKED: a frame with plenty of GPU headroom still measures ~16.7 ms on a
    // 60 Hz screen, so the old "climb below 11 ms" gate was unreachable there and the scene
    // sat at its starting tier forever. Keeping up with the refresh IS the signal to climb;
    // a GPU that can't hold 60 Hz quantises to ~33 ms, well past the 27 ms downshift.
    if(emaMs>27&&qIdx>0){
      if(++qFails[qIdx]>=2&&qIdx-1<qCeil)qCeil=qIdx-1;     // this tier stalled twice — stop climbing back into it
      qIdx--;lastQChange=now;downshiftAt=now;buildTargets();apply2DScale();bakeSky();
    }
    else if(emaMs<19&&qIdx<qCeil&&now-downshiftAt>45000&&now-lastQChange>6000){
      qIdx++;lastQChange=now;buildTargets();apply2DScale();bakeSky();
    }
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
    gl.uniform1f(S.uLite,GLQS[qIdx].lite);
    if(T.sky){bindTex(0,T.sky.tex,S.uSky);gl.uniform2f(S.uSkyUv0,skyUv0[0],skyUv0[1]);gl.uniform2f(S.uSkyUvRange,skyUvRange[0],skyUvRange[1]);}
    else gl.uniform2f(S.uSkyUvRange,0,0);                    // no bake yet → every lookup falls back to the procedural sky
    drawPass(P.scene,T.scene);
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
    // the halo FIRST — a radial gradient starting at r=R also paints its whole
    // interior with the inner stop, so painting it last washed the shadow khaki
    c.fillStyle=rg(c,BH.x,BH.y,R,R*1.9,[[0,'rgba(255,210,150,.35)'],[1,'rgba(255,190,120,0)']]);
    c.beginPath();c.arc(BH.x,BH.y,R*1.9,0,TAU);c.fill();
    c.fillStyle='#000000';c.beginPath();c.arc(BH.x,BH.y,R,0,TAU);c.fill();
    c.strokeStyle='rgba(255,214,150,.85)';c.lineWidth=Math.max(1.4,R*.055);
    c.beginPath();c.arc(BH.x,BH.y,R*1.035,0,TAU);c.stroke();
  }
  const onLost=e=>{e.preventDefault();glLost=true;};
  const onRestored=()=>{try{setupGL();updateCamera();glLost=false;}catch(err){console.error(err);}};
  glcv.addEventListener('webglcontextlost',onLost);
  glcv.addEventListener('webglcontextrestored',onRestored);
  if(!NOGL){try{setupGL();}catch(err){console.error(err);glLost=true;}}
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
  // the fixed sky objects' names and facts (Hebrew + niqqud)
  const FACT={
    moon:['הַיָּרֵחַ','הַיָּרֵחַ לֹא מֵאִיר בְּעַצְמוֹ — הוּא מַחְזִיר אֵלֵינוּ אֶת אוֹר הַשֶּׁמֶשׁ. שִׂימוּ לֵב שֶׁהַצַּד הַמּוּאָר שֶׁלּוֹ תָּמִיד פּוֹנֶה לַשֶּׁמֶשׁ!'],
    sat:['לַוְיָן','לַוְיָנִים מַקִּיפִים אֶת כַּדּוּר הָאָרֶץ וּמְבִיאִים לָנוּ אִינְטֶרְנֶט, טֵלֵוִיזְיָה וְנִוּוּט.'],
    nova:['סוּפֶּרְנוֹבָה','פִּיצוּץ עֲנָקִי שֶׁל כּוֹכָב גָּדוֹל בְּסוֹף חַיָּיו — לְרֶגַע הוּא מַבְהִיק יוֹתֵר מִגָּלַקְסְיָה שְׁלֵמָה!'],
    comet:['שָׁבִיט','כַּדּוּר שֶׁל קֶרַח וְאָבָק. שִׂימוּ לֵב — הַזָּנָב שֶׁלּוֹ תָּמִיד בּוֹרֵחַ מֵהַשֶּׁמֶשׁ!'],
    aurora:['זֹהַר קוֹטְבִי','אוֹרוֹת יְרֻקִּים רוֹקְדִים לְיַד הַקֹּטֶב — מַתָּנָה שֶׁל רוּחַ הַשֶּׁמֶשׁ שֶׁפּוֹגֶשֶׁת אֶת כַּדּוּר הָאָרֶץ.'],
    earth:['כַּדּוּר הָאָרֶץ','הַבַּיִת שֶׁלָּנוּ! הוּא מִסְתּוֹבֵב כָּל הַזְּמַן — וְכָךְ נוֹצָרִים יוֹם וְלַיְלָה. רוֹאִים אֶת אוֹרוֹת הֶעָרִים בַּצַּד הֶחָשׁוּךְ?'],
    saturn:['שַׁבְּתַאי','כּוֹכַב לֶכֶת עִם טַבָּעוֹת יָפוֹת. רוֹאִים אֶת הָאֲבָנִים מִסְתּוֹבְבוֹת בָּהֶן? הַפְּנִימִיּוֹת מַקִּיפוֹת הֲכִי מַהֵר!'],
    bh:['חוֹר שָׁחוֹר','הַכְּבִידָה שֶׁלּוֹ כָּל כָּךְ חֲזָקָה — שֶׁאֲפִלּוּ אוֹר לֹא מַצְלִיחַ לִבְרֹחַ מִמֶּנּוּ! מַה שֶּׁנּוֹפֵל פְּנִימָה, נֶעְלָם.'],
    galaxy:['גָּלַקְסְיָה','עִיר עֲנָקִית שֶׁל מִילְיַארְדֵי כּוֹכָבִים. גַּם אֲנַחְנוּ גָּרִים בְּגָלַקְסְיָה — שְׁבִיל הֶחָלָב.'],
    sun:['הַשֶּׁמֶשׁ','כַּדּוּר אֵשׁ עֲנָקִי! מִילְיוֹן כַּדּוּרֵי אֶרֶץ יְכוֹלִים לְהִכָּנֵס בְּתוֹכָהּ — וְהִיא מְאִירָה אֶת כָּל מַה שֶּׁרוֹאִים כָּאן.']
  };
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
  /* ── NOISE: what makes gas look like gas and a world like a world ────────────
     A tiling fbm (value noise, summed octaves). Used two ways: as small ALPHA
     TILES that cut flat colour into clouds and filaments (the deep sky, the Sun's
     granulation), and PER PIXEL when a world's surface map is painted (bands,
     seas, weather). All of it happens once, when the scene is laid out.          */
  function mulberry(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  // f(u, v [, ridged]) for u, v in [0,1) → 0..1, tiling in both; P0 = lattice cells across at the first octave
  function makeFbm(seed,oct,P0){
    const R=mulberry(seed),L=[];
    for(let o=0;o<oct;o++){const P=P0<<o,a=new Float32Array(P*P);for(let i=0;i<a.length;i++)a[i]=R();L.push([P,a]);}
    return(u,v,ridged)=>{let s=0,amp=.5,norm=0;
      for(let o=0;o<oct;o++){const P=L[o][0],a=L[o][1],x=u*P,y=v*P,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
        const i0=((x0%P)+P)%P,i1=(i0+1)%P,j0=((y0%P)+P)%P,j1=(j0+1)%P;
        let n=(a[j0*P+i0]*(1-sx)+a[j0*P+i1]*sx)*(1-sy)+(a[j1*P+i0]*(1-sx)+a[j1*P+i1]*sx)*sy;
        if(ridged)n=1-Math.abs(2*n-1);
        s+=n*amp;norm+=amp;amp*=.5;}
      return s/norm;};
  }
  // the alpha tiles: soft (clouds) · wisp (filaments) · lane (thin dark lanes) · grain (fine mottling)
  let NZ=null;
  function noiseTiles(){
    if(NZ)return NZ;
    const N=256,tile=(seed,ridged,lo,hi,pw)=>{const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data,f=makeFbm(seed,5,4);
      for(let y=0;y<N;y++)for(let x=0;x<N;x++){let v=(f(x/N,y/N,ridged)-lo)/(hi-lo);v=v<0?0:v>1?1:v;const i=(y*N+x)*4;d[i]=d[i+1]=d[i+2]=255;d[i+3]=Math.pow(v,pw)*255;}
      g.putImageData(im,0,0);return c;};
    return(NZ={soft:tile(11,false,.3,.7,1.2),wisp:tile(23,true,.52,.92,1.5),lane:tile(37,true,.66,.96,1.2),grain:tile(51,false,.2,.8,1)});
  }

  /* ═════════════════════════ 2-D: everything else (redesigned) ═════════════ */
  // PAINT ONCE, BLIT MANY: every object below is baked into a small canvas when the
  // scene is laid out; a frame is a few hundred drawImage / batched-path calls.
  const BK=Math.min(DPR,1.5);                           // the pixel ratio sprites are baked at
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const pick=a=>a[(Math.random()*a.length)|0];
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const lite=()=>qIdx===0;                              // the last-resort tier: fewer stars, no nebula, half the dust
  function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(2,Math.ceil(w*BK));c.height=Math.max(2,Math.ceil(h*BK));
    const g=c.getContext('2d');g.scale(BK,BK);return{c,g,w,h};}
  const blit=(s,x,y,k)=>{k=k||1;ctx.drawImage(s.c,x,y,s.w*k,s.h*k);};
  // soft round glows, one per colour
  const GLOWS={};
  function glowSpr(col){
    if(GLOWS[col])return GLOWS[col];
    const s=mk(64,64);s.g.fillStyle=rg(s.g,32,32,0,32,[[0,'rgba('+col+',1)'],[.3,'rgba('+col+',.42)'],[1,'rgba('+col+',0)']]);s.g.fillRect(0,0,64,64);
    return(GLOWS[col]=s);
  }
  const glow=(col,x,y,r,a)=>{if(a<=.004)return;const ga=ctx.globalAlpha;ctx.globalAlpha=ga*(a>1?1:a);ctx.drawImage(glowSpr(col).c,x-r,y-r,r*2,r*2);ctx.globalAlpha=ga;};
  // a bright star: a hot core, a soft halo, four thin spikes
  function starSpr(col,spikes){
    const s=mk(48,48),g=s.g;
    g.fillStyle=rg(g,24,24,0,24,[[0,'rgba('+col+',.55)'],[.25,'rgba('+col+',.2)'],[1,'rgba('+col+',0)']]);g.fillRect(0,0,48,48);
    if(spikes){g.strokeStyle='rgba('+col+',.5)';g.lineWidth=1;g.lineCap='round';
      for(const[dx,dy]of[[1,0],[0,1]]){g.beginPath();g.moveTo(24-dx*21,24-dy*21);g.lineTo(24+dx*21,24+dy*21);g.stroke();}}
    g.fillStyle='rgba(255,255,255,.98)';g.beginPath();g.arc(24,24,2.1,0,TAU);g.fill();
    return s;
  }

  /* ── WORLDS: a painted surface map wrapped on a sphere ──────────────────────
     The sphere is redrawn into a small canvas of its own only ~12 times a second
     (the turn is slow): N longitude strips of the map, masked to the disc, then
     ONE baked overlay — limb darkening, the night side away from the Sun, a
     sunward sheen, a lit rim. The frame loop just blits that small canvas.
     o: { ry (oblateness), tilt (the axis leans), clouds (a second map, own
     speed), lights (a map shown on the night side only), atm 'r,g,b' }           */
  function makeBody(tex,r,o){
    o=o||{};
    const ry=o.ry||r,R=Math.max(r,ry)+3,b={tex,r,ry,o,R,rot:Math.random()*TAU,rot2:0,la:null,next:0,cv:mk(R*2,R*2),mask:mk(R*2,R*2),shade:null,night:null,lcv:null,x:0,y:0};
    const g=b.mask.g;g.translate(R,R);g.rotate(o.tilt||0);g.fillStyle='#fff';g.beginPath();g.ellipse(0,0,r,ry,0,0,TAU);g.fill();
    if(o.lights)b.lcv=mk(R*2,R*2);
    return b;
  }
  function bakeShade(b,la){
    const r=b.r,ry=b.ry,R=b.R,s=b.shade||(b.shade=mk(R*2,R*2)),g=s.g,ux=Math.cos(la),uy=Math.sin(la),tl=b.o.tilt||0;
    g.setTransform(BK,0,0,BK,0,0);g.clearRect(0,0,R*2,R*2);
    g.save();g.translate(R,R);g.rotate(tl);g.beginPath();g.ellipse(0,0,r,ry,0,0,TAU);g.clip();g.rotate(-tl);
    g.fillStyle=rg(g,0,0,r*.5,r,[[0,'rgba(0,0,0,0)'],[.72,'rgba(0,0,0,.14)'],[1,'rgba(0,0,0,.6)']]);g.fillRect(-R,-R,R*2,R*2);
    if(b.o.atm){g.fillStyle=rg(g,0,0,r*.76,r,[[0,'rgba('+b.o.atm+',0)'],[.7,'rgba('+b.o.atm+',.2)'],[1,'rgba('+b.o.atm+',.6)']]);g.fillRect(-R,-R,R*2,R*2);}
    g.fillStyle=rg(g,ux*r*1.2,uy*r*1.2,r*1.25,r*2.3,[[0,'rgba(3,3,12,0)'],[.28,'rgba(3,3,12,.5)'],[.5,'rgba(3,3,12,.86)'],[1,'rgba(3,3,12,.95)']]);g.fillRect(-R,-R,R*2,R*2);
    g.fillStyle=rg(g,ux*r*.5,uy*r*.5,0,r*.9,[[0,'rgba(255,250,235,.22)'],[1,'rgba(255,250,235,0)']]);g.fillRect(-R,-R,R*2,R*2);
    if(b.o.shadeExtra)b.o.shadeExtra(g,ux,uy);            // e.g. the rings' shadow across Saturn
    g.restore();
    g.save();g.translate(R,R);g.rotate(tl);                // the sunlit rim
    g.strokeStyle='rgba(255,244,226,.42)';g.lineWidth=1.2;g.beginPath();g.ellipse(0,0,r-.6,ry-.6,0,la-tl-1.05,la-tl+1.05);g.stroke();g.restore();
    if(b.o.lights){                                        // where the night is: the alpha the city lights are cut by
      const n=b.night||(b.night=mk(R*2,R*2)),h=n.g;
      h.setTransform(BK,0,0,BK,0,0);h.clearRect(0,0,R*2,R*2);
      h.fillStyle=rg(h,R+ux*r*1.2,R+uy*r*1.2,r*1.5,r*2.0,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,1)']]);h.beginPath();h.arc(R,R,r,0,TAU);h.fill();
    }
    b.la=la;
  }
  function strips(g,tex,r,ry,rot,N){                      // the visible hemisphere as N longitude strips, centred on 0,0
    const TW=tex.width,TH=tex.height,sw=TW/(2*N);
    for(let i=0;i<N;i++){
      const l0=-Math.PI/2+i*Math.PI/N,dx0=Math.sin(l0)*r,dw=Math.sin(l0+Math.PI/N)*r-dx0+.7;
      let u=((l0+rot)/TAU)%1;if(u<0)u+=1;
      const sx=u*TW;
      if(sx+sw<=TW)g.drawImage(tex,sx,0,sw,TH,dx0,-ry,dw,ry*2);
      else{const w1=TW-sx,f=w1/sw;g.drawImage(tex,sx,0,w1,TH,dx0,-ry,dw*f,ry*2);g.drawImage(tex,0,0,sw-w1,TH,dx0+dw*f,-ry,dw*(1-f),ry*2);}
    }
  }
  function refreshBody(b,la){
    if(b.la===null||Math.abs(la-b.la)>.1)bakeShade(b,la);
    const g=b.cv.g,r=b.r,ry=b.ry,R=b.R,N=r>60?22:r>24?14:10,tl=b.o.tilt||0;
    g.setTransform(BK,0,0,BK,0,0);g.globalCompositeOperation='source-over';g.clearRect(0,0,R*2,R*2);
    if(tl){
      const fl=b.flat||(b.flat=mk(R*2,R*2)),h=fl.g;h.setTransform(BK,0,0,BK,0,0);h.clearRect(0,0,R*2,R*2);h.translate(R,R);
      strips(h,b.tex,r,ry,b.rot,N);if(b.o.clouds)strips(h,b.o.clouds,r,ry,b.rot2,N);
      g.translate(R,R);g.rotate(tl);g.drawImage(fl.c,-R,-R,R*2,R*2);
    }else{
      g.translate(R,R);
      strips(g,b.tex,r,ry,b.rot,N);
      if(b.o.clouds)strips(g,b.o.clouds,r,ry,b.rot2,N);
    }
    g.setTransform(BK,0,0,BK,0,0);
    g.globalCompositeOperation='destination-in';g.drawImage(b.mask.c,0,0,R*2,R*2);
    g.globalCompositeOperation='source-over';g.drawImage(b.shade.c,0,0,R*2,R*2);
    if(b.lcv){                                             // city lights: only where the night mask lets them through
      const h=b.lcv.g;h.setTransform(BK,0,0,BK,0,0);h.globalCompositeOperation='source-over';h.clearRect(0,0,R*2,R*2);
      if(tl){const fl=b.flat.g;fl.setTransform(BK,0,0,BK,0,0);fl.clearRect(0,0,R*2,R*2);fl.translate(R,R);strips(fl,b.o.lights,r,ry,b.rot,N);h.translate(R,R);h.rotate(tl);h.drawImage(b.flat.c,-R,-R,R*2,R*2);}
      else{h.translate(R,R);strips(h,b.o.lights,r,ry,b.rot,N);}
      h.setTransform(BK,0,0,BK,0,0);
      h.globalCompositeOperation='destination-in';h.drawImage(b.night.c,0,0,R*2,R*2);
      g.drawImage(b.lcv.c,0,0,R*2,R*2);
    }
  }
  const BODY_HZ=12;                                       // sphere refreshes per second
  // turn a body and blit it; `boost` (0..1) spins it up after a tap
  function drawBody(b,x,y,t,dt,spd,boost){
    b.x=x;b.y=y;
    b.rot+=spd*dt*(1+5*(boost||0));if(b.o.clouds)b.rot2+=spd*dt*1.7*(1+5*(boost||0));
    if(t>=b.next){b.next=t+(boost>0?0:b.o.still?1:1/BODY_HZ)+Math.random()*.01;refreshBody(b,Math.atan2(SUN.y-y,SUN.x-x));}   // a still body (the Moon) only follows the light
    if(b.o.atm)glow(b.o.atm,x,y,b.r*(b.o.atmK||1.45),b.o.atmA||.5);
    ctx.drawImage(b.cv.c,x-b.R,y-b.R,b.R*2,b.R*2);
  }
  // ── SURFACE MAPS (x = longitude, y linear in sin(latitude), row 0 = north). They are
  //    painted PER PIXEL from noise — bands that wander and streak, seas with deep basins,
  //    weather that swirls — once, when a world first appears.
  function pixMap(TW,TH,fn){
    const c=document.createElement('canvas');c.width=TW;c.height=TH;const g=c.getContext('2d'),im=g.createImageData(TW,TH),d=im.data;
    for(let y=0;y<TH;y++){const w=(y+.5)/TH,v=w*2-1;for(let x=0;x<TW;x++){const p=fn(x/TW,v,w),i=(y*TW+x)*4;d[i]=p[0];d[i+1]=p[1];d[i+2]=p[2];d[i+3]=p.length>3?p[3]:255;}}
    g.putImageData(im,0,0);return{c,g,TW,TH};
  }
  function ramp(stops,v){
    if(v<=stops[0][0])return stops[0][1];
    for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){const a=stops[i-1],b=stops[i],k=(v-a[0])/(b[0]-a[0]),s=k*k*(3-2*k);return[a[1][0]+(b[1][0]-a[1][0])*s,a[1][1]+(b[1][1]-a[1][1])*s,a[1][2]+(b[1][2]-a[1][2])*s];}
    return stops[stops.length-1][1];
  }
  // a gas giant: colour by latitude (stops: [v −1 north … +1 south, [r,g,b]]), the band edges wandering, the
  // cloud tops drawn out into long streaks; then its storms (ovals with a pale collar)
  function gasMap(stops,o){
    const f=makeFbm(o.seed,5,4),f2=makeFbm(o.seed+7,4,2),f3=makeFbm(o.seed+3,5,2);
    const m=pixMap(512,256,(u,v,w)=>{
      const c=ramp(stops,clamp(v+(f2(u,w)-.5)*o.wave*2+(f(u,w*3)-.5)*o.wave,-1,1)),k=1+(f3(u,w*9)-.5)*o.streak*2+(f(u,w*14)-.5)*o.streak*.8;
      return[c[0]*k,c[1]*k,c[2]*k];});
    const g=m.g;
    for(const s of o.spots||[]){const x=s[0]*512,y=(s[1]+1)/2*256,rx=s[2]*512,ry=s[3]*256;
      for(const dx of[-512,0,512]){g.save();g.translate(x+dx,y);g.scale(1,ry/rx);
        g.fillStyle=rg(g,0,0,0,rx*1.35,[[0,'rgba('+s[4]+',.95)'],[.62,'rgba('+s[4]+',.8)'],[.76,'rgba('+s[5]+',.55)'],[1,'rgba('+s[5]+',0)']]);g.beginPath();g.arc(0,0,rx*1.35,0,TAU);g.fill();
        g.strokeStyle='rgba('+s[5]+',.35)';g.lineWidth=rx*.1;for(const q of[.36,.66]){g.beginPath();g.arc(0,0,rx*q,0,TAU);g.stroke();}
        g.restore();}}
    return m.c;
  }
  // a rocky world: a tone ramp driven by relief, darker provinces, polar caps, craters
  function rockMap(lo,hi,o){
    const f=makeFbm(o.seed,5,4),f2=makeFbm(o.seed+5,3,2);
    const m=pixMap(256,128,(u,v,w)=>{
      let n=clamp((f(u,w*2)-.3)*2.4,0,1),dk=clamp((f2(u,w)-.5)*5,0,1)*(o.dark||0);
      let r=lo[0]+(hi[0]-lo[0])*n,g=lo[1]+(hi[1]-lo[1])*n,b=lo[2]+(hi[2]-lo[2])*n;
      r*=1-dk*.45;g*=1-dk*.5;b*=1-dk*.4;
      if(o.caps){const k=clamp((Math.abs(v)-o.caps+(f(u,w*4)-.5)*.14)*14,0,1);r+=(246-r)*k;g+=(248-g)*k;b+=(252-b)*k;}
      return[r,g,b];});
    const g=m.g,R=mulberry(o.seed+9);
    for(let i=0;i<(o.craters||0);i++){const x=R()*256,y=8+R()*112,r=1.2+R()*R()*5;
      g.fillStyle='rgba(20,16,14,.3)';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
      g.strokeStyle='rgba(255,250,240,.34)';g.lineWidth=.7;g.beginPath();g.arc(x,y,r,Math.PI*.1,Math.PI*.9);g.stroke();}
    return m.c;
  }
  const SATURN_STOPS=[[-1,[142,158,156]],[-.88,[186,176,140]],[-.72,[214,190,140]],[-.57,[234,212,162]],[-.44,[204,174,124]],[-.32,[238,218,170]],[-.18,[222,194,144]],[-.02,[242,224,178]],
                      [.12,[212,182,132]],[.28,[238,216,168]],[.44,[202,172,126]],[.6,[228,206,160]],[.78,[198,178,138]],[1,[166,156,134]]];
  // the passing worlds, repainted (the old vector maps stay as the fallback for anything not listed)
  const RICH={};
  function richTex(id){
    if(RICH[id])return RICH[id];
    let c=null;
    if(id==='jupiter')c=gasMap([[-1,[142,134,126]],[-.84,[172,146,118]],[-.68,[228,216,198]],[-.52,[158,94,60]],[-.38,[232,218,192]],[-.2,[242,232,212]],[-.06,[216,172,122]],[.08,[150,88,56]],[.24,[224,202,172]],
                                [.4,[176,118,82]],[.56,[226,210,186]],[.72,[168,138,110]],[.88,[148,130,114]],[1,[128,118,110]]],{seed:301,wave:.035,streak:.16,spots:[[.3,.28,.06,.075,'200,84,54','244,220,196'],[.72,-.56,.02,.03,'240,232,220','200,180,160'],[.55,.5,.018,.026,'240,232,220','200,180,160']]});
    else if(id==='neptune')c=gasMap([[-1,[34,60,160]],[-.5,[48,92,208]],[0,[64,122,236]],[.5,[46,88,204]],[1,[32,58,154]]],{seed:302,wave:.03,streak:.1,spots:[[.6,.3,.045,.06,'22,40,116','90,140,240'],[.2,-.4,.05,.012,'236,244,255','150,190,255']]});
    else if(id==='uranus')c=gasMap([[-1,[146,210,222]],[-.3,[166,228,234]],[.3,[172,234,238]],[1,[142,204,218]]],{seed:303,wave:.02,streak:.04});
    else if(id==='venus')c=gasMap([[-1,[206,180,132]],[-.5,[236,218,172]],[0,[250,238,200]],[.5,[232,208,162]],[1,[204,178,132]]],{seed:304,wave:.12,streak:.14});
    else if(id==='mars')c=rockMap([150,70,44],[232,156,100],{seed:305,dark:.9,caps:.84,craters:14});
    else if(id==='mercury')c=rockMap([96,90,86],[196,186,176],{seed:306,dark:.5,craters:60});
    return(RICH[id]=c||WORLD_TEX[id]);
  }
  function paintEarthMaps(){
    const TW=512,TH=256,mkc=()=>{const c=document.createElement('canvas');c.width=TW;c.height=TH;return c;};
    const X=lon=>(lon+180)/360*TW,Y=lat=>(1-Math.sin(lat*DEG))/2*TH;
    // the ocean: deep basins and paler shelves, darker toward the poles
    const fo=makeFbm(71,5,4);
    const sea=pixMap(TW,TH,(u,v,w)=>{const k=.72+fo(u,w*2)*.62,la=Math.abs(v);return[(12+12*la)*k,(52+46*(1-la))*k+8,(132+72*(1-la*.6))*k];}),g=sea.g;
    // the land on a sheet of its own, so what follows colours the land alone
    const land=mkc(),h=land.getContext('2d');
    const poly=(c,pts)=>{c.beginPath();pts.forEach(([lo,la],i)=>i?c.lineTo(X(lo),Y(la)):c.moveTo(X(lo),Y(la)));c.closePath();};
    g.lineJoin='round';
    for(const c of CONTINENTS)if(c.kind==='land'){poly(g,c.pts);g.strokeStyle='rgba(96,206,226,.42)';g.lineWidth=7;g.stroke();}          // turquoise shallows round the coasts
    for(const c of CONTINENTS){
      if(c.kind==='ice'&&c.pts.length>20){                 // Antarctica: everything below its coast line
        h.beginPath();c.pts.forEach(([lo,la],i)=>i?h.lineTo(X(lo),Y(la)):h.moveTo(X(lo),Y(la)));h.lineTo(TW,Y(-70));h.lineTo(TW,TH);h.lineTo(0,TH);h.closePath();
      }else poly(h,c.pts);
      h.fillStyle=c.kind==='land'?'#4f9a4e':c.kind==='desert'?'#d8b877':'#f4f9ff';h.fill();
    }
    h.globalCompositeOperation='source-atop';
    // climate by latitude: ice, tundra, forest, the dry belts, rainforest at the equator
    h.fillStyle=lg(h,0,0,0,TH,[[0,'rgba(240,246,250,.9)'],[.05,'rgba(170,170,140,.5)'],[.13,'rgba(52,112,62,.45)'],[.29,'rgba(196,164,96,.42)'],[.5,'rgba(24,104,44,.55)'],[.71,'rgba(196,164,96,.4)'],[.87,'rgba(60,116,66,.4)'],[.95,'rgba(232,238,242,.75)'],[1,'rgba(244,248,252,.95)']]);h.fillRect(0,0,TW,TH);
    const fr=makeFbm(72,5,8);                               // relief: dark valleys and forests, pale highlands
    h.drawImage(pixMap(TW,TH,(u,v,w)=>{const n=fr(u,w*2)-.5;return n<0?[30,60,30,Math.min(150,-n*620)]:[226,214,170,Math.min(120,n*480)];}).c,0,0);
    g.drawImage(land,0,0);
    g.fillStyle=lg(g,0,0,0,16,[[0,'rgba(246,251,255,.95)'],[1,'rgba(246,251,255,0)']]);g.fillRect(0,0,TW,16);                  // the Arctic ice
    // weather: noise cut into cloud systems, drawn out along the winds, thicker along the storm tracks
    const fc=makeFbm(91,5,8),fw=makeFbm(92,3,2);
    const clouds=pixMap(TW,TH,(u,v,w)=>{const wp=(fw(u,w)-.5)*.2,n=fc(u+wp,w*.7+wp),tr=.04*Math.cos(v*Math.PI*3);let a=clamp((n-.555+tr)/.17,0,1);a=a*a*(3-2*a);return[255,255,255,a*236];}).c;
    // city lights, where people really live — shown only on the night side
    const lights=mkc(),k=lights.getContext('2d');
    const CITY=[[-74,41],[-87,42],[-118,34],[-99,19],[-46,-23],[-58,-34],[-70,-33],[-43,-22],[0,51],[2,49],[13,52],[12,42],[37,56],[29,41],[31,30],[3,6],[28,-26],[18,-34],
                [51,36],[77,28],[72,19],[88,22],[100,14],[106,-6],[104,1],[116,40],[121,31],[114,22],[127,37],[139,36],[135,35],[151,-34],[145,-38],[-122,47],[-80,26],[55,25],[36,-1],[-3,40],[24,60],[-9,39]];
    for(const[lo,la]of CITY){
      const x=X(lo),y=Y(la),r=rnd(2.2,4.2);
      k.fillStyle=rg(k,x,y,0,r*2.4,[[0,'rgba(255,224,150,.95)'],[.4,'rgba(255,196,110,.5)'],[1,'rgba(255,180,90,0)']]);k.beginPath();k.arc(x,y,r*2.4,0,TAU);k.fill();
      for(let j=0;j<4;j++){k.fillStyle='rgba(255,236,180,.9)';k.fillRect(x+rnd(-7,7),y+rnd(-5,5),1.4,1.4);}
    }
    return{land:sea.c,clouds,lights};
  }
  function paintSaturnMap(){
    const c=gasMap(SATURN_STOPS,{seed:210,wave:.016,streak:.1,spots:[[.16,-.04,.04,.03,'150,104,74','232,214,176'],[.6,.44,.03,.022,'250,238,208','214,190,150']]});
    const g=c.getContext('2d');g.fillStyle=lg(g,0,0,0,26,[[0,'rgba(64,100,124,.6)'],[1,'rgba(70,100,120,0)']]);g.fillRect(0,0,512,26);          // the bluish polar hood
    return c;
  }
  function paintMoonMap(){
    const c=rockMap([120,118,116],[226,222,214],{seed:220,dark:1,craters:34});
    return c;
  }

  /* ── SATURN'S RINGS: the whole ring system baked twice — the far half (drawn
     behind the body, with the body's shadow lying across it) and the near half
     (drawn in front). ringProfile is the old scene's radial structure:
     C · B · the Cassini division · A · the Encke gap · F.                        */
  const RING_IN=1.24,RING_OUT=2.32,RING_ASP=.29,RING_ROT=-.3;
  function ringProfile(k){
    if(k<1.53)return[.14+.08*Math.sin(k*40)*Math.sin(k*17),'178,172,185'];
    if(k<1.95)return[.62+.22*Math.sin(k*57)*Math.sin(k*23)+.08*Math.sin(k*130),'232,220,192'];
    if(k<2.03)return[.05,'190,180,170'];
    if(k<2.18)return[.42+.14*Math.sin(k*61),'214,202,176'];
    if(k<2.21)return[.06,'190,180,170'];
    if(k<2.27)return[.36,'214,202,176'];
    if(k<2.30)return[.02,'0,0,0'];
    return[.22,'236,232,228'];
  }
  function bakeRings(p,la){                                // la = direction to the Sun
    const r=p.r,S=RING_OUT*r+4,step=.008,ux=Math.cos(la),uy=Math.sin(la);
    for(const half of[0,1]){
      const s=p.rings[half]||(p.rings[half]=mk(S*2,S*2)),g=s.g;
      g.setTransform(BK,0,0,BK,0,0);g.clearRect(0,0,S*2,S*2);
      g.translate(S,S);g.rotate(RING_ROT);g.lineCap='butt';
      const a0=half?0:Math.PI,a1=half?Math.PI:TAU,mul=half?1:.72;
      for(let k=RING_IN;k<RING_OUT;k+=step){
        const[a0r,col]=ringProfile(k+step/2);if(a0r<.015)continue;
        const al=a0r*(.86+.2*Math.sin(k*311)*Math.sin(k*127)+.12*Math.sin(k*733));           // the fine structure: ringlet after ringlet
        g.strokeStyle='rgba('+col+','+Math.min(1,al*mul*1.12).toFixed(3)+')';g.lineWidth=step*r*1.12;
        g.beginPath();g.ellipse(0,0,(k+step/2)*r,(k+step/2)*r*RING_ASP,0,a0,a1);g.stroke();
      }
      if(!half){                                           // the body's shadow lies across the far rings, away from the Sun
        g.globalCompositeOperation='source-atop';g.rotate(Math.atan2(-uy,-ux)-RING_ROT);
        g.fillStyle=lg(g,r*.5,0,r*3,0,[[0,'rgba(6,4,12,.82)'],[.5,'rgba(6,4,12,.5)'],[1,'rgba(6,4,12,0)']]);
        g.beginPath();g.ellipse(r*1.7,0,r*1.7,r*1.02,0,0,TAU);g.fill();g.globalCompositeOperation='source-over';
      }
    }
    p.ringLa=la;
  }

  // ── the scene: laid out (and every sprite baked) here; rebuilt on resize
  let FAR=[],NEAR=[],STAR_SPR=[],CONS=[],NEB=null,GALAXIES=[],TRAVELERS=[],TIDAL=[],COMETS=[],PLANET=null,EARTH=null,MAPS=null,SATMAP=null,MOONMAP=null;
  let nova=null,nextNovaAt=25+Math.random()*35,M=1;
  const ORBITERS=[{kind:'moon',spd:.22,phase:0,rx:2.5,ry:.7,size:.27,lapT0:null},{kind:'sat',spd:.6,phase:2.1,rx:1.8,ry:.52,size:.3,lapT0:null},{kind:'sat',spd:.85,phase:4.6,rx:1.5,ry:.42,size:.24,lapT0:null}];
  function buildScene(){
    M=Math.min(W,H);
    // The black hole — tucked near the right border so the game form won't cover it.
    // BH.r is the SHADOW radius (b = 3√3/2 r_s in the GL render); position and size are
    // exactly the old scene's, so the GL camera, the dust and the 2-D lens all agree.
    BH={x:W*.90,y:H*.36,r:M*.075,tilt:.42};
    BH.rE=BH.r*1.35;   // Einstein radius for the 2-D stars — nothing APPEARS inside it
    {const sunR=M*.95;SUN={x:W*.55,y:H+sunR-H*.11,r:sunR};}
    // constellations: a sprite each (lines + stars), and a brighter twin for when it is tapped
    CONS=CONSTELLATIONS.map(cn=>{
      const sc=M*cn.s,P=cn.pts.map(([px,py])=>[px*sc,py*sc]),pad=12;
      const w=Math.max(...P.map(p=>p[0]))+pad*2,h=Math.max(...P.map(p=>p[1]))+pad*2;
      const bake=hi=>{const s=mk(w,h),g=s.g;g.translate(pad,pad);
        g.strokeStyle=hi?'rgba(190,214,255,.9)':'rgba(150,180,255,.26)';g.lineWidth=hi?1.6:1;g.lineCap='round';
        g.beginPath();for(const[a,b]of cn.lines){g.moveTo(P[a][0],P[a][1]);g.lineTo(P[b][0],P[b][1]);}g.stroke();
        for(const[qx,qy]of P){g.fillStyle=rg(g,qx,qy,0,hi?9:6,[[0,'rgba(240,246,255,.98)'],[.3,'rgba(225,235,255,.4)'],[1,'rgba(225,235,255,0)']]);g.beginPath();g.arc(qx,qy,hi?9:6,0,TAU);g.fill();}
        return s;};
      const x=W*cn.cx-pad,y=H*cn.cy-pad;
      cn.hit={x:x+pad+P.reduce((s,q)=>s+q[0],0)/P.length,y:y+pad+P.reduce((s,q)=>s+q[1],0)/P.length,r:sc*.62};
      return{cn,x,y,spr:bake(0),hi:bake(1),litT:null};
    });
    GALAXIES=[
      {x:W*.12,y:H*.54,scale:M*.10, tilt:.50,ang:.6, spin:.018, arms:2,hueA:'150,185,255',hueB:'255,214,236'},
      {x:W*.84,y:H*.78,scale:M*.075,tilt:.36,ang:2.1,spin:-.024,arms:2,hueA:'196,180,255',hueB:'170,228,255'},
      {x:W*.30,y:H*.80,scale:M*.055,tilt:.60,ang:4.0,spin:.030, arms:3,hueA:'255,214,180',hueB:'205,205,255'},
    ];
    for(const g of GALAXIES){g.x2=0;g.boostT=null;g.next=0;g.spr=bakeGalaxy(g);const D=g.scale*2.7;g.cv=mk(D,D);}
    TIDAL=[];COMETS=[spawnComet(true)];nova=null;
    // the heroes
    if(!MAPS){MAPS=paintEarthMaps();SATMAP=paintSaturnMap();MOONMAP=paintMoonMap();}
    const sr=M*.136;
    PLANET={x:W*.17,y:H*.22,r:sr,boostT:null,rings:[null,null],ringLa:null,
      rocks:[],
      body:makeBody(SATMAP,sr,{ry:sr*.9,tilt:RING_ROT,shadeExtra(g,ux,uy){                  // the rings' shadow curves across the body
        g.save();g.translate(-ux*sr*.42,-uy*sr*.42);g.rotate(RING_ROT);
        for(let k=RING_IN;k<2.27;k+=.06){const[al]=ringProfile(k+.03);if(al<.05)continue;
          g.strokeStyle='rgba(20,12,8,'+Math.min(.6,al*.55).toFixed(3)+')';g.lineWidth=.06*sr*1.1;g.beginPath();g.ellipse(0,0,(k+.03)*sr,(k+.03)*sr*RING_ASP,0,0,TAU);g.stroke();}
        g.restore();}})};
    const er=M*.066;
    EARTH={x:W*.16,y:H*.74,r:er,boostT:null,body:makeBody(MAPS.land,er,{tilt:.22,clouds:MAPS.clouds,lights:MAPS.lights,atm:'110,170,255',atmK:1.5,atmA:.6}),
           moon:makeBody(MOONMAP,er*.27,{still:true}),sat:bakeSat(er*.34)};
    for(const o of ORBITERS)o.lapT0=null;
    PASSERS=[];passQueue=[];nextPassAt=lastT+6;
    // Saturn and Earth roam (only the Sun and the hole stay put): start at their classic
    // spots, hold a moment, then drift off along a slow curved path and keep coming back
    PLANET.mv={margin:PLANET.r*2.45+12,speed:W/210,pause:[20,25],startAt:lastT+8+Math.random()*10};
    planPath(PLANET.mv,{x:PLANET.x,y:PLANET.y},-1);
    EARTH.mv={margin:EARTH.r*2.9+12,speed:W/140,pause:[15,25],startAt:lastT+14+Math.random()*12};
    planPath(EARTH.mv,{x:EARTH.x,y:EARTH.y},-1);
    bakeSun();bakeSmall();buildCrew();
    bakeDeepSky();                                         // the still painting behind everything (its own canvas)
    buildDetail();
    if(!glLost){buildTargets();dustInit=false;}
    updateCamera();                                        // pure math — also wanted without GL
    if(NOGL)paintStillSky();                               // repainted on every layout
  }
  // the cheap-to-vary detail — star counts, the nebula, travellers, ring gravel, how many grains are drawn.
  // Laid out with the scene, and again (alone) when the quality governor reaches or leaves its last-resort tier.
  function buildDetail(){
    const few=lite(),area=W*H/1e6;
    // faint stars: six twinkle groups, each drawn as ONE path. Stars near the hole are
    // lensed here, once — neither they nor the hole ever move.
    FAR=[];for(let b=0;b<6;b++)FAR.push({pts:[],ph:Math.random()*TAU,spd:.5+Math.random()*1.3});
    for(let i=0,n=Math.round((few?70:130)*Math.max(.6,area));i<n;i++){
      const L=lensImage(Math.random()*W,Math.random()*H);
      if(Math.hypot(L.x-BH.x,L.y-BH.y)<BH.rE*1.05||L.y>H-H*.09)continue;
      FAR[i%6].pts.push(L.x,L.y,(.7+Math.random()*1.1)*Math.min(1.6,Math.sqrt(L.mag)));
    }
    // bright stars: three tints, with or without spikes — baked once
    STAR_SPR=[];for(const col of['255,255,255','196,216,255','255,226,188'])for(const sp of[0,1])STAR_SPR.push(starSpr(col,sp));
    NEAR=[];
    for(let i=0,n=few?14:26;i<n;i++){
      const x=Math.random()*W,y=Math.random()*H*.86;
      if(Math.hypot(x-BH.x,y-BH.y)<BH.r*3.4)continue;
      NEAR.push({x,y,k:.45+Math.random()*.6,spr:(Math.random()*6)|0,tw:Math.random()*TAU,spd:.5+Math.random()*1.6});
    }
    TRAVELERS=Array.from({length:few?6:10},()=>spawnTraveler(true));
    PLANET.rocks=few?[]:Array.from({length:16},()=>{const k=1.3+Math.random()*.95;return{ang:Math.random()*TAU,k,spd:.55*Math.pow(1.62/k,1.5),size:.8+Math.random()*1.1};});
    dustN=few?NP>>1:NP;
  }
  // a galaxy, face-on: a warm core, a soft disk, spiral arms of star clouds, pink star-nurseries
  function bakeGalaxy(q){
    const S=q.scale,D=S*2.7,s=mk(D,D),g=s.g;g.translate(D/2,D/2);g.globalCompositeOperation='lighter';
    const puff=(x,y,r,col,a)=>{g.fillStyle=rg(g,x,y,0,r,[[0,'rgba('+col+','+a.toFixed(3)+')'],[1,'rgba('+col+',0)']]);g.beginPath();g.arc(x,y,r,0,TAU);g.fill();};
    puff(0,0,S*1.32,q.hueA,.16);puff(0,0,S*.8,q.hueB,.2);
    const at=(arm,d,j)=>{const th=arm*TAU/q.arms+d*3.9+j;return[Math.cos(th)*d*S,Math.sin(th)*d*S];};
    for(let arm=0;arm<q.arms;arm++)for(let i=0;i<90;i++){const d=.12+(i/90)*1.02,[x,y]=at(arm,d,rnd(-.1,.1));puff(x,y,S*.13*(1-d*.45),q.hueA,.22*(1-d*.55));}
    g.globalCompositeOperation='destination-out';          // dust lanes on the inner edge of each arm
    for(let arm=0;arm<q.arms;arm++)for(let i=0;i<50;i++){const d=.2+(i/50)*.8,[x,y]=at(arm,d,-.42);puff(x,y,S*.055,'0,0,0',.34);}
    g.globalCompositeOperation='lighter';
    g.fillStyle='rgba('+q.hueB+',.8)';g.beginPath();
    for(let i=0;i<420;i++){const arm=(Math.random()*q.arms)|0,d=.16+Math.pow(Math.random(),.7)*.95,[x,y]=at(arm,d,rnd(-.2,.2)*(1+d)),z=rnd(.6,1.5);g.rect(x-z/2,y-z/2,z,z);}
    g.fill();
    for(let i=0;i<26;i++){const arm=(Math.random()*q.arms)|0,d=.3+Math.random()*.7,[x,y]=at(arm,d,rnd(-.08,.08));puff(x,y,S*.035,'255,120,180',.7);}   // star nurseries
    g.save();g.rotate(.5);g.scale(1.5,.7);puff(0,0,S*.24,'255,244,222',.7);g.restore();
    puff(0,0,S*.34,q.hueB,.42);puff(0,0,S*.13,'255,252,240',.95);
    return s;
  }
  /* ── THE DEEP SKY: a still painting on a canvas of its own, between the hole's
     sky (WebGL, below) and the moving layer (above). It is painted once per
     layout and never touched again — the browser composites it, so all of its
     richness costs nothing per frame. The Milky Way with its dust lanes, an
     emission nebula in rose and teal, a blue reflection nebula round a young
     cluster, far galaxies, a globular cluster, thousands of stars. It melts
     away round the black hole: there the hole's own lensed sky shows, untouched. */
  const skyArt=document.createElement('canvas');
  skyArt.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none';
  layer.insertBefore(skyArt,cv);
  let SKY_MS=0;
  function bakeDeepSky(){
    const t0=performance.now(),NT=noiseTiles(),k=Math.min(DPR,1.5),R=mulberry(20261112),rr=(a,b)=>a+R()*(b-a);
    skyArt.width=Math.ceil(W*k);skyArt.height=Math.ceil(H*k);
    const g=skyArt.getContext('2d');g.setTransform(k,0,0,k,0,0);g.clearRect(0,0,W,H);
    // 1 · GAS — painted at half size (it is soft), colour first, then cut by a noise tile
    const q=.5,GW=Math.ceil(W*q),GH=Math.ceil(H*q),mkc=()=>{const c=document.createElement('canvas');c.width=GW;c.height=GH;return c;};
    const gas=mkc(),G=gas.getContext('2d'),tmp=mkc(),T=tmp.getContext('2d');
    const cloud=(cx,cy,rx,ry,rot,stops,tile,ts,a,mode)=>{
      T.setTransform(1,0,0,1,0,0);T.globalCompositeOperation='source-over';T.clearRect(0,0,GW,GH);
      T.setTransform(q,0,0,q,0,0);T.translate(cx,cy);T.rotate(rot);T.scale(1,ry/rx);
      T.fillStyle=rg(T,0,0,0,rx,stops);T.beginPath();T.arc(0,0,rx,0,TAU);T.fill();
      if(tile){T.setTransform(q*ts,0,0,q*ts,R()*200,R()*200);T.globalCompositeOperation='destination-in';T.fillStyle=T.createPattern(tile,'repeat');T.fillRect(-300,-300,W/ts+600,H/ts+600);}
      G.globalCompositeOperation=mode||'lighter';G.globalAlpha=a;G.drawImage(tmp,0,0);G.globalAlpha=1;
    };
    const DARK=[[0,'rgba(0,0,0,1)'],[.6,'rgba(0,0,0,.7)'],[1,'rgba(0,0,0,0)']];
    // the sky's own colour: never flat black
    cloud(W*.08,H*.1,M*1.0,M*.8,0,[[0,'rgba(28,64,150,.5)'],[1,'rgba(20,40,120,0)']],null,1,.7);
    cloud(W*.3,H*.62,M*.9,M*.7,0,[[0,'rgba(84,36,140,.42)'],[1,'rgba(60,20,120,0)']],null,1,.7);
    cloud(W*.66,H*.02,M*.7,M*.5,0,[[0,'rgba(20,56,130,.4)'],[1,'rgba(16,40,110,0)']],null,1,.6);
    // the Milky Way: a river of star clouds from the lower left to the top, dust lanes down its middle
    const ax=-W*.12,ay=H*.98,bx=W*.74,by=-H*.12,mx=(ax+bx)/2,my=(ay+by)/2,ang=Math.atan2(by-ay,bx-ax),L=Math.hypot(bx-ax,by-ay);
    cloud(mx,my,L*.62,M*.24,ang,[[0,'rgba(255,238,212,.62)'],[.3,'rgba(206,212,255,.4)'],[.65,'rgba(110,134,226,.2)'],[1,'rgba(80,100,200,0)']],NT.soft,3.2,.8);
    cloud(mx,my,L*.6,M*.13,ang,[[0,'rgba(255,246,228,.7)'],[.5,'rgba(226,226,255,.36)'],[1,'rgba(160,170,240,0)']],NT.wisp,2.4,.7);
    for(let i=0;i<7;i++){const u=rr(.08,.92),o=rr(-1,1)*M*.06;cloud(ax+(bx-ax)*u-Math.sin(ang)*o,ay+(by-ay)*u+Math.cos(ang)*o,M*rr(.07,.13),M*rr(.04,.08),ang+rr(-.3,.3),[[0,'rgba(255,244,222,.6)'],[1,'rgba(255,236,214,0)']],NT.soft,1.7,.6);}
    cloud(mx,my,L*.56,M*.055,ang,DARK,NT.lane,2.8,.95,'destination-out');
    cloud(mx-Math.sin(ang)*M*.04,my+Math.cos(ang)*M*.04,L*.5,M*.05,ang+.03,DARK,NT.lane,2.1,.8,'destination-out');
    // the emission nebula: hydrogen in rose and red, oxygen in teal at its heart, veils of blue and violet, dark pillars
    const nx=W*.3,ny=H*.5,S=M*.42;
    cloud(nx,ny,S*1.2,S*.84,-.5,[[0,'rgba(255,64,112,.78)'],[.5,'rgba(224,44,122,.46)'],[1,'rgba(160,30,140,0)']],NT.wisp,3.3,.85);
    cloud(nx-S*.1,ny,S*.84,S*.58,-.3,[[0,'rgba(255,132,150,.8)'],[.6,'rgba(255,92,132,.4)'],[1,'rgba(255,80,140,0)']],NT.soft,2.5,.8);
    cloud(nx+S*.2,ny+S*.12,S*.42,S*.3,.4,[[0,'rgba(255,204,134,.8)'],[1,'rgba(255,150,90,0)']],NT.soft,1.8,.7);
    cloud(nx-S*.06,ny-S*.08,S*.52,S*.38,.2,[[0,'rgba(124,236,255,.78)'],[.5,'rgba(72,172,255,.42)'],[1,'rgba(60,120,255,0)']],NT.soft,2.1,.78);
    cloud(nx-S*.55,ny-S*.36,S*.74,S*.5,-.8,[[0,'rgba(92,124,255,.52)'],[1,'rgba(70,90,230,0)']],NT.wisp,3.7,.75);
    cloud(nx+S*.52,ny-S*.3,S*.62,S*.42,.9,[[0,'rgba(172,104,255,.5)'],[1,'rgba(120,70,230,0)']],NT.wisp,3.1,.72);
    cloud(nx+S*.1,ny+S*.22,S*.62,S*.2,-.9,DARK,NT.lane,2.3,.9,'destination-out');
    cloud(nx-S*.3,ny+S*.02,S*.4,S*.16,.7,DARK,NT.lane,1.8,.8,'destination-out');
    // a blue reflection nebula round a young cluster; a small green-gold shell low on the right; far wisps
    const cx2=W*.55,cy2=H*.13,S2=M*.2;
    cloud(cx2,cy2,S2*1.2,S2*.84,.3,[[0,'rgba(154,194,255,.74)'],[.5,'rgba(92,132,255,.38)'],[1,'rgba(70,100,240,0)']],NT.wisp,2.1,.85);
    cloud(cx2,cy2,S2*.7,S2*.5,-.2,[[0,'rgba(200,224,255,.6)'],[1,'rgba(140,170,255,0)']],NT.soft,1.6,.7);
    const cx3=W*.72,cy3=H*.8,S3=M*.15;
    cloud(cx3,cy3,S3*1.1,S3*.9,.5,[[0,'rgba(120,255,214,.62)'],[.6,'rgba(64,204,224,.32)'],[1,'rgba(60,160,220,0)']],NT.soft,1.6,.8);
    cloud(cx3,cy3,S3*1.5,S3*1.2,.5,[[.5,'rgba(255,110,170,0)'],[.75,'rgba(255,110,170,.5)'],[1,'rgba(255,90,150,0)']],NT.wisp,1.9,.8);
    cloud(W*.06,H*.2,M*.44,M*.26,.6,[[0,'rgba(70,170,220,.42)'],[1,'rgba(50,120,200,0)']],NT.wisp,4.2,.7);
    cloud(W*.04,H*.86,M*.42,M*.3,-.4,[[0,'rgba(150,90,230,.4)'],[1,'rgba(110,60,200,0)']],NT.wisp,4,.7);
    // the gas keeps well clear of the hole
    G.setTransform(q,0,0,q,0,0);G.globalCompositeOperation='destination-out';
    G.fillStyle=rg(G,BH.x,BH.y,BH.r*4.2,BH.r*7.2,[[0,'rgba(0,0,0,1)'],[1,'rgba(0,0,0,0)']]);G.fillRect(0,0,W,H);
    g.imageSmoothingQuality='high';g.globalAlpha=.92;g.drawImage(gas,0,0,W,H);g.globalAlpha=1;
    // 2 · STARS — dust first (thousands, a pixel each), thicker along the Milky Way
    const TINT=['255,255,255','206,224,255','255,240,220','255,214,176','176,200,255','255,190,170'],area=W*H/1e6;
    for(let b=0;b<18;b++){
      g.fillStyle='rgba('+TINT[b%6]+','+[.28,.5,.8][(b/6)|0]+')';g.beginPath();
      for(let i=0,n=Math.round(95*area);i<n;i++){const s=rr(.5,1.25)*(b>11?1.15:1);g.rect(R()*W,R()*H,s,s);}
      for(let i=0,n=Math.round(120*area);i<n;i++){const u=R(),o=(R()+R()+R()-1.5)*M*.2,s=rr(.5,1.2);g.rect(ax+(bx-ax)*u-Math.sin(ang)*o,ay+(by-ay)*u+Math.cos(ang)*o,s,s);}
      g.fill();
    }
    // a glow sprite and a spiked sprite per tint, made once and stamped
    const dotSpr=TINT.map(c=>{const s=mk(24,24);s.g.fillStyle=rg(s.g,12,12,0,12,[[0,'rgba(255,255,255,1)'],[.16,'rgba('+c+',.9)'],[.4,'rgba('+c+',.26)'],[1,'rgba('+c+',0)']]);s.g.fillRect(0,0,24,24);return s;});
    const bigSpr=TINT.map(c=>{const s=mk(120,120),h=s.g;h.fillStyle=rg(h,60,60,0,60,[[0,'rgba(255,255,255,1)'],[.05,'rgba('+c+',.95)'],[.16,'rgba('+c+',.34)'],[.5,'rgba('+c+',.07)'],[1,'rgba('+c+',0)']]);h.fillRect(0,0,120,120);
      for(const[dx,dy,len,a]of[[1,0,58,.8],[0,1,58,.8],[.7,.7,26,.35],[.7,-.7,26,.35]]){h.fillStyle=lg(h,60-dx*len,60-dy*len,60+dx*len,60+dy*len,[[0,'rgba('+c+',0)'],[.5,'rgba(255,255,255,'+a+')'],[1,'rgba('+c+',0)']]);
        h.beginPath();h.moveTo(60-dx*len,60-dy*len);h.lineTo(60+dy*1.2,60-dx*1.2);h.lineTo(60+dx*len,60+dy*len);h.lineTo(60-dy*1.2,60+dx*1.2);h.closePath();h.fill();}
      return s;});
    const stamp=(spr,x,y,z,a)=>{g.globalAlpha=a;g.drawImage(spr.c,x-z/2,y-z/2,z,z);};
    for(let i=0,n=Math.round(190*area);i<n;i++)stamp(dotSpr[(R()*6)|0],R()*W,R()*H,rr(4,10),rr(.45,1));
    for(let i=0;i<11;i++)stamp(bigSpr[[1,0,4,2,3][i%5]],rr(.03,.97)*W,rr(.03,.8)*H,M*rr(.05,.11),rr(.7,1));
    // the young cluster in its blue nebula; a globular cluster — a ball of old golden stars
    for(let i=0;i<46;i++){const a=R()*TAU,d=Math.pow(R(),1.5)*M*.075;stamp(dotSpr[i%3===2?4:1],cx2+Math.cos(a)*d,cy2+Math.sin(a)*d*.8,rr(4,11),rr(.6,1));}
    for(let i=0;i<4;i++)stamp(bigSpr[i%2?4:1],cx2+rr(-1,1)*M*.04,cy2+rr(-1,1)*M*.03,M*rr(.05,.08),.95);
    for(const[dx,dy,z]of[[-.2,-.12,.045],[.06,-.02,.06],[.22,.1,.036]])stamp(bigSpr[1],nx+dx*S,ny+dy*S,M*z,.9);          // the young stars that light the nebula
    const gx=W*.62,gy=H*.66;
    g.globalAlpha=1;g.fillStyle=rg(g,gx,gy,0,M*.05,[[0,'rgba(255,236,200,.5)'],[.4,'rgba(255,220,170,.16)'],[1,'rgba(255,220,170,0)']]);g.beginPath();g.arc(gx,gy,M*.05,0,TAU);g.fill();
    g.fillStyle='rgba(255,240,214,.85)';g.beginPath();for(let i=0;i<300;i++){const a=R()*TAU,d=Math.pow(R(),2.2)*M*.045,s=rr(.6,1.4);g.rect(gx+Math.cos(a)*d,gy+Math.sin(a)*d,s,s);}g.fill();
    // far galaxies: an edge-on spindle with its dust line, soft ellipticals, a little face-on spiral
    const far=(x,y,s,rot,kind,col)=>{g.save();g.translate(x,y);g.rotate(rot);g.globalAlpha=1;
      if(kind==='edge'){g.scale(1,.2);g.fillStyle=rg(g,0,0,0,s,[[0,'rgba(255,244,224,.95)'],[.2,'rgba('+col+',.6)'],[.6,'rgba('+col+',.22)'],[1,'rgba('+col+',0)']]);g.beginPath();g.arc(0,0,s,0,TAU);g.fill();
        g.scale(1,.3);g.fillStyle='rgba(30,16,20,.6)';g.fillRect(-s*.7,-s*.16,s*1.4,s*.32);}
      else if(kind==='ell'){g.scale(1,.66);g.fillStyle=rg(g,0,0,0,s,[[0,'rgba(255,244,226,.9)'],[.25,'rgba('+col+',.4)'],[1,'rgba('+col+',0)']]);g.beginPath();g.arc(0,0,s,0,TAU);g.fill();}
      else{g.scale(1,.6);g.fillStyle=rg(g,0,0,0,s,[[0,'rgba(255,246,230,.9)'],[.2,'rgba('+col+',.34)'],[1,'rgba('+col+',0)']]);g.beginPath();g.arc(0,0,s,0,TAU);g.fill();
        g.fillStyle='rgba('+col+',.8)';g.beginPath();for(let arm=0;arm<2;arm++)for(let i=0;i<34;i++){const d=.16+i/34*.8,th=arm*Math.PI+d*4.4;g.rect(Math.cos(th)*d*s,Math.sin(th)*d*s,1.1,1.1);}g.fill();}
      g.restore();};
    far(W*.41,H*.06,M*.05,-.5,'edge','196,206,255');far(W*.045,H*.36,M*.024,.3,'ell','255,224,190');far(W*.21,H*.3,M*.03,.8,'spiral','190,210,255');
    far(W*.5,H*.7,M*.034,.9,'edge','255,220,196');far(W*.69,H*.5,M*.02,-.2,'ell','210,220,255');far(W*.93,H*.9,M*.03,.4,'spiral','255,214,220');far(W*.33,H*.16,M*.018,1.2,'ell','255,230,200');
    g.globalAlpha=1;g.fillStyle=rg(g,SUN.x,H+M*.12,M*.1,M*1.0,[[0,'rgba(255,176,96,.36)'],[.45,'rgba(255,124,72,.13)'],[1,'rgba(255,110,60,0)']]);g.fillRect(0,0,W,H);      // the Sun's light spills up from below
    // nothing painted here may sit inside the hole's own neighbourhood
    g.globalAlpha=1;g.globalCompositeOperation='destination-out';
    g.fillStyle=rg(g,BH.x,BH.y,BH.r*3.3,BH.r*5,[[0,'rgba(0,0,0,1)'],[1,'rgba(0,0,0,0)']]);g.fillRect(0,0,W,H);
    g.globalCompositeOperation='source-over';
    SKY_MS=performance.now()-t0;
  }

  // ── the sky: stars, constellations, the nebula, galaxies
  function drawSky(t){
    for(const f of FAR){                                   // one path per twinkle group
      ctx.fillStyle='rgba(236,242,255,'+(.32+.3*Math.sin(t*f.spd+f.ph)).toFixed(3)+')';ctx.beginPath();
      const p=f.pts;for(let i=0;i<p.length;i+=3)ctx.rect(p[i],p[i+1],p[i+2],p[i+2]);
      ctx.fill();
    }
    for(const s of NEAR){
      const tw=.55+.45*Math.sin(t*s.spd+s.tw),z=48*s.k*(.85+.15*tw);
      ctx.globalAlpha=.4+.6*tw;ctx.drawImage(STAR_SPR[s.spr].c,s.x-z/2,s.y-z/2,z,z);
    }
    ctx.globalAlpha=1;
    for(const c of CONS){
      blit(c.spr,c.x,c.y);
      const f=clickEnv(c.litT,t,3);if(f>0){ctx.globalAlpha=f;blit(c.hi,c.x,c.y);ctx.globalAlpha=1;}
    }
  }
  // a galaxy turns slowly, so its tilted, rotated image is re-rendered into its own small
  // canvas only twice a second (every frame while a tap has it whirling)
  function drawGalaxies(t,dt){
    for(const g of GALAXIES){
      const f=clickEnv(g.boostT,t,3);
      if(f>0)g.x2+=dt*g.spin*12*f;
      if(t>=g.next){
        g.next=t+(f>0?0:.5);
        const D=g.scale*2.7,h=g.cv.g;h.setTransform(BK,0,0,BK,0,0);h.clearRect(0,0,D,D);
        h.translate(D/2,D/2);h.rotate(g.ang*.35);h.scale(1,g.tilt);h.rotate(g.ang+t*g.spin+g.x2);
        h.drawImage(g.spr.c,-D/2,-D/2,D,D);
      }
      const D=g.scale*2.7;
      ctx.drawImage(g.cv.c,g.x-D/2,g.y-D/2,D,D);
      if(f>0){ctx.globalAlpha=f*.7;ctx.drawImage(g.cv.c,g.x-D/2,g.y-D/2,D,D);ctx.globalAlpha=1;}
    }
  }
  // travellers: little wandering lights the hole pulls in; a tap on empty sky scatters a burst of them
  function spawnTraveler(anywhere){
    const speed=.3+Math.random()*1.6;let x,y,ang;
    if(anywhere){x=Math.random()*W;y=Math.random()*H;ang=Math.random()*TAU;}
    else{const e=(Math.random()*4)|0;
      if(e===0){x=-10;y=Math.random()*H;ang=rnd(-1,1);}else if(e===1){x=W+10;y=Math.random()*H;ang=Math.PI+rnd(-1,1);}
      else if(e===2){x=Math.random()*W;y=-10;ang=Math.PI/2+rnd(-1,1);}else{x=Math.random()*W;y=H+10;ang=-Math.PI/2+rnd(-1,1);}}
    return{x,y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,r:1+Math.random()*1.4};
  }
  function drawTravelers(){
    ctx.fillStyle='rgba(232,240,255,.85)';ctx.beginPath();
    for(let i=0;i<TRAVELERS.length;i++){
      const s=TRAVELERS[i];
      const g=bhPull(s,.5);
      s.x+=s.vx;s.y+=s.vy;
      if(g<0||s.x<-30||s.x>W+30||s.y<-30||s.y>H+30){TRAVELERS[i]=spawnTraveler(false);continue;}
      ctx.rect(s.x-s.r/2,s.y-s.r/2,s.r,s.r);
    }
    ctx.fill();
  }

  // ── SATURN: the far rings, the turning body, the near rings, a little orbiting gravel
  function drawSaturn(t,dt){
    const p=PLANET,f=clickEnv(p.boostT,t,3),r=p.r,S=RING_OUT*r+4;
    const la=Math.atan2(SUN.y-p.y,SUN.x-p.x);
    if(p.ringLa===null||Math.abs(la-p.ringLa)>.12)bakeRings(p,la);
    if(f>0)glow('255,214,150',p.x,p.y,r*2.6,.3*f);
    const wob=f>0?Math.sin(t*3)*.06*f:0;                    // a tap: the rings rock (a rotated blit only while it lasts)
    const ring=i=>{if(wob){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(wob);ctx.drawImage(p.rings[i].c,-S,-S,S*2,S*2);ctx.restore();}else ctx.drawImage(p.rings[i].c,p.x-S,p.y-S,S*2,S*2);};
    const rocks=front=>{if(!p.rocks.length)return;
      ctx.fillStyle=front?'rgba(226,214,190,.9)':'rgba(200,188,166,.5)';ctx.beginPath();
      const cr=Math.cos(RING_ROT),sr=Math.sin(RING_ROT);
      for(const ro of p.rocks){if((Math.sin(ro.ang)>=0)!==front)continue;
        const ex=Math.cos(ro.ang)*r*ro.k,ey=Math.sin(ro.ang)*r*ro.k*RING_ASP;
        ctx.rect(p.x+ex*cr-ey*sr-ro.size/2,p.y+ex*sr+ey*cr-ro.size/2,ro.size,ro.size);}
      ctx.fill();};
    for(const ro of p.rocks)ro.ang+=ro.spd*dt*(1+3*f);
    ring(0);rocks(false);
    drawBody(p.body,p.x,p.y,t,dt,.05,f);
    ring(1);rocks(true);
  }

  // ── EARTH: the Moon and two satellites circle it (behind, then in front), an aurora at the pole
  function bakeSat(z){                                      // a tiny satellite: a gold body between two blue panels
    const s=mk(z*2.4,z),g=s.g,w=z*2.4;
    g.fillStyle=lg(g,0,0,0,z,[[0,'#6fa8ff'],[1,'#2f5fc0']]);g.fillRect(0,z*.22,w*.36,z*.56);g.fillRect(w*.64,z*.22,w*.36,z*.56);
    g.strokeStyle='rgba(220,235,255,.6)';g.lineWidth=.6;for(const x0 of[0,w*.64])for(let i=1;i<3;i++){g.beginPath();g.moveTo(x0+w*.12*i,z*.22);g.lineTo(x0+w*.12*i,z*.78);g.stroke();}
    g.fillStyle=lg(g,0,0,0,z,[[0,'#ffe9a8'],[1,'#c89a3c']]);g.beginPath();g.roundRect(w*.38,z*.1,w*.24,z*.8,z*.12);g.fill();
    g.fillStyle='#f4f6ff';g.beginPath();g.arc(w*.5,z*.06,z*.1,0,TAU);g.fill();
    return s;
  }
  function orbiterPos(o){
    const a=lastT*o.spd+o.phase+(o.lapT0!=null?TAU*Math.min(1,(lastT-o.lapT0)/2.2):0);
    if(o.lapT0!=null&&lastT-o.lapT0>2.2)o.lapT0=null;
    const ex=Math.cos(a)*EARTH.r*o.rx,ey=Math.sin(a)*EARTH.r*o.ry;
    return{x:EARTH.x+ex*.966+ey*.259,y:EARTH.y-ex*.259+ey*.966,behind:Math.sin(a)<0};      // the orbits lean 15°
  }
  function drawOrbiters(t,dt,behind){
    for(const o of ORBITERS){
      const q=orbiterPos(o);if(q.behind!==behind)continue;
      if(o.kind==='moon')drawBody(EARTH.moon,q.x,q.y,t,dt,0,0);
      else{const s=EARTH.sat,k=o.size/.3;ctx.drawImage(s.c,q.x-s.w*k/2,q.y-s.h*k/2,s.w*k,s.h*k);}
    }
  }
  function drawEarth(t,dt){
    const e=EARTH,f=clickEnv(e.boostT,t,3);
    drawOrbiters(t,dt,true);
    if(f>0)glow('150,200,255',e.x,e.y,e.r*2.6,.35*f);
    drawBody(e.body,e.x,e.y,t,dt,.12,f);
    glow('120,255,170',e.x-e.r*.2,e.y-e.r*.93,e.r*.62,.42+.3*Math.sin(t*1.7)+.2*f);     // the aurora dances at the pole
    drawOrbiters(t,dt,false);
  }

  // ── the passing worlds: the same sphere renderer; Jupiter keeps its four moons, Uranus its rings
  const ATM={venus:['255,236,190',1.4,.5],mars:['255,150,100',1.2,.3],neptune:['110,150,255',1.28,.4],uranus:['160,225,235',1.28,.4]};
  let rockSpr=null;
  function drawPasser(p,t,dt){
    const w=p.w,r=p.r,x=p.x+(p.ox||0),y=p.y+(p.oy||0),id=w.id,f=clickEnv(p.boostT,t,3);
    ctx.globalAlpha=p.g;
    if(f>0)glow('255,230,190',x,y,r*2.4,.3*f*p.g);
    if(id==='asteroid'){                                    // a tumbling cratered potato (a small rotated blit)
      ctx.save();ctx.translate(x,y);ctx.rotate(p.rot*3);ctx.drawImage(rockSpr.c,-r*1.5,-r*1.1,r*3,r*2.2);ctx.restore();ctx.globalAlpha=1;return;
    }
    const b=p.body||(p.body=makeBody(richTex(id),r,{ry:id==='jupiter'?r*.935:r,atm:ATM[id]&&ATM[id][0],atmK:ATM[id]&&ATM[id][1],atmA:ATM[id]&&ATM[id][2]}));
    b.rot=p.rot;
    const moons=front=>{if(id!=='jupiter')return;ctx.fillStyle='#e8dcc0';ctx.beginPath();
      for(let i=0;i<JUP_MOONS.length;i++){const m=JUP_MOONS[i],a=t*m.spd*.35+p.ph+i*1.7;if((Math.sin(a)>0)!==front)continue;
        const z=Math.max(1,r*m.sz),mx=x+Math.cos(a)*r*m.k,my=y+Math.sin(a)*r*m.k*.07-b.ry*.04;ctx.moveTo(mx+z,my);ctx.arc(mx,my,z,0,TAU);}
      ctx.fill();};
    const ringHalf=(a0,a1,al)=>{ctx.strokeStyle='rgba(208,238,244,'+al+')';ctx.lineWidth=Math.max(1,r*.05);ctx.beginPath();ctx.ellipse(x,y,r*.34,r*1.9,.22,a0,a1);ctx.stroke();};
    moons(false);
    if(id==='uranus')ringHalf(Math.PI*.5,Math.PI*1.5,.3);
    drawBody(b,x,y,t,dt,0,0);
    if(id==='uranus')ringHalf(-Math.PI*.5,Math.PI*.5,.42);
    moons(true);
    ctx.globalAlpha=1;
  }

  /* ── THE SUN: an enormous disc parked below the screen; only its limb shows.
     Baked once at half resolution (it is soft): the corona, the limb-darkened
     disc with its boiling granulation, three sunspots, the red chromosphere.
     Live: the corona breathes (a second blit), three prominence loops rise and
     sink (baked arches, stretched), and now and then — or on a tap — a flare.   */
  let SUNSPR=null,CORONA=null,PROMS=[],flareT=null,flareAng=0,nextFlareAt=null,FLARE=null;
  function bakeSun(){
    const R=SUN.r,top=H-H*.11-M*.17,h=H-top,q=.5;
    const make=()=>{const c=document.createElement('canvas');c.width=Math.ceil(W*q);c.height=Math.ceil(h*q);const g=c.getContext('2d');g.scale(q,q);g.translate(0,-top);return{c,g};};
    // the corona: a wide warm halo, and long streamers standing out from the limb
    {const topC=H-H*.11-M*.36,hC=H-topC,c=document.createElement('canvas');c.width=Math.ceil(W*q);c.height=Math.ceil(hC*q);const g=c.getContext('2d');g.scale(q,q);g.translate(0,-topC);
      g.fillStyle=rg(g,SUN.x,SUN.y,R*.98,R+M*.36,[[0,'rgba(255,232,150,.85)'],[.1,'rgba(255,190,96,.5)'],[.3,'rgba(255,140,70,.2)'],[.6,'rgba(255,110,60,.07)'],[1,'rgba(255,100,50,0)']]);g.fillRect(0,topC,W,hC);
      g.globalCompositeOperation='lighter';g.lineCap='round';
      for(let i=0;i<30;i++){const a=-Math.PI/2+rnd(-.5,.5),len=M*rnd(.08,.3)*(1-Math.abs(a+Math.PI/2)*.6),x0=SUN.x+Math.cos(a)*R,y0=SUN.y+Math.sin(a)*R,x1=SUN.x+Math.cos(a)*(R+len),y1=SUN.y+Math.sin(a)*(R+len);
        g.strokeStyle=lg(g,x0,y0,x1,y1,[[0,'rgba(255,226,160,.09)'],[1,'rgba(255,190,110,0)']]);g.lineWidth=rnd(16,46);g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();}
      CORONA={c,top:topC,h:hC};}
    // the disc
    {const s=make(),g=s.g;
      g.save();g.beginPath();g.arc(SUN.x,SUN.y,R,0,TAU);g.clip();
      g.fillStyle=rg(g,SUN.x,SUN.y,R*.86,R,[[0,'#fff3bc'],[.4,'#ffdc6a'],[.72,'#ffb43c'],[.92,'#f07a1e'],[1,'#c8441a']]);g.fillRect(0,top,W,h);
      {const NT=noiseTiles(),dark=document.createElement('canvas');dark.width=dark.height=256;const dg=dark.getContext('2d');   // granulation: bright cells, a net of darker lanes
        dg.fillStyle='rgb(176,64,12)';dg.fillRect(0,0,256,256);dg.globalCompositeOperation='destination-in';dg.drawImage(NT.wisp,0,0);
        const lay=(tile,sx,sy,mode,a)=>{g.save();g.globalCompositeOperation=mode;g.globalAlpha=a;g.translate(0,top);g.scale(sx,sy);g.fillStyle=g.createPattern(tile,'repeat');g.fillRect(0,0,W/sx,h/sy);g.restore();};
        lay(NT.soft,1.5,.8,'soft-light',.34);lay(NT.grain,.12,.08,'overlay',.5);lay(dark,.14,.09,'multiply',.34);lay(dark,.9,.4,'multiply',.16);}
      for(const[da,k]of[[-.22,.985],[-.05,.975],[.17,.99]]){ // sunspots, foreshortened near the limb
        const a=-Math.PI/2+da,x=SUN.x+Math.cos(a)*R*k,y=SUN.y+Math.sin(a)*R*k;
        g.save();g.translate(x,y);g.rotate(a+Math.PI/2);
        g.fillStyle='rgba(150,70,20,.6)';g.beginPath();g.ellipse(0,0,M*.016,M*.006,0,0,TAU);g.fill();
        g.fillStyle='rgba(60,24,10,.9)';g.beginPath();g.ellipse(0,0,M*.009,M*.0034,0,0,TAU);g.fill();g.restore();
      }
      g.restore();
      g.strokeStyle='rgba(255,96,60,.75)';g.lineWidth=3;g.beginPath();g.arc(SUN.x,SUN.y,R+1,Math.PI*1.2,Math.PI*1.8);g.stroke();   // the chromosphere
      g.strokeStyle='rgba(255,150,80,.55)';g.lineWidth=1.2;g.lineCap='round';g.beginPath();                                       // spicules: a fuzz of tiny jets
      for(let i=0;i<150;i++){const a=-Math.PI/2+rnd(-.5,.5),l=rnd(3,9);g.moveTo(SUN.x+Math.cos(a)*R,SUN.y+Math.sin(a)*R);g.lineTo(SUN.x+Math.cos(a+rnd(-.004,.004))*(R+l),SUN.y+Math.sin(a)*(R+l));}
      g.stroke();
      SUNSPR={c:s.c,top,h};}
    // prominences: glowing arches standing on the limb
    PROMS=[];
    for(const[da,wd,ht]of[[-.13,.05,.06],[.06,.036,.04],[.24,.045,.05]]){
      const a=-Math.PI/2+da,bx=SUN.x+Math.cos(a)*R,by=SUN.y+Math.sin(a)*R,w=R*wd*2,hh=M*ht,s=mk(w+24,hh+14),g=s.g;
      g.lineCap='round';g.globalCompositeOperation='lighter';
      for(let k=0;k<7;k++){                                // strand inside strand: deep red outside, white-hot at the core
        const u=k/6,x0=12+w*.13*u*rnd(.5,1.2),x1=w+12-w*.13*u*rnd(.5,1.2),tp=-hh*.25+hh*.34*u;
        g.strokeStyle=k<2?'rgba(255,70,44,.3)':k<5?'rgba(255,150,80,.42)':'rgba(255,238,196,.7)';g.lineWidth=k<2?3.6-k:k<5?1.5:.9;
        g.beginPath();g.moveTo(x0,hh+10);g.bezierCurveTo(x0-w*.05,tp,x1+w*.05,tp,x1,hh+10);g.stroke();}
      PROMS.push({s,x:bx-w/2-12,y:by+2,w:w+24,h:hh+14,ph:Math.random()*TAU});
    }
    // the flare: a bright plume, baked pointing up
    {const w=M*.05,hh=M*.2;FLARE=mk(w,hh);const g=FLARE.g;
      g.fillStyle=lg(g,0,hh,0,0,[[0,'rgba(255,250,220,.95)'],[.35,'rgba(255,190,90,.7)'],[1,'rgba(255,120,50,0)']]);
      g.beginPath();g.moveTo(w*.5,0);g.quadraticCurveTo(w*1.0,hh*.6,w*.72,hh);g.lineTo(w*.28,hh);g.quadraticCurveTo(0,hh*.6,w*.5,0);g.fill();}
    nextFlareAt=lastT+12+Math.random()*20;flareT=null;
  }
  function sunFlare(t){flareT=t;flareAng=-Math.PI/2+rnd(-.3,.3);}
  function drawSun(t){
    ctx.drawImage(CORONA.c,0,CORONA.top,W,CORONA.h);
    if(!lite()){ctx.globalAlpha=.2+.18*Math.sin(t*.9);ctx.drawImage(CORONA.c,0,CORONA.top,W,CORONA.h);ctx.globalAlpha=1;}   // it breathes
    for(const p of PROMS){const k=.72+.28*Math.sin(t*.5+p.ph);ctx.drawImage(p.s.c,p.x,p.y-p.h*k,p.w,p.h*k);}
    if(nextFlareAt!==null&&t>nextFlareAt){sunFlare(t);nextFlareAt=t+22+Math.random()*30;}
    if(flareT!==null){
      const p=(t-flareT)/2.6;
      if(p>=1)flareT=null;
      else{const k=Math.sin(Math.min(1,p*1.6)*Math.PI/2),a=p<.6?1:1-(p-.6)/.4,x=SUN.x+Math.cos(flareAng)*SUN.r,y=SUN.y+Math.sin(flareAng)*SUN.r;
        ctx.save();ctx.translate(x,y);ctx.rotate(flareAng+Math.PI/2);ctx.globalAlpha=a;ctx.drawImage(FLARE.c,-FLARE.w/2,-FLARE.h*k,FLARE.w,FLARE.h*k);ctx.restore();
        glow('255,220,150',x,y,M*.09*k,.6*a);}
    }
    ctx.drawImage(SUNSPR.c,0,SUNSPR.top,W,SUNSPR.h);
  }

  // ── small things, baked: a comet's tail, the nova's ring, a space rock, a shooting-star streak
  let TAILSPR=null,RINGSPR=null,STREAK=null;
  function bakeSmall(){
    {const w=150,h=34;TAILSPR=mk(w,h);const g=TAILSPR.g;                    // pointing +x from the head at (0, h/2)
      for(const[sp,al]of[[1,.16],[.62,.2],[.3,.3]]){                    // a feathered dust plume: wide and faint over narrow and brighter
        g.fillStyle=lg(g,0,0,w,0,[[0,'rgba(255,244,214,'+al+')'],[.35,'rgba(255,228,176,'+(al*.5).toFixed(3)+')'],[1,'rgba(255,220,160,0)']]);
        g.beginPath();g.moveTo(0,h/2-2);g.quadraticCurveTo(w*.5,h/2-h*.42*sp,w*.96,h/2-h*.3*sp);g.lineTo(w*.96,h/2+h*.3*sp);g.quadraticCurveTo(w*.5,h/2+h*.42*sp,0,h/2+2);g.closePath();g.fill();}
      g.strokeStyle=lg(g,0,0,w,0,[[0,'rgba(170,214,255,.9)'],[1,'rgba(150,200,255,0)']]);g.lineWidth=2;g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2-2);g.stroke();}
    {RINGSPR=mk(128,128);const g=RINGSPR.g;
      g.fillStyle=rg(g,64,64,34,64,[[0,'rgba(255,255,255,0)'],[.62,'rgba(190,220,255,.2)'],[.84,'rgba(255,246,220,.95)'],[.94,'rgba(255,170,120,.55)'],[1,'rgba(255,120,90,0)']]);g.fillRect(0,0,128,128);}
    {rockSpr=mk(60,44);const g=rockSpr.g;g.translate(30,22);
      const sh=Array.from({length:13},(_,i)=>.7+.3*Math.abs(Math.sin(i*2.7+1.3)));
      const path=()=>{g.beginPath();sh.forEach((k,i)=>{const a=i/sh.length*TAU;i?g.lineTo(Math.cos(a)*27*k,Math.sin(a)*19*k):g.moveTo(Math.cos(a)*27*k,Math.sin(a)*19*k);});g.closePath();};
      path();g.fillStyle=rg(g,6,10,2,34,[[0,'#cbbfae'],[.5,'#84766a'],[1,'#261e18']]);g.fill();
      g.save();path();g.clip();
      for(const[cx,cy,cr]of[[7,-5,5.5],[-10,6,4.6],[3,10,3.4],[-2,-11,2.6],[14,4,2.4]]){g.fillStyle='rgba(20,16,12,.45)';g.beginPath();g.arc(cx,cy,cr,0,TAU);g.fill();
        g.strokeStyle='rgba(236,226,210,.35)';g.lineWidth=.9;g.beginPath();g.arc(cx,cy,cr,Math.PI*.1,Math.PI*.9);g.stroke();}
      g.restore();}
    {STREAK=mk(120,6);const g=STREAK.g;g.fillStyle=lg(g,0,0,120,0,[[0,'rgba(255,255,255,0)'],[.8,'rgba(220,236,255,.7)'],[1,'rgba(255,255,255,1)']]);
      g.beginPath();g.moveTo(0,3);g.lineTo(120,.6);g.lineTo(120,5.4);g.closePath();g.fill();}
  }

  // ── comets: a glowing head and a tail that always streams away from the Sun (max two)
  function spawnComet(anywhere){
    const fromLeft=Math.random()<.5;
    return{x:anywhere?Math.random()*W*.7:(fromLeft?-60:W+60),y:Math.random()*H*.7,vx:(fromLeft?1:-1)*(2.2+Math.random()*2.4),vy:.4+Math.random()*.9,delay:anywhere?Math.random()*6:4+Math.random()*10};
  }
  function drawComets(t,dt){
    for(let i=0;i<COMETS.length;i++){
      const c=COMETS[i];
      if(c.delay>0){c.delay-=dt;continue;}
      const g=bhPull(c,.6);
      c.x+=c.vx;c.y+=c.vy;
      if(g<0||c.x<-200||c.x>W+200||c.y>H+120||c.y<-200){COMETS[i]=spawnComet(false);continue;}
      const a=Math.atan2(c.y-SUN.y,c.x-SUN.x),cs=Math.cos(a),sn=Math.sin(a),k=clamp(M/800,.6,1.2);
      ctx.setTransform(DPR2*cs*k,DPR2*sn*k,-DPR2*sn*k,DPR2*cs*k,DPR2*c.x,DPR2*c.y);
      ctx.globalAlpha=Math.max(0,g);ctx.drawImage(TAILSPR.c,0,-TAILSPR.h/2,TAILSPR.w,TAILSPR.h);
      ctx.setTransform(DPR2,0,0,DPR2,0,0);
      glow('235,246,255',c.x,c.y,13*k,.95*Math.max(0,g));
    }
    ctx.globalAlpha=1;
  }
  // ── a shooting star now and then: one stretched streak
  let shoot=null,nextShootAt=6+Math.random()*10;
  function drawShoot(t){
    if(!shoot&&t>nextShootAt){nextShootAt=t+8+Math.random()*14;const a=rnd(.3,.9)*(Math.random()<.5?1:-1)+(Math.random()<.5?0:Math.PI);
      shoot={t0:t,x:rnd(.1,.7)*W,y:rnd(.05,.5)*H,a:Math.abs(Math.sin(a))<.2?a+.4:a};}
    if(!shoot)return;
    const p=(t-shoot.t0)/.7;if(p>=1){shoot=null;return;}
    const d=p*M*.5,cs=Math.cos(shoot.a),sn=Math.abs(Math.sin(shoot.a)),x=shoot.x+cs*d,y=shoot.y+sn*d;
    ctx.setTransform(DPR2*cs,DPR2*sn,-DPR2*sn,DPR2*cs,DPR2*x,DPR2*y);
    ctx.globalAlpha=Math.sin(p*Math.PI);ctx.drawImage(STREAK.c,-STREAK.w,-STREAK.h/2,STREAK.w,STREAK.h);
    ctx.setTransform(DPR2,0,0,DPR2,0,0);ctx.globalAlpha=1;
  }
  // ── the supernova: a flash, an expanding ring, a spray of debris, a fading ember cloud
  function buildNova(x,y,t){
    return{x,y,t0:t,col:pick(['255,170,200','170,210,255','255,214,150']),bits:Array.from({length:14},()=>{const a=Math.random()*TAU,v=rnd(.4,1);return[Math.cos(a)*v,Math.sin(a)*v];})};
  }
  function drawNova(t){
    if(!nova){
      if(t>nextNovaAt&&NEAR.length){const s=pick(NEAR);nova=buildNova(s.x,s.y,t);nextNovaAt=t+35+Math.random()*45;}
      return;
    }
    const p=(t-nova.t0)/5;if(p>=1){nova=null;return;}
    const R=M*.11,e=1-Math.pow(1-p,3);
    if(p<.25)glow('255,255,255',nova.x,nova.y,R*(.4+p*4),1-p*4);                    // the flash
    glow(nova.col,nova.x,nova.y,R*(.5+e*.7),.5*(1-p));                               // the cloud left behind
    ctx.globalAlpha=(1-p)*.95;const rr=R*e*1.3;ctx.drawImage(RINGSPR.c,nova.x-rr,nova.y-rr,rr*2,rr*2);ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,240,214,'+(1-p).toFixed(3)+')';ctx.beginPath();
    for(const b of nova.bits)ctx.rect(nova.x+b[0]*R*e*1.5-1,nova.y+b[1]*R*e*1.5-1,2.2,2.2);
    ctx.fill();
  }
  // ── tidal streaks: whatever the hole takes is pulled into a thin bright arc winding inward
  function drawTidal(t){
    for(let i=TIDAL.length-1;i>=0;i--){
      const s=TIDAL[i],p=(t-s.t0)/1.6;
      if(p>=1){TIDAL.splice(i,1);continue;}
      ctx.strokeStyle='rgba(255,226,180,'+(.85*(1-p)).toFixed(3)+')';ctx.lineWidth=Math.max(1.2,Math.min(4,s.big*.12))*(1-p*.6);ctx.lineCap='round';
      ctx.beginPath();ctx.arc(BH.x,BH.y,BH.r*(1.25-p*.2),s.ang+p*2.4,s.ang+p*2.4+1.1+p*1.6);ctx.stroke();
    }
  }
  // ── the feeding frenzy's morsel: a space rock spirals in and is drawn out into a streak
  let ROCK=null;
  function drawRock(t){
    if(!ROCK)return;
    const p=(t-ROCK.t0)/3.2;
    if(p>=1){TIDAL.push({ang:ROCK.ang0+ROCK.dir*p*9,t0:t,big:26});ROCK=null;return;}
    const d=BH.r*(6.2-5.1*p*p),a=ROCK.ang0+ROCK.dir*p*p*9,x=BH.x+Math.cos(a)*d,y=BH.y+Math.sin(a)*d*.8,z=M*.022*(1-p*.5),st=1+p*p*2.4;
    ctx.save();ctx.translate(x,y);ctx.rotate(a+ROCK.dir*Math.PI/2);ctx.globalAlpha=Math.min(1,(1-p)*3);
    ctx.drawImage(rockSpr.c,-z*1.4*st,-z,z*2.8*st,z*2);ctx.restore();ctx.globalAlpha=1;
  }
  // ── sparks: one small pool for every burst (a tap on the rocket, the astronaut, a galaxy…)
  const SPARKS=[];
  function burst(x,y,n,sp){for(let i=0;i<n&&SPARKS.length<48;i++){const a=Math.random()*TAU,v=sp*(.4+Math.random()*.6);SPARKS.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t0:lastT,life:.7+Math.random()*.6});}}
  function drawSparks(t,dt){
    if(!SPARKS.length)return;
    ctx.fillStyle='rgba(255,240,190,.92)';ctx.beginPath();
    for(let i=SPARKS.length-1;i>=0;i--){
      const s=SPARKS[i],k=(t-s.t0)/s.life;
      if(k>=1){SPARKS.splice(i,1);continue;}
      s.x+=s.vx*dt;s.y+=s.vy*dt;const z=3.2*(1-k);
      ctx.rect(s.x-z/2,s.y-z/2,z,z);
    }
    ctx.fill();
  }

  /* ── THE CREW: a little rocket on patrol and an astronaut floating by the Earth.
     Both are baked sprites; a frame is one rotated blit each (plus the rocket's
     flickering flame and a short exhaust trail drawn as one path).              */
  let ROCKET=null,ASTRO=null;
  function buildCrew(){
    const k=clamp(M/800,.62,1.15);
    const spr=mk(96,52),g=spr.g;                            // THE ROCKET, nose toward +x: a polished hull, a red nose and fins, a brass porthole
    g.fillStyle=lg(g,6,0,20,0,[[0,'#3a4258'],[.5,'#9aa4bc'],[1,'#5a6480']]);g.beginPath();g.moveTo(20,17);g.lineTo(7,11);g.quadraticCurveTo(4,26,7,41);g.lineTo(20,35);g.closePath();g.fill();   // the engine bell
    g.fillStyle='rgba(255,190,90,.7)';g.beginPath();g.ellipse(8,26,2.4,11,0,0,TAU);g.fill();
    for(const sy of[1,-1]){g.save();g.translate(0,26);g.scale(1,sy);                // two swept fins, lit along the leading edge
      g.fillStyle=lg(g,0,-26,0,-9,[[0,'#ff8a9a'],[.5,'#e8405c'],[1,'#a82240']]);g.beginPath();g.moveTo(44,-12);g.quadraticCurveTo(34,-22,22,-26);g.lineTo(12,-24);g.quadraticCurveTo(18,-18,20,-11);g.closePath();g.fill();
      g.strokeStyle='rgba(255,220,226,.8)';g.lineWidth=1;g.beginPath();g.moveTo(44,-12);g.quadraticCurveTo(34,-22,22,-26);g.stroke();g.restore();}
    const hull=()=>{g.beginPath();g.moveTo(18,13);g.bezierCurveTo(42,8.6,72,10,94.6,26);g.bezierCurveTo(72,42,42,43.4,18,39);g.closePath();};
    g.fillStyle=lg(g,0,10,0,42,[[0,'#ffffff'],[.28,'#f2f5fb'],[.62,'#c9d2e6'],[1,'#8792b0']]);hull();g.fill();
    g.save();hull();g.clip();
    g.fillStyle=lg(g,0,10,0,42,[[0,'#ff97a6'],[.4,'#ea4862'],[1,'#9c1e3c']]);g.fillRect(70,6,28,40);g.fillRect(23,6,6,40);          // the nose cone, a band round the tail
    g.strokeStyle='rgba(90,104,140,.45)';g.lineWidth=.8;g.beginPath();g.moveTo(34,8);g.lineTo(34,44);g.moveTo(62,8);g.lineTo(62,44);g.stroke();   // panel seams and their rivets
    g.fillStyle='rgba(90,104,140,.55)';for(const x of[34,62])for(let y=14;y<40;y+=5){g.beginPath();g.arc(x+2,y,.6,0,TAU);g.fill();}
    g.fillStyle=lg(g,0,10,0,20,[[0,'rgba(255,255,255,.9)'],[1,'rgba(255,255,255,0)']]);g.beginPath();g.ellipse(52,14.6,38,3,.02,0,TAU);g.fill();                    // the light along its back
    g.fillStyle=lg(g,0,32,0,43,[[0,'rgba(30,40,80,0)'],[1,'rgba(30,40,80,.4)']]);g.fillRect(16,32,80,12);
    g.restore();
    g.fillStyle=lg(g,38,16,58,36,[[0,'#ffe9a8'],[.5,'#d8a23c'],[1,'#8a5a14']]);g.beginPath();g.arc(48,26,9.6,0,TAU);g.fill();                                        // the porthole: a brass ring, deep glass, a glint
    g.fillStyle=rg(g,45,23,1,8,[[0,'#dff6ff'],[.5,'#62b6ee'],[1,'#1f4f9a']]);g.beginPath();g.arc(48,26,7,0,TAU);g.fill();
    g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.ellipse(45.4,22.8,2.6,1.4,-.6,0,TAU);g.fill();g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(50.6,29,.9,0,TAU);g.fill();
    g.fillStyle='#8a5a14';for(let i=0;i<6;i++){const a=i/6*TAU+.3;g.beginPath();g.arc(48+Math.cos(a)*8.3,26+Math.sin(a)*8.3,.6,0,TAU);g.fill();}
    const flame=len=>{const s=mk(len+4,22),h=s.g;h.fillStyle=lg(h,len+4,0,0,0,[[0,'rgba(210,236,255,.98)'],[.16,'rgba(255,255,255,.98)'],[.4,'rgba(255,224,120,.95)'],[.74,'rgba(255,130,56,.7)'],[1,'rgba(255,80,40,0)']]);
      h.beginPath();h.moveTo(len+4,4);h.quadraticCurveTo(len*.5,1,0,11);h.quadraticCurveTo(len*.5,21,len+4,18);h.closePath();h.fill();
      h.fillStyle=lg(h,len+4,0,len*.4,0,[[0,'rgba(170,214,255,.9)'],[1,'rgba(170,214,255,0)']]);h.beginPath();h.moveTo(len+4,7.6);h.quadraticCurveTo(len*.7,8,len*.4,11);h.quadraticCurveTo(len*.7,14,len+4,14.4);h.closePath();h.fill();return s;};
    ROCKET={k,x:W*.44,y:H*.6,a:0,leg:null,trail:[],lastTrail:0,loopT:null,spr,fl:[flame(22),flame(30)]};
    newLeg(ROCKET);
    const as=mk(60,76),h=as.g;                              // THE ASTRONAUT, floating with one arm up: a soft white suit, a gold visor with the Earth in it
    h.fillStyle=lg(h,10,0,50,0,[[0,'#8e98b4'],[.5,'#c9d1e2'],[1,'#7f8aa8']]);h.beginPath();h.roundRect(11,19,38,36,9);h.fill();                                       // the life-support pack
    h.fillStyle='#6f7a98';h.fillRect(14,24,4,10);h.fillRect(42,24,4,10);
    const limb=(x0,y0,x1,y1,w)=>{h.lineCap='round';h.strokeStyle='#aab4cc';h.lineWidth=w+1.6;h.beginPath();h.moveTo(x0+.8,y0+.8);h.lineTo(x1+.8,y1+.8);h.stroke();       // a limb: its shaded side, the suit, a ring at the joint
      h.strokeStyle='#fbfcff';h.lineWidth=w;h.beginPath();h.moveTo(x0,y0);h.lineTo(x1,y1);h.stroke();
      const mx=(x0+x1)/2,my=(y0+y1)/2,a=Math.atan2(y1-y0,x1-x0)+Math.PI/2;h.strokeStyle='#9aa6c2';h.lineWidth=1.4;h.beginPath();h.moveTo(mx-Math.cos(a)*w*.5,my-Math.sin(a)*w*.5);h.lineTo(mx+Math.cos(a)*w*.5,my+Math.sin(a)*w*.5);h.stroke();};
    limb(18,31,7,17,10);limb(42,31,53,40,10);limb(24,52,21,66,10.6);limb(36,52,40,65,10.6);
    for(const[x,y,r]of[[6,14.6,5.8],[54,41.4,5.8]]){h.fillStyle=lg(h,x-r,y-r,x+r,y+r,[[0,'#c2cce2'],[1,'#7884a6']]);h.beginPath();h.arc(x,y,r,0,TAU);h.fill();h.strokeStyle='rgba(60,70,100,.5)';h.lineWidth=.7;h.beginPath();h.moveTo(x-2,y-r*.5);h.lineTo(x-2,y+r*.2);h.moveTo(x+1,y-r*.6);h.lineTo(x+1,y+r*.2);h.stroke();}   // gloves
    for(const[x,y]of[[15,64],[34,63]]){h.fillStyle=lg(h,0,y,0,y+9,[[0,'#aab4cc'],[1,'#5e6a8c']]);h.beginPath();h.roundRect(x,y,13,8.6,4);h.fill();h.fillStyle='#414b68';h.fillRect(x+1,y+7,11,1.6);}   // boots and their soles
    h.fillStyle=lg(h,14,0,46,0,[[0,'#dfe5f2'],[.4,'#ffffff'],[1,'#c4cde0']]);h.beginPath();h.roundRect(15.4,24,29.2,31,10);h.fill();                                  // the suit's body
    h.fillStyle=lg(h,0,44,0,55,[[0,'rgba(120,134,170,0)'],[1,'rgba(120,134,170,.45)']]);h.beginPath();h.roundRect(15.4,40,29.2,15,10);h.fill();
    h.fillStyle=lg(h,0,35,0,48,[[0,'#eef1f8'],[1,'#c6cee0']]);h.beginPath();h.roundRect(21.6,35.6,16.8,11.6,3);h.fill();h.strokeStyle='rgba(110,124,160,.6)';h.lineWidth=.8;h.stroke();   // the chest pack and its lights
    for(const[x,c]of[[25.4,'#ff7fa8'],[30,'#8fe8c0'],[34.6,'#ffd86a']]){h.fillStyle=c;h.beginPath();h.arc(x,41.4,1.9,0,TAU);h.fill();h.fillStyle='rgba(255,255,255,.7)';h.beginPath();h.arc(x-.5,40.8,.6,0,TAU);h.fill();}
    h.fillStyle='#ff7fa8';h.beginPath();h.moveTo(21,31);h.bezierCurveTo(17.6,27.6,16,31.6,21,34.6);h.bezierCurveTo(26,31.6,24.4,27.6,21,31);h.fill();                  // a heart on the shoulder
    h.strokeStyle='#8e98b4';h.lineWidth=1.6;h.lineCap='round';h.beginPath();h.moveTo(40,46);h.quadraticCurveTo(48,50,46,40);h.stroke();                                 // an air hose
    h.fillStyle='#b4bed6';h.beginPath();h.roundRect(21,25.4,18,5,2.5);h.fill();                                                                                         // the neck ring
    h.fillStyle=rg(h,25,9,2,17,[[0,'#ffffff'],[.7,'#eef1f9'],[1,'#b9c3da']]);h.beginPath();h.arc(30,15,14.8,0,TAU);h.fill();                                           // the helmet
    h.save();h.beginPath();h.ellipse(30,16,10.8,9,0,0,TAU);h.clip();                                                                                                   // the visor: night-blue to gold, the Earth and a few stars in it
    h.fillStyle=lg(h,20,7,40,25,[[0,'#27357a'],[.5,'#131a40'],[.82,'#8a5a22'],[1,'#f0c064']]);h.fillRect(18,6,24,20);
    h.fillStyle=rg(h,24,24,1,9,[[0,'#8fd4ff'],[.6,'#2f78d8'],[1,'rgba(30,90,200,0)']]);h.beginPath();h.arc(24,25,8,0,TAU);h.fill();
    h.fillStyle='rgba(255,255,255,.9)';for(const[x,y]of[[34,11],[37,15],[31,13.6],[35.6,19]])h.fillRect(x,y,.9,.9);
    h.restore();
    h.strokeStyle='rgba(255,255,255,.8)';h.lineWidth=1.8;h.lineCap='round';h.beginPath();h.arc(30,16,7.6,Math.PI*1.05,Math.PI*1.5);h.stroke();
    h.strokeStyle='rgba(150,162,192,.8)';h.lineWidth=1;h.beginPath();h.ellipse(30,16,10.8,9,0,0,TAU);h.stroke();
    ASTRO={k,spr:as,ph:Math.random()*TAU,spinT:null,x:0,y:0};
  }
  // a waypoint clear of the hole and of the Sun's limb
  function crewPoint(){for(let i=0;i<20;i++){const x=rnd(.07,.74)*W,y=rnd(.12,.8)*H;if(Math.hypot(x-BH.x,y-BH.y)>BH.r*4.8)return{x,y};}return{x:W*.3,y:H*.5};}
  const bez=(L,u,k)=>{const v=1-u;return v*v*v*L.p0[k]+3*v*v*u*L.p1[k]+3*v*u*u*L.p2[k]+u*u*u*L.p3[k];};
  // the rocket flies smooth legs (cubic curves, each leaving along the heading it arrived on);
  // a leg whose curve would swing near the hole is thrown away and another is drawn
  function newLeg(r){
    const p0={x:r.x,y:r.y},d0=r.leg?r.leg.d1:{x:1,y:0};
    for(let tries=0;tries<12;tries++){
      const p3=crewPoint(),L=Math.hypot(p3.x-p0.x,p3.y-p0.y)||1,a1=Math.atan2(p3.y-p0.y,p3.x-p0.x)+rnd(-.9,.9),d1={x:Math.cos(a1),y:Math.sin(a1)};
      const leg={p0,p1:{x:p0.x+d0.x*L*.4,y:p0.y+d0.y*L*.4},p2:{x:p3.x-d1.x*L*.4,y:p3.y-d1.y*L*.4},p3,d1,u:0,dur:Math.max(4,L/(W/20))};
      let ok=L>M*.2;
      for(let i=1;i<10&&ok;i++){const x=bez(leg,i/10,'x'),y=bez(leg,i/10,'y');if(Math.hypot(x-BH.x,y-BH.y)<BH.r*3.8||y>H*.88||y<H*.04||x<W*.02)ok=false;}
      if(ok||tries===11){r.leg=leg;return;}
    }
  }
  function drawRocket(t,dt){
    const r=ROCKET,L=r.leg;
    L.u+=dt/L.dur;
    if(L.u>=1){r.x=L.p3.x;r.y=L.p3.y;newLeg(r);return drawRocket(t,0);}
    const u=L.u,nx=bez(L,u,'x'),ny=bez(L,u,'y'),ax=bez(L,Math.min(1,u+.01),'x')-nx,ay=bez(L,Math.min(1,u+.01),'y')-ny;
    r.x=nx;r.y=ny;if(ax||ay)r.a=Math.atan2(ay,ax);
    let roll=0;if(r.loopT!==null){const p=(t-r.loopT)/1.1;if(p>=1)r.loopT=null;else roll=TAU*p*p*(3-2*p);}
    const a=r.a+roll,cs=Math.cos(a),sn=Math.sin(a),k=r.k;
    if(t-r.lastTrail>.07){r.lastTrail=t;r.trail.push(nx-cs*44*k,ny-sn*44*k);if(r.trail.length>18)r.trail.splice(0,2);}
    ctx.fillStyle='rgba(255,220,160,.5)';ctx.beginPath();     // the exhaust trail: one path
    for(let i=0,n=r.trail.length/2;i<n;i++){const z=(1.2+i*.34)*k;ctx.rect(r.trail[i*2]-z/2,r.trail[i*2+1]-z/2,z,z);}
    ctx.fill();
    ctx.setTransform(DPR2*cs*k,DPR2*sn*k,-DPR2*sn*k,DPR2*cs*k,DPR2*nx,DPR2*ny);
    const fl=r.fl[((t*14)|0)&1];ctx.drawImage(fl.c,-48+12-fl.w,-fl.h/2,fl.w,fl.h);
    ctx.drawImage(r.spr.c,-48,-26,96,52);
    ctx.setTransform(DPR2,0,0,DPR2,0,0);
  }
  function drawAstro(t){
    const s=ASTRO,an=t*.1+s.ph,k=s.k;
    s.x=EARTH.x+Math.cos(an)*EARTH.r*3.4;s.y=EARTH.y+Math.sin(an)*EARTH.r*2.3+Math.sin(t*.8+s.ph)*5;
    let rot=Math.sin(t*.5+s.ph)*.35;if(s.spinT!==null){const p=(t-s.spinT)/1.4;if(p>=1)s.spinT=null;else rot+=TAU*p*p*(3-2*p);}
    const cs=Math.cos(rot),sn=Math.sin(rot);
    ctx.setTransform(DPR2*cs*k,DPR2*sn*k,-DPR2*sn*k,DPR2*cs*k,DPR2*s.x,DPR2*s.y);
    ctx.drawImage(s.spr.c,-30,-38,60,76);
    ctx.setTransform(DPR2,0,0,DPR2,0,0);
  }

  // ── what a tap can reach, small things first. Each target carries its Hebrew name + fact.
  const FACT_ROCKET=['חֲלָלִית','הַחֲלָלִית טָסָה בֶּחָלָל בְּעֶזְרַת מָנוֹעַ רָקֵטִי — הָאֵשׁ נִדְחֶפֶת אֲחוֹרָה, וְהַחֲלָלִית נִדְחֶפֶת קָדִימָה!'];
  const FACT_ASTRO=['אַסְטְרוֹנָאוּטִית','בֶּחָלָל אֵין אֲוִיר וְאֵין כְּבִידָה שֶׁמּוֹשֶׁכֶת לְמַטָּה — לָכֵן הָאַסְטְרוֹנָאוּטִית מְרַחֶפֶת, וַחֲלִיפַת הֶחָלָל שׁוֹמֶרֶת עָלֶיהָ.'];
  const earthOn=()=>EARTH.mv.state!=='wait',saturnOn=()=>PLANET.mv.state!=='wait';
  function hitTargets(){
    const T=[],add=(x,y,r,f,kind,o)=>T.push({x,y,r,name:f[0],fact:f[1],kind,o});
    if(earthOn()){
      ORBITERS.forEach((o,i)=>{const q=orbiterPos(o);add(q.x,q.y,EARTH.r*(i?.7:.8),i?FACT.sat:FACT.moon,'orbiter',o);});
      add(ASTRO.x,ASTRO.y,34*ASTRO.k,FACT_ASTRO,'astro');
    }
    if(nova)add(nova.x,nova.y,70,FACT.nova,'nova');
    for(const p of PASSERS)T.push({x:p.x+(p.ox||0),y:p.y+(p.oy||0),r:Math.max(p.r*1.4,18),name:p.w.name,fact:p.w.fact,kind:'passer',o:p});
    for(const c of COMETS)if(c.delay<=0)add(c.x,c.y,40,FACT.comet,'comet');
    add(ROCKET.x,ROCKET.y,42*ROCKET.k,FACT_ROCKET,'rocket');
    if(earthOn()){add(EARTH.x,EARTH.y-EARTH.r*1.1,EARTH.r*.45,FACT.aurora,'earth');add(EARTH.x,EARTH.y,EARTH.r*1.15,FACT.earth,'earth');}
    if(saturnOn())add(PLANET.x,PLANET.y,PLANET.r*2.2,FACT.saturn,'planet');
    add(BH.x,BH.y,BH.r*3.2,FACT.bh,'bh');
    for(const g of GALAXIES)add(g.x,g.y,g.scale*1.3,FACT.galaxy,'galaxy',g);
    for(const c of CONS)T.push({x:c.cn.hit.x,y:c.cn.hit.y,r:c.cn.hit.r,name:c.cn.name,fact:c.cn.fact,kind:'cons',o:c});
    add(SUN.x,SUN.y,SUN.r*1.02,FACT.sun,'sun');
    return T;
  }
  const TAPS={total:0,last:null};
  // Clicks land on the game's layers, not the canvas — listen on the document
  // and react only to clicks on the bare sky (not the game UI / poppables)
  const skyClick=e=>{
    if(stopped)return;
    if(e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov')){
      factEl.style.opacity='0';clearTimeout(factTimer);return;}
    const x=e.clientX,y=e.clientY;
    for(const tg of hitTargets()){
      if(Math.hypot(x-tg.x,y-tg.y)>tg.r)continue;
      TAPS.total++;TAPS.last=tg.kind;
      if(tg.kind==='bh'){
        bhFrenzyT=lastT;
        dustSurge();                 // GRAVITY SURGE: every grain on screen is yanked toward the hole
        if(!ROCK)ROCK={t0:lastT,ang0:Math.random()*TAU,dir:Math.random()<.5?-1:1};
      }
      else if(tg.kind==='galaxy'){tg.o.boostT=lastT;burst(tg.x,tg.y,8,60);}
      else if(tg.kind==='orbiter'){if(tg.o.lapT0==null)tg.o.lapT0=lastT;}
      else if(tg.kind==='earth'){EARTH.boostT=lastT;ORBITERS.forEach(o=>{if(o.lapT0==null)o.lapT0=lastT;});}
      else if(tg.kind==='planet')PLANET.boostT=lastT;
      else if(tg.kind==='passer')tg.o.boostT=lastT;
      else if(tg.kind==='cons')tg.o.litT=lastT;
      else if(tg.kind==='rocket'){if(ROCKET.loopT===null)ROCKET.loopT=lastT;burst(tg.x,tg.y,12,110);}
      else if(tg.kind==='astro'){if(ASTRO.spinT===null)ASTRO.spinT=lastT;burst(tg.x,tg.y,10,90);}
      else if(tg.kind==='sun'){if(flareT===null)sunFlare(lastT);}
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
    TAPS.total++;
    if(!nova){                       // a bright star: it goes supernova
      for(const s of NEAR)if(Math.hypot(x-s.x,y-s.y)<=22){nova=buildNova(s.x,s.y,lastT);TAPS.last='star';factEl.style.opacity='0';return;}
    }
    TAPS.last='sky';                 // empty sky: a burst of travellers from the spot
    for(let i=0;i<6;i++){
      const s=TRAVELERS[(Math.random()*TRAVELERS.length)|0],a=Math.random()*TAU,sp=1.6+Math.random()*2.2;
      s.x=x;s.y=y;s.vx=Math.cos(a)*sp;s.vy=Math.sin(a)*sp;
    }
    factEl.style.opacity='0';
  };
  document.addEventListener('click',skyClick);
  function onResize(){W=innerWidth;H=innerHeight;apply2DScale();buildScene();builtLite=lite();}
  window.addEventListener('resize',onResize);
  apply2DScale();
  buildScene();
  let builtLite=lite();
  let animId=null,lastFrameT=0,firstPainted=false;
  const perf={ms2d:0,frames:0};
  function frame(ts){
    if(stopped)return;
    const t=ts/1000;
    const dt=Math.min(.05,t-lastFrameT);
    lastFrameT=t;lastT=t;
    SURGE=clickEnv(bhFrenzyT,t,3.5);
    adaptQuality(dt,ts);
    if(lite()!==builtLite){builtLite=lite();buildDetail();}  // the governor reached (or left) its last-resort tier: thin the detail out, leave the worlds where they are
    renderGL(t,dt);                       // the sky + the black hole (GL layer, underneath)
    const c0=performance.now();
    ctx.clearRect(0,0,W,H);
    drawSky(t);
    if(glLost){                           // no GL: keep the hole's frame turning so the swirl still precesses
      phi+=SPIN_RATE*dt;
      Rh2w=M3.mul(M3.axis([0,1,0],phi),M3.mul(Ruser,M3.axis([0,1,0],-phi)));
      Rw2h=M3.transpose(Rh2w);
    }
    updateDust(dt);drawDust2D();          // the infalling grains — simulated in 3-D, drawn crisp here
    drawNova(t);
    drawTravelers();
    drawGalaxies(t,dt);
    updatePassers(t,dt);
    for(const p of PASSERS)drawPasser(p,t,dt);   // passing worlds — behind Saturn & Earth
    updateMover(PLANET.mv,PLANET,t,dt);
    updateMover(EARTH.mv,EARTH,t,dt);
    if(saturnOn())drawSaturn(t,dt);
    if(earthOn()){drawEarth(t,dt);drawAstro(t);}
    drawRocket(t,dt);
    drawComets(t,dt);
    drawShoot(t);
    drawTidal(t);
    drawRock(t);
    drawSparks(t,dt);
    drawSun(t);                           // (the vignette lives in the GL composite)
    perf.ms2d+=((performance.now()-c0)-perf.ms2d)*.06;perf.frames++;
    // the first frame is on screen → let the loader drop its "loading" veil
    if(!firstPainted){firstPainted=true;
      if(window.BG_LOADING&&window.BG_LOADING.done)window.BG_LOADING.done();}
    animId=requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // expose a little for the harness/tests
  const XY=(x,y)=>({x,y});
  window._space4={get bh(){return BH;},get gl(){return{hdr:HDR,lost:glLost,nogl:NOGL,rw:RW,rh:RH,camD,quality:GLQS[qIdx].name,emaMs,phi};},get dust(){return PS;},
    get passers(){return PASSERS;},get passStats(){return passStats;},get movers(){return{saturn:PLANET.mv,earth:EARTH.mv};},
    get surge(){return SURGE;},get taps(){return{total:TAPS.total,last:TAPS.last};},
    get fact(){return factEl.style.opacity==='1'?factEl.textContent:'';},
    perf:()=>({ms2d:perf.ms2d,frames:perf.frames,quality:GLQS[qIdx].name,lite:lite(),dpr2:DPR2,stars:FAR.reduce((n,f)=>n+f.pts.length/3,0)+NEAR.length,
               travellers:TRAVELERS.length,dust:dustN,passers:PASSERS.length,sparks:SPARKS.length,deepSky:skyArt.width>2,skyMs:SKY_MS}),
    // every tap target right now: [{name, kind, x, y, r}] in hit order (small things first)
    targets:()=>hitTargets().map(q=>({name:q.name,kind:q.kind,x:q.x,y:q.y,r:q.r})),
    // the first target a tap at x, y would reach
    hitAt(x,y){for(const q of hitTargets())if(Math.hypot(x-q.x,y-q.y)<=q.r)return q.kind;return null;},
    bodies:()=>({saturn:{x:PLANET.x,y:PLANET.y,r:PLANET.r,on:saturnOn(),boost:clickEnv(PLANET.boostT,lastT,3),rot:PLANET.body.rot},
                 earth:{x:EARTH.x,y:EARTH.y,r:EARTH.r,on:earthOn(),boost:clickEnv(EARTH.boostT,lastT,3),rot:EARTH.body.rot},
                 sun:{x:SUN.x,y:SUN.y,r:SUN.r,flare:flareT!==null}}),
    orbiters:()=>ORBITERS.map(o=>Object.assign({kind:o.kind,lap:o.lapT0!=null},orbiterPos(o))),
    galaxies:()=>GALAXIES.map(g=>({x:g.x,y:g.y,r:g.scale,boost:clickEnv(g.boostT,lastT,3)})),
    constellations:()=>CONS.map(c=>({name:c.cn.name,x:c.cn.hit.x,y:c.cn.hit.y,lit:clickEnv(c.litT,lastT,3)})),
    stars:()=>NEAR.map(s=>XY(s.x,s.y)),
    rocket:()=>({x:ROCKET.x,y:ROCKET.y,a:ROCKET.a,looping:ROCKET.loopT!==null}),
    astronaut:()=>({x:ASTRO.x,y:ASTRO.y,spinning:ASTRO.spinT!==null,on:earthOn()}),
    comets:()=>COMETS.filter(c=>c.delay<=0).map(c=>XY(c.x,c.y)),
    nova:()=>nova?{x:nova.x,y:nova.y}:null,
    rock:()=>!!ROCK,tidal:()=>TIDAL.length,
    // test hooks: start things now
    startNova(){const s=NEAR[0];nova=buildNova(s.x,s.y,lastT);return XY(s.x,s.y);},
    startComet(x,y){COMETS[0]={x,y,vx:1.2,vy:.2,delay:0};return XY(x,y);},
    flare(){sunFlare(lastT);},
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
  const hook=window._space4;
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
    if(window._space4===hook)delete window._space4;
    stage.innerHTML='';
  };
  },
};
})();
