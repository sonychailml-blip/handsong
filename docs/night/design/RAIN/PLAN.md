# RAIN: the room «Rain» — the plan (RAIN-0, 2026-11-13; rewritten at RAIN-0b, 2026-11-14)

## Коротко по-русски (для основателя)
1. RAIN-0b (2026-11-14) переделал стекло, туман, фокус и вид. Капли теперь настоящие: каждая видит соседей, сливается с ними, тяжёлая бежит вниз рывками, съедает всё на пути и оставляет бусинки. Стекло сначала всё запотевшее; палец (щипок рядом) рисует непрерывную чистую полосу, туман возвращается неровно за 60–90 секунд. Фокус — у каждого слоя своя глубина: рука посередине = резкая улица, мягкие стекло и холмы.
2. Вид: 8-й этаж, дом стоит в начале бульвара, взгляд вдоль бульвара чуть вправо, к дому напротив. На любом экране улица внизу; телефон вертикально смотрит вдоль бульвара. Город пока простая заглушка.
3. Город будет запечённой 3D-моделью: строится кодом, текстуры только CC0 (Poly Haven, ambientCG), рендер один раз, заранее (three.js, MIT). Никаких ИИ-картинок. Проба вида — кусок фасада напротив: `tools/design/rain/looktest/index.html`.
4. Ваши решения §9 записаны: порядок — стекло/фокус/вид + проба (сделано) → запечённый город с окнами и жизнью → рама и старт → остальное (звук можно отдельно); больше улицы; новые тембры только в Night; щёточный ритм за переключателем, решите на слух; ранний замер Poco на адресе dev-ветки.
5. Запечённый город — новый шаг 1; шаг 10 — проход по красоте уже на нём; бюджет 15 МБ остаётся (оценка всего города ≈ 5–6 МБ).
6. Комната видна только в разработке (`?room=rain`). Числа с пометкой «оценка» не измерены.
7. RAIN-1 (2026-11-15): город запечён целиком (дома с пятнами, ржавчиной, бельём, растениями, граффити без букв; бульвар с платанами, скамейками, киоском, кафе и людьми по настроению), машины на картинке слышны в момент проезда (раздел 4d).

---

