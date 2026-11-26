/* SHARE-1 — THE MP4 WRITER (ISO/IEC 14496-12 base media file format + 14496-15 for H.264 and 14496-3/-14 for AAC; written from the standards,
   our own code — rule #32). Pure: no DOM, no codec — the browser's encoders make the samples (WebCodecs), this only puts them in a box.
   One video track (H.264, its avcC record as the encoder gives it) and an optional audio track (AAC-LC, its AudioSpecificConfig). The moov box
   first («fast start»: a phone plays it as it arrives), one sample per chunk, durations from each sample's own timestamp (a variable frame rate
   is kept exactly: each frame lasts until the next one was drawn). */

const VT=90000;   // the video timescale (ticks a second)
const u8=a=>a instanceof Uint8Array ? a : new Uint8Array(a);
/* a growing byte writer */
function W(){ let b=new Uint8Array(1<<16), n=0; const room=k=>{ if(n+k>b.length){ let m=b.length*2; while(m<n+k) m*=2; const c=new Uint8Array(m); c.set(b.subarray(0, n)); b=c; } };
  const o={ u8:v=>{ room(1); b[n++]=v&255; return o; }, u16:v=>{ room(2); b[n++]=(v>>>8)&255; b[n++]=v&255; return o; }, u24:v=>{ room(3); b[n++]=(v>>>16)&255; b[n++]=(v>>>8)&255; b[n++]=v&255; return o; },
    u32:v=>{ room(4); b[n++]=(v>>>24)&255; b[n++]=(v>>>16)&255; b[n++]=(v>>>8)&255; b[n++]=v&255; return o; }, bytes:a=>{ a=u8(a); room(a.length); b.set(a, n); n+=a.length; return o; },
    str:s=>{ for(let i=0;i<s.length;i++) o.u8(s.charCodeAt(i)); return o; }, zeros:k=>{ room(k); b.fill(0, n, n+k); n+=k; return o; }, get length(){ return n; }, out:()=>b.slice(0, n) };
  return o; }
/* a box: its size, its four-letter type, its body (a writer function or bytes) */
function box(type, body){ const w=W(); if(typeof body==='function') body(w); else if(body) w.bytes(body); const inner=w.out(), o=W(); o.u32(8+inner.length).str(type).bytes(inner); return o.out(); }
const full=(type, ver, flags, body)=>box(type, w=>{ w.u8(ver).u24(flags); if(body) body(w); });
const cat=(...parts)=>{ const w=W(); for(const p of parts) if(p) w.bytes(p); return w.out(); };
const MATRIX=[0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000];
const matrix=w=>{ for(const v of MATRIX) w.u32(v); };
/* an MPEG-4 descriptor: tag, a four-byte length (the long form every reader takes), body */
const desc=(tag, body)=>{ const b=u8(body), w=W(); w.u8(tag).u8(0x80|((b.length>>>21)&127)).u8(0x80|((b.length>>>14)&127)).u8(0x80|((b.length>>>7)&127)).u8(b.length&127).bytes(b); return w.out(); };

/* run-length time-to-sample entries from a list of durations */
function sttsOf(durs){ const runs=[]; for(const d of durs){ const r=runs[runs.length-1]; if(r && r[1]===d) r[0]++; else runs.push([1, d]); } return runs; }

/* each sample's duration in the track's timescale, from its timestamp (µs); the last lasts as long as `last` µs */
function durationsOf(ts, scale, lastUs){ const out=[]; let acc=0; const tick=us=>Math.round(us*scale/1e6);
  for(let i=0;i<ts.length;i++){ const end= i+1<ts.length ? ts[i+1] : ts[i]+lastUs, d=Math.max(1, tick(end-ts[0])-acc); out.push(d); acc+=d; } return out; }

