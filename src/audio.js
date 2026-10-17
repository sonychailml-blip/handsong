import { leadIdx, setLeadIdx, bassIdx, setBassIdx, drumKitIdx, setDrumKitIdx, fx, fxIsScalar, fxChainOf, chainKeyOf, CHAIN_SOLO, trackChainKeyOf } from './state.js';   // FX_VOL — VOL-0: id модуля «Громкость»
import { tonicFreq, droneSecondHz } from './scales.js';   // droneSecondHz — вторая струна дрона: высота строя, следует за ладом (слайс «дрон и центы»)
import { hooks } from './hooks.js';
import { createRegistry } from './core/registry.js';   // TIM1: permanent timbre ids (identity ≠ name ≠ position)
import { FX_VOL, BASS_POOL_N, LEAD_POOL_N, LEAD_POOL_KS, CHORD_POOL_N, CHORD_POOL_FIRST, CHORD_POOL_SPARE, volAmp, volVel, bendPlan } from './config.js';
import { FOREST, forestIR, irNormScale, DYN_GLUE, DYN_LIMIT, DYN_MASTER, MASTER_MAKEUP_DB } from './core/dsp.js';   // SND-F1: Night forest IR, dynamics presets (pure core)   // VOL-2b: одна кривая громкости (volAmp), вход скорости удара (volVel), пересчёт прежней шкалы (volFromOld — умолчание «Громкости»)
/* AUD1c: the timbre builders live in src/modules/timbres/ (stateless, rule #38; they receive this instance's engine context E) */
import { makePanStage, voiceRoute, panGains, BRI_OPEN, briHzOf, makeBriStage, makeSatCurve, makeHardCurve, briToHz, HUM_CENTS, BASS_GLIDE_TC, CHORD_GLIDE_TC } from './modules/timbres/stages.js';
import { buildLeadBank } from './modules/timbres/subtractive.js';
import { newChordVoice, buildChordPool, ffStrike, FF_END } from './modules/timbres/chord-voice.js';
import { TIMBRE_RECORDS, timbreAll, timbreAddSession } from './timbreload.js';   // TIM3a: the timbre records (data/timbres.bundle.json, checked); TIM3d: + session records
import { buildBassPool } from './modules/timbres/bass-voice.js';
import { drumVoice } from './modules/timbres/drumkits.js';
/* AUD2a: the effects live in src/modules/effects/, the FDN reverb in src/engine/fdn.js (stateless, rule #38; a factory's make(E) builds its instance) */
import { fxNorm, fxDenorm } from './modules/effects/param.js';
import { REV_PARAMS, makeReverbFx } from './modules/effects/reverb.js';
import { DLY_PARAMS, makeDelayFx } from './modules/effects/delay.js';
import { TRMIX_PARAMS, makeTremMixFx } from './modules/effects/trem-mix.js';
import { BRIGHT_PARAMS, makeBrightFx } from './modules/effects/bright.js';
import { GLIDE_PARAMS, makeGlideFx } from './modules/effects/glide.js';
import { VOL_PARAMS, makeVolFx } from './modules/effects/volume.js';
import { FOREST_PARAMS, makeForestFx } from './modules/effects/forest.js';
import { GLUE_PARAMS, dynNode, makeGlueFx } from './modules/effects/glue.js';
 
/* ================= МУЗЫКАЛЬНЫЕ КОНСТАНТЫ ================= */
 
/* TIM3b (RUN 4): the SOLO timbres are data too — records in data/timbres/ with engine types subtractive / fm2 / ks (src/modules/timbres/);
   the sound is built from the record's recipe (buildLeadBank), no longer from code by list position. LEAD_INSTR stays the view the menus,
   events and song copies read ({id, label, att, rel}, today's key order); LEAD_REC[i] is the record behind position i. */
const LEAD_REC=TIMBRE_RECORDS.filter(r=>r.family==='solo');
const LEAD_INSTR=LEAD_REC.map(r=>({ id:r.id, label:JSON.parse(JSON.stringify(r.name)), att:r.env.att, rel:r.env.rel }));
const leadIsKs=i=> !!(LEAD_REC[i] && LEAD_REC[i].engine==='ks');   // TIM3b: KS by the record's engine, not by «the tail of the list»
/* Аккордовые тембры: 2 осциллятора (типы t1/t2, отношение частот ratio, расстройка det в центах,
   микс m1/m2), общий НЧ-фильтр lp, огибающая att/rel. Плюс улучшения качества (per-bank):
   fo — во сколько раз фильтр открыт в атаке (огибающая фильтра), ft — время оседания, fv — скорость→
   яркость (cutoff = lp·(1+fv·vol), пол=lp), hj — гуманизация высоты (0 у органа/падов для строёв). */
/* TIM3a (RUN 4): the chord and bass timbres are DATA — one record per timbre in data/timbres/ (the source of truth), bundled into
   data/timbres.bundle.json, loaded and checked (the T5 bounds) by src/timbreload.js. These tables are VIEWS over the records in today's
   entry shape AND key order (the voice builders, the menus and the song copies read the same entries as before — row «TIM3 timbres =
   before» pins every entry, creation trace and render envelope). Firefly (engine 'tine'): its partials drive ffStrike; the pool voice's
   oscillator fields are silent bookkeeping (TINE_POOL). Chord fields: t1/t2 waves, ratio, det (cents), m1/m2 mix, lp, lvl, att/rel, fo
   (filter opening at the attack), ft (its settle time), fv (velocity → brightness), hj (pitch humanisation). */
const CH_VIEW=['t1','t2','ratio','det','m1','m2','lp','lvl','att','rel','fo','ft','fv','hj'], BS_VIEW=['t1','t2','det','ratio','lp','lvl','att','rel','fo','ft','fv'];
const TINE_POOL=Object.freeze({ t1:'triangle', t2:'sine', ratio:2, det:0, m1:0, m2:0, lp:18000, fo:1, ft:.02, fv:0, hj:0 });
function timbreView(r, keys, extra){
  const e={ id:r.id, label:JSON.parse(JSON.stringify(r.name)), ...extra };
  for(const k of keys) e[k]= k==='att'||k==='rel' ? r.env[k] : k in r.recipe ? r.recipe[k] : TINE_POOL[k];
  return e;
}
const CHORD_INSTR=TIMBRE_RECORDS.filter(r=>r.family==='chord').map(r=>timbreView(r, CH_VIEW, r.engine==='tine' ? { strike:'firefly' } : {}));
const TINE_PARTS=new Map(TIMBRE_RECORDS.filter(r=>r.engine==='tine').map(r=>[r.id, r.recipe.partials]));   // a struck timbre's partials (ffStrike)
/* Бас-тембры (моно-голос, низкий регистр): 2 осц (t1/t2, отношение ratio, расстройка det),
   НЧ-фильтр lp, огибающая att/rel. Плюс огибающая фильтра на атаке: fo — открытие, ft — время,
   fv — скорость→яркость (cutoff = lp·(1+fv·vol), пол=lp). Высоту баса НЕ гуманизируем (низкие
   биения гулкие); синус (Саб) на фильтр почти не реагирует — fo мал. */
const BASS_INSTR=TIMBRE_RECORDS.filter(r=>r.family==='bass').map(r=>timbreView(r, BS_VIEW, {}));
/* Ударные: имена рядов (индекс 0 = низ сетки). Синтез на лету, без сэмплов. */
const DRUM_NAMES=[{en:'Kick',ru:'Кик'},{en:'Snare',ru:'Снейр'},{en:'Clap',ru:'Клэп'},{en:'Hat',ru:'Хэт'},{en:'Tom',ru:'Том'},{en:'Crash',ru:'Крэш'}];
const DRUM_ROWS=DRUM_NAMES.length;
/* Наборы ударных: тембр рядов. Стандарт — синтезированный кит; Дарбука — дум/тек
   (спасены из удалённого backing.js). Селектор той же формы, что LEAD_INSTR и др. */
/* TIM3c (RUN 4): the kits are records too (engine 'drumkit': six rows {synth, vm, params}); DRUM_KITS = the view {id, label} the menus and
   song copies read; DRUM_REC[i] = the record behind kit position i (drumVoice plays its rows). */
const DRUM_REC=TIMBRE_RECORDS.filter(r=>r.family==='kit');
const DRUM_KITS=DRUM_REC.map(r=>({ id:r.id, label:JSON.parse(JSON.stringify(r.name)) }));
/* ⛳ ТЕМБРЫ РОЛИ — ОДНА ФУНКЦИЯ, через которую выбор тембра ДОРОЖКИ (редактор, слайс T5) узнаёт, что можно
   поставить: [{id, name}] для 'ld'|'ch'|'bs'|'dr' (у ударных — наборы). id — то, что лежит в событии
   (a.inst / a.kit) и сравнивается на равенство; name — подпись в форме L() (строка, {default,ru} или
   объект языков), разрешает её показ.
   ⛳ КОНСТРУКТОР ТЕМБРОВ ИДЁТ: тембры пользователя будут жить на устройстве. Тогда меняется ЭТА функция —
   допишет свои записи со стабильным id, — а выбор в редакторе не тронется. Сегодня id = индекс встроенного
   списка. ⛔ Читать встроенные списки мимо неё для ВЫБОРА тембра дорожки нельзя: тембр пользователя в такой
   список не попадёт никогда.
   ⚠️ Не единственный читатель списков ПО ПОЗИЦИИ: сам движок (банки соло, CHORD_INSTR[i], BASS_INSTR[i],
   kit в drumHit), селекторы живых тембров в панели, запасы рендера и свёртка подписи свежести — все
   держат индекс. Им стабильный id понадобится отдельно (см. HANDOFF, «хранение тембров»). */
const TIMBRE_LISTS={ ld:()=>LEAD_INSTR, ch:()=>CHORD_INSTR, bs:()=>BASS_INSTR, dr:()=>DRUM_KITS };
/* ⛳ TIM1: every built-in timbre / kit has a PERMANENT id (`id` in its entry — readable, family-prefixed; never renamed, never reused).
   Identity ≠ name ≠ position (core/registry.js): one registry per role holds the built-ins in table order; a hidden one leaves the
   PICKER (timbresOf) but stays readable (timbreById), so songs that use it always play. Events still store the index until TIM2:
   index ↔ id is converted here, at the boundary (timbreIdOf / timbreById). */
const TIMBRE_REG={};
for(const role in TIMBRE_LISTS){ const R=TIMBRE_REG[role]=createRegistry('timbre');
  for(const x of TIMBRE_LISTS[role]()){ const why=R.add({ id:x.id, name:x.label },{ builtin:true }); if(why) throw new Error('TIM1: '+why); } }
const timbreIdxOf=(role,id)=> TIMBRE_LISTS[role] ? TIMBRE_LISTS[role]().findIndex(x=>x.id===id) : -1;
/* the picker: [{id, idx, name}] — the person's order, hidden ones left out; idx = what an event stores today */
const timbresOf=role=>{ const R=TIMBRE_REG[role]; if(!R) return []; const L=TIMBRE_LISTS[role]();
  return R.order().map(id=>{ const idx=timbreIdxOf(role,id); return { id, idx, name:L[idx].label }; }); };
const timbreIdOf=(role,idx)=>{ const g=TIMBRE_LISTS[role], x=g&&g()[idx]; return x ? x.id : null; };
const timbreById=id=>{ for(const role in TIMBRE_LISTS){ const idx=timbreIdxOf(role,id); if(idx>=0) return { role, idx, entry:TIMBRE_LISTS[role]()[idx] }; } return null; };
const timbreReg=role=> TIMBRE_REG[role] || null;   // the registry (hide / show / order) — probes today, the timbre list UI later
/* ⛳ TIM2 (DAY run 2026-10-16): EVENTS STORE THE PERMANENT ID (a.inst / a.kit); the live hands and the engine work by list POSITION (a session
   handle). Two doors at that boundary, used by every reader: timbreKey (position or id → the id; an event is born with it) and timbreIdx
   (id or position → the position the engine plays; an id this app does not have → undefined, the caller's fallback). */
const timbreKey=(role,x)=> typeof x==='number' ? (timbreIdOf(role,x) ?? x) : x;
const timbreIdx=(role,x)=>{ if(typeof x!=='string') return x; const i=timbreIdxOf(role,x); return i>=0 ? i : undefined; };
/* TIM2: a song file carries a full COPY of every timbre it uses (rule #37) — the entry as data (functions dropped), its role and name */
/* ═══ TIM3d (RUN 4): records added after start (a song's copy of a timbre this app lacks) — appended to this instance's tables and registry;
   the render copy syncs before each render (render.js). timbreRecord(id) = the full record (a song carries it, file v6). ═══ */
const tabOf={ solo:'ld', chord:'ch', bass:'bs', kit:'dr' };
function timbreSync(){
  for(const r of timbreAll()){ const role=tabOf[r.family]; if(!role || timbreIdxOf(role, r.id)>=0) continue;
    if(role==='ld'){ LEAD_REC.push(r); LEAD_INSTR.push({ id:r.id, label:JSON.parse(JSON.stringify(r.name)), att:r.env.att, rel:r.env.rel }); }
    else if(role==='ch'){ CHORD_INSTR.push(timbreView(r, CH_VIEW, r.engine==='tine' ? { strike:'firefly' } : {})); if(r.engine==='tine') TINE_PARTS.set(r.id, r.recipe.partials); }
    else if(role==='bs') BASS_INSTR.push(timbreView(r, BS_VIEW, {}));
    else { DRUM_REC.push(r); DRUM_KITS.push({ id:r.id, label:JSON.parse(JSON.stringify(r.name)) }); }
    TIMBRE_REG[role].add({ id:r.id, name:r.name }); }
}
/* → null (installed, or already here) or one line why not (the T5 bounds, an id that is not the person's / a pack's, a kit) */
function timbreInstall(rec){ const why=timbreAddSession(rec); if(why && why!=='exists') return why; timbreSync(); return null; }
/* probe only: a session timbre leaves the pickers (registry remove); its table entry stays — events that use it keep playing */
const timbreForgetDbg=id=>{ for(const role in TIMBRE_REG){ const R=TIMBRE_REG[role]; if(R.has && !R.has(id)) continue; R.remove(id); } };
const timbreRecord=id=>{ const r=timbreAll().find(x=>x.id===id); return r ? JSON.parse(JSON.stringify(r)) : null; };
const timbreSnapshot=id=>{ const t=timbreById(id); return t ? { id, role:t.role, name:t.entry.label, def:JSON.parse(JSON.stringify(t.entry)) } : null; };

/* ================= АУДИО-ДВИЖОК (чистый Web Audio) ================= */
let AC=null, master, limiter;
/* ═══ MX1: УРОВЕНЬ ДОРОЖКИ — СТУПЕНЬ В ГОЛОСЕ ═══
   Голоса суммируются ПО РОЛЯМ (leadSum/chordBus/bassBus/drumBus → цепь роли → master), своей шины у дорожки, играющей событиями, НЕТ.
   Поэтому уровень дорожки живёт В ГОЛОСЕ: у каждого голоса пула соло, аккордов и баса — свой GainNode `tg` (стоит ПОСЛЕ огибающей и
   драйва, до громкости/суммы: всё за ним линейно — яркость x+w(LP(x)−x), шина, цепь эффектов, — поэтому уровень дорожки — чистый множитель
   её вклада). Удар — одноразовый: узел-множитель строится только при уровне ≠ 1 (как фильтр яркости), при 0 удара нет вовсе.
   ⛳ ЧЕЙ уровень — по КЛЮЧУ ВЛАДЕЛЬЦА голоса ('leadloop:N:v', 'loop:N[:k]', 'bassloop:N…'; удару — 'hit:N', дрону — 'drone:N'): функцию
   «ключ → множитель» ставит recorder (setTrackGainOf) ТОЛЬКО ЖИВОЙ копии движка. У копии рендера она остаётся умолчанием «1» — уровень
   в замороженный буфер НЕ вплавляется (буфер звучит на шине замороженной с тем же множителем), и движение фейдера буфер не старит.
   Живые ключи ('lead:L', 'latch', 'bass…') — не дорожки: множитель 1. */
let trackGainOf=()=>1;
function setTrackGainOf(fn){ trackGainOf= typeof fn==='function' ? fn : ()=>1; }
function ownerGain(key){ const g=+trackGainOf(key); return Number.isFinite(g)&&g>=0 ? g : 1; }
/* Переставить уровень у ЗВУЧАЩИХ голосов: test(ключ) → множитель или null (не трогать). Будущее, расписанное окном опережения на этих
   голосах (setValueAtTime атаки), снимаем — иначе нота, уже поставленная на ближайшие ~300 мс, зазвучала бы прежним уровнем. */
function trackGainRetune(test){ if(!AC) return; const t=AC.currentTime;
  const set=(v,k)=>{ const g=test(k); if(g==null||!v||!v.tg) return; v.tg.gain.cancelScheduledValues(t); v.tg.gain.setTargetAtTime(g,t,0.02); };
  for(const k in leadHold) set(leadHold[k],k);
  for(const k in bassHold) set(bassHold[k],k);
  for(const k in chordHold) for(const v of chordHold[k]) set(v,k);
}
/* ═══ MX2: ПАНОРАМА ДОРОЖКИ — СТЕРЕО-СТУПЕНЬ В ГОЛОСЕ (решение пользователя: ДО эффектов) ═══
   Стоит СРАЗУ ЗА ступенью уровня `tg`: tg (моно) → два гейна L/R → ChannelMerger(2) → дальше по голосу (громкость/сумма). Значит всё, что
   ниже по течению — громкость и тремоло голоса, ступень яркости, сумма роли, цепь эффектов роли, мастер, — получает уже ПАНОРАМИРОВАННЫЙ
   звук: реверб «ставится вокруг ноты», как живьём. ⚠️ Вход реверба сводит стерео в моно (вход канала merger сети — моно, линейно), поэтому
   влажная доля не знает, где стоит нота, а сухая — знает; делей и тремоло шины проходят стерео как есть (эхо остаётся там, где нота).
   ⛳ ЗАКОН — РАВНОЙ МОЩНОСТИ С ЕДИНИЦЕЙ В ЦЕНТРЕ: L = √2·cos θ, R = √2·sin θ, θ = (p+1)·π/4, p ∈ [−1, 1]. Сумма мощностей L²+R² = 2 при
   любом p, то есть громкость на слух постоянна; в центре L = R = 1 РОВНО (особый случай, без тригонометрии) — до MX2 моно-сигнал на
   стерео-выходе и так шёл копией в оба канала, значит дорожка в центре звучит как прежде (до последних битов: суммы теперь стереофонические).
   Край: L = √2 (+3 дБ в одном канале против центра — цена равной мощности), R = 0 ТОЧНО. StereoPannerNode не взят: его закон — −3 дБ в
   центре, и каждая дорожка по умолчанию стала бы тише.
   ⛳ ЧЬЯ панорама — по ключу владельца, как уровень (setTrackPanOf ставит recorder ЖИВОЙ копии; живые ключи — 0, руки всегда в центре).
   ⚠️ В ОТЛИЧИЕ ОТ УРОВНЯ ПАНОРАМА ВПЛАВЛЯЕТСЯ В ЗАМОРОЖЕННЫЙ БУФЕР: рендер ставит своей копии панораму дорожки (render.renderTrack), и она
   входит в подпись заморозки — смена панорамы старит буфер. Причина — порядок: ступень стоит ДО цепи, а реверб нелинеен по месту (сухая
   доля панорамирована, влажная — нет), и у буфера, где цепь уже вплавлена, панорамы «до цепи» не наложить.
   ⛳ VOL-7 (панорама НОТЫ) возьмёт ЭТУ ЖЕ ступень: панорама голоса = клэмп(панорама дорожки + панорама ноты, −1…1), ставится на атаке и
   ведётся событиями ноты; второй ступени не будет. */
let trackPanOf=()=>0;
function setTrackPanOf(fn){ trackPanOf= typeof fn==='function' ? fn : ()=>0; }
function ownerPan(key){ const p=+trackPanOf(key); return Number.isFinite(p) ? Math.max(-1,Math.min(1,p)) : 0; }
/* Ступень строится ОДИН раз с голосом (правило #3 — только гейны, осцилляторов нет); у удара — в самом ударе, только при p ≠ 0. */
/* ═══ AF5 — TRACKS AND LIVE HANDS NEVER SHARE AN EFFECT NETWORK (user's hard rule) ═══
   Live copy only: every role has a second, TRACK head (leadOutT/chordBusT/bassBusT/drumBusT, the same gain as the live head) with its own
   chain under trackChainKeyOf(role key). A pooled voice ends in a router (rL → live head, rT → track head) set at each ATTACK by its owner
   (trackRouteOf: true for a track's owner key — installed by recorder); a drum hit picks its bus the same way. Track playback drives only
   the track chain (recorder.fxPlayDrive), the hands only the live one. Solo track voices skip the expression stage (identity at neutral —
   rule #22 — and the render has no hand). The render copy has no track heads: its voices connect straight to their one head, as before. */
let leadOutT=null, chordBusT=null, bassBusT=null, drumBusT=null;
let trackRouteOf=()=>false;
const setTrackRouteOf=fn=>{ trackRouteOf=fn||(()=>false); };
function routeAt(v,owner,t){ const r=v&&v.rt; if(!r) return; const tr=!!trackRouteOf(owner);
  r.rL.gain.cancelScheduledValues(t); r.rL.gain.setValueAtTime(tr?0:1,t);
  r.rT.gain.cancelScheduledValues(t); r.rT.gain.setValueAtTime(tr?1:0,t);
  if(v.shim){ v.shim.gain.cancelScheduledValues(t); v.shim.gain.setValueAtTime(tr?0:1,t); } }
/* Probe only: where a role's voices of this owner would go now ('live'|'track'), and the track head of a live chain key. */
const routeOfOwner=owner=> leadOutT && trackRouteOf(owner) ? 'track' : 'live';
function panSetAt(st,p,t){ if(!st) return; const [a,b]=panGains(p);   // на атаке — ставится в её миг (голос мог прийти от другой дорожки)
  st.l.gain.cancelScheduledValues(t); st.l.gain.setValueAtTime(a,t); st.r.gain.cancelScheduledValues(t); st.r.gain.setValueAtTime(b,t); }
function panGlide(st,p,t){ if(!st) return; const [a,b]=panGains(p);   // движение ручки — подъезд 20 мс, как у уровня (щелчка нет)
  st.l.gain.cancelScheduledValues(t); st.l.gain.setTargetAtTime(a,t,0.02); st.r.gain.cancelScheduledValues(t); st.r.gain.setTargetAtTime(b,t,0.02); }
/* Переставить панораму у ЗВУЧАЩИХ голосов — зеркало trackGainRetune: test(ключ) → панорама или null (не трогать); расписанное окном
   опережения на этих голосах снимается, иначе нота, уже поставленная на ближайшие ~300 мс, встала бы прежней панорамой. */
function trackPanRetune(test){ if(!AC) return; const t=AC.currentTime;
  const set=(v,k)=>{ const p=test(k); if(p==null||!v||!v.pan) return; panGlide(v.pan,p,t); };
  for(const k in leadHold) set(leadHold[k],k);
  for(const k in bassHold) set(bassHold[k],k);
  for(const k in chordHold) for(const v of chordHold[k]) set(v,k);
}
let dPan=null;   // ступень панорамы дрона (дрон один на движок; строит initAudio)
function dronePan(p,when){ if(!AC||!dPan) return; panGlide(dPan,p,when!=null?when:AC.currentTime); }
let hitOwnerKey=null;   // ключ владельца СЛЕДУЮЩЕГО удара (ставит ENG.drum перед drumHit; drumHit его читает и сбрасывает)
const hitOwner=k=>{ hitOwnerKey=k; };
/* ═══ MX1: МАСТЕР — уровень, показ лимитера, измеритель ═══
   Уровень мастера — та же кривая v² (config.volAmp) поверх ПРЕЖНЕГО мастер-гейна 0.8: 100 = как было (0.8), 0 = тишина. Измеритель —
   анализатор на выходе лимитера (то, что слышно); лимитер не трогаем (правило #4), только читаем его подавление (reduction, дБ). */
const MASTER_BASE=0.8;
let masterLvl=1, meterAn=null, meterBuf=null;
/* SND-F1 / SND-F1b: the master's dynamics (live only). mGlue — our compressor, OFF by default (Sound panel); mMake — the old browser
   limiter's makeup kept as a plain gain (+2.31 dB, MASTER_MAKEUP_DB); mLim — OUR limiter (DYN_MASTER), always on at the very end since
   SND-F1b, zero delay; outLast — the node that feeds the speakers (meter, clip tap, probe capture). The browser's DynamicsCompressorNode
   (`limiter`) is built only as the FALLBACK when the dynamics worklet does not load — it delays everything by 6.0 ms (measured). */
let mGlue=null, mMake=null, mLim=null, outLast=null, mGlueOn=false, mLimOn=true, limRed=0;
const DCN_DELAY_S=0.006;   // the browser compressor's lookahead, measured 288 frames at 48 kHz (SND-F1)
/* the master path's own delay (ms) — 0 with our limiter, the browser limiter's lookahead in the fallback (LAT1b's «master path») */
const masterDelayMs=()=> AC&&!offline&&!mLim&&limiter ? Math.round(DCN_DELAY_S*AC.sampleRate)/AC.sampleRate*1000 : 0;
const masterProbeNodes=()=>({ master, out:outLast });   // probes only: the live master's input and the node that feeds the speakers
const masterPathKinds=()=>{ const k=[]; if(mGlue) k.push('glue'); if(mMake) k.push('gain'); if(mLim) k.push('limit'); if(!mLim&&limiter) k.push('browser-compressor'); return k; };
const MASTER_GLUE_MAKEUP=DYN_GLUE.makeup;
function masterDynSet(which,on){ const n= which==='glue' ? mGlue : mLim; if(which==='glue') mGlueOn=!!on; else mLimOn=!!on;
  if(n&&AC){ const q=n.parameters.get('on'), t=AC.currentTime; q.cancelScheduledValues(t); q.setValueAtTime(on?1:0,t); } return masterDyn(); }
const masterDyn=()=>({ ready:!!(mGlue&&mLim), glue:mGlueOn, limiter:mLimOn, path:masterPathKinds(), delayMs:masterDelayMs() });
/* probe / golden renders only: an offline copy's master through one dynamics node (after offlineTapMaster), with a master gain */
function offlineMasterDyn(mode,set,gain){
  if(!AC||!offline||!master||!dynReady) return false;
  let n; try{ n=dynNode(E, mode, { ...set }, true); }catch(e){ return false; }
  try{ master.disconnect(); }catch(e){}
  if(gain!=null) master.gain.value=gain;
  master.connect(n); n.connect(AC.destination); return true;
}
function setMasterLevel(v){ masterLvl=Math.max(0,Math.min(1,+v||0)); if(AC&&master) master.gain.setTargetAtTime(MASTER_BASE*volAmp(masterLvl), AC.currentTime, 0.03); }
const masterLevel=()=>masterLvl;
/* ═══ ENG2 (RUN 4): ENGINE READOUTS — read only; nothing here changes the sound (plan §4.4 levels / load / voices) ═══ */
const hitT=[];   // live drum hits (context times), the last second
const dBof=x=> x>0 ? 20*Math.log10(x) : -Infinity;
function engVoices(){
  const now=AC?AC.currentTime:0; while(hitT.length && hitT[0]<now-1) hitT.shift();
  const on=a=>a.reduce((n,v)=>n+(v.owner?1:0),0);
  return { ld:{ built:lv.length, sounding:Object.keys(leadHold).length }, ch:{ built:cv.length, sounding:on(cv), strikes:ffLive.filter(x=>x.owner && x.t+FF_END>now).length },
           bs:{ built:bv.length, sounding:Object.keys(bassHold).length }, drums:{ hitsLastSec:hitT.filter(t=>t<=now).length } };
}
let roleAn=null, roleBuf=null;   // per-role analysers: built on the FIRST levels({roles:true}) call only (a read-only branch off each role bus)
function engLevels(opt={}){
  const m=masterMeter(); let rms=0;
  if(m && meterBuf){ for(let i=0;i<meterBuf.length;i++) rms+=meterBuf[i]*meterBuf[i]; rms=Math.sqrt(rms/meterBuf.length); }
  const out={ master: m ? { peakDb:dBof(m.peak), rmsDb:dBof(rms), reductionDb:m.reduction } : null };
  if(opt.roles && AC && !offline){
    if(!roleAn){ roleAn={}; for(const [k,b] of [['ld',leadSum],['ch',chordBus],['bs',bassBus],['dr',drumBus]]) if(b){ const a=AC.createAnalyser(); a.fftSize=1024; b.connect(a); roleAn[k]=a; } }
    out.roles={}; for(const k in roleAn){ const a=roleAn[k]; if(!roleBuf||roleBuf.length!==a.fftSize) roleBuf=new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(roleBuf); let pk=0; for(let i=0;i<roleBuf.length;i++){ const v=Math.abs(roleBuf[i]); if(v>pk) pk=v; } out.roles[k]=dBof(pk); } }
  return out;
}
/* the browser's own load counters, feature-detected — absent = undefined, never guessed: the playback statistics (dropouts) under either
   name the Web Audio drafts used — AudioContext.playbackStats (underrunEvents / underrunDuration / totalDuration) or the earlier
   AudioContext.playoutStats (fallbackFramesEvents / …) — and AudioContext.renderCapacity (average / peak load, underrun ratio; 1-s updates) */
let capLast=null, capOn=false;
function engLoad(){
  if(!AC || offline) return { playout:undefined, capacity:undefined };
  let playout;
  const n=x=>typeof x==='number'&&Number.isFinite(x)?x:undefined;
  try{ const pb=AC.playbackStats; if(pb && typeof pb==='object' && n(pb.underrunEvents)!==undefined) playout={ src:'playbackStats', events:pb.underrunEvents, droppedS:n(pb.underrunDuration), totalS:n(pb.totalDuration) }; }catch(e){}
  if(!playout) try{ const ps=AC.playoutStats; if(ps && typeof ps==='object' && n(ps.fallbackFramesEvents)!==undefined) playout={ src:'playoutStats', events:ps.fallbackFramesEvents, droppedS:n(ps.fallbackFramesDuration), totalS:n(ps.totalFramesDuration) }; }catch(e){}
  try{ const rc=AC.renderCapacity; if(rc && !capOn && typeof rc.start==='function'){ capOn=true;
    rc.addEventListener('update', e=>{ capLast={ avg:e.averageLoad, peak:e.peakLoad, underrun:e.underrunRatio }; }); rc.start({ updateInterval:1 }); } }catch(e){}
  return { playout, capacity: capLast ? { ...capLast } : undefined };
}
function masterMeter(){
  if(!AC||!meterAn) return null;
  if(!meterBuf||meterBuf.length!==meterAn.fftSize) meterBuf=new Float32Array(meterAn.fftSize);
  meterAn.getFloatTimeDomainData(meterBuf); let pk=0; for(let i=0;i<meterBuf.length;i++){ const a=Math.abs(meterBuf[i]); if(a>pk) pk=a; }
  return { peak:pk, reduction: mLim ? limRed : (limiter ? limiter.reduction : 0), gain: master ? master.gain.value : 0 };
}
/* ⚠️ verb/verbOut УДАЛЕНЫ (Пласт 3.5.2). Это были модульные псевдонимы входа и выхода ЕДИНСТВЕННОГО
   реверба — они пережили Пласт 1 только потому, что на общий вход приходили ДВА посыла (соло и
   аккорды). Теперь у каждой роли СВОЙ экземпляр со своими in/out, и «тот самый общий verb» перестал
   существовать как понятие: verb остался бы переменной, в которую пишут и которую никто не читает. */
/* banks — СКРАТЧ строителя банков (buildLeadBank's engines put собранный банк, buildLeadBank забирает).
   Раньше это был ПОСТОЯННЫЙ массив всех 23 банков соло-цепочки; теперь банк живёт в ГОЛОСЕ пула.
   bldHum — ConstantSource гуманизации ТОГО голоса, который сейчас строится (его цепляет mkOsc). */
let banks=[], bldHum=null, bldVib=null, bldShim=null, vibLFO, tremLFO,
    exprVibPitch, exprVibAmp, exprWah, exprSatSoftG, exprSatHardG, exprDlyWet;   // соло-ШИНА (expr* — узлы руки-ВЫРАЗИТЕЛЬНОСТИ (живость-вибрато / вау / текстура мягк.+жёстк. / пространство-делей), нейтральны по умолчанию)
