/* RAIN-0: THE RAIN ROOM'S SHADERS (our own, written from the physics: a drop is a small strong lens that shows the view upside down and wide,
   darker at its rim; a running drop leaves a wet lane and beads; a misted pane shows only a very soft picture). Places are in VIEW-ANGLE units
   (the tangent of the angle from the view's axis): uTan is the screen's half size in them, so the pane and the city are fixed in the world and
   a screen is a crop. Nothing here is tone-mapped or encoded: the values are display values from the tokens.
   RAIN-0b: the focus has many depths — the view blends four pre-blurred copies of the prepared picture by its depth map, every light and window
   grows by its own depth; the drops are a simulation (pure/drops.js) drawn as sprites into a DROP MAP the glass reads (one pass still); the mist is
   inside the pane, over the drops (wiping never removes a drop). */
import { WEAR } from './pure/life.js';   // RELEASE-1 (A): the clothes' palettes (LIFE_F's tables)
import { DEPTH, BEND, LAMP_ROWS, STREET } from './pure/city.js';   // RELEASE-1 (B): the vehicles' shader carries the camera's law, the depth law and the lamps
import { VEH_PAINT, TAXI_PAINT, VEH3 } from './pure/vehmesh.js';
import { VEH } from './pure/vehicles.js';
export const QUAD_V=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy, 0., 1.); }`;
/* a 9-tap Gaussian along uDir (two taps read between texels, so five reads) */
/* RELEASE-1 (B): the coverage blurred with the colour (the vehicles' premultiplied layers share this program: one shader fewer); every reader of the
   city's copies reads their colour only, so they are as before */
export const BLUR_F=`precision highp float; uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec4 c=texture2D(uTex, vUv)*0.2270;
  c+=(texture2D(uTex, vUv+uDir*1.3846)+texture2D(uTex, vUv-uDir*1.3846))*0.3162;
  c+=(texture2D(uTex, vUv+uDir*3.2308)+texture2D(uTex, vUv-uDir*3.2308))*0.0703; gl_FragColor=c; }`;
/* small fixes (2026-11-17): THE MIST'S SOFT COPY STARTS WITH A TRUE 4 × 4 BOX — four bilinear taps one full-size texel off the quarter texel's centre, each
   averaging 2 × 2: a far car's light (2–3 px) is never missed or gridded by sparse taps (the old first pass sampled the full picture 4.8 px apart) */
export const DOWN_F=`precision highp float; uniform sampler2D uTex; uniform vec2 uTexel; varying vec2 vUv;
void main(){ vec3 c=texture2D(uTex, vUv+uTexel*vec2(-1., -1.)).rgb+texture2D(uTex, vUv+uTexel*vec2(1., -1.)).rgb+texture2D(uTex, vUv+uTexel*vec2(-1., 1.)).rgb+texture2D(uTex, vUv+uTexel*vec2(1., 1.)).rgb;
  gl_FragColor=vec4(c*0.25, 1.); }`;
/* the blur radius (view-angle units) of a thing at depth d: uFoc = (focus depth, K, the widest radius) */
/* RELEASE-1 (A): the clothes' palettes as GLSL tables, built from the people law's WEAR (one source) */
const hexV=h=>`vec3(${[0, 2, 4].map(i=>(parseInt(h.slice(i, i+2), 16)/255).toFixed(4)).join(', ')})`, tabV=(n, L)=>`vec3 ${n}(float i){ ${L.slice(0, -1).map((h, j)=>`if(i<${j}.5) return ${hexV(h)}; `).join('')}return ${hexV(L[L.length-1])}; }`;
const WEAR_GLSL=[['wCoat', WEAR.coat], ['wRain', WEAR.rain], ['wLegs', WEAR.legs], ['wShoes', WEAR.shoes], ['wAcc', WEAR.acc], ['wBag', WEAR.bag], ['wHair', WEAR.hair], ['wSkin', WEAR.skin], ['wUmb', WEAR.umb]].map(([n, L])=>tabV(n, L)).join(' ');
const RAD=`float radAt(float d){ return uFoc.z*min(1., max(0., abs(d-uFoc.x)-uFoc.w)*uFoc.y); }`;   // RAIN-5e: uFoc.w — the sharp plateau's half-width
/* THE VIEW's ground: the prepared picture (uBase) and its three blurred copies (uL1…uL3, their radii uRad), chosen per pixel by the depth map's
   blur; the playing light's soft pool on the city when the focus is far (uLight: its place, its strength) */
/* RAIN-5c: THE SKY over the sky's pixels (depth 1): two cloud layers drifting (value noise), lit from below by the city's glow; the moon or a crescent
   through their gaps; the searchlight's beam from the fortress, brighter where it meets cloud; a far aircraft's lights — each softened by the sky's
   own blur radius (pure/sky.js gives the numbers) */
const SKY_GLSL=`uniform vec4 uSkyA, uMoon, uBeam, uPlane; uniform vec3 uPlaneC, uCloudLit, uCloudDark, uMoonCol, uBeamCol, uRedCol, uGreenCol, uWhiteCol; uniform float uMoonPh;
float sh1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(sh1(i), sh1(i+vec2(1., 0.)), f.x), mix(sh1(i+vec2(0., 1.)), sh1(i+vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float s=0., a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7, 9.2); a*=0.5; } return s; }
vec3 skyOver(vec3 c, vec2 p, float r){ if(uSkyA.w<0.5) return c; float hgt=clamp((p.y-0.25)/0.55, 0., 1.), soft=max(r, 0.002);
  float c1=fbm(vec2(p.x*3.4+uSkyA.x*40., p.y*8.5)), c2=fbm(vec2(p.x*6.8-uSkyA.y*40., p.y*14.+3.1)), cv=uSkyA.z, dens=smoothstep(1.-cv-0.04, 1.-cv+0.2, c1*0.62+c2*0.38);
  if(uMoon.w>0.){ float d=length(p-uMoon.xy), disc=smoothstep(uMoon.z+soft, uMoon.z-soft, d), off=smoothstep(uMoon.z+soft, uMoon.z-soft, length(p-uMoon.xy-vec2(uMoon.z*2.*uMoonPh, uMoon.z*0.25)));
    float lit=disc*(1.-off*(1.-step(0.99, uMoonPh))), halo=exp(-d*d/(uMoon.z*uMoon.z*30.)); c+=uMoonCol*(lit*1.1+halo*0.12)*uMoon.w*(1.-dens*0.92); }
  vec3 cc=mix(uCloudDark, uCloudLit, clamp((1.-hgt)*0.9+0.3*(1.-c2), 0., 1.)); c=mix(c, cc, dens*0.85); c+=uCloudLit*0.18*smoothstep(0.35, 0.6, dens)*(1.-smoothstep(0.6, 0.95, dens))*(1.-hgt);   /* the undersides lit, a brighter rim where a cloud thins */
  if(uBeam.w>0.){ vec2 dir=vec2(sin(uBeam.z), cos(uBeam.z)), q=p-uBeam.xy; float al=dot(q, dir), pe=abs(q.x*dir.y-q.y*dir.x), w=0.004+al*0.06+soft;
    if(al>0.) c+=uBeamCol*0.6*uBeam.w*exp(-pe*pe/(w*w))*exp(-al*1.4)*(0.35+0.9*dens); }
  if(uPlane.z>0.){ float rr=max(soft, 0.0017), e=pow(0.0017/rr, 2.)*1.6;
    vec2 a=p-uPlane.xy; c+=uRedCol*uPlaneC.x*exp(-dot(a+vec2(0.004, 0.), a+vec2(0.004, 0.))/(rr*rr))*e*uPlane.z*1.4;
    c+=uGreenCol*uPlaneC.z*exp(-dot(a-vec2(0.004, 0.), a-vec2(0.004, 0.))/(rr*rr))*e*uPlane.z*0.9;
    c+=uWhiteCol*uPlaneC.y*exp(-dot(a, a)/(rr*rr))*e*uPlane.z*1.8; }
  return c; }`;
export const VIEW_F=`precision highp float; uniform sampler2D uBase, uL1, uL2, uL3, uDepth; uniform vec3 uRad; uniform vec4 uFoc; uniform vec2 uTan; uniform vec3 uLight, uLightCol; varying vec2 vUv;
uniform vec2 uStreak; uniform float uTime;   /* RAIN-6: the falling streaks (Echo, Wave: amount, slant) */
uniform vec4 uRip[6]; uniform float uRipD[6];   /* RELEASE-1 (night): the wet road's reflections tremble round a passing vehicle — its ground spot (view units), its size, strength; its depth */
uniform sampler2D uTree; uniform vec2 uCExt, uTreeN; uniform float uSway;   /* RAIN-7: the crowns' mask (bake space) and how far they sway (view units; 0: still); RAIN-9: uTree — each cell's tree and the mask (a), uTreeN its size */
${RAD}
${SKY_GLSL}
void main(){ vec2 uv=vUv; if(uSway>0.){ vec2 pp=(vUv*2.-1.)*uTan, cq=clamp(pp/uCExt*0.5+0.5, 0., 1.), gq=cq*uTreeN-0.5, fq=fract(gq), bq=(floor(gq)+0.5)/uTreeN, dq=1./uTreeN;
    float m=mix(mix(texture2D(uTree, bq).a, texture2D(uTree, bq+vec2(dq.x, 0.)).a, fq.x), mix(texture2D(uTree, bq+vec2(0., dq.y)).a, texture2D(uTree, bq+dq).a, fq.x), fq.y);   /* the mask, bilinear by hand (the texture is nearest-sampled) */
    /* RAIN-9: THE CROWNS SWAY AS TREES — each tree its own rhythm and strength (uTree: phase, distance, strength, height in the crown); GUSTS travel along
       the boulevard away from us (a tree z m off feels a gust z/9 s later); the leaf clusters move, each with its own phase (a mid-scale noise), and
       flutter more in a gust; the top of a crown moves most, its edges stay put (the mask), so nothing warps the crown as one picture */
    if(m>0.){ vec4 tr=texture2D(uTree, cq); float ph=tr.r*6.2832, w=0.85+0.6*tr.r, st=tr.b, hgt=0.4+0.6*m, tg=uTime-tr.g*240./9.;
      float g=pow(max(0., sin(tg*0.31)), 6.)+0.7*pow(max(0., sin(tg*0.19+1.9)), 8.), cl=vn(pp*26.+tr.r*40.), cl2=vn(pp*61.+7.3);
      float bend=st*(0.45*sin(uTime*w+ph+2.4*cl)+0.25*sin(uTime*w*2.3+ph*1.7+3.*cl2)+1.4*g)*(0.55+0.9*cl);
      vec2 fl=vec2(vn(pp*140.+vec2(uTime*1.9, 0.))-0.5, vn(pp*140.+vec2(3.1, uTime*1.6))-0.5)*(0.5+2.2*g);
      vec2 o=uSway*m*hgt*(vec2(bend, 0.18*bend)+fl*1.2); uv+=o/uTan*0.5; } }
  { vec2 pp=(vUv*2.-1.)*uTan; float d0=texture2D(uDepth, vUv).a;   /* RELEASE-1 (night): only the road's own pixels near the vehicle (its depth): the lamps' bright reflections wobble, the dark asphalt hardly shows it */
    for(int k=0;k<6;k++){ vec4 R6=uRip[k]; if(R6.w<=0.) continue; vec2 d=(pp-R6.xy)/vec2(R6.z*1.7, R6.z*2.4); float e=dot(d, d); if(e>=1. || abs(d0-uRipD[k])>0.06) continue;
      float a=R6.w*(1.-e)*(1.-e); uv.x+=(sin(pp.y*900.+uTime*14.+float(k)*1.7)*0.6+sin(pp.y*2300.-uTime*21.)*0.4)*a*R6.z*0.03/uTan.x*0.5; } }
  float dep=texture2D(uDepth, uv).a, r=radAt(dep);   /* the depth rides in the picture's alpha */
  vec3 c0=texture2D(uBase, uv).rgb, c1=texture2D(uL1, uv).rgb, c2=texture2D(uL2, uv).rgb, c3=texture2D(uL3, uv).rgb, c;
  if(r<uRad.x) c=mix(c0, c1, r/uRad.x); else if(r<uRad.y) c=mix(c1, c2, (r-uRad.x)/(uRad.y-uRad.x)); else c=mix(c2, c3, clamp((r-uRad.y)/(uRad.z-uRad.y), 0., 1.));
  if(uStreak.x>0.){ vec2 q=(vUv*2.-1.)*uTan; q.x+=q.y*uStreak.y; float cx=q.x*110., h=fract(sin(floor(cx)*91.7)*43758.5), y=fract(q.y*1.3+uTime*(1.6+h)+h*7.);   /* RAIN-6: rain falling in the air, seen against the lights */
    float s=step(0.45, h)*smoothstep(0., 0.04, y)*smoothstep(0.26, 0.02, y)*smoothstep(0.42, 0.05, abs(fract(cx)-0.5)), lum=dot(c1, vec3(0.3, 0.5, 0.2));
    c+=s*uStreak.x*(0.015+0.9*lum)*vec3(0.86, 0.9, 0.98); }
  if(dep>0.995) c=skyOver(c, (vUv*2.-1.)*uTan, r);   /* RAIN-5c */
  vec2 p=(vUv*2.-1.)*uTan-uLight.xy; c+=uLightCol*uLight.z*0.2*exp(-dot(p, p)/0.012); gl_FragColor=vec4(c, 1.); }`;
/* RAIN-2: THE WINDOW'S OWN QUAD — aQ0, aQ1 its four projected corners (a trapezoid along the street, the facade's perspective); the signed distance to
   that quad (exact, the polygon's law: pure/windows.js winQuadSd, the same arithmetic) shapes it in focus and grown by its blur radius out of focus,
   so a defocused window keeps its perspective, blurred by its depth — never a screen-facing shape. The area for the dimming is the quad's own. */
const QUAD_SD=`float sdQ(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d){ float s=1., m=1e9; vec2 v0, v1, e, w, q;
  v0=a; v1=d; e=v1-v0; w=p-v0; q=w-e*clamp(dot(w,e)/dot(e,e), 0., 1.); m=min(m, dot(q,q)); if((p.y>=v0.y && p.y<v1.y && e.x*w.y>e.y*w.x) || (p.y<v0.y && p.y>=v1.y && e.x*w.y<=e.y*w.x)) s=-s;
  v0=b; v1=a; e=v1-v0; w=p-v0; q=w-e*clamp(dot(w,e)/dot(e,e), 0., 1.); m=min(m, dot(q,q)); if((p.y>=v0.y && p.y<v1.y && e.x*w.y>e.y*w.x) || (p.y<v0.y && p.y>=v1.y && e.x*w.y<=e.y*w.x)) s=-s;
  v0=c; v1=b; e=v1-v0; w=p-v0; q=w-e*clamp(dot(w,e)/dot(e,e), 0., 1.); m=min(m, dot(q,q)); if((p.y>=v0.y && p.y<v1.y && e.x*w.y>e.y*w.x) || (p.y<v0.y && p.y>=v1.y && e.x*w.y<=e.y*w.x)) s=-s;
  v0=d; v1=c; e=v1-v0; w=p-v0; q=w-e*clamp(dot(w,e)/dot(e,e), 0., 1.); m=min(m, dot(q,q)); if((p.y>=v0.y && p.y<v1.y && e.x*w.y>e.y*w.x) || (p.y<v0.y && p.y>=v1.y && e.x*w.y<=e.y*w.x)) s=-s;
  return s*sqrt(m); }`;
/* A LIT WINDOW (one instance each: aRect its centre and half size, aLit its light, aWarm honey … amber, aDepth its depth). In focus: the pane
   behind a curtain, its bars, a little light spilling on the wall. Out of focus (its own radius by its depth): the same light spread over the
   window grown by that radius into a soft rounded rectangle, dimmer by the area. Premultiplied: the pane covers the dark window, the disc adds. */
export const WIN_V=`attribute vec4 aRect, aQ0, aQ1, aEv; attribute float aLit, aWarm, aDepth; uniform vec2 uTan; uniform vec4 uFoc; uniform float uPad;
varying vec2 vP, vH, vV; varying vec4 vQ0, vQ1, vEv; varying float vLit, vWarm, vR, vA0, vPer; ${RAD}
void main(){ vR=radAt(aDepth); vec2 mn=min(min(aQ0.xy, aQ0.zw), min(aQ1.xy, aQ1.zw)), mx=max(max(aQ0.xy, aQ0.zw), max(aQ1.xy, aQ1.zw)), c=(mn+mx)*0.5, hs=(mx-mn)*0.5+vR+uPad*min(1., aRect.w*8.);
  vV=c+position.xy*hs; vP=vV-aRect.xy; vH=aRect.zw; vLit=aLit; vWarm=aWarm; vQ0=aQ0; vQ1=aQ1; vEv=aEv;   /* RAIN-2: the quad's bounds grown by the radius */
  vA0=0.5*abs((aQ0.x*aQ0.w-aQ0.z*aQ0.y)+(aQ0.z*aQ1.y-aQ1.x*aQ0.w)+(aQ1.x*aQ1.w-aQ1.z*aQ1.y)+(aQ1.z*aQ0.y-aQ0.x*aQ1.w)); vPer=distance(aQ0.xy, aQ0.zw)+distance(aQ0.zw, aQ1.xy)+distance(aQ1.xy, aQ1.zw)+distance(aQ1.zw, aQ0.xy);
  gl_Position= aLit>0.004 ? vec4(vV/uTan, 0., 1.) : vec4(2., 2., 2., 1.); }`;
export const WIN_F=`precision highp float; uniform float uPad, uBaked, uTime; uniform vec3 uHoney, uAmber, uGarA, uGarB, uGarC, uGarD; uniform sampler2D uLit; uniform vec2 uExt; varying vec2 vP, vH, vV; varying vec4 vQ0, vQ1, vEv; varying float vLit, vWarm, vR, vA0, vPer; ${QUAD_SD}
float wel(vec2 p, vec2 c, vec2 r){ return length((p-c)/r)-1.; }
void main(){ float d=sdQ(vV, vQ0.xy, vQ0.zw, vQ1.xy, vQ1.zw), R=max(vR, 1e-4), k=clamp(vR/(vH.y*0.9+0.002), 0., 1.);   /* RAIN-2: the distance to the window's own quad */
  vec3 warm=mix(uHoney, uAmber, vWarm); vec2 u=vP/vH, lp=u-vec2(0.3*sin(vWarm*40.), -0.4);
  float folds=0.84+0.16*sin(u.x*9.+vWarm*20.), lamp=0.6+0.4*exp(-dot(lp, lp)*1.5);
  float bars=1.-0.7*max(smoothstep(0.08, 0.03, abs(u.x)), smoothstep(0.06, 0.02, abs(u.y-0.4)));
  float e=vH.x*0.08, inA=smoothstep(e, -e, d);
  float A0=max(vA0, 1e-6), A1=A0+vPer*R+3.1416*R*R, gain=pow(A0/A1, 0.5);   /* the quad's own area grown by the radius */
  float disc=smoothstep(R, R*0.7, d)*(0.86+0.14*smoothstep(R*0.2, R*0.9, d));
  float sp=uPad*min(1., vH.y*8.), spill=exp(-max(d, 0.)/(sp*0.3+1e-5))*0.16*(1.-k)*step(0., d);
  vec3 inner= uBaked>0.5 ? texture2D(uLit, clamp(vV/uExt*0.5+0.5, 0., 1.)).rgb*1.1 : warm*folds*lamp*bars;   /* RAIN-1: in focus, the baked room and its life */
  /* RAIN-5c: the window's life (pure/windows.js): someone at the window (a silhouette coming from the side and going), a curtain drawn and back */
  if(vEv.y>0.5){ float ev=vEv.y, uu=vEv.z, sx= ev<1.5 || ev>2.5 ? (uu<0.3 ? mix(-1.2, 0.1, smoothstep(0., 0.3, uu)) : uu<0.75 ? 0.1+0.06*sin(uu*20.) : mix(0.1, 1.3, smoothstep(0.75, 1., uu))) : 9.;
    float sil=max(step(wel(u, vec2(sx, 0.18), vec2(0.2, 0.24)), 0.), step(wel(u, vec2(sx, -0.62), vec2(0.58, 0.5)), 0.));
    if(ev>1.5 && ev<2.5){ float e=-1.05+0.95*(0.5-0.5*cos(uu*6.2832)); inner*=mix(1., 0.42*(0.85+0.15*sin(u.x*24.)), smoothstep(e+0.06, e-0.06, u.x)); }
    inner*=1.-0.85*sil; }
  if(vEv.x>0.5) for(int b=0;b<9;b++){ float fb=float(b), x=-0.82+fb*0.205, y=0.74-0.12*(1.-x*x), tw=0.5+0.5*sin(uTime*(1.1+0.31*fb)+fb*2.1+vWarm*30.), m4=mod(fb, 4.);   /* a twinkling garland */
    vec3 gc= m4<0.5 ? uGarA : m4<1.5 ? uGarB : m4<2.5 ? uGarC : uGarD; vec2 dd=(u-vec2(x, y))*vec2(1., vH.y/max(vH.x, 1e-5)); inner+=gc*(0.25+1.2*tw)*exp(-dot(dd, dd)/0.0035); }
  vec3 c=mix(inner*inA, warm*0.85*gain*disc*(vEv.x>0.5 ? 1.08 : 1.), k)+warm*spill;
  gl_FragColor=vec4(c*vLit, inA*(1.-k)*min(1., vLit*1.5)); }`;
/* A LIGHT (one instance each): aRect its centre and half size, aCol its colour and strength, aDK its depth and kind — 0 a point (a lamp, a far
   light, a car's light: a small glow in focus), 1 a reflection in the wet street (a streak below its light, fading downwards), 2 a lit rectangle
   (the tram's windows). Out of focus each grows by its own radius into a soft disc (or rounded streak / rectangle), dimmer by the area. */
export const LIGHT_V=`attribute vec4 aRect, aCol; attribute vec2 aDK; uniform vec2 uTan; uniform vec4 uFoc; uniform float uPx, uWin;
varying vec2 vP, vH, vHS; varying vec3 vCol; varying float vRad, vKind, vGain, vK, vB, vPx; ${RAD}
void main(){ float R=radAt(aDK.x), kind=aDK.y, b=max(aRect.z, 0.7/uPx); vKind=kind; vB=b;
  vec2 h= kind<0.5 ? vec2(0.) : kind<1.5 ? vec2(0., aRect.w) : aRect.zw; float rad= kind<1.5 ? b+R : R+0.35/uPx;
  vK=clamp(R/(b*3.+0.004), 0., 1.); float glow= kind<0.5 ? 3.*b*(1.-vK) : 0.;
  vec2 hs=h+rad+glow+(kind<0.5 ? 2./uPx*uWin : 0.); vP=position.xy*hs; vH=h; vRad=rad; vHS=hs; vPx=uPx;   /* RAIN-5e: a point keeps 2 px of room for its round edge */
  float A0= kind<1.5 ? b*(2.*h.y+3.1416*b*0.5) : 4.*h.x*h.y, A1= kind<1.5 ? rad*(2.*h.y+3.1416*rad*0.5) : 4.*(h.x+R)*(h.y+R);
  vGain=pow(max(A0, 1e-9)/max(A1, 1e-9), 0.55); vCol=aCol.rgb*aCol.a;
  gl_Position= aCol.a>0.003 ? vec4((aRect.xy+vP)/uTan, 0., 1.) : vec4(2., 2., 2., 1.); }`;
export const LIGHT_F=`precision highp float; varying vec2 vP, vH, vHS; varying vec3 vCol; varying float vRad, vKind, vGain, vK, vB, vPx; uniform float uWin;
uniform float uLamp;   /* RAIN-6c: Warm/Bright on the light sources — −1 amber tungsten, softer, a little dimmer … 0 as they are … +1 white LED, brighter */
uniform float uTime, uRainK;   /* RAIN-7: the rain seen in the lamps' light */
vec3 lampTone(vec3 c){ if(uLamp==0.) return c; float L=dot(c, vec3(0.3, 0.5, 0.2)); return uLamp<0. ? mix(c, L*vec3(1.38, 0.8, 0.38)*0.82, -uLamp) : mix(c, L*vec3(0.92, 1.0, 1.12)*1.25, uLamp); }
void main(){ if(vKind>3.5){ vec2 u=vP/max(vH+vRad, vec2(1e-5)); float g= uWin>1.5 ? exp(-dot(u, u)*2.6) : max(0., exp(-dot(u, u)*2.6)-0.0743)/0.9257*(1.-smoothstep(0.8, 1., max(abs(u.x), abs(u.y))))*smoothstep(1.2, 3., min((1.-abs(u.x))*vHS.x, (1.-abs(u.y))*vHS.y)*vPx);   /* uWin 2: RAIN-8's cut pool (the probes' CONTROL only) */ gl_FragColor=vec4(lampTone(vCol)*g*0.55, 1.); return; }   /* RAIN-8: a soft pool of light on the wet ground (a car's headlights ahead); RAIN-10: it reaches 0 inside its quad (it was cut at 7 % of its peak — a faint box on the road round every car) */
  if(vKind>2.5){ vec2 u=vP/max(vH, vec2(1e-5)); float y=0.5-0.5*u.y, w=0.1+0.9*y, m=smoothstep(w, w*0.45, abs(u.x))*smoothstep(1., 0.8, abs(u.y))*(1.-0.55*y);   /* RAIN-7: a lamp's cone, the drops lit falling through it */
    float col=floor((u.x+1.)*vH.x*vPx/2.5), sp=fract(sin(col*91.7+3.1)*437.5), st=smoothstep(0.86, 1., fract(u.y*1.6+uTime*(1.9+sp*0.8)+sp*7.))*step(0.45, fract(sp*13.));
    gl_FragColor=vec4(lampTone(vCol)*m*(0.035+0.42*st*uRainK)*0.6, 1.); return; }
  vec2 q=abs(vP)-vH; float d=length(max(q, 0.))+min(max(q.x, q.y), 0.)-vRad;
  float fade= vKind>0.5 && vKind<1.5 ? pow(clamp(0.5+0.5*vP.y/max(vH.y+vRad, 1e-5), 0., 1.), 1.6) : 1.;
  float sharp= vKind<0.5 ? exp(-dot(vP, vP)/(vB*vB)*1.6)+0.18*exp(-length(vP)/(vB*1.6)) : smoothstep(0., -vRad*0.5-1e-5, d);
  float disc=smoothstep(0., -max(vRad*0.25, 1e-5), d)*(0.82+0.18*smoothstep(-vRad*0.7, 0., d))*vGain;
  float hp=min(vHS.x, vHS.y)*vPx, rp=length(vP)*vPx, win= vKind<0.5 ? mix(1., 1.-smoothstep(hp-3., hp-1.2, rp), uWin) : 1.;   /* RAIN-5e: a point light is a round disc at every size and blur (its glow faded to 0 inside its quad) */
  gl_FragColor=vec4(lampTone(vCol)*mix(sharp, disc, vK)*fade*win, 1.); }`;
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
/* RAIN-5: THE PEOPLE AND THE STREET'S SMALL LIFE (pure/life.js), one instance each: aRect its foot (view units), half width and half height, aK
   (kind, phase, colour, alpha), aDep its focus depth — silhouettes drawn by shape (no texture), their edges softened by the focus like the lights;
   the rings, splashes and steam pale, the rest dark against the lit street (an umbrella in its colour). Premultiplied over the view. */
/* RAIN-10: the quad holds its shape whole — the padding is the shape's widest soft edge + 2.2 px (the border window works only inside the padding,
   never on the shape: RAIN-5b's window over the quad's outer 40 % erased the feet, the arms and the umbrella's dome once RAIN-5e's sharp plateau made
   the padding 1.5 px), people reach 45 % wider and 30 % higher (an umbrella leaning in the wind); vFade keeps RAIN-5b's padding (the far ones as faint as before) */
/* RELEASE-1 (A): aView (the walking direction's screen step per metre in the figure's units, the sine of the angle we look down at it, the half stride in
   metres) → vV; vRt the figure's width unit over its height unit (true proportions); people's quads reach DOWN (LIFE_DN of the quad's height: the feet
   stepping towards us, the contact shadow, the wet street's reflection; the dog ahead of its walker) */
export const LIFE_DN=k=>(k===2 ? 0.6 : (k<=1 || (k>=14 && k<=18) || k===4 || k===6) ? 0.3 : 0);
export const LIFE_V=`attribute vec4 aRect, aK, aView; attribute float aDep; attribute vec2 aWear; uniform vec2 uTan; uniform vec4 uFoc; uniform float uPx, uWin;
varying vec2 vQ, vE, vBand, vAsp, vP, vW; varying vec4 vK, vV; varying float vSoft, vFade, vDep, vR, vRt; ${RAD}
void main(){ float R=radAt(aDep), k=floor(aK.x+0.5), soft=max(R+0.8/uPx, 0.04*aRect.w), pad=soft+2.2/uPx, padX=max(soft, soft*aRect.z/max(2.*aRect.w, 1e-6))+2.2/uPx, pad0=R+1.5/uPx;
  vec2 ext= (k<2.5 || (k>13.5 && k<18.5)) ? vec2(1.45, 1.3) : k>19.5 && k<20.5 ? vec2(1.3, 1.) : vec2(1.);   /* a sign: the cup's handle */ if(uWin>1.5){ ext=vec2(1.); pad=pad0; padX=pad0; }   /* uWin 2: RAIN-9's quad and window (the probes' CONTROL only) */
  float dn= uWin>1.5 ? 0. : (k>1.5 && k<2.5 ? 0.6 : (k<1.5 || (k>13.5 && k<18.5) || (k>3.5 && k<4.5) || (k>5.5 && k<6.5)) ? 0.3 : 0.)*2.*aRect.w;   /* LIFE_DN */
  vec2 hs=aRect.zw*ext+vec2(padX, pad)+vec2(0., dn*0.5), P=vec2(aRect.x, aRect.y-pad-dn+hs.y)+position.xy*hs;
  vE=position.xy; vBand=vec2(padX, pad)/hs; vAsp=hs/max(hs.x, hs.y); vP=P; vDep=aDep; vR=R; vFade=min(1., (aRect.z*aRect.w)/max(1e-12, (aRect.z+pad0)*(aRect.w+pad0))*1.6);
  vQ=vec2((P.x-aRect.x)/max(aRect.z, 1e-6), (P.y-aRect.y)/max(2.*aRect.w, 1e-6)); vK=aK; vW=aWear; vV=aView; vRt=aRect.z*((k<2.5 || (k>13.5 && k<18.5)) ? 1.15 : 1.)/max(2.*aRect.w, 1e-6); vSoft=(R+0.8/uPx)/max(2.*aRect.w, 1e-6);
  gl_Position= aK.w>0.003 ? vec4(P/uTan, 0., 1.) : vec4(2., 2., 2., 1.); }`;
export const LIFE_F=`precision highp float; varying vec2 vQ, vE, vBand, vAsp, vP, vW; varying vec4 vK, vV; varying float vSoft, vFade, vDep, vR, vRt; uniform float uWin;
/* RAIN-10: the border window only inside the padding (uWin 0: none; 2: RAIN-5b's old window over the quad's outer 40 % — the probes' CONTROL only) */
float winOf(){ vec2 a=abs(vE), w=vec2(1.)-smoothstep(vec2(1.)-vBand, vec2(1.), a); return uWin>1.5 ? 1.-smoothstep(0.6, 0.9, max(a.x, a.y)) : mix(1., w.x*w.y, uWin); }
/* RAIN-10: behind the baked city — a trunk, a crown, a house nearer than the item hides it (the bake's depth map, softened by the item's blur);
   m: how much nearer counts (facade things sit on their facade). uOccl 0: drawn over everything (the CONTROL) */
