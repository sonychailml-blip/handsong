/* RAIN-3: A ROOM's LAYERED RECORDINGS — near and far, crossfaded by the focus — and its EVENT SOUNDS on a seeded schedule (pure, rule #36; data row
   «RAIN nature (app)»), run unchanged by the nature worklet («night-layers», apps/night/worklets/nature-worklet.js) and by the listening render
   (tools/rain-listen.mjs). An opt-in part of a room's nature recipe (`nature.layers`; a room without it builds nothing new — the forest's sound is
   unchanged to the bit). Shared machinery, so it names no room: the rain room's recipe makes it «the pane» (near) and «the wet street» (far).
   - TWO LAYERS, each a stereo CC0 recording played in GRAINS (never a loop): a stretch of LAYERS.grain seconds taken whole from a seeded place
     inside the file (never across its ends), the next one joined by an equal-power crossfade of LAYERS.fade s (the stream's method, in stereo).
   - THE BALANCE follows the focus f (0 the glass … 1 the far city): near × cos(f·π/2), far × sin(f·π/2) — equal power; f is the picture's eased
     focus (the same number), smoothed here only against steps (τ LAYERS.focusTc). The far layer leaves on its own output, so the graph sends more
     of it into the room's echo.
   - ON / OFF fade over LAYERS.wake s (no click at a start, a stop or a room's arrival); asleep = zeros, nothing computed.
   - THE FALLBACK: while a layer has no recording (not loaded yet, or failed), the node plays a soft synthesis in its place (seeded filtered noise).
   - EVENTS (`layersEvents`, a pure function of absolute time and the seed, so the picture can show the same drips): drips from the cornice (a short
     falling ping, panned, louder near) and a quiet tick in the room (a muffled click, now and then), each slot's chance and place from a hash.
   - RAIN-1, PASSES (opt-in `passes`): vehicles passing under the window, each a one-shot cut from a recording (mono, a table of [start, length, peak]
     seconds), started so that its peak (its closest moment) falls exactly on the moment the shared traffic law (pure/passes.js passEvents) puts the
     vehicle at the listener — the picture draws the same vehicles from the same law on the same clock. Panned by the vehicle's side, louder the
     nearer its lane, its playback rate by its speed (rate = v / vRef, bounded), into the far output (the street), softer when the focus is near. The
     density (Wave and the mood) comes by message, the same number the picture uses. A room without `passes` computes nothing new. */
import { passEvents, passBook, passBookSet } from './passes.js';   // RAIN-1: the vehicles' law
export const LAYERS=Object.freeze({ seed:0x4C415952, grain:Object.freeze([5, 9]), fade:1.5, edge:0.25, focusTc:0.08, wake:0.6, slot:0.5, synth:0.12 });   // synth: the fallback's level
const hash=(a, b)=>{ let h=(Math.imul(a|0, 0x27d4eb2d)^Math.imul(b|0, 0x165667b1))>>>0; h=Math.imul(h^(h>>>15), 0x85ebca77)>>>0; h=Math.imul(h^(h>>>13), 0xc2b2ae3d)>>>0; return ((h^(h>>>16))>>>0)/4294967296; };
const rng=seed=>{ let s=(seed>>>0)||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; };
/* the shortest recording a layer accepts at `rate` (frames) */
export const layerMinLen=rate=>Math.ceil((LAYERS.grain[1]+2*LAYERS.edge+1)*rate);
/* THE EVENTS between absolute times t0 and t1 (s) for the recipe's events E ({ drips:{ every, gain, hz }, tick:{ every, gain } }) and seed → [{ t, kind
   'drip' | 'tick', amp, pan, hz }], sorted. Each kind has slots of LAYERS.slot s; a slot holds one event with chance slot/every, at a hashed place in it */
