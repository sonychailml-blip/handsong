/* REC5 (stage 3) — WHAT A TAKE CAPTURES AND HOW RECORDINGS DRIVE THE CHAINS: the capture sampling (takeCapStart / takeCapSample, O-2),
   the fine-recording automaton (fineStep / fineKnee), the playback of captured lanes (fxLaneMerge, fxPlayBuild / Drive / Stop, O-3) and the
   live isolation switch (AF5, rule #31) — moved from recorder.js (which re-exports them — a facade). The records themselves live in
   song/capture.js. Moved verbatim; edited lines are marked REC5. */
import { AC, fxCaptureChain, fxCaptureWalk, fxIsPerNote, fxParamKeysOf, fxPlayPath, fxPlaySet, fxRestoreAim } from '../audio.js';
import { curTake, recording } from './record.js';
import { chainKeyOf, chainOwners, fxChainOf, trackChainKeyOf } from '../state.js';
import { FX_CHAIN, fxLaneAt, fxLaneSmooth, takeFx, takeFxVer } from '../song/capture.js';
import { beatsOf, loop, secOf } from '../transport/clock.js';
import { REC_AVG_S, REC_FINE_EPS, REC_HIST_S, REC_JUMP_EPS, REC_KNEE_F, REC_PAUSE_S } from '../config.js';
import { evRole, events } from '../song/store.js';
import { laneAudible, laneGated, laneMute, laneSolo } from '../song/lanes.js';
import { frozen, frzBufNow } from '../freeze/registry.js';

/* Последнее ЗАПИСАННОЕ значение по адресу «ключ|эффект|параметр» — опора прореживания. Живёт ровно
   столько, сколько идёт взятое: на старте засевается снимком, поэтому дорожка держит только ДЕЛЬТЫ. */
let takeFxLast=null;
/* ⛳ И ОТДЕЛЬНО — СОСТАВ ЦЕПИ (порядок id через запятую) НА ВЛАДЕЛЬЦА. Значения параметров его не
   выражают: сними эффект посреди взятого — его параметры просто ПЕРЕСТАНУТ приходить в обход, а это
   неотличимо от «не менялись». Добавь — придут новые, и это видно; убери или ПЕРЕСТАВЬ — не видно ничего.
   ⚠️ ПЕРЕСТАНОВКА СТАЛА СЛЫШНОЙ В O-1 (цепь последовательна), поэтому её пропуск — не мелочь: рендер
   собрал бы дорожку в другом порядке, чем её играли. Сравниваем строку состава на каждом ударе сердца. */
let takeFxOrder=null;
const capReset=()=>{ takeFxLast=null; takeFxOrder=null; };   // REC5: the sampling state's reset from outside (✕ — takeReset)
/* ═══ ЗАХВАТ: ТРИ ОПЕРАЦИИ (O-2) ═══ */
/* СТАРТ ВЗЯТОГО — снимок состава и значений ВСЕХ цепей. Зовётся из ДВУХ мест рождения взятого: ● (onRec)
   и каждый слой подложки (loadArrangement). Подложку захватываем тоже: её рендер обязан быть таким же
   воспроизводимым, как и сыгранного вручную.
   ⚠️ Снимок ЗАСЕВАЕТ опору прореживания — поэтому дорожка ниже держит только то, что РЕАЛЬНО сдвинулось. */
