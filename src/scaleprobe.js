/* ⛳ ПРОБА УНИВЕРСАЛЬНОЙ МОДЕЛИ СТРОЯ — консольный инструмент (как ухо-проба render.js: R.aud/R.live), НЕ часть приложения.
   Никто его не импортирует: модуль грузится только руками из консоли браузера, при открытом приложении:
     const P = await import(new URL('src/scaleprobe.js', location.href).href);
     P.check()          // T0 (данные) + T1 (частоты и центы) + T2 (вид) — сводка и каждое несовпадение
     (по отдельности: P.checkData(), P.checkPitch(), P.checkView(); справка о дроне — P.drone())
     P.tracks()         // МАРШРУТ ПО СТРОЮ: каждая дорожка песни — роль, тембр, вид строя (и сколько видов в ней: больше одного быть не должно)
     P.checkHl()        // T4b4: ПОДСВЕТКА переигранной и догнанной ноты по индексу — прогон по видам, события песни, догонялка; высоты вне лада
     P.checkRowFix()    // T4b4-1: нижний ряд по умолчанию в обеих осях и ряды нот аккорда при холодном и прогретом кэше (видимая правка)
     P.checkRows()      // T4b3: РЯДЫ РЕДАКТОРА по индексу — блоки, попадание, призрак, выделение каждого сегмента песни в осях «Все» и «Лад» + прогон
     P.checkLogic()     // T4b2: ЛОГИКА РЕКОРДЕРА по индексу — сегменты всей песни и нагрузки догонялки на каждой границе событий против прежних
     P.checkSound()     // T4b1: цена ПО ИНДЕКСУ В СТРОЕ (a.ti) против цены по ступени — каждое событие песни и прогон по всем видам
     P.checkTi()        // T4a: у КАЖДОГО события текущей песни индекс в строе (a.ti) равен переводу его ступени — запускать после записи/правки/подложки
   Импорт по ТОМУ ЖЕ адресу, что у приложения ('./scales.js' без строки запроса), — значит проба видит ТЕ ЖЕ объекты ладов, что и
   приложение, а не вторую копию модуля.
   ⛳ ЗАЧЕМ (HANDOFF, «УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ», метод доказательства): каждый слайс модели, который НЕ ДОЛЖЕН менять звук,
   принимается ТОЛЬКО при НУЛЕ несовпадений. Сравнение — строгим ===, без допусков: допуск спрятал бы ровно то, что проба ловит.
   T0: записи строёв и ладов — данные. Проверяется, что выборка каждого лада, ВЫВЕДЕННАЯ из его же чисел (scales.modeDerive),
   даёт КАЖДОЙ ступени (и верхней тонике) те же центы, что сегодня, а у равных строёв — те же шаги и тот же показ центов.
   T2: ВИД (строй, лад, якорь) — тождество видов (один объект на лад и якорь) и та же высота через вид, что через сам лад (у Пифагора —
   через прежний вариант {...лад, tunedFrom}), === по тому же пространству, что T1.
   T1: ЧАСТОТЫ. Новая функция высоты (scales.pitchHz под leadFreq/bassFreq/chordNotes/tonicFreq/centsOf) против ПРЕЖНИХ тел
   (scales.legacy*) — по всем ладам (у Пифагора — каждый «строй от»), ролям (соло, бас, аккорды всех типов, дрон), ступеням, регистрам,
   всем 12 тоникам и нескольким эталонам A4, плюс показ центов. Сравнение === (у аккордов — каждая нота: частота И интервал).
   ⛔ Ничего не сохраняет и не играет. ⚠️ T1 на время прогона ПЕРЕСТАВЛЯЕТ живые тонику и эталон A4 (через их сеттеры — иначе их не
   перебрать) и ВОЗВРАЩАЕТ их в finally; прогон синхронный, поэтому ни кадр, ни планировщик между ними не вклиниваются. Звучащие
   голоса частоту сами не перечитывают — их не задевает. */
import { SCALES, TUNINGS, scaleView, chordFams, chordUnit, droneDegree, tuningIndexOf, leadFreqTi, bassFreqTi, chordNotesAt, REG_N, modeSlotOfTi, viewIdOf,
         leadFreq, bassFreq, chordNotes, tonicFreq, centsOf,
         legacyLeadFreq, legacyBassFreq, legacyChordNotes, legacyTonicFreq, legacyCentsOf } from './scales.js';
import { tonic, aRef, setTonic, setARef } from './state.js';
import { rollRowsProbe as RP } from './draw.js';   // T4b3: пути рядов редактора — по индексу и прежний по ступени (legacy), без открытого редактора
import { events, eventTuningIndex, songSegs, legacySongSegs, chaseFor, chaseNote, legacyChaseNote, hlOf, legacyHlOf, laneRoleOf, laneTimbreOf } from './recorder.js';   // T4b4: место подсветки — из индекса и прежнее по ступени   // T4b2: сегменты и догонялка — новые против прежних (legacy*)   // T4a: сверка индекса в строе у событий ТЕКУЩЕЙ песни (тот же экземпляр модуля, что у приложения)

/* ⛳ ВСЁ: данные (T0), частоты и центы (T1), вид (T2). → { data, pitch, view } — у каждого поле mismatches. */
export function check(){ const data=checkData(), pitch=checkPitch(), view=checkView(); return { data, pitch, view }; }

