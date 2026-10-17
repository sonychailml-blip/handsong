/* C4a (RUN 6, Calm plan §4.1, §10): row «C4a solo Firefly» (quick and all; three short offline renders through the engine copy).
   (1) the solo record `solo.firefly` carries exactly the chord Firefly's partial table and level (one tine, two families);
   (2) a solo Firefly note rings and decays by itself: loud in its first 0.2 s, its last window (1.4–1.5 s, the key still held) ≥ 20 dB
       below that — a struck tine, not a pad;
   (3) a held note moved to another pitch (a hand going to another row — leadOn of the same owner) STRIKES ANEW: the energy right after the
       move (0.52–0.62 s) is ≥ 2× the same window of the same note without the move (CONTROL: the comparison itself — a bank that only
       stored the new pitch would leave the two equal). GOLD «ld 23» holds its golden render (P.all). */
import { row } from './rows.js';
import { timbreById, timbresOf } from '../audio.js';

const off=undefined;
const rms=(x,rate,a,b)=>{ let s=0, n=0; for(let i=Math.round(a*rate);i<Math.round(b*rate);i++){ s+=x[i]*x[i]; n++; } return Math.sqrt(s/Math.max(1,n)); };
export async function checkSoloFirefly(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  try{
    const S=timbreById('solo.firefly'), C=timbreById('chord.firefly'); n++;
    if(!S || !C){ miss('solo.firefly or chord.firefly missing'); return { cases:n, total:d.length, differences:d }; }
    const R=await import('../render.js'), eng=await import('../audio.js?render');
    const rs=eng.LEAD_INSTR.findIndex(x=>x.id==='solo.firefly'); n++; if(rs!==S.idx || timbresOf('ld')[S.idx].id!=='solo.firefly') miss('the solo position differs between the live engine and the copy');
    const T=await import('../timbreload.js'), recOf=id=>T.timbreAll().find(r=>r.id===id), rS=recOf('solo.firefly'), rC=recOf('chord.firefly'); n++;
    if(JSON.stringify(rS.recipe)!==JSON.stringify(rC.recipe) || rS.engine!=='tine') miss('the solo record is not the chord Firefly\'s tine: '+JSON.stringify(rS.recipe));
    const one=await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',220,0.8,rs,off,off,off,off,0.05); e.leadOff('g',off,1.55); }, 1.6);
    const a0=rms(one.L,one.rate,0.05,0.25), a1=rms(one.L,one.rate,1.4,1.5); n++;
    if(!(a0>1e-3 && 20*Math.log10(a1/a0)<=-20)) miss(`ring and decay: first 0.2 s rms ${a0.toExponential(2)}, 1.4–1.5 s ${(20*Math.log10(a1/a0)).toFixed(1)} dB (≤ −20 expected)`);
    const mv=await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',220,0.8,rs,off,off,off,off,0.05); e.leadOn('g',330,0.8,rs,off,off,off,off,0.5); e.leadOff('g',off,1.0); }, 1.1);
    const still=await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',220,0.8,rs,off,off,off,off,0.05); e.leadOff('g',off,1.0); }, 1.1);
    const m1=rms(mv.L,mv.rate,0.52,0.62), m0=rms(still.L,still.rate,0.52,0.62); n++;
    if(!(m1>=2*m0)) miss(`a held note moved to another pitch did not strike anew: rms after the move ${m1.toExponential(2)} vs without ${m0.toExponential(2)}`);
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1009, name:'C4a solo Firefly', run:()=>checkSoloFirefly(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
