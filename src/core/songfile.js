/* SAVE1 (DAY run 2026-10-16) — THE SONG FILE, pure part: reading a «.handsong» text safely, the version rules of the kind 'song' (FMT1:
   format.js takes SONG_VERSION and SONG_MIGRATIONS from here) and the strict check of a song record. No DOM, no Web Audio, no network —
   runs in node (data row «SAVE1 song file (core)»). Building a record from the live song and installing one: song/file.js + recorder.js.
   ⛳ A file is DATA: JSON.parse only (never eval, never a script, never a URL fetched); size capped before parsing; nesting capped; the keys
   «__proto__», «constructor», «prototype» refused anywhere (an object built from the file must never reach a prototype). */

const SONG_FORMAT='handsong/song';
const SONG_VERSION=7;   // SONG1 (3): + records (copies of the person's own tunings / modes); IDS1 (4): every event's permanent id; (5): every lane point's; TIM3d (6): timbre copies are full timbre RECORDS; CMD1b (7): every track's permanent id
const SONG_MAX_BYTES=8*1024*1024;   // a song of notes, lanes and timbre copies is ~0.1–1 MB; 8 MB leaves room and refuses junk early
const SONG_MAX_DEPTH=24;
const BAD_KEYS=new Set(['__proto__','constructor','prototype']);

/* ⛳ TIM2 migration data, FROZEN: the timbre ids at their list POSITIONS as of TIM1 (2026-10-16). A version-1 song stored positions
   (a.inst / a.kit); version 2 stores the permanent ids. ⛔ Never edit these lists — they describe files already written. */
const TIM1_POSITIONS={
  ld:['solo.supersaw','solo.organ','solo.pad','solo.bell','solo.flute','solo.8-bit','solo.bell-deep','solo.metallophone','solo.warm-pad',
      'solo.glass-pad','solo.oud','solo.plucked-string','solo.airy-flute','solo.reed','solo.organ-full','solo.organ-soft','solo.string',
      'solo.sitar','solo.oud-string','solo.koto','solo.santur','solo.guitar','solo.pizzicato'],
  ch:['chord.warm-pad','chord.glass-pad','chord.organ','chord.e-piano','chord.warm-pad-long','chord.glass-pad-long','chord.oud',
      'chord.plucked-string','chord.flute','chord.reed','chord.organ-full','chord.organ-soft','chord.warm-pad-clean','chord.glass-pad-clean',
      'chord.strings','chord.plucked','chord.firefly'],
  bs:['bass.sub-sine','bass.saw','bass.acid','bass.synth','bass.upright','bass.synth-soft','bass.organ'],
  dr:['kit.standard','kit.darbuka','kit.tabla','kit.gamelan','kit.taiko'],
};
const ROLE_OF_FN={ leadOn:'ld', leadSet:'ld', chOn:'ch', bassOn:'bs', drum:'dr' };
const FNS=new Set(['leadOn','leadSet','leadOff','chOn','chSet','chOff','bassOn','bassSet','bassOff','drum','drone']);

/* v1 → v2 (TIM2): positions → ids; a position outside the frozen list stays a number (the loader names it a missing timbre).
   Pure and idempotent: an id is left as it is, so running it on a v2 record changes nothing. */
function songV1toV2(r){
  for(const e of r.events||[]){ const role=ROLE_OF_FN[e.fn], a=e.a; if(!role||!a) continue;
    const f= role==='dr' ? 'kit' : 'inst', L=TIM1_POSITIONS[role];
    if(typeof a[f]==='number' && Number.isInteger(a[f]) && a[f]>=0 && a[f]<L.length) a[f]=L[a[f]]; }
  if(!r.timbres) r.timbres={};
  return r;
}
/* v2 → v3 (SONG1): a song carries copies of the person's own records it stands on; an older file has none (it opens only where they exist) */
function songV2toV3(r){ if(!r.records) r.records={}; return r; }
/* v3 → v4 (IDS1): events carry their permanent ids; an older file has none — the app gives them at open (nothing to rewrite here) */
const songV3toV4=r=>r;
/* v4 → v5 (IDS1 part 2): lane points carry their permanent ids; an older file has none — the app gives them at open */
const songV4toV5=r=>r;
/* v5 → v6 (TIM3d): a timbre copy becomes the full timbre RECORD (handsong/timbre). An older copy {role, name, def} cannot be turned into a
   record here (a pure step does not know the app's timbres): it is kept and marked `legacy:true` — it plays as before (the app's own timbre
   when it has the id; else a timbre with equal settings, else the role's stand-in). Idempotent. */
