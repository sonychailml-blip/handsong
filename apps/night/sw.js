/* NIGHT-14 — NIGHT'S PRECACHE. In the repository PRECACHE is null and this worker does what the old one did: nothing is cached, every request goes
   to the network (it exists so the app is installable). tools/build.mjs writes the build's list into PRECACHE (tools/precache.mjs): the version (a
   hash of the list) and every file [path from the scope, SHA-256, bytes, group]. Then:
   - install: every listed file into the cache «handsong-night-precache-<version>», one at a time (MediaPipe's last); a file the old cache holds with the same hash is
     copied from it (an update downloads only what changed); every fetched file is checked against its hash (once more with cache 'reload', then the
     install fails and the old version stays: never a mix of old and new files). Group 'simd' / 'nosimd' (MediaPipe's two builds): only the pair this
     browser runs. The FIRST precache install takes over at once (nothing cached before it); a later one WAITS until every page of the old version is
     gone, or until the page asks (the «A new version is ready» line: apps/night/update.js).
   - fetch: a GET of a listed file (the search ignored) and a navigation to the page come from the cache; everything else goes to the network.
   - activate: older precaches are deleted. A build without the list (PRECACHE null) clears every precache of this app: the way back. */
const PRECACHE=null;
const PREFIX='handsong-night-precache-';
const NAME=PRECACHE ? PREFIX+PRECACHE.version : null;
const SCOPE=self.registration.scope;
const LIST=new Map((PRECACHE ? PRECACHE.files : []).map(f=>[f[0], f]));
const simd=(()=>{ try{ return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); }catch(e){ return false; } })();
const wanted=f=>!(f[3]==='simd' && !simd) && !(f[3]==='nosimd' && simd);
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const vendored=f=>f[0].startsWith('core/vendor/');   // versioned folders, served immutable: the browser's own copy may be taken (still checked against its hash)
async function fetchChecked(url, f){
  for(const mode of vendored(f) ? ['default', 'reload'] : ['no-cache', 'reload']){
    const r=await fetch(url, { cache:mode });
    if(!r.ok) throw new Error(r.status+' '+f[0]);
    const body=await r.arrayBuffer();
    if(hex(await crypto.subtle.digest('SHA-256', body))===f[1]) return new Response(body, { headers:{ 'content-type':r.headers.get('content-type')||'application/octet-stream', 'x-handsong-sha256':f[1] } });
  }
  throw new Error('a file does not match this version: '+f[0]);
}
async function fill(){
  const keys=(await caches.keys()).filter(k=>k.startsWith(PREFIX)), older=keys.filter(k=>k!==NAME), c=await caches.open(NAME);
  /* MediaPipe's files last: on a first visit the page's own early download of the model has usually finished by then (one download, not two) */
  for(const f of [...PRECACHE.files.filter(f=>!vendored(f)), ...PRECACHE.files.filter(vendored)]){
    if(!wanted(f)) continue;
    const url=new URL(f[0], SCOPE).href, same=r=>r && r.headers.get('x-handsong-sha256')===f[1];
    if(same(await c.match(url))) continue;   // an install that stopped half-way goes on from here
    let got=null; for(const k of older){ const r=await (await caches.open(k)).match(url); if(same(r)){ got=r; break; } }
    await c.put(url, got || await fetchChecked(url, f));
  }
  if(!older.length) await self.skipWaiting();   // the first precache: no page runs an older cached version
}
self.addEventListener('install', e=>{ if(!PRECACHE){ self.skipWaiting(); return; } e.waitUntil(fill()); });
self.addEventListener('activate', e=>e.waitUntil((async ()=>{
  for(const k of await caches.keys()) if(k.startsWith(PREFIX) && k!==NAME) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('message', e=>{ if(e.data && e.data.type==='handsong-night-update') self.skipWaiting(); });
self.addEventListener('fetch', e=>{
  if(!PRECACHE) return;   // no list: the network, as before
  const q=e.request; if(q.method!=='GET' || q.headers.has('range')) return;
  const u=new URL(q.url); if(!u.href.startsWith(SCOPE)) return;
  let p=decodeURIComponent(u.pathname.slice(new URL(SCOPE).pathname.length));
  if(q.mode==='navigate'){ if(p!=='' && p!=='index.html') return; p='index.html'; }
  const f=LIST.get(p); if(!f || !wanted(f)) return;
  e.respondWith(caches.open(NAME).then(c=>c.match(new URL(p, SCOPE).href)).then(r=>r || fetch(q)));
});
