/* RAIN-0: THE RAIN ROOM'S SHADERS (our own, written from the physics: a drop is a small strong lens that shows the view upside down and wide,
   darker at its rim; a running drop leaves a wet lane and beads; a misted pane shows only a very soft picture). Places are in VIEW-ANGLE units
   (the tangent of the angle from the view's axis): uTan is the screen's half size in them, so the pane and the city are fixed in the world and
   a screen is a crop. Nothing here is tone-mapped or encoded: the values are display values from the tokens.
   RAIN-0b: the focus has many depths — the view blends four pre-blurred copies of the prepared picture by its depth map, every light and window
   grows by its own depth; the drops are a simulation (pure/drops.js) drawn as sprites into a DROP MAP the glass reads (one pass still); the mist is
   inside the pane, over the drops (wiping never removes a drop). */
export const QUAD_V=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy, 0., 1.); }`;
/* a 9-tap Gaussian along uDir (two taps read between texels, so five reads) */
export const BLUR_F=`precision highp float; uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c=texture2D(uTex, vUv).rgb*0.2270;
  c+=(texture2D(uTex, vUv+uDir*1.3846).rgb+texture2D(uTex, vUv-uDir*1.3846).rgb)*0.3162;
  c+=(texture2D(uTex, vUv+uDir*3.2308).rgb+texture2D(uTex, vUv-uDir*3.2308).rgb)*0.0703; gl_FragColor=vec4(c, 1.); }`;
/* the blur radius (view-angle units) of a thing at depth d: uFoc = (focus depth, K, the widest radius) */
const RAD=`float radAt(float d){ return uFoc.z*min(1., abs(d-uFoc.x)*uFoc.y); }`;
/* THE VIEW's ground: the prepared picture (uBase) and its three blurred copies (uL1…uL3, their radii uRad), chosen per pixel by the depth map's
   blur; the playing light's soft pool on the city when the focus is far (uLight: its place, its strength) */
export const VIEW_F=`precision highp float; uniform sampler2D uBase, uL1, uL2, uL3, uDepth; uniform vec3 uRad, uFoc; uniform vec2 uTan; uniform vec3 uLight, uLightCol; varying vec2 vUv;
${RAD}
void main(){ float r=radAt(texture2D(uDepth, vUv).a);   /* the depth rides in the picture's alpha */
  vec3 c0=texture2D(uBase, vUv).rgb, c1=texture2D(uL1, vUv).rgb, c2=texture2D(uL2, vUv).rgb, c3=texture2D(uL3, vUv).rgb, c;
  if(r<uRad.x) c=mix(c0, c1, r/uRad.x); else if(r<uRad.y) c=mix(c1, c2, (r-uRad.x)/(uRad.y-uRad.x)); else c=mix(c2, c3, clamp((r-uRad.y)/(uRad.z-uRad.y), 0., 1.));
  vec2 p=(vUv*2.-1.)*uTan-uLight.xy; c+=uLightCol*uLight.z*0.2*exp(-dot(p, p)/0.012); gl_FragColor=vec4(c, 1.); }`;
/* A LIT WINDOW (one instance each: aRect its centre and half size, aLit its light, aWarm honey … amber, aDepth its depth). In focus: the pane
   behind a curtain, its bars, a little light spilling on the wall. Out of focus (its own radius by its depth): the same light spread over the
   window grown by that radius into a soft rounded rectangle, dimmer by the area. Premultiplied: the pane covers the dark window, the disc adds. */
export const WIN_V=`attribute vec4 aRect; attribute float aLit, aWarm, aDepth; uniform vec2 uTan; uniform vec3 uFoc; uniform float uPad;
varying vec2 vP, vH; varying float vLit, vWarm, vR; ${RAD}
void main(){ vR=radAt(aDepth); vec2 hs=aRect.zw+vR+uPad*min(1., aRect.w*8.); vP=position.xy*hs; vH=aRect.zw; vLit=aLit; vWarm=aWarm;
  gl_Position= aLit>0.004 ? vec4((aRect.xy+vP)/uTan, 0., 1.) : vec4(2., 2., 2., 1.); }`;
export const WIN_F=`precision highp float; uniform float uPad; uniform vec3 uHoney, uAmber; varying vec2 vP, vH; varying float vLit, vWarm, vR;
void main(){ vec2 q=abs(vP)-vH; float d=length(max(q, 0.))+min(max(q.x, q.y), 0.), R=max(vR, 1e-4), k=clamp(vR/(vH.y*0.9+0.002), 0., 1.);
  vec3 warm=mix(uHoney, uAmber, vWarm); vec2 u=vP/vH, lp=u-vec2(0.3*sin(vWarm*40.), -0.4);
  float folds=0.84+0.16*sin(u.x*9.+vWarm*20.), lamp=0.6+0.4*exp(-dot(lp, lp)*1.5);
  float bars=1.-0.7*max(smoothstep(0.08, 0.03, abs(u.x)), smoothstep(0.06, 0.02, abs(u.y-0.4)));
  float e=vH.x*0.08, inA=smoothstep(e, -e, d);
  float A0=4.*vH.x*vH.y, A1=A0+4.*(vH.x+vH.y)*R+3.1416*R*R, gain=pow(A0/A1, 0.5);
  float disc=smoothstep(R, R*0.7, d)*(0.86+0.14*smoothstep(R*0.2, R*0.9, d));
  float sp=uPad*min(1., vH.y*8.), spill=exp(-max(d, 0.)/(sp*0.3+1e-5))*0.16*(1.-k)*step(0., d);
  vec3 c=mix(warm*folds*lamp*bars*inA, warm*0.85*gain*disc, k)+warm*spill;
  gl_FragColor=vec4(c*vLit, inA*(1.-k)*min(1., vLit*1.5)); }`;
/* A LIGHT (one instance each): aRect its centre and half size, aCol its colour and strength, aDK its depth and kind — 0 a point (a lamp, a far
   light, a car's light: a small glow in focus), 1 a reflection in the wet street (a streak below its light, fading downwards), 2 a lit rectangle
   (the tram's windows). Out of focus each grows by its own radius into a soft disc (or rounded streak / rectangle), dimmer by the area. */
export const LIGHT_V=`attribute vec4 aRect, aCol; attribute vec2 aDK; uniform vec2 uTan; uniform vec3 uFoc; uniform float uPx;
varying vec2 vP, vH; varying vec3 vCol; varying float vRad, vKind, vGain, vK, vB; ${RAD}
void main(){ float R=radAt(aDK.x), kind=aDK.y, b=max(aRect.z, 0.7/uPx); vKind=kind; vB=b;
  vec2 h= kind<0.5 ? vec2(0.) : kind<1.5 ? vec2(0., aRect.w) : aRect.zw; float rad= kind<1.5 ? b+R : R+0.35/uPx;
  vK=clamp(R/(b*3.+0.004), 0., 1.); float glow= kind<0.5 ? 3.*b*(1.-vK) : 0.;
  vec2 hs=h+rad+glow; vP=position.xy*hs; vH=h; vRad=rad;
  float A0= kind<1.5 ? b*(2.*h.y+3.1416*b*0.5) : 4.*h.x*h.y, A1= kind<1.5 ? rad*(2.*h.y+3.1416*rad*0.5) : 4.*(h.x+R)*(h.y+R);
  vGain=pow(max(A0, 1e-9)/max(A1, 1e-9), 0.55); vCol=aCol.rgb*aCol.a;
  gl_Position= aCol.a>0.003 ? vec4((aRect.xy+vP)/uTan, 0., 1.) : vec4(2., 2., 2., 1.); }`;
export const LIGHT_F=`precision highp float; varying vec2 vP, vH; varying vec3 vCol; varying float vRad, vKind, vGain, vK, vB;
void main(){ vec2 q=abs(vP)-vH; float d=length(max(q, 0.))+min(max(q.x, q.y), 0.)-vRad;
  float fade= vKind>0.5 && vKind<1.5 ? pow(clamp(0.5+0.5*vP.y/max(vH.y+vRad, 1e-5), 0., 1.), 1.6) : 1.;
  float sharp= vKind<0.5 ? exp(-dot(vP, vP)/(vB*vB)*1.6)+0.18*exp(-length(vP)/(vB*1.6)) : smoothstep(0., -vRad*0.5-1e-5, d);
  float disc=smoothstep(0., -max(vRad*0.25, 1e-5), d)*(0.82+0.18*smoothstep(-vRad*0.7, 0., d))*vGain;
  gl_FragColor=vec4(vCol*mix(sharp, disc, vK)*fade, 1.); }`;
/* A DROP into the DROP MAP (one instance each: aDrop its place on the pane and its radius, aShape its stretch while running). The map holds,
   premultiplied by the drop's mask, the place inside the drop (−1…1, encoded 0…1): the glass reads it as a lens. uSoft widens the edge as the
   focus leaves the glass (the drop softens into a pale disc). */
export const DROP_V=`attribute vec3 aDrop; attribute float aShape; uniform vec2 uTan, uOff; uniform float uSoft; varying vec2 vQ; varying float vS;
void main(){ float r=aDrop.z, up=1.+aShape; vec2 grow=vec2(r, r*up)*(1.+uSoft*0.9)+0.0006; vQ=position.xy*grow/r; vQ.y=position.y>0. ? vQ.y/up : vQ.y; vS=aShape;
  gl_Position=vec4((aDrop.xy-uOff+position.xy*grow)/uTan, 0., 1.); }`;
export const DROP_F=`precision highp float; uniform float uSoft; varying vec2 vQ; varying float vS;
void main(){ vec2 d=vQ; d.x*=1.+0.12*d.y; float l=length(d), e=0.08+0.8*uSoft, m=smoothstep(1.+e, 1.-e, l); if(m<0.004) discard;
  gl_FragColor=vec4((clamp(d/max(l, 1.), -1., 1.)*0.5+0.5)*m, 0., m); }`;
/* THE GLASS (fine: the count of procedural fine-droplet layers 1 | 2). uView the view, uSoft its small soft copy, uDrop the drop map, uWipe the
   pane's maps (r: the mist cleared, a: the fine droplets cleared by runners; uExt the pane's half size), uOff the pane's slide as the camera leans,
   uRain 0…1, uMist the pane's mist, uG the glass's own blur, uFloor (the middle's floor share now, the ellipse's half axes), uLight / uLightK the
   playing light on the pane. */
export const glassShader=(fine)=>`precision highp float;
#define FINE ${fine|0}
varying vec2 vUv; uniform sampler2D uView, uSoft, uDrop, uWipe; uniform vec2 uTan, uOff, uExt, uLight; uniform vec3 uFloor; uniform float uTime, uRain, uMist, uG, uLightK; uniform vec3 uLightCol, uMistCol;
float hf(vec2 p){ vec2 q=fract(p*vec2(0.7548777, 0.5698403)+vec2(0.137, 0.731)); q+=dot(q, q.yx+19.19); return fract((q.x+q.y)*q.x*7.31+q.y*3.17); }
vec3 hv(vec2 p){ return vec3(hf(p), hf(p+vec2(37.2, 11.9)), hf(p+vec2(5.3, 71.7))); }
float vn(vec2 p){ vec2 i=floor(p), f=p-i; f=f*f*(3.-2.*f); return mix(mix(hf(i), hf(i+vec2(1., 0.)), f.x), mix(hf(i+vec2(0., 1.)), hf(i+vec2(1., 1.)), f.x), f.y); }
/* one layer of FINE droplets (procedural, one per cell of a brick grid: each is born, grows, and gives its cell to the next) → xy the place inside
   (−1…1) × its mask, z its mask */
