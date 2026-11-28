/* LIGHT-2/3 row «LIGHT start and profile»: after ▶ the page runs in Light's profile through Light's own doors — its first mood (minor pentatonic),
   its one timbre (SuperSaw), key A, the playing hand right with the effects hand left, and the solo chain EXACTLY the profile's (Volume on the
   playing hand's horizontal, reverb on its depth, delay / vibrato / tremolo / brightness on the effects hand's four fingers); the start card gone;
   the brand emblem drawn; the page's stores namespaced «light». CONTROL: Full's default solo chain must read as different. */
import { profileCurrent, profileOf, profileDoorsDbg } from '../../../core/profile.js';
import { scaleId, tonic, handFn, fxChainOf, chainKeyOf } from '../../../core/state.js';
import { STORE_NS } from '../../../core/storens.js';
import { lightBootDbg } from '../../../apps/light/boot.js';
import { lightUpdateDbg } from '../../../apps/light/update.js';

const FULL_SOLO_FX=['vol','reverb','dly','drv','vib'];   // Full's default solo chain (core/state.js fxChains), for the control
export async function checkLightStart(){
  const diffs=[], miss=s=>diffs.push(s), p=profileOf('profile.light');
  if(!p) return { pass:false, diffs:['no profile.light loaded'] };
  if(!lightBootDbg().started) miss('Light\'s own start did not finish');
  if(profileCurrent()!=='profile.light') miss('the page is in '+profileCurrent());
  if(scaleId!==p.moods[0]) miss(`mood ${scaleId}, expected ${p.moods[0]}`);
  if(tonic!==p.key.tonic) miss(`key ${tonic}, expected ${p.key.tonic}`);
  const D=profileDoorsDbg(), tim=D && D.read().lead; if(tim!==p.timbres[0]) miss(`timbre ${tim}, expected ${p.timbres[0]}`);
  if(handFn.ld.L!=='fx' || handFn.ld.R!=='note') miss('hands '+JSON.stringify(handFn.ld));
  const live=JSON.stringify(fxChainOf(chainKeyOf('ld'))), want=JSON.stringify(p.chain);
  if(live!==want) miss('the solo chain differs from the profile\'s: '+live.slice(0, 300));
  if(JSON.stringify(fxChainOf(chainKeyOf('ld')).map(e=>e.fxId))===JSON.stringify(FULL_SOLO_FX)) miss('CONTROL: the live chain reads as Full\'s default');
  if(JSON.stringify(p.chain.map(e=>e.fxId))===JSON.stringify(FULL_SOLO_FX)) miss('CONTROL: the profile chain equals Full\'s — the comparison cannot fail');
  const st=document.getElementById('start'); if(!st || st.classList.contains('on')) miss('the start card still shows');
  if(!document.querySelector('#start .light-emblem svg.emblem')) miss('the emblem was not drawn on the start card');
  if(STORE_NS!=='light') miss('store namespace «'+STORE_NS+'»');
  { const U=lightUpdateDbg(); if('serviceWorker' in navigator && (!U.wired || U.registered!==1)) diffs.push(`LIGHT-10: the worker not registered once after the start (${JSON.stringify(U)})`); }   // registered after Play, once
  return { pass:!diffs.length, diffs };
}
