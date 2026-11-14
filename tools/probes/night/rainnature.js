/* RAIN-3: row «RAIN nature» (P.night) — the rain room's layered recordings in the real graph (apps/night/sound/ambience.js, the nature worklet's
   «night-layers»), rendered OFFLINE (deterministic, no real-time capture):
   (1) THE FOREST UNCHANGED TO THE BIT: its own nature builds no layers' node; once built (for the rain room) the node adds exactly 0 in the forest's slot,
       so the forest's sum is the same to the bit (+0). (Two offline renders of the forest alone already differ in a few thousand samples, so a sample
       comparison of two renders could prove nothing.) CONTROL: woken with its gain open there, the node adds sound.
   (2) THE BALANCE FOLLOWS THE FOCUS in the graph: the rain recipe with only the near recording (no fallback, no events): loud with the focus on the glass,
       silent (≥ 40 dB down) with it far; only the far recording: the other way round.
   (3) THE LEVEL: the rain room's whole nature (both recordings decoded here, focus in the middle) within 3 dB of the forest's whole nature (K-like).
   (4) NO CLICK AT A ROOM SWITCH: forest → rain at 2 s (the slots' crossfade, the layers fading in): the largest sample step around the switch at most
       1.5 × the rain's own steady largest step. CONTROL: the instant swap steps more. Every render has a fixed length (no wait without a limit). */
import { row } from '../core/rows.js';
import { kLoud } from './night.js';

