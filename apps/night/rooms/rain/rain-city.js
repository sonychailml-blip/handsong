/* RAIN-0b: THE STAND-IN CITY's prepared picture and its DEPTH MAP, painted ONCE on the GPU (an opening, a resize, a mood): one ray per pixel through
   the view law (pure/city.js — this shader is its port: the same camera, rows of houses, street and far layers; the browser row «RAIN room»
   compares the depth it writes with the law's sceneAt), so the colour, the depth and the windows agree. rgb = the colour, a = the depth (0 the
   glass … 1 the sky). Kept deliberately plain (the founder: «do not polish 2D code-drawn houses»): PLAN.md's baked 3D city replaces this pass's
   output with prepared layers; the law, the lights and the depth-of-field stay. */
import { CAM, camBasis, STREET, BLOCKS, FLOOR, FAR, DEPTH, cityLamps } from './pure/city.js';

const N=8;   // blocks per row the shader holds (BLOCKS has at most 8 per row)
/* RAIN-1: THE BAKED CITY (tools/rain-bake.mjs --city): its colour for the mood and its depth map, both in view-angle units over ±uExt — the screen's
   pixel p (view-angle units, ±uTan) reads them at p / uExt; rgb = the colour, a = the depth (as the stand-in writes it) */
export const BAKED_F=`precision highp float; varying vec2 vUv; uniform sampler2D uCity, uDepthMap; uniform vec2 uTan, uExt;
void main(){ vec2 q=clamp((vUv*2.-1.)*uTan/uExt*0.5+0.5, 0., 1.); gl_FragColor=vec4(texture2D(uCity, q).rgb, texture2D(uDepthMap, q).r); }`;
/* the uniforms of the painting (T the THREE namespace); the palette is set per look by the caller */
export function cityUniforms(T){
  const B=camBasis(), V=a=>new T.Vector3(a[0], a[1], a[2]), rows=side=>Array.from({ length:N }, (_, i)=>{ const b=BLOCKS[side][i]; return b ? new T.Vector4(b[0], b[1], b[2], b[3]) : new T.Vector4(0, 0, 0, 0); });
  const A=DEPTH.anchors, lamps=cityLamps();
  return { uTan:{ value:new T.Vector2(1, 1) }, uCam:{ value:new T.Vector3(CAM.x, CAM.y, CAM.z) }, uR:{ value:V(B.r) }, uU:{ value:V(B.u) }, uF:{ value:V(B.f) },
    uOpp:{ value:rows('opp') }, uLeft:{ value:rows('left') }, uSt:{ value:new T.Vector4(STREET.left, STREET.opp, STREET.kerbA, STREET.kerbB) },
    uAl:{ value:new T.Vector4(STREET.alleyA, STREET.alleyB, STREET.lampEvery, lamps.length ? Math.max(...lamps.map(l=>l.p[2])) : 0) }, uTr:{ value:new T.Vector4(...STREET.tracks) },
    uFl:{ value:new T.Vector4(FLOOR.h, FLOOR.ground, FLOOR.bay, FLOOR.sill) }, uWn:{ value:new T.Vector2(FLOOR.winW, FLOOR.winH) },
    uFar:{ value:new T.Vector4(FAR.z, FAR.roofs[0], FAR.roofs[1], FAR.hillsZ) }, uHil:{ value:new T.Vector2(FAR.hillsY[0], FAR.hillsY[1]) },
    uDA:{ value:A.map(a=>new T.Vector2(a[0], a[1])) },
    uSky:{ value:new T.Color() }, uCloud:{ value:new T.Color() }, uGlow:{ value:new T.Color() }, uHaze:{ value:new T.Color() }, uStone:{ value:new T.Color() },
    uPlaster:{ value:new T.Color() }, uAsph:{ value:new T.Color() }, uPane:{ value:new T.Color() }, uLamp:{ value:new T.Color() } };
}
export const CITY_F=`precision highp float; varying vec2 vUv;
#define N ${N}
#define NA ${DEPTH.anchors.length}
uniform vec2 uTan; uniform vec3 uCam, uR, uU, uF; uniform vec4 uOpp[N], uLeft[N], uSt, uAl, uTr, uFl, uFar; uniform vec2 uWn, uHil, uDA[NA];
uniform vec3 uSky, uCloud, uGlow, uHaze, uStone, uPlaster, uAsph, uPane, uLamp;
float depthOf(float dist){ if(dist<=uDA[0].x) return uDA[0].y*max(0., dist)/uDA[0].x;
  for(int i=1;i<NA;i++){ if(dist<=uDA[i].x){ return mix(uDA[i-1].y, uDA[i].y, log(dist/uDA[i-1].x)/log(uDA[i].x/uDA[i-1].x)); } }
  return min(0.99, uDA[NA-1].y+0.03*log(dist/uDA[NA-1].x)); }
float hillsAt(float x){ return uHil.x+(uHil.y-uHil.x)*(0.55+0.25*sin(x*2.3+0.9)+0.13*sin(x*6.1+2.4)+0.07*sin(x*13.7+0.3)-0.2*exp(-((x+0.55)*(x+0.55))/0.02)); }
float hv(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
/* the block of a row at z → its (z0, z1, eaves, mansard), or zero */
vec4 blockOf(bool opp, float z){ for(int i=0;i<N;i++){ vec4 b= opp ? uOpp[i] : uLeft[i]; if(b.y>b.x && z>=b.x && z<b.y) return b; } return vec4(0.); }
float inWindow(vec4 b, float z, float y){ if(b.y<=b.x || y<uFl.y) return 0.; float n=floor((b.y-b.x)/uFl.z), z0=b.x+((b.y-b.x)-n*uFl.z)*0.5, k=floor((z-z0)/uFl.z);
  if(k<0. || k>=n) return 0.; float f=floor((y-uFl.y)/uFl.x), y0=uFl.y+f*uFl.x+uFl.w; if(y0+uWn.y>b.z-0.6) return 0.;
  float zc=z0+(k+0.5)*uFl.z; return (abs(z-zc)<uWn.x*0.5 && y>=y0 && y<=y0+uWn.y) ? 1. : 0.; }
float lampPool(float x, float z){ float s=0.; vec4 xs=vec4(uSt.z+0.6, uAl.x+0.5, uAl.y-0.5, uSt.w-0.6); vec4 ph=vec4(0., 0.5, 0., 0.5);
  for(int r=0;r<4;r++){ float xl=xs[r], z0=8.+ph[r]*uAl.z, kz=floor((z-z0)/uAl.z+0.5);
    for(int q=-1;q<=1;q++){ float zl=z0+(kz+float(q))*uAl.z; if(zl<z0 || zl>uAl.w) continue; float dx=x-xl, dz=z-zl; s+=exp(-(dx*dx+dz*dz)/30.); } }
  return s; }
void main(){
  vec2 p=(vUv*2.-1.)*uTan; vec3 d=normalize(uF+p.x*uR+p.y*uU), o=uCam; float best=1e9; int kind=0; vec3 hit=vec3(0.); vec4 hb=vec4(0.);
  /* the two rows' facades */
  if(d.x!=0.){ float t=(uSt.y-o.x)/d.x; if(t>0.){ vec3 h=o+d*t; vec4 b=blockOf(true, h.z); if(b.y>b.x && h.y>=0. && h.y<=b.z+b.w && t<best){ best=t; kind=3; hit=h; hb=b; } }
    t=(uSt.x-o.x)/d.x; if(t>0.){ vec3 h=o+d*t; vec4 b=blockOf(false, h.z); if(b.y>b.x && h.y>=0. && h.y<=b.z+b.w && t<best){ best=t; kind=4; hit=h; hb=b; } } }
  /* their roofs, seen from above */
  if(d.y<0.) for(int i=0;i<N;i++){ for(int s=0;s<2;s++){ vec4 b= s==0 ? uOpp[i] : uLeft[i]; if(b.y<=b.x) continue; float t=(b.z+b.w-o.y)/d.y; if(t<=0. || t>=best) continue;
      vec3 h=o+d*t; float X= s==0 ? uSt.y : uSt.x; bool inx= s==0 ? (h.x>=X && h.x<=X+16.) : (h.x<=X && h.x>=X-16.); if(h.z>=b.x && h.z<b.y && inx){ best=t; kind=2; hit=h; } } }
  if(d.y<0.){ float t=-o.y/d.y; if(t<best){ best=t; kind=5; hit=o+d*t; } }
  if(kind==0 && d.z>0.){ float t=(uFar.x-o.z)/d.z, yy=o.y+d.y*t; if(yy<=uFar.y+(uFar.z-uFar.y)*(0.5+0.5*sin(p.x*17.+1.3)*sin(p.x*5.1))){ best=t; kind=2; hit=o+d*t; } }
  if(kind==0 && d.z>0.){ float t=(uFar.w-o.z)/d.z, yy=o.y+d.y*t; if(yy<=hillsAt(p.x)){ best=t; kind=1; hit=o+d*t; } }
  float depth= kind==0 ? 1. : depthOf(best); vec3 col;
  if(kind==0){ float t=smoothstep(0.21, 0.73, p.y), cl=0.5+0.5*sin(p.x*3.1+p.y*9.)*sin(p.x*7.7-p.y*13.);   /* the sky: the city's glow low, indigo high, low clouds lit from below */
    col=mix(mix(uGlow, uCloud, smoothstep(0., 0.35, t)), uSky, smoothstep(0.3, 1., t)); col=mix(col, uGlow, 0.16*cl*(1.-t)); }
  else if(kind==1) col=mix(uHaze, uStone, 0.25);
  else if(kind==2) col=mix(uStone, uHaze, 0.35+0.25*hv(floor(hit.zx/4.)))*0.7;
  else if(kind==5){ float x=hit.x, z=hit.z; bool pave=x<uSt.z || x>uSt.w, alley=x>uAl.x && x<uAl.y;   /* the street: asphalt, pavements, rails, the lamps' warm wet pools */
    col= pave ? mix(uAsph, uStone, 0.45) : alley ? mix(uAsph, uStone, 0.2) : uAsph;
    vec4 tr=abs(vec4(x)-uTr); if(min(min(tr.x, tr.y), min(tr.z, tr.w))<0.09) col=mix(col, uLamp, 0.22);
    if(abs(x-uSt.z)<0.15 || abs(x-uSt.w)<0.15) col=mix(col, uStone, 0.6);
    float wet=0.5+0.5*sin(x*0.7+z*0.13)*sin(z*0.41); col=mix(col, uLamp, min(0.55, lampPool(x, z)*0.32)*(0.7+0.3*wet)); col=mix(col, uGlow, 0.08*wet*smoothstep(30., 200., z)); }
  else { float z=hit.z, y=hit.y;   /* a facade: plaster lit from the street below, bands, dark panes, the mansard; far ones sink into haze */
    if(y>hb.z) col=uStone*0.55;
    else { float lit=exp(-y/7.)*0.9+0.1, band=(abs(y-hb.z)<0.5 || abs(y-uFl.y)<0.3) ? 0.6 : 1.;
      col=mix(uStone, uPlaster, (kind==3 ? 0.75 : 0.5)*lit)*band;
      if(y<uFl.y) col=mix(col, uLamp, 0.12*step(0.3, sin(z*0.9)));
      else if(inWindow(hb, z, y)>0.5) col=uPane; }
    col=mix(col, uHaze, smoothstep(60., 420., best)*0.55); }
  gl_FragColor=vec4(col, depth); }`;
