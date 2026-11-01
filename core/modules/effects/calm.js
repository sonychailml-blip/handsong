/* RUN 7 (C5, Calm plan §4.3; docs/CALM-QUALITY.md points 1, 4, 8) — THE CALM EFFECTS HAND: three effects, ONE amount each (a vertical drag
   of its finger; it stays where it is left). ENGINE SUBMODULES (hard rule #38): stateless — every engine value comes from E (first argument);
   each instance keeps its own values in its closure (the instance lives in E's effect tables). Calm-only (calm:true — not offered in Full's
   «+ Add»; Full's delay, brightness, vibrato and tremolo are untouched): the plan's one-amount curves need ranges the shared effects do not
   have. The forest shows each (views/scene/forest.js, through the bus): Echo — rings of light leaving the firefly on each echo; Warmth ↔
   Brightness — the light's colour (amber ↔ cold green-white); Wave — the light trembles at the same rate.
   - «Echo» (bus): one amount a → mix 0.45·a and feedback 0.55·a together; the repeats darken (a lowpass in the loop, Butterworth Q: the loop
     gain fb·|LP| < 1); time 0.625 s by default (a dotted eighth at Calm's 72 bpm). Amount 0 = exact identity (no send).
   - «Warmth ↔ Brightness» (insert): tilt 0…1, ½ = flat; below — warmer (low shelf up to +3 dB, highs down to −9 dB), above — brighter (highs
     up to +4 dB only: soft highs for long headphone sessions, low shelf −2 dB). `mix` 0 = exact identity; Calm fixes it at 1.
   - «Wave» (insert): one amount → a gentle vibrato (to ±14 cents, by a 2-ms delay line swung at 4.5 Hz — the same on every timbre) and a little
     tremolo (to 18 %), the same rate. `mix` 0 = exact identity; Calm fixes it at 1. */
import { freezeDeep } from '../timbres/stages.js';
import { fxWrapParam } from './param.js';

export const CALM_FX=freezeDeep({
  echo:{ mixK:0.45, fbK:0.55, time:0.625, lp:2600, send:0.9, maxTime:1.0 },
  tone:{ low:300, high:2600, warmLow:3, warmHigh:-9, brightHigh:4, brightLow:-2 },
  wave:{ rate:4.5, cents:14, trem:0.18, base:0.002 },
});
const BQ=-3.0103;   // Butterworth Q (Web Audio's lowpass Q is in dB) — no peak in the echo loop

const CECHO_PARAMS=freezeDeep([ {key:'amount', labelKey:'fx.cecho.amount', short:'ECHO', unit:'', def:0, min:0, max:1, curve:'lin'},
  {key:'time', labelKey:'fx.dly.time', short:'TIME', unit:'s', def:CALM_FX.echo.time, min:0.05, max:CALM_FX.echo.maxTime, curve:'log'} ]);
function makeCalmEchoFx(E){
  const ac=E.ac, X=CALM_FX.echo, fxIn=ac.createGain(), fxOut=ac.createGain(), dry=ac.createGain(); fxIn.gain.value=1; fxOut.gain.value=1; dry.gain.value=1;
  fxIn.connect(dry); dry.connect(fxOut);
  const send=ac.createGain(), gate=ac.createGain(), line=ac.createDelay(X.maxTime), lp=ac.createBiquadFilter(), fb=ac.createGain(), out=ac.createGain();
  send.gain.value=0; gate.gain.value=1; line.delayTime.value=X.time; lp.type='lowpass'; lp.frequency.value=X.lp; lp.Q.value=BQ; fb.gain.value=0; out.gain.value=1;
  fxIn.connect(send); send.connect(gate); gate.connect(line); line.connect(lp); lp.connect(fb); fb.connect(line); lp.connect(out); out.connect(fxOut);
  const SET={ amount:(a,w)=>{ const t=w!=null?w:ac.currentTime; send.gain.setTargetAtTime(X.send*X.mixK*a, t, 0.08); fb.gain.setTargetAtTime(X.fbK*a, t, 0.08); },
              time:(v,w)=>{ line.delayTime.setTargetAtTime(v, w!=null?w:ac.currentTime, 0.05); } };
  const params=CECHO_PARAMS.map(sp=>({...sp, set:SET[sp.key]}));
  for(const p of params) fxWrapParam(p);
  params[0].setNorm(params[0].cur); params[1].setNorm(params[1].cur);
  return { id:'cecho', labelKey:'fx.cecho', kind:'bus', in:fxIn, out:fxOut, send, gate, params };
}

const CTONE_PARAMS=freezeDeep([ {key:'mix', labelKey:'fx.fdepth.mix', short:'MIX', unit:'', def:1, min:0, max:1, curve:'lin'},
  {key:'tilt', labelKey:'fx.ctone.tilt', short:'TONE', unit:'', def:0.5, min:0, max:1, curve:'lin'} ]);
