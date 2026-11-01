/* C0 (RUN 6, Calm plan §2) — THE PROFILE RECORD and its validator. CORE: pure (rule #36), runs in node (data row «C0 profile records
   (core)»). A profile is a face of the same app: which roles it offers, the hands' defaults, the key, moods, timbres and effects it offers,
   the scene, the shell, labels. `profile.full` = today's app (every «offer» null = nothing is touched, nothing is narrowed); `profile.calm`
   = Calm v1. Records: data/profiles/<name>.json, listed in data/profiles/index.json; ids permanent (rule #37, PROFILE_IDS pinned). */
import { idSpace } from './registry.js';

export const PROFILE_FORMAT='handsong/profile', PROFILE_VERSION=1;
export const PROFILE_IDS=Object.freeze(['profile.full','profile.calm']);   // pinned: never renamed or reused
export const PROFILE_ROLES=Object.freeze(['ld','ch','bs','dr']);
export const BACKGROUNDS=Object.freeze(['camera','forest','dark']);
export const LEVEL_DB=24, VOICES_MAX=16;   // RUN 8: voices — how many strikes of a struck timbre may ring at once in this face   // RUN 8: the largest per-timbre trim a profile may set (dB)
/* the hand functions each role offers (= ui.js HANDFN_OPTS values; the browser row «C0 profile round trip» compares the solo list) */
export const HAND_FNS=Object.freeze({ ld:Object.freeze(['fx','note','hold','therm','expr','loop']), bs:Object.freeze(['fx','note','hold','therm','loop']),
  ch:Object.freeze(['fx','latch','hold','loop']), dr:Object.freeze(['fx','hit','loop']) });
const FIELDS=['format','version','id','name','roles','handFn','noteModes','key','moods','timbres','effects','scene','backgrounds','shell',
  'noteField','labels','recording','ambience','levels','voices','volume'];   // RUN 8: levels / voices / volume (optional) — a per-timbre level trim (dB) and strike cap; the volume curve's floor
const plain=o=> o!==null && typeof o==='object' && !Array.isArray(o);
const strList=a=> Array.isArray(a) && a.length>0 && a.every(x=>typeof x==='string') && new Set(a).size===a.length;
/* null = valid; otherwise ONE line naming the field. known (optional, each a list): roles, handFns {role:[values]}, modes, timbres,
   effects — what this app has (the node row passes the data files; the browser passes its live tables). Absent lists are not checked
   (hand functions default to HAND_FNS). */
