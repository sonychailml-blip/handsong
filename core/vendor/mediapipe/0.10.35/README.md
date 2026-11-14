# MediaPipe files, served from our own origin (CORE-22, 2026-11-13)

Third-party, Apache-2.0 (`LICENSE` here, the text from the MediaPipe repository at tag v0.10.35). Register entries
`mediapipe-tasks-vision` and `mediapipe-hand-landmarker` in `tools/licences.json`. Not our code: never edited, never
scanned as our modules. This file is not shipped (the build drops `.md`).

| File | Source | Bytes | SHA-256 |
|---|---|---|---|
| `vision_bundle.mjs` | npm `@mediapipe/tasks-vision@0.10.35`, `vision_bundle.mjs` (jsDelivr's copy differs only by its added header comment) | 136993 | `55d7ab624fbb70dcc5adc4ae6d7ea9cfcb569139d3dbfbf2b1deafcb966bc0fe` |
| `wasm/vision_wasm_internal.js` | the same package, `wasm/` (the SIMD loader) | 322044 | `e7fd9858e8e8f221d9b96eddc11f8e077f263e0b7bbd79d3cbe882b134274f8c` |
| `wasm/vision_wasm_internal.wasm` | the same package (the SIMD binary) | 11153617 | `6a5c64584c2ab61c763b6e204afbdbc7ce1caf7f5216187322bca8df94f646bc` |
| `wasm/vision_wasm_nosimd_internal.js` | the same package (old browsers without WebAssembly SIMD) | 321847 | `438d1fe8ff7f4d946025bc211c291543c037d8a3785ed4eee60f1f521b236296` |
| `wasm/vision_wasm_nosimd_internal.wasm` | the same package | 10481398 | `8a3092d34c79d3f57e6ba8592105e8a90f6b07c27891ffecd14cca428bfd3e31` |
| `hand_landmarker.task` | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task | 7819105 | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| `LICENSE` | https://raw.githubusercontent.com/google-ai-edge/mediapipe/v0.10.35/LICENSE | 12331 | `8707eef0533987efc5b155d64761eeb6e20793f50b9bd1a68dad1cf4719d0ed8` |

Every file was compared byte for byte with what the apps loaded from jsDelivr / Google storage before CORE-22.

**Updating** (backlog: look every 2–3 months; update only on purpose): a NEW folder `core/vendor/mediapipe/<version>/`
(the folder name is the version: the long-lived caching headers in `vercel.json` rely on a file never changing under its
address), `core/handdet.js` `MP_VER`, the register entries, this table; then compare the hand rows (the runner's hand and
gesture rows, `P.night`'s hand rows, the hand-depth prints) before and after; remove the old folder in the same run.
