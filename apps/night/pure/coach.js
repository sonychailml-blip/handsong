/* NIGHT-11 part 4 — PLAY FIRST, TEACH INSIDE (REVIEW-1 wow-gap §1). The law of the one coaching line, pure (the data row runs it on made-up
   sessions; the runner row on the real app). After Begin: «Raise a hand» while no hand is up; «Touch your thumb to your first finger» while the
   playing hand is up and no note has sounded; the first note ends them. Later, one at a time and only while the thing named can be done: the
   other fingers and height after FINGERS_MS of playing, near / far after DEPTH_MS, the effects hint when a second hand first appears, the hand's
   calibration offer and the iPhone home-screen hint after LATER_MS (never before the first note, never while detection is paused). Each shown
   once on this device (COACH_KEY: a list of ids; a stale value reads as nothing seen). The calibration offer is remembered per camera by calib.js
   (calDue), not here.
   st = coachNew(seen); each step: coachStep(st, in) → { st, show, mark } with in = { now (ms), dt (ms since the last step), ready (the room is
   visible and nothing else is on screen), hands (in view), play (a playing hand in view), second (an effects hand in view), note (a note began),
   calDue, homeDue, paused }; mark = ids to remember now. */
export const COACH=Object.freeze({ fingersMs:30e3, depthMs:60e3, laterMs:60e3, gapMs:3500, quickGapMs:500,
  showMs:Object.freeze({ fingers:8000, depth:8000, fx:7000, calib:15000, home:9000 }) });
export const COACH_IDS=Object.freeze(['raise','pinch','fingers','depth','fx','calib','home']);
export const COACH_KEY='handsong.nightHints';
const STORED=COACH_IDS.filter(x=>x!=='calib');
/* the stored list → the ids it names (anything else stored reads as nothing seen) */
export function coachSeen(raw){ try{ const a=JSON.parse(raw); return Array.isArray(a) ? [...new Set(a.filter(x=>STORED.includes(x)))] : []; }catch(e){ return []; } }
export const coachNew=(seen=[])=>({ seen:[...seen], played:0, first:false, cal:false, cur:null, t0:0, end:-Infinity, last:null });
function due(s, id, x){ const has=s.seen.includes(id);
  switch(id){
    case 'raise': return !s.first && !has && x.hands===0;
    case 'pinch': return !s.first && !has && !!x.play;
    case 'fx': return !has && !!x.second;
    case 'fingers': return s.first && !has && !!x.play && s.played>=COACH.fingersMs;
    case 'depth': return s.first && !has && !!x.play && s.played>=COACH.depthMs;
    case 'calib': return s.first && !s.cal && !!x.calDue && !x.paused && s.played>=COACH.laterMs;
    case 'home': return s.first && !has && !!x.homeDue && s.played>=COACH.laterMs;
  } return false; }
export function coachStep(st, x){
  const s={ ...st, seen:st.seen.slice() }, mark=[], now=x.now, see=id=>{ if(STORED.includes(id) && !s.seen.includes(id)){ s.seen.push(id); mark.push(id); } };
  if(s.first && x.play) s.played+=Math.max(0, x.dt||0);   // playing time counts from the step after the first note
  if(x.note && !s.first){ s.first=true; see('raise'); see('pinch'); }
  if(s.cur){ const c=s.cur, age=now-s.t0;
    const over= !x.ready ? true : c==='raise' ? x.hands>0 || s.first : c==='pinch' ? s.first || !x.play : c==='calib' ? age>=COACH.showMs.calib || !x.calDue || x.paused : age>=COACH.showMs[c];
    if(over){ if(c==='raise' && x.hands>0) see('raise'); s.cur=null; s.end=now; s.last=c; } }
  if(!s.cur && x.ready && now-s.end>=(s.last==='raise' ? COACH.quickGapMs : COACH.gapMs)){
    const id=COACH_IDS.find(k=>due(s, k, x));
    if(id){ s.cur=id; s.t0=now; if(id!=='raise' && id!=='pinch') see(id); if(id==='calib') s.cal=true; } }
  return { st:s, show:s.cur, mark };
}
/* the order a first session must keep, judged on its log [{ t, kind:'show'|'note'|'card'|'cal', id }]: no card and no calibration before the first
   note, each later hint shown once (the first two come back until done), the later hints only after the first note → a list of problems */
export function coachOrderOk(log){
  const bad=[], first=log.find(e=>e.kind==='note'), tf= first ? first.t : Infinity, n=new Map();
  for(const e of log){
    if((e.kind==='card' || e.kind==='cal' || (e.kind==='show' && e.id==='calib')) && e.t<tf) bad.push(`${e.kind==='show' ? 'the calibration offer' : e.kind==='card' ? 'a card' : 'the calibration'} at ${e.t} ms, before the first note`);
    if(e.kind==='show'){ n.set(e.id, (n.get(e.id)||0)+1); if(['fingers','depth','home'].includes(e.id) && e.t<tf) bad.push(`«${e.id}» at ${e.t} ms, before the first note`); } }
  for(const [id,k] of n) if(k>1 && id!=='raise' && id!=='pinch') bad.push(`«${id}» shown ${k} times`);   // the first two come back until done (a hand that left)
  return bad;
}
