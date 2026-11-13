# RAIN: the room «Rain» — the plan (RAIN-0, 2026-11-13)

## Коротко по-русски (для основателя)
1. Комната строится в 11 шагов после этого; каждый шаг — один запуск Opus на высоком усилии, в конце каждого есть что посмотреть или послушать.
2. Сделано сейчас (RAIN-0): дождь на стекле, фокус от глубины руки и окно, которое зажигает нота. Город пока условный — простая заглушка в цветах концепции.
3. Комната видна только в разработке: адрес с `?room=rain`. В версии для игроков её нет, кнопки «Комната» нет.
4. Порядок шагов такой, чтобы «вау» пришло рано: сначала дом напротив с окнами и жизнью в них, потом рама, подоконник, крыши, холмы и небо, потом звук дождя.
5. Затем игра вблизи (стереть запотевшее стекло), живая улица (машины, трамвай), вторая рука.
6. Звук — отдельные шаги: записи дождя и улицы (только CC0), новые тембры (электропиано, вибрафон, контрабас в фоне), три настроения со своими ладами и гармонией.
7. Потом: фон, показанный в картинке (светофоры, трамвай на смене аккорда), город засыпает, редкие события.
8. В конце — проход по красоте (написанные слои) и выпуск: замеры на Poco и iPhone, кнопка «Комната» для игроков только после вашего одобрения.
9. Стоимость: «Стандартная» картинка должна быть плавной на среднем Android и iPhone; каждый шаг меряет цену на ноутбуке и печатает её. Числа ниже с пометкой «оценка» ещё не измерены.
10. Вопросы к вам — в конце файла (§9): пять решений, которые меняют порядок или объём работы.

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
- **Licence (#32) and privacy (#33).** Recordings: CC0 only, each a register entry with its source. Painted layers: our own work, or AI-generated with the tool and its terms registered. No new host, no new network call beyond the room's own files on our origin (each listed in the static check's network guard).
- **What never changes during play is prepared ahead** (the forest's rule): painted layers and atlases ship as files; a small tool in `tools/` regenerates them.
- **Colours are tokens** (`--cv-rain-*` in `night.css`); the concept's style bible is the source.
- **Checks: Level 2** per CLAUDE.md «Check levels» (static, data, the full Night suite); Level 3 when a slice has a core part. At most five manual checks. A slice that cannot finish green stops at its last green state.

## 2. How the room is built (the technical direction, confirmed or replaced)

| The concept's direction (§9) | The plan |
|---|---|
| The camera breathes and leans slightly | **Confirmed.** The city is so far away that the lean shows only between the glass / the frame and the city. So the lean moves the glass layer and the frame over the city, a strong depth cue at no cost. |
| Layered 2.5D planes, windows as instances with their own state | **Confirmed, simplified.** The city's still parts are drawn ONCE into a picture (at the opening, a resize, a mood change), not every frame. Only what changes is drawn each frame: lit windows, lamps, later cars and trams, as light sprites. |
| The rain on glass is a full-screen pass | **Confirmed.** One pass: drops of several sizes, rivulets with trails, mist, clearing, refraction. All procedural, our own shader written from the physics (a lens, a wet film, a frosted pane). |
| The focus pull blends pre-blurred versions | **Confirmed, with one addition.** The still city has one pre-blurred copy (made once). Lights are NOT blurred by a filter: each light sprite grows into a soft disc as it leaves focus and dims by its area. That is the bokeh, and it costs only fill. |
| Phones first; Standard smooth, Detailed adds detail | **Confirmed.** Standard: 30 frames a second at the host's reduced resolution, fewer drop layers. Detailed: 60, one more drop layer and a second rivulet layer. |
| A file budget of its own (15 MB) | **Confirmed.** A data row «RAIN files (app)» from slice 2 on: fails above 15 MB, prints the size every run. |

**One frame, in order** (three passes and two small ones):
1. **The view** (full size): the city's prepared picture, sharp and blurred mixed by the focus, then the light sprites on top.
2. **The soft copy** (a sixteenth of the pixels): the view shrunk and blurred, for what is seen through mist.
3. **The glass** (full size, to the screen): drops and rivulets bend the view, mist shows the soft copy, the hand's light glows in the mist. Later: the frame and sill on top, the film grade.

**The world is fixed, the screen is a crop of it.** The glass and the city are placed in view-angle units, not screen units. A wider lens shows more glass and more city. So the start still (slice 2) can be this room's world through a wider lens, placed by the room's lens law, exactly as the forest's.

**Depth is focus** is one eased number, 0 (the glass) … 1 (the city), from the playing hand's depth (the same `d` the forest reads, so the calibration's near and far points map as in the forest). The city's blur falls and the glass's blur rises with it. The sound's closeness needs nothing new for the played notes: the shared acoustic (`fdepth`) already follows the same depth. The room sounds' near / far balance comes in slice 3.

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

## 5. The slices, in order

Each slice is one run for Opus at high effort. Each ends with something to look at or listen to. Each report has: static check, data runner, the full Night suite; the room's rows; the budget before and after at Standard and Detailed; captures at phone and laptop size; tree hashes; at most five manual checks.

**Order:** the picture that answers playing first (windows with lives), then the whole frame, then the sound that makes it a place. Then the rest of the playing, the street, the music, the long night. The look pass and the release gate come last.

### Slice 1: the house opposite and its windows (large; the first «wow»)
- **Builds.**
  - The real view: the eye on the 8th floor, looking slightly down and diagonally along the boulevard. One pure projection law (`pure/city.js`) used by the painting, the sprites and the note's pick.
  - The Art Nouveau facade opposite and its neighbours along the street: plaster, cornices, tall windows, balconies, a mansard roof. Painted by our own drawing code into the prepared picture, in the concept's palette.
  - Every window an instance with its own state. **The lives**: one prepared sheet of small interiors (a lamp behind a curtain, a reader, someone cooking, a cat on the sill, a plant, a TV's blue flicker; at least six), drawn by a tool in `tools/` (`rain-bake.mjs`), registered as our own work.
  - A note lights the window where the light points, with its life; the trace fades slowly (RAIN-0's law, kept).
  - The city's own lit windows per mood (few at Late night, many at Evening).
- **Measures.** A window's height on screen at phone and laptop size (the lives must read: at least 30 px on a 390 × 844 phone). The cost of 300 window sprites out of focus (the worst fill).
- **Rows.** Data: «RAIN view law» (the projection against a pinhole camera; the facade's windows never overlap; CONTROL a mirrored projection). «RAIN window pick» extended to the projected windows. Browser: «RAIN room» extended (a note lights the window under the light, on both screen shapes).
- **Cost (est.).** Laptop: +0.2 ms a frame, +1 program, +1 draw; the sheet 0.7 MB of texture. Phones: the fill of the out-of-focus discs is the risk; the count of lit windows is capped per level.
- **You look at:** far focus on the facade; playing a phrase and watching windows come on; the same on a phone held upright.

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

### Slice 10: the look pass (large)
- **Builds.** The prepared layers repainted at their best: masters at the highest quality, smaller copies for Standard (the forest's texture rule). Painted layers may be AI-generated (tool and terms registered) or our own. The film: grain, grade, a gentle vignette. The yellow plane leaf on the glass. Detailed's extras.
- **Measures.** Files per level against the 15 MB budget; texture memory; the opening time with the files.
- **Rows.** «RAIN files (app)»; the licence register's row with the new entries.
- **You look at:** before / after pairs on a local page, phone and laptop.

### Slice 11: phones, and the release gate (medium)
- **Builds.** The measurements on the Poco M5 and an iPhone (the exact steps given to the founder). The Lighter mode for this room. Texts: the room's name, cards and coaching lines that speak of this room. Then, only with the founder's approval: `room.rain` pinned in `ROOM_IDS`, registered as a real room, the Room button for players.
- **Rows.** The dev-only row is replaced by the real rooms' rows covering two rooms; `node tools/smoke-paths.mjs --build`; Level 4.
- **You check:** the five phone checks of that step.

## 6. Cost per item

Laptop = Intel HD 4000, Standard. «Fill» = extra pixels shaded, as a share of one full screen. All est. unless under «RAIN-0 as built».

| Item | Per frame | Programs, draws, memory | Standard | Detailed |
|---|---|---|---|---|
| The city's prepared picture, sharp + blurred | 2 samples in the view pass | 1 program; repainted only at an opening, a resize, a mood change | ✓ | ✓ |
| Light sprites, out of focus (the bokeh) | fill 0.3–1.0 × a screen | 1–2 programs, 2 draws | 220 windows, 120 far lights | 320, 260 |
| The soft copy for the mist | 1/16 of a screen | 1 program, 1 draw | ✓ | ✓ |
| The glass: static drops | per layer about 12 % of the pass | in the glass program | 3 layers | 4 |
| The glass: rivulets with trails and beads | per layer about 20 % of the pass | same | 1 layer | 2 |
| The glass: mist, clearing, the wipe map | 2 samples | a 64 × 40 one-byte map updated on the CPU | ✓ | ✓ |
| The frame and sill (slice 2) | 1 sample | 1 texture, 1–4 MB | ✓ | ✓ (larger) |
| Window lives (slice 1) | 1 sample per lit window pixel | 1 sheet, 0.7 MB | ✓ | ✓ |
| The street's moving lights (slice 5) | fill 0.05 | 1 program, 1 draw | 40 | 80 |
| The film (slice 10) | in the glass pass | — | vignette, grade | + grain |
| Nature: two recordings in grains (slice 3) | 30–60 µs a quantum | 0.6–1.2 MB of files | ✓ | ✓ |
| The bed with bass and struck layers (slice 7) | up to 3.5 % of a quantum | — | ✓ | ✓ |

## 7. Rows that protect the room

| Row | Where | What it holds | Since |
|---|---|---|---|
| «RAIN focus law (app)» | data | the focus from the hand's depth: exactly 0 near and 1 far, monotone, eased, never faster than its limit, the same at 30 and 60 frames a second; the two blurs opposite; CONTROL an un-eased law | RAIN-0 |
| «RAIN window pick (app)» | data | which window a note lights: the one under the light, else the nearest within reach, else none; CONTROL a mirrored law | RAIN-0 |
| «RAIN window fade (app)» | data | the trace: on at once, full while held, then slowly down, never up, no jump, still visible after ten minutes; CONTROL an instant off | RAIN-0 |
| «RAIN glass law (app)» | data | the wipe map: a stamp clears, the mist comes back slowly and exactly, nothing outside the patch moves; CONTROL no refog | RAIN-0 |
| «RAIN stays out of the players' edition (app)» | data | the room's record is valid; not pinned; registered only through the dev door; the door closed in the release edition and without the address word; CONTROLS | RAIN-0 |
| «RAIN room» | P.night, drawn | switching in and out; nothing left after dispose (programs, geometries, textures, contexts); the focus follows the hand's depth together with the sound's depth; a far note lights the window under the light; a near note clears the mist; CONTROLS | RAIN-0 |
| «NIGHT room switch», «NIGHT untouched», «FULL untouched» | existing | the switching machinery and both apps as they were | always |
| «RAIN view law», «RAIN files», «RAIN nature», «RAIN street law», «RAIN night law» | data / P.night | as in their slices | 1, 2, 3, 5, 9 |

## 8. Risks

| Risk | How it is caught | What then |
|---|---|---|
| The glass shader is too heavy for a mid Android at Standard | the budget each slice; the phone run in slice 11 (earlier if the founder can run «Measure this device» on a preview) | the §3 levers, best first |
| Out-of-focus discs overdraw when many windows are lit (Evening, near focus) | the fill measured in slice 1 at the worst case | a cap on drawn discs per level; the dimmest merge into the blurred picture |
| The look reads as a shader demo, not a film frame | the founder's eye after slices 1 and 2; the look pass | painted layers earlier (part of slice 10 moved up) |
| Cold blue overall, or neon overload (the concept's «avoid») | captures against the style bible's colours in every slice | the tokens, not the code, are corrected |
| The city reads as a real place or shows readable text | the founder's eye; no text is ever drawn | — |
| New timbres or modes change Full | `FULL untouched`, GOLD, the census, the scale snapshot's declared renewal | the core part stops and is redone as opt-in |
| The recordings' loops are heard | the self-similarity measure; the founder's ear | another recording, or the synthesis |
| A mood change repaints the city in one frame (a hitch) | the frame gap printed at a mood change | the repaint spread over frames with a crossfade (slice 2) |

## 9. Decisions for the founder

1. **The order** in §5: windows with lives first, then the whole frame and the start, then the sound of rain. Or the sound before the frame?
2. **The view's share** (the concept's open question): settled in slice 2 on real screens. On a phone held upright the facade fills most of the frame and the street shows only at the right edge. Is that right, or should the upright view look more along the boulevard (smaller windows, more street)?
3. **The new timbres in Full** (slice 6): shown in Full's timbre lists too, or kept for Night only?
4. **The brushed rhythm** in «After the rain» (the concept's open question): built behind a switch in slice 7, you decide by ear.
5. **A phone number early:** can you run «Measure this device» with `?room=rain` on a preview on the Poco after slice 1? It tells us early whether the glass fits Standard.