export function layersEvents(E, seed, t0, t1){
  const out=[], S=LAYERS.slot;
  for(const [kind, P, salt] of [['drip', E && E.drips, 11], ['tick', E && E.tick, 23]]){ if(!P || !(P.gain>0) || !(P.every>0)) continue;
    for(let k=Math.floor(t0/S);k*S<t1;k++){ if(hash(seed+salt, k)>=S/P.every) continue; const t=(k+hash(seed+salt+1, k))*S; if(t<t0 || t>=t1) continue;
      const a=hash(seed+salt+2, k), b=hash(seed+salt+3, k);
      out.push(kind==='drip' ? { t, kind, amp:P.gain*(0.45+0.55*a), pan:-0.8+1.6*b, hz:(P.hz||2400)*(0.8+0.45*hash(seed+salt+4, k)) } : { t, kind, amp:P.gain*(0.6+0.4*a), pan:-0.3+0.6*b, hz:3200 }); } }
  return out.sort((p, q)=>p.t-q.t);
}
/* a new state at output rate `rate` for the recipe's layers part L ({ near:{ gain }, far:{ gain }, events }) → the state (the recordings come by layersRec) */
export function layersNew(rate, L, seed=LAYERS.seed){
  /* the fallback synthesis while a layer has no recording: seeded noise, near through a band-pass (a soft hiss on the glass), far through a low-pass (the street's wash) */
  const bq=(type, f0, q)=>{ const w=2*Math.PI*f0/rate, al=Math.sin(w)/(2*q), c=Math.cos(w), a0=1+al; return type==='bp' ? { b0:al/a0, b1:0, b2:-al/a0, a1:-2*c/a0, a2:(1-al)/a0, x1:0, x2:0, y1:0, y2:0 }
    : { b0:(1-c)/2/a0, b1:(1-c)/a0, b2:(1-c)/2/a0, a1:-2*c/a0, a2:(1-al)/a0, x1:0, x2:0, y1:0, y2:0 }; };
  const syn={ R:rng((seed^0x53594E54)>>>0), n:[bq('bp', 2600, 0.5), bq('bp', 2900, 0.5)], f:[bq('lp', 700, 0.6), bq('lp', 640, 0.6)] };
  return { rate, L, seed:seed>>>0, syn, near:null, far:null, f:0, fs:0, kf:1-Math.exp(-1/(LAYERS.focusTc*rate)), on:false, g:0, dg:1/(LAYERS.wake*rate), sleep:true,
    frames:0, grains:0, voices:[], evT:null, X:Math.round(LAYERS.fade*rate), cars:null, pv:[], pT:null, dens:1, passes:0, passLog:[] };
}
/* a layer's recording: `which` 'near' | 'far', its two channels (Float32Array at the state's rate; one channel is used for both) and level → true, or
   false when it is too short */
export function layersRec(st, which, L, R, norm=1){
  if(!(L instanceof Float32Array) || L.length<layerMinLen(st.rate)) return false;
  const Rch= R instanceof Float32Array && R.length===L.length ? R : L, rnd=rng((st.seed+(which==='far' ? 7919 : 104729))>>>0), X=st.X;
  const Y={ L, R:Rch, len:L.length, norm:+norm||1, R0:rnd, a:null, b:null, c:1, s:0, cd:Math.cos(Math.PI/2/X), sd:Math.sin(Math.PI/2/X) };
  Y.a=grainOf(st, Y); Y.a.i=Math.floor(rnd()*(Y.a.n-X)); st[which]=Y; return true;
}
function grainOf(st, Y){ const n=Math.round((LAYERS.grain[0]+Y.R0()*(LAYERS.grain[1]-LAYERS.grain[0]))*st.rate), e=Math.round(LAYERS.edge*st.rate); st.grains++; return { s:e+Math.floor(Y.R0()*(Y.len-n-2*e)), n, i:0 }; }
/* RAIN-1: the passes' recording (mono, at the state's rate) and its level → true, or false when it is shorter than its table needs */
export function layersPasses(st, Y, norm=1){
  const P=st.L && st.L.passes; if(!P || !(Y instanceof Float32Array)) return false;
  const need=Math.max(...P.segs.map(([a, n])=>a+n))*st.rate; if(Y.length<need-1) return false;
  st.cars={ Y, norm:+norm||1 }; return true;
}
/* RAIN-1: the traffic's density (the picture's same number) */
export function layersDensity(st, d, at=null, now=0){ d=Math.max(0, +d||0); st.dens=d;   // RAIN-2: the density book — at the picture's time (at), or now + the margin (no picture); the first one opens the book
  if(!st.book || at===-1e9) st.book=passBook(d); else passBookSet(st.book, at==null ? now+0.5 : at, d); }