export async function checkRainNature(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  try{
    const AM=await import('../../../apps/night/sound/ambience.js'), RS=await import('../../../apps/night/roomswitch.js'), FR=(await import('../../../apps/night/rooms/forest/pure/room.js')).FOREST_ROOM;
    const RR=(await import('../../../apps/night/rooms/rain/pure/room.js')).RAIN_ROOM, base=new URL('../../../apps/night/rooms/rain/', import.meta.url).href, RATE=48000;
    const ctxOf=async sec=>{ const c=new OfflineAudioContext(2, RATE*sec, RATE); await c.audioWorklet.addModule(AM.NATURE_WORKLET); return c; };
    const recs={}; for(const w of ['near', 'far']){ const c=new OfflineAudioContext(2, 128, RATE); recs[w]=await RS.natureRecStereo(c, new URL(RR.nature.layers[w].file, base).href); }
    const give=(E, a, which, N)=>AM.ambienceLayersRec(E, a, which, recs[which][0].slice(), recs[which][1].slice(), N.layers[which].norm);
    const mono=b=>{ const L=b.getChannelData(0), R=b.getChannelData(1), m=new Float32Array(L.length); for(let i=0;i<m.length;i++) m[i]=(L[i]+R[i])/2; return m; };
    /* the node takes its messages before the render starts (an offline render can finish before a late message): a reply proves the earlier ones arrived */
    const settle=async (E, a)=>{ const st=await AM.ambienceLayersStats(E, a, 4000); if(!st) throw new Error('the layers node did not answer within 4 s'); return st; };
    /* (1) the forest unchanged: its own graph builds no layers' node; once the node exists (built for the rain room), what it adds in the forest's slot is
       exactly zero — so the forest's sum is the same to the bit (adding +0). CONTROL: woken with its gain open there, it adds sound */
    { const c0=await ctxOf(1), a0=AM.buildAmbience({ ac:c0 }, c0.destination, 0, FR.nature, 2); n++; if(a0.layers!==undefined && a0.layers!==null) miss('the forest own nature built a layers node');
      const part=async control=>{ const c=await ctxOf(3), E={ ac:c }, a=AM.buildAmbience(E, c.createGain(), 0, FR.nature, 2); AM.ambienceSet(E, a, true, FR.nature.level, 0, false); AM.ambienceLayers(E, a, RR.nature, 0);
        give(E, a, 'near', RR.nature); give(E, a, 'far', RR.nature); const g=a.layers.slots[a.cur]; for(const k of ['ln', 'lf', 'ls']) g[k].connect(c.destination);
        if(control){ for(const k of ['ln', 'lf']) g[k].gain.value=1; a.layers.node.port.postMessage([{ k:'on', v:true }]); } await settle(E, a);
        const b=await c.startRendering(); let nz=0; for(const ch of [0, 1]) for(const v of b.getChannelData(ch)) if(v!==0) nz++; return { nz, gains:[g.ln.gain.value, g.lf.gain.value, g.ls.gain.value] }; };
      const P=await part(false), C=await part(true); n+=2;
      if(P.nz || P.gains.some(v=>v!==0)) miss(`with the forest current the layers' node adds ${P.nz} non-zero samples (its gains there ${P.gains})`);
      if(!C.nz) miss('CONTROL: the node woken with its gain open in the forest slot added nothing — the check cannot fail');
      else notes.push(`the forest unchanged: its own nature builds no layers' node; built for the rain room, the node adds exactly 0 in the forest's slot (gains ${P.gains.join(', ')}); CONTROL woken there: ${C.nz} non-zero samples`); }
    /* (2) the balance in the graph */
    { const solo=async (which, f)=>{ const N={ ...RR.nature, wind:{ ...RR.nature.wind, gain:0, send:0 }, drone:{ ...RR.nature.drone, root:0, fifth:0 }, layers:{ ...RR.nature.layers, events:undefined, near:{ ...RR.nature.layers.near, synth:0 }, far:{ ...RR.nature.layers.far, synth:0 } } };
        const c=await ctxOf(5), E={ ac:c }, a=AM.buildAmbience(E, c.destination, 0, N, 2); AM.ambienceSet(E, a, true, 1, 0, false); AM.ambienceLayers(E, a, N, 0); give(E, a, which, N);
        a.layers.node.port.postMessage([{ k:'focus', v:f }]); await settle(E, a); return kLoud(mono(await c.startRendering()).subarray(RATE*2), RATE); };
      const n0=await solo('near', 0), n1=await solo('near', 1), f0=await solo('far', 0), f1=await solo('far', 1); n+=2;
      if(!(n0-n1>=40)) miss(`the near recording does not leave as the focus goes far: ${n0.toFixed(1)} → ${n1.toFixed(1)} dB`);
      if(!(f1-f0>=40)) miss(`the far recording does not come as the focus goes far: ${f0.toFixed(1)} → ${f1.toFixed(1)} dB`);
      notes.push(`the balance in the graph: near ${n0.toFixed(1)} dB on the glass → ${n1.toFixed(1)} dB far; far ${f0.toFixed(1)} → ${f1.toFixed(1)} dB`); }
    /* (3) the level, and (4) the switch */
    { const whole=async (N, withLayers, f=0.5)=>{ const c=await ctxOf(8), E={ ac:c }, a=AM.buildAmbience(E, c.destination, 0, N, 2); AM.ambienceTune(E, a, 110, 165, 0); AM.ambienceSet(E, a, true, N.level, 0, false);
        if(withLayers){ AM.ambienceLayers(E, a, N, 0); give(E, a, 'near', N); give(E, a, 'far', N); a.layers.node.port.postMessage([{ k:'focus', v:f }]); await settle(E, a); } AM.ambienceSchedule(E, a, 8); return mono(await c.startRendering()); };
      const kf=kLoud((await whole(FR.nature, false)).subarray(RATE*3), RATE), kr=kLoud((await whole(RR.nature, true)).subarray(RATE*3), RATE), kn=kLoud((await whole(RR.nature, true, 0)).subarray(RATE*3), RATE), kfar=kLoud((await whole(RR.nature, true, 1)).subarray(RATE*3), RATE); n++;
      if(!(Math.abs(kr-kf)<=3)) miss(`the rain room's nature sits ${(kr-kf).toFixed(1)} dB from the forest's (within 3 dB wanted)`);
      notes.push(`the level (K-like): the rain room's nature ${kr.toFixed(1)} dB (near ${kn.toFixed(1)}, far ${kfar.toFixed(1)}), the forest's ${kf.toFixed(1)} dB`);
      /* the switch: the forest made silent and the rain's layers fed a steady 1-kHz tone (no events, no fallback; one period in each 1-ms window), so the output's envelope IS the gains: its largest
         change in one millisecond around the switch, against the tone's amplitude */
      const quiet={ ...FR.nature, wind:{ ...FR.nature.wind, gain:0, send:0 }, crickets:{ ...FR.nature.crickets, gain:0, send:0 }, drone:{ ...FR.nature.drone, root:0, fifth:0 }, stream:null };
      const toneR={ ...RR.nature, wind:{ ...RR.nature.wind, gain:0, send:0 }, echo:{ ...RR.nature.echo, fb:0 }, layers:{ ...RR.nature.layers, events:undefined, near:{ ...RR.nature.layers.near, synth:0, norm:1 }, far:{ ...RR.nature.layers.far, synth:0, norm:1, send:0 } } };
      const tone=()=>{ const n2=RATE*12, L=new Float32Array(n2); for(let i=0;i<n2;i++) L[i]=0.5*Math.sin(2*Math.PI*1000*i/RATE); return L; };
      const sw=async instant=>{ const c=await ctxOf(6), E={ ac:c }, a=AM.buildAmbience(E, c.destination, 0, quiet, 2); AM.ambienceSet(E, a, true, 1, 0, false); AM.ambienceLayers(E, a, toneR, 0);
        for(const w of ['near', 'far']){ const L=tone(); AM.ambienceLayersRec(E, a, w, L, L.slice(), 1); } a.layers.node.port.postMessage([{ k:'focus', v:0.5 }]);
        AM.ambienceRoom(E, a, toneR, 2, { instant }); await settle(E, a); const m=mono(await c.startRendering()), w=Math.round(RATE/1000), env=[];
        for(let k=Math.round(1.5*RATE);k+w<=Math.round(5*RATE);k+=w){ let e=0; for(let i=k;i<k+w;i++) e+=m[i]*m[i]; env.push(Math.sqrt(2*e/w)); }
        let jump=0, at=0; for(let k=1;k<env.length;k++){ const j=Math.abs(env[k]-env[k-1]); if(j>jump){ jump=j; at=1.5+k/1000; } } return { jump, at, top:Math.max(...env) }; };
      const S=await sw(false), I=await sw(true); n+=2;
      if(!(S.top>0.05 && S.jump<=0.01*S.top)) miss(`a room switch clicks: the envelope jumps ${(100*S.jump/(S.top||1)).toFixed(2)} % of its level in one millisecond (at most 1 %; level ${S.top.toFixed(3)})`);
      if(!(I.jump>0.01*I.top)) miss('CONTROL: the instant swap passed the click check — the check cannot fail');
      notes.push(`a room switch forest → rain (a steady tone in the layers): the envelope's largest change ${(100*S.jump/S.top).toFixed(3)} % a millisecond (at ${S.at.toFixed(3)} s); CONTROL instant ${(100*I.jump/(I.top||1)).toFixed(1)} %`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1009.984, name:'RAIN nature', run:()=>checkRainNature(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
