import { scaleIdx, tonic, setScaleIdx, setTonic, setSeventh, setChIdx,
         uiMode, phoneInstr, setUiMode, setPhoneInstr, setSwapHands } from './state.js';
import { SCALES, NOTE_NAMES, supportsProgressions, supportsChords } from './scales.js';
import { setLeadInstr, setBassInstr, setDrumKit, LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_KITS } from './audio.js';
import { softAllOff, panic, onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopQuant, setLoopBpm, loop, recording, loadArrangement } from './recorder.js';
import { HARMONIES, RHYTHMS, BASS_MODES } from './arrange.js';
import { hooks } from './hooks.js';

/* ================= UI ================= */
const $=id=>document.getElementById(id);
const recBtn=$('recBtn'), loopBtn=$('loopBtn'),
      instrBtn=$('instrBtn'), modePC=$('modePC'), modePhone=$('modePhone'),
      swapNotes=$('swapNotes'), swapFx=$('swapFx'),
      loopMinus=$('loopMinus'), loopPlus=$('loopPlus'), loopBarsV=$('loopBarsV'),
      selScale=$('selScale'), selTonic=$('selTonic'),
      selLead=$('selLead'), selChord=$('selChord'), selBass=$('selBass'),
      qOn=$('qOn'), qOff=$('qOff'),
      bpmEl=$('bpm'), bpmV=$('bpmV'),
      selProg=$('selProg'), selRhythm=$('selRhythm'), selBassMode=$('selBassMode'), selDrumKit=$('selDrumKit'), addArrBtn=$('addArrBtn'),
      scaleBtn=$('scaleBtn'), panelEl=$('panel');
 
function buildUI(){
  // лады с группировкой
  let g=null, og=null;
  SCALES.forEach((s,i)=>{
    if(s.grp!==g){ g=s.grp; og=document.createElement('optgroup'); og.label=g; selScale.appendChild(og); }
    const o=document.createElement('option'); o.value=i; o.textContent=s.name; og.appendChild(o);
  });
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
  scaleBtn.textContent=SCALES[scaleIdx].name;
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
function updRecBtn(){                         // ярлык кнопки записи зависит от режима
  recBtn.classList.toggle('on', recording);
  recBtn.textContent = recording ? (loop.first ? '● …круг' : '● …слой')
                                  : (loop.on ? '＋ слой' : '● запись');
  loopBarsV.textContent = loop.bars;
}
hooks.rec       = () => updRecBtn();
hooks.loop      = on => { loopBtn.classList.toggle('on', on); loopBtn.textContent = on ? '❚❚ луп' : '⟳ луп'; updRecBtn(); };

$('menuBtn').onclick=()=>panelEl.classList.toggle('on');
$('panelClose').onclick=()=>panelEl.classList.remove('on');
scaleBtn.onclick=()=>panelEl.classList.toggle('on');
$('helpBtn').onclick=()=>$('helpOv').classList.add('on');
$('helpClose').onclick=()=>$('helpOv').classList.remove('on');
$('panicBtn').onclick=panic;
 
selScale.onchange=e=>{
  setScaleIdx(+e.target.value); softAllOff();
  scaleBtn.textContent=SCALES[scaleIdx].name; refreshProgAvail();
};
selTonic.onchange=e=>{ setTonic(+e.target.value); softAllOff(); };
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
function applyMode(){
  document.body.classList.toggle('phone', uiMode==='phone');
  modePC.classList.toggle('act', uiMode==='pc');
  modePhone.classList.toggle('act', uiMode==='phone');
}
const INSTR_SEQ=['ld','ch','bs','dr'];
const INSTR_LBL={ld:'🎸 Соло', ch:'🎹 Аккорды', bs:'🎚 Бас', dr:'🥁 Ударные'};
function applyInstr(){ instrBtn.textContent = INSTR_LBL[phoneInstr]; }
modePC.onclick   =()=>{ setUiMode('pc');    softAllOff(); applyMode(); };
modePhone.onclick=()=>{ setUiMode('phone'); softAllOff(); applyMode(); };
instrBtn.onclick =()=>{ setPhoneInstr(INSTR_SEQ[(INSTR_SEQ.indexOf(phoneInstr)+1)%INSTR_SEQ.length]); softAllOff(); applyInstr(); };
swapNotes.onclick=()=>{ setSwapHands(false); swapNotes.classList.add('act'); swapFx.classList.remove('act'); softAllOff(); };
swapFx.onclick   =()=>{ setSwapHands(true);  swapFx.classList.add('act');  swapNotes.classList.remove('act'); softAllOff(); };
applyMode(); applyInstr();
 
export { $ };
