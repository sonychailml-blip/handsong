/* PROBE1: The test song (P.seed), the demo song (P.song), and the rows that check what they wrote (write path, seed notes, frozen seed bass). Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { timbreById, timbreKey, timbreIdx, timbresOf, timbreSnapshot } from '../audio.js';   // TIM2: events carry timbre ids
import { storeTim, noteSource } from '../live/record.js';   // TIM2: the birth conversion and the track source
import { t, L } from '../i18n.js';
import { legacyChordNotesRef, legacyLeadFreq, legacyBassFreq, SCALES, KEEP_MAX, PRINT_MAX } from '../probedata.js';
import { evHz, probeTake, backingEvent, events, editIsOpen, clearRec, setLoopMetre, seedTake, songSegs, editOpen, editDeleteChordNote, editSetLayer, editMoveChordNote, editMoveSeg, editInsertBass, segChordNotes, editInsertChord, editClose, loadJam, songBeats, loop, braceTap, setRegionOn, onLoop, editInsertLead, songPinChains, histReset } from '../recorder.js';
import { scaleById, CUR, chordFams, modeSlotOfTi, chordNotesAt, chordModeOf, scaleView, chordAtRoot, tuningIndexOf, chordUnit } from '../scales.js';
import { scaleId, tunedFrom, seventh, setScaleId, setTunedFrom, setSeventh, chordModeSel, setChordModeSel, setChordMode } from '../state.js';
import { guardSelfTest } from './guard.js';
import { liveEnv } from './key.js';
import { row } from './rows.js';
import { asPause } from '../autosave.js';   // AUTOSAVE1: the probe's test songs are not autosaved
import { material, songPrint } from './run.js';
import { tracks } from './tuning.js';
/* ═══ P.seed — ДЕТЕРМИНИРОВАННАЯ ТЕСТОВАЯ ПЕСНЯ ═══
   ⛔ ЗАМЕНЯЕТ ТЕКУЩУЮ ПЕСНЮ. На непустой песне без {replace:true} — отказ (живой дубль не должен пропасть от опечатки: ничего не
   сохраняется, но потерянный дубль — всё равно потеря). Пишет ТОЛЬКО через воронки рекордера: сценарные взятые — recorder.seedTake
   (push: маршрут, номер взятого, ключи, вид, индекс в строе), правки — функции редактора (editCommit), подложка — loadJam
   (loadArrangement). Руками ни одного события не пишется. Что строится (размер 4, у каждой части свои такты):
     доли  0–16  мажор: соло (мелодия + удержанная нота терменвокса с бендом), бас с глиссандо, аккорды стопкой по правилу лада (прогрессия
                 одним «вкл» и ведениями + отдельный аккорд) — три дорожки рождает ОДНО взятое (маршрут по роли);
     доли 16–32  бас в раге Яман (таблица 22 шрути);
     доли 32–48  аккорды в Партче (типизированные отношения палитры);
     доли 48–64  Пифагор «строй от C» (фиксированный ключ): аккорды палитры и бас;
     доли 64–80  пентатоника: аккорды-стопки (через ступень лада);
   затем РЕДАКТОР: отдельный мажорный аккорд РАСПАДАЕТСЯ (удалена средняя нота), у первого аккорда Партча одна нота сдвинута во времени и
   по высоте; затем ПОДЛОЖКА (джем I–vi–ii–V в мажоре, бас по корням, ударные), СКОБА повтора [такт 3, конец − 2 такта] пользователем,
   пауза транспорта и ЗАМОРОЗКА дорожки баса в раге (если рендер доступен из консоли). Живые лад, «строй от» и септаккорд возвращаются. */
/* ═══ ЗАПИСЬ ГЛАЗАМИ ЖЕСТА — СЛЕПЫЕ ПЯТНА ПРОБЫ, ЗАКРЫТЫЕ ПОСЛЕ «ТИХОГО БАСА» (после T4c-2) ═══
   Песенные строки сверяли сохранённое с самим собой (индекс → цена), а не с тем, что ДАЛ ЖЕСТ: потеряй воронка поле — тембр, громкость,
   регистр — ни одна строка не заметила бы. Три строки ниже сверяют с ИСТИНОЙ СНАРУЖИ сохранённого:
     P.checkWrite()  — известные нагрузки жеста (каждая роль, вид строя, регистр, ступень) через НАСТОЯЩИЕ воронки — взятое в песочнице
                       (recorder.probeTake → seedTake → push) и воронку подложки (recorder.backingEvent); КАЖДОЕ поле сохранённого события
                       против нагрузки (ступени нет, индекс есть, остальное — то же, карта эффектов — копией), цена ENG (evHz) против
                       ЗАМОРОЖЕННОЙ опоры, посчитанной из СТУПЕНИ ЖЕСТА (не из сохранённого индекса);
     P.checkSeed()   — P.seed записывает задуманное (ступень, регистр, тембр, громкость, тип, бенд каждой ноты сценария); каждое событие
                       песни сверяется с задуманным так же (кроме двух аккордов, которые сценарий потом правит в редакторе);
     P.checkFrozen() — пик, rms и длина буфера замороженного баса в раге (P.seed) против ожидаемых; буфер, внезапно ставший тихим, — расхождение.
   ⚠️ Песочница продвигает счётчики дорожек и взятых (они монотонны): у дорожек, рождённых ПОСЛЕ P.checkWrite, другой номер, а значит и
   другое семя заморозки. Существующие дорожки не затронуты. */
/* Запись сценарной песни: kind 'seed' — P.seed, 'song' — P.song (демо-пьеса, src/songs.js; шаги несут sid — id лада шага, ign — поля,
   которые потом правит полоса редактора, skip — шаг, который редактор распустил). Пишет последний из двух: песня одна. */
export let SEED_REC=null;   // { kind, name?, takes:[{label, take, scaleId, tf, steps:[{fn,t,a,sid?,ign?,skip?}]}], edited:[[scaleId, t, роль?]], inserts:[…] (U5), freeze:{…}|null }
/* U5: форма аккорда — интервалы его нот в центах от первой (по ним «вставка формы воспроизводит выделенный аккорд») */
const centsShape=N=>N.map(n=>1200*Math.log2(n.f/N[0].f));
/* Замороженный бас в раге: значения, ЗАМЕРЕННЫЕ ПОСЛЕ починки «пара голоса в фазе» (voiceStartPair, отчёт пользователя). Прежние
   0.08527/0.054304 сами были частично погашенной выборкой фазы (две одинаковые волны со случайным сдвигом), а не честным эталоном. */
