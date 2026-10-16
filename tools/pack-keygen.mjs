/* PACK1 (RUN 3, 2026-10-16) — dev tool: the TEST key pair for offline licence keys (ECDSA P-256). Dev only, never shipped.
     node tools/pack-keygen.mjs            make tools/.pack-test-key.json (refuses to overwrite) and print the public key for src/core/pack.js
     node tools/pack-keygen.mjs --sign <pack-id> [--until YYYY-MM-DD]   print a TEST licence key for that pack (needs the private key file)
   ⛔ The private key stays in tools/.pack-test-key.json (git-ignored); the app holds only the public half (core/pack.js PACK_PUBKEYS.test).
   A production key pair is made the same way when a payment provider is chosen — its private half lives with the key issuer, never here. */
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), FILE=path.join(ROOT,'tools','.pack-test-key.json');
const argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const { keySign, KEY_FORMAT }=await import(new URL('../src/core/pack.js', import.meta.url).href).catch(()=>({}));
if(argv.includes('--sign')){
  const pack=val('--sign'), until=val('--until'); const J=JSON.parse(await readFile(FILE,'utf8'));
  const priv=await crypto.subtle.importKey('jwk', J.privateJwk, { name:'ECDSA', namedCurve:'P-256' }, false, ['sign']);
  const key=crypto.randomUUID();
  const text=await keySign({ v:KEY_FORMAT, kid:'test', pack, key, issued:new Date().toISOString().slice(0,10), ...(until?{ until }:{}) }, priv);
  console.log(text);
} else {
  try{ await access(FILE); console.log(`${FILE} exists — not overwritten (delete it first to make a new test pair; then re-issue the fixture key)`); process.exit(1); }catch(e){}
  const kp=await crypto.subtle.generateKey({ name:'ECDSA', namedCurve:'P-256' }, true, ['sign','verify']);
  const privateJwk=await crypto.subtle.exportKey('jwk', kp.privateKey), spki=Buffer.from(await crypto.subtle.exportKey('spki', kp.publicKey)).toString('base64');
  await writeFile(FILE, JSON.stringify({ kid:'test', made:new Date().toISOString(), privateJwk, publicSpki:spki }, null, 1)+'\n');
  console.log('test public key (SPKI, base64) for src/core/pack.js PACK_PUBKEYS.test:\n'+spki);
}
