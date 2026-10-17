/* REC5 (stage 3) — THE ENGINE TABLE: makeENG (one dispatch table for live play, replay and the render copy), the live ENG, and the
   event pricing at play time (evHz, evTi, evReg) — moved from recorder.js (which re-exports them — a facade). Moved verbatim. */
import { CUR, baseF, bassFreqTi, chordFreqsAt, leadFreqTi, modeSlotOfTi, tuningIndexOf } from '../scales.js';
import { leadIdx, seventh } from '../state.js';
import { bassOwnerKey, chOwnerKey, ldKey } from '../song/notes.js';
import { secPerBeat } from '../transport/clock.js';
import * as AUD from '../audio.js';
import { BUS } from '../core/bus.js';   // VIS1a: the live notes for the visuals

/* ENG — единая точка исполнения (живьём через W* и на переигровке). deg→частота
   выводится ЗДЕСЬ. Ладовый КОНТЕКСТ: живьём (ctx нет) — текущий лад/септаккорд;
   на переигровке ctx=событие с ЗАМОРОЖЕННЫМ ладом (ev.sc) и септаккордом (ev.sev),
   §3.4. baseF() всегда живой → тоника глобальна, лад заморожен. leadFreq/bassFreq
   сами страхуют ступень вне лада (модуло+октава), так что частота не улетает в NaN.
   Владелец голосов ПО СЛОЮ (ctx=событие переигровки): аккорд — 'loop:'+layer / живой
   'latch'; бас — 'bassloop:'+layer / живой 'bass'. Так слой не крадёт голос у живого. */
/* ⛳ ЕДИНАЯ ФОРМА ВЫЗОВА: КАЖДАЯ запись ENG — это (a, ctx, opt), где opt — ОДИН И ТОТ ЖЕ ИМЕНОВАННЫЙ
   набор `{when, live, own}`. Слайс S2 завёл эту форму, и это НЕ косметика, а снятие ловушки.
   ⚠️ ЧТО БЫЛО: у записей была РАЗНАЯ позиционная форма — `leadOn:(a,ctx,live,own)` против
   `chOn:(a,ctx,when)` и `bassOn:(a,ctx,when,live)`, — а диспетчер планировщика зовёт их ОДИНАКОВО:
   `ENG[ev.fn](ev.a, ev, when)`. Пока лид шёл мимо планировщика (fireNear), это сходило с рук. Но стоило
   бы завести лид в планировщик — и ВРЕМЯ В СЕКУНДАХ легло бы в слот ЖИВЫХ ГЕРЦ терменвокса: нота
   зазвучала бы на абсурдной высоте или не зазвучала вовсе. Тихо, правдоподобно, ищется долго.
   ⚠️ ПОЧЕМУ НЕ ХВАТИЛО БЫ «поставить when последним у всех». У лида кроме when есть ещё live и own,
   поэтому третий позиционный слот У РАЗНЫХ записей всё равно значил бы разное — в каком порядке ни
   расставляй. Ловушка позиционная ПО ПРИРОДЕ, и лечится она только снятием позиционности: у
   дополнительных аргументов больше НЕТ номеров, есть ИМЕНА. Время может попасть в `live` теперь лишь
   у того, кто СОБСТВЕННОРУЧНО напишет слово `live`, — то есть ошибка стала невыразимой, а не
   несовершённой.
   ⚠️ live (живые Гц терменвокса) остаётся ОТДЕЛЬНЫМ полем и ЖИВЫМ-ТОЛЬКО (правило #11): переигровка
   его не передаёт никогда, частота там выводится из ступени по замороженному ладу.
   ⛔ Добавляешь запись в ENG — держи ту же форму. Второй формы здесь быть не должно. */
/* ⛳ ТАБЛИЦА ДИСПЕТЧЕРИЗАЦИИ — ТЕПЕРЬ ФАБРИКА (слайс F3), А НЕ ЛИТЕРАЛ.
   Причина одна: офлайн-рендер обязан звать ТЕ ЖЕ отображения «событие → вызов движка», но у ДРУГОЙ
   копии движка (своей, против своего контекста). Второй такой таблицы писать нельзя — она бы
   разошлась с этой, и замороженная дорожка зазвучала бы иначе, чем её играет транспорт. Поэтому
   таблица параметризована модулем звука: живая — makeENG(AUD), рендерная — makeENG(своя копия).
   ⚠️ ТЕЛА ЗАПИСЕЙ НЕ ТРОНУТЫ — добавлен только префикс A. у функций звука. Ключи владельцев
   (ldKey/chOwnerKey/bassOwnerKey), замороженный лад и loop.bpm остаются здешними: они про ЗАПИСЬ,
   а не про движок, и у обеих копий обязаны быть одни и те же. */