export const SEED_FROZEN_EXPECT={ peak:0.08686, rms:0.055319, samples:650886, sec:650886/48000, floor:0.9 };   // sec: the buffer's duration — the sample count follows the live rate (650886 at 48 kHz; the system device may run at 44.1 kHz)
export const seedFrozenSamples=F=>Math.round(SEED_FROZEN_EXPECT.sec*((F&&F.rate)||48000));
const ROLE_OF={ l:'ld', b:'bs', c:'ch' };
const sameVal=(x,y)=> x===y || (x&&y&&typeof x==='object'&&typeof y==='object' ? JSON.stringify(x)===JSON.stringify(y) : false);
/* Одна сверка: сохранённое событие ev против нагрузки жеста g (со ступенью). ign — поля, которые не сравниваются (их потом переписала
   полоса редактора, P.song). → массив строк расхождений. */
function writeDiff(at, ev, g, ign){
  const out=[], a=ev.a||{}, role=ROLE_OF[ev.fn[0]], pitched= role && /On$|Set$/.test(ev.fn) && typeof g.deg==='number';
  const skip=k=> !!ign && ign.has(k);
  const tw=k=> k==='inst' && role ? timbreKey(role,g[k]) : k==='kit' && ev.fn==='drum' ? timbreKey('dr',g[k]) : g[k];   // TIM2: a gesture's timbre position is stored as its permanent id
  if('deg' in a) out.push(`${at}: the stored event carries a degree`);
  for(const k of Object.keys(g)){ if(k==='deg'||skip(k)) continue;
    if(!(k in a)) out.push(`${at}: field ${k} lost (gesture ${JSON.stringify(g[k])})`);
    else if(!sameVal(a[k],tw(k))) out.push(`${at}: field ${k} stored ${JSON.stringify(a[k])}, gesture ${JSON.stringify(g[k])}${tw(k)!==g[k]?' (id '+tw(k)+')':''}`); }
  for(const k of Object.keys(a)) if(!(k in g) && k!=='ti' && k!=='k' && !skip(k) && !(k==='fx' && /^lead(On|Set)$/.test(ev.fn) && SEED_REC && SEED_REC.soloSnap && sameVal(a.fx, SEED_REC.soloSnap))) out.push(`${at}: unexpected field ${k} = ${JSON.stringify(a[k])}`);
  if(g.fx && a.fx===g.fx) out.push(`${at}: the effect map is the gesture's own object, not a copy`);
  if(pitched){
    if(!Number.isInteger(a.ti)) out.push(`${at}: no tuning index`);
    const hz=evHz(a,ev,role), v=ev.sc;
    if(role==='ch'){ const ref=legacyChordNotesRef(g.deg,g.oct,v,ev.sev,g.ty??null).map(n=>n.f);
      if(hz.length!==ref.length || hz.some((f,i)=>f!==ref[i])) out.push(`${at}: chord price ${hz.join(' ')}, from the gesture degree ${ref.join(' ')}`); }
    else{ const ref= role==='ld' ? legacyLeadFreq(g.deg,g.oct,v) : legacyBassFreq(g.deg,g.oct,v);
      if(hz!==ref) out.push(`${at}: price ${hz}, from the gesture degree ${ref}`); }
  }
  return out;
}
const VIEWS_W=()=>{ const by=f=>(SCALES.find(f)||{}).id;   // F1: лады по id
  return [['major','major','T'], ['raga (table + selection)','raga-yaman','T'],
          ['pelog Barang (root offset)',by(s=>s.root>0),'T'], ['Partch (table, ratio chords)','partch-43','T'],
          ['Pythagorean from C (fixed key)','pythagorean',0], ['Pythagorean from the tonic','pythagorean','T'],
          ['Werckmeister (fixed key)',by(s=>s.id&&s.id.startsWith('werck')),'T'], ['Bohlen–Pierce (non-octave)',by(s=>s.tuning==='bp13'),'T'],
          ['19-TET',by(s=>s.tuning==='edo19'),'T'], ['major pentatonic (stack)','major-penta','T']].filter(x=>x[1] && scaleById(x[1])); };
