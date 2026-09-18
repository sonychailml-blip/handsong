import { scaleIdx, tonic, setScaleIdx, setTonic, setSeventh, setChIdx,
         phoneInstr, setPhoneInstr, handFn, setHandFn, splitOn, setSplitOn, SPLIT_ROLES, setSplitRole,
         camFacing, setCamFacing, aRef, setARef, rectPref, setRectPref,
         pinchFingers, setPinchFingers,
         fxChainOf, chainKeyOf, CHAIN_SOLO, fxChainAdd, fxChainRemove, fxChainMove, setFxParamAddr, setFxParamMode, setFxParamFixed, roleHasFx,
         handActOf, setHandAct,
         chainXDriven, fxVolFix, setFxVolFix, fxIsScalar,
         rollOpen, setRollOpen, setRollWin, setRollSel, rollSel, rollDrag, setRollDrag, rollIns, setRollIns,
         rollRole, setRollRole, rollRow0, setRollRow0, rollScale, setRollScale,
         rollAut, setRollAut, rollAutSel, setRollAutSel, rollAutDrag, setRollAutDrag,
         seventh, rectOctReg } from './state.js';   // S5.5: живой септаккорд (для вставки в РОЛЬ БЕЗ событий) и липкий регистр роли (куда открыть окно высот)   // S5.0: вид редактора дорожки — открыт ли, окно времени, выделение
/* fxParamsOf — ЕДИНЫЙ путь записи значения параметра (скаляр в state.fx[k] / модуль через setNorm).
   Меню фиксированных значений идёт ЧЕРЕЗ НЕГО, а не собственной копией развилки «скаляр или модуль»:
   иначе лог-кривая реверба жила бы в двух местах и однажды разошлась. Цикла нет — gestures не знает ui. */
import { fxParamsOf, ACTIONS } from './gestures.js';   // ACTIONS — реестр дискретных действий (слайс «д»): меню берёт подпись и avail() ОТТУДА ЖЕ, откуда их читает движок
import { switchCamera, canvas as canvasEl } from './vision.js';
/* loopHit — ГЕОМЕТРИЯ ПОПАДАНИЯ по полосе лупера. Живёт в draw, потому что там же она и РИСУЕТСЯ
   (правило #9: две копии разъедутся, и палец возьмёт не ту кнопку, которую видит). ui не считает
   ничего сам — переводит тап в вызов. Цикла импортов нет: draw про ui не знает. */
import { loopHit, loopBeatAt, rollHit, rollGeom, rollSnap, rollSnapBeat, rollScaleGroups, rollRowPitch, fxTitleOf, rollAutSnapV, rollAutDrive } from './draw.js';   // O-4: привязка величины и ведение точки пальцем (ось жеста, зона точности) — из ТОГО ЖЕ снимка, что нарисован (правило #9)   // fxTitleOf — ЕДИНАЯ резолюция имени эффекта (меню + подвал редактора), живёт в draw: ui→draw уже есть, обратный импорт был бы циклом   // S5.5: группы ладов дорожки и расшифровка ряда в (ступень,регистр) — ТОЙ ЖЕ формулой, что рисует ряды   // S5.1: шаг привязки считает draw (он знает плотность пикселей) — второй копии лестницы не заводим   // S5.0: попадание и габариты окна пиано-ролла — из ТОГО ЖЕ снимка, по которому он нарисован
import { startClip, stopClip, activeKind, onClipChange } from './clip.js';
import { SCALES, NOTE_NAMES, TRADITIONS, scalesOfTrad, tradOfScale, supportsProgressions, supportsChords, CUR, rectDefault } from './scales.js';
import { setLeadInstr, setBassInstr, setDrumKit, LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_KITS, AC, droneOn, FX_FACTORY, fxSetActive, fxChainResplice, fxAddableIds } from './audio.js';
import { softAllOff, panic, onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopMetre, setLoopSub, setLoopQuant, setLoopBpm, loop, events, recording, loadArrangement, loadJam, clearJam,
         toggleLaneMute, toggleLaneSolo, droneAudible,
         setRegionOn, regionOn, braceTap, braceMove, toggleArm, armedLayer, laneDelTap, laneDelCancel,
         songBeats, songNotes, seekTo, editOpen, editClose, editIsOpen, editLayer, editSetLayer,
         editMoveHit, editDeleteHit, editInsertHit, editUndo, editRedo, editCanUndo, editCanRedo, editBackingOpen,
         editMoveSeg, editDeleteSeg, editInsertBass, editResizeSeg,
         autAddrs, autPoints, autMovePoint, autDeletePoint, autAddPoint,
         autChainOf, autChainAdd, autChainRemove, autChainMove, captureInfoOf,
         freezeState, unfreezeLayer, freezePinCaptures } from './recorder.js';   // F5: ЗАМОРОЗКА — состояние для показа, разморозка и «есть ли взятое без захвата» (одноразовое известие). Сам рендер зовётся ЛЕНИВЫМ импортом render.js — см. onFreeze   // O-4: полоса автоматизации и цепь САМОЙ ДОРОЖКИ — вся правка живёт в recorder, ui только зовёт   // S5.5: правка баса идёт по СЕГМЕНТАМ   // S5.1: правки и отмена ПРАВОК живут в recorder — ui только зовёт   // S5.0: отказы и открытая дорожка живут в recorder — ui только зовёт   // дорожки (S1): состояние держит recorder, ui только зовёт переключатель; повтор и СКОБА (S3.5b) — там же
import { HARMONIES, RHYTHMS, BASS_MODES, rhythmFits, rhythmsForMetre } from './arrange.js';
import { INSTR_COL, FX_META } from './config.js';
import { hooks } from './hooks.js';
import { lang, setLang, applyI18n, L, t, onLangChange } from './i18n.js';

/* ================= UI ================= */
const $=id=>document.getElementById(id);

/* ССЫЛКИ СТАРТОВОЙ КАРТОЧКИ (плейсхолдеры). Впишите URL — ссылка появляется; пустой URL СКРЫВАЕТ её
   (мёртвых ссылок не рисуем). Меняется ОДНОЙ строкой ЗДЕСЬ. Отзыв без формы падает на e-mail; адрес
   собираем в JS (FB_MAIL_USER+'@'+FB_MAIL_DOMAIN), а НЕ mailto в HTML-исходнике — лёгкая защита от
   сборщиков адресов на публичной странице. i18n позже — строки пока русские. */
const FEEDBACK_URL='https://docs.google.com/forms/d/e/1FAIpQLScnVgevwYbUNMUAs1U5vm0DhWyHG2bBAUEGY7tXSqjaLvS2QQ/viewform';   // Google-форма отзыва
const DONATE_URL='https://paypal.me/chailml';   // страница поддержки (PayPal.Me)
const FB_MAIL_USER='chailakhianmikhail', FB_MAIL_DOMAIN='gmail.com';   // fallback-почта, пока нет формы
const recBtn=$('recBtn'), loopBtn=$('loopBtn'),
      instrBtn=$('instrBtn'), instrBtnL=$('instrBtnL'), instrBtnR=$('instrBtnR'), splitBtn=$('splitBtn'), camBtn=$('camBtn'), camMsg=$('camMsg'), fsBtn=$('fsBtn'), fsBtnStart=$('fsBtnStart'), clipBtn=$('clipBtn'), audioBtn=$('audioBtn'), jamBtn=$('jamBtn'),
      backingMenu=$('backingMenu'), backingJam=$('backingJam'), backingDrums=$('backingDrums'),
      loopMinus=$('loopMinus'), loopPlus=$('loopPlus'), loopBarsV=$('loopBarsV'), loopMetre=$('loopMetre'),
      sub4=$('sub4'), sub3=$('sub3'),
      selTradition=$('selTradition'), selScale=$('selScale'), selTonic=$('selTonic'),
      selLead=$('selLead'), selChord=$('selChord'), selBass=$('selBass'),
      qOn=$('qOn'), qOff=$('qOff'),
      bpmEl=$('bpm'), bpmV=$('bpmV'),
      selProg=$('selProg'), selRhythm=$('selRhythm'), selBassMode=$('selBassMode'), selDrumKit=$('selDrumKit'), addArrBtn=$('addArrBtn'),
      scaleBtn=$('scaleBtn'), soundBtn=$('soundBtn'), loopPanelBtn=$('loopPanelBtn'),
      panelScaleEl=$('panelScale'), panelSoundEl=$('panelSound'), panelLoopEl=$('panelLoop');
 
/* Кнопка-индикатор звукоряда (шаг 2 MENU-PLAN): «лад · тоника», единственный вход в меню.
   Имя тоники берём из NOTE_NAMES — тем же списком подписан <select id="selTonic">,
   чтобы подписи не разъехались. Читает живые связки scaleIdx/tonic, поэтому зовётся
   после КАЖДОЙ смены лада или тоники (иначе надпись протухает). */
function updScaleBtn(){ scaleBtn.textContent=`${L(SCALES[scaleIdx].name)} · ${NOTE_NAMES[tonic]}`; }

/* Меню лада заполняем ладами ОДНОЙ традиции. value у <option> — абсолютный индекс в
   SCALES (он же scaleIdx), а не позиция в отфильтрованном списке: иначе selScale.onchange
   выставил бы не тот лад. Подгруппы (grp) рисуем, только если они заданы.
   ГРУППИРОВКА ПО КЛЮЧУ (grp), А НЕ ПО СОСЕДСТВУ В МАССИВЕ. Это разные вещи, и разница
   видна ровно тогда, когда лад дописан В КОНЕЦ SCALES (а правило требует дописывать
   только туда): раньше сравнивался лишь ПРЕДЫДУЩИЙ grp, поэтому «Диатоника» в конце
   массива открывала ВТОРУЮ группу «Диатоника» внизу списка. Теперь лады раскладываются
   по корзинам: порядок КОРЗИН — по первому появлению, порядок ВНУТРИ корзины — по
   массиву. Позиция в меню и позиция в SCALES развязаны, scaleIdx при этом не трогается.
   Пустой grp — не корзина: такие лады идут голыми <option> прямо в selScale
   (Хроматика/Арабская/Микротональная так и рисуются). */
/* КЛЮЧ КОРЗИНЫ (grpKey) — СТАБИЛЬНЫЙ идентификатор подгруппы, ОТДЕЛЬНЫЙ от показываемой подписи. До
   i18n grp был И ключом, И подписью; когда на этапе B grp станет локализуемым (строка или объект),
   бакетинг по ПОДПИСИ раскидал бы одну группу на четыре (по языку). Поэтому корзину определяет grpKey
   (поле лада, если задано), а подпись — L(grp). Пока grpKey нет и grp — строка: ключ = сама строка,
   подпись = та же строка (L строку пропускает) → бакетинг и подписи байт-в-байт как сегодня.
   Этап B: добавить каждому ладу grpKey + перевести grp в объект — бакетинг останется стабильным. */
const grpKeyOf   = s => s.grpKey != null ? s.grpKey : (s.grp != null ? L(s.grp) : '');
const grpLabelOf = s => s.grp != null ? L(s.grp) : '';
function fillScales(tradId){
  selScale.textContent='';
  const order=[], buckets=new Map(), labels=new Map();   // order — ключ в порядке первого появления
  scalesOfTrad(tradId).forEach(({i,s})=>{
    const k=grpKeyOf(s);
    if(!buckets.has(k)){ buckets.set(k,[]); order.push(k); labels.set(k, grpLabelOf(s)); }
    buckets.get(k).push({i,s});                 // внутри корзины — порядок массива
  });
  for(const k of order){
    const parent = k ? selScale.appendChild(Object.assign(document.createElement('optgroup'),{label:labels.get(k)}))
                     : selScale;                // '' → без optgroup, прямо в список
    for(const {i,s} of buckets.get(k)){
      const o=document.createElement('option'); o.value=i; o.textContent=L(s.name); parent.appendChild(o);
    }
  }
}
function buildUI(){
  TRADITIONS.forEach(tr=>{ const o=document.createElement('option'); o.value=tr.id; o.textContent=L(tr.name); selTradition.appendChild(o); });
  selTradition.value=tradOfScale(scaleIdx);      // традицию берём из активного лада, а не из умолчания
  fillScales(selTradition.value);
  selScale.value=scaleIdx;
  NOTE_NAMES.forEach((n,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=n; selTonic.appendChild(o);
  });
  selTonic.value=tonic;
  LEAD_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=L(s.label); selLead.appendChild(o);
  });
  CHORD_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=L(s.label); selChord.appendChild(o);
  });
  BASS_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=L(s.label); selBass.appendChild(o);
  });
  DRUM_KITS.forEach((k,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=L(k.label); selDrumKit.appendChild(o); });
  HARMONIES.forEach((p,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=L(p.name); selProg.appendChild(o); });
  RHYTHMS.forEach((r,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=L(r.name); selRhythm.appendChild(o); });
  BASS_MODES.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=L(m.name); selBassMode.appendChild(o); });
  selBassMode.value='roots';
  updScaleBtn();                              // 1/3: старт
  loopBarsV.textContent=loop.bars;
  refreshProgAvail();
  /* Раскладку нот здесь НЕ строим: её DOM-ссылка (#rectSel) объявлена ниже по файлу, рядом
     со своим обработчиком — как у эталона A4. Вызов из buildUI() попадал бы в мёртвую зону const
     (TDZ) и падал на загрузке. Первичная отрисовка — там же, где объявление (см. renderRectCtl). */
}
function refreshProgAvail(){                  // прогрессии — только там, где строятся аккорды и 7 ступеней; дрон — везде
  const ok=supportsProgressions()&&supportsChords();   // макам: iv.length===7, но лестницы аккордов нет
  [...selProg.options].forEach((o,i)=>{ o.disabled = !HARMONIES[i].drone && !ok; });
  if(selProg.selectedOptions[0] && selProg.selectedOptions[0].disabled) selProg.value='0';   // упасть на дрон
}
/* Размер: значение = loop.metre; БЛОКИРУЕМ селектор на непустой/играющей петле (смена переосмыслила бы
   времена всех событий — как длина). Плюс фильтруем ритмы: доступны лишь ГОДНЫЕ паттерны (свой размер +
   сошедшаяся сетка) — годность считает rhythmFits в arrange.js, ЕДИНЫМ выражением для всех мест
   (этот фильтр, подгон джема, цикл «только ударные», сама генерация); раньше копий было три. */
/* ⚠️ S3.3: блокируется ТОЛЬКО размер. Контрол тактов больше не «длина петли», а ДЛИНА ПОДЛОЖКИ
   (см. setLoopBars) — он ничего записанного не переосмысляет и доступен всегда. */
function refreshMetreCtl(){
  loopMetre.value = loop.metre;
  loopMetre.disabled = !!(events.length || loop.on);
  [...selRhythm.options].forEach((o,i)=>{ o.disabled = !rhythmFits(RHYTHMS[i], loop.metre); });
  if(selRhythm.selectedOptions[0] && selRhythm.selectedOptions[0].disabled){   // выбранный ритм не того размера → упасть на совместимый (как refreshProgAvail)
    const alt=rhythmsForMetre(loop.metre)[0]; if(alt!=null) selRhythm.value=alt;
  }
}
buildUI(); refreshMetreCtl();

hooks.leadInstr = v  => selLead.value = v;
hooks.bassInstr = v  => selBass.value = v;
hooks.drumKit   = v  => selDrumKit.value = v;
/* Кнопка записи — компактная иконка: состояние показываем ВИДОМ (классы + CSS),
   а не текстом. Подробности («круг N т.» / «слой K») и так пишет холстовая полоса
   лупера (drawLooper); текст в кнопке был бы вторым, худшим экземпляром той же
   информации. Смысл иконки раскрывает подсказка (title) — по наведению/долгому тапу. */
/* ⛳ S3.3: ветка «первый круг» УБРАНА вместе с loop.first — в линейном рекордере ● всегда начинает
   НОВУЮ ДОРОЖКУ, различать нечего. Класс 'first' больше не ставится (CSS-правило для него, если оно
   есть, просто перестаёт срабатывать — удалять его отдельно не требуется). */
function updRecBtn(){
  recBtn.disabled = editIsOpen();                               // S5.0: пока редактор открыт, ● отказывает. САМ отказ — в recorder.onRec (один на все входы), здесь только вид кнопки
  recBtn.classList.toggle('on', recording);                     // идёт запись (любая)
  recBtn.classList.toggle('armed', !recording && loop.on);      // песня играет: тап добавит дорожку
  recBtn.title = editIsOpen()
    ? t('roll.recBlocked')
    : recording
    ? t('rec.title.overdub',{n:loop.layer+1})
    : armedLayer()!=null ? t('rec.title.into',{n:armedLayer()+1})   // S3.5c: вооружена дорожка — ● пишет в неё, а не в новую
    : (loop.on ? t('rec.title.armed')
               : t('rec.title.idle'));
  loopBarsV.textContent = loop.bars;
}
function updLoopBtn(){ loopBtn.textContent = t(loop.on ? 'transport.loopPause' : 'transport.loopPlay'); }   // текст кнопки транспорта по состоянию (для смены языка и hooks.loop)
/* ⟳ ПОВТОР СКОБЫ (S3.5b). Состояние держит recorder, ui только переключает и отражает.
   ⛳ КНОПКА БОЛЬШЕ НЕ ПЕРЕОПРЕДЕЛЯЕТ ГРАНИЦ (в S3.4 каждое включение помечало всю песню заново): границы
   задаёт СКОБА на полосе лупера, кнопка их только включает и выключает. Выключил и включил — скоба там же. */
const rgnBtn=$('rgnBtn');
function updRgnBtn(){ rgnBtn.classList.toggle('on', regionOn()); }
rgnBtn.onclick=()=>{ setRegionOn(!regionOn()); updRgnBtn(); };
hooks.rec       = () => { updRecBtn(); syncTutorBarPos(); };   // запись вкл/выкл → коробка лупера появляется/меняется → переставить подсказку тура
hooks.loop      = on => { loopBtn.classList.toggle('on', on); updLoopBtn(); updRecBtn(); updRgnBtn(); refreshMetreCtl(); syncTutorBarPos(); };   // транспорт менялся → перечитать блокировку размера (пусто/играет), вид кнопки области И положение подсказки (коробка появилась/ушла)

/* ТРИ ПАНЕЛИ (звукоряд · звук и управление · лупер) — все оверлеи на ОДНОМ месте (сверху), поэтому
   открытой может быть РОВНО ОДНА. Лупер РАНЬШЕ жил снизу, чтобы холстовая сетка тактов оставалась
   видна при игре; теперь он тоже сверху (см. style.css) — сетку видно после закрытия.
   ⚠️ ВЗАИМНОЕ ЗАКРЫТИЕ СТАЛО ПРАВИЛОМ, А НЕ ПАРОЙ. Пока панелей было две, хватало «открыл одну —
   убрал другую», и это писалось руками в обеих функциях. С третьей такой приём даёт ШЕСТЬ ручных
   связей и ломается на первой забытой. Поэтому панели перечислены ОДИН РАЗ в PANELS, а showPanel
   гасит ВСЕ, кроме открываемой: добавить четвёртую = дописать строку в таблицу.
   ⚠️ У каждой панели своя РАБОТА ПРИ ОТКРЫТИИ (`on`) — состояние могло уйти вперёд, пока панель стояла
   закрытой. Она перечислена ЗДЕСЬ ЖЕ, рядом с самой панелью, чтобы не разъехаться с ней при переносе. */
/* ⛳ ЕДИНСТВЕННОЕ ПЕРЕЧИСЛЕНИЕ ПАНЕЛЕЙ В CSS-СЕЛЕКТОРЕ. Его читают ДВА разных потребителя: подсказка
   обучения (палец работает ВНУТРИ открытой панели → прячем полосу) и авто-скрытие верхнего бара (не
   сворачиваем, пока панель открыта). Раньше строка `'#panelScale.on, #panelLoop.on'` была вписана в
   одном месте, а вторая проверка перечисляла панели ЧЕРЕЗ classList — два независимых списка, которые
   при третьей панели разъехались бы молча. Теперь список ОДИН. */
const PANEL_SEL='#panelScale.on, #panelSound.on, #panelLoop.on';
const PANELS={
  scale:{ el:()=>panelScaleEl, btn:()=>scaleBtn, tutor:'scale' },
  /* ⛳ ПЕРЕСБОРКА ДИНАМИЧЕСКИХ СЕКЦИЙ ПЕРЕЕХАЛА СЮДА ВМЕСТЕ С НИМИ (разрез панели). Прежде её нёс
     showScale — просто потому, что «Функции рук» и конструктор жили в «Звукоряде». Теперь они здесь,
     и обязанность обязана быть здесь же: оставь её у «Звукоряда» — и секции пересобирались бы при
     открытии ЧУЖОЙ панели, а при открытии своей не пересобирались бы вовсе.
     ЗАЧЕМ она нужна (причина ЖИВАЯ, не историческая): браузер восстанавливает значения форм ПОСЛЕ
     отрисовки (перезагрузка/возврат в сессию), и переутвердить данные больше некому — без пересборки
     меню начинает ВРАТЬ про цепь и функции рук (звук при этом верен, что и делает баг незаметным).
     ⚠️ ВТОРАЯ причина, что тут была, СНЯТА В ПЛАСТЕ 3.5.1 — записываю, чтобы её не «починили» обратно:
     список эффектов строился из реестра ЖИВЫХ модулей, а тот заполняется в initAudio (по клику ▶),
     поэтому на чистой сессии реверба в списке НЕ БЫЛО. Теперь меню перечисляет эффекты по ФАБРИКЕ
     (FX_FACTORY), доступной с загрузки модуля, — дыра закрыта В ИСТОЧНИКЕ.
     ⚠️ ЗОВЁМ ОБЕ СЕКЦИИ ЯВНО (Пласт 3.4.1): конструктор не принадлежит «Функциям рук», и причина
     пересборки относится к нему НАПРЯМУЮ, а не по наследству от соседа. */
  sound:{ el:()=>panelSoundEl, btn:()=>soundBtn, tutor:'sound', open:()=>{ renderHandFn(); renderHandActs(); renderFxCtl(); } },
  loop: { el:()=>panelLoopEl,  btn:()=>loopPanelBtn, tutor:'loop', open:()=>refreshMetreCtl() },   // актуализируем блокировку размера: петля могла измениться при закрытой панели
};
function showPanel(key,on){
  for(const k in PANELS){
    const p=PANELS[k], el=p.el(), b=p.btn(), act = on && k===key;   // открываем ОДНУ, остальные гасим — второго правила нет
    el.classList.toggle('on',act);
    if(b) b.classList.toggle('on',act);
  }
  if(on){ const p=PANELS[key]; p.open && p.open();
    if(hooks.tutor) hooks.tutor('panel',{which:p.tutor}); }   // ЗАЦЕПКА ОБУЧЕНИЯ: открыли панель (уроки «Строи и тембры» / «Лупер»)
  syncTutorBarPos();
}
const showScale=on=>showPanel('scale',on);
const showSound=on=>showPanel('sound',on);
const showLoop =on=>showPanel('loop', on);
/* Подсказка тура (#tutorBar) сверху накрывается двумя вещами — РАЗНАЯ реакция (см. CSS .mini/.low/.hushed):
   (1) ОТКРЫТАЯ панель (top:52, z 14/15) → подсказку у НИЖНЕЙ кромки одной строкой (.mini): в НОРМАЛЬНОМ
       положении (top:56) она была бы ЗА панелью и нечитаема, поэтому .mini нужен как ЧИТАЕМОЕ положение,
       пока панель открыта. НО пока ПАЛЕЦ РАБОТАЕТ ВНУТРИ панели — прячем подсказку совсем (.hushed, ниже):
       на портретном телефоне панель занимает весь экран, и ЛЮБОЕ положение подсказки что-то накрывает;
       скрытие НА ВРЕМЯ КАСАНИЯ = ничего не накрыто, когда тянутся к контролу, а инструкция есть ДО и ПОСЛЕ.
       ПОЧЕМУ И .mini, И .hushed: .mini — читаемое положение в покое; .hushed — временно убрать под пальцем.
       ПОЧЕМУ НЕ иначе (чтобы не переспорить): прозрачная с кликом-насквозь — текст нечитаем поверх пёстрого
       меню, целиться вслепую; укоротить панель — зависит от высоты экрана, на низких не спасает; двигать
       подсказку — при полноэкранной панели двигать некуда.
   (2) ХОЛСТОВАЯ КОРОБКА ЛУПЕРА (drawLooper, y≈64, не панель; loop.on||events.length) БЕЗ панели → двигаем
       ПОЛНУЮ подсказку вниз (.low), чтобы не накрыть коробку сверху. Открытая панель имеет ПРИОРИТЕТ.
       Конфликт есть и ВНЕ тура (любой урок с играющей петлёй), поэтому по РЕАЛЬНОМУ состоянию лупера. Зовут:
       showScale/showLoop (панель) И hooks.rec/hooks.loop (лупер).
   ⚠️ РАНЬШЕ ЗДЕСЬ СТОЯЛО «вне тура бар display:none — классы безвредны». ЭТО БЫЛО НЕВЕРНО и стоило бага:
       правило .mini несло СВОЙ display:flex и перебивало базовое display:none по специфичности, поэтому
       открытие «Звукоряда» БЕЗ всякого урока выбрасывало пустую полосу с оранжевой кнопкой. Видимость
       решает РОВНО один класс .on; классы положения ставим ТОЛЬКО при нём (см. ранний выход ниже). */