function songV5toV6(r){ for(const t of Object.values(r.timbres||{})) if(t && typeof t==='object' && t.format!=='handsong/timbre' && t.role!=='dr') t.legacy=true; return r; }
/* v6 → v7 (CMD1b): tracks carry their permanent ids; an older file has none — the app gives fresh ones at open (nothing to rewrite here) */
const songV6toV7=r=>r;
const SONG_MIGRATIONS=[songV1toV2, songV2toV3, songV3toV4, songV4toV5, songV5toV6, songV6toV7];
const REC_KINDS={ tuning:'handsong/tuning', palette:'handsong/palette', chordmodes:'handsong/chordmodes', mode:'handsong/mode' };
const OWN_ID=/^u\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;   // = core/registry USER_ID

/* ---- reading a text ---- */
function songParse(text){
  if(typeof text!=='string') return { ok:false, why:'notText' };
  if(text.length>SONG_MAX_BYTES) return { ok:false, why:'tooBig' };
  let x; try{ x=JSON.parse(text); }catch(e){ return { ok:false, why:'notJson' }; }
  const bad=walkBad(x,0); if(bad) return { ok:false, why:bad };
  if(!x || typeof x!=='object' || Array.isArray(x) || x.format!==SONG_FORMAT) return { ok:false, why:'notSong' };
  if(!Number.isInteger(x.version) || x.version<1) return { ok:false, why:'noVersion' };
  if(x.version>SONG_VERSION) return { ok:false, why:'newer', version:x.version };
  return { ok:true, rec:x };
}
function walkBad(x,depth){
  if(depth>SONG_MAX_DEPTH) return 'tooDeep';
  if(x && typeof x==='object'){
    for(const k of Object.keys(x)){ if(BAD_KEYS.has(k)) return 'badKey'; const b=walkBad(x[k],depth+1); if(b) return b; } }
  return null;
}
/* the record → the current version through the migrations (a copy; the input — the file's own text — is never changed). Idempotent. */
function songUpgrade(rec){
  if(!rec || rec.version>=SONG_VERSION) return rec;
  let r=JSON.parse(JSON.stringify(rec));
  for(let v=r.version; v<SONG_VERSION; v++){ r=SONG_MIGRATIONS[v-1](r); r.version=v+1; }
  return r;
}