/* T0: строи, лады и выведенные выборки. → { tunings, modes, checks, mismatches:[строки] } и печать сводки. */
export function checkData(){
  const bad=[]; let checks=0;
  const ok=(cond,msg)=>{ checks++; if(!cond) bad.push(msg); return cond; };
  // ---- строи ----
  const tids=Object.keys(TUNINGS);
  for(const id of tids){
    const T=TUNINGS[id];
    ok(T.id===id, `tuning ${id}: record id is "${T.id}"`);
    ok(T.period>1, `tuning ${id}: period ${T.period} is not > 1`);
    if(T.equal!=null){
      ok(Number.isInteger(T.equal)&&T.equal>0, `tuning ${id}: equal count ${T.equal} is not a positive integer`);
      ok(T.cents==null, `tuning ${id}: has both an equal count and a cents table`);
    }else{
      const C=T.cents;
      if(ok(Array.isArray(C)&&C.length>0, `tuning ${id}: neither an equal count nor a cents table`)){
        ok(C[0]===0, `tuning ${id}: first pitch is ${C[0]}, not 0`);
        for(let i=1;i<C.length;i++) ok(C[i]>C[i-1], `tuning ${id}: pitch ${i} (${C[i]}) is not above pitch ${i-1} (${C[i-1]})`);
        ok(C[C.length-1]<1200*Math.log2(T.period), `tuning ${id}: last pitch ${C[C.length-1]} is not inside the period`);
      }
    }
  }
  // ---- лады ----
  const seen=new Map(), parented=[];
  SCALES.forEach((s,idx)=>{
    const tag=`mode #${idx} ${s.id}`;
    if(ok(typeof s.id==='string'&&s.id.length>0, `mode #${idx}: no id`)){
      ok(!seen.has(s.id), `${tag}: id also used by mode #${seen.get(s.id)}`); seen.set(s.id,idx);
    }
    const T=TUNINGS[s.tuning];
    if(!ok(!!T, `${tag}: tuning "${s.tuning}" does not exist`)) return;
    if(!ok(Array.isArray(s.sel)&&Number.isInteger(s.root), `${tag}: selection was not derived (the scale's numbers are not found in tuning ${s.tuning})`)) return;
    const n=s.iv.length;
    ok(s.sel.length===n, `${tag}: selection has ${s.sel.length} pitches, the mode has ${n} degrees`);
    if(T.equal!=null){
      /* РАВНЫЙ строй: ступени лада уже записаны в шагах строя — выборка обязана совпасть со ступенями побитно; показ центов — тем же
         выражением, что centsOf, но из ЗАПИСИ строя (число шагов и период), а не из полей лада. */
      const E=T.equal, pc=1200*Math.log2(T.period);
      ok(E===s.edo, `${tag}: tuning has ${E} steps, the mode says edo ${s.edo}`);
      ok(T.period===(s.period||2), `${tag}: tuning period ${T.period}, the mode's period ${s.period||2}`);
      ok(s.root===0, `${tag}: root ${s.root} on an equal tuning (expected 0)`);
      for(let i=0;i<=n;i++){
        const k = i<n ? s.sel[i] : s.root+E;                      // i = n — верхняя тоника (дубль), как в IVX
        const want = i<n ? s.iv[i] : s.edo;
        ok(k===want, `${tag}: degree ${i} → tuning step ${k}, today step ${want}`);
        const cts=Math.round(k*pc/E)%pc;
        ok(cts===legacyCentsOf(i,s), `${tag}: degree ${i} cents readout ${cts} from the tuning, ${legacyCentsOf(i,s)} today`);   // «сегодня» — прежнее тело (с T1 centsOf уже новая)
      }
    }else{
      /* ТАБЛИЦА: центы ступени из строя = T[k mod N] + период·⌊k/N⌋ − T[root] — обязаны быть ТЕМ ЖЕ числом, что центы ступени лада
         сегодня (с дописанной верхушкой 1200, как в leadFreq/bassFreq). */
      const C=T.cents, N=C.length, cx=s.cents.concat([1200]);
      ok(T.period===2 && !s.period, `${tag}: a cents mode on a non-octave tuning`);
      for(let i=0;i<=n;i++){
        const k = i<n ? s.sel[i] : s.root+N;
        const got = C[k%N] + 1200*Math.floor(k/N) - C[s.root];
        ok(got===cx[i], `${tag}: degree ${i} → tuning pitch ${k} = ${got}¢, today ${cx[i]}¢`);
      }
      if(n<N || s.root!==0) parented.push({ mode:s.id, tuning:s.tuning, root:s.root, sel:s.sel.join(' '), cents:s.cents.join(' ') });
    }
  });
  // ---- сводка ----
  console.log(`[scaleprobe T0] tunings ${tids.length} · modes ${SCALES.length} · checks ${checks} · mismatches ${bad.length}`);
  if(bad.length) bad.forEach(m=>console.warn('[scaleprobe T0] '+m));
  else console.log('[scaleprobe T0] every degree of every mode reproduces today\'s cents exactly');
  if(parented.length){ console.log('[scaleprobe T0] modes that select from a larger tuning (or start off its index 0):'); console.table(parented); }
  return { tunings:tids.length, modes:SCALES.length, checks, mismatches:bad };
}

/* ═══ ОБЩИЙ ПРОГОН: две реализации цены по всему пространству ═══
   Пространство: каждый вид (у tunable — 13: 'T' и 0..11) × 12 тоник × A4_SET ×
     соло и бас: ступень 0..2n+1 (дубль и оборачивание в следующий период) × регистр 0..3;
     аккорды: ступень 0..n+1 × регистр 0..3 × тип: без типа (септаккорд выкл/вкл), единица корня (chordUnit), каждый тип набора лада
       (chordFams — у нетипизированного лада это запасной chrom12: так проверяются и однонотные/распавшиеся типы в шагах);
     дрон: tonicFreq; показ центов: ступень 0..n.
   A и B — две реализации { lead, bass, chord, tonic, cents }; pick(лад, якорь) → [объект для A, объект для B]. Каждое несовпадение —
   строка со всеми входами; печатаем первые PRINT_MAX, в ответе держим до KEEP_MAX.
   ⚠️ На время прогона ПЕРЕСТАВЛЯЕТ живые тонику и A4 (сеттерами) и ВОЗВРАЩАЕТ их в finally; прогон синхронный. */
const A4_SET=[415, 440, 466.16];   // барочный, стандарт и некруглый — прогон и так в десятки миллионов сравнений (несколько секунд)
const PRINT_MAX=200, KEEP_MAX=10000;
const NEW={ lead:leadFreq, bass:bassFreq, chord:chordNotes, tonic:tonicFreq, cents:centsOf };
/* ⛳ ПОКАЗ ЦЕНТОВ С СЛАЙСА «ДРОН И ЦЕНТЫ» — ОДНО ПРАВИЛО: ЦЕЛЫЕ ЦЕНТЫ, точное значение округляется ОДИН раз. Ожидание:
     равные строи и подвижные таблицы — Math.round(прежнего показа): прежний показ там и есть точное значение (у равных — уже целое;
       у неоктавных верхняя тоника давала 0.045 → 0);
     фиксированные строи — Math.round(ТОЧНОГО), а не прежних десятых: двойное округление (десятые, потом целые) в 17 из 936 случаев
       даёт на единицу больше (мезотон: 579.47 → 579.5 → 580 вместо 579). Точное значение считает здесь НЕЗАВИСИМЫЙ оракул по данным
       лада (прежняя формула fixedKey без умножения на 10): якорь из «строй от» вида, ключ = тоника − якорь.
   Частоты — по-прежнему строгим === с прежними телами. */
