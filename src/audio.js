import { leadIdx, setLeadIdx, bassIdx, setBassIdx, drumKitIdx, setDrumKitIdx } from './state.js';
import { baseF } from './scales.js';
import { hooks } from './hooks.js';
import { CHORD_POOL_N, BASS_POOL_N } from './config.js';
 
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
/* Бас-тембры (моно-голос, низкий регистр): 2 осц (t1/t2, отношение ratio,
   расстройка det), НЧ-фильтр lp, огибающая att/rel. */
const BASS_INSTR=[
  {label:'Саб-синус', t1:'sine',     t2:'sine',     det:0,  ratio:1,   lp:420,  lvl:.45, att:.020, rel:.20},
  {label:'Пила',      t1:'sawtooth', t2:'sawtooth', det:9,  ratio:1,   lp:850,  lvl:.38, att:.014, rel:.16},
  {label:'Кислотный', t1:'square',   t2:'sawtooth', det:0,  ratio:1,   lp:1300, lvl:.34, att:.008, rel:.13},
  {label:'Синт-бас',  t1:'sawtooth', t2:'square',   det:12, ratio:0.5, lp:700,  lvl:.40, att:.020, rel:.24},
];
/* Ударные: имена рядов (индекс 0 = низ сетки). Синтез на лету, без сэмплов. */
const DRUM_NAMES=['Кик','Снейр','Клэп','Хэт','Том','Крэш'];
const DRUM_ROWS=DRUM_NAMES.length;
/* Наборы ударных: тембр рядов. Стандарт — синтезированный кит; Дарбука — дум/тек
   (спасены из удалённого backing.js). Селектор той же формы, что LEAD_INSTR и др. */
const DRUM_KITS=[{label:'Стандарт'},{label:'Дарбука'}];

/* ================= АУДИО-ДВИЖОК (чистый Web Audio) ================= */
let AC=null, master, limiter, verb, verbOut;
let banks=[], vibGain, satWet, satDry, envGain, volGain,
    tremGain, tremDepth, dlyWet, revLead;              // соло-цепочка
