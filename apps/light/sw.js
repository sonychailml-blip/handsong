/* LIGHT-10 — LIGHT'S PRECACHE (the founder: Handsong opens without the internet; Night's way, apps/night/sw.js NIGHT-14, Light's own copy). In the
   repository PRECACHE is null: nothing is cached, every request goes to the network. tools/build.mjs writes a build's list here (tools/precache.mjs):
   the version (a hash of the list) and every file [path from the scope, SHA-256, bytes, group, stage]; stage 0 = what Light needs to START, 1 = later
   (the install icons). The page registers this worker only AFTER the start (apps/light/update.js), so the first visit's loading is never slowed; most
   files then come from the browser's own copy (the page fetched them a moment ago), each checked against its hash.
   - install: the start files into «handsong-light-precache-<version>», POOL at a time; a file already there with its hash is kept (an install cut
     short goes on next visit), one an older version holds with the same hash is copied (an update downloads only what changed); a file that does not
     match fails the install and the running version stays (never old and new mixed). MediaPipe's two builds (group simd / nosimd): only the pair this
     browser runs. With no running version the new one takes over at once; otherwise it WAITS for the page's word («A new version is ready», update.js)
     or until every page of the old version is closed.
   - top-up: at the page's word (every visit) every listed file still missing is fetched and checked; a mismatch is left to the network.
   - fetch: a GET of a listed file (the search ignored) and a navigation to the page come from the cache; everything else goes to the network.
   - activate: older precaches are deleted; a build without the list clears every precache of this app (the way back). */
const PRECACHE=null;
const PREFIX='handsong-light-precache-', POOL=6;
const NAME=PRECACHE ? PREFIX+PRECACHE.version : null;
const SCOPE=self.registration.scope;
const FILES=PRECACHE ? PRECACHE.files : [];
const LIST=new Map(FILES.map(f=>[f[0], f]));
const simd=(()=>{ try{ return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); }catch(e){ return false; } })();
const wanted=f=>!(f[3]==='simd' && !simd) && !(f[3]==='nosimd' && simd);
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
/* the browser's own copy first, then the network ('reload'); the bytes must match the list */
async function fetchChecked(url, f){
  for(const mode of ['force-cache', 'reload']){
    const r=await fetch(url, { cache:mode });
    if(!r.ok) throw new Error(r.status+' '+f[0]);
    const body=await r.arrayBuffer();
    if(hex(await crypto.subtle.digest('SHA-256', body))===f[1]) return new Response(body, { headers:{ 'content-type':r.headers.get('content-type')||'application/octet-stream', 'x-handsong-sha256':f[1] } });
  }
  throw new Error('a file does not match this version: '+f[0]);
}
/* every wanted file into this version's cache, POOL at a time: kept, copied from an older precache, or downloaded and checked. strict: the first
   failure fails the whole fill; otherwise failed files are skipped and returned */
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
const topUp=()=>topping || (topping=fill(FILES, { strict:false }).catch(()=>[]).finally(()=>{ topping=null; }));
self.addEventListener('install', e=>{ if(!PRECACHE){ self.skipWaiting(); return; }
  e.waitUntil((async ()=>{
    await fill(FILES.filter(f=>!f[4]));                                 // what Light needs to start: without it the install fails
    await fill(FILES.filter(f=>f[4]), { fetch:false, strict:false });   // the later files an older version already has
    if(!self.registration.active) await self.skipWaiting();             // nothing runs an older version: take over at once
  })()); });
self.addEventListener('activate', e=>e.waitUntil((async ()=>{
  for(const k of await caches.keys()) if(k.startsWith(PREFIX) && k!==NAME) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('message', e=>{ const t=e.data && e.data.type;
  if(t==='handsong-light-update') self.skipWaiting();
  else if(t==='handsong-light-topup' && PRECACHE) e.waitUntil(topUp()); });
self.addEventListener('fetch', e=>{
  if(!PRECACHE) return;   // no list: the network
  const q=e.request; if(q.method!=='GET' || q.headers.has('range')) return;
  const u=new URL(q.url); if(!u.href.startsWith(SCOPE)) return;
  let p=decodeURIComponent(u.pathname.slice(new URL(SCOPE).pathname.length));
  if(q.mode==='navigate'){ if(p!=='' && p!=='index.html') return; p='index.html'; }
  const f=LIST.get(p); if(!f || !wanted(f)) return;
  e.respondWith(caches.open(NAME).then(async c=>(await c.match(new URL(p, SCOPE).href)) || fetch(q)));
});
