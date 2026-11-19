/* RAIN-1: PASSING VEHICLES — one law for the picture and the sound (pure, rule #36; data row «RAIN car passes (app)»). Shared machinery, so it names
   no room: a room gives its lanes and its listener. Vehicles drive along straight lanes (x fixed, z from `zFrom` to `len` or back) on a seeded
   schedule of ABSOLUTE time, so a picture drawn on the audio clock and a sound computed in the audio thread see the same vehicle at the same moment.
   P = { len, zFrom, every:[s per lane], p, speed:[m/s per lane], carLen, lanes:[{ x, dir }], tram:{ every, p, speed, len, track:[x dir−, x dir+] } | null }
   - passTraffic(P, t, density) → every vehicle on the road at time t: { kind 'car' | 'tram', lane, slot, dir, x, z (its front, m), len, v }. Per lane
     one slot every `every` s, a car in a slot with chance p·density (≤ 1), all cars of a lane at one speed (none catches another).
   - passEvents(P, ear, t0, t1, density) → every CAR whose closest moment to the listener (its z = ear.z) falls in [t0, t1): { t, lane, slot, x, v, dir,
     dist (m, at that moment), pan (−1 … 1, the listener's right) }, sorted. The tram is not heard here (its bell comes later).
   The listener ear = { x, y, z, r:[right vector] } (the view's eye).
   RAIN-2: THE DENSITY BOOK — `density` may be a number (as before: every slot decided by it now) or a book of its changes in time (passBook): then a
   vehicle's existence is decided ONCE, by the density in force P.commit seconds before it enters the road. With P.commit at least the sound's
   look-ahead (plus a message's margin), a change of Wave never makes a car appear or vanish while its pass is scheduled or sounding: the picture
   and the sound read the same book, and every car they read is already decided. A change is booked a margin AHEAD (passBookSet: at = now + margin),
   so the audio thread has it before it counts. */
export const passBook=(d=1)=>({ ch:[[-Infinity, +d||0]] });
/* book a change of density d from time `at` on (kept in time order; a change earlier than the last is refused: time runs one way); old entries pruned */
export function passBookSet(B, at, d){ d=Math.max(0, +d||0); const L=B.ch, last=L[L.length-1]; if(!(at>=last[0])) return false; if(last[1]===d) return false;
  L.push([at, d]); while(L.length>2 && L[1][0]<at-600) L.shift(); return true; }
/* the density in force at time t */
export function passBookAt(B, t){ const L=B.ch; let d=L[0][1]; for(let i=1;i<L.length;i++){ if(L[i][0]<=t) d=L[i][1]; else break; } return d; }
const densAt=(P, density, T)=>typeof density==='number' ? density : passBookAt(density, T-(+P.commit||0));
const hash=(a, b)=>{ let h=(Math.imul(a|0, 0x27d4eb2d)^Math.imul(b|0, 0x165667b1))>>>0; h=Math.imul(h^(h>>>15), 0x85ebca77)>>>0; h=Math.imul(h^(h>>>13), 0xc2b2ae3d)>>>0; return ((h^(h>>>16))>>>0)/4294967296; };
const z0Of=P=>+P.zFrom||0;
/* a car of lane li in slot k: its start time T (it enters at zFrom, or at len when coming towards the listener), or null when the slot is empty */
function carSlot(P, li, k, density){ const E=P.every[li], T=k*E+hash(li+11, k)*E*0.5; if(hash(li+1, k)>=Math.min(1, P.p*densAt(P, density, T))) return null; return T; }   // RAIN-2: decided at its commit time (a book)
export function passTraffic(P, t, density=1){
  const out=[], L=P.len, Z0=z0Of(P);
  P.lanes.forEach((ln, li)=>{ const E=P.every[li], v=P.speed[li], span=(L-Z0)/v, k1=Math.floor(t/E), k0=Math.floor((t-span)/E)-1;
    for(let k=k0;k<=k1;k++){ const T=carSlot(P, li, k, density); if(T==null) continue; const a=t-T; if(a<0 || a>span) continue;
      out.push({ kind:'car', lane:li, slot:k, dir:ln.dir, x:ln.x, z: ln.dir>0 ? Z0+a*v : L-a*v, len:P.carLen, v }); } });
  const M=P.tram; if(M){ const span=(L-Z0+M.len)/M.speed, k1=Math.floor(t/M.every), k0=Math.floor((t-span)/M.every)-1;
    for(let k=k0;k<=k1;k++){ const S=tramSlot(P, k, density); if(!S) continue; const { T, dir }=S, a=t-T; if(a<0 || a>span) continue;
      out.push({ kind:'tram', lane:-1, slot:k, dir, x:M.track[dir>0 ? 1 : 0], z: dir>0 ? Z0+a*M.speed : L-a*M.speed, len:M.len, v:M.speed }); } }
  return out;
}
/* a tram of slot k: its start T and direction, or null (decided like a car, at its commit time) */
function tramSlot(P, k, density){ const M=P.tram, T=k*M.every+hash(97, k)*M.every*0.4; if(hash(99, k)>=M.p*Math.min(1, densAt(P, density, T))) return null; return { T, dir: hash(98, k)<0.5 ? -1 : 1 }; }
/* RAIN-6b (2): THE TRAMS' MOMENTS between t0 and t1 — when a tram's MIDDLE is closest to the listener (kind 'pass': its sound's peak), when its front
   is P.tram.bellAhead m before the crossing P.tram.bellZ (kind 'bell': rung by a seeded share bellP of the trams, as it nears the crossing) and P.tram.curveZ (kind 'squeal': the curve at the
   line's far end) → [{ t, kind, slot, dir, x, v, dist, pan }] sorted; the picture's trams (passTraffic) are the same trams at the same moments */