/* ═══ T4b1: ЗВУК ЧИТАЕТ ИНДЕКС В СТРОЕ ═══
   Таблица ниже цены соло и баса берёт из a.ti (scales.leadFreqTi/bassFreqTi — та же функция высоты, побитно та же цена; проба
   P.checkSound), аккорда — через chordFreqsAt (из индекса — там, где это побитно то же, иначе по ступени: см. её шапку).
   ⛳ ОТКУДА ИНДЕКС: у события — a.ti (T4a, три воронки записи). ЖИВОЙ вызов (W*, ctx==null) несёт нагрузку жестов — у неё индекса нет:
   переводим ступень той же функцией T4a (tuningIndexOf, живой вид CUR) — это не запасной путь, а сама цена живой ноты.
   ⛳ T4c-2: у ЗАПИСАННОГО события — только a.ti (ступени в событии нет); у ЖИВОЙ нагрузки жестов (ctx==null) — её ступень лада,
   переведённая той же функцией записи: это вход жестов, а не запасной путь. Без индекса цена — не число, и таблица ниже атаку пропускает. */
function evTi(a,ctx,chord){ return ctx ? a.ti : tuningIndexOf(a.deg, CUR(), chord); }
/* ⛳ T4c-1: ЦЕНА СОБЫТИЯ ДЛЯ ЗВУКА — ОДНА ЧИСТАЯ ФУНКЦИЯ на роль (соло 'ld', бас 'bs' — частота; аккорд 'ch' — частоты нот). Её зовут
   таблица ENG и проба P.checkStrip — второй формулы нет. Читает a.ti, a.oct, a.ty и вид/септаккорд контекста; ступень — только у ЖИВОЙ
   нагрузки (evTi). Нет цены (нет индекса, высоты нет в ладу) — соло/бас NaN, аккорд — пустой список: таблица атаку пропускает. */
/* TF0 control (probe only): one track priced off by a few cents — the song fingerprint must catch it. null = off (the normal path). */
let EVHZ_DBG=null;
const evHzDbg=(layer,cents)=>{ EVHZ_DBG= layer==null ? null : { layer, r:Math.pow(2,cents/1200) }; };
function evHz(a,ctx,role){
  const f=evHz0(a,ctx,role), D=EVHZ_DBG;
  return D && ctx && ctx.layer===D.layer ? (Array.isArray(f) ? f.map(x=>x*D.r) : f*D.r) : f;
}
function evHz0(a,ctx,role){
  const sc=ctx?ctx.sc:CUR(), ti=evTi(a,ctx,role==='ch');
  if(role==='ld') return leadFreqTi(ti,a.oct,sc);
  if(role==='bs') return bassFreqTi(ti,a.oct,sc);
  return chordFreqsAt(ti,a.oct,sc,ctx?ctx.sev:seventh,a.ty);
}
/* ⛳ T4c-1: МЕСТО ГОЛОСА В РЕЕСТРЕ (leadHold/bassHold: deg/oct — для подсветки). Живой вызов — ступень жеста, как была (подсвечивает
   только живые ключи, правило #26); переигранный — место индекса в ладу события (обратная выборка), а не записанная ступень. */
function evReg(a,ctx){
  if(!ctx) return { deg:a.deg, oct:a.oct };
  return modeSlotOfTi(evTi(a,ctx,false), a.oct, ctx.sc) || { deg:undefined, oct:a.oct };
}
const okHz=f=>typeof f==='number' && Number.isFinite(f);
/* ⛳ ENG1 (RUN 3): the adapter calls ONLY the engine contract (audio.js noteOn / noteSet / noteOff / bend / hit / drone, plan §4.4) and
   prices every note itself — Hz from the event's frozen view (evHz), the timbre id → position (timbreIdx; an unknown id → the live timbre),
   the sympathetic-string base from the note's view. ⚠️ setLeadInstr(a.inst) is not called here on purpose: a replayed layer must never
   repaint the live instrument — the timbre is baked into the voice at its attack. `when` — the explicit time (the scheduler's look-ahead);
   the live path (W*) passes none (= now). `live` — the theremin's continuous Hz (live only, rule #11); replay prices from the frozen view. */
