/* ⛳ ДЕМО-ПЕСНИ — КОНСОЛЬНЫЙ ЗАГРУЗЧИК, НЕ ЧАСТЬ ИГРЫ. Никто в приложении его не импортирует: модуль лениво грузит проба
   (src/scaleprobe.js), из консоли открытого приложения (звук запущен — ▶ Играть):
     const P = await import(new URL('src/scaleprobe.js', location.href).href);   // или ?probe в адресе — P уже на window
     await P.song('triphop', {replace:true})
   ⛔ ЗАМЕНЯЕТ ТЕКУЩУЮ ПЕСНЮ (как P.seed): на непустой песне без {replace:true} — отказ; во время записи, игры транспорта или при
   открытом редакторе — отказ. Детерминирована: одна и та же пьеса при каждом вызове (гуманизация движка на атаке — его, а не песни).
   ⛳ ПИШЕТ ТОЛЬКО ЧЕРЕЗ ВОРОНКИ РЕКОРДЕРА — тот же образец, что P.seed:
     • ноты — recorder.seedTake (push: маршрут по источнику роль + тембр + вид строя, номер взятого, ключи, индекс в строе);
       ОДНО ВЗЯТОЕ НА РОЛЬ — и это не вкус: цепь эффектов принадлежит РОЛИ, а снимок взятого правит своей ролью с первой доли взятого
       (fxLaneMerge, «одна сеть на владельца»). Две дорожки одной роли в РАЗНЫХ взятых дрались бы за одну цепь — снимок позднего
       взятого сбросил бы автоматику раннего. Одно взятое — один снимок и одна лента на роль, и дорожки роли её делят мирно.
       Дорожки одной роли в разных видах строя (аккорды минора, пентатоники и натурального строя) — шаги несут fz {sc, sev}, а
       маршрут по строю разводит их по дорожкам сам;
     • цепи и автоматизация — функции РЕДАКТОРА (autChainRemove/autChainAdd, autAddPoint, autShapePoint): снимок цепи взятого — это
       живая цепь на миг записи, то есть ЧУЖАЯ раскладка; шинные эффекты в нём заменяются своими (с умолчаниями модуля), величины
       ставятся точками ленты на первой доле взятого. Голосовые модули (яркость, скольжение, скаляры соло) не снимаются: их величины —
       в нотах, снятие стёрло бы их из нот;
     • распад последнего аккорда — правки редактора одной ноты (editResizeChordNote, editResizeSeg);
     • дрон — подложка (loadJam, гармония «дрон»).
   Руками не пишется ни одного события. Живые тоника (D), эталон A4 (440), темп (84), размер (4) и лад (натуральный минор) ставятся
   ЧЕРЕЗ ЭЛЕМЕНТЫ ПАНЕЛИ (их же обработчики — панель не расходится с состоянием) и ОСТАЮТСЯ: тональность пьесы — живая (правило #7 —
   лад заморожен в событии, тоника — нет), дрон берёт живой лад. Септаккорд — у каждого события свой (fz.sev), живой не трогается.
   ⚠️ DOM здесь трогается (элементы панели) — модуль консольный, не нижний слой (правило #5 — про audio/arrange/recorder). */
import { scaleById, scaleView, chordFams, chordNotesAt, viewIdOf, periodOf, viewOfId } from './scales.js';   // F1: лад по id
import { tonic, aRef, setTonic, setARef } from './state.js';
import { events, loop, recording, seedTake, clearRec, setLoopMetre, setLoopBpm, editOpen, editClose, editIsOpen,
         editResizeChordNote, editResizeSeg, autChainOf, autChainAdd, autChainRemove, autAddPoint, autShapePoint,
         loadJam, setRegionOn, panic, songNotes, songSegs, laneRoleOf, laneTimbreOf } from './recorder.js';
import { FX_FACTORY, timbresOf } from './audio.js';
import { CHORD_POOL_N, LEAD_POOL_N, BASS_POOL_N } from './config.js';
import { tutorSetScale } from './ui.js';
import { L } from './i18n.js';

const SONGS={ triphop:buildTripHop };
export const songNames=()=>Object.keys(SONGS);

/* ═══ ОБЩЕЕ ═══ */
const SID=id=>{ if(!scaleById(id)) throw new Error('no scale '+id); return id; };   // id — стабильный (T0), не имя (правило #25); F1: им и адресуем
const VIEW=id=>viewOfId(SID(id));   // F7: по id или ПСЕВДОНИМУ — 'ji-adaptive' открывает Натуральный строй с предустановкой «следует за тоникой + Свободно»
const B=(bar,x=0)=>(bar-1)*4+x;                       // песенная доля: такт (с 1) и доля в такте (размер 4)
/* Величина параметра в ЕГО единицах → 0..1 по объявлению модуля (min/max/curve) — та же шкала, что у полосы и захвата. */
function n01(fxId,pKey,val){
  const sp=((FX_FACTORY[fxId]&&FX_FACTORY[fxId].params)||[]).find(p=>p.key===pKey);
  if(!sp) throw new Error(`no parameter ${fxId}:${pKey}`);
  const x= sp.curve==='log' ? Math.log(val/sp.min)/Math.log(sp.max/sp.min) : (val-sp.min)/(sp.max-sp.min);
  return Math.max(0,Math.min(1,x));
}
const sm=u=>{ u=Math.max(0,Math.min(1,u)); return u*u*(3-2*u); };   // smoothstep — плавный ход без рывка на концах
/* Элемент панели: та же дорожка, что у руки, — обработчик элемента ставит состояние и обновляет панель. Нет элемента — false. */
function uiSet(id,val,evName){
  const el=typeof document!=='undefined' && document.getElementById(id); if(!el) return false;
  el.value=String(val); el.dispatchEvent(new Event(evName)); return true;
}
/* ПАРТИЯ — шаги одной дорожки (роль, тембр, вид строя). id связывает «вкл» с ведениями и «выкл» (как в P.seed). */
let NID=0;
function part(name, role, view, sev, inst){ return { name, role, view, sev, inst, steps:[] }; }
const fzOf=P=>({ sc:P.view, sev:P.sev });
function on(P,fn,a,t,x){ const id=++NID; P.steps.push({ fn, a, t, id, fz:fzOf(P), ...x }); return id; }
function at(P,id,fn,a,t,x){ P.steps.push({ fn, a, t, id, fz:fzOf(P), ...x }); }
function hit(P,a,t){ P.steps.push({ fn:'drum', a, t, fz:fzOf(P) }); }
/* Шаги партии — по времени; на одной доле «выкл» раньше прочего (тот же закон, что у P.seed). Страж порядка ключа в push — по слою:
   несортированная партия сдвинула бы свои ноты. */
