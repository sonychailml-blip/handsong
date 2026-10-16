/* ═══ ⛳ ЗАГРУЗЧИК ДАННЫХ ЛАДОВ (слайс F5 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══
   Данные ладов — ФАЙЛЫ в data/ (форма v1: index.json — манифест, menu.json, по файлу на строй, лад, палитру и набор режимов аккордов;
   комментарии к ним — data/README.md). scales.js ждёт loadScaleData() ВЕРХНЕУРОВНЕВЫМ await до того, как кто-либо прочтёт лады: каждый
   модуль, импортирующий scales.js (прямо или через другой модуль), ждёт вместе с ним, и все синхронные читатели остаются как были.
   ПОРЯДОК: манифест → menu.json и ВСЕ файлы параллельно (Promise.allSettled) → проверка: строи, затем палитры, наборы режимов, лады (лад
   ссылается на строй, палитру и набор — они проверяются раньше). Возвращает объект той же формы, что был у scaledata.js (F2–F4):
   {manifest, menu, tunings, palettes, chordModeSets, modes} — в списках манифеста ТОЛЬКО прошедшие проверку записи.
   ⛳ ПРОВЕРКА КАЖДОГО ФАЙЛА: форма (format, version, id = имя в манифесте, известные ключи), типы и диапазоны; высоты по возрастанию в
   пределах периода (первая — 0¢); отношение и центы согласны — до половины последнего записанного знака центов (у таблиц с целыми
   центами, как 22 шрути, — до 0.5¢; у записанных до сотых — до 0.005¢); ступени лада — целые, по возрастанию, в одном периоде от корня,
   корень среди них; палитра по виду согласна со строем (отношения — у таблицы или у лада, строящего аккорды «адаптивно», в каждом режиме
   аккордов; шаги — у равного строя или у таблицы с сеткой chords.grid); переопределения режимов аккордов — только build, palette, rule;
   id уникальны. СЛОМАННЫЙ ФАЙЛ ПРОПУСКАЕТСЯ — одна строка в консоли и общее известие на стартовой карточке (ui/main читают loadReport);
   лады пропущенного строя (палитры, набора) пропускаются с ним. Стартовый лад не загрузился — берётся первый годный.
   ⛳ ПРИЛОЖЕНИЕ ЗАПУСКАЕТСЯ ВСЕГДА: не читается манифест или меню, или не осталось ни одного лада — АВАРИЙНАЯ ПАРА (12-равный строй и
   хроматика, с её палитрой) из данных ниже, через ТУ ЖЕ проверку.
   ⛳ F6 — ФАЙЛЫ ПОЛЬЗОВАТЕЛЯ (userstore.js: IndexedDB, иначе store) грузятся ПОСЛЕ встроенных (и после аварийной пары, если до неё
   дошло) ТОЙ ЖЕ проверкой, в том же порядке зависимостей — строи, палитры, наборы режимов, лады; ссылаться можно и на встроенные, и на
   свои. id файла пользователя — в своём пространстве: «u.<uuid>» (USER_ID); иное id или id, уже занятое (встроенным или другим файлом
   пользователя иного вида), — отказ. Сломанный файл пользователя пропускается со строкой в консоли и в общем известии и НИКОГДА не
   останавливает встроенные. checkRecord — та же проверка для установки из консоли (userfiles.js) против ЖИВОГО набора.
   ⛔ Нижний слой: DOM не трогает (известие показывает main по loadReport). Из приложения импортирует только userstore — цикла нет.
   ⚠️ Сервис-воркер (sw.js) по-прежнему ничего не кэширует: файлы данных приходят из сети при каждом запуске (запрос с cache:'no-cache' —
   условный, неизменный файл отвечает 304). Офлайн приложение не работает и без этого (MediaPipe — с CDN). */
import { userAll } from './userstore.js';   // F6: файлы пользователя
const BASE=new URL('../data/', import.meta.url);
export const loadReport={ ms:0, files:0, problems:[], emergency:false, user:0 };   // user — сколько файлов пользователя принято (F6)   // итог загрузки — читают main (известие) и консоль

