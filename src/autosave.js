/* AUTOSAVE1 (RUN 3, 2026-10-16) — THE CURRENT SONG KEPT ON THIS DEVICE BY ITSELF. No DOM (ui.js shows the offer, the list, the setting).
   ⛳ Local only (rule #33): IndexedDB database 'handsong-songs' (separate from the user tunings, so the scale loader never sees it), store
   'auto', one entry per SONG (key = the song record's id), value { id, name, at, tracks, events, ms, text } — `text` is exactly what
   Save writes (song/file.js songData → JSON), so a restore is an Open of that text with every check of SAVE1. The newest AS_KEEP 5 songs
   are kept (trimmed in the same transaction as the write — a crash leaves the previous version readable). Frozen audio is not stored.
   WHEN: a poll every AS.pollMs reads the song's key (the one history's hash + the song settings); a write happens once the key has stood
   still AS.settleMs, at most every AS.gapMs, in an idle moment (requestIdleCallback), and NEVER while recording, while a render/freeze
   runs, while a clip records, while a probe holds the lock, or — for a song whose last save took longer than AS.playMs — while the
   transport plays. An empty song is never written (✕ cannot wipe an autosave); the next material after an empty song is a NEW song.
   A probe's test song (P.seed, P.song) is not autosaved ('probe-song' hold) until it is cleared or another song is opened.
   The setting «Autosave: on/off» (default ON, user decision 2026-10-16) persists in the language store (localStorage). */
import { store } from './i18n.js';
import { hooks } from './hooks.js';
import { AC } from './audio.js';
import { activeKind } from './clip.js';
import { events, recording, loop, histHash } from './recorder.js';
import { songData } from './song/file.js';
import { ENV } from './song/env.js';
import { newUserId } from './core/registry.js';

const AS={ pollMs:1000, settleMs:2500, gapMs:8000, playMs:40, idleMs:3000 };
const AS_KEEP=5, OS='auto', SET_KEY='handsong.autosave';
let DB_NAME='handsong-songs';
/* ui wiring: the song's id and name as the Song file section knows them, and a status callback (status, info) */
let W={ meta:()=>({ id:null, name:'' }), setId:()=>{}, said:()=>{} };
const asWire=o=>{ W={ ...W, ...o }; };

/* ── storage ── */
let dbP=null;
let DBG={};   // probe only: { fail:'quota'|'blocked', silent, ignoreOff, noTrim }
const errKind=e=>{ const n=e&&e.name||''; return /Quota/i.test(n) ? 'full' : /Security|InvalidState|NotAllowed|Unknown|Version/i.test(n) ? 'blocked' : 'error'; };
function openDB(){
  if(DBG.fail==='blocked') return Promise.reject(Object.assign(new Error('storage blocked (probe)'),{ name:'SecurityError' }));
  if(dbP) return dbP;
  dbP=new Promise((res,rej)=>{
    try{
      if(typeof indexedDB==='undefined') return rej(Object.assign(new Error('no IndexedDB'),{ name:'SecurityError' }));
      const rq=indexedDB.open(DB_NAME,1);
      rq.onupgradeneeded=()=>{ rq.result.createObjectStore(OS,{ keyPath:'id' }); };
      rq.onsuccess=()=>res(rq.result);
      rq.onerror=()=>rej(rq.error||Object.assign(new Error('open failed'),{ name:'UnknownError' }));
      rq.onblocked=()=>rej(Object.assign(new Error('open blocked'),{ name:'InvalidStateError' }));
    }catch(e){ rej(e); }
  });
  dbP.catch(()=>{ dbP=null; });   // a failed open is retried at the next write
  return dbP;
}
const byNewest=(a,b)=>(a.at<b.at?1:a.at>b.at?-1:0);
/* one transaction: put the entry, then drop everything past the newest AS_KEEP */
async function asPut(entry){
  const db=await openDB();
  if(DBG.fail==='quota') throw Object.assign(new Error('quota (probe)'),{ name:'QuotaExceededError' });
  return new Promise((res,rej)=>{ const tx=db.transaction(OS,'readwrite'), os=tx.objectStore(OS);
    os.put(entry);
    if(!DBG.noTrim){ const all=os.getAll(); all.onsuccess=()=>{ for(const e of (all.result||[]).sort(byNewest).slice(AS_KEEP)) os.delete(e.id); }; }
    tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error); });
}
/* the list, newest first, without the texts (for the menu) */
async function asList(){
  const db=await openDB();
  return new Promise((res,rej)=>{ const rq=db.transaction(OS,'readonly').objectStore(OS).getAll();
    rq.onsuccess=()=>res((rq.result||[]).sort(byNewest).map(({ text, ...m })=>m)); rq.onerror=()=>rej(rq.error); });
}
async function asGet(id){
  const db=await openDB();
  return new Promise((res,rej)=>{ const rq=db.transaction(OS,'readonly').objectStore(OS).get(id); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error); });
}

/* ── the setting ── */
const asEnabled=()=>{ try{ return store.get(SET_KEY)!=='0'; }catch(e){ return true; } };
function asSetEnabled(on){ try{ store.set(SET_KEY, on?'1':'0'); }catch(e){} st.status= on ? 'idle' : 'off'; W.said(st.status, asInfo()); }

/* ── the scheduler ── */
const st={ key:null, keyT:0, savedKey:null, lastT:-1e9, lastMs:0, lastAt:null, slot:null, emptySeen:true, inFlight:false, status:'idle', err:null, n:0, persisted:false };
const paused=new Set();
const asPause=(who,on)=>{ if(on) paused.add(who); else paused.delete(who); };
const keyNow=()=>histHash()+'|'+JSON.stringify(ENV.songEnv());
const busy=()=> recording || !!activeKind() || !!(hooks.renderBusy && hooks.renderBusy()) || (loop.on && st.lastMs>AS.playMs);
/* the song's id for its entry: the Song file section's id (a saved or opened file), else this session's own (handed to ui so a later
   Save writes the same id) */