/* ⚠️ vibGain / tremGain / tremDepth / dlyWet УДАЛЕНЫ (Пласт 3.7.1). Это были ОБЩИЕ узлы глубины на всю
   соло-шину, и ровно поэтому эффекты были НЕ ПЕР-СЛОЙНЫМИ: последний писавший (живая рука ИЛИ любая
   переигранная нота петли) задавал глубину всем сразу. Теперь ПРИЦЕПКА живёт В ГОЛОСЕ, а общими
   остались только ГЕНЕРАТОРЫ (vibLFO/tremLFO) — их делить и надо: один и тот же LFO, но СВОЯ глубина у
   каждой ноты. ⚠️ O-1: dlyBus/revBus (затворы соло-эффектов, куда цеплялись пер-нотные посылы) УДАЛЕНЫ —
   реверб и делей стоят в цепи ПОСЛЕ суммы, и посылать в них из голоса больше нечего.
   bldVib — пер-голосовой узел глубины вибрато ТОГО голоса, что сейчас строится (пара к bldHum). */
const LEAD_OUT_G=0.22;   // сухая громкость соло-шины; ЕДИНЫЙ ИСТОЧНИК — её же компенсирует пер-голосовой посыл в делей (см. applyVoiceFx)
/* ⚠️ revLead ЗДЕСЬ БОЛЬШЕ НЕТ (Пласт 3.5.1): узел посыла соло в реверб принадлежит теперь ЭКЗЕМПЛЯРУ
   эффекта (inst.send, см. makeReverbFx) — это тот же узел, та же роль, то же значение, но у него
   ровно один владелец. Модульная переменная означала бы «посыл может быть только один», а их теперь
   по одному на роль. Имя revLead в комментариях ниже сохранено как ИСТОРИЧЕСКОЕ. */
let chordBus;                                           // аккорды (Z-яркость — пер-голосовой фильтр fb в пуле, не на шине)
/* ⚠️ revCh ЗДЕСЬ БОЛЬШЕ НЕТ (Пласт 3.5.2), как раньше исчез revLead: фиксированный посыл аккордов в
   общий реверб стал ПЕРВОЙ ЗАПИСЬЮ ЦЕПИ РОЛИ, а его узел — собственностью экземпляра реверба
   аккордов (inst.send). Величина та же (0.12), звук тот же; разница в том, что её видно и можно
   править. Имя revCh в комментариях ниже сохранено как ИСТОРИЧЕСКОЕ. */
let backBus, dO1, dO2, dG, noiseBuf;                    // дрон (шина + расстроенная пара)
const cv=[]; const chordHold={};                        // пул аккордовых голосов
/* POOL1: each pool index's start-phase draw, taken at engine start in index order where the eager pool used to draw it (so a render's
   random stream — noise buffer, humanisation — is exactly as before); a voice beyond the table (offline growth) draws when built, as
   before. cvLive: this instance keeps spares built ahead (the live engine; the render copy builds on demand only). */
const cvSeed=[]; let cvLive=false, cvTopT=0, cvEagerDbg=false;
let cvNaiveDbg=false;   // probe CONTROLS only: eager = the old pool (all CHORD_POOL_N at start); naive = a lazy pool WITHOUT the per-index draws
const poolDbg=o=>{ if(o&&'eager' in o) cvEagerDbg=!!o.eager; if(o&&'naive' in o) cvNaiveDbg=!!o.naive; return { eager:cvEagerDbg, naive:cvNaiveDbg }; };
const cvSeedAt=i=> !cvNaiveDbg && i<cvSeed.length ? cvSeed[i] : rnd();
const bv=[]; const bassHold={}; let bassBus;             // пул баса: голоса по ключам владельцев (голос на ключ), ленивый до BASS_POOL_N (P1)
let drumBus;                                             // шина ударных

/* ═══ ИСТОЧНИК СЛУЧАЙНОСТИ — ОДНА ТОЧКА ПОДМЕНЫ (слайс F1 дуги «ЗАМОРОЗКА») ═══
   ⛳ ЗАЧЕМ. Движок ВАРЬИРУЕТ КАЖДУЮ АТАКУ: гуманизация высоты, −0..5% уровня, ±10% времени атаки —
   у аккорда, у соло и (время атаки) у баса, плюс буфер шума, набиваемый заново на каждый контекст.
   Живьём это и есть жизнь инструмента. Но ЗАМОРОЗКА — режим воспроизведения: дорожку размораживают,
   правят и морозят снова, и два рендера БЕЗ ЕДИНОЙ ПРАВКИ обязаны дать один и тот же буфер, иначе
   человек слышит «оно само поменялось». Подменяемый источник закрывает это одной строкой.
   ⛳ УМОЛЧАНИЕ — ПЛАТФОРМЕННЫЙ Math.random, ПОЭТОМУ ЖИВОЙ ПУТЬ БАЙТ-В-БАЙТ ПРЕЖНИЙ. Это правка
   движка, а не смена его поведения: `rnd` подменяет ТОЛЬКО тот, кто позвал setRnd, а зовёт его
   единственный вызывающий — render.js, и зовёт он его у СВОЕЙ копии модуля ('./audio.js?render').
   ⛔ Math.random ГЛОБАЛЬНО НЕ ПАТЧИТЬ. Соблазн («одна строка вместо восьми») смертелен: обе копии
   движка делят один глобальный объект, и посев для рендера сделал бы ДЕТЕРМИНИРОВАННОЙ ЖИВУЮ ИГРУ —
   гуманизация исчезла бы, инструмент зазвучал бы машинно, и услышали бы это сразу. Зонд рендера это
   специально проверяет (см. render.js, поле liveRandomIntact).
   ⚠️ ПРАВИЛО #11 НЕ ТРОНУТО: гуманизация по-прежнему НЕ ПОПАДАЕТ В СОБЫТИЕ. Семя — не событие, оно
   не едет в полезной нагрузке, не сериализуется вместе с ней и живёт в записи ЗАМОРОЖЕННОЙ ДОРОЖКИ
   (а сегодня, до неё, — только у зонда). Переигровка петли, как и прежде, даёт свежую вариацию.
   ⛔ НЕ ПРИНОСИТЬ СЮДА ВОРКЛЕТ: восьмое место случайности — шум возбуждения щипка в ks-worklet.js,
   и оно в ДРУГОМ JS-МИРЕ (AudioWorkletGlobalScope). Ни `rnd`, ни какая угодно подмена с главного
   потока туда не дотянется; семя пришлось бы передавать в processorOptions при постройке узла. В
   слайсе F1 оно ОСОЗНАННО ОСТАВЛЕНО НЕПОСЕЯННЫМ (щипок — короткий всплеск шума внутри струны), но
   зонд обязан об этом СКАЗАТЬ, а не умолчать. */
let rnd=Math.random;
/* Подменить источник (офлайн-рендер) или вернуть платформенный (fn пуст). Экспортируется, но у ЖИВОЙ
   копии модуля вызывающих нет и быть не должно. */
function setRnd(fn){ rnd = fn || Math.random; }

/* ═══ ОФЛАЙН-РАСКЛАДЧИК ГОЛОСОВ — слайс F2 дуги «ЗАМОРОЗКА» ═══
   ⛳ ЧТО ЛОМАЕТСЯ БЕЗ НЕГО, И ЭТО НЕ ДЕГРАДАЦИЯ, А ПОЛНЫЙ ОТКАЗ. Выдача голосов (leadAlloc/cvAlloc/
   bvAlloc) — автомат ПО СТЕННЫМ ЧАСАМ: «свободен ли голос ПРЯМО СЕЙЧАС». Офлайн-рендер расставляет
   тысячи нот ЗА ОДИН СИНХРОННЫЙ ПРОХОД, и каждое отпускание освобождает голос НЕМЕДЛЕННО — ещё до
   того, как расписана вторая нота. К моменту второй ноты пул выглядит пустым, и она берёт тот же
   нулевой голос. Итог: один осциллятор, перестроенный тысячу раз, и тишина на месте всех остальных
   нот. Бьёт одинаково по соло, аккордам и басу.
   ⚠️ ЭТО МЕСТО БЫЛО НАЗВАНО ЗАРАНЕЕ — см. шапку leadOn: «v.tOn становится БУДУЩИМ временем, если
   передать when… она по построению живёт по стенным часам — трогать её в этом слайсе ЗАПРЕЩЕНО,
   решается она в ОФЛАЙН-РАСКЛАДЧИКЕ». Вот он.

   ⛳ ЗАКОН ОФЛАЙНА: ГОЛОС ЗАНЯТ НЕ «ПОКА ЕГО НЕ ОТПУСТИЛИ», А ПОКА ОН ЗВУЧИТ.
   Каждый голос несёт `freeAt` — момент, РАНЬШЕ которого его переиспользовать нельзя. Атака ставит
   Infinity (занят до отпускания), отпускание — МИГ ОТПУСКАНИЯ (freeAfter).
   ⚠️ ИСПРАВЛЕНО: здесь стояло `t + rel·RELEASE_TAILS` (7 постоянных, «пока хвост не отзвучал») — и замороженная
   дорожка звучала НЕ как события: живьём отпущенный голос берёт следующая нота и снимает его хвост, офлайн хвост
   звенел под следующей нотой целиком, а разная гуманизация двух голосов давала биения — «фазер». Довод и цена — у
   freeAfter. Правило «занят, ПОКА ЗВУЧИТ» верно ровно до мига отпускания: дальше живой инструмент голос отдаёт.

   ⛳ КРАЖУ ОФЛАЙН НЕ ПЕРЕИЗОБРЕТАЕМ, А ОТМЕНЯЕМ. Потолки пула (LEAD_POOL_N/KS, CHORD_POOL_N,
   BASS_POOL_N) стоят потому, что столько тянет ТЕЛЕФОН на 60 кадрах в секунду. У рендера дедлайна
   нет, поэтому пул РАСТЁТ ПО ТРЕБОВАНИЮ: нет свободного к моменту t — заводим ещё один. Число
   голосов само сходится к РЕАЛЬНОЙ одновременности дорожки, и красть становится не у кого.
   ⛳ И ЭТО ВАЖНО МУЗЫКАЛЬНО, А НЕ ТОЛЬКО ТЕХНИЧЕСКИ: кража офлайн МОЛЧА ВЫБРОСИЛА БЫ НОТЫ, которые
   человек действительно сыграл. Замороженная дорожка обязана сохранить ВСЁ — и она законно может
   зазвучать ПОЛНЕЕ, чем звучало живьём, если живьём пул переполнялся. ⛔ Это правильно, а не баг:
   живьём терялось из-за железа, а не по замыслу.
   ⚠️ ПРЕДВЫЧИСЛЯТЬ ДЛИНЫ НОТ ОТДЕЛЬНЫМ ПРОХОДОМ НЕ ПОНАДОБИЛОСЬ, и это сознательно: рост по
   требованию даёт ТО ЖЕ число голосов (максимум одновременности), не зная будущего. ⛔ Поэтому здесь
   НЕТ и не должно появиться второй формулы спаривания leadOn↔leadOff: единственная живёт в
   songNotes (recorder.js), и когда F3 пойдёт по настоящим событиям, пары он возьмёт ТАМ.

   ⛳ ПРАВИЛО #3 ЦЕЛО: `freeAt` — ЧИСТАЯ БУХГАЛТЕРИЯ. Ни один осциллятор здесь не останавливается и не
   разбирается; голос по-прежнему только гасится гейтом и живёт до конца контекста. «Занят, пока не
   отзвучал» — это про то, кому его ВЫДАВАТЬ, а не про то, что с ним делают.
   ⛳ ПРАВИЛО #15 — ОПОРА ВСЕГО: явное время у leadOn/leadSet/leadOff/leadCancel/scheduleBend,
   chordOn/chordGlide/chordOff, bassOn/bassSet/bassOff, drumHit, droneOn/droneOff. ⚠️ НИ ОДНОЙ новой
   сигнатуры этот слайс не потребовал — всё уже принимает `when` со слайса S2.
   ⛔ ЖИВОЙ ПУТЬ НЕ ТРОНУТ: при offline=false каждая ветка ниже — прежняя, дословно (та же кража с
   предпочтением отпущенных, то же сродство к голосу с уже построенным банком, тот же 20мс-глайд при
   смене ноты под пальцем). Флаг ставит только render.js и только у СВОЕЙ копии модуля. */
let offline=false;
function setOffline(v){ offline=!!v; }
/* ⛳ МОМЕНТ, С КОТОРОГО ГОЛОС СНОВА СВОБОДЕН — МИГ ОТПУСКАНИЯ, КАК ЖИВЬЁМ (исправлено; живьём поле не читается вовсе).
   ⚠️ БЫЛО `t + tc·RELEASE_TAILS` (7 постоянных релиза, «пока хвост не отзвучал») — И ЗАМОРОЖЕННАЯ ДОРОЖКА ЗВУЧАЛА ФАЗЕРОМ.
   Живьём отпущенный голос свободен СРАЗУ (owner=null) и идёт ПЕРВЫМ кандидатом следующей ноте (leadAlloc/cvAlloc/bvAlloc:
   find(!owner)): новая атака на нём снимает хвост прежней ноты (cancelScheduledValues). Офлайн тот же голос держался
   занятым до конца хвоста, следующая нота брала НОВЫЙ голос, и хвост прежней звенел ПОД ней целиком. У каждого голоса своя
   гуманизация (±HUM_CENTS), поэтому хвост и новая нота той же высоты расходились на несколько центов и медленно БИЛИСЬ —
   крутящаяся «фазерная» окраска, с эффектами и без. Буфер обязан звучать как события, а не «полнее».
   ⛳ F2 ЦЕЛ В ГЛАВНОМ: ставим freeAt=Infinity на атаке и миг отпускания на релизе — нота, начатая РАНЬШЕ этого мига
   (перекрытие), голос не получит, то есть «всё в голос 0» не вернётся; ПОТОЛКА И КРАЖИ ЗВУЧАЩЕЙ НОТЫ ОФЛАЙН ПО-ПРЕЖНЕМУ НЕТ.
   Изменилось только одно: отпущенный голос отдаётся так же, как живьём, — вместе с обрывом его хвоста. */
const freeAfter=(t)=> t;
/* ВЫРАЗИТЕЛЬНОСТЬ — числа СТОРОНЫ ЗВУКА (канал→узел): здесь, а не в EXPR_CFG (gestures), потому что gestures
   импортирует audio — обратный импорт запрещён (цикл). EXPR_CFG держит признак→канал (мёртвые зоны/пружины);
   этот блок — канал→глубина/диапазон/добротность. Все ЭТИ числа тоже крутят НА СЛУХ. */
const EXPR_A={
  vibHz:5.2,                 // ЭНЕРГИЯ→ЖИВОСТЬ: частота шиммера (LFO)
  vibCents:2.5, vibAmp:0.05, // глубина шиммера ВЫСОТЫ (±центы, в пределах пары центов — живьём, в запись НЕ идёт) и АМПЛИТУДЫ (доля)
  wahLo:350, wahHi:2200, wahQ:5, wahBoost:14,   // НАТЯЖЕНИЕ→ВАУ: пик пробегает lo..hi (лог) с добротностью Q и подъёмом дБ
  soft:0.5, hard:1.0,        // РАЗМАХ→ТЕКСТУРА: уровни МЯГКОГО (тёплого) и ЖЁСТКОГО (грязного) искажений — меняется ХАРАКТЕР
  spaceMax:0.5,              // НАКЛОН→ПРОСТРАНСТВО: потолок посыла в делей
};
/* ═══ ОТЛАДКА НА СЛУХ — ПЕРЕКЛЮЧАТЕЛИ ТОЛЬКО ДЛЯ КОПИИ РЕНДЕРА (render.aud) ═══
   ⛔ У ЖИВОЙ копии вызывающих нет и быть не должно: setDbg зовёт ТОЛЬКО render.js и только у своей копии, и
   renderTrack ставит его на КАЖДЫЙ рендер (без опций — всё выключено, то есть заморозка звучит как прежде).
   Каждый переключатель меняет РОВНО ОДНО, чтобы по ушам было видно, что именно убирает дефект:
     noHum — гуманизация высоты ×0 (случайное число всё равно берётся: поток случайности не сдвигается,
             значит уровень и время атаки остаются теми же).
   ⛳ ИСТОРИЯ, И ПОЧЕМУ ИНСТРУМЕНТ ОСТАЁТСЯ: здесь жили ещё два переключателя — «частота свежей атаки сразу» (A) и
   «разбросанные фазы свежего голоса» (B). Две догадки по чтению кода не подтвердились; ухо с этим инструментом нашло
   обе настоящие причины «фазера» и «подъезда» замороженной дорожки, и A и B стали ПОВЕДЕНИЕМ (см. voiceStart и leadOn/
   bassOn). Инструмент — render.aud / render.live / render.stop (довод и строки консоли — в render.js и CLAUDE.md). */
const DBG={ noHum:false };   // LR1-уборка: fdnLive снят вместе с прежней проводкой петель реверба (одна проводка — с одним входом)
function setDbg(o){ DBG.noHum=!!(o&&o.noHum); }
/* ═══ ⛳ СБРОС КОПИИ РЕНДЕРА — КАЖДЫЙ РЕНДЕР НАЧИНАЕТСЯ С ЧИСТОЙ КОПИИ (починка после MX2) ═══
   Копия движка ('./audio.js?render') ОДНА на сессию, и всё модульное, что рендер ставит ей, иначе живёт до следующего рендера: функции
   «ключ → уровень / панорама» (MX1/MX2), раскладчик offline, семя rnd, отладка DBG, ключ владельца удара, величины соло-ноты в pendFx,
   флаг первого осциллятора голоса. initAudio чистит ПУЛЫ и ТАБЛИЦЫ эффектов, но не эти переключатели — их ставит вызывающий.
   ⛳ ПОЭТОМУ render.js зовёт renderReset В НАЧАЛЕ И В КОНЦЕ (finally) КАЖДОГО рендера — и renderTrack, и прямого renderOnce (зонды,
   reuseCheck): рендер видит центр, единицу, живой раскладчик, Math.random и нейтральную ноту, если сам не поставил иного, а между
   рендерами копия не держит ничего чужого (это сверяет страж P.all — renderStateOf ниже).
   ⛔ ЖИВАЯ КОПИЯ ЭТО НЕ ЗОВЁТ НИКОГДА: у неё функции уровня и панорамы ставит recorder при загрузке, и сброс вернул бы все дорожки в центр
   и на единицу. Сброс — только render.js, только своей копии. */
function renderReset(){
  timbreSync();   // TIM3d: the render copy learns the records added since its start (a song's own timbres)
  trackGainOf=()=>1; trackPanOf=()=>0; trackRouteOf=()=>false; hitOwnerKey=null; hitBus=null; voiceFirstOsc=true;   // AF5: the render copy never splits
  pendFx.vib=0; pendFx.drv=0; pendFx.trm=0; pendFx.bri=null; pendSymp=null; dView=null; dUp=false;   // TF2: the note's key and the drone's view
  DBG.noHum=false; offline=false; rnd=Math.random;
}
/* Снимок тех же переключателей — для стража P.all (между строками копия обязана быть в сбросе). Только чтение. */
const renderStateOf=()=>({ offline, noHum:DBG.noHum, seeded: rnd!==Math.random, gain:ownerGain('loop:0'), pan:ownerPan('loop:0'),
  hitOwner:hitOwnerKey, route:routeOfOwner('loop:0'), pend:[pendFx.vib,pendFx.drv,pendFx.trm,pendFx.bri].join(','), pool:[cvEagerDbg,cvNaiveDbg].join(',') });
/* ═══ ⛳ ФАЗЫ СВЕЖЕГО ГОЛОСА — РАЗБРОСАНЫ СТАРТОМ, КАК У ДАВНО ИДУЩЕГО (B, подтверждено на слух) ═══
   ⚠️ ДЕФЕКТ: осцилляторы голоса стартовали ОДНОВРЕМЕННО, то есть В ОДНОЙ ФАЗЕ. У SuperSaw пять пил, расстроенных почти
   равным шагом (−12/−6/0/+6/+12 центов), и из общей фазы они раз за разом снова СХОДЯТСЯ — ровный периодический
   «пролёт», который ухо читает как ФАЗЕР. Живой голос строится один раз и потом идёт всю сессию (крохотная
   неравномерность шага в герцах за минуты рассыпает фазы), а в рендере ВСЕ голоса строятся на нулевой секунде — и
   замороженная дорожка «фазерила» постоянно.
   ⛳ ЛЕЧЕНИЕ — РАЗНЫЙ МИГ СТАРТА, тот самый способ, которым отладочный переключатель подтвердил причину на слух: первый
   осциллятор голоса стартует сразу, остальные — каждый со своей задержкой МЕНЬШЕ ОДНОГО ПЕРИОДА частоты, на которой он
   построен (1/f). Разный старт — это разная фаза, а ФОРМА ВОЛНЫ У КАЖДОГО — ВСТРОЕННАЯ, НЕТРОНУТАЯ.
   ⛔ РЕШЕНИЕ ПОЛЬЗОВАТЕЛЯ: тембры не трогаем ради заморозки — никаких своих волн вместо встроенных (была попытка с
   повёрнутой PeriodicWave — снята). Параметры звука остаются прежними.
   ⛳ РЕНДЕР — ТОЧНО: голоса строятся во время раскладки, когда офлайн-часы стоят на нуле, а первая нота лежит не раньше
   PRE_SEC (0.5 с). Все осцилляторы голоса успевают стартовать ЗАДОЛГО ДО неё, идут на частоте постройки и к атаке имеют
   равномерно разбросанные фазы; сама атака не тронута. Задержки — из rnd(), то есть ОТ СЕМЕНИ рендера (setRnd):
   перезаморозка повторяет те же фазы.
   ⚠️ ЖИВЬЁМ — ЧЕСТНО И НЕ ТОЧНО: живой голос строится В МИГ своей первой ноты, запустить его в прошлом нельзя. Поэтому на
   ПЕРВОЙ ноте нового голоса (один раз за сессию на голос — дальше голос переиспользуется и идёт непрерывно) остальные
   осцилляторы вступают в пределах одного периода частоты постройки: у соло ≤4.5 мс (220 Гц), у модулятора FM — ≤1.3 мс, у
   аккордов и баса ≤2.3 мс (440 Гц, частота узла по умолчанию). Первый звучит с атаки, огибающая в эти миллисекунды ещё
   нарастает (у SuperSaw атака 12 мс) — вступление остальных тонет в ней. И фаза там разбрасывается на частоте НОТЫ, а не
   постройки: нота выше частоты постройки получает разброс ≥ целого периода (как в рендере), нота ниже — частичный.
   Случайность живьём — Math.random, как у всей гуманизации.
   ⛔ Правило #3 цело: старт ОДИН, при постройке голоса; ничего не останавливается и не пересоздаётся.
   ⚠️ Слышно это там, где у голоса ТРИ и больше расстроенных осциллятора (SuperSaw — 5, Пад — 3): у двух начальная фаза
   лишь сдвигает момент пика биений. Разброс ставится всем голосам единообразно — он дешёвый и ничего не портит.
   ⛔ ИСПРАВЛЕНО: «ничего не портит» НЕВЕРНО для пары на ОДНОЙ частоте без расстройки — см. voiceStartPair ниже (голоса аккорда и баса). */
let voiceFirstOsc=true;
/* ОБХОД СТАДИИ ВЫРАЗИТЕЛЬНОСТИ — сумма голосов соло идёт прямо в голову цепи (leadOut), мимо шиммера/шейперов/вау.
   Концы кладёт initAudio каждой постройкой. Зовёт ТОЛЬКО render.aud на своей копии. */
let dbgExprIO=null;
function dbgExprBypass(){ if(!dbgExprIO) return false; const {leadSum:s, exprGain:g, leadOut:o}=dbgExprIO;
  try{ s.disconnect(g); }catch(e){} s.connect(o); return true; }
/* Величина яркости ноты/удара из её карты (0..1) либо undefined — «не задана»: звук как сегодня. */
const fxBriOf=m=>{ const v=m&&m['bright:amt']; return v==null ? undefined : v; };
/* Поставить яркость голоса: на АТАКЕ (fresh) — точно в миг t; при ВЕДЕНИИ — подъездом. Переключение «в пути / вне пути»
   (w) — только когда оно правда сменилось; при ведении — подъездом τ 10 мс и ТОЧНЫМ значением через 0.2 с (экспонента
   нуля не достигает, а «не задано» обязано быть ровно нулём). cancelScheduledValues снимает недошедший прежний переход. */
function briStage(st,role,bri,t,fresh){
  const w = (bri!=null && bri<BRI_OPEN) ? 1 : 0;
  if(fresh || st.w!==w){
    for(const [p,x] of [[st.wet.gain,w],[st.neg.gain,-w]]){
      p.cancelScheduledValues(t);
      if(fresh) p.setValueAtTime(x,t);
      else { p.setTargetAtTime(x,t,0.01); p.setValueAtTime(x,t+0.2); }
    }
    st.w=w;
  }
  if(w){ const hz=briHzOf(role,bri);
    if(fresh){ st.lp.frequency.cancelScheduledValues(t); st.lp.frequency.setValueAtTime(hz,t); }
    else st.lp.frequency.setTargetAtTime(hz,t,0.05); }
}
/* Умолчание параметра ДЛЯ ВЛАДЕЛЬЦА ЦЕПИ: defBy — объявленная таблица «роль → величина»; ключ сравниваем на РАВЕНСТВО
   (ключ непрозрачен, O-0). Нет таблицы или роли в ней — общий def, то есть для всех прежних эффектов ничего не меняется. */
function fxDefFor(sp,key){ if(sp.defBy&&key!=null) for(const r in sp.defBy) if(chainKeyOf(r)===key||trackChainKeyOf(chainKeyOf(r))===key) return sp.defBy[r]; return sp.def; }   // AF5: a track chain takes its role's default
/* ЧИТАТЕЛЬ СКОЛЬЖЕНИЯ: величина из КАРТЫ ЭФФЕКТОВ ноты → секунды (постоянная времени), либо undefined — «не задано»,
   и тогда движок берёт умолчание роли. Шкала — ТОЛЬКО через fxDenormOf (второй копии диапазона нет). */
const FX_GLIDE='glide', FX_GLIDE_KEY=FX_GLIDE+':time';
function fxGlideOf(m){ const v=m&&m[FX_GLIDE_KEY]; return v==null ? undefined : fxDenormOf(FX_GLIDE,'time',v); }
const forestIRs={};
function forestData(rate, sec=FOREST.sec){
  const k0=rate+'/'+sec;
  if(!forestIRs[k0]){ const ch=forestIR(rate, sec), k=irNormScale(ch, rate); forestIRs[k0]=ch.map(d=>d.map(x=>x*k)); }
  return forestIRs[k0];
}
let dynReady=false, dynWarned=false;
const FX_FACTORY={
  [FX_VOL]:{ id:FX_VOL, labelKey:'fx.vol', kind:'voice', params:VOL_PARAMS, make:makeVolFx, roles:['ld','ch','bs','dr'], perm:true },   // VOL-0: ГРОМКОСТЬ — постоянная голосовая запись каждой цепи (см. VOL_PARAMS). Первой: так читается «в ноте» сверху вниз
  reverb:{ id:'reverb', labelKey:'fx.reverb', kind:'bus',   params:REV_PARAMS,    make:makeReverbFx },
  bright:{ id:'bright', labelKey:'fx.bright', kind:'voice', params:BRIGHT_PARAMS, make:makeBrightFx, roles:['ch','ld','bs','dr'] },   // яркость — ВСЕМ ролям: у аккордов фильтр fb голоса, у прочих — ступень яркости (makeBriStage / удар)
  glide: { id:'glide',  labelKey:'fx.glide',  kind:'voice', params:GLIDE_PARAMS,  make:makeGlideFx,  roles:['ld','bs'] },   // V4: мелодические роли
  dly:   { id:'dly',    labelKey:'fx.dly',    kind:'bus',   params:DLY_PARAMS,    make:makeDelayFx },
  trmMix:{ id:'trmMix', labelKey:'fx.trmMix', kind:'insert',params:TRMIX_PARAMS,  make:makeTremMixFx },
  forest:{ id:'forest', labelKey:'fx.forest', kind:'bus',   params:FOREST_PARAMS, make:makeForestFx },   // SND-F1: «Night forest» room
  glue:  { id:'glue',   labelKey:'fx.glue',   kind:'insert',params:GLUE_PARAMS,   make:makeGlueFx, cat:'dyn' },   // SND-F1: category «Dynamics»   // в.2: «Тремоло (микс)». Свой id, а не 'trm': тот занят пер-голосовым «Тремоло (нота)», и оба живут рядом   // в.1: fxId оставлен прежним 'dly' — это СТАБИЛЬНЫЙ идентификатор (цепь, метаданные показа, словарь), переименовывать его ради красоты незачем
};
/* ⛳ ПОСТОЯННАЯ ЗАПИСЬ ЦЕПИ (VOL-0) — ОДИН предикат на все места, где запись цепи ПОКАЗЫВАЮТ или ПРЕДЛАГАЮТ: столбики и их
   габарит (draw), панель — строки, подсказка, карта общих адресов, списки «добавить» (ui), голосовой список дорожки
   (fxVoiceIdsFor), адреса полосы, цепь дорожки в редакторе и сводка захвата (recorder). Размножить проверку по месту
   значило бы однажды забыть одно из них — и громкость всплыла бы там, где её не ждут. Звук и запись фильтр НЕ
   трогают: захват по-прежнему идёт по объявлениям (правило #29).
   ⛳ VOL-2: в панели строку громкость ТЕПЕРЬ ПОЛУЧАЕТ (первой в «в ноте», без ✕), и в карте общих адресов участвует;
   столбик — только на пальце (draw.fxBarHidden). Предикат по-прежнему держит: списки «добавить», редактор и сводку захвата. */
const fxPerm=id=> !!(FX_FACTORY[id] && FX_FACTORY[id].perm);
/* ХОД РУКИ ПО ПАРАМЕТРУ — [lo, hi] из объявления (поле handRange), иначе полный [0, 1]. Читается по СПЕЦИФИКАЦИИ, а не
   по экземпляру: жесту нужен ход и тогда, когда экземпляр ещё не построен. Читает громкость (gestures.noteVolOf); с VOL-2b
   её ход полный — поле снято, и функция отдаёт [0,1] (в VOL-1/VOL-2 было [0.2,1] — прежние 0.2+0.8·xn). */
const fxHandRange=(fxId,pKey)=>{ const f=FX_FACTORY[fxId], sp=f&&f.params.find(q=>q.key===pKey);
  return (sp&&sp.handRange) || [0,1]; };
/* ЯРКОСТЬ АККОРДОВ, КАК ЕЁ ЧИТАЕТ ГОЛОС. Отдаёт величину в форме, которую ждёт chordOn/chordGlide —
   ГЛУБИНУ (0 ярко .. 1 глухо), потому что briToHz принимает именно её; параметр же хранит ЯРКОСТЬ,
   отсюда 1−cur.
   ⚠️ НЕТ ЭФФЕКТА В ЦЕПИ РОЛИ → null, И ЭТО НЕ «нейтраль по умолчанию», а СОХРАНЕНИЕ СЕГОДНЯШНЕГО
   ПОВЕДЕНИЯ: chordOn на null открывает фильтр, chordGlide на null его НЕ ТРОГАЕТ.
   ⛔ ЗДЕСЬ НЕЛЬЗЯ КОПИРОВАТЬ ПРАВИЛО СОЛО «нет карты → взять текущие значения цепи». У соло событий без
   карты практически нет (аранжировка соло-нот не строит). У АККОРДОВ наоборот: события аранжировки и
   джема многочисленны и яркости НИКОГДА не несли — «взять текущее» означало бы, что каждый джемовый
   аккорд зазвучит с той яркостью, на которой человек в тот момент держал руку. Это изменило бы звук
   всех подложек разом. Отсутствие величины у аккордов значит «не задана», а не «возьми живую». */
/* ⚠️ ЭКЗЕМПЛЯР БЕРЁМ ЧЕРЕЗ fxInstance (он СОЗДАЁТ при первом обращении), а НЕ голым поиском в FX_INST.
   Голый поиск давал дыру: экземпляр рождается только когда кто-то спросил дескрипторы, а спрашивает их
   ДРАЙВЕР ГЛУБИНЫ — то есть лишь при адресе play:z. Поставь человек яркость на ФИКСИРОВАННОЕ значение
   или на горизонталь, и экземпляра бы не существовало: меню показывало бы величину, а звучала бы
   нейтраль. Голосовой экземпляр не строит ни одного узла, так что создавать его здесь ничего не стоит. */
