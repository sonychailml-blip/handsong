/* AUDIO-4 — «RAIN bed piano lighter» (slow): the founder found the dropouts with the audio lab — every part on except the bed's PIANO, and they
   went away. The piano must SOUND the same; only its cost changes: its voices are now computed in one node (rooms/rain/ep-worklet.js) instead of
   core's tine banks (96 voice chains always connected, 7 nodes per strike). Each of the 9 sounds (3 pieces × 3 levels) rendered offline
   NULL.sec seconds at NULL.sr Hz through the room's own engine twice — the tine banks of before (epw:false) and today — and compared sample by
   sample with AUDIO-1's measure: the difference's peak ≤ −90 dBFS and its RMS ≤ −90 dB under the signal (the renders' own repeat noise is about
   −108 dBFS / −120 dB; hearing ends some 60 dB above these thresholds). Also: today's engine really uses the one node (not the fallback);
   reported: each render's time (the audio thread's cost offline), the most voices busy and strikes sounding at once.
   CONTROL: the one node detuned by 1 cent (o.epwDbg) must FAIL the measure. Every wait has an upper limit (the renders 1800 s). */
import { row } from '../core/rows.js';
import { NULL, nullOf, nullPass } from './audio1.js';

const SOUNDS=[].concat(...['lydian-penta', 'dorian-hexa', 'mixolydian-hexa'].map(id=>['quiet', 'groove', 'full'].map(lv=>[id, lv])));
export const A4=Object.freeze({ sec:30, sr:NULL.sr });
async function render(id, lv, o={}){ const S=await import('../../../core/scales.js'); await S.scalesLoadRest();
  const RR=(await import('../../../apps/night/rooms/rain/pure/room.js')).RAIN_ROOM, LF=await import('../../../apps/night/pure/lofi.js'), EN=await import('../../../apps/night/rooms/rain/lofi.js');
  const P=RR.bed2.lofi.pieces[id], v=S.scaleView(S.scaleById(id)), pv=S.scaleView(S.scaleById(P.parent), undefined, undefined, S.viewKey(v), S.viewKeyC(v)), c=new OfflineAudioContext(2, A4.sr*A4.sec, A4.sr);
  const E=await EN.lofiEngine(c, c.destination, new URL('../../../apps/night/rooms/rain/', import.meta.url).href, o); E.tempo(P.bpm, 0); E.layer('crackle', 0, 0); E.level(RR.bed2.master*RR.bed2.level*RR.bed2.level, 0, 0.03);
  const st=LF.lofiInit(P, lv, { at:0.3, pc:S.scaleById(P.parent).iv }); for(const e of LF.lofiStep(st, 0, A4.sec)) if(!(e.kind==='layer' && e.layer==='crackle')) E.play(e, e.t, pv);
  await E.settle(); const t0=performance.now(), b=await c.startRendering(), ms=performance.now()-t0;
  return { ch:[b.getChannelData(0), b.getChannelData(1)], ms, state:E.state() }; }
export async function checkPianoLight(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; }, f=x=>Number.isFinite(x) ? x.toFixed(1) : String(x);
  const lim=performance.now()+1800000, left=()=>Math.max(1, lim-performance.now()), timed=p=>Promise.race([p, new Promise((_, no)=>setTimeout(()=>no(new Error('the renders took over 1800 s')), left()))]);
  let msOld=0, msNew=0, msOldS=0, msNewS=0, peak=0, sounding=0, keep=null;
  try{
    for(const ep of ['long']) for(const [id, lv] of SOUNDS){ const a=await timed(render(id, lv, { epw:false, ep })), b=await timed(render(id, lv, { ep })), r=nullOf(a.ch, b.ch);   // PERF-2: the short piano (Light) too
      if(!keep) keep={ id, lv, a };
      const tag=ep==='short' ? ' (short, Light)' : '';
      ok(`${id} ${lv}${tag}: today's engine is not the one node (epw ${b.state.epw})`, b.state.epw && !a.state.epw);
      ok(`${id} ${lv}${tag}: the piano changed — peak ${f(r.peakDb)} dBFS, RMS ${f(r.relDb)} dB under the signal (≤ ${NULL.peakDb} / ${NULL.rmsDb})`, nullPass(r));
      if(ep==='long'){ msOld+=a.ms; msNew+=b.ms; } else { msOldS+=a.ms; msNewS+=b.ms; } peak=Math.max(peak, b.state.peak); sounding=Math.max(sounding, b.state.epPeak||0);
      notes.push(`${id} ${lv}${tag}: peak ${f(r.peakDb)} dBFS, RMS ${f(r.relDb)} dB under the signal (${f(r.sigDb)} dBFS); render ${Math.round(a.ms)} → ${Math.round(b.ms)} ms; voices busy ${b.state.peak}, strikes sounding ${b.state.epPeak}`); }
    /* CONTROL: 1 cent off must fail */
    const c=await timed(render(keep.id, keep.lv, { epwDbg:{ cents:1 } })), rc=nullOf(keep.a.ch, c.ch);
    ok(`CONTROL: the one node detuned by 1 cent passes (peak ${f(rc.peakDb)}, RMS ${f(rc.relDb)} dB) — the measure cannot fail`, !nullPass(rc));
    notes.push(`CONTROL: 1 cent off → peak ${f(rc.peakDb)} dBFS, RMS ${f(rc.relDb)} dB (fails, as it must)`);
    notes.push(`the 9 sounds, ${A4.sec} s each at ${A4.sr} Hz, rendered in ${(msOld/1000).toFixed(1)} s before and ${(msNew/1000).toFixed(1)} s today (×${(msOld/Math.max(1, msNew)).toFixed(2)} lighter for the whole bed); at most ${peak} voices busy and ${sounding} strikes sounding at once`);
  } catch(e){ ok('error: '+(e && e.stack || e), false); }
  return { cases:n, total:d.length, differences:d, notes, msOld, msNew }; }
row({ at:1009.98659, night:true, slow:true, name:'RAIN bed piano lighter', run:()=>checkPianoLight(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkPianoLight(); }
