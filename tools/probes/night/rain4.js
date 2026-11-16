/* RAIN-4 — «RAIN forest bed unchanged»: the forest's music bed v2 rendered offline (bed2Plan, the worklet for real; Still, Drift, Glimmer, 20 s at
   48 kHz, the live view) equals, sample for sample, the renders pinned BEFORE the jazz bed was added (tools/prints/forest-bed.json: FNV-1a of each
   channel's float32 bytes). CONTROL: another seed must differ from the pin. */
import { row } from '../core/rows.js';

const h=x=>{ const u=new Uint8Array(x.buffer, x.byteOffset, x.byteLength); let a=0x811c9dc5>>>0; for(let i=0;i<u.length;i++){ a^=u[i]; a=Math.imul(a, 0x01000193)>>>0; } return a.toString(16).padStart(8, '0'); };
const viewOf=(S, id)=>{ const [m, rest]=id.split('#'), [cm, key]=rest.split('~'), M=S.scaleById(m); for(const c of [cm, undefined]){ const v=M && S.scaleView(M, undefined, c, +key); if(v && S.viewKeyIdOf(v)===id) return v; } return null; };   // the pin's own view (other rows move the live one)
async function render(B2, FR, S, preset, rate, sec, o={}, view){ const ctx=new OfflineAudioContext(2, rate*sec, rate), E={ ac:ctx }; await B2.bed2Plan(E, ctx.destination, FR.bed2, preset, sec, { view, ...o }); const b=await ctx.startRendering(); return { L:h(b.getChannelData(0)), R:h(b.getChannelData(1)) }; }
export async function checkForestBed(){ const d=[], notes=[]; let n=0; const miss=x=>d.push(x);
  const B2=await import('../../../apps/night/bed2.js'), FR=(await import('../../../apps/night/rooms/forest/pure/room.js')).FOREST_ROOM, S=await import('../../../core/scales.js');
  const pin=await (await fetch(new URL('../../prints/forest-bed.json', import.meta.url))).json();
  for(const [preset, want] of Object.entries(pin.renders)){ n++; const v=viewOf(S, want.view); if(!v){ miss(`${preset}: the pin's view ${want.view} cannot be made`); continue; }
    const got=await render(B2, FR, S, preset, pin.rate, pin.sec, {}, v); if(got.L!==want.L || got.R!==want.R) miss(`${preset}: the forest's bed differs from its pin (${got.L}/${got.R}, pinned ${want.L}/${want.R})`); else notes.push(`${preset}: equal to the pin (${got.L}/${got.R})`); }
  n++; { const c=await render(B2, FR, S, 'drift', pin.rate, pin.sec, { seed:99 }, viewOf(S, pin.renders.drift.view)); if(c.L===pin.renders.drift.L) miss('CONTROL: another seed gave the pinned bed'); else notes.push('CONTROL: another seed differs from the pin'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.986, night:true, name:'RAIN forest bed unchanged', run:()=>checkForestBed(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