/* SAVE1: the live chains as a capture record (what takeCapStart installs), read only */
function capRecordNow(){ const rec={ kinds:{}, chains:{}, lane:[] }; for(const {key,kind} of chainOwners()){ rec.kinds[key]=kind; rec.chains[key]=fxCaptureChain(key); } return rec; }
function takeCapStart(tk){
  if(!AC||!tk) return;
  const rec={ kinds:{}, chains:{}, lane:[] };
  /* ⛔ ОПОРУ ПРОРЕЖИВАНИЯ ЗАСЕВАЕМ ТОЛЬКО СВОЕМУ ВЗЯТОМУ. Подложку можно положить ПОСРЕДИ записи — и её
     слои тоже рождают взятые. Сбрось мы опору здесь безоговорочно, идущая запись продолжила бы мерить
     дельты от ЧУЖОГО отсчёта: расхождение вышло бы крохотным (оба снимка сняты с одной живой цепи) и
     оттого неотличимым от правды — худший вид ошибки. Условие точное: на ● curTake уже равен tk, у
     подложки — никогда. */
  const mine = tk===curTake;
  if(mine){ takeFxLast=new Map(); takeFxOrder=new Map(); }
  for(const {key,kind} of chainOwners()){
    rec.kinds[key]=kind;
    rec.chains[key]=fxCaptureChain(key);
    if(mine){
      fxCaptureWalk(key,(fxId,pKey,v)=>{ takeFxLast.set(key+'|'+fxId+'|'+pKey, fineNew(v,-Infinity)); });   // засев: то же множество адресов, что пишет дорожка. Тонкая запись: опора — величина снимка, «записана» — до начала взятого (−∞), поэтому первый уход ляжет с точкой удержания: полка снимка держится до мига, где рука ушла
      takeFxOrder.set(key,chainOrderOf(key));                                            // засев состава: снимок выше и есть его исходное значение
    }
  }
  takeFx.set(tk,rec);
}
const chainOrderOf=key=>fxChainOf(key).map(e=>e.fxId).join(',');
/* ═══ ТОНКАЯ ЗАПИСЬ — ОДИН АВТОМАТ НА ШИНУ И НА ВЕЛИЧИНЫ «В НОТЕ» (слайсы «запись отражает плавность руки» и «медленное — тоже движение») ═══
   ⛳ ЗАПИСЬ ХРАНИТ ДВИЖЕНИЕ РУКИ, А НЕ АРТЕФАКТЫ ВЫБОРКИ И НЕ ДРОЖАНИЕ КАМЕРЫ. Дрожание и медленное движение различаются не РАЗМЕРОМ, а
   ХАРАКТЕРОМ: дрожание случайно и в среднем — ноль, движение идёт в одну сторону и копится. Поэтому:
     СРЕДНЕЕ — по каждой величине держим память выборок (H) и СРЕДНЕЕ за окно REC_AVG_S (2 с). Дрожание от усреднения сжимается в
       √N раз, движение — нет: неподвижная рука среднее не сдвигает, а рука, идущая хоть единицу за пять секунд, сдвигает непрерывно.
       Единицы пишутся по СРЕДНЕМУ (каждая, как только среднее ушло на REC_FINE_EPS от записанного). Числа и довод — config.
     ВРЕМЯ ЕДИНИЦЫ — середина окна (среднее время выборок): у ровного движения среднее за окно — это ТОЧНО положение руки в середине
       окна, поэтому единица ложится в миг, когда рука её прошла, а не когда среднее в этом убедилось. Не раньше, чем хоть одна
       выборка руки туда дошла.
     РЫВОК — выборка дальше REC_JUMP_EPS от среднего окна: окно начинается ЗАНОВО с неё. Быстрое движение так не сглаживается и не
       опаздывает (окно само сужается до ~0.06/скорость), а неподвижная рука до рывка не дотягивается (там 5–10σ дрожания).
     ПАУЗА — по ФОРМЕ, а не по порогу: перед записью единицы после промежутка дольше REC_PAUSE_S сравниваем две модели выборок с мига
       прошлой записи — «ровная линия от записанного» и «стояла, потом пошла» (излом). Излом лучше настолько, что дрожанием этого не
       объяснить (F > REC_KNEE_F), — в его миг кладём ТОЧКУ УДЕРЖАНИЯ с прежней величиной: пауза ровная, подъём — ровно там, где рука
       двинулась. Нет излома — это медленное движение, и единицы идут сплошной прямой (без площадок прежнего «покоя»).
   ⚠️ ЗАПИСЬ ЧУТЬ ГЛАЖЕ ЖИВОГО ЗВУКА: живьём величина несла дрожание под единицу, запись — только движение руки. Дрожание — камеры, не
   руки; записывать руку и есть принцип.
   x — число (шина) или нагрузка ноты (величины «в ноте»: громкость, яркость, ключи карты; высоту не трогаем — её смена пишется сама).
   Отдаёт к записи [{t,x}] ПО ВРЕМЕНИ; состояние обновлено так, будто всё записано (запись с явной долей не отказывает). Время пошло
   НАЗАД (шов скобы) — память с нуля: выборки прошлого прохода к новому не относятся. */
const FINE_NUM={ sig:()=>'v', vec:x=>[x], make:(x,a)=>a[0] };
const fxKeysOf=x=>x.fx?Object.keys(x.fx).sort():[];
const FINE_PN={                                                    // нагрузка ноты ↔ вектор усредняемых величин (громкость, яркость, ключи карты)
  sig:x=>['vol', ...(x.bri!=null?['bri']:[]), ...fxKeysOf(x)].join('|'),
  vec:x=>{ const a=[x.vol||0]; if(x.bri!=null) a.push(x.bri); for(const k of fxKeysOf(x)) a.push(x.fx[k]); return a; },
  make:(x,a)=>{ const y={...x, vol:a[0]}; let i=1; if(x.bri!=null) y.bri=a[i++];
    if(x.fx){ const f={}; for(const k of fxKeysOf(x)) f[k]=a[i++]; y.fx=f; } return y; },
};
const fineSec=b=>secOf(b), fineBeats=s=>beatsOf(s);
/* Состояние: lastA — вектор последней ЗАПИСАННОЙ величины (с ним сравнивает среднее), lastX — она же в виде, который пишется (число
   или нагрузка ноты): его ЧИТАЮТ вызывающие (r.vol/r.fx соло и баса, vol/bri аккорда — их же впишет шов recFoldRoll).
   ⚠️ ПОЧИНКА: при переходе на среднее состояние получило lastA, а lastX пропал — вызывающие читали fine.lastX.vol, падали каждым
   кадром удержанной ноты соло и баса (у аккорда — на кадре, где писалась единица), и кадр обрывался до отрисовки сетки. */