const fixedExact=(d,v)=>{ const A= v.tunedFrom==='T' ? tonic : (v.tunedFrom==null ? 0 : v.tunedFrom), key=tonic-A+(A>tonic?12:0);
  const C=v.cents, L=C.length, abs=key+d, slot=((abs%L)+L)%L, carry=Math.floor(abs/L);
  return C[slot]+1200*carry-C[key]; };
const OLD={ lead:legacyLeadFreq, bass:legacyBassFreq, chord:legacyChordNotes, tonic:legacyTonicFreq,
            cents:(d,v)=> v.fixedKey ? Math.round(fixedExact(d,v)) : Math.round(legacyCentsOf(d,v)) };
const allViews=()=>{ const out=[];
  for(const s of SCALES){ if(s.tunable){ out.push([s,'T']); for(let pc=0;pc<12;pc++) out.push([s,pc]); } else out.push([s,'T']); }
  return out; };
function sweep(stage, what, A, B, pick, opt={}){
  const melMax=opt.melMax||(n=>2*n+1), chMax=opt.chMax||(n=>n+1);   // T4b1: прогон по индексу в строе — ступени, которые путь записи может положить (0..n)
  const t0=performance.now(), keepT=tonic, keepA=aRef;
  const bad=[]; let cases=0, nBad=0;
  const miss=msg=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(msg); };
  try{
    for(const [s,tf] of allViews()){
      const [va,vb]=pick(s,tf), n=s.iv.length, id=s.id+(s.tunable?`[from ${tf}]`:'');
      const tys=[[null,false],[null,true],[chordUnit(s),false]];
      for(const f of chordFams(s)) for(const ty of f.types) tys.push([ty.iv,false]);
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const A4 of A4_SET){ setARef(A4);
          const at=`${id} tonic ${tn} A4 ${A4}`;
          cases++; { const a=A.tonic(va), b=B.tonic(vb); if(a!==b) miss(`${at} drone: ${what[0]} ${a} ${what[1]} ${b}`); }
          for(let d=0;d<=n;d++){ cases++; const a=A.cents(d,va), b=B.cents(d,vb); if(a!==b) miss(`${at} cents deg ${d}: ${what[0]} ${a} ${what[1]} ${b}`); }
          for(let o=0;o<4;o++){
            for(let d=0;d<=melMax(n);d++){
              cases++; { const a=A.lead(d,o,va), b=B.lead(d,o,vb); if(a!==b) miss(`${at} melody deg ${d} reg ${o}: ${what[0]} ${a} ${what[1]} ${b}`); }
              cases++; { const a=A.bass(d,o,va), b=B.bass(d,o,vb); if(a!==b) miss(`${at} bass deg ${d} reg ${o}: ${what[0]} ${a} ${what[1]} ${b}`); }
            }
            for(let d=0;d<=chMax(n);d++) for(const [ty,sev] of tys){
              const X=A.chord(d,o,va,sev,ty), Y=B.chord(d,o,vb,sev,ty);
              const tag=()=>`${at} chord deg ${d} reg ${o} type ${ty?'['+ty.join(',')+']':'none'}${sev?' 7th':''}`;
              if(X.length!==Y.length){ cases++; miss(`${tag()}: ${X.length} notes ${what[0]}, ${Y.length} ${what[1]}`); continue; }
              for(let i=0;i<X.length;i++){ cases++;
                if(X[i].f!==Y[i].f||X[i].iv!==Y[i].iv) miss(`${tag()} note ${i}: ${what[0]} ${X[i].f} (iv ${X[i].iv}) ${what[1]} ${Y[i].f} (iv ${Y[i].iv})`); }
            }
          }
        }
      }
    }
  } finally { setTonic(keepT); setARef(keepA); }
  const ms=Math.round(performance.now()-t0);
  console.log(`[scaleprobe ${stage}] cases ${cases} · mismatches ${nBad} · ${ms} ms (frequencies: melody, bass, every chord note, drone; cents readout)`);
  if(nBad){ bad.slice(0,PRINT_MAX).forEach(m=>console.warn(`[scaleprobe ${stage}] `+m)); if(nBad>PRINT_MAX) console.warn(`[scaleprobe ${stage}] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`); }
  return { cases, mismatches:bad, total:nBad, ms };
}
/* ═══ T1: НОВАЯ ФУНКЦИЯ ВЫСОТЫ ПРОТИВ ПРЕЖНИХ ТЕЛ (обе — на одном и том же виде); центы — против целого округления точного (см. OLD) ═══ */
export function checkPitch(){
  const r=sweep('T1',['new','old'],NEW,OLD,(s,tf)=>{ const v=scaleView(s,tf); return [v,v]; });
  if(!r.total) console.log('[scaleprobe T1] every frequency is bit-identical to the old functions, and every cents readout is the whole-cent rounding of the exact value');
  return r;
}
/* ═══ T2: ВИД (строй, лад, якорь) ═══
   1) ТОЖДЕСТВО: один и тот же лад с тем же якорем — ОДИН объект (дважды, и вид от вида); у лада без выбора якоря — один вид на любой
      «строй от»; у вида — mode (сам лад), tuningRec (его строй), anchor { policy, from }; у tunable — tunedFrom, у прочих его нет;
      поля лада (iv, edo, cents, sel, root …) — те же ссылки, что у лада.
   2) ЦЕНА: через вид — ровно то же, что через сам лад (у tunable — через прежний вариант P3 {...лад, tunedFrom}), новой функцией,
      === по пространству T1. */
