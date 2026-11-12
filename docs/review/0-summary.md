# REVIEW-1 · Summary and plan

## Коротко для основателя (по-русски)

- Обзор готов: пять файлов в `docs/review/`. Код не менялся, git не запускался. Проверенное состояние: core `9311771e25bd2c02`, apps/full `d6b90cf2cb4be6da`, apps/night `b8d503d559f27547` (как после NIGHT-8c).
- **Главный вывод:** Night от «вау» отделяют не детали леса, а первые две минуты и поведение на телефоне. Человек ждёт, читает шесть экранов, и только потом играет. На телефоне картинка в «кубиках». На iPhone звук может не вернуться после блокировки экрана.
- **Что делать в ближайший месяц, по порядку:** (1) надёжность на телефонах; (2) честная кнопка «Начать» и понятные сообщения; (3) параллельный запуск, чтобы ожидание после нажатия сократилось в разы; (4) «сначала игра, потом объяснения»; (5) дешёвая «Подробная» картинка и резкая картинка на телефоне; затем (6) ваш круг на Poco и одном iPhone и первые 3–5 тестеров; (7) выбор направления картинки и палитры, цветовая система; (8) меньше загружать и работа без сети; (9) следующий заход по лесу, перенацеленный на силуэты; (10) набор для комнат.
- Для первых пяти пунктов ниже лежат готовые запросы для Claude Code.
- **Что перестать делать:** добавлять детали леса до первых тестеров; объяснять до игры; оценивать картинку только на ноутбуке.
- **Где я спорю с принятым:** (а) курс «лес ближе к реальному»: советую «нарисованную ночь», где главное свет и силуэты; (б) ярко-салатовая кнопка и салатовый как фирменный цвет: советую тёплый «свет фонаря»; (в) двенадцать версий на одного основателя: советую Night → Install → Controller → Jam (кнопка «Слушать») → Education без аккаунтов, остальное отложить.
- **Что измерено этой ночью:** из чего состоит цена «Подробной» картинки (главное: разрешение, 60 кадров и сглаживание, а не детали); размер загрузки (3 МБ кода до нажатия, 19 МБ модели рук после).
- **Чего я не мог узнать:** как всё это звучит, как движется, и как работает на настоящих телефонах. Эти места в файлах помечены.
- Решения, которые ждут вас, собраны в конце этого файла (восемь коротких вопросов).

---

## The files

| File | What it holds |
|---|---|
| `1-audit.md` | The code: measured numbers, performance ranked by gain per effort, weak spots, the five first fixes |
| `2-wow-gap.md` | The first contact step by step, the picture, the interface, sound, the feel of the hands, three palettes, the top 15, what to stop |
| `3-room-kit.md` | What is generic in the forest, how to split it safely, the picture-room type, the cost of a second room, which room |
| `4-strategy.md` | Every version evaluated with sources, the ranking, a 12–18 month sequence, the core now and not yet, Jam and Education in depth |
| `0-summary.md` | This file: the ten actions and five ready prompts |

Left outside the repository's tracked files: tonight's captures in the git-ignored `tools/.ui-snap/review-std/`, `review-det/`, `review-ui/`; the runner's log `tools/.probe-logs/2026-11-11T21-12-21-.log`. Run: one `--eval` session on the Night page and three `ui-snap` captures. No suite was run, so there are no verdict lines to quote.

## The ten most important actions for the next month, in order

The order follows one idea: the first testers come next, so first remove what would spoil a stranger's first five minutes on their own device, then let strangers in, then spend on beauty with what they said.

