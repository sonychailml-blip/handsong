/* PACK1 (RUN 3, 2026-10-16; stage-3 plan slice 33; user decision: build it now, no UI) — PACKS AND OFFLINE LICENCE KEYS. Pure core: no
   DOM, no Web Audio, NO NETWORK (rule #33) — only the platform's WebCrypto (browser and node). Provider-agnostic: whichever payment provider
   is chosen later only DELIVERS a key text; the app checks it offline against the public key it carries. No accounts.
   ⛳ A PACK (`handsong/pack` v1): { format, version, id (kebab-case, permanent — rule #37), name, licence (true: needs a key), items:[{ kind,
   id:'<pack>/<name>' }] } — every item's id lives in the pack id space (core/registry PACK_ID) under its own pack.
   ⛳ A LICENCE KEY: «HS1.<payload>.<signature>», both base64url; payload = JSON { v (key format, 1), kid (which public key), pack (the pack
   id), key (a random id of this key), issued (YYYY-MM-DD), until? (YYYY-MM-DD) } — no personal data; signature = ECDSA P-256 / SHA-256 over
   the payload's base64url text (WebCrypto's raw r‖s, 64 bytes). Refusals in words: malformed, format (a key format this app does not read),
   unknownKey, signature (tampered or another issuer), expired, wrongPack.
   ⛳ THE GATE: a registry record whose id is in the pack space is usable only while its pack is unlocked (core/registry createRegistry
   { gate }); a free pack (licence:false) unlocks without a key. Keys: only the TEST pair today (its private half in tools/, never in src/). */
const PACK_FORMAT='handsong/pack', PACK_VERSION=1, KEY_PREFIX='HS1', KEY_FORMAT=1;
const PACK_NAME=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ITEM_ID=/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:[-.][a-z0-9]+)*$/;   // = core/registry PACK_ID
const DATE=/^\d{4}-\d{2}-\d{2}$/;
/* the app's public keys (SPKI, base64) by key id — 'test': the TEST pair (tools/pack-keygen.mjs); a production key is added beside it */
const PACK_PUBKEYS=Object.freeze({
  test:'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEqHdVnZdP/sLqhM9q9FmWkpxGSE2pnuZ7AGU4cqZVcCc1IDvK556B968PqWszC+Zr9rZN7yUv0J7sSs3pHXHGgQ==',
});
const isObj=x=>x!==null && typeof x==='object' && !Array.isArray(x);

/* ---- the pack record: a strict check → a list of problems (empty = fine); a newer version is refused in words ---- */
function packCheck(r){
  const P=[]; const need=(c,m)=>{ if(!c) P.push(m); return c; };
  if(!need(isObj(r),'not an object')) return P;
  need(r.format===PACK_FORMAT,'format');
  if(Number.isInteger(r.version) && r.version>PACK_VERSION){ P.push(`made for a newer Handsong (pack version ${r.version})`); return P; }
  need(r.version===PACK_VERSION,'version');
  need(typeof r.id==='string' && PACK_NAME.test(r.id) && r.id.length<=64,'id');
  need(isObj(r.name) || typeof r.name==='string','name');
  need(typeof r.licence==='boolean','licence');
  const seen=new Set();
  if(need(Array.isArray(r.items) && r.items.length<=10000,'items')) r.items.forEach((x,i)=>{
    need(isObj(x) && typeof x.kind==='string' && /^[a-z]+$/.test(x.kind) && typeof x.id==='string' && ITEM_ID.test(x.id)
      && x.id.split('/')[0]===r.id && !seen.has(x.id), `item ${i}: a ${'<pack>/<name>'} id of this pack, once`); seen.add(x&&x.id); });
  return P;
}

/* ---- base64url ---- */
const b64uEnc=bytes=>{ let s=''; for(const b of bytes) s+=String.fromCharCode(b); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); };
const b64uDec=t=>{ if(typeof t!=='string' || !/^[A-Za-z0-9_-]*$/.test(t)) return null; const s=atob(t.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-t.length%4)%4));
  const u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; };
