/* AUD2a (RUN 3, 2026-10-16) — the effect «Night forest» (a seeded convolution room, SND-F1). Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { freezeDeep } from '../timbres/stages.js';   // R2: shared declarations are deep-frozen
import { FOREST, forestRoom } from '../../core/dsp.js';
import { fxWrapParam } from './param.js';

/* roles — У ГОЛОСОВОГО модуля: каким ролям он что-то делает, то есть кому его ПРЕДЛАГАТЬ в зоне «в ноте» (ui). Шинные
   принимают любой сигнал и поля не имеют. ⚠️ Прежде общий список «+ Добавить» перечислял ВСЮ фабрику, и яркость аккордов
   предлагалась соло, басу и ударным, где её не читает никто. */
/* ═══ SND-F1 — «NIGHT FOREST»: A CONVOLUTION ROOM (bus module) ═══
   The Calm prototype's room: a 3.4-s stereo noise impulse response with the envelope (1 − i/len)^2.6 (core/dsp.forestIR — SEEDED, the same
   at any sample rate, live and offline: frozen = live), wet return 0.55, the note send «mix» (default 0.8 = the prototype). ONE convolver
   per chain instance (live and track chains separate, rule #31), never per note. The IR is normalised by us exactly as the Web Audio
   spec's normalize = true would (core/dsp.irNormScale) and the node runs with normalize = false — the level does not depend on the browser.
   A mix 0 module is identity (dry 1, send 0). Generated once per sample rate (≈ 10 ms) and shared by every instance. */
/* SND-F1b «room»: Short 0.85 · Medium 1.7 (default) · Long 3.4 s — log curve, so 0 / ½ / 1 of the range are exactly the three lengths;
   `pick` = the offered values (the panel shows buttons, the value snaps). A change swaps the convolver's IR at once (not schedulable: a
   room change cuts the ringing tail — it is a set-once choice; a change recorded mid-take is applied from the render's start). */
const FOREST_PARAMS=freezeDeep([ {key:'mix', labelKey:'fx.forest.mix', short:'FRST', unit:'', def:FOREST.send, min:0, max:1, curve:'lin'},
  {key:'room', labelKey:'fx.forest.room', short:'ROOM', unit:'s', def:FOREST.room, min:FOREST.rooms[0], max:FOREST.rooms[2], curve:'log', pick:FOREST.rooms,
   pickKeys:['fx.forest.room.short','fx.forest.room.medium','fx.forest.room.long']} ]);

function forestBuffer(E, sec){ const ch=E.buf.forestData(E.ac.sampleRate, sec), b=E.ac.createBuffer(2, ch[0].length, E.ac.sampleRate); ch.forEach((d,i)=>b.copyToChannel(d,i)); return b; }

function makeForestFx(E){
  const fxIn=E.ac.createGain(), fxOut=E.ac.createGain(), dry=E.ac.createGain(); fxIn.gain.value=1; fxOut.gain.value=1; dry.gain.value=1;
  fxIn.connect(dry); dry.connect(fxOut);
  const send=E.ac.createGain(); send.gain.value=0;
  const gate=E.ac.createGain(); gate.gain.value=1;
  const conv=E.ac.createConvolver(); conv.normalize=false;   // normalize BEFORE the buffer: it is read when the buffer is set
  let room=FOREST.room; conv.buffer=forestBuffer(E, room);
  const ret=E.ac.createGain(); ret.gain.value=FOREST.wet;
  fxIn.connect(send); send.connect(gate); gate.connect(conv); conv.connect(ret); ret.connect(fxOut);
  const SET={ mix:(v,w)=>{ send.gain.setTargetAtTime(v, w!=null?w:E.ac.currentTime, 0.08); },
              room:v=>{ const r=forestRoom(v); if(r!==room){ room=r; conv.buffer=forestBuffer(E, r); } } };
  const params=FOREST_PARAMS.map(sp=>({...sp, set:SET[sp.key]}));
  for(const p of params) fxWrapParam(p);
  params[0].setNorm(params[0].cur);
  return { id:'forest', labelKey:'fx.forest', kind:'bus', in:fxIn, out:fxOut, send, gate, params, conv, room:()=>room };
}
export { FOREST_PARAMS, forestBuffer, makeForestFx };
