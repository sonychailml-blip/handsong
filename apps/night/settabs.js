/* DESIGN-1 part C: THE SETTINGS IN THREE SHORT TABS — Sound · Picture · Hands (the markup in index.html: #nightSetTabs, the panes [data-pane]) and,
   in a tab, a «More» line that opens its rarely used controls. Only what is shown changes: every control keeps its id, its handler and its value.
   The tab chosen stays while the page lives (not stored). Revert: docs/night/design/DESIGN-1-settings-before.html. */
import { t, onLangChange } from '../../core/i18n.js';

const $=id=>document.getElementById(id);
export const SET_TABS=Object.freeze(['sound', 'picture', 'hands']);
let cur='sound';
/* show one tab (its pane; the others hidden), the tab marked selected, keyboard focus kept in the tab list */
export function setTab(name, focus=false){
  if(!SET_TABS.includes(name)) return cur;
  cur=name;
  for(const b of document.querySelectorAll('#nightSetTabs [role=tab]')){ const on=b.dataset.tab===name; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex= on ? 0 : -1; b.classList.toggle('on', on); if(on && focus) b.focus(); }
  for(const p of document.querySelectorAll('#nightInfo [data-pane]')) p.hidden= p.dataset.pane!==name;
  return cur;
}
export const setTabOf=()=>cur;
/* a «More» line: open / close the block it controls; its word follows (More / Less) */
function moreSet(btn, open){ const body=$(btn.getAttribute('aria-controls')); if(!body) return; body.hidden=!open; btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.classList.toggle('on', open); const lab=btn.querySelector('.night-more-lab'); if(lab) lab.textContent=t(open ? 'night.set.less' : 'night.set.more'); }
export function setTabsWire(){
  const tabs=[...document.querySelectorAll('#nightSetTabs [role=tab]')];
  for(const b of tabs){ b.onclick=()=>setTab(b.dataset.tab);
    b.onkeydown=e=>{ const k=tabs.indexOf(b), go= e.key==='ArrowRight' ? k+1 : e.key==='ArrowLeft' ? k-1 : e.key==='Home' ? 0 : e.key==='End' ? tabs.length-1 : null;
      if(go==null) return; e.preventDefault(); setTab(tabs[(go+tabs.length)%tabs.length].dataset.tab, true); }; }
  const mores=[...document.querySelectorAll('#nightInfo .night-more')];
  for(const m of mores) m.onclick=()=>moreSet(m, m.getAttribute('aria-expanded')!=='true');
  const words=()=>{ for(const m of mores) moreSet(m, m.getAttribute('aria-expanded')==='true'); };   // its word in the page's language (no data-i18n: it changes with the state)
  onLangChange(words); words(); setTab(cur);
}
