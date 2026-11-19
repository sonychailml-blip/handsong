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
/* small fixes (2026-11-17): THE MIST'S SOFT COPY STARTS WITH A TRUE 4 × 4 BOX — four bilinear taps one full-size texel off the quarter texel's centre, each
   averaging 2 × 2: a far car's light (2–3 px) is never missed or gridded by sparse taps (the old first pass sampled the full picture 4.8 px apart) */
export const DOWN_F=`precision highp float; uniform sampler2D uTex; uniform vec2 uTexel; varying vec2 vUv;
void main(){ vec3 c=texture2D(uTex, vUv+uTexel*vec2(-1., -1.)).rgb+texture2D(uTex, vUv+uTexel*vec2(1., -1.)).rgb+texture2D(uTex, vUv+uTexel*vec2(-1., 1.)).rgb+texture2D(uTex, vUv+uTexel*vec2(1., 1.)).rgb;
  gl_FragColor=vec4(c*0.25, 1.); }`;
/* the blur radius (view-angle units) of a thing at depth d: uFoc = (focus depth, K, the widest radius) */
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
uniform sampler2D uCrown; uniform vec2 uCExt; uniform float uSway;   /* RAIN-7: the crowns' mask (bake space) and how far they sway (view units; 0: still) */
${RAD}
${SKY_GLSL}
void main(){ vec2 uv=vUv; if(uSway>0.){ vec2 pp=(vUv*2.-1.)*uTan, cq=clamp(pp/uCExt*0.5+0.5, 0., 1.); float m=texture2D(uCrown, cq).r;   /* RAIN-7: the crowns sway — their leaves moving within each crown, the edges held */
    if(m>0.){ vec2 o=uSway*m*vec2(sin(uTime*1.3+pp.x*23.+pp.y*11.)+0.5*sin(uTime*2.9+pp.x*57.), 0.35*sin(uTime*1.7+pp.x*31.)); uv+=o/uTan*0.5; } }
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
void main(){ if(vKind>2.5){ vec2 u=vP/max(vH, vec2(1e-5)); float y=0.5-0.5*u.y, w=0.1+0.9*y, m=smoothstep(w, w*0.45, abs(u.x))*smoothstep(1., 0.8, abs(u.y))*(1.-0.55*y);   /* RAIN-7: a lamp's cone, the drops lit falling through it */
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
export const LIFE_V=`attribute vec4 aRect, aK; attribute float aDep; uniform vec2 uTan; uniform vec4 uFoc; uniform float uPx;
varying vec2 vQ, vE; varying vec4 vK; varying float vSoft, vFade; ${RAD}
void main(){ float R=radAt(aDep), pad=R+1.5/uPx; vec2 hs=aRect.zw+pad, c=vec2(aRect.x, aRect.y+aRect.w), P=c+position.xy*hs; vE=position.xy; vFade=min(1., (aRect.z*aRect.w)/max(1e-12, hs.x*hs.y)*1.6);
  vQ=vec2((P.x-aRect.x)/max(aRect.z, 1e-6), (P.y-aRect.y)/max(2.*aRect.w, 1e-6)); vK=aK; vSoft=(R+0.8/uPx)/max(2.*aRect.w, 1e-6);
  gl_Position= aK.w>0.003 ? vec4(P/uTan, 0., 1.) : vec4(2., 2., 2., 1.); }`;
export const LIFE_F=`precision highp float; varying vec2 vQ, vE; varying vec4 vK; varying float vSoft, vFade; uniform float uWin;
uniform vec3 uGarA, uGarB, uGarC, uGarD, uSign, uSignWarm, uCross, uWalkR, uWalkG, uNavR, uHead;   // RAIN-5c: the furniture's lights (tokens)
float el(vec2 p, vec2 c, vec2 r){ return (length((p-c)/r)-1.)*min(r.x, r.y*2.); }
float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 e=b-a, q=p-a; float t=clamp(dot(q, e)/dot(e, e), 0., 1.); return length(q-e*t)-w; }
/* RAIN-5c: a person seen from the front or the back (the street runs away from us) at ox: the swinging leg's foot lifts (heel, then toe), the hips
   sway over the standing leg, the body bobs twice a step, the arms swing against the legs (the one forward looks shorter); with an umbrella one arm
   holds its handle steady at the middle. st 1 = standing; bend = a stoop; sw = the swing's size */
float person(vec2 p, float ox, float ph, float sw, float st, float bend, float umb){ float a=ph*6.2832, s=sin(a)*(1.-st), k=sw/0.1, sway=0.03*s*k, bob=0.014*(1.-abs(cos(a)))*(1.-st)*k;
  vec2 q=p-vec2(sway+bend*(p.y-0.3)*0.5, bob);
  float d=min(el(q, vec2(ox, 0.53), vec2(0.38, 0.24)), el(q, vec2(ox+bend*0.12, 0.865), vec2(0.24, 0.065)));
  d=min(d, el(q, vec2(ox, 0.765), vec2(0.17, 0.035)));
  float lL=max(0., s)*0.075*k, lR=max(0., -s)*0.075*k;
  d=min(d, min(el(q, vec2(ox-0.12, 0.16+lL*0.7), vec2(0.11, 0.155-lL*0.6)), el(q, vec2(ox+0.12, 0.16+lR*0.7), vec2(0.11, 0.155-lR*0.6))));
  d=min(d, min(el(q, vec2(ox-0.12-0.02*lL, 0.014+lL), vec2(0.1+0.025*(1.-lL*12.), 0.018)), el(q, vec2(ox+0.12+0.02*lR, 0.014+lR), vec2(0.1+0.025*(1.-lR*12.), 0.018))));
  float aL=max(0., -s)*k, aR=max(0., s)*k;
  d=min(d, el(q, vec2(ox-0.37, 0.5+0.035*aL), vec2(0.075, 0.17-0.045*aL)));
  if(umb>0.5) d=min(d, seg(q, vec2(ox+0.3, 0.68), vec2(ox+0.05, 0.84), 0.06)); else d=min(d, el(q, vec2(ox+0.37, 0.5+0.035*aR), vec2(0.075, 0.17-0.045*aR)));
  return d; }
/* RAIN-6b (RAIN-6c's rest): an umbrella leans into Wave's wind about its handle's top, gusting (each its own phase) */
uniform float uWind, uTime;
vec2 tilt(vec2 p, float y, float k){ if(uWind<=0.) return p; float a=-uWind*(0.32+0.14*sin(uTime*2.3+k*1.7)), c=cos(a), s=sin(a); vec2 q=p-vec2(0., y*0.6); return vec2(c*q.x-s*q.y, s*q.x+c*q.y)+vec2(0., y*0.6); }
float dome(vec2 p, float ox, float w, float y){ return p.y<y ? 1. : el(p, vec2(ox, y), vec2(w*0.9, 0.17)); }
vec3 cloth(float i){ return i<0.5 ? vec3(0.05, 0.05, 0.06) : i<1.5 ? vec3(0.05, 0.07, 0.14) : i<2.5 ? vec3(0.1, 0.11, 0.06) : i<3.5 ? vec3(0.17, 0.05, 0.06) : i<4.5 ? vec3(0.2, 0.15, 0.09) : i<5.5 ? vec3(0.11, 0.11, 0.12) : i<6.5 ? vec3(0.04, 0.12, 0.12) : vec3(0.2, 0.16, 0.05); }
vec3 vcol(float i){ return i<0.5 ? vec3(0.06, 0.065, 0.07) : i<1.5 ? vec3(0.22, 0.23, 0.24) : i<2.5 ? vec3(0.04, 0.06, 0.12) : i<3.5 ? vec3(0.16, 0.04, 0.045) : i<4.5 ? vec3(0.2, 0.17, 0.12) : i<5.5 ? vec3(0.02, 0.02, 0.025) : i<6.5 ? vec3(0.3, 0.31, 0.32) : vec3(0.04, 0.09, 0.07); }   /* RAIN-6b: the cars' muted colours */
vec3 ucol(float i){ return i<0.5 ? vec3(0.2, 0.03, 0.04) : i<1.5 ? vec3(0.24, 0.18, 0.03) : i<2.5 ? vec3(0.03, 0.05, 0.13) : vec3(0.04, 0.13, 0.07); }
/* a lit pictogram (no text): 0 a coffee cup with steam, 1 a pharmacy cross, 2 scissors, 3 a key, 4 a croissant — its glass at the sign's middle */
float glyph(vec2 p, float g){ vec2 q=vec2(p.x*0.5, p.y-0.5);   /* a square sign: x in the sprite's half-widths → y units */
  if(g<0.5) return min(min(el(q, vec2(-0.06, -0.08), vec2(0.42, 0.28)), abs(el(q, vec2(0.42, -0.06), vec2(0.15, 0.12)))-0.05), min(seg(q, vec2(-0.2, 0.22), vec2(-0.12, 0.38), 0.035), seg(q, vec2(0.06, 0.22), vec2(0.14, 0.38), 0.035)));
  if(g<1.5) return min(abs(q.x)-0.14+max(0., abs(q.y)-0.4)*9., abs(q.y)-0.14+max(0., abs(q.x)-0.4)*9.);
  if(g<2.5) return min(min(abs(el(q, vec2(-0.25, -0.25), vec2(0.15, 0.13)))-0.04, abs(el(q, vec2(0.25, -0.25), vec2(0.15, 0.13)))-0.04), min(seg(q, vec2(-0.18, -0.15), vec2(0.22, 0.4), 0.035), seg(q, vec2(0.18, -0.15), vec2(-0.22, 0.4), 0.035)));
  if(g<3.5) return min(abs(el(q, vec2(-0.3, 0.), vec2(0.2, 0.2)))-0.05, min(seg(q, vec2(-0.1, 0.), vec2(0.42, 0.), 0.045), min(seg(q, vec2(0.3, 0.), vec2(0.3, -0.13), 0.04), seg(q, vec2(0.18, 0.), vec2(0.18, -0.1), 0.04))));
  vec2 c0=vec2(0., 0.16); float cr=max(el(q, vec2(0., -0.02), vec2(0.42, 0.3)), -el(q, c0, vec2(0.3, 0.24))), gr=min(seg(q, c0, c0+vec2(-0.33, -0.36), 0.018), min(seg(q, c0, c0+vec2(0., -0.5), 0.018), seg(q, c0, c0+vec2(0.33, -0.36), 0.018)));
  return max(cr, -gr); }   /* a crescent with its grooves */
/* a walker's carried and worn things (acc): 1 a shoulder bag, 2 a backpack, 3 a hat, 4 a scarf, 5 a bag and a scarf, 6 a knitted cap, 7 a tote; face 1 = from the front */
void gear(vec2 p, float acc, float face, inout float d, inout float da){ if(acc<0.5) return;
  if(acc>0.5 && acc<1.5 || acc>4.5 && acc<5.5) d=min(d, min(el(p, vec2(0.44, 0.36), vec2(0.12, 0.1)), seg(p, vec2(0.42, 0.42), vec2(-0.2, 0.76), 0.018)));
  if(acc>1.5 && acc<2.5){ if(face<0.5) d=min(d, el(p, vec2(0., 0.58), vec2(0.3, 0.17))); else d=min(d, min(seg(p, vec2(-0.2, 0.74), vec2(-0.22, 0.42), 0.02), seg(p, vec2(0.2, 0.74), vec2(0.22, 0.42), 0.02))); }
  if(acc>2.5 && acc<3.5) d=min(d, min(el(p, vec2(0., 0.915), vec2(0.38, 0.022)), el(p, vec2(0., 0.95), vec2(0.21, 0.045))));
  if(acc>3.5 && acc<5.5){ da=min(da, el(p, vec2(0., 0.77), vec2(0.21, 0.035))); if(face>0.5) da=min(da, el(p, vec2(0.1, 0.66), vec2(0.05, 0.1))); }
  if(acc>5.5 && acc<6.5) da=min(da, el(p, vec2(0., 0.925), vec2(0.25, 0.055)));
  if(acc>6.5) d=min(d, el(p, vec2(-0.45, 0.32), vec2(0.15, 0.14))); }
void main(){ float k=floor(vK.x+0.5), ph=fract(vK.y), sub=floor(vK.y), face=mod(sub, 2.), xtra=floor(sub/2.), code=floor(vK.z+0.5), ci=mod(code, 8.), uk=mod(floor(code/8.), 8.), uci=mod(floor(code/64.), 4.), acc=floor(code/256.);
  vec2 p=vQ; if(k<2.5 || (k>13.5 && k<18.5)) p.y*=1.15;   /* RAIN-5c: a person's quad reaches 15 % over the head (rain.js): the umbrella fits */
  float d=1., du=1., da=1., light=0., clear=0., uy=0.9, uw=1., ux=0.012*sin(ph*6.2832), lamp=0.; vec3 lampC=vec3(0.), glowC=vec3(0.);
  float hasU= uk<3.5 ? 1. : 0.;
  if(k<0.5 || (k>14.5 && k<15.5) || (k>15.5 && k<16.5)){ float st= k>15.5 ? 1. : 0., bend= k>14.5 && k<15.5 ? 0.25 : 0.;
    d=person(p, 0., ph, k>14.5 && k<15.5 ? 0.06 : 0.1, st, bend, hasU*(1.-st));
    if(k>15.5 && ph<0.3) d=min(d, el(p, vec2(0.22, 0.74), vec2(0.1, 0.05)));   /* the phone held up */
    if(uk<1.5 || uk>2.5 && uk<3.5){ uw= uk>2.5 ? 1.4 : 1.; du=dome(tilt(p, uy, ci+uk*3.), ux, uw, uy); } else if(uk>1.5 && uk<2.5){ du=dome(tilt(p, uy, ci+uk*3.), ux, 1., uy); clear=1.; }
    else if(uk>3.5 && uk<4.5) d=min(d, el(p, vec2(0., 0.88), vec2(0.32, 0.09)));   /* a hood */
    else if(uk>4.5 && uk<5.5) d=min(d, el(p, vec2(0., 0.97), vec2(0.55, 0.03)));   /* a newspaper over the head */
    gear(p, acc, face, d, da); }
  else if(k<1.5){ d=min(person(p, -0.3, ph, 0.07, 0., 0., 0.), person(p, 0.3, ph+0.5, 0.07, 0., 0., 1.)); du=dome(tilt(p, uy, ci+uk*3.), ux, 1.25, uy); }
  else if(k<2.5){ float pull=0.06*sin(ph*12.566); d=min(person(p, -0.38, ph, 0.09, 0., 0., hasU), el(p, vec2(0.62+pull, 0.12), vec2(0.3, 0.07)));   /* the dog ahead, pulling */
    float t=clamp((p.x+0.2)/0.75, 0., 1.); if(p.x>-0.2 && p.x<0.55) d=min(d, abs(p.y-mix(0.5, 0.18, t))-0.012); du=dome(tilt(p, uy, ci+uk*3.), -0.38+ux, 0.8, uy); }
  else if(k<3.5){ float pa=ph*6.2832;   /* RAIN-5c: a cyclist from behind (riding away) or the front: one wheel end-on, the rider over it, legs pedalling */
    d=abs(el(p, vec2(0., 0.22), vec2(0.07, 0.22)))-0.03; d=min(d, el(p, vec2(0., 0.66), vec2(0.36, 0.16))); d=min(d, el(p, vec2(0., 0.88), vec2(0.21, 0.06)));
    d=min(d, min(el(p, vec2(-0.14, 0.42+0.07*sin(pa)), vec2(0.1, 0.13)), el(p, vec2(0.14, 0.42-0.07*sin(pa)), vec2(0.1, 0.13))));
    d=min(d, el(p, vec2(0., 0.6), vec2(0.5, 0.025)));
    if(face>0.5){ lamp=exp(-dot(p-vec2(0., 0.56), p-vec2(0., 0.56))/0.006); lampC=uHead; } else { lamp=exp(-dot(p-vec2(0., 0.44), p-vec2(0., 0.44))/0.005)*xtra; lampC=uNavR; } }
  else if(k<4.5){ d=person(p, 0., ph, 0.22, 0., 0.1, 0.); }
  else if(k>28.5){   /* RAIN-7: the street musician with his guitar, standing under the awning; ph: time since his last note (0 = this moment: the strum) */
    float sw=clamp(vSoft, 0.02, 0.6), win=mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin)*mix(1., vFade, uWin), st=exp(-ph*5.);
    float dp=person(p, -0.05, 0.25, 0.04, 1., 0.05, 0.), dg=min(el(p, vec2(0.02, 0.43), vec2(0.34, 0.15)), seg(p, vec2(0.18, 0.47), vec2(0.62, 0.66), 0.03)), da=seg(p, vec2(0.2, 0.66), vec2(0.1, 0.48-0.08*st), 0.05);
    float mp=smoothstep(sw, -sw, min(dp, da)), mg=smoothstep(sw, -sw, dg); vec3 col=mix(cloth(ci)*1.2, vec3(0.22, 0.12, 0.05)*(1.+0.6*st), mg); float al=max(mp, mg);
    gl_FragColor=vec4(col*al*win*vK.w, al*win*vK.w); return; }
  else if(k>26.5){   /* RAIN-6b: things on the facade opposite, drawn in its plane (the sprite spans their width along it; sub = its slope's step) —
       27 a café awning's scalloped fringe fluttering in Wave's wind; 28 a shop's roller shutter, half down (ph = how far down), at Late night all the way */
    float sw=clamp(vSoft, 0.02, 0.6), win=mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin)*mix(1., vFade, uWin), kk=sub/16.-0.5, yy=p.y-kk*p.x;
    vec3 col; float al;
    if(k<27.5){ float fl=uWind*0.16*sin(uTime*7.3+p.x*4.+code)+0.02*sin(uTime*1.7+code), lo=0.42+0.22*abs(sin((p.x*2.5+code*0.37)*3.1416))+fl;
      al=smoothstep(sw, -sw, max(lo-yy, yy-1.))*step(abs(p.x), 1.); col= mod(floor((p.x+1.)*5.), 2.)<0.5 ? vec3(0.17, 0.05, 0.05) : vec3(0.26, 0.24, 0.2); col*=0.55+0.45*smoothstep(lo, 1., yy); }
    else { float down=fract(vK.y), top=1., edge=1.-down; al=step(abs(p.x), 0.97)*smoothstep(sw, -sw, max(edge-yy, yy-top));
      col=vec3(0.13, 0.135, 0.14)*(0.75+0.25*step(0.5, fract(yy*26.))); col=mix(col, vec3(0.05), smoothstep(edge+0.03, edge, yy)); }
    gl_FragColor=vec4(col*al*win*vK.w, al*win*vK.w); return; }
  else if(k>23.5){   /* RAIN-6b (1): a VEHICLE's body (pure/vehicles.js) under its own lights: the sprite runs from its near face's foot up to its roof's far edge,
       the face below ph's share, the roof seen from above beyond it, wet (a sheen step brighter under a lamp) */
    float sw=clamp(vSoft, 0.02, 0.6), win=mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin)*mix(1., vFade, uWin), f=clamp(ph, 0.12, 0.95), sh=sub/8., ax=abs(p.x), q=clamp((p.y-f)/max(1.-f, 0.05), 0., 1.);
    vec3 col=vec3(0.); float al=0.;
    if(k<24.5){ float ty=mod(code, 8.), cc=mod(floor(code/8.), 8.), dr=floor(code/128.);
      vec3 bc= ty>3.5 && ty<4.5 ? vec3(0.34, 0.27, 0.06) : vcol(cc);
      float tall= ty>5.5 ? 0.35 : ty>4.5 ? 0.55 : 0.55;   /* the glass's lower edge on the face: a bus's windows reach low */
      float wr=0.92-0.14*q, box=max(ax-(p.y<f ? 0.95 : wr), max(-p.y+0.02, p.y-0.995));
      float body=smoothstep(sw*0.5, -sw*0.5, box*0.5), glass= p.y<f ? step(tall*f, p.y)*step(p.y, 0.93*f)*step(ax, 0.8) : step(q, 0.22)*step(ax, wr-0.1);
      float wheel=max(smoothstep(sw, -sw, el(p, vec2(-0.72, 0.03), vec2(0.17, 0.06))), smoothstep(sw, -sw, el(p, vec2(0.72, 0.03), vec2(0.17, 0.06))));
      col=bc*(p.y<f ? 0.75 : 0.95+0.5*sh*exp(-pow((q-0.55)/0.28, 2.))*(1.-ax*0.6)); col=mix(col, vec3(0.012, 0.014, 0.02), glass*0.85); col=mix(col, vec3(0.008), wheel);
      if(ty>5.5 && p.y>f) col=mix(col, vec3(0.42, 0.3, 0.13), step(0.62, -p.x)*step(-p.x, wr-0.04)*step(0.08, q)*step(fract(q*7.), 0.82));   /* a bus's lit windows along its side */
      if(ty>3.5 && ty<4.5){ float rl=smoothstep(sw, -sw, el(p, vec2(0., f+(1.-f)*0.42), vec2(0.28, 0.07))); col=mix(col, vec3(1., 0.86, 0.55)*1.2, rl); }   /* the taxi's roof light */
      if(dr>0.5) col=mix(col, vec3(0.5, 0.38, 0.2), step(p.x, -0.6)*step(f*0.3, p.y)*step(p.y, f+(1.-f)*0.4)*min(1., dr*0.5));   /* its door open: the cabin lit */
      al=max(body, wheel); }
    else if(k<25.5){ float first=mod(code, 2.);   /* a TRAM's carriage: the lit window row on the side we see, the roof, the end face with its cab */
      float wr=0.95-0.1*q, box=max(ax-wr, max(-p.y+0.02, p.y-0.995)), body=smoothstep(sw*0.5, -sw*0.5, box*0.5);
      col=vec3(0.2, 0.17, 0.12)*(0.8+0.6*sh*exp(-pow((q-0.5)/0.3, 2.))*(1.-ax));
      float row=step(p.x, -0.5)*step(0.06, q)*step(q, 0.96)*step(fract(q*4.)+0.0, 0.86); col=mix(col, vec3(0.62, 0.45, 0.2), row*0.9);
      if(first>0.5 && p.y<f){ col=vec3(0.18, 0.15, 0.1); col=mix(col, vec3(0.5, 0.38, 0.18), step(0.45*f, p.y)*step(p.y, 0.85*f)*step(ax, 0.78)); col=mix(col, vec3(0.9, 0.55, 0.15), step(0.88*f, p.y)*step(p.y, 0.97*f)*step(ax, 0.35)); }
      al=body; }
    else { float d2=min(min(seg(p, vec2(-0.45, 0.02), vec2(0.2, 0.5), 0.02), seg(p, vec2(0.2, 0.5), vec2(-0.3, 0.95), 0.02)), min(el(p, vec2(-0.3, 0.965), vec2(0.7, 0.018)), el(p, vec2(-0.45, 0.02), vec2(0.35, 0.03))));   /* the pantograph up to the wire */
      al=smoothstep(sw, -sw, d2); col=vec3(0.03); }
    gl_FragColor=vec4(col*al*win*vK.w, al*win*vK.w); return; }
  else if(k>22.5){   /* RAIN-5d: a delivery rider on a scooter, coming towards us: a small wheel, the rider, a helmet, the box behind, the headlamp */
    d=abs(el(p, vec2(0., 0.12), vec2(0.06, 0.12)))-0.03; d=min(d, el(p, vec2(0., 0.5), vec2(0.34, 0.2))); d=min(d, el(p, vec2(0., 0.82), vec2(0.24, 0.08)));
    d=min(d, el(p, vec2(0., 0.32), vec2(0.18, 0.1))); d=min(d, el(p, vec2(0., 0.6), vec2(0.5, 0.025))); da=el(p, vec2(0., 0.7), vec2(0.42, 0.16));
    lamp=exp(-dot(p-vec2(0., 0.4), p-vec2(0., 0.4))/0.005); lampC=uHead; }
  else if(k<5.5){ d=min(el(p, vec2(0., 0.45), vec2(0.45, 0.26)), el(p, vec2(0.02*sin(ph*6.2832), 0.8), vec2(0.28, 0.08))); }
  else if(k<6.5){ d=min(person(p, 0., ph, 0.08, 0., 0., 0.), el(p, vec2(0.55, 0.63), vec2(0.38, 0.02))); }
  else if(k<7.5){ d=el(p, vec2(0., 0.45), vec2(0.8, 0.4)); if(vK.y>=0.) d=min(d, el(p, vec2(0., 0.55+0.3*sin(ph*6.2832)), vec2(1., 0.12))); }
  else if(k<8.5){ d=min(el(p, vec2(0., 0.4), vec2(0.7, 0.28)), min(el(p, vec2(0.7, 0.68), vec2(0.25, 0.18)), el(p, vec2(-0.8, 0.65), vec2(0.12, 0.35)))); }
  else if(k<9.5){ float a=ph*6.2832; vec2 q=mat2(cos(a), -sin(a), sin(a), cos(a))*(p-vec2(0., 0.5)); d=(abs(q.x)+abs(q.y*2.)-0.8)*0.4; }
  else if(k<10.5){ float m=smoothstep(1., 0.2, length((p-vec2(0., 0.5))/vec2(1., 0.5)))*mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin); gl_FragColor=vec4(vec3(0.42, 0.44, 0.47)*m*vK.w, m*vK.w*0.6); return; }
  else if(k<11.5){ light=1.; d=abs(el(p, vec2(0., 0.5), vec2(1., 0.5)))-0.05; }
  else if(k<12.5){ light=1.; d=p.y<0.5 ? 1. : abs(el(p, vec2(0., 0.5), vec2(1., 0.5)))-0.08; }
  else if(k<13.5){ d=min(el(p, vec2(0., 0.72), vec2(0.4, 0.2)), el(p, vec2(0., 0.15), vec2(1., 0.3))); }
  else if(k<14.5){ vec2 q=p; d=person(vec2(q.x, q.y), -0.3, ph, 0.08, 0., 0., hasU); vec2 c=vec2((q.x-0.35)/0.62, q.y/0.62); d=min(d, person(c, 0., fract(ph*1.4), 0.12, 0., 0., 0.)*0.62);   /* a child holding a hand */
    if(p.x>-0.1 && p.x<0.25) d=min(d, abs(p.y-0.42)-0.014); du=dome(tilt(p, uy, ci+uk*3.), -0.3+ux, 0.9, uy); }
  else if(k<17.5){ d=person(p, 0., ph, 0.05, 1., 0., 0.); d=min(d, el(p, vec2(xtra>0.5 ? -0.32 : 0.32, 0.58+0.05*sin(ph*6.2832)), vec2(0.09, 0.08))); }   /* talking: a gesturing hand */
  else if(k<18.5){   /* RAIN-5c: a small group of three walking together (1.5 m), a golf umbrella over the middle one */
    d=min(person(vec2((p.x+0.64)*2., p.y*1.04), 0., ph, 0.09, 0., 0., 0.)*0.5, min(person(vec2(p.x*2., p.y), 0., ph+0.31, 0.09, 0., 0., 1.)*0.5, person(vec2((p.x-0.64)*2., p.y*1.08), 0., ph+0.63, 0.09, 0., 0., 0.)*0.5));
    du=dome(vec2(p.x*2., p.y), ux, 1.35, uy)*0.5; }
  else if(k<19.5){ float sw=(ph-0.5)*0.6; vec2 q=p-vec2(sw*(1.-p.y), 0.); d=max(abs(q.x)-0.9*p.y, max(-p.y+0.02, p.y-0.98))*0.5; glowC= ci<0.5 ? uGarA : ci<1.5 ? uGarB : ci<2.5 ? uGarC : uGarD; }   /* a little flag of the bunting */
  else if(k<20.5){ float g=glyph(p, ci), board=el(vec2(p.x*0.5, p.y), vec2(0., 0.5), vec2(0.45, 0.45)); vec3 gc= ci>0.5 && ci<1.5 ? uCross : ci>3.5 || ci<0.5 ? uSignWarm : uSign;   /* a lit pictogram on its dark board */
    float sw=clamp(vSoft, 0.02, 0.6), win=mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin)*mix(1., vFade, uWin), core=smoothstep(sw, -sw, g), halo=smoothstep(0.35+sw, -sw, g)*0.35, bd=smoothstep(sw, -sw, board);
    if(ci>0.5 && ci<1.5){ vec2 q=vec2(p.x*0.5, p.y-0.5); float cy=mod(uTime+vK.z*0.0+p.x*0., 12.), r=length(q), an=atan(q.y, q.x);   /* RAIN-7: the pharmacy cross animates like an LED one — a pulse, a ring spreading out, a light running round */
      float pat= cy<4. ? 0.62+0.38*sin(uTime*4.) : cy<8. ? 0.3+0.7*smoothstep(0.32, 0., abs(fract(r*2.2-uTime*0.9)-0.5)) : 0.3+0.7*step(0.55, fract(an/6.2832+uTime*0.5)); core*=pat; halo*=0.55+0.45*pat; }
    vec3 c=vec3(0.02, 0.02, 0.025)*bd+gc*(core*1.4+halo*0.5); float al=max(bd, core)*win*vK.w; gl_FragColor=vec4(c*win*vK.w, al); return; }
  else if(k<21.5){ float sw=clamp(vSoft, 0.02, 0.6), win=mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin)*mix(1., vFade, uWin);   /* the vehicles' light: a dark housing, red over amber over green, the one on lit */
    vec2 bq=abs(vec2(p.x*0.2, p.y-0.5))-vec2(0.15, 0.45); float box=length(max(bq, 0.))+min(max(bq.x, bq.y), 0.)-0.04, on=ph>0.5 ? 0. : 1.; vec2 r1=vec2(p.x*0.2, p.y-0.78), g1=vec2(p.x*0.2, p.y-0.22);
    float lr=smoothstep(0.12+sw, 0.09-sw, length(r1)), lg=smoothstep(0.12+sw, 0.09-sw, length(g1));
    vec3 c=vec3(0.015)*smoothstep(sw, -sw, box)+uWalkR*lr*(0.15+1.4*on)+uWalkG*lg*(0.15+1.4*(1.-on)); float al=smoothstep(sw, -sw, box)*win*vK.w; gl_FragColor=vec4(c*win*vK.w, al); return; }
  else { float sw=clamp(vSoft, 0.02, 0.6), win=mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin)*mix(1., vFade, uWin), go=ph<0.5 ? 0. : 1.;   /* the pedestrian signal: a standing red figure, or a walking green one */
    vec2 bq=abs(vec2(p.x*0.42, p.y-0.5))-vec2(0.36, 0.46); float box=length(max(bq, 0.))+min(max(bq.x, bq.y), 0.)-0.04, f= go>0.5 ? person(vec2(p.x*2.2, (p.y-0.12)*1.35), 0., 0.2, 0.14, 0., 0., 0.)*0.45 : person(vec2(p.x*2.2, (p.y-0.12)*1.35), 0., 0., 0.1, 1., 0., 0.)*0.45;
    float fig=smoothstep(sw, -sw, f); vec3 fc= go>0.5 ? uWalkG : uWalkR; vec3 c=vec3(0.015)*smoothstep(sw, -sw, box)*(1.-fig)+fc*fig*1.5; float al=smoothstep(sw, -sw, box)*win*vK.w; gl_FragColor=vec4(c*win*vK.w, al); return; }
  float win=mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin), fade=mix(1., vFade, uWin), sw=clamp(vSoft, 0.02, 0.6), m=smoothstep(sw, -sw, d)*win*fade, mu=smoothstep(sw, -sw, du)*win*fade, ma=smoothstep(sw, -sw, da)*win*fade;   // RAIN-5b: never a visible quad edge
  if(light>0.5){ gl_FragColor=vec4(vec3(0.6, 0.6, 0.62)*m*vK.w, m*vK.w*0.35); return; }
  if(k>18.5 && k<19.5){ gl_FragColor=vec4(glowC*0.55*m*vK.w, m*vK.w); return; }
  vec3 body= k>8.5 && k<9.5 ? (ci<0.5 ? vec3(0.1, 0.06, 0.03) : vec3(0.32, 0.31, 0.29)) : (k<0.5 || (k>13.5 && k<18.5) || (k>0.5 && k<2.5)) ? cloth(ci)*(uk>5.5 ? 1.8 : 1.) : vec3(0.025, 0.022, 0.03);
  if(face>0.5 && k<0.5) body=mix(body, vec3(0.16, 0.12, 0.1), smoothstep(0.05, 0., length((p-vec2(0., 0.865))/vec2(0.2, 0.05))-1.)*0.5);   /* a face, dimly lit */
  vec3 U= uk<0.5 ? vec3(0.02, 0.02, 0.025) : uk>2.5 && uk<3.5 ? mix(ucol(uci), vec3(0.3), step(0.5, fract(p.x*2.))) : ucol(uci);
  float ua= clear>0.5 ? 0.35 : 1.; vec3 col=mix(body, ucol(mod(uci+1., 4.))*1.3, ma); col=mix(col, U, mu*ua*(1.-m*0.6)); float a=max(max(m, ma), mu*ua)*vK.w;
  col=col*a+lampC*lamp*1.6*win*fade*vK.w; gl_FragColor=vec4(col, a); }`;
/* RAIN-7: OUR OWN WINDOW (concept layer 0) — the room's side of the pane, drawn last: the painted wooden frame round the view (its stiles, the top rail,
   the sill below) with a brass latch on the right stile; on the sill a cup of tea, steam rising from it, and a potted plant. All of it nearer than the
   glass: sharp when the focus is near, soft (its edges widened by uSoft, its contrast lowered) as the focus goes out to the city. View units (±uTan). */
export const FRAME_F=`precision highp float; varying vec2 vUv; uniform vec2 uTan; uniform float uSoft, uTime, uAll, uFade; uniform vec3 uWood, uBrass, uWarm, uLeaf;
float bx(vec2 p, vec2 c, vec2 h, float r){ vec2 q=abs(p-c)-h+r; return length(max(q, 0.))+min(max(q.x, q.y), 0.)-r; }
float el(vec2 p, vec2 c, vec2 r){ return (length((p-c)/r)-1.)*min(r.x, r.y); }
float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=p-i; f=f*f*(3.-2.*f); return mix(mix(hs(i), hs(i+vec2(1., 0.)), f.x), mix(hs(i+vec2(0., 1.)), hs(i+vec2(1., 1.)), f.x), f.y); }
void main(){ vec2 p=(vUv*2.-1.)*uTan; float W=uTan.x, H=uTan.y, s=max(uSoft, 0.0018), u=min(W, H), fw=0.045*u, sy=-H+0.15*H;
  if(uFade<=0. || (uAll<0.5 && abs(p.x)<W-1.7*fw-2.*s && p.y<H-fw*0.75-2.*s && p.y>sy+0.33*u+2.*s)){ gl_FragColor=vec4(0.); return; }   /* PERF-2: the open middle of the pane — nothing of the window reaches it (the steam tops at 0.31u, the latch's lever at 1.55 fw, edges ±s): the same pixels, far less work */
  float dF=min(min(W-fw-abs(p.x), H-fw*0.75-p.y), p.y-sy), aF=smoothstep(s, -s, dF);
  float grain=0.85+0.15*vn(vec2(p.x*9., p.y*140.))*vn(vec2(p.x*60., p.y*9.)), bev=smoothstep(-0.006-s, 0., dF)*aF;
  vec3 col=uWood*grain*(0.8+0.2*smoothstep(sy-0.02*H, sy, p.y))+uWarm*0.05*bev; col=mix(col, col*1.5+uWarm*0.03, smoothstep(sy-0.02*H, sy-0.004*H, p.y)*step(p.y, sy)*step(abs(p.x), W-fw));   /* the sill's top face */
  float a=aF;
  /* the brass latch: its plate and lever on the right stile */
  if(p.x>W-1.7*fw-2.*s){ vec2 L=vec2(W-fw*0.5, -0.05*H); float dl=min(bx(p, L, vec2(fw*0.22, 0.045*u), 0.004*u), bx(p, L+vec2(-fw*0.55, 0.01*u), vec2(fw*0.5, 0.009*u), 0.008*u)), al=smoothstep(s, -s, dl);
  col=mix(col, uBrass*(0.7+0.6*smoothstep(0.02*u, -0.01*u, p.y-L.y)), al); a=max(a, al); }   /* PERF-2: each thing computed only inside its own box (the same pixels) */
  /* the cup: its body, the handle, the tea; the steam rising */
  { vec2 C=vec2(-0.42*W, sy); float cw=0.075*u, ch=0.085*u;
  if(abs(p.x-C.x)<cw*3.+2.*s){ float dc=min(bx(p, C+vec2(0., ch*0.5), vec2(cw*0.5, ch*0.5), 0.008*u), abs(el(p, C+vec2(cw*0.62, ch*0.55), vec2(cw*0.22, ch*0.25)))-0.004*u), ac=smoothstep(s, -s, dc)*step(sy-0.001, p.y);
  col=mix(col, vec3(0.26, 0.25, 0.23)*(0.7+0.5*smoothstep(-cw*0.5, cw*0.3, p.x-C.x)), ac); a=max(a, ac);
  float tea=smoothstep(s, -s, el(p, C+vec2(0., ch), vec2(cw*0.48, 0.006*u))); col=mix(col, vec3(0.16, 0.08, 0.03), tea*ac);
  { float yy=(p.y-(C.y+ch))/(0.22*u); if(yy>0. && yy<1.){ float x=(p.x-C.x)/(cw*(0.5+yy*1.4)), n=vn(vec2(x*2.2+sin(yy*5.+uTime*0.7)*0.8, yy*5.-uTime*0.45)), st=smoothstep(0.55, 0.85, n)*smoothstep(1., 0.2, abs(x))*(1.-yy)*smoothstep(0., 0.1, yy)*0.32*(1.-0.6*smoothstep(0.002, 0.02, s));
      col=mix(col, vec3(0.55, 0.55, 0.56), st*(1.-a)); a=max(a, st); } } } }
  /* the potted plant: a terracotta pot, leaves on thin stems swaying a little */
  { vec2 Pp=vec2(0.47*W, sy); if(abs(p.x-Pp.x)<0.2*u+2.*s){ float pw=0.06*u, ph=0.07*u, t2=clamp((p.y-Pp.y)/ph, 0., 1.), dp=max(abs(p.x-Pp.x)-pw*(0.38+0.14*t2), max(Pp.y-p.y, p.y-Pp.y-ph)), ap=smoothstep(s, -s, dp*0.7);
  col=mix(col, vec3(0.24, 0.11, 0.06)*(0.75+0.4*smoothstep(-pw*0.4, pw*0.3, p.x-Pp.x)), ap); a=max(a, ap);
  float dlf=1.; for(int i=0;i<7;i++){ float fi=float(i), an=-1.1+fi*0.37+0.05*sin(uTime*0.6+fi), ln=(0.09+0.05*hs(vec2(fi, 3.)))*u; vec2 base=Pp+vec2((fi-3.)*0.006*u, ph), dir=vec2(sin(an), cos(an)), c=base+dir*ln*0.55;
    vec2 q=p-c; q=vec2(dot(q, vec2(dir.y, -dir.x)), dot(q, dir)); dlf=min(dlf, el(q, vec2(0.), vec2(ln*0.17, ln*0.5))); }
  float alf=smoothstep(s, -s, dlf); col=mix(col, uLeaf*(0.7+0.5*vn(p*90.)), alf); a=max(a, alf); } }
  col=mix(col, vec3(dot(col, vec3(0.33))), smoothstep(0.004, 0.03, s)*0.35);   /* out of focus: softer and paler */
  gl_FragColor=vec4(col*a, a)*uFade; }`;   /* uFade: it comes in after the opening (the start's still holds the city alone) */

