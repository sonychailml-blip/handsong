import { scaleIdx, tonic, setScaleIdx, setTonic, setSeventh, setChIdx,
         uiMode, phoneInstr, swapHands, setUiMode, setPhoneInstr, setSwapHands, theremin, setTheremin } from './state.js';
import { SCALES, NOTE_NAMES, TRADITIONS, scalesOfTrad, tradOfScale, supportsProgressions, supportsChords } from './scales.js';
import { setLeadInstr, setBassInstr, setDrumKit, LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_KITS } from './audio.js';
import { softAllOff, panic, onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopQuant, setLoopBpm, loop, recording, loadArrangement } from './recorder.js';
import { HARMONIES, RHYTHMS, BASS_MODES } from './arrange.js';
import { INSTR_COL } from './config.js';
import { hooks } from './hooks.js';

/* ================= UI ================= */
const $=id=>document.getElementById(id);
const recBtn=$('recBtn'), loopBtn=$('loopBtn'),
      instrBtn=$('instrBtn'), modeBtn=$('modeBtn'), swapBtn=$('swapBtn'), thereminBtn=$('thereminBtn'),
      loopMinus=$('loopMinus'), loopPlus=$('loopPlus'), loopBarsV=$('loopBarsV'),
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
function updScaleBtn(){ scaleBtn.textContent=`${SCALES[scaleIdx].name} · ${NOTE_NAMES[tonic]}`; }

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
function fillScales(tradId){
  selScale.textContent='';
  const order=[], buckets=new Map();            // order — grp в порядке первого появления
  scalesOfTrad(tradId).forEach(({i,s})=>{
    const k=s.grp||'';
    if(!buckets.has(k)){ buckets.set(k,[]); order.push(k); }
    buckets.get(k).push({i,s});                 // внутри корзины — порядок массива
  });
  for(const k of order){
    const parent = k ? selScale.appendChild(Object.assign(document.createElement('optgroup'),{label:k}))
                     : selScale;                // '' → без optgroup, прямо в список
    for(const {i,s} of buckets.get(k)){
      const o=document.createElement('option'); o.value=i; o.textContent=s.name; parent.appendChild(o);
    }
  }
}
function buildUI(){
  TRADITIONS.forEach(t=>{ const o=document.createElement('option'); o.value=t.id; o.textContent=t.name; selTradition.appendChild(o); });
  selTradition.value=tradOfScale(scaleIdx);      // традицию берём из активного лада, а не из умолчания
  fillScales(selTradition.value);
  selScale.value=scaleIdx;
  NOTE_NAMES.forEach((n,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=n; selTonic.appendChild(o);
  });
  selTonic.value=tonic;
  LEAD_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=s.label; selLead.appendChild(o);
  });
  CHORD_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=s.label; selChord.appendChild(o);
  });
  BASS_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=s.label; selBass.appendChild(o);
  });
  DRUM_KITS.forEach((k,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=k.label; selDrumKit.appendChild(o); });
  HARMONIES.forEach((p,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=p.name; selProg.appendChild(o); });
  RHYTHMS.forEach((r,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=r.name; selRhythm.appendChild(o); });
  BASS_MODES.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=m.name; selBassMode.appendChild(o); });
  selBassMode.value='roots';
  updScaleBtn();                              // 1/3: старт
  loopBarsV.textContent=loop.bars;
  refreshProgAvail();
}
function refreshProgAvail(){                  // прогрессии — только там, где строятся аккорды и 7 ступеней; дрон — везде
  const ok=supportsProgressions()&&supportsChords();   // макам: iv.length===7, но лестницы аккордов нет
  [...selProg.options].forEach((o,i)=>{ o.disabled = !HARMONIES[i].drone && !ok; });
  if(selProg.selectedOptions[0] && selProg.selectedOptions[0].disabled) selProg.value='0';   // упасть на дрон
}
buildUI();

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
    ? (loop.first ? 'Идёт запись круга — тап остановит'
                  : `Наложение слоя ${loop.layer+1} — тап остановит`)
    : (loop.on ? 'Петля играет — тап начнёт новый слой'
               : 'Запись: тап — отсчёт такта, затем круг');
  loopBarsV.textContent = loop.bars;
}
hooks.rec       = () => updRecBtn();
hooks.loop      = on => { loopBtn.classList.toggle('on', on); loopBtn.textContent = on ? '❚❚ луп' : '⟳ луп'; updRecBtn(); };

/* Шаг 3 MENU-PLAN: панели РАЗНОЙ природы. Звукоряд — оверлей (выбрал и закрыл),
   лупер — рабочая панель снизу (играть можно с открытой). Одна за раз: обе — карточки
   почти во весь экран, вместе они бы перекрылись, поэтому открытие одной прячет другую. */
function showLoop(on){ panelLoopEl.classList.toggle('on',on); loopPanelBtn.classList.toggle('on',on);
  if(on)panelScaleEl.classList.remove('on'); }
function showScale(on){ panelScaleEl.classList.toggle('on',on); if(on)showLoop(false); }
$('panelClose').onclick=()=>showScale(false);
scaleBtn.onclick=()=>showScale(!panelScaleEl.classList.contains('on'));
loopPanelBtn.onclick=()=>showLoop(!panelLoopEl.classList.contains('on'));
$('helpBtn').onclick=()=>$('helpOv').classList.add('on');
$('helpClose').onclick=()=>$('helpOv').classList.remove('on');
$('panicBtn').onclick=panic;
 