const loopBoxShown=()=> loop.on || events.length>0;
const STRIP_RETURN_MS=1800;    // мс: подсказка возвращается через ~1.8с после того, как палец ушёл из панели (переживает паузы между штрихами прокрутки, но сама приходит быстро)
let stripReturnTimer=0;
function syncTutorBarPos(){
  const el=$('tutorBar'); if(!el) return;
  /* УРОК НЕ ИДЁТ (нет .on) → полосе тут делать нечего: снимаем ВСЕ классы положения и выходим. Раньше
     считалось, что «вне тура бар display:none — классы безвредны», и .mini вешался всегда. Это было
     НЕВЕРНО: правило .mini несло собственный display:flex и перебивало базовое display:none, поэтому
     открытие панели ВНЕ обучения выкидывало пустую полосу с оранжевой кнопкой. CSS теперь требует
     .on.mini, а здесь — второй замок: без урока классов не остаётся вовсе. */
  if(!el.classList.contains('on')){ clearTimeout(stripReturnTimer); el.classList.remove('mini','low','hushed'); return; }
  const panel=panelOpen();
  el.classList.toggle('mini', panel);                    // панель открыта → свёрнутая строка у нижней кромки
  el.classList.toggle('low', !panel && loopBoxShown());  // только коробка лупера (панели нет) → полную подсказку вниз
  if(!panel){ clearTimeout(stripReturnTimer); el.classList.remove('hushed'); }   // панель закрыта → подсказка ТОЧНО видима (снимаем «приглушение» и таймер возврата)
}
/* Реюз паттерна авто-скрытия #bar, только «наоборот»: активность ПРЯЧЕТ, покой ВОЗВРАЩАЕТ.
   ГЛАВНЫЙ сигнал — ФОКУС контрола панели (focusin/focusout), а НЕ pointerdown/up: у <select> нативный пикер
   съедает pointerup (подсказка возвращалась и снова накрывала селект — «не прячется»), а фокус приходит на
   селект надёжно и ДЕРЖИТСЯ, пока открыт пикер, поэтому пока контрол в фокусе — подсказка спрятана. pointerdown
   в панели тоже прячет (скролл/тап по кнопке/подписи, что не берут фокус). Возврат: focusout контрола ИЛИ
   pointerup, НО только когда в панели НИЧЕГО не в фокусе (иначе пикер ещё открыт — не возвращаем раньше времени).
   Новое касание/фокус → hush снова гасит таймер (пауза заново, без мигания между селектами/штрихами). */
function inOpenPanel(t){ return !!(t && t.closest && t.closest(PANEL_SEL)); }
function hushStrip(){ const el=$('tutorBar'); if(!el||!el.classList.contains('on'))return; clearTimeout(stripReturnTimer); el.classList.add('hushed'); }   // без урока класс не вешаем вовсе — нечего гасить
function armStripReturn(){ clearTimeout(stripReturnTimer); stripReturnTimer=setTimeout(()=>{ const el=$('tutorBar'); if(el)el.classList.remove('hushed'); }, STRIP_RETURN_MS); }
$('panelClose').onclick=()=>showScale(false);
$('panelCloseSound').onclick=()=>showSound(false);   // «Свернуть ✕» звука — тот же путь закрытия, что у кнопки бара и у взаимоисключения
$('panelCloseLoop').onclick=()=>showLoop(false);     // «Свернуть ✕» лупера — то же самое
scaleBtn.onclick=()=>showScale(!panelScaleEl.classList.contains('on'));
soundBtn.onclick=()=>showSound(!panelSoundEl.classList.contains('on'));
loopPanelBtn.onclick=()=>showLoop(!panelLoopEl.classList.contains('on'));
/* Кнопка учебника (#helpBtn) убрана из панели «Звукоряд» — #helpOv и его логика ЖИВЫ, но учебник
   ВРЕМЕННО недостижим из UI (переедет внутрь «Обучения», когда оно выйдет). Оставляем только
   закрытие: helpClose живёт внутри #helpOv и понадобится, как только оверлей снова начнут открывать. */
$('helpClose').onclick=()=>$('helpOv').classList.remove('on');

/* ===== АВТО-СКРЫТИЕ ВЕРХНЕЙ ПАНЕЛИ (#bar) =====
   Панель разрослась до ~10 кнопок и съедала игровое поле. Теперь она САМА сворачивается (класс .min,
   CSS): в свёрнутом виде на экране остаются ТОЛЬКО индикатор роли (одна кнопка, или ДВЕ половины при
   сплите — видно, что играет каждая) и три кнопки записи (🎥/🎙/●). Это ТЕ ЖЕ DOM-элементы, что в
   раскрытой панели — единый источник состояния, второго набора кнопок нет и рассинхрону неоткуда взяться.
   Раскрытие — любой тап по экрану (тач) или заметное движение мыши (порог MOUSE_EPS гасит дрожание);
   через BAR_HIDE_MS без действий — снова .min. НЕ сворачиваем, пока открыта ЛЮБАЯ панель (см. PANEL_SEL)
   ИЛИ зажат палец/курсор — иначе меню закрылось бы под рукой. Тап ТОЛЬКО показывает меню:
   игра идёт с камеры (жесты), ввод с тача не читает никто — раскрытие не крадёт жест и не рождает ноту. */
const barEl=$('bar');
const BAR_HIDE_MS=3500, MOUSE_EPS=8;            // BAR_HIDE_MS — авто-скрытие, мс; MOUSE_EPS — порог движения мыши, px
let barTimer=0, pointerDown=false, downOnBar=false, lastMX=null, lastMY=null;   // downOnBar — жест начат ПО кнопке бара (не раскрываем, см. pointerdown)
const panelOpen=()=>!!document.querySelector(PANEL_SEL);   // ЛЮБАЯ из трёх открыта → бар не сворачиваем (иначе меню закрылось бы под рукой)
function armBarHide(){
  clearTimeout(barTimer);
  barTimer=setTimeout(()=>{
    /* Меню выбора подложки держит бар РАЗВЁРНУТЫМ наравне с панелями: оно привязано к кнопке 🎵, а её
       свёрнутый бар прячет — меню обвалилось бы само из-под себя (открыто, а якорь исчез). */
    if(panelOpen()||backingMenuOpen()||pointerDown){ armBarHide(); return; }   // под рукой / открытая панель или меню — не сворачиваем, переставляем таймер
    barEl.classList.add('min');
  }, BAR_HIDE_MS);
}
function revealBar(){ barEl.classList.remove('min'); armBarHide(); }   // показать панель и перезавести таймер
/* ТАП ПО КНОПКЕ БАРА не раскрывает панель — пусть кнопка сработает НА МЕСТЕ. Иначе раскрытие снимало бы
   .min, бар в портрете переносился бы на ДВЕ строки (flex-wrap), а последняя кнопка (●) уезжала из-под
   пальца во вторую строку → click промахивался мимо неё; «нажать» и делало кнопку недостижимой. downOnBar
   держим весь жест (и в pointermove), чтобы дрожание пальца по кнопке тоже не раскрыло. Тап МИМО бара (по
   холсту) раскрывает как прежде — авто-скрытие/раскрытие для не-барных касаний не меняется. */
const focusInPanel=()=>inOpenPanel(document.activeElement);   // сейчас в фокусе контрол открытой панели? (нативный пикер держит фокус на <select>)
addEventListener('pointerdown', e=>{ pointerDown=true;
  downOnBar = !!(e.target && e.target.closest && e.target.closest('#bar button'));
  if(!downOnBar) revealBar();
  if(inOpenPanel(e.target)) hushStrip();          // касание ВНУТРИ открытой панели → подсказку прячем сразу (под пальцем ничего не должно быть накрыто)
});
/* ═══ ПЕРЕКЛЮЧАТЕЛИ ДОРОЖЕК на холстовой полосе лупера (слайс S1) ═══
   Разделение обязанностей ровно по правилам: ГЕОМЕТРИЮ знает draw (она же рисует — правило #9),
   СОСТОЯНИЕ держит recorder (правило #5), ui переводит тап в вызов и не считает ничего сам.
   ⚠️ ОТДЕЛЬНЫЙ СЛУШАТЕЛЬ, а не ветка в том, что выше: тот отвечает за раскрытие бара и обязан
   отработать при ЛЮБОМ тапе, в том числе по кнопке дорожки (бар раскрыть всё равно надо).
   ⚠️ Гейт по e.target===холст: тап по кнопке бара, панели или транспорту — не наше дело, а их
   элементы лежат ВЫШЕ холста по z-index, поэтому до нас такой тап и не дойдёт с этим target.
   Игру тап не крадёт: играют с КАМЕРЫ, тач не читает никто (см. довод у авто-скрытия бара выше). */
/* ⛳ СКОБА ПОВТОРА (S3.5b) — те же обязанности: где полоса скобы, знает draw (loopHit/loopBeatAt по loopView),
   границы держит и квантует до такта recorder (braceTap/braceMove), ui только передаёт долю.
   ТАП — рабочий путь САМ ПО СЕБЕ: ближний край едет на ближайшую линию такта. ПЕРЕТАСКИВАНИЕ — приятный
   довесок поверх того же: взятый касанием край (braceEdge) ведём по pointermove. Если браузер отдаст жест
   прокрутке (pointercancel), останется уже сделанный тап — ничего не сломано. */
let braceEdge=null;   // край, взятый касанием ('from'/'to'); держим до отпускания — иначе край «перескакивал» бы на ближний на каждом шаге
addEventListener('pointerdown', e=>{
  if(e.target!==canvasEl) return;
  if(rollOpen){ rollDown(e); return; }        // S5.0: открыт редактор — холст принадлежит ему (полосы лупера на экране нет, loopHit и так вернул бы null)
  const r=canvasEl.getBoundingClientRect();
  const h=loopHit(e.clientX-r.left, e.clientY-r.top);
  if(!h || h.what!=='del') laneDelCancel();                     // S3.5d: любой тап по холсту, кроме ✕, снимает взведённое удаление
  if(!h) return;
  if(h.what==='del'){ laneDelTap(h.layer); updRecBtn(); return; } // S3.5d: первый тап взводит, второй по тому же ✕ — удаляет (подсказка ● называет вооружённую дорожку — могла уйти)
  if(h.what==='brace'){ braceEdge=braceTap(h.beat); return; }   // null во время записи — тогда и тащить нечего
  if(h.what==='arm'){ toggleArm(h.layer); updRecBtn(); return; } // S3.5c: вооружить/снять; подсказку ● перечитать (она называет дорожку)
  if(h.what==='mute') toggleLaneMute(h.layer); else toggleLaneSolo(h.layer);
});
addEventListener('pointermove', e=>{
  if(braceEdge===null) return;
  const b=loopBeatAt(e.clientX-canvasEl.getBoundingClientRect().left);
  if(b===null){ braceEdge=null; return; }       // полоса пропала (клип/очистка) — жест кончился
  braceMove(braceEdge,b);                        // тот же такт — recorder сам ничего не тронет
});
addEventListener('pointerup',    ()=>{ braceEdge=null; });
addEventListener('pointercancel',()=>{ braceEdge=null; });

/* ═══ РЕДАКТОР ДОРОЖКИ: ПИАНО-РОЛЛ (слайс S5.0) ═══
   Обязанности — те же, что у полосы лупера, и ровно по тем же правилам: ГЕОМЕТРИЮ знает draw
   (rollHit/rollGeom — по снимку, который он сам и нарисовал, правило #9), ОТКАЗЫ и открытую дорожку
   держит recorder (editOpen/editLayer, правило #5), ui переводит жест в вызов и НИЧЕГО не считает сам.
   ⛳ КЛАМПЫ ОКНА ЖИВУТ ЗДЕСЬ, и это не случайность: пределы зависят от длины песни и размера такта, а их
   знает ui (он и так импортирует loop/songBeats). В state их дублировать нечем и незачем.
   ⛔ ПОКА РЕДАКТОР ОТКРЫТ: верхняя панель скрыта (она про игру), транспорт оставляет одну ▶ (класс .roll)
   — ⤺/✕/⟳/■ меняли бы песню под открытым редактором, вплоть до сноса самой открытой дорожки. */
const rollBar=$('rollBar'), rollBtn=$('rollBtn'), rollCloseBtn=$('rollClose'),
      rollTrackBtn=$('rollTrack'), rollTabsEl=$('rollTabs'),
      rollZoomInBtn=$('rollZoomIn'), rollZoomOutBtn=$('rollZoomOut'), loopTpEl=$('loopTransport'),
      rollInsBtn=$('rollIns'), rollDelBtn=$('rollDel'), rollUndoBtn=$('rollUndo'), rollRedoBtn=$('rollRedo'), rollSnapEl=$('rollSnap'), rollHomeBtn=$('rollHome'),
      rollScaleBtn=$('rollScale'), rollFrzBtn=$('rollFrz'), rollFrzStateEl=$('rollFrzState');   // F5: заморозка — в баре РЕДАКТОРА (на строке полосы лупера её ставить некуда: там уже три кнопки в 16 px)
