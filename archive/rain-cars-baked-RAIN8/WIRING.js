/* RAIN-9 (the founder chose the CINEMATIC cars, 2026-11-19): RAIN-8's BAKED car trial, kept word for word, NOT LOADED (archive/ is never served).
   Files here: carsprites.js (was apps/night/rooms/rain/pure/), cars.webp (was apps/night/rooms/rain/cars/), cars.js + bake.html + cars.png + cars.json
   (were tools/design/rain/cars/), rain-cars-bake.mjs (was tools/). Below: the room's wiring (rain.js), the shader branch (rain-glass.js LIFE_F kind 30),
   the box branch it was compared with, and the data row «RAIN-8 cars (app)». Paths inside them are as they were. */

/* ---- rain.js ----
  /* RAIN-8 (3): THE CARS, two trial versions for the founder to pick (?rain=carsbaked | carscine | carsbox; carsDbg): 'baked' — the five modelled types
     rendered offline (pure/carsprites.js, cars/cars.webp, loaded only in this mode; the cinematic look stands in until it is here); 'cine' — no detailed
     body: a soft dark silhouette, the lamps' light on the wet roof and the glass, glints, the headlights' pools on the wet road, all softened as the rain
     and the glass would; 'box' — RAIN-6b's boxes (the probes' CONTROL). The trams' lit carriages are the same in all three. * /
  const RAINQ=typeof location!=='undefined' ? (new URLSearchParams(location.search).get('rain')||'').split(',') : [];
  let carMode= RAINQ.includes('carsbox') ? 'box' : RAINQ.includes('carsbaked') ? 'baked' : RAINQ.includes('carscine') ? 'cine' : 'cine', carTex=null, carLoading=null;
  const carsLoad=()=>{ if(carTex || carLoading) return carLoading; carLoading=fileImage(new URL('./cars/cars.webp', import.meta.url)).then(img=>{ const t=new T.Texture(img); t.anisotropy=4; t.needsUpdate=true; own.push(t); carTex=t; lifeM.uniforms.uCars.value=t; carUni(); return true; }, e=>{ carLoading=null; console.warn('[rain] the baked cars did not load:', e); return false; }); return carLoading; };   // eslint-disable-line no-console
  const carUni=()=>{ lifeM.uniforms.uCarMode.value= carMode==='box' ? 0 : carMode==='baked' && carTex ? 1 : 2; };
      if(q.kind===VK.car && carMode==='baked' && carTex){ const bt=BAKED_OF[q.c%8], BT=CARS.types[bt], toward=Math.floor(q.c/64)%2===1, S=seenOf(q.x, q.z, BT.len, toward ? -1 : 1, [CAM.x, CAM.y, CAM.z]), ei=Math.round(S.ei);   // RAIN-8 (3a): the baked car's cell over its own frame
        const [u0, u1, v0, v1]=frameOf(BT, CARS.elev[ei], CARS.az[S.ai], S.side), C0=project(S.centre); if(C0.z<=1) continue; const dq=depthOf(C0.dist), hw=(u1-u0)/2/C0.z, hh=(v1-v0)/2/C0.z, cx=C0.x+(u0+u1)/2/C0.z, y0=C0.y+v0/C0.z;
        if(Math.abs(cx)>2 || Math.abs(y0)>1.5 || (hidden(cx, y0+hh*0.4, dq, CULL.life) && hidden(cx, y0+2*hh*0.9, dq, CULL.life))){ culled++; continue; }
        fRect.set([cx, y0, hw, hh], n*4); fK.set([30, cellOf(bt, S.side, ei, S.ai)+Math.min(8, Math.floor(q.ph))/16, bt+8*(Math.floor(q.c/8)%8)+128*Math.floor(q.c/128), q.a], n*4); fD[n]=dq; n++; continue; }
      const b=project([q.x, q.y, q.z]); if(b.z<=1) continue; const veh=q.kind===VK.car || q.kind===VK.tram, tp=veh ? project([q.x, q.y+q.h, q.z+q.len]) : project([q.x, q.y+q.h*(q.kind<=2 || (q.kind>=14 && q.kind<=18) ? 1.15 : 1), q.z]), hh=(tp.y-b.y)/2, hw=q.w/2/b.z;
    carsDbg:m=>{ if(m && ['box', 'baked', 'cine'].includes(m)){ carMode=m; carUni(); if(m==='baked') return carsLoad().then(()=>({ mode:carMode, baked:!!carTex })); } return { mode:carMode, baked:!!carTex, uni:lifeM.uniforms.uCarMode.value }; },   // RAIN-8 (3): the cars' trial version
    trafficHoldDbg:v=>{ tHold= v==null ? null : +v; return tHold; },   // RAIN-8, captures only: the traffic held at one moment
    busiestDbg:(t0, t1, z0=25, z1=140)=>{ let best=t0, bn=-1; for(let t=t0;t<=t1;t+=0.5){ const n=trafficAt(t, book||dens).filter(c=>c.kind==='car' && c.z>z0 && c.z<z1).length; if(n>bn){ bn=n; best=t; } } return { t:best, cars:bn }; },   // RAIN-8, captures only
    lifeCapDbg:()=>({ n:lifeN, cap:NLIFE, dropped:lifeDropped }),   // RAIN-8 (4)
*/

