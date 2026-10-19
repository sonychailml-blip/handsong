/* C4a (RUN 6, Calm plan §4.1, §10): row «C4a solo Firefly» (quick and all; three short offline renders through the engine copy).
   (1) the solo record `solo.firefly` carries exactly the chord Firefly's partial table and level (one tine, two families);
   (2) a solo Firefly note rings and decays by itself: loud in its first 0.2 s, its last window (1.4–1.5 s, the key still held) ≥ 20 dB
       below that — a struck tine, not a pad;
   (3) a held note moved to another pitch (a hand going to another row — leadOn of the same owner) STRIKES ANEW: the energy right after the
       move (0.52–0.62 s) is ≥ 2× the same window of the same note without the move (CONTROL: the comparison itself — a bank that only
       stored the new pitch would leave the two equal). GOLD «ld 23» holds its golden render (P.all). */
import { row } from './rows.js';
import { timbreById, timbresOf } from '../audio.js';

const off=undefined;
const rms=(x,rate,a,b)=>{ let s=0, n=0; for(let i=Math.round(a*rate);i<Math.round(b*rate);i++){ s+=x[i]*x[i]; n++; } return Math.sqrt(s/Math.max(1,n)); };
export async function checkSoloFirefly(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  try{
    const S=timbreById('solo.firefly'), C=timbreById('chord.firefly'); n++;
    if(!S || !C){ miss('solo.firefly or chord.firefly missing'); return { cases:n, total:d.length, differences:d }; }
    const R=await import('../render.js'), eng=await import('../audio.js?render');
    const rs=eng.LEAD_INSTR.findIndex(x=>x.id==='solo.firefly'); n++; if(rs!==S.idx || timbresOf('ld')[S.idx].id!=='solo.firefly') miss('the solo position differs between the live engine and the copy');
    const T=await import('../timbreload.js'), recOf=id=>T.timbreAll().find(r=>r.id===id), rS=recOf('solo.firefly'), rC=recOf('chord.firefly'); n++;
    if(JSON.stringify(rS.recipe)!==JSON.stringify(rC.recipe) || rS.engine!=='tine') miss('the solo record is not the chord Firefly\'s tine: '+JSON.stringify(rS.recipe));
    const one=await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',220,0.8,rs,off,off,off,off,0.05); e.leadOff('g',off,1.55); }, 1.6);
    const a0=rms(one.L,one.rate,0.05,0.25), a1=rms(one.L,one.rate,1.4,1.5); n++;
    if(!(a0>1e-3 && 20*Math.log10(a1/a0)<=-20)) miss(`ring and decay: first 0.2 s rms ${a0.toExponential(2)}, 1.4–1.5 s ${(20*Math.log10(a1/a0)).toFixed(1)} dB (≤ −20 expected)`);
    const mv=await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',220,0.8,rs,off,off,off,off,0.05); e.leadOn('g',330,0.8,rs,off,off,off,off,0.5); e.leadOff('g',off,1.0); }, 1.1);
    const still=await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',220,0.8,rs,off,off,off,off,0.05); e.leadOff('g',off,1.0); }, 1.1);
    const m1=rms(mv.L,mv.rate,0.52,0.62), m0=rms(still.L,still.rate,0.52,0.62); n++;
    if(!(m1>=2*m0)) miss(`a held note moved to another pitch did not strike anew: rms after the move ${m1.toExponential(2)} vs without ${m0.toExponential(2)}`);
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1009, calm:true, name:'C4a solo Firefly', run:()=>checkSoloFirefly(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
/* RUN 7 (Calm sound pass, docs/CALM-QUALITY.md point 1): row «CALM timbres» (P.all — slow: ≈ 25 s of short dry offline renders through the engine copy,
   at the Calm key's A4 = 440 Hz) for the six new organic timbres (engines modal / breath):
   (1) each record exists with its engine, and the Calm profile offers only known solo timbres;
   (2) LOUDNESS BALANCED: four 1-s notes (vol 0.7, dry) of each lie within ±2 dB of Glass pad — the app's normal solo level (K-like
       weighting, the loudest quarter of 400-ms windows; today's Firefly sits 18 dB lower and is NOT the reference) — CONTROL: the same
       notes at vol 1.0 (+6 dB) must leave the band;
   (3) NO CLICKS: the largest second difference (a sample's curvature) ≤ 0.5 of the local peak (±5 ms) — smooth tones stay near 0.01–0.1, a
       switched-on sine reaches 1 — CONTROL: a sine switched on at its peak must exceed it (RUN 7: the first measure, a step against the
       local RMS, could not see that control — replaced);
   (4) struck (modal) notes ring and decay by themselves (≥ 20 dB down 1.2 s after the attack with the key held; the bowl's long ring ≥ 6 dB)
       and strike anew on a move; breath notes SUSTAIN while held (the last held window within 6 dB of the first);
   (5) PER-NOTE VARIATION: two strikes of the same handpan note differ (not a copy) yet stay within 1.5 dB. */
export const CALM_TIMBRES=Object.freeze(['solo.firefly-rich','solo.breath-flute','solo.handpan','solo.singing-bowl','solo.kalimba','solo.breath-pad']);
const MODAL={ 'solo.firefly-rich':20, 'solo.handpan':20, 'solo.kalimba':20, 'solo.singing-bowl':6 };   // dB the ring falls in 1.2 s
/* the K-like loudness of the listening page (tools/listen/calm-listen.js analyse), dB */
export function kLoud(x, rate){
  const a1=Math.exp(-2*Math.PI*100/rate), a2=Math.exp(-2*Math.PI*2000/rate), sh=Math.pow(10,4/20)-1, n=x.length, w=new Float32Array(n);
  let x1=0,y1=0,x2=0,y2=0,lp=0;
  for(let i=0;i<n;i++){ const v=x[i]; y1=a1*(y1+v-x1); x1=v; y2=a1*(y2+y1-x2); x2=y1; lp=lp*a2+(1-a2)*y2; w[i]=y2+sh*(y2-lp); }
  const win=Math.round(0.4*rate), hop=Math.round(0.1*rate), ms=[];
  for(let a=0;a+win<=n;a+=hop){ let e=0; for(let i=a;i<a+win;i++) e+=w[i]*w[i]; ms.push(e/win); }
  ms.sort((p,q)=>q-p); const top=ms.slice(0, Math.max(1, Math.ceil(ms.length/4)));
  return 10*Math.log10(top.reduce((s,v)=>s+v,0)/top.length+1e-12);
}
/* a click: the largest second difference |x[i] − 2x[i−1] + x[i−2]| relative to the local peak (±5 ms; near-silence ignored) */
export function clickOf(x, rate){
  const w=Math.round(0.005*rate), n=x.length, blk=Math.max(1, w>>2), bp=new Float32Array(Math.ceil(n/blk));
  for(let i=0;i<n;i++){ const v=Math.abs(x[i]), b=(i/blk)|0; if(v>bp[b]) bp[b]=v; }   // block peaks → the local peak in O(n)
  let worst=0;
  for(let i=2;i<n;i++){ let p=0; for(let b=Math.max(0,((i-w)/blk)|0); b<=Math.min(bp.length-1,((i+w)/blk)|0); b++) if(bp[b]>p) p=bp[b];
    if(p<1e-4) continue; const c=Math.abs(x[i]-2*x[i-1]+x[i-2])/p; if(c>worst) worst=c; }
  return worst;
}
export async function checkCalmTimbres(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  try{
    const R=await import('../render.js'), eng=await import('../audio.js?render'), T=await import('../timbreload.js');
    const pos=id=>eng.LEAD_INSTR.findIndex(x=>x.id===id), recOf=id=>T.timbreAll().find(r=>r.id===id);
    for(const id of CALM_TIMBRES){ n++; const r=recOf(id); if(!r || pos(id)<0 || !timbreById(id)) miss(id+': missing'); else if(r.engine!==(MODAL[id]!=null?'modal':'breath')) miss(id+': engine '+r.engine); }
    const calm=await (await fetch('data/profiles/calm.json', { cache:'no-store' })).json(); n++;
    for(const id of calm.timbres) if(!timbreById(id) || !id.startsWith('solo.')) miss('the Calm profile offers an unknown timbre: '+id);
    if(d.length) return { cases:n, total:d.length, differences:d, notes };
    const mid=b=>{ const m=new Float32Array(b.L.length); for(let i=0;i<m.length;i++) m[i]=(b.L[i]+b.R[i])/2; return m; };
    const F=[440, 493.88, 554.37, 659.26];   // A4 B4 C#5 E5 — Glow at A; 1-s notes (a slow pad reaches its level, as Calm is played)
    const phrase=(i,vol)=>e=>{ F.forEach((f,k)=>{ e.applyFx({}); e.leadOn('p'+k,f,vol,i,off,off,off,off,0.05+1.0*k); e.leadOff('p'+k,off,0.05+1.0*k+0.9); }); };
    const ref=mid(await R.goldRender(phrase(pos('solo.glass-pad'),0.7), 4.6)), L0=kLoud(ref,48000);
    for(const id of CALM_TIMBRES){ const i=pos(id), b=await R.goldRender(phrase(i,0.7), 4.6), m=mid(b), L=kLoud(m,b.rate), c=clickOf(m,b.rate); n+=2;
      notes.push(`${id} ${(L-L0>=0?'+':'')+(L-L0).toFixed(2)} dB, click ${c.toFixed(3)}`);
      if(!(Math.abs(L-L0)<=2)) miss(`${id}: loudness ${(L-L0).toFixed(2)} dB from Glass pad (±2 dB)`);
      if(!(c<=0.5)) miss(`${id}: a click — curvature ${c.toFixed(3)} of the local peak (≤ 0.5)`);
      const one=await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',440,0.7,i,off,off,off,off,0.05); e.leadOff('g',off,1.5); }, 1.6), o=mid(one); n++;
      const w0=rms(o,one.rate,0.08,0.28), w1=rms(o,one.rate,1.25,1.45), fall=20*Math.log10(w1/Math.max(w0,1e-12));
      if(MODAL[id]!=null){ if(!(w0>1e-4 && fall<=-MODAL[id])) miss(`${id}: a struck note fell ${fall.toFixed(1)} dB in 1.2 s (≤ −${MODAL[id]} expected)`); }
      else if(!(w0>1e-4 && fall>=-6)) miss(`${id}: a held breath note fell ${fall.toFixed(1)} dB while held (≥ −6 expected)`); }
    /* CONTROL (2): the phrase louder must leave the band */
    { const b=await R.goldRender(phrase(pos('solo.firefly-rich'),1.0), 4.6), L=kLoud(mid(b),b.rate); n++;
      if(Math.abs(L-L0)<=2) miss(`CONTROL: the phrase at vol 1.0 stayed within ±2 dB (${(L-L0).toFixed(2)}) — the loudness band cannot fail`); }
    /* CONTROL (3): a sine switched on at its peak */
    { const x=new Float32Array(4800); for(let i=2400;i<4800;i++) x[i]=0.3*Math.cos(2*Math.PI*440*(i-2400)/48000); n++;
      if(!(clickOf(x,48000)>0.5)) miss('CONTROL: a sine switched on at its peak was not seen as a click — the click measure cannot fail'); }
    /* (4b) a held handpan note moved to another pitch strikes anew; (5) two strikes of one note differ yet stay close */
    { const i=pos('solo.handpan');
      const mv=mid(await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',440,0.7,i,off,off,off,off,0.05); e.leadOn('g',554.37,0.7,i,off,off,off,off,0.6); e.leadOff('g',off,1.0); }, 1.1));
      const st=mid(await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',440,0.7,i,off,off,off,off,0.05); e.leadOff('g',off,1.0); }, 1.1)); n++;
      if(!(rms(mv,48000,0.62,0.72)>=2*rms(st,48000,0.62,0.72))) miss('handpan: a held note moved to another pitch did not strike anew');
      const two=mid(await R.goldRender(e=>{ for(const t of [0.05,1.55]){ e.applyFx({}); e.leadOn('h'+t,440,0.7,i,off,off,off,off,t); e.leadOff('h'+t,off,t+1.0); } }, 3.0));
      const a=two.subarray(Math.round(0.05*48000), Math.round(0.55*48000)), b=two.subarray(Math.round(1.55*48000), Math.round(2.05*48000));
      let diff=0, ea=0, eb=0; for(let k=0;k<a.length;k++){ diff+=(a[k]-b[k])**2; ea+=a[k]*a[k]; eb+=b[k]*b[k]; }
      const lv=10*Math.log10((eb+1e-20)/(ea+1e-20)); n+=2;
      if(!(diff/ea>1e-4)) miss('handpan: two strikes of the same note are identical — no per-note variation');
      if(!(Math.abs(lv)<=1.5)) miss(`handpan: two strikes of the same note differ by ${lv.toFixed(2)} dB (≤ 1.5)`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.5, calm:true, name:'CALM timbres', slow:true, run:()=>checkCalmTimbres(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });

/* RUN 7 (C6): row «CALM shell» (quick, drawn — the shell's frame clock): (1) Full shows no shell and no Calm view; (2) Calm shows it, the
   view is glow + plain, and with no hand in view (the runner's fake camera has none) the controls are shown within 1.5 s + a frame;
   (3) PLAIN WORDS — the shell's text holds no Hz, cents or role name (CONTROL: the same scan finds a role name planted in a copy);
   (4) every round button writes through its door: Sound → the next timbre of the profile's list, Mood → the next mood, Play with → the
   hands swap (the effects hand follows), Notes → follow ↔ stay put on the playing hand, Sleep cycles off → 15 → 30 → 60 → off;
   (5) the SLEEP FADE: a timer started 15 min − 45 s ago fades the output to ≈ ½ (cosine middle), one started 15 min ago sleeps (the veil's
   line shows, the output is 0), a tap on the veil wakes (the output back to 1); (6) the info card opens and closes; «Show the full note field»
   switches the view's fieldAll, Lantern its glow; (7) back to Full: no shell, no view, the output 1. Restores this device's stored choices. */
export async function checkCalmShell(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), $=id=>document.getElementById(id);
  const PR=await import('../profile.js'), CS=await import('../calmshell.js'), ST=await import('../state.js'), I=await import('../i18n.js');
  const KEYS=['handsong.calmBg','handsong.calmLantern','handsong.calmField','handsong.calmForest'], keep={};
  for(const k of KEYS){ try{ keep[k]=localStorage.getItem(k); }catch(e){} }
  const frames=k=>new Promise(r=>{ let i=0; const f=()=>{ if(++i>=k) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const was=PR.profileCurrent();
  try{
    if(was!=='profile.full') PR.profileApply('profile.full');
    n++; if(!$('calmShell').hidden || ST.calmView) miss('Full shows the Calm shell or a Calm view');
    const why=PR.profileApply('profile.calm'); n++; if(why){ miss('Calm did not apply: '+why); return { cases:n, total:d.length, differences:d }; }
    n++; if($('calmShell').hidden || !ST.calmView || !ST.calmView.glow || !ST.calmView.plain) miss('Calm: shell hidden or view '+JSON.stringify(ST.calmView));
    await wait(1650); await frames(3);
    n++; if(!$('calmShell').classList.contains('show')) miss('no hand in view for 1.5 s, yet the controls are not shown ('+JSON.stringify(CS.calmShellDbg())+')');
    /* (3) plain words */
    const banned=[/\bHz\b/i, /¢/, /\bcents?\b/i, ...['ld','ch','bs','dr'].map(r=>new RegExp(I.t('role.'+r).replace(/^\S*\s/,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))];
    const scan=s=>banned.filter(re=>re.test(s)).map(String);
    n++; { const bad=scan($('calmShell').textContent); if(bad.length) miss('the shell shows technical words: '+bad.join(', ')); }
    n++; if(!scan($('calmShell').textContent+' '+I.t('role.ch')).length) miss('CONTROL: a planted role name was not found — the scan cannot fail');
    /* (4) the buttons */
    const prof=PR.profileOf('profile.calm'), A=await import('../audio.js'), lead=()=>A.timbreIdOf('ld', ST.leadIdx), next=(L,c)=>L[(L.indexOf(c)+1)%L.length];
    { const want=next(prof.timbres, lead()); $('calmSound').click(); n++; if(lead()!==want) miss(`Sound: ${lead()} (expected ${want})`); }
    { const want=next(prof.moods, ST.scaleId); $('calmMood').click(); n++; if(ST.scaleId!==want) miss(`Mood: ${ST.scaleId} (expected ${want})`); }
    { const h0={ ...ST.handFn.ld }; $('calmHand').click(); const h1={ ...ST.handFn.ld }; n++;
      if(!(h1.L===h0.R && h1.R===h0.L)) miss(`Play with: hands ${JSON.stringify(h0)} → ${JSON.stringify(h1)} (expected swapped)`);
      $('calmHand').click(); n++; if(JSON.stringify(ST.handFn.ld)!==JSON.stringify(h0)) miss('Play with twice did not come back'); }
    { const play=ST.handFn.ld.R==='fx' ? 'L' : 'R', f0=ST.handFn.ld[play]; $('calmNotes').click(); n++;
      if(ST.handFn.ld[play]!==(f0==='hold' ? 'note' : 'hold')) miss(`Notes: ${f0} → ${ST.handFn.ld[play]}`); $('calmNotes').click(); }
    { const seen=[]; for(let k=0;k<4;k++){ $('calmSleep').click(); seen.push(CS.calmShellDbg().sleep.mins); } n++;
      if(JSON.stringify(seen)!==JSON.stringify([15,30,60,0])) miss('Sleep cycles '+JSON.stringify(seen)); }
    /* (5) the sleep fade */
    { CS.calmSleepDbg(15, 15*60e3-45e3); await frames(4); const f=A.outputFadeLevel(); n++; notes.push('fade at 45 s left '+f.toFixed(3));
      if(!(f>0.45 && f<0.55)) miss(`sleep fade 45 s before the end: ${f.toFixed(3)} (≈ 0.5 expected)`);
      CS.calmSleepDbg(15, 15*60e3+10); await frames(4); n++;
      if(!(A.outputFadeLevel()===0 && CS.calmShellDbg().asleep && !$('calmVeilMsg').hidden)) miss('the timer\'s end did not put the forest to sleep: '+JSON.stringify(CS.calmShellDbg()));
      $('calmVeil').click(); await frames(2); n++; if(!(A.outputFadeLevel()===1 && !CS.calmShellDbg().asleep)) miss('a tap on the veil did not wake: '+JSON.stringify(CS.calmShellDbg())); }
    /* (6) the info card, the field and the lantern */
    $('calmInfoBtn').click(); n++; if($('calmInfo').hidden) miss('the info card did not open');
    { const f0=!!ST.calmView.fieldAll; $('calmFieldTg').click(); n++; if(!!ST.calmView.fieldAll===f0) miss('«Show the full note field» did not switch'); $('calmFieldTg').click(); }
    { const l0=$('calmLantern').hidden; $('calmLanternTg').click(); n++; if($('calmLantern').hidden===l0) miss('Lantern did not switch'); $('calmLanternTg').click(); }
    $('calmInfoClose').click(); n++; if(!$('calmInfo').hidden) miss('the info card did not close');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{
    PR.profileApply(was||'profile.full');
    for(const k of KEYS){ try{ if(keep[k]==null) localStorage.removeItem(k); else localStorage.setItem(k, keep[k]); }catch(e){} }
  }
  { const A=await import('../audio.js'); n++; if(was==='profile.full' && (!$('calmShell').hidden || ST.calmView || A.outputFadeLevel()!==1)) miss('back in Full: the shell, the Calm view or the output fade remain'); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.7, calm:true, name:'CALM shell', drawn:true, run:()=>checkCalmShell(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 7 (C4b): row «CALM depth → forest» (quick): in Calm the solo chain holds «Forest depth» and the playing hand's depth drives it — the aim
   door (the same fxParamsOf().set the hand uses) at d = 0, ½, 1 puts the live instance on core/dsp.calmDepth exactly (send, dry, the
   darkening weight and cut-off; read after the 80-ms glides settle, within 2e-3); Full's Night forest keeps its send range 0…1 (unchanged —
   the user's choice: Calm's own wider range, Full untouched). CONTROL: the far send 1.3 must lie outside Full's forest range. */
export async function checkCalmDepth(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const PR=await import('../profile.js'), A=await import('../audio.js'), G=await import('../gestures.js'), ST=await import('../state.js'), DSP=await import('../core/dsp.js');
  const was=PR.profileCurrent(), wait=ms=>new Promise(r=>setTimeout(r,ms));
  try{
    const why=PR.profileApply('profile.calm'); n++; if(why){ miss('Calm did not apply: '+why); return { cases:n, total:d.length, differences:d }; }
    const key=ST.chainKeyOf('ld'), inst=A.fxInstance(key,'fdepth'), ps=G.fxParamsOf(key,'fdepth'); n++;
    if(!inst || !inst.nodes || !ps || !ps[1]) { miss('no «Forest depth» instance / aim in the Calm chain'); return { cases:n, total:d.length, differences:d }; }
    const keep=ps[1].get();
    try{
      for(const x of [0,0.5,1]){ ps[1].set(x); const t0=A.AC.currentTime; for(let k=0;k<100 && A.AC.currentTime<t0+0.7;k++) await wait(50);   // the AUDIO clock must pass 0.7 s (≈ 9 glide constants), not the wall clock
        const c=DSP.calmDepth(x), N=inst.nodes; n+=5;
        const got={ send:inst.send.gain.value, dry:N.dry.gain.value, dark:N.dark.gain.value, direct:N.direct.gain.value, lp:N.lp.frequency.value };
        if(Math.abs(got.send-c.send)>2e-3) miss(`d=${x}: send ${got.send.toFixed(4)} (curve ${c.send})`);
        if(Math.abs(got.dry-c.dry)>2e-3) miss(`d=${x}: dry ${got.dry.toFixed(4)} (curve ${c.dry})`);
        if(Math.abs(got.dark-x)>2e-3 || Math.abs(got.direct-(1-x))>2e-3) miss(`d=${x}: darkening weight ${got.dark.toFixed(4)} / direct ${got.direct.toFixed(4)}`);
        if(Math.abs(got.lp-c.lp)>c.lp*2e-3) miss(`d=${x}: cut-off ${got.lp.toFixed(1)} Hz (curve ${c.lp.toFixed(1)})`); }
    } finally { ps[1].set(keep); }
    const F=A.FX_FACTORY.forest.params.find(p=>p.key==='mix'); n++; if(!(F.min===0 && F.max===1)) miss(`Full's Night forest send range changed: ${F.min}…${F.max}`);
    n++; if(!(DSP.calmDepth(1).send>F.max)) miss('CONTROL: the far send lies inside Full\'s forest range — the wider range is not real');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1009.6, calm:true, name:'CALM depth → forest', run:()=>checkCalmDepth(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
/* RUN 7 (C4c): row «CALM ambience» (P.all — slow, ≈ 13 s; offline renders through the engine copy, 4 s): (1) the drone sounds the LIVE view's root two
   registers down and its fifth (tonicFreq / 2, droneSecondHz — the backing drone's pricing, rule #2) and follows A4 (432 → both move by the
   same ratio); the spectrum's two strongest low peaks lie within one FFT bin of them; (2) SEEDED — the same render twice is the same
   (≤ 1e-6); CONTROL: another seed differs; (3) the Forest level scales it (amplitude ∝ level², so level ½ → 1/16 of the energy; within 1 %);
   (4) the crickets sound AT their scheduled times: at each chirp's onset the 4.3–4.9 kHz band energy (mean per frame) of its first 30 ms
   rises ≥ 2× over the 60 ms before (median), and ≥ 2× the same measure taken 0.35 s off the onsets — CONTROL: off the onsets it stays
   < 1.5× (RUN 7: «inside vs between chirps» was replaced — the crickets sit high in a 2.6-s room, their own tails fill the gaps; a first
   absolute 3× was a guess, measured 2.6×, replaced by this relative test with its control); (5) no click (curvature ≤ 0.5). */
export async function checkCalmAmbience(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  try{
    const R=await import('../render.js'), S=await import('../scales.js'), ST=await import('../state.js'), AM=await import('../core/ambience.js');
    const mid=b=>{ const m=new Float32Array(b.L.length); for(let i=0;i<m.length;i++) m[i]=(b.L[i]+b.R[i])/2; return m; };
    const SEC=4, play=(level,seed)=>e=>{ e.ambienceOn(true, level, 0.05, seed); e.ambienceTick(SEC); };
    const a=await R.goldRender(play(1,0), SEC), b=await R.goldRender(play(1,0), SEC), c=await R.goldRender(play(1,1), SEC), h=await R.goldRender(play(0.5,0), SEC);
    const A=mid(a), B=mid(b), Cc=mid(c), H=mid(h);
    let rep=0, ctl=0; for(let i=0;i<A.length;i++){ rep=Math.max(rep,Math.abs(A[i]-B[i])); ctl=Math.max(ctl,Math.abs(A[i]-Cc[i])); }
    n++; if(!(rep<=1e-6)) miss('the same ambience render twice differs by '+rep.toExponential(2));
    n++; if(!(ctl>1e-3)) miss('CONTROL: another seed gave the same ambience');
    const en=(x,s0,s1)=>{ let e=0; for(let i=Math.round(s0*48000);i<Math.round(s1*48000);i++) e+=x[i]*x[i]; return e; };
    { const r=en(H,3,4)/en(A,3,4); n++; notes.push('level ½ energy ratio '+r.toFixed(4)); if(Math.abs(r-0.0625)>0.000625) miss('the Forest level ½ gives '+r.toFixed(4)+' of the energy (1/16 expected)'); }
    { const k=(await import('./calm.js')).clickOf(A,48000); n++; if(!(k<=0.5)) miss('a click in the ambience: '+k.toFixed(3)); }
    /* (1) the drone's pitch: the oscillator values, then the spectrum (4 s, 2^17 bins → 0.37 Hz) */
    const root=S.tonicFreq()/2, fifth=S.droneSecondHz();
    { const eng=await import('../audio.js?render'); n++; const info=await R.engineProbe(async (e,ctx)=>{ e.ambienceOn(true,1,0); const i=e.ambienceInfo(); return i; }, { sec:0.1 });
      if(!info || Math.abs(info.hz[0]-root)>1e-9 || Math.abs(info.hz[1]-fifth)>1e-9) miss('drone '+JSON.stringify(info&&info.hz)+' vs the view '+[root,fifth]); }
    { const N=1<<17, re=new Float64Array(N), im=new Float64Array(N); for(let i=0;i<N && i<A.length;i++) re[i]=A[i]*(0.5-0.5*Math.cos(2*Math.PI*i/N));
      for(let i=1,j=0;i<N;i++){ let bit=N>>1; for(;j&bit;bit>>=1) j^=bit; j^=bit; if(i<j){ [re[i],re[j]]=[re[j],re[i]]; } }
      for(let len=2;len<=N;len<<=1){ const ang=-2*Math.PI/len, wr=Math.cos(ang), wi=Math.sin(ang); for(let i=0;i<N;i+=len){ let cr=1,ci=0; for(let q=0;q<len/2;q++){ const p=i+q, r=p+len/2, tr=re[r]*cr-im[r]*ci, ti=re[r]*ci+im[r]*cr; re[r]=re[p]-tr; im[r]=im[p]-ti; re[p]+=tr; im[p]+=ti; const nr=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=nr; } } }
      const bin=48000/N, mag=k=>re[k]*re[k]+im[k]*im[k], near=f=>{ const k0=Math.round(f/bin); let best=k0; for(let k=k0-3;k<=k0+3;k++) if(mag(k)>mag(best)) best=k; return best*bin; };
      const pr=near(root), pf=near(fifth); n+=2; notes.push(`drone peaks ${pr.toFixed(2)} / ${pf.toFixed(2)} Hz (view ${root.toFixed(2)} / ${fifth.toFixed(2)})`);
      if(Math.abs(pr-root)>bin) miss(`root peak ${pr.toFixed(2)} Hz, the view ${root.toFixed(2)}`); if(Math.abs(pf-fifth)>bin) miss(`fifth peak ${pf.toFixed(2)} Hz, the view ${fifth.toFixed(2)}`); }
    /* A4 moves the drone with it */
    { const keep=ST.aRef; try{ ST.setARef(432); const info=await R.engineProbe(async e=>{ e.ambienceOn(true,1,0); return e.ambienceInfo(); }, { sec:0.1 }); n++;
        const k=432/440; if(!info || Math.abs(info.hz[0]-root*k)>1e-6 || Math.abs(info.hz[1]-fifth*k)>1e-6) miss('A4 432: drone '+JSON.stringify(info&&info.hz)+' (expected ×'+k.toFixed(4)+')'); }
      finally { ST.setARef(keep); } }
    /* (4) the crickets at their scheduled onsets: band energy (4.3–4.9 kHz, a 1024-point Hann FFT) of the first 30 ms vs the 60 ms before */
    { const C=AM.AMB.crickets, on=[]; for(let k=0;k<C.n;k++){ const s=AM.cricketStream(C.seed,k); for(let c=s.next(); c.t<SEC-0.3; c=s.next()) if(c.t>0.2) on.push(c.t); }   // the schedule's origin is the build time (0)
      const band=(s0,s1)=>{ let e=0, f=0; for(let a=Math.round(s0*48000); a+1024<=Math.round(s1*48000)+1024 && a<A.length-1024; a+=256){ const re=new Float64Array(1024), im=new Float64Array(1024);
          for(let i=0;i<1024;i++) re[i]=A[a+i]*(0.5-0.5*Math.cos(2*Math.PI*i/1024));
          f++; for(let k=Math.floor(4300/46.875);k<=Math.ceil(4900/46.875);k++){ let sr=0, si=0; for(let i=0;i<1024;i++){ const w=-2*Math.PI*k*i/1024; sr+=re[i]*Math.cos(w); si+=re[i]*Math.sin(w); } e+=sr*sr+si*si; } } return e/Math.max(1,f); };   // the MEAN per frame
      const rise=ts=>{ const r=ts.map(s=>band(s, s+0.03-1024/48000)/Math.max(1e-30, band(s-0.07, s-0.01-1024/48000))).sort((x,y)=>x-y); return r.length ? r[r.length>>1] : 0; };
      const med=rise(on), off=rise(on.map(s=>s+0.35).filter(s=>s<SEC-0.1)); n+=2;   // CONTROL: the same measure 0.35 s off the onsets
      notes.push('cricket onsets: '+on.length+', median band rise '+med.toFixed(1)+'× (off the onsets '+off.toFixed(1)+'×)');
      if(!(on.length>=4 && med>=2 && med>=2*off)) miss(`the crickets do not sound at their scheduled times: median rise ${med.toFixed(1)}× (off the onsets ${off.toFixed(1)}×) over ${on.length} onsets`);
      if(!(off<1.5)) miss(`CONTROL: off the onsets the band also rises ${off.toFixed(1)}× — the onset measure cannot tell`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.65, calm:true, name:'CALM ambience', slow:true, run:()=>checkCalmAmbience(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 7 (C7): row «CALM ghost light» (quick; the probe clock, no sound check): in Calm, the armed ghost fed frame by frame (30 fps) through
   the REAL gestures.processHands (the HAND1 door) plays exactly FOUR solo notes (counted as attacks: a leadOn after nothing or after a
   leadOff), each on a degree of the mood, its light seen by the scene (handsView non-empty while it plays), then it leaves (disarmed, no
   hand); armed again, a REAL hand in the frame ends it at once (CONTROL: without the real hand it would still be on). Start card: Full shows
   none of the Calm start parts (.calm-only hidden). */
export async function checkCalmGhost(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const PR=await import('../profile.js'), G=await import('../gestures.js'), REC=await import('../recorder.js'), GH=await import('../ghost.js'), P=await import('../gestures/pose.js'), ST=await import('../state.js');
  const was=PR.profileCurrent(), clk={ t:0, W:1000, H:600 }, calls=[];   // the probe clock carries the play field (as HAND1's)
  const empty=()=>({ landmarks:[], handednesses:[] });
  try{
    { const el=document.querySelector('.calm-only'); n++; if(el && !document.body.classList.contains('calm-boot') && getComputedStyle(el).display!=='none') miss('a Calm start part shows in Full'); }
    const why=PR.profileApply('profile.calm'); n++; if(why){ miss('Calm did not apply: '+why); return { cases:n, total:d.length, differences:d }; }
    const nDeg=ST.scaleId && (await import('../scales.js')).CUR().iv.length+1;
    G.handsProbe(clk, ()=>true); REC.wTapSet((name,args)=>calls.push([name,args]));
    GH.ghostArm(); let seen=0, frames=0;
    for(let f=0; f<30*16 && GH.ghostOn(); f++){ clk.t+=1000/30; frames++; G.processHandsProbe(GH.ghostFrame(empty(), clk.t, 'Right')); if(G.handsView().length) seen++; }
    let attacks=0, open=new Set(), degs=[];
    for(const [name,args] of calls){ const own=args[0]; if(name==='leadOn'){ if(!open.has(own)){ attacks++; open.add(own); const p=args[1]; if(p && p.deg!=null) degs.push(p.deg); } } else if(name==='leadOff') open.delete(own); }
    n+=4; if(attacks!==4) miss(`the ghost played ${attacks} notes (4 expected)`);
    if(degs.some(x=>!(x>=0 && x<nDeg))) miss('a ghost note off the mood: degrees '+degs.join(','));
    if(!(seen>frames*0.5)) miss(`the scene saw the ghost in ${seen} of ${frames} frames`);
    if(GH.ghostOn()) miss('the ghost did not leave after its four notes');
    /* a real hand ends it at once */
    GH.ghostArm(); for(let f=0;f<20;f++){ clk.t+=1000/30; G.processHandsProbe(GH.ghostFrame(empty(), clk.t, 'Right')); }
    n++; if(!GH.ghostOn()) miss('CONTROL: the re-armed ghost was not on (the real-hand check could not fail)');
    clk.t+=1000/30; G.processHandsProbe(GH.ghostFrame({ landmarks:[P.pose({ x:0.3, y:0.5 })], handednesses:[[{ categoryName:'Right' }]] }, clk.t, 'Right'));
    n++; if(GH.ghostOn()) miss('a real hand did not end the ghost');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ GH.ghostStop(); REC.wTapSet(null); G.handsProbe(null); REC.liveAllOff(); PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1009.8, calm:true, name:'CALM ghost light', run:()=>checkCalmGhost(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
/* RUN 7 (the user's choice on the listening page, 2026-10-18): row «CALM timbre set» (quick): the Calm profile offers EXACTLY four solo
   timbres in this order — Firefly (solo.firefly, the page's «Firefly · Светлячок»), Breath flute, Handpan, Singing bowl — the first is the
   default (row «C0 profile round trip» checks Calm starts on it); each exists in the engine, its record loaded (not skipped) and one short note
   of each sounds; Full keeps every solo timbre (nothing deleted: the pinned list is still offered). CONTROL: a list with one id changed fails. */
export const CALM_SET=Object.freeze(['solo.firefly','solo.breath-flute','solo.handpan','solo.singing-bowl']);
export async function checkCalmSet(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  try{
    const PR=await import('../profile.js'), T=await import('../timbreload.js');
    const same=L=>JSON.stringify(L)===JSON.stringify(CALM_SET);
    n++; if(PR.profileLoadReport().skipped.length) miss('a profile file was skipped: '+PR.profileLoadReport().skipped.join(' · '));
    n++; if(!same(PR.profileOf('profile.calm').timbres)) miss('the loaded Calm profile lists '+JSON.stringify(PR.profileOf('profile.calm').timbres));
    n++; if(same([...CALM_SET.slice(0,3),'solo.kalimba'])) miss('CONTROL: a changed list matched');
    const rep=T.timbreLoadReport(), R=await import('../render.js'), eng=await import('../audio.js?render');
    for(const id of CALM_SET){ n+=3; const b=timbreById(id), rec=T.timbreAll().find(r=>r.id===id);
      if(!b || b.role!=='ld') { miss(id+': not a solo timbre of this engine'); continue; }
      if(!rec || rep.skipped.some(s=>s.startsWith(id))) miss(id+': its record did not load');
      const i=eng.LEAD_INSTR.findIndex(x=>x.id===id), one=await R.goldRender(e=>{ e.applyFx({}); e.leadOn('g',440,0.7,i,off,off,off,off,0.05); e.leadOff('g',off,0.6); }, 0.8);
      if(!(rms(one.L,one.rate,0.06,0.4)>1e-4)) miss(id+': a note is silent'); }
    const ld=timbresOf('ld').map(x=>x.id); n++; for(const id of ['solo.firefly-rich','solo.kalimba','solo.breath-pad','solo.glass-pad','solo.supersaw']) if(!ld.includes(id)) miss('Full lost '+id);
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1009.55, calm:true, name:'CALM timbre set', run:()=>checkCalmSet(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
/* RUN 7 (C5): row «CALM effects hand» (quick): in Calm the effects hand (Left, through the REAL processHands on the probe clock) pinching its
   index / middle / ring finger and dragging UP raises exactly that finger's effect — Echo, Warmth / Brightness, Wave — and leaves the other two
   EXACTLY as they were (one owner per value, rule #29); the forest shows them: a Warmth tilt of 0 turns the light amber (the token), a note with
   Echo on schedules rings that appear at their echo times. CONTROL: a drag of the PLAYING hand moves none of the three. Values restored. */
export async function checkCalmFx(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const PR=await import('../profile.js'), G=await import('../gestures.js'), REC=await import('../recorder.js'), P=await import('../gestures/pose.js'), ST=await import('../state.js');
  const was=PR.profileCurrent(), clk={ t:0, W:1000, H:600 }, key=ST.chainKeyOf('ld'), FX=[['cecho',0],['ctone',1],['cwave',1]];
  let keep=null;
  try{
    const why=PR.profileApply('profile.calm'); n++; if(why){ miss('Calm did not apply: '+why); return { cases:n, total:d.length, differences:d }; }
    const ps=FX.map(([id,i])=>G.fxParamsOf(key,id)[i]), get=()=>ps.map(p=>p.get()); keep=get();
    G.handsProbe(clk, ()=>true); REC.wTapSet(()=>{});
    const frame=hands=>{ clk.t+=1000/30; G.processHandsProbe({ landmarks:hands.map(h=>P.pose(h.p)), handednesses:hands.map(h=>[{ categoryName:h.key }]) }); };
    const drag=(key2,f)=>{ const gaps=[1,1,1,1]; for(let k=0;k<3;k++) frame([{ key:key2, p:{ x:0.25, y:0.65, gaps } }]);
      gaps[f]=0.05; for(let k=0;k<=12;k++) frame([{ key:key2, p:{ x:0.25, y:0.65-0.3*k/12, gaps } }]);
      for(let k=0;k<3;k++) frame([{ key:key2, p:{ x:0.25, y:0.35, gaps:[1,1,1,1] } }]); for(let k=0;k<6;k++) frame([]); };
    for(let f=0;f<3;f++){ const a=get(); drag('Left', f); const b=get(); n+=2;
      if(!(b[f]>a[f]+0.05)) miss(`finger ${f} (${FX[f][0]}): ${a[f].toFixed(3)} → ${b[f].toFixed(3)} (up expected)`);
      const others=b.filter((v,i)=>i!==f && v!==a[i]); if(others.length) miss(`finger ${f} also moved another effect: ${JSON.stringify(a)} → ${JSON.stringify(b)}`); }
    { const a=get(); drag('Right', 0); const b=get(); n++; if(JSON.stringify(a)!==JSON.stringify(b)) miss('CONTROL: the playing hand moved an effect: '+JSON.stringify(a)+' → '+JSON.stringify(b)); }
    /* the forest's visuals (numbers from the room, never pixels) */
    const D=await import('../draw.js'), H=await import('../views/scene/host.js'), PAL=await import('../palette.js');
    await D.setBackground('forest'); const room=H.sceneRoomDbg(); n++;
    if(!room) miss('the forest room did not open');
    else{ const hv=[{ x:500, y:300, d:0.4, play:true }];
      room.update(0.016, 100, hv, { echo:1, time:0.2, fb:0.5, tone:0, wave:0 }); const c=room.state().fx.color, w=new (window.THREE.Color)(PAL.cv('forest-warm')); n++;
      if(Math.abs(c[0]-w.r)+Math.abs(c[1]-w.g)+Math.abs(c[2]-w.b)>1e-3) miss('Warmth 0: the light is '+JSON.stringify(c)+', not the warm token');
      room.glint(0, 0.8); const due=room.state().fx.echoesDue; room.update(0.016, 100.25, hv, { echo:1, time:0.2, fb:0.5, tone:0, wave:0 }); n+=2;
      if(!(due>=2)) miss('a note with Echo scheduled '+due+' rings'); if(!(room.state().fx.rings>=1)) miss('no ring appeared at the first echo');
      room.update(0.016, 101, [], { echo:0, time:0.625, fb:0, tone:0.5, wave:0 }); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ const key2=ST.chainKeyOf('ld'); if(keep) FX.forEach(([id,i],k)=>{ const p=G.fxParamsOf(key2,id)[i]; if(p) p.set(keep[k]); }); }catch(e){}
    REC.wTapSet(null); G.handsProbe(null); REC.liveAllOff(); PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1009.85, calm:true, name:'CALM effects hand', drawn:true, run:()=>checkCalmFx(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
/* RUN 7 (C5): row «CALM effects × timbres» (P.all — slow, ≈ 20 renders): each of the four Calm sounds through Calm's chain with each effect at
   full (Echo, Warmth, Brightness, Wave) against none: loudness within +2 / −2 dB (Echo builds up no more than +2 dB — the long bowl included),
   no click (curvature ≤ 0.5). The measured values are the row's notes. */
export async function checkCalmFxTimbres(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  try{
    const R=await import('../render.js'), eng=await import('../audio.js?render'), ST=await import('../state.js'), key=ST.chainKeyOf('ld');
    const mid=b=>{ const m=new Float32Array(b.L.length); for(let i=0;i<m.length;i++) m[i]=(b.L[i]+b.R[i])/2; return m; };
    const base={ 'ctone:mix':1, 'ctone:tilt':0.5, 'cwave:mix':1, 'cwave:amount':0, 'cecho:amount':0, 'cecho:time':0.8431089342012043, 'fdepth:mix':1, 'fdepth:depth':0.4, 'fdepth:room':0.5 };
    const cases={ echo:{ 'cecho:amount':1 }, warm:{ 'ctone:tilt':0 }, bright:{ 'ctone:tilt':1 }, wave:{ 'cwave:amount':1 } };
    const one=async(i,set)=>mid(await R.goldRender(e=>{ [440,493.88,554.37,659.26].forEach((f,k)=>{ e.applyFx({}); e.leadOn('p'+k,f,0.7,i,off,off,off,off,0.05+k); e.leadOff('p'+k,off,0.95+k); }); }, 7.0,
      { [key]:{ ids:['ctone','cwave','cecho','fdepth'], set:{ ...base, ...set } } }));
    for(const id of CALM_SET){ const i=eng.LEAD_INSTR.findIndex(x=>x.id===id), L0=kLoud(await one(i,{}),48000), line=[];
      for(const [nm,set] of Object.entries(cases)){ const m=await one(i,set), L=kLoud(m,48000)-L0, c=clickOf(m,48000); n+=2; line.push(nm+' '+(L>=0?'+':'')+L.toFixed(2));
        if(!(L<=2 && L>=-2)) miss(`${id} with ${nm}: ${L.toFixed(2)} dB`); if(!(c<=0.5)) miss(`${id} with ${nm}: a click ${c.toFixed(3)}`); }
      notes.push(id+': '+line.join(', ')); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.86, calm:true, name:'CALM effects × timbres', slow:true, run:()=>checkCalmFxTimbres(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