const ROLL_ROLES=['dr','bs','ld','ch'];          // порядок вкладок: те, что правятся сегодня, — первыми
const ROLL_EDITABLE=['dr','bs'];                 // S5.5: бас — первая ВЫСОТНАЯ роль; соло и аккорды ждут своих слайсов
const trackLayers=()=>[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
const rollTotal=()=>Math.max(songBeats(), loop.metre*loop.bars);   // пустая песня — тоже поле: показываем окно подложки
function setRollWinClamped(b0,span){
  const M=loop.metre, total=rollTotal();
  const s=Math.max(M/2, Math.min(span, Math.max(M*4, total+M)));   // от полутакта до всей песни с запасом в такт
  setRollWin(Math.max(0, Math.min(b0, Math.max(0, total+M-s))), s);
  updRollBtns();          // шаг привязки зависит от МАСШТАБА — подпись обязана ехать вместе с ним
}
/* Панель редактора: дорожка и вкладки ролей со СЧЁТОМ НОТ. Счёт берём из того же songNotes, по которому
   рисует ролл, — иначе вкладка обещала бы ноты, которых на сетке нет. Правятся пока только ударные;
   прочие вкладки видны (счёт полезен) и выключены с причиной в title. */
function applyRollBar(){
  if(!rollOpen) return;
  const ly=editLayer();
  rollTrackBtn.textContent = ly==null ? '—' : t('roll.track',{n:ly+1});
  rollTrackBtn.disabled = trackLayers().length<2;
  const V=songNotes(), cnt={ld:0,ch:0,bs:0,dr:0};
  if(ly!=null) for(const n of V.notes) if(n.layer===ly && cnt[n.role]!=null) cnt[n.role]++;
  rollTabsEl.textContent='';
  for(const r of ROLL_ROLES){
    const b=document.createElement('button');
    const on=ROLL_EDITABLE.includes(r);
    b.className='tab'+(r===rollRole?' act':'');
    b.textContent=`${t('role.'+r)} · ${cnt[r]}`;
    if(!on){ b.disabled=true; b.title=t('roll.tabLater'); }
    else b.onclick=()=>{ if(r===rollRole) return;
      /* СМЕНА РОЛИ — смена ОСИ Y целиком: выделение, призрак и вертикальная прокрутка относятся к прежней
         оси и обязаны уйти. История правок НЕ чистится: она про дорожку, а не про роль. */
      setRollRole(r); setRollSel(null); setRollDrag(null); setRollScale(0); setRollRow0(rollDefaultRow0(r));
      applyRollBar(); };
    rollTabsEl.appendChild(b);
  }
  /* ЧИП ЛАДА — ТОЛЬКО когда ладов в дорожке больше одного (обычный случай — один, и машинерии на экране
     быть не должно). Имя лада резолвим через L(): оно локализуется, но группируемся мы по ССЫЛКЕ. */
  const gs=rollScaleGroups();
  rollScaleBtn.hidden = gs.length<2;
  if(gs.length>1){
    const i=Math.min(rollScale,gs.length-1), g=gs[i];
    rollScaleBtn.textContent=`${L(g.sc.name)} ${i+1}/${gs.length}`;
    rollScaleBtn.onclick=()=>{ setRollScale((i+1)%gs.length); setRollSel(null); setRollDrag(null); applyRollBar(); };
  }
  /* ⚠️ АДРЕС ПОЛОСЫ ЗДЕСЬ НЕ СБРАСЫВАЕМ: applyRollBar зовут и смена РОЛИ, и смена ЛАДА оси, и смена ЯЗЫКА,
     а полоса принадлежит ДОРОЖКЕ и переживает всё это. Сброс стоит там, где меняется дорожка (см. ниже
     rollTrackBtn и editOpen). Список адресов перестраиваем всегда — он зависит от захвата, а тот мог
     измениться правкой. */
  renderAutCtl(); updRollBtns();   // S5.1: сменилась дорожка — заново решить, что доступно (подложка только читается, история пуста)
}
/* Нижний видимый ряд по умолчанию: у баса ставим окно на РЕГИСТР, где он и играет (bassOctReg), — иначе
   открытая роль показывала бы пустой верх лада. Ударным прокрутка не нужна вовсе. */
function rollDefaultRow0(role){
  if(role==='dr') return 0;
  const g=rollGeom(), sc=(rollScaleGroups()[0]||{}).sc||CUR();
  const dpo=sc.iv.length+1, reg=Math.max(0,Math.min(3,rectOctReg(role)));
  const rows=g&&g.pitched?g.rows:8;
  return Math.max(0, Math.min(reg*dpo, 4*dpo-rows));
}
function openRoll(){
  /* Причины отказов называем словами, но САМ отказ держит recorder (editOpen): он — единственный,
     кто знает про запись и клип, и он же откажет любому будущему входу, не знающему про редактор. */
  if(recording){ showCamMsg(t('roll.refusedRec')); return; }
  if(activeKind()){ showCamMsg(t('roll.refusedClip')); return; }
  const ls=trackLayers(); if(!ls.length){ showCamMsg(t('roll.refusedEmpty')); return; }
  const arm=armedLayer();
  if(!editOpen(arm!=null?arm:ls[0])){ showCamMsg(t('roll.refusedRec')); return; }   // ВООРУЖЁННАЯ дорожка, иначе первая
  setRollOpen(true); setRollSel(null);
  setRollDrag(null); setRollIns(false);            // S5.1: сессия начинается без призрака и с ВЫКЛЮЧЕННОЙ вставкой — режим, переживший закрытие, однажды родил бы удар «сам собой»
  setRollRole('dr'); setRollScale(0); setRollRow0(0);   // S5.5: открываемся на ударных — роль, пережившая закрытие, показала бы чужую ось
  setRollWinClamped(0, loop.metre*8);              // стартовое окно — восемь тактов от начала песни
  barEl.classList.remove('on'); rollBar.classList.add('on'); loopTpEl.classList.add('roll');
  setRollAut(null); setRollAutSel(null); setRollAutDrag(null);   // O-4: редактор открывается с ЗАКРЫТОЙ полосой — адрес прошлой сессии к этой дорожке отношения не имеет
  applyRollBar(); updRecBtn();
}
function closeRoll(){
  if(!rollOpen) return;
  editClose(); setRollOpen(false); setRollSel(null); setRollDrag(null); setRollIns(false);   // S5.1: история правок умирает вместе с сессией (editClose), режим вставки и призрак — тоже
  setRollAut(null); setRollAutSel(null); setRollAutDrag(null);   // ⛳ и ПОЛОСА снимается здесь же: выбранная точка держит ссылку в ленту захвата, а дорожку могут удалить, пока редактор закрыт
  rollBar.classList.remove('on'); loopTpEl.classList.remove('roll');
  barEl.classList.add('on'); revealBar();          // игровое поле возвращается ровно таким, каким было: роль/лад/сплит/тембр никто не трогал
  updRecBtn();
}
rollBtn.onclick=openRoll;
rollCloseBtn.onclick=closeRoll;
/* Чип дорожки: следующая по кругу. Адресуем НОМЕРОМ СЛОЯ, но держит редактор её id (правило #27) —
   поэтому дорожка, исчезнувшая под редактором, даёт editLayer()===null, и ролл честно скажет об этом. */
rollTrackBtn.onclick=()=>{
  const ls=trackLayers(); if(ls.length<2) return;
  const i=ls.indexOf(editLayer());
  if(editSetLayer(ls[(i+1)%ls.length])){ setRollSel(null); setRollDrag(null); setRollScale(0);
    setRollAut(null); setRollAutSel(null); setRollAutDrag(null);   // O-4: адрес принадлежал ПРЕЖНЕЙ дорожке — на новой его может не быть вовсе
    applyRollBar(); }   // S5.5: у новой дорожки свои лады — номер группы от прежней бессмыслен
};
const rollZoomBy=k=>{ const g=rollGeom(); if(!g) return; const c=g.beat0+g.span/2, s=g.span*k; setRollWinClamped(c-s/2,s); };
rollZoomInBtn.onclick =()=>rollZoomBy(1/1.6);
rollZoomOutBtn.onclick=()=>rollZoomBy(1.6);
/* ═══ ПРАВКА (S5.1): кнопки, подпись сетки, отказ подложке ═══
   updRollBtns — ДЕШЁВЫЙ обновлятор (вкладки не пересобирает): его зовут после выделения, правки и смены
   масштаба. Подпись сетки читает ТУ ЖЕ rollSnap, по которой привязывается палец, — обещание и результат
   не могут разойтись. */
/* Подпись привязки (S5.2): она НЕ выбирает шаг, а ОТЧИТЫВАЕТСЯ о нём — шаг задан «Квантизацией» в панели
   лупера. Отдельно называем случай, когда сетка мельче, чем её можно нарисовать: иначе палец тянет к
   линиям, которых не видно, и это читается как «нота прыгает сама». */
function updRollBtns(){
  if(!rollOpen) return;
  const ro=editBackingOpen();
  rollInsBtn.classList.toggle('act', rollIns); rollInsBtn.disabled=ro;
  rollDelBtn.disabled  = ro || !(rollSel||rollAutSel);   // O-4: 🗑 удаляет ВЫБРАННОЕ — ноту или точку автоматизации; у человека одна кнопка «удалить»
  /* ⛳ И КОРЗИНА ГОВОРИТ, ЧТО ИМЕННО УБЕРЁТ. Одна кнопка на два поля — честно (у человека одно «удалить»),
     но молча она читается как «удалить удар», и точку автоматизации убрать ОТСЮДА никто не догадается.
     Подпись идёт за выделением; приоритет тот же, что у самого удаления (точка перебивает ноту). */
  rollDelBtn.title = t(rollAutSel ? 'aut.ptDelTitle' : 'roll.delTitle');
  rollUndoBtn.disabled = ro || !editCanUndo();
  rollRedoBtn.disabled = ro || !editCanRedo();   // S5.3: мёртвая кнопка выглядит мёртвой — иначе тап «не работает» без объяснения
  /* ⛳ ЗАМОРОЗКА (F5). Три состояния, различимые с одного взгляда: ❄ синяя — свежая, ❄ оранжевая —
     устарела (правили после заморозки; звучит СВОИМИ СОБЫТИЯМИ), серая — не заморожена.
     ⛔ Правка НЕ ЗАПРЕЩЕНА: человек затем и правит, чтобы переморозить. Поэтому кнопка при устаревании
     не блокируется, а меняет подпись на «Переморозить». */
  const fst=frzBusy?'busy':freezeState(editLayer());
  rollFrzBtn.disabled = frzBusy;   // ⛳ ПОДЛОЖКУ МОРОЗИТЬ МОЖНО: `ro` запрещает ПРАВКУ, а заморозка ничего не правит — это режим воспроизведения
  rollFrzBtn.classList.toggle('act',  fst==='fresh');
  rollFrzBtn.classList.toggle('warn', fst==='stale');
  rollFrzBtn.title = t(fst==='none'?'frz.freeze':fst==='stale'?'frz.refreeze':'frz.unfreeze');
  rollFrzStateEl.textContent = fst==='fresh'?'❄ '+t('frz.frozen') : fst==='stale'?'❄ '+t('frz.stale') : '';
  rollFrzStateEl.className = fst==='stale'?'warn':'';
  const s=rollSnap(), lbl = s.free ? t('roll.snapFree') : '1/'+Math.round(1/s.step);
  const hid = !s.free && !s.drawn;
  rollSnapEl.textContent='⌗ '+lbl+(hid?' '+t('roll.snapHidden'):'');
  rollSnapEl.title=t('roll.snapTitle',{ s:lbl });
}
/* Подложка — только чтение, и отказ ГОВОРИТ ПОЧЕМУ (молчащая кнопка читается как поломка). Сам отказ
   продублирован в recorder (editGuard): кнопка — вежливость, инвариант — там. */
const rollRefuseRO=()=>{ if(editBackingOpen()){ showCamMsg(t('roll.readOnly')); return true; } return false; };
/* ═══ ПОЛОСА АВТОМАТИЗАЦИИ: ОРГАНЫ УПРАВЛЕНИЯ (слайс O-4) ═══
   ⛳ ОДИН СЕЛЕКТ ВМЕСТО «ТУМБЛЕР + ВЫБОР»: первый пункт «— нет —» закрывает полосу, остальные её
   открывают на своём адресе. Состояния «полоса открыта, но непонятно что показывает» не существует, и
   в тесной панели редактора это ещё и одна строка вместо двух.
   ⚠️ СПИСОК — ТОЛЬКО ЦЕПИ ЭТОЙ ДОРОЖКИ. autAddrs отбирает адреса по РОЛЯМ её событий — тем же отбором,
   которым сводка захвата (captureInfoOf) перестала рекламировать басовой дорожке делей соло. Второго
   правила «чьё это» не заводим. */
const rollAutEl=$('rollAutSel'), rollFxAddEl=$('rollFxAdd'),
      rollFxUpEl=$('rollFxUp'), rollFxDnEl=$('rollFxDn'), rollFxDelEl=$('rollFxDel');
const autAddrKey=a=>a?a.key+'|'+a.fx+'|'+a.p:'';
function renderAutCtl(){
  if(!rollAutEl||!rollFxAddEl||!rollFxUpEl||!rollFxDnEl||!rollFxDelEl) return;   // органы приходят из разметки парой — проверяем все, чтобы половина не осталась неинициализированной
  const ly=editLayer(), addrs= ly==null?[] : autAddrs(ly);
  rollAutEl.textContent='';
  const none=document.createElement('option'); none.value=''; none.textContent=t('aut.none');
  rollAutEl.appendChild(none);
  /* Группируем ПО ЭФФЕКТУ и в ПОРЯДКЕ ЦЕПИ: с O-1 порядок слышен, и список — заодно его показ.
     Второго места, где виден порядок дорожки, не заводим — этого достаточно. */
  let grp=null, lastFx=null;
  for(const a of addrs){
    if(a.fx!==lastFx){ lastFx=a.fx; grp=document.createElement('optgroup'); grp.label=fxTitleOf(a.fx); rollAutEl.appendChild(grp); }
    const o=document.createElement('option'); o.value=autAddrKey(a); o.textContent=t(a.labelKey||a.p);
    grp.appendChild(o);
  }
  const cur=autAddrKey(rollAut);
  rollAutEl.value = addrs.some(a=>autAddrKey(a)===cur) ? cur : '';
  if(!rollAutEl.value && rollAut){ setRollAut(null); setRollAutSel(null); }   // показанный адрес исчез (убрали эффект) — полоса честно закрывается
  /* ⛳ «ДОБАВИТЬ ЭФФЕКТ ДОРОЖКЕ» — вычитаем уже стоящие, ровно как это делает панель живой цепи.
     ⛔ Владелец — роль, в которой дорожка ИГРАЛА. Их может быть несколько (дорожка не типизирована
     ролью); берём первую по порядку появления и пишем в её цепь — тот же владелец, что показан в списке
     выше. Выбор «в чью именно цепь» отдельным контролом — отдельная работа, здесь не заводим. */
  const key=autOwnerKey(ly);
  rollFxAddEl.textContent='';
  const head=document.createElement('option'); head.value=''; head.textContent=t('aut.add');
  rollFxAddEl.appendChild(head);
  if(key){ const have=new Set(autChainOf(ly,key));
    for(const id of fxAddableIds()) if(!have.has(id)){
      const o=document.createElement('option'); o.value=id; o.textContent=fxTitleOf(id); rollFxAddEl.appendChild(o); } }
  rollFxAddEl.value='';
  const ro = ly==null || editBackingOpen() || !key;
  rollFxAddEl.disabled=ro;
  const chain= key?autChainOf(ly,key):[], i= rollAut?chain.indexOf(rollAut.fx):-1;
  rollFxUpEl.disabled  = ro||i<0||i===0;
  rollFxDnEl.disabled  = ro||i<0||i>=chain.length-1;
  rollFxDelEl.disabled = ro||i<0;
}
/* Владелец цепи, которую правит редактор у этой дорожки. Один на дорожку и выводится из её событий —
   второго источника «чья это цепь» в редакторе нет. */
function autOwnerKey(ly){
  if(ly==null) return null;
  const a=autAddrs(ly)[0];
  if(a) return a.key;
  const cap=captureInfoOf(ly);                                   // цепь пуста (сухая дорожка) — владельца берём у ролей самой дорожки
  return cap&&cap.roles&&cap.roles.length ? chainKeyOf(cap.roles[0]) : null;
}
if(rollAutEl){
  rollAutEl.onchange=e=>{
    const v=e.target.value, ly=editLayer();
    const a = v&&ly!=null ? autAddrs(ly).find(x=>autAddrKey(x)===v) : null;
    setRollAut(a||null); setRollAutSel(null); setRollAutDrag(null);
    renderAutCtl(); updRollBtns();
  };
  rollFxAddEl.onchange=e=>{
    const id=e.target.value, ly=editLayer(), key=autOwnerKey(ly);
    e.target.value='';
    if(!id||ly==null||!key) return;
    if(rollRefuseRO()) return;
    if(autChainAdd(ly,key,id)){
      const a=autAddrs(ly).find(x=>x.fx===id);                   // открываем полосу на ПЕРВОМ параметре добавленного: иначе «добавил и не видно»
      if(a){ setRollAut(a); setRollAutSel(null); }
    }
    renderAutCtl(); updRollBtns();
  };
  const fxMove=d=>{ const ly=editLayer(), key=autOwnerKey(ly);
    if(ly==null||!key||!rollAut||rollRefuseRO()) return;
    autChainMove(ly,key,rollAut.fx,d); renderAutCtl(); updRollBtns(); };
  rollFxUpEl.onclick=()=>fxMove(-1);
  rollFxDnEl.onclick=()=>fxMove(1);
  rollFxDelEl.onclick=()=>{ const ly=editLayer(), key=autOwnerKey(ly);
    if(ly==null||!key||!rollAut||rollRefuseRO()) return;
    autChainRemove(ly,key,rollAut.fx);
    setRollAut(null); setRollAutSel(null); renderAutCtl(); updRollBtns(); };
}

rollInsBtn.onclick =()=>{ if(rollRefuseRO()) return; setRollIns(!rollIns); updRollBtns(); };
rollDelBtn.onclick =()=>{ if(rollRefuseRO()) return;
  /* ⛳ O-4: ОДНА КНОПКА «УДАЛИТЬ» НА ОБА ПОЛЯ, и ПОРЯДОК ВЕТВЕЙ И ЕСТЬ ПРИОРИТЕТ. Второй корзины не
     заводим: у человека одна «удалить», и она обязана снимать выбранное — что бы это ни было.
     ⚠️ ЗДЕСЬ БЫЛ БАГ, И ОН ПОУЧИТЕЛЕН: первой строкой стоял страж `if(!rollSel)` от времён, когда
     выделение было одно — нотное. Ветка точки автоматизации лежала НИЖЕ него и была недостижима: выбрать
     точку можно только тапом по полосе, а он снимает выделение ноты, так что страж срабатывал всегда.
     Кнопка при этом выглядела живой (её ДОСТУПНОСТЬ про полосу знала) и отказывала нотной фразой —
     классическая рассинхронизация «кто включает» и «кто выполняет». Страж теперь ОДИН на два поля и
     стоит ПОСЛЕДНИМ, а не первым. */
  if(rollAutSel){ if(autDeletePoint(rollAutSel)) setRollAutSel(null); updRollBtns(); return; }
  if(!rollSel){ showCamMsg(t('roll.needSel')); return; }
  /* ⛳ УДАЛЕНИЕ ВЕДЁТ РОЛЬ: у ударных это одиночное событие, у баса — СЕГМЕНТ (ведение в середине уходит
     одно, и прежняя высота тянется дальше; «вкл» уносит всю ноту — см. editDeleteSeg). */
  const ok = rollRole==='dr' ? editDeleteHit(rollSel) : editDeleteSeg(rollSel);
  if(ok) setRollSel(null);
  updRollBtns(); };
rollUndoBtn.onclick=()=>{ if(rollRefuseRO()) return; if(editUndo()){ setRollSel(null); setRollAutSel(null); } renderAutCtl(); updRollBtns(); };   // O-4: ход мог создать или снять точку — выделение и список адресов перестраиваем
rollRedoBtn.onclick=()=>{ if(rollRefuseRO()) return; if(editRedo()){ setRollSel(null); setRollAutSel(null); } renderAutCtl(); updRollBtns(); };
/* ═══════════ ⛳ ЗАМОРОЗКА ДОРОЖКИ (F5) ═══════════
   ⛳ ОДНА КНОПКА НА ТРИ ДЕЙСТВИЯ, ПО СОСТОЯНИЮ: не заморожена → заморозить; устарела → ПЕРЕМОРОЗИТЬ;
   свежая → разморозить. Так у человека одна ❄, а не три кнопки, из которых две всегда мертвы.
   ⛳ РЕНДЕРНЫЙ МОДУЛЬ ТЯНЕМ ЛЕНИВО, ПРЯМО ЗДЕСЬ. Он поднимает ВТОРУЮ КОПИЮ ДВИЖКА (десятки узлов), и
   платить за неё должен только тот, кто нажал ❄. ⛔ Статическим импортом его тянуть нельзя: он попал
   бы в стартовую загрузку всем, включая тех, кто заморозкой не пользуется.
   ⚠️ ЖДАТЬ ПРИДЁТСЯ ПО-НАСТОЯЩЕМУ (около 1.5× реального времени на плотной дорожке), поэтому:
     • прогресс НАСТОЯЩИЙ там, где браузер даёт suspend у офлайн-контекста, и ЧЕСТНО НЕОПРЕДЕЛЁННЫЙ,
       где не даёт. ⛔ Выдуманных процентов не показываем;
     • кнопка на время рендера ВЫКЛЮЧЕНА, а всё остальное приложение работает как обычно — можно
       играть, можно закрыть редактор. ⚠️ ОТМЕНИТЬ РЕНДЕР НЕЛЬЗЯ: у startRendering нет прерывания, и
       перестань мы ждать промис, процессор всё равно доработает до конца. Кнопки «отмена» поэтому НЕТ —
       она была бы враньём; повторное нажатие ❄ во время ожидания просто отклоняется с этой надписью. */
let frzBusy=false, frzNoticeShown=false;
async function onFreeze(){
  /* ⛔ БЕЗ rollRefuseRO: заморозка — НЕ ПРАВКА. Подложка read-only для редактирования, но её буфер
     ничем не хуже любого другого, а снимется он вместе с ней (clearJam → lanePrune → freezeDrop). */
  if(frzBusy){ showCamMsg(t('frz.noCancel')); return; }
  const ly=editLayer(); if(ly==null) return;
  if(freezeState(ly)==='fresh'){ unfreezeLayer(ly); showCamMsg(t('frz.dropped')); updRollBtns(); return; }
  /* ⚠️ ОДНОРАЗОВОЕ ИЗВЕСТИЕ. Дорожка со вставленными в редакторе нотами шла ЗА ЖИВОЙ ЦЕПЬЮ; заморозка
     ПРИКАЛАЧИВАЕТ её к цепи в том виде, как та стоит сейчас. Звук не меняется, но живые ручки до неё
     больше не дотянутся — до сих пор это происходило МОЛЧА. Говорим один раз за сессию. */
  if(freezePinCaptures(ly) && !frzNoticeShown){ frzNoticeShown=true; showCamMsg(t('frz.pinned')); }
  frzBusy=true; updRollBtns(); showCamMsg(t('frz.working'));
  try{
    const R=await import('./render.js');
    await R.freeze(ly, { onProgress:p=>{ showCamMsg(p==null?t('frz.working'):t('frz.workingPct',{pct:Math.round(p*100)})); } });
    showCamMsg(t('frz.done'));
  }catch(e){ showCamMsg(t('frz.failed',{msg:(e&&e.message)?e.message:String(e)})); }
  finally{ frzBusy=false; updRollBtns(); }
}
rollFrzBtn.onclick=onFreeze;   // S5.3: возврат правки; выделение снимаем — оно могло указывать на то, чего сейчас нет
/* ⏮ — бегунок в начало. ТОТ ЖЕ seekTo, что и тап по линейке: перемотка одна на все входы (она сама решает,
   идёт ли транспорт, гасит голоса дорожек и сбрасывает курсоры). Второго пути перемотки не заводим. */
rollHomeBtn.onclick=()=>seekTo(0);
/* ЖЕСТ: один палец — прокрутка, два — зум, тап без движения — выбор.
   ⛳ ЯКОРЬ: доля под пальцем (под серединой между пальцами) остаётся на месте — считаем её по ТЕКУЩЕМУ
   снимку (rollGeom) и пишем через сеттеры. Следующий кадр строит снимок из этих же чисел, поэтому
   картинка и попадание не могут разъехаться ни на одном кадре. */
/* ⛳ ВЫДЕЛЕНИЕ В РЕДАКТОРЕ ОДНО, ХОТЯ ПОЛЕЙ ДВА. Держать его в двух переменных законно (у ноты и у точки
   автоматизации разная природа), но ВЫБРАННЫМ может быть ровно одно — иначе «удалить» перестаёт значить
   что-то определённое. Прежде связь была ОДНОСТОРОННЕЙ: тап по полосе снимал выделение ноты, а тап по
   ноте оставлял выбранную точку висеть, и корзина (у которой точка в приоритете) убрала бы НЕ ТО, на что
   человек смотрит. Теперь взаимное исключение — в одном месте, а не в семи местах жеста. */
const selNote =ev => { setRollSel(ev||null);  setRollAutSel(null); };
const selAutPt=rec=> { setRollAutSel(rec||null); setRollSel(null); };
const rollPts=new Map(); let rollPan=null, rollZoomBase=null, rollMoved=false, rollGrab=null;   // rollGrab — взятый пальцем удар (перетаскивание); пока он есть, поле НЕ прокручивается
const rollXY=e=>{ const r=canvasEl.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; };
function rollDown(e){
  const p=rollXY(e); rollPts.set(e.pointerId,p);
  const g=rollGeom(); if(!g) return;
  if(rollPts.size===1){
    rollMoved=false;
    const h=rollHit(p.x,p.y);
    /* ⛳ ЛИНЕЙКА (S5.2): тап = ПЕРЕМОТКА, и только тап. ⛔ Перетаскивание бегунка НЕ делаем: оно обещало бы
       скрабинг (звук под пальцем), а это отдельная работа; вдобавок при идущем транспорте каждый seekTo
       перезапускает насос — тянущийся палец давал бы череду перезапусков и заикание. Полуинтерактивной
       ручки не заводим: тап честно делает ровно то, что обещает. Ни выбора, ни вставки здесь нет — полоса
       своя (её низ = верх сетки), поэтому один тап не может значить двух вещей. */
    if(h&&h.what==='ruler'){ seekTo(h.beat); return; }
    /* ⛳ O-4: ПОЛОСА АВТОМАТИЗАЦИИ. Палец на ТОЧКЕ — берём её (ось жеста решит, время это или величина:
       см. rollAutDrive); палец на пустом месте полосы — это не прокрутка поля и не вставка ноты: полоса своя, и
       прокручивать по вертикали в ней нечего. Тап по пустому в режиме вставки родит точку (на отпускании,
       как и у нот), тап без режима — снимет выделение. */
    if(h&&(h.what==='autpt'||h.what==='autgrid')){
      if(h.what==='autpt'&&!editBackingOpen()){
        selAutPt(h.rec);
        /* t0/v0 — ИСХОДНЫЕ время и величина точки: ось жеста замораживает одну из них, а величина
           вдобавок ведётся ОТНОСИТЕЛЬНО v0 (см. rollAutDrive). axis/fine — память жеста, её пишет
           draw: там геометрия, и второй копии порогов в ui быть не должно. */
        rollGrab={ aut:h.rec, dt:h.beat-h.rec.pt.t, x:p.x, y:p.y,
                   t0:h.rec.pt.t, v0:h.rec.pt.v, axis:null, fine:null };
        setRollAutDrag({ t:h.rec.pt.t, v:h.rec.pt.v, axis:null, fine:false });
      }else{ selAutPt(null); }                                 // тап по пустому месту полосы — выбранного больше нет ни в одном поле
      rollPan={ aut:true, x:p.x, y:p.y, atBeat:0, row0:0 };   // помечаем жест как «в полосе»: горизонтальная прокрутка поля отсюда НЕ идёт
      updRollBtns(); return;
    }
    /* Палец лёг НА УДАР → берём его: dt — смещение точки касания от самого удара, чтобы он не прыгал
       под пальцем. Подложку двигать нельзя — там тап только выделяет. */
    /* Палец лёг НА НОТУ (удар или сегмент баса) → берём её. dt — смещение точки касания от начала ноты,
       чтобы она не прыгала под пальцем; len — длина сегмента, её держит призрак. */
    if(h&&(h.what==='hit'||h.what==='seg')&&!editBackingOpen()){
      const isSeg=h.what==='seg';
      const row = isSeg ? h.row : (h.ev.a.row|0);
      selNote(h.ev);
      /* ⛳ КРАЙ = ДЛИНА, СЕРЕДИНА = ПЕРЕНОС (S5.6). Какой это жест, решает ТОТ ЖЕ hit-test, что нарисовал
         блок (h.edge), — второй геометрии «где тут край» в ui не заводим. */
      rollGrab={ ev:h.ev, seg:isSeg?h.seg:null, mode:(isSeg&&h.edge)?'len':'move',
                 dt:h.beat-h.ev.t, row, x:p.x, y:p.y,
                 len: isSeg ? ((h.seg.end==null?h.beat+1:h.seg.end)-h.seg.start) : 0 };
      setRollDrag({ ev:h.ev, t:h.ev.t, row, len:rollGrab.len });
      updRollBtns(); return;
    }
    selNote(h&&(h.what==='hit'||h.what==='seg')?h.ev:null); updRollBtns();
    rollPan={ atBeat:g.beat0+g.span*((p.x-g.x0)/g.bw), x:p.x, y:p.y, y0:p.y, row0:g.row0 };
  }
  else if(rollPts.size===2){ rollPan=null; rollGrab=null; setRollDrag(null); setRollAutDrag(null);   // второй палец → это зум, а не перенос: призраки снимаем (и ноты, и точки автоматизации), событие не тронуто
    const [a,b]=[...rollPts.values()], mid=(a.x+b.x)/2;
    rollZoomBase={ dist:Math.max(1,Math.abs(a.x-b.x)), span:g.span, midBeat:g.beat0+g.span*((mid-g.x0)/g.bw) };
  }
}
function rollMove(e){
  if(!rollPts.has(e.pointerId)) return;
  const p=rollXY(e); rollPts.set(e.pointerId,p);
  const g=rollGeom(); if(!g) return;
  if(rollPts.size>=2&&rollZoomBase){
    const [a,b]=[...rollPts.values()], d=Math.max(1,Math.abs(a.x-b.x)), mid=(a.x+b.x)/2;
    const span=rollZoomBase.span*rollZoomBase.dist/d;                     // развели пальцы — окно уже
    setRollWinClamped(rollZoomBase.midBeat-span*((mid-g.x0)/g.bw), span);
    rollMoved=true; return;
  }
  /* ПЕРЕТАСКИВАНИЕ — ТОЛЬКО ПРЕДПРОСМОТР: пишем в rollDrag, а событие правим один раз на отпускании.
     Писать на каждом движении значило бы пересобирать ноты всей песни десятки раз в секунду. */
  if(rollGrab&&rollGrab.aut){
    if(Math.abs(p.x-rollGrab.x)>4||Math.abs(p.y-rollGrab.y)>4) rollMoved=true;
    /* ⛳ ОДИН ЖЕСТ — ОДНА ОСЬ. rollAutDrive решает, что правится (время или величина), и отдаёт величину
       с учётом ЗОНЫ ТОЧНОСТИ. Замороженная ось отдаёт ИСХОДНОЕ значение, поэтому «перенёс во времени» не
       смещает величину на полделения, а «уточнил величину» не таскает точку по такту. Отход в сторону
       значит РОВНО ОДНО за жест: при оси 't' — время, при оси 'v' — тонкость; решается это один раз, на
       первых 6 пикселях, и до отпускания не меняется.
       ⛳ ВРЕМЯ ТОЧКИ — СВОБОДНОЕ, БЕЗ КВАНТИЗАЦИИ, И ЭТО ЗАКОН ЭТОГО ПОЛЯ, А НЕ НАСТРОЙКА. Полоса
       унаследовала было нотное правило (квантизация вкл ⇒ привязка), но у ноты и у точки разная природа:
       НОТА обязана лечь на долю, иначе рассыпается ритм, а кривая эффекта долям не принадлежит вовсе —
       реверс может начать расти где угодно, и в этом весь смысл ведения ручкой. Привязку к сетке тут
       нечем оправдать, поэтому её здесь просто нет — ни режимом, ни настройкой (см. отчёт).
       ⛔ НОТЫ НЕ ТРОГАЕМ: ветка переноса ноты ниже по-прежнему зовёт rollSnapBeat(rollSnap()). */
    const d=rollAutDrive(rollGrab,p.x,p.y);
    const raw=g.beat0+g.span*((p.x-g.x0)/g.bw)-rollGrab.dt;
    setRollAutDrag({ t: d.axis==='t' ? Math.max(0,raw) : rollGrab.t0,
                     v: d.v, axis:d.axis, fine:d.fine });
    return;
  }
  if(rollGrab){
    if(Math.abs(p.x-rollGrab.x)>4||Math.abs(p.y-rollGrab.y)>4) rollMoved=true;
    /* ДЛИНА: ведём ТОЛЬКО правый край — начало и ряд стоят. Призрак показывает будущую длину той же
       парой (t, len), которой рисуется настоящий сегмент. */
    if(rollGrab.mode==='len'){
      const s=rollGrab.seg;
      const end=rollSnapBeat(g.beat0+g.span*((p.x-g.x0)/g.bw), rollSnap());
      setRollDrag({ ev:rollGrab.ev, t:s.start, row:rollGrab.row, len:Math.max(1/32,end-s.start) });
      return;
    }
    const raw=g.beat0+g.span*((p.x-g.x0)/g.bw)-rollGrab.dt;
    const h=rollHit(p.x,p.y);
    /* ⚠️ РЯД БЕРЁМ ТОЛЬКО У СЕТКИ. С S5.2 rollHit отвечает ещё и ЛИНЕЙКОЙ ({what:'ruler'}), а у неё ряда
       нет вовсе: палец, уехавший при переносе вверх за сетку, записал бы row:undefined — удар, который
       не звучит и не рисуется. Вне сетки (линейка, промах) ряд остаётся прежним. */
    if(h&&(h.what==='hit'||h.what==='grid'||h.what==='seg')) rollGrab.row=h.row;
    setRollDrag({ ev:rollGrab.ev, t:rollSnapBeat(raw, rollSnap()), row:rollGrab.row, len:rollGrab.len });   // S5.2: привязка — по КВАНТИЗАЦИИ (или её нет вовсе)
    return;
  }
  if(rollPan&&rollPan.aut){ if(Math.abs(p.x-rollPan.x)>4||Math.abs(p.y-rollPan.y)>4) rollMoved=true; return; }   // O-4: палец ведёт по ПОЛОСЕ — поле нот не трогаем (у полосы своя работа)
  if(rollPan){
    if(Math.abs(p.x-rollPan.x)>4||Math.abs(p.y-rollPan.y)>4) rollMoved=true;   // порог: дрожание пальца — всё ещё тап
    setRollWinClamped(rollPan.atBeat-g.span*((p.x-g.x0)/g.bw), g.span);
    /* ВЕРТИКАЛЬНАЯ ПРОКРУТКА (S5.5) — тем же пальцем: у ладовой роли рядов больше, чем влезает. Считаем в
       РЯДАХ по высоте ряда из снимка, поэтому сетка едет ровно за пальцем. У ударных rowH таков, что
       total===rows, и клампы в draw/здесь оставляют row0 нулём — прокрутки просто нет. */
    if(g.pitched) setRollRow0(Math.max(0, Math.min(g.total-g.rows, rollPan.row0 + Math.round((p.y-rollPan.y0)/g.rowH))));
  }
}
function rollUp(e){
  if(!rollPts.has(e.pointerId)) return;
  rollPts.delete(e.pointerId);
  if(rollPts.size<2) rollZoomBase=null;
  if(rollPts.size) return;                                                // второй палец ещё на стекле — жест не кончился
  /* ОТПУСКАНИЕ ПЕРЕТАСКИВАНИЯ — ЕДИНСТВЕННОЕ место, где перенос попадает в песню. Сравниваем с исходными
     временем и рядом: тап по удару (без движения) правкой не считается и в историю отмены не идёт. */
  if(rollGrab&&rollGrab.aut){
    /* ОТПУСКАНИЕ — ЕДИНСТВЕННОЕ место, где перенос точки попадает в захват (тот же закон, что у нот:
       на каждом движении пересобирать ленту переигровки нельзя). autMovePoint сам откажет, если точка
       не сдвинулась, — «правка», которая ничего не двигает, засорила бы историю отмены. */
    const d=rollAutDrag;
    if(d) autMovePoint(rollGrab.aut.pt, d.t, d.v);
    setRollAutDrag(null); rollGrab=null; rollPan=null; updRollBtns(); return;
  }
  if(rollGrab){
    const gd=rollGrab && rollDrag;
    /* ⚠️ ВРЕМЯ СРАВНИВАЕМ С ДОПУСКОМ, а не по равенству: шаг привязки бывает троичным (1/3, 1/6 при
       loop.sub=3), и снапнутая доля не обязана совпасть с хранимой ПОБИТОВО. Точное сравнение записывало бы
       «правку», которая ничего не двигает, — а на экране это выглядит как «нажал ↶, и ничего не произошло». */
    if(gd){
      if(rollGrab.mode==='len'){
        /* Длина — это ВРЕМЯ КОНЦА сегмента; какое событие его несёт и куда его можно двигать, решает
           recorder (editResizeSeg: тот же страж порядка по ключу, что и у переноса). */
        const s=rollGrab.seg, ne=s.start+gd.len;
        if(Math.abs(ne-(s.end==null?ne:s.end))>1e-9) editResizeSeg(s.ev, ne);
      }
      else if(rollGrab.seg){
        /* БАС: переносим СЕГМЕНТ — его время и/или высоту. Ряд расшифровываем ТОЙ ЖЕ формулой, что рисует
           ряды (rollRowPitch по ладу ОСИ), а лад события не трогаем вовсе — правка в чужом ладу не смеет
           переписать ноту на живой (правило #7). */
        const g2=rollGeom(), pit=rollRowPitch(gd.row, g2&&g2.sc);
        const s=rollGrab.seg;
        if(Math.abs(gd.t-s.ev.t)>1e-9 || pit.deg!==s.deg || pit.oct!==s.oct) editMoveSeg(s.ev, gd.t, pit.deg, pit.oct);
      }else if(Math.abs(gd.t-rollGrab.ev.t)>1e-9 || gd.row!==(rollGrab.ev.a.row|0)) editMoveHit(rollGrab.ev, gd.t, gd.row);
    }
    setRollDrag(null); rollGrab=null; rollPan=null; updRollBtns(); return;
  }
  if(!rollMoved&&rollPan&&rollPan.aut){
    const h=rollHit(rollPan.x,rollPan.y), ly=editLayer();
    /* ВСТАВКА ТОЧКИ — как у нот: ТОЛЬКО в явном режиме и только по ПУСТОМУ месту полосы. Тап без режима
       снимает выделение. Так прокрутка, кончившаяся тапом, ничего не создаёт. */
    if(rollIns && h && h.what==='autgrid' && rollAut && ly!=null && !rollRefuseRO()){
      /* Вставка — по ТОМУ ЖЕ закону, что и перенос: точка ложится ТУДА, КУДА ПОСТАВИЛИ, без привязки ко
         времени. Иначе одно и то же поле жило бы по двум правилам — свободный перенос и квантованная
         вставка, — и человек не смог бы сказать, где точка окажется. Величина привязывается к десятой:
         у ВЕЛИЧИНЫ круглый шаг осмыслен (0..100), у времени — нет. */
      const pt=autAddPoint(ly, rollAut.key, rollAut.fx, rollAut.p,
                           Math.max(0,h.beat), rollAutSnapV(h.v));
      if(pt){ const D=autPoints(ly,rollAut.key,rollAut.fx,rollAut.p);
              selAutPt(D.pts.find(r=>r.pt===pt)||null); }
    }
    updRollBtns(); rollPan=null; return;
  }
  if(!rollMoved&&rollPan){
    const h=rollHit(rollPan.x,rollPan.y);
    /* ВСТАВКА — только в явном режиме и только по ПУСТОЙ клетке. Без режима тап по пустому месту просто
       снимает выделение (прокрутка, кончившаяся тапом, ничего не создаёт). */
    if(rollIns && h && h.what==='grid'){
      /* S5.2: вставка по тому же правилу, что и перенос. Квантизация выключена → удар встаёт РОВНО туда,
         где тапнули (сетки нет — и выдумывать её нечем); включена → на ближайшую линию квантизации. */
      if(!rollRefuseRO()){
        const tt=rollSnapBeat(h.beat, rollSnap());
        let ev;
        if(rollRole==='dr') ev=editInsertHit(tt, h.row);
        else{
          /* ⛳ ЛАД ВСТАВЛЕННОЙ НОТЫ — ЛАД ПОКАЗАННОЙ ОСИ, а не живой: нота рождается там, где её нарисовали.
             Пустая роль группы не имеет — тогда честно берём живой лад (новый материал в текущем строе). */
          const g2=rollGeom(), gs=rollScaleGroups(), G=gs[Math.min(rollScale,Math.max(0,gs.length-1))];
          const sc=(G&&G.sc)||CUR(), sev=G?G.sev:seventh;   // есть группа — её замороженный септаккорд; роль пуста — живой (новый материал в текущем строе)
          const pit=rollRowPitch(h.row, sc);
          const s=rollSnap(), len=s.free?1:Math.max(s.step,1);
          ev=editInsertBass(tt, pit.deg, pit.oct, sc, sev, len);
        }
        if(ev) selNote(ev);
      }
    }else selNote(h&&(h.what==='hit'||h.what==='seg')?h.ev:null);
    updRollBtns();
  }
  rollPan=null;
}
addEventListener('pointermove',  e=>{ if(rollOpen) rollMove(e); });
addEventListener('pointerup',    e=>{ if(rollOpen) rollUp(e); });
addEventListener('pointercancel',e=>{ if(rollOpen) rollUp(e); });
/* Десктоп: колесо — прокрутка, с Ctrl/⌘ — зум ПОД КУРСОРОМ (тот же якорь, что у двух пальцев). */
addEventListener('wheel', e=>{
  if(!rollOpen) return;
  const g=rollGeom(); if(!g) return;
  e.preventDefault();
  const f=((e.clientX-canvasEl.getBoundingClientRect().left)-g.x0)/g.bw;
  if(e.ctrlKey||e.metaKey){ const span=g.span*Math.exp(e.deltaY*0.002); setRollWinClamped(g.beat0+g.span*f-span*f, span); }
  else setRollWinClamped(g.beat0+(e.deltaX||e.deltaY)*g.span/g.bw, g.span);
}, {passive:false});
addEventListener('pointerup',   ()=>{ pointerDown=false; downOnBar=false; armBarHide();
  if(panelOpen() && !focusInPanel()) armStripReturn();   // палец ушёл; но если контрол панели в фокусе (пикер открыт) — НЕ возвращаем, ждём focusout
});
addEventListener('pointercancel',()=>{ pointerDown=false; downOnBar=false; armBarHide();
  if(panelOpen() && !focusInPanel()) armStripReturn();
});
/* Фокус контрола панели — НАДЁЖНЫЙ сигнал для <select> (переживает нативный пикер, в отличие от pointerup). */
addEventListener('focusin',  e=>{ if(inOpenPanel(e.target)) hushStrip(); });        // контрол панели взят в фокус → прячем и держим спрятанным, пока он в фокусе
addEventListener('change',   e=>{ if(inOpenPanel(e.target)) hushStrip(); });        // значение сменилось (пикер закрылся) → держим спрятанным — страховка для браузеров, снимающих фокус при ОТКРЫТИИ пикера
addEventListener('focusout', e=>{ if(inOpenPanel(e.target)) armStripReturn(); });   // контрол панели потерял фокус → возврат через паузу (новый focusin переставит)
addEventListener('pointermove', e=>{
  if(downOnBar) return;                         // жест начат по кнопке бара — дрожание пальца не должно раскрыть (и увести кнопку)
  if(e.pointerType==='mouse'){                  // мышь: раскрываем/сбрасываем таймер лишь при движении больше порога — дрожание не мигает панелью
    if(lastMX!==null && Math.hypot(e.clientX-lastMX,e.clientY-lastMY)<MOUSE_EPS)return;
    lastMX=e.clientX; lastMY=e.clientY;
  }
  revealBar();
});

/* СТАРТОВАЯ КАРТОЧКА. Две главные кнопки: «▶ Играть» и «Обучение» — ОБЕ вешает main.js, обе идут через
   ОДИН startApp (правило #1: AudioContext создаётся внутри клика, поэтому общий путь старта). «Обучение»
   открывает СПИСОК уроков (tutor.js), а поднимает приложение уже выбор урока — тем же кликом.
   Демо строёв (demo.js) и мини-учебник (#helpOv) живы в коде, но кнопок запуска у них нет — им место
   внутри обучения, туда и переедут. */

/* ===== ЧИСТЫЙ СТАРТ УРОКА (tutorReset) =====
   ЗАЧЕМ ОН ЕСТЬ. Урок обязан быть выполнимым САМ ПО СЕБЕ — что бы ни оставил после себя предыдущий урок
   или свободная игра. Уроки идут ЦЕПОЧКОЙ (поле next), поэтому хвост состояния протекает вперёд молча, и
   ловится он не как ошибка, а как «шаг не засчитывается, хотя человек всё сделал правильно». Каждая
   строка ниже закрывает РЕАЛЬНО НАЙДЕННУЮ протечку, а не гипотетическую:
   • сплит остался включённым с урока «Две роли» → модель урока («одна роль на весь экран») не совпадала
     бы с экраном, и шаги про положение читались бы неверно;
   • роль осталась не «Соло» → первый же шаг «Основ» (сыграй ноту) молчал бы;
   • петля/подложка продолжали играть из «Лупера» → следующий урок начинался под чужую музыку;
   • функции рук переписаны «Функциями рук»/«Двумя ролями»/свободной игрой → «Основы» находили левую руку
     НЕ на эффектах, а «Аккорды»/«Лупер» — аккорд-руку на «удержании» вместо «защёлки», из-за чего шаг
     защёлки не мог сработать в принципе (в удержании аккорд гаснет при размыкании — событие не придёт).
   ПОЭТОМУ сбрасываем ВСЕ ТРИ роли, а не только соло: ld/bs/ch. Значения — ровно дефолты state.handFn.
   Лад тут НЕ трогаем: его задаёт setup конкретного урока (см. LESSONS в tutor.js), потому что нужный лад
   у уроков разный. */
export function tutorReset(){   // урок учит SINGLE-ROLE соло: гасим сплит и ставим роль «Соло», чтобы модель совпала с экраном
  if(splitOn) setSplitOn(false);
  setPhoneInstr('ld'); softAllOff();
  tutorClearLoop();             // каждый урок начинается с ЧИСТОЙ петли: иначе джем/петля из «Лупера» продолжали бы играть в следующем уроке цепочки
  /* ДЕФОЛТНЫЕ функции ВСЕХ рук: «Функции рук»/«Две роли» меняют ld, а свободная игра — и ch/bs. Без сброса
     «Основы» нашли бы левую руку не на эффектах, а «Аккорды»/«Лупер» — аккорд-руку на «удержании» вместо
     «защёлки» (шаг защёлки не сработал бы). Значения = дефолт state.handFn. */
  setHandFn('ld','L','fx');    setHandFn('ld','R','note');
  setHandFn('bs','L','note');  setHandFn('bs','R','note');
  setHandFn('ch','L','latch'); setHandFn('ch','R','latch');
  setHandFn('dr','L','hit');   setHandFn('dr','R','hit');     // ⚠️ б.4: у ударных тоже бывает рука на эффектах или лупере — оставленная так, она протекла бы в следующий урок (правило #24)
  /* РАСКЛАДКА — тоже назад в дефолт ('auto', по ладу): уроки учат «Y выбирает РЯД ноты», и урок,
     начатый на ладу, оставленном в прямоугольниках, учил бы не тому, что на экране (правило #24). */
  setRectPref('auto'); renderRectCtl();
  applySplit(); applyInstr();
}
/* Сброс петли и ПОДЛОЖКИ для урока (та же связка, что у кнопки ✕): очистить записанное и вернуть кнопку
   подложки в покой (её цикл начнётся заново, путь — джем/только ударные — спросят снова). Зовётся из
   tutorReset (чистый старт любого урока) и из шага подложки урока «Лупер» (она встаёт на ПУСТУЮ петлю →
   любой вариант принимается независимо от размера/лада). */
export function tutorClearLoop(){ clearRec(); resetJamDisplay(); }
/* Урок задаёт стартовый лад (Аккорды → Хроматика: у неё полная палитра типов аккордов). Ставим ТЕМ ЖЕ
   путём, что selScale.onchange, плюс синхроним выпадашки традиции/лада, чтобы панель показывала выбранный
   лад (не «украли настройку молча»). Лад по окончании урока НЕ восстанавливаем — человек только что учил
   на нём аккорды и, вероятно, захочет продолжить играть (см. tutor.js exit). */
export function tutorSetScale(idx){
  const trad=tradOfScale(idx);
  setScaleIdx(idx); softAllOff();
  if(selTradition){ selTradition.value=trad; fillScales(trad); }
  selScale.value=idx;
  updScaleBtn(); refreshProgAvail(); renderRectCtl();
}
/* Урок «Функции рук» стартует с ИЗВЕСТНОЙ базы соло: левая=эффекты, правая=ноты (дефолт handFn.ld) —
   тогда «левая и правая рука получают работу» звучит буквально, и каждый шаг («поставь руку на …») —
   это РЕАЛЬНАЯ смена (иначе, если функция уже стоит, событие смены не придёт). renderHandFn перерисует
   селекты. Выбор по КОНЦУ урока НЕ сбрасываем (они только что научились выбирать — см. tutor.js финал). */
export function tutorResetHandFn(){
  setHandFn('ld','L','fx'); setHandFn('ld','R','note'); softAllOff(); renderHandFn(); renderHandActs();   // ⚠️ УРОКИ И ДЕЙСТВИЯ ПАЛЬЦЕВ: сюда рука соло возвращается на 'fx', значит секция «Действий» снова появляется. ⛔ Заведёт будущий урок аккорд-руку на 'fx' — его setup ОБЯЗАН и подписать палитру на палец, иначе шаг выбора типа станет невыполнимым (правило #24): по умолчанию рука-эффекты палитры не касается
}
/* Ссылки подвала: форма отзыва / поддержка. Пустой URL — прячем ссылку. Отзыв без формы → mailto с
   адресом, собранным в рантайме (не в HTML-исходнике). Зовётся один раз при загрузке модуля. */
function buildStartLinks(){
  const fb=$('fbLink'), dn=$('donateLink'), sup=$('startSupport');
  // Отзыв: форма (новая вкладка — не терять игру/несохранённую петлю) или почта-fallback. Т.к. FEEDBACK_URL
  // задан — идём в первую ветку, mailto не рисуется, адрес в исходник HTML не попадает.
  if(FEEDBACK_URL){ fb.href=FEEDBACK_URL; fb.target='_blank'; fb.textContent=t('foot.feedbackLink'); }
  else{ const a=FB_MAIL_USER+'@'+FB_MAIL_DOMAIN; fb.href='mailto:'+a; fb.removeAttribute('target'); fb.textContent=t('foot.emailLink'); }
  fb.style.display='';                                   // отзыв виден всегда (форма или почта-fallback)
  // Донат — «Donate» в конце тихой строки поддержки. Новая вкладка (та же причина). Пустой URL — прячем ВСЮ
  // строку поддержки (без ссылки предложение бессмысленно; мёртвую ссылку и обещание не рисуем).
  if(DONATE_URL){ dn.href=DONATE_URL; dn.target='_blank'; dn.textContent=t('foot.donateLink'); sup.style.display=''; }
  else sup.style.display='none';
}
buildStartLinks();
/* ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА (i18n этап 0). Отражаем ТЕКУЩИЙ язык (сохранённый/угаданный) и на смену зовём
   setLang (сохранит выбор, перерисует разметку, уведомит подписчиков). Пока строки не перенесены —
   видимо ничего не меняется, но выбор фиксируется и переживёт перезагрузку. */
const langSel=$('langSel');
if(langSel){ langSel.value=lang; langSel.onchange=e=>setLang(e.target.value); }
applyI18n();   // разовый проход по [data-i18n]; сейчас таких атрибутов нет → no-op (каркас готов к этапу A)
$('panicBtn').onclick=()=>{ panic(); resetJamDisplay(); };   // паника гасит всё → кнопка подложки тоже в покой (цикл с начала, путь спросят снова)
 
/* Смена традиции = смена лада: иначе продолжал бы звучать лад чужой традиции, а меню
   показывало бы другой. Переключаемся на ПЕРВЫЙ лад традиции тем же путём, что и selScale. */
selTradition.onchange=e=>{
  fillScales(e.target.value);
  const first=scalesOfTrad(e.target.value)[0];
  if(!first)return;
  selScale.value=first.i;
  setScaleIdx(first.i); softAllOff(); updScaleBtn(); refreshProgAvail(); renderRectCtl();
  if(hooks.tutor) hooks.tutor('scale',{idx:scaleIdx, trad:tradOfScale(scaleIdx)});   // ЗАЦЕПКА ОБУЧЕНИЯ: смена строя тоже меняет лад (первый в традиции) — тот же сигнал урока «Строи»
};
selScale.onchange=e=>{
  setScaleIdx(+e.target.value); softAllOff();
  updScaleBtn(); refreshProgAvail(); renderRectCtl();          // 2/3: смена лада (+ раскладка: доступность и подпись «По ладу» зависят от лада; сам ВЫБОР не трогаем — он вернётся на подходящем ладу)
  if(hooks.tutor) hooks.tutor('scale',{idx:scaleIdx, trad:tradOfScale(scaleIdx)});   // ЗАЦЕПКА ОБУЧЕНИЯ: человек ВЫБРАЛ лад в меню — урок «Строи и тембры»
};
selTonic.onchange=e=>{ setTonic(+e.target.value); softAllOff(); updScaleBtn(); };   // 3/3: смена тоники
/* ЭТАЛОН A4 — единый источник высоты (двигает ВСЕ строи, подвижные и фиксированные, вместе).
   Два ввода: пресеты-подсказки (учат: 415 барочный … 444 оркестровый) и свободное число, КЛАМП 380–480;
   невалид/пусто → откат к последнему валидному, высота НИКОГДА не ломается. Смена ре-настраивает как
   тоника: softAllOff гасит звучащее (переатакует на новом эталоне), терменвокс и слои петли считают
   Hz живьём (leadFreq/chordFreqs читают aRef), дрон вне softAllOff — переигрываем сразу, если активен. */
const AREF_MIN=380, AREF_MAX=480;
const aRefSel=$('aRefSel'), aRefInput=$('aRefInput');
let lastARef=aRef;                                 // последнее ВАЛИДНОЕ значение — для отката
function syncARef(v){ aRefInput.value=v; aRefSel.value=String(v); }   // отразить в обоих; v не из списка → пресет пуст (кастом)
function applyARef(v){
  setARef(v); lastARef=v;
  softAllOff();                                    // звучащее гаснет и переиграется на новом эталоне (как смена тоники)
  if(droneAudible())droneOn();                     // дрон softAllOff не трогает — переигрываем на новую опору сразу (lvl 0.18, как в аранжировке). ⚠️ Спрашиваем про СЛЫШИМОСТЬ, а не про наличие слоя (S1): у заглушённой дорожки дрона смена эталона не должна включать звук. Попутно ушёл дубль предиката, что жил здесь строкой
}
aRefSel.onchange=e=>{ const v=+e.target.value; applyARef(v); syncARef(v); };
aRefInput.onchange=e=>{
  const v=Math.round(parseFloat(e.target.value));
  if(!Number.isFinite(v)||v<AREF_MIN||v>AREF_MAX){ syncARef(lastARef); return; }   // мусор/пусто/вне диапазона → откат, высота цела
  applyARef(v); syncARef(v);
};
syncARef(aRef);                                    // старт: 440 в обоих контролах
/* РАСКЛАДКА НОТ — «прямоугольники по 4 ноты» vs «узкие ряды». Это про то, КАК играть, а не про то,
   ЧТО звучит: высота, запись и переигровка от раскладки не зависят вовсе (в событие она не идёт).
   ТРИ значения, а не тумблер (state.rectPref): 'auto' — по ладу (его свойство rectGrid стало
   ДЕФОЛТОМ), 'rect', 'rows'. Дефолт 'auto' и есть гарантия «нетронутое приложение ведёт себя как
   сегодня НА КАЖДОМ ладу»: булев флаг, засеянный первым ладом, перетащил бы прямоугольники Партча
   на мажор при следующей же смене лада.
   ДОСТУПНОСТЬ. Раньше здесь была ветка «недоступно с причиной» (требовалась кратность 4). Её БОЛЬШЕ
   НЕТ, и это не упрощение, а следствие новой арифметики: число нот в прямоугольнике переменное
   (4/3/2), поэтому раскладываются ВСЕ лады без исключения — чётные при k=2, нечётные при k=2+повтор
   тоники. Причины блокировки не существует, а мёртвое объяснение в панели хуже отсутствующего.
   Предикат rectEligible жив как защита разрешителя (см. scales.js), но UI его не показывает. */
const rectSel=$('rectSel');
const RECT_OPTS=[['auto','rect.auto'],['rect','rect.rect'],['rows','rect.rows']];
function renderRectCtl(){
  const s=CUR();
  rectSel.textContent='';
  for(const [v,k] of RECT_OPTS){
    const o=document.createElement('option'); o.value=v;
    o.textContent = v==='auto' ? t(k,{form:t(rectDefault(s)?'rect.form.rect':'rect.form.rows')}) : t(k);   // «По ладу: прямоугольники» — видно, во что разрешается авто
    rectSel.appendChild(o);
  }
  rectSel.value=rectPref;
}
rectSel.onchange=e=>{ setRectPref(e.target.value); softAllOff();   // раскладка меняет СМЫСЛ пальца (октава ↔ нота в прямоугольнике) — гасим звучащее, как при смене лада/функции руки
  renderRectCtl(); };
/* МНОГОПАЛЬЦЕВЫЙ ЩИПОК: сколько пальцев руки звучат одновременно. 1 — ровно сегодняшнее поведение
   (включая перевод ноты сменой пальца на лету), 2+ — каждый прижатый палец даёт СВОЮ ноту.
   ДЕФОЛТ 4 (см. state.pinchFingers): замысел — сомкнуть все четыре пальца на каждом большом и услышать
   все восемь нот. Осторожность живёт в самом контроле: камера различает два пальца увереннее, чем
   четыре, и если безымянный/мизинец срабатывают ложно — потолок опускают здесь же. Смена потолка гасит
   звучащее (softAllOff): иначе нота пальца, который только что «срезали» потолком, осталась бы висеть. */
const pinchSel=$('pinchSel');
function renderPinchCtl(){
  pinchSel.textContent='';
  for(let n=1;n<=4;n++){ const o=document.createElement('option'); o.value=n;
    o.textContent = n===1 ? t('pinch.one') : t('pinch.n',{n}); pinchSel.appendChild(o); }
  pinchSel.value=pinchFingers;
}
pinchSel.onchange=e=>{ setPinchFingers(+e.target.value); softAllOff(); renderPinchCtl(); };
renderPinchCtl();
/* ПЕРВИЧНАЯ ОТРИСОВКА — ЗДЕСЬ, а не в buildUI(): buildUI() зовётся выше по файлу, где const-ссылки
   этого блока ещё в мёртвой зоне (TDZ) — «Cannot access 'rectSel' before initialization» на загрузке.
   Тот же порядок, что у эталона A4 (элементы → обработчики → первичный syncARef(aRef) рядом). */
renderRectCtl();
$('qTriad').onclick=()=>{ setSeventh(false); softAllOff(); $('qTriad').classList.add('act'); $('qSev').classList.remove('act'); };
$('qSev').onclick =()=>{ setSeventh(true);  softAllOff(); $('qSev').classList.add('act');  $('qTriad').classList.remove('act'); };
selLead.onchange=e=>{ setLeadInstr(+e.target.value);
  if(hooks.tutor) hooks.tutor('timbre',{slot:'lead'}); };   // ЗАЦЕПКА ОБУЧЕНИЯ: сменили СОЛО-тембр — урок «Строи и тембры»
selChord.onchange=e=>setChIdx(+e.target.value);
selBass.onchange=e=>setBassInstr(+e.target.value);
qOn.onclick =()=>{ setLoopQuant(true);  qOn.classList.add('act');  qOff.classList.remove('act'); };
qOff.onclick=()=>{ setLoopQuant(false); qOff.classList.add('act'); qOn.classList.remove('act'); };
/* ДРОБЛЕНИЕ ДОЛИ — сетка квантизации ЖИВЫХ ударов: 4 = шестнадцатые (умолчание, как было), 3 = триоли
   (шаффл, блюзовый кач). Меняется КОГДА УГОДНО: это настройка записи, а не геометрия петли (bars/metre
   гейтятся пустой петлёй, потому что переосмыслили бы времена уже записанного). Триольная сетка ещё и
   ПОКАЗЫВАЕТСЯ в полосе лупера (drawLooper) — видно ту сетку, к которой квантует. */
function applySub(){ sub4.classList.toggle('act', loop.sub===4); sub3.classList.toggle('act', loop.sub===3); }
sub4.onclick=()=>{ setLoopSub(4); applySub(); };
sub3.onclick=()=>{ setLoopSub(3); applySub(); };
applySub();
bpmEl.oninput=e=>{ setLoopBpm(+e.target.value); bpmV.textContent=loop.bpm; };
selDrumKit.onchange=e=>setDrumKit(+e.target.value);
 
recBtn.onclick=onRec;
loopBtn.onclick=onLoop;
$('undoBtn').onclick=onUndo;
$('clrBtn').onclick=()=>{ clearRec(); resetJamDisplay(); };   // очистка петли → кнопка подложки в покой
loopMinus.onclick=()=>{ setLoopBars(loop.bars-1); loopBarsV.textContent=loop.bars; };
loopPlus.onclick =()=>{ setLoopBars(loop.bars+1); loopBarsV.textContent=loop.bars; };
loopMetre.onchange=e=>{ setLoopMetre(+e.target.value); refreshMetreCtl(); applyBacking(); };   // сеттер гейтит пустую петлю; refresh перечитает (клампнутое) значение + перефильтрует ритмы; applyBacking — подпись кнопки подложки зависит от числа доступных ритмов
addArrBtn.onclick=()=>{ loadArrangement({prog:+selProg.value, rhythm:+selRhythm.value, bass:selBassMode.value}); loopBarsV.textContent=loop.bars; };

/* Выбор инструмента. При любом переключении глушим звук — роли/зоны рук меняются.
   PC-режим удалён: вертикальная раскладка — единственная, поэтому нет ни modeBtn, ни класса .phone. */
const INSTR_SEQ=['ld','ch','bs','dr'];
const instrLbl=r=>t('role.'+r);   // подпись роли (🎸 Соло / 🎹 Аккорды / 🎚 Бас / 🥁 Ударные) — через словарь
function applyInstr(){ instrBtn.textContent = instrLbl(phoneInstr);
  instrBtn.style.setProperty('--role', INSTR_COL[phoneInstr]); renderHandFn(); renderHandActs();   // цвет роли; секции «Функции рук» и «Действия пальцев» зависят от активной роли (набор ролей в игре сменился)
  if(hooks.tutor) hooks.tutor('role',{role:phoneInstr}); }   // ЗАЦЕПКА ОБУЧЕНИЯ (единственная из UI-слоя): смена роли — на том же канале hooks.tutor
/* ФУНКЦИИ РУК: по выпадающему НА РУКУ (Левая/Правая) для КАЖДОЙ роли с записью (соло/бас/аккорды), что
   сейчас в игре. Строим динамически (как fillScales): single-role — одна роль; сплит — каждая ld/бас/ch-
   половина (пропуская dr, у неё записи нет). Строки помечены РУКОЙ, сгруппированы под ярлыком роли (🎸
   Соло / 🎹 Аккорды / 🎚 Бас) — видно, что назначение ПО РУКЕ, не по половине. Бас без 'fx'; аккорды —
   защёлка/удержание (ни 'fx', ни терменвокса). ВЫРАЗИТЕЛЬНОСТЬ ('expr') — только соло (первый заход):
   рука не играет нот, а «дышит» в звук движением/сжатием (см. gestures: exprFeatures/tickExpr).
   У ВСЕХ трёх ролей есть 'loop' (Лупер): рука нот не играет,
   а командует лупером щипками пальцев (см. gestures: fireLooperCmd). Смена — setHandFn + softAllOff. */
const HANDFN_OPTS={   // [значение, ключ-словаря] — подпись через t(k)
  ld:[['fx','handfn.fx'],['note','handfn.note'],['hold','handfn.hold'],['therm','handfn.therm'],['expr','handfn.expr'],['loop','handfn.loop']],
  bs:[['fx','handfn.fx'],['note','handfn.note'],['hold','handfn.hold'],['therm','handfn.therm'],['loop','handfn.loop']],   // 'fx' — слайс б.2: у баса РУКА СВОБОДНА по устройству (бас МОНО, bassOwner/last-pinch-wins), поэтому отдать её эффектам не стоит ни одной ноты. ⚠️ Цепь баса ПУСТА по умолчанию — пока в неё не добавят эффект в меню, вести этой руке нечего; засевать её ради красоты слайса нельзя (это была бы правка звука по умолчанию)
  ch:[['fx','handfn.fx'],['latch','handfn.latch'],['hold','handfn.chHold'],['loop','handfn.loop']],   // 'fx' — слайс б.3: у аккордов рука СВОБОДНА (аккорды МОНО — chOwner, защёлка звучит и после размыкания), поэтому вторая рука не нужна, чтобы играть. ⚠️ ЦЕНА, и она реальна: на ладу с ПАЛИТРОЙ ТИПОВ (typedChords) рука, ушедшая на эффекты, больше не выбирает тип — палитра берётся ПО ПОЛОЖЕНИЮ, и годилась любая рука. Оставшаяся рука по-прежнему умеет и то и другое ПО ОЧЕРЕДИ (тип слева от palSplitX, потом корень справа) — это документированная одноручная модель аккордов. На ладах без палитры цена нулевая
  dr:[['fx','handfn.fx'],['hit','handfn.hit'],['loop','handfn.loop']],   // б.4 — СПИСОК СОЗДАН С НУЛЯ: у ударных не было ни одной функции руки. 'hit' — удары по рядам, дефолт обеих рук (сегодняшнее поведение). ⚠️ ЦЕНА РЕАЛЬНА, в отличие от баса и аккордов (оба моно, вторая рука для игры не нужна): ударные ПО-НАСТОЯЩЕМУ ДВУРУЧНЫЕ — удар срабатывает на каждый щипок независимо, дробь играется между руками, и рука на эффектах или лупере — это половина барабанщика. ⚠️ Цепь ударных ПУСТА до цели (в): fx-руке вести нечего, пока в цепь не добавят эффект; засевать её ради красоты слайса нельзя
};
const handFnRows=$('handFnRows'), handFnSep=$('handFnSep');
const HAS_HANDFN=r=>r==='ld'||r==='bs'||r==='ch'||r==='dr';   // роли с записью в handFn — с б.4 ВСЕ ЧЕТЫРЕ (у ударных запись создана: 'hit'/'fx'/'loop')
function noteRolesInPlay(){
  if(!splitOn) return HAS_HANDFN(phoneInstr) ? [phoneInstr] : [];
  return [...new Set(SPLIT_ROLES)].filter(HAS_HANDFN);   // сплит: уникальные половины с записью в handFn. ⚠️ Имя «note roles» с б.4 НЕТОЧНО — сюда входят и ударные, нот не играющие; оставлено, потому что под этим именем функцию описывает CLAUDE.md, а переименование без правки доков завело бы расхождение
}
function renderHandFn(){
  const roles=noteRolesInPlay();
  handFnSep.style.display = handFnRows.style.display = roles.length ? '' : 'none';
  handFnRows.textContent='';
  for(const role of roles){
    const rl=document.createElement('div'); rl.className='handFnRole'; rl.textContent=instrLbl(role);   // ярлык роли (🎸 Соло / 🎚 Бас)
    handFnRows.appendChild(rl);
    for(const hand of ['L','R']){
      const row=document.createElement('div'); row.className='prow';
      const lab=document.createElement('label'); lab.textContent = t(hand==='L'?'hand.left':'hand.right');
      const sel=document.createElement('select'); sel.autocomplete='off';   // как в renderFxCtl: не даём браузеру восстановить прежнее значение ПОВЕРХ данных
      for(const [v,k] of HANDFN_OPTS[role]){ const o=document.createElement('option'); o.value=v; o.textContent=t(k); sel.appendChild(o); }
      sel.value=handFn[role][hand];
      /* ⚠️ ВЫЗОВ renderFxCtl НИЖЕ — ЗАВИСИМОСТЬ ПО ДАННЫМ, А НЕ ВЛАДЕНИЕ. Различие несущее, и его легко
         спутать: ровно такой вызов стоял здесь ДО Пласта 3.4.1 — но по ДРУГОЙ причине (от руки зависела
         ВИДИМОСТЬ всей секции), и как раз ту причину 3.4.1 убрал. Сегодня конструктор «Функциям рук»
         НЕ ПРИНАДЛЕЖИТ: его секция видна всегда, ни от какой руки не зависит, и renderHandFn его больше
         не зовёт. Осталась одна-единственная нить: подсказка fx.noHand внутри конструктора ЧИТАЕТ
         roleHasFx, а меняется roleHasFx РОВНО ЗДЕСЬ. Кто поменял — тот и перерисовывает, иначе подсказка
         врёт до следующего открытия панели.
         ⛔ НЕ УДАЛЯТЬ как дубль: showScale/onLangChange перерисовывают ПРИ ОТКРЫТИИ и при смене языка —
         ни то, ни другое не случается, когда функцию руки меняют в УЖЕ ОТКРЫТОЙ панели.
         ⛔ НЕ ВОЗВРАЩАТЬ в конец renderHandFn «чтобы не дублировать»: там это снова станет владением —
         конструктор начнёт перерисовываться на каждую пересборку «Функций рук» (смена роли, сплит,
         tutorResetHandFn), где его данные ни при чём.
         ⚠️ Исчезнет подсказка — исчезнет и причина: тогда убирать вызов ВМЕСТЕ с ней, осознанно. */
      sel.onchange=e=>{ setHandFn(role,hand,e.target.value); softAllOff();       // роли/зоны рук меняются → глушим звук (как смена инструмента)
        renderFxCtl();                                                            // ← зависимость ПО ДАННЫМ (подсказка fx.noHand читает roleHasFx), НЕ владение — см. комментарий выше
        renderHandActs();                                                         // ← ТОЖЕ по данным: видимость «Действий пальцев» — это roleHasFx, а меняется он РОВНО здесь. Появилась/исчезла рука на эффектах — секция обязана появиться/исчезнуть в тот же миг, а не к следующему открытию панели
        if(hooks.tutor) hooks.tutor('handfn',{role, hand, fn:e.target.value}); };   // ЗАЦЕПКА ОБУЧЕНИЯ: сменили функцию руки (какая рука, какая функция) — урок «Функции рук»
      row.appendChild(lab); row.appendChild(sel); handFnRows.appendChild(row);
    }
  }
}
/* ⚠️ С КОНЦА renderHandFn УБРАН ВЫЗОВ renderFxCtl (Пласт 3.4.1), и это не уборка, а СНЯТИЕ ВЛАДЕНИЯ.
   «Функции рук» дёргали конструктор потому, что его ВИДИМОСТЬ зависела от руки (roleHasFx). После
   поворота «цепью владеет РОЛЬ» это неверно по существу: цепь существует и звучит независимо от того,
   есть ли рука на 'fx'. Обе секции теперь перерисовывает тот, кому это нужно (showScale при открытии
   панели и onLangChange), КАЖДУЮ отдельно.
   ⚠️ НЕ ПУТАТЬ С ТОЧЕЧНЫМ ВЫЗОВОМ В onchange ВЫШЕ: он остался и обязан остаться — но по другому
   основанию. Владение — «сосед перерисовывает меня заодно с собой»; зависимость по данным — «величина,
   которую я показываю (roleHasFx в подсказке fx.noHand), меняется вот в этой строке». Первое снято,
   второе живёт. Полный разбор — в комментарии у самого вызова. */
/* ================= КОНСТРУКТОР ЭФФЕКТОВ (Пласт 2 · слайс 2.3; САМОСТОЯТЕЛЬНАЯ СЕКЦИЯ — 3.4.1) ====
   КТО НА КАКОМ ПАЛЬЦЕ у руки-эффектов. Цепи живут в state.fxChains (Пласт 3.3; прежде fxLayout —
   «раскладка fx-руки», см. смену владельца там же) и пишутся ТОЛЬКО отсюда
   (правило #5 с обратной стороны: DOM — дело ui, жест-слой цепь лишь ЧИТАЕТ).
   Слот = палец: 0 указательный … 3 мизинец (порядок FINGER_TIPS).
   ⚠️ ВИДИМОСТЬ БОЛЬШЕ НЕ ЗАВИСИТ ОТ РУКИ (было: гейт roleHasFx, как у столбиков на холсте). Причина —
   поворот «цепью владеет РОЛЬ»: цепь СУЩЕСТВУЕТ и ЗВУЧИТ, даже когда ни одна рука не назначена на
   'fx', — фиксированные значения параметров применяются по-прежнему. Старый гейт был к тому же
   ДЫРОЙ: поставь параметру фиксированное значение, сними руку с 'fx' — значение продолжало
   действовать, а меню, чтобы его изменить, исчезало. Теперь секция видна всегда, а отсутствие
   fx-руки объясняется ПОДСКАЗКОЙ (пальцевые адреса не действуют, фиксированные — да).
   ⚠️ МЕНЮ ТЕПЕРЬ «ОТ ПАРАМЕТРА», А НЕ «ОТ ПАЛЬЦА» (Пласт 3.4.2). Было: строка = ПАЛЕЦ, и в ней
   выбирали, какой ОДИН эффект на нём сидит; параметры шли подстроками и наследовали палец строки.
   Стало: строка = ПАРАМЕТР, и она выбирает свой АДРЕС УПРАВЛЕНИЯ свободно. Это прямое следствие формы
   данных — адрес принадлежит ПАРАМЕТРУ (state.fxChains), — и ровно то, ради чего палец переехал внутрь
   параметра: на один адрес можно подписать параметры РАЗНЫХ эффектов, и они поедут ВМЕСТЕ.
   ⚠️ Звук НЕ глушим (в отличие от смены функции руки): цепь не трогает ни голоса, ни роли —
   меняется лишь то, какую ручку крутит палец. */
const FINGER_KEYS=['finger.index','finger.middle','finger.ring','finger.pinky'];
/* АДРЕС УПРАВЛЕНИЯ — ОДИН выпадающий список на параметр (Пласт 3.4.2). Прежде их было ДВА: «режим»
   (ведётся/фиксировано) плюс «ось». Слияние — не косметика, а вопрос по существу: «откуда берётся эта
   величина» — ОДИН вопрос с ОДНИМ ответом, и два контрола на строку при четырёх пальцах × трёх осях
   превратили бы панель в стену. Режим при этом ОСТАЛСЯ В ДАННЫХ (p.mode) — сливается только показ.
   ФОРМА ЗНАЧЕНИЯ: 'fixed' | 'play:z' | 'fx:<палец>:<ось>'. Разбирается ровно в одном месте (ниже, в
   обработчике), в данные уезжают отдельные поля hand/finger/axis — строка живёт только в меню.
   ГРУППЫ (<optgroup>) несут пальцы: нативный список остаётся компактным на любом экране, потому что
   рисует его ОС. Сегодня 1+4×3+1 = 14 пунктов; после двойного щипка (Пласт 3.6) станет вдвое больше
   пальцевых групп — форма это выдержит без перестройки.
   ⚠️ Смешение адресов в ОДНОМ эффекте — это и есть разделение эффекта между руками: у реверба можно
   оставить длину и окраску на пальце, а подмес отдать глубине играющей. */
const FX_AXES=[['y','axis.y'],['x','axis.x'],['z','axis.z']];   // порядок — вертикаль первой: она «главная» ось руки (см. довод о порядке осей в state.js)
function fxAddrOf(pa){   // адрес параметра → значение <select>; ЕДИНСТВЕННОЕ место, где данные превращаются в строку меню
  if(pa.mode==='fixed') return 'fixed';
  if(pa.hand==='play') return 'play:'+(pa.axis||'z');   // у играющей руки ОСЕЙ ДВЕ (3.7.3): глубина и горизонталь. Хардкод 'play:z' здесь показывал бы X-адрес как «глубину» и молча возвращал его на Z при любой правке строки
  return 'fx:'+(pa.finger|0)+':'+(pa.axis||'y');
}
function buildAddrSel(pa){
  const sel=document.createElement('select'); sel.autocomplete='off';
  const opt=(v,txt)=>{ const o=document.createElement('option'); o.value=v; o.textContent=txt; return o; };
  sel.appendChild(opt('fixed',t('fx.mode.fixed')));                 // «Фиксировано» — адрес особого рода: руки нет вовсе
  FINGER_KEYS.forEach((fk,f)=>{
    const g=document.createElement('optgroup'); g.label=t(fk);
    for(const [ax,k] of FX_AXES) g.appendChild(opt('fx:'+f+':'+ax, t(k)));
    sel.appendChild(g);
  });
  /* У ИГРАЮЩЕЙ РУКИ ТЕПЕРЬ ДВА АДРЕСА (Пласт 3.7.3): ГЛУБИНА (свободна с 3.1, когда реверб ушёл с
     играющей руки) и ГОРИЗОНТАЛЬ — та самая, что по умолчанию ведёт ГРОМКОСТЬ. Отдать X эффекту можно,
     и тогда громкость роли встаёт на фиксированное значение (см. поле ниже): одна ось — одна работа.
     ⛔ Вертикали здесь нет и не будет: Y — это ВЫСОТА, единственная ось, которую отдать нельзя. */
  const gp=document.createElement('optgroup'); gp.label=t('fx.addr.play');
  gp.appendChild(opt('play:x',t('axis.x')));
  gp.appendChild(opt('play:z',t('axis.z')));
  sel.appendChild(gp);
  sel.value=fxAddrOf(pa);
  return sel;
}
const fxCtlSep=$('fxCtlSep'), fxCtlRows=$('fxCtlRows');
/* ЧЬЮ ЦЕПЬ ПРАВИМ — состояние МЕНЮ, а не инструмента, и потому живёт ЗДЕСЬ, а не в state.js.
   ⛔ ЭТО НЕ phoneInstr И НЕ СЛЕДУЕТ ЗА НИМ: человек вправе готовить цепь аккордов, играя соло. Ровно
   поэтому же значение НИКОГДА не должен читать ни gestures, ни draw — иначе правка цепи аккордов в
   меню меняла бы то, что крутит соло-рука. Не экспортируется: читателей вне этого файла нет и не будет.
   ⚠️ Сеттеры цепи получают роль ПЕРВЫМ аргументом (3.4.2) — им передаётся ИМЕННО это значение, а не
   phoneInstr. Расхождения сегодня нет и по построению: строки рисуются только у НЕПУСТОЙ цепи, а
   непустая сегодня ровно одна — соло. */
let fxCtlRole='ld';
const FX_ROLE_SEQ=['ld','ch','bs','dr'];   // порядок ролей в выпадающем списке — тот же, что у INSTR_SEQ (кнопка роли)
/* ⛳ ЦЕЛЬ ПРАВКИ — ЦЕПЬ, И АДРЕСУЕТСЯ ОНА КЛЮЧОМ (слайс O-0). fxCtlRole — это ВЫБОР В СПИСКЕ, то есть
   состояние самого меню; ключ цепи из него ВЫВОДИТСЯ здесь, и дальше все операции с цепью идут по ключу.
   ⚠️ ФУНКЦИЯ, А НЕ КОНСТАНТА: обработчики строк создаются при отрисовке и живут до следующей, а читать
   выбор они обязаны ЖИВЫМ — ровно так они читали fxCtlRole до этой правки.
   ⚠️ РОЛЬ ИЗ МЕНЮ НЕ ИСЧЕЗЛА, и это не недоделка: три величины рядом принадлежат РОЛИ, а не цепи —
   подпись пункта (t('role.'+r)), наличие руки-эффектов (roleHasFx) и фиксированная громкость (fxVolFix).
   Когда в список добавятся цепи ТЕМБРОВ, развилка «что именно выбрано» ляжет ИМЕННО СЮДА, в состояние
   меню, а не в API цепей — они ключ уже принимают. */
const fxCtlChain=()=>chainKeyOf(fxCtlRole);
/* КАКОЙ ЭФФЕКТ РАЗВЁРНУТ — тоже состояние МЕНЮ (аккордеон, Пласт 3.4.3), рядом с fxCtlRole и по тем же
   доводам: gestures/draw о нём знать не должны.
   ⚠️ ХРАНИМ fxId, А НЕ ИНДЕКС. Индекс поехал бы при каждом «убрать»: удалил первый эффект — развёрнутым
   вдруг оказался следующий. Это ровно правило #25 в миниатюре (стабильный ключ вместо позиции).
   ДЕФОЛТ — НИЧЕГО НЕ РАЗВЁРНУТО: ради этого аккордеон и делался. Секция в покое = строка роли + по
   строке на эффект + строка добавления; ничего при этом не спрятано, потому что каждый заголовок несёт
   СВОДКУ АДРЕСОВ своих параметров. Разворачивают, чтобы ПРАВИТЬ, а не чтобы УВИДЕТЬ. */
let fxOpenId=null;
/* ОДИН РАЗВЁРНУТ ЗА РАЗ: правят один эффект, а не четыре сразу; на телефоне это разница между шестью
   строками и двадцатью. Клик по уже развёрнутому — сворачивает (второго способа закрыть нет). */
const fxToggleOpen=id=>{ fxOpenId = (fxOpenId===id) ? null : id; renderFxCtl(); };
/* Римские I–IV для СВОДКИ: приложение обозначает палец римской цифрой везде (октавная полоса, легенда
   прямоугольников, ярлык регистра), поэтому в сводке они читаются без обучения и без перевода.
   ⚠️ Это НЕ OCT_ROMAN из scales: тот считает РЕГИСТРЫ (его длина — REG_N), а здесь пальцы. Совпадение
   длин случайно, связывать их значило бы связать две несвязанные величины. */
const FX_FING_ROMAN=['I','II','III','IV'];
/* Ось в сводке — СТРЕЛКОЙ, а не словом: «Вертикаль» × три параметра не влезет в строку ни на одном
   телефоне, а стрелка международна (то же правило, что у токенов DLY/VIB на холсте — bare string). */
const FX_AXIS_GLYPH={y:'↕', x:'↔', z:'◆'};
/* СВОДКА АДРЕСОВ эффекта — то, ради чего свёрнутый заголовок остаётся честным: видно, ЧЕМ он ведётся,
   не разворачивая. Инверсию намеренно НЕ показываем: сводка отвечает «где», а не «в какую сторону», и
   плюс-минус на каждый токен превратил бы её в шум. */
function fxAddrSummary(eff){
  return eff.params.map(pa=>{
    if(pa.mode==='fixed') return t('fx.sum.fixed');
    if(pa.hand==='play')  return t(pa.axis==='x'?'fx.sum.playx':'fx.sum.play');
    return (FX_FING_ROMAN[pa.finger|0]||'?')+(FX_AXIS_GLYPH[pa.axis]||'');
  }).join(' · ');
}
/* ═══ ОБЩИЙ АДРЕС: показываем, ЧТО ПОЕДЕТ ВМЕСТЕ (Пласт 3.4.4) ═══
   С 3.4.2 один адрес может вести НЕСКОЛЬКО параметров, в том числе у РАЗНЫХ эффектов, — и это
   задумано, а не дефект (проверок и запретов не городим, см. «конфликт адресов разрешён намеренно»).
   Но до сих пор факт был НЕВИДИМ: узнать о нём можно было, только двинув палец и услышав, что поехало
   двое. Вопрос плана «меню ОТ ПАРАМЕТРА или ОТ АДРЕСА» решён в пользу параметра (форма данных), и вот
   ЦЕНА этого решения, которую и гасит подсказка: «от адреса» показывало бы совместность само собой.
   ⛔ ЭТО ВЫВОДИМАЯ ВЕЛИЧИНА, А НЕ СОСТОЯНИЕ: карта строится заново на каждую отрисовку из самой цепи.
   Никакого второго представления связи (обратного индекса, который надо поддерживать) не заводим —
   разъехаться тогда нечему по построению.
   ⚠️ ФИКСИРОВАННЫЙ ПАРАМЕТР — НЕ АДРЕС. Два параметра «фиксировано» не едут вместе: они вообще не
   едут, у каждого своё число. Поэтому ключ у них null, и в карту они не попадают. */
const fxAddrKey=pa=>{ const k=pa?fxAddrOf(pa):null; return (k&&k!=='fixed')?k:null; };   // ЕДИНАЯ формула адреса — та же fxAddrOf, что кормит <select>; второй копии быть не должно
/* Карта «адрес → подписи ведомых им параметров». Считаем ТОЛЬКО параметры, у которых есть дескриптор
   (pi < pkeys.length): ровно их и способен вести жест (captureFx пропускает параметр без дескриптора),
   а значит только они и могут поехать вместе. До initAudio реестр модулей пуст — реверб в карту не
   попадает, и это верно: вести его в тот момент всё равно нечем. */
function fxShareMap(chain){
  const m=new Map();
  for(const eff of chain){
    const pkeys=fxParamKeys(eff.fxId);
    eff.params.forEach((pa,pi)=>{
      if(pi>=pkeys.length) return;
      const k=fxAddrKey(pa); if(!k) return;
      if(!m.has(k)) m.set(k,[]);
      m.get(k).push(fxTitleOf(eff.fxId)+' · '+t(pkeys[pi]));
    });
  }
  return m;
}
/* ЧИП «×N» — МАРКЕР, А НЕ ПАНЕЛЬ. Тот же приём, что у метки play-параметра на холсте (3.2.2): мелкий
   знак рядом с тем, к чему он относится, а полный список — в подсказке. Второго вида («от адреса»)
   не заводим: он стоил бы обратного индекса и отдельного экрана ради факта, который умещается в чип. */
function fxShareChip(groups){
  const n=Math.max(...groups.map(g=>g.length));
  const c=document.createElement('span'); c.className='fxshare'; c.textContent='×'+n;
  const txt=t('fx.share.title')+'\n'+groups.map(g=>g.join('\n')).join('\n\n');
  c.title=txt; c.setAttribute('aria-label',txt);
  return c;
}
/* Подсказка секции — абзац .phint, как у эталона A4 и «Пальцев в руке». Пересобирается вместе со
   строками (textContent='' выше), поэтому отдельного скрытия/показа не требуется. */
function fxHint(key){ const p=document.createElement('p'); p.className='phint'; p.textContent=t(key); return p; }
/* ═══ ДЕЙСТВИЯ ПАЛЬЦЕВ — СЕКЦИЯ ПОД «ФУНКЦИЯМИ РУК» (слайс «д») ═══
   ⛳ СТУПЕНЬ НИЖЕ, А НЕ ВТОРАЯ ТАКАЯ ЖЕ: «Функции рук» отвечают, ЧТО ТАКОЕ РУКА, эта — ЧТО ДЕЛАЮТ ЕЁ
   ПАЛЬЦЫ. Оттого и соседство в панели, и порядок: сперва решают про руку, потом про пальцы.
   ⚠️ ПОЧЕМУ НЕ В КОНСТРУКТОРЕ ЭФФЕКТОВ. Конструктор устроен ОТ ПАРАМЕТРА (эффект → параметр → адрес),
   а у дискретного действия параметра НЕТ — строка там оказалась бы чужеродной, и её пришлось бы
   объяснять в самом сложном экране приложения, который только-только устоялся за шесть слайсов.
   ⚠️ ВИДНА ТОЛЬКО У РОЛЕЙ С РУКОЙ НА ЭФФЕКТАХ — и это НЕ тот гейт, что снимали в 3.4.1. Там прятали
   ЦЕПЬ, которая звучит и без руки (гейт был ложью). Здесь прячут ПОДПИСКИ ПАЛЬЦЕВ, а назначаемые пальцы
   существуют ровно у руки-эффектов: без неё показывать было бы нечего.
   ⚠️ ЗАЧЕМ ЖЕ ХРАНИТЬ ПОДПИСКУ, КОГДА РУКИ НЕТ: убрал руку с эффектов и вернул — палец обязан получить
   СВОЁ назначение обратно, а не ноль (тот же закон, по которому у параметра эффекта палец/ось переживают
   смену режима). Поэтому секция ПРЯЧЕТСЯ, а данные живут. */
const handActSep=$('handActSep'), handActRows=$('handActRows');
/* Параметры цепи, которые ведёт ЭТОТ ЖЕ палец. Нужны ровно для чипа «делится»: подписка на палитру
   пальца не отнимает (ACTIONS.chFam.exclusive===false), и человек вправе знать, с кем он его делит. */
function actShareOn(key,finger){
  const out=[];
  for(const eff of fxChainOf(key)){
    const pkeys=fxParamKeys(eff.fxId);
    eff.params.forEach((pa,pi)=>{
      if(pi>=pkeys.length) return;                                   // параметра без дескриптора жест не ведёт (см. fxShareMap) — и делить нечего
      if(pa.mode==='drive' && pa.hand==='fx' && (pa.finger|0)===finger) out.push(fxTitleOf(eff.fxId)+' · '+t(pkeys[pi]));
    });
  }
  return out;
}
function renderHandActs(){
  if(!handActSep||!handActRows) return;
  const roles=noteRolesInPlay().filter(roleHasFx);   // те же роли, что у «Функций рук», но лишь с рукой на эффектах
  handActSep.style.display = handActRows.style.display = roles.length ? '' : 'none';
  handActRows.textContent='';
  if(!roles.length) return;
  for(const role of roles){
    const rl=document.createElement('div'); rl.className='handFnRole'; rl.textContent=instrLbl(role);   // тот же класс, что у «Функций рук»: секции читаются как одна лестница
    handActRows.appendChild(rl);
    FINGER_KEYS.forEach((fk,f)=>{
      const row=document.createElement('div'); row.className='prow';
      const lab=document.createElement('label'); lab.textContent=t(fk);
      const sel=document.createElement('select'); sel.autocomplete='off';   // как в renderFxCtl/renderHandFn: не даём браузеру восстановить прежнее значение ПОВЕРХ данных
      const opt=(v,txt)=>{ const o=document.createElement('option'); o.value=v; o.textContent=txt; return o; };
      sel.appendChild(opt('',t('act.none')));
      /* ⚠️ НЕДОСТУПНОЕ ДЕЙСТВИЕ ПОКАЗЫВАЕМ ОТКЛЮЧЁННЫМ И С ПРИЧИНОЙ, а не прячем (дисциплина «Раскладки
         нот»): исчезнувший пункт читается как «такого не бывает», тогда как правда — «не на этом ладу».
         А если он уже НАЗНАЧЕН, спрятать его значило бы ещё и соврать про текущее состояние. */
      for(const a of Object.values(ACTIONS)){
        const ok=a.avail(), name=t(a.labelKey);
        const o=opt(a.id, ok?name:t('act.unavail',{name}));
        if(!ok) o.disabled=true;
        sel.appendChild(o);
      }
      const cur=handActOf(role,'fx',f)||'';
      sel.value=cur;
      if(sel.value!==cur) sel.appendChild(opt(cur,cur));   // назначено действие, которого нет в реестре (чужая/будущая сборка) — не теряем выбор молча
      sel.onchange=e=>{ setHandAct(role,'fx',f,e.target.value||null); softAllOff();   // подписка меняет СМЫСЛ щипка этим пальцем — глушим звучащее, как смена функции руки или раскладки
        renderHandActs(); };                                                          // перерисовка своя: изменился чип «делится» у этой строки
      row.appendChild(lab); row.appendChild(sel);
      if(cur){ const sh=actShareOn(chainKeyOf(role),f); if(sh.length) row.appendChild(fxShareChip([sh])); }   // O-0: делят ПАРАМЕТРЫ ЦЕПИ — значит спрашиваем по ключу цепи этой роли
      handActRows.appendChild(row);
    });
  }
  handActRows.appendChild(fxHint('act.hint'));
}
/* ═══ ЧИСЛОВОЕ ПОЛЕ СО СТУПЕНЬКАМИ «−[поле]＋» — ОДИН ОРГАН НА ВСЕ ФИКСИРОВАННЫЕ ВЕЛИЧИНЫ ═══
   Вынесен из строки параметра в 3.7.3, когда понадобился ВТОРОЙ такой же (фиксированная громкость
   роли). Второй экземпляр писать нельзя: у этого органа накоплена нетривиальная история поведения,
   и копия неизбежно разошлась бы с оригиналом.
   ⚠️ ЗДЕСЬ БЫЛ ПОЛЗУНОК (<input type=range>) — УДАЛЁН, И ПРИЧИНА ЕГО ПОЛОМКИ БЫЛА НАЗВАНА НЕВЕРНО
   («виноват touch-action:none»). На деле ползунок стоял в ПЕРЕПОЛНЕННОЙ строке (её ломал селект режима,
   см. .fxmode) и схлопывался в НУЛЕВУЮ ШИРИНУ, а касание по ползунку нулевой ширины читается как его
   ЛЕВЫЙ КРАЙ, то есть 0 — обработчик честно писал этот ноль в состояние, отсюда «уехало в ноль и
   залипло». Дело было в ШИРИНЕ. ⛔ Не гнаться за touch-action и не возвращать ползунок.
   ⚠️ ПЕРЕРИСОВКИ ПОСЛЕ ЗАПИСИ НЕТ — намеренно: renderFxCtl уничтожил бы поле под пальцем прямо во
   время ввода. Данные остаются источником правды, следующая перерисовка возьмёт значение из них.
   ⚠️ ПУСТОЕ/нечисловое поле — НЕ ноль, а ЖДЁМ: иначе стирание ради набора нового числа мгновенно
   глушило бы величину (ловушка `+''||0`, ровно она и помогла ползунку залипнуть в нуле).
   cur() отдаёт 0..100 ИЗ ДАННЫХ; put(p100) пишет клампнутое целое туда, куда решит вызывающий. */
function buildStepper(cur,put){
  const seg=document.createElement('div'); seg.className='seg';
  const dec=document.createElement('button'); dec.type='button'; dec.className='step'; dec.textContent='−';
  const inc=document.createElement('button'); inc.type='button'; inc.className='step'; inc.textContent='＋';
  const num=document.createElement('input'); num.type='number'; num.className='numv';
  num.min='0'; num.max='100'; num.step='1'; num.inputMode='numeric'; num.autocomplete='off';
  num.value=String(cur());
  const set=pct=>{
    const p100=Math.max(0,Math.min(100,Math.round(pct)));
    put(p100);
    if(num.value!==String(p100)) num.value=String(p100);   // не переписываем без нужды — иначе прыгает каретка при наборе
  };
  dec.onclick=()=>set(cur()-1);
  inc.onclick=()=>set(cur()+1);
  num.oninput=e=>{ const v=e.target.value.trim(); if(v==='')return; const n=parseInt(v,10); if(!isNaN(n)) set(n); };
  num.onchange=()=>{ const n=parseInt(num.value,10); if(isNaN(n)) num.value=String(cur()); else set(n); };   // ушёл фокус с мусором → вернуть показ из данных
  seg.appendChild(dec); seg.appendChild(num); seg.appendChild(inc);
  return seg;
}
/* ═══ ПРАВКА СОСТАВА ЦЕПИ — ДВЕ ПОЛОВИНЫ, И ОБЕ ОБЯЗАТЕЛЬНЫ ═══
   ДАННЫЕ меняет state (fxChainAdd/fxChainRemove), ЗВУК — audio (fxSetActive). Разнесены не по вкусу:
   state до audio НЕ ДОТЯГИВАЕТСЯ (audio импортирует state, обратный импорт — цикл), поэтому сеттер
   физически не может ни зажечь, ни погасить модуль. Ровно по этой же причине ui засевает фиксированные
   значения живыми (см. ниже) — правило одно: инварианты ДАННЫХ держит сеттер, всё, что требует УЗЛОВ,
   делает ui как единственный, кто видит оба слоя.
   ⛔ ПОЭТОМУ ОБЁРНУТО В ФУНКЦИИ, а не расписано по месту: ui — единственный писатель цепи, и пока правка
   идёт ЧЕРЕЗ ЭТИ ДВЕ, забыть половину нельзя. Появится третье место правки — звать надо их же.
   ⚠️ Старые скалярные (делей/вибрато/драйв/тремоло) гасит hushUnassignedFx ВНУТРИ сеттера (правило 2.5),
   и fxSetActive для них — тихий no-op: экземпляра у них нет. Каждому свой механизм, дублирования нет. */
function fxChainDrop(key,effIdx){
  const eff=fxChainOf(key)[effIdx]; if(!eff) return;
  const id=eff.fxId;
  fxChainRemove(key,effIdx);      // данные (+ гашение СТАРЫХ СКАЛЯРНЫХ внутри сеттера)
  fxSetActive(key,id,false);      // звук: уводим ВЛАЖНУЮ ДОЛЮ в 0, сеть не разбираем — хвост дозвучит
  /* O-1: ТРЕТЬЯ половина — ПУТЬ. Снятый эффект остаётся в графе (иначе разрыв связи срезал бы звучащий
     хвост), но уезжает в конец пути, где он чистое тождество; живые сдвигаются на его место. */
  fxChainResplice(key);
}
function fxChainPut(key,fxId,nParams){
  const idx=fxChainAdd(key,fxId,nParams);
  if(idx>=0){
    fxSetActive(key,fxId,true);   // ВОЗВРАТ: влажная доля поднимается из 0 к СОХРАНЁННОМУ значению параметра (p.cur никто не стирал)
    /* O-1: и ПЕРЕСБОРКА ПУТИ. Первое добавление её сделает само (fxInstance строит и пересобирает), но
       ВОЗВРАТ ранее снятого — нет: экземпляр уже есть, а место в порядке цепи у него новое. */
    fxChainResplice(key);
  }
  return idx;
}
/* Имя эффекта для ЗАГОЛОВКА группы строк: у старых скалярных — из FX_META, у модулей — из реестра.
   Реестр читаем НА КАЖДУЮ ОТРИСОВКУ, а не один раз: до initAudio он пуст (узлов ещё нет), а панель
   может быть перерисована и до старта (см. довод в showScale).
   ⚠️ ПРЕЖНЕГО «списка эффекта на строке пальца» больше нет (снят в 3.4.2, когда строка стала
   ПАРАМЕТРОМ). Состав цепи правится иначе — «+ Добавить эффект» в подвале секции и ✕ в заголовке
   (Пласт 3.4.3); имя эффекта здесь — только подпись заголовка.
   ⛳ САМА ФУНКЦИЯ ПЕРЕЕХАЛА В draw и ИМПОРТИРУЕТСЯ отсюда: её понадобился ВТОРОЙ читатель — подвал
   редактора («что у дорожки захвачено»). Две копии разошлись бы там, где сверить их труднее всего, —
   в двух разных экранах; а живёт она в draw потому, что ui импортирует draw, и обратный импорт был бы
   циклом. Поведение не менялось ни на символ. */
/* Подписи ПАРАМЕТРОВ. У СТАРЫХ скалярных параметр ОДИН и он же и есть сам эффект — подписываем
   нейтрально («Величина»): имя эффекта уже стоит заголовком выше, повторять его — шум.
   У МОДУЛЯ берём labelKey каждого параметра. Неизвестный эффект параметров не имеет — строк нет.
   ⚠️ Развилку «скаляр или модуль» знает и gestures (fxParamsOf), но там она отвечает на ДРУГОЙ вопрос —
   КУДА ПИСАТЬ, — а здесь на «как подписать». Общего источника нет намеренно: слои разные, и тянуть
   подписи в жест-слой значило бы тащить туда i18n. */
function fxParamKeys(fxId){
  if(fxIsScalar(fxId)) return ['fx.param.amt'];   // старый скалярный — по ЕДИНОМУ признаку (в.1). Спроси FX_META — делей-модуль получил бы ОДИН ключ вместо трёх, и меню потеряло бы время и повторы
  const mod=FX_FACTORY[fxId];
  return mod ? mod.params.map(p=>p.labelKey) : [];
}
function renderFxCtl(){
  if(!fxCtlSep||!fxCtlRows) return;
  fxCtlSep.style.display = fxCtlRows.style.display = '';   // секция видна ВСЕГДА (см. шапку: гейт roleHasFx снят вместе с его дырой)
  fxCtlRows.textContent='';
  /* ВЫБОР РОЛИ — первой строкой: он решает, ЧТО показано ниже. Звук не трогаем и softAllOff не зовём:
     смена роли здесь меняет лишь то, чью цепь мы РАССМАТРИВАЕМ, — ни голосов, ни зон рук. */
  {
    const row=document.createElement('div'); row.className='prow';
    const lab=document.createElement('label'); lab.textContent=t('fx.role');
    const sel=document.createElement('select'); sel.autocomplete='off';   // как и прочие динамические селекты: не даём браузеру восстановить значение ПОВЕРХ данных
    for(const r of FX_ROLE_SEQ){ const o=document.createElement('option'); o.value=r; o.textContent=t('role.'+r); sel.appendChild(o); }
    sel.value=fxCtlRole;
    sel.onchange=e=>{ fxCtlRole=e.target.value; renderFxCtl(); };
    row.appendChild(lab); row.appendChild(sel); fxCtlRows.appendChild(row);
  }
  const chain=fxChainOf(fxCtlChain());
  /* ⚠️ ВЕТКА «У ЭТОЙ РОЛИ НЕТ ЦЕПИ» УДАЛЕНА (Пласты 3.5.3/3.5.4), и это не упрощение, а следствие: цепь
     теперь МОЖЕТ БЫТЬ У ЛЮБОЙ из четырёх ролей — обработка появилась на всех шинах. Объяснение
     «аккорды, бас и ударные идут на выход без обработки» стало ЛОЖЬЮ, а ложная подсказка хуже
     отсутствующей. Пустая цепь теперь рисуется как пустая: заголовков нет, а «+ Добавить эффект» в
     подвале сам говорит, что делать. Гейта здесь больше нет НИ ОДНОГО — все роли равны.
     ⚠️ ПОДСКАЗКА ПРО РУКУ — ТОЛЬКО У НЕПУСТОЙ ЦЕПИ. Она говорит «пальцевые адреса НИЖЕ не действуют»,
     а при пустой цепи никаких адресов ниже нет: это был бы ответ на незаданный вопрос. */
  if(chain.length && !roleHasFx(fxCtlRole)) fxCtlRows.appendChild(fxHint('fx.noHand'));
  /* ═══ ФИКСИРОВАННАЯ ГРОМКОСТЬ РОЛИ — ПОЯВЛЯЕТСЯ, ТОЛЬКО КОГДА X ОТДАН ЭФФЕКТУ (Пласт 3.7.3) ═══
     Это не настройка «на всякий случай», а ПРЯМОЕ СЛЕДСТВИЕ выбора: подписал параметр этой роли на
     «Играющая рука → Горизонталь» — рука больше не ведёт громкость, и её надо где-то задать. Пока
     такого адреса в цепи нет, строки нет вовсе: контрол, который ничего не делает, хуже отсутствующего.
     ⚠️ Условие ВЫВОДИТСЯ из цепи (chainXDriven), а не хранится флагом — поэтому строка появляется и
     исчезает сама, без отдельной синхронизации, и соврать не может.
     ⚠️ СТОИТ ЗДЕСЬ, у начала секции, а не в строке эффекта: величина принадлежит РОЛИ, а не тому
     параметру, который занял ось (их может быть и несколько — адрес один на многих).
     ⚠️ Орган — ОБЩИЙ buildStepper (второго такого поля не заводим: у него накопленная история, см. там).
     Шкала 0..100 = громкость 0..1 напрямую (это амплитуда голоса, а не нормированный параметр эффекта,
     поэтому здесь нет ни fxNorm, ни кривой — число означает ровно то, что показывает). */
  if(chainXDriven(fxCtlChain())){
    const row=document.createElement('div'); row.className='prow';
    const lab=document.createElement('label'); lab.textContent=t('fx.volFix');
    row.appendChild(lab);
    row.appendChild(buildStepper(
      ()=>Math.round(fxVolFix[fxCtlRole]*100),
      p100=>setFxVolFix(fxCtlRole,p100/100)));
    fxCtlRows.appendChild(row);
    fxCtlRows.appendChild(fxHint('fx.volFixHint'));
  }
  /* ЗАСЕВ ФИКСИРОВАННЫХ ЗНАЧЕНИЙ, ЕЩЁ НЕ ЗАПОЛНЕННЫХ (v01 не задан). Тот же приём, что при добавлении
     эффекта (3.4.3), распространённый на цепи ПО УМОЛЧАНИЮ: цепь аккордов объявлена в state без
     чисел, потому что нормировка (лог-шкалы, min/max) живёт исключительно в audio и второго её
     представления быть не должно. Живое значение спрашиваем у экземпляра — он и есть источник правды.
     ⚠️ ДО initAudio дескрипторов нет: ps[pi] пуст, засев просто не случится, и параметр останется
     незаполненным до следующей отрисовки. Это безвредно — панель открывается только после старта. */
  chain.forEach((eff,ei)=>{
    const ps=fxParamsOf(fxCtlChain(),eff.fxId);
    eff.params.forEach((pa,pi)=>{
      if(pa.mode==='fixed' && pa.v01==null && ps[pi]) setFxParamFixed(fxCtlChain(),ei,pi,ps[pi].get());
    });
  });
  const share=fxShareMap(chain);   // выводим ОДИН раз на отрисовку: карту читают и заголовки, и строки параметров
  /* ═══ ДВЕ ЗОНЫ СПИСКА (слайс O-1) ═══
     ⛳ ЗАЧЕМ. Список ВСЕГДА держал ДВА разных рода вещей, и до сих пор это было невидимо: драйв и вибрато
     делаются ВНУТРИ ГОЛОСА (шейпер до огибающей; LFO в detune), а реверб, делей и тремоло обрабатывают
     УЖЕ СЛОЖЕННЫЙ звук. Пока порядок был неслышен, разница ничего не стоила. Стала слышна — и человек,
     увидев стрелки перестановки, попробовал бы утащить драйв ПОД делей. Это невозможно не по решению, а
     по устройству: голос звучит раньше суммы всегда.
     ⛳ ПОКАЗЫВАЕМ НЕВОЗМОЖНОСТЬ, А НЕ ЗАПРЕЩАЕМ МОЛЧА: две подписанные группы, и стрелки есть только во
     второй. Отсутствие стрелки объяснено одной строкой подсказки — это намёк, а не трактат.
     ⚠️ ГРУППИРУЕТ ТОЛЬКО ПОКАЗ. Данные остаются ОДНИМ плоским массивом в порядке звука (правило
     «никакого второго списка», см. fxChainMove): зона выводится из рода эффекта, индексы остаются
     настоящими индексами массива. */
  const zoneOf=fxId=>{ if(fxIsScalar(fxId)) return 'voice';      // старый скалярный (драйв/вибрато/тремоло-нота) — всегда в голосе
    const m=FX_FACTORY[fxId]; return (m&&m.kind==='voice')||!m ? 'voice' : 'bus'; };   // неизвестную запись считаем голосовой: у неё нет узлов, в путь она не войдёт
  const rows=chain.map((eff,effIdx)=>({eff,effIdx,zone:zoneOf(eff.fxId)}));
  const busRows=rows.filter(r=>r.zone==='bus');                  // порядок ЗВУКА — тот же, что в массиве
  const ordered=[...rows.filter(r=>r.zone==='voice'), ...busRows];   // показываем «в ноте» первым: так читается путь сигнала сверху вниз
  let lastZone=null;
  ordered.forEach(({eff,effIdx,zone})=>{
    if(zone!==lastZone){                                         // ЗАГОЛОВОК ЗОНЫ — тем же классом, что у групп «Функций рук»: панель читается одной лестницей
      lastZone=zone;
      const zl=document.createElement('div'); zl.className='handFnRole';
      zl.textContent=t(zone==='voice'?'fx.zone.voice':'fx.zone.bus');
      fxCtlRows.appendChild(zl);
      fxCtlRows.appendChild(fxHint(zone==='voice'?'fx.zone.voiceHint':'fx.zone.busHint'));
    }
    /* СОСЕД ПО ЗОНЕ — цель переноса. Берём индекс СЛЕДУЮЩЕЙ/ПРЕДЫДУЩЕЙ записи ТОЙ ЖЕ зоны в массиве:
       так голосовая запись, случайно лежащая между двумя сигнальными, остаётся на месте. */
    const bi=busRows.findIndex(r=>r.effIdx===effIdx);
    const upTo   = zone==='bus'&&bi>0                  ? busRows[bi-1].effIdx : null;
    const downTo = zone==='bus'&&bi>=0&&bi<busRows.length-1 ? busRows[bi+1].effIdx : null;
    /* ЗАГОЛОВОК ЭФФЕКТА — строка аккордеона: [▸/▾][имя][сводка адресов][✕].
       Свёрнутый заголовок обязан быть САМОДОСТАТОЧНЫМ (см. fxAddrSummary): иначе аккордеон не «убирает
       лишнее», а ПРЯЧЕТ нужное, и человек разворачивает всё подряд, лишь бы узнать, что где. */
    const open = fxOpenId===eff.fxId;
    const hd=document.createElement('div'); hd.className='fxhead'+(open?' open':'');
    hd.setAttribute('role','button'); hd.tabIndex=0;
    const arw=document.createElement('span'); arw.className='fxarw'; arw.textContent=open?'▾':'▸';
    const nm=document.createElement('span'); nm.className='fxname'; nm.textContent=fxTitleOf(eff.fxId);
    const sm=document.createElement('span'); sm.className='fxsum'; sm.textContent=fxAddrSummary(eff);
    /* ✕ — СВОЯ кнопка внутри заголовка, поэтому её клик обязан НЕ разворачивать эффект (stopPropagation).
       Убирание — не «опасное» действие без возврата: эффект возвращается тем же «+ Добавить», а
       старый скалярный при этом стартует С НУЛЯ (его гасит fxChainRemove → hushUnassignedFx). */
    const del=document.createElement('button'); del.type='button'; del.className='fxdel'; del.textContent='✕';
    del.title=t('fx.remove'); del.setAttribute('aria-label',t('fx.remove'));
    del.onclick=e=>{ e.stopPropagation();
      if(fxOpenId===eff.fxId) fxOpenId=null;         // разворачивать после удаления нечего
      fxChainDrop(fxCtlChain(),effIdx); renderFxCtl(); };   // ДАННЫЕ + ЗВУК одной операцией (см. fxChainDrop): снятый эффект обязан замолчать
    hd.appendChild(arw); hd.appendChild(nm); hd.appendChild(sm);
    /* ЧИП НА ЗАГОЛОВКЕ — чтобы совместность была видна БЕЗ разворачивания: иначе её пришлось бы искать,
       разворачивая эффекты по очереди, а это ровно та работа, от которой аккордеон избавлял.
       Группы берём по ВСЕМ параметрам этого эффекта: их может быть несколько (разные адреса, каждый
       делится с кем-то своим), поэтому в подсказку уходят все, а на чипе — САМАЯ БОЛЬШАЯ. */
    {
      const gs=[]; const seen=new Set();
      for(const pa of eff.params){ const k=fxAddrKey(pa); if(!k||seen.has(k)) continue; seen.add(k);
        const g=share.get(k); if(g&&g.length>1) gs.push(g); }
      if(gs.length) hd.appendChild(fxShareChip(gs));
    }
    /* ▲▼ — ПЕРЕСТАНОВКА, только во второй зоне. Стоят ПЕРЕД ✕: «подвинуть» — операция обратимая и частая,
       «убрать» — край строки, как было. Клик не разворачивает эффект (stopPropagation, как у ✕).
       ⚠️ Крайняя запись получает ОТКЛЮЧЁННУЮ кнопку, а не отсутствующую: исчезающий орган сдвигал бы
       соседние на каждый шаг, и попасть пальцем стало бы лотереей (та же дисциплина, что у «Раскладки нот»). */
    if(zone==='bus'&&busRows.length>1){
      const mk=(txt,key,to)=>{
        const b=document.createElement('button'); b.type='button'; b.className='fxmv'; b.textContent=txt;
        b.title=t(key); b.setAttribute('aria-label',t(key));
        b.disabled = to==null;
        b.onclick=e=>{ e.stopPropagation();
          if(to==null) return;
          if(fxChainMove(fxCtlChain(),effIdx,to)) fxChainResplice(fxCtlChain());   // ДАННЫЕ + ЗВУК, как у добавления/снятия: порядок в массиве и порядок в графе обязаны совпасть
          renderFxCtl(); };
        return b;
      };
      hd.appendChild(mk('▲','fx.moveUp',upTo));
      hd.appendChild(mk('▼','fx.moveDown',downTo));
    }
    hd.appendChild(del);   // ✕ всегда ПОСЛЕДНИЙ: край строки — предсказуемое место для «убрать», что бы ни выросло левее
    hd.onclick=()=>fxToggleOpen(eff.fxId);
    hd.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fxToggleOpen(eff.fxId); } };   // заголовок кликабельный, а не <button> (внутри своя кнопка ✕) — клавиатуру доигрываем руками
    fxCtlRows.appendChild(hd);
    if(!open) return;   // СВЁРНУТ — строк параметров не строим вовсе (не прячем стилем: меньше DOM, и «одна строка на эффект» становится буквальной)
    /* СТРОКА НА ПАРАМЕТР: [подпись][адрес][инверсия ИЛИ значение]. РАЗВЁРНУТЫЙ ВИД — БЕЗ ИЗМЕНЕНИЙ с
       3.4.2: аккордеон решает, ПОКАЗЫВАТЬ ли эти строки, и ничего не меняет в них самих.
       ⚠️ КОНФЛИКТ АДРЕСОВ РАЗРЕШЁН НАМЕРЕННО: подписал два параметра на один адрес — оба поедут вместе,
       и теперь это возможно даже у РАЗНЫХ эффектов. Это естественный результат жеста, а не ошибка;
       проверок и предупреждений не городим (показать, ЧТО едет вместе, — задача 3.4.4). */
    const pkeys=fxParamKeys(eff.fxId);
    pkeys.forEach((lk,pi)=>{
      const pa=eff.params[pi]; if(!pa) return;
      const sub=document.createElement('div'); sub.className='prow fxsub'; sub.style.paddingLeft='14px'; sub.style.margin='4px 0';
      const plab=document.createElement('label'); plab.textContent=t(lk); plab.style.flex='0 0 114px';
      /* АДРЕС — ОДИН список вместо прежней пары «режим + ось» (см. довод у buildAddrSel). */
      const ad=buildAddrSel(pa);
      ad.onchange=e=>{
        const val=e.target.value, ps=fxParamsOf(fxCtlChain(),eff.fxId), p=ps[pi];
        if(val==='fixed'){
          /* ⚠️ ЗАСЕВ ПРИ ПЕРЕХОДЕ В «ФИКСИРОВАНО» — обязателен (об этом просил комментарий в state 2.6.1):
             берём ТЕКУЩЕЕ ЖИВОЕ значение параметра и делаем его фиксированным. Без засева ручка прыгнула бы
             в ноль, то есть «зафиксировать как есть» звучало бы как «выключить». */
          if(p){ const v01=p.get(); setFxParamMode(fxCtlChain(),effIdx,pi,'fixed'); setFxParamFixed(fxCtlChain(),effIdx,pi,v01); p.set(v01); }
          else setFxParamMode(fxCtlChain(),effIdx,pi,'fixed');
        }else{
          /* АДРЕС РАЗБИРАЕМ ЗДЕСЬ, и только здесь: в данные уезжают отдельные поля hand/finger/axis,
             строка «рука:палец:ось» живёт исключительно в меню. Обратно в 'drive' — палец продолжит
             С ЭТОГО ЖЕ значения (захват берёт базу из живого), латч цел. */
          const [hnd,a,b]=val.split(':');
          if(hnd==='play') setFxParamAddr(fxCtlChain(),effIdx,pi,{hand:'play', axis:a, inv:pa.inv});
          else             setFxParamAddr(fxCtlChain(),effIdx,pi,{hand:'fx', finger:+a, axis:b, inv:pa.inv});
        }
        renderFxCtl();   // смена адреса ДИСКРЕТНА: перерисовать можно и нужно (набор контролов другой)
      };
      sub.appendChild(plab); sub.appendChild(ad);
      /* ЧИП РЯДОМ С АДРЕСОМ — там, где принимают решение: видно СРАЗУ при выборе, что этот адрес уже
         занят кем-то ещё. Стоит ПОСЛЕ списка (адрес — причина, чип — следствие) и не участвует в
         растяжении строки: у .fxsub включён перенос, чип уедет на вторую строку целиком, а не сплющится. */
      {
        const g=share.get(fxAddrKey(pa));
        if(g&&g.length>1) sub.appendChild(fxShareChip([g]));
      }
      if(pa.mode==='fixed'){
        /* ФИКСИРОВАННОЕ ЗНАЧЕНИЕ: поле 0..100 = v01*100, чисто для показа. В звук уходит v01 (0..1)
           ЧЕРЕЗ ТОТ ЖЕ fxParamsOf().set, что и палец, — значит min/max/curve остаются жить только в
           setNorm/fxDenorm, второго представления диапазона не возникает, а лог-шкала реверба (секунды,
           герцы) соблюдается сама собой. Сам орган управления — общий buildStepper (см. выше). */
        sub.appendChild(buildStepper(
          ()=>Math.round((pa.v01||0)*100),                       // ИСТОЧНИК — ДАННЫЕ (pa живой объект параметра в цепи), а не текст поля
          p100=>{ setFxParamFixed(fxCtlChain(),effIdx,pi,p100/100);
                  const p=fxParamsOf(fxCtlChain(),eff.fxId)[pi]; if(p) p.set(p100/100); }));
      }else{
        /* ИНВЕРСИЯ — единственное, что осталось рядом с адресом: сам адрес (рука+палец+ось) выбран
           списком выше. Обёртка галочки — <label> (клик по слову переключает), но БЕЗ колоночной
           ширины: правило .prow label задаёт flex:0 0 128px, и без сброса «Инверсия» съела бы колонку. */
        const invWrap=document.createElement('label'); invWrap.style.flex='0 0 auto'; invWrap.style.display='flex'; invWrap.style.alignItems='center'; invWrap.style.gap='5px';
        const inv=document.createElement('input'); inv.type='checkbox'; inv.autocomplete='off'; inv.checked=!!pa.inv;
        invWrap.appendChild(inv); invWrap.appendChild(document.createTextNode(t('fx.invert')));
        /* Пишем В ДАННЫЕ адрес ЦЕЛИКОМ (он у параметра один и неделим) и перерисовываем ИЗ них — меню
           отражает цепь роли, а не собственный DOM. hand/finger/axis берём из ЖИВОГО параметра: галочка
           меняет только inv, адрес трогать не должна. */
        inv.onchange=()=>{
          setFxParamAddr(fxCtlChain(),effIdx,pi,{hand:pa.hand, finger:pa.hand==='fx'?pa.finger:null, axis:pa.axis, inv:inv.checked});
          renderFxCtl();
        };
        sub.appendChild(invWrap);
      }
      fxCtlRows.appendChild(sub);
    });
  });
  /* «+ ДОБАВИТЬ ЭФФЕКТ» — подвал секции (Пласт 3.4.3). ⚠️ Он ЗАКРЫВАЕТ ДЫРУ, а не добавляет удобство:
     3.4.2 снял выбор эффекта на строке пальца (строка стала параметром), и до этой операции состав цепи
     был неправим вовсе — тремоло, не назначенное по умолчанию, оказалось недостижимым.
     ОДИН СЕЛЕКТ, А НЕ КНОПКА+ДИАЛОГ: первый пункт — приглашение, остальные — доступные эффекты; выбор
     СРАЗУ добавляет. Список строим из FX_META + FX_FACTORY и ВЫЧИТАЕМ уже стоящие в цепи — инвариант
     «одна запись на fxId» человек тогда не может нарушить даже случайно (сеттер его тоже проверяет —
     два рубежа, потому что цена нарушения молчаливая: два дескриптора на один store).
     ⚠️ Реестр модулей читаем ЗДЕСЬ ЖЕ, на каждую отрисовку: до initAudio он пуст (см. довод в showScale).
     ВСЁ ЗАНЯТО — не прячем строку, а ГАСИМ С ПРИЧИНОЙ: исчезнувший контрол человек объяснить не может
     (то же правило, что у «Раскладки нот»). */
  {
    const avail=[];
    /* ⚠️ СТАРЫЕ СКАЛЯРНЫЕ (FX_META) — ТОЛЬКО СОЛО, и это не осторожность, а устройство: их величины
       живут в ОДНОМ глобальном state.fx и едут в СОЛО-событие ноты, а сами они вкручены в соло-путь
       четырьмя разными способами (драйв в голосе до огибающей, вибрато в detune, тремоло вставкой,
       делей посылом). Перенести их на чужую шину — это и своя проводка, и свой store, и вопрос
       формата события; всё это Пласт 3.7, не 3.5. Жест-слой их и так не отдаст чужой роли
       (fxParamsOf возвращает [] вне соло) — здесь мы просто не предлагаем того, что не заработает. */
    if(fxCtlChain()===CHAIN_SOLO) for(const m of FX_META) if(fxIsScalar(m.k)&&!chain.some(e=>e.fxId===m.k)) avail.push([m.k, t(m.fullKey), 1]);   // с в.1 ДЕЛЕЙ — МОДУЛЬ и предлагается ВСЕМ ролям циклом по FX_FACTORY строкой ниже; здесь его отсекает fxIsScalar, иначе у соло он встал бы в список дважды
    for(const id in FX_FACTORY) if(!chain.some(e=>e.fxId===id)) avail.push([id, t(FX_FACTORY[id].labelKey), FX_FACTORY[id].params.length]);
    const row=document.createElement('div'); row.className='prow';
    const sel=document.createElement('select'); sel.autocomplete='off';
    const head=document.createElement('option'); head.value='';
    head.textContent = avail.length ? t('fx.add') : t('fx.addAll');
    sel.appendChild(head);
    for(const [id,label] of avail){ const o=document.createElement('option'); o.value=id; o.textContent=label; sel.appendChild(o); }
    sel.value=''; sel.disabled=!avail.length;
    sel.onchange=e=>{
      const id=e.target.value; if(!id) return;
      const n=(avail.find(a=>a[0]===id)||[,,1])[2];        // сколько параметров — знает сам модуль; у старых скалярных ровно один
      const idx=fxChainPut(fxCtlChain(),id,n);   // ДАННЫЕ + ЗВУК: возвращённый эффект снова слышен (посыл поднимается из 0)
      if(idx>=0){
        /* ЗАСЕВ ФИКСИРОВАННЫХ ЖИВЫМ ЗНАЧЕНИЕМ — обязанность ui (state до audio не дотянется, обратный
           импорт был бы циклом; об этом и просит комментарий у fxChainAdd). Без него параметр, вставший
           фиксированным из-за нехватки пальцев, ПОКАЗЫВАЛ бы 0 при живом узле на другом значении —
           меню бы врало. Для старого скалярного это тот же ноль (его погасило удаление) — сходится. */
        const ps=fxParamsOf(fxCtlChain(),id), eff=fxChainOf(fxCtlChain())[idx];
        eff.params.forEach((pa,pi)=>{ if(pa.mode==='fixed' && ps[pi]) setFxParamFixed(fxCtlChain(),idx,pi,ps[pi].get()); });
        fxOpenId=id;   // разворачиваем добавленное: у него может не быть пальца (все заняты), и это надо увидеть сразу, а не искать
      }
      renderFxCtl();
    };
    row.appendChild(sel); fxCtlRows.appendChild(row);
  }
}
/* ПЕРВИЧНАЯ ОТРИСОВКА — та же причина и тот же приём, что у renderRectCtl/renderPinchCtl выше: пока
   вызов жил в renderHandFn, секция собиралась на инициализации ui заодно с «Функциями рук»; сняв
   владение, надо позвать её самим. Панель на старте закрыта, так что видимого эффекта нет, — но
   секция не должна существовать в неотрисованном состоянии, и showScale не обязан быть первым. */
