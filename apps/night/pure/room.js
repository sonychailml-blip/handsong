/* NIGHT-3: THE ROOM RECORD's shape and validator (pure, rule #36; data row «NIGHT room records» with controls). A room's record says what it is
   (apps/night/rooms/<name>/pure/room.js); its picture and 2D stand-in are code beside it. Ids are permanent (rule #37, ROOM_IDS pinned). */
import { BED_PRESETS } from './bed.js';
export const ROOM_FORMAT='handsong/room', ROOM_VERSION=1;
export const ROOM_IDS=Object.freeze(['room.forest']);   // pinned: never renamed or reused
export const ROOM_LEVELS=Object.freeze(['full','reduced']);   // the WebGL levels; «minimal» is the 2D stand-in
export const ROOM_ACOUSTICS=Object.freeze(['fdepth']);
const FIELDS=['format','version','id','name','tokens','levels','looks','moods','look','nature','acoustic','bed'];
const NATURE=['id','drone','wind','crickets','echo','level','master','ahead'];
const plain=o=> o!==null && typeof o==='object' && !Array.isArray(o);
const num=v=> typeof v==='number' && Number.isFinite(v);
/* a room's look for a mood (a mode id, or a look's own key) → the look; unknown → the room's default look */
export const roomLook=(room, mood)=> room.looks[room.moods[mood]||mood] || room.looks[room.look];
/* null = valid; otherwise ONE line naming the field. known (optional): modes — the app's mode ids (each mood must be one) */
export function checkRoom(r, known={}){
  if(!plain(r)) return 'not an object';
  for(const k of Object.keys(r)) if(!FIELDS.includes(k)) return `unknown field «${k}»`;
  if(r.format!==ROOM_FORMAT) return 'format: '+JSON.stringify(r.format);
  if(r.version!==ROOM_VERSION) return 'version: '+JSON.stringify(r.version);
  if(!ROOM_IDS.includes(r.id)) return `id: «${r.id}» is not a pinned room id`;
  if(!plain(r.name) || typeof r.name.en!=='string' || typeof r.name.ru!=='string' || !r.name.en || !r.name.ru) return 'name: {en, ru}';
  if(typeof r.tokens!=='string' || !/^[a-z][a-z0-9-]*-$/.test(r.tokens)) return 'tokens: a token prefix like «forest-»';
  if(!plain(r.levels) || Object.keys(r.levels).join()!==ROOM_LEVELS.join()) return 'levels: {'+ROOM_LEVELS.join(', ')+'}';
  for(const [lv,L] of Object.entries(r.levels)){ if(!plain(L) || !Object.keys(L).length) return `levels.${lv}: a table of counts`;
    for(const [k,v] of Object.entries(L)) if(!(typeof v==='boolean' || (num(v) && v>=0))) return `levels.${lv}.${k}: a count ≥ 0 or a switch`; }
  if(!plain(r.looks) || !Object.keys(r.looks).length) return 'looks: at least one look';
  for(const [k,L] of Object.entries(r.looks)){
    if(!plain(L) || typeof L.pre!=='string' || !L.pre.startsWith(r.tokens) || !num(L.fog) || !num(L.mist) || !num(L.flies) || !plain(L.tokens)) return `looks.${k}: { pre (the room's tokens), fog, mist, flies, tokens }`;
    for(const [n,t] of Object.entries(L.tokens)) if(typeof t!=='string' || !t.startsWith(r.tokens)) return `looks.${k}.tokens.${n}: a token of this room («${r.tokens}…»)`; }
  if(!plain(r.moods)) return 'moods: {mode id: look}';
  for(const [m,l] of Object.entries(r.moods)){ if(!r.looks[l]) return `moods.${m}: no look «${l}»`; if(known.modes && !known.modes.includes(m)) return `moods: «${m}» is not a mode of this app`; }
  if(!r.looks[r.look]) return 'look: the default look must be one of looks';
  const N=r.nature; if(!plain(N)) return 'nature: the ambience recipe';
  for(const k of Object.keys(N)) if(!NATURE.includes(k)) return `nature: unknown field «${k}»`;
  if(typeof N.id!=='string' || !/^ambience\.[a-z][\w-]*$/.test(N.id)) return 'nature.id: an ambience id «ambience.…»';
  for(const k of ['drone','wind','crickets','echo']) if(!plain(N[k])) return `nature.${k}: its numbers`;
  if(!num(N.level) || N.level<0 || N.level>1) return 'nature.level: 0…1';
  if(!num(N.master) || N.master<=0 || N.master>1) return 'nature.master: above 0, at most 1';
  if(!num(N.ahead) || N.ahead<=0 || N.ahead>2) return 'nature.ahead: above 0, at most 2 s';
  if(!ROOM_ACOUSTICS.includes(r.acoustic)) return 'acoustic: one of '+ROOM_ACOUSTICS.join(' / ');
  return checkBed(r.bed);
}
/* NIGHT-3 stage 4: the music bed's recipe (see the forest's record) */
const range=(a, lo, hi)=> Array.isArray(a) && a.length===2 && num(a[0]) && num(a[1]) && a[0]>=lo && a[1]<=hi && a[0]<=a[1];
function checkBed(B){
  if(!plain(B)) return 'bed: the music bed recipe';
  if(!num(B.master) || B.master<=0 || B.master>1) return 'bed.master: above 0, at most 1';
  if(!num(B.level) || B.level<0 || B.level>1) return 'bed.level: 0…1';
  if(!Array.isArray(B.wave) || !B.wave.length || B.wave.length>8 || !B.wave.every(x=>num(x) && x>=0 && x<=1) || B.wave[0]!==1) return 'bed.wave: harmonic amplitudes, the first 1';
  if(!range(B.detune, 0, 25)) return 'bed.detune: [lo, hi] cents, 0…25';
  if(!range(B.cut, 1, 12)) return 'bed.cut: [lo, hi] × the pitch, 1…12';
  if(!num(B.q) || B.q<=0 || B.q>2) return 'bed.q: above 0, at most 2';
  const P=B.pad; if(!plain(P) || !num(P.lo) || P.lo<-1 || P.lo>0 || !num(P.amp) || P.amp<=0 || P.amp>0.5 || !num(P.attack) || P.attack<=0 || !num(P.release) || P.release<=0) return 'bed.pad: { lo −1…0 of a period, amp, attack, release }';
  const G=B.ground; if(!plain(G) || !num(G.amp) || G.amp<0 || G.amp>0.5 || !num(G.second) || G.second<0 || G.second>0.5 || !num(G.beat) || G.beat<0 || G.beat>2) return 'bed.ground: { amp, second, beat }';
  const L=B.glim; if(!plain(L) || !Number.isInteger(L.oct) || L.oct<1 || L.oct>4 || !num(L.amp) || L.amp<=0 || L.amp>0.3 || !num(L.swell) || L.swell<0.05 || !num(L.hold) || L.hold<0 || !num(L.decay) || L.decay<=0) return 'bed.glim: { oct 1…4, amp, swell ≥ 0.05 s (never struck), hold, decay }';
  const X=B.echo; if(!plain(X) || !num(X.time) || X.time<=0 || X.time>1 || !num(X.fb) || X.fb<0 || X.fb>=0.9 || !num(X.lp) || !num(X.send) || !num(X.glimSend)) return 'bed.echo: { time, fb < 0.9, lp, send, glimSend }';
  if(!plain(B.presets) || Object.keys(B.presets).join()!==BED_PRESETS.join()) return 'bed.presets: '+BED_PRESETS.join(', ');
  for(const [k,Q] of Object.entries(B.presets)){
    if(!plain(Q) || !Number.isInteger(Q.voices) || Q.voices<1 || Q.voices>3) return `bed.presets.${k}: voices 1…3`;
    if(!range(Q.every, 4, 120)) return `bed.presets.${k}.every: [lo, hi] s between chords, 4…120`;
    if(!plain(Q.drift) || !range(Q.drift.every, 1, 60) || !num(Q.drift.depth) || Q.drift.depth<0 || Q.drift.depth>0.6) return `bed.presets.${k}.drift: { every, depth 0…0.6 }`;
    if(Q.glim!==null && (!plain(Q.glim) || !range(Q.glim.every, 2, 120))) return `bed.presets.${k}.glim: null or { every }`; }
  return null;
}
/* the CONTROLS of the data row: each damage must be refused with a line naming its field */
export const ROOM_DAMAGES=Object.freeze([
  ['id', r=>{ r.id='room.monastery'; }],
  ['name', r=>{ r.name={ en:'Forest' }; }],
  ['tokens', r=>{ r.tokens='Forest'; }],
  ['levels', r=>{ delete r.levels.reduced; }],
  ['levels.full.flies', r=>{ r.levels.full.flies=-1; }],
  ['looks.dusk', r=>{ r.looks.dusk.pre='lake-'; }],
  ['looks.mist.tokens.fog', r=>{ r.looks.mist.tokens.fog='lake-fog'; }],
  ['moods.egyptian', r=>{ r.moods.egyptian='rain'; }],
  ['moods', r=>{ r.moods['no-such-mode']='glow'; }],
  ['look', r=>{ r.look='night'; }],
  ['nature.id', r=>{ r.nature.id='forest'; }],
  ['nature.level', r=>{ r.nature.level=2; }],
  ['acoustic', r=>{ r.acoustic='cathedral'; }],
  ['unknown field', r=>{ r.theme='dark'; }],
  ['bed.presets', r=>{ delete r.bed.presets.glimmer; }],   // stage 4
  ['bed.glim', r=>{ r.bed.glim.swell=0; }],
  ['bed.presets.drift', r=>{ r.bed.presets.drift.voices=5; }],
]);
