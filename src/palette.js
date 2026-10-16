/* DRAW1b (RUN 3, 2026-10-16) — THE CANVAS PALETTE, read from the design tokens (tokens.css, section «canvas»: --cv-*). One source: the
   play field, the strip, the arrangement window, the mixer and the editor draw every colour through cv('<name>') = the value of --cv-<name>
   (exact text, so the canvas parses what it parsed before); the role colours (once config.INSTR_COL), the no-role track colour and the
   effect bar colours come from here too. Read once per name and kept (the stylesheets in <head> load before module scripts run).
   ⛳ A new canvas colour = a --cv-* token first (static check 11 fails on a colour literal in src/views/ or a cv() name with no token). */
const MAP=new Map();
let miss=null;
function cv(name){
  let v=MAP.get(name);
  if(v===undefined){ v=getComputedStyle(document.documentElement).getPropertyValue('--cv-'+name).trim();
    if(v) MAP.set(name,v); else { if(!miss) miss=new Set(); if(!miss.has(name)){ miss.add(name); console.warn(`[palette] no token --cv-${name} in tokens.css`); } } }
  return v||'';
}
/* the role colours by role key (ld solo, ch chords, bs bass, dr drums) — the ONE role palette (different lightness, AR2) */
const ROLE_COL={ get ld(){ return cv('role-ld'); }, get ch(){ return cv('role-ch'); }, get bs(){ return cv('role-bs'); }, get dr(){ return cv('role-dr'); } };
const noRoleCol=()=>cv('lane-norole');
export { cv, ROLE_COL, noRoleCol };
