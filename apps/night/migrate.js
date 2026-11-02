/* SPLIT-2: one-time move of this app's old setting names, on one origin only (plan §5.3). The FIRST import of main.js: the shell reads its keys while it loads. Safe on every start.
   Delete after the first public release: this file holds the only surviving old name. */
export const OLD_PREFIX='handsong.calm', NEW_PREFIX='handsong.night', SUFFIXES=Object.freeze(['Bg','Lantern','Field','Forest','Seen','FxHint','Joints','Light','LightScene']);
export function migrateKeys(store){
  for(const s of SUFFIXES){
    try{ const v=store.getItem(OLD_PREFIX+s);
      if(v!==null){ if(store.getItem(NEW_PREFIX+s)===null) store.setItem(NEW_PREFIX+s, v); store.removeItem(OLD_PREFIX+s); }
    }catch(e){ /* a private window: nothing to move */ }
  }
}
try{ migrateKeys(localStorage); }catch(e){ /* storage blocked */ }
