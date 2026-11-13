/* RAIN-0: THE RAIN ROOM'S SHADERS (our own, written from the physics: a drop is a small strong lens that shows the view upside down and wide,
   darker at its rim; a running drop leaves a wet lane and beads; a misted pane shows only a very soft picture). Places are in VIEW-ANGLE units
   (the tangent of the angle from the view's axis): uTan is the screen's half size in them, so the pane and the city are fixed in the world and
   a screen is a crop. Nothing here is tone-mapped or encoded: the values are display values from the tokens. */
export const QUAD_V=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy, 0., 1.); }`;
/* a 9-tap Gaussian along uDir (two taps read between texels, so five reads) */
export const BLUR_F=`precision highp float; uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c=texture2D(uTex, vUv).rgb*0.2270;
  c+=(texture2D(uTex, vUv+uDir*1.3846).rgb+texture2D(uTex, vUv-uDir*1.3846).rgb)*0.3162;
  c+=(texture2D(uTex, vUv+uDir*3.2308).rgb+texture2D(uTex, vUv-uDir*3.2308).rgb)*0.0703; gl_FragColor=vec4(c, 1.); }`;
/* THE VIEW's ground: the city's prepared picture, sharp and blurred mixed by the city's blur (uK), and the playing light's soft pool on the
   city when the focus is far (uLight: its place, its strength) */
export const VIEW_F=`precision highp float; uniform sampler2D uBase, uBlur; uniform float uK; uniform vec2 uTan; uniform vec3 uLight, uLightCol; varying vec2 vUv;
void main(){ vec3 c=mix(texture2D(uBase, vUv).rgb, texture2D(uBlur, vUv).rgb, uK);
  vec2 p=(vUv*2.-1.)*uTan-uLight.xy; c+=uLightCol*uLight.z*0.2*exp(-dot(p, p)/0.012); gl_FragColor=vec4(c, 1.); }`;
/* A LIT WINDOW (one instance each: aRect its centre and half size, aLit its light, aWarm honey … amber). In focus: the pane behind a curtain,
   its bars, a little light spilling on the wall. Out of focus (uR, the blur's radius): the same light spread over the window grown by that
   radius, dimmer by the area — the soft disc. Premultiplied: the pane covers the dark window, the spill and the disc add. */
export const WIN_V=`attribute vec4 aRect; attribute float aLit, aWarm; uniform vec2 uTan; uniform float uR, uPad;
varying vec2 vP, vH; varying float vLit, vWarm;
void main(){ vec2 hs=aRect.zw+uR+uPad; vP=position.xy*hs; vH=aRect.zw; vLit=aLit; vWarm=aWarm;
  gl_Position= aLit>0.004 ? vec4((aRect.xy+vP)/uTan, 0., 1.) : vec4(2., 2., 2., 1.); }`;
export const WIN_F=`precision highp float; uniform float uR, uPad; uniform vec3 uHoney, uAmber; varying vec2 vP, vH; varying float vLit, vWarm;
void main(){ vec2 q=abs(vP)-vH; float d=length(max(q, 0.))+min(max(q.x, q.y), 0.), R=max(uR, 1e-4), k=clamp(uR/0.012, 0., 1.);
  vec3 warm=mix(uHoney, uAmber, vWarm); vec2 u=vP/vH, lp=u-vec2(0.3*sin(vWarm*40.), -0.4);
  float folds=0.84+0.16*sin(u.x*9.+vWarm*20.), lamp=0.6+0.4*exp(-dot(lp, lp)*1.5);
  float bars=1.-0.7*max(smoothstep(0.08, 0.03, abs(u.x)), smoothstep(0.06, 0.02, abs(u.y-0.4)));
  float e=vH.x*0.07, inA=smoothstep(e, -e, d);
  float A0=4.*vH.x*vH.y, A1=A0+4.*(vH.x+vH.y)*R+3.1416*R*R, gain=pow(A0/A1, 0.5);
  float disc=smoothstep(R, R*0.8, d)*(0.86+0.14*smoothstep(R*0.2, R*0.9, d));
  float spill=exp(-max(d, 0.)/(uPad*0.3))*0.16*(1.-k)*step(0., d);
  vec3 c=mix(warm*folds*lamp*bars*inA, warm*0.8*gain*disc, k)+warm*spill;
  gl_FragColor=vec4(c*vLit, inA*(1.-k)*min(1., vLit*1.5)); }`;
/* A FAR LIGHT or a lamp (a point each: its place, colour, strength aK, its own radius aBase): a small glow in focus, a flat soft disc with a
   slightly brighter rim out of focus, dimmer by its area */
export const PT_V=`attribute vec3 aCol; attribute float aK, aBase, aSeed; uniform vec2 uTan; uniform float uR, uPx, uTime; varying vec3 vCol; varying float vK;
void main(){ float r=aBase+uR; vCol=aCol*aK*(0.86+0.14*sin(uTime*(0.7+aSeed*1.9)+aSeed*40.))*pow(aBase*aBase/(r*r), 0.42);
  vK=clamp(uR/0.012, 0., 1.); gl_PointSize=max(2., 2.*r*uPx); gl_Position=vec4(position.xy/uTan, 0., 1.); }`;
export const PT_F=`precision highp float; varying vec3 vCol; varying float vK;
void main(){ float r=length(gl_PointCoord-0.5)*2.; if(r>1.) discard;
  float core=exp(-r*r*5.), disc=smoothstep(1., 0.84, r)*(0.8+0.2*smoothstep(0.5, 0.95, r)); gl_FragColor=vec4(vCol*mix(core, disc, vK), 1.); }`;
/* THE GLASS (drops: the count of resting-drop layers 3 | 4; rivulets: of running-drop layers 1 | 2). uView the view, uSoft its small soft
   copy, uWipe the cleared-mist map (pure/glass.js; uExt its half size on the pane), uOff the pane's slide as the camera leans, uRain 0…1,
   uMist the pane's mist, uG the glass's own blur (the focus is in the city: the drops soften into pale discs), uLight / uLightK the playing
   light on the pane (screen place, strength). */
export const glassShader=(drops, rivulets)=>`precision highp float;
#define DROPS ${drops|0}
#define RIVS ${rivulets|0}
varying vec2 vUv; uniform sampler2D uView, uSoft, uWipe; uniform vec2 uTan, uOff, uExt, uLight; uniform float uTime, uRain, uMist, uG, uLightK; uniform vec3 uLightCol, uMistCol;
float hf(vec2 p){ vec2 q=fract(p*vec2(0.7548777, 0.5698403)+vec2(0.137, 0.731)); q+=dot(q, q.yx+19.19); return fract((q.x+q.y)*q.x*7.31+q.y*3.17); }
vec3 hv(vec2 p){ return vec3(hf(p), hf(p+vec2(37.2, 11.9)), hf(p+vec2(5.3, 71.7))); }
float vn(vec2 p){ vec2 i=floor(p), f=p-i; f=f*f*(3.-2.*f); return mix(mix(hf(i), hf(i+vec2(1., 0.)), f.x), mix(hf(i+vec2(0., 1.)), hf(i+vec2(1., 1.)), f.x), f.y); }
/* one layer of RESTING drops, one per cell of a brick grid: each is born, grows, and gives its cell to the next. → xy the place inside the
   drop (−1…1) × its mask, z its mask */
