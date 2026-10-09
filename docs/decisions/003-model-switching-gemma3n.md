# Model Switching and Gemma 3n Boundary

- Status: active
- Date: 2026-10-09

## Implemented

PocketOps now exposes one model switcher in the chat screen:

- Qwen3 1.7B — available through `llama.rn`/`llama.cpp` and verified on the Pixel 9A.
- Gemma 3n E2B — selectable, but marked unavailable until its LiteRT-LM native adapter is added.
- Gemma 3n E4B — selectable, but marked unavailable until its LiteRT-LM native adapter is added.

Selecting Gemma does not pretend to run Qwen or silently fall back. Sending a message reports that the required native adapter is not installed.

## Why Gemma is not wired into the current runtime

Qwen3 is loaded from a GGUF file through `llama.rn`. Gemma 3n uses the LiteRT-LM model/runtime path, so it is not a model-file-only swap in this app. It needs a separate native adapter, model packaging/download flow, lifecycle management, and Android/iOS verification.

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