uniform sampler2D uDepthMap; uniform vec2 uExt; uniform float uOccl;
float seen(float m){ if(uOccl<0.5) return 1.; float o=0.; vec2 r=vec2(max(vR*0.7, 0.0006), 0.);
  for(int i=0;i<5;i++){ vec2 q=vP+(i==0 ? vec2(0.) : i==1 ? r : i==2 ? -r : i==3 ? r.yx : -r.yx); float bd=texture2D(uDepthMap, clamp(q/uExt*0.5+0.5, 0., 1.)).r; o+=smoothstep(m, m+0.018, vDep-bd); }
  return 1.-o/5.; }
uniform vec3 uGarA, uGarB, uGarC, uGarD, uSign, uSignWarm, uCross, uWalkR, uWalkG, uNavR, uHead;   // RAIN-5c: the furniture's lights (tokens)
uniform float uHalves;   // RELEASE-1 (B): the probes' halves
float el(vec2 p, vec2 c, vec2 r){ return (length((p-c)/r)-1.)*min(r.x, r.y*2.); }
float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 e=b-a, q=p-a; float t=clamp(dot(q, e)/dot(e, e), 0., 1.); return length(q-e*t)-w; }
float elm(vec2 p, vec2 c, vec2 r){ return (length((p-c)/r)-1.)*min(r.x, r.y); }   /* RELEASE-1 (C): an ellipse in metres (the cat) */
/* RAIN-5c: a person seen from the front or the back (the street runs away from us) at ox: the swinging leg's foot lifts (heel, then toe), the hips
   sway over the standing leg, the body bobs twice a step, the arms swing against the legs (the one forward looks shorter); with an umbrella one arm
   holds its handle steady at the middle. st 1 = standing; bend = a stoop; sw = the swing's size.
   RELEASE-1 (A): the figure in PARTS, each its own colour (RAIN-5b drew one body colour): the coat with its sleeves and collar and, by style, its hem
   swinging with the step (0 a jacket, 1 a coat to the knee, 2 a skirt under a jacket, 3 a long coat); the trousers or skirt (dark tights below it);
   the shoes; the hands; the head — hair by its style (short, medium, long to the shoulders, a bun) and, from the front, the face. The nearest figure's
   parts are kept in the g* globals (a couple, a group: each figure its own clothes, who = its place); sc scales a shrunk figure's distances. */
