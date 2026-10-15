/* PROBE1: Tunings-as-files probes: the F0 snapshot, naming, snapshot renewal, user files, Just intonation merge, bare modes, root alone. Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { rollRowsProbe as RP } from '../draw.js';
import { hooks } from '../hooks.js';
import { withLang, L, t } from '../i18n.js';
import { SCALES, canon, TUNINGS, CHORD_FAM_SETS, isUserId, snapViews, KEEP_MAX, userCount, PRINT_MAX, preF3RegWord, preF3RegWordFull, preF3NoteLbl, preF3RowLabel, preF3RootName, preF3ChordLabel, preF3ChordNotesStr, preF3StepName, preF3AxisLbl, keyless, preF4Status, allViews } from '../probedata.js';
import { evHz, probeTake, events } from '../recorder.js';
import { checkRecord } from '../scaleload.js';
import { TRADITIONS, GRP, droneNonOct, menuOf, chordModeName, chordModeHint, viewIdOf, droneDegree, range, centsOf, regWord, chordLabel, chordNotesStr, rootName, regWordFull, rowLabel, stepName, REG_N, scaleData, unregisterRecord, chordNotesAt, tuningOf, tuningStatus, registerRecord, CUR, scaleById, chordFams, TUNINGS as TUNINGS_ALL, SCALES as SCALES_ALL, scaleView, chordUnit, tonicFreq, leadFreq, bassFreq, leadFreqTi, bassFreqTi, chordNotes, resolveScaleId, viewOfId, applyScaleId, chordBuildOf, namingOf, chordTypeFits, chordAtRoot, chordPitchHz } from '../scales.js';
import { tonic, setTonic, scaleId, setScaleId, setChordMode, setChordModeSel, chordModeSel, aRef, tunedFrom, setARef, setTunedFrom } from '../state.js';
import { example as userExample, chordModesExample as userCmExample } from '../userfiles.js';
import { row } from './rows.js';

/* ═══ F0 «СТРОИ И ЛАДЫ ФАЙЛАМИ»: КАНОНИЧЕСКИЙ СНИМОК — ДОКАЗАТЕЛЬСТВО ПЕРЕЕЗДА ═══
   Переезд (F1–F5) обязан оставить каждый встроенный лад ПОБИТНО тем же — по звуку и по показу. Снимок фиксирует ВСЁ, что относится к
   ладам, на коде ДО переезда; после каждого слайса P.checkFiles сверяет живой реестр с ним поле за полем, ===. Те же данные при том же
   коде цены — тот же звук; прочие пробы (T0…T7b) сверяют цену и ряды на тех данных, что загружены.
   ЧТО В СНИМКЕ (канонический JSON: ключи отсортированы, числа — как печатает JavaScript (кратчайшая запись, читается назад тем же
   double), нечисловые — метками '#NaN'/'#+Inf'/'#undefined'):
     modes      — каждый лад SCALES по порядку: ВСЕ его поля (вместе с выведенными sel/root, режимами аккордов, правилом), плюс индекс i;
     tunings    — TUNINGS целиком (центы, равные в форме генератора, точные отношения);
     palettes   — CHORD_FAM_SETS целиком (имена, подписи и интервалы типов на всех языках — объекты L как есть);
     traditions — TRADITIONS; groups — GRP;
     menu       — по каждому языку: традиции по порядку, их корзины (ключ, подпись) и лады (индекс, id, имя) — scales.menuOf, которым рисует
                  меню ui.fillScales;
     chordModes — по каждому языку: у каждого лада с режимами — id, имя и подсказка каждого режима (как их показывает панель);
     droneNonOct — выбор второй струны дрона у неоктавных строёв (ухо пользователя; влияет на ступень дрона);
     views      — каждый ВИД (лад × «строй от» у tunable × режим аккордов): id вида, якорь, режим, поля, которые режим подставляет; и по
                  каждой из 12 тоник — ступень второй струны дрона (droneDegree: ступень, причина, центы), показ центов каждой ступени
                  (centsOf), и по каждому языку: подпись каждой ступени (draw.noteLbl), подпись каждого ряда регистра обеих осей редактора
                  (draw.axisLbl: «Все» и «Лад»), подпись и ноты аккорда на каждой ступени с септаккордом и без (chordLabel, chordNotesStr —
                  у ладов с аккордами), имя корня палитры (rootName — у ладов с палитрой), слово регистра (regWord).
   meta (дата, формат) в сверку не входит. Ничего не меняет: тоника переставляется сеттером и возвращается в finally, язык — withLang
   (без записи выбора и без перерисовки), виды — те же запомненные объекты, что берёт приложение. */
const SNAP_FILE='tools/scales.before.json';
function buildSnapshot(){
  const LGS=['en','ru'], keepT=tonic;
  const snap={ meta:{ format:'handsong/scales-snapshot', version:1, made:new Date().toISOString(), file:SNAP_FILE } };
  snap.modes=SCALES.map((s0,i)=>({ i, fields:canon(s0) }));
  snap.tunings=canon(TUNINGS); snap.palettes=canon(CHORD_FAM_SETS); snap.traditions=canon(TRADITIONS); snap.groups=canon(GRP);
  snap.droneNonOct=droneNonOct();
  snap.menu={}; snap.chordModes={};
  for(const lg of LGS) withLang(lg,()=>{
    snap.menu[lg]=TRADITIONS.map(tr=>({ id:tr.id, name:L(tr.name),
      groups:menuOf(tr.id).map(g=>({ key:g.key, label:g.label, scales:g.items.filter(({s})=>!isUserId(s.id)).map(({i,s})=>({ i, id:s.id, name:L(s.name) })) }))
        .filter(g=>g.scales.length) }));   // F6: только встроенные (группа из одних ладов пользователя — не в снимке)
    snap.chordModes[lg]=SCALES.filter(x=>x.chordModes).map(x=>({ id:x.id, modes:x.chordModes.map(m=>({ id:m.id, name:chordModeName(m), hint:chordModeHint(m) })) }));   // F6b: ключ словаря или своё имя — одно чтение
  });
  snap.views=[];
  try{
    for(const {s0,tf,cm,v} of snapViews()){
      const n=v.iv.length, chords=!v.noChords && !(v.chordRule && v.chordRule.kind==='none'), axA=RP.axis(v,true), axM=RP.axis(v,false);
      const rec={ id:viewIdOf(v), mode:s0.id, tf, cm:cm??null, anchor:canon(v.anchor), chordMode:v.chordMode??null,
                  over:canon({ chordBuild:v.chordBuild, typedChords:v.typedChords, chordRule:v.chordRule }), byTonic:[] };
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        const T={ drone:canon(droneDegree(v)), cents:range(n+1).map(d=>canon(centsOf(d,v))), lang:{} };
        for(const lg of LGS) withLang(lg,()=>{
          const L1={ notes:range(n+1).map(d=>RP.noteLbl(d,v)),
                     axisAll:range(axA.rpp).map(r=>RP.axisLbl(axA,r)), axisMode:range(axM.rpp).map(r=>RP.axisLbl(axM,r)),
                     periodWord:regWord(v) };
          if(chords){ L1.chord=range(n+1).map(d=>chordLabel(d,v,false)); L1.chord7=range(n+1).map(d=>chordLabel(d,v,true));
                      L1.chordNotes=range(n+1).map(d=>chordNotesStr(d,v,false)); L1.chordNotes7=range(n+1).map(d=>chordNotesStr(d,v,true)); }
          if(v.typedChords) L1.root=range(n+1).map(d=>rootName(d,v));
          T.lang[lg]=L1;
        });
        rec.byTonic.push(T);
      }
      snap.views.push(rec);
    }
  } finally { setTonic(keepT); }
  return snap;
}
/* P.dumpScales() — снимок и СКАЧИВАНИЕ файла scales.before.json (положить в tools/ — его читает P.checkFiles). → сам снимок. */
export function dumpScales(){
  const snap=buildSnapshot(), text=JSON.stringify(snap);
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'application/json'})); a.download='scales.before.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  console.log(`[scaleprobe files] snapshot: ${snap.modes.length} modes, ${Object.keys(snap.tunings).length} tunings, ${Object.keys(snap.palettes).length} palettes, ${snap.views.length} views × 12 tonics × 2 languages · ${(text.length/1024).toFixed(0)} KB — downloaded as scales.before.json; put it into tools/`);
  return snap;
}
/* ⛳ F7: СВЕРКА ПО id, А НЕ ПО МЕСТУ. Лады, виды и списки режимов аккордов сравниваются ПО СВОЕМУ id (лад — без номера i: место в массиве
   не тождество, правило #25; удаление одного лада иначе показало бы расхождение у каждого лада после него). Порядок проверяет меню — его
   списки остаются ПОЗИЦИОННЫМИ (без номера i, по той же причине), так что перестановка ладов видна. Форма файла снимка не меняется:
   оба снимка перекладываются здесь одинаково. */