export function passTramEvents(P, ear, t0, t1, density=1){ const M=P.tram, out=[]; if(!M) return out; const Z0=z0Of(P), L=P.len, r=ear.r||[1, 0, 0], span=(L-Z0+M.len)/M.speed;
  const k0=Math.floor((t0-span)/M.every)-1, k1=Math.floor(t1/M.every)+1;
  for(let k=k0;k<=k1;k++){ const S=tramSlot(P, k, density); if(!S) continue; const { T, dir }=S, x=M.track[dir>0 ? 1 : 0];
    const at=zf=>T+(dir>0 ? (zf-Z0) : (L-zf))/M.speed;   // the moment its front is at zf
    const add=(kind, zf, zs)=>{ const t=at(zf); if(t<t0 || t>=t1 || zf<Z0-M.len || zf>L) return; const dx=x-ear.x, dy=1.5-ear.y, dz=zs-ear.z, dist=Math.hypot(dx, dy, dz), pan=Math.max(-1, Math.min(1, (dx*r[0]+dy*r[1]+dz*r[2])/dist)); out.push({ t, kind, slot:k, dir, x, v:M.speed, dist, pan }); };
    add('pass', ear.z+dir*M.len/2, ear.z);
    if(M.bellZ!=null && hash(96, k)<(M.bellP==null ? 0.5 : M.bellP)) { const zb=M.bellZ-dir*(M.bellAhead||30); add('bell', zb, zb); }
    if(M.curveZ!=null) add('squeal', M.curveZ, M.curveZ); }
  return out.sort((a, b)=>a.t-b.t || a.slot-b.slot); }
/* the moment a car of lane li, slot k passes z = ez: dir +1 drives from zFrom up, dir −1 from len down (both only when ez lies on the path) */
function passTime(P, li, k, density, ez){ const T=carSlot(P, li, k, density); if(T==null) return null; const ln=P.lanes[li], v=P.speed[li], Z0=z0Of(P);
  if(ez<Z0 || ez>P.len) return null; return T+(ln.dir>0 ? (ez-Z0)/v : (P.len-ez)/v); }
export function passEvents(P, ear, t0, t1, density=1){
  const out=[], Z0=z0Of(P), r=ear.r||[1, 0, 0];
  P.lanes.forEach((ln, li)=>{ const E=P.every[li], v=P.speed[li], span=(P.len-Z0)/v, k0=Math.floor((t0-span)/E)-1, k1=Math.floor(t1/E)+1;
    for(let k=k0;k<=k1;k++){ const t=passTime(P, li, k, density, ear.z); if(t==null || t<t0 || t>=t1) continue;
      const dx=ln.x-ear.x, dy=0.7-ear.y, dist=Math.hypot(dx, dy), pan=Math.max(-1, Math.min(1, (dx*r[0]+dy*r[1])/dist));
      out.push({ t, lane:li, slot:k, x:ln.x, v, dir:ln.dir, dist, pan }); } });
  return out.sort((a, b)=>a.t-b.t || a.lane-b.lane);
}
const fr1=x=>x-Math.floor(x);
/* RAIN-6b (3): A VEHICLE THAT STOPS AT THE KERB (a taxi picking someone up), its own seeded schedule on absolute time — T = { every:[lo, hi] s, x, z:[from, last], stop (z), v, brake (m/s²), wait:[lo, hi], walk, door, go, person:{ x, z } } — so the picture (stopAt) and the sound (stopSounds) read the same moments.
   Its schedule: its k-th visit → { t0 (it enters at z[0]), tStop, tDoor (opens), tIn (the person in), tShut, tGo, tEnd } */
