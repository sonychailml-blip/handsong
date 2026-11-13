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
   emblem's dot flares, then lifts off and flies deep into the forest, becoming one of its fireflies (DOT, dotFlight).
   NIGHT-13b: THE DOT IS STEADY — one element from the tap to its landing, above the start card, the reveal and the mist. After the tap it waits for the
   layout to settle (a full screen entered in the tap: fsAsking, then quiet for DOT.quietMs; any resize; at most DOT.gateMaxMs), then sits exactly on the
   emblem's dot (re-measured every frame while the card shows) and flares; any later resize or full-screen change stops its clock and hides it until the
   layout is quiet again, then it goes on from its place in the new layout (the emblem's, or its old place scaled to the new screen). A soft trail follows
   the flight (#nightDotTrail); at the landing the room makes that firefly swell (fly.land). ?probe&dotnogate: the old way (no gate, no re-measure) —
   the CONTROL of «NIGHT dot flight». */
import { ROOMS, roomById } from './rooms/index.js';
import { ROOM_IDS, roomFov } from './pure/room.js';
import { STILL, DOT, stillPhase, stillLook, stillDot, dotFlight, dotFlare, dotGate, stillFile, stillFit, stillTan } from './pure/still.js';
import { fsAsking } from './fullscreen.js';   // NIGHT-13b: a full screen asked in the Begin tap — the dot waits for it to settle
import { silScreen } from './rooms/forest/pure/sil.js';
import { tintApply, tintNow } from './tint.js';

const $=id=>document.getElementById(id);
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const Q=new URLSearchParams(location.search), NONE=Q.has('probe') && Q.has('nostill'), OLD=Q.has('probe') && Q.has('oldstill'), NOGATE=Q.has('probe') && Q.has('dotnogate');
const PLAIN=(()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } })();
const S={ tapped:false, ended:null, readyAt:null, dot0:null, room:null, rec:null, base:null, file:null, level:null, frame:0, draws:0, freeze:false, pin:null, phase:'start', look:null, dot:null,
  state:()=>'other', rest:null, fly:null, flyI:null, raf:0, lights:null, fit:null, fitKey:'', sprites:null, overDrawn:0,
  d:{ st:'off', tapAt:null, last:null, flareT:0, flyT:0, home:null, from:null, vw:0, vh:0, dirty:false, landed:false, trail:[], peak:0, log:[] }, lastChange:null };   // NIGHT-13b: the dot

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
  if(P.phase==='done'){ el.hidden=true; el.style.removeProperty('-webkit-mask-image'); el.style.removeProperty('mask-image'); if(mist) mist.hidden=true; S.look={ clear:2, opacity:0, mist:0 }; return P; }
  const L= P.phase==='reveal' ? stillLook(P.p, PLAIN || !room) : { clear:-1, opacity:1, mist:0 }; S.look=L;
  el.style.opacity= L.opacity<1 ? L.opacity.toFixed(3) : '';
  if(L.clear>0){ const a=((L.clear-STILL.soft)*100).toFixed(1), b=(L.clear*100).toFixed(1), m=`radial-gradient(ellipse farthest-corner at ${STILL.far[0]*100}% ${STILL.far[1]*100}%, transparent ${a}%, #000 ${b}%)`;
    el.style.webkitMaskImage=m; el.style.maskImage=m; } else { el.style.removeProperty('-webkit-mask-image'); el.style.removeProperty('mask-image'); }
  if(mist){ mist.hidden=!(L.mist>0); mist.style.setProperty('--still-mist', L.mist.toFixed(3)); }   // the mist over the still and the live room alike
  return P;
}
/* NIGHT-13b: THE DOT, frame by frame on its own clock (dt ms; P the still's phase at `at`) */
function dotLook(dot, D, glow, halo, ha){ dot.hidden=false; dot.style.transform=`translate(${(D.x-D.r).toFixed(1)}px, ${(D.y-D.r).toFixed(1)}px)`; dot.style.width=dot.style.height=(2*D.r).toFixed(2)+'px';
  dot.style.opacity=D.a.toFixed(3); dot.style.setProperty('--dot-glow', glow.toFixed(3)); dot.style.setProperty('--dot-halo', halo.toFixed(3)); dot.style.setProperty('--dot-halo-a', ha.toFixed(3)); }