function keyedSnap(x){ const o={...x};
  if(Array.isArray(o.modes)) o.modes=Object.fromEntries(o.modes.map(r=>[r.fields && r.fields.id, r.fields]));
  if(Array.isArray(o.views)) o.views=Object.fromEntries(o.views.map(v=>[v.id, v]));
  if(o.chordModes) o.chordModes=Object.fromEntries(Object.entries(o.chordModes).map(([lg,a])=>[lg, Object.fromEntries((a||[]).map(z=>[z.id, z.modes]))]));
  if(o.menu) o.menu=Object.fromEntries(Object.entries(o.menu).map(([lg,trs])=>[lg, (trs||[]).map(tr=>({ ...tr, groups:(tr.groups||[]).map(g=>({ ...g, scales:(g.scales||[]).map(({id,name})=>({id,name})) })) }))]));
  return o; }
/* P.checkFiles() — живой реестр против tools/scales.before.json, поле за полем (===), без meta. Файла нет — { noSnap:true }: P.all
   показывает «снимка ещё нет» (не провал и не pass). Каждое расхождение — путь и обе величины. */
export async function checkFiles(){
  let file;
  try{ const r=await fetch(new URL(SNAP_FILE, location.href), {cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status); file=await r.json(); }
  catch(e){ console.log(`[scaleprobe files] no snapshot yet (${SNAP_FILE}: ${e&&e.message}) — run P.dumpScales() on the unchanged code and put the file into tools/`);
            return { cases:0, total:0, differences:[], noSnap:true }; }
  file=keyedSnap(file);
  const live=keyedSnap(JSON.parse(JSON.stringify(buildSnapshot())));   // та же сериализация, что у файла: сравниваем одно с одним; F7 — по id
  const bad=[]; let nBad=0, cases=0;
  const groups=new Map();   // F5b: СВОДКА по пути поля (номера в [] → [*]) и виду расхождения — видно с одного взгляда, ЧТО разошлось
  const miss=(m,path,kind)=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m);
    const key=(path||'?').replace(/\[\d+\]/g,'[*]')+' · '+(kind||'value'); groups.set(key,(groups.get(key)||0)+1); };
  const show=x=>{ const j=JSON.stringify(x); return j===undefined ? 'nothing' : j.length>120 ? j.slice(0,117)+'…' : j; };
  const walk=(a,b,path)=>{
    if(a!==null && b!==null && typeof a==='object' && typeof b==='object'){
      if(Array.isArray(a)!==Array.isArray(b)){ miss(`${path}: array vs object`,path,'type'); return; }
      if(Array.isArray(a)){ if(a.length!==b.length) miss(`${path}: length ${b.length} now, ${a.length} in the snapshot`,path,'length');
        for(let i=0;i<Math.min(a.length,b.length);i++) walk(a[i],b[i],path+'['+i+']'); return; }
      for(const k of new Set([...Object.keys(a),...Object.keys(b)])){
        if(!(k in a)) miss(`${path}.${k}: new now (${show(b[k])})`,path+'.'+k,'new'); else if(!(k in b)) miss(`${path}.${k}: gone now (snapshot ${show(a[k])})`,path+'.'+k,'gone'); else walk(a[k],b[k],path+'.'+k); }
      return;
    }
    cases++; if(a!==b) miss(`${path}: ${show(b)} now, ${show(a)} in the snapshot`,path,'value');
  };
  for(const k of new Set([...Object.keys(file),...Object.keys(live)])){ if(k==='meta') continue;
    if(!(k in file)) miss(`${k}: new now`,k,'new'); else if(!(k in live)) miss(`${k}: gone now`,k,'gone'); else walk(file[k],live[k],k); }
  { const u=userCount(); console.log(`[scaleprobe files] covers the BUILT-IN data only (data/ and the emergency pair)${u ? ` — ${u} user record(s) installed, not compared` : ''}`); }
  console.log(`[scaleprobe files] snapshot ${file.meta&&file.meta.made} · values compared ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe files] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe files] …and ${nBad-PRINT_MAX} more`);
  if(!nBad) console.log('[scaleprobe files] every mode, tuning, palette, menu entry, drone degree and label equals the snapshot');
  const summary=[...groups].map(([k,n])=>{ const i=k.lastIndexOf(' · '); return { field:k.slice(0,i), kind:k.slice(i+3), count:n }; });
  if(nBad){ console.log('[scaleprobe files] differences grouped by field path:'); console.table(summary); }
  return { cases, total:nBad, differences:bad, summary, made:file.meta&&file.meta.made };
}

/* ═══ ⛳ F3 — P.checkNames(): ИМЕНА ДАННЫМИ ПРОТИВ ЗАМОРОЖЕННЫХ ПОДПИСЕЙ ДО F3 ═══
   Каждый вид (лад × «строй от» у tunable × режим аккордов — те же виды, что у снимка F0) × 12 тоник × en/ru, строгое ===:
     слово периода (короткое и полное), каждая ступень 0..n — подпись ступени (draw.noteLbl), имя ряда (rowLabel), корень палитры
     (rootName), аккорд и его ноты с септаккордом и без (chordLabel, chordNotesStr — у ладов с аккордами, как в снимке), каждый шаг
     −edo..2·edo−1 (stepName); и каждый ряд ВСЕХ регистров обеих осей редактора «Все» и «Лад» (draw.axisLbl — у приглушённых рядов
     это имя высоты строя). Опоры — preF3* выше. Тонику переставляет сеттер и возвращает finally; язык — withLang. */
