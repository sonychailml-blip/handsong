import { leadIdx, setLeadIdx } from './state.js';
import { baseF } from './scales.js';
import { hooks } from './hooks.js';
 
/* ================= МУЗЫКАЛЬНЫЕ КОНСТАНТЫ ================= */
 
const LEAD_INSTR=[
  {label:'SuperSaw', att:0.012, rel:0.10},
  {label:'Орган',    att:0.008, rel:0.07},
  {label:'Пад',      att:0.120, rel:0.35},
  {label:'Колокол',  att:0.004, rel:0.30},
  {label:'Флейта',   att:0.050, rel:0.18},
  {label:'8-бит',    att:0.002, rel:0.05},
];
/* Аккордовые тембры: 2 осциллятора (типы t1/t2, отношение частот ratio,
   расстройка det в центах, микс m1/m2), общий НЧ-фильтр lp, огибающая att/rel. */
const CHORD_INSTR=[
  {label:'Тёплый пад',     t1:'sawtooth', t2:'sawtooth', ratio:1, det:9, m1:.50, m2:.50, lp:1500, lvl:.17, att:.22,  rel:.50},
  {label:'Стеклянный пад', t1:'triangle', t2:'sine',     ratio:2, det:5, m1:.55, m2:.30, lp:3400, lvl:.21, att:.14,  rel:.60},
  {label:'Орган',          t1:'square',   t2:'sine',     ratio:2, det:0, m1:.45, m2:.35, lp:4200, lvl:.15, att:.012, rel:.09},
  {label:'Эл. пиано',      t1:'sine',     t2:'sine',     ratio:3, det:0, m1:.60, m2:.16, lp:5200, lvl:.22, att:.004, rel:.45},
];
/* ================= АУДИО-ДВИЖОК (чистый Web Audio) ================= */
let AC=null, master, limiter, verb, verbOut;
let banks=[], vibGain, satWet, satDry, envGain, volGain,
    tremGain, tremDepth, dlyWet, revLead;              // соло-цепочка
let chordBus, revCh;                                    // аккорды
let backBus, backRev, dO1, dO2, dG, noiseBuf;           // подложка
const cv=[]; const chordHold={};                        // пул аккордовых голосов
let noteOnFlag=false;
 