function fineNew(x,t){ const C=typeof x==='number'?FINE_NUM:FINE_PN; return { C, sig:C.sig(x), lastA:C.vec(x), lastX:x, lastT:t, H:[], ws:0 }; }
function fineReset(st,x,t){ st.sig=st.C.sig(x); st.lastA=st.C.vec(x); st.lastX=x; st.lastT=t; st.H=[]; st.ws=0; }   // записали сами (смена высоты, новый состав полей) — опора и память с нуля
function fineMean(H,from){ const n=H.length-from, d=H[from].a.length, m=new Array(d).fill(0); let tc=0;
  for(let i=from;i<H.length;i++){ const a=H[i].a; tc+=H[i].t; for(let j=0;j<d;j++) m[j]+=a[j]; }
  for(let j=0;j<d;j++) m[j]/=n; return { m, tc:tc/n }; }
function fineStep(st,x,t){
  const C=st.C, out=[];
  if(C.sig(x)!==st.sig){ fineReset(st,x,t); out.push({t,x}); return out; }   // другой состав полей (эффект на пальце появился/ушёл) — пишем сразу, как прежде
  if(st.H.length && t<st.H[st.H.length-1].t-1e-9){ st.H=[]; st.ws=0; st.lastT=-Infinity; }   // шов: величина прежняя (она и звучит), «когда записана» в этом проходе неизвестно
  const H=st.H, a=C.vec(x), Wb=fineBeats(REC_AVG_S);
  while(st.ws<H.length && H[st.ws].t<t-Wb) st.ws++;
  if(st.ws<H.length){ const {m}=fineMean(H,st.ws); let dj=0; for(let j=0;j<a.length;j++) dj=Math.max(dj,Math.abs(a[j]-m[j]));
    if(dj>REC_JUMP_EPS) st.ws=H.length; }                         // РЫВОК: окно — с этой выборки
  H.push({t,a});
  const old=fineBeats(REC_HIST_S); if(H[0].t<t-old*1.25){ let k=0; while(k<H.length && H[k].t<t-old) k++; k=Math.min(k,st.ws); H.splice(0,k); st.ws-=k; }   // память — REC_HIST_S, чистим пачкой
  const {m,tc}=fineMean(H,st.ws);
  let d=0, c=0; for(let j=0;j<m.length;j++){ const dd=Math.abs(m[j]-st.lastA[j]); if(dd>d){ d=dd; c=j; } }
  if(d<=REC_FINE_EPS) return out;
  const sg=Math.sign(m[c]-st.lastA[c]);
  let p=Math.max(tc, st.lastT+1e-6);
  for(const h of H){ if(h.t<=st.lastT) continue; if((h.a[c]-st.lastA[c])*sg>=REC_FINE_EPS){ if(p<h.t) p=h.t; break; } }   // не раньше, чем рука туда хоть раз дошла
  const k=fineKnee(st,c,sg,p);
  if(k!=null) out.push({t:k, x:C.make(x,st.lastA)});              // УДЕРЖАНИЕ: прежняя величина ТОЧНО, в миг, где рука пошла
  const w=C.make(x,m);
  out.push({t:p, x:w});
  st.lastA=m; st.lastX=w; st.lastT=p;
  return out;
}
/* ПАУЗА ПО ФОРМЕ — излом «стояла, потом пошла» против ровной линии от записанного, на сырых выборках с мига прошлой записи (y — уход
   от записанной величины по ведущей составляющей, x — время). Ровная линия: y = s·x. Излом в τ: y = 0 до τ, y = s'·(x−τ) после.
   Перебор τ по выборкам — суффиксные суммы, O(n). Излом принимается, если он объясняет данные лучше линии в F > REC_KNEE_F раз
   дисперсии остатка (с запасом: соседние выборки дрожания не независимы — сглаживание руки и повтор кадра на тиках шины), если пауза
   не короче REC_PAUSE_S и если после неё величина и правда пошла в ту же сторону. Нет прошлой записи в этом проходе (начало взятого,
   шов) — удержание кладётся всегда: в миг излома или на самой ранней выборке памяти (раньше нам ничего не известно). */