let chordBus, revCh;                                    // аккорды
let backBus, dO1, dO2, dG, noiseBuf;                    // дрон (шина + расстроенная пара)
const cv=[]; const chordHold={};                        // пул аккордовых голосов
let noteOnFlag=false;
const bv=[]; const bassHold={}; let bassBus;             // пул баса (моно-голос на слой)
let drumBus;                                             // шина ударных
 
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
/* --- Пул аккордовых голосов (всегда запущены, гейт по громкости; размер — CHORD_POOL_N) --- */
function buildChordPool(dest, n=CHORD_POOL_N){
  for(let i=0;i<n;i++){
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
  if(!v){ v=cv.reduce((a,b)=>a.tOn<b.tOn?a:b); const o=v.owner; cvRelease(v,true);   // кража: снять голос со старого владельца, иначе его chordOff порвёт чужую ноту
    if(o&&chordHold[o]){ const a=chordHold[o].filter(x=>x!==v); a.length?chordHold[o]=a:delete chordHold[o]; } }
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
  /* Лимитер — АВАРИЙНЫЙ потолок, а не компрессор. Порог/ratio оставлены как защита,
     но время смягчено: attack 2 мс был КОРОЧЕ периода басовой волны (55 Гц = 18 мс) —
     детектор шёл по самим колебаниям и модулировал весь микс на частоте баса.
     10 мс длиннее периода → реагирует на огибающую; release 250 мс превращает
     остаточное подавление в ровное смещение вместо «дыхания»; knee 6 — мягкий вход. */
  limiter.threshold.value=-6; limiter.knee.value=6; limiter.ratio.value=20;
  limiter.attack.value=0.010; limiter.release.value=0.25;
  limiter.connect(AC.destination);
  master=AC.createGain(); master.gain.value=0.8; master.connect(limiter);
 
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
 
  const leadOut=AC.createGain(); leadOut.gain.value=0.22;   // сушит и посылы (dly/rev идут ПОСЛЕ leadOut)
  tremGain.connect(leadOut); leadOut.connect(master);
 
  const dly=AC.createDelay(1); dly.delayTime.value=0.35;
  const fb=AC.createGain(); fb.gain.value=0.45; dly.connect(fb); fb.connect(dly);
  dlyWet=AC.createGain(); dlyWet.gain.value=0;
  leadOut.connect(dly); dly.connect(dlyWet); dlyWet.connect(master);
 
  revLead=AC.createGain(); revLead.gain.value=0;
  leadOut.connect(revLead); revLead.connect(verb);
 
  /* --- АККОРДЫ: чистая шина + фиксированный маленький send в реверб --- */
  chordBus=AC.createGain(); chordBus.gain.value=0.28; chordBus.connect(master);
  revCh=AC.createGain(); revCh.gain.value=0.12; chordBus.connect(revCh); revCh.connect(verb);
  buildChordPool(chordBus);
 
  /* --- БАС: пул моно-голосов (слой + живой), общая шина в master --- */
  bassBus=AC.createGain(); bassBus.gain.value=0.28; bassBus.connect(master);
  buildBassPool(bassBus);

  /* --- УДАРНЫЕ: своя шина в master (мимо эффектов соло) --- */
  drumBus=AC.createGain(); drumBus.gain.value=0.20; drumBus.connect(master);

  /* --- ДРОН: расстроенная пара пил через медленный НЧ-фильтр, на тонике (шина в master) --- */
  backBus=AC.createGain(); backBus.gain.value=0.28; backBus.connect(master);
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
/* --- БАС: пул моно-голосов (один на слой). Тембр печётся НА АТАКЕ по слою (как аккорд),
   а не глобально — записанный слой сохраняет свой инструмент (§3.4, как строй/септаккорд). --- */
function buildBassPool(dest){
  for(let i=0;i<BASS_POOL_N;i++){
    const o1=AC.createOscillator(), o2=AC.createOscillator();
    const g1=AC.createGain(), g2=AC.createGain();
    const lp=AC.createBiquadFilter(), env=AC.createGain(), vol=AC.createGain();
    o1.type='sawtooth'; o2.type='sawtooth'; lp.type='lowpass'; lp.frequency.value=500;
    /* Осцилляторы приглушены ДО фильтра (как m1/m2 у аккордов): иначе два осциллятора
       в фазе дают пик 2.0 — в 12 раз громче аккордового голоса, и бас в одиночку
       вгонял лимитер в 12 дБ подавления, «прижимая» аккорды на всю длину ноты. */
    g1.gain.value=.5; g2.gain.value=.5;
    env.gain.value=0; vol.gain.value=0.5;
    o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp); lp.connect(env); env.connect(vol); vol.connect(dest);
    o1.start(); o2.start();
    bv.push({o1,o2,g1,g2,lp,env,vol,owner:null,ins:null,tOn:0,on:false});
  }
}
function bvRelease(v,hard){ const t=AC.currentTime;
  v.env.gain.cancelScheduledValues(t);
  v.env.gain.setTargetAtTime(0,t,hard?0.02:(v.ins?v.ins.rel:0.2));
  v.owner=null; v.on=false;
}
function bvAlloc(){ let v=bv.find(v=>!v.owner);
  if(!v){ v=bv.reduce((a,b)=>a.tOn<b.tOn?a:b); const o=v.owner; bvRelease(v,true);   // кража: снять голос со старого владельца
    if(o&&bassHold[o]===v)delete bassHold[o]; }
  return v;
}
/* setBassInstr — ТОЛЬКО живой селектор: глобальный bassIdx + дропдаун. Пул не трогаем;
   живой бас возьмёт новый тембр на следующей атаке (как аккорды), слои — сохранят свой. */
function setBassInstr(i){
  setBassIdx(((i%BASS_INSTR.length)+BASS_INSTR.length)%BASS_INSTR.length);
  hooks.bassInstr && hooks.bassInstr(bassIdx);
}
function bassOn(owner,freq,vol,ins){
  if(!AC)return; const t=AC.currentTime;
  let v=bassHold[owner]; if(!v){ v=bvAlloc(); v.owner=owner; bassHold[owner]=v; }
  if(!v.on){                                   // атака: печём тембр слоя, гейт вверх (идемпотентно при удержании)
    v.ins=BASS_INSTR[(((ins??bassIdx)%BASS_INSTR.length)+BASS_INSTR.length)%BASS_INSTR.length];
    v.o1.type=v.ins.t1; v.o2.type=v.ins.t2; v.o2.detune.setValueAtTime(v.ins.det,t); v.lp.frequency.setValueAtTime(v.ins.lp,t);
    v.on=true; v.env.gain.cancelScheduledValues(t); v.env.gain.setTargetAtTime(1,t,v.ins.att);
  }
  v.tOn=t;
  v.o1.frequency.setTargetAtTime(freq,t,0.012); v.o2.frequency.setTargetAtTime(freq*v.ins.ratio,t,0.012);
  v.vol.gain.setTargetAtTime(v.ins.lvl*(0.3+0.7*vol),t,0.03);   // lvl — как у аккордов, чтобы бас не жёг лимитер
}
function bassSet(owner,freq,vol){
  if(!AC)return; const v=bassHold[owner]; if(!v||!v.ins)return; const t=AC.currentTime;
  v.o1.frequency.setTargetAtTime(freq,t,0.03); v.o2.frequency.setTargetAtTime(freq*v.ins.ratio,t,0.03);
  v.vol.gain.setTargetAtTime(v.ins.lvl*(0.3+0.7*vol),t,0.05);   // тот же lvl, иначе глиссандо вернуло бы уровень
}
function bassOff(owner){ const v=bassHold[owner]; if(!v||!AC)return; bvRelease(v,false); delete bassHold[owner]; }

/* --- ДРОН: гейт dG, частота следует за тоникой (baseF/2) в любом ладу (спасён из backing.js) --- */
function droneOn(level=0.18){ if(!AC)return; const t=AC.currentTime;
  dG.gain.setTargetAtTime(level,t,1.2);
  dO1.frequency.setTargetAtTime(baseF()/2,t,0.3);
  dO2.frequency.setTargetAtTime(baseF()/2*1.498,t,0.3);
}
function droneOff(){ if(!AC)return; dG.gain.setTargetAtTime(0,AC.currentTime,0.6); }
/* Живой селектор набора ударных: только глобальный индекс + дропдаун (удар транзиентный,
   тембр берётся на КАЖДЫЙ удар из a.kit — заморожен в событии, как бас/аккорд). */
function setDrumKit(i){
  setDrumKitIdx(((i%DRUM_KITS.length)+DRUM_KITS.length)%DRUM_KITS.length);
  hooks.drumKit && hooks.drumKit(drumKitIdx);
}

/* --- УДАРНЫЕ: однократный синтез по индексу ряда (0=низ сетки), набор — kit --- */
function dNoise(t,dur){ const s=AC.createBufferSource(); s.buffer=noiseBuf; s.loop=true; s.start(t); s.stop(t+dur); return s; }
/* Дарбука-голоса (спасены из backing.js): Дум — низкий бум, Тек — звонкий щелчок. */
function dDum(t,v,f0=130,f1=52,d=0.18){ const o=AC.createOscillator(),g=AC.createGain();
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+0.08);
  g.gain.setValueAtTime(0.9*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  o.connect(g); g.connect(drumBus); o.start(t); o.stop(t+d+0.05); }
function dTek(t,v,hp=4500,f=950){ const s=dNoise(t,0.05),bf=AC.createBiquadFilter(),g=AC.createGain();
  bf.type='highpass'; bf.frequency.value=hp; g.gain.setValueAtTime(0.3*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.035);
  s.connect(bf); bf.connect(g); g.connect(drumBus);
  const o=AC.createOscillator(),og=AC.createGain(); o.type='sine'; o.frequency.value=f;
  og.gain.setValueAtTime(0.12*v,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.03);
  o.connect(og); og.connect(drumBus); o.start(t); o.stop(t+0.05); }
function darbukaHit(i,v,t){                       // 6 рядов → дарбука-голоса
  if(i===0)dDum(t,v);                             // Дум (низ)
  else if(i===1)dTek(t,v);                        // Тек
  else if(i===2)dTek(t,v*1.1,6000,1300);          // Так (ярче)
  else if(i===3)dTek(t,v*0.7,5200,1100);          // Ка (тише, короче)
  else if(i===4)dDum(t,v,180,80,0.14);            // Дум высокий
  else{ const s=dNoise(t,0.5),f=AC.createBiquadFilter(),g=AC.createGain();   // открытый край
    f.type='highpass'; f.frequency.value=5000; g.gain.setValueAtTime(0.28*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.5);
    s.connect(f); f.connect(g); g.connect(drumBus); }
}
function drumHit(i,vol=1,kit=0){
  if(!AC)return; const t=AC.currentTime, v=0.3+0.7*vol;
  if(kit===1) return darbukaHit(i,v,t);
  if(i===0){ const o=AC.createOscillator(),g=AC.createGain();     // Кик
    o.frequency.setValueAtTime(165,t); o.frequency.exponentialRampToValueAtTime(48,t+0.09);
    g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.22);
    o.connect(g); g.connect(drumBus); o.start(t); o.stop(t+0.28); }
  else if(i===1){ const s=dNoise(t,0.2),f=AC.createBiquadFilter(),g=AC.createGain();  // Снейр
    f.type='highpass'; f.frequency.value=1400; g.gain.setValueAtTime(0.5*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.17);
    s.connect(f); f.connect(g); g.connect(drumBus);
    const o=AC.createOscillator(),og=AC.createGain(); o.type='triangle'; o.frequency.value=185;
    og.gain.setValueAtTime(0.3*v,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.09);
    o.connect(og); og.connect(drumBus); o.start(t); o.stop(t+0.11); }
  else if(i===2){ const s=dNoise(t,0.14),f=AC.createBiquadFilter(),g=AC.createGain();  // Клэп
    f.type='bandpass'; f.frequency.value=1600; f.Q.value=1.2;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.55*v,t+0.004); g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
    s.connect(f); f.connect(g); g.connect(drumBus); }
  else if(i===3){ const s=dNoise(t,0.06),f=AC.createBiquadFilter(),g=AC.createGain();  // Хэт закр.
    f.type='highpass'; f.frequency.value=8200; g.gain.setValueAtTime(0.32*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05);
    s.connect(f); f.connect(g); g.connect(drumBus); }
  else if(i===4){ const o=AC.createOscillator(),g=AC.createGain();  // Том
    o.frequency.setValueAtTime(230,t); o.frequency.exponentialRampToValueAtTime(92,t+0.18);
    g.gain.setValueAtTime(0.6*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
    o.connect(g); g.connect(drumBus); o.start(t); o.stop(t+0.3); }
  else{ const s=dNoise(t,0.7),f=AC.createBiquadFilter(),g=AC.createGain();  // Крэш
    f.type='highpass'; f.frequency.value=6000; g.gain.setValueAtTime(0.3*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.7);
    s.connect(f); f.connect(g); g.connect(drumBus); }
}

/* Метроном лупера: короткий щелчок точно по часам AC (отсчёт и сетка овердаба).
   Идёт прямо в master, мимо громкости фона — слышен даже при выключенной подложке. */
function metroClick(t,accent){
  if(!AC)return;
  const o=AC.createOscillator(), g=AC.createGain();
  o.type='triangle'; o.frequency.setValueAtTime(accent?2000:1400,t);
  o.frequency.exponentialRampToValueAtTime(accent?1500:1050,t+0.03);   // короткий «щёлк» вниз — читается как деревяшка
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(accent?0.85:0.5,t+0.002);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+0.09);
}

/* Экспорт: `let` через export-клаузу — живые связки (AC виден после initAudio). */
export {
  initAudio, AC, setLeadInstr, applyParams, noteOn, noteOff, metroClick,
  chordOn, chordGlide, chordOff, chordHold,
  setBassInstr, bassOn, bassSet, bassOff, bassHold, drumHit, setDrumKit, droneOn, droneOff,
  LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_NAMES, DRUM_ROWS, DRUM_KITS,
};