vec3 drops(vec2 g, float cell, float seed, float dens){
  float row=floor(g.y/cell); g.x+=cell*(0.5*mod(row, 2.)+seed*0.37);
  vec2 id=vec2(floor(g.x/cell), row), f=vec2(g.x/cell-id.x, g.y/cell-row);
  vec3 h=hv(id+seed*13.7); float T=16.+44.*h.z, ph=uTime/T+h.x*9., a=fract(ph);
  vec3 k=hv(id+seed*13.7+floor(ph)*1.618+3.3); if(k.z>dens) return vec3(0.);
  float r=mix(0.13, 0.42, k.x*k.x)*(0.5+0.5*smoothstep(0., 0.3, a))*(1.-smoothstep(0.94, 1., a));
  vec2 c=vec2(0.5)+(vec2(k.y, h.y)-0.5)*2.*max(0., 0.47-r), d=(f-c)/max(r, 1e-4); d.y*=0.9; d.x*=1.+0.16*d.y;
  float e=0.07+0.75*uG, m=smoothstep(1.+e, 1.-e, length(d)); return vec3(d*m, m); }
/* one layer of RUNNING drops, one per column: the head goes down the pane stopping and going on a wandering path; above it a wet lane that
   dries with distance, and beads it left. → xy, z as above, w the lane (it clears the mist) */
