/* NIGHT-1 stage 3: the dev switch for the quiet floor. Address: <page>?probe&tails=on or =off; a small pill shows which it is and flips it. Under tools/, so previews carry it and production doesn't. */
import { setPartialFloor } from '../../../core/audio.js';
const FLOOR=-70, CSS='#tailPill{position:fixed;z-index:2147483000;left:8px;top:8px;min-height:44px;padding:0 14px;border:0;border-radius:12px;font:600 15px system-ui,sans-serif;background:#c8f56a;color:#10140a}#tailPill.off{background:#222936;color:#f1eee4}';
export function mountTailSwitch(){
  let on=new URLSearchParams(location.search).get('tails')==='on';
  const b=document.createElement('button'), st=document.createElement('style'); b.id='tailPill'; st.textContent=CSS;
  const set=()=>{ setPartialFloor(on ? FLOOR : null); b.textContent=on ? 'Tails cut: ON' : 'Tails cut: OFF'; b.classList.toggle('off',!on); };
  b.onclick=()=>{ on=!on; set(); }; document.head.append(st); document.body.append(b); set();
  window.__tailSwitch={ on:()=>on };
}
