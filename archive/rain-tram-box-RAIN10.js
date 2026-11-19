/* ARCHIVED at RELEASE-1 (B), 2026-11-19 — RAIN-10's tram as a lit box in true perspective, word for word (not loaded): replaced by the 3D tram
   (rooms/rain/pure/vehmesh.js tramMesh, rain-glass.js VEH_V / VEH_F). From rain-glass.js: */
/* RAIN-10: THE TRAM, a lit box seen in true perspective (the camera is nearly over the tracks: mostly its roof, a thin lit side, its near end).
   Each face is a quad of four world corners (rain.js tramUpload): aClip the corner in camera space (x·z, y·z, z: the GPU divides, so the face's own
   metres aUV interpolate exactly), aFace (face: 0 roof, 1 the near side, 2 the near end · the carriage's length · end: 0 bellows, 1 the cab, 2 the
   rear · the farthest carriage 1), aExt the face's extent in its metres, aSoft which edges are the outline (softened by the pixel and the focus
   blur; shared edges stay hard so no seam shows), aZD (the carriage's near z, its focus depth). Livery muted deep red under cream, the windows
   lit warm with people inside (seeded per window: standing, sitting or none), the cab's windscreen and its destination band (lit, no text), the
   rear window lit, the wet roof catching the lamps. Premultiplied over the view, behind the baked city's nearer things like the life layer */
