# ROOM RULES — how a new Night room is made (the founder, 2026-11-26)

⛳ Every new room follows these rules from its FIRST slice. Each rule comes from a fix we had to make later in the forest or the rain (named in
brackets), so that a new room does not need the same fix. If a rule cannot be kept, the founder decides before the work goes on. The rules
also apply to new work in the two existing rooms. A rule learned in a later fix is added here in the same run (one line, its origin in brackets).

## 1. Shape — what a room is
- A folder `apps/night/rooms/<name>/`:
  - `pure/room.js` — the RECORD (validated by `pure/room.js checkRoom`). It holds the levels, the looks per mood, the nature recipe, the acoustic,
    the tint, the lens (`view`) and the music.
  - `standin.js` — the 2D stand-in.
  - `still/` — the start still at each level.
  - the scene module, loaded only when the room is first opened.
  - `pure/` — its laws (no DOM, no WebGL, no audio; they run in node).
- Imports: the room's own folder, `apps/night/` shared modules and `core/`. Never another room's folder. Something both rooms need moves to
  `apps/night/` first.
- An entry in `rooms/index.js` with `load`, `prefetch` and `has`. A real room's id `room.<name>` is pinned in `ROOM_IDS` and is never renamed
  (rule #37). A room in development is added with `roomAdd` and is not pinned.
- The scene object answers the host's doors: `id`, `scene`, `camera`, `update`, `render`, `resize`, `dispose`, `light(on)`, `rest`, `flyPick`,
  `flyAt` / `flyLand`, `heard`, `texBytes`, `glint`, `bed`. It also answers `parCompile`, but only when the room opts out (§3).
- Colours are `--cv-*` tokens in `night.css`. Words go in `texts.js`, in English and Russian. Drawings, shaders and icons are our own work
  (rule #32 for every file).

## 2. One law, seeded — exact proofs stay possible
- Everything that moves comes from a seeded pure law in `pure/` (people, cars, windows, sky, drops). There is no `Math.random()` and no `Date.now()`
  in a picture or a sound path. Time comes in as an argument.
- The picture and the sound read the SAME law: the car you see is the car you hear (RAIN-1 `passes.js`). A sound is never scheduled from
  what the picture happened to draw.
- So every speed change can be proved exactly: render the room twice with fixed inputs and the frames must agree byte for byte. Keep that true
  (SPEED-1 step 10).

## 3. Shaders — the start and the freezes (SPEED-1 steps 11–12)
- ⛔ **No giant shader.** One fragment shader that draws thirty kinds of things through an `if` chain compiles for about 25 s on the first visit
  (the rain's `LIFE_F`, 40 KB) and freezes the page. Limits:
  - a fragment shader under about 10 KB;
  - a helper function called from more than 2–3 places is called once with chosen arguments (the GPU compiler copies every call);
  - kinds split into a few programs by family (people, vehicles, signs) rather than one program for all.
  - Measure each program's first compile on the laptop, cold. Over 2 s is too big.
  - The data row «ROOM shader copies (app)» fails on a function over 1000 characters copied more than twice.
- **A fixed set of programs.** Never switch a `#define`, a light count or a material's feature during play: each switch compiles again.
  - Hold a light dark (intensity 0) instead of hiding it (SPEED-1 step 6).
  - The Light quality changes counts and uniforms in place, not programs (steps 5–6).
- **Many medium programs compile in parallel** (the host's `parCompile`, step 12). This is on by default. A room opts out (`parCompile:false`) only
  when measured slower.
- Point lights in three's lit materials are skipped per fragment when dark (`scene/lightskip.js`, automatic). Keep lights in the scene.

## 4. Transparent sprites — no square frames (RAIN-5b, RAIN-10, RAIN-11)
- A sprite's alpha AND its colour reach exactly 0 inside its quad, on every side, at every blur and every focus.
  - A Gaussian or `exp` falloff cut at the quad's edge leaves a frame (RAIN-10: `exp(-2.6)` = 7.4 % at the edge).
  - When the blur widens a disc, the quad grows with it (RAIN-11: `WIN_V` grows by 1.4 R).
  - End falloffs with `smoothstep(outer, inner, d)`, where `outer` lies inside the quad.
- A sprite TEXTURE (clouds, smoke, leaves, debris) has a fully transparent border of at least 2 px at its smallest mip level, and is drawn with
  premultiplied alpha. Otherwise the mipmaps and the filtering bleed a pale edge round the quad.
- Every new sprite kind joins the probe row «RAIN no quad edges» (`tools/probes/night/rain5.js`) or its own room's copy of it:
  - nothing rises outward;
  - the steepest edge is bounded;
  - a CONTROL with the old falloff must fail.
- Check by eye too: render the room with each sprite layer on and off, and amplify the difference ×8 (the RAIN-11 method).

## 5. Per frame — no stutter (SPEED-1 steps 9–10)
- **No garbage in `update` / `render`:**
  - no array or object literals (`project([x, y, z])` → `projectXYZ(x, y, z)`; `.set([a, b, c, d])` → `.set(a, b, c, d)`);
  - no destructuring in a hot function;
  - no `.map` / `.filter` / `.slice`;
  - no arrays emptied to length 0 and refilled.
  - Reuse vectors and scratch arrays made once at build. Check with `node tools/speed.mjs --why`.
- No work in a frame that gives the same answer each frame. Compute it at build or when its input changes.
- Upload only what changed: a DataTexture or attribute range is marked for update only when its bytes changed.

## 6. Opening — build fast, once (SPEED-1 steps 6–7, 11–12)
- **Place searches run once per world**: memoised (`forest-memo.js placeMemo`) and seeded from a places file (`places/<level>.json`). Never
  every build. A search a module memoises itself is recorded apart (`PLACES_ONCE`).
- **Prepared files** for what never changes: textures, baked light, places. Masters come with smaller copies per level, and the room's files are
  listed for the precache (`tools/precache.mjs NIGHT_INCLUDE`). ⛔ No whole meshes in files (7 MB for 1 s: SPEED-1 step 7).
- **Budgets on the founder's laptop** (Intel HD 4000, 1920×1080, Chrome, cold profile): a first opening no longer than the forest's (≈ 13 s
  at Standard), a repeat opening ≤ 5 s, and no page freeze over 0.1 s during the opening (the host's slices).
- Every asset address uses `new URL(…, import.meta.url)`, so any folder and offline work (core rule 10). `has(level)` tells whether the level's
  files are cached, so the host can hold Detailed back while offline.

## 7. Qualities — all three planned from the first slice (NIGHT-16, SPEED-1 steps 5–8)
- **Detailed** (`full`, an antialiased context), **Standard** (`reduced`), **Light** (Standard's build with fewer things, switched IN PLACE by
  `light(on)` in under 0.2 s, no rebuild).
- ⛳ Once a room is released, its **Detailed stays exactly as it is** (the founder, 2026-11-25). Decide Detailed's look before release; later
  speed work changes Standard and Light only.
- ⛳ No automatic quality change. The person chooses.
- **Frame targets on the laptop** (`node tools/speed.mjs`, at least 3 runs): Light ≥ 50 fps, Standard ≥ 40 fps; Detailed is measured and
  reported. A slice that pushes a quality below its target is not done.
- The room joins `tools/speed.mjs`'s plan (all three qualities) and its COST print (`tools/prints/night-speed-cost.json`: draws, triangles,
  programs, texture memory), renewed only by a declared `--renew`.

## 8. Sound and hands
- The room's sound comes from its record: the nature recipe and its layers, in the shared worklets. Music is synthesised, never pre-recorded
  instrument notes (the founder, 2026-11-23). Hard rule #3 holds: pool voices are built once and gated, never torn down.
- The room is heard without its picture (`heard`): the sound follows the clock even when the picture is off or hidden.
- Every gesture is answered in the picture: the hand's light (`litHands`), a glint on a note, the effects hand (a law neutral at rest, exactly).
  The night's sleep (`nightDeep`) and the moods' looks reach the room.
- The quality bar (`docs/night/QUALITY.md`) applies to every slice.

## 9. Checks a room brings with it
- Data rows for its pure laws, each with a CONTROL that must fail.
- P.night rows:
  - the room opens at each quality;
  - no quad edges (§4);
  - the parallel compile fingerprint (`tools/probes/night/speed12.js`: add the room as a case);
  - the Light switch in place;
  - determinism (two builds, the same frames).
- Speed: `node tools/speed.mjs` (cost judged, time reported). The step numbers go into the room's record in `docs/night/WORK-LOG.md`.

## 10. Order of work for a new room
1. Record + stand-in + still + laws with their rows (no picture yet).
2. The picture at Standard, measured against §6–§7 at every slice.
3. Light in place, then Detailed. The founder judges Detailed's look before release.
4. Sound, hands and the rest of the room's life.
5. A full check (`--app night`, `smoke-paths --build`) before the room goes to `night-release`.
