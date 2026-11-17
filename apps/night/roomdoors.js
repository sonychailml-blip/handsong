/* RAIN-4: A ROOM'S OWN MUSIC — the shell's doors (core/legacy-ui/ui.js shellDoors) seen through the current room. A room whose record has
   `music` (rooms/rain/pure/room.js) offers its own moods (its record's moods, named by `music.names` per look) and its own timbres (Night's session
   records, apps/night/rooms/rain/timbres/, installed here once: never in Full's lists); every other room — the forest — sees the profile's, exactly as
   before (the doors are passed through). Entering such a room puts its first mood and timbre on (or the last ones played there this session);
   leaving it gives back the forest's. The rooms' per-timbre levels and strike caps join the face's (audio.setTimbreTrim / setNightStrikes). */
import { sceneRoom } from './scene/host.js';
import { roomById } from './rooms/index.js';
import { timbreInstall, setTimbreTrim, setNightStrikes } from '../../core/audio.js';
import { profileOf, profileCurrent } from '../../core/profile.js';
import { L, t } from '../../core/i18n.js';

const FILES=Object.freeze({ 'rain/e-piano':'e-piano', 'rain/vibraphone':'vibraphone', 'rain/nylon':'nylon', 'rain/celesta':'celesta' });   // RAIN-4e: the celesta back (the founder: four, like the forest)
const fileOf=(R, id)=>new URL('timbres/'+FILES[id]+'.json', R.base);   // the room's own folder: fetched with the room, never in the forest's start set
const installed=new Set(), last=new Map();   // room id → { mood, timbre } played there; 'profile' → the forest's
let D0=null, applying=false;
const musicRoom=()=>{ const R=roomById(sceneRoom()); return R && R.record && R.record.music ? R : null; }, musicOf=()=>{ const R=musicRoom(); return R ? R.record : null; };
/* the room's session timbres, fetched and installed once (a refused or missing one is left out, the room keeps the rest) → their ids */
export async function roomTimbresInstall(rec, base){ const out=[];
  for(const T of rec.music.timbres){ if(installed.has(T.id)){ out.push(T.id); continue; }
    try{ const r=await fetch(fileOf({ base }, T.id)); if(!r.ok) throw new Error(r.status+''); const why=timbreInstall(await r.json()); if(why) throw new Error(why); installed.add(T.id); out.push(T.id); }
    catch(e){ console.warn('[night] the room timbre '+T.id+' was not installed:', e); } }   // eslint-disable-line no-console
  levelsApply(); return out; }
/* the face's trims and caps with every installed room timbre's own */
function levelsApply(){ const P=profileOf(profileCurrent())||{}; if(P.shell!=='night') return; const lv={ ...(P.levels||{}) }, vc={ ...(P.voices||{}) };
  for(const R of [musicOf()].filter(Boolean)) for(const T of R.music.timbres) if(installed.has(T.id)){ lv[T.id]=T.level; vc[T.id]=T.voices; }
  setTimbreTrim(lv); setNightStrikes(vc); }
/* the doors through the room */
export function roomDoors(D){ D0=D; return { ...D,
  timbres:()=>{ const R=musicOf(); return R ? R.music.timbres.map(x=>x.id).filter(id=>installed.has(id)) : D.timbres(); },
  moods:()=>{ const R=musicOf(); return R ? Object.keys(R.moods) : D.moods(); },
  moodName:id=>{ const R=musicOf(), look=R && R.moods[id]; return look && R.music.names[look] ? L(R.music.names[look]) : t('night.mood.'+id); },
  timbreName:id=>{ const R=musicOf(), T=R && R.music.timbres.find(x=>x.id===id); return T ? (D.timbreName(id)||id) : D.timbreName(id); } }; }
/* after a room switch or the face's own settings: the room's mood and timbre on when it has its own (the last played there), the forest's back
   when it has not. Every change goes through the same doors the buttons use */
export async function roomMusicApply(fresh){ if(!D0 || applying) return; applying=true; if(fresh) last.clear();   // fresh: a profile applied = a new face, nothing remembered (the app applies one only at boot)
  try{ const R=musicOf(), key=R ? R.id : 'profile', P=profileOf(profileCurrent())||{};
    if(R){ const E=musicRoom(); if(E.ready) await E.ready(); await roomTimbresInstall(R, E.base); if(!last.has('profile') && P.shell==='night') last.set('profile', { mood:D0.mood(), timbre:D0.timbre() }); }
    const want=last.get(key) || (R ? { mood:Object.keys(R.moods)[0], timbre:(R.music.timbres.find(x=>installed.has(x.id))||{}).id } : null);
    if(want){ if(want.mood && want.mood!==D0.mood()) D0.setMood(want.mood); if(want.timbre && want.timbre!==D0.timbre()) D0.setTimbre(want.timbre); }
    levelsApply(); }
  finally{ applying=false; } }
/* the shell tells what was chosen in the current room (so returning brings it back) */
export function roomMusicNote(){ if(!D0) return; const R=musicOf(); last.set(R ? R.id : 'profile', { mood:D0.mood(), timbre:D0.timbre() }); }
export const roomDoorsDbg=()=>({ installed:[...installed], last:Object.fromEntries(last), room:sceneRoom(), music:!!musicOf() });
