/* REC1 (stage 3) — THE SONG'S EVENT STORE, moved verbatim from recorder.js (which re-exports these names — a facade). Pure: no DOM,
   no Web Audio, imports nothing. Owns the one `events` array (a stable reference), its generation counter `evGen` and the one rebase point
   `schedInvalidate` (rule #28): it bumps the generation, then runs every listener registered by `onInvalidate` in registration order
   (today one: the recorder's cursors, chase cache, note view, song length and brace — the same statements in the same order as before).
   Also: birth order (`evSeq`, `evOrder`), in-place removal (`compactEvents`), and the kind of an event (`evRole`, `chaseRole`,
   `isNoteStart`). */

const events=[];                                     // стабильная ссылка (её читает визуализация в draw)

/* ---- the kind of an event ---- */
const chaseRole=f=> f[0]==='c'?'ch' : f[0]==='b'?'bs' : f[0]==='l'?'ld' : null;   // drum/drone — не владельцы голосов
/* РОЛЬ СОБЫТИЯ. chaseRole отвечает только про владельцев ГОЛОСОВ (аккорд/бас/соло) и на ударе молчит —
   ему так и надо, он про догонялку. Здесь вопрос другой: «чья это цепь эффектов», и у ударных она есть.
   Дрон остаётся без роли НАМЕРЕННО: он фон, в конструкторе не выбирается и цепи не имеет (см. довод
   у регистрации ролей в initAudio). */
const evRole=fn=> fn==='drum' ? 'dr' : chaseRole(fn);
const isNoteStart=fn=> fn==='leadOn'||fn==='chOn'||fn==='bassOn'||fn==='drum';   // the note starts — the only events that name a track's source (T3)
const maxLayer=()=>events.reduce((m,e)=>Math.max(m,e.layer),0);

/* ---- birth order ---- */
/* ED1 fix: events at the SAME beat keep their order through edits and undo. songNotes pairs a key's events by array order, and a note-off
   and the next note-on of that key often share a beat; a plain stable sort put an event moved away and back AFTER its neighbour (undo of
   a moved note → the next note closed at once, its own off an orphan). Every event gets a birth number before any edit touches it
   (editGuard — the one entry of every edit, undo and redo); the editor sorts by (beat, birth number). */
const evSeq=new WeakMap(); let evSeqN=0;
function evSeqFill(){ for(const e of events) if(!evSeq.has(e)) evSeq.set(e,++evSeqN); }
const evOrder=(x,y)=> x.t-y.t || (evSeq.get(x)||Infinity)-(evSeq.get(y)||Infinity) || 0;

/* ---- the generation and the one rebase point ---- */
/* ⛳ ПОКОЛЕНИЕ СОСТАВА СОБЫТИЙ (A1) — счётчик, который поднимает ТОЛЬКО schedInvalidate. Читает его ровно
   один потребитель — глобальная часть ключа мемо подписи свежести (frzGlobalKey). ⚠️ ЗАЧЕМ ОН, ЕСЛИ ЕСТЬ
   events.length: число событий не ловит «сняли N и тут же положили N» — смена подложки (clearJam и
   loadJam подряд) с тем же числом событий, при неподвижных takeFxVer и приколоченном. Одноместное мемо
   этого не замечало лишь по случайности — пока строк на полосе было две, оно пересчитывалось на каждом
   вызове; мемо по слою такой случайности не имеет. А schedInvalidate и так стоит на КАЖДОМ пути,
   меняющем состав событий (правило #28) — второго списка мест не заводим. Запись (push) его не зовёт,
   но она меняет длину на каждом событии. */
let evGen=0, sortedN=0;
const invalidateFns=[];
/* REC1: the layers above register what a change of the event set must reset; they run synchronously, in registration order */
const onInvalidate=fn=>{ invalidateFns.push(fn); };
/* REC2: every rebase also fixes the SORTED PREFIX [0, sortedN) — the whole array (callers sort first, rule #28); a running take appends its
   unsorted tail after it without a rebase. The recorder's cursors read the same boundary (cursN). */
function schedInvalidate(){ evGen++; sortedN=events.length; for(const fn of invalidateFns) fn(); }
const sortedLen=()=>Math.min(sortedN,events.length);
/* ⛳ УПЛОТНЕНИЕ НА МЕСТЕ вместо splice-в-цикле. Прежде и onUndo, и clearJam удаляли событие за
   событием: каждый splice сдвигает ВЕСЬ хвост, поэтому снятие 10 000 событий из 30 000 — это сотни
   миллионов перемещений, то есть многосекундная заморозка потока, на котором висят и распознавание, и
   синтез. Проход с индексом записи делает ту же работу за ОДИН проход.
   ⛔ ИДЕНТИЧНОСТЬ ССЫЛКИ `events` СВЯЩЕННА: массив объявлен стабильной ссылкой и импортируется
   НАПРЯМУЮ в draw.js (полоса лупера читает его каждый кадр). Поэтому усечение через `.length`, а
   НИКОГДА не `events = …` и не новый массив — иначе draw остался бы с прежним, уже мёртвым.
   Порядок сохраняется, значит отсортированный префикс остаётся отсортированным. */
function compactEvents(drop){
  let w=0;
  for(let r=0;r<events.length;r++){ const e=events[r]; if(!drop(e)) events[w++]=e; }
  const removed=events.length-w;
  events.length=w;                                     // ⛔ усечение, а не подмена массива
  return removed;
}

export { events, evGen, schedInvalidate, onInvalidate, sortedLen, compactEvents, evSeq, evSeqFill, evOrder, maxLayer, evRole, chaseRole, isNoteStart };