/* ---- rain-glass.js: the baked branch and the boxes ----
  else if(k>29.5){   /* RAIN-8 (3a): A BAKED CAR — its atlas cell (pure/carsprites.js) over its own frame: R the paint's shading tinted by its colour, G the
       reflections on the wet clear coat and the glass (brighter under a lamp: the sheen step), B the rest (tyres, trim, lamps' housings, the taxi's sign);
       out of focus the atlas's smaller copies (a mip bias from the blur), so it softens like everything at its depth * /
    float win=mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin)*mix(1., vFade, uWin), ci=floor(vK.y+1e-3), sh=fract(vK.y)*2., bt=mod(code, 8.), cc=mod(floor(code/8.), 8.);
    vec2 uv=vec2(vQ.x*0.5+0.5, vQ.y); float inside=step(0., uv.x)*step(uv.x, 1.)*step(0., uv.y)*step(uv.y, 1.); vec2 cl=vec2(mod(ci, 16.), floor(ci/16.)), q=clamp(uv, 0.004, 0.996);
    vec4 tx=texture2D(uCars, vec2((cl.x+q.x)/16., 1.-(cl.y+1.-q.y)/16.), log2(max(1., vSoft*128.*0.9)));
    vec3 paint= bt>1.5 && bt<2.5 ? vec3(0.36, 0.28, 0.07) : vcol(cc)*1.25+0.015;
    vec3 col=paint*tx.r*1.05+vec3(0.82, 0.8, 0.78)*tx.g*(0.3+0.6*sh)+vec3(0.42, 0.39, 0.36)*tx.b;
    if(bt>1.5 && bt<2.5) col+=vec3(1., 0.8, 0.45)*smoothstep(0.85, 0.95, tx.b)*0.9;   /* the taxi's sign lit * /
    float al=tx.a*inside*win*vK.w; gl_FragColor=vec4(col*al, al); return; }
    if(k<24.5){ float ty=mod(code, 8.), cc=mod(floor(code/8.), 8.), dr=floor(code/128.);
      vec3 bc= ty>3.5 && ty<4.5 ? vec3(0.34, 0.27, 0.06) : vcol(cc);
      float tall= ty>5.5 ? 0.35 : ty>4.5 ? 0.55 : 0.55;   /* the glass's lower edge on the face: a bus's windows reach low * /
      float wr=0.92-0.14*q, box=max(ax-(p.y<f ? 0.95 : wr), max(-p.y+0.02, p.y-0.995));
      float body=smoothstep(sw*0.5, -sw*0.5, box*0.5), glass= p.y<f ? step(tall*f, p.y)*step(p.y, 0.93*f)*step(ax, 0.8) : step(q, 0.22)*step(ax, wr-0.1);
      float wheel=max(smoothstep(sw, -sw, el(p, vec2(-0.72, 0.03), vec2(0.17, 0.06))), smoothstep(sw, -sw, el(p, vec2(0.72, 0.03), vec2(0.17, 0.06))));
      col=bc*(p.y<f ? 0.75 : 0.95+0.5*sh*exp(-pow((q-0.55)/0.28, 2.))*(1.-ax*0.6)); col=mix(col, vec3(0.012, 0.014, 0.02), glass*0.85); col=mix(col, vec3(0.008), wheel);
      if(ty>5.5 && p.y>f) col=mix(col, vec3(0.42, 0.3, 0.13), step(0.62, -p.x)*step(-p.x, wr-0.04)*step(0.08, q)*step(fract(q*7.), 0.82));   /* a bus's lit windows along its side * /
      if(ty>3.5 && ty<4.5){ float rl=smoothstep(sw, -sw, el(p, vec2(0., f+(1.-f)*0.42), vec2(0.28, 0.07))); col=mix(col, vec3(1., 0.86, 0.55)*1.2, rl); }   /* the taxi's roof light * /
      if(dr>0.5) col=mix(col, vec3(0.5, 0.38, 0.2), step(p.x, -0.6)*step(f*0.3, p.y)*step(p.y, f+(1.-f)*0.4)*min(1., dr*0.5));   /* its door open: the cabin lit * /
      al=max(body, wheel); }
*/

