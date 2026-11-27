/* LIGHT-5 — THE CLIP. Recorded the way Full records (core/clip.js — not imported: it is Full's module and would need a core change to prefer MP4):
   the canvas captured at 0 fps with one requested frame per drawn frame (capped at REC_FPS, in phase with the drawing), the heard sound through
   the engine's recording tap (core/audio.js createRecordingTap — exactly what the person hears), one MediaRecorder — MP4 first (H.264 + AAC; the
   founder: WebM is refused or not shown by WhatsApp, Instagram and the iPhone), WebM only where MP4 is not offered. The camera picture IS in the
   clip (the founder; rule #33: it leaves the device only by the person's tap). The interface is Night's (the founder): the button top right, a
   3-2-1 countdown without words, the seconds inside the button and a ring filling over the minute (the last 10 s counting down), a second tap or
   the minute's end stops; the card plays the clip with its own sound while the live sound is silent, Share through the share sheet, saved to
   Downloads at once (iPhone: Save to Photos through the share sheet); leaving the page stops and keeps the clip; a one-time hint after two minutes. */
import { createRecordingTap, outputFade, outputFadeLevel } from '../../core/audio.js';
import { canvas } from '../../core/vision.js';
import { nsKey } from '../../core/storens.js';
import { t } from '../../core/i18n.js';
import { onLightFrame, lightStarted } from './boot.js';

export const CLIP=Object.freeze({ countMs:3000, maxSec:60, endSec:10, hintAfterMs:120e3, hintShowMs:8000, tipMs:3500, ring:2*Math.PI*25, countRing:2*Math.PI*80, hintKey:'handsong.lightClipHint' });
export const REC_FPS=30;
export const MIME_ORDER=Object.freeze(['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']);
export const IOS=(()=>{ try{ const u=navigator.userAgent||''; return /iP(hone|ad|od)/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints>1); }catch(e){ return false; } })();
const $=id=>document.getElementById(id);
let mode='idle', rec=null, chunks=[], tap=null, vTrack=null, lastCap=0, t0=0, countT0=0, blob=null, url=null, mime='', playStart=null, hinted=false, muted=false, noSave=false, tipT=0;

