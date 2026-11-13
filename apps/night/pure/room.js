/* NIGHT-3: THE ROOM RECORD's shape and validator (pure, rule #36; data row «NIGHT room records» with controls). A room's record says what it is
   (apps/night/rooms/<name>/pure/room.js); its picture and 2D stand-in are code beside it. Ids are permanent (rule #37, ROOM_IDS pinned). */
import { BED_PRESETS } from './bed.js';
import { NATURE_CRICKETS } from './ambience.js';
import { checkBrookVoices } from './brook.js';   // NIGHT-8: the stream's voices
export const ROOM_FORMAT='handsong/room', ROOM_VERSION=1;
export const ROOM_IDS=Object.freeze(['room.forest']);   // pinned: never renamed or reused
export const ROOM_LEVELS=Object.freeze(['full','reduced']);   // the WebGL levels; «minimal» is the 2D stand-in
export const ROOM_ACOUSTICS=Object.freeze(['fdepth']);
const FIELDS=['format','version','id','name','icon','tint','still','tokens','levels','looks','moods','look','nature','acoustic','bed','bed2'];   // DESIGN-1: tint — the room's light on the interface   // NIGHT-8: icon — the room's own picture for its Room-sounds slider
const NATURE=['id','drone','wind','crickets','echo','stream','level','master','ahead'];   // NIGHT-8: stream (optional: a room without water has none)
const plain=o=> o!==null && typeof o==='object' && !Array.isArray(o);
/* DESIGN-1: a room's TINT (a token of the room, its colour in night.css) colours the interface's small accents (--night-tint) with dark ink on it (a
   chosen segment): a light colour — at least 7 : 1 against that ink and against the night base (WCAG's relative luminance; the data row «NIGHT room
   tint» reads the token's value and judges it with these) */
