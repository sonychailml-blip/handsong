import { scaleIdx, tonic, setScaleIdx, setTonic, setSeventh, setChIdx,
         phoneInstr, setPhoneInstr, handFn, setHandFn, splitOn, setSplitOn, SPLIT_ROLES, setSplitRole,
         camFacing, setCamFacing, aRef, setARef, rectPref, setRectPref,
         pinchFingers, setPinchFingers,
         fxLayout, setFxSlotId, setFxParamAxis, roleHasFx } from './state.js';
import { switchCamera } from './vision.js';
import { startClip, stopClip, activeKind, onClipChange } from './clip.js';
import { SCALES, NOTE_NAMES, TRADITIONS, scalesOfTrad, tradOfScale, supportsProgressions, supportsChords, CUR, rectDefault } from './scales.js';
import { setLeadInstr, setBassInstr, setDrumKit, LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_KITS, AC, droneOn, FX_MODULES } from './audio.js';
import { softAllOff, panic, onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopMetre, setLoopSub, setLoopQuant, setLoopBpm, loop, events, recording, loadArrangement, loadJam, clearJam } from './recorder.js';
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
      scaleBtn=$('scaleBtn'), loopPanelBtn=$('loopPanelBtn'),
      panelScaleEl=$('panelScale'), panelLoopEl=$('panelLoop');
 
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
function updRecBtn(){
  recBtn.classList.toggle('on', recording);                     // идёт запись (любая)
  recBtn.classList.toggle('first', recording && loop.first);    // первый круг ≠ наложение
  recBtn.classList.toggle('armed', !recording && loop.on);      // петля играет: тап добавит слой
  recBtn.title = recording
    ? (loop.first ? t('rec.title.recFirst')
                  : t('rec.title.overdub',{n:loop.layer+1}))
    : (loop.on ? t('rec.title.armed')
               : t('rec.title.idle'));
  loopBarsV.textContent = loop.bars;
}
function updLoopBtn(){ loopBtn.textContent = t(loop.on ? 'transport.loopPause' : 'transport.loopPlay'); }   // текст кнопки лупа по состоянию (для смены языка и hooks.loop)
hooks.rec       = () => { updRecBtn(); syncTutorBarPos(); };   // запись вкл/выкл → коробка лупера появляется/меняется → переставить подсказку тура
hooks.loop      = on => { loopBtn.classList.toggle('on', on); updLoopBtn(); updRecBtn(); refreshMetreCtl(); syncTutorBarPos(); };   // транспорт менялся → перечитать блокировку размера (пусто/играет) И положение подсказки (коробка появилась/ушла)

/* Две панели (звукоряд и лупер) — оба оверлея на ОДНОМ месте (сверху). Одна за раз: открытие одной
   прячет другую (иначе перекрылись бы). Лупер РАНЬШЕ жил снизу, чтобы холстовая сетка тактов
   оставалась видна при игре; теперь он тоже сверху (см. #panelLoop в style.css) — сетку видно после
   закрытия панели. */
function showLoop(on){ panelLoopEl.classList.toggle('on',on); loopPanelBtn.classList.toggle('on',on);
  if(on){ panelScaleEl.classList.remove('on'); refreshMetreCtl(); }   // при открытии — актуализируем блокировку размера (петля могла измениться при закрытой панели)
  if(on && hooks.tutor) hooks.tutor('panel',{which:'loop'});   // ЗАЦЕПКА ОБУЧЕНИЯ: открыли панель лупера — урок «Лупер»
  syncTutorBarPos(); }