function fineKnee(st,c,sg,p){
  const H=st.H, first=st.lastT===-Infinity;
  const T0= first ? (H.length?H[0].t:p) : st.lastT;
  const S=[]; for(const h of H) if(h.t>T0+1e-9) S.push({x:h.t-T0, y:(h.a[c]-st.lastA[c])*sg});
  const pauseB=fineBeats(REC_PAUSE_S);
  let knee=null;
  if(S.length>=6 && p-T0>pauseB){
    let XX=0, XY=0, YY=0; for(const s of S){ XX+=s.x*s.x; XY+=s.x*s.y; YY+=s.y*s.y; }
    const sseA= XX>0 ? YY-(XY>0?XY*XY/XX:0) : YY;
    let n=0, Sx=0, Sxx=0, Sy=0, Syy=0, Sxy=0, best=Infinity, bt=null;
    for(let i=S.length-1;i>=0;i--){ const s=S[i]; n++; Sx+=s.x; Sxx+=s.x*s.x; Sy+=s.y; Syy+=s.y*s.y; Sxy+=s.x*s.y;
      if(n<2 || s.x<pauseB || T0+s.x>=p-1e-6) continue;   // после излома хоть две выборки: у решительного рывка излом — ПОСЛЕДНЯЯ ровная выборка перед ним, а не на два тика раньше
      const tau=s.x, num=Sxy-tau*Sy, den=Sxx-2*tau*Sx+tau*tau*n;
      const sse=(YY-Syy) + Syy - (num>0&&den>0 ? num*num/den : 0);
      if(sse<best){ best=sse; bt=tau; } }
    if(bt!=null && S.length>2){ const s2=best/(S.length-2);
      if(sseA-best > REC_KNEE_F*Math.max(s2,1e-12)) knee=T0+bt; }   // пол у дисперсии: ровно постоянная пауза (рука ушла из кадра, величина стояла) даёт остаток 0 — излом тогда идеален, а не «неопределён»
  }
  if(knee==null && first && T0<p-1e-6) knee=T0;
  return knee;
}
const pnSnap=p=> !p ? p : p.fx ? {...p, fx:{...p.fx}} : {...p};   // в память и в опору — КОПИЯ (как fxCopy у r.fx): живой снимок руки не должен стать псевдонимом записанного
/* УДАР СЕРДЦА — обход живых величин и запись ИЗМЕНИВШИХСЯ. Зовётся из tick, ПОСЛЕ отсчёта и в ПЕСЕННОЙ
   доле (оба свойства даёт место вызова, см. tick).
   ⛳ ПОЧЕМУ ИЗ СЕРДЦА, А НЕ ИЗ ЖЕСТ-ЦИКЛА — в этом весь смысл формы. Сердце бьёт независимо от того,
   есть ли рука в кадре, зажат ли щипок и звучит ли нота. Пер-событийная карта (как у соло до O-1) могла
   записать величину ТОЛЬКО вместе с нотой, и потому «покрутил ручку, пока звучит ЗАЩЁЛКНУТЫЙ аккорд с
   разомкнутыми пальцами» не записывалось НИКАК: для этого аккорда в тот миг не выполнялось ни одной
   строки. Здесь этот случай ничем не особен.
   ⚠️ ПРОРЕЖИВАНИЕ — ТОЙ ЖЕ МЁРТВОЙ ЗОНОЙ, что у прочих величин записи (REC_FX_EPS, довод — в config):
   величины НОРМИРОВАНЫ, поэтому один порог перцептивно ровен для секунд, герц и подмеса разом.
   ⛔ БУХГАЛТЕРИЯ И НИЧЕГО БОЛЬШЕ (правило #15): ни одного голосового вызова, ни одной постановки в
   расписание. Окно опережения этот обход не трогает. */
function takeCapSample(p){
  if(!recording||!curTake) return;
  const rec=takeFx.get(curTake); if(!rec||!takeFxLast||!takeFxOrder) return;   // обе опоры ставятся и снимаются вместе (takeCapStart/takeReset) — проверяем обе, чтобы связь была видна, а не подразумевалась
  for(const {key} of chainOwners()){
    /* СОСТАВ — ПЕРВЫМ: добавили, убрали или переставили эффект посреди взятого. Запись состава несёт
       список id (поле ids) и стоит В ТОЙ ЖЕ дорожке, на своей доле, — поэтому рендер узнает не только
       ЧТО менялось, но и КОГДА. Величина v здесь не значит ничего и стоит нулём ради единой формы. */
    const ord=chainOrderOf(key);
    if(takeFxOrder.get(key)!==ord){
      takeFxOrder.set(key,ord);
      rec.lane.push({t:p, key, fx:FX_CHAIN, p:'order', v:0, ids:ord?ord.split(','):[]});
    }
    fxCaptureWalk(key,(fxId,pKey,v)=>{
      const a=key+'|'+fxId+'|'+pKey, st=takeFxLast.get(a);
      if(!st){ takeFxLast.set(a, fineNew(v,p)); rec.lane.push({t:p, key, fx:fxId, p:pKey, v}); return; }   // адрес, которого не было в снимке (эффект добавлен посреди взятого), — первая величина сразу, как прежде
      /* ТОНКАЯ ЗАПИСЬ (см. fineStep): в покое — ничего; уход — дописан с мига, где рука ушла (с точкой удержания); в движении — каждая
         единица. ⚠️ Дописанные точки лежат РАНЬШЕ уже лежащих в ленте точек ДРУГИХ адресов — лента взятого больше не упорядочена по
         времени добавления. Её читают только через сортировку (fxLaneMerge, autPointsCalc) и счёт (captureInfoOf), так что это безвредно. */
      for(const s of fineStep(st,v,p)) rec.lane.push({t:s.t, key, fx:fxId, p:pKey, v:s.x});
    });
  }
}
/* ═══ ПЕРЕИГРОВКА АВТОМАТИЗАЦИИ (слайс O-3) ═══
   ⛳ ЗАКОН, РАДИ КОТОРОГО ВСЯ ДУГА: ДОРОЖКА ЗВУЧИТ ТЕМ, С ЧЕМ ЕЁ СЫГРАЛИ. Крутить ручку после записи
   можно сколько угодно — на уже записанное это не влияет. У каждой величины ровно ОДИН хозяин: РУКА,
   пока транспорт стоит, и ЗАПИСЬ, пока он играет. Третьего («тронул — перехватил») нет намеренно:
   правка записанной автоматизации — дело РЕДАКТОРА (полоса под нотами), а не случайного касания.
   ⛳ ФОРМА — ТА ЖЕ, ЧТО У ДОГОНЯЛКИ (chaseFor/chasePlay), и это не совпадение, а переиспользование:
   «сверни отсортированный префикс ДО доли x в состояние, затем примени его». Догонялка так поднимает
   зажатые ноты при входе в песню не с начала; здесь тем же движением поднимаются величины эффектов.
   Второй механики входа не заводим.
   ⛔ НЕ ВО ВРЕМЯ ЗАПИСИ. Гони мы дорожку в параметры при работающем ●, захват тут же снял бы эти самые
   величины как «сыгранные рукой» — автоматизация писала бы сама себя по кругу. Пока идёт запись, хозяин
   один: рука.
   ⚠️ ЭТО БУХГАЛТЕРИЯ И ЗВУК ПАРАМЕТРОВ, НО НЕ СОБЫТИЯ (правило #28): своя сортировка, свой курсор, ни
   одного касания cursN/curSched/curNear/schedInvalidate. И не расписание (правило #15): ни одного
   голосового вызова, ни одной постановки в окно опережения. */