vec4 rivulets(vec2 g, float w, float seed){
  float col=floor(g.x/w); vec3 h=hv(vec2(col, seed)); if(h.x>0.2+0.6*uRain) return vec4(0.);
  float T=mix(10., 24., h.y)/(0.55+0.9*uRain), ph=uTime/T+h.z*7., u=fract(ph), run=floor(ph);
  vec3 k=hv(vec2(col+run*17.3, seed+3.1));
  float yh=0.9-1.8*(u+0.045*sin(18.85*u+k.x*6.28));
  float xc=(col+0.5+(k.y-0.5)*0.5)*w+0.011*sin(g.y*9.+k.z*40.)+0.004*sin(g.y*31.+k.x*20.);
  float rh=w*mix(0.10, 0.17, k.z), fade=smoothstep(0., 0.04, u)*(1.-smoothstep(0.9, 1., u));
  vec2 dv=vec2(g.x-xc, g.y-yh), d=dv/rh; if(d.y>0.) d.y*=0.5;
  float e=0.08+0.75*uG, m=smoothstep(1.+e, 1.-e, length(d))*fade, age=dv.y/0.95, tw=rh*0.55*(1.-0.55*age);
  float lane= (dv.y>0. && age<1.) ? smoothstep(tw, tw*0.3, abs(dv.x))*(1.-age)*fade : 0.;
  vec2 lens=d*m; float bh=rh*2.6, by=floor(g.y/bh); vec3 b=hv(vec2(col*7.+by, seed+run));
  if(dv.y>rh && age<1. && b.x<0.6){ float rb=rh*mix(0.22, 0.45, b.y)*sqrt(1.-age); vec2 bd=(g-vec2(xc+(b.z-0.5)*rh*0.7, (by+0.5)*bh))/max(rb, 1e-4);
    float bm=smoothstep(1.+e, 1.-e, length(bd))*fade; if(bm>m){ lens=bd*bm; m=bm; } }
  return vec4(lens, m, lane); }
void main(){
  vec2 p=(vUv*2.-1.)*uTan, g=p+uOff; vec3 D=vec3(0.), a; float lane=0.;
  a=drops(g, 0.060, 1., 0.28+0.4*uRain); if(a.z>D.z) D=a;
  a=drops(g, 0.034, 2., 0.32+0.4*uRain); if(a.z>D.z) D=a;
  a=drops(g, 0.019, 3., 0.38+0.35*uRain); if(a.z>D.z) D=a;
#if DROPS>3
  a=drops(g, 0.0105, 4., 0.55+0.35*uRain); if(a.z>D.z) D=a;
#endif
  vec4 r=rivulets(g, 0.115, 5.); lane=max(lane, r.w); if(r.z>D.z) D=r.xyz;
#if RIVS>1
  r=rivulets(g+vec2(0.31, 0.), 0.19, 6.); lane=max(lane, r.w); if(r.z>D.z) D=r.xyz;
#endif
  float m=D.z; vec2 dn=D.xy/max(m, 1e-3); float l=length(dn);
  vec3 view=texture2D(uView, vUv).rgb, soft=texture2D(uSoft, vUv).rgb;
  /* through a drop: the view upside down and wide (from the soft copy: a picture that small must not shimmer), dark at the rim, a catch-light */
  vec3 lensC=texture2D(uSoft, clamp(vUv-dn*0.13/(2.*uTan), 0., 1.)).rgb*1.3;
  lensC*=1.-0.62*smoothstep(0.45, 1., l); vec2 cl=dn-vec2(-0.38, 0.42);
  lensC+=(soft+0.03)*pow(max(0., 1.-length(cl)*2.4), 2.);
  vec3 col=mix(view, mix(lensC, soft*1.08, 0.8*uG), m*(1.-0.45*uG));
  col=mix(col, soft*1.18+0.012, lane*0.45*(1.-m)*(1.-0.6*uG));   /* a running drop's wet lane: a thin film that smears the view a little brighter */
  /* the mist: thicker towards the pane's edges and in slow patches; gone where a drop sits, where a lane ran, where a note wiped it */
  float wipe=texture2D(uWipe, g/uExt*0.5+0.5).r, edge=max(abs(g.x)/1.3, abs(g.y)/0.66);
  float mist=clamp(uMist*(0.24+0.7*smoothstep(0.15, 0.9, edge)+0.6*(vn(g*3.1+7.)-0.5)), 0., 1.)*(1.-m)*(1.-lane)*(1.-wipe);
  vec3 fog=(soft*0.8+uMistCol*(0.085+0.3*dot(soft, vec3(0.333))))*(0.86+0.28*(vn(g*240.)-0.5)*(1.-uG));
  col=mix(col, fog, mist*(1.-0.3*uG));
  /* the playing light on the pane: a glow, more in the mist, a glint on the rims of the drops that face it */
  vec2 dl=p-uLight; float d2=dot(dl, dl), glow=exp(-d2/0.010);
  col+=uLightCol*uLightK*(0.1*glow+0.3*glow*mist+0.7*m*exp(-d2/0.035)*smoothstep(0.35, 1., l)*max(0., dot(dn/max(l, 1e-3), -dl/max(sqrt(d2), 1e-3))));
  float vg=length((vUv-0.5)*vec2(1.1, 1.25)); col*=1.-0.38*smoothstep(0.35, 0.9, vg);
  gl_FragColor=vec4(col, 1.); }`;
