/* AUD2a (RUN 3, 2026-10-16) — the dynamics «Glue» (our compressor in the dyn worklet) and the dynamics node builder (also the master's Glue and Limiter). Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { freezeDeep } from '../timbres/stages.js';   // R2: shared declarations are deep-frozen
import { DYN_GLUE } from '../../core/dsp.js';
import { fxWrapParam } from './param.js';

/* ═══ SND-F1 — «GLUE»: OUR COMPRESSOR (insert module; also the master's optional Glue) ═══
   The dynamics worklet (dyn-worklet.js, mode 'comp'): zero lookahead, deterministic, soft knee, stereo-linked. ⛔ Not the built-in
   DynamicsCompressorNode: it delays the signal (lookahead), differs between browsers and is not guaranteed equal offline. Inactive = an
   exact bypass inside the worklet (10-ms crossfade). Without the worklet (load failed; a track render that does not need it) the module
   is an identity gain — never a different sound path. */
const GLUE_PARAMS=freezeDeep([
  {key:'thr',   labelKey:'fx.glue.thr',   short:'THR',  unit:'dB', def:DYN_GLUE.thr,   min:-48,    max:0,   curve:'lin'},
  {key:'ratio', labelKey:'fx.glue.ratio', short:'RAT',  unit:'',   def:DYN_GLUE.ratio, min:1,      max:20,  curve:'log'},
  {key:'knee',  labelKey:'fx.glue.knee',  short:'KNEE', unit:'dB', def:DYN_GLUE.knee,  min:0,      max:40,  curve:'lin'},
  {key:'att',   labelKey:'fx.glue.att',   short:'ATT',  unit:'s',  def:DYN_GLUE.att,   min:0.0005, max:0.1, curve:'log'},
  {key:'rel',   labelKey:'fx.glue.rel',   short:'REL',  unit:'s',  def:DYN_GLUE.rel,   min:0.02,   max:2,   curve:'log'},
  {key:'makeup',labelKey:'fx.glue.makeup',short:'GAIN', unit:'dB', def:DYN_GLUE.makeup,min:-12,    max:24,  curve:'lin'},
]);

/* one dynamics node: mode 'comp' | 'limit'; set = initial parameter values; keep = an engine node that lives as long as its context */
function dynNode(E, mode,set,keep,report){   // report: the limiter posts its gain reduction (dB) every 50 ms (the mixer's master strip)
  return new AudioWorkletNode(E.ac,'dyn',{ numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[2], channelCount:2, channelCountMode:'explicit',
    channelInterpretation:'speakers', processorOptions:{ mode, keep:!!keep, report:!!report }, parameterData:{ ...set } });
}

function makeGlueFx(E){
  let node=null;
  if(E.wk.dyn){ try{ node=dynNode(E, 'comp', { ...DYN_GLUE, on:1 }, true); }catch(e){ node=null; } }
  if(!node){ if(!E.wk.dynWarned){ E.wk.dynWarned=true; console.warn('[glue] the dynamics worklet is not loaded in this context — Glue passes the sound unchanged'); }
    node=E.ac.createGain(); node.gain.value=1; }
  const par=k=>node.parameters ? node.parameters.get(k) : null;
  const SET=k=>(v,w)=>{ const q=par(k); if(q) q.setTargetAtTime(v, w!=null?w:E.ac.currentTime, 0.02); };
  const params=GLUE_PARAMS.map(sp=>({...sp, set:SET(sp.key)}));
  for(const p of params) fxWrapParam(p);
  return { id:'glue', labelKey:'fx.glue', kind:'insert', in:node, out:node, params, worklet:!!node.parameters,
           setActive:(on,w)=>{ const q=par('on'); if(!q) return; const t=w!=null?w:E.ac.currentTime; q.cancelScheduledValues(t); q.setValueAtTime(on?1:0,t); } };
}
export { GLUE_PARAMS, dynNode, makeGlueFx };