| # | Action | Who | Why here |
|---|---|---|---|
| 1 | **Survive a phone's interruptions:** sound resumes (or asks for a tap), the screen stays awake after a trip away, a stopped camera is noticed, one WebGL reopen. | Claude Code, CORE-17 with a Night part | These fail silently, on the testers' devices and not on ours. An iPhone tester who locks the screen once may never hear Night again that session. Small, opt-in, well covered by rows. (Part 1: W1, W2, W3, W6) |
| 2 | **An honest Begin:** a loading state, a line when loading fails, the right words when a messenger's browser refuses the camera, the model's percent in plain words, the page's language attribute, one message at a time at rest. | Claude Code, NIGHT-11 with a small CORE-18 | A button that does nothing and an error that points at an address bar that is not there are the two worst first impressions, and links travel by messenger. (Part 1: P2, W4, W9; Part 2: section 1) |
| 3 | **The start in parallel:** the camera prompt beside the model's loading, the forest's opening from the Begin tap, the model's download before the tap. | Claude Code, CORE-19 with NIGHT-12 | The largest cut in waiting for the least risk: nothing is made faster, things only stop queuing. Also removes the blind calibration and most of the dropouts at opening. (Part 1: P1, W8) |
| 4 | **Play first, teach inside:** a first note 15–20 s after Begin; one line at a time, in context; calibration after the first minute; the cards kept in Settings; a real reveal of the forest. | Claude Code, NIGHT-13 | The biggest gain in delight per effort in the whole review. It should be in place before strangers judge the product. (Part 2: sections 1 and 7) |
| 5 | **A cheaper Detailed and a phone-sharp picture, behind measurement:** Detailed at a gentler raster; the pixel-budget law ready to switch on; Detailed hidden on small touch screens; two texture savings. | Claude Code, NIGHT-14 | Measured tonight: Detailed's content costs 15 % of hand speed, its raster 40 %. And the phone picture is 234 pixels wide. The phone half waits for the Poco's numbers by design. (Part 1: P3, P4, P6, W7) |
| 6 | **The phone round and the first testers.** The Poco and one iPhone with the build after actions 1–5: «Measure this device» at both resolution laws, the worker switch for detection, `?probe&headroom`. Then 3–5 people, alone with the link, three questions (below). | The founder | Everything after this point should be chosen by what happened here. I suggest closing the old queue first: steps 120–124 are overtaken by later work; steps 145–150 shrink to the five checks that still matter on a phone. |
| 7 | **Decide the picture's direction and the palette; then the colour run** (already decided), with a neutral body font and the rest state tidied. | The founder with the strategist (half an hour with the captures), then Claude Code | A decision, cheap to make and expensive to leave open: every forest run since NIGHT-6 has pulled between «real» and «painted». (Part 2: sections 2, 3, 6) |
| 8 | **Less to load, then offline:** no render module in a profile that records nothing, scale data in one generated file, preload hints in the build; then C9 (the hand model on our own origin, the precache) and the choice of a host that permits selling. | Claude Code, CORE runs; the founder for the host | Helps every later visit and every version (a kiosk and a classroom need offline). The host matters before the first sale: the present free plan forbids commerce. (Part 1: P5, P9; Part 4: section 4) |
| 9 | **The forest's next run, re-aimed:** first the frame print and a seeded stream per subsystem (safety for all later forest work), then the spruce forest as silhouette and light: shapes against mist, moon shafts, a soft bloom, a quiet floor. | Claude Code, NIGHT runs | The decided spruce work fits the «painted night» if it is aimed at shape. The two safety steps make it, and the kit, cheap to change. (Part 2: section 2; Part 3: step 0 and 1) |
| 10 | **Start the room kit; freeze the rest.** Move the generic parts (film, mirror, motes, sky, hand light) with bit-for-bit proof. Hold: new forest detail, more editor depth, new versions. Begin the Install conversation with one venue in Tbilisi. | Claude Code; the founder | The kit turns a second room from 3–10 runs into 1–2. The venue conversation costs nothing and tells whether the best income per effort is real. (Part 3; Part 4: 2.6) |

### Three questions for the first testers
Asked after ten minutes alone with the link, on their own device, with no explanation beforehand:
1. What did you try first, and what happened?
2. Was there a moment you would show to someone else? When?
3. What made you stop?

