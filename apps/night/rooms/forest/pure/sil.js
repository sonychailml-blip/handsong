/* NIGHT-13: THE FOREGROUND SILHOUETTES — dark fronds and a branch held in the corners of the view (pure, rule #36). One list for the room
   (forest-detail.js places them on the camera's frustum: anchor nx, ny in device coordinates, d metres away, h of the view's height — 0.8 of it on a tall
   screen —, turned by rot about the view axis, mirrored by flip; gw the plane's width over its height) and for the start still's screen layer
   (apps/night/still.js draws the same shapes in 2D at the same places, so the still and the live room match). */
export const SIL_TALL=0.8;   // a screen narrower than this (w / h): the silhouettes take 0.8 of their height (and the camera its wide lens)
export const FOREST_SIL=Object.freeze([
  Object.freeze({ kind:'fern', nx:-0.86, ny:-0.82, d:1.7, h:0.5, flip:false, rot:-0.25, gw:0.36 }),
  Object.freeze({ kind:'fern', nx:0.9, ny:-0.86, d:2.0, h:0.42, flip:true, rot:0.25, gw:0.36 }),
  Object.freeze({ kind:'branch', nx:0.78, ny:0.9, d:2.4, h:0.34, flip:false, rot:2.4, gw:0.5 }) ]);
/* a silhouette's place on a box bw × bh px showing a view of aspect a (w / h): centre (px), height and width (px), turn (radians, counter-clockwise as seen),
   mirrored — the projection of its plane (parallel to the picture at depth d: its size is h of the view's height, whatever d) */
export function silScreen(o, bw, bh, a){ const k= a<SIL_TALL ? SIL_TALL : 1, h=bh*o.h*k, sx=(bw/bh)/a;
  return { x:(o.nx+1)/2*bw, y:(1-o.ny)/2*bh, h, w:h*o.gw*sx, rot:o.rot, flip:o.flip, kind:o.kind }; }