const ORD=fn=> /Off$/.test(fn) ? 0 : 1;
const sortPart=P=>P.steps.sort((x,y)=> x.t-y.t || ORD(x.fn)-ORD(y.fn));

/* ═══ ВХОД ═══ */
export async function loadSong(name='triphop', opt={}){
  const build=SONGS[name];
  if(!build){ console.warn(`[song] no song «${name}» — known: ${songNames().join(', ')}`); return null; }
  if(editIsOpen()){ console.warn('[song] the track editor is open — close it first.'); return null; }
  if(recording){ console.warn('[song] recording — stop it first.'); return null; }
  if(loop.on){ console.warn('[song] the transport is playing — stop it first (■ or ⏸).'); return null; }
  if(events.length && !opt.replace){ console.warn(`[song] the song has ${events.length} events — refusing. Run await P.song('${name}', {replace:true}) to replace it.`); return null; }
  console.log(`[song] «${name}» REPLACES the current song (nothing is saved).`);
  return build();
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   «TRIP-HOP» — ОРИГИНАЛЬНАЯ ПЬЕСА. 84 BPM, 4/4, 56 тактов (+ полтакта хвоста реверба) ≈ 2:41. Ре минор натуральный (эолийский).
   Гармония — Dm7 · B♭maj7 · Gm7 · Am7 с вариантами (C7 как оборот VII7–i; в коде — Gm7 · Am7 · B♭maj7 · C7 подъёмом к коде).
   Форма: вступление 1–8 · куплет 9–24 · тема 25–32 · брейк 33–40 · возврат темы 41–52 · кода 53–56.
   Дорожки (по ролям — четыре взятых, см. шапку): пад (минор, «Пад тёплый (долгий)»), стабы эл. пиано (минорная пентатоника — аккорд
   «стопкой» через ступень лада: квартовые D–G–C, F–A–D…), пад брейка (натуральный строй, подвижный: чистые m9/maj9), бас («Синт-бас
   мягкий», ведущая линия со Скольжением), ударные («Стандарт», свинг шестнадцатых, призрачные ноты), терменвокс (соло «Флейта»,
   нота-фраза с бендом: подъезды, портаменто, вибрато, спад), музыкальная шкатулка (соло «Металлофон», мезотон ¼ коммы — фиксированный
   ключ: чуть расстроенная игрушка против равномерного окружения, честная «пыльная» краска жанра), дрон D–A (подложка).
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const SECTIONS=[
  { section:'Intro',        bars:'1–8',   beats:'0–32',    what:'dark pad on the progression, brightness opening by smooth automation, long reverb, D–A drone; no drums' },
  { section:'Verse',        bars:'9–24',  beats:'32–96',   what:'laid-back drums (swung 16th hats, ghost snares), sliding bass in lead mode with Glide, sparse quartal E-piano stabs; pad returns at bar 17, swelling into the theme' },
  { section:'Theme',        bars:'25–32', beats:'96–128',  what:'theremin melody (bends, vibrato, falls); delay feedback rises at the phrase ends (smooth) and cuts back (step)' },
  { section:'Break',        bars:'33–40', beats:'128–160', what:'pad in just intonation (pure m9/maj9) with tremolo; reverb swell; theremin fragments thrown into the delay; meantone music box; drums only a muffled kick (bars 37–40)' },
  { section:'Theme return', bars:'41–52', beats:'160–208', what:'everything together: varied melody climbing to G5, music-box bells, brightness opening wider, rising Gm7–Am7–B♭maj7–C7' },
  { section:'Outro',        bars:'53–56', beats:'208–224', what:'elements leave one by one: drums, bass, theremin; the last pad chord dissolves note by note while its volume fades; the reverb tail rings out' },
];
function buildTripHop(){
  NID=0;
  const say=m=>console.log('[song] '+m), warn=[];
  const ok=(v,what)=>{ if(!v) warn.push(what); return v; };
  /* ---- ЖИВОЕ ОКРУЖЕНИЕ ПЬЕСЫ (остаётся после загрузки — см. шапку) ---- */
  clearRec();
  if(!uiSet('loopMetre',4,'change')) setLoopMetre(4);
  if(!uiSet('bpm',84,'input')) setLoopBpm(84);
  if(tonic!==2 && !uiSet('selTonic',2,'change')) setTonic(2);
  if(aRef!==440 && !uiSet('aRefInput',440,'change')) setARef(440);
  tutorSetScale(SID('natural-minor'));
  const MINOR=VIEW('natural-minor'), PENTA=VIEW('minor-penta'), JI=VIEW('ji-adaptive'), MEAN=VIEW('meantone-quarter');

  /* ---- ГАРМОНИЯ ПО ТАКТАМ (минорные партии; брейк 33–40 — свои аккорды натурального строя) ---- */
  const H=bar=> bar>=53 ? 'D' : bar>=49 ? ['G','A','Bb','C'][bar-49] : (bar>=21&&bar<=24) ? ['D','Bb','G','C'][bar-21] : ['D','Bb','G','A'][(bar-1)%4];
  const PAD_V={ D:[0,1], Bb:[5,0], G:[3,0], A:[4,0], C:[6,0] };   // ступень минора и регистр корня: Dm7 D3–C4, B♭maj7 B♭2–A3, Gm7 G2–F3, Am7 A2–G3, C7 C3–B♭3 — голоса скользят на шаг
  const STACK={ D:0, Bb:1, G:2, A:3, C:null };                   // ступень пентатоники для стопки: D–G–C, F–A–D, G–C–F, A–D–G; на C7 стаб молчит
  const SW=0.055, LB=0.02, LBS=0.015;                            // свинг шестнадцатых (≈61%), «ленивый» снейр (≈14 мс) и стаб (≈11 мс)
  const q16=q=> q/4 + (q%2 ? SW : 0);
  const swx=x=> (Math.round(x*4)%2 ? x+SW : x);                   // доля на нечётной шестнадцатой — со свингом

  /* ════ 1) АККОРДЫ — одно взятое: пад, стабы, пад брейка ════ */
  const pad=part('pad','ch',MINOR,true,4), stab=part('stabs','ch',PENTA,false,3), jip=part('ji pad','ch',JI,false,12);
  const PAD_VOL=0.72, IGN_PAD=['vol','bri','sh','gen'];          // громкость и яркость пада дальше ведёт полоса редактора — проверка их не сравнивает
  const padNote=(b0,b1,off,x={},chk={})=>{ let id=null;
    for(let b=b0;b<b1;b++){ const [d,o]=PAD_V[H(b)], a={deg:d, oct:o, vol:PAD_VOL, ty:null, ...x};
      if(id==null) id=on(pad,'chOn',{...a, inst:pad.inst},B(b),chk); else at(pad,id,'chSet',a,B(b),chk); }
    at(pad,id,'chOff',{...x},off,chk); };
  padNote(1,9,B(9),{},{ign:IGN_PAD});                            // вступление: одна защёлкнутая прогрессия (смены — скольжением голосов, без переатак)
  padNote(17,33,B(33,0.25),{},{ign:IGN_PAD});                    // куплет 2 и тема; «выкл» на четверть доли ПОЗЖЕ входа пада брейка — свои голоса не перехватываются
  padNote(41,53,B(53,0.25),{},{ign:IGN_PAD});                    // возврат темы
  padNote(53,54,B(57,2),{k:1},{skip:true});                      // кода: свой ключ (k:1) — входит, пока прежний ещё звучит; редактор её распустит (проверка пропускает)
  const STAB_PAT=[[[1.5,.62]], [[1.5,.58],[3.5,.42]], [[0.75,.48],[2.5,.6]], [[1.5,.6]]];
  const stabBar=(b,pat)=>{ const d=STACK[H(b)]; if(d==null) return;
    for(const [x,v] of pat){ const t=B(b,swx(x)+LBS), id=on(stab,'chOn',{deg:d, oct:1, vol:v, inst:stab.inst, ty:null},t); at(stab,id,'chOff',{},t+0.4); } };
  for(let b=9;b<=24;b++) stabBar(b,STAB_PAT[(b-9)%4]);
  for(let b=25;b<=32;b++) stabBar(b,[[2.5,.5]]);
  for(let b=41;b<=52;b++) stabBar(b,STAB_PAT[(b-41)%4]);
  { const F=chordFams(JI), same=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-12);
    const TY=(fam,iv)=>{ const f=F.find(x=>x.id===fam), t=f&&f.types.find(x=>same(x.iv,iv)); if(!t) throw new Error(`no ${fam} chord ${iv}`); return t.iv; };
    const M9=TY('min',[1,6/5,3/2,9/5,9/4]), MAJ9=TY('sus',[1,5/4,3/2,15/8,9/4]), M7=TY('min',[1,6/5,3/2,9/5]), S74=TY('sus',[1,4/3,3/2,9/5]);
    /* Dm9 · B♭maj9 · Gm9 — по два такта, Am7 · A7sus4 — по такту. Чистые отношения от своего корня (натуральный подвижный); корни —
       ступени строя от тоники D (полутоны: 0, 8, 5, 7). Соседние аккорды — через ключ (k 0/1) с нахлёстом в четверть доли: пад не
       переатакует голос, который ещё звенит. */
    [[33,2,0,1,M9],[35,2,8,0,MAJ9],[37,2,5,0,M9],[39,1,7,0,M7],[40,1,7,0,S74]].forEach(([bar,len,d,o,ty],i)=>{
      const k= i%2 ? {k:1} : {}, id=on(jip,'chOn',{deg:d, oct:o, vol:.64, inst:jip.inst, ty, bri:.4, ...k},B(bar));
      at(jip,id,'chOff',{...k},B(bar+len,0.25)); }); }

  /* ════ 2) БАС — одно взятое: ведущая линия фразами по 4 такта, смены высоты — скольжением (Скольжение — в карте каждой ноты) ════ */
  const bass=part('bass','bs',MINOR,false,5);
  const GL=s=>({ 'glide:time':n01('glide','time',s) });
  const FIG={ D:[[0,0,1,.08,.86],[2.5,0,0,.22,.8],[3.0,0,1,.14,.8],[3.5,6,0,.06,.76]],   // D2, нырок на октаву, обратно, C2 — шаг к B♭
              Bb:[[0,5,0,.06,.86],[2.5,6,0,.08,.78],[3.25,5,0,.06,.76]],
              G:[[0,3,0,.08,.86],[1.75,3,1,.18,.78],[2.25,3,0,.15,.8],[3.5,5,0,.06,.76]],   // G1, подъезд на октаву и обратно, B♭1 — полутон к A1
              A:[[0,4,0,.06,.86],[2.0,6,0,.1,.78],[2.75,4,0,.08,.78],[3.5,6,0,.08,.76]],
              C:[[0,6,0,.08,.86],[2.5,5,0,.1,.78],[3.25,6,0,.08,.78]] };   // [доля, ступень, регистр, скольжение (с), громкость]
  const phrase=b0=>{ let id=null;
    for(let b=b0;b<b0+4;b++) for(const [x,d,o,g,v] of FIG[H(b)]){ const a={deg:d, oct:o, vol:v, fx:GL(g)};
      if(id==null) id=on(bass,'bassOn',{...a, inst:bass.inst},B(b,x)); else at(bass,id,'bassSet',a,B(b,x)); }
    at(bass,id,'bassOff',{},B(b0+4,-0.25)); };
  [9,13,17,21,25,29,41,45,49].forEach(phrase);
  { const id=on(bass,'bassOn',{deg:0, oct:0, vol:.74, inst:bass.inst, fx:GL(.08)},B(39));   // брейк: низкое D1 под A-аккордами, длинный подъезд на октаву к возврату темы
    at(bass,id,'bassSet',{deg:0, oct:1, vol:.8, fx:GL(.45)},B(40,2.5)); at(bass,id,'bassOff',{},B(41,-0.25)); }
  { const id=on(bass,'bassOn',{deg:0, oct:1, vol:.82, inst:bass.inst, fx:GL(.08)},B(53));   // кода: D2, медленный нырок в D1, затихание — бас уходит вторым
    at(bass,id,'bassSet',{deg:0, oct:0, vol:.78, fx:GL(.5)},B(53,2.5)); at(bass,id,'bassSet',{deg:0, oct:0, vol:.58, fx:GL(.5)},B(54,1)); at(bass,id,'bassOff',{},B(54,3)); }

  /* ════ 3) УДАРНЫЕ — одно взятое: тяжёлый неторопливый бит; громкость каждого удара — его динамика (призраки, акценты хэта) ════ */
  const drm=part('drums','dr',MINOR,false,0), DUST=.72;
  const dr=(b,x,row,vol,bri=DUST)=>hit(drm,{row, vol, kit:0, fx:{'bright:amt':bri}},B(b,x));   // яркость удара — «пыльный» кит
  const groove=(b,{h16=true,clap=false,kv=false,fill=null}={})=>{
    dr(b,q16(0),0,.95); dr(b,q16(3),0,.6); dr(b,q16(10),0,.9); if(kv) dr(b,q16(13),0,.56);   // бочка: 1, «е» первой, «и» третьей (+ подхват)
    dr(b,1+LB,1,.88); if(fill!=='tom') dr(b,3+LB,1,.9);                                       // снейр на 2 и 4 — чуть позади
    dr(b,q16(7),1,.26); if(!fill) dr(b,q16(14),1,.2);                                        // призрачные
    if(clap && fill!=='tom') dr(b,3+LB,2,.36);
    for(let q=0;q<16;q++){ if(!h16&&q%2) continue; if(fill&&q>=12) continue;
      dr(b,q16(q),3, q%4===0 ? .52 : q%4===2 ? .42 : (q===7||q===15) ? .32 : .26); }
    if(fill==='tom') [.62,.68,.76,.86].forEach((v,i)=>dr(b,q16(12+i),4,v));
    if(fill==='snare'){ dr(b,q16(14),1,.5); dr(b,q16(15),1,.72); } };
  for(let b=9;b<=16;b++) groove(b,{h16:false, kv:b%4===0});
  for(let b=17;b<=23;b++) groove(b,{kv:b%4===0});
  groove(24,{fill:'tom'});
  dr(25,0,5,.62); for(let b=25;b<=31;b++) groove(b,{clap:true, kv:b%4===0});
  groove(32,{clap:true, fill:'snare'});
  for(let b=37;b<=39;b++){ dr(b,0,0,.8,.3); dr(b,q16(10),0,.62,.3); }                       // брейк: только приглушённая бочка
  [[0,.7,.3],[1,.72,.38],[2,.76,.46],[3,.8,.54],[3.5,.6,.6],[3.75,.7,.66]].forEach(([x,v,br])=>dr(40,x,0,v,br));   // разгон в возврат: бочка открывается
  dr(41,0,5,.66); for(let b=41;b<=51;b++) groove(b,{clap:true, kv:b%4===0});
  groove(52,{clap:true, fill:'tom'});
  dr(53,0,0,.92); dr(53,0,5,.6);                                                              // кода: последний удар — ударные уходят первыми

  /* ════ 4) СОЛО — одно взятое: терменвокс и музыкальная шкатулка ════ */
  const thr=part('theremin','ld',MINOR,false,4), box=part('music box','ld',MEAN,false,7);
  const FXL={ 'drv:amt':0.06, 'vib:amt':0, 'trm:amt':0 }, FXB={ 'drv:amt':0, 'vib:amt':0, 'trm:amt':0 };   // карта соло обязана быть: без неё нота звучит ЖИВОЙ цепью соло (правило R2)
  const PC=1200*Math.log2(periodOf(MINOR));                     // центов в периоде лада (октава)
  const cOf=(d,o)=>PC*(o + MINOR.iv[d]/MINOR.edo);               // центы ступени (лад равномерный) — опора кривой бенда
  /* ФРАЗА ТЕРМЕНВОКСА — ОДНА нота с кривой бенда (как пишет живой терменвокс: шаг атаки + центы над ним), ведения hold:true несут
     ближайшую ступень (её читает подсветка) и громкость (подъём и спад фразы). Кривая: подъезд снизу на атаке; переходы между
     ступенями — плавным ходом (портаменто, дольше на больших скачках); вибрато на долгих звуках — вступает с задержкой, глубина
     нарастает, скорость чуть плавает (≈5.3–5.9 Гц); спад в конце фразы. Точки — шагом 0.05 доли, ровные участки прорежены. */
  const theremin=(pts,end,{depth=16,peak=.84,fall=0}={})=>{
    const t0=pts[0][0], segs=pts.map(([t,d,o,g],i)=>{ const dc= i ? Math.abs(cOf(d,o)-cOf(pts[i-1][1],pts[i-1][2])) : 0;
      return { t, d, o, c:cOf(d,o)-cOf(pts[0][1],pts[0][2]), g: g ?? Math.min(0.32, 0.1+dc/100*0.03) }; });
    const vol=t=>{ const u=(t-t0)/(end-t0); return +(peak-(peak-.62)*(1-sm((t-t0)/1.2))-0.08*u).toFixed(3); };
    const bend=[]; let last=null, ph=0, prevT=t0;
    for(let t=t0; t<=end+1e-9; t+=0.05){
      let i=0; while(i+1<segs.length && segs[i+1].t<=t) i++;
      const S=segs[i], P=i?segs[i-1]:null;
      let c= P && t<S.t+S.g ? P.c+(S.c-P.c)*sm((t-S.t)/S.g) : S.c;           // портаменто
      if(t<t0+0.16) c-=70*(1-sm((t-t0)/0.16));                                // подъезд на атаке
      const a=S.t+S.g, b= i+1<segs.length ? segs[i+1].t : end;
      ph+=(t-prevT)*(5.6+0.3*Math.sin(2*Math.PI*(t-t0)/3.1))*60/84; prevT=t;  // фаза вибрато: частота в Гц → в долях (84 BPM)
      if(b-a>0.55 && t>a+0.25) c+=depth*sm((t-a-0.25)/0.7)*Math.min(1,(b-t)/0.12)*Math.sin(2*Math.PI*ph);
      if(fall && t>end-0.4) c-=fall*sm((t-(end-0.4))/0.4);                    // спад в конце фразы
      c=Math.round(c*10)/10;
      if(last==null || Math.abs(c-last)>=0.4 || t+0.05>end){ bend.push({ dt:Math.round((t-t0)*10000)/10000, c }); last=c; }
    }
    const id=on(thr,'leadOn',{deg:pts[0][1], oct:pts[0][2], vol:vol(t0), inst:thr.inst, fx:FXL, bend},t0);
    const sets=[];
    segs.forEach((S,i)=>{ if(i) sets.push({ t:S.t+S.g/2, i }); });
    for(let t=t0+0.5; t<end-0.25; t+=0.5) if(!sets.some(s=>Math.abs(s.t-t)<0.1)) sets.push({ t, i:-1 });
    sets.sort((x,y)=>x.t-y.t);
    for(const s of sets){ let i=0; while(i+1<segs.length && segs[i+1].t+segs[i+1].g/2<=s.t+1e-9) i++;
      at(thr,id,'leadSet',{deg:segs[i].d, oct:segs[i].o, vol:vol(s.t), hold:true, v:0, fx:FXL},s.t); }
    at(thr,id,'leadOff',{v:0},end); };
  // тема (такты 25–32): два периода по две фразы — нижний голос, ответ выше, кульминация на F5, половинная каденция на A4
  theremin([[B(25,.5),4,1],[B(25,2),6,1],[B(25,3.25),4,1],[B(26,1.5),2,1]], B(26,3.25), {fall:60});
  theremin([[B(27,.5),3,1],[B(27,1.5),5,1],[B(27,2.5),0,2],[B(28,1),6,1],[B(28,2),4,1]], B(28,3.75));
  theremin([[B(29,.5),0,2],[B(29,1.5),1,2],[B(29,2.5),2,2],[B(29,3.5),1,2],[B(30,.25),0,2],[B(30,2),6,1]], B(30,3.25), {fall:50});
  theremin([[B(31,.5),5,1],[B(31,1.5),4,1],[B(31,2.5),3,1],[B(32,0),4,1]], B(32,3.5), {fall:90, depth:20});
  // брейк: обрывки — их концы бросаются в делей (полоса соло)
  theremin([[B(34,0),2,2],[B(34,1),1,2]], B(34,2), {peak:.78});
  theremin([[B(36,0),0,2],[B(36,1),4,1,.35]], B(36,2.25), {peak:.78});
  theremin([[B(38,0),6,1],[B(38,.75),5,1],[B(38,1.5),4,1]], B(38,2.5), {peak:.78});
  theremin([[B(40,.5),4,1],[B(40,2),0,2,.4]], B(40,3.5), {peak:.8});
  // возврат темы (41–52): тот же рисунок, выше и шире; подъём к G5 на C7
  theremin([[B(41,.5),4,1],[B(41,1.5),0,2],[B(41,2.5),6,1],[B(41,3.25),4,1],[B(42,1),3,1],[B(42,2),2,1]], B(42,3.25), {fall:50});
  theremin([[B(43,.5),3,1],[B(43,1.25),5,1],[B(43,2),0,2],[B(43,3),2,2],[B(44,1),1,2],[B(44,2),0,2]], B(44,3.75));
  theremin([[B(45,.25),2,2],[B(45,1.25),3,2],[B(45,2.5),2,2],[B(45,3.25),1,2],[B(46,.5),0,2],[B(46,2),6,1]], B(46,3.25), {peak:.9, fall:50});
  theremin([[B(47,.5),5,1],[B(47,1.25),6,1],[B(47,2),0,2],[B(48,0),4,1]], B(48,3.5), {fall:70});
  theremin([[B(49,.5),5,1],[B(49,2),0,2],[B(50,0),6,1],[B(50,2),1,2],[B(51,0),0,2],[B(51,2),2,2],[B(52,0),1,2],[B(52,2),3,2]], B(52,3.75), {peak:.92, depth:22});
  theremin([[B(53,.25),0,2],[B(54,1),4,1,.45]], B(54,3.5), {peak:.8, depth:20, fall:200});   // кода: тоника, спуск на квинту и долгий спад — терменвокс уходит третьим
  /* ШКАТУЛКА — мезотон ¼ коммы, тоника D — КЛЮЧ в сетке, приколоченной к C (fixedKey): ступень — полутон от D. */
  const bell=(t,[d,o],v)=>{ const id=on(box,'leadOn',{deg:d, oct:o, vol:v, inst:box.inst, fx:FXB},t); at(box,id,'leadOff',{v:0},t+0.22); };
  { const POS=[0,1,1.5,2.5,4,5,5.5,6.5], VOL=[.56,.44,.48,.42,.52,.42,.46,.4];
    const BLK=[[33,[[7,2],[3,2],[0,2],[2,2],[7,2],[3,2],[0,2],[10,1]]],    // Dm9:  A5 F5 D5 E5 · A5 F5 D5 C5
               [35,[[7,2],[3,2],[0,2],[10,1],[8,1],[0,2],[3,2],[0,2]]],    // B♭maj9: A5 F5 D5 C5 · B♭4 D5 F5 D5
               [37,[[5,2],[3,2],[0,2],[8,1],[7,2],[5,2],[3,2],[0,2]]],     // Gm9:  G5 F5 D5 B♭4 · A5 G5 F5 D5
               [39,[[2,2],[0,2],[10,1],[7,1],[5,2],[2,2],[0,2],[2,2]]]];   // Am7 → A7sus4: E5 D5 C5 A4 · G5 E5 D5 E5
    for(const [bar,N] of BLK) N.forEach((n,i)=>bell(B(bar,POS[i]),n,VOL[i])); }
  { const BELL={ D:[[7,2],[2,3]], Bb:[[3,3],[7,2]], G:[[0,3],[8,2]], A:[[10,2],[2,3]], C:[[10,2],[5,3]] };   // колокольчики на 1 и «и» третьей — девятые и септимы аккорда
    for(let b=45;b<=52;b++){ const [x,y]=BELL[H(b)]; bell(B(b),x,.42); bell(B(b,2.5),y,.34); }
    bell(B(53),[0,3],.38); bell(B(53,2),[7,2],.28); }             // кода: последний звон — шкатулка уходит вместе с ударными

  /* ════ ЗАПИСЬ: четыре взятых через push ════ */
  const TAKES=[ ['chords: pad, E-piano stabs, just-intonation pad',[pad,stab,jip]], ['bass',[bass]], ['drums',[drm]], ['solo: theremin, music box',[thr,box]] ];
  const rec={ name:'triphop', takes:[], parts:{} };
  for(const [label,parts] of TAKES){
    parts.forEach(sortPart);
    const steps=parts.flatMap(P=>P.steps), r=seedTake(steps);
    if(!r) throw new Error('seedTake refused — start the app (▶ Play) and stop the transport first');
    rec.takes.push({ label, take:r.take, scaleId:MINOR.id,
      steps:steps.map(st=>({ fn:st.fn, t:st.t, a:{...st.a}, sid:st.fz.sc.id, ...(st.ign?{ign:st.ign}:{}), ...(st.skip?{skip:true}:{}) })) });
    /* дорожка партии — по первому «вкл» этого взятого с тем же источником (роль + тембр + вид) */
    for(const P of parts){ const e=events.find(x=>x.tk===r.take && (P.role==='dr' ? x.fn==='drum' : /On$/.test(x.fn) && x.a && x.a.inst===P.inst) && x.sc===P.view);
      rec.parts[P.name]={ layer:e?e.layer:null, take:r.take, t0:Math.min(...P.steps.map(s=>s.t)) }; }
    say(`${label}: take ${r.take}, ${r.events} events → ${parts.map(P=>`${P.name} L${(rec.parts[P.name].layer??-1)+1}`).join(', ')}`);
  }
  const LY=n=>rec.parts[n].layer;

  /* ════ РЕДАКТОР: цепи, автоматизация, распад последнего аккорда ════ */
  /* Цепь роли во взятом: шинные эффекты снимка (живая раскладка на миг записи) — снять; свои — добавить по порядку (умолчания
     модуля); голосовые — лишь добавить, если нет (их величины в нотах). */
  const chain=(layer,want,role)=>{
    for(const id of autChainOf(layer)){ const f=FX_FACTORY[id]; if(f && f.kind!=='voice') ok(autChainRemove(layer,id),`${role}: remove ${id}`); }
    const have=new Set(autChainOf(layer));
    for(const id of want) if(!have.has(id)) ok(autChainAdd(layer,id),`${role}: add ${id}`); };
  /* Точка шинной полосы в ЕДИНИЦАХ параметра; sh 'h' — ступенькой (рез), иначе — плавно от предыдущей точки (отрезок входит в точку). */
  const bus=(layer,list)=>{ for(const [t,fx,p,val,sh] of list){ const pt=ok(autAddPoint(layer,fx,p,t,n01(fx,p,val)),`point ${fx}:${p} @${t}`);
    if(pt && sh==='h' && pt.sh!=='h') ok(autShapePoint({pt}),`step ${fx}:${p} @${t}`); } };
  /* Точка полосы «в ноте» (0..1 шкалы полосы): правит ноты дорожки (pnPlan). cut — сделать входящий отрезок ступенькой. */
  const note=(layer,fx,p,t,v,cut)=>{ const pt=ok(autAddPoint(layer,fx,p,t,v),`note lane ${fx}:${p} @${t}`);
    if(pt && cut) ok(autShapePoint({pt}),`note lane step ${fx}:${p} @${t}`); return pt; };

  const padL=LY('pad'), thrL=LY('theremin'), drL=LY('drums'), bsL=LY('bass');
  if(padL!=null && editOpen(padL)){
    chain(padL,['bright','trmMix','reverb'],'chords');
    bus(padL,[
      [0,'trmMix','depth',0,'h'], [0,'trmMix','rate',2.8,'h'],                                  // тремоло ждёт брейка: глубина 0 — тождество; скорость — восьмые при 84
      [0,'reverb','decay',3.6,'h'], [0,'reverb','tone',3200,'h'], [0,'reverb','mix',0.42,'h'],   // длинная тёмная комната вступления
      [32,'reverb','mix',0.26,'h'],                                                              // куплет суше — рез на сильной доле
      [96,'reverb','mix',0.34,'h'],
      [128,'trmMix','depth',0.7,'h'], [128,'reverb','mix',0.42,'h'], [128,'reverb','decay',3.6],   // брейк: тремоло вкл; разбег разбухания реверба
      [156,'reverb','mix',0.74], [156,'reverb','decay',4.0],                                     // разбухание — плавно
      [160,'trmMix','depth',0,'h'], [160,'reverb','mix',0.34,'h'], [160,'reverb','decay',3.0,'h'], [160,'reverb','tone',4500,'h'],   // возврат — рез, комната светлее
      [208,'reverb','mix',0.34], [208,'reverb','decay',3.0], [216,'reverb','decay',4.0], [220,'reverb','mix',0.62],   // кода: хвост растёт и звенит
    ]);
    /* распад последнего аккорда: септима уходит первой, затем квинта, терция; тоника звучит до конца */
    { const g=songSegs().segs.find(x=>x.layer===padL && x.role==='ch' && x.first && Math.abs(x.start-B(53))<1e-9);
      if(ok(g,'coda chord found')){ const N=chordNotesAt(g.ti,g.oct,g.sc,g.sev,g.ty), top=N.reduce((m,n,i)=>n.f>N[m].f?i:m,0);
        ok(editResizeChordNote(g.ev,top,B(54,2)),'coda: the seventh leaves (dissolve)');
        const C=songSegs().segs.filter(x=>x.layer===padL && x.role==='ch' && Math.abs(x.start-B(53))<1e-9)
          .map(x=>({ x, f:chordNotesAt(x.ti,x.oct,x.sc,x.sev,x.ty)[0].f })).sort((p,q)=>q.f-p.f);
        [[1,B(55,1)],[2,B(56,0)]].forEach(([i,t])=>{ if(ok(C[i],`coda note ${i}`)) ok(editResizeSeg(C[i].x.ev,t),`coda: note ${i} leaves`); }); } }
    /* яркость пада («в ноте», 0 — темно, 1 — открыто): открывается во вступлении, держится, шире на возврате, гаснет в коде.
       Плоский участок перед подъёмом ставится ПОСЛЕ цели подъёма — иначе равная прежней точка была бы лишней и снялась. */
    note(padL,'bright','amt',0,0.04); note(padL,'bright','amt',30,0.5);
    note(padL,'bright','amt',192,0.86); note(padL,'bright','amt',160,0.5);
    note(padL,'bright','amt',222,0.35); note(padL,'bright','amt',208,0.86);
    /* громкость пада: вход куплета-2 тише (рез), разбухание в тему, затухание коды до нуля */
    note(padL,'vol','amt',64,0.5,true); note(padL,'vol','amt',94,0.74);
    note(padL,'vol','amt',224,0); note(padL,'vol','amt',208,0.74);
  } else warn.push('chords: editor did not open');
  if(thrL!=null && editOpen(thrL)){
    chain(thrL,['dly','reverb'],'solo');
    const T0=rec.parts.theremin.t0;
    bus(thrL,[
      [T0,'dly','time',0.536,'h'], [T0,'dly','fb',0.30,'h'], [T0,'dly','mix',0.32,'h'],         // делей — пунктирная восьмая при 84
      [T0,'reverb','decay',2.6,'h'], [T0,'reverb','tone',5500,'h'], [T0,'reverb','mix',0.3,'h'],
      [104,'dly','fb',0.30], [111.5,'dly','fb',0.72], [112.5,'dly','fb',0.30,'h'],              // конец фразы: повторы растут — плавно, затем рез
      [120,'dly','fb',0.30], [127.5,'dly','fb',0.78], [129,'dly','fb',0.6,'h'],
      [129,'dly','mix',0.16,'h'],                                                                // брейк: делей почти закрыт…
      [133.25,'dly','mix',0.9,'h'], [134.5,'dly','mix',0.16,'h'],                               // …и БРОСКИ: конец обрывка — в делей
      [141.5,'dly','mix',0.9,'h'], [142.75,'dly','mix',0.16,'h'],
      [149.75,'dly','mix',0.9,'h'], [151,'dly','mix',0.16,'h'],
      [158.5,'dly','mix',0.9,'h'], [160,'dly','mix',0.32,'h'], [160,'dly','fb',0.32,'h'],
      [168,'dly','fb',0.32], [175.5,'dly','fb',0.7], [176.5,'dly','fb',0.32,'h'],
      [184,'dly','fb',0.32], [191.5,'dly','fb',0.72], [192.5,'dly','fb',0.32,'h'],
      [200,'dly','fb',0.32], [207.5,'dly','fb',0.74], [208.5,'dly','fb',0.55,'h'],
      [208,'dly','mix',0.32], [208,'reverb','mix',0.3], [212,'dly','fb',0.55],
      [215,'dly','mix',0.55], [216,'dly','fb',0.76], [216,'reverb','mix',0.5],                   // кода: последний спад терменвокса уходит в эхо
    ]);
  } else warn.push('solo: editor did not open');
  if(drL!=null && editOpen(drL)){
    chain(drL,['bright','reverb'],'drums');
    const T0=rec.parts.drums.t0;
    bus(drL,[[T0,'reverb','decay',0.8,'h'], [T0,'reverb','tone',7000,'h'], [T0,'reverb','mix',0.16,'h']]);   // короткая комната
  } else warn.push('drums: editor did not open');
  if(bsL!=null && editOpen(bsL)) chain(bsL,['glide'],'bass'); else warn.push('bass: editor did not open');
  editClose();

  /* ════ ПОДЛОЖКА: дрон D–A под всей пьесой; повтор выключен — пьеса играется один раз и встаёт в конце ════ */
  ok(loadJam({prog:0, bass:'none'}),'drone backing');
  setRegionOn(false); panic();                                    // подложка запустила транспорт — ■: тишина, бегунок на начало

  /* ════ ОТЧЁТ ════ */
  report(rec, warn);
  return rec;
}

