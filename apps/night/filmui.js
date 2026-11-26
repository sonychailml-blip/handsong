/* SHARE-3 — THE PLAYERS' CLIP BUTTON (the founder's choices: docs/night/SHARE-PLAN.md «The players' interface», «The look: Counter inside»).
   A glass button left of Settings, in the room's light. A tap → 3-2-1 «Raise your hands» (not filmed) → the recording (film.js, quality B): the
   seconds inside the button, a ring around it filling over the minute, the last 10 s counting down in the room's light; a second tap or the
   minute's end stops it. The button stays on screen while counting, recording or hinting (the other controls fade while the hands play).
   The result card plays the clip with ITS OWN sound while the room and the hands are silent (the shell's output fade); «Share» = the system's
   share sheet (shown only where it takes a video); the clip is saved on the device at once (iPhone Safari cannot save by itself: «Save to
   Photos» opens the share sheet). While counting, recording or finishing the room cannot change (the shell asks filmBusy()); leaving the page
   stops the recording and keeps the clip; never while the camera picture is on screen (rule #33). One hint, once on this device, after two
   minutes with a hand up. Page markup only: nothing here enters a clip. */
import { t, onLangChange } from '../../core/i18n.js';
import { svgIcon } from '../../core/icons.js';
import { stackList } from '../../core/legacy-ui/views/stack.js';
import { filmSupport, filmStart, filmStop, filmState, filmShare, filmSave, filmCanShare, FILM } from './film.js';

export const CLIP=Object.freeze({ countMs:3000, endSec:10, quality:'b', hintAfterMs:120e3, hintShowMs:8000, tipMs:3500, ring:2*Math.PI*25, countRing:2*Math.PI*80, hintKey:'handsong.nightClipHint' });
const $=id=>document.getElementById(id);
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const save=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
const IOS=typeof navigator!=='undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent||'') || (/Macintosh/.test(navigator.userAgent||'') && navigator.maxTouchPoints>1));
const cameraOn=()=>stackList().some(m=>m.id==='camera' && m.on);
let mode='idle', countT0=0, raf=0, clip=null, url=null, hooks={ mute:()=>{}, changed:()=>{} }, tipTimer=0, hint=false, hintSeen=false, played=0, lastTick=0, wired=false, iosOver=null;
const LOG=[];   // probe: each change of mode, in order
const ios=()=> iosOver==null ? IOS : iosOver;
export const filmBusy=()=>mode==='count' || mode==='rec' || mode==='finishing';
export const filmCardOpen=()=>mode==='card';
function set(m){ mode=m; LOG.push({ t:Math.round(performance.now()), mode:m }); render(); hooks.changed(); }
const fmt=s=>{ const n=Math.max(0, Math.round(+s||0)); return `${Math.floor(n/60)}:${String(n%60).padStart(2, '0')}`; };

/* one short line under the button (a refusal, or the one-time hint) */
export function filmTip(key){ const el=$('nightRecTip'); if(!el) return; el.textContent=t(key); el.dataset.key=key; el.hidden=false; clearTimeout(tipTimer);
  tipTimer=setTimeout(()=>{ el.hidden=true; if(hint){ hint=false; render(); } }, key==='night.clip.hint' ? CLIP.hintShowMs : CLIP.tipMs); }
function hintOff(){ if(!hint) return; hint=false; const el=$('nightRecTip'); if(el && el.dataset.key==='night.clip.hint') el.hidden=true; render(); }

function onTap(){
  if(mode==='count'){ set('idle'); return; }   // a second tap during the countdown cancels it
  if(mode==='rec'){ finish(); return; }
  if(mode!=='idle') return;
  if(cameraOn()){ filmTip('night.clip.noCamera'); return; }
  if(!filmSupport().video){ filmTip('night.clip.cannot'); return; }
  hintOff(); countT0=performance.now(); set('count'); loop(); }
