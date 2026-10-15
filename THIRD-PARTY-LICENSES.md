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

- **MediaPipe Tasks Vision — JavaScript library and its WebAssembly files** — Hand detection in the browser (src/vision.js). Loaded from jsDelivr at start. Vendored with its LICENSE/NOTICE in stage 4 (offline).
- **MediaPipe hand landmarker model (float16, version 1)** — Licence as stated for the MediaPipe models (Apache-2.0); re-read the model card when the model is vendored (stage 4).

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

- **Feedback form (Google Forms) — a link the person opens** — Opened only by a tap on the start card; nothing is sent by the app.
- **Donation page (PayPal.Me) — a link the person opens** — Opened only by a tap on the start card; nothing is sent by the app.

## Developer tools only (never shipped)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| playwright-core — browser automation for the probe runner | 1.64.0 | Apache-2.0 | dev-only | npm playwright-core | https://github.com/microsoft/playwright (npm playwright-core) |

- **playwright-core — browser automation for the probe runner** — Developer tool in tools/ only (tools/node_modules is git-ignored); never shipped; no dependencies of its own.

## Icons, images and fonts (audit, Q13)

| Item | Version | Licence | Use | Addresses / files | Source |
|---|---|---|---|---|---|
| App icons (home screen / install) — a blue «H» of three rectangles on a light background | — | AI-generated | shipped | icons/icon-192.png<br>icons/icon-512.png<br>icons/icon-512-maskable.png | made by Claude Code (Anthropic) in this project, drawn by code as flat rectangles (no font, no traced artwork, no metadata); whether anything was copied is unknown (user, Q13) |
| Interface and canvas text — the device's system fonts (CSS --font stack, canvas system-ui) | — | n/a | device | — | style.css --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; src/draw.js ctx.font system-ui |
| Unicode symbols and emoji used as icons and signs (list below) | — | n/a | device | — | characters in our own text; their pictures come from the device's fonts (Segoe UI Symbol / Segoe UI Emoji on Windows, Apple Color Emoji and SF on Apple devices, Noto on Android) — no file shipped |

- **App icons (home screen / install) — a blue «H» of three rectangles on a light background** — tool: Claude Code (Anthropic); output owned by the user under Anthropic's commercial terms · **to be replaced by the user's own authored design (before the Calm release)**
- **Interface and canvas text — the device's system fonts (CSS --font stack, canvas system-ui)** — No font file is shipped; the person's device draws the text with its own fonts. · **to be replaced by the user's own authored design (a chosen typeface under OFL-1.1 or own work, set through the UI1 design tokens)**
- **Unicode symbols and emoji used as icons and signs (list below)** — Each device draws them differently. Pictures of them in marketing (screenshots, the promo video) may fall under the font owner's terms — another reason to replace them. · **to be replaced by the user's own authored design — one icon component / SVG sprite (UI1)**

## Unicode symbols and emoji in the interface (audit, Q13)

Origin of every entry: characters in our own text; their pictures come from the device's fonts (Segoe UI Symbol / Segoe UI Emoji on Windows, Apple Color Emoji and SF on Apple devices, Noto on Android) — no file shipped.

Every entry: **to be replaced by the user's own authored design — one icon component / SVG sprite (UI1)** (console-only signs are developer text, never shown in the app).