renderFxCtl();
/* Сплит доступен ТОЛЬКО в ландшафте: в портрете две половины ~195px, палитра аккордов нечитаема.
   ЭКСПОРТ: урок «Две роли» гейтит шаг ориентации ТЕМ ЖЕ предикатом, что и кнопка ◨ — лад и кнопка
   не разойдутся (правило задачи). */
export const canSplit=()=>innerWidth>innerHeight;
/* ◨ Сплит-экран — только в ландшафте (canSplit). .act — включён. Кнопка-тумблер; выбор пары ролей —
   двумя кнопками половин (instrBtnL/R). */
function applySplit(){
  splitBtn.classList.toggle('act', splitOn);
  splitBtn.title = t(splitOn ? 'split.on' : 'split.off');
  splitBtn.style.display = canSplit() ? '' : 'none';
  /* Одна кнопка роли (instrBtn) — только вне сплита; две кнопки половин — только в сплите. Никогда
     не видно все три: instrBtn и L/R взаимоисключимы по splitOn. */
  instrBtn.style.display  = !splitOn ? '' : 'none';
  instrBtnL.style.display = instrBtnR.style.display = splitOn ? '' : 'none';
  applySplitRoles();
}
/* Подписи и акцент двух кнопок половин — из SPLIT_ROLES (та же связка INSTR_LBL/INSTR_COL, что у
   instrBtn). Маркер стороны ◧/◨, чтобы было видно, какая половина. Заодно перерисовывает секцию
   «Функции рук» (renderHandFn): набор ролей в игре сменился — значит сменился и набор строк в ней. */
