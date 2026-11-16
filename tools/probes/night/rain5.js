/* RAIN-5b — «RAIN no quad edges»: the founder saw square fields round the flying scraps (a sprite's quad showing under a wide focus blur). The room's
   own life shader (rooms/rain/rain-glass.js LIFE_V / LIFE_F) draws every kind of item — people, birds, leaves, steam, rings — at three sizes and
   three focus blurs on a transparent canvas; on a ring two pixels inside each quad's border the alpha must stay at most 2 / 255 (no edge can show).
   CONTROL: the same with the border window off (uWin 0) must show an edge somewhere. */
import { row } from '../core/rows.js';

export async function checkRainQuads(){ const d=[], notes=[]; let n=0; const miss=x=>d.push(x);
  const H=await import('../../../apps/night/scene/host.js'), T=await H.loadThree(), G=await import('../../../apps/night/rooms/rain/rain-glass.js');
  const W=512, Hh=256, canvas=document.createElement('canvas'), r=new T.WebGLRenderer({ canvas, antialias:false, preserveDrawingBuffer:true, alpha:true, premultipliedAlpha:true }); r.setPixelRatio(1); r.setSize(W, Hh, false); r.setClearColor(0x000000, 0);
  const items=[]; for(let k=0;k<=17;k++) for(const [sz, dep] of [[0.004, 0.1], [0.012, 0.6], [0.03, 0.95]]) items.push([k, sz, dep]);
  const N=items.length, g=new T.InstancedBufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3)); g.setIndex([0,1,2, 0,2,3]);
  const R4=new Float32Array(N*4), K4=new Float32Array(N*4), D1=new Float32Array(N), cols=12, foc=new T.Vector3(0.1, 4, 0.04), uPx=Hh/2/0.5, quads=[];
  items.forEach(([k, sz, dep], i)=>{ const cx=-0.9+(i%cols)*0.16, cy=-0.42+Math.floor(i/cols)*0.2, hw=sz*(k===9 || k===7 ? 1 : 0.4), hh=sz/2; R4.set([cx, cy, hw, hh], i*4); K4.set([k, 0.3, 3+8*(k%4)+64, 1], i*4); D1[i]=dep;
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
  finally{ g.dispose(); m.dispose(); r.dispose(); r.forceContextLoss(); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.987, night:true, name:'RAIN no quad edges', drawn:true, run:()=>checkRainQuads(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