function makeSatCurve(k=4,n=1024){ const c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=i/(n-1)*2-1; c[i]=Math.tanh(k*x);} return c; }
function makeIR(sec=1.8,decay=2.2){
  const len=Math.floor(AC.sampleRate*sec), b=AC.createBuffer(2,len,AC.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}
  return b;
}
function mkOsc(type,freq,dest,gainVal){
  const o=AC.createOscillator(); o.type=type; o.frequency.value=freq;
  const g=AC.createGain(); g.gain.value=gainVal;
  o.connect(g); g.connect(dest); vibGain.connect(o.detune); o.start();
  return o;
}
/* --- Соло-банки: 4 тембра из версии 2 сохранены 1-в-1, добавлены Флейта и 8-бит --- */
function buildLeadBanks(preBus){
  { // SuperSaw
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const oscs=[]; for(const sp of [-12,-6,0,6,12]){
      const o=mkOsc('sawtooth',220,ig,0.17); o.detune.value=sp; oscs.push(o); }
    banks.push({gain:ig,setFreq:(f,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,0.02))});
  }
  { // Орган (аддитивный)
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const parts=[[1,.42],[2,.22],[3,.14],[4,.09]].map(([h,g])=>({h,o:mkOsc('sine',220*h,ig,g)}));
    banks.push({gain:ig,setFreq:(f,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,0.02))});
  }
  { // Пад
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2100; lp.connect(ig);
    const oscs=[]; for(const dt of [-7,0,7]){
      const o=mkOsc('triangle',220,lp,0.34); o.detune.value=dt; oscs.push(o); }
    banks.push({gain:ig,setFreq:(f,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,0.02))});
  }
  { // Колокол (FM)
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const car=mkOsc('sine',220,ig,0.5);
    const mod=AC.createOscillator(); mod.type='sine'; mod.frequency.value=220*3.507;
    const mg=AC.createGain(); mg.gain.value=220*1.6;
    mod.connect(mg); mg.connect(car.frequency); mod.start();
    banks.push({gain:ig,setFreq:(f,t)=>{
      car.frequency.setTargetAtTime(f,t,0.02);
      mod.frequency.setTargetAtTime(f*3.507,t,0.02);
      mg.gain.setTargetAtTime(f*1.6,t,0.02); }});
  }
  { // Флейта: треугольник + синус-подпорка
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o1=mkOsc('triangle',220,ig,0.35);
    const o2=mkOsc('sine',220,ig,0.22); o2.detune.value=4;
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02);
      o2.frequency.setTargetAtTime(f,t,0.02);}});
  }
  { // 8-бит: чистый прямоугольник
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o=mkOsc('square',220,ig,0.28);
    banks.push({gain:ig,setFreq:(f,t)=>o.frequency.setTargetAtTime(f,t,0.02)});
  }
}
/* --- Пул аккордовых голосов (8 штук, всегда запущены, гейт по громкости) --- */
function buildChordPool(dest){
  for(let i=0;i<8;i++){
    const o1=AC.createOscillator(), o2=AC.createOscillator();
    const g1=AC.createGain(), g2=AC.createGain();
    const f=AC.createBiquadFilter(), g=AC.createGain();
    o1.type='sawtooth'; o2.type='sawtooth'; f.type='lowpass'; f.frequency.value=1500;
    g1.gain.value=.5; g2.gain.value=.5; g.gain.value=0;
    o1.connect(g1); o2.connect(g2); g1.connect(f); g2.connect(f); f.connect(g); g.connect(dest);
    o1.start(); o2.start();
    cv.push({o1,o2,g1,g2,f,g,owner:null,ins:null,tOn:0,lvl:0});
  }
}
function cvRelease(v,hard){ const t=AC.currentTime;
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setTargetAtTime(0,t,hard?0.02:(v.ins?v.ins.rel:0.3));
  v.owner=null;
}
function cvAlloc(){ let v=cv.find(v=>!v.owner);
  if(!v){ v=cv.reduce((a,b)=>a.tOn<b.tOn?a:b); cvRelease(v,true); }
  return v;
}
function chordOn(owner,freqs,vol,insIdx){
  chordOff(owner);
  const ins=CHORD_INSTR[insIdx], t=AC.currentTime;
  chordHold[owner]=freqs.map(fr=>{
    const v=cvAlloc(); v.owner=owner; v.ins=ins; v.tOn=t;
    v.o1.type=ins.t1; v.o2.type=ins.t2;
    v.o1.detune.setValueAtTime(-ins.det/2,t); v.o2.detune.setValueAtTime(ins.det,t);
    v.g1.gain.setValueAtTime(ins.m1,t); v.g2.gain.setValueAtTime(ins.m2,t);
    v.f.frequency.setValueAtTime(ins.lp,t);
    v.o1.frequency.setValueAtTime(fr,t); v.o2.frequency.setValueAtTime(fr*ins.ratio,t);
    v.lvl=ins.lvl*(0.25+0.75*vol);
    v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(0,t);
    v.g.gain.setTargetAtTime(v.lvl,t,ins.att);
    return v;
  });
}
function chordGlide(owner,freqs,vol){        // смена аккорда без переатаки — voice leading
  const vs=chordHold[owner]; if(!vs)return; const t=AC.currentTime;
  vs.forEach((v,i)=>{ const fr=freqs[i]; if(fr==null)return;
    v.o1.frequency.setTargetAtTime(fr,t,0.035);
    v.o2.frequency.setTargetAtTime(fr*v.ins.ratio,t,0.035);
    const L=v.ins.lvl*(0.25+0.75*vol);
    if(Math.abs(L-v.lvl)>0.003){ v.lvl=L; v.g.gain.setTargetAtTime(L,t,0.05); }
  });
}
function chordOff(owner){ const vs=chordHold[owner]; if(!vs)return;
  vs.forEach(v=>cvRelease(v,false)); delete chordHold[owner]; }
 