/* ⚠️ КЛЮЧ ЦЕПИ — АРГУМЕНТОМ (слайс O-0). Прежде здесь стоял литерал 'ch' дважды. Яркость читает ГОЛОС
   аккорда, и какой цепи он принадлежит, знает ЗОВУЩИЙ (gestures — из зоны щипнувшей руки), а не эта
   функция: когда цепь переедет к тембру, менять придётся вызов, а не тело. */
function fxChordBri(key){
  if(!fxChainOf(key).some(e=>e&&e.fxId==='bright')) return null;   // яркости нет в цепи → «не задана» (см. довод выше), а не 0
  const inst=fxInstance(key,'bright');
  return inst ? 1-inst.params[0].cur : null;
}
/* ⚠️ РЕЕСТР КЛЮЧУЕТСЯ КЛЮЧОМ ВЛАДЕЛЬЦА ЦЕПИ (слайс O-0), а не ролью: FX_INST[chainKey][fxId]. Сегодня
   ключей ровно четыре и все ролевые, поэтому реестр устроен как был; когда рядом встанут цепи тембра,
   их экземпляры лягут СЮДА ЖЕ, не столкнувшись с ролевыми — за это и отвечает вид в значении ключа. */
const FX_INST={};
/* ЖИВОЙ ЭКЗЕМПЛЯР ЭФФЕКТА ВЛАДЕЛЬЦА — строится ПРИ ПЕРВОМ ОБРАЩЕНИИ и КЭШИРУЕТСЯ.
   ⚠️ ЭКЗЕМПЛЯРЫ НЕ РАЗБИРАЕМ, когда эффект убирают из цепи, — вместо этого ui/жест уводят подмес в 0.
   Две причины, и обе несущие: (1) снос узлов посреди хвоста ОБРЕЗАЛ БЫ ЕГО СЛЫШНО, а хвост — это и
   есть то, за чем идут к ревербу; (2) у FDN НЕТ осцилляторов (только задержки, фильтры и гейны),
   поэтому простаивающий экземпляр стоит лишь линейной обработки — это ровно дух правила #3 («пул
   заводится один раз и живёт до конца контекста»), а не исключение из него.
   Плата названа честно: раз применив реверб на роли, вы держите его сеть до конца сессии. */
/* ═══ ЛЕНИВАЯ ПРИЦЕПКА ЦЕПИ К ШИНЕ РОЛИ (Пласты 3.5.3/3.5.4: бас и ударные) ═══
   У баса и ударных цепь по умолчанию ПУСТА, и в этом вся разница с аккордами: у аккордов реверб есть
   «из коробки», поэтому его экземпляр строится и цепляется ПРЯМО В initAudio, вместе с остальным
   графом. У пустой цепи цеплять нечего — и строить тоже: пока человек не добавит эффект, шина баса и
   шина ударных идут в мастер СУХИМИ, ровно как всегда, и ни одного лишнего узла не существует.
   Поэтому прицепка едет ЗА экземпляром: шину роли запоминаем, а соединяем в тот момент, когда
   экземпляр реально появился (fxInstance ниже).
   ⚠️ O-1: СОЛО РЕГИСТРИРУЕТСЯ ТАК ЖЕ, КАК ВСЕ. Прежде здесь стоял ⛔-запрет: у соло посылы были
   пер-голосовыми, и регистрация шины дала бы ДВОЙНОЙ эффект (leadOut в send ВДОБАВОК к посылам голосов).
   Пер-нотных посылов больше нет — запрет вместе с ними. Четыре владельца, один закон, одна регистрация
   (fxChainIO). ⛔ И ни у кого не должно остаться прямой связи «голова → мастер»: она увела бы сухое в
   обход цепи, то есть вернула бы параллельные посылы. */
/* ═══ ПОСЛЕДОВАТЕЛЬНАЯ ЦЕПЬ (слайс O-1) — ОДНА ПЕРЕСБОРКА ВМЕСТО ТРЁХ ПРИЦЕПОК ═══
   ⛳ ЧТО ИЗМЕНИЛОСЬ ПО СУЩЕСТВУ. Прежде было ТРИ рода крепления (посыл / врезка / без узлов), и два
   первых давали РАЗНУЮ топологию: посыл шёл ПАРАЛЛЕЛЬНО сухому ходу, врезка — В него. Оттого порядок
   эффектов был неслышен для посылов и следовал ПОРЯДКУ ПОСТРОЙКИ для врезок (этот долг здесь и помечался
   как «придёт вторая врезка — порядок обязан пойти за цепью»). Теперь родов ДВА, и они отвечают на
   РАЗНЫЕ вопросы, а не на один:
     kind:'voice' — узлов НЕТ вовсе (яркость). В сигнальный путь не входит: величину читает голос на атаке.
     всё прочее   — ВРЕЗКА с внутренним балансом сухо/влажно (реверб, делей, тремоло). Входит в путь.
   ⛳ ПУТЬ СОБИРАЕТСЯ ЦЕЛИКОМ, ОДНОЙ ФУНКЦИЕЙ, ПО ПОРЯДКУ ЦЕПИ:
        голова → эффект₁ → эффект₂ → … → хвост → мастер
   и эта же функция закрывает ДАВНЮЮ ДЫРУ: прежде `inst.out.connect(master)` жил ВНУТРИ ветки посыла,
   поэтому владелец без шины (соло) НИКОГДА не подключил бы лениво построенный шинный эффект к мастеру —
   спасало лишь то, что оба соло-эффекта строились вручную в initAudio. Маршрут в мастер больше не
   побочный эффект прицепки: он есть ВСЕГДА и принадлежит ХВОСТУ.
   ДВЕ ТОЧКИ НА ВЛАДЕЛЬЦА, и теперь они обе — концы одного отрезка:
     FX_CHAIN_HEAD — где появляется СУММА голосов владельца (chordBus/bassBus/drumBus, у соло leadOut).
     FX_CHAIN_OUT  — ПОСТОЯННЫЙ узел, соединённый с мастером раз и навсегда. Он же — точка ПРОВАЛА при
                     пересборке (см. fxRespliceSmooth): гасить надо ПОСЛЕ всех сетей, иначе уже текущий
                     хвост реверба щёлкнет на разрыве.
   ⛔ ПРАВИЛО #3 ЦЕЛО: пересборка трогает только СВЯЗИ. Ни один экземпляр не разбирается и не создаётся
   заново — снятый из цепи остаётся в графе и доигрывает хвост. */
const FX_CHAIN_HEAD={};
const FX_CHAIN_OUT={};
/* ⚠️ СВЯЗИ, СДЕЛАННЫЕ ПОСЛЕДНЕЙ ПЕРЕСБОРКОЙ, — ПОИМЁННО. ⛔ Голый node.disconnect() здесь НЕЛЬЗЯ: у
   leadOut есть ЧУЖАЯ связь — линия делея руки-выразительности (initAudio), и слепой разрыв убил бы её
   молча. Снимаем ровно то, что сами и поставили. */
const FX_CHAIN_LINKS={};
function fxLink(key,a,b){ a.connect(b); (FX_CHAIN_LINKS[key]||(FX_CHAIN_LINKS[key]=[])).push([a,b]); }
function fxUnlink(key){ const L=FX_CHAIN_LINKS[key]; if(!L) return;
  for(const [a,b] of L){ try{ a.disconnect(b); }catch(e){} }
  L.length=0; }
/* ЭФФЕКТ УЧАСТВУЕТ В СИГНАЛЬНОМ ПУТИ, только если у него ЕСТЬ КОНЦЫ. Один предикат на все места —
   так «голосовой» эффект (яркость) отсеивается сам собой, без перечисления родов. */
const fxInPath=inst=> !!(inst && inst.in && inst.out);
/* ═══ ПУТЬ ПЕРЕИГРОВКИ (слайс O-3) ═══
   ⛳ ЧЬИМ СОСТАВОМ ЗВУЧИТ ЦЕПЬ, ПОКА ИДЁТ ВОСПРОИЗВЕДЕНИЕ. Запись помнит не только ВЕЛИЧИНЫ, но и
   СОСТАВ с ПОРЯДКОМ (O-2), а порядок с O-1 слышен. Гони мы записанные величины через ЖИВУЮ цепь — вышли
   бы верные числа в неверной цепи: не тот порядок, лишний эффект, недостающий эффект.
   ⛔ ЖИВУЮ ЦЕПЬ (state.fxChains) ПРИ ЭТОМ НЕ ТРОГАЕМ ВОВСЕ. Переигровка — это ЗВУЧАНИЕ, а не правка
   настроек: перепиши она цепь человека, его раскладка по пальцам и его состав пропали бы после первого
   же ▶. Поэтому здесь ОТДЕЛЬНЫЙ список id, который читает fxPathOf ВМЕСТО цепи, пока он задан. Снял
   (null) — цепь снова своя, и ничего восстанавливать не надо: её никто не менял.
   ⚠️ ЗАТВОРЫ ВЕДЁМ ЗДЕСЬ ЖЕ. Эффект, снятый человеком из цепи, остаётся в графе с затвором 0 (хвост
   дозвучивает, 3.5.1). Если запись его ИСПОЛЬЗОВАЛА, путь его включает — значит затвор надо открыть, иначе
   величины поедут в заглушённую сеть и не прозвучат. И наоборот: то, что в пути переигровки не участвует,
   закрываем — но именно ЗАТВОРОМ, а не разрывом, чтобы хвост дозвучил (тот же закон, что у fxSetActive). */
const FX_PLAY_PATH={};
const fxIdsOfChain=key=>fxChainOf(key).map(e=>e.fxId);
/* Затвор экземпляра без создания: у голосового его нет, у вставки «выключено» — это тождество, а не ноль
   (иначе заглушили бы всю роль). Одна форма на оба вида, ровно как в fxSetActive. */
function fxGate(key,fxId,on){
  const inst=FX_INST[key] && FX_INST[key][fxId]; if(!inst||!AC) return;
  if(inst.kind==='voice') return;
  if(inst.kind==='insert'){ inst.setActive(on); if(on) for(const pp of inst.params) pp.setNorm(pp.cur); return; }
  /* ОФЛАЙН — СРАЗУ, без рампы: путь рендера ставится на t=0, до первого сэмпла, и плавности там беречь нечего. Рампа τ 0.08 к
     первой ноте (PRE_SEC 0.5 с) оставила бы затвор на ~−54 дБ, а не на нуле: «отсутствующий эффект» обязан быть ТИШИНОЙ. */
  const t=AC.currentTime;
  if(offline){ inst.gate.gain.cancelScheduledValues(t); inst.gate.gain.setValueAtTime(on?1:0,t); }
  else inst.gate.gain.setTargetAtTime(on?1:0, t, 0.08);
  if(on) for(const pp of inst.params) pp.setNorm(pp.cur);
}
/* ids — состав переигровки, null — вернуть живую цепь. Возвращает true, если путь ДЕЙСТВИТЕЛЬНО сменился
   (вызывающий по этому знает, была ли пересборка, то есть был ли провал). */
function fxPlayPath(key,ids,hard){   // AF5: hard — rewire without the dip (a fresh fold at transport start: nothing flows yet, a dip would swallow the first attack)
  const was=FX_PLAY_PATH[key]||null;
  /* ⚠️ СРАВНИВАЕМ СПИСКИ, А НЕ СТРОКИ: «нет пути» (null) и «пустой путь» ([]) — РАЗНЫЕ состояния
     (живая цепь против пустой цепи записи), и склейка в строку их бы слила. */
  const same = (!was&&!ids) || (!!was&&!!ids&&was.length===ids.length&&was.every((x,i)=>x===ids[i]));
  if(same) return false;
  /* ⛳ ОДИН И ТОТ ЖЕ ПРОВОДИМЫЙ СОСТАВ — ГРАФ НЕ ТРОГАЕМ (слайс AUTO-PROBE). «Нет пути» (живая цепь) и путь записи, РАВНЫЙ живой цепи,
     дают fxPathOf один и тот же список — тот же граф и те же затворы. Прежде такая смена всё равно звала fxRespliceSmooth: выход роли
     уводился в ноль, пересборка ждала стенного таймера и поднимала обратно — роль молчала ≈ 40–100 мс. Переигровка ставит состав взятого
     на его ПЕРВОЙ доле, и провал проглатывал атаку первой ноты дорожки (раннер: аккорд с атакой ровно на доле звучал на 83–95 мс позже,
     в журнале провалов — провал на той же доле, оба списка [vol, reverb, bright]). Сравниваем ДЕЙСТВУЮЩИЕ списки; равны — запоминаем путь
     (null и [] по-прежнему разные состояния) и выходим без пересборки — закрыв построенное вне состава (затвор — не пересборка). */
  const effB=was||fxIdsOfChain(key), effA=ids||fxIdsOfChain(key);
  const sameWired= effB.length===effA.length && effB.every((x,i)=>x===effA[i]);
  if(ids) FX_PLAY_PATH[key]=ids.slice(); else delete FX_PLAY_PATH[key];
  if(sameWired){   // ⚠️ затворы — всё равно: закрыть построенное вне состава (довод ниже — копия рендера строит часть эффектов ОТКРЫТЫМИ); живьём — то же значение
    const keep=new Set(effA); for(const id in (FX_INST[key]||{})) if(!keep.has(id)) fxGate(key,id,false);
    return false; }
  const before=new Set(effB);
  const after=new Set(FX_PLAY_PATH[key]||fxIdsOfChain(key));
  for(const id of after) if(!before.has(id)) fxGate(key,id,true);    // запись им пользовалась — открыть
  /* ⛳ ЗАКРЫТЬ — ВСЁ ПОСТРОЕННОЕ, ЧЕГО НЕТ В НОВОМ СОСТАВЕ, а не только «было в прежнем и пропало».
     ⚠️ БАГ, КОТОРЫЙ ЭТО ЧИНИТ: замороженная дорожка звучала С ЭФФЕКТАМИ, КОТОРЫХ ПРИ ЕЁ ЗАПИСИ НЕ БЫЛО. Прежде здесь стоял
     цикл по `before` — а `before` у копии рендера это ЖИВАЯ цепь (state общий на обе копии движка). initAudio строит реверб и
     делей соло и реверб аккордов СРАЗУ, с открытым затвором; живьём снятый эффект закрывает fxSetActive, а в свежей копии их не
     закрывал никто. Эффект, которого нет НИ в захвате, НИ в живой цепи, в `before` не попадал — и звучал в рендере на
     умолчаниях (fxPathOf ставит в путь ВСЁ построенное). Скрыто было потому, что в цепи по умолчанию оба эффекта есть.
     Теперь закон — «после вызова открыт ровно состав `after`», и он не зависит от того, чем была живая цепь. Живьём ничего
     не меняется: построенное вне цепи и так уже закрыто (fxSetActive), повторное закрытие — то же значение. */
  for(const id in (FX_INST[key]||{})) if(!after.has(id)) fxGate(key,id,false);   // в новом составе его нет — закрыть, хвост дозвучит
  if(hard) fxResplice(key); else fxRespliceSmooth(key);
  return true;
}
/* ═══ ⛳ ПУТЬ РЕНДЕРА — СОСТАВ ПО ЗАПИСАННЫМ ВРЕМЕНАМ (только офлайн-копия) ═══
   ⚠️ ДЫРА, КОТОРУЮ ЭТО ЗАКРЫВАЕТ: рендер ставил лишь состав НА СТАРТЕ дорожки. Эффект, снятый посреди взятого, звучал в
   замороженной дорожке до конца; добавленный посреди строился ещё при раскладке (первой же его точкой величины) и звучал
   С САМОГО НАЧАЛА на умолчаниях. Переигровка же меняет состав В СВОЙ МИГ (fxPlayDrive → fxPlayPath).
   ⛳ ДВЕ ВЕЩИ ПОЧЕМУ-ТО БЫЛИ ОДНОЙ, И ИХ ПРИШЛОСЬ РАЗВЕСТИ: ПОРЯДОК ПРОВОДКИ и ЧТО ОТКРЫТО. Связи графа во времени не
   расписываются — провода рендера кладутся ОДИН раз, до первого сэмпла; а затворы — AudioParam, их можно переключить В
   ЛЮБУЮ записанную долю. Поэтому рендер проводит СРАЗУ ВСЕ эффекты, когда-либо бывшие в цепи дорожки, в одном общем порядке
   (его сводит render.js из всех составов), а открыт в каждый миг ровно тот состав, что был записан к нему. Закрытый
   эффект — ТОЖДЕСТВО (сухая ветвь — единичный гейн, вставка — глубина 0), поэтому лишний провод в пути ничего не звучит.
   order — порядок проводки, openIds — открыто на старте. Живой копии вызывающих нет (гейт offline). */
function fxRenderPath(key,order,openIds){
  if(!AC||!offline) return;
  FX_PLAY_PATH[key]=order.slice();                      // ⛔ после этого fxPathOf этого ключа ЖИВУЮ цепь не читает никогда
  const open=new Set(openIds);
  for(const id in (FX_INST[key]||{})) fxGateAt(key,id,open.has(id),AC.currentTime);
  fxResplice(key);
}
/* Затвор В ЯВНЫЙ МИГ (правило #15). Офлайн — СРАЗУ (без рампы): открытый к доле эффект обязан звучать с неё, закрытый —
   молчать с неё. Величины НЕ переприменяет (в отличие от fxGate): рендер ставит их сам, каждую в свою долю, и cur здесь мог
   бы оказаться величиной из будущего. Вставка — своим setActive со временем (глубина идёт своей постоянной 0.05, как живьём). */
function fxGateAt(key,fxId,on,when){
  const inst=FX_INST[key] && FX_INST[key][fxId]; if(!inst||!AC) return;
  if(inst.kind==='voice') return;
  const t=when!=null?when:AC.currentTime;
  if(inst.kind==='insert'){ inst.setActive(on,t); return; }
  inst.gate.gain.cancelScheduledValues(t); inst.gate.gain.setValueAtTime(on?1:0,t);
}
/* УСТАНОВИТЬ ВЕЛИЧИНУ ПАРАМЕТРА ПО ИМЕНИ — вход переигровки автоматизации.
   ⛳ ИДЁМ ЧЕРЕЗ setNorm ЭФФЕКТА, А НЕ В УЗЕЛ НАПРЯМУЮ, и это два свойства разом:
     • СГЛАЖИВАНИЕ. У каждого сеттера своя постоянная времени (0.05 у длины/окраски, 0.08 у подмеса) —
       то есть РАМПА к новому значению получается сама собой, и второй модели сглаживания не заводится.
     • ЧЕСТНАЯ КАРТИНКА. setNorm пишет p.cur, а его читают И столбики на холсте, И меню. Показ поэтому
       ДВИЖЕТСЯ ВМЕСТЕ СО ЗВУКОМ сам, без единой строки в слое показа.
   ⚠️ Старые скаляры (драйв/вибрато/тремоло-нота) живут в state.fx и дескриптора не имеют — пишем их
   store напрямую, тем же ключом '<id>:amt', каким их пишет захват.
   ⚠️ Экземпляр берём СОЗДАЮЩИЙ — по тому же доводу, что у захвата: величина может прийти на эффект,
   который в этой сессии ещё не звучал. */
/* ═══ ПРИЦЕЛ РУКИ — ОТДЕЛЬНО ОТ ТОГО, ЧТО ЗВУЧИТ (слайс O-3.1) ═══
   ⛳ ЗАЧЕМ РАЗВЕЛИ. Слайс O-3 сделал показ «честным» так: переигровка пишет ТУ ЖЕ величину, которую
   читают столбики, — и столбик поехал вместе со звуком. Но СТОЛБИК — ЭТО НЕ ИЗМЕРИТЕЛЬ, А ПРИЦЕЛ: он
   отвечает на вопрос «куда я поставил палец», а не «что сейчас громче». Когда им правит чужая запись,
   прицел перестаёт показывать МОЁ и начинает показывать ЧУЖОЕ — то есть врать о единственном, ради чего
   он нарисован.
   Поэтому величин теперь ДВЕ, и у каждой свой хозяин:
     p.cur      — ЧТО ЗВУЧИТ. Пишут и рука, и переигровка (во время игры — переигровка, правило O-3).
     FX_AIM     — КУДА ПОСТАВИЛА РУКА. Пишет ТОЛЬКО рука (жест и меню, через один вход fxParamsOf).
   ⛔ ЭТО НЕ ВОЗВРАТ УПРАВЛЕНИЯ РУКЕ. Кто ГОВОРИТ звуку — не изменилось ни на строку: пока транспорт
   играет, записанное неприкосновенно. Изменилось только то, ЧТО ПОКАЗАНО.
   ⚠️ И ПРИЦЕЛ ЖЕ ЧИТАЕТ ЗАХВАТ ЩИПКА. Относительный сдвиг обязан продолжаться с того места, где рука
   ОСТАВИЛА параметр, а не с того, куда его успела увести запись, — иначе первый кадр щипка давал бы
   скачок. Один вход (fxParamsOf) отдаёт и чтение, и запись прицела, поэтому разойтись им негде.
   ⚠️ ХРАНИМ ОДНОЙ КАРТОЙ, А НЕ ПОЛЕМ В ДЕСКРИПТОРЕ: у СТАРЫХ СКАЛЯРОВ (драйв/вибрато/тремоло-нота)
   дескриптора нет вовсе — их величина живёт в state.fx. Одна карта на оба рода = один закон и один
   читатель, вместо двух механик рядом. */
const FX_AIM=new Map();
const fxAimK=(key,fxId,pKey)=>key+'|'+fxId+'|'+pKey;
function fxAimSet(key,fxId,pKey,v){ FX_AIM.set(fxAimK(key,fxId,pKey),v); }
/* fallback — ЧТО ПОКАЗАТЬ, ПОКА РУКА НИ РАЗУ НЕ ТРОГАЛА ПАРАМЕТР: живая величина. Тогда прицел и звук
   совпадают сами собой, и первый показ не врёт про «поставлено рукой» там, где рука ещё не была. */
function fxAimGet(key,fxId,pKey,fallback){ const v=FX_AIM.get(fxAimK(key,fxId,pKey)); return v==null?fallback:v; }
/* ⛳ ВЕРНУТЬ ЗВУК К ПРИЦЕЛУ РУКИ — после остановки транспорта.
   ⚠️ ЗДЕСЬ ПРАВИЛО СМЕНИЛОСЬ (O-3.1), и вот почему. В O-3 возвращались ТОЛЬКО фиксированные величины —
   из меню, — а ведомые рукой оставались там, где их бросила запись; довод был «их видно в столбиках».
   С разделением прицела и звука этот довод отменился: столбик показывает ПРИЦЕЛ, и оставь мы звук на
   чужой величине — прицел и звук разошлись бы ровно в тот миг, когда транспорт встал и рука снова стала
   хозяйкой. Поэтому на остановке звук ПОДТЯГИВАЕТСЯ К ПРИЦЕЛУ: человек получает обратно СВОИ настройки,
   а не последние настройки чужой записи. Скачок звука здесь уместен — записанные дорожки уже молчат.
   ПОРЯДОК ИСТОЧНИКОВ: прицел руки → (если рука не трогала) число из меню у фиксированного → иначе не
   трогаем вовсе (показ и так равен живой величине, см. fallback у fxAimGet). */
function fxRestoreAim(key){
  if(!AC) return;
  for(const eff of fxChainOf(key)){
    if(fxIsScalar(eff.fxId)){ const a=fxAimGet(key,eff.fxId,FX_AMT,null); if(a!=null) fx[eff.fxId]=a; continue; }
    const inst=FX_INST[key] && FX_INST[key][eff.fxId]; if(!inst) continue;
    eff.params.forEach((pa,i)=>{ const pp=inst.params[i]; if(!pp) return;
      const a=fxAimGet(key,eff.fxId,pp.key,null);
      const v = a!=null ? a : (pa && pa.mode==='fixed' && pa.v01!=null ? pa.v01 : null);
      if(v!=null) pp.setNorm(v); });
  }
}
/* ИМЕНА ПАРАМЕТРОВ ЭФФЕКТА, В ПОРЯДКЕ ОБЪЯВЛЕНИЯ — чтобы снимок цепи (он хранит ТОЛЬКО величины, массивом)
   можно было разложить обратно в пары «имя → величина». Живёт здесь, потому что реестр эффектов — здесь;
   запись хранит величины без имён намеренно (короче и не дублирует спецификацию). */
function fxParamKeysOf(fxId){
  const f=FX_FACTORY[fxId];
  return f ? f.params.map(sp=>sp.key) : [FX_AMT];   // старый скаляр: ровно один параметр, и он же сам эффект
}
/* ОПИСАНИЕ ПАРАМЕТРОВ ДЛЯ МЕНЮ ПОЛОСЫ АВТОМАТИЗАЦИИ (O-4): ключ + подпись. Отдаём СПЕЦИФИКАЦИЮ, а не
   экземпляр: полосу можно открыть на дорожке, чей эффект в этой сессии ещё ни разу не звучал. */
function fxParamMetaOf(fxId){
  const f=FX_FACTORY[fxId];
  return f ? f.params.map(sp=>({key:sp.key, labelKey:sp.labelKey, short:sp.short}))
           : [{key:FX_AMT, labelKey:'fx.param.amt', short:fxId.toUpperCase()}];
}
/* ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ (нормированные) — ими наполняется снимок цепи, когда эффект добавили В РЕДАКТОРЕ
   и сыграно с ним ничего не было. Берём из СПЕЦИФИКАЦИИ тем же fxNorm, что и fxWrapParam: второй модели
   диапазона не заводим (правило с 2.6). */
function fxDefaultsOf(fxId,key){   // key (V4) — владелец цепи: умолчание может зависеть от него (defBy, см. fxDefFor)
  const f=FX_FACTORY[fxId];
  if(!f) return [0];                                  // старый скаляр: его нейтраль — ноль (см. FX_NEUTRAL в state)
  return f.params.map(sp=>Math.max(0,Math.min(1,fxNorm(sp,fxDefFor(sp,key)))));
}
/* ЧТО МОЖНО ДОБАВИТЬ В ЦЕПЬ ДОРОЖКИ ИЗ РЕДАКТОРА: только СИГНАЛЬНЫЕ эффекты (у которых есть концы), то
   есть те, что реально встанут в путь переигровки. Голосовые (яркость, скольжение) в путь не входят вовсе, как и старые
   скаляры соло — им здесь не место. ⚠️ С V4b их ТОЖЕ можно добавить дорожке, но другим списком — fxVoiceIdsFor ниже:
   их величина живёт в нотах. */
const fxAddableIds=()=>Object.keys(FX_FACTORY).filter(id=>FX_FACTORY[id].kind!=='voice');
/* ⛳ V4b: ГОЛОСОВЫЕ ЭФФЕКТЫ, КОТОРЫЕ МОЖНО ДОБАВИТЬ ДОРОЖКЕ ЭТОЙ РОЛИ — то, что объявлено для роли (FX_FACTORY[id].roles), и
   старые скаляры у соло (они живут только в соло-голосе). Их величина живёт В НОТАХ (fxIsPerNote), поэтому добавленный в
   редакторе такой эффект не встаёт в путь, а открывает полосу, правка которой переписывает ноты дорожки. */
const fxVoiceIdsFor=role=>{
  const out = role==='ld' ? Object.keys(fx).filter(id=>fxIsScalar(id)) : [];
  for(const id in FX_FACTORY){ const f=FX_FACTORY[id]; if(f.kind==='voice' && !f.perm && (f.roles||[]).includes(role)) out.push(id); }   // VOL-0: постоянную запись (громкость) добавлять нечего — она у дорожки есть всегда
  return out;
};
/* ⛳ V4b: ПАРАМЕТР «В НОТЕ» — ЕГО ВЕЛИЧИНУ НЕСЁТ САМО СОБЫТИЕ НОТЫ, а не лента. Решается ОБЪЯВЛЕНИЕМ, без списка: прицепочный
   параметр модуля (attach:true — он едет в карте a.fx или в своём поле, см. fxNoteField) и старый скаляр (vib/drv/trm, ключ
   'id:amt' в карте соло). У такого параметра переигровка и заморозка читают ЗНАЧЕНИЕ НОТЫ — значит показывать и править его
   полоса обязана тоже в нотах, иначе на экране одно, а звучит другое. Шинные параметры и каналы выразительности — нет. */
const fxIsPerNote=(fxId,pKey)=>{
  if(fxIsScalar(fxId)) return pKey===FX_AMT;
  const f=FX_FACTORY[fxId], sp=f&&f.params.find(q=>q.key===pKey);
  return !!(sp&&sp.attach);
};
/* Где величина лежит в событии: {key, inv} — своё поле (яркость: a.bri, прочитанная с другого конца), либо null — в карте a.fx
   под ключом 'fxId:pKey'. Из объявления параметра (поле note), второго знания о форме события здесь нет. */
const fxNoteField=(fxId,pKey,role)=>{ const f=FX_FACTORY[fxId], sp=f&&f.params.find(q=>q.key===pKey), n=sp&&sp.note;
  return n && (!n.roles || n.roles.includes(role)) ? n : null; };   // role — роль события: своё поле объявлено лишь для некоторых ролей (яркость: a.bri только у аккордов)
/* ⛳ ГЛАДКАЯ АВТОМАТИЗАЦИЯ: СЛЕДИТ ЛИ ЗВУЧАЩИЙ ГОЛОС ЗА ВЕЛИЧИНОЙ «В НОТЕ» ПОСРЕДИ НОТЫ. Да — у громкости, яркости и скаляров
   соло: ведение (leadSet/bassSet/chordGlide) переносит их в голос подъездом τ 40–50 мс, и плавный отрезок внутри зажатой ноты
   пишется ведениями (recorder, pnPlan). Нет — у объявленных readAt (Скольжение: голос читает его лишь на СМЕНЕ ВЫСОТЫ), им
   ведения без смены высоты ничего не дают, и редактор их не пишет: такая величина плавно меняется ОТ смены к смене. */
const fxNoteFollows=(fxId,pKey)=>{ const f=FX_FACTORY[fxId], sp=f&&f.params.find(q=>q.key===pKey); return !(sp&&sp.readAt); };
/* ⛳ when (F3) — ЯВНОЕ время, по умолчанию «сейчас». Живой тик его не передаёт (поведение прежнее);
   офлайн-рендер передаёт долю точки автоматизации, переведённую в секунды.
   ⛔ СКАЛЯР ОФЛАЙН СЮДА НЕ ПОПАДАЕТ И НЕ ДОЛЖЕН: ветка ниже пишет `fx[fxId]` — ОБЩИЙ store state.js,
   один на живую копию и на копию рендера. Рендер обязан отсеивать скаляры САМ (он это и делает) и
   доносить их до голоса пер-нотно через `a.fx` события, как делает ENG.leadOn. */
/* AF5 probe: the sounding state of a chain key — composition (fxPathOf), every built instance's values and the output gain. Pure read. */
function chainStateOf(key){
  const inst=FX_INST[key]||{}, vals={};
  for(const id in inst) vals[id]=inst[id].params.map(p=>+(+p.cur).toFixed(6));
  const out=FX_CHAIN_OUT[key];
  return { path:fxPathOf(key).map(i=>Object.keys(inst).find(k=>inst[k]===i)), vals, out: out ? +out.gain.value.toFixed(6) : null };
}
function fxPlaySet(key,fxId,pKey,v,when){
  if(!AC) return;
  if(fxIsScalar(fxId)){ if(pKey===FX_AMT) fx[fxId]=v; return; }
  const inst=fxInstance(key,fxId); if(!inst) return;
  const pp=inst.params.find(q=>q.key===pKey); if(!pp) return;
  if(when==null && Math.abs(pp.cur-v)<1e-6) return;   // уже там: не переармируем setTargetAtTime сорок раз в секунду на неподвижной величине. ⚠️ При ЯВНОМ времени пропуск запрещён: та же величина в ДРУГОЙ момент — это другое событие расписания
  pp.setNorm(v,when);
}
/* ⛳ РАЗНОРМИРОВКА ПО СПЕЦИФИКАЦИИ ЭФФЕКТА (F3): 0..1 → секунды/герцы/доля.
   Зачем: рендеру надо посчитать ДЛИНУ ХВОСТА по ЗАХВАЧЕННОЙ цепи (длина реверба, время и повторы
   делея), а снимок хранит величины НОРМИРОВАННЫМИ — и считать хвост надо ДО постройки графа, чтобы
   сразу завести контекст нужной длины. Берём спецификацию из FX_FACTORY, экземпляр не нужен.
   ⛔ Разнормировка живёт ИСКЛЮЧИТЕЛЬНО в fxDenorm (правило с 2.6) — второй копии шкалы заводить
   нельзя, поэтому наружу отдаём готовое число, а не min/max/curve. */
