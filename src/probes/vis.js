/* VIS1a (RUN 6, docs/VIS1-design.md §7): row «VIS1a stack and bus» (quick and all; no sound).
   (1) the compositor holds the modules in layer order — scene (off in Full, VIS1b), camera and backdrop (background; the backdrop draws
       nothing on the Camera background), surface (instrument), hands (overlay);
   (2) the LIVE engine table publishes each contract call on the `notes` ring (a note-off of an owner that plays nothing: silent) with its
       kind, owner, role and `when`; (3) the render copy's table (makeENG over the copy, as render.js builds it) publishes nothing;
   (4) the picture and the hands topics are written by the frame path (versions move while the play screen draws). CONTROL: a reader
       of the bus cannot write. Pixel identity of the stack (camera + surface + hands = the old drawing) is proved by tools/ui-snap.mjs. */
import { row } from './rows.js';
import { BUS } from '../core/bus.js';
import { stackList } from '../draw.js';
import { makeENG } from '../recorder.js';
import { ENG } from '../live/eng.js';   // the live table (recorder does not re-export it)

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function checkVisStack(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  try{
    const L=stackList(); n++;
    if(JSON.stringify(L)!==JSON.stringify([{ id:'scene', layer:'scene', on:false },{ id:'camera', layer:'background', on:true },{ id:'backdrop', layer:'background', on:true },
        { id:'surface', layer:'instrument', on:true },{ id:'hands', layer:'overlay', on:true }]))
      miss('the stack: '+JSON.stringify(L));
    const s0=BUS.seq('notes'); ENG.leadOff(null, null, { own:'probe:vis1a', when:12.5 });
    const got=BUS.since('notes', s0).items; n++;
    if(got.length!==1 || got[0].kind!=='off' || got[0].owner!=='probe:vis1a' || got[0].role!=='ld' || got[0].when!==12.5) miss('live note-off on the ring: '+JSON.stringify(got));
    const R=await import('../render.js'), s1=BUS.seq('notes');
    await R.engineProbe(async eng=>{ const E=makeENG(eng); E.leadOff(null, null, { own:'probe:vis1a-copy' }); });
    n++; if(BUS.seq('notes')!==s1) miss(`the render copy published ${BUS.seq('notes')-s1} note(s) on the live bus`);
    const v0=BUS.version('picture'); await sleep(250);
    n++; if(BUS.version('picture')===v0) miss('the picture topic did not move in 250 ms of play-screen frames');
    n++; let threw=false; try{ BUS.reader().set('hands', null); }catch(e){ threw=true; } if(!threw) miss('CONTROL: a bus reader could write');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1006, name:'VIS1a stack and bus', drawn:true, run:()=>checkVisStack(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
