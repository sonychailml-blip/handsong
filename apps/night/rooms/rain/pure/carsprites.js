/* RAIN-8 (3a): THE BAKED CARS' SPRITE LAW — pure (rule #36; data row «RAIN-8 cars (app)»). A few well-modelled car types (tools/design/rain/cars/: a
   sedan, a hatchback, a taxi, a van, a trolleybus) rendered ONCE offline (tools/rain-cars-bake.mjs) into one atlas, cars/cars.webp, at the angles the
   street needs: seen from the 8th floor (CAM) a car on the near road is 6°…50° below the eye and at most ~30° to its side; from the front (it comes
   towards us) or from behind (it drives away). Each cell is an ORTHOGRAPHIC view framed on the car's own box (frameOf: the box's projection on the
   view's right and up axes), so the room draws a cell over exactly that frame projected at the car's distance — the same numbers in the bake and here.
   Channels (the bake): R the paint's matte shading (white paint), G every reflection (the wet clear coat, the glass, the chrome — luminance), B the rest
   (tyres, trim, lamps' housings, the taxi's sign — luminance), A coverage. The room tints R by the car's colour and lights G by the lamps it passes. */
const F=Object.freeze, D2R=Math.PI/180;
export const CARS=F({ file:'cars/cars.webp', grid:16, cell:128,
  types:F([F({ id:'sedan', len:4.6, h:1.45, w:1.8 }), F({ id:'hatch', len:4.0, h:1.5, w:1.76 }), F({ id:'taxi', len:4.7, h:1.48, w:1.8 }), F({ id:'van', len:5.0, h:2.0, w:1.95 }), F({ id:'trolley', len:11.5, h:3.0, w:2.5, poles:5.6 })]),
  elev:F([6, 9, 13, 18, 24, 31, 39, 48]), az:F([0, 12, 25]), sides:F(['front', 'back']), margin:0.06 });
/* the room's vehicle types (pure/vehicles.js VEH.types: sedan, hatch, estate, small, taxi, van, bus) → a baked type */
export const BAKED_OF=F([0, 1, 0, 1, 2, 3, 4]);
/* a cell's index and its place in the atlas (row 0 at the image's top) */
export const cellOf=(type, side, ei, ai)=>((type*2+side)*CARS.elev.length+ei)*CARS.az.length+ai;
export const cellRC=i=>[i%CARS.grid, Math.floor(i/CARS.grid)];
export const CELLS=CARS.types.length*2*CARS.elev.length*CARS.az.length;
/* the view direction FROM the car TO the eye in the car's own frame (x to its side, y up, z along its nose for 'front' / its tail for 'back'): elevation
   and azimuth in degrees. The flank the eye sees always comes out on the frame's RIGHT (the street's eye stands right of every car lane): from the
   front the eye is on the car's +x, from behind on its −x (the bodies are left–right symmetric) */
export function viewDir(elev, az, side){ const e=elev*D2R, a=az*D2R, c=Math.cos(e), s=side===1 ? -1 : 1; return [s*Math.sin(a)*c, Math.sin(e), s*Math.cos(a)*c]; }
/* the view's right and up axes (unit) for direction d (the eye's up stays world up) */
export function viewAxes(d){ const rx=d[2], rz=-d[0], n=Math.hypot(rx, rz)||1, r=[rx/n, 0, rz/n], u=[d[1]*r[2]-d[2]*r[1], d[2]*r[0]-d[0]*r[2], d[0]*r[1]-d[1]*r[0]]; return { r, u }; }
/* the car's box (its centre at the origin of x and z, y from 0): its corners, the trolleybus's poles included */
export function boxOf(T){ const hx=T.w/2, hz=T.len/2, top=T.poles || T.h, out=[]; for(const x of [-hx, hx]) for(const y of [0, top]) for(const z of [-hz, hz]) out.push([x, y, z]); return out; }
/* THE FRAME: the box projected on the view's right / up → [u0, u1, v0, v1] in metres (grown by the margin) */
export function frameOf(T, elev, az, side){ const d=viewDir(elev, az, side), { r, u }=viewAxes(d); let u0=Infinity, u1=-Infinity, v0=Infinity, v1=-Infinity;
  for(const p of boxOf(T)){ const a=p[0]*r[0]+p[1]*r[1]+p[2]*r[2], b=p[0]*u[0]+p[1]*u[1]+p[2]*u[2]; u0=Math.min(u0, a); u1=Math.max(u1, a); v0=Math.min(v0, b); v1=Math.max(v1, b); }
  const mu=(u1-u0)*CARS.margin, mv=(v1-v0)*CARS.margin; return [u0-mu, u1+mu, v0-mv, v1+mv]; }
/* the bins for a seen elevation / azimuth: ei (fractional between two elevations: the room blends the two cells), ai the nearest azimuth */
export function binsOf(elev, az){ const E=CARS.elev, A=CARS.az; let ei=0; if(elev<=E[0]) ei=0; else if(elev>=E[E.length-1]) ei=E.length-1; else { let k=0; while(E[k+1]<elev) k++; ei=k+(elev-E[k])/(E[k+1]-E[k]); }
  let ai=0, bd=Infinity; A.forEach((a, i)=>{ const d=Math.abs(Math.abs(az)-a); if(d<bd){ bd=d; ai=i; } }); return { ei, ai }; }
/* a car at world (x, z: its NEAR face; len away from us) seen from the eye `eye` [x, y, z], driving dir (−1 towards us: its front seen) → { elev, az, side,
   ei, ai, centre [x, y, z] (the box's middle at the ground) } */
export function seenOf(x, z, len, dir, eye){ const cz=z+len/2, dx=eye[0]-x, dz=eye[2]-cz, hz=Math.hypot(dx, dz);
  const elev=Math.atan2(eye[1], hz)/D2R, side= dir<0 ? 0 : 1, az=Math.atan2(Math.abs(dx), Math.abs(dz))/D2R;
  return { elev, az, side, ...binsOf(elev, az), centre:[x, 0, cz] }; }