export function checkView(){
  const bad=[]; let checks=0;
  const ok=(c,m)=>{ checks++; if(!c) bad.push(m); };
  for(const [s,tf] of allViews()){
    const id=s.id+(s.tunable?`[from ${tf}]`:''), v=scaleView(s,tf);
    ok(scaleView(s,tf)===v, `${id}: a second call gives a different view object`);
    ok(scaleView(v,tf)===v, `${id}: a view of the view is a different object`);
    ok(v!==s, `${id}: the view is the bare scale object`);
    ok(v.mode===s, `${id}: view.mode is not the scale itself`);
    ok(v.tuningRec===TUNINGS[s.tuning], `${id}: view.tuningRec is not the scale's tuning record`);
    const pol= s.tunable ? 'choice' : s.fixedKey ? 'C' : 'tonic';
    ok(!!v.anchor&&v.anchor.policy===pol, `${id}: anchor policy ${v.anchor&&v.anchor.policy}, expected ${pol}`);
    ok(!!v.anchor&&v.anchor.from===(pol==='choice'?tf:pol==='C'?0:'T'), `${id}: anchor from ${v.anchor&&v.anchor.from}`);
    if(s.tunable) ok(v.tunedFrom===tf, `${id}: tunedFrom ${v.tunedFrom}, expected ${tf}`);
    else{ ok(!('tunedFrom' in v), `${id}: a non-tunable view carries tunedFrom`);
          ok(scaleView(s,5)===v && scaleView(s,'T')===v, `${id}: a non-tunable scale has more than one view`); }
    for(const k of ['iv','edo','cents','period','fixedKey','gridChords','typedChords','noChords','sel','root','tuning','id'])
      ok(v[k]===s[k], `${id}: field ${k} differs between the view and the scale`);
  }
  console.log(`[scaleprobe T2] identity checks ${checks} · mismatches ${bad.length}`);
  bad.forEach(m=>console.warn('[scaleprobe T2] '+m));
  const r=sweep('T2',['view','scale'],NEW,NEW,(s,tf)=>[scaleView(s,tf), s.tunable ? {...s, tunedFrom:tf} : s]);
  if(!bad.length && !r.total) console.log('[scaleprobe T2] views are stable and every pitch through a view is bit-identical to the scale itself');
  return { checks, identity:bad, cases:r.cases, ms:r.ms, total:bad.length+r.total, mismatches:bad.concat(r.mismatches) };
}

/* ═══ ДРОН (слайс «дрон и центы») — КАКУЮ СТУПЕНЬ берёт вторая струна у каждого лада (справка, не проверка) ═══
   Печатает таблицу: лад, ступень, почему (fifth / fourth / seventh / cons / period) и её точные центы над корнем — при ТЕКУЩЕЙ тонике
   (у фиксированных строёв от неё зависит ключ: Пифагор от C в ключе F# берёт кварту — его квинта там волк). Звук не трогает. */
export function drone(){
  const rows=[];
  for(const [s,tf] of allViews()){ const v=scaleView(s,tf), d=droneDegree(v);
    rows.push({ mode:s.id+(s.tunable?`[from ${tf}]`:''), degree:d.deg, why:d.why, cents:Math.round(d.cents*100)/100 }); }
  console.table(rows); return rows;
}

/* ═══ T4a: ИНДЕКС В СТРОЕ У СОБЫТИЙ ТЕКУЩЕЙ ПЕСНИ ═══
   Обходит ВСЕ события песни (записанные, подложки, правленые) и сверяет a.ti с переводом ступени (recorder.eventTuningIndex → scales.
   tuningIndexOf, закон своей роли). Печатает КАЖДОЕ расхождение со входами (дорожка, доля, вид, ступень, регистр, хранимое и ожидаемое) и
   сводку по ролям. Ничего не меняет. Ноль — когда каждый путь записи прошёл через воронку (push, loadArrangement, editCommit). */
export function checkTi(){
  const bad=[], byRole={ld:0,bs:0,ch:0}; let n=0;
  for(const e of events){
    const want=eventTuningIndex(e); if(want===undefined) continue;
    n++; const r=e.fn[0]==='l'?'ld':e.fn[0]==='b'?'bs':'ch'; byRole[r]++;
    if(e.a.ti!==want) bad.push(`L${e.layer+1} beat ${Math.round(e.t*1000)/1000} ${e.fn} in ${e.sc&&e.sc.id}: degree ${e.a.deg} reg ${e.a.oct} — stored ti ${e.a.ti}, expected ${want}`);
  }
  console.log(`[scaleprobe T4a] pitched events ${n} (solo ${byRole.ld}, bass ${byRole.bs}, chords ${byRole.ch}) · mismatches ${bad.length}`);
  if(bad.length) bad.forEach(m=>console.warn('[scaleprobe T4a] '+m));
  else if(n) console.log('[scaleprobe T4a] every pitched event carries the tuning index of its degree');
  else console.log('[scaleprobe T4a] the song has no pitched events yet — record, load a backing or edit, then run again');
  return { events:n, byRole, mismatches:bad };
}

/* ═══ T4b1: ЗВУК ЧИТАЕТ ИНДЕКС В СТРОЕ ═══
   1) КАЖДОЕ СОБЫТИЕ ТЕКУЩЕЙ ПЕСНИ: цена из a.ti (leadFreqTi/bassFreqTi/chordNotesAt — то, чем играет таблица ENG) против цены по ступени
      (leadFreq/bassFreq/chordNotes) — ===; у аккорда каждая нота (частота и интервал). Событие без a.ti — расхождение.
   2) ПРОГОН: каждый вид × тоники × A4 × регистры × ступени 0..n (столько и пишут пути записи) × все типы — ступень → индекс функцией T4a
      (tuningIndexOf), цена из индекса против ПРЕЖНЕЙ цены (legacy*) — ===. Тоника и показ центов — как в T1.
   Принимается ТОЛЬКО при нуле в обеих частях. */
