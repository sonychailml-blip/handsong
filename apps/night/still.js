/* DESIGN-1 part D: THE START SCREEN'S STILL, ITS LIGHTS AND THE REVEAL (the law: pure/still.js). Loaded by its own module tag before main.js, so it runs
   as soon as its few modules arrive; the page's CSS already shows the first room's still from the first paint (night.css; guard.js picks the level's
   file). Here: the remembered room's own still and tint, a few slowly drifting lights drawn in 2D (no WebGL before Begin; still in reduced motion),
   and, once the start ends, the reveal — the still keeps covering until the live room is drawn and faded in (main.js tells it how the room stands:
   stillWire), then clears from the far point outwards through a mist; a late room keeps the still breathing; reduced motion or another background: a
   plain fade. ?probe&nostill: the old way (no still after the start) — a row's CONTROL.
   NIGHT-13: THE STILL LINES UP WITH THE LIVE ROOM on every screen — it is the room's world through a wider lens, placed by the room's own lens law
   (stillFit: the same size, the same centre), its screen layer (the corner silhouettes on a canvas, the vignette in night.css) drawn per screen, the
   room's camera held at rest until the reveal is over (sceneRest through main.js); re-placed on every resize. ?probe&oldstill: DESIGN-1's fit (a 1.6 : 1
   frame covering the screen at 42 % — today's mismatch), the CONTROL of the row «NIGHT still matches the live room». And the dot: at the Begin tap the
   emblem's dot brightens and grows a halo (night.css), then lifts off and flies deep into the forest, becoming one of its fireflies (DOT, dotFlight). */
import { ROOMS, roomById } from './rooms/index.js';
import { ROOM_IDS, roomFov } from './pure/room.js';
import { STILL, DOT, stillPhase, stillLook, stillDot, dotFlight, stillFile, stillFit, stillTan } from './pure/still.js';
import { silScreen } from './rooms/forest/pure/sil.js';
import { tintApply, tintNow } from './tint.js';

const $=id=>document.getElementById(id);
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const Q=new URLSearchParams(location.search), NONE=Q.has('probe') && Q.has('nostill'), OLD=Q.has('probe') && Q.has('oldstill');
const PLAIN=(()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } })();
const S={ tapped:false, ended:null, readyAt:null, dot0:null, room:null, rec:null, base:null, file:null, level:null, frame:0, draws:0, freeze:false, pin:null, phase:'start', look:null, dot:null,
  state:()=>'other', rest:null, fly:null, flyI:null, raf:0, lights:null, fit:null, fitKey:'', sprites:null, overDrawn:0 };