function fxDenormOf(fxId,pKey,v01){
  const f=FX_FACTORY[fxId]; if(!f) return null;
  const sp=f.params.find(q=>q.key===pKey); if(!sp) return null;
  return fxDenorm(sp, Math.max(0,Math.min(1,v01)));
}
/* ⛳ ОФЛАЙН: СНЯТЬ ЛИМИТЕР С ПУТИ РЕНДЕРА (F3).
   ⛔ ПОЧЕМУ НЕ createRecordingTap: тот НАМЕРЕННО стоит ПОСЛЕ лимитера — он пишет «то, что слышно».
   У заморозки случай ПРОТИВОПОЛОЖНЫЙ: дорожка, отрендеренная в одиночку, была бы сжата в одиночку, а
   потом сжата ВТОРОЙ раз уже в сумме микса; и наоборот, ей досталось бы не то подавление, которое
   создают соседние дорожки. Поэтому рендер снимается с МАСТЕРА, до лимитера.
   ⛳ ПРАВИЛО #4 ЦЕЛО: «лимитер остаётся» — про ЖИВОЙ выход, и он там стоит. Здесь речь о копии движка,
   которая в колонки не играет вовсе. ⛔ Гейт `offline` не для красоты: без него эта функция могла бы
   снять лимитер с живого мастера. */
/* ⛳ ШИНА ЗАМОРОЖЕННОЙ ДОРОЖКИ (F4). Отдаёт СВОЙ гейн, уже подключённый к мастеру.
   ⛳ ПОЧЕМУ В МАСТЕР, А НЕ В ШИНУ РОЛИ: в буфере цепь эффектов УЖЕ ВПЛАВЛЕНА — прогони его через
   цепь роли ещё раз, и реверб лёг бы дважды. Замороженная дорожка приходит в микс готовой, ровно
   как приходит в него сумма ролей. Лимитер при этом на месте (master → limiter → destination) —
   в общем миксе он и должен работать, правило #4 цело.
   ⚠️ Гейн отдаём наружу, чтобы приглушение/соло были ОДНИМ присваиванием, а не гашением голосов:
   у буфера голосов нет. Владелец гейна — recorder (реестр заморозки), audio лишь строит узел. */
function makeFrozenBus(){
  if(!AC||!master) return null;
  const g=AC.createGain(); g.gain.value=1; g.connect(master);
  return g;
}
/* ═══ ⛳ AF6b: 16-БИТНОЕ ХРАНИЛИЩЕ ЗАМОРОЖЕННЫХ ДОРОЖЕК И ЧТЕЦ (frz-worklet.js) ═══
   frzStorePut — передать куски дорожки в хранилище на потоке звука (transfer: на главном потоке они ОТСОЕДИНЯЮТСЯ — копия одна);
   frzStoreDel — снять; frzStoreDbg — только проба (кусок со сдвигом / тишиной). frzReader(key, startF, d) — узел-чтец, двухканальный:
   на кадре контекста F ≥ startF звучит сэмпл буфера F + d (целые кадры — без дробного старта). Владелец всех вызовов — recorder. */
function frzStorePut(key, pack){
  if(!frzReady||!frzStoreNode) return false;
  const tr=[]; for(const c of pack.ch) for(const a of c) tr.push(a.buffer);
  frzStoreNode.port.postMessage({ op:'put', key, ch:pack.ch, len:pack.len, chunk:pack.chunk, mul:pack.mul, kind:pack.kind }, tr);
  return true;
}
const frzStoreDel=key=>{ if(frzStoreNode) frzStoreNode.port.postMessage({ op:'del', key }); };
const frzStoreDbg=(key,dbg)=>{ if(frzStoreNode) frzStoreNode.port.postMessage({ op:'dbg', key, shift:dbg&&dbg.shift, drop:dbg&&dbg.drop, nostop:!!(dbg&&dbg.nostop) }); };
/* ⛳ AF6b-fix2: ЧТЕЦ ВСЕГДА ПОДКЛЮЧЁН К НЕМОМУ СТОКУ (frzSink). Узел, которого граф не тянет, не обрабатывается вовсе — значит не увидит и
   своей остановки и не завершится никогда: так было с запасом, снятым неиспользованным (он не был подключён), и с чтецом, чью шину отключили
   (frzRetire, через 80 мс) раньше, чем до него дошло сообщение об остановке. Сток держит каждого чтеца в обработке до его конца — что бы ни
   случилось с его гейном и шиной. Цена — один немой вход мастера; простаивающий запас лишь обнуляет свой выход. */
function frzReader(key, startF, d){   // AF6b-fix: startF == null — чтец-ЗАПАС (пустой; пускает сообщение {play:{startF, d}})
  if(!frzReady) return null;
  const n=new AudioWorkletNode(AC,'frz-reader',{ numberOfInputs:0, numberOfOutputs:1, outputChannelCount:[2], processorOptions: startF==null ? { key } : { key, startF, d } });
  if(frzSink) n.connect(frzSink);
  return n;
}
/* ⛔ ТОЛЬКО ПРОБА: сколько чтецов живо на потоке звука (построены и не завершились). Ответ — сообщением хранилища; нет ответа за 2 с — null. */
function frzStoreCount(){
  if(!frzStoreNode) return Promise.resolve(null);
  const id=++frzCountSeq;
  return new Promise(res=>{ frzCountWait.set(id,res); frzStoreNode.port.postMessage({ op:'count', id });
    setTimeout(()=>{ if(frzCountWait.has(id)){ frzCountWait.delete(id); res(null); } }, 2000); });
}
/* ═══ ⛳ AF2: ПОДМЕНА СОБЫТИЙ БУФЕРОМ — ПЕРЕКРЁСТНОЕ ЗАТУХАНИЕ И СРЕЗ ГОЛОСОВ ДОРОЖКИ ═══
   xfRamp — РАВНАЯ МОЩНОСТЬ (уход cos, вход sin от 0 до π/2) кусками линейных рамп по XF_SEG отрезков. ⚠️ Кусками, а не
   setValueCurveAtTime: событие, поставленное ВНУТРИ идущей кривой (атака того же голоса, фейдер — trackGainRetune), браузер отвергает
   исключением; линейные рампы снимаются cancelScheduledValues как обычно. Равная мощность — потому что живой голос и буфер играют ОДНУ
   ноту с разной гуманизацией и фазами: их корреляция случайна и в среднем ноль, суммарная мощность в стыке тогда ровная.
   dur=0 — РУБИЛЬНИК (только контроль пробы P.checkSwap: он обязан щёлкнуть). */
const XF_SEG=8;
function xfRamp(param, t, dur, g0, up){
  param.cancelScheduledValues(t);
  if(!(dur>0)){ param.setValueAtTime(up?g0:0, t); return; }
  param.setValueAtTime(up?0:g0, t);
  for(let k=1;k<=XF_SEG;k++){ const u=k/XF_SEG, w=up?Math.sin(u*Math.PI/2):Math.cos(u*Math.PI/2); param.linearRampToValueAtTime(g0*(Math.abs(w)<1e-9?0:w), t+u*dur); }
}
/* СРЕЗ ГОЛОСОВ ДОРОЖКИ В МИГ ПОДМЕНЫ: каждый голос пула, чей владелец (или ПОСЛЕДНИЙ владелец у отпущенного — его хвост ещё звучит)
   проходит test, уходит по xfRamp на ступени уровня дорожки tg (огибающая — её форма, атаки, релиза — не тронута: tg лишь множитель),
   а удерживаемые — ещё и отпускаются жёстко в конце ухода (голос свободен, держатель снят). part: 'pool' — аккорды и бас, 'lead' — соло,
   иначе всё. ⛔ ДОРОЖЕЧНЫЕ ключи только (test решает recorder: layerOfOwner) — живые руки ('lead:L', 'latch', 'bass') не трогаются (#20).
   ⚠️ ПОЧЕМУ tg: следующая атака голоса ставит tg заново (cancelScheduledValues + setValueAtTime) — срез не переживёт голос, отданный другой
   ноте. Возвращает число срезанных голосов. */
function voicesCut(test, when, dur, part){
  if(!AC) return 0;
  const t=Math.max(when!=null?when:AC.currentTime, AC.currentTime), hit=v=>{ const k=v.owner||v.last; return !!k && test(k); };
  let n=0; const fade=v=>{ if(!v.tg) return; xfRamp(v.tg.gain, t, dur, ownerGain(v.owner||v.last), false); n++; };
  if(part!=='lead'){
    for(const v of cv) if(hit(v)) fade(v);
    for(const x of ffLive) if(x.owner && test(x.owner)){ if(x.t<t) xfRamp(x.g.gain, t, dur, x.g0, false); else x.g.gain.setValueAtTime(0, x.t); n++; }   // SND-F1: struck notes
    for(const v of bv) if(hit(v)) fade(v);
    for(const k of Object.keys(chordHold)) if(test(k)){ for(const v of chordHold[k]) cvRelease(v,true,t+dur); delete chordHold[k]; }
    for(const k of Object.keys(bassHold)) if(test(k)){ const v=bassHold[k]; v.deg=-1; bvRelease(v,true,t+dur); delete bassHold[k]; }
  }
  if(part!=='pool'){
    for(const v of lv) if(hit(v)) fade(v);
    for(const k of Object.keys(leadHold)) if(test(k)){ const v=leadHold[k]; delete leadHold[k]; v.deg=-1; leadRelease(v,true,t+dur); }
  }
  return n;
}
/* ⛔ ТОЛЬКО ДЛЯ ПРОБ (P.checkRevAgree, P.checkSwap, P.checkChunks): снять ЖИВОЙ выход МАСТЕРА (после его гейна, до лимитера — сравнимо с
   рендером, который тоже берёт мастер, offlineTapMaster) в массивы на sec секунд, НЕ выпуская звук в колонки: на время съёма лимитер
   отключён от выхода и подключается обратно по окончании (и по сторожевому таймеру, если съём не закончился).
   ⛳ СЪЁМ — НА ПОТОКЕ ЗВУКА (src/probe-cap-worklet.js, процессор 'probe-cap'), С НОМЕРОМ КАДРА ПЕРВОГО СЭМПЛА F0. До этого слайса —
   ScriptProcessorNode на главном потоке: при занятом главном потоке его блоки терялись/повторялись, съём переставал быть сплошным, и пробы
   реального времени падали «случайно» (довод — в шапке ворклета). Модуль грузится по первому probeCaptureReady() (пробы зовут его до
   съёма: probeCapture создаёт узел СИНХРОННО — вызывающий сразу ставит метку на кадр Mf и обязан знать, что съём уже идёт).
   Возвращает { L, R, rate, F0, gaps, stale, jumps } — индекс i съёма ↔ кадр контекста F0 + i; gaps — разрывы на потоке звука (обязаны быть 0);
   stale — одиночные устаревшие показания currentFrame у Chrome (сведение, звук сплошной — см. ворклет). */
let capMod=null, capOk=false;
function probeCaptureReady(){ if(!AC||offline) return Promise.resolve(false);
  return capMod||(capMod=AC.audioWorklet.addModule('src/engine/worklets/probe-cap-worklet.js').then(()=>(capOk=true), e=>{ capMod=null; throw e; })); }
function probeCapture(sec){
  if(!AC||!master||!outLast||offline) return Promise.reject(new Error('no live engine'));
  if(!capOk) return Promise.reject(new Error('the capture worklet is not loaded — await audio.probeCaptureReady() first'));
  const want=Math.ceil(sec*AC.sampleRate);
  let node;
  try{ node=new AudioWorkletNode(AC,'probe-cap',{ numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[1], channelCount:2, channelCountMode:'explicit', processorOptions:{ want } }); }
  catch(e){ return Promise.reject(e); }
  return new Promise((res,rej)=>{
    let done=false;
    const fin=(err,m)=>{ if(done) return; done=true; node.port.onmessage=null;
      try{ master.disconnect(node); }catch(e){} try{ node.disconnect(); }catch(e){} try{ outLast.connect(AC.destination); }catch(e){}
      if(err) return rej(err);
      res({ L:m.L, R:m.R, rate:AC.sampleRate, F0:m.F0, gaps:m.gaps, stale:m.stale, jumps:m.jumps||[] }); };
    try{ outLast.disconnect(AC.destination); }catch(e){}
    master.connect(node); node.connect(AC.destination);   // выход молчит (процессор ничего не пишет) — подключён, чтобы граф тянул узел
    node.port.onmessage=e=>fin(null, e.data||{});
    setTimeout(()=>fin(new Error('the capture did not finish (is the audio context suspended?)')), (sec+3)*1000);
  });
}
function offlineTapMaster(){
  if(!AC||!offline||!master||!limiter) return false;
  try{ master.disconnect(limiter); }catch(e){}
  /* ⛳ И ГРОМКОСТЬ МАСТЕРА — ЕДИНИЦА. Буфер приходит в живой микс через makeFrozenBus → ЖИВОЙ master (×0.8) — ровно туда же,
     куда приходит сумма ролей у дорожки, играющей событиями. Оставь мы 0.8 и здесь, замороженная дорожка прошла бы мастер
     ДВАЖДЫ (×0.64) и звучала бы на ~1.9 дБ тише самой себя. Меняем только копию движка (гейт offline выше). */
  master.gain.value=1;
  master.connect(AC.destination);
  return true;
}
/* ⛳ ПОРЯДОК ПУТИ: сперва то, что В ЦЕПИ — В ПОРЯДКЕ ЦЕПИ; затем построенное, но ИЗ ЦЕПИ СНЯТОЕ.
   ⚠️ СНЯТЫЕ ОСТАЮТСЯ В ПУТИ НАМЕРЕННО, и это то самое «хвост ДОЗВУЧИВАЕТ, а не обрывается»: выкинь мы
   их из пути, разрыв связи срезал бы уже звучащий хвост НАЧИСТО. Они безвредны, ПОКА ИХ ЗАТВОР ЗАКРЫТ: тогда влажной
   доли нет, а сухая ветвь — гейн 1, то есть чистое тождество.
   ⚠️ «ЗАКРЫТ» НЕ ДАРОМ, И ЭТО УЖЕ ПОДВЕЛО: живьём снятый эффект закрывает fxSetActive, но у КОПИИ РЕНДЕРА initAudio строит
   реверб и делей соло и реверб аккордов ОТКРЫТЫМИ, и эффект, которого нет ни в записи, ни в живой цепи, не закрывал никто —
   замороженная дорожка звучала с чужими эффектами. Закрывают теперь fxPlayPath (всё построенное вне нового состава) и
   fxRenderPath/fxGateAt (затворы рендера — по записанным долям). Новый путь, ставящий в путь построенное, обязан так же
   сам закрыть то, что звучать не должно.
   Ставим их В КОНЕЦ, а не на прежнее место: так порядок ЖИВЫХ эффектов ровно тот, что показан в меню. (У рендера
   FX_PLAY_PATH — уже полный порядок проводки, и хвоста снятых нет.) */
function fxPathOf(key){
  const byKey=FX_INST[key]; if(!byKey) return [];
  const path=[], seen=new Set();
  const ids=FX_PLAY_PATH[key]||fxIdsOfChain(key);   // O-3: пока задан путь переигровки — звучит ОН, а не живая цепь
  for(const id of ids){ const inst=byKey[id];
    if(fxInPath(inst) && !seen.has(id)){ path.push(inst); seen.add(id); } }
  for(const id in byKey){ if(!seen.has(id) && fxInPath(byKey[id])) path.push(byKey[id]); }
  return path;
}
/* ПЕРЕСБОРКА СИГНАЛЬНОГО ПУТИ ВЛАДЕЛЬЦА. Зовётся из ЧЕТЫРЁХ мест и только из них: регистрация концов,
   создание экземпляра, правка состава цепи (добавить/убрать) и ПЕРЕСТАНОВКА. */
function fxResplice(key){
  const head=FX_CHAIN_HEAD[key], out=FX_CHAIN_OUT[key];
  if(!head||!out) return;                                  // концы ещё не зарегистрированы — собирать нечего (порядок вызовов не важен, как и прежде)
  fxUnlink(key);
  let cur=head;
  for(const inst of fxPathOf(key)){ fxLink(key,cur,inst.in); cur=inst.out; }   // у тремоло in===out — отрезок из одного узла, и это верно
  fxLink(key,cur,out);
}
/* ⛳ ПЕРЕСБОРКА БЕЗ ЩЕЛЧКА — ПРОВАЛ НА ~20 мс. Разрыв связи посреди сигнала — это скачок амплитуды, то
   есть ЩЕЛЧОК; ни одной «плавной» формы у connect/disconnect не существует. Поэтому гасим ХВОСТ (узел
   перед мастером, то есть ПОСЛЕ всех сетей — иначе уже набранный хвост реверба щёлкнет сам), пересобираем
   в тишине и возвращаем громкость.
   ⚠️ ЦЕНА НАЗВАНА ЧЕСТНО: это слышный ПРОВАЛ (~40 мс туда-обратно), а не бесшовность. Перестановка
   эффектов — операция редкая и осознанная; провал читается как «переключил», щелчок читался бы как поломка.
   ⚠️ setTimeout, а не рампа с колбэком: у AudioParam колбэка нет. Запас +10 мс к длине рампы — чтобы
   пересборка пришлась ГАРАНТИРОВАННО на ноль, а не на хвост спада. */
const FX_DIP=0.02;
/* ⚠️ ПРОВАЛЫ НЕ СТАКАЮТСЯ — один незавершённый на владельца. Быстрые нажатия ▲▼ (или «убрать» сразу за
   «добавить») иначе наложили бы рампы друг на друга и дали рваную громкость. Ждущая пересборка читает
   цепь В МОМЕНТ СРАБАТЫВАНИЯ, поэтому берёт САМОЕ СВЕЖЕЕ состояние: несколько правок подряд сходятся в
   ОДИН провал и ОДНУ сборку — что и слышно как одно переключение. */
const FX_DIP_T={};
const FX_DIP_LOG=[];   // ⛔ только пробы: последние провалы мягкой пересборки {key, t — время AC начала провала}
const fxDipLog=()=>FX_DIP_LOG.slice();
function fxRespliceSmooth(key){
  const out=FX_CHAIN_OUT[key];
  if(!AC||!out){ fxResplice(key); return; }                // нечего гасить (ещё не построено) — собираем молча
  /* ⛔ ОФЛАЙН — ТОЛЬКО ПРЯМАЯ ПЕРЕСБОРКА (F3). «Мягкая» доделывает работу в setTimeout, то есть по
     СТЕННЫМ ЧАСАМ, а офлайн-контекст идёт по своим и к моменту срабатывания может быть уже отрендерен;
     рампу она при этом кладёт на currentTime=0, то есть В САМОЕ НАЧАЛО БУФЕРА. Гасить там нечего и
     некому: рендер собирает граф ДО того, как пойдёт хоть один сэмпл, поэтому провал не нужен вовсе.
     ⚠️ Без этой ветки любой эффект, построенный ЛЕНИВО уже после регистрации концов (снимок цепи с
     эффектом, которого в живой цепи нет), вносил бы в рендер стенные часы. */
  if(offline){ fxResplice(key); return; }
  if(FX_DIP_T[key]) return;                                // провал уже идёт — его пересборка подхватит и эту правку
  const t=AC.currentTime;
  FX_DIP_LOG.push({ key, t }); if(FX_DIP_LOG.length>32) FX_DIP_LOG.shift();   // сведение для проб: когда и чей выход проваливался
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(out.gain.value,t);
  out.gain.linearRampToValueAtTime(0,t+FX_DIP);
  FX_DIP_T[key]=setTimeout(()=>{
    FX_DIP_T[key]=null;
    if(!AC) return;
    fxResplice(key);
    const t2=AC.currentTime;
    out.gain.cancelScheduledValues(t2);
    out.gain.setValueAtTime(0,t2);
    out.gain.linearRampToValueAtTime(1,t2+FX_DIP);
  }, Math.ceil(FX_DIP*1000)+10);
}
/* ПУБЛИЧНАЯ ПЕРЕСБОРКА — для ui: состав или ПОРЯДОК цепи изменились, граф обязан догнать данные.
   ⚠️ Всегда «мягкая»: эти правки человек делает по живому звуку. */
function fxChainResplice(key){ fxRespliceSmooth(key); }
/* Зарегистрировать КОНЦЫ отрезка владельца: голову (сумма его голосов) и постоянный выход в мастер.
   ⚠️ СУХОЙ ХОД В МАСТЕР ПРОКЛАДЫВАЕТ ТЕПЕРЬ ЭТА ФУНКЦИЯ, а не вызывающий: с последовательной цепью
   сигнал обязан идти СКВОЗЬ эффекты, поэтому «голова → мастер» напрямую больше не существует ни у кого.
   ⛔ Не оставлять у вызывающего head.connect(master): сухое пошло бы В ОБХОД цепи, и эффекты
   превратились бы обратно в параллельные посылы — ровно то, что этот слайс убирает.
   ⚠️ Зовётся ОДИН раз на владельца. Порядок «сперва концы или сперва экземпляр» по-прежнему не важен:
   пересборка идёт по обоим путям (здесь и в fxInstance). */
function fxChainIO(key,head){
  const out=AC.createGain(); out.gain.value=1;
  out.connect(master);
  FX_CHAIN_HEAD[key]=head; FX_CHAIN_OUT[key]=out;
  fxResplice(key);                                         // без провала: на постройке звука ещё нет
}
function fxInstance(key,fxId){
  if(!AC) return null;                       // до initAudio узлов нет — меню при этом работает, оно читает ФАБРИКУ
  const f=FX_FACTORY[fxId]; if(!f) return null;
  const byKey=FX_INST[key]||(FX_INST[key]={});
  if(!byKey[fxId]){ const inst=byKey[fxId]=f.make(E);   // AUD2a: a factory builds its instance in this engine's context
    /* V4: умолчание ПО ВЛАДЕЛЬЦУ (объявленное defBy — см. «Скольжение»). make() владельца не знает, поэтому досеваем
       здесь, где ключ есть, — одним местом для любого будущего модуля. Без defBy ветка не делает ничего. */
    for(const p of inst.params){ const d=fxDefFor(p,key); if(d!==p.def){ p.def=d; p.setNorm(fxNorm(p,d)); } }
    if(fxInPath(inst)) fxRespliceSmooth(key); }   // O-1: построили — ПЕРЕСОБРАЛИ путь (эффект встаёт на своё место по порядку цепи). У голосового концов нет — путь не трогаем вовсе
  return byKey[fxId];
}
/* ═══ СНИМОК ПРИЦЕПОЧНЫХ ПАРАМЕТРОВ ЦЕПИ РОЛИ (Пласт 3.7.2) ═══
   Отдаёт `{ 'fxId:paramKey': v01 }` — то, что уезжает в СОБЫТИЕ и делает слой самостоятельным.
   ⚠️ КЛЮЧ — СТАБИЛЬНАЯ ПАРА `fxId:paramKey`, НИКОГДА не индекс в цепи (правило #25). Перестановка или
   удаление эффекта не смеет переосмыслить УЖЕ ЗАПИСАННОЕ событие; индекс это сделал бы молча.
   ⚠️ ЗНАЧЕНИЯ НОРМИРОВАННЫЕ (0..1) — те же, что у жеста, у меню и у setNorm. Секунды и герцы живут
   ИСКЛЮЧИТЕЛЬНО в fxNorm/fxDenorm; второй модели диапазона не заводим (правило с 2.6).
   ⚠️ ТОЛЬКО attach-параметры (см. REV_PARAMS): сетевые в событие не идут — их некому исполнить пер-слойно.
   ⚠️ Старый скалярный (vib/drv/trm; делей с в.1 — модуль) в FX_FACTORY отсутствует — у него РОВНО ОДИН параметр, и он же
   сам себе прицепка; ключ `<id>:amt`, величина прямо из state.fx (она уже 0..1).
   Экземпляра ещё нет (эффект в цепи, но ни разу не звучал) → в снимок не попадает: записывать нечего. */
const FX_AMT='amt';
function fxSnapshot(key){
  const out={};
  for(const eff of fxChainOf(key)){
    const id=eff.fxId, f=FX_FACTORY[id];
    if(!f){ if(id in fx) out[id+':'+FX_AMT]=fx[id]; continue; }
    const inst=FX_INST[key] && FX_INST[key][id]; if(!inst) continue;
    /* ⛔ VOL-0: ПАРАМЕТР СО СВОИМ ПОЛЕМ В СОБЫТИИ У ВСЕХ РОЛЕЙ (note без roles — громкость, поле a.vol) В КАРТУ НЕ ИДЁТ.
       Он и так едет в ноте своим полем, и его кладёт туда сам жест; в карте он был бы вторым представлением одной
       величины. Хуже того — видимым: у каждой соло-ноты в a.fx появился бы новый ключ, а бас-нота, чья карта пишется
       лишь при НЕПУСТОМ снимке, получила бы карту всегда — события перестали бы быть байт-в-байт прежними. Поле с
       ограничением по ролям (яркость: a.bri только у аккордов) не трогаем — у прочих ролей она живёт в карте, как было. */
    f.params.forEach((s,i)=>{ if(s.attach && inst.params[i] && !(s.note && !s.note.roles)) out[id+':'+s.key]=inst.params[i].cur; });
  }
  return out;
}
/* ═══ ЗАХВАТ ДЛЯ ВОСПРОИЗВОДИМОГО РЕНДЕРА (слайс O-2) ═══
   ⛳ ПРАВИЛО, КОТОРОЕ ДЕЛАЕТ БУДУЩИЕ ЭФФЕКТЫ ЗАПИСЫВАЕМЫМИ ПО ПОСТРОЕНИЮ:
     ЗАХВАТ ИДЁТ ПО ОБЪЯВЛЕНИЯМ, А НЕ ПО СПИСКУ, КОТОРЫЙ КТО-ТО ВЁЛ РУКАМИ.
   Обе функции ниже обходят `inst.params` — то есть ровно то, что автор эффекта объявил в своей
   спецификации и что fxWrapParam достроил до {cur,getNorm,setNorm}. Отсюда ответ на вопрос «что обязан
   помнить автор НОВОГО эффекта, чтобы его записали»: ⛳ НИЧЕГО. Объявил параметр — он уже в захвате, в
   меню, в адресуемых жестом и в столбиках. Забыть тут нечего, потому что отдельного шага записи нет.
   ⚠️ ЕДИНСТВЕННОЕ УСЛОВИЕ — ПИСАТЬ ЗНАЧЕНИЕ ЧЕРЕЗ p.set/setNorm, а не в AudioParam напрямую: величина,
   записанная мимо дескриптора, в p.cur не попадёт и захвачена не будет. Сегодняшние исключения из этого
   правила перечислены в отчёте слайса; в самом коде их ровно три рода — выразительность (у неё своя
   объявленная таблица EXPR_CH, см. выше), СТАРЫЕ СКАЛЯРЫ state.fx (у них дескриптора нет вовсе, ключ
   `<id>:amt`, ниже это учтено) и пер-нотные величины голоса, которые по природе не свойство цепи.
   ⛔ ЭКЗЕМПЛЯР БЕРЁМ ЧЕРЕЗ СОЗДАЮЩИЙ fxInstance, А НЕ ГОЛЫМ ПОИСКОМ В FX_INST. Почему — довод целиком
   стоит у fxChordBri выше: экземпляр рождается лишь когда кто-то впервые спросил дескрипторы, а голосовой
   (яркость аккордов) — только когда роль впервые ЗАЗВУЧАЛА. Голый поиск (так делает fxSnapshot, и для
   его задачи это верно) молча ПРОПУСТИЛ бы такую запись, и взятое, начатое до первого аккорда, потеряло
   бы яркость целиком — тихо, правдоподобно, без единой ошибки. Создать голосовой экземпляр не стоит
   ничего (у него нет узлов), а шинный к этому мигу уже построен: его строит добавление в цепь.
   ⚠️ ВСЕ ПАРАМЕТРЫ, А НЕ ТОЛЬКО attach. fxSnapshot фильтрует по attach, потому что кладёт величины В
   СОБЫТИЕ НОТЫ, где сетевым исполниться некому. Здесь наоборот: длина и окраска комнаты, время и повторы
   делея, глубина и скорость тремоло — ровно то, чего запись не знала НИКОГДА, и ради чего затеян захват. */
function fxCaptureChain(key){
  const out=[];
  for(const eff of fxChainOf(key)){
    const id=eff.fxId, f=FX_FACTORY[id];
    if(!f){ if(id in fx) out.push({fxId:id, params:[fx[id]]}); continue; }   // старый скаляр: один параметр, величина прямо из store
    const inst=fxInstance(key,id); if(!inst) continue;                        // до initAudio узлов нет — записывать нечего
    out.push({fxId:id, params:inst.params.map(pp=>pp.cur)});                  // ⛳ ПОРЯДОК ЦЕПИ СОХРАНЁН: цепь последовательна, и порядок теперь слышен
  }
  return out;
}
/* ОБХОД ЖИВЫХ ВЕЛИЧИН ВЛАДЕЛЬЦА: emit(fxId, paramKey, v01) по каждому объявленному параметру.
   Сюда же прицеплены каналы выразительности — у соло-цепи, потому что её узлы стоят на соло-шине.
   ⚠️ Форма emit одна на всё: дорожка автоматизации не должна знать, эффект это цепи, старый скаляр или
   «смычок», — у неё есть ключ владельца, id и имя параметра, и этого достаточно. */
function fxCaptureWalk(key,emit){
  for(const eff of fxChainOf(key)){
    const id=eff.fxId, f=FX_FACTORY[id];
    if(!f){ if(id in fx) emit(id,FX_AMT,fx[id]); continue; }
    const inst=fxInstance(key,id); if(!inst) continue;
    for(const pp of inst.params) emit(id,pp.key,pp.cur);
  }
  if(key===CHAIN_SOLO) for(const c of EXPR_CH) emit(EXPR_FX,c,exprCur[c]);   // ⚠️ EXPR_* объявлены НИЖЕ по файлу (рядом с applyExpr, где им и место). TDZ здесь не наступает: функцию зовут только в рантайме, из записи, — модуль к тому мигу вычислен целиком
}
/* ⛳ ЭФФЕКТ УБРАН ИЗ ЦЕПИ → ЗАМОЛКАЕТ; ВЕРНУЛИ → СНОВА ЗВУЧИТ. Ровно та операция, которую обещал
   комментарий выше («вместо разбора — уводим подмес в 0»), но которой НЕ СУЩЕСТВОВАЛО: снятый реверб
   продолжал звучать со своими параметрами, потому что hushUnassignedFx умеет гасить ТОЛЬКО старые
   скалярные (пишет state.fx[k]), а модуль ему недоступен — state до audio не дотягивается.
   ⚠️ ГАСИМ ПРИЦЕПКУ, А НЕ СЕТЬ. Уводим В НОЛЬ ПОСЫЛ — вход в сеть закрывается, новый сигнал не идёт, а
   УЖЕ НАБРАННЫЙ ХВОСТ ДОЗВУЧИВАЕТ и гаснет сам. Именно поэтому здесь setTargetAtTime (та же постоянная
   0.08, что у параметра «подмес»), а не разрыв связи и не value=0: рубильник обрезал бы хвост слышно —
   а хвост это то, ради чего реверб и берут (правило слайса 2.5 «снятый эффект замолкает» + довод 3.5.1
   «экземпляры не разбираем»). Выход сети в мастер НЕ трогаем — им хвост и доигрывает.
   ⚠️ p.cur НЕ ТРОГАЕМ: величина «подмеса» остаётся жить в параметре, поэтому возврат эффекта в цепь
   восстанавливает ПРЕЖНЮЮ громкость, а не ноль. Восстановление идёт тем же приёмом, что засев везде
   ещё с 2.6 — `setNorm(cur)`: узлы переписываются ИЗ СОХРАНЁННЫХ значений.
   ⚠️ ПРИ ВЫКЛЮЧЕНИИ ЭКЗЕМПЛЯР НЕ СОЗДАЁМ (голый поиск, без fxInstance): строить сеть FDN ради того,
   чтобы её тут же заглушить, — чистая растрата. Старый скалярный сюда попадёт как no-op (экземпляра у
   него нет и не будет), и это правильно: его гасит hushUnassignedFx, каждому своё. */
