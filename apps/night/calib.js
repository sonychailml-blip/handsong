/* NIGHT-2 stage 2: the hand's calibration screens over CORE-1's engine (core/handcal.js; design docs/night/design/NIGHT-2-calibration/DESIGN.md).
   The offer once per camera (the first start, a new camera), the one step on the camera picture with every point of the hands, the result
   (the hands play; «Play» saves, «Again» repeats), a failure with one plain message; the Hand section of the settings card. The hand held up
   is the playing hand: its side, voted over the whole hold (MediaPipe's left/right label can flip between frames), sets the roles and is saved
   beside the calibration; the settings' «Play with» saves it too (the last choice wins); reset clears both. Never touches the volume. Players
   who never calibrate keep today's roles and mapping. A far but steady hand is accepted (CORE-6 farHold) with a note when it shakes. */
import { handCalOpen, handCalRead, handCalStart, handCalCancel, handCalAccept, handCalReset, handCalSetDepthSens, handCalSetSens, handCalState, onHandCal } from '../../core/handcal.js';
import { CAL } from '../../core/pure/handcal.js';
import { BUS } from '../../core/pure/bus.js';
import { t, onLangChange } from '../../core/i18n.js';
import { cv } from '../../core/palette.js';
import { sx, sy, viewRect, mirrored } from '../../core/state.js';
import { devItems } from './edition.js';   // NIGHT-7b: the side's vote count is a development line

const $=id=>document.getElementById(id);
export const CAL_KEY=Object.freeze({ side:'handsong.nightCalSide', offered:'handsong.nightCalOffered' });
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const save=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
const drop=k=>{ try{ localStorage.removeItem(k); }catch(e){} };
/* opened once: with no camera record and neutral sliders every gesture is exactly today's (CORE-1 row CAL4); farHold: refused only where tracking can't measure */
export const CAL_OPEN=Object.freeze({ scope:'night', farHold:true });
handCalOpen(CAL_OPEN);
/* a hand smaller than CORE-1's old limit is "far" for the wording; a noise the hold band can't cover gets the note on the result */
const isFar=size=> size!=null && size<CAL.minNear;
const shaky=res=> !!res && (res.near<CAL.sizeMin/CAL.farRatio || CAL.bandK*res.noise>CAL.bandMax);

/* «Hand travel»: the middle is s = 1; right (a longer travel) falls to 0.7, left rises to 2, each half even on a log scale. «Effects sensitivity»: 2^p */
export const travelS=p=> p>=0 ? Math.max(CAL.depthMin, Math.pow(CAL.depthMin, p)) : Math.min(CAL.sensMax, Math.pow(CAL.sensMax, -p));
export const travelPos=s=> s<=1 ? Math.log(s)/Math.log(CAL.depthMin) : -Math.log(s)/Math.log(CAL.sensMax);
export const fxV=p=> p>=0 ? Math.min(CAL.sensMax, Math.pow(CAL.sensMax, p)) : Math.max(CAL.sensMin, Math.pow(CAL.sensMin, -p));
export const fxPos=v=> v>=1 ? Math.log(v)/Math.log(CAL.sensMax) : Math.log(v)/Math.log(CAL.sensMin)*-1;

let D=null, OPT={}, mode=null, reason=null, last=null, onEnd=null, startFn=handCalStart, votes={ L:0, R:0, m:0 }, side=null, swapped=null;
/* the side by the labels of the locked hand over the whole hold; a tie or nothing seen keeps the roles */
const decide=()=> !votes.m || votes.L===votes.R ? null : votes.L>votes.R ? 'left' : 'right';
function vote(s){ const r=BUS.get('hands'), L=r&&r.landmarks; if(!s.hand || !L) return;
  const i=L.findIndex(lm=>lm[0].x===s.hand.x && lm[0].y===s.hand.y); if(i<0) return;
  const h=(r.handednesses||r.handedness||[])[i], c=h&&h[0]&&h[0].categoryName; votes.m++; if(c==='Left') votes.L++; else if(c==='Right') votes.R++; }
function undoSide(){ if(swapped){ D.setHand(swapped); swapped=null; } }

function heard(s){
  if(mode!=='step') return;
  if(s.phase==='waitHand' || s.phase==='holdNear'){ if(s.phase==='holdNear') vote(s); stepShow(s); return; }
  if(s.phase==='review'){ side=decide(); if(side && D.hand()!==side){ swapped=D.hand(); D.setHand(side); } show('done'); return; }
  if(s.phase==='failed') show('fail', s.reason==='not-still' && isFar(s.size) ? 'shaky' : s.reason);
}
onHandCal(heard);
function stepShow(s){ last=s; const say= s.phase==='holdNear' ? (s.advice ? 'night.cal.'+(s.advice==='still' && isFar(s.size) ? 'stillFar' : s.advice) : 'night.cal.hold') : 'night.cal.wait';
  $('nightCalSay').textContent=t(say); $('nightCalBar').firstElementChild.style.width=Math.round((s.phase==='holdNear' && !s.advice ? s.progress : 0)*100)+'%';
  $('nightCalFrame').classList.toggle('warn', !!s.advice); }