float gD=1e3, gC=1e3, gL=1e3, gT=1e3, gS=1e3, gK=1e3, gH=1e3, gA=1e3, gB=1e3, gN=1e3, gDog=1e3, gWho=0., gFig=0., gFace=0., gStyle=0., gHs=0., gRt=0.25; vec4 gV=vec4(0.);
/* RELEASE-1 (A): a capsule in true proportions (x by the figure's width unit over its height unit), its radius in height units */
float limb(vec2 q, vec2 a, vec2 b, float r){ return seg(vec2(q.x*gRt, q.y), vec2(a.x*gRt, a.y), vec2(b.x*gRt, b.y), r); }
float figure(vec2 p, float ox, float ph, float sw, float st, float bend, float umb, float who, float sc){ float a=ph*6.2832, s=sin(a)*(1.-st), c=cos(a)*(1.-st), k=sw/0.1, sway=0.03*s*k, bob=0.014*(1.-abs(cos(a)))*(1.-st)*k;
  vec2 q=p-vec2(sway+bend*(p.y-0.3)*0.5, bob); float hx=ox+bend*0.12, sty=mod(gStyle+2.*who, 4.), hst=mod(gHs+3.*who, 4.);
  /* RELEASE-1 (A): THE STRIDE ON THE GROUND — each foot moves along the walking direction as it shows on screen (gV.xy per metre × the half stride gV.w):
     walking away the leading foot sits higher, towards us lower, off to the side it shifts sideways too (a flat «front view» gait read as floating);
     the swinging foot lifts; the arms swing against the legs along the same direction */
  vec2 W=gV.xy*gV.w*min(k, 1.6); float lL=max(0., s)*0.075*k, lR=max(0., -s)*0.075*k;
  vec2 fL=vec2(ox-0.12, 0.03+lL)-W*c, fR=vec2(ox+0.12, 0.03+lR)+W*c, Wn=length(W*vec2(gRt, 1.))>1e-4 ? normalize(W*vec2(gRt, 1.)) : vec2(0.);
  float dC=min(el(q, vec2(ox, 0.53), vec2(0.38, 0.24)), el(q, vec2(ox, 0.765), vec2(0.17, 0.035)));   /* the coat and its collar */
  if(sty>0.5 && sty<1.5 || sty>2.5){ float hy= sty<1.5 ? 0.24 : 0.15, t=clamp((0.46-q.y)/(0.46-hy), 0., 1.), hs=0.03*s*k*t;   /* the hem flares and swings with the legs */
    dC=min(dC, max(abs(q.x-ox-hs)-mix(0.34, sty>2.5 ? 0.42 : 0.39, t), max(hy+0.008*sin(q.x*9.+a)-q.y, q.y-0.46))*0.45); }
  vec2 aL=vec2(ox-0.37, 0.355)+W*c*0.55, aR=vec2(ox+0.37, 0.355)-W*c*0.55;   /* the hands, swinging */
  dC=min(dC, limb(q, vec2(ox-0.3, 0.68), aL+vec2(0., 0.035), 0.075*gRt+0.006));   /* the sleeves */
  float dK=el(q, aL, vec2(0.07, 0.032));
  if(umb>0.5){ dC=min(dC, seg(q, vec2(ox+0.3, 0.68), vec2(ox+0.05, 0.84), 0.06)); dK=min(dK, el(q, vec2(ox+0.04, 0.85), vec2(0.075, 0.026))); }
  else { dC=min(dC, limb(q, vec2(ox+0.3, 0.68), aR+vec2(0., 0.035), 0.075*gRt+0.006)); dK=min(dK, el(q, aR, vec2(0.07, 0.032))); }
  float rl=0.1*gRt+0.004, legs=min(limb(q, vec2(ox-0.11, 0.32), fL+vec2(0., 0.012), rl), limb(q, vec2(ox+0.11, 0.32), fR+vec2(0., 0.012), rl)), dL=legs, dT=1e3;
  if(sty>1.5 && sty<2.5){ float t=clamp((0.34-q.y)/0.14, 0., 1.); dL=max(abs(q.x-ox-0.018*s*k*t)-mix(0.3, 0.37, t), max(0.2+0.006*sin(q.x*11.+a)-q.y, q.y-0.34))*0.45; dT=legs; }   /* a skirt; tights below */
  float dS=min(min(el(q, fL+vec2(0., -0.012), vec2(0.105, 0.02)), limb(q, fL+vec2(0., -0.012), fL+vec2(0., -0.012)+Wn*vec2(1./max(gRt, 0.05), 1.)*0.055, 0.02)),
               min(el(q, fR+vec2(0., -0.012), vec2(0.105, 0.02)), limb(q, fR+vec2(0., -0.012), fR+vec2(0., -0.012)+Wn*vec2(1./max(gRt, 0.05), 1.)*0.055, 0.02)));   /* the shoes, toes forward */
  float head=el(q, vec2(hx, 0.865), vec2(0.24, 0.065)), dH=head;
  if(hst>1.5 && hst<2.5) dH=min(dH, gFace>0.5 ? max(el(q, vec2(hx, 0.81), vec2(0.25, 0.07)), 0.13-abs(q.x-hx)) : el(q, vec2(hx, 0.8), vec2(0.25, 0.07)));   /* long hair: from the front only at the sides */
  else if(hst>2.5) dH=min(dH, el(q, vec2(hx+0.03, 0.935), vec2(0.12, 0.032)));   /* a bun */
  float hl=(hst<0.5 ? 0.9 : hst<1.5 ? 0.885 : 0.88)-0.025*gV.z;   /* the hairline (seen from above: more hair, less face) */
  if(gFace>0.5) dK=min(dK, max(head, max(q.y-hl, abs(q.x-hx)-(hst>1.5 && hst<2.5 ? 0.15 : 0.19))));   /* the face, from the front */
  else if(hst<0.5) dK=min(dK, max(head, q.y-0.82));   /* the nape under short hair */
  float d=min(min(min(dC, dL), min(dS, dK)), min(dH, dT))*sc;
  if(d<gD){ gD=d; gC=dC*sc; gL=dL*sc; gT=dT*sc; gS=dS*sc; gK=dK*sc; gH=dH*sc; gWho=who; gFig=1.; }
  return d; }
