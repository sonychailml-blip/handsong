/* ======================================================================
   ЗАМОРОЖЕННЫЕ ДОРОЖКИ В 16 БИТАХ — ХРАНИЛИЩЕ И ЧТЕЦ НА ПОТОКЕ ЗВУКА (слайс AF6b)
   ----------------------------------------------------------------------
   ⛳ ЧТО ЗДЕСЬ. Две вещи одного глобального пространства ворклета (оно ОДНО на контекст и общее для всех
   процессоров этого модуля):
     • 'frz-store' — ХРАНИЛИЩЕ: один долгоживущий узел; через его порт приходят данные дорожки
       {op:'put', key, ch:[[кусок,…] на канал], len, chunk(степень двойки), mul, kind} — куски ПЕРЕДАЮТСЯ
       (transfer), не копируются: на главном потоке их больше нет, единственная копия живёт здесь;
       {op:'del', key} — снять (уже играющие чтецы держат свою ссылку и доигрывают); {op:'dbg', key, shift, drop}
       — только проба P.checkChunks: кусок shift читается со сдвигом на сэмпл, кусок drop — тишиной.
     • 'frz-reader' — ЧТЕЦ: заменяет одноразовый AudioBufferSourceNode. processorOptions {key, startF, d}:
       на кадре контекста F (≥ startF) он выдаёт сэмпл буфера с номером F + d, ЦЕЛЫЙ кадр к целому кадру — без
       дробного старта и без интерполяции; кусков на стыках нет вовсе: чтение одно и сквозное, «кусок» — лишь
       единица хранения. Порт: {stop:кадр} — с этого кадра молчит и завершается; по завершении шлёт
       {ended:true, played:сколько сэмплов буфера выдано}.
   ⛳ ПРЕОБРАЗОВАНИЕ В FLOAT — ровно перед выводом, квант за квантом (128 кадров), умножением на mul
   (масштаб дорожки / 32767 у 16 бит, 1 у float-хранения пробы). Поэтому заминка ГЛАВНОГО потока (раскладка,
   сборщик мусора, распознавание рук) чтеца не касается: данные уже здесь, команды старта уходят заранее
   (окно планировщика SCHED_AHEAD).
   ⛔ Значения не дорабатываются ничем — ни интерполяцией, ни сглаживанием: вывод = q·mul, точно.
   ====================================================================== */
const STORE=new Map();   // key → { ch:[[Int16Array|Float32Array…]…], len, shift, mask, mul, nch, dbg }
const WAIT=new Map();    // key → [чтецы, ждущие данных] — им «готов», как только данные легли (AF6b-fix)
let ALIVE=0;             // AF6b-fix2: сколько чтецов ЖИВО на потоке звука (построен и ещё не завершился) — доказательство «утечки нет» (проба)

class FrzStore extends AudioWorkletProcessor {
  constructor(){
    super();
    this.port.onmessage=e=>{ const m=e.data||{};
      if(m.op==='put'){ const sh=Math.round(Math.log2(m.chunk));
        STORE.set(m.key,{ ch:m.ch, len:m.len, shift:sh, mask:(1<<sh)-1, mul:m.mul, nch:m.ch.length, dbg:null });
        const w=WAIT.get(m.key); if(w){ WAIT.delete(m.key); for(const r of w) r.ready(); } }
      else if(m.op==='del'){ STORE.delete(m.key); WAIT.delete(m.key); }
      else if(m.op==='dbg'){ const s=STORE.get(m.key); if(s) s.dbg= (m.shift==null&&m.drop==null&&!m.nostop) ? null : { shift:m.shift, drop:m.drop, nostop:!!m.nostop }; }
      else if(m.op==='count') this.port.postMessage({ count:{ alive:ALIVE }, id:m.id });   // AF6b-fix2: ответ пробе (по id запроса)
    };
  }
  process(){ return true; }   // узел живёт, пока жив контекст: он лишь держит порт хранилища
}
registerProcessor('frz-store', FrzStore);

/* ⛳ AF6b-fix: ЧТЕЦ-ЗАПАС. Чтеца можно создать ПУСТЫМ (без startF) заранее — при заморозке и сразу после каждого старта, — а пустить
   сообщением {play:{startF, d}}. Так создание процессора на потоке звука (асинхронное, его задержку главный поток не видит) не ложится
   между командой и кадром старта. «Готов» ({ready:true}) он шлёт, когда и сам построен, и данные его дорожки уже в хранилище: заморозка
   становится играющей ТОЛЬКО после этого (recorder.frzActivate) — буфер, чьих данных ещё нет на потоке звука, не зазвучит никогда.
   В отчёте о конце — first: кадр, с которого чтец НА ДЕЛЕ выдал первый сэмпл буфера (проба сверяет его со стартом: опоздание видно). */
