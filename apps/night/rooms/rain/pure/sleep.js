/* RAIN-6b (8): THE CITY FALLS ASLEEP WITH YOU — the sleep timer in the rain, a pure law (rule #36; data row «RAIN sleep (app)»). The shell publishes the
   timer's progress s (0 just set … 1 its end; the music and the whole output already fade by it — shell.js); the room eases it with the forest's curve
   (pure/cycle.js nightDeep: gentle first, deepest at the end) into e, and:
   - THE WINDOWS GO OUT ONE BY ONE: each window its own moment u (seeded, spread over the timer), a short fade; the windows YOU lit go out last, the
     newest of them the very last of all (u → 1);
   - TRAFFIC THINS: the street's density × (1 − 0.9 e), in steps (the cars are booked ahead: a step, never a jitter);
   - PEOPLE GO HOME: each person (by their own seeded rank) leaves at their moment, the last ones near the end.
   At e = 0 every factor is exactly 1 (no timer: the room as it was). */
const F=Object.freeze, frac=x=>x-Math.floor(x), hash=(a, b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453), cl=x=>Math.max(0, Math.min(1, x));
export const SLEEP_CITY=F({ win:F([0.06, 0.86]), mine:F([0.88, 0.985]), fade:0.025, traffic:0.9, steps:8, people:F([0.04, 0.92]), pfade:0.04 });   // each moment ≥ its fade: no step at the timer's start
/* a window's moment to go out: i its index; mine — its place among the windows you lit (0 the oldest … n−1 the newest), or −1 */
export function sleepWinAt(i, mine=-1, n=0, S=SLEEP_CITY){ if(mine>=0) return S.mine[0]+(S.mine[1]-S.mine[0])*(n>1 ? mine/(n-1) : 1); return S.win[0]+(S.win[1]-S.win[0])*hash(i, 41); }
/* how lit a window stays at e (1 before its moment, 0 after, a short fade between) */
export const sleepWinKeep=(u, e, S=SLEEP_CITY)=> e<=0 ? 1 : cl((u-e)/S.fade);
/* the street's density at e: × (1 − traffic e), quantised to `steps` levels (exactly the given density at e = 0) */
export const sleepTraffic=(d, e, S=SLEEP_CITY)=> e<=0 ? d : d*(1-S.traffic*Math.floor(cl(e)*S.steps+1e-9)/S.steps);
/* a person of seeded rank r (0…1) still out at e: 1 … 0 */
export const sleepPerson=(r, e, S=SLEEP_CITY)=> e<=0 ? 1 : cl((S.people[0]+(S.people[1]-S.people[0])*cl(r)-e)/S.pfade);
/* (the room keeps the windows you lit glowing until their moment: they are the last lights of the street) */
/* the windows you lit, oldest first → index → place (the room keeps litAt: when each was lit by your note; −1e9 never) */
export function sleepMine(litAt){ const k=[]; for(let i=0;i<litAt.length;i++) if(litAt[i]>-1e8) k.push(i); k.sort((a, b)=>litAt[a]-litAt[b]); const m=new Map(); k.forEach((i, j)=>m.set(i, j)); return m; }