function card(title, text, note, no, yes){ $('nightCalTitle').textContent=t(title); $('nightCalText').textContent=text; $('nightCalNote').textContent=note; $('nightCalNote').hidden=!note;
  $('nightCalNo').textContent=t(no); $('nightCalYes').textContent=t(yes); }
function sideNote(){ const a=side ? t(side==='left' ? 'night.cal.doneL' : 'night.cal.doneR') : '', f=shaky(handCalState().result) ? t('night.cal.farNote') : '';
  const b= devItems() && votes.m ? t(votes.L>votes.R ? 'night.cal.votesL' : 'night.cal.votesR', { n:Math.max(votes.L, votes.R), m:votes.m }) : '';   // development: how sure the side was
  return [a,f,b].filter(Boolean).join('\n'); }
function show(m, why=null){
  mode=m; reason=why; $('nightCal').hidden=false; document.body.classList.add('night-cal');
  const step=m==='step'; for(const id of ['nightCalStrip','nightCalFrame','nightCalCancel']) $(id).hidden=!step; $('nightCalCard').hidden=step;
  if(m==='offer') card('night.cal.offerT', t('night.cal.offerB'), t('night.cal.offerN'), 'night.cal.skip', 'night.cal.set');
  else if(m==='done') card('night.cal.doneT', t('night.cal.doneB'), sideNote(), 'night.cal.repeat', 'night.cal.play');
  else if(m==='fail') card('night.cal.failT', t(why==='shaky' ? 'night.cal.shakyFail' : 'night.cal.r.'+why), '', 'night.cal.later', 'night.cal.retry');
  else stepShow(last || { phase:'waitHand', advice:null, progress:0 });
  if(OPT.changed) OPT.changed();
}
function finish(){ mode=null; reason=null; last=null; $('nightCal').hidden=true; document.body.classList.remove('night-cal'); const f=onEnd; onEnd=null; if(f) f(); if(OPT.changed) OPT.changed(); }
/* a synthetic hand's last frame may still be on the bus: a marked hand refuses the start, so it tries again a few frames later */
function begin(tries=5){
  votes={ L:0, R:0, m:0 }; side=null; swapped=null; last=null;
  show('step'); const why=startFn();
  if(why==='synthetic' && tries>0){ setTimeout(()=>{ if(mode==='step') begin(tries-1); }, 120); return; }
  if(why) show('fail', why);
}
function offeredList(){ try{ const a=JSON.parse(load(CAL_KEY.offered)||'[]'); return Array.isArray(a) ? a.filter(x=>typeof x==='string') : []; }catch(e){ return []; } }
function markOffered(){ const c=handCalRead().camera; if(!c) return; const a=offeredList().filter(x=>x!==c); a.push(c); save(CAL_KEY.offered, JSON.stringify(a.slice(-16))); }

/* doors: D the shell's doors (hand / setHand); opt.leave() closes the settings card, opt.defHand() the profile's playing hand, opt.changed() redraws the shell */
export function calWire(doors, opt={}){ D=doors; OPT=opt;
  $('nightCalYes').onclick=()=>{ if(mode==='offer'){ markOffered(); begin(); } else if(mode==='done'){ handCalAccept(); if(side) save(CAL_KEY.side, side); swapped=null; finish(); } else if(mode==='fail') begin(); };
  $('nightCalNo').onclick=()=>{ if(mode==='offer'){ markOffered(); finish(); } else if(mode==='done'){ handCalCancel(); undoSide(); begin(); } else if(mode==='fail') finish(); };
  $('nightCalCancel').onclick=()=>{ handCalCancel(); undoSide(); finish(); };
  const go=()=>{ if(OPT.leave) OPT.leave(); calStep(); };
  $('nightCalGo').onclick=go; $('nightTravelNeed').onclick=go;
  $('nightTravel').oninput=e=>{ handCalSetDepthSens(travelS(+e.target.value)); };
  $('nightFxSens').oninput=e=>{ handCalSetSens(fxV(+e.target.value)); };
  $('nightCalReset').onclick=()=>{ $('nightCalResetQ').hidden=false; $('nightCalReset').hidden=true; };
  $('nightCalResetNo').onclick=()=>calSettingsRender();
  $('nightCalResetYes').onclick=()=>{ calResetAll(); calSettingsRender(); if(OPT.changed) OPT.changed(); };
  onLangChange(()=>{ if(mode) show(mode, reason); calSettingsRender(); });
}
/* the offer, when this camera has neither a calibration nor an offer made: false = nothing shown (then() is not called) */
export function calOfferIfNew(then){ const r=handCalRead(); if(mode || r.status==='closed' || r.calibrated || !r.camera || offeredList().includes(r.camera)) return false;
  onEnd=then||null; show('offer'); return true; }