And one thing to note without asking: how long from the link to the first note, and whether they found the second hand.

## Ready-to-paste prompts for the first five actions

Run numbers assume the next free ones (CORE-17, CORE-18, CORE-19; NIGHT-11 to NIGHT-14) and manual steps from 151 on; adjust if a number is taken. Each prompt names its commit-message file as recent runs do.

---

### Prompt 1: CORE-17 (+ a Night part)

```
CORE-17 (+ a Night part): the app survives a phone's interruptions.

Rules: CLAUDE.md standing rules and «Two apps, one core» (core rules 4, 5, 6, 9). Everything new in core is opt-in and absent in Full: FULL untouched must hold. Never run git. Rule #1 stands: no AudioContext is created outside the start click (resuming the existing one is not creating one). Stay inside the slice; report defects outside it.

Background (docs/review/1-audit.md, W1, W2, W3, W6): after the start nothing resumes the AudioContext (boot.js calls AC.resume() once); the wake lock is asked once (boot.js) and never again after the page was hidden; no listener notices a camera track that ended; a lost WebGL context leaves the room on its 2D stand-in for the rest of the session (apps/night/scene/host.js onLost).

Do:
1. A pure law core/pure/lifecycle.js: from events (page hidden / visible, audio state changed, a tap, camera track ended or muted, the wake lock released) to actions (resume audio, ask the wake lock, reopen the camera once, tell the app). Runs in node.
2. boot({ lifecycle:{ … } }) in core/legacy-ui/boot.js, absent = exactly today's behaviour:
   - audio: on the context's statechange and when the page becomes visible, if it is not running call resume(); if it is still not running 500 ms later call the app's hook with «blocked»; the next pointer or key press resumes and calls the hook with «running».
   - wake lock: ask again when the page becomes visible and when the lock reports its release.
   - camera: when the video track ends, reopen once through the existing serialised open (vision.js); if that fails call the app's hook with the error's kind. A mute longer than 3 s only tells the app.
3. Night turns it on (apps/night/main.js) and shows: a quiet «Tap to continue» veil while the sound is blocked; the existing start card's message and «Try again» when the camera could not be reopened. Texts in apps/night/texts.js, English and Russian.
4. Night's scene host: after a context loss, one reopen at the stored level when the page is visible again or the context is restored; a second loss in the session keeps today's behaviour (the stand-in).
5. New browser API names go into the static checker's GLOBALS. NAME-INDEX regenerated. One line for the new module in docs/core/MODULE-MAP.md.

Rows:
- data «lifecycle law (core)»: every transition, with CONTROLS (an event that must not act; the law with one rule removed must fail).
- runner «NIGHT lifecycle»: suspend the context and fire the visibility event → running again; CONTROL the option off → it stays suspended. Stop the fake camera's track → reopened once, hands return; CONTROL without the reopen. The wake lock through a probe stand-in (asked again after hidden → visible). A forced context loss → the room is back; a second one → the stand-in.
- FULL untouched, NIGHT untouched, the network and CSP rows as they are.

Checks: node tools/check-static.mjs; node --check on changed files; node tools/probe-data.mjs; node tools/probe-browser.mjs --quick; node tools/probe-browser.mjs --app night --cdn-cache; tree hashes before and after (node tools/tree-hash.mjs core apps/full apps/night). No print renewed, no tolerance widened.

Docs: records in docs/core/HANDOFF.md and docs/night/HANDOFF.md (at most 15 lines each), entries in both WORK-LOGs with the hashes, a new step 151 (index line in docs/core/STEPS.md, full text in archive/CLAUDE-history.md), at most five manual checks: iPhone: lock the screen for 10 s during play, then unlock; iPhone: take a call or start Siri; Poco: switch to another app and back, then leave the phone alone for two minutes (the screen must stay on); laptop: unplug a USB webcam during play; any phone: leave the tab in the background for five minutes and return.

Report in the usual format. Commit message in commitmsg-core17.txt, title: «CORE-17: the app survives a phone's interruptions (sound, screen, camera, picture)».
```

