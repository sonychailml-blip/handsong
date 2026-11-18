/* AUDIO-3 — «NIGHT audio lab» (slow, development edition): the founder's tools for the rain's dropouts work in the rain with its music playing:
   the lab opens; the render-timing probe reports; «Record what you hear» records about 2 s of the master into chunks that make a valid 16-bit WAV
   with sound in it; every bypass switch of the bed (rooms/rain/lofi.js) and the nature goes out and back in without an error, and afterwards none is
   left out. CONTROL: with the whole bed taken out the recorded level must fall (the switch really takes the music out of the graph). The output
   buffer and the search cadence: the stored choices are read only in the development edition (data side: the release edition never calls them). */
import { row } from '../core/rows.js';

const wait=ms=>new Promise(r=>setTimeout(r, ms));
const rms=ch=>{ let s=0, n=0; for(const [L, R] of ch) for(let i=0;i<L.length;i++){ s+=L[i]*L[i]+R[i]*R[i]; n+=2; } return n ? Math.sqrt(s/n) : 0; };
export async function checkNightLab(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), B2=await import('../../../apps/night/bed2.js'), SH=await import('../../../apps/night/shell.js'), LB=await import('../../../apps/night/audiolab.js'), A=await import('../../../core/audio.js');
  const was=PR.profileCurrent(), room0=H.sceneRoom(), bg0=H.backgroundOf(), hold=SH.nightMusicHoldDbg(false);
  /* record ms of the master through the lab's recorder node → its chunks */
  const record=async ms=>{ const chunks=[]; const node=await new Promise(r=>{ const lim=performance.now()+5000; const f=()=>{ const D=LB.labDbg(); if(D.rec || performance.now()>lim) r(D.rec); else setTimeout(f, 100); }; f(); });
    if(!node) return chunks; const R=LB.labRecNodeDbg(); const on=e=>{ if(e.data && e.data.L) chunks.push([e.data.L, e.data.R]); }; R.port.addEventListener('message', on); R.port.postMessage({ on:true }); await wait(ms); R.port.postMessage({ on:false }); await wait(300); R.port.removeEventListener('message', on); return chunks; };
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ ok('Night did not apply: '+why, false); return { cases:n, total:d.length, differences:d, notes }; } }
    if(H.sceneRoom()!=='room.rain') await RS.roomSwitch('room.rain', { fast:true }); await H.setBackground('forest'); SH.nightMusicHoldDbg(false);
    { const lim=performance.now()+30000; while(!(B2.bed2LofiDbg().on && B2.bed2LofiEngine()) && performance.now()<lim) await wait(200); } await wait(3000);
    ok('the rain’s music did not start', !!B2.bed2LofiEngine());
    LB.labOpen(true); await wait(2500); const D=LB.labDbg();
    ok(`the lab did not open with its probes (open ${D.open}, glitch ${D.glitch}, recorder ${D.rec})`, D.open && D.glitch && D.rec);
    ok(`the render-timing probe did not report (${D.lastG.calls} calls)`, D.lastG.calls>0); notes.push(`timing probe: ${D.lastG.calls} render calls per 250 ms, the largest gap ${Math.round(D.lastG.gapMax)} ms, drift ${Math.round(D.lastG.drift)} ms`);
    const C=await record(2000), sec=C.reduce((x, c)=>x+c[0].length, 0)/A.AC.sampleRate, lv=rms(C);
    ok(`the recording holds ${sec.toFixed(2)} s for 2 s`, sec>1.6 && sec<2.6); ok(`the recording is silent (RMS ${lv.toExponential(2)})`, lv>1e-4);
    { const b=LB.labWavDbg(C, A.AC.sampleRate), h=new Uint8Array(await b.slice(0, 44).arrayBuffer()), tag=String.fromCharCode(...h.slice(0, 4))+String.fromCharCode(...h.slice(8, 12));
      ok(`the WAV is not a 16-bit stereo RIFF/WAVE (${tag}, ${b.size} bytes)`, tag==='RIFFWAVE' && b.size===44+Math.round(sec*A.AC.sampleRate)*4); notes.push(`recorded ${sec.toFixed(2)} s, RMS ${lv.toExponential(2)}, WAV ${b.size} bytes`); }
    /* every switch out and back in */
    const E=B2.bed2LofiEngine(), bad=[]; for(const k of E.bypassKeys){ try{ E.bypass(k, true); await wait(150); E.bypass(k, false); await wait(150); }catch(e){ bad.push(k+': '+e.message); } }
    for(const k of ['near', 'far', 'cars']){ try{ RS.natureSkip({ [k]:true }); await wait(150); RS.natureSkip({}); }catch(e){ bad.push('nature '+k+': '+e.message); } }
    ok('switches failed: '+bad.join('; '), !bad.length); ok('a switch is left out: '+JSON.stringify(E.bypassed()), Object.values(E.bypassed()).every(v=>!v));
    notes.push(`${E.bypassKeys.length} bed switches + 3 nature switches out and back in: ${E.bypassKeys.join(', ')}`);
    /* CONTROL: the whole bed out → the level falls */
    const on1=rms(await record(1500)); E.bypass('bed', true); await wait(400); const off=rms(await record(1500)); E.bypass('bed', false);
    ok(`CONTROL: with the whole bed out the level did not fall (${on1.toExponential(2)} → ${off.toExponential(2)})`, off<on1*0.7); notes.push(`CONTROL: the bed out → RMS ${on1.toExponential(2)} → ${off.toExponential(2)}`);
  } catch(e){ ok('error: '+(e && e.stack || e), false); }
  finally{ try{ LB.labOpen(false); const E=B2.bed2LofiEngine(); if(E) for(const k of E.bypassKeys) E.bypass(k, false); RS.natureSkip({}); }catch(e){} SH.nightMusicHoldDbg(hold);
    try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); if(bg0) await H.setBackground(bg0); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98658, night:true, slow:true, name:'NIGHT audio lab', run:()=>checkNightLab(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkNightLab(); }