/* the browser's best container (MP4 first) or '' when it can record nothing */
export function clipType(){ if(typeof MediaRecorder==='undefined' || !canvas.captureStream) return null; for(const m of MIME_ORDER) if(MediaRecorder.isTypeSupported(m)) return m; return ''; }
const bitrate=(w,h)=>Math.round(Math.min(12e6, Math.max(3.5e6, w*h*REC_FPS*0.12)));   // Full's law: ≈ 0.12 bit / pixel / frame, 3.5 … 12 Mbit/s
const stamp=()=>{ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
const nameOf=m=>`handsong-${stamp()}.${m.includes('mp4') ? 'mp4' : 'webm'}`;
export const clipBusy=()=>mode!=='idle';

function tip(key){ const p=$('lightRecTip'); p.textContent=t(key); p.hidden=false; clearTimeout(tipT); tipT=setTimeout(()=>{ p.hidden=true; }, CLIP.tipMs); }
function begin(){
  const m=clipType(); if(m==null){ mode='idle'; tip('light.clip.cannot'); render(); return; }
  tap=createRecordingTap(); if(!tap){ mode='idle'; tip('light.clip.failed'); render(); return; }
  const vid=canvas.captureStream(0); vTrack=vid.getVideoTracks()[0]; lastCap=0;
  const stream=new MediaStream([...vid.getVideoTracks(), ...tap.stream.getAudioTracks()]), opts={ videoBitsPerSecond:bitrate(canvas.width, canvas.height) };
  if(m) opts.mimeType=m;
  try{ rec=new MediaRecorder(stream, opts); }catch(e){ cleanup(); mode='idle'; tip('light.clip.failed'); render(); return; }
  chunks=[]; mime=m;
  rec.ondataavailable=e=>{ if(e.data && e.data.size) chunks.push(e.data); };
  rec.onstop=()=>{ const type=(rec && rec.mimeType) || mime || 'video/webm'; for(const tr of stream.getTracks()) tr.stop(); finish(type); };
  rec.onerror=()=>{ for(const tr of stream.getTracks()) tr.stop(); cleanup(); mode='idle'; tip('light.clip.failed'); render(); };
  rec.start(1000); t0=performance.now(); mode='rec'; render();
}
function stop(){ if(mode!=='rec' || !rec) return; mode='finishing'; render(); try{ rec.stop(); }catch(e){ cleanup(); mode='idle'; render(); } }
function cleanup(){ if(tap) tap.dispose(); tap=null; rec=null; vTrack=null; }
function finish(type){
  cleanup();
  if(!chunks.length){ mode='idle'; tip('light.clip.failed'); render(); return; }
  blob=new Blob(chunks, { type }); chunks=[]; if(url) URL.revokeObjectURL(url); url=URL.createObjectURL(blob);
  if(!IOS && !noSave) download();
  if(document.hidden){ mode='waitCard'; render(); return; }
  openCard();
}
function download(){ const a=document.createElement('a'); a.href=url; a.download=nameOf(blob.type); document.body.appendChild(a); a.click(); a.remove(); }
export const clipCanShare=()=>{ try{ return !!(blob && navigator.canShare && navigator.share && navigator.canShare({ files:[new File([blob], nameOf(blob.type), { type:blob.type })] })); }catch(e){ return false; } };
async function share(){ try{ await navigator.share({ files:[new File([blob], nameOf(blob.type), { type:blob.type })], title:'Handsong' }); }catch(e){} }

/* the card: the clip plays with its own sound while the live sound is silent */
function openCard(){
  mode='card'; const v=$('lightClipVideo'); v.src=url; v.muted=muted; v.currentTime=0;
  outputFade(0, 0.12);
  v.play().catch(()=>{ v.muted=true; muted=true; renderMute(); v.play().catch(()=>{}); });
  $('lightClipSaved').hidden= IOS || noSave;
  $('lightClipShare').hidden=!clipCanShare();
  $('lightClipDone').textContent=t(IOS ? 'light.clip.savePhotos' : 'light.clip.done');
  renderMute(); render();
}
function closeCard(){ const v=$('lightClipVideo'); v.pause(); v.removeAttribute('src'); v.load(); outputFade(1, 0.4); mode='idle'; render(); }
function renderMute(){ const b=$('lightClipMute'); b.setAttribute('data-svg', muted ? 'speaker-off' : 'speaker-on'); b.replaceChildren(); b.title=t(muted ? 'light.clip.unmute' : 'light.clip.mute'); if(fill) fill(b.parentElement); }

let fill=null;
function render(){
  const B=$('lightRecBtn'), S=$('lightRecSec'), A=$('lightRecArc'), C=$('lightCount');
  B.classList.toggle('live', mode==='rec' || mode==='count' || mode==='finishing');
  B.title=t(mode==='rec' ? 'light.clip.stop' : 'light.clip.rec'); B.setAttribute('aria-label', B.title);
  C.hidden= mode!=='count';
  $('lightClip').hidden= mode!=='card'; $('lightClipVeil').hidden= mode!=='card';
  if(mode!=='rec'){ S.textContent=''; A.style.strokeDashoffset=String(CLIP.ring); }
  $('lightRecIco').hidden= mode==='rec';
  if(mode==='finishing') S.textContent='…';
}
function frame(now, hands){
  /* in phase with the drawing: one requested frame per drawn frame, at most REC_FPS */
  if(mode==='rec' && vTrack && vTrack.requestFrame && now-lastCap>=1000/REC_FPS){ lastCap=now; try{ vTrack.requestFrame(); }catch(e){} }
  if(mode==='count'){ const left=CLIP.countMs-(now-countT0), n=Math.max(1, Math.ceil(left/1000));
    $('lightCountN').textContent=String(n); $('lightCountArc').style.strokeDashoffset=String(CLIP.countRing*(1-Math.max(0,left)/CLIP.countMs));
    if(left<=0) begin(); }
  if(mode==='rec'){ const sec=(now-t0)/1000, left=CLIP.maxSec-sec;
    $('lightRecSec').textContent=String(left<=CLIP.endSec ? Math.max(0, Math.ceil(left)) : Math.floor(sec));
    $('lightRecArc').style.strokeDashoffset=String(CLIP.ring*(1-Math.min(1, sec/CLIP.maxSec)));
    if(left<=0) stop(); }
  /* the one-time hint: after two minutes of play, shown once on this device */
  if(!hinted && lightStarted()){ if(playStart==null) playStart=now;
    if(now-playStart>=CLIP.hintAfterMs && !hands.length){ hinted=true; let seen=false; try{ seen=localStorage.getItem(nsKey(CLIP.hintKey))==='1'; }catch(e){}
      if(!seen && mode==='idle'){ try{ localStorage.setItem(nsKey(CLIP.hintKey),'1'); }catch(e){} const p=$('lightRecTip'); p.textContent=t('light.clip.hint'); p.hidden=false; clearTimeout(tipT); tipT=setTimeout(()=>{ p.hidden=true; }, CLIP.hintShowMs); } } }
}
function tap_(){ if(mode==='idle'){ if(clipType()==null){ tip('light.clip.cannot'); return; } countT0=performance.now(); mode='count'; render(); }
  else if(mode==='count'){ mode='idle'; render(); } else if(mode==='rec') stop(); }
export function lightClipWire(fillIcons){
  fill=fillIcons;
  $('lightRecBtn').onclick=tap_;
  $('lightClipDone').onclick=()=>{ if(IOS && clipCanShare()) share().finally(closeCard); else closeCard(); };
  $('lightClipShare').onclick=()=>{ share(); };
  $('lightClipMute').onclick=()=>{ muted=!muted; $('lightClipVideo').muted=muted; renderMute(); };
  $('lightClipVeil').onclick=closeCard;
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ if(mode==='rec') stop(); else if(mode==='count'){ mode='idle'; render(); } }
    else if(mode==='waitCard') openCard(); });
  onLightFrame(frame); render();
}
/* probe only: the state; record for `ms` without the countdown and without saving to Downloads; close the card */
export const lightClipDbg=()=>({ mode, type:clipType(), blob: blob ? { size:blob.size, type:blob.type } : null, url:!!url, fade:outputFadeLevel(), share:clipCanShare() });
export function lightClipRecordDbg(ms){ noSave=true; begin(); return new Promise(r=>setTimeout(()=>{ stop(); const t1=performance.now(), w=()=>{ if(mode==='card' || mode==='idle' || performance.now()-t1>15e3) r(lightClipDbg()); else setTimeout(w, 50); }; w(); }, ms)); }
export function lightClipCloseDbg(){ if(mode==='card') closeCard(); noSave=false; return mode; }