function trak(id, kind, scale, durs, sizes, offsets, keys, entry, movieDur, w, h, edits=null){
  const dur=durs.reduce((a, b)=>a+b, 0), vid=kind==='vide';
  const tkhd=full('tkhd', 0, 3, o=>{ o.u32(0).u32(0).u32(id).u32(0).u32(movieDur).zeros(8).u16(0).u16(0).u16(vid ? 0 : 0x0100).u16(0); matrix(o); o.u32(vid ? w<<16 : 0).u32(vid ? h<<16 : 0); });
  const mdhd=full('mdhd', 0, 0, o=>{ o.u32(0).u32(0).u32(scale).u32(dur).u16(0x55c4).u16(0); });   // language «und»
  const hdlr=full('hdlr', 0, 0, o=>{ o.u32(0).str(kind).zeros(12).str(vid ? 'Video' : 'Sound').u8(0); });
  const mhd= vid ? full('vmhd', 0, 1, o=>{ o.u16(0).u16(0).u16(0).u16(0); }) : full('smhd', 0, 0, o=>{ o.u16(0).u16(0); });
  const dinf=box('dinf', full('dref', 0, 0, o=>{ o.u32(1).bytes(full('url ', 0, 1)); }));
  const runs=sttsOf(durs);
  const stbl=box('stbl', cat(full('stsd', 0, 0, o=>{ o.u32(1).bytes(entry); }),
    full('stts', 0, 0, o=>{ o.u32(runs.length); for(const [c, d] of runs) o.u32(c).u32(d); }),
    keys ? full('stss', 0, 0, o=>{ o.u32(keys.length); for(const k of keys) o.u32(k); }) : null,
    full('stsc', 0, 0, o=>{ o.u32(1).u32(1).u32(1).u32(1); }),
    full('stsz', 0, 0, o=>{ o.u32(0).u32(sizes.length); for(const s of sizes) o.u32(s); }),
    full('stco', 0, 0, o=>{ o.u32(offsets.length); for(const s of offsets) o.u32(s); })));
  /* an edit list: [duration (movie ticks), media time (track ticks; -1 = empty)] — the sound placed exactly on the picture's clock */
  const edts= edits && edits.length ? box('edts', full('elst', 0, 0, o=>{ o.u32(edits.length); for(const [d, m] of edits) o.u32(d).u32(m<0 ? 0xffffffff : m).u16(1).u16(0); })) : null;
  return box('trak', cat(tkhd, edts, box('mdia', cat(mdhd, hdlr, box('minf', cat(mhd, dinf, stbl))))));
}
function avc1(width, height, avcC){ return box('avc1', o=>{ o.zeros(6).u16(1).zeros(16).u16(width).u16(height).u32(0x00480000).u32(0x00480000).u32(0).u16(1).zeros(32).u16(0x18).u16(0xffff).bytes(box('avcC', avcC)); }); }
function mp4a(rate, channels, asc, bitrate){
  const dcd=desc(0x04, cat(new Uint8Array([0x40, 0x15, 0, 0, 0]), (()=>{ const w=W(); w.u32(bitrate).u32(bitrate); return w.out(); })(), desc(0x05, asc)));
  const es=desc(0x03, cat(new Uint8Array([0, 0, 0]), dcd, desc(0x06, new Uint8Array([2]))));
  return box('mp4a', o=>{ o.zeros(6).u16(1).zeros(8).u16(channels).u16(16).u16(0).u16(0).u32((rate&0xffff)<<16).bytes(full('esds', 0, 0, q=>q.bytes(es))); }); }

/* the file. video: { width, height, avcC, samples:[{ data, ts (µs), key }] }; audio (optional): { rate, channels, asc, bitrate, frame (samples a
   packet, 1024 for AAC), samples:[{ data }], skip (samples of the first packet before the clip's start), lead (µs of silence before the first
   packet) } — audio packets are back to back. → Uint8Array */
