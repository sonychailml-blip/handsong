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

function darbukaHit(E, i,v,t){                       // 6 рядов → дарбука-голоса
  if(i===0)dDum(E, t,v);                             // Дум (низ)
  else if(i===1)dTek(E, t,v);                        // Тек
  else if(i===2)dTek(E, t,v*1.1,6000,1300);          // Так (ярче)
  else if(i===3)dTek(E, t,v*0.7,5200,1100);          // Ка (тише, короче)
  else if(i===4)dDum(E, t,v,180,80,0.14);            // Дум высокий
  else{ const s=dNoise(E, t,0.5),f=E.ac.createBiquadFilter(),g=E.ac.createGain();   // открытый край
    f.type='highpass'; f.frequency.value=5000; g.gain.setValueAtTime(0.28*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.5);
    s.connect(f); f.connect(g); g.connect(E.build.hitBus); }
}

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

function tablaHit(E, i,v,t){                          // 6 рядов → голоса таблы (low/accent/high как у всех китов)
  if(i===0)tabBaya(E, t,v);                           // Ге/дха — баян с бендом (низ)
  else if(i===1)tabNa(E, t,v,520);                    // На — звонкий даян (акцент)
  else if(i===2)tabNa(E, t,v*0.9,660,0.18);           // Тин — выше, короче
  else if(i===3)tabTick(E, t,v);                      // Тете — сухой тычок (высокий)
  else if(i===4)tabBaya(E, t,v*0.9,150,80,0.22);      // Дхин — средний
  else tabNa(E, t,v,440,0.4);                          // Тун — длинный открытый звон
}

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

function gamelanHit(E, i,v,t){
  if(i===0)gmlFM(E, t,v,82,1.47,6,1.8);               // гонг агенг — глубокий, ДЛИННЫЙ, ингармонический (низ)
  else if(i===1)gmlFM(E, t,v*0.9,300,2.76,4,0.7);     // кенонг — средний металлический (акцент)
  else if(i===2)gmlFM(E, t,v*0.85,230,2.4,4,0.6);     // кемпул — чуть иной средний
  else if(i===3)gmlFM(E, t,v*0.7,900,3.5,3,0.25);     // высокая пластина (сарон) — короткий звон (высокий)
  else if(i===4)gmlFM(E, t,v*0.85,400,2.1,3,0.5);     // кенонг выше — средний
  else gmlFM(E, t,v*0.7,1300,3.5,2,0.4);               // высокий мерцающий
}

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

function taikoHit(E, i,v,t){
  if(i===0)taikoDrum(E, t,v);                          // о-дайко — большой глубокий (низ)
  else if(i===1)taikoDrum(E, t,v*0.9,150,85,0.28);     // средний удар (акцент)
  else if(i===2)taikoDrum(E, t,v*0.85,190,110,0.22);   // выше
  else if(i===3)taikoKa(E, t,v);                       // ка — деревянный щелчок обода (высокий)
  else if(i===4)taikoDrum(E, t,v*0.85,120,70,0.3);     // средний
  else taikoKa(E, t,v*1.1);                             // яркий обод
}

function drumVoice(E, i,vol,kit,t){
  const v=volAmp(vol);   // удар — одноразовый источник, стартует в t (все под-голоса уже берут t). VOL-2b: одна кривая v² (прежде 0.3+0.7·vol — ноль не был тишиной); скорости удара у ударных нет, только пик
  if(kit===1) return darbukaHit(E, i,v,t);
  if(kit===2) return tablaHit(E, i,v,t);
  if(kit===3) return gamelanHit(E, i,v,t);
  if(kit===4) return taikoHit(E, i,v,t);
  if(i===0){ const o=E.ac.createOscillator(),g=E.ac.createGain();     // Кик
    o.frequency.setValueAtTime(165,t); o.frequency.exponentialRampToValueAtTime(48,t+0.09);
    g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.22);
    o.connect(g); g.connect(E.build.hitBus); o.start(t); o.stop(t+0.28); }
  else if(i===1){ const s=dNoise(E, t,0.2),f=E.ac.createBiquadFilter(),g=E.ac.createGain();  // Снейр
    f.type='highpass'; f.frequency.value=1400; g.gain.setValueAtTime(0.5*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.17);
    s.connect(f); f.connect(g); g.connect(E.build.hitBus);
    const o=E.ac.createOscillator(),og=E.ac.createGain(); o.type='triangle'; o.frequency.value=185;
    og.gain.setValueAtTime(0.3*v,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.09);
    o.connect(og); og.connect(E.build.hitBus); o.start(t); o.stop(t+0.11); }
  else if(i===2){ const s=dNoise(E, t,0.14),f=E.ac.createBiquadFilter(),g=E.ac.createGain();  // Клэп
    f.type='bandpass'; f.frequency.value=1600; f.Q.value=1.2;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.55*v,t+0.004); g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
    s.connect(f); f.connect(g); g.connect(E.build.hitBus); }
  else if(i===3){ const s=dNoise(E, t,0.06),f=E.ac.createBiquadFilter(),g=E.ac.createGain();  // Хэт закр.
    f.type='highpass'; f.frequency.value=8200; g.gain.setValueAtTime(0.32*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05);
    s.connect(f); f.connect(g); g.connect(E.build.hitBus); }
  else if(i===4){ const o=E.ac.createOscillator(),g=E.ac.createGain();  // Том
    o.frequency.setValueAtTime(230,t); o.frequency.exponentialRampToValueAtTime(92,t+0.18);
    g.gain.setValueAtTime(0.6*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
    o.connect(g); g.connect(E.build.hitBus); o.start(t); o.stop(t+0.3); }
  else{ const s=dNoise(E, t,0.7),f=E.ac.createBiquadFilter(),g=E.ac.createGain();  // Крэш
    f.type='highpass'; f.frequency.value=6000; g.gain.setValueAtTime(0.3*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.7);
    s.connect(f); f.connect(g); g.connect(E.build.hitBus); }
}
export { dNoise, dTek, dDum, darbukaHit, tabBaya, tabNa, tabTick, tablaHit, gmlFM, gamelanHit, taikoDrum, taikoKa, taikoHit, drumVoice };
