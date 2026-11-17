/* RAIN-5b — «RAIN no quad edges»: the founder saw square fields round the flying scraps (a sprite's quad showing under a wide focus blur). The room's
   own life shader (rooms/rain/rain-glass.js LIFE_V / LIFE_F) draws every kind of item — people (RAIN-5c: with their gear, groups, the cyclist's lamp), birds, leaves,
   steam, rings, the bunting, the lit signs and the crossing's lights — at three sizes and
   three focus blurs on a transparent canvas; on a ring two pixels inside each quad's border the alpha must stay at most 2 / 255 (no edge can show).
   CONTROL: the same with the border window off (uWin 0) must show an edge somewhere. Small fixes (2026-11-17): + the mist's soft copy of a far light is round. */
import { row } from '../core/rows.js';

export async function checkRainQuads(){ const d=[], notes=[]; let n=0; const miss=x=>d.push(x);
  const H=await import('../../../apps/night/scene/host.js'), T=await H.loadThree(), G=await import('../../../apps/night/rooms/rain/rain-glass.js');
  const W=512, Hh=256, canvas=document.createElement('canvas'), r=new T.WebGLRenderer({ canvas, antialias:false, preserveDrawingBuffer:true, alpha:true, premultipliedAlpha:true }); r.setPixelRatio(1); r.setSize(W, Hh, false); r.setClearColor(0x000000, 0);
  const items=[]; for(let k=0;k<=23;k++) for(const [sz, dep] of [[0.004, 0.1], [0.012, 0.6], [0.03, 0.95]]) items.push([k, sz, dep]);   // RAIN-5c: + the group, the flag, the signs, the lights
  const N=items.length, g=new T.InstancedBufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3)); g.setIndex([0,1,2, 0,2,3]);
  const R4=new Float32Array(N*4), K4=new Float32Array(N*4), D1=new Float32Array(N), cols=12, foc=new T.Vector4(0.1, 4, 0.04, 0), uPx=Hh/2/0.5, quads=[];
  items.forEach(([k, sz, dep], i)=>{ const cx=-0.9+(i%cols)*0.16, cy=-0.42+Math.floor(i/cols)*0.2, hw=sz*(k===9 || k===7 ? 1 : 0.4), hh=sz/2; R4.set([cx, cy, hw, hh], i*4); K4.set([k, 0.3+(k===3 ? 3 : 0), 3+8*(k%4)+64+256*(k%8), 1], i*4); D1[i]=dep;
    const R=foc.z*Math.min(1, Math.abs(dep-foc.x)*foc.y), pad=R+1.5/uPx; quads.push([cx-(hw+pad), cx+(hw+pad), cy+hh-(hh+pad), cy+hh+(hh+pad)]); });
  g.setAttribute('aRect', new T.InstancedBufferAttribute(R4, 4)); g.setAttribute('aK', new T.InstancedBufferAttribute(K4, 4)); g.setAttribute('aDep', new T.InstancedBufferAttribute(D1, 1)); g.instanceCount=N;
  const m=new T.ShaderMaterial({ uniforms:{ uTan:{ value:new T.Vector2(1, 0.5) }, uFoc:{ value:foc }, uPx:{ value:uPx }, uWin:{ value:1 } }, vertexShader:G.LIFE_V, fragmentShader:G.LIFE_F,
    transparent:true, depthTest:false, depthWrite:false, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });
  const mesh=new T.Mesh(g, m); mesh.frustumCulled=false; const scene=new T.Scene(), cam=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); scene.add(mesh);
  const edge=win=>{ m.uniforms.uWin.value=win; r.clear(); r.render(scene, cam); const gl=r.getContext(), px=new Uint8Array(W*Hh*4); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px); let worst=0, at=-1;
    quads.forEach(([x0, x1, y0, y1], i)=>{ const X=x=>Math.round((x+1)/2*W), Y=y=>Math.round((y+0.5)*Hh), a=X(x0)+2, b=X(x1)-3, c=Y(y0)+2, e=Y(y1)-3; if(b-a<3 || e-c<3) return;
      const look=(x, y)=>{ if(x<0 || y<0 || x>=W || y>=Hh) return; const v=px[(y*W+x)*4+3]; if(v>worst){ worst=v; at=i; } };
      for(let x=a;x<=b;x++){ look(x, c); look(x, e); } for(let y=c;y<=e;y++){ look(a, y); look(b, y); } }); return { worst, at }; };
  try{ n++; const ok=edge(1); if(ok.worst>2) miss(`a quad edge shows: alpha ${ok.worst} / 255 on item ${ok.at} (kind ${items[ok.at][0]}, size ${items[ok.at][1]}, depth ${items[ok.at][2]})`); notes.push(`the border ring's alpha at most ${ok.worst} / 255 over ${N} items`);
    n++; const bad=edge(0); if(bad.worst<=8) miss('CONTROL: without the border window no edge showed'); else notes.push(`CONTROL: without the window an edge shows (${bad.worst} / 255)`); }
  finally{ g.dispose(); m.dispose(); }
  /* RAIN-5e: the POINT LIGHTS (the far cars' headlights were square): three sizes × three blurs, bright, additive on black; on the ring at each
     light's quad border (1 px inside) the brightness at most 2 / 255 (my guess); CONTROL the round window off shows the quad */
  try{ const L=[], uPx2=Hh/2/0.5, foc2=new T.Vector4(0.3, 4, 0.04, 0); for(const b of [0.0011, 0.0015, 0.004]) for(const dep of [0.3, 0.45, 0.9]) L.push([b, dep]);
    const g2=new T.InstancedBufferGeometry(); g2.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3)); g2.setIndex([0,1,2, 0,2,3]);
    const RA=new Float32Array(L.length*4), CA=new Float32Array(L.length*4), DK=new Float32Array(L.length*2), boxes=[];
    L.forEach(([b, dep], i)=>{ const cx=-0.85+(i%9)*0.2, cy=0.15-Math.floor(i/9)*0.3; RA.set([cx, cy, b, 0], i*4); CA.set([1, 0.95, 0.85, 1.4], i*4); DK.set([dep, 0], i*2);
      const R=foc2.z*Math.min(1, Math.max(0, Math.abs(dep-foc2.x)-foc2.w)*foc2.y), bb=Math.max(b, 0.7/uPx2), vK=Math.min(1, Math.max(0, R/(bb*3+0.004))), hs=bb+R+3*bb*(1-vK); boxes.push([cx-hs, cx+hs, cy-hs, cy+hs, 2/uPx2]); });   // the quad's margin with the window on (uWin 1)
    g2.setAttribute('aRect', new T.InstancedBufferAttribute(RA, 4)); g2.setAttribute('aCol', new T.InstancedBufferAttribute(CA, 4)); g2.setAttribute('aDK', new T.InstancedBufferAttribute(DK, 2)); g2.instanceCount=L.length;
    const m2=new T.ShaderMaterial({ uniforms:{ uTan:{ value:new T.Vector2(1, 0.5) }, uFoc:{ value:foc2 }, uPx:{ value:uPx2 }, uWin:{ value:1 } }, vertexShader:G.LIGHT_V, fragmentShader:G.LIGHT_F, transparent:true, depthTest:false, depthWrite:false, blending:T.AdditiveBlending });
    const mesh2=new T.Mesh(g2, m2); mesh2.frustumCulled=false; const sc2=new T.Scene(); sc2.add(mesh2); const cam2=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const ring=win=>{ m2.uniforms.uWin.value=win; r.setClearColor(0x000000, 1); r.clear(); r.render(sc2, cam2); const gl=r.getContext(), px=new Uint8Array(W*Hh*4); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px); let worst=0, at=-1;
      boxes.forEach(([x0, x1, y0, y1, mg], i)=>{ x0-=mg*win; x1+=mg*win; y0-=mg*win; y1+=mg*win; const X=x=>Math.round((x+1)/2*W), Y=y=>Math.round((y+0.5)*Hh), a=X(x0)+1, b=X(x1)-2, c=Y(y0)+1, e=Y(y1)-2; if(b-a<3 || e-c<3) return;   // the border itself (1 px inside)
        const look=(x, y)=>{ if(x<0 || y<0 || x>=W || y>=Hh) return; const k=(y*W+x)*4, v=Math.max(px[k], px[k+1], px[k+2]); if(v>worst){ worst=v; at=i; } };
        for(let x=a;x<=b;x++){ look(x, c); look(x, e); } for(let y=c;y<=e;y++){ look(a, y); look(b, y); } }); return { worst, at }; };
    n++; const okL=ring(1); if(okL.worst>2) miss(`a point light's quad edge shows: ${okL.worst} / 255 on light ${okL.at} (size ${L[okL.at][0]}, depth ${L[okL.at][1]})`); notes.push(`the point lights' border ring at most ${okL.worst} / 255 over ${L.length} lights`);
    n++; const badL=ring(0); if(badL.worst<=8) miss('CONTROL: without the round window no point light showed its quad'); else notes.push(`CONTROL: without the window a point light shows its quad (${badL.worst} / 255)`);
    g2.dispose(); m2.dispose(); }
  catch(e){ miss('the point lights check: '+(e && e.message || e)); }
  /* small fixes (2026-11-17): THE MIST'S SOFT COPY — the far cars' lights were still square for the founder: not the drawing (above) but the city seen through
     the misty glass, the room's soft chain (rain.js soft). The real room is built and its own chain run on a round 21-px light at the centre; the soft copy must be
     ROUND — the brightness at the same distance in 16 directions agrees within 6 % of the peak (my guess), wherever the mean is above 2 % of it; CONTROL the
     old chain (sparse taps) is not round */
  try{ const RM=await import('../../../apps/night/rooms/rain/rain.js'), { cv }=await import('../../../core/palette.js'), city=await RM.rainAssets('reduced');
    const room=RM.buildRain(T, { C:cv, level:'reduced', w:W, h:Hh, city }); r.setSize(W, Hh, false);
    try{ room.update(1/30, 1, [], null, {}); room.render(r);
      const aniso=o=>{ const S=room.softDbg(o); if(!S) return null; const { n, v }=S; let pk=0, sx=0, sy=0, sw=0; v.forEach((x, i)=>{ pk=Math.max(pk, x); sx+=x*(i%n); sy+=x*Math.floor(i/n); sw+=x; });
        if(!sw) return { a:1, pk:0 }; const cx=sx/sw, cy=sy/sw, at=(x, y)=>{ const x0=Math.floor(x), y0=Math.floor(y), fx=x-x0, fy=y-y0, g=(i, j)=>(i<0 || j<0 || i>=n || j>=n) ? 0 : v[j*n+i];
          return g(x0, y0)*(1-fx)*(1-fy)+g(x0+1, y0)*fx*(1-fy)+g(x0, y0+1)*(1-fx)*fy+g(x0+1, y0+1)*fx*fy; };
        let a=0, atR=0; for(let rr=0.75;rr<S.R-1;rr+=0.25){ const ring=[]; for(let k=0;k<16;k++){ const th=k*Math.PI/8; ring.push(at(cx+rr*Math.cos(th), cy+rr*Math.sin(th))); }
          const mean=ring.reduce((p, q)=>p+q, 0)/16; if(mean<0.02*pk) continue; const sp=(Math.max(...ring)-Math.min(...ring))/pk; if(sp>a){ a=sp; atR=rr; } }
        return { a, atR, pk }; };
      const now=aniso({ size:21 }), old=aniso({ size:21, old:true }); n+=2;   // a round 21-px light: a 3-px one peaks at 1 / 255 in the soft copy, a 9-px one at 8 — too faint to judge in 8 bits
      if(!now || !(now.pk>8)) miss('the soft copy of a far light is empty: '+JSON.stringify(now)); else if(now.a>0.06) miss(`the mist's soft copy of a far light is not round: ${(now.a*100).toFixed(1)} % of its peak between directions (at ${now.atR} quarter px)`);
      else notes.push(`the mist's soft copy of a round 21-px light: round — the directions agree within ${(now.a*100).toFixed(1)} % of the peak`);
      if(!old || old.a<=0.06) miss(`CONTROL: the old soft chain is round (${old && (old.a*100).toFixed(1)} %) — the check cannot fail`); else notes.push(`CONTROL: the old soft chain is not round (${(old.a*100).toFixed(1)} % between directions)`); }
    finally{ room.dispose(); } }
  catch(e){ miss('the soft chain check: '+(e && e.message || e)); }
  finally{ r.dispose(); r.forceContextLoss(); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98705, night:true, name:'RAIN no quad edges', drawn:true, run:()=>checkRainQuads(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