/* the room the start screen shows: the remembered real room, else the first; its still for the stored level; its tint on the interface at once */
function pick(){
  const id=load('handsong.nightRoom'), R=(id && ROOM_IDS.includes(id) && roomById(id)) || ROOMS[0], lv=load('handsong.sceneLevel');
  S.room=R.record.id; S.rec=R.record; S.base=R.base; S.level= lv==='full' ? 'full' : 'reduced'; S.file=stillFile(R.record, S.level);
  const el=$('nightStill'); if(el && S.file){ const url=new URL(S.file, R.base).href, cs=getComputedStyle(el).backgroundImage;
    if(!cs.includes(url)) el.style.backgroundImage=`${getComputedStyle(document.documentElement).getPropertyValue('--night-still-veil').trim()||'none'}, url("${url}")`; }   // the CSS default (the first room's) already shows it otherwise: no second request
  const O=R.record.still && R.record.still.over;
  if(O && O.sprites && !OLD){ const img=new Image(); img.decoding='async'; img.onload=()=>{ S.sprites=img; S.fitKey=''; }; img.src=new URL(O.sprites, R.base).href; }
  tintApply(R.record, { now:true });
}
/* NIGHT-13: THE STILL'S PLACE — the box is the live canvas's (100vw × 100vh, the still's own element), the view the room's camera (innerWidth × innerHeight) */
function layout(){
  const el=$('nightStill'); if(!el || !S.rec || !S.rec.still || !S.rec.view) return;
  const r=el.getBoundingClientRect(), bw=r.width, bh=r.height, vw=innerWidth, vh=innerHeight, key=[bw, bh, vw, vh, !!S.sprites].join();
  if(!bw || !bh || key===S.fitKey) return; S.fitKey=key;
  const st=S.rec.still, fov=roomFov(S.rec.view, vw, vh);
  let F=stillFit(st, fov, bw, bh, vw, vh);
  if(OLD){ const T=stillTan(S.rec.view.fov), s=Math.max(bw/1280, bh/800), W0=1280*s, H0=800*s, cx=(bw-W0)*0.5+W0/2, cy=(bh-H0)*0.42+H0/2, h=H0*stillTan(st.fov)/T, w=h*st.aspect;   // DESIGN-1's fit, today's mismatch: a 55° 1.6 : 1 frame covering at 42 %
    F={ w, h, x:cx-w/2, y:cy-h/2, cover:false, old:true }; }
  S.fit={ ...F, bw, bh, vw, vh, fov };
  el.style.backgroundSize=`100% 100%, ${F.w.toFixed(2)}px ${F.h.toFixed(2)}px`; el.style.backgroundPosition=`0 0, ${F.x.toFixed(2)}px ${F.y.toFixed(2)}px`;
  overDraw(bw, bh, vw/vh);
}
/* the screen layer: the room's corner silhouettes at their places for this screen (the vignette is night.css's) */
function overDraw(bw, bh, a){
  const c=$('nightStillOver'); if(!c) return; const g=c.getContext('2d'); if(!g) return;
  const k=Math.min(1.5, window.devicePixelRatio||1), w=Math.round(bw*k), h=Math.round(bh*k); if(c.width!==w || c.height!==h){ c.width=w; c.height=h; }
  g.clearRect(0,0,w,h); const O=S.rec.still.over; if(!O || !S.sprites || OLD) return;
  for(const o of O.sil){ const P=silScreen(o, bw, bh, a), q=O.rects[o.kind]; if(!q) continue;
    g.save(); g.translate(P.x*k, P.y*k); g.rotate(-P.rot); g.scale(P.flip ? -1 : 1, 1); g.drawImage(S.sprites, q[0], q[1], q[2], q[3], -P.w*k/2, -P.h*k/2, P.w*k, P.h*k); g.restore(); }
  S.overDrawn++;
}
/* THE LIGHTS: a few soft points in the room's tint, each on its own slow loop; 30 frames a second at most, drawn once in reduced motion */
function seeded(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function lightsMake(){ const r=seeded(0x4e494748), L=[]; for(let i=0;i<9;i++) L.push({ x:0.08+0.84*r(), y:0.35+0.55*r(), rad:1.3+1.3*r(), ax:10+22*r(), ay:6+14*r(), px:7+8*r(), py:9+9*r(), pb:3+3.5*r(), ph:6.28*r() }); return L; }
function lightsDraw(t){
  const c=$('nightStillLights'); if(!c) return; const g=c.getContext('2d'); if(!g) return;
  const k=Math.min(1.5, window.devicePixelRatio||1), w=Math.round(innerWidth*k), h=Math.round(innerHeight*k); if(c.width!==w || c.height!==h){ c.width=w; c.height=h; }
  const m=tintNow().match(/\d+(\.\d+)?/g)||[200,245,106], rgb=m.slice(0,3).map(Number).join(',');
  g.clearRect(0,0,w,h); S.draws++;
  for(const q of S.lights){ const s=t/1000, x=(q.x*innerWidth+q.ax*Math.sin(s*6.283/q.px+q.ph))*k, y=(q.y*innerHeight+q.ay*Math.sin(s*6.283/q.py+q.ph*1.7))*k;
    const b=0.45+0.55*(0.5+0.5*Math.sin(s*6.283/q.pb+q.ph)), R=q.rad*9*k, gr=g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, `rgba(${rgb},${(0.42*b).toFixed(3)})`); gr.addColorStop(0.18, `rgba(${rgb},${(0.16*b).toFixed(3)})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle=gr; g.beginPath(); g.arc(x, y, R, 0, 6.2832); g.fill();
    g.fillStyle=`rgba(255,255,240,${(0.7*b).toFixed(3)})`; g.beginPath(); g.arc(x, y, q.rad*k*0.7, 0, 6.2832); g.fill(); }
}
/* the start's end: the start card's own class; the emblem's dot noted at the Begin tap (its place and radius on the card) */
const glowEl=()=>document.querySelector('.night-start-head .emblem-glow');
function dotHome(){ const e=glowEl(); if(!e) return null; const r=e.getBoundingClientRect(); return r.width ? { x:r.x+r.width/2, y:r.y+r.height/2, r:r.width/2 } : null; }
/* the dot's target: the firefly it becomes (picked once the flight begins, followed after), in the box's px; none (the stand-in, a probe): the fixed point */
function dotTarget(){
  if(!S.fly || !S.fit) return null;
  if(S.flyI==null) S.flyI=S.fly.pick();
  const f=S.flyI==null ? null : S.fly.at(S.flyI); if(!f) return null;
  return { x:f.x*S.fit.bw/S.fit.vw, y:f.y*S.fit.bh/S.fit.vh, r:Math.max(0.6, f.r), i:f.i };
}
function restSet(on){ if(S.rest) try{ S.rest(on); }catch(e){} }
function apply(now){
  const el=$('nightStill'), dot=$('nightStillDot'), mist=$('nightStillMist'); if(!el) return;
  layout();
  const st=S.state(), room=st!=='other';
  if((S.tapped || S.ended!=null) && S.readyAt==null && (st==='ready' || st==='stand-in')) S.readyAt=now;   // from the Begin tap: a room ready under the start card is revealed at the start's end, no extra wait
  const at= S.pin!=null && S.ended!=null ? (()=>{ const P=stillPhase({ ended:S.ended, readyAt:S.readyAt, room, plain:PLAIN, none:NONE }, now); return P.t0!=null ? P.t0+S.pin*(PLAIN || !room ? STILL.fadeMs : STILL.revealMs) : now; })() : now;
  const P=stillPhase({ ended:S.ended, readyAt:S.readyAt, room, plain:PLAIN, none:NONE }, at), was=S.phase; S.phase=P.phase;
  if(P.phase==='done' && was!=='done') restSet(false);   // NIGHT-13: the room's camera comes back to life once the still is gone
  el.classList.toggle('breathe', P.phase==='wait' && !PLAIN);
  if(P.phase==='done'){ el.hidden=true; el.style.removeProperty('-webkit-mask-image'); el.style.removeProperty('mask-image'); if(dot) dot.hidden=true; if(mist) mist.hidden=true; S.look={ clear:2, opacity:0, mist:0 }; S.dot=null; return; }
  const L= P.phase==='reveal' ? stillLook(P.p, PLAIN || !room) : { clear:-1, opacity:1, mist:0 }; S.look=L;
  el.style.opacity= L.opacity<1 ? L.opacity.toFixed(3) : '';
  if(L.clear>0){ const a=((L.clear-STILL.soft)*100).toFixed(1), b=(L.clear*100).toFixed(1), m=`radial-gradient(ellipse farthest-corner at ${STILL.far[0]*100}% ${STILL.far[1]*100}%, transparent ${a}%, #000 ${b}%)`;
    el.style.webkitMaskImage=m; el.style.maskImage=m; } else { el.style.removeProperty('-webkit-mask-image'); el.style.removeProperty('mask-image'); }
  if(mist){ mist.hidden=!(L.mist>0); mist.style.setProperty('--still-mist', L.mist.toFixed(3)); }   // the mist over the still and the live room alike
  /* the dot: shown once the start ended (the card gone) at the emblem's place and look, still while the room is late, then its flight into the forest; never in reduced motion */
  if(dot){ const show=!PLAIN && room && S.ended!=null && S.dot0;
    if(!show){ dot.hidden=true; S.dot=null; }
    else { const q= P.phase==='reveal' ? Math.min(1, (at-P.t0)/DOT.flyMs) : 0, B= q>0 ? dotTarget() : null;
      const D= B ? dotFlight(q, S.dot0, B, innerHeight) : (q>0 ? stillDot(q, S.dot0.x, S.dot0.y, innerWidth, innerHeight) : dotFlight(0, S.dot0, S.dot0, innerHeight));
      const pulse= P.phase==='wait' ? 0.85+0.15*Math.sin(now/420) : 1, glow=D.glow==null ? 1 : D.glow, halo=D.halo==null ? 1 : D.halo;
      dot.hidden=false; dot.style.transform=`translate(${(D.x-D.r).toFixed(1)}px, ${(D.y-D.r).toFixed(1)}px)`; dot.style.width=dot.style.height=(2*D.r).toFixed(2)+'px'; dot.style.opacity=(D.a*pulse).toFixed(3);
      dot.style.setProperty('--dot-glow', glow.toFixed(3)); dot.style.setProperty('--dot-halo', (halo*pulse).toFixed(3));
      S.dot={ x:D.x, y:D.y, r:D.r, a:D.a*pulse, q, glow, halo, to:B ? { x:B.x, y:B.y, r:B.r, i:B.i } : null }; } }
}
function loop(now){
  S.raf=0; S.frame++;
  if(!S.freeze && S.lights && (S.frame%2===0 || !S.draws) && !PLAIN) lightsDraw(now);
  apply(now);
  if(S.phase!=='done') S.raf=requestAnimationFrame(loop);
}
/* main.js: how the live room stands — 'other' (Dark or Camera: a plain fade), 'stand-in' (no WebGL: the 2D picture is there at once), 'wait', 'ready';
   NIGHT-13 o: { rest(on) — hold the room's camera at rest (the pose the still was drawn from), fly: { pick(), at(i) } — the firefly the dot becomes } */
export function stillWire(state, o={}){ if(typeof state==='function') S.state=state; if(o.rest && !OLD && !NONE){ S.rest=o.rest; restSet(S.phase!=='done'); } if(o.fly) S.fly=o.fly; }
/* probe only: freeze (the lights held still), pin (the reveal held at progress 0…1 — captures at fixed moments; null releases it); → the state */
export function stillDbg(o={}){ if('freeze' in o) S.freeze=!!o.freeze; if('pin' in o) S.pin= o.pin==null ? null : Math.max(0, Math.min(1, +o.pin));
  const el=$('nightStill'); return { phase:S.phase, ended:S.ended, readyAt:S.readyAt, room:S.room, level:S.level, file:S.file, plain:PLAIN, none:NONE, old:OLD, look:S.look, dot:S.dot, draws:S.draws,
    shown:!!el && !el.hidden, image:el ? getComputedStyle(el).backgroundImage : '', state:S.state(), fit:S.fit, sprites:!!S.sprites, overDrawn:S.overDrawn, flyI:S.flyI,
    pulse:!!(glowEl() && glowEl().classList.contains('night-dot-pulse')) }; }

/* at once: the room's still and tint, its place on this screen, the lights, the watch on the start card */
(function start(){
  if(!$('nightStill')) return;
  try{ pick(); layout(); }catch(e){ console.warn('[night] the start still:', e); }   // eslint-disable-line no-console
  addEventListener('resize', ()=>{ S.fitKey=''; layout(); });
  S.lights=lightsMake(); if(PLAIN) lightsDraw(performance.now());
  const sc=$('start'), begin=$('nightBegin');
  if(begin) begin.addEventListener('click', ()=>{ S.dot0=dotHome(); S.tapped=true; const g=glowEl(); if(g && !PLAIN && !NONE) g.classList.add('night-dot-pulse'); }, true);   // NIGHT-13: the tap's pulse
  if(sc) new MutationObserver(()=>{ if(S.ended==null && !sc.classList.contains('on')){ S.ended=performance.now(); if(!S.dot0) S.dot0=dotHome(); } }).observe(sc, { attributes:true, attributeFilter:['class'] });
  S.raf=requestAnimationFrame(loop);
})();
