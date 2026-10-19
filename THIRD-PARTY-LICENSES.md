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
| MediaPipe Tasks Vision — JavaScript library and its WebAssembly files | 0.10.35 | Apache-2.0 | CDN | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35 | https://github.com/google-ai-edge/mediapipe (npm @mediapipe/tasks-vision) |
| MediaPipe hand landmarker model (float16, version 1) | float16/1 | Apache-2.0 | CDN | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task | Google MediaPipe model card «Hand Tracking (Lite/Full)»; models listed at https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker |
| three.js (3D library) — the Calm forest room | r128 (npm three@0.128.0) | MIT | shipped | vendor/three-r128/three.min.js<br>vendor/three-r128/LICENSE | https://github.com/mrdoob/three.js (npm three@0.128.0, build/three.min.js; sha256 9274bbce…1ce2) |

- **MediaPipe Tasks Vision — JavaScript library and its WebAssembly files** — Hand detection in the browser (src/handdet.js — on the main thread or in our worker src/hand-worker.js, LAT2). Loaded from jsDelivr at start. Vendored with its LICENSE/NOTICE in stage 4 (offline).
- **MediaPipe hand landmarker model (float16, version 1)** — Licence as stated for the MediaPipe models (Apache-2.0); re-read the model card when the model is vendored (stage 4).
- **three.js (3D library) — the Calm forest room** — Vendored with its LICENSE (VIS1b, RUN 6): loaded LAZILY from our own origin by src/views/scene/host.js (a dynamic import of the UMD file, which sets globalThis.THREE) only when Calm shows the Forest background — never in Full. No CSP change.

## Hosted services

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| Vercel Web Analytics — page-view counter of the Vercel deployment | hosted | service-terms | service | /_vercel/insights/script.js | https://vercel.com/docs/analytics |

- **Vercel Web Analytics — page-view counter of the Vercel deployment** — decision: Q14 (user, 2026-10-14): keep it and name it in the privacy notice. Cookieless page views only; never sees camera, sound or hand data. Inactive on GitHub Pages (the path does not resolve there). Vercel Hobby forbids commercial use — a paid plan or other hosting before selling (BACKLOG strategy). · Script served by Vercel from the same origin; the one-line stub that queues calls before it loads is our own code (src/va-stub.js, outside index.html so the CSP needs no inline script).

## Links the person opens (nothing is sent by the app)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| Feedback form (Google Forms) — a link the person opens | — | n/a | link | https://docs.google.com/forms/ | src/ui.js FEEDBACK_URL |
| Donation page (PayPal.Me) — a link the person opens | — | n/a | link | https://paypal.me/ | src/ui.js DONATE_URL |
| The SVG namespace NAME «http://www.w3.org/2000/svg» — an identifier the DOM needs to create SVG elements (document.createElementNS); never fetched, nothing is sent | — | n/a | link | http://www.w3.org/2000/svg | W3C SVG specification (a namespace name, not an address the app opens) |

- **Feedback form (Google Forms) — a link the person opens** — Opened only by a tap on the start card; nothing is sent by the app.
- **Donation page (PayPal.Me) — a link the person opens** — Opened only by a tap on the start card; nothing is sent by the app.
- **The SVG namespace NAME «http://www.w3.org/2000/svg» — an identifier the DOM needs to create SVG elements (document.createElementNS); never fetched, nothing is sent** — RUN 7 (C11): src/icons.js builds the Calm face's drawn icons and the emblem as SVG elements with this namespace name.

## Developer tools only (never shipped)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| playwright-core — browser automation for the probe runner | 1.64.0 | Apache-2.0 | dev-only | npm playwright-core | https://github.com/microsoft/playwright (npm playwright-core) |

- **playwright-core — browser automation for the probe runner** — Developer tool in tools/ only (tools/node_modules is git-ignored); never shipped; no dependencies of its own.

## Reference prototypes only (docs/prototypes/, never shipped)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| three.js (3D library) — reference prototype only | r128 | MIT | reference | https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/ | https://github.com/mrdoob/three.js (cdnjs three.js r128) |
| Google Fonts: Marcellus and Commissioner — reference prototype only | css2 API | OFL-1.1 | reference | https://fonts.googleapis.com<br>https://fonts.gstatic.com | https://fonts.google.com (Marcellus, Commissioner — SIL Open Font License 1.1) |

