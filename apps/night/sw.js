/* NIGHT-14 — NIGHT'S PRECACHE. In the repository PRECACHE is null and this worker does what the old one did: nothing is cached, every request goes
   to the network (it exists so the app is installable). tools/build.mjs writes the build's list into PRECACHE (tools/precache.mjs): the version (a
   hash of the list) and every file [path from the scope, SHA-256, bytes, group, stage], stage 0 (what Night needs to START) first. Then:
   - install: the START files into the cache «handsong-night-precache-<version>», POOL at a time (NIGHT-14b: one at a time took minutes on a phone);
     a file this cache already holds with its hash is kept (an install cut short — the tab closed, the network gone — goes on from there next visit,
     nothing downloaded twice); one an older cache holds with the same hash is copied (an update downloads only what changed); every fetched file is
     checked against its hash (once more with cache 'reload', then the install fails and the running version stays: never a mix of old and new
     files). The later files an older cache already holds are copied too (never lost when it is deleted). Group 'simd' / 'nosimd' (MediaPipe's two
     builds): only the pair this browser runs. With no running version the new one takes over at once; otherwise it WAITS until every page of the
     old version is gone, or until the page asks (the «A new version is ready» line: apps/night/update.js).
   - top-up (NIGHT-14b): once in control, at the page's word (update.js, every visit), every listed file still missing is fetched and checked the
     same way; a file that does not match is left out (asked of the network if ever needed), never cached.
   - fetch: a GET of a listed file (the search ignored) and a navigation to the page come from the cache; everything else goes to the network.
   - activate: older precaches are deleted. A build without the list (PRECACHE null) clears every precache of this app: the way back. */
const PRECACHE=null;
const PREFIX='handsong-night-precache-', POOL=6;
const NAME=PRECACHE ? PREFIX+PRECACHE.version : null;
const SCOPE=self.registration.scope;
const FILES=PRECACHE ? PRECACHE.files : [];
const LIST=new Map(FILES.map(f=>[f[0], f]));
const simd=(()=>{ try{ return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); }catch(e){ return false; } })();
const wanted=f=>!(f[3]==='simd' && !simd) && !(f[3]==='nosimd' && simd);
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
/* NIGHT-14b: the browser's own copy first — the page fetched most of these a moment ago, and asking the network again cost a round trip per file
   (minutes on a phone); a stale or foreign copy fails the hash and the file comes from the network ('reload') */
async function fetchChecked(url, f){
  for(const mode of ['force-cache', 'reload']){
    const r=await fetch(url, { cache:mode });
    if(!r.ok) throw new Error(r.status+' '+f[0]);
    const body=await r.arrayBuffer();
    if(hex(await crypto.subtle.digest('SHA-256', body))===f[1]) return new Response(body, { headers:{ 'content-type':r.headers.get('content-type')||'application/octet-stream', 'x-handsong-sha256':f[1], 'x-handsong-at':String(Date.now()) } });   // at: when it was downloaded (the smoke test's proof that a resumed install keeps what it had)
  }
  throw new Error('a file does not match this version: '+f[0]);
}
/* every wanted file of `files` into this version's cache, POOL at a time, in list order: kept if there with its hash, else copied from an older
   precache, else (fetch) downloaded and checked. strict: the first failure fails the whole fill; otherwise a failed file is skipped → failures */
async function fill(files, { fetch:get=true, strict=true }={}){
  const c=await caches.open(NAME), olds=await Promise.all((await caches.keys()).filter(k=>k.startsWith(PREFIX) && k!==NAME).map(k=>caches.open(k)));
  const todo=files.filter(wanted), failed=[]; let i=0, err=null;
  const one=async f=>{ const url=new URL(f[0], SCOPE).href, same=r=>!!r && r.headers.get('x-handsong-sha256')===f[1];
    if(same(await c.match(url))) return;
    for(const o of olds){ const r=await o.match(url); if(same(r)){ await c.put(url, r); return; } }
    if(get) await c.put(url, await fetchChecked(url, f)); };
  await Promise.all(Array.from({ length:POOL }, async ()=>{ while(i<todo.length && !err){ const f=todo[i++]; try{ await one(f); }catch(e){ if(strict) err=e; else failed.push(f[0]); } } }));
  if(err) throw err;
  return failed;
}
let topping=null;
/* NIGHT-14c: a top-up that leaves nothing missing tells the pages ('handsong-night-files-in': a held Detailed may come back, scene/host.js) */
const topUp=()=>topping || (topping=fill(FILES, { strict:false }).then(async failed=>{ if(!failed.length) for(const c of await self.clients.matchAll({ type:'window' })) c.postMessage({ type:'handsong-night-files-in' }); return failed; })
  .catch(()=>[]).finally(()=>{ topping=null; }));
self.addEventListener('install', e=>{ if(!PRECACHE){ self.skipWaiting(); return; }
  e.waitUntil((async ()=>{
    await fill(FILES.filter(f=>!f[4]));                          // what Night needs to start: without it the install fails
    await fill(FILES.filter(f=>f[4]), { fetch:false, strict:false });   // the later files an older version already has
    if(!self.registration.active) await self.skipWaiting();      // nothing runs an older version: take over at once
  })()); });
self.addEventListener('activate', e=>e.waitUntil((async ()=>{
  for(const k of await caches.keys()) if(k.startsWith(PREFIX) && k!==NAME) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('message', e=>{ const t=e.data && e.data.type;
  if(t==='handsong-night-update') self.skipWaiting();
  else if(t==='handsong-night-topup' && PRECACHE) e.waitUntil(topUp()); });
self.addEventListener('fetch', e=>{
  if(!PRECACHE) return;   // no list: the network, as before
  const q=e.request; if(q.method!=='GET' || q.headers.has('range')) return;
  const u=new URL(q.url); if(!u.href.startsWith(SCOPE)) return;
  let p=decodeURIComponent(u.pathname.slice(new URL(SCOPE).pathname.length));
  if(q.mode==='navigate'){ if(p!=='' && p!=='index.html') return; p='index.html'; }
  const f=LIST.get(p); if(!f || !wanted(f)) return;
  e.respondWith(caches.open(NAME).then(c=>c.match(new URL(p, SCOPE).href)).then(r=>r || fetch(q)));
});
