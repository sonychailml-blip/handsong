# Third-party licences and the icon / glyph / image / font audit

_Generated from `tools/licences.json` by `node tools/check-licences.mjs --write` — do not edit by hand. Checked by the data runner (row «LIC1 licence register»)._

## Policy (hard rule #32)

- Code, compiled-in libraries and models: MIT, BSD-2-Clause, BSD-3-Clause, Apache-2.0, ISC, Zlib.
- Material that is not code (sounds, impulse responses, pictures, fonts): CC0-1.0, CC-BY-4.0, OFL-1.1, own-work, AI-generated — Q13 (user, 2026-10-14): material licences CC0, CC-BY 4.0 with attribution, SIL OFL, own work, AI-generated pictures (tool and terms recorded); refuse SA, NC, ND.
- Refused: GPL, AGPL, LGPL, MPL, any share-alike (SA), non-commercial (NC) or no-derivatives (ND) terms; anything else needs the user's decision first.
- Our own code is written from published methods, never copied, translated or ported from another project's source.

## Shipped or loaded at run time (code and models)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| MediaPipe Tasks Vision — JavaScript library and its WebAssembly files | 0.10.35 | Apache-2.0 | shipped | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35 | https://github.com/google-ai-edge/mediapipe (npm @mediapipe/tasks-vision@0.10.35, vision_bundle.mjs and wasm/; byte-identical to jsDelivr's copy but for its header comment; hashes in core/vendor/mediapipe/0.10.35/README.md) |
| MediaPipe hand landmarker model (float16, version 1) | float16/1 | Apache-2.0 | shipped | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task | Google MediaPipe model card «Hand Tracking (Lite/Full)»; models listed at https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker |
| three.js (3D library) — the Night forest room | r128 (npm three@0.128.0) | MIT | shipped | apps/night/vendor/three-r128/three.min.js<br>apps/night/vendor/three-r128/LICENSE | https://github.com/mrdoob/three.js (npm three@0.128.0, build/three.min.js; sha256 9274bbce…1ce2) |

- **MediaPipe Tasks Vision — JavaScript library and its WebAssembly files** — Hand detection in the browser (core/handdet.js — on the main thread or in our worker core/hand-worker.js, LAT2). CORE-22 (2026-11-13): served from our own origin (both apps opt in: boot option handFiles 'own'; both pages' CSP name only 'self'), with its Apache-2.0 LICENSE (the MediaPipe repository at tag v0.10.35; the npm package carries none) shipped beside it. The jsDelivr address stays only as core/handdet.js's default (an app that does not opt in). The no-SIMD pair is kept for browsers without WebAssembly SIMD (not precached).
- **MediaPipe hand landmarker model (float16, version 1)** — CORE-22 (2026-11-13): served from our own origin (core/vendor/mediapipe/0.10.35/, byte-identical to the Google storage file, SHA-256 in its README.md); the Apache-2.0 text ships beside it (LICENSE, listed under mediapipe-tasks-vision). The Google storage address stays only as core/handdet.js's default. Licence as stated for the MediaPipe models (Apache-2.0): the model card PDF (https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20(Lite_Full)%20with%20Fairness%20Oct%202021.pdf) could not be read as text by our tools at CORE-22 — a person should confirm its licence line once.
- **three.js (3D library) — the Night forest room** — Vendored with its LICENSE (VIS1b, RUN 6): loaded LAZILY from our own origin by apps/night/scene/host.js (a dynamic import of the UMD file, which sets globalThis.THREE) only when Night shows the Forest background — never in Full. No CSP change.

## Hosted services

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| Vercel Web Analytics — page-view counter of the Vercel deployment | hosted | service-terms | service | /_vercel/insights/script.js | https://vercel.com/docs/analytics |

- **Vercel Web Analytics — page-view counter of the Vercel deployment** — decision: Q14 (user, 2026-10-14): keep it and name it in the privacy notice. Cookieless page views only; never sees camera, sound or hand data. Inactive on GitHub Pages (the path does not resolve there). Vercel Hobby forbids commercial use — a paid plan or other hosting before selling (BACKLOG strategy). · Script served by Vercel from the same origin; the one-line stub that queues calls before it loads is our own code (core/va-stub.js, outside index.html so the CSP needs no inline script).

## Links the person opens (nothing is sent by the app)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| Feedback form (Google Forms) — a link the person opens | — | n/a | link | https://docs.google.com/forms/ | core/legacy-ui/ui.js FEEDBACK_URL |
| Donation page (PayPal.Me) — a link the person opens | — | n/a | link | https://paypal.me/ | core/legacy-ui/ui.js DONATE_URL |
| The SVG namespace NAME «http://www.w3.org/2000/svg» — an identifier the DOM needs to create SVG elements (document.createElementNS); never fetched, nothing is sent | — | n/a | link | http://www.w3.org/2000/svg | W3C SVG specification (a namespace name, not an address the app opens) |
| handsong.app — the brand site's own address (canonical, language alternates, the sharing picture's address); nothing is fetched from elsewhere | — | n/a | link | https://handsong.app/ | tools/site/texts.mjs ORIGIN |
| The apps the brand site links to — Handsong Night and the tech demo (our own deployments) — links the person opens | — | n/a | link | https://night.handsong.app<br>https://handsong.vercel.app | tools/site/texts.mjs LINKS |
| Handsong's social pages (YouTube, Instagram, TikTok @handsongapp) — links the person opens | — | n/a | link | https://www.youtube.com/@handsongapp<br>https://www.instagram.com/handsongapp<br>https://www.tiktok.com/@handsongapp | tools/site/texts.mjs LINKS |

