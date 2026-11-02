/* SPLIT-2: row «NIGHT profile round trip» on Night's page: the checks of C0 that need Night's record, its shell and its CSS (they ran on the one page before
   the split, word for word). From the page's start state in a non-default test state, Night sets ITS defaults and body.night hides the role, split, record,
   backing and Loop controls; back to the start state every field is EXACTLY as before. CONTROL: the comparison must see every field Night sets as changed. */
import { row } from '../core/rows.js';
import { profileApply, profileCurrent, profileLoadReport, profileOf, profileDoorsDbg, profileSavedDbg } from '../../../core/profile.js';
import { FX_FACTORY, timbreIdOf } from '../../../core/audio.js';
import { fxIsScalar } from '../../../core/state.js';

const KEYS=['scaleId','tonic','tonicCents','lead','phoneInstr','splitOn','hand','voice','chain'];
const cmp=(a,b)=> KEYS.filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>`${k}: ${JSON.stringify(a[k])} vs ${JSON.stringify(b[k])}`);
const hiddenNow=id=>{ const el=document.getElementById(id); return !el || getComputedStyle(el).display==='none'; };

export function checkNightProfile(){
  const d=[]; let n=0; const miss=s=>d.push(s), was=profileCurrent(), START='profile.full', ME='profile.night';
  const D=profileDoorsDbg(); if(!D) return { cases:1, total:1, differences:['the profile doors are not wired (ui.js)'] };
  const bar=document.getElementById('bar'), barMin=!!bar && bar.classList.contains('min');
  if(bar) bar.classList.remove('min');   // the collapsed bar hides several buttons by itself (else «hidden» could not fail)
  profileApply(START);
  const orig=D.read();
  try{
    const rep=profileLoadReport(); n++; if(rep.records!==2 || rep.skipped.length || rep.error) miss('records: '+JSON.stringify(rep));
    const me=profileOf(ME); n++; if(!me){ miss(ME+' missing'); return { cases:n, total:d.length, differences:d }; }
    for(const id of me.effects){ n++; if(!FX_FACTORY[id] && !fxIsScalar(id)) miss(`effect «${id}» is not an effect of this engine`); }
    for(const id of ['recBtn','jamBtn','loopPanelBtn','soundBtn']){ n++; if(hiddenNow(id)) miss(`#${id} hidden in the start state (the checks below could not fail)`); }
    const odd={ scaleId:'dorian', tonic:2, tonicCents:7, lead:timbreIdOf('ld',3), phoneInstr:'ch', splitOn:true, hand:{ L:'therm', R:'hold' }, voice:'lead', chain:orig.chain };
    D.write(odd);
    const before=D.read(); n++; { const c=cmp(before, odd); if(c.length) miss('the test state did not take: '+c.join(' · ')); }
    let why=profileApply(ME); n++; if(why) miss('refused: '+why);
    const inMe=D.read(), want={ scaleId:me.moods[0], tonic:me.key.tonic, tonicCents:me.key.cents, lead:me.timbres[0], phoneInstr:'ld', splitOn:false,
      hand:{ ...me.handFn.ld }, voice:'poly',
      chain:[ { fxId:'vol', params:[{ mode:'drive', hand:'play', axis:'x', inv:false }] },
        { fxId:'ctone', params:[{ mode:'fixed', v01:1 }, { mode:'drive', hand:'fx', finger:1, axis:'y', inv:false }] },
        { fxId:'cwave', params:[{ mode:'fixed', v01:1 }, { mode:'drive', hand:'fx', finger:2, axis:'y', inv:false }] },
        { fxId:'cecho', params:[{ mode:'drive', hand:'fx', finger:0, axis:'y', inv:false }, { mode:'fixed', v01:0.8431089342012043 }] },
        { fxId:'fdepth', params:[{ mode:'fixed', v01:1 }, { mode:'drive', hand:'play', axis:'z', inv:false }, { mode:'fixed', v01:0.5 }, { mode:'fixed', v01:1 }, { mode:'fixed', v01:0 }] } ] };
    n++; { const c=cmp(inMe, want); if(c.length) miss('its state: '+c.join(' · ')); }
    n++; if(!document.body.classList.contains('night')) miss('body.night not set');
    for(const id of ['instrBtn','splitBtn','recBtn','jamBtn','loopPanelBtn']){ n++; if(!hiddenNow(id)) miss(`#${id} visible`); }
    n++; if(hiddenNow('soundBtn')) miss('#soundBtn hidden');
    n++; { const c=cmp(before, inMe); if(c.length!==KEYS.length) miss(`CONTROL: the comparison saw ${c.length} of ${KEYS.length} changed fields (all of them change)`); }
    n++; if(!profileSavedDbg()) miss('no saved start state');
    n++; if(profileApply(ME)!==null) miss('applying the current profile again was refused');
    n++; if(!profileApply('profile.none')) miss('an unknown profile was accepted');
    why=profileApply(START); n++; if(why) miss('the start state refused: '+why);
    const back=D.read(); n++; { const c=cmp(back, before); if(c.length) miss('back, not exactly as before: '+c.join(' · ')); }
    n++; if(document.body.classList.contains('night')) miss('body.night still set');
    n++; if(hiddenNow('instrBtn') && hiddenNow('instrBtnL')) miss('no role button in the start state');
    n++; if(hiddenNow('recBtn')) miss('#recBtn hidden in the start state');
    n++; if(profileSavedDbg()) miss('a saved state left after the return');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ profileApply(START); D.write(orig); profileApply(was); if(bar && barMin) bar.classList.add('min'); }
  return { cases:n, total:d.length, differences:d };
}
row({ night:true, at:1005.5, name:'NIGHT profile round trip', run:()=>checkNightProfile(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