export function checkWrite(){
  const bad=[]; let nBad=0, cases=0, nView=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keep={ sc:scaleId, tf:tunedFrom, sev:seventh };
  try{
    for(const [name,id,tf] of VIEWS_W()){
      setScaleId(id); setTunedFrom(tf); nView++;
      const v=CUR(), n=v.iv.length, k=v.chordRule&&v.chordRule.kind;
      const F=chordFams(v), ty0= v.typedChords&&F[0]&&F[0].types[0] ? F[0].types[0].iv : null;
      const steps=[]; let t=0; const add=(fn,a)=>{ steps.push({fn,a,t}); t+=0.125; };
      for(let o=0;o<4;o++) for(let d=0;d<=n;d++){
        add('leadOn',{deg:d,oct:o,vol:0.73,inst:3,fx:{'bright:amt':0.37,'glide:time':0.2},v:d%3});
        add('bassOn',{deg:d,oct:o,vol:0.61,inst:2,fx:{'glide:time':0.42},v:d%2});
        if(k!=='none') add('chOn',{deg:d,oct:o,vol:0.55,inst:1,ty:ty0,bri:0.3});
      }
      add('leadOn',{deg:Math.min(2,n),oct:1,vol:0.8,inst:0,bend:[{dt:0,c:0},{dt:1,c:40}],tie:true,v:3});
      add('leadSet',{deg:Math.min(1,n),oct:1,vol:0.7,hold:true,v:3});
      add('bassSet',{deg:Math.min(3,n),oct:2,vol:0.5,v:1});
      if(k!=='none') add('chSet',{deg:Math.min(4,n),oct:2,vol:0.5,ty:ty0,bri:0.6});
      const R=probeTake(steps);
      if(!R.ok){ miss(`${name}: the sandboxed take was refused — ${R.why}`); break; }
      const byT=new Map(); for(const e of R.events) byT.set(e.fn+'@'+e.t, e);
      for(const st of steps){ cases++; const at=`push · ${name} · ${st.fn} degree ${st.a.deg} reg ${st.a.oct}`, ev=byT.get(st.fn+'@'+st.t);
        if(!ev){ miss(`${at}: no stored event`); continue; }
        if(ev.sc!==v) miss(`${at}: stored in another view (${ev.sc&&ev.sc.id})`);
        for(const m of writeDiff(at,ev,st.a)) miss(m); }
      // воронка подложки
      const B=[{fn:'bassOn',a:{deg:Math.min(1,n),oct:1,vol:0.6,inst:4}},{fn:'drum',a:{row:2,vol:0.7,kit:3}},{fn:'drone',a:{lvl:0.4}}];
      if(k!=='none') B.push({fn:'chOn',a:{deg:Math.min(2,n),oct:1,vol:0.55,inst:2,ty:ty0}});
      B.forEach((b,i)=>{ cases++; const at=`backing · ${name} · ${b.fn}`, ev=backingEvent({t:i,fn:b.fn,a:{...b.a}},999,0,true);
        if(!ev.jam||ev.sc!==v||ev.layer!==999) miss(`${at}: jam flag, view or layer wrong`);
        for(const m of writeDiff(at,ev,b.a)) miss(m); });
    }
  } finally { setScaleId(keep.sc); setTunedFrom(keep.tf); setSeventh(keep.sev); }
  cases+=guardSelfTest(miss);   // AUTO-PROBE: страж консоли и его контроль
  console.log(`[scaleprobe write] views ${nView} · gesture and backing payloads ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe write] '+m));
  if(!nBad) console.log('[scaleprobe write] every field survives both funnels, no degree is stored, and every price equals the frozen reference from the gesture degree');
  return { views:nView, cases, total:nBad, differences:bad };
}
/* Задуманное P.seed (или P.song) против песни.
   Шаги взятого группируются по (функция, доля): событий с тем же номером взятого, функцией и долей обязано быть РОВНО столько, сколько
   шагов (порождённые полосой редактора — a.gen — не в счёт; группа с распущенным редактором шагом счёт не сверяет), и каждый шаг
   находит СВОЁ событие без расхождений. У P.seed группы по одному шагу — это прежняя проверка «ровно одно событие» дословно; у
   P.song на одной доле бывает несколько ударов разных рядов. */
export function checkSeed(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  if(!SEED_REC){ miss('no seed record in this session — run await P.seed({replace:true})'); return { cases, total:nBad, differences:bad }; }
  const R=SEED_REC, what= R.kind==='song' ? `song ${R.name}` : 'seed';
  const edited=(take,st)=> !!st.skip || (R.edited||[]).some(([id,t0,pf])=>take.scaleId===id && st.fn.startsWith(pf||'ch') && (st.t===t0||st.t===t0+4));   // T5: третье поле — роль правленого шага (по умолчанию аккорд)
  for(const take of R.takes){
    const G=new Map();
    for(const st of take.steps){ const k=st.fn+'@'+st.t; let g=G.get(k); if(!g) G.set(k, g={ fn:st.fn, t:st.t, steps:[], edited:false });
      if(edited(take,st)) g.edited=true; else g.steps.push(st); }
    for(const g of G.values()){
      const cand=events.filter(e=>e.tk===take.take && e.fn===g.fn && Math.abs(e.t-g.t)<1e-9 && !(e.a&&e.a.gen));
      const at0=`${what} · ${take.label} · ${g.fn} at beat ${g.t}`;
      if(!g.edited && cand.length!==g.steps.length) miss(`${at0}: ${cand.length} stored events (the script wrote ${g.steps.length})`);
      const used=new Set();
      for(const st of g.steps){
        cases++; const at=`${at0}${typeof st.a.deg==='number'?` degree ${st.a.deg} reg ${st.a.oct}`:''}`, sid=st.sid||take.scaleId, ign=st.ign?new Set(st.ign):null;
        const diffOf=ev=>[ ...(ev.sc && ev.sc.id!==sid ? [`${at}: stored in ${ev.sc.id}, the script intended ${sid}`] : []),
                           ...(take.cm!==undefined && ev.sc && ev.sc.chordMode!==take.cm ? [`${at}: chord mode ${ev.sc.chordMode}, the script intended ${take.cm}`] : []),   // T7b
                           ...writeDiff(at,ev,st.a,ign) ];
        let pick=null, pd=null;
        for(const c of cand){ if(used.has(c)) continue; const d=diffOf(c); if(!d.length){ pick=c; pd=d; break; } if(!pick){ pick=c; pd=d; } }
        if(!pick){ miss(`${at}: no stored event`); continue; }
        used.add(pick); for(const d of pd) miss(d);
      }
    }
  }
  /* ⛳ U5: ВСТАВКИ P.seed — каждая лежит, где задумана: пара (индекс, регистр), тип (по значению), громкость и тембр есть (правило #30),
     в ладу или вне его — как задумано, и ФОРМА (интервалы нот в центах от первой) — как у выделенного аккорда (или по правилу лада на
     ярком корне у нетипизированного). Вставка — своё взятое редактора: в группы сценарных взятых она не попадает. */
  const scriptedTk=new Set(R.takes.map(x=>x.take)); let nIns=0;
  for(const I of (R.inserts||[])){ cases++; nIns++;
    const at=`${what} · insert ${I.label}`;
    const ev=events.find(e=>e.fn===I.fn && e.layer===I.layer && Math.abs(e.t-I.t)<1e-9 && !scriptedTk.has(e.tk));
    if(!ev){ miss(`${at}: no inserted event at beat ${I.t} in L${I.layer+1}`); continue; }
    const a=ev.a||{};
    if(a.ti!==I.ti||a.oct!==I.oct) miss(`${at}: stored ti/reg ${a.ti}/${a.oct}, intended ${I.ti}/${I.oct}`);
    if('deg' in a) miss(`${at}: carries a degree`);
    if(!(typeof a.vol==='number' && a.vol>=0 && a.vol<=1)) miss(`${at}: volume ${a.vol} (rule #30)`);
    const tr=I.fn==='bassOn'?'bs':I.fn==='chOn'?'ch':'ld';   // TIM2: an inserted note carries the permanent timbre id of its role
    if(typeof a.inst!=='string' || (timbreById(a.inst)||{}).role!==tr) miss(`${at}: timbre ${a.inst} is not a ${tr} timbre id`);
    if('inst' in I && a.inst!==timbreKey(tr,I.inst)) miss(`${at}: timbre ${a.inst}, intended ${timbreKey(tr,I.inst)}`);   // S4: тембр — ближайшей ноты
    if('vol' in I && a.vol!==I.vol) miss(`${at}: volume ${a.vol}, intended ${I.vol}`);       // S4: громкость — ближайшего события с громкостью
    const wantFx= I.fx==null && SEED_REC && SEED_REC.soloSnap ? SEED_REC.soloSnap : I.fx;   // AF5: a copied absence is filled at song load with exactly the load snapshot
    if('fx' in I && JSON.stringify(a.fx??null)!==JSON.stringify(wantFx??null)) miss(`${at}: effect map ${JSON.stringify(a.fx??null)}, intended ${JSON.stringify(wantFx??null)} (a copy of the neighbour's, absence included — absence filled at song load, AF5)`);   // S4: решение пользователя 1
    if(I.plain && (a.bend || a.tie || a.hold)) miss(`${at}: an inserted solo note carries ${a.bend?'a bend':a.tie?'a tie':'hold'}`);   // S4: вставленная нота — обычная
    if('ty' in I && JSON.stringify(a.ty??null)!==JSON.stringify(I.ty??null)) miss(`${at}: type ${JSON.stringify(a.ty)}, intended ${JSON.stringify(I.ty)}`);
    if(I.out!=null && !modeSlotOfTi(a.ti,a.oct,ev.sc)!==I.out) miss(`${at}: ${I.out?'should be outside':'should be inside'} its mode`);
    if(I.cents){ const N=chordNotesAt(a.ti,a.oct,ev.sc,ev.sev,a.ty), c=centsShape(N);
      if(c.length!==I.cents.length || c.some((x,i)=>Math.abs(x-I.cents[i])>1e-6)) miss(`${at}: shape ${c.map(x=>Math.round(x*1000)/1000).join(' ')}¢, intended ${I.cents.map(x=>Math.round(x*1000)/1000).join(' ')}¢`); }
  }
  console.log(`[scaleprobe seed-check] ${what}: scripted notes ${cases-nIns}${nIns?` · inserts ${nIns}`:''} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe seed-check] '+m));
  if(!nBad) console.log('[scaleprobe seed-check] every seeded note is stored as intended — timbre, volume, register, type, bend — and sounds its intended degree; every insert lies where intended with its intended shape');
  return { cases, total:nBad, differences:bad };
}
/* Уровень замороженного баса в раге (P.seed) против ожидаемого. */
export function checkFrozen(){
  if(SEED_REC && SEED_REC.kind==='song'){   // P.song: баса в раге нет — проверять нечего; демо-пьеса ничего не замораживает (её голосов хватает живым пулам)
    console.log(`[scaleprobe frozen] the loaded song is P.song('${SEED_REC.name}') — the seed's frozen raga bass is not in it; nothing to check`);
    return { cases:0, total:0, differences:[], got:null };
  }
  const bad=[]; const E=SEED_FROZEN_EXPECT, F=SEED_REC&&SEED_REC.freeze;
  if(!F){ bad.push('no frozen seed track in this session — run await P.seed({replace:true}) (the freeze needs ▶ Play started)'); return { cases:0, total:1, differences:bad, got:null }; }
  if(!F.installed) bad.push(`the seed's freeze of L${F.layer+1} was not installed (${F.refused})`);
  if(Math.abs(F.samples-E.sec*(F.rate||48000))>1) bad.push(`buffer ${F.samples} samples, expected ${seedFrozenSamples(F)} (${E.sec.toFixed(6)} s at ${F.rate||48000} Hz, ±1 sample of rounding)`);
  if(!(F.peak>=E.peak*E.floor)) bad.push(`peak ${F.peak} is below ${Math.round(E.floor*100)}% of the expected ${E.peak} — the frozen bass went quiet`);
  if(!(F.rms>=E.rms*E.floor)) bad.push(`rms ${F.rms} is below ${Math.round(E.floor*100)}% of the expected ${E.rms} — the frozen bass went quiet`);
  console.log(`[scaleprobe frozen] L${F.layer+1} (bass in the raga): peak ${F.peak} (expected ${E.peak}), rms ${F.rms} (expected ${E.rms}), buffer ${F.samples} samples (expected ${seedFrozenSamples(F)} at ${F.rate||48000} Hz)`);
  bad.forEach(m=>console.warn('[scaleprobe frozen] '+m));
  return { cases:3, total:bad.length, differences:bad, got:F };
}
const SID=id=>{ if(!scaleById(id)) throw new Error('no scale '+id); return id; };   // F1: адрес — сам id   // id — стабильный идентификатор (T0), не имя (правило #25)
export async function seed(opt={}){
  console.log('[scaleprobe seed] P.seed REPLACES the current song with a test song (nothing is saved).');
  if(editIsOpen()){ console.warn('[scaleprobe seed] the track editor is open — close it first.'); return null; }
  if(events.length && !opt.replace){ console.warn(`[scaleprobe seed] the song has ${events.length} events — refusing. Run await P.seed({replace:true}) to replace it.`); return null; }
  asPause('probe-song',true);   // AUTOSAVE1: a test song never enters the person's autosaves
  const keep={ sc:scaleId, tf:tunedFrom, sev:seventh, cm:chordModeSel };   // T7b: и выбор режимов аккордов
  const built=[]; const say=m=>{ built.push(m); console.log('[scaleprobe seed] '+m); };
  try{
    SEED_REC={ kind:'seed', takes:[], edited:[['major',12],['partch-43',32],['major',8],['major-penta',76],['major',12,'bass']], freeze:null };   // задуманное — для P.checkSeed (ноты, которые сценарий правит в редакторе ниже; T5 — три правки на высоты вне лада)
    clearRec(); setLoopMetre(4); setSeventh(false); setChordModeSel({});   // T7b: режимы аккордов — с умолчаний; каждое взятое ставит свой
    let nid=0; const S=[];
    const on =(fn,a,t,skip)=>{ const id=++nid; S.push({fn,a,t,id,...(skip?{skip:true}:null)}); return id; };   // skip (S4) — шаг, который сценарий потом правит в редакторе: P.checkSeed его не сверяет
    const at =(id,fn,a,t,skip)=>S.push({fn,a,t,id,...(skip?{skip:true}:null)});
    const take=(label,scaleId,tf,cm)=>{ setScaleId(SID(scaleId)); if(tf!==undefined) setTunedFrom(tf); if(cm!==undefined) setChordMode(scaleId,cm);   // T7b: режим аккордов взятого
      const steps=S.splice(0), r=seedTake(steps); if(!r) throw new Error('seedTake refused — start the app (▶ Play) and stop the transport first');
      SEED_REC.takes.push({ label, take:r.take, scaleId, tf, cm:chordModeOf(scaleById(SID(scaleId))), steps:steps.map(st=>({ fn:st.fn, t:st.t, a:{...st.a}, ...(st.skip?{skip:true}:null) })) });
      say(`${label}: take ${r.take}, ${r.events} events → tracks ${r.layers.map(l=>'L'+(l+1)).join(', ')}`); return r; };
    // ---- 1) мажор: соло, терменвокс, бас, аккорды ----
    const solo=(t,d,len)=>{ const id=on('leadOn',{deg:d,oct:1,vol:.8,inst:0},t); at(id,'leadOff',{v:0},t+len); };
    [[0,0],[1,2],[2,4],[3,5]].forEach(([t,d])=>solo(t,d,0.9));
    { const id=on('leadOn',{deg:2,oct:1,vol:.8,inst:0,bend:[{dt:0,c:0},{dt:1,c:70},{dt:2,c:-50},{dt:3,c:0}]},4);
      at(id,'leadSet',{deg:3,oct:1,vol:.8,hold:true,v:0},5); at(id,'leadSet',{deg:1,oct:1,vol:.7,hold:true,v:0},6); at(id,'leadOff',{v:0},7.5); }
    [[8,4],[9,3],[10,2],[11,0]].forEach(([t,d])=>solo(t,d,0.9));
    { const id=on('bassOn',{deg:0,oct:1,vol:.8,inst:0},0); at(id,'bassSet',{deg:3,oct:1,vol:.8},4); at(id,'bassSet',{deg:4,oct:1,vol:.7},8); at(id,'bassOff',{},12);
      const id2=on('bassOn',{deg:0,oct:1,vol:.8,inst:0},12); at(id2,'bassOff',{},16); }
    { const id=on('chOn',{deg:0,oct:1,vol:.8,inst:0,ty:null},0); at(id,'chSet',{deg:3,oct:1,vol:.8,ty:null},4); at(id,'chSet',{deg:4,oct:1,vol:.8,ty:null},8);
      at(id,'chOff',{},12);   // «выкл» ПЕРЕД «вкл» следующего аккорда на ту же долю — тот же ключ владельца
      const id2=on('chOn',{deg:5,oct:1,vol:.8,inst:0,ty:null},12); at(id2,'chOff',{},16); }
    take('major: solo, theremin, bass, chords','major');
    // ---- 2) бас в раге ----
    { const id=on('bassOn',{deg:0,oct:1,vol:.8,inst:0},16); at(id,'bassSet',{deg:2,oct:1,vol:.8},20); at(id,'bassSet',{deg:4,oct:1,vol:.8},24); at(id,'bassSet',{deg:1,oct:1,vol:.8},28); at(id,'bassOff',{},32); }
    take('raga Yaman: bass','raga-yaman');
    // ---- 3) Партч: типизированные аккорды ----
    /* T7: каждый засеянный аккорд Партча ЦЕЛИКОМ в 43 высотах (живая игра другого не даёт): О на 1/1, У на 5/4 (прежде — на 32/27, где
       У выходит из строя: 32/27·6/5 = 64/45), О7 на 4/3, субминор на 3/2. */
    { const v=scaleView(scaleById(SID('partch-43')),'T'), F=chordFams(v), ty=(f,k)=>{ const fam=F[f]||F[0]; return (fam.types[k]||fam.types[0]).iv; };
      [[32,0,0,0],[36,14,1,0],[40,18,0,1],[44,25,2,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:ty(f,k)},t); at(id,'chOff',{},t+4); }); }
    take('Partch: typed chords','partch-43');
    // ---- 4) Пифагор «строй от C»: аккорды палитры и бас ----
    { const v=scaleView(scaleById(SID('pythagorean')),0), F=chordFams(v), ty=(f,k)=>{ const fam=F[f]||F[0]; return (fam.types[k]||fam.types[0]).iv; };
      [[48,0,0,0],[52,5,0,0],[56,7,0,1],[60,0,1,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:ty(f,k)},t); at(id,'chOff',{},t+4); });
      const id=on('bassOn',{deg:0,oct:1,vol:.8,inst:0},48); at(id,'bassSet',{deg:5,oct:1,vol:.8},52); at(id,'bassSet',{deg:7,oct:1,vol:.8},56); at(id,'bassOff',{},64); }
    take('Pythagorean tuned from C: palette chords, bass','pythagorean',0);
    // ---- 5) пентатоника: аккорды-стопки ----
    [[64,0],[68,1],[72,3],[76,4]].forEach(([t,d])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:null},t); at(id,'chOff',{},t+4); });
    take('major pentatonic: stacked chords','major-penta','T','stack');
    // ---- 5b) T7b: режимы аккордов — оба режима у Партча, Болена–Пирса и пентатоники ----
    const tyOf=(id,cm,f,k)=>{ const F=chordFams(scaleView(scaleById(SID(id)),'T',cm)), fam=F[f]||F[0]; return (fam.types[k]||fam.types[0]).iv; };
    /* F8: «ЩИПОК» СЦЕНАРИЯ — тип, выбранный в палитре (первая ячейка, О), на корне d проходит ту же функцию, что живая игра (scales.chordAtRoot):
       звучит и пишется то, что она вернула. */
    const seedPinch=(id,cm,d)=>{ const v=scaleView(scaleById(SID(id)),'T',cm); return chordAtRoot(tyOf(id,cm,0,0), tuningIndexOf(d,v,true), v); };
    [[80,0,0,0],[84,9,2,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:tyOf('bohlen-pierce','free',f,k)},t); at(id,'chOff',{},t+4); });
    { const id=on('chOn',{deg:3,oct:1,vol:.8,inst:0,ty:tyOf('bohlen-pierce','free',0,2)},88); at(id,'chOff',{},92); }   // пентада 3:5:7:9:11 — аккорд на 11, вернувшийся в «Свободно»
    take('Bohlen–Pierce, Free: pure ratios, an 11-chord','bohlen-pierce','T','free');
    [[92,0,0,0],[96,4,1,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:tyOf('bohlen-pierce','instrument',f,k)},t); at(id,'chOff',{},t+4); });
    take('Bohlen–Pierce, As on the instrument: steps','bohlen-pierce','T','instrument');
    [[100,11,1,0],[104,0,0,3]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:tyOf('partch-43','free',f,k)},t); at(id,'chOff',{},t+4); });   // У на 32/27 — в «Свободно» доступен (тон 64/45 вне 43)
    { const id=on('chOn',{deg:3,oct:1,vol:.8,inst:0,ty:seedPinch('partch-43','free',3)},124); at(id,'chOff',{},128); }   // F8: тот же щипок, что ниже в «Как на инструменте», — в «Свободно» звучит ЦЕЛЫЙ тип
    take('Partch, Free: a chord outside the 43','partch-43','T','free');
    [[108,0,0,3],[112,18,0,1]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:tyOf('partch-43','instrument',f,k)},t); at(id,'chOff',{},t+4); });   // O11 на 1/1, O7 на 4/3 — целиком в 43
    { const id=on('chOn',{deg:3,oct:1,vol:.8,inst:0,ty:seedPinch('partch-43','instrument',3)},116); at(id,'chOff',{},120); }   // ⛳ F8: щипок с типом О на 21/20 (там ни один тип не ложится) — звучит ОДИН КОРЕНЬ
    take('Partch, As on the instrument','partch-43','T','instrument');
    [[116,0],[120,3]].forEach(([t,d])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:null},t); at(id,'chOff',{},t+4); });
    take('major pentatonic: power chords','major-penta','T','power');
    // ---- 6) редактор: распад аккорда и перенос одной ноты ----
    const segOf=(id,start)=>songSegs().segs.find(g=>g.role==='ch'&&g.sc.id===id&&g.start===start&&g.first&&!g.ev.jam);
    const g1=segOf('major',12);
    if(g1 && editOpen(g1.layer) && editDeleteChordNote(g1.ev,1)) say(`editor: the major chord at beat 12 (L${g1.layer+1}) dissolved — its middle note deleted`);
    else say('editor: dissolve FAILED');
    const g2=segOf('partch-43',32);
    if(g2 && editSetLayer(g2.layer) && editMoveChordNote(g2.ev,1,32.5,tuningIndexOf(modeSlotOfTi(g2.ti,g2.oct,g2.sc).deg+1,g2.sc,true),g2.oct)) say(`editor: one note of the first Partch chord (L${g2.layer+1}) moved half a beat later and one row up`);
    else say('editor: chord-note move FAILED');
    /* ---- 6b) T5: высоты ВНЕ ЛАДА (приглушённые ряды) — теми же функциями правки, что перенос в редакторе ---- */
    const segAt=(role,id,start)=>songSegs().segs.find(g=>g.role===role&&g.sc.id===id&&Math.abs(g.start-start)<1e-9&&!g.ev.jam);
    const dim=(g,ti)=>g && !modeSlotOfTi(ti,g.oct,g.sc);
    const b1=segAt('bs','major',12);
    if(dim(b1,b1&&b1.ti+1) && editSetLayer(b1.layer) && editMoveSeg(b1.ev,b1.start,b1.ti+1,b1.oct)) say(`editor T5: the major bass note at beat 12 (L${b1.layer+1}) moved one tuning step up, onto the dimmed C#`);
    else say('editor T5: out-of-mode bass move FAILED');
    const g3=segAt('ch','major',8);   // G–B–D внутри защёлкнутой прогрессии: его терция B → A# (приглушённый ряд), аккорд распадается
    if(dim(g3,g3&&g3.ti+3) && editSetLayer(g3.layer) && editMoveChordNote(g3.ev,1,g3.start,g3.ti+3,g3.oct)) say(`editor T5: the third of the major chord at beat 8 (L${g3.layer+1}) moved onto the dimmed A#`);
    else say('editor T5: out-of-mode chord-tone move FAILED');
    const g4=segAt('ch','major-penta',76), F4=g4&&g4.ti-4;   // A (ступень 4 пентатоники) → корень F, вне лада: вариант (а) — аккорд с формой
    if(dim(g4,F4) && editSetLayer(g4.layer)){ const r=editMoveSeg(g4.ev,g4.start,F4,g4.oct);
      say(r ? `editor T5: the whole stacked chord at beat 76 (L${g4.layer+1}) moved onto the dimmed F — typed with its shape [${r.a&&r.a.ty}]` : 'editor T5: whole-chord move onto a dimmed root FAILED'); }
    else say('editor T5: whole-chord move onto a dimmed root FAILED');
    /* ---- 6c) U5: ВСТАВКА — одна нота на любом ряду, форма выделенного ЦЕЛОГО аккорда ---- */
    SEED_REC.inserts=[];
    const insRec=(label,fn,layer,t,ti,oct,want)=>SEED_REC.inserts.push({ label, fn, layer, t, ti, oct, ...want });
    const bI=segAt('bs','major',12), c0=segAt('ch','major',0), p5=segAt('ch','partch-43',36);
    const fis=bI ? tuningIndexOf(0,bI.sc,false)+6 : null;   // F# — корень мажора + 6 полутонов: приглушённый ряд
    if(bI && editSetLayer(bI.layer) && editInsertBass(17,fis,1,bI.sc,bI.sev,1)){
      insRec('bass on the dimmed F#','bassOn',bI.layer,17,fis,1,{ out:true }); say(`editor U5: a bass note inserted on the dimmed F# at beat 17 (L${bI.layer+1})`); }
    else say('editor U5: bass insert on a dimmed row FAILED');
    if(c0 && editSetLayer(c0.layer)){
      const sc0=c0.sc, root=t=>tuningIndexOf(0,sc0,true)+t;   // индекс корня мажора + сдвиг в полутонах (равный 12-ступенный строй)
      const shape=centsShape(segChordNotes(c0)), ivs=segChordNotes(c0).map(n=>n.iv);
      if(editInsertChord(17,root(8),1,sc0,c0.sev,1,null)){ insRec('one note on the dimmed G#','chOn',c0.layer,17,root(8),1,{ ty:chordUnit(sc0), cents:[0], out:true }); say(`editor U5: one note inserted on the dimmed G# at beat 17 (L${c0.layer+1})`); }
      else say('editor U5: one-note chord insert FAILED');
      if(editInsertChord(18,root(3),1,sc0,c0.sev,1,c0.ev)){ insRec('C major shape at the dimmed D#','chOn',c0.layer,18,root(3),1,{ ty:ivs, cents:shape, out:true }); say(`editor U5: the C major chord's shape inserted at the dimmed D# at beat 18 — typed [${ivs}]`); }
      else say('editor U5: shape insert on a dimmed root FAILED');
      if(editInsertChord(19,root(5),1,sc0,c0.sev,1,c0.ev)){ insRec('C major shape at the bright F (by the rule)','chOn',c0.layer,19,root(5),1,{ ty:null, cents:centsShape(chordNotesAt(root(5),1,sc0,c0.sev,null)), out:false }); say(`editor U5: the C major chord's shape inserted at the bright F at beat 19 — untyped, by the mode's rule`); }
      else say('editor U5: shape insert on a bright root FAILED');
    }else say('editor U5: chord inserts FAILED (no major chord track)');
    if(p5 && editSetLayer(p5.layer)){ const r0=tuningIndexOf(0,p5.sc,true);
      if(editInsertChord(50,r0,1,p5.sc,p5.sev,1,p5.ev)){ insRec('Partch typed chord shape, rigid','chOn',p5.layer,50,r0,1,{ ty:p5.ty, cents:centsShape(segChordNotes(p5)), out:false }); say(`editor U5: the Partch chord at beat 36 inserted rigidly at the tonic at beat 50 (L${p5.layer+1})`); }
      else say('editor U5: typed shape insert FAILED'); }
    else say('editor U5: typed shape insert FAILED (no Partch chord)');
    editClose();
    // ---- 7) подложка, скоба, пауза ----
    setScaleId(SID('major'));
    if(loadJam({prog:2, rhythm:0, bass:'roots'})) say('backing: jam I–vi–ii–V in major (chords, root bass, drums) from beat 0'); else say('backing FAILED');
    const L=songBeats(), Mt=loop.metre;
    braceTap(2*Mt); braceTap(L-2*Mt); setRegionOn(true);
    say(`repeat brace: beats ${loop.rgn.from}–${loop.rgn.to} (set by the user), repeat on`);
    if(loop.on) onLoop();   // подложка подняла транспорт — пауза: проверки и заморозка идут на остановленном
    // ---- 8) заморозка дорожки баса в раге ----
    const gr=songSegs().segs.find(g=>g.role==='bs'&&g.sc.id==='raga-yaman');
    if(gr){ try{ const R=await import('../render.js'); const r=await R.freeze(gr.layer);
            SEED_REC.freeze={ layer:gr.layer, peak:r&&r.peak, rms:r&&r.rms, samples:r&&r.buf&&r.buf.length, rate:r&&r.buf&&r.buf.sampleRate, installed:!!(r&&r.installed), refused:r&&r.refused };
            say(r&&r.installed ? `freeze: L${gr.layer+1} (bass in the raga) frozen` : `freeze: L${gr.layer+1} rendered but not installed (${r&&r.refused})`); }
            catch(err){ say('freeze: not available from the console ('+(err&&err.message)+')'); } }
    // ---- 9) S4: СОЛО ДЛЯ РЕДАКТОРА — ведущая линия, полифония, карта эффектов, терменвокс, пара связки; правки редактора над ними ----
    /* ⛳ ПОСЛЕ ЗАМОРОЗКИ И В КОНЦЕ ПЕСНИ (доли 132–151): прежние взятые, их дорожки (id дорожки → семя заморозки баса в раге), скоба и
       буфер не меняются — строка «frozen seed bass» и все прежние песенные случаи остаются теми же; новые лишь добавляются.
       Одно взятое: соло тембра 0 ложится в одну новую дорожку, продолжение пары связки (тембр 1) — во вторую (маршрут по тембру, T3). */
    setScaleId(SID('major'));
    { const id=on('leadOn',{deg:0,oct:1,vol:.8,inst:0,v:0},132);                  // ведущая линия: ОДНА нота (v 0) на пять высот
      at(id,'leadSet',{deg:2,oct:1,vol:.8,v:0},133,true); at(id,'leadSet',{deg:4,oct:1,vol:.8,v:0},134,true);   // их правит отделение сегмента (ниже)
      at(id,'leadSet',{deg:3,oct:1,vol:.8,v:0},135); at(id,'leadSet',{deg:1,oct:1,vol:.7,v:0},136); at(id,'leadOff',{v:0},137); }
    { const a=on('leadOn',{deg:4,oct:1,vol:.8,inst:0,v:0},138), b=on('leadOn',{deg:6,oct:1,vol:.75,inst:0,v:1},139);   // полифония: две ноты внахлёст
      at(a,'leadOff',{v:0},140); at(b,'leadOff',{v:1},141); }
    { const id=on('leadOn',{deg:2,oct:1,vol:.8,inst:0,fx:{'vib:amt':0.3,'drv:amt':0.2},v:0},142); at(id,'leadOff',{v:0},143); }   // нота с картой эффектов
    { const id=on('leadOn',{deg:1,oct:1,vol:.8,inst:0,bend:[{dt:0,c:0},{dt:1,c:60},{dt:2,c:-40}],v:0},144,true);   // терменвокс (его переносит и транспонирует редактор)
      at(id,'leadSet',{deg:2,oct:1,vol:.8,hold:true,v:0},145,true); at(id,'leadSet',{deg:0,oct:1,vol:.7,hold:true,v:0},146,true); at(id,'leadOff',{v:0},147,true); }
    { const a=on('leadOn',{deg:3,oct:1,vol:.8,inst:0,v:0},148); at(a,'leadOff',{v:0,tie:true},149);   // ПАРА СВЯЗКИ: смена тембра посреди ноты (T3)
      const b=on('leadOn',{deg:3,oct:1,vol:.8,inst:1,tie:true,v:0},149); at(b,'leadOff',{v:0},150); }
    take('major: solo for the editor (S4)','major');
    const ldSeg=t0=>songSegs().segs.find(g=>g.role==='ld'&&Math.abs(g.start-t0)<1e-9);
    const e1=ldSeg(133);
    if(e1 && editOpen(e1.layer) && editMoveSeg(e1.ev,133.5,e1.ti,e1.oct)) say(`editor S4: the second pitch of the solo line (L${e1.layer+1}) moved half a beat later — it detaches into its own note`);
    else say('editor S4: solo line segment move FAILED');
    const th=ldSeg(144), th2=th ? tuningIndexOf(2,th.sc,false) : null;
    if(th && editSetLayer(th.layer) && editMoveSeg(th.ev,144.5,th2,th.oct)){
      SEED_REC.solo={ therm:{ t:144.5, ti:th2, oct:th.oct, bend:[{dt:0,c:0},{dt:1,c:60},{dt:2,c:-40}] } };
      say(`editor S4: the theremin note (L${th.layer+1}) moved half a beat later and one degree up — its bend unchanged`); }
    else say('editor S4: theremin move FAILED');
    const fxn=ldSeg(142), tp=ldSeg(149);
    if(fxn && editSetLayer(fxn.layer)){ const ti=tuningIndexOf(5,fxn.sc,false);
      if(editInsertLead(142.5,ti,1,fxn.sc,fxn.sev,0.5)){ insRec('solo note copying its neighbour’s effect map','leadOn',fxn.layer,142.5,ti,1,{ inst:0, vol:.8, fx:{'vib:amt':0.3,'drv:amt':0.2}, plain:true });
        say(`editor S4: a solo note inserted at beat 142.5 (L${fxn.layer+1}) — it copies its neighbour's effect map`); }
      else say('editor S4: solo insert (with a map) FAILED'); }
    else say('editor S4: solo insert (with a map) FAILED (no note with a map)');
    if(tp && editSetLayer(tp.layer)){ const ti=tuningIndexOf(4,tp.sc,false);
      if(editInsertLead(151,ti,1,tp.sc,tp.sev,1)){ insRec('solo note whose neighbour has no map','leadOn',tp.layer,151,ti,1,{ inst:1, vol:.8, fx:null, plain:true });
        say(`editor S4: a solo note inserted at beat 151 (L${tp.layer+1}, the tie partner's track) — no map, as its neighbour`); }
      else say('editor S4: solo insert (no map) FAILED'); }
    else say('editor S4: solo insert (no map) FAILED (no tie partner)');
    editClose();
  } finally {
    setScaleId(keep.sc); setTunedFrom(keep.tf); setSeventh(keep.sev); setChordModeSel(keep.cm);
  }
  tracks();
  const pinned=songPinChains();   // AF3: song load pins the live chain on every track without one (auto-freeze never does)
  SEED_REC.pinned=pinned.length; SEED_REC.soloSnap=pinned.soloSnap;   // AF5: the map given to map-less solo notes — checkSeed accepts exactly it
  console.log(`[scaleprobe seed] song load: ${pinned.length} track(s) without a captured chain got the live chain pinned${pinned.length?' ('+pinned.map(l=>'L'+(l+1)).join(', ')+')':''}; ${pinned.soloMaps||0} solo note event(s) without an effect map got the live solo snapshot (AF5)`);
  const M=material();
  histReset();   // ED7: the seed starts with an empty history
  SEED_REC.print=songPrint(); SEED_REC.env=liveEnv();   // TF0: the song fingerprint applies to this song in this live environment only
  console.log(`[scaleprobe seed] built ${events.length} events; song material ${M.ok?'complete':'INCOMPLETE — missing '+M.missing.join('; ')}. Now run P.all().`);
  return { built, events:events.length, material:M };
}
/* ═══ P.song — ДЕМО-ПЬЕСА ИЗ src/songs.js ═══
   Тот же образец, что P.seed (воронки рекордера, функции редактора, подложка), но музыка, а не набор случаев. Модуль грузится
   лениво — приложение его не знает. Отказы (непустая песня без {replace:true}, запись, игра транспорта, открытый редактор) — в нём.
   Записанное задуманное (шаги взятых) становится записью для P.checkSeed: P.all после загрузки сверяет ПЬЕСУ, а не тестовую песню. */