export function checkNames(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keepT=tonic;
  try{
    for(const {v} of snapViews()){
      const n=v.iv.length, id=viewIdOf(v), chords=!v.noChords && !(v.chordRule && v.chordRule.kind==='none');
      const axes=[['All',RP.axis(v,true)],['Mode',RP.axis(v,false)]];
      /* ⛳ F7: опоры F3 не знают схемы ступеней ОТ РЕЖИМА АККОРДОВ (degNaming появилась в F7): вид, чьи ступени режим называет
         порядковыми (Натуральный в «Свободно»), сверяется с замороженным порядковым правилом — тем же видом без fixedKey (опора F3 даёт
         порядковые у табличного лада без fixedKey: ровно прежний подвижный Натуральный). Иных схем режимы встроенных не задают. */
      const vr= v.degNaming==='ordinal' ? {...v, fixedKey:false} : v;
      const axR=ax=> vr===v ? ax : {...ax, sc:vr};
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const lg of ['en','ru']) withLang(lg,()=>{
          const eq=(what,a,b)=>{ cases++; if(a!==b) miss(`${id} tonic ${tn} ${lg} · ${what}: "${a}" now, "${b}" before F3`); };
          eq('period word', regWord(v), preF3RegWord(v)); eq('period word (full)', regWordFull(v), preF3RegWordFull(v));
          for(let d=0;d<=n;d++){
            eq(`degree ${d}`, RP.noteLbl(d,v), preF3NoteLbl(d,vr)); eq(`row ${d}`, rowLabel(d,v), preF3RowLabel(d,v)); eq(`root ${d}`, rootName(d,v), preF3RootName(d,v));
            if(chords) for(const sev of [false,true]){ const w=sev?' 7th':'';
              eq(`chord ${d}${w}`, chordLabel(d,v,sev), preF3ChordLabel(d,v,sev)); eq(`chord notes ${d}${w}`, chordNotesStr(d,v,sev), preF3ChordNotesStr(d,v,sev)); }
          }
          for(let st=-v.edo; st<2*v.edo; st++) eq(`step ${st}`, stepName(st,v), preF3StepName(st,v));
          for(const [nm,ax] of axes) for(let r=0;r<ax.rpp*REG_N;r++) eq(`${nm} axis row ${r}`, RP.axisLbl(ax,r), preF3AxisLbl(axR(ax),r));
        });
      }
    }
  } finally { setTonic(keepT); }
  console.log(`[scaleprobe names] ${snapViews().length} views × 12 tonics × 2 languages · labels compared ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe names] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe names] …and ${nBad-PRINT_MAX} more`);
  if(!nBad) console.log('[scaleprobe names] every label read from the naming schemes equals the pre-F3 label');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F5b — P.renewSnapshot(): ПЕРЕСНЯТЬ СНИМОК ТОЛЬКО ПОСЛЕ ДОКАЗАННОГО РАСХОЖДЕНИЯ ═══
   Снимок F0 — доказательство переезда; переснимать его можно лишь тогда, когда сверка с ним показывает РОВНО то изменение, которое слайс
   объявил. allowed — список разрешённых групп сводки P.checkFiles (путь поля с [*] и вид расхождения); по умолчанию — изменение F5b:
   поле tag ушло из записи каждого лада (modes[*].fields.tag · gone), и таких расхождений ровно столько, сколько ладов. Всё иначе —
   отказ с причиной, ничего не скачивается. Иначе — P.dumpScales(): новый scales.before.json скачивается, его кладут в tools/ вместо старого. */
/* ⛳ ОБЪЯВЛЕННЫЕ ИЗМЕНЕНИЯ СНИМКА — по слайсу. field — путь поля сводки P.checkFiles; '*' — ОДНО звено пути (ключ объекта: id строя,
   лада…); count — сколько расхождений обязано найтись по ВСЕМ подходящим группам вместе. F5b: поле tag ушло из каждого лада. F6b: у
   каждого встроенного строя появилось имя (tunings.<id>.name — новое поле). Без аргумента renewSnapshot берёт ПОСЛЕДНЕЕ объявленное. */
export const SNAPSHOT_CHANGES={
  f5b:[{ field:'modes.*.tag', kind:'gone', count:()=>SCALES.length }],   // (с F7 сверка по id — путь записан в нынешней форме)
  f6b:[{ field:'tunings.*.name', kind:'new', count:()=>Object.keys(TUNINGS).length }],
  /* F7: два Натуральных слиты в один лад 'just-intonation' (13 «строй от» × 2 режима аккордов = 26 видов); в меню «Европа историческая»
     вместо двух строк — одна: из 7 строк группы стало 6, со второй по шестую строки сдвинулись (5 id и 5 имён на язык) и длина. */
  f7:[{ field:'modes.ji-adaptive', kind:'gone', count:()=>1 }, { field:'modes.ji-fixed', kind:'gone', count:()=>1 },
      { field:'modes.just-intonation', kind:'new', count:()=>1 },
      { field:'views.ji-adaptive', kind:'gone', count:()=>1 }, { field:'views.ji-fixed', kind:'gone', count:()=>1 },
      { field:'views.just-intonation@*', kind:'new', count:()=>26 },
      { field:'chordModes.*.just-intonation', kind:'new', count:()=>2 },
      { field:'menu.*[*].groups[*].scales', kind:'length', count:()=>2 },
      { field:'menu.*[*].groups[*].scales[*].id', kind:'value', count:()=>10 },
      { field:'menu.*[*].groups[*].scales[*].name', kind:'value', count:()=>10 }],
  /* F7-починка: голый лад РАВЕН своему режиму аккордов по умолчанию — у Партча и Болена–Пирса прибавилось chordBuild 'adaptive' (умолчание
     «Свободно»), у Натурального — палитра 'nat' и chordBuild 'adaptive' (его «Свободно»), а его «Как на инструменте» переопределяет и имена
     ступеней (degNaming 'notes12' — у самого лада теперь порядковые). */
  f7b:[{ field:'modes.partch-43.chordBuild', kind:'new', count:()=>1 }, { field:'modes.bohlen-pierce.chordBuild', kind:'new', count:()=>1 },
       { field:'modes.just-intonation.typedChords', kind:'new', count:()=>1 }, { field:'modes.just-intonation.chordBuild', kind:'new', count:()=>1 },
       { field:'modes.just-intonation.chordModes[*].over.degNaming', kind:'new', count:()=>1 }],
};
const reEsc=q=>q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fieldRe=f=>new RegExp('^'+f.split('[*]').map(p=>p.split('*').map(reEsc).join('[^.\\[\\]]+')).join('\\[\\*\\]')+'$');   // '*' — одно звено; '[*]' — номер в сводке, как есть
export async function renewSnapshot(arg=SNAPSHOT_CHANGES.f7b){
  const allowed=Array.isArray(arg) ? arg : (arg && arg.allowed) || SNAPSHOT_CHANGES.f7b;   // F6b: P.renewSnapshot({allowed: …}) или список
  const keep={ log:console.log, warn:console.warn, table:console.table }; let r;
  console.log=console.warn=console.table=()=>{};
  try{ r=await checkFiles(); } finally { Object.assign(console,keep); }
  const say=m=>console.log('%c[scaleprobe renew] '+m,'color:#57d9a3;font-weight:bold');
  if(r.noSnap){ say('no snapshot in tools/ to renew — nothing done'); return { renewed:false, why:'no snapshot' }; }
  if(!r.total){ say('the live data already equal the snapshot — nothing to renew'); return { renewed:false, why:'no differences' }; }
  console.table(r.summary);
  const fits=(a,g)=>a.kind===g.kind && (a.field===g.field || fieldRe(a.field).test(g.field));   // F6b: '*' — одно звено пути
  const odd=r.summary.filter(g=>!allowed.some(a=>fits(a,g)));
  const short=allowed.filter(a=>{ const n=r.summary.filter(g=>fits(a,g)).reduce((x,g)=>x+g.count,0); return !n || (a.count && n!==a.count()); });
  if(odd.length || short.length){
    say(`REFUSED — the differences are not exactly the declared change: ${odd.map(g=>`${g.field} · ${g.kind} ×${g.count}`).join('; ')||'—'}`
       +(short.length ? ` · expected but not matched: ${short.map(a=>`${a.field} · ${a.kind}${a.count?' ×'+a.count():''}`).join('; ')}` : ''));
    return { renewed:false, why:'unexpected differences', summary:r.summary };
  }
  say(`every one of the ${r.total} differences is the declared change (${allowed.map(a=>`${a.field} · ${a.kind}`).join('; ')}) — taking a new snapshot (old one made ${r.made})`);
  const snap=dumpScales();
  say('scales.before.json downloaded — move it into tools/ (replacing the old file), reload, and await P.checkFiles() must read zero');
  return { renewed:true, replaced:r.made, made:snap.meta.made, summary:r.summary };
}

