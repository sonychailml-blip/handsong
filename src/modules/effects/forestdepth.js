/* RUN 7 (C4b, Calm plan §4.2; the user's choice «Calm gets its own wider range, Full unchanged»; RUN 8: LOUDNESS KEPT) — the effect «Forest
   depth»: Calm's room. An ENGINE SUBMODULE (hard rule #38): stateless — every engine value comes from E (first argument); each instance keeps
   its own two values in its closure (the instance lives in E's effect tables).
   The same seeded Night forest room (core/dsp.forestIR, shared buffer per length); its amounts follow the playing hand's DEPTH on
   core/dsp.calmDepth: the dry note stays almost level, the room's send rises (more forest, the same loudness — measured), and the far
   forest is darker (a lowpass on the send only). `mix` (0…1) scales it — 0 is exact identity (dry 1, send 0), Calm fixes it at 1. Bus
   module: one convolver per chain instance, never per note. Not offered in Full's «+ Add» list (calm:true); Full's «Night forest» is untouched. */
import { freezeDeep } from '../timbres/stages.js';
import { FOREST, forestRoom, calmDepth, CALM_DEPTH } from '../../core/dsp.js';
import { fxWrapParam } from './param.js';
import { forestBuffer } from './forest.js';
import { buildFDN, setRevDecay, setRevTone } from '../../engine/fdn.js';   // C8: the lighter forest

const FDEPTH_PARAMS=freezeDeep([ {key:'mix', labelKey:'fx.fdepth.mix', short:'MIX', unit:'', def:1, min:0, max:1, curve:'lin'},
  {key:'depth', labelKey:'fx.fdepth.depth', short:'DPTH', unit:'', def:0, min:0, max:1, curve:'lin'},
  {key:'room', labelKey:'fx.forest.room', short:'ROOM', unit:'s', def:FOREST.room, min:FOREST.rooms[0], max:FOREST.rooms[2], curve:'log', pick:FOREST.rooms,
   pickKeys:['fx.forest.room.short','fx.forest.room.medium','fx.forest.room.long']},
  /* RUN 8: the forest AT MOST — the Calm panel's «Forest» slider; the hand's depth moves within it (the curve sees depth × reach); 1 = the whole range */
  {key:'reach', labelKey:'fx.fdepth.reach', short:'MAX', unit:'', def:1, min:0, max:1, curve:'lin'},
  /* RUN 8 (C8): the LIGHTER FOREST — 1 = the room from the delay network (engine/fdn.js) instead of the convolution: the convolution room was
     Calm's largest fixed cost on the audio thread (≈ 15–20 % of a quantum on the user's laptop); 0 (default) = the forest as before (GOLD) */
  {key:'light', labelKey:'fx.fdepth.light', short:'LITE', unit:'', def:0, min:0, max:1, curve:'lin'} ]);
/* the light room matched to the forest by measurement (RUN 8, the Medium room through «Forest depth»: the forest's tail falls 31 dB/s —
   T60 ≈ 1.9 s): RT60 = decayK × the room's length, the damping cut-off (the forest's noise IR is bright), the return's level (first try 1:
   +1.7…+2.8 dB louder far → 0.56) */
export const FDEPTH_LIGHT=Object.freeze({ decayK:1.4, tone:7000, trim:0.5 });

function makeForestDepthFx(E){
  const ac=E.ac, fxIn=ac.createGain(), fxOut=ac.createGain(); fxIn.gain.value=1; fxOut.gain.value=1;
  /* fxIn → dry → out; fxIn → lowpass → send → gate → room → return → out */
  const dry=ac.createGain(), lp=ac.createBiquadFilter();
  try{ lp.frequency.automationRate='k-rate'; }catch(e){}   // cost: the depth moves slowly (block rate is inaudible)
  lp.type='lowpass'; lp.Q.value=0.5; lp.frequency.value=CALM_DEPTH.lp0+CALM_DEPTH.lpK; dry.gain.value=1;
  fxIn.connect(dry); dry.connect(fxOut);
  const send=ac.createGain(); send.gain.value=0;
  const gate=ac.createGain(); gate.gain.value=1;
  const conv=ac.createConvolver(); conv.normalize=false;
  let room=FOREST.room; conv.buffer=forestBuffer(E, room);
  const ret=ac.createGain(); ret.gain.value=FOREST.wet;
  const convIn=ac.createGain(); convIn.gain.value=1;   // C8: the convolution's own input (exactly 0 while the light room plays → it stops computing)
  fxIn.connect(lp); lp.connect(send); send.connect(gate); gate.connect(convIn); convIn.connect(conv); conv.connect(ret); ret.connect(fxOut);
  const gateF=ac.createGain(), retF=ac.createGain(); gateF.gain.value=0; retF.gain.value=FDEPTH_LIGHT.trim; gate.connect(gateF);
  let fdn=null, lightOn=false, offT=0;
  const lightSet=(v,w)=>{ const on=v>=0.5; if(on===lightOn) return; lightOn=on; const t=w!=null?w:ac.currentTime;
    if(on && !fdn){ fdn=buildFDN(E, gateF, retF); setRevDecay(E, fdn, FDEPTH_LIGHT.decayK*room, t); setRevTone(E, fdn, FDEPTH_LIGHT.tone, t); }
    if(on){ clearTimeout(offT); retF.connect(fxOut); }
    for(const [g,to] of [[convIn, on?0:1], [gateF, on?1:0]]){ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(to, t+0.1); }   // a linear ramp ends EXACTLY at 0
    if(!on && !E.offline) offT=setTimeout(()=>{ if(!lightOn) try{ retF.disconnect(fxOut); }catch(e){} }, 4000); };   // its feedback loops would run forever: out of the graph after the tail
  let mix=1, depth=0, reach=1;
  const apply=w=>{ const t=w!=null?w:ac.currentTime, c=calmDepth(depth*reach);
    send.gain.setTargetAtTime(mix*c.send, t, 0.08); dry.gain.setTargetAtTime(1-mix*(1-c.dry), t, 0.08); lp.frequency.setTargetAtTime(c.lp, t, 0.08); };
  const SET={ mix:(v,w)=>{ mix=v; apply(w); }, depth:(v,w)=>{ depth=v; apply(w); }, reach:(v,w)=>{ reach=v; apply(w); }, light:(v,w)=>lightSet(v,w),
              room:v=>{ const r=forestRoom(v); if(r!==room){ room=r; conv.buffer=forestBuffer(E, r); if(fdn) setRevDecay(E, fdn, FDEPTH_LIGHT.decayK*r); } } };
  const params=FDEPTH_PARAMS.map(sp=>({...sp, set:SET[sp.key]}));
  for(const p of params) fxWrapParam(p);
  params[0].setNorm(params[0].cur);
  return { id:'fdepth', labelKey:'fx.fdepth', kind:'bus', in:fxIn, out:fxOut, send, gate, params, conv, room:()=>room, light:()=>lightOn, nodes:{ dry, lp, convIn, gateF } };   // nodes: read by the probe
}
export { FDEPTH_PARAMS, makeForestDepthFx };
