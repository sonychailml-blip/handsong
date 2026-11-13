/* DESIGN-1 part D: THE START SCREEN'S STILL, ITS LIGHTS AND THE REVEAL (the law: pure/still.js). Loaded by its own module tag before main.js, so it runs
   as soon as its few modules arrive; the page's CSS already shows the first room's still from the first paint (night.css; guard.js picks the level's
   file). Here: the remembered room's own still and tint, a few slowly drifting lights drawn in 2D (no WebGL before Begin; still in reduced motion),
   and, once the start ends, the reveal — the still keeps covering until the live room is drawn and faded in (main.js tells it how the room stands:
   stillWire), then clears from the far point outwards through a mist while the emblem's dot drifts in as the first firefly; a late room keeps the
   still breathing; reduced motion or another background: a plain fade. ?probe&nostill: the old way (no still after the start) — a row's CONTROL. */
import { ROOMS, roomById } from './rooms/index.js';
import { ROOM_IDS } from './pure/room.js';
import { STILL, stillPhase, stillLook, stillDot, stillFile } from './pure/still.js';
import { tintApply, tintNow } from './tint.js';

const $=id=>document.getElementById(id);
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const Q=new URLSearchParams(location.search), NONE=Q.has('probe') && Q.has('nostill');
const PLAIN=(()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } })();
const S={ tapped:false, ended:null, readyAt:null, dot0:null, room:null, file:null, level:null, frame:0, draws:0, freeze:false, pin:null, phase:'start', look:null, dot:null, state:()=>'other', raf:0, lights:null };