export function calStep(then){ if(mode) return; onEnd=then||null; begin(); }
export const calActive=()=>mode!==null;
/* the face: a saved side sets the roles again (nothing saved: the profile's roles stay) */
export function calSideApply(){ const s=load(CAL_KEY.side); if((s==='left' || s==='right') && D && D.hand()!==s) D.setHand(s); }
/* the settings' «Play with»: the roles now and the saved side (the last choice wins, a calibration's or this one) */
export function calSideSet(v){ if(v!=='left' && v!=='right') return; save(CAL_KEY.side, v); if(D && D.hand()!==v) D.setHand(v); }
export function calResetAll(){ handCalReset({ all:true }); drop(CAL_KEY.side); const h=OPT.defHand ? OPT.defHand() : 'right'; if(D && D.hand()!==h) D.setHand(h); }
/* leaving the face mid-run: the run ends, the roles come back, no callback */
export function calAbort(){ if(!mode) return; handCalCancel(); undoSide(); onEnd=null; mode=null; $('nightCal').hidden=true; document.body.classList.remove('night-cal'); }
export function calSettingsRender(){
  const r=handCalRead(), ok=!!r.calibrated, st= r.status==='blocked' ? 'night.cal.blocked' : r.status==='newer' ? 'night.cal.newer' : null;
  $('nightCalState').textContent=t(ok ? 'night.cal.ok' : 'night.cal.none'); $('nightCalGo').textContent=t(ok ? 'night.cal.again' : 'night.cal.set');
  $('nightCalStore').hidden=!st; if(st) $('nightCalStore').textContent=t(st);
  const tr=$('nightTravel'); tr.disabled=!ok; $('nightTravelRow').classList.toggle('off', !ok); $('nightTravelNeed').hidden=ok;
  if(r.global){ tr.value=String(travelPos(r.global.depth)); $('nightFxSens').value=String(fxPos(r.global.fx)); }
  $('nightCalResetQ').hidden=true; $('nightCalReset').hidden=false;
}

/* each screen frame while it shows, called by the loop right after the stack drew (boot's afterDraw, CORE-6): the camera picture (the same crop and
   mirror as the camera layer, rule #12) and every point of every hand, the locked one in the firefly lime; under a card the picture dims. The
   snapshot is closed when the next camera frame arrives, so a separate animation frame found it closed: black frames (the NIGHT-2 flicker). A
   closed picture still keeps the last drawn frame (its picture and its points together, rule #8) */
const BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const pic={ drawn:0, kept:0 }; let keepDbg=true;
export function calTick(){
  if(!mode) return;
  const c=$('nightCalPic'), main=$('canvas'), W=main.width, H=main.height, fresh=c.width!==W || c.height!==H; if(c.width!==W) c.width=W; if(c.height!==H) c.height=H;
  const g=c.getContext('2d'), src=BUS.get('picture'), vw=src&&(src.videoWidth||src.width), vh=src&&(src.videoHeight||src.height);
  if(!(vw && vh) && src && !fresh && keepDbg){ pic.kept++; return; }   // closed (an ImageBitmap reads 0 × 0): the last frame stays
  g.globalAlpha=1; g.fillStyle=cv('night-a94'); g.fillRect(0,0,W,H);
  if(vw && vh) try{ const r=viewRect, x0=r.ax0*vw, y0=r.ay0*vh, w=(r.ax1-r.ax0)*vw, h=(r.ay1-r.ay0)*vh;
    if(mirrored()){ g.save(); g.scale(-1,1); g.drawImage(src,x0,y0,w,h,-W,0,W,H); g.restore(); } else g.drawImage(src,x0,y0,w,h,0,0,W,H); pic.drawn++; }catch(e){}
  if(mode!=='step'){ g.fillStyle=cv('night-a38'); g.fillRect(0,0,W,H); }
  const res=BUS.get('hands'), hands=(res&&res.landmarks)||[], lock=handCalState().hand, u=Math.max(1, Math.min(W,H)/600);
  for(const lm of hands){ const mine=!lock || (lm[0].x===lock.x && lm[0].y===lock.y), col=cv(mine ? 'hn-glow' : 'hn-amber');
    g.strokeStyle=col; g.fillStyle=col; g.lineWidth=1.5*u; g.globalAlpha=0.55; g.beginPath();
    for(const [a,b] of BONES){ g.moveTo(sx(lm[a].x,W), sy(lm[a].y,H)); g.lineTo(sx(lm[b].x,W), sy(lm[b].y,H)); } g.stroke();
    g.globalAlpha=1; for(const p of lm){ g.beginPath(); g.arc(sx(p.x,W), sy(p.y,H), 3*u, 0, 7); g.fill(); } }
  g.globalAlpha=1;
}
/* probe only: the screen's state, and the start door (the probes start through calStartProbe, since the public door refuses their hands) */
export const calDbg={
  state:()=>({ mode, reason, votes:{ ...votes }, side, swapped, say:$('nightCalSay').textContent, title:$('nightCalTitle').textContent, text:$('nightCalText').textContent, note:$('nightCalNote').textContent,
    yes:$('nightCalYes').textContent, no:$('nightCalNo').textContent, shown:!$('nightCal').hidden, card:!$('nightCalCard').hidden }),
  setStart:f=>{ startFn=f||handCalStart; },
  pic:()=>({ ...pic }), keep:on=>{ keepDbg=on!==false; },   // the picture's counters; keep(false) = CONTROL: a closed picture blanks the frame
};