---

### Prompt 2: NIGHT-11 (+ CORE-18)

```
NIGHT-11 (+ CORE-18): an honest Begin.

Rules: CLAUDE.md standing rules and «Two apps, one core». Core parts are opt-in doors, absent in Full. Privacy rule #33: no new host, the CSP line unchanged and identical on both pages; no inline script. Never touch Full's texts. Never run git. A page changes: run node tools/smoke-paths.mjs --build.

Background (docs/review/1-audit.md P2, W4, W9; docs/review/2-wow-gap.md section 1): #nightBegin is live in the markup but gets its handler only after 132 modules and 106 data files have loaded (apps/night/shell.js); nothing reports a module that failed to load; the camera-refused text tells people to click the lock «at the left of the address bar» and to press «Start»; the model's download shows one unchanging technical line; <html lang="ru"> stays whatever the language; at rest the idle line and the effects hint can overlap (tools/.ui-snap/review-std/f-still.png).

Do:
1. Loading state: <body class="night-boot night-loading"> in apps/night/index.html; apps/night/main.js removes night-loading as its last statement. While it is there Begin looks unready and does not take a tap. A small classic script file (no inline code; listed in the static check's network guard only if it needs to be) adds a class after 12 s («Still loading. Check the connection.») and, on a failed script or module load, shows «Could not load. Reload the page.» with a Reload button. English in the markup, both languages once the texts are in.
2. CORE-18: boot({ failText }) — an app's function (kind, error, ms since the request) → a text or null; absent = today's messages. Night's law apps/night/pure/startmsg.js chooses: «Open this page in Chrome or Safari» with a Copy link button when the camera is refused at once inside an in-app browser or when the browser offers no camera at all; a phone's wording for a refusal on a touch device; otherwise core's text with Night's button name. Texts in apps/night/texts.js (en, ru).
3. CORE-18: core/handdet.js reports the model's download as a fraction when a progress function is given (a streamed read; absent = the single read of today). Night shows «Getting ready… 40 %» in plain words, no «model».
4. Night sets document.documentElement.lang from the chosen language at load and on change.
5. At rest only one message shows: the idle line gives way to a hint card while one is up. Extend the capture tool's overlap check to the idle line.

Rows:
- data «NIGHT start messages (app)»: the law on made-up cases (desktop refusal, phone refusal, in-app browser, no camera API), CONTROLS.
- runner «NIGHT loading state»: one module request held for 3 s → Begin reads as loading and a tap starts nothing; released → Begin works; a failed module request → the failure line shows. CONTROL: without the class the check fails.
- runner «NIGHT start messages»: a stand-in camera that refuses at once with an in-app user agent → the open-in-browser text and the copy button; the model's line carries a number that grows.
- «NIGHT texts both languages (app)» covers the new keys; ui-snap --night: no overlap including the idle line (CONTROL: today's page fails it).
- FULL untouched.

Checks: static; node --check; probe-data; probe-browser --quick; probe-browser --app night --cdn-cache; smoke-paths --build; tree hashes before and after.

Docs: records (HANDOFFs, WORK-LOGs with hashes), step 152 with at most five manual checks: open the test link inside Telegram on the Poco and on an iPhone and press Begin; on a throttled connection (the phone's slowest mobile setting) watch Begin before it is ready; refuse the camera once on a phone and read the message; watch the percent on a first visit; switch the language and check hyphenation looks right in Russian.

Report in the usual format, with the old and new wording of every changed text. Commit message in commitmsg-11.txt, title: «NIGHT-11 (+ CORE-18): an honest Begin — loading state, clear refusals, the model's percent».
```

---

### Prompt 3: CORE-19 (+ NIGHT-12)

