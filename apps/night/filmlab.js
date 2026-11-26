/* SHARE-1 — THE CLIP TEST (development edition only; the founder checks way A before the players' record button is built). Settings → «Video
   clip test (development)» opens a small panel pinned to the top that stays while playing: Start / Stop (the clip films the room as it is
   drawn, film.js), the time, frames and dropped frames while it records; after Stop the file's facts and Share / Save (the share sheet needs a
   tap of its own). The panel is page markup: it never enters the clip. */
import { devItems } from './edition.js';
import { filmSupport, filmStart, filmStop, filmState, filmShare, filmSave, FILM } from './film.js';
import { sceneInfo } from './scene/host.js';

const $=id=>document.getElementById(id);
let open=false, last=null, timer=0, fps0=null, fpsRec=[];
const say=t=>{ const m=$('nightFilmMsg'); if(m) m.textContent=t; };
function render(){ const st=filmState(), b=$('nightFilmRec'); if(!b) return; b.textContent= st.on ? 'Stop' : 'Start recording';
  $('nightFilmShare').hidden=$('nightFilmSave').hidden=!last || st.on;
  if(st.on){ const fps=sceneInfo().fps; if(fps) fpsRec.push(fps); $('nightFilmCount').textContent=`REC ${st.sec.toFixed(1)} s of ${FILM.maxSec} · ${st.frames} frames · ${st.dropped} dropped · ${st.size ? st.size.join('×') : '…'} · sound ${st.sound ? 'on' : 'waiting'} · room ${fps} fps${st.err ? ' · '+st.err : ''}`; }
  else if(!last){ const s=filmSupport(); $('nightFilmCount').textContent= s.why || 'ready: the room is filmed as it is drawn, with the sound you hear'; } }
async function toggle(){ const st=filmState();
  if(!st.on){ last=null; fpsRec=[]; fps0=sceneInfo().fps; try{ await filmStart({ onStop:why=>{ say('stopped: '+why); stop(); } }); say(''); }catch(e){ say('cannot record: '+(e&&e.message||e)); } render(); return; }
  stop(); }
async function stop(){ if(!filmState().on) return; say('finishing the file…'); try{ last=await filmStop(); const i=last.info, avg=fpsRec.length ? Math.round(fpsRec.reduce((a, b)=>a+b, 0)/fpsRec.length) : 0;
    $('nightFilmCount').textContent=`${i.sec} s · ${i.frames} frames (${i.dropped} dropped) · ${i.size.join('×')} · ${i.codec} · ${i.kb} KB · sound: ${i.sound} · finished in ${i.finishMs} ms · room ${fps0||'?'} fps before, ${avg} while recording`;
    say('ready — Share or Save'); }catch(e){ say('the clip failed: '+(e&&e.message||e)); } render(); }
export function filmLabOpen(v=!open){ if(!devItems()) return; open=!!v; $('nightFilm').hidden=!open; render(); }
export function filmLabWire(){ const b=$('nightFilmBtn'); if(!b) return; b.hidden=!devItems(); if(!devItems()) return; b.onclick=()=>filmLabOpen(true);
  $('nightFilmClose').onclick=()=>filmLabOpen(false); $('nightFilmRec').onclick=toggle;
  $('nightFilmShare').onclick=async()=>{ if(last){ const r=await filmShare(last.blob, last.name); say(r); } };
  $('nightFilmSave').onclick=()=>{ if(last){ filmSave(last.blob, last.name); say('saved'); } };
  clearInterval(timer); timer=setInterval(()=>{ if(open) render(); }, 500); }
/* probe only */
export const filmLabDbg=()=>({ open, last: last ? last.info : null });
