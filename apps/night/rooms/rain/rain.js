/* RAIN-0 — THE RAIN ROOM's picture (docs/night/design/RAIN/CONCEPT.md; the plan and what is still a placeholder: PLAN.md). Built with three.js
   r128 through the scene host, as any room. A frame is three passes and two small ones, all full-screen (no camera travels: the city is far):
   1. THE VIEW: the city's prepared picture (painted once per opening / resize / mood, with one blurred copy), sharp and blurred mixed by the
      focus, then the lights on top — lit windows and far lights, each growing into a soft disc as it leaves focus;
   2. its small SOFT COPY (what is seen through mist and inside a drop);
   3. THE GLASS, to the screen: drops, rivulets, mist with its clearing, the playing light on the pane (rain-glass.js).
   DEPTH IS FOCUS (pure/focus.js): the playing hand's depth pulls the focus between the glass and the city. A note with the focus far lights the
   window the light points at (pure/windows.js: the pick, the slow fade); with the focus near it wipes the mist (pure/glass.js).
   The city here is a PLACEHOLDER in the concept's palette: two plain houses, a hill line with far lights, a sky. Every colour is a token
   (--cv-rain-*). Seeded: the same picture on every device. No sound, no network. */
import { seeded } from '../../../../core/pure/dsp.js';
import { roomFov, roomLook } from '../../pure/room.js';
import { MOOD_TC } from '../../pure/cycle.js';
import { RAIN_ROOM } from './pure/room.js';
import { FOCUS, focusTarget, focusStep, focusBlur } from './pure/focus.js';
import { RAIN_SEED, HOUSES, HILL, hillAt, windowsLayout, farLights, windowPick, windowLight } from './pure/windows.js';
import { GLASS, wipeNew, wipeStamp, wipeStep, wipeAt } from './pure/glass.js';
import { QUAD_V, BLUR_F, VIEW_F, WIN_V, WIN_F, PT_V, PT_F, glassShader } from './rain-glass.js';

export const RAIN_LEVELS=RAIN_ROOM.levels;
export const BOKEH=Object.freeze({ r:0.03, pad:0.02, lean:Object.freeze([0.03, 0.015]), breath:0.004 });   // the blur's radius at full, the spill's reach, the pane's slide (view-angle units)
const clamp=(v, a, b)=>Math.max(a, Math.min(b, v));
/* nothing to fetch yet (the prepared layers come with PLAN.md slice 1); the room's load awaits this as the forest's awaits its files */
export const rainAssets=()=>Promise.resolve({});

