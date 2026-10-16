/* FMT1 (stage 3) — PERMANENT IDS AND A REGISTRY OF RECORDS (timbres, tunings, modes, effect presets, expression mappings … as they arrive).
   ⛳ The user's model (2026-10-16): IDENTITY ≠ NAME ≠ POSITION. An id never changes — a built-in has a readable fixed id (kebab-case,
   dotted families allowed: «firefly», «solo.supersaw»), a user record a generated «u.<uuid>», a pack record «<pack>/<name>». The display
   name is data (per language) and may change; the ORDER of a list is a separate per-user list of ids — reordering, hiding or deleting
   never touches a song. A built-in is HIDDEN, never destroyed (songs that use it always play); a user record may be removed. A song keeps
   the id AND a copy of the record, so a missing id (deleted, another person's) still plays from the copy (SONG1 — not here).
   Pure core: no DOM, no Web Audio, no network — runs in node (row «FMT1 format + registry (core)»). */
const USER_ID=/^u\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;   // moved from scaleload.js (F6)
const BUILTIN_ID=/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const PACK_ID=/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:[-.][a-z0-9]+)*$/;
/* which id space an id belongs to: 'user' | 'pack' | 'builtin' | null (not a valid id) */
const idSpace=id=> typeof id!=='string' ? null : USER_ID.test(id) ? 'user' : id.slice(0,2)==='u.' ? null : PACK_ID.test(id) ? 'pack' : BUILTIN_ID.test(id) ? 'builtin' : null;   // «u.» is reserved for user ids
/* a fresh user id; rnd (optional) = a source of 16 random bytes for tests — by default the platform's crypto */
function newUserId(rnd){
  if(!rnd && globalThis.crypto && crypto.randomUUID) return 'u.'+crypto.randomUUID();
  const b=rnd ? rnd() : crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&0x0f)|0x40; b[8]=(b[8]&0x3f)|0x80;
  const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `u.${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
/* A registry of one kind. add(rec) — rec.id must be valid and new; a built-in is marked {builtin:true}. hide/show — any record (a built-in
   can only be hidden); remove — user and pack records only (a built-in refuses: hide it). rename — the name only. order() — the visible
   ids in the person's order (setOrder keeps unknown ids out and appends what the list does not name, in the order they were added).
   → each change answers null (done) or a refusal in words. */
/* PACK1: opts.gate (core/pack createPackGate) — a record in the pack id space is usable only while its pack is unlocked: order() leaves
   locked ones out, isLocked(id) says so; get() still answers (a song that names it plays from its copy — rule #37). */
function createRegistry(kind, { gate=null }={}){
  const byId=new Map(), hidden=new Set(); let order=[];
  const usable=id=> !gate || gate.usable(id);
  const why=(c,w)=> c ? null : w;
  return {
    kind,
    add(rec, { builtin=false }={}){
      const id=rec && rec.id, sp=idSpace(id);
      if(!sp) return `«${id}» is not a valid ${kind} id`;
      if(builtin && sp!=='builtin') return `a built-in ${kind} needs a readable fixed id (got «${id}»)`;
      if(!builtin && sp==='builtin') return `«${id}» is a built-in id — a user ${kind} gets u.<uuid>`;
      if(byId.has(id)) return `the ${kind} id «${id}» is already used`;
      byId.set(id, { rec, builtin }); order.push(id); return null;
    },
    get:id=> byId.has(id) ? byId.get(id).rec : null,
    has:id=> byId.has(id),
    isBuiltin:id=> !!(byId.get(id)||{}).builtin,
    isHidden:id=> hidden.has(id),
    hide(id){ const e=why(byId.has(id), `no ${kind} «${id}»`); if(!e) hidden.add(id); return e; },
    show(id){ const e=why(byId.has(id), `no ${kind} «${id}»`); if(!e) hidden.delete(id); return e; },
    remove(id){
      if(!byId.has(id)) return `no ${kind} «${id}»`;
      if(byId.get(id).builtin) return `a built-in ${kind} is never removed — hide it instead`;
      byId.delete(id); hidden.delete(id); order=order.filter(x=>x!==id); return null;
    },
    rename(id, name){ const e=why(byId.has(id), `no ${kind} «${id}»`); if(!e) byId.get(id).rec={ ...byId.get(id).rec, name }; return e; },
    setOrder(ids){ const want=(ids||[]).filter((x,i,a)=>byId.has(x) && a.indexOf(x)===i); order=[...want, ...order.filter(x=>!want.includes(x))]; return null; },
    order:()=> order.filter(id=>!hidden.has(id) && usable(id)),
    isLocked:id=> byId.has(id) && !usable(id),
    all:()=> [...order],
  };
}
export { USER_ID, BUILTIN_ID, PACK_ID, idSpace, newUserId, createRegistry };
