/* NIGHT-4: the music bed's A/B switch, dev only. Address: <page>?probe&bed=v1|v2 (and &voices=a|b for v2's loop voices: «voices» or «horns»).
   Two pills: which bed plays (v2 · v1) and, for v2, which palette its loop voices take; a line under them shows the arc and the loops while v2
   plays. Under tools/, so previews carry it and production doesn't; without it the app plays v2 with «voices». */
import { bedSetEngine, bedEngineOf, bedSetPalette, bedPaletteOf, bedDbg } from '../../../apps/night/bed.js';
import { BED2_WORKLET } from '../../../apps/night/sound/bed2.js';
const CSS='#bedPills{position:fixed;z-index:2147483000;left:8px;top:8px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;font:600 15px system-ui,sans-serif}'
  +'#bedPills button{min-height:44px;padding:0 14px;border:0;border-radius:12px;background:#c8f56a;color:#10140a;font:inherit}#bedPills button.alt{background:#222936;color:#f1eee4}'
  +'#bedPills div{font:12px ui-monospace,monospace;color:#c8d0dc;background:rgba(7,9,13,.6);padding:2px 6px;border-radius:6px}';
export function mountBedSwitch(){
  const q=new URLSearchParams(location.search), box=document.createElement('div'), eng=document.createElement('button'), pal=document.createElement('button'), info=document.createElement('div'), st=document.createElement('style');
  box.id='bedPills'; eng.id='bedEnginePill'; pal.id='bedVoicesPill'; st.textContent=CSS; box.append(eng, pal, info); document.head.append(st); document.body.append(box);
  let chosen= q.get('bed')==='v1' ? 'v1' : 'v2';
  bedSetEngine(chosen); bedSetPalette(q.get('voices')==='b' ? 'b' : 'a');
  const show=()=>{ const p=bedPaletteOf(), fell= chosen==='v2' && bedEngineOf()==='v1' && bedDbg().v2.fail;
    eng.textContent= chosen==='v1' ? 'Bed: v1 (stage 4)' : fell ? 'Bed: v2 failed, v1 plays' : 'Bed: v2'; eng.classList.toggle('alt', chosen==='v1');
    pal.textContent='Loop voices: '+(p==='b' ? 'horns' : 'voices'); pal.classList.toggle('alt', p==='b'); pal.hidden= chosen==='v1'; };
  eng.onclick=()=>{ chosen= chosen==='v1' ? 'v2' : 'v1'; bedSetEngine(chosen); show(); };
  pal.onclick=()=>{ bedSetPalette(bedPaletteOf()==='b' ? 'a' : 'b'); show(); };
  show();
  setInterval(()=>{ show(); const D=bedDbg(), V=D.v2;
    info.textContent= D.mode==='off' ? 'music off' : D.engine==='v1' ? `v1 · ${D.mode}` : `v2 · ${D.mode}${D.light ? ' · lighter' : ''} · arc ${V.density==null ? '—' : V.density.toFixed(2)} · loops ${V.loops.filter(l=>l.active).length}/${V.loops.length}`; }, 1000);
  window.__bedSwitch={ engine:()=>chosen, palette:bedPaletteOf, worklet:BED2_WORKLET };   // the smoke test fetches the worklet from where the app loads it
}
