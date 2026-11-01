/* C0 (RUN 6): row «C0 profile round trip» (quick and all; no sound, no capture). SPLIT-2: on the Full page, with a test record (fixture.profile.json) because a page holds
   only its own profile; Night's own checks: row «NIGHT profile round trip» on its page.
   (1) the page's record loaded, nothing skipped; the solo hand functions of the core table = the Sound panel's select (ui.js HANDFN_OPTS);
   (2) from a NON-default state (another scale, key and cents, solo timbre, role chords, split on, solo hands therm / hold, lead voice) the record sets ITS defaults; back
       every field is EXACTLY the state before. CONTROL: the comparison must see every field the record sets as different (a comparison that cannot fail would pass a restore
       that does nothing);
   (3) refusals: an unknown profile; the current one again changes nothing.
   The test states go through the profile DOORS (the panel's own paths); the person's state is written back in finally. */
import { row } from './rows.js';
import { profileApply, profileCurrent, profileLoadReport, profileAddDbg, profileDropDbg, profileDoorsDbg, profileSavedDbg } from '../../../core/profile.js';
import { HAND_FNS } from '../../../core/pure/profile.js';
import { timbreIdOf } from '../../../core/audio.js';

const KEYS=['scaleId','tonic','tonicCents','lead','phoneInstr','splitOn','hand','voice','chain'];   // RUN 7 (C4b): + the solo chain
const cmp=(a,b)=> KEYS.filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>`${k}: ${JSON.stringify(a[k])} vs ${JSON.stringify(b[k])}`);

const FIXTURE='profile.fixture', START='profile.full';
export async function checkProfile(){
  if(profileCurrent()!==START) return { cases:0, total:0, differences:[], status:'not applicable: the page opened in its own profile' };
  const d=[]; let n=0; const miss=s=>d.push(s);
  const D=profileDoorsDbg(); if(!D) return { cases:1, total:1, differences:['the profile doors are not wired (ui.js)'] };
  const orig=D.read();
  try{
    const rep=profileLoadReport(); n++; if(rep.records!==1 || rep.skipped.length || rep.error) miss('records: '+JSON.stringify(rep));
    const fx=await (await fetch(new URL('./fixture.profile.json', import.meta.url), { cache:'no-store' })).json();
    { const why=profileAddDbg(fx); n++; if(why){ miss('the fixture was refused: '+why); return { cases:n, total:d.length, differences:d }; } }
    const sel=[...document.querySelectorAll('#handFnRows select')][0];
    n++; if(sel && orig.phoneInstr==='ld' && JSON.stringify([...sel.options].map(o=>o.value))!==JSON.stringify(HAND_FNS.ld))
      miss('core HAND_FNS.ld differs from the Sound panel: '+[...sel.options].map(o=>o.value).join(','));
    const odd={ scaleId:'dorian', tonic:2, tonicCents:7, lead:timbreIdOf('ld',3), phoneInstr:'ch', splitOn:true, hand:{ L:'therm', R:'hold' }, voice:'lead', chain:orig.chain };
    D.write(odd);
    const before=D.read(); n++; { const c=cmp(before, odd); if(c.length) miss('the test state did not take: '+c.join(' · ')); }
    let why=profileApply(FIXTURE); n++; if(why) miss('the fixture did not apply: '+why);
    const inFx=D.read(), want={ scaleId:fx.moods[0], tonic:fx.key.tonic, tonicCents:fx.key.cents, lead:fx.timbres[0], phoneInstr:'ld', splitOn:false, hand:{ ...fx.handFn.ld }, voice:before.voice, chain:before.chain };
    n++; { const c=cmp(inFx, want); if(c.length) miss('the fixture state: '+c.join(' · ')); }
    n++; { const c=cmp(before, inFx); if(c.length!==KEYS.length-2) miss(`CONTROL: the comparison saw ${c.length} of ${KEYS.length-2} changed fields`); }
    n++; if(!profileSavedDbg()) miss('no saved start state');
    n++; if(profileApply(FIXTURE)!==null) miss('applying the current profile again was refused');
    n++; if(!profileApply('profile.none')) miss('an unknown profile was accepted');
    why=profileApply(START); n++; if(why) miss('the start state refused: '+why);
    const back=D.read(); n++; { const c=cmp(back, before); if(c.length) miss('back, not exactly as before: '+c.join(' · ')); }
    n++; if(profileSavedDbg()) miss('a saved state left after the return');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ if(profileCurrent()!==START) profileApply(START); profileDropDbg(FIXTURE); D.write(orig); }
  return { cases:n, total:d.length, differences:d };
}
row({ calm:true, at:1005, name:'C0 profile round trip', run:()=>checkProfile(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, status:r.status }) });
