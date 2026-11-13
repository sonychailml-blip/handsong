/* NIGHT-3 stage 5 part 2: THE TEST ROOM — a development room players never see, registered only by the row «NIGHT room switch» or by the page
   address ?probe&testroom (then the Room button shows: two rooms). Its record is the forest's with its own id, name, nature and a music bed
   recipe object of its own (the same numbers at another level), so a switch exercises every part: the picture, the nature crossfade, the bed's
   recipe. Its nature is SILENT (the user, step 133: the forest's wind and crickets belong to the forest only — a switch must take them away,
   and a lower wind with one cricket still sounded like the forest). Its picture is ONE full-screen shader (a slow gradient). Modes (testRoomMode): 'plain'; 'leak' — each build makes a texture it never
   frees (the row's CONTROL that a leak is caught); 'fail' — the build throws (the stand-in must show); 'slow' — its code arrives after `ms`. */
import { FOREST_ROOM } from '../../../apps/night/rooms/forest/pure/room.js';
import { checkRoom } from '../../../apps/night/pure/room.js';
import { roomAdd, roomRemove } from '../../../apps/night/rooms/index.js';
import { sceneRoomAdd, sceneRoomRemove } from '../../../apps/night/scene/host.js';

export const TEST_ROOM_ID='room.dev-test', TEST_TINT='#f4b860';   // DESIGN-1: its tint, a warm amber (its token defined on the page while it is in)
const F=Object.freeze;
export const TEST_ROOM=F({ ...FOREST_ROOM, id:TEST_ROOM_ID, name:F({ en:'Test room', ru:'Тестовая комната' }), icon:'depth', tint:'forest-devtest-tint',   // DESIGN-1: a warm amber (TEST_TINT, defined on the page while the room is in) — the interface's accents must follow it here
    // NIGHT-8: its own Room-sounds icon (the row checks the slider shows it)
  nature:F({ id:'ambience.dev-test',   // silent: no drone, no wind, no crickets, no stream (every gain 0; the shape the validator asks for)
    drone:F({ root:0, fifth:0, tc:1.2, send:0 }),
    wind:F({ hz:300, q:0.8, sweep:120, rate:0.11, gain:0, send:0, sec:2, seed:0x54455354 }),
    crickets:F({ ...FOREST_ROOM.nature.crickets, n:1, gain:0, send:0, pans:F([0.2]) }),
    echo:F({ time:0.29, fb:0.3, lp:1600 }),
    level:0.6, master:0.42, ahead:0.35 }),
  bed:F({ ...FOREST_ROOM.bed, level:0.55 }), bed2:F({ ...FOREST_ROOM.bed2, level:0.55 }) });
const S={ mode:'plain', ms:0, builds:0, disposed:0, stand:0, leaked:[] };
export const testRoomMode=(mode, o={})=>{ S.mode=mode||'plain'; S.ms=o.ms||0; return { ...S, leaked:S.leaked.length }; };
export const testRoomInfo=()=>({ mode:S.mode, builds:S.builds, disposed:S.disposed, stand:S.stand, leaked:S.leaked.length });
/* the leaked textures are freed again (the row's clean-up after its CONTROL) */
export const testRoomFreeLeaks=()=>{ for(const t of S.leaked.splice(0)) try{ t.dispose(); }catch(e){} };
function standIn(ctx, W, H, hands, cv){ S.stand++; ctx.fillStyle=cv('hn-dark'); ctx.fillRect(0, 0, W, H); }   // a plain colour: the row counts the calls
function build(T, opt){
  if(S.mode==='fail') throw new Error('the test room failed on purpose');
  S.builds++;
  const scene=new T.Scene(), camera=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), geo=new T.PlaneGeometry(2, 2);
  /* only the leaking variant samples a texture (a sampler without one would make three.js upload its shared placeholder once) */
  const leak=S.mode==='leak', u={ uTime:{ value:0 } };
  if(leak){ const t=new T.DataTexture(new Uint8Array([40, 60, 90, 255]), 1, 1, T.RGBAFormat); t.needsUpdate=true; u.uTex={ value:t }; S.leaked.push(t); }
  const mat=new T.ShaderMaterial({ uniforms:u, vertexShader:'varying vec2 vU; void main(){ vU=uv; gl_Position=vec4(position.xy, 0., 1.); }',
    fragmentShader:(leak ? 'uniform sampler2D uTex; ' : '')+'uniform float uTime; varying vec2 vU; void main(){ vec3 c=mix(vec3(.03,.05,.10), vec3(.10,.16,.26), vU.y+.05*sin(uTime*.3)); gl_FragColor=vec4(c'+(leak ? '+.01*texture2D(uTex, vU).rgb' : '')+', 1.); }' });
  scene.add(new T.Mesh(geo, mat));
  return { id:TEST_ROOM_ID, scene, camera, update:(dt, t)=>{ u.uTime.value=t; }, resize:()=>{}, glint:()=>{}, held:()=>{}, project:()=>null,
    state:()=>({ builds:S.builds, mode:S.mode }), dispose:()=>{ geo.dispose(); mat.dispose(); S.disposed++; } };
}
const load=()=>new Promise(r=>setTimeout(()=>r(build), S.mode==='slow' ? S.ms : 0));
/* in: → null, or the validator's refusal; out again → true */
export function testRoomInstall(){
  const why=checkRoom(TEST_ROOM, { ids:[TEST_ROOM_ID] }); if(why) return why;
  document.documentElement.style.setProperty('--cv-'+TEST_ROOM.tint, TEST_TINT);   // DESIGN-1: its tint's token, on the page while the room is in
  if(roomAdd({ record:TEST_ROOM, standIn, load })) sceneRoomAdd(TEST_ROOM_ID, { load, standIn, three:()=>import('../../../apps/night/vendor/three-r128/three.min.js') });
  return null;
}
export function testRoomRemove(){ const a=roomRemove(TEST_ROOM_ID), b=sceneRoomRemove(TEST_ROOM_ID); document.documentElement.style.removeProperty('--cv-'+TEST_ROOM.tint); return a || b; }