function showScale(on){ panelScaleEl.classList.toggle('on',on); if(on)showLoop(false);
  if(on && hooks.tutor) hooks.tutor('panel',{which:'scale'});   // ЗАЦЕПКА ОБУЧЕНИЯ: открыли меню лада — урок «Строи и тембры»
  syncTutorBarPos(); }
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
function inOpenPanel(t){ return !!(t && t.closest && t.closest('#panelScale.on, #panelLoop.on')); }
function hushStrip(){ const el=$('tutorBar'); if(!el||!el.classList.contains('on'))return; clearTimeout(stripReturnTimer); el.classList.add('hushed'); }   // без урока класс не вешаем вовсе — нечего гасить
function armStripReturn(){ clearTimeout(stripReturnTimer); stripReturnTimer=setTimeout(()=>{ const el=$('tutorBar'); if(el)el.classList.remove('hushed'); }, STRIP_RETURN_MS); }
$('panelClose').onclick=()=>showScale(false);
$('panelCloseLoop').onclick=()=>showLoop(false);   // «Свернуть ✕» лупера — тот же путь закрытия, что и у ⚙/взаимоисключения
scaleBtn.onclick=()=>showScale(!panelScaleEl.classList.contains('on'));
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
   через BAR_HIDE_MS без действий — снова .min. НЕ сворачиваем, пока открыта панель (#panelScale/
   #panelLoop) ИЛИ зажат палец/курсор — иначе меню закрылось бы под рукой. Тап ТОЛЬКО показывает меню:
   игра идёт с камеры (жесты), ввод с тача не читает никто — раскрытие не крадёт жест и не рождает ноту. */
const barEl=$('bar');
const BAR_HIDE_MS=3500, MOUSE_EPS=8;            // BAR_HIDE_MS — авто-скрытие, мс; MOUSE_EPS — порог движения мыши, px
let barTimer=0, pointerDown=false, downOnBar=false, lastMX=null, lastMY=null;   // downOnBar — жест начат ПО кнопке бара (не раскрываем, см. pointerdown)
const panelOpen=()=>panelScaleEl.classList.contains('on')||panelLoopEl.classList.contains('on');
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
  setHandFn('ld','L','fx'); setHandFn('ld','R','note'); softAllOff(); renderHandFn();
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
  if(events.some(e=>e.fn==='drone'))droneOn();     // дрон softAllOff не трогает — переигрываем на новую опору сразу (lvl 0.18, как в аранжировке)
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
  instrBtn.style.setProperty('--role', INSTR_COL[phoneInstr]); renderHandFn();   // цвет роли; секция «Функции рук» зависит от активной роли
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
  bs:[['note','handfn.note'],['hold','handfn.hold'],['therm','handfn.therm'],['loop','handfn.loop']],
  ch:[['latch','handfn.latch'],['hold','handfn.chHold'],['loop','handfn.loop']],
};
const handFnRows=$('handFnRows'), handFnSep=$('handFnSep');
const HAS_HANDFN=r=>r==='ld'||r==='bs'||r==='ch';   // роли с записью в handFn (у dr её нет)
function noteRolesInPlay(){
  if(!splitOn) return HAS_HANDFN(phoneInstr) ? [phoneInstr] : [];
  return [...new Set(SPLIT_ROLES)].filter(HAS_HANDFN);   // сплит: уникальные ld/бас/аккорд-половины
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
      const sel=document.createElement('select');
      for(const [v,k] of HANDFN_OPTS[role]){ const o=document.createElement('option'); o.value=v; o.textContent=t(k); sel.appendChild(o); }
      sel.value=handFn[role][hand];
      sel.onchange=e=>{ setHandFn(role,hand,e.target.value); softAllOff();       // роли/зоны рук меняются → глушим звук (как смена инструмента)
        renderFxCtl();                                                            // рука могла уйти с 'fx' (или прийти на неё) → секция конструктора появляется/исчезает
        if(hooks.tutor) hooks.tutor('handfn',{role, hand, fn:e.target.value}); };   // ЗАЦЕПКА ОБУЧЕНИЯ: сменили функцию руки (какая рука, какая функция) — урок «Функции рук»
      row.appendChild(lab); row.appendChild(sel); handFnRows.appendChild(row);
    }
  }
  renderFxCtl();   // конструктор эффектов зависит от того же (есть ли рука на 'fx') — перерисовываем вместе; так же ловим смену языка и роли (обе зовут renderHandFn)
}
/* ================= КОНСТРУКТОР ЭФФЕКТОВ (Пласт 2, слайс 2.3) =================
   КТО НА КАКОМ ПАЛЬЦЕ у руки-эффектов. Раскладка живёт в state.fxLayout и пишется ТОЛЬКО отсюда
   (правило #5 с обратной стороны: DOM — дело ui, жест-слой раскладку лишь ЧИТАЕТ).
   Слот = палец: 0 указательный … 3 мизинец (порядок FINGER_TIPS).
   Секция видна ровно тогда, когда какая-то рука соло назначена на 'fx' — тем же гейтом (roleHasFx),
   которым рисуются столбики: без такой руки раскладку нечем крутить, и строки были бы обманом.
   Слайс 2.4 добавил ПОДСТРОКИ: у каждого параметра — своя ОСЬ (x/y/z) и ИНВЕРСИЯ. Сами поля жили в
   данных с 2.1 (жест их читает), 2.4 лишь открыл их человеку — жест-математику не трогали.
   ⚠️ Звук НЕ глушим (в отличие от смены функции руки): раскладка не трогает ни голоса, ни роли —
   меняется лишь то, какую ручку крутит палец. */
const FINGER_KEYS=['finger.index','finger.middle','finger.ring','finger.pinky'];
const AXIS_OPTS=[['x','axis.x'],['y','axis.y'],['z','axis.z']];   // [значение в данных, ключ-словаря]
const fxCtlSep=$('fxCtlSep'), fxCtlRows=$('fxCtlRows');
/* Варианты: «нет» + четыре старых скалярных (из FX_META) + модули из реестра (пока реверб).
   Реестр читаем НА КАЖДУЮ ОТРИСОВКУ, а не один раз: до initAudio он пуст (узлов ещё нет), а панель
   может быть перерисована и до старта. */
