/* ENG2 (RUN 4): row «ENG2 engine readouts» (quick and all; reads only, ≈ 3 s). voices() counts equal the pools and follow a silent probe
   chord and two silent drum hits; levels() gives the master and (built on request) the four role buses in dB; load() reports the browser's
   own counters exactly where the browser has them (`playoutStats` / `renderCapacity` on the prototype) and `undefined` elsewhere — never a
   guess; the latency meter shows the dropouts line and the PROVISIONAL power class; the audio benchmark returns a finite factor (not
   stored by the probe); R.engine() answers and marks the class provisional; nothing switched (the vision switches and live settings are as
   before). CONTROL: a fake `playbackStats` on the context must reach load() (the detection reads the real property, not a constant). */
import { row } from './rows.js';
import { AC, engVoices, engLevels, engLoad, poolSizes, chordOn, chordOff, drumHit } from '../audio.js';
import { latReport, latText } from '../latmeter.js';
import { t } from '../i18n.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const dbOk=x=> x===-Infinity || (typeof x==='number' && Number.isFinite(x) && x<=24);
export async function checkEngReadouts(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const R=await import('../render.js');
  const sw0=JSON.stringify(latReport().switches);
  try{
    /* voices */
    { const V=engVoices(), P=poolSizes(); n+=2;
      if(V.ld.built!==P.lead || V.ch.built!==P.chord || V.bs.built!==P.bass) miss(`voices(): built ${JSON.stringify([V.ld.built,V.ch.built,V.bs.built])} differ from the pools ${JSON.stringify([P.lead,P.chord,P.bass])}`);
      if(V.ch.sounding>V.ch.built || V.ld.sounding>V.ld.built) miss('voices(): more voices sounding than built');
      const s0=V.ch.sounding, h0=V.drums.hitsLastSec;
      chordOn('probe:eng2', [220, 277.18, 329.63], 0, 0, null); drumHit(1, 0, 0, null); drumHit(3, 0, 0, null);
      const V1=engVoices(); n+=2;
      if(V1.ch.sounding!==s0+3) miss(`voices(): a 3-note probe chord moved «sounding» ${s0} → ${V1.ch.sounding}`);
      if(V1.drums.hitsLastSec!==h0+2) miss(`voices(): two hits moved «hits in the last second» ${h0} → ${V1.drums.hitsLastSec}`);
      chordOff('probe:eng2'); n++; if(engVoices().ch.sounding!==s0) miss('voices(): the released probe chord still counts as sounding'); }
    /* levels */
    { const Lv=engLevels({ roles:true }); n+=2;
      if(!Lv.master || !dbOk(Lv.master.peakDb) || !dbOk(Lv.master.rmsDb) || !Number.isFinite(Lv.master.reductionDb)) miss(`levels(): master ${JSON.stringify(Lv.master)}`);
      if(!Lv.roles || ['ld','ch','bs','dr'].some(k=>!dbOk(Lv.roles[k]))) miss(`levels({roles}): ${JSON.stringify(Lv.roles)}`); }
    /* load — exactly where the browser has the counters */
    { const pro=AC && Object.getPrototypeOf(AC), hasP=!!(pro && ('playbackStats' in pro || 'playoutStats' in pro)), hasC=!!(AC && 'renderCapacity' in Object.getPrototypeOf(AC));
      engLoad(); await sleep(1300); const Ld=engLoad(); n+=2;
      if(hasP !== (Ld.playout!==undefined)) miss(`load(): playback statistics ${hasP?'present':'absent'} in this browser, the readout says ${JSON.stringify(Ld.playout)}`);
      if(!hasC && Ld.capacity!==undefined) miss('load(): renderCapacity absent, yet a capacity was reported');
      if(hasC && Ld.capacity===undefined) miss('load(): renderCapacity present, no update after 1.3 s');
      /* CONTROL: a fake counter on this context must be read */
      const own=Object.getOwnPropertyDescriptor(AC,'playbackStats');
      try{ Object.defineProperty(AC, 'playbackStats', { configurable:true, get:()=>({ underrunEvents:7, underrunDuration:0.01, totalDuration:60 }) });
        n++; const F=engLoad(); if(!F.playout || F.playout.events!==7) miss('CONTROL: a fake playbackStats did not reach load() — the readout cannot see the real one'); }
      finally{ if(own) Object.defineProperty(AC,'playbackStats',own); else delete AC.playbackStats; }
      meas2('ENG2', hasP, hasC); }
    /* the meter */
    { const r=latReport(), tx=latText(r); n+=3;
      if(!('dropoutsPerMinute' in r.audio) || !('dropSource' in r.audio)) miss('latReport(): no dropouts fields');
      const keys=['diag.drop','diag.dropWait','diag.dropNone'].map(k=>t(k,{ n:'' }).split(':')[0]);
      if(!keys.some(k=>tx.includes(k))) miss('the latency meter text has no dropouts line');
      if(!r.power || r.power.provisional!==true || !/^(high|mid|low|unknown)$/.test(r.power.cls)) miss(`the meter's power class: ${JSON.stringify(r.power)}`); }
    /* the benchmark (not stored) and R.engine() */
    { const b=await R.engBench({ force:true, noStore:true }); n++;
      if(!(Number.isFinite(b.factor) && b.factor>0 && b.factor<50)) miss(`the audio benchmark gave ${JSON.stringify(b)}`);
      const keep=console.log; let E; console.log=()=>{}; try{ E=R.engine(); } finally{ console.log=keep; }
      n++; if(!E || !E.power || E.power.provisional!==true || !E.voices || !E.levels) miss(`R.engine(): ${JSON.stringify(E).slice(0,200)}`); }
    n++; if(JSON.stringify(latReport().switches)!==sw0) miss('a test switch changed — the readouts must switch nothing');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d };
}
let FEAT='';
const meas2=(k,p,c)=>{ FEAT=`playback statistics ${p?'yes':'no'}, renderCapacity ${c?'yes':'no'}`; };
export const engFeatures=()=>FEAT;
row({ at:1001.6, name:'ENG2 engine readouts', run:()=>checkEngReadouts(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, status:FEAT||undefined }) });