function loop(){ if(raf) return; const step=now=>{ raf=0;
    if(mode==='count'){ if(now-countT0>=CLIP.countMs){ begin(); return; } render(now); raf=requestAnimationFrame(step); }
    else if(mode==='rec'){ render(now); raf=requestAnimationFrame(step); } };
  raf=requestAnimationFrame(step); }
async function begin(){ set('rec');
  try{ await filmStart({ quality:CLIP.quality, onStop:()=>finish() }); }catch(e){ if(mode==='rec'){ set('idle'); filmTip('night.clip.failed'); } return; }
  if(mode==='rec') loop(); }   // the page may have been left meanwhile (finish() ran)
async function finish(){ if(mode!=='rec') return; set('finishing');
  try{ clip=await filmStop(); }catch(e){ clip=null; set('idle'); filmTip('night.clip.failed'); return; }
  clip.saved=false; if(!ios()){ try{ filmSave(clip.blob, clip.name); clip.saved=true; }catch(e){} }   // the founder: saved on the device at once, shared or not
  if(document.hidden) await new Promise(r=>{ const f=()=>{ if(!document.hidden){ document.removeEventListener('visibilitychange', f); r(); } }; document.addEventListener('visibilitychange', f); });
  cardOpen(); }
/* the card: the clip with its own sound; the room and the hands silent while it is open */
function cardOpen(){ const v=$('nightClipVideo'); url=URL.createObjectURL(clip.blob); v.muted=false; v.src=url;
  set('card'); hooks.mute(true);
  const p=v.play(); if(p && p.catch) p.catch(()=>{ v.muted=true; render(); const q=v.play(); if(q && q.catch) q.catch(()=>{}); });   // no sound allowed: it plays muted, the speaker button turns it on
  setTimeout(()=>{ const b=$('nightClipClose'); if(b && mode==='card') b.focus({ preventScroll:true }); }, 0); }
function cardClose(){ if(mode!=='card') return; const v=$('nightClipVideo'); try{ v.pause(); }catch(e){} v.removeAttribute('src'); try{ v.load(); }catch(e){}
  if(url){ URL.revokeObjectURL(url); url=null; } clip=null; const p=$('nightClipProg'); if(p) p.style.width='0'; hooks.mute(false); set('idle'); }
function onVis(){ const v=$('nightClipVideo');
  if(document.hidden){ if(mode==='count') set('idle'); else if(mode==='rec') finish(); else if(mode==='card') try{ v.pause(); }catch(e){} }
  else if(mode==='card'){ const p=v.play(); if(p && p.catch) p.catch(()=>{}); } }

function render(now=performance.now()){
  const b=$('nightRecBtn'); if(!b) return;
  const rec=mode==='rec' || mode==='finishing', st=mode==='rec' ? filmState() : null, sec= mode==='finishing' ? FILM.maxSec : st && st.on ? st.sec : 0;
  const left=Math.max(0, Math.ceil(FILM.maxSec-sec)), end=mode==='rec' && left<=CLIP.endSec;
  b.classList.toggle('live', mode==='count' || rec || hint); b.classList.toggle('rec', rec); b.classList.toggle('end', end); b.classList.toggle('hint', hint && !rec);
  const label=t(mode==='count' || rec ? 'night.clip.stop' : 'night.clip.rec'); if(b.title!==label){ b.title=label; b.setAttribute('aria-label', label); } b.setAttribute('aria-pressed', rec ? 'true' : 'false');
  $('nightRecIco').hidden=rec; const s=$('nightRecSec'); s.hidden=!rec || mode==='finishing'; s.textContent= end ? String(left) : String(Math.min(FILM.maxSec, Math.floor(sec)));
  $('nightRecArc').style.strokeDasharray=`${((rec ? Math.min(1, sec/FILM.maxSec) : 0)*CLIP.ring).toFixed(1)} ${CLIP.ring.toFixed(1)}`;
  const c=$('nightCount'); c.hidden=mode!=='count';
  if(mode==='count'){ const e=now-countT0; $('nightCountN').textContent=String(Math.max(1, Math.ceil((CLIP.countMs-e)/1000)));
    $('nightCountArc').style.strokeDasharray=`${(Math.max(0, 1-e/CLIP.countMs)*CLIP.countRing).toFixed(1)} ${CLIP.countRing.toFixed(1)}`; }
  const open=mode==='card'; $('nightClip').hidden=!open; $('nightClipVeil').hidden=!open;
  if(open && clip){ $('nightClipLen').textContent=fmt(clip.info.sec);
    const v=$('nightClipVideo'), mb=$('nightClipMute'), mk= v.muted ? 'speaker-off' : 'speaker-on';
    if(mb.dataset.svg!==mk){ mb.dataset.svg=mk; const g=svgIcon(document, mk); if(g) mb.replaceChildren(g); }
    const ml=t(v.muted ? 'night.clip.unmute' : 'night.clip.mute'); mb.title=ml; mb.setAttribute('aria-label', ml);
    $('nightClipShare').hidden=!filmCanShare(); $('nightClipSaved').hidden=!clip.saved;
    $('nightClipDone').textContent=t(ios() && !clip.saved ? 'night.clip.savePhotos' : 'night.clip.done'); } }