/* ПЛОСКАЯ ЛЕНТА ВСЕХ ВЗЯТЫХ, отсортированная по (доля, номер взятого). Снимок старта взятого входит в
   неё как точки на доле ПЕРВОГО СОБЫТИЯ этого взятого — только там он и вступает в силу.
   ⛳ ПОЧЕМУ ОДНА ЛЕНТА НА ВСЕХ, А НЕ «ГЛАВНОЕ ВЗЯТОЕ НА ВЛАДЕЛЬЦА»: у владельца ОДНА цепь и ОДНА сеть,
   а взятых на него может быть много (правило «цепь принадлежит владельцу, а не дорожке»). Две басовые
   дорожки с разным ревербом ОДНОВРЕМЕННО не звучат — это предел, который снимет только ЗАМОРОЗКА, когда
   у дорожки появятся свои экземпляры. До неё выбран самый нестранный из возможных законов: ПОБЕЖДАЕТ
   ПОСЛЕДНЯЯ ПО ВРЕМЕНИ ЗАПИСАННАЯ ТОЧКА — то есть та автоматизация, которая в этом месте песни была
   написана позже всех. Ничья по доле разрешается номером взятого: новее — сильнее.
   ⚠️ ОТБОР ПО ВЛАДЕЛЬЦУ: взятое правит цепью ТОЛЬКО тех ролей, которые в нём реально играли (evRole по
   его событиям). Иначе барабанное взятое, чей снимок тоже содержит цепь баса, перебивало бы басовую
   автоматизацию соседней дорожки — чужим значением, снятым мимоходом. */
let fxPlayList=null, fxPlayI=0, fxPlayAt=-1, fxPlaySig='', fxPlayHard=true;   // fxPlayHard (AF5): the next fold follows a transport start — rewire the track chain without a dip
const fxPlayVals=new Map(), fxPlayOrd=new Map();     // свёрнутое состояние: адрес → последняя победившая точка; ключ владельца → состав
/* ПОДПИСЬ ЛЕНТЫ: по ней решаем, не устарела ли она. Входит всё, что меняет ЛЕНТУ или ПОБЕДИТЕЛЯ в ней:
   состав событий (от них доли старта и роли взятых), состав захвата, длина дорожек и ЗАГЛУШЕНИЕ
   (заглушённая дорожка своей автоматикой не правит, значит смена mute/solo меняет исход свёртки).
   ⚠️ Множества mute/solo крошечные — склейка на тике дешевле отдельной точки инвалидации, а главное
   не требует помнить о ней в четырёх местах, где эти множества правятся. */
const fxPlaySignature=()=>{ let n=0; for(const r of takeFx.values()) n+=r.lane.length;
  return events.length+'|'+takeFx.size+'|'+n+'|'+takeFxVer+'|'+[...laneMute].join(',')+'/'+[...laneSolo].join(',')+'|f'+frzOwnedKey(); };   // AF5: which tracks a buffer owns now