export async function song(name='triphop', opt={}){
  const S=await import('../songs.js');
  if(!editIsOpen()) setChordModeSel({});   // T7b: пьеса написана в режимах аккордов по умолчанию (как тоника и лад, выбор остаётся у пьесы)
  const r=await S.loadSong(name, opt);
  if(!r) return null;
  asPause('probe-song',true);   // AUTOSAVE1
  SEED_REC={ kind:'song', name:r.name, takes:r.takes, edited:[], freeze:null };
  const pinned=songPinChains(); SEED_REC.pinned=pinned.length; SEED_REC.soloSnap=pinned.soloSnap;   // AF3: song load pins the live chain on chain-less tracks
  console.log(`[scaleprobe song] song load: ${pinned.length} track(s) without a captured chain got the live chain pinned; ${pinned.soloMaps||0} solo note event(s) without an effect map got the live solo snapshot (AF5)`);
  const M=material();
  console.log(`[scaleprobe song] «${r.name}»: ${events.length} events; song material ${M.ok?'complete':'INCOMPLETE — missing '+M.missing.join('; ')}. P.all() checks it.`);
  return { name:r.name, events:events.length, material:M };
}


/* ⛳ TIM2: EVENTS CARRY THE PERMANENT TIMBRE ID (a.inst / a.kit); the engine plays by list position — one door each way (audio.timbreKey /
   timbreIdx). (1) every note start and hit of the song (seed, backing, editor inserts) stores a known id of its own role; (2) the doors
   round-trip every timbre of every role, an unknown id resolves to nothing; (3) the birth conversion turns a position into the id and
   leaves an id payload untouched; (4) a live payload (position) and its stored event (id) name the same track source; (5) a song's
   timbre copy (snapshot) equals the entry by value and is not the entry itself. CONTROL: the freeze signature's old numeric mix gives
   two different ids the same value (why it was rewritten). */
