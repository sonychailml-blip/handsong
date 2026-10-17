/* RUN 6 (Calm plan, review Q1): the listening page's engine part — a separate instance of the app's engine (audio.js?listen, the render
   copy's method) renders a candidate timbre's phrase in a Calm mood offline, through the Night forest. Dev tool, never shipped. Used by
   tools/listen/calm-timbres.html and by the runner's check (tools/listen/check-listen.js via --eval). */
import * as E from '../../src/audio.js?listen';               // a separate engine instance (like the render copy audio.js?render)
import { scaleById, scaleView, leadFreq } from '../../src/scales.js';
import { chainOwners, chainKeyOf } from '../../src/state.js';
import { FOREST } from '../../src/core/dsp.js';

const RATE=48000, SEED=0x5eed;
export const MOODS=[['major-penta','Glow'],['minor-penta','Dusk'],['egyptian','Mist']];
const KEY_A=9;                                            // the Calm key (profile.calm key.tonic) — the pitch comes from the view (rule #2)
/* the candidates (Calm plan §4.1): Firefly is today a chord timbre (struck tine) — played here as one-note chords; the rest are solo */
export const CANDS=[
  { id:'chord.firefly', role:'ch', note:'struck tine — rings out by itself (the prototype\'s forest note)' },
  { id:'solo.glass-pad', role:'ld', note:'soft, glassy, sustained' },
  { id:'solo.warm-pad', role:'ld', note:'warm, bowed-like, darker' },
  { id:'solo.airy-flute', role:'ld', note:'breathy, very clean' },
  { id:'solo.bell-deep', role:'ld', note:'a glassy bell (FM)' },
];
/* the phrase: degrees of the five-note mood (index, octave step), beats at 72 bpm (Calm's tempo), the last note held */
const BPM=72, BEAT=60/BPM;
const PHRASE=[[0,0,0.5],[1,0,0.5],[2,0,0.5],[4,0,0.5],[3,0,1],[2,0,0.5],[1,0,0.5],[0,1,1],[4,0,0.5],[2,0,0.5],[0,0,2]];
const mulberry32=a=>()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
/* the page's names (the engine's own record names) */
export function nameOf(rec){ const L=E[rec.role==='ch'?'CHORD_INSTR':'LEAD_INSTR'].find(x=>x.id===rec.id); const n=L&&L.label; return typeof n==='string' ? { en:n, ru:'' } : (n||{ en:rec.id, ru:'' }); }
export async function render(cand, mood, room=0.5, mix=FOREST.send){
  const view=scaleView(scaleById(mood), 'T', undefined, KEY_A, 0);
  const list=E[cand.role==='ch'?'CHORD_INSTR':'LEAD_INSTR'], idx=list.findIndex(x=>x.id===cand.id);
  if(idx<0) throw new Error(cand.id+' is not in this engine');
  const len=PHRASE.reduce((s,p)=>s+p[2],0)*BEAT+FOREST.rooms[2]+1;
  const ctx=new OfflineAudioContext(2, Math.round(RATE*len), RATE);
  E.renderReset(); E.setRnd(mulberry32(SEED)); E.setOffline(true);
  try{
    await E.initAudio(()=>ctx);
    E.offlineTapMaster();
    const key=chainKeyOf(cand.role);
    for(const k of new Set([...chainOwners().map(o=>o.key), key])){ const ids= k===key ? ['forest'] : []; for(const id of ids) E.fxInstance(k,id); E.fxRenderPath(k, ids, ids); }
    E.fxPlaySet(key,'forest','room',room,0); E.fxPlaySet(key,'forest','mix',mix,0);
    let t=0.1; const n=view.iv.length+1;
    PHRASE.forEach(([d,o,b],i)=>{ const deg=d%n, oct=1+o+Math.floor(d/n), f=leadFreq(deg, oct, view), dur=b*BEAT, own=(cand.role==='ch'?'loop:':'lead:')+'listen'+i;
      if(cand.role==='ch'){ E.chordOn(own, [f], 0.7, idx, null, t); E.chordOff(own, t+dur*0.92); }
      else{ E.leadOn(own, f, 0.7, idx, deg, oct, null, false, t); E.leadOff(own, undefined, t+dur*0.92); }
      t+=dur; });
    return await ctx.startRendering();
  } finally { E.setOffline(false); E.renderReset(); }
}
/* peak and RMS of a rendered buffer (the runner's check) */
export function levelOf(buf){ let pk=0, s=0, n=0; for(let c=0;c<buf.numberOfChannels;c++){ const d=buf.getChannelData(c); for(let i=0;i<d.length;i++){ const v=Math.abs(d[i]); if(v>pk) pk=v; s+=d[i]*d[i]; n++; } } return { peak:pk, rms:Math.sqrt(s/n) }; }
