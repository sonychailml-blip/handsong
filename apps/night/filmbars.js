/* SHARE-2 — THE BARS IN A CLIP: the depth bar and the three effects bars are page markup (shell.js sets them), so a clip filmed from the canvases
   would not show what the hands change. filmBars paints them onto a clip's frame as the page shows them at that moment — each element's own
   box, its computed colours, the container's fade, the active bar's glow, the icon (our own drawn SVG, from the page, as a picture with its
   computed paint inlined), the label — scaled from the screen to the frame. The boxes and colours are measured again every half second or when
   a bar's state changes; each frame reads only the fades and the fills (their percentages, as shell.js writes them). Read only while recording. */
const BARS=['nightForestBar', 'nightFxBars'], ICONS=new Map(), GEO=new Map(), REMEASURE_MS=500;
const css=el=>getComputedStyle(el);
/* an icon as a picture (its SVG with each shape's computed paint inlined: CSS variables and classes do not reach a picture), cached; null until loaded */
function iconOf(svg, color, size){ const key=svg.innerHTML.length+'|'+svg.getAttribute('viewBox')+'|'+color+'|'+size+'|'+svg.innerHTML.slice(0, 80); let e=ICONS.get(key);
  if(!e){ const c=svg.cloneNode(true); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', size); c.setAttribute('height', size);
    const live=[svg, ...svg.querySelectorAll('*')], copy=[c, ...c.querySelectorAll('*')];
    live.forEach((el, i)=>{ const k=css(el), d=copy[i]; if(!d) return; for(const p of ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity']){ const v=k.getPropertyValue(p); if(v) d.style.setProperty(p, v); } });
    const src=new XMLSerializer().serializeToString(c).replace(/currentColor/g, color), img=new Image(); e={ img, ok:false }; img.onload=()=>{ e.ok=true; }; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src); ICONS.set(key, e); if(ICONS.size>64) ICONS.delete(ICONS.keys().next().value); }
  return e.ok ? e.img : null; }
function shadowOf(s){ if(!s || s==='none') return null; const m=s.match(/^(.*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/) || s.match(/^(\S+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/); return m ? { color:m[1], blur:+m[4] } : null; }
const pill=(x, l, t, w, h)=>{ x.beginPath(); if(x.roundRect) x.roundRect(l, t, w, h, Math.min(w, h)/2); else x.rect(l, t, w, h); };
const rectOf=el=>{ if(!el) return null; const r=el.getBoundingClientRect(); return r.width>0 && r.height>0 ? { l:r.left, t:r.top, w:r.width, h:r.height } : null; };
/* one bar's boxes and colours (measured again when its classes or its container's change, or every REMEASURE_MS) */
function geoOf(box, bar, now){ const key=box.className+'|'+bar.className+'|'+innerWidth+'x'+innerHeight; let g=GEO.get(bar);
  if(g && g.key===key && now-g.at<REMEASURE_MS) return g;
  const tr=bar.querySelector('.night-bar-track'), fi=bar.querySelector('.night-bar-fill'), mid=bar.querySelector('.night-bar-mid'), ico=bar.querySelector('.night-bar-ico'), lab=bar.querySelector('.night-bar-lab');
  const bc=css(bar), tc=css(tr), fc=css(fi), bw=parseFloat(tc.borderTopWidth)||0, T=rectOf(tr);
  g={ key, at:now, fi, T, bw, two:bar.classList.contains('night-bar-two'), color:bc.color, track:tc.backgroundColor, border:tc.borderTopColor, glow:shadowOf(tc.boxShadow), fill:fc.backgroundColor,
    mid:rectOf(mid), midColor: mid ? css(mid).backgroundColor : null, ico:rectOf(ico), svg: ico && ico.querySelector('svg'), lab:null };
  if(lab && lab.textContent){ const L=rectOf(lab); if(L){ const lc=css(lab); g.lab={ L, text:lab.textContent.trim(), font:`${lc.fontStyle} ${lc.fontWeight} ${lc.fontSize} ${lc.fontFamily}`, size:parseFloat(lc.fontSize), lh:parseFloat(lc.lineHeight)||parseFloat(lc.fontSize)*1.2, color:lc.color, lines:null }; } }
  GEO.set(bar, g); return g; }
/* paint the visible bars onto context x of a w×h frame (the screen is innerWidth × innerHeight CSS px) → how many were painted */
export function filmBars(x, w, h){ const sx=w/innerWidth, sy=h/innerHeight, now=performance.now(); let n=0;
  for(const id of BARS){ const box=document.getElementById(id); if(!box) continue; const op=+css(box).opacity; if(!(op>0.01)) continue;
    for(const bar of box.querySelectorAll('.night-bar')){ const g=geoOf(box, bar, now), R=g.T; if(!R) continue;
      x.save(); x.setTransform(sx, 0, 0, sy, 0, 0); x.globalAlpha=op;
      if(g.glow){ x.save(); x.shadowColor=g.glow.color; x.shadowBlur=g.glow.blur; pill(x, R.l, R.t, R.w, R.h); x.fillStyle=g.border; x.fill(); x.restore(); }
      pill(x, R.l, R.t, R.w, R.h); x.fillStyle=g.track; x.fill(); x.lineWidth=g.bw||1; x.strokeStyle=g.border; x.stroke();
      /* the fill from the percentages shell.js wrote (inside the track's border) */
      const hp=parseFloat(g.fi.style.height)||0, bp= g.two ? parseFloat(g.fi.style.bottom)||0 : 0, iw=R.w-2*g.bw, ih=R.h-2*g.bw, fh=ih*hp/100;
      if(fh>0.5){ pill(x, R.l+g.bw, R.t+g.bw+ih*(1-(bp+hp)/100), iw, fh); x.fillStyle=g.fill; x.fill(); }
      if(g.mid){ x.fillStyle=g.midColor; x.fillRect(g.mid.l, g.mid.t, g.mid.w, Math.max(1, g.mid.h)); }
      if(g.svg && g.ico){ const img=iconOf(g.svg, g.color, Math.round(g.ico.w*Math.max(sx, sy)*2)); if(img) x.drawImage(img, g.ico.l, g.ico.t, g.ico.w, g.ico.h); }
      const L=g.lab; if(L){ x.font=L.font; x.fillStyle=L.color; x.textAlign='center'; x.textBaseline='top';
        if(!L.lines){ const words=L.text.split(/\s+/), lines=[]; let cur=''; for(const wd of words){ const t=cur ? cur+' '+wd : wd; if(cur && x.measureText(t).width>L.L.w+1){ lines.push(cur); cur=wd; } else cur=t; } if(cur) lines.push(cur); L.lines=lines; }
        L.lines.forEach((t, i)=>x.fillText(t, L.L.l+L.L.w/2, L.L.t+i*L.lh+(L.lh-L.size)/2)); }
      x.restore(); n++; } }
  return n; }
