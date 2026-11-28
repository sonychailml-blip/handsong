/* LIGHT-13 row «LIGHT rings, pinch, pads, scales»: (1) the pinch distances: a right hand whose ring finger stands 0.26 and little finger 0.28
   from the thumb (in Full's palm units) sounds both — CONTROL with core's distances (setLightCoreLaws) neither sounds; (2) the rings: a ring and an
   outer ring at EVERY sounding finger — three fingers draw six rings, one finger two (CONTROL: an effects-hand pinch draws none); 13b: released,
   they melt (still drawn 100 ms later, gone after RING_FADE_MS); the outer ring grows with the reverb; (3) the profile's reverb tail 0.85 and tone
   0.79; Light's three pads release within 0.7 s (CONTROL: core's own records still release over 2.5–2.8 s — Full unchanged); the profile offers 19
   scales, harmonic and melodic major among them, none of the twelve dropped. Everything is put back. */
import * as ST from '../../../core/state.js';
import { CAM_MARGIN } from '../../../core/config.js';
import { leadAllOff } from '../../../core/audio.js';
import { ctx } from '../../../core/vision.js';
import { pose } from '../../../core/gestures/pose.js';
import { pinchRatios } from '../../../core/gestures/features.js';
import { profileOf } from '../../../core/profile.js';
import { lightHandsProbe, lightProcessHandsProbe, lightHandsView, lightHandsReset, setLightCoreLaws, LIGHT_PINCH } from '../../../apps/light/gestures.js';
import { setHand } from '../../../apps/light/controls.js';
import { lightDrawFrame, lightDrawClockDbg, RING_FADE_MS } from '../../../apps/light/draw.js';
import { LIGHT_RECORDS } from '../../../apps/light/timbres.js';

