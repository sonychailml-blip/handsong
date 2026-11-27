/* LIGHT-3 row «LIGHT bars and one axis»: the four effect bars (DLY VIB TRM BRT, one per finger, in the chain's order) and REV exist and rest hidden
   with no hand in view; ONE axis per effect in the live chain (the founder, as in Night): at most one driven value per effect, an effects finger
   only on y, the playing hand only Volume (x) and reverb (z) — CONTROL: Full's three-axis reverb is refused; the laws: the side changes only past
   40 % / 60 % (CONTROL: inside the band it stays), a set shows for exactly its hold after the last activity (CONTROL: at the hold it is hidden). */
import { fxChainOf, chainKeyOf } from '../../../core/state.js';
import { profileOf } from '../../../core/profile.js';
import { FX_BARS, BAR_FX_MS, BAR_REV_MS, sideOf, shownAt, lightShellDbg, drivenIndex } from '../../../apps/light/shell.js';

export async function checkLightBars(){
  const diffs=[], miss=s=>diffs.push(s);
  const chain=profileOf('profile.light').chain, byFinger=[0,1,2,3].map(f=>(chain.find(e=>e.params[0].hand==='fx' && e.params[0].finger===f)||{}).fxId);
  if(JSON.stringify(FX_BARS.map(b=>b[0]))!==JSON.stringify(byFinger)) miss('the bars '+FX_BARS.map(b=>b[0])+' ≠ the chain\'s fingers '+byFinger);
  const oneAxis=c=>{ const bad=[]; for(const e of c){ const dr=e.params.filter(q=>q.mode==='drive');
      if(dr.length>1) bad.push(`${e.fxId}: ${dr.length} driven values (${dr.map(q=>q.hand+':'+q.axis).join(', ')})`);
      for(const q of dr) if(q.hand==='fx' ? q.axis!=='y' : !((e.fxId==='vol' && q.axis==='x') || (e.fxId==='reverb' && q.axis==='z'))) bad.push(`${e.fxId}: ${q.hand} on ${q.axis}`); }
    return bad; };
  oneAxis(fxChainOf(chainKeyOf('ld'))).forEach(s=>miss('more than one axis: '+s));
  /* LIGHT-3b: the depth drives the reverb's MIX (its third parameter); the REV bar shows that value */
  if(drivenIndex('reverb')!==2) miss('the reverb\'s driven value is parameter '+drivenIndex('reverb')+', not the mix (2)');
  const fullDefault=[{ fxId:'vol', params:[{ mode:'drive', hand:'play', axis:'x' }] }, { fxId:'reverb', params:['y','x','z'].map(axis=>({ mode:'drive', hand:'fx', finger:0, axis })) }];
  if(!oneAxis(fullDefault).length) miss('CONTROL: Full\'s three-axis reverb passed the one-axis check');
  await new Promise(r=>setTimeout(r, 2*BAR_FX_MS));   // no hand in view (the fake camera): both sets rest hidden
  const D=lightShellDbg(); if(!D.running) miss('the bars are not fed by the frame loop'); if(D.fx.on || D.rev.on) miss('a set shows with no hand: '+JSON.stringify(D));
  if(sideOf('right', 300, 1000)!=='left' || sideOf('left', 700, 1000)!=='right') miss('the side law does not switch past 40 % / 60 %');
  if(sideOf('left', 500, 1000)!=='left' || sideOf('right', 450, 1000)!=='right') miss('CONTROL: inside the band the side moved');
  if(!shownAt(0, BAR_FX_MS-1, BAR_FX_MS) || shownAt(0, BAR_FX_MS, BAR_FX_MS)) miss('the effects hold is not exactly '+BAR_FX_MS+' ms');
  if(!shownAt(0, BAR_REV_MS-1, BAR_REV_MS) || shownAt(0, BAR_REV_MS+1, BAR_REV_MS)) miss('CONTROL: the reverb hold is not exactly '+BAR_REV_MS+' ms');
  return { pass:!diffs.length, diffs };
}