/* ═══ ⛳ F6 — P.checkUserDelete(): УДАЛЕНИЕ ФАЙЛА ПОЛЬЗОВАТЕЛЯ НЕ ЛОМАЕТ ЗАПИСАННОЕ ═══
   Материал — пример файлов пользователя (userfiles.example: свой табличный строй с именами-списком и словом периода en/ru, лад на нём с
   палитрой 'nat') под id пробы. Порядок: та же проверка записи (checkRecord), установка ТЕМ ЖЕ кодом, что консоль (registerRecord — без
   записи в хранилище и без перестройки меню), лад становится живым, взятое пишется НАСТОЯЩЕЙ воронкой в песочнице (probeTake: соло, бас,
   аккорды палитры на каждой ступени, два регистра; песня не меняется); затем снимается «отпечаток» записанного — цена каждого события
   (evHz; у аккорда — каждая нота: частота и интервал), его место и подпись на ОБЕИХ осях редактора, и по виду — подписи ступеней,
   слово периода, строка статуса, дрон, id вида, строй вида; живой лад возвращается, ЛАД И СТРОЙ УДАЛЯЮТСЯ (unregisterRecord), удаление
   проверяется (нет в реестрах, в наборе, в меню), и отпечаток снимается снова — обязан совпасть строка в строку. Нужен ▶ Play (песочница —
   как у P.checkWrite). finally снимает записи пробы при любом исходе. */
