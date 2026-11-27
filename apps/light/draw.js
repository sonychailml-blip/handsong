/* LIGHT-3 — LIGHT'S CANVAS: the camera picture (the cover crop: the same rectangle remaps the hands — rule #12; the front camera mirrored —
   rule #13, through core mirrored()), the note field and the hands. The field: rect (4 notes a band, chosen by finger — each band's note names
   stacked mid-band, lowest at the bottom, as the founder chose at LIGHT-1) or rows (one note a row); the tonic in amber; a band / row lit where a
   note sounds. The hands: their 21 points, the pinching fingertip in amber. Colours are Light's tokens (light.css), read once. */
import { ctx, canvas, video } from '../../core/vision.js';
import { mirrored, setViewRect } from '../../core/state.js';
import { coverView, rectBandY, FINGER_TIPS } from '../../core/config.js';
import { CUR, IVX, rectGrid, rectLayout, rectBase, rectNoteAt, rowLabel } from '../../core/scales.js';
import { rectOctReg } from '../../core/state.js';

let C=null;   // the colours, read from light.css once
const colours=()=>{ if(C) return C; const s=getComputedStyle(document.documentElement), v=n=>s.getPropertyValue(n).trim();
  C={ dim:v('--light-cv-dim'), band:v('--light-cv-band'), line:v('--light-cv-line'), on:v('--light-cv-on'), onLine:v('--light-cv-online'), ink:v('--light-ink'),
    inkDim:v('--light-ink-dim'), inkFaint:v('--light-ink-faint'), acc:v('--light-acc'), dot:v('--light-cv-dot'), bone:v('--light-cv-bone'), font:v('--light-font') };
  return C; };

/* the crop of a frame of vw×vh on this canvas — written before the frame's hands are processed (rule #12) */
export function lightSyncViewRect(vw, vh){ if(vw&&vh) setViewRect(coverView(vw,vh,canvas.width,canvas.height)); }
function picture(src){
  const W=canvas.width, H=canvas.height, vw=src&&(src.videoWidth||src.width)||0, vh=src&&(src.videoHeight||src.height)||0;
  ctx.fillStyle=colours().dim;
  if(vw&&vh){ const r=coverView(vw,vh,W,H); setViewRect(r);
    const sx0=r.ax0*vw, sy0=r.ay0*vh, sw=(r.ax1-r.ax0)*vw, sh=(r.ay1-r.ay0)*vh;
    if(mirrored()){ ctx.save(); ctx.scale(-1,1); ctx.drawImage(src,sx0,sy0,sw,sh,-W,0,W,H); ctx.restore(); } else ctx.drawImage(src,sx0,sy0,sw,sh,0,0,W,H); }
  else ctx.clearRect(0,0,W,H);
  ctx.fillRect(0,0,W,H);
}
const isTonic=(deg,s)=> IVX(s)[deg]%s.edo===0;
function field(hands){
  const W=canvas.width, H=canvas.height, s=CUR(), c=colours(), lit=new Set(), litDeg=new Set();
  for(const h of hands) if(h.play && h.zone==='ld') for(const n of Object.values(h.fing||{})){ if(n.slot>=0) lit.add(n.slot); litDeg.add(n.deg+':'+n.oct); }
  ctx.textBaseline='middle'; ctx.textAlign='left';
  if(rectGrid()){
    const RL=rectLayout(), nB=RL.bands, base=rectBase(rectOctReg('ld')), fs=Math.max(10, Math.min(14, Math.round(H/nB/6)));
    ctx.font=`${fs}px ${c.font}`;
    for(let b=0;b<nB;b++){
      const [y0,y1]=rectBandY(b,H,nB), r=b-RL.regBands, h=y1-y0;
      let on=false; for(let f=0;f<RL.k;f++) if(lit.has(r*RL.k+f)) on=true;
      ctx.fillStyle= on ? c.on : (r%2 ? c.band : 'transparent'); if(on || r%2) ctx.fillRect(0,y0,W,h);
      ctx.strokeStyle= on ? c.onLine : c.line; ctx.lineWidth= on ? 2 : 1; ctx.strokeRect(0.5,y0+0.5,W-1,h-1);
      /* the legend: one line per finger, the lowest note at the bottom, centred */
      const lh=Math.min(fs+4,(h-6)/4), top=y0+(h-lh*4)/2, cx=W/2-fs*1.2;
      for(let f=0;f<4;f++){ const yy=top+lh*(3-f)+lh/2;
        if(f>=RL.k){ ctx.fillStyle=c.inkFaint; ctx.fillText('—', cx+fs, yy); continue; }
        const g=r*RL.k+f, n=rectNoteAt(g,base), tn=isTonic(n.deg,s), sounding=lit.has(g);
        ctx.fillStyle= sounding ? c.acc : c.inkFaint; ctx.beginPath(); ctx.arc(cx+3, yy, sounding ? 3.5 : 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle= sounding ? c.ink : tn ? c.acc : c.inkDim; ctx.fillText(rowLabel(n.deg,s), cx+fs, yy); }
      const oc=rectNoteAt(r*RL.k,base).oct; ctx.fillStyle=c.inkFaint; ctx.textAlign='right'; ctx.fillText(String(oc+1), W-fs*4, y0+h/2); ctx.textAlign='left';
    }
  }else{
    const rows=IVX(s).length, seg=H/rows, fs=Math.max(10, Math.min(15, Math.round(seg*0.45)));
    ctx.font=`${fs}px ${c.font}`;
    for(let i=0;i<rows;i++){ const deg=rows-1-i, y=i*seg, on=[...litDeg].some(k=>+k.split(':')[0]===deg);
      if(on){ ctx.fillStyle=c.on; ctx.fillRect(0,y,W,seg); }
      ctx.strokeStyle=c.line; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,y+0.5); ctx.lineTo(W,y+0.5); ctx.stroke();
      ctx.fillStyle= on ? c.ink : isTonic(deg,s) ? c.acc : c.inkDim; ctx.textAlign='center'; ctx.fillText(rowLabel(deg,s), W/2, y+seg/2); ctx.textAlign='left'; }
  }
}
const BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function handsDraw(hands, sxOf, syOf){
  const c=colours();
  for(const h of hands){ const lm=h.lm; if(!lm) continue; const P=lm.map(p=>[sxOf(p.x), syOf(p.y)]);
    ctx.strokeStyle=c.bone; ctx.lineWidth=1.4; ctx.beginPath(); for(const [a,b] of BONES){ ctx.moveTo(P[a][0],P[a][1]); ctx.lineTo(P[b][0],P[b][1]); } ctx.stroke();
    ctx.fillStyle=c.dot; for(const [x,y] of P){ ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); }
    if(h.pinch && h.finger>=0){ const t=P[FINGER_TIPS[h.finger]], th=P[4]; ctx.fillStyle=c.acc;
      for(const [x,y] of [t,th]){ ctx.beginPath(); ctx.arc(x,y,5.5,0,Math.PI*2); ctx.fill(); } } }
}
/* one screen frame: the picture whose hands are current (rule #8), the field over it, the hands on top */
export function lightDrawFrame(src, hands, sxOf, syOf){ picture(src); field(hands); handsDraw(hands, sxOf, syOf); }