function applySplitRoles(){
  [instrBtnL,instrBtnR].forEach((b,i)=>{
    const role=SPLIT_ROLES[i];
    b.textContent = (i===0?'◧ ':'') + instrLbl(role) + (i===1?' ◨':'');
    b.style.setProperty('--role', INSTR_COL[role]);
  });
  renderHandFn(); renderHandActs();           // ld/бас-половина могла появиться/исчезнуть — пересобираем «Функции рук» И «Действия пальцев» (у них ОДНА зависимость: набор ролей в игре + handFn)
}
/* Прокрутка роли ОДНОЙ половины: следующий инструмент в INSTR_SEQ, ПРОПУСКАЯ роль ДРУГОЙ половины.
   Так две половины никогда не совпадут → дубль-половины и моно-конфликты (два соло / два баса)
   недостижимы по построению (INSTR_SEQ из 4, другая держит одну — всегда есть 3 варианта). */
function cycleHalf(i){
  const other=SPLIT_ROLES[i^1];
  let r=SPLIT_ROLES[i];
  do{ r=INSTR_SEQ[(INSTR_SEQ.indexOf(r)+1)%INSTR_SEQ.length]; }while(r===other);
  setSplitRole(i,r); softAllOff(); applySplitRoles();
  if(hooks.tutor) hooks.tutor('splitRole',{half:i, role:r});   // ЗАЦЕПКА ОБУЧЕНИЯ: сменилась роль половины (кнопка половины) — урок «Две роли»
}
/* Урок «Две роли» задаёт известную стартовую пару половин СОЛО|АККОРДЫ: игра в обеих половинах даёт
   настоящую музыку (мелодия над гармонией), а не две голые линии. Аккорды звучат, т.к. setup урока СНАЧАЛА
   переключает на Хроматику (см. LESSONS: tutorSetScale ПЕРЕД tutorSplitInit). СТРАХОВКА: если у текущего
   лада аккордов нет (supportsChords false — напр. смена лада не удалась), правая половина падает на БАС,
   а не на молчащую роль. Обе соло-руки на «ноты», чтобы «любая рука в половине» была БУКВАЛЬНО верна: по
   умолчанию левая в соло-половине = эффекты (fx-исключение) и ноту бы не дала. Зовётся из setup урока
   (сплит ещё выключен → кнопки половин скрыты). */