/* ---- tools/probe-data.mjs: the data row ----
/* RAIN-8 — «RAIN-8 cars (app)»: the baked cars' sprite law (rooms/rain/pure/carsprites.js) — every cell its own place in the atlas; each frame holds its car's
   whole box; the flank the street's eye sees comes out on the frame's right from the front and from behind; the bins follow the angle; a car on the near
   road is seen at the angles baked (elevation within the bins, azimuth within 30°); the atlas exists and its bake made every cell. CONTROL: the view
   without the side's sign (the eye on the same flank from behind) puts the back view's flank on the left — caught. * /
async function rain8Cars(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); };
  const K=await import(new URL('../apps/night/rooms/rain/pure/carsprites.js', import.meta.url).href), CY=await import(new URL('../apps/night/rooms/rain/pure/city.js', import.meta.url).href), fs=await import('node:fs');
  const C=K.CARS, idx=new Set(); for(let t=0;t<C.types.length;t++) for(let s=0;s<2;s++) for(let e=0;e<C.elev.length;e++) for(let a=0;a<C.az.length;a++) idx.add(K.cellOf(t, s, e, a));
  ok(`cells not one place each (${idx.size} of ${K.CELLS}, grid ${C.grid*C.grid})`, idx.size===K.CELLS && Math.max(...idx)<C.grid*C.grid);
  const flankRight=(vd)=>{ let bad=0; for(const s of [0, 1]) for(const a of C.az.slice(1)) for(const e of C.elev){ const dd=vd(e, a, s), { r }=K.viewAxes(dd), fx=Math.sign(dd[0]); if(!(r[0]*fx>0)) bad++; } return bad; };
  ok('the seen flank is not on the frame right', flankRight(K.viewDir)===0);
  { const old=(e, a, s)=>{ const E=e*Math.PI/180, A=a*Math.PI/180, c=Math.cos(E); return [Math.sin(A)*c, Math.sin(E), (s===1 ? -1 : 1)*Math.cos(A)*c]; }, b=flankRight(old); ok('CONTROL: the view without the side sign passed', b>0); notes.push(`CONTROL the old view: ${b} views with the flank on the left`); }
  let out=0; for(const T of C.types) for(const s of [0, 1]) for(const e of C.elev) for(const a of C.az){ const [u0, u1, v0, v1]=K.frameOf(T, e, a, s), dd=K.viewDir(e, a, s), { r, u }=K.viewAxes(dd);
    for(const p of K.boxOf(T)){ const x=p[0]*r[0]+p[1]*r[1]+p[2]*r[2], y=p[0]*u[0]+p[1]*u[1]+p[2]*u[2]; if(x<u0 || x>u1 || y<v0 || y>v1) out++; } }
  ok(`frames that cut their car's box: ${out} corners`, out===0);
  { const b1=K.binsOf(20, 3), b2=K.binsOf(30, 20), b3=K.binsOf(2, 40); ok(`the bins do not follow the angle (${JSON.stringify([b1, b2, b3])})`, b1.ei<b2.ei && b3.ei===0 && b3.ai===C.az.length-1 && b1.ai===0); }
  { let worst=[90, 0, 0]; for(const x of CY.STREET.lanes.map(l=>l.x)) for(let z=20;z<=600;z+=10){ const S=K.seenOf(x, z, 4.6, -1, [CY.CAM.x, CY.CAM.y, CY.CAM.z]); worst=[Math.min(worst[0], S.elev), Math.max(worst[1], S.elev), Math.max(worst[2], S.az)]; }
    ok(`a car on the near road is seen beyond the baked angles (elevation ${worst[0].toFixed(1)}–${worst[1].toFixed(1)}°, azimuth ≤ ${worst[2].toFixed(1)}°)`, worst[1]<=C.elev[C.elev.length-1]+8 && worst[2]<=30); notes.push(`the near road: elevation ${worst[0].toFixed(1)}–${worst[1].toFixed(1)}°, azimuth ≤ ${worst[2].toFixed(1)}° (baked ${C.elev[0]}–${C.elev[C.elev.length-1]}°, ${C.az.join('/')}°)`); }
  { const f=new URL('../apps/night/rooms/rain/'+C.file, import.meta.url), j=new URL('../tools/design/rain/cars/cars.json', import.meta.url); const has=fs.existsSync(f), J=fs.existsSync(j) ? JSON.parse(fs.readFileSync(j, 'utf8')) : null;
    ok('the atlas or its bake record is missing', has && !!J); if(J){ ok(`the bake made ${J.cells} cells (${K.CELLS} wanted), ${J.thin} not filling their frame`, J.cells===K.CELLS && J.thin===0); notes.push(`atlas ${(fs.statSync(f).size/1024).toFixed(0)} KB, ${J.cells} cells`); } }
  return { cases:n, total:d.length, differences:d, notes }; }
*/