export function checkSound(){
  const bad=[]; let n=0;
  for(const e of events){
    const a=e.a; if(!a || typeof a.deg!=='number' || !e.sc) continue;
    const r=e.fn[0]==='l'?'ld':e.fn[0]==='b'?'bs':e.fn[0]==='c'?'ch':null; if(!r || !/On$|Set$/.test(e.fn)) continue;
    n++; const at=`L${e.layer+1} beat ${Math.round(e.t*1000)/1000} ${e.fn} in ${e.sc.id}, degree ${a.deg} reg ${a.oct}`;
    if(typeof a.ti!=='number'){ bad.push(`${at}: no a.ti`); continue; }
    if(r==='ld'){ const x=leadFreqTi(a.ti,a.oct,e.sc), y=leadFreq(a.deg,a.oct,e.sc); if(x!==y) bad.push(`${at}: from ti ${x}, from degree ${y}`); }
    else if(r==='bs'){ const x=bassFreqTi(a.ti,a.oct,e.sc), y=bassFreq(a.deg,a.oct,e.sc); if(x!==y) bad.push(`${at}: from ti ${x}, from degree ${y}`); }
    else{ const X=chordNotesAt(a.deg,a.ti,a.oct,e.sc,e.sev,a.ty), Y=chordNotes(a.deg,a.oct,e.sc,e.sev,a.ty);
      if(X.length!==Y.length) bad.push(`${at}: ${X.length} notes from ti, ${Y.length} from degree`);
      else for(let i=0;i<X.length;i++) if(X[i].f!==Y[i].f||X[i].iv!==Y[i].iv) bad.push(`${at} note ${i}: from ti ${X[i].f} (iv ${X[i].iv}), from degree ${Y[i].f} (iv ${Y[i].iv})`); }
  }
  console.log(`[scaleprobe T4b1] song events ${n} · mismatches ${bad.length} (price from a.ti vs price from the degree)`);
  bad.forEach(m=>console.warn('[scaleprobe T4b1] '+m));
  const TI={ lead:(d,o,v)=>leadFreqTi(tuningIndexOf(d,v,false),o,v), bass:(d,o,v)=>bassFreqTi(tuningIndexOf(d,v,false),o,v),
             chord:(d,o,v,sev,ty)=>chordNotesAt(d,tuningIndexOf(d,v,true),o,v,sev,ty), tonic:tonicFreq, cents:centsOf };
  const r=sweep('T4b1',['from ti','old'],TI,OLD,(s,tf)=>{ const v=scaleView(s,tf); return [v,v]; }, { melMax:n=>n, chMax:n=>n });
  if(!bad.length && !r.total) console.log('[scaleprobe T4b1] every song event and every sweep case prices identically from the tuning index');
  return { events:n, eventMismatches:bad, sweep:r };
}

/* ═══ T4b2: ЛОГИКА РЕКОРДЕРА ЧИТАЕТ ИНДЕКС В СТРОЕ ═══
   1) СЕГМЕНТЫ ВСЕЙ ПЕСНИ: songSegs (смена высоты — по паре индекс×регистр) против legacySongSegs (по ступени) — границы, события начала и
      конца, ключи, ступени, регистры, типы (по значению), лады, тембры, громкости и обратный указатель «событие → сегмент».
   2) ДОГОНЯЛКА на КАЖДОЙ границе событий песни: для каждого владельца, открытого к доле x, нагрузка chaseNote против legacyChaseNote —
      ступень, регистр, тип, бенд, громкость, тембр, контекст — и ЦЕНА, которой её сыграет ENG: из индекса (новая) против цены по ступени
      (прежняя). Ловит, в частности, дефект T4b1 у удержанной ноты терменвокса.
   Печатает каждое расхождение. Принимается ТОЛЬКО при нуле. Ничего не меняет (кэш догонялки по доле переписывается — это только кэш). */
const tyEqP=(a,b)=> a===b || (!!a && !!b && a.length===b.length && a.every((x,i)=>x===b[i]));
const bendEq=(a,b)=> a===b || (!!a && !!b && a.length===b.length && a.every((p,i)=>p.dt===b[i].dt && p.c===b[i].c));
export function checkLogic(){
  const bad=[];
  // ---- 1) сегменты ----
  const S=songSegs(), L=legacySongSegs(), F=['role','layer','key','tk','note','ev','endEv','first','start','end','endBy','deg','oct','sc','sev','inst','vol'];
  if(S.segs.length!==L.segs.length) bad.push(`segments: ${S.segs.length} new, ${L.segs.length} legacy`);
  const nSeg=Math.min(S.segs.length,L.segs.length);
  for(let i=0;i<nSeg;i++){ const a=S.segs[i], b=L.segs[i], at=`segment ${i} (L${a.layer+1} ${a.role} beat ${Math.round(a.start*1000)/1000})`;
    for(const f of F) if(a[f]!==b[f]) bad.push(`${at}: ${f} new ${a[f]} legacy ${b[f]}`);
    if(!tyEqP(a.ty,b.ty)) bad.push(`${at}: chord type differs`); }
  const idxS=new Map(S.segs.map((g,i)=>[g,i])), idxL=new Map(L.segs.map((g,i)=>[g,i]));
  if(S.byEv.size!==L.byEv.size) bad.push(`event→segment map: ${S.byEv.size} new, ${L.byEv.size} legacy`);
  for(const [ev,g] of S.byEv){ const h=L.byEv.get(ev); if(idxS.get(g)!==idxL.get(h)) bad.push(`event ${ev.fn} at beat ${ev.t} maps to segment ${idxS.get(g)} new, ${idxL.get(h)} legacy`); }
  // ---- 2) догонялка ----
  const X=[...new Set(events.map(e=>e.t))].sort((p,q)=>p-q); let nChase=0;
  for(const x of X){
    for(const s of chaseFor(x)){
      nChase++; const N=chaseNote(s,x), O=legacyChaseNote(s,x), at=`chase at beat ${Math.round(x*1000)/1000}: L${s.on.layer+1} ${s.role} (${s.on.fn} at ${s.on.t})`;
      if(N.ctx!==O.ctx) bad.push(`${at}: context differs`);
      for(const f of ['deg','oct','vol','inst','hold']) if(N.a[f]!==O.a[f]) bad.push(`${at}: ${f} new ${N.a[f]} legacy ${O.a[f]}`);
      if(!tyEqP(N.a.ty,O.a.ty)) bad.push(`${at}: chord type differs`);
      if(!bendEq(N.a.bend,O.a.bend)) bad.push(`${at}: bend curve differs`);
      const sc=N.ctx.sc, tiN= typeof N.a.ti==='number' ? N.a.ti : tuningIndexOf(N.a.deg,sc,s.role==='ch');
      if(s.role==='ld'){ const x1=leadFreqTi(tiN,N.a.oct,sc), y1=leadFreq(O.a.deg,O.a.oct,O.ctx.sc); if(x1!==y1) bad.push(`${at}: price from ti ${x1}, legacy from degree ${y1}`); }
      else if(s.role==='bs'){ const x1=bassFreqTi(tiN,N.a.oct,sc), y1=bassFreq(O.a.deg,O.a.oct,O.ctx.sc); if(x1!==y1) bad.push(`${at}: price from ti ${x1}, legacy from degree ${y1}`); }
      else{ const A=chordNotesAt(N.a.deg,N.a.ty?tiN:undefined,N.a.oct,sc,N.ctx.sev,N.a.ty), B=chordNotes(O.a.deg,O.a.oct,O.ctx.sc,O.ctx.sev,O.a.ty);
        if(A.length!==B.length) bad.push(`${at}: ${A.length} chord notes new, ${B.length} legacy`);
        else for(let i=0;i<A.length;i++) if(A[i].f!==B[i].f) bad.push(`${at} note ${i}: price from ti ${A[i].f}, legacy from degree ${B[i].f}`); }
    }
  }
  console.log(`[scaleprobe T4b2] song events ${events.length} · segments ${S.segs.length} · chase checks ${nChase} at ${X.length} beats · differences ${bad.length}`);
  bad.forEach(m=>console.warn('[scaleprobe T4b2] '+m));
  if(!bad.length && events.length) console.log('[scaleprobe T4b2] segments and chased notes are identical when read from the tuning index');
  else if(!events.length) console.log('[scaleprobe T4b2] the song is empty — record, load a backing or edit, then run again');
  return { events:events.length, segments:S.segs.length, chase:nChase, differences:bad };
}

