/* ⛳ ПРОБА УНИВЕРСАЛЬНОЙ МОДЕЛИ СТРОЯ — консольный инструмент (как ухо-проба render.js: R.aud/R.live), НЕ часть приложения.
   Никто его не импортирует: модуль грузится только руками из консоли браузера, при открытом приложении:
     const P = await import(new URL('src/scaleprobe.js', location.href).href);
     P.check()          // T0 (данные) + T1 (частоты и центы) + T2 (вид) — сводка и каждое несовпадение
     (по отдельности: P.checkData(), P.checkPitch(), P.checkView(); справка о дроне — P.drone())
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
import { SCALES, TUNINGS, scaleView, chordFams, chordUnit, droneDegree,
         leadFreq, bassFreq, chordNotes, tonicFreq, centsOf,
         legacyLeadFreq, legacyBassFreq, legacyChordNotes, legacyTonicFreq, legacyCentsOf } from './scales.js';
import { tonic, aRef, setTonic, setARef } from './state.js';

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
function sweep(stage, what, A, B, pick){
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
            for(let d=0;d<=2*n+1;d++){
              cases++; { const a=A.lead(d,o,va), b=B.lead(d,o,vb); if(a!==b) miss(`${at} melody deg ${d} reg ${o}: ${what[0]} ${a} ${what[1]} ${b}`); }
              cases++; { const a=A.bass(d,o,va), b=B.bass(d,o,vb); if(a!==b) miss(`${at} bass deg ${d} reg ${o}: ${what[0]} ${a} ${what[1]} ${b}`); }
            }
            for(let d=0;d<=n+1;d++) for(const [ty,sev] of tys){
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
