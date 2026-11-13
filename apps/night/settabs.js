/* DESIGN-1 part C: THE SETTINGS IN THREE SHORT TABS — Sound · Picture · Hands (the markup in index.html: #nightSetTabs, the panes [data-pane]).
   NIGHT-13: no «More» — every tab shows all its controls; the panes share one grid cell (night.css), so the card does not jump on a switch.
   Only what is shown changes: every control keeps its id, its handler and its value. The tab chosen stays while the page lives (not stored).
   Revert: docs/night/design/DESIGN-1-settings-before.html. */

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
export function setTabsWire(){
  const tabs=[...document.querySelectorAll('#nightSetTabs [role=tab]')];
  for(const b of tabs){ b.onclick=()=>setTab(b.dataset.tab);
    b.onkeydown=e=>{ const k=tabs.indexOf(b), go= e.key==='ArrowRight' ? k+1 : e.key==='ArrowLeft' ? k-1 : e.key==='Home' ? 0 : e.key==='End' ? tabs.length-1 : null;
      if(go==null) return; e.preventDefault(); setTab(tabs[(go+tabs.length)%tabs.length].dataset.tab, true); }; }
  setTab(cur);
}
