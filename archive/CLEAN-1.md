# CLEAN-1 — the folder tidy-up (2026-11-23)

The founder's decision: the history stays (reports, commit messages, logs, archive, design comparisons, the split's baselines, sound renders);
only screenshots and plain copies went out. Everything moved went to `D:\handsong-trash\` (outside the repo, same folder structure; the
founder empties it). State before: git tag `before-clean-1` (pushed). The moved screenshots were never in git (except the two `.veh-near*`
pictures, which are in history at that tag).

## Moved out
| What | Size | Why it could go |
|---|---|---|
| Every picture and video in `tools/.ui-snap/` (PNG, WebP, WebM, `.y4m`, SVG) and its `styles.json` dumps (the computed-style half of a `ui-snap.mjs` capture) — 3,521 files | ≈ 2.9 GB | Working captures; no check, page or build reads them; each tool recreates its folder. |
| `tools/.site-shots/*.png` (17) | 11 MB | `node tools/site-check.mjs --shots` makes them again. |
| `tools/.veh-near.png`, `tools/.veh-near-blur.png` | 0.5 MB | Stray captures from RELEASE-1 stage B (in git at `before-clean-1`). |
| `tools/.build/` (7 trees: full-preview, full-production, night-before, night-deploy, night-preview, night-production, night-release) | 382 MB | Copies of the code; `tools/build.mjs` / `smoke-paths.mjs --build` rebuild them; Vercel builds from git. |
| `tools/.cdn-cache/` | 30 MB | Byte-identical to `core/vendor/mediapipe/0.10.35/` since CORE-22. |

The full file list: `D:\handsong-trash\CLEAN-1-moved-screenshots.txt`.

## Which stages the screenshots came from (`tools/.ui-snap/<tag>/`)
- 2026-10-16…20 — stage 3 and RUN 6–9 (Full and the old Night face): `base`, `as1`, `ui1b`, `draw1`, `draw1b`, `save1`, `c0`, `c4a`, `vis1a/a2/c`, `run6base`, `run7calm1–5`, `run7full*`, `run8calm*`, `run8full*`, `run9f1–f4`, `run9full`, `run9dbg`.
- 2026-11-01…02 — SPLIT-1/2 (two apps): `split-*` (`split-base-*` = the split's baseline captures), `f-night`.
- 2026-11-03…13 — NIGHT-2…13 and DESIGN-1: `night2-s2*`, `tools`, `n3s4`, `n3s5*`, `n5a`, `n6*`, `n7*`, `n8*`, `n8c*`, `n9*`, `n11*`, `n13*`, `n13b*`, `d1-*`, `review-std/det/ui` (the review in `docs/review/`).
- 2026-11-13…20 — the rain and the forest to the release: `rain0`, `rain0b`, `rain1`, `rain2`, `rain4`, `rain5`–`rain5d`, `rain6`, `rain6b`, `rain7`–`rain10`, `forest1`, `forest1-undo`, `night15`, `forest2`, `forest2e`, `forest2f`, `f2e`, `ui1`, `lang1`, `perf1`, `safari1`, `still-match`, `demo-*`, `release1`.

## Kept in place
The text left in those folders (the founder's Russian reports `day-2026-11-18/`, `night-2026-11-19/`; measurements `*.txt`, small `*.json`;
compare pages `*.html`; helper scripts), ≈ 28 MB; the empty capture folders (the tools write into them). Pages that showed these pictures
(`tools/.ui-snap/*.html`, `tools/design/rain/looktest/index.html`'s two comparison frames) now show empty frames — their words stay.