const UD_T='u.f6f6f6f6-0000-4000-8000-00000000000a', UD_M='u.f6f6f6f6-0000-4000-8000-00000000000b';
export function checkUserDelete(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keepSc=scaleId; let reg=false;
  const D=scaleData(), E=userExample();
  const t0={...E.tuning, id:UD_T}, m0={...E.mode, id:UD_M, tuning:UD_T, name:{en:'Probe: user mode',ru:'Проба: лад пользователя'}};
  const drop=()=>{ if(D.modes[UD_M]) unregisterRecord('mode',UD_M,false); if(D.tunings[UD_T]) unregisterRecord('tuning',UD_T,false); };
  const roleOf=fn=> fn.startsWith('lead') ? 'ld' : fn.startsWith('bass') ? 'bs' : fn.startsWith('ch') ? 'ch' : null;
  const fingerprint=evs=>{ const out=[], views=new Set();
    for(const ev of evs){ const role=roleOf(ev.fn); if(!role || ev.a.ti==null) continue; views.add(ev.sc);
      const price= role==='ch' ? chordNotesAt(ev.a.ti,ev.a.oct,ev.sc,ev.sev,ev.a.ty).map(n=>[n.f,n.iv]) : evHz(ev.a,ev,role);
      const axes=[true,false].map(all=>{ const ax=RP.axis(ev.sc,all), p=ax.placeTi(ev.a.ti,ev.a.oct);
        return { r:p.r, dev:p.dev, lbl: Number.isInteger(p.r) ? RP.axisLbl(ax,p.r) : null }; });
      out.push({ fn:ev.fn, t:ev.t, ti:ev.a.ti, oct:ev.a.oct, price, axes }); }
    for(const v of views){ const n=v.iv.length;
      out.push({ view:viewIdOf(v), tuning:tuningOf(v)===v.tuningRec, notes:range(n+1).map(d=>RP.noteLbl(d,v)), roots:range(n+1).map(d=>rootName(d,v)),
                 word:regWord(v), wordFull:regWordFull(v), status:tuningStatus(v), drone:canon(droneDegree(v)), cents:range(n+1).map(d=>centsOf(d,v)) }); }
    return out; };
  try{
    drop();
    for(const [k,r] of [['tuning',t0],['mode',m0]]){ cases++; const w= k==='mode' && !D.tunings[UD_T] ? 'tuning not registered' : checkRecord(k,r,D);
      if(w){ miss(`the example user ${k} fails the validator: ${w}`); return { cases, total:nBad, differences:bad }; }
      if(k==='tuning'){ registerRecord('tuning',t0,false); reg=true; } else registerRecord('mode',m0,false); }
    setScaleId(UD_M); const v=CUR(); cases++;
    if(!v || v.mode!==scaleById(UD_M)) miss('the user mode did not become the live view');
    const F=chordFams(v), tys=F.slice(0,2).map(f=>f.types[0].iv);
    const steps=[]; let t=0; const add=(fn,a)=>{ steps.push({fn,a,t}); t+=0.25; };
    for(const o of [1,2]) for(let d=0;d<=v.iv.length;d++){
      add('leadOn',{deg:d,oct:o,vol:0.7,inst:3,v:d%2}); add('bassOn',{deg:d,oct:o,vol:0.6,inst:2}); add('chOn',{deg:d,oct:o,vol:0.55,inst:1,ty:tys[d%tys.length]}); }
    const R=probeTake(steps); cases++;
    if(!R.ok){ miss(`the sandboxed take was refused — ${R.why}`); return { cases, total:nBad, differences:bad }; }
    const evs=R.events; cases++; if(!evs.some(e=>e.sc===v)) miss('no recorded event holds the user view');
    const before=fingerprint(evs);
    setScaleId(keepSc);                                     // живой лад — прежний, ПЕРЕД удалением (удаление не должно его переключать)
    const a=unregisterRecord('mode',UD_M,false), b=unregisterRecord('tuning',UD_T,false); reg=false;
    for(const [w,ok] of [['the mode was removed',a.ok],['the tuning was removed',b.ok],['scaleById no longer finds the mode',scaleById(UD_M)===null],
                         ['the registry has no tuning',!TUNINGS_ALL[UD_T]],['the data set has neither',!D.modes[UD_M]&&!D.tunings[UD_T]],
                         ['the menu has no user mode',!menuOf('exp').some(g=>g.items.some(({s})=>s.id===UD_M))],['the mode left SCALES',!SCALES_ALL.some(s=>s.id===UD_M)]]){
      cases++; if(!ok) miss(`deletion: ${w} — failed`); }
    const after=fingerprint(evs);
    cases++; if(before.length!==after.length) miss(`fingerprint length ${after.length} after deletion, ${before.length} before`);
    for(let i=0;i<Math.min(before.length,after.length);i++){ cases++; const A=JSON.stringify(after[i]), B=JSON.stringify(before[i]);
      if(A!==B) miss(`after deletion: ${A.slice(0,160)} — before: ${B.slice(0,160)}`); }
    console.log(`[scaleprobe user] recorded ${evs.length} events in a user mode, deleted the mode and its tuning · items compared ${before.length} · differences ${nBad}`);
  } finally { if(reg) drop(); else { try{ drop(); }catch(e){} } setScaleId(keepSc); }
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe user] '+m));
  if(!nBad) console.log('[scaleprobe user] every recorded note sounds and shows exactly as before the user files were deleted');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F6b — P.checkUserChordModes(): СВОЙ НАБОР РЕЖИМОВ АККОРДОВ ═══
   Материал — userfiles.chordModesExample под id пробы: набор из ТРЁХ режимов со своими именами {en, ru} («Терции» без переопределений,
   «Палитра» — palette chrom12, «Пауэр» — rule power) и мажор на встроенном 12-равном с ним. Проверка (запись — та же checkRecord,
   установка — registerRecord без хранилища и меню): (1) имена и подсказки режимов на обоих языках — свои; если есть панель — после
   перестройки (hooks.scales) в #chordModeSeg ровно три кнопки с этими именами; (2) ЦЕНА каждого режима — как велят его переопределения:
   «Терции» === встроенный мажор (те же ступени, правило tertian), «Палитра» — каждый тип палитры chrom12 на каждом корне === встроенная
   хроматика, «Пауэр» === встроенная мажорная пентатоника в режиме «Пауэр-аккорд» (на общих корнях); и «Пауэр» хоть раз отличается от
   «Терций» (переопределение действует); (3) ЗАПИСАННОЕ ДЕРЖИТ СВОЙ РЕЖИМ (T7b): в каждом режиме пишется взятое (песочница probeTake), затем
   режим лада переключается — цена каждого записанного аккорда и режим его вида не меняются. Регистры 1..2, септаккорд без и с.
   finally — записи пробы снимаются, живой лад и выбор режимов возвращаются. Нужен ▶ Play (песочница). */
