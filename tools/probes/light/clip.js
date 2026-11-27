/* LIGHT-5 row «LIGHT clip»: (1) the format — MP4 first (the founder): where the browser records MP4 the clip is MP4; the order puts every MP4 ahead
   of WebM (CONTROL: a list with WebM first would not); (2) a real recording of 1.5 s (no countdown, not saved to Downloads) ends in the card with a
   non-empty file of that type; while the card is open the live sound is silent (the output fade at 0), and closing the card brings it back (1);
   (3) the button shows with the controls (no hand in view) and is reachable. */
import { MIME_ORDER, clipType, lightClipDbg, lightClipRecordDbg, lightClipCloseDbg } from '../../../apps/light/clip.js';
import { outputFadeLevel } from '../../../core/audio.js';

export async function checkLightClip(){
  const diffs=[], miss=s=>diffs.push(s), notes=[];
  const mp4First=list=>{ const i=list.findIndex(m=>m.startsWith('video/webm')); return list.slice(0, i<0 ? list.length : i).some(m=>m.startsWith('video/mp4')) && !list.slice(i<0 ? list.length : i).some(m=>m.startsWith('video/mp4')); };
  if(!mp4First(MIME_ORDER)) miss('the format order does not put every MP4 ahead of WebM');
  if(mp4First(['video/webm', ...MIME_ORDER.filter(m=>m!=='video/webm')])) miss('CONTROL: a list with WebM first passed');
  const ty=clipType(), mp4=typeof MediaRecorder!=='undefined' && MediaRecorder.isTypeSupported('video/mp4');
  notes.push(`this browser: ${ty==null ? 'cannot record' : ty || 'its default'}${mp4 ? ' (MP4 offered)' : ' (no MP4)'}`);
  if(mp4 && !(ty||'').startsWith('video/mp4')) miss('the browser records MP4 but the clip is '+ty);
  const btn=document.getElementById('lightRecBtn'); await new Promise(r=>setTimeout(r, 1200));
  if(getComputedStyle(btn).visibility!=='visible') miss('the clip button is not shown with the controls');
  if(ty!=null){
    try{
      const D=await lightClipRecordDbg(1500);
      notes.push(`recorded ${D.blob ? D.blob.size+' bytes, '+D.blob.type : 'nothing'}`);
      if(D.mode!=='card') miss('the recording did not end in the card ('+D.mode+')');
      if(!D.blob || D.blob.size<1000) miss('the clip file is empty or tiny');
      if(D.blob && ty && !D.blob.type.startsWith(ty.split(';')[0])) miss(`the file is ${D.blob.type}, not ${ty}`);
      if(!(outputFadeLevel()===0)) miss('the live sound is not silent while the card plays (fade '+outputFadeLevel()+')');
    } finally { lightClipCloseDbg(); }
    if(!(outputFadeLevel()===1)) miss('closing the card did not bring the live sound back (fade '+outputFadeLevel()+')');
    if(lightClipDbg().mode!=='idle') miss('the clip is not idle after the card closed');
  }
  return { pass:!diffs.length, diffs, note:notes.join(' · ') };
}