/* Смена традиции = смена лада: иначе продолжал бы звучать лад чужой традиции, а меню
   показывало бы другой. Переключаемся на ПЕРВЫЙ лад традиции тем же путём, что и selScale. */
selTradition.onchange=e=>{
  fillScales(e.target.value);
  const first=scalesOfTrad(e.target.value)[0];
  if(!first)return;
  selScale.value=first.i;
  setScaleIdx(first.i); softAllOff(); updScaleBtn(); refreshProgAvail();
};
selScale.onchange=e=>{
  setScaleIdx(+e.target.value); softAllOff();
  updScaleBtn(); refreshProgAvail();          // 2/3: смена лада
};
selTonic.onchange=e=>{ setTonic(+e.target.value); softAllOff(); updScaleBtn(); };   // 3/3: смена тоники
$('qTriad').onclick=()=>{ setSeventh(false); softAllOff(); $('qTriad').classList.add('act'); $('qSev').classList.remove('act'); };
$('qSev').onclick =()=>{ setSeventh(true);  softAllOff(); $('qSev').classList.add('act');  $('qTriad').classList.remove('act'); };
selLead.onchange=e=>setLeadInstr(+e.target.value);
selChord.onchange=e=>setChIdx(+e.target.value);
selBass.onchange=e=>setBassInstr(+e.target.value);
qOn.onclick =()=>{ setLoopQuant(true);  qOn.classList.add('act');  qOff.classList.remove('act'); };
qOff.onclick=()=>{ setLoopQuant(false); qOff.classList.add('act'); qOn.classList.remove('act'); };
bpmEl.oninput=e=>{ setLoopBpm(+e.target.value); bpmV.textContent=loop.bpm; };
selDrumKit.onchange=e=>setDrumKit(+e.target.value);
 
recBtn.onclick=onRec;
loopBtn.onclick=onLoop;
$('undoBtn').onclick=onUndo;
$('clrBtn').onclick=clearRec;
loopMinus.onclick=()=>{ setLoopBars(loop.bars-1); loopBarsV.textContent=loop.bars; };
loopPlus.onclick =()=>{ setLoopBars(loop.bars+1); loopBarsV.textContent=loop.bars; };
addArrBtn.onclick=()=>{ loadArrangement({prog:+selProg.value, rhythm:+selRhythm.value, bass:selBassMode.value}); loopBarsV.textContent=loop.bars; };

/* Режим управления: ПК ↔ Смартфон, выбор инструмента (phone), обмен рук.
   При любом переключении глушим звук — зоны/роли рук меняются. */
/* Шаг 4 MENU-PLAN: пара кнопок → ОДНА иконка-тумблер, сама себе индикатор.
   Логика прежняя (setUiMode + класс .phone на body) — поменялось только отображение
   и то, чем это дёргают. Видимость ⇄ висит на том же .phone через CSS. */
function applyMode(){
  document.body.classList.toggle('phone', uiMode==='phone');
  modeBtn.textContent = uiMode==='phone' ? '📱' : '💻';
  modeBtn.title = uiMode==='phone' ? 'Режим: Смартфон — тап переключит на ПК'
                                   : 'Режим: ПК — тап переключит на Смартфон';
  applyTheremin();                             // 〰 виден только в phone-соло — обновляем при смене режима
}
function applySwap(){                          // ⇄ — только в «Смартфон» (в ПК роль по месту, не по руке)
  swapBtn.classList.toggle('act', swapHands);
  swapBtn.title = swapHands ? 'Правая рука: эффекты — тап вернёт ей ноты'
                            : 'Правая рука: ноты — тап отдаст ей эффекты';
}
const INSTR_SEQ=['ld','ch','bs','dr'];
const INSTR_LBL={ld:'🎸 Соло', ch:'🎹 Аккорды', bs:'🎚 Бас', dr:'🥁 Ударные'};
function applyInstr(){ instrBtn.textContent = INSTR_LBL[phoneInstr];
  instrBtn.style.setProperty('--role', INSTR_COL[phoneInstr]); applyTheremin(); }   // цвет роли — в CSS-переменную; видимость 〰 зависит от роли
/* 〰 Терменвокс — компаньон кнопки роли: виден ТОЛЬКО в phone-соло (в ПК и на других ролях
   скрыт, видимость через JS, без style.css). .act — режим включён (как у swapBtn). */
function applyTheremin(){
  thereminBtn.classList.toggle('act', theremin);
  thereminBtn.title = theremin ? 'Терменвокс ВКЛ: непрерывная высота — тап выключит'
                               : 'Терменвокс: непрерывная высота (глиссандо)';
  thereminBtn.style.display = (uiMode==='phone'&&phoneInstr==='ld') ? '' : 'none';
}
modeBtn.onclick  =()=>{ setUiMode(uiMode==='phone'?'pc':'phone'); softAllOff(); applyMode(); };
instrBtn.onclick =()=>{ setPhoneInstr(INSTR_SEQ[(INSTR_SEQ.indexOf(phoneInstr)+1)%INSTR_SEQ.length]); softAllOff(); applyInstr(); };
swapBtn.onclick  =()=>{ setSwapHands(!swapHands); softAllOff(); applySwap(); };
thereminBtn.onclick=()=>{ setTheremin(!theremin); softAllOff(); applyTheremin(); };
applyMode(); applyInstr(); applySwap();
 
export { $ };