export function tutorSplitInit(){
  setHandFn('ld','L','note'); setHandFn('ld','R','note');
  const right = supportsChords() ? 'ch' : 'bs';   // соло|аккорды, но на бесаккордовом ладу — бас (звучащая роль, не тишина)
  setSplitRole(0,'ld'); setSplitRole(1,right); applySplit();
}
instrBtn.onclick =()=>{ setPhoneInstr(INSTR_SEQ[(INSTR_SEQ.indexOf(phoneInstr)+1)%INSTR_SEQ.length]); softAllOff(); applyInstr(); };
instrBtnL.onclick=()=>cycleHalf(0);
instrBtnR.onclick=()=>cycleHalf(1);
splitBtn.onclick =()=>{ setSplitOn(!splitOn); softAllOff(); applySplit();
  if(hooks.tutor) hooks.tutor('split',{on:splitOn}); };   // ЗАЦЕПКА ОБУЧЕНИЯ: сплит включён/выключен кнопкой ◨ — урок «Две роли»
/* 🔄 Переключение камеры (фронт↔тыл). Уже ПОСЛЕ старта: кнопка живёт в #bar, а он виден лишь после
   «▶ Запустить» — камеру на загрузке не трогаем. Запрашиваем ДРУГУЮ facingMode; camFacing (единый
   источник зеркала flipX/mirrored) двигаем ТОЛЬКО после успеха, чтобы картинка и hit-test флипнулись
   вместе. Отказ (нет второй камеры / нет доступа) — откат на прежнюю камеру + короткий тост, без слома. */
