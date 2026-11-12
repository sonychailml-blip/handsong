# REVIEW-1 · Part 1: the code audit

## Коротко для основателя (по-русски)

- Код в хорошем состоянии: проверок много, они строгие, грубых ошибок я не нашёл. Слабые места не в музыке и не в лесу, а в том, **что происходит до первой ноты и когда телефон «отвлекается»**.
- **Главная потеря времени на старте:** модель распознавания рук (около 19 МБ) начинает скачиваться только ПОСЛЕ нажатия «Начать», и всё идёт по очереди: звук → модель → камера → лес. Если запускать это параллельно и заранее, ожидание после нажатия сократится в разы. Это самая выгодная правка.
- **Лес на телефоне рисуется очень мелко** (около 234 точек в ширину, потом растягивается на весь экран) и выглядит «кубиками». Правило разрешения писалось под ноутбук. Нужна проверка на Poco.
- **«Подробная» картинка дорогая не из-за теней и не из-за деталей,** а из-за высокого разрешения, 60 кадров в секунду и сглаживания. Я измерил ночью: те же детали при «стандартной» подаче стоят 15 % скорости рук вместо 55 %. «Подробную» можно сделать примерно втрое дешевле.
- **Три вещи, которые почти наверняка сломаются у тестеров:** (1) на iPhone звук не вернётся после звонка или блокировки экрана; (2) экран начнёт гаснуть, если человек свернул и вернул страницу; (3) ссылка, открытая внутри Telegram, может не получить камеру, а сообщение об ошибке советует не то.
- Кнопка «Начать» видна раньше, чем готова: на медленной сети человек нажимает, и ничего не происходит.
- Night грузит почти весь код большого Handsong (редактор, запись), хотя не пользуется им. Это известный долг; дешёвая часть (не грузить «рендер») делается за один заход.
- Больше половины «бюджета файлов» (12,6 из 22,5 МБ) занимает пол леса, который по умолчанию не используется. После вашего выбора пола (шаг 148) лишний набор удаляется.
- Чего я не знаю без настоящего телефона: скорость и нагрев на Poco, поведение iPhone, нужен ли отдельный поток для распознавания рук.
- В конце файла: пять правок, с которых я бы начал. Каждая помещается в один заход.

---

## 0. What I looked at, and how

- Tree reviewed (`node tools/tree-hash.mjs core apps/full apps/night`): core `9311771e25bd2c02` · apps/full `d6b90cf2cb4be6da` · apps/night `b8d503d559f27547`. These equal the hashes after NIGHT-8c. Nothing in the repository was changed; the only new files are in `docs/review/`.
- Read: the docs named in the prompt; the start path (`core/legacy-ui/boot.js`, `core/vision.js`, `core/handdet.js`, `core/hand-worker.js`), `apps/night/main.js`, `shell.js` (start flow, tick), `scene/host.js`, the forest's record, `forest.js` (build, files), `forest-paint.js`, both Night worklets, `core/scaleload.js`, `tools/build.mjs`, `tools/forest-budget.eval.js`, parts of `tools/probe-browser.mjs` and `tools/check-licences.mjs`.
- Measured tonight (outputs outside the repo, in the session's scratch folder; the runner's console log is in the git-ignored `tools/.probe-logs/2026-11-11T21-12-21-.log`):
  - the module graph and sizes of each app (a read-only script);
  - one browser session, `node tools/probe-browser.mjs --app night --eval <my script> --no-ui --cdn-cache`: the method of `tools/forest-budget.eval.js` with different steps, to split the Detailed picture's cost into its parts. No suite was run.
- Looked at the latest existing screenshots (`tools/.ui-snap/n8c-after-std`, `n8c-after-det`, `n7c`).
- **Not covered in depth, said plainly:** Full's editor, recorder, freeze and render internals (about 1.2 MB of code). I read their entry points and the module graph, not their logic. They sit behind 93 probe rows; a review at that depth is its own run. Everything about phones below is reasoning from the code, not measurement: no phone was available.

## 1. The numbers behind the findings

### 1.1 What a visitor downloads (Night)