export const TINT_INK='#0b1205', TINT_BASE='#060a12', TINT_CONTRAST=7;
const lum=h=>{ const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=> v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4)); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
export const contrastOf=(a, b)=>{ const x=lum(a), y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
const num=v=> typeof v==='number' && Number.isFinite(v);
/* a room's look for a mood (a mode id, or a look's own key) → the look; unknown → the room's default look */
export const roomLook=(room, mood)=> room.looks[room.moods[mood]||mood] || room.looks[room.look];
/* CORE-20: the modes the rooms name (their moods' keys), once each, in order — with the profile's moods, all the modes Night loads */
export const roomModes=records=>[...new Set(records.flatMap(r=>Object.keys((r && r.moods) || {})))];
/* null = valid; otherwise ONE line naming the field. known (optional): modes — the app's mode ids (each mood must be one); ids — the room ids
   allowed (default ROOM_IDS; a development room passes its own, never pinned and never remembered) */
export function checkRoom(r, known={}){
  if(!plain(r)) return 'not an object';
  for(const k of Object.keys(r)) if(!FIELDS.includes(k)) return `unknown field «${k}»`;
  if(r.format!==ROOM_FORMAT) return 'format: '+JSON.stringify(r.format);
  if(r.version!==ROOM_VERSION) return 'version: '+JSON.stringify(r.version);
  if(!(known.ids||ROOM_IDS).includes(r.id)) return `id: «${r.id}» is not a pinned room id`;
  if(!plain(r.name) || typeof r.name.en!=='string' || typeof r.name.ru!=='string' || !r.name.en || !r.name.ru) return 'name: {en, ru}';
  if(typeof r.icon!=='string' || !/^[a-z][a-z0-9-]*$/.test(r.icon)) return 'icon: the name of a drawn icon (the Room-sounds slider shows it)';
  if(typeof r.tokens!=='string' || !/^[a-z][a-z0-9-]*-$/.test(r.tokens)) return 'tokens: a token prefix like «forest-»';
  if(typeof r.tint!=='string' || !/^[a-z][a-z0-9-]*$/.test(r.tint) || !r.tint.startsWith(r.tokens)) return `tint: the token of the room's light on the interface («${r.tokens}…»; its colour in night.css, checked by the data row «NIGHT room tint»)`;
  if(!plain(r.still) || Object.keys(r.still).join()!==ROOM_LEVELS.join() || Object.values(r.still).some(f=>typeof f!=='string' || !/^[a-z0-9_-]+(\/[a-z0-9_-]+)*\.webp$/.test(f)))
    return 'still: {'+ROOM_LEVELS.join(', ')+'} — a «….webp» in the room folder for each level (the start screen’s prepared still)';   // DESIGN-1 part D
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
  if(!Number.isInteger(N.crickets.n) || N.crickets.n<1 || N.crickets.n>NATURE_CRICKETS) return `nature.crickets.n: 1…${NATURE_CRICKETS} (the voices a nature slot holds)`;
  if(N.stream!=null){ const S=N.stream; if(!plain(S) || !num(S.gain) || S.gain<0 || S.gain>1 || !num(S.send) || S.send<0 || S.send>1) return 'nature.stream: { voices, gain 0…1, send 0…1 }';
    const why=checkBrookVoices(S.voices); if(why) return 'nature.stream.'+why;
    if(S.rec!=null && (!plain(S.rec) || typeof S.rec.file!=='string' || !/^[a-z0-9_-]+(\/[a-z0-9_-]+)*\.mp3$/.test(S.rec.file) || !num(S.rec.norm) || S.rec.norm<=0 || S.rec.norm>64))
      return 'nature.stream.rec: { file «….mp3» in the room folder, norm above 0, at most 64 }'; }   // NIGHT-8b: the stream's recording
  if(!num(N.level) || N.level<0 || N.level>1) return 'nature.level: 0…1';
  if(!num(N.master) || N.master<=0 || N.master>1) return 'nature.master: above 0, at most 1';
  if(!num(N.ahead) || N.ahead<=0 || N.ahead>2) return 'nature.ahead: above 0, at most 2 s';
  if(!ROOM_ACOUSTICS.includes(r.acoustic)) return 'acoustic: one of '+ROOM_ACOUSTICS.join(' / ');
  return checkBed(r.bed) || checkBed2(r.bed2);
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
/* NIGHT-4: the music bed v2's recipe (see the forest's record; design PLAN.md §4b) */
const nums=(a, k, lo, hi)=> Array.isArray(a) && a.length===k && a.every(x=>num(x) && x>=lo && x<=hi);
const in01=x=> num(x) && x>=0 && x<=1;
function checkBed2(B){
  if(!plain(B)) return 'bed2: the music bed v2 recipe';
  if(!num(B.master) || B.master<=0 || B.master>1) return 'bed2.master: above 0, at most 1';
  if(!in01(B.level)) return 'bed2.level: 0…1';
  if(!plain(B.arc) || !range(B.arc.period, 60, 1800)) return 'bed2.arc: { period [lo, hi] s, 60…1800 }';
  if(!plain(B.breath) || !range(B.breath.every, 2, 30)) return 'bed2.breath: { every [lo, hi] s, 2…30 }';
  if(!plain(B.color) || !range(B.color.every, 2, 300) || !range(B.color.tc, 0.05, 60) || !in01(B.color.spread)) return 'bed2.color: { every, tc, spread 0…1 }';
  const G=B.ground; if(!plain(G) || !num(G.amp) || G.amp<0 || G.amp>0.5 || !in01(G.fifth) || !num(G.beat) || G.beat<0 || G.beat>2 || !in01(G.send)) return 'bed2.ground: { amp, fifth 0…1, beat 0…2 Hz, send }';
  const P=B.pad; if(!plain(P) || !num(P.amp) || P.amp<=0 || P.amp>0.5 || !range(P.attack, 0.5, 20) || !range(P.release, 0.5, 20) || !range(P.detune, 0, 25) || !in01(P.send)) return 'bed2.pad: { amp, attack, release 0.5…20 s, detune 0…25 cents, send }';
  const L=B.loops; if(!plain(L) || !num(L.amp) || L.amp<=0 || L.amp>0.5 || !range(L.attack, 0.3, 10) || !range(L.hold, 0, 20) || !range(L.release, 0.5, 20) || !range(L.detune, 0, 25)
    || !in01(L.vary) || !in01(L.renew) || L.vary+L.renew>1 || !in01(L.send)) return 'bed2.loops: { amp, attack ≥ 0.3 s (never struck), hold, release, detune, vary + renew at most 1, send }';
  const V=B.voices; if(!plain(V) || !plain(V.a) || !Array.isArray(V.a.vowels) || V.a.vowels.length<2 || !V.a.vowels.every(f=>nums(f, 2, 100, 4000)) || !nums(V.a.q, 2, 0.3, 30)
    || !num(V.a.breath) || V.a.breath<0 || V.a.breath>0.3 || !in01(V.a.body) || !plain(V.b) || !range(V.b.bloom, 0.5, 20) || !num(V.b.q) || V.b.q<=0.3 || V.b.q>10) return 'bed2.voices: { a: { vowels [[F1, F2] …], q, breath, body }, b: { bloom, q } }';
  const S=B.glass; if(!plain(S) || !num(S.amp) || S.amp<=0 || S.amp>0.3 || !range(S.oct, 1, 6) || !range(S.attack, 0.05, 2) || !range(S.decay, 0.2, 10) || !in01(S.send)
    || !nums(S.ratios, 3, 1, 16) || !nums(S.gains, 3, 0, 1)) return 'bed2.glass: { amp, oct, attack ≥ 0.05 s (never struck), decay, send, ratios, gains }';
  const A=B.air; if(!plain(A) || !num(A.amp) || A.amp<0 || A.amp>0.1 || !nums(A.bands, 2, 200, 9000) || !num(A.sway) || A.sway<0 || A.sway>0.5 || A.bands[1]*(1+A.sway)>10500 || !num(A.q) || A.q<=0.3 || A.q>20 || !range(A.every, 1, 120) || !num(A.tc) || A.tc<=0)
    return 'bed2.air: { amp 0…0.1, bands 200…9000 Hz, sway 0…0.5 (the top at most 10.5 kHz: the worklet runs at half rate), q, every, tc }';
  if(!plain(B.reverb) || !num(B.reverb.pre) || B.reverb.pre<0 || B.reverb.pre>0.1 || !in01(B.reverb.wet)) return 'bed2.reverb: { pre 0…0.1 s, wet 0…1 }';
  const X=B.lighter; if(!plain(X) || !Number.isInteger(X.loops) || X.loops<1 || X.loops>4 || ![2, 3].includes(X.padOsc) || !Number.isInteger(X.padTones) || X.padTones<1 || X.padTones>4 || !num(X.glass) || X.glass<=0 || X.glass>1 || !num(X.release) || X.release<0.3 || X.release>1) return 'bed2.lighter: { loops 1…4, padOsc 2 | 3, padTones 1…4, glass (0, 1], release 0.3…1 }';
  if(!plain(B.presets) || Object.keys(B.presets).join()!==BED_PRESETS.join()) return 'bed2.presets: '+BED_PRESETS.join(', ');
  for(const [k,Q] of Object.entries(B.presets)){ const at=`bed2.presets.${k}`;
    if(!plain(Q) || !Number.isInteger(Q.loops) || Q.loops<1 || Q.loops>4) return `${at}: loops 1…4`;
    if(!Array.isArray(Q.loopLen) || Q.loopLen.length<Q.loops || !Q.loopLen.every(x=>num(x) && x>=5 && x<=120) || new Set(Q.loopLen).size!==Q.loopLen.length) return `${at}.loopLen: one length per loop, 5…120 s, all different (the combination must not repeat)`;
    if(!range(Q.loopReg, -1, 4) || !range(Q.notes, 1, 6) || !Number.isInteger(Q.notes[0]) || !Number.isInteger(Q.notes[1])) return `${at}: loopReg [lo, hi] octaves, notes [lo, hi] 1…6`;
    if(!range(Q.padTones, 1, 4) || !Number.isInteger(Q.padTones[0]) || !Number.isInteger(Q.padTones[1]) || !range(Q.padReg, -1, 4) || Q.padReg[1]-Q.padReg[0]<2) return `${at}: padTones 1…4, padReg at least 2 octaves wide (open voicing over two to three octaves)`;
    if(!range(Q.every, 4, 120)) return `${at}.every: [lo, hi] s between chords, 4…120`;
    if(Q.glass!==null && (!plain(Q.glass) || !range(Q.glass.every, 1, 120))) return `${at}.glass: null or { every }`;
    if(typeof Q.air!=='boolean' || !num(Q.breath) || Q.breath<0 || Q.breath>6 || !in01(Q.bright) || !in01(Q.arcDepth)) return `${at}: air (a switch), breath 0…6 dB, bright 0…1, arcDepth 0…1`;
    if(!num(Q.rt60) || Q.rt60<0.5 || Q.rt60>15 || !num(Q.damp) || Q.damp<500 || Q.damp>12000) return `${at}: rt60 0.5…15 s, damp 500…12000 Hz`;
    if(!num(Q.loopDb) || Q.loopDb<-12 || Q.loopDb>12) return `${at}.loopDb: −12…12 dB`; }
  return null;
}
/* the CONTROLS of the data row: each damage must be refused with a line naming its field */
export const ROOM_DAMAGES=Object.freeze([
  ['id', r=>{ r.id='room.monastery'; }],
  ['name', r=>{ r.name={ en:'Forest' }; }],
  ['tokens', r=>{ r.tokens='Forest'; }],
  ['levels', r=>{ delete r.levels.reduced; }],
  ['levels.full.flies', r=>{ r.levels.full.flies=-1; }],
  ['levels.reduced.sorrel', r=>{ r.levels.reduced.sorrel=-600; }],   // NIGHT-6 slice 3: a floor count
  ['looks.dusk', r=>{ r.looks.dusk.pre='lake-'; }],
  ['looks.mist.tokens.fog', r=>{ r.looks.mist.tokens.fog='lake-fog'; }],
  ['moods.egyptian', r=>{ r.moods.egyptian='rain'; }],
  ['moods', r=>{ r.moods['no-such-mode']='glow'; }],
  ['look', r=>{ r.look='night'; }],
  ['nature.id', r=>{ r.nature.id='forest'; }],
  ['nature.level', r=>{ r.nature.level=2; }],
  ['nature.crickets.n', r=>{ r.nature.crickets.n=5; }],   // NIGHT-3 stage 5 part 2: more than a nature slot holds
  ['acoustic', r=>{ r.acoustic='cathedral'; }],
  ['icon', r=>{ r.icon='Leaf Icon'; }],   // NIGHT-8
  ['tint', r=>{ r.tint='#c8f56a'; }],   // DESIGN-1: a colour, not a token
  ['tint', r=>{ r.tint='lake-tint'; }],   // another room's token
  ['still', r=>{ r.still={ full:'../still.png', reduced:'still/r.webp' }; }],   // DESIGN-1 part D
  ['still', r=>{ delete r.still.reduced; }],
  ['nature.stream', r=>{ r.nature.stream.gain=3; }],
  ['nature.stream.voices[0].lp', r=>{ r.nature.stream.voices[0].lp=50; }],
  ['nature.stream.rec', r=>{ r.nature.stream.rec={ file:'../x.wav', norm:1 }; }],   // NIGHT-8b
  ['unknown field', r=>{ r.theme='dark'; }],
  ['bed.presets', r=>{ delete r.bed.presets.glimmer; }],   // stage 4
  ['bed.glim', r=>{ r.bed.glim.swell=0; }],
  ['bed.presets.drift', r=>{ r.bed.presets.drift.voices=5; }],
  ['bed2.presets.drift.loopLen', r=>{ r.bed2.presets.drift.loopLen=[17, 23, 23, 31]; }],   // NIGHT-4: equal loop lengths would repeat
  ['bed2.loops', r=>{ r.bed2.loops.attack=[0.05, 1]; }],   // a struck attack
  ['bed2.presets', r=>{ delete r.bed2.presets.drift; }],
]);