function fxSetActive(key,fxId,on){
  if(!AC) return;
  /* ⚠️ ВЕДЁМ gate, А НЕ send (с 3.7.2). У соло голоса приходят В gate напрямую, минуя send, — гашение
     через send оставило бы снятый реверб звучать у соло. gate стоит на входе сети и потому выключает
     ВСЕ источники роли разом, чем бы они ни были: шиной (аккорды) или голосами (соло). */
  const inst = on ? fxInstance(key,fxId) : (FX_INST[key] && FX_INST[key][fxId]);
  if(!inst) return;
  /* ⛔ У ГОЛОСОВОГО ЭФФЕКТА НЕТ gate, И ГАСИТЬ ЕГО НЕ НУЖНО: его величину читают ИЗ ЦЕПИ (см.
     fxChordBri), а снятый эффект из цепи уже пропал — чтение вернёт null, то есть нейтраль, само собой.
     Выключателю просто нечего выключать, и обращение к inst.gate здесь упало бы. */
  if(inst.kind==='voice') return;
  /* ⛔ ВСТАВКУ НЕ ГАСЯТ ЗАТВОРОМ (в.2). Она стоит В сухом ходе роли: «выключить» её нулём значило бы
     ЗАГЛУШИТЬ ВСЮ РОЛЬ. Снятая вставка становится ТОЖДЕСТВОМ (глубина 0, усиление 1) и остаётся в графе —
     экземпляры не разбираются (3.5.1). Затвора у неё и нет: обращение к inst.gate здесь упало бы. */
  if(inst.kind==='insert'){ inst.setActive(on); if(on) for(const p of inst.params) p.setNorm(p.cur); return; }
  inst.gate.gain.setTargetAtTime(on?1:0, AC.currentTime, 0.08);
  if(on) for(const p of inst.params) p.setNorm(p.cur);   // вернуть узлы из СОХРАНЁННЫХ значений (величина подмеса шины не терялась)
}
/* when — ЯВНОЕ время планирования (опережение лупера). По умолчанию AC.currentTime → живые вызовы
   БАЙТ-В-БАЙТ. Все внутренние setValueAtTime/setTargetAtTime идут на t=when, поэтому голос стартует
   ровно тогда, когда надо, а не «когда добежал кадр». */
function cvRelease(v,hard,when){ const t=when!=null?when:AC.currentTime;
  const tc=hard?0.02:(v.ins?v.ins.rel:0.3);
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setTargetAtTime(0,t,tc);
  if(v.owner) v.last=v.owner;   // AF2: чей хвост ещё звучит — срез на подмене (voicesCut) находит и отпущенные голоса дорожки
  v.owner=null;
  if(offline) v.freeAt=freeAfter(t);   // свободен с мига отпускания, как живьём (см. freeAfter): следующий аккорд снимет хвост, а не зазвучит поверх него
}
function cvAlloc(when){
  /* F2 — ОФЛАЙН: свободен тот, чей хвост уже отзвучал К МОМЕНТУ t, а не «сейчас». Нет такого — заводим
     новый голос: офлайн не крадёт, иначе аккорды молча теряли бы ноты (довод — у setOffline). */
  if(offline){ const t=when!=null?when:AC.currentTime;
    let v=cv.find(x=>x.freeAt<=t);
    if(!v) v=newChordVoice(E, chordBus);
    v.freeAt=Infinity; return v; }
  let v=cv.find(v=>!v.owner);
  if(!v && cv.length<CHORD_POOL_N) v=newChordVoice(E, chordBus);   // POOL1: grow before stealing (a burst larger than the spares)
  if(!v){ v=cv.reduce((a,b)=>a.tOn<b.tOn?a:b); const o=v.owner; cvRelease(v,true,when);   // кража: снять голос со старого владельца на ТО ЖЕ время
    if(o&&chordHold[o]){ const a=chordHold[o].filter(x=>x!==v); a.length?chordHold[o]=a:delete chordHold[o]; } }
  return v;
}
/* bri — ПЕР-СОБЫТИЙНАЯ яркость (глубина 0..1, 0=нейтраль), стоит ПЕРЕД when: when обязан оставаться
   ПОСЛЕДНИМ (планировщик-опережение зовёт chordOn(...,when) с явным временем). ИЗОЛЯЦИЯ ПО СЛОЯМ — от
   ключей владельца: живой аккорд = 'latch', слой петли = 'loop:'+layer, у каждого свои голоса пула →
   своё fb. Поэтому живая рука ФИЗИЧЕСКИ не может изменить яркость переигранного слоя (она пишет только
   голоса 'latch'), и наоборот. Ровно это и есть причина ухода с общей шины на пер-голосовой fb. */
/* POOL1: after a chord took voices, keep CHORD_POOL_SPARE idle ones built ahead — built in the next task, off the attack's path */
const cvFree=()=>cv.reduce((n,v)=>n+(v.owner?0:1),0);
function cvSpare(){
  if(!cvLive || cvTopT || cv.length>=CHORD_POOL_N || cvFree()>=CHORD_POOL_SPARE) return;
  cvTopT=setTimeout(()=>{ cvTopT=0; while(cv.length<CHORD_POOL_N && cvFree()<CHORD_POOL_SPARE) newChordVoice(E, chordBus); }, 0);
}
function chordOn(owner,freqs,vol,insIdx,bri,when){
  chordOff(owner,when);
  const ins=CHORD_INSTR[insIdx], t=when!=null?when:AC.currentTime, briHz=briToHz(bri);
  if(ins.strike){ const amp=ins.lvl*volAmp(vol);   // SND-F1: a struck timbre — silent pool voices hold the note, the strikes sound (ffStrike)
    chordHold[owner]=freqs.map(fr=>{ const v=cvAlloc(when); v.owner=owner; v.ins=ins; v.tOn=t; v.lvl=0; v.ffHz=fr; v.ffBri=bri;
      if(amp>0) ffStrike(E, owner,fr,amp,bri,TINE_PARTS.get(ins.id),t); return v; });
    cvSpare(); return; }   // bri==null (аранжировка/джем) → briToHz→CHORD_LP_MAX (открыт, нейтраль = сегодняшний звук)
  chordHold[owner]=freqs.map(fr=>{
    const v=cvAlloc(when); v.owner=owner; v.ins=ins; v.tOn=t;
    v.o1.type=ins.t1; v.o2.type=ins.t2;
    const hc=(rnd()*2-1)*HUM_CENTS*(ins.hj||0)*(DBG.noHum?0:1);   // (DBG.noHum — отладка на слух; число берётся всё равно) гуманизация высоты на голос (свежая, не хранится); одинаковый сдвиг обоих осц → интервал det цел; у органа/падов hj=0   // F1: rnd — подменяемый источник (умолчание Math.random, живьём байт-в-байт)
    v.o1.detune.setValueAtTime(-ins.det/2+hc,t); v.o2.detune.setValueAtTime(ins.det+hc,t);
    v.g1.gain.setValueAtTime(ins.m1,t); v.g2.gain.setValueAtTime(ins.m2,t);
    const fo=ins.fo||1, ft=ins.ft||0.02, fv=ins.fv||0;    // огибающая фильтра f + скорость→яркость (пол=lp: тихая нота не глохнет)
    const a=volAmp(vol);                                  // VOL-2b: ОДНА кривая громкости (config.volAmp) — амплитуда v²; прежде ins.lvl·(0.25+0.75·vol), 0 не был тишиной
    v.f.frequency.cancelScheduledValues(t); v.f.frequency.setValueAtTime(ins.lp*fo,t);
    v.f.frequency.setTargetAtTime(ins.lp*(1+fv*volVel('ch',a)),t,ft);   // скорость удара — прежнее число, выраженное через амплитуду (volVel): тише прежнего пола 25% — база фильтра
    v.fb.frequency.cancelScheduledValues(t); v.fb.frequency.setValueAtTime(briHz,t);   // яркость на АТАКЕ: голос ещё поднимает громкость с 0 → скачка cutoff не слышно
    v.o1.frequency.setValueAtTime(fr,t); v.o2.frequency.setValueAtTime(fr*ins.ratio,t);
    v.lvl=ins.lvl*a*(1-rnd()*0.05);   // −0..5% уровня — снять машинную ровность. VOL-2b: a = v² (на v=1 — ровно прежний ins.lvl·1)
    v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(0,t);
    v.g.gain.setTargetAtTime(v.lvl,t,ins.att*(0.9+rnd()*0.2));   // ±10% времени атаки
    v.tg.gain.cancelScheduledValues(t); v.tg.gain.setValueAtTime(ownerGain(owner),t);   // MX1: уровень дорожки владельца — с мига атаки (голос мог прийти от другой дорожки)
    routeAt(v,owner,t);   // AF5: live hands → live chain, tracks → track chain
    panSetAt(v.pan,ownerPan(owner),t);   // MX2: панорама дорожки владельца — тоже с мига атаки
    return v;
  });
  cvSpare();
}
const ffLive=[];   // strikes not yet over: { owner, g, t, g0, route, cancelled? }
const ffInfo=()=>ffLive.map(x=>({ owner:x.owner, t:x.t, route:x.route, cancelled:!!x.cancelled }));   // probes only
/* strikes of `owner` that begin at or after `when` never sound */
function ffCancel(owner,when){
  for(const x of ffLive) if(x.owner===owner && x.t>=when-1e-9){ x.g.gain.setValueAtTime(0, Math.min(when, x.t)); x.owner=null; x.cancelled=true; }
}
function chordGlide(owner,freqs,vol,bri,when){    // смена аккорда без переатаки — voice leading; bri ПЕРЕД when (when — последний, для планировщика)
  const vs=chordHold[owner]; if(!vs)return; const t=when!=null?when:AC.currentTime;
  const briHz=bri==null?null:briToHz(bri);       // bri==null (аранжировка/джем: chSet без яркости) → fb НЕ трогаем, остаётся с атаки
  vs.forEach((v,i)=>{ const fr=freqs[i]; if(fr==null)return;
    if(v.ins&&v.ins.strike){   // SND-F1: a struck note cannot glide — a new pitch is a new strike; volume and brightness only at a strike
      if(!(v.ffHz>0) || Math.abs(1200*Math.log2(fr/v.ffHz))>0.5){ v.ffHz=fr; if(bri!=null) v.ffBri=bri; const amp=v.ins.lvl*volAmp(vol); if(amp>0) ffStrike(E, owner,fr,amp,v.ffBri,TINE_PARTS.get(v.ins.id),t); }
      return; }
    v.o1.frequency.setTargetAtTime(fr,t,CHORD_GLIDE_TC);
    v.o2.frequency.setTargetAtTime(fr*v.ins.ratio,t,CHORD_GLIDE_TC);
    if(briHz!=null)v.fb.frequency.setTargetAtTime(briHz,t,0.05);   // яркость ведём setTargetAtTime → без щелчка; f (атака) не трогаем — расцеплены
    const L=v.ins.lvl*volAmp(vol);   // VOL-2b: та же кривая, что на атаке
    if(Math.abs(L-v.lvl)>0.003){ v.lvl=L; v.g.gain.setTargetAtTime(L,t,0.05); }
  });
}
function chordOff(owner,when){ if(ffLive.length) ffCancel(owner, when!=null?when:AC.currentTime); const vs=chordHold[owner]; if(!vs)return;
  vs.forEach(v=>cvRelease(v,false,when)); delete chordHold[owner]; }

/* ⛳ mkCtx — ФАБРИКА КОНТЕКСТА (слайс F0 дуги «ЗАМОРОЗКА»). Не задана — всё ровно как было: живой
   AudioContext, создаваемый в клике. Задана — ВЕСЬ движок строится против ЧУЖОГО контекста, и это
   ЕДИНСТВЕННАЯ строка, которой офлайн-рендер стоил живому пути. Передаёт её только render.js.
   ⚠️ ПРАВИЛО #1 НЕ НАРУШЕНО, хотя выглядит нарушенным. Гейт «AudioContext только в клике #startBtn»
   стоит из-за политики автовоспроизведения, а она касается ЖИВОГО контекста — того, что идёт в
   колонки. OfflineAudioContext ей не подчиняется вовсе: он ничего не воспроизводит, ему нечего
   разблокировать, и создаётся он много позже, по ЯВНОМУ действию человека («заморозить дорожку»).
   Живой гейт при этом цел — эта ветка его не трогает. ⛔ Не «чинить» обратно; см. правило #1 в CLAUDE.md,
   там та же оговорка записана.
   ⚠️ ПОВТОРНЫЙ ВЫЗОВ НА ОДНОЙ КОПИИ МОДУЛЯ СЕГОДНЯ НЕБЕЗОПАСЕН, и это работа слайса F3, не этого:
   пулы (cv/bv/lv) — модульные массивы, в которые buildChordPool/newLeadVoice ПУШАТ, а FX_INST/
   FX_CHAIN_* — модульные таблицы, которые fxInstance читает как готовые. Второй initAudio на той же
   копии НАКОПИЛ бы 24 лишних аккордовых голоса и вернул бы экземпляры эффектов, привязанные к УЖЕ
   МЁРТВОМУ контексту. Живого пути это не касается (initAudio зовётся ровно один раз), поэтому
   сбрасывать здесь ничего не стали — но офлайн-рендеру нужен СВЕЖИЙ контекст на каждый рендер
   (startRendering одноразов), значит F3 обязан добавить сюда явную очистку этих таблиц. */
async function initAudio(mkCtx){
  AC = mkCtx ? mkCtx() : new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  /* ⛳ СБРОС МОДУЛЬНЫХ ТАБЛИЦ (слайс F3, долг с F0) — ЧТОБЫ ОДНУ КОПИЮ МОДУЛЯ МОЖНО БЫЛО
     ИНИЦИАЛИЗИРОВАТЬ НЕСКОЛЬКО РАЗ, КАЖДЫЙ РАЗ ПРОТИВ СВЕЖЕГО КОНТЕКСТА.
     ⚠️ ЗАЧЕМ. У OfflineAudioContext startRendering ОДНОРАЗОВ, значит каждому рендеру нужен свой
     контекст. Без этого сброса второй initAudio на той же копии: (1) НАКОПИЛ бы ещё CHORD_POOL_N
     голосов в cv (buildChordPool ПУШИТ), (2) вернул бы из FX_INST экземпляры эффектов, чьи узлы
     принадлежат УЖЕ МЁРТВОМУ контексту, — и первая же пересборка пути упала бы на connect между
     контекстами. Обходной путь «своя копия модуля на каждый рендер» утекал ЦЕЛЫМ разобранным
     движком на каждую заморозку: модульная запись не выгружается никогда.
     ⛳ ЖИВЬЁ ЭТО NO-OP, И ЭТО ПРОВЕРЯЕМО: initAudio на живом пути зовётся РОВНО ОДИН раз (main.js
     под флагом `started`, demo.js под `if(!AC)`), поэтому к этой строке все таблицы ещё пусты —
     сбрасывать нечего, и ни одно значение не меняется.
     ⛔ ЭТО НЕ РАЗБОРКА УЗЛОВ И НЕ НАРУШЕНИЕ ПРАВИЛА #3: мы не останавливаем ни одного осциллятора.
     Старый контекст со всем своим графом просто становится недостижимым и уходит сборщику целиком —
     правило #3 про то, что внутри ЖИВОГО контекста узлы не выключают, а не про жизнь контекста.
     ⚠️ lv/leadHold объявлены НИЖЕ по файлу — к моменту ВЫЗОВА функции модуль вычислен целиком, TDZ
     не наступает (тем же приёмом здесь уже читается leadSum). */
  cv.length=0; bv.length=0; lv.length=0; banks.length=0;
  for(const k in chordHold) delete chordHold[k];
  for(const k in bassHold)  delete bassHold[k];
  for(const k in leadHold)  delete leadHold[k];
  for(const k in FX_INST)        delete FX_INST[k];
  for(const k in FX_CHAIN_HEAD)  delete FX_CHAIN_HEAD[k];
  for(const k in FX_CHAIN_OUT)   delete FX_CHAIN_OUT[k];
  for(const k in FX_CHAIN_LINKS) delete FX_CHAIN_LINKS[k];
  for(const k in FX_PLAY_PATH)   delete FX_PLAY_PATH[k];
  leadOutT=chordBusT=bassBusT=drumBusT=null;   // AF5: track heads exist only in the live copy (built below when !mkCtx)
  for(const k in FX_DIP_T){ if(FX_DIP_T[k]) clearTimeout(FX_DIP_T[k]); delete FX_DIP_T[k]; }   // ждущая пересборка старого контекста нам не нужна и сработать не должна
  FX_AIM.clear();
  ffLive.length=0;   // SND-F1: strikes of an earlier context are gone with it
  bldHum=null; bldVib=null;
  /* KS-ворклет грузим В НАЧАЛЕ (по-прежнему внутри клика — правило #1 цело), ДО buildLeadBanks,
     чтобы banks[] строился синхронно и не разъехался с LEAD_INSTR. Провал загрузки — не падаем:
     ставим запасные субтрактивные щипки в слоты Струна/Ситар. Путь — от корня страницы (не ES-import). */
  let ksOk=true;
  try{ await AC.audioWorklet.addModule('src/engine/worklets/ks-worklet.js'); }
  catch(e){ ksOk=false; console.warn('KS-ворклет не загрузился — ставлю запасные щипки:',e); }
  ksReady=ksOk;                                    // голоса пула строятся ЛЕНИВО, уже после initAudio — запоминаем результат загрузки
  /* AF6b: ХРАНИЛИЩЕ И ЧТЕЦ ЗАМОРОЖЕННЫХ ДОРОЖЕК (16 бит) — только ЖИВОЙ контекст: копии рендера чтец не нужен. Провал загрузки — не падаем:
     замороженные дорожки тогда держат прежний буфер Float32 и играют одноразовым источником (frzReady=false — recorder это видит). */
  frzReady=false; frzStoreNode=null;
  if(!offline){
    try{ await AC.audioWorklet.addModule('src/engine/worklets/frz-worklet.js');
         frzStoreNode=new AudioWorkletNode(AC,'frz-store',{numberOfInputs:0, numberOfOutputs:1});
         frzStoreNode.port.onmessage=e=>{ const m=e.data||{}; if(m.count){ const r=frzCountWait.get(m.id); if(r){ frzCountWait.delete(m.id); r(m.count); } } };
         frzSink=AC.createGain(); frzSink.gain.value=0; frzSink.connect(AC.destination);   // немой сток прямо в выход: тянется всегда (и когда проба снимает лимитер с выхода), звука не даёт
         frzReady=true; }   // ⚠️ 0 входов И 0 выходов Web Audio запрещает (NotSupportedError); выход есть, но не подключён — узел лишь держит порт
    catch(e){ console.warn('Ворклет замороженных дорожек не загрузился — они останутся во Float32:',e); }
  }
  /* Мастер: сумма → лимитер (жёсткий компрессор) → выход.
     Лимитер обязателен: аккорды + драйв + подложка легко клиппируют. */
  /* SND-F1b: live master = master → Glue (off by default) → makeup gain → OUR limiter → output (zero delay). The browser's compressor-
     limiter (6 ms lookahead) only as the fallback without the dynamics worklet, and in the render copy (whose end nobody hears: renders
     tap the master before it — offlineTapMaster). */
  dynReady=false; mGlue=mMake=mLim=null; limRed=0; limiter=null;
  try{ await AC.audioWorklet.addModule('src/engine/worklets/dyn-worklet.js'); dynReady=true; }
  catch(e){ console.warn('Dynamics worklet did not load — the browser limiter is used instead (6 ms later):',e); }
  if(!mkCtx && dynReady){ try{
      mGlue=dynNode(E, 'comp', { ...DYN_GLUE, makeup:MASTER_GLUE_MAKEUP, on:mGlueOn?1:0 }, true);
      mMake=AC.createGain(); mMake.gain.value=Math.pow(10, MASTER_MAKEUP_DB/20);
      mLim=dynNode(E, 'limit', { ...DYN_MASTER, on:mLimOn?1:0 }, true, true);
      mLim.port.onmessage=e=>{ const d=e.data||{}; if(Number.isFinite(d.red)) limRed=d.red; };
    } catch(e){ mGlue=mMake=mLim=null; console.warn('Dynamics nodes failed — the browser limiter is used instead:',e); } }
  if(mLim){ mGlue.connect(mMake); mMake.connect(mLim); mLim.connect(AC.destination); outLast=mLim; }
  else {
    limiter=AC.createDynamicsCompressor();
    /* the old emergency ceiling (fallback / render copy): threshold −6, knee 6, ratio 20, attack 10 ms (longer than a bass period), release 250 ms */
    limiter.threshold.value=-6; limiter.knee.value=6; limiter.ratio.value=20;
    limiter.attack.value=0.010; limiter.release.value=0.25;
    limiter.connect(AC.destination); outLast=limiter; }
  master=AC.createGain(); master.gain.value=MASTER_BASE*volAmp(masterLvl); master.connect(mGlue||limiter);
  meterAn=AC.createAnalyser(); meterAn.fftSize=1024; outLast.connect(meterAn);   // MX1: измеритель на выходе лимитера (только чтение; в выход не идёт)
 
  /* Общий ревербератор: СЕТЬ ЗАДЕРЖЕК С ОБРАТНОЙ СВЯЗЬЮ (FDN, см. buildFDN), у каждого источника свой
     send. Заменила конвольвер со случайным шумовым IR: у свёртки хвост ЗАПЕЧЁН в буфер, и живьём
     менялось только КОЛИЧЕСТВО посыла — длина и окраска стояли намертво. Здесь длина (обратная связь
     линий) и окраска (ФНЧ внутри петель) — настоящие AudioParam'ы; пока держим их константами REV_A,
     живьём по-прежнему рулит ТОЛЬКО глубина руки (Z) через send соло.
     ⚠️ ОБЩЕГО РЕВЕРБА БОЛЬШЕ НЕТ (Пласт 3.5.2): у соло и у аккордов теперь СВОИ экземпляры, каждый со
     своим посылом, своей длиной и своей окраской. Комната по умолчанию у них ОДИНАКОВАЯ (те же REV_A),
     а сумма двух одинаковых линейных сетей равна одной, в которую слили оба источника, — потому замена
     и не слышна. Разъехаться они могут только тогда, когда человек САМ разведёт их в меню, — ради чего
     всё и делалось.
     Реверб — ПЕРВЫЙ и пока ЕДИНСТВЕННЫЙ МОДУЛЬ ЭФФЕКТА (см. makeReverbFx): фабрика сама строит сеть и
     ставит decay/tone из REV_A в правильном порядке. Остальные четыре эффекта (драйв в голосе, вибрато в
     detune, тремоло вставкой, делей посылом) НЕ модуляризованы и живут ровно там, где жили. */
  /* ЭКЗЕМПЛЯР РЕВЕРБА РОЛИ СОЛО. Строим ЯВНО И ЗДЕСЬ, а не лениво, по двум причинам: реверб стоит в
     цепи соло ПО УМОЛЧАНИЮ (значит понадобится всё равно), и порядок постройки узлов обязан остаться
     прежним — сеть строится до соло-цепочки, к моменту прицепки посыла ниже она уже есть.
     Роли БЕЗ записей в цепи (бас, ударные) не строят ничего: fxInstance ленив, пустая цепь бесплатна. */
  fxInstance(CHAIN_SOLO,'reverb');   // O-1: .out в мастер БОЛЬШЕ НЕ ЦЕПЛЯЕМ — модуль стоит В цепи, и маршрут в мастер принадлежит её хвосту (fxChainIO)
 
  /* --- СОЛО-цепочка (как в версии 2) --- */
  /* ГЕНЕРАТОР вибрато — ОБЩИЙ (одна частота качания на весь инструмент), а вот ГЛУБИНА с Пласта 3.7.1
     ПЕР-ГОЛОСОВАЯ: vibLFO → v.vibDep → detune осцилляторов ЭТОГО голоса (цепляет mkOsc через bldVib).
     Правило #3 соблюдено: осциллятор заводится ОДИН раз и живёт до конца контекста; пер-голосовыми
     стали только ГЕЙНЫ. */
  vibLFO=AC.createOscillator(); vibLFO.frequency.value=5.5; vibLFO.start();
  /* Гуманизация высоты — ConstantSource в detune осцилляторов; на каждой атаке свежий случайный сдвиг
     ±HUM_CENTS·bank.hum, detune не трогается пофреймовой setFreq, поэтому сдвиг держится всю ноту.
     ⚠️ ОН ПЕР-ГОЛОСОВОЙ (v.hum, см. пул соло), а НЕ общий, как был: с пулом общий узел означал бы, что
     атака второй ноты перестраивает высоту первой, ещё звучащей. Здесь его больше не создаём. */
  /* ЖИВОСТЬ (энергия → вибрато): свой LFO шиммера. exprVibPitch → detune ВСЕХ лид-осц. (mkOsc цепляет ниже),
     глубина = энергия (пишет applyExpr, в пределах пары центов). ОТДЕЛЬНО от вибрато fx-руки (с 3.7.1 — пер-голосовой vibDep) — не
     дерутся, суммируются в detune. На реальном инструменте вибрато рождается из НЕПРЕРЫВНОГО усилия, а
     идеально статичный тон звучит МЁРТВО — так «смычок» кормит теперь ЖИЗНЬ, а не громкость. Создаём ДО
     построением голосов, чтобы mkOsc сразу цеплял exprVibPitch (как vibDep голоса). Живьём, в запись НЕ идёт. */
  const exprVibLFO=AC.createOscillator(); exprVibLFO.type='sine'; exprVibLFO.frequency.value=EXPR_A.vibHz;
  exprVibPitch=AC.createGain(); exprVibPitch.gain.value=0;   // глубина шиммера ВЫСОТЫ (центы), нейтраль 0 → detune += 0 (байт-в-байт)
  exprVibLFO.connect(exprVibPitch); exprVibLFO.start();

  /* ВХОД ШИНЫ СОЛО: сюда суммируются голоса пула (каждый со своим банком, шейпером, огибающей и
     громкостью — см. «ПУЛ ГОЛОСОВ»). Голоса строятся ЛЕНИВО, поэтому здесь ничего не строим: играющий
     одну ноту получит ровно один голос = ровно один банк (вместо прежних 23 сразу). */
  leadSum=AC.createGain(); leadSum.gain.value=1;
  const satSum=leadSum;

  /* ВЫРАЗИТЕЛЬНОСТЬ (рука-«смычок»): ЧЕТЫРЕ канала → ЧЕТЫРЕ РАЗНЫЕ оси (см. applyExpr): ЖИВОСТЬ (энергия→
     вибрато, выше), ВАУ (натяжение→резонансный пик), ТЕКСТУРА (размах→ХАРАКТЕР искажения), ПРОСТРАНСТВО
     (наклон→делей). Громкость больше НЕ здесь — она целиком у НОТНОЙ руки (vol ГОЛОСА, X-позиция): две руки не
     дерутся за одну величину. Все узлы ниже НЕЙТРАЛЬНЫ по умолчанию (gain 1 или 0, wah при 0дБ — плоский
     тождественный биквад) → без руки соло-цепочка БИТ-В-БИТ как сегодня.
     Огибающая (env) и громкость X (vol) ушли В ГОЛОС пула: у каждой руки свой X и своя нота, делить их
     одним узлом больше нельзя. Порядок внутри голоса тот же — шейпер → env → vol, — поэтому одна нота
     звучит как раньше; сюда голоса приходят уже суммой (leadSum). */
  /* ЖИВОСТЬ (амплитудная часть шиммера): exprGain = ЕДИНИЦА (база), её .gain МОДУЛИРУЕТ vibrato-LFO через
     exprVibAmp (глубина=энергия). applyExpr сам exprGain НЕ пишет (громкость ушла нотной руке). Нейтраль:
     exprVibAmp=0 → exprGain держит ровно 1 (тождество). Пара к exprVibPitch (высотная часть, в detune). */
  const exprGain=AC.createGain(); exprGain.gain.value=1;
  satSum.connect(exprGain);
  exprVibAmp=AC.createGain(); exprVibAmp.gain.value=0;
  exprVibLFO.connect(exprVibAmp); exprVibAmp.connect(exprGain.gain);

  /* ТЕКСТУРА (размах пальцев → ХАРАКТЕР искажения, НЕ количество): ДВА шейпера параллельно — МЯГКИЙ (тёплый,
     makeSatCurve) и ЖЁСТКИЙ (грязный, makeHardCurve). Размах морфит МИКС между ними: щепоть=тёплое, веер=грязное
     (разный РОД искажения). exprSatLP после ГАСИТ добавленные верхи → «грязнее», а НЕ «ярче» (в этом и была
     жалоба на текстуру). Сухой всегда полный (параллель). Нейтраль: обе влажные=0 → только сухой = тождество. */
  const softShaper=AC.createWaveShaper(); softShaper.curve=makeSatCurve();  softShaper.oversample='2x';
  const hardShaper=AC.createWaveShaper(); hardShaper.curve=makeHardCurve(); hardShaper.oversample='4x';
  const exprSatLP=AC.createBiquadFilter(); exprSatLP.type='lowpass'; exprSatLP.frequency.value=2500;   // грязь ≠ ярче
  const exprSatDry=AC.createGain(); exprSatDry.gain.value=1;
  exprSatSoftG=AC.createGain(); exprSatSoftG.gain.value=0;
  exprSatHardG=AC.createGain(); exprSatHardG.gain.value=0;
  const exprSatWetSum=AC.createGain(), exprSatSum=AC.createGain();
  exprGain.connect(exprSatDry); exprSatDry.connect(exprSatSum);
  exprGain.connect(softShaper); softShaper.connect(exprSatSoftG); exprSatSoftG.connect(exprSatWetSum);
  exprGain.connect(hardShaper); hardShaper.connect(exprSatHardG); exprSatHardG.connect(exprSatWetSum);
  exprSatWetSum.connect(exprSatLP); exprSatLP.connect(exprSatSum);

  /* ГЕНЕРАТОР тремоло — ОБЩИЙ, как и у вибрато; сама ВСТАВКА (trem + tremDep) с 3.7.1 живёт В ГОЛОСЕ,
     после громкости и перед посылом в делей — тем же порядком, каким стояла на шине. */
  tremLFO=AC.createOscillator(); tremLFO.frequency.value=4; tremLFO.start();
  /* ВАУ (натяжение → частота резонансного пика): высокодобротный PEAKING-биквад — резонансный пик, который
     ПРОБЕГАЕТ частоту вслед за раскрытием ладони (раскрыто = пик вверх, кулак = вниз). Громче/яснее фейзера,
     физически читаемо — рука ведёт «голос» звука. Peaking (а не чистый bandpass в разрыв: тот истончил бы
     тон) — пропускает ВЕСЬ сигнал, поднимает одну полосу. Нейтраль: подъём 0дБ → peaking-биквад ПЛОСКИЙ
     (тождество), поэтому без руки байт-в-байт. Частота/Q/подъём — EXPR_A (крутить на слух). */
  exprWah=AC.createBiquadFilter(); exprWah.type='peaking'; exprWah.frequency.value=EXPR_A.wahLo; exprWah.Q.value=EXPR_A.wahQ; exprWah.gain.value=0;
  const leadOut=AC.createGain(); leadOut.gain.value=LEAD_OUT_G;   // сухая громкость соло; с O-1 это ГОЛОВА цепи соло — вся обработка стоит после неё
  exprSatSum.connect(exprWah); exprWah.connect(leadOut);          // тремоло из этого разрыва УШЛО В ГОЛОС (3.7.1) — вставка стала пер-голосовой
  dbgExprIO={ leadSum, exprGain, leadOut };                        // отладка на слух: концы стадии выразительности — чтобы копия рендера могла её ОБОЙТИ (dbgExprBypass). Живьём никто не читает

  /* ⛳ O-1: ДЕЛЕЙ СОЛО СТОИТ В ЦЕПИ, А НЕ НА ПОСЫЛЕ. Прежде было три поколения одной идеи: leadOut→dly→
     dlyWet→master (общий подмес на выходе), затем v.dlySend→dly→master (пер-нотный посыл в обход шины).
     Теперь линия — ВЛАЖНАЯ ВЕТВЬ ВРЕЗКИ, стоящей на своём месте в порядке цепи, а сухое идёт мимо неё
     внутри того же модуля. Константы не тронуты (0.35 с, повторы 0.45), уровень входа тот же (влажная
     доля берётся ПОСЛЕ leadOut, где LEAD_OUT_G уже применён, — прежде тот же множитель вносился в посыл
     руками). ⚠️ ЭКЗЕМПЛЯР СТРОИМ ЗДЕСЬ, а не лениво: он в цепи соло ПО УМОЛЧАНИЮ, и порядок постройки
     узлов обязан остаться прежним. */
  /* ⛔ ЛИНИЮ НА ЗАВОРОТЕ ПЕТЛИ НЕ ЧИСТИМ, И ЭТО НЕ БАГ. Хвост, набранный к концу круга, звенит над
     началом следующего — так делей и устроен: он не знает, где у петли шов. Промывка на завороте
     (обнуление обратной связи или пересоздание линии) дала бы СЛЫШНЫЙ ОБРЫВ на каждом повторе и заодно
     срезала бы эхо живой ноты, взятой через границу. Тот же довод, что у 3.5.1 про хвост реверба.
     ⚠️ НЕ ПУТАТЬ С БАГОМ, КОТОРЫЙ ЧИНИЛСЯ ФЛАГОМ fresh (см. applyVoiceFx): там ПЕРВАЯ НОТА ПОВТОРА
     САМА уходила в делей на уровне предыдущей. Отличить на слух просто: «дозвон хвоста» — это эхо
     ПОСЛЕДНИХ нот круга, а тот баг давал эхо САМОЙ первой ноты. */
  fxInstance(CHAIN_SOLO,'dly');   // O-1: как и реверб — только построить; место в цепи и маршрут в мастер даёт пересборка
  /* O-1: leadOut.connect(master) СНЯТ — сухое соло идёт СКВОЗЬ цепь. Прямая связь в мастер означала бы
     обход эффектов, то есть возврат к параллельным посылам.
     ⚠️ КОНЦЫ РЕГИСТРИРУЕМ ПОСЛЕ ОБОИХ ЭКЗЕМПЛЯРОВ — чтобы путь собрался ОДИН раз и начисто. Порядок не
     обязателен (пересборка идёт по обоим путям), но так на старте не возникает лишнего провала. */
  fxChainIO(CHAIN_SOLO,leadOut);   // концы отрезка соло: голова — leadOut, хвост создаёт и цепляет к мастеру сама функция
  if(!mkCtx){ leadOutT=AC.createGain(); leadOutT.gain.value=LEAD_OUT_G; fxChainIO(trackChainKeyOf(CHAIN_SOLO),leadOutT); }   // AF5: the solo TRACK head (after a neutral expression stage = the same gain)
 
  /* ⛳ O-1: ПЕР-НОТНЫХ ПОСЫЛОВ СОЛО БОЛЬШЕ НЕТ, и revBus/dlyBus удалены вместе с ними. У соло, аккордов,
     баса и ударных теперь ОДИН закон: голоса складываются, сумма идёт сквозь цепь. Довод целиком — в
     шапке newLeadVoice; цена (записанные соло-слои теряют пер-нотную автоматику) названа там же. */
  /* ПРОСТРАНСТВО (наклон ладони → ЭХО): ОТДЕЛЬНАЯ линия ДЕЛЕЯ руки-выразительности — НЕ реверб, чтобы читалось
     как ЭХО, а не как комната, которую уже даёт реверб fx-руки. Своя линия + обратная связь + посыл, ДОБАВОЧНО к
     делею fx-руки (линия в его экземпляре), чьи значения она НЕ читает и НЕ пишет. Нейтраль: посыл 0.
     ⚠️ O-1: она берёт сигнал с leadOut, то есть ДО цепи, и в пересборку не входит — fxUnlink снимает
     только СВОИ связи, поимённо, ради этой самой соседки. */
  const exprDlyLine=AC.createDelay(1); exprDlyLine.delayTime.value=0.28;
  const exprDlyFb=AC.createGain(); exprDlyFb.gain.value=0.4; exprDlyLine.connect(exprDlyFb); exprDlyFb.connect(exprDlyLine);
  exprDlyWet=AC.createGain(); exprDlyWet.gain.value=0;
  leadOut.connect(exprDlyLine); exprDlyLine.connect(exprDlyWet); exprDlyWet.connect(master);

  /* --- АККОРДЫ: сухая шина + СВОЯ ЦЕПЬ ЭФФЕКТОВ (с Пласта 3.5.2; прежде — фиксированный send) ---
     Z-ЯРКОСТЬ живёт ПЕР-ГОЛОСОВО (фильтр fb каждого голоса, см. buildChordPool), а НЕ на этой шине:
     общий фильтр не смог бы дать разным слоям петли РАЗНУЮ яркость. Поэтому шина снова простая. */
  chordBus=AC.createGain(); chordBus.gain.value=0.28;   // O-1: .connect(master) СНЯТ — сухое идёт сквозь цепь (fxChainIO ниже)
  /* ЦЕПЬ ЭФФЕКТОВ РОЛИ АККОРДОВ (Пласт 3.5.2) — та же форма прицепки, что у соло:
       chordBus → inst.send → inst.in → … → inst.out → master,
     а сухой ход chordBus→master остаётся как был. Прежде здесь стоял ФИКСИРОВАННЫЙ посыл revCh=0.12 в
     общий реверб; теперь тот же посыл принадлежит СВОЕМУ экземпляру и виден в меню как параметр
     «подмес» первой записи цепи аккордов.
     ⚠️ СТАРТОВЫЙ ПОДМЕС РАВЕН В ТОЧНОСТИ ПРЕЖНЕМУ revCh, и это КРИТЕРИЙ ПРИЁМКИ этого слайса: хвост
     аккордов обязан звучать как сегодня. Экземпляр строится с ОБЩИМ дефолтом подмеса (0.25 — он был
     заведён для СОЛО), поэтому величину аккордов вносим здесь ЯВНО. Идём через setNorm(fxNorm(...)),
     а НЕ через p.set(0.12): p.set написал бы узел, но НЕ обновил p.cur — и меню показывало бы одно,
     а звучало бы другое (латч и показ обязаны совпадать).
     ⚠️ Длина и окраска НЕ трогаются: экземпляр берёт те же REV_A, что и соло. Именно это делает
     замену общего реверба на два одинаковых НЕСЛЫШНОЙ — сеть линейна, и сумма двух одинаковых сетей
     равна одной. Разойдись константы — довод рухнет, и хвост изменится. */
  const CH_REV_SEND=0.12;                       // историческое значение revCh: величина ПРИЦЕПКИ аккордов, а не свойство комнаты (потому и не в REV_A)
  /* ⛳ ГРАНИЦА РОЛЕВОГО И КЛЮЧЕВОГО МИРОВ (слайс O-0), и она проходит ЗДЕСЬ, при постройке графа.
     Шины строятся под роли — chordBus ЕСТЬ шина аккордов, — поэтому владельца цепи надо НАЗВАТЬ, и он
     называется единственным законным способом: литералом роли, отданным РЕЗОЛВЕРУ. Ключом ни одна из
     этих строк не распоряжается, и ниже по течению (fxResplice/fxInstance/fxSnapshot/жест/меню) роли уже
     нет вовсе. Когда цепь переедет к тембру, правка — ровно в этих вызовах chainKeyOf, по одной строке. */
  const revChI=fxInstance(chainKeyOf('ch'),'reverb');
  { const mp=revChI.params.find(p=>p.key==='mix'); if(mp) mp.setNorm(fxNorm(mp,CH_REV_SEND)); }
  /* ⚠️ АККОРДЫ ТЕПЕРЬ РЕГИСТРИРУЮТ ШИНУ, как бас и ударные (слайс в.1). Прежде здесь стояла явная строка
     chordBus.connect(revChI.send); revChI.out.connect(master) — и кроме реверба к аккордам не мог
     прицепиться НИ ОДИН шинный эффект. Теперь маршрут строит fxChainIO/fxResplice: chordBus → реверб →
     хвост → мастер. ⛳ ЗВУК АККОРДОВ ЭТИМ СЛАЙСОМ НЕ МЕНЯЕТСЯ, и это проверяемо: в их цепи РОВНО ОДИН
     сигнальный эффект (вторая запись — яркость, у неё узлов нет вовсе), а врезка с одним эффектом отдаёт
     dry + сеть(dry·mix)·0.9 — то же выражение теми же узлами, что прежде давала параллельная пара.
     ⛔ Явную строку chordBus.connect(master) НЕ возвращать: сухое пошло бы в обход цепи. */
  fxChainIO(chainKeyOf('ch'),chordBus);
  if(!mkCtx){ chordBusT=AC.createGain(); chordBusT.gain.value=chordBus.gain.value; fxChainIO(trackChainKeyOf(chainKeyOf('ch')),chordBusT); }   // AF5
  cvSeed.length=0; if(!cvNaiveDbg) for(let i=0;i<CHORD_POOL_N;i++) cvSeed.push(rnd());   // POOL1: the draws the eager pool made here, kept by index
  cvLive=!mkCtx; if(cvTopT){ clearTimeout(cvTopT); cvTopT=0; }
  buildChordPool(E, chordBus, cvEagerDbg ? CHORD_POOL_N : cvLive ? CHORD_POOL_FIRST+CHORD_POOL_SPARE : 0);
 
  /* --- БАС: пул моно-голосов (слой + живой), общая шина в master --- */
  bassBus=AC.createGain(); bassBus.gain.value=0.28;   // O-1: в мастер ведёт хвост цепи (fxChainIO), а не прямая связь
  /* ЦЕПЬ ЭФФЕКТОВ РОЛИ БАСА (Пласт 3.5.3) — только РЕГИСТРИРУЕМ шину. Цепь баса пуста по умолчанию,
     поэтому СЕЙЧАС не строится и не цепляется НИЧЕГО: бас идёт в мастер сухим, байт-в-байт как всегда.
     Первый добавленный в меню эффект построит свой экземпляр и встанет в путь сам (см. fxInstance/fxResplice). */
  fxChainIO(chainKeyOf('bs'),bassBus);
  if(!mkCtx){ bassBusT=AC.createGain(); bassBusT.gain.value=bassBus.gain.value; fxChainIO(trackChainKeyOf(chainKeyOf('bs')),bassBusT); }   // AF5
  /* P1: пул баса ЛЕНИВЫЙ — голоса строит bvAlloc по мере надобности (newBassVoice), как соло. Прежде здесь строились
     BASS_POOL_N голосов сразу. bv при этом пуст (сброс таблиц выше), и офлайн-копия растит его так же, с нуля. */

  /* --- УДАРНЫЕ: своя шина в master (сухая; своя цепь эффектов — с Пласта 3.5.4, по тому же закону) --- */
  drumBus=AC.createGain(); drumBus.gain.value=0.20;   // O-1: в мастер ведёт хвост цепи (fxChainIO), а не прямая связь
  if(!mkCtx){ drumBusT=AC.createGain(); drumBusT.gain.value=drumBus.gain.value; fxChainIO(trackChainKeyOf(chainKeyOf('dr')),drumBusT); }   // AF5
  fxChainIO(chainKeyOf('dr'),drumBus);   // как у баса: пустая цепь → путь вырождается в «голова → хвост → мастер», ударные сухие до первого добавленного эффекта

  /* --- ДРОН: расстроенная пара пил через медленный НЧ-фильтр, на тонике (шина в master) ---
     ⛔ ДРОН НЕ РЕГИСТРИРУЕТСЯ КАК РОЛЬ, и это осознанно, а не пропуск. Роль — то, ЧЕМ ИГРАЮТ (соло,
     аккорды, бас, ударные): у неё есть кнопка выбора, функции рук, своя цепь в меню. Дрон же — фон,
     который включают тумблером; выбрать его в конструкторе нельзя (FX_ROLE_SEQ его не содержит),
     значит и цепь ему некому править. Остаётся сухим — намеренно. */
  backBus=AC.createGain(); backBus.gain.value=0.28; backBus.connect(master);
  dO1=AC.createOscillator(); dO1.type='sawtooth'; dO1.frequency.value=tonicFreq(dv())/2;         // tonicFreq: у fixedKey — ФИКСИРОВАННАЯ высота ключа (не бьётся с сеткой); у прочих = baseF()
  dO2=AC.createOscillator(); dO2.type='sawtooth'; dO2.frequency.value=droneSecondHz(dv());       // вторая струна — СОБСТВЕННАЯ высота строя (квинта лада, иначе кварта/септима/период; scales.droneDegree), а не ×1.498. Уровень, тембр и фильтр — прежние
  const dLP=AC.createBiquadFilter(); dLP.type='lowpass'; dLP.frequency.value=520;
  const dLFO=AC.createOscillator(); dLFO.frequency.value=0.06;
  const dLFOg=AC.createGain(); dLFOg.gain.value=260;
  dLFO.connect(dLFOg); dLFOg.connect(dLP.frequency); dLFO.start();
  dG=AC.createGain(); dG.gain.value=0;
  dO1.connect(dLP); dO2.connect(dLP); dLP.connect(dG); dPan=makePanStage(E, dG,backBus);   // MX2: панорама дорожки дрона — за его гейтом, до шины подложки (ставит dronePan)
  dO1.start(); dO2.start();
 
  noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
  /* ⛳ БУФЕР ШУМА — ГЕНЕРИРУЕМ, А НЕ ХРАНИМ. Он набивается ЗДЕСЬ, то есть ВНУТРИ initAudio, поэтому
     посев `rnd` ДО офлайн-инициализации покрывает его даром: ни капать буфер в запись, ни таскать
     176 КБ float'ов на каждый рендер не нужно. ⚠️ Порядок несущий — setRnd обязан быть позван РАНЬШЕ
     initAudio (см. render.js), иначе шум разойдётся между рендерами, а его читает КАЖДЫЙ ударный с
     шумовой составляющей (снейр/клэп/хэт/крэш) — то есть почти вся ритм-секция. */
  { const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=rnd()*2-1; }
}
/* ⚠️ ЗДЕСЬ ТОЛЬКО ИНДЕКС. Кроссфейда всех 23 банков больше нет, и переигранный слой больше не зовёт
   setLeadInstr(a.inst) (он УВОДИЛ живой инструмент вместе с кнопкой в панели — см. ENG.leadOn в recorder).
   ⛔ НО ЗВУЧАЩАЯ НОТА СОЛО ВСЁ ЖЕ ПЕРЕЛИВАЕТСЯ — ПРЕЖНЯЯ ПОДПИСЬ ЗДЕСЬ («тембр печётся на атаке») БЫЛА
   НЕВЕРНА: живой путь зовёт leadOn КАЖДЫЙ КАДР с живым индексом, и leadVoiceBank кроссфейдит банки ГОЛОСА
   за 20 мс. Пользователь считает это правильным. Запись пишет это ведением с a.inst, переигровка повторяет
   (leadSet). У баса и аккордов тембр действительно печётся на атаке. */