/* ═══ T4b3: РЯДЫ И РИСОВАНИЕ РЕДАКТОРА ЧИТАЮТ ИНДЕКС В СТРОЕ ═══
   Работает БЕЗ открытого редактора: ось строится для каждого вида (draw.rollRowsProbe.axis), обе оси — «Все» и «Лад».
   1) ПЕСНЯ: каждый сегмент каждой дорожки (соло, бас, аккорды), сгруппированный, как группирует редактор (дорожка, роль, ССЫЛКА на вид):
      • высота оси аккордов (rollChordTotal — сколько рядов) — путь индекса против прежнего;
      • РЯД КОРНЯ (он же ряд блока баса/соло и rootRow попадания) и КАЖДАЯ нота блока — ряд и отступление в центах (по нему блок
        рисуется «вне ряда», им же решается выделение-контур) — путь индекса против прежнего;
      • ПОПАДАНИЕ: палец на ряду каждой ноты, на ряду корня и в ±0.3/±0.49 ряда от них — какую ноту берёт (номер) и на каком расстоянии;
      • ПРИЗРАК переноса целого аккорда: для КАЖДОГО яркого ряда оси — ноты сегмента, поставленного туда (путь индекса: с индексом, который
        поставит правка; прежний: только ступень и регистр);
      • выделение одной ноты и её призрак берут ряды из того же списка нот — сверены выше.
      Полоса «в ноте» (громкость, яркость …) строится из величин и времени нот — ни ступени, ни ряда не читает; сверять там нечего.
   2) ПРОГОН: каждый вид × обе оси × регистры 0..3 × ступени 0..n — ряд из ступени (rowOf) против ряда из индекса (rowOfTi от tuningIndexOf
      по закону мелодии/баса и по закону аккорда); и ряды нот аккорда (корень и каждая нота) для каждого типа лада, без типа (септаккорд
      выкл/вкл) и единицы корня — путь индекса против прежнего.
   Кэш частот рядов аккордов сбрасывается перед каждым расчётом, который его заполняет (RP.reset), — оба пути считаются при одном его
   состоянии. Сравнение ===. Принимается ТОЛЬКО при нуле. Ничего не меняет. */
export function checkRows(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const cmpNotes=(at,N,O)=>{
    if(N.length!==O.length){ miss(`${at}: ${N.length} blocks new, ${O.length} legacy`); return; }
    for(let i=0;i<N.length;i++) if(N[i].r!==O[i].r||N[i].dev!==O[i].dev) miss(`${at} note ${i}: row ${N[i].r} dev ${N[i].dev} new, row ${O[i].r} dev ${O[i].dev} legacy`);
  };
  const VIEWS=[['all',true],['mode',false]];
  // ---- 1) песня ----
  const S=songSegs(), groups=[];
  for(const g of S.segs){
    if(g.role!=='ld'&&g.role!=='bs'&&g.role!=='ch') continue;
    let G=groups.find(q=>q.layer===g.layer&&q.role===g.role&&q.sc===g.sc);   // ССЫЛКА на вид, не имя — как rollGroups
    if(!G){ G={ layer:g.layer, role:g.role, sc:g.sc, segs:[] }; groups.push(G); }
    G.segs.push(g);
  }
  let nSeg=0, nBlk=0, nHit=0, nGhost=0;
  for(const G of groups) for(const [vn,all] of VIEWS){
    const ax=RP.axis(G.sc,all), tag=`L${G.layer+1} ${G.role} in ${G.sc&&G.sc.id} [${vn}]`;
    let total=REG_N*ax.rpp;
    if(G.role==='ch'){
      RP.reset(); const tN=RP.total(G,ax,RP.notes,RP.root);
      RP.reset(); const tL=RP.total(G,ax,RP.legacyNotes,RP.legacyRoot);
      if(tN!==tL) miss(`${tag}: chord axis has ${tN} rows new, ${tL} legacy`);
      total=tL;
    }
    RP.reset();
    for(const g of G.segs){
      nSeg++; const at=`${tag} segment at beat ${Math.round(g.start*1000)/1000} (degree ${g.deg} ti ${g.ti} reg ${g.oct})`;
      const rN=RP.root(g,ax), rL=RP.legacyRoot(g,ax);
      if(rN!==rL) miss(`${at}: root row ${rN} new, ${rL} legacy`);
      const N=RP.notes(g,ax,total), O=RP.legacyNotes(g,ax,total); nBlk+=O.length;
      cmpNotes(at,N,O);
      if(N.length===O.length){
        const probes=[rL]; for(const x of O) probes.push(x.r);
        for(const r0 of probes) for(const d of [0,-0.3,0.3,-0.49,0.49]){
          nHit++; const pN=RP.pick(N,r0+d), pL=RP.pick(O,r0+d);
          if(pN.ni!==pL.ni||pN.dr!==pL.dr) miss(`${at}: finger at row ${r0+d} takes note ${pN.ni} (distance ${pN.dr}) new, note ${pL.ni} (${pL.dr}) legacy`);
        }
      }
      if(g.role==='ch') for(let r=0;r<total;r++){
        const pit=ax.pitchOf(r); if(!pit) continue;
        nGhost++; cmpNotes(`${at} ghost on row ${r}`, RP.notes(RP.ghost(g,pit),ax,total), RP.legacyNotes(RP.legacyGhost(g,pit),ax,total));
      }
    }
  }
  console.log(`[scaleprobe T4b3] song: segments ${nSeg} × 2 views · blocks ${nBlk} · hit-tests ${nHit} · ghost placements ${nGhost} · differences ${nBad}`);
  const songBad=nBad;
  // ---- 2) прогон по видам ----
  let nRow=0, nTone=0;
  for(const [sc0,tf] of allViews()){
    const v=scaleView(sc0,tf), n=v.iv.length, id=v.id+(v.tunable?`[from ${tf}]`:'');
    const tys=[[null,false],[null,true],[chordUnit(v),false]];
    for(const f of chordFams(v)) for(const ty of f.types) tys.push([ty.iv,false]);
    for(const [vn,all] of VIEWS){
      const ax=RP.axis(v,all), total=2*REG_N*ax.rpp;
      RP.reset();
      for(let o=0;o<4;o++) for(let d=0;d<=n;d++){
        const want=ax.rowOf(d,o), at=`${id} [${vn}] degree ${d} reg ${o}`;
        nRow++; { const got=ax.rowOfTi(tuningIndexOf(d,v,false),o); if(got!==want) miss(`${at}: melody/bass row from ti ${got}, from degree ${want}`); }
        nRow++; { const got=ax.rowOfTi(tuningIndexOf(d,v,true),o); if(got!==want) miss(`${at}: chord-root row from ti ${got}, from degree ${want}`); }
        for(const [ty,sev] of tys){
          const g={ role:'ch', deg:d, oct:o, ti:tuningIndexOf(d,v,true), sc:v, sev, ty };
          nTone++; const rN=RP.root(g,ax), rL=RP.legacyRoot(g,ax);
          const tt=`${at} chord ${ty?'['+ty.join(',')+']':'none'}${sev?' 7th':''}`;
          if(rN!==rL) miss(`${tt}: root row ${rN} new, ${rL} legacy`);
          cmpNotes(tt, RP.notes(g,ax,total), RP.legacyNotes(g,ax,total));
        }
      }
    }
  }
  console.log(`[scaleprobe T4b3] sweep: rows ${nRow} · chord placements ${nTone} (every view, both views of the axis, registers 0..3, degrees 0..n) · differences ${nBad-songBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T4b3] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T4b3] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`);
  if(!nBad && nSeg) console.log('[scaleprobe T4b3] every row, block, hit-test and ghost is identical when read from the tuning index');
  else if(!nSeg) console.log('[scaleprobe T4b3] the song has no pitched segments — record, load a backing or edit, then run again (the sweep above still ran)');
  RP.reset();
  return { segments:nSeg, blocks:nBlk, hits:nHit, ghosts:nGhost, rows:nRow, chords:nTone, total:nBad, differences:bad };
}

