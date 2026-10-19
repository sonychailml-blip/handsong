/* C0 (RUN 6, Calm plan §2, §10): row «C0 profile round trip» (quick and all; no sound, no capture).
   (1) the records loaded (Full and Calm, nothing skipped); Calm's effects are effects of this engine; the solo hand functions of the core
       table = the Sound panel's select (ui.js HANDFN_OPTS);
   (2) from a NON-default Full state (another scale, key and cents, solo timbre, role chords, split on, solo hands therm / hold, lead voice)
       Calm sets ITS defaults (Glow = major-penta, A, the first timbre, solo, no split, hands fx / note, poly) and body.calm hides the
       role, split, record, backing and Loop controls; back to Full every field is EXACTLY the state before and the controls are back.
       CONTROL: the comparison must see the Calm state as different from the Full state in every field Calm sets (a comparison that
       cannot fail would pass a restore that does nothing);
   (3) refusals: an unknown profile; the current one again changes nothing.
   The test states go through the profile DOORS (the panel's own paths); the person's state is written back in finally. The top bar is
   opened (not collapsed) for the visibility checks: the collapsed bar hides several buttons by itself. */
import { row } from './rows.js';
import { profileApply, profileCurrent, profileLoadReport, profileOf, profileDoorsDbg, profileSavedDbg } from '../profile.js';
import { HAND_FNS } from '../core/profile.js';
import { FX_FACTORY, timbreIdOf } from '../audio.js';
import { fxIsScalar } from '../state.js';

const KEYS=['scaleId','tonic','tonicCents','lead','phoneInstr','splitOn','hand','voice','chain'];   // RUN 7 (C4b): + the solo chain
const cmp=(a,b)=> KEYS.filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>`${k}: ${JSON.stringify(a[k])} vs ${JSON.stringify(b[k])}`);
const hiddenNow=id=>{ const el=document.getElementById(id); return !el || getComputedStyle(el).display==='none'; };

export function checkProfile(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const D=profileDoorsDbg(); if(!D) return { cases:1, total:1, differences:['the profile doors are not wired (ui.js)'] };
  const orig=D.read(), wasProf=profileCurrent(), bar=document.getElementById('bar'), barMin=!!bar && bar.classList.contains('min');
  if(bar) bar.classList.remove('min');   // the collapsed bar hides several buttons by itself — opened for the checks (else «hidden» could not fail)
  try{
    /* (1) records */
    const rep=profileLoadReport(); n++; if(rep.records!==2 || rep.skipped.length || rep.error) miss('records: '+JSON.stringify(rep));
    const calm=profileOf('profile.calm'), full=profileOf('profile.full');
    n++; if(!calm || !full){ miss('profile.calm or profile.full missing'); return { cases:n, total:d.length, differences:d }; }
    for(const id of calm.effects){ n++; if(!FX_FACTORY[id] && !fxIsScalar(id)) miss(`calm effect «${id}» is not an effect of this engine`); }
    const sel=[...document.querySelectorAll('#handFnRows select')][0];
    n++; if(sel && orig.phoneInstr==='ld' && JSON.stringify([...sel.options].map(o=>o.value))!==JSON.stringify(HAND_FNS.ld))
      miss('core HAND_FNS.ld differs from the Sound panel: '+[...sel.options].map(o=>o.value).join(','));
    n++; if(wasProf!=='profile.full') miss('the probe started outside Full: '+wasProf);
    for(const id of ['recBtn','jamBtn','loopPanelBtn','soundBtn']){ n++; if(hiddenNow(id)) miss(`#${id} hidden in Full before the switch (the Calm checks below could not fail)`); }
    /* (2) round trip from a non-default Full state */
    const odd={ scaleId:'dorian', tonic:2, tonicCents:7, lead:timbreIdOf('ld',3), phoneInstr:'ch', splitOn:true, hand:{ L:'therm', R:'hold' }, voice:'lead', chain:orig.chain };
    D.write(odd);
    const before=D.read(); n++; { const c=cmp(before, odd); if(c.length) miss('the test state did not take: '+c.join(' · ')); }
    let why=profileApply('profile.calm'); n++; if(why) miss('Calm refused: '+why);
    const inCalm=D.read(), want={ scaleId:calm.moods[0], tonic:calm.key.tonic, tonicCents:calm.key.cents, lead:calm.timbres[0], phoneInstr:'ld', splitOn:false,
      hand:{ ...calm.handFn.ld }, voice:'poly',
      chain:[ { fxId:'vol', params:[{ mode:'drive', hand:'play', axis:'x', inv:false }] },   // RUN 7 (C4b): Calm's own solo chain — Volume and «Forest depth»
        { fxId:'ctone', params:[{ mode:'fixed', v01:1 }, { mode:'drive', hand:'fx', finger:1, axis:'y', inv:false }] },   // RUN 7 (C5): the effects hand
        { fxId:'cwave', params:[{ mode:'fixed', v01:1 }, { mode:'drive', hand:'fx', finger:2, axis:'y', inv:false }] },
        { fxId:'cecho', params:[{ mode:'drive', hand:'fx', finger:0, axis:'y', inv:false }, { mode:'fixed', v01:0.8431089342012043 }] },
        { fxId:'fdepth', params:[{ mode:'fixed', v01:1 }, { mode:'drive', hand:'play', axis:'z', inv:false }, { mode:'fixed', v01:0.5 }] } ] };
    n++; { const c=cmp(inCalm, want); if(c.length) miss('Calm state: '+c.join(' · ')); }
    n++; if(!document.body.classList.contains('calm')) miss('body.calm not set');
    for(const id of ['instrBtn','splitBtn','recBtn','jamBtn','loopPanelBtn']){ n++; if(!hiddenNow(id)) miss(`#${id} visible in Calm`); }
    n++; if(hiddenNow('soundBtn')) miss('#soundBtn hidden in Calm (the way back to Full)');
    n++; { const c=cmp(before, inCalm); if(c.length!==KEYS.length) miss(`CONTROL: the comparison saw ${c.length} of ${KEYS.length} changed fields (Full → Calm changes all of them)`); }
    n++; if(!profileSavedDbg()) miss('no saved Full state while in Calm');
    n++; if(profileApply('profile.calm')!==null) miss('applying the current profile again was refused');
    n++; if(!profileApply('profile.none')) miss('an unknown profile was accepted');
    why=profileApply('profile.full'); n++; if(why) miss('Full refused: '+why);
    const back=D.read(); n++; { const c=cmp(back, before); if(c.length) miss('back in Full, not exactly as before: '+c.join(' · ')); }
    n++; if(document.body.classList.contains('calm')) miss('body.calm still set in Full');
    n++; if(hiddenNow('instrBtn') && hiddenNow('instrBtnL')) miss('no role button in Full');
    n++; if(hiddenNow('recBtn')) miss('#recBtn hidden in Full');
    n++; if(profileSavedDbg()) miss('a saved state left after the return to Full');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ if(profileCurrent()!=='profile.full') profileApply('profile.full'); D.write(orig); if(bar && barMin) bar.classList.add('min'); }
  return { cases:n, total:d.length, differences:d };
}
row({ calm:true, at:1005, name:'C0 profile round trip', run:()=>checkProfile(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