/* the room the start screen shows: the remembered real room, else the first; its still for the stored level; its tint on the interface at once */
function pick(){
  const id=load('handsong.nightRoom'), R=(id && ROOM_IDS.includes(id) && roomById(id)) || ROOMS[0], lv=load('handsong.sceneLevel');
  S.room=R.record.id; S.level= lv==='full' ? 'full' : 'reduced'; S.file=stillFile(R.record, S.level);
  const el=$('nightStill'); if(el && S.file){ const url=new URL(S.file, R.base).href, cs=getComputedStyle(el).backgroundImage;
    if(!cs.includes(url)) el.style.backgroundImage=`url("${url}")`; }   // the CSS default (the first room's) already shows it otherwise: no second request
  tintApply(R.record, { now:true });
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
/* the start's end: the start card's own class; the emblem's dot noted at the Begin tap (its place on the card) */
function dotHome(){ const e=document.querySelector('.night-start-head .emblem-glow'); if(!e) return null; const r=e.getBoundingClientRect(); return r.width ? [r.x+r.width/2, r.y+r.height/2] : null; }
function apply(now){
  const el=$('nightStill'), dot=$('nightStillDot'), mist=$('nightStillMist'); if(!el) return;
  const st=S.state(), room=st!=='other';
  if((S.tapped || S.ended!=null) && S.readyAt==null && (st==='ready' || st==='stand-in')) S.readyAt=now;   // from the Begin tap: a room ready under the start card is revealed at the start's end, no extra wait
  const at= S.pin!=null && S.ended!=null ? (()=>{ const P=stillPhase({ ended:S.ended, readyAt:S.readyAt, room, plain:PLAIN, none:NONE }, now); return P.t0!=null ? P.t0+S.pin*(PLAIN || !room ? STILL.fadeMs : STILL.revealMs) : now; })() : now;
  const P=stillPhase({ ended:S.ended, readyAt:S.readyAt, room, plain:PLAIN, none:NONE }, at); S.phase=P.phase;
  el.classList.toggle('breathe', P.phase==='wait' && !PLAIN);
  if(P.phase==='done'){ el.hidden=true; el.style.removeProperty('-webkit-mask-image'); el.style.removeProperty('mask-image'); if(dot) dot.hidden=true; if(mist) mist.hidden=true; S.look={ clear:2, opacity:0, mist:0 }; S.dot=null; return; }
  const L= P.phase==='reveal' ? stillLook(P.p, PLAIN || !room) : { clear:-1, opacity:1, mist:0 }; S.look=L;
  el.style.opacity= L.opacity<1 ? L.opacity.toFixed(3) : '';
  if(L.clear>0){ const a=((L.clear-STILL.soft)*100).toFixed(1), b=(L.clear*100).toFixed(1), m=`radial-gradient(ellipse farthest-corner at ${STILL.far[0]*100}% ${STILL.far[1]*100}%, transparent ${a}%, #000 ${b}%)`;
    el.style.webkitMaskImage=m; el.style.maskImage=m; } else { el.style.removeProperty('-webkit-mask-image'); el.style.removeProperty('mask-image'); }
  if(mist){ mist.hidden=!(L.mist>0); mist.style.setProperty('--still-mist', L.mist.toFixed(3)); }   // the mist over the still and the live room alike
  /* the dot: shown once the start ended (the card gone), still while the room is late, drifting with the reveal; never in reduced motion */
  if(dot){ const show=!PLAIN && room && S.ended!=null && S.dot0;
    if(!show){ dot.hidden=true; S.dot=null; }
    else { const q= P.phase==='reveal' ? Math.min(1, (at-P.t0)/STILL.dotMs) : 0, D=stillDot(q, S.dot0[0], S.dot0[1], innerWidth, innerHeight), pulse= P.phase==='wait' ? 0.75+0.25*Math.sin(now/420) : 1;
      dot.hidden=false; dot.style.transform=`translate(${(D.x-D.r).toFixed(1)}px, ${(D.y-D.r).toFixed(1)}px)`; dot.style.width=dot.style.height=(2*D.r).toFixed(2)+'px'; dot.style.opacity=(D.a*pulse).toFixed(3);
      S.dot={ x:D.x, y:D.y, r:D.r, a:D.a*pulse, q }; } }
}
function loop(now){
  S.raf=0; S.frame++;
  if(!S.freeze && S.lights && (S.frame%2===0 || !S.draws) && !PLAIN) lightsDraw(now);
  apply(now);
  if(S.phase!=='done') S.raf=requestAnimationFrame(loop);
}
/* main.js: how the live room stands — 'other' (Dark or Camera: a plain fade), 'stand-in' (no WebGL: the 2D picture is there at once), 'wait', 'ready' */
export function stillWire(state){ if(typeof state==='function') S.state=state; }
/* probe only: freeze (the lights held still), pin (the reveal held at progress 0…1 — captures at fixed moments; null releases it); → the state */
export function stillDbg(o={}){ if('freeze' in o) S.freeze=!!o.freeze; if('pin' in o) S.pin= o.pin==null ? null : Math.max(0, Math.min(1, +o.pin));
  const el=$('nightStill'); return { phase:S.phase, ended:S.ended, readyAt:S.readyAt, room:S.room, level:S.level, file:S.file, plain:PLAIN, none:NONE, look:S.look, dot:S.dot, draws:S.draws,
    shown:!!el && !el.hidden, image:el ? getComputedStyle(el).backgroundImage : '', state:S.state() }; }

/* at once: the room's still and tint, the lights, the watch on the start card */
(function start(){
  if(!$('nightStill')) return;
  try{ pick(); }catch(e){ console.warn('[night] the start still:', e); }   // eslint-disable-line no-console
  S.lights=lightsMake(); if(PLAIN) lightsDraw(performance.now());
  const sc=$('start'), begin=$('nightBegin');
  if(begin) begin.addEventListener('click', ()=>{ S.dot0=dotHome(); S.tapped=true; }, true);
  if(sc) new MutationObserver(()=>{ if(S.ended==null && !sc.classList.contains('on')){ S.ended=performance.now(); if(!S.dot0) S.dot0=dotHome(); } }).observe(sc, { attributes:true, attributeFilter:['class'] });
  S.raf=requestAnimationFrame(loop);
})();
