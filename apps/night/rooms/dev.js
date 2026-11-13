/* RAIN-0: THE DEVELOPMENT ROOMS' DOOR — a room the founder has not approved yet stays out of the players' edition: it is not in ROOMS, its id
   is not pinned, and its code is loaded only here, only in the development edition (never a players' build, never «?release») and only when
   the address asks for it by its word («?room=rain»). The decision is one pure function (the data row «RAIN stays out of the players' edition
   (app)» judges it); main.js calls the door once, before the start. */
import { NIGHT_EDITION } from '../edition.js';

export const DEV_ROOMS=Object.freeze({ rain:'room.rain' });   // the address word → the room's id
/* the development room the address asks for → its word, or null (always null outside the development edition) */
export function devRoomWord(edition, search){
  if(edition!=='dev') return null;
  let w=null; try{ w=new URLSearchParams(search||'').get('room'); }catch(e){}
  return w && Object.prototype.hasOwnProperty.call(DEV_ROOMS, w) ? w : null;
}
/* → a promise of the room's id once it is in and current, or of null (no development room asked, or not this edition) */
export function devRoomInstall(){
  const w=devRoomWord(NIGHT_EDITION, typeof location!=='undefined' ? location.search : '');
  return w==='rain' ? import('./rain/install.js').then(m=>m.rainInstall()) : Promise.resolve(null);
}