function checkTimbreIds(){
  const d=[]; let n=0; const miss=s=>d.push(s), RF={ leadOn:'ld', leadSet:'ld', chOn:'ch', bassOn:'bs', drum:'dr' }, used=new Set();
  for(const e of events){ const r=RF[e.fn]; if(!r||!e.a) continue; const x= r==='dr' ? e.a.kit : e.a.inst; if(x==null) continue; n++;
    if(typeof x!=='string'){ miss(`L${e.layer+1} ${e.fn} at ${e.t}: the timbre is stored as a ${typeof x} (${x}), not an id`); continue; }
    const T=timbreById(x); if(!T||T.role!==r) miss(`L${e.layer+1} ${e.fn} at ${e.t}: «${x}» is not a timbre of role ${r}`); else used.add(x); }
  if(!used.size) miss('the song has no timbre id at all — nothing was checked');
  for(const r of ['ld','ch','bs','dr']) for(const x of timbresOf(r)){ n++;
    if(timbreKey(r,x.idx)!==x.id || timbreIdx(r,x.id)!==x.idx) miss(`${r} ${x.id}: position ${x.idx} ↔ id does not round-trip`); }
  n++; if(timbreIdx('ld','solo.no-such-timbre')!==undefined) miss('an unknown id resolved to a position');
  { n+=3; const s=storeTim('chOn',{ inst:1, vol:0.5 }), k=storeTim('drum',{ kit:2, row:1 }), keep={ inst:timbreKey('ch',1) };
    if(s.inst!==timbreKey('ch',1) || s.vol!==0.5) miss(`birth: chOn position 1 → ${JSON.stringify(s)}`);
    if(k.kit!==timbreKey('dr',2) || k.row!==1) miss(`birth: drum kit 2 → ${JSON.stringify(k)}`);
    if(storeTim('chOn',keep)!==keep) miss('birth: an id payload was copied or changed'); }
  { n++; const v=CUR(); if(noteSource('bassOn',{ inst:2 },v)!==noteSource('bassOn',{ inst:timbreKey('bs',2) },v)) miss('a live payload (position) and its stored event (id) name different track sources'); }
  for(const id of used){ n++; const S=timbreSnapshot(id), T=timbreById(id);
    if(!S || S.role!==T.role || S.def===T.entry || JSON.stringify(S.def)!==JSON.stringify(T.entry)) miss(`snapshot of ${id}: not an equal, separate copy`); }
  { n++; const old=(h,tag,x)=>(Math.imul(h,31)+tag*64+((x==null?-1:x)|0)+1)|0, ids=timbresOf('ch').map(x=>x.id);
    if(old(0,2,ids[0])!==old(0,2,ids[1])) miss('CONTROL: the old numeric signature mix told two ids apart — the control cannot fail'); }
  return { cases:n, total:d.length, differences:d };
}
/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:170, name:'seed notes as intended', run:()=>checkSeed(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });
row({ at:180, name:'frozen seed bass level', run:()=>checkFrozen(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });
row({ at:460, name:'write path (funnels)', run:()=>checkWrite(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ at:185, name:'TIM2 events carry timbre ids', run:()=>checkTimbreIds(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });
