/* LIGHT-9 — THE LANGUAGE BY HAND: a native picker on the start card listing Light's eight languages by their own names (core LANG_LABEL);
   a choice goes through core's door (setLang: kept on this device, namespaced «light», the page's texts redrawn, listeners told). */
import { LANGS, LANG_LABEL, lang, setLang, onLangChange, t } from '../../core/i18n.js';
const $=id=>document.getElementById(id);
function sync(){ const s=$('lightLang'); if(!s) return; s.value=lang; s.setAttribute('aria-label', t('light.lang')); const n=$('lightLangName'); if(n) n.textContent=LANG_LABEL[lang]||lang; }   // LIGHT-9b: the shown name, the pill fits it
export function lightLangWire(){
  const s=$('lightLang'); if(!s) return;
  s.replaceChildren(...LANGS.map(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=LANG_LABEL[c]||c; return o; }));
  s.onchange=()=>setLang(s.value);
  onLangChange(sync); sync();
}
/* probe only */
export const lightLangDbg=()=>({ langs:[...$('lightLang').options].map(o=>o.value), value:$('lightLang').value, lang, shown:$('lightLangName').textContent });
