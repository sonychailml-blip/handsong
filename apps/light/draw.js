/* LIGHT-3 — LIGHT'S CANVAS: the camera picture (the cover crop: the same rectangle remaps the hands — rule #12; the front camera mirrored —
   rule #13, through core mirrored()), the note field and the hands. The field: rect (4 notes a band, chosen by finger — each band's note names
   stacked at the left edge, lowest at the bottom; the founder tried them mid-band and moved them back: the bars may lie over them) or rows (one
   note a row); the tonic in amber; a band / row lit where a note sounds. The hands: their points without lines, the fingertips larger (as in Full
   and Night), every SOUNDING finger and the thumb in amber (several fingers of one hand can sound at once). Colours: Light's tokens, read once. */
import { ctx, canvas, video } from '../../core/vision.js';
import { mirrored, setViewRect, rectOctReg } from '../../core/state.js';
import { coverView, rectBandY, FINGER_TIPS } from '../../core/config.js';
import { CUR, IVX, rectGrid, rectLayout, rectBase, rectNoteAt, rowLabel, thereminSpan } from '../../core/scales.js';
import { handFn } from '../../core/state.js';

let C=null;   // the colours, read from light.css once
const LEFT=14;   // the note names' left margin (px), as Full's legend
const colours=()=>{ if(C) return C; const s=getComputedStyle(document.documentElement), v=n=>s.getPropertyValue(n).trim();
  C={ dim:v('--light-cv-dim'), band:v('--light-cv-band'), line:v('--light-cv-line'), on:v('--light-cv-on'), onLine:v('--light-cv-online'), ink:v('--light-ink'),
    inkDim:v('--light-ink-dim'), inkFaint:v('--light-ink-faint'), acc:v('--light-acc'), dot:v('--light-cv-dot'), font:v('--light-font'),
    ther:v('--light-cv-ther'), therTonic:v('--light-cv-ther-tonic') };
  return C; };

/* the crop of a frame of vw×vh on this canvas — written before the frame's hands are processed (rule #12) */
export function lightSyncViewRect(vw, vh){ if(vw&&vh) setViewRect(coverView(vw,vh,canvas.width,canvas.height)); }
function picture(src){
  const W=canvas.width, H=canvas.height, vw=src&&(src.videoWidth||src.width)||0, vh=src&&(src.videoHeight||src.height)||0;
  if(vw&&vh){ const r=coverView(vw,vh,W,H); setViewRect(r);
    const sx0=r.ax0*vw, sy0=r.ay0*vh, sw=(r.ax1-r.ax0)*vw, sh=(r.ay1-r.ay0)*vh;
    if(mirrored()){ ctx.save(); ctx.scale(-1,1); ctx.drawImage(src,sx0,sy0,sw,sh,-W,0,W,H); ctx.restore(); } else ctx.drawImage(src,sx0,sy0,sw,sh,0,0,W,H); }
  else ctx.clearRect(0,0,W,H);
  ctx.fillStyle=colours().dim; ctx.fillRect(0,0,W,H);
}
const isTonic=(deg,s)=> IVX(s)[deg]%s.edo===0;
function field(hands){
  const W=canvas.width, H=canvas.height, s=CUR(), c=colours(), lit=new Set(), litDeg=new Set();
  for(const h of hands) if(h.play && h.zone==='ld'){
    if(h.fn==='therm'){ if(h.pinch){ if(h.slot>=0) lit.add(h.slot); litDeg.add(h.deg); } continue; }   // LIGHT-6c (the founder): the theremin lights the note it is NEAREST (its own slot), not the band's note under the finger
    for(const n of Object.values(h.fing||{})){ if(n.slot>=0) lit.add(n.slot); litDeg.add(n.deg); } }
  ctx.textBaseline='middle'; ctx.textAlign='left';
  if(rectGrid()){
    const RL=rectLayout(), nB=RL.bands, base=rectBase(rectOctReg('ld')), fs=Math.max(10, Math.min(14, Math.round(H/nB/6)));
    ctx.font=`${fs}px ${c.font}`;
    for(let b=0;b<nB;b++){
      const [y0,y1]=rectBandY(b,H,nB), r=b-RL.regBands, h=y1-y0;
      let on=false; for(let f=0;f<RL.k;f++) if(lit.has(r*RL.k+f)) on=true;
      if(on || r%2){ ctx.fillStyle= on ? c.on : c.band; ctx.fillRect(0,y0,W,h); }
      ctx.strokeStyle= on ? c.onLine : c.line; ctx.lineWidth= on ? 2 : 1; ctx.strokeRect(0.5,y0+0.5,W-1,h-1);
      /* the legend: one line per finger, the lowest note at the bottom, at the left edge */
      const lh=Math.min(fs+4,(h-6)/4), top=y0+(h-lh*4)/2;
      for(let f=0;f<4;f++){ const yy=top+lh*(3-f)+lh/2;
        if(f>=RL.k){ ctx.fillStyle=c.inkFaint; ctx.fillText('—', LEFT+fs, yy); continue; }
        const g=r*RL.k+f, n=rectNoteAt(g,base), tn=isTonic(n.deg,s), sounding=lit.has(g);
        ctx.fillStyle= sounding ? c.acc : c.inkFaint; ctx.beginPath(); ctx.arc(LEFT+3, yy, sounding ? 3.5 : 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle= sounding ? c.ink : tn ? c.acc : c.inkDim; ctx.fillText(rowLabel(n.deg,s), LEFT+fs, yy); }
      const oc=rectNoteAt(r*RL.k,base).oct; ctx.fillStyle=c.inkFaint; ctx.textAlign='right'; ctx.fillText(String(oc+1), W-fs*4, y0+h/2); ctx.textAlign='left';
    }
  }else{
    const rows=IVX(s).length, seg=H/rows, fs=Math.max(10, Math.min(15, Math.round(seg*0.45)));
    ctx.font=`${fs}px ${c.font}`;
    for(let i=0;i<rows;i++){ const deg=rows-1-i, y=i*seg, on=litDeg.has(deg);
      if(on){ ctx.fillStyle=c.on; ctx.fillRect(0,y,W,seg); ctx.strokeStyle=c.onLine; ctx.lineWidth=2; ctx.strokeRect(1,y+1,W-2,seg-2); }   // LIGHT-6b: the sounding row outlined, as a band is
      ctx.strokeStyle=c.line; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,y+0.5); ctx.lineTo(W,y+0.5); ctx.stroke();
      ctx.fillStyle= on ? c.ink : isTonic(deg,s) ? c.acc : c.inkDim; ctx.fillText(rowLabel(deg,s), LEFT+fs, y+seg/2); }
  }
}
/* LIGHT-6b (the founder; Full's system): when a hand plays the THEREMIN, a line through the middle of every note's place shows where the pitch is
   exactly that note (core thereminSpan: the same division the theremin's pitch law uses); the line a theremin hand is on lights. */
