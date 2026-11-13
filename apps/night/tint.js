/* DESIGN-1 part B: THE ROOM'S TINT ON THE INTERFACE — the current room's record names its `tint` token (its light colour in night.css; the data
   row «NIGHT room tint» checks dark ink on it and it on the night base both stay readable). One door: it sets --night-tint on the page's root; night.css registers that property as a
   colour and eases it over a room switch's two fades. now: no easing (the start: the remembered room's tint from the first frame it is known). */
const colourOf=name=>{ try{ return getComputedStyle(document.documentElement).getPropertyValue('--cv-'+name).trim()||null; }catch(e){ return null; } };   // the room's token → its colour
export function tintApply(rec, o={}){
  const el=document.documentElement, t=rec && typeof rec.tint==='string' ? colourOf(rec.tint) : null; if(!el) return null;
  const was=el.style.getPropertyValue('--night-tint').trim(); if(t===(was||null)) return t;
  if(o.now){ el.style.transition='none'; if(t) el.style.setProperty('--night-tint', t); else el.style.removeProperty('--night-tint'); void getComputedStyle(el).getPropertyValue('--night-tint'); el.style.removeProperty('transition'); }
  else if(t) el.style.setProperty('--night-tint', t); else el.style.removeProperty('--night-tint');
  return t;
}
/* the tint the interface shows now (mid-ease during a switch) — probes and the start screen's lights */
export const tintNow=()=>getComputedStyle(document.documentElement).getPropertyValue('--night-tint').trim();
