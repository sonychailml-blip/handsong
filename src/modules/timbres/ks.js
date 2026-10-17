/* AUD1c (RUN 3, 2026-10-16) — the Karplus–Strong solo banks (worklet `ks-string`) and the subtractive fallback plucks. Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { baseF } from '../../scales.js';
import { LEAD_GLIDE_TC, fstrike } from './stages.js';
import { mkOsc } from './voice.js';

/* TIM3b (RUN 4): the KS parameter table moved into the timbre records (data/timbres/solo.string.json … solo.pizzicato.json, engine 'ks':
   fb — decay length, damp — loop filter, exBase/exSpan — pluck brightness soft/loud, nl — in-loop non-linearity (jawari), symp — sympathetic
   strings following the tonic, body — a fixed body resonator; an empty recipe = the worklet's defaults («String»)). */

/* --- KS-банк: обёртка вокруг AudioWorkletNode 'ks-string' в контракт банка {gain,setFreq,cancel,strike}.
   node → [корпусный резонатор body] → ig → preBus: голос идёт через ОБЩУЮ цепочку (drive → огибающая →
   тремоло → delay/reverb), как любой банк. setFreq — a-rate param freq (та же setTargetAtTime 0.02, что у
   всех → глиссандо/бенд/терменвокс без спец-кода). strike — фронт param pluck в момент t (значение=vel).
   opts (the record's recipe, TIM3b): nl/fb/damp/exBase/exSpan → в processorOptions ворклета; symp — сочувственные струны
   (высокодобротные полосы, звенящие от выхода струны, тонально следуют за baseF(), ретюн на щипке — как
   droneOn за тоникой); body — фиксированный корпусный резонатор (peaking) в сухом пути.
   ОГРАНИЧЕНИЯ (осознанно): у KS нет oscillator.detune → детюн-вибрато и гуманизация его не касаются (hum:0).
   Ситар/тараб — УБЕДИТЕЛЬНЫЙ НАМЁК, не копия (реальные джавари — распределённое касание порожка). --- */
function buildKSBank(E, preBus, opts){
  opts=opts||{};
  const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
  const po={}; ['nl','fb','damp','exBase','exSpan'].forEach(k=>{ if(opts[k]!=null) po[k]=opts[k]; });   // только заданные — остальное дефолты ворклета
  if(E.offline) po.seed=Math.floor(E.rnd()*4294967296)>>>0;   // ⛳ копия рендера: семя шума щипка — из засеянного потока рендера (договор заморозки); живьём не берётся — поток живых чисел не сдвинут, ворклет на Math.random
  const node=new AudioWorkletNode(E.ac,'ks-string',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1],processorOptions:po});
  const freqP=node.parameters.get('freq'), pluckP=node.parameters.get('pluck');
  if(opts.body){ const bd=E.ac.createBiquadFilter(); bd.type='peaking';   // сухой путь через корпусный резонатор
    bd.frequency.value=opts.body.hz; bd.Q.value=opts.body.Q; bd.gain.value=opts.body.db; node.connect(bd); bd.connect(ig); }
  else node.connect(ig);
  let symp=null;
  if(opts.symp){ const s=opts.symp, sum=E.ac.createGain(); sum.gain.value=s.gain;   // сочувственные струны — тихий параллельный посыл
    const b0=E.build.symp||baseF();   // TF2: built for the note that needs it — its view's tonic (live: the live key)
    symp=s.ratios.map(r=>{ const bp=E.ac.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=s.Q;
      bp.frequency.value=b0*r; node.connect(bp); bp.connect(sum); return {bp,r}; });
    sum.connect(ig); }
  /* TF2: the strings follow the KEY OF THE NOTE being plucked (a replayed track: its view's key; live: the live key) */
  const retune=(base,t)=>{ if(!symp)return; const b=base||baseF();
    symp.forEach(x=>x.bp.frequency.setTargetAtTime(b*x.r,t,0.05)); };
  E.build.banks.push({gain:ig,
    setFreq:(f,tc=LEAD_GLIDE_TC,t)=>freqP.setTargetAtTime(f,t,tc),
    cancel:t=>freqP.cancelScheduledValues(t),
    strike:(t,vel,base)=>{ retune(base, Math.max(t||0, E.ac.currentTime)); const v=Math.max(0.05,Math.min(1,vel==null?0.6:vel));
      pluckP.cancelScheduledValues(t); pluckP.setValueAtTime(v,t); pluckP.setValueAtTime(0,t+0.005); },   // импульс: фронт=щипок, спад — чтобы следующая нота дала новый фронт
    hum:0});
}

/* Запасной субтрактивный щипок для слотов Струна/Ситар, если KS-ворклет не загрузился (держит индексы). */
function buildKSFallback(E, preBus){
  const ig=E.ac.createGain(); ig.gain.value=0;
  const lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1800; lp.connect(ig); ig.connect(preBus);
  const o=mkOsc(E, 'sawtooth',220,lp,0.26);
  E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>o.frequency.setTargetAtTime(f,t,tc),
              cancel:t=>o.frequency.cancelScheduledValues(t), strike:fstrike(lp,1800,3.0,0.1,1.4)});
}
export { buildKSBank, buildKSFallback };