| When | What | Size |
|---|---|---|
| Before Begin works | 132 JavaScript modules, discovered in 5 waves (1 → 13 → 40 → 64 → 12 → 2) | 3,011 KB raw, about 1,081 KB gzip, about 912 KB brotli |
| Before Begin works | scale data: 106 JSON files, each fetched with `cache:'no-cache'` (`core/scaleload.js:54`), awaited at the top of `core/scales.js:43` | 415 KB on disk |
| Before Begin works | page 78 KB (it carries Full's whole markup), three style sheets, fonts (Andika 2 × about 297 KB, Literata 32 KB) | about 0.8 MB |
| While the start card shows (prefetch) | the forest's code (25 modules, 247 KB), three.js r128 (603 KB), Standard's textures (2.3 MB), the stream recording (0.68 MB) | about 3.8 MB |
| **Only after the Begin tap** | MediaPipe: library 137 KB, loader 322 KB, WebAssembly 11.15 MB, hand model 7.82 MB (sizes of the runner's cached copies; the WebAssembly compresses on the wire, the model hardly) | about 19.4 MB raw |
| After the start | `core/render.js` and its queue (auto-freeze), loaded by `boot.js:147` in every app | 271 KB raw |
| Detailed instead of Standard | textures | 7.2 MB instead of 2.3 MB |

Night uses 3 of the 74 modes and 4 timbres. Full's graph is 101 modules, 2,830 KB raw.

### 1.2 What the Detailed picture's cost is made of (HD 4000, measured tonight)

Method: `tools/forest-budget.eval.js` (fake camera, no hand in it, so the hand model searches at about 6.6 detections a second; each forest step between two Dark steps; 10 s per step). Window 1280 × 800, one device pixel per CSS pixel. The percentage is the loss of hand detections against Dark.

| Step | Detections vs Dark | Scene, frames a second | Draws / triangles |
|---|---|---|---|
| Standard (0.6 scale, 30 fps cap, no antialiasing) | −2 % | 21.5 | 62 / 199 k |
| Standard without the paint pass | −2 % | 21.1 | 62 / 199 k |
| Standard at scale 0.85 | **−24 %** | 16.3 | 63 / 199 k |
| **Detailed's content at Standard's raster** (30 fps cap, 0.6, no antialiasing, no shadow) | **−15 %** | 18.1 | 87 / 414 k |
| Detailed, no shadow, scale 0.6 (still antialiased, 60 fps cap) | −38 % | 20.5 | 87 / 414 k |
| Detailed, no shadow, no water mirror | −44 % | 15.9 | 81 / 333 k |
| Detailed, no shadow | −49.5 % | 15.1 | 87 / 414 k |
| Detailed, no shadow, no paint pass | −53 % (noise: not cheaper) | 13.3 | 88 / 414 k |
| **Detailed as shipped** | **−55 %** | 13.1 | 111 / 751 k |

Reading it:
- The laptop's GPU is saturated at Detailed: the scene reaches 13 frames a second under a cap of 60. A «60 fps cap» on this GPU means «take all the GPU there is», and the hand model gets what is left (its detection time rises from 43 ms to 65–88 ms).
- **The raster settings cost more than the content.** Detailed's whole content (2 × the triangles, 4 × the texture memory aside) at Standard's raster costs 15 %. The rest of the 55 % is: antialiasing with the 60 fps cap (about 23 points), the higher resolution (about 11 points), the light's shadow (about 5 points), the mirror redrawn every frame (about 5 points).
- The paint pass is free at these sizes. Keep it.
- One run, one machine: each number can move by a few points. The order of the parts is clear.

### 1.3 The first opening (same session, fresh browser profile)

Standard, cold: **7.2 s**, longest frame gap 1.5 s. Detailed right after it: 11.1 s, gap 2.3 s. Later openings in the same session: 1.4–2.0 s. Compile times of the nine programs over 60 ms at Standard: wood 1,280 ms · bark 1,122 ms · one unnamed shader material 1,005 ms · ground 448 ms · stream rocks 434 ms · three plant programs 243 + 208 + 183 ms · one more 93 ms. The three largest are 3.4 s, almost half of the opening. Chrome keeps compiled programs on disk, so only the very first visit pays this: exactly the first-contact moment.

### 1.4 Hand detection runs on the main thread

`core/vision.js:24`: `VISION_DEF.path` is `'main'`. This is a measured decision (LAT2b: in a worker the model ran about twice slower on this GPU), with «phone numbers decide» still open in `docs/core/BACKLOG.md`. Its effect on the laptop: every detection blocks the page for 40–90 ms, so even at Standard the scene reaches 21.5 of its 30 frames a second. Not a defect; the largest open unknown for phones.

---

## 2. Performance, ranked by gain per effort

Each item: what, why, gain, risk, effort, how the probes protect it. «Core» means a CORE-n run with both apps' checks (core rule 6); the option is absent in Full, so `FULL untouched` must hold.

### P1. Start the slow things before and beside the tap, not after it (Night and Full; core + night)

**What.** Today `startApp` (`boot.js:125–154`) runs strictly in a row: audio → hand model (19 MB download, two model builds, two warm-ups of 1.3–1.6 s) → camera prompt → profile → and only then Night opens the forest (7 s cold) with detection paused. Change the order, as opt-in boot options:
1. `initDetector` may start **before** the tap (at page load, or on the first pointer move over the page). Rule #1 concerns only the AudioContext; the model needs no gesture. On a metered connection (`navigator.connection.saveData`) wait for the tap.
2. In the tap, the camera request and the detector run **together** (`Promise.all`): the permission prompt appears at once, while the model is still loading.
3. Night begins the forest's opening **in the Begin tap** (three.js, build, sliced compile), not when the face applies. It then overlaps the model's download and the camera prompt.

**Why.** The probes already showed starts past 10 s with a slow CDN. Quality bar point 6 asks for a first note within about 10 s.

**Gain.** A returning visitor (files cached): the wait after the tap falls from about 5–6 s plus the forest's 2 s to about the camera's own start, 1–2 s. A first visitor on 20 Mbit/s: the 19 MB arrive while the person reads the start card (5–10 s of reading are free time today). The cold 7 s of shader compile hide behind the camera prompt and the cards.

**Risk.** A visitor who never taps still downloads 19 MB (mitigated by the first-pointer-move trigger and Save-Data). The model's warm-up and the forest's compile now compete for the GPU at the same moment: the sum of work is the same, but check the longest frame gap of the start card. The main-thread warm-up freezes the page twice for about 1.5 s; before the tap this lands on the start card, so keep the «two tasks with a yield» that exists.

**Effort.** Small to medium: one CORE run (two boot options, default absent) and a small NIGHT part.

**Probes.** A new runner row «start timeline» on a fresh profile: time from the Begin tap to the first processed camera frame and to the forest's first frame, with the options on and (CONTROL) off; the order of events asserted exactly (audio context created inside the tap; camera requested before the model is ready). Existing rows that must stay green: «NIGHT first frames», «NIGHT music and full screen», «NIGHT full screen, camera undecided», the CSP and network rows, `FULL untouched`.

### P2. A loading state for Begin, and a way out when loading fails (both apps)

**What.** `#nightBegin` and `#startBtn` are live in the markup, but their handlers arrive only when the whole graph and the 106 data files have loaded (`shell.js:175`, `boot.js:161`). Give the button a «loading» look from the markup (a class on `<body>` removed by `main.js`), and after about 12 s without it a line «Still loading. Check the connection, or reload.» There is no `error` or `unhandledrejection` listener anywhere: a module that fails to load leaves a dead page with no words.

**Gain.** Removes the worst first impression on a slow network: a button that does nothing. **Risk.** None to the engine. **Effort.** Small (page + CSS + 10 lines), per app. **Probes.** A runner check with one module request held back for 3 s: the button reads as loading and a tap does nothing visible; released: it works. CONTROL: without the class the check fails.

### P3. A cheaper Detailed: the same content at a gentler raster (Night)

**What.** In `scene/host.js` `LV.full`: 30 fps cap instead of 60, no MSAA (`antialias:false`, with the soft cut-out edges Standard already uses), scale about 0.7–0.75; the water's mirror every second frame. Keep the content, the textures and the grain.

**Why.** Table 1.2: the content costs 15 %, the raster 40 %. This also answers RUN 9's open question 1 («make high cheaper?»): yes, and this is how.

**Gain.** On the HD 4000: from about −55 % of hand speed to about −15…−25 %. Detailed becomes usable on the weak laptop, and its look (grass, herbs, litter, crowns, dew) is what people notice, far more than 60 fps in a forest that moves slowly. The hand's own light on the 2D canvas still moves at the display rate.

**Risk.** Edges a little softer; motion at 30 fps. Needs the founder's eye on a side-by-side (`tools/ui-snap.mjs --level full`). The shadow may stay (about 5 points) or go.

**Effort.** Small: a level record's numbers and one material switch. **Probes.** «NIGHT forest picture», «FOREST paint», «FOREST ground and water» as they are; the budget eval's Detailed step becomes the yardstick (a bound such as «Detailed keeps at least 70 % of Dark's detections on this laptop» as a measured value, not a gate, because it is a real-time number).

### P4. A pixel budget instead of a CSS-pixel scale (Night; needs the Poco)

**What.** `host.js:82` renders at `min(devicePixelRatio, 1) × scale` CSS pixels. On the laptop (1366 wide) Standard is 820 × 461. On a 390-CSS-pixel phone it is **234 × 506**, stretched over 1,080 physical pixels: the blocky look in `tools/.ui-snap/n7c/night-forest.png`. Replace the scale with a target number of pixels per level (for example Standard about 0.40 megapixel, Detailed about 0.75), from which the ratio is derived for any screen: the laptop stays where it is, a phone in portrait gets about 430 × 930.

**Gain.** The largest single improvement to the phone picture. **Risk.** More GPU work on phones than today; the phone's GPU is not the HD 4000, but nobody has measured it. This is the first thing to measure on the Poco (ⓘ → Measure this device, at both values). **Effort.** Small. **Probes.** A data row for the law (screen size → buffer size, the laptop's size pinned to today's numbers as the CONTROL that nothing moved there).

### P5. Do not load what Night never uses (core, small parts first)

1. **`render.js` after the start** (`boot.js:147`): 271 KB and the auto-freeze watcher, in a profile that records nothing. Gate it with the `keepsSongs()` test that already gates autosave on the next line. Night's probes import the render module themselves. Small CORE run.
2. **Scale data in one file.** A generated `core/data/scales.bundle.json` beside the timbre bundle (the same pattern: `tools/timbre-bundle.mjs`, a data row that fails on a stale bundle), read first, the 106 files staying the truth and the fallback. 106 requests become 1. Small to medium CORE run; the F0 snapshot (`P.checkFiles`) proves the registry is value-for-value the same.
3. **`modulepreload` links written by `tools/build.mjs`** for the static closure (the build already walks it). The 5 discovery waves become 1. No app code changes; only built pages. Small.
4. Later, the real fix on `core/DEBT.md`: Night without the recorder, the editor views and Full's markup (about two thirds of its 3 MB). A large CORE run; not now.

**Gain.** Items 1–3 together: about 110 fewer requests and 4–5 fewer round-trip waves before Begin works; on a slow mobile link 1–3 s. **Risk.** Low; item 2 touches the tuning data's loading, so `--all` on Full. **Probes.** The runner's network row counts requests: record the count before and after as a measured value.

### P6. Texture memory (Night)

1. **One upload instead of two:** `forest.js:139` makes two `Texture` objects from `litter-arm` (roughness and occlusion): 5.6 MB wasted at Detailed, 1.4 MB at Standard. Use one object. Tiny.
2. **Detailed's scanned floor at 1024, not 2048.** The floor repeats every 2.2 m: 2048 px is 930 texels a metre, while the screen (1,088 px wide at Detailed) cannot show more than about 350 pixels a metre at 3 m. Two 2048² maps cost 44.8 MB of the 101.6 MB. Expected: no visible change, −33 MB, −2.3 MB of download. Check with the close view `f-close-foot`.
3. **Delete the floor that loses** at step 148: the baked set is 12.6 MB of files, the scan 4.1 MB. With the scan kept the files fall from 22.5 to about 9.9 MB of 30.
4. Later: GPU-compressed textures. Already measured in the KTX2 lab (4 × less GPU memory); blocked by the transcoder's `eval` against our CSP. It needs our own build of the Apache-2.0 transcoder without dynamic code. Medium effort; worth it only if the Poco shows memory trouble after 1–3.

**Probes.** «NIGHT forest files (app)» (current, under the budget), `texBytes` in the budget eval; a new exact check: no image is uploaded twice (count distinct images against textures).

### P7. The cold shader compile itself (Night)

After P1 hides most of it, reduce it: the wood and bark programs (1.1–1.3 s each) are `MeshStandardMaterial` with four point lights, patched with moss, lichen and foxfire. At roughness 0.95 at night nobody sees the physically based highlight. Try `MeshPhongMaterial` (or a Lambert-like patch) for bark and wood and read `COMPILE_LOG`: if the two programs fall by a third or more, keep it. Also name the «function(){}» material (1.0 s) so the log says what it is. **Gain:** perhaps 1–2 s of the 7; unsure until tried. **Risk:** the look of lit bark near the hand light. **Effort:** small experiment, medium if it stays. I would not upgrade three.js for its asynchronous compile now: every shader patch depends on r128's chunk text.

### P8. Audio under load on phones (core option, Night uses it)

- `core/audio.js:1305` asks for `latencyHint:'interactive'`. On weak Android phones this gives the smallest buffer and the least slack. Offer the hint as a profile option; Night could ask for `'balanced'`. Night's music is slow; 10–20 ms more output latency is hard to hear next to the camera's 60–120 ms, and it is the cheapest protection against crackle. Needs the Poco's ears and `?probe&headroom`.
- Dropout telemetry exists only where Chrome has `AudioContext.playbackStats` (the budget eval reads it). Use it at run time: after N underruns in a minute, offer the Lighter mode (an offer, per the founder's rule of no silent switch).
- The backlog's «dropouts right after the forest opens» should fade with P1 (the compile no longer lands on the first notes).
- The worklets themselves are in good shape: half-rate synthesis, no allocation in `process`, sleep states, seeded. No finding there.

### P9. The hand model's files on our own origin (C9, already planned; I would move it earlier)

Vendoring the MediaPipe files (Apache-2.0, already in the register) removes two outside hosts, lets the CSP shrink to `'self'` (privacy rule #33 gets stronger, not weaker), lets a service worker precache everything with a versioned list, and makes the second visit start with no network at all. It also removes the risk that a tester's network reaches our site but not Google's storage or jsDelivr. Cost: about 19 MB more per first visit from our host. Vercel Hobby includes about 100 GB a month and forbids commercial use ([Vercel fair use](https://vercel.com/docs/limits/fair-use-policy)); at about 25 MB per first visit that is roughly 4,000 first visits a month. Enough for testers; for a public release choose the host with this number in mind.

### P10. Smaller wins

- Fonts: Andika is 2 × 297 KB, loaded before first paint of text. A Latin + Cyrillic subset would be about 60–80 KB each. Caution on the licence: Andika declares Reserved Font Names («Andika», «SIL», see `apps/night/fonts/andika/OFL.txt`), and a subset is a modified version, which may not keep the reserved name ([OFL, reserved names](https://openfontlicense.org/ofl-reserved-font-names/)). So a subset must be renamed inside the file and in the register, or the full file stays. The founder's decision; I am not certain of SIL's own exceptions for web subsets.
- Build the one-hand model (L1) lazily after the start: one warm-up less before the first note (about 1.5 s on the laptop). Core option; the schedule needs a fallback until L1 is ready.
- `<html lang="ru">` on both pages while the first language is English, and `i18n.js` never sets `document.documentElement.lang`: wrong hyphenation and voice, possible «translate this page?» offers. Set it from the chosen language.

---

## 3. Weak spots

### 3.1 Likely to break on a tester's device

| # | What | Where | Apps | Fix size |
|---|---|---|---|---|
| W1 | **iPhone: sound never comes back after an interruption.** Safari moves the AudioContext to «interrupted» or «suspended» on a call, the lock screen, Siri, a tab switch. Nothing listens to `statechange`, nothing calls `resume()` after the start. Reports conflict on whether iOS resumes by itself ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/state), [WebKit 273511](https://bugs.webkit.org/show_bug.cgi?id=273511)), so: resume on `visibilitychange` and on the next tap, and if the context is still not running show «Tap to continue». | `boot.js` (only `AC.resume()` at start) | both | small |
| W2 | **The screen dims after one trip away.** The wake lock is asked once (`boot.js:138`); browsers drop it when the page is hidden and it is never asked again. In a hands-free app the screen then sleeps mid-session. | `boot.js` | both | tiny |
| W3 | **A camera that stops is not noticed.** No `ended` or `mute` listener on the video track: unplugging, another app taking the camera, or the phone suspending it leaves a live page with no hands and no message. Reopen once, then say so. | `vision.js` | both | small |
| W4 | **Links opened inside a messenger.** In-app browsers often refuse the camera without a prompt, and full screen too. The refusal message then tells the person to press the lock icon «at the left of the address bar», which is not there, and to «press Start again» while Night's button says Begin. Detect the refusal that comes back at once and show «Open this page in Chrome or Safari» with a copy-link button; give phones their own wording. Likely for the very first testers, since links travel by messenger. I could not test Telegram's browser itself. | `i18n.js` `cam.denied`, `boot.js startFail` | both | small |
| W5 | The dead Begin button and the silent load failure (P2). | pages | both | small |
| W6 | **A lost WebGL context is final for the session:** the host sets the level to minimal and shows the 2D stand-in (`host.js:69`). Phones lose contexts when a page sits in the background. Try one reopen when the page is visible again. | `scene/host.js` | night | small |
| W7 | **Detailed is offered on phones.** The low-memory guard reads `navigator.deviceMemory`, which iPhones do not report, so an iPhone may open 100 MB of textures beside two hand-model contexts. Hide Detailed on small touch screens until measured. | `host.js:42`, shell | night | tiny |
| W8 | **The first-run calibration can meet a blind camera.** The offer appears in the same tick in which the forest starts opening (`shell.js:156`), and detection is paused for the whole opening (up to 8 s cold). A person who taps «Set up» at once shows a hand that nothing sees. P1 item 3 removes it; otherwise hold the offer until the opening ends. Reasoned from the code, not seen happening. | `shell.js`, `host.js` | night | tiny |
| W9 | The model download has no progress, no timeout and no retry on the default path (`handdet.js:28`): on a slow link the start card pulses for a minute with one unchanging line. Show the model's percent (a streamed fetch) and offer «Try again». | `handdet.js`, `vision.js` | both | small |
| W10 | Every visit revalidates about 240 files (modules without long caching, data with `no-cache`). Fine on a desk, slow on a weak mobile link. C9's precache is the real answer. | hosting | both | with C9 |

Storage is handled well everywhere I looked (every read and write guarded, memory fallbacks, namespaced names). Camera start errors are handled well (kinds, one retry, tracks released).

### 3.2 Fragile places

- **The forest's seeded draws depend on their order.** `forest.js` takes its random numbers from one stream for ground, bark, trunks, ferns and more; comments such as «each still takes its one draw … so everything drawn after keeps its look» show the cost. The next run (the old spruce forest) will insert and remove things. Give each subsystem its own seeded stream first (`seeded(FOREST_SEED ^ tag)`), accepting one declared change of the layout, so later edits stay local. The room kit (Part 3) needs the same.
- **Shader patches are string edits of three.js r128's chunks.** Safe while r128 is vendored and pinned; the row «NIGHT forest picture» catches a patch that stops compiling. Any three.js upgrade is a project, not a version bump. Record that in the forest's notes.
- **Very long lines.** Many lines are 400–900 characters with several statements and trailing comment chains. One recorded defect came straight from this (a comment that swallowed a closing brace, NIGHT-6 slice 9). I am not proposing a reformat. I do propose a soft limit of about 160 characters for new room code, where most of the next months' edits will land.
- **One 53 KB build function** (`buildForest`) closes over everything; its parts talk through a shared bag of uniforms. It works; it is the main obstacle to a second room (Part 3).
- **Real-time numbers in decisions.** The budget method is honest about noise, but one run can still mislead by 5 points (tonight's «no paint pass» step read worse than with it). Decisions such as P3 should rest on two runs.

### 3.3 Dead or duplicated code

| What | Size | Note |
|---|---|---|
| The floor set that is not the default (baked: `tex/ground-*`, `groundn-*`) | 12.6 MB of files | delete the loser after step 148 |
| Music bed v1 (`bed.js`, `pure/bed.js`, `sound/bed.js`) | 26 KB | kept as the fallback without AudioWorklet; every target browser has AudioWorklet, and the engine's own worklets need it too. Delete after the A/B decision (already in the backlog). |
| Full's face inside Night (markup, `ui.js`, `roll.js`, `strip.js`, the recorder stack) | about 2 MB raw | on `core/DEBT.md`; P5 item 4 |
| `apps/night/migrate.js` | 0.8 KB | already scheduled for deletion |
| Two reverbs for one job (the convolution «Night forest» in Full, the delay-network «Forest depth» in Night) | n/a | by design today; when the Rust core comes, one algorithmic room should serve both |
| Stream synthesis beside the recording | 9 KB | keep: a cheap, working fallback. Its Lighter mode keeps the farthest three voices though its comment says nearest (noted in NIGHT-8b, still open). |
| The start-card error texts name Full's button | n/a | W4 |

Duplication between the apps is low: Night reuses the engine through profiles and options, which is the right shape. The cost of that reuse is the download (P5).

### 3.4 The tools

The runners are the project's strongest asset: fresh profile, CSP and network checks, controls that must fail. Two additions would protect this review's main recommendations:
- **A throttled mode** for `tools/probe-browser.mjs` (Chrome's own protocol can slow the network and the processor): start-time rows measured as a mid phone on a slow link would see them. Without it, start-time work is judged on a fast laptop with a warm cache.
- **Byte and request budgets as data rows:** the size of each app's static closure and the request count before Begin, so growth is seen when it happens.

---

## 4. The five fixes I would do first

Each fits one run under the rules. Order by value for a tester's first five minutes.

1. **Lifecycle on phones (CORE):** resume the sound after an interruption with a «Tap to continue» fallback (W1), ask the wake lock again when the page returns (W2), notice a stopped camera and reopen it once (W3), one WebGL reopen (W6, Night part). All opt-in or pure additions; rows with simulated state changes and controls.
2. **The start, in parallel (CORE + NIGHT):** P1 items 2 and 3 first (camera beside the model; the forest's opening from the Begin tap), then item 1 (the model before the tap). With the «start timeline» row.
3. **Begin is honest (NIGHT, FULL pages):** the loading state and the failure line (P2), the in-app-browser message and phone wording (W4), the model's percent (W9), `lang` from the chosen language.
4. **Detailed made cheap, and the phone's resolution law (NIGHT):** P3 with a side-by-side for the founder's eye; P4 behind a measuring switch until the Poco's numbers exist; hide Detailed on small touch screens (W7); the duplicate texture and the 1024 scan (P6 items 1–2).
5. **Less to load (CORE):** no `render.js` in a profile that records nothing; the scale bundle; `modulepreload` in the build (P5 items 1–3).

After these: C9 (own-origin model files and the precache), then the Poco round, which decides the worker question, the pixel budget and the latency hint.

## 5. Where I am unsure

- Everything about phones' speed, heat, memory and the worker path. The code cannot tell; the Poco and one iPhone can.
- Whether iOS today resumes an interrupted AudioContext by itself. Reports differ by version; the fix is harmless either way.
- How Telegram's in-app browser treats the camera on each platform. The fix (a clear «open in your browser» message) is right whatever the answer.
- How much the bark and wood compile shrinks with a cheaper material (P7). One experiment answers it.
- The compressed size of MediaPipe's WebAssembly on the wire (I have the raw size only).