const W=1000, H=600, FPS=30;
export async function checkLightFeel(){
  const diffs=[], miss=s=>diffs.push(s), notes=[], keep={ hand:{ ...ST.handFn.ld }, vr:ST.viewRect };
  const run=gaps=>{ const clk={ t:20000, W, H }; lightHandsReset(); lightHandsProbe(clk); let v=[];
    try{ for(let i=0;i<12;i++){ clk.t+=1000/FPS; lightProcessHandsProbe({ landmarks:[pose({ x:0.6, y:0.5, s:0.2, gaps })], handednesses:[[{ categoryName:'Right' }]] }); } v=lightHandsView(); }
    finally { lightHandsProbe(null); leadAllOff(); } return v; };
  const sounding=v=>{ const h=v.find(x=>x.key==='Right'); return h && h.pinch ? Object.keys(h.fing||{}).map(Number).sort() : []; };
  const draw=v=>{ const rr=[]; const arc=ctx.arc; ctx.arc=function(x,y,r,...a){ if(r>=16) rr.push(r); return arc.call(this,x,y,r,...a); };
    try{ lightDrawFrame(null, v, x=>x*W, y=>y*H); } finally { ctx.arc=arc; } return rr; };
  let T=50000; const ringsOf=v=>{ T=50000; lightDrawClockDbg(()=>T); return draw(v).length; };
  try{
    ST.setViewRect({ ax0:CAM_MARGIN, ax1:1-CAM_MARGIN, ay0:CAM_MARGIN, ay1:1-CAM_MARGIN });
    setHand('R','note'); setHand('L','fx');
    /* (1) */
    /* the pose's own ratios (pinchRatios, as the machine reads them — the synthetic hand is not exactly isotropic): each finger must lie between
       core's 0.20 and Light's distance, else the test pose itself is wrong */
    const G=[1,1,0.25,0.255], rr=pinchRatios(pose({ x:0.6, y:0.5, s:0.2, gaps:G })), rat=[16,20].map(t=>rr[t]);
    if(!(rat[0]>0.2 && rat[0]<LIGHT_PINCH.on[2] && rat[1]>0.2 && rat[1]<LIGHT_PINCH.on[3])) miss(`the test pose is out of the window: ring ${rat[0].toFixed(3)}, little ${rat[1].toFixed(3)}`);
    const touched=v=>{ const h=v.find(x=>x.key==='Right'); return h ? [...(h.touch||[])].sort() : []; };   // touching, whether or not the field gives the finger a note (k < 4 leaves the little finger idle)
    const wide=touched(run(G)); setLightCoreLaws(true); const core=touched(run(G)); setLightCoreLaws(false);
    notes.push(`ring ${rat[0].toFixed(3)} + little ${rat[1].toFixed(3)}: Light touches [${wide}], core's distances [${core}] (Light's: on ${LIGHT_PINCH.on.join('/')})`);
    if(JSON.stringify(wide)!=='[2,3]') miss(`Light's distances: the ring and little fingers touch [${wide}], not [2,3]`);
    if(core.length) miss(`CONTROL: core's distances still touch [${core}]`);
    /* (2) */
    const three=run([0,0.05,0.05,1]), one=run([0,1,1,1]), r3=ringsOf(three), r1=ringsOf(one);
    notes.push(`rings: three fingers ${r3}, one finger ${r1}`);
    if(sounding(three).length!==3 || r3!==6) miss(`three sounding fingers drew ${r3} rings (sounding [${sounding(three)}]), not 6`);
    if(r1!==2) miss(`one sounding finger drew ${r1} rings, not 2`);
    setHand('R','fx'); const fxv=run([0,1,1,1]), rf=ringsOf(fxv); setHand('R','note');
    if(rf!==0) miss(`CONTROL: an effects-hand pinch drew ${rf} rings`); else notes.push('CONTROL: the effects hand draws none');
    /* 13b: the melt and the reverb */
    T=50000; lightDrawClockDbg(()=>T); draw(three); T+=100; const m1=draw([]).length; T+=RING_FADE_MS; const m2=draw([]).length;
    notes.push(`released: ${m1} melting arcs after 100 ms, ${m2} after ${RING_FADE_MS + 100} ms`);
    if(m1!==6 || m2!==0) miss(`the melt: ${m1} arcs after 100 ms (want 6), ${m2} after ${RING_FADE_MS+100} ms (want 0)`);
    const outer=v=>{ lightDrawClockDbg(()=>50000); const rr=draw(v); return Math.max(...rr); }, dry=one.map(h=>({ ...h, rev:0 })), wet=one.map(h=>({ ...h, rev:1 }));
    const o0=outer(dry), o1=outer(wet); notes.push(`outer ring: dry ${o0.toFixed(1)} px, full reverb ${o1.toFixed(1)}`);
    if(!(o1>=o0+15)) miss(`the outer ring does not grow with the reverb (${o0} → ${o1})`);
    lightDrawClockDbg(null);
    /* (3) */
    const P=profileOf('profile.light'), rv=(P.chain||[]).find(e=>e.fxId==='reverb'), pa=rv ? rv.params : [];
    if(!pa[0] || pa[0].v01!==0.85 || !pa[1] || pa[1].v01!==0.79) miss(`the reverb: tail ${pa[0]&&pa[0].v01}, tone ${pa[1]&&pa[1].v01}`);
    const pads=LIGHT_RECORDS.filter(r=>/^light\/pad-/.test(r.id)), long=pads.filter(r=>!(r.env.rel<=0.7));
    if(pads.length!==3 || long.length) miss(`Light's pads: ${pads.length}, long releases ${long.map(r=>r.id+' '+r.env.rel).join(', ')}`);
    const coreRel={}; for(const id of ['solo.warm-pad','solo.glass-pad','solo.breath-pad']){ const r=await fetch(new URL(`../../../core/data/timbres/${id}.json`, import.meta.url)).then(x=>x.json()); coreRel[id]=r.env.rel; }
    if(Object.values(coreRel).some(v=>!(v>=2.5))) miss('CONTROL: the core pads changed: '+JSON.stringify(coreRel)); else notes.push('CONTROL: the core pads still release '+Object.values(coreRel).join(' / ')+' s');
    const gone=['octatonic-wh','octatonic-hw','messiaen-3','enigmatic','prometheus','egyptian','hungarian-penta','scriabin-penta','major-blues','lydian-penta','dorian-hexa','mixolydian-hexa'];
    if(P.moods.length!==19 || gone.some(g=>P.moods.includes(g)) || !P.moods.includes('harmonic-major') || !P.moods.includes('melodic-major')) miss(`the scales: ${P.moods.length}, ${P.moods.join(' ')}`);
  } finally { lightHandsReset(); setLightCoreLaws(false); setHand('L', keep.hand.L); setHand('R', keep.hand.R); ST.setViewRect(keep.vr); }
  return { pass:!diffs.length, diffs, note:notes.join(' · ') };
}