/* ═══ T4b4-1: ДВЕ ПРАВКИ РЯДОВ РЕДАКТОРА (ВИДИМЫЕ) ═══
   1) НИЖНИЙ РЯД ПО УМОЛЧАНИЮ (draw.rollDefaultRow0For): каждый вид × обе оси × регистр 0..3 × несколько высот окна — ряд корня регистра
      reg·rpp ВИДЕН в окне [row0, row0+rows); у оси «Лад» row0 равен прежней формуле (iv.length+1 рядов на регистр); у оси «Все» печатается,
      во скольких случаях прежняя формула открыла бы не тот регистр (это и есть правка).
   2) РЯДЫ НОТ АККОРДА НЕ ЗАВИСЯТ ОТ ИСТОРИИ КЭША: каждый вид × обе оси × ступень 0..n × регистр 0..3 × каждый тип лада, без типа и
      единица корня — ряды и отступления нот при ХОЛОДНОМ кэше против прогретого ДРУГИМ вызывающим (ось втрое длиннее), ===. */
export function checkRowFix(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const VIEWS=[['all',true],['mode',false]];
  let nDef=0, nOld=0, nCache=0;
  for(const [sc0,tf] of allViews()){
    const v=scaleView(sc0,tf), n=v.iv.length, id=v.id+(v.tunable?`[from ${tf}]`:'');
    const tys=[[null,false],[null,true],[chordUnit(v),false]];
    for(const f of chordFams(v)) for(const ty of f.types) tys.push([ty.iv,false]);
    for(const [vn,all] of VIEWS){
      const ax=RP.axis(v,all), rpp=ax.rpp, T=REG_N*rpp;
      // ---- 1) нижний ряд по умолчанию ----
      for(let reg=0; reg<REG_N; reg++) for(const rows of [1,5,8,rpp,2*rpp,T,T+3]){
        nDef++; const r0=RP.defRow0(v,reg,rows,ax), at=`${id} [${vn}] register ${reg} window ${rows} rows`;
        if(!(r0>=0 && reg*rpp>=r0 && reg*rpp<r0+rows)) miss(`${at}: bottom row ${r0} does not show register ${reg} (its root row ${reg*rpp})`);
        const old=Math.max(0, Math.min(reg*(n+1), 4*(n+1)-rows));
        if(!all||rpp===n+1){ if(r0!==old) miss(`${at}: bottom row ${r0}, the old formula gives ${old} (they must agree where rows per register = degrees + 1)`); }
        else if(!(old>=0 && reg*rpp>=old && reg*rpp<old+rows)) nOld++;
      }
      // ---- 2) кэш частот рядов ----
      const segs=[];
      for(let o=0;o<REG_N;o++) for(let d=0;d<=n;d++) for(const [ty,sev] of tys) segs.push({ role:'ch', deg:d, oct:o, ti:tuningIndexOf(d,v,true), sc:v, sev, ty });
      RP.reset(); const cold=segs.map(g=>RP.notes(g,ax,T));
      RP.reset(); RP.notes(segs[0],ax,3*T);                    // прогрев ДРУГИМ вызывающим: таблица втрое длиннее оси
      for(let i=0;i<segs.length;i++){ nCache++; const g=segs[i], W=RP.notes(g,ax,T), C=cold[i];
        const at=`${id} [${vn}] chord degree ${g.deg} reg ${g.oct} ${g.ty?'['+g.ty.join(',')+']':'none'}${g.sev?' 7th':''}`;
        if(W.length!==C.length){ miss(`${at}: ${W.length} notes warm, ${C.length} cold`); continue; }
        for(let k=0;k<W.length;k++) if(W[k].r!==C[k].r||W[k].dev!==C[k].dev) miss(`${at} note ${k}: row ${W[k].r} dev ${W[k].dev} with a warm cache, row ${C[k].r} dev ${C[k].dev} cold`); }
    }
  }
  RP.reset();
  console.log(`[scaleprobe T4b4-1] default bottom row: ${nDef} cases (in "All", the old formula would have opened the wrong register in ${nOld}) · chord rows cold vs warm cache: ${nCache} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T4b4-1] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T4b4-1] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`);
  if(!nBad) console.log('[scaleprobe T4b4-1] the roll opens on the live register in both views, and chord rows no longer depend on cache history');
  return { defaults:nDef, oldWrong:nOld, cache:nCache, total:nBad, differences:bad };
}

