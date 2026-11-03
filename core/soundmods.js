/* CORE-7: THE DOOR FOR AN APP'S SOUND MODULES. An app registers a stateless builder once, before the start; both engine instances
   (audio.js and audio.js?render) import this one module, so the render copy finds what the live engine finds. One module per kind; a page
   that registers nothing (Full) gets nothing built — every node as before. The modules obey rule #38 (static check 13 covers apps/<app>/sound/). */
const KINDS=Object.freeze({
  /* the ambience: build(E, dest, seed) → its object; schedule(E, amb, until); tune(E, amb, root, fifth, when); set(E, amb, on, level, when);
     level — the default level, ahead — seconds scheduled ahead */
  ambience:Object.freeze({ fns:Object.freeze(['build','schedule','tune','set']), nums:Object.freeze(['level','ahead']) }),
});
const MODS=new Map();   // kind → { id, ...mod }
/* → null (registered) or a refusal in words; the same record again is a no-op, another one for a taken kind is refused */
export function soundModAdd(kind, id, mod){
  const K=KINDS[kind]; if(!K) return `no sound module kind «${kind}»`;
  if(typeof id!=='string' || !/^[a-z][\w-]*\.[\w.-]+$/.test(id)) return `«${id}» is not a module id`;
  if(!mod || typeof mod!=='object') return `${kind}: not a module`;
  for(const f of K.fns) if(typeof mod[f]!=='function') return `${kind} ${id}: «${f}» is not a function`;
  for(const n of K.nums) if(typeof mod[n]!=='number' || !Number.isFinite(mod[n])) return `${kind} ${id}: «${n}» is not a number`;
  const had=MODS.get(kind); if(had) return had.id===id && K.fns.every(f=>had[f]===mod[f]) ? null : `${kind}: «${had.id}» is registered already`;
  MODS.set(kind, Object.freeze({ id, ...mod })); return null;
}
export const soundModOf=kind=>MODS.get(kind)||null;
