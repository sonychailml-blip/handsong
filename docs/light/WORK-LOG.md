# WORK-LOG — LIGHT track

Each entry starts: track, number, date, tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`; `apps/light`
once it exists).

# LIGHT-0 (LIGHT track, 2026-11-27): the plan
Tree hashes before and after: core cfe3a3d190bef9ae · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e (docs only).
- The founder's idea and decisions (chat, 2026-11-27): a separate simplest app; solo, 12-note equal temperament; depth → reverb; fixed effect
  fingers (delay, vibrato, tremolo, brightness) on the vertical; controls when the hands leave (scale, timbre, key + A4, one hands menu
  with functions, octaves and the field view, camera switch, sensitivity) + a clip button apart; no settings button; a start page; clips
  with the camera picture, recorded as Full records (`core/clip.js`) but saved as MP4; only Night's clip interface taken; no shared UI
  with Night; one timbre first; Full and Night must not change.
- Checked in the code: the profile already narrows modes, timbres and effects by list (`core/pure/profile.js`, Night's `night.json`);
  38 `edo12` modes, 30 solo timbres; effects are `FX_FACTORY` blocks driven through chain entries (`state.fxChains`); Full's clip
  recorder prefers WebM (`core/clip.js` candidates). Expected core runs: profile id + shell (pure), clip MP4 option — both opt-in.
- Written: `docs/light/PLAN.md`, `docs/light/HANDOFF.md`, this log; the index `HANDOFF.md` (the LIGHT row); `CLAUDE.md` (one line: the track);
  `docs/ROADMAP.md` (one line).
