# REVIEW-1 · Part 4: the family of versions

## Коротко для основателя (по-русски)

- Идей для версий двенадцать, а основатель один. Код сейчас пишется быстрее, чем вы успеваете его проверить ушами, глазами и на телефоне: в очереди около двенадцати непройденных шагов (120–150). **Узкое место не программирование, а ваше внимание, тестеры и продажи.** Поэтому главный совет этой части: меньше версий, больше людей.
- **Порядок по пользе на единицу труда:** (1) Night довести и выпустить; (2) **Install**, режим для музеев и мероприятий на основе Night: мало покупателей, высокая цена, продукт почти готов; (3) **Controller**, руки управляют Ableton по MIDI: мало работы, платящая ниша; (4) **Jam, первый шаг**: кнопка «Слушать», которая определяет тональность музыки в комнате; (5) **Education без аккаунтов**: курс на одном устройстве учителя; (6) большой Handsong выпустить как есть, не углубляя редактор.
- **Отложить:** Jam с аккордами и темпом, Education с аккаунтами и школьными серверами, Care, Kids, Access как отдельные продукты (но доступность закладывать в основу уже сейчас).
- **Не делать сейчас:** Performance как отдельный продукт (задержка веб-камеры около 0,1 с не годится для ритмичной сцены; нужное даст Controller), Flow (другая модель, другое пространство), переписывание звукового ядра на Rust, дальнейшее углубление редактора.
- **Jam технически возможен в браузере.** Тональность: первая догадка за 5–10 секунд, устойчиво за 20–30; аккорды: с опозданием 0,3–1 с и ошибками; темп: 4–8 с на захват. Чтобы Handsong не слушал сам себя: сначала «слушаем молча, потом играем», затем слушать только в паузах собственной игры. Волшебство не в точности, а в том, как инструмент ведёт себя при сомнении: пока он не уверен, под пальцами только «безопасные» ноты, и поле раскрывается по мере понимания музыки. И ещё: он подстраивается под реальный строй гитары, а не под камертон.
- **Education:** со школами приходят серверы, аккаунты, данные детей, договоры и проверки. Одному человеку это тяжело. Версия без аккаунтов возможна и разумна первой: один компьютер учителя с проектором, ученики играют по очереди, никакие данные учеников не собираются вообще.
- **Деньги:** Vercel Hobby запрещает коммерцию; Stripe, по найденным сведениям, не открывает обычные счета в Грузии, так что продавать придётся через посредника-продавца (merchant of record). Это надо проверить до первой продажи.
- Все оценки рынка и цен ниже взяты из открытых источников со ссылками; где источники расходятся или я не нашёл подтверждения, это сказано прямо.

---

A note on words: the sleep-and-meditation market leader is called «the meditation leader» here, for the reason given in Part 2.

How to read the effort figures: a «run» is one slice of the size of NIGHT-8 or NIGHT-9 (one working session of Claude Code with its checks). The founder's own time (ears, eyes, phones, testers, sales) is counted separately, because it is the scarce part.

## 1. What the shared core already gives every version

