# REVIEW-1 · Part 2: how far Night is from «amazing on first contact»

## Коротко для основателя (по-русски)

- Night уже добрый, аккуратный и честный продукт. До уровня «вау с первой секунды» ему не хватает не деталей леса, а **первых двух минут**: человек ждёт, потом читает шесть экранов текста и только потом играет первую ноту.
- **Главное предложение: сначала игра, потом объяснения.** После «Начать» лес проявляется из темноты, одна строка «Поднимите руку», появляется огонёк, «Коснитесь большим пальцем указательного», звучит нота, лес отвечает. Всё остальное по одной подсказке, позже. Карточки остаются в «Как играть».
- **Картинка на телефоне выглядит дёшево из-за крупных «кубиков»** (низкое разрешение). Это видно раньше любого мха и лишайника.
- **В картинке спорят три стиля:** плоские тёмные стволы, фотографический пол и сказочные светящиеся грибы. Я советую выбрать один: «нарисованная ночь», где главный герой свет (луна, туман слоями, ореолы), а не фактуры. Здесь я спорю с курсом «ближе к реальному»: реализм на слабом ноутбуке мы не выиграем, а цельная стилизация выглядит дороже и стоит дешевле.
- **Цвет интерфейса:** ярко-салатовый читается как «технологии и игры» и ночью слепит. Поддерживаю ваш план (нейтральная ночная основа, один фирменный цвет, оттенок комнаты) и предлагаю три палитры. Моя рекомендация: тёплый «свет фонаря» как фирменный цвет, салатовый оставить светлячкам леса.
- **Шрифт Andika** делает интерфейс «школьным». Заголовочный Literata хорош. Основной шрифт стоит заменить на нейтральный с кириллицей.
- **Ощущение рук:** точки пальцев двигаются рывками (с частотой распознавания), а свет в лесу отстаёт. Если сглаживать и чуть предсказывать движение света (не ноты!), игра будет казаться мгновенной.
- **Звук я не слышал** и сужу только по рецептам и измерениям в коде. Мои замечания о звуке это вопросы к вашим ушам, а не выводы.
- Настройки перегружены: около 14 элементов в одной прокрутке.
- В конце: 15 улучшений по убыванию «вау на единицу труда» и список того, что стоит перестать делать (главное: перестать добавлять детали леса до первых тестеров).

---

A note on words: the sleep-and-meditation market leader, whose name the prompt lists first among the apps to compare with, is called «the meditation leader» below. Its name is our product's old name, and the data row «OLD NAME gone» scans `docs/` for that word.

What this part rests on: the code of the first-run flow, fresh captures made tonight (`tools/.ui-snap/review-std/`, phone size 390 × 844 and laptop size; Standard) and the latest stored ones (`n8c-after-det`, `n7c`). I could not hear anything and no hand was in front of a camera. Motion and sound are judged from code and numbers; where that matters I say so.

## 1. The first contact, step by step

| Moment | What happens now | Verdict |
|---|---|---|
| **The link opens** | A dark page, one card: the five-dot emblem, «hand·song night», two tips (light your hands; stand the device), a lime Begin, the privacy line, a language box, «Privacy». | Clean and honest. But the page is **black**: nothing shows what waits behind the button. The promise (a forest of light you play with your hands) is not on the screen. The language box and the «Privacy» triangle are the browser's own controls and look unfinished next to the rest. Begin may not answer yet (Part 1, P2). |
| **Begin** | Music starts within about a second (good, NIGHT-7c). The card stays and shows a pulsing line: loading the model, warming up, starting the camera. The browser asks for the camera. | The music at once is the best decision in the flow. The wait is the worst part: 10 s and more with technical words («hand-tracking model») on a first visit. |
| **Camera prompt** | The browser's own dialog. | The privacy line under Begin prepares it well. One more sentence would help: «The camera only sees your hands. Nothing is recorded.» |
| **After the camera** | The card goes; the screen is dark while the forest builds (up to 7 s the first time); at once a card asks «Set up your hand?» (Skip / Set up). | A question before the person has seen or played anything. They cannot know whether they need it. And for the first seconds the camera does not see hands at all (Part 1, W8). |
| **Calibration** | About 10 s: show the hand. | Fine as a screen. Wrong as the first thing. |
| **Four cards** (five on iPhone) | Play · Near and far · Your other hand · Music. Good line drawings, Skip / Next. | Each card is well made. Together they are 60–90 s of reading about things the person has not touched. Card 1 alone holds three ideas (touch, each finger, raise and lower, hold). |
| **The first minute of playing** | Forest, «Raise a hand to play», the control capsule, and the effects hint card again (the same text as card 3). | Three texts at once when no hand is up; in the phone capture the idle line and the hint card **overlap** (`review-std/f-still.png`; the overlap check does not include the idle line). The first note itself is answered well: a ring, pulsing mushrooms, fireflies that gather. |
| **Ten minutes later** | The night moves (24 min), clouds, rare moments every 2.5–5 min, foxfire, night flowers, dew, the sleep timer. | Real depth, well thought out. The risk is musical, not visual: four notes under the fingers of one hand position, three five-note moods, no memory of what was played. |
| **The next day** | The same start card, one tap, settings kept, no cards. | Right and respectful. Nothing greets the person who came back: the night starts the same way. |

