/* NIGHT-6 slice 8 — THE PAINTED DISTANCE AND THE FILM, as numbers. Pure (rule #36), node-tested (data row «FOREST paint (app)»): the room's
   picture pass (../forest-paint.js) is generated from these. After the sketch «Живой лес»'s ideas; our own code.
   - THE STROKES: from PAINT.near metres outwards every pixel is repainted in round brush strokes whose radius grows with depth up to the
     level's radius at PAINT.far — a generalised Kuwahara filter: the disc round the pixel is cut into PAINT.sectors soft sectors, each sector's
     mean and spread are taken, and the quiet sectors (small spread) win; edges stay crisp, flat areas turn into strokes. strokeTaps lists the
     disc's samples and, for each, the sectors it feeds and how much (at most three) — the shader is written out from that list.
   - Near pixels keep their sharpness, their hard edges a touch softened (the medium level has no antialiasing).
   - THE FILM: a vignette (vignetteAt), a fine moving grain (high), a slight cool grade in the shadows.
   - THE CAMERA'S BREATH: a small slow sideways sway (breathAt), none with reduced motion. */
const F=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
export const PAINT=F({ near:7, far:26, sectors:8, sharp:14, power:8, gauss:1.5,
  vignette:F({ cx:0.5, cy:0.46, rx:0.75, ry:0.7, from:0.55, k:0.55 }),
  grain:F({ amp:0.07, rate:6.67 }),
  breath:F({ ax:0.035, bx:0.015, f1:0.55, f2:0.23 }) });
/* the stroke radius (pixels) at a pixel `dist` metres away, for the level's radius R */
export const strokeR=(dist, R)=>R*smooth(PAINT.near, PAINT.far, dist);
/* the disc of radius R (pixels) → [{ i, j, d2, w:[[sector, weight]…] }]: every sample feeds the sectors its direction falls in, softly
   (weight 1 at a sector's middle, down to 0 one and a half sectors away); the centre feeds every sector equally */
export function strokeTaps(R, NS=PAINT.sectors){ const out=[], R2=R*R+0.5;
  for(let j=-Math.ceil(R);j<=Math.ceil(R);j++) for(let i=-Math.ceil(R);i<=Math.ceil(R);i++){ const d2=i*i+j*j; if(d2>R2) continue;
    if(!i && !j){ out.push({ i, j, d2, w:Array.from({ length:NS }, (_,k)=>[k, 1/NS]) }); continue; }
    const a=Math.atan2(j, i)/(2*Math.PI)*NS+NS, w=[];
    for(let k=0;k<NS;k++){ const da=Math.abs(((a-k+NS/2)%NS+NS)%NS-NS/2), s=clamp(1.5-da, 0, 1); if(s>0) w.push([k, s]); }
    out.push({ i, j, d2, w }); }
  return out; }
/* the vignette's light factor at the picture's point (u, v), 0…1 each way (v up) → 1 in the middle, 1 − k at the edge of the ellipse */
export function vignetteAt(u, v){ const V=PAINT.vignette, e=Math.hypot((u-V.cx)/V.rx, (v-(1-V.cy))/V.ry); return 1-V.k*smooth(V.from, 1, e); }
/* the camera's sideways breath at time t (seconds) → metres */
export const breathAt=t=>{ const B=PAINT.breath; return B.ax*Math.sin(t*B.f1)+B.bx*Math.sin(t*B.f2+1.3); };