const CM_S='u.f6b0f6b0-0000-4000-8000-00000000000c', CM_M='u.f6b0f6b0-0000-4000-8000-00000000000d';
export function checkUserChordModes(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const D=scaleData(), E=userCmExample(), keepSc=scaleId, keepCM={...chordModeSel};
  const set={...E.set, id:CM_S}, mode={...E.mode, id:CM_M, chords:{...E.mode.chords, modes:CM_S}, name:{en:'Probe: user chord modes',ru:'Проба: свои режимы аккордов'}};
  const drop=()=>{ if(D.modes[CM_M]) unregisterRecord('mode',CM_M,false); if(D.chordModeSets[CM_S]) unregisterRecord('chordmodes',CM_S,false); };
  const sig=n=>JSON.stringify(n.map(x=>[x.f,x.iv]));
  const panelBtns=()=>{ const el=typeof document!=='undefined' && document.getElementById('chordModeSeg'); return el ? [...el.querySelectorAll('button')].map(b=>b.textContent) : null; };
  try{
    drop();
    for(const [k,r] of [['chordmodes',set],['mode',mode]]){ cases++; const w=checkRecord(k,r,D);
      if(w){ miss(`the example user ${k} fails the validator: ${w}`); return { cases, total:nBad, differences:bad }; }
      registerRecord(k,r,false); }
    const m0=scaleById(CM_M), ids=E.set.modes.map(x=>x.id); cases++;
    if(!m0 || !m0.chordModes || m0.chordModes.length!==3) miss('the user mode does not carry its three chord modes');
    // (1) имена — свои, на обоих языках; кнопки панели
    for(const lg of ['en','ru']) withLang(lg,()=>{ E.set.modes.forEach((x,i)=>{ const rm=m0.chordModes[i]; cases+=2;
      if(chordModeName(rm)!==x.name[lg]) miss(`${lg}: chord mode ${x.id} is named "${chordModeName(rm)}", not "${x.name[lg]}"`);
      if(chordModeHint(rm)!==x.hint[lg]) miss(`${lg}: chord mode ${x.id} hint "${chordModeHint(rm)}", not "${x.hint[lg]}"`); }); });
    if(panelBtns() && hooks.scales){ setScaleId(CM_M); hooks.scales({}); const B=panelBtns(); cases++;
      const want=E.set.modes.map(x=>L(x.name));
      if(JSON.stringify(B)!==JSON.stringify(want)) miss(`the panel shows ${JSON.stringify(B)}, expected ${JSON.stringify(want)}`);
      setScaleId(keepSc); hooks.scales({}); }
    // (2) цена каждого режима — по его переопределениям
    const V=Object.fromEntries(ids.map(id=>[id, scaleView(m0,'T',id)]));
    const major=scaleView(scaleById('major'),'T'), chrom=scaleView(scaleById('chromatic'),'T'), penta=scaleView(scaleById('major-penta'),'T','power');
    cases+=3; if(V.palette.typedChords!=='chrom12') miss('mode "palette" does not take the chrom12 palette'); if(V.thirds.typedChords!==undefined) miss('mode "thirds" carries a palette');
    if(!(V.power.chordRule && V.power.chordRule.kind==='power')) miss('mode "power" does not take the power rule');
    let differs=false;
    for(const oct of [1,2]) for(const sev of [false,true]){
      for(const ti of m0.sel){ cases++; const a=sig(chordNotesAt(ti,oct,V.thirds,sev,null)), b=sig(chordNotesAt(ti,oct,major,sev,null));
        if(a!==b) miss(`thirds ti ${ti} reg ${oct}${sev?' 7th':''}: ${a} vs built-in major ${b}`);
        for(const f of chordFams(V.palette)) for(const ty of f.types){ cases++; const x=sig(chordNotesAt(ti,oct,V.palette,sev,ty.iv)), y=sig(chordNotesAt(ti,oct,chrom,sev,ty.iv));
          if(x!==y) miss(`palette ti ${ti} reg ${oct} ${L(ty.label)}: ${x} vs built-in chromatic ${y}`); } }
      for(const ti of penta.sel){ cases++; const a=sig(chordNotesAt(ti,oct,V.power,sev,null)), b=sig(chordNotesAt(ti,oct,penta,sev,null));
        if(a!==b) miss(`power ti ${ti} reg ${oct}${sev?' 7th':''}: ${a} vs built-in pentatonic power ${b}`);
        if(a!==sig(chordNotesAt(ti,oct,V.thirds,sev,null))) differs=true; } }
    cases++; if(!differs) miss('mode "power" prices exactly like "thirds" — its override has no effect');
    // (3) записанное держит свой режим
    const rec=[];
    for(const id of ids){ setChordMode(CM_M,id); setScaleId(CM_M); const v=CUR(); cases++;
      if(v!==V[id]) miss(`chord mode ${id}: the live view is not the mode's view`);
      const ty0=chordFams(v)[0].types[0].iv, steps=[]; let t=0;
      for(const d of [0,1,3,4]) steps.push({fn:'chOn', a:{deg:d,oct:1,vol:0.6,inst:1,ty: id==='palette' ? ty0 : null}, t:(t+=0.5)});
      const R=probeTake(steps); cases++;
      if(!R.ok){ miss(`chord mode ${id}: the sandboxed take was refused — ${R.why}`); return { cases, total:nBad, differences:bad }; }
      for(const ev of R.events) if(ev.fn==='chOn') rec.push({ ev, cm:id, price:sig(chordNotesAt(ev.a.ti,ev.a.oct,ev.sc,ev.sev,ev.a.ty)) }); }
    for(const id of ids){ setChordMode(CM_M,id);
      for(const r of rec){ cases+=2; if(r.ev.sc.chordMode!==r.cm) miss(`a chord recorded in "${r.cm}" now holds the view of "${r.ev.sc.chordMode}"`);
        const p=sig(chordNotesAt(r.ev.a.ti,r.ev.a.oct,r.ev.sc,r.ev.sev,r.ev.a.ty)); if(p!==r.price) miss(`switching to "${id}" changed a chord recorded in "${r.cm}": ${p} vs ${r.price}`); } }
    console.log(`[scaleprobe chord modes] a user set of ${ids.length} chord modes (${E.set.modes.map(x=>x.name.en).join(' / ')}) · cases ${cases} · differences ${nBad}`);
  } finally { setScaleId(keepSc); setChordModeSel(keepCM); try{ drop(); }catch(e){} }
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe chord modes] '+m));
  if(!nBad) console.log('[scaleprobe chord modes] own names, three buttons, each mode prices as its overrides say, recorded chords keep their mode');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F7 — P.checkMerge(): ДВА НАТУРАЛЬНЫХ → ОДИН ЛАД С «СТРОЙ ОТ» И РЕЖИМОМ АККОРДОВ ═══
   ЗАМОРОЖЕННЫЕ ОПОРЫ — записи прежних ладов 'ji-adaptive' и 'ji-fixed' ровно такими, какими их строил сборщик (объекты приложения, из
   снимка tools/scales.before.json до F7). Предустановки слитого лада 'just-intonation': «следует за тоникой + Свободно» против прежнего
   подвижного, «от C + Как на инструменте» против прежнего фиксированного. ЦЕНЫ (===): высота тоники, дрон, единица корня, набор палитры;
   × 12 тоник × A4 415 / 440 / 466.16 × регистры 0..3: соло и бас по ступени (0..12) и по индексу в строе (0..12), каждая нота каждого
   типа палитры (с септаккордом и без) по ступени и по индексу корня (0..11). ПОДПИСИ (на обоих языках, × 12 тоник): ступень, ряд, корень,
   аккорд и его ноты (± септаккорд), центы ступени, слово периода (оба), строка статуса, обе оси редактора (каждый ряд каждого регистра) —
   новые функции на виде предустановки против ЗАМОРОЖЕННЫХ подписей (preF3… и preF4Status) на прежнем виде. ПСЕВДОНИМЫ: прежние id ведут
   на слитый лад и открывают вид своей предустановки. Тоника, A4, лад, «строй от» и выбор режимов возвращаются в finally. */