| Glyph | Code point | Meaning | Kind | Used in |
|---|---|---|---|---|
| ↶ | U+21B6 | undo (history) | icon | index.html, src/i18n.js, src/probes/edit.js, src/probes/freeze.js, src/probes/history.js, src/probes/key.js |
| ↷ | U+21B7 | redo (history) | icon | index.html, src/probes/edit.js, src/probes/freeze.js, src/probes/history.js, src/probes/key.js |
| ⤺ | U+293A | undo the last take | icon | index.html, src/i18n.js, src/probes/history.js, src/probes/window.js |
| ⇄ | U+21C4 | swap hands (help text) | icon | index.html |
| ⊘ | U+2298 | remove effect from a track | icon | index.html |
| ⌐ | U+2310 | step shape (automation / bend) | icon | src/i18n.js, src/ui.js |
| ╱ | U+2571 | glide shape (automation / bend) | icon | index.html, src/i18n.js, src/ui.js |
| ⌒ | U+2312 | curvature value tag | icon | src/draw.js |
| ⌗ | U+2317 | quantise | icon | index.html, src/ui.js |
| ⏮ | U+23EE | to the start | icon | index.html |
| ⏸ | U+23F8 | pause (message) | icon | src/i18n.js, src/songs.js |
| ❚ | U+275A | pause bars | icon | src/i18n.js |
| ▶ | U+25B6 | play / start | icon | index.html, src/i18n.js, src/probes/freeze.js, src/probes/seed.js, src/probes/window.js, src/recorder.js, src/render.js, src/songs.js |
| ■ | U+25A0 | stop (panic) | icon | index.html, src/songs.js |
| ⟳ | U+27F3 | repeat the brace | icon | index.html, src/songs.js |
| ● | U+25CF | record / lesson step done | icon | index.html, src/i18n.js, src/tutor.js |
| ○ | U+25CB | lesson step to come | icon | src/tutor.js |
| ✕ | U+2715 | close / delete / clear | icon | index.html, src/i18n.js, src/probes/history.js, src/ui.js |
| ✎ | U+270E | edit / rename / arrangement window | icon | index.html, src/probes/window.js, src/songs.js |
| ✂ | U+2702 | cut bars | icon | index.html |
| ⧉ | U+29C9 | copy / duplicate | icon | index.html, src/i18n.js |
| 📋 | U+1F4CB | paste | icon | index.html |
| 🗑 | U+1F5D1 | delete | icon | index.html, src/i18n.js |
| ✚ | U+271A | add a point | icon | index.html |
| ＋ | U+FF0B | insert (empty bars) | icon | index.html, src/i18n.js, src/ui.js |
| ▯ | U+25AF | empty bar | icon | index.html |
| ▮ | U+25AE | volume bars face | icon | index.html, src/ui.js |
| ▤ | U+25A4 | arrangement face | icon | src/ui.js |
| ⬚ | U+2B1A | pick several notes | icon | index.html |
| ⤢ | U+2922 | fit the whole song | icon | index.html |
| ▲ | U+25B2 | move up | icon | index.html, src/ui.js |
| ▼ | U+25BC | move down | icon | index.html, src/ui.js |
| ▸ | U+25B8 | accordion closed | icon | src/ui.js |
| ▾ | U+25BE | accordion open | icon | src/ui.js |
| ↕ | U+2195 | vertical hand axis | icon | src/ui.js |
| ↔ | U+2194 | horizontal hand axis | icon | src/ui.js |
| ◆ | U+25C6 | depth hand axis | icon | src/ui.js |
| ◧ | U+25E7 | left half (split) | icon | index.html, src/ui.js |
| ◨ | U+25E8 | right half / split | icon | index.html, src/i18n.js, src/ui.js |
| ✓ | U+2713 | done / chosen | icon | src/i18n.js, src/probes/window.js, src/tutor.js |
| ⚙ | U+2699 | settings | icon | index.html, src/i18n.js |
| ⛶ | U+26F6 | full screen | icon | index.html, src/i18n.js |
| ⬇ | U+2B07 | install | icon | index.html, src/i18n.js |
| 🌐 | U+1F310 | language | icon | index.html |
| 🎥 | U+1F3A5 | video clip | icon | index.html |
| 🎙 | U+1F399 | audio clip | icon | index.html |
| 🎚 | U+1F39A | mixer | icon | index.html, src/i18n.js, src/ui.js |
| 🎛 | U+1F39B | sound panel | icon | index.html, src/i18n.js |
| 🎵 | U+1F3B5 | backing | icon | index.html, src/i18n.js, src/ui.js |
| 🎹 | U+1F3B9 | chords role | icon | index.html, src/i18n.js |
| 🎸 | U+1F3B8 | bass role | icon | index.html, src/i18n.js |
| 🥁 | U+1F941 | drums role / drum backing | icon | index.html, src/i18n.js, src/ui.js |
| 🔄 | U+1F504 | switch camera | icon | index.html |
| ↑ | U+2191 | arrow key (tooltip) | typography | src/i18n.js |
| ↓ | U+2193 | arrow key (tooltip) | typography | src/i18n.js |
| → | U+2192 | arrow in text | typography | src/i18n.js, src/probedata.js, src/probes/edit.js, src/probes/freeze.js, src/probes/key.js, src/probes/lat.js, src/probes/run.js, src/probes/seed.js, src/probes/sound.js, src/probes/tuning.js, src/probes/window.js, src/render.js, src/songs.js |
| − | U+2212 | minus sign | typography | data/palettes/bpsteps.json, index.html, src/draw.js, src/i18n.js, src/probedata.js, src/probes/edit.js, src/probes/freeze.js, src/probes/key.js, src/probes/window.js, src/render.js, src/scaleload.js, src/ui.js |
| ≈ | U+2248 | approximately | typography | src/draw.js, src/i18n.js, src/render.js |
| ≤ | U+2264 | less or equal | typography | src/probes/window.js |
| ≥ | U+2265 | greater or equal | typography | src/scaleload.js |
| ∞ | U+221E | infinity (−∞ dB) | typography | src/draw.js, src/render.js |
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