- **three.js (3D library) — reference prototype only** — Loaded only by docs/prototypes/rooms-of-light.html (the strategist's «Rooms of light» prototype — a REFERENCE for Calm, not app code). Not shipped; if Calm adopts it, it is vendored with its LICENSE and becomes a shipped entry (STAGE4-CALM plan).
- **Google Fonts: Marcellus and Commissioner — reference prototype only** — Loaded only by docs/prototypes/rooms-of-light.html. Not shipped; the app loads no web fonts. · **reference prototype only — not shipped (the app's own fonts come with the user's design, §7.19)**

## Icons, images and fonts (audit, Q13)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| App icons (home screen / install) — the Handsong emblem: five notes in an arc, the centre one glowing firefly lime, on the Moonglass night | — | AI-generated | shipped | icons/icon-192.png<br>icons/icon-512.png<br>icons/icon-512-maskable.png | the user's chosen design (RUN 7, BACKLOG §7.19: the C · Hush emblem in Moonglass colours), drawn by code by Claude Code in this project (canvas circles and gradients; no font, no traced artwork) |
| Interface and canvas text — the device's system fonts (CSS --font stack, canvas system-ui) | — | n/a | device | — | style.css --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; src/draw.js ctx.font system-ui |
| Unicode symbols and emoji used as icons and signs (list below) | — | n/a | device | — | characters in our own text; their pictures come from the device's fonts (Segoe UI Symbol / Segoe UI Emoji on Windows, Apple Color Emoji and SF on Apple devices, Noto on Android) — no file shipped |
| Andika (text font of the Calm face) — SIL International | 7.000 (SIL release, web/Andika-Regular.woff2 and Andika-Bold.woff2, UNMODIFIED) | OFL-1.1 | shipped | fonts/andika/Andika-Regular.woff2<br>fonts/andika/Andika-Bold.woff2<br>fonts/andika/OFL.txt | https://github.com/silnrsi/font-andika/releases/tag/v7.000 (Andika-7.000.zip) — Reserved Font Names «Andika» and «SIL»: the files are shipped unmodified (no subsetting), so the name stays |
| Literata Light (title font and wordmark of the Calm face) — The Literata Project Authors | Google Fonts v40, weight 300, latin + cyrillic subsets (woff2) | OFL-1.1 | shipped | fonts/literata/literata-300-latin.woff2<br>fonts/literata/literata-300-cyrillic.woff2<br>fonts/literata/OFL.txt | https://fonts.google.com/specimen/Literata (https://github.com/googlefonts/literata) — no Reserved Font Name, so the subsets may keep the name |

- **App icons (home screen / install) — the Handsong emblem: five notes in an arc, the centre one glowing firefly lime, on the Moonglass night** — tool: Claude Code (Anthropic); output owned by the user under Anthropic's commercial terms · **kept — the user's chosen Calm design (RUN 7); the earlier «H» icons were replaced**
- **Interface and canvas text — the device's system fonts (CSS --font stack, canvas system-ui)** — No font file is shipped; the person's device draws the text with its own fonts. · **to be replaced by the user's own authored design (a chosen typeface under OFL-1.1 or own work, set through the UI1 design tokens)**
- **Unicode symbols and emoji used as icons and signs (list below)** — Each device draws them differently. Pictures of them in marketing (screenshots, the promo video) may fall under the font owner's terms — another reason to replace them. · **to be replaced by the user's own authored design — one icon component / SVG sprite (UI1)**
- **Andika (text font of the Calm face) — SIL International** — RUN 7 (C11, the user's design choice): chosen for Calm's text because Atkinson Hyperlegible (and Next) have NO Cyrillic (checked: Latin and Latin-ext subsets only); Andika is designed by SIL for literacy and low vision (distinct letterforms) and covers Cyrillic. Self-hosted, served from our own origin. · **kept — the font of the user's chosen Calm design (RUN 7, BACKLOG §7.19); not to be replaced**
- **Literata Light (title font and wordmark of the Calm face) — The Literata Project Authors** — RUN 7 (C11): Fraunces (the Moonglass proposal) has no Cyrillic (checked: vietnamese, latin-ext, latin only); Literata is a warm, soft book serif with a true Light weight and Cyrillic. Self-hosted, served from our own origin. · **kept — the font of the user's chosen Calm design (RUN 7, BACKLOG §7.19); not to be replaced**

## Unicode symbols and emoji in the interface (audit, Q13)

Origin of every entry: characters in our own text; their pictures come from the device's fonts (Segoe UI Symbol / Segoe UI Emoji on Windows, Apple Color Emoji and SF on Apple devices, Noto on Android) — no file shipped.

Every entry: **to be replaced by the user's own authored design — one icon component / SVG sprite (UI1)** (console-only signs are developer text, never shown in the app).

| Glyph | Code point | Meaning | Kind | Used in |
|---|---|---|---|---|
| ↶ | U+21B6 | undo (history) | icon | src/icons.js, src/probes/cmd.js, src/probes/edit.js, src/probes/freeze.js, src/probes/history.js, src/probes/ids.js, src/probes/key.js, src/probes/songfile.js |
| ↷ | U+21B7 | redo (history) | icon | src/icons.js, src/probes/cmd.js, src/probes/edit.js, src/probes/freeze.js, src/probes/history.js, src/probes/ids.js, src/probes/key.js, src/probes/songfile.js |
| ⤺ | U+293A | undo the last take | icon | src/icons.js, src/probes/cmd.js, src/probes/history.js, src/probes/window.js |
| ⇄ | U+21C4 | swap hands (help text) | icon | src/icons.js |
| ⊘ | U+2298 | remove effect from a track | icon | src/icons.js |
| ⌐ | U+2310 | step shape (automation / bend) | icon | src/icons.js |
| ╱ | U+2571 | glide shape (automation / bend) | icon | src/icons.js |
| ⌒ | U+2312 | curvature value tag | icon | src/icons.js |
| ⌗ | U+2317 | quantise | icon | src/icons.js |
| ⏮ | U+23EE | to the start | icon | src/icons.js |
| ⏸ | U+23F8 | pause (message) | icon | src/icons.js, src/songs.js |
| ❚ | U+275A | pause bars | icon | src/icons.js |
| ▶ | U+25B6 | play / start | icon | src/icons.js, src/probes/engine.js, src/probes/freeze.js, src/probes/seed.js, src/probes/window.js, src/recorder.js, src/render.js, src/songs.js |
| ■ | U+25A0 | stop (panic) | icon | src/icons.js, src/songs.js |
| ⟳ | U+27F3 | repeat the brace | icon | src/icons.js, src/songs.js |
| ● | U+25CF | record / lesson step done | icon | src/icons.js |
| ○ | U+25CB | lesson step to come | icon | src/icons.js |
| ✕ | U+2715 | close / delete / clear | icon | src/icons.js, src/probes/cmd.js, src/probes/history.js |
| ✎ | U+270E | edit / rename / arrangement window | icon | src/icons.js, src/probes/window.js, src/songs.js |
| ✂ | U+2702 | cut bars | icon | src/icons.js |
| ⧉ | U+29C9 | copy / duplicate | icon | src/icons.js |
| 📋 | U+1F4CB | paste | icon | src/icons.js |
| 🗑 | U+1F5D1 | delete | icon | src/icons.js |
| ✚ | U+271A | add a point | icon | src/icons.js |
| ＋ | U+FF0B | insert (empty bars) | icon | src/icons.js |
| ▯ | U+25AF | empty bar | icon | src/icons.js |
| ▮ | U+25AE | volume bars face | icon | src/icons.js |
| ▤ | U+25A4 | arrangement face | icon | src/icons.js |
| ⬚ | U+2B1A | pick several notes | icon | src/icons.js |
| ⤢ | U+2922 | fit the whole song | icon | src/icons.js |
| ▲ | U+25B2 | move up | icon | src/icons.js |
| ▼ | U+25BC | move down | icon | src/icons.js |
| ▸ | U+25B8 | accordion closed | icon | src/icons.js |
| ▾ | U+25BE | accordion open | icon | src/icons.js |
| ↕ | U+2195 | vertical hand axis | icon | src/icons.js |
| ↔ | U+2194 | horizontal hand axis | icon | src/icons.js, src/probes/seed.js |
| ◆ | U+25C6 | depth hand axis | icon | src/icons.js |
| ◧ | U+25E7 | left half (split) | icon | src/icons.js |
| ◨ | U+25E8 | right half / split | icon | src/icons.js |
| ✓ | U+2713 | done / chosen | icon | src/icons.js, src/probes/window.js |
| ⚙ | U+2699 | settings | icon | src/icons.js |
| ⛶ | U+26F6 | full screen | icon | src/icons.js |
| ⬇ | U+2B07 | install | icon | src/icons.js |
| 🌐 | U+1F310 | language | icon | src/icons.js |
| 🎥 | U+1F3A5 | video clip | icon | src/icons.js |
| 🎙 | U+1F399 | audio clip | icon | src/icons.js |
| 🎚 | U+1F39A | mixer | icon | src/icons.js |
| 🎛 | U+1F39B | sound panel | icon | src/icons.js |
| 🎵 | U+1F3B5 | backing | icon | src/icons.js |
| 🎹 | U+1F3B9 | chords role | icon | src/icons.js |
| 🎸 | U+1F3B8 | bass role | icon | src/icons.js |
| 🥁 | U+1F941 | drums role / drum backing | icon | src/icons.js |
| 🔄 | U+1F504 | switch camera | icon | src/icons.js |
| ↑ | U+2191 | arrow key (tooltip) | typography | src/i18n.js |
| ↓ | U+2193 | arrow key (tooltip) | typography | src/i18n.js |
| → | U+2192 | arrow in text | typography | src/i18n.js, src/probedata.js, src/probes/autosave.js, src/probes/calm.js, src/probes/cmd.js, src/probes/detect.js, src/probes/edit.js, src/probes/eng2.js, src/probes/engine.js, src/probes/forest.js, src/probes/freeze.js, src/probes/fxcontract.js, src/probes/ids.js, src/probes/key.js, src/probes/lat.js, src/probes/profile.js, src/probes/run.js, src/probes/seed.js, src/probes/songfile.js, src/probes/sound.js, src/probes/timbres.js, src/probes/tuning.js, src/probes/window.js, src/render.js, src/songs.js |
| − | U+2212 | minus sign | typography | data/palettes/bpsteps.json, index.html, src/core/format.js, src/core/profile.js, src/i18n.js, src/probedata.js, src/probes/calm.js, src/probes/edit.js, src/probes/freeze.js, src/probes/fxcontract.js, src/probes/key.js, src/probes/window.js, src/render.js, src/ui.js, src/views/roll.js, src/views/strip.js |
| ≈ | U+2248 | approximately | typography | src/i18n.js, src/probes/calm.js, src/probes/lat.js, src/render.js, src/views/play.js |
| ≤ | U+2264 | less or equal | typography | src/probes/calm.js, src/probes/window.js |
| ≥ | U+2265 | greater or equal | typography | src/core/format.js, src/probes/calm.js, src/probes/forest.js |
| ∞ | U+221E | infinity (−∞ dB) | typography | src/render.js, src/views/strip.js |
| √ | U+221A | square root (console text) | typography | src/render.js |
| ♭ | U+266D | flat (note names) | notation | data/modes/blues.json, data/tunings/shruti22.json, index.html, src/probedata.js, src/scales.js, src/songs.js |
| ♯ | U+266F | sharp (note names) | notation | data/tunings/shruti22.json, src/probedata.js |
| ♮ | U+266E | natural (chord names) | notation | data/palettes/edo31.json |
| ⚠ | U+26A0 | warning (console) | console | src/render.js |
| ⛔ | U+26D4 | forbidden (console) | console | src/render.js |
| ⛳ | U+26F3 | rule flag (console) | console | src/render.js |
| ✅ | U+2705 | done (console) | console | src/render.js |
| ❌ | U+274C | failed (console) | console | src/render.js |
| ❄ | U+2744 | frozen (console) | console | src/probes/window.js, src/render.js |
| ☀ | U+2600 | sun (console) | console | src/render.js |