function slotId(){ const m=W.meta(); if(m.id) return m.id; if(!st.slot){ st.slot=newUserId(); W.setId(st.slot); } return st.slot; }
/* one step of the scheduler at time `now` (ms). → what it did: 'off' 'paused' 'audio' 'empty' 'busy' 'settling' 'same' 'wait' 'write' */
function asTick(now=performance.now(), opt={}){
  if(!asEnabled() && !DBG.ignoreOff) return 'off';
  if(!events.length){ st.emptySeen=true; paused.delete('probe-song'); return 'empty'; }   // a probe's test song is gone → autosave as usual
  if(paused.size && !opt.probe) return 'paused';
  if(!AC) return 'audio';
  if(st.emptySeen){ st.emptySeen=false; if(st.savedKey!=null){ st.slot=null; W.setId(null); st.savedKey=null; } }   // material after an empty song = a new song
  if(st.inFlight) return 'busy';
  if(busy()) return 'busy';
  const k=keyNow();
  if(k!==st.key){ st.key=k; st.keyT=now; return 'settling'; }
  if(k===st.savedKey) return 'same';
  if(now-st.keyT<AS.settleMs || now-st.lastT<AS.gapMs) return 'wait';
  st.lastT=now; st.inFlight=true;
  const go=()=>asWrite(k).finally(()=>{ st.inFlight=false; });
  if(opt.sync) return go().then(()=>'write');
  if(typeof requestIdleCallback==='function') requestIdleCallback(()=>{ go(); }, { timeout:AS.idleMs }); else setTimeout(()=>{ go(); }, 0);
  return 'write';
}
async function asWrite(k){
  if(recording || events.length===0 || keyNow()!==k) return false;   // something moved between the decision and the idle moment
  const t0=performance.now(), m=W.meta(), id=slotId();
  let text, rec;
  try{ rec=songData({ id, name:m.name||'' }); text=JSON.stringify(rec); }catch(e){ st.status='error'; st.err=String(e&&e.message||e); W.said('error', asInfo()); return false; }
  st.lastMs=performance.now()-t0;
  const entry={ id, name:rec.name, at:rec.saved, tracks:rec.tracks.length, events:rec.events.length, ms:Math.round(st.lastMs), text };
  try{ await asPut(entry); }
  catch(e){ st.err=String(e&&e.message||e); const kind=errKind(e); const first=st.status!==kind; st.status=kind; if(!DBG.silent) W.said(kind, asInfo(), first); return false; }
  st.savedKey=k; st.lastAt=entry.at; st.n++; st.err=null; const was=st.status; st.status='ok'; W.said('ok', asInfo(), was!=='ok');
  if(!st.persisted && navigator.storage && navigator.storage.persist){ st.persisted=true; navigator.storage.persist().catch(()=>{}); }   // once: ask the browser not to evict it
  return true;
}
/* the song now on screen IS the autosave (after a restore or a fresh open): no write until it changes */
function asAdopt(){ paused.delete('probe-song'); st.key=st.savedKey= events.length ? keyNow() : null; st.keyT=performance.now(); st.emptySeen=!events.length; st.slot=null; }
/* the person declined «Continue»: this session's song is a new one (the offered entry stays as it was) */
function asFresh(){ st.slot=null; st.savedKey=null; W.setId(null); }
/* leaving the page with unsaved changes: one best-effort write (not while recording) */
function asFlush(){ if(!asEnabled() || recording || !AC || !events.length || st.inFlight) return; const k=keyNow(); if(k!==st.savedKey) asWrite(k); }
const asInfo=()=>({ status:st.status, err:st.err, lastAt:st.lastAt, lastMs:Math.round(st.lastMs), n:st.n, enabled:asEnabled(),
  pending: !!events.length && keyNow()!==st.savedKey, paused:[...paused], db:DB_NAME });
let timer=0;
function asStart(){ if(timer) return; timer=setInterval(()=>{ try{ asTick(); }catch(e){ console.warn('[autosave]', e); } }, AS.pollMs);
  addEventListener('pagehide', asFlush); document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') asFlush(); }); }
/* probe only: faults and a separate database (the person's own autosaves are never touched by a probe) */
async function asDbg(o){
  const next=o||{}, db=next.db||'handsong-songs';
  if(db!==DB_NAME){ if(dbP){ try{ (await dbP).close(); }catch(e){} } dbP=null; DB_NAME=db;   // another store: its scheduler state starts over
    Object.assign(st,{ key:null, keyT:0, savedKey:null, lastT:-1e9, lastAt:null, slot:null, n:0 }); }
  DBG=next; if(!next.keep){ st.status=asEnabled()?'idle':'off'; st.err=null; }
}
const asDbgState=()=>({ ...st });
async function asDrop(name){ if(dbP && name===DB_NAME){ try{ (await dbP).close(); }catch(e){} dbP=null; }
  await new Promise(r=>{ try{ const q=indexedDB.deleteDatabase(name); q.onsuccess=q.onerror=q.onblocked=()=>r(); }catch(e){ r(); } }); }

export { AS, AS_KEEP, asPut, asWire, asStart, asTick, asWrite, asAdopt, asFresh, asFlush, asInfo, asList, asGet, asEnabled, asSetEnabled, asPause, asDbg, asDbgState, asDrop };