export const TRAM_V=`attribute vec3 aClip; attribute vec2 aUV, aZD; attribute vec4 aFace, aExt, aSoft; uniform vec2 uTan;
varying vec3 vClip; varying vec2 vUV, vZD; varying vec4 vFace, vExt, vSoftE;
void main(){ vClip=aClip; vUV=aUV; vZD=aZD; vFace=aFace; vExt=aExt; vSoftE=aSoft; gl_Position=vec4(aClip.x/uTan.x, aClip.y/uTan.y, 0., aClip.z); }`;
export const TRAM_F=`precision highp float; varying vec3 vClip; varying vec2 vUV, vZD; varying vec4 vFace, vExt, vSoftE;
uniform vec4 uFoc; uniform float uPx, uTime, uWin, uOccl; uniform vec3 uHoney, uAmber; uniform sampler2D uDepthMap; uniform vec2 uExt; ${RAD}
float h1(float n){ return fract(sin(n*127.1)*43758.5453); }
float bx(vec2 p, vec2 a, vec2 b, float w){ vec2 s=smoothstep(a-w, a+w, p)*(1.-smoothstep(b-w, b+w, p)); return s.x*s.y; }   /* a soft box a…b, edge w */
float elp(vec2 p, vec2 c, vec2 r, float w){ return 1.-smoothstep(1.-w, 1.+w, length((p-c)/r)); }
void main(){ float face=vFace.x, L=vFace.y, endK=vFace.z, last=vFace.w; vec2 uv=vUV, fw=max(fwidth(uv), vec2(1e-5)); float Rpx=radAt(vZD.y)*uPx, wB=max(fw.x, fw.y)*(1.+Rpx);
  vec2 P=vClip.xy/vClip.z; float lampZ= face<1.5 ? vZD.x+uv.x : vZD.x, dz=fract((lampZ-8.)/24.+0.5)-0.5, sh=0.25+0.75*exp(-(dz*24.)*(dz*24.)/14.);
  vec3 red=vec3(0.15, 0.045, 0.04), cream=vec3(0.3, 0.27, 0.2), glassD=vec3(0.03, 0.035, 0.045), col; float bel= last>0.5 ? 0. : smoothstep(L-0.45, L-0.4, uv.x);
  if(face<0.5){   /* the roof: wet grey, its middle catching the lamps, the edges falling away, equipment boxes, the bellows' dark band */
    float ac=abs(uv.y); col=vec3(0.085, 0.09, 0.095)*(0.8+0.5*sh*exp(-ac*ac/0.25))*(1.-0.45*smoothstep(0.85, 1.2, ac));
    float eq=bx(uv, vec2(L*0.3, -0.55), vec2(L*0.52, 0.55), wB); col=mix(col, vec3(0.05, 0.052, 0.056)+vec3(0.12, 0.1, 0.07)*sh*0.3*smoothstep(0.35, 0.55, uv.y), eq);
    col+=uHoney*0.55*smoothstep(0.92, 1.18, ac)*(1.-bel)*(1.-eq);   /* the windows reach up into the roof's curve: their warm light along both long edges */
    col=mix(col, vec3(0.025), bel); }
  else if(face<1.5){   /* the near side: the bogies, the red lower body, the lit windows with people, the cream band, the bellows */
    float v=uv.y, P0=L/max(1., floor(L/1.35+0.5)), n=floor(uv.x/P0), x=uv.x-n*P0, door=step(0.78, h1(n+vFace.y*7.1));
    col= v<0.38 ? vec3(0.02) : v<1.0 ? red*(0.85+0.3*sh) : v<2.32 ? cream*0.6 : cream*(0.8+0.3*sh);
    float pane=bx(vec2(x, v), vec2(0.09, door>0.5 ? 0.46 : 1.04), vec2(P0-0.09, 2.28), wB);
    float s=h1(n*3.7+vZD.x*0.13), cx=0.3+0.5*h1(n*5.3+1.), st=step(0.62, s), sit=step(0.3, s)*(1.-st);   /* someone standing, someone sitting, or nobody */
    float who=max(st*max(elp(vec2(x, v), vec2(cx*P0, 1.88), vec2(0.11, 0.13), 0.25), elp(vec2(x, v), vec2(cx*P0, 1.5), vec2(0.24, 0.33), 0.2)), sit*max(elp(vec2(x, v), vec2(cx*P0, 1.56), vec2(0.1, 0.12), 0.25), elp(vec2(x, v), vec2(cx*P0, 1.25), vec2(0.22, 0.2), 0.2)));
    vec3 lit=uHoney*(0.78+0.35*smoothstep(1.1, 2.25, v));   /* the ceiling lights: brighter towards the top */
    col=mix(col, mix(lit, vec3(0.06, 0.045, 0.035), who*0.88), pane); col=mix(col, vec3(0.03), bel); }
  else {   /* the near end: the cab (windscreen, destination band, lamp housings), the rear (its lit window), or a bellows between carriages */
    float u=uv.x, v=uv.y; col= v<0.38 ? vec3(0.02) : v<1.0 ? red : cream*0.75;
    if(endK>1.5){ float w=bx(uv, vec2(-0.92, 1.12), vec2(0.92, 2.38), wB), s=h1(vZD.x*0.37), who=step(0.4, s)*max(elp(uv, vec2(0.35*(s-0.7), 1.86), vec2(0.13, 0.15), 0.25), elp(uv, vec2(0.35*(s-0.7), 1.45), vec2(0.28, 0.35), 0.2));
      col=mix(col, mix(uHoney*0.85, vec3(0.06, 0.045, 0.035), who*0.88), w); }
    else if(endK>0.5){ float w=bx(uv, vec2(-1.02, 1.02), vec2(1.02, 2.56), wB), dest=bx(uv, vec2(-0.78, 2.66), vec2(0.78, 2.98), wB), dots=0.65+0.35*step(0.5, fract(u*9.))*step(0.5, fract(v*9.));
      col=mix(col, glassD+uHoney*0.12*smoothstep(1.0, 2.5, v)+vec3(0.5, 0.55, 0.62)*exp(-pow((u+0.35)/0.3, 2.))*0.08*(0.4+sh), w); col=mix(col, uAmber*1.25*dots, dest);
      col=mix(col, vec3(0.04), max(elp(uv, vec2(-0.8, 0.82), vec2(0.17, 0.11), 0.3), elp(uv, vec2(0.8, 0.82), vec2(0.17, 0.11), 0.3))); }
    else col=vec3(0.03); }
  /* the outline softened by the pixel and the blur (only the edges flagged in aSoft); the baked city's nearer things hide it */
  vec4 e=vec4(uv.x-vExt.x, vExt.y-uv.x, uv.y-vExt.z, vExt.w-uv.y)/vec4(fw.x, fw.x, fw.y, fw.y)/(1.2+Rpx);
  float al=1.; for(int i=0;i<4;i++){ float ei= i==0 ? e.x : i==1 ? e.y : i==2 ? e.z : e.w, fl= i==0 ? vSoftE.x : i==1 ? vSoftE.y : i==2 ? vSoftE.z : vSoftE.w; if(fl>0.5 && uWin>0.5) al*=smoothstep(0., 1., ei); }
  if(uOccl>0.5){ float bd=texture2D(uDepthMap, clamp(P/uExt*0.5+0.5, 0., 1.)).r; al*=1.-smoothstep(0.012, 0.03, vZD.y-bd); }
  gl_FragColor=vec4(col*al, al); }`;

