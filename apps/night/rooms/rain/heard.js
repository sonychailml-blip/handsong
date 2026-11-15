/* NIGHT-15: THE RAIN ROOM HEARD WITHOUT ITS PICTURE (Dark, Camera, the 2D stand-in, an opening). Its sound's near / far balance comes from the
   focus, and the focus from the playing hand's depth by the same pure law the picture uses (pure/focus.js focusTarget, focusStep). RAIN_FOCUS
   holds the last focus: the picture writes it every room frame (rain.js), the scene host calls rainHeard only while the picture is not drawn. */
import { FOCUS, focusTarget, focusStep } from './pure/focus.js';
import { natureFocus, natureDensity } from '../../roomswitch.js';
import { roomLook } from '../../pure/room.js';
import { RAIN_ROOM } from './pure/room.js';
import { trafficDensity } from './pure/city.js';

export const RAIN_FOCUS={ f:FOCUS.rest, heard:0 };
/* one step of dt seconds; hands as the rooms see them ({ d, play }) → the focus sent to the sound */
export function rainHeard(dt, hands, fx, sky){
  const play=(hands||[]).find(h=>h.play);
  RAIN_FOCUS.f=focusStep(RAIN_FOCUS.f, play ? focusTarget(play.d) : FOCUS.rest, dt, !!play); RAIN_FOCUS.heard++;
  natureFocus(RAIN_FOCUS.f); natureDensity(trafficDensity(roomLook(RAIN_ROOM, sky && sky.mood).traffic, fx && fx.wave)); return RAIN_FOCUS.f;   // RAIN-1: the cars heard as the picture would draw them
}