export function mp4Write(video, audio=null){
  const V=video.samples; if(!V.length) throw new Error('mp4: no video samples');
  const vts=V.map(s=>s.ts), lastUs= V.length>1 ? Math.max(1, Math.round((vts[V.length-1]-vts[0])/(V.length-1))) : 33333;
  const vd=durationsOf(vts, VT, lastUs), vSizes=V.map(s=>u8(s.data).length), keys=[]; V.forEach((s, i)=>{ if(s.key) keys.push(i+1); });
  if(!keys.length || keys[0]!==1) throw new Error('mp4: the first video sample must be a key frame');
  const A=audio && audio.samples.length ? audio : null, aSizes= A ? A.samples.map(s=>u8(s.data).length) : [], ad= A ? A.samples.map(()=>A.frame||1024) : [];
  const vDurMs=vd.reduce((a, b)=>a+b, 0)*1000/VT, aDurMs= A ? ad.reduce((a, b)=>a+b, 0)*1000/A.rate : 0, movieDur=Math.round(Math.max(vDurMs, aDurMs));
  const leadMs= A ? Math.round((A.lead||0)/1000) : 0, aEdits= A && (A.skip>0 || leadMs>0) ? [...(leadMs>0 ? [[leadMs, -1]] : []), [Math.max(1, Math.round(aDurMs-(A.skip||0)*1000/A.rate)), A.skip||0]] : null;
  const ftyp=box('ftyp', o=>{ o.str('isom').u32(0x200).str('isom').str('iso2').str('avc1').str('mp41'); });
  /* the moov's size does not depend on the offsets' values: build it once with zeros, then with the real offsets */
  const build=(vOff, aOff)=>{ const mvhd=full('mvhd', 0, 0, o=>{ o.u32(0).u32(0).u32(1000).u32(movieDur).u32(0x10000).u16(0x0100).zeros(10); matrix(o); o.zeros(24).u32(A ? 3 : 2); });
    return box('moov', cat(mvhd, trak(1, 'vide', VT, vd, vSizes, vOff, keys, avc1(video.width, video.height, u8(video.avcC)), movieDur, video.width, video.height),
      A ? trak(2, 'soun', A.rate, ad, aSizes, aOff, null, mp4a(A.rate, A.channels, u8(A.asc), A.bitrate||128000), movieDur, 0, 0, aEdits) : null)); };
  const moovLen=build(vSizes.map(()=>0), aSizes.map(()=>0)).length, dataAt=ftyp.length+moovLen+8;
  /* mdat: the samples interleaved by time (video and audio in the order a player needs them) */
  const order=[]; V.forEach((s, i)=>order.push([s.ts-vts[0], 0, i])); if(A){ let t=0; A.samples.forEach((s, i)=>{ order.push([t, 1, i]); t+=(A.frame||1024)*1e6/A.rate; }); }
  order.sort((a, b)=>a[0]-b[0] || a[1]-b[1]);
  const vOff=new Array(V.length), aOff=new Array(aSizes.length); let at=dataAt, total=0; for(const [, k, i] of order){ const sz= k ? aSizes[i] : vSizes[i]; if(k) aOff[i]=at; else vOff[i]=at; at+=sz; total+=sz; }
  if(at>0xffffffff) throw new Error('mp4: over 4 GB');
  const moov=build(vOff, aOff); if(moov.length!==moovLen) throw new Error('mp4: moov size moved');
  const out=new Uint8Array(ftyp.length+moov.length+8+total); out.set(ftyp, 0); out.set(moov, ftyp.length);
  let p=ftyp.length+moov.length; out[p]=(8+total)>>>24&255; out[p+1]=(8+total)>>>16&255; out[p+2]=(8+total)>>>8&255; out[p+3]=(8+total)&255; out.set([0x6d, 0x64, 0x61, 0x74], p+4); p+=8;
  for(const [, k, i] of order){ const d=u8(k ? A.samples[i].data : V[i].data); out.set(d, p); p+=d.length; }
  return out; }

/* THE READER (the checks' own, and a sanity pass before a file is handed over): the box tree, each track's sample table → { boxes, tracks:[{
   kind, scale, durations, sizes, offsets, keys, width, height, rate, channels }], size }. Throws on a box that runs past its parent. */
export function mp4Read(bytes){ const b=u8(bytes), dv=new DataView(b.buffer, b.byteOffset, b.byteLength), u32=p=>dv.getUint32(p), typ=p=>String.fromCharCode(b[p], b[p+1], b[p+2], b[p+3]);
  const CONT=new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'edts']), boxes=[], tracks=[]; let cur=null;
  const walk=(from, to, depth)=>{ let p=from; while(p<to){ if(p+8>to) throw new Error('mp4: a box header past its parent at '+p); const size=u32(p), t=typ(p+4); if(size<8 || p+size>to) throw new Error(`mp4: box ${t} at ${p} runs past its parent`);
      boxes.push([depth, t, size]); const body=p+8;
      if(t==='trak'){ cur={ kind:null }; tracks.push(cur); }
      if(CONT.has(t)) walk(body, p+size, depth+1);
      else if(cur){ const q=body+4;   // past version and flags
        if(t==='mdhd'){ cur.scale=u32(q+8); cur.duration=u32(q+12); }
        else if(t==='hdlr') cur.kind=typ(q+4);
        else if(t==='tkhd'){ cur.width=u32(q+72)>>>16; cur.height=u32(q+76)>>>16; }
        else if(t==='stts'){ const n=u32(q), d=[]; for(let i=0;i<n;i++){ const c=u32(q+4+i*8), v=u32(q+8+i*8); for(let k=0;k<c;k++) d.push(v); } cur.durations=d; }
        else if(t==='stss'){ const n=u32(q), k=[]; for(let i=0;i<n;i++) k.push(u32(q+4+i*4)); cur.keys=k; }
        else if(t==='stsz'){ const n=u32(q+4), s=[]; for(let i=0;i<n;i++) s.push(u32(q+8+i*4)); cur.sizes=s; }
        else if(t==='elst'){ const n=u32(q), e=[]; for(let i=0;i<n;i++){ const m=u32(q+8+i*12); e.push([u32(q+4+i*12), m===0xffffffff ? -1 : m]); } cur.edits=e; }
        else if(t==='stco'){ const n=u32(q), s=[]; for(let i=0;i<n;i++) s.push(u32(q+4+i*4)); cur.offsets=s; }
        else if(t==='stsd'){ const e=q+4, et=typ(e+4); cur.entry=et; if(et==='mp4a'){ cur.channels=dv.getUint16(e+8+16); cur.rate=u32(e+8+24)>>>16; } } }
      p+=size; } };
  walk(0, b.length, 0); return { boxes, tracks, size:b.length }; }