function thereminLines(hands){
  if(handFn.ld.L!=='therm' && handFn.ld.R!=='therm') return;
  const W=canvas.width, H=canvas.height, c=colours(), s=CUR(), {M,spanBot,divH}=thereminSpan(H), on=new Set();
  const rect=rectGrid(), base=rect ? rectBase(rectOctReg('ld')) : 0;
  for(const h of hands) if(h.play && h.pinch && h.fn==='therm') on.add(rect ? h.slot : h.deg);
  for(let i=0;i<M;i++){ const y=spanBot-(i+0.5)*divH, lit=on.has(i), deg= rect ? rectNoteAt(i,base).deg : i;
    ctx.strokeStyle= lit ? c.acc : isTonic(deg,s) ? c.therTonic : c.ther; ctx.lineWidth= lit ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}
const TIPS=new Set([4,8,12,16,20]);   // thumb, index, middle, ring, little: drawn larger
/* the fingers sounding now: every finger of the playing hand's notes (several at once), else the pinching finger (the effects hand) */
export function litFingers(h){ if(!h.pinch) return new Set();
  const f=h.play && h.fing ? Object.keys(h.fing).map(Number) : []; return new Set(f.length ? f : h.finger>=0 ? [h.finger] : []); }
/* LIGHT-13 (the founder; Full's two rings, but at EVERY sounding finger — Full keeps them at the first one only): where a playing hand's thumb
   meets each sounding finger (the theremin: at its pinch point), a ring and a fainter outer ring, both growing with the note's volume */
function rings(h, lit, sxOf, syOf, c){
  if(!h.play || !h.pinch) return;
  const v=Math.max(0, Math.min(1, +h.vol||0)), at=[];
  if(h.fn==='therm') at.push([h.x, h.y]);
  else for(const f of lit){ const t=h.lm[FINGER_TIPS[f]]; if(t) at.push([sxOf((h.lm[4].x+t.x)/2), syOf((h.lm[4].y+t.y)/2)]); }
  ctx.strokeStyle=c.acc; ctx.lineWidth=2.5;
  for(const [x,y] of at){ ctx.globalAlpha=0.9; ctx.beginPath(); ctx.arc(x, y, 16+6*v, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha=0.25; ctx.beginPath(); ctx.arc(x, y, 26+8*v, 0, Math.PI*2); ctx.stroke(); }
  ctx.globalAlpha=1;
}
function handsDraw(hands, sxOf, syOf){
  const c=colours();
  for(const h of hands){ const lm=h.lm; if(!lm) continue; const lit=litFingers(h); rings(h, lit, sxOf, syOf, c);
    lm.forEach((p,i)=>{ const x=sxOf(p.x), y=syOf(p.y), tip=TIPS.has(i), on= i===4 ? lit.size>0 : tip && lit.has(FINGER_TIPS.indexOf(i));
      ctx.fillStyle= on ? c.acc : c.dot; ctx.beginPath(); ctx.arc(x, y, on ? 7 : tip ? 5.5 : 2.6, 0, Math.PI*2); ctx.fill(); }); }
}
/* one screen frame: the picture whose hands are current (rule #8), the field over it, the hands on top */
export function lightDrawFrame(src, hands, sxOf, syOf){ picture(src); field(hands); thereminLines(hands); handsDraw(hands, sxOf, syOf); }
