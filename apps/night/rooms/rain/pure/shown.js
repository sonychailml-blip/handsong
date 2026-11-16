/* RAIN-5: THE MUSIC SHOWN WHEN HEARD (PLAN slice 8; pure, rule #36; data row «RAIN life law (app)» proves the timing). The bed's chords and notes
   reach the room with the moment they are HEARD (the scene host maps each audio time to the room's time — the forest's method). The room keeps them
   in a queue and shows each in the FIRST frame whose time reaches it: never early, never more than one frame late.
   - a chord: the traffic lights at the crossing change, and a tram under the wire throws a blue-white spark;
   - a long note (two beats or more): the lit windows and the signs breathe for its length;
   - the strongest moments (a vibraphone glint struck hard), rarely: far lightning over the hills. */
const F=Object.freeze, frac=x=>x-Math.floor(x);
export const SHOWN=F({ spark:0.28, breathBeats:2, flashVel:0.75, flashP:0.22, flash:0.5 });
/* the events due at room time t, taken out of the queue in their order */
export function showDue(queue, t){ const due=[]; for(let i=0;i<queue.length;) if(queue[i].when<=t) due.push(queue.splice(i, 1)[0]); else i++; return due; }
/* is this event one of the rare strongest moments? (seeded by its own time: the same bed, the same lightning) */
export const flashOf=(ev, when)=> ev.kind==='vib' && (ev.vel||0)>=SHOWN.flashVel && frac(Math.sin(when*91.7)*43758.5453)<SHOWN.flashP;
/* how long a note's breath lasts (s), or 0 */
export const breathOf=ev=> (ev.kind==='comp' || ev.kind==='vib') && ev.dur && ev.beat && ev.dur>=SHOWN.breathBeats*ev.beat ? ev.dur : 0;
