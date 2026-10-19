/* RUN 7 (C6, Calm plan §5; docs/CALM-QUALITY.md points 5, 8, 9) — the Calm shell's LOGIC. CORE: pure (rule #36), node-tested (data row
   «CALM shell (core)»). The DOM side is src/calmshell.js.
   - showStep: the controls fade in when no hand has been seen for CALM_UI.idleMs (1.5 s) and fade out as soon as a hand is back;
   - nextOf: a round button cycles its list (the person taps again for the next value);
   - sleepLevel: the sleep timer (15 / 30 / 60 min) — full level until the last CALM_UI.sleepFadeMs, then a slow cosine fade to silence (the
     forest and the playing fade together; nothing abrupt), then «asleep»;
   - glowAlpha: the glow note field — the row under a hand glows most at the hand and fades with the horizontal distance. */
export const CALM_UI=Object.freeze({ idleMs:1500, sleepFadeMs:90e3, sleepMins:Object.freeze([0,15,30,60]), glowReach:0.55, glowMax:0.34 });

/* st = { shown, seen } (seen = the last time a hand was in view, ms) → the next state */
export function showStep(st, hands, now){
  const seen= hands>0 ? now : (st && st.seen!=null ? st.seen : -Infinity);
  return { shown: hands===0 && now-seen>=CALM_UI.idleMs, seen };
}
/* the value after `cur` in `list` (wraps; an unknown cur → the first) */
export function nextOf(list, cur){ const i=list.indexOf(cur); return list[(i+1)%list.length]; }
/* the sleep timer's level at `now` for a timer of `mins` minutes started at `t0` (ms) → { level 0…1, left ms, asleep } */
export function sleepLevel(t0, mins, now){
  if(!(mins>0)) return { level:1, left:Infinity, asleep:false };
  const end=t0+mins*60e3, left=end-now, F=CALM_UI.sleepFadeMs;
  if(left<=0) return { level:0, left:0, asleep:true };
  if(left>=F) return { level:1, left, asleep:false };
  const u=1-left/F; return { level:0.5+0.5*Math.cos(Math.PI*u), left, asleep:false };
}
/* the glow note field: alpha of the row under a hand at horizontal distance dx (px) on a field `w` px wide */
export function glowAlpha(dx, w){ const r=CALM_UI.glowReach*w; if(!(r>0)) return 0; const u=Math.min(1, Math.abs(dx)/r); return CALM_UI.glowMax*(1-u)*(1-u); }
