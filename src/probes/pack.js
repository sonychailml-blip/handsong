/* PACK1 (RUN 3, 2026-10-16): packs and offline licence keys IN THE PAGE (Chrome's WebCrypto — the node row «PACK1 packs and licence keys
   (core)» checks the same code in node): the committed TEST keys (tools/pack-test-licence.json, own origin) verify against the shipped
   public key; a tampered key, a key for another pack and an expired key are refused; the gate opens the pack's records in a registry only
   with the right key. No network beyond reading that file from the own origin (rule #33). CONTROL: the untampered key must pass. */
import { row } from './rows.js';
import { keyVerify, createPackGate, packUnlock } from '../core/pack.js';
import { createRegistry } from '../core/registry.js';

export async function checkPack(){
  const d=[]; let n=0; const eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(`${what}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
  let F; try{ F=await (await fetch('tools/pack-test-licence.json',{ cache:'no-store' })).json(); }
  catch(e){ return { cases:0, total:1, differences:[`no fixture tools/pack-test-licence.json (${e&&e.message})`] }; }
  const today='2026-10-16';
  eq('the test key verifies in the page (CONTROL: a valid key passes)', (await keyVerify(F.key,{ today })).ok, true);
  const [h,p,s]=F.key.split('.');
  eq('a tampered signature is refused', (await keyVerify(`${h}.${p}.${(s[0]==='A'?'B':'A')+s.slice(1)}`,{ today })).why, 'signature');
  eq('a tampered payload is refused', (await keyVerify(`${h}.${(p[5]==='A'?'B':'A')+p.slice(0,5)+p.slice(6)}.${s}`,{ today })).ok, false);
  eq('an expired key is refused', (await keyVerify(F.expiredKey,{ today })).why, 'expired');
  const G=createPackGate(), R=createRegistry('timbre',{ gate:G }); R.add({ id:'test-pack/glass-bell' });
  eq('locked before the key', R.isLocked('test-pack/glass-bell'), true);
  eq('a key for another pack does not open it', (await packUnlock(G, F.pack, F.otherPackKey,{ today })).why, 'wrongPack');
  eq('the right key opens it', [(await packUnlock(G, F.pack, F.key,{ today })).ok, R.order()], [true, ['test-pack/glass-bell']]);
  return { cases:n, total:d.length, differences:d };
}
row({ at:999, name:'PACK1 licence keys in the page', run:()=>checkPack(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
