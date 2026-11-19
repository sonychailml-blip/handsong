/* RAIN-8 (the founder, 2026-11-19): OUR OWN WINDOW REMOVED from the rain room — the grey frame on top and the sides looked bad; the cup and the
   plant were in the wrong perspective and scale. Kept here word for word as RAIN-7 built it; NOT LOADED by anything (archive/ is never served by
   the apps). Part 1: the shader (was apps/night/rooms/rain/rain-glass.js FRAME_F). Part 2: its wiring in rain.js (the material, the pass, the fade-in
   after the reveal, the probes' switches frameDbg / frameAllDbg / frameSoftDbg, ?rain=noframe). */

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

/* ---- part 2: rain.js (RAIN-7) ----
36:import { QUAD_V, BLUR_F, DOWN_F, VIEW_F, WIN_V, WIN_F, LIGHT_V, LIGHT_F, DROP_V, DROP_F, LIFE_V, LIFE_F, FRAME_F, glassShader } from './rain-glass.js';
249:  let frameOn=!(typeof location!=='undefined' && (new URLSearchParams(location.search).get('rain')||'').split(',').includes('noframe'));
250:  const frameM=mat({ uniforms:{ uTan:{ value:UT }, uSoft:{ value:0 }, uTime:UTIME, uAll:{ value:0 }, uFade:{ value:0 }, uWood:{ value:new T.Color(0.13, 0.12, 0.105) }, uBrass:{ value:new T.Color(0.42, 0.3, 0.12) }, uWarm:{ value:new T.Color(1.0, 0.7, 0.4) }, uLeaf:{ value:new T.Color(0.05, 0.1, 0.05) } }, vertexShader:QUAD_V, fragmentShader:FRAME_F,
252:  const qFrame=add(new T.Mesh(quad, frameM), 1);
253:  const qGlass=add(new T.Mesh(quad, glassM), 0), ALL=[qCity, qBlur, qDown, qView, lifeMesh, wins, lights, dropsMesh, qGlass, qFrame];
301:    frameM.uniforms.uSoft.value=blurAt(0.012, focus)*0.03; if(frameT0==null) frameT0=now; frameM.uniforms.uFade.value=Math.max(0, Math.min(1, (now-frameT0-8)/4)); T('glass', ()=>{ if(frameOn) pass(r, keep, qGlass, qFrame); else pass(r, keep, qGlass); }); show(...ALL); frames++;
305:  let focus=FOCUS.rest, target=FOCUS.rest, restOn=false, heldNow=0, pressAt=-1e9, lastPick=-1, picks=0, wipes=0, strokes=0, viewOver=null, finger=null, rainOver=null, simFrozen=false, fxE=0, fxT=0.5, fxW=0, fxOff=false, sleepE=0, sleepOver=null, sleepM=null, taxiNow=null, sweepNow=null, buskAt=-1e9, frameT0=null, bakedLamp=0, shutK=0.5, bodiesOn=!(typeof location!=='undefined' && (new URLSearchParams(location.search).get('rain')||'').split(',').includes('nobodies')), rainEff=0, soundSent=null, neonNow=1, winExtra=0; const pickLog=[];   // RAIN-6: fxE…soundSent — the effects hand's eased values
394:    frameAllDbg:on=>{ frameM.uniforms.uAll.value=on ? 1 : 0; },   // PERF-2: the window computed over the whole pane, as before (the A/B's other side)
395:    frameDbg:on=>{ if(on!=null) frameOn=!!on; return frameOn; },   // RAIN-7 / PERF-1: our own window on or off
396:    frameSoftDbg:f=>blurAt(0.012, f)*0.03,   // RAIN-7: the window's softness at a focus (the render's own formula)
398:      return { cones, crownShare:cs, sway:viewM.uniforms.uSway.value, frameOn, frameSoft:frameM.uniforms.uSoft.value, focus, buskAt, t:now, busker:look!==RAIN_ROOM.looks.late }; },   // RAIN-7
*/
