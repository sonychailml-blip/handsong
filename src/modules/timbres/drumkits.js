/* AUD1c (RUN 3, 2026-10-16) — the five kits' per-hit synths (Standard, Darbuka, Tabla, Gamelan, Taiko) and the hit voice. Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { volAmp } from '../../config.js';

/* --- УДАРНЫЕ: однократный синтез по индексу ряда (0=низ сетки), набор — kit --- */
function dNoise(E, t,dur){ const s=E.ac.createBufferSource(); s.buffer=E.buf.noise; s.loop=true; s.start(t); s.stop(t+dur); return s; }

/* Дарбука-голоса (спасены из backing.js): Дум — низкий бум, Тек — звонкий щелчок. */
function dDum(E, t,v,f0=130,f1=52,d=0.18){ const o=E.ac.createOscillator(),g=E.ac.createGain();
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+0.08);
  g.gain.setValueAtTime(0.9*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  o.connect(g); g.connect(E.build.hitBus); o.start(t); o.stop(t+d+0.05); }

function dTek(E, t,v,hp=4500,f=950){ const s=dNoise(E, t,0.05),bf=E.ac.createBiquadFilter(),g=E.ac.createGain();
  bf.type='highpass'; bf.frequency.value=hp; g.gain.setValueAtTime(0.3*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.035);
  s.connect(bf); bf.connect(g); g.connect(E.build.hitBus);
  const o=E.ac.createOscillator(),og=E.ac.createGain(); o.type='sine'; o.frequency.value=f;
  og.gain.setValueAtTime(0.12*v,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.03);
  o.connect(og); og.connect(E.build.hitBus); o.start(t); o.stop(t+0.05); }


/* --- ТАБЛА (индийская). Подпись: баян (басовая мембрана) с сильным НИСХОДЯЩИМ бендом высоты —
   именно он делает возможным аккомпанемент для раг. Даян (высокий) — ясная высота с лёгким
   металлическим призвуком (пара ингармонических обертонов). --- */
function tabBaya(E, t,v,f0=185,f1=70,d=0.35){ const o=E.ac.createOscillator(),g=E.ac.createGain();
  o.type='sine'; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+0.14);   // бенд вниз — подпись
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  o.connect(g); g.connect(E.build.hitBus); o.start(t); o.stop(t+d+0.05); }

function tabNa(E, t,v,f=520,d=0.22){ const g=E.ac.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); g.connect(E.build.hitBus);
  [[1,.6],[2.4,.22],[3.8,.12]].forEach(([r,a])=>{ const o=E.ac.createOscillator(); o.type='sine'; o.frequency.value=f*r;   // тоновый + ингармонический призвук
    const og=E.ac.createGain(); og.gain.value=a; o.connect(og); og.connect(g); o.start(t); o.stop(t+d+0.02); }); }

function tabTick(E, t,v){ const s=dNoise(E, t,0.04),f=E.ac.createBiquadFilter(),g=E.ac.createGain();   // сухой высокий тычок (тете)
  f.type='bandpass'; f.frequency.value=3200; f.Q.value=2; g.gain.setValueAtTime(0.5*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.03);
  s.connect(f); f.connect(g); g.connect(E.build.hitBus); }


/* --- ГАМЕЛАН (яванский). Инструмент — инлайн-FM: несущий+модулятор с НЕЦЕЛЫМ отношением → ИНГАРМОНИЧЕСКИЙ
   бронзовый спектр (обычный шум/пилы так не умеют). Индекс модуляции спадает быстрее амплитуды — «удар»
   ярче хвоста. ЧЕСТНО: настоящий гамелан — литая бронза, у каждой пластины своя уникальная ингармоничность
   и «биение» пар; это ПРИБЛИЖЕНИЕ характера, не копия. --- */
function gmlFM(E, t,v,f,ratio,idx,d){ const car=E.ac.createOscillator(),cg=E.ac.createGain();
  car.type='sine'; car.frequency.value=f;
  const mod=E.ac.createOscillator(),mg=E.ac.createGain(); mod.type='sine'; mod.frequency.value=f*ratio;
  mg.gain.setValueAtTime(f*idx,t); mg.gain.exponentialRampToValueAtTime(f*idx*0.1+0.001,t+d*0.4);   // огибающая индекса → металлический «пинг»
  mod.connect(mg); mg.connect(car.frequency);
  cg.gain.setValueAtTime(v,t); cg.gain.exponentialRampToValueAtTime(0.001,t+d);
  car.connect(cg); cg.connect(E.build.hitBus); car.start(t); mod.start(t); car.stop(t+d+0.05); mod.stop(t+d+0.05); }


/* --- ТАЙКО (японский). Большой мембранный барабан: низкий тон с падением высоты + шумовое тело кожи;
   деревянный щелчок по ободу (ка). --- */
function taikoDrum(E, t,v,f0=95,f1=55,d=0.42){ const o=E.ac.createOscillator(),g=E.ac.createGain();
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+0.10);
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  o.connect(g); g.connect(E.build.hitBus); o.start(t); o.stop(t+d+0.05);
  const s=dNoise(E, t,0.06),nf=E.ac.createBiquadFilter(),ng=E.ac.createGain();   // тело кожи
  nf.type='lowpass'; nf.frequency.value=1200; ng.gain.setValueAtTime(0.25*v,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.08);
  s.connect(nf); nf.connect(ng); ng.connect(E.build.hitBus); }