function fxOptions(){
  const o=[['','fx.none']];
  for(const m of FX_META) o.push([m.k, m.fullKey]);
  for(const id in FX_MODULES) o.push([id, FX_MODULES[id].labelKey]);
  return o;
}
/* Подписи ПАРАМЕТРОВ для подстрок. У СТАРЫХ скалярных параметр ОДИН и он же и есть сам эффект —
   подписываем нейтрально («Величина»): имя эффекта уже стоит строкой выше, повторять его — шум.
   У МОДУЛЯ берём labelKey каждого параметра. Пустой/неизвестный слот параметров не имеет — подстрок нет.
   ⚠️ Развилку «скаляр или модуль» знает и gestures (fxParamsOf), но там она отвечает на ДРУГОЙ вопрос —
   КУДА ПИСАТЬ, — а здесь на «как подписать». Общего источника нет намеренно: слои разные, и тянуть
   подписи в жест-слой значило бы тащить туда i18n. */
function fxParamKeys(fxId){
  if(FX_META.some(m=>m.k===fxId)) return ['fx.param.amt'];
  const mod=FX_MODULES[fxId];
  return mod ? mod.params.map(p=>p.labelKey) : [];
}
function renderFxCtl(){
  if(!fxCtlSep||!fxCtlRows) return;
  const on=roleHasFx('ld');
  fxCtlSep.style.display = fxCtlRows.style.display = on ? '' : 'none';
  fxCtlRows.textContent='';
  if(!on) return;
  const opts=fxOptions();
  fxLayout.forEach((sl,slot)=>{
    const row=document.createElement('div'); row.className='prow';
    const lab=document.createElement('label'); lab.textContent=t(FINGER_KEYS[slot]);
    const sel=document.createElement('select'); sel.autocomplete='off';   // не даём браузеру восстановить прежнее значение ПОВЕРХ данных при перезагрузке
    for(const [v,k] of opts){ const o=document.createElement('option'); o.value=v; o.textContent=t(k); sel.appendChild(o); }
    sel.value=sl.fxId;
    sel.onchange=e=>{ const id=e.target.value, mod=FX_MODULES[id];
      setFxSlotId(slot, id, mod?mod.params.length:1);   // сколько параметров — знает сам модуль; у старых скалярных ровно один
      renderFxCtl(); };
    row.appendChild(lab); row.appendChild(sel); fxCtlRows.appendChild(row);
    /* ПОДСТРОКИ — ПО ПАРАМЕТРУ: какой ОСЬЮ он ведётся и не перевёрнут ли.
       ⚠️ КОНФЛИКТ ОСЕЙ РАЗРЕШЁН НАМЕРЕННО: поставил два параметра на одну ось — оба поедут вместе.
       Это естественный результат жеста, а не ошибка; проверок и предупреждений не городим.
       Отступ 14px + ровно на столько же более узкая колонка подписи — так органы управления подстрок
       остаются на одной вертикали с выпадающим списком эффекта над ними (.prow label = 128px). */
    const pkeys=fxParamKeys(sl.fxId);
    pkeys.forEach((lk,pi)=>{
      const pa=sl.params[pi]; if(!pa) return;
      const sub=document.createElement('div'); sub.className='prow'; sub.style.paddingLeft='14px'; sub.style.margin='4px 0';
      const plab=document.createElement('label'); plab.textContent=t(lk); plab.style.flex='0 0 114px';
      const ax=document.createElement('select'); ax.autocomplete='off';
      for(const [v,k] of AXIS_OPTS){ const o=document.createElement('option'); o.value=v; o.textContent=t(k); ax.appendChild(o); }
      ax.value=pa.axis;
      /* Обёртка галочки — <label> (клик по слову переключает), но БЕЗ колоночной ширины: правило
         .prow label задаёт flex:0 0 128px, и без сброса «Инверсия» съела бы целую колонку. */
      const invWrap=document.createElement('label'); invWrap.style.flex='0 0 auto'; invWrap.style.display='flex'; invWrap.style.alignItems='center'; invWrap.style.gap='5px';
      const inv=document.createElement('input'); inv.type='checkbox'; inv.autocomplete='off'; inv.checked=!!pa.inv;
      invWrap.appendChild(inv); invWrap.appendChild(document.createTextNode(t('fx.invert')));
      const apply=()=>{ setFxParamAxis(slot, pi, ax.value, inv.checked); renderFxCtl(); };   // пишем В ДАННЫЕ и перерисовываем ИЗ них — меню отражает fxLayout, а не собственный DOM
      ax.onchange=apply; inv.onchange=apply;
      sub.appendChild(plab); sub.appendChild(ax); sub.appendChild(invWrap); fxCtlRows.appendChild(sub);
    });
  });
}
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
  renderHandFn();                             // ld/бас-половина могла появиться/исчезнуть — пересобираем секцию «Функции рук»
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
/* Подгоняем ритм варианта под ТЕКУЩИЙ размер петли: негодный паттерн buildArrangement всё равно
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
    if(!loadJam(sel)){                            // не встало (петля игрока другой длины) — честно сообщаем, цикл → выкл
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
  refreshMetreCtl();
  applyRec(); applyBacking(); applyFullscreen();
});

export { $, revealBar, syncTutorBarPos as tutorSyncBar };   // tutor зовёт на СТАРТЕ урока: полоса только что получила .on, а положение (.mini при открытой панели) считается по событиям панели/лупера — без этого первый кадр урока лёг бы полной полосой поверх открытого меню