```
CORE-19 (+ NIGHT-12): the start in parallel.

Rules: CLAUDE.md standing rules and «Two apps, one core» (core rules 4–6). Rule #1: the AudioContext is created only inside the start click — nothing in this run may create or resume one earlier; the row must prove it. The 0b staging stands: a failed camera leaves the card usable, a second press never builds a second context or reloads the model. Options absent = today's order exactly (FULL untouched). Never run git.

Background (docs/review/1-audit.md 1.1, 1.3, P1, W8): startApp (core/legacy-ui/boot.js) runs in a row: audio → hand model (about 19 MB of downloads, two builds, two warm-ups) → camera → profile; only then Night opens the forest (7.2 s cold on the laptop), with detection paused, and the calibration offer appears in the same tick.

Do:
1. boot option parallelCamera: after the audio is up, the camera request and the detector start together; the start completes when both have; a camera failure shows the staged message at once while the detector goes on loading for the retry.
2. boot option earlyDetector: the detector's loading (download, builds, warm-ups) may begin before the click — on the first pointer movement or touch on the page, or 1.5 s after load — unless navigator.connection.saveData is true. The click awaits the same promise. The start card's loading lines appear only after the click.
3. Night: the forest's opening (three.js, the room's files and code, build, sliced compile) begins in the Begin tap through a host door that opens the room veiled without showing it; when the face asks for the room it adopts the opened one (no second build, the same dark-moment and two-frame rules). The detection pause of an opening must end before the calibration offer shows: hold the offer until the opening has ended or passed OPEN_LATE_MS.
4. Night's entry turns both options on. Full's passes nothing.

Rows:
- runner «start timeline» (fresh profile, --cdn-cache): the times of the tap, the context's creation, the camera request, the detector ready, the first processed frame, the forest's first frame. Asserted exactly: the context is created inside the tap and not before; the camera is requested before the detector is ready; the forest's opening begins in the tap; no camera frame is taken during an opening; the offer never shows during an opening. The durations go out as measured values (meas), not gates. CONTROL: the options off → today's order (the row must then read «camera after the detector»).
- the longest frame gap on the start card while the warm-ups run, as a measured value, before and after.
- «NIGHT first frames», «NIGHT music and full screen», «NIGHT full screen, camera undecided», «NIGHT calibration screens», the camera rows (0b), the network and CSP rows, FULL untouched: unchanged and green.

Checks: static; node --check; probe-data; probe-browser --quick; probe-browser --app night --cdn-cache; once more without --cdn-cache to see the real download in the timeline; tree hashes before and after. No real-time row is added (the row asserts order; times are only recorded).

Docs: records and logs with hashes; the backlog's items «The cold first opening» and «Audio dropouts right after the forest opens» updated with what was measured; step 153, at most five manual checks: a fresh browser profile on the laptop, time from Begin to the first note with a stopwatch, before and after; the same on the Poco over mobile data; Begin with the camera refused, then «Try again»; listen for crackle in the first ten seconds after the forest appears; the calibration offer appears only once the forest is visible.

Report in the usual format with the timeline table (before, after). Commit message in commitmsg-core19.txt, title: «CORE-19 (+ NIGHT-12): the start in parallel — camera beside the model, the forest from the Begin tap».
```

---

### Prompt 4: NIGHT-13

