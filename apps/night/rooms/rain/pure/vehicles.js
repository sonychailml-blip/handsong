/* RAIN-6b (1, 3): THE VEHICLES' BODIES and THE TAXI — a pure seeded law (rule #36; data row «RAIN vehicles (app)»). The traffic law (pure/passes.js)
   gives each vehicle's place; this gives it a body the life layer draws (rain-glass.js LIFE_F kinds car / tram / pantograph) under its own lights
   (rain.js puts the head and tail lights and the turn signal at the same place, so they stay attached):
   - CARS: seven simple seeded types — a sedan, a hatchback, an estate, a small city car, a taxi with its roof light, a van, a bus — in muted rainy
     colours (the taxi a muted yellow), their roofs wet: a sheen that brightens as the car passes under a street lamp (the lamps every 24 m);
   - THE TRAM: three lit carriages (the passengers' heads are life.js's), a pantograph up to the wire on the middle one;
   - THE TAXI (3): every few minutes one comes down the kerb lane towards us, slows and stops by a doorway of the left row, its hazard lights
     blinking; a person waiting there walks to it, the door opens (the cabin lit), they get in, the door closes, it pulls away. One seeded schedule
     on absolute time: the picture (taxiAt) and the sound (pure/layers.js plays its brake, door and pull-away from taxiSounds) read the same moments.
   Each body item: { kind, x, y, z (its near face, m), h, w, len (m, away from us), ph (the face's share of the sprite + 1 × sheen step), c (code), a }. */
import { stopAt, stopSounds, stopVisit } from '../../../pure/passes.js';
import { RAIN_TRAFFIC } from './city.js';
const F=Object.freeze, frac=x=>x-Math.floor(x), hash=(a, b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453);
export const VK=F({ car:24, tram:25, panto:26 });
/* type: [length, height, width, share] — the shares draw the mix seen on an evening boulevard */
export const VEH=F({ types:F([F({ id:'sedan', len:4.6, h:1.45, w:1.8, p:0.3 }), F({ id:'hatch', len:4.0, h:1.5, w:1.75, p:0.22 }), F({ id:'estate', len:4.7, h:1.5, w:1.8, p:0.12 }),
    F({ id:'small', len:3.6, h:1.5, w:1.65, p:0.1 }), F({ id:'taxi', len:4.7, h:1.48, w:1.8, p:0.1 }), F({ id:'van', len:5.0, h:2.0, w:1.95, p:0.1 }), F({ id:'bus', len:11.5, h:3.0, w:2.5, p:0.06 })]),
  colours:8, lampEvery:24, lampZ0:8, sheenW:7, tramCars:3, tramH:3.3, tramW:2.4, wire:6.2 });
const TOT=VEH.types.reduce((a, t)=>a+t.p, 0);
/* a vehicle's type index and colour from its lane and slot (the same car always the same) */
export function vehType(lane, slot){ let u=hash(lane*131+7, slot)*TOT, i=0; for(;i<VEH.types.length-1;i++){ u-=VEH.types[i].p; if(u<0) break; } return i; }
export const vehColour=(lane, slot)=>Math.floor(hash(lane*17+3, slot+0.5)*VEH.colours);
/* the wet roof's sheen 0…1 at z: brightest under a lamp */
export const sheenAt=z=>{ const d=frac((z-VEH.lampZ0)/VEH.lampEvery+0.5)-0.5; return 0.25+0.75*Math.exp(-((d*VEH.lampEvery)**2)/(2*VEH.sheenW)); };
/* THE TAXI: the shared law of a vehicle that stops at the kerb (pure/passes.js), with this room's numbers (city.js RAIN_TRAFFIC.stop) */
export const taxiAt=t=>stopAt(RAIN_TRAFFIC.stop, t), taxiSounds=(t0, t1)=>stopSounds(RAIN_TRAFFIC.stop, t0, t1), taxiVisit=k=>stopVisit(RAIN_TRAFFIC.stop, k);
/* the bodies of the cars and trams on the road at t (cars: passTraffic's list) and the taxi → life items (drawn before the people) */
export function vehicleItems(cars, t, taxi=null){ const out=[];
  for(const c of cars){ if(c.kind==='car'){ const ty=vehType(c.lane, c.slot), T=VEH.types[ty], col= T.id==='taxi' ? 0 : vehColour(c.lane, c.slot);
      out.push({ kind:VK.car, x:c.x, y:0, z:c.z, h:T.h, w:T.w, len:T.len, ph:Math.min(8, Math.floor(sheenAt(c.z)*9)), c:ty+8*col+64*(c.dir<0 ? 1 : 0), a:1, lane:'road' }); }
    else if(c.kind==='tram'){ const near= c.dir>0 ? c.z-c.len : c.z, L=c.len/VEH.tramCars;
      for(let i=0;i<VEH.tramCars;i++) out.push({ kind:VK.tram, x:c.x, y:0, z:near+i*L, h:VEH.tramH, w:VEH.tramW, len:L-0.4, ph:Math.min(8, Math.floor(sheenAt(near+i*L)*9)), c:(i===0 ? 1 : 0)+2*(c.dir<0 ? 1 : 0), a:1, lane:'tram' });
      out.push({ kind:VK.panto, x:c.x, y:VEH.tramH, z:near+c.len/2, h:VEH.wire-VEH.tramH, w:1.6, ph:0, c:0, a:1, lane:'tram' }); } }
  if(taxi){ const T=VEH.types[4]; out.push({ kind:VK.car, x:RAIN_TRAFFIC.stop.x, y:0, z:taxi.z, h:T.h, w:T.w, len:T.len, ph:Math.min(8, Math.floor(sheenAt(taxi.z)*9)), c:4+64*1+128*(taxi.door>0 ? 1+Math.round(taxi.door*2) : 0), a:1, lane:'taxi' }); }
  return out; }
/* RAIN-7: A CAR TURNING out of the side street at the crossing — its headlights sweep across the house opposite (every 35–80 s, 1.8 s long): → null, or
   { u (0…1 through the sweep), z (the beam's middle on the facade, m), k (its strength) } */
export const SWEEP=F({ every:F([35, 80]), dur:1.8, z:F([74, 118]), y:1.6 });
export function sweepAt(t, S=SWEEP){ const k=Math.floor(t/S.every[1]); for(const kk of [k, k-1]){ if(kk<0) continue; const t0=kk*S.every[1]+hash(kk, 81)*(S.every[1]-S.every[0]), u=(t-t0)/S.dur;
    if(u>=0 && u<1) return { u, z:S.z[0]+(S.z[1]-S.z[0])*u, k:Math.sin(Math.PI*u)**1.5 }; } return null; }