float person(vec2 p, float ox, float ph, float sw, float st, float bend, float umb){ return figure(p, ox, ph, sw, st, bend, umb, 0., 1.); }
/* RAIN-6b (RAIN-6c's rest): an umbrella leans into Wave's wind about its handle's top, gusting (each its own phase) */
uniform float uWind, uTime;
vec2 tilt(vec2 p, float y, float k){ if(uWind<=0.) return p; float a=-uWind*(0.32+0.14*sin(uTime*2.3+k*1.7)), c=cos(a), s=sin(a); vec2 q=p-vec2(0., y*0.6); return vec2(c*q.x-s*q.y, s*q.x+c*q.y)+vec2(0., y*0.6); }
/* RELEASE-1 (A): THE UMBRELLA'S CANOPY AS SEEN FROM ABOVE — the rim is a horizontal circle: on screen an ellipse of half width a and half height
   a·(width unit / height unit)·sin(look-down angle) (gV.z); the dome rises over it by 0.17·cos (a side view: RAIN-5's half dome; from high above: an oval
   that hides the head). Eight ribs from the top to the rim (each point placed on the cone between them: cRib, the panel's parity cPan for the golf
   umbrellas, cT how far out), the rim's shade (cRim), the shaft from the hand (cHand) and the ferrule. gRtL: the width unit's ratio in this canopy's frame */
float cRib=0., cRim=0., cPan=0., cHand=1e3, cTo=0., cSp=0., cFlip=0.; vec2 cDQ=vec2(0.); float gRtL=0.25;   /* cFlip: inside out 0…1 (RELEASE-1 (C)) */
float dome(vec2 p, float ox, float w, float y){ float sE=clamp(gV.z, 0., 0.98), cE=sqrt(1.-sE*sE), a=w*0.9, dn=a*gRtL*sE, up=0.17*cE+dn, hc=0.17*cE;
  if(cFlip>0.003){ ox+=0.035*sin(uTime*23.)*cFlip; float X=(p.x-ox)/a, q=max(0., 1.-X*X), lift=0.3*cE*cFlip*X*X+0.12*sE*cFlip, yl=y+lift-dn*sqrt(q)-0.01, yu=y+lift+0.05*cE+dn*sqrt(q)+0.01;   /* INSIDE OUT: the rim blown up over the ferrule into a cup (its hollow seen), shaking */
    float dc=max((abs(X)-1.)*a*0.5, max(yl-p.y, p.y-yu)*0.6); cRib=(1.-smoothstep(0.05, 0.14, abs(fract(X*2.+0.5)-0.5)))*0.6; cRim=0.; cPan=mod(floor(X*2.+2.), 2.); cTo=abs(X); cSp=-0.5; cDQ=vec2(X, 0.);
    dc=min(dc, seg(p, vec2(ox, y-0.02), vec2(ox, y+lift+0.02), 0.016)); if(cHand<100.) dc=min(dc, seg(p, vec2(cHand, 0.85), vec2(ox, y+0.01), 0.018)); return dc; }
  float d= p.y>=y ? el(p, vec2(ox, y), vec2(a, max(up, 1e-3))) : dn>0.004 ? el(p, vec2(ox, y), vec2(a, dn)) : max(el(p, vec2(ox, y), vec2(a, 0.17)), (y-p.y)*0.6);
  float X=(p.x-ox)/a, Y=p.y-y-hc, A=hc*hc-dn*dn, B=2.*Y*hc, C=Y*Y+X*X*dn*dn, t;   /* the cone: (X/t)² + ((Y + hc·t)/(dn·t))² = 1 */
  if(abs(A)<1e-6) t= abs(B)>1e-6 ? -C/B : 1.; else { float D=max(B*B-4.*A*C, 0.), t1=(-B+sqrt(D))/(2.*A), t2=(-B-sqrt(D))/(2.*A); t= t1>=0. && t1<=1.2 ? t1 : t2; }
  t=clamp(t, 0.02, 1.); float cp=clamp(X/t, -1., 1.), sp= dn>0.004 ? clamp((Y+hc*t)/(dn*t), -1., 1.) : -sqrt(1.-cp*cp), f=(atan(sp, cp)+3.1416)/0.7854, u=fract(f);
  cRib=(1.-smoothstep(0.04, 0.12, min(u, 1.-u)*t*2.5))*smoothstep(0.08, 0.3, t); cPan=mod(floor(f), 2.); cTo=t; cSp=sp; cRim=smoothstep(-0.035, -0.006, d); cDQ=vec2(X, sp);
  d=min(d, seg(p, vec2(ox, y+hc), vec2(ox, y+hc+0.03*cE), 0.016)); if(cHand<100.) d=min(d, seg(p, vec2(cHand, 0.85), vec2(ox, y+0.01), 0.018));
  return d; }
vec3 vcol(float i){ return i<0.5 ? vec3(0.06, 0.065, 0.07) : i<1.5 ? vec3(0.22, 0.23, 0.24) : i<2.5 ? vec3(0.04, 0.06, 0.12) : i<3.5 ? vec3(0.16, 0.04, 0.045) : i<4.5 ? vec3(0.2, 0.17, 0.12) : i<5.5 ? vec3(0.02, 0.02, 0.025) : i<6.5 ? vec3(0.3, 0.31, 0.32) : vec3(0.04, 0.09, 0.07); }   /* RAIN-6b: the cars' muted colours */
${WEAR_GLSL}
/* RELEASE-1 (A): a figure's clothes (pure/life.js outfitOf — the same arithmetic): code the look (coat + 8 umbrella kind), w the wear code, who its place */
void outfit(float code, float w, float who, out vec3 c, out vec3 l, out vec3 s, out vec3 a, out vec3 b, out vec3 h, out vec3 k){ float ci=mod(mod(code, 8.)+3.*who, 8.), uk=mod(floor(code/8.), 8.);
  c= uk>5.5 && uk<6.5 ? wRain(ci) : wCoat(ci); l=wLegs(mod(mod(w, 8.)+5.*who, 8.)); s=wShoes(mod(mod(floor(w/8.), 4.)+who, 4.)); a=wAcc(mod(mod(floor(w/32.), 8.)+3.*who, 8.));
  b=wBag(mod(mod(floor(w/256.), 4.)+who, 4.)); h=wHair(mod(mod(floor(w/1024.), 8.)+3.*who, 8.)); k=wSkin(mod(mod(floor(w/8192.), 4.)+who, 4.)); }
/* the light on a figure: the look's glow (uAmb, its hue kept a little) and the near lamps (aWear.y, toned by Warm/Bright), stronger higher up (the lamps are above) */
uniform vec3 uAmb, uLampC; uniform float uLamp, uOneCol;
vec3 lampTone(vec3 c){ if(uLamp==0.) return c; float L=dot(c, vec3(0.3, 0.5, 0.2)); return uLamp<0. ? mix(c, L*vec3(1.38, 0.8, 0.38)*0.82, -uLamp) : mix(c, L*vec3(0.92, 1.0, 1.12)*1.25, uLamp); }
vec3 litBy(float y){ return mix(vec3(1.), uAmb/max(dot(uAmb, vec3(0.3, 0.5, 0.2)), 1e-3), 0.35)*0.4+lampTone(uLampC)*vW.y*(0.3+0.7*clamp(y, 0., 1.))*0.9; }
/* a lit pictogram (no text): 0 a coffee cup with steam, 1 a pharmacy cross, 2 scissors, 3 a key, 4 a croissant — its glass at the sign's middle */
float glyph(vec2 p, float g){ vec2 q=vec2(p.x*0.5, p.y-0.5);   /* a square sign: x in the sprite's half-widths → y units */
  if(g<0.5) return min(min(el(q, vec2(-0.06, -0.08), vec2(0.42, 0.28)), abs(el(q, vec2(0.42, -0.06), vec2(0.15, 0.12)))-0.05), min(seg(q, vec2(-0.2, 0.22), vec2(-0.12, 0.38), 0.035), seg(q, vec2(0.06, 0.22), vec2(0.14, 0.38), 0.035)));
  if(g<1.5) return min(abs(q.x)-0.14+max(0., abs(q.y)-0.4)*9., abs(q.y)-0.14+max(0., abs(q.x)-0.4)*9.);
  if(g<2.5) return min(min(abs(el(q, vec2(-0.25, -0.25), vec2(0.15, 0.13)))-0.04, abs(el(q, vec2(0.25, -0.25), vec2(0.15, 0.13)))-0.04), min(seg(q, vec2(-0.18, -0.15), vec2(0.22, 0.4), 0.035), seg(q, vec2(0.18, -0.15), vec2(-0.22, 0.4), 0.035)));
  if(g<3.5) return min(abs(el(q, vec2(-0.3, 0.), vec2(0.2, 0.2)))-0.05, min(seg(q, vec2(-0.1, 0.), vec2(0.42, 0.), 0.045), min(seg(q, vec2(0.3, 0.), vec2(0.3, -0.13), 0.04), seg(q, vec2(0.18, 0.), vec2(0.18, -0.1), 0.04))));
  vec2 c0=vec2(0., 0.16); float cr=max(el(q, vec2(0., -0.02), vec2(0.42, 0.3)), -el(q, c0, vec2(0.3, 0.24))), gr=min(seg(q, c0, c0+vec2(-0.33, -0.36), 0.018), min(seg(q, c0, c0+vec2(0., -0.5), 0.018), seg(q, c0, c0+vec2(0.33, -0.36), 0.018)));
  return max(cr, -gr); }   /* a crescent with its grooves */
/* a walker's carried and worn things (acc): 1 a shoulder bag, 2 a backpack, 3 a hat, 4 a scarf, 5 a bag and a scarf, 6 a knitted cap, 7 a tote; face 1 = from the front.
   RELEASE-1 (A): the bags (gB) swing with the step (ph), the hat, the scarf and the cap (gA) in their own colour */
void gear(vec2 p, float acc, float face, float ph, inout float d){ if(acc<0.5) return; float a=ph*6.2832, sw=0.035*sin(a), lift=0.012*abs(cos(a));
  if(acc>0.5 && acc<1.5 || acc>4.5 && acc<5.5) gB=min(gB, min(el(p, vec2(0.44+sw, 0.36+lift), vec2(0.12, 0.1)), seg(p, vec2(0.42+sw, 0.42+lift), vec2(-0.2, 0.76), 0.02)));
  if(acc>1.5 && acc<2.5){ if(face<0.5) gB=min(gB, el(p, vec2(0., 0.58+lift*0.5), vec2(0.3, 0.17))); else gB=min(gB, min(seg(p, vec2(-0.2, 0.74), vec2(-0.22, 0.42), 0.022), seg(p, vec2(0.2, 0.74), vec2(0.22, 0.42), 0.022))); }
  if(acc>2.5 && acc<3.5) gA=min(gA, min(seg(p, vec2(-0.36, 0.915), vec2(0.36, 0.915), 0.022), el(p, vec2(0., 0.95), vec2(0.21, 0.045))));
  if(acc>3.5 && acc<5.5){ gA=min(gA, el(p, vec2(0., 0.77), vec2(0.21, 0.035))); if(face>0.5) gA=min(gA, el(p, vec2(0.1-sw*0.5, 0.66), vec2(0.05, 0.1))); else gA=min(gA, el(p, vec2(-0.12+sw*0.6, 0.69), vec2(0.05, 0.08))); }   /* the scarf's loose end */
  if(acc>5.5 && acc<6.5) gA=min(gA, el(p, vec2(0., 0.925), vec2(0.25, 0.055)));
  if(acc>6.5) gB=min(gB, min(el(p, vec2(-0.45-sw, 0.32+lift), vec2(0.15, 0.14)), seg(p, vec2(-0.45-sw, 0.42+lift), vec2(-0.4, 0.5), 0.02)));
  d=min(d, min(gA, gB)); }
