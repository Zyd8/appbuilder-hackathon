# Model Switching and Gemma 3n Boundary

- Status: active
- Date: 2026-10-09

## Implemented

PocketOps now exposes one model switcher in the chat screen:

- Qwen3 1.7B — available through `llama.rn`/`llama.cpp` and verified on the Pixel 9A.
- Gemma 3n E2B — wired to the new LiteRT-LM Expo native module. The Android Kotlin adapter compiles against LiteRT-LM 0.16.1; the `.litertlm` model still needs to be installed on the device before runtime verification.
- Gemma 3n E4B — wired to the same Android adapter path; the model file still needs to be installed and tested.

The UI reports the selected runtime and surfaces model-loading failures instead of silently falling back. iOS currently has an explicit LiteRT-LM stub that reports the Swift Package integration is not linked yet.

## Why Gemma uses a separate native runtime

Gemma 3n uses the LiteRT-LM model/runtime path, so it is not a model-file-only swap in this app. The Android bridge now exists separately from `llama.rn`.

Google's current LiteRT-LM getting-started path is Android/JVM-oriented. The existing React Native `llama.rn` path remains the cross-platform working baseline.

## Next implementation phase

To make Gemma 3n actually runnable:

1. Add a native LiteRT-LM bridge for Android.
2. Confirm the E2B `.litertlm` model runs fully offline after installation.
3. Add the model download/bundling and storage path.
4. Add the same chat contract to the bridge.
5. Build a separate iOS adapter or confirm a cross-platform LiteRT API before claiming iOS support.
6. Keep Qwen3 as a fallback model.

## Acceptance rule

A Gemma option may be labeled available only after a real Android/iOS native build loads the model, produces a response with network disabled, and reports the actual runtime in the chat message.