function initAudio(){
  AC=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  /* Мастер: сумма → лимитер (жёсткий компрессор) → выход.
     Лимитер обязателен: аккорды + драйв + подложка легко клиппируют. */
  limiter=AC.createDynamicsCompressor();
  limiter.threshold.value=-6; limiter.knee.value=0; limiter.ratio.value=20;
  limiter.attack.value=0.002; limiter.release.value=0.15;
  limiter.connect(AC.destination);
  master=AC.createGain(); master.gain.value=0.9; master.connect(limiter);
 
  /* Общий ревербератор: один конвольвер, у каждого источника свой send.
     Глубиной руки (Z) управляется только send соло-канала. */
  verb=AC.createConvolver(); verb.buffer=makeIR();
  verbOut=AC.createGain(); verbOut.gain.value=0.9;
  verb.connect(verbOut); verbOut.connect(master);
 
  /* --- СОЛО-цепочка (как в версии 2) --- */
  const vibLFO=AC.createOscillator(); vibLFO.frequency.value=5.5;
  vibGain=AC.createGain(); vibGain.gain.value=0;
  vibLFO.connect(vibGain); vibLFO.start();
 
  const preBus=AC.createGain(); preBus.gain.value=1;
  buildLeadBanks(preBus);
  banks[leadIdx].gain.gain.value=1;
 
  const shaper=AC.createWaveShaper(); shaper.curve=makeSatCurve(); shaper.oversample='2x';
  satDry=AC.createGain(); satDry.gain.value=1;
  satWet=AC.createGain(); satWet.gain.value=0;
  preBus.connect(satDry); preBus.connect(shaper); shaper.connect(satWet);
  const satSum=AC.createGain(); satDry.connect(satSum); satWet.connect(satSum);
 
  envGain=AC.createGain(); envGain.gain.value=0;
  volGain=AC.createGain(); volGain.gain.value=0.5;
  satSum.connect(envGain); envGain.connect(volGain);
 
  tremGain=AC.createGain(); tremGain.gain.value=1;
  const tremLFO=AC.createOscillator(); tremLFO.frequency.value=4;
  tremDepth=AC.createGain(); tremDepth.gain.value=0;
  tremLFO.connect(tremDepth); tremDepth.connect(tremGain.gain); tremLFO.start();
  volGain.connect(tremGain);
 
  const leadOut=AC.createGain(); leadOut.gain.value=1;
  tremGain.connect(leadOut); leadOut.connect(master);
 
  const dly=AC.createDelay(1); dly.delayTime.value=0.35;
  const fb=AC.createGain(); fb.gain.value=0.45; dly.connect(fb); fb.connect(dly);
  dlyWet=AC.createGain(); dlyWet.gain.value=0;
  leadOut.connect(dly); dly.connect(dlyWet); dlyWet.connect(master);
 
  revLead=AC.createGain(); revLead.gain.value=0;
  leadOut.connect(revLead); revLead.connect(verb);
 
  /* --- АККОРДЫ: чистая шина + фиксированный маленький send в реверб --- */
  chordBus=AC.createGain(); chordBus.gain.value=0.9; chordBus.connect(master);
  revCh=AC.createGain(); revCh.gain.value=0.12; chordBus.connect(revCh); revCh.connect(verb);
  buildChordPool(chordBus);
 
  /* --- ПОДЛОЖКА: своя шина в обход всех эффектов соло --- */
  backBus=AC.createGain(); backBus.gain.value=0.55; backBus.connect(master);
  backRev=AC.createGain(); backRev.gain.value=0.5; backRev.connect(verb);
  dO1=AC.createOscillator(); dO1.type='sawtooth'; dO1.frequency.value=baseF()/2;
  dO2=AC.createOscillator(); dO2.type='sawtooth'; dO2.frequency.value=baseF()/2*1.498;
  const dLP=AC.createBiquadFilter(); dLP.type='lowpass'; dLP.frequency.value=520;
  const dLFO=AC.createOscillator(); dLFO.frequency.value=0.06;
  const dLFOg=AC.createGain(); dLFOg.gain.value=260;
  dLFO.connect(dLFOg); dLFOg.connect(dLP.frequency); dLFO.start();
  dG=AC.createGain(); dG.gain.value=0;
  dO1.connect(dLP); dO2.connect(dLP); dLP.connect(dG); dG.connect(backBus);
  dO1.start(); dO2.start();
 
  noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
  { const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; }
}
function setLeadInstr(i){
  setLeadIdx(((i%LEAD_INSTR.length)+LEAD_INSTR.length)%LEAD_INSTR.length);
  if(!AC)return;
  const t=AC.currentTime;
  banks.forEach((b,j)=>b.gain.gain.setTargetAtTime(j===leadIdx?1:0,t,0.02));
  hooks.leadInstr && hooks.leadInstr(leadIdx);
}
function applyParams(p){
  const t=AC.currentTime;
  banks.forEach(b=>b.setFreq(p.freq,t));
  volGain.gain.setTargetAtTime(p.vol,t,0.04);
  vibGain.gain.setTargetAtTime(p.vib*35,t,0.05);
  satWet.gain.setTargetAtTime(p.drv,t,0.05);
  satDry.gain.setTargetAtTime(1-p.drv*0.7,t,0.05);
  tremDepth.gain.setTargetAtTime(p.trm*0.45,t,0.05);
  tremGain.gain.setTargetAtTime(1-p.trm*0.45,t,0.05);
  dlyWet.gain.setTargetAtTime(p.dly*0.55,t,0.08);
  revLead.gain.setTargetAtTime(p.rev*0.85,t,0.08);
}
function noteOn(){
  if(noteOnFlag)return; noteOnFlag=true;
  const t=AC.currentTime;
  envGain.gain.cancelScheduledValues(t);
  envGain.gain.setTargetAtTime(1,t,LEAD_INSTR[leadIdx].att);
}
function noteOff(){
  if(!noteOnFlag)return; noteOnFlag=false;
  const t=AC.currentTime;
  envGain.gain.cancelScheduledValues(t);
  envGain.gain.setTargetAtTime(0,t,LEAD_INSTR[leadIdx].rel);
}
 
/* Экспорт: `let` через export-клаузу — живые связки (AC виден после initAudio). */
export {
  initAudio, AC, setLeadInstr, applyParams, noteOn, noteOff,
  chordOn, chordGlide, chordOff, chordHold,
  LEAD_INSTR, CHORD_INSTR,
  backBus, backRev, dG, dO1, dO2, noiseBuf,
};