/* the focus target (0…1) and on / off (the fade does the rest) */
export function layersFocus(st, f){ st.f=Math.max(0, Math.min(1, +f||0)); }
/* RAIN-6: the rain's sound with Echo — the near and far gains' factors (exactly 1 at rest) */
export function layersRain(st, near, far){ st.rk={ near:Math.max(0, +near||0), far:Math.max(0, +far||0) }; }
/* AUDIO-3 (development lab): parts of the layers left out (not computed): { near, far, cars } */
export function layersSkip(st, k){ st.skip={ near:!!(k && k.near), far:!!(k && k.far), cars:!!(k && k.cars) }; }
export function layersOn(st, on){ st.on=!!on; if(on) st.sleep=false; }
/* one layer's grains added into L, R (from index o, n frames), times the per-frame gain array G */
function layerAdd(st, Y, L, R, o, n, G){
  const X=st.X, g=Y.norm; let i=0;
  while(i<n){ const a=Y.a, x0=a.n-X;
    if(a.i<x0){ const m=Math.min(n-i, x0-a.i), q=a.s+a.i; for(let j=0;j<m;j++){ const k=G[i+j]*g; L[o+i+j]+=Y.L[q+j]*k; R[o+i+j]+=Y.R[q+j]*k; } a.i+=m; i+=m; continue; }
    if(!Y.b){ Y.b=grainOf(st, Y); Y.c=1; Y.s=0; }
    const b=Y.b, m=Math.min(n-i, a.n-a.i), qa=a.s+a.i, qb=b.s+b.i; let c=Y.c, s=Y.s;
    for(let j=0;j<m;j++){ const k=G[i+j]*g; L[o+i+j]+=(Y.L[qa+j]*c+Y.L[qb+j]*s)*k; R[o+i+j]+=(Y.R[qa+j]*c+Y.R[qb+j]*s)*k; const c2=c*Y.cd-s*Y.sd; s=s*Y.cd+c*Y.sd; c=c2; }
    Y.c=c; Y.s=s; a.i+=m; b.i+=m; i+=m; if(a.i>=a.n){ Y.a=b; Y.b=null; } }
}
/* the fallback: seeded noise through each channel's filter, times the gains and the level */
function synthAdd(st, F, L, R, o, n, G, lvl){ const Rn=st.syn.R;
  for(let i=0;i<n;i++){ const k=G[i]*lvl; for(let c=0;c<2;c++){ const q=F[c], x=Rn()*2-1, y=q.b0*x+q.b1*q.x1+q.b2*q.x2-q.a1*q.y1-q.a2*q.y2; q.x2=q.x1; q.x1=x; q.y2=q.y1; q.y1=y; (c ? R : L)[o+i]+=y*k; } } }
