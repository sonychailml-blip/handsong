# NIGHT-6: the forest, polished and alive. Stage 1: the comparison and the plan (2026-11-09)

## The user's decisions (2026-11-09): read these first; they override the text below
The plan is approved, with these answers to §8 and one addition.
1. **Order:** as in §5.
2. **Ferns:** today's fern stays as the shade species; the sketch's fine fern is added.
3. **Canopy:** yes. In slice 7, watch that the forest doesn't get too dark overhead and that the light stays visible.
4. **The moon:** it crosses the gap visibly, hidden behind leaves only briefly.
5. **Sound:** the stream's murmur, yes, quiet. No water touch under each note. Rain on by default, one gentle shower per night.
6. **The effects hand's gust:** picture only at first.
7. **If medium runs out:** first bake more into files (the rule below), then move items to high only. Softening medium's resolution comes last, and only with the user's approval.
8. **Animals:** all four; the owl hoots rarely; they come last.

**The addition, a rule for the whole run: what never changes during play is prepared in advance and shipped as files, not computed at every opening.**
- It covers the plant and ground textures, the painted far forest (one per Mood), and the baked shadow, moss and dapple maps.
- A small tool in `tools/` renders them, so they can be regenerated (`tools/forest-bake.mjs`, from slice 1). They are our own work, registered in `tools/licences.json` (entry `forest-files`).
- **Size budget:** about 10–15 MB of files for the forest; the data row «NIGHT forest files (app)» fails above 15 MB and prints the size every run. Every slice reports it.
- **GPU-compressed textures (KTX2 / Basis Universal):** considered when the first large colour textures exist (slice 3, the floor), measured there for memory and opening time against plain PNG. To check first: the licence of the exact transcoder release we would ship (Basis Universal is published under Apache-2.0, which our policy allows; verified against that release before anything is added, rule #32); its WebAssembly size against the budget; that the Poco (Mali, ETC2 / ASTC) and the laptop (Intel HD 4000, BC / DXT) each get a format they decode; the loader (three.js's KTX2 loader, MIT, or our own). A small grey file like the web gains nothing.
- **Rain and the stream (slice 11):** synthesis is compared with CC0 recordings (quality, cost, file size), and the user chooses by ear.

**Slices 0 and 1 go together; then stop for the user's look.** Slice 0 gives the user exact steps for the Poco measurement.

### Slices 0 + 1 as built (2026-11-09)
- **Slice 0, the yardstick.**
  - «Measure this device» (ⓘ, development) now runs five steps of 20 s: Dark, forest high, forest medium, forest medium **as it was before NIGHT-6** (the run's additions left out through the measurement door, the baseline), the lighter forest.
  - Each forest step prints, beside the old numbers, the room's frame time, draw calls, triangles, shader programs and texture memory. The end prints every opening of the session (the first is the cold one) and the device (memory, cores, pixel ratio, screen).
  - `tools/forest-budget.eval.js` (the laptop, RUN 9's method) prints the same numbers and alternates medium with and without NIGHT-6's additions, twice.
  - The exact Poco steps are step 134, item 4 (`archive/CLAUDE-history.md`).
- **Slice 1, the forest answers.**
  - **Dew:** 1,100 / 500 points (high / medium) on the low leaves in view, one draw, its own shader. They twinkle near the playing light in its colour, glint on a note, and catch the moon now and then.
  - **Webs:** up to 9 / 5, hung beside the near trunks off the aisle, one instanced draw. Their texture is the run's first prepared file (`rooms/forest/tex/web.png`, 256², 21 KB, drawn by `tools/forest-bake.mjs`). They catch the playing light and the effects hand's dimmer one and glint on a note; otherwise a faint moon sheen.
  - **The stream:** each note rings it at its nearest point, fainter with distance (none past about 5 m for a full note). The water's ring slots went from 8 to 12, and a ring knows its kind (note or Echo).
  - **The music bed in the room:** the bed (v2, and v1 as the fallback) publishes exactly the events it sends out on the bus `bed`, with their audio times. The shell publishes the audio clock's output timestamp each frame (`audioClock`). The host hands each event to the room at the page time it is heard (`pure/heard.js`), and the room starts its envelope then.
    - A chord: every mushroom swells (rise 1.5 s, fall 4 s).
    - A loop note: the voice's own distant cluster glows over the note's own envelope.
    - A glass note: one far firefly twinkles. Its glow only; the firefly law is untouched.
    - The swells stay under 0.5, below a note's own pulse.
- **Where:** `rooms/forest/forest-answers.js`, `rooms/forest/pure/answers.js`, `pure/heard.js` (new); `forest.js`, `forest-life.js`, `pure/forestlife.js`, the forest's record (levels `dew`, `webs`), `rooms/index.js` (the files fetched before a build, once per session), `scene/host.js`, `shell.js`, `bed2.js`, `bed.js`. No core change.
- **The user's look (step 134, 2026-11-09):** the forest answers look right. The Poco measurement comes later.

### Slice 2 as built (2026-11-09): the fireflies follow the melody
- **The law** (`rooms/forest/pure/fireflies.js`) takes two more inputs from the playing light. With both 0 or absent the step is exactly the old one.
  - `hold` 0…1, from how long the note is held: 0 under 0.5 s, 1 from 2.5 s. The near flies' rings shrink (× 0.55 at full), they are pulled in harder (× 1.6), swirl slower (× 0.4), and their glow joins one shared breath of 3.6 s (80 %), brighter on average.
  - `rate` 0…1, from the notes per second over the last 2 s: 0 at 1.5 a second, 1 from 5. Their rings widen (× 1.7 at full) and the swirl quickens (× 1.9).
  - `fliesDart`: on a note of fast playing (rate from 0.15), the three nearest flies within 4 m dart outwards (2.2 × the rate).
- **The room** (`forest.js`) eases the two inputs (hold in 0.6 s, out 1.2 s; rate in 0.4 s, out 1.5 s) from the host's held seconds and its own note times. A held note now counts as playing, so the flies stay gathered through it; before, they began to scatter about 3 s into a long note.
- **Measured by the rows:** a long note brings the near flies from 2.19 to 1.01 away (the law alone), and in the room 46 flies within 2 m against 4 with the note released; fast playing (8 notes a second against 2) takes them from 2.50 to 4.35 away and sends flies out on 51 notes (slow: none).
- **Cost:** no GPU change (the same points, the same draw); per note a sort of the 70 flies.
- **The user's look (step 135, 2026-11-09):** the fireflies look right as they are.

### The user's texture rule (2026-11-09)
Every texture is made as beautiful and detailed as it can be: ONE master at the highest quality (for example 2048² where it shows), smaller versions derived from it for the lower levels. There will be three graphics levels later: high uses the masters, medium and low the smaller versions. A master is never lowered to save size; size is saved with the smaller versions, mipmaps and GPU compression. The files budget may grow past 15 MB: every slice reports the files' size per level, and the user is told before the total passes 30 MB (the data row's limit). The web became a 1024² master (with dew beads) and 512² / 256² copies.

### Slice 3 as built (2026-11-09): the forest floor (laptop numbers only; the Poco run comes later)
- **The plant sheet** (`rooms/forest/tex/floor-2048.png`, the master; `floor-1024`, `floor-512` boxed down from it), drawn by `tools/forest-bake.mjs` at 3× and boxed down: the fine fern (an iterated-function fern), nettle, sedge, wood sorrel (trefoils), a broad-leaved herb, bilberry with its berries, wood anemone (white stars, buds). Transparent pixels carry their neighbours' colour (no dark fringes when filtered).
- **The law** (`rooms/forest/pure/floor.js`): the herbs by damp and light (the sketch's idea, our own law): sorrel in damp shade, anemones where light falls on drier ground, bilberry and herbs in patches, nettles near the trunks' feet, sedges on the bank only, the fine fern in lighter places away from today's ferns. Never in the water, never within 3 m of the eye (as today's grass: a cut-out card closer than that turns to jagged blocks at medium — seen in the first capture). A coarse distance grid makes it 2–3× faster; within 1.4 m of the bank the exact distance decides.
- **The picture** (`rooms/forest/forest-floor.js`): the herbs as crossed cards in one instanced draw and the fine fern's fronds in rosettes in a second, sharing ONE material (one new shader program) that reads each plant's cell of the sheet and sways with the forest's wind. Nothing casts a shadow.
- **Counts** (the record's levels): high 1,500 sorrel, 600 herbs, 260 bilberry, 500 anemones, 140 nettles, 700 sedges, 110 fine-fern rosettes; medium 600 / 240 / 100 / 200 / 50 / 280 / 45 (about 1,500 plants, conservative).
- **Files per level:** high 1.37 MB, medium 0.61 MB, low 0.30 MB (code and that level's files); all files together 2.1 MB of 30 MB.
- **Measured** (laptop, Intel HD 4000, RUN 9's method):
  - medium: −6.2 / −1.4 % hand detections vs Dark with NIGHT-6's additions, −1.7 / −2.6 % without (noise), 0 dropouts; draws 55 vs 51–52; programs 23 vs 20; textures 13.6 MB vs 6.9 MB;
  - high: −37.5 % (high is still a developer choice); textures 33.6 MB;
  - the first opening (cold) at high 4.5 s, over the 4-s gate (slice 1: 3.2–3.6 s); the first opening at medium 2.3 s; later openings about 0.4 s.
- **KTX2 / Basis, measured on the laptop** (`tools/forest-ktx-lab.mjs`, `tools/forest-ktx.eval.js`; Basis Universal commit 073eb6a, Apache-2.0, dev-only in the git-ignored `tools/.ktx-lab/`):

| Plant sheet | File | Quality (PSNR vs the PNG) | Opening path | GPU memory |
|---|---|---|---|---|
| 2048², PNG (today) | 1,129 KB | exact | 215 ms (fetch 17, decode 75, upload with mipmaps 104) | 22.4 MB |
| 2048², KTX2 ETC1S → BC7 | 390 KB | 40.4 dB | 194 ms (transcode 119) | 5.6 MB |
| 2048², KTX2 UASTC → BC7 | 1,004 KB | 48.7 dB | 183 ms (transcode 137) | 5.6 MB |
| 1024², PNG (today) | 445 KB | exact | 103 ms | 5.6 MB |
| 1024², KTX2 UASTC → BC7 | 332 KB | 45.1 dB | 57 ms | 1.4 MB |

  - **What it means:** GPU memory falls to a quarter. On the laptop the opening barely changes (the textures are not what makes the cold opening slow). UASTC keeps the master's quality closest (48.7 dB); ETC1S makes the smallest files.
  - **A look question for the user:** at medium (0.6 resolution, no antialiasing) cut-out plants have jagged edges, as today's ferns do; softer edges need either antialiasing (alpha to coverage needs it; it costs) or a soft-edged blended pass for the plants.
  - **What stands in the way:** the official transcoder's JavaScript uses `eval`, which our CSP refuses (rule #33). Shipping KTX2 needs either a transcoder built without dynamic code generation (our own build of the Apache-2.0 source) or a CSP change (the user's decision). The transcoder's WebAssembly is 1.06 MB, against the files budget. On the Poco the GPU takes ASTC / ETC2, not BC7; its numbers come with the Poco run.

**What this is.** A plan only. No app code changed. Tree hashes are the same before and after: core 14bd513ae15aa87e · apps/full d6b90cf2cb4be6da · apps/night 3279ec88c1f91059.

**The goal (the user, 2026-11-09).** Keep today's forest. Bring into it what the sketch «Живой лес» has (`tools/design/room-demos/rooms/2026-10-20_zhivoy-les.html`). Then make it more alive, more varied and more responsive to the playing. Animals come last.

**Kept for sure.** Everything that floats in the air and the way it moves. The mushrooms' glow and how it changes with each Mood.

**Read for it:**
- `docs/night/design/NIGHT-3-rooms/PLAN.md`, `docs/night/HANDOFF.md`, `BACKLOG.md`, `WORK-LOG.md`, `NIGHT-1-HEADROOM.md`, `QUALITY.md`, RUN 9 in `archive/WORK-LOG-before-split.md`;
- the sketch, whole;
- `apps/night/rooms/forest/*` (scene, life, detail, rare, the record, the pure laws), `apps/night/scene/host.js`, `apps/night/pure/cycle.js`, `apps/night/sound/ambience.js`, `apps/night/pure/ambience.js`, `apps/night/roomswitch.js`, `apps/night/bed2.js`, `apps/night/shell.js`;
- `core/soundmods.js`, `core/pure/bus.js`, the bus's `notes` writer in `core/live/eng.js`.

**About the numbers.** Every cost marked «est.» is estimated from the code and from RUN 9's and NIGHT-1's measurements. Nothing was run to get them. **No Poco number exists for the forest yet:** step 124 («Measure this device» on the Poco) has not been sent. So every Poco figure is the laptop's figure × 1–2 until slice 0 below gets the real one.

---

## 1. What stays exactly as it is

The user loves these. The plan never replaces them, only adds inputs to them.

| What | Where it lives | How it is protected |
|---|---|---|
| The wild fireflies and how they fly (orbit the light, gather while you play, drift off when you stop, form the emblem) | `rooms/forest/pure/fireflies.js` | Its node row compares positions exactly. A new input (§3, «fireflies follow the melody») follows RUN 9's pattern: when the input is absent or 0, the step is exactly today's. The flies keep today's ground function even where the stream bed is carved deeper (§2, row 11). |
| The playing light, its halo and trail; the effects hand's light | `forest.js` rigs | Unchanged. New things only read the light's place. |
| Falling leaves, moths, mist sheets, moonbeams, the moon and clouds | `forest-detail.js`, `forest.js`, `pure/cycle.js` | Unchanged. A gust from the effects hand (§3) adds a term that is exactly 0 without a gust. |
| The mushrooms' glow, their breath and pulse, their colour per Mood | `forest-life.js`, the record's looks, `night.css` tokens | Today's 28 / 14 mushrooms stay in their places, with the same tokens. New mushrooms (on logs) are added, never moved. A swell with the music bed is added on top and stays below a note's own pulse. |

**One rule for every slice: add, don't move.** Today's ferns, rocks, mushrooms, flowers, the stream's path and the fireflies' box keep their seeded places. New things are placed around them.

## 2. The sketch against today's forest, item by item

| # | The sketch has | Today's forest has | What the forest lacks |
|---|---|---|---|
| 1 | **Two fern species.** Fronds drawn by an iterated-function system: a big one in damp shade, a fine one in lighter places. Fronds bent in rosettes of 6–8. About 320 rosettes, placed by damp and light. | One species, a simple painted frond, 80 rosettes of 7 flat fronds, placed at random. | The second species, the finer drawing, bent fronds, placement by damp and light. |
| 2 | **The herb layer.** Wood sorrel (trefoils on thin stems), broad-leaved herbs, bilberry with a few dark berries, wood anemones (white stars and buds), nettles beside the shrubs, sedges along the bank, grass. About 15,000 small cards on a desktop and 6,600 on a phone. | Grass only (3,500 / 1,400 blades), plus 10 / 5 glowing «blooms». | All of it except the grass. |
| 3 | **Ivy** climbing half of the near trunks. | None. | Ivy. |
| 4 | **Moss cushions** at the trees' feet, on rocks and banks (about 400). Moss low on the north side of the bark, lichen higher up, moss on top of the logs. | Moss only inside the ground texture. The rocks are plain. | Cushions, bark moss, lichen. |
| 5 | **Roots** spreading from the near trees. Trunks flare at the foot into buttresses. | Plain tapered cylinders standing on the ground. | Roots and the flare. |
| 6 | **Fallen wood.** A log on the bank, a log across the stream as a bridge, 5 stumps with cut rings and bracket fungi, 3 standing dead trees, 56 fallen branches. | None. | All of it. |
| 7 | **Branching trees.** Crowns grown by repeated splitting, with leaf sprays at the twigs (4 variants). Young trees of 4–8 m in the gaps, hazel-like shrubs, saplings near the viewer. All placed by light, water and distance from the big trunks. Never in the moon's gap or across the view down the stream. | 95 trunks, up to two short branch stubs each. **No leaves anywhere.** | Crowns, understorey, shrubs, saplings, placement by ecology. This is the biggest difference. |
| 8 | **Contact shadows** painted under trees, rocks, logs and bushes. **Dappled moonlight** drifting slowly on the floor, dimmed by clouds. | None, apart from the hand light's shadow at high. | Both. |
| 9 | **Spider webs** (9) between branches near the viewer. They brighten as the light comes close and on a note. | None. | Webs. |
| 10 | **Dew** (500–1,100 points) on the low leaves. It twinkles near the light; rare glints from the moon. | None. | Dew. |
| 11 | **The stream:** carved banks, mud and wet darkening on the floor near it, flowing ripples, foam at the edges, the sky and the canopy's gap reflected, the moon's glint, the light's sparkle, note rings as real ripples. | A flat ribbon on the ground with sky, moon and light reflections, slow ripples, and Echo's rings. | Banks, mud, flow, foam. |
| 12 | **At the water:** wet mossy rocks in and beside the stream (about 36), pebbles along the shore (340 / 160), leaves drifting downstream (28). | 7 rocks in the aisle. | Stream rocks, the wet look, pebbles, floating leaves. |
| 13 | Mushrooms on the logs and stumps. | 28 / 14 glowing mushrooms in clusters near the aisle. | Mushrooms on wood (added beside today's). |
| 14 | **The moon in a gap** in the canopy: a moon with darker patches, 500 stars, a soft sky glow. A cloud now and then. | A moon disc and halo drifting on a 24-minute path, 7 cloud passes. No stars, no canopy. | The gap, stars, the moon's surface. |
| 15 | Moonbeams (5) whose light moves slowly along them. | 4 / 2 beams that breathe, follow the moon and dim under clouds. | Only the moving texture inside the beam. |
| 16 | **Mist:** five layered sheets of drifting noise, and five brighter strips low over the water. | Four sheets on the night's cycle (rising, thinning), drifting at high. | The brighter breath over the water. |
| 17 | **The far forest:** 560 trees, 240 young trees and 420 shrubs beyond 28 m, drawn **once** into a backdrop. Far pixels repainted every frame in round brush strokes that grow with distance. | Fog; trunks up to 44 m away. | The far forest and the painted look. |
| 18 | **Film:** a moving grain and a vignette (page overlays), a soft glow on bright things (a bloom pass). | None. Glow comes from sprites. | Grain and vignette. The bloom pass isn't needed, because the sprites already glow. |
| 19 | **The camera** breathes on two axes and leans with the light. | It breathes up and down only, and leans with the light. | The small sideways breath. |
| 20 | Fireflies, the light and its trail, the flower on a held note, pulsing mushrooms. | All of these. | Nothing. Today's forest is ahead here (below). |
| 21 | Moods set fog, moon, sky, light, firefly and mushroom colours, the exposure, the beams' strength and the mist colour. | The same idea through tokens (9 per mood), eased over 2.5 s. | Exposure and beam strength per mood (small). |
| 22 | Quality low / mid / high by pixel ratio, moon shadow map, share of undergrowth, stroke size, bloom. | High / medium / low by resolution, frame rate, the hand light's shadow and counts. Measured: medium is the default. | Moon shadows (high only, and only if measuring allows). |

**What today's forest has and the sketch doesn't (all of it stays):** the 24-minute night (clouds, mist layers, the sleep timer deepening it), Moods eased over time, rare events (falling star, emblem, the flower), a ring of light across the moss per note, Echo's rings on the water, Warm ↔ Bright tinting the light, Wave making the ferns shimmer, fireflies that gather and scatter, moths, falling leaves, dark leaves framing the corners, the effects hand's own light, the light landing exactly on its note row, measured quality levels, the 2D stand-in, and the opening that pauses hand detection.

**One thing in the sketch that stays out:** the per-frame brush-stroke filter. It reads up to 81 pixels × 8 sectors for every far pixel, every frame. Here the strokes are painted once, into the baked far forest (§5, slice 7). The look is the same and the per-frame cost is close to nothing.

## 3. The new ideas

| Idea | What it adds | Built from |
|---|---|---|
| **The forest answers notes** | Each note also sends a ring across the stream at its nearest point (fainter with distance), beside today's ring of light on the moss. Dew and webs near the light glint with each note. | the notes on the bus (today), the water's ring slots (today, 8 → 12) |
| **Mushrooms with the music bed** | The bed's events go on the bus with their audio times. The picture shows each one at the moment it is heard. Each chord: every mushroom swells softly (rise 1.5 s, fall 4 s). Each of the bed's loop voices «lives» in one distant mushroom cluster that glows with its notes. A glass note: one far firefly twinkles. All of it stays under the player's own pulse. | the bed v2 driver (`bed2.js`) pushes its events; the shell publishes the audio clock's output time; no sound change |
| **Fireflies follow the melody** | On a long note they close in around the light, slow their swirl and brighten together, like a breath. With fast playing their rings widen, the swirl quickens, and with each note the nearest few dart out. Today's gathering and scattering stay. | two new inputs to the firefly law: how long the note is held (the host has it) and notes per second over the last 2 s; both 0 = exactly today |
| **The effects hand moves the forest** | Sweeping the effects hand makes a gust where it passes: grass, ferns and herbs bend away, a few leaves shake loose and fall. Passing low over the stream trails ripples behind it. Picture only at first (decision 6). | the effects hand's place and speed, read from the hands on the bus; the sway, leaf and water shaders gain a gust term that is 0 without a gust |
| **Hidden things the light finds** | **Foxfire:** soft glowing veins on the fallen and dead wood and on old bark. It shows only near the light and stays lit for 8–12 s after the light moves on, so the light leaves a fading trail of what it found. **Night flowers:** tiny closed flowers hidden among the herbs that open and glow when the light comes within about a metre, stay open about 20 s, then close. | the light's recent places (12 points with their age) in the bark's shader; a small seeded flower law (pure, node-tested) |
| **A changing night** | The moon moves visibly across the canopy's gap during the night (decision 4). Mist banks roll in from the far forest and back. Light rain falls now and then: soft streaks, rings on the stream, the floor and rocks turning wet and glossy, drips. With its own sound. | `pure/cycle.js` gains the weather on the same seamless 24-minute loop; the rain's sound needs new sound kinds (§6) |
| **Animals (last)** | An owl on a branch that turns its head to the light and sometimes hoots; bats crossing the moon; a deer at the far edge, its eyes catching the light, that leaves when the light comes close; a fish that splashes in the stream. Rare, seeded, never the same twice in a row (today's rare-event law). | the rare events in `pure/cycle.js`; the owl's hoot and the splash use the new sound kinds (§6) |

## 4. Costs: how they are judged, and what is left

**Two methods, both already in the repo.**
- **The picture (RUN 9's method, `tools/forest-budget.eval.js`):** fake camera, two synthetic hands through the real gesture path, a note every 0.5 s. Each forest level runs 12 s, alternated with Dark, and is compared with its Dark neighbours on **hand detections per second**. The limit is a 10 % loss. On the laptop today: **medium −6.2 %**, high −34 to −36 %. RUN 9 also found that on this laptop the cost follows **resolution and frame rate, not content**: high without its grass, leaves, beams, mushrooms and moths still lost 34.7 %. So instanced detail is cheap. What costs is extra full-screen work, large transparent areas, and heavy maths per pixel. On the phone, the same test is «Measure this device» (ⓘ), which also prints audio dropouts per minute.
- **The sound (NIGHT-1's method):** offline µs per 128-sample quantum on the engine's render copy (the budget is 2,667 µs at 48 kHz), plus the real-time free share with a ballast, and dropouts. Today the nature sound costs about 60 µs (2.2 %) and the music bed v2 1.9–2.7 %. The phone version is the headroom page (`?probe&headroom`).

**What is left at medium (the default, and what players see):** 3.8 points of hand detection on the laptop (−6.2 → −10 %). That is the binding limit. High is already over its budget and stays a developer choice (RUN 9's question 1 is still open), so high can carry the richer extras.

**The account at medium (laptop, points of hand detection lost, est.):**

| Group | Allowance |
|---|---|
| The forest answers notes, fireflies, bed on the bus | 0.3 |
| The herb layer and the second fern | 1.0 |
| Moss, roots and fallen wood | 0.5 |
| The stream | 0.5 |
| Crowns, understorey, the moon's gap, dapple | 1.0 |
| The painted far forest, vignette | 0.3 |
| Gusts, hidden things, mist banks | 0.3 |
| **Total** | **3.9**, about the 3.8 left |

Rain adds about 0.4 only while it rains. If a slice goes over its allowance, there are three levers, best first:
1. the item moves to high only;
2. counts at medium come down (the record's levels);
3. medium's resolution goes from 0.6 to 0.5 of CSS pixels. RUN 9 found cost follows resolution, so this frees about 1 point (est.), but the picture gets softer (decision 7).

**Gates for every picture slice:**

| Measure | Today | Gate |
|---|---|---|
| Hand detections at medium vs Dark (laptop) | −6.2 % | no worse than −10 % |
| Shader programs at the opening | about 20 (23 with hands, high) | at most 30 at medium (the items below share materials and come to about +9) |
| Draw calls at medium | not measured yet (est. 60–90; slice 0 measures it) | reported; aim ≤ +35 (static wood merged, the mist strips one mesh, fewer tree variants at medium) |
| The room's frame time on the main thread, medium | not measured yet (slice 0) | at most +50 % of today's |
| First opening, laptop | 2–3 s | at most 4 s; later openings at most 1 s |
| First opening, Poco | not measured | well under the host's 8-s limit (target ≤ 6 s), where the 2D stand-in would show and detection would resume mid-build |
| Texture memory | about 3 MB (est.) | at most 16 MB at medium, 40 MB at high |
| Audio dropouts in every budget step, openings included | 0 | 0 |

**Why the opening matters most.** The sketch draws all its textures in JavaScript: a 1024² forest floor with 5,200 leaves and a computed bump map, two ferns of 900,000 points each, a dozen plant textures. It also measures the distance to the stream for 60,000 ground points. That is est. 1–2 s on the laptop before compiling. Today's forest redraws its textures on every opening. So from slice 3 on:
- textures are drawn **once per session**, at the level's size (half at medium);
- the drawing is spread over frames while the veil is up;
- the stream distance uses a small grid;
- one material serves each family (one plant material with all species in one texture sheet, one wood material, one rock material), so programs stay few.

If the Poco still nears 8 s, the textures are cached on the device (Night's own storage names) or shipped as files (our own work, registered in `tools/licences.json`).

**Fixed rules that keep the cost down:**
- **No new lights.** A new light recompiles every lit shader; RUN 9 kept the light count fixed for this reason. Glow comes from sprites, points and emissive colour, as today. The sketch's mushroom and firefly point lights are not ported.
- **Static wood is merged.** Roots, logs, stumps, dead trees and fallen branches become one or two meshes (the sketch draws about 80 separate ones).
- **At high, only today's casters** (trunks, branches, ferns, rocks) plus the logs cast the hand light's shadow. No herbs or leaf cards: a point light's shadow renders every caster six more times.
- **Heavy per-pixel noise is baked.** The sketch's ground runs about 30 noise lookups per pixel; here the moss, mud and dapple patterns go into textures (one lookup each).

### Cost per item

GPU = points of hand detection at medium on the laptop (est.). «draws» = extra draw calls. Levels: **H** high, **M** medium (the default, also «Облегчённый режим»), **L** low (the 2D stand-in, no WebGL).

| Item | GPU at M | Draws, programs, opening, memory | Sound | H | M | L |
|---|---|---|---|---|---|---|
| Dew on low leaves | 0.1 | 1, +1, ~0, 0 | — | 1,100 | 500 | — |
| Spider webs | 0.1 | 1, +0 (the moonbeams' material), ~0, 0.3 MB | — | 9 | 5 | — |
| Notes ring the stream | 0 | 0 | — | ✓ | ✓ | — |
| Mushrooms with the bed (bus) | 0 | 0 | none (reads events) | ✓ | ✓ | the stand-in's glow may breathe |
| Fireflies follow the melody | 0 | CPU < 0.05 ms per frame | — | ✓ | ✓ | — |
| Herb layer (sorrel, bilberry, anemones, nettles, sedges, herbs) + the second fern | 0.5–1.5 (cards near the eye overlap) | 2–3, +1 (+1 at high for its shadow), +0.2–0.4 s first open, 4 MB / 1 MB | — | desktop counts | phone counts × 0.75 | — |
| Moss cushions | 0.2 | 1, +1 (shared with the stream rocks) | — | ~400 | ~200 | — |
| Roots, logs, stumps with bracket fungi, dead trees, fallen branches (merged) | 0.2–0.4 | 2, +0 (today's bark material), +0.1 s, 2 MB / 0.5 MB | — | ✓ | ✓ (no fallen branches) | — |
| Ivy | 0.1 | 1, +0 (the plant material) | — | ✓ | half | — |
| Bark moss and lichen | 0.2–0.5 | 0, ±0 (today's bark material) | — | ✓ | ✓ (simpler) | — |
| Contact shadows (a painted map) | ~0 | 0, +30 ms, 4 MB / 1 MB | — | ✓ | ✓ | — |
| Stream banks, mud, wet floor | 0.1–0.3 | 0, ±0 (the ground's material), +50 ms | — | ✓ | ✓ | — |
| Wet mossy rocks and pebbles at the water | 0.2 | 2, +0 (the moss's material) | — | 36 + 340 | 20 + 160 | — |
| Leaves drifting on the water | ~0 | 1, CPU 0.05 ms | — | 28 | 14 | — |
| Water flow and foam | 0.1–0.2 | 0 | — | ✓ | ✓ | — |
| Mist breath over the water | 0.2–0.4 | 1 (one mesh), +0–1 | — | 5 strips | 3 | — |
| Mushrooms on logs and stumps | ~0 | 0 (today's mushroom draw) | — | ✓ | ✓ | — |
| Crowns (leaf sprays) | 0.5–1.0 (more in portrait, where more canopy shows) | 5–6, +0 (the plant and bark materials), +0.2 s, 3 MB / 0.8 MB | — | all leaves | 60 % | — |
| Young trees, hazel, saplings | 0.3–0.6 | 6–8 (fewer variants at medium), +0 | — | ✓ | fewer | — |
| The moon in a gap, stars, the moon's surface | ~0 | 1, +0–1 (the dew's point shader) | — | 500 stars | 250 | — |
| Dappled moonlight | 0.1 | 0 (one lookup in the ground's material) | — | ✓ | ✓ | — |
| Painted far forest (baked once per mood, strokes painted into it) | 0.2–0.3 | 1, +2, +0.3–0.8 s first open, 3 × 1.5 MB / 3 × 0.4 MB | — | ✓ | ✓ | — |
| Vignette (drawn in the scene, not a page overlay, so its pixels are the scene's few) | 0.1 | 1, +1 | — | ✓ | ✓ | in the stand-in's gradient |
| Film grain | 0.05 | 0 (the vignette's pass) | — | ✓ | decided by eye | — |
| Camera breath (sideways) | 0 | 0 | — | ✓ | ✓ | — |
| Effects hand: gusts, shaken leaves, wake ripples | ~0 | 0 | none at first | ✓ | ✓ | — |
| Foxfire on wood and bark | 0.1–0.3 | 0 (the bark's material: 12 points per pixel) | — | 12 points | 8 points | — |
| Night flowers | 0.1 | 1, +0 (the glowing flowers' material) | — | 24 | 12 | — |
| The moon's path through the gap | 0 | 0 | — | ✓ | ✓ | — |
| Mist banks rolling in | 0.2–0.4 while in | 1–2 | — | 2 | 1 | — |
| Rain, picture (streaks, rings, wet look) | 0.3–0.6 while raining | 1, +1 | — | 600 streaks | 250 | — |
| Rain, sound (hiss, drips) | — | — | +15–30 µs hiss, +10–20 µs drips, while raining (est.) | ✓ | ✓ (Lighter: one band, no drips) | ✓ |
| The stream's murmur (optional) | — | — | +15–25 µs while the room sounds | ✓ | ✓ | ✓ |
| Owl, bats, deer, fish | ~0 (rare, small) | 3–4, +1 | hoot and splash ≈ 5 µs each while they sound | ✓ | ✓ | owl and splash heard |

Picture totals at medium sit near the 3.8 points left, which is why the account above has allowances and levers. The sound's new parts stay under +1.5 % of a quantum while it rains, and close to 0 when dry.

## 5. The slices, in order

Each slice ends with something to look at and approve. Each report has:
- the static check and `node tools/probe-data.mjs`;
- Night `--app night` and Full `--quick` (Full untouched);
- the forest rows and new cases with controls;
- `forest-budget` before and after (medium judged, high printed);
- opening time and programs;
- captures in portrait and landscape (`ui-snap --forest`);
- tree hashes;
- at most five manual checks.

No core change is expected. If one turns up, that part stops and becomes its own CORE-n (core rule 5).

**Order:** the responsive and cheap things first, because they bring life at once. Then the sketch's layers from the ground up, the biggest look change (the canopy) once the floor around it is rich, then the new motion, then sound.

**Slice 0: the yardstick (small; nothing new to see).**
- «Measure this device» and the budget script also print: the room's frame time, draw calls, triangles, programs, first and later opening times, texture memory.
- You run it once on the Poco with today's forest (step 124). Every later slice compares against it.
- Can ride along with slice 1 if you prefer.

**Slice 1: the forest answers notes (small).**
- Dew on the low leaves near the viewer, twinkling as the light comes close and glinting with each note.
- Spider webs near the aisle (not across the middle of the screen) that brighten near the light and on notes.
- Each note also rings the stream at its nearest point.
- With the music bed on: mushrooms swell softly with its chords, each loop voice glows in its own distant cluster, glass notes make a far firefly twinkle.
- *You look at:* playing near the stream and near a web, with Music on and off.
- *Checks:* the bed's event and the picture's swell land in the same frame as heard (a CONTROL that ignores the output latency must fail); webs and dew brighter near the light than far (a CONTROL with the light off).

**Slice 2: fireflies follow the melody (small).**
- A long note gathers them close and slow. Fast playing spreads them and makes the nearest dart out.
- *You look at:* one long held note, then a fast run. This is the part you love, so the slice is yours to accept or send back.
- *Checks:* the node row adds cases; with the new inputs absent every existing case is identical. A CONTROL with the old law must fail the new cases.

**Slice 3: the forest floor (medium).**
- The herb layer placed by damp and light: wood sorrel, bilberry with berries, wood anemones, nettles by the shrubs (by the trunks until shrubs exist), sedges along the bank, broad-leaved herbs.
- The fine second fern in the lighter places. Today's ferns stay as the damp-shade species (decision 2).
- All species share one texture sheet and one material.
- The opening rules start here: textures once per session, at the level's size, drawing spread over frames.
- *You look at:* the floor near the camera at medium and high; portrait and landscape.
- *Checks:* placements from a pure seeded law (node row: no plant in the water, none within 1.2 m of the eye, damp-lovers nearer the water than light-lovers on average, with a CONTROL); counts per level from the record (the validator gains damages).

**Slice 4: the stream (medium).**
- Carved banks with mud and a wet, darker floor near the water. The fireflies keep today's ground.
- Wet mossy rocks in and beside the water, pebbles along the shore, leaves drifting downstream.
- Flowing ripples and foam at the edges. Brighter mist strips low over the water.
- Today's reflections and Echo's rings stay.
- *You look at:* the stream with the light near it, Echo on, a cloud passing.

**Slice 5: moss, roots and fallen wood (medium).**
- Roots at the near trees and the flare at their feet.
- Moss cushions on roots, rocks and banks. Ivy on some trunks. Moss low on the bark's north side, lichen higher.
- A log on the bank, a log across the stream as a bridge, stumps with cut rings and bracket fungi, standing dead trees, fallen branches.
- Contact shadows painted under everything.
- Some new glowing mushrooms on the logs and stumps. Today's stay where they are.
- *You look at:* the near forest, the bridge over the stream.

**Slice 6: the effects hand moves the forest (small).**
- A gust where the effects hand sweeps: grass, ferns and herbs bend away, leaves shake loose, the stream gets a wake.
- Comes after slices 3–5 so there is more to move.
- *You look at:* slow and fast sweeps of the effects hand, over the floor and over the stream.
- *Checks:* no gust = every shader value exactly today's; the gust follows the hand's place (a CONTROL with the hand still).

**Slice 7: the canopy and the moon's window (large; the biggest change in look).**
- Crowns on the trees, young trees in the gaps, hazel-like shrubs, saplings near the viewer, all by ecology.
- The canopy keeps a gap around the moon's path and the view down the stream.
- Stars and the moon's surface in the gap. Dappled moonlight drifting on the floor, dimmed by the clouds. Moonbeams through the gap.
- *You look at:* landscape and portrait at medium; a cloud passing over the gap (`sceneClockDbg(630)`).
- *Note:* this slice decides whether medium still fits. If it doesn't, the levers in §4 apply, and you choose.

**Slice 8: the painted distance and the film (medium).**
- The far forest (trees, young trees, shrubs beyond about 28 m) drawn once per Mood into a backdrop, painted in brush strokes at that moment, crossfaded when the Mood changes and dimmed by the moon's light under clouds.
- A vignette. Film grain at high (medium if you like it).
- The camera's small sideways breath.
- *You look at:* the depth of the view in each Mood; a Mood change.
- *Checks:* the bake happens only at the opening, at a resize and at a Mood's first use (a counter; a CONTROL that rebakes per frame must fail).

**Slice 9: hidden things the light finds (small).**
- Foxfire veins on the fallen wood and old bark, lit near the light and glowing on for 8–12 s.
- Night flowers hidden among the herbs that open when the light finds them.
- *You look at:* moving the light slowly along the log and through the herbs, then away.

**Slice 10: a changing night, the picture (small).**
- The moon's path across the gap (decision 4). Mist banks rolling in from the far forest and back, on the same seamless 24-minute night.
- *You look at:* `sceneClockDbg` at a few moments; the sleep timer.

**Slice 11a: the nature's new voices (medium; sound).**
- The machinery of §6, first heard as the stream's soft murmur (if you want it, decision 5) and drips under the bridge.
- *You listen to:* the forest at the room's default level, near and far from the stream. Dark and Camera keep the sound.

**Slice 11b: light rain now and then (medium; picture + sound).**
- One gentle shower in each 24-minute night (seeded, never in the first minutes, never in the sleep timer's last third): streaks, rings on the stream, the floor and rocks turning glossy, drips from leaves, its hiss and drops.
- *You look and listen:* `sceneClockDbg` to the shower, and a full one at real speed.

**Slice 12a: silent animals (small).** Bats across the moon, a deer at the far edge whose eyes catch the light and who leaves when the light comes close.

**Slice 12b: animals with a voice (small).** An owl that turns to the light and sometimes hoots, a fish that splashes.

## 6. What a new sound kind takes (rain, the stream, water touches, an owl, a splash)

Today a room's nature can only be drone, wind, crickets and echo, each with the room's own numbers. A sound of its own needs a new part in Night's nature module. **No core change:** the nature module is Night's own (`apps/night/sound/ambience.js` with its laws in `apps/night/pure/ambience.js`). It enters the engine through CORE-7's door, which already calls the module's schedule on every tick. The module can read the app's state through `main.js`'s closure, as the room switch already does.

1. **The recipe.** The room's `nature` gains one part per kind (`rain`, `stream`, `voices`), each 0 = absent.
   - The validator learns them, with damages and controls.
   - The development test room's silent nature gets them at 0.
   - Both nature slots carry them, so a room switch retunes them without making a node, as today.
2. **How it is built. Recommended: both, by kind.**
   - **Continuous sounds (rain's hiss, the stream's murmur): native nodes.** Built once with the slot, gated, and disconnected while silent, as NIGHT-1 parks silent banks. Each node costs 1–4.4 µs. The wind's seeded noise buffer can be shared, read from another point. Rain ≈ 6–8 nodes ≈ 15–30 µs while it rains, 0 parked.
   - **Event sounds (drips, splash, hoot, water touches): one small nature AudioWorklet,** like the bed v2's. Idle 7 µs, asleep 0; events posted ahead and played at their exact frame.
   - The worklet needs: a load per context (the render copy too, as `bed2Load` does), silence when AudioWorklet is missing, and one more entry in the static check's network list.
3. **Rules kept:**
   - #3: built once, gated, parked.
   - #15: every event at an explicit time, scheduled ahead.
   - #2: nature sounds take Hz ranges from the recipe, as the crickets do. Anything pitched that answers a note is priced from the live view.
   - #31: into the master under the sleep fade and the limiter, never a track or the hand's effects.
   - #38: stateless.
   - Core rule 4: with every new part at 0 the nature's output is the same to the bit, so GOLD «ambience», «NIGHT ambience» and «NIGHT untouched» hold with no renewal.
4. **Picture and sound share one seeded schedule** (a pure law, node-tested): the rain's curve over the 24-minute night, each splash and each hoot. The sound schedules them ahead on the audio clock. The picture shows them at the moment they are heard, using the audio clock's output time published on the bus each frame, never audio analysis.
5. **Checks:**
   - an offline render row: no click at a start, a stop or a room switch; the level against today's nature; the cost in µs on the render copy;
   - a work census like the bed's (the heaviest moment, deterministic);
   - a sync row: the picture's moment against the heard moment, within one frame, with a CONTROL;
   - later, the Poco's headroom page with rain on.
6. **Gate:** the nature at its heaviest (rain + murmur + one event voice) at most 4 % of the laptop quantum (today 2.2 %); dry, at most today's + 0.3 %. Lighter mode: one rain band, no drips.

**A sound on the stream for each note** (a water touch under the note) would be built the same way. I recommend leaving it out: the note is already the sound, and a second sound blurs «was that me?» (decision 5).

## 7. Risks

| Risk | How it is caught | What then |
|---|---|---|
| Medium runs out of its 3.8 points | `forest-budget` each slice | the §4 levers; you choose |
| The first opening on the Poco nears 8 s (the stand-in shows, detection resumes mid-build) | slice 0's opening time, then each slice that adds programs or textures | cache textures on the device, or ship them as files |
| Crackle right after the opening (seen once at NIGHT-1, before the opening paused detection) | 0 dropouts in every budget step, openings included; «NIGHT room switch» prints its dropouts | spread the texture drawing thinner; move work out of the opening's first second |
| The canopy darkens the forest too much, or hides the light | captures; your eye | thinner crowns at medium; a wider gap |
| Changing what you love by accident | the fireflies, life and cycle rows unchanged in every slice; mushroom tokens untouched | the slice is not done |
| Many cards near the eye in portrait (more floor shows) | captures in portrait; budget in portrait too | fewer near cards in portrait |

## 8. Decisions for you

1. **The order** in §5 (answers and fireflies first, then floor, stream, wood, gusts, canopy, distance, hidden things, night, sound, animals)?
2. **Ferns:** today's fern stays as the shade species and the sketch's fine fern is added (recommended), or both of the sketch's ferns replace today's?
3. **The canopy:** crowns over the trees, the moon framed in a gap. The forest gets darker overhead. It is the biggest change to today's look. Yes?
4. **The moon's path:** keep today's small drift (always in the gap), or let it cross the gap visibly, hidden behind leaves for part of the night (a darker stretch, then it returns)?
5. **Sound:**
   - the stream's own murmur (yes / no);
   - a water touch under each note that rings the stream (recommended: no);
   - rain on by default, one gentle shower per night (recommended), or a setting with rain off by default?
6. **The effects hand's gust:** picture only (recommended first), or also a swell in the wind you hear?
7. **If medium runs out:** move items to high only (recommended), or soften medium (0.6 → 0.5 resolution) to keep more?
8. **Animals:** all four, and does the owl hoot?