- **Feedback form (Google Forms) — a link the person opens** — Opened only by a tap on the start card; nothing is sent by the app.
- **Donation page (PayPal.Me) — a link the person opens** — Opened only by a tap on the start card; nothing is sent by the app.
- **The SVG namespace NAME «http://www.w3.org/2000/svg» — an identifier the DOM needs to create SVG elements (document.createElementNS); never fetched, nothing is sent** — RUN 7 (C11): core/icons.js builds the Night face's drawn icons and the emblem as SVG elements with this namespace name.
- **The apps the brand site links to — Handsong Night and the tech demo (our own deployments) — links the person opens** — SITE-1: opened only by a tap; the site sends nothing.
- **Handsong's social pages (YouTube, Instagram, TikTok @handsongapp) — links the person opens** — SITE-1: plain links in the site's footer; no embed, no widget, nothing loaded from these hosts.

## Developer tools only (never shipped)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| playwright-core — browser automation for the probe runner | 1.64.0 | Apache-2.0 | dev-only | npm playwright-core | https://github.com/microsoft/playwright (npm playwright-core) |
| Basis Universal — KTX2 encoder and transcoder (WebAssembly builds), for the laptop measurement only | commit 073eb6a0a34a23d77e75e54f41dcd9653a52da83 | Apache-2.0 | dev-only | — | https://github.com/BinomialLLC/basis_universal (webgl/encoder/build, webgl/transcoder/build) |

- **playwright-core — browser automation for the probe runner** — Developer tool in tools/ only (tools/node_modules is git-ignored); never shipped; no dependencies of its own.
- **Basis Universal — KTX2 encoder and transcoder (WebAssembly builds), for the laptop measurement only** — NIGHT-6 slice 3: downloaded into the git-ignored tools/.ktx-lab/ by hand, used by tools/forest-ktx-lab.mjs and tools/forest-ktx.eval.js to measure KTX2 against PNG; never shipped. Its JavaScript glue uses eval, which our CSP refuses — shipping it needs the user's decision first.

## Reference prototypes only (docs/night/prototypes/, never shipped)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| three.js (3D library) — reference prototype only | r128 | MIT | reference | https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/ | https://github.com/mrdoob/three.js (cdnjs three.js r128) |
| Google Fonts: Marcellus and Commissioner — reference prototype only | css2 API | OFL-1.1 | reference | https://fonts.googleapis.com<br>https://fonts.gstatic.com | https://fonts.google.com (Marcellus, Commissioner — SIL Open Font License 1.1) |