/* n frames from absolute time t0 (s): the near layer and the events into nL, nR; the far layer into fL, fR (written, not added) */
export function layersOut(st, t0, nL, nR, fL, fR, o=0, n=nL.length-o){
  for(let i=0;i<n;i++){ nL[o+i]=0; nR[o+i]=0; fL[o+i]=0; fR[o+i]=0; }
  if(st.sleep) return;
  const GN=st.gn && st.gn.length>=n ? st.gn : (st.gn=new Float32Array(Math.max(n, 128))), GF=st.gf && st.gf.length>=n ? st.gf : (st.gf=new Float32Array(Math.max(n, 128)));
  const P=st.L, rk=st.rk, gnB=(P.near ? P.near.gain : 0)*(rk ? rk.near : 1), gfB=(P.far ? P.far.gain : 0)*(rk ? rk.far : 1); let fs=st.fs, g=st.g; const kf=st.kf, tg=st.on ? 1 : 0, dg=st.dg;   // RAIN-6: rk — Echo's factors
  for(let i=0;i<n;i++){ fs+=(st.f-fs)*kf; g= g<tg ? Math.min(tg, g+dg) : Math.max(tg, g-dg); const q=fs*Math.PI/2, w=g*g*(3-2*g); GN[i]=Math.cos(q)*w*gnB; GF[i]=Math.sin(q)*w*gfB; }
  st.fs=fs; st.g=g;
  const SK=st.skip||{};   // AUDIO-3
  if(SK.near){} else if(st.near) layerAdd(st, st.near, nL, nR, o, n, GN); else if(P.near) synthAdd(st, st.syn.n, nL, nR, o, n, GN, P.near.synth==null ? LAYERS.synth : P.near.synth);
  if(SK.far){} else if(st.far) layerAdd(st, st.far, fL, fR, o, n, GF); else if(P.far) synthAdd(st, st.syn.f, fL, fR, o, n, GF, P.far.synth==null ? LAYERS.synth : P.far.synth);
  /* the events: new ones from the schedule, then every sounding voice synthesised */
  const rate=st.rate, t1=t0+n/rate, E=P.events;
  if(E){ const from=st.evT==null ? t0 : st.evT; for(const e of layersEvents(E, st.seed, from, t1)) st.voices.push({ ...e, at:Math.round((e.t-t0)*rate), ph:0, z:0, y1:0, y2:0 }); st.evT=t1;
    for(let v=st.voices.length-1;v>=0;v--){ const V=st.voices[v], pl=Math.cos((V.pan+1)*Math.PI/4), pr=Math.sin((V.pan+1)*Math.PI/4), near= V.kind==='drip' ? 0.35+0.65*Math.cos(fs*Math.PI/2) : 1;
      let i=Math.max(0, V.at); const dur= V.kind==='drip' ? 0.09 : 0.012, end=Math.round(dur*rate);
      for(;i<n;i++){ const a=i-V.at; if(a>=end){ V.done=true; break; } const tt=a/rate;
        let x;
        if(V.kind==='drip'){ const f=V.hz*(1-0.4*Math.min(1, tt/0.03)); V.ph+=2*Math.PI*f/rate; x=Math.sin(V.ph)*Math.exp(-tt/0.022)*Math.min(1, a/(0.0015*rate)); }
        else { const nz=Math.sin(a*12.9898+V.t*78.233)*43758.5453; x=(nz-Math.floor(nz)-0.5)*Math.exp(-tt/0.0025); V.z+=(x-V.z)*0.35; x=V.z; }   // a muffled click
        const k=V.amp*near*g; nL[o+i]+=x*k*pl; nR[o+i]+=x*k*pr; }
      if(V.done || i>=n && V.at+end<=n) st.voices.splice(v, 1); else V.at-=n; } }
  /* RAIN-1: the passes — new ones scheduled ahead (their peak on the law's moment), then every sounding one read out (linear interpolation) */
  const PS=P.passes;
  if(PS && st.cars && !SK.cars){ const lead=PS.lead||9, from= st.pT==null ? t0 : st.pT, to=t1+lead, rt=st.rate;
    for(const e of passEvents(PS.traffic, PS.ear, from, to, st.book||st.dens)){ const seg=PS.segs[Math.floor(hash(e.lane*977+5, e.slot)*PS.segs.length)], r=Math.max(PS.rate[0], Math.min(PS.rate[1], e.v/PS.vRef));
      st.pv.push({ s:seg[0]*rt, n:seg[1]*rt, at:(e.t-seg[2]/r-t0)*rt, r, k:PS.gain*st.cars.norm*Math.max(0.3, Math.min(1.4, PS.dRef/e.dist)), pl:Math.cos((e.pan+1)*Math.PI/4), pr:Math.sin((e.pan+1)*Math.PI/4) });
      st.passes++; st.passLog.push({ t:e.t, lane:e.lane, slot:e.slot }); if(st.passLog.length>64) st.passLog.shift(); }
    st.pT=to;
    const Y=st.cars.Y, sw=0.35+0.65*Math.sin(fs*Math.PI/2);
    for(let v=st.pv.length-1;v>=0;v--){ const V=st.pv[v]; const i0=Math.max(0, Math.ceil(V.at));
      for(let i=i0;i<n;i++){ const q=(i-V.at)*V.r; if(q>=V.n-1){ V.done=true; break; } const j=V.s+q, a=Math.floor(j), f=j-a, x=(Y[a]+(Y[a+1]-Y[a])*f)*V.k*g*sw; fL[o+i]+=x*V.pl; fR[o+i]+=x*V.pr; }
      if(V.done || (n-V.at)*V.r>=V.n-1) st.pv.splice(v, 1); else V.at-=n; } }
  st.frames+=n;
  if(!st.on && g<=0) st.sleep=true;
}
/* counters for the worklet and the probes */
export const layersStats=st=>({ rk:st.rk||null, frames:st.frames, grains:st.grains, sleep:st.sleep, on:st.on, focus:st.fs, near:!!st.near, far:!!st.far, voices:st.voices.length,
  cars:!!st.cars, passes:st.passes, sounding:st.pv.length, density:st.dens, passLog:st.passLog.slice(-16) });
