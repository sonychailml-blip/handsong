/* CORE-11: THE PAGE'S STORAGE NAMESPACE. Two apps served from one origin (Live Server, one preview host) share localStorage and IndexedDB.
   A page may declare <meta name="handsong-store" content="<ns>">: the shared stores then keep this app's settings and data under names of
   its own, so neither app reads the other's. Absent (Full): every name exactly as before. Device facts stay shared on purpose — the camera
   restore record (rule #34) and the engine benchmark describe the device, not the app. In node (the data runner) there is no page: ''. */
const M=typeof document!=='undefined' && document.querySelector ? document.querySelector('meta[name="handsong-store"]') : null;
const NS=M ? String(M.getAttribute('content')||'') : '';
export const STORE_NS=/^[a-z][a-z0-9-]{0,23}$/.test(NS) ? NS : '';
/* a localStorage key «handsong.x» → «handsong.<ns>.x»; an IndexedDB name «handsong-x» → «handsong-x.<ns>» */
export const nsKey=k=> STORE_NS ? String(k).replace(/^handsong\./, 'handsong.'+STORE_NS+'.') : k;
export const nsDb=n=> STORE_NS ? n+'.'+STORE_NS : n;