import { F, Bad, CM_MAX, checkManifest, checkMenu, checkTuning, checkPalette, checkChordModes, checkMode, upgrade } from './core/format.js';   // FMT1: validators and the envelope rules (pure core)
import { USER_ID } from './core/registry.js';   // FMT1: the id spaces (pure core)
export { CM_MAX, USER_ID };   // FMT1: moved to core/; re-exported for their readers

/* ---- сборка набора из прочитанного: проверка, пропуски, единственность ---- */
function assemble(man, menu, got, problems){
  const D={ manifest:{ format:man.format, version:man.version, start:man.start, tunings:[], modes:[], palettes:[], chordModeSets:[] },
            menu, tunings:{}, palettes:{}, chordModeSets:{}, modes:{} };
  const skip=(file,why)=>{ problems.push({file,why}); console.warn(`[scales] skipped data/${file} — ${why}`); };
  const pass=(list, folder, sect, check)=>{ const seen=new Set();
    for(const id of man[list]){ const file=`${folder}/${id}.json`;
      if(seen.has(id)){ skip(file,'listed twice in index.json'); continue; } seen.add(id);
      const g=got[file]; if(!g || g.err){ skip(file, g ? g.err : 'not read'); continue; }
      try{ const v=upgrade(g.val); check(v,id); D[sect][id]=v; D.manifest[list].push(id); } catch(e){ skip(file, e instanceof Bad ? e.message : String(e)); } } };   // FMT1: an older version is migrated first (none yet: v1 → the same object)
  const ctx={ tunings:D.tunings, palettes:D.palettes, chordModeSets:D.chordModeSets, menu, trads:new Set(menu.traditions.map(t=>t.id)) };
  pass('tunings','tunings','tunings', checkTuning);
  pass('palettes','palettes','palettes', checkPalette);
  pass('chordModeSets','chordmodes','chordModeSets', (x,id)=>checkChordModes(x,id,D.palettes));
  pass('modes','modes','modes', (x,id)=>checkMode(x,id,ctx));
  if(!D.modes[D.manifest.start] && D.manifest.modes.length){ D.manifest.start=D.manifest.modes[0];
    console.warn(`[scales] start mode "${man.start}" is not loaded — starting on "${D.manifest.start}"`); }
  return D;
}
const fileList=man=>[...man.tunings.map(i=>`tunings/${i}.json`), ...man.palettes.map(i=>`palettes/${i}.json`),
                     ...man.chordModeSets.map(i=>`chordmodes/${i}.json`), ...man.modes.map(i=>`modes/${i}.json`)];