Counting from the link to the first note for someone who reads everything: about 10 s of loading + the offer + 10–15 s of calibration + 60–90 s of cards. **About two minutes.** The quality bar (point 6) says about 10 s. The gap is not in the engine; it is in the order of things.

### What I would do instead: play first, teach inside
1. Begin: the card dissolves, the emblem's glowing dot stays for a second and then drifts into the picture as the first firefly, while the forest comes out of the dark from the far mist forward over 2–3 s and the music rises. No text.
2. One line: «Raise a hand». The light appears on the hand. The line fades.
3. One line: «Touch your thumb to your first finger». The note, the ring, the fireflies. The line fades. This is 15–20 s after the tap, and the person has played.
4. After about 30 s of playing: «Try the other fingers. Raise your hand for higher notes.» After a minute: «Move your hand away from the camera: the sound opens.» When the second hand first appears: the effects hint. Each once, each only when the thing it names can be done.
5. The calibration is offered after the first minute, or when the measured hand sizes show it is needed, as a small line («Make the hand follow more closely? 10 seconds»), never before the first note.
6. The cards stay under Settings → How to play.

The machinery exists (`showStep` in `core/pure/nightui.js`, the hint card, the cards' key). This is mostly re-ordering.

## 2. The picture

### What works
- The composition at laptop size: an aisle between trunks, a stream towards the viewer, the moon in a gap, glow low on the ground. As a small picture it reads at once as «a forest at night» (even the 234-pixel phone frame does, when seen small).
- Light that answers: rings, the hand's light on the ground, fireflies that gather. This is the product's heart and it is there.
- The slow life: clouds over the moon, mist, the night's cycle.

### What breaks the illusion, in the order people will notice
1. **On a phone: the pixels.** The forest is rendered 234 pixels wide at Standard and 331 at Detailed, then stretched (Part 1, P4; captures `review-std/f-moon.png`, `review-det/f-notes.png`). Stair-stepped trunks, grass and ferns say «cheap» before anything else is seen. This outweighs every detail added since NIGHT-6.
2. **The trunks are poles.** Straight, parallel, the same dark value, hard vertical edges, no branches in view (the crowns are above the frame). In the wide view they read as a barcode in fog. The decided spruce work (dead lower branches, twigs, lichen beards, young trees) aims at exactly this. I would spend that run on **silhouette** (the shapes against the mist) before surface.
3. **The floor does not belong to the picture.** The photo-scanned litter is the brightest, busiest, warmest area on screen (bottom right in every capture). At night the ground should be the quietest thing. It is a photograph under flat-shaded trunks and glowing fantasy mushrooms.
4. **The stones** are smooth eggs with a computer-made look; the close view shows it (`n8c-after-det/f-close-foot-room.png`).
5. **The water** hardly reads as water in the wide view: a dark blue patch. Its good parts (sparkles, mirror) need a grazing view the camera does not have.
6. **The moon** is a small disc half behind a trunk. The largest light of a night scene gives almost no light shape: no shafts through the mist that one notices at first sight.

### Is the art direction coherent?
Not yet. Three directions are in the frame at once:
- **stylised and dark:** silhouettes, fog, the painted pass on the distance (which the fog mostly hides: slice 8 itself measured 94 % fog beyond 28 m);
- **photographic:** the scanned floor, and the recent runs' aim («closer to real»: real ground, real water, per-trunk bark);
- **fairy tale:** teal glowing mushrooms everywhere, lime fireflies, foxfire veins.

My view, and here I argue with the current course: **choose the painted night and drop the race for realism.** Reasons:
- Realism punishes every weak part. The closer the floor gets to a photograph, the more the pole trunks and egg stones stand out. Stylised worlds forgive, and they are what the admired references do: Alto's Odyssey is flat shapes and gradients, Monument Valley is geometry and colour, Journey is light on sand. None of them is photographic; all of them are remembered as beautiful.
- The budget: a weak integrated GPU that must also run the hand model, one prepared-files budget of 30 MB, and no artist. Stylisation is cheaper per unit of beauty.
- A second room comes later. A painted style can be carried to a lake, a monastery, an aurora with the same passes (Part 3). A photographic forest sets a bar every next room must also reach.

What «painted night» means in practice:
- **Light is the hero.** Moon shafts through layered mist, a soft bloom around every light, the hand's light clearly lighting what is near it, reflections on the water. The eye goes to light in a dark picture; spend there.
- **Depth by layers of value,** not by texture: near trunks darkest, each farther band lighter and bluer, mist between bands, a slight parallax when the light moves.
- **A quiet floor:** dark, low contrast, a few readable shapes (a root, a fern, a stone, moss cushions) lit only near the lights. The scanned floor can stay as a file source if it is graded far down and blurred into the palette, but our own baked floor with a night grade is closer to this style.
- **Fewer, better glowing things.** Mushrooms that glow only near the light or with the music read as magic; twenty that glow all the time read as decoration.

The spruce and pine forest that is already decided fits this well if it is done as shapes: drooping boughs, dead lower branches as dark lines against lit mist, lichen beards catching the hand's light.

## 3. The interface

**Typography.** Literata Light for titles is a good choice: quiet, bookish, with Cyrillic. Andika for everything else is the weak point: it was drawn for early readers, with schoolbook letter shapes, and it gives the whole interface a classroom tone. It also costs 2 × 297 KB. A neutral humanist sans with Cyrillic under OFL (candidates to check against rule #32 before use: Golos Text, Onest, Manrope, Inter) would lift the tone at once. Sizes and line heights are sensible. Too many sizes meet in the settings card (title, section caps, labels, values, long sentences in toggles).

**Colour.** See section 6. In short: lime is on the Begin button, the active halves of every switch, slider fills, links, the word «night», bar fills and icons. A colour that is everywhere stops meaning anything, and this one is the brightest thing on a night screen.

**Spacing and layout.** The cards are well spaced. The control capsule is heavy: on a phone it takes the lower third, in landscape a large card floats over the right of the picture; with one room its 3 + 3 grid has an empty place and looks lopsided (2 over 3). «Notes: follow the hand» needs a second read. In landscape the idle line sits off-centre, across the moon.

**Motion.** Fades of 300 ms, the scene's 500 / 800 ms, a glint on a tapped button. Nothing is wrong and nothing is memorable. The one transition that matters, from the start card into the forest, is a cut to dark and a fade. Apple-level products choreograph exactly that moment.

**Settings: crowded?** Yes. One scroll holds about 14 controls in three groups plus the camera, the brand block, privacy and «How to play»: hand setup, play with, hand travel, effects sensitivity, reset, hands on screen, music volume, room sounds, music answers, on screen (room / dark / camera), picture (standard / detailed), full note field, lightweight mode. Several are worded as explanations («Lightweight mode: for older computers and phones (a lighter echo, simpler music, fewer ringing notes, a simpler picture)», «Detailed: for strong devices», which wraps inside its button). Proposal: three short tabs (Sound · Picture · Hands), one line per control, the explanation under it in small dim text, the rarely used ones (hands on screen, full note field, reset) behind «More». The picture level should choose itself at the first run with an offer to change, so most people never meet the word «Detailed».

**Icons.** Own-drawn and consistent in weight. A few do not explain themselves (the sign beside «Show the full note field» and «Music answers my notes»; Notes; Depth). Acceptable with labels; the labels are there.

**The cards.** The best-made part of the interface. Their problem is when they appear, not how they look.

**Against the references.**
- *Endel:* one screen, one living shape, almost no text, monochrome. Night shows more controls at rest than Endel shows in total.
- *Portal:* the scene fills the screen, the interface appears on a tap and leaves. Night already hides its controls while hands are up, which is right; at rest it shows everything.
- *The meditation leader:* its strength is the catalogue and the voice, not the interface; nothing to copy except the warmth of its first screen (a living landscape behind the first button).
- *Alto's Odyssey, Monument Valley, Journey:* no menus before play; the first input is the tutorial; one art direction held without exception.
- *Apple's own polish:* restraint (one accent, small), materials that are consistent, motion with weight, and above all nothing asked of the person that the device could decide itself.

## 4. The sound (not heard: questions for the founder's ears)

What the code and its measurements say:
- The discipline is high: levels measured against each other (nature about 12 dB under the instruments, the stream 4–5 dB under wind and crickets, the bed within ±4 dB of nature), a limiter at −1 dBFS, seeded generators, fades with time constants, strike caps.
- The bed (version 2) is a good recipe for this kind of music: a ground tone, slow pads, loops of unequal length (17, 23, 29, 31 s) that never line up the same way twice, rare glass notes, a room of 5–7 s.
- The nature layer: a drone, slow wind, three crickets, one granulated stream recording.
- Playing: four sounds (Firefly, Breath flute, Handpan, Singing bowl), three five-note moods, echo / tone / wave on the other hand, the room's depth from the hand's distance.

Questions I would put to the ear:
1. **Is «Still» too still for a first minute?** Its record: two loops of 29–37 s, a pad tone every 30–48 s. A new person may hear almost only the ground tone and the wind until the first pad arrives. Either the first pad should swell within the first 3 s after Begin, or «Drift» should be the first-visit default.
2. **Does the forest have events for the ear as it has for the eye?** The picture has rare moments; the nature sound is steady. A far owl once in several minutes, a soft rustle with the wind's gusts, and a faint chime with the falling star would give the ear the same «did you hear that?».
3. **Does the music notice the player?** «Music answers my notes» is off by default. If it is gentle, I would turn it on: a first-timer who feels the music lean towards what they played has met the product's idea.
4. **Does a played phrase leave a trace?** Today a note sounds and is gone. See improvement 8 below (the forest remembers).

## 5. The feel of playing with the hands

- **Latency.** Measured earlier on the desktop: hand to sound about 125 ms by day and about 205 ms in the evening, when the webcam fell to 6 frames a second. For slow music this is acceptable; for the feeling of touch it is the limit.
- **The night paradox.** The product is for the evening and the dark, and the camera needs light on the hands. The start card says so, which is honest. The backlog's lantern (a glow on the screen that lights the hands) is more than a nicety here: a soft «moonlight frame» round the picture, offered when the camera's frame rate falls, both fits the look and attacks the real problem. A laptop screen at arm's length lights hands usefully; a phone's hardly does.
- **The lights move in steps and trail.** The five fingertip lights are drawn at the last detected positions with no smoothing (`core/legacy-ui/views/play.js drawNightTips`), so they move at the detection rate: 10–20 steps a second on the weak laptop. The forest's light eases towards the hand with a time constant of about 77 ms (`forest.js`, `1-Math.exp(-dt*13)`) and is drawn at 21–30 frames a second, so it trails the hand by roughly a tenth of a second on top of the camera's delay. The quality bar's point 2 asks for the light to follow at the display rate.
- **What would make it feel magical:** predict the *light*, never the note. Between detections, move the lights along the hand's measured velocity (a filter such as One Euro, plus a lead of one camera frame), every display frame. The rule «the dots must match the hand exactly» was made for the camera picture; in a room there is no hand on screen to mismatch. Sound stays exactly where detection puts it. Add a **pre-glow**: as thumb and finger close, the fingertip light brightens continuously, so the note arrives as the end of something the eye already followed. Anticipation hides latency better than any millisecond saved.
- **Fiddly parts.** Pinches with the ring and little fingers are hard for many hands and hard for the tracker (the fingertips hide each other). The first instruction should name the first finger only. Whether misfires are common needs real hands; the testers' first question could be exactly this.

## 6. The interface colours

I agree with the plan (a neutral night base, one brand colour, a light tint from the room) and with moving away from forest green everywhere. On the Begin button: a full-width lime slab is the loudest object the product ever shows, on the one screen meant to lower the pulse. Lime of this kind (#c8f56a) is also the colour of energy drinks, fitness and gaming gear. For fireflies inside the forest it is right. As the brand it argues with the product's promise.

Rules that hold for all three palettes below:
- Base and surfaces are neutral (hardly any hue), so any room's tint sits on them without clashing.
- The brand colour appears small: the emblem's glowing dot, the primary button, the live state of one thing at a time. Switches and sliders are neutral (light ink when on).
- The room tint is the room's own light colour at low strength: bar fills, the glass's faint tint, the hand's light. In the forest that tint is today's lime.
- Text contrast at least 4.5 : 1 on its surface.

| | **A · Lantern (my recommendation)** | **B · Moonstone** | **C · Firefly, tamed** |
|---|---|---|---|
| Idea | A warm light in a cold night: the oldest picture of safety there is. Warm sits against every night room (forest, lake, aurora, stone). | Almost colourless, cool and precise; the rooms bring all the colour. Closest to Apple's own restraint. | Keeps today's identity, but lime only as a spark. The smallest change. |
| Base | `#0A0C10` | `#0B0C0E` | `#090B0F` |
| Surface (cards) | `#14171D` | `#15171A` | `#12151B` |
| Hairline | white at 10 % | white at 9 % | white at 10 % |
| Ink | `#EEF0F3` | `#F2F3F5` | `#E9EDF2` |
| Dim ink | `#9BA3AF` | `#9A9FA8` | `#939CAB` |
| Brand | `#F4C98A` (lantern amber) | `#DCE6F5` (moon white, a breath of blue) | `#C8F56A` (today's lime) |
| Ink on brand | `#1A1206` | `#0B0C0E` | `#0B1205` |
| Begin button | amber, solid, dark text | moon white, solid, dark text | dark glass with a lime rim and the lime dot; never a solid lime slab |
| Forest tint | `#B6E777` (firefly green, softer than today) | the same | `#C8F56A` |
| A lake's tint (example) | `#8FC7F2` | the same | the same |
| Risk | Amber can turn «cosy café» if overused: keep it small. | Can feel cold and anonymous; the emblem's dot loses its spark unless it keeps a colour. | Lime remains the brand, so the forest «owns» the product and the next rooms look like guests. |

Why A: the brand becomes independent of the forest, as the plan intends; the emblem's glowing dot turns into a small lamp, which is also the product's story (your hand carries a light); and the forest's lime becomes special again because it lives only inside the forest. The existing token `--night-warm:#ffb45a` shows the warm note is already in the family.

## 7. The top 15 improvements, by «wow» per unit of effort

Effort: S = part of one run, M = one run, L = several. Each is protected the same way as its neighbours in the code: a data row for a law, a runner row for a flow, a capture pair for the eye; I name the specific check.

| # | Improvement | Wow | Effort | Risk | Probe or proof |
|---|---|---|---|---|---|
| 1 | **Play first, teach inside** (section 1): first note 15–20 s after Begin; one-line hints in context; calibration after the first minute; cards kept in Settings. | very high | M | hints that fire at the wrong time; needs real first-timers | runner row: fresh profile → the order of events (no card before the first note; each hint once; CONTROL the old order) |
| 2 | **The start on phones and slow links** (Part 1: P1, P2). | very high | M | Part 1 | «start timeline» row |
| 3 | **Sharp picture on phones** (Part 1: P4, a pixel budget). | very high on phones | S | phone GPU cost unknown | data row for the law; the Poco's «Measure this device» |
| 4 | **The reveal:** the emblem's dot becomes the first firefly; the forest comes out of the dark far-to-near in 2–3 s with the music's rise. | high | S–M | must not slow the start: it plays over the opening's last second | capture series at fixed times; the opening's row (two frames before the veil lifts) kept |
| 5 | **Lights that lead:** display-rate smoothing and a short prediction for the fingertip lights and the forest light; pre-glow as the pinch closes. Sound untouched. | high | M | overshoot on sudden stops: bound the lead to one camera frame | data row for the filter (step response, overshoot bound, exact rest); runner row that the note times are bit-for-bit unchanged (CONTROL: prediction fed into gestures must fail) |
| 6 | **A living start screen:** a prepared dim still of the forest (our own render, one small file) behind the card, with a few drifting lights. | high | S | file budget: about 100 KB | smoke and first-frames rows; the files row |
| 7 | **The colour system** (decided) with palette A, B or C, and a quieter Begin. | medium–high | M | touches many tokens: do it through tokens only | the ui-snap style compare shows exactly which computed colours changed and nothing else |
| 8 | **The forest remembers:** a played phrase comes back once or twice, softer and farther, 8–16 s later, then is gone (the idea made famous by generative apps where touches loop and fade). A Night-only driver over the engine contract; a setting; perhaps on by default in one music mode. | high (musical) | M | clutter if the player plays a lot: thin it by density | data row for the law (which notes return, when, how soft; seeded); an offline render row for level (returns always under the live note) |
| 9 | **One art direction: the painted night** (section 2): quiet floor, value layers with mist between, the spruce work as silhouette. | high | L (it is the next forest run, re-aimed) | taste: needs the founder's choice between two captures | ui-snap pairs at phone and laptop size; cost by the budget eval |
| 10 | **Bloom and moon shafts:** a half-size blur of the glow layer added in the existing paint pass; two or three soft shafts from the moon's gap. | medium–high | S–M | cost on the HD 4000: the paint pass measured free at Standard, so there is room | «FOREST paint» row (pass-through exactness kept), budget eval |
| 11 | **Settings in three short tabs,** plain words, auto-chosen picture level with an offer. | medium | M | none to the engine | «NIGHT texts both languages», ui-snap overlap check, the stale-values row |
| 12 | **A neutral body font** with Cyrillic, subset. | medium | S | licence and reserved names (rule #32); glyph coverage for both languages | LIC1 row; a data row that every character of both dictionaries exists in the subset |
| 13 | **A clean rest state:** one message at a time (fix the idle-line and hint overlap), a smaller capsule, the idle line centred. | medium | S | none | extend the overlap check to the idle line (CONTROL: today's page must fail it) |
| 14 | **The moonlight frame** for dim rooms: offered when the camera's frame rate falls, remembered. (Needs the core door the backlog names.) | medium, and it lowers latency where it matters | M | glare; make it soft and optional | the low-light rows; a runner row for the offer |
| 15 | **Tonight is not last night:** the date seeds the night's starting hour, the first mood offered and one early rare moment for a newcomer. | medium | S | none | data row for the law (same date → same night; CONTROL a fixed seed) |

Also worth doing but lower: sound events for the ear (owl, rustle, chime with the star); «Music answers my notes» on by default after an ear check; stones and water after the art direction is chosen.

## 8. What to stop doing

1. **Stop adding forest detail before testers have played.** NIGHT-8, 8c and 9 went into bark mapping, lichen laws, litter counts and a scanned floor. First-timers will not see any of it; they will see pixels, a wait and cards. Detail work resumes after the first five people, aimed by what they said.
2. **Stop explaining before playing.** No new text screens in the first minute. Every new hint must name something the person can do at that moment.
3. **Stop judging the picture at laptop size only.** Every picture change gets a phone capture at the phone's real pixel ratio (the capture tool uses 2; mid phones are 2.6–3) beside the wide one.
4. **Stop growing the settings card.** A new setting replaces an old one, or the device decides.
5. **Stop putting the forest's colour on the product.** Rooms tint; the brand stays.
6. **Stop tuning on one laptop.** The Poco and one iPhone decide the next performance work; a second run of numbers on the HD 4000 will not.
7. **Stop mixing realism and stylisation run by run.** Decide once (section 2), write it at the top of the forest plan, and refuse work that pulls the other way.

## 9. Where I am unsure

- Everything about sound quality and the music's first minute: unheard.
- How the transitions really feel: I saw stills.
- Whether real first-timers stumble on the pinch or on the reading. The proposed flow removes the reading; the three tester questions should include «what did you try first, and did it work?».
- The painted-night recommendation is a judgement of taste backed by cost. The founder's eye may prefer realism; then the consequence is a larger files and GPU budget and a higher bar for every next room, and that should be chosen knowingly.