void main0(){ float k=floor(vK.x+0.5), ph=fract(vK.y), sub=floor(vK.y), face=mod(sub, 2.), xtra=floor(sub/2.), code=floor(vK.z+0.5), ci=mod(code, 8.), uk=mod(floor(code/8.), 8.), uci=mod(floor(code/64.), 4.), acc=mod(floor(code/256.), 8.), flipU=floor(code/2048.)/15.;   /* RELEASE-1 (C): the gust's inside-out umbrella (its progress) */
  vec2 p=vQ; if(k<2.5 || (k>13.5 && k<18.5)) p.y*=1.15;   /* RAIN-5c: a person's quad reaches 15 % over the head (rain.js): the umbrella fits */
  float d=1., du=1., da=1., light=0., clear=0., uy=0.9, uw=1., ux=0.012*sin(ph*6.2832), lamp=0.; vec3 lampC=vec3(0.), glowC=vec3(0.);
  float hasU= uk<3.5 ? 1. : 0., wc=floor(vW.x+0.5); gV=vV; gRt=max(vRt, 0.02); gRtL=gRt; gFace=face; gStyle=mod(floor(wc/32768.), 4.); gHs=mod(floor(wc/131072.), 4.);   /* RELEASE-1 (A): the wear's style and hair style */
  if(k<0.5 || (k>14.5 && k<15.5) || (k>15.5 && k<16.5)){ float st= k>15.5 ? 1. : 0., bend= k>14.5 && k<15.5 ? 0.25 : 0.;
    d=person(p, 0., ph, k>14.5 && k<15.5 ? 0.06 : 0.1, st, bend, hasU*(1.-st));
    if(k>15.5 && ph<0.3){ gB=min(gB, el(p, vec2(0.22, 0.74), vec2(0.1, 0.05))); d=min(d, gB); lamp=exp(-dot((p-vec2(0.22, 0.74))/vec2(0.1, 0.05), (p-vec2(0.22, 0.74))/vec2(0.1, 0.05))*1.5)*0.35; lampC=vec3(0.55, 0.66, 0.9); }   /* the phone held up, its screen lit */
    cHand= st>0.5 ? 1e3 : 0.04; cFlip= flipU>0. ? smoothstep(0., 0.12, flipU)*(1.-smoothstep(0.72, 0.95, flipU)) : 0.;   /* RELEASE-1 (C): over, shaken, put right */
    if(uk<1.5 || uk>2.5 && uk<3.5){ uw= uk>2.5 ? 1.4 : 1.; du=dome(tilt(p, uy, ci+uk*3.), ux, uw, uy); } else if(uk>1.5 && uk<2.5){ du=dome(tilt(p, uy, ci+uk*3.), ux, 1., uy); clear=1.; }
    else if(uk>3.5 && uk<4.5){ float hd=el(p, vec2(0., 0.88), vec2(0.32, 0.09)); if(face>0.5) hd=max(hd, -el(p, vec2(0., 0.862), vec2(0.17, 0.052))); gA=min(gA, hd); d=min(d, hd); }   /* a hood (its opening shows the face) */
    else if(uk>4.5 && uk<5.5){ gN=min(gN, seg(p, vec2(-0.52, 0.97), vec2(0.52, 0.97), 0.03)); d=min(d, gN); }   /* a newspaper over the head */
    gear(p, acc, face, ph, d); }
  else if(k<1.5){ d=min(figure(p, -0.3, ph, 0.07, 0., 0., 0., 0., 1.), figure(p, 0.3, ph+0.5, 0.07, 0., 0., 1., 1., 1.)); du=dome(tilt(p, uy, ci+uk*3.), ux, 1.25, uy); }
  else if(k<2.5){ d=person(p, -0.38, ph, 0.09, 0., 0., hasU);
    /* RELEASE-1 (A): THE DOG walks AHEAD of its walker along the walking direction as it shows on screen (gV.xy per metre; RAIN-5 drew it side-on,
       running sideways): its body from tail to head along that direction, four legs trotting, the tail up, the lead from the free hand to its collar */
    vec2 Wm=length(gV.xy)>1e-4 ? gV.xy : vec2(0.9, 0.), G=vec2(0.3, 0.)+Wm*1.15, Rr=G-Wm*0.3, Ff=G+Wm*0.3, by=vec2(0., 0.17); float tr=sin(ph*12.566);
    gDog=min(limb(p, Rr+by, Ff+by+vec2(0., 0.01), 0.048), limb(p, Ff+by+vec2(0., 0.035), Ff+by+vec2(0., 0.045)+Wm*0.13, 0.036));   /* body, head */
    for(int j=0;j<4;j++){ float fj=float(j), sd= mod(fj, 2.)<0.5 ? -0.07 : 0.07, al= fj<1.5 ? 0.25 : -0.25, sg= mod(fj+floor(fj/2.), 2.)<0.5 ? 1. : -1.;
      vec2 top=G+Wm*al+vec2(sd, 0.15), ft=G+Wm*(al+0.07*tr*sg)+vec2(sd, 0.004); gDog=min(gDog, limb(p, top, ft, 0.014)); }   /* legs, trotting in diagonal pairs */
    gDog=min(gDog, limb(p, Rr+by+vec2(0., 0.01), Rr+by+vec2(0., 0.09)-Wm*0.1, 0.012));   /* the tail */
    float lead=limb(p, vec2(-0.01, 0.37), Ff+by+vec2(0., 0.03), 0.004); d=min(min(d, gDog), lead); gN=min(gN, 1e3);
    cHand= hasU>0.5 ? -0.34 : 1e3; du=dome(tilt(p, uy, ci+uk*3.), -0.38+ux, 0.8, uy); }
  else if(k<3.5){ float pa=ph*6.2832;   /* RAIN-5c: a cyclist from behind (riding away) or the front: one wheel end-on, the rider over it, legs pedalling */
    d=abs(seg(p, vec2(0., 0.13), vec2(0., 0.33), 0.08))-0.03;   /* RAIN-10: the wheel end-on, a capsule's rim clear of the quad's foot */ d=min(d, el(p, vec2(0., 0.66), vec2(0.36, 0.16))); d=min(d, el(p, vec2(0., 0.88), vec2(0.21, 0.06)));
    d=min(d, min(el(p, vec2(-0.14, 0.42+0.07*sin(pa)), vec2(0.1, 0.13)), el(p, vec2(0.14, 0.42-0.07*sin(pa)), vec2(0.1, 0.13))));
    d=min(d, seg(p, vec2(-0.47, 0.6), vec2(0.47, 0.6), 0.025));
    if(face>0.5){ lamp=exp(-dot(p-vec2(0., 0.56), p-vec2(0., 0.56))/0.006); lampC=uHead; } else { lamp=exp(-dot(p-vec2(0., 0.44), p-vec2(0., 0.44))/0.005)*xtra; lampC=uNavR; } }
  else if(k<4.5){ d=person(p, 0., ph, 0.22, 0., 0.1, 0.); }
  else if(k>28.5 && k<29.5){   /* RELEASE-1 (C): THE CAT ON THE SILL of a lit window — a dark silhouette rimmed by the room's light behind it; c: state (0 sit, 1 wash, 2 walk,
       3 lie) + 4 facing left; ph: its progress, + 4 × (look + 1) (where it looks). The sprite: drawn 1.4 × a real cat (0.6 × 0.44 m of shapes over a sprite
       the room sizes 0.84 × 0.62 m) so it reads at a window's few pixels; the sill 0.1 m (shapes) above its foot */
    float sw=clamp(vSoft, 0.02, 0.6)*0.44, win=winOf()*mix(1., vFade, uWin), st=mod(code, 4.), dr= code>3.5 ? -1. : 1., u=fract(vK.y), lk=floor(vK.y)/4.-1.; vec2 m=vec2(p.x*0.3, p.y*0.44-0.1); float d=1e3, eye=0.;
    if(st<1.5){ float wash= st>0.5 ? 1. : 0., bob=wash*0.007*sin(u*90.); vec2 hc=vec2(lk*0.022+wash*0.012, 0.245+bob);
      d=min(elm(m, vec2(0., 0.075), vec2(0.085, 0.075)), elm(m, vec2(0., 0.14), vec2(0.058, 0.1))); d=min(d, length(m-hc)-0.05);
      d=min(d, min(elm(m, hc+vec2(-0.03, 0.043), vec2(0.015, 0.024)), elm(m, hc+vec2(0.03, 0.043), vec2(0.015, 0.024))));
      d=min(d, min(seg(m, vec2(0.07, 0.02), vec2(0.165, 0.008), 0.012), seg(m, vec2(0.165, 0.008), vec2(0.19, 0.045), 0.011)));
      if(wash>0.5) d=min(d, seg(m, vec2(0.025, 0.13), hc+vec2(0.032, -0.022), 0.014));
      eye=(1.-wash)*(1.-smoothstep(0.4, 0.8, abs(lk)))*step(0.06, fract(u*7.3))*(1.-smoothstep(0.004, 0.009, min(length(m-hc-vec2(-0.019, 0.006)), length(m-hc-vec2(0.019, 0.006))))); }
    else if(st<2.5){ float g=u*22.; vec2 hc=vec2(dr*0.16, 0.17); d=min(elm(m, vec2(0., 0.12), vec2(0.14, 0.055)), length(m-hc)-0.044);
      d=min(d, min(elm(m, hc+vec2(dr*0.012, 0.042), vec2(0.013, 0.022)), elm(m, hc+vec2(-dr*0.02, 0.038), vec2(0.013, 0.022))));
      for(int j=0;j<4;j++){ float fj=float(j), lx=(fj<1.5 ? 0.09 : -0.09)+(mod(fj, 2.)<0.5 ? 0.012 : -0.012), sg= mod(fj+floor(fj/2.), 2.)<0.5 ? 1. : -1.; d=min(d, seg(m, vec2(lx, 0.09), vec2(lx+dr*0.025*sin(g)*sg, 0.004), 0.011)); }
      d=min(d, min(seg(m, vec2(-dr*0.13, 0.13), vec2(-dr*0.19, 0.2), 0.012), seg(m, vec2(-dr*0.19, 0.2), vec2(-dr*0.17, 0.26), 0.011))); }
    else { vec2 hc=vec2(dr*0.12, 0.115); d=min(elm(m, vec2(0., 0.068), vec2(0.14, 0.066)), length(m-hc)-0.046);
      d=min(d, min(elm(m, hc+vec2(dr*0.012, 0.043), vec2(0.013, 0.022)), elm(m, hc+vec2(-dr*0.02, 0.04), vec2(0.013, 0.022)))); d=min(d, seg(m, vec2(-dr*0.13, 0.016), vec2(dr*0.08, 0.008), 0.012)); }
    float cov=smoothstep(sw, -sw, d), rim=smoothstep(-sw*1.8, -sw*0.4, d)*(1.-smoothstep(-sw*0.4, sw, d));
    vec3 c=vec3(0.018, 0.016, 0.018)+vec3(1., 0.7, 0.4)*rim*0.1+vec3(0.6, 0.66, 0.26)*eye*1.4; float al=max(cov, eye)*win*vK.w; gl_FragColor=vec4(c*al, al); return; }
  else if(k>26.5){   /* RAIN-6b: things on the facade opposite, drawn in its plane (the sprite spans their width along it; sub = its slope's step) —
       27 a café awning's scalloped fringe fluttering in Wave's wind; 28 a shop's roller shutter, half down (ph = how far down), at Late night all the way */
    float sw=clamp(vSoft, 0.02, 0.6), win=winOf()*mix(1., vFade, uWin), kk=sub/16.-0.5, yy=p.y-kk*p.x;
    vec3 col; float al;
    if(k<27.5){ float fl=uWind*0.16*sin(uTime*7.3+p.x*4.+code)+0.02*sin(uTime*1.7+code), lo=0.42+0.22*abs(sin((p.x*2.5+code*0.37)*3.1416))+fl;
      al=smoothstep(sw, -sw, max(lo-yy, yy-1.))*(1.-smoothstep(1.-max(sw*0.3, 0.015), 1., abs(p.x))); col= mod(floor((p.x+1.)*5.), 2.)<0.5 ? vec3(0.17, 0.05, 0.05) : vec3(0.26, 0.24, 0.2); col*=0.55+0.45*smoothstep(lo, 1., yy); }
    else { float down=fract(vK.y), top=1., edge=1.-down; al=(1.-smoothstep(0.97-max(sw*0.3, 0.015), 0.97, abs(p.x)))*smoothstep(sw, -sw, max(edge-yy, yy-top));
      col=vec3(0.13, 0.135, 0.14)*(0.75+0.25*step(0.5, fract(yy*26.))); col=mix(col, vec3(0.05), smoothstep(edge+0.03, edge, yy)); }
    gl_FragColor=vec4(col*al*win*vK.w, al*win*vK.w); return; }
  else if(k>23.5){   /* RAIN-6b (1): a VEHICLE's body (pure/vehicles.js) under its own lights: the sprite runs from its near face's foot up to its roof's far edge,
       the face below ph's share, the roof seen from above beyond it, wet (a sheen step brighter under a lamp) */
    float sw=clamp(vSoft, 0.02, 0.6), win=winOf()*mix(1., vFade, uWin), f=clamp(ph, 0.12, 0.95), sh=sub/8., ax=abs(p.x), q=clamp((p.y-f)/max(1.-f, 0.05), 0., 1.);
    vec3 col=vec3(0.); float al=0.;
    if(k<24.5){   /* RAIN-8 (3b) / RAIN-9 / RAIN-10: A CAR, CINEMATIC (the founder's pick) — soft, under the lamps' light, seen from the 8th floor by a film camera.
       RAIN-10: a car's own outline, not a box — the body narrowing with distance, rounder at its far end, its near wheels at the foot; on top the boot,
       the rear window, the roof, the windscreen and the bonnet (mirrored when it comes towards us), the cabin narrower than the body, the lamps' light on
       the wet roof and bonnet, reflections in the glass; its head and tail lights, their reflections and the headlights' pool come from the light layer */
      float ty=mod(code, 8.), cc=mod(floor(code/8.), 8.), towards=mod(floor(code/64.), 2.), asp=0.5*vAsp.x/max(vAsp.y, 1e-3), so=max(sw, 0.03), X=p.x*asp, Y=p.y;
      float bw=asp*mix(0.93, 0.82, clamp(Y, 0., 1.)), r=mix(min(0.07, bw*0.3), min(0.2, bw*0.55), smoothstep(0.35, 0.8, Y));
      vec2 bq=abs(vec2(X, Y-0.5))-vec2(bw-r, 0.49-r); float d=length(max(bq, 0.))+min(max(bq.x, bq.y), 0.)-r;
      float wx=asp*0.8; d=min(d, min(el(vec2(X, Y), vec2(-wx, 0.035), vec2(asp*0.13, 0.045)), el(vec2(X, Y), vec2(wx, 0.035), vec2(asp*0.13, 0.045))));   /* the near wheels */
      if(code>4095.5){ float yy=(p.y-0.5)*2.; d=length(max(abs(vec2(p.x, yy))-vec2(0.62, 0.68), 0.))-0.3; so=max(sw, 0.14); }   /* RAIN-9's box (the probes' CONTROL only) */
      float body=smoothstep(so, -so, d), u= towards>0.5 ? 1.-q : q, cab=1.-smoothstep(0.74*bw/asp, 0.84*bw/asp, ax);
      float rw0= ty<0.5 || ty>3.5 && ty<4.5 ? 0.2 : ty>4.5 ? 0.05 : 0.08, rw1=rw0+0.13, ws0= ty>4.5 && ty<5.5 ? 0.82 : 0.62, ws1=ws0+0.15;   /* sedans and the taxi a boot; vans and buses a long roof */
      float top=step(f, p.y), gl=top*cab*(smoothstep(rw0-0.02, rw0+0.02, u)*(1.-smoothstep(rw1-0.02, rw1+0.02, u))+smoothstep(ws0-0.02, ws0+0.02, u)*(1.-smoothstep(ws1-0.02, ws1+0.02, u)));
      float roof=top*cab*smoothstep(rw1, rw1+0.03, u)*(1.-smoothstep(ws0-0.03, ws0, u)), faceGl=(1.-top)*smoothstep(0.6*f, 0.7*f, p.y)*(1.-smoothstep(0.66, 0.76, ax));
      vec3 base=vcol(cc)*0.36+0.008; base*=mix(0.75, 1., top);   /* the near face a little darker than the top */
      float lit=exp(-pow(p.x/0.55, 2.))*(roof*0.9+top*(1.-cab*0.6)*exp(-pow((u-(towards>0.5 ? 0.12 : 0.9))/0.14, 2.))*0.7+top*0.18);
      vec3 col=base*(1.-0.2*roof)+vec3(1., 0.8, 0.56)*lit*(0.05+0.55*sh);
      float refl=exp(-pow((p.x+0.25)/0.35, 2.));
      col=mix(col, vec3(0.014, 0.016, 0.022)+vec3(0.62, 0.66, 0.74)*refl*(0.05+0.25*sh), max(gl, faceGl*0.9));
      col*=1.-0.55*(1.-top)*(1.-smoothstep(0.08*f, 0.22*f, p.y));   /* the bumper and the wheels in shadow */
      float tw=0.55+0.45*sin(uTime*2.7+code*1.3);
      col+=vec3(1., 0.9, 0.75)*(exp(-dot(p-vec2(0.55, f+(1.-f)*0.3), p-vec2(0.55, f+(1.-f)*0.3))/0.005)+exp(-dot(p-vec2(-0.45, f+(1.-f)*0.72), p-vec2(-0.45, f+(1.-f)*0.72))/0.003)*0.6)*sh*tw*0.8;   /* glints on the roof's edge */
      if(ty>5.5) col+=vec3(0.42, 0.3, 0.13)*smoothstep(0.3, 0.05, abs(p.x+0.72))*step(0.08, q)*step(q, 0.95)*0.8;   /* a bus's lit side, blurred to a band */
      if(ty>3.5 && ty<4.5) col+=vec3(1., 0.84, 0.5)*exp(-dot(vec2(p.x*1.4, (u-0.47)*(1.-f)*3.), vec2(p.x*1.4, (u-0.47)*(1.-f)*3.))/0.02)*top*0.9;   /* the taxi's roof light */
      col=mix(col, vec3(dot(col, vec3(0.33))), 0.2);
      if(uHalves>0.5) col= (towards>0.5 ? 1.-step(0.5, p.y) : step(0.5, p.y))>0.5 ? vec3(1., 0., 0.) : vec3(0., 1., 0.);   /* RELEASE-1 (B), the probes only: the front half red, the rear green */
      float al=body*0.92; gl_FragColor=vec4(col*al*win*vK.w, al*win*vK.w); return; }
    if(k<25.5) discard;   /* RAIN-10: the tram is drawn as a lit box of its own (TRAM_V / TRAM_F), never as a sprite here */
    else { float d2=min(min(seg(p, vec2(-0.45, 0.05), vec2(0.2, 0.5), 0.02), seg(p, vec2(0.2, 0.5), vec2(-0.3, 0.95), 0.02)), min(seg(p, vec2(-0.92, 0.95), vec2(0.32, 0.95), 0.018), seg(p, vec2(-0.75, 0.05), vec2(-0.15, 0.05), 0.03)));   /* the pantograph up to the wire; RAIN-10: its bar a capsule (a thin ellipse's soft edge ran far past its quad) */
      al=smoothstep(sw, -sw, d2); col=vec3(0.03); }
    gl_FragColor=vec4(col*al*win*vK.w, al*win*vK.w); return; }
  else if(k>22.5){   /* RAIN-5d: a delivery rider on a scooter, coming towards us: a small wheel, the rider, a helmet, the box behind, the headlamp */
    d=abs(seg(p, vec2(0., 0.1), vec2(0., 0.16), 0.06))-0.025;   /* RAIN-10: the small wheel likewise */ d=min(d, el(p, vec2(0., 0.5), vec2(0.34, 0.2))); d=min(d, el(p, vec2(0., 0.82), vec2(0.24, 0.08)));
    d=min(d, el(p, vec2(0., 0.32), vec2(0.18, 0.1))); d=min(d, seg(p, vec2(-0.47, 0.6), vec2(0.47, 0.6), 0.025)); da=el(p, vec2(0., 0.7), vec2(0.42, 0.16));
    lamp=exp(-dot(p-vec2(0., 0.4), p-vec2(0., 0.4))/0.005); lampC=uHead; }
  else if(k<5.5){ d=min(el(p, vec2(0., 0.45), vec2(0.45, 0.26)), el(p, vec2(0.02*sin(ph*6.2832), 0.8), vec2(0.28, 0.08))); }
  else if(k<6.5){ d=min(person(p, 0., ph, 0.08, 0., 0., 0.), seg(p, vec2(0.2, 0.63), vec2(0.88, 0.63), 0.02)); }   /* RAIN-10: the tray a capsule — as the handlebars, the hat's brim and the newspaper (a thin ellipse's soft edge ran far along it, past its quad) */
  else if(k<7.5){ d=el(p, vec2(0., 0.45), vec2(0.8, 0.4)); if(vK.y>=0.) d=min(d, el(p, vec2(0., 0.55+0.3*sin(ph*6.2832)), vec2(0.88, 0.12))); }   /* RAIN-10: the wing tips inside the quad with their soft edge */
  else if(k<8.5){ d=min(el(p, vec2(0., 0.4), vec2(0.7, 0.28)), min(el(p, vec2(0.7, 0.68), vec2(0.25, 0.18)), el(p, vec2(-0.8, 0.65), vec2(0.12, 0.35)))); }
  else if(k<9.5){ float a=ph*6.2832; vec2 q=mat2(cos(a), -sin(a), sin(a), cos(a))*(p-vec2(0., 0.5)); d=(abs(q.x)+abs(q.y*2.)-0.48)*0.4; }   /* RAIN-10: the leaf inside its quad as it turns */
  else if(k<10.5){ float m=smoothstep(1., 0.2, length((p-vec2(0., 0.5))/vec2(1., 0.5)))*winOf(); gl_FragColor=vec4(vec3(0.42, 0.44, 0.47)*m*vK.w, m*vK.w*0.6); return; }
  else if(k<11.5){ light=1.; d=abs(el(p, vec2(0., 0.5), vec2(1., 0.5)))-0.05; }
  else if(k<12.5){ light=1.; d=p.y<0.5 ? 1. : abs(el(p, vec2(0., 0.5), vec2(1., 0.5)))-0.08; }
  else if(k<13.5) discard;   /* RAIN-10: 13 (heads over the tram) retired — the tram draws its passengers inside its windows */
  else if(k<14.5){ vec2 q=p; d=person(vec2(q.x, q.y), -0.3, ph, 0.08, 0., 0., hasU); vec2 c=vec2((q.x-0.35)/0.62, q.y/0.62); d=min(d, figure(c, 0., fract(ph*1.4), 0.12, 0., 0., 0., 1., 0.62)); cHand= hasU>0.5 ? -0.26 : 1e3;   /* a child holding a hand */
    if(p.x>-0.1 && p.x<0.25) d=min(d, abs(p.y-0.42)-0.014); du=dome(tilt(p, uy, ci+uk*3.), -0.3+ux, 0.9, uy); }
  else if(k<17.5){ d=person(p, 0., ph, 0.05, 1., 0., 0.); float hg=el(p, vec2(xtra>0.5 ? -0.32 : 0.32, 0.58+0.05*sin(ph*6.2832)), vec2(0.09, 0.08)); gK=min(gK, hg); d=min(d, hg); }   /* talking: a gesturing hand */
  else if(k<18.5){   /* RAIN-5c: a small group of three walking together (1.5 m), a golf umbrella over the middle one */
    gRt=vRt*0.5; gRtL=gRt; gV.x*=2.;   /* RELEASE-1 (A): the group's frame is twice as wide */
    d=min(figure(vec2((p.x+0.64)*2., p.y*1.04), 0., ph, 0.09, 0., 0., 0., 1., 0.5), min(figure(vec2(p.x*2., p.y), 0., ph+0.31, 0.09, 0., 0., 1., 0., 0.5), figure(vec2((p.x-0.64)*2., p.y*1.08), 0., ph+0.63, 0.09, 0., 0., 0., 2., 0.5)));
    cHand=0.04; du=dome(vec2(p.x*2., p.y), ux, 1.35, uy)*0.5; }
  else if(k<19.5){ float sw=(ph-0.5)*0.6; vec2 q=p-vec2(sw*(1.-p.y), 0.); d=max(abs(q.x)-0.9*p.y, max(-p.y+0.02, p.y-0.98))*0.5; glowC= ci<0.5 ? uGarA : ci<1.5 ? uGarB : ci<2.5 ? uGarC : uGarD; }   /* a little flag of the bunting */
  else if(k<20.5){ float g=glyph(p, ci), board=el(vec2(p.x*0.5, p.y), vec2(0., 0.5), vec2(0.45, 0.45)); vec3 gc= ci>0.5 && ci<1.5 ? uCross : ci>3.5 || ci<0.5 ? uSignWarm : uSign;   /* a lit pictogram on its dark board */
    float sw=clamp(vSoft, 0.02, 0.6), win=winOf()*mix(1., vFade, uWin), core=smoothstep(sw, -sw, g), halo=smoothstep(0.35+sw, -sw, g)*0.35, bd=smoothstep(sw, -sw, board);
    if(ci>0.5 && ci<1.5){ vec2 q=vec2(p.x*0.5, p.y-0.5); float cy=mod(uTime+vK.z*0.0+p.x*0., 12.), r=length(q), an=atan(q.y, q.x);   /* RAIN-7: the pharmacy cross animates like an LED one — a pulse, a ring spreading out, a light running round */
      float pat= cy<4. ? 0.62+0.38*sin(uTime*4.) : cy<8. ? 0.3+0.7*smoothstep(0.32, 0., abs(fract(r*2.2-uTime*0.9)-0.5)) : 0.3+0.7*step(0.55, fract(an/6.2832+uTime*0.5)); core*=pat; halo*=0.55+0.45*pat; }
    vec3 c=vec3(0.02, 0.02, 0.025)*bd+gc*(core*1.4+halo*0.5); float al=max(bd, core)*win*vK.w; gl_FragColor=vec4(c*win*vK.w, al); return; }
  else if(k<21.5){ float sw=clamp(vSoft, 0.02, 0.6), win=winOf()*mix(1., vFade, uWin);   /* the vehicles' light: a dark housing, red over amber over green, the one on lit */
    vec2 bq=abs(vec2(p.x*0.2, p.y-0.5))-vec2(0.15, 0.45); float box=length(max(bq, 0.))+min(max(bq.x, bq.y), 0.)-0.04, on=ph>0.5 ? 0. : 1.; vec2 r1=vec2(p.x*0.2, p.y-0.78), g1=vec2(p.x*0.2, p.y-0.22);
    float lr=smoothstep(0.12+sw, 0.09-sw, length(r1)), lg=smoothstep(0.12+sw, 0.09-sw, length(g1));
    vec3 c=vec3(0.015)*smoothstep(sw, -sw, box)+uWalkR*lr*(0.15+1.4*on)+uWalkG*lg*(0.15+1.4*(1.-on)); float al=smoothstep(sw, -sw, box)*win*vK.w; gl_FragColor=vec4(c*win*vK.w, al); return; }
  else { float sw=clamp(vSoft, 0.02, 0.6), win=winOf()*mix(1., vFade, uWin), go=ph<0.5 ? 0. : 1.;   /* the pedestrian signal: a standing red figure, or a walking green one */
    vec2 bq=abs(vec2(p.x*0.42, p.y-0.5))-vec2(0.36, 0.46); float box=length(max(bq, 0.))+min(max(bq.x, bq.y), 0.)-0.04, f= go>0.5 ? person(vec2(p.x*2.2, (p.y-0.12)*1.35), 0., 0.2, 0.14, 0., 0., 0.)*0.45 : person(vec2(p.x*2.2, (p.y-0.12)*1.35), 0., 0., 0.1, 1., 0., 0.)*0.45;
    float fig=smoothstep(sw, -sw, f); vec3 fc= go>0.5 ? uWalkG : uWalkR; vec3 c=vec3(0.015)*smoothstep(sw, -sw, box)*(1.-fig)+fc*fig*1.5; float al=smoothstep(sw, -sw, box)*win*vK.w; gl_FragColor=vec4(c*win*vK.w, al); return; }
  float win=winOf(), fade=mix(1., vFade, uWin), sw=clamp(vSoft, 0.02, 0.6), kb=smoothstep(0.35, 0.9, vSoft), disc=1.-smoothstep(0.1, 1., length(vE*vAsp)/min(vAsp.x, vAsp.y));   /* the circle inside the quad's short side */   // RAIN-5b: never a visible quad edge;
  float m=mix(smoothstep(sw, -sw, d), disc*0.85, kb)*win*fade, mu=smoothstep(sw, -sw, du)*(1.-kb)*win*fade, ma=smoothstep(sw, -sw, da)*(1.-kb)*win*fade;   // RAIN-10: a blur wider than the thing makes it a round soft spot, never a square
  if(light>0.5){ gl_FragColor=vec4(vec3(0.6, 0.6, 0.62)*m*vK.w, m*vK.w*0.35); return; }
  if(k>18.5 && k<19.5){ gl_FragColor=vec4(glowC*0.55*m*vK.w, m*vK.w); return; }
  /* RELEASE-1 (A): a figure's parts each in their own colour, lit by the near lamps and the look's glow (a blur wider than the figure: its coat's colour) */
  float pc=1.-kb; vec3 body, oc, ol, os, oa, ob, oh, ok; outfit(code, wc, gWho, oc, ol, os, oa, ob, oh, ok);
  if(uOneCol>0.5){ ol=oc; os=oc; oa=oc; ob=oc; oh=oc; ok=oc; }   /* the probes' CONTROL: one colour per figure (RAIN-10) */
  if(gFig>0.5){ float cC=smoothstep(sw, -sw, gC)*pc, cL=smoothstep(sw, -sw, gL)*pc, cT=smoothstep(sw, -sw, gT)*pc, cS=smoothstep(sw, -sw, gS)*pc, cH=smoothstep(sw, -sw, gH)*pc,
      cK=smoothstep(sw, -sw, gK)*pc, cA=smoothstep(sw, -sw, gA)*pc, cB=smoothstep(sw, -sw, gB)*pc, cN=smoothstep(sw, -sw, gN)*pc, inP=max(max(max(cC, cL), max(cT, cS)), max(max(cH, cK), max(max(cA, cB), cN)));
    vec3 al=mix(oc, vec3(0.1, 0.085, 0.075), pc*(1.-inP));   /* what is not a part: the dog, the lead, a tray */
    float cG=smoothstep(sw, -sw, gDog)*pc; vec3 dogC= mod(code, 3.)<0.5 ? vec3(0.09, 0.07, 0.055) : mod(code, 3.)<1.5 ? vec3(0.32, 0.22, 0.13) : vec3(0.42, 0.4, 0.36);
    if(gV.y>=0.) al=mix(al, dogC, cG*(1.-inP));   /* the dog behind its walker (going away) … */
    al=mix(al, uOneCol>0.5 ? oc : vec3(0.06, 0.06, 0.068), cT*(1.-cC)); al=mix(al, ol, cL*(1.-cC)); al=mix(al, os, cS); al=mix(al, oh, cH); al=mix(al, ok, cK); al=mix(al, oa, cA); al=mix(al, ob, cB); al=mix(al, vec3(0.62, 0.6, 0.55), cN); if(gV.y<0.) al=mix(al, dogC, cG);   /* … or in front (coming towards us) */
    body=al*litBy(p.y);
    if(uk>5.5 && uk<6.5) body+=lampTone(uLampC)*(vW.y*0.5+0.05)*cC*exp(-pow((p.x+0.15)/0.18, 2.))*smoothstep(0.3, 0.75, p.y)*0.3; }   /* a raincoat's wet shine */
  else if(k>8.5 && k<9.5) body= ci<0.5 ? vec3(0.1, 0.06, 0.03) : vec3(0.32, 0.31, 0.29);
  else if(k>2.5 && k<3.5 || k>4.5 && k<5.5 || k>22.5) body=oc*0.75*litBy(p.y);   /* the cyclist, the seated, the rider: in their coat */
  else body=vec3(0.025, 0.022, 0.03);
  vec3 U0= uk<0.5 ? vec3(0.05, 0.05, 0.06) : uk>2.5 && uk<3.5 ? mix(wUmb(uci), vec3(0.78, 0.78, 0.76), cPan) : uk>1.5 && uk<2.5 ? vec3(0.72, 0.74, 0.78) : wUmb(uci);   /* a golf umbrella's panels alternate */
  vec3 U=U0*(1.-0.45*cFlip);   /* inside out: its underside, darker */
  U=U*litBy(1.)*(1.-0.45*cRib*pc)*(1.-0.3*cRim*pc)*(0.85+0.15*cSp)+lampTone(uLampC)*(vW.y*0.6+0.06)*exp(-pow((cTo-0.45)/0.25, 2.))*smoothstep(-0.2, 0.8, cSp)*smoothstep(0.2, -0.6, cDQ.x)*0.35*pc;   /* the ribs, the rim's shade, the wet top's sheen (the far upper side) */
  float ua= clear>0.5 ? 0.35 : 1.; vec3 col=mix(body, wAcc(mod(uci+2., 8.))*litBy(p.y), ma); col=mix(col, U, mu*ua);   /* RELEASE-1 (A): seen from above, the canopy hides the head (it showed through at 40 %) */ float a=max(max(m, ma), mu*ua)*vK.w;
  col=col*a+lampC*lamp*1.6*win*fade*vK.w;
  /* RELEASE-1 (A): ON THE WET STREET — a soft contact shadow under a person (the ground's ellipse: the look-down angle squashes it) and the person's dim
     reflection running down from the feet, rippled by the rain; under the figure, faded to nothing well inside the quad's lower reach */
  if(gFig>0.5){ float wd= k>0.5 && k<2.5 || k>13.5 && k<14.5 || k>17.5 && k<18.5 ? 0.8 : 0.45, sh=exp(-pow(p.x/wd, 2.)-pow(p.y/max(wd*gRt*gV.z+0.012, 0.012), 2.)), rf= p.y<0. ? smoothstep(wd, wd*0.4, abs(p.x))*smoothstep(-0.27, -0.03, p.y)*(0.7+0.3*sin(p.y*70.+uTime*2.6+p.x*9.)) : 0.;
    float ga=(sh*0.3+rf*0.14)*pc*win*fade*vK.w; vec3 gc=oc*litBy(0.4)*0.6*rf*0.14*pc*win*fade*vK.w; col+=gc*(1.-a); a+=ga*(1.-a); }
  gl_FragColor=vec4(col, a); }