```
NIGHT-13: play first, teach inside.

Rules: CLAUDE.md standing rules; docs/night/QUALITY.md (points 4, 5, 6, 8, 9, 10 are touched: name how). Night only: no core change; if one turns out to be needed, stop that part and report (core rule 5). Texts in English and Russian in apps/night/texts.js. Respect prefers-reduced-motion. Never run git.

Background (docs/review/2-wow-gap.md sections 1 and 7): from the link to the first note a person who reads everything needs about two minutes: the calibration offer, the calibration, four cards, then a hint card that repeats card 3. The quality bar asks for about ten seconds.

Do:
1. A pure law apps/night/pure/firstrun.js: from what has happened (the room is visible, a hand is seen, the first note, seconds of playing, the hand moved nearer or farther, a second hand seen, the first effect move) to the one line that shows now, each line once, never a line whose action cannot be done at that moment. Kept per device by its own key and version, as the cards are.
2. The first minute: after Begin no card. When the room is visible: «Raise a hand». Hand seen: «Touch your thumb to your first finger». First note: the line goes; the room's own answer is the reward. After about 30 s of playing: the other fingers and higher / lower. After about a minute: nearer and farther. When a second hand first appears: the effects line (today's hint card's text, shortened). Lines are one sentence, fade in and out, sit where the hands are not.
3. The cards no longer open by themselves; Settings → How to play keeps them. The iPhone home-screen card becomes one line after the first minute.
4. The calibration offer moves: a small line with «Set up» after the first minute of playing, or earlier only when the hand calibration's own numbers say the range is off. Never before the first note. Settings keeps it as today.
5. The reveal: the start card fades; the room comes out of the dark from the far mist forward over 2–3 s (a room door such as reveal(k) driving fog and exposure; the forest implements it), in time with the music's rise. With reduced motion: a plain fade.
6. The first note of a first run is answered unmistakably (today's ring and gathering fireflies, checked that they are visible from any hand position; a little stronger for the very first note if needed).

Rows:
- data «NIGHT first run (app)»: the law — order, each line once, no line without its possible action, the calibration line never before the first note; CONTROLS (the old order must fail; a line shown twice must fail).
- runner «NIGHT first minute»: a fresh profile, Begin, then the probe's posed hands (core/gestures/pose.js) on the probe clock: the lines appear in order, the first note sounds without any card having been shown, the cards stay closed, the calibration line comes after a minute. CONTROL: a stored «seen» state shows no line.
- «NIGHT first cards» and «NIGHT stale saved values» adjusted to the new rule (the cards open only from Settings), their controls kept.
- «NIGHT texts both languages (app)»; ui-snap --night and --forest: the lines at phone and laptop size, no overlap with the bars or the capsule.

Checks: static; node --check; probe-data; probe-browser --quick; probe-browser --app night --cdn-cache; smoke-paths if the page changed; tree hashes before and after.

Docs: records and log with hashes; step 154 with at most five manual checks: a fresh profile on the laptop — time from Begin to your first note; give the Poco to someone who has never seen it and watch without speaking; the reveal by eye (too slow, too fast?); the calibration line's moment; the second-hand line appears only when the second hand does.

Report in the usual format, with every new text in both languages. Commit message in commitmsg-13.txt, title: «NIGHT-13: play first, teach inside — a first note in seconds, one line at a time».
```

---

### Prompt 5: NIGHT-14

