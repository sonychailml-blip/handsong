/* AUD1c (RUN 3, 2026-10-16) — the Karplus–Strong solo banks (worklet `ks-string`) and the subtractive fallback plucks. Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { baseF } from '../../scales.js';
import { LEAD_GLIDE_TC, freezeDeep, fstrike } from './stages.js';
import { mkOsc } from './voice.js';

/* Таблица KS-банков (порядок = хвост LEAD_INSTR с индекса 16). Все — ОДНА струна с разными
   параметрами (никакой новой архитектуры): fb — длина затухания, damp — петлевой фильтр (0.5 =
   максимум затухания верхов, дальше = ярче), exBase/exSpan — яркость щипка (тихо/громко), nl —
   нелинейность в петле (джавари/металл), symp — сочувственные струны (тонально следуют за тоникой),
   body — фиксированный корпусный резонатор. Пустой объект = дефолты ворклета → «Струна» байт-в-байт;
   «Ситар» = nl 2.5 + тараб (как было). Чем каждый ОТЛИЧАЕТСЯ — в комментарии справа. */
const KS_BANKS=freezeDeep([
  {},                                                                                             // Струна: эталон (fb .992, damp .5, щипок .15/.8)
  {nl:2.5, symp:{ratios:[1,4/3,3/2,2,9/4], Q:60, gain:.10}},                                       // Ситар: джавари (клип в петле) + тараб (5 полос)
  {fb:.984, damp:.50, exBase:.04, exSpan:.40},                                                     // Уд: тёмный мягкий щипок + короче хвост, без буза — тёплая лютня
  {fb:.994, damp:.44, exBase:.30, exSpan:.55, symp:{ratios:[1,3/2], Q:50, gain:.05}},              // Кото: яркая атака, длиннее хвост, лёгкий сочувственный звон
  {fb:.972, damp:.40, exBase:.55, exSpan:.40, nl:1.2, body:{hz:3400, Q:1.2, db:5}},                // Сантур: ЖЁСТКИЙ яркий удар, быстрый спад, мягкий металлический край (но струна, не FM)
  {fb:.995, damp:.46, exBase:.22, exSpan:.70},                                                     // Гитара: ярко + длинный сустейн — самый «привычный»
  {fb:.965, damp:.50, exBase:.18, exSpan:.60},                                                     // Пиццикато: очень быстрый спад (низкий fb) — короткий глушёный щипок для ритма
]);

/* --- KS-банк: обёртка вокруг AudioWorkletNode 'ks-string' в контракт банка {gain,setFreq,cancel,strike}.
   node → [корпусный резонатор body] → ig → preBus: голос идёт через ОБЩУЮ цепочку (drive → огибающая →
   тремоло → delay/reverb), как любой банк. setFreq — a-rate param freq (та же setTargetAtTime 0.02, что у
   всех → глиссандо/бенд/терменвокс без спец-кода). strike — фронт param pluck в момент t (значение=vel).
   opts (из KS_BANKS): nl/fb/damp/exBase/exSpan → в processorOptions ворклета; symp — сочувственные струны
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
export { KS_BANKS, buildKSBank, buildKSFallback };