function setLeadInstr(i){
  setLeadIdx(((i%LEAD_INSTR.length)+LEAD_INSTR.length)%LEAD_INSTR.length);
  if(!AC)return;
  hooks.leadInstr && hooks.leadInstr(leadIdx);
}
/* ЭФФЕКТЫ соло — ТЕПЕРЬ ПЕР-ГОЛОСОВЫЕ (Пласт 3.7.1). Раньше здесь стояла ОБЩАЯ запись в узлы шины
   (vibGain/tremGain/tremDepth/dlyWet) плюс РАССЫЛКА драйва во ВСЕ живые голоса циклом по lv. Это и было
   причиной того, что эффекты не были пер-слойными: последний писавший — живая рука или ЛЮБАЯ переигранная
   нота петли — задавал глубину сразу всем. ⛳ Заодно это та самая «шероховатость общей шины», записанная
   ещё в 2.6 («играющая петля перетирает живые dly/vib/drv/trm»): общего писателя больше НЕТ.
   ⚠️ ФУНКЦИЯ ОСТАЛАСЬ И ИМЯ ОСТАЛОСЬ: её зовёт recorder (ENG.leadOn/leadSet) НЕПОСРЕДСТВЕННО ПЕРЕД
   голосовым вызовом той же ноты — и живьём, и на переигровке. Поэтому она просто КЛАДЁТ величины этой
   ноты в pendFx, а забирает их leadOn/leadSet в СВОЙ голос. Формат события не тронут: поля
   vib/drv/trm/dly читаются оттуда же, откуда читались.
   ДРАЙВ по-прежнему ИСКЛЮЧЕНИЕ ПО МЕСТУ: сатурация стоит ДО огибающей (bank → shaper → env → vol), а tanh
   нелинеен, поэтому env·tanh(x) ≠ tanh(env·x) — шейпер обязан жить В ГОЛОСЕ. Теперь по-голосовыми стали
   и остальные три, но по ДРУГОЙ причине: не из-за нелинейности, а ради пер-слойности. */
function applyFx(m){
  /* ⚠️ R2 — КАРТЫ МОЖЕТ НЕ БЫТЬ, И ЭТО НЕ «НЕЙТРАЛЬ». События АРАНЖИРОВКИ (arrange.js строит нагрузку
     руками) карты не несут вовсе. Прочти их как нули — и ВЕСЬ ДЖЕМ СТАНЕТ СУХИМ. Отсутствие карты
     значит «звучи ТЕКУЩЕЙ цепью роли», ровно как эти события звучали до 3.7.2. */
  const s = m || fxSnapshot(CHAIN_SOLO);   // O-0: цепь соло — ИМЕНОВАННОЙ константой (см. CHAIN_SOLO в state): здесь она названа потому, что pendFx и есть соло-путь
  pendFx.vib=s['vib:'+FX_AMT]||0; pendFx.drv=s['drv:'+FX_AMT]||0;
  { const b=fxBriOf(s); pendFx.bri = b==null ? null : b; }   // ЯРКОСТЬ ноты — из той же карты; нет в карте → «не задана», звук как сегодня (правило соло для карты целиком — R2 выше — не меняется)
  pendFx.trm=s['trm:'+FX_AMT]||0;   // «Тремоло (нота)» — скаляр, ключ 'trm:amt' не менялся и после в.2. «Тремоло (микс)» в карту не пишется вовсе: его глубина не прицепочная (см. makeTremMixFx)
  /* ⛳ V4: СКОЛЬЖЕНИЕ ЭТОЙ НОТЫ — ВОЗВРАЩАЕМ, а не кладём в pendFx: оно не свойство голоса (узла под него нет), а
     АРГУМЕНТ вызова leadOn/leadSet (V1), и передаёт его ENG — он же знает, живой ли это кадр терменвокса (тогда не
     передаёт вовсе). Та же карта s, что у драйва/вибрато: запись нет → текущая цепь соло (правило соло, R2 выше);
     карта есть, а скольжения в ней нет (всё записанное до V4) → undefined, «не задано», умолчание движка. */
  return fxGlideOf(s);
  /* ⛳ O-1: КЛЮЧИ 'reverb:mix' И 'dly:mix' БОЛЬШЕ НЕ ЧИТАЮТСЯ, И ЭТО НЕ ЗАБЫВЧИВОСТЬ. Реверб и делей
     обрабатывают СУММУ голосов, значит исполнить пер-нотную величину физически некому. Вместе с чтением
     снят и флаг attach у обоих (см. REV_PARAMS/DLY_PARAMS): иначе снимок продолжал бы класть их в карту,
     а дельта-сжатие (fxChanged сравнивает ВСЮ карту) рождало бы лишний leadSet на каждый шаг ручки —
     события, не меняющие ни одного звука. Ровно тот довод, по которому глубина шинного тремоло attach
     не получала никогда.
     ⛳ ЧТО ДЕЛАЕТ СТАРАЯ ЗАПИСЬ. Событие, записанное ДО этого слайса, несёт в a.fx пять ключей; читаются
     ТРИ (vib/drv/trm), два лишних просто игнорируются — не ошибка, не тишина, не удвоение. Слой играет,
     его драйв, вибрато и пер-нотное тремоло переигрываются как прежде, а реверб и делей звучат так, как
     стоит ЖИВАЯ цепь. Это и есть названная цена решения. */
}
/* ВЫРАЗИТЕЛЬНОСТЬ → звук. gestures прогнал признаки через резонатор/пружину (вся «жизнь» там) и шлёт СГЛАЖЕННЫЕ
   каналы 0..1 + engage. Мэппинг канал→узел (глубины/диапазоны) — по EXPR_A (числа стороны звука). Через
   setTargetAtTime (не прямое присваивание — то слышно как щелчок). ЧЕТЫРЕ РАЗНЫЕ оси, в этом весь смысл:
   en — ЖИВОСТЬ (энергия→вибрато высоты+амплитуды; НЕ громкость — та у нотной руки), ten — ВАУ (натяжение→частота
   пика), spr — ТЕКСТУРА (размах морфит МЯГК.↔ЖЁСТК. искажение — характер, не количество), ori — ПРОСТРАНСТВО
   (наклон→делей). Всё гейтится engage (нет руки → 0/тождество). Свои узлы — эффекты fx-руки не читают/не пишут. */
/* ═══ КАНАЛЫ ВЫРАЗИТЕЛЬНОСТИ — ОБЪЯВЛЕННАЯ ТАБЛИЦА (слайс O-2) ═══
   ⛳ ЗАЧЕМ ОНА ПОЯВИЛАСЬ. Рука-выразительность казалась НЕЗАПИСЫВАЕМОЙ: у неё резонатор, пружины,
   накопленное состояние — «динамическую систему в событие не положишь». Это верно и не к делу: вся
   динамика живёт ВЫШЕ ПО ТЕЧЕНИЮ, в gestures (tickExpr), а СЮДА переходит горсть обычных скаляров.
   Записать надо их — ровно как у терменвокса записывается не «живые Гц», а СНЯТАЯ КРИВАЯ (правило #11).
   ⛔ ПРАВИЛО #23 НЕ ОСЛАБЛЕНО: оно запрещает руке-выразительности писать в СОБЫТИЕ, и она по-прежнему
   не пишет — захват идёт в ДОРОЖКУ АВТОМАТИЗАЦИИ, которая не событие и в массив событий не входит.
   ⚠️ ЧЕСТНАЯ ОГОВОРКА, которую обязан знать будущий рендер: выразительность принадлежит ИНСТРУМЕНТУ, а
   не дорожке (владеет ею последняя двинувшаяся рука, узлы стоят на соло-шине). Поэтому пока пишется одно
   взятое, её слышат и ОСТАЛЬНЫЕ звучащие дорожки. Пер-дорожечный рендер по этой дорожке воспроизведёт
   то, С ЧЕМ ИГРАЛИ ИМЕННО ЕЁ, — это верно, но не тождественно тому, что слышала комната. */
const EXPR_FX='expr';                                   // ⚠️ СТАБИЛЬНЫЙ id (правило #25), как у эффектов цепи; в FX_FACTORY его НЕТ — это не эффект цепи, у него нет ни узлов входа, ни настроек, только движение
const EXPR_CH=['live','wah','text','space','engage'];   // ОБЪЯВЛЕНИЕ: по нему идёт захват. Добавил канал сюда — он пишется сам
const exprCur={live:0,wah:0,text:0,space:0,engage:0};   // последнее применённое; ЕДИНСТВЕННЫЙ писатель — applyExpr ниже
function applyExpr(en,ten,spr,ori,eng,tc){ if(!AC)return; const t=AC.currentTime;
  exprCur.live=en; exprCur.wah=ten; exprCur.text=spr; exprCur.space=ori; exprCur.engage=eng;   // O-2: снимок ДЛЯ ЗАХВАТА. Звука не касается — ниже всё как было
  exprVibPitch.gain.setTargetAtTime(en*eng*EXPR_A.vibCents,t,tc);   // ЖИВОСТЬ: шиммер ВЫСОТЫ (±центы, живьём, в запись НЕ идёт)
  exprVibAmp.gain.setTargetAtTime(en*eng*EXPR_A.vibAmp,t,tc);       // ЖИВОСТЬ: шиммер АМПЛИТУДЫ (модулирует exprGain база 1)
  exprWah.frequency.setTargetAtTime(EXPR_A.wahLo*Math.pow(EXPR_A.wahHi/EXPR_A.wahLo,ten),t,tc);   // ВАУ: пик пробегает lo..hi (лог) по натяжению
  exprWah.gain.setTargetAtTime(eng*EXPR_A.wahBoost,t,tc);           // ВАУ: подъём дБ (0 без руки → плоский)
  exprSatSoftG.gain.setTargetAtTime(eng*(1-spr)*EXPR_A.soft,t,tc);  // ТЕКСТУРА: щепоть → тёплое (мягкий шейпер)
  exprSatHardG.gain.setTargetAtTime(eng*spr*EXPR_A.hard,t,tc);      // ТЕКСТУРА: веер → грязное (жёсткий шейпер)
  exprDlyWet.gain.setTargetAtTime(ori*eng*EXPR_A.spaceMax,t,tc);    // ПРОСТРАНСТВО: посыл в делей (эхо)
}
/* ================= СОЛО: ПУЛ ГОЛОСОВ (было — ОДИН моно-голос) =================
   Устройство ровно как у аккордов (cv/chordHold): голоса + владельцы, изоляция по КЛЮЧУ ВЛАДЕЛЬЦА.
   Живой голос руки = 'lead:L'/'lead:R', переигранный слой = 'leadloop:N:v' — поэтому живая игра и
   переигровка БОЛЬШЕ НЕ ДЕРУТСЯ за один голос (та же развязка, что 'latch' vs 'loop:N' у аккордов).
   ОТЛИЧИЕ ОТ АККОРДОВ, важное: аккордовый голос УНИВЕРСАЛЕН (два осциллятора, перенастраиваются на
   атаке), а соло-банки структурно разные (5-осцилляторный орган, FM-пара, KS-ворклет). Поэтому голос
   строит СВОЙ банк — и только тот, которым играет (см. buildLeadBank). Лениво: кто не играет вторую
   ноту, за второй голос не платит.
   ЧТО В ГОЛОСЕ, А ЧТО НА ШИНЕ (порядок узлов внутри голоса — прежний, до последнего звена):
     голос: банк → satDry/satWet(шейпер) → satSum → env → vol → leadSum   (+ свой hum в detune)
     шина:  leadSum → exprGain → expr-шейперы → вау → тремоло → leadOut → делей/реверб
   Драйв в голосе — не прихоть, см. applyFx. Огибающая и громкость X — очевидно в голосе (у каждой руки
   свой X). А вот ГУМАНИЗАЦИЯ: раньше humDetune был ОДИН на всю цепочку и переписывался на каждой атаке.
   ⚠️ С пулом это стало бы БАГОМ: вторая атака перестроила бы высоту ПЕРВОЙ, ещё звучащей ноты. Поэтому
   ConstantSource гуманизации — ПЕР-ГОЛОСОВОЙ (v.hum), и mkOsc цепляет именно его (bldHum).
   ⛔ НЕ возвращать общий humDetune и НЕ строить все банки в голосе. */
const lv=[]; const leadHold={};            // голоса пула и владельцы (ключ → голос)
/* ⛳ РАЗМЕРЫ ПУЛОВ — ЧИСТОЕ ЧТЕНИЕ ДЛЯ ОТЧЁТА (слайс A0 дуги «АВТОЗАМОРОЗКА»), и ни для чего больше.
   ⚠️ ЗАЧЕМ ИМЕННО ЭТО ЧИСЛО. Офлайн-раскладчик НЕ КРАДЁТ и РАСТИТ пул по требованию (см. setOffline):
   голос занят до мига отпускания (freeAt). ⚠️ Прежде — ещё 7 постоянных релиза сверху, и тёплый пад держал голос ≈17 с,
   отчего плотная аккордовая дорожка заводила голоса СОТНЯМИ; с исправлением (см. freeAfter) пул сходится к настоящей
   одновременности нот, как живьём. Число голосов — всё равно ГЛАВНАЯ переменная стоимости раскладки, той самой
   синхронной работы, что блокирует главный поток.
   Отчёт рендера обязан её НАЗВАТЬ, а не оценить на глаз.
   ⛔ Отдаём ЧИСЛА, а не сами массивы: наружу не должно утекать то, что можно нечаянно изменить.
   ⛔ У ЖИВОЙ копии вызывающих нет и быть не должно — спрашивает только render.js у своей. */
const poolSizes=()=>({ lead:lv.length, chord:cv.length, bass:bv.length, chordFree:cvFree() });   // POOL1: + idle chord voices
let frzReady=false, frzStoreNode=null, frzSink=null;   // AF6b-fix2: frzSink — немой сток (гейн 0 → мастер), к которому КАЖДЫЙ чтец подключён навсегда: его тянут, пока он не завершится
const frzCountWait=new Map(); let frzCountSeq=0;   // AF6b: ворклет хранилища/чтеца замороженных дорожек загрузился в ЖИВОЙ контекст (и узел хранилища)
let leadSum=null, ksReady=true;            // шина соло (вход эффектов) + загрузился ли KS-ворклет (для ленивой стройки)
const LEAD_KS_FROM=(k=>k<0?LEAD_REC.length:k)(LEAD_REC.findIndex(r=>r.engine==='ks'));   // TIM3b: the first KS position (kept for old readers; use leadIsKs)
/* ЗНАЧЕНИЯ ЭФФЕКТОВ ТЕКУЩЕЙ НОТЫ (Пласт 3.7.1). Их кладёт applyFx — а он по построению зовётся
   НЕПОСРЕДСТВЕННО ПЕРЕД leadOn/leadSet той же ноты, и живьём, и на переигровке (см. ENG в recorder).
   ⛔ ЭТОТ ПОРЯДОК — КОНТРАКТ, а не совпадение: leadOn читает отсюда значения ИМЕННО СВОЕГО события.
   Разорви его (позови leadOn без applyFx) — и голос возьмёт величины ЧУЖОЙ ноты.
   ⚠️ ЭТО НЕ ПРЕЖНИЙ lastFx. Тот был ГЛОБАЛЬНЫМ «последним драйвом»: новый голос строился со значением,
   которое оставил кто угодно — живая рука или нота петли. Здесь же величина принадлежит КОНКРЕТНОМУ
   событию и живёт ровно до того, как её заберёт голос этой ноты. Формат события не тронут: поля
   vib/drv/trm/dly лежали в полезной нагрузке всегда (просто до 3.7.1 их некуда было применить пер-нотно). */
/* TF2: the tonic (Hz) of the view of the solo note about to sound — sympathetic strings of a plucked bank tune to it (ENG.leadOn/leadSet set
   it before every audio.leadOn/leadSet; null = the live key). Like pendFx: brought down the call stack, read by the voice. */
let pendSymp=null;
const sympBase=hz=>{ pendSymp= hz>0 ? hz : null; };
const pendFx={vib:0,drv:0,trm:0,bri:null};   // bri — яркость ноты (0..1) или null «не задана» (см. applyFx/briStage)   // O-1: dly/rev сняты вместе с пер-нотными посылами — исполнять их в голосе больше нечем (см. applyFx)
/* ⚠️ ПЕР-ГОЛОСОВЫЕ УЗЛА ПРИЦЕПКИ (Пласт 3.7.1) — vibDep · trem+tremDep.
   ⛳ O-1: dlySend и revSend УДАЛЕНЫ, и это решение пользователя, а не упрощение. Эффекты стали свойством
   ЗВУЧАЩЕГО ТЕМБРА: голоса сначала складываются, потом обрабатываются — как в любом синтезаторе и любой
   DAW. Реверб — модель комнаты, а комната одна на всех. Пер-нотные посылы были редкостью, рождённой
   пальцевым управлением: они покрывали ДВЕ величины, тогда как длина и окраска комнаты, время и повторы
   делея пер-нотными не могли быть в принципе. Один закон вместо двух. «Эту партию в другой комнате»
   вернёт ЗАМОРОЗКА — отдельной дорожкой со своей цепью, ровно как это делает DAW.
   ⚠️ ЦЕНА НАЗВАНА: каждый УЖЕ ЗАПИСАННЫЙ соло-слой теряет пер-нотную автоматику реверба и делея и
   звучит на том значении, что стоит живьём. Необратимо для существующего материала.
   ⛔ НИЖЕ ГРАНИЦЫ СУММЫ НИЧЕГО НЕ ТРОНУТО: громкость (vol — у каждой руки своя), высота, драйв (шейпер
   до огибающей) и вибрато (в detune) остаются ПЕР-НОТНЫМИ. Вибрато иначе и нельзя: оно двигает ВЫСОТУ,
   а у суммы высоты нет.
   ПОРЯДОК В ГОЛОСЕ: тремоло стоит ПОСЛЕ громкости и последним перед суммой, поэтому эхо и хвост реверба
   (они теперь ниже по цепи) по-прежнему несут его качание — как и было задумано с 3.7.1.
   ⚠️ УРОВЕНЬ НЕ ПОЕХАЛ ПРИ ПЕРЕЕЗДЕ, и это проверяемо: пер-голосовой посыл множил величину на LEAD_OUT_G
   ВРУЧНУЮ (он брался ДО сухой громкости шины); теперь влажная доля берётся ПОСЛЕ leadOut, где те же 0.22
   уже применены. Тот же множитель, только честным путём.
   ⚠️ ОДНО РАСХОЖДЕНИЕ НАЗВАНО ЧЕСТНО: прежде посылы отходили от голоса ДО цепочки ВЫРАЗИТЕЛЬНОСТИ, теперь
   влажная доля берётся ПОСЛЕ неё. При нейтральной выразительности (нет руки-«смычка») та цепочка —
   ТОЖДЕСТВО (exprGain=1, влажные шейперы=0, вау при 0 дБ плоский), поэтому разницы нет вовсе. Она слышна
   ровно тогда, когда рука-выразительность работает: комната и эхо теперь слышат ТО ЖЕ, что и ухо, а не
   сигнал до её окраски. Это улучшение, а не побочный эффект. */