const PRE_F7_MODES={"ji-adaptive":{"cents":[0,111.73,203.91,315.64,386.31,498.04,590.22,701.96,813.69,884.36,1017.6,1088.27],"chordBuild":"adaptive","chordRule":{"kind":"palette"},"edo":12,"grp":"","id":"ji-adaptive","iv":[0,1,2,3,4,5,6,7,8,9,10,11],"name":{"en":"Just intonation — adaptive (as a choir sings)","ru":"Натуральный строй — подвижный (как поёт хор)"},"root":0,"sel":[0,1,2,3,4,5,6,7,8,9,10,11],"trad":"europe","tuning":"ji12","typedChords":"nat"},"ji-fixed":{"cents":[0,111.73,203.91,315.64,386.31,498.04,590.22,701.96,813.69,884.36,1017.6,1088.27],"chordRule":{"kind":"palette"},"edo":12,"fixedKey":true,"gridChords":true,"grp":"","id":"ji-fixed","iv":[0,1,2,3,4,5,6,7,8,9,10,11],"name":{"en":"Just intonation — fixed (as on a keyboard)","ru":"Натуральный строй — фиксированный (как на клавишных)"},"root":0,"sel":[0,1,2,3,4,5,6,7,8,9,10,11],"trad":"europe","tuning":"ji12","typedChords":"natfix"}};
const PRE_F7_OBJ={};   // объекты прежних ладов — по одному на сеанс (виды памятятся по объекту)
const preF7=id=>PRE_F7_OBJ[id] || (PRE_F7_OBJ[id]=JSON.parse(JSON.stringify(PRE_F7_MODES[id])));
export function checkMerge(){
  const bad=[]; let nBad=0, cases=0, nP=0, nL=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const M=scaleById('just-intonation');
  if(!M){ miss('no mode just-intonation'); return { cases, total:nBad, differences:bad }; }
  const keep={ t:tonic, a:aRef, sc:scaleId, tf:tunedFrom, cm:{...chordModeSel} };
  const J=x=>JSON.stringify(canon(x));
  const eqP=(what,a,b)=>{ cases++; nP++; if(typeof a==='number' ? a!==b : J(a)!==J(b)) miss(`${what}: ${typeof a==='number'?a:J(a).slice(0,140)} now, ${typeof b==='number'?b:J(b).slice(0,140)} before`); };
  const eqL=(what,a,b)=>{ cases++; nL++; if(a!==b) miss(`${what}: "${a}" now, "${b}" before`); };
  const presets=[['follows the tonic + Free','ji-adaptive','T','free'], ['tuned from C + As on the instrument','ji-fixed',0,'instrument']];
  try{
    for(const [name,oldId,tf,cm] of presets){
      const nv0=scaleView(M,tf,cm), nv=keyless(nv0), ov=keyless(scaleView(preF7(oldId),'T'));   // TF2: key-less for the tonic loop; identity below on nv0
      const types=chordFams(ov).flatMap(f=>f.types.map(x=>x.iv));
      eqP(`${name}: palette`, chordFams(nv), chordFams(ov)); eqP(`${name}: root unit`, chordUnit(nv), chordUnit(ov));
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const A of [415,440,466.16]){ setARef(A); const w=`${name} · tonic ${tn} · A4 ${A}`;
          eqP(`${w} · tonic Hz`, tonicFreq(nv), tonicFreq(ov)); eqP(`${w} · drone`, droneDegree(nv), droneDegree(ov));
          for(let o=0;o<4;o++){
            for(let d=0;d<=12;d++){ eqP(`${w} · lead deg ${d} reg ${o}`, leadFreq(d,o,nv), leadFreq(d,o,ov)); eqP(`${w} · bass deg ${d} reg ${o}`, bassFreq(d,o,nv), bassFreq(d,o,ov));
              eqP(`${w} · lead ti ${d} reg ${o}`, leadFreqTi(d,o,nv), leadFreqTi(d,o,ov)); eqP(`${w} · bass ti ${d} reg ${o}`, bassFreqTi(d,o,nv), bassFreqTi(d,o,ov)); }
            for(const sev of [false,true]) for(const ty of types) for(let d=0;d<12;d++){ const tw=`${w} · chord [${ty}]${sev?' 7th':''} reg ${o}`;
              eqP(`${tw} deg ${d}`, chordNotes(d,o,nv,sev,ty).map(x=>[x.f,x.iv]), chordNotes(d,o,ov,sev,ty).map(x=>[x.f,x.iv]));
              eqP(`${tw} ti ${d}`, chordNotesAt(d,o,nv,sev,ty).map(x=>[x.f,x.iv]), chordNotesAt(d,o,ov,sev,ty).map(x=>[x.f,x.iv])); } } }
        setARef(440);
        for(const lg of ['en','ru']) withLang(lg,()=>{ const w=`${name} · tonic ${tn} · ${lg}`;
          for(let d=0;d<=12;d++){ eqL(`${w} · degree ${d}`, RP.noteLbl(d,nv), preF3NoteLbl(d,ov)); eqL(`${w} · row ${d}`, rowLabel(d,nv), preF3RowLabel(d,ov));
            eqL(`${w} · root ${d}`, rootName(d,nv), preF3RootName(d,ov)); eqL(`${w} · cents ${d}`, String(centsOf(d,nv)), String(centsOf(d,ov)));
            for(const sev of [false,true]){ eqL(`${w} · chord ${d}${sev?' 7th':''}`, chordLabel(d,nv,sev), preF3ChordLabel(d,ov,sev)); eqL(`${w} · chord notes ${d}${sev?' 7th':''}`, chordNotesStr(d,nv,sev), preF3ChordNotesStr(d,ov,sev)); } }
          eqL(`${w} · period word`, regWord(nv), preF3RegWord(ov)); eqL(`${w} · period word (full)`, regWordFull(nv), preF3RegWordFull(ov)); eqL(`${w} · status`, tuningStatus(nv), preF4Status({...ov, name:nv.name}));   // F7-починка: имя лада — объявленное изменение; в опору подставлено новое имя, вся прочая строка сверяется как есть
          for(const all of [true,false]){ const aN=RP.axis(nv,all), aO=RP.axis(ov,all); eqL(`${w} · axis ${all?'All':'Mode'} rows per register`, String(aN.rpp), String(aO.rpp));
            for(let r=0;r<aO.rpp*REG_N;r++) eqL(`${w} · axis ${all?'All':'Mode'} row ${r}`, RP.axisLbl(aN,r), preF3AxisLbl(aO,r)); } });
      }
      // псевдоним
      cases+=4; const R=resolveScaleId(oldId);
      if(!R || R.id!=='just-intonation' || R.tunedFrom!==tf || R.chordMode!==cm) miss(`alias ${oldId} resolves to ${JSON.stringify(R)}`);
      if(scaleById(oldId)!==M) miss(`scaleById('${oldId}') is not the merged mode`);
      setTonic(keep.t);   // TF1: a view carries its key — identity is compared at the key nv0 was made in
      if(viewOfId(oldId)!==nv0) miss(`viewOfId('${oldId}') is not the view of its preset`);
      applyScaleId(oldId); if(CUR()!==nv0) miss(`applyScaleId('${oldId}') does not make its preset live`);
    }
    cases+=2; if(SCALES_ALL.some(x=>x.id==='ji-adaptive'||x.id==='ji-fixed')) miss('an old Natural mode is still a mode of its own');
    const eu=menuOf('europe').flatMap(g=>g.items.map(({s})=>s.id)); if(eu.filter(id=>id==='just-intonation').length!==1) miss(`Historical Europe lists: ${eu.join(', ')}`);
    console.log(`[scaleprobe F7] 2 presets × 12 tonics × 3 A4 · prices ${nP} · labels ${nL} · differences ${nBad}`);
  } finally { setTonic(keep.t); setARef(keep.a); setScaleId(keep.sc); setTunedFrom(keep.tf); setChordModeSel(keep.cm); }
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe F7] '+m));
  if(!nBad) console.log('[scaleprobe F7] both presets of Just intonation price and label exactly as the two old modes; the old ids open their presets');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F7-починка — P.checkBare(): ГОЛЫЙ ОБЪЕКТ ЛАДА РАВЕН ВИДУ ЕГО РЕЖИМА АККОРДОВ ПО УМОЛЧАНИЮ ═══
   У каждого лада с режимами аккордов: голый объект (без вида — так его берут демо, опоры пробы и всякий, кто читает лад напрямую) против
   вида с ПЕРВЫМ режимом набора (у лада с «строй от» — от C: голый объект настроен от C). Поля аккордов (сборка, палитра, правило, сетка,
   схема имён ступеней), и × 12 тоник × регистры 0..3: соло и бас по каждой ступени, каждая нота аккорда — каждого типа палитры и без
   типа, с септаккордом и без; подписи ступеней и центы. Сверка ===. Тоника возвращается в finally. */
