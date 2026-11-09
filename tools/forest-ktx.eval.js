/* NIGHT-6 slice 3 — THE KTX2 / BASIS LAB, browser half (development only; nothing here ships). On this machine's GPU, for each plant sheet
   (the master 2048² and the medium 1024²): the opening's path for the PNG we ship today — fetch, decode (as the forest does: blob → image →
   decode), upload with mipmaps generated on the GPU — against KTX2: fetch the KTX2, then upload every level as compressed blocks (BC7 where the
   GPU takes it, else BC3). The transcode between them is timed by tools/forest-ktx-lab.mjs in node (V8, as Chrome; the transcoder's JavaScript
   glue uses eval, which our page's CSP refuses — a finding of this lab), which also saved the blocks this page uploads. Three runs, the median.
   Run: node tools/forest-ktx-lab.mjs, then node tools/probe-browser.mjs --app night --eval tools/forest-ktx.eval.js --no-ui */
const LAB='/tools/.ktx-lab/out/', TEXD='/apps/night/rooms/forest/tex/', med=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
const J=await (await fetch(LAB+'lab.json', { cache:'no-store' })).json();
const cv=document.createElement('canvas'); cv.width=cv.height=4; const gl=cv.getContext('webgl2');
const bptc=gl.getExtension('EXT_texture_compression_bptc'), s3tc=gl.getExtension('WEBGL_compressed_texture_s3tc'), astc=gl.getExtension('WEBGL_compressed_texture_astc'), etc=gl.getExtension('WEBGL_compressed_texture_etc');
const T= bptc ? { name:'BC7', key:'bc7', gl:bptc.COMPRESSED_RGBA_BPTC_UNORM_EXT } : s3tc ? { name:'BC3', key:'bc3', gl:s3tc.COMPRESSED_RGBA_S3TC_DXT5_EXT } : null;
const sync=()=>{ gl.finish(); const p=new Uint8Array(4); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p); };
async function viaPng(name){ const t0=performance.now(), r=await fetch(TEXD+name+'.png', { cache:'no-store' }), b=await r.blob(), t1=performance.now();
  const u=URL.createObjectURL(b), img=new Image(); img.src=u; await img.decode(); URL.revokeObjectURL(u); const t2=performance.now();
  const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); sync(); const t3=performance.now(); gl.deleteTexture(tex);
  return { fetch:t1-t0, decode:t2-t1, upload:t3-t2, total:t3-t0, bytes:b.size, gpu:Math.round(img.width*img.height*4*4/3) }; }
async function viaKtx(name, mode){ const row=J.rows.find(r=>r.file===name+'.png' && r.mode===mode), meta=row[T.key];
  const t0=performance.now(), k=await (await fetch(LAB+name+'.'+mode+'.ktx2', { cache:'no-store' })).arrayBuffer(), t1=performance.now();
  const blocks=new Uint8Array(await (await fetch(LAB+name+'.'+mode+'.'+T.key+'.bin', { cache:'no-store' })).arrayBuffer()), t2=performance.now();
  const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); let o=0; meta.levels.forEach(([w,h,n],i)=>{ gl.compressedTexImage2D(gl.TEXTURE_2D, i, T.gl, w, h, 0, blocks.subarray(o, o+n)); o+=n; }); sync(); const t3=performance.now(); gl.deleteTexture(tex);
  return { fetch:t1-t0, transcode:meta.transcodeMs, upload:t3-t2, total:(t1-t0)+meta.transcodeMs+(t3-t2), bytes:k.byteLength, gpu:meta.gpu, levels:meta.levels.length, psnr:row.psnr }; }
const rows=[];
for(const name of ['floor-2048','floor-1024']){
  const runs={ png:[], etc1s:[], uastc:[] };
  for(let k=0;k<3;k++){ runs.png.push(await viaPng(name)); if(T) for(const m of ['etc1s','uastc']) runs[m].push(await viaKtx(name, m)); }
  for(const [kind, rs] of Object.entries(runs)){ if(!rs.length) continue; const o={ file:name, kind, format: kind==='png' ? 'RGBA8, mipmaps made on the GPU' : T.name };
    for(const key of Object.keys(rs[0])) o[key]=+med(rs.map(x=>x[key])).toFixed(1); rows.push(o); } }
return { gpu:gl.getParameter(gl.RENDERER), formats:{ bptc:!!bptc, s3tc:!!s3tc, astc:!!astc, etc:!!etc }, target:T && T.name, commit:J.commit, rows };
