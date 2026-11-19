/* AUDIO-1 — «RAIN bed null test» (slow): the rain's bed made cheaper BY STRUCTURE only, each change proven audibly identical offline. One piece
   (Evening boulevard, its full level, the vinyl off) rendered NULL_SEC seconds through the room's own engine (rooms/rain/lofi.js, the default
   sustaining piano) three ways — the graph before AUDIO-1 (struct:false), only the unused short-piano banks left out (struct:'banks'), and today's
   (+ the master's high cut at block rate) — and compared sample by sample. The renders are NOT bit-repeatable (two renders of one graph differ
   at about −108 dBFS: the convolver's background work), so «identical» means WITHIN THAT NOISE: the difference's peak ≤ NULL.peakDb dBFS and its
   RMS ≤ NULL.rmsDb dB under the signal's RMS (my thresholds, about 15 dB above the measured repeat noise):
   (1) the same graph twice: within noise (the floor every other comparison stands on — reported);
   (2) 'banks' vs before: within noise; (3) today vs before: within noise.
   (The piano's auto-pan at block rate was tried: −66 dB under the signal — inaudible but not within noise, and on the piano's path: not applied.)
   CONTROL: the before-graph at +0.09 dB (×1.01) must FAIL (2). Also reported: the most sustaining piano voices busy at once and the nodes saved.
   Every wait has an upper limit (the renders 300 s). */
import { row } from '../core/rows.js';

export const NULL=Object.freeze({ sr:32000, sec:45, piece:'dorian-hexa', level:'full', peakDb:-90, rmsDb:-90 });
async function render(o, gain=1){ const S=await import('../../../core/scales.js'); await S.scalesLoadRest();
  const RR=(await import('../../../apps/night/rooms/rain/pure/room.js')).RAIN_ROOM, LF=await import('../../../apps/night/pure/lofi.js'), EN=await import('../../../apps/night/rooms/rain/lofi.js');
  const P=RR.bed2.lofi.pieces[NULL.piece], v=S.scaleView(S.scaleById(NULL.piece)), pv=S.scaleView(S.scaleById(P.parent), undefined, undefined, S.viewKey(v), S.viewKeyC(v)), c=new OfflineAudioContext(2, NULL.sr*NULL.sec, NULL.sr);
  const E=await EN.lofiEngine(c, c.destination, new URL('../../../apps/night/rooms/rain/', import.meta.url).href, o); E.tempo(P.bpm, 0); E.layer('crackle', 0, 0); E.level(RR.bed2.master*RR.bed2.level*RR.bed2.level*gain, 0, 0.03);
  const st=LF.lofiInit(P, NULL.level, { at:0.3, pc:S.scaleById(P.parent).iv }); for(const e of LF.lofiStep(st, 0, NULL.sec)) if(!(e.kind==='layer' && e.layer==='crackle')) E.play(e, e.t, pv);
  await E.settle(); const b=await c.startRendering(); return { ch:[b.getChannelData(0), b.getChannelData(1)], state:E.state() }; }
const db=x=>x>0 ? 20*Math.log10(x) : -Infinity;
/* a → b: the difference's peak (dBFS), its RMS and the signal's RMS (dB), exact equality */
export function nullOf(a, b){ let pk=0, se=0, ss=0, n=0, same=true; for(let c=0;c<2;c++){ const x=a[c], y=b[c]; for(let i=0;i<x.length;i++){ const d=x[i]-y[i]; if(d!==0) same=false; const ad=Math.abs(d); if(ad>pk) pk=ad; se+=d*d; ss+=x[i]*x[i]; n++; } }
  return { same, peakDb:db(pk), rmsDb:db(Math.sqrt(se/n)), sigDb:db(Math.sqrt(ss/n)), relDb:db(Math.sqrt(se/n))-db(Math.sqrt(ss/n)) }; }
export const nullPass=r=>r.same || (r.peakDb<=NULL.peakDb && r.relDb<=NULL.rmsDb);
export async function checkBedNull(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; }, f=x=>Number.isFinite(x) ? x.toFixed(1) : String(x);
  const limit=p=>Promise.race([p, new Promise((_, no)=>setTimeout(()=>no(new Error('the renders took over 300 s')), 300000))]);
  const [old, old2, banks, now, loud]=await limit(Promise.all([render({ struct:false }), render({ struct:false }), render({ struct:'banks' }), render({}), render({ struct:false }, 1.01)]));
  const r0=nullOf(old.ch, old2.ch), r1=nullOf(old.ch, banks.ch), r2=nullOf(old.ch, now.ch), rc=nullOf(old.ch, loud.ch);
  ok(`the same graph twice differs beyond the noise threshold (peak ${f(r0.peakDb)} dBFS, RMS ${f(r0.relDb)} dB) — the floor is too high to judge`, nullPass(r0));
  ok(`the unused banks left out changed the sound: peak ${f(r1.peakDb)} dBFS, RMS ${f(r1.relDb)} dB under the signal`, nullPass(r1));
  ok(`today vs before: peak ${f(r2.peakDb)} dBFS, RMS ${f(r2.relDb)} dB under the signal (≤ ${NULL.peakDb} / ${NULL.rmsDb})`, nullPass(r2));
  ok(`CONTROL: the before-graph at +0.09 dB passes (peak ${f(rc.peakDb)}, RMS ${f(rc.relDb)} dB) — the test cannot fail`, !nullPass(rc));
  ok('the bed rendered silence', r2.sigDb>-60);
  notes.push(`${NULL.piece} ${NULL.level}, ${NULL.sec} s at ${NULL.sr} Hz, signal RMS ${f(r2.sigDb)} dBFS`);
  notes.push(`repeat noise (same graph twice): peak ${f(r0.peakDb)} dBFS, RMS ${f(r0.relDb)} dB; banks left out: peak ${f(r1.peakDb)} dBFS, RMS ${f(r1.relDb)} dB; today vs before: peak ${f(r2.peakDb)} dBFS, RMS ${f(r2.relDb)} dB under the signal; CONTROL +0.09 dB: peak ${f(rc.peakDb)}, RMS ${f(rc.relDb)} dB (fails, as it must)`);
  notes.push(`sustaining piano voices busy at once at most: ${now.state.peak} of ${now.state.long}; short banks built: before ${old.state.banks}, today ${now.state.banks} (${(old.state.banks-now.state.banks)*4} idle nodes fewer)`);
  return { cases:n, total:d.length, differences:d, notes, r1, r2, rc, peak:now.state.peak }; }
row({ at:1009.98655, night:true, slow:true, name:'RAIN bed null test', run:()=>checkBedNull(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkBedNull(); }
