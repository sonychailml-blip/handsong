/* RUN 9 (slice 4) — THE FOREST'S RARE EVENTS (every few minutes, never the same kind twice in a row; the schedule is core/night.js
   rareStep, seeded): a FALLING STAR streaks across the sky (one additive plane, 1.4 s); a GLOWING FLOWER opens at the playing light's foot when
   a note is held long (seven petals unfold in 3 s, stay ~18 s, close in 4 s; it brightens with each note); the wild fireflies form the
   FIVE-DOT EMBLEM for a moment (core/fireflies.js `form`: 3 flies per dot spring to it, hold, and are let go). Parts of the forest room. */
import { seeded } from '../../core/dsp.js';
import { forestGround } from '../../core/fireflies.js';
import { streamNear, STREAM } from '../../core/forestlife.js';
import { RARE, rareInit, rareStep, emblemPoints, EMBLEM_AT } from '../../core/night.js';

export const RARE_LOOK=Object.freeze({ star:1.4, bloomOpen:3, bloomHold:18, bloomClose:4, embIn:2.5, embHold:3.5, embOut:2, held:30 });
const smooth=u=>{ u=Math.max(0, Math.min(1, u)); return u*u*(3-2*u); };
/* ctx: { T, s, C, pal, own, canvas2, tex, halo (the soft round texture) } → { step(dt, t, F), form(), glint(), force(kind, t, F), held(sec), state() } */
export function buildRare(ctx){
  const { T, s, C, pal, own, canvas2, tex, halo }=ctx, R=seeded(RARE.seed^0x5A5A5A5A);
  let st=null, held=0, star=null, bloom=null, emb=null, hist=[];
  /* the star: a streak texture (bright head on the right, a fading tail) */
  const [sc,sx]=canvas2(256,16); { const g=sx.createLinearGradient(0,0,256,0); g.addColorStop(0,C('halo-a0')); g.addColorStop(0.85,C('halo-a45')); g.addColorStop(1,C('halo-a100')); sx.fillStyle=g; sx.fillRect(0,0,256,16);
    sx.globalCompositeOperation='destination-in'; const v=sx.createLinearGradient(0,0,0,16); v.addColorStop(0,C('halo-a0')); v.addColorStop(0.5,C('halo-a100')); v.addColorStop(1,C('halo-a0')); sx.fillStyle=v; sx.fillRect(0,0,256,16); }
  const starT=tex(sc,true); starT.wrapS=starT.wrapT=T.ClampToEdgeWrapping;
  const STAR=new T.Color(C('forest-core')), starM=new T.MeshBasicMaterial({ map:starT, color:STAR.clone(), transparent:true, opacity:0, depthWrite:false, depthTest:false, blending:T.AdditiveBlending, fog:false });
  const starG=new T.PlaneGeometry(1,1); starG.translate(-0.5,0,0); const starMesh=new T.Mesh(starG, starM); starMesh.visible=false; s.add(starMesh); own.push(starM, starG);
  /* the flower: seven petals hinged at the centre + a glow */
  const [pc,px]=canvas2(32,64); { const g=px.createRadialGradient(16,40,0,16,40,30); g.addColorStop(0,C('halo-a100')); g.addColorStop(1,C('halo-a10')); px.fillStyle=g; px.beginPath(); px.ellipse(16,34,13,30,0,0,6.283); px.fill(); }
  const petG=new T.PlaneGeometry(0.13,0.3); petG.translate(0,0.15,0); const petM=new T.MeshBasicMaterial({ map:tex(pc,true), color:pal.bloom.clone(), alphaTest:0.3, side:T.DoubleSide }); own.push(petG, petM);
  const flower=new T.Group(), petals=[]; for(let i=0;i<7;i++){ const pv=new T.Object3D(); pv.rotation.y=i*Math.PI*2/7; const m=new T.Mesh(petG, petM); pv.add(m); flower.add(pv); petals.push(m); }
  const fGlow=new T.Sprite(new T.SpriteMaterial({ map:halo, color:pal.bloom.clone(), transparent:true, opacity:0, depthWrite:false, blending:T.AdditiveBlending })); fGlow.position.y=0.12; flower.add(fGlow); own.push(fGlow.material);
  flower.visible=false; s.add(flower);
  const EP=emblemPoints();
  function start(kind, t, F){
    hist.push({ kind, t }); if(hist.length>20) hist.shift();
    if(kind==='star'){ const dn=0.35+R()*0.35, a= R()<0.5 ? -dn : Math.PI+dn; star={ t0:t, x:(R()*2-1)*8, y:16.5+R()*5, z:-40, a, len:5+R()*3 }; }   // far, drawn over the trunks (no open sky in this forest: a dark trunk reads as night sky)
    else if(kind==='bloom'){ let x=F.light.x, z=F.light.z+0.5; for(let k=0;k<8 && streamNear(x,z).d<STREAM.half+0.25;k++) x+=0.35; bloom={ t0:t, x, z, pulse:0 }; flower.position.set(x, forestGround(x,z)+0.01, z); }
    else if(kind==='emblem'){ const used=new Set(), to=[]; F.flies.forEach(()=>to.push(null));
      EP.forEach((p,i)=>{ for(let j=0;j<EMBLEM_AT.per;j++){ let bi=-1, bd=Infinity; F.flies.forEach((q,k)=>{ if(used.has(k)) return; const dd=Math.hypot(q.p[0]-p[0], q.p[1]-p[1], q.p[2]-p[2]); if(dd<bd){ bd=dd; bi=k; } });
        if(bi<0) return; used.add(bi); const a=j*2.094; to[bi]=[p[0]+0.06*Math.cos(a), p[1]+0.06*Math.sin(a), p[2]]; } });
      emb={ t0:t, to, ids:[...used] }; }
  }
  /* one frame. F: { light (V3), flies (the core's array), moonK } — the scheduler runs from the first frame */
  function step(dt, t, F){
    if(!st) st=rareInit(RARE.seed, t);
    if(t<st.lastAt) st=rareInit(RARE.seed, t);   // the clock went back (a probe): a new night
    const ev=rareStep(st, t, held); if(ev) start(ev, t, F);
    if(star){ const u=(t-star.t0)/RARE_LOOK.star; if(u>=1 || u<0){ star=null; starMesh.visible=false; starM.opacity=0; }
      else { const e=smooth(u), hx=star.x+Math.cos(star.a)*star.len*e, hy=star.y+Math.sin(star.a)*star.len*e; starMesh.visible=true; starMesh.position.set(hx, hy, star.z); starMesh.rotation.z=star.a;
        starMesh.scale.set(0.6+3.4*Math.sin(Math.PI*u), 0.2, 1); starM.opacity=Math.sin(Math.PI*u); starM.color.copy(STAR); } }
    if(bloom){ const a=t-bloom.t0, L=RARE_LOOK; let open= a<L.bloomOpen ? smooth(a/L.bloomOpen) : a<L.bloomOpen+L.bloomHold ? 1 : 1-smooth((a-L.bloomOpen-L.bloomHold)/L.bloomClose);
      if(a>L.bloomOpen+L.bloomHold+L.bloomClose || a<0){ bloom=null; flower.visible=false; }
      else { bloom.pulse*=Math.exp(-dt/0.8); bloom.open=open; flower.visible=true; petals.forEach(m=>{ m.rotation.x=0.15+1.1*open; });
        const g=0.25+0.75*open+0.6*bloom.pulse; petM.color.copy(pal.bloom).multiplyScalar(0.15+0.4*g); fGlow.material.color.copy(pal.bloom); fGlow.material.opacity=0.6*open*(0.7+0.3*Math.min(1,g)); fGlow.scale.setScalar(0.5+0.6*open+0.3*bloom.pulse); } }
    if(emb){ const a=t-emb.t0, L=RARE_LOOK; emb.k= a<L.embIn ? smooth(a/L.embIn) : a<L.embIn+L.embHold ? 1 : 1-smooth((a-L.embIn-L.embHold)/L.embOut);
      if(a>L.embIn+L.embHold+L.embOut || a<0) emb=null; }
  }
  const form=()=>emb && emb.k>0 ? { to:emb.to, k:emb.k } : null;
  const glint=()=>{ if(bloom) bloom.pulse=Math.min(1, bloom.pulse+0.5); };
  const err=F=>emb ? emb.ids.reduce((s2,k)=>s2+Math.hypot(...[0,1,2].map(a=>F[k].p[a]-emb.to[k][a])),0)/emb.ids.length : null;
  const state=F=>({ next:st?st.next:null, last:st?st.last:null, n:st?st.n:0, held, hist:hist.slice(), star:star ? { on:starM.opacity, x:starMesh.position.x, y:starMesh.position.y } : null,
    bloom:bloom ? { open:bloom.open||0, x:bloom.x, z:bloom.z } : null, emblem:emb ? { k:emb.k, err:err(F), ids:emb.ids.slice(), to:emb.ids.map(k=>emb.to[k]) } : null });
  return { step, form, glint, force:start, held:sec=>{ held= sec>0 && sec<RARE_LOOK.held ? sec : 0; }, state };
}