const makeENG=A=>({
  leadOn:(a,ctx,{when,live,own}={})=>{ const o=own||ldKey(ctx,a);
              const base=evHz(a,ctx,'ld'); if(live==null && !okHz(base)) return;   // T4c-1: no index — no note
              const g=evReg(a,ctx);
              A.noteOn(o,{ role:'ld', hz: live!=null?live:base, vel:a.vol, timbre: a.inst===undefined?leadIdx:(A.timbreIdx('ld',a.inst)??leadIdx), deg:g.deg, oct:g.oct,
                live: live!=null, tie:a.tie, values:a.fx, symp: ctx&&ctx.sc ? baseF(ctx.sc) : null, cancel:!!ctx }, when);   // TF2: a replayed note's strings follow its view's key
              if(a.bend&&a.bend.length) A.bend(o,{ points:a.bend, base, spb:secPerBeat(), from:a.bendFrom||0 }, when); },   // BEND-CURVE: bendFrom — the chase enters the curve late
  leadSet:(a,ctx,{when,own}={})=>{ const o=own||ldKey(ctx,a), g=evReg(a,ctx);
              A.noteSet(o,{ role:'ld', hz: a.hold?null:evHz(a,ctx,'ld'), vel:a.vol, deg:g.deg, oct:g.oct, timbre:A.timbreIdx('ld',a.inst), values:a.fx,
                symp: ctx&&ctx.sc ? baseF(ctx.sc) : null }, when); },   // a theremin hold carries no pitch; an unpriced note applies its values only (as before)
  leadOff:(a,ctx,{when,own}={})=>A.noteOff(own||ldKey(ctx,a),{ role:'ld', tie:a&&a.tie },when),   // T3: a.tie — the note continues in another track after a timbre switch
  chOn:(a,ctx,{when}={})=>{ const F=evHz(a,ctx,'ch'); if(F.length) A.noteOn(chOwnerKey(ctx),{ role:'ch', hz:F, vel:a.vol, timbre:A.timbreIdx('ch',a.inst), bri:a.bri },when); },   // no notes — no attack
  chSet:(a,ctx,{when}={})=>{ const F=evHz(a,ctx,'ch'); if(F.length) A.noteSet(chOwnerKey(ctx),{ role:'ch', hz:F, vel:a.vol, bri:a.bri },when); },
  chOff:(a,ctx,{when}={})=>A.noteOff(chOwnerKey(ctx),{ role:'ch' },when),
  /* V4: the bass glide and brightness come from the event's map; NO map = «not set» (the engine's own BASS_GLIDE_TC), never the live chain
     (a backing bass line must not glide as the hand is set now). A theremin frame (live) gets no glide (contract V1). */
  bassOn:(a,ctx,{when,live,own}={})=>{ const f=live!=null?live:evHz(a,ctx,'bs'); if(!okHz(f)) return; const g=evReg(a,ctx);
              A.noteOn(own||bassOwnerKey(ctx),{ role:'bs', hz:f, vel:a.vol, timbre:A.timbreIdx('bs',a.inst), deg:g.deg, oct:g.oct, live: live!=null, values:a.fx },when); },
  bassSet:(a,ctx,{when}={})=>{ const f=evHz(a,ctx,'bs'); if(!okHz(f)) return; const g=evReg(a,ctx);
              A.noteSet(bassOwnerKey(ctx),{ role:'bs', hz:f, vel:a.vol, deg:g.deg, oct:g.oct, values:a.fx },when); },
  bassOff:(a,ctx,{when,own}={})=>A.noteOff(own||bassOwnerKey(ctx),{ role:'bs' },when),   // P2: own — the live owner (WbassOff); replay takes the key from the event
  drum:(a,ctx,{when}={})=>A.hit(ctx ? 'hit:'+ctx.layer : null,{ row:a.row, vel:a.vol, kit:A.timbreIdx('dr',a.kit), values:a.fx },when),   // MX1: the hit key — the track's level and pan
  drone:(a,ctx,{when}={})=>A.drone(ctx ? 'drone:'+ctx.layer : null,{ view: ctx?ctx.sc:null, level:a.lvl },when),   // TF2: the drone sounds its event's view; MX1/MX2: the track's level and pan
});
/* VIS1a: the LIVE table publishes every contract call on the bus's `notes` ring (live hands AND replayed tracks — what the person hears);
   the render copy's table (makeENG(its copy)) publishes nothing. One item per call: { kind, owner, role, hz, vel, deg, oct, when } — when =
   the audio time the engine was told (null = now). */
const pub=(kind,f)=>(o,p,when)=>{ BUS.push('notes',{ kind, owner:o, role:p&&p.role, hz:p&&p.hz, vel:p&&p.vel, deg:p&&p.deg, oct:p&&p.oct, when:when??null }); return f(o,p,when); };
const AUD_BUS={ noteOn:pub('on',AUD.noteOn), noteSet:pub('set',AUD.noteSet), noteOff:pub('off',AUD.noteOff), bend:pub('bend',AUD.bend), hit:pub('hit',AUD.hit),
  drone:pub('drone',AUD.drone), timbreIdx:(r,x)=>AUD.timbreIdx(r,x) };
const ENG=makeENG(AUD_BUS);   // ЖИВАЯ таблица — против живой копии движка (VIS1a: through the bus publisher)

export { evHzDbg, evHz, evReg, makeENG, ENG };
