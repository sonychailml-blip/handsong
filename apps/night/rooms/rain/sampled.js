/* RAIN-4b: THE RECORDED VERSION of the rain room's pieces — the score's events played on CC0 recordings (rooms/rain/samples/: VSCO-2 CE's contrabass
   pizzicato, VCSL's TX81Z FM piano and soft-mallet vibraphone, its bass drum, cymbal and hi-hat, Freesound CC0 brushes; tools/rain-samples.mjs, register
   «rain-music-samples»), fetched only with the room. Each note takes the recording nearest its pitch, re-pitched by its playback rate; each hit one
   of its takes (chosen by its own time: the same score, the same takes). One-shot buffer sources (rule #3's per-hit exception), each through its own
   gain and pan into `out`, and a share into `wet` (the room's reverb send). Every pitch from the mood's parent view (rule #2: no note table). */
import { chordRowFreq } from '../../../../core/scales.js';
import { JAZZ_N } from '../../pure/bedjazz.js';

const mod=(s, n)=>((s%n)+n)%n, frac=x=>x-Math.floor(x), pick=(L, t)=>L[Math.floor(frac(Math.sin(t*97.31)*43758.5453)*L.length)];
export const SAMPLED=Object.freeze({ ep:0.02, bass:0.06, vib:0.025, swish:0.027, tap:0.036, kick:0.054, ride:0.02, hat:0.017, wet:Object.freeze({ ep:0.3, bass:0.08, vib:0.5, drum:0.18 }), roll:0.012 });
let LOADING=null;
/* the manifest and every buffer, decoded once per context → { files, buf:{ name: AudioBuffer }, notes:{ ep:[[hz, name]…], bass, vib } } */
export function sampledLoad(ac, base){ if(LOADING && LOADING.ac===ac) return LOADING.p;
  const p=(async ()=>{ const M=await (await fetch(new URL('samples/samples.json', base))).json(), buf={};
    await Promise.all(Object.entries(M.files).map(async ([k, f])=>{ const r=await fetch(new URL('samples/'+f.file, base)); buf[k]=await ac.decodeAudioData(await r.arrayBuffer()); }));
    const notes={}; for(const [k, f] of Object.entries(M.files)) if(f.hz){ const fam=k.split('-')[0]; (notes[fam]=notes[fam]||[]).push([f.hz, k]); }
    return { files:M.files, buf, notes }; })();
  LOADING={ ac, p }; p.catch(()=>{ if(LOADING && LOADING.p===p) LOADING=null; }); return p; }
const nearest=(L, hz)=>L.reduce((a, b)=>Math.abs(Math.log(b[0]/hz))<Math.abs(Math.log(a[0]/hz)) ? b : a);
function one(ac, out, wet, B, name, when, rate, gain, pan, dur, rel, send){ const s=ac.createBufferSource(), g=ac.createGain(), p=ac.createStereoPanner();
  s.buffer=B.buf[name]; s.playbackRate.value=rate; p.pan.value=Math.max(-1, Math.min(1, pan||0)); g.gain.setValueAtTime(gain, when);
  if(dur!=null){ g.gain.setValueAtTime(gain, when+dur); g.gain.setTargetAtTime(0, when+dur, rel/4); }
  s.connect(g); g.connect(p); p.connect(out); if(wet && send){ const w=ac.createGain(); w.gain.value=send; p.connect(w); w.connect(wet); } s.start(when); if(dur!=null) s.stop(when+dur+rel); }
/* one score event at audio time `when`, priced in the parent view pv; k — the overall level */
export function sampledPlay(ac, out, wet, B, ev, when, pv, k=1){ const S=SAMPLED, W=S.wet, hz=s=>chordRowFreq(mod(s, JAZZ_N), Math.floor(s/JAZZ_N), pv);
  if(ev.kind==='comp'){ const n=ev.steps.length; ev.steps.forEach((s, i)=>{ const f=hz(s), [r0, nm]=nearest(B.notes.ep, f); one(ac, out, wet, B, nm, when+i*S.roll, f/r0, k*S.ep*ev.vel/Math.sqrt(n), (ev.pan||0)+(i-(n-1)/2)*0.14, ev.dur, 0.5, W.ep); }); }
  else if(ev.kind==='bass'){ const f=hz(ev.step), [r0, nm]=nearest(B.notes.bass, f); one(ac, out, wet, B, nm, when, f/r0, k*S.bass*ev.vel, ev.pan, ev.dur, 0.18, W.bass); }
  else if(ev.kind==='vib'){ const f=hz(ev.step), [r0, nm]=nearest(B.notes.vib, f); one(ac, out, wet, B, nm, when, f/r0, k*S.vib*ev.vel, ev.pan, ev.dur*1.6, 0.8, W.vib); }
  else if(ev.kind==='drum'){ const d=ev.drum, nm= d==='swish' ? pick(['swish-1', 'swish-2'], when) : d==='tap' ? pick(['tap-1', 'tap-2', 'tap-3'], when) : d==='kick' ? 'kick' : d==='ride' ? 'ride-tip' : 'hat-foot';
    one(ac, out, wet, B, nm, when, 1, k*S[d]*ev.vel, d==='kick' ? 0 : (ev.pan||0)+(d==='ride' ? 0.3 : 0), d==='swish' ? Math.min(1, ev.dur) : null, 0.25, W.drum); } }