```
NIGHT-14: a cheaper Detailed, the phone's resolution law, less texture memory.

Rules: CLAUDE.md standing rules. Night only, no core change. No default changes on phones in this run: the new resolution law ships behind a measuring switch until the Poco's numbers exist. Baselines: nothing renewed except night prints that this run declares, each other case compared first (core rule 9). Never run git. Real-time numbers are recorded, never gates; run the budget twice.

Background (docs/review/1-audit.md 1.2, P3, P4, P6, W7; measured on the HD 4000): Detailed costs −55 % of hand detections; its whole content at Standard's raster costs −15 %. The remaining cost is antialiasing with the 60 fps cap (about 23 points), the higher resolution (about 11), the light's shadow (about 5), the mirror every frame (about 5). On a 390-pixel-wide phone Standard renders 234 pixels wide (apps/night/scene/host.js resize: min(devicePixelRatio, 1) × scale). forest.js makes two textures from one image (litter-arm as roughness and occlusion). Detailed's scanned floor is 2048 px for a 2.2 m tile.

Do:
1. Detailed's raster (host.js LV.full and the forest's record): 30 fps cap, no MSAA with the soft cut-out edges Standard uses, scale 0.72, the water's mirror every second frame. The shadow stays for now. Produce a side-by-side for the founder: old against new Detailed, wide and close views, laptop and phone size (tools/.ui-snap/n14-compare.html).
2. A pure law apps/night/pure/raster.js: (CSS width, CSS height, device pixel ratio, level) → the render ratio, from a pixel budget per level (Standard about 0.38 megapixel, Detailed about 0.75), never below the level's present scale and never above the device's ratio. So a 1366 × 768 laptop gets exactly today's ratio and a phone gets more pixels. Wired in host.js behind a switch: default off; on by ?px=budget and by a line in «Measure this device», which then measures both laws one after the other and prints both.
3. Detailed is not offered on small touch screens (a coarse pointer and a short side under 500 CSS pixels) or where deviceMemory says 2 GB or less; a stored Detailed opens as Standard there.
4. One texture object for the scan's roughness and occlusion. Detailed uses the 1024 scanned floor (colour and normal). Close views f-close-foot and f-close-bank before and after; if the eye can tell, keep the 2048 colour map and say so. No file is deleted (the floor choice is step 148's).
5. tools/ui-snap.mjs: the phone captures at device pixel ratio 3 as well as 2 (a flag), so phone sharpness is judged as a mid phone shows it.

Rows:
- data «NIGHT raster law (app)»: the law on a table of screens; the laptop sizes pinned to today's ratios; CONTROLS (a law that lowers the laptop's ratio must fail; one that exceeds the device's ratio must fail).
- runner: «NIGHT forest picture», «FOREST paint», «FOREST ground and water», «NIGHT low power» green; a new exact check in the forest's row: no image is uploaded as two textures (CONTROL: today's code fails it).
- the budget (tools/forest-budget.eval.js, with a Detailed step as before this run through the measurement door) twice: detections against Dark, frame time, draws, triangles, programs, texture megabytes, before and after.

Checks: static; node --check; probe-data; probe-browser --quick; probe-browser --app night --cdn-cache; tree hashes before and after.

Docs: records and log with hashes and the budget table; RUN 9's question 1 in docs/night/HANDOFF.md answered with the numbers; step 155 with at most five manual checks: the side-by-side — is the new Detailed good enough to be «Detailed»?; the shadow on or off by eye; on the Poco «Measure this device» with both laws and send the text; on the Poco the picture with ?px=budget beside the default; on an iPhone the same look.

Report in the usual format. Commit message in commitmsg-14.txt, title: «NIGHT-14: a cheaper Detailed, the phone's resolution law behind a switch, less texture memory».
```

---

## Decisions waiting for the founder

1. **The picture's direction:** «painted night» (my recommendation) or «closer to real»? It aims the spruce run. (Part 2, section 2)
2. **The palette:** A · Lantern, B · Moonstone or C · Firefly, tamed. (Part 2, section 6)
3. **The body font:** replace Andika with a neutral sans with Cyrillic? (Part 2, section 3)
4. **Detailed:** after NIGHT-14's side-by-side, is the cheaper one good enough? Shadow on or off?
5. **The floor** (step 148): the loser's files leave the repository: 12.6 MB or 4.1 MB.
6. **The host** for a public Night and for anything sold. (Part 1, P9; Part 4, section 4)
7. **The versions:** agree or argue with the ranking and with what is postponed and dropped. (Part 4, section 3)
8. **The second room:** the hall by candlelight as a picture room (my recommendation), or the lake as planned. And whether a room may have its own acoustic. (Part 3, section 5)

## What this review could not do

- Hear anything. Every remark on sound is a question for the founder's ears.
- See motion or touch a phone. The phone findings come from code and from captures at phone size on the laptop.
- Review Full's editor, recorder and render internals at depth. A separate run, when Full's release approaches.
- Verify prices, laws and payment availability beyond the cited pages; several sources disagree, and the legal ones are summaries.