- Hands: the tracking pipeline, the search schedule, calibration and sensitivity, the latency meter, low-light handling.
- Sound: the engine with its timbres and effects, 74 modes in 18 tunings (microtonal included), the limiter, measured levels.
- Structure: **profiles** (a product is a profile plus an app folder, not a fork), packs with **offline licence keys** (`core/pure/pack.js`), two languages, permanent ids.
- Full's parts: the recorder and editor, the lesson engine (`apps/full/tutor.js`, six lessons), song files.
- Night's parts: rooms, the music bed, the nature sound, the sleep timer.
- Privacy by construction (rule #33) and the licence register (rule #32). Both are selling points for schools, museums and care, not only constraints.
- The probes: the reason one person can keep this many parts working.

What no version has yet: offline use (C9), payments and key delivery, any server, MIDI, audio input, kiosk behaviour, store packaging.

## 2. The versions

Each: who it is for and why we would win · competitors and market · what is missing and rough effort · risks · model and price.

### 2.1 Handsong Night (exists)
- **For:** adults who want ten quiet minutes; people who do not play an instrument. **Why us:** the input is new (hands in the air), nothing to install, nothing leaves the device.
- **Competitors:** generative soundscape and sleep apps (Endel: a free tier plus a subscription; third-party listings give about $50–100 a year and disagree with each other, [aitoolsatlas](https://aitoolsatlas.ai/tools/endel), [aimusicpreneur](https://www.aimusicpreneur.com/ai-tools/endel/)); the meditation leader; quiet music toys. Many free webcam instruments exist ([Handel](https://contra.com/p/Pe7bv77r-handel-play-music-in-the-air-with-your-webcam-my-own-product), [gesture.live](https://chatgate.ai/post/gesture-live), [Jasper Bernaers' instrument](https://jasperbernaers.com/hand-tracking-instrument/)); none I found pairs it with a crafted world.
- **Missing:** Part 1's first five fixes, phones measured, C9 offline, the release edition's last checks. 4–6 runs plus the founder's phone round.
- **Risks:** novelty that fades; the camera prompt; weak phones.
- **Model:** free. Later «Plus» as a one-time purchase ($9–15) for more rooms and sounds, delivered as an offline key. Expect small direct income. Its real job: the proof of quality and the front door for Install, Education and everything else.

### 2.2 Handsong (Full: the instrument with an editor)
- **For:** hobby musicians, people curious about tunings, teachers. **Why us:** the tuning library with lessons, the expression hand, recording by hand.
- **Competitors:** free webcam instruments (above); hardware with far better tracking (ROLI Airwave: infrared, 27 joints per hand at 90 frames a second, about $299 plus a learning subscription, [TechCrunch](https://techcrunch.com/2024/10/08/roli-airwave-system-uses-ai-and-hand-tracking-to-teach-piano), [SoundGuys](https://www.soundguys.com/roli-airwave-review-is-this-the-future-of-music-creation-128605/)); and, for the editing half, every DAW.
- **My challenge to the founder:** the editor (piano roll, automation, freeze, arrangements) is the largest body of code in the repository and the part with the least certain buyer. A person serious enough to edit takes will want them in their own DAW; MIDI out (2.7) serves that person with a fraction of the code. The unique assets are the hands, the tunings with lessons, and the pictures.
- **Missing for a release:** saving and export (stage 5's first half), the calibration screen, a release edition. 4–6 runs. **I would stop there:** no mixer, no audio takes, no further editor depth until buyers ask.
- **Model:** free or a low one-time price ($15–25) as «Handsong Studio»; packs for tunings and lesson sets.

### 2.3 Handsong Jam
- **For:** the friend at a jam who plays nothing; a child beside a parent's guitar; a teacher; and the largest group by far: **anyone playing along with recorded music** from a speaker. **Why us:** no instrument I found listens to the room and then makes every note right. Chord and key recognisers exist for learners ([Chord ai](https://apps.apple.com/FR/app/id1446177109)); score followers accompany a soloist ([Metronaut](https://midi.org/event-calendar/metronaut), [Cadenza Live](https://apps.apple.com/us/app/id1363340614), [MyPianist](https://apps.apple.com/app/id1460393665)); they do not hand a novice an instrument that cannot be wrong.
- **Missing:** microphone input, analysis in a worklet (our own code from published methods; Essentia is AGPL and refused by rule #32), the self-sound problem, the interface for «what I hear». Step 1 (one-shot Listen): 2–3 runs. Step 2 (continuous key): 3–4 more. Chords: 4–6 more and much ear work. Tempo following: research risk. Section 6 has the detail.
- **Risks:** a wrong key breaks the promise; a second permission (microphone); phones (speaker beside the microphone).
- **Privacy:** sound analysed on the device and never stored or sent fits rule #33; the notice must say «microphone» in plain words.
- **Model:** a feature of Night Plus and of Full, not a separate product, until it proves itself.

### 2.4 Handsong Performance
- **For:** professionals on stage. **Why we would not win yet:** a webcam gives about 30 frames a second, and our measured hand-to-sound time is about 125 ms by day and about 205 ms in dim light. That suits pads, swells and effects; it does not suit rhythm. Stages are dark and coloured: the worst light for tracking. Professionals expect a native app, line-level reliability, Ableton Link (GPL or a separate licence from Ableton: rule #32), and support at night before a show.
- **Competitors:** gloves and rings built for this (MiMU, Genki), Leap Motion with [GECO](https://cdm.link/?p=46921), ROLI Airwave.
- **Verdict:** not a product. A musician who wants to take it on stage gets what they need from Controller (2.7) and from Install's hardening. One or two artists using it are worth more as films than as customers.

### 2.5 Handsong Education
- **For:** music teachers and schools. **Why us:** scales, intervals and tunings learned with the body; no instrument to buy, only a webcam; world and microtonal tunings no classroom tool I know covers; no pupil data at all in the first version.
- **Competitors and prices:** free tools set the floor (Chrome Music Lab, BandLab for Education). Paid classroom tools: Solfeg.io is listed at $249 and $899 a year per plan ([Capterra UK](https://www.capterra.co.uk/software/189071/solfeg-io), possibly dated); Flat for Education sells teacher licences with per-student seats ([Flat](https://help.flat.io/en/education/plan/)); consumer learning apps charge about $120–150 a year ([Yousician](https://subger.com/en/service/yousician), [Simply Piano](https://www.artmaster.com/articles/what-piano-apps-actually-cost-in-2026)). I did not find current per-seat prices for Soundtrap or MusicFirst.
- **Missing:** the course itself (the large part: 40–60 lessons written with a working teacher), lessons as data files in packs so content needs no engine change, a teacher's guide, a site key. Without accounts: 4–6 runs of engine work plus months of content. With accounts: section 7.
- **Risks:** slow sales by school year; managed school laptops that are weak (the class of our HD 4000 or below) and may block cameras; a room of pupils waving at webcams is not a real classroom. The realistic mode is **one teacher's computer on the projector, pupils taking turns**.
- **Model:** per teacher $59–99 a year, per school $300–600 a year, by offline key.

### 2.6 Install (museums, galleries, events)
- **For:** museums, children's centres, galleries, festivals, hotels, corporate events. **Why us:** touchless, crowd-pleasing, private by construction («no image is stored or sent» is a strong line for a public venue), runs on a small PC with a webcam and a projector, and Night already looks like an exhibit.
- **Market:** agencies quote about $20–50K for one custom interactive station and $40–200K for larger works ([Utsubo's cost guide](https://www.utsubo.com/blog/interactive-installation-cost-budget-guide), [Utsubo on museums](https://www.utsubo.com/blog/interactive-museum-installations-benefits-guide); a vendor's own figures). A product at a fraction of that has room.
- **Missing:** C9 offline; kiosk behaviour (an attract state, reset after idle, no menus, recovery after any failure, start on boot); a rule for several people in view; hands at 1–2 m (the backlog's crop round the player, a CORE run); a lighting and hardware sheet; a way to brand a room. 6–8 runs. Then pilots, which cost the founder's time, not code.
- **Risks:** sales cycles of months; requests for custom work; on-site support; venue light; a legal entity for contracts (pending, per the backlog).
- **Model:** the backlog's ladder stands: a self-install licence $300–1,500 once or $30–150 a month; turnkey $2–8K; a custom room $5–20K (far cheaper for us once picture rooms exist, Part 3).
- **Why I rank it second:** ten sales here equal thousands of consumer sales, the product is nearly built, and every install produces film of real people delighted by it.

### 2.7 MIDI / Controller
- **For:** producers and live electronic musicians who want hands as an expressive controller. **Why us:** scale-aware notes in any tuning (microtonal through per-note pitch bend), an expression hand with five channels already measured and damped, calibration, and the pictures as a stage view.
- **Competitors:** [AirBending](https://apps.apple.com/us/app/id6748079429) (Mac and iOS, listed at $8.99, Apple's own hand tracking); Handmate, an academic browser controller for MIDI and OSC ([Computer Music Journal](https://www.citedrive.com/en/discovery/an-accessible-browser-based-gestural-controller-for-web-audio-midi-and-open-sound-control)); Leap Motion with GECO; Glover; ROLI Airwave.
- **Missing:** a MIDI output module listening to the note and expression buses (1–2 runs), a mapping screen with presets for common DAWs (2–3 runs), a guide to virtual ports. Web MIDI works in Chromium browsers and desktop Firefox, **not in Safari or on iOS** ([caniuse](https://caniuse.com/webmidi)): a desktop product.
- **Risks:** the price anchor is low ($9); setting up a virtual MIDI port defeats some users; support questions about DAWs.
- **Model:** one-time $19–39.
- **Why third:** small effort, buyers who pay for tools, and it gives Performance and Full's export story for free.

### 2.8 Care (hand rehabilitation, elderly, music therapy)
- **Evidence:** research prototypes use exactly our kind of tracking: a 2024 thesis with MediaPipe for proprioception after stroke ([Proprio](https://escholarship.org/uc/item/9pw7v4s0)), a 2026 paper mapping finger gestures to an instrument for rehabilitation, not yet clinically validated ([Tapxophone](https://vbn.aau.dk/ws/files/827612525/3802842.3802889.pdf)), a small randomised trial of a sensor glove with music ([MusicGlove](https://pmc.ncbi.nlm.nih.gov/articles/PMC4022276)), a review noting the gap in the literature ([JNER 2024](https://jneuroengrehab.biomedcentral.com/articles/10.1186/s12984-024-01379-w)).
- **The line not to cross:** sold for well-being with no claim about any disease or recovery, software is outside medical-device rules in the United States (FDA's general wellness policy, updated January 2026: [summary](https://faegredrinker.com/en/insights/publications/2026/1/key-updates-in-fdas-2026-general-wellness-and-clinical-decision-support-software-guidance)) and in the EU, where the maker's stated purpose decides ([overview](https://www.taylorwessing.com/de/interface/2019/bodytech/border-issues-medical-devices-wellbeing-and-lifestyle-apps)). The moment we say «rehabilitation», measure range of motion for a clinician, or track a patient, it becomes medical-device software, likely class IIa in the EU ([Rule 11 overview](https://namsa.com/resources/blog/eu-mdr-and-ivdr-classifying-medical-device-software-mdsw/)). I am not a lawyer; a real product here needs one.
- **Verdict:** postpone as a product. Offer Night as it is to one music therapist or care home and listen. Build the options that help (2.12) into the core.

### 2.9 Kids
- Night with creatures (the backlog's musicians in the scene) is close to a children's product. A service directed at children brings COPPA in the United States (amended rule in force since June 2025, with retention limits and separate consent for third-party disclosure: [Federal Register](https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm), [Loeb](https://www.loeb.com/en/insights/publications/2025/05/childrens-online-privacy-in-2025-the-amended-coppa-rule)), the UK's design code with its 15 standards ([ICO](https://ico.org.uk/for-organisations/guide-to-data-protection/ico-codes-of-practice/age-appropriate-design-a-code-of-practice-for-online-services/annex-b-age-and-developmental-stages)), and store rules for the Kids category. We collect nothing, which makes most of it easy; even the page-view counter would have to go.
- **Verdict:** not a product now. Later, a «family room» inside Night.

### 2.10 Flow (movement with music)
- Whole-body movement needs a different model (pose, not hands), 2–3 m of space and a different design. It shares the least with what exists. **Drop for now.** What it wants at a distance (large gestures) arrives with Install's far hands.

### 2.11 Stream (streamers, OBS)
- A streamer can capture the browser window today. What is missing is small: a stage view (plain or keyed background, large visuals, no interface) and a clip recorder. Core has a clip recorder (`core/clip.js`).
- **Verdict:** not a product. Build the stage view once, with Controller: it serves streamers, performers, and our own films.

### 2.12 Access (people who cannot hold an instrument)
- The mission fits best of all. The field has dedicated devices (Skoog, listed between about $200 and $380 depending on the seller: [review](https://symposium.music.org/59-2/item/11448-skoog-2-0-tactile-musical-interface-for-ios-and-mac.html); Soundbeam, whose price I could not confirm) and free camera-based software used in special education. Selling against free tools is hard; funding comes through grants and charities, through partners.
- **Verdict:** build accessibility into the core as design, not as a product: one-hand profiles (the hand-function table allows it), a trigger by dwell or by any touch instead of a precise pinch, large zones, calibration to a small range of movement (CORE-1 already adapts the range), reduced motion (the scene reads the system setting already). Then find one partner organisation.

### 2.13 Others worth naming
- **Sound postcards:** a 20–30 s clip of playing with the room's picture, made on the device and handed to the share sheet by the person's tap (rule #33 allows exactly this). The cheapest growth loop Night could have; the recorder exists in core.
- **Venue ambience:** Install's little sister for spas, yoga studios and hotel lobbies: a monthly kiosk licence.
- **Workshops:** the founder with a projector at events in Tbilisi. A service, not a product, but it pays for pilots and makes films.

## 3. Ranking by value for effort

| Rank | Version | Why here |
|---|---|---|
| 1 | **Night: finish and release** | It exists; everything else points people to it. |
| 2 | **Install** | Highest income per sale; 6–8 runs on top of Night; needs the founder's selling time. |
| 3 | **Controller** | 3–5 runs; paying niche; unlocks Performance and Stream. |
| 4 | **Jam, step 1 (Listen)** | 2–3 runs; the best demonstration film we could make («it plays along with any song»). |
| 5 | **Education without accounts** | Engine work is small; the course is the work. Start with one teacher. |
| 6 | **Full, released as it is** | Let it out after saving and export; learn who wants it. |
| — | *Postpone:* Jam with chords and tempo · Education with accounts · Care · Kids · Access as products | Each needs evidence first, or a partner. |
| — | *Drop for now:* Performance as a product · Flow · deeper editor · the Rust synthesis core | No customer-visible gain this year for a large cost. |

**Am I telling the founder he is spreading too thin? Yes.** Twelve directions, one person. The sign is already in the handoff: runs NIGHT-7 to NIGHT-10 wait on steps 145–150, and steps 120–129 are older still. Claude Code can produce a run a night; the founder cannot hear, see and phone-test a run a night, and nobody has yet played Night who did not build it. Every added version also adds a buyer to find and a kind of support to give. The plan below keeps two things moving at most at any time, and puts people before features.

## 4. A sequence for 12–18 months

| When | Do | Gate before moving on |
|---|---|---|
| **Nov–Dec 2026** | Night's first-contact fixes (Part 5). The Poco and one iPhone measured. 3–5 testers, then 10–20. C9 offline. Choose a host that allows selling. | Testers reach a first note without help; no crash on the three target devices. |
| **Jan 2027** | Night public, free. A one-page site and a 60-second film. Sound postcards if cheap. | People finish a session; some return (asked, not tracked). |
| **Jan–Mar** | Install: kiosk behaviour, far hands, the hardware and light sheet. Two pilots in Tbilisi, nearly free, in exchange for filming and a quote. The legal entity. | A venue says what it would pay. |
| **Feb–Apr** | The room kit and a second room (Part 3). Night Plus by offline key through a merchant of record. | First paid keys; any at all. |
| **Apr–Jun** | Controller: MIDI out, mappings, the stage view. | 20 buyers or 5 musicians using it weekly. |
| **Jun–Aug** | Jam step 1: Listen, the key, the self-tuning. In Night and Full. | It picks a workable key on 9 of 10 songs tried by ear. |
| **Aug–Dec** | Education without accounts: lessons as data, a first course of 10–12 lessons in two languages written with a teacher, a pilot in 2–3 schools. Full released as it is alongside. | A teacher uses it in three lessons running. |
| **2028, first months** | Follow the evidence: more installs and custom rooms, or Jam's next step, or Education with accounts together with a partner who carries the server and the compliance. | |

Money matters to settle early: Vercel's free plan is for non-commercial use only ([Vercel](https://vercel.com/docs/limits/fair-use-policy)); Stripe does not appear to open standard accounts for businesses in Georgia (third-party sources: [guide](https://payrequest.io/guides/accept-international-payments-georgia-without-stripe), [note](https://www.onesafe.io/blog/does-stripe-work-in-georgia); check Stripe's own list). A merchant of record sells on our behalf and handles tax for about 5 % plus $0.50 a sale ([comparison](https://dev.to/jettfu/stripe-vs-paddle-vs-lemon-squeezy-fee-comparison-2026-2c77)); whether each accepts a seller from Georgia I could not confirm and it must be checked before any sale. With offline keys, no payment code enters the app.

## 5. What to build into the shared core now, and what not yet

**Now (cheap, and every later version uses it):**
1. Lifecycle robustness and C9 offline (Part 1). A kiosk, a classroom and a phone all need them.
2. **Events out through one door.** The live notes ring on the bus exists; make it, with the expression channels, the documented output of playing. MIDI out, visuals, lessons and postcards listen there. Nothing is woven into `audio.js`.
3. **Entitlements by offline key** on top of `pure/pack.js`: a profile may name what a key unlocks. No server.
4. **Lessons as data** in packs, so a course is content.
5. **Idle and reset primitives:** «no hands for N seconds», «back to the start state», an attract hook. Night's living start screen, the kiosk and the classroom share them.
6. **Hands at a distance** (the crop round the player).
7. **Accessible triggers** as gesture options (dwell, any touch, one hand).
8. A throttled probe mode and size budgets, so growth and slow starts are seen.

**Not yet:**
- Accounts, a server, sync. Payments inside the app.
- The Rust and WebAssembly synthesis core. It is a rewrite of the part that works, with no gain a player would notice this year.
- Ableton Link (licence), native wrappers and stores (after the web release proves demand; a kiosk needs only the browser's own kiosk mode).
- Body pose. Chord and tempo following. A plug-in system for third parties.
- More editor depth, the mixer, audio takes.
- More languages than two (cheap to add, costly to support).

## 6. Jam: how well can it work in a browser

### 6.1 Methods (all implementable from published descriptions, in an AudioWorklet)
- **Input:** `getUserMedia` audio with echo cancellation, noise suppression and automatic gain all off, checked with `getSettings()`. With them on, the browser's speech processing colours music badly; Safari is reported to degrade capture even with them off ([frequency test](https://cat-in-136.github.io/2020/10/gum-frequency-characteristic-depending-on-audio-parameters.html), [WebKit report](https://bugs.webkit.org/show_bug.cgi?id=311451)).
- **Tuning offset:** where the room's A really is (a guitar 20 cents flat). Estimated from spectral peaks in 3–5 s. We can then move our own A4 reference (one owner, rule #17): the instrument tunes itself to the players.
- **Key:** a 12-bin chroma from a windowed FFT, averaged with a time constant of 10–20 s, matched against the 24 key profiles (the Krumhansl and Temperley family), with a slow state model so the key does not flicker.
- **Chords:** frame-wise chroma against chord templates with smoothing, as in Stark and Plumbley's real-time recogniser ([paper](https://code.garrettmills.dev/Archives/papers-we-love_papers-we-love/raw/branch/main/audio_comp_sci/real-time-chord-detection.pdf)); or a small hidden Markov model with a short fixed lag.
- **Tempo and beat:** onset strength, a tempo estimate by autocorrelation, phase by a causal tracker.

### 6.2 Accuracy and reaction time (what to expect; my estimates where no source is given)

| Task | Offline state of the art | In a room, in real time, with our simple methods | Reaction |
|---|---|---|---|
| Tuning offset | n/a | within a few cents on a clear instrument (estimate) | 3–5 s |
| Key | scored with partial credit for near misses: fifth 0.5, relative 0.3, parallel 0.2 ([mir_eval](https://mir-eval.readthedocs.io/latest/api/key.html), [Korzeniowski and Widmer](https://arxiv.org/pdf/1706.02921)) | exact key perhaps two times in three after 10 s, better after 30 s; most misses are the near ones (estimate, to be measured on our own test set) | first guess 5–10 s, steady 20–30 s; a prototype in the literature waits 4 s before its first answer ([Chord Colourizer](https://arxiv.org/pdf/2510.10173)) |
| Chords (major / minor) | about 80 % of time correct, and stagnant for years ([review](https://arxiv.org/pdf/2310.11165)) | 60–75 % on one clear instrument, lower in a noisy mix (estimate) | 0.3–1 s after a change |
| Beat | causal trackers reach an F-measure of about 75 % on a standard set; a classic light one about 57 % ([BeatNet](https://arxiv.org/pdf/2108.03576)) | usable on steady music, fragile with free playing | 4–8 s to lock |

Processor cost is not the problem: a chroma every 50–100 ms is far under 1 % of a core on either device. Neural trackers would need a model runtime and a model whose licence must pass rule #32; start without them.

**Laptop against phone.** The laptop is the natural Jam device: its speakers and microphone are apart, and it sits on a table facing the players. A phone's microphone is a few centimetres from its speaker, its low end is weak, and some phones force their own noise processing. A phone Jam needs headphones or is an experiment. Bluetooth speakers add 100–250 ms and spoil playing.

### 6.3 Not following our own sound
In order of building:
1. **Listen, then play.** We are silent for the 5–10 s of listening and the key is frozen afterwards. No self-capture by construction. This is step 1 and already the backlog's plan (§7.17).
2. **Listen in our own gaps.** We know exactly when we sound (our own output level and note events). Analyse only frames where we have been silent for the last 300–500 ms. Night-style playing leaves most of the time free.
3. **Never count our own notes as evidence.** Our notes come from the detected key, so counting them would lock the estimate onto itself. Down-weight the pitch classes we are sounding.
4. **Do not rely on the browser's echo canceller** (made for speech). A proper adaptive canceller with our output as reference is possible in a worklet but is a project; a line input or headphones solves it for those who need more.

### 6.4 What makes it magical instead of merely correct
- **Doubt is a behaviour, not an error.** While two or three keys are still possible, the fingers hold only the notes common to all of them (three or four notes). As confidence grows, the field opens to five, then seven. The player never hears a wrong note and never sees «detecting…». A miss by a fifth changes one note of a five-note scale; a miss to the relative key changes none: the five-note scale, already the backlog's choice, forgives exactly the errors the detector makes.
- **It tunes to the people, not to 440.** Musicians notice at once when a new instrument sits inside their own pitch.
- **It shows that it listens:** the room leans towards the tonic's colour, brightens to major, deepens to minor; the fireflies pulse with the band's beat. A visual pulse forgives tempo error far more than a quantised note does.
- **The room accompanies:** Night's own music bed retunes to the detected key, so a guitarist gets a forest that plays along. I know no product that is «a listening room».
- **Time through effects, not through the notes.** Do not delay hand notes to a grid (that adds lateness by design). Sync the echo and the tremble to the detected tempo: when the tempo is a little off the echo is a little off, and nothing is wrong.
- **Chord gravity, gently:** when a chord is confident, the four fingers lean to its tones; when not, they fall back to the scale.

## 7. Education: what changes with schools, and can a version without accounts come first

**With accounts, what arrives:**
- a server, authentication, a database, a teacher's dashboard, backups, uptime, an incident process;
- contracts in which the school is the controller and we are its processor; in the United States the school may consent in the parents' place only for use that is solely educational (the FTC's 2022 policy statement still governs; the 2025 amendments did not codify the school exception and added retention limits and separate consent for third-party disclosure: [Federal Register](https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm), [analysis](https://blog.promise.legal/coppa-2025-amendments-edtech-compliance/)); in Europe the age of digital consent runs from 13 to 16 by country ([overview](https://sota.io/blog/gdpr-art-8-childrens-consent-age-verification-parental-authorization-digital-services-developer-guide-2026), to be checked per country); in the UK the children's design code applies ([ICO](https://cy.ico.org.uk/for-organisations/guide-to-data-protection/ico-codes-of-practice/age-appropriate-design-a-code-of-practice-for-online-services/about-this-code/));
- security questionnaires, accessibility statements, single sign-on and class rosters, invoices and purchase orders, a support address answered in school hours.

For one founder this is a second company. It becomes sensible with a partner or after income.

**Without accounts first: yes, and it is the better product for now.**
- **The teacher's station:** one licence on the teacher's computer, shown on the board; pupils take turns in front of the camera. This matches how a music room works and avoids weak pupil laptops and blocked cameras.
- **No pupil data exists.** Progress, if kept at all, stays in that browser. A lesson plan travels as a link or a small file. The licence is an offline key for the school. Our duties shrink to an honest privacy notice.
- **For private teachers and home learners:** the same course on their own device, progress kept locally, exportable as a file.
- What it cannot do: homework tracking across devices, and a head teacher's report. Those are the reasons to add accounts later, and by then real teachers will have said which of them matter.

## 8. Where I am unsure

- Every price and market figure from third-party pages; several disagree with each other, as noted.
- The real-room accuracy numbers in 6.2 are estimates. A test set of 30 recordings made in a room (guitar, piano, a speaker playing songs) and a data row that scores our detector on it would replace them with facts before any promise is made.
- Whether venues in Tbilisi will pay, and how much. Two pilots answer it.
- Whether merchants of record accept a seller from Georgia.
- The law: I have read summaries, not statutes. Kids, Care and schools each need a lawyer before a product, not before a pilot.

## Sources

- Endel pricing (third-party, inconsistent): https://aitoolsatlas.ai/tools/endel · https://www.aimusicpreneur.com/ai-tools/endel/
- Webcam instruments: https://contra.com/p/Pe7bv77r-handel-play-music-in-the-air-with-your-webcam-my-own-product · https://chatgate.ai/post/gesture-live · https://jasperbernaers.com/hand-tracking-instrument/
- ROLI Airwave: https://techcrunch.com/2024/10/08/roli-airwave-system-uses-ai-and-hand-tracking-to-teach-piano · https://www.soundguys.com/roli-airwave-review-is-this-the-future-of-music-creation-128605/
- Hand controllers: https://apps.apple.com/us/app/id6748079429 · https://www.citedrive.com/en/discovery/an-accessible-browser-based-gestural-controller-for-web-audio-midi-and-open-sound-control · https://cdm.link/?p=46921
- Web MIDI support: https://caniuse.com/webmidi
- Accompaniment and recognition apps: https://midi.org/event-calendar/metronaut · https://apps.apple.com/us/app/id1363340614 · https://apps.apple.com/app/id1460393665 · https://apps.apple.com/FR/app/id1446177109
- Education pricing: https://www.capterra.co.uk/software/189071/solfeg-io · https://help.flat.io/en/education/plan/ · https://subger.com/en/service/yousician · https://www.artmaster.com/articles/what-piano-apps-actually-cost-in-2026
- Installations: https://www.utsubo.com/blog/interactive-installation-cost-budget-guide · https://www.utsubo.com/blog/interactive-museum-installations-benefits-guide
- Care research: https://escholarship.org/uc/item/9pw7v4s0 · https://vbn.aau.dk/ws/files/827612525/3802842.3802889.pdf · https://pmc.ncbi.nlm.nih.gov/articles/PMC4022276 · https://jneuroengrehab.biomedcentral.com/articles/10.1186/s12984-024-01379-w
- Wellness against medical device: https://faegredrinker.com/en/insights/publications/2026/1/key-updates-in-fdas-2026-general-wellness-and-clinical-decision-support-software-guidance · https://www.taylorwessing.com/de/interface/2019/bodytech/border-issues-medical-devices-wellbeing-and-lifestyle-apps · https://namsa.com/resources/blog/eu-mdr-and-ivdr-classifying-medical-device-software-mdsw/
- Children's data: https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm · https://www.loeb.com/en/insights/publications/2025/05/childrens-online-privacy-in-2025-the-amended-coppa-rule · https://blog.promise.legal/coppa-2025-amendments-edtech-compliance/ · https://ico.org.uk/for-organisations/guide-to-data-protection/ico-codes-of-practice/age-appropriate-design-a-code-of-practice-for-online-services/annex-b-age-and-developmental-stages · https://sota.io/blog/gdpr-art-8-childrens-consent-age-verification-parental-authorization-digital-services-developer-guide-2026
- Accessible instruments: https://symposium.music.org/59-2/item/11448-skoog-2-0-tactile-musical-interface-for-ios-and-mac.html
- Hosting and payments: https://vercel.com/docs/limits/fair-use-policy · https://payrequest.io/guides/accept-international-payments-georgia-without-stripe · https://www.onesafe.io/blog/does-stripe-work-in-georgia · https://dev.to/jettfu/stripe-vs-paddle-vs-lemon-squeezy-fee-comparison-2026-2c77
- Music analysis: https://mir-eval.readthedocs.io/latest/api/key.html · https://arxiv.org/pdf/1706.02921 · https://arxiv.org/pdf/2310.11165 · https://arxiv.org/pdf/2108.03576 · https://arxiv.org/pdf/2510.10173 · https://code.garrettmills.dev/Archives/papers-we-love_papers-we-love/raw/branch/main/audio_comp_sci/real-time-chord-detection.pdf
- Microphone capture in browsers: https://cat-in-136.github.io/2020/10/gum-frequency-characteristic-depending-on-audio-parameters.html · https://bugs.webkit.org/show_bug.cgi?id=311451