/* AF5: tracks whose sound is their BUFFER now (fresh, no swap ahead — frzBufNow) — their automation drives nothing. */
const frzOwnedKey=()=>{ if(!frozen.size) return ''; let k=''; for(const f of frozen.values()) if(!f.drop && frzBufNow(f.layer)) k+=f.id+','; return k; };   // takeFxVer — правки редактора: длины при них не меняются (см. его шапку)
/* ⛳ СЛИЯНИЕ ЛЕНТЫ — ЧИСТАЯ ФУНКЦИЯ (выделена в F3). Ничего не мутирует и ни на что не подписана:
   строит и ОТДАЁТ отсортированный список точек. ⛔ ВТОРОГО СЛИЯНИЯ БЫТЬ НЕ ДОЛЖНО — здесь и только
   здесь живёт закон «побеждает последняя по времени точка, при равенстве старшее взятое, и взятое
   правит ТОЛЬКО ролями, которые в нём играли». Разойдись рендер с этим законом — замороженная
   дорожка зазвучала бы иначе, чем её играет транспорт, а это единственное, чего не простят.
   Потребителей двое: живая переигровка (fxPlayBuild ниже) и офлайн-рендер (F3). */
function fxLaneMerge(){
  const list=[];
  /* Метаданные взятого выводим ОДНИМ проходом по событиям: доля первого события (когда снимок вступает
     в силу), слой (для слышимости) и ключи владельцев, которыми это взятое вправе править. */
  const meta=new Map(), lt=new Map();                              // lt (S1): слой → (взятое → его первая доля В ЭТОМ слое)
  for(const e of events){ const tk=e.tk||0; let m=meta.get(tk);
    if(!m) meta.set(tk, m={t0:e.t, layer:e.layer, keys:new Set()});
    if(e.t<m.t0) m.t0=e.t;
    const r=evRole(e.fn); if(r) m.keys.add(chainKeyOf(r));
    let tm=lt.get(e.layer); if(!tm) lt.set(e.layer, tm=new Map());
    const q=tm.get(tk); if(q==null||e.t<q) tm.set(tk,e.t);
  }
  /* СНИМОК ВЗЯТОГО В ЛЕНТУ: состав и величины на доле t. Одна функция на оба случая ниже (свой снимок взятого и заимствованный, S1). */
  const snapPush=(t,tk,layer,key,ch)=>{
    list.push({t, tk, layer, key, fx:FX_CHAIN, ids:ch.map(e=>e.fxId)});   // СОСТАВ на старте взятого
    for(const eff of ch){
      const names=fxParamKeysOf(eff.fxId);                      // снимок хранит величины массивом — имена берём у реестра эффектов
      eff.params.forEach((v,i)=>{ if(v!=null && names[i]!=null && !fxIsPerNote(eff.fxId,names[i]))   // V4b: параметр «в ноте» ведёт НОТА, не лента (см. ниже)
        list.push({t, tk, layer, key, fx:eff.fxId, p:names[i], v, snap:true}); });   // snap — точка СНИМКА, а не ленты: от неё плавный отрезок не начинается (см. fxLaneAt)
    }
  };
  for(const [tk,rec] of takeFx){
    const m=meta.get(tk); if(!m||!m.keys.size) continue;          // взятое без событий (пишется прямо сейчас) или без ролей с цепью — пропускаем
    for(const key of m.keys){
      const ch=rec.chains[key]; if(!ch) continue;
      snapPush(m.t0, tk, m.layer, key, ch);
    }
    /* ⛳ V4b: ТОЧКИ ПАРАМЕТРОВ «В НОТЕ» В ЛЕНТУ НЕ ИДУТ — НИ ПЕРЕИГРОВКЕ, НИ РЕНДЕРУ. Их величину записанная нота несёт САМА
       (карта a.fx или своё поле — fxIsPerNote), и её же читают переигровка и заморозка. Лента здесь была бы ВТОРЫМ источником:
       гнала бы живой экземпляр по снятым точкам, а те после правки в редакторе расходятся с нотами — рука, играющая поверх
       ▶, получала бы величину, которой ни одна записанная нота уже не несёт, и столбик помечался бы «ведёт запись», хотя запись
       ведёт свои ноты, а не экземпляр. Теперь у величины «в ноте» хозяева разведены чисто: у ЗАПИСАННОЙ ноты — её событие, у
       ЖИВОЙ — рука, и так всё время, а не «рука до ▶, запись после». ⛔ ЗАХВАТ ПРИ ЭТОМ НЕ МЕНЯЛСЯ: точки по-прежнему пишутся
       (правило #29 — объявлено, значит захвачено), их просто не читает никто из звука. Здесь — ЕДИНСТВЕННОЕ слияние, поэтому
       живое и рендер расходиться не могут. */
    for(const ent of rec.lane){
      if(!m.keys.has(ent.key)) continue;
      if(ent.fx!==FX_CHAIN && fxIsPerNote(ent.fx,ent.p)) continue;   // V4b: см. выше
      list.push({t:ent.t, tk, layer:m.layer, key:ent.key, fx:ent.fx, p:ent.p, v:ent.v, ids:ent.ids, sh:ent.sh, k:ent.k});   // k — BEND-CURVE curvature of a glide into the point   // sh — ФОРМА отрезка, ВХОДЯЩЕГО в точку ('s' — плавно; нет — ступенькой, как всё записанное)
    }
  }
  /* ⛳ S1: ВЗЯТОЕ БЕЗ ЗАХВАТА ВНУТРИ ЗАХВАЧЕННОЙ ДОРОЖКИ ИГРАЕТ ЦЕПЬЮ ДОРОЖКИ. Такое взятое сегодня одно — ВСТАВКА В РЕДАКТОРЕ
     (editTake: editInsertHit/editInsertBass захвата не заводят), и своего захвата оно больше НЕ получает никогда, пока он есть у
     дорожки (autCaps, freezePinCaptures). Позже первого захваченного взятого дорожки ему ничего и не нужно: его ноты звучат под
     тем составом, что правит в их долю, — то есть цепью дорожки. Нужно ОДНО: вставка РАНЬШЕ всех захваченных взятых дорожки —
     туда цепь дорожки ещё не вступила, и ноты шли бы живой цепью (переигровка) или пустой (рендер). Поэтому такое взятое
     ЗАИМСТВУЕТ снимок САМОГО РАННЕГО захваченного взятого своей дорожки и кладёт его со СВОЕЙ первой доли: цепь дорожки
     начинается с её первой ноты. ⛔ Позже — не заимствует: снимок посреди чужого взятого сбросил бы его автоматику на стартовые
     величины. ⚠️ Как и любой снимок, он правит РОЛЬЮ с этой доли (одна сеть на владельца — Known limits №1–2), ровно как
     старт любого взятого. Записанное и подложки захват имеют всегда — сюда они не попадают, их лента прежняя дословно. */
  for(const [tk,m] of meta){
    if(takeFx.has(tk)||!m.keys.size) continue;
    for(const [ly,tm] of lt){
      const t0=tm.get(tk); if(t0==null) continue;
      let C=null;
      for(const [tk2,t2] of tm){ if(tk2===tk||!takeFx.has(tk2)) continue;
        if(!C||t2<C.t0||(t2===C.t0&&tk2<C.tk)) C={tk:tk2, t0:t2}; }
      if(!C||!(t0<C.t0-1e-9)) continue;
      const rec=takeFx.get(C.tk), mc=meta.get(C.tk);
      for(const key of m.keys){ if(!mc||!mc.keys.has(key)) continue;
        const ch=rec.chains[key]; if(ch) snapPush(t0, tk, ly, key, ch); }
    }
  }
  list.sort((a,b)=> a.t-b.t || a.tk-b.tk);
  /* ⛳ СОСЕД СПРАВА ТОГО ЖЕ АДРЕСА (nx) — по уже отсортированному списку, то есть по ТОМУ ЖЕ закону победителя: следующая
     точка адреса в ленте — это ровно та, что сменит величину следующей. Плавный отрезок едет к ней. Объекты списка —
     свежие, построенные здесь же, поэтому функция остаётся чистой. */
  const lastOf=new Map();
  for(const e of list){ if(e.fx===FX_CHAIN) continue; const a=e.key+'|'+e.fx+'|'+e.p, L=lastOf.get(a); if(L) L.nx=e; lastOf.set(a,e); }
  return list;
}
/* ⛳ AF5: a FROZEN track (its buffer owns it now) drives no chain — its effects are inside its buffer; filtered HERE, not in fxLaneMerge
   (the render needs the whole lane). Before AF5 its automation kept driving the role's live chain. */
