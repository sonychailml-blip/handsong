# MediaPipe files, served from our own origin (2026-11-19)

The tech demo used to load MediaPipe from jsDelivr and Google storage at run time. These are the very same files,
pinned at the same version (`@mediapipe/tasks-vision@0.10.35` and the float16 v1 hand model), served from the demo's
own origin. `src/vision.js` loads them from here. Same set and layout as Night's copy (CORE-22,
`core/vendor/mediapipe/0.10.35/` in the main repo), and the hashes below are identical to it.

Third-party, Apache-2.0 (`LICENSE` here, the text from the MediaPipe repository at tag v0.10.35). Not our code:
never edited.

| File | Source | Bytes | SHA-256 |
|---|---|---|---|
| `vision_bundle.mjs` | npm `@mediapipe/tasks-vision@0.10.35`, `vision_bundle.mjs` | 136993 | `55d7ab624fbb70dcc5adc4ae6d7ea9cfcb569139d3dbfbf2b1deafcb966bc0fe` |
| `wasm/vision_wasm_internal.js` | the same package, `wasm/` (the SIMD loader) | 322044 | `e7fd9858e8e8f221d9b96eddc11f8e077f263e0b7bbd79d3cbe882b134274f8c` |
| `wasm/vision_wasm_internal.wasm` | the same package (the SIMD binary) | 11153617 | `6a5c64584c2ab61c763b6e204afbdbc7ce1caf7f5216187322bca8df94f646bc` |
| `wasm/vision_wasm_nosimd_internal.js` | the same package (browsers without WebAssembly SIMD) | 321847 | `438d1fe8ff7f4d946025bc211c291543c037d8a3785ed4eee60f1f521b236296` |
| `wasm/vision_wasm_nosimd_internal.wasm` | the same package | 10481398 | `8a3092d34c79d3f57e6ba8592105e8a90f6b07c27891ffecd14cca428bfd3e31` |
| `hand_landmarker.task` | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task | 7819105 | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| `LICENSE` | https://raw.githubusercontent.com/google-ai-edge/mediapipe/v0.10.35/LICENSE | 12331 | `8707eef0533987efc5b155d64761eeb6e20793f50b9bd1a68dad1cf4719d0ed8` |

**How they were checked.** Every file was downloaded on 2026-11-19 from the exact URLs the demo used, and compared
byte for byte with the npm tarball `tasks-vision-0.10.35.tgz` and with Night's copy: all identical. One detail: the
demo imported the bare package URL (`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35`), and jsDelivr
answers it with a 291-byte comment of its own (`Skipped minification ... Do NOT use SRI ...`) followed by npm's
`vision_bundle.mjs`, byte for byte, with nothing after it. The file here is npm's original, without that comment.

**Which files are used.** `FilesetResolver.forVisionTasks(path)` picks the SIMD pair where the browser supports
WebAssembly SIMD and the `_nosimd` pair otherwise, so both are needed. The package's third pair
(`vision_wasm_module_internal`) is chosen only by `forVisionTasks(path, true)`, which the demo does not call, so it is
not here.

**Updating** (only on purpose): a NEW folder `vendor/mediapipe/<version>/` (the folder name is the version, so a file
never changes under its address), the three paths in `src/vision.js`, and this table; check that hands are found the
same way before and after; remove the old folder in the same change.