let camMsgTimer=0;
function showCamMsg(msg){
  camMsg.dataset.msg=msg; camMsg.classList.add('on');
  clearTimeout(camMsgTimer); camMsgTimer=setTimeout(()=>camMsg.classList.remove('on'),2600);
}
async function toggleCamera(){
  const next = camFacing==='user' ? 'environment' : 'user';
  camBtn.disabled=true;
  try{
    await switchCamera(next);
    setCamFacing(next);                          // единый источник зеркала — только после успешного открытия
    camBtn.classList.toggle('act', next==='environment');   // .act = тыловая (незеркальная)
  }catch(err){
    try{ await switchCamera(camFacing); }catch(e){}          // откат: возвращаем прежнюю камеру (camFacing не менялся)
    showCamMsg(t('cam.unavailable'));
  }
  camBtn.disabled=false;
}
camBtn.onclick=toggleCamera;
/* ⛶ ПОЛНОЭКРАННЫЙ РЕЖИМ. Две кнопки на ОДНО состояние: тихая на стартовой карточке (fsBtnStart —
   полосы браузера съедают вертикаль ДО игры) и иконка в баре (fsBtn — редкая «задал и забыл», в
   МИНИ-полосу постоянных кнопок НЕ входит, скрыта списком .min в CSS). Обе зовут ОДИН toggle и обе
   отражают состояние через applyFullscreen.
   ПРАВИЛО ЖЕСТА (как звук/камера): requestFullscreen — только из клика, никогда сам на старте.
   ДЕТЕКЦИЯ ПО РЕАЛЬНОМУ API, не по браузеру: iOS Safari на iPhone не умеет полноэкранный для обычных
   элементов (только «на домашний экран») — там прячем ОБЕ кнопки, а не оставляем мёртвыми. Учитываем
   webkit-префикс (старый Safari/Chrome). Выход по Esc/системному жесту ловит fullscreenchange —
   кнопки не соврут о состоянии. Смена размера при входе/выходе идёт обычным путём resize (vision.js
   ресайзит холст, onResize пересчитывает canSplit — потеря хрома может РАЗРЕШИТЬ сплит). */