export function stopVisit(T, k){ const t0=k*T.every[1]+hash(k+701, 71)*(T.every[1]-T.every[0]), run=T.z[0]-T.stop, cruise=Math.max(0, run-T.v*T.v/(2*T.brake)), tStop=t0+cruise/T.v+T.v/T.brake;
  const tDoor=tStop+T.wait[0]+hash(k+701, 72)*(T.wait[1]-T.wait[0])-T.walk, tIn=tDoor+T.door, tShut=tIn+0.8, tGo=tShut+T.go; return { k, t0, tStop, tDoor:Math.max(tStop+1.5, tDoor), tIn:Math.max(tStop+1.5, tDoor)+T.door, tShut:Math.max(tStop+1.5, tDoor)+T.door+0.8, tGo:Math.max(tStop+1.5, tDoor)+T.door+0.8+T.go, cruise }; }
/* the vehicle at time t → null, or { z, v, phase 'come' | 'stop' | 'go', door 0…1, person { z, a, walk } , hazard } */
export function stopAt(T, t){ const k=Math.floor(t/T.every[1]); for(const kk of [k, k-1]){ if(kk<0) continue; const V=stopVisit(T, kk); if(t<V.t0) continue;
    const run=T.z[0]-T.stop, tB=V.t0+V.cruise/T.v;   // braking from tB to tStop
    let z, v, phase; if(t<tB){ z=T.z[0]-T.v*(t-V.t0); v=T.v; phase='come'; } else if(t<V.tStop){ const u=t-tB; v=T.v-T.brake*u; z=T.z[0]-V.cruise-(T.v*u-0.5*T.brake*u*u); phase='come'; }
    else if(t<V.tGo){ z=T.stop; v=0; phase='stop'; } else { const u=t-V.tGo; v=Math.min(T.v, 2.2*u); z=T.stop-(u<T.v/2.2 ? 1.1*u*u : T.v*T.v/(4.4)+T.v*(u-T.v/2.2)); phase='go'; }
    if(z<T.z[1]-140) continue; void run;
    const door= t<V.tDoor ? 0 : t<V.tDoor+0.5 ? (t-V.tDoor)/0.5 : t<V.tShut ? 1 : t<V.tShut+0.3 ? 1-(t-V.tShut)/0.3 : 0;
    const P=T.person, walkU=Math.max(0, Math.min(1, (t-(V.tDoor-T.walk))/T.walk)), pa= t<V.tIn ? 1 : Math.max(0, 1-(t-V.tIn)/0.6);
    const person= t<V.tIn+0.6 ? { x:P.x+(T.x-0.9-P.x)*walkU, z:P.z+(T.stop+1.6-P.z)*walkU, a:pa, walk:walkU>0 && walkU<1 } : null;
    return { k:kk, z, v, phase, door, person, hazard:phase==='stop' || (phase==='come' && t>tB) }; }
  return null; }
/* its sounds between t0 and t1 → [{ t, kind 'brake' | 'door' | 'shut' | 'go' }] (the same visits as stopAt) */
export function stopSounds(T, t0, t1){ const out=[]; for(let k=Math.max(0, Math.floor(t0/T.every[1])-1);k<=Math.floor(t1/T.every[1])+1;k++){ const V=stopVisit(T, k), tB=V.t0+V.cruise/T.v;
    for(const [t, kind] of [[tB, 'brake'], [V.tDoor, 'door'], [V.tShut, 'shut'], [V.tGo, 'go']]) if(t>=t0 && t<t1) out.push({ t, kind }); }
  return out.sort((a, b)=>a.t-b.t); }