class FrzReader extends AudioWorkletProcessor {
  constructor(opts){
    super();
    const o=(opts&&opts.processorOptions)||{};
    this.key=o.key; this.startF= o.startF==null ? null : o.startF|0; this.d=o.d|0; this.stopF=Infinity; this.s=null; this.played=0; this.done=false; this.first=null; this.seen=null; this.nextF=null;
    this.port.onmessage=e=>{ const m=e.data||{};
      if(m.play){ this.startF=m.play.startF|0; this.d=m.play.d|0; }
      if(m.stop!=null){ this.stopF=Math.min(this.stopF, m.stop); if(this.seen==null) this.seen=currentFrame; } };   // eslint-disable-line no-undef   // seen — кадр, когда команда дошла (опоздание видно пробе)
    ALIVE++;
    if(STORE.has(this.key)) this.ready(); else { const w=WAIT.get(this.key)||[]; w.push(this); WAIT.set(this.key,w); }
  }
  /* AF6b-fix2: контроль пробы «чтец, не слышащий остановки» (dbg.nostop): после кадра остановки молчит, но НЕ завершается — ровно то, что
     проба обязана увидеть как неотчитавшийся и живой чтец. Снимают dbg — завершается на следующем кванте. */
  nostop(){ const s=this.s||STORE.get(this.key); return !!(s&&s.dbg&&s.dbg.nostop); }
  ready(){ this.port.postMessage({ ready:true }); }
  finish(){ if(!this.done){ this.done=true; ALIVE--; this.port.postMessage({ ended:true, played:this.played, first:this.first, seen:this.seen }); } return false; }
  process(inputs, outputs){
    /* ⛳ КАДР КВАНТА — НЕ НАЗАД (слайс AUTO-PROBE). Chrome изредка отдаёт тот же currentFrame два вызова подряд (замер съёмом проб: скачки
       −128 и +128 — сумма ноль, звук сплошной). Чтец по такому показанию повторил бы квант и пропустил следующий. Узел обрабатывается
       КАЖДЫЙ квант (сток frzSink тянет его до конца), значит кадр следующего вызова — не меньше прежнего + n: берём наибольшее. */
    const out=outputs[0], L=out[0], R=out[1]||out[0], n=L.length, F0= this.nextF==null ? currentFrame : Math.max(currentFrame, this.nextF);   // eslint-disable-line no-undef
    this.nextF=F0+n;
    if(this.done) return false;
    if(this.startF==null){ if(F0>=this.stopF) return this.finish(); L.fill(0); if(R!==L) R.fill(0); return true; }   // запас, ещё не пущен
    if(F0>=this.stopF && this.nostop()){ L.fill(0); if(R!==L) R.fill(0); return true; }   // контроль пробы: остановка «не услышана»
    if(F0>=this.stopF) return this.finish();
    if(!this.s){ this.s=STORE.get(this.key)||null; if(!this.s){ if(F0+n>this.startF+this.s_wait()) return this.finish(); return true; } }
    const s=this.s, sh=s.shift, mk=s.mask, len=s.len, mul=s.mul, c0=s.ch[0], c1=s.ch[s.nch>1?1:0], dbg=s.dbg;
    let endS=false, endD=false;   // конец по остановке / по концу данных (контроль nostop глушит только первый)
    for(let i=0;i<n;i++){
      const F=F0+i;
      if(F<this.startF){ L[i]=0; R[i]=0; continue; }
      if(F>=this.stopF){ L[i]=0; R[i]=0; endS=true; continue; }
      let idx=F+this.d;
      if(idx<0){ L[i]=0; R[i]=0; continue; }
      if(idx>=len){ L[i]=0; R[i]=0; endD=true; continue; }
      let k=idx>>sh;
      if(dbg){ if(k===dbg.drop){ L[i]=0; R[i]=0; this.played++; continue; }
               if(k===dbg.shift && idx+1<len){ idx++; k=idx>>sh; } }
      const p=idx&mk;
      L[i]=c0[k][p]*mul; R[i]=c1[k][p]*mul; this.played++; if(this.first===null) this.first=F;
    }
    if(endD || (endS && !this.nostop())) return this.finish();
    return true;
  }
  /* Данные не пришли: ждём до секунды после старта (порт хранилища и создание чтеца — разные очереди), потом сдаёмся молча. */
  s_wait(){ return sampleRate; }   // eslint-disable-line no-undef
}
registerProcessor('frz-reader', FrzReader);
