/* NIGHT-11 part 4 — PLAY FIRST, TEACH INSIDE: the DOM side of the one coaching line (the law: pure/coach.js). Driven once per screen frame by the
   shell's tick while Night shows: the hands from the bus (handsView), the notes from the bus (a solo note-on), what else is on screen (the shell says
   whether the room is ready for a line), the calibration's own «due» (per camera, calib.js). The line sits where the idle line sits; while it
   shows the idle line steps aside (body.night-coach-on). The calibration offer is a small line with «Set up» and «Not now». Each hint shown once on
   this device (COACH_KEY). The cards stay in Settings → How to play. */
import { BUS } from '../../core/pure/bus.js';
import { t, onLangChange } from '../../core/i18n.js';
import { coachNew, coachStep, coachSeen, COACH_KEY } from './pure/coach.js';

const $=id=>document.getElementById(id), READ=BUS.reader();
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const save=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
const TEXT={ raise:'night.coach.raise', pinch:'night.coach.pinch', fingers:'night.coach.fingers', depth:'night.coach.depth', fx:'night.fxHint', calib:'night.coach.calib', home:'night.coach.home' };
let st=null, seq=-1, last=0, shown=null, calYes=null, calNo=null, speed=1, vnow=0, pin=null;   // pin: probe only — a line held on screen (coachShowDbg)
const LOG=[];   // probe: { t, kind:'show'|'note', id }
/* a session's coaching begins (a person's Begin or the app's start): the stored list read once, the notes counted from now */
export function coachBegin(){ if(st) return; st=coachNew(coachSeen(load(COACH_KEY))); seq=READ.seq('notes'); last=0; }
/* once per frame: x = { ready, paused, calDue, homeDue } from the shell; onCal(yes) when the calibration line is answered */
export function coachTick(now, x, onCal){
  if(!st || pin) return;
  const dt= last ? Math.min(250, now-last)*speed : 0; last=now; vnow+=dt;
  const hv=READ.get('handsView'), H=Array.isArray(hv) ? hv : [];
  const N=READ.since('notes', seq); seq=N.seq; const note=N.items.some(it=>it.kind==='on' && it.role==='ld');
  if(note) LOG.push({ t:Math.round(performance.now()), kind:'note' });
  const r=coachStep(st, { now:vnow, dt, ready:!!x.ready, hands:H.length, play:H.some(h=>h.play), second:H.some(h=>!h.play), note, calDue:!!x.calDue, homeDue:!!x.homeDue, paused:!!x.paused });
  st=r.st; if(r.mark.length) save(COACH_KEY, JSON.stringify(st.seen));
  if(r.show!==shown){ shown=r.show; if(shown) LOG.push({ t:Math.round(performance.now()), kind:'show', id:shown }); calYes=calNo=null; if(shown==='calib'){ calYes=()=>onCal(true); calNo=()=>onCal(false); } render(); }
}
function render(){
  const el=$('nightCoach'); if(!el) return;
  el.hidden=!shown; document.body.classList.toggle('night-coach-on', !!shown); el.classList.toggle('night-coach-ask', shown==='calib');
  if(!shown) return;
  $('nightCoachText').textContent=t(TEXT[shown]);
  const b=$('nightCoachBtns'); b.hidden= shown!=='calib';
  if(shown==='calib'){ $('nightCoachYes').textContent=t('night.coach.calibYes'); $('nightCoachNo').textContent=t('night.coach.calibNo'); }
}
export function coachWire(){
  $('nightCoachYes').onclick=()=>{ const f=calYes; shownEnd(); if(f) f(); };
  $('nightCoachNo').onclick=()=>{ const f=calNo; shownEnd(); if(f) f(); };
  onLangChange(render); render();
}
function shownEnd(){ if(st && st.cur){ st={ ...st, cur:null, end:vnow, last:st.cur }; } shown=null; render(); }
export const coachShown=()=>shown;
/* probe only: the log of this page, the state, a faster clock for the later hints (k × real time), a fresh start (nothing seen) */
export const coachDbg=()=>({ shown, log:LOG.slice(), st:st ? { ...st, seen:st.seen.slice() } : null, speed });
export const coachSpeedDbg=k=>{ speed= k>0 ? +k : 1; return speed; };
/* probe only (NIGHT-13): hold one line on screen as render() shows it (its words, the calibration's buttons) — the layout row; null lets go */
export function coachShowDbg(id){ pin= id && TEXT[id] ? id : null; shown=pin; render(); return shown; }
export function coachResetDbg(o={}){ if(o.clear) save(COACH_KEY, '[]'); st=null; shown=null; LOG.length=0; vnow=0; render(); coachBegin(); }
