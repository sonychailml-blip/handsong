# REVIEW-1 · Part 3: from one forest to many rooms

## Коротко для основателя (по-русски)

- В лесу примерно половина кода годится для любой комнаты: небо с луной и облаками, звёзды, свет руки со шлейфом, парящие огоньки, вода и её отражение, туман, «плёнка» (мазки, виньетка, зерно), круги от нот, редкие события, музыкальный рецепт, звуки природы, запись комнаты. Только лесное: земля, стволы, кора, мох, травы, грибы, ручей с камнями.
- Сегодня общее и лесное лежит вперемешку в одном большом модуле. Вторая комната «как есть» обойдётся почти так же дорого, как лес. Поэтому сначала **набор для комнат** (два захода), без изменения картинки леса, с побитовой проверкой «до и после».
- **Главная мысль этой части:** камера в Night неподвижна. Значит, настоящая трёхмерная сцена на каждом кадре не нужна. Комнату можно хранить как **картину со слоями глубины и рельефа**, а на каждом кадре считать только свет, частицы, воду и туман. Это в разы дешевле для видеокарты, открывается за доли секунды и на телефоне рисуется в полном разрешении.
- Такая «комната-картина» это не «бедный» тип, а возможное будущее и для самого леса на слабых устройствах: наш собственный лес можно один раз «сфотографировать» нашим же инструментом в такие слои.
- Хорошая ли идея? Да, с оговорками: камера не сможет заметно двигаться, травы вдали не будут качаться, и картина должна быть сделана цельно. Насколько хорошо выйдет, покажет один пробный заход на нашем лесе, сравнение бок о бок.
- **Цена второй комнаты:** сейчас 3–4 захода для простой комнаты (озеро) и 8–12 для трёхмерной (зал). После набора: 1,5–2 и 5–7. Как комната-картина: около 1–1,5 захода плюс время на саму картину.
- **Какая вторая комната даст самый сильный контраст с лесом:** не озеро (это та же ночная природа), а **каменный зал при свечах**: тёплый свет вместо холодного, камень вместо листвы, долгое эхо, рука несёт пламя свечи, ноты зажигают свечи. Это ваша же первая идея «темнота и свет». Озеро хорошо третьим.
- Порядок: (1) свои «случайные потоки» для частей леса, (2) вынос общего в набор, (3) пробная комната-картина из нашего леса, (4) вторая комната.
- Правил лицензий это не нарушает: картины только свои, CC0, CC-BY или сгенерированные с записью инструмента и условий (правило #32).

---

## 1. What in the forest is generic, and what is the forest's own

Read from the code as it stands after NIGHT-8c. «Kit» = could serve any room. Sizes are the files' sizes today.

### 1.1 Already generic (nothing to do)

| Part | Where |
|---|---|
| The scene host: one room alive at a time, levels, the dark moment of an opening, sliced compile, the stand-in when WebGL fails, switching with fades | `apps/night/scene/host.js` |
| The room record and its validator with damage cases; pinned ids | `apps/night/pure/room.js` |
| The rooms' list, lazy loading, prefetch, the room's folder | `apps/night/rooms/index.js` |
| Switching: bed held, picture, nature crossfade on two slots, name, room remembered | `apps/night/roomswitch.js` |
| The music bed: recipes per room (`bed`, `bed2`), driver, worklet | `apps/night/bed2.js`, `pure/bed2.js`, `worklets/bed-worklet.js` |
| The nature sound built from a room's recipe | `apps/night/sound/ambience.js`, `pure/ambience.js` |
| The buses a room reads: hands, notes, `nightFx`, `nightSky`, `bed`, `audioClock` | `core/pure/bus.js`, shell |
| A dev test room that proves a second room can register, switch and leave | `tools/probes/night/testroom.js` |

NIGHT-3 did this work well. A second room can be registered today.

### 1.2 Generic in nature, but written inside the forest (the kit to extract)

| Kit part | Where it lives now | Notes for the split |
|---|---|---|
| **The night sky:** moon disc, halo, face, clouds passing over it, the moon's light dimming with them; stars | built inline in `forest.js` (about lines 195–203), stars in `forest-canopy.js`, the laws in `apps/night/pure/cycle.js` | the laws are already outside the forest; only the drawing is inside |
| **The hand's light:** core, halo, trail, glint on a note, echo rings, warm ↔ cold colour, the tremble; its placement through the room's camera with bounds | `forest.js` (`rigs`, `place`, `rings`, `glint`, `project`) | every room needs exactly this; the bounds and the depth law become the room's numbers |
| **Floating lights:** seeded motes that drift, gather to the playing light, dart with notes, twinkle with the bed | `rooms/forest/pure/fireflies.js` (mixed in one file with the forest's ground law), the point shader `PV` / `PF` in `forest.js` | fireflies, plankton, snow, embers, dust are one law with different numbers |
| **Water:** the surface shader (Fresnel, moon sparkles, reflected glows, flow map, wet edge), the planar mirror of silhouettes | `forest-life.js` (`WATER_F`), `forest-mirror.js`, `pure/water.js` | a lake is this shader with the flow at zero and a larger mirror |
| **Rings from notes** on a surface | `pure/forestlife.js`, `pure/answers.js` | ground waves in the forest; water rings in a lake; light on stone in a hall |
| **Mist:** sheets at depths, strips over water, fog by mood | `forest.js`, `forest-stream.js` | |
| **The film:** brush strokes by depth, soft edges, shadow grade, vignette, grain, the «breath»; the glowing layer drawn on top with its own depth test | `forest-paint.js`, `pure/paint.js` | already a clean module: it takes a scene and a camera and knows nothing of trees |
| **Rare moments:** the falling star, the five-dot emblem; the schedule | `forest-rare.js`, `pure/cycle.js` | the flower that opens on a long note is the forest's; «a long note opens something» is the kit's hook (`held`) |
| **Mood looks:** token sets per mood, eased | `pure/room.js` (`LOOK`), `forest.js` (`lookCols`) | |
| **The bed's events shown when heard** | `forest.js` (`bedQ`, `bed()`), `pure/heard.js` | the queue is generic; what answers (mushrooms, far fireflies) is the room's |
| **The effects hand's gust** as a moving influence | `pure/gust.js`, `forest-gust.js` | the law is generic; what it bends is the room's |
| **The stream from a CC0 recording:** grains from random places, equal-power joins, voices placed in space | `pure/brookrec.js`, `worklets/nature-worklet.js` | this is a general «texture from a recording» player: rain, surf, fire, wind in a hall |
| **Seeded pulse singers** (the crickets) | `pure/ambience.js` | frogs, drips, far bells are the same law |
| **Capture and budget tools:** fixed close views, the room's own frame, the budget eval, the files row | `tools/ui-snap.mjs`, `tools/forest-budget.eval.js`, `tools/forest-bake.mjs` | named after the forest, mostly room-neutral inside |

### 1.3 The forest's own (stays in `rooms/forest/`)

The ground's law and relief, the carved stream bed and its path; trunks, branches, bark mapping, moss and lichen, roots, logs, stumps, snags, bracket fungi; ferns, grass, the herb layer, ivy, the canopy's crowns and understorey, the dappled light; mushrooms, night flowers, foxfire, dew and webs; rocks, pebbles, drifting leaves, litter; the scanned or baked floor; the stand-in; every `--cv-forest-*` token; the nature and bed recipes' numbers.

By size: of about 310 KB of forest code, roughly 110–130 KB is kit in nature (film, mirror, water shader, motes, sky, hand light, gust and ring laws, rare moments, the recording player), the rest is forest.

## 2. How to split it, in what order, without breaking anything

The danger is not the rules (all of this is inside `apps/night/`, no core change) but two facts found in Part 1:
- **one seeded stream feeds everything in `buildForest`,** so moving a block changes every random draw after it;
- **two captures of the same forest are not pixel-equal today** (animation and clocks), so «nothing changed» cannot be proved by pictures yet.

So the first two steps build the safety, and only then code moves.

**Step 0. A frame print for refactors (half a run).** A probe door that pins the room's clock, the light's position and the frame step, draws N fixed steps and returns a hash of the frame buffer. Stored per machine in a git-ignored file (GPU-dependent), compared before and after on the same machine. With it, a pure move is proved bit for bit. CONTROL: one changed uniform must change the hash.

**Step 1. A seeded stream per subsystem (half a run, one declared change).** `seeded(FOREST_SEED ^ tag)` for ground, bark, trunks, ferns, mist, sky, and so on. The layout changes once; the founder looks at a before / after pair; the forest's prints that depend on places are renewed once, declared (core rule 9: a NIGHT run renews only night prints). From here on, edits are local. The spruce run needs this too, so it is not kit-only work. If the spruce run comes first, do this step at its start.

**Step 2. Move the kit, no behaviour change (one run).** New folder `apps/night/kit/`. In this order, each proved by the frame print and the unchanged FOREST rows (draws, programs, triangles, texture bytes equal):
1. `forest-paint.js` + `pure/paint.js` → `kit/film.js`, `kit/pure/film.js` (a pure file move; the user commits the move before edits, core rule 12 in spirit).
2. `forest-mirror.js` → `kit/mirror.js`.
3. `pure/fireflies.js` split: the motes' law → `kit/pure/motes.js`; `forestGround`, `depthDistance` stay.
4. The sky's drawing out of `forest.js` → `kit/sky.js` (colours passed in, not read as `forest-*` tokens).
5. The hand's light out of `forest.js` → `kit/handlight.js` (bounds and depth law passed in).
6. The star and the emblem → `kit/rare.js`; the flower stays.
7. The water's shader text and uniforms → `kit/water.js`; the stream's path, rocks and banks stay.

**Step 3. The room helper and the proof room (half a run).** `kit/room.js`: a small function that wires `update / render / resize / dispose / state / texBytes / glint / held / bed` from parts, owns the dispose list and the bed queue. Rebuild the dev test room on the kit as a tiny real room (sky, hand light, motes, film): «a room in about a hundred lines». Its rows: the existing «NIGHT room switch» set, plus «no texture left after dispose» (exists as the leak control).

**Step 4. The sound kit (half a run).** The nature recipe gains a list `textures` (each: a recording, its level factor, its voices) with today's `stream.rec` as its first case, and `singers` as the general form of `crickets`. The forest's recipe keeps its values; the offline rows that measure the nature sound must read the same numbers to the last digit. A new sound kind (rain, surf, fire) is then a CC0 file, a register entry and a few numbers.

**Step 5. The picture room type (section 3), as a spike first.**

**Step 6. The second room.**

What protects each step: the frame print (0), the FOREST and NIGHT rows as they are, `P.night` and `P.quick` both green, the files row, and for sound the existing level rows. No tolerance needs widening anywhere; if a step cannot be proved exactly it is not a pure move and gets its own declared run.

## 3. A cheaper room type: the picture room

### 3.1 The observation that makes it possible

Night's camera does not move. It leans a few centimetres towards the light and breathes a little. A full 3D scene exists so a camera can travel through it. Without travel, every frame redraws 200–750 thousand triangles to produce nearly the same picture, on a GPU that the hand model needs. Part 1 measured the price: the forest's content and raster compete with detection, and phones get 234-pixel pictures to stay affordable.

A room can instead be stored as **a picture with depth**:
- per layer: colour, a normal map (which way each point faces), depth, and a mask channel for things that glow;
- each frame, one full-screen pass lights that picture from the hands' lights and the room's own lights (position in the picture's pseudo-space from the hand's point and depth, as today), adds fog by depth and the mood's grade, and shifts layers slightly by depth for parallax;
- on top, the kit's living things as they are today: motes, halos, mist, water, the film.

Cost per frame: one pass with four texture reads and a handful of lights, at any resolution. On the HD 4000 that is a small fraction of today's Standard; on a phone it allows the full screen's pixels. Shader programs: 3–5 instead of 28, so the first opening is well under a second. The 2D stand-in of such a room is nearly the room itself (the colour layer and a radial light), so even without WebGL it looks right.

### 3.2 Two sources for the same runtime

1. **Authored pictures:** painted by us in code or by hand, or AI-generated (rule #32 allows AI pictures with the tool and its terms recorded in the register; nothing with share-alike or non-commercial terms). Layers and depth are made at authoring time: generated per layer, or split by hand; depth from our own painting of it or from an estimator used as a dev tool (its licence and its terms for outputs go in the register first); normals from depth by our own script.
2. **Our own 3D rooms, baked.** The forest is static except for swaying plants. A dev tool can render it once, at high quality and high resolution, into exactly these layers (colour without lighting, normals, depth, glow ids), for a portrait and a landscape view. Then every device shows the Detailed forest's shapes at its own full resolution, and the per-frame cost no longer depends on triangles. **The picture room is therefore also a candidate for the forest's own Standard level and for phones.**

### 3.3 Is it a good idea?

Yes, with open eyes about the limits.

| Gains | Limits |
|---|---|
| GPU cost per frame falls several times; heat and battery with it | The camera cannot travel or turn; parallax is a few pixels |
| Full-resolution picture on phones | Things in the picture do not move unless drawn as live layers: far plants will not sway. A few live plants in front (real geometry tested against the stored depth) keep the forest's breathing where it is seen |
| Opening in under a second, almost no compile | Relighting is only as good as the normals and depth; estimated ones need hand correction |
| A new room is mostly a picture and a record: about one run | A weak or incoherent picture cannot be rescued by the runtime: the art must be chosen with care (the founder's choice among candidates, as decided for design) |
| One art direction is easy to hold across rooms («painted night», Part 2) | Each aspect needs its own crop or a second picture (portrait and landscape) |
| The hand's light can cast soft contact shadows by stepping through the stored depth, even at Standard, which has none today | Files: 3–6 MB per room at good quality; a per-room budget is needed (today's 30 MB is one room's) |
| The low level and the no-WebGL fallback look like the room | Some of the forest's answers need rework: ground waves and foxfire become effects in the lighting pass (possible: the world position of each pixel is known from depth) |

**How good can it look?** For still composition and light: as good as the picture, which can be far better than what we can model (a stone hall, a mountain lake, an aurora over snow are hard in geometry and easy in paint). For life: motes, flames, mist drifting between layers, water, light pools that follow the hands and reveal relief, slow parallax. This is the look of the best «living painting» scenes in quiet games. What it will not give is the feeling of standing inside moving foliage; that is what the 3D forest at Detailed remains for.

**What I am unsure of:** whether a baked forest relit by one pass looks as rich as today's forward-lit one (shadows of ferns, the shimmer of moving grass). That is a question for eyes, and one spike answers it.

### 3.4 What it takes

**The spike (one run), on our own forest, behind a dev switch:**
1. A bake door in the forest: draw the Detailed scene once into colour (lights off), normals, depth and a glow-id mask at 1920 × 1080 (and one portrait size), in the page, into render targets. No files yet.
2. `kit/picture.js`: the relight pass (hand lights, wild lights, moon, fog, mood grade, parallax by depth), with the kit's live layers on top.
3. Side-by-side captures against Standard and Detailed at laptop and phone size; the budget eval's numbers for all three.
4. A pure twin of the lighting formula in `kit/pure/picture.js` and its data row (light at a place → brightness at sample points, exact), so the shader's law is pinned without judging pixels.

Decision after the spike, by the founder's eye and the numbers.

**If it stays (one to two more runs):** the bake moved to a dev tool that writes files (`tools/room-pack.mjs`: sizes per level, encoding, a register entry, the files row with a per-room budget); the record gains `kind:'picture'` with its layers, light anchors, particle and mist recipes, the hand's depth range, crops; the validator and its damage cases; the stand-in from the colour layer; the answers moved into the pass (rings, glow ids pulsing with the bed, foxfire).

Probes: the record rows (validator, damages); the lighting law's data row; runner rows: programs at most 5, the opening under 1 s on the laptop as a measured value, a note makes a glint, nothing left after dispose, the room switch set; the budget eval as the yardstick.

## 4. What a second room costs, before and after

A «run» here is one slice of the size of NIGHT-8 or NIGHT-9. All estimates; I would trust their order more than their size.

| Second room | Today | After the kit (steps 0–4, about 3 runs) | As a picture room (after the type exists: 2–3 more runs once) |
|---|---|---|---|
| **Lake at night** (full-screen procedural water and sky; the old plan's cheapest) | 3–4 runs: its picture; the sky, the hand's light, rings and motes written again or copied out of the forest; its sound needs a water texture, which today is wired to «the stream»; record, moods, levels, stand-in, rows, texts, icon | **1.5–2 runs:** sky, hand light, motes, water, rings, film and the recording player come from the kit; new are the shore's shapes, the record and recipes, the rows | 1–1.5 runs plus the picture |
| **A 3D room** (the stone hall as geometry, in the forest's technique) | 8–12 runs (the forest took about 15 slices) | 5–7 runs | not applicable |
| **Any picture room** (hall by candlelight, aurora over snow, a window in the rain, a sea of plankton) | not possible | not possible | **1–1.5 runs each,** plus making and choosing the picture |

The kit pays for itself with the first room. The picture type pays for itself with the second, and it is the only way the backlog's «grow to about ten rooms» fits one founder's year.

## 5. Which second room makes the strongest contrast

The lake was chosen earlier because it is the cheapest and safest. It is also the forest's twin: night, nature, moon, mist, cold colours. A tester who opens it will feel «the same, with more water». As a third room it is right, and it reuses the water kit.

For contrast, change every axis at once:

| Axis | Forest | Stone hall by candlelight |
|---|---|---|
| Place | outdoors, wild | indoors, made by hands |
| Light | cold moon, many small lights | warm flames in the dark, few lights |
| Shapes | organic, vertical trunks | arches, steps, a long axis |
| The hand | carries a firefly | carries a candle flame |
| What playing does | the forest answers and returns to rest | **notes light candles** that burn down slowly: the hall fills with light as you play and darkens when you stop. A visible trace of the session. |
| Sound of the room | a short forest echo | a long stone tail (a second setting of the same «depth» effect, not new code if its numbers become the room's; today one acoustic serves every room by the founder's decision of 2026-11-03, and I would reopen that for this room) |
| Music | five-note moods, struck and breathed sounds | a modal mood (six or seven notes of a quiet mode from the existing 74), the bowl and a voice-like bed (the bed's «voices» palette exists) |

It is also the founder's first picture of the idea («darkness and light: the points are candle flames lighting parts of the room», backlog §7.16), it is the natural first picture room (stone takes relighting from a normal map very well: relief is the whole show), and its colour tests the new interface palette against a warm room.

If an outdoor room is preferred: **an aurora over snow** is the strongest outdoor contrast (a vast open sky against the forest's closed one; the hands pull curtains of colour). It is heavier for the GPU as a ray-marched shader (the old plan's 1.5–3 × the forest), lighter if the curtains are a half-size layer over a painted land.

Order I would propose: hall by candlelight (picture room) → lake (kit water, procedural or picture) → aurora.

## 6. Risks and how they are kept small

- **The kit move breaks the forest quietly.** Kept small by the frame print and by moving files before editing them.
- **The picture type looks flat.** Kept small by the spike on our own forest with a side-by-side before any room is designed for it.
- **AI pictures and licences.** Each picture: the tool, its version and its terms in `tools/licences.json` before it enters the repository; no service whose terms claim the output or forbid commercial use; estimators and upscalers used as dev tools are entries too. The LIC1 row already fails on an unregistered file.
- **Files budget.** Today one budget (30 MB) is the forest's. Before a second room: a budget per room and a total, checked by the files row; a room's files are fetched only when it is opened (already so).
- **Scope.** A kit invites building for imagined rooms. Rule for the kit run: nothing enters the kit that the forest does not use today, except the picture runtime, which gets its own decision.

## 7. Where I am unsure

- The size of every estimate above.
- Whether a baked, relit forest keeps enough of its life (section 3.3).
- How well estimated depth and normals hold up on authored pictures without hand work.
- Whether one acoustic for every room survives a stone hall. My ear would say no; the founder decides.