const fsRoot=document.documentElement;
const fsReq = fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen;
const fsExit = document.exitFullscreen || document.webkitExitFullscreen;
const fsEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
const fsSupported = !!(fsReq && fsExit && fsEnabled);
const fsOn = ()=> !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFullscreen(){
  if(!fsSupported)return;
  try{ const p = fsOn() ? fsExit.call(document) : fsReq.call(fsRoot); if(p&&p.catch)p.catch(()=>{}); }
  catch(e){}                                       // отказ (политика/жест) — молча, applyFullscreen выровняет по факту
}
function applyFullscreen(){
  if(!fsSupported){ fsBtn.style.display='none'; fsBtnStart.style.display='none'; return; }   // нет API — обе кнопки прочь (не мёртвые)
  const on=fsOn();
  fsBtn.classList.toggle('act', on);
  fsBtn.title = t(on ? 'fs.title.exit' : 'fs.title.enter');
  fsBtnStart.classList.toggle('act', on);
  fsBtnStart.textContent = t(on ? 'fs.start.exit' : 'fs.start.enter');
  fsBtnStart.title = fsBtn.title;
}
fsBtn.onclick=toggleFullscreen;
fsBtnStart.onclick=toggleFullscreen;
addEventListener('fullscreenchange', applyFullscreen);
addEventListener('webkitfullscreenchange', applyFullscreen);   // старый Safari/Chrome — своё имя события
applyFullscreen();                                 // старт: отразить факт (и спрятать обе, если API нет)
/* ⬇ УСТАНОВКА НА ДОМАШНИЙ ЭКРАН (PWA). Тот же принцип, что у полноэкранного — ПО РЕАЛЬНОЙ СПОСОБНОСТИ,
   не по строке браузера:
   • Chromium (Android/desktop): ловим beforeinstallprompt, ПРИДЕРЖИВАЕМ событие; кнопка появляется ТОЛЬКО
     после него (до события prompt() пуст → это была бы мёртвая кнопка).
   • iOS Safari: события нет и установить кнопкой нельзя → показываем короткую инструкцию (Share → на экран).
   • Уже установлено / запущено как standalone: прячем всё — предлагать нечего.
   • Что-то ещё без установки: молча прячем, а не оставляем мёртвый контрол.
   Кнопка живёт на стартовой карточке ПОД двумя главными и тише их (CSS). Стартовый поток и две главные
   кнопки НЕ трогаем — это отдельный тихий контрол. */
const installBtn=$('installBtn'), installHint=$('installHint');
let installPrompt=null;
const inStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);          // iPadOS маскируется под Mac
const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
function hideInstall(){ installBtn.style.display='none'; installHint.style.display='none'; }
if(inStandalone){ hideInstall(); }                                             // уже установлено — молчим
else if(isIOSSafari){                                                          // iOS: инструкция вместо кнопки
  installBtn.style.display='none';
  installHint.textContent=t('install.ios');
  installHint.style.display='';
} else {                                                                       // Chromium и пр. — ждём событие
  hideInstall();
  addEventListener('beforeinstallprompt', e=>{
    e.preventDefault();                                                        // без мини-инфобара — показываем свою кнопку
    installPrompt=e;
    installHint.textContent=t('install.hint');
    installBtn.style.display=''; installHint.style.display='';
  });
}
installBtn.onclick=async ()=>{
  if(!installPrompt)return;
  installBtn.disabled=true;
  installPrompt.prompt();
  try{ await installPrompt.userChoice; }catch(e){}                             // принял или отклонил — не важно
  installPrompt=null;                                                          // событие одноразовое, повторно prompt() нельзя
  installBtn.disabled=false; hideInstall();                                    // предложение отработало — убираем (Chrome пришлёт заново позже)
};
addEventListener('appinstalled', ()=>{ installPrompt=null; hideInstall(); });  // установлено — кнопку прочь
/* Регистрируем МИНИМАЛЬНЫЙ SW (sw.js): нужен только чтобы Chromium считал приложение устанавливаемым.
   Он БЕЗ КЭША (пустой fetch), поэтому не трогает камеру/звук/ворклет и относительные пути под подпапкой.
   Путь относительный → scope = папка приложения. Ошибку (file://, нет secure context) молча глотаем. */
if('serviceWorker' in navigator)
  addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
/* 🎥 ВИДЕОКЛИП (кадр холста + звук) и 🎙 АУДИО (только звук) — один движок clip.js на два вида.
   Тап старт / тап стоп+сохранение. Индикатор записи — .act (красный). Инертно до тапа; кнопки живут
   в #bar, а он виден лишь после «▶ Запустить». ВЗАИМНОЕ ИСКЛЮЧЕНИЕ: пока идёт одна запись, ДРУГАЯ
   кнопка disabled (два рекордера на одном отводе недопустимы) — видно, что нельзя, а не «молча не
   работает». Обе кнопки обновляет applyRec из ЕДИНОГО источника правды (activeKind через onClipChange),
   поэтому .act/disabled и реальное состояние не разойдутся. Форматы честно: видео WebM (соцсети могут
   просить MP4), аудио WebM/Opus (Safari может дать mp4) — MP3/WAV не обещаем. */
function applyRec(){
  const k=activeKind();                          // 'video' | 'audio' | null
  clipBtn.classList.toggle('act', k==='video');  clipBtn.disabled  = k==='audio';   // идёт аудио → видео нельзя
  audioBtn.classList.toggle('act', k==='audio'); audioBtn.disabled = k==='video';   // идёт видео → аудио нельзя
  clipBtn.title  = t(k==='video' ? 'clip.title.rec'  : 'clip.title.idle');
  audioBtn.title = t(k==='audio' ? 'audio.title.rec' : 'audio.title.idle');
}
clipBtn.onclick=()=>{
  if(activeKind()==='video'){ stopClip(); showCamMsg(t('clip.saving')); }   // .act снимет onClipChange, когда рекордер РЕАЛЬНО остановится (onstop), не по тапу
  else{
    try{ startClip('video'); showCamMsg(t('clip.recording')); }           // .act/disabled поставит onClipChange из startClip
    catch(err){ applyRec(); showCamMsg(t('clip.errPrefix')+(err&&err.message||err)); }   // старт бросил — состояние точно покой; синхронно приводим кнопки в покой
  }
};
audioBtn.onclick=()=>{
  if(activeKind()==='audio'){ stopClip(); showCamMsg(t('audio.saving')); }
  else{
    try{ startClip('audio'); showCamMsg(t('audio.recording')); }
    catch(err){ applyRec(); showCamMsg(t('audio.errPrefix')+(err&&err.message||err)); }
  }
};
onClipChange(applyRec);                           // единый источник правды в clip.js уведомляет обе кнопки — .act/disabled/рекордер не разойдутся
applyRec();                                       // старт: покой

/* 🎵 ПОДЛОЖКА — два пути от ОДНОЙ кнопки: «Джем» (гармония+бас+ударные) и «Только ударные».
   ВЗАИМОДЕЙСТВИЕ: тап с покоя открывает крошечное меню из двух пунктов, выбор СРАЗУ запускает
   подложку (старт = 2 тапа вместо 1); дальше каждый тап переключает вариант ВНУТРИ выбранного пути
   одним тапом, как было, и в конце цикла — ВЫКЛ (кнопка снова в покое → следующий тап опять спросит).
   Долгий тап (или правый клик) возвращает к выбору, не докручивая цикл.
   Подложка — не режим: это обычные слои лупера, помеченные e.jam (loadJam/clearJam), поэтому ⚙-панель,
   undo и запись работают как обычно. ОБА пути кладутся через loadJam → метка ОДНА, и clearJam снимает
   ровно подложку, никогда не трогая записи игрока (инвариант неизменен). Следствие, честное: джем и
   «только ударные» не сосуществуют — переключение пути снимает прежнюю подложку, как и смена варианта.
   ВАРИАНТ ДЖЕМА ВЫБИРАЕТСЯ ПО СВОЙСТВАМ лада, не по имени/индексу. Данные — из существующих
   HARMONIES/RHYTHMS/BASS_MODES — подложка только ВЫБИРАЕТ. */
const JH_DRONE=0, JH_IviiiV=2, JH_IIVV=3;         // индексы HARMONIES: Дрон / I–vi–ii–V / I–IV–V
const JR_BACK=0, JR_MAQSUM=1, JR_NONE=-1;         // индексы RHYTHMS: Рок (прямой) / Маqсум; -1 → RHYTHMS[-1]=undefined → без ударных
const JH_NONE=-1;                                 // prog<0 → ветка «только ударные» в buildArrangement (ни гармонии, ни баса)
/* Список вариантов (каждый — sel для лупера) в порядке переключения; выкл добавляет цикл в jamBtn. */
function jamVariants(){
  const chords=supportsChords(), prog=supportsProgressions()&&chords;   // 7 ступеней И есть аккорды (макам: 7 ступеней, но noChords → сюда не попадёт)
  if(prog) return [
    {prog:JH_IviiiV, rhythm:JR_BACK, bass:'roots'},   // I–vi–ii–V + бас по корням + прямой рок-бит
    {prog:JH_IIVV,   rhythm:JR_BACK, bass:'roots'},   // I–IV–V + корни + прямой рок-бит
    {prog:JH_DRONE,  rhythm:JR_NONE, bass:'pedal'},   // дрон + педаль, без ударных
  ];
  if(chords) return [                                 // аккорды, но не 7 ступеней: хроматика/19/31/партч/пифагор/натур/мезотон/пентатоники
    {prog:JH_DRONE, rhythm:JR_BACK, bass:'pedal'},    // дрон + педаль + прямой рок-бит
    {prog:JH_DRONE, rhythm:JR_NONE, bass:'pedal'},    // дрон + педаль, без ударных
  ];
  if(CUR().edo===24) return [                         // !supportsChords + 24-TET = макам: уместен маqсум (24-TET уникален для макамов)
    {prog:JH_DRONE, rhythm:JR_MAQSUM, bass:'pedal'},  // дрон + педаль + маqсум
    {prog:JH_DRONE, rhythm:JR_NONE,   bass:'pedal'},  // дрон + педаль, без ударных
  ];
  return [                                            // прочие бесаккордовые (гамелан/BP/Карлос/раги): ударные чужды — сразу лёгкий вариант
    {prog:JH_DRONE, rhythm:JR_NONE, bass:'pedal'},    // дрон + педаль, без ударных
  ];
}
/* «ТОЛЬКО УДАРНЫЕ»: варианты = ГОДНЫЕ для текущего размера паттерны (rhythmsForMetre — тот же единый
   фильтр, что у списка ритмов в панели). В 7 это ровно «Балканский 7» — рока там не предложат. Пусто
   (5/10/12 — паттернов пока нет) → пункт меню ГАСНЕТ с причиной, а не открывает пустой цикл. */
const drumVariants=()=>rhythmsForMetre(loop.metre).map(i=>({prog:JH_NONE, rhythm:i, bass:'none'}));
const backingVariants=mode=> mode==='drums' ? drumVariants() : jamVariants();
let backingMode='jam';                            // выбранный путь: 'jam' | 'drums' (держится, пока цикл не дошёл до выкл)
let backingStep=0;                                // 0 = выкл, 1..N = номер варианта (место в цикле; сама подложка — слои лупера)
let backingSel=null;                              // ФАКТИЧЕСКИ поставленный вариант (уже после fitRhythm) — по нему и подписываем: номер «4/10» ничего не говорит, когда паттернов восемнадцать
/* ИМЯ звучащего варианта. У «только ударных» имя варианта = имя ПАТТЕРНА. У джема вариант — сочетание,
   поэтому «гармония · ритм»: это ровно то, чем варианты различаются на слух (и ритм джема тоже назван).
   Читаем ЖИВЬЁМ из RHYTHMS/HARMONIES через L(), поэтому смена языка переподписывает сама (applyBacking). */
function backingName(sel){
  if(!sel) return '';
  const r = sel.rhythm>=0 && RHYTHMS[sel.rhythm] ? L(RHYTHMS[sel.rhythm].name) : '';
  if(sel.prog<0) return r;                        // только ударные: имя паттерна и есть имя варианта
  const h = HARMONIES[sel.prog] ? L(HARMONIES[sel.prog].name) : '';
  return h+' · '+(r||t('backing.noDrums'));
}
function applyBacking(){
  const n=backingVariants(backingMode).length, on=backingStep>0, drums=backingMode==='drums';
  const nm=on?backingName(backingSel):'';
  jamBtn.classList.toggle('act', on);
  /* На кнопке — ИМЯ и позиция. Длинное имя («Регги (уан-дроп)») не ломает бар: #jamBtn режется
     многоточием средствами CSS (как #scaleBtn), а полное имя всегда есть в title и в тосте смены. */
  jamBtn.textContent = on ? `${drums?'🥁':'🎵'} ${nm} · ${backingStep}/${n}` : t('backing.label');
  jamBtn.title = on ? t(drums?'backing.title.drums':'backing.title.jam',{name:nm, i:backingStep, n})
                    : t('backing.title.off');
}
/* Подгоняем ритм варианта под ТЕКУЩИЙ размер песни: негодный паттерн buildArrangement всё равно
   пропустит (джем остался бы без ударных) → берём первый ГОДНЫЙ, иначе без ударных (-1). На 4/4 ничего
   не меняется (ритмы джема уже beats:4) — байт-в-байт. */
function fitRhythm(sel){
  if(sel.rhythm<0 || rhythmFits(RHYTHMS[sel.rhythm], loop.metre)) return sel;
  const alt=rhythmsForMetre(loop.metre)[0];
  return {...sel, rhythm: alt!=null?alt:-1};      // годного нет → без ударных
}
function backingTo(step, vars){
  clearJam();                                     // снять ПРОШЛЫЕ слои подложки (записи игрока целы — они без метки jam)
  if(step>0){
    const sel=fitRhythm(vars[step-1]);            // подписываем ФАКТИЧЕСКИ поставленное: fitRhythm мог подменить паттерн под размер
    if(!loadJam(sel)){                            // не встало: loadArrangement вернул false (нет AudioContext или сборка не дала ни одного слоя; проверки длины с S3.3 нет) — честно сообщаем, цикл → выкл
      showCamMsg(t('jam.sizeMismatch')); backingStep=0; backingSel=null; applyBacking(); return;
    }
    backingSel=sel;
  } else backingSel=null;
  backingStep=step; applyBacking();
  /* ТОСТ с ПОЛНЫМ именем при каждой смене: кнопку режет многоточие, а в свёрнутом баре её вовсе не видно
     (#bar.min прячет 🎵) — тост же всплывает поверх всего и читается целиком. Выключение не анонсируем:
     тишина сама себя объясняет. */
  if(backingSel) showCamMsg(t(backingMode==='drums'?'backing.nowDrums':'backing.nowJam',{name:backingName(backingSel)}));
}
/* --- Меню выбора пути: открывается только с покоя (или долгим тапом), закрывается по выбору/промаху/Esc --- */
const backingMenuOpen=()=>!backingMenu.hidden;
function closeBackingMenu(){ backingMenu.hidden=true; }
function openBackingMenu(){
  const drums=drumVariants().length;
  backingDrums.disabled = drums===0;
  backingDrums.title = drums ? t('backing.drumsTitle',{n:drums}) : t('backing.drumsNone',{metre:loop.metre});
  const r=jamBtn.getBoundingClientRect();         // бар переносится по ширине — позицию берём у самой кнопки
  backingMenu.hidden=false;
  backingMenu.style.left=Math.max(6, Math.min(r.left, innerWidth-backingMenu.offsetWidth-6))+'px';
  backingMenu.style.top =(r.bottom+6)+'px';
}
function pickBacking(mode){
  closeBackingMenu();
  backingMode=mode;
  backingTo(1, backingVariants(mode));            // выбор СРАЗУ запускает первый вариант — второй тап не нужен
}
backingJam.onclick  =()=>pickBacking('jam');
backingDrums.onclick=()=>pickBacking('drums');
jamBtn.onclick=()=>{
  if(!AC)return;
  if(backingHoldFired){ backingHoldFired=false; return; }   // меню уже открыл долгий тап — клик по отпусканию не должен его закрыть
  if(backingMenuOpen()){ closeBackingMenu(); return; }
  if(backingStep===0){ openBackingMenu(); return; }     // покой → спрашиваем, каким путём
  const vars=backingVariants(backingMode);
  let next=backingStep+1; if(next>vars.length)next=0;   // …→ vN → выкл → (следующий тап снова спросит)
  backingTo(next, vars);
};
jamBtn.oncontextmenu=e=>{ e.preventDefault(); if(AC) openBackingMenu(); };   // правый клик = долгий тап: вернуться к выбору, не докручивая цикл
/* Долгий тап по 🎵 — тот же вход в выбор (на телефоне правого клика нет). Отпускание/уход пальца отменяет. */
let backingHoldTimer=0, backingHoldFired=false;
const cancelBackingHold=()=>{ clearTimeout(backingHoldTimer); backingHoldTimer=0; };
jamBtn.addEventListener('pointerdown', ()=>{ cancelBackingHold(); backingHoldFired=false;
  backingHoldTimer=setTimeout(()=>{ backingHoldTimer=0; if(AC){ backingHoldFired=true; openBackingMenu(); } }, 520); });
jamBtn.addEventListener('pointerup',    cancelBackingHold);
jamBtn.addEventListener('pointercancel',cancelBackingHold);
jamBtn.addEventListener('pointerleave', cancelBackingHold);
/* Промах мимо меню закрывает его (кнопку 🎵 не трогаем — ею же и закрываем, см. onclick). */
addEventListener('pointerdown', e=>{
  if(!backingMenuOpen())return;
  if(e.target.closest && (e.target.closest('#backingMenu')||e.target.closest('#jamBtn')))return;
  closeBackingMenu();
});
addEventListener('keydown', e=>{ if(e.key==='Escape'&&backingMenuOpen())closeBackingMenu(); });
function resetJamDisplay(){ backingStep=0; backingSel=null; closeBackingMenu(); applyBacking(); }   // внешняя очистка/паника петли: цикл начинается заново, путь спросят снова
applyBacking();                                   // старт: выкл
/* Поворот экрана: свой слушатель resize у UI (vision.js в UI не лезет — DOM-граница). Повернули в
   портрет на включённом сплите → выключаем его (softAllOff — ничего не оставляем звучать), иначе
   застряли бы в неиграбельной двух-половинной раскладке. Обратно в ландшафт НЕ включаем сами —
   пользователь жмёт ◨ вручную (предсказуемо). applySplit всегда обновляет видимость кнопок. */
function onResize(){
  if(splitOn && !canSplit()){ setSplitOn(false); softAllOff(); }
  applySplit();
  if(hooks.tutor) hooks.tutor('orient',{landscape:canSplit()});   // ЗАЦЕПКА ОБУЧЕНИЯ: ориентация сменилась (портрет↔ландшафт) — урок «Две роли» (шаг ориентации + возврат при повороте в портрет)
}
addEventListener('resize', onResize);
applySplit(); applyInstr();      // applySplit → applySplitRoles → renderHandFn; applyInstr → renderHandFn (инициализация кнопок ролей и секции «Функции рук»)

/* СМЕНА ЯЗЫКА без перезагрузки: applyI18n (в setLang) уже обновил статические [data-i18n]; здесь
   перерисовываем ДИНАМИКУ — то, что строит/пишет JS (подписи ссылок, кнопка роли + «Функции рук»,
   кнопки половин, титулы кнопок, тексты записи/джема/полноэкранного, кнопка лупа). Списки ладов/
   тембров/аранжировки — музыкальные данные (этап B), их не трогаем: их текст пока не меняется.
   Холст не трогаем — он перерисуется сам следующим кадром (t()/L() читаются на кадр). */
onLangChange(()=>{
  buildStartLinks();
  applyRollBar();      // S5.0: чип дорожки и вкладки ролей строит JS (числа меняются) — переподписываем, как прочие собранные подписи
  // Меню строя/лада: имена теперь локализуются (этап B). Переподписываем традиции НА МЕСТЕ (сохраняя
  // выбор по value=id) и пересобираем список ладов текущей традиции, возвращая выбранный лад (value=индекс).
  [...selTradition.options].forEach(o=>{ const tr=TRADITIONS.find(x=>x.id===o.value); if(tr)o.textContent=L(tr.name); });
  fillScales(selTradition.value); selScale.value=scaleIdx;
  // Тембры/аранжировка (этап B, часть 2): переподписываем НА МЕСТЕ по индексу (порядок опций = порядок массива).
  [...selLead.options].forEach((o,i)=>o.textContent=L(LEAD_INSTR[i].label));
  [...selChord.options].forEach((o,i)=>o.textContent=L(CHORD_INSTR[i].label));
  [...selBass.options].forEach((o,i)=>o.textContent=L(BASS_INSTR[i].label));
  [...selDrumKit.options].forEach((o,i)=>o.textContent=L(DRUM_KITS[i].label));
  [...selProg.options].forEach((o,i)=>o.textContent=L(HARMONIES[i].name));
  [...selRhythm.options].forEach((o,i)=>o.textContent=L(RHYTHMS[i].name));
  [...selBassMode.options].forEach((o,i)=>o.textContent=L(BASS_MODES[i].name));
  updScaleBtn(); updRecBtn(); updLoopBtn();
  renderRectCtl();                     // «Раскладка нот»: варианты строит JS (подпись «По ладу: …» составная) + причина недоступности
  renderPinchCtl();                    // «Пальцев в руке»: подписи вариантов составные («2 ноты одновременно»)
  applyInstr(); applySplit();          // роль + половины + «Функции рук» + видимость/титулы
  renderFxCtl();                       // конструктор: свой вызов (3.4.1 снял владение «Функций рук») — подписи ролей/параметров/подсказок собирает JS
  refreshMetreCtl();
  applyRec(); applyBacking(); applyFullscreen();
});

export { $, revealBar, syncTutorBarPos as tutorSyncBar };   // tutor зовёт на СТАРТЕ урока: полоса только что получила .on, а положение (.mini при открытой панели) считается по событиям панели/лупера — без этого первый кадр урока лёг бы полной полосой поверх открытого меню