/* RAIN-10: every item behind the baked city's nearer things (facade things: only what stands clearly before their facade) */
void main(){ main0(); float k=floor(vK.x+0.5); gl_FragColor*=seen(k>18.5 && k<20.5 || k>26.5 ? 0.035 : vQ.y<0.02 ? 0.04 : 0.012); }   /* RELEASE-1 (A): the shadow and reflection lie on the nearer ground just below the feet */`;
/* RAIN-10's tram as a lit box (TRAM_V / TRAM_F): archive/rain-tram-box-RAIN10.js — RELEASE-1 (B) draws the tram in 3D (VEH_V / VEH_F) */
/* RAIN-8: our own window (RAIN-7's FRAME_F) removed — archive/rain-frame-RAIN7.js, not loaded */

/* RELEASE-1 (B): THE VEHICLES IN 3D (pure/vehmesh.js) — each corner through the camera's own law (project(): the bend, the basis, the division by the
   distance along the view: the GPU divides, so every face's perspective is exact), drawn into the cars' layer N times, each copy shifted inside the
   focus blur's disc (uJit × radAt of the vehicle's depth) and added at weight uW: the vehicles get the city's depth of field and soft edges, never a quad.
   (Revised the same day: copies shifted across a wide blur showed as stripes — now each vehicle is drawn into the blur LEVEL its depth asks for, the
   two nearest levels weighted (aMore.w), each level at its own resolution and softened like the city's copies; only the sharp level takes the
   0.7-px copies, for smooth edges.)
   aPlace: x, the nearer end's z, dir (+1 away from us, −1 towards), length; aLook: paint, type (7 = the tram), the lamps' half spacing, the lamps' height;
   aMore: seed, flags (1 the cabin lit), half width, 0. Local s runs from the rear to the front, so the front faces the way it goes */
const glf=v=>(+v).toFixed(5), DEPTH_GLSL=`float depthLaw(float d){ ${DEPTH.anchors.map((a, i)=>i ? `if(d<=${glf(a[0])}) return mix(${glf(DEPTH.anchors[i-1][1])}, ${glf(a[1])}, log(d/${glf(DEPTH.anchors[i-1][0])})/${glf(Math.log(a[0]/DEPTH.anchors[i-1][0]))}); ` : `if(d<=${glf(a[0])}) return ${glf(a[1])}*max(d, 0.)/${glf(a[0])}; `).join('')}return min(0.99, ${glf(DEPTH.anchors[DEPTH.anchors.length-1][1])}+0.03*log(d/${glf(DEPTH.anchors[DEPTH.anchors.length-1][0])})); }`;
const BEND_GLSL=`float bendX(float z){ return z<=${glf(BEND.z0)} ? 0. : z<=${glf(BEND.z1)} ? ${BEND.k.toExponential(6)}*(z-${glf(BEND.z0)})*(z-${glf(BEND.z0)}) : ${BEND.k.toExponential(6)}*${glf(BEND.z1-BEND.z0)}*(${glf(BEND.z1-BEND.z0)}+2.*(z-${glf(BEND.z1)})); }`;
export const VEH_V=`attribute float aPart; attribute vec4 aPlace, aLook, aMore; uniform vec2 uTan, uJit; uniform vec4 uFoc; uniform vec3 uCamP, uCr, uCu, uCf; uniform float uAA, uHalves;
varying vec3 vLoc, vNl, vN, vW; varying float vPart, vDep; varying vec4 vLook, vPlace, vMore; varying vec2 vTrue; ${RAD} ${DEPTH_GLSL} ${BEND_GLSL}
void main(){ float dir=aPlace.z>=0. ? 1. : -1., L=aPlace.w; vec3 w=vec3(aPlace.x+position.x*dir, position.y, dir>0. ? aPlace.y+position.z : aPlace.y+L-position.z);
  vNl=normal; vN=vec3(normal.x*dir, normal.y, normal.z*dir); vW=w; vLoc=position; vPart=aPart; vLook=aLook; vPlace=aPlace; vMore=aMore;
  vec3 v=w+vec3(bendX(w.z), 0., 0.)-uCamP; float xc=dot(v, uCr), yc=dot(v, uCu), zc=max(dot(v, uCf), 0.05);
  float dc=depthLaw(length(vec3(aPlace.x, 1., aPlace.y+L*0.5)+vec3(bendX(aPlace.y+L*0.5), 0., 0.)-uCamP)); vDep=depthLaw(length(v)); vec2 j=uJit*uAA;   /* the sharp level's copies: 0.7 px apart — smooth edges (the blur is the levels', rain.js carsPass) */ vTrue=vec2(xc, yc)/zc;
  float n=1., f=3000.; gl_Position=vec4((xc+j.x*zc)/uTan.x, (yc+j.y*zc)/uTan.y, zc*(f+n)/(f-n)-2.*f*n/(f-n), zc); if(uHalves>0.5 && abs(aPart-9.)>0.5) gl_Position=vec4(2., 2., 2., 1.); }`;
const LAMPS_GLSL=LAMP_ROWS.map(([x, ph, y])=>`{ float z0=${glf(8+ph*STREET.lampEvery)}, k=floor((P.z-z0)/${glf(STREET.lampEvery)}); for(int j=0;j<2;j++){ vec3 l=vec3(${glf(x)}, ${glf(y)}, z0+(k+float(j))*${glf(STREET.lampEvery)})-P; float d2=dot(l, l); l*=inversesqrt(d2); float a=1./(1.+d2*0.016); d+=a*max(dot(N, l), 0.); sp+=a*pow(max(dot(N, normalize(l+V)), 0.), sh); } }`).join(' ');
export const VEH_F=`precision highp float; varying vec3 vLoc, vNl, vN, vW; varying float vPart, vDep; varying vec4 vLook, vPlace, vMore; varying vec2 vTrue;
uniform vec3 uCamP, uAmb, uLampC, uHead, uTail, uHoney, uAmber; uniform float uLamp, uW, uOccl, uHalves, uTime, uStream; uniform sampler2D uDepthMap; uniform vec2 uExt;
vec3 lampTone(vec3 c){ if(uLamp==0.) return c; float L=dot(c, vec3(0.3, 0.5, 0.2)); return uLamp<0. ? mix(c, L*vec3(1.38, 0.8, 0.38)*0.82, -uLamp) : mix(c, L*vec3(0.92, 1.0, 1.12)*1.25, uLamp); }
${tabV('vPaint', VEH_PAINT)}
vec3 cabOf(float t){ ${VEH.types.map((T, i)=>`if(t<${i}.5) return vec3(${glf(VEH3.shape[i].belt*T.h)}, ${glf((VEH3.shape[i].rr+VEH3.shape[i].rf)/2*T.len)}, ${glf(VEH3.shape[i].rf*T.len)}); `).join('')}return vec3(9.); }   /* RELEASE-1 (C): each type's beltline, B-pillar and windscreen top */
vec3 cabZ(float t){ ${VEH.types.map((T, i)=>`if(t<${i}.5) return vec3(${glf(Math.max(0.02, VEH3.shape[i].rb)*T.len)}, ${glf(VEH3.shape[i].rr*T.len)}, ${glf(VEH3.shape[i].ws*T.len)}); `).join('')}return vec3(-9.); }   /* RELEASE-1 (night): the rear window's base, the roof's rear, the windscreen's base (along the car, from its tail) */
float h1(float n){ return fract(sin(n*127.1)*43758.5453); }
float bx(vec2 p, vec2 a, vec2 b, float w){ vec2 s=smoothstep(a-w, a+w, p)*(1.-smoothstep(b-w, b+w, p)); return s.x*s.y; }
/* the street lamps' light at P (normal N, towards the eye V): the two nearest of each row; sp their highlight (shininess sh) */
float lampsAt(vec3 P, vec3 N, vec3 V, float sh, out float sp){ float d=0.; sp=0.; ${LAMPS_GLSL} return d; }
void main(){ vec3 N=normalize(vN), V=normalize(uCamP-vW), lc=lampTone(uLampC); float part=floor(vPart+0.5), ty=floor(vLook.y+0.5), L=vPlace.w, s=vLoc.z, y=vLoc.y, x=vLoc.x, ax=abs(x), fw=max(fwidth(s), 1e-4)*1.5;
  float fr=0.04+0.96*pow(1.-max(dot(N, V), 0.), 5.), sp, df=lampsAt(vW, N, V, part>0.5 && part<1.5 ? 140. : 60., sp);
  vec3 sky=mix(uAmb*0.12+vec3(0.012, 0.014, 0.022), uAmb*0.32, 0.5-0.5*N.y), amb=mix(uAmb*0.34, uAmb*0.24+vec3(0.02, 0.022, 0.03), smoothstep(-0.2, 0.9, N.y));   /* the city's night glow on what faces up, the lit wet street's warmer glow from below and the sides */
  vec3 col=vec3(0.); float al=1.;
  /* RELEASE-1 (night): the shell's GLASS by its place on the car, not its slope (the smooth shading made part of the windscreen read as bonnet: the taxi's
     yellow windscreen): above the beltline, the rear window [rear base … roof's rear], the side windows [roof's rear … roof's front] on the sides (the roof
     between them paint), the windscreen [roof's front … its base]; the pillars between the panes paint */
  vec3 cab=cabOf(ty), cz=cabZ(ty); float above=step(cab.x+0.035, y), side=step(0.42, abs(vNl.x)), gls=0.;
  if(part<0.5 && ty<6.5 && above>0.5){ if(s>=cz.x && s<cz.y) gls=1.; else if(s>=cz.y && s<cab.z) gls=side; else if(s>=cab.z && s<cz.z) gls=1.;
    if(side>0.5 && ty<5.5 && (abs(s-cab.y)<0.06 || abs(s-cz.y)<0.05 || abs(s-cab.z)<0.05)) gls=0.; }   /* the B-, C- and A-pillars */
  if(gls>0.5) part=1.;
  if(part<0.5 || (part>0.5 && part<1.5 && N.y>0.8)){   /* PAINT, wet: its colour in the lamps' light, a clear coat's highlights and the sky in it */
    vec3 alb= ty>3.5 && ty<4.5 ? ${hexV(TAXI_PAINT)} : ty>5.5 && N.y>0.8 ? vec3(0.6, 0.61, 0.62) : vPaint(floor(vLook.x+0.5));   /* a bus's roof light grey */
    col=alb*(amb+lc*df*0.85)+lc*sp*(0.35+0.9*fr)+sky*fr*0.9;
    if(abs(vNl.z)>0.55 && part<0.5){ float front=step(0., vNl.z), lx=vLook.z, ly=vLook.w, lmp=bx(vec2(ax, y), vec2(lx-0.17, ly-0.08), vec2(lx+0.13, ly+0.08), 0.015);   /* the lamps on the ends: white ahead, red behind; a dark grille, a pale plate */
      col=mix(col, vec3(0.025), front*bx(vec2(ax, y), vec2(0., ly-0.16), vec2(lx-0.24, ly+0.05), 0.02)); col=mix(col, vec3(0.28, 0.28, 0.26)*(amb+lc*df), bx(vec2(ax, y), vec2(0., ly-0.27), vec2(0.26, ly-0.15), 0.01));
      col=mix(col, front>0.5 ? uHead*1.7 : uTail*1.25*(1.+1.4*step(1.5, vMore.y)), lmp); } }   /* braking: the tail lamps brighter */
  else if(part<1.5){   /* GLASS: dark, the sky and the lamps mirrored in it; a lit cabin (a bus, a taxi's open door) glows warm */
    float lit= ty>5.5 ? 1. : mod(vMore.y, 2.); col=vec3(0.012, 0.014, 0.018)+sky*fr*1.6+lc*sp*1.4*(0.3+fr)+uHoney*0.5*lit*smoothstep(0.3, 0.6, abs(N.x));
    if(ty>5.5 && abs(vNl.x)>0.5){ float m=fract(s/1.25); col=mix(col, vPaint(floor(vLook.x+0.5))*(amb+lc*df), 1.-smoothstep(0.05, 0.05+fw, min(m, 1.-m))); } }   /* a bus's window posts */
  else if(part<2.5) col=vec3(0.02)*(1.+amb*4.)+lc*sp*0.08;   /* tyres */
  else if(part<3.5) col=vec3(0.3, 0.31, 0.33)*(amb+lc*df*0.8)+lc*sp*0.6;   /* RELEASE-1 (C): the wheels' light rims */
  else if(part<5.5) col=vec3(0.03)*(1.+amb*3.)+lc*sp*0.1;   /* trim, bogies */
  else if(part<6.5) col=uAmber*(0.9+0.25*smoothstep(0.5, 1., N.y));   /* the taxi's lit roof sign */
  else if(part<9.5){ float r=max(ax/max(vMore.z+0.35, 0.1), abs(s-L*0.5)/(L*0.5+0.35)); al=0.55*(1.-smoothstep(0.55, 1., r)); col=vec3(0.); }   /* the soft shadow under it */
  else if(part<10.5){   /* THE TRAM's body: a light livery that reads from above — cream, a deep red skirt; lit windows with people; the cabs; the roof */
    vec3 cream=vec3(0.8, 0.76, 0.64), red=vec3(0.52, 0.1, 0.09), roof=vec3(0.56, 0.57, 0.58); float sec= s<${glf(VEH3.tram.sec[1]+VEH3.tram.gap*0.5)} ? 0. : 1., s0= sec<0.5 ? 0. : ${glf(VEH3.tram.sec[1]+VEH3.tram.gap)}, sl=s-s0;
    if(vNl.y>0.55){ col=roof*(amb+lc*df*0.9)+lc*sp*(0.4+fr)+sky*fr*0.7; }
    else if(vNl.y>0.2){ col=cream*(amb+lc*df*0.9)+lc*sp*0.3; col=mix(col, uHoney*0.75, 0.55*step(0.7, sl)*step(sl, ${glf(VEH3.tram.sec[1]-0.7)})); }   /* the roof's shoulders: the upper windows' warm light seen from above */
    else if(abs(vNl.x)>0.6){ float P0=1.42, n=floor((sl-0.7)/P0), xx=sl-0.7-n*P0, door=step(0.72, h1(n+sec*17.+vMore.x*3.1))*step(1., n)*step(n, 7.), w0=${glf(VEH3.tram.win[0])}, w1=${glf(VEH3.tram.win[1])};
      col= y<0.95 ? red : cream; col=col*(amb+lc*df*0.9)+lc*sp*(0.25+0.7*fr)+sky*fr*0.5;
      float pane=bx(vec2(xx, y), vec2(0.1, door>0.5 ? 0.5 : w0), vec2(P0-0.1, w1), fw)*step(0., sl-0.7)*step(sl, ${glf(VEH3.tram.sec[1]-0.7)});
      float q=h1(n*3.7+sec*11.+floor(uTime/90.)+vMore.x), cx=0.3+0.45*h1(n*5.3+1.+sec), st=step(0.6, q), sit=step(0.25, q)*(1.-st);   /* someone standing, someone sitting, or nobody (they change at the stops) */
      vec2 pq=vec2(xx/P0, y); float who=max(st*max(1.-smoothstep(0.85, 1.1, length((pq-vec2(cx, 2.02))/vec2(0.08, 0.13))), 1.-smoothstep(0.85, 1.1, length((pq-vec2(cx, 1.6))/vec2(0.17, 0.36)))),
        sit*max(1.-smoothstep(0.85, 1.1, length((pq-vec2(cx, 1.68))/vec2(0.075, 0.12))), 1.-smoothstep(0.85, 1.1, length((pq-vec2(cx, 1.36))/vec2(0.16, 0.22)))));
      col=mix(col, mix(uHoney*(0.85+0.4*smoothstep(1.2, 2.5, y))+lc*sp*0.3, vec3(0.07, 0.05, 0.04), who*0.9), pane); }
    else { float front=step(0., vNl.z)*step(${glf(VEH3.tram.len*0.5)}, s); col= y<0.95 ? red : cream; col=col*(amb+lc*df*0.9)+lc*sp*0.3;   /* the cab at each end: the windscreen, the amber destination band, the lamps */
      float ws=bx(vec2(ax, y), vec2(-1., 1.18), vec2(1.08, 2.62), 0.02), dest=bx(vec2(ax, y), vec2(-1., 2.7), vec2(0.82, 3.0), 0.015), dots=0.7+0.3*step(0.5, fract(x*10.))*step(0.5, fract(y*10.));
      col=mix(col, vec3(0.015, 0.018, 0.024)+sky*fr*1.5+uHoney*0.08*smoothstep(1.2, 2.6, y), ws); col=mix(col, uAmber*1.3*dots, dest);
      col=mix(col, front>0.5 ? uHead*1.8 : uTail*1.3, bx(vec2(ax, y), vec2(0.66, 0.78), vec2(1.0, 1.0), 0.02)); } }
  else if(part<11.5){ float m=fract(s*6.); col=vec3(0.035)*(0.7+0.6*smoothstep(0.2, 0.5, m)*(1.-smoothstep(0.5, 0.8, m)))*(1.+amb*3.); }   /* the bellows' folds */
  else if(part<12.5) col=vec3(0.035)+lc*sp*0.5+sky*fr*0.4;   /* the pantograph: dark metal, catching the lamps */
  else if(part>13.5){   /* RELEASE-1 (C, night): A KERB'S STREAM — dark running water, the lamps mirrored sharp in it, highlights flowing along (uStream: the rain's strength) */
    float e=1.-smoothstep(0.3, 0.5, abs(x)/max(vMore.z, 0.05)), fl=s+vPlace.y, w1=sin(fl*5.3-uTime*3.4+sin(fl*1.7)*2.)*0.5+0.5, w2=sin(fl*11.-uTime*6.1+x*9.)*0.5+0.5, glint=pow(w1*w2, 3.);
    float sp2, d2=lampsAt(vW, vec3(0., 1., 0.), V, 420., sp2); col=vec3(0.012, 0.014, 0.018)+lc*sp2*2.6+lc*(0.08+d2*0.5)*glint*1.4+sky*0.4; al=e*uStream*(0.55+0.45*glint); }
  else col=vec3(0.32)*(amb+lc*df*0.8)+lc*sp*0.3;   /* roof equipment */
  if(uHalves>0.5){ col= s>L*0.5 ? vec3(1., 0., 0.) : vec3(0., 1., 0.); al=1.; }   /* the probes only: the body's FOOTPRINT on the road (its shadow quad, alone: VEH_V drops the rest) — its front half red, its rear half green */
  if(uOccl>0.5){ float bd=texture2D(uDepthMap, clamp(vTrue/uExt*0.5+0.5, 0., 1.)).r; al*=1.-smoothstep(0.012, 0.03, vDep-bd); }   /* the baked city's nearer things (a trunk, a crown, a lamp post) hide it */
  gl_FragColor=vec4(col*al, al)*uW*vMore.w; }`;
/* RELEASE-1 (B): the cars' layer laid over the view (premultiplied) */
export const VEHCOMP_F=`precision highp float; uniform sampler2D uT0, uT1, uT2, uT3; varying vec2 vUv;
void main(){ vec4 c=texture2D(uT3, vUv); vec4 b=texture2D(uT2, vUv); c=b+c*(1.-b.a); b=texture2D(uT1, vUv); c=b+c*(1.-b.a); b=texture2D(uT0, vUv); gl_FragColor=b+c*(1.-b.a); }`;   /* the levels laid far-blurred first */