export function checkProfile(p, known={}){
  if(!plain(p)) return 'not an object';
  for(const k of Object.keys(p)) if(!FIELDS.includes(k)) return `unknown field «${k}»`;
  if(p.format!==PROFILE_FORMAT) return 'format: '+JSON.stringify(p.format);
  if(p.version!==PROFILE_VERSION) return 'version: '+JSON.stringify(p.version);
  if(idSpace(p.id)!=='builtin' || !p.id.startsWith('profile.')) return 'id: «'+p.id+'» is not a profile id';
  if(!plain(p.name) || typeof p.name.en!=='string' || typeof p.name.ru!=='string' || !p.name.en || !p.name.ru) return 'name: {en, ru}';
  const roles=known.roles||PROFILE_ROLES;
  if(!strList(p.roles) || p.roles.some(r=>!roles.includes(r))) return 'roles: '+JSON.stringify(p.roles);
  if(p.handFn!==null){
    if(!plain(p.handFn)) return 'handFn: null or {role:{L,R}}';
    for(const [r,h] of Object.entries(p.handFn)){
      if(!p.roles.includes(r)) return `handFn.${r}: a role this profile does not offer`;
      if(!plain(h) || Object.keys(h).sort().join()!=='L,R') return `handFn.${r}: {L, R}`;
      const ok=(known.handFns||HAND_FNS)[r]; if(ok) for(const s of ['L','R']) if(!ok.includes(h[s])) return `handFn.${r}.${s}: «${h[s]}»`;
    }
  }
  if(p.noteModes!==null){
    if(!strList(p.noteModes) || p.noteModes.some(m=>m!=='note' && m!=='hold')) return 'noteModes: null or a list of «note» / «hold»';
    if(!p.handFn || !p.handFn.ld || ![p.handFn.ld.L, p.handFn.ld.R].some(v=>p.noteModes.includes(v))) return 'noteModes: the playing hand (handFn.ld) must start in one of them';
  }
  if(p.key!==null && (!plain(p.key) || !Number.isInteger(p.key.tonic) || p.key.tonic<0 || p.key.tonic>11 || !Number.isInteger(p.key.cents) || Math.abs(p.key.cents)>50
      || Object.keys(p.key).length!==2)) return 'key: null or {tonic 0…11, cents −50…50}';
  for(const [f, list] of [['moods', known.modes], ['timbres', known.timbres], ['effects', known.effects]]){
    const v=p[f]; if(v===null) continue;
    if(!strList(v)) return f+': null or a list of ids';
    if(list) for(const id of v) if(!list.includes(id)) return `${f}: «${id}» is not in this app`;
  }
  if(p.timbres && p.timbres.some(id=>!id.startsWith('solo.')) && p.roles.length===1 && p.roles[0]==='ld') return 'timbres: a solo-only profile offers solo timbres';
  if(p.scene!==null && p.scene!=='forest') return 'scene: null or «forest»';
  if(!strList(p.backgrounds) || p.backgrounds.some(b=>!BACKGROUNDS.includes(b))) return 'backgrounds: a list of '+BACKGROUNDS.join(' / ');
  if(p.backgrounds.some(b=>b!=='camera') && p.scene===null && p.backgrounds.includes('forest')) return 'backgrounds: «forest» needs a scene';
  if(p.shell!=='full' && p.shell!=='calm') return 'shell: «full» or «calm»';
  if(p.noteField!=='full' && p.noteField!=='glow') return 'noteField: «full» or «glow»';
  if(p.labels!=='full' && p.labels!=='plain') return 'labels: «full» or «plain»';
  if(typeof p.recording!=='boolean') return 'recording: true or false';
  if(p.ambience!==null && p.ambience!=='ambience.forest') return 'ambience: null or «ambience.forest»';
  if('levels' in p){ if(!plain(p.levels)) return 'levels: {timbre id: dB}';
    for(const [id,db] of Object.entries(p.levels)){ if(!p.timbres || !p.timbres.includes(id)) return `levels: «${id}» is not a timbre this profile offers`;
      if(typeof db!=='number' || !Number.isFinite(db) || Math.abs(db)>LEVEL_DB) return `levels.${id}: dB within ±${LEVEL_DB}`; } }
  if('voices' in p){ if(!plain(p.voices)) return 'voices: {timbre id: strikes}';
    for(const [id,n] of Object.entries(p.voices)){ if(!p.timbres || !p.timbres.includes(id)) return `voices: «${id}» is not a timbre this profile offers`;
      if(!Number.isInteger(n) || n<1 || n>VOICES_MAX) return `voices.${id}: a whole number 1…${VOICES_MAX}`; } }
  if('volume' in p && (!plain(p.volume) || Object.keys(p.volume).join()!=='left' || typeof p.volume.left!=='number' || !(p.volume.left>=0 && p.volume.left<=1)))
    return 'volume: {left: 0…1} — the amplitude at the far left as a share of the right';
  return null;
}
/* the CONTROLS of the node row: each damage must be refused with a line naming its field */
export const PROFILE_DAMAGES=Object.freeze([
  ['roles', p=>{ p.roles=['ld','harp']; }],
  ['handFn', p=>{ p.handFn={ ch:{ L:'latch', R:'latch' } }; p.roles=['ld']; }],
  ['handFn.ld.R', p=>{ p.handFn={ ld:{ L:'fx', R:'fly' } }; }],
  ['noteModes', p=>{ p.noteModes=['note','latch']; }],
  ['key', p=>{ p.key={ tonic:12, cents:0 }; }],
  ['moods', p=>{ p.moods=['no-such-mode']; }],
  ['timbres', p=>{ p.timbres=['solo.no-such-timbre']; }],
  ['effects', p=>{ p.effects=['flanger']; }],
  ['scene', p=>{ p.scene='monastery'; }],
  ['backgrounds', p=>{ p.backgrounds=['camera','aurora']; }],
  ['shell', p=>{ p.shell='kiosk'; }],
  ['labels', p=>{ p.labels='none'; }],
  ['recording', p=>{ p.recording='yes'; }],
  ['id', p=>{ p.id='u.calm'; }],
  ['unknown field', p=>{ p.theme='night'; }],
  ['levels', p=>{ p.levels={ 'solo.firefly':60 }; }],
  ['voices', p=>{ p.voices={ 'solo.handpan':99 }; }],
  ['volume', p=>{ p.volume={ left:1.5 }; }],
]);