const b64Dec=t=>{ const s=atob(t), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; };
const utf8=s=>new TextEncoder().encode(s);
const ALG={ name:'ECDSA', hash:'SHA-256' };

/* ---- signing (tools and probes only: the app never holds a private key) ---- */
async function keySign(payload, privateKey){
  const p=b64uEnc(utf8(JSON.stringify(payload)));
  const sig=new Uint8Array(await crypto.subtle.sign(ALG, privateKey, utf8(p)));
  return `${KEY_PREFIX}.${p}.${b64uEnc(sig)}`;
}
/* ---- verifying a key text offline → { ok:true, pack, key, kid, issued, until } | { ok:false, why } ----
   opts.pubkeys — another key table (probes); opts.today — 'YYYY-MM-DD' (probes; default the device's date) */
async function keyVerify(text, opts={}){
  const pubkeys=opts.pubkeys||PACK_PUBKEYS, today=opts.today||new Date().toISOString().slice(0,10);
  if(typeof text!=='string' || text.length>4096) return { ok:false, why:'malformed' };
  const parts=text.trim().split('.');
  if(parts.length!==3) return { ok:false, why:'malformed' };
  if(parts[0]!==KEY_PREFIX) return { ok:false, why: /^HS\d+$/.test(parts[0]) ? 'format' : 'malformed' };   // another key generation: say so
  const pb=b64uDec(parts[1]), sb=b64uDec(parts[2]); if(!pb || !sb || sb.length!==64) return { ok:false, why:'malformed' };
  let P; try{ P=JSON.parse(new TextDecoder().decode(pb)); }catch(e){ return { ok:false, why:'malformed' }; }
  if(!isObj(P)) return { ok:false, why:'malformed' };
  if(P.v!==KEY_FORMAT) return { ok:false, why:'format', v:P.v };
  if(typeof P.kid!=='string' || !Object.prototype.hasOwnProperty.call(pubkeys, P.kid)) return { ok:false, why:'unknownKey' };
  if(typeof P.pack!=='string' || !PACK_NAME.test(P.pack) || typeof P.key!=='string' || !DATE.test(P.issued||'') || (P.until!==undefined && !DATE.test(P.until)))
    return { ok:false, why:'malformed' };
  let pub; try{ pub=await crypto.subtle.importKey('spki', b64Dec(pubkeys[P.kid]), { name:'ECDSA', namedCurve:'P-256' }, false, ['verify']); }
  catch(e){ return { ok:false, why:'unknownKey' }; }
  const good=await crypto.subtle.verify(ALG, pub, sb, utf8(parts[1]));
  if(!good) return { ok:false, why:'signature' };
  if(P.until && P.until<today) return { ok:false, why:'expired', until:P.until };
  return { ok:true, pack:P.pack, key:P.key, kid:P.kid, issued:P.issued, until:P.until };
}

/* ---- the gate ---- */
function createPackGate(){
  const open=new Set();
  return {
    unlocked:packId=>open.has(packId),
    /* a registry asks: may this record be used? Built-in and user records always; a pack record while its pack is unlocked */
    usable:id=>{ if(typeof id!=='string' || !ITEM_ID.test(id)) return true; return open.has(id.split('/')[0]); },
    packs:()=>[...open],
    lock:packId=>{ open.delete(packId); },
    _open:packId=>{ open.add(packId); },   // packUnlock only
  };
}
/* unlock a checked pack: a free pack directly, a licensed one with a key for THIS pack → { ok } | { ok:false, why } */
async function packUnlock(gate, pack, keyText, opts){
  const probs=packCheck(pack); if(probs.length) return { ok:false, why:'pack', problems:probs };
  if(!pack.licence){ gate._open(pack.id); return { ok:true, free:true }; }
  const v=await keyVerify(keyText, opts); if(!v.ok) return v;
  if(v.pack!==pack.id) return { ok:false, why:'wrongPack', pack:v.pack };
  gate._open(pack.id); return { ok:true, key:v.key };
}
export { PACK_FORMAT, PACK_VERSION, KEY_PREFIX, KEY_FORMAT, PACK_PUBKEYS, packCheck, keySign, keyVerify, createPackGate, packUnlock };