function newLeadVoice(){
  const hum=AC.createConstantSource(); hum.offset.value=0; hum.start();   // гуманизация ЭТОГО голоса
  const vibDep=AC.createGain(); vibDep.gain.value=pendFx.vib*35;          // ГЛУБИНА вибрато этого голоса (LFO общий); в detune его цепляет mkOsc через bldVib
  vibLFO.connect(vibDep);
  const pre=AC.createGain(); pre.gain.value=1;                            // вход банка (бывший общий preBus)
  const shaper=AC.createWaveShaper(); shaper.curve=makeSatCurve(); shaper.oversample='2x';
  const satDry=AC.createGain(); satDry.gain.value=1-pendFx.drv*0.7;
  const satWet=AC.createGain(); satWet.gain.value=pendFx.drv;
  const satSum=AC.createGain();
  const env=AC.createGain(); env.gain.value=0;
  const vol=AC.createGain(); vol.gain.value=0.5;
  const trem=AC.createGain(); trem.gain.value=1-pendFx.trm*0.45;          // ВСТАВКА тремоло этого голоса: база (1−d) + качание LFO×d
  const tremDep=AC.createGain(); tremDep.gain.value=pendFx.trm*0.45;
  tremLFO.connect(tremDep); tremDep.connect(trem.gain);
  pre.connect(satDry); pre.connect(shaper); shaper.connect(satWet);
  satDry.connect(satSum); satWet.connect(satSum);
  const tg=AC.createGain();   // MX1: уровень ДОРОЖКИ — после огибающей (и драйва до неё), до громкости ноты; дальше всё линейно
  satSum.connect(env); env.connect(tg); const pan=makePanStage(E, tg,vol); vol.connect(trem); const vo= leadOutT ? AC.createGain() : leadSum; trem.connect(vo);   // AF5: vo — the voice's output before its router   // O-1: единственный выход голоса — в СУММУ. Эффекты живут ПОСЛЕ неё. MX2: tg → панорама → громкость ноты (дальше голос стерео)
  const bri=makeBriStage(E, trem,vo); const rt= vo!==leadSum ? voiceRoute(E, vo, leadSum, leadOutT) : null;   // ЯРКОСТЬ: две ветви рядом с прежней связью trem→leadSum (она не тронута), без величины — ровно ноль (см. makeBriStage)
  /* deg/oct — КАКУЮ НОТУ этот голос сейчас держит. Звуку они не нужны (частота уже в осцилляторах), их
     держит ПОДСВЕТКА: leadHold — единственный источник правды о том, что звучит, и записываются они
     ТЕМ ЖЕ вызовом, что запускает ноту (leadOn). Второго пути записи нет, поэтому картинка не может
     разойтись со звуком и не может отстать от него на кадр. */
  const shim= rt ? AC.createGain() : null; if(shim){ shim.gain.value=1; exprVibPitch.connect(shim); }   // AF5: the expression shimmer reaches this voice only while a live hand owns it
  const v={hum,vibDep,pre,satDry,satWet,env,tg,pan,vol,trem,tremDep,bri,rt,shim,banks:{},ins:-1,owner:null,tOn:0,on:false,deg:-1,oct:0,freeAt:0};   // freeAt — только для offline (F2); живьём не читается
  lv.push(v); return v;
}
/* ПРИЦЕПКА ЭФФЕКТОВ В ГОЛОС. Величины и постоянные времени — СИМВОЛ В СИМВОЛ прежние из applyFx
   (drv 0.05 · vib*35 0.05 · trm*0.45 0.05 · dly*0.55 0.08); изменился только АДРЕСАТ: не общие узлы
   шины, а узлы ЭТОГО голоса. Отсюда пер-слойность даром — голос, созданный событием слоя, несёт
   величины этого слоя и ничьи больше. */
/* ⛳ fresh — АТАКА ПРОТИВ ВЕДЕНИЯ, и это НЕСУЩЕЕ различие, а не оптимизация.
   На АТАКЕ величина СТАВИТСЯ (cancelScheduledValues + setValueAtTime), при ВЕДЕНИИ — подъезжает
   (setTargetAtTime с прежними постоянными). Почему так, историей вопроса:
   ⚠️ БЫЛА ОШИБКА: и то и другое шло через setTargetAtTime. Постоянные 0.05/0.08 писались для РУЧКИ НА
   ОБЩЕЙ ШИНЕ (её крутят плавно, скачок был бы слышен щелчком) — но с Пласта 3.7.1 это ПЕР-ГОЛОСОВЫЕ
   величины, обязанные быть ВЕРНЫМИ УЖЕ В ПЕРЕХОДНОМ ПРОЦЕССЕ АТАКИ. А setTargetAtTime — это
   ЭКСПОНЕНЦИАЛЬНОЕ ПРИБЛИЖЕНИЕ: в момент t величина РАВНА СТАРОЙ и лишь потом уходит к цели (через
   20 мс от неё остаётся ещё ~78% при τ=0.08). Голоса же берутся ИЗ ПУЛА и при отпускании НЕ
   сбрасываются — значит переиспользованный голос отдавал НАЧАЛО новой ноты в делей/реверб на уровне
   ПРЕДЫДУЩЕЙ. Слышно это было ярче всего на завороте петли (там сходятся самый большой скачок значения
   и возврат голоса): «первая нота повтора звучит с делеем, хотя записана сухой».
   ⚠️ СИММЕТРИЯ ВОССТАНОВЛЕНА: newLeadVoice эти же гейны ВСЕГДА ставил присваиванием (.gain.value=…),
   то есть СВЕЖИЙ голос был верен, а переиспользованный — нет. Расхождение и было багом.
   ⚠️ ТОЧНО ТАК ЖЕ ДАВНО УСТРОЕНЫ АККОРДЫ: chordOn ставит яркость на атаке
   (`v.fb.frequency.cancelScheduledValues(t); setValueAtTime(briHz,t)`), а chordGlide ведёт её
   setTargetAtTime. Здесь мы не изобретаем приём, а приводим соло к тому, что у аккордов уже работало. */
function applyVoiceFx(v,p,t,fresh){
  const put=(prm,val,tc)=>{
    if(fresh){ prm.cancelScheduledValues(t); prm.setValueAtTime(val,t); }
    else prm.setTargetAtTime(val,t,tc);
  };
  put(v.satWet.gain, p.drv, 0.05);
  put(v.satDry.gain, 1-p.drv*0.7, 0.05);
  put(v.vibDep.gain, p.vib*35, 0.05);
  put(v.tremDep.gain, p.trm*0.45, 0.05);
  put(v.trem.gain, 1-p.trm*0.45, 0.05);
  briStage(v.bri, 'ld', p.bri, t, fresh);   // ЯРКОСТЬ: на атаке — точно, при ведении — подъездом; нет величины — ступень вне пути (ровно ноль)
  /* ⛳ O-1: строк посыла в делей и реверб здесь БОЛЬШЕ НЕТ. Осталось ровно то, что живёт НИЖЕ границы
     суммы и потому пер-нотно по природе: драйв (нелинейность до огибающей), вибрато (сдвиг высоты) и
     пер-голосовое тремоло. Реверб и делей теперь обрабатывают СУММУ — у них своё место в цепи. */
}
/* Банк голоса ПОД ИНСТРУМЕНТ: строим лениво и КЭШИРУЕМ на голосе. Кэш (а не пересборка) потому, что
   осциллятор, однажды запущенный, живёт до конца контекста (правило #3) — «выбросить» банк нельзя, его
   можно только заглушить гейтом, ровно как делал прежний глобальный набор. Практический потолок: число
   РЕАЛЬНО сыгранных инструментов × число РЕАЛЬНО занятых голосов (обычно 1–2 × 1–2), против 23 сегодня. */
function leadVoiceBank(v,ins,when){
  let b=v.banks[ins];
  if(!b){ b=v.banks[ins]=buildLeadBank(E, LEAD_REC[ins],v.pre,v.hum,v.vibDep,v.shim); b.gain.gain.value=0; }   // TIM3b: from the record   // vibDep — глубина вибрато ЭТОГО голоса: mkOsc цепляет её в detune осцилляторов банка
  if(v.ins!==ins){
    /* ПЕРВЫЙ банк голоса открываем МГНОВЕННО — ровно как это делал initAudio (banks[leadIdx].gain.value=1)
       ещё до первой ноты. Через 20мс-рампу гейта первая атака вышла бы смазанной, и «одна нота звучит
       как раньше» сломалось бы на самой первой. Смена банка ПОЗЖЕ — прежним кроссфейдом setLeadInstr. */
    if(v.ins<0) b.gain.gain.value=1;
    else { const t=when!=null?when:AC.currentTime; for(const k in v.banks) v.banks[k].gain.gain.setTargetAtTime(+k===ins?1:0,t,0.02); }   // when — явное время (слайс S2): кроссфейд банков обязан ехать в то же время, что и сама атака, иначе при офлайн-рендере он лёг бы в «сейчас», а нота — в будущее
    v.ins=ins;
  }
  return b;
}
const leadCap=ins=> leadIsKs(ins) ? LEAD_POOL_KS : LEAD_POOL_N;   // KS дороже (ворклет на голос) → свой потолок
/* Выдача голоса. Порядок: свой (тот же владелец — ведение ноты, НЕ переаллокация) → свободный с УЖЕ
   построенным нужным банком (сродство: иначе слой на Ситаре и живая рука на Органе строили бы банк на
   каждой атаке) → любой свободный → новый (лениво, пока не упёрлись в потолок) → КРАЖА.
   Красть начинаем с ОТПУЩЕННЫХ голосов (у них лишь хвост), и только потом с зажатых: у мелодии
   оборванная нота слышна куда сильнее, чем у аккорда (там cvAlloc просто берёт самый старый). */
function leadAlloc(owner,ins,when){
  if(leadHold[owner])return leadHold[owner];   // свой голос — ведение ноты, не переаллокация (одинаково живьём и офлайн)
  /* F2 — ОФЛАЙН: занятость по ЗВУЧАНИЮ (freeAt), потолка нет, кражи нет. Сродство к голосу с уже
     построенным банком СОХРАНЕНО — оно экономит стройку банка и на звук не влияет.
     ⚠️ `when` живьём не передаётся и не читается: ветка ниже — прежняя, дословно. */
  if(offline){ const t=when!=null?when:AC.currentTime;
    let v=lv.find(x=>x.freeAt<=t&&x.banks[ins]) || lv.find(x=>x.freeAt<=t);
    if(!v) v=newLeadVoice();
    v.owner=owner; v.freeAt=Infinity; v.handed=true; leadHold[owner]=v; return v; }
  const cap=leadCap(ins);
  let v=lv.find(x=>!x.owner&&x.banks[ins]) || lv.find(x=>!x.owner);
  if(!v&&lv.length<cap) v=newLeadVoice();
  if(!v){ const free=lv.filter(x=>!x.on); v=(free.length?free:lv).reduce((a,b)=>a.tOn<b.tOn?a:b);
    if(v.owner) delete leadHold[v.owner]; leadRelease(v,true); }
  v.owner=owner; v.handed=true; leadHold[owner]=v; return v;   // S5: handed — голос сменил владельца; его расписанные кривые снимет leadOn (см. там)
}
/* ⛔ ПРИЦЕПКИ (tremDep/vibDep/satWet) ЗДЕСЬ НЕ СБРАСЫВАЕМ, И ЭТО НАМЕРЕННО.
   Соблазн понятен: «голос уходит в пул — обнулим его величины, чтобы не утекли в следующую ноту». Но
   отпускаемая нота ПРОДОЛЖАЕТ ЗВУЧАТЬ хвостом релиза, и хвост обязан звучать на СВОИХ величинах —
   обнули их здесь, и у КАЖДОЙ ноты характер оборвётся ровно в момент снятия пальца. Утечку в следующую
   ноту закрывает не сброс на отпускании, а ПОСТАНОВКА величины НА АТАКЕ (см. applyVoiceFx, флаг fresh) —
   то есть в правильном месте. Тот же довод, по которому 3.5.1 не разбирает экземпляры эффектов: не рвать
   то, что ещё звучит. ⚠️ O-1: dlySend/revSend из этого списка ушли вместе с самими узлами. */
function leadRelease(v,hard,when){
  const t=when!=null?when:AC.currentTime;   // when — явное время (S2), как у cvRelease/bvRelease; живые вызовы его не передают → «сейчас», байт-в-байт
  const tc=hard?0.02:LEAD_INSTR[v.ins<0?leadIdx:v.ins].rel;
  v.env.gain.cancelScheduledValues(t);
  v.env.gain.setTargetAtTime(0,t,tc);
  if(v.owner) v.last=v.owner;   // AF2: см. cvRelease
  v.on=false; v.owner=null;
  if(offline) v.freeAt=freeAfter(t);   // свободен с мига отпускания, как живьём (см. freeAfter)
}
/* Атака/ведение ноты владельца. Зовётся КАЖДЫЙ КАДР зажатой рукой (как и раньше): частота и громкость
   едут всегда, а сама атака — один раз (гейт v.on, бывший noteOnFlag). Порядок и постоянные времени
   1-в-1 прежние: setFreq 0.02 (тот самый 20мс-глайд), vol 0.04, гуманизация 0.006, ±5% уровня, ±10% атаки.
   ⛳ when — ЯВНОЕ ВРЕМЯ (слайс S2), последним аргументом и с умолчанием «сейчас»: ровно та же форма, что
   у chordOn/bassOn/drumHit с правила #15. На момент S2 его не передавал никто (живой звук байт-в-байт); сегодня его
   передают рендер (каждому событию), догонялка и шов заморозки — живая рука по-прежнему нет. Зачем он: офлайн-рендер обязан расставить ноты по будущим временам ЗАРАНЕЕ (у
   OfflineAudioContext currentTime под JS не идёт), а линейному транспорту иначе пришлось бы держать
   ДВА пути диспетчеризации вместо одного.
   ⚠️ БАНКИ ТРОГАТЬ НЕ ПРИШЛОСЬ И НЕ НАДО: у них уже setFreq(f,t), strike(t,vel), cancel(t) — время у
   них аргумент с самого начала. Часы были зашиты РОВНО в обёртках, и только они здесь и правятся.
   (С V1 у банков setFreq(f,tc,t): время скольжения встало ПЕРЕД временем — правило #15.)
   ⚠️ v.tOn=t становится БУДУЩИМ временем, если передать when. Это часть модели leadAlloc (кража по
   «самому старому»), и она по построению живёт по стенным часам — трогать её в этом слайсе ЗАПРЕЩЕНО,
   решается она в офлайн-раскладчике. (Решена: слайс F2 — офлайн-раскладчик, см. его шапку выше.) */
/* tie (T3) — ПРОДОЛЖЕНИЕ ноты после смены тембра в другой дорожке: живьём это был кроссфейд банков ОДНОГО голоса за
   20 мс без новой атаки. На переигровке нота уже другая (другая дорожка — другой голос), и tie делает из неё тот же
   переход: огибающая входит с τ 20 мс (как гейт банка в leadVoiceBank), без разброса времени атаки и без удара
   (strike). В паре с ней прежняя нота уходит быстрым релизом (leadOff с tie). Без tie — всё дословно по-старому.
   ⛳ V2: tie стоит ПЕРЕД when — и у leadOn, и у leadOff (правило #15 теперь без исключений). Прежде он был после when;
   все позиционные вызовы, передающие время, поправлены (ENG, зонд render.js, recorder: leadOff(k, undefined, at)). */
/* glide (V1, режимы голоса) — ВРЕМЯ СКОЛЬЖЕНИЯ (τ, с) для ЛЕГАТО-ПЕРЕЕЗДА высоты уже ЗВУЧАЩЕГО голоса. Нет — сегодняшние
   20 мс (LEAD_GLIDE_TC), байт-в-байт. ⛔ На СВЕЖЕЙ атаке не применяется никогда: голос из пула помнит частоту ПРЕЖНЕЙ ноты,
   и долгое скольжение въезжало бы в новую ноту с чужой высоты. ⛔ Вызывающий НЕ передаёт его для кадров терменвокса (live)
   — там 20 мс это сглаживание слежения, а не портаменто; точки бенда идут своим путём (scheduleBend) и его не видят.
   ⛔ ПЕРЕД when (правило #15 — время последним; прецедент P1: новые поля встают перед временем, а позиционные вызовы
   правятся). Прямые позиционные вызовы leadOn — зонд render.js (четыре) и ENG; все поправлены: у них в слоте glide
   стоит null/undefined, время осталось в слоте when. (tie с V2 тоже перед when — см. выше.) */
function leadOn(owner,freq,vol,ins,deg,oct,glide,tie,when){   // V2: tie ПЕРЕД when — правило #15 без исключений
  /* ⚠️ `when` уходит в leadAlloc ТРЕТЬИМ аргументом, а порядок вычислений НЕ ТРОНУТ: живьём when
     равен undefined, ветка offline не берётся, и AC.currentTime по-прежнему читается ПОСЛЕ выдачи
     голоса — переставь мы это местами, живой путь перестал бы быть байт-в-байт (чтение часов могло
     бы попасть в другой квант рендера). */
  const v=leadAlloc(owner,ins,when), t=when!=null?when:AC.currentTime, b=leadVoiceBank(v,ins,t);
  /* ⛳ S5: ГОЛОС, ВЫДАННЫЙ НОВОМУ ВЛАДЕЛЬЦУ, НАЧИНАЕТ БЕЗ РАСПИСАННОЙ КРИВОЙ — чей бы он ни был. scheduleBend расписывает точки бенда в
     банк голоса НАПЕРЁД; если нота прежнего владельца отпущена раньше конца своей кривой (стоп, пауза, паника, шов скобы, кража), её
     хвост точек остаётся в параметрах частоты — и прежде перестраивал СЛЕДУЮЩУЮ ноту, взявшую этот голос: ENG.leadOn звал leadCancel
     ДО выдачи голоса, по ключу НОВОГО владельца, и чистил только голос, уже принадлежавший ему (повторная атака того же ключа).
     Теперь — здесь, при смене владельца (флаг handed ставит leadAlloc во всех ветках выдачи, живой и офлайн; «свой» голос ведения —
     нет): у ВСЕХ построенных банков голоса снимаются события частоты (и у FM — индекса) с момента t, ДО setFreq/strike этой атаки.
     ⛳ НИ ОДНА ПРАВИЛЬНАЯ НОТА НЕ МЕНЯЕТСЯ: cancelScheduledValues(t) снимает только события со временем ≥ t; у голоса без чужой кривой
     таких нет (ведения живой руки и прежние атаки лежат раньше t, глайд в работе продолжается как шёл), а всё, что эта атака ставит
     сама (setFreq, strike, бенд ENG), ставится ПОСЛЕ отмены. Меняется ровно нота, которая унаследовала бы чужую кривую.
     leadCancel в ENG остаётся для своего случая — повторной атаки того же владельца на ещё удержанном голосе. */
  if(v.handed){ v.handed=false; for(const k in v.banks){ const x=v.banks[k]; if(x&&x.cancel) x.cancel(t); } }
  /* fresh СНИМАЕМ ДО применения эффектов и ДО гейта `if(v.on)return` ниже: этот гейт и ЕСТЬ граница
     «атака / уже звучит», второй такой границы заводить не надо. leadOn зовётся КАЖДЫЙ КАДР зажатой
     рукой — там fresh=false, и величины подъезжают плавно, как и должны при ведении. */
  const fresh=!v.on;
  applyVoiceFx(v,pendFx,t,fresh);             // эффекты ЭТОЙ ноты — в ЭТОТ голос (величины принёс applyFx строкой выше по стеку вызова; см. pendFx)
  /* ⛳ A (подтверждено на слух): СВЕЖАЯ АТАКА ВСТАЁТ НА СВОЮ ВЫСОТУ — постоянная 0, то есть СКАЧОК (по спецификации
     setTargetAtTime с нулевой постоянной сразу даёт цель). Прежде свежая атака шла УМОЛЧАНИЕМ банка (20 мс) — и голос
     ПОДЪЕЗЖАЛ: новый — от частоты постройки (220 Гц), переиспользованный — от прежней ноты. Это «подъезд без атаки» у
     первой ноты замороженной дорожки (в рендере каждая дорожка начинается на СВЕЖЕМ голосе) и еле слышный — живьём.
     Контракт V1 это и обещал («свежая атака не въезжает»), но без аргумента glide умолчание банка всё равно скользило.
     Скольжение — ТОЛЬКО легато звучащего голоса (не fresh): там glide, а без него — прежнее умолчание. Кадры терменвокса
     после атаки и точки бенда (scheduleBend) сюда не относятся и не тронуты. */
  if(freq!=null)b.setFreq(freq, fresh ? 0 : (glide==null?undefined:glide), t);   // null тоже «нет»: умолчание параметра ловит только undefined, а null дал бы τ=0 — скачок   // V1: скольжение — только легато-переезд звучащего голоса; свежая атака — умолчание банка (20 мс), как было. Время — последним (правило #15)
  const a=volAmp(vol);                        // VOL-2b: ОДНА кривая громкости — амплитуда v² (прежде у соло линейная: гейн = vol)
  v.vol.gain.setTargetAtTime(a,t,0.04);
  if(deg!=null){ v.deg=deg; v.oct=oct||0; }   // ЧТО звучит — для подсветки; пишем КАЖДЫЙ кадр, поэтому ведение ноты (смена ступени под пальцем) отражается сразу
  if(v.on)return;
  v.on=true; v.tOn=t;
  v.tg.gain.cancelScheduledValues(t); v.tg.gain.setValueAtTime(ownerGain(owner),t);   // MX1: уровень дорожки владельца — с мига атаки
  panSetAt(v.pan,ownerPan(owner),t);   // MX2: панорама дорожки владельца — с мига атаки
  routeAt(v,owner,t);   // AF5
  /* Гуманизация — СВЕЖАЯ случайность на каждую атаку (в т.ч. при переигровке лупа: генерится здесь, в
     событии НЕ хранится), теперь в СВОЙ ConstantSource голоса. Высоту дёргаем на bank.hum (у органа/падов
     0 — не маскируем биения строёв), уровень и время атаки — всем чуть-чуть (на биения не влияет). */
  const hum = b.hum==null?1:b.hum;
  v.hum.offset.setTargetAtTime((rnd()*2-1)*HUM_CENTS*hum*(DBG.noHum?0:1), t, 0.006);   // DBG.noHum — отладка на слух (число из потока берётся всё равно)
  const lvlJ = 1 - rnd()*0.05;                       // −0..5% уровня
  const attJ = LEAD_INSTR[ins].att*(0.9+rnd()*0.2);   // ±10% времени атаки
  v.env.gain.cancelScheduledValues(t);
  v.env.gain.setTargetAtTime(lvlJ,t,tie?0.02:attJ);  // T3: связка — вход за τ 20 мс, как кроссфейд банков живьём
  if(!tie) b.strike && b.strike(t, volVel('ld',a), pendSymp);  // VOL-2b: скорость удара = амплитуда (у соло прежняя связь «гейн = скорость» сохранена; volVel('ld',a) === a). T3: у связки удара нет — живьём нота не переатаковалась   // FM: огибающая индекса; банки с фильтром: огибающая фильтра + скорость→яркость (громкость ЭТОЙ атаки — прежний lastVel по значению)
}
/* ins (T0-fix) — тембр ВЕДЕНИЯ: смена ЖИВОГО тембра соло посреди ноты ПЕРЕЛИВАЕТ звучащую ноту (живой путь
   зовёт leadOn каждый кадр, и leadVoiceBank делает кроссфейд банков голоса за 20 мс). Запись пишет это
   ведением с новым a.inst — и переигровка обязана сделать то же, ТЕМ ЖЕ кроссфейдом, иначе слышанное и
   записанное расходятся. Нет ins или тот же — всё дословно по-прежнему.
   ⚠️ ТОЛЬКО ПРИ ЧАСТОТЕ (freq!=null). Ведение терменвокса (hold, freq==null) частоты не несёт, а кривая
   бенда расписана в БАНК АТАКИ (scheduleBend) — новый банк звучал бы на чужой высоте. Там смены нет:
   названный предел. */
/* glide (V1) — как у leadOn: время скольжения переезда высоты; ведение ВСЕГДА легато (голос уже звучит). Нет — 20 мс.
   Ведение терменвокса (hold, freq==null) частоты не несёт — скольжению там применяться не к чему. Перед when — довод у leadOn. */
function leadSet(owner,freq,vol,deg,oct,ins,glide,when){           // ведение без атаки (leadSet из лупера; freq==null — идёт бенд, частоту не сбиваем). when — явное время (S2), по умолчанию «сейчас»
  const v=leadHold[owner]; if(!v)return; const t=when!=null?when:AC.currentTime;
  if(ins!=null && freq!=null && ins!==v.ins) leadVoiceBank(v,ins,t);
  const b=v.banks[v.ins];
  applyVoiceFx(v,pendFx,t,false);                           // ВЕДЕНИЕ эффектов зажатой ноты — в её собственный голос (прежде это была запись в общие узлы шины). fresh=false ВСЕГДА: leadSet по определению не атака
  if(freq!=null&&b)b.setFreq(freq,glide==null?undefined:glide,t);   // V1: glide не задан (undefined ИЛИ null) — умолчание банка (20 мс), как было
  v.vol.gain.setTargetAtTime(volAmp(vol),t,0.04);   // VOL-2b: та же кривая, что на атаке
  if(deg!=null){ v.deg=deg; v.oct=oct||0; }                  // ступень ведётся вместе с частотой — подсветка идёт за нотой
}
/* Отпускание: голос УХОДИТ ИЗ leadHold сразу — подсветка гаснет ровно в тот момент, когда сняли ноту,
   а хвост релиза дозвучивает (так же вело себя моно-соло: noteOff гасил и S.deg, и картинку). */
function leadOff(owner,tie,when){   /* V2: tie ПЕРЕД when (правило #15); вызовы, передающие время, поправлены — (owner, undefined, when) */  const v=leadHold[owner]; if(!v)return; delete leadHold[owner]; v.deg=-1; leadRelease(v,!!tie,when); }   // tie (T3) — нота уходит в продолжение другой дорожкой: быстрый релиз τ 20 мс (тот же, что жёсткий), а не хвост тембра   // when — явное время (S2); без него «сейчас», как было
/* ⚠️ leadAllOff НАМЕРЕННО БЕЗ when: его зовут паника, очистка и смена лада — все «немедленно по
   определению». Появится потребитель, которому нужно снять всё к БУДУЩЕМУ моменту, — добавить тогда,
   а не на всякий случай (аргумент, который никто не передаёт, назначения не имеет). */
function leadAllOff(){ for(const k of Object.keys(leadHold)) leadOff(k); }      // паника/смена лада: гасим ВСЕХ владельцев (как chordHold/bassHold)
/* Глиссандо-в-луп (переигровка терменвокса): расписываем ЗАПИСАННУЮ кривую бенда на будущие
   AC-времена через ТУ ЖЕ setFreq (setTargetAtTime 0.02) — тот же 20мс-глайд, что и живьём.
   baseFreq — частота ступени по ЗАМОРОЖЕННОМУ ладу (полимодальность), c — центы поверх неё;
   абсолютных Гц не храним. dt в долях → секунды через secPerBeat.
   ⚠️ ТОЛЬКО В СВОЙ ГОЛОС: раньше кривая ехала во ВСЕ банки сразу — с пулом это гнуло бы и живую руку. */
/* ⛳ when (S2) — ЯКОРЬ КРИВОЙ, то есть время АТАКИ ноты, от которого отсчитываются dt точек. Без него —
   «сейчас», ровно как было. Это и есть та единственная строка, из-за которой глиссандо нельзя было
   отрендерить офлайн: кривая ложилась от currentTime, а он в офлайн-контексте под JS не движется. */
/* BEND-CURVE: the ramps come from config.bendPlan — the one function for live replay and renders (step points = the old schedule,
   glides = sub-steps); `from` (beats, before the time — rule #15) enters the curve late (the chase). */
let bendTap=null; const bendTapSet=a=>{ bendTap=a||null; };   // probe only: log what this engine instance schedules
function scheduleBend(owner, points, baseFreq, secPerBeat, from, when){
  const v=leadHold[owner]; if(!v)return; const b=v.banks[v.ins]; if(!b)return;
  const t0=when!=null?when:AC.currentTime, plan=bendPlan(points,baseFreq,secPerBeat,t0,from||0);
  for(const s of plan) b.setFreq(s.f,s.tc,s.at);   // tc undefined (a step point) — the bank's default 20 ms, as before
  if(bendTap) bendTap.push({ owner, B:points, base:baseFreq, spb:secPerBeat, from:from||0, t0, plan });
}
/* Снять расписанные рампы частоты (на атаке переигранной ноты, ctx): чтобы бенд предыдущей
   ноты не перетёк в следующую. Живой путь (без ctx) не зовёт — живой звук не трогаем.
   Тоже пер-голосово: отмена в чужом голосе оборвала бы чужой бенд. */
function leadCancel(owner,when){ const v=leadHold[owner]; if(!v)return; const b=v.banks[v.ins];   // when — явное время (S2): отмена прошлых рамп обязана случиться В ТОТ ЖЕ момент, что и атака, иначе офлайн она сняла бы рампы, ещё не расставленные
  if(b&&b.cancel)b.cancel(when!=null?when:AC.currentTime); }
/* ОДИН новый басовый голос. ⛳ P1: единственная дверь роста пула — И ЖИВОГО (до потолка BASS_POOL_N), И офлайн-
   раскладчика F2 (без потолка). ⚠️ Зовёт тот же buildBassPool с n=1, чтобы не заводить второй копии проводки:
   порядок создания узлов обязан быть одинаков у всех голосов, иначе два одинаковых по смыслу голоса звучали бы разно. */
const newBassVoice=dest=>{ buildBassPool(E, dest,1); return bv[bv.length-1]; };
function bvRelease(v,hard,when){ const t=when!=null?when:AC.currentTime;
  const tc=hard?0.02:(v.ins?v.ins.rel:0.2);
  v.env.gain.cancelScheduledValues(t);
  v.env.gain.setTargetAtTime(0,t,tc);
  if(v.owner) v.last=v.owner;   // AF2: см. cvRelease
  v.owner=null; v.on=false;
  if(offline) v.freeAt=freeAfter(t);   // свободен с мига отпускания, как живьём (см. freeAfter)
}
function bvAlloc(when){
  /* F2 — ОФЛАЙН: занятость по ЗВУЧАНИЮ, рост по требованию, кражи нет (довод — у setOffline).
     Владельцев различает ключ ('bass', 'bassloop:N[:k]') — голос на ключ, и офлайн каждому достаётся свой голос вместо
     отобранного у соседа. ⛳ P1 этой ветки НЕ ТРОГАЛ: она и прежде росла с того, что было, — теперь растёт с нуля
     (живой пул ленив), и число голосов по-прежнему сходится к реальной одновременности дорожки. */
  if(offline){ const t=when!=null?when:AC.currentTime;
    let v=bv.find(x=>x.freeAt<=t);
    if(!v) v=newBassVoice(bassBus);
    v.freeAt=Infinity; return v; }
  /* ⛳ P1 — ПОРЯДОК ВЫДАЧИ, ЗЕРКАЛО leadAlloc: свободный (отпущенный или ни разу не звучавший) → новый, пока не упёрлись
     в потолок → КРАЖА, и красть начинаем с ОТПУЩЕННЫХ (у них лишь хвост), только потом с зажатых.
     ⚠️ Честно о том, что меняется: отпущенный голос (bvRelease снимает owner и on РАЗОМ) и прежде находился первым —
     строкой find(!owner); кража случалась только когда держат ВСЕ. Фильтр «сперва отпущенные» в ветке кражи —
     зеркальная страховка, как у соло. Настоящая перемена — потолок: он поднят, и голоса до него растут лениво.
     ⚠️ tOn у баса обновляет КАЖДЫЙ вызов bassOn (не только атака, как у соло) — поэтому зажатая живая нота, которую
     рука ведёт каждый кадр, всегда «самая свежая» и кражей не выбирается. Не трогаем: это поведение живого баса. */
  let v=bv.find(v=>!v.owner);
  if(!v&&bv.length<BASS_POOL_N) v=newBassVoice(bassBus);
  if(!v){ const free=bv.filter(x=>!x.on); v=(free.length?free:bv).reduce((a,b)=>a.tOn<b.tOn?a:b);
    const o=v.owner; v.deg=-1; bvRelease(v,true,when);   // кража: снять голос со старого владельца (и его ноту с подсветки — новый владелец запишет свою)
    if(o&&bassHold[o]===v)delete bassHold[o]; }
  return v;
}
/* setBassInstr — ТОЛЬКО живой селектор: глобальный bassIdx + дропдаун. Пул не трогаем;
   живой бас возьмёт новый тембр на следующей атаке (как аккорды), слои — сохранят свой. */
