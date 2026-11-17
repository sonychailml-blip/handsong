/* RAIN-4e — «RAIN bed no clicks»: the founder heard «strange short sounds on top of the bed». Each of the 9 sounds (3 pieces × 3 levels) rendered
   offline for 3 minutes through the room's own engine (rooms/rain/lofi.js, the default sustaining piano), the vinyl off (its crackle IS clicks, by
   design); a CLICK is a sample-to-sample jump far above the signal on BOTH sides of it: |x[n] − x[n−1]| > K × the mean jump over the 9 ms before
   (n−200 … n−4) and over the 9 ms after (n+4 … n+200), and above a floor — a drum's onset is followed by a loud signal and is not one; a step in a
   smooth tail is. K and the floor are my guesses (said in the report). CONTROL: a 0.01 step injected into one rendered sound must be found.
   Every wait has an upper limit (a piece's three renders 400 s). */
import { row } from '../core/rows.js';

export const CLICK=Object.freeze({ K:12, floor:0.002, near:4, win:200, sr:22050, sec:180 });
/* the clicks of one channel → [sample indices] (one per 50 ms at most) */
export function clicksOf(x, C=CLICK){ const n=x.length, d=new Float32Array(n), P=new Float64Array(n+1), out=[]; for(let i=1;i<n;i++) d[i]=Math.abs(x[i]-x[i-1]); for(let i=0;i<n;i++) P[i+1]=P[i]+d[i];
  const mean=(a, b)=>{ a=Math.max(1, a); b=Math.min(n-1, b); return b>a ? (P[b+1]-P[a])/(b-a+1) : 0; }; let last=-1e9;
  for(let i=C.win+C.near;i<n-C.win-C.near;i++){ const v=d[i]; if(v<C.floor) continue; const before=mean(i-C.win, i-C.near), after=mean(i+C.near, i+C.win); if(v>C.K*Math.max(before, after, 1e-6) && i-last>C.sr*0.05){ out.push(i); last=i; } }
  return out; }
async function render(id, lv, C=CLICK){ const S=await import('../../../core/scales.js'); await S.scalesLoadRest(); const RR=(await import('../../../apps/night/rooms/rain/pure/room.js')).RAIN_ROOM, LF=await import('../../../apps/night/pure/lofi.js'), EN=await import('../../../apps/night/rooms/rain/lofi.js');
  const P=RR.bed2.lofi.pieces[id], v=S.scaleView(S.scaleById(id)), pv=S.scaleView(S.scaleById(P.parent), undefined, undefined, S.viewKey(v), S.viewKeyC(v)), c=new OfflineAudioContext(2, C.sr*C.sec, C.sr);
  const E=await EN.lofiEngine(c, c.destination, new URL('../../../apps/night/rooms/rain/', import.meta.url).href); E.tempo(P.bpm, 0); E.layer('crackle', 0, 0); E.level(RR.bed2.master*RR.bed2.level*RR.bed2.level, 0, 0.03);
  const st=LF.lofiInit(P, lv, { at:0.3, pc:S.scaleById(P.parent).iv }); for(const e of LF.lofiStep(st, 0, C.sec)) if(!(e.kind==='layer' && e.layer==='crackle')) E.play(e, e.t, pv);
  const b=await c.startRendering(); return [b.getChannelData(0), b.getChannelData(1)]; }
export async function checkRainClicks(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; }; let keep=null;
  for(const id of ['lydian-penta', 'dorian-hexa', 'mixolydian-hexa']){ const lvs=['quiet', 'groove', 'full'];   // a piece's three levels at once (each offline render on its own thread)
    const R3=await Promise.race([Promise.all(lvs.map(lv=>render(id, lv))), new Promise((_, no)=>setTimeout(()=>no(new Error(`${id}: the renders took over 400 s`)), 400000))]);
    R3.forEach(([L, R], k)=>{ const lv=lvs[k], cl=[...clicksOf(L), ...clicksOf(R)].sort((a, b)=>a-b);
      ok(`${id} ${lv}: ${cl.length} clicks — at ${cl.slice(0, 6).map(i=>(i/CLICK.sr).toFixed(3)+' s').join(', ')}`, cl.length===0); notes.push(`${id} ${lv}: ${cl.length} clicks in ${CLICK.sec} s`); if(!keep) keep=L.slice(); }); }
  /* CONTROL: a 0.01 step into the first sound, at 61.3 s */
  { const x=keep, at=Math.round(61.3*CLICK.sr); for(let i=at;i<x.length;i++) x[i]+=0.01; const f=clicksOf(x).filter(i=>Math.abs(i-at)<5); ok('CONTROL: an injected click was not found', f.length>0); notes.push(`CONTROL: the injected step found: ${f.length>0}`); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.9865, night:true, slow:true, name:'RAIN bed no clicks', run:()=>checkRainClicks(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkRainClicks(); }