- **three.js (3D library) — reference prototype only** — Loaded only by docs/night/prototypes/rooms-of-light.html (the strategist's «Rooms of light» prototype — a REFERENCE for Night, not app code). Not shipped; if Night adopts it, it is vendored with its LICENSE and becomes a shipped entry (STAGE4-NIGHT plan).
- **Google Fonts: Marcellus and Commissioner — reference prototype only** — Loaded only by docs/night/prototypes/rooms-of-light.html. Not shipped; the app loads no web fonts. · **reference prototype only — not shipped (the app's own fonts come with the user's design, §7.19)**

## Icons, images and fonts (audit, Q13)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| App icons (home screen / install) — the Handsong emblem: five notes in an arc, the centre one glowing firefly lime, on the Moonglass night | — | AI-generated | shipped | apps/full/icons/icon-192.png<br>apps/full/icons/icon-512.png<br>apps/full/icons/icon-512-maskable.png<br>apps/night/icons/icon-192.png<br>apps/night/icons/icon-512.png<br>apps/night/icons/icon-512-maskable.png | the user's chosen design (RUN 7, BACKLOG §7.19: the C · Hush emblem in Moonglass colours), drawn by code by Claude Code in this project (canvas circles and gradients; no font, no traced artwork) |
| The night forest's prepared files: textures that never change during play (a spider web; the floor's plant sheet; the contact shadows; the crowns' leaf sprays; the moonlight's dapple; the moon's face; the bare floor's colour and relief; NIGHT-8 the bare ground's large scale as data), each a master with smaller copies | — | own-work | shipped | apps/night/rooms/forest/tex/crown-1024.png<br>apps/night/rooms/forest/tex/crown-256.png<br>apps/night/rooms/forest/tex/crown-512.png<br>apps/night/rooms/forest/tex/dapple-1024.png<br>apps/night/rooms/forest/tex/dapple-256.png<br>apps/night/rooms/forest/tex/dapple-512.png<br>apps/night/rooms/forest/tex/floor-1024.png<br>apps/night/rooms/forest/tex/floor-2048.png<br>apps/night/rooms/forest/tex/floor-512.png<br>apps/night/rooms/forest/tex/ground-1024.png<br>apps/night/rooms/forest/tex/ground-2048.png<br>apps/night/rooms/forest/tex/ground-512.png<br>apps/night/rooms/forest/tex/groundn-1024.png<br>apps/night/rooms/forest/tex/groundn-2048.png<br>apps/night/rooms/forest/tex/groundn-512.png<br>apps/night/rooms/forest/tex/groundm-1024.png<br>apps/night/rooms/forest/tex/groundm-256.png<br>apps/night/rooms/forest/tex/groundm-512.png<br>apps/night/rooms/forest/tex/moon-128.png<br>apps/night/rooms/forest/tex/moon-256.png<br>apps/night/rooms/forest/tex/moon-512.png<br>apps/night/rooms/forest/tex/shade-1024.png<br>apps/night/rooms/forest/tex/shade-2048.png<br>apps/night/rooms/forest/tex/shade-512.png<br>apps/night/rooms/forest/tex/web-1024.png<br>apps/night/rooms/forest/tex/web-256.png<br>apps/night/rooms/forest/tex/web-512.png | drawn by our own seeded code, tools/forest-bake.mjs (regenerate: node tools/forest-bake.mjs; the data row «NIGHT forest files (app)» proves the files match it) — NIGHT-6, after the user's sketch «Живой лес»; the fine fern from an iterated-function system (Barnsley's published method) |
| The start screen's stills of the night forest: a dim picture of the room behind the start card, one per picture level (DESIGN-1), and the shapes of its corner silhouettes (NIGHT-13) | — | own-work | shipped | apps/night/rooms/forest/still/still-full.webp<br>apps/night/rooms/forest/still/still-reduced.webp<br>apps/night/rooms/forest/still/still-sil.webp | our own render of our own forest scene, made by tools/night-still.mjs (headless Chrome draws the room at the level, the clear-moon moment, no hands; dimmed and encoded as WebP under 96 KB); the scene's floor uses the CC0 photo-scanned «Leaves Forest Ground» (register entry of the floor scan), which asks for no attribution |
| The night forest's stream: a field recording of soft flowing water («stream-river-water-up-close»), played in grains by the nature sound (NIGHT-8b) | Freesound #433589 (Wikimedia Commons file SHA-1 27245d1abe3a5303e862bb9a489e2ba17dd452bf) | CC0-1.0 | shipped | apps/night/rooms/forest/sound/stream.mp3 | jackthemurray, «stream-river-water-up-close», Freesound https://freesound.org/people/jackthemurray/sounds/433589/ — mirrored on Wikimedia Commons as «433589 jackthemurray stream-river-water-up-close.wav» (https://commons.wikimedia.org/wiki/File:433589_jackthemurray_stream-river-water-up-close.wav), Creative Commons Zero 1.0 Public Domain Dedication (http://creativecommons.org/publicdomain/zero/1.0/). Our edit (2026-11-11, ffmpeg with LAME, dev tools outside the repo): 0.5–68.4 s, the two channels averaged to one, rumble below 55 Hz removed, +24 dB, low-passed at 11 kHz, MP3 80 kbit/s mono 48 kHz. |
| The night forest's bare floor, photo-scanned: «Leaves Forest Ground» — colour, normal (OpenGL) and AO/roughness/metal maps, smaller copies per picture level (NIGHT-9) | Poly Haven, 2k JPG (published 2022-06-19); our copies re-encoded at 2048 / 1024 / 512 px | CC0-1.0 | shipped | apps/night/rooms/forest/scan/litter-arm-1024.jpg<br>apps/night/rooms/forest/scan/litter-arm-512.jpg<br>apps/night/rooms/forest/scan/litter-col-1024.jpg<br>apps/night/rooms/forest/scan/litter-col-2048.jpg<br>apps/night/rooms/forest/scan/litter-nor-1024.jpg<br>apps/night/rooms/forest/scan/litter-nor-2048.jpg | Poly Haven, https://polyhaven.com/a/leaves_forest_ground — photography Dimitrios Savva, processing Dario Barresi; every Poly Haven asset is CC0 1.0 (https://polyhaven.com/license). Downloaded 2026-11-11 (SHA-1 of the 2k originals: diff fac51b5c30e6623f0b95dcd85cf0239c440eb30d, nor_gl 16902982b2c82ecc4a4dbae73107fc0446631341, arm 26203870a0db64bc897fc05502a8bad99e9b4685), resized with ffmpeg (a dev tool outside the repo). |
| Interface and canvas text — the device's system fonts (CSS --font stack, canvas system-ui) | — | n/a | device | — | style.css --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; core/legacy-ui/draw.js ctx.font system-ui |
| Unicode symbols and emoji used as icons and signs (list below) | — | n/a | device | — | characters in our own text; their pictures come from the device's fonts (Segoe UI Symbol / Segoe UI Emoji on Windows, Apple Color Emoji and SF on Apple devices, Noto on Android) — no file shipped |
| Andika (text font of the Night face) — SIL International | 7.000 (SIL release, web/Andika-Regular.woff2 and Andika-Bold.woff2, UNMODIFIED) | OFL-1.1 | shipped | apps/night/fonts/andika/Andika-Regular.woff2<br>apps/night/fonts/andika/Andika-Bold.woff2<br>apps/night/fonts/andika/OFL.txt | https://github.com/silnrsi/font-andika/releases/tag/v7.000 (Andika-7.000.zip) — Reserved Font Names «Andika» and «SIL»: the files are shipped unmodified (no subsetting), so the name stays |
| Literata Light (title font and wordmark of the Night face) — The Literata Project Authors | Google Fonts v40, weight 300, latin + cyrillic subsets (woff2) | OFL-1.1 | shipped | apps/night/fonts/literata/literata-300-latin.woff2<br>apps/night/fonts/literata/literata-300-cyrillic.woff2<br>apps/night/fonts/literata/OFL.txt | https://fonts.google.com/specimen/Literata (https://github.com/googlefonts/literata) — no Reserved Font Name, so the subsets may keep the name |
| Inter (text font of the brand site handsong.app) — The Inter Project Authors | Google Fonts v20, variable weight axis (400–600 used), latin + cyrillic subsets (woff2), unmodified | OFL-1.1 | shipped | apps/site/fonts/inter-latin.woff2<br>apps/site/fonts/inter-cyrillic.woff2<br>apps/site/fonts/OFL-Inter.txt | https://fonts.google.com/specimen/Inter (https://github.com/rsms/inter) — no Reserved Font Name |
| Literata (titles and wordmark of the brand site handsong.app) — The Literata Project Authors | Google Fonts v40, variable optical-size and weight axes (300–400 roman, 300 italic), latin + cyrillic subsets (woff2), unmodified | OFL-1.1 | shipped | apps/site/fonts/literata-latin.woff2<br>apps/site/fonts/literata-cyrillic.woff2<br>apps/site/fonts/literata-italic-latin.woff2<br>apps/site/fonts/literata-italic-cyrillic.woff2<br>apps/site/fonts/OFL-Literata.txt | https://fonts.google.com/specimen/Literata (https://github.com/googlefonts/literata) — no Reserved Font Name |
| The brand site's pictures: the Night card (portrait), the forest on the Install wall, the sharing picture (1200 × 630 with the wordmark), and the tech demo card (its start screen) | — | own-work | shipped | apps/site/img/night-card.webp<br>apps/site/img/night-card.jpg<br>apps/site/img/forest-wall.webp<br>apps/site/img/forest-wall.jpg<br>apps/site/img/og.jpg<br>apps/site/img/demo-card.webp<br>apps/site/img/demo-card.jpg | our own renders and captures, made by tools/site-images.mjs: the night forest drawn by our own scene through the still's camera (as tools/night-still.mjs; the floor uses the CC0 photo-scanned «Leaves Forest Ground», which asks for no attribution), and a capture of our own live tech demo's start screen |
| The brand site's favicons — the Handsong emblem: five notes in an arc, the centre one glowing | — | AI-generated | shipped | apps/site/favicon.svg<br>apps/site/favicon.ico<br>apps/site/img/icon-32.png<br>apps/site/img/apple-touch-icon.png | drawn by code by Claude Code in this project (an SVG of five circles; PNG and ICO rendered from it by tools/site-images.mjs; no font, no traced artwork) |

- **App icons (home screen / install) — the Handsong emblem: five notes in an arc, the centre one glowing firefly lime, on the Moonglass night** — tool: Claude Code (Anthropic); output owned by the user under Anthropic's commercial terms · **kept — the user's chosen Night design (RUN 7); the earlier «H» icons were replaced**
- **The night forest's prepared files: textures that never change during play (a spider web; the floor's plant sheet; the contact shadows; the crowns' leaf sprays; the moonlight's dapple; the moon's face; the bare floor's colour and relief; NIGHT-8 the bare ground's large scale as data), each a master with smaller copies** — **kept — our own generated material (NIGHT-6: the user's rule that what never changes is prepared ahead as files)**
- **The start screen's stills of the night forest: a dim picture of the room behind the start card, one per picture level (DESIGN-1), and the shapes of its corner silhouettes (NIGHT-13)** — **kept — our own generated material (regenerate: node tools/night-still.mjs whenever the forest's look changes)**
- **The night forest's bare floor, photo-scanned: «Leaves Forest Ground» — colour, normal (OpenGL) and AO/roughness/metal maps, smaller copies per picture level (NIGHT-9)** — **kept while the user compares it with our baked floor (NIGHT-9); CC0 photo material**
- **Interface and canvas text — the device's system fonts (CSS --font stack, canvas system-ui)** — No font file is shipped; the person's device draws the text with its own fonts. · **to be replaced by the user's own authored design (a chosen typeface under OFL-1.1 or own work, set through the UI1 design tokens)**
- **Unicode symbols and emoji used as icons and signs (list below)** — Each device draws them differently. Pictures of them in marketing (screenshots, the promo video) may fall under the font owner's terms — another reason to replace them. · **to be replaced by the user's own authored design — one icon component / SVG sprite (UI1)**
- **Andika (text font of the Night face) — SIL International** — RUN 7 (C11, the user's design choice): chosen for Night's text because Atkinson Hyperlegible (and Next) have NO Cyrillic (checked: Latin and Latin-ext subsets only); Andika is designed by SIL for literacy and low vision (distinct letterforms) and covers Cyrillic. Self-hosted, served from our own origin. · **kept — the font of the user's chosen Night design (RUN 7, BACKLOG §7.19); not to be replaced**
- **Literata Light (title font and wordmark of the Night face) — The Literata Project Authors** — RUN 7 (C11): Fraunces (the Moonglass proposal) has no Cyrillic (checked: vietnamese, latin-ext, latin only); Literata is a warm, soft book serif with a true Light weight and Cyrillic. Self-hosted, served from our own origin. · **kept — the font of the user's chosen Night design (RUN 7, BACKLOG §7.19); not to be replaced**
- **Inter (text font of the brand site handsong.app) — The Inter Project Authors** — SITE-1: the founder's approved site design (variant B) names Inter; self-hosted from the site's own origin instead of Google Fonts (no third-party request). · **kept — the font of the founder's approved site design (SITE-1)**
- **Literata (titles and wordmark of the brand site handsong.app) — The Literata Project Authors** — SITE-1: the same family as Night's wordmark (entry font-literata), here with the optical-size axis the approved design uses; self-hosted from the site's own origin. · **kept — the font of the founder's approved site design (SITE-1)**
- **The brand site's pictures: the Night card (portrait), the forest on the Install wall, the sharing picture (1200 × 630 with the wordmark), and the tech demo card (its start screen)** — **kept — our own generated material (regenerate: node tools/site-images.mjs when the forest or the demo changes)**
- **The brand site's favicons — the Handsong emblem: five notes in an arc, the centre one glowing** — tool: Claude Code (Anthropic); output owned by the user under Anthropic's commercial terms · **kept — the emblem of the founder's approved site design (SITE-1)**

## Unicode symbols and emoji in the interface (audit, Q13)

Origin of every entry: characters in our own text; their pictures come from the device's fonts (Segoe UI Symbol / Segoe UI Emoji on Windows, Apple Color Emoji and SF on Apple devices, Noto on Android) — no file shipped.

Every entry: **to be replaced by the user's own authored design — one icon component / SVG sprite (UI1)** (console-only signs are developer text, never shown in the app).

| Glyph | Code point | Meaning | Kind | Used in |
|---|---|---|---|---|
| ↶ | U+21B6 | undo (history) | icon | core/icons.js |
| ↷ | U+21B7 | redo (history) | icon | core/icons.js |
| ⤺ | U+293A | undo the last take | icon | core/icons.js |
| ⇄ | U+21C4 | swap hands (help text) | icon | core/icons.js |
| ⊘ | U+2298 | remove effect from a track | icon | core/icons.js |
| ⌐ | U+2310 | step shape (automation / bend) | icon | core/icons.js |
| ╱ | U+2571 | glide shape (automation / bend) | icon | core/icons.js |
| ⌒ | U+2312 | curvature value tag | icon | core/icons.js |
| ⌗ | U+2317 | quantise | icon | core/icons.js |
| ⏮ | U+23EE | to the start | icon | core/icons.js |
| ⏸ | U+23F8 | pause (message) | icon | apps/full/songs.js, core/icons.js |
| ❚ | U+275A | pause bars | icon | core/icons.js |
| ▶ | U+25B6 | play / start | icon | apps/full/songs.js, core/icons.js, core/recorder.js, core/render.js |
| ■ | U+25A0 | stop (panic) | icon | apps/full/songs.js, core/icons.js |
| ⟳ | U+27F3 | repeat the brace | icon | apps/full/songs.js, core/icons.js |
| ● | U+25CF | record / lesson step done | icon | core/icons.js |
| ○ | U+25CB | lesson step to come | icon | core/icons.js |
| ✕ | U+2715 | close / delete / clear | icon | core/icons.js |
| ✎ | U+270E | edit / rename / arrangement window | icon | apps/full/songs.js, core/icons.js |
| ✂ | U+2702 | cut bars | icon | core/icons.js |
| ⧉ | U+29C9 | copy / duplicate | icon | core/icons.js |
| 📋 | U+1F4CB | paste | icon | core/icons.js |
| 🗑 | U+1F5D1 | delete | icon | core/icons.js |
| ✚ | U+271A | add a point | icon | core/icons.js |
| ＋ | U+FF0B | insert (empty bars) | icon | core/icons.js |
| ▯ | U+25AF | empty bar | icon | core/icons.js |
| ▮ | U+25AE | volume bars face | icon | core/icons.js |
| ▤ | U+25A4 | arrangement face | icon | core/icons.js |
| ⬚ | U+2B1A | pick several notes | icon | core/icons.js |
| ⤢ | U+2922 | fit the whole song | icon | core/icons.js |
| ▲ | U+25B2 | move up | icon | core/icons.js |
| ▼ | U+25BC | move down | icon | core/icons.js |
| ▸ | U+25B8 | accordion closed | icon | core/icons.js |
| ▾ | U+25BE | accordion open | icon | core/icons.js |
| ↕ | U+2195 | vertical hand axis | icon | core/icons.js |
| ↔ | U+2194 | horizontal hand axis | icon | core/icons.js |
| ◆ | U+25C6 | depth hand axis | icon | core/icons.js |
| ◧ | U+25E7 | left half (split) | icon | core/icons.js |
| ◨ | U+25E8 | right half / split | icon | core/icons.js |
| ✓ | U+2713 | done / chosen | icon | core/icons.js |
| ⚙ | U+2699 | settings | icon | core/icons.js |
| ⛶ | U+26F6 | full screen | icon | core/icons.js |
| ⬇ | U+2B07 | install | icon | core/icons.js |
| 🌐 | U+1F310 | language | icon | core/icons.js |
| 🎥 | U+1F3A5 | video clip | icon | core/icons.js |
| 🎙 | U+1F399 | audio clip | icon | core/icons.js |
| 🎚 | U+1F39A | mixer | icon | core/icons.js |
| 🎛 | U+1F39B | sound panel | icon | core/icons.js |
| 🎵 | U+1F3B5 | backing | icon | core/icons.js |
| 🎹 | U+1F3B9 | chords role | icon | core/icons.js |
| 🎸 | U+1F3B8 | bass role | icon | core/icons.js |
| 🥁 | U+1F941 | drums role / drum backing | icon | core/icons.js |
| 🔄 | U+1F504 | switch camera | icon | core/icons.js |
| ↑ | U+2191 | arrow key (tooltip) | typography | core/i18n.js |
| ↓ | U+2193 | arrow key (tooltip) | typography | core/i18n.js |
| → | U+2192 | arrow in text | typography | apps/full/songs.js, apps/night/rooms/rain/rain-glass.js, core/i18n.js, core/render.js |
| − | U+2212 | minus sign | typography | apps/full/index.html, apps/night/index.html, apps/night/pure/brook.js, apps/night/pure/room.js, apps/night/rooms/rain/rain-glass.js, core/data/palettes/bpsteps.json, core/i18n.js, core/legacy-ui/ui.js, core/legacy-ui/views/roll.js, core/legacy-ui/views/strip.js, core/pure/format.js, core/pure/profile.js, core/render.js |
| ≈ | U+2248 | approximately | typography | apps/night/rooms/forest/forest-life.js, apps/night/rooms/forest/forest-wood.js, core/i18n.js, core/legacy-ui/views/play.js, core/render.js |
| ≥ | U+2265 | greater or equal | typography | apps/night/pure/room.js, core/pure/format.js |
| ∞ | U+221E | infinity (−∞ dB) | typography | core/legacy-ui/views/strip.js, core/render.js |
| √ | U+221A | square root (console text) | typography | core/render.js |
| ♭ | U+266D | flat (note names) | notation | apps/full/index.html, apps/full/songs.js, apps/night/index.html, core/data/modes/blues.json, core/data/tunings/shruti22.json, core/scales.js |
| ♯ | U+266F | sharp (note names) | notation | core/data/tunings/shruti22.json |
| ♮ | U+266E | natural (chord names) | notation | core/data/palettes/edo31.json |
| ⚠ | U+26A0 | warning (console) | console | core/render.js |
| ⛔ | U+26D4 | forbidden (console) | console | core/render.js |
| ⛳ | U+26F3 | rule flag (console) | console | core/render.js |
| ✅ | U+2705 | done (console) | console | core/render.js |
| ❌ | U+274C | failed (console) | console | core/render.js |
| ❄ | U+2744 | frozen (console) | console | core/render.js |
| ☀ | U+2600 | sun (console) | console | core/render.js |