async function readJSON(rel){ const r=await fetch(new URL(rel,BASE),{cache:'no-cache'}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }

/* ---- аварийная пара: 12-равный строй и хроматика (с её палитрой) — копия записей edo12, chromatic, chrom12 из data/ ---- */
const EMERGENCY={"manifest":{"format":"handsong/manifest","version":1,"start":"chromatic","tunings":["edo12"],"modes":["chromatic"],"palettes":["chrom12"],"chordModeSets":[]},"menu":{"format":"handsong/menu","version":1,"traditions":[{"id":"common","name":{"en":"Familiar","ru":"Привычное"}}],"groups":{"chromatic":{"en":"Chromatic","ru":"Хроматика"}}},"tunings":{"edo12":{"format":"handsong/tuning","version":1,"id":"edo12","name":{"en":"12-tone equal temperament","ru":"12-тоновая равномерная темперация"},"period":"2/1","pitches":{"equal":12},"naming":{"scheme":"notes12"},"periodWord":{"short":"reg.oct","full":"reg.octaveFull"},"describe":{"kind":"equal"}}},"palettes":{"chrom12":{"format":"handsong/palette","version":1,"id":"chrom12","kind":"steps","families":[{"id":"maj","name":{"en":"Major","ru":"Мажор"},"finger":0,"types":[{"label":"M","iv":[0,4,7]},{"label":"maj7","iv":[0,4,7,11]},{"label":"7","iv":[0,4,7,10]},{"label":"6","iv":[0,4,7,9]},{"label":"add9","iv":[0,4,7,14]},{"label":"7#9","iv":[0,4,7,10,15]}]},{"id":"min","name":{"en":"Minor","ru":"Минор"},"finger":1,"types":[{"label":"m","iv":[0,3,7]},{"label":"m7","iv":[0,3,7,10]},{"label":"m6","iv":[0,3,7,9]},{"label":"mM7","iv":[0,3,7,11]},{"label":"m9","iv":[0,3,7,10,14]},{"label":"madd9","iv":[0,3,7,14]}]},{"id":"dim","name":{"en":"Dim./Aug.","ru":"Ум./Ув."},"finger":2,"types":[{"label":"dim","iv":[0,3,6]},{"label":"m7b5","iv":[0,3,6,10]},{"label":"dim7","iv":[0,3,6,9]},{"label":"aug","iv":[0,4,8]},{"label":"aug7","iv":[0,4,8,10]},{"label":"augM7","iv":[0,4,8,11]}]},{"id":"sus","name":{"en":"Sus & extended","ru":"Sus и расшир."},"finger":3,"types":[{"label":"sus2","iv":[0,2,7]},{"label":"sus4","iv":[0,5,7]},{"label":"7sus4","iv":[0,5,7,10]},{"label":"6/9","iv":[0,4,7,9,14]},{"label":"maj9","iv":[0,4,7,11,14]},{"label":"13","iv":[0,4,7,10,21]}]}]}},"chordModeSets":{},"modes":{"chromatic":{"format":"handsong/mode","version":1,"id":"chromatic","tuning":"edo12","name":{"en":"Chromatic (12 notes)","ru":"Хроматика (12 нот)"},"menu":{"tradition":"common","group":"chromatic"},"degrees":[0,1,2,3,4,5,6,7,8,9,10,11],"root":0,"anchor":{"policy":"tonic"},"chords":{"rule":{"kind":"palette"},"palette":"chrom12"}}}};

function emergency(problems, why){
  console.warn(`[scales] scale data could not be loaded (${why}) — starting with the emergency pair: 12-equal and chromatic`);
  const E=EMERGENCY, got={};
  for(const f of fileList(E.manifest)){ const [folder,name]=f.split('/'), id=name.replace(/\.json$/,'');
    const rec=folder==='tunings'?E.tunings[id]:folder==='palettes'?E.palettes[id]:folder==='chordmodes'?E.chordModeSets[id]:E.modes[id];
    got[f]={val:JSON.parse(JSON.stringify(rec))}; }
  checkManifest(E.manifest); checkMenu(E.menu);   // та же проверка; брошенное здесь — ошибка самого кода, а не данных
  const D=assemble(E.manifest, E.menu, got, []);
  loadReport.emergency=true; loadReport.problems=problems;
  return D;
}

async function loadBuiltins(problems){
  let man, menu;
  try{ man=await readJSON('index.json'); checkManifest(man); }
  catch(e){ problems.push({file:'index.json', why:e.message||String(e)}); return { D:emergency(problems,'index.json: '+(e.message||e)), n:0 }; }
  const files=['menu.json', ...fileList(man)];
  const res=await Promise.allSettled(files.map(readJSON));
  const got={}; files.forEach((f,i)=>{ got[f]= res[i].status==='fulfilled' ? {val:res[i].value} : {err:(res[i].reason && res[i].reason.message) || 'not read'}; });
  try{ menu=got['menu.json'].val; if(got['menu.json'].err) throw new Error(got['menu.json'].err); checkMenu(menu); }
  catch(e){ problems.push({file:'menu.json', why:e.message||String(e)}); return { D:emergency(problems,'menu.json: '+(e.message||e)), n:files.length+1 }; }
  const D=assemble(man, menu, got, problems);
  if(!D.manifest.modes.length) return { D:emergency(problems,'no mode could be loaded'), n:files.length+1 };
  return { D, n:files.length+1 };
}
export async function loadScaleData(){
  const t0=performance.now(), problems=[];
  const { D, n }=await loadBuiltins(problems);
  loadReport.user=await addUserFiles(D, problems);   // F6: после встроенных; ошибки — только пропуски, встроенным не мешают
  loadReport.problems=problems;
  return finish(D, t0, n);
}

/* ═══ F6 — ФАЙЛЫ ПОЛЬЗОВАТЕЛЯ ═══ */
export const KINDS=[['tuning','tunings','tunings'],['palette','palettes','palettes'],['chordmodes','chordModeSets','chordModeSets'],['mode','modes','modes']];   // вид → раздел набора, список манифеста — в порядке зависимостей
const FORMAT_KIND={ [F.tuning]:'tuning', [F.palette]:'palette', [F.chordmodes]:'chordmodes', [F.mode]:'mode' };
export const kindOfRecord=rec=> rec && FORMAT_KIND[rec.format] || null;
const sectOf=kind=>KINDS.find(k=>k[0]===kind)[1];
/* Кто уже держит id (любой вид) — для единственности. → вид или null. */
export function idHolder(D,id){ for(const [kind,sect] of KINDS) if(D[sect][id]) return kind; return null; }
/* ⛳ Та же проверка, что у файлов data/, для ОДНОЙ записи против набора D (живого или собираемого). → null или причина словами. */
export function checkRecord(kind, rec, D){
  try{
    const ctx={ tunings:D.tunings, palettes:D.palettes, chordModeSets:D.chordModeSets, menu:D.menu, trads:new Set(D.menu.traditions.map(t=>t.id)) };
    if(kind==='tuning') checkTuning(rec, rec && rec.id);
    else if(kind==='palette') checkPalette(rec, rec && rec.id);
    else if(kind==='chordmodes') checkChordModes(rec, rec && rec.id, D.palettes);
    else if(kind==='mode') checkMode(rec, rec && rec.id, ctx);
    else return 'unknown kind of file (format must be handsong/tuning, handsong/mode, handsong/palette or handsong/chordmodes)';
    return null;
  }catch(e){ return e instanceof Bad ? e.message : String(e && e.message || e); }
}
/* SONG1: records a song brings, checked in order (dependencies first) against the live set D plus the list's earlier records — the same
   validator as data/ files. → null or the first reason in words. Changes nothing. */
export function checkRecordList(list, D){
  const O={ ...D, tunings:{ ...D.tunings }, palettes:{ ...D.palettes }, chordModeSets:{ ...D.chordModeSets }, modes:{ ...D.modes } };
  for(const [kind,rec] of list){ if(!USER_ID.test(String(rec && rec.id))) return `${kind} «${rec && rec.id}»: a user record id must be u.<uuid>`;
    if(kindOfRecord(rec)!==kind) return `${kind} «${rec.id}»: not a ${kind} record`;
    const why=checkRecord(kind, rec, O); if(why) return `${kind} «${rec.id}»: ${why}`; O[sectOf(kind)][rec.id]=rec; }
  return null;
}
async function addUserFiles(D, problems){
  const all=await userAll(); let ok=0;
  const skip=(e,why)=>{ problems.push({file:`user ${e.kind} ${e.id}`, why, user:true}); console.warn(`[scales] skipped user file ${e.kind} "${e.id}" — ${why}`); };
  for(const [kind,sect,list] of KINDS) for(const e of all){ if(e.kind!==kind) continue;
    if(!USER_ID.test(String(e.id))){ skip(e,'a user file id must be u.<uuid>'); continue; }
    if(kindOfRecord(e.rec)!==kind || e.rec.id!==e.id){ skip(e,'the stored record does not match its kind or id'); continue; }
    const h=idHolder(D,e.id); if(h){ skip(e,`the id is already used by a ${h}`); continue; }
    const rec=upgrade(e.rec), why=checkRecord(kind, rec, D); if(why){ skip(e,why); continue; }   // FMT1: migrate first
    D[sect][e.id]=rec; D.manifest[list].push(e.id); ok++;
  }
  return ok;
}
function finish(D, t0, n){
  loadReport.ms=Math.round(performance.now()-t0); loadReport.files=n;
  console.log(`[scales] ${D.manifest.modes.length} modes, ${D.manifest.tunings.length} tunings from ${n} files in ${loadReport.ms} ms`
    +(loadReport.user ? ` · ${loadReport.user} user file(s)` : '')+(loadReport.problems.length ? ` · ${loadReport.problems.length} skipped` : '')+(loadReport.emergency ? ' · EMERGENCY PAIR' : ''));
  return D;
}