/* from rain.js (the room's setup, then its upload): */
     each carriage's near end, its near side and its roof — the farthest carriage first, so a nearer one covers the bellows behind it */
  const TQ=2*VEH.tramCars*3, tg=new T.BufferGeometry(), tA={ aClip:3, aUV:2, aZD:2, aFace:4, aExt:4, aSoft:4 }, tB={};
  for(const [k, n] of Object.entries(tA)){ tB[k]=new Float32Array(TQ*4*n); const a=new T.BufferAttribute(tB[k], n); a.setUsage(T.DynamicDrawUsage); tg.setAttribute(k, a); }
  tg.setAttribute('position', new T.BufferAttribute(new Float32Array(TQ*4*3), 3)); { const ix=[]; for(let q=0;q<TQ;q++) ix.push(q*4, q*4+1, q*4+2, q*4, q*4+2, q*4+3); tg.setIndex(ix); } tg.setDrawRange(0, 0); own.push(tg);
  const tramM=mat({ uniforms:{ uTan:{ value:UT }, uFoc:{ value:FOC }, uPx:UPX, uTime:UTIME, uWin:{ value:1 }, uHoney:{ value:HONEY }, uAmber:{ value:AMBER }, uDepthMap:{ value:depTex||blankTex }, uExt:{ value:EXT }, uOccl:{ value:depTex ? 1 : 0 } },
    vertexShader:TRAM_V, fragmentShader:TRAM_F, transparent:true, extensions:{ derivatives:true }, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });
  const tramMesh=add(new T.Mesh(tg, tramM), 0.45); let tramQuads=0;
  function tramUpload(cars){ let n=0; const W2=VEH.tramW/2, H=VEH.tramH;
    const quad=(Pw, uv, face, ext, soft, zd)=>{ const Q=Pw.map(p=>project(p)); if(Q.some(q=>q.z<=1) || n>=TQ) return;
      Q.forEach((q, j)=>{ const o=n*4+j; tB.aClip.set([q.x*q.z, q.y*q.z, q.z], o*3); tB.aUV.set(uv[j], o*2); tB.aZD.set(zd, o*2); tB.aFace.set(face, o*4); tB.aExt.set(ext, o*4); tB.aSoft.set(soft, o*4); }); n++; };
    if(bodiesOn) for(const c of cars){ if(c.kind!=='tram') continue; const near= c.dir>0 ? c.z-c.len : c.z, L=c.len/VEH.tramCars, x0=c.x-W2, x1=c.x+W2, side=CAM.x<x0;
      for(let i=VEH.tramCars-1;i>=0;i--){ const z0=near+i*L, z1=z0+L, last=i===VEH.tramCars-1 ? 1 : 0, first=i===0, endK= first ? (c.dir<0 ? 1 : 2) : 0, zd=[z0, depthOf(project([c.x, H, z0]).dist)];
        quad([[x0, 0, z0], [x1, 0, z0], [x1, H, z0], [x0, H, z0]], [[-W2, 0], [W2, 0], [W2, H], [-W2, H]], [2, L, endK, last], [-W2, W2, 0, H], [side ? 0 : 1, 1, 1, 0], zd);
        if(side) quad([[x0, 0, z0], [x0, 0, z1], [x0, H, z1], [x0, H, z0]], [[0, 0], [L, 0], [L, H], [0, H]], [1, L, endK, last], [0, L, 0, H], [0, last, 1, 0], zd);
        quad([[x0, H, z0], [x0, H, z1], [x1, H, z1], [x1, H, z0]], [[0, -W2], [L, -W2], [L, W2], [0, W2]], [0, L, endK, last], [0, L, -W2, W2], [0, last, side ? 0 : 1, 1], zd); } }
    tramQuads=n; tg.setDrawRange(0, n*6); for(const k in tA) tg.attributes[k].needsUpdate=true; }