/* ═══ T4b4: ПОДСВЕТКА ЧИТАЕТ ИНДЕКС В СТРОЕ ═══
   Без рук и без редактора. Место подсветки переигранной/догнанной ноты — recorder.hlOf (индекс → обратная выборка лада) против прежнего
   legacyHlOf (ступень и регистр события), сравнение ===:
   1) ПРОГОН: каждый вид × закон аккорда и закон мелодии/баса × ступень 0..n × регистр 0..3;
   2) ВЫСОТЫ ВНЕ ЛАДА: у видов, чей лад меньше строя, — каждая высота строя без ступени лада, в регистрах 0..3 и через перенос периода —
      обязана дать «нет места» (null), не бросив;
   3) КАЖДОЕ событие песни (соло, бас, аккорды — «вкл» и «ведение»);
   4) ДОГОНЯЛКА на каждой границе событий: нагрузка chaseNote против legacyChaseNote.
   Живые подсветки (ступень жеста в реестрах leadHold/bassHold, защёлка latchDeg, ярлыки рук) не менялись — сравнивать там нечего. */
export function checkHl(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const same=(N,O)=> !!N && !!O && N.deg===O.deg && N.oct===O.oct;
  const show=p=> p ? `${p.deg}/${p.oct}` : 'none';
  let nSweep=0, nOut=0;
  for(const [sc0,tf] of allViews()){
    const v=scaleView(sc0,tf), n=v.iv.length, id=v.id+(v.tunable?`[from ${tf}]`:'');
    for(const chord of [true,false]) for(let o=0;o<REG_N;o++) for(let d=0;d<=n;d++){
      nSweep++; const a={ deg:d, oct:o, ti:tuningIndexOf(d,v,chord) }, N=hlOf(a,v), O=legacyHlOf(a);
      if(!same(N,O)) miss(`${id} ${chord?'chord':'melody'} degree ${d} reg ${o}: from ti ${show(N)}, legacy ${show(O)}`);
    }
    const T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length, inMode=new Set(v.sel.map(k=>k-v.root));
    if(v.sel.length<E) for(let j=0;j<E;j++){ if(inMode.has(j)) continue;
      for(let o=0;o<REG_N;o++) for(const c of [0,1,-1]){ nOut++;
        let p; try{ p=modeSlotOfTi(v.root+j+E*c,o,v); }catch(e){ miss(`${id} pitch ${j} reg ${o}: threw ${e&&e.message}`); continue; }
        if(p!==null) miss(`${id} out-of-mode pitch ${j} (+${c} period) reg ${o}: gave a slot ${show(p)}`); } }
  }
  let nEv=0;
  for(const e of events){
    const a=e.a; if(!a || typeof a.deg!=='number' || !e.sc || !/^(lead|bass|ch)(On|Set)$/.test(e.fn)) continue;
    nEv++; const N=hlOf(a,e.sc), O=legacyHlOf(a);
    if(!same(N,O)) miss(`L${e.layer+1} beat ${Math.round(e.t*1000)/1000} ${e.fn} in ${e.sc.id}: from ti ${show(N)}, legacy ${show(O)} (ti ${a.ti})`);
  }
  const X=[...new Set(events.map(e=>e.t))].sort((p,q)=>p-q); let nChase=0;
  for(const x of X) for(const sct of chaseFor(x)){
    nChase++; const Nn=chaseNote(sct,x), Oo=legacyChaseNote(sct,x), N=hlOf(Nn.a,Nn.ctx.sc), O=legacyHlOf(Oo.a);
    if(!same(N,O)) miss(`chase at beat ${Math.round(x*1000)/1000}: L${sct.on.layer+1} ${sct.role}: from ti ${show(N)}, legacy ${show(O)}`);
  }
  console.log(`[scaleprobe T4b4] sweep ${nSweep} · out-of-mode pitches ${nOut} (no slot, none threw) · song events ${nEv} · chase checks ${nChase} at ${X.length} beats · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T4b4] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T4b4] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`);
  if(!nBad && nEv) console.log('[scaleprobe T4b4] every replayed and chased highlight is identical when read from the tuning index');
  else if(!nEv) console.log('[scaleprobe T4b4] the song has no pitched events — record, load a backing or edit, then run again (the sweep above still ran)');
  return { sweep:nSweep, outOfMode:nOut, events:nEv, chase:nChase, total:nBad, differences:bad };
}

/* ═══ МАРШРУТ ПО СТРОЮ — ЧТО ЛЕЖИТ В КАЖДОЙ ДОРОЖКЕ (справка, не проверка; ничего не меняет) ═══
   Строка на дорожку: L-номер, роль (laneRoleOf), тембр (laneTimbreOf — индекс тембра роли / набора ударных), вид(ы) строя её высотных
   событий (scales.viewIdOf — тот же, что в ключе маршрута), число событий и подложка ли. Видов больше одного — предупреждение: так могла
   лечь только запись, сделанная ДО маршрута по строю (ничего не сохраняется — после перезагрузки таких нет). */
export function tracks(){
  const L=new Map();
  for(const e of events){
    let r=L.get(e.layer); if(!r){ r={ views:new Set(), n:0, jam:false }; L.set(e.layer,r); }
    r.n++; if(e.jam) r.jam=true;
    if(e.sc && e.fn!=='drum' && e.fn!=='drone') r.views.add(viewIdOf(e.sc));
  }
  const rows=[...L.keys()].sort((a,b)=>a-b).map(ly=>{ const r=L.get(ly);
    return { track:'L'+(ly+1), role:laneRoleOf(ly)||'-', timbre:laneTimbreOf(ly)??'-', view:[...r.views].join(' + ')||'-', events:r.n, backing:r.jam }; });
  console.table(rows);
  const mixed=rows.filter(x=>x.view.includes(' + '));
  if(mixed.length) mixed.forEach(x=>console.warn(`[scaleprobe tracks] ${x.track} holds ${x.view.split(' + ').length} tuning views: ${x.view} (recorded before routing by tuning)`));
  else console.log(`[scaleprobe tracks] ${rows.length} tracks, each with one tuning view at most`);
  return rows;
}