function taikoKa(E, t,v){ const o=E.ac.createOscillator(),g=E.ac.createGain();   // ка — сухой деревянный щелчок обода
  o.type='square'; o.frequency.setValueAtTime(1200,t); o.frequency.exponentialRampToValueAtTime(600,t+0.02);
  g.gain.setValueAtTime(0.4*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
  o.connect(g); g.connect(E.build.hitBus); o.start(t); o.stop(t+0.06);
  const s=dNoise(E, t,0.03),f=E.ac.createBiquadFilter(),ng=E.ac.createGain();
  f.type='highpass'; f.frequency.value=4000; ng.gain.setValueAtTime(0.25*v,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.025);
  s.connect(f); f.connect(ng); ng.connect(E.build.hitBus); }


/* ═══ TIM3c (RUN 4): KITS AS DATA — the row SYNTHS stay code (named below, same bodies as before), their PARAMETERS are the kit record's
   six rows `{synth, vm, …params}` (data/timbres/kit.*.json, engine 'drumkit'). vm = the hit's velocity multiplier (today's «v*0.9»); the
   params are today's call arguments, written out in full. Each synth creates its nodes in exactly the old order (proof: «TIM3 timbres =
   before» — trace and render envelope of all six rows of every kit). ═══ */
function stdKick(E, t,v){ const o=E.ac.createOscillator(),g=E.ac.createGain();
  o.frequency.setValueAtTime(165,t); o.frequency.exponentialRampToValueAtTime(48,t+0.09);
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.22);
  o.connect(g); g.connect(E.build.hitBus); o.start(t); o.stop(t+0.28); }
function stdSnare(E, t,v){ const s=dNoise(E, t,0.2),f=E.ac.createBiquadFilter(),g=E.ac.createGain();
  f.type='highpass'; f.frequency.value=1400; g.gain.setValueAtTime(0.5*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.17);
  s.connect(f); f.connect(g); g.connect(E.build.hitBus);
  const o=E.ac.createOscillator(),og=E.ac.createGain(); o.type='triangle'; o.frequency.value=185;
  og.gain.setValueAtTime(0.3*v,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.09);
  o.connect(og); og.connect(E.build.hitBus); o.start(t); o.stop(t+0.11); }
function stdClap(E, t,v){ const s=dNoise(E, t,0.14),f=E.ac.createBiquadFilter(),g=E.ac.createGain();
  f.type='bandpass'; f.frequency.value=1600; f.Q.value=1.2;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.55*v,t+0.004); g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
  s.connect(f); f.connect(g); g.connect(E.build.hitBus); }
function stdHat(E, t,v){ const s=dNoise(E, t,0.06),f=E.ac.createBiquadFilter(),g=E.ac.createGain();
  f.type='highpass'; f.frequency.value=8200; g.gain.setValueAtTime(0.32*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05);
  s.connect(f); f.connect(g); g.connect(E.build.hitBus); }
function stdTom(E, t,v){ const o=E.ac.createOscillator(),g=E.ac.createGain();
  o.frequency.setValueAtTime(230,t); o.frequency.exponentialRampToValueAtTime(92,t+0.18);
  g.gain.setValueAtTime(0.6*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
  o.connect(g); g.connect(E.build.hitBus); o.start(t); o.stop(t+0.3); }
function stdCrash(E, t,v){ const s=dNoise(E, t,0.7),f=E.ac.createBiquadFilter(),g=E.ac.createGain();
  f.type='highpass'; f.frequency.value=6000; g.gain.setValueAtTime(0.3*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.7);
  s.connect(f); f.connect(g); g.connect(E.build.hitBus); }
function noiseEdge(E, t,v,hp,g0,d){ const s=dNoise(E, t,d),f=E.ac.createBiquadFilter(),g=E.ac.createGain();   // the darbuka's open edge (was inline in darbukaHit)
  f.type='highpass'; f.frequency.value=hp; g.gain.setValueAtTime(g0*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  s.connect(f); f.connect(g); g.connect(E.build.hitBus); }
/* the synths a kit row may name, with the parameter names in call order (the validator reads KIT_SYNTHS from core/timbre.js) */
const SYNTH={ kick:(E,t,v)=>stdKick(E,t,v), snare:(E,t,v)=>stdSnare(E,t,v), clap:(E,t,v)=>stdClap(E,t,v), hat:(E,t,v)=>stdHat(E,t,v),
  tom:(E,t,v)=>stdTom(E,t,v), crash:(E,t,v)=>stdCrash(E,t,v),
  dum:(E,t,v,r)=>dDum(E,t,v,r.f0,r.f1,r.d), tek:(E,t,v,r)=>dTek(E,t,v,r.hp,r.f), edge:(E,t,v,r)=>noiseEdge(E,t,v,r.hp,r.g,r.d),
  baya:(E,t,v,r)=>tabBaya(E,t,v,r.f0,r.f1,r.d), na:(E,t,v,r)=>tabNa(E,t,v,r.f,r.d), tick:(E,t,v)=>tabTick(E,t,v),
  gong:(E,t,v,r)=>gmlFM(E,t,v,r.f,r.ratio,r.idx,r.d), taiko:(E,t,v,r)=>taikoDrum(E,t,v,r.f0,r.f1,r.d), ka:(E,t,v)=>taikoKa(E,t,v) };
/* one hit of row i of a kit RECORD (vol 0..1 → v = volAmp(vol), VOL-2b; the row's vm scales it as the old calls did) */
function drumVoice(E, i,vol,rec,t){
  const v=volAmp(vol), r=rec.recipe.rows[i], f=SYNTH[r.synth];
  if(f) f(E, t, r.vm===1 ? v : v*r.vm, r);
}
export { dNoise, dTek, dDum, tabBaya, tabNa, tabTick, gmlFM, taikoDrum, taikoKa, noiseEdge, drumVoice };