**What this is.** The plan for the room described in `docs/night/design/RAIN/CONCEPT.md` (the founder's approved concept: it decides the look), and the record of the foundation slice RAIN-0. Written in the spirit of `docs/night/design/NIGHT-6-forest/PLAN.md`.

**Read for it (only what a room needs to plug in):** the concept; `apps/night/pure/room.js` (the record's shape and validator); `apps/night/scene/host.js`; `apps/night/rooms/index.js`; `apps/night/roomswitch.js`; `apps/night/still.js`, `tint.js`, `edition.js`, `main.js`, `shell.js` (the Room button, the bars); the forest's record, its build function's contract and its stand-in; `tools/probes/night/testroom.js` and `roomswitch.js` (how a development room is registered and judged); `tools/night-still.mjs`; `tools/build.mjs`. The reference photos in `tools/design/reference/rain/` were glanced at once for the mood (warm bokeh behind wet glass); nothing is copied or derived from them.

**About the numbers.** Every cost marked «est.» is estimated from the code and from the forest's measurements; nothing was run to get it. Numbers under «RAIN-0 as built» were measured on the laptop in this run. **No phone number exists for this room yet.** Every phone figure is an estimate until slice 11 measures the Poco M5 and an iPhone.

---

## 1. Rules for every slice

- **Track and names.** Each slice is a `NIGHT-n` run named `RAIN-k` in its log entry. A part that needs a core change stops and becomes its own `CORE-n`: opt-in, old behaviour by default, both apps' checks (core rules 4–6).
- **The room is unique.** Nothing is copied or moved out of the forest into shared code. Shared stays what is shared today: the scene host, the room record and switching, the music-bed machinery, the nature slots, the hands, settings.
- **Dev only until approved.** The room is registered by `apps/night/rooms/dev.js` only in the development edition and only when the address asks (`?room=rain`). Its id `room.rain` is NOT in `ROOM_IDS` (so it is never remembered on a device). No Room button for players. The data row «RAIN stays out of the players' edition (app)» fails if that changes. Slice 11 lifts this, after the founder's approval.
- **Full untouched, the forest untouched.** `FULL untouched` and `NIGHT untouched` hold in every run; no forest print is renewed.
- **Licence (#32) and privacy (#33).** Recordings: CC0 only, each a register entry with its source. ⛳ **No AI-generated images anywhere** (the founder, RAIN-0b): the city is a 3D model built by our code and baked offline; its materials are CC0 PBR textures only (Poly Haven, ambientCG), each a register entry, stored in the design sources `tools/design/rain/tex/` and never fetched at run time; the renderer used for a bake must be MIT / BSD / Apache / ISC / zlib (today three.js r128, MIT, the vendored copy). No new host, no new network call beyond the room's own files on our origin (each listed in the static check's network guard).
- **What never changes during play is prepared ahead** (the forest's rule): the baked layers, the depth maps, the window map and its lit atlas ship as files; `tools/rain-bake.mjs` rebuilds them from the model.
- **Colours are tokens** (`--cv-rain-*` in `night.css`); the concept's style bible is the source.
- **Checks: Level 2** per CLAUDE.md «Check levels» (static, data, the full Night suite); Level 3 when a slice has a core part. At most five manual checks. A slice that cannot finish green stops at its last green state.

## 2. How the room is built (the technical direction, confirmed or replaced)

| The concept's direction (§9) | The plan |
|---|---|
| The camera breathes and leans slightly | **Confirmed.** The city is so far away that the lean shows only between the glass / the frame and the city. So the lean moves the glass layer and the frame over the city, a strong depth cue at no cost. |
| Layered 2.5D planes, windows as instances with their own state | **Replaced (RAIN-0b).** The city is a 3D model baked ONCE, offline, into prepared pictures with a DEPTH MAP and an exact WINDOW MAP (`tools/rain-bake.mjs`). In the room only what changes is drawn each frame: lit windows (their lit variants from the bake), lamps, cars, the tram, reflections, as light sprites, each at its own depth. Until slice 1 ships the bake, a stand-in is painted once on the GPU by the view law's port (`rain-city.js`). |
| The rain on glass is a full-screen pass | **Confirmed, with a simulation (RAIN-0b).** The drops are objects simulated on the CPU (`pure/drops.js`: merging, running, beads, lanes) drawn as sprites into a DROP MAP; the glass stays one pass that reads it (lenses, wet lanes, procedural fine droplets, the mist inside over all). |
| The focus pull blends pre-blurred versions | **Confirmed, with many depths (RAIN-0b).** The prepared picture carries its depth (alpha); the view pass blends four copies (sharp and three blurred) by \|depth − focus\| × K per pixel. Lights are NOT blurred by a filter: each light sprite grows by its OWN depth into a soft disc (a window: a soft rounded rectangle) and dims by its area. |
| Phones first; Standard smooth, Detailed adds detail | **Confirmed.** Standard: 30 frames a second at the host's reduced resolution, fewer drop layers. Detailed: 60, one more drop layer and a second rivulet layer. |
| A file budget of its own (15 MB) | **Confirmed.** A data row «RAIN files (app)» from slice 2 on: fails above 15 MB, prints the size every run. |

**One frame, in order** (RAIN-0b: 9 draws, 7 programs):
1. **The view** (full size): the prepared picture's four copies blended per pixel by the depth map, then the lit windows and the light sprites, each sized by its own depth.
2. **The soft copy** (a sixteenth of the pixels): the view shrunk and blurred, for what is seen through mist and inside a drop.
3. **The drop map** (full size): the simulated drops as sprites (the place inside each drop, premultiplied by its mask).
4. **The glass** (full size, to the screen): the drops bend the view, the fine droplets and the wet lanes, then the mist (inside, over everything) with its clearing, the hand's light. Later: the frame and sill on top, the film grade.

**The world is fixed, the screen is a crop of it.** The glass and the city are placed in view-angle units, not screen units. A wider lens shows more glass and more city. So the start still (slice 2) can be this room's world through a wider lens, placed by the room's lens law, exactly as the forest's.

**Depth is focus** is one eased number, 0 (the glass) … 1 (the hills; RAIN-0b: a depth on the layers' line, glass 0, frame 0.03, street 0.35–0.65, the facade opposite ≈ 0.72, roofs ≈ 0.82, hills ≈ 0.95, sky 1), from the playing hand's depth (the same `d` the forest reads, so the calibration's near and far points map as in the forest). The city's blur falls and the glass's blur rises with it. The sound's closeness needs nothing new for the played notes: the shared acoustic (`fdepth`) already follows the same depth. The room sounds' near / far balance comes in slice 3.

## 3. Budget and gates

**Method** (the forest's, both in the repo): on the laptop, hand detections per second with the room against Dark, alternated; the room's frame time, draw calls, shader programs, texture memory, opening time; audio dropouts. On phones: «Measure this device» (ⓘ, development) and the headroom page.

**Why this room is a different kind of load.** The forest is geometry: about 190 k triangles and 66 draws at Standard, cost following resolution. This room is fill: about a dozen draws, almost no triangles, and a per-pixel glass shader. Its cost follows **pixels × the glass shader's length**. So the levers are the number of drop layers and the resolution, and the measure to watch is the frame time at phone resolution.

| Gate (Standard unless said) | The forest today | This room |
|---|---|---|
| Hand detections vs Dark, laptop | 0 to −7 % | no worse than −10 % |
| The room's frame time on the main thread | 2.1–2.8 ms | at most 3 ms (little CPU work: a few hundred sprite values a frame) |
| Shader programs at the opening | 28 | at most 12 |
| Draw calls a frame | 66 | at most 30 with the street alive |
| First opening, laptop | about 4 s | at most 2 s (few programs, no large files before slice 10) |
| First opening, a mid Android | not measured | at most 4 s |
| Texture memory | 16.9 MB | at most 16 MB Standard, 40 MB Detailed |
| Files | 3.3 MB | at most 15 MB (the data row) |
| Audio dropouts in every budget step | 0 | 0 |
| The nature sound at its heaviest | 2.2 % of a quantum | at most 4 % |
| The music bed at its heaviest | 1.9–2.7 % | at most 3.5 % with the bass voice |

**If Standard runs out, the levers, best first:** (1) one drop layer or the rivulets' beads leave Standard; (2) the soft copy at a smaller size; (3) the glass pass at three quarters of the resolution with the city sharp (the glass is soft by nature); (4) Standard's resolution, last, and only with the founder's approval (the forest's rule).

## 4. RAIN-0 as built (2026-11-13): the decisive core

Narrowed by the founder mid-run to the technical core: the rain on the glass, depth is focus, and a test that a note lights a window, on a minimal placeholder city. The full layers, the window lives and the start still moved to slices 1 and 2.

- **The room, registered for development only.** Its record (`rooms/rain/pure/room.js`: the three moods' looks in the concept's palette, its amber tint, levels, a placeholder nature and bed on today's machinery). The door `rooms/dev.js`: only the development edition, only with `?room=rain`. Its id is not pinned. The start screen still shows the forest's still (the room's own comes in slice 2).
- **The rain on the glass** (`rain-glass.js`, one pass, our own shader):
  - resting drops in 3 layers of size (Detailed 4): each is born, grows and gives its place to the next; each is a small lens that shows the view upside down and wide, dark at the rim, with a catch-light;
  - running drops in 1 layer of columns (Detailed 2): the head goes down stopping and going on a wandering path, leaves a wet lane that dries with distance, and beads;
  - mist: thicker towards the pane's edges and in slow patches, shown as a very soft picture with fine grain; cleared where a drop sits, where a lane ran, and where a note wiped it (the wipe map, `pure/glass.js`: a 64 × 36 grid, the mist back by half in 18 s);
  - the mood sets the rain's strength and the mist (Late night: drizzle; Evening: steady rain; After the rain: heavy mist, few drops).
- **Depth is focus** (`pure/focus.js`): the playing hand's depth → the focus, exactly 0 (the glass) up to depth 0.18 and exactly 1 (the city) from 0.82, gliding (time constant 0.3 s, never faster than 1.8 a second); without a hand it drifts back to the glass in a few seconds. The city: its prepared picture mixed with its blurred copy, and every light grown into a soft disc dimmed by its area. The glass: its drops soften into pale discs as the focus leaves. The pane slides a little against the city as the camera leans to the light. **The sound's closeness** is the shared acoustic, which follows the same depth (measured in the row: 0 near, 1 far).
- **A note lights a window** (`pure/windows.js`): with the focus far, the window the light points at (inside it, or the nearest within reach) comes on at once and fades slowly: full for 14 s, about a third left after two minutes, a sixth after ten, gone within the hour. With the focus near, the note wipes the mist under the light instead; a held note keeps wiping, so the light draws.
- **The placeholder city**: two plain houses (186 windows), a hill line with far lights, three lamps, a sky with low clouds lit from below, painted once per opening, resize and mood from the tokens `--cv-rain-*`.

**Measured on the laptop** (Intel HD 4000, headless Chrome, a fake camera with the hand model running, a 1536 × 730 window, a note every half second near and far by turns; `node tools/rain-snap.mjs --cost`; the forest in the same harness with `--forest`):

| | Rain, Standard | Rain, Detailed | The forest, Standard (same harness) |
|---|---|---|---|
| Picture | 921 × 438 | 1305 × 620 | 921 × 438 |
| Hand detections against Dark (two passes) | +4.8 %, −4.2 % | −16.4 %, −6.8 % | −3.1 %, −15.2 % |
| Frames drawn a second (cap) | 21–22 (30) | 30–33 (60) | 19 (30) |
| The room's frame time on the main thread | 0.7–0.8 ms | 0.7–0.8 ms | 4.4–5.4 ms |
| Draw calls, shader programs | 6, 9 | 6, 9 | 60, 28 |
| Texture memory | 3.5 MB | 7.0 MB | 26.2 MB |
| First opening (cold), later openings | 1.0 s, 0.1 s | 1.3 s, 0.1 s | 8.0 s, 1.7–2.2 s |

What the numbers say, and what they do not:
- Detections against Dark are noisy here (the two passes differ by 9 points for both rooms); Standard is inside the −10 % gate on both passes, Detailed on one of two.
- Neither room reaches its frame cap in this harness (the hand model takes about 45 ms six to seven times a second); the rain room draws slightly more frames than the forest.
- **Not measured: any phone.** The glass pass is per-pixel work, and a phone at Standard has about as many pixels (429 × 930) as this laptop window. The founder's Poco run (step 156, check 4) is the first real number.

**Captures:** `tools/.ui-snap/rain0/index.html` (Standard) and `index-full.html` (Detailed), Russian captions, phone 390 × 844 and laptop 1280 × 800: the focus near, a note wiped near, the focus far, a phrase played far, no hands.

**Not built in RAIN-0, by the founder's narrowing:** the windowsill and frame, the boulevard, the real facade, roofs, hills and sky as layers; the window lives; the start still and the room's own reveal (slices 1 and 2). **Honest limits of what was built:** the running drops' lanes are faint in a still picture (judge them in motion, step 156); a mood change repaints the city in one frame (§8); the Mood button still reads the forest's mood names; the room's sounds are a placeholder hiss.

## 4b. RAIN-0b as built (2026-11-14): the glass alive, the mist first, many depths, the view, and the baked city's look test

The founder's verdict on RAIN-0: the glass did not feel alive, the city was dull and primitive. RAIN-0b:
- **Drops that see each other** (`pure/drops.js`, the reference's behaviour, our own code): every drop an object (place, radius, speed); a landing drop merges with every drop it touches (areas add exactly); a heavy drop starts to run; a runner goes down stop-and-go on a wandering path, eats every drop its swept path touches, leaves beads (each bead's area taken from it exactly) and clears the fine droplets in its lane (a lane map they grow back into, τ 24 s). Fixed 1/60-s steps, seeded; the water booked exactly (drops + ran off + evaporated under the cap = fell). Caps: Standard 260, Detailed 420. Drawn as sprites into the drop map; the fine droplets stay procedural (1 / 2 layers).
- **The mist is the first touch** (`pure/glass.js`): the pane opens fully misted (the city only soft lights). A held pinch near = a finger on the glass: the capsule between the light's last place and this one is cleared (continuous at any speed); a short note clears a spot. The map is 320 × 172 over the pane (about a fifth of a phone's pixels), soft but defined edges. The mist returns unevenly (a seeded rate per cell, faster beside misted neighbours — the edges first): about 80 % back at 60 s, 95 % at 90 s. After the first wipe the middle is never more than 70 % misted (the floor eases in over ~6 s). The mist is inside: wiping never removes a drop (drops show faintly through the mist).
- **Many depths** (`pure/focus.js`, `pure/city.js` depthOf): every pixel and light has its own depth; blur = |depth − focus depth| × 1.8, the widest radius 0.06 view-angle units. A hand in the middle: the street sharp, the glass and the hills soft.
- **The view** (`pure/city.js`, the view law): our house at the head of the boulevard, the eye on the 8th floor (25 m) over the near road, turned 14° towards the right-hand row (the house opposite), 13° down. The vanishing point sits a little left of the middle, so an upright phone looks along the boulevard; every screen shape (0.46 … 2.4 : 1) sees the street in its lower middle (83–100 % of it) and the house opposite (14–29 % of the frame). The stand-in is painted once on the GPU by the law's port (`rain-city.js`; the browser row compares its depth with the law's). Lamps, cars (a seeded schedule, no two inside each other) and an occasional tram are light sprites with streaked reflections in the wet street.
- **The look test of the baked city** (`tools/rain-bake.mjs --look`, model `tools/design/rain/bake/model.js`): a section of the facade opposite modelled by code (rusticated ground floor with arched shopfronts, three floors of tall arched windows with surrounds and keystones, pilasters, string courses, the cornice on brackets, wrought-iron balconies with whiplash curls, stucco panels; pavement, kerb, wet asphalt, rails, wires, a lamp), CC0 Poly Haven textures, night lights (lamps lighting the plaster from below, balcony shadows thrown up the wall, lit rooms), wet reflections; baked 2× supersampled with three.js r128 at a laptop and a phone size, windows dark and lit, with its depth map and window map, and two blur levels by the room's own method. Page: `tools/design/rain/looktest/index.html`.
- **Measured** (laptop, Intel HD 4000, idle, `node tools/rain-snap.mjs --cost`): Standard 921 × 438 — the room's frame time on the main thread 2.1–2.2 ms (RAIN-0: 0.7–0.8; the drops' simulation and the maps' upload; gate 3 ms), 22 frames a second (cap 30), 9 draws, 7 programs, texture memory 5.9 MB, opened in 0.13–0.15 s, hand detections against Dark −0.1 / +0.5 %; Detailed 1305 × 620 — 2.6–2.7 ms, 38–39 fps (cap 60), 11.8 MB, −0.4 / +0.4 %. The bake: 2.6–4.9 s per view and variant (4 of them); the look test's files 1.4 MB. Not measured on any phone.
- **Not done:** the frame and sill, the window lives in the room (slice 1, from the bake), the start still (slice 2); timing runs (§3) wait for an idle machine.

## 4c. RAIN-3 as built (2026-11-14): the room's sound, near and far (slice 3)

- **Recordings** (CC0, Freesound, register «rain-recordings»; the full-quality originals need an account, so the sites' public HQ previews were used): the pane near — «RAIN on glass window» (nicoproson #648529) — and the street far — «Urban street in rainy weather» (eaglechopper #238019), 45 s each, stereo MP3 96 kbit/s, 0.54 MB each (1.08 MB). Chosen by default for the founder's ear among three candidates each (`tools/design/rain/sound/listen/index.html`, `node tools/rain-listen.mjs`; register «rain-sound-candidates»).
- **The law** (`apps/night/pure/layers.js`, shared machinery naming no room): each layer in stereo grains (5–9 s, equal-power joins of 1.5 s, never across the file's ends, never a loop); near × cos, far × sin of the focus (equal power); the picture's own eased focus (`natureFocus`, the same number), smoothed only against steps (τ 0.08 s); on / off over 0.6 s; a soft fallback synthesis while a layer has no recording; events on a seeded schedule of absolute time — drips from the cornice (every ≈ 3.5 s, panned, louder near) and a quiet tick in the room (every ≈ 9 s). The picture shows each drip falling past the window when it is heard (the host hands an opt-in room the audio clock).
- **The graph** (`sound/ambience.js`): the nature worklet's second processor «night-layers», built only when a room whose recipe has `nature.layers` plays (the forest builds nothing new; once built, it adds exactly 0 in the forest's slot); near → the slot's mix, far → the mix and the echo (send 0.35); the slots' crossfade carries a room switch.
- **Measured:** the law 7–9 µs a 128-frame quantum per layer in node (two layers ≈ 15–20 µs, est. ≈ 1 % of a quantum on the laptop's audio thread); the level (K-like, offline) −56.9 dB against the forest's −56.5 dB (near −55.5, far −58.8); a room switch moves the envelope at most 0.15 % a millisecond; files 1.08 MB.
- **Rows:** data «RAIN nature (app)» (27 cases, CONTROL an instant swap); P.night «RAIN nature» (offline: the forest unchanged, the balance in the graph, the level, the switch; CONTROLS) and «RAIN room» (the live node follows the focus, both recordings play). «NIGHT room switch» unchanged.
- **Not done:** the tram's bell and thunder (slices 5 and 9, with their pictures); with the picture off (Dark or Camera) the near / far balance holds its last value (the picture sends the focus).

## 4d. RAIN-1 as built (2026-11-15): the baked city, the boulevard, the car passes heard (slice 1, with the founder's notes)

- **The model** (`tools/design/rain/bake/city.js`, our own code in the view law's world): every block of both rows a house of its own from one seeded kit (bay, floor height, eight plaster colours, arched / straight / segmental windows, iron or enclosed wooden balconies, cornice, a mansard with dormers or a parapet, chimneys, antennas, water tanks, a small roof-terrace tree). Each facade painted on its own canvas: the CC0 plaster tinted, patched plaster, peeling paint, damp stains under every cornice and sill line, rust streaks under the balconies, soot near the top, abstract graffiti shapes on the ground floor (no letters). People's things: curtains and rooms (an atlas of eight lives), shutters half open, window boxes, pots, a climbing vine, laundry, a bicycle, chairs, a lantern.
- **The boulevard** (the founder: «a real boulevard»; `pure/city.js` STREET rewritten): the left pavement, ONE road (two car lanes, two tram tracks, the wires), then the promenade behind a double row of plane trees — benches, lamps, a kiosk, café terraces with striped awnings, string lights and tables in front of the house opposite. Figures by the mood: Evening ≈ 50 (umbrellas, seated at the terraces, a couple under one umbrella, someone with a dog, the street musician), Late night about 7, After the rain about 13 with umbrellas closed and the street wetter (puddles shine: the wet mirror ×1.6).
- **The bake** (`node tools/rain-bake.mjs --city`, `citybake.js`, three.js r128): ONE picture in view-angle units covers every screen shape the lens law allows (x ±1.25, y ±0.6745: an upright phone at 68° to a 2.4 : 1 screen at 55°), so a screen is a crop. The three.js renders are mirrored onto the law's handedness and laid over a backdrop cast by the law's own rays (far roofs, hills with the old town, the fortress wall, the TV tower). Per mood the colour with windows dark; once the colour with every window lit by its life; the depth map by the law; the exact WINDOW MAP (138 windows: projected by the law, kept when not hidden — the depth map at the centre is the window's own). 2050 × 1106 (Detailed) and × 0.625 (Standard); 27 s; files 1.87 MB (+ the sounds 1.13 MB: the room 3.06 MB of 15).
- **In the room** (`rain.js`): the files load with the room (`rainAssets`, the fetch listed in the network guard); the paint pass reads the mood's colour and the depth map (`BAKED_F`); the window pick and the fade use the baked map; a lit window in focus shows its baked room (`WIN_F` samples the lit picture), out of focus it grows into the soft disc as before; the stand-in still paints when the files fail.
- **The cars and their sound** (the founder's picks near-c and far-c): `tools/rain-sound.mjs` cuts far-c's five car passes out as mono one-shots (`cars.mp3`, [start, length, peak]) and keeps its car-free stretches as the far bed (`street.mp3`); near-c is the pane (`pane.mp3`). One law for the picture and the sound, `apps/night/pure/passes.js` (shared, names no room): the picture draws the cars at the moment heard now (the audio clock), the nature worklet starts each car's one-shot so its peak lands on the moment the car passes under the window — panned by its side, louder for the nearer lane, its rate by its speed. The density = the mood's traffic (Late 0.4, Evening 1.15, After 0.7) × (1 + 0.6 × Wave), in steps of 0.05, sent to the sound as the picture's own number (also from the heard hook on Dark / Camera). Cars now drive on past the window (zFrom −80 m).
- **Measured** (laptop, idle, `node tools/rain-snap.mjs --cost`): Standard 921 × 438 — 2.0–2.1 ms a frame (gate 3), 21–22 fps (cap 30), 9 draws, 7 programs, textures 13.5 MB (gate 16), opened in 0.11 s, hand detections vs Dark −0.1 / +0.6 %; Detailed 1305 × 620 — 2.6–2.8 ms, 37 fps, 31.2 MB (gate 40), +0.1 / +0.1 %. Windows on an upright phone: the tallest 114 CSS px, 74 of 138 at least 30 px. No phone measured.
- **Rows:** data «RAIN files (app)» (3.06 MB of 15; CONTROL +15 MB), «RAIN car passes (app)» (every heard pass has its car within a frame and every car is heard, three densities over 40 min; the sound law's peaks within 0.017 ms of the cars' moments; CONTROLS a free-running car sound, a peak read 120 ms wrong), «RAIN window pick (app)» on the baked map (none overlapping, each at its distance's depth inside the facades' band, all where the law sees their row; CONTROL mirrored); P.night «RAIN room» (the baked city loaded, the painted depth = the baked map's, the cars' recording in the live node, the sound's density = the picture's).
- **Not done / honest limits:** the look is a first bake — roofs read as heavy dark masses, the trims clean, the weathering subtle at the bake's scale (slice 10, the look pass); on an upright phone the nearest plane-tree crowns fill much of the lower half; a Wave change can make a car appear or vanish while its pass is already scheduled (up to 9 s ahead) — picture and sound agree at any steady density; no Detailed captures, no phone numbers; the start still is still the forest's (slice 2).

## 4e. RAIN-2 as built (2026-11-15): much more realism in the view (the founder: «a 3D construction kit»)

- **Houses** (`city.js blockHouses`, `house`): every block split into houses 9–22 m wide, 3–7 floors, set back 0.5–1.9 m on a third, four styles (Art Nouveau: arched windows, iron balconies, keystones, mansards; 19th-century classical: pediments, pilasters, hip roofs; brick: the CC0 brick at its real scale, segmental lintels, gables; Tbilisi wooden: enclosed carved balconies with a lattice band, balusters, small-paned glazing and a fringed board), a neighbour never its twin. Each house a closed box: side walls where a neighbour is lower or set back, hip / gable / mansard roofs whose faces close on each other (slate or clay tiles at real scale), gutters, chimneys. Every window recessed 0.45 m with its surround, sill, frame, mullion and transom; cornices and string courses extruded from real profiles; drainpipes with funnels, AC units with grilles, wires across the street and along the facades, shop fronts (framed glass, the lit interior or a rolled-down rusty shutter, a sign band without text, some awnings). The facade canvas adds drips under the AC units and drainpipes and the splash band at the foot; weathering stronger.
- **Plane trees** (`planeTree`): a trunk forking into 3–4 limbs that split twice, the CC0 plane bark, autumn leaf clusters as alpha cards (our composition of CC0 leaves, tinted yellow / ochre / rust / brown); the nearest (z < 40 m) pruned lower and thinner: an upright phone's lower half 7 % crowns (RAIN-1's 26 %).
- **The light** (`citybake.js`): every pass linear HDR; the lamps as before plus a warm bounce from the street; the night sky from 16 directions over the hemisphere, each with a soft shadow, summed (sky occlusion: recesses, eaves, balcony undersides and the street under the trees darker by what sky they see); the wet reflections as before; haze by the law's depth; our own filmic curve (ACES fit) in the composite. A path tracer was not used (no MIT/BSD/Apache one that runs on three.js r128). The bake: 71 s, three moods.
- **Defocused windows** (`rain-glass.js`, `pure/windows.js`): each window drawn on its own projected quad (the map's `q`: four corners) grown by its blur radius — the signed distance to the quad shapes it in and out of focus; the area for the dimming is the quad's own.
- **Cars and Wave** (`pure/passes.js` the density book): a car's existence is decided by the density booked 10 s (the commit, ≥ the sound's 9-s lead + 0.5 s) before it enters the road; a change is booked 0.5 s ahead and sent to the audio thread with its time — a Wave change shows only in cars entering after it.
- **Files**: the room 3.45 MB of 15.

## 5. The slices, in order

Each slice is one run for Opus at high effort. Each ends with something to look at or listen to. Each report has: static check, data runner, the full Night suite; the room's rows; the budget before and after at Standard and Detailed; captures at phone and laptop size; tree hashes; at most five manual checks.

**Order (the founder's decision, RAIN-0b §9.1):** the glass, the focus, the view and the look test (RAIN-0b, done) → the baked city with its windows and lives (slice 1) → the frame and the start (slice 2) → the rest. The sound (slice 3) may run separately, in any order.

### Slice 1: the baked city, its windows and their lives (large; the first «wow»)
- **Builds.**
  - **The model** grows from the look test (`tools/design/rain/bake/model.js`) to the whole view of the view law (`pure/city.js`): the Art Nouveau house opposite and its neighbours along the boulevard (each block its own proportions and ornament from one seeded procedural kit: arched and straight windows, cornices, pilasters, wrought-iron balconies, a mansard roof with dormers), the left-hand row, roofs (chimneys, antennas, water tanks), the street (asphalt, kerbs, tram tracks and wires, plane trees, lamps, awnings), the old town on the hills (wooden balconies, domes, the fortress wall, the TV tower) as simpler far masses. Tbilisi-inspired, no real building copied, no readable text, no brands. CC0 materials only (more from Poly Haven / ambientCG, each a register entry).
  - **The bake** (`node tools/rain-bake.mjs --city`): per screen shape (the room's lens law: upright, square-ish, wide), colour layers per depth band, the DEPTH MAP, the exact WINDOW MAP (id, rectangle, depth per window), the lit-interior variant of every window with its small life (a lamp behind a curtain, a reader, someone cooking, a cat, a plant, a TV's blue flicker — the look test draws six) as an atlas; masters at the highest quality, smaller copies for Standard. Registered as our own renders of CC0 material.
  - **In the room:** the baked layers replace the stand-in's painting (`rain-city.js`), the window map replaces `cityWindows` for the pick (the law and the fade stay), a lit window shows its baked life; the city's own lit windows per mood. Live in code: lights, cars, tram, reflections, rain, glass, focus.
- **Measures.** A window's height on screen at phone and laptop size (the lives must read: at least 30 px on a 390 × 844 phone at the nearest windows). The bake's time. Files per level against the 15 MB budget (the look test's estimate: ≈ 5–6 MB). The cost of 300 window sprites out of focus.
- **Rows.** Data: «RAIN files (app)» starts here (≤ 15 MB); «RAIN window pick» on the baked window map (each window inside its depth band, none overlapping; CONTROL a mirrored law); the bake's windows agree with the view law (their centres project where the law sees the house). Browser: «RAIN room» extended (a note lights the window under the light, on both screen shapes; the painted depth equals the map's).
- **Cost (est.).** +1–2 texture samples in the view pass; the atlas ≈ 0.5 MB of texture per level.
- **You look at:** far focus on the facade; a phrase played, windows coming on with their lives; a phone held upright.

### Slice 2: the whole frame, and the start (large)
- **Builds.**
  - The room's edge: the painted wooden frame with a brass latch, the deep windowsill, the cup with rising steam, the small plant. Sharp when the focus is near, soft when far. It slides against the city as the camera leans.
  - Roofs (chimneys with steam, antennas, water tanks, an attic window or two), the old town on the hills (balconies, domes, the lit fortress wall, lights climbing the slopes, the TV tower's red lights), the sky (low clouds lit warm from below, indigo above).
  - The boulevard as a still layer: wet asphalt with long reflections, plane trees, tram tracks and wires, awnings, lamps, the two accents (pharmacy green, café rose). No motion yet.
  - **The start still and the reveal**: the room's own still per level (`tools/night-still.mjs --room rain`), placed by the room's lens law. The emblem's dot flies into the city and lights the first window. The room's own 2D stand-in.
  - `still.js` learns to show a development room's still (today it knows only remembered real rooms), and a room's own screen layer.
- **Measures.** The still's match with the live room on six screens (the existing row's method). The opening time. The files' size (the row starts here).
- **Rows.** Data: «RAIN files (app)» (budget 15 MB), «NIGHT start still (app)» covers this room. Browser: «NIGHT still matches the live room» and «NIGHT reveal» run for this room too; CONTROL the old fit.
- **Cost (est.).** +1 texture sample in the glass pass (the frame), +1 program; the prepared picture grows (repainted only at an opening, a resize, a mood change: 60–150 ms on the laptop, est. 150–400 ms on a mid Android, inside the opening's dark moment).
- **You look at:** the composition on a phone upright, on its side and on the laptop (the concept's open question: the share of boulevard and hills is settled here, on real screens); the start and the reveal.

### Slice 3: the room's sound, near and far (medium; sound)
- **Builds.**
  - **CC0 recordings**, looped without seams (the stream's method: grains with equal-power joins): rain on a window pane, close and stereo; the wet street from above (tyre hiss, a far hum). Chosen by ear from two or three candidates each; the founder picks (as with the stream). Synthesis stays as the fallback and as the comparison.
  - The nature recipe gains opt-in parts for them (a room without them is unchanged to the bit).
  - **Near and far**: the hand's depth crossfades them. Near: the pane, close and dry. Far: the street opens, with more of the room's echo. Eased with the picture's focus, from the same number.
  - Event sounds on a seeded schedule shared with the picture: drips from the cornice, a quiet tick in the room. (The tram's bell and thunder come with their pictures, slices 5 and 9.)
- **Measures.** Level under the music as in the forest (K-like, against the forest's nature). Cost in µs a quantum on the render copy. Loop seams (the envelope's self-similarity, as `tools/brook-render.mjs` prints). File sizes.
- **Rows.** P.night: «RAIN nature» (offline: no click at a start, a stop, a room switch or a focus sweep; the near / far balance follows the focus; the forest's nature bit-exact with the new parts absent; CONTROL an instant swap). Data: the recipe's validator with damages. «NIGHT room switch» unchanged.
- **Cost (est.).** +30–60 µs a quantum (two grain players), 0 when parked. Files 0.6–1.2 MB. No picture cost.
- **You listen to:** the two recordings against the synthesis; the hand moving near and far with headphones.

### Slice 4: playing near, in the middle, and long (medium)
- **Builds.**
  - Near: each note wipes a soft patch (RAIN-0's law), drops near the light tremble and some slide; a held note keeps the patch clear, so the light draws. The fingertip lights refract in the drops near them.
  - Middle: a note sends a soft wave of light across the facades.
  - Far, long: a held note lights a whole floor, or switches on a sign.
  - The playing hand's light on the facade shows which window is next.
- **Measures.** The wipe's refog time by eye. The cost of the drops' answer (it must add no texture sample).
- **Rows.** Data: «RAIN glass law» extended (the tremble is 0 without a light; a held note's patch never refogs while held; CONTROL). Browser: «RAIN room» (near: the mist under the light clears; middle: the wave passes; long: a floor).
- **Cost (est.).** Near 0 (the same pass). The wave: one term in the view pass.
- **You look at:** drawing on the misted glass; a slow melody far away; one long note.

### Slice 5: the street alive, and the effects hand (large)
- **Builds.**
  - Cars as pairs of headlights and tail lights on paths, with their reflections in the wet street; a tram lit from inside; people with umbrellas as small shapes; puddles with rings; the traffic lights.
  - **The effects hand** (the same three controls): Wave: how many cars, whether trams run, the wind slanting the rain. Echo: the rain's strength, drizzle to downpour (the glass's drops and rivulets, the air's streaks, and the sound's rain level). Warm ↔ Bright: the city's light from tungsten to cooler blue and neon.
- **Measures.** Sprite fill at the busiest moment at Evening. The rain at full strength: the glass pass's worst case.
- **Rows.** Data: «RAIN street law» (seeded paths, no two cars inside each other, the tram on its track; the effects' values at 0 change nothing, to the bit). Browser: the effects hand's three bars move the three things.
- **Cost (est.).** +1 draw, +1 program; up to 80 moving sprites. Downpour: the glass pass up to +25 %; if over the gate, the downpour's extra layer is Detailed only.
- **You look at:** each effect alone, slowly; a tram passing; a phone on its side.

### Slice 6: the new timbres (medium; sound; has a core part)
- **Builds.**
  - A mellow **electric piano** and a **vibraphone** for the playing hand, as timbre records (the struck solo engines exist: `tine`, `modal`). New permanent ids, appended, the bundle rebuilt.
  - An **upright-like bass** for the bed (slice 7 plays it): a new voice in Night's own bed worklet (plucked: a short noise burst into a damped string, a soft thump).
  - Night's profile takes the two timbres for this room only (levels, strike caps, as for today's).
- **The core part (a small CORE-n).** Timbre records are core data. They are appended (never reordered); Full's lists and sound must stay exactly as they are. To settle in that run: whether Full shows them (a decision in §9). The T5 bounds, the pinned id list, `FULL untouched`, GOLD and the census prove the rest.
- **Measures.** Cost per voice in µs (the Night stress row's method); the caps so a fast phrase stays gentle on a phone; loudness against today's timbres.
- **Rows.** Data: «TIM3 timbre records (core)» with the new ids. P.night: «NIGHT timbres», «NIGHT effects × timbres», «NIGHT stress» with them. Both apps' suites (Level 3; Full `--all`: it touches sound).
- **Cost (est.).** A struck voice 15–40 µs while it rings; caps as «Firefly»'s.
- **You listen to:** each timbre alone, near and far; a fast run on a phone.

### Slice 7: three moods, their modes and bed recipes (large; sound; has a core part)
- **Builds.**
  - **The modes** (a safe 5–6 note set from each, so no note is wrong): Late night from Lydian, Evening boulevard from Dorian, After the rain from Mixolydian or a blues-tinged pentatonic. Mode files appended to `core/data/` (the core part: data only, the scale snapshot renewed by declaration).
  - **The room's own mood names** and the Mood button reading them from the room.
  - **The bed recipes**, one per mood: Late night: sparse, long major-7 colours, electric piano, a very soft bass. Evening boulevard: m9 and m11 colours, a walking-feel bass, vibraphone glints. After the rain: dominant-9 colours, electric piano and vibraphone, an optional soft brushed texture (the concept's open question: built behind a switch, the founder decides by ear).
  - The bed's law learns chord colours as sets of the mode's own degrees (so the harmony is jazz and still never leaves the mode), a bass line law (root, fifth, approach notes from the mode), struck layers for the electric piano and vibraphone inside the worklet.
- **Measures.** The bed's heaviest moment (the work census, deterministic). The bed's level under the playing. No chord outside its mode (exact).
- **Rows.** Data: the bed law's rows extended («every chord's notes are degrees of the mood's mode», «the bass never crosses the playing's register», CONTROLS); the room record's validator with the new recipe parts and damages. P.night: «NIGHT bed» for this room; the forest's bed bit-exact.
- **Cost (est.).** The bed at most 3.5 % of a quantum; Lighter mode: no brushed texture, fewer struck notes.
- **You listen to:** each mood for two minutes, playing over it; the brushed texture on and off.

### Slice 8: the music shown when heard (small)
- **Builds.** From the bed's events on the bus, at the moment they are heard (the forest's mechanism): traffic lights change on the bed's beat; on a chord change a tram passes, sometimes with a blue-white spark on the wire; signs and lit windows breathe with long notes; far lightning on the strongest moments, rarely.
- **Rows.** P.night: the picture's moment against the heard moment within one frame, CONTROL ignoring the output latency (the forest's row's method).
- **Cost.** About 0.
- **You look at:** Music on, hands down, for a few minutes.

### Slice 9: the night goes on, and rare moments (medium)
- **Builds.** Over the session the city falls asleep: windows go out one by one, traffic thins, the rain changes. With the sleep timer the city falls asleep with you, and the last window to go out is one you lit. The eight rare moments of the concept on a seeded schedule (lightning over the skyline, a cat on a sill, two under one umbrella, far fireworks, aircraft lights, a window opened opposite, a gust of leaves, a street musician's light), each with its sound where it has one.
- **Rows.** Data: «RAIN night law» (seeded; the last lit window is a played one whenever one exists; never the same rare moment twice in a row; CONTROL).
- **Cost (est.).** About 0; fireworks and lightning are a few sprites and one term.
- **You look at:** the room's clock moved to a few moments; the sleep timer at 15 minutes.

### Slice 10: the look pass on the baked city (large)
- **Builds.** The baked city at its best: the model's detail and materials where the eye rests, the night light (more lamps, the warm glow on low clouds, the old town's lights), the bake at its highest quality with smaller copies for Standard (the forest's texture rule). No AI images (the founder). The film: grain, grade, a gentle vignette. The yellow plane leaf on the glass. Detailed's extras.
- **Measures.** Files per level against the 15 MB budget; texture memory; the opening time with the files.
- **Rows.** «RAIN files (app)»; the licence register's row with the new entries.
- **You look at:** before / after pairs on a local page, phone and laptop.

### Slice 11: phones, and the release gate (medium)
- **Builds.** The measurements on the Poco M5 and an iPhone (the exact steps given to the founder). The Lighter mode for this room. Texts: the room's name, cards and coaching lines that speak of this room. Then, only with the founder's approval: `room.rain` pinned in `ROOM_IDS`, registered as a real room, the Room button for players.
- **Rows.** The dev-only row is replaced by the real rooms' rows covering two rooms; `node tools/smoke-paths.mjs --build`; Level 4.
- **You check:** the five phone checks of that step.

## 5b. RAIN-7 «even more life» — recorded 2026-11-18 (the founder approved the whole list; build LATER, starred items first; nothing built yet)
- **Rain and water:** ★ rain visible in the lamps' light cones; splashes on the asphalt and in puddles; water running off awnings, balconies and cornices; overflowing gutters and rivulets along the kerb; reflections in the wet asphalt trembling as cars pass.
- **Light:** ★ headlights sweeping across the facades when a car turns; ★ an animated pharmacy cross; signs blinking, one with a failing lamp, a dot ticker without text; a street lamp that flickers now and then.
- **Wind:** ★ tree crowns swaying and falling leaves (more with Wave); awnings and flags moving; chimney smoke drifting; a rare gust turning someone's umbrella inside out.
- **People:** ★ a street musician under an awning playing along with our music; after the rain children jumping in puddles; a couple dancing under one umbrella (rare); a street sweeper machine, a courier, someone with a torch; late at night shops close — shutters come down, signs go out one by one (the half-down shutter can come down fully at Late night).
- **Windows:** a cat on a sill, someone opening a balcony door, someone shaking out a rug (TVs already flicker).
- **Our own window** (concept layer 0, not built yet): ★ the windowsill with a cup of tea with rising steam and a potted plant; the painted wooden frame with a brass latch.

## 5c. RAIN-10 audit «the city is alive» (2026-11-19)
| Asked for | State | Where it lives |
|---|---|---|
| Pedestrians varied: clothes, height, umbrellas, pace | done (drawing restored at RAIN-10) | `pure/life.js` (8 clothes, 7 umbrella kinds, 4 colours, 1.6–1.92 m, 7 lane paces + drift, gear); `rain-glass.js LIFE_F` |
| Gradual arrivals, not all at once | done | `life.js` gates and stagger (RAIN-5b) |
| A natural gait | done (broken in the drawing since RAIN-5e, fixed RAIN-10) | `life.js` phase = distance / stride; `LIFE_F person()` |
| Pigeons | done | `life.js` on the tram wire, rising when a tram passes |
| Balconies and life in windows | done | the bake (balconies); `pure/windows.js` TV flicker, curtain, walk-up, on/off; `far.js` attic |
| Cafés and terraces | done | `life.js` tables, sitters, waiter, bunting; `rain.js` string lights, awning fringes |
| The street not ending at the frame edge | done | `pure/city.js` BEND, 1.6 km |
| Cinematic cars | done; RELEASE-1 B/C: in 3D through the camera's law, smooth shells, no car through another | `pure/vehmesh.js`, `rain-glass.js VEH_V/VEH_F`, `rain.js vehUpload / carsPass` |
| The tram | done; RELEASE-1 B: two sections in 3D, pantograph, spark at its head | `pure/vehmesh.js tramMesh` (RAIN-10's box: `archive/rain-tram-box-RAIN10.js`) |
| ★ rain seen in the lamps' light | done | light kind 3 (RAIN-7) |
| splashes on asphalt and in puddles | partly — rings in puddles, splashes where cars cross road puddles | `life.js` ring, splash |
| water off awnings, balconies, cornices | partly — the cornice's drips by the pane | `rain.js` drips (RAIN-3) |
| overflowing gutters, rivulets along the kerb | done RELEASE-1 C — glints running along both kerbs, with the rain (fainter after it) | `life.js streamsAt`, `LIFE_F` kind 30 |
| reflections trembling as cars pass | not done | — |
| ★ headlights sweeping the facades | done | `vehicles.js sweepAt` |
| ★ the pharmacy cross animated | done | `LIFE_F` sign kind |
| signs blinking, one failing; a dot ticker | partly — a sign flickers (rare event); no ticker | `far.js` flicker |
| a street lamp that flickers now and then | done RAIN-10 | `far.js lampFlickerAt`, `rain.js lampFlicker` |
| ★ crowns sway, falling leaves (more with Wave) | done | `VIEW_F` uTree (RAIN-9), `life.js` leaves |
| awnings and flags moving | done | kind 27 fringes, bunting |
| chimney smoke drifting | not done (steam at street level only) | `life.js` steam |
| a gust turning an umbrella inside out | done RELEASE-1 C — only with a strong Wave, now and then; it shakes and is put right | `life.js gustFlip`, `LIFE_F dome()` |
| ★ the street musician | dropped by the founder's decision (RAIN-9: no visible near place; his notes stay) | `archive/rain-busker-RAIN7-9.js` |
| children jumping in puddles after the rain | not done | — |
| a couple dancing under one umbrella | not done (couples walk) | — |
| sweeper, courier, someone with a torch | partly — the delivery scooter (rare) | `far.js` scooter |
| shops closing late: shutters, signs going out | partly — one shutter down at Late night; windows go out with the sleep timer | kind 28, `pure/sleep.js` |
| a cat on a sill | done RELEASE-1 C — on a lit window of the left row (laptop screens; not in an upright phone's crop): sits and watches, washes, walks, lies, goes in | `life.js catAt`, `LIFE_F` kind 29 |
| a balcony door opening, a rug shaken out | not done | — |
| ★ our own window (sill, tea, plant, frame) | dropped by the founder's decision (RAIN-8) | `archive/rain-frame-RAIN7.js` |

## 5d. AFTER RELEASE (RELEASE-1 stage C, 2026-11-19) — what is left of the wishes, for after Night goes public
Not built, kept for later, in no particular order:
- Reflections in the wet asphalt trembling as cars pass (the baked reflections are still pictures).
- Water running off awnings, balconies and cornices (only the cornice's drips by the pane today); splashes on the asphalt beyond the road's puddles.
- A dot ticker without text on a shop; more signs blinking, one with a failing lamp as a standing state (today a rare flicker).
- Chimney smoke drifting over the roofs (steam only at street level).
- Children jumping in puddles after the rain; a couple dancing under one umbrella (rare).
- A street sweeper machine, someone with a torch (the delivery scooter exists).
- Shops closing late: more shutters coming down and signs going out one by one (one shutter today).
- A balcony door opening, someone shaking out a rug.
- A cat that an upright phone sees too (every lit window in a phone's crop is 68 m or more away: a cat there would be 3 px).
- Pedestrians crossing at the crossing when their light is green (they would need a side view of the walk).
- Vehicles: brake lights and indicators as a car slows for the taxi; a car's wipers; the bus's lit interior with people.
- People seen from above in true 3D (today 2D figures drawn for the angle we look down at them: RELEASE-1 A).

## 6. Cost per item

Laptop = Intel HD 4000, Standard. «Fill» = extra pixels shaded, as a share of one full screen. All est. unless under «RAIN-0 as built».

| Item | Per frame | Programs, draws, memory | Standard | Detailed |
|---|---|---|---|---|
| The city's prepared picture + its depth, four copies (RAIN-0b) | 4 samples in the view pass | 2 programs (painting, blur); made only at an opening, a resize, a mood change | ✓ | ✓ |
| The drop simulation and its map (RAIN-0b) | CPU: a few hundred drops at 60 steps a second; the map: sprites, fill ≈ 0.03 | 1 program, 1 draw | 260 drops | 420 |
| Light sprites, out of focus (the bokeh) | fill 0.3–1.0 × a screen | 1–2 programs, 2 draws | 220 windows, 120 far lights | 320, 260 |
| The soft copy for the mist | 1/16 of a screen | 1 program, 1 draw | ✓ | ✓ |
| The glass: the fine droplets (procedural) | per layer about 12 % of the pass | in the glass program | 1 layer | 2 |
| The glass: mist, clearing, the lanes (RAIN-0b) | 1 sample (two channels) | a 320 × 172 two-byte map updated on the CPU (only the cleared box visited) | ✓ | ✓ |
| The frame and sill (slice 2) | 1 sample | 1 texture, 1–4 MB | ✓ | ✓ (larger) |
| Window lives (slice 1) | 1 sample per lit window pixel | 1 sheet, 0.7 MB | ✓ | ✓ |
| The street's moving lights (slice 5) | fill 0.05 | 1 program, 1 draw | 40 | 80 |
| The film (slice 10) | in the glass pass | — | vignette, grade | + grain |
| Nature: two recordings in grains (slice 3) | 30–60 µs a quantum | 0.6–1.2 MB of files | ✓ | ✓ |
| The bed with bass and struck layers (slice 7) | up to 3.5 % of a quantum | — | ✓ | ✓ |

## 7. Rows that protect the room

| Row | Where | What it holds | Since |
|---|---|---|---|
| «RAIN focus law (app)» | data | the focus from the hand's depth: exactly 0 near and 1 far, monotone, eased, never faster than its limit, the same at 30 and 60 frames a second; RAIN-0b: many depths — near the glass sharp and the facade soft, far the hills sharp, in the middle the street sharper than the glass and the hills, the depth law monotone on its anchors; CONTROLS an un-eased law, a two-plane focus | RAIN-0 |
| «RAIN view law (app)» | data | the projection equals an independent pinhole; the vanishing point inside an upright phone's crop; the street in the lower middle and the house opposite in view on six screen shapes; the windows seeded, never overlapping, each seen on its own row; the traffic seeded, on its lanes, no two cars inside each other; CONTROL a mirrored projection | RAIN-0b |
| «RAIN window pick (app)» | data | which window a note lights: the one under the light, else the nearest within reach, else none; CONTROL a mirrored law | RAIN-0 |
| «RAIN window fade (app)» | data | the trace: on at once, full while held, then slowly down, never up, no jump, still visible after ten minutes; CONTROL an instant off | RAIN-0 |
| «RAIN glass law (app)» | data | RAIN-0b: the mist — a stamp clears, nothing beyond it moves, a held stroke is continuous at any speed, the return slow, uneven, edges first, bounded, the middle's floor; the drops — touching drops become one with the summed area, a runner never passes through a resting drop without merging, beads take their area exactly, the water booked, the cap held, seeded; CONTROLS a stamp-only wipe, a simulation that never merges | RAIN-0 |
| «RAIN stays out of the players' edition (app)» | data | the room's record is valid; not pinned; registered only through the dev door; the door closed in the release edition and without the address word; CONTROLS | RAIN-0 |
| «RAIN room» | P.night, drawn | switching in and out; nothing left after dispose (programs, geometries, textures, contexts); RAIN-0b: opens misted and wet, the painted depth equals the law's; the focus follows the hand's depth together with the sound's depth (near, middle, far; CONTROL two planes); a far note lights the window under the light (the clock jump read on an event, with a limit); a near note clears the mist; a finger's stroke is continuous; CONTROLS | RAIN-0 |
| «NIGHT room switch», «NIGHT untouched», «FULL untouched» | existing | the switching machinery and both apps as they were | always |
| «RAIN files», «RAIN nature», «RAIN street law», «RAIN night law» | data / P.night | as in their slices | 1, 3, 5, 9 |
| «RAIN car passes (app)» | data | every car pass heard has its car in the picture within a frame and every car is heard; the sound law puts each peak on its car's moment; CONTROLS a free-running car sound, a misread peak | RAIN-1 |

## 8. Risks

| Risk | How it is caught | What then |
|---|---|---|
| The glass shader is too heavy for a mid Android at Standard | the budget each slice; the phone run in slice 11 (earlier if the founder can run «Measure this device» on a preview) | the §3 levers, best first |
| Out-of-focus discs overdraw when many windows are lit (Evening, near focus) | the fill measured in slice 1 at the worst case | a cap on drawn discs per level; the dimmest merge into the blurred picture |
| The look reads as a shader demo, not a film frame | the founder's eye after slices 1 and 2; the look pass | the baked city's detail and light first (part of slice 10 moved up) |
| Cold blue overall, or neon overload (the concept's «avoid») | captures against the style bible's colours in every slice | the tokens, not the code, are corrected |
| The city reads as a real place or shows readable text | the founder's eye; no text is ever drawn | — |
| New timbres or modes change Full | `FULL untouched`, GOLD, the census, the scale snapshot's declared renewal | the core part stops and is redone as opt-in |
| The recordings' loops are heard | the self-similarity measure; the founder's ear | another recording, or the synthesis |
| A mood change repaints the city in one frame (a hitch) | the frame gap printed at a mood change | the repaint spread over frames with a crossfade (slice 2) |

## 9. The founder's decisions (recorded at RAIN-0b, 2026-11-14)

1. **The order:** the glass, the focus, the view and the look test (RAIN-0b) → the baked city with its windows and lives (slice 1) → the frame and the start (slice 2) → the rest. The sound may run separately (RAIN-3 follows RAIN-0b directly).
2. **The view:** more street; the upright phone looks along the boulevard (smaller windows, more street) — built in RAIN-0b's view law.
3. **The new timbres** (slice 6): Night only; Full's lists and sound stay untouched.
4. **The brushed rhythm** in «After the rain» (slice 7): behind a switch, decided by ear.
5. **An early Poco number:** yes — the test address is the dev branch alias **https://handsong-night-git-dev-mihail-bridge.vercel.app**. The rain room there: **https://handsong-night-git-dev-mihail-bridge.vercel.app/?room=rain** (a preview build is the development edition; «Measure this device» under ⓘ with the rain room current). The room's files are not in the offline precache (development only): open it online.
6. **No AI-generated images:** the city is a 3D model built by code and baked offline from CC0 materials (§1).