/* Сколько голосов пулов звучит разом в самом плотном месте (зажатые ноты, без хвостов релиза), и сколько ударов в самой плотной доле. */
function densest(){
  const N=songNotes().notes, starts=[...new Set(N.map(n=>n.start))].sort((p,q)=>p-q);
  let best={ t:0, ch:0, ld:0, bs:0, tot:0 };
  for(const t of starts){ let ch=0, ld=0, bs=0;
    for(const n of N){ if(n.role==='dr' || !(n.start<=t+1e-9 && (n.end==null || n.end>t+1e-9))) continue;
      if(n.role==='ch'){ const h=n.head; ch+=chordNotesAt(h.a.ti,h.a.oct,h.sc,h.sev,h.a.ty).length; } else if(n.role==='ld') ld++; else if(n.role==='bs') bs++; }
    if(ch+ld+bs>best.tot) best={ t, ch, ld, bs, tot:ch+ld+bs }; }
  const D=N.filter(n=>n.role==='dr').map(n=>n.start).sort((p,q)=>p-q); let hits=0, hb=0;
  for(let i=0,j=0;i<D.length;i++){ while(D[i]-D[j]>=1-1e-9) j++; if(i-j+1>hits){ hits=i-j+1; hb=D[j]; } }
  return { ...best, hits, hb };
}
function report(rec, warn){
  console.log('[song] sections:'); console.table(SECTIONS);
  const L0=new Map();
  for(const e of events){ let r=L0.get(e.layer); if(!r) L0.set(e.layer, r={ n:0, sc:null, jam:false }); r.n++; if(e.jam) r.jam=true; if(!r.sc && e.sc && e.fn!=='drum') r.sc=e.sc; }
  const rows=[...L0.keys()].sort((p,q)=>p-q).map(ly=>{ const r=L0.get(ly), role=laneRoleOf(ly), tb=laneTimbreOf(ly);
    const nm= role ? (timbresOf(role).find(x=>x.id===tb)||{}).name : null;
    const part=Object.keys(rec.parts).find(k=>rec.parts[k].layer===ly);
    return { track:'L'+(ly+1), part: part || (r.jam ? 'drone (backing)' : '-'), role: role || '-', timbre: nm!=null ? L(nm) : '-',
             scale: !role||role==='dr' ? '-' : r.sc ? `${L(r.sc.name)} (${viewIdOf(r.sc)})` : '-', events:r.n }; });
  console.log('[song] tracks:'); console.table(rows);
  const d=densest(), bar=t=>Math.floor(t/4)+1;
  const fits= d.ch<=CHORD_POOL_N && d.ld<=LEAD_POOL_N && d.bs<=BASS_POOL_N;
  console.log(`[song] densest moment: bar ${bar(d.t)} (beat ${d.t}) — ${d.tot} pool voices held at once (chords ${d.ch} of ${CHORD_POOL_N}, solo ${d.ld} of ${LEAD_POOL_N}, bass ${d.bs} of ${BASS_POOL_N}), not counting release tails; drums at most ${d.hits} hits in one beat (bar ${bar(d.hb)}). ${fits ? 'Inside the live pools — nothing is frozen.' : 'ABOVE a live pool ceiling — voices will be stolen; freeze the densest track.'}`);
  console.log('[song] note: a take\'s automation follows the audibility of the take\'s FIRST track (pad L1 for the chords, theremin for the solo) — muting it, or soloing another track of that role, plays that role through the live chain.');
  if(warn.length) console.warn('[song] steps that did not apply: '+warn.join('; '));
  console.log(`[song] built ${events.length} events in ${rec.takes.length} takes + the drone backing. Live tonic D, A4 440, 84 BPM, 4/4, scale D natural minor (left set: the key of the piece is live).`);
  console.log('[song] PLAY: press ▶ in the transport — it plays from bar 1 and stops by itself at the end (repeat ⟳ is off). Solo a row with S to hear one track (see the limit on automation in the report); ✎ opens a track with its automation lanes.');
}
