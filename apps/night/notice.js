/* NIGHT-11 — ONE NOTICE LINE for what needs the person's tap now: the sound stopped by the phone («Tap to continue»), the camera that stopped
   (part 1), a start problem shown in the forest. One line at a time, by priority (the lower number wins); while one shows, the coaching line and
   the idle line step aside (body.night-notice-on, night.css). A tap on the line runs the shown notice's own action. */
import { t, onLangChange } from '../../core/i18n.js';

const $=id=>document.getElementById(id);
export const NOTICE_PRI=Object.freeze({ audio:0, camera:1, info:2, update:3 });   // NIGHT-14: a new version — the quietest
const live=new Map();   // id → { key, params, tap }
let shown=null;
function render(){
  const el=$('nightNotice'); if(!el) return;
  const ids=[...live.keys()].sort((a,b)=>(NOTICE_PRI[a]??9)-(NOTICE_PRI[b]??9)), id=ids[0]||null, n=id ? live.get(id) : null;
  shown=id; el.hidden=!n; document.body.classList.toggle('night-notice-on', !!n);
  if(n){ $('nightNoticeText').textContent=t(n.key, n.params); el.dataset.notice=id; } else delete el.dataset.notice;
}
/* show (or replace) notice `id` with text key `key`; tap() runs when the line is tapped (inside the tap: a resume or a camera request may use it) */
export function noticeShow(id, key, tap=null, params=null){ live.set(id, { key, params, tap }); render(); }
export function noticeHide(id){ if(live.delete(id)) render(); }
export const noticeOf=()=>shown;
export function noticeWire(){
  const el=$('nightNotice'); if(!el) return;
  el.onclick=()=>{ const n=shown && live.get(shown); if(n && n.tap) n.tap(); };
  onLangChange(render); render();
}
/* probe only: the shown notice, its text, every live one */
export const noticeDbg=()=>({ shown, text:shown ? ($('nightNoticeText')||{}).textContent||'' : '', live:[...live.keys()], onScreen:!!$('nightNotice') && !$('nightNotice').hidden && getComputedStyle($('nightNotice')).display!=='none' });
