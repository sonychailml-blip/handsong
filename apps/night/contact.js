/* STATS-1 — «WRITE TO US» in Settings: the address as selectable text, a copy button and a mail link (a convenience: many players have no mail app
   set up, so the address itself comes first). The address is put together here, not written in the page's source (light protection from scrapers,
   as Full's feedback address). */
import { t, onLangChange } from '../../core/i18n.js';

const $=id=>document.getElementById(id), ADDR=['hello', 'handsong.app'].join('@');
let copied=false;
function render(){
  const a=$('nightWriteAddr'), c=$('nightWriteCopy'), m=$('nightWriteMail'); if(!a) return;
  a.textContent=ADDR; if(m) m.href='mailto:'+ADDR; if(c) c.textContent=t(copied ? 'night.write.copied' : 'night.write.copy');
}
/* the clipboard where the browser allows it; else the address selected (the person copies it by hand) */
async function copy(){
  let ok=false; try{ await navigator.clipboard.writeText(ADDR); ok=true; }catch(e){}
  if(!ok){ try{ const r=document.createRange(), s=window.getSelection(); r.selectNodeContents($('nightWriteAddr')); s.removeAllRanges(); s.addRange(r); ok=!!(document.execCommand && document.execCommand('copy')); }catch(e){} }
  copied=ok; render();
}
export function contactWire(){
  const b=$('nightWrite'), box=$('nightWriteBox'); if(!b || !box) return;
  b.onclick=()=>{ box.hidden=!box.hidden; b.setAttribute('aria-expanded', String(!box.hidden)); copied=false; render(); };
  const c=$('nightWriteCopy'); if(c) c.onclick=()=>{ copy(); };
  onLangChange(()=>render()); render();
}
/* probe only: the block's state */
export const contactDbg=()=>({ addr:ADDR, open:!!$('nightWriteBox') && !$('nightWriteBox').hidden, copied });