export function checkBare(){
  const bad=[]; let nBad=0, cases=0, nModes=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const J=x=>JSON.stringify(x), keepT=tonic;
  try{
    for(const s of SCALES){ if(!s.chordModes) continue; nModes++;
      const cm=s.chordModes[0].id, v=keyless(scaleView(s, s.tunable ? 0 : 'T', cm)), w=`${s.id} (default «${cm}»)`;
      for(const [f,a,b] of [['chord build',chordBuildOf(s),chordBuildOf(v)],['palette',s.typedChords,v.typedChords],['rule',J(s.chordRule),J(v.chordRule)],
                            ['grid',!!s.gridChords,!!v.gridChords]]){ cases++; if(a!==b) miss(`${w}: ${f} — bare ${a}, default view ${b}`); }
      const types=chordFams(v).map(fm=>fm.types.map(x=>x.iv)).flat(), n=s.iv.length;
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        cases++; if(namingOf(s).deg!==namingOf(v).deg) miss(`${w}: degrees named ${namingOf(s).deg} bare, ${namingOf(v).deg} by the default view`);
        for(let d=0;d<=n;d++){ cases+=2; if(RP.noteLbl(d,s)!==RP.noteLbl(d,v)) miss(`${w} tonic ${tn}: degree ${d} label "${RP.noteLbl(d,s)}" bare, "${RP.noteLbl(d,v)}" default`);
          if(centsOf(d,s)!==centsOf(d,v)) miss(`${w} tonic ${tn}: degree ${d} cents ${centsOf(d,s)} bare, ${centsOf(d,v)} default`); }
        for(let o=0;o<4;o++) for(let d=0;d<=n;d++){ cases+=2;
          if(leadFreq(d,o,s)!==leadFreq(d,o,v)) miss(`${w} tonic ${tn}: lead degree ${d} reg ${o}`);
          if(bassFreq(d,o,s)!==bassFreq(d,o,v)) miss(`${w} tonic ${tn}: bass degree ${d} reg ${o}`);
          if(d<n) for(const sev of [false,true]) for(const ty of [null,...types]){ cases++;
            const A=J(chordNotes(d,o,s,sev,ty).map(x=>[x.f,x.iv])), B=J(chordNotes(d,o,v,sev,ty).map(x=>[x.f,x.iv]));
            if(A!==B) miss(`${w} tonic ${tn}: chord ${ty?'['+ty+']':'untyped'}${sev?' 7th':''} degree ${d} reg ${o} — bare ${A.slice(0,90)}, default ${B.slice(0,90)}`); } } }
    }
  } finally { setTonic(keepT); }
  console.log(`[scaleprobe bare] modes with chord modes ${nModes} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe bare] '+m));
  if(!nBad) console.log('[scaleprobe bare] every mode with chord modes prices and labels on its own exactly as its default chord mode');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F8 — P.checkRootAlone(): НА КОРНЕ, ГДЕ ВЫБРАННОГО ТИПА НЕТ В СТРОЕ, ЗВУЧИТ ОДИН КОРЕНЬ ═══
   (1) ПРАВИЛО по всему пространству: каждый вид (лад × «строй от» × режим аккордов) с палитрой, каждый тип палитры, каждый корень
   (индекс 0..размер строя): scales.chordAtRoot = тип, если chordTypeFits, иначе ровно однонотная форма вида (chordUnit) — по значению; и
   однонотная форма сама всегда «ложится». Ограничение — только у видов, где тест что-то отвергает (сегодня Партч «Как на инструменте»).
   (2) ЗАПИСЬ (нужна песня P.seed): засеянный щипок в Партче «Как на инструменте» (доля 116, тип О на 21/20) — однонотный аккорд в форме вида,
   его единственная нота — на высоте корня (chordPitchHz — высота строя в регистре аккордов, независимо от chordUnit); тот же щипок в
   «Свободно» (доля 124) — целый тип О, три ноты. */
export function checkRootAlone(){
  const bad=[]; let nBad=0, cases=0, song=0, restricted=0, alone=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const J=x=>JSON.stringify(x);
  for(const [s0,tf] of allViews()) for(const cm of (s0.chordModes ? s0.chordModes.map(m=>m.id) : [undefined])){
    const v=scaleView(s0,tf,cm); if(!v.typedChords) continue;
    const T=tuningOf(v), N=T.equal!=null ? T.equal : T.cents.length, unit=chordUnit(v); let cut=0;
    cases++; if(!chordTypeFits(unit,0,v)) miss(`${viewIdOf(v)}: the one-note form itself does not fit`);
    for(const f of chordFams(v)) for(const ty of f.types) for(let ti=0;ti<=N;ti++){ cases++;
      const fit=chordTypeFits(ty.iv,ti,v), got=chordAtRoot(ty.iv,ti,v), want= fit ? ty.iv : unit;
      if(J(got)!==J(want)) miss(`${viewIdOf(v)} type ${L(ty.label)} root ${ti}: ${J(got)}, expected ${J(want)}`);
      if(!fit){ cut++; alone++; } }
    if(cut) restricted++;
  }
  const evAt=(cm,t)=>events.find(e=>e.fn==='chOn' && e.t===t && e.sc && e.sc.id==='partch-43' && e.sc.chordMode===cm && !e.jam);
  const ei=evAt('instrument',116), ef=evAt('free',124);
  if(!ei || !ef) miss('the seeded F8 pinches are not in the song — run await P.seed({replace:true})');
  else{ song=2; cases+=4;
    const ni=chordNotesAt(ei.a.ti,ei.a.oct,ei.sc,ei.sev,ei.a.ty), root=chordPitchHz(ei.a.ti-ei.sc.root,ei.a.oct,ei.sc);
    if(J(ei.a.ty)!==J(chordUnit(ei.sc))) miss(`As on the instrument, beat 116: stored type ${J(ei.a.ty)}, expected the one-note form ${J(chordUnit(ei.sc))}`);
    if(ni.length!==1 || ni[0].f!==root) miss(`As on the instrument, beat 116: sounds ${J(ni.map(x=>x.f))}, expected the root alone at ${root} Hz`);
    const nf=chordNotesAt(ef.a.ti,ef.a.oct,ef.sc,ef.sev,ef.a.ty), O=chordFams(ef.sc)[0].types[0].iv;
    if(J(ef.a.ty)!==J(O)) miss(`Free, beat 124: stored type ${J(ef.a.ty)}, expected the whole type ${J(O)}`);
    if(nf.length!==O.length) miss(`Free, beat 124: sounds ${nf.length} notes, expected ${O.length}`); }
  console.log(`[scaleprobe F8] views with a palette checked · views that restrict ${restricted} · root-alone cases ${alone} · seeded pinches ${song} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe F8] '+m));
  if(!nBad) console.log('[scaleprobe F8] a type that does not fit sounds the root alone, by the one rule, and is stored as a one-note chord; Free sounds the whole type');
  return { cases, song, total:nBad, differences:bad };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:480, name:'F8 root alone', run:()=>checkRootAlone(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:490, name:'bare mode = default chord mode', run:()=>checkBare(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ at:500, name:'F7 Just intonation merge', run:()=>checkMerge(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ at:510, name:'F6b user chord modes', run:()=>checkUserChordModes(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ at:520, name:'F6 user files: deletion keeps recordings', run:()=>checkUserDelete(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ at:530, name:'F3 naming as data', run:()=>checkNames(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), slow:true });
row({ at:590, name:'F0 scale data snapshot', run:()=>checkFiles(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, status: r.noSnap ? 'no snapshot yet' : undefined }), slow:true });
