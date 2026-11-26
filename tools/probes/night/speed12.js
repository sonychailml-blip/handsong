/* SPEED-1 step 12 — «SPEED parallel compile»: a room's programs compiled all at once before three compiles them (scene/host.js parCompile). Per room
   (the forest at Standard and Detailed, the rain at Standard), reopened with the step on and off, every program linked on the room's canvas is recorded: three's own set
   must be the same byte for byte (nothing drawn can change; a room with parCompile false — the rain — compiles nothing ahead), and with the extension every program compiled ahead must equal one three then links
   (else the browser's cache misses and the step only costs). CONTROL: each program compiled ahead one line off (sceneParDbg(_, true)) — none matches.
   Chimneys run (2026-11-26): a switch while the room is drawn compiles everything ahead, no frame meanwhile (CONTROL frames allowed). */
import { row } from '../core/rows.js';

export async function checkSpeedPar(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), wait=ms=>new Promise(r=>setTimeout(r, ms));
  const room0=H.sceneRoom(), bg0=H.backgroundOf(), lv0=H.sceneLevel(), links=[], keep=[];
  const fnv=s=>{ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h, 16777619)>>>0; } return h.toString(16); };
  for(const C of [WebGL2RenderingContext, WebGLRenderingContext]){ const lp=C.prototype.linkProgram; keep.push([C, lp]);
    C.prototype.linkProgram=function(pr){ if(this.canvas && this.canvas.id==='scene'){ const sh=this.getAttachedShaders(pr)||[]; links.push(sh.map(x=>this.getShaderParameter(x, this.SHADER_TYPE)+':'+this.getShaderSource(x)).sort().join('\n#----\n')); } return lp.call(this, pr); }; }
  const open=async (off, mis)=>{ H.sceneParDbg(off, mis); await H.setBackground('dark'); await wait(300); links.length=0; await H.setBackground('forest');
    const lim=performance.now()+120e3; while(performance.now()<lim){ const I=H.sceneInfo(); if(I.rendered>0 && !I.opening) break; await wait(50); }
    const L=links.slice(), cnt={}; for(const l of L) cnt[l]=(cnt[l]||0)+1; const uniq=Object.keys(cnt).sort();
    return { fp:fnv(uniq.join('\n#====\n')), unique:uniq.length, twice:Object.values(cnt).filter(v=>v>=2).length, par:H.sceneParDbg() }; };
  try{
    for(const [id, lv] of [['room.forest', 'reduced'], ['room.forest', 'full'], ['room.rain', 'reduced']]){ await H.setBackground('dark'); await RS.roomSwitch(id, { fast:true }); await H.setSceneLevel(lv);
      const on=await open(false, false), off=await open(true, false), bad=await open(false, true), tag=id.replace('room.', '')+' '+H.sceneLevel();
      ok(`${tag}: three's programs differ with the step on (${on.fp}, ${on.unique}) and off (${off.fp}, ${off.unique})`, on.fp===off.fp && on.unique===off.unique && on.unique>0);
      if(on.par.room===false){ ok(`${tag}: the room keeps the one-by-one compile, yet programs were compiled ahead`, !on.par.programs); notes.push(`${tag}: the room keeps the one-by-one compile (parCompile false); three's ${on.unique} programs the same`); continue; }
      if(!on.par.ext){ notes.push(`${tag}: no KHR_parallel_shader_compile — the old path only; three's ${on.unique} programs the same`); continue; }
      ok(`${tag}: of ${on.par.programs} programs compiled ahead ${on.twice} equal one three linked, ${on.par.done} finished`, on.par.programs>0 && on.twice===on.par.programs && on.par.done===on.par.programs);
      ok(`CONTROL ${tag}: programs compiled one line off still matched (${bad.twice} of ${bad.par.programs}) — the check cannot fail`, bad.twice<bad.par.programs);
      notes.push(`${tag}: three's ${on.unique} programs the same on and off (${on.fp}); ${on.par.programs} compiled ahead in ${on.par.ms} ms, each equal to three's; CONTROL one line off matches ${bad.twice} of ${bad.par.programs}`); }
    /* a switch WHILE THE ROOM IS DRAWN (rain → forest, the forest on screen): no frame during the parallel compile, every program finished and the
       sliced compile run to its end ('all') — two frames meanwhile ended the opening and cut both short (28 materials left to compile in play).
       CONTROL sceneParDbg(_, _, true): frames allowed meanwhile → caught */
    const sw=async loose=>{ H.sceneParDbg(false, false, loose); await H.setSceneLevel('reduced'); await RS.roomSwitch('room.forest', { fast:true }); await H.setBackground('forest');
      const settle=async()=>{ const lim=performance.now()+120e3; await wait(100); while(performance.now()<lim && H.sceneInfo().opening) await wait(50); await wait(300); };
      await settle(); await RS.roomSwitch('room.rain', { fast:true }); await settle(); await RS.roomSwitch('room.forest', { fast:true }); await settle();
      const P=H.sceneParDbg(), C=H.COMPILE_LOG, last=C.length ? C[C.length-1][1] : null; return { P, last, good:P.programs>0 && P.done===P.programs && P.drawn===0 && last==='all' }; };
    { const a=await sw(false), b=await sw(true);
      if(!a.P.ext) notes.push('the switch while drawn: no KHR_parallel_shader_compile — the old path only');
      else { ok(`a switch while drawn: ${a.P.done} of ${a.P.programs} programs finished, ${a.P.drawn} frames drawn meanwhile, the sliced compile ended at ${a.last}`, a.good);
        ok(`CONTROL a switch while drawn with frames allowed: still ${b.P.done} of ${b.P.programs}, ${b.P.drawn} frames, ended at ${b.last} — the check cannot fail`, !b.good);
        notes.push(`a switch while drawn (rain → forest): ${a.P.done}/${a.P.programs} finished, 0 frames meanwhile, sliced compile to 'all'; CONTROL frames allowed: ${b.P.drawn} frames, ${b.P.done}/${b.P.programs}, ended at ${b.last}`); } } }
  finally{ for(const [C, lp] of keep) C.prototype.linkProgram=lp; H.sceneParDbg(false, false, false);
    try{ await H.setBackground('dark'); await H.setSceneLevel(lv0); if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); await H.setBackground(bg0); }catch(e){} }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98813, night:true, name:'SPEED parallel compile', drawn:true, run:()=>checkSpeedPar(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
