/* NIGHT-11 part 5 — rows «NIGHT pixel budget» and «NIGHT Detailed guard», on the running app with the forest open.
   «NIGHT pixel budget»: (1) this window (one device pixel per CSS pixel, like the laptop) renders at exactly today's ratio (the CONTROL that nothing
   moved there: 0.6 at Standard); (2) the law told a phone's screen (390 × 844 at 2.75) gives the renderer about 1.10 — the budget, not 0.6; (3) THE
   GUARD with made-up samples ten times a second: a scene too slow for 4 samples → one step down (a smaller ratio, never below today's law); 20 good
   samples → one step back up; CONTROL: on this window's own screen (no steps) the same slow samples move nothing.
   «NIGHT Detailed guard»: (1) a run killed at Detailed (its flag left, the level stored Detailed) → the next start opens at Standard, remembers it, says
   why once, clears the flag; CONTROL: without the flag the start stays Detailed. (2) The flag is set while the room runs at Detailed and cleared by a
   clean exit (pagehide). (3) A lost context at Detailed reopens at Standard (remembered); CONTROL: without the step-down it reopens at Detailed. */
import { row } from '../core/rows.js';

const wait=ms=>new Promise(r=>setTimeout(r, ms));
const until=async (f, ms, step=50)=>{ const t0=performance.now(); while(performance.now()-t0<ms){ if(await f()) return true; await wait(step); } return !!(await f()); };
const LEVEL_KEY='handsong.sceneLevel', RUN_KEY='handsong.nightDetailedRun';
const get=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } }, put=(k,v)=>{ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} };
async function openAt(H, lv){ await H.setSceneLevel(lv); await H.setBackground('forest'); return until(()=>{ const I=H.sceneInfo(); return I.webgl && !I.opening && I.rendered>0 && I.level===lv; }, 90000, 200); }
export async function checkNightPixels(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const H=await import('../../../apps/night/scene/host.js'), P=await import('../../../apps/night/pure/pixels.js'), keep={ bg:H.backgroundOf(), level:H.sceneLevel(), stored:get(LEVEL_KEY) };
  try{
    ok('the forest did not open at Standard', await openAt(H, 'reduced'));
    const r0=H.sceneInfo().pixelRatio, old=P.ratioOld(devicePixelRatio||1, 'reduced');
    ok(`this window (${innerWidth}×${innerHeight} at ${devicePixelRatio}) left today's ratio: ${r0} (today ${old})`, devicePixelRatio>1 || Math.abs(r0-old)<1e-9);
    const PH={ w:390, h:844, dpr:2.75 }; H.sceneGuardDbg({ view:PH, reset:true }); await wait(100);
    const r1=H.sceneInfo().pixelRatio, want=P.sceneRatio(PH.w, PH.h, PH.dpr, 'reduced'); notes.push(`ratio: this window ${r0}; told a 390×844 phone at 2.75: ${r1.toFixed(4)} (today's law ${P.ratioOld(2.75,'reduced')})`);
    ok(`a phone's screen did not get the budget (${r1}, wanted ${want})`, Math.abs(r1-want)<1e-9 && r1>1.05);
    let fps=5; H.sceneGuardDbg({ sample:()=>({ fps, cap:30, det:10, cam:30 }), periodMs:100, reset:true });
    await until(()=>H.sceneInfo().guard.step>=1, 3000); const g1=H.sceneInfo();
    ok(`slow samples did not lower the picture (step ${g1.guard.step}, ratio ${g1.pixelRatio})`, g1.guard.step===1 && g1.pixelRatio<r1 && g1.pixelRatio>=P.ratioOld(2.75,'reduced')-1e-9);
    fps=30; await until(()=>H.sceneInfo().guard.step===0, 5000); const g2=H.sceneInfo();
    ok(`good samples did not raise it again (step ${g2.guard.step}, ratio ${g2.pixelRatio})`, g2.guard.step===0 && Math.abs(g2.pixelRatio-r1)<1e-9);
    notes.push(`guard: lowered to ${g1.pixelRatio.toFixed(4)} after 4 slow samples, back to ${g2.pixelRatio.toFixed(4)} after 20 good ones (downs ${g2.guard.downs}, ups ${g2.guard.ups})`);
    fps=5; H.sceneGuardDbg({ view:null, reset:true }); await wait(1200); const g3=H.sceneInfo();
    ok(`CONTROL: on this window's own screen slow samples moved the picture (step ${g3.guard.step}, ratio ${g3.pixelRatio})`, devicePixelRatio>1 || (g3.guard.step===0 && Math.abs(g3.pixelRatio-old)<1e-9));
  } finally { H.sceneGuardDbg({ view:null, sample:null, periodMs:null, reset:true }); await H.setSceneLevel(keep.level); await H.setBackground(keep.bg); put(LEVEL_KEY, keep.stored); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.987, night:true, drawn:true, name:'NIGHT pixel budget', run:()=>checkNightPixels(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });

export async function checkNightDetailedGuard(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const H=await import('../../../apps/night/scene/host.js'), keep={ bg:H.backgroundOf(), level:H.sceneLevel(), stored:get(LEVEL_KEY), run:get(RUN_KEY) };
  try{
    /* (1) the start after a run killed at Detailed */
    put(LEVEL_KEY, 'full'); put(RUN_KEY, '1'); H.sceneStartNote();
    { const lv=H.sceneStartLevelDbg(), note=H.sceneStartNote();
      ok(`a run killed at Detailed: the start opened at ${lv}, stored ${get(LEVEL_KEY)}, note ${note}, flag ${get(RUN_KEY)}`, lv==='reduced' && get(LEVEL_KEY)==='reduced' && note==='detailed-crash' && get(RUN_KEY)==null);
      ok('the note was said twice', H.sceneStartNote()==null); }
    put(LEVEL_KEY, 'full'); put(RUN_KEY, null);
    { const lv=H.sceneStartLevelDbg(); ok('CONTROL: without the flag the start left Detailed ('+lv+')', lv==='full' && H.sceneStartNote()==null); }
    /* (2) the flag's life */
    ok('the forest did not open at Detailed', await openAt(H, 'full'));
    await until(()=>get(RUN_KEY)==='1', 3000); ok('no flag while Detailed runs', get(RUN_KEY)==='1');
    window.dispatchEvent(new Event('pagehide')); ok('a clean exit left the flag', get(RUN_KEY)==null);
    await until(()=>get(RUN_KEY)==='1', 3000);   // it comes back with the next frame
    /* (3) a lost context at Detailed */
    for(const stepDown of [true, false]){
      H.sceneLostDbg({ reopen:true, reset:true, delayMs:300, stepDown }); if(!stepDown) ok('the forest did not open at Detailed again', await openAt(H, 'full'));
      const m0=H.sceneInfo().contextsMade; H.sceneLoseDbg();
      const back=await until(()=>{ const I=H.sceneInfo(); return I.webgl && I.contextsMade>m0 && !I.opening && I.rendered>0; }, 90000, 200), I=H.sceneInfo();
      if(stepDown){ ok(`a loss at Detailed: reopened ${back} at ${I.level}, stored ${get(LEVEL_KEY)}`, back && I.level==='reduced' && get(LEVEL_KEY)==='reduced'); notes.push(`a loss at Detailed reopened at ${I.level} (stored ${get(LEVEL_KEY)})`); }
      else ok(`CONTROL: without the step-down a loss at Detailed reopened at ${I.level}`, back && I.level==='full');
    }
  } finally { H.sceneLostDbg({ reopen:true, reset:true, delayMs:null, stepDown:true }); await H.setSceneLevel(keep.level); await H.setBackground(keep.bg); put(LEVEL_KEY, keep.stored); put(RUN_KEY, keep.run); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.988, night:true, drawn:true, name:'NIGHT Detailed guard', run:()=>checkNightDetailedGuard(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