function makeCalmToneFx(E){
  const ac=E.ac, X=CALM_FX.tone, fxIn=ac.createGain(), fxOut=ac.createGain(), dry=ac.createGain(), wet=ac.createGain(); fxIn.gain.value=1; fxOut.gain.value=1;
  const lo=ac.createBiquadFilter(), hi=ac.createBiquadFilter(); lo.type='lowshelf'; lo.frequency.value=X.low; hi.type='highshelf'; hi.frequency.value=X.high;
  lo.gain.value=0; hi.gain.value=0; dry.gain.value=0; wet.gain.value=1;
  fxIn.connect(dry); dry.connect(fxOut); fxIn.connect(lo); lo.connect(hi); hi.connect(wet); wet.connect(fxOut);
  let mix=1, tilt=0.5, active=true;   // active: the chain's switch (fxGateAt / fxSetActive) — off = the dry path only (exact bypass)
  const apply=w=>{ const t=w!=null?w:ac.currentTime, u=Math.abs(tilt-0.5)*2, warm=tilt<0.5, m=active?mix:0;
    lo.gain.setTargetAtTime(u*(warm?X.warmLow:X.brightLow), t, 0.05); hi.gain.setTargetAtTime(u*(warm?X.warmHigh:X.brightHigh), t, 0.05);
    dry.gain.cancelScheduledValues(t); dry.gain.setValueAtTime(1-m, t); wet.gain.cancelScheduledValues(t); wet.gain.setValueAtTime(m, t); };   // mix / on-off are set-up choices: exact, no glide (identity at mix 0 is sample-exact)
  const SET={ mix:(v,w)=>{ mix=v; apply(w); }, tilt:(v,w)=>{ tilt=v; apply(w); } };
  const params=CTONE_PARAMS.map(sp=>({...sp, set:SET[sp.key]}));
  for(const p of params) fxWrapParam(p);
  params[0].setNorm(params[0].cur);
  return { id:'ctone', labelKey:'fx.ctone', kind:'insert', in:fxIn, out:fxOut, params, setActive:(on,w)=>{ active=!!on; apply(w); } };
}

const CWAVE_PARAMS=freezeDeep([ {key:'mix', labelKey:'fx.fdepth.mix', short:'MIX', unit:'', def:1, min:0, max:1, curve:'lin'},
  {key:'amount', labelKey:'fx.cwave.amount', short:'WAVE', unit:'', def:0, min:0, max:1, curve:'lin'} ]);
function makeCalmWaveFx(E){
  const ac=E.ac, X=CALM_FX.wave, fxIn=ac.createGain(), fxOut=ac.createGain(), dry=ac.createGain(), wet=ac.createGain(); fxIn.gain.value=1; fxOut.gain.value=1;
  const line=ac.createDelay(0.02), swing=ac.createGain(), trem=ac.createGain(), tdep=ac.createGain(), lfo=ac.createOscillator();
  line.delayTime.value=X.base; swing.gain.value=0; trem.gain.value=1; tdep.gain.value=0; dry.gain.value=0; wet.gain.value=1; lfo.frequency.value=X.rate;
  lfo.connect(swing); swing.connect(line.delayTime); lfo.connect(tdep); tdep.connect(trem.gain);
  fxIn.connect(dry); dry.connect(fxOut); fxIn.connect(line); line.connect(trem); trem.connect(wet); wet.connect(fxOut);
  lfo.start(ac.currentTime);   // started once (rule #3 — an effect's LFO, like the tremolo's)
  const peak=(Math.pow(2, X.cents/1200)-1)/(2*Math.PI*X.rate);   // the delay swing (s) that gives ±cents of vibrato at the LFO's rate
  let mix=1, amt=0, active=true;
  const apply=w=>{ const t=w!=null?w:ac.currentTime, m=active?mix:0;
    swing.gain.setTargetAtTime(peak*amt, t, 0.08); tdep.gain.setTargetAtTime(X.trem*amt/2, t, 0.08); trem.gain.setTargetAtTime(1-X.trem*amt/2, t, 0.08);
    dry.gain.cancelScheduledValues(t); dry.gain.setValueAtTime(1-m, t); wet.gain.cancelScheduledValues(t); wet.gain.setValueAtTime(m, t); };   // mix / on-off are set-up choices: exact, no glide (identity at mix 0 is sample-exact)
  const SET={ mix:(v,w)=>{ mix=v; apply(w); }, amount:(v,w)=>{ amt=v; apply(w); } };
  const params=CWAVE_PARAMS.map(sp=>({...sp, set:SET[sp.key]}));
  for(const p of params) fxWrapParam(p);
  params[0].setNorm(params[0].cur);
  return { id:'cwave', labelKey:'fx.cwave', kind:'insert', in:fxIn, out:fxOut, params, setActive:(on,w)=>{ active=!!on; apply(w); } };
}
export { CECHO_PARAMS, CTONE_PARAMS, CWAVE_PARAMS, makeCalmEchoFx, makeCalmToneFx, makeCalmWaveFx };