function fxPlayBuild(){
  fxPlayList=fxLaneMerge().filter(e=>!frzBufNow(e.layer)); fxPlayReset();
  fxPlaySig=fxPlaySignature();
}
function fxPlayReset(){ fxPlayI=0; fxPlayAt=-1; fxPlayVals.clear(); fxPlayOrd.clear(); }
/* Свернуть ленту ДО доли x и применить. ВПЕРЁД — курсором, сворачивая только НОВЫЕ точки (цена тика не
   зависит от длины песни, тот же довод, что у курсоров планировщика в S3.2). НАЗАД (перемотка, заворот
   скобы) — свёртка с нуля: ровно так и входит в песню догонялка, второй механики не заводим. */
function fxPlayDrive(x){
  if(fxPlaySig!==fxPlaySignature()) fxPlayBuild();
  if(!fxPlayList||!fxPlayList.length) return;
  if(x<fxPlayAt) fxPlayReset();                                  // время пошло назад — префикс сворачиваем заново
  fxPlayAt=x;
  const gated=laneGated();
  while(fxPlayI<fxPlayList.length && fxPlayList[fxPlayI].t<=x+1e-9){
    const e=fxPlayList[fxPlayI++];
    if(gated && !laneAudible(e.layer)) continue;                 // заглушённая дорожка своей автоматикой не правит
    if(e.fx===FX_CHAIN) fxPlayOrd.set(e.key, e.ids);             // ПОСЛЕДНЯЯ точка по адресу и побеждает — просто перезаписываем
    else fxPlayVals.set(e.key+'|'+e.fx+'|'+e.p, e);
  }
  const hard=fxPlayHard; fxPlayHard=false;
  for(const [key,ids] of fxPlayOrd) fxPlayPath(playKeyOf(key), ids, hard);   // composition first, into the TRACK chain (AF5); no dip right after a start
  /* ГЛАДКАЯ АВТОМАТИЗАЦИЯ: у плавного отрезка величина на ЭТОМ тике — точка прямой (fxLaneAt). Сеттер ставит её своей τ, и
     25-мс ступеньки тика сливаются в рампу; ступенчатый отрезок отдаёт e.v, как было. Сосед справа из заглушённой дорожки не
     правит (как и в свёртке выше) — к нему не едем, держим. */
  for(const e of fxPlayVals.values()){
    const v = fxLaneSmooth(e) && !(gated && !laneAudible(e.nx.layer)) ? fxLaneAt(e,x) : e.v;
    fxPlaySet(playKeyOf(e.key), e.fx, e.p, v);   // AF5: the track chain, never the live one
  }
}
/* ⛳ ПРАВИТ ЛИ ЭТИМ АДРЕСОМ СЕЙЧАС ЗАПИСЬ — для показа (столбики). Ответ ПО ПАРАМЕТРУ, а не по эффекту и
   не по роли: в цепи, где запись вела подмес и не трогала длину, помечен обязан быть ровно один столбик.
   ⚠️ Правда одна и та же для звука и для показа: ключи fxPlayVals — это РОВНО те адреса, которые тик
   сейчас ведёт (их же он и применяет строкой ниже в fxPlayDrive). Второго списка «что помечено» нет.
   Транспорт стоит → свёрнутое состояние очищено (fxPlayReset) → не правит никто, и пометок нет. */
