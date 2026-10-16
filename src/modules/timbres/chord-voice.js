/* AUD1c (RUN 3, 2026-10-16) — the chord pool voice (two filters, rule #19), the pool, and the Firefly strike (one-shot tine, SND-F1). Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { voiceBuild, voiceStartPair } from './voice.js';
import { CHORD_LP_MAX, briToHz, freezeDeep, makePanStage, panGains, voiceRoute } from './stages.js';
import { CHORD_POOL_N } from '../../config.js';

/* --- Пул аккордовых голосов (всегда запущены, гейт по громкости; размер — CHORD_POOL_N) ---
   ДВА фильтра на голос, НЕ один — осознанно, не «избыточность»: f несёт огибающую АТАКИ (fo/ft/fv,
   тембр), пекётся один раз на атаке и пофреймово не трогается; fb несёт НЕПРЕРЫВНУЮ яркость (Z-глубина
   руки, выразительность), ведётся setTargetAtTime всю ноту. Свести их в один узел нельзя: смена яркости
   тогда дралась бы с запланированной рампой атаки (в окне ft), и тембр навсегда сцепился бы с
   выразительностью. БУДУЩЕЙ СЕССИИ: не «упрощать» f и fb в один фильтр. Порядок o1/o2 → f (атака) → fb
   (яркость) → g (гейт громкости) → dest. */
/* ОДИН аккордовый голос. ⚠️ Вынесен из тела цикла БЕЗ единой правки порядка создания узлов — это
   тот же код, просто названный: офлайн-раскладчику (F2) нужно уметь завести ОДИН голос сверх пула,
   когда все заняты. Живьём поведение прежнее: buildChordPool зовёт его CHORD_POOL_N раз. */
function newChordVoice(E, dest){
  voiceBuild(E);                                               // B: новый голос — его первый осциллятор стартует сразу, второй со своей фазой (см. voiceStart)
  const o1=E.ac.createOscillator(), o2=E.ac.createOscillator();
  const g1=E.ac.createGain(), g2=E.ac.createGain();
  const f=E.ac.createBiquadFilter(), fb=E.ac.createBiquadFilter(), g=E.ac.createGain();
  o1.type='sawtooth'; o2.type='sawtooth';
  f.type='lowpass'; f.frequency.value=1500;                 // f — огибающая атаки (тембр)
  fb.type='lowpass'; fb.frequency.value=CHORD_LP_MAX;       // fb — непрерывная яркость (выразительность); дефолт открыт → нейтраль
  g1.gain.value=.5; g2.gain.value=.5; g.gain.value=0;
  const tg=E.ac.createGain();   // MX1: уровень ДОРОЖКИ — после огибающей голоса, до шины (фильтры f/fb не тронуты — правило #19)
  o1.connect(g1); o2.connect(g2); g1.connect(f); g2.connect(f); f.connect(fb); fb.connect(g); g.connect(tg);
  const pan=makePanStage(E, tg, E.trackBus.ch&&dest===E.bus.ch ? null : dest);   // MX2: панорама ДОРОЖКИ — сразу за уровнем, до шины аккордов и её цепи
  const rt= E.trackBus.ch&&dest===E.bus.ch ? voiceRoute(E, pan.out, E.bus.ch, E.trackBus.ch) : null;   // AF5: live head or track head, set at attack
  voiceStartPair(E, o1,o2);   // пара — в фазе, голос — со своей задержкой (см. voiceStartPair: разброс фаз внутри пары гасил основной тон)
  const v={o1,o2,g1,g2,f,fb,g,tg,pan,rt,owner:null,ins:null,tOn:0,lvl:0,freeAt:0};   // freeAt — только для offline (F2); живьём не читается
  E.pool.ch.v.push(v); return v;
}

function buildChordPool(E, dest, n=CHORD_POOL_N){
  for(let i=0;i<n;i++) newChordVoice(E, dest);
}

/* ═══ SND-F1 — FIREFLY: a struck tine, ONE-SHOT per note (chord timbre «Firefly») ═══
   Three partials, each with its own envelope (6 ms linear attack, exponential decay to 0.0001): body 1×f triangle 1.6 s, octave 2×f sine
   0.28 · 0.9 s, the inharmonic tine «click» 4.2×f sine 0.12 · 0.28 s — the Calm prototype's recipe exactly (row «SND-F1 Firefly identity»
   compares it sample by sample). ⛳ A sanctioned exception to rule #3, like a drum hit: a strike makes its own oscillators at its moment
   and they stop when the decay ends — a struck tine has no sustain to gate. The pool voice still holds the note (owner, pitch for the
   readout and highlights, release) but stays silent. Each strike takes its owner's level, pan, route (live head or track head, rule #31)
   and brightness AT THE STRIKE, like a drum hit (a stage only when not neutral). chordOff cancels the owner's strikes that have not begun
   (stop, panic, seams, a replaced chord) and lets begun ones ring out — the decay IS the note; voicesCut fades them at a freeze swap. */
const FIREFLY=freezeDeep([ [1,1.00,1.6,'triangle'], [2,0.28,0.9,'sine'], [4.2,0.12,0.28,'sine'] ]);

const FF_END=Math.max(...FIREFLY.map(p=>p[2]))+0.05;

function ffStrike(E, owner,f,amp,bri,t){
  const d=Math.max(0,Math.min(1,bri||0)), pv=E.look.ownerPan(owner), g0=amp*E.look.ownerGain(owner);
  const tr=!!(E.trackBus.ch&&E.look.routeOf(owner));
  let out= tr ? E.trackBus.ch : E.bus.ch;
  if(d>0){ const lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=briToHz(d); lp.connect(out); out=lp; }
  if(pv!==0){ const pin=E.ac.createGain(), st=makePanStage(E, pin,out), [a,b]=panGains(pv); st.l.gain.value=a; st.r.gain.value=b; out=pin; }
  const g=E.ac.createGain(); g.gain.value=g0; g.connect(out);
  for(const [ratio,a,decay,type] of FIREFLY){
    const o=E.ac.createOscillator(), pg=E.ac.createGain();
    o.type=type; o.frequency.value=f*ratio;
    pg.gain.setValueAtTime(0,t); pg.gain.linearRampToValueAtTime(a,t+0.006); pg.gain.exponentialRampToValueAtTime(0.0001,t+decay);
    o.connect(pg); pg.connect(g); o.start(t); o.stop(t+decay+0.05);
  }
  const now=E.ac.currentTime; for(let i=E.pool.ch.ff.length-1;i>=0;i--) if(E.pool.ch.ff[i].t+FF_END<now) E.pool.ch.ff.splice(i,1);
  E.pool.ch.ff.push({ owner, g, t, g0, route: tr ? 'track' : 'live' });
}
export { newChordVoice, buildChordPool, FIREFLY, FF_END, ffStrike };