/* ---- the strict check of a CURRENT-version record: shape and value ranges; returns a list of problems (empty = fine) ---- */
const isObj=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const isNum=x=>typeof x==='number' && Number.isFinite(x);
const isInt=x=>Number.isInteger(x);
const isStr=(x,max=200)=>typeof x==='string' && x.length<=max;
function songCheck(r){
  const P=[]; const need=(c,m)=>{ if(!c) P.push(m); return c; };
  if(!need(isObj(r),'not an object')) return P;
  need(r.format===SONG_FORMAT,'format'); need(r.version===SONG_VERSION,'version');
  need(r.name===undefined || isStr(r.name,120),'name');
  const S=r.settings;
  if(need(isObj(S),'settings')){
    need(isNum(S.aRef) && S.aRef>=380 && S.aRef<=480,'settings.aRef'); need(isNum(S.bpm) && S.bpm>=40 && S.bpm<=240,'settings.bpm');
    need(isInt(S.metre) && S.metre>=1 && S.metre<=32,'settings.metre'); need(isInt(S.bars) && S.bars>=1 && S.bars<=64,'settings.bars');
    need(isInt(S.sub) && (S.sub===3||S.sub===4),'settings.sub'); need(typeof S.quant==='boolean','settings.quant');
    need(isNum(S.master) && S.master>=0 && S.master<=1,'settings.master');
    if(need(isObj(S.brace),'settings.brace')) need(typeof S.brace.user==='boolean' && isNum(S.brace.from) && isNum(S.brace.to) && S.brace.from>=0 && S.brace.to>=S.brace.from && typeof S.brace.on==='boolean','settings.brace fields');
    if(S.live!==undefined && need(isObj(S.live),'settings.live')){ const L=S.live;
      need(isStr(L.scaleId),'settings.live.scaleId'); need(isInt(L.tonic) && L.tonic>=0 && L.tonic<12,'settings.live.tonic');
      need(isNum(L.tonicCents) && Math.abs(L.tonicCents)<=50,'settings.live.tonicCents'); } }
  const V=r.views; const nV= Array.isArray(V) ? V.length : 0;
  if(need(Array.isArray(V) && V.length<=10000,'views')) V.forEach((v,i)=>{
    need(isObj(v) && isStr(v.mode) && (v.key===null || (isInt(v.key) && v.key>=-24 && v.key<=48)) && isNum(v.keyC||0) && Math.abs(v.keyC||0)<=50
      && (v.tunedFrom===undefined || v.tunedFrom==='T' || (isInt(v.tunedFrom) && v.tunedFrom>=0 && v.tunedFrom<12)) && (v.chordMode===undefined || isStr(v.chordMode)),`view ${i}`); });
  /* TIM3d: a timbre copy is a full record (shape here; the T5 bounds — core/timbre.js checkTimbre — at open, where a refused copy plays as
     the stand-in) or, for kits until TIM3c and for v5 copies (`legacy`), {role, name, def} */
  if(need(isObj(r.timbres) && Object.keys(r.timbres).length<=500,'timbres')) for(const [id,t] of Object.entries(r.timbres))
    need(isStr(id,80) && isObj(t) && (t.format==='handsong/timbre' ? t.id===id && isObj(t.recipe) : ['ld','ch','bs','dr'].includes(t.role) && isObj(t.def)),`timbre ${String(id).slice(0,40)}`);
  if(need(isObj(r.records),'records')) for(const [kind,map] of Object.entries(r.records)){   // SONG1: shape only (the full check: scaleload.checkRecord in the page)
    if(!need(REC_KINDS[kind] && isObj(map) && Object.keys(map).length<=200,`records.${String(kind).slice(0,20)}`)) continue;
    for(const [id,x] of Object.entries(map)) if(!need(OWN_ID.test(id) && isObj(x) && x.id===id && x.format===REC_KINDS[kind],`records.${kind} ${String(id).slice(0,40)}`)) break; }
  const layers=new Set(), tids=new Set();
  if(need(Array.isArray(r.tracks) && r.tracks.length<=256,'tracks')) r.tracks.forEach((t,i)=>{
    if(!need(isObj(t) && isInt(t.layer) && t.layer>=0 && t.layer<1024 && !layers.has(t.layer),`track ${i}`)) return; layers.add(t.layer);
    if(t.id!==undefined){ if(!need(isInt(t.id) && t.id>0 && t.id<=1e9 && !tids.has(t.id),`track ${i}: the id is not a fresh positive integer`)) return; tids.add(t.id); }   // CMD1b (v7)
    need((t.name===undefined||isStr(t.name,40)) && (t.level===undefined||(isNum(t.level)&&t.level>=0&&t.level<=1)) && (t.pan===undefined||(isNum(t.pan)&&Math.abs(t.pan)<=1))
      && (t.rank===undefined||isNum(t.rank)) && (t.len===undefined||(isNum(t.len)&&t.len>=0)) && (t.mute===undefined||typeof t.mute==='boolean') && (t.solo===undefined||typeof t.solo==='boolean'),`track ${i} fields`); });
  const tks=new Set(), pids=new Set();
  if(need(Array.isArray(r.takes) && r.takes.length<=100000,'takes')) r.takes.forEach((k,i)=>{
    if(!need(isObj(k) && isInt(k.tk) && k.tk>0 && !tks.has(k.tk) && isObj(k.kinds) && isObj(k.chains) && Array.isArray(k.lane),`take ${i}`)) return; tks.add(k.tk);
    for(const p of k.lane){ if(!need(isObj(p) && isNum(p.t) && isStr(p.key) && isStr(p.fx),`take ${k.tk} lane point`)) break;
      if(p.id!==undefined){ if(!need(isInt(p.id) && p.id>0 && p.id<=1e9 && !pids.has(p.id),`take ${k.tk}: a lane point id is not a fresh positive integer`)) break; pids.add(p.id); } } });   // IDS1 part 2
  if(need(Array.isArray(r.marks) && r.marks.length<=1000,'marks')) r.marks.forEach((m,i)=>need(isObj(m) && isNum(m.beat) && m.beat>=0 && isStr(m.name,40),`mark ${i}`));
  const ids=new Set();
  if(need(Array.isArray(r.events) && r.events.length<=2000000,'events')) for(let i=0;i<r.events.length;i++){ const e=r.events[i];
    const ok=isObj(e) && isNum(e.t) && e.t>=0 && e.t<1e6 && isInt(e.layer) && layers.has(e.layer) && FNS.has(e.fn) && isObj(e.a) && isInt(e.tk) && e.tk>0
      && (e.v===-1 || (isInt(e.v) && e.v>=0 && e.v<nV)) && typeof e.sev==='boolean' && (e.jam===undefined || e.jam===true);
    if(!need(ok,`event ${i}`)) break;
    const role=ROLE_OF_FN[e.fn], f= role==='dr' ? 'kit' : 'inst';
    if(role && e.a[f]!==undefined && !need(isStr(e.a[f],80),`event ${i}: the timbre is not an id`)) break;
    if(e.a.vol!==undefined && !need(isNum(e.a.vol) && e.a.vol>=0 && e.a.vol<=1,`event ${i}: volume`)) break;
    if(e.id!==undefined){ if(!need(isInt(e.id) && e.id>0 && e.id<=1e9 && !ids.has(e.id),`event ${i}: the id is not a fresh positive integer`)) break; ids.add(e.id); } }   // IDS1
  return P;
}
export { SONG_FORMAT, SONG_VERSION, SONG_MAX_BYTES, SONG_MIGRATIONS, TIM1_POSITIONS, songParse, songUpgrade, songCheck };