function trailDraw(now){
  const c=$('nightDotTrail'); if(!c) return; const g=c.getContext('2d'); if(!g) return; const T=S.d.trail;
  const k=Math.min(1.5, window.devicePixelRatio||1), w=Math.round(innerWidth*k), h=Math.round(innerHeight*k); if(c.width!==w || c.height!==h){ c.width=w; c.height=h; }
  g.clearRect(0,0,w,h); if(!T.length) return;
  const m=tintNow().match(/\d+(\.\d+)?/g)||[200,245,106], rgb=m.slice(0,3).map(Number).join(',');
  for(const p of T){ const f=1-(S.d.flyT-p.t)/DOT.trailMs; if(f<=0) continue; const R=Math.max(1.5, p.r*3.2)*k*(0.45+0.55*f), gr=g.createRadialGradient(p.x*k, p.y*k, 0, p.x*k, p.y*k, R);
    gr.addColorStop(0, `rgba(${rgb},${(0.32*f*p.a).toFixed(3)})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle=gr; g.beginPath(); g.arc(p.x*k, p.y*k, R, 0, 6.2832); g.fill(); }
}
const cardOn=()=>{ const sc=$('start'); return !!sc && sc.classList.contains('on'); };
function dotStep(now, P, at){
  const dot=$('nightStillDot'), d=S.d; if(!dot) return;
  const dt= d.last==null ? 0 : Math.min(100, now-d.last); d.last=now;
  const room=S.state()!=='other';
  if(PLAIN || NONE || d.st==='off' || d.st==='done' || (!room && d.st!=='gate')){ if(d.st!=='off' && d.st!=='done' && !room){ d.st='done'; } dot.hidden=true; if(d.trail.length){ d.trail.length=0; trailDraw(now); } S.dot=d.st==='done' ? null : S.dot; return; }
  const unsettled=!NOGATE && (fsAsking() || (S.lastChange!=null && now-S.lastChange<DOT.quietMs));
  if(d.st==='gate'){
    if(!room){ dot.hidden=true; if(S.phase==='done') d.st='done'; return; }   // another background: no dot (its loop ends with the still's)
    if(NOGATE || dotGate({ tapAt:d.tapAt, now, lastChange:S.lastChange, asking:fsAsking() })){ d.home=dotHome() || S.dot0; if(!d.home){ d.st='done'; dot.hidden=true; return; }
      d.vw=innerWidth; d.vh=innerHeight; d.st='flare'; d.flareT=0; const g=glowEl(); if(g) g.classList.add('night-dot-out'); d.log.push({ t:Math.round(now), ev:'flare', home:{ ...d.home } }); }
    else { dot.hidden=true; return; } }
  /* the layout is changing: the dot holds its clock and hides; once quiet it goes on from its place in the new layout */
  if(unsettled){ if(!d.dirty) d.log.push({ t:Math.round(now), ev:'hold' }); d.dirty=true; dot.hidden=true; S.dot={ ...(S.dot||{}), hidden:true, st:d.st }; return; }
  if(d.dirty){ d.dirty=false; const kx=innerWidth/(d.vw||innerWidth), ky=innerHeight/(d.vh||innerHeight), sc=q=>q && { ...q, x:q.x*kx, y:q.y*ky };
    const h=cardOn() ? dotHome() : null; d.home= h || sc(d.home); d.from=sc(d.from); d.trail=d.trail.map(p=>({ ...p, x:p.x*kx, y:p.y*ky })); d.vw=innerWidth; d.vh=innerHeight; d.log.push({ t:Math.round(now), ev:'resume', home:{ ...d.home } }); }
  if(!NOGATE && cardOn() && (d.st==='flare' || d.st==='held')){ const h=dotHome(); if(h) d.home=h; }   // exactly on the emblem's dot while the card shows
  let D, glow, halo, ha=1, q=0, B=null;
  if(d.st==='flare'){ d.flareT+=dt; const F=dotFlare(d.flareT); glow=F.glow; halo=F.halo; ha=1+0.6*Math.max(0, (F.halo-DOT.haloHeld)/(DOT.haloPeak-DOT.haloHeld)); D={ ...d.home, a:1 }; if(d.flareT>=DOT.flareMs) d.st='held'; }
  else if(d.st==='held'){ const breathe= P.phase==='wait' ? 0.9+0.1*Math.sin(now/420) : 1; glow=DOT.glowHeld*breathe; halo=DOT.haloHeld*breathe; D={ ...d.home, a:1 };
    if(P.phase==='done' || (P.t0!=null && at>=P.t0 && (P.phase==='reveal'))){ d.st='fly'; d.flyT=0; d.from={ ...d.home }; d.log.push({ t:Math.round(now), ev:'fly' }); } }
  if(d.st==='fly'){ d.flyT+=dt; q=Math.min(1, d.flyT/DOT.flyMs); B=dotTarget();
    D= B ? dotFlight(q, d.from, B, innerHeight) : stillDot(q, d.from.x, d.from.y, innerWidth, innerHeight); glow=D.glow; halo=D.halo;
    d.trail.push({ x:D.x, y:D.y, r:D.r, a:D.a, t:d.flyT }); while(d.trail.length && d.flyT-d.trail[0].t>DOT.trailMs) d.trail.shift();
    if(!d.landed && q>=DOT.landFrom && B && S.fly && S.fly.land){ d.landed=true; try{ S.fly.land(B.i); }catch(e){} d.log.push({ t:Math.round(now), ev:'land', i:B.i }); }
    if(q>=1){ d.st='done'; dot.hidden=true; d.trail.length=0; trailDraw(now); S.dot={ x:D.x, y:D.y, r:D.r, a:0, q:1, glow, halo, to:B ? { x:B.x, y:B.y, r:B.r, i:B.i } : null, st:'done' }; d.log.push({ t:Math.round(now), ev:'done' }); return; } }
  d.peak=Math.max(d.peak, glow);
  dotLook(dot, D, glow, halo, ha); trailDraw(now);
  S.dot={ x:D.x, y:D.y, r:D.r, a:D.a, q, glow, halo, st:d.st, to:B ? { x:B.x, y:B.y, r:B.r, i:B.i } : null, home:d.home ? { ...d.home } : null };
}
function loop(now){
  S.raf=0; S.frame++;
  if(!S.freeze && S.lights && (S.frame%2===0 || !S.draws) && S.phase!=='done' && !PLAIN) lightsDraw(now);
  const P=apply(now)||{ phase:S.phase }, at=S.pin!=null && P.t0!=null ? P.t0+S.pin*(PLAIN ? STILL.fadeMs : STILL.revealMs) : now;
  dotStep(now, P, at);
  if(S.phase!=='done' || (S.d.st!=='off' && S.d.st!=='done')) S.raf=requestAnimationFrame(loop);   // NIGHT-13b: the dot outlives the reveal
}
/* main.js: how the live room stands — 'other' (Dark or Camera: a plain fade), 'stand-in' (no WebGL: the 2D picture is there at once), 'wait', 'ready';
   NIGHT-13 o: { rest(on) — hold the room's camera at rest (the pose the still was drawn from), fly: { pick(), at(i) } — the firefly the dot becomes } */
export function stillWire(state, o={}){ if(typeof state==='function') S.state=state; if(o.rest && !OLD && !NONE){ S.rest=o.rest; restSet(S.phase!=='done'); } if(o.fly) S.fly=o.fly; }
/* probe only: freeze (the lights held still), pin (the reveal held at progress 0…1 — captures at fixed moments; null releases it); → the state */
export function stillDbg(o={}){ if('freeze' in o) S.freeze=!!o.freeze; if('pin' in o) S.pin= o.pin==null ? null : Math.max(0, Math.min(1, +o.pin));
  const el=$('nightStill'); return { phase:S.phase, ended:S.ended, readyAt:S.readyAt, room:S.room, level:S.level, file:S.file, plain:PLAIN, none:NONE, old:OLD, nogate:NOGATE, look:S.look, dot:S.dot, draws:S.draws,
    dotSt:S.d.st, dotPeak:S.d.peak, dotLog:S.d.log.slice(), emblem:dotHome(),
    shown:!!el && !el.hidden, image:el ? getComputedStyle(el).backgroundImage : '', state:S.state(), fit:S.fit, sprites:!!S.sprites, overDrawn:S.overDrawn, flyI:S.flyI,
    pulse:S.d.peak>=DOT.glowPeak*0.95 }; }

/* at once: the room's still and tint, its place on this screen, the lights, the watch on the start card */
(function start(){
  if(!$('nightStill')) return;
  try{ pick(); layout(); }catch(e){ console.warn('[night] the start still:', e); }   // eslint-disable-line no-console
  addEventListener('resize', ()=>{ S.fitKey=''; layout(); });
  S.lights=lightsMake(); if(PLAIN) lightsDraw(performance.now());
  const sc=$('start'), begin=$('nightBegin');
  if(begin) begin.addEventListener('click', ()=>{ S.dot0=dotHome(); S.tapped=true; if(!PLAIN && !NONE && S.d.st==='off'){ S.d.st='gate'; S.d.tapAt=performance.now(); S.d.log.push({ t:Math.round(S.d.tapAt), ev:'tap', home:S.dot0 }); if(S.raf===0) S.raf=requestAnimationFrame(loop); } }, true);   // NIGHT-13b: the dot's gate, then its flare
  const changed=()=>{ S.lastChange=performance.now(); if(S.d.st!=='off' && S.d.st!=='done') S.d.log.push({ t:Math.round(S.lastChange), ev:'change', w:innerWidth, h:innerHeight }); };
  addEventListener('resize', changed); document.addEventListener('fullscreenchange', changed); document.addEventListener('webkitfullscreenchange', changed);
  if(window.visualViewport) window.visualViewport.addEventListener('resize', changed);
  if(sc) new MutationObserver(()=>{ if(S.ended==null && !sc.classList.contains('on')){ S.ended=performance.now(); if(!S.dot0) S.dot0=dotHome(); } }).observe(sc, { attributes:true, attributeFilter:['class'] });
  S.raf=requestAnimationFrame(loop);
})();
