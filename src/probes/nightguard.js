/* SPLIT-2: row «NIGHT untouched» — the mirror of «FULL untouched»: a change elsewhere must not move this app. tools/night.print.json is made
   by P.dumpNight() on unchanged code. (1) STATE: the live state once its profile applies, and the profile's offer, equal the print. (2) SOUND:
   each of its four sounds, a short phrase through its chain with its trims and strike caps, offline, within GOLD's tolerance. CONTROLS, each must
   differ: a trim +1 dB; the strike caps off; the chain without its room; a planted state value. Deterministic (no real time, no drawing). */
import { row } from './rows.js';
import { goldFeats, goldCmp } from './gold.js';

const FILE='tools/night.print.json', PROFILE='profile.calm', SEC=3.0, F=[440, 554.37], off=undefined;
const OFFER=['roles','handFn','noteModes','key','moods','timbres','effects','scene','backgrounds','noteField','labels','recording','ambience','levels','voices','volume'];

async function env(){ return { PR:await import('../profile.js'), ST:await import('../state.js'), R:await import('../render.js'), A:await import('../audio.js') }; }
/* the state print: names no product (ids and display names are left out), so a rename cannot touch it */
function statePrint({ PR, ST, A }){
  const p=PR.profileOf(PROFILE), s=PR.profileDoorsDbg().read(), offer={}, E=A.engineCtx();
  for(const k of OFFER) offer[k]=p[k]===undefined ? null : p[k];
  return { offer, live:{ scaleId:s.scaleId, tonic:s.tonic, tonicCents:s.tonicCents, lead:s.lead, phoneInstr:s.phoneInstr, splitOn:s.splitOn, hand:s.hand, voice:s.voice, chain:s.chain },
    view:{ glow:ST.calmView&&ST.calmView.glow, plain:ST.calmView&&ST.calmView.plain }, volFloor:ST.volFloor, caps:[...E.strikeCaps].sort(), lean:!!E.calmLean };
}
/* its chain as the render copy takes it: the hand-driven values at rest, the room at its fixed Medium */
function chainOf(ST, room=true){ const ids=['ctone','cwave','cecho',...(room?['fdepth']:[])], set={ 'ctone:mix':1, 'ctone:tilt':0.5, 'cwave:mix':1, 'cwave:amount':0.3, 'cecho:amount':0.4 };
  if(room) Object.assign(set, { 'fdepth:mix':1, 'fdepth:depth':0.5, 'fdepth:room':0.5, 'fdepth:reach':1, 'fdepth:light':0 });
  return { [ST.chainKeyOf('ld')]:{ ids, set } }; }
const phrase=(id,trim,caps)=>e=>{ e.setTimbreTrim(trim); e.setCalmStrikes(caps); const i=e.LEAD_INSTR.findIndex(x=>x.id===id);
  F.forEach((f,k)=>{ e.applyFx({}); e.leadOn('n'+k,f,0.7,i,off,off,off,off,0.05+0.8*k); e.leadOff('n'+k,off,0.05+0.8*k+0.6); }); };
const renderOne=async(R,ST,id,trim,caps,room=true)=>goldFeats(await R.goldRender(phrase(id,trim,caps), SEC, chainOf(ST,room)));
const within=async(PR, was, f)=>{ const why=PR.profileApply(PROFILE); if(why) throw new Error('its profile did not apply: '+why); try{ return await f(); } finally { PR.profileApply(was); } };

/* P.dumpNight() on UNCHANGED code: the returned object is tools/night.print.json */
export async function dumpNight(){
  const X=await env(), p=X.PR.profileOf(PROFILE), was=X.PR.profileCurrent();
  return within(X.PR, was, async()=>{ const state=statePrint(X), sound={};
    for(const id of p.timbres) sound[id]=await renderOne(X.R, X.ST, id, p.levels, p.voices);
    return { meta:{ format:'handsong/night-print', version:1, made:new Date().toISOString(), sec:SEC }, state, sound }; });
}
export async function checkNightUntouched(){
  const d=[], notes=[], miss=s=>d.push(s); let n=0;
  try{
    const pin=await (await fetch(new URL('../../'+FILE, import.meta.url), { cache:'no-store' })).json();
    const X=await env(), { PR, ST, R }=X, p=PR.profileOf(PROFILE), was=PR.profileCurrent();
    await within(PR, was, async()=>{
      const now=statePrint(X), cmpState=(a,b)=>Object.keys(a).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
      n++; for(const k of cmpState(pin.state, now)) miss(`state «${k}»: ${JSON.stringify(pin.state[k]).slice(0,160)} → ${JSON.stringify(now[k]).slice(0,160)}`);
      for(const id of Object.keys(pin.sound)){ n++; const c=goldCmp(id, pin.sound[id], await renderOne(R, ST, id, p.levels, p.voices)); if(c.length) miss(`${c[0]}${c.length>1?` (and ${c.length-1} more values)`:''}`); }
      /* negative controls: each must leave the print */
      const id0='solo.handpan', ctl=async(name,feats)=>{ n++; const c=goldCmp(id0, pin.sound[id0], feats); notes.push(`CONTROL ${name}: ${c.length} values differ`); if(!c.length) miss(`CONTROL: ${name} still matches the print — the guard cannot fail`); };
      await ctl('trim +1 dB', await renderOne(R, ST, id0, { ...p.levels, [id0]:p.levels[id0]+1 }, p.voices));
      await ctl('strike caps off', await renderOne(R, ST, id0, p.levels, null));
      await ctl('chain without its room', await renderOne(R, ST, id0, p.levels, p.voices, false));
      n++; { const planted=JSON.parse(JSON.stringify(now)); planted.live.tonic+=1; if(!cmpState(pin.state, planted).length) miss('CONTROL: a planted state value still matches — the state print cannot fail'); }
    });
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.95, calm:true, slow:true, name:'NIGHT untouched', run:()=>checkNightUntouched(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