/* T — the THREE namespace; opt: { C (palette.cv), level, w, h, reduce, mood, lv (measurement overrides) } */
export function buildRain(T, opt){
  const C=opt.C, Lv={ ...(RAIN_LEVELS[opt.level]||RAIN_LEVELS.full), ...(opt.lv||{}) }, reduce=!!opt.reduce, own=[];
  const col=n=>new T.Color(C('rain-'+n)), css=(c, a=1)=>`rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${a})`;
  /* the mood's look: its colours (tokens) and amounts, eased towards a new mood's (τ MOOD_TC); a new look repaints the city once */
  const looks=new Map(), lookCols=L=>{ let c=looks.get(L.pre); if(!c){ c={}; for(const [k, n] of Object.entries(L.tokens)) c[k]=new T.Color(C(n)); looks.set(L.pre, c); } return c; };
  let moodId=opt.mood||null, look=roomLook(RAIN_ROOM, moodId), mistK=look.mist, rainK=look.rain, litK=look.lit, painted=null;
  const PANE=col('pane'), HONEY=col('honey'), AMBER=col('amber'), LAMP=col('lamp'), LIGHT=col('light'), mistCol=lookCols(look).mist.clone();
  let W=opt.w, H=opt.h, tw=1, th=1, bw=0, bh=0, now=0, dirty=true, repaints=0, frames=0;

  /* ---- the city's prepared picture (the placeholder), painted in view-angle units on a canvas of the buffer's size ---- */
  const cv=document.createElement('canvas'), g=cv.getContext('2d'), baseTex=new T.CanvasTexture(cv);
  baseTex.minFilter=baseTex.magFilter=T.LinearFilter; baseTex.generateMipmaps=false; own.push(baseTex);
  const WIN=windowsLayout(), FAR=farLights(Lv.farLights);
  function paintCity(){
    const P=lookCols(look), X=x=>(x/tw*0.5+0.5)*cv.width, Y=y=>(0.5-y/th*0.5)*cv.height, S=v=>v/(2*th)*cv.height, R=seeded(RAIN_SEED^0x534B59);
    const sky=g.createLinearGradient(0, Y(th), 0, Y(HILL.y-0.1)); sky.addColorStop(0, css(P.sky)); sky.addColorStop(0.6, css(P.cloud)); sky.addColorStop(1, css(P.glow));
    g.globalCompositeOperation='source-over'; g.fillStyle=sky; g.fillRect(0, 0, cv.width, cv.height);
    /* low clouds: dark bodies, their undersides lit warm by the city */
    for(let i=0;i<34;i++){ const x=-1.5+3*R(), y=HILL.y+0.03+(Math.max(th, 0.5)-HILL.y)*R(), rx=S(0.14+0.4*R()), ry=S(0.025+0.06*R()), under=i%2===1;
      g.save(); g.translate(X(x), Y(y)+(under ? ry*0.7 : 0)); g.scale(1, ry/rx); const gr=g.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, css(under ? P.glow : P.sky, under ? 0.22 : 0.5)); gr.addColorStop(1, css(under ? P.glow : P.sky, 0)); g.fillStyle=gr; g.fillRect(-rx, -rx, 2*rx, 2*rx); g.restore(); }
    /* the hills: a far ridge in haze, a nearer one darker, the city's glow rising behind them */
    const ridge=(dy, kx, c)=>{ g.beginPath(); g.moveTo(0, cv.height); for(let i=0;i<=64;i++){ const x=-tw+2*tw*i/64; g.lineTo(X(x), Y(hillAt(x*kx+(kx-1)*3)+dy)); } g.lineTo(cv.width, cv.height); g.closePath(); g.fillStyle=c; g.fill(); };
    { const gl=g.createLinearGradient(0, Y(HILL.y+0.16), 0, Y(HILL.y-0.05)); gl.addColorStop(0, css(P.glow, 0)); gl.addColorStop(1, css(P.glow, 0.45)); g.fillStyle=gl; g.fillRect(0, Y(HILL.y+0.16), cv.width, S(0.21)); }
    ridge(0, 1, css(P.haze)); ridge(-0.045, 1.35, css(P.haze.clone().lerp(P.stone, 0.55)));
    /* the street's glow between the houses, then the houses: plaster lit from the street below, stone in shadow above, dark panes */
    { const gl=g.createLinearGradient(0, Y(0.05), 0, Y(-th)); gl.addColorStop(0, css(P.asphalt)); gl.addColorStop(1, css(P.asphalt.clone().lerp(LAMP, 0.28))); g.fillStyle=gl; g.fillRect(0, Y(0.05), cv.width, cv.height); }
    HOUSES.forEach((Hh, hi)=>{ const x0=X(Hh.x0), x1=X(Hh.x1), y1=Y(Hh.y1), wall=g.createLinearGradient(0, y1, 0, Y(-Math.max(th, 0.6)));
      wall.addColorStop(0, css(P.stone)); wall.addColorStop(1, css(P.stone.clone().lerp(P.plaster, hi ? 0.5 : 0.85))); g.fillStyle=wall; g.fillRect(x0, y1, x1-x0, cv.height-y1);
      g.fillStyle=css(P.stone.clone().multiplyScalar(0.6)); g.fillRect(x0-S(0.006), y1-S(0.012), x1-x0+S(0.012), S(0.016)); });
    for(const w of WIN){ g.fillStyle=css(PANE); g.fillRect(X(w.x-w.hw), Y(w.y+w.hh), S(2*w.hw), S(2*w.hh));
      g.fillStyle=css(P.plaster, 0.35); g.fillRect(X(w.x-w.hw*1.15), Y(w.y-w.hh), S(2.3*w.hw), Math.max(1, S(0.004))); }
    baseTex.needsUpdate=true; painted=look; repaints++;
  }

  /* ---- the passes: one scene, the pass's own meshes shown ---- */
  const scene=new T.Scene(), camera=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad=new T.PlaneGeometry(2, 2); own.push(quad);
  const flat={ depthTest:false, depthWrite:false, toneMapped:false }, add=(m, order)=>{ m.frustumCulled=false; m.renderOrder=order; scene.add(m); return m; };   // all shown outside a pass: the host compiles every program at the opening
  const mat=(o)=>{ const m=new T.ShaderMaterial({ ...flat, ...o }); own.push(m); return m; };
  const rt=(w, h)=>new T.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { minFilter:T.LinearFilter, magFilter:T.LinearFilter, format:T.RGBAFormat, depthBuffer:false, stencilBuffer:false });
  const RT={}; own.push({ dispose:()=>{ for(const k in RT){ RT[k].dispose(); delete RT[k]; } } });
  const blurM=mat({ uniforms:{ uTex:{ value:null }, uDir:{ value:new T.Vector2() } }, vertexShader:QUAD_V, fragmentShader:BLUR_F });
  const viewM=mat({ uniforms:{ uBase:{ value:baseTex }, uBlur:{ value:null }, uK:{ value:1 }, uTan:{ value:new T.Vector2(1, 1) }, uLight:{ value:new T.Vector3() }, uLightCol:{ value:LIGHT } }, vertexShader:QUAD_V, fragmentShader:VIEW_F });
  const qBlur=add(new T.Mesh(quad, blurM), 0), qView=add(new T.Mesh(quad, viewM), 0);
  /* the windows: one instance each */
  const wg=new T.InstancedBufferGeometry(); own.push(wg);
  wg.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3)); wg.setIndex([0,1,2, 0,2,3]);
  const lit=new Float32Array(WIN.length), litAt=new Float64Array(WIN.length).fill(-1e9), litAttr=new T.InstancedBufferAttribute(lit, 1); litAttr.setUsage(T.DynamicDrawUsage);
  wg.setAttribute('aRect', new T.InstancedBufferAttribute(new Float32Array(WIN.flatMap(w=>[w.x, w.y, w.hw, w.hh])), 4));
  wg.setAttribute('aWarm', new T.InstancedBufferAttribute(new Float32Array(WIN.map(w=>w.warm)), 1)); wg.setAttribute('aLit', litAttr); wg.instanceCount=WIN.length;
  const UR={ value:0 }, UT={ value:new T.Vector2(1, 1) }, UTIME={ value:0 };
  const winM=mat({ uniforms:{ uTan:UT, uR:UR, uPad:{ value:BOKEH.pad }, uHoney:{ value:HONEY }, uAmber:{ value:AMBER } }, vertexShader:WIN_V, fragmentShader:WIN_F,
    transparent:true, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });
  const wins=add(new T.Mesh(wg, winM), 1);
  /* the far lights on the hill and three street lamps between the houses */
  const lamps=[[0.55, -0.2], [0.553, -0.36], [0.548, -0.55]], NP=FAR.length+lamps.length, pg=new T.BufferGeometry(); own.push(pg);
  { const pos=new Float32Array(NP*3), pc=new Float32Array(NP*3), pk=new Float32Array(NP), pb=new Float32Array(NP), ps=new Float32Array(NP), R=seeded(RAIN_SEED^0x4C54);
    FAR.forEach((q, i)=>{ pos[i*3]=q.x; pos[i*3+1]=q.y; const c=HONEY.clone().lerp(AMBER, q.warm); pc[i*3]=c.r; pc[i*3+1]=c.g; pc[i*3+2]=c.b; pk[i]=1.1*q.k; pb[i]=0.0034; ps[i]=R(); });
    lamps.forEach(([x, y], j)=>{ const i=FAR.length+j; pos[i*3]=x; pos[i*3+1]=y; pc[i*3]=LAMP.r; pc[i*3+1]=LAMP.g; pc[i*3+2]=LAMP.b; pk[i]=1; pb[i]=0.008; ps[i]=0; });
    pg.setAttribute('position', new T.BufferAttribute(pos, 3)); pg.setAttribute('aCol', new T.BufferAttribute(pc, 3)); pg.setAttribute('aK', new T.BufferAttribute(pk, 1));
    pg.setAttribute('aBase', new T.BufferAttribute(pb, 1)); pg.setAttribute('aSeed', new T.BufferAttribute(ps, 1)); }
  const ptM=mat({ uniforms:{ uTan:UT, uR:UR, uPx:{ value:1 }, uTime:UTIME }, vertexShader:PT_V, fragmentShader:PT_F, transparent:true, blending:T.AdditiveBlending });
  const pts=add(new T.Points(pg, ptM), 2);
  /* the glass and its wipe map */
  const wipe=wipeNew(), wipeBytes=new Uint8Array(GLASS.cols*GLASS.rows), wipeTex=new T.DataTexture(wipeBytes, GLASS.cols, GLASS.rows, T.LuminanceFormat);
  wipeTex.minFilter=wipeTex.magFilter=T.LinearFilter; wipeTex.generateMipmaps=false; wipeTex.needsUpdate=true; own.push(wipeTex);
  const glassM=mat({ uniforms:{ uView:{ value:null }, uSoft:{ value:null }, uWipe:{ value:wipeTex }, uTan:UT, uOff:{ value:new T.Vector2() }, uExt:{ value:new T.Vector2(GLASS.ext[0], GLASS.ext[1]) },
    uLight:{ value:new T.Vector2() }, uTime:UTIME, uRain:{ value:rainK }, uMist:{ value:mistK }, uG:{ value:0 }, uLightK:{ value:0 }, uLightCol:{ value:LIGHT }, uMistCol:{ value:mistCol } },
    vertexShader:QUAD_V, fragmentShader:glassShader(Lv.drops, Lv.rivulets) });
  const qGlass=add(new T.Mesh(quad, glassM), 0), ALL=[qBlur, qView, wins, pts, qGlass];
  const show=(...on)=>{ for(const m of ALL) m.visible=on.includes(m); };
  const pass=(r, target, ...on)=>{ show(...on); r.setRenderTarget(target); r.render(scene, camera); };
  const blur=(r, from, to, dx, dy)=>{ blurM.uniforms.uTex.value=from; blurM.uniforms.uDir.value.set(dx, dy); pass(r, to, qBlur); };
  const size=new T.Vector2();
  function targets(r){
    r.getDrawingBufferSize(size); const w=size.x, h=size.y; if(w===bw && h===bh) return; bw=w; bh=h;
    for(const k in RT){ RT[k].dispose(); delete RT[k]; }
    const q=(a)=>Math.max(2, Math.round(a/4));
    RT.view=rt(w, h); RT.b1=rt(q(w), q(h)); RT.b2=rt(q(w), q(h)); RT.s1=rt(q(w), q(h)); RT.s2=rt(q(w), q(h));
    cv.width=Math.min(w, 2048); cv.height=Math.max(2, Math.round(cv.width*h/w)); dirty=true;
    viewM.uniforms.uBlur.value=RT.b2.texture; glassM.uniforms.uView.value=RT.view.texture; glassM.uniforms.uSoft.value=RT.s2.texture; ptM.uniforms.uPx.value=h/(2*th);
  }
  /* one frame on the screen (the host calls it; a frame drawn twice is the same picture: nothing here steps the room) */
  function render(r){
    targets(r); const keep=r.getRenderTarget();
    if(dirty){ dirty=false; paintCity(); const dx=1/RT.b1.width, dy=1/RT.b1.height;   // the city's blurred copy, made once: two rounds, the second wider
      blur(r, baseTex, RT.b1, dx, 0); blur(r, RT.b1.texture, RT.b2, 0, dy); blur(r, RT.b2.texture, RT.b1, 2*dx, 0); blur(r, RT.b1.texture, RT.b2, 0, 2*dy); }
    pass(r, RT.view, qView, wins, pts);
    blur(r, RT.view.texture, RT.s1, 1.2/RT.s1.width, 0); blur(r, RT.s1.texture, RT.s2, 0, 1.2/RT.s2.height);
    pass(r, keep, qGlass); show(...ALL); frames++;
  }

  /* ---- the room's state: the focus, the playing light, the lean ---- */
  let focus=FOCUS.rest, target=FOCUS.rest, restOn=false, heldNow=0, lastPick=-1, picks=0, wipes=0, viewOver=null; const pickLog=[];
  const light={ x:0, y:0, on:0, d:0, glow:0.6 }, off={ x:0, y:0 };
  const toTan=(px, py)=>[(px/W*2-1)*tw, (1-py/H*2)*th];
  function resize(w, h, bufH){ W=w; H=h; const fov= viewOver && viewOver.fov ? viewOver.fov : roomFov(RAIN_ROOM.view, w, h); th=Math.tan(fov*Math.PI/360); tw=th*w/h; UT.value.set(tw, th);
    viewM.uniforms.uTan.value.set(tw, th); ptM.uniforms.uPx.value=(bufH||h)/(2*th); dirty=true; }
  /* one frame: hands = [{ x, y, d, play, glow }] (canvas pixels; d 0 near … 1 far); nin = the bus «nightSky» ({ mood }) */
  function update(dt, t, hands, fx, nin){
    now=t; UTIME.value=t;
    if(nin && nin.mood!==undefined && nin.mood!==moodId){ moodId=nin.mood; look=roomLook(RAIN_ROOM, moodId); }
    if(look!==painted && painted) dirty=true;
    { const a=1-Math.exp(-dt/MOOD_TC); mistK+=(look.mist-mistK)*a; rainK+=(look.rain-rainK)*a; litK+=(look.lit-litK)*a; mistCol.lerp(lookCols(look).mist, a); }
    const play=(hands||[]).find(h=>h.play);
    if(play){ const [x, y]=toTan(play.x, play.y); if(light.on<0.02){ light.x=x; light.y=y; } const k=1-Math.exp(-dt*13); light.x+=(x-light.x)*k; light.y+=(y-light.y)*k; light.d=play.d; light.glow=play.glow==null ? 0.6 : play.glow; }
    light.on+=((play ? 1 : 0)-light.on)*Math.min(1, dt*(play ? 6 : 2.5));
    target= play ? focusTarget(play.d) : FOCUS.rest; focus=focusStep(focus, target, dt, !!play);
    const B=focusBlur(focus);
    /* the pane slides a little against the city as the camera leans towards the light and breathes (none at rest: the start still's pose) */
    { const k=(reduce ? 0.3 : 1)*(Lv.lean ? 1 : 0), gx= restOn || viewOver ? 0 : -clamp(light.x/Math.max(tw, 0.3), -1, 1)*BOKEH.lean[0]*light.on*k+(reduce ? 0 : Math.sin(t*0.19)*BOKEH.breath),
        gy= restOn || viewOver ? 0 : -clamp(light.y/Math.max(th, 0.3), -1, 1)*BOKEH.lean[1]*light.on*k+(reduce ? 0 : Math.sin(t*0.23)*BOKEH.breath), a= restOn ? 1 : 1-Math.exp(-dt*1.6);
      off.x+=(gx-off.x)*a; off.y+=(gy-off.y)*a; }
    /* a held note near the glass keeps its patch clear (the light draws); the mist returns by itself */
    if(heldNow>0 && light.on>0.5 && focus<0.55){ wipeStamp(wipe, light.x+off.x, light.y+off.y, 1-focus); wipes++; }
    const was=wipe.live; if(wipeStep(wipe, dt) || was){ for(let i=0;i<wipeBytes.length;i++) wipeBytes[i]=Math.round(wipe.a[i]*255); wipeTex.needsUpdate=true; }
    for(let i=0;i<WIN.length;i++) lit[i]=windowLight(WIN[i], litK, t-litAt[i]);
    litAttr.needsUpdate=true;
    UR.value=BOKEH.r*B.city; viewM.uniforms.uK.value=Math.pow(B.city, 0.7); viewM.uniforms.uLight.value.set(light.x, light.y, light.on*focus*(0.5+0.5*light.glow));
    const G=glassM.uniforms; G.uOff.value.set(off.x, off.y); G.uRain.value=rainK; G.uMist.value=mistK; G.uG.value=B.glass; G.uLight.value.set(light.x, light.y); G.uLightK.value=light.on*(1-focus)*(0.5+0.5*light.glow);
  }
  /* a note began on the playing hand: far — the window the light points at comes on; near — the mist under the light is wiped */
  function glint(i, vel){ if(i!==0 || light.on<0.05) return;
    if(focus>=0.45){ const k=windowPick(WIN, light.x, light.y); lastPick=k; if(k>=0){ litAt[k]=now; picks++; pickLog.push(k); if(pickLog.length>32) pickLog.shift(); } }
    if(focus<0.55){ wipeStamp(wipe, light.x+off.x, light.y+off.y, clamp((vel==null ? 0.6 : vel)*1.4, 0.4, 1)*(1-focus)); wipes++; } }
  /* a window on the screen (the view's px): its centre and half size */
  const windowAt=i=>{ const w=WIN[i]; return w ? { i, x:(w.x/tw*0.5+0.5)*W, y:(0.5-w.y/th*0.5)*H, r:w.hw/(2*tw)*W, inView:Math.abs(w.x)+w.hw<tw && Math.abs(w.y)+w.hh<th } : null; };
  /* the start's dot becomes the first lit window (the host's fly doors): a dark one near the deep middle of the picture */
  function flyPick(){ let best=null, bd=Infinity; WIN.forEach((w, i)=>{ const q=windowAt(i); if(!q.inView || lit[i]>0.05) return; const d=Math.hypot(q.x/W-0.56, q.y/H-0.5); if(d<bd){ bd=d; best=i; } }); return best; }
  const state=()=>({ focus, target, blur:focusBlur(focus), light:{ ...light }, off:{ ...off }, windows:WIN.length, lit:Array.from(lit), litNow:lit.reduce((n, v)=>n+(v>0.05 ? 1 : 0), 0), lastPick, picks, pickLog:pickLog.slice(), wipes,
    wipe:{ live:wipe.live, max:wipe.a.reduce((a, b)=>Math.max(a, b), 0) }, mood:moodId, look:look.pre, mist:mistK, rain:rainK, share:litK, tan:[tw, th], buffer:[bw, bh], repaints, frames, drops:Lv.drops, rivulets:Lv.rivulets, far:FAR.length });
  function texBytes(){ let b=cv.width*cv.height*4+GLASS.cols*GLASS.rows; for(const k in RT) b+=RT[k].width*RT[k].height*4; return b; }
  function dispose(){ for(const o of own) try{ o.dispose(); }catch(e){} own.length=0; }
  resize(W, H);
  return { id:RAIN_ROOM.id, scene, camera, update, resize, render, glint, state, dispose, texBytes, held:sec=>{ heldNow= sec>0 ? sec : 0; }, project:()=>null,
    rest:on=>{ restOn=!!on; return restOn; }, restDbg:()=>({ rest:restOn, off:[off.x, off.y], fov:Math.atan(th)*360/Math.PI }),
    viewDbg:o=>{ viewOver=o||null; resize(W, H); return viewOver; },
    flyPick, flyAt:i=>{ const q=windowAt(i); return q ? { i, x:q.x, y:q.y, r:Math.max(1.5, q.r), glow:lit[i], dist:30, front:q.inView } : null; }, flyLand:i=>{ if(!WIN[i]) return false; litAt[i]=now; return true; },
    windowAt, wipeAtDbg:(x, y)=>wipeAt(wipe, x, y), focusDbg:v=>{ if(v!=null) focus=clamp(+v, 0, 1); return focus; } };
}