/* AF5 probe: which recorded addresses drive a chain right now, and from which track layer. Pure read. */
const fxPlayDriving=()=>[...fxPlayVals.values()].map(e=>({ key:playKeyOf(e.key), layer:e.layer, fx:e.fx, p:e.p }));
const fxIsDriven=(key,fxId,pKey)=> !liveIso && loop.on && !recording && fxPlayVals.has(key+'|'+fxId+'|'+pKey);   // AF5: recordings never drive a live chain
/* ⚠️ `!recording` ОБЯЗАТЕЛЕН, и это не перестраховка. Свёрнутое состояние живёт между тиками, а во время
   записи fxPlayDrive не зовётся вовсе (правило O-3: пока пишем — хозяин рука). Нажми человек ● посреди
   воспроизведения — состояние осталось бы от последнего кадра, и столбики продолжали бы помечать чужим
   то, чем в этот миг распоряжается ТОЛЬКО его рука. Пометка обязана исчезнуть ровно тогда, когда
   исчезает власть записи. */
/* Транспорт встал — вернуть живую цепь. ⛳ ВЕЛИЧИНЫ ОСТАВЛЯЕМ ТАМ, ГДЕ ИХ ОСТАВИЛА ЗАПИСЬ, и это выбор:
   ручки — это ручки, они стоят там, где стоят, их видно (столбики и меню читают те же p.cur) и их можно
   двигать. Возврат «как было до ▶» потребовал бы второй копии всех величин и ещё одного провала на
   остановке, а главное — ничего бы не защитил: записанное всё равно неприкосновенно.
   ⚠️ СОСТАВ — НАОБОРОТ, ВОЗВРАЩАЕМ ВСЕГДА: это не величина, а ЧУЖАЯ раскладка, и оставить человека с
   составом чужой записи значило бы отобрать у него его собственную цепь. */
/* AF5: with isolation the live chain was never touched — nothing to return; the track chain keeps its composition so the tails of the
   tracks ring out (the next start refolds it, without a dip). */
function fxPlayStop(){
  fxPlayReset(); fxPlayHard=true;
  if(!liveIso) for(const {key} of chainOwners()){ fxPlayPath(key,null); fxRestoreAim(key); }   // состав — человеку обратно; звук — к ПРИЦЕЛУ руки, чтобы столбик и звук сошлись в тот же миг (см. fxRestoreAim)
}
/* ⛳ AF5 — USER'S HARD RULE: a track and the live hands never share an effect network. A track's owner key (layerOfOwner ≠ null) routes
   its voices to the role's TRACK chain (audio: track heads, set at each attack); recorded automation drives only that chain (fxPlayDrive);
   the live chain belongs to the hands alone. liveIso=false is the probe CONTROL only (the old shared network, P.checkLiveIsolation). */
let liveIso=true;
const setLiveIsolation=on=>{ if(on!=null){ liveIso=!!on; fxPlayReset(); fxPlayHard=true; } return liveIso; };   // ⛔ probe only
const playKeyOf=key=> liveIso ? trackChainKeyOf(key) : key;   // where recorded automation of a live chain key plays

export { capReset, takeCapStart, capRecordNow, fineNew, fineReset, fineStep, pnSnap, takeCapSample, fxLaneMerge, fxPlayDrive, fxPlayDriving, fxIsDriven, fxPlayStop, liveIso, setLiveIsolation, playKeyOf };
