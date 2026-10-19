/* AUD1c (RUN 3) / TIM3b (RUN 4) — the solo bank of a voice from its timbre RECORD: the subtractive engine type here; FM and KS dispatched. Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { mkOsc, voiceBuild, voiceStart } from './voice.js';
import { LEAD_GLIDE_TC, fstrike } from './stages.js';
import { buildFMBank } from './fm.js';
import { buildKSBank, buildKSFallback } from './ks.js';
import { buildTineBank } from './tine.js';   // C4a: the struck tine as a solo bank
import { buildModalBank } from './modal.js';   // RUN 7: struck modal instruments
import { buildBreathBank } from './breath.js';   // RUN 7: breathing sustained sounds

/* ═══ TIM3b (RUN 4): the SUBTRACTIVE engine type — a solo bank from its record's recipe ═══
   ig (the bank's gate) → preBus; an optional lowpass (freq, Q) into ig; the oscillators IN THE RECIPE'S ORDER (mkOsc: wave, 220·mult, gain;
   then its detune in cents) into the filter or ig — exactly the node order of the old hand-written bodies (the seeded phase draws follow
   creation order); setFreq / cancel walk the oscillators in that order (frequency f·mult); strike = the filter envelope (fstrike: open, tc,
   fv); hum:0 = no pitch humanisation (organs, pads — pure pitch for tunings). */
function buildSubtractive(E, preBus, R){
  const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
  let lp=null; if(R.filter){ lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=R.filter.freq; if(R.filter.Q!=null) lp.Q.value=R.filter.Q; lp.connect(ig); }
  const oscs=R.oscs.map(x=>{ const o=mkOsc(E, x.wave, 220*x.mult, lp||ig, x.gain); if(x.detune!=null) o.detune.value=x.detune; return { o, m:x.mult }; });
  const bank={ gain:ig, setFreq:(f,tc=LEAD_GLIDE_TC,t)=>oscs.forEach(x=>x.o.frequency.setTargetAtTime(f*x.m,t,tc)),
               cancel:t=>oscs.forEach(x=>x.o.frequency.cancelScheduledValues(t)) };
  if(R.strike) bank.strike=fstrike(lp, R.filter.freq, R.strike.open, R.strike.tc, R.strike.fv);
  if(R.hum===0) bank.hum=0;
  E.build.banks.push(bank);
}
/* One bank for a voice from its timbre RECORD (TIM3b; engines subtractive / fm2 / ks — a KS record without the worklet → the fallback pluck; C4a tine;
   RUN 7 modal and breath).
   banks — scratch (E.build.banks); vib — this voice's vibrato depth (mkOsc taps it into detune, beside hum); shim — its expression gate.
   Only the voice's OWN bank is built (lazily — never all timbres: a pool of voices × every bank would kill polyphony). */
function buildLeadBank(E, rec, pre, hum, vib, shim){   // AF5: shim — this voice's gate of the expression shimmer (live copy; null = the shared node)
  E.build.banks.length=0; E.build.hum=hum; E.build.vib=vib; E.build.shim=shim||null;
  voiceBuild(E);                                    // B: a new bank — the first oscillator starts at once, the others with their own phases (voiceStart)
  if(rec.engine==='subtractive') buildSubtractive(E, pre, rec.recipe);
  else if(rec.engine==='fm2') buildFMBank(E, pre, rec.recipe);
  else if(rec.engine==='ks'){ if(E.wk.ks) buildKSBank(E, pre, rec.recipe); else buildKSFallback(E, pre); }
  else if(rec.engine==='tine') buildTineBank(E, pre, rec.recipe, { id:rec.id, n:rec.policies.voices });   // RUN 8: policies.voices = the strike cap
  else if(rec.engine==='modal') buildModalBank(E, pre, rec.recipe, { id:rec.id, n:rec.policies.voices });
  else if(rec.engine==='breath') buildBreathBank(E, pre, rec.recipe);
  E.build.hum=null; E.build.vib=null; E.build.shim=null;
  return E.build.banks[0];
}
export { buildLeadBank, buildSubtractive };