vec3 fine(vec2 g, float cell, float seed, float dens){
  float row=floor(g.y/cell); g.x+=cell*(0.5*mod(row, 2.)+seed*0.37);
  vec2 id=vec2(floor(g.x/cell), row), f=vec2(g.x/cell-id.x, g.y/cell-row);
  vec3 h=hv(id+seed*13.7); float T=16.+44.*h.z, ph=uTime/T+h.x*9., a=fract(ph);
  vec3 k=hv(id+seed*13.7+floor(ph)*1.618+3.3); if(k.z>dens) return vec3(0.);
  float r=mix(0.14, 0.36, k.x*k.x)*(0.5+0.5*smoothstep(0., 0.3, a))*(1.-smoothstep(0.94, 1., a));
  vec2 c=vec2(0.5)+(vec2(k.y, h.y)-0.5)*2.*max(0., 0.47-r), d=(f-c)/max(r, 1e-4); d.y*=0.9;
  float e=0.1+0.8*uG, m=smoothstep(1.+e, 1.-e, length(d)); return vec3(d*m, m); }
void main(){
  vec2 p=(vUv*2.-1.)*uTan, g=p+uOff, wuv=g/uExt*0.5+0.5; vec4 W=texture2D(uWipe, wuv);
  /* the drops: the simulated ones from the map, the fine ones procedural (cleared where a runner went: W.a) */
  vec4 dm=texture2D(uDrop, vUv); float m=dm.a; vec2 dn= m>0.004 ? (dm.rg/m)*2.-1. : vec2(0.);
  float fk=(1.-W.a)*(0.35+0.65*smoothstep(0., 0.5, uRain+0.15)); vec3 a=fine(g, 0.0125, 3., 0.5*fk);
#if FINE>1
  vec3 a2=fine(g, 0.0072, 4., 0.62*fk); if(a2.z>a.z) a=a2;
#endif
  if(a.z>m){ m=a.z; dn=a.xy/max(a.z, 1e-3); }
  float l=length(dn);
  vec3 view=texture2D(uView, vUv).rgb, soft=texture2D(uSoft, vUv).rgb;
  /* through a drop: the view upside down and wide (from the soft copy: a picture that small must not shimmer), dark at the rim, a catch-light */
  vec3 lensC=texture2D(uSoft, clamp(vUv-dn*0.13/(2.*uTan), 0., 1.)).rgb*1.3;
  lensC*=1.-0.62*smoothstep(0.45, 1., l); vec2 cl=dn-vec2(-0.38, 0.42);
  lensC+=(soft+0.03)*pow(max(0., 1.-length(cl)*2.4), 2.);
  vec3 col=mix(view, mix(lensC, soft*1.08, 0.8*uG), m*(1.-0.45*uG));
  /* a runner's wet lane: a thin film that smears the view a little brighter, fading as the fine droplets grow back */
  col=mix(col, soft*1.16+0.01, W.a*W.a*0.4*(1.-m)*(1.-0.6*uG));
  /* THE MIST, inside: over everything, thicker towards the pane's edges and in slow patches; cleared only where a finger or a note wiped it (and
     the warm middle's floor after the first wipe) */
  float edge=max(abs(g.x)/1.3, abs(g.y)/0.66), q=length(g/uFloor.yz), mid= q<1. ? 1.-q*q*(3.-2.*q) : 0.;
  float clear=max(W.r, uFloor.x*mid);
  float mist=clamp(uMist*(0.8+0.25*smoothstep(0.2, 0.95, edge)+0.22*(vn(g*3.1+7.)-0.5)), 0., 1.)*(1.-clear);
  vec3 fogBase=mix(soft, col, 0.3);   /* the fog scatters what is behind it, the drops outside included: they stay faintly seen */
  vec3 fog=(fogBase*0.92+uMistCol*(0.07+0.34*dot(soft, vec3(0.333))))*(0.88+0.24*(vn(g*240.)-0.5)*(1.-uG));
  col=mix(col, fog, mist*(1.-0.25*uG));
  /* the playing light on the pane: a glow, more in the mist, a glint on the rims of the drops that face it */
  vec2 dl=p-uLight; float d2=dot(dl, dl), glow=exp(-d2/0.010);
  col+=uLightCol*uLightK*(0.1*glow+0.3*glow*mist+0.7*m*exp(-d2/0.035)*smoothstep(0.35, 1., l)*max(0., dot(dn/max(l, 1e-3), -dl/max(sqrt(d2), 1e-3))));
  float vg=length((vUv-0.5)*vec2(1.1, 1.25)); col*=1.-0.38*smoothstep(0.35, 0.9, vg);
  gl_FragColor=vec4(col, 1.); }`;
