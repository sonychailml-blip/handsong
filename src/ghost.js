/* RUN 7 (C7, Calm plan §6; docs/CALM-QUALITY.md points 4, 5, 6) — THE GHOST LIGHT: on the first run (and from ⓘ «Show the first steps
   again»), while no real hand has appeared, a ghost hand drifts slowly over the forest (a Lissajous path) and plays FOUR notes of the mood,
   one every 3.2 s — then it leaves, and the controls fade in. It is a synthetic hand from the pose generator (gestures/pose.js — the probes'
   own door) put into the camera frame's result BEFORE processHands, so it plays, lights the forest and draws exactly as a hand would: the
   same gestures, the same notes (rule #26), nothing recorded (Calm records nothing). A real hand in the frame ends it at once.
   ghostFrame(res, now, key) is called by main.onHands for every processed frame; key = the playing hand's label ('Right' / 'Left'). */
import { pose } from './gestures/pose.js';

/* RUN 8 (the user: «the ghost's four notes are almost inaudible»): Calm's volume follows the hand's horizontal (left edge = silence, v²) —
   the ghost drifted around the middle (volume 0.26…0.74). It now drifts in the right part (cx ± rx = 0.6…0.84 of the width), where a hand
   plays at a normal level; the four notes keep their path up and down the rows. */
export const GHOST=Object.freeze({ notes:4, every:3.2, down:0.5, hold:1.6, tail:1.2, s:0.2, cx:0.72, rx:0.12, ry:0.3, px:11, py:7.3 });
let g={ on:false, t0:null };
export const ghostArm=()=>{ g={ on:true, t0:null }; };
export const ghostStop=()=>{ g.on=false; };
export const ghostOn=()=>g.on;
/* the pinch point and whether it pinches at t seconds (pure: the probe compares) */
export function ghostAt(t){
  const G=GHOST, k=Math.floor(t/G.every), ph=t-k*G.every;
  return { x:G.cx+G.rx*Math.sin(2*Math.PI*t/G.px), y:0.5+G.ry*Math.sin(2*Math.PI*t/G.py+1.1),
    pinch: k<G.notes && ph>=G.down && ph<G.down+G.hold, done: t>=G.notes*G.every+G.tail };
}
export function ghostFrame(res, now, key='Right'){
  if(!g.on) return res;
  if(res && res.landmarks && res.landmarks.length){ g.on=false; return res; }   // a real hand: the ghost leaves at once
  if(g.t0==null) g.t0=now;
  const a=ghostAt((now-g.t0)/1000); if(a.done){ g.on=false; return res; }
  return { ...(res||{}), landmarks:[pose({ x:a.x, y:a.y, s:GHOST.s, gaps:a.pinch ? [0.05,1,1,1] : [1,1,1,1] })], handednesses:[[{ categoryName:key }]] };
}
