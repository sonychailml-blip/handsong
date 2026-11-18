/* RAIN-6 (item 7): THE EFFECTS HAND IN THE RAIN — pure (rule #36; data row «RAIN effects hand (app)»). Each law is EXACTLY neutral at the hand's rest
   (Echo 0, Warm ↔ Bright 0.5, Wave 0), so the room looks and sounds as it did until the other hand moves:
   - ECHO = the rain's strength: the drops on the glass and their fine layers (the mood's rain raised towards a downpour), streaks of rain falling in
     the air, seen where the city's lights are behind them (none at rest), and the rain's sound (the near pane and the far street louder);
   - WARM ↔ BRIGHT (RAIN-6c: the LIGHT SOURCES, never the whole picture — the city's grade stays) = lampOf: −1 warm … 0 rest … +1 bright. Warm: the
     lamps, street lights and windows amber like old tungsten bulbs, softer and a little dimmer, the neon subdued; bright: white LED street lights,
     brighter, the signs and neon up, more windows lit with a cool TV glow;
   - WAVE = how busy the street is (pure/city.js trafficDensity) and the wind: the rain falls in visible slanting streaks.
   The numbers are my choices by eye and ear. */
const F=Object.freeze;
export const RAIN_FX=F({ rain:0.85, streak:0.9, windStreak:0.55, slant:0.55, neon:F([0.55, 1.4]), windows:0.18, lampDim:0.82, lampBright:1.25, sound:F({ near:1.0, far:0.6 }), warm:F([1.10, 0.93, 0.74]), cold:F([0.80, 0.92, 1.14]), tc:0.5 });
const cl=(x, a=0, b=1)=>Math.max(a, Math.min(b, Number.isFinite(+x) ? +x : a));
/* the rain's strength 0…1 from the mood's own (base) and Echo: base exactly at 0, towards 1 at full Echo */
export const rainOf=(base, echo)=>{ const b=cl(base), e=cl(echo); return e ? b+(1-b)*RAIN_FX.rain*e : b; };
/* the falling streaks' amount 0…1 (0 at rest) and their slant (the wind with Wave) */
export const streakOf=(echo, wave)=>({ amount:Math.max(cl(echo)*RAIN_FX.streak, cl(wave)*RAIN_FX.windStreak), slant:0.08+RAIN_FX.slant*cl(wave) });   // RAIN-6c: the wind shows the rain too
/* the rain sound's gains (near the pane, far the street): exactly 1 at rest, up to +6 dB near and +4 dB far */
export const soundOf=echo=>{ const e=cl(echo); return { near:1+RAIN_FX.sound.near*e, far:1+RAIN_FX.sound.far*e }; };
/* RAIN-6c: the light sources' tone −1 (warm) … 0 (rest) … +1 (bright) */
export const lampOf=tone=>{ const t=cl(tone==null ? 0.5 : tone); return t===0.5 ? 0 : (t-0.5)*2; };
/* the signs' and neon's brightness factor and the extra share of lit windows at that tone (1 and 0 at rest) */
export const neonOf=l=>l<0 ? 1+(RAIN_FX.neon[0]-1)*-l : 1+(RAIN_FX.neon[1]-1)*l;
export const windowsOf=l=>Math.max(0, l)*RAIN_FX.windows;
/* (RAIN-6, superseded by lampOf: the whole picture's tint — kept for the data row's history) */
export const tintOf=tone=>{ const t=cl(tone==null ? 0.5 : tone), u=Math.abs(t-0.5)*2, to=t<0.5 ? RAIN_FX.warm : RAIN_FX.cold; return u ? [0, 1, 2].map(i=>1+(to[i]-1)*u) : [1, 1, 1]; };
/* a value eased towards its target over dt (τ RAIN_FX.tc): the hand's values move the room smoothly */
export const easeTo=(v, target, dt)=>v+(target-v)*(1-Math.exp(-Math.max(0, dt)/RAIN_FX.tc));
