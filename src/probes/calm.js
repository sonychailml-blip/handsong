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
/* RUN 7 (C4b; RUN 8 equal power): row «CALM depth → forest» (quick): in Calm the solo chain holds «Forest depth» and the playing hand's
   depth drives it — the aim door (the same fxParamsOf().set the hand uses) at d = 0, ½, 1 puts the live instance on core/dsp.calmDepth exactly
   (send, dry, the room's cut-off; read after the 80-ms glides settle, within 2e-3); Full's Night forest keeps its send range 0…1 (unchanged).
   CONTROL: the near and far curve points must differ (a curve stuck at one value would pass the first check). */
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
        const reach=inst.params[3] ? inst.params[3].cur : 1, c=DSP.calmDepth(x*reach), N=inst.nodes; n+=5;   // RUN 8: the hand's depth moves within the «Лес» slider's reach
        const got={ send:inst.send.gain.value, dry:N.dry.gain.value, lp:N.lp.frequency.value }; n--;
        if(Math.abs(got.send-c.send)>2e-3) miss(`d=${x}: send ${got.send.toFixed(4)} (curve ${c.send})`);
        if(Math.abs(got.dry-c.dry)>2e-3) miss(`d=${x}: dry ${got.dry.toFixed(4)} (curve ${c.dry})`);
        if(Math.abs(got.lp-c.lp)>c.lp*2e-3) miss(`d=${x}: cut-off ${got.lp.toFixed(1)} Hz (curve ${c.lp.toFixed(1)})`); }
    } finally { ps[1].set(keep); }
    const F=A.FX_FACTORY.forest.params.find(p=>p.key==='mix'); n++; if(!(F.min===0 && F.max===1)) miss(`Full's Night forest send range changed: ${F.min}…${F.max}`);
    { const a=DSP.calmDepth(0), b=DSP.calmDepth(1); n++; if(!(Math.abs(a.send-b.send)>0.5 && Math.abs(a.lp-b.lp)>500)) miss('CONTROL: near and far are the same point of the curve — the check cannot fail'); }
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
   none of the Calm start parts (.calm-only hidden). RUN 8: each ghost note plays at a NORMAL level — its volume (the gesture's own output)
   ≥ GHOST_VOL (CONTROL: RUN 7's path around the middle, x 0.5 ± 0.24, pinches below it). */
const GHOST_VOL=0.55;
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
    let attacks=0, open=new Set(), degs=[], vols=[];
    for(const [name,args] of calls){ const own=args[0]; if(name==='leadOn'){ if(!open.has(own)){ attacks++; open.add(own); const p=args[1]; if(p && p.deg!=null) degs.push(p.deg); if(p) vols.push(p.vol); } } else if(name==='leadOff') open.delete(own); }
    n+=2; if(!vols.length || vols.some(v=>!(v>=GHOST_VOL))) miss('a ghost note too quiet: volumes '+vols.map(v=>(+v).toFixed(2)).join(', ')+' (≥ '+GHOST_VOL+' expected)');
    { const G=GH.GHOST, old=[]; for(let k=0;k<G.notes;k++) old.push(0.5+0.24*Math.sin(2*Math.PI*(k*G.every+G.down)/G.px));   // RUN 7's x at each pinch = its volume (Calm: volume = x)
      if(!old.some(x=>x<GHOST_VOL)) miss('CONTROL: the RUN 7 ghost path would pass the volume check — it cannot fail'); }
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
/* RUN 8 (the crackle, slice 1): row «CALM stress» (P.all / P.calm — slow; one part real time). Measured cause: a struck note (Firefly, Handpan,
   Singing bowl) makes its own oscillators and nothing capped them — fast playing piled up ~1000 live sources and the audio thread underran
   (in Full too). Fix (Calm only — the user: Full exactly as before): a strike cap per timbre in data/profiles/calm.json «voices»
   (modules/timbres/strikes.js fades the oldest strike), set in the render copy as the Calm face sets it live.
   (A) OFFLINE, deterministic — each Calm sound plays a dense passage (48 notes in 3.9 s, four owners overlapping, vol 1, Calm's level trim)
       through Calm's chain (Echo 0.6, Wave 0.5, the forest): VOICES BOUNDED — the ringing strikes of the timbre never exceed its
       Calm cap (CONTROL: the cap off, the Singing bowl exceeds it); NO CLIPPING — the peak before the limiter ≤ −1 dBFS, the limiter's
       ceiling, so it never has to act (CONTROL: the same passage with the copy's master +12 dB exceeds it); THE CAP ADDS NO CLICK — dry
       renders repeat sample for sample, so «capped − uncapped» is exactly what the cap took away (the faded strikes' tails): its worst
       curvature ≤ 0.25 of its local peak — a smooth fade reads the waveform's own curvature (Firefly's triangle corners ≈ 0.08–0.12) — (CONTROL: Firefly — no lowpass in its bank — with a capped strike CUT without its fade, a step,
       must exceed 0.5; through Calm's darkening chain a step reads only ≈ 0.1, so the test is dry).
   (B) REAL TIME — justified: dropouts happen only on the real audio thread (nothing offline shows them). Calm, the Forest background, its
       ambience, the effects on; a synthetic playing hand (the probe clock = the real clock) pinches four fingers in turn, overlapping (8 attacks
       a second, slowly drifting over the rows) for 6 s per sound. The REFERENCE is the user's own: «the standard app never crackled on this
       laptop» — the same playing in Full with its solo sound, measured before and after in the same session (a hot, throttled laptop drops out
       even idle: measured 10–39 in 2 s after an hour of runs, 0 when cool). Each Calm sound may drop out no more than that reference + 2, and
       its live ringing strikes stay ≤ the cap. When the reference ITSELF drops out (> 2 in 6 s — RUN 8 measured 163 on a hot laptop) the
       computer cannot judge: the part reads «not judged» with every number (as a drawn row reads «tab hidden»); the offline parts still
       decide. CONTROL: a probe worklet that stalls the audio thread for ≈ 0.5 s must be counted. */
const STRESS={ sec:6, notes:48, dt:0.08, hold:0.3, chain:{ 'ctone:mix':1, 'ctone:tilt':0.5, 'cwave:mix':1, 'cwave:amount':0.5, 'cecho:amount':0.6,
  'cecho:time':0.8431089342012043, 'fdepth:mix':1, 'fdepth:depth':0.4, 'fdepth:room':0.5 } };
export async function checkCalmStress(opt={}){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const PR=await import('../profile.js'), ST=await import('../state.js'), T=await import('../timbreload.js'), A=await import('../audio.js');
  const was=PR.profileCurrent(), key=ST.chainKeyOf('ld'), voices=(PR.profileOf('profile.calm')||{}).voices||{}, capOf=id=>voices[id];   // Calm's caps (the profile's «voices»)
  const levels=(PR.profileOf('profile.calm')||{}).levels||null;   // slice 2: Calm's per-timbre trims (dB), applied by the copy as live
  try{
    /* (A) offline */
    const R=await import('../render.js');
    const F=[440, 493.88, 554.37, 659.26, 739.99];
    const dense=(id,dbg,boost)=>{ const out={ worst:0 }; return { out, play:e=>{ if(dbg) e.setDbg(dbg); e.setTimbreTrim(levels); e.setCalmStrikes(voices); e.applyFx({}); const E=e.engineCtx(), i=e.LEAD_INSTR.findIndex(x=>x.id===id);
      if(boost) E.master.in.gain.value*=boost;   // the peak CONTROL: the real path, louder
      for(let k=0;k<STRESS.notes;k++){ const t=0.05+k*STRESS.dt, own='s'+(k%4); e.leadOn(own, F[k%5], 1, i, off,off,off,off, t); e.leadOff(own, off, t+STRESS.hold);
        out.worst=Math.max(out.worst, E.pool.ld.strikes.filter(s=>s.id===id && !s.faded && s.t<=t && s.end>t).length); } } }; };
    const chains={ [key]:{ ids:['ctone','cwave','cecho','fdepth'], set:STRESS.chain } };
    const peakOf=b=>{ let p=0; for(const x of [b.L,b.R]) for(let i=0;i<x.length;i++){ const v=Math.abs(x[i]); if(v>p) p=v; } return p; };
    const len=0.05+STRESS.notes*STRESS.dt+1.2;
    const go=async(id,dbg,boost,dry)=>{ const s=dense(id,dbg,boost), b=await R.goldRender(s.play, len, dry ? {} : chains); return { worst:s.out.worst, b }; };
    /* what the cap took away (renders repeat sample for sample) → its worst curvature against the local peak (±5 ms), counted only where that
       peak is ≥ −40 dB of the whole difference (a sound's own faint high partials are no click); nothing taken (identical renders) → 0 */
    const taken=(a,u)=>{ const n2=a.b.L.length, m=new Float32Array(n2); let pk=0; for(let i=0;i<n2;i++){ m[i]=(a.b.L[i]+a.b.R[i]-u.b.L[i]-u.b.R[i])/2; pk=Math.max(pk,Math.abs(m[i])); } return { m, pk }; };
    const fadeClick=({ m, pk }, rate)=>{ if(!(pk>1e-6)) return 0; const w=Math.round(0.005*rate), blk=Math.max(1,w>>2), bp=new Float32Array(Math.ceil(m.length/blk));
      for(let i=0;i<m.length;i++){ const v=Math.abs(m[i]), b=(i/blk)|0; if(v>bp[b]) bp[b]=v; }
      let worst=0; for(let i=2;i<m.length;i++){ let p=0; for(let b=Math.max(0,((i-w)/blk)|0); b<=Math.min(bp.length-1,((i+w)/blk)|0); b++) if(bp[b]>p) p=bp[b];
        if(p<0.01*pk) continue; const c=Math.abs(m[i]-2*m[i-1]+m[i-2])/p; if(c>worst) worst=c; }
      return worst; };
    for(const id of CALM_SET){
      const cap=capOf(id), a=await go(id,null), da=await go(id,null,0,true), u=await go(id,{ noStrikeCap:true },0,true);
      const pk=20*Math.log10(peakOf(a.b)+1e-12), ca=fadeClick(taken(da,u),a.b.rate); n+=3;
      notes.push(`${id}: ringing ≤ ${a.worst} (cap ${cap ?? 'none'}; uncapped ${u.worst}), peak ${pk.toFixed(1)} dBFS, the cap's fade: curvature ${ca.toFixed(3)}`);
      if(cap!=null && !(a.worst<=cap)) miss(`${id}: ${a.worst} strikes rang at once (cap ${cap})`);
      if(!(pk<=-1)) miss(`${id}: the dense passage peaks at ${pk.toFixed(2)} dBFS before the limiter (≤ −1 expected)`);
      if(!(ca<=0.25)) miss(`${id}: the cap's fade clicks (curvature ${ca.toFixed(3)} of the local peak, ≤ 0.25 expected)`);
      if(id==='solo.singing-bowl'){ n+=3;
        if(!(u.worst>cap)) miss(`CONTROL: with the cap off the Singing bowl rang only ${u.worst} strikes (≤ its cap ${cap}) — the bound cannot fail`);
        const loud=await go(id,null,4), pl=20*Math.log10(peakOf(loud.b)+1e-12); if(!(pl>-1)) miss(`CONTROL: +12 dB peaks at ${pl.toFixed(2)} dBFS — the peak measure cannot fail`);
        const ff='solo.firefly', cut=await go(ff,{ strikeCut:true },0,true), fu=await go(ff,{ noStrikeCap:true },0,true), cc=fadeClick(taken(cut,fu),cut.b.rate);
        notes.push(`CONTROL Firefly cut without its fade: curvature ${cc.toFixed(3)}`);
        if(!(cc>0.5)) miss(`CONTROL: a capped strike cut without its fade gives ${cc.toFixed(3)} — the click test cannot fail`); }
    }
    if(opt.offlineOnly) return { cases:n, total:d.length, differences:d, notes };
    /* (B) real time */
    const AC=A.AC, pb=()=>{ try{ const s=AC.playbackStats; return s && Number.isFinite(s.underrunEvents) ? s.underrunEvents : null; }catch(e){ return null; } };
    if(!AC || AC.state!=='running' || pb()==null){ notes.push('real-time part not checked: '+(!AC||AC.state!=='running' ? 'the audio is not running' : 'this browser does not count dropouts')); return { cases:n, total:d.length, differences:d, notes }; }
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    { await A.probeCaptureReady(); const g=AC.createGain(); g.gain.value=0; g.connect(AC.destination);
      const before=pb(), w=new AudioWorkletNode(AC, 'probe-burn', { numberOfInputs:0, numberOfOutputs:1, processorOptions:{ ms:8, blocks:60 } }); w.connect(g);
      await wait(1500); const got=pb()-before; w.disconnect(); g.disconnect(); n++; notes.push('CONTROL stall: '+got+' underrun(s) counted');
      if(!(got>0)) miss('CONTROL: a 0.5-s stall of the audio thread was not counted — the dropout counter is blind'); }
    const G=await import('../gestures.js'), REC=await import('../recorder.js'), PO=await import('../gestures/pose.js'), D=await import('../draw.js'), E=A.engineCtx();
    /* the playing pattern → { ur: underruns while playing, idle: in 2 s with no hand just before, most: this timbre's ringing strikes } */
    const play=async id=>{ await wait(1000); const i0=pb(); await wait(2000); const idle=pb()-i0;
      const clk={ t:performance.now(), W:1000, H:600 }, u0=pb(), t0=performance.now(); let most=0;
      G.handsProbe(clk, ()=>true);
      try{ await new Promise(res=>{ const iv=setInterval(()=>{ const t=(performance.now()-t0)/1000; clk.t=performance.now();
          if(t>STRESS.sec){ clearInterval(iv); G.processHandsProbe({ landmarks:[], handednesses:[] }); res(); return; }
          const gaps=[0,1,2,3].map(f=>(((t*2)+f*0.25)%1)<0.5 ? 0.05 : 1);
          G.processHandsProbe({ landmarks:[PO.pose({ x:0.5+0.2*Math.sin(2*Math.PI*t/14), y:0.5+0.3*Math.sin(2*Math.PI*t/10), s:0.2, gaps })], handednesses:[[{ categoryName:'Right' }]] });
          most=Math.max(most, E.pool.ld.strikes.filter(x=>x.id===id && !x.faded && x.end>AC.currentTime).length); }, 33); }); }   // this timbre's own (another's tails may still ring)
      finally{ G.handsProbe(null); REC.liveAllOff(); }
      await wait(1000); return { ur:pb()-u0, idle, most }; };
    const full=async()=>{ const why=PR.profileApply('profile.full'); if(why) throw new Error('Full did not apply: '+why); const r=await play(A.timbreIdOf('ld',ST.leadIdx)); return r; };
    const ref0=await full();
    const why=PR.profileApply('profile.calm'); n++; if(why){ miss('Calm did not apply: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await D.setBackground('forest');
    const got=[];
    const fx=[['cecho',0,0.6],['ctone',1,0.5],['cwave',1,0.5]], keep=fx.map(([id,i])=>G.fxParamsOf(key,id)[i].get());
    try{
      fx.forEach(([id,i,v])=>G.fxParamsOf(key,id)[i].set(v));
      for(const id of CALM_SET){
        for(let k=0;k<6 && A.timbreIdOf('ld',ST.leadIdx)!==id;k++){ document.getElementById('calmSound').click(); await wait(30); }
        n++; if(A.timbreIdOf('ld',ST.leadIdx)!==id){ miss('could not choose '+id+' in Calm'); continue; }
        const cap=capOf(id), r=await play(id); n++; got.push([id,r]);
        notes.push(`live ${id}: ${r.ur} underrun(s) playing, ${r.idle} in 2 s idle before, ringing strikes ≤ ${r.most} (cap ${cap ?? 'none'}), voices built ${E.pool.ld.v.length}`);
        if(cap!=null && r.most>cap) miss(`live ${id}: ${r.most} strikes rang at once (cap ${cap})`);
      }
    } finally{ fx.forEach(([id,i],k)=>{ const p=G.fxParamsOf(key,id)[i]; if(p) p.set(keep[k]); }); }
    const ref1=await full(), ref=Math.max(ref0.ur, ref1.ur);
    notes.push(`reference (Full, its solo sound, the same playing): ${ref0.ur} before, ${ref1.ur} after (idle ${ref0.idle} / ${ref1.idle})`);
    if(ref>2) notes.push(`real-time part not judged: the standard app itself dropped out ${ref} times in ${STRESS.sec} s (a hot or busy computer) — Calm: `+got.map(([id,r])=>id+' '+r.ur).join(', '));
    else for(const [id,r] of got){ n++; if(r.ur>ref+2) miss(`live ${id}: ${r.ur} audio dropout(s) in ${STRESS.sec} s of fast playing — the standard app, the same playing: ${ref} (+2 allowed)`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.9, calm:true, name:'CALM stress', slow:true, realtime:true, run:()=>checkCalmStress(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 8 (slice 2; the user: «depth changes only the amount of forest, never the loudness»): row «CALM depth loudness» (P.all / P.calm — slow:
   ≈ 13 short offline renders through the engine copy). Each Calm sound — four 1-s notes (vol 0.7, Calm's level trim) through «Forest depth»
   (Medium room) — at d = 0 (near), ½ and 1 (far): the K-like loudness (the listening page's measure, kLoud) stays within ±DEPTH_DB of near.
   CONTROL: the far note at RUN 7's far dry level (0.45) with no room must leave the band (the measure sees a loss of that size).
   LEVELS (slice 2): with Calm's per-timbre trims (data/profiles/calm.json «levels»), the four sounds near lie within ±DEPTH_DB of their mean
   (CONTROL: Firefly without its trim lies far outside — it was 18 dB down). */
const DEPTH_DB=1.5;
export async function checkCalmDepthLoud(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  try{
    const R=await import('../render.js'), ST=await import('../state.js'), PR=await import('../profile.js'), key=ST.chainKeyOf('ld');
    const levels=(PR.profileOf('profile.calm')||{}).levels||null;
    const mid=b=>{ const m=new Float32Array(b.L.length); for(let i=0;i<m.length;i++) m[i]=(b.L[i]+b.R[i])/2; return m; };
    const F=[440, 493.88, 554.37, 659.26];
    const phrase=(id,vol,trim=levels)=>e=>{ e.setTimbreTrim(trim); const i=e.LEAD_INSTR.findIndex(x=>x.id===id); F.forEach((f,k)=>{ e.applyFx({}); e.leadOn('p'+k,f,vol,i,off,off,off,off,0.05+1.0*k); e.leadOff('p'+k,off,0.05+1.0*k+0.9); }); };
    const at=async(id,dp)=>kLoud(mid(await R.goldRender(phrase(id,0.7), 6.5, { [key]:{ ids:['fdepth'], set:{ 'fdepth:mix':1, 'fdepth:depth':dp, 'fdepth:room':0.5 } } })),48000);
    const near={};
    for(const id of CALM_SET){ const L0=await at(id,0), Lh=await at(id,0.5), L1=await at(id,1); n+=2; near[id]=L0;
      notes.push(`${id}: near ${L0.toFixed(2)} dB, half ${(Lh-L0>=0?'+':'')+(Lh-L0).toFixed(2)}, far ${(L1-L0>=0?'+':'')+(L1-L0).toFixed(2)}`);
      if(Math.abs(Lh-L0)>DEPTH_DB) miss(`${id}: half way ${(Lh-L0).toFixed(2)} dB from near (±${DEPTH_DB})`);
      if(Math.abs(L1-L0)>DEPTH_DB) miss(`${id}: far ${(L1-L0).toFixed(2)} dB from near (±${DEPTH_DB})`);
      if(id===CALM_SET[0]){ const old=kLoud(mid(await R.goldRender(phrase(id,0.7*Math.sqrt(0.45)), 6.5)),48000); n++;   // vol is v² → amplitude 0.45
        notes.push(`CONTROL RUN 7 far dry level, no room: ${(old-L0).toFixed(2)} dB`);
        if(!(Math.abs(old-L0)>DEPTH_DB)) miss(`CONTROL: RUN 7's far level reads ${(old-L0).toFixed(2)} dB — the band cannot fail`); } }
    { const v=Object.values(near), mean=v.reduce((a,b)=>a+b,0)/v.length; n++;
      notes.push('near, with the trims: '+CALM_SET.map(id=>id+' '+((near[id]-mean)>=0?'+':'')+(near[id]-mean).toFixed(2)).join(', ')+' dB from their mean');
      for(const id of CALM_SET) if(Math.abs(near[id]-mean)>DEPTH_DB) miss(`${id}: ${(near[id]-mean).toFixed(2)} dB from the other Calm sounds (±${DEPTH_DB})`);
      const ff=CALM_SET[0], raw=kLoud(mid(await R.goldRender(phrase(ff,0.7,null), 6.5, { [key]:{ ids:['fdepth'], set:{ 'fdepth:mix':1, 'fdepth:depth':0, 'fdepth:room':0.5 } } })),48000); n++;
      notes.push(`CONTROL ${ff} without its trim: ${(raw-mean).toFixed(2)} dB`); if(!(Math.abs(raw-mean)>DEPTH_DB)) miss(`CONTROL: ${ff} without its trim sits within the band — the level check cannot fail`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.62, calm:true, name:'CALM depth loudness', slow:true, run:()=>checkCalmDepthLoud(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 8 (slice 3 + addendum 1, 3, 5): row «CALM bars and fireflies» (quick, drawn). In Calm, two synthetic hands through the REAL processHands
   (the probe clock) — the app's own loop then publishes and draws them (main.onHands → handsView → the shell's bars, the hands overlay):
   (1) FIREFLIES: the five fingertips of each hand only, each exactly on its remapped landmark of this frame (≤ 1e-6 px — no lag); the playing
       hand's sounding finger (index) lit, the other four not; the halo far (small hand) wider than near (CONTROL: «all joints» draws no tips);
   (2) BARS: the forest bar on the playing hand's side, the three effects on the other; the bar of the effects finger in use (middle → Warm ↔
       Bright) glows, the others not; hands swapped sides → the bars follow; hands gone → both sets fade out;
   (3) the effects hand's one-line hint shows the first time (this device's mark cleared and restored);
   (4) ONE MESSAGE AT A TIME: with the low-light message on, the «Raise a hand» line is hidden (CONTROL: without the rule they overlap here). */
export async function checkCalmBars(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const PR=await import('../profile.js'), G=await import('../gestures.js'), REC=await import('../recorder.js'), PO=await import('../gestures/pose.js'), ST=await import('../state.js');
  const SH=await import('../calmshell.js'), PV=await import('../views/play.js'), LM=await import('../latmeter.js'), V=await import('../vision.js');   // LM: darkHideDbg
  const was=PR.profileCurrent(), clk={ t:1e6, W:V.canvas.width, H:V.canvas.height }, raf=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const wait=ms=>new Promise(r=>setTimeout(r,ms)), HINT='handsong.calmFxHint', keepHint=(()=>{ try{ return localStorage.getItem(HINT); }catch(e){ return null; } })();
  let view=null;
  try{
    const why=PR.profileApply('profile.calm'); n++; if(why){ miss('Calm did not apply: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    view={ ...ST.calmView }; ST.setCalmView({ ...view, tips:true });
    try{ localStorage.removeItem(HINT); }catch(e){}
    G.handsProbe(clk, ()=>true); REC.wTapSet(()=>{});
    const frame=(hands,k=3)=>{ for(let i=0;i<k;i++){ clk.t+=1000/30; G.processHandsProbe({ landmarks:hands.map(h=>PO.pose(h.p)), handednesses:hands.map(h=>[{ categoryName:h.key }]) }); } };
    const two=(px,fx,s)=>[{ key:'Right', p:{ x:px, y:0.5, s, gaps:[0.05,1,1,1] } }, { key:'Left', p:{ x:fx, y:0.45, s:0.2, gaps:[1,0.05,1,1] } }];
    frame(two(0.75,0.25,0.3),6); await raf(); await wait(80); await raf();
    const tips=PV.calmTipsDrawDbg(), mine=tips.filter(t=>t.key==='Right'), S=G.HANDS.Right; n+=3;
    if(tips.length!==10) miss(`${tips.length} fingertip fireflies drawn (10 expected: five per hand)`);
    { let worst=0; mine.forEach(t=>{ const lm=S.lm[[4,8,12,16,20][t.tip]]; worst=Math.max(worst, Math.abs(t.x-ST.sx(lm.x,clk.W)), Math.abs(t.y-ST.sy(lm.y,clk.H))); });
      notes.push('fireflies off their joints by '+worst.toExponential(1)+' px'); if(!(mine.length===5 && worst<=1e-6)) miss(`the fireflies are not on the joints: ${mine.length} tips, off by ${worst} px`); }
    { const lit=mine.filter(t=>t.lit).map(t=>t.tip); if(JSON.stringify(lit)!=='[1]') miss('the lit fingertips of the playing hand: '+JSON.stringify(lit)+' (only the index, 1, expected)'); }
    const near=(mine.find(t=>t.tip===1)||{}).halo||0;
    frame(two(0.75,0.25,0.12),8); await raf(); await wait(80); await raf();
    const far=((PV.calmTipsDrawDbg().find(t=>t.key==='Right'&&t.tip===1))||{}).halo||0; n++; notes.push(`halo near ${near.toFixed(1)} px, far ${far.toFixed(1)} px`);
    if(!(far>near*1.3)) miss(`the halo does not widen far away: near ${near.toFixed(1)}, far ${far.toFixed(1)} px`);
    frame(two(0.75,0.25,0.3),4); await raf(); await wait(120);
    let B=SH.calmShellDbg().bars; n+=4;
    if(!(B.forest.on && B.forest.side==='right')) miss('the forest bar is not on the playing hand\'s side: '+JSON.stringify(B.forest));
    if(!(B.fx.on && B.fx.side==='left')) miss('the effect bars are not on the effects hand\'s side: '+JSON.stringify({ on:B.fx.on, side:B.fx.side }));
    { const act=Object.entries(B.fx.bars).filter(([,b])=>b.act).map(([k])=>k); if(JSON.stringify(act)!=='["tone"]') miss('glowing effect bars '+JSON.stringify(act)+' (only «tone» — the middle finger — expected)'); }
    n++; if(!SH.calmShellDbg().hint) miss('the effects hand\'s first-time hint did not show');
    frame(two(0.25,0.75,0.3),6); await raf(); await wait(120); B=SH.calmShellDbg().bars; n++;
    if(!(B.forest.side==='left' && B.fx.side==='right')) miss('the bars did not follow the hands to the other sides: '+B.forest.side+' / '+B.fx.side);
    frame([],3); clk.t+=3000; frame([],1); await wait(150); await raf(); B=SH.calmShellDbg().bars; n++;   // past the hands' watchdog
    if(B.forest.on || B.fx.on) miss('the bars stay on with no hands');
    ST.setCalmView({ ...ST.calmView, tips:false }); frame(two(0.75,0.25,0.3),3); await raf(); await wait(60); n++;
    if(PV.calmTipsDrawDbg().length) miss('CONTROL: «all joints» still drew fingertip fireflies — the tips check cannot fail');
    ST.setCalmView({ ...ST.calmView, tips:true });
    /* one message at a time */
    frame([],2); G.handsProbe(null);
    const sh=document.getElementById('calmShell'), idle=document.getElementById('calmIdle'), hint=document.getElementById('darkHint');
    const fade=document.getElementById('calmFade'); fade.style.transition='none'; fade.style.visibility='visible'; fade.style.opacity='1';   // the controls' layer as when shown (the shell's own loop toggles only its class)
    document.body.classList.add('dark-on'); hint.classList.add('on');   // the message's decision is LAT3's own row; here only the layout
    await raf(); const box=e=>e.getBoundingClientRect(), cross=(a,b)=>!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);
    n+=2; if(getComputedStyle(idle).visibility!=='hidden' && cross(box(idle),box(hint))) miss('the low-light message and «Raise a hand» overlap');
    document.body.classList.remove('dark-on'); await raf(); n++;
    notes.push('without the low-light message the line is '+getComputedStyle(idle).visibility+'; boxes at '+innerWidth+'×'+innerHeight+(cross(box(idle),box(hint))?' overlap':' do not touch')+' (ui-snap checks phone sizes)');
    if(getComputedStyle(idle).visibility!=='visible') miss('CONTROL: «Raise a hand» stays hidden without the low-light message — the check cannot fail');
    LM.darkHideDbg(); fade.style.visibility=''; fade.style.opacity=''; fade.style.transition='';
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ G.handsProbe(null); }catch(e){} REC.wTapSet(null); REC.liveAllOff(); try{ if(keepHint==null) localStorage.removeItem(HINT); else localStorage.setItem(HINT, keepHint); }catch(e){}
    if(view) ST.setCalmView(view); PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.87, calm:true, name:'CALM bars and fireflies', drawn:true, run:()=>checkCalmBars(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 8 (C8, Calm plan §7): row «CALM low power» (quick; offline renders + the live toggle). The person's «Lighter forest» (ⓘ):
   (1) LIVE — on: the engine's low power is on, «Forest depth» plays the light room (its convolution input ramps to EXACTLY 0, so the browser
       stops computing the room), the forest picture is at medium and the glass plain; off: all of it back exactly as before (the device's
       stored choice and scene level restored);
   (2) VOICES — in low power a struck timbre rings at most 60 % of its cap (the Singing bowl 3 → 2, Firefly 8 → 5) — CONTROL: the same
       passage at full power rings 3 bowls;
   (3) THE LIGHT ROOM sounds like the forest — the K-like loudness of Firefly and Breath flute far and half way within ±1.5 dB of the
       convolution room (measured +1.2 / +0.3 dB) — CONTROL: the light room with its return untrimmed (×2, +6 dB) leaves the band. */
export async function checkCalmLowPower(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const PR=await import('../profile.js'), ST=await import('../state.js'), A=await import('../audio.js'), D=await import('../draw.js'), T=await import('../timbreload.js');
  const was=PR.profileCurrent(), key=ST.chainKeyOf('ld'), KEYS=['handsong.calmLight','handsong.calmLightScene','handsong.sceneLevel'], voices=(PR.profileOf('profile.calm')||{}).voices||{};
  const keep=KEYS.map(k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } }), wait=ms=>new Promise(r=>setTimeout(r,ms));
  try{
    /* (1) live */
    const why=PR.profileApply('profile.calm'); n++; if(why){ miss('Calm did not apply: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    try{ localStorage.setItem('handsong.calmLight','0'); }catch(e){}
    await D.setSceneLevel('full'); await D.setBackground('forest');
    const E=A.engineCtx(), I=A.fxInstance(key,'fdepth'), tg=document.getElementById('calmLightTg'), lvl0=D.sceneLevel();
    const settle=async()=>{ const t0=A.AC.currentTime; for(let k=0;k<60 && A.AC.currentTime<t0+0.3;k++) await wait(30); await wait(300); };
    tg.click(); await settle(); n+=4;
    if(!E.lowPower) miss('Lighter forest on: the engine is not in low power');
    if(!(I && I.light && I.light())) miss('Lighter forest on: Forest depth does not play the light room');
    if(!(I && I.nodes.convIn.gain.value===0)) miss('Lighter forest on: the convolution input is '+(I&&I.nodes.convIn.gain.value)+' (exactly 0 expected — else the room keeps computing)');
    if(!(D.sceneLevel()==='reduced' && document.body.classList.contains('calm-plain'))) miss(`Lighter forest on: picture ${D.sceneLevel()}, plain glass ${document.body.classList.contains('calm-plain')}`);
    tg.click(); await settle(); n+=3;
    if(E.lowPower || (I && I.light && I.light())) miss('Lighter forest off: still in low power / the light room');
    if(!(I && I.nodes.convIn.gain.value===1)) miss('Lighter forest off: the convolution input is '+(I&&I.nodes.convIn.gain.value)+' (1 expected)');
    if(D.sceneLevel()!==lvl0) miss(`Lighter forest off: the picture is ${D.sceneLevel()} (was ${lvl0})`);
    /* (2) voices, offline */
    const R=await import('../render.js'), F=[440, 493.88, 554.37, 659.26, 739.99], off=undefined;
    const worst=async(id,low)=>{ const o={ w:0 }; await R.goldRender(e=>{ e.setCalmStrikes(voices); e.setLowPower(low); e.applyFx({}); const EE=e.engineCtx(), i=e.LEAD_INSTR.findIndex(x=>x.id===id);
      for(let k=0;k<32;k++){ const t=0.05+k*0.08, own='lp'+(k%4); e.leadOn(own, F[k%5], 1, i, off,off,off,off, t); e.leadOff(own, off, t+0.3);
        o.w=Math.max(o.w, EE.pool.ld.strikes.filter(s=>s.id===id && !s.faded && s.t<=t && s.end>t).length); } }, 3.0); return o.w; };
    for(const id of ['solo.singing-bowl','solo.firefly']){ const cap=voices[id], lowCap=Math.max(1, Math.round(cap*0.6)), w=await worst(id,true); n++;
      notes.push(`${id}: low power rings ≤ ${w} (cap ${cap} → ${lowCap})`); if(!(w<=lowCap)) miss(`${id}: ${w} strikes rang in low power (≤ ${lowCap} expected)`); }
    { const w=await worst('solo.singing-bowl',false); n++; if(!(w>2)) miss(`CONTROL: at full power the bowl rang only ${w} — the low-power bound cannot fail`); }
    /* (3) the light room vs the convolution, offline */
    const C=await import('./calm.js'), mid=b=>{ const m=new Float32Array(b.L.length); for(let i=0;i<m.length;i++) m[i]=(b.L[i]+b.R[i])/2; return m; };
    const phrase=id=>e=>{ const i=e.LEAD_INSTR.findIndex(x=>x.id===id);
      F.slice(0,4).forEach((f,k)=>{ e.applyFx({}); e.leadOn('p'+k,f,0.7,i,off,off,off,off,0.05+k); e.leadOff('p'+k,off,0.95+k); }); };
    const ch=(dp,light)=>({ [key]:{ ids:['fdepth'], set:{ 'fdepth:mix':1, 'fdepth:depth':dp, 'fdepth:room':0.5, 'fdepth:light':light } } });
    const L=async(id,dp,light,post)=>C.kLoud(mid(await R.goldRender(e=>{ phrase(id)(e); if(post) post(e); }, 6.5, ch(dp,light))),48000);
    for(const id of ['solo.firefly','solo.breath-flute']) for(const dp of [0.5,1]){ const a=await L(id,dp,0), b=await L(id,dp,1); n++;
      notes.push(`${id} d ${dp}: the light room ${(b-a>=0?'+':'')+(b-a).toFixed(2)} dB vs the forest`); if(Math.abs(b-a)>1.5) miss(`${id} d ${dp}: the light room is ${(b-a).toFixed(2)} dB from the forest (±1.5)`); }
    { const id='solo.breath-flute', a=await L(id,1,0), loud=await L(id,1,1,e=>{ const EE=e.engineCtx(), I2=EE.fx.inst[key] && EE.fx.inst[key].fdepth; if(I2) I2.nodes.gateF.gain.setValueAtTime(2, 0.2); }); n++;
      notes.push(`CONTROL the light room untrimmed (+6 dB return): ${(loud-a).toFixed(2)} dB`); if(!(Math.abs(loud-a)>1.5)) miss('CONTROL: the light room at +6 dB stays within the band — the loudness check cannot fail'); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ A.setLowPower(false); }catch(e){}
    KEYS.forEach((k,i)=>{ try{ if(keep[i]==null) localStorage.removeItem(k); else localStorage.setItem(k, keep[i]); }catch(e){} });
    try{ await D.setSceneLevel(keep[2]||'full'); }catch(e){} PR.profileApply(was||'profile.full'); try{ await D.setBackground('camera'); }catch(e){} }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.88, calm:true, name:'CALM low power', run:()=>checkCalmLowPower(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 8 (the user, after steps 114–119: «the left-to-right volume contrast is too strong for Calm»): row «CALM volume curve» (quick). In Calm
   the volume resolver (gestures/roles.noteVolOf — the one door the hands use) gives, as AMPLITUDE (config.volAmp), 0.30 ± 0.02 of the right
   side at the far left (the profile's «volume».left, data) and 1.0 at the far right, rising smoothly between (every tenth higher, each step
   ≤ 0.15 and the steps growing evenly — floor + (1 − floor)·v²). CONTROL: Full keeps its own curve — the far left is silence (0). */
export async function checkCalmVolume(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const PR=await import('../profile.js'), ST=await import('../state.js'), RO=await import('../gestures/roles.js'), CF=await import('../config.js');
  const was=PR.profileCurrent(), amp=x=>CF.volAmp(x);
  try{
    const why0=PR.profileApply('profile.full'); n++; if(why0){ miss('Full did not apply: '+why0); return { cases:n, total:d.length, differences:d, notes }; }
    const zk=ST.chainKeyOf('ld'), fullL=amp(RO.noteVolOf(zk, 0, ()=>0)), fullR=amp(RO.noteVolOf(zk, 1, ()=>1));
    const why=PR.profileApply('profile.calm'); n++; if(why){ miss('Calm did not apply: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    const want=(PR.profileOf('profile.calm').volume||{}).left, zc=ST.chainKeyOf('ld'), A=[]; for(let k=0;k<=10;k++) A.push(amp(RO.noteVolOf(zc, k/10, ()=>k/10)));
    notes.push(`Calm amplitude left → right: ${A.map(x=>x.toFixed(3)).join(' ')} (profile «volume».left ${want}); Full: left ${fullL.toFixed(3)}, right ${fullR.toFixed(3)}`);
    n+=4;
    if(!(Math.abs(A[0]-0.30)<=0.02)) miss(`Calm far left: ${A[0].toFixed(3)} of the right (0.30 ± 0.02 expected)`);
    if(!(Math.abs(A[10]-1)<=1e-9)) miss(`Calm far right: ${A[10]} (1.0 expected)`);
    const st=A.slice(1).map((x,i)=>x-A[i]); if(!(st.every(x=>x>0 && x<=0.15) && st.every((x,i)=>i===0 || x>=st[i-1]-1e-12))) miss('Calm\'s curve is not a smooth rise: '+A.map(x=>x.toFixed(3)).join(' '));
    if(!(fullL===0 && Math.abs(fullR-1)<=1e-9)) miss(`CONTROL: Full's curve is not its own (left ${fullL}, right ${fullR}) — Calm's floor reached Full`);
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.89, calm:true, name:'CALM volume curve', run:()=>checkCalmVolume(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
