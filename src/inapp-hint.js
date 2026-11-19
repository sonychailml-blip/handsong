/* МЯГКАЯ ПОДСКАЗКА «откройте в Safari / Chrome» на стартовой карточке — как в Night (apps/night/start.js):
   показывается, только если страница открыта во встроенном браузере приложения (inapp.js). Текст — по ОС
   (iOS → Safari, Android → Chrome, иное → любой из двух), плюс ссылка в поле (можно выделить вручную) и
   кнопка «Скопировать ссылку». Ничего не блокирует: «Играть» работает как прежде — это лишь совет.
   Side-effect модуль (импортирует main.js); язык — через t()/onLangChange. */
import { inAppOf } from './inapp.js';
import { t, onLangChange } from './i18n.js';

const $=id=>document.getElementById(id);
const env=()=>({ ua:navigator.userAgent, platform:navigator.platform, touch:navigator.maxTouchPoints||0,
  standalone: navigator.standalone===true || (()=>{ try{ return matchMedia('(display-mode: standalone)').matches; }catch(e){ return false; } })() });
const E=inAppOf(env());
let copied=false;

function render(){
  const box=$('inAppHint'); if(!box) return;
  box.hidden=!E.inApp; if(!E.inApp) return;
  $('inAppText').textContent=t(E.os==='ios' ? 'inapp.ios' : E.os==='android' ? 'inapp.android' : 'inapp.other');
  $('inAppUrl').value=location.href;
  $('inAppCopy').textContent=t(copied ? 'inapp.copied' : 'inapp.copy');
}
/* копирование: Clipboard API → запасной путь (выделить поле + execCommand); не вышло — поле уже выделено, можно скопировать руками */
async function copyLink(){
  const inp=$('inAppUrl'); let ok=false;
  try{ if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(location.href); ok=true; } }catch(e){}
  if(!ok){ try{ inp.focus(); inp.select(); inp.setSelectionRange(0, inp.value.length); ok=document.execCommand('copy'); }catch(e){} }
  if(ok){ copied=true; render(); }
}
const c=$('inAppCopy'); if(c) c.onclick=()=>{ copyLink(); };
onLangChange(render);
render();
