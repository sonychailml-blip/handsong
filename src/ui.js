import { scaleIdx, tonic, setScaleIdx, setTonic, setSeventh, setChIdx } from './state.js';
import { SCALES, NOTE_NAMES } from './scales.js';
import { setLeadInstr, AC, backBus, LEAD_INSTR, CHORD_INSTR } from './audio.js';
import { back, toggleBack, refreshStyle } from './backing.js';
import { softAllOff, playRec, panic, toggleRec, stopRec, clearRec } from './recorder.js';
import { hooks } from './hooks.js';
 
/* ================= UI ================= */
const $=id=>document.getElementById(id);
const recBtn=$('rec'), backBtn=$('backBtn'),
      selScale=$('selScale'), selTonic=$('selTonic'),
      selLead=$('selLead'), selChord=$('selChord'), selStyle=$('selStyle'),
      bpmEl=$('bpm'), bpmV=$('bpmV'), bvolEl=$('bvol'), bvolV=$('bvolV'),
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
  [['auto','Авто (Smart Match)'],['lofi','Lo-Fi бит'],['synthwave','Synthwave'],
   ['ethnic','Дарбука + дрон'],['ambient','Ambient-дрон']].forEach(([v,l])=>{
    const o=document.createElement('option'); o.value=v; o.textContent=l; selStyle.appendChild(o);
  });
  scaleBtn.textContent=SCALES[scaleIdx].name;
}
buildUI();

hooks.leadInstr = v  => selLead.value = v;
hooks.bpm       = v  => { bpmEl.value = v; bpmV.textContent = v; };
hooks.back      = p  => backBtn.textContent = p ? '❚❚ фон' : '▶ фон';
hooks.rec       = on => recBtn.classList.toggle('on', on);

$('menuBtn').onclick=()=>panelEl.classList.toggle('on');
$('panelClose').onclick=()=>panelEl.classList.remove('on');
scaleBtn.onclick=()=>panelEl.classList.toggle('on');
$('helpBtn').onclick=()=>$('helpOv').classList.add('on');
$('helpClose').onclick=()=>$('helpOv').classList.remove('on');
$('panicBtn').onclick=panic;
 
selScale.onchange=e=>{
  setScaleIdx(+e.target.value); softAllOff(); refreshStyle(false);
  scaleBtn.textContent=SCALES[scaleIdx].name;
};
selTonic.onchange=e=>{ setTonic(+e.target.value); refreshStyle(false); };
$('qTriad').onclick=()=>{ setSeventh(false); $('qTriad').classList.add('act'); $('qSev').classList.remove('act'); };
$('qSev').onclick =()=>{ setSeventh(true);  $('qSev').classList.add('act');  $('qTriad').classList.remove('act'); };
selLead.onchange=e=>setLeadInstr(+e.target.value);
selChord.onchange=e=>setChIdx(+e.target.value);
selStyle.onchange=e=>{ back.styleSel=e.target.value; refreshStyle(back.styleSel!=='auto'); };
bpmEl.oninput=e=>{ back.bpm=+e.target.value; bpmV.textContent=back.bpm; };
bvolEl.oninput=e=>{ bvolV.textContent=e.target.value+'%';
  if(AC)backBus.gain.setTargetAtTime(e.target.value/100,AC.currentTime,0.05); };
backBtn.onclick=toggleBack;
 
recBtn.onclick=toggleRec;
$('playBtn').onclick=()=>{ stopRec(); playRec(); };
$('clrBtn').onclick=clearRec;
 
export { $ };
