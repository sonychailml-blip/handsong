/* NIGHT-3: THE ROOM RECORD's shape and validator (pure, rule #36; data row «NIGHT room records» with controls). A room's record says what it is
   (apps/night/rooms/<name>/pure/room.js); its picture and 2D stand-in are code beside it. Ids are permanent (rule #37, ROOM_IDS pinned). */
export const ROOM_FORMAT='handsong/room', ROOM_VERSION=1;
export const ROOM_IDS=Object.freeze(['room.forest']);   // pinned: never renamed or reused
export const ROOM_LEVELS=Object.freeze(['full','reduced']);   // the WebGL levels; «minimal» is the 2D stand-in
export const ROOM_ACOUSTICS=Object.freeze(['fdepth']);
const FIELDS=['format','version','id','name','tokens','levels','looks','moods','look','nature','acoustic'];
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
]);