function setBassInstr(i){
  setBassIdx(((i%BASS_INSTR.length)+BASS_INSTR.length)%BASS_INSTR.length);
  hooks.bassInstr && hooks.bassInstr(bassIdx);
}
/* deg/oct (P1) — ЧТО звучит, для подсветки из реестра движка (как у leadOn); звуку не нужны — частота уже посчитана.
   ⛔ when — ПОСЛЕДНИМ (правило #15): у bassOn есть прямые позиционные вызовы (зонд render.js), и время, съехавшее
   в слот ступени, тихо сыграло бы ноту «сейчас». Поэтому новые поля встали ПЕРЕД when, а вызовы поправлены. */
/* ⛳ V1: ВРЕМЯ СКОЛЬЖЕНИЯ БАСА — одна константа на живой путь (bassOn) И на переигранную смену высоты (bassSet).
   ⚠️ ПРЕЖДЕ ИХ БЫЛО ДВЕ: живой бас (рука зовёт bassOn каждый кадр) скользил за τ 12 мс, а переигранное ведение bassSet —
   за τ 30 мс. Записанная бас-линия на переигровке скользила В ДВА С ЛИШНИМ РАЗА МЕДЛЕННЕЕ, чем её сыграли, — запись
   расходилась со звуком. Теперь обе — 12 мс, то есть переигровка звучит, как игра. Громкость (0.03 живьём / 0.05 в
   ведении) — не скольжение, её не трогаем. */
/* BASS_GLIDE_TC=0.012 — объявлена наверху файла, рядом с LEAD_GLIDE_TC (V4: на неё ссылается объявление «Скольжения»). */
/* glide (V1) — время скольжения ЛЕГАТО-переезда уже ЗВУЧАЩЕГО голоса; нет — BASS_GLIDE_TC. Свежая атака — всегда умолчание:
   голос пула помнит прежнюю ноту, и въезд с её высоты был бы чужим скольжением. Вызывающий НЕ передаёт его для кадров
   терменвокса (live). ПЕРЕД when (правило #15, прецедент P1); позиционные вызовы — зонд render.js и ENG — поправлены. */
/* bri — яркость ноты (0..1) или undefined «не задана» (звук как сегодня); ПЕРЕД when (правило #15), позиционные вызовы — ENG и
   зонд render.js — поправлены. */
function bassOn(owner,freq,vol,ins,deg,oct,glide,bri,when){
  if(!AC)return; const t=when!=null?when:AC.currentTime;
  let v=bassHold[owner]; if(!v){ v=bvAlloc(when); v.owner=owner; bassHold[owner]=v; }
  if(deg!=null){ v.deg=deg; v.oct=oct||0; }   // пишем КАЖДЫЙ вызов: ведение живой руки (новая ступень под пальцем) отражается сразу
  briStage(v.bri, 'bs', bri, t, !v.on);       // ЯРКОСТЬ: атака (голос не звучал) — точно, ведение — подъездом
  const gtc = !v.on ? 0 : (glide!=null?glide:BASS_GLIDE_TC);   // ⛳ A: СВЕЖАЯ АТАКА — постоянная 0, скачок на свою высоту (довод — у leadOn); прежде шла BASS_GLIDE_TC и подъезжала от прежней ноты / от 440 Гц нового голоса. Легато звучащего голоса — glide или BASS_GLIDE_TC, как было. «Звучал ДО этого вызова» (атака ниже переставит v.on)
  if(!v.on){                                   // атака: печём тембр слоя, гейт вверх (идемпотентно при удержании)
    v.ins=BASS_INSTR[(((ins??bassIdx)%BASS_INSTR.length)+BASS_INSTR.length)%BASS_INSTR.length];
    v.o1.type=v.ins.t1; v.o2.type=v.ins.t2; v.o2.detune.setValueAtTime(v.ins.det,t);
    const fo=v.ins.fo||1, ft=v.ins.ft||0.03, fv=v.ins.fv||0;   // огибающая фильтра + скорость→яркость на АТАКЕ (не в пофреймовом пути → не сбивается); высоту баса НЕ дёргаем (низ = гулкие биения)
    v.lp.frequency.cancelScheduledValues(t); v.lp.frequency.setValueAtTime(v.ins.lp*fo,t);
    v.lp.frequency.setTargetAtTime(v.ins.lp*(1+fv*volVel('bs',volAmp(vol))),t,ft);   // VOL-2b: скорость удара — прежнее число через амплитуду (volVel): тише прежнего пола 30% — база фильтра
    v.on=true; v.env.gain.cancelScheduledValues(t); v.env.gain.setTargetAtTime(1,t,v.ins.att*(0.9+rnd()*0.2));   // ±10% времени атаки
    v.tg.gain.cancelScheduledValues(t); v.tg.gain.setValueAtTime(ownerGain(owner),t);   // MX1: уровень дорожки владельца — с мига атаки
    routeAt(v,owner,t);   // AF5
    panSetAt(v.pan,ownerPan(owner),t);   // MX2: панорама дорожки владельца — с мига атаки
  }
  v.tOn=t;
  v.o1.frequency.setTargetAtTime(freq,t,gtc); v.o2.frequency.setTargetAtTime(freq*v.ins.ratio,t,gtc);
  v.vol.gain.setTargetAtTime(v.ins.lvl*volAmp(vol),t,0.03);   // lvl — как у аккордов, чтобы бас не жёг лимитер. VOL-2b: одна кривая v² (прежде 0.3+0.7·vol — ноль не был тишиной)
}
/* glide (V1) — как у bassOn; ведение всегда легато. Нет — BASS_GLIDE_TC (⛳ прежде здесь стояло 0.03 — см. BASS_GLIDE_TC). */
function bassSet(owner,freq,vol,deg,oct,glide,bri,when){   // deg/oct (P1) — ступень едет вместе с частотой, как у leadSet; glide (V1), bri — перед when
  if(!AC)return; const v=bassHold[owner]; if(!v||!v.ins)return; const t=when!=null?when:AC.currentTime;
  if(deg!=null){ v.deg=deg; v.oct=oct||0; }
  briStage(v.bri, 'bs', bri, t, false);       // ЯРКОСТЬ ведения — своя величина события
  const gtc = glide!=null ? glide : BASS_GLIDE_TC;
  v.o1.frequency.setTargetAtTime(freq,t,gtc); v.o2.frequency.setTargetAtTime(freq*v.ins.ratio,t,gtc);
  v.vol.gain.setTargetAtTime(v.ins.lvl*volAmp(vol),t,0.05);   // тот же lvl, иначе глиссандо вернуло бы уровень. VOL-2b: та же кривая
}
function bassOff(owner,when){ const v=bassHold[owner]; if(!v||!AC)return; v.deg=-1; bvRelease(v,false,when); delete bassHold[owner]; }   // P1: как leadOff — подсветка гаснет в миг снятия, хвост релиза дозвучивает

/* --- ДРОН: гейт dG, частота следует за тоникой (tonicFreq/2) в любом ладу (спасён из backing.js).
   tonicFreq — единый источник: у fixedKey это высота КЛЮЧА в приколоченной сетке (иначе дрон бился
   бы с ней), у прочих строёв = baseF() (байт-в-байт).
   ⛳ ВТОРАЯ СТРУНА (слайс «дрон и центы», решение пользователя «как было бы в живом исполнении»): прежде — постоянная ×1.498 у ВСЕХ
   строёв; теперь — scales.droneSecondHz: СОБСТВЕННАЯ высота строя, и она следует за ЛАДОМ (квинта лада, иначе кварта, иначе септима,
   иначе тоника периодом выше; у Болена–Пирса — выбор R.droneBP). Корень, уровень, тембр (две пилы), фильтр и LFO — ПРЕЖНИЕ. */
/* when (S2) — явное время ПОСЛЕДНИМ аргументом, по умолчанию «сейчас». Уровень стоит ПОСЛЕ него по
   порядку исторически (level был единственным параметром), поэтому when второй: правило «when последний»
   здесь выполняется буквально. */
/* tc (A2b) — постоянная времени уровня; по умолчанию прежние 1.2 с (вход) и 0.6 с (выход), байт-в-байт.
   Короткую передаёт ТОЛЬКО шов заморозки: там живой дрон подменяет дрон буфера в одно мгновение, и
   секундный наплыв читался бы провалом. */
/* TF2: the drone sounds the VIEW of its drone event (droneUse — recorder: droneSync and ENG.drone), not the live mode; no view = the live
   view. A drone coming up from silence takes its pitch at once (dUp): the render copy builds its oscillators at the live view, and a 0.3-s
   glide from there would be heard; live, the gate fades in from zero over 1.2 s, so the jump is not. */
let dView=null, dUp=false;
const dv=()=>dView||undefined;
function droneUse(s){ dView=s||null; }
const droneHz=()=>[tonicFreq(dv())/2, droneSecondHz(dv())];   // what the drone sounds now (probe read-out)
function droneOn(level=0.18,when,tc=1.2){ if(!AC)return; const t=when!=null?when:AC.currentTime;
  dG.gain.setTargetAtTime(level,t,tc);
  const [f1,f2]=droneHz();
  if(dUp){ dO1.frequency.setTargetAtTime(f1,t,0.3); dO2.frequency.setTargetAtTime(f2,t,0.3); }
  else { dO1.frequency.setValueAtTime(f1,t); dO2.frequency.setValueAtTime(f2,t); }
  dUp=true;
}
/* ПЕРЕСТРОЙКА ДРОНА БЕЗ УРОВНЯ (слайс «дрон и центы»): тоника, лад, «строй от» и A4 меняют его высоты, а дрон живёт ВНЕ softAllOff —
   поэтому ui зовёт это на каждую такую смену. ⛔ Гейт dG не трогаем: стоящий транспорт с заглушённым дроном молчит и дальше (прежде на
   смену A4 звался droneOn, и он поднимал уровень даже на стоящем транспорте). Та же постоянная 0.3 с, что у droneOn. */
function droneRetune(when){ if(!AC||!dO1)return; const t=when!=null?when:AC.currentTime;
  const [f1,f2]=droneHz();   // TF2: the drone event's view (A4 still retunes it; the key knob no longer does)
  dO1.frequency.setTargetAtTime(f1,t,0.3);
  dO2.frequency.setTargetAtTime(f2,t,0.3);
}
function droneOff(when,tc=0.6){ if(!AC)return; dUp=false; dG.gain.setTargetAtTime(0,when!=null?when:AC.currentTime,tc); }
/* Живой селектор набора ударных: только глобальный индекс + дропдаун (удар транзиентный,
   тембр берётся на КАЖДЫЙ удар из a.kit — заморожен в событии, как бас/аккорд). */
function setDrumKit(i){
  setDrumKitIdx(((i%DRUM_KITS.length)+DRUM_KITS.length)%DRUM_KITS.length);
  hooks.drumKit && hooks.drumKit(drumKitIdx);
}
/* ⛳ КУДА ИДЁТ УДАР — hitBus. Обычно это сама шина ударных (drumBus), ровно как прежде. Задана ЯРКОСТЬ — удар идёт через
   свой фильтр, построенный в этом же ударе (удар и так строит свои узлы каждый раз — исключение правила #3 для ударов).
   Не задана — фильтра нет ВОВСЕ, связи те же, что были: удар звучит бит-в-бит как сегодня. Все под-голоса кита пишут в
   hitBus синхронно внутри drumHit, поэтому одной переменной на модуль достаточно. */
let hitBus=null;
/* bri — яркость удара (0..1) или undefined «не задана»; ПЕРЕД when (правило #15), позиционные вызовы (ENG, зонд) поправлены. */
function drumHit(i,vol=1,kit=0,bri,when){
  if(!AC)return; const t=when!=null?when:AC.currentTime;
  if(!offline){ hitT.push(t); if(hitT.length>512) hitT.shift(); }   // ENG2: the readout's hits per second (live only)
  /* VOL-2b: громкость 0 — ТОЧНАЯ тишина: удар не строится вовсе (ни источника, ни фильтра яркости). Иначе огибающие ударов —
     setValueAtTime(пик)+exponentialRamp до 0.001 — начинались бы с нуля, а экспоненциальный ход из нуля по спецификации
     стоит на нуле и прыгает к 0.001 в конце: тихий щелчок вместо тишины. ⚠️ Названный край: у очень тихого удара под-голос
     с пиком ниже 0.001 (самый тихий множитель — 0.12·v², то есть громкость ниже ~9) идёт ВВЕРХ к 0.001 — это −60 дБ,
     неслышно. Прежняя карта такого не знала: её пол давал пики не ниже ~0.036. */
  const tgv=ownerGain(hitOwnerKey), pv=ownerPan(hitOwnerKey), DB= drumBusT&&trackRouteOf(hitOwnerKey) ? drumBusT : drumBus; hitOwnerKey=null;   // AF5: a track's hit → the track bus   // MX1: уровень дорожки удара (ключ поставил ENG.drum; живой удар — 1). MX2: и её панорама (живой — 0)
  if(!(volAmp(vol)>0) || !(tgv>0)) return;
  hitBus=DB;
  if(bri!=null && bri<BRI_OPEN){ const f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=briHzOf('dr',bri); f.connect(DB); hitBus=f; }
  if(pv!==0){ const pin=AC.createGain(), st=makePanStage(E, pin,hitBus), [a,b]=panGains(pv); st.l.gain.value=a; st.r.gain.value=b; hitBus=pin; }   // MX2: ступень панорамы удара — только при p ≠ 0 (в центре удар байт-в-байт прежний); стоит ДО шины ударных и её цепи
  if(tgv!==1){ const g=AC.createGain(); g.gain.value=tgv; g.connect(hitBus); hitBus=g; }   // MX1: множитель только при уровне ≠ 1 — на 1 удар байт-в-байт прежний
  try{ drumVoice(E, i,vol,DRUM_REC[kit]||DRUM_REC[0],t); } finally{ hitBus=drumBus; }   // TIM3c: the kit's record (an unknown position → the first kit, as before)
}

/* Метроном лупера: короткий щелчок точно по часам AC (отсчёт и сетка овердаба).
   Идёт прямо в master, мимо громкости фона — слышен даже при выключенной подложке.
   level: 2 — сильная доля (сам/начало такта), 1 — голова группы (тали), 0 — обычная доля,
   -1 — khali: ОСЛАБЛЕННАЯ голова группы (тинтал, 3-й вибхаг пустой). Уровни 2 и 0 дают
   ТЕ ЖЕ частоты/громкость, что прежние accent true/false → на 4/4 метроном не изменился. */
function metroClick(t,level){
  if(!AC)return;
  const o=AC.createOscillator(), g=AC.createGain();
  const f0 = level>=2?2000 : level===1?1750 : level<0?1100 : 1400;   // 2 и 0 — как было (accent true/false)
  const f1 = level>=2?1500 : level===1?1300 : level<0?860  : 1050;
  const gp = level>=2?0.85 : level===1?0.66 : level<0?0.30 : 0.5;    // khali ТИШЕ обычной доли — «пустая» голова
  o.type='triangle'; o.frequency.setValueAtTime(f0,t);
  o.frequency.exponentialRampToValueAtTime(f1,t+0.03);   // короткий «щёлк» вниз — читается как деревяшка
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(gp,t+0.002);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+0.09);
}

/* Параллельный ОТВОД звука для записи клипа. НОВЫЙ MediaStreamAudioDestinationNode, к нему цепляем
   ВЫХОД лимитера — то, что реально слышно (post-limiter). Живой путь limiter→AC.destination НЕ
   трогаем: это ДОПОЛНИТЕЛЬНОЕ ребро графа, звук в колонках не меняется (правило: живой аудио-путь
   неизменен). Возвращаем stream (аудиодорожка для MediaRecorder) и dispose — снять ребро по
   остановке, чтобы граф не копил мёртвые узлы. Вызывается только из записи клипа, после initAudio. */
function createRecordingTap(){
  if(!AC) return null;
  const dest=AC.createMediaStreamDestination();
  outLast.connect(dest);
  const src=outLast;
  return { stream:dest.stream, dispose:()=>{ try{ src.disconnect(dest); }catch(e){} } };
}

/* Экспорт: `let` через export-клаузу — живые связки (AC виден после initAudio). */
/* ═══ ENG1 (RUN 3, 2026-10-16; the stage-3 plan §4.4): THE ENGINE CONTRACT — the calls makeENG (live/eng.js) makes, and the only ones ═══
   `voice` is the opaque owner key; every call carries its time LAST (rule #15; undefined = now). A note arrives priced: `hz` (a chord: the
   list of Hz) from the adapter's evHz, `timbre` a position (the adapter resolves the id, TIM2), `values` the note's effect map. Each call does
   exactly what the adapter did before, in the same order (GOLD, TF0, HAND1 unchanged). n.role 'ld' | 'ch' | 'bs'; solo extras: `live`
   (a theremin frame: no glide of its own), `cancel` (a replayed attack on a voice its owner still holds: its old bend ramps go), `symp` (the
   sympathetic strings' base Hz, null = the live key), `tie`. The engine's own remaining reads of app state: CLAUDE.md, ENG1. */
const okHzE=f=>typeof f==='number' && Number.isFinite(f);
function noteOn(voice, n, time){
  if(n.role==='ld'){ if(n.cancel) leadCancel(voice,time); const gl=applyFx(n.values); sympBase(n.symp);
    leadOn(voice,n.hz,n.vel,n.timbre,n.deg,n.oct,n.live?undefined:gl,n.tie,time); return; }
  if(n.role==='ch'){ chordOn(voice,n.hz,n.vel,n.timbre,n.bri,time); return; }
  if(n.role==='bs') bassOn(voice,n.hz,n.vel,n.timbre,n.deg,n.oct,n.live?undefined:fxGlideOf(n.values),fxBriOf(n.values),time);
}
/* a change without a new attack; solo: hz null = a theremin hold (no pitch); an unpriced hz still applies the note's values, then stops */
function noteSet(voice, n, time){
  if(n.role==='ld'){ const gl=applyFx(n.values); if(n.hz!==null && !okHzE(n.hz)) return; sympBase(n.symp);
    leadSet(voice,n.hz,n.vel,n.deg,n.oct,n.timbre,gl,time); return; }
  if(n.role==='ch'){ chordGlide(voice,n.hz,n.vel,n.bri,time); return; }
  if(n.role==='bs') bassSet(voice,n.hz,n.vel,n.deg,n.oct,fxGlideOf(n.values),fxBriOf(n.values),time);
}
function noteOff(voice, n, time){ if(n.role==='ld') leadOff(voice,n.tie,time); else if(n.role==='ch') chordOff(voice,time); else if(n.role==='bs') bassOff(voice,time); }
/* the bend curve of a solo note: plan { points, base (Hz), spb (seconds per beat), from (beats into the curve) } */
function bend(voice, plan, time){ scheduleBend(voice,plan.points,plan.base,plan.spb,plan.from||0,time); }
/* a drum hit; owner = the track's hit key (level, pan) or null (a live hit) */
function hit(owner, h, time){ if(owner) hitOwner(owner); drumHit(h.row,h.vel,h.kit,fxBriOf(h.values),time); }
/* the drone of a drone event; owner = its track key or null (live); d { view (the event's view, null = live), level } */
function drone(owner, d, time){ if(owner) dronePan(ownerPan(owner),time); droneUse(d.view||null); droneOn(d.level*(owner?ownerGain(owner):1),time); }

/* ═══ AUD1a (RUN 3, 2026-10-16; docs/AUD1-design.md, option C + review R1): THE ENGINE CONTEXT `E` OF THIS MODULE INSTANCE ═══
   One per instance — the live engine (`audio.js`) and the render copy (`audio.js?render`) each have their own; never shared.
   ⛳ E is the ONE place code moved out of audio.js (AUD1c timbres, AUD2 effects, engine/fdn) reads engine state from. Every field is a
   GETTER over this instance's module variable (R1): E can never hold a stale copy — after initAudio, after the worklets loaded, after a
   render re-initialised the copy against a fresh context, E reads what the module holds NOW. The scratch state of the voice being built
   (`build`) also has setters (a moved builder writes it only through E). ⛔ Never in E: static data (timbre tables, FX_FACTORY, REV_A …).
   Probe row «AUD1 engine context» (probes/engine.js). */
const E=Object.freeze({
  get ac(){ return AC; }, get offline(){ return offline; }, get rate(){ return AC ? AC.sampleRate : 0; }, get rnd(){ return rnd; }, dbg:DBG,
  master:Object.freeze({ get in(){ return master; }, get glue(){ return mGlue; }, get make(){ return mMake; }, get lim(){ return mLim; },
    get limiter(){ return limiter; }, get out(){ return outLast; }, get meter(){ return meterAn; }, get level(){ return masterLvl; }, get limRed(){ return limRed; } }),
  /* role buses: the solo sum before the expression stage, the chain heads (live), the drone bus; `head(key)` = a chain key's head */
  bus:Object.freeze({ get ldSum(){ return leadSum; }, get ch(){ return chordBus; }, get bs(){ return bassBus; }, get dr(){ return drumBus; }, get drone(){ return backBus; } }),
  head:key=>FX_CHAIN_HEAD[key],
  /* AF5 track heads (rule #31) — the live instance only; null in the render copy */
  trackBus:Object.freeze({ get ld(){ return leadOutT; }, get ch(){ return chordBusT; }, get bs(){ return bassBusT; }, get dr(){ return drumBusT; } }),
  lfo:Object.freeze({ get vib(){ return vibLFO; }, get trem(){ return tremLFO; }, get shimPitch(){ return exprVibPitch; }, get shimAmp(){ return exprVibAmp; } }),
  expr:Object.freeze({ get wah(){ return exprWah; }, get satSoft(){ return exprSatSoftG; }, get satHard(){ return exprSatHardG; }, get dlyWet(){ return exprDlyWet; } }),
  fx:Object.freeze({ inst:FX_INST, head:FX_CHAIN_HEAD, out:FX_CHAIN_OUT, links:FX_CHAIN_LINKS, path:FX_PLAY_PATH, aim:FX_AIM, dipT:FX_DIP_T }),
  pool:Object.freeze({ ld:Object.freeze({ v:lv, hold:leadHold }), ch:Object.freeze({ v:cv, hold:chordHold, ff:ffLive, seed:cvSeedAt }), bs:Object.freeze({ v:bv, hold:bassHold }) }),
  wk:Object.freeze({ get ks(){ return ksReady; }, get dyn(){ return dynReady; }, get dynWarned(){ return dynWarned; }, set dynWarned(x){ dynWarned=x; },
    get frz(){ return frzReady; }, get frzStore(){ return frzStoreNode; },
    get frzSink(){ return frzSink; }, get cap(){ return capMod; }, get capOk(){ return capOk; } }),
  /* lookups the recorder installs on the live instance (renders: their own per render) */
  look:Object.freeze({ get gainOf(){ return trackGainOf; }, get panOf(){ return trackPanOf; }, get routeOf(){ return trackRouteOf; },
    ownerGain, ownerPan }),   // AUD1c: this instance's owner → level / pan (they read the lookups above)
  buf:Object.freeze({ get noise(){ return noiseBuf; }, forestIRs, forestData }),   // forestData(rate, sec) — the cached Night forest IR (AUD2a)
  drone:Object.freeze({ get o1(){ return dO1; }, get o2(){ return dO2; }, get g(){ return dG; }, get pan(){ return dPan; }, get view(){ return dView; } }),
  /* scratch of the voice being built (per build; reset by the builders) */
  build:Object.freeze({ banks, get hum(){ return bldHum; }, set hum(x){ bldHum=x; }, get vib(){ return bldVib; }, set vib(x){ bldVib=x; },
    get shim(){ return bldShim; }, set shim(x){ bldShim=x; }, get symp(){ return pendSymp; }, set symp(x){ pendSymp=x; },
    get firstOsc(){ return voiceFirstOsc; }, set firstOsc(x){ voiceFirstOsc=x; }, get hitOwner(){ return hitOwnerKey; }, set hitOwner(x){ hitOwnerKey=x; },
    get hitBus(){ return hitBus; }, set hitBus(x){ hitBus=x; } }),
});
const engineCtx=()=>E;
export {
  initAudio, AC, setLeadInstr, applyFx, applyExpr, scheduleBend, bendTapSet, leadCancel, metroClick,
  leadOn, leadSet, leadOff, leadAllOff, leadHold,   // соло — пул с владельцами (было: моно noteOn/noteOff/applyParams)
  chordOn, chordGlide, chordOff, chordHold,
  setBassInstr, bassOn, bassSet, bassOff, bassHold, drumHit, setDrumKit, droneOn, droneOff, droneRetune,
  droneUse, droneHz, sympBase,   // TF2: the drone sounds its event's view; sympathetic strings tune to the solo note's view (ENG sets both)
  LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_NAMES, DRUM_ROWS, DRUM_KITS, createRecordingTap,
  setTrackGainOf, ownerGain, trackGainRetune, hitOwner, setMasterLevel, masterLevel, masterMeter,   // MX1: уровень дорожки (ступень в голосе по ключу владельца), мастер и измеритель
  setTrackPanOf, ownerPan, trackPanRetune, dronePan, panGains,   // MX2: панорама дорожки (стерео-ступень в голосе по ключу владельца, закон равной мощности)
  renderReset, renderStateOf,   // сброс копии рендера в начале и в конце каждого рендера (зовёт ТОЛЬКО render.js у своей копии) и его снимок для стража P.all
  timbresOf, timbreIdOf, timbreById, timbreReg, timbreKey, timbreIdx, timbreSnapshot, timbreRecord, timbreInstall, timbreForgetDbg,   // TIM3d: records, session installs   // TIM2: event ids ↔ engine positions, the song file's timbre copy
    // T5: тембры роли [{id,name}] — ЕДИНСТВЕННЫЙ вход выбора тембра дорожки (готов к тембрам пользователя)
  FX_FACTORY, fxInstance, fxSetActive, fxChainResplice, fxSnapshot, fxChordBri, fxCaptureChain, fxCaptureWalk,
  fxPlaySet, fxPlayPath, fxParamKeysOf, fxRestoreAim,   // O-3: переигровка автоматизации — величина по имени, СОСТАВ цепи на время воспроизведения, имена параметров для разбора снимка и возврат звука к прицелу руки на остановке
  fxPerm,   // VOL-0: постоянная запись цепи (громкость) — единый предикат «не показывать и не предлагать»
  fxHandRange,   // VOL-1: ход руки по параметру из объявления (с VOL-2b у громкости — полный [0, 1])
  fxIsPerNote, fxNoteField, fxNoteFollows, fxVoiceIdsFor,   // V4b: параметр «в ноте» и где он лежит в событии (полоса правит НОТЫ); голосовые эффекты, которые можно добавить дорожке роли
  fxParamMetaOf, fxDefaultsOf, fxAddableIds,   // O-4: полоса автоматизации — подписи параметров, дефолты для эффекта, добавленного в редакторе, и что вообще можно добавить
  fxAimSet, fxAimGet, FX_AMT,   // O-3.1: ПРИЦЕЛ РУКИ — пишет ТОЛЬКО рука (через fxParamsOf), читают столбики. FX_AMT — имя единственного параметра старых скаляров: одно на запись, показ и прицел
  makeFrozenBus,   // F4: шина ЗАМОРОЖЕННОЙ дорожки — свой гейн прямо в мастер (цепь уже вплавлена в буфер, второй раз её накладывать нельзя); им же делается приглушение/соло
  fxRenderPath, fxGateAt,   // РЕНДЕР: проводка всех бывших в цепи эффектов разом + затворы в ЗАПИСАННЫЕ доли (состав, менявшийся посреди взятого). ⛔ Живьём вызывающих нет
  setDbg, dbgExprBypass,   // ОТЛАДКА НА СЛУХ (render.aud): переключатели и обход выразительности — ⛔ только у копии рендера, живьём вызывающих нет
  fxBriOf,   // ЯРКОСТЬ соло/баса/удара из карты события (0..1) или undefined «не задана». Читает ENG (обе копии движка)
  fxGlideOf, FX_GLIDE_KEY,   // V4: скольжение ноты из её карты эффектов (секунды) или undefined — «не задано». Читает ENG (обе копии движка — живая и рендерная — через makeENG)
  /* LR1: съём живого мастера (только для пробы P.checkRevAgree); переключатель проводки ревербов снят в AF1 (уборка LR1) */
  probeCapture, probeCaptureReady, fxDipLog,
  /* AF2: подмена событий буфером — равномощный перекрёст и срез голосов дорожки в миг подмены (зовёт recorder) */
  xfRamp, voicesCut,
  /* AF6b: 16-битное хранилище замороженных дорожек на потоке звука и чтец; frzReady — ворклет загрузился (живая связка) */
  frzReady, frzStorePut, frzStoreDel, frzStoreDbg, frzReader, frzStoreCount,
  fxDenormOf, offlineTapMaster,   // F3: разнормировать величину параметра В ЕГО ЕДИНИЦЫ (снимок хранит 0..1, а длину хвоста надо считать в СЕКУНДАХ) и снять лимитер с пути ОФЛАЙН-рендера
  engVoices, engLevels, engLoad,   // ENG2: engine readouts (read only) — the latency meter, R.engine()
  poolDbg,      // POOL1: probe control — the eager chord pool of before (render copy, P.checkPool)
  poolSizes,    // A0 (автозаморозка): сколько голосов ЗАВЕЛА раскладка — чистое чтение для отчёта рендера. ⛔ Живьём вызывающих нет; см. его шапку — это главная переменная стоимости раскладки
  setOffline,   // F2: ОФЛАЙН-РАСКЛАДЧИК ГОЛОСОВ (занятость по звучанию, рост пула по требованию, без кражи). ⛔ У ЖИВОЙ копии вызывающих нет и быть не должно — ставит только render.js и только у своей; при false всё поведение прежнее, дословно
  setRnd,    // F1: ПОДМЕНИТЬ ИСТОЧНИК СЛУЧАЙНОСТИ В ЭТОЙ КОПИИ МОДУЛЯ. ⛔ У ЖИВОЙ копии вызывающих нет и не должно быть — зовёт его только render.js и только у своей ('./audio.js?render…'). Экспортирован потому, что иначе до офлайн-копии не дотянуться; глобальный патч Math.random убил бы гуманизацию ЖИВОЙ игры (довод целиком — у самого rnd)
  /* AF5: track heads and routing (recorder installs the owner test), probe reads */
  setTrackRouteOf, routeOfOwner, chainStateOf,
  /* RENDER-LEAK: first solo KS timbre index — a track render loads the KS worklet only when the track uses one */
  LEAD_KS_FROM, leadIsKs,   // TIM3b: leadIsKs(i) — a KS timbre by its record's engine
  ksReady,   // F0: ЗАГРУЗИЛСЯ ЛИ KS-ВОРКЛЕТ В ЭТОТ КОНТЕКСТ. Живая связка, до initAudio читается как true (начальное значение) — спрашивать ТОЛЬКО после него. Нужна зонду рендера: у офлайн-копии свой контекст и своя загрузка, и провал там ТИХИЙ (buildKSFallback молча подменяет семь тембров), см. render.js
  masterDynSet, masterDyn, offlineMasterDyn, forestData, dynReady, ffInfo, masterDelayMs, masterProbeNodes,
  /* AUD1a: the engine context of this instance (probes; moved builders receive it) */
  engineCtx,
  /* ENG1: the engine contract (plan §4.4) — makeENG calls only these */
  noteOn, noteSet, noteOff, bend, hit, drone,
};
