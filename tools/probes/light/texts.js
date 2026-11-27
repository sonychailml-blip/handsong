/* LIGHT-6 row «LIGHT eight languages»: (1) every Light text key has a text in each of the eight languages, and so do the shared start messages
   on Light's page; (2) every key the page names ([data-i18n], [data-i18n-title]) exists in English; (3) the 31 modes and their 8 menu groups have
   names in the six added languages — exactly the profile's moods (CONTROL: an id outside the profile must have no name); (4) the scale sheet shows
   them: in Spanish the major mode reads «Mayor (jónico)». The language is put back. */
import { LIGHT_TEXTS } from '../../../apps/light/texts.js';
import { LIGHT_MODE_IDS, modeNameOf, groupNameOf } from '../../../apps/light/modenames.js';
import { DICTS, lang, setLang } from '../../../core/i18n.js';
import { profileOf } from '../../../core/profile.js';
import { scaleById } from '../../../core/scales.js';
import { scaleName } from '../../../apps/light/controls.js';

const LANGS=['en','ru','es','pt','de','fr','it','ka'], START=['load.model','load.warm','load.camera','load.error','cam.busy','cam.notfound','cam.denied','start.retry'];
export async function checkLightTexts(){
  const diffs=[], miss=s=>diffs.push(s), keep=lang;
  const keys=Object.keys(LIGHT_TEXTS.en);
  for(const L of LANGS){ if(!LIGHT_TEXTS[L]) { miss('no texts in '+L); continue; }
    const gap=keys.filter(k=>!(typeof LIGHT_TEXTS[L][k]==='string' && LIGHT_TEXTS[L][k].trim())); if(gap.length) miss(`${L}: ${gap.length} keys without a text (${gap.slice(0,3).join(', ')})`);
    const sg=START.filter(k=>!(DICTS[L] && DICTS[L][k])); if(sg.length) miss(`${L}: start messages missing (${sg.join(', ')})`); }
  const named=[...document.querySelectorAll('[data-i18n],[data-i18n-title]')].map(e=>e.getAttribute('data-i18n')||e.getAttribute('data-i18n-title'));
  const absent=[...new Set(named)].filter(k=>!DICTS.en[k]); if(absent.length) miss('the page names keys with no English text: '+absent.join(', '));
  const moods=profileOf('profile.light').moods;
  if(JSON.stringify([...LIGHT_MODE_IDS].sort())!==JSON.stringify([...moods].sort())) miss('the six-language names do not cover exactly the profile\'s moods');
  try{
    for(const L of ['es','pt','de','fr','it','ka']){ setLang(L);
      const noName=moods.filter(id=>!modeNameOf(id)); if(noName.length) miss(`${L}: ${noName.length} modes without a name`);
      const groups=[...new Set(moods.map(id=>scaleById(id).grpKey))].filter(k=>!groupNameOf(k)); if(groups.length) miss(`${L}: groups without a name (${groups.join(', ')})`);
      if(modeNameOf('maqam-rast')) miss('CONTROL: a mode outside the profile has a name'); }
    setLang('es'); const es=scaleName(scaleById('major')); if(es!=='Mayor (jónico)') miss('the Spanish major reads «'+es+'»');
  } finally { setLang(keep); }
  return { pass:!diffs.length, diffs, note:`${keys.length} keys × 8 languages, ${moods.length} modes` };
}
