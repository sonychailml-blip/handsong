/* RUN 7 (C4b, Calm plan §4.2; the C4b design note; the user's choice «Calm gets its own wider range, Full unchanged») — the effect
   «Forest depth»: Calm's room. An ENGINE SUBMODULE (hard rule #38): stateless — every engine value comes from E (first argument); each
   instance keeps its own two values in its closure (the instance lives in E's effect tables).
   The same seeded Night forest room (core/dsp.forestIR, shared buffer per length) — but its amounts follow the playing hand's DEPTH with the
   prototype's distance colouring (core/dsp.calmDepth): send 0.5 → 1.3, dry 1 → 0.45, and a darkening lowpass 8.9 kHz → 900 Hz on the
   signal that feeds both (the far note is darker AND further in the room). `mix` (0…1) scales the whole colouring — 0 is exact identity
   (dry 1, nothing filtered, send 0), Calm fixes it at 1. Bus module: one convolver per chain instance, never per note. Not offered in Full's
   «+ Add» list (calm:true); Full's «Night forest» is untouched. */
import { freezeDeep } from '../timbres/stages.js';
import { FOREST, forestRoom, calmDepth, CALM_DEPTH } from '../../core/dsp.js';
import { fxWrapParam } from './param.js';
import { forestBuffer } from './forest.js';

const FDEPTH_PARAMS=freezeDeep([ {key:'mix', labelKey:'fx.fdepth.mix', short:'MIX', unit:'', def:1, min:0, max:1, curve:'lin'},
  {key:'depth', labelKey:'fx.fdepth.depth', short:'DPTH', unit:'', def:0, min:0, max:1, curve:'lin'},
  {key:'room', labelKey:'fx.forest.room', short:'ROOM', unit:'s', def:FOREST.room, min:FOREST.rooms[0], max:FOREST.rooms[2], curve:'log', pick:FOREST.rooms,
   pickKeys:['fx.forest.room.short','fx.forest.room.medium','fx.forest.room.long']} ]);

function makeForestDepthFx(E){
  const ac=E.ac, fxIn=ac.createGain(), fxOut=ac.createGain(); fxIn.gain.value=1; fxOut.gain.value=1;
  /* pre = (1 − w)·direct + w·lowpassed, w = mix·depth; then dry and send */
  const direct=ac.createGain(), lp=ac.createBiquadFilter(), dark=ac.createGain(), pre=ac.createGain(), dry=ac.createGain();
  try{ lp.frequency.automationRate='k-rate'; }catch(e){}   // cost: the depth moves slowly (block rate is inaudible)
  lp.type='lowpass'; lp.Q.value=0.5; lp.frequency.value=CALM_DEPTH.lp0+CALM_DEPTH.lpK; direct.gain.value=1; dark.gain.value=0; pre.gain.value=1; dry.gain.value=1;
  fxIn.connect(direct); direct.connect(pre); fxIn.connect(lp); lp.connect(dark); dark.connect(pre); pre.connect(dry); dry.connect(fxOut);
  const send=ac.createGain(); send.gain.value=0;
  const gate=ac.createGain(); gate.gain.value=1;
  const conv=ac.createConvolver(); conv.normalize=false;
  let room=FOREST.room; conv.buffer=forestBuffer(E, room);
  const ret=ac.createGain(); ret.gain.value=FOREST.wet;
  pre.connect(send); send.connect(gate); gate.connect(conv); conv.connect(ret); ret.connect(fxOut);
  let mix=1, depth=0;
  const apply=w=>{ const t=w!=null?w:ac.currentTime, c=calmDepth(depth), k=mix*depth;
    send.gain.setTargetAtTime(mix*c.send, t, 0.08); dry.gain.setTargetAtTime(1-mix*(1-c.dry), t, 0.08);
    direct.gain.setTargetAtTime(1-k, t, 0.08); dark.gain.setTargetAtTime(k, t, 0.08); lp.frequency.setTargetAtTime(c.lp, t, 0.08); };
  const SET={ mix:(v,w)=>{ mix=v; apply(w); }, depth:(v,w)=>{ depth=v; apply(w); },
              room:v=>{ const r=forestRoom(v); if(r!==room){ room=r; conv.buffer=forestBuffer(E, r); } } };
  const params=FDEPTH_PARAMS.map(sp=>({...sp, set:SET[sp.key]}));
  for(const p of params) fxWrapParam(p);
  params[0].setNorm(params[0].cur);
  return { id:'fdepth', labelKey:'fx.fdepth', kind:'bus', in:fxIn, out:fxOut, send, gate, params, conv, room:()=>room, nodes:{ dry, direct, dark, lp } };   // nodes: read by the probe
}
export { FDEPTH_PARAMS, makeForestDepthFx };