/* once per screen frame from the shell: x = { ready (nothing else on screen), hands (in view), coach (a coaching line shows) } — the one-time hint */
export function filmUiTick(now, x){ if(!wired) return; const dt= lastTick ? Math.min(250, now-lastTick) : 0; lastTick=now;
  if(hintSeen || mode!=='idle') return;
  if(x.hands>0) played+=dt;
  if(played>=CLIP.hintAfterMs && x.ready && !x.coach && !cameraOn() && filmSupport().video){ hintSeen=true; save(CLIP.hintKey, '1'); hint=true; filmTip('night.clip.hint'); render(); } }

/* h = { mute(on) — silence the room and the hands while the card plays (off: back as before), changed() — the mode changed (the shell re-renders) } */
export function filmUiWire(h={}){ if(wired || !$('nightRecBtn')) return; wired=true; hooks={ mute:h.mute||(()=>{}), changed:h.changed||(()=>{}) }; hintSeen=load(CLIP.hintKey)==='1';
  $('nightRecBtn').onclick=onTap; $('nightClipClose').onclick=cardClose;
  $('nightClipMute').onclick=()=>{ const v=$('nightClipVideo'); v.muted=!v.muted; if(!v.muted){ const p=v.play(); if(p && p.catch) p.catch(()=>{}); } render(); };
  $('nightClipShare').onclick=()=>{ if(clip) filmShare(clip.blob, clip.name); };   // the share sheet needs this tap of its own
  $('nightClipDone').onclick=()=>{ if(clip && ios() && !clip.saved) filmShare(clip.blob, clip.name); else cardClose(); };
  { const v=$('nightClipVideo'); v.ontimeupdate=()=>{ const p=$('nightClipProg'); if(p && v.duration) p.style.width=(100*v.currentTime/v.duration).toFixed(1)+'%'; }; }
  $('nightClip').onkeydown=e=>{ if(e.key==='Escape') cardClose(); };
  document.addEventListener('visibilitychange', onVis); onLangChange(()=>render()); render(); }

/* probe only: the state; set the hands' playing time (the hint without two minutes of play), pretend iPhone (true / false / null) */
export const filmUiDbg=()=>({ mode, hint, hintSeen, played:Math.round(played), log:LOG.slice(), clip: clip ? { ...clip.info, saved:clip.saved } : null, ios:ios() });
export function filmUiSetDbg(o={}){ if('played' in o) played=+o.played||0; if('hintSeen' in o) hintSeen=!!o.hintSeen; if('ios' in o) iosOver=o.ios==null ? null : !!o.ios; return filmUiDbg(); }
export const filmUiTapDbg=()=>onTap();
